# TC-UNIFIED-1: morning report (overnight, 21 Oct 2026)

**Not frozen. Not integrated. LOCAL ONLY:** the character is a real player's model.

I cannot play video in real time. Every judgement below comes from simulation measurements, posed-body audits and browser screenshots. The look and feel is yours to judge on the page.

---

## J. Playable URL

# ▶ `http://127.0.0.1:8361/sandbox/visual/tc_unified1.html`

The page opens straight into dribbling:
- **Defaults:** BC99 / D99 / A99-C, **FULL**, BALL ON, the joystick on screen (drag; SPRINT / WALK buttons and sprint lock; WASD + Shift also work).
- **Stack buttons (top bar):** `A` · `A + C` · `A + C + SUPPORT` · `A + C + SUPPORT + B4` · `FULL`. **X** replays your own last input through the next stack.
- **Playtest menu:**
  - the 22 morning cases (§28);
  - 11 favourable examples, each a state where FULL itself picks that move;
  - TC-LAYERED-2's 240 report-card traces.
- **BALL** checkbox: BALL OFF runs Astra's movement probe.
- **⚙ diagnostics:** everything else (layer toggles, attributes, panels, body warnings, performance).

The locked BASELINE-88573ef0 page is untouched, and so is Astra's `agility99.html`; both are linked under ⚙.

**Checked in Chrome:**
- 20 / 20 cases are deterministic, with no console errors.
- Every favourable example plays its own move.
- Each playtest case is fed every 240 Hz tick from its trace, exactly as in node; live stick input is read once per frame.
- Node ≡ browser is bit-identical.
- The same-input chain A → FULL replays identical input and returns to the original hash.
- Frame work p99 is 2–8 ms (worst 15 ms on a re-plan).

Evidence: `evidence/browser/`.

---

## A. What I integrated

