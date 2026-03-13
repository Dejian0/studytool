# Study Tool

AI can do a lot of things for you. But it cannot study for you.

This is the tool I use to study lecture slides and scripts. 
A local, open-source study tool for engineering students. Upload lecture slide PDFs, get AI slide-by-slide lecture notes, and ask questions about any equation, diagram, or concept -- all from a single interface.

## Features

- **Course management** -- create courses, organize PDFs into slides and exams folders
- **PDF upload** -- drag-and-drop or click to upload lecture PDFs
- **Slide viewer** -- browse slides one page at a time with keyboard navigation
- **Text overlay** -- selectable, copyable text on every slide with hover highlights
- **Region crop** -- draw a rectangle around any diagram or graph to ask the AI about it
- **Lecture notes generation** -- one-click deep, slide-by-slide notes with progress tracking
- **Core principles generation** -- auto-generated cheat sheets from your lecture notes
- **Interactive Q&A chat** -- ask questions with automatic context from notes, selected text, or cropped regions
- **Multi-provider LLM support** -- OpenAI and Google Gemini, with per-request model selection
- **Customizable system prompts** -- edit the AI's behavior from the settings panel
- **Dark/light mode** -- dark by default, toggle with one click

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+

### One command

```bash
./dev.sh
```

This creates a Python virtualenv, installs all dependencies, and starts both the backend and frontend. On subsequent runs it skips straight to launching.

Open [http://localhost:5173](http://localhost:5173) once both servers are up.

For AI features, copy the env template and add your keys:

```bash
cp backend/.env.example backend/.env
```

### Manual startup

If you prefer to run the servers separately:

```bash
# Terminal 1 -- backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 -- frontend
cd frontend
npm install
npm run dev
```

## Project Layout

```
dev.sh                        Single-command startup script
backend/
  main.py                     FastAPI app (REST API)
  requirements.txt            Python dependencies
  .env.example                API key template
  lib/
    ai.py                     LLM message building and streaming
    filesystem.py             Course/file/prompt/note CRUD
    pdf_viewer.py             PyMuPDF rendering + text extraction
    notes_pipeline.py         Batch lecture notes and core principles generation
    latex.py                  LaTeX delimiter conversion
    providers/
      openai_provider.py      OpenAI chat/vision provider
      gemini_provider.py      Google Gemini chat/vision provider
frontend/
  src/
    api/                      API client functions (courses, slides, chat, notes, prompts)
    components/
      Sidebar/                Course tree, file list, upload zone
      SlideViewer/            Page image + navigation
      TextOverlay/            Clickable text blocks on slides
      RegionCrop/             Draw-to-select crop tool
      ChatPanel/              Streaming Q&A chat with context
      NotesPanel/             Lecture notes and core principles viewer
      SlideNotesPane/         Per-slide notes display
      SettingsModal/          API keys, model selection, prompt editing
      common/                 Shared components (markdown renderer, model select, resize handle)
    hooks/                    Custom React hooks (theme)
    types/                    TypeScript interfaces
    utils/                    Helpers (slide notes parser)
prompts/                      System prompt text files
courses/                      Runtime data -- uploaded PDFs and generated notes (gitignored)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| PDF processing | PyMuPDF |
| LLM providers | OpenAI, Google Gemini |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Data fetching | TanStack Query |
| Markdown / LaTeX | react-markdown, remark-math, rehype-katex |

## License

MIT
