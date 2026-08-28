"""Baseline analysis: turns validation outputs into a Markdown report."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from statistics import mean, stdev

OUT = Path(__file__).with_name("out")


def load(name):
    d = json.load(open(OUT / name / "matches.json"))
    return d["scenarios"], d


def ci95(vals):
    if len(vals) < 2:
        return 0.0
    return 1.96 * stdev(vals) / math.sqrt(len(vals))


def fmt(m, c):
    return f"{m:.3f} ±{c:.3f}"


def matrix_table(agg):
    lines = ["| Matchup | n | Total xG | Goals | 0-0 % | Draw % | BTTS % | Poss chg | Trans xG | Settled xG | Energy(final) |",
             "|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|"]
    order = ["ultra_vs_ultra", "controlled_vs_controlled", "balanced_vs_balanced",
             "wide_attack_vs_controlled", "wide_attack_vs_ultra", "aggressive_vs_balanced",
             "aggressive_vs_ultra", "ultra_vs_aggressive", "aggressive_vs_aggressive"]
    for sid in order:
        a = agg.get(f"matrix/{sid}")
        if not a:
            continue
        en = (a["home_stats"]["energy_final_mean"]["mean"] + a["away_stats"]["energy_final_mean"]["mean"]) / 2
        lines.append(f"| {sid} | {a['matches']} | {a['total_xg']['mean']:.2f} ±{a['total_xg']['ci95']:.2f} "
                     f"| {a['total_goals_dist']['mean']:.2f} | {a['zero_zero_pct']*100:.0f} | {a['draw_pct']*100:.0f} "
                     f"| {a['btts_pct']*100:.0f} | {a['possession_changes']['mean']:.0f} "
                     f"| {a['transition_xg_total']['mean']:.2f} | {a['settled_xg_total']['mean']:.2f} | {en:.1f} |")
    return "\n".join(lines)


def quality_table(scen):
    lines = ["| Pairing | legs | Fav W% | D% | Underdog W% | Fav xG | Dog xG | Fav xG share | Fav GD/match |",
             "|---|--:|--:|--:|--:|--:|--:|--:|--:|"]
    for sid in ("quality/avg_vs_avg", "quality/strong_vs_avg", "quality/elite_vs_avg", "quality/avg_vs_weak"):
        rows = scen[sid]["rows"]
        legs = []
        for r in rows:
            fav_side, dog_side = ("home", "away") if not r["swapped"] else ("away", "home")
            legs.append((r[fav_side]["goals"], r[dog_side]["goals"], r[fav_side]["xg"], r[dog_side]["xg"]))
        n = len(legs)
        fw = sum(1 for g in legs if g[0] > g[1]) / n
        dw = sum(1 for g in legs if g[0] < g[1]) / n
        fx, dx = mean(l[2] for l in legs), mean(l[3] for l in legs)
        gd = mean(l[0] - l[1] for l in legs)
        lines.append(f"| {sid.split('/')[1]} | {n} | {fw*100:.1f} | {(1-fw-dw)*100:.1f} | {dw*100:.1f} "
                     f"| {fx:.2f} | {dx:.2f} | {fx/max(1e-9,fx+dx):.3f} | {gd:+.2f} |")
    return "\n".join(lines)


ATTR_METRIC = {
    "finishing": [("home goals", lambda r: r["home"]["goals"]), ("home xG (should be ~flat)", lambda r: r["home"]["xg"])],
    "short_passing": [("home pass %", lambda r: r["home"]["pass_pct"] * 100)],
    "dribbling": [("home dribble win %", lambda r: 100 * r["home"]["dribbles_won"] / max(1, r["home"]["dribbles_att"]))],
    "defensive_awareness": [("away xG (down = good)", lambda r: r["away"]["xg"]), ("home interceptions", lambda r: r["home"]["interceptions"])],
    "standing_tackle": [("home tackle win %", lambda r: 100 * r["home"]["tackles_won"] / max(1, r["home"]["tackles_att"]))],
    "interceptions": [("home interceptions", lambda r: r["home"]["interceptions"])],
    "acceleration": [("home xG", lambda r: r["home"]["xg"]), ("home xG share", lambda r: 100 * r["home"]["xg"] / max(1e-9, r["home"]["xg"] + r["away"]["xg"]))],
    "sprint_speed": [("home xG share", lambda r: 100 * r["home"]["xg"] / max(1e-9, r["home"]["xg"] + r["away"]["xg"]))],
    "strength": [("home grd-duel win %", lambda r: 100 * r["home"]["ground_duels_won"] / max(1, r["home"]["ground_duels_att"]))],
    "stamina": [("home final energy", lambda r: r["home"]["energy_final_mean"])],
    "jumping": [("home aerial win %", lambda r: 100 * r["home"]["aerials_won"] / max(1, r["home"]["aerials_att"]))],
    "height": [("home aerial win %", lambda r: 100 * r["home"]["aerials_won"] / max(1, r["home"]["aerials_att"]))],
    "gk_reflexes": [("away goals (down = good)", lambda r: r["away"]["goals"]), ("home GK saves", lambda r: r["home"]["gk_saves"])],
    "gk_handling": [("away goals (down = good)", lambda r: r["away"]["goals"])],
    "vision": [("home key passes", lambda r: r["home"]["key_passes"]), ("home progressive", lambda r: r["home"]["progressive_passes"])],
}


def attr_table(scen):
    lines = ["| Attribute (+Δ HOME) | Metric | Control | Treated | Δ (matched seeds) |",
             "|---|---|--:|--:|--:|"]
    for name, metrics in ATTR_METRIC.items():
        ctrl = {r["seed"]: r for r in scen[f"attr/{name}_control"]["rows"]}
        trt = {r["seed"]: r for r in scen[f"attr/{name}_treated"]["rows"]}
        shared = sorted(set(ctrl) & set(trt))
        matched = len(shared) == len(ctrl)
        for label, f in metrics:
            cv = [f(ctrl[s]) for s in shared]
            tv = [f(trt[s]) for s in shared]
            dv = [t - c for c, t in zip(cv, tv)]
            lines.append(f"| {name}{'' if matched else ' (unmatched!)'} | {label} | {mean(cv):.2f} | {mean(tv):.2f} "
                         f"| {mean(dv):+.2f} ±{ci95(dv):.2f} |")
    return "\n".join(lines)


def workload_table(scen):
    lines = ["| Scenario | HOME final energy | HOME min energy | HOME distance km | AWAY final energy |",
             "|---|--:|--:|--:|--:|"]
    for sid in ("workload/lowstam_lowwork", "workload/lowstam_highwork",
                "workload/highstam_lowwork", "workload/highstam_highwork",
                "effort/effort_20", "effort/effort_60", "effort/effort_100"):
        rows = scen[sid]["rows"]
        he = mean(r["home"]["energy_final_mean"] for r in rows)
        hm = mean(r["home"]["energy_final_min"] for r in rows)
        hd = mean(r["home"]["distance_km"] for r in rows)
        ae = mean(r["away"]["energy_final_mean"] for r in rows)
        lines.append(f"| {sid} | {he:.1f} | {hm:.1f} | {hd:.1f} | {ae:.1f} |")
    return "\n".join(lines)


def structure_check(scen):
    rows = scen["structure/home_away_bias"]["rows"]
    n = len(rows)
    hw = sum(1 for r in rows if r["home"]["goals"] > r["away"]["goals"]) / n
    aw = sum(1 for r in rows if r["home"]["goals"] < r["away"]["goals"]) / n
    hx = mean(r["home"]["xg"] for r in rows)
    ax = mean(r["away"]["xg"] for r in rows)
    xs = [r["home"]["xg"] - r["away"]["xg"] for r in rows]
    return (f"Identical mirrored teams, n={n}: HOME win {hw*100:.1f}% / AWAY win {aw*100:.1f}% / draw {(1-hw-aw)*100:.1f}%. "
            f"HOME xG {hx:.3f} vs AWAY xG {ax:.3f} (Δ {mean(xs):+.3f} ±{ci95(xs):.3f}).")


def integrity_check(scen):
    c = {r["seed"]: r["event_ledger_digest"] for r in scen["integrity/ovr_control"]["rows"]}
    s = {r["seed"]: r["event_ledger_digest"] for r in scen["integrity/ovr_shifted"]["rows"]}
    return "IDENTICAL EVENT LEDGERS (hard invariant holds)" if c == s else "VIOLATION — OVR leaked into resolution!"


def main(out_path: Path):
    mscen, mdata = load("baseline_matrix")
    ascen, _ = load("baseline_attr")
    sscen, _ = load("baseline_struct")
    iscen, _ = load("baseline_integrity")
    magg = json.load(open(OUT / "baseline_matrix" / "aggregates.json"))["aggregates"]
    bb = magg["matrix/balanced_vs_balanced"]

    md = f"""# FC Simulator v0.7 — Baseline Validation Report (pre-calibration)

Engine {mdata['engine_version']} · calibration {mdata['calibration_version']} · coach AI frozen ·
90-minute matches · mirrored identical XIs · seed scheme `{mdata['seed_scheme']}`

## B. Tactical ecology matrix
{matrix_table(magg)}

Balanced-vs-balanced goal buckets: {bb['goal_buckets']} · goals/xG {bb['goals_over_xg']}
Ratings (all players, all matrix matches): mean {bb['ratings_all']['mean']:.2f}, sd {bb['ratings_all']['sd']:.2f}, P10 {bb['ratings_all']['p10']:.1f}, P90 {bb['ratings_all']['p90']:.1f}

## C. Player quality gaps (paired home/away legs, matched seeds)
{quality_table(mscen)}

## D. Attribute counterfactuals (matched seeds)
{attr_table(ascen)}

## E. Workload / Energy
{workload_table(ascen)}

## Structure: home/away artifact
{structure_check(sscen)}

## Integrity: OVR isolation ({len(iscen['integrity/ovr_control']['rows'])} matched seeds, ledger digests)
{integrity_check(iscen)}
"""
    out_path.write_text(md)
    print(md)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "BASELINE_REPORT.md")
