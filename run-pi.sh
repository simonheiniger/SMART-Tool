#!/usr/bin/env bash
# Pi-Start (manuell, ein Terminal): Frontend bauen + Backend im Single-Port-Betrieb.
# Backend liefert das gebaute Frontend selbst aus → nur Port 8000 nötig.
#
#   ./run-pi.sh
#
# Danach im Browser (im selben Netz): http://<pi-ip>:8000
# Für Autostart bei Boot stattdessen den systemd-Service nutzen (siehe deploy/).
set -euo pipefail
cd "$(dirname "$0")"

if [ -d .venv ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

# Site-spezifische Umgebung laden (echter Shelly, Anwesenheits-Ziel …).
if [ -f deploy/standby-tool.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/standby-tool.env
  set +a
fi

echo "→ Frontend bauen…"
( cd frontend && npm install && npm run build )

echo "→ Backend auf http://0.0.0.0:8000"
exec uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