| Piece | How |
|---|---|
| **88573ef0** | The foundation. `A` = the locked engine exactly (`u_equiv`: 345 / 345 identical). |
| **A99-C** (Astra's movement) | Exact. The carry's root path uses Astra's `advance()`; technique keys run as authored. `A + C` ≡ Astra's own AgilitySim BALL ON, 345 / 345. Agility, braking, lateral movement and the envelope are not modified. |
| **Astra's persistent support** | Moved into the **shared foot plan** that Technical Control and the body both use (`u_sim.js`, `u_gait.js`). Astra's rate-limited landing revision and replacement steps are kept. The new parts are commitment, re-timing by anchors, early release and the demand cadence. A **continuous foot timeline** in the body (`u_body.js`) keeps every drawn foot on one history. |
| **B4** | TC-LAYERED-2's generic vocabulary plus named moves, chosen by predicted outcome with no angle buckets. Two terms are added: analog-first, and one foot, one history. |
| **B5** | TC-LAYERED-2's short entries and exits (no exit lock, quick-step entries, trimmed plants), unchanged. |

**Architecture in one sentence:** the simulation owns one foot plan, and the body draws exactly that plan through a continuous timeline. That plan holds the stances, each swinging foot's committed landing, and every contact.
- The boot that plays the ball is the boot drawn there.
- Nothing the body does feeds back into the simulation.
- The ball and the contacts are never moved for animation.
- There is no magnetism and no RNG.

Details: `HANDOFF.md`.

## B. Straight-running quality

The crouched look came from three things, none of them the support architecture itself:
- **Astra's posture channels:** these are now **demand-driven**. They stay at zero on a steady straight run and rise only with real lateral acceleration (> 2.5 m/s²) or braking (> 2 m/s²).
- **Compressing the body for every leg:** now only a planted or contacting leg lowers the body, as in 88573ef0.
- **Footfall placement:** committed landings were being re-placed with a simplified rule. They now use 88573ef0's own placement: own side of the other foot, off the ball's path.

Steady straight running, 3–7 s (`evidence/straight_run_look.txt`):

| | pelvis height mean (range) | knee stance / swing | swing peak | posture vs 88573ef0 (every joint relative to the pelvis, phase-aligned) |
|---|---|---|---|---|
| Run, **88573ef0** | 0.886 m (0.822–0.931) | 62° / 111° | 0.453 m | — |
| Run, **FULL** | **0.884 m** (0.799–0.931) | 68° / 120° | 0.477 m | mean **1.6 cm** |
| Run, Astra's body | 0.830 m (0.780–0.875) | 43° / 102° | 0.352 m | — |
| Sprint, **88573ef0** | 0.890 m (0.830–0.937) | 60° / 129° | 0.612 m | — |
| Sprint, **FULL** | **0.888 m** (0.784–0.937) | 71° / 134° | 0.612 m | mean **0.8 cm** |
| Sprint, Astra's body | 0.823 m | 44° / 108° | 0.384 m | — |

On a steady straight run FULL's footfalls are identical to 88573ef0's in time and place (same 0.632 s / 0.494 s stride). The turning support (cut and brake cadence, early release, lean / side / crouch) switches on only when the movement demands it.

One residual difference: the stance knee is 6–11° more bent at the deepest point. The pelvis dips up to 4.6 cm lower at sprint, at the moments a planted leg is out of reach (vertical compression instead of 88573ef0's horizontal pull).

## C. Contact integration: boot ↔ ball at every authoritative contact

This uses Astra's 24 BALL ON scenarios and Astra's metric (the contacting boot hull's gap to the ball at the contact tick). From `evidence/audit_ball_on.txt`:

| Stack | Contacts | > 3 cm | > 10 cm | Worst |
|---|---|---|---|---|
| Astra's delivered body (A99-C + DirectionBody) | 144 | 84 | **51** | **53.6 cm** |
| A (88573ef0) | 162 | 12 | 4 | 24.1 cm |
| A + C | 144 | 14 | 3 | 24.1 cm |
| A + C + SUPPORT | 164 | 14 | 5 | 37.3 cm |
| A + C + SUPPORT + B4 | 173 | 12 | 2 | 24.1 cm |
| **FULL** | **183** | **12** | **2** | **12.8 cm** |

On the owner's 240 traces (report card), contacts with a gap over 4 cm: A 114, B45 115, **FULL 44**, out of about 1,420 touches each.

The fixes behind this:
- the plan's predicted ball is taken after the tick's own kick (88573ef0's body predicted the next touch from the pre-kick ball, up to 0.85 m off);
- the timeline settles before the contact;
- a swinging foot is never handed a new touch in its last 0.09 s;
- a touch needing a planted foot to cover a metre in 0.09 s is skipped;
- the urgent reach stays within the leg.

The remaining > 10 cm cases are a fast authored swing the drawn foot cannot catch at 9 cm per tick.

## D. Foot and body integrity

**Astra's BALL ON set** (`evidence/audit_ball_on.txt`):

| Stack | Foot jumps (toe > 12 cm per tick) | Max step | Intersection frames (< −2 cm) | Rendered root ↔ authoritative root |
|---|---|---|---|---|
| Astra's body | 0 | 7 cm | 0 | 0 |
| A | 543 | 117 cm | 646 | 50 cm |
| A + C | 490 | 124 cm | 373 | 84 cm |
| **FULL** | **11** | 32 cm | **302** | **4 cm** |

**The owner's 240 traces (report card):**

| | A | B45 | **FULL** |
|---|---|---|---|
| Foot jumps | 911 | 1079 | **5** |
| Leg-intersection episodes | 261 | 247 | **181** |
| Planted-foot slides (> 4 mm per tick) | 0 | 0 | **130** |
| No foot down > 0.15 s | 133 | 159 | **390** |

**BALL OFF** (Astra's 272 locomotion scenarios): FULL has 10 jumps and 1,771 intersection frames. Astra's body has 0 / 0; A + C has 898 / 3,977.

What fixed the pops:
- **The 2 m B4 / B5 lift-off pop:** Astra's gait left action steps without a stance length.
- **The every-other-tick planted ↔ swinging flicker:** 88573ef0's `lift()` re-extended ended stances.
- **The foot timeline itself:** offsets, speed and turn limits, and a planted foot held through its stance.

## E. B4: generic vs named

The selection is by predicted outcome, unchanged in principle. Where each action wins in FULL (`evidence/action_grid.txt`; 8 traces per cell: JOG / RUN / SPRINT × 30–180°):

| Action | Where it wins in FULL |
|---|---|
| Compact inside / outside redirect | 45–90° at every speed |
| Ronaldo Chop | Run 105–120° (8 / 8), sprint 105° (6 / 8) |
| Cruyff Turn | Sprint 120–135° (6 / 8), jog 135° (5 / 8) |
| Inside Hook | Run 135° (4 / 8) |
| Drag-back | Sprint 150–180° (8 / 8), jog 180° |
| Braking pivot | Jog 105–120° |
| Braking touch | 150–180° at jog / run |
| Outside Cut | Rare: jog 45–90°, 1–2 / 8 |

**Compared with TC-LAYERED-2 (B45) in its own favourable states** (`evidence/named_moves.txt`): C makes the generic actions faster, so they now win several of those states on outcome. For example, sprint 90°:
- the chop is chosen 1 / 8 (B45: 8 / 8);
- the compact redirect that wins is on the new line in 0.53 s, against the chop's 0.85 s.

The named moves are all still present: each favourable example on the page plays its move (checked in Chrome: Chop, Cruyff, Hook, Drag-back, Outside Cut, both compact redirects, braking pivot, braking touch, urgent reach, gather). Their windows are narrower than in B45, and the Outside Cut is the most squeezed.

**If you want named moves more often**, that is a style-bias decision for you. I did not tune it in.

## F. B5: entry, exit and ownership

Medians, request → preparation / → contact / contact → control returned (`evidence/b5_timings.txt`):

| | B45 | FULL |
|---|---|---|
| Compact redirect | 0.05–0.08 / 0.17–0.20 / 0.00 | 0.16–0.18 / 0.28–0.30 / 0.00 |
| Drag-back | 0.18 / 0.48 / 0.08 | 0.23 / 0.53 / 0.08 |
| Ronaldo Chop | 0.26 / 0.58 / 0.14 | 0.36 / 0.68 / 0.14 |
| Cruyff | 0.14 / 0.50 / 0.13 | 0.26 / 0.63 / 0.13 |

B5's exits are fully kept: control returns in 0.06–0.14 s, the same as B45.

Entries are 0.05–0.12 s later than B45. This is the cost of one foot, one history: a foot already swinging finishes its committed landing instead of being snapped onto the technique's.
- Committing from 0.40 s ahead cost a whole step on every technique; I measured and cut the horizon to 0.25 s.
- Allowing earlier quick-step landings was tried. It gave back 0.08 s on generic actions but cost body integrity (intersections 301 → 457), so I reverted it.

## G. Control

Owner's 240 traces, totals (`evidence/report_card.txt`):

| | A | B45 | **FULL** |
|---|---|---|---|
| **Ball LOST** | 28 | 10 | **1** |
| Redundant touches | 41 | 24 | 24 |
| Touches | 1412 | 1435 | 1418 |

Ball separation, median / max:
- sprint carry: 0.84 / 1.03 m;
- rapid L/R sprint: max 1.28 m (A 1.80, B45 1.71);
- sprint 60° snap: max 0.98 m (A / B45 1.37).

The fast circle keeps the ball. Before the analog fix it stalled at 0.6 m/s with the ball 1.5 m away.

## H. Responsiveness

Medians in seconds after the stick change: visible response / relevant contact / on the new line (`evidence/report_card.txt`):

| Case | A | B45 | **FULL** |
|---|---|---|---|
| Sprint 45° | 0.26 / 0.33 / 0.55 | 0.10 / 0.20 / 0.59 | 0.15 / 0.28 / **0.35** |
| Sprint 60° | 0.25 / 0.33 / 0.86 | 0.32 / 0.59 / 0.73 | 0.15 / 0.28 / **0.40** |
| Sprint 90° | 0.41 / 0.68 / 0.86 | 0.39 / 0.65 / 0.85 | **0.16 / 0.33 / 0.53** |
| Sprint 120° | 0.43 / 0.69 / 0.97 | 0.41 / 0.64 / 1.02 | 0.47 / 0.71 / 1.07 |
| Sprint 150° | 0.45 / 0.66 / 1.23 | 0.32 / 0.52 / 1.10 | 0.35 / 0.56 / 1.16 |
| Sprint 180° | 0.33 / 0.54 / 1.11 | 0.32 / 0.52 / 1.10 | 0.35 / 0.56 / 1.19 |
| Run 90° | 0.31 / 0.55 / 0.70 | 0.26 / 0.50 / 0.65 | **0.11 / 0.30 / 0.48** |
| Run 60° | 0.42 / 0.34 / 0.70 | 0.07 / 0.11 / 0.52 | **0.07 / 0.11 / 0.23** |
| Rapid L/R sprint | 0.13 / 0.14 / 0.43 | 0.13 / 0.17 / 0.43 | 0.15 / 0.18 / 0.38 |
| Jog 180° | 0.27 / 0.48 / 0.76 | 0.18 / 0.10 / 0.56 | 0.48 / 0.68 / 0.92 (slower) |

Gradual rotation responds visibly in 0.15–0.17 s at every speed.

Analog-first:
- gentle and tight curves (20 and 60°/s) are pure carry, holding 5.3 / 8.0 m/s with the ball at 0.4–0.6 m;
- snaps produce redirects or techniques.

## I. Remaining issues, not hidden

1. **Leg intersections.** 302 frames on Astra's BALL ON set (A: 646) and 1,771 in BALL OFF (Astra: 0). They concentrate in the fast circle and rapid L/R, where the swinging touch foot crosses the midline to reach the ball. I added Astra-style swing corridors and yaw limits, but not her full planted-foot ownership. Her BALL OFF 0 comes from a body that ignores the ball.
2. **Flight phases longer than 0.15 s** (390 vs 133) and **130 planted-foot slides**. These come from shortened reorganisation stances in cuts and technique stances; ordinary running is identical to 88573ef0. I have not removed them yet.
3. **Fast circle at sprint** still flips between actions (redirect → chop → Cruyff → drag-back within about 0.25 s at 270°/s). It keeps the ball, but it will not look calm. In Chrome one of its touches was missed.
   - **Movement dependency (TECHNIQUE SOLUTION GOOD / CURRENT MOVEMENT ENVELOPE INSUFFICIENT):** A99-C regains speed only once a motion completes. A continuously rotating stick keeps restarting it, so the body decays to about 0.4–0.8 m/s in a fast circle and cannot re-accelerate while steering.
   - I re-plan steady rotations in 10° steps; I did not modify C.
4. **Jog 180° and run 120°** are slower than B45 (see §H). B45 used a braking touch at 0.10 s at jog 180°; FULL tends to pick the drag-back.
5. **Entries 0.05–0.12 s later than B45** (see §F). This is the cost of committed landings.
6. **Named-move windows are narrower** under C (see §E). The Outside Cut is rare.
7. **Two contacts over 10 cm** (worst 12.8 cm) on Astra's set, and 44 over 4 cm in 1,418 touches. All are fast authored or generic swings that the drawn foot, limited to 9 cm per tick, cannot catch; mostly the urgent reach and a compact redirect at sprint.
8. **Straight run:** the stance knee bends 6–11° more at its deepest point (see §B).
9. **Test fixture changes:**
   - The node traces now ask for the page's base mode (RUN) while the stick rests, exactly as the page does.
   - The favourable examples were re-found on FULL's own grid.
   - They are phase-sensitive and may shift if anything changes.
10. **Disk:** about 460 MB free. Outputs were kept small.

Commits on `prototype/dribble-1`, local, to be pushed with the next daily publication: `c793713` (Astra's patch, verbatim) → `db65b13` → … → see `git log`. Nothing is frozen, and nothing in the locked baseline or Astra's files was modified.
