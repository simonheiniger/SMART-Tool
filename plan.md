s# Umsetzungsplan — Website zum Standby-Tool

Schritt-für-Schritt. Jeder Schritt ist lauffähig + testbar, bevor der nächste kommt.
Haken setzen, wenn ein Schritt fertig + getestet ist.

## Architektur (Kurzfassung)

Browser → Website → Raspberry Pi (FastAPI) → Shelly Gen4 → Endgerät.
Frontend spricht nur das Pi-Backend an (`/api/*`), nie den Shelly direkt.

## Backend-API (Vertrag Frontend ↔ Pi)

| Methode | Pfad | Zweck |
|---|---|---|
| GET  | `/api/status`   | `{on, power_w, present, last_update}` |
| POST | `/api/toggle`   | Body `{on: bool}` — manuell schalten |
| GET  | `/api/history?range=day\|week` | Messwerte für Diagramm |
| GET  | `/api/savings?range=...` | Ersparnis (kWh + CHF) ggü. Dauer-Standby |
| GET  | `/api/settings` | aktuelle Konfiguration |
| PUT  | `/api/settings` | Verzögerung, Empfindlichkeit, Standby-Watt, Strompreis |

Shelly Gen4 RPC (vom Backend gekapselt):
- Status: `GET http://<ip>/rpc/Switch.GetStatus?id=0` → `output`, `apower` (W), `aenergy.total` (Wh)
- Schalten: `GET http://<ip>/rpc/Switch.Set?id=0&on=true|false`

## Schritte

- [x] **0 — Gerüst & Doku:** Struktur, CLAUDE.md, plan.md, README.md, .gitignore.
- [x] **1 — Mock-Shelly:** `mock-shelly/mock_shelly.py` bildet Gen4-RPC nach. Dev ohne Hardware.
- [x] **2 — Backend-Grundgerüst:** FastAPI, `config.py`, `shelly.py`, `/api/status` + `/api/toggle`.
- [x] **3 — Polling + SQLite:** `db.py`, `poller.py` (Background), `/api/history`.
- [x] **4 — Anwesenheit + Auto-Abschaltung:** `presence.py`, Verzögerung, `/api/settings`.
- [x] **5 — Frontend + Dashboard:** Vite-React+Tailwind+Recharts, Schalter + Live-Watt.
- [x] **6 — Verbrauchsauswertung:** Recharts-Diagramm + Ersparnis (`/api/savings`).
- [x] **7 — Einstellungen:** Verzögerung, Empfindlichkeit, Standby-Watt, Strompreis.
- [~] **8 — Portierung auf Pi + echten Shelly:**
  - [x] 8a — Backend liefert gebautes Frontend aus (Single-Port). `SETUP_RASPBERRY_PI.md` geschrieben.
  - [ ] 8b — echte Shelly-IP + Anwesenheit physisch testen (braucht Hardware, Pi-Person).
- [ ] **9 — Doku & Präsentation:** README, Screenshots, Ersparnis mit echten Daten belegen.

## Erweiterung: Betriebsmodi (fertig)

Ein aktiver Modus, umschaltbar in den Einstellungen:
- [x] **Anwesenheit** (Standard) — Auto-Aus bei Abwesenheit + Verzögerung.
- [x] **Ferien** — Gerät bleibt aus bis `vacation_until`; danach automatisch zurück auf Anwesenheit.
- [x] **Zeitplan** — mehrere Zeitfenster mit Wochentagen (`days`, `on_time`, `off_time`);
  Gerät an, wenn ein Fenster aktiv ist. Schaltet nur an den Grenzen (manueller Eingriff bis dahin möglich).

Felder in `/api/settings`: `mode`, `vacation_until`, `schedule[]`. Aktiver Modus auch in `/api/status` (`mode`)
und als Badge im Dashboard. Logik in `poller.py` (`_apply_automation`).

## Test je Schritt

- **1–2:** `curl localhost:8001/rpc/Switch.GetStatus?id=0` liefert JSON; `curl localhost:8000/api/status`
  und `POST /api/toggle {"on":true}` schaltet im Mock.
- **3:** Nach Minuten zeigt `/api/history` wachsende Messreihe; SQLite-Datei wächst.
- **4:** Mock-Präsenz auf "abwesend" → nach Verzögerung `/api/status on=false`.
- **5–7:** Browser: Schalter wirkt, Diagramm füllt sich, Einstellungen bleiben nach Reload.
- **8:** Auf Pi end-to-end mit echtem Gerät + Shelly.

## Aufgabenverteilung (aus Projektplan)

- Jeremias (MO): Hardware/Gehäuse.
- Kilian (IT): Shelly-Zugriff + Backend / Pi-Skript.
- Jonathan (WI): Frontend / Website.
- Simon (IT): Datenauswertung Energieverbrauch + Doku.

## Offen für später (kein Blocker)

- PIR-Bewegungsmelder als raumgenaue Ergänzung.
- Shelly-Passwort/Digest-Auth.
- Mehrere Geräte/Shellys.
