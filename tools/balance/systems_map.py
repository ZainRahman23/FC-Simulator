"""CPU club → system mapping used by the harness when CPU sides carry a build.

Mirrors the club identity (``club.plan`` in the career layer). If build.py
exposes its own mapping (``build.CLUB_SYSTEM`` / ``build.system_for_plan``)
that wins, so the harness and the app never disagree.
"""
from __future__ import annotations

PLAN_SYSTEM = {
    "High Press": "gegenpress",
    "Possession": "positional",
    "Controlled": "total_football",
    "Balanced": "wing_overload",
    "Counter Attack": "counter_strike",
    "Low Block": "low_block",
    "End-to-End": "inside_forwards",
}
CLUB_BUILDS: dict[str, dict] = {}
CLUB_PLAN: dict[str, str] = {}      # filled from the export (league.export_seasons -> plan)


def system_for_club(club: str) -> str:
    from tools.balance import adapter
    if club in CLUB_BUILDS:
        return CLUB_BUILDS[club]["system_id"]
    b = adapter.build_mod()
    if b is not None:
        m = getattr(b, "CLUB_SYSTEM", None)
        if isinstance(m, dict) and club in m:
            return m[club]
        f = getattr(b, "system_for_plan", None)
        if f and CLUB_PLAN.get(club):
            try:
                return f(CLUB_PLAN[club])
            except Exception:
                pass
    return PLAN_SYSTEM.get(CLUB_PLAN.get(club, "Balanced"), "wing_overload")


def cpu_build(club: str, difficulty: str = "normal", **extra) -> dict:
    return {**CLUB_BUILDS.get(club, {}), "system_id": system_for_club(club), "control": "cpu", "difficulty": difficulty, **extra}
