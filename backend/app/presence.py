"""Anwesenheitserkennung per WLAN-Praesenz.

Realer Modus (auf dem Pi): pingt die IP/Hostname des Smartphones. Antwortet es,
gilt jemand als anwesend.

Mock-Modus (Laptop-Dev, PRESENCE_MOCK=1): es wird nicht real gepingt. Die
Anwesenheit kommt aus `presence_override` in den Einstellungen (zum Testen der
automatischen Abschaltung ohne Hardware).

In beiden Modi hat ein gesetzter `override` (True/False) Vorrang -- praktisch zum
Erzwingen "abwesend" waehrend einer Demo.
"""
from __future__ import annotations

import asyncio

from . import config


async def _ping(target: str) -> bool:
    """Einzelner Ping (1 Paket, 1s Timeout). True bei Antwort."""
    if not target:
        return False
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", "-c", "1", "-W", "1", target,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        return await proc.wait() == 0
    except (OSError, asyncio.CancelledError):
        return False


async def is_present(override: bool | None) -> bool:
    """Ermittelt, ob jemand anwesend ist.

    override: None = real ermitteln; True/False = erzwingen.
    """
    if override is not None:
        return override
    if config.PRESENCE_MOCK:
        # Ohne Override im Mock: standardmaessig anwesend.
        return True
    return await _ping(config.PRESENCE_TARGET)
