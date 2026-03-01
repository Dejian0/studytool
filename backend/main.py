from __future__ import annotations

from pathlib import Path

import os

from fastapi import FastAPI, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from lib.filesystem import (
    COURSES_DIR,
    create_course,
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
    get_job_status,
    is_job_running,
    start_core_principles,
    start_lecture_notes,
)

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
    model: str = "gpt-4o"


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
        data = await f.read()
        save_uploaded_file(course, folder, f.filename, data)
        saved.append(f.filename)

    return {"uploaded": saved}


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
# AI / Chat stubs (Phase 7)
# ---------------------------------------------------------------------------

@app.post("/api/chat")
def post_chat():
    raise HTTPException(status_code=501, detail="Chat endpoint not yet implemented (Phase 7)")


@app.get("/api/providers")
def get_providers():
    raise HTTPException(status_code=501, detail="Providers endpoint not yet implemented (Phase 7)")


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
