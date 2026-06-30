"""Gekapselter Client fuer einen Shelly der Generation 2-4 (RPC-API).

Das Frontend spricht nie direkt mit dem Shelly. Nur dieses Modul kennt die
RPC-Details. So laesst sich Mock vs. echtes Geraet ueber die Config umschalten.

Relevante Endpunkte (HTTP GET, JSON-Antwort):
- Status:  /rpc/Switch.GetStatus?id=0
- Schalten: /rpc/Switch.Set?id=0&on=true|false
"""
from __future__ import annotations

import httpx

from . import config


class ShellyError(RuntimeError):
    """Shelly nicht erreichbar oder lieferte einen Fehler."""


def _auth() -> httpx.DigestAuth | None:
    if config.SHELLY_USERNAME and config.SHELLY_PASSWORD:
        return httpx.DigestAuth(config.SHELLY_USERNAME, config.SHELLY_PASSWORD)
    return None


async def _get(path: str, params: dict | None = None) -> dict:
    url = f"{config.SHELLY_BASE_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=5.0, auth=_auth()) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise ShellyError(f"Shelly-Aufruf fehlgeschlagen ({url}): {exc}") from exc


async def get_status() -> dict:
    """Liefert den rohen Switch-Status des Shelly.

    Wichtige Felder: output (bool), apower (Watt), aenergy.total (Wh).
    """
    return await _get("/rpc/Switch.GetStatus", {"id": config.SHELLY_ID})


async def set_switch(on: bool) -> dict:
    """Schaltet das Geraet ein (True) oder aus (False)."""
    return await _get(
        "/rpc/Switch.Set",
        {"id": config.SHELLY_ID, "on": "true" if on else "false"},
    )


def parse_power(status: dict) -> float:
    """Holt die aktuelle Leistung in Watt aus einer Status-Antwort."""
    value = status.get("apower", 0.0)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def parse_on(status: dict) -> bool:
    return bool(status.get("output", False))


def parse_energy_wh(status: dict) -> float:
    """Gesamtenergie in Wh (aenergy.total), falls vorhanden."""
    aenergy = status.get("aenergy") or {}
    try:
        return float(aenergy.get("total", 0.0))
    except (TypeError, ValueError):
        return 0.0
