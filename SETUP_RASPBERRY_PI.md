# Übergabe: Raspberry Pi + Shelly — Setup-Anleitung

Diese Anleitung ist für die Person, die **Raspberry Pi und Shelly** einrichtet.
Das Backend (FastAPI, im Ordner `backend/`) läuft **auf dem Pi** und steuert den Shelly.
Die Website (Frontend) redet nur mit diesem Backend — nie direkt mit dem Shelly.

```
Browser/Handy  →  Website (Frontend)  →  Backend (Pi)  →  Shelly Gen4  →  Endgerät
```

---

## Was du brauchst

- Raspberry Pi mit Raspberry Pi OS, im **gleichen WLAN** wie Shelly und Smartphone.
- Python 3.11 oder neuer (`python3 --version`).
- Shelly Gen4 (z. B. Plug S Gen4) mit **Leistungsmessung** (liefert Watt).
- Den Projektordner (dieses Repo) auf dem Pi.

---

## Schritt 1 — Shelly ins WLAN bringen und IP merken

1. Shelly per Shelly-App ins WLAN einbinden.
2. **Feste IP vergeben** (DHCP-Reservierung im Router) — sonst ändert sich die
   Adresse und das Backend findet den Shelly nicht mehr. Beispiel: `192.168.1.50`.
3. Notieren: die IP des Shelly.

## Schritt 2 — Shelly-API testen (wichtig, bevor das Backend dran kommt)

Vom Pi aus prüfen, dass die RPC-API antwortet (`<ip>` ersetzen):

```bash
# Status lesen — muss u.a. "apower" (Watt) und "output" (an/aus) liefern:
curl "http://<ip>/rpc/Switch.GetStatus?id=0"

# Einschalten:
curl "http://<ip>/rpc/Switch.Set?id=0&on=true"
# Ausschalten:
curl "http://<ip>/rpc/Switch.Set?id=0&on=false"
```

**Erfolg sieht so aus** (Beispiel): das erste Kommando gibt JSON mit `"apower": 0`,
`"output": false`, `"aenergy": {"total": ...}` zurück. Schaltbefehle klicken den Shelly
hörbar.

> Falls am Shelly ein **Passwort** gesetzt ist: Benutzer/Passwort notieren
> (kommt unten in die Konfiguration). Falls der Shelly **nicht Gen2-4** ist
> (alte Gen1 nutzt `/relay/0` statt `/rpc/...`), melden — dann muss `shelly.py`
> angepasst werden.

## Schritt 3 — Backend auf dem Pi starten

```bash
cd <projektordner>
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Dann mit den richtigen Werten starten (Umgebungsvariablen ersetzen):

```bash
export SHELLY_BASE_URL=http://192.168.1.50     # IP des Shelly aus Schritt 1
export PRESENCE_MOCK=0                          # echte Anwesenheitserkennung an
export PRESENCE_TARGET=192.168.1.30            # IP des Smartphones (siehe Schritt 4)
# nur falls Shelly ein Passwort hat:
# export SHELLY_USERNAME=admin
# export SHELLY_PASSWORD=geheim

python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` ist wichtig, damit Handy/Laptop im WLAN das Backend erreichen.

Test vom Pi:

```bash
curl http://127.0.0.1:8000/api/status
curl -X POST http://127.0.0.1:8000/api/toggle -H 'Content-Type: application/json' -d '{"on":true}'
```

## Schritt 3b — Website mit ausliefern (ein Port, empfohlen)

Das Backend kann die fertige Website gleich mitliefern — dann läuft **alles über
`http://<pi-ip>:8000`**, kein separater Web-Server nötig. Dazu das Frontend einmal bauen:

```bash
cd frontend
npm install
npm run build      # erzeugt frontend/dist
cd ..
```

Danach das Backend (wie in Schritt 3) starten — es findet `frontend/dist`
automatisch und liefert die Website unter `http://<pi-ip>:8000/` aus.
Vom Handy/Laptop im WLAN einfach diese Adresse öffnen.

> Ohne `npm run build` läuft die API trotzdem (unter `/api`, Doku `/docs`);
> es wird nur die Website nicht ausgeliefert. `npm` braucht Node.js auf dem Pi.

## Schritt 4 — Anwesenheitserkennung (WLAN-Präsenz)

Das Backend pingt das Smartphone. Antwortet es, gilt „jemand anwesend".

- Smartphone-IP im Router **fest reservieren** (sonst wechselt sie).
- Diese IP als `PRESENCE_TARGET` setzen (siehe Schritt 3).
- `PRESENCE_MOCK=0` aktiviert den echten Ping.

**Achtung / typische Stolperfallen:**
- Manche Handys **schlafen das WLAN ein** und antworten dann nicht auf Ping →
  wirken „abwesend". Bei iPhones/Androiden ggf. „WLAN im Ruhezustand aktiv lassen".
- Manche Geräte **blocken Ping (ICMP)**. Dann vorher testen: `ping <handy-ip>` vom Pi.
- WLAN-Reichweite ≠ Raum: das Handy gilt als anwesend, solange es im WLAN ist.

Die **Abschaltverzögerung** (z. B. 2–5 min) stellt man über die Website ein
(Einstellungen) — verhindert Abschalten bei kurzem Rausgehen.

## Schritt 5 — Ohne Hardware testen (optional)

Solange der echte Shelly fehlt, kann das Backend gegen einen **Mock** laufen:

```bash
# Terminal A: simulierter Shelly
python mock-shelly/mock_shelly.py
# Terminal B: Backend zeigt auf den Mock
export SHELLY_BASE_URL=http://127.0.0.1:8001 PRESENCE_MOCK=1
python -m uvicorn app.main:app --app-dir backend --port 8000
```

---

## Damit es funktioniert — die 5 kritischen Punkte

1. **Shelly hat feste IP** und ist vom Pi per `curl http://<ip>/rpc/Switch.GetStatus?id=0` erreichbar.
2. **Shelly ist Gen2-4** (RPC-API `/rpc/...`). Sonst Bescheid geben.
3. Backend mit **richtiger `SHELLY_BASE_URL`** und **`--host 0.0.0.0`** gestartet.
4. Für Anwesenheit: **`PRESENCE_MOCK=0`** + **Smartphone-IP** als `PRESENCE_TARGET`,
   Handy per `ping` vom Pi erreichbar.
5. Pi, Shelly und Smartphone im **selben WLAN**.

## Was das Backend nach außen anbietet (für die Website)

| Methode | Pfad | Zweck |
|---|---|---|
| GET  | `/api/status`   | aktueller Zustand (an/aus, Watt, Anwesenheit) |
| POST | `/api/toggle`   | manuell schalten (`{"on": true/false}`) |
| GET  | `/api/history`  | Verbrauchsverlauf |
| GET  | `/api/savings`  | berechnete Ersparnis |
| GET/PUT | `/api/settings` | Verzögerung, Standby-Watt, Strompreis |

Interaktive Test-Oberfläche (vom Pi): `http://<pi-ip>:8000/docs`

## Wo später die Daten / Konfiguration liegen

- Messwerte: SQLite-Datei `backend/data.db` (entsteht automatisch).
- Konfiguration: über die Website (Einstellungen) oder Umgebungsvariablen
  (siehe `backend/app/config.py`).
