# Study Tool -- Rebuild Plan

## Problem Statement

The current workflow for studying lecture slides involves manually screenshotting slides and pasting them into an LLM (ChatGPT, Gemini, etc.). This has several problems:

1. **Quality degrades at scale** -- Asking an LLM to explain an entire lecture at once results in shallow, surface-level explanations. Each slide deserves focused, professor-level depth.
2. **No text layer** -- Slides are rendered as pure images. You cannot select, copy, or search text or equations.
3. **API costs** -- Every interaction sends base64-encoded slide images to OpenAI, burning tokens. This adds up, especially when the user already pays for LLM subscriptions (ChatGPT Plus, Gemini Advanced).
4. **No direct interaction** -- There is no way to click on a specific equation and ask "what does this mean?", or draw a box around a graph and ask about it. Every question requires manually re-uploading context.

## Goal

A study tool where:

- Every slide in a lecture gets a deep, focused explanation (like a professor delivering a live lecture), generated once and saved.
- At the end of a lecture, a summary of core principles is generated -- the key takeaways, fundamental equations, and concepts a student must internalize.
- The user can click on any equation or text block on a slide and immediately ask the LLM about it.
- The user can draw a rectangle around a graph, diagram, or figure and ask about that specific region.
- Text on slides is selectable and copyable (equations rendered as LaTeX where possible).
- Day-to-day studying and Q&A costs nothing (or near-nothing) by using free-tier APIs (Gemini) or local models (Ollama), with paid APIs (OpenAI) reserved for the one-time batch generation.

## Current Codebase

The existing app is a Streamlit application. The backend logic in `lib/` is reusable; Streamlit itself is being replaced.

```
studytool/
├── app.py                  # Streamlit entry point (will be replaced)
├── requirements.txt        # streamlit, PyMuPDF, openai, python-dotenv
├── .env                    # OPENAI_API_KEY
├── lib/
│   ├── ai.py               # OpenAI chat/vision helpers (encode_images, stream_chat, build_messages, analyze_exams)
│   ├── filesystem.py        # Course/file/prompt CRUD (courses/, prompts/, notes/ directories)
│   ├── pdf_viewer.py        # PyMuPDF: get_page_count, render_pages (PNG bytes)
│   └── latex.py             # Convert \(...\) and \[...\] to $...$ and $$...$$
├── prompts/
│   ├── default_explainer.txt
│   ├── socratic_tutor.txt
│   └── exam_analyzer.txt
└── courses/                 # Runtime directory, one subfolder per course
    └── <CourseName>/
        ├── slides/          # Uploaded lecture PDFs
        ├── exams/           # Uploaded past exam PDFs
        └── notes/           # AI-generated notes (markdown)
```

### Key existing functions worth preserving

- `lib/filesystem.py` -- All file and directory management. Works well as-is; just call from FastAPI instead of Streamlit.
- `lib/pdf_viewer.py` -- `get_page_count(path)` and `render_pages(path, start, end)` using PyMuPDF. Will be extended with text extraction.
- `lib/ai.py` -- `encode_images()`, `build_messages()`, `stream_chat()`, `analyze_exams()`. Will be extended for multi-provider support.
- `prompts/` -- System prompt text files. Prompt management stays the same.

---

## Phase 1: FastAPI Backend ✅ Done

**Goal**: Replace Streamlit with a FastAPI backend that exposes REST endpoints. The React frontend will call these.

### Endpoints

#### Course management
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/courses` | List all course names. Returns `["Linear Algebra", "Thermodynamics"]`. |
| `POST` | `/api/courses` | Create a new course. Body: `{ "name": "..." }`. Creates the `slides/`, `exams/`, `notes/` subdirectories. |
| `GET` | `/api/courses/{course}/files/{folder}` | List PDF filenames in a course subfolder (`slides` or `exams`). |
| `POST` | `/api/courses/{course}/upload/{folder}` | Upload one or more PDFs to a course subfolder. Multipart form data. |

#### Slide rendering and text extraction
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/slides/{course}/{filename}/page-count` | Return `{ "count": 45 }`. |
| `GET` | `/api/slides/{course}/{filename}/page/{num}/image` | Return the page rendered as a PNG image (`Content-Type: image/png`). Query param `?dpi=150` optional. |
| `GET` | `/api/slides/{course}/{filename}/page/{num}/text` | Return structured text extraction with bounding boxes (see below). |

