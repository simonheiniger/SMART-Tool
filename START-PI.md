# Standby-Tool auf dem Pi — Kurzanleitung

Alles Nötige zum Starten, Bedienen und Anpassen. Pfad auf dem Pi: `~/SMART-Tool`.

## 1. Pi starten

**Nichts zu tun.** Backend + Mock laufen als systemd-Dienste und starten bei
jedem Boot automatisch. Pi einschalten → warten → läuft.

Aufrufen im Browser (Handy/Laptop im selben Netz):

```
http://<pi-ip>:8000
```

Pi-IP herausfinden (am Pi): `hostname -I`

## 2. Dienste prüfen / steuern — 📍 Pi

```bash
systemctl status standby-tool standby-mock   # läuft alles? (q zum Verlassen)
sudo systemctl restart standby-tool          # Backend neu starten
journalctl -u standby-tool -f                # Live-Logs (Ctrl+C beendet Ansicht)
```

Beide sollen `active (running)` (grün) sein.

## 3. Skripte (nur manuell/zum Testen — normalerweise NICHT nötig)

| Skript | Wo | Zweck |
|--------|----|-------|
| `./run-pi.sh`  | Pi     | Frontend bauen + Backend im Vordergrund (Terminal offen lassen). Testen ohne systemd. |
| `./run-dev.sh` | Laptop | Mock + Backend + Frontend mit Hot-Reload, alles in einem Terminal. Nur Entwicklung. |

Im Normalbetrieb übernehmen die systemd-Dienste alles — Skripte braucht man nicht.

## 4. Was anpassen — und wo

Alle Einstellungen des Betriebs stehen in **einer** Datei:

📍 Pi: `~/SMART-Tool/deploy/standby-tool.env`  (bearbeiten mit `nano`, danach
`sudo systemctl restart standby-tool`)

### a) Test ohne echten Shelly (Mock) — aktueller Zustand
```
SHELLY_BASE_URL=http://127.0.0.1:8001
SHELLY_ID=0
PRESENCE_MOCK=1
```
Anwesenheit stellst du dann in der **Einstellungen**-Seite um (kein Handy nötig).

### b) Mit echtem Shelly + automatischer Anwesenheit
```
SHELLY_BASE_URL=http://<shelly-ip>
SHELLY_ID=0
PRESENCE_MOCK=0
PRESENCE_TARGET=<handy-ip>
```
Dann Mock abschalten:
```bash
sudo systemctl disable --now standby-mock
sudo systemctl restart standby-tool
```

### Weitere Einstellungen (über die Website, nicht die Datei)
Modus (Anwesenheit / Ferien / Zeitplan), Abschaltverzögerung, Gerätename,
Standby-Watt, Strompreis → **Einstellungen**-Seite im Browser.

## 5. Netzwerk-Setup (wichtig fürs Auto-Abschalten)

Das WLAN, an dem Pi + Shelly hängen, muss **bleiben**, wenn du weggehst.
Bewährt: dein Handy als **Dauer-Hotspot** (= „Zuhause", bleibt an), und das
Handy **eines Kollegen** als Presence-Ziel (`PRESENCE_TARGET`).

Vor dem Scharfschalten testen, ob der Pi das Ziel-Handy erreicht:
```bash
ping <handy-ip>
```
Kein Ping → Hotspot hat „Client-Isolation" an → in den Hotspot-Einstellungen aus.

## 6. Nach einer Code-Änderung (Update)

```bash
cd ~/SMART-Tool
git pull
cd frontend && npm run build && cd ..     # nur wenn Frontend geändert wurde
sudo systemctl restart standby-tool
```
