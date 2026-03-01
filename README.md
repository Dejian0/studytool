# AI Study Helper

A local, open-source AI study tool for engineering students. Uses OpenAI's GPT-4o vision capabilities to analyze lecture slides, past exams, and other course material that contains complex equations, graphs, and diagrams.

## Quick Start

```bash
pip install -r requirements.txt
cp .env.example .env          # then add your OpenAI key
streamlit run app.py
```

## API Key

The app requires an [OpenAI API key](https://platform.openai.com/api-keys).
You can provide it in two ways:

1. **`.env` file (recommended)** -- copy `.env.example` to `.env` and fill in your key.
2. **Sidebar input** -- paste the key directly into the password field when the app is running.

## Project Layout

```
courses/            # One subfolder per subject (created at runtime)
  <CourseName>/
    slides/         # Drop lecture PDFs here
    exams/          # Drop past exam PDFs here
    notes/          # AI-generated notes land here
prompts/            # System prompt .txt files
lib/
  filesystem.py     # Folder/file helpers
  pdf_viewer.py     # PyMuPDF page-to-image rendering
  ai.py             # OpenAI integration (Phase 3)
app.py              # Streamlit entry point
```

## Usage

1. Run the app and create a course via the sidebar.
2. Place PDF slides into `courses/<CourseName>/slides/`.
3. Select a PDF and page range in the left column to view rendered pages.
4. Chat with the AI about the slides in the right column (requires Phase 3).
