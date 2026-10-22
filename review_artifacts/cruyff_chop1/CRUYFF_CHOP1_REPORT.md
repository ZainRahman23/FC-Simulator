# CRUYFF + RONALDO CHOP FAMILY CLEANUP (CRUYFF-CHOP-1) — stopped for your review (22 Oct 2026)

## ▶ PLAYABLES (LOCAL ONLY — the character is a real player's model)

- **THE DRIBBLING LAB — http://127.0.0.1:8361/sandbox/visual/cruyff_chop1_lab.html**
  - **New: the COMPARE section** (in the gallery, after the families). Each pair is the *identical entry*, played side by side and synchronised at 1×: lane A is the simple solution, lane B the elite one, each named above its player. Buttons: **▶ A | B**, or **A** / **B** alone.
  - The info box shows both lanes' timings: request → decisive, → useful exit, total, the speed at the contact, the lowest speed, control back, and metres along the exit. Under it, which lane is sooner, and by how much.
  - The technique cards have new variants: inside hook WALK / RUN / SPRINT, outside hook SPRINT, Cruyff SLOW · AT THE PLANT and SPRINT, chop JOG · NO HOP.
- **THE JOYSTICK SANDBOX — http://127.0.0.1:8361/sandbox/visual/cruyff_chop1_sandbox.html** (31 skills: the abbreviated Cruyff is no longer one of them).
- **The DRIBBLING VOCAB-1 pages are unchanged**, as the reference: `vocab1_lab.html`, `vocab1_sandbox.html`.

> I cannot play video in real time. Everything here was measured in the simulation (node and headless Chrome); how it **looks** at 1× is your review.

---

## 0. The focused change

Only the four techniques and their entries changed; the broader vocabulary was not touched.
- **The hooks keep their locked / VOCAB-1 templates.** They are the simple, accessible brake → hook → exit.
- **The Cruyff and the chop are refined copies** of the locked references (`pt_tech.js` is never modified). Their geometry is kept: the drag behind the plant leg, and the slice behind the shielding leg with its hop.
- **The abbreviated Cruyff is no longer a technique.** It is an internal entry of the Cruyff, and the chop gets the same treatment: one technique with state-dependent entries.

The code is in `sandbox/visual/cruyff_chop1/`, a copy of `vocab1/` (VOCAB-1 itself is untouched).

## 1. The hierarchy, measured — a right-footed player turning 120° to the left (all four can solve it)

`tools/cc_measure.mjs`, averaged over 4 stride phases per cell; FAST = about 8 m/s and still accelerating.
- **Useful exit:** the body moving within 30° of the request at ≥ 70 % of the mode's cruising speed (≤ 3.5 m/s). The Lab's COMPARE uses the same definition (`v_run.js exitMetrics`).
- **Before** = DRIBBLING VOCAB-1 (`evidence/measure_BEFORE_vocab1_120.txt`); **after** = this build (`evidence/measure_AFTER_120.txt`).

| request → useful exit (s) | WALK | JOG | RUN | FAST | SPRINT |
|---|---|---|---|---|---|
| *body alone (ball off): A99-C's own turn — the physical ceiling* | 0.17 | 0.19 | 0.22 | 0.26 | 0.29 |
| **Inside hook** (simple) | 0.86 → 0.86 | 1.20 → 1.20 | 1.33 → 1.33 | rejected → **2.31** (3/4) | rejected → **2.11** |
| **Outside hook** (simple, left foot here) | 1.88 (1/4) → 1.88 (1/4) | 0.83 → 0.83 | 1.53 → 1.53 | rejected → 2.86 (1/4) | rejected → 2.33 (2/4) |
| **Cruyff** (elite) | 0.90 → **0.60** | 1.19 → **0.94** | 1.28 → **1.05** | 1.81 (2/4) → 2.09 (3/4) | rejected → **2.06** |
| **Ronaldo chop** (elite) | rejected → rejected | rejected → **0.99** | 1.15 → 1.15 | 1.31 → 1.27 | 1.14 → **1.05** |
| B4 alone (no request) | 0.40 → 0.40 | 0.88 → 0.88 | 1.15 → 1.15 | 1.31 → 1.28 | 1.14 → 1.05 |
| B4 without the elite solutions | 0.40 → 0.40 | 0.80 → 0.80 | 1.35 → 1.35 | 2.27 → 2.27 | 1.73 → 1.73 |

