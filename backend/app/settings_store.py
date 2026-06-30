"""Laufende Einstellungen, persistent in SQLite.

Haelt die aktuellen Werte im Speicher (schneller Zugriff aus dem Poller) und
schreibt Aenderungen in die DB, damit sie einen Neustart ueberleben.

Felder:
- off_delay_s:       Abschaltverzoegerung bei Abwesenheit (Sekunden)
- standby_w:         angenommener Standby-Verbrauch (Watt) fuer die Ersparnis-Rechnung
- price_per_kwh:     Strompreis (CHF/kWh)
- presence_override: None = real erkennen; True/False = Anwesenheit erzwingen (Test/Mock)
- mode:              "presence" | "vacation" | "schedule" (aktiver Betriebsmodus)
- vacation_until:    ISO-Zeitpunkt, bis wann der Ferienmodus laeuft (oder None)
- schedule:          Liste von Zeitfenstern [{days:[...], on_time, off_time}]
"""
from __future__ import annotations

import json

from . import config, db

current: dict = {
    "off_delay_s": config.DEFAULT_OFF_DELAY_S,
    "standby_w": config.DEFAULT_STANDBY_W,
    "price_per_kwh": config.DEFAULT_PRICE_PER_KWH,
    "presence_override": None,
    "mode": "presence",
    "vacation_until": None,
    "schedule": [],
}


def _parse_override(raw: str) -> bool | None:
    if raw in ("true", "1"):
        return True
    if raw in ("false", "0"):
        return False
    return None


def load() -> None:
    """Gespeicherte Werte aus der DB in `current` laden (ueber den Defaults)."""
    stored = db.load_settings()
    if "off_delay_s" in stored:
        current["off_delay_s"] = int(float(stored["off_delay_s"]))
    if "standby_w" in stored:
        current["standby_w"] = float(stored["standby_w"])
    if "price_per_kwh" in stored:
        current["price_per_kwh"] = float(stored["price_per_kwh"])
    if "presence_override" in stored:
        current["presence_override"] = _parse_override(stored["presence_override"])
    if stored.get("mode") in ("presence", "vacation", "schedule"):
        current["mode"] = stored["mode"]
    if "vacation_until" in stored:
        current["vacation_until"] = stored["vacation_until"] or None
        if current["vacation_until"] == "null":
            current["vacation_until"] = None
    if "schedule" in stored:
        try:
            current["schedule"] = json.loads(stored["schedule"])
        except (ValueError, TypeError):
            current["schedule"] = []


def update(
    off_delay_s: int,
    standby_w: float,
    price_per_kwh: float,
    presence_override: bool | None,
    mode: str,
    vacation_until: str | None,
    schedule: list,
) -> dict:
    """Aktualisiert `current` und speichert in die DB."""
    current["off_delay_s"] = off_delay_s
    current["standby_w"] = standby_w
    current["price_per_kwh"] = price_per_kwh
    current["presence_override"] = presence_override
    current["mode"] = mode
    current["vacation_until"] = vacation_until
    current["schedule"] = schedule
    db.save_settings(
        {
            "off_delay_s": str(off_delay_s),
            "standby_w": str(standby_w),
            "price_per_kwh": str(price_per_kwh),
            "presence_override": "null" if presence_override is None
            else ("true" if presence_override else "false"),
            "mode": mode,
            "vacation_until": vacation_until or "null",
            "schedule": json.dumps(schedule),
        }
    )
    return dict(current)


def set_mode(mode: str) -> None:
    """Modus direkt setzen + speichern (z.B. automatische Rueckkehr aus Ferien)."""
    current["mode"] = mode
    db.save_settings({"mode": mode})
