from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Book, Chunk, User
from ..services.embedder import embed_query
from ..services.vectorstore import vector_store

Source = dict


def retrieve(db: Session, user: User, query: str, top_k: int = 4) -> list[Source]:
    """Retrieve the most relevant book chunks for a user's query."""
    query_vector = embed_query(query)
    chunk_ids, _scores = vector_store.search(user.id, query_vector, top_k)
    if not chunk_ids:
        return []

    stmt = (
        select(Chunk, Book)
        .join(Book, Chunk.book_id == Book.id)
        .where(Chunk.id.in_(chunk_ids))
    )
    rows = db.execute(stmt).all()
    by_id = {chunk.id: (chunk, book) for chunk, book in rows}

    sources: list[Source] = []
    for chunk_id in chunk_ids:
        item = by_id.get(int(chunk_id))
        if item is None:
            continue
        chunk, book = item
        sources.append(
            {
                "chunk_id": chunk.id,
                "book_id": book.id,
                "book_title": book.title,
                "page": chunk.page,
                "text": chunk.text[:1200],
            }
        )
    return sources
