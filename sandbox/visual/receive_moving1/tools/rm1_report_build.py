# receive_moving1/tools/rm1_report_build.py — writes review_artifacts/receive_moving1/RECEIVE_MOVING1_REPORT.md + RECEIVE_MOVING1_STATUS.json from the evidence
#   python3 rm1_report_build.py
import json, os, statistics as st
from collections import Counter, defaultdict
HERE = os.path.dirname(os.path.abspath(__file__)); RA = os.path.normpath(os.path.join(HERE, "../../../../review_artifacts/receive_moving1")); EV = lambda f: json.load(open(os.path.join(RA, "evidence", f)))
def opt(f):
  p = os.path.join(RA, "evidence", f); return json.load(open(p)) if os.path.exists(p) else None
M, B, T = EV("rm1_matrix.json"), EV("baseline_rc2_matrix.json"), opt("rm1_tried_curvecut_matrix.json")
CS, STA, NEU, CHR, REG, CPU, M714 = EV("rm1_cases.json"), EV("rm1_stationary.json"), EV("rm1_neutrality.json"), EV("rm1_chrome_node.json"), EV("regression.json"), opt("rm1_cpu.json"), opt("rm1_matrix714.json")
DET, M1 = opt("rm1_det.json"), opt("rm1_step1_keepband_matrix.json")
R11_714 = json.load(open(os.path.join(RA, "../receive11/evidence/matrix_714.json")))
R2_714 = json.load(open(os.path.join(RA, "../receive_control2/evidence/rc2_matrix714.json")))
FROZ = open(os.path.join(RA, "evidence/frozen_sha256_end_check.txt")).read().strip().split("\n")[-1].replace("# ", "") if os.path.exists(os.path.join(RA, "evidence/frozen_sha256_end_check.txt")) else "—"
med = lambda a: st.median(a) if a else None; f2 = lambda x: "—" if x is None else f"{x:.2f}"; pct = lambda a, n: f"{a}/{n} ({100*a/n:.0f} %)" if n else "—"
mv = lambda R: [r for r in R if r["rs"] != "STAND"]
def cleanBy(R, key, vals): return {v: (sum(1 for r in R if key(r) == v and r["cls5"] == "CLEAN"), sum(1 for r in R if key(r) == v)) for v in vals}
def brakeBy(R, key, vals): return {v: med([r["momentum"]["brakeRatio"] for r in R if key(r) == v and r["momentum"]["brakeRatio"] is not None]) for v in vals}
TURNS = [0, 30, 60, 90, 120, 150, 180]; RSS = ["STAND", "JOG", "RUN", "SPRINT"]; PSS = ["SLOW", "NORMAL", "FIRM", "HARD"]
cM, cB = Counter(r["cls5"] for r in mv(M)), Counter(r["cls5"] for r in mv(B)); nM = len(mv(M))
def table(R, key, vals, label):
  cl, br = cleanBy(mv(R), key, vals), brakeBy(mv(R), key, vals)
  return "\n".join([f"| {label} | " + " | ".join(str(v) for v in vals) + " |", "|---|" + "---|" * len(vals), "| CLEAN | " + " | ".join(f"{cl[v][0]}/{cl[v][1]}" for v in vals) + " |", "| speed kept (median min / before) | " + " | ".join(f2(br[v]) for v in vals) + " |"])
