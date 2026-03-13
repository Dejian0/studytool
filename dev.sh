#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# -- Prefixed output helpers ------------------------------------------------

backend_log()  { sed 's/^/[backend]  /' ; }
frontend_log() { sed 's/^/[frontend] /' ; }

# -- Prerequisite checks ----------------------------------------------------

missing=()
command -v python3 >/dev/null || missing+=("python3")
command -v node    >/dev/null || missing+=("node")
command -v npm     >/dev/null || missing+=("npm")

if [ ${#missing[@]} -gt 0 ]; then
    echo "Missing required tools: ${missing[*]}"
    echo "Install them and try again."
    exit 1
fi

# -- Python virtualenv + backend deps --------------------------------------

if [ ! -d "$ROOT/.venv" ]; then
    echo "Creating Python virtualenv in .venv ..."
    python3 -m venv "$ROOT/.venv"
fi

source "$ROOT/.venv/bin/activate"

if [ ! -f "$ROOT/.venv/.deps_installed" ] || \
   [ "$ROOT/backend/requirements.txt" -nt "$ROOT/.venv/.deps_installed" ]; then
    echo "Installing backend dependencies ..."
    pip install -q -r "$ROOT/backend/requirements.txt"
    touch "$ROOT/.venv/.deps_installed"
fi

# -- Frontend deps ----------------------------------------------------------

if [ ! -d "$ROOT/frontend/node_modules" ]; then
    echo "Installing frontend dependencies ..."
    npm install --prefix "$ROOT/frontend"
fi

# -- .env hint --------------------------------------------------------------

if [ ! -f "$ROOT/backend/.env" ]; then
    echo ""
    echo "Note: No backend/.env file found."
    echo "AI features require API keys. Copy the example when ready:"
    echo "  cp backend/.env.example backend/.env"
    echo ""
fi

# -- Launch both processes --------------------------------------------------

cleanup() {
    echo ""
    echo "Shutting down ..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM

echo ""
echo "Starting backend  → http://localhost:8000"
echo "Starting frontend → http://localhost:5173"
echo ""

cd "$ROOT/backend"
uvicorn main:app --reload --port 8000 2>&1 | backend_log &
BACKEND_PID=$!

cd "$ROOT/frontend"
npx vite 2>&1 | frontend_log &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
