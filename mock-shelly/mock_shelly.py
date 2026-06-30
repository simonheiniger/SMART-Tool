"""Mock eines Shelly Gen4 (RPC-API) fuer die Entwicklung ohne Hardware.

Bildet die wichtigsten Endpunkte nach:
- GET /rpc/Switch.GetStatus?id=0   -> {output, apower, voltage, current, aenergy:{total}}
- GET /rpc/Switch.Set?id=0&on=...  -> schaltet und liefert {was_on}
- GET /rpc/Shelly.GetDeviceInfo    -> minimal, fuer Erreichbarkeitstest

Verhalten:
- output=true  -> apower schwankt um eine Nennlast (mit Rauschen).
- output=false -> apower = Standby-Verbrauch (klein, > 0), simuliert "Standby".
- aenergy.total laeuft mit (Wh), basierend auf der bisher verbrauchten Energie.

Start:  python mock-shelly/mock_shelly.py   (Port 8001)
"""
from __future__ import annotations

import random
import time

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="Mock Shelly Gen4")

# Nennlast des simulierten Geraets im Betrieb (Watt) und Standby-Last (Watt).
NENNLAST_W = 60.0
STANDBY_W = 5.0

state = {
    "output": False,
    "energy_wh": 0.0,        # akkumulierte Energie
    "last_tick": time.time(),
}


def _current_power() -> float:
    if state["output"]:
        return round(NENNLAST_W + random.uniform(-4.0, 4.0), 1)
    # Geraet "aus" am Shelly -> kein Verbrauch. Standby waere Last hinter dem Tool.
    return 0.0


def _accumulate_energy() -> None:
    now = time.time()
    elapsed = now - state["last_tick"]
    state["last_tick"] = now
    # Energie = Leistung(W) * Zeit(h) -> Wh
    state["energy_wh"] += _current_power() * (elapsed / 3600.0)


@app.get("/rpc/Switch.GetStatus")
def switch_get_status(id: int = 0) -> JSONResponse:
    _accumulate_energy()
    power = _current_power()
    return JSONResponse(
        {
            "id": id,
            "output": state["output"],
            "apower": power,
            "voltage": round(230.0 + random.uniform(-2, 2), 1),
            "current": round(power / 230.0, 3),
            "aenergy": {"total": round(state["energy_wh"], 3)},
            "temperature": {"tC": 32.0},
        }
    )


@app.get("/rpc/Switch.Set")
def switch_set(id: int = 0, on: str = "false") -> JSONResponse:
    _accumulate_energy()
    was_on = state["output"]
    state["output"] = str(on).lower() in ("true", "1", "yes", "on")
    return JSONResponse({"was_on": was_on})


@app.get("/rpc/Shelly.GetDeviceInfo")
def device_info() -> JSONResponse:
    return JSONResponse(
        {"id": "mock-shellyplug", "model": "MockPlugS-Gen4", "gen": 4, "app": "PlugS"}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