KB = {(r["id"], r["seed"]): r for r in B}; PAIRED = [(r, KB[(r["id"], r["seed"])]) for r in mv(M) if r["cls5"] == "CLEAN" and KB[(r["id"], r["seed"])]["cls5"] == "CLEAN"]
def bothTable(key, vals, label):
  clM, clB = cleanBy(mv(M), key, vals), cleanBy(mv(B), key, vals)
  brM = {v: med([a["momentum"]["brakeRatio"] for a, b in PAIRED if key(a) == v]) for v in vals}; brB = {v: med([b["momentum"]["brakeRatio"] for a, b in PAIRED if key(a) == v]) for v in vals}; nP = {v: sum(1 for a, b in PAIRED if key(a) == v) for v in vals}
  return "\n".join([f"| {label} | " + " | ".join(str(v) for v in vals) + " |", "|---|" + "---|" * len(vals),
    "| CLEAN · RECEIVE-MOVING-1 | " + " | ".join(f"{clM[v][0]}/{clM[v][1]}" for v in vals) + " |", "| CLEAN · RECEIVE-CONTROL-2 | " + " | ".join(f"{clB[v][0]}/{clB[v][1]}" for v in vals) + " |",
    "| speed kept · RECEIVE-MOVING-1 (paired) | " + " | ".join(f2(brM[v]) for v in vals) + " |", "| speed kept · RECEIVE-CONTROL-2 (paired) | " + " | ".join(f2(brB[v]) for v in vals) + " |", "| paired runs (CLEAN in both) | " + " | ".join(str(nP[v]) for v in vals) + " |"])
# the owner's cases (BC 99 rows for the momentum table, all ratings for the outcome)
rows = CS["rows"]; caseIds = list(dict.fromkeys(r["case"] for r in rows))
caseKeys = [(c, b) for c in caseIds for b in ([50, 99] if c == "RL_0_SPRINT_FIRM" else [None])]
def caseLine(cid, bc=None):
  Q = [r for r in rows if r["case"] == cid and (bc is None or r["bc"] == bc)]; q = next((r for r in Q if r["bc"] == (bc or 99) and r["seed"] == 1), Q[0]); m = q["momentum"]; oc = Counter(r["cls5"] for r in Q)
  return f"| {q['tag'].split(' ')[0]} | {cid} | {q['action']['fam'] if q['action'] else '—'}{(' ' + q['action'].get('surface', '')) if q['action'] and q['action'].get('surface') else ''} | {' · '.join(f'{k} {v}' for k, v in oc.items())} | {f2(m['vBefore'])} | {f2(m['vMin'])} | {f2(m['vContact'])} | {f2(m['v025'])} | {f2(m['v050'])} | {f2(m['v100'])} | {m['headingBefore']}° → {m['headingAfter']}° | {f2(m['ballAfter']['dist']) if m['ballAfter'] else '—'} | {f2(m['tStable'])} |"
def bcLine(cid):
  Q = [r for r in rows if r["case"] == cid]; cells = []
  for b in [50, 70, 80, 90, 99]:
    R = [r for r in Q if r["bc"] == b]
    if not R: cells.append("—"); continue
    oc = Counter(r["cls5"] for r in R); de = med([abs(r["touch"]["dirErr"]) for r in R if r["touch"]]); se = med([abs(r["touch"]["speedErr"]) for r in R if r["touch"]]); v = med([r["momentum"]["vContact"] for r in R if r["momentum"]["vContact"] is not None])
    cells.append(f"{' '.join(f'{k[:3]} {n}' for k, n in oc.items())} · |dir| {f2(de)}° · |speed| {f2(se)} m/s · v@contact {f2(v)}")
  return f"| {cid} | " + " | ".join(cells) + " |"
fams = Counter((r["action"]["fam"], r["action"]["surface"]) for r in mv(M) if r["action"]); famLine = ", ".join(f"{a} {b.lower()} {n}" for (a, b), n in fams.most_common())
s714 = None
if M714:
  k2 = {(r["id"], r["seed"]): r for r in R2_714}; mm = [r for r in M714 if (r["id"], r["seed"]) in k2]
  def by(rows_, mode): return Counter(r["cls5"] for r in rows_ if r["rc2"]["mode"] == mode)
  k1 = {(r["id"], r["seed"]): r for r in R11_714}; mv11 = Counter(k1[(r["id"], r["seed"])]["cls5"] for r in mm if r["rc2"]["mode"] == "moving" and (r["id"], r["seed"]) in k1)
  s714 = (by(mm, "moving"), by([k2[(r["id"], r["seed"])] for r in mm], "moving"), by(mm, "stationary"), by([k2[(r["id"], r["seed"])] for r in mm], "stationary"), sum(1 for r in mm if r["rc2"]["mode"] == "moving"), mv11)