The `/text` endpoint is critical. It returns every text block on the page with its position, so the frontend can overlay clickable regions. Response shape:

```json
{
  "page": 5,
  "width": 842.0,
  "height": 595.0,
  "blocks": [
    {
      "id": 0,
      "bbox": [72.0, 100.0, 500.0, 130.0],
      "text": "The Fourier Transform is defined as...",
      "lines": [
        {
          "bbox": [72.0, 100.0, 500.0, 115.0],
          "spans": [
            { "text": "The Fourier Transform", "font": "Arial-Bold", "size": 14.0 },
            { "text": " is defined as...", "font": "Arial", "size": 14.0 }
          ]
        }
      ]
    }
  ]
}
```

This comes from PyMuPDF's `page.get_text("dict")`. The `bbox` is `[x0, y0, x1, y1]` in PDF points. The `width` and `height` of the page are included so the frontend can scale the bounding boxes to match the displayed image size.

#### Prompt management
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/prompts` | List prompt filenames. |
| `GET` | `/api/prompts/{name}` | Read prompt content. |
| `PUT` | `/api/prompts/{name}` | Update prompt content. Body: `{ "content": "..." }`. |

#### Notes
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/courses/{course}/notes` | List note filenames. |
| `GET` | `/api/courses/{course}/notes/{filename}` | Read a note file (returns markdown text). |

#### AI / Chat (implemented in Phases 6 & 7 using OpenAI directly; Phase 5 skipped)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send a chat message. Body includes the message, optional image (base64 crop), context metadata (course, PDF, page, selected text). Streams the response back via SSE (Server-Sent Events). |
| `GET` | `/api/providers` | List available LLM providers and their models (e.g., `{ "openai": ["gpt-5.2", "gpt-5-mini", "gpt-5-nano"] }`). |
| `POST` | `/api/generate-notes/{course}/{filename}` | Kick off the batch lecture notes pipeline (background task). |
| `GET` | `/api/generate-notes/{course}/{filename}/status` | Poll progress: `{ "status": "running", "current_slide": 12, "total_slides": 45 }`. |
| `POST` | `/api/generate-principles/{course}/{filename}` | Generate core principles summary for a lecture (background task). |

### Implementation notes

- Use `fastapi` with `uvicorn`.
- Serve the React frontend's build output as static files from the same server (or use a dev proxy during development).
- Use `BackgroundTasks` or a simple in-memory job tracker for the batch pipeline.
- CORS middleware enabled for local development (`localhost:5173` Vite dev server).
- Keep the existing `lib/` module structure. Import and call the same functions, just from FastAPI route handlers instead of Streamlit.

---

## Phase 2: React Frontend -- Core Viewer ✅ Done

**Goal**: A working slide viewer with course management. Functional parity with the current Streamlit app (minus AI chat).

### Tech stack
- **Vite + React + TypeScript** in a `frontend/` directory
- **Tailwind CSS** for styling -- clean, modern look
- **React Query (TanStack Query)** for data fetching / caching
- **React Router** for navigation (if needed, or keep it single-page with state)

### Layout

The app has a single-page layout with three regions:

```
┌──────────────┬──────────────────────────────────┬──────────────────┐
│              │                                  │                  │
│   Sidebar    │        Slide Viewer              │    AI Chat       │
│              │                                  │    (Phase 7)     │
│  - Courses   │  ┌────────────────────────┐      │                  │
│  - PDF list  │  │                        │      │  Collapsible     │
│  - Upload    │  │   Rendered slide page   │      │  panel, hidden   │
│  - Settings  │  │   with text overlay     │      │  by default      │
│              │  │                        │      │                  │
│              │  └────────────────────────┘      │                  │
│              │                                  │                  │
│              │  < Page 5 of 45 >  (navigation)  │                  │
│              │                                  │                  │
└──────────────┴──────────────────────────────────┴──────────────────┘
```

### Sidebar
- **Course selector**: Dropdown or list of courses. "New course" button opens an inline form.
- **PDF file list**: Shows PDFs in the selected course's `slides/` folder. Click to load.
- **Upload area**: Drag-and-drop zone for uploading PDFs. Radio toggle for destination (slides vs exams).
- **Settings**: LLM provider selector, API key inputs (stored in localStorage, sent via headers), model selection.

### Slide viewer
- Displays one page at a time, centered, scaled to fit the available width.
- **Page navigation**: Previous / Next buttons and a page number input. Keyboard arrow keys also work.
- The page image is fetched from `GET /api/slides/.../page/{num}/image`.
- Below or above the slide: the PDF filename and page indicator ("Page 5 of 45").

