# Standby-Tool — Website

Bedienoberfläche für das Standby-Tool: zeigt Energieverbrauch + Ersparnis, schaltet das
angeschlossene Gerät und konfiguriert die automatische Abschaltung bei Abwesenheit.

**Signalkette:** Browser → Website → Raspberry Pi (Backend) → Shelly Gen4 → Endgerät.

## Schnellstart (Entwicklung auf dem Laptop, ohne Hardware)

Es wird ein **Mock-Shelly** verwendet — kein echtes Gerät nötig.

```bash
# 1) Einmalig: virtuelle Umgebung + Abhängigkeiten
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 2) Mock-Shelly starten (Terminal A, Port 8001)
python mock-shelly/mock_shelly.py

# 3) Backend starten (Terminal B, Port 8000)
uvicorn app.main:app --reload --app-dir backend --port 8000
```

Testen:

```bash
curl http://127.0.0.1:8000/api/status
curl -X POST http://127.0.0.1:8000/api/toggle -H 'Content-Type: application/json' -d '{"on":true}'
```

Interaktive API-Doku: http://127.0.0.1:8000/docs

## Frontend (ab Schritt 5)

```bash
cd frontend
npm install
npm run dev      # http://127.0.0.1:5173
```

## Single-Port-Betrieb (Backend liefert das Frontend mit aus)

Statt Vite und Backend getrennt zu starten, kann das Backend die gebaute Website
direkt ausliefern — praktisch fuer den Pi (alles unter einem Port):

```bash
cd frontend && npm run build && cd ..      # erzeugt frontend/dist
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
# Website + API unter http://<host>:8000/
```

## Auf den Raspberry Pi + echten Shelly (Schritt 8)

Ausfuehrliche Anleitung fuer Pi + Shelly: siehe `SETUP_RASPBERRY_PI.md`.


Statt des Mocks zeigt das Backend auf den echten Shelly. Nur Umgebungsvariablen setzen:

```bash
export SHELLY_BASE_URL=http://<shelly-ip>     # z.B. http://192.168.1.50
export PRESENCE_MOCK=0
export PRESENCE_TARGET=<smartphone-ip>        # für WLAN-Anwesenheit
uvicorn app.main:app --app-dir backend --port 8000
```

## Doku

- `plan.md` — Schritt-für-Schritt-Plan + Fortschritt.
- `CLAUDE.md` — Projektkontext (Stack, Befehle, Konventionen).
- `Projektplan_Website_Standby-Tool.docx` — ursprünglicher Projektplan der Gruppe.
