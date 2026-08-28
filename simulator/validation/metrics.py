"""Match-level metric extraction and aggregation. Read-only over MatchResult."""
from __future__ import annotations

import math
from statistics import mean, median, stdev
from typing import Any


def extract_match_row(result, seed: int, scenario_id: str, minutes: int, swapped: bool = False) -> dict[str, Any]:
    ev = result.events
    shots = {"HOME": [], "AWAY": []}
    for e in ev:
        if e.event_type == "SHOT":
            shots[e.team_id].append(e)
    def team(tid):
        ps = [s for s in result.player_states.values() if s.team_id == tid]
        sh = shots[tid]
        gk = next((s for s in ps if s.slot == "GK"), None)
        pa = sum(s.passes_attempted for s in ps); pc = sum(s.passes_completed for s in ps)
        return {
            "goals": result.home_score if tid == "HOME" else result.away_score,
            "xg": round(sum(float(e.detail.get("xg", 0)) for e in sh), 4),
            "psxg": round(sum(float(e.detail.get("psxg", 0)) for e in sh), 4),
            "shots": len(sh),
            "sot": sum(s.shots_on_target for s in ps),
            "transition_shots": sum(1 for e in sh if e.detail.get("transition")),
            "transition_xg": round(sum(float(e.detail.get("xg", 0)) for e in sh if e.detail.get("transition")), 4),
            "settled_xg": round(sum(float(e.detail.get("xg", 0)) for e in sh if not e.detail.get("transition")), 4),
            "big_chances": sum(1 for e in sh if float(e.detail.get("xg", 0)) >= 0.25),
            "mean_shot_xg": round(mean([float(e.detail.get("xg", 0)) for e in sh]), 4) if sh else 0.0,
            "possession_s": result.possession_seconds.get(tid, 0),
            "pass_att": pa, "pass_comp": pc,
            "pass_pct": round(pc / max(1, pa), 4),
            "progressive_passes": sum(s.progressive_passes for s in ps),
            "key_passes": sum(s.key_passes for s in ps),
            "turnovers": sum(s.turnovers for s in ps),
            "dribbles_won": sum(s.dribbles_completed for s in ps),
            "dribbles_att": sum(s.dribbles_attempted for s in ps),
            "tackles_won": sum(s.tackles_won for s in ps),
            "tackles_att": sum(s.tackles_attempted for s in ps),
            "interceptions": sum(s.interceptions for s in ps),
            "pressures": sum(s.pressures for s in ps),
            "pressures_eff": sum(s.effective_pressures for s in ps),
            "blocks": sum(s.blocks for s in ps),
            "clearances": sum(s.clearances for s in ps),
            "aerials_won": sum(s.aerial_duels_won for s in ps),
            "aerials_att": sum(s.aerial_duels for s in ps),
            "ground_duels_won": sum(s.ground_duels_won for s in ps),
            "ground_duels_att": sum(s.ground_duels for s in ps),
            "fouls": sum(s.fouls_committed for s in ps),
            "yellows": sum(s.yellow_cards for s in ps),
            "reds": sum(s.red_cards for s in ps),
            "corners": sum(1 for e in ev if e.event_type == "CORNER" and e.team_id == tid),
            "free_kicks": sum(1 for e in ev if e.event_type == "FREE_KICK" and e.team_id == tid),
            "penalties": sum(1 for e in ev if e.event_type == "PENALTY" and e.team_id == tid),
            "gk_saves": gk.saves if gk else 0,
            "gk_claims": gk.gk_claims if gk else 0,
            "gk_punches": gk.gk_punches if gk else 0,
            "gk_rating": round(gk.match_rating, 3) if gk else None,
            "distance_km": round(sum(s.distance_m for s in ps) / 1000, 2),
            "sprint_km": round(sum(s.sprint_distance_m for s in ps) / 1000, 3),
            "energy_final_mean": round(mean([s.energy for s in ps if s.active]), 2),
            "energy_final_min": round(min([s.energy for s in ps if s.active]), 2),
            "acute_final_mean": round(mean([s.acute_exertion for s in ps if s.active]), 2),
            "ratings": [round(s.match_rating, 2) for s in ps],
        }
    home, away = team("HOME"), team("AWAY")
    controlled = max(1, home["possession_s"] + away["possession_s"])
    row = {
        "scenario": scenario_id, "seed": seed, "minutes": minutes, "swapped": swapped,
        "home": home, "away": away,
        "possession_pct_home": round(100 * home["possession_s"] / controlled, 2),
        "possession_changes": sum(1 for e in ev if e.event_type == "POSSESSION_CHANGE"),
        "event_count": len(ev),
    }
    return row


