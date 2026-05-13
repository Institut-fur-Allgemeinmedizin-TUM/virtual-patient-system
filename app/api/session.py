import asyncio
import base64
import json
import os
import time
import uuid
from datetime import datetime, time
from random import Random
from typing import List

import google.genai.types
from fastapi import (
    Depends,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    APIRouter,
)
from google.genai.types import HistoryConfigDict
from langchain.agents import create_agent
from sqlalchemy import select, desc
from sqlalchemy.orm import Session as OrmSession

from app.api.memory import vhb_sessions, logger
from app.auth import auth
from app.config.config import settings
from app.db.db import get_db
from app.llm import chat as chat_functions, formatting
from app.llm.chat import chat_llm, reasoning_llm
from app.llm.prompts.evaluation import get_evaluation_prompt
from app.model.llm import (
    CreateSessionResponse,
    CreateSessionRequest,
    ChatResponse,
    ChatRequest,
)
from app.model.models import (
    Session as ChatSession,
    Message,
    SessionMessagesResponse,
)
from app.model.models import (
    SessionLiveDefaultTime,
    UserMaxDailyUsage,
)

from app.model.evaluation import EvaluationResponse
from app.model.models import (
    Evaluation,
    SessionSummaryData,
    SessionsSummaryResponse,
)

sessionRouter = APIRouter()


@sessionRouter.post("/api/sessions", response_model=CreateSessionResponse)
async def create_session(
    req: CreateSessionRequest, request: Request, db: OrmSession = Depends(get_db)
) -> CreateSessionResponse:
    user = auth.require_user(request)
    session_id = str(uuid.uuid4())

    # Check if this is a VHB user
    is_vhb = user.get("is_vhb_user", False)

    if is_vhb:
        # Store session in memory only, don't persist to database
        vhb_sessions[session_id] = {
            "case_id": req.case_id,
            "messages": [{"role": "system", "content": f"Case: {req.case_id}"}],
        }
    else:
        # Normal TUM user: persist to database
        chat_functions.ensure_case(db, req.case_id)

        # Use stored tum_id from session cookie (extracted at auth time)
        # Fallback to sub if tum_id wasn't found
        tum_id = user.get("tum_id") or user.get("sub")

        chat_session = ChatSession(id=session_id, case_id=req.case_id, user_id=tum_id)
        db.add(chat_session)
        db.add(
            Message(
                session_id=session_id, role="system", content=f"Case: {req.case_id}"
            )
        )
        db.commit()

    return CreateSessionResponse(session_id=session_id, case_id=req.case_id)


@sessionRouter.post("/api/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest, request: Request, db: OrmSession = Depends(get_db)
) -> ChatResponse:
    user = auth.require_user(request)

    # Check if this is a VHB session (in-memory)
    if req.session_id in vhb_sessions:
        if not user.get("is_vhb_user", False):
            raise HTTPException(
                status_code=403, detail="Non VHB user tried to access VHB session"
            )
        vhb_session = vhb_sessions[req.session_id]
        case_id = vhb_session["case_id"]
        persona = chat_functions.load_case_prompt(case_id)

        # Build messages from in-memory storage
        messages_to_send = [{"role": "system", "content": persona}]
        for m in vhb_session["messages"]:
            if m["role"] in ("user", "assistant"):
                messages_to_send.append({"role": m["role"], "content": m["content"]})
        messages_to_send.append({"role": "user", "content": req.message})
        if os.environ.get("SIMULATE_AI") == "true":
            # Simulate AI response for testing without OpenAI calls
            time.sleep(1)
            reply = f"Simulated response to: {req.message}"
        else:
            # Call OpenAI
            client = chat_functions.get_openai_client()
            completion = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages_to_send,  # type: ignore[arg-type]
                temperature=0.6,
                max_tokens=300,
            )

            reply = completion.choices[0].message.content or ""

        # Store messages in memory only (no DB persistence)
        vhb_session["messages"].append({"role": "user", "content": req.message})
        vhb_session["messages"].append({"role": "assistant", "content": reply})

        return ChatResponse(reply=reply, session_id=req.session_id)

    # Normal TUM user session: handle from database
    chat_session = db.get(ChatSession, req.session_id)
    if chat_session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    tum_id = user.get("tum_id") or user.get("sub")
    if chat_session.user_id != tum_id:
        raise HTTPException(status_code=403, detail="Invalid user id")

    # Fetch messages ordered
    msgs = (
        db.query(Message)
        .filter(Message.session_id == req.session_id)
        .order_by(Message.id.asc())
        .all()
    )

    case_id = chat_session.case_id
    persona = chat_functions.load_case_prompt(case_id)

    messages_to_send = [{"role": "system", "content": persona}]
    for m in msgs:
        if m.role in ("user", "assistant"):
            messages_to_send.append({"role": m.role, "content": m.content})
    messages_to_send.append({"role": "user", "content": req.message})
    if os.environ.get("SIMULATE_AI") == "true":
        # Simulate AI response for testing without OpenAI calls
        time.sleep(1)
        reply = f"Simulated response to: {req.message}"
        tokens_in = 1
        tokens_out = 2
    else:
        client = chat_functions.get_openai_client()
        completion = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages_to_send,  # type: ignore[arg-type]
            temperature=0.6,
            max_tokens=300,
        )

        reply = completion.choices[0].message.content or ""

        # Extract token usage
        usage = completion.usage
        tokens_in = usage.prompt_tokens if usage else None
        tokens_out = usage.completion_tokens if usage else None

    # Persist turn with token usage
    db.add(
        Message(
            session_id=req.session_id,
            role="user",
            content=req.message,
            tokens_in=tokens_in,
        )
    )
    db.add(
        Message(
            session_id=req.session_id,
            role="assistant",
            content=reply,
            tokens_out=tokens_out,
        )
    )
    db.commit()

    return ChatResponse(reply=reply, session_id=req.session_id)


