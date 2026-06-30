"""Pydantic-Modelle fuer die API (Vertrag mit dem Frontend)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Betriebsmodus: Anwesenheit (Standard), Ferien (aus bis Datum), Zeitplan.
Mode = Literal["presence", "vacation", "schedule"]

_TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"  # HH:MM (00:00 - 23:59)


class Status(BaseModel):
    on: bool
    power_w: float
    present: bool
    last_update: float | None = None  # Unix-Zeitstempel der letzten Messung
    mode: Mode = "presence"
    device_name: str = "Gerät"


class ToggleRequest(BaseModel):
    on: bool


class Measurement(BaseModel):
    ts: float
    power_w: float
    on: bool
    present: bool


class Savings(BaseModel):
    saved_kwh: float
    saved_chf: float
    consumed_kwh: float
    off_seconds: float


class ScheduleWindow(BaseModel):
    """Ein Zeitfenster, in dem das Geraet eingeschaltet sein soll."""

    days: list[int] = Field(
        default_factory=list,
        description="Wochentage 0=Mo ... 6=So, an denen das Fenster gilt",
    )
    on_time: str = Field(pattern=_TIME_PATTERN, description="Einschaltzeit HH:MM")
    off_time: str = Field(pattern=_TIME_PATTERN, description="Ausschaltzeit HH:MM")


class Settings(BaseModel):
    device_name: str = Field(default="Gerät", min_length=1, max_length=40, description="Anzeigename des Geraets")
    off_delay_s: int = Field(ge=0, description="Abschaltverzoegerung in Sekunden")
    standby_w: float = Field(ge=0, description="Angenommener Standby-Verbrauch in Watt")
    price_per_kwh: float = Field(ge=0, description="Strompreis in CHF/kWh")
    presence_override: bool | None = Field(
        default=None,
        description="Mock-Modus: Anwesenheit erzwingen (true/false) oder null fuer real",
    )
    mode: Mode = Field(default="presence", description="Aktiver Betriebsmodus")
    vacation_until: str | None = Field(
        default=None,
        description="Ferienmodus: ISO-Zeitpunkt, bis wann das Geraet aus bleibt (dann zurueck auf Anwesenheit)",
    )
    schedule: list[ScheduleWindow] = Field(
        default_factory=list, description="Zeitplan-Fenster fuer den Zeitmodus"
    )
