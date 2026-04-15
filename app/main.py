import json
import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional

import httpx
from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy import func, desc
from sqlalchemy.orm import Session as OrmSession

from app.auth import oidc, auth
from app.config.config import settings
from app.db.db import get_db
from app.llm import formatting
from app.llm import chat as chat_functions
from app.llm.prompts.evaluation import get_evaluation_prompt
from app.model.auth import VHBLoginRequest, VHBLoginResponse
from app.model.cases import GetCasesResponse
from app.model.evaluation import EvaluationResponse
from app.model.models import Evaluation
from app.model.llm import (
    CreateSessionResponse,
    CreateSessionRequest,
    ChatResponse,
    ChatRequest,
)
from app.model.models import (
    Session as ChatSession,
    Message,
    ExportResponse,
    SessionSummary,
)

# Trigger redeployment with OIDC_AUTH_URL secret now configured
app = FastAPI(title="Virtual Patient Backend", version="0.1.0")

# Add CORS middleware
# In production, the frontend is served from the same origin
# In development, allow localhost:3000
cors_origins = ["http://localhost:3000"]
if settings.environment == "production":
    # Allow same-origin requests in production
    cors_origins = ["*"]  # Or specify your Cloud Run URL

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for VHB sessions (not persisted to database)
# Structure: {session_id: {"case_id": str, "messages": [{"role": str, "content": str}]}}
vhb_sessions: Dict[str, Dict] = {}


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/health/oidc")
async def health_oidc() -> dict:
    """Debug endpoint to check OIDC configuration (sanitized)."""
    return {
        "oidc_configured": all(
            [
                settings.oidc_auth_url,
                settings.oidc_client_id,
                settings.oidc_redirect_uri,
            ]
        ),
        "oidc_issuer": (
            settings.oidc_issuer[:20] + "..." if settings.oidc_issuer else None
        ),
        "oidc_client_id": (
            settings.oidc_client_id[:10] + "..." if settings.oidc_client_id else None
        ),
        "oidc_auth_url": (
            settings.oidc_auth_url[:30] + "..." if settings.oidc_auth_url else None
        ),
        "oidc_token_url": (
            settings.oidc_token_url[:30] + "..." if settings.oidc_token_url else None
        ),
        "oidc_jwks_url": (
            settings.oidc_jwks_url[:30] + "..." if settings.oidc_jwks_url else None
        ),
        "oidc_redirect_uri": (
            settings.oidc_redirect_uri if settings.oidc_redirect_uri else None
        ),
        "frontend_url": settings.frontend_url if settings.frontend_url else None,
        "environment": settings.environment,
    }


@app.get("/health/db")
async def health_db(db: OrmSession = Depends(get_db)) -> dict:
    """Check database connectivity."""
    try:
        # Simple query to test DB connection
        result = db.execute(func.now())
        timestamp = result.scalar()
        return {"status": "ok", "database": "connected", "timestamp": str(timestamp)}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}


@app.get("/auth/login")
async def auth_login(
    request: Request, redirect_to: Optional[str] = None
) -> RedirectResponse:
    if not all(
        [
            settings.oidc_auth_url,
            settings.oidc_client_id,
            settings.oidc_redirect_uri,
        ]
    ):
        raise HTTPException(status_code=500, detail="OIDC not configured")

    state = uuid.uuid4().hex
    nonce = uuid.uuid4().hex
    state_token = oidc.sign(
        {
            "state": state,
            "nonce": nonce,
            "issued_at": int(time.time()),
            "redirect_to": redirect_to or "/",
        }
    )

    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": "openid",
        "state": state,
        "nonce": nonce,
    }
    # Build authorize URL
    from urllib.parse import urlencode

    authorize_url = f"{settings.oidc_auth_url}?{urlencode(params)}"
    response = RedirectResponse(authorize_url, status_code=302)
    oidc.set_cookie(response, "oidc_state", state_token, max_age=600)
    return response