fc = lambda c: " · ".join(f"{k} {c[k]}" for k in ["CLEAN", "TAKEN", "RECEIVED", "RECOVERED", "MISSED"] if c.get(k))
bodyBC = CS["bodyBeforeContactIdenticalAcrossBC"]
cpuLine = (f"One process, nothing else running (the second of two passes over the owner's cases at BC 70): the receive phase (the approach, the action, the TURN-1.2 run-out until DRIBBLE-V1 takes the ball) {CPU['msPerSimSec']:.0f} ms per simulated second (median of the cases), DRIBBLE-V1 after it {CPU['afterPerSimSec']:.0f} ms per simulated second, the worst single step {CPU['worstStep']:.1f} ms; the moving planner {CPU['rxPlanMedian']:.1f} ms per receive (median; max {CPU['rxPlanMax']:.1f})" if CPU else "see evidence/rm1_cpu.json")
detLine = (f"""Matched counterfactuals on the moving cases (BC 50 / 70 / 80 / 90 / 99 × seeds 1–3):
- the same draws {DET['matched']['sameDraws']}/{DET['matched']['sets']};
- the same key {DET['matched']['sameKey']}/{DET['matched']['sets']};
- the same run up to the contact {DET['matched']['sameRun']}/{DET['matched']['sets']}.

Another seed draws differently {DET['seeds']['differ']}/{DET['seeds']['pairs']}. The key does not include the scenario, so the same seed, receiver and event draw the
same tendencies in different cases, as in RECEIVE-CONTROL-2.""" if DET else "")
AB = opt("rm1_prepband_ab.json")
GQ = lambda b: [r for r in rows if r["case"] == "RL_0_SPRINT_FIRM" and r["bc"] == b and r["touch"]]
ghLine = f"{f2(med([abs(r['touch']['dirErr']) for r in GQ(50)]))}° at BC 50 vs {f2(med([abs(r['touch']['dirErr']) for r in GQ(99)]))}° at BC 99, |speed error| {f2(med([abs(r['touch']['speedErr']) for r in GQ(50)]))} vs {f2(med([abs(r['touch']['speedErr']) for r in GQ(99)]))} m/s"
abTable = ("| case (BC 99, seeds 1 – 3) | speed kept · step 1 (±6 % band) | speed kept · final |\n|---|---|---|\n" + "\n".join(f"| {r['tag'].split(' ')[0]} {r['case']} | {' / '.join(f2(x['keep']) for x in r['step1'])} | {' / '.join(f2(x['keep']) for x in r['final'])} |" for r in AB["rows"])) if AB else ""
prep0 = f2(med([r['momentum']['brakeRatio'] for r in mv(M1) if r['turn'] == 0])) if M1 else "—"
prep30 = f2(med([r['momentum']['brakeRatio'] for r in mv(M1) if abs(r['turn']) == 30])) if M1 else "—"
prepClean = Counter(r['cls5'] for r in mv(M1))['CLEAN'] if M1 else "—"
md = f"""# RECEIVE-MOVING-1 — receiving while moving (QUEUE #2)

**Status: presented for review — NOT frozen (RECEIVE-V1 is not frozen).** The owner's instruction is saved verbatim in `sources/`. Built as its own phase on QUEUE #1's
integrated pipeline (RECEIVE-CONTROL-2), whose stationary receives it leaves bit-identical.

I cannot play video in real time: the visual checks here come from stills taken from the clips.

Review page (local only): `review/RECEIVE_MOVING1_REVIEW.html` · lab: `sandbox/visual/receive_moving1.html` · code: `sandbox/visual/receive_moving1/`.

## What was found first
A first exploratory run on the integrated pipeline, with RECEIVE-CONTROL-1.1's pass solver, made moving receives look like universal braking: sprinters braked hard
into straight receives. Most of that was the TEST. For a 7.8 m/s runner that solver often finds no lead, so the ball arrives behind him and he has to brake.
That exploratory run is not kept as evidence. The movement matrix uses passes weighted for the runner (`rm1_cases.js`: solved through the ball kernel to arrive at
his projected position at the named speed). With those passes, RECEIVE-CONTROL-2 already kept {f2(med([r['momentum']['brakeRatio'] for r in mv(B) if r['turn'] == 0 and r['momentum']['brakeRatio'] is not None]))} of the
pace on a 0° receive (median).
The real problems were elsewhere:
- large turns at speed found no action (the planner required the body to shed the turn's speed before the contact): MISSED {cB.get('MISSED', 0)} of {len(mv(B))};
- many moving receives were lost at the DRIBBLE-V1 takeover: TAKEN {cB.get('TAKEN', 0)};
- the approach left its speed correction to the last 0.8 s.

A first redesign of the speed law (curve-then-cut) was TRIED and REJECTED: it lowered both CLEAN and the pace
({'CLEAN ' + str(Counter(r['cls5'] for r in mv(T))['CLEAN']) + '/' + str(len(mv(T))) if T else 'evidence/rm1_tried_curvecut_*'}; kept off behind `RM.curveCut`).

## 1. Moving-receive architecture
`ReceiveSimM` (`rm1_core.js`) extends QUEUE #1's `ReceiveSim2`. Standing receives are RECEIVE-CONTROL-2's (bit-identical, §20). A moving receiver's action is
RECEIVE-CONTROL-1.1's moving vocabulary (touch into stride, open-body turn, through-stance turn) planned by its planner (RECEIVE-CONTROL-1.1's methods copied, the
changes marked) and executed by the unified Ball Control model (RECEIVE-CONTROL-2). RECEIVE-MOVING-1 changes:
- **late redirect** — a moving receiver may take the ball before his body has shed the turn's speed: ball-touch capability and body momentum redirection are separate;
  the turn's cost is paid AFTER the contact by the action's exit path (its duration ≥ the velocity change / 9 m/s², the overrun, the plant, the new line);
- **the moving handoff** — TURN-1.2 takes the body at the action's handoff touchdown; DRIBBLE-V1 takes the ball at the **takeover window**: when the ball is on the
  runner's line, its takeover distance ahead (± 0.6 m), within 0.25 m of the line and not running away (≥ 0.3 s, ≤ 1.6 s after TURN-1.2 took the body); meanwhile
  the run-out steers onto the ball's actual line (≤ 20°); the first touch is solved for that moment (the runner modelled up to the requested pace);
- **velocity-first interception** — the meeting that keeps the run's velocity, not the earliest;
- **into space** — a standing receiver whose pass runs beyond the stationary receive's reach runs onto it with the moving actions.

## 2. Player-motion inputs
The receiver's position, velocity (speed and heading), facing and stride phase (TURN-1.2's legs: the foot that just landed, the stride period at his speed); the
desired exit direction and pace; the free ball's prediction. Movement groups (RUN-1 / TURN-1.2 speeds): STAND 0, WALK 1.5, JOG 3.0, RUN 5.5, SPRINT 7.8, ALL-OUT 9.5 —
test groups of one continuous model (no per-speed system).

## 3. Stride-aware contact
An action starts at a TURN-1.2 touchdown; its footwork is fitted from that stride (RECEIVE-CONTROL-1.1's planSteps: the stride interval at his speed, the support
foot's plant 0.05 – 0.24 s before the contact, the contact foot's swing). The contact foot is one of the family's feet whose swing fits the contact tick without an
instant swap — strides are lengthened / shortened within 0.17 – 0.50 s to fit it.

## 4. Preparation
From the strike, the APPROACH steers to the meeting and follows its speed need: RECEIVE-MOVING-1's `RM.prepBand = 0`. RECEIVE-CONTROL-1.1 kept the pace whenever
the need was within ±6 %, which left the whole correction to the last 0.8 s. A / B on the owner's cases (`evidence/rm1_prepband_ab.json`):

{abTable}

The matrix medians barely move (0° {prep0} → {f2(med([r['momentum']['brakeRatio'] for r in mv(M) if r['turn'] == 0]))}, 30° {prep30} → {f2(med([r['momentum']['brakeRatio'] for r in mv(M) if abs(r['turn']) == 30]))}; moving CLEAN {prepClean} → {cM['CLEAN']}). The gain is where the dip was deepest: passes aimed at the
body that need a late check. A pass into his stride needs no correction, and B′ seed 1 keeps slightly less (0.97 → 0.91).

The ACTION is planned once the meeting is within 1.05 s (the preparation window: the contact 0.26 – 1.17 s after the action starts, at a TURN-1.2 touchdown); a
standing receiver plans it from the strike. There is no teleport: the body path to the contact is a bounded-acceleration curve (≤ 9.5 m/s² for a moving receiver,
≤ 620°/s rotation). Too little preparation time rejects an action (`prep-accel`, `rot-prep`, `too-late`). Its cost shows in the speed dip before the contact: the
later the correction, the deeper the dip.

## 5. Touch into stride
The ideal first touch sends the ball to where the runner will be: on his line, HANDOFF_AHEAD(speed) in front of him when DRIBBLE-V1 takes it (1.2 m at 2.5 m/s …
2.4 m at 9.5 m/s) — a sprinter's first touch goes further than a jogger's.

Case A (a sprinter at 7.8 m/s, pass from behind-left): 7.8 → {f2(next(r['momentum']['vContact'] for r in rows if r['case']=='RL_0_SPRINT_NORMAL' and r['bc']==99 and r['seed']==1))} m/s at the contact → 7.8 by +0.5 s. The pass is aimed at his
body, and the stride touch meets the ball 0.42 m ahead of him, so he gives up 0.42 m: a small check. A′, the same pass played into his stride (0.42 m ahead of his body):
{f2(next(r['momentum']['vContact'] for r in rows if r['case']=='RL_0_SPRINT_NORMAL_IS' and r['bc']==99 and r['seed']==1))} m/s at the contact, with no check.

## 6. – 9. Angled receives, moving half-turn, outside-of-foot turn, through-stance turn
The moving actions used (all receives of the movement matrix): {famLine}. The moving outside-of-foot turn is the open-body turn played with the outside of the near
foot (its preferred surface); the moving through-stance turn plays the far foot's inside across or behind the standing leg.

## 10. Momentum redirection
Before the contact, the contact speed is the timing solution (the minimum-acceleration path to the meeting), bounded per action:
- a touch into stride: between 0.45 × the run speed and the run speed + 1 m/s, capped by TURN-1's angle–speed law × 1.25. Braking is scored, so the planner prefers a
  contact tick that keeps the pace;
- a turning action: at up to the run speed (the late redirect), or braking toward TURN-1's entry speed in the last second where the score finds that cheaper.

After the contact comes the turn's real cost: the exit path from the contact velocity to the exit line (≤ 9 m/s² mean, ≤ 620°/s), i.e. the overrun, the plant
and the new line. The momentum profile: the median of the minimum speed / the speed before. The speed-kept rows are PAIRED, i.e. the same runs, CLEAN in both pipelines. An unpaired
comparison would mislead: RECEIVE-CONTROL-2's clean runs are mostly the small turns, because it failed the large ones.

{bothTable(lambda r: abs(r['turn']), TURNS, 'turn °')}

## 11. Sprint receive · 12. Sprint 180° reversal
| case | | action | outcome (BC 50 – 99, seeds 1 – 3) | v before | v min | v contact | +0.25 | +0.50 | +1.00 | heading | ball distance +0.5 s | stable (s after contact) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(caseLine(c, b) for c, b in caseKeys) + f"""

