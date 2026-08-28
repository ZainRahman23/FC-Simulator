"""Possession-lifecycle analysis, reconstructed entirely from the event ledger.

Zero engine involvement: the ledger already contains possession boundaries
(POSSESSION_CHANGE / RESTART_POSSESSION), staged pass probabilities
(p_execution / p_interception / p_receiver_denial / p_control), outcomes,
pressures and coordinates. Instrumentation parity with normal runtime is
therefore exact by construction (§45): nothing here runs during a match.

Coordinates: PASS intended/actual_target, RECOVERY origin. Team-relative
depth: HOME rel_x = x, AWAY rel_x = 100 - x. Final third >= 66, box >= 84.3
(the engine's own box-entry threshold). Start position approximated by the
first coordinate-bearing event of the possession (documented limitation).
"""
from __future__ import annotations

from statistics import mean, median
from typing import Any

PASS_SUCCESS = {"COMPLETED", "COMPLETED_INTO_SPACE", "AERIAL_COMPLETED",
                "ATTACKER_CONTACT", "ATTACKER_KNOCKDOWN"}
PASS_FAIL = {"INTERCEPTED", "RECEIVER_DENIED", "LOOSE", "OUT_OF_PLAY", "AERIAL_LOST",
             "DEFENDED", "NO_ATTACKER_REACH", "GK_INTERVENTION", "GK_SWEEP",
             "DEFENDER_WINS_RACE", "HEAVY_TOUCH_LOOSE"}

FINAL_THIRD = 66.0
BOX = 84.3
ACTION_TYPES = ("PASS", "CARRY", "DRIBBLE", "SHIELD", "CROSS", "SHOT", "CLEARANCE")

TERMINATION_MAP = {
    "interception": "PASS_INTERCEPTED",
    "through_interception": "PASS_INTERCEPTED",
    "receiver_denial": "PASS_RECEIVER_DENIED",
    "pass_failure": "PASS_FIRST_TOUCH_LOST",
    "through_touch_failure": "PASS_FIRST_TOUCH_LOST",
    "through_ball_race": "THROUGH_RACE_LOST",
    "aerial_pass_control": "AERIAL_LOST",
    "aerial_knockdown": "AERIAL_LOST",
    "aerial_clearance": "AERIAL_LOST",
    "offside": "OFFSIDE",
    "tackle": "TACKLE_LOST",
    "pressure_tackle": "TACKLE_LOST",
    "tackle_poke": "TACKLE_LOST",
    "pressure_tackle_poke": "TACKLE_LOST",
    "heavy_touch": "CARRY_LOST",
    "shield_turnover": "SHIELD_LOST",
    "shield_loose": "SHIELD_LOST",
    "clearance": "CLEARANCE_LOST",
    "cross_clearance": "CROSS_CLEARED",
    "corner_clearance": "CORNER_CLEARED",
    "cross_knockdown": "CROSS_CLEARED",
    "shot_block": "SHOT_REBOUND_LOST",
    "gk_parry": "SHOT_REBOUND_LOST",
    "save_caught": "SHOT_SAVED_HELD",
    "gk_claim": "GK_CLAIM",
    "gk_sweep": "GK_SWEEP",
    "gk_punch": "AERIAL_LOST",
    "goal_kick": "BALL_OUT_GOAL_KICK",
    "throw_in": "RESTART_CHANGE",
    "free_kick": "FOUL_TURNOVER",
    "advantage": "FOUL_TURNOVER",
    "penalty_save": "SHOT_SAVED_HELD",
    "restart:goal_kickoff": "GOAL",
    "restart:second_half_kickoff": "HALF_END",
    "restart:full_time": "MATCH_END",
}


def rel_x(team: str, x: float) -> float:
    return x if team == "HOME" else 100.0 - x


