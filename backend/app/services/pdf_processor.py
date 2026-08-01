import re
from pathlib import Path

from pypdf import PdfReader


def extract_pages(pdf_path: str | Path) -> list[tuple[str, int]]:
    """Return a list of (page_text, page_number) for every page of the PDF."""
    reader = PdfReader(str(pdf_path))
    pages: list[tuple[str, int]] = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        if text:
            pages.append((text, i))
    return pages


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks, preferring paragraph boundaries."""
    if not text:
        return []
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        if not para:
            continue
        if current and current_len + len(para) > chunk_size:
            chunks.append("\n".join(current))
            overlap_text = "\n".join(current)[-overlap:] if overlap else ""
            current = [overlap_text] if overlap_text else []
            current_len = len(overlap_text)
        current.append(para)
        current_len += len(para)

        while current_len > chunk_size:
            joined = "\n".join(current)
            chunks.append(joined[:chunk_size])
            remainder = joined[chunk_size:]
            if not remainder.strip():
                current = []
                current_len = 0
                break
            current = [remainder.strip()]
            current_len = len(current[0])

    if current:
        joined = "\n".join(current)
        if joined.strip():
            chunks.append(joined)
    return chunks


def process_pdf(pdf_path: str | Path, chunk_size: int, chunk_overlap: int) -> list[dict]:
    """Extract and chunk a PDF, returning entries with text and page number."""
    entries: list[dict] = []
    for page_text, page_num in extract_pages(pdf_path):
        for chunk in chunk_text(page_text, chunk_size, chunk_overlap):
            entries.append({"text": chunk, "page": page_num})
    return entries
