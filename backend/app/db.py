"""SQLite-Speicherung der Messwerte.

Eine lokale Datei (kein DB-Server). Tabelle `measurements` haelt einen Zeitverlauf
von Leistung, Schaltzustand und Anwesenheit. Reicht fuer den Prototyp voellig.
"""
from __future__ import annotations

import sqlite3
import time
from contextlib import contextmanager
from typing import Iterator

from . import config

RETENTION_S = 30 * 24 * 3600  # 30 Tage
_last_cleanup: float = 0.0


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(config.DB_PATH, timeout=5.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Legt die Tabellen an, falls noch nicht vorhanden."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS measurements (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                ts      REAL    NOT NULL,
                power_w REAL    NOT NULL,
                on_state INTEGER NOT NULL,
                present  INTEGER NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_measurements_ts ON measurements(ts)")
        # Einstellungen als einfache Schluessel-Wert-Tabelle (Werte als Text).
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)"
        )


def load_settings() -> dict[str, str]:
    """Liest alle gespeicherten Einstellungen als {key: value}."""
    with _connect() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {row["key"]: row["value"] for row in rows}


def save_settings(values: dict[str, str]) -> None:
    """Speichert/aktualisiert Einstellungen (Upsert pro Schluessel)."""
    with _connect() as conn:
        for key, value in values.items():
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )


def insert_measurement(power_w: float, on: bool, present: bool, ts: float | None = None) -> None:
    """Speichert eine einzelne Messung."""
    global _last_cleanup
    ts = ts if ts is not None else time.time()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO measurements (ts, power_w, on_state, present) VALUES (?, ?, ?, ?)",
            (ts, power_w, int(on), int(present)),
        )
        # Nur einmal pro Stunde aufraeumen, nicht bei jedem Insert.
        if ts - _last_cleanup > 3600:
            conn.execute("DELETE FROM measurements WHERE ts < ?", (ts - RETENTION_S,))
            _last_cleanup = ts


def get_history(since_ts: float) -> list[dict]:
    """Liefert alle Messwerte ab `since_ts`, aufsteigend nach Zeit."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT ts, power_w, on_state, present FROM measurements "
            "WHERE ts >= ? ORDER BY ts ASC",
            (since_ts,),
        ).fetchall()
    return [
        {
            "ts": row["ts"],
            "power_w": row["power_w"],
            "on": bool(row["on_state"]),
            "present": bool(row["present"]),
        }
        for row in rows
    ]
