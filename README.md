# Study Tool

A local, open-source study tool for engineering students. Upload lecture slide PDFs, browse them in a clean viewer, and (soon) get AI-powered explanations for every slide, equation, and diagram.

**Status:** Early development -- the core viewer is functional, AI features are coming next.

## Features (working now)

- **Course management** -- create courses, organize PDFs into slides and exams folders
- **PDF upload** -- drag-and-drop or click to upload lecture PDFs
- **Slide viewer** -- browse slides one page at a time with keyboard navigation (arrow keys)
- **Dark/light mode** -- dark by default, toggle with one click
- **Text extraction API** -- every slide's text is extractable with bounding boxes (used by upcoming overlay features)

## Planned features

- Clickable text overlay on slides (select text, copy, ask AI)
- Draw-to-select region crop for diagrams and graphs
- Multi-provider LLM support (Gemini free tier, OpenAI, Ollama)
- One-click deep lecture notes generation (slide-by-slide, professor-quality)
- Core principles / cheat sheet generation
- Interactive Q&A chat panel with context from slides and notes
- Docker Compose packaging

See [PLAN.md](PLAN.md) for the full roadmap.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # add your OpenAI key (optional for now, needed for AI features)
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend proxies API requests to the backend at port 8000.

## Project Layout

```
backend/
  main.py               FastAPI app (REST API)
  requirements.txt      Python dependencies
  lib/
    filesystem.py       Course/file/prompt CRUD
    pdf_viewer.py       PyMuPDF rendering + text extraction
    ai.py               OpenAI helpers (to be extended with multi-provider)
    latex.py            LaTeX delimiter conversion
frontend/
  src/
    api/                API client functions
    components/
      Sidebar/          Course selector, file list, upload zone
      SlideViewer/      Page image + navigation
    hooks/              Custom React hooks (theme)
    types/              TypeScript interfaces
prompts/                System prompt text files
courses/                Runtime data -- uploaded PDFs and generated notes (gitignored)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| PDF processing | PyMuPDF |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Data fetching | TanStack Query |

## License

MIT
