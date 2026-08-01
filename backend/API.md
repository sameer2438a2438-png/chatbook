# ChatBook API

Base URL: `http://localhost:8000/api`

Authentication: send `Authorization: Bearer <token>` for all protected endpoints.

All responses are JSON. Errors follow the FastAPI shape:

```json
{ "detail": "message" }
```

---

## Auth

### POST /register
Create a user account. Returns a JWT token.

**Request**
```json
{ "email": "jane@example.com", "username": "jane", "password": "secret123" }
```
**Response 201**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "jane@example.com", "username": "jane", "created_at": "2026-08-01T00:00:00" }
}
```
Errors: `409` email/username taken, `422` validation.

### POST /login
**Request**
```json
{ "email": "jane@example.com", "password": "secret123" }
```
**Response 200** — same shape as `/register`.
Errors: `401` incorrect credentials.

### GET /me  (protected)
Returns the current user's profile.

---

## Books

### POST /upload  (protected, multipart/form-data)
Upload a PDF and index it for retrieval. Fields: `file` (PDF), `title` (string).

**Response 201**
```json
{
  "id": 1,
  "title": "Designing Interfaces",
  "filename": "designing-interfaces.pdf",
  "page_count": 214,
  "size_bytes": 2845113,
  "chunk_count": 372,
  "created_at": "2026-08-01T00:00:00"
}
```
Errors: `400` not a PDF / unreadable, `413` over size limit.

### GET /books  (protected)
List the user's books, newest first. Optional query param `?search=title` filters by title.

### GET /books/{id}  (protected)
Book metadata. Errors: `404`.

### DELETE /books/{id}  (protected)
Deletes the book, its chunks, and removes its vectors from the index. Response `204`.

---

## Chat

### POST /chat  (protected, Server-Sent Events stream)
Ask a question. The response is a stream of `data: <json>` lines (one SSE event per line, separated by blank lines).

**Request**
```json
{ "message": "What are the principles of visual hierarchy?", "session_id": null }
```
`session_id` optional — omit or `null` to start a new conversation (a new session is created).

**Event types**
| type        | fields                          | meaning                                  |
| ----------- | ------------------------------- | ---------------------------------------- |
| `session`   | `session_id`, `title`           | session created/used for this chat       |
| `token`     | `content`                       | a streamed fragment of the answer        |
| `citations` | `citations[]`                   | sources used, with book id/title, page   |
| `suggestions` | `items[]`                     | suggested follow-up questions            |
| `error`     | `message`                       | a failure occurred                       |
| `done`      | —                               | stream finished                          |

Example event:
```
data: {"type":"token","content":"Visual hierarchy relies on "}
```
Citation shape:
```json
{ "type": "citations", "citations": [
  { "index": 1, "book_id": 1, "book_title": "Designing Interfaces", "page": 42, "excerpt": "Size and contrast..." }
] }
```
If the answer cannot be found in the books, the assistant replies exactly:
`I couldn't find that information in the uploaded books.`

### GET /history  (protected)
All sessions for the user with their full message history.

**Response**
```json
{
  "sessions": [
    {
      "id": 3,
      "title": "What are the principles of visual hierarchy?",
      "created_at": "2026-08-01T00:00:00",
      "messages": [
        { "id": 1, "session_id": 3, "role": "user", "content": "...", "citations": [], "created_at": "..." },
        { "id": 2, "session_id": 3, "role": "assistant", "content": "...", "citations": [...], "created_at": "..." }
      ]
    }
  ]
}
```

### GET /history/{session_id}  (protected)
A single session's messages. Errors: `404`.

### DELETE /history/{session_id}  (protected)
Delete one conversation. Response `204`.

### DELETE /history  (protected)
Delete all of the user's conversations. Response `204`.

---

## Misc

### GET /health
```json
{ "status": "ok", "app": "ChatBook" }
```
