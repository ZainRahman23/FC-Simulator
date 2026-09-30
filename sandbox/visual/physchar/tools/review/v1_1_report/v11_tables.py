# V1.1 anatomy report tables — generated from review_artifacts/physical_character_v1/v1_1/json/final/*.json (+ the approved results/*.json)
import json, sys, os, statistics as st
F = sys.argv[1]; APP = sys.argv[2]; out = []
P = lambda *a: out.append(" ".join(str(x) for x in a))
J = lambda f: json.load(open(os.path.join(F, f)))
key = {'gatea': 'drop', 'gateb': 'test', 'gatec1': 'test', 'gatec2': 'test'}
def hashes(d, g): return {r[key[g]]: r['hash'] for r in d['results']}
# ── preservation ──
P("### V1 preservation (every approved test re-run after all V1.1 code changes)\n")
P("| gate | re-run | identical hashes to the approved evidence | deterministic |"); P("|---|---|---|---|")
for g, f, lab in [('gatea', 'pres_gatea_V1.json', 'A — 5 drops'), ('gateb', 'pres_gateb_V1.json', 'B — all 20'), ('gatec1', 'pres_gatec1_V1.json', 'C1 — all 59'), ('gatec2', 'gatec2_V1.json', 'C2 — 13 approved (+ new B_hold_R)')]:
    a = hashes(json.load(open(os.path.join(APP, f'{g}_final_240x1.json'))), g); d = J(f); b = hashes(d, g); com = [k for k in b if k in a]
    P(f"| {lab} | {f} | **{sum(a[k] == b[k] for k in com)}/{len(com)}** | {all(r.get('deterministic', True) for r in d['results'])} |")
# ── Gate A ──
A = {c: J(f'gatea_{c}.json')['results'] for c in ['V1', 'V1.1']}
P("\n### Gate A — passive drops (240 Hz, Gate A world, ×3)\n")
P("| drop | body | turf pen mm | self pen mm | joint sep mm | limit ° | pop mm | E+ max J | sleep s | worst (self · limit · sep) | det |"); P("|---|---|---|---|---|---|---|---|---|---|---|")
for i in range(5):
    for c in ['V1', 'V1.1']:
        r = A[c][i]; e = r['energyGain']; e = e.get('maxJ') if isinstance(e, dict) else e
        w = f"{(r.get('maxSelfPenAt') or {}).get('pair', '-')} · {(r.get('maxLimitAt') or {}).get('joint', '-')} · {(r.get('maxAnchorAt') or {}).get('joint', '-')}"
        P(f"| {r['drop'] if c == 'V1' else ''} | {c} | {r['maxGroundPenMm']} | {r['maxSelfPenMm']} | {r['maxAnchorErrMm']} | {r['maxLimitViolDeg']} | {r['maxPopMm']} | {e} | {r['sleepT']} | {w} | {r['deterministic']} |")
# ── Gate B ──
B = {c: {r['test']: r for r in J(f'gateb_{c}.json')['results']} for c in ['V1', 'V1.1']}
P("\n### Gate B — pose tracking · blocked limb · disturbance (240 Hz, ×3)\n")
P("| test | body | err RMS ° | peak ° (joint) | sat ms | pelvis end mm / ° | extra | det |"); P("|---|---|---|---|---|---|---|---|")
for t in ['A', 'C', 'E', 'F_chest']:
    for c in ['V1', 'V1.1']:
        r = B[c][t]; ex = ''
        if r.get('block'): bl = r['block']; ex = f"post force max {bl['maxForceN']} N · while blocked: hip err {bl['whileBlocked']['hipErrDeg']}°, hip sat {bl['whileBlocked']['hipSatPct']} %, contact {bl['whileBlocked']['contactForceN']} N · recover ≤5° in {bl['afterRemoval']['timeToWithin5degS']} s"
        if r.get('disturbance'): di = r['disturbance']; ex = f"peak RMS {di['peakRmsDeg']}° · recovery {di['recoveryS']} s · pelvis {di['pelvisMaxDisplacementMm']} mm"
        P(f"| {t if c == 'V1' else ''} | {c} | {r['errRmsDeg']:.2f} | {r['errPeakRmsDeg']:.1f} ({r['errPeakJoint']}) | {r['satMsTotal']} | {r['pelvisEnd']['posMm']} / {r['pelvisEnd']['angDeg']} | {ex} | {r['deterministic']} |")
