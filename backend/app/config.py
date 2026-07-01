"""Zentrale Konfiguration des Backends.

Werte koennen ueber Umgebungsvariablen ueberschrieben werden, damit der Wechsel
von Mock (Laptop) auf echten Shelly (Pi) nur eine Env-Aenderung ist.
"""
from __future__ import annotations

import os


def _env(key: str, default: str) -> str:
    return os.environ.get(key, default)


def _env_float(key: str, default: float) -> float:
    try:
        return float(os.environ.get(key, default))
    except (TypeError, ValueError):
        return default


def _env_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, default))
    except (TypeError, ValueError):
        return default


# --- Shelly ---------------------------------------------------------------
# Beim Entwickeln auf dem Laptop zeigt die URL auf den Mock (Port 8001).
# Auf dem Pi: z.B. SHELLY_BASE_URL=http://192.168.1.50
SHELLY_BASE_URL: str = _env("SHELLY_BASE_URL", "http://127.0.0.1:8001")
SHELLY_ID: int = _env_int("SHELLY_ID", 0)
SHELLY_USERNAME: str | None = os.environ.get("SHELLY_USERNAME") or None
SHELLY_PASSWORD: str | None = os.environ.get("SHELLY_PASSWORD") or None

# --- Polling / Datenbank --------------------------------------------------
POLL_INTERVAL_S: float = _env_float("POLL_INTERVAL_S", 5.0)
DB_PATH: str = _env("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "data.db"))

# --- Anwesenheit ----------------------------------------------------------
# Mock-Modus: Anwesenheit wird nicht real per Netzwerk geprueft, sondern
# ueber /api/settings simuliert (fuer Laptop-Dev). Auf dem Pi: PRESENCE_MOCK=0.
PRESENCE_MOCK: bool = _env("PRESENCE_MOCK", "1") == "1"
# IP oder Hostname des Smartphones, gegen das gepingt wird (realer Modus).
PRESENCE_TARGET: str = _env("PRESENCE_TARGET", "")

# --- Standardwerte fuer Einstellungen (in DB ueberschreibbar) -------------
DEFAULT_OFF_DELAY_S: int = _env_int("OFF_DELAY_S", 180)       # Abschaltverzoegerung
DEFAULT_STANDBY_W: float = _env_float("STANDBY_W", 5.0)       # angenommener Standby-Verbrauch
DEFAULT_PRICE_PER_KWH: float = _env_float("PRICE_PER_KWH", 0.30)  # CHF/kWh
DEFAULT_DEVICE_NAME: str = _env("DEVICE_NAME", "Gerät")      # Anzeigename des Endgeraets