def check_user_remaining_time_total(db: OrmSession, user_id: str) -> bool:
    # Define today start and end of day
    today = datetime.now().date()
    today_start = datetime.combine(today, time.min)
    today_end = datetime.combine(today, time.max)

    user_sessions_query = (
        select(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .filter(ChatSession.started_at.between(today_start, today_end))
    )
    user_sessions = db.execute(user_sessions_query).scalars().all()

    total_time_used = 0
    for session in user_sessions:
        total_time_used += SessionLiveDefaultTime - session.live_time_remaining
    return total_time_used < UserMaxDailyUsage - 60


# Gemini Live API
@sessionRouter.websocket("/api/live/{session_id}/ws")
async def live_websocket(
    websocket: WebSocket, session_id: str, db: OrmSession = Depends(get_db)
):
    session_start_time = datetime.now()
    user = auth.require_user_websocket(websocket)
    relay_tasks: List[asyncio.Task] = []

    if session_id in vhb_sessions:
        if not user.get("is_vhb_user", False):
            raise WebSocketDisconnect(reason="VHB session expired")
        raise WebSocketDisconnect(reason="Feature not available for VHB students")

    if not settings.gemini_api_key:
        await websocket.accept()
        await websocket.send_json({"error": "Gemini Live is not configured on backend"})
        await websocket.close(code=1011)
        return

    try:
        from google import genai
    except ImportError:
        await websocket.accept()
        await websocket.send_json({"error": "genai not available"})
        await websocket.close(code=1011)
        return

    model_name = settings.gemini_live_model

    chat_session = db.get(ChatSession, session_id)
    if chat_session is None:
        raise WebSocketDisconnect(reason="Session not found")

    if chat_session.live_time_remaining <= 0 or not check_user_remaining_time_total(
        db, chat_session.user_id
    ):
        await websocket.accept()
        await websocket.send_json({"error": "no live time remaining"})
        await websocket.close(code=1011)
        return

    tum_id = user.get("tum_id") or user.get("sub")
    if chat_session.user_id != tum_id:
        raise WebSocketDisconnect(reason="Invalid user id")

    case_id = chat_session.case_id
    system_prompt = chat_functions.load_case_prompt(case_id)

    await websocket.accept()
    session_metadata = {"latest_handle": None}

    try:
        previous_messages_query = (
            select(Message)
            .filter_by(session_id=chat_session.id)
            .order_by(Message.created_at.asc())
        )
        previous_messages = db.execute(previous_messages_query).scalars().all()

        history = []
        message: Message
        for message in previous_messages:
            if message.role == "system":
                continue
            role = message.role
            if role == "assistant":
                role = "model"
            history.append(
                google.genai.types.Content(
                    role=role, parts=[google.genai.types.Part(text=message.content)]
                )
            )

        client = genai.Client(api_key=settings.gemini_api_key)
        live_config: google.genai.types.LiveConnectConfigDict = {
            "response_modalities": ["AUDIO"],
            "system_instruction": system_prompt
            + " Antworte ausschließlich mit Audio!!! Schalte hierfür dein Mikrofon an!",
            "output_audio_transcription": {},
            "input_audio_transcription": {},
            # Let this in the code for later use (newer models support this feature)
            # Nest proactive_audio inside the 'proactivity' key
            # "proactivity": {
            #    "proactive_audio": True,
            # }
        }
        history_config: HistoryConfigDict = {"initial_history_in_client_content": True}
        if len(history) > 0:
            live_config["history_config"] = history_config

        async with client.aio.live.connect(
            model=model_name, config=live_config
        ) as live_session:
            if len(history) > 0:
                await live_session.send_client_content(
                    turns=history, turn_complete=True
                )

            async def browser_to_gemini() -> None:
                while True:
                    session_end_time_during_session = datetime.now()
                    time_used = session_end_time_during_session - session_start_time
                    if time_used.total_seconds() >= chat_session.live_time_remaining:
                        await websocket.send_json({"error": "no live time remaining"})
                        await websocket.close()
                        break

                    incoming = await websocket.receive()
                    if incoming.get("type") == "websocket.disconnect":
                        break

                    text_data = incoming.get("text")
                    bytes_data = incoming.get("bytes")

                    if bytes_data is not None:
                        await live_session.send_realtime_input(
                            audio={"data": bytes_data, "mime_type": "audio/pcm"}
                        )

                    if text_data is not None:
                        try:
                            parsed = json.loads(text_data)
                        except json.JSONDecodeError:
                            parsed = {"type": "text", "text": text_data}

                        event_type = (
                            parsed.get("type") if isinstance(parsed, dict) else None
                        )

                        if event_type == "audio":
                            encoded_audio = parsed.get("data")
                            if not encoded_audio:
                                continue
                            audio_bytes = base64.b64decode(encoded_audio)
                            await live_session.send_realtime_input(
                                audio={"data": audio_bytes, "mime_type": "audio/pcm"}
                            )
                        elif event_type == "text":
                            text_value = parsed.get("text")
                            if text_value:
                                await live_session.send_realtime_input(text=text_value)
                                db.add(
                                    Message(
                                        session_id=session_id,
                                        role="user",
                                        content=text_value,
                                    )
                                )
                                db.commit()
                        elif event_type == "end_turn":
                            await live_session.send_client_content(
                                turns=[], turn_complete=True
                            )

            async def gemini_to_browser() -> None:
                current_model_transcript = ""
                while True:
                    rec = live_session.receive()
                    async for response in rec:
                        if response.session_resumption_update:
                            update = response.session_resumption_update
                            if update.resumable and update.new_handle:
                                session_handle = update.new_handle
                                session_metadata["latest_handle"] = session_handle

                        server_content = getattr(response, "server_content", None)
                        if not server_content:
                            continue

                        model_turn = getattr(server_content, "model_turn", None)
                        if model_turn and getattr(model_turn, "parts", None):
                            for part in model_turn.parts:
                                part_text = getattr(part, "text", None)
                                if part_text:
                                    payload = {"type": "model_text", "text": part_text}
                                    await websocket.send_json(payload)

                                inline_data = getattr(part, "inline_data", None)
                                data = (
                                    getattr(inline_data, "data", None)
                                    if inline_data
                                    else None
                                )
                                if isinstance(data, (bytes, bytearray)):
                                    payload = {
                                        "type": "model_audio",
                                        "mime_type": getattr(
                                            inline_data, "mime_type", "audio/pcm"
                                        ),
                                        "data": base64.b64encode(data).decode("ascii"),
                                    }
                                    await websocket.send_json(payload)
                        output_transcription = getattr(
                            server_content, "output_transcription", None
                        )
                        if output_transcription:
                            text = getattr(output_transcription, "text", None)
                            if text:
                                current_model_transcript += text
                                payload = {"type": "model_text", "text": text}
                                await websocket.send_json(payload)

                        input_transcription = getattr(
                            server_content, "input_transcription", None
                        )
                        if input_transcription:
                            text: str | None = getattr(
                                input_transcription, "text", None
                            )
                            if text is not None:
                                db.add(
                                    Message(
                                        session_id=session_id,
                                        role="user",
                                        content=text,
                                        audio_transcript=True,
                                    )
                                )
                                db.commit()
                                payload = {"type": "user_text", "text": text}
                                await websocket.send_json(payload)
                                logger.debug(f"Sent to website: {payload}")

                        if getattr(server_content, "turn_complete", False):
                            if current_model_transcript.strip():
                                db.add(
                                    Message(
                                        session_id=session_id,
                                        role="assistant",
                                        content=current_model_transcript,
                                        audio_transcript=True,
                                    )
                                )
                                db.commit()
                                current_model_transcript = ""

            relay_tasks = [
                asyncio.create_task(browser_to_gemini()),
                asyncio.create_task(gemini_to_browser()),
            ]

            done, pending = await asyncio.wait(
                relay_tasks,
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()

            if pending:
                await asyncio.gather(*pending, return_exceptions=True)

            for task in done:
                exc = task.exception()
                if exc and not isinstance(exc, asyncio.CancelledError):
                    logger.error(f"Live relay task failed: {type(exc).__name__}: {exc}")
                    raise exc

            session_end_time = datetime.now()
            time_used = session_end_time - session_start_time
            chat_session.live_time_remaining = chat_session.live_time_remaining - int(
                time_used.total_seconds()
            )
            db.add(chat_session)

    except WebSocketDisconnect as e:
        await websocket.close(code=1011, reason=e.reason)
    except Exception as e:
        logger.error(f"Live websocket failed: {type(e).__name__}: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        for task in relay_tasks:
            if not task.done():
                task.cancel()

        if relay_tasks:
            await asyncio.gather(*relay_tasks, return_exceptions=True)

        final_handle = session_metadata.get("latest_handle")
        if final_handle:
            try:
                chat_session.live_api_handle = final_handle
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to save handle to database: {e}")


@sessionRouter.get(
    "/api/sessions/{session_id}/messages", response_model=SessionMessagesResponse
)
async def get_session_messages(
    session_id: str, db: OrmSession = Depends(get_db)
) -> SessionMessagesResponse:
    """Get all messages for a specific session."""

    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.id.asc())
        .all()
    )

    return SessionMessagesResponse(
        session_id=session_id,
        case_id=session.case_id,
        started_at=session.started_at,
        ended_at=session.ended_at,
        messages=[
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at,
                "tokens_in": msg.tokens_in,
                "tokens_out": msg.tokens_out,
            }
            for msg in messages
        ],
    )


