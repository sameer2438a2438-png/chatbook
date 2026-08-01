import uuid
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pypdf import PdfReader
from sqlalchemy import func, select

from ..config import settings
from ..deps import CurrentUser, DbDep
from ..models import Book, Chunk
from ..schemas import BookResponse
from ..services.embedder import embed_texts
from ..services.pdf_processor import process_pdf
from ..services.vectorstore import vector_store

router = APIRouter(prefix="/api", tags=["books"])

ALLOWED_EXTENSIONS = {".pdf"}


def _book_response(db: DbDep, book: Book) -> BookResponse:
    chunk_count = db.execute(
        select(func.count(Chunk.id)).where(Chunk.book_id == book.id)
    ).scalar_one()
    resp = BookResponse.model_validate(book)
    resp.chunk_count = chunk_count
    return resp


@router.post("/upload", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def upload_book(
    user: CurrentUser,
    db: DbDep,
    file: UploadFile = File(...),
    title: str = Form(...),
):
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only PDF files are allowed")

    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"File exceeds {settings.max_upload_mb} MB limit")

    user_dir = settings.upload_dir / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{file.filename.replace('/', '_')}"
    file_path = user_dir / stored_name
    file_path.write_bytes(content)

    try:
        reader = PdfReader(str(file_path))
        page_count = len(reader.pages)
    except Exception:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not read the PDF file")

    display_title = title.strip() or (file.filename or "").rsplit(".", 1)[0]
    book = Book(
        owner_id=user.id,
        title=display_title,
        filename=file.filename or stored_name,
        file_path=str(file_path),
        page_count=page_count,
        size_bytes=len(content),
    )
    db.add(book)
    db.flush()

    entries = process_pdf(str(file_path), settings.chunk_size, settings.chunk_overlap)
    texts = [e["text"] for e in entries]
    vectors = embed_texts(texts)

    chunk_ids: list[int] = []
    for i, entry in enumerate(entries):
        chunk = Chunk(
            book_id=book.id,
            owner_id=user.id,
            page=entry["page"],
            text=entry["text"],
            embedding=vectors[i].tobytes(),
        )
        db.add(chunk)
        db.flush()
        chunk_ids.append(chunk.id)

    vector_store.add(user.id, vectors, chunk_ids)
    db.commit()
    db.refresh(book)
    return _book_response(db, book)


@router.get("/books", response_model=list[BookResponse])
def list_books(user: CurrentUser, db: DbDep, search: str | None = None):
    stmt = select(Book).where(Book.owner_id == user.id).order_by(Book.created_at.desc())
    if search:
        stmt = stmt.where(Book.title.ilike(f"%{search.strip()}%"))
    books = db.execute(stmt).scalars().all()
    return [_book_response(db, b) for b in books]


@router.get("/books/{book_id}", response_model=BookResponse)
def get_book(book_id: int, user: CurrentUser, db: DbDep):
    book = db.get(Book, book_id)
    if book is None or book.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")
    return _book_response(db, book)


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, user: CurrentUser, db: DbDep):
    book = db.get(Book, book_id)
    if book is None or book.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")

    chunk_ids = db.execute(select(Chunk.id).where(Chunk.book_id == book_id)).scalars().all()
    vector_store.remove(user.id, list(chunk_ids))
    db.execute(Chunk.__table__.delete().where(Chunk.book_id == book_id))
    db.delete(book)
    db.commit()
