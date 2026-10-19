# technical_control14/tools/tc14_summary.py — TECHNICAL-CONTROL-1.4's evidence summary: the technique-efficiency test (owner §13) before (TECHNICAL-CONTROL-1.2)
# → after, the attribute and style sets, open / tight carrying, the phasing on the same body, TECHNICAL-CONTROL-1.3's torture set, the checks, the
# carry model preserved, the CPU.   python3 tc14_summary.py <evidence dir>
import json, statistics as st, sys, os
ev = sys.argv[1]; P = lambda f: os.path.join(ev, f); L = lambda f: [json.loads(l) for l in open(P(f)) if l.strip()]
med = lambda a: round(st.median(a), 2) if a else None
out = {"main": [], "left99": [], "attrs": [], "styles": [], "open": json.load(open(P("tc14_open.json")))}; txt = ["TECHNICAL-CONTROL-1.4 — Dribbling 99 = the fastest technique, not the most touches: BEFORE (TECHNICAL-CONTROL-1.2) → AFTER", ""]
def cell(R, k): v = [x[k] for x in R if x.get(k) is not None]; return med(v)
def row(A, B, key):
  return {"key": key, "contacts": [[x["contacts"] for x in A], [x["contacts"] for x in B]], "actionContacts": [x.get("actionContacts") for x in B], "due": [x.get("due") for x in B],
    "techniqueBefore": sorted(set(x["technique"] for x in A)), "techniqueAfter": [x["technique"] for x in B], "prepS": [cell(A, "prepS"), cell(B, "prepS")], "contactToLineS": [cell(A, "toLineS"), cell(B, "toLineS")],
    "requestToLineS": [cell(A, "reqToLineS"), cell(B, "reqToLineS")], "exitV": [cell(A, "exitV"), cell(B, "exitV")], "sepMax": [cell(A, "sepMax"), cell(B, "sepMax")], "failed": sum(x["failed"] for x in B),
    "decisive": [x.get("decisive") for x in B], "seq": [x["seq"] for x in B]}
A0, B0 = L("tc14_eff_main_before.jsonl"), L("tc14_eff_main_after.jsonl")
txt.append("== the efficiency test (owner §13): 5.5 m/s, Ball Control / Agility 99, turns to the right, seeds 1 – 3 (the request at three phases of the touch rhythm)")
txt.append("   angle  D  | contacts before → after (per seed) | technique after (per seed) | preparation s | contact → new line s | request → new line s | exit m/s | separation m (medians, before → after)")
for ang in [30, 60, 90, 120, 150, 180]:
  for d in [50, 70, 80, 90, 99]:
    f = lambda rows: [r for r in rows if r["ang"] == ang and r["d"] == d and not r.get("left") and "error" not in r]; A, B = f(A0), f(B0)
    if not A or not B: continue
    r = row(A, B, f"{ang}@D{d}"); out["main"].append(dict(r, ang=ang, d=d))
    txt.append(f"   {ang:4d} {d:3d} | {r['contacts'][0]} → {r['contacts'][1]} | {', '.join(r['techniqueAfter'])[:52]:52s} | {r['prepS'][0]} → {r['prepS'][1]} | {r['contactToLineS'][0]} → {r['contactToLineS'][1]} | {r['requestToLineS'][0]} → {r['requestToLineS'][1]} | {r['exitV'][0]} → {r['exitV'][1]} | {r['sepMax'][0]} → {r['sepMax'][1]}")
  txt.append("")
txt.append("== turns to the LEFT at 99 (a right-footer: his right foot is the one the chop / inside cut across uses)")
for r in [x for x in B0 if x.get("left") and "error" not in x]:
  out["left99"].append(r); txt.append(f"   {r['ang']:4d} seed {r['seed']} | contacts {r['contacts']} | {r['technique']:10s} | request → line {r['reqToLineS']} s | sep {r['sepMax']} m | {r['seq']}")
txt.append(""); txt.append("== the attributes (owner §11, §12): Dribbling 99 with Ball Control 50 / Agility 50 — the decisive contact's execution (difficulty, direction error, speed error) and the body's time to the new line")
A1, B1 = L("tc14_eff_attrs_before.jsonl"), L("tc14_eff_attrs_after.jsonl")
for k in sorted(set((r["ang"], r["d"], r["b"], r["a"]) for r in B1)):
  f = lambda rows: [r for r in rows if (r["ang"], r["d"], r["b"], r["a"]) == k and "error" not in r]; A, B = f(A1), f(B1)
  r = row(A, B, f"{k[0]}@D{k[1]}B{k[2]}A{k[3]}"); out["attrs"].append(dict(r, ang=k[0], d=k[1], b=k[2], a=k[3])); dec = [x for x in r["decisive"] if x]
  txt.append(f"   {k[0]:4d} D{k[1]} B{k[2]} A{k[3]} | contacts {r['contacts'][0]} → {r['contacts'][1]} | {', '.join(r['techniqueAfter'])[:40]:40s} | decisive error ° {[x['errDeg'] for x in dec]} speed {[x['errSpeed'] for x in dec]} | contact → line {r['contactToLineS'][0]} → {r['contactToLineS'][1]} s")
