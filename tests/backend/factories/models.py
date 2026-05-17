from app.model.models import Case, Evaluation, Message, Session


def create_case(db, case_id: str = "bauchschmerzen") -> Case:
    case = Case(id=case_id, title=f"Case {case_id}", language="de")
    db.add(case)
    db.commit()
    return case


def create_session(
    db, session_id: str, case_id: str = "bauchschmerzen", user_id: str = "ge38qap"
) -> Session:
    session = Session(id=session_id, case_id=case_id, user_id=user_id)
    db.add(session)
    db.commit()
    return session


def create_message(
    db,
    session_id: str,
    role: str,
    content: str,
    tokens_in: int | None = None,
    tokens_out: int | None = None,
) -> Message:
    message = Message(
        session_id=session_id,
        role=role,
        content=content,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
    )
    db.add(message)
    db.commit()
    return message


def create_evaluation(db, session_id: str, score: int = 4) -> Evaluation:
    evaluation = Evaluation(
        session_id=session_id,
        criterion1_score=score,
        criterion1_explanation="Good",
        criterion2_score=score,
        criterion2_explanation="Good",
        criterion3_score=score,
        criterion3_explanation="Good",
        criterion4_score=score,
        criterion4_explanation="Good",
        criterion5_score=score,
        criterion5_explanation="Good",
        criterion6_score=score,
        criterion6_explanation="Good",
        criterion7_score=score,
        criterion7_explanation="Good",
        criterion8_score=score,
        criterion8_explanation="Good",
        improvement_suggestions=[
            "Ask more open questions",
            "Summarize",
            "Check red flags",
        ],
    )
    db.add(evaluation)
    db.commit()
    return evaluation
