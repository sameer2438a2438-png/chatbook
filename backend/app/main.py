from contextlib import asynccontextmanager
import logging
from pathlib import Path
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api import auth, books, chat
from .config import settings
from .database import Base, engine
from .services.llm import ensure_model

logger = logging.getLogger("chatbook")
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.vector_store_dir.mkdir(parents=True, exist_ok=True)

    def _pull_model() -> None:
        try:
            ensure_model()
            logger.info("LLM model '%s' is ready.", settings.llm_model)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not reach Ollama (%s). Pull the model manually if needed.", exc)

    threading.Thread(target=_pull_model, daemon=True).start()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name}


if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
