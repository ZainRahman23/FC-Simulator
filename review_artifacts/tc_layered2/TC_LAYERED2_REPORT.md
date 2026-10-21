# TC-LAYERED-2: B4 and B5 developed on 88573ef0

**Status:** presented for the owner's playtest. Not frozen, not integrated, local only (the character is a real player's model).

**Pages:**
- Playground: http://127.0.0.1:8361/sandbox/visual/tc_layered2.html
- Immutable baseline: http://127.0.0.1:8361/sandbox/visual/tc_baseline_88573ef0.html (unchanged; lock check PASS)
- TC-LAYERED-1: `tc_layered.html`, kept unchanged as the record.

I cannot play video in real time. Every number below is from deterministic simulation and headless-Chrome captures. **Measurements diagnose; your playtest decides.**

## 1. What changed

The playground is `sandbox/visual/tc_layered2/`, TC-LAYERED-1's layered copy of 88573ef0, continued:
- **ALL OFF = exact 88573ef0:** 345/345 runs identical to the locked engine (every new test plus the rapid-input sequences: hash, contacts, actions).
- **Presets:** A · A + B4 · A + B5 · A + B4 + B5 · + B2 (optional).
- **Rejected layers:** B1, B3 and B6 are kept only as greyed toggles, off, and appear in no preset.
- **Movement capability is untouched**, as are ratings, weak foot, styles and rapid-input robustness.

### B4: score the exit, not the label

Every candidate (carry, generic action, named move) is scored on its **predicted football outcome**: `outcome()` / `costB4()` in `tl_sim.js`. The ball is carried through the candidate's own planned contacts, each launched from where the ball will be (as the kernel will launch it), then compared against the candidate's own body path.

**What is predicted:**
- the first contact that puts the ball within 30° of the request;
- the ball's direction and speed after the action;
- the body's direction and speed 0.25 s after it, and the share of the requested speed kept along the new line;
- **when the ball is next inside the body's reach** (the next useful touch);
- the separation over the following second.

**How it is scored:** one cost for all candidates, built from:
- the new line, the useful contact and the next-touch gap;
- the ball's angle off the request, the speed kept and the separation;
- contacts, protection, a lunge's effort, the preferred foot, and continuation / switch hysteresis.

There is no angle fit and no randomness: identical state and input give an identical choice.

