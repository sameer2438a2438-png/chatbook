import threading

import faiss
import numpy as np

from ..config import settings


class VectorStore:
    """Per-user FAISS (IndexIDMap2 / IndexFlatIP) index, persisted to disk."""

    def __init__(self) -> None:
        self._indices: dict[int, faiss.IndexIDMap2] = {}
        self._lock = threading.Lock()

    def _index_path(self, user_id: int):
        return settings.vector_store_dir / f"user_{user_id}.faiss"

    def _load(self, user_id: int) -> faiss.IndexIDMap2:
        path = self._index_path(user_id)
        if path.exists():
            raw = faiss.read_index(str(path))
            if isinstance(raw, faiss.IndexIDMap2):
                return raw
            base = faiss.IndexFlatIP(settings.embedding_dim)
            base.add(raw.reconstruct_n(0, raw.ntotal))
            return faiss.IndexIDMap2(base)
        return faiss.IndexIDMap2(faiss.IndexFlatIP(settings.embedding_dim))

    def _get(self, user_id: int) -> faiss.IndexIDMap2:
        with self._lock:
            index = self._indices.get(user_id)
            if index is None:
                index = self._load(user_id)
                self._indices[user_id] = index
            return index

    def add(self, user_id: int, vectors: np.ndarray, ids: list[int]) -> None:
        index = self._get(user_id)
        if len(vectors) == 0:
            return
        ids_arr = np.asarray(ids, dtype=np.int64)
        index.add_with_ids(vectors, ids_arr)
        self.save(user_id)

    def remove(self, user_id: int, ids: list[int]) -> None:
        if not ids:
            return
        index = self._get(user_id)
        ids_arr = np.asarray(ids, dtype=np.int64)
        index.remove_ids(ids_arr)
        self.save(user_id)

    def search(self, user_id: int, query_vector: np.ndarray, top_k: int) -> tuple[list[int], list[float]]:
        index = self._get(user_id)
        if index.ntotal == 0:
            return [], []
        scores, ids = index.search(query_vector, min(top_k, index.ntotal))
        ids_flat = ids[0].tolist()
        scores_flat = scores[0].tolist()
        return ids_flat, scores_flat

    def save(self, user_id: int) -> None:
        settings.vector_store_dir.mkdir(parents=True, exist_ok=True)
        with self._lock:
            index = self._indices.get(user_id)
        if index is not None and index.ntotal > 0:
            faiss.write_index(index, str(self._index_path(user_id)))
        elif index is not None:
            path = self._index_path(user_id)
            if path.exists():
                path.unlink(missing_ok=True)


vector_store = VectorStore()