A full reversal at a sprint (F): the contact at speed, then the overrun — the ball behind him, his speed falls to near zero before he can go the other way: the
original velocity cannot be preserved.

## 13. Ball Control while moving · 14. BC 50 / 70 / 80 / 90 / 99
Ball Control never enters the plan: the body's run before the contact is identical at every rating ({bodyBC['same']}/{bodyBC['sets']} case × seed sets). It changes the touch:

| case | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|
""" + "\n".join(bcLine(c) for c in caseIds if c not in ("RL_0_SPRINT_FIRM",) and any(r['case'] == c and r['bc'] == 50 for r in rows)) + f"""

G / H (a firm pass to a sprinter, BC 50 vs 99, the same draws): the same run and the same contact speed. Only the touch differs: median |direction error| {ghLine}.

## 15. – 17. The movement matrix (receiver × pass × turn × pass direction, seeds 1–2: {len(M)} runs)
Moving receivers: **CLEAN {cM['CLEAN']}/{nM}** (RECEIVE-CONTROL-2: {cB['CLEAN']}/{len(mv(B))}) · TAKEN {cM.get('TAKEN',0)} ({cB.get('TAKEN',0)}) · MISSED {cM.get('MISSED',0)} ({cB.get('MISSED',0)}).

**Movement speed**