**Two physical checks replace the old angle-fit term:**
- **The body a named move needs:** its post-contact turn × its speed against its authored reference. Beyond 1.35× the body cannot follow its own technique; this is what made a 90° outside cut at sprint lose the ball 5/8 times.
- **No magic foot:**
  - a generic touch's swing, routed through the ball, may average at most 1.3× that foot's natural swing (1.0× for a lunge);
  - a named move's set touch must lie inside its foot's swing (88573ef0's gait can move that landing, leaving the foot drawn 0.5 m from the ball it plays).

**Vocabulary** (labels as the HUD shows them):
- COMPACT_INSIDE_REDIRECT, COMPACT_OUTSIDE_REDIRECT, GATHER (formerly "across-body gather"), URGENT_REACH, BRAKING_TOUCH, BRAKING_PIVOT.
- URGENT_REACH is offered **only when the ball is escaping** the ordinary carry: no touch at all, a pursuit, or no touch for 0.65 s. Previously it lunged at 20° corrections.
- The BRAKING_TOUCH is limited to true reversals (≥ 135°).

**Attribute-ready:** `CAPS = techCaps(dri)` holds what Dribbling will later scale, at the D99 ceiling only (no curve built): vocabulary, lunge effort, entry slack, entry lateness, quick step, exit share.

### B5: enter late, leave early

B5 adds no family. It trims the ownership around whatever action is chosen.

**Exit:** ordinary control returns at the end of the striking foot's authored follow-through, with no exit lock:

| Technique | Control returns after contact |
|---|---|
| Chop | 0.14 s |
| Cruyff | 0.13 s |
| Hook | 0.09 s |
| Drag-back | 0.08 s |
| Outside cut | 0.06 s |

Presentation keeps resolving through the posture channels' continuity.

**Entry:**
- The step into a technique may be a quick one (35 % of a stride sooner; baseline −20 %).
- A technique may be entered later (decisive contact ≥ 0.07 s ahead; baseline 0.12 s).
- The Cruyff, hook and drag-back can open at their plant when the body is already slow enough for the braking step they begin with. The chop keeps its hop, because it carries its pre-turn.
- A generic action takes **no extra plant** when the support foot is already down through the touch.
- Weight transfer, plant, strike, contact and body redirection are always kept, so the named moves stay recognisable.

## 2. B5 measured directly (`evidence/B5_TIMINGS.txt`)

The first technical action after each stick change in the snaps, corrections and rapid tests. Medians, in seconds.

| Action | Config | Request → preparation | Request → contact | Contact → control | Ownership |
|---|---|---|---|---|---|
| RONALDO_CHOP | A | 0.31 | 0.63 | 0.32 | 0.64 |
| | A + B5 | 0.26 | 0.58 | **0.14** | **0.46** |
| DRAG_BACK | A | 0.18 | 0.48 | 0.26 | 0.56 |
| | A + B5 | 0.18 | 0.48 | **0.08** | **0.38** |
| HOOK | A | 0.18 | 0.48 | 0.40 | 0.70 |
| | A + B5 | 0.17 | 0.47 | **0.09** | **0.39** |
| CRUYFF | A | 0.14 | 0.50 | 0.40 | 0.76 |
| | A + B5 | 0.18 | 0.53 | **0.13** | **0.49** |
| OUTSIDE_CUT | A | 0.59 | 0.73 | 0.12 | 0.26 |
| | A + B5 | **0.41** | **0.55** | 0.06 | 0.20 |
| COMPACT_INSIDE_REDIRECT | A + B4 | 0.15 | 0.27 | 0 | 0.12 |
| | A + B4 + B5 | **0.05** | **0.17** | 0 | 0.12 |
| COMPACT_OUTSIDE_REDIRECT | A + B4 | 0.16 | 0.28 | 0 | 0.12 |
| | A + B4 + B5 | **0.08** | **0.20** | 0 | 0.12 |

**Answer:** B5's promise comes mostly from **faster exits**: contact → control 0.26–0.40 s becomes 0.08–0.14 s, about a third less ownership for every named move. **Faster entry is smaller and selective:** the outside cut (−0.18 s to contact), the chop (−0.05 s), and the generic redirects with B4 (−0.10 s, no extra plant). The Cruyff / hook / drag-back plant entries rarely apply in these tests, because they need an already-slow body.

## 3. Report card (`evidence/REPORT_CARD_stack.txt`; contact / new line, s; LOST in brackets when non-zero)

| Test | A (88573ef0) | A + B4 | A + B5 | **A + B4 + B5** |
|---|---|---|---|---|
| jog 45° | 0.22 / 0.25 | 0.22 / 0.25 | 0.22 / 0.25 | **0.10** / 0.25 |
| jog 120° | 0.53 / 1.06 (4) | 0.64 / 0.86 | 0.53 / 0.81 (1) | 0.50 / **0.79** |
| jog 180° | 0.48 / 0.76 | 0.45 / 0.68 | 0.47 / 0.71 | **0.10 / 0.56** |
| jog rapid L/R | 0.23 / 0.41 (3) | 0.35 / 0.58 (2) | 0.30 / 0.79 (4) | 0.17 / 0.38 (1) |
| run small corrections | 0.20 / 0.13 | 0.19 / 0.13 | 0.20 / 0.13 | 0.16 / 0.13 (+B2: **0.06 / 0.05**) |
| run 45° | 0.29 / 0.47 | 0.22 / 0.47 | 0.29 / 0.47 | **0.11 / 0.36** |
| run 60° | 0.34 / 0.70 | 0.22 / 0.58 | 0.34 / 0.70 | **0.11 / 0.52** |
| run 90° | 0.55 / 0.70 | 0.55 / 0.70 | 0.58 / 0.73 | 0.50 / 0.65 |
| run 120° | 0.63 / 0.79 | 0.63 / 0.79 | 0.58 / 0.74 | 0.58 / 0.74 |
| run 180° | 0.93 / 1.18 | **0.48 / 0.85** | 0.93 / 1.18 | **0.48 / 0.85** |
| run rapid L/R | 0.35 / 0.66 (3) | 0.65 / 0.76 (1) | **0.18 / 0.43** | 0.51 / **0.33** (2) |
| sprint 45° | 0.33 / 0.55 | 0.28 / 0.55 | 0.33 / 0.55 | 0.20 / 0.59 |
| sprint 60° | 0.33 / 0.86 (4) | 0.63 / 0.76 (4) | 0.33 / 0.86 | 0.59 / **0.73** |
| sprint 90° | 0.68 / 0.86 | same | 0.65 / 0.85 | 0.65 / 0.85 |
| sprint 120° | 0.69 / 0.97 | 0.66 / 1.08 | 0.65 / **0.90** | 0.64 / 1.02 |
| sprint 150° | 0.66 / 1.23 | 0.54 / 1.08 | 0.62 / 1.19 | **0.52 / 1.10** |
| sprint 180° | 0.54 / 1.11 | same | 0.52 / 1.10 | 0.52 / 1.10 |
| sprint rapid L/R | 0.14 / 0.43 (4) | 0.28 / 0.63 (4) | 0.29 / 0.57 (5) | 0.17 / 0.43 (4) |

Flowing carry and gradual rotation are unchanged at run. The full card adds visible response, heading change, lock, touches and redundant touches, separation, every body warning, and each test at every speed.

## 4. Named moves survive (`evidence/NAMED_MOVE_SCENARIOS.txt`)

The table shows how often each named move is chosen, A → A + B4 + B5. It covers states where 88573ef0 itself chooses the technique, and nearby states. 8 traces each.

| Technique | Favourable state | A | A + B4 + B5 | Nearby state: who wins with B4 + B5 |
|---|---|---|---|---|
| RONALDO_CHOP | run 95° · sprint 90° | 7/8 · 8/8 | **8/8 · 8/8** | run 65°: compact redirects 5, carry 2, chop 1 (contact 0.34 → 0.11) |
| CRUYFF | jog 100° · jog 120° | 2/8 · 2/8 | **6/8** · 3/8 (hook 5) | jog 135°: hook 5, Cruyff 3 |
| HOOK | run 130° · run 150° | 6/8 · 4/8 | **8/8** · 4/8 (drag-back 4) | jog 160°: BRAKING_TOUCH 4, drag-back 3 |
| DRAG_BACK | sprint 180° · run 180° | 8/8 · 4/8 | **8/8 · 8/8** | jog 180°: BRAKING_TOUCH 6, drag-back 2 (contact 0.48 → 0.10) |
| OUTSIDE_CUT | sprint 60° · jog 90° | 4/8 · 3/8 | 4/8 · **5/8** | sprint 45°: compact outside / inside redirects 6, carry 2 |

Generic actions take the nearby states. Named moves win where their protection, redirect and exit are the better continuation. At jog 180° the braking touch (a sole stop-and-turn) beats the drag-back on the predicted outcome; you should judge whether that reads right.

## 5. TECHNIQUE SOLUTION GOOD — CURRENT MOVEMENT ENVELOPE INSUFFICIENT

These are deliberately not compensated (`evidence/MOVEMENT_ENVELOPE_DECISIONS.txt` has the resolver's own notes):
1. **Sprint 90°.** A compact redirect could make the touch, but the body (tracker ≈ 79°/s at 8 m/s, braking only beyond 50°) cannot follow the new line. The touch ends up aimed where the body can go (53° off the line), and the body keeps 26 % of its speed along it. The chop (8/8) is therefore correctly chosen. **Retest on A99.**
2. **Sprint 120°.** The chop entered at sprint speed would need ≈ 1.9× its authored body motion. The hook is chosen instead (6/8), a little later on the new line (1.02 vs 0.97 s). **Retest on A99.**
3. **Sprint 180° and sprint 150°.** Braking (9.5 m/s²) and re-acceleration (7 m/s²) set the floor: 180° is unchanged at 1.10 s, 150° improves to 1.10 s from 1.23.
4. **Rapid L/R at sprint.** Earlier or generic touches cannot make the body follow faster than its lateral limit, so no gain (0.43 s line in both).

## 6. Body warnings and known visual issues (diagnostics, not watched)

- **Contact foot ↔ ball:** at baseline levels with B4 + B5, after two fixes (the retimed swing finishes its blend before the touch; set touches must be inside their swing).
- **Foot jumps:**
  - sprint rotation: 48 → 29;
  - rapid left/right: 46 → 85 jog, 85 → 129 run, 66 → 117 sprint. Re-planned swings move fast in rapid alternation, mostly inside one plan, plus 88573ef0's own ball-clearance jitter.
- **Leg crossings:** similar to A, and lower in jog rapid L/R (31 → 16).
- **Pelvis ↔ root:** similar to A.
- **88573ef0's own issues remain:**
  - a foot left behind while accelerating from a walk stance;
  - the chop's exit touch from a planted foot, now usually replaced by the carry under B5;
  - clearance jitter.
- **The braking touch and the braking pivot** look functional rather than named: please judge them.

## 7. Ready for A99

B4's choices come from each candidate's own body path, and B5's from each technique's own swing and stride. On a new movement envelope (Astra's AGILITY-99-V1) the same code would re-decide: generic redirects at sprint become viable wherever the body can follow. The layers are flags on the copied simulation, so A + A99 + B4 + B5 is the same transplant.

## 8. How to use the page

- **Presets** A / A + B4 / A + B5 / A + B4 + B5 / + B2. **Engine:** layered or the locked 88573ef0.
- **HUD:** the selected solution in large type (CARRY, COMPACT_INSIDE_REDIRECT, … RONALDO_CHOP, CRUYFF, HOOK, DRAG_BACK, OUTSIDE_CUT), with:
  - why it won (its cost terms);
  - the nearest alternative (+ΔJ);
  - the prediction: contact time, the ball's exit speed and angle to the request, the body's exit speed and angle, and the next touch;
  - **last action:** what was just done, with its timings.
- **Same input →** any configuration, or **X** through the stack.
- **Test:** every playtest item, plus the named-move scenarios ("named · …"), played through the stick.
- **BODY WARNINGS** panel and body debug, as before.
