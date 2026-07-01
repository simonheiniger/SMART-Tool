"""Hintergrund-Polling des Shelly + automatische Abschaltung.

Fragt den Shelly im festen Intervall ab, ermittelt die Anwesenheit, haelt den
letzten Zustand im Speicher (damit /api/status nicht bei jeder Anfrage den Shelly
belastet) und schreibt jede Messung in die SQLite-Datenbank.

Automatik:
- Niemand anwesend laenger als die konfigurierte Verzoegerung -> Geraet ausschalten.
- Person kehrt zurueck und das Geraet wurde automatisch ausgeschaltet -> wieder einschalten.
- Ein manueller Eingriff (ueber /api/toggle) hebt die Automatik-Markierung auf,
  damit die Nutzerentscheidung nicht ueberschrieben wird.
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime

from . import config, db, presence, settings_store, shelly

# Letzter bekannter Zustand (von /api/status gelesen).
latest: dict = {
    "on": False,
    "power_w": 0.0,
    "present": True,
    "last_update": None,
    "reachable": False,
    "mode": "presence",
}

# Automatik-Zustand.
_absent_since: float | None = None       # seit wann niemand anwesend ist
_auto_off: bool = False                   # True, wenn die Anwesenheits-Automatik abgeschaltet hat
_last_schedule_desired: bool | None = None  # zuletzt vom Zeitplan gewuenschter Zustand


def note_manual_toggle() -> None:
    """Nach manuellem Schalten: Automatik-Markierungen zuruecksetzen."""
    global _auto_off, _absent_since, _last_schedule_desired
    _auto_off = False
    _absent_since = None
    # Zeitplan darf nach manuellem Eingriff erst an der naechsten Grenze wieder schalten.
    _last_schedule_desired = None


def _minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _window_active(now_dt: datetime, window: dict) -> bool:
    """Ist das Zeitfenster jetzt aktiv (richtiger Wochentag + Uhrzeit)?"""
    if now_dt.weekday() not in window.get("days", []):
        return False
    t = now_dt.hour * 60 + now_dt.minute
    start = _minutes(window["on_time"])
    end = _minutes(window["off_time"])
    if start <= end:
        return start <= t < end
    # Fenster ueber Mitternacht (z.B. 22:00-06:00).
    return t >= start or t < end


def _schedule_desired(now_dt: datetime) -> bool:
    """Soll das Geraet laut Zeitplan jetzt an sein? (an, wenn irgendein Fenster aktiv)."""
    for window in settings_store.current["schedule"]:
        if _window_active(now_dt, window):
            return True
    return False


async def _set(on: bool, fallback: bool) -> tuple[bool, bool]:
    """Hilfsfunktion: schalten, bei Fehler den alten Zustand behalten.

    Returnt (neuer_zustand, erfolgreich).
    """
    try:
        await shelly.set_switch(on)
        return on, True
    except shelly.ShellyError:
        return fallback, False


async def _apply_automation(on: bool, present: bool, now: float) -> bool:
    """Wendet je nach Modus die Automatik an. Gibt den (evtl. geaenderten) on-Zustand zurueck."""
    global _absent_since, _auto_off, _last_schedule_desired
    mode = settings_store.current["mode"]

    # --- Ferienmodus: Geraet bleibt aus, bis das Enddatum erreicht ist. ----
    if mode == "vacation":
        until = settings_store.current.get("vacation_until")
        ended = False
        if until:
            try:
                ended = datetime.now() >= datetime.fromisoformat(until)
            except ValueError:
                ended = False
        if not ended:
            if on:
                new_on, _ = await _set(False, on)
                return new_on
            return on
        # Ferien vorbei -> zurueck auf Anwesenheit und normal weiter.
        settings_store.set_mode("presence")
        mode = "presence"

    # --- Zeitmodus: Zustand folgt dem Zeitplan (nur an den Grenzen schalten). --
    if mode == "schedule":
        desired = _schedule_desired(datetime.now())
        if desired != _last_schedule_desired:
            _last_schedule_desired = desired
            new_on, _ = await _set(desired, on)
            return new_on
        return on

    # --- Anwesenheitsmodus (Standard) --------------------------------------
    delay = settings_store.current["off_delay_s"]
    if not present:
        if _absent_since is None:
            _absent_since = now
        if on and (now - _absent_since) >= delay:
            # Automatisches Abschalten.
            new_on, ok = await _set(False, on)
            if ok:
                _auto_off = True
            return new_on
    else:
        _absent_since = None
        if _auto_off and not on:
            # Automatisches Wiedereinschalten.
            new_on, ok = await _set(True, on)
            if ok:
                _auto_off = False
            return new_on
    return on


async def _tick() -> None:
    """Eine Runde: Shelly lesen, Anwesenheit pruefen, Automatik, speichern."""
    try:
        raw = await shelly.get_status()
    except shelly.ShellyError:
        latest["reachable"] = False
        return

    on = shelly.parse_on(raw)
    now = time.time()
    present = await presence.is_present(settings_store.current["presence_override"])

    on = await _apply_automation(on, present, now)
    power = shelly.parse_power(raw) if on else 0.0

    latest.update(
        on=on,
        power_w=power,
        present=present,
        last_update=now,
        reachable=True,
        mode=settings_store.current["mode"],
    )
    db.insert_measurement(power_w=power, on=on, present=present, ts=now)


async def run() -> None:
    """Endlosschleife: pollt bis der Task abgebrochen wird."""
    db.init_db()
    settings_store.load()
    while True:
        await _tick()
        await asyncio.sleep(config.POLL_INTERVAL_S)