@app.get("/auth/callback")
async def auth_callback(
    request: Request, code: Optional[str] = None, state: Optional[str] = None
) -> RedirectResponse:
    if code is None or state is None:
        raise HTTPException(status_code=400, detail="Missing code/state")
    state_token = request.cookies.get("oidc_state")
    if not state_token:
        raise HTTPException(status_code=400, detail="Missing state cookie")
    st = oidc.verify(state_token)
    if st.get("state") != state:
        raise HTTPException(status_code=400, detail="State mismatch")

    # Exchange code for tokens
    if not all(
        [
            settings.oidc_token_url,
            settings.oidc_client_id,
            settings.oidc_client_secret,
            settings.oidc_redirect_uri,
        ]
    ):
        raise HTTPException(status_code=500, detail="OIDC not configured")

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.oidc_redirect_uri,
        "client_id": settings.oidc_client_id,
        "client_secret": settings.oidc_client_secret,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(settings.oidc_token_url, data=data)
        token_res.raise_for_status()
        token_payload = token_res.json()

    id_token = token_payload.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    access_token = token_payload.get("access_token")

    # Verify id_token using JWKS
    jwks = await auth.fetch_jwks()
    try:
        claims = jwt.decode(
            id_token,
            jwks,
            algorithms=["RS256"],
            audience=settings.oidc_client_id,
            issuer=settings.oidc_issuer,
            access_token=access_token,
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid id_token: {str(e)}")

    # Basic nonce check
    if claims.get("nonce") != st.get("nonce"):
        raise HTTPException(status_code=401, detail="Invalid nonce")

    # Redirect back to frontend after successful authentication
    frontend_path = st.get("redirect_to") or "/"
    redirect_to = f"{settings.frontend_url}{frontend_path}"
    response = RedirectResponse(redirect_to, status_code=302)
    auth.set_session(response, claims)
    # remove the temporary state cookie
    response.delete_cookie("oidc_state", path="/")
    return response


@app.get("/auth/me")
async def auth_me(request: Request) -> JSONResponse:
    """Get current user information."""
    user = auth.get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Use stored tum_id from session (extracted at auth time)
    # Fallback to sub if tum_id wasn't found during authentication
    tum_id = user.get("tum_id") or user.get("sub")

    return JSONResponse(
        content={
            "sub": user.get("sub"),
            "tum_id": tum_id,
            "email": user.get("email"),
            "name": user.get("name"),
        }
    )


@app.post("/auth/logout")
async def auth_logout() -> JSONResponse:
    response = JSONResponse(content={"ok": True})
    response.delete_cookie("session", path="/")
    return response



@app.post("/auth/vhb-login", response_model=VHBLoginResponse)
async def vhb_login(req: VHBLoginRequest, response: Response) -> VHBLoginResponse:
    """Authenticate VHB users with a shared password."""
    if not settings.vhb_password:
        raise HTTPException(status_code=503, detail="VHB login not configured")

    if req.password != settings.vhb_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    # Create session token for VHB user
    session_claims = {
        "sub": "vhb-guest",
        "email": "vhb@external.de",
        "name": "VHB User",
        "is_vhb_user": True,  # Flag to identify VHB users
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24,  # 24h
    }
    token = oidc.sign(session_claims)

    oidc.set_cookie(response, "session", token, max_age=60 * 60 * 24)
    return VHBLoginResponse(ok=True, token=token)


@app.post("/api/sessions", response_model=CreateSessionResponse)
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


@app.post("/api/chat", response_model=ChatResponse)
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


@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
) -> JSONResponse:
    """Transcribe audio to text using OpenAI Whisper."""
    try:
        # Read audio file
        audio_data = await audio.read()

        # Get OpenAI client
        client = chat_functions.get_openai_client()

        # Transcribe using Whisper
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=("audio.webm", audio_data, "audio/webm"),
            language="de",  # German language hint for better accuracy
        )

        return JSONResponse(content={"text": transcript.text})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# Analytics and Export endpoints
@app.get("/api/export", response_model=ExportResponse)
async def export_sessions(
    case_id: Optional[str] = Query(None, description="Filter by case ID"),
    days: int = Query(7, description="Number of days to look back"),
    db: OrmSession = Depends(get_db),
) -> ExportResponse:
    """Export session data for analytics and evaluation."""

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Build query
    query = db.query(ChatSession)
    if case_id:
        query = query.filter(ChatSession.case_id == case_id)
    query = query.filter(ChatSession.started_at >= start_date)

    sessions = query.order_by(desc(ChatSession.started_at)).all()

    # Build summaries with token counts
    session_summaries = []
    for session in sessions:
        # Get token totals for this session
        token_stats = (
            db.query(
                func.sum(Message.tokens_in).label("total_in"),
                func.sum(Message.tokens_out).label("total_out"),
                func.count(Message.id).label("msg_count"),
            )
            .filter(Message.session_id == session.id)
            .first()
        )

        session_summaries.append(
            SessionSummary(
                session_id=session.id,
                case_id=session.case_id,
                user_id=session.user_id,
                started_at=session.started_at,
                ended_at=session.ended_at,
                message_count=token_stats.msg_count or 0,
                total_tokens_in=token_stats.total_in,
                total_tokens_out=token_stats.total_out,
            )
        )

    return ExportResponse(
        sessions=session_summaries,
        total_sessions=len(session_summaries),
        date_range=f"{start_date.date()} to {end_date.date()}",
    )


@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str, db: OrmSession = Depends(get_db)
) -> JSONResponse:
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

    return JSONResponse(
        content={
            "session_id": session_id,
            "case_id": session.case_id,
            "started_at": session.started_at.isoformat(),
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "tokens_in": msg.tokens_in,
                    "tokens_out": msg.tokens_out,
                }
                for msg in messages
            ],
        }
    )