{bothTable(lambda r: r['rs'], ['JOG', 'RUN', 'SPRINT'], 'receiver')}

**Incoming ball speed** (at the receiver: SLOW 5, NORMAL 9, FIRM 13, HARD 17 m/s). A slow pass is slower than a running receiver, so he must wait for it; that is
the low speed kept in the SLOW column.

{bothTable(lambda r: r['ps'], PSS, 'pass')}

**Turn angle** — §10.

## 18. Player speed before / after
In §10 – §12 (the owner's §31 metrics per case: speed before, minimum, at the contact, +0.25 / +0.50 / +1.00 s, heading before → after, the ball's distance 0.5 s
after the contact, the time to stable continuation).

## 19. DRIBBLE-V1 handoff
TURN-1.2 at the action's handoff touchdown (no speed reset: the action's exit speed), DRIBBLE-V1 at the takeover window with the receive touch as its last touch; the
run-out steers onto the ball's line. The remaining TAKEN runs ({cM.get('TAKEN',0)} of {nM}) are takeovers DRIBBLE-V1 does not complete (no dribble touch — the frozen
dribbler's pocket; by turn: {dict(sorted(Counter(abs(r['turn']) for r in mv(M) if r['cls5'] == 'TAKEN').items()))}).

## 20. Stationary regression
RECEIVE-CONTROL-2's integrated cases and its standing matrix rows through ReceiveSimM: **{STA['identical']}/{STA['runs']} bit-identical**. RECEIVE-CONTROL-1.1's
matrix of record on RECEIVE-MOVING-1: """ + (f"standing {fc(s714[2])} (RECEIVE-CONTROL-2 {fc(s714[3])}); moving ({s714[4]} runs) **{fc(s714[0])}** (RECEIVE-CONTROL-2 {fc(s714[1])}; RECEIVE-CONTROL-1.1 {fc(s714[5])}). Its remaining misses are mostly joggers turning 90° from a pass struck from behind by RECEIVE-CONTROL-1.1's pass solver (MISSED-LATE)." if s714 else "see evidence/rm1_matrix714.json.") + f"""
Protected files {FROZ}; regression in one process: DRIBBLE-V1 {REG['dribbleBeforeEqualsAfter']}/{REG['dribbleRuns']} (evidence {REG['dribbleEvidenceMatch']}/{REG['dribbleEvidenceCompared']}),
RECEIVE-CONTROL-1.1 {REG['receive11BeforeEqualsAfter']}/{REG['receive11Cases']}, RECEIVE-TURN-1 {REG['turnBeforeEqualsAfter']}/{REG['turnEpisodes']}, RECEIVE-KILL {REG['killBeforeEqualsAfter']}/{REG['killEpisodes']} with {REG['integratedRunsBetween']} moving receives between; D1 / RX / RXE deeply unchanged: {'yes' if REG['frozenParamsUnchanged'] else 'NO'}.

