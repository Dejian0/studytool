from __future__ import annotations

from pathlib import Path

import fitz  # PyMuPDF

DPI = 150
ZOOM = DPI / 72  # fitz default resolution is 72 DPI


def get_page_count(pdf_path: Path | str) -> int:
    """Return the total number of pages in a PDF."""
    with fitz.open(str(pdf_path)) as doc:
        return len(doc)


def render_pages(pdf_path: Path | str, start: int, end: int) -> list[bytes]:
    """Render pages [start, end] (1-indexed, inclusive) as PNG byte buffers."""
    matrix = fitz.Matrix(ZOOM, ZOOM)
    images: list[bytes] = []

    with fitz.open(str(pdf_path)) as doc:
        for page_num in range(start - 1, min(end, len(doc))):
            page = doc[page_num]
            pix = page.get_pixmap(matrix=matrix)
            images.append(pix.tobytes("png"))

    return images
