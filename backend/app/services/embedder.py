import threading

import numpy as np

from ..config import settings

_embedder = None
_lock = threading.Lock()


def get_embedder():
    global _embedder
    if _embedder is None:
        with _lock:
            if _embedder is None:
                from sentence_transformers import SentenceTransformer

                _embedder = SentenceTransformer(settings.embedding_model)
    return _embedder


def embed_texts(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.zeros((0, settings.embedding_dim), dtype=np.float32)
    vectors = get_embedder().encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=16,
    )
    return np.asarray(vectors, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    vectors = get_embedder().encode([query], normalize_embeddings=True)
    return np.asarray(vectors, dtype=np.float32).reshape(1, -1)
