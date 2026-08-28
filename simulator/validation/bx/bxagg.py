"""Aggregate the BX battery: family-by-family C1/C2 metric tables."""
import json, statistics
from pathlib import Path

res = json.load(open(Path(__file__).parent / "out" / "bxseed.json"))
CFGS = ["OFF", "P", "Q", "PQ"]

def med(v):
    v = [x for x in v if x is not None]
    return round(statistics.median(v), 2) if v else None
def mean(v):
    v = [x for x in v if x is not None]
    return round(statistics.mean(v), 2) if v else None

print("═══ MATCH-LEVEL (median per config; LIV=away is the attack under test) ═══")
hdr = ["cfg", "a_xg", "a_box", "a_boxsh", "a_ch05", "a_ch10", "a_ch20", "a_cutwin", "a_contacts",
       "h_xg", "0-0", "a_txg_conc", "h_txg_conc"]
print(" ".join(f"{h:>9s}" for h in hdr))
for c in CFGS:
    R = [r for r in res if r["cfg"] == c]
    row = [c, med([r["a"]["xg"] for r in R]), med([r["a"]["box"] for r in R]), med([r["a"]["boxsh"] for r in R]),
           med([r["a"]["ch05"] for r in R]), med([r["a"]["ch10"] for r in R]), med([r["a"]["ch20"] for r in R]),
           med([r["a"]["cutwin"] for r in R]), med([r["a"]["contacts"] for r in R]),
           med([r["h"]["xg"] for r in R]),
           f"{sum(1 for r in R if r['score']==[0,0])}/{len(R)}",
           med([r["a"]["txg_conceded"] for r in R]), med([r["h"]["txg_conceded"] for r in R])]
    print(" ".join(f"{str(x):>9s}" for x in row))

print("\n═══ C1: BOX-ENTRY ANATOMY (LIV entries) ═══")
print(f"{'cfg':>4s} {'staff@0':>8s} {'staff@2':>8s} {'staff@4':>8s} {'ge2@0%':>7s} {'ge2@2%':>7s} {'ge2@4%':>7s} {'recycl%':>8s} {'shot8s%':>8s} {'uniq/m':>7s} {'rest_def':>8s}")
for c in CFGS:
    R = [r for r in res if r["cfg"] == c]
    ents = [e for r in R for e in r["entries"] if e["tid"] == "AWAY"]
    if not ents: continue
    s0 = [e["staff"].get("0", e["staff"].get(0)) for e in ents]; s2 = [e["staff"].get("2", e["staff"].get(2)) for e in ents]; s4 = [e["staff"].get("4", e["staff"].get(4)) for e in ents]
    g = lambda v: f"{100*sum(1 for x in v if x is not None and x>=2)/max(1,sum(1 for x in v if x is not None)):.0f}%"
    uniq = mean([len({e['actor'] for e in r['entries'] if e['tid']=='AWAY'}) for r in R])
    print(f"{c:>4s} {mean(s0):>8} {mean(s2):>8} {mean(s4):>8} {g(s0):>7s} {g(s2):>7s} {g(s4):>7s} "
          f"{100*sum(1 for e in ents if e['recycled'])/len(ents):>7.0f}% "
          f"{100*sum(1 for e in ents if e['shot'] is not None)/len(ents):>7.0f}% {uniq:>7} {mean([e['rest'] for e in ents]):>8}")

print("\n═══ C2: BEAT CONSEQUENCE (both teams) ═══")
print(f"{'cfg':>4s} {'n':>4s} {'sep0':>6s} {'sep+1':>6s} {'sep+3':>6s} {'sep+5':>6s} {'aspd':>6s} {'gain':>6s} {'gap':>5s} {'lost5%':>7s} {'dnbox%':>7s} {'dnshot%':>8s}")
for c in CFGS:
    R = [r for r in res if r["cfg"] == c]
    bs = [b for r in R for b in r["beats"]]
    if not bs: continue
    sp = lambda k: med([b["sep"].get(str(k), b["sep"].get(k)) for b in bs])
    print(f"{c:>4s} {len(bs):>4d} {sp(0):>6} {sp(1):>6} {sp(3):>6} {sp(5):>6} {med([b['aspd'] for b in bs]):>6} "
          f"{med([b['gain'] for b in bs]):>6} {med([b['next_gap'] for b in bs]):>5} "
          f"{100*sum(1 for b in bs if b['lost5'])/len(bs):>6.0f}% "
          f"{100*sum(1 for b in bs if b['down_box'])/len(bs):>6.0f}% "
          f"{100*sum(1 for b in bs if b['down_shot'])/len(bs):>7.0f}%")

print("\n═══ C2 SEGMENTS (PQ config): attacker speed + gain by quadrant/zone ═══")
bs = [b for r in res if r["cfg"] == "PQ" for b in r["beats"]]
bo = [b for r in res if r["cfg"] == "OFF" for b in r["beats"]]
def seg(pred, label):
    for tag, pool in (("OFF", bo), ("PQ", bs)):
        v = [b for b in pool if pred(b)]
        if v: print(f"  {label:34s} {tag:>3s}: n={len(v):3d} aspd {med([b['aspd'] for b in v])} gain {med([b['gain'] for b in v])} lost5 {100*sum(1 for b in v if b['lost5'])/len(v):.0f}%")
seg(lambda b: b["dpace"] >= 10, "pace edge >= +10 (elite v slow)")
seg(lambda b: -10 < b["dpace"] < 10, "pace parity")
seg(lambda b: b["dpace"] <= -10, "pace deficit <= -10")
seg(lambda b: b["ddrib"] >= 15, "dribble edge >= +15")
seg(lambda b: b["ddrib"] <= -15, "dribble deficit <= -15")
seg(lambda b: (b["rx0"] or 0) < 66, "open/mid field")
seg(lambda b: 66 <= (b["rx0"] or 0) < 84, "final third")
seg(lambda b: (b["rx0"] or 0) >= 84, "box zone")
seg(lambda b: (b["press"] or 0) >= 0.6, "high pressure at take-on")
print("\nnext-action kinds (PQ):", {k: sum(1 for b in bs if b["next_kind"]==k) for k in set(x["next_kind"] for x in bs if x["next_kind"])})