def analyze_match(events: list[dict], duration_s: int) -> list[dict[str, Any]]:
    """Segment the ledger into possession records."""
    possessions: list[dict] = []
    cur: dict | None = None

    def close(end_t: int, reason_key: str):
        nonlocal cur
        if cur is None:
            return
        cur["end_t"] = end_t
        cur["duration"] = max(0, end_t - cur["start_t"])
        cur["termination"] = TERMINATION_MAP.get(reason_key, f"OTHER:{reason_key}")
        possessions.append(cur)
        cur = None

    def open_possession(team: str, start_t: int, how: str, start_reason: str = ""):
        nonlocal cur
        cur = {"team": team, "start_t": start_t, "start_how": how, "start_reason": start_reason,
               "recoveries": [],
               "max_rel_x": None, "start_rel_x": None,
               "actions": 0, "passes": 0, "passes_completed": 0,
               "back_passes": 0, "lateral_passes": 0, "forward_passes": 0,
               "carries": 0, "dribbles": 0, "shields": 0, "crosses": 0,
               "pressures": [], "loose_retained": 0,
               "box_entries": 0, "shots": 0, "xg": 0.0, "transition_xg": 0.0,
               "pass_events": [], "shot_events": []}

    def note_x(x_rel: float):
        if cur is None:
            return
        if cur["start_rel_x"] is None:
            cur["start_rel_x"] = x_rel
        cur["max_rel_x"] = x_rel if cur["max_rel_x"] is None else max(cur["max_rel_x"], x_rel)

    for e in events:
        et, t, team, d = e["event_type"], e["timestamp"], e["team_id"], e.get("detail", {})
        if et == "KICKOFF":
            open_possession(team, t, "kickoff")
            note_x(50.0)
        elif et == "POSSESSION_CHANGE":
            reason = str(d.get("reason", "unknown"))
            close(t, reason)
            open_possession(team, t, "turnover", reason)
        elif et == "RESTART_POSSESSION":
            close(t, "restart:" + str(d.get("reason", "unknown")))
            open_possession(team, t, "restart")
            note_x(50.0)
        elif et == "FULL_TIME":
            close(t, "restart:full_time")
        elif cur is not None:
            # engine records a turnover-causing PASS *after* the POSSESSION_CHANGE
            # event, so an opponent-team PASS right after a boundary belongs to the
            # possession that just ended
            if et in ("PASS", "CROSS") and team != cur["team"] and possessions and possessions[-1]["team"] == team:
                prev = possessions[-1]
                prev["passes"] += 1
                prog = float(d.get("progress_m_equiv", 0.0) or 0.0)
                key = "back_passes" if prog <= -2 else ("lateral_passes" if prog < 2 else "forward_passes")
                prev[key] += 1
                prev["pass_events"].append({
                    "type": d.get("pass_type", "CROSS" if et == "CROSS" else "?"),
                    "outcome": d.get("outcome"), "progress": prog,
                    "pressure": float(d.get("pressure", 0.0) or 0.0),
                    "distance": float(d.get("distance_m", 0.0) or 0.0),
                    "p_int": d.get("p_interception"), "p_control": d.get("p_control"),
                    "p_denial": d.get("p_receiver_denial"), "p_exec": d.get("p_execution"), "zone": None})
                continue
            if et == "RECOVERY" and team == cur["team"]:
                o = d.get("origin")
                cur["recoveries"].append((t - cur["start_t"], str(d.get("reason", ""))))
                if o:
                    note_x(rel_x(team, o[0]))
            if team != cur["team"]:
                continue
            if et in ("PASS", "CROSS"):
                cur["actions"] += 1
                cur["passes"] += 1
                prog = float(d.get("progress_m_equiv", 0.0))
                if prog <= -2:
                    cur["back_passes"] += 1
                elif prog < 2:
                    cur["lateral_passes"] += 1
                else:
                    cur["forward_passes"] += 1
                if et == "CROSS":
                    cur["crosses"] += 1
                if d.get("outcome") == "COMPLETED":
                    cur["passes_completed"] += 1
                if "pressure" in d:
                    cur["pressures"].append(float(d["pressure"]))
                for key in ("intended", "actual_target"):
                    if d.get(key):
                        note_x(rel_x(team, d[key][0]))
                cur["pass_events"].append({
                    "type": d.get("pass_type", "CROSS" if et == "CROSS" else "?"),
                    "outcome": d.get("outcome"), "progress": prog,
                    "pressure": float(d.get("pressure", 0.0)),
                    "distance": float(d.get("distance_m", 0.0)),
                    "p_int": d.get("p_interception"), "p_control": d.get("p_control"),
                    "p_denial": d.get("p_receiver_denial"), "p_exec": d.get("p_execution"),
                    "zone": None if cur["max_rel_x"] is None else
                            ("FINAL" if cur["max_rel_x"] >= FINAL_THIRD else
                             "MIDDLE" if cur["max_rel_x"] >= 40 else "BUILD"),
                })
            elif et == "CARRY":
                cur["actions"] += 1
                cur["carries"] += 1
                if "pressure" in d:
                    cur["pressures"].append(float(d["pressure"]))
            elif et == "DRIBBLE":
                cur["actions"] += 1
                cur["dribbles"] += 1
            elif et == "SHIELD":
                cur["actions"] += 1
                cur["shields"] += 1
            elif et == "GROUND_DUEL":
                cur["loose_retained"] += 1
            elif et == "BOX_ENTRY":
                cur["box_entries"] += 1
                note_x(BOX + 1)
            elif et == "SHOT":
                cur["actions"] += 1
                cur["shots"] += 1
                xg = float(d.get("xg", 0.0))
                cur["xg"] += xg
                if d.get("transition"):
                    cur["transition_xg"] += xg
                if d.get("distance_m") is not None:
                    note_x(max(cur["max_rel_x"] or 0, 100 - float(d["distance_m"])))
                cur["shot_events"].append({"xg": xg, "transition": bool(d.get("transition")),
                                           "type": d.get("shot_type"), "outcome": d.get("outcome"),
                                           "t": t})
    return possessions


