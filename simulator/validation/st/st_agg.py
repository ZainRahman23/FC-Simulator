"""Aggregate st_multiseed.jsonl into per-config means."""
import json, statistics, sys
from pathlib import Path
rows = [json.loads(l) for l in open(Path(__file__).parent / "out" / "st_multiseed.jsonl")]
KEYS = ["slope_back","slope_mid","slope_fwd","team_len_mean","possessions","poss_mean_s","passes_per_poss",
        "backline_pass_30m_share","defthird_support8_mean","swarm_events","wide1v1_contact_share",
        "dribble_candidates","dribble_chosen","shots_25m_plus","shots_total","pass_comp_HOME","pass_comp_AWAY",
        "press_gt05_share","actions","hazard_per_action"]
ORDER = ["OFF","A","B","C","D","E","AB","ABC","ABCD","ABCDE"]
print(f"{'cfg':7s} n  slpB  len   poss  dur   hz/act p>.5  sup8  bl30  wide<2 swarm drbC/ch  beats sh25/tot  xG(H/A) g(H/A) compH/A")
for cfg in ORDER:
    rs = [r for r in rows if r["cfg"] == cfg]
    if not rs: continue
    m = {k: statistics.mean(r[k] for r in rs if r.get(k) is not None) for k in KEYS}
    beats = statistics.mean(r["dribble_outcomes"].get("BEAT", 0) for r in rs)
    xh = statistics.mean(r["xg"]["HOME"] for r in rs); xa = statistics.mean(r["xg"]["AWAY"] for r in rs)
    gh = statistics.mean(r["goals"][0] for r in rs); ga = statistics.mean(r["goals"][1] for r in rs)
    print(f"{cfg:7s} {len(rs):2d} {m['slope_back']:.2f}  {m['team_len_mean']:.0f}  {m['possessions']:5.0f} {m['poss_mean_s']:5.1f} {m['hazard_per_action']:.3f} {m['press_gt05_share']:.2f}  {m['defthird_support8_mean']:.2f}  {m['backline_pass_30m_share']:.2f}  {m['wide1v1_contact_share']:.2f}  {m['swarm_events']:4.0f} {m['dribble_candidates']:4.0f}/{m['dribble_chosen']:3.0f} {beats:5.1f} {m['shots_25m_plus']:4.1f}/{m['shots_total']:4.1f} {xh:.2f}/{xa:.2f} {gh:.2f}/{ga:.2f} {m['pass_comp_HOME']:.2f}/{m['pass_comp_AWAY']:.2f}")
