"""End-to-end API test for ChatBook. Run from backend/ with venv active."""
import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000/api"


def request(method, path, data=None, token=None, headers=None, timeout=120):
    url = f"{BASE}{path}"
    body = None
    h = dict(headers or {})
    if token:
        h["Authorization"] = f"Bearer {token}"
    if data is not None:
        if isinstance(data, bytes):
            body = data
        else:
            body = json.dumps(data).encode()
            h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, raw


def main():
    import time

    suffix = int(time.time())
    email = f"test{suffix}@example.com"
    # 1. register
    status, raw = request("POST", "/register", {"email": email, "username": f"tester{suffix}", "password": "secret123"})
    reg = json.loads(raw)
    assert status == 201, (status, raw)
    token = reg["access_token"]
    print("[OK] register ->", reg["user"]["username"])

    # 2. duplicate register -> 409
    status, _ = request("POST", "/register", {"email": email, "username": "other", "password": "secret123"})
    assert status == 409, status
    print("[OK] duplicate register rejected 409")

    # 3. login
    status, raw = request("POST", "/login", {"email": email, "password": "secret123"})
    login = json.loads(raw)
    assert status == 200 and login["access_token"], (status, raw)
    print("[OK] login")

    # 4. me
    status, raw = request("GET", "/me", token=token)
    me = json.loads(raw)
    assert status == 200 and me["email"] == email
    print("[OK] me")

    # 5. unauth access rejected
    status, _ = request("GET", "/books")
    assert status == 401, status
    print("[OK] unauth rejected 401")

    # 6. upload PDF (multipart)
    boundary = "----chatbooktest"
    pdf = open("sample_design_book.pdf", "rb").read()
    fields = [b'Content-Disposition: form-data; name="title"', b"", b"Designing Interfaces Sample"]
    file_fields = [f'Content-Disposition: form-data; name="file"; filename="sample_design_book.pdf"'.encode(), b"Content-Type: application/pdf"]
    parts = []
    for f in (fields, file_fields):
        parts.append(b"--" + boundary.encode())
        for line in f:
            parts.append(line)
        parts.append(b"")
    parts.append(pdf)
    parts.append(b"--" + boundary.encode() + b"--\r\n")
    body = b"\r\n".join(parts)
    status, raw = request("POST", "/upload", body, token=token, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}, timeout=300)
    book = json.loads(raw)
    assert status == 201, (status, raw)
    assert book["page_count"] > 0 and book["chunk_count"] > 0, book
    print(f"[OK] upload -> '{book['title']}' pages={book['page_count']} chunks={book['chunk_count']}")

    # 7. list + search
    status, raw = request("GET", "/books", token=token)
    books = json.loads(raw)
    assert status == 200 and any(b["id"] == book["id"] for b in books)
    status, raw = request("GET", "/books?search=designing", token=token)
    found = json.loads(raw)
    assert status == 200 and len(found) == 1, found
    print("[OK] list + search books")

    # 8. chat (SSE) — must stream tokens + citations + suggestions
    chat_body = json.dumps({"message": "What principles does the book discuss for visual hierarchy?"}).encode()
    req = urllib.request.Request(f"{BASE}/chat", data=chat_body, method="POST", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    tokens, citations, suggestions, got_session, done = "", None, None, False, False
    with urllib.request.urlopen(req, timeout=600) as resp:
        assert resp.headers.get("Content-Type", "").startswith("text/event-stream"), resp.headers
        for line in resp:
            line = line.decode().strip()
            if not line.startswith("data:"):
                continue
            evt = json.loads(line[5:].strip())
            if evt["type"] == "session":
                got_session = evt["session_id"]
            elif evt["type"] == "token":
                tokens += evt["content"]
            elif evt["type"] == "citations":
                citations = evt["citations"]
            elif evt["type"] == "suggestions":
                suggestions = evt["items"]
            elif evt["type"] == "done":
                done = True
    assert got_session is not False, "no session event"
    assert done, "stream did not finish"
    assert len(tokens) > 20, f"answer too short: {tokens!r}"
    print(f"[OK] chat streamed {len(tokens)} chars; session={got_session}")
    if citations:
        print(f"     citations: {[(c['book_title'], c['page']) for c in citations]}")
    else:
        print("     (no citations parsed)")
    print(f"     suggestions: {suggestions}")

    # 9. follow-up in same session
    chat_body = json.dumps({"message": "What is a good line height for body text?", "session_id": got_session}).encode()
    req = urllib.request.Request(f"{BASE}/chat", data=chat_body, method="POST", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    n_tokens = 0
    with urllib.request.urlopen(req, timeout=600) as resp:
        for line in resp:
            line = line.decode().strip()
            if line.startswith("data:"):
                evt = json.loads(line[5:].strip())
                if evt["type"] == "token":
                    n_tokens += len(evt["content"])
    assert n_tokens > 10
    print(f"[OK] follow-up in same session streamed {n_tokens} chars")

    # 10. history
    status, raw = request("GET", "/history", token=token)
    history = json.loads(raw)
    assert status == 200 and len(history["sessions"]) == 1
    session = history["sessions"][0]
    assert len(session["messages"]) == 4  # 2 user + 2 assistant
    print(f"[OK] history: 1 session, {len(session['messages'])} messages")

    # 11. delete book
    status, raw = request("DELETE", f"/books/{book['id']}", token=token)
    assert status == 204, (status, raw)
    status, raw = request("GET", "/books", token=token)
    assert status == 200 and len(json.loads(raw)) == 0
    print("[OK] delete book")

    # 12. clear history
    status, raw = request("DELETE", "/history", token=token)
    assert status == 204, (status, raw)
    status, raw = request("GET", "/history", token=token)
    assert len(json.loads(raw)["sessions"]) == 0
    print("[OK] clear history")

    print("\nALL TESTS PASSED")


if __name__ == "__main__":
    main()
