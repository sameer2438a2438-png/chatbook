import json

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select

from ..config import settings
from ..database import SessionLocal
from ..deps import CurrentUser, DbDep
from ..models import Book, ChatMessage, ChatSession, User
from ..rag.prompt import (
    build_answer_messages,
    build_suggestion_messages,
    parse_citations,
)
from ..rag.retriever import retrieve
from ..schemas import ChatRequest, HistoryResponse, MessageResponse, SessionResponse
from ..services.llm import complete_chat, stream_chat

router = APIRouter(prefix="/api", tags=["chat"])

NOT_FOUND_REPLY = "I couldn't find that information in the uploaded books."
NO_BOOKS_REPLY = "No books have been uploaded yet. Upload a PDF book to start asking questions about it."


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _load_history(db, session_id: int, user_id: int, limit: int = 8) -> list[dict]:
    stmt = (
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.owner_id == user_id,
            ChatMessage.role.in_(["user", "assistant"]),
        )
        .order_by(ChatMessage.id.desc())
        .limit(limit)
    )
    rows = list(db.execute(stmt).scalars())
    return [{"role": m.role, "content": m.content} for m in reversed(rows)]


def _messages_response(db, session: ChatSession) -> list[MessageResponse]:
    msgs = (
        db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.id.asc())
        )
        .scalars()
        .all()
    )
    return [
        MessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            citations=json.loads(m.citations or "[]"),
            created_at=m.created_at,
        )
        for m in msgs
    ]


@router.post("/chat")
def chat(payload: ChatRequest, user: CurrentUser):
    db = SessionLocal()
    try:
        session = None
        if payload.session_id:
            session = db.get(ChatSession, payload.session_id)
            if session is None or session.owner_id != user.id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

        if session is None:
            session = ChatSession(owner_id=user.id, title=payload.message[:60])
            db.add(session)
            db.commit()
            db.refresh(session)

        db.add(
            ChatMessage(
                session_id=session.id,
                owner_id=user.id,
                role="user",
                content=payload.message,
                citations="[]",
            )
        )
        db.commit()

        user_msg = ChatMessage(
            session_id=session.id, owner_id=user.id, role="assistant", content=""
        )
        db.add(user_msg)
        db.commit()
        assistant_msg_id = user_msg.id

        session_id = session.id
        session_title = session.title
        history = _load_history(db, session.id, user.id, settings.history_context_turns)
        history = history[:-1]  # exclude the just-added user message
        sources = retrieve(db, user, payload.message, settings.top_k)
        user_has_books = db.execute(
            select(Book.id).where(Book.owner_id == user.id).limit(1)
        ).scalars().first() is not None
    finally:
        db.close()

    return StreamingResponse(
        _stream_answer(user, assistant_msg_id, session_id, session_title, payload.message, history, sources, user_has_books),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _stream_answer(
    user: User,
    assistant_msg_id: int,
    session_id: int,
    session_title: str,
    query: str,
    history: list[dict],
    sources: list[dict],
    user_has_books: bool,
):
    try:
        yield _sse({"type": "session", "session_id": session_id, "title": session_title})

        if not user_has_books:
            answer = NO_BOOKS_REPLY
            yield _sse({"type": "token", "content": answer})
            _persist_assistant(user.id, assistant_msg_id, answer, [])
            yield _sse({"type": "citations", "citations": []})
            yield _sse({"type": "suggestions", "items": []})
            yield _sse({"type": "done"})
            return

        if not sources:
            answer = NOT_FOUND_REPLY
            yield _sse({"type": "token", "content": answer})
            yield _sse({"type": "citations", "citations": []})
            yield _sse({"type": "suggestions", "items": []})
            _persist_assistant(user.id, assistant_msg_id, answer, [])
            yield _sse({"type": "done"})
            return

        messages = build_answer_messages(query, sources, history)
        answer_parts: list[str] = []
        for token in stream_chat(messages):
            answer_parts.append(token)
            yield _sse({"type": "token", "content": token})

        answer = "".join(answer_parts).strip()
        citations = parse_citations(answer, sources)
        if not citations:
            # The model didn't emit inline [n] markers — surface the retrieved sources
            # (the actual basis for the answer) as the source list.
            citations = [
                {
                    "index": i + 1,
                    "book_id": src["book_id"],
                    "book_title": src["book_title"],
                    "page": src["page"],
                    "excerpt": src["text"][:200],
                }
                for i, src in enumerate(sources)
            ]
        _persist_assistant(user.id, assistant_msg_id, answer, citations)
        yield _sse({"type": "citations", "citations": citations})

        items = _generate_suggestions(query, answer, sources)
        yield _sse({"type": "suggestions", "items": items})
        yield _sse({"type": "done"})
    except Exception as exc:  # noqa: BLE001 - surface streaming errors to the client
        yield _sse({"type": "error", "message": f"Chat failed: {exc}"})
        yield _sse({"type": "done"})


def _persist_assistant(user_id: int, message_id: int, content: str, citations: list[dict]) -> None:
    db = SessionLocal()
    try:
        msg = db.get(ChatMessage, message_id)
        if msg is not None and msg.owner_id == user_id and msg.role == "assistant":
            msg.content = content
            msg.citations = json.dumps(citations)
            db.commit()
    finally:
        db.close()


def _generate_suggestions(query: str, answer: str, sources: list[dict]) -> list[str]:
    try:
        raw = complete_chat(build_suggestion_messages(query, answer, sources))
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end > start:
            items = json.loads(raw[start : end + 1])
            if isinstance(items, list):
                return [str(i).strip() for i in items if str(i).strip()][:3]
    except Exception:
        pass
    return []


@router.get("/history", response_model=HistoryResponse)
def get_history(user: CurrentUser, db: DbDep):
    sessions = (
        db.execute(
            select(ChatSession).where(ChatSession.owner_id == user.id).order_by(ChatSession.created_at.desc())
        )
        .scalars()
        .all()
    )
    return HistoryResponse(
        sessions=[
            SessionResponse(id=s.id, title=s.title, created_at=s.created_at, messages=_messages_response(db, s))
            for s in sessions
        ]
    )


@router.get("/history/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, user: CurrentUser, db: DbDep):
    session = db.get(ChatSession, session_id)
    if session is None or session.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return SessionResponse(
        id=session.id, title=session.title, created_at=session.created_at, messages=_messages_response(db, session)
    )


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(user: CurrentUser, db: DbDep):
    db.execute(delete(ChatSession).where(ChatSession.owner_id == user.id))
    db.commit()


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, user: CurrentUser, db: DbDep):
    session = db.get(ChatSession, session_id)
    if session is None or session.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    db.delete(session)
    db.commit()