| Momentum kept: lowest speed on the way (m/s) | WALK | JOG | RUN | FAST | SPRINT |
|---|---|---|---|---|---|
| Inside hook | 0.1 | 0.2 | 0.2 | 0.2 | 0.2 |
| Cruyff | 0.1 → **0.7** | 0.1 → **0.7** | 0.2 → **1.2** | 0.2 → **1.3** | — → **1.0** |
| Ronaldo chop | — | — → **2.2** | 2.2 | 3.2 → **3.6** | 3.2 → **5.3** |

| Metres made along the exit 2.5 s after the request | WALK | JOG | RUN | SPRINT |
|---|---|---|---|---|
| Inside hook | 2.35 | 3.43 | 4.68 | −2.70 (it is still braking with the ball) |
| Cruyff | 2.17 → **3.28** | 3.51 → **4.26** | 5.07 → **5.81** | −2.68 |
| Ronaldo chop | — | — → **3.84** | 6.08 | 6.53 → **6.67** |

- **Control back after the decisive contact:** Cruyff 0.13 → **0.09 s**; chop 0.14 → **0.11 s**; hooks 0.09 s.
- **Preparation steps** (footfalls between the request and the decisive contact): Cruyff 2 / 3 / 3.2 at walk / jog / run, the same as the hook's. Its gain is in what follows the setting touch, not in fewer steps (see §2).
- **What it means:**
  - From a walk, a jog and a run, the Cruyff is now clearly the better reversal than the same-foot inside hook. It is quicker (−0.26 / −0.26 / −0.28 s), keeps moving (0.7–1.2 m/s against 0.1–0.2), returns control sooner, and is further along the exit.
  - From a run and a sprint, the chop is the high-speed solution: 1.15 / 1.05 s, keeping 2.2 / 5.3 m/s.
  - The hooks stay the accessible solution. From a fast run and a sprint they now work too (brake with the ball → hook), slower: 2.1–2.3 s.
  - A player without the elite solutions still solves the problem. B4 falls back to the hook, drag-back or L-drag at a run, or a controlled carry arc at a sprint, with no lost ball.
