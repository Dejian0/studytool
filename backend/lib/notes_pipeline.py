from __future__ import annotations

import logging
import re
import threading
from pathlib import Path
from typing import Any

from lib import ai, filesystem, pdf_viewer

logger = logging.getLogger(__name__)

_jobs: dict[tuple[str, str, str], dict[str, Any]] = {}
_lock = threading.Lock()

NOTES_SUFFIX = "_lecture_notes.md"
PRINCIPLES_SUFFIX = "_core_principles.md"

CONTEXT_RE = re.compile(r"<!--\s*CONTEXT:\s*(.*?)\s*-->", re.DOTALL)
SLIDE_HEADER_RE = re.compile(r"^## Slide (\d+)", re.MULTILINE)


def _job_key(job_type: str, course: str, filename: str) -> tuple[str, str, str]:
    return (job_type, course, filename)


def notes_filename(pdf_name: str) -> str:
    """Return the lecture notes filename for a given PDF."""
    return Path(pdf_name).stem + NOTES_SUFFIX


def extract_slide_section(notes_content: str, slide_num: int) -> str:
    """Extract the notes section for a single slide from the full lecture notes.

    Returns the text between ``## Slide N`` and the next ``## Slide`` header
    (or end of file), stripped of the CONTEXT HTML comment.
    """
    pattern = re.compile(
        rf"^## Slide {slide_num}\b.*?(?=^## Slide \d+|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(notes_content)
    if not match:
        return ""
    section = match.group(0).strip()
    section = CONTEXT_RE.sub("", section).strip()
    return section


def _notes_filename(pdf_name: str) -> str:
    return notes_filename(pdf_name)


def _principles_filename(pdf_name: str) -> str:
    return Path(pdf_name).stem + PRINCIPLES_SUFFIX


# ---------------------------------------------------------------------------
# Job tracker
# ---------------------------------------------------------------------------

def get_job_status(job_type: str, course: str, filename: str) -> dict[str, Any]:
    key = _job_key(job_type, course, filename)
    with _lock:
        job = _jobs.get(key)

    if job is not None:
        return dict(job)

    target = (
        _notes_filename(filename) if job_type == "notes"
        else _principles_filename(filename)
    )
    if target in filesystem.list_notes(course):
        return {
            "status": "completed",
            "current_slide": 0,
            "total_slides": 0,
            "error": None,
        }

    return {
        "status": "idle",
        "current_slide": 0,
        "total_slides": 0,
        "error": None,
    }


def _set_job(key: tuple[str, str, str], data: dict[str, Any]) -> None:
    with _lock:
        _jobs[key] = data


def _clear_job(key: tuple[str, str, str]) -> None:
    with _lock:
        _jobs.pop(key, None)


def is_job_running(job_type: str, course: str, filename: str) -> bool:
    key = _job_key(job_type, course, filename)
    with _lock:
        job = _jobs.get(key)
    return job is not None and job["status"] == "running"


# ---------------------------------------------------------------------------
# Resumability helpers
# ---------------------------------------------------------------------------

def _count_completed_slides(content: str) -> int:
    """Return how many ## Slide N sections exist in the notes markdown."""
    return len(SLIDE_HEADER_RE.findall(content))


def _extract_last_context(content: str) -> str:
    """Pull the last <!-- CONTEXT: ... --> block from existing notes."""
    matches = CONTEXT_RE.findall(content)
    return matches[-1].strip() if matches else ""


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

def _build_slide_prompt(
    slide_num: int,
    total_slides: int,
    extracted_text: str,
    running_context: str,
) -> str:
    parts: list[str] = []

    if running_context:
        parts.append(
            "## Context from previous slides\n" + running_context
        )

    parts.append(
        f"## Current slide ({slide_num} of {total_slides})\n"
        f"Extracted text from this slide:\n\n{extracted_text}"
    )

    parts.append(
        "Explain this slide in depth as if you are a professor delivering a "
        "live lecture. Reference the content of the slide directly. Build on "
        "what was covered in previous slides where relevant.\n\n"
        "After your explanation, add an HTML comment on its own line with a "
        "2-3 sentence summary of the key points from THIS slide only, using "
        "this exact format:\n"
        "<!-- CONTEXT: Your 2-3 sentence summary here -->"
    )

    return "\n\n".join(parts)


def _build_principles_prompt(lecture_notes: str) -> str:
    return (
        "Based on these complete lecture notes, extract the core principles "
        "of this lecture. For each principle, provide:\n"
        "1. The principle/concept name\n"
        "2. A concise but rigorous definition\n"
        "3. The key equation(s) associated with it (in LaTeX)\n"
        "4. Why it matters -- its significance and where it applies\n"
        "5. Common pitfalls or misconceptions\n\n"
        "Format as a structured markdown document that a student can use as "
        "a quick-reference cheat sheet.\n\n"
        "---\n\n" + lecture_notes
    )


# ---------------------------------------------------------------------------
# Lecture notes pipeline
# ---------------------------------------------------------------------------

def start_lecture_notes(
    course: str,
    filename: str,
    api_key: str,
    model: str,
) -> None:
    """Kick off lecture notes generation in a background thread."""
    key = _job_key("notes", course, filename)
    pdf_path = filesystem.get_file_path(course, "slides", filename)
    total = pdf_viewer.get_page_count(pdf_path)

    _set_job(key, {
        "status": "running",
        "current_slide": 0,
        "total_slides": total,
        "error": None,
    })

    thread = threading.Thread(
        target=_run_lecture_notes,
        args=(key, course, filename, pdf_path, total, api_key, model),
        daemon=True,
    )
    thread.start()


def _run_lecture_notes(
    key: tuple[str, str, str],
    course: str,
    filename: str,
    pdf_path: Path,
    total_slides: int,
    api_key: str,
    model: str,
) -> None:
    try:
        notes_name = _notes_filename(filename)
        system_prompt = _load_system_prompt()

        existing_content = ""
        try:
            existing_content = filesystem.read_note(course, notes_name)
        except FileNotFoundError:
            pass

        completed = _count_completed_slides(existing_content)
        running_context = _extract_last_context(existing_content) if completed > 0 else ""

        if completed == 0:
            existing_content = f"# Lecture Notes: {Path(filename).stem}\n\n"

        for slide_num in range(completed + 1, total_slides + 1):
            _set_job(key, {
                "status": "running",
                "current_slide": slide_num,
                "total_slides": total_slides,
                "error": None,
            })

            text_data = pdf_viewer.extract_page_text(pdf_path, slide_num)
            page_text = " ".join(b["text"] for b in text_data["blocks"]).strip()
            page_png = pdf_viewer.render_page(pdf_path, slide_num)

            user_text = _build_slide_prompt(
                slide_num, total_slides, page_text, running_context,
            )
            image_blocks = ai.encode_images([page_png])
            messages = ai.build_messages(system_prompt, [], user_text, image_blocks)

            response = ai.chat_sync(api_key, model, messages)

            context_match = CONTEXT_RE.search(response)
            if context_match:
                running_context = context_match.group(1).strip()

            slide_title = _extract_slide_title(page_text)
            section = f"## Slide {slide_num}\n"
            if slide_title:
                section += f"*{slide_title}*\n\n"
            section += response + "\n\n"

            existing_content += section
            filesystem.save_notes(course, notes_name, existing_content)

        _set_job(key, {
            "status": "completed",
            "current_slide": total_slides,
            "total_slides": total_slides,
            "error": None,
        })

    except Exception:
        logger.exception("Lecture notes generation failed for %s/%s", course, filename)
        with _lock:
            current = _jobs.get(key, {}).get("current_slide", 0)
        _set_job(key, {
            "status": "failed",
            "current_slide": current,
            "total_slides": total_slides,
            "error": "Generation failed. Check server logs for details.",
        })


def _extract_slide_title(page_text: str) -> str:
    """Use the first line of extracted text as a slide title, if short enough."""
    first_line = page_text.split("\n")[0].strip() if page_text else ""
    if first_line and len(first_line) <= 120:
        return first_line
    return ""


def _load_system_prompt() -> str:
    try:
        return filesystem.read_prompt("lecture_notes_generator.txt")
    except FileNotFoundError:
        return filesystem.read_prompt("default_explainer.txt")


# ---------------------------------------------------------------------------
# Core principles pipeline
# ---------------------------------------------------------------------------

def start_core_principles(
    course: str,
    filename: str,
    api_key: str,
    model: str,
) -> None:
    """Kick off core principles generation in a background thread."""
    key = _job_key("principles", course, filename)

    _set_job(key, {
        "status": "running",
        "current_slide": 0,
        "total_slides": 1,
        "error": None,
    })

    thread = threading.Thread(
        target=_run_core_principles,
        args=(key, course, filename, api_key, model),
        daemon=True,
    )
    thread.start()


def _run_core_principles(
    key: tuple[str, str, str],
    course: str,
    filename: str,
    api_key: str,
    model: str,
) -> None:
    try:
        notes_name = _notes_filename(filename)

        try:
            lecture_notes = filesystem.read_note(course, notes_name)
        except FileNotFoundError:
            _set_job(key, {
                "status": "failed",
                "current_slide": 0,
                "total_slides": 1,
                "error": "Lecture notes must be generated first.",
            })
            return

        system_prompt = (
            "You are an expert engineering professor creating a concise reference "
            "sheet for students. Use $...$ for inline math and $$...$$ for display "
            "equations. Output well-structured Markdown."
        )
        user_text = _build_principles_prompt(lecture_notes)
        messages = ai.build_messages(system_prompt, [], user_text, [])

        _set_job(key, {
            "status": "running",
            "current_slide": 1,
            "total_slides": 1,
            "error": None,
        })

        response = ai.chat_sync(api_key, model, messages)

        principles_name = _principles_filename(filename)
        header = f"# Core Principles: {Path(filename).stem}\n\n"
        filesystem.save_notes(course, principles_name, header + response)

        _set_job(key, {
            "status": "completed",
            "current_slide": 1,
            "total_slides": 1,
            "error": None,
        })

    except Exception:
        logger.exception("Core principles generation failed for %s/%s", course, filename)
        _set_job(key, {
            "status": "failed",
            "current_slide": 0,
            "total_slides": 1,
            "error": "Generation failed. Check server logs for details.",
        })