### Visual style
- Dark mode by default (easy on the eyes during study sessions), with a light mode toggle.
- Clean, minimal UI. The slide is the hero element -- give it maximum space.
- Sidebar is collapsible to maximize slide area.

---

## Phase 3: Text Extraction Overlay ✅ Done

**Goal**: Make text on slides selectable, copyable, and clickable.

### How it works

1. When a page is displayed, the frontend fetches `GET /api/slides/.../page/{num}/text` in parallel with the image.
2. The slide viewer renders the page image inside a container with `position: relative`.
3. For each text block returned by the API, the frontend renders an invisible `<div>` with `position: absolute`, sized and positioned to match the block's bounding box.
4. The bounding box coordinates from the API are in PDF points. The frontend scales them based on the ratio between the PDF page dimensions (`width`, `height` from the API) and the actual displayed image size.

### Interaction behavior

- **Hover**: When the user hovers over a text block, it gets a subtle highlight (semi-transparent background) so they can see it's interactive.
- **Click**: Clicking a text block selects it. The selected block gets a visible highlight (e.g., light blue border). The extracted text appears in a small tooltip or bottom bar, with a "Copy" button and an "Ask AI" button.
- **"Ask AI" flow**: Clicking "Ask AI" on a selected text block opens the chat panel (Phase 7) with the text pre-filled as context. The user just types their question.
- **Multi-select**: The user can click multiple blocks (hold Shift or Ctrl) to select a range of text.
- **Native text selection**: The invisible overlay divs contain the actual text, so the browser's native Ctrl+C / Cmd+C copy works too.

### Edge cases
- Some slides have very little extractable text (e.g., hand-drawn diagrams, scanned slides). The overlay will simply be empty for those regions -- that's fine, the user falls back to the region crop tool (Phase 4).
- Equations extracted via `get_text("dict")` may appear garbled (e.g., "∫f(x)dx" might come out as individual characters with weird spacing). This is a known limitation of PDF text extraction for math. For now, show whatever PyMuPDF returns. Future improvement: integrate Nougat or Marker for LaTeX extraction.

---

## Phase 4: Region Crop Tool ✅ Done

**Goal**: Let the user draw a rectangle on a slide to select a visual region (graph, diagram, figure) and ask the AI about it.

### How it works

1. The slide viewer has a toolbar button or toggle: "Select Region" (icon: crosshair or crop tool).
2. When active, the cursor changes to a crosshair over the slide image.
3. The user clicks and drags to draw a rectangle. A semi-transparent blue overlay shows the selection.
4. On release, the selected region is cropped **client-side**: draw the slide image onto an HTML5 `<canvas>`, use `ctx.getImageData()` or `canvas.toBlob()` to extract just the selected rectangle as a PNG.
5. A small preview of the cropped region appears, with buttons: "Ask AI about this", "Cancel".
6. "Ask AI about this" opens the chat panel with the cropped image attached as context.

### Implementation notes
- Use a library like `react-image-crop` or build a simple drag-to-select with mouse events on a canvas overlay.
- The crop is done entirely in the browser -- no server round-trip needed.
- The cropped image is stored in component state as a `Blob`. When sent to the chat API, it is base64-encoded in the request body.
- Only one region selection at a time. Drawing a new region replaces the previous one.
- The region tool and the text overlay (Phase 3) should coexist: when the region tool is NOT active, text blocks are clickable as usual. When it IS active, text click behavior is suppressed so the drag doesn't conflict.

---

## Phase 5: Multi-Provider LLM Backend ⏭️ Skipped

> **Skipped**: This phase is a cost/flexibility optimization, not a functional requirement. Phases 6 and 7 use the existing OpenAI integration in `lib/ai.py` directly. Multi-provider support (Gemini free tier, Ollama) can be added later as a standalone enhancement without affecting any other phase.

**Goal**: Support multiple LLM providers so the user isn't locked into paying for OpenAI API calls. Gemini's free tier becomes the default for interactive Q&A.

### Providers to support

| Provider | SDK | Cost | Vision support | Use case |
|----------|-----|------|----------------|----------|
| **Google Gemini** | `google-generativeai` | Free tier (rate-limited) | Yes (Gemini 2.0 Flash, Gemini 2.5 Pro) | Default for interactive Q&A. Free. |
| **OpenAI** | `openai` | Paid (per token) | Yes (GPT-4o, GPT-5) | Batch lecture notes generation where quality matters. |
| **Ollama** (optional) | HTTP API (`localhost:11434`) | Free (local) | Some models (LLaVA) | Fully offline, good for text-only follow-ups. |

