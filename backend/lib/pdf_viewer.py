from __future__ import annotations

from pathlib import Path

import fitz  # PyMuPDF

DEFAULT_DPI = 150


def _zoom_for_dpi(dpi: int) -> float:
    return dpi / 72  # fitz default resolution is 72 DPI


def get_page_count(pdf_path: Path | str) -> int:
    """Return the total number of pages in a PDF."""
    with fitz.open(str(pdf_path)) as doc:
        return len(doc)


def render_page(pdf_path: Path | str, page_num: int, dpi: int = DEFAULT_DPI) -> bytes:
    """Render a single page (1-indexed) as PNG bytes."""
    zoom = _zoom_for_dpi(dpi)
    matrix = fitz.Matrix(zoom, zoom)
    with fitz.open(str(pdf_path)) as doc:
        page = doc[page_num - 1]
        pix = page.get_pixmap(matrix=matrix)
        return pix.tobytes("png")


def render_pages(pdf_path: Path | str, start: int, end: int, dpi: int = DEFAULT_DPI) -> list[bytes]:
    """Render pages [start, end] (1-indexed, inclusive) as PNG byte buffers."""
    zoom = _zoom_for_dpi(dpi)
    matrix = fitz.Matrix(zoom, zoom)
    images: list[bytes] = []

    with fitz.open(str(pdf_path)) as doc:
        for page_num in range(start - 1, min(end, len(doc))):
            page = doc[page_num]
            pix = page.get_pixmap(matrix=matrix)
            images.append(pix.tobytes("png"))

    return images


def extract_page_text(pdf_path: Path | str, page_num: int) -> dict:
    """Return page dimensions and text blocks with bounding boxes.

    Uses page.get_text("dict") from PyMuPDF. Only text blocks (type 0)
    are included; image blocks are filtered out.

    page_num is 1-indexed.
    """
    with fitz.open(str(pdf_path)) as doc:
        page = doc[page_num - 1]
        data = page.get_text("dict")

        blocks = []
        for i, block in enumerate(data["blocks"]):
            if block["type"] != 0:
                continue

            lines = []
            for line in block["lines"]:
                spans = [
                    {
                        "text": span["text"],
                        "font": span["font"],
                        "size": round(span["size"], 1),
                    }
                    for span in line["spans"]
                ]
                lines.append({
                    "bbox": [round(v, 1) for v in line["bbox"]],
                    "spans": spans,
                })

            block_text = " ".join(
                span["text"]
                for line in block["lines"]
                for span in line["spans"]
            ).strip()

            blocks.append({
                "id": i,
                "bbox": [round(v, 1) for v in block["bbox"]],
                "text": block_text,
                "lines": lines,
            })

        return {
            "page": page_num,
            "width": round(data["width"], 1),
            "height": round(data["height"], 1),
            "blocks": blocks,
        }