txt.append(""); txt.append("== the styles (owner §16), Dribbling 99")
A2, B2 = L("tc14_eff_styles_before.jsonl"), L("tc14_eff_styles_after.jsonl")
for k in sorted(set((r["ang"], r["style"]) for r in B2)):
  f = lambda rows: [r for r in rows if (r["ang"], r["style"]) == k and "error" not in r]; A, B = f(A2), f(B2)
  r = row(A, B, f"{k[0]}@{k[1]}"); out["styles"].append(dict(r, ang=k[0], style=k[1]))
  txt.append(f"   {k[0]:4d} {k[1]:15s} | contacts {r['contacts'][0]} → {r['contacts'][1]} | {', '.join(r['techniqueAfter'])} | request → line {r['requestToLineS'][0]} → {r['requestToLineS'][1]} s | sep {r['sepMax'][1]} m")
txt.append(""); txt.append("== open / tight carrying (owner §7, §8): touches per second · footfalls between touches (median)")
for o in out["open"]: txt.append(f"   {o['section']:11s} D{o['dri']} {o['model']} | {o['touchesPerS']} /s · gap {o['medianGapS']} s · {o['footfallsBetween']} footfalls · {o['feet']}")
def ph(f):
  R = [r for r in L(f) if "error" not in r]
  return {"runs": len(R), "intersectFrames": sum(r["intersectFrames"] for r in R), "casesWithIntersections": sum(1 for r in R if r["intersectFrames"] > 0), "worstSepCm": min(min(v for v in r["sep"]["win"].values() if v is not None) for r in R),
    "pelvisAccMax_median": round(st.median([r["pelvisAcc"]["max"] for r in R])), "pelvisAccMax_worst": round(max(r["pelvisAcc"]["max"] for r in R)), "ankleAccMax_median": round(st.median([r["ankleAcc"]["max"] for r in R])), "ankleAccMax_worst": round(max(r["ankleAcc"]["max"] for r in R)),
    "pops_median": st.median([r["pops"] for r in R]), "slipMm_median": st.median([r["slipMm"] for r in R]), "slipMm_worst": max(r["slipMm"] for r in R), "instantSwaps": sum(r["instantSwaps"] for r in R)}
out["phase"] = {"before": ph("tc14_phase_before.jsonl"), "after": ph("tc14_phase_after.jsonl"), "torture99": ph("tc14_torture_99.jsonl")}
txt.append(""); txt.append("== the phasing on the same body (TECHNICAL-CONTROL-1.3's diagnostics; the efficiency cases × D 99 / 80 / 50 × seeds × sides): TECHNICAL-CONTROL-1.2's cuts with FlowBody → TECHNICAL-CONTROL-1.4 with ChopBody")
for k in out["phase"]["before"]: txt.append(f"   {k:28s} {out['phase']['before'][k]} → {out['phase']['after'][k]}")
txt.append("   TECHNICAL-CONTROL-1.3's torture set at 99 on TECHNICAL-CONTROL-1.4: " + json.dumps(out["phase"]["torture99"]))
ck = json.load(open(P("tc14_checks.json"))); n = len(ck)
out["checks"] = {k: f"{sum(1 for r in ck if r.get(k))}/{n}" for k in ["det", "bodyNeutral", "poseDet"]}; out["checks"].update({"failed": sum(1 for r in ck if r.get("failed")), "errors": sum(1 for r in ck if "error" in r)})
C = [r for r in ck if r["set"] == "carry" and "carry" in r]; cm = {}
for r in C:
  pl = r["id"].split("_S")[-1] + "/" + r["foot"]; cm.setdefault(pl, []).append(r)
def ag(R, m, f): v = [f(x["carry"][m]) for x in R if f(x["carry"][m]) is not None]; return round(st.mean(v), 3) if v else None
F = {"outside": lambda c: c["surfaces"]["outside"], "inside": lambda c: c["surfaces"]["inside"], "instep": lambda c: c["surfaces"]["instep"], "sameFoot": lambda c: c["sameFoot"], "preferredFoot": lambda c: c["prefShare"], "preferredLane": lambda c: c["lane"]["prefLaneShare"] if c["lane"] else None, "crossingsPerS": lambda c: c["lane"]["crossingsPerS"] if c["lane"] else None, "touchesPerS": lambda c: c["touchesPerS"]}
out["carryModel"] = {pl: {k: [ag(R, "tc12", f), ag(R, "tc14", f)] for k, f in F.items()} for pl, R in cm.items()}
txt.append(""); txt.append(f"== checks ({n} runs: the efficiency matrix × D 99/80/50 × seeds × sides, TECHNICAL-CONTROL-1.2's carry course × 4 players, the receive chain × 99/80/50): " + json.dumps(out["checks"]))
txt.append("== the carry model preserved (owner §6), TECHNICAL-CONTROL-1.2's carry course, TECHNICAL-CONTROL-1.2 → 1.4: " + json.dumps(out["carryModel"]))
cpu = json.load(open(P("tc14_cpu.json"))); out["cpu"] = cpu["summary"]; txt.append("== CPU: " + json.dumps(cpu["summary"]))
json.dump(out, open(P("tc14_summary.json"), "w"), indent=1); open(P("tc14_summary.txt"), "w").write("\n".join(txt) + "\n"); print("\n".join(txt[:12]))
