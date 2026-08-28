"""Readable causal traces of possessions from fixed seeds (§26).

Every line is real logged engine state: event type, staged probabilities,
outcomes. No prose guessing about hidden RNG.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from validation.possession import TERMINATION_MAP, rel_x
from validation.scenarios import PLANS, registry, scenario_seed


def run_and_trace(sid: str, index: int, pick: str):
    from fc_simulator.data import apply_plan, build_mirrored_demo_teams, load_players
    from fc_simulator.engine import MatchEngine
    from fc_simulator.models import MatchConfig
    sc = registry()[sid]
    players, stats = load_players(Path(__file__).resolve().parents[1] / "data" / "players.json")
    home, away = build_mirrored_demo_teams(players)
    home.name, away.name = "HOME_XI", "AWAY_XI"
    if PLANS[sc.home_plan]: apply_plan(home, PLANS[sc.home_plan])
    if PLANS[sc.away_plan]: apply_plan(away, PLANS[sc.away_plan])
    seed = scenario_seed(sid, index)
    r = MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=90 * 60, coach_ai_enabled=False)).run()
    events = [e.to_dict() for e in r.events]

    # split into possessions
    segs, cur = [], None
    for e in events:
        et = e["event_type"]
        if et in ("KICKOFF", "POSSESSION_CHANGE", "RESTART_POSSESSION"):
            if cur: segs.append(cur)
            cur = {"team": e["team_id"], "events": [e], "start": e["timestamp"]}
        elif cur is not None:
            cur["events"].append(e)
    if cur: segs.append(cur)

    def describe(seg, nxt_reason):
        team = seg["team"]
        lines = [f"--- possession {seg['team']} start {seg['start']}s "
                 f"({seg['events'][0]['event_type']}: {seg['events'][0].get('detail',{}).get('reason','')}) ---"]
        for e in seg["events"][1:]:
            d = e.get("detail", {})
            t = e["timestamp"] - seg["start"]
            et = e["event_type"]
            if e["team_id"] != team and et not in ("GROUND_DUEL",):
                continue
            if et == "PASS":
                lines.append(f"  +{t:>3}s PASS {d.get('pass_type','?'):<11} {e['actor_name']} → {d.get('target_name')} "
                             f"dist {d.get('distance_m')}m prog {d.get('progress_m_equiv')}m press {d.get('pressure')} "
                             f"[pInt {d.get('p_interception')} pDeny {d.get('p_receiver_denial')} pCtl {d.get('p_control')}] "
                             f"→ {d.get('outcome')}")
            elif et == "CARRY":
                lines.append(f"  +{t:>3}s CARRY {e['actor_name']} press {d.get('pressure')} pClean {d.get('p_clean')} → {d.get('outcome')}")
            elif et == "DRIBBLE":
                lines.append(f"  +{t:>3}s DRIBBLE {e['actor_name']} vs {d.get('defender')} → {d.get('outcome')}")
            elif et == "SHIELD":
                lines.append(f"  +{t:>3}s SHIELD {e['actor_name']} → {d.get('outcome','held')}")
            elif et == "SHOT":
                lines.append(f"  +{t:>3}s SHOT {e['actor_name']} {d.get('shot_type')} {d.get('distance_m')}m "
                             f"xG {d.get('xg')} psxg {d.get('psxg')} defOrg {d.get('defensive_organization')} "
                             f"trans {d.get('transition')} → {d.get('outcome')}")
            elif et == "BOX_ENTRY":
                lines.append(f"  +{t:>3}s BOX_ENTRY via {d.get('via')}")
            elif et == "GROUND_DUEL":
                lines.append(f"  +{t:>3}s LOOSE-BALL duel ({d.get('reason')}) won by {d.get('winner')}")
            elif et == "RECOVERY":
                o = d.get("origin")
                lines.append(f"  +{t:>3}s RECOVERY {e['actor_name']} at rel_x {rel_x(e['team_id'], o[0]):.0f}" if o else f"  +{t:>3}s RECOVERY")
            elif et in ("CROSS", "CORNER", "FREE_KICK", "OFFSIDE", "FOUL", "CLEARANCE"):
                lines.append(f"  +{t:>3}s {et} {e['actor_name'] or ''} {d.get('outcome','')}")
        lines.append(f"  ⇒ ended: {TERMINATION_MAP.get(nxt_reason, nxt_reason)}")
        return "\n".join(lines)

    picked = []
    for i, seg in enumerate(segs):
        nxt = segs[i + 1]["events"][0].get("detail", {}).get("reason", "?") if i + 1 < len(segs) else "full_time"
        if segs[i + 1]["events"][0]["event_type"] == "RESTART_POSSESSION" if i + 1 < len(segs) else False:
            nxt = "restart:" + nxt
        dur = (segs[i + 1]["start"] if i + 1 < len(segs) else 5400) - seg["start"]
        n_pass = sum(1 for e in seg["events"] if e["event_type"] == "PASS" and e["team_id"] == seg["team"])
        has_shot = any(e["event_type"] == "SHOT" for e in seg["events"])
        if pick == "early_death" and dur <= 8 and n_pass >= 1 and not has_shot:
            picked.append((seg, nxt))
        elif pick == "mature_no_shot" and dur >= 25 and not has_shot:
            picked.append((seg, nxt))
        elif pick == "shot" and has_shot:
            picked.append((seg, nxt))
        elif pick == "long" and dur >= 35:
            picked.append((seg, nxt))
    for seg, nxt in picked[:2]:
        print(describe(seg, nxt))
        print()


if __name__ == "__main__":
    sid, index, pick = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    run_and_trace(sid, index, pick)