- **What B4 now chooses on its own** (the 40-minute random torture's contact count, VOCAB-1 → now): Cruyff 130 → **294**, inside hook 148 → **47**, chop 93 → **122**, outside hook 236 → 172. The elite solutions are taken when their geometry fits, and the hooks remain where they are the better tool.
- **Each technique at its own reference angle** (hook 150°, chop 90°): `evidence/measure_AFTER_ref_angles.txt` against `measure_BEFORE_vocab1_ref_angles.txt`.

## 2. The Cruyff — a fast, protected behind-the-plant-leg reversal (`v_tech.js CRUYFF_E`)

- **Quicker last steps.** The braking stride and the plant are 0.13 s apart, and the window from the braking stride to the drag is 0.26 s (0.36 before). The braking is about 8 m/s², inside Agility's.
- **The drag is made while the body is still moving:** about 1.3 m/s at a walk / jog and about 2.4 m/s from a run (0.2–0.5 before). The drag is behind the plant leg, as in the reference.
- **The pivot, then away at the body's own acceleration.** About 9 m/s² from low speed: A99-C carrying the ball accelerates at 9.3 m/s² (ball off: 11). That rate is never scaled down for a slower entry.
- **A shorter follow-through** (control back at 0.09 s) and the exit touch sooner (τ 0.30, from 0.38).
- **The drag is made below 3 m/s.** A faster entry brakes first. Without this cap it dragged at about 5 m/s from a fast run (peak 79 m/s², visible glitches).
- **The shortest valid entry, automatically.** Every Cruyff request (and B4's own Cruyff) builds both entries: at the plant (*already slow and correctly planted: plant → Cruyff*) and with the braking stride (*moving faster: preparation → plant → Cruyff*). It takes the one with the earliest valid decisive contact.
  - In the measurements the braking-stride entry is usually the sooner one. The ball must first be set behind a body that overtakes it, so the plant-first entry only wins when the ball is already there.
- **The setting touch that slows the ball is a sole stop.** Drawn with the laces, the boot reached in front of the ball pitched −86° and fought its clearance tick to tick.
  - That glitch was already in VOCAB-1: 67 slow-motion events at jog, **now 4**.
- **Requested from a sprint:** the necessary preparation. The request stays pending while the body brakes along its entry line with the ball CONTROLLED, then plant → Cruyff (§4).

## 3. The Ronaldo chop — the high-speed redirect (`v_tech.js CHOP_E`)

- **Credible at speed.** Entered above its reference speed, it now sheds speed after the contact no faster than the body can (≤ 1.25 × Agility's braking, A99-C's own in its turns).
  - The sprint chop used to drop from about 7 to 3.3 m/s within 0.1 s of its contact (36–50 m/s² of straight-line braking).
  - It now keeps about 5.3 m/s through the turn, like the body's own arc. Its peak falls from 83 to 68 m/s² (A99-C's own peak at a sprint: 65), and it is *also* sooner (1.14 → 1.05 s).
- **A shorter follow-through:** control back at 0.11 s (0.14 before). The exit touch stays at τ 0.30: at τ 0.25 the standing foot could not reach it at a sprint.
- **One technique, two entries:**
  - **with its hop:** run / sprint, 3.6–9.5 m/s;
  - **at its plant without the hop:** 3.0–6.0 m/s, which gives a chop from a jog (0.99 s).
  - Without the hop above 6 m/s it touched at about 8 m/s (109–126 m/s²): the hop *is* its braking at speed.

## 4. The hooks — the simple, safe solution (templates unchanged)

- **They remain** brake → hook → exit: the body stops (0.1–0.2 m/s) and turns. At walk / jog / run they are unchanged: 0.86 / 1.20 / 1.33 s.
- **From faster speeds they were rejected. They now prepare:**
  - A hook / Cruyff / chop requested faster than it can be entered stays pending while the body brakes along its entry line under ordinary CONTROLLED carry, braking only as far as the technique needs. It is entered on the first stride where it is feasible. Its window grows by the braking time + 1.0 s (a sprint-pushed ball has to be reached first).
  - During the preparation, carry touches keep the plan's aim along that line. Re-aimed toward the stick, they turned the body 30° before the technique could be entered.
  - The inside hook from a sprint: **2.11 s** (4/4, before: rejected); from a fast run 2.31 s (3/4).

## 5. INTEGRITY (`evidence/`)

| Check | Result |
|---|---|
| **Possession** (40 × 60 s random torture, CONTROLLED) | 0 CONTROLLED exits, 0 missed contacts; touches/s 2.72 (2.73 VOCAB-1). **5 observed losses** (12 in VOCAB-1), all with possession CONTROLLED (the observer's "no touch for 1.8 s") |
| **Curated cases** (97 clips, 9 new + the COMPARE lanes in `compare.txt`) | 76 / 82 requesting cases PLAYED (the 6 others = the deliberate REJECTED setups); 0 exits; 0 missed; **11 normal-speed-visible body events in 10 clips (unchanged)**. Every hook / Cruyff / chop replay is clean at normal speed, except the sprint chop's knee step (36.5°; the locked reference's own, 30.6° in VOCAB-1) |
| **COMPARE pairs** (`compare.txt`) | 0 exits in all 18 lanes; body normal-speed-visible: 1 (the no-elite L-drag at a run, a 7 cm crossing) |
| **Random manual requests** (361) | PLAYED 70 · REJECTED 210 · CANCELLED 78 · 0 exits · 0 missed |
| **Determinism** | 18 / 18 twice, 18 / 18 via the page's replay path |
| **Posed random torture** (18 × 60 s, normal-speed-visible) | **211** (236 VOCAB-1) |
| **All-level body torture** (s99, 6 × 60 s) | jumps 85 (61) · knee pops 135 (141) · crossings 377 (405) · floats 197 (184) · slides 1 (5) |
| **Extreme redirection** (140 runs, ball on) | 48 runs / 62 normal-speed-visible (45 / 55 VOCAB-1) · **slow-motion 133 (228)**. The extra normal events are crossings in *carries / braking touches* of sprint reversals, the known low-speed-whip class, reached because B4's options changed. With the locked Cruyff template they are back to 51 |
| **Ball off** | 49 / 140 (unchanged) |
| **Contact gaps** | median 0.0 cm · p90 0.6 · p99 8.2 cm (640 contacts) |
| **CPU** (`v_cpu.mjs`, the same input) | 104.4 vs 106.3 ms per simulated s (VOCAB-1); candidates per re-plan 3.0 vs 2.8; worst tick 16.8 ms |
| **Chrome** | the Lab (63 cards incl. 9 COMPARE pairs) and the sandbox: no console errors, no failed requests; A \| B played in 5 pairs |
| **Locked baseline** | `bl_lock_check.sh` PASS |

**Each rule switched off alone** (`evidence/ablations.md`):
- The elite templates take the Cruyff from 0.90 / 1.19 / 1.28 to 0.60 / 0.94 / 1.05 s at walk / jog / run.
- The sole stop removes 53 of the jog Cruyff's slow-motion events.
- The contact-speed cap keeps the sprint Cruyff clean (without it, 4 visible events and 79 m/s²).
- The preparation is what makes sprint requests possible at all.
- The no-hop entry is what makes the jog chop possible.

## 6. Honest notes

1. **The left-foot outside hook can be the quicker reversal at a jog** (0.83 s against the Cruyff's 0.94). Its geometry lets the ball stay ahead of the body, while the Cruyff's drag needs the ball behind the plant. The Lab's COMPARE shows it.
2. **At a sprint, the controlled carry arc gains far more ground than the chop** (B4 without the elite: 15.8 m along the exit in 2.5 s, against the chop's 7.3). A99-C turns at speed and there is no defender here, so the chop's value at a sprint (a sharp, protected change of lane) is not measured. B4 still prefers the chop.
3. **The Cruyff from a sprint is slow** (2.06 s). It brakes with the ball first, as asked, and drags below 3 m/s.
   - The locked template is quicker from a sprint (1.35 s) only because it brakes inside its own window at about 20 m/s² (peak 77 m/s², 2 visible events), which is not credible.
4. **The walk Cruyff has 2 crossings in 4 stride phases** (≈ 9.5 cm, near the drag: the dragging leg passes behind the plant leg). VOCAB-1 had 6.
5. **The extreme set's +7 normal-speed events** (§5) belong to the low-speed-whip class already reported in VOCAB-1, not to Cruyff / chop clips.
6. **Nothing is frozen or integrated.** The hooks' templates and the VOCAB-1 pages are unchanged; this build sits beside them for your A / B review.

## 7. For your decision

1. Is the Cruyff at walk / jog / run (§1, the COMPARE pairs) now clearly the elite reversal at 1×?
2. Is the chop's speed-keeping turn at a sprint (credible: 5.3 m/s kept) what you want from it?
3. The jog chop without its hop: keep it as a chop entry, or keep the chop to run / sprint?
4. Should the sprint arc vs chop question (§6.2) wait for defenders?

## Files

- `review_artifacts/cruyff_chop1/`:
  - this report;
  - `VOCABULARY.md`;
  - `HANDOFF.md`;
  - `STATUS.json`;
  - `sources/` (your instruction, verbatim);
  - `evidence/`.
- The code is in `sandbox/visual/cruyff_chop1/` and the pages are `cruyff_chop1_lab.html` and `cruyff_chop1_sandbox.html`.
- The tools: `tools/cc_measure.mjs` (the phase-averaged hierarchy) and `tools/cc_compare.mjs` (the Lab's COMPARE pairs in node).