### Architecture

Create an abstract provider interface in `lib/ai.py` (or a new `lib/providers/` package):

```python
class LLMProvider:
    def stream_chat(self, messages, model) -> Generator[str]:
        ...
    def chat(self, messages, model) -> str:
        ...
    def supports_vision(self) -> bool:
        ...
    def available_models(self) -> list[str]:
        ...
```

Each provider (OpenAI, Gemini, Ollama) implements this interface. The `/api/chat` endpoint accepts a `provider` parameter and delegates to the correct implementation.

### API key handling
- API keys are stored client-side (localStorage) and sent in request headers (`X-OpenAI-Key`, `X-Gemini-Key`).
- The backend never persists API keys -- it reads them from the request headers.
- The `.env` file can also provide default keys for convenience.

### Gemini specifics
- Use the `google-generativeai` Python SDK.
- Gemini's vision API accepts images as `Part` objects (inline bytes or base64).
- The free tier (as of 2025) allows 15 RPM / 1M tokens per day for Flash models -- more than enough for studying.

---

## Phase 6: Batch Lecture Notes Pipeline ✅ Done

**Goal**: Generate deep, professor-quality explanations for every slide in a lecture, one slide at a time. This is a one-time process per lecture PDF. The output is a saved markdown file.

> **Note**: With Phase 5 skipped, this phase uses the existing OpenAI client in `lib/ai.py` directly. OpenAI is the recommended provider for batch generation anyway (quality matters here). The `/api/providers` endpoint is not needed; API key comes from `.env` or request headers.

### Pipeline logic

When the user clicks "Generate Lecture Notes" for a PDF:

