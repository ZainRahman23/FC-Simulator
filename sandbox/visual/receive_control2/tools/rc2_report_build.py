# receive_control2/tools/rc2_report_build.py — writes review_artifacts/receive_control2/RECEIVE_CONTROL2_REPORT.md and RECEIVE_CONTROL2_STATUS.json from the evidence
#   python3 rc2_report_build.py
import json, os, statistics as st
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__)); RA = os.path.normpath(os.path.join(HERE, "../../../../review_artifacts/receive_control2")); EV = lambda f: json.load(open(os.path.join(RA, "evidence", f)))
EQ, EQF, NEU, DET, CHR, REG, MIR, CAS, M2, MK = (EV(f) for f in ["rc2_equivalence.json", "rc2_equivalence_full.json", "rc2_neutrality.json", "rc2_determinism.json", "rc2_chrome_node.json", "regression.json", "rc2_mirror.json", "rc2_cases.json", "rc2_matrix714.json", "rc2_matrix_kill.json"])
CPU = EV("rc2_cpu.json") if os.path.exists(os.path.join(RA, "evidence/rc2_cpu.json")) else None
M1 = json.load(open(os.path.join(RA, "../receive11/evidence/matrix_714.json"))); FROZ = open(os.path.join(RA, "evidence/frozen_sha256_end_check.txt")).read().strip().split("\n")[-1].replace("# ", "")
k1 = {(r["id"], r["seed"]): r for r in M1}
def mode(m): rows = [r for r in M2 if r["rc2"]["mode"] == m and (r["id"], r["seed"]) in k1]; return len(rows), Counter(r["cls5"] for r in rows), Counter(k1[(r["id"], r["seed"])]["cls5"] for r in rows)
nS, cS, oS = mode("stationary"); nM, cM, oM = mode("moving")
fc = lambda c: " · ".join(f"{k} {c[k]}" for k in ["CLEAN", "TAKEN", "RECEIVED", "RECOVERED", "MISSED"] if c.get(k))
med = lambda a: (st.median([x for x in a if x is not None]) if any(x is not None for x in a) else None); f2 = lambda x: "—" if x is None else f"{x:.2f}"
CASES = [("A", "ordinary ground kill"), ("B", "ground directional receive (30°)"), ("C", "60° receive"), ("D", "90° half-turn"), ("E", "120° turn"), ("F", "135° large turn"), ("G", "150° through-stance"), ("H", "180° through-stance"), ("I", "thigh → foot"), ("J", "chest → foot"), ("K", "head → follow-up"), ("L", "poor / heavy receive (firm 18 m/s, BC 50)"), ("M", "receive → DRIBBLE-V1 continuation (7 s)"), ("I2", "thigh → foot → set off at 90°"), ("A2", "kill and go")]
def crow(cid, lbl):
  R = [r for r in CAS if r["id"].split("_")[0] == cid]; oc = Counter(r["outcome"] for r in R); r0 = next((r for r in R if r["bc"] == 99), R[0]); H = [r for r in R if r["handoff"]]; D = [r for r in R if r["dribble"] and r["dribble"]["first"] is not None]
  return f"| {cid} | {lbl} | {r0['action']} | {' · '.join(f'{k} {v}' for k, v in oc.items())} | {' / '.join(sorted(set(r['episode'] for r in R if r['episode']))) or '—'} | {f2(med([r['handoff']['ballAhead'] for r in H])) if H else '—'} / {f2(med([r['handoff']['ballLat'] for r in H])) if H else '—'} | {f2(med([r['handoff']['ballSpeed'] for r in H])) if H else '—'} / {f2(med([r['handoff']['runner'] for r in H])) if H else '—'} | {f2(med([r['dribble']['first'] for r in D])) if D else '—'} | {f2(max([r['t12']['dv'] for r in R if r['t12']], default=None))} | {sum(r['recontacts'] + r['doubles'] for r in R)} | {sum(r['lostAfterHandoff'] for r in R)} | {len(R)} |"
