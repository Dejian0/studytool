from __future__ import annotations

import json
import logging
from pathlib import Path

import os

from fastapi import FastAPI, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from lib.filesystem import (
    COURSES_DIR,
    create_course,
    delete_file,
    delete_note,
    delete_notes_for_pdf,
    ensure_base_dirs,
    get_file_path,
    list_courses,
    list_files,
    list_notes,
    list_prompts,
    read_note,
    read_prompt,
    save_uploaded_file,
    write_prompt,
)
from lib.pdf_viewer import extract_page_text, get_page_count, render_page
from lib.notes_pipeline import (
    clear_job_status,
    extract_slide_section,
    get_job_status,
    is_job_running,
    notes_filename,
    start_core_principles,
    start_lecture_notes,
)
from lib import ai

ensure_base_dirs()

app = FastAPI(title="Study Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class CreateCourseRequest(BaseModel):
    name: str

class UpdatePromptRequest(BaseModel):
    content: str

class GenerateRequest(BaseModel):
    model: str = "gpt-5.2"
    force: bool = False


class ChatContext(BaseModel):
    course: str
    pdf: str
    page: int
    selected_text: str | None = None
    cropped_image_base64: str | None = None
    include_slide_notes: bool = True


class ChatRequest(BaseModel):
    model: str = "gpt-4o"
    system_prompt: str = "default_explainer.txt"
    message: str
    context: ChatContext
    history: list[dict] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_api_key(header_key: str | None) -> str:
    """Return the API key from the request header or environment, or raise 400."""
    key = header_key or os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=400,
            detail="No API key provided. Set OPENAI_API_KEY in .env or pass X-OpenAI-Key header.",
        )
    return key


def _require_course(course: str) -> Path:
    """Return the course directory or raise 404."""
    course_dir = COURSES_DIR / course
    if not course_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Course '{course}' not found")
    return course_dir


def _require_pdf(course: str, filename: str) -> Path:
    """Return the slides PDF path or raise 404."""
    _require_course(course)
    pdf_path = get_file_path(course, "slides", filename)
    if not pdf_path.is_file():
        raise HTTPException(status_code=404, detail=f"PDF '{filename}' not found in {course}/slides/")
    return pdf_path


# ---------------------------------------------------------------------------
# Course management
# ---------------------------------------------------------------------------

@app.get("/api/courses")
def get_courses() -> list[str]:
    return list_courses()


