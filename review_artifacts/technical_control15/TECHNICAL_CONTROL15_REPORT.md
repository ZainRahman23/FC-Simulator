# TECHNICAL-CONTROL-1.5: technique reset (research, the Ronaldo chop spec, five elite references)

**Status: presented for visual approval. Not frozen, not integrated.**

**Instruction:** `sources/2026-10-20_user_instruction_technical_control_reset_research.md`.

**Review page (local only; the character is a real player's model):** `review/TECHNICAL_CONTROL15_REVIEW.html`.

**Lab:** `http://127.0.0.1:8361/sandbox/visual/technical_control15.html?tech=CHOP90&single=quad`.

I cannot play video in real time. The numbers below are measured, and stills were inspected; the motion is the owner's to judge.

## 1. What was asked, what was done

The owner reviewed TECHNICAL-CONTROL-1.4: its "Ronaldo chop" was not a Ronaldo chop (the ball stayed exposed), and the techniques were
procedural contacts with labels. The instruction was:
1. research first;
2. present a research table and a Ronaldo chop specification with top-down vectors;
3. then build only five elite 99 references (45°, a 90° chop, 120°, 150°, 180°);
4. show each at 1× and 0.5×, from front 3/4, rear 3/4, side and top;
5. test the chop against 8 points;
6. stop for visual approval.

**Research.** Three notes, each with its quotes and URLs: `research/R1_chop_cruyff_hook_dragback.md`,
`research/R2_cuts_rolls_croqueta_feint_carry.md` and `research/R3_cod_biomechanics.md`.
- Coaching sources: the FIFA Training Centre, the FA, Meulensteen, academy session plans and coaching sites.
- Biomechanics: Dos'Santos 2018 / 2021, Falch 2020, Vanrenterghem 2012, Havens & Sigward, Smith 2000's force plates (Cruyff, drag-back),
  Zago 2016, and Premier League turn data (Griffiths 2025).
- Synthesis: `TECHNIQUE_RESEARCH_AND_SPEC.md`, covering:
  - the owner's columns for 11 techniques;
  - the action map by angle;
  - the Ronaldo chop specification;
  - the exposure diagnostic;
  - what is explicit [E], inferred [I] and our decision [D].
- No slow-motion breakdown of the chop exists in text. The chop's mechanics rest on coaching sources (five say "behind the support leg"),
  not biomechanics.

**The action map** (research-derived):

| Angle | Technique |
|---|---|
| 45° | outside-foot cut |
| 90° | Ronaldo chop |
| 120° | Cruyff turn |
| 150° | inside hook |
| 180° | drag-back |

**The references are AUTHORED actions** (ENTRY · CONTACT · PROTECTION · EXIT). The new engine is `sandbox/visual/technical_control15/tc15_ref.js`.
It executes an authored technique (`tc15_tech.js`):
- **Body:** speed and travel-heading keys for the centre of mass; the pelvis heading, trunk turn, lean, side lean, crouch and arms.
- **Feet:** every stance (where, when, the foot's heading, pivots on the forefoot, the heel's rise); every swing (RUN-1's own stride, or authored
  waypoints relative to the ball, the moving ball, the pelvis or the origin).
- **Contacts:** the foot, surface and time, and the ball's launch. The launch is authored, or solved on the kernel so that the ball arrives at
  the next contact.
- **Reused, unchanged:**
  - the frozen ball kernel (BALL-FEEL-1.3 world, DRIBBLE-V1's);
  - DRIBBLE-1's boot hull (the labelled surface placed on the ball, gap 0);
  - TECHNICAL-CONTROL-1.1's leg chain (hip swivel → IK → tibia → ankle, in anatomical ranges);
  - RUN-1's running stride (its swing path, and now its foot pitch);
  - TECHNICAL-CONTROL-1.2's carry rules for the run-up (right lane, right laces, the ball always ahead).

**The ball-exposure diagnostic** (provisional; not gameplay).
- **Model:** a defender's reaching leg from five directions fixed in the entry frame — a line from his hip (0.9 m out, 0.85 m high) to the ball.
- **Blocked or direct:** it is blocked by the player's legs, hips or trunk; otherwise it is a direct line.
- **Reported:** per frame, and per window (contact, through the stance, exit), and against each technique's own pressure side.
- **Lab:** the lines are drawn from the ball (green = blocked, red = direct).

## 2. Results (`evidence/TC15_EVIDENCE.json`, `tools/tc15_eval.mjs`)

| Reference | Approach → at contact → min (m/s) | Decisive contact | Ball out | Body (+0.5 s) | On the new line | Accel (0.5 s) | Ball nearest pelvis | Pressure side blocked (contact / stance / exit) |
|---|---|---|---|---|---|---|---|---|
| 45° outside cut | 5.5 → 5.05 → 4.85 | R outside | 6.4 m/s @ 42° | 45° | +0.10 s | 1.5 m/s² | 0.23 m | left: 0.5 / 0.5 / 0.34 |
| 90° Ronaldo chop | 5.0 → 3.5 → 2.2 | R inside | 4.3 m/s @ −82° | −91° | +0.24 s | 4.7 m/s² | 0.23 m | front 0.93 / 0.95; right opens after the chop |
| 120° Cruyff | 4.0 → 0.35 → 0.15 | R inside (drag) | 2.8 m/s @ −120° | −123° | +0.44 s | 6.1 m/s² | 0.21 m | front: 1.0 / 0.95 / 0.82 |
| 150° inside hook | 3.5 → 0.4 → 0.15 | R inside (hook) | 3.0 m/s @ −150° | −150° | +0.40 s | 5.7 m/s² | 0.06 m | front + right: 0.5 / 0.2 / 0.3 |
| 180° drag-back | 3.0 → 0.35 → 0.15 | R sole (pull) + L laces | 1.7 then 4.6 m/s @ 180° | 180° | +0.36 s | 5.9 m/s² | 0.17 m | front: 0.93 / 0.69 / 0.62 |

**The Ronaldo chop acceptance test: 8 / 8.** The external-kick fail condition is not triggered.

| # | Check | Result |
|---|---|---|
| 1 | Approach speed | 5.0 m/s |
| 2 | The shielding leg crosses in front | the left foot lands 0.30 m past the ball, 0.02 s before the chop |
| 3 | The striking foot is behind / across it | 0.17 m behind the left heel |
| 4 | Inside contact | the boot hull's INSIDE face is on the ball |
| 5 | The ball goes behind / across the shielding leg | crosses the left foot's line 0.21 m behind the heel; passes 0.23 m from the pelvis (under the body) |
| 6 | The body blocks the pressure line | the front line (a defender level-ahead, the sources' cue) is blocked 93–95%. From the right it is blocked at the chop, but the side opens as the striking leg recovers: shown as a limitation |
| 7 | Oriented to the new line | pelvis −90° at +0.35 s; on the line at +0.24 s |
| 8 | Acceleration | 2.2 → 3.9 → 5.3 m/s |

**Body quality** (the posed skeleton at 240 Hz):

| Measure | Result |
|---|---|
| Leg capsule clearance, minimum | +5.7 cm (outside cut), +2.9 (chop), −1.6 (Cruyff), −2.0 (hook), −2.1 (drag-back) |
| Ball against the boots outside contacts | −1.6 to −3.6 cm, right after some touches |
| Hard joint range exceeded | 0° for 3 of 5; 6° (chop) and 2.7° (hook), both at the right hip |
| Ankle orientation error, maximum | 11–23° (cuts, chop, Cruyff); 31° (hook, drag-back) — the chain saturates; the foot shown is reachable |
| Reach adaptation | ≤ 9 cm |

How the chop's geometry was found is in the spec (§4). These are the physical constraints that shaped it:
- the left foot can only push the body left if the body is left of it;
- the ball still rolls forward when chopped, so the foot pushes back-left from the ball's front-right;
- once the body turns over the plant foot, there is no room for the striking foot behind it.

**Clips** (`clips/`, 1280×720, 30 fps):

| Clip | Count |
|---|---|
| Each reference: quad (front 3/4 · rear 3/4 · side · top) at 1× and at 0.5× | 10 |
| The chop at 0.5× from each view singly | 4 |

**Strips:** `strips/` (quad stills around each decisive contact). **Diagrams:** `diagrams/` (SVG + PNG).

## 3. Not done (by design), and the owner's decisions

**Not done:**
- **Not integrated into TECHNICAL-CONTROL-1.2 / 1.3's simulation**, and not selected by a planner. Stand-alone references.
- **No rating curves.** Ball Control 99 = the ideal launch.
- **No mirroring, styles or other moves.**
- **TECHNICAL-CONTROL-1.4's technique definitions are superseded**, not reused.

**Decisions for the owner:**
- **The chop's angle:** the ball goes 82° and the body 90°.
- **The chop's striking-foot landing:** crossed behind the plant leg, or a crossover step round it (built).
- **150°:** inside hook (built) or outside hook.
- **Drag-back turn side:** toward the dragging foot (built).
- **The chop's right-side exposure** after the contact.

## 4. Protected and frozen work

No tracked file was modified (`git diff` empty before the commit). TC1.5 is new files only:
- `sandbox/visual/technical_control15/`;
- `sandbox/visual/technical_control15.html`;
- `review_artifacts/technical_control15/`.

These were not changed:
- the frozen milestones: TURN-1.2, RUN-1, BALL-PHYS / BALL-FEEL, tackle, DRIBBLE-1…1.5 / DRIBBLE-V1;
- the protected work: RECEIVE-CONTROL-1.1, PASSING, SHOOTING, the RECEIVE-KILL evidence, goalkeepers;
- Codex work.

The engine imports the ball kernel (`dribble15/d15_core.js` `BALL_DEFAULT`), TECHNICAL-CONTROL-1.1's leg functions and RUN-1's rig read-only.
