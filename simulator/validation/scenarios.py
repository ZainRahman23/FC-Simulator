"""Scenario registry for FC Simulator v0.7 statistical validation.

Every scenario is a pure declarative description. Seeds are derived
deterministically from (scenario_id, match_index) so any experiment is
reproducible from its name alone. No scenario mutates engine logic.

Teams are the bundled mirrored demo XI (identical personnel both sides)
unless a transform says otherwise, so tactical/quality effects are isolated
from roster noise. Coach AI is frozen for measurement cleanliness.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
PLANS = {
    "ultra": ROOT / "plans" / "ultra_low_block_4141.json",
    "controlled": ROOT / "plans" / "controlled_cagey_4141.json",
    "wide_attack": ROOT / "plans" / "wide_attack_433.json",
    "aggressive": ROOT / "plans" / "end_to_end.json",
    "balanced": None,   # engine defaults: TeamTactics() + default_instructions per slot
}

VALIDATION_SEED_BASE = "fcsim-v0.7-validation-1"


def scenario_seed(scenario_id: str, index: int) -> int:
    key = f"{VALIDATION_SEED_BASE}|{scenario_id}|{index}"
    return int.from_bytes(hashlib.blake2b(key.encode(), digest_size=6).digest(), "big") % (2**31 - 1)


# ── attribute transforms (real attributes only; OVR untouched) ───────────────
def shift_all(delta: float, outfield_only: bool = False) -> Callable:
    def fn(team):
        for slot, p in list(team.lineup.items()):
            if outfield_only and slot == "GK":
                continue
            attrs = {k: max(1.0, min(99.0, float(v) + delta)) for k, v in p.attributes.items()}
            team.lineup[slot] = replace(p, attributes=attrs)
    return fn


def shift_attrs(names: tuple[str, ...], delta: float, slots: str = "outfield") -> Callable:
    """slots: 'outfield' | 'gk' | 'all'"""
    def fn(team):
        for slot, p in list(team.lineup.items()):
            if slots == "outfield" and slot == "GK":
                continue
            if slots == "gk" and slot != "GK":
                continue
            attrs = dict(p.attributes)
            for n in names:
                if n in attrs:
                    attrs[n] = max(1.0, min(99.0, float(attrs[n]) + delta))
            team.lineup[slot] = replace(p, attributes=attrs)
    return fn


def set_attr(name: str, value: float, slots: str = "outfield") -> Callable:
    def fn(team):
        for slot, p in list(team.lineup.items()):
            if slots == "outfield" and slot == "GK":
                continue
            if slots == "gk" and slot != "GK":
                continue
            attrs = dict(p.attributes)
            if name in attrs:
                attrs[name] = max(1.0, min(99.0, float(value)))
            team.lineup[slot] = replace(p, attributes=attrs)
    return fn


def set_metadata(height_delta: float = 0.0) -> Callable:
    def fn(team):
        for slot, p in list(team.lineup.items()):
            if slot == "GK":
                continue
            h = None if p.height_cm is None else max(150.0, min(210.0, p.height_cm + height_delta))
            team.lineup[slot] = replace(p, height_cm=h)
    return fn


def set_efforts(attack: int, defense: int) -> Callable:
    """Override every outfield player's efforts (roles unchanged)."""
    from fc_simulator.models import PlayerInstructions
    def fn(team):
        for slot, ins in list(team.instructions.items()):
            if slot == "GK":
                continue
            team.instructions[slot] = PlayerInstructions(
                ins.attack_role, max(0, min(100, attack)),
                ins.defense_role, max(0, min(100, defense)))
    return fn


def chain(*fns: Callable) -> Callable:
    def fn(team):
        for f in fns:
            f(team)
    return fn


@dataclass(frozen=True)
class Scenario:
    scenario_id: str
    family: str
    home_plan: str
    away_plan: str
    home_transform: Callable | None = None
    away_transform: Callable | None = None
    paired_swap: bool = False     # also play each seed with sides swapped (quality gaps)
    minutes: int = 90
    ovr_delta: int = 0            # applied to HOME for OVR-isolation checks only
    notes: str = ""


