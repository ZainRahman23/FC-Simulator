# technical_control13/tools/tc13_summary.py — TECHNICAL-CONTROL-1.3's evidence summary: the phasing diagnostics before (TECHNICAL-CONTROL-1.2's legs) →
# after (TECHNICAL-CONTROL-1.3) over the transition torture set at 99 / 80 / 50, the second-touch kinds, the flagged contacts, the transition states,
# the checks and the CPU.   python3 tc13_summary.py <evidence dir> <sweep99.jsonl> <sweep80.jsonl> <sweep50.jsonl> <checks.json> <cpu.json>
import json, statistics as st, sys, os
ev, f99, f80, f50, fck, fcpu = sys.argv[1:7]
load = lambda f: [json.loads(l) for l in open(f) if l.strip()]
S = {99: load(f99), 80: load(f80), 50: load(f50)}
med = lambda a: round(st.median(a), 1) if a else None
def agg(rows):
  w = lambda r: min(x for x in r['sep']['win'].values() if x is not None)
  return {"cases": len(rows), "intersectFrames": sum(r['intersectFrames'] for r in rows), "intersectFramesInWindow": sum(r['intersectFramesWin'] for r in rows), "casesWithIntersections": sum(1 for r in rows if r['intersectFrames'] > 0),
    "worstSeparationCm": min(w(r) for r in rows), "pelvisAccP99_median": med([r['pelvisAcc']['p99'] for r in rows]), "pelvisAccMax_median": med([r['pelvisAcc']['max'] for r in rows]), "pelvisAccMax_worst": round(max(r['pelvisAcc']['max'] for r in rows)),
    "ankleAccP99_median": med([r['ankleAcc']['p99'] for r in rows]), "ankleAccMax_median": med([r['ankleAcc']['max'] for r in rows]), "ankleAccMax_worst": round(max(r['ankleAcc']['max'] for r in rows)),
    "kneeJerkP99_median": med([r['kneeJerk']['p99'] for r in rows]), "pops_median": med([r['pops'] for r in rows]), "pops_total": sum(r['pops'] for r in rows), "slipMm_median": med([r['slipMm'] for r in rows]), "slipMm_worst": max(r['slipMm'] for r in rows),
    "instantSupportSwaps": sum(r['instantSwaps'] for r in rows), "shortStances": sum(r['shortStances'] for r in rows), "shortSwings": sum(r['shortSwings'] for r in rows), "weightTransferMinS": min(r['weightTransferMinS'] for r in rows if r['weightTransferMinS'] is not None),
    "ikCorrectionP99Cm_median": med([r['ik']['p99Cm'] for r in rows]), "ikCorrectionMaxCm_worst": max(r['ik']['maxCm'] for r in rows),
    "handoffKneeJumpCm_worst": round(max((r['handoff'] or {'kneeJump': 0})['kneeJump'] for r in rows) * 100, 1), "handoffPelvisAcc_worst": round(max((r['handoff'] or {'pelvisAcc': 0})['pelvisAcc'] for r in rows))}
out = {"ratings": {}, "cases99": [], "secondTouch": [], "flags99": {"early": [], "late": []}, "remainingIntersections99": [], "groups99": {}}
txt = ["TECHNICAL-CONTROL-1.3 — transitions / phasing: BEFORE (TECHNICAL-CONTROL-1.2: TECHNICAL-CONTROL-1.1's legs on the carry model) → AFTER (TECHNICAL-CONTROL-1.3), the same simulation", ""]
for r0, rows in S.items():
  b = [r for r in rows if r['body'] == 'tc11' and 'error' not in r]; a = [r for r in rows if r['body'] == 'tc13' and 'error' not in r]
  hashes = sum(1 for x in a for y in b if x['spec'] == y['spec'] and x['hash'] == y['hash'])
  A, B = agg(b), agg(a); out["ratings"][r0] = {"before": A, "after": B, "gameplayIdentical": f"{hashes}/{len(a)}", "errors": sum(1 for r in rows if 'error' in r)}
  txt.append(f"== {r0}/{r0}/{r0} · {len(a)} torture cases · gameplay fingerprint identical {hashes}/{len(a)}")
  for k in A: txt.append(f"   {k:32s} {A[k]!s:>8} → {B[k]!s:>8}")
  txt.append("")
