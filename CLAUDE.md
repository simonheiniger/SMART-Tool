# CLAUDE.md — Standby-Tool Website

Kontext für Claude Code. Kurz und aktuell halten.

## Was ist das Projekt

Bedienoberfläche (Website) für ein "Standby-Tool": ein Gerät zwischen Steckdose und
Endgerät, das den Strom automatisch abschaltet, wenn niemand anwesend ist. Die Website
zeigt Energieverbrauch + Ersparnis, schaltet das Gerät manuell und konfiguriert die
automatische Abschaltung.

**Signalkette:** Browser → Website → Raspberry Pi (Backend) → Shelly Gen4 → Endgerät.
Das Frontend spricht **nie** den Shelly direkt an — immer nur das Pi-Backend.

## Stack

- **Backend:** Python 3.12 + FastAPI + SQLite. Läuft auf dem Raspberry Pi.
- **Frontend:** React + Vite + Tailwind CSS + Recharts. UI-Sprache **Deutsch**.
- **Shelly:** Gen4 → RPC-API (`GET /rpc/Switch.Set`, `GET /rpc/Switch.GetStatus`).
- **Anwesenheit:** WLAN-Präsenz (Ping/ARP des Smartphones), konfigurierbare Verzögerung.
- **Dev:** Zuerst gegen `mock-shelly/` (kein echtes Gerät nötig), dann auf Pi portieren.

## Projektstruktur

- `backend/app/` — FastAPI-App
  - `main.py` Routen, `config.py` Einstellungen, `shelly.py` RPC-Client (gekapselt),
    `db.py` SQLite, `presence.py` Anwesenheit, `poller.py` Hintergrund-Polling,
    `schemas.py` Pydantic-Modelle.
- `mock-shelly/mock_shelly.py` — simuliert Gen4-RPC für Dev ohne Hardware.
- `frontend/` — Vite-React-App (Dashboard, Verbrauch, Einstellungen).

## Befehle

```bash
# Backend-Abhängigkeiten (einmalig, venv empfohlen)
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

# Mock-Shelly starten (Port 8001)
python mock-shelly/mock_shelly.py

# Backend starten (Port 8000) — pollt den (Mock-)Shelly
uvicorn app.main:app --reload --app-dir backend --port 8000

# Frontend starten (Port 5173, Vite-Proxy → Backend)
cd frontend && npm install && npm run dev
```

## Konventionen

- Shelly-Zugriff nur über `shelly.py` kapseln — Mock vs. echtes Gerät per Config umschaltbar.
- API-Vertrag siehe `plan.md`. Frontend nutzt nur `/api/*`-Endpunkte.
- UI-Texte auf Deutsch. Code/Kommentare deutsch oder englisch, konsistent pro Datei.

## Status / Plan

Schritt-für-Schritt-Plan + Fortschritt: siehe `plan.md`.