@app.get("/api/cases/{case_id}")
async def get_case_details(case_id: str) -> JSONResponse:
    """Get case details including patient persona information."""
    try:
        case_data = chat_functions.load_case_data(case_id)
        persona = case_data.get("persona", {})

        return JSONResponse(
            content={
                "id": case_data.get("id", case_id),
                "title": case_data.get("title", ""),
                "language": case_data.get("language", "de"),
                "patient_name": persona.get("name", ""),
                "patient_age": persona.get("age", ""),
                "patient_occupation": persona.get("occupation", ""),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load case: {str(e)}")


@app.get("/api/cases", response_model=GetCasesResponse)
async def get_cases() -> GetCasesResponse:
    """Get case details including patient persona information."""
    try:
        cases_data = chat_functions.load_all_cases()
        cases_list = []
        for case_id, case_data in cases_data.items():
            persona = case_data.get("persona", {})
            casesJson = {
                "id": case_data.get("id", case_id),
                "title": case_data.get("title", ""),
                "language": case_data.get("language", "de"),
                "patient_name": persona.get("name", ""),
                "patient_age": persona.get("age", ""),
                "patient_occupation": persona.get("occupation", ""),
            }
            cases_list.append(casesJson)
        return GetCasesResponse(cases=cases_list)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load case: {str(e)}")


@app.get("/api/analytics/summary")
async def get_analytics_summary(
    days: int = Query(7, description="Number of days to look back"),
    db: OrmSession = Depends(get_db),
) -> JSONResponse:
    """Get basic analytics summary."""

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Session counts by case
    case_stats = (
        db.query(ChatSession.case_id, func.count(ChatSession.id).label("session_count"))
        .filter(ChatSession.started_at >= start_date)
        .group_by(ChatSession.case_id)
        .all()
    )

    # Total token usage
    token_stats = (
        db.query(
            func.sum(Message.tokens_in).label("total_tokens_in"),
            func.sum(Message.tokens_out).label("total_tokens_out"),
            func.count(Message.id).label("total_messages"),
        )
        .join(ChatSession)
        .filter(ChatSession.started_at >= start_date)
        .first()
    )

    return JSONResponse(
        content={
            "date_range": f"{start_date.date()} to {end_date.date()}",
            "sessions_by_case": [
                {"case_id": case_id, "session_count": count}
                for case_id, count in case_stats
            ],
            "total_tokens_in": token_stats.total_tokens_in or 0,
            "total_tokens_out": token_stats.total_tokens_out or 0,
            "total_messages": token_stats.total_messages or 0,
            "total_sessions": sum(count for _, count in case_stats),
        }
    )


# Evaluation Endpoints


@app.post("/api/sessions/{session_id}/evaluate", response_model=EvaluationResponse)
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
        raise HTTPException(status_code=403, detail="Invalid user ID for session")
    # Check if evaluation already exists
    existing_evaluation = (
        db.query(Evaluation).filter(Evaluation.session_id == session_id).first()
    )

    if existing_evaluation:
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

    # Call OpenAI to generate evaluation
    try:
        client = chat_functions.get_openai_client()
        completion = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": "Sie sind ein medizinischer Ausbilder. Antworten Sie ausschließlich im angeforderten JSON-Format.",
                },
                {"role": "user", "content": evaluation_prompt},
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        response_text = completion.choices[0].message.content or ""

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


# Mount static files and serve frontend (production only)
if settings.environment == "production":
    frontend_dist = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "frontend", "dist"
    )

    if os.path.exists(frontend_dist):
        # Serve static assets (JS, CSS, images)
        app.mount(
            "/assets",
            StaticFiles(directory=os.path.join(frontend_dist, "assets")),
            name="assets",
        )

        # Serve other static files (favicon, images, etc.)
        static_files = [
            "favicon.ico",
            "file.svg",
            "globe.svg",
            "next.svg",
            "vercel.svg",
            "window.svg",
        ]
        for file in static_files:
            file_path = os.path.join(frontend_dist, file)
            if os.path.exists(file_path):

                @app.get(f"/{file}")
                async def serve_static_file(file_name=file):
                    return FileResponse(os.path.join(frontend_dist, file_name))

        # Serve patient images
        patients_dir = os.path.join(frontend_dist, "patients")
        if os.path.exists(patients_dir):
            app.mount("/patients", StaticFiles(directory=patients_dir), name="patients")

        # Serve index.html for all other routes (SPA support)
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            # Don't interfere with API routes
            if (
                full_path.startswith("api/")
                or full_path.startswith("auth/")
                or full_path == "health"
            ):
                raise HTTPException(status_code=404, detail="Not found")

            return FileResponse(os.path.join(frontend_dist, "index.html"))