1. **Iterate slide by slide** (page 1, 2, 3, ..., N):
   a. Extract text from the current slide using `page.get_text("dict")`.
   b. Render the slide as a PNG image.
   c. Build a prompt that includes:
      - A system prompt (the `default_explainer.txt` or a dedicated `lecture_notes_generator.txt` prompt).
      - A "running context" summary: a condensed version of what has been explained so far (previous slides' key points). This gives the LLM continuity, like a professor who remembers what they said 10 minutes ago.
      - The current slide's extracted text.
      - The current slide image (for diagrams, graphs, equations that don't extract well as text).
      - An instruction like: "Explain this slide in detail as if you are a professor delivering a live lecture. Reference the content of the slide. Build on what was covered in previous slides where relevant."
   d. Send to the LLM (OpenAI recommended for quality) and collect the full response.
   e. Append the response to the lecture notes markdown file.
   f. Update the running context summary (ask the LLM to also produce a 2-3 sentence summary of the key points from this slide, used as context for the next slide).

2. **Output format** -- The resulting markdown file (`courses/<Course>/notes/<filename>_lecture_notes.md`) looks like:

   ```markdown
   # Lecture Notes: Signals and Systems - Lecture 05

   ## Slide 1
   *[Extracted text or title]*

   The lecture begins by introducing the concept of...
   **Key equations:**
   $$X(\omega) = \int_{-\infty}^{\infty} x(t) e^{-j\omega t} dt$$
   ...

   ## Slide 2
   ...
   ```

3. **Progress tracking** -- The backend reports progress via a polling endpoint: `{ "status": "running", "current_slide": 12, "total_slides": 45 }`. The frontend shows a progress bar.

4. **Resumability** -- If the process is interrupted (server restart, error), it should be able to resume from the last completed slide instead of starting over. Check which slides already have notes and skip them.

### Core Principles Generation

After the lecture notes are fully generated (or triggered separately), the user can click **"Generate Core Principles"**. This takes the entire lecture notes markdown and asks the LLM:

> "Based on these complete lecture notes, extract the core principles of this lecture. For each principle, provide:
> 1. The principle/concept name
> 2. A concise but rigorous definition
> 3. The key equation(s) associated with it (in LaTeX)
> 4. Why it matters -- its significance and where it applies
> 5. Common pitfalls or misconceptions
>
> Format as a structured markdown document that a student can use as a quick-reference cheat sheet."

The output is saved as `courses/<Course>/notes/<filename>_core_principles.md`.

This is a **text-only** call (no images needed, since the lecture notes already contain all the information), so it's cheap and can run on Gemini free tier.

### Frontend integration
- A "Generate Lecture Notes" button appears in the slide viewer toolbar when a PDF is selected.
- While generating, a progress bar is shown: "Generating notes... Slide 12 of 45".
- Once complete, the notes are available in a "Lecture Notes" tab alongside the slide viewer.
- A "Generate Core Principles" button appears once lecture notes exist.
- The core principles document is shown in a separate "Core Principles" tab -- a clean, printable reference sheet.

---

## Phase 7: Interactive Q&A Chat Panel

**Goal**: A chat panel where the user asks questions. Context is assembled automatically from pre-generated notes, selected text, and optional image crops.

> **Note**: With Phase 5 skipped, the chat backend uses the OpenAI client directly from `lib/ai.py`. The provider/model selector in the UI is simplified to an OpenAI model dropdown. Multi-provider support can be added later without changing the chat panel's architecture.

### Layout

The chat panel is a collapsible column on the right side of the slide viewer (see the layout diagram in Phase 2). It contains:

1. **Provider/model selector** at the top (compact dropdown).
2. **Context indicator**: Shows what context is currently attached to the next message. Examples:
   - "Slide 5 notes attached" (from pre-generated lecture notes)
   - "Selected text: 'The Fourier Transform is...'" (from clicking a text block)
   - "Cropped region attached" (from the crop tool, with a tiny thumbnail)
   - The user can remove context items by clicking an X on each.
3. **Chat history**: Scrollable list of user/assistant messages with markdown rendering (including LaTeX via KaTeX or MathJax).
4. **Input box**: Text input at the bottom with a send button.

### Context assembly

When the user sends a message, the frontend sends a POST to `/api/chat` with:

```json
{
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "message": "What does this integral represent physically?",
  "context": {
    "course": "Signals and Systems",
    "pdf": "Lecture05.pdf",
    "page": 5,
    "selected_text": "X(ω) = ∫ x(t) e^{-jωt} dt",
    "cropped_image_base64": null,
    "include_slide_notes": true
  },
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

The **backend** assembles the full LLM prompt:
1. System prompt (selected by the user or defaulting to `default_explainer.txt`).
2. If `include_slide_notes` is true and lecture notes exist for this slide, include them as context: "Here are the lecture notes for this slide: ..."
3. The chat history (text only, no old images).
4. The current user message, with:
   - Any selected text quoted inline.
   - Any cropped image attached as a vision content block.
   - If no text and no crop, include the full slide's extracted text as background context.

This means most Q&A is **text-only** (just the lecture notes + selected text + question), which is free/cheap on Gemini. Images are only sent when the user explicitly crops a region.

### Streaming
- The `/api/chat` endpoint streams the response back using **Server-Sent Events (SSE)**.
- The frontend renders the response incrementally as chunks arrive, with live markdown/LaTeX rendering.
- The response is also added to the chat history in session state.

### Chat scoping
- Chat history is scoped to a course + PDF combination. Switching PDFs clears the chat.
- Optionally, chat history could be persisted to disk (in `courses/<Course>/notes/chat_history.json`), but this is a nice-to-have, not essential.

---

## Implementation Order

| Step | Phase | What | Depends on |
|------|-------|------|------------|
| 1 | Phase 1 | FastAPI backend (core endpoints: courses, slides, text extraction) | -- |
| 2 | Phase 2 | React frontend (core viewer: sidebar, slide display, navigation) | Phase 1 |
| 3 | Phase 3 | Text extraction overlay (clickable text blocks on slides) | Phase 1, 2 |
| ~~4~~ | ~~Phase 5~~ | ~~Multi-provider LLM backend (Gemini, OpenAI, Ollama abstraction)~~ | ~~Phase 1~~ |
| 4 | Phase 6 | Batch lecture notes + core principles generation (uses OpenAI directly) | Phase 1 |
| 5 | Phase 7 | Chat panel + interactive Q&A (uses OpenAI directly) | Phase 2, 3, 6 |
| 6 | Phase 4 | Region crop tool (draw-to-select on slides) | Phase 2, 7 |
| 7 | Phase 8 | Docker Compose setup | Phase 1, 2 |

### Why this order
- The backend and frontend core come first because everything depends on them.
- Text overlay comes early because it's the foundation for the "click to ask" interaction.
- ~~Multi-provider LLM is needed before any AI features go live.~~ Phase 5 (multi-provider) is skipped -- all AI features use the existing OpenAI integration in `lib/ai.py` directly.
- Batch lecture notes come next since they produce the context that makes the chat panel most useful.
- Chat panel follows, using pre-generated notes and OpenAI for interactive Q&A.
- Region crop is a polish feature that adds diagram/graph interaction last.
- Docker comes last because it's packaging, not functionality. Adding it too early just slows down the dev loop.

---

## Phase 8: Docker Compose

**Goal**: Make the entire app runnable with a single `docker compose up` command. No Python version issues, no Node setup, no "works on my machine" problems. Added last so it doesn't slow down development, but makes deployment and sharing trivial.

### Services

Two containers, one shared network:

| Service | Base image | Ports | Purpose |
|---------|-----------|-------|---------|
| `backend` | `python:3.12-slim` | `8000` | FastAPI + Uvicorn. Serves the API and the built frontend static files. |
| `frontend` | `node:20-alpine` (build stage only) | -- | Multi-stage build: install deps, run `npm run build`, copy the `dist/` output into the backend image. No separate runtime container needed. |

In production mode, the FastAPI server serves the React build output as static files (via `StaticFiles` mount), so only one container actually runs. The frontend build is a **multi-stage Docker step** inside the backend Dockerfile, or a separate build stage in the compose file.

For **development**, a `docker-compose.dev.yml` override can run both services with hot reload:
- Backend: mount `backend/` as a volume, run with `uvicorn --reload`.
- Frontend: mount `frontend/` as a volume, run `npm run dev` with Vite's HMR, proxy API requests to the backend container.

### Volumes

- `./courses:/app/courses` -- Persist course data (uploaded PDFs, generated notes) outside the container.
- `./prompts:/app/prompts` -- Persist system prompts.

### Environment

- API keys passed via `.env` file (referenced in `docker-compose.yml` with `env_file`).
- Never bake API keys into the image.

### Files to create

```
studytool/
├── Dockerfile              # Multi-stage: build frontend, then run backend serving static files
├── docker-compose.yml      # Production: single service, port 8000
├── docker-compose.dev.yml  # Development: backend + frontend with hot reload
└── .dockerignore           # Exclude node_modules, __pycache__, courses/, .env, .git
```

### Dockerfile structure (high-level)

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Run backend + serve frontend
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./static
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### When to add this
After the core app works end-to-end (Phases 1-7 are functional). Dockerizing a stable app is a 30-minute task. Dockerizing a moving target is a headache.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| PDF processing | PyMuPDF (fitz) |
| LLM providers | `openai`, `google-generativeai`, Ollama HTTP API |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Data fetching | TanStack Query (React Query) |
| LaTeX rendering | KaTeX (via `react-katex` or `remark-math` + `rehype-katex`) |
| Markdown rendering | `react-markdown` with `remark-math` and `rehype-katex` plugins |
| Image cropping | `react-image-crop` or custom canvas implementation |
| Containerization | Docker, Docker Compose (added last, after app is stable) |

## File Structure (Target)

```
studytool/
├── PLAN.md                    # This file
├── Dockerfile                 # Multi-stage: build frontend, run backend (Phase 8)
├── docker-compose.yml         # Production compose (Phase 8)
├── docker-compose.dev.yml     # Dev compose with hot reload (Phase 8)
├── .dockerignore              # Exclude node_modules, __pycache__, etc. (Phase 8)
├── backend/
│   ├── main.py                # FastAPI app entry point
│   ├── requirements.txt       # fastapi, uvicorn, PyMuPDF, openai, google-generativeai, python-dotenv
│   ├── .env                   # API keys
│   └── lib/
│       ├── filesystem.py      # (ported from current lib/)
│       ├── pdf_viewer.py      # (extended with text extraction)
│       ├── ai.py              # Multi-provider LLM abstraction
│       ├── providers/
│       │   ├── openai.py
│       │   ├── gemini.py
│       │   └── ollama.py
│       └── latex.py           # LaTeX delimiter conversion
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/               # API client functions
│       ├── components/
│       │   ├── Sidebar/
│       │   ├── SlideViewer/
│       │   ├── TextOverlay/
│       │   ├── RegionCrop/
│       │   ├── ChatPanel/
│       │   └── common/
│       ├── hooks/             # Custom React hooks
│       ├── stores/            # State management (zustand or context)
│       └── types/             # TypeScript type definitions
├── courses/                   # Runtime data (gitignored)
└── prompts/                   # System prompt files
```