@app.post("/api/courses", status_code=201)
def post_course(body: CreateCourseRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Course name must not be empty")
    create_course(name)
    return {"name": name}


@app.get("/api/courses/{course}/files/{folder}")
def get_course_files(course: str, folder: str) -> list[str]:
    _require_course(course)
    if folder not in ("slides", "exams"):
        raise HTTPException(status_code=400, detail="Folder must be 'slides' or 'exams'")
    return list_files(course, folder)


@app.post("/api/courses/{course}/upload/{folder}")
async def upload_files(course: str, folder: str, files: list[UploadFile]):
    _require_course(course)
    if folder not in ("slides", "exams"):
        raise HTTPException(status_code=400, detail="Folder must be 'slides' or 'exams'")

    saved = []
    for f in files:
        if not f.filename:
            raise HTTPException(status_code=400, detail="Uploaded file is missing a filename")
        data = await f.read()
        save_uploaded_file(course, folder, f.filename, data)
        saved.append(f.filename)

    return {"uploaded": saved}


@app.delete("/api/courses/{course}/files/{folder}/{filename}")
def delete_course_file(course: str, folder: str, filename: str):
    _require_course(course)
    if folder not in ("slides", "exams"):
        raise HTTPException(status_code=400, detail="Folder must be 'slides' or 'exams'")

    path = get_file_path(course, folder, filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found in {course}/{folder}/")

    delete_file(course, folder, filename)
    if folder == "slides":
        delete_notes_for_pdf(course, filename)

    return {"deleted": filename}


# ---------------------------------------------------------------------------
# Slide rendering and text extraction
# ---------------------------------------------------------------------------

@app.get("/api/slides/{course}/{filename}/page-count")
def get_slide_page_count(course: str, filename: str):
    pdf_path = _require_pdf(course, filename)
    return {"count": get_page_count(pdf_path)}


@app.get("/api/slides/{course}/{filename}/page/{num}/image")
def get_slide_page_image(course: str, filename: str, num: int, dpi: int = Query(default=150, ge=72, le=600)):
    pdf_path = _require_pdf(course, filename)
    total = get_page_count(pdf_path)
    if num < 1 or num > total:
        raise HTTPException(status_code=404, detail=f"Page {num} out of range (1-{total})")

    png_bytes = render_page(pdf_path, num, dpi=dpi)
    return Response(content=png_bytes, media_type="image/png")


@app.get("/api/slides/{course}/{filename}/page/{num}/text")
def get_slide_page_text(course: str, filename: str, num: int):
    pdf_path = _require_pdf(course, filename)
    total = get_page_count(pdf_path)
    if num < 1 or num > total:
        raise HTTPException(status_code=404, detail=f"Page {num} out of range (1-{total})")

    return extract_page_text(pdf_path, num)


# ---------------------------------------------------------------------------
# Prompt management
# ---------------------------------------------------------------------------

@app.get("/api/prompts")
def get_prompts() -> list[str]:
    return list_prompts()


@app.get("/api/prompts/{name}")
def get_prompt(name: str):
    try:
        content = read_prompt(name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Prompt '{name}' not found")
    return {"name": name, "content": content}


@app.put("/api/prompts/{name}")
def put_prompt(name: str, body: UpdatePromptRequest):
    write_prompt(name, body.content)
    return {"name": name, "content": body.content}


# ---------------------------------------------------------------------------
# Notes
# ---------------------------------------------------------------------------

@app.get("/api/courses/{course}/notes")
def get_notes(course: str) -> list[str]:
    _require_course(course)
    return list_notes(course)


@app.get("/api/courses/{course}/notes/{filename}")
def get_note(course: str, filename: str):
    _require_course(course)
    try:
        content = read_note(course, filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Note '{filename}' not found")
    return {"filename": filename, "content": content}


# ---------------------------------------------------------------------------
# AI / Chat (Phase 7)
# ---------------------------------------------------------------------------

AVAILABLE_MODELS = {
    "openai": ["gpt-4o", "gpt-4o-mini", "gpt-5.2", "gpt-5-mini"],
}


@app.get("/api/providers")
def get_providers():
    return AVAILABLE_MODELS


@app.post("/api/chat")
def post_chat(
    body: ChatRequest,
    x_openai_key: str | None = Header(default=None),
):
    api_key = _resolve_api_key(x_openai_key)

    try:
        system_text = read_prompt(body.system_prompt)
    except FileNotFoundError:
        raise HTTPException(status_code=400, detail=f"Prompt '{body.system_prompt}' not found")

    ctx = body.context
    context_parts: list[str] = []

    if ctx.include_slide_notes:
        try:
            full_notes = read_note(ctx.course, notes_filename(ctx.pdf))
            slide_notes = extract_slide_section(full_notes, ctx.page)
            if slide_notes:
                context_parts.append(
                    "## Lecture notes for this slide\n" + slide_notes
                )
        except FileNotFoundError:
            pass

    if ctx.selected_text:
        context_parts.append(
            "## Text the student selected on the slide\n"
            f'"{ctx.selected_text}"'
        )
    elif not ctx.cropped_image_base64:
        pdf_path = get_file_path(ctx.course, "slides", ctx.pdf)
        if pdf_path.is_file():
            try:
                text_data = extract_page_text(pdf_path, ctx.page)
                page_text = " ".join(b["text"] for b in text_data["blocks"]).strip()
                if page_text:
                    context_parts.append(
                        "## Full text from the current slide\n" + page_text
                    )
            except Exception:
                logger.warning("Failed to extract page text for chat context", exc_info=True)

    user_text = ""
    if context_parts:
        user_text = "\n\n".join(context_parts) + "\n\n"
    user_text += body.message

    image_blocks: list[dict] = []
    if ctx.cropped_image_base64:
        import base64 as b64mod
        try:
            b64mod.b64decode(ctx.cropped_image_base64, validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data")
        image_blocks.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{ctx.cropped_image_base64}",
                "detail": "high",
            },
        })

    messages = ai.build_messages(system_text, body.history, user_text, image_blocks)

    def generate():
        try:
            for chunk in ai.stream_chat(api_key, body.model, messages):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.exception("Chat streaming error")
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Batch generation (Phase 6)
# ---------------------------------------------------------------------------

@app.post("/api/generate-notes/{course}/{filename}", status_code=202)
def post_generate_notes(
    course: str,
    filename: str,
    body: GenerateRequest | None = None,
    x_openai_key: str | None = Header(default=None),
):
    _require_pdf(course, filename)
    if is_job_running("notes", course, filename):
        raise HTTPException(status_code=409, detail="Generation already in progress")

    force = body.force if body else False
    if force:
        delete_note(course, notes_filename(filename))
        clear_job_status("notes", course, filename)

    api_key = _resolve_api_key(x_openai_key)
    model = body.model if body else "gpt-4o"
    start_lecture_notes(course, filename, api_key, model)
    return {"status": "started"}


@app.get("/api/generate-notes/{course}/{filename}/status")
def get_generate_notes_status(course: str, filename: str):
    _require_pdf(course, filename)
    return get_job_status("notes", course, filename)


@app.get("/api/generate-principles/{course}/{filename}/status")
def get_generate_principles_status(course: str, filename: str):
    _require_pdf(course, filename)
    return get_job_status("principles", course, filename)


@app.post("/api/generate-principles/{course}/{filename}", status_code=202)
def post_generate_principles(
    course: str,
    filename: str,
    body: GenerateRequest | None = None,
    x_openai_key: str | None = Header(default=None),
):
    _require_pdf(course, filename)
    if is_job_running("principles", course, filename):
        raise HTTPException(status_code=409, detail="Generation already in progress")

    api_key = _resolve_api_key(x_openai_key)
    model = body.model if body else "gpt-4o"
    start_core_principles(course, filename, api_key, model)
    return {"status": "started"}
