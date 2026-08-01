from collections.abc import Iterator

import ollama

from ..config import settings


def _client() -> ollama.Client:
    return ollama.Client(host=settings.ollama_base_url, timeout=600)


def ensure_model() -> None:
    """Ensure the configured model is available locally, pulling it if needed."""
    client = _client()
    installed = set()
    for model in client.list().models:
        name = getattr(model, "name", None) or getattr(model, "model", None)
        if name:
            installed.add(name)
    if settings.llm_model not in installed:
        client.pull(settings.llm_model)


def stream_chat(messages: list[dict], model: str | None = None) -> Iterator[str]:
    """Yield content tokens from a streaming chat completion."""
    client = _client()
    stream = client.chat(
        model=model or settings.llm_model,
        messages=messages,
        stream=True,
        options={"num_ctx": 4096, "temperature": 0.3},
    )
    for chunk in stream:
        content = chunk.get("message", {}).get("content", "")
        if content:
            yield content


def complete_chat(messages: list[dict], model: str | None = None) -> str:
    """Return a full (non-streaming) completion as a string."""
    client = _client()
    response = client.chat(
        model=model or settings.llm_model,
        messages=messages,
        stream=False,
        options={"num_ctx": 4096, "temperature": 0.3},
    )
    return response.get("message", {}).get("content", "")