@sessionRouter.post(
    "/api/sessions/{session_id}/evaluate", response_model=EvaluationResponse
)
async def evaluate_session(
    session_id: str, request: Request, db: OrmSession = Depends(get_db)
) -> EvaluationResponse:
    """Evaluate anamnesis performance for a session."""
    user = auth.require_user(request)

    # Check if this is a VHB user - they cannot use evaluation feature
    if user.get("is_vhb_user", False):
        raise HTTPException(
            status_code=403, detail="Evaluation feature is only available for TUM users"
        )

    # Check if session is in VHB sessions (shouldn't happen, but double-check)
    if session_id in vhb_sessions:
        raise HTTPException(
            status_code=403, detail="Evaluation not available for VHB sessions"
        )

    # Get session from database
    chat_session = db.get(ChatSession, session_id)
    if chat_session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    tum_id = user.get("tum_id") or user.get("sub")
    if chat_session.user_id != tum_id:
        raise HTTPException(status_code=403, detail="Invalid user id")
    # Check if evaluation already exists
    existing_evaluation = (
        db.query(Evaluation).filter(Evaluation.session_id == session_id).first()
    )

    if existing_evaluation:
        if os.environ.get("SIMULATE_AI") == "true":
            time.sleep(4)
        # Return existing evaluation
        return formatting.format_evaluation_response(existing_evaluation)

    # Get all messages for this session
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.id.asc())
        .all()
    )

    # Count user messages (excluding system messages)
    user_message_count = sum(1 for m in messages if m.role == "user")

    if user_message_count < 5:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient messages for evaluation. Need at least 5 user messages, found {user_message_count}",
        )

    # Build conversation history for evaluation
    conversation = []
    for msg in messages:
        if msg.role in ("user", "assistant"):
            conversation.append(f"{msg.role.capitalize()}: {msg.content}")

    conversation_text = "\n\n".join(conversation)

    evaluation_prompt = get_evaluation_prompt(conversation_text)

    # Call OpenAI to generate evaluation (or simulate in test mode)
    try:
        if os.environ.get("SIMULATE_AI") == "true":
            time.sleep(8)
            evaluation_data = {
                "criteria": [
                    {
                        "score": Random().randint(1, 5),
                        "explanation": "Simulierte Bewertung: Gute Struktur, mit Potenzial zur Vertiefung.",
                    }
                    for _ in range(8)
                ],
                "suggestions": [
                    "Stellen Sie mehr offene Fragen.",
                    "Fassen Sie Zwischenergebnisse zusammen.",
                    "Prüfen Sie Red Flags systematisch.",
                ],
            }
        else:
            agent = create_agent(
                model=reasoning_llm,
                tools=[],
                system_prompt="Sie sind ein medizinischer Ausbilder. Antworten Sie ausschließlich im angeforderten JSON-Format."
            )
            user_message = {
                "role": "user",
                "content": evaluation_prompt
            }
            response = agent.invoke({"messages": [user_message]})
            response_text = response["messages"][-1].text  or ""

            # Parse JSON response
            try:
                evaluation_data = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks if present
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    response_text = response_text[json_start:json_end].strip()
                    evaluation_data = json.loads(response_text)
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    response_text = response_text[json_start:json_end].strip()
                    evaluation_data = json.loads(response_text)
                else:
                    raise

        # Validate structure
        if "criteria" not in evaluation_data or "suggestions" not in evaluation_data:
            raise ValueError("Invalid evaluation response structure")

        if len(evaluation_data["criteria"]) != 8:
            raise ValueError(
                f"Expected 8 criteria, got {len(evaluation_data['criteria'])}"
            )

        # Create evaluation record
        evaluation = Evaluation(
            session_id=session_id,
            criterion1_score=evaluation_data["criteria"][0]["score"],
            criterion1_explanation=evaluation_data["criteria"][0]["explanation"],
            criterion2_score=evaluation_data["criteria"][1]["score"],
            criterion2_explanation=evaluation_data["criteria"][1]["explanation"],
            criterion3_score=evaluation_data["criteria"][2]["score"],
            criterion3_explanation=evaluation_data["criteria"][2]["explanation"],
            criterion4_score=evaluation_data["criteria"][3]["score"],
            criterion4_explanation=evaluation_data["criteria"][3]["explanation"],
            criterion5_score=evaluation_data["criteria"][4]["score"],
            criterion5_explanation=evaluation_data["criteria"][4]["explanation"],
            criterion6_score=evaluation_data["criteria"][5]["score"],
            criterion6_explanation=evaluation_data["criteria"][5]["explanation"],
            criterion7_score=evaluation_data["criteria"][6]["score"],
            criterion7_explanation=evaluation_data["criteria"][6]["explanation"],
            criterion8_score=evaluation_data["criteria"][7]["score"],
            criterion8_explanation=evaluation_data["criteria"][7]["explanation"],
            improvement_suggestions=evaluation_data["suggestions"],
        )

        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)

        return formatting.format_evaluation_response(evaluation)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse evaluation response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@sessionRouter.get("/api/sessions/summary", response_model=SessionsSummaryResponse)
