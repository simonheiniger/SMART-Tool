# Deployment auf dem Raspberry Pi

Backend läuft im Single-Port-Betrieb: es liefert das gebaute Frontend selbst
aus, es ist also nur **Port 8000** nötig.

## Einmalig einrichten

```bash
# Repo auf den Pi holen (Pfad ggf. anpassen)
cd ~ && git clone <repo-url> SMART-Tool && cd SMART-Tool

# Python-venv + Abhängigkeiten
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

# Frontend einmal bauen
cd frontend && npm install && npm run build && cd ..

# Site-Konfig (Shelly-IP, Smartphone-IP)
cp deploy/standby-tool.env.example deploy/standby-tool.env
nano deploy/standby-tool.env
```

## Variante A — manuell starten (ein Terminal)

```bash
./run-pi.sh
```

Baut das Frontend und startet das Backend im Vordergrund. Zum Testen gut,
läuft aber nicht nach Logout / Neustart weiter.

## Variante B — Autostart per systemd (empfohlen)

Startet bei Boot automatisch und startet nach einem Crash neu.

```bash
# Service installieren (Pfade/User in der Datei ggf. vorher anpassen)
sudo cp deploy/standby-tool.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now standby-tool
```

Nützliche Befehle:

```bash
systemctl status standby-tool      # Status
journalctl -u standby-tool -f      # Live-Logs
sudo systemctl restart standby-tool
sudo systemctl stop standby-tool
```

Nach einem Code-Update:

```bash
git pull
cd frontend && npm run build && cd ..   # Frontend neu bauen
sudo systemctl restart standby-tool
```

Aufrufen im Browser (gleiches Netz): `http://<pi-ip>:8000`

## Testen ohne echten Shelly (Mock)

Solange kein echter Shelly angeschlossen ist, kann ein simulierter Shelly als
eigener Dienst laufen. Dann funktioniert die ganze Oberfläche inkl. Schalten.

```bash
# Mock-Dienst installieren + bei Boot mitstarten
sudo cp deploy/standby-mock.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now standby-mock
```

In `deploy/standby-tool.env` auf den Mock zeigen und Backend neu starten:

```
SHELLY_BASE_URL=http://127.0.0.1:8001
```

```bash
sudo systemctl restart standby-tool
```

Sobald der echte Shelly da ist: `SHELLY_BASE_URL` auf dessen IP setzen und den
Mock abschalten:

```bash
sudo systemctl disable --now standby-mock
sudo systemctl restart standby-tool
```