# ── C1 ──
C = {c: {r['test']: r for r in J(f'gatec1_{c}.json')['results']} for c in ['V1', 'V1.1']}
P("\n### Gate C1 — unsupported balance (240 Hz, ×3)\n")
P("| test | body | outcome | max class | recovery s | COM exc cm | ξ min cm | trunk max ° | quiet sway mm | ankle effort % | hip peak effort | sat ms | det |"); P("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for t in C['V1']:
    for c in ['V1', 'V1.1']:
        r = C[c][t]; w = r['whole']; q = r.get('quiet') or {}; js = {j['joint']: j for j in r['joints']}
        xi = w['xiMarginMinCm']; xi = '—' if xi is not None and xi < -1000 else xi
        P(f"| {t if c == 'V1' else ''} | {c} | {r['outcome']} | {r['maxClass']} | {r.get('recoveryS') or '—'} | {w['comMaxExcursionCm']} | {xi} | {w['trunkTiltMaxDeg']} | {q.get('swayRmsMm', '—')} | {q.get('ankleEffortPct', '—')} | {max(js['hip_L']['peakEff'], js['hip_R']['peakEff'])} | {sum(j['satMs'] for j in r['joints'])} | {r['deterministic']} |")
# ── C2 ──
V = [('V1', 'gatec2_V1.json'), ('V1.1 raw', 'gatec2_V1.1_raw.json'), ('V1.1 + R1·R2', 'gatec2_V1.1_recal.json'), ('V1.1 + R1·R2 + D1 (diagnostic)', 'gatec2_V1.1_recal_diag.json')]
D = {k: {r['test']: r for r in J(f)['results']} for k, f in V}
P("\n### Gate C2 — every test under the four configurations (240 Hz, ×3)\n")
P("| test | " + " | ".join(k for k, _ in V) + " |"); P("|---|" + "---|" * len(V))
def cell(r):
    qs = [q for q in r['requests'] if q['type'] != 'shift']
    if not qs: return f"{len(r['requests'])} shifts DONE" + (" · FELL" if r['fell'] else "")
    s = " · ".join(q['status'] + (f" ({q['why'].split(':')[0][:48]}{': ' + q['why'].split(':')[1].split(',')[0].strip() if ':' in q['why'] and q['status'] == 'REJECTED' else ''})" if q['status'] != 'DONE' else '') for q in qs)
    return s + (" · **FELL**" if r['fell'] else "") + ("" if r['deterministic'] else " · NONDET")
for t in D['V1']: P(f"| {t} | " + " | ".join(cell(D[k][t]) for k, _ in V) + " |")
# ── single leg ──
P("\n### Single-leg stance (B_hold_R: shift onto L, lift R 8 cm, hold 20 s)\n")
P("| quantity | V1 (approved controller) | V1.1 + R1·R2 + D1 | V1.1 raw / + R1·R2 |"); P("|---|---|---|---|")
v1 = D['V1']['B_hold_R']; v11 = D['V1.1 + R1·R2 + D1 (diagnostic)']['B_hold_R']; raw = D['V1.1 raw']['B_hold_R']
s1 = [q for q in v1['requests'] if q['type'] != 'shift'][0]; s2 = [q for q in v11['requests'] if q['type'] != 'shift'][0]; sr = [q for q in raw['requests'] if q['type'] != 'shift'][0]
L1, L2, LR = v1['lean'], v11['lean'], raw['lean']; g1, g2 = s1.get('singleLeg') or {}, s2.get('singleLeg') or {}
rows = [("hip joint-centre half spacing d", f"{L1['hipHalfWidth']*100:.1f} cm", f"{L2['hipHalfWidth']*100:.1f} cm", f"{LR['hipHalfWidth']*100:.1f} cm"),
        ("free-leg COM lateral offset e (statics)", f"{L1['legComOffset']*100:.1f} cm", f"{L2['legComOffset']*100:.2f} cm", f"{LR['legComOffset']*100:.2f} cm"),
        ("static hip abduction demand τ0 (upright trunk)", f"{L1['tau0']:.0f} N·m ({100*L1['tau0']/L1['cap']:.0f} % of {L1['cap']})", f"{L2['tau0']:.0f} N·m ({100*L2['tau0']/L2['cap']:.0f} %)", f"{LR['tau0']:.0f} N·m"),
        ("planned trunk lean (to bring τ to the 70 % target)", f"{L1['leanDeg']:.1f}°", f"{L2['leanDeg']:.1f}°", f"{LR['leanDeg']:.1f}°"),
        ("request outcome", s1['status'], s2['status'], sr['status'] + f" ({sr['why'][:60]})"),
        ("held (s) / held to plan", f"{g1.get('holdS')} / {g1.get('heldToPlan')}", f"{g2.get('holdS')} / {g2.get('heldToPlan')}", "never lifted"),
        ("measured stance-hip abduction torque mean / max", f"{g1.get('hipAbductionNm', {}).get('mean')} / {g1.get('hipAbductionNm', {}).get('max')} N·m", f"{g2.get('hipAbductionNm', {}).get('mean')} / {g2.get('hipAbductionNm', {}).get('max')} N·m", "—"),
        ("… as % of the hip Z limit · vector effort · saturated", f"{g1.get('hipAbductionPctOfLimit')} % · {g1.get('hipEffortPct')} % · {g1.get('hipSatPct')} %", f"{g2.get('hipAbductionPctOfLimit')} % · {g2.get('hipEffortPct')} % · {g2.get('hipSatPct')} %", "—"),
        ("COM lateral of the stance ankle mean (min…max)", f"{g1.get('comLateralOfStanceAnkleCm', {}).get('mean')} ({g1.get('comLateralOfStanceAnkleCm', {}).get('min')}…{g1.get('comLateralOfStanceAnkleCm', {}).get('max')}) cm", f"{g2.get('comLateralOfStanceAnkleCm', {}).get('mean')} ({g2.get('comLateralOfStanceAnkleCm', {}).get('min')}…{g2.get('comLateralOfStanceAnkleCm', {}).get('max')}) cm", "—"),
        ("pelvis roll mean (min…max)", f"{g1.get('pelvisRollDeg', {}).get('mean')}° ({g1.get('pelvisRollDeg', {}).get('min')}…{g1.get('pelvisRollDeg', {}).get('max')})", f"{g2.get('pelvisRollDeg', {}).get('mean')}° ({g2.get('pelvisRollDeg', {}).get('min')}…{g2.get('pelvisRollDeg', {}).get('max')})", "—"),
        ("trunk lateral lean (measured, mean)", f"{g1.get('trunkLateralLeanDeg', {}).get('mean')}°", f"{g2.get('trunkLateralLeanDeg', {}).get('mean')}°", "—"),
        ("ξ margin mean / min", f"{g1.get('xiMarginCm', {}).get('mean')} / {g1.get('xiMarginCm', {}).get('min')} cm", f"{g2.get('xiMarginCm', {}).get('mean')} / {g2.get('xiMarginCm', {}).get('min')} cm", "—"),
        ("saturation during the request (joint: ms)", ", ".join(f"{k} {v}" for k, v in s1['metrics']['saturationMs'].items()), ", ".join(f"{k} {v}" for k, v in s2['metrics']['saturationMs'].items()), ", ".join(f"{k} {v}" for k, v in sr['metrics']['saturationMs'].items()) or "—"),
        ("joint-limit margin (joint)", f"{s1['metrics']['jointLimitMarginDeg']}° ({s1['metrics']['jointLimitMarginJoint']})", f"{s2['metrics']['jointLimitMarginDeg']}° ({s2['metrics']['jointLimitMarginJoint']})", f"{sr['metrics']['jointLimitMarginDeg']}° ({sr['metrics']['jointLimitMarginJoint']})")]
for r in rows: P("| " + " | ".join(r) + " |")
# ── ankle / placement ──
P("\n### Ankle and placement (V1 vs V1.1 + R1·R2 + D1 — the only V1.1 configuration that lifts a foot)\n")
P("| test | body | requested → feasible (corr.) | touchdown centre · landing err | stance DF max / limit (min margin, at stop) | swing DF max / limit (min margin, at stop) | outcome |"); P("|---|---|---|---|---|---|---|")
f2 = lambda v: f"({v[0]:.3f}, {v[1]:.3f})" if v else "—"
for t in ['B_lift_R', 'B_lift_L', 'C_lat_R', 'D_fwd_R', 'E_bwd_R', 'F_onfoot', 'F_cross', 'G_far', 'G_far_side', 'H_uneven', 'I_block']:
    for k in ['V1', 'V1.1 + R1·R2 + D1 (diagnostic)']:
        q = [q for q in D[k][t]['requests'] if q['type'] != 'shift'][0]; an = q['metrics'].get('ankle') or {}; s_, w_ = an.get('stance') or {}, an.get('swing') or {}; td = q.get('touchdown') or {}
        P(f"| {t if k == 'V1' else ''} | {'V1' if k == 'V1' else 'V1.1+R+D1'} | {f2(q.get('requested'))} → {f2(q.get('feasible'))} ({q.get('correctedCm')} cm) | {f2(td.get('actualCenter'))} · {td.get('landingErrorCm', '—')} cm | {s_.get('maxDorsiDeg')}° / {s_.get('limitDeg')}° ({s_.get('minMarginDeg')}°, {s_.get('atStopMs')} ms) | {w_.get('maxDorsiDeg')}° / {w_.get('limitDeg')}° ({w_.get('minMarginDeg')}°, {w_.get('atStopMs')} ms) | {q['status']} |")
# transfer (no lift) ankle for raw/recal
P("\n*V1.1 raw / + R1·R2 (transfers rejected, no lift): stance-ankle dorsiflexion during the transfer*\n")
P("| test | config | stance DF max / limit (margin) | swing load at rejection |"); P("|---|---|---|---|")
for k in ['V1.1 raw', 'V1.1 + R1·R2']:
    q = [q for q in D[k]['B_lift_R']['requests'] if q['type'] != 'shift'][0]; an = (q['metrics'].get('ankle') or {}).get('stance') or {}
    P(f"| B_lift_R | {k} | {an.get('maxDorsiDeg')}° / {an.get('limitDeg')}° ({an.get('minMarginDeg')}°) | {q['why'].split('swing load ')[1].split(',')[0] if 'swing load' in q['why'] else '—'} |")
# ── CPU ──
P("\n### Performance (mean ms per 60 Hz frame = 4 physics steps + sensing + controller, Node, one process)\n")
P("| gate | V1 | V1.1 | V1.1 + R1·R2 | V1.1 + R1·R2 + D1 |"); P("|---|---|---|---|---|")
def cpu_a(f): return st.mean(r['cpuMsPerFrame'] for r in J(f)['results'])
def cpu_b(f): return st.mean(r['cpuMsPerFrame'] for r in J(f)['results'])
def cpu_c(f): return st.mean((r['cpu']['msPerFrame'] if isinstance(r['cpu'], dict) else r['cpu']) for r in J(f)['results'])
P(f"| A | {cpu_a('gatea_V1.json'):.3f} | {cpu_a('gatea_V1.1.json'):.3f} | — | — |")
P(f"| B | {cpu_b('gateb_V1.json'):.3f} | {cpu_b('gateb_V1.1.json'):.3f} | — | — |")
P(f"| C1 | {cpu_c('gatec1_V1.json'):.3f} | {cpu_c('gatec1_V1.1.json'):.3f} | — | — |")
P(f"| C2 | {cpu_c('gatec2_V1.json'):.3f} | {cpu_c('gatec2_V1.1_raw.json'):.3f} | {cpu_c('gatec2_V1.1_recal.json'):.3f} | {cpu_c('gatec2_V1.1_recal_diag.json'):.3f} |")
# ── determinism ──
tot = det = 0
for f in os.listdir(F):
    if f.endswith('.json'):
        for r in J(f)['results']: tot += 1; det += bool(r.get('deterministic', True))
P(f"\n**Determinism:** {det}/{tot} result rows deterministic across their repeats (×3 for every comparison set).")
print("\n".join(out))