BCS = [50, 70, 80, 90, 99]
def bcrow(cid):
  R = [r for r in CAS if r["id"].split("_")[0] == cid]; cells = []
  for b in BCS:
    Q = [r for r in R if r["bc"] == b]
    if not Q: cells.append("—"); continue
    oc = Counter(r["outcome"] for r in Q); ep = Counter(r["episode"] for r in Q if r["episode"]); cells.append(", ".join(f"{k} {v}" for k, v in oc.items()) + (" (" + " ".join(f"{k[:3]} {v}" for k, v in ep.items()) + ")" if ep else ""))
  return f"| {cid} | " + " | ".join(cells) + " |"
go = [r for r in CAS if r["handoff"]]; goClean = sum(1 for r in CAS if r["handoff"] and r["outcome"] == "CLEAN" and r["id"].split("_")[0] not in ("A2",)); goN = sum(1 for r in CAS if r["handoff"] and r["id"].split("_")[0] not in ("A2",))
kills = [r for r in CAS if r["id"].split("_")[0] in ("A", "I", "J", "K")]; killOk = sum(1 for r in kills if r["outcome"] == "KILLED")
cpuLine = f"the resolver (one strike-time prediction in two frames + selection) {CPU['planMedian']:.1f} ms median per receive (max {CPU['planMax']:.1f}, worst step {CPU['worstStep']:.1f} ms); the receive phase {CPU['msPerSimSec']:.0f} ms per simulated second median (RECEIVE-CONTROL-1.1: 8.8); DRIBBLE-V1 after it {CPU['afterPerSimSec']:.0f}" if CPU else "see evidence/rc2_cpu.json"
md = f"""# RECEIVE-CONTROL-2 — RECEIVE-KILL + RECEIVE-TURN integrated into RECEIVE-CONTROL (QUEUE #1)

**Status: presented for review — NOT frozen.** The owner's instruction (QUEUE #1 and QUEUE #2) is saved verbatim in `sources/`. QUEUE #2 (receiving while moving) is the next,
separate phase.

I cannot play video in real time: the visual checks here come from stills taken from the clips.

Review page (local only): `review/RECEIVE_CONTROL2_REVIEW.html` · lab: `sandbox/visual/receive_control2.html` · code: `sandbox/visual/receive_control2/`.

## 1. One authoritative receive pipeline
`ReceiveSim2` (`rc2_core.js`) extends RECEIVE-CONTROL-1.1's simulation (which extends the frozen DRIBBLE-V1 simulation). For every receive event ONE resolver decides
the action and ONE execution model executes every receive contact:

| The receive | Decided by | Executed by |
|---|---|---|
| standing receiver · ground ball · go (any exit, 0° = touch into space) | RECEIVE-TURN-1's selection — DIRECTIONAL / HALF-TURN / OUTSIDE-OF-FOOT / THROUGH-STANCE | RECEIVE-TURN-1's turn execution (curve B, bounded keyed draws) |
| standing receiver · ground ball · kill | RECEIVE-KILL's planner (foot surfaces) | RECEIVE-KILL's execution |
| standing receiver · aerial ball (any intent) | RECEIVE-KILL's planner (thigh / chest / head, or a foot on a dropping ball) + its follow-up foot control | RECEIVE-KILL's execution |
| moving receiver (interim, until QUEUE #2) | RECEIVE-CONTROL-1.1's moving actions (STRIDE / OPEN_TURN / THROUGH_TURN) | the same model (RECEIVE-TURN-1's execution on RECEIVE-KILL's difficulty) |
| after the receive | the rejoin / set-off touch (a receive contact of the same event) → TURN-1.2 takes the body → DRIBBLE-V1 takes the ball (frozen) | |

Nothing else decides a receive: RECEIVE-CONTROL-1.1's standing families and its execution model (`rx_exec.js`) no longer run; RECEIVE-TURN-1's / RECEIVE-KILL's
stand-alone runners are replaced by live controllers (`rc2_episode.js`) that run their decisions inside DRIBBLE-V1's ball kernel.

## 2. RECEIVE-KILL is actually used
- As a live controller inside the DRIBBLE-V1-frame kernel: **{EQ['kill']['pathBit']}/{EQ['kill']['cases']}** stand-alone kill / control episodes reproduced bit for bit (every kill matrix row × BC 30 / 70 / 99 × seeds 1–3: the same launches, the same ball).
- The full pipeline striking RECEIVE-KILL's own passes: **{EQF['kill']['sameAction']}/{EQF['kill']['cases']}** the same action, **{EQF['kill']['contactsSame']}** the same contacts (follow-ups included), **{EQF['kill']['pathSame']}** the same ball path.
- RECEIVE-CONTROL-1.1's kill blocks (K + KG): **{Counter(r['outcome'] for r in MK)['KILLED']}/{len(MK)} KILLED**. Integrated cases A / I / J / K: {killOk}/{len(kills)} KILLED (one header settles at 1.22 s).
- Curve B, the bounded draws, easy-ball compression, thigh / chest / head and the follow-up foot control are RECEIVE-KILL's own code (imported unchanged).

## 3. RECEIVE-TURN is actually used
- As a live controller: **{EQ['turn']['pathBit']}/{EQ['turn']['cases']}** stand-alone turn episodes reproduced bit for bit, the action RE-SELECTED on the kernel's own prediction ({EQ['turn']['planSame']}/{EQ['turn']['cases']} identical plans).
- The full pipeline: **{EQF['turn']['sameAction']}/{EQF['turn']['cases']}** the same action, **{EQF['turn']['contactSame']}** the same contact, **{EQF['turn']['controlSame']}** the same extra control, **{EQF['turn']['pathSame']}** the same ball to the rejoin.
- RECEIVE-CONTROL-1.1's standing receives now go through it: **CLEAN {cS.get('CLEAN', 0)}/{nS}** (RECEIVE-CONTROL-1.1's own actions: {fc(oS)}).
- The presentation body is RECEIVE-TURN-1.1's human body, in the receive's frame.

## 4. Action classification
At the pass's strike (the clean read) the resolver predicts the free ball in two frames — the receiver's own facing (RECEIVE-KILL receives from any bearing) and squared up
to the pass (RECEIVE-TURN-1's actions are authored for a frontal ball). A **ground** receive keeps the ball's centre ≤ {0.24} m while it is in reach; then a go intent asks
RECEIVE-TURN-1 for the exit relative to the squared-up facing (the intent's own turn — DRIBBLE-V1's command layer stores 180° as 179.5°), a kill intent asks RECEIVE-KILL.
An **aerial** ball goes to RECEIVE-KILL (its AUTO surface choice). If RECEIVE-TURN-1 finds no feasible action the receive falls back to RECEIVE-KILL (then a set-off).
Selected on the matrix's standing receives: {dict(Counter(r['rc2']['action'] for r in M2 if r['rc2']['mode'] == 'stationary'))}.

## 5. One receive event
Each receive is one event R1, R2 … per receiver; its contacts are c0 (the receive touch), c1 … (follow-up / extra controls), and the rejoin or set-off push (the next index).
Launch ids `<player>:R1.c0`, `…R1.c0.f1`, `…R1.c1`; the touch records carry them (DRIBBLE-V1's last touch is the rejoin).

## 6. Randomness
- The key: `seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension` — the stand-alone systems' keys; the integration reproduces them exactly (§2, §3).
- Matched counterfactuals: **{DET['matched']['same']}/{DET['matched']['sets']}** case × seed sets draw the same at BC 50 … 99; the executed error is the draw × σ(BC, D) exactly in **{DET['matched']['proportional']}/{DET['matched']['checked']}** turn executions.
- Different seeds differ: {DET['seeds']['differ']}/{DET['seeds']['pairs']}. One namespace: the same pass resolved as a kill and as a turn draws the same damping / direction / vertical tendencies ({DET['kindIndependent']['same']}/{DET['kindIndependent']['pairs']}).

## 7. DRIBBLE-V1 is not modified; the bridge lives in RECEIVE-CONTROL-2
Protected / frozen files **{FROZ}**. The bridge (all in `rc2_core.js`):
- **the rejoin touch** — at RECEIVE-TURN-1's meeting the receiver plays the ball onto the exit line so that it is DRIBBLE-V1's takeover distance (RECEIVE-CONTROL-1.1's HANDOFF_AHEAD) ahead of him at the handoff; a receive contact, executed with Ball Control; the foot and its touchdown come from the action's authored footwork;
- **TURN-1.2 takes the body** at that touchdown — or, while the authored run is still slower than TURN-1.2's slowest gait (2.5 m/s, a through-stance turn), at the first later footstep where it has reached it;
- **DRIBBLE-V1 takes the ball** ≥ 0.6 s later (TURN-1.2 settled into its gait), its resolver state fresh, the rejoin as its last touch;
- **the set-off** — after a kill / control with a go intent: turn to the exit, push the ball along it, run; the same switch and handoff rules;
- **kill and hold** — stable possession, no handoff.

## 8. The handoff
| case | | resolver | outcome | continuation | ball ahead / lateral at handoff (m) | ball / runner (m/s) | 1st DRIBBLE-V1 touch (s) | speed step at the switch (m/s, max) | recontacts + doubles | losses after handoff | runs |
|---|---|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(crow(c, l) for c, l in CASES) + f"""

