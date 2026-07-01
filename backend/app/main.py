"""FastAPI-App: Bedien-Backend fuer das Standby-Tool.

Schritt 2: Status + manuelles Schalten gegen den (Mock-)Shelly.
Schritt 3: Hintergrund-Polling + SQLite-Speicherung + /api/history.
Schritt 4: Anwesenheit + Auto-Abschaltung + /api/settings + /api/savings.
Schritt 8a: liefert zusaetzlich das gebaute Frontend aus (Single-Port-Betrieb).
"""
from __future__ import annotations

import asyncio
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import db, poller, settings_store, shelly
from .schemas import Measurement, Savings, Settings, Status, ToggleRequest

# Pfad zum gebauten Frontend (frontend/dist), relativ zu dieser Datei.
_FRONTEND_DIST = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)

_RANGE_SECONDS = {"day": 24 * 3600, "week": 7 * 24 * 3600}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Beim Start: DB anlegen, Einstellungen laden und Polling-Task starten.
    db.init_db()
    settings_store.load()
    task = asyncio.create_task(poller.run())
    try:
        yield
    finally:
        # Beim Stoppen: Polling sauber beenden.
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        await shelly.aclose()


app = FastAPI(title="Standby-Tool Backend", version="0.3.0", lifespan=lifespan)

# Im Dev laeuft das Frontend (Vite) auf einem anderen Port -> CORS erlauben.
if os.environ.get("DEV") == "1":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/status", response_model=Status)
async def get_status() -> Status:
    # Aus dem Polling-Cache lesen (keine Extra-Last fuer den Shelly).
    return Status(
        on=poller.latest["on"],
        power_w=poller.latest["power_w"],
        present=poller.latest["present"],
        last_update=poller.latest["last_update"],
        mode=poller.latest["mode"],
        device_name=settings_store.current["device_name"],
    )


@app.post("/api/toggle", response_model=Status)
async def toggle(req: ToggleRequest) -> Status:
    try:
        await shelly.set_switch(req.on)
        raw = await shelly.get_status()
    except shelly.ShellyError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    # Manueller Eingriff hebt die Automatik-Markierung auf.
    poller.note_manual_toggle()
    # Cache sofort aktualisieren, damit die UI nicht bis zum naechsten Poll wartet.
    poller.latest.update(
        on=shelly.parse_on(raw),
        power_w=shelly.parse_power(raw),
        last_update=time.time(),
        reachable=True,
    )
    return Status(
        on=poller.latest["on"],
        power_w=poller.latest["power_w"],
        present=poller.latest["present"],
        last_update=poller.latest["last_update"],
        mode=poller.latest["mode"],
        device_name=settings_store.current["device_name"],
    )


@app.get("/api/history", response_model=list[Measurement])
async def history(range: str = Query("day", pattern="^(day|week)$")) -> list[Measurement]:
    since = time.time() - _RANGE_SECONDS[range]
    return [Measurement(**row) for row in db.get_history(since)]


@app.get("/api/savings", response_model=Savings)
async def savings(range: str = Query("day", pattern="^(day|week)$")) -> Savings:
    since = time.time() - _RANGE_SECONDS[range]
    rows = db.get_history(since)
    standby_w = settings_store.current["standby_w"]
    price = settings_store.current["price_per_kwh"]

    consumed_wh = 0.0   # tatsaechlich verbrauchte Energie (Geraet an)
    off_seconds = 0.0   # Zeit, in der das Geraet komplett aus war

    # Energie = Leistung x Zeit zwischen zwei Messpunkten (Trapez-naeherung).
    for prev, cur in zip(rows, rows[1:]):
        dt = cur["ts"] - prev["ts"]
        if dt <= 0:
            continue
        consumed_wh += 0.5 * (prev["power_w"] + cur["power_w"]) * (dt / 3600.0)
        if not prev["on"]:
            off_seconds += dt

    # Ersparnis ggue. Dauer-Standby: was im Standby waehrend der Aus-Zeit verbraucht worden waere.
    saved_wh = standby_w * (off_seconds / 3600.0)
    return Savings(
        saved_kwh=round(saved_wh / 1000.0, 4),
        saved_chf=round(saved_wh / 1000.0 * price, 4),
        consumed_kwh=round(consumed_wh / 1000.0, 4),
        off_seconds=round(off_seconds, 1),
    )


@app.get("/api/settings", response_model=Settings)
async def get_settings() -> Settings:
    return Settings(**settings_store.current)


@app.put("/api/settings", response_model=Settings)
async def put_settings(new: Settings) -> Settings:
    updated = settings_store.update(
        device_name=new.device_name,
        off_delay_s=new.off_delay_s,
        standby_w=new.standby_w,
        price_per_kwh=new.price_per_kwh,
        presence_override=new.presence_override,
        mode=new.mode,
        vacation_until=new.vacation_until,
        schedule=[w.model_dump() for w in new.schedule],
    )
    poller.note_manual_toggle()
    return Settings(**updated)


# --- Frontend ausliefern (Single-Port-Betrieb auf dem Pi) -----------------
# Muss NACH allen /api-Routen stehen, damit diese Vorrang haben.
# Existiert nur, wenn das Frontend gebaut wurde (cd frontend && npm run build).
if os.path.isdir(_FRONTEND_DIST):
    # html=True liefert index.html fuer "/" und faengt unbekannte Pfade ab.
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get("/")
    async def _no_frontend() -> dict:
        return {
            "hinweis": "Frontend noch nicht gebaut. 'cd frontend && npm run build' "
            "ausfuehren, dann Backend neu starten. API laeuft unter /api, Doku unter /docs.",
        }