def shot_context(p: dict, shot: dict) -> str:
    """Deterministic validation-only classification of a shot's origin."""
    ts = shot["t"] - p["start_t"]
    for rt, reason in p["recoveries"]:
        if 0 <= ts - rt <= 8 and reason in ("shot_block", "gk_parry"):
            return "REBOUND"
    if shot.get("transition"):
        return "TRANSITION"
    if p["start_reason"] in ("clearance", "cross_clearance", "corner_clearance",
                             "aerial_clearance") and ts <= 12:
        return "SECOND_BALL"
    if p["start_reason"] == "restart:corner" or shot.get("type") == "CUTBACK_FIRST_TIME":
        return "CUTBACK_OR_SETPIECE"
    return "SETTLED"


def siege_anatomy(possessions: list[dict]) -> dict:
    shots = [(p, sh) for p in possessions for sh in p["shot_events"]]
    if not shots:
        return {"shots": 0}
    ctx: dict[str, dict] = {}
    for p, sh in shots:
        c = shot_context(p, sh)
        e = ctx.setdefault(c, {"n": 0, "xg": 0.0})
        e["n"] += 1
        e["xg"] += sh["xg"]
    total_xg = sum(e["xg"] for e in ctx.values())
    return {
        "shots": len(shots),
        "mean_xg_per_shot": round(total_xg / len(shots), 4),
        "by_context": {k: {"n": v["n"], "xg": round(v["xg"], 2),
                           "xg_share": round(v["xg"] / max(1e-9, total_xg), 3),
                           "xg_per_shot": round(v["xg"] / v["n"], 4)}
                       for k, v in sorted(ctx.items(), key=lambda kv: -kv[1]["xg"])},
        "possession_start_of_shot_poss": _start_mix([p for p, _ in shots]),
    }


def _start_mix(poss_list):
    n = max(1, len(poss_list))
    mix: dict[str, int] = {}
    for p in poss_list:
        key = p["start_reason"] or p["start_how"]
        mix[key] = mix.get(key, 0) + 1
    return {k: round(v / n, 3) for k, v in sorted(mix.items(), key=lambda kv: -kv[1])[:8]}