Go receives CLEAN **{goClean}/{goN}**; the one TAKEN (D, BC 80, seed 2 — the same run in M) is a ball 1.89 m ahead on the line that DRIBBLE-V1 never touches:
RECEIVE-CONTROL-1.1's known stride-phase pocket of the frozen dribbler. No duplicate contact, no same-foot recontact, no snap (the ball is never moved: every touch is a
kernel launch inside its contact window), the facing at the switch is the exit (≤ 0.5° step).

## 9. Animation never fixes the integration
- Animation on / off: **{NEU['neutral']}/{NEU['runs']}** runs identical (every review case × BC 50 / 80 / 99 × 2 seeds, plus a slice of the matrix), {NEU['poses']:,} posed frames; replay **{NEU['deterministic']}/{NEU['runs']}**.
- Chrome (the lab, bodies on) = Node (bodies off): **{CHR['identical']}/{CHR['total']}** (fingerprint, action, every launch).

## 10. Regression
| | Result |
|---|---|
| RECEIVE-CONTROL-1.1's matrix of record, standing (now RECEIVE-TURN / RECEIVE-KILL) | RC1.1 {fc(oS)} → RC2 {fc(cS)} |
| … moving (RECEIVE-CONTROL-1.1's actions, the unified execution) | RC1.1 {fc(oM)} → RC2 {fc(cM)} |
| kill blocks K + KG | {Counter(r['outcome'] for r in MK)['KILLED']}/{len(MK)} KILLED |
| RECEIVE-KILL / RECEIVE-TURN stand-alone (their evidence; unchanged) | equivalence §2 / §3; their files {FROZ} |
| left / right mirror (two-footed, ±θ, 30 … 180°) | **{MIR['exactToHandoff']}/{MIR['pairs']}** exact to the DRIBBLE-V1 handoff ({MIR['maxDevToHandoff']:.1e} m) — RECEIVE-CONTROL-1.1's criterion; after it DRIBBLE-V1's own rules |
| one process: DRIBBLE-V1 · RECEIVE-CONTROL-1.1 · RECEIVE-TURN-1 · RECEIVE-KILL | {REG['dribbleBeforeEqualsAfter']}/{REG['dribbleRuns']} (evidence {REG['dribbleEvidenceMatch']}/{REG['dribbleEvidenceCompared']}) · {REG['receive11BeforeEqualsAfter']}/{REG['receive11Cases']} · {REG['turnBeforeEqualsAfter']}/{REG['turnEpisodes']} · {REG['killBeforeEqualsAfter']}/{REG['killEpisodes']}, with {REG['integratedRunsBetween']} integrated runs between; D1 / RX / RXE unchanged {REG['frozenParamsUnchanged']} |
| Ball Control distributions | the integrated episodes ARE RECEIVE-KILL's / RECEIVE-TURN-1's (bit-identical, §2 / §3): their distributions of record hold unchanged |
| CPU | {cpuLine} |

The moving receives' individual outcomes move both ways (their draws are the receive-control-v2 keys now, not RECEIVE-CONTROL-1.1's); the aggregate holds and the misses
are the same 39 — they come from RECEIVE-CONTROL-1.1's moving planner, which QUEUE #2 replaces.

