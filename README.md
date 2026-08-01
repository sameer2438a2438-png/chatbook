# ChatBook

A local, open-source RAG chatbot that answers questions **only** from the UI/UX design books (PDFs) you upload — no cloud APIs, no hallucinations from outside knowledge. Works like ChatPDF, but specialized for design books and fully self-hosted.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + React Router + Axios + React Markdown + Framer Motion
- **Backend:** Python + FastAPI + SQLAlchemy + PyPDF + FAISS + Sentence Transformers
- **Embeddings:** `BAAI/bge-small-en-v1.5`
- **LLM:** local via [Ollama](https://ollama.com) — default `llama3.2:3b` (swap to `llama3.1:8b` / `mistral:7b` if you have 16 GB+ RAM)

## Features

- JWT registration / login / logout
- Upload, search, and delete multiple PDF books (drag & drop)
- Automatic text extraction, chunking, embedding, and FAISS indexing with page tracking
- Streaming chat with Markdown rendering
- Inline source citations (`[1]`, `[2]` → book name + page) when available
- Fallback answer when info isn't in the books: *"I couldn't find that information in the uploaded books."*
- Suggested follow-up questions after each answer
- Chat history with sessions (view, delete one, clear all)
- Copy answers to clipboard, listen to them aloud, and speak questions with the mic button
- Dark / light mode, toasts, loading states, responsive mobile layout

## Prerequisites

- Python 3.12
- Node.js 20+
- [Ollama](https://ollama.com/download) (running with a model pulled)
- Windows / macOS / Linux all supported

## Quick start (local)

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
copy .env.example .env            # Windows
# cp .env.example .env            # macOS / Linux

# 2. Frontend
cd ../frontend
npm install
npm run dev                       # serves on http://localhost:5173

# 3. Ollama (in another terminal)
ollama pull llama3.2:3b           # already running? fine
ollama serve                      # or keep the Ollama app running

# 4. Backend server
cd ../backend
python run.py                     # http://localhost:8000  (API + /api/docs)
```

Open **http://localhost:5173**, register, upload a PDF, and start asking questions.

> The backend auto-pulls the configured LLM from Ollama on startup if it's missing, so step 3 is mostly optional.
>
> **npm ≥ 11 blocks install scripts by default.** If `npm install` warns that esbuild's script was skipped (and `npm run build` then fails), fix it once with:
> `node node_modules/esbuild/install.js` or `npm approve-scripts --allow-scripts-pending`.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Key settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | dev value | JWT signing key — change in production |
| `LLM_MODEL` | `llama3.2:3b` | Ollama model used for answers |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | Embedding model |
| `TOP_K` | `4` | Retrieved chunks per question |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `800` / `100` | PDF chunking |
| `MAX_UPLOAD_MB` | `100` | Upload size limit |

## Running with Docker

```bash
docker compose up --build
```

This starts Ollama (auto-pulls the model on first request) and the app, which serves the built frontend at **http://localhost:8000**. The API docs are at `http://localhost:8000/api/docs`.

## Testing (optional)

```bash
# Generate a sample UI/UX book PDF (needs reportlab)
pip install -r backend/requirements-dev.txt
python backend/scripts/make_sample_pdf.py        # writes backend/sample_design_book.pdf

# Full end-to-end API test (server must be running on :8000)
python backend/scripts/e2e_test.py
```

## API documentation

Full endpoint reference with request/response examples: [`backend/API.md`](backend/API.md).
Interactive Swagger UI: `http://localhost:8000/api/docs`.

## Project structure

```
chatbook/
├── backend/
│   ├── app/
│   │   ├── api/            # auth, books, chat (SSE streaming) routers
│   │   ├── rag/            # retrieval + prompt/citation logic
│   │   ├── services/       # pdf processing, embeddings, vector store, llm
│   │   ├── config.py       # environment settings
│   │   ├── database.py     # SQLAlchemy engine/session
│   │   ├── models.py       # User, Book, Chunk, ChatSession, ChatMessage
│   │   ├── schemas.py      # Pydantic request/response models
│   │   └── main.py         # FastAPI app + static frontend serving
│   ├── uploads/            # uploaded PDFs
│   ├── vector_store/       # per-user FAISS indexes
│   ├── data/               # SQLite database
│   ├── scripts/            # sample PDF generator + end-to-end tests
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── API.md
├── frontend/
│   ├── src/
│   │   ├── components/     # Sidebar, BookList, UploadModal, ChatWindow, …
│   │   ├── pages/          # Login, Register, Dashboard
│   │   ├── context/        # Auth, Theme
│   │   ├── hooks/          # useBooks, useToasts
│   │   ├── services/       # API clients (auth, books, chat/SSE)
│   │   └── types/
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Notes & limitations

- Scanned/image-only PDFs (no text layer) won't yield retrievable content — OCR is out of scope.
- Vector search and generation are single-user local; there is no admin dashboard or multi-user scaling.
- The 8 GB RAM machine this was tested on runs best with `llama3.2:3b`. Use `llama3.1:8b` or `mistral:7b` on machines with 16 GB+.

## Roadmap (not implemented)

- OCR for scanned PDFs, conversation export as PDF, bookmarking answers, admin analytics dashboard.