def _pct(sorted_vals, p):
    if not sorted_vals:
        return None
    i = min(len(sorted_vals) - 1, max(0, int(round(p / 100 * (len(sorted_vals) - 1)))))
    return sorted_vals[i]


def dist(values: list[float]) -> dict[str, Any]:
    if not values:
        return {"n": 0}
    v = sorted(values)
    m = mean(v)
    sd = stdev(v) if len(v) > 1 else 0.0
    ci = 1.96 * sd / math.sqrt(len(v)) if len(v) > 1 else 0.0
    return {"n": len(v), "mean": round(m, 4), "median": round(median(v), 4), "sd": round(sd, 4),
            "ci95": round(ci, 4), "p10": round(_pct(v, 10), 4), "p25": round(_pct(v, 25), 4),
            "p75": round(_pct(v, 75), 4), "p90": round(_pct(v, 90), 4),
            "min": round(v[0], 4), "max": round(v[-1], 4)}


def aggregate_scenario(rows: list[dict]) -> dict[str, Any]:
    n = len(rows)
    tot_goals = [r["home"]["goals"] + r["away"]["goals"] for r in rows]
    margins = [abs(r["home"]["goals"] - r["away"]["goals"]) for r in rows]
    goal_buckets = {b: sum(1 for g in tot_goals if (g >= 4 if b == "4+" else g == int(b))) for b in ("0", "1", "2", "3", "4+")}
    out = {
        "matches": n,
        "home_win_pct": round(sum(1 for r in rows if r["home"]["goals"] > r["away"]["goals"]) / n, 4),
        "away_win_pct": round(sum(1 for r in rows if r["home"]["goals"] < r["away"]["goals"]) / n, 4),
        "draw_pct": round(sum(1 for r in rows if r["home"]["goals"] == r["away"]["goals"]) / n, 4),
        "zero_zero_pct": round(sum(1 for r in rows if r["home"]["goals"] == 0 and r["away"]["goals"] == 0) / n, 4),
        "btts_pct": round(sum(1 for r in rows if r["home"]["goals"] > 0 and r["away"]["goals"] > 0) / n, 4),
        "one_goal_win_pct": round(sum(1 for m in margins if m == 1) / n, 4),
        "margin3_pct": round(sum(1 for m in margins if m >= 3) / n, 4),
        "total_goals_dist": dist([float(g) for g in tot_goals]),
        "goal_buckets": goal_buckets,
        "total_xg": dist([r["home"]["xg"] + r["away"]["xg"] for r in rows]),
        "home_xg": dist([r["home"]["xg"] for r in rows]),
        "away_xg": dist([r["away"]["xg"] for r in rows]),
        "goals_over_xg": round(sum(tot_goals) / max(1e-9, sum(r["home"]["xg"] + r["away"]["xg"] for r in rows)), 3),
        "possession_home": dist([r["possession_pct_home"] for r in rows]),
        "possession_changes": dist([float(r["possession_changes"]) for r in rows]),
        "transition_shots_total": dist([float(r["home"]["transition_shots"] + r["away"]["transition_shots"]) for r in rows]),
        "transition_xg_total": dist([r["home"]["transition_xg"] + r["away"]["transition_xg"] for r in rows]),
        "settled_xg_total": dist([r["home"]["settled_xg"] + r["away"]["settled_xg"] for r in rows]),
    }
    for side in ("home", "away"):
        out[f"{side}_stats"] = {k: dist([float(r[side][k]) for r in rows]) for k in
            ("goals", "shots", "sot", "pass_att", "pass_pct", "progressive_passes", "turnovers",
             "tackles_won", "interceptions", "pressures", "blocks", "clearances", "fouls",
             "yellows", "reds", "corners", "penalties", "gk_saves", "distance_km",
             "energy_final_mean", "energy_final_min", "big_chances", "mean_shot_xg")}
    out["ratings_all"] = dist([x for r in rows for side in ("home", "away") for x in r[side]["ratings"]])
    return out