def stage_of(p: dict) -> str:
    if p["shots"] > 0:
        return "SHOT"
    if p["box_entries"] > 0 or (p["max_rel_x"] or 0) >= BOX:
        return "BOX_ENTRY"
    if (p["max_rel_x"] or 0) >= FINAL_THIRD:
        return "FINAL_THIRD"
    if (p["max_rel_x"] or 0) >= 40:
        return "MIDDLE_THIRD"
    return "BUILD_OUT_ONLY"


def survival(durations: list[int]) -> dict[str, float]:
    n = max(1, len(durations))
    out = {f"p_gt_{s}s": round(sum(1 for d in durations if d > s) / n, 4) for s in (5, 10, 15, 20, 30, 45)}
    if durations:
        sd = sorted(durations)
        pick = lambda q: sd[min(len(sd) - 1, int(q * (len(sd) - 1)))]
        out.update({"p10": pick(.1), "p25": pick(.25), "median": median(sd),
                    "p75": pick(.75), "p90": pick(.9), "p95": pick(.95),
                    "mean": round(mean(sd), 2)})
    return out


def aggregate(possessions: list[dict]) -> dict[str, Any]:
    """Scenario-level aggregation over possessions from many matches."""
    # exclude administrative end-of-half closures from termination shares
    real = [p for p in possessions if p["termination"] not in ("HALF_END", "MATCH_END")]
    n = max(1, len(real))
    stages = [stage_of(p) for p in real]
    stage_n = {s: stages.count(s) for s in
               ("BUILD_OUT_ONLY", "MIDDLE_THIRD", "FINAL_THIRD", "BOX_ENTRY", "SHOT")}
    reach_mid = sum(1 for p in real if (p["max_rel_x"] or 0) >= 40)
    reach_final = sum(1 for p in real if (p["max_rel_x"] or 0) >= FINAL_THIRD)
    reach_box = sum(1 for p in real if p["box_entries"] > 0 or (p["max_rel_x"] or 0) >= BOX)
    shot_poss = sum(1 for p in real if p["shots"] > 0)
    term: dict[str, int] = {}
    for p in real:
        term[p["termination"]] = term.get(p["termination"], 0) + 1

    # per-action turnover hazard: P(possession ends at action k | reached k actions)
    hazard = {}
    for k in range(1, 11):
        at_least = sum(1 for p in real if p["actions"] >= k)
        ended_at = sum(1 for p in real if p["actions"] == k)
        if at_least >= 25:
            hazard[k] = round(ended_at / at_least, 4)

    # pass-stage decomposition
    pe = [ev for p in real for ev in p["pass_events"]]
    def pass_block(rows):
        m = max(1, len(rows))
        out = {"n": len(rows)}
        for oc in ("COMPLETED", "INTERCEPTED", "RECEIVER_DENIED", "LOOSE", "OUT_OF_PLAY"):
            out[oc] = round(sum(1 for r in rows if r["outcome"] == oc) / m, 4)
        out["success_pct"] = round(sum(1 for r in rows if r["outcome"] in PASS_SUCCESS) / m, 4)
        pi = [r["p_int"] for r in rows if r.get("p_int") is not None]
        pc = [r["p_control"] for r in rows if r.get("p_control") is not None]
        pd = [r["p_denial"] for r in rows if r.get("p_denial") is not None]
        px = [r["p_exec"] for r in rows if r.get("p_exec") is not None]
        out["mean_p_interception"] = round(mean(pi), 4) if pi else None
        out["zero_interceptor_pct"] = round(sum(1 for v in pi if v == 0.0) / max(1, len(pi)), 4) if pi else None
        out["mean_p_control"] = round(mean(pc), 4) if pc else None
        out["mean_p_denial"] = round(mean(pd), 4) if pd else None
        out["mean_p_exec_estimate"] = round(mean(px), 4) if px else None
        out["mean_pressure"] = round(mean(r["pressure"] for r in rows), 3) if rows else None
        return out

    by_dir = {
        "backward": pass_block([r for r in pe if r["progress"] <= -2]),
        "lateral": pass_block([r for r in pe if -2 < r["progress"] < 2]),
        "forward_short": pass_block([r for r in pe if 2 <= r["progress"] < 10]),
        "forward_long": pass_block([r for r in pe if r["progress"] >= 10]),
    }
    by_type = {t: pass_block([r for r in pe if r["type"] == t])
               for t in sorted({r["type"] for r in pe})}
    by_distance = {
        "d_0_15m": pass_block([r for r in pe if r["distance"] < 15]),
        "d_15_30m": pass_block([r for r in pe if 15 <= r["distance"] < 30]),
        "d_30_45m": pass_block([r for r in pe if 30 <= r["distance"] < 45]),
        "d_45m_plus": pass_block([r for r in pe if r["distance"] >= 45]),
    }
    by_pressure = {
        "p0_low": pass_block([r for r in pe if r["pressure"] < 0.2]),
        "p1_mid": pass_block([r for r in pe if 0.2 <= r["pressure"] < 0.5]),
        "p2_high": pass_block([r for r in pe if r["pressure"] >= 0.5]),
    }

    # recycling: survival after a backward/lateral pass
    recycled = [p for p in real if p["back_passes"] + p["lateral_passes"] > 0]

    final_third_poss = [p for p in real if (p["max_rel_x"] or 0) >= FINAL_THIRD]
    box_poss = [p for p in real if p["box_entries"] > 0 or (p["max_rel_x"] or 0) >= BOX]
    return {
        "possessions": len(real),
        "survival": survival([p["duration"] for p in real]),
        "actions_per_possession": round(mean(p["actions"] for p in real), 2),
        "passes_per_possession": round(mean(p["passes"] for p in real), 2),
        "pass_completion": round(sum(p["passes_completed"] for p in real) /
                                 max(1, sum(p["passes"] for p in real)), 4),
        "stage_counts": stage_n,
        "funnel": {
            "reach_middle_pct": round(reach_mid / n, 4),
            "reach_final_pct": round(reach_final / n, 4),
            "reach_box_pct": round(reach_box / n, 4),
            "shot_pct": round(shot_poss / n, 4),
            "p_box_given_final": round(reach_box / max(1, reach_final), 4),
            "p_shot_given_box": round(shot_poss / max(1, reach_box), 4),
            "p_shot_given_final": round(shot_poss / max(1, reach_final), 4),
            "xg_per_final_third_poss": round(sum(p["xg"] for p in final_third_poss) / max(1, len(final_third_poss)), 4),
            "xg_per_box_entry_poss": round(sum(p["xg"] for p in box_poss) / max(1, len(box_poss)), 4),
        },
        "termination_pct": {k: round(v / n, 4) for k, v in sorted(term.items(), key=lambda kv: -kv[1])},
        "action_hazard": hazard,
        "pass_stages": {"by_direction": by_dir, "by_type": by_type, "by_pressure": by_pressure, "by_distance": by_distance},
        "direction_mix": {
            "backward_pct": round(sum(p["back_passes"] for p in real) / max(1, sum(p["passes"] for p in real)), 4),
            "lateral_pct": round(sum(p["lateral_passes"] for p in real) / max(1, sum(p["passes"] for p in real)), 4),
            "forward_pct": round(sum(p["forward_passes"] for p in real) / max(1, sum(p["passes"] for p in real)), 4),
        },
        "recycle": {
            "possessions_with_recycle_pct": round(len(recycled) / n, 4),
            "mean_duration_recycled": round(mean(p["duration"] for p in recycled), 2) if recycled else None,
            "mean_duration_no_recycle": round(mean(p["duration"] for p in real if p not in recycled), 2) if len(recycled) < len(real) else None,
        },
        "xg_split": {
            "total_xg": round(sum(p["xg"] for p in real), 3),
            "transition_xg": round(sum(p["transition_xg"] for p in real), 3),
            "settled_xg": round(sum(p["xg"] - p["transition_xg"] for p in real), 3),
        },
        "mean_pressure_on_passes": round(mean(x for p in real for x in p["pressures"]), 3) if any(p["pressures"] for p in real) else None,
        "shot_anatomy": siege_anatomy(real),
    }