def registry() -> dict[str, Scenario]:
    S: list[Scenario] = []

    # ── tactical ecology matrix ─────────────────────────────────────────────
    matrix = [
        ("ultra_vs_ultra", "ultra", "ultra"),
        ("controlled_vs_controlled", "controlled", "controlled"),
        ("balanced_vs_balanced", "balanced", "balanced"),
        ("wide_attack_vs_controlled", "wide_attack", "controlled"),
        ("aggressive_vs_balanced", "aggressive", "balanced"),
        ("aggressive_vs_ultra", "aggressive", "ultra"),
        ("ultra_vs_aggressive", "ultra", "aggressive"),
        ("aggressive_vs_aggressive", "aggressive", "aggressive"),
        ("wide_attack_vs_ultra", "wide_attack", "ultra"),
    ]
    for sid, h, a in matrix:
        S.append(Scenario(f"matrix/{sid}", "matrix", h, a))

    # ── player quality gaps (identical tactics, real-attribute shifts) ──────
    quality = [
        ("avg_vs_avg", 0.0, 0.0),
        ("strong_vs_avg", +5.0, 0.0),
        ("elite_vs_avg", +10.0, 0.0),
        ("avg_vs_weak", 0.0, -7.0),
    ]
    for sid, hd, ad in quality:
        S.append(Scenario(f"quality/{sid}", "quality", "balanced", "balanced",
                          home_transform=shift_all(hd) if hd else None,
                          away_transform=shift_all(ad) if ad else None,
                          paired_swap=True,
                          notes=f"home shift {hd:+}, away shift {ad:+} on all real attributes"))

    # ── stamina × workload ──────────────────────────────────────────────────
    for sid, stam, atk, dfn in [
        ("lowstam_lowwork", 45, 22, 28), ("lowstam_highwork", 45, 85, 85),
        ("highstam_lowwork", 90, 22, 28), ("highstam_highwork", 90, 85, 85),
    ]:
        S.append(Scenario(f"workload/{sid}", "workload", "balanced", "balanced",
                          home_transform=chain(set_attr("stamina", stam), set_efforts(atk, dfn)),
                          notes=f"HOME outfield stamina={stam}, efforts A{atk}/D{dfn}; AWAY untouched"))

    # ── effort sweep (fixed roles) ──────────────────────────────────────────
    for e in (20, 60, 100):
        S.append(Scenario(f"effort/effort_{e}", "effort", "balanced", "balanced",
                          home_transform=set_efforts(e, e),
                          notes=f"HOME outfield efforts A{e}/D{e}"))

    # ── attribute counterfactuals (HOME treated; matched control run separately)
    counterfactuals = {
        "finishing": (shift_attrs(("finishing",), +12), "aggressive", "aggressive"),
        "short_passing": (shift_attrs(("short_passing",), +12), "balanced", "balanced"),
        "dribbling": (shift_attrs(("dribbling",), +12), "balanced", "balanced"),
        "defensive_awareness": (shift_attrs(("defensive_awareness",), +12), "balanced", "balanced"),
        "standing_tackle": (shift_attrs(("standing_tackle",), +12), "balanced", "balanced"),
        "interceptions": (shift_attrs(("interceptions",), +12), "balanced", "balanced"),
        "acceleration": (shift_attrs(("acceleration",), +12), "aggressive", "aggressive"),
        "sprint_speed": (shift_attrs(("sprint_speed",), +12), "aggressive", "aggressive"),
        "strength": (shift_attrs(("strength",), +12), "balanced", "balanced"),
        "stamina": (shift_attrs(("stamina",), +20), "aggressive", "aggressive"),
        "jumping": (shift_attrs(("jumping",), +15), "wide_attack", "balanced"),
        "height": (set_metadata(height_delta=+9.0), "wide_attack", "balanced"),
        # demo GKs are elite (96 reflexes): a +12 shift clamps to a near-no-op.
        # Use set-based low/high with real headroom instead; the control pair
        # gets the LOW value via its own transform (see below).
        "gk_reflexes": (set_attr("gk_reflexes", 88, slots="gk"), "aggressive", "aggressive"),
        "gk_handling": (set_attr("gk_handling", 88, slots="gk"), "aggressive", "aggressive"),
        "vision": (shift_attrs(("vision",), +12), "balanced", "balanced"),
    }
    gk_low = {"gk_reflexes": set_attr("gk_reflexes", 60, slots="gk"),
              "gk_handling": set_attr("gk_handling", 60, slots="gk")}
    for name, (tr, hp, ap) in counterfactuals.items():
        S.append(Scenario(f"attr/{name}_control", "attr_control", hp, ap,
                          home_transform=gk_low.get(name)))
        S.append(Scenario(f"attr/{name}_treated", "attr_treated", hp, ap, home_transform=tr,
                          notes=f"HOME treated: {name}"))

    # ── home/away structural artifact (identical everything) ────────────────
    S.append(Scenario("structure/home_away_bias", "structure", "balanced", "balanced"))

    # ── OVR isolation (hard invariant, checked pairwise by the runner) ──────
    S.append(Scenario("integrity/ovr_control", "integrity", "balanced", "balanced"))
    S.append(Scenario("integrity/ovr_shifted", "integrity", "balanced", "balanced", ovr_delta=-30))

    return {s.scenario_id: s for s in S}
