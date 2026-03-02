from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

COURSES_DIR = BASE_DIR / "courses"
PROMPTS_DIR = BASE_DIR / "prompts"

COURSE_SUBDIRS = ("slides", "exams", "notes")

DEFAULT_PROMPTS: dict[str, str] = {
    "default_explainer.txt": (
        "You are an expert engineering tutor. The student will show you lecture "
        "slides and ask questions. Explain concepts clearly using precise "
        "technical language, step-by-step derivations, and real-world analogies "
        "where helpful. Reference the specific slide content shown in the images."
    ),
    "exam_analyzer.txt": (
        "You are an exam-preparation assistant for engineering students. "
        "Analyze the provided past exam papers and identify:\n"
        "1. The most frequently tested topics.\n"
        "2. Common question formats (derivation, numerical, conceptual).\n"
        "3. A prioritized study checklist ranked by likelihood of appearance.\n\n"
        "Output your analysis as well-structured Markdown."
    ),
    "socratic_tutor.txt": (
        "You are a Socratic tutor for engineering students. Instead of giving "
        "direct answers, guide the student toward understanding by asking "
        "targeted follow-up questions. Reference the slide content shown in the "
        "images to keep the dialogue grounded. Only reveal the answer if the "
        "student is clearly stuck after several attempts."
    ),
    "slide_explanation_instructions.txt": (
        "Explain this slide in depth. Reference the content of the slide "
        "directly. Build on what was covered in previous slides where "
        "relevant.\n\n"
        "After your explanation, add an HTML comment on its own line with a "
        "2-3 sentence summary of the key points from THIS slide only, using "
        "this exact format:\n"
        "<!-- CONTEXT: Your 2-3 sentence summary here -->"
    ),
    "core_principles_system.txt": (
        "You are an expert engineering professor creating a concise reference "
        "sheet for students. Use $...$ for inline math and $$...$$ for display "
        "equations. Output well-structured Markdown.\n\n"
        "Not every concept reduces to an equation. Some core skills are visual "
        "or procedural (e.g., reading a Bode plot, sketching a root locus, "
        "interpreting a phase diagram). When a concept is inherently visual or "
        "graphical, don't force it into a formula -- instead provide a clear, "
        "step-by-step procedure a student can follow to perform or interpret it."
    ),
    "core_principles_instructions.txt": (
        "Based on these complete lecture notes, extract the core principles of "
        "this lecture.\n\n"
        "Principles fall into two categories. Identify which category each "
        "principle belongs to and format it accordingly:\n\n"
        "### Category A -- Theoretical / Mathematical Concepts\n"
        "For principles that can be expressed as definitions and equations, provide:\n"
        "1. The principle/concept name\n"
        "2. A concise but rigorous definition\n"
        "3. The key equation(s) associated with it (in LaTeX)\n"
        "4. Why it matters -- its significance and where it applies\n"
        "5. Common pitfalls or misconceptions\n\n"
        "### Category B -- Visual, Graphical, or Procedural Skills\n"
        "Some concepts are inherently visual or hands-on (e.g., reading a specific "
        "type of graph or diagram, sketching a curve, interpreting a plot, performing "
        "a graphical construction). These cannot be fully captured by a formula alone. "
        "For these, provide:\n"
        "1. The skill name (e.g., \"Reading a Bode magnitude plot\")\n"
        "2. What it is and when you need it (one or two sentences)\n"
        "3. Step-by-step procedure -- a short, numbered list of concrete instructions "
        "a student can follow to perform or interpret this skill\n"
        "4. Key things to look for -- what patterns, shapes, or features signal "
        "important behavior\n"
        "5. Common mistakes\n\n"
        "Do NOT force visual/graphical concepts into Category A. If a student would "
        "need to draw, read, or visually interpret something on an exam, it belongs "
        "in Category B.\n\n"
        "Format as a structured markdown document that a student can use as a "
        "quick-reference cheat sheet. Use section headings to group related principles."
    ),
}


def ensure_base_dirs() -> None:
    """Create courses/ and prompts/ directories and seed default prompts."""
    COURSES_DIR.mkdir(exist_ok=True)
    PROMPTS_DIR.mkdir(exist_ok=True)

    for filename, content in DEFAULT_PROMPTS.items():
        path = PROMPTS_DIR / filename
        if not path.exists():
            path.write_text(content, encoding="utf-8")


def list_courses() -> list[str]:
    """Return sorted subfolder names under courses/."""
    return sorted(
        d.name for d in COURSES_DIR.iterdir() if d.is_dir()
    )


def create_course(name: str) -> Path:
    """Create a new course with slides/, exams/, and notes/ subdirectories."""
    course_dir = COURSES_DIR / name
    for sub in COURSE_SUBDIRS:
        (course_dir / sub).mkdir(parents=True, exist_ok=True)
    return course_dir


def list_files(course: str, subfolder: str, ext: str = ".pdf") -> list[str]:
    """List filenames with the given extension inside a course subfolder."""
    folder = COURSES_DIR / course / subfolder
    if not folder.exists():
        return []
    return sorted(f.name for f in folder.iterdir() if f.suffix.lower() == ext)


def get_file_path(course: str, subfolder: str, filename: str) -> Path:
    """Return the full Path for a file inside a course subfolder."""
    return COURSES_DIR / course / subfolder / filename


def list_prompts() -> list[str]:
    """Return sorted .txt filenames from prompts/."""
    return sorted(f.name for f in PROMPTS_DIR.glob("*.txt"))


def read_prompt(name: str) -> str:
    """Read and return the content of a prompt file."""
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def write_prompt(name: str, content: str) -> None:
    """Write content to a prompt file."""
    (PROMPTS_DIR / name).write_text(content, encoding="utf-8")


def save_uploaded_file(course: str, subfolder: str, name: str, data: bytes) -> Path:
    """Persist an uploaded file into courses/<course>/<subfolder>/<name>."""
    dest = COURSES_DIR / course / subfolder
    dest.mkdir(parents=True, exist_ok=True)
    path = dest / name
    path.write_bytes(data)
    return path


def save_notes(course: str, filename: str, content: str) -> Path:
    """Write content to courses/<course>/notes/<filename> and return the path."""
    notes_dir = COURSES_DIR / course / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)
    path = notes_dir / filename
    path.write_text(content, encoding="utf-8")
    return path


def list_notes(course: str) -> list[str]:
    """Return sorted .md filenames from courses/<course>/notes/."""
    notes_dir = COURSES_DIR / course / "notes"
    if not notes_dir.exists():
        return []
    return sorted(f.name for f in notes_dir.iterdir() if f.suffix.lower() == ".md")


def read_note(course: str, filename: str) -> str:
    """Read and return the content of a note file."""
    path = COURSES_DIR / course / "notes" / filename
    return path.read_text(encoding="utf-8")


def delete_file(course: str, subfolder: str, filename: str) -> None:
    """Remove a file from courses/<course>/<subfolder>/<filename>."""
    path = COURSES_DIR / course / subfolder / filename
    path.unlink(missing_ok=True)


def delete_note(course: str, filename: str) -> None:
    """Remove a single note file from courses/<course>/notes/."""
    path = COURSES_DIR / course / "notes" / filename
    path.unlink(missing_ok=True)


def delete_notes_for_pdf(course: str, pdf_name: str) -> None:
    """Remove lecture notes and core principles files associated with a PDF."""
    stem = Path(pdf_name).stem
    for suffix in ("_lecture_notes.md", "_core_principles.md"):
        (COURSES_DIR / course / "notes" / (stem + suffix)).unlink(missing_ok=True)
