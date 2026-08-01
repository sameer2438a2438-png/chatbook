from .retriever import Source

SYSTEM_INSTRUCTIONS = """You are ChatBook, a helpful assistant that answers questions strictly from the user's uploaded books.
Follow these rules:
1. Answer ONLY using the numbered sources provided below. Never use outside knowledge.
2. Answer clearly and concisely, using Markdown formatting (bullet lists, headings, bold) when helpful.
3. Cite sources inline as [1], [2], etc., where the number refers to the matching numbered source. You MUST include at least one citation marker [n] in your answer.
4. If the question cannot be answered from the provided sources, reply exactly with this sentence:
   "I couldn't find that information in the uploaded books."
5. Never invent citations, page numbers, or facts."""


def format_sources(sources: list[Source]) -> str:
    blocks = []
    for i, src in enumerate(sources, start=1):
        blocks.append(
            f"[{i}] {src['book_title']}, p. {src['page']}\n{src['text']}"
        )
    return "\n\n".join(blocks)


def build_answer_messages(query: str, sources: list[Source], history: list[dict]) -> list[dict]:
    messages: list[dict] = []
    if sources:
        sources_block = format_sources(sources)
        system = f"{SYSTEM_INSTRUCTIONS}\n\nSources:\n{sources_block}"
    else:
        system = SYSTEM_INSTRUCTIONS
    messages.append({"role": "system", "content": system})
    messages.extend(history)
    messages.append({"role": "user", "content": query})
    return messages


def build_suggestion_messages(query: str, answer: str, sources: list[Source]) -> list[dict]:
    titles = ", ".join({s["book_title"] for s in sources}) or "the uploaded books"
    system = (
        "You generate follow-up questions. Return exactly three short, standalone questions "
        "that a reader of the given books might naturally ask next. "
        "Output them as a JSON array of strings, e.g. [\"...\",\"...\",\"...\"]. No other text."
    )
    user = (
        f"Books: {titles}\n"
        f"Question asked: {query}\n"
        f"Answer given:\n{answer[:1500]}"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def parse_citations(answer: str, sources: list[Source]) -> list[dict]:
    """Extract [n] references from the answer and map them to source metadata."""
    import re

    used: dict[int, dict] = {}
    for match in re.finditer(r"\[(\d+)\]", answer):
        idx = int(match.group(1))
        if 1 <= idx <= len(sources):
            src = sources[idx - 1]
            used.setdefault(
                idx,
                {
                    "index": idx,
                    "book_id": src["book_id"],
                    "book_title": src["book_title"],
                    "page": src["page"],
                    "excerpt": src["text"][:200],
                },
            )
    return list(used.values())
