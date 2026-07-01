#!/usr/bin/env bash
# Dev-Start (Laptop): Mock-Shelly + Backend + Frontend (Vite) in EINEM Terminal.
# Ctrl+C beendet alle drei Prozesse.
#
#   ./run-dev.sh
#
# Danach im Browser: http://localhost:5173  (Vite, mit Hot-Reload)
set -euo pipefail
cd "$(dirname "$0")"

# venv aktivieren, falls vorhanden (sonst System-Python).
if [ -d .venv ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

# Beim Beenden (Ctrl+C / Exit) die ganze Prozessgruppe abräumen.
trap 'echo; echo "Stoppe alle Prozesse…"; kill 0' INT TERM EXIT

echo "Mock-Shelly  → http://127.0.0.1:8001"
python mock-shelly/mock_shelly.py &

echo "Backend      → http://127.0.0.1:8000"
DEV=1 uvicorn app.main:app --reload --app-dir backend --port 8000 &

echo "Frontend     → http://localhost:5173  (hier öffnen)"
( cd frontend && npm run dev ) &

# Auf alle Hintergrundprozesse warten.
wait