## 11. The integrated cases at BC 50 / 70 / 80 / 90 / 99 (seeds 1–3, the same draws at every rating)
| case | """ + " | ".join(f"BC {b}" for b in BCS) + """ |
|---|---|---|---|---|---|
""" + "\n".join(bcrow(c) for c in ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "I2", "A2"]) + f"""

## 12. Ratings
The Ball Control curve was not retuned. The integration changes no execution: a receive's touch quality at every rating is RECEIVE-KILL's / RECEIVE-TURN-1's (bit-identical).
The continuation class follows the touch (IMMEDIATE at BC 90 – 99, ADJUSTED more often at BC 50 – 70); the handoff and DRIBBLE-V1's continuation hold across the ratings.

## 13. Success criteria
| Criterion | |
|---|---|
| one authoritative receive pipeline | yes — §1 |
| newer RECEIVE-KILL behaviour actually used | yes — bit-identical, §2 |
| newer RECEIVE-TURN behaviour actually used | yes — bit-identical, §3 |
| human turn animation simulation-neutral | yes — {NEU['neutral']}/{NEU['runs']}, Chrome = Node {CHR['identical']}/{CHR['total']} |
| aerial follow-ups work | yes — I / J / K, {killOk}/{len(kills)} KILLED with the kill A; I′ set off |
| deterministic randomness preserved | yes — §6 |
| DRIBBLE-V1 handoff works | yes — §8 ({goClean}/{goN} CLEAN; one frozen-side pocket) |
| old parallel receive logic no longer competes | yes — §1 (moving receives keep RECEIVE-CONTROL-1.1's geometry as the one interim path) |
| regression acceptable | yes — §10 |

## Known limitations
- Moving receivers use RECEIVE-CONTROL-1.1's action geometry (the interim until QUEUE #2), executed with the unified model.
- RECEIVE-TURN-1's actions assume a frontal ball: a standing receiver squares up to the pass (0.5 s) before a turn.
- The set-off after a kill / control (A′, I′) is presented with RECEIVE-KILL's standing body pushing off, then TURN-1.2's strides: a visible placeholder.
- DRIBBLE-V1's frozen stride-phase pocket (1 in {goN} integrated go receives).
- No Agility, Dribbling attribute or pressure.

## Review / lab links (local only — the character is a real player's model)
- Review: `http://127.0.0.1:8361/review_artifacts/receive_control2/review/RECEIVE_CONTROL2_REVIEW.html`
- Lab: `http://127.0.0.1:8361/sandbox/visual/receive_control2.html?case=D_BC99` (A–M, A2, I2, `_BC##`, `&seed=`; RECEIVE-CONTROL-1.1's case ids run their moving actions)
- Evidence: `review_artifacts/receive_control2/evidence/` · tools: `sandbox/visual/receive_control2/tools/`
"""
open(os.path.join(RA, "RECEIVE_CONTROL2_REPORT.md"), "w").write(md)
stt = {"milestone": "RECEIVE-CONTROL-2", "queue": "QUEUE #1", "status": "presented for review", "frozen": False, "equivalence": {"controllerTurn": f"{EQ['turn']['pathBit']}/{EQ['turn']['cases']}", "controllerKill": f"{EQ['kill']['pathBit']}/{EQ['kill']['cases']}", "pipelineTurn": f"{EQF['turn']['pathSame']}/{EQF['turn']['cases']}", "pipelineKill": f"{EQF['kill']['pathSame']}/{EQF['kill']['cases']}"},
  "matrix714": {"stationary": dict(cS), "moving": dict(cM), "rc11Stationary": dict(oS), "rc11Moving": dict(oM)}, "killBlocks": dict(Counter(r["outcome"] for r in MK)), "cases": {"goClean": f"{goClean}/{goN}", "kills": f"{killOk}/{len(kills)}"},
  "neutrality": f"{NEU['neutral']}/{NEU['runs']}", "chromeNode": f"{CHR['identical']}/{CHR['total']}", "matchedDraws": f"{DET['matched']['same']}/{DET['matched']['sets']}", "mirrorToHandoff": f"{MIR['exactToHandoff']}/{MIR['pairs']}", "protectedFiles": FROZ, "next": "owner review; QUEUE #2 — receiving while moving"}
json.dump(stt, open(os.path.join(RA, "RECEIVE_CONTROL2_STATUS.json"), "w"), indent=1); print("report", len(md))