## 21. Animation ON / OFF · 22. Determinism
Animation on / off **{NEU['neutral']}/{NEU['runs']}** identical ({NEU['poses']:,} posed frames); replay **{NEU['deterministic']}/{NEU['runs']}**; Chrome = Node **{CHR['identical']}/{CHR['total']}**.
The draws use RECEIVE-CONTROL-2's architecture: key = seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension. The receiver's speed
changes the geometry and the difficulty, never the key. {detLine}

## 23. Performance
{cpuLine}.

## 24. Review / lab links (local only — the character is a real player's model)
- Review: `http://127.0.0.1:8361/review_artifacts/receive_moving1/review/RECEIVE_MOVING1_REVIEW.html`
- Lab: `http://127.0.0.1:8361/sandbox/visual/receive_moving1.html?case=RL_0_SPRINT_NORMAL` (ids DIR_TURN[R|L]_RS_PS[_IS][_BC##], `&seed=`, `&single=A&A=side`)

## 25. Known limitations
- The moving body is RECEIVE-CONTROL-1.1's placeholder body on the action's stride-fitted footwork (stride-aware; not RECEIVE-TURN-1.1's human body); TURN-1.2's real
  locomotion before the action and after the handoff.
- DRIBBLE-V1's takeover still fails in {cM.get('TAKEN',0)} of {nM} moving receives (120° – 150°: {sum(1 for r in mv(M) if r['cls5'] == 'TAKEN' and abs(r['turn']) in (120, 150))}). This is the frozen dribbler's pocket; the takeover window reduces it.
- A pass aimed at his body, from the side, makes a runner check his stride. Case B (30°) kept {f2(next(r['momentum']['brakeRatio'] for r in rows if r['case']=='L_30_RUN_NORMAL' and r['bc']==99 and r['seed']==1))} of the pace;
  with the pass into his stride (B′), {f2(next(r['momentum']['brakeRatio'] for r in rows if r['case']=='L_30_RUN_NORMAL_IS' and r['bc']==99 and r['seed']==1))}. The stride touch has no contact
  closer to the body than 0.40 m ahead (RECEIVE-CONTROL-1.1's family geometry).
- {cM.get('MISSED',0)} moving receives of the movement matrix find no action. They are firm / hard passes with a 60° turn from behind-left, and 150° – 180° turns at a sprint.
- No Agility (the extension point: RX.omegaMax / the exit acceleration and TURN-1's entry speeds are the body-reorientation capability a rating would scale), no
  Dribbling attribute, no pressure.
- Moving receives use RECEIVE-CONTROL-1.1's moving vocabulary (adapted), not RECEIVE-TURN-1's stationary techniques re-authored for running.
"""
open(os.path.join(RA, "RECEIVE_MOVING1_REPORT.md"), "w").write(md)
stt = {"milestone": "RECEIVE-MOVING-1", "queue": "QUEUE #2", "status": "presented for review", "frozen": False, "movingClean": f"{cM['CLEAN']}/{nM}", "baselineMovingClean": f"{cB['CLEAN']}/{len(mv(B))}", "stationaryIdentical": f"{STA['identical']}/{STA['runs']}",
  "neutrality": f"{NEU['neutral']}/{NEU['runs']}", "chromeNode": f"{CHR['identical']}/{CHR['total']}", "bodyBeforeContactIdenticalAcrossBC": f"{bodyBC['same']}/{bodyBC['sets']}", "protectedFiles": FROZ, "next": "owner review"}
json.dump(stt, open(os.path.join(RA, "RECEIVE_MOVING1_STATUS.json"), "w"), indent=1); print("report", len(md))