by = {}
for r in S[99]: by.setdefault(r['spec'], {})[r['body']] = r
txt.append("== per case at 99: intersect frames · worst separation cm · slip mm · pelvis acc max · ankle acc max · pops (before → after)")
for spec, v in by.items():
  a, b = v['tc11'], v['tc13']; w = lambda r: min(x for x in r['sep']['win'].values() if x is not None)
  row = {"spec": spec, "group": b['group'], "technique": b.get('tech'), "intersect": [a['intersectFrames'], b['intersectFrames']], "worstSepCm": [w(a), w(b)], "slipMm": [a['slipMm'], b['slipMm']], "pelvisAccMax": [round(a['pelvisAcc']['max']), round(b['pelvisAcc']['max'])], "ankleAccMax": [round(a['ankleAcc']['max']), round(b['ankleAcc']['max'])], "pops": [a['pops'], b['pops']], "handoffKneeJumpCm": [round(a['handoff']['kneeJump'] * 100, 1) if a['handoff'] else None, round(b['handoff']['kneeJump'] * 100, 1) if b['handoff'] else None]}
  out["cases99"].append(row); g = out["groups99"].setdefault(b['group'], {"cases": 0, "intersectBefore": 0, "intersectAfter": 0, "popsBefore": 0, "popsAfter": 0}); g["cases"] += 1; g["intersectBefore"] += a['intersectFrames']; g["intersectAfter"] += b['intersectFrames']; g["popsBefore"] += a['pops']; g["popsAfter"] += b['pops']
  txt.append(f"   {spec:34s} {row['intersect'][0]:>3} → {row['intersect'][1]:<3} {row['worstSepCm'][0]:>6} → {row['worstSepCm'][1]:<6} {row['slipMm'][0]:>5} → {row['slipMm'][1]:<5} {row['pelvisAccMax'][0]:>5} → {row['pelvisAccMax'][1]:<5} {row['ankleAccMax'][0]:>6} → {row['ankleAccMax'][1]:<6} {row['pops'][0]:>3} → {row['pops'][1]}")
  # the receive → the next carry touch: same foot or the other one, how soon
  C = b.get('contactSeq') or []
  if len(C) >= 2: out["secondTouch"].append({"spec": spec, "receive": C[0]['F'] + " " + C[0]['surface'].lower(), "next": C[1]['F'] + " " + C[1]['surface'].lower(), "kind": "same foot" if C[0]['F'] == C[1]['F'] else "opposite foot", "gapS": round(C[1]['t'] - C[0]['t'], 3), "intersectAfter": b['intersectFrames'], "popsAfter": b['pops']})
  for f in b.get('earlyFlags') or []: out["flags99"]["early"].append(dict(f, spec=spec))
  for f in b.get('lateFlagList') or []: out["flags99"]["late"].append(dict(f, spec=spec))
  if b['intersectFrames']: out["remainingIntersections99"].append({"spec": spec, "frames": b['intersectFrames'], "list": b['intersect'], "flaggedEarly": [f for f in (b.get('earlyFlags') or [])]})
txt.append(""); txt.append("== the receive → the next carry touch (at 99)")
for s in sorted(out["secondTouch"], key=lambda x: (x['kind'], x['gapS'])): txt.append(f"   {s['spec']:34s} {s['receive']:12s} → {s['next']:14s} {s['kind']:13s} +{s['gapS']:.3f} s · after: intersect {s['intersectAfter']}, pops {s['popsAfter']}")
txt.append(""); txt.append(f"== flagged at 99: early (clearance unresolved at planning) {len(out['flags99']['early'])} · late decisions {len(out['flags99']['late'])}")
for f in out["flags99"]["early"]: txt.append(f"   early  {f['spec']:34s} {f['X']} swing {f['swing']} contact {f['contact']} @ {f['tContact']} · planned at {f['plannedAt']} s · {f['cm']} cm vs {f['against']}")
for f in out["flags99"]["late"]: txt.append(f"   late   {f['spec']:34s} contact {f.get('i')} @ {f.get('t')} {f.get('F')} planned {f.get('planned')} executed {f.get('executed')} Δimpulse {f.get('dImpulse')}° · {f.get('kind')}")
for r0 in (80, 50):
  a = [r for r in S[r0] if r['body'] == 'tc13']; out["ratings"][r0]["flags"] = {"early": sum(len(r.get('earlyFlags') or []) for r in a), "late": sum(len(r.get('lateFlagList') or []) for r in a)}
txt.append(""); txt.append("== remaining intersections at 99 (after)")
for x in out["remainingIntersections99"]: txt.append(f"   {x['spec']:34s} {x['frames']} frames: " + "; ".join(f"{i['t']} {i['what']}" for i in x['list'][:6]) + (f" · flagged early: " + ", ".join(f"{f['X']} swing {f['swing']}" for f in x['flaggedEarly']) if x['flaggedEarly'] else " · not flagged"))
ck = json.load(open(fck)); n = len(ck)
out["checks"] = {k: f"{sum(1 for r in ck if r.get(k))}/{n}" for k in ["flowSimNeutral", "bodyNeutral", "det", "poseDet"]}; out["checks"].update({"failed": sum(1 for r in ck if r.get('failed')), "errors": sum(1 for r in ck if 'error' in r), "transitionStates": sum(r.get('states', 0) for r in ck), "contacts": sum(r.get('contacts', 0) for r in ck)})
txt.append(""); txt.append(f"== checks ({n} runs: the torture set × 99/80/50, TECHNICAL-CONTROL-1.2's carry course × 4 players, the receive chain): " + json.dumps(out["checks"]))
cpu = json.load(open(fcpu)); out["cpu"] = cpu["summary"]; txt.append("== CPU (ms per simulated second · worst 240 Hz step, median / max): " + json.dumps(cpu["summary"]))
json.dump(out, open(os.path.join(ev, "tc13_summary.json"), "w"), indent=1); open(os.path.join(ev, "tc13_summary.txt"), "w").write("\n".join(txt) + "\n")
st99 = {r['spec']: r['state'] for r in S[99] if r['body'] == 'tc13'}; json.dump({"note": "the transition state at every executed contact (TECHNICAL-CONTROL-1.3's FlowBody, 99/99/99): contact, the frame recorded (its first after the re-plan), support (planted / free), weight, the feet's positions and velocities (2D-local + height, m and m/s), stride phase, pelvis position and yaw, hips, the centre-of-mass estimate, the yaw rate (°/s), the touching foot's follow-through velocity", "states": st99}, open(os.path.join(ev, "tc13_transition_states.json"), "w"), indent=1)
print("\n".join(txt[:40]))