async def get_last_session_summary(
    request: Request, db: OrmSession = Depends(get_db)
) -> SessionsSummaryResponse:
    """Get a summary of the last sessions the user did per case."""

    user = auth.require_user(request)
    session_id = str(uuid.uuid4())

    # Check if this is a VHB user
    is_vhb = user.get("is_vhb_user", False)
    if is_vhb:
        raise HTTPException(
            status_code=403, detail="Session summary not available for VHB users"
        )
    tum_id = user.get("tum_id") or user.get("sub")
    last_sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == tum_id)
        .filter(ChatSession.evaluation != None)
        .distinct(ChatSession.case_id)
        .order_by(ChatSession.case_id, desc(ChatSession.started_at))
        .all()
    )
    session_summary = SessionsSummaryResponse(sessions={})
    for session in last_sessions:
        evaluation = (
            db.query(Evaluation).filter(Evaluation.session_id == session.id).first()
        )
        if evaluation:
            summary = SessionSummaryData(
                sessionId=session.id,
                score=(
                    evaluation.criterion1_score
                    + evaluation.criterion2_score
                    + evaluation.criterion3_score
                    + evaluation.criterion4_score
                    + evaluation.criterion5_score
                    + evaluation.criterion6_score
                    + evaluation.criterion7_score
                    + evaluation.criterion8_score
                )
                / 8.0,
            )
            session_summary.sessions[session.case_id] = summary

    return session_summary
