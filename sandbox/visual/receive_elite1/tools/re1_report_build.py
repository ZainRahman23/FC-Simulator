# receive_elite1/tools/re1_report_build.py — builds review_artifacts/receive_elite1/RECEIVE_ELITE1_REPORT.md and RECEIVE_ELITE1_STATUS.json from the evidence
#   python3 re1_report_build.py
import json, os, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); RA = os.path.normpath(os.path.join(HERE, "../../../../review_artifacts/receive_elite1")); EV = lambda f: json.load(open(os.path.join(RA, "evidence", f)))
CS = EV("re1_cases.json")["rows"]; MN = EV("re1_matrix_new.json"); MC = EV("re1_matrix_current.json"); SW = EV("re1_sweep.json"); CSER = EV("re1_current_series.json"); XAB = EV("re1_exit_ab.json")
REG = EV("re1_regress.json"); DET = EV("re1_det.json"); NEU = EV("re1_neutrality.json"); CHR = EV("re1_chrome_node.json"); CPU = EV("re1_cpu.json")
FROZ = open(os.path.join(RA, "evidence", "frozen_sha256_end_check.txt")).read().strip().split("\n")[-1].replace("# ", "")
def med(xs):
  xs = sorted(x for x in xs if x is not None); n = len(xs)
  return None if not n else (xs[(n - 1) // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2)
def p90(xs):
  xs = sorted(x for x in xs if x is not None); return xs[int(0.9 * (len(xs) - 1))] if xs else None
def f2(x): return "—" if x is None else f"{x:.2f}"
def cnt(R): d = {}; [d.__setitem__(r["cls5"], d.get(r["cls5"], 0) + 1) for r in R]; return d
def oc(R): c = cnt(R); return " · ".join(f"{k} {c[k]}" for k in ("CLEAN", "TAKEN", "RECEIVED", "RECOVERED", "MISSED") if k in c)
ids = []; [ids.append(r["base"]) for r in CS if r["base"] not in ids]
of = lambda b, p: [r for r in CS if r["base"] == b and r["pipeline"] == p]; one = lambda b, p: [r for r in of(b, p) if r["seed"] == 1][0]
kind = lambda b: "stationary" if b.startswith("ST_") else ("sprint" if "SPRINT" in b else "running")
def label(b):
  if b.startswith("ST_"): return f"stationary {b.split('_')[1]}°"
  t = b.split("_")[1].rstrip("RL"); return f"{'sprinting' if 'SPRINT' in b else 'running'} {t}°" + (" (pass from the front)" if b.startswith("F_") else " (pass from behind)" if b.startswith("RL_") else "")
G = lambda R, f: med([f(r) for r in R])
def ta(r): return 0 if r["tAlign"] is not None and r["tAlign"] < 0 else r["tAlign"]
def ref_rows(k):
  out = ["| action | technique | outcome C / N | max sep. turn | mean sep. turn | max sep. receive | contacts | intervals (s) | min speed | speed +0.5 s | +1.0 s | orientation (s) | stable continuation (s) |", "|" + "---|" * 13]
  for b in [x for x in ids if kind(x) == k]:
    C, N, n1 = of(b, "CURRENT"), of(b, "NEW"), one(b, "NEW")
    a = lambda f: f"{f2(G(C, f))} → **{f2(G(N, f))}**"
    out.append(f"| {label(b)} | {n1['family']} | {oc(C)} / {oc(N)} | {a(lambda r: r['sep']['turn']['max'])} | {a(lambda r: r['sep']['turn']['mean'])} | {a(lambda r: r['sep']['receive']['max'])} | {G(C, lambda r: r['receiveContacts']):.0f} → **{n1['receiveContacts']}** | {' · '.join(f'{x:.2f}' for x in n1['gaps']) or '—'} | {a(lambda r: r['speed']['min'])} | {a(lambda r: r['speed']['after05'])} | {a(lambda r: r['speed']['after10'])} | {a(ta)} | {a(lambda r: r['tCont'])} |")
  return "\n".join(out)
def contacts(b):
  r = one(b, "NEW"); return " · ".join(f"{i + 1}: +{q['t']:.2f} s {q['F']} {str(q['surface']).lower()} {q['speed']:.2f} m/s" + (" (exit)" if "EXIT" in q["role"] else "") for i, q in enumerate([q for q in r["contacts"] if q["role"] != "DRIBBLE"]))
LV = [99, 90, 80, 70, 60, 50]
def c1miss(r): return r["elite"]["miss"][0] if r.get("elite") and r["elite"]["miss"] else None
def series(s, sel=lambda r: True):
  out = [f"| {('BC/DRI/AGI' if s == 'ALL' else s)} | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |", "|" + "---|" * 12]
  for v in LV:
    R = [r for r in SW if r["series"] == s and r["level"] == v and sel(r)]
    out.append(f"| {f'{v}/{v}/{v}' if s == 'ALL' else v} | {oc(R)} | {f2(med([r['sep']['turn']['max'] for r in R]))} / {f2(p90([r['sep']['turn']['max'] for r in R]))} | {f2(med([r['sep']['turn']['mean'] for r in R]))} | {sum(r['receiveContacts'] for r in R) / len(R):.2f} | {f2(med([r['gapMean'] for r in R]))} | {f2(med([r['elite']['errs'][0] for r in R if r.get('elite') and r['elite']['errs']]))} | {med([c1miss(r) for r in R]) or 0:.3f} / {f2(p90([c1miss(r) for r in R]))} | {sum(len(r['elite']['corr']) for r in R if r.get('elite'))} / {sum(r['recoveryTouches'] for r in R)} | {f2(med([r['speed']['after10'] for r in R]))} | {f2(med([ta(r) for r in R]))} | {sum(1 for r in R if not r.get('elite'))} |")
  return "\n".join(out)
mvbig = lambda r: r["kind"] != "stationary" and abs(r["turn"]) >= 90
cN, cC = cnt(MN), cnt(MC); MB = lambda R: [r for r in R if r["mode"] == "moving" and abs(r["turn"]) >= 90]
stB = [b for b in ids if kind(b) == "stationary"]; mvB = [b for b in ids if kind(b) != "stationary" and b.split("_")[1].rstrip("RL") not in ("0", "30", "60")]
rng = lambda B, p, f: f"{f2(min(G(of(b, p), f) for b in B))}–{f2(max(G(of(b, p), f) for b in B))}"
TM = lambda r: r["sep"]["turn"]["max"]
gapsMov = [g for r in CS if r["pipeline"] == "NEW" and r["kind"] != "stationary" and r["gaps"] for g in r["gaps"][:-1]]
ex = {K: [r for r in XAB if r["K"] == K] for K in (1, 0.85, 0.7)}
md = f"""# RECEIVE-ELITE-1 — elite tight control: Ball Control 99 · Dribbling 99 · Agility 99, then each attribute worked backward

**Status:** presented for review. **NOT frozen** — RECEIVE-V1 is not frozen, nothing is integrated beyond the receive pipeline. Owner instruction (19 Oct): `sources/2026-10-19_user_instruction_elite_tight_control_99.md`.
Review page (local only — the character is a real player's model): `review/RECEIVE_ELITE1_REVIEW.html` · lab: `sandbox/visual/receive_elite1.html` · evidence: `evidence/`.
I cannot play video in real time: the visual statements below come from frame stills / strips taken from the lab and from the posed skeleton's diagnostics.

**Headline.** Through a moving turn of 90° or more the ball now stays **{rng(mvB, 'NEW', TM)} m** from the player (max, medians over 3 seeds) instead of **{rng(mvB, 'CURRENT', TM)} m**; through a stationary receive-and-turn **{rng(stB, 'NEW', TM)} m** instead of {rng(stB, 'CURRENT', TM)} m. Over the 672-run movement matrix at 99/99/99: CLEAN {cC.get('CLEAN')} → **{cN.get('CLEAN')}**, TAKEN {cC.get('TAKEN', 0)} → **{cN.get('TAKEN', 0)}**, MISSED {cC.get('MISSED', 0)} → **{cN.get('MISSED', 0)}**; the moving big-turn median {f2(med([TM(r) for r in MB(MC) if r['sep']['turn']]))} → **{f2(med([TM(r) for r in MB(MN) if r['sep']['turn']]))} m**. The body is back on its exit line with the ball close {rng([b for b in ids if '_0_' not in b], 'NEW', lambda r: r['tCont'])} s after the first contact (CURRENT {rng([b for b in ids if '_0_' not in b], 'CURRENT', lambda r: r['tCont'])} s).

## 1. Why the previous model created excessive ball separation
Every receive-and-turn had ONE authored contact whose ideal sent the ball to where the body would next meet it **after its whole turn** — RECEIVE-TURN-1's reconnection point (the root after the rotation and a 0.55 – 0.75 m run, + 0.40 m), RECEIVE-CONTROL-1.1's handoff point (the ball 1.2 – 2.4 m ahead of the runner when DRIBBLE-V1 takes it). Nothing played the ball between the receive and DRIBBLE-V1. A moving receiver often touched it at his run speed and paid the turn afterwards (an overrun of 1 – 2 m), so the ball had to travel as far as the body's slowest moment; the generic body (TURN-1's angle–speed law, 9 m/s² redirection, 520 – 620 °/s) set that time. Result: {rng(mvB, 'CURRENT', TM)} m through moving turns ≥ 90°.

## 2. The new elite-control philosophy
Simulation decides, animation explains. The receive technique is selected as before; after the selection everything is AUTHORED football: the body's path (Agility), the feet (Dribbling), contacts that place the ball where the NEXT foot will be — just ahead of the body on its authored path — and Ball Control's execution of every contact. The ball is never attached, parented, teleported or frozen: each contact is one kernel `schedule()` at the ball's own position (inside the kernel's contact window), the rigid-body ball is free between contacts. More contacts, not fewer: the ball follows the body through the turn in short segments. "As close as the action requires": a straight sprint's first touch is still a stride touch into space (sprinting 0°: {f2(G(of('RL_0_SPRINT_NORMAL', 'NEW'), lambda r: r['sep']['receive']['max']))} m, as CURRENT {f2(G(of('RL_0_SPRINT_NORMAL', 'CURRENT'), lambda r: r['sep']['receive']['max']))} m); turns ≤ 30° at speed keep one stride touch; larger turns become tight sequences.

## 3. Ball Control / Dribbling / Agility responsibility split
- **Ball Control** — the precision of each contact: RECEIVE-KILL-1.2 B's curve × RECEIVE-TURN-1's bounded keyed draws, unchanged (key: seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension). Nothing else reads it.
- **Dribbling** — the technical foot actions (`re1_attrs.js`): the shortest interval between contacts (99: 0.15 s alternating feet, 0.26 s the same foot; 50: 0.34 / 0.46 s), how far off its plan a foot still plays the ball (0.24 → 0.13 m), the reaction to what a touch did (0.10 → 0.17 s), the contact point's spacing (×1.00 → ×1.30).
- **Agility** — the body's reorientation: peak braking into the plant (12.5 → 7.5 m/s²), redirection after the contact (11.5 → 6.5 m/s²), hip yaw rate (900 → 480 °/s), TURN-1's angle–speed law ×1.20 → ×0.85, a standing pivot (0.05 s + 820 °/s → 0.14 s + 420 °/s), acceleration out (6.4 → 4.2 m/s²), support-step period (0.18 → 0.27 s), run correction (3.6 → 2.2 m/s). The generic receiver sat between 70 and 80 on most rows. Agility also scales the moving selection's limits and the approach's braking (the same rules, the agile limits).

## 4. 99/99/99 stationary reference (CURRENT → NEW, medians over seeds 1–3)
{ref_rows('stationary')}

## 5. 99/99/99 moving reference (running 5.5 m/s)
{ref_rows('running')}

## 6. 99/99/99 sprint reference (7.8 m/s)
{ref_rows('sprint')}

## 7. Tight large-turn implementation
A large turn is a sequence. The technique's first contact (a through-stance turn's far foot behind / across the standing leg, a half-turn's back foot, an open turn's near foot) sends the ball only as far as the next foot's point: candidates on each of the next swings (Dribbling's cadence) at the touching foot's side or the body's centre line, the ball sent straight there if a surface of the technique faces that impulse and the path clears the standing foot; else the technique's own direction (RECEIVE-TURN-1 / RECEIVE-CONTROL-1.1's ideal) at the speed that brings the ball closest to the next foot; else a search over every direction the technique's surfaces can give. The body rotates around the ball (Agility), the next foot plays it again, touches continue while the body accelerates out on its exit line (every other step once it runs ≥ 3 m/s), then the exit touch. A moving receiver's selection scores the elite first touch (how far it leaves the ball from the next foot) and prefers planting before the touch on a large turn. A sequence whose first touch could not be reached even ideally (a dry run on the kernel's free ball) is not attempted: the technique's own touch is played (CURRENT's behaviour) — in the review set only at Agility 50 sprinting into 150°.

## 8. Rapid-contact architecture
`re1_core.js`: `EliteEpisode` runs live in RECEIVE-CONTROL-2's action frame (stationary receivers after RECEIVE-CONTROL-2's resolver, moving receivers after RECEIVE-CONTROL-1.1's selection — both pipelines' kills, aerial controls and set-offs unchanged). `pre()` at a contact tick: the plan (exit touch or touch toward the next foot), the surface that gives the impulse, the difficulty (RECEIVE-TURN-1's terms), Ball Control's execution with that contact index's keyed draws, one `schedule()`. `post()` one tick later, on the real ball (kernel prediction): the next contact within Dribbling's reach → as planned; beyond → the run corrected toward it from the reaction time at Agility's rate (≤ 0.35 m); else the contact moved on a swing; else a recovery (later, an uncapped correction); else released to DRIBBLE-V1. The footwork (swings, contact feet, the touchdown TURN-1.2 takes the body at) is simulation data. The exit touch: TURN-1.2 at the first touchdown at its slowest gait or faster, DRIBBLE-V1 through RECEIVE-MOVING-1's takeover window.

## 9. Authoritative contact timings (seed 1; time from the first contact · foot · surface · launch speed)
""" + "\n".join(f"- **{label(b)}** — {contacts(b)}" for b in ids) + f"""

## 10. Ball-separation measurements
Ball centre ↔ the player's root, horizontal (`tools/re1_metrics.mjs`). "Turn": the first contact → the body facing the exit for 0.15 s, + 0.3 s. "Receive": the first contact → DRIBBLE-V1's first touch (≤ 2.5 s). Over-time curves: the review page's §10 (CURRENT grey, NEW yellow). Reference set at 99/99/99: stationary turn max {rng(stB, 'CURRENT', TM)} → **{rng(stB, 'NEW', TM)} m**; moving / sprinting ≥ 90° {rng(mvB, 'CURRENT', TM)} → **{rng(mvB, 'NEW', TM)} m**; mean through the turn {rng(mvB, 'CURRENT', lambda r: r['sep']['turn']['mean'])} → **{rng(mvB, 'NEW', lambda r: r['sep']['turn']['mean'])} m**. The receive maximum is now set by the exit touch (DRIBBLE-V1's takeover distance): stationary {rng(stB, 'CURRENT', lambda r: r['sep']['receive']['max'])} → {rng(stB, 'NEW', lambda r: r['sep']['receive']['max'])} m, moving ≥ 90° {rng(mvB, 'CURRENT', lambda r: r['sep']['receive']['max'])} → {rng(mvB, 'NEW', lambda r: r['sep']['receive']['max'])} m.

## 11. Body-turn timings
Orientation (facing within 10° of the exit, held): stationary {rng(stB, 'CURRENT', ta)} → **{rng(stB, 'NEW', ta)} s**; moving ≥ 90° {rng(mvB, 'CURRENT', ta)} → **{rng(mvB, 'NEW', ta)} s**. Stable continuation (the first contact played facing and running along the exit, ≥ 2.5 m/s, the ball ≤ 1.5 m): {rng([b for b in ids if '_0_' not in b], 'CURRENT', lambda r: r['tCont'])} → **{rng([b for b in ids if '_0_' not in b], 'NEW', lambda r: r['tCont'])} s**. Speed 1 s after the first contact, moving ≥ 90°: {rng(mvB, 'CURRENT', lambda r: r['speed']['after10'])} → **{rng(mvB, 'NEW', lambda r: r['speed']['after10'])} m/s**. A sprinter's 180° reversal still decelerates to ≈ 0 (min {f2(G(of('F_180R_SPRINT_NORMAL', 'NEW'), lambda r: r['speed']['min']))} m/s) — a reversal — but is back at {f2(G(of('F_180R_SPRINT_NORMAL', 'NEW'), lambda r: r['speed']['after10']))} m/s 1 s after the contact (CURRENT {f2(G(of('F_180R_SPRINT_NORMAL', 'CURRENT'), lambda r: r['speed']['after10']))}).

## 12. Dribbling-99 foot cadence
Alternating contacts every **{f2(med(gapsMov))} s** (moving, median, before the exit-line spacing; range {f2(min(gapsMov))}–{f2(max(gapsMov))} s); a standing turn's second contact as the pivot completes (0.34 – 0.41 s), then 0.20 s; every other step (0.36 – 0.41 s) once out on the exit line at ≥ 3 m/s. A foot plays the ball up to 0.24 m off its planned point.

## 13. Agility-99 body response
A standing 180° pivot in {f2(med([r['elite']['path']['Trot'] for r in of('ST_180_V12', 'NEW')]))} s (CURRENT's generic 0.42 s), the run out from 42 % of it at 6.4 m/s²; moving: braking into the plant up to 12.5 m/s², the velocity redirected at 11.5 m/s², hips up to 900 °/s; orientation {rng(mvB, 'NEW', ta)} s after the contact on moving turns ≥ 90°.

## 14. Ball-Control-99 precision
At BC 99 the largest execution error of any contact (determinism runs, every review action, seeds 1–2) is {DET['bc99']['maxErr']:.2f} m/s — a firm pass's first touch; the sequence's own touches ≤ 0.02 m/s; the next contact finds the ball {f2(med([c1miss(r) for r in SW if r['series'] == 'BC' and r['level'] == 99]))} m from its planned point (median).

## 15. Independent Ball Control 50–99 (Dribbling 99, Agility 99; 20 actions × 3 seeds per row)
{series('BC')}

Moving turns ≥ 90°:
{series('BC', mvbig)}

Same fast feet, same fast body, an increasingly imperfect first touch: its error grows ×{med([r['elite']['errs'][0] for r in SW if r['series'] == 'BC' and r['level'] == 50 and r.get('elite')]) / med([r['elite']['errs'][0] for r in SW if r['series'] == 'BC' and r['level'] == 99 and r.get('elite')]):.0f} (BC 50), the next foot reaches further and the run corrects more often; elite feet absorb most of it (limitation 2).

## 16. Independent Dribbling 50–99 (Ball Control 99, Agility 99)
{series('DRI')}

Moving turns ≥ 90°:
{series('DRI', mvbig)}

Precise touches, an agile body, slower feet: fewer contacts, longer intervals, the ball travels further between them — tightness decreases here.

## 17. Independent Agility 50–99 (Ball Control 99, Dribbling 99)
{series('AGI')}

Moving turns ≥ 90°:
{series('AGI', mvbig)}

Precise touches, quick feet, a slower body: slower orientation, more steps and contacts through the turn, a slower exit; the separation stays tight (the feet keep up). At Agility 50 the sprinting 150° cannot plant in time and plays the technique's own touch (3 runs).

## 18. Combined 50 / 60 / 70 / 80 / 90 / 99
{series('ALL')}

Against CURRENT at the same ratings (the attributes reach DRIBBLE-V1 in both pipelines):

| ratings | CURRENT | NEW | max sep. turn C → N | speed +1.0 s C → N |
|---|---|---|---|---|
""" + "\n".join(f"| {v}/{v}/{v} | {oc([r for r in CSER if r['level'] == v])} | {oc([r for r in SW if r['series'] == 'ALL' and r['level'] == v])} | {f2(med([r['sep']['turn']['max'] for r in CSER if r['level'] == v and r['sep']['turn']]))} → {f2(med([r['sep']['turn']['max'] for r in SW if r['series'] == 'ALL' and r['level'] == v]))} | {f2(med([r['speed']['after10'] for r in CSER if r['level'] == v]))} → {f2(med([r['speed']['after10'] for r in SW if r['series'] == 'ALL' and r['level'] == v]))} |" for v in LV) + f"""

A continuum from almost glued and extremely responsive to slower feet, a slower body, less precise touches and more recovery — and a 50/50/50 professional still completes {cnt([r for r in SW if r['series'] == 'ALL' and r['level'] == 50]).get('CLEAN', 0)}/60 of the set cleanly (CURRENT at the same ratings {cnt([r for r in CSER if r['level'] == 50]).get('CLEAN', 0)}/60).

## 19. Receive → DRIBBLE-V1 takeover results
672-run movement matrix at 99/99/99: CURRENT {oc(MC)} · NEW **{oc(MN)}** (TAKEN = DRIBBLE-V1 took the ball but did not keep it on the new line). The exit distance: how close the exit touch can put the ball for the frozen DRIBBLE-V1 (× RECEIVE-CONTROL-1.1's HANDOFF_AHEAD, 60 runs each): × 1.0 {oc(ex[1])} (receive max {f2(med([r['sep']['receive']['max'] for r in ex[1]]))} m) · × 0.85 {oc(ex[0.85])} · × 0.7 {oc(ex[0.7])} (receive max {f2(med([r['sep']['receive']['max'] for r in ex[0.7]]))} m). Kept at × 1.0 — DRIBBLE-V1 (frozen) does not reliably take a closer ball.

## 20. Stationary regressions
Elite OFF ≡ RECEIVE-MOVING-1: **{REG['off']['identical']}/{REG['off']['runs']}** bit-identical (RECEIVE-CONTROL-2's cases × BC 50/99 × seeds, RECEIVE-MOVING-1's owner cases, the movement matrix). Elite ON, the receives it does not own — kill and hold, thigh / chest / head controls, kill-and-go, control-and-set-off: **{REG['onNonTurn']['identical']}/{REG['onNonTurn']['runs']}** bit-identical. The stationary turns: {REG['onTurn']['changed']}/{REG['onTurn']['runs']} changed (the elite sequence, by design); standing receives in the matrix {cnt([r for r in MC if r['mode'] == 'stationary']).get('CLEAN')} → {cnt([r for r in MN if r['mode'] == 'stationary']).get('CLEAN')} CLEAN. Protected files: {FROZ}.

## 21. Moving regressions
Movement matrix, moving receivers: CURRENT {oc([r for r in MC if r['mode'] == 'moving'])} → NEW **{oc([r for r in MN if r['mode'] == 'moving'])}**. Speed 1 s after the contact rises at every turn ≥ 60° (review page §19). The 0° stride receives keep their space (sprinting 0° max separation {f2(G(of('RL_0_SPRINT_NORMAL', 'CURRENT'), lambda r: r['sep']['receive']['max']))} → {f2(G(of('RL_0_SPRINT_NORMAL', 'NEW'), lambda r: r['sep']['receive']['max']))} m).

## 22. Deterministic verification
Every run repeated: **{DET['repeat']['identical']}/{DET['repeat']['runs']}** identical (99/99/99, BC 50, DRI 50, AGI 50, 70/70/70, 50/50/50 × 20 actions × 2 seeds). Ball Control draws are never re-rolled by Dribbling or Agility (or Ball Control): the same contact index draws the same standard normals at every rating — **{DET['draws']['matched']}/{DET['draws']['sets']}** contact indices ({DET['draws']['pairs']} draws). Chrome (the lab, animation off) = Node: **{CHR['identical']}/{CHR['runs']}**.

## 23. Animation ON/OFF neutrality
**{NEU['identical']}/{NEU['runs']}** identical with the presentation body on and off (contact ticks, launches, the player's path, the result, the DRIBBLE-V1 handoff; 20 actions × 5 rating sets, {NEU['poses']} poses). The body: every contact foot at its contact pose ≤ {NEU['contactPoseErr']['max'] * 1000:.1f} mm at the contact tick; planted-foot slip ≤ {NEU['slip']['max'] * 100:.1f} cm. CPU: receive phase {CPU['CURRENT']['receivePerSimSec']} → {CPU['NEW']['receivePerSimSec']} ms per simulated second, DRIBBLE-V1 after {CPU['CURRENT']['afterPerSimSec']} → {CPU['NEW']['afterPerSimSec']}, worst single step {CPU['CURRENT']['worstStep']} → {CPU['NEW']['worstStep']} ms, the moving selection {CPU['CURRENT']['rxPlanMedian']} → {CPU['NEW']['rxPlanMedian']} ms per receive.

## 24. Review page / lab links (local only)
- Review: http://127.0.0.1:8361/review_artifacts/receive_elite1/review/RECEIVE_ELITE1_REVIEW.html (26 clips, 31 frame strips, the separation graphs, every table above)
- Lab: http://127.0.0.1:8361/sandbox/visual/receive_elite1.html?case=ST_180_V12&compare=1 (CURRENT vs NEW) · `?case=F_180R_SPRINT_NORMAL` (gameplay + close + top) · `?case=L_120_RUN_NORMAL&vs=B99_D50_A99` (99 vs a reduced rating) · controls: case, Ball Control / Dribbling / Agility, pipeline, view (gameplay, close, top), speed 1× … 0.1×, frame step. Numbered rings are the authoritative contacts with their times; the graph shows the ball–player separation over time.

## 25. Remaining limitations
1. **The exit touch still uses space.** Through the turn the ball stays ≈ 0.4 – 0.65 m away; the exit touch then puts it where the frozen DRIBBLE-V1 takes it over (1.6 m ahead at 5.5 m/s, 2.0 m at 7.8 m/s, during TURN-1.2's 0.6 s run-out). Closer handoffs were measured and are not reliably accepted (§19).
2. **Ball Control's consequence is absorbed by elite feet.** With Dribbling 99 / Agility 99, BC 50's ≈ 1 m/s first-touch errors become a further reach and run corrections, not a looser ball; BC shows more with lower Dribbling (§18).
3. **Low Agility sprinting into a big turn** cannot plant before the ball; the elite sequence is declined and the technique's own touch is played (CURRENT's behaviour) — Agility-aware braking earlier in the approach would be the fuller answer.
4. **A standing turn's second contact** comes as the pivot completes (0.34 – 0.41 s), not within 0.25 s.
5. **Authored kinematics, not forces**: the human body (RECEIVE-TURN-1.1's, generalised to several contacts and a moving entry) explains the path with IK; the blend into TURN-1.2's pose at the switch leaves ≤ {NEU['slip']['max'] * 100:.1f} cm of planted-foot slip; a far contact can fully extend a leg; the run-in before a moving action is this body's gait, blended in from TURN-1.2's pose over 0.14 s.
6. **Rating anchors are first values** (50 / 70 / 90 / 99), tuned on the 99 reference and checked for a continuum, not calibrated against player data.
7. No pressure or opponents; MISSED receives in the matrix ({cN.get('MISSED', 0)}, CURRENT {cC.get('MISSED', 0)}) are passes no technique could take.
"""
open(os.path.join(RA, "RECEIVE_ELITE1_REPORT.md"), "w").write(md)
status = { "milestone": "RECEIVE-ELITE-1", "state": "presented for review — NOT frozen (RECEIVE-V1 not frozen)", "date": "2026-10-19",
  "instruction": "sources/2026-10-19_user_instruction_elite_tight_control_99.md", "review": "review/RECEIVE_ELITE1_REVIEW.html (local only)", "lab": "sandbox/visual/receive_elite1.html",
  "separation_turn_max": { "moving_ge90_current": rng(mvB, "CURRENT", TM), "moving_ge90_new": rng(mvB, "NEW", TM), "stationary_current": rng(stB, "CURRENT", TM), "stationary_new": rng(stB, "NEW", TM),
    "matrix_moving_ge90_median": [med([TM(r) for r in MB(MC) if r["sep"]["turn"]]), med([TM(r) for r in MB(MN) if r["sep"]["turn"]])] },
  "matrix_672": { "current": cnt(MC), "new": cnt(MN) }, "regression": { "eliteOff": [REG["off"]["identical"], REG["off"]["runs"]], "nonTurn": [REG["onNonTurn"]["identical"], REG["onNonTurn"]["runs"]] },
  "determinism": { "repeat": [DET["repeat"]["identical"], DET["repeat"]["runs"]], "draws": [DET["draws"]["matched"], DET["draws"]["sets"]], "chromeNode": [CHR["identical"], CHR["runs"]] },
  "neutrality": [NEU["identical"], NEU["runs"]], "protected": FROZ, "cpu": { "current": CPU["CURRENT"], "new": CPU["NEW"] } }
json.dump(status, open(os.path.join(RA, "RECEIVE_ELITE1_STATUS.json"), "w"), indent=1); print("report", len(md) // 1024, "KB")
