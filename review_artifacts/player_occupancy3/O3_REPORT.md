# TOUCHLINE — PLAYER OCCUPANCY STAGE 3: PHYSICAL IMPACT + BALANCE RESPONSE

**25 Oct 2026. Prototype V1, stopped for the owner's visual review.** Not integrated, not frozen, not merged, not published.

- **Branch:** `prototype/player-occupancy-stage3` (local), cut from Stage 2 (`817e0f25`).
- **What changed:** new files only — `sandbox/visual/occupy3/`, `sandbox/visual/occupy3_lab.html`, this folder. **Canonical files changed: 0.** Unchanged:
  - Stage 2 (`occupy2/`, run *as decided*);
  - Stage 1 (`occupy1/`);
  - Shared Possession + Reaction V1 (`possess1/`);
  - Standing Tackle V1 (`tackle1/`);
  - the canonical footballer (`vocab2/`, Body Feint VG + EF, Croqueta LEG-WAVE V4).
- **Comparison:** **STAGE 2** = Stage 2 as the owner decided it (`wallSparesMove: true`: the soft wall does not alter an already-planned / committed move's approach) · **STAGE 3** = the same world + the impact pass. Always from identical inputs.
- **Stage 2 decisions kept:**
  - committed planted feet exact;
  - committed-foot give **not** increased (the impact's shifts are charged to Stage 2's 2 / 8 / 12 cm ledger);
  - no look-ahead;
  - 2 cm tolerance;
  - 12 cm ordinary lean;
  - the canonical planted-foot swing / flick untouched.
- **Lab (LOCAL ONLY, real players' models):** http://127.0.0.1:8365/sandbox/visual/occupy3_lab.html — *TOUCHLINE — PLAYER IMPACT + BALANCE V1 REVIEW*.
- **The owner's instruction:** `sources/2026-10-25_user_instruction_player_occupancy_stage3.md` (verbatim).

Not built, as instructed: stumble / trip / fall animations, ground contact, get-up (Stage 3B), fouls / referee logic, strength ratings, tackle-outcome or balance tuning, slide tackle.

---

## IN SHORT

- **The class Stage 2 left unresolved is now an impact, not an overlap.**
  - When two motions meet beyond Stage 2's 2 cm tolerance and close fast enough to matter (or Stage 2 cannot separate them), the contact produces a **momentum consequence** for both bodies. It comes from their relative motion, the contact point's effective mass and each player's support — never from who attacks or defends.
  - Torso penetration: **22.9 → 3.1 cm** (matrix), **4.9 cm** worst over 352 moves.
- **Balance is explicit.**
  - A capture-point (linear inverted pendulum) model about the authored motion gives every response its class: A ABSORB · B CORRECT · C RECOVERY STEP · D STAGGER · E FALL.
  - The continuous severity σ (with its diagnostic BRUSH … SEVERE bands) is the demand on the support.
- **Recovery steps** emerge from the predicted capture point: the foot that can reach, without crossing, within the leg's reach. They are written into the canonical plan, so the canonical swing carries the foot there.
- **Authored actions are preserved as far as physics allows.**
  - Committed planted feet stay exact; Stage 2's 2 / 8 / 12 cm ledger also bounds the impact.
  - The perturbation is layered on the authored pose: pelvis over the same feet, trunk lean / side / rotation, knees, arms, head.
  - Each committed action is classified, with its reason: UNAFFECTED · PERTURBED BUT CONTINUES · TECHNICAL EVENT COMPLETES, RECOVERY REPLACED · INTERRUPTED BEFORE TECHNICAL EVENT · STAGGER / FALL CANDIDATE.
  - A decisive touch already made is never undone.
- **The ball and possession stay the authority's.** Not one ball change or possession transition comes from an impact, over 676 encounters. The touches the physics denied and the outcomes that moved are each listed with their physical cause.
- **Stage 2 bit for bit wherever Stage 3 does not act:**
  - before the first impact: 676 / 676 encounters, every joint;
  - a lone player: 105 / 105;
  - passing players: 56 / 56, including every touch within the tolerance.
- **Robust:** deterministic, no NaN, no stuck players, no loops, no step oscillation, no dual ownership or chatter (torture).
- **Cheap:** idle 0.6 µs, near 9.4 µs, active 75 µs per pair per tick.

**What it does not do yet** (the core of Stage 3B):
- it does not separate **leg-through-leg** (22.7 cm unchanged);
- trips are **detected, not simulated** — they are most of the fall candidates;
- fall candidates end in a labelled placeholder;
- the canonical body adds a one-frame vertical dip at some recovery-step landings.

**Visual verdict pending — the owner's.** The Lab is built for exactly that.

---

## 0. STAGE 2 FROZEN AND AUDITED FIRST (§1)

- **Stage 2 reproduced exactly** before any change. Every Stage 2 tool was re-run unchanged on this branch and compared with the evidence committed in `817e0f25`. Result: identical, except wall-clock timings (performance, browser and milestone timings). Record: `evidence/stage2_reproduction/REPRODUCTION.txt` (+ all outputs).
- **The exact Stage 2 comparison harness:**
  - `occupy3/o3_run.js` runs one encounter in three modes from identical inputs: `S2` (Stage 2 as presented), `S2D` (as decided) and `S3`;
  - `tools/o3_identity.mjs` compares S3 with S2D **every tick** — both roots, the ball, the authority's state and every joint of both posed bodies. The record is taken *live*, because a plan shifted later in place would rewrite the past if it were read back after the run.
- **Stage 3 acts only on a meaningful contact.** A player alone, and two players passing without one, are Stage 2 bit for bit (REGRESSION).

## STAGE 2 CONFLICT STUDY (§2) — what actually remained unresolved

Built **before** any impact model. Tool `tools/o3_study.mjs`, run on Stage 2 as decided. Full tables and every episode: `evidence/study/conflicts_{review,moves,search}.{txt,json}`.

**What is recorded.** Every contact episode (consecutive ticks with a resolved pair deeper than the 2 cm tolerance) that reaches an UNRESOLVED tick. It is recorded **at the tick the meaningful contact begins**:
- **players:** position, root velocity, facing, travel, request, action, phase, commitment;
- **support:** planted / airborne feet, the polygon, the posed centre of mass and its margin inside the polygon, the lean, the budgets left;
- **contact:** regions, point, normal, depth; the relative velocity of the contact points (normal / tangential / vertical) and of the roots; where on each body (FRONT / SIDE / BEHIND); fast limb or not;
- **ball / action:** the authority's state and owner, distances, who has touched it, the tackle / move committed, before or after its decisive event.

Then its peak, its unresolved classes and its length.

| set | encounters | contact episodes > 2 cm | reaching UNRESOLVED | unresolved ticks by Stage 2 class |
|---|---|---|---|---|
| review | 37 | 58 | 27 | COMMITTED CONFLICT 466 · AUTHORED / BALL-ANCHORED LIMB PATH 121 · COMMITTED ACTION'S LIMB 93 · PLANTED SUPPORT 59 · FAST LIMB 22 |
| moves | 352 | 311 | 165 | COMMITTED CONFLICT 2995 · COMMITTED ACTION'S LIMB 879 · AUTHORED LIMB PATH 237 · PLANTED SUPPORT 208 · FAST LIMB 94 · PLANTED LEGS 68 |
| search | 209 | 206 | 106 | COMMITTED CONFLICT 617 · COMMITTED ACTION'S LIMB 348 · AUTHORED LIMB PATH 250 · FAST LIMB 112 · PLANTED SUPPORT 46 · PLANTED LEGS 11 |

### The families — what the evidence says

1. **A committed move meeting a tackle in its follow-through.** This family dominates the unresolved ticks. On the moves set, the largest families are:

   | family | episodes | unresolved ticks |
   |---|---|---|
   | a *planned* Body Feint × a tackle after its contact | 24 | 773 |
   | a committed Body Feint after its decisive touch × the same | 18 | 540 |
   | a Croqueta after its decisive touch × a tackle before its contact | 8 | 502 |
   | a Croqueta before its decisive touch × a tackle after its contact | 12 | 490 |

   The tackle is almost always **past its decisive contact** (follow-through / catch / recovery step). The move is split before / after its decisive touch.
2. **The bodies are closing, not resting.**
   - Review set: the bodies close at ≥ 2 m/s in 12 of 27 episodes, 1–2 m/s in 5, < 1 m/s in 10.
   - Moves set: the main families close at 2.0–3.1 m/s.
   
   These are **collisions**: no positional rule can absorb them without moving a committed body, which Stage 2 rightly refuses.
3. **Mostly hips, not chests.**
   - The first pair beyond the tolerance is THIGH / THIGH in 20 of 27 review episodes (the upper thigh is the hip), SHIN / SHIN in 6.
   - The trunks meet beyond 5 cm in only 3 (CHEST / CHEST up to 22.9 cm: the Body Feint into a recovering tackle).
   - Legs only (trunks within the tolerance): 22 of 27.
4. **Where on the bodies:**
   - FRONT / FRONT in 13 review episodes (head-on, a planned Body Feint into a set defender);
   - SIDE / SIDE in 12 (a Croqueta's lateral transfer into a lunging tackle);
   - FRONT / SIDE in 2.
5. **Ordinary × ordinary** (15 review episodes, 84 ticks; search 38 / 495) — head-on and static jogs. Short, leg-only, often a **fast limb**: the contact points close at 3.6–9.1 m/s while the roots close at 0.7–3.6. Stage 2's AUTHORED / BALL-ANCHORED LIMB PATH class: a stride or a touch's swing passing through the other's leg.
6. **Support at onset** — the committed players are on one planted foot with the posed centre of mass **outside** the polygon (Croqueta −46 / −52 cm, the lunging tackler −21 / −58 cm). The authored motion is mid-stride, so it relies on momentum. Ordinary standing defenders are on two feet with the centre of mass 3–13 cm inside.

### What this told the model

- A collision needs a **momentum consequence** — a velocity, not a position.
- **Effective mass** must depend on the contact point: hips meet low, near the centre of mass; chests meet high, with rotation.
- Fast limbs must be separated from bodies: a limb has a **leg's mass**.
- The **support state** decides who absorbs: a committed player's centre of mass is already outside his polygon.
- And because nearly every committed conflict is **after** one action's decisive event, the action rules must hinge on that event.

## IMPACT MODEL

`sandbox/visual/occupy3/o3_world.js` — `ImpactWorld` extends Stage 2's `OccupancyWorld2` (unchanged, run as decided: `wallSparesMove: true`). Stage 2's occupancy pass runs first, every tick, exactly as before. Stage 3 adds **one impact pass after it**.

**CONTACT → IMPACT → BALANCE RESPONSE → RECOVERY**, per tick:

### When Stage 3 acts at all

- An **episode** opens at the first tick two posed bodies touch (Stage 2's 11 capsules per body, penetration > 0).
- It becomes an **IMPACT** only if the contact is *meaningful*. It must be deeper than **Stage 2's 2 cm contact tolerance** — touching within it is contact without consequence (owner's decision, kept) — and then one of:
  - **BODY CONTACT** — pelvis, waist, chest/shoulders or the upper half of a thigh (the hips) on both sides, the two bodies closing faster than **0.30 m/s** along the contact normal;
  - **LIMB STRIKE** — a knee or shin whose own swing (its *articulated* speed, relative to its body's root + pelvis, over 3 ticks) closes faster than **1.0 m/s**. Each side is capped at a physiological ceiling (thigh 3.0 m/s, shin 4.5 m/s): a re-plan's blend can move a drawn leg several mm in one tick, which as a speed would be metres per second;
  - **STAGE 2 UNRESOLVED** — Stage 2 could not separate the bodies this tick.
- Otherwise nothing in Stage 3 acts. The run **is** Stage 2's, bit for bit (proved below, REGRESSION).
- Beyond Stage 2's broad phase (roots > 1.9 m apart) with nobody responding, the pass is a single distance test.

### The velocities used

The bodies' **physical** velocities: the plan's own velocity (the authored motion, with Stage 2's soft-wall path edits) **plus** Stage 3's perturbation velocity *u*. Stage 2's positional corrections are deliberately **not** treated as velocities — they move a root up to 3 cm in one tick, which would read as 7 m/s.

### The response

**1. Body contact — a velocity constraint, not a position push.**
- At the deepest body pair: the contact point *c* and normal *n* come from the capsule geometry (not the root-to-root line).
- The closing speed along *n* is removed with a time constant **τ = 0.03 s** (≈ 0.08 s to 95 %): a soft, inelastic human collision, not a billiard ball. Per tick the impulse is `j = μ · v_close · min(1, Δt/τ)`.
- `μ` is the reduced mass of the two **effective masses at the contact point**:
  - `m_eff = 1 / (1/m + h²/I_tilt + l²/I_yaw)`;
  - `m` = the rig's own mass (73 kg, identical for both — no ratings);
  - `h` = the point's height above the posed centre of mass, `l` = its lateral lever about the vertical axis;
  - `I_tilt`, `I_yaw` = the **posed** body's inertias, every segment at its bone's midpoint with the rig's mass fractions.
- So **where** the bodies meet changes the outcome, as §5 asks. Chest-to-chest is high above the centre of mass (large *h*): less effective mass, more rotation. Hip-to-hip is near it: the whole body's mass, more translation. A shoulder clip off-centre has a large *l*: the body turns. Contact from behind drives the trunk forward.

**2. Limb strike — one impulse per pair of legs per episode.**
- `j = μ · v_articulated`, spread over 6 ticks (25 ms).
- A swinging leg's effective mass is its own about its hip, `I_hip / d²` (between 2 kg and the leg's mass, ≈ 20 % of the body).
- A planted leg, or a body region, brings the whole body's effective mass through it.
- A shin flicking a shin moves a leg-sized mass, never the whole footballer.

**3. The ground's share — the strut.**
- A planted leg aligned against the impulse passes its axial, compressive component to the ground.
- That share is friction-capped: `≤ μ_turf · m · g · Δt`, with μ_turf = 0.9 (studs on grass).
- This is how a braced player **absorbs** (§6) without the planted foot moving.

**4. The rest becomes body motion.** It changes the centre of mass's velocity: `Δu = J / m`. The impulse's moment about the hips is distributed through the body:
- **55 %** to the trunk — pitch (lean), roll (side) and chest rotation, about the hips with the posed trunk's own inertias;
- **45 %** to the pelvis's yaw;
- the knees flex with |Δu|.

Nothing teleports. The perturbation is a velocity, integrated tick by tick.

### The continuous severity σ — and its diagnostic labels

The severity is the **demand** the impact puts on the support: `σ = |ξ| / slack`, where ξ is the capture point (next section). In place σ runs 0–1. Beyond 1 it is graded by how the body catches itself:

| σ | label | meaning |
|---|---|---|
| < 0.15 | **BRUSH** | negligible |
| 0.15 – 0.6 | **LIGHT** | the trunk and shoulders respond; the action carries on |
| 0.6 – 1.0 | **MODERATE** | visible displacement / rotation; a balance correction (the centre of pressure, the hip strategy), no step needed — or the gait's own next landing catches it (σ = 1) |
| 1 – 2 | **STRONG** | a recovery step: σ = 1 + its adjustment / 42 cm |
| ≥ 2 | **SEVERE** | more than one step (stagger candidate) or no reachable placement (≥ 3, fall candidate) |

- The Lab shows σ **live** per tick: what the balance model *predicts* at that tick.
- The episode's severity is the **realised** one: the in-place peak held for three ticks, or the steps actually taken. A capture analysis that predicts a stagger for one tick and is caught by the next landing is not reported as a stagger.
- The labels are read off σ. They drive nothing.

## SUPPORT / BALANCE MODEL

### The balance state — a linear inverted pendulum about the authored motion

The authored motion is assumed balanced. Stage 3 models only the **perturbation** from it.

Per player:
- **e** — the perturbation's centre-of-mass offset from where the support expects it. It is the sum of three parts:
  - the newest stance's ledger: Stage 2's pushes plus the impact's own root shifts since that foot landed, less a recovery step's own adjustment;
  - the drawn pelvis offset *P*;
  - the overflow *O*, the part that could not be realised at all;
- **u** — the perturbation velocity;
- **ω = √(g / z_com)**, from the posed centre of mass's height;
- the **capture point ξ = e + u/ω**: where the centre of pressure must be to stop the body.

### The support

- The **polygon**: the hull of the planted footprints whose ball of the foot is actually on the turf as drawn. The canonical body sometimes lifts a plan-planted foot early; that foot holds nothing.
- The authored **centre of pressure**: the middle of the foot on one foot; on two feet, the centre of mass if it is inside the polygon, else the polygon's centroid.
- The **slack**: how far the centre of pressure can move along ξ, i.e. the polygon's reach from the authored centre of pressure × a usable share, plus the hip strategy:

| support | share of the footprint reach | hip strategy |
|---|---|---|
| two feet, standing (≤ 0.3 m/s) — braced | 0.85 | + 3 cm |
| one foot, or moving | 0.60 | + 3 cm |
| committed action (Body Feint, Croqueta, Standing Tackle, or a planned move's commit stance) | 0.50 | + 2 cm |
| **airborne** (no ball of a foot on the turf) | — (no polygon) | 2–3 cm, and **no ground force at all** |

- **The controller.** The centre of pressure is placed at `ξ · (1 + k/ω)` (k = 3/s), saturated at the slack. Then `u += ω² (e − q) Δt`, only while a foot is on the turf. Inside the slack, ξ is driven back. Outside, the centre of pressure saturates and ξ **diverges**: the pendulum falls unless a foot is placed.
- An **airborne** player cannot brace (§6): no ground force, only the hip strategy, until a foot lands.
- A player **already leaning** starts with a non-zero *e*. The same impulse takes him further out.

**How the three support states differ, mechanically:**

| | braced, two feet | single support / moving | airborne |
|---|---|---|---|
| absorbs through the ground (strut) | both legs | the one leg | none |
| slack | largest | smaller | hip only |
| the root may move | as far as the planted legs **reach** | as far as the one leg reaches | freely (no foot to keep) |
| recovery | lift a planted foot (slow) | re-aim the next landing (moving) | the landing in flight, re-aimed |

The planted foot **never** slides to resolve the collision (§6). The force goes through the body chain (§7):
- the root moves only as far as the planted legs reach;
- beyond that, the **drawn pelvis** moves over the same feet, the legs re-solved by the canonical leg IK (ankle, knee and hip take it), up to 6 cm ordinary / 10 cm committed;
- beyond that is **overflow**: momentum the support cannot contain. The balance model must step, or it is a fall candidate.
- Once the body is quiet, the drawn pelvis returns over its feet. An ordinary player hands it to the root, as far as his support allows; a committed player takes it back into the authored pose.

### The outcome, every tick (A – E)

| | rule |
|---|---|
| **A ABSORB** | \|ξ\| < 35 % of the slack |
| **B CORRECT** | \|ξ\| ≤ the slack: the centre of pressure + lean / rotation, no step. A committed body: ≤ the slack + 80 % of the pelvis's 10 cm (the support chain carries it). Also CORRECT: the gait's own next landing captures it with < 5 cm adjustment |
| **C RECOVERY STEP** | one foot placement catches ξ (residual ≤ 3 cm) — see RECOVERY STEP |
| **D STAGGER CANDIDATE** | one step leaves a residual a second step (≈ 0.25 s later, the residual grown by e^{ω·0.25}) can still catch |
| **E FALL CANDIDATE** | no reachable placement catches it — for 3 consecutive ticks; or an ordinary body's momentum cannot be realised over its support for 0.12 s; or the foot that must step is blocked inside the opponent's leg (TRIP) |

- **Not a fall candidate:** no foot available *this instant* (both feet down at speed, or the next landing already inside the canonical 0.12 s blend). That is a **pending recovery step**: the next landing that exists takes it.
- A–C are implemented fully. D is instrumented (its first step is taken; the second is the gait's).
- E is instrumented, and handled by a labelled placeholder (see FALL CANDIDATES).

## AUTHORED ACTION PRESERVATION

**Authored action + physically generated perturbation, never "action OR collision animation".**

- **The drawn body.** `o3_body.js` (`ImpactBody`) is the canonical `PlayBody`, drawing the **same plan**. The perturbation is **added** to the plan's own posture channels at that tick:
  - pelvis displacement, then the legs re-solved to the same feet;
  - pelvis yaw;
  - trunk lean, side bend and chest rotation;
  - pelvis roll and knee flexion;
  - arm abduction and asymmetry;
  - head yaw and drop.
  
  The canonical pose code distributes each exactly as it does the authored ones. With no perturbation the pose is the canonical one, bit for bit.
- **The posture is physical, not canned.** Each channel is a damped oscillator (8–10 rad/s, damping 0.65–0.9), driven by:
  - the impulse's moments;
  - the hip strategy: up to 10° of lean against the imbalance, at full demand;
  - the arms, which abduct with the demand;
  - the head, which counter-rotates.
  
  No clip is played anywhere.
- **Committed feet stay exact.**
  - A committed action's root moves only through **Stage 2's own budgets**: 2 cm per planted stance, 8 cm per flight, 12 cm per commitment. The impact's shifts are charged to the same ledger, so committed-foot give is **not** increased (owner's decision).
  - The rest of the perturbation is the drawn pelvis (≤ 10 cm) and the trunk.
- **The decisive touch is protected** while the body can still reach it: ξ predicted at the touch within the slack + the pelvis's 10 cm, or the touch < 0.03 s away.
- **A touch is denied only for geometry:**
  - the playing leg, from the displaced hips, falls more than 2 cm shorter of its foot than in the authored pose; or
  - the foot is the recovery step's.
  
  The tackle's boot is held to the same rule.
- **No rewind, no re-footing, nothing before contact changes.** Every tick before the impact's onset is identical to Stage 2 (every joint), and no information arrives early (REGRESSION).

## RECOVERY STEP

**Selection.** It is computed from the momentum, not from the contact side (§12).

1. **The prediction.** The linear inverted pendulum in closed form. On the present support the centre of pressure saturates at the slack along ξ̂: `u(τ) = ω (e − q) sinh ωτ + u cosh ωτ`. This runs until that support ends; then flight (no horizontal force) until the landing.
2. **The candidate feet.** Each foot that can move:
   - a foot **in its swing** is **re-aimed** (unless it lands within 0.13 s: the canonical blend is 0.12 s, and a later edit would land unblended);
   - a **planted** foot is **lifted** only by a slow body (≤ 1.2 m/s). A moving body's own gait brings its next landing within a stride, and that landing is re-aimed instead;
   - the older of two planted feet is preferred. The loaded foot may still step outward when the other cannot help, unloading first (twice as long).
   
   While a foot is lifted, the other foot alone carries the body. The prediction uses its own footprint as the pivot.
3. **The placement.**
   - Start from the gait's own landing.
   - Add an **adjustment toward where the capture point will be at the landing**, at most 42 cm.
   - Every limit only **shrinks** the adjustment: no crossover steps (stays on its own side of the stance foot by ≥ 8 cm, or as far as the gait's own landing already was), no further than 0.75 m from the body at the landing, never onto the partner foot.
4. **The choice.** The foot that can adjust at all, with the least uncaught residual. Between two close options, the foot not carrying the weight.
5. **Too small to count.** An adjustment < 5 cm is the gait's own variation: CORRECT, the next landing catches it.

**Execution** — *impact → imbalance → the foot moves → plants → weight accepted → settles → locomotion resumes*:

- The step is written into the plan the canonical planner **just adopted** (after each player's simulation step, before any pose of it). This is a new plan version, so the canonical body's own 0.12 s blend carries the swing to its new landing.
- **A lifted foot:** its stance ends at the lift, and the new stance begins at the step's place and time. The other foot's stance is held until the landing.
- **A re-aimed swing:** the landing moves, and is never delayed by a later re-plan.
- That foot's touches during the step are the step's: denied, with the reason recorded.
- A pending step's target moves with every root shift, as the plan's own future stances do.
- **A step that no longer applies is cancelled, never forced.** A pending step is cancelled when:
  - the player is no longer Stage 3's (a fall candidate's placeholder handed him back); or
  - it lifts a planted foot and the canonical planner now moves the body faster than 1.5 m/s before it lands (the planner chose to run: held stances would leave the support behind).
  
  The canonical plan is then left as the planner made it, and the gait's own next landing becomes the step. The same speed rule (the plan's own speed over the next 0.25 s) decides whether a lifted-foot step is offered at all, with a 0.3 s pause after a cancel. Without these rules, a defender handed back mid-step carried the ball for 1.6 s with one foot still "planted" 2.9 m behind him, and one torture run re-planned and cancelled the same step 35 times.
- **On landing:** the adjustment becomes that stance's own relation. Weight acceptance is the canonical load. The body settles under the controller.
- A **following step**: a slow body with overflow left and both feet down brings the trailing foot up beside the newer one.
- **Balance regained** when ξ < 1.2 cm, *u* < 4 cm/s, pelvis < 1.5 mm, posture < 0.25°, no step pending and no contact for 0.15 s. Stage 3 then hands the player back: ordinary locomotion re-plans from where he is. A fall candidate is never "regained"; its placeholder simply ends.

## ACTION INTERRUPTION

Explicit rules (`decideAction`, `release`). Every outcome carries its reason string in the Lab and the evidence:

| class | when | what happens |
|---|---|---|
| **UNAFFECTED** | a committed / planned action's player was in an impact episode, and ξ stayed inside his centre of pressure's slack throughout (balance A / B) | the action plays on; only the posture layer shows the contact |
| **PERTURBED BUT CONTINUES** | ξ beyond the centre of pressure but ≤ the slack + 80 % of the pelvis (the support chain carries it); or before the decisive event while the body can still reach it (ξ predicted there ≤ slack + 10 cm, or < 0.03 s away) | the authored action plays on with the perturbation layered on it |
| **TECHNICAL EVENT COMPLETES, RECOVERY REPLACED** | after the decisive touch (Body Feint, Croqueta) or the tackle's contact window, ξ beyond what the chain carries | the decisive event **stands** (never cancelled retroactively); the remaining authored touches are not played, the commitment is released, the canonical planner re-plans, a recovery step follows |
| **INTERRUPTED BEFORE TECHNICAL EVENT** | before the decisive event, ξ predicted at it beyond the slack + the pelvis — the touch is no longer reachable; or the decisive touch was denied for geometry; or a *planned* move would commit from a displaced body | the move / tackle ends there; a tackle interrupted before its contact sends no boot at all |
| **STAGGER / FALL CANDIDATE** | the balance outcome D / E (appended as "… → FALL CANDIDATE" when it follows one of the above) | labelled; the fall placeholder |

The end of an action is never a pose switch:
- the canonical window that blends every plan built within it from the posture the body had (the one control leaving a Body Feint opens) is opened for 0.35 s;
- the perturbation's channels continue across it.

## BALL / POSSESSION — proof that a physical collision assigns nothing (§10)

Tool `tools/o3_ball.mjs`, every set. Output: `evidence/ball_{review,matrix,moves,search}.{txt,json}`.

| | review | matrix | moves | search |
|---|---|---|---|---|
| (1) Stage 3's source writes the authority / launches the ball | never | never | never | never |
| (2) ball velocity changes > 0.25 m/s in a tick · **without a canonical contact within ± 2 ticks** | 338 · **0** | 455 · **0** | 3606 · **0** | 2662 · **0** |
| (3) authority transitions · **naming an impact** | 71 · **0** | 87 · **0** | 682 · **0** | 673 · **0** |
| the authority's checks: dual / unaware / without a touch / granted blind | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| (4) touches denied: the foot is the recovery step's | 6 | 30 | 113 | 53 |
| touches denied: the leg cannot reach from the displaced hips | 0 | 0 | 8 | 0 |
| technical event completes, recovery replaced (ATT / DEF) | 3 / 7 | 12 / 10 | 22 / 66 | 1 / 50 |
| interrupted before the technical event (ATT / DEF) | 4 / 0 | 6 / 0 | 25 / 5 | 3 / 17 |
| tackle outcomes changed from Stage 2 (each with its cause) | 1 | 2 | 18 | 25 |

- **Every ball change is a canonical contact.** Every transition of possession has its canonical cause: a touch, the tackle's boot, a controller failure, a COLLECTED claim.
- **What the physics changes is listed, never hidden:**
  - the touches it denied (geometry only);
  - the actions it ended (each with its reason);
  - the outcomes that moved, each with the physical cause.
- **Most changed outcomes in the search set (25)** are a tackle INTERRUPTED BEFORE ITS TECHNICAL EVENT. The tackler was knocked beyond his support chain before his boot reached the ball, so no boot is sent and the ball stays the carrier's (ATTACKER RETAINS → MISS). The rest are the carrier stepping with the foot that would have collected the loose ball (ATTACKER RECOVERS → DEFENDER RECOVERS).
- **No early information.** Possess1's two-player tools were run with Stage 3 on (`two/o3_two_hook.mjs`; 1870 and 1570 worlds, 416 and 291 with an impact):
  - the possession torture: dual / unaware / stale / chatter / A→B→A / without a touch / granted blind / FREE at the end / timer unresolved / nondeterministic are all **0**;
  - the attacker's **decisions never differ from his counterfactual before he perceives the tackle**, except through a touch the body denied (2 · 4 · 4, as in Stage 2);
  - his root differs only with occupancy or an impact acting on him (0 · 0 · 0 otherwise).

**The referee facts (§14)** — recorded per episode, objective only, in `W.imp.episodes[].referee` and in the Lab's diagnostics:
- player contact time and impact onset;
- regions;
- where on each body;
- closing and tangential relative velocity;
- each player's last ball contact before the player contact;
- the first ball contact after it;
- the tackle's ball contacts — **before the player contact, only after it, or none**;
- the balance lost;
- the action disrupted.

With a tackle involved:
- matrix: 14 episodes — the tackle's ball contact preceded the player contact in 12, came only after it in 0, none in 2;
- moves: 149 — 112 / 11 / 26;
- search: 137 — 111 / 10 / 16.

No foul, no legality, no advantage is computed.

## THE RESULTS AT A GLANCE (§16, §17)

Every §16 row and its mirror (52 encounters: 26 rows × 2), and the larger sets, STAGE 2 → STAGE 3, the bodies as drawn (each tick's live pose). Tool `tools/o3_metrics.mjs`; full output `evidence/metrics_{matrix,review,moves,search}.{txt,json}`.

| | matrix (52) | review (37) | moves (352) | search (235) |
|---|---|---|---|---|
| deepest **torso** penetration (cm) | 22.9 → **3.1** | 22.9 → **3.1** | 22.9 → **4.9** | 15.8 → **3.3** |
| deepest **leg** penetration (cm) | 22.7 → 22.7 | 22.7 → 22.7 | 23.3 → 22.9 | 22.9 → 23.0 |
| ticks with a pair > 5 cm | 1120 → 636 | 761 → 530 | 4481 → 3505 | 1740 → 1677 |
| planted ball-of-foot slide on the turf, largest (cm) | 11.8 → 11.0 | 11.8 → 11.0 | 24.2 → 24.7 | 15.0 → 14.8 |
| pelvis jolts per frame > 1 / 2 / 4 cm | 1352/479/125 → 1288/443/103 | 1000/321/80 → 996/304/63 | 6149/1769/384 → 6816/1954/384 | 7005/1898/410 → 7272/2011/441 |
| largest pelvis jolt (cm per frame²) | 9.4 → 8.6 | 8.2 → 8.6 | 12.1 → 12.1 | 13.2 → 11.1 |
| knee / foot jumps > 4 cm in a tick · largest (cm) | 11020 → 11349 · 30.0 → 31.5 | 9887 → 9879 · 30.0 → 31.5 | 95235 → 99920 · 32.8 → 39.9 | 78520 → 81651 · 37.1 → 37.8 |
| crossed-legs ticks (of them while Stage 3 acts) | 285 → 436 (306) | 379 → 487 (358) | 2070 → 3431 (1863) | 4165 → 4744 (2606) |
| turf penetration ticks | 15703 → 15027 | 10525 → 10619 | 116876 → 118010 | 84704 → 85677 |
| joint > 15 m/s (ticks × joints) · knee folding > 2000 °/s | 1996 → 1861 · 1024 → 1007 | 1781 → 1547 · 892 → 829 | 19582 → 21202 · 8062 → 8486 | 18144 → 18590 · 7287 → 7507 |
| stuck seconds (asking to move, < 0.1 m in 1 s) | 0 → 0.1 | 0 → 0 | 0.7 → 0.8 | 0 → 1.0 |
| **Stage 3 intervened** | 39 / 52 | 26 / 37 | 169 / 352 | 144 / 235 |
| severity LIGHT / MODERATE / STRONG / SEVERE | 2 / 33 / 26 / 17 | 2 / 31 / 10 / 9 | 22 / 175 / 103 / 51 (+1 BRUSH) | 13 / 195 / 45 / 63 |
| balance ABSORB / CORRECT / STEP / STAGGER / FALL | 0 / 35 / 26 / 3 / 14 | 1 / 32 / 10 / 2 / 7 | 9 / 189 / 101 / 13 / 40 | 0 / 208 / 44 / 10 / 54 |
| recovery steps · median / largest adjustment (cm) | 56 · 8.0 / 26.5 | 23 · 7.9 / 21.4 | 208 · 7.7 / 33.3 | 119 · 7.4 / 42.0 |
| balance regained (in the replay) · median / longest | 48 / 78 · 1.49 / 2.70 s | 43 / 52 · 1.24 / 2.70 s | 272 / 352 · 1.32 / 3.27 s | 241 / 316 · 1.32 / 3.14 s |
| ping-pong episodes (impulse reversing twice < 0.25 s) | 2 | 2 | 2 | 0 |

**What this says.**
- **Torso penetration is solved where Stage 2 could not:** 22.9 → 3.1 cm on the matrix, 4.9 cm worst over 352 moves. That was the chest-through-chest of the Body Feint into a recovering tackle.
- **Leg-through-leg is not reduced** (22.7 cm both stages; REMAINING LIMITATIONS).
- **The ticks deeper than 5 cm fall by 43 %** (matrix) — the bodies' momentum now takes them apart.
- **Root jolts are no worse.** Fewer jolts > 4 cm on the matrix and review sets, and the largest jolts are the same as Stage 2's.
- **The largest knee / foot jumps are the canonical body's own** (39.9 cm on the moves set): the unperturbed canonical pose of the same live state jumps 38.2 cm in that tick, and the perturbation adds 1.7 cm.
- **Crossed legs rise while Stage 3 acts.** Most of it is the gait's own landings under a lateral push (REMAINING LIMITATIONS).

Per player and episode, every measurement §17 lists is in `evidence/metrics_*.json` (`S3.eps[].players`, `S3.eps[].phys`): severity σ (realised and predicted), balance, action outcome and its reason, Δv, root displacement by the impact, drawn pelvis, overflow, trunk lean, chest / pelvis rotation, support at onset, recovery steps (foot, where, how far from the gait's own landing), time to regain, closing speed before and 0.2 s after. Each encounter also records the decisive touches made / denied and the possession outcome.

## ORDINARY CONTACT RESULTS

| case | contact (onset s · regions · closing m/s) | player | severity σ | balance | action | steps (foot cm) | root / pelvis cm | lean / rot ° | regained |
|---|---|---|---|---|---|---|---|---|---|
| **walk-shoulder**<br>torso 0.0→0.0 · legs 2.0→2.0 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **walk-shoulder-m**<br>torso 0.0→0.0 · legs 2.0→2.0 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **side**<br>torso 0.0→0.0 · legs 3.7→4.6 | #1 0.75 · THIGH / THIGH · 0.203 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 17.7 / 0.0 | 5.9 / 0 | 1.62 s |
|  | #1 0.75 · THIGH / THIGH · 0.203 | DEF | MODERATE 1 | CORRECT | — (ordinary) | — | 30.9 / 0.0 | 5.7 / 1.9 | 2.03 s |
| **side-m**<br>torso 0.0→0.0 · legs 3.7→4.5 | #1 0.75 · THIGH / THIGH · 0.205 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 14.9 / 0.0 | 5.9 / 0 | 1.49 s |
|  | #1 0.75 · THIGH / THIGH · 0.205 | DEF | MODERATE 1 | CORRECT | — (ordinary) | — | 28.9 / 0.0 | 5.7 / 1.8 | 1.97 s |
| **headon-jog**<br>torso 0.0→0.0 · legs 15.7→15.7 | #1 1.00 · THIGH / THIGH · 3.594 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 19.1 / 0.0 | 10.1 / 3 | 1.20 s |
|  | #1 1.00 · THIGH / THIGH · 3.594 | DEF | STRONG 1.119 | RECOVERY STEP | — (ordinary) | L 5.0 | 23.4 / 0.0 | 9.7 / 1.3 | 1.39 s |
| **headon-jog-m**<br>torso 0.0→0.0 · legs 15.7→15.7 | #1 1.00 · THIGH / THIGH · 3.594 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 19.1 / 0.0 | 10.1 / 3 | 1.20 s |
|  | #1 1.00 · THIGH / THIGH · 3.594 | DEF | STRONG 1.119 | RECOVERY STEP | — (ordinary) | R 5.0 | 23.4 / 0.0 | 9.7 / 1.3 | 1.39 s |
| **oblique**<br>torso 0.0→0.0 · legs 0.7→0.7 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **oblique-m**<br>torso 0.0→0.0 · legs 0.7→0.7 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **oblique-firm**<br>torso 0.0→0.0 · legs 14.2→14.2 | #1 1.02 · THIGH / THIGH · 2.717 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 14.0 / 0.0 | 9.5 / 3.4 | 1.16 s |
|  | #1 1.02 · THIGH / THIGH · 2.717 | DEF | SEVERE 3 | FALL CANDIDATE | STAGGER / FALL CANDIDATE | — | 2.5 / 0.0 | 1.6 / 1.5 | fall cand. |
| **oblique-firm-m**<br>torso 0.0→0.0 · legs 14.2→14.2 | #1 1.02 · THIGH / THIGH · 2.717 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 14.0 / 0.0 | 9.5 / 3.4 | 1.16 s |
|  | #1 1.02 · THIGH / THIGH · 2.717 | DEF | SEVERE 3 | FALL CANDIDATE | STAGGER / FALL CANDIDATE | — | 2.5 / 0.0 | 1.6 / 1.5 | fall cand. |
| **near-miss**<br>torso 0.0→0.0 · legs 0.0→0.0 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **near-miss-m**<br>torso 0.0→0.0 · legs 0.0→0.0 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **static-jog**<br>torso 0.9→0.9 · legs 5.5→5.6 | #1 0.96 · THIGH / THIGH · 0.739 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 2.9 / 0.0 | 4.8 / 2.5 | 1.06 s |
|  | #1 0.96 · THIGH / THIGH · 0.739 | DEF | LIGHT 0.497 | CORRECT | — (ordinary) | — | 2.9 / 0.0 | 4 / 0.8 | 1.23 s |
| **static-jog-m**<br>torso 0.0→0.0 · legs 9.1→9.1 | #1 0.98 · THIGH / THIGH · 0.868 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 6.4 / 0.0 | 6.9 / 1.2 | 1.08 s |
|  | #1 0.98 · THIGH / THIGH · 0.868 | DEF | LIGHT 0.347 | CORRECT | — (ordinary) | — | 2.3 / 0.0 | 2.7 / 2.4 | 1.04 s |
| **cross**<br>torso 0.0→0.0 · legs 1.9→1.9 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **cross-m**<br>torso 0.0→0.0 · legs 1.9→1.9 | no meaningful contact — Stage 2 exactly | | | | | | | | |

- **Walking shoulder contact, the 45° oblique, both moving, the near miss:** no meaningful contact — **Stage 2 exactly**.
  - Stage 2's soft wall keeps these slow approaches within the 2 cm tolerance; no placement tried at walking pace got beyond it (`walk-shoulder` 1.0 / 1.6 m at 30°, 45°, 60°).
  - With *any touch* counted (`penMin 0`, measured in `variants_matrix.txt`), they become MODERATE / CORRECT responses: a 4–6° lean, no step.
- **Jogging shoulder contact (`side`):** both MODERATE, CORRECT. The lean is about 6°, no step; the jogging roots drift 15–31 cm sideways over the following strides. Regained in 1.5–2.0 s.
- **Head-on (`headon-jog`, closing 3.6 m/s at the hips):**
  - the carrier MODERATE, CORRECT (lean 10°);
  - the defender STRONG, one 5 cm recovery step.
- **One stationary / one moving (`static-jog`):** the runner MODERATE, the standing player LIGHT — the braced body absorbs it.
- **Firm oblique (`oblique-firm`, 60°, the legs 14 cm into each other):**
  - the carrier MODERATE, CORRECT;
  - the defender a **fall candidate (TRIP)**: his swinging leg is held inside the carrier's for 25 ms, and it is the foot he must step with.

## BODY FEINT RESULTS

| case | contact (onset s · regions · closing m/s) | player | severity σ | balance | action | steps (foot cm) | root / pelvis cm | lean / rot ° | regained |
|---|---|---|---|---|---|---|---|---|---|
| **bf-past**<br>torso 0.0→0.0 · legs 3.1→3.1<br>touches denied 1 | #1 1.16 · THIGH / THIGH · 1.945 | ATT | STRONG 1.155 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | R 6.5 | 18.4 / 0.0 | 6.5 / 2.6 | not in replay |
|  | #1 1.16 · THIGH / THIGH · 1.945 | DEF | STRONG 1.517 | RECOVERY STEP | — (ordinary) | L 7.4, L 21.7 | 47.3 / 0.0 | 10.3 / 2.6 | not in replay |
| **bf-past-m**<br>torso 0.0→0.0 · legs 2.3→2.3 | #1 1.16 · THIGH / THIGH · 1.84 | ATT | MODERATE 1 | CORRECT | EVENT COMPLETES → RECOVERY | — | 17.0 / 0.0 | 5.6 / 1.6 | not in replay |
|  | #1 1.16 · THIGH / THIGH · 1.84 | DEF | STRONG 1.434 | RECOVERY STEP | — (ordinary) | R 5.2, R 18.2 | 41.6 / 0.0 | 10.2 / 1.8 | not in replay |
| **bf-shoulder**<br>torso 0.0→0.0 · legs 4.1→3.7<br>touches denied 7 | #1 1.20 · THIGH / THIGH · -0.025 | ATT | STRONG 1.227 | RECOVERY STEP | — (ordinary) | R 9.6 | 51.7 / 0.0 | 6 / 1.3 | not in replay |
|  | #1 1.20 · THIGH / THIGH · -0.025 | DEF | MODERATE 0.704 | CORRECT | — (ordinary) | — | 4.1 / 0.0 | 5.5 / 0.3 | not in replay |
| **bf-shoulder-m**<br>torso 0.0→0.0 · legs 3.6→2.1<br>touches denied 7 | #1 1.19 · THIGH / THIGH · -0.012 | ATT | STRONG 1.173 | RECOVERY STEP | — (ordinary) | L 6.1, L 7.2 | 45.0 / 0.0 | 6.2 / 1.9 | not in replay |
|  | #1 1.19 · THIGH / THIGH · -0.012 | DEF | STRONG 1.217 | RECOVERY STEP | — (ordinary) | R 9.1 | 20.1 / 0.0 | 8.7 / 0.6 | not in replay |
| **bf-step-in**<br>torso 0.0→0.0 · legs 2.5→2.4 | #1 1.23 · THIGH / THIGH · 0.63 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 17.3 / 0.0 | 9.3 / 1.3 | not in replay |
|  | #1 1.23 · THIGH / THIGH · 0.63 | DEF | MODERATE 1 | CORRECT | — (ordinary) | — | 28.1 / 0.0 | 6 / 1.4 | not in replay |
| **bf-step-in-m**<br>torso 0.0→0.0 · legs 2.5→2.4 | #1 1.23 · THIGH / THIGH · 0.63 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 17.3 / 0.0 | 9.3 / 1.3 | not in replay |
|  | #1 1.23 · THIGH / THIGH · 0.63 | DEF | MODERATE 1 | CORRECT | — (ordinary) | — | 28.1 / 0.0 | 6 / 1.4 | not in replay |
| **in-bf**<br>torso 0.1→0.0 · legs 7.0→5.6<br>tackle: CONTACT — ATTACKER RECOVERS (same) | #1 0.54 · THIGH / THIGH · 1.726 | ATT | MODERATE 1 | CORRECT | UNAFFECTED | — | 25.5 / 0.0 | 5.8 / 2.3 | 2.57 s |
|  | #1 0.54 · THIGH / THIGH · 1.726 | DEF | MODERATE 1 | CORRECT | UNAFFECTED | — | 16.9 / 2.7 | 5.9 / 1.3 | 2.57 s |
| **in-bf-m**<br>torso 0.1→0.0 · legs 7.0→5.6<br>tackle: CONTACT — ATTACKER RECOVERS (same) | #1 0.54 · THIGH / THIGH · 1.726 | ATT | MODERATE 1 | CORRECT | UNAFFECTED | — | 25.5 / 0.0 | 5.8 / 2.3 | 2.57 s |
|  | #1 0.54 · THIGH / THIGH · 1.726 | DEF | MODERATE 1 | CORRECT | UNAFFECTED | — | 16.9 / 2.7 | 5.9 / 1.3 | 2.57 s |
| **bf-fake**<br>torso 22.9→3.1 · legs 22.6→17.2<br>tackle: MISS (same)<br>touches denied 2 | #1 0.68 · THIGH / THIGH · 1.673 | ATT | SEVERE 3 | FALL CANDIDATE | INTERRUPTED BEFORE EVENT → FALL CAND. | R 7.7 | 6.2 / 2.1 | 0.7 / 0.3 | fall cand. |
|  | #1 0.68 · THIGH / THIGH · 1.673 | DEF | SEVERE 2.755 | STAGGER CANDIDATE | EVENT COMPLETES → RECOVERY | R 12.7, R 21.4, R 7.9 | 111.7 / 0.8 | 9.6 / 4.5 | 2.70 s |
| **bf-fake-m**<br>torso 22.9→3.1 · legs 22.6→17.2<br>tackle: MISS (same)<br>touches denied 2 | #1 0.68 · THIGH / THIGH · 1.673 | ATT | SEVERE 3 | FALL CANDIDATE | INTERRUPTED BEFORE EVENT → FALL CAND. | L 7.7 | 6.2 / 2.1 | 0.7 / 0.3 | fall cand. |
|  | #1 0.68 · THIGH / THIGH · 1.673 | DEF | SEVERE 2.755 | STAGGER CANDIDATE | EVENT COMPLETES → RECOVERY | L 12.7, L 21.4, R 7.9 | 100.4 / 0.8 | 9.6 / 4.5 | 2.35 s |

- **Feint past a stationary defender (`bf-past`), contact after the decisive touch.** The feint's touch stands; the rest of the authored feint gives way to a recovery (TECHNICAL EVENT COMPLETES, RECOVERY REPLACED). The defender, hit while standing, takes two steps (7 and 22 cm) and is displaced about 45 cm.
- **Light shoulder contact on the exit (`bf-shoulder`):**
  - the bodies are sliding (closing ≈ 0);
  - the feint has already released, so the carrier is ordinary;
  - the carrier steps (6–10 cm) and is carried about 50 cm off his line;
  - 7 touches are denied because the foot is the recovery step's — the carry's next touches wait for the step.
- **Defender steps into the exit (`bf-step-in`):** both MODERATE, CORRECT — no steps, leans 6–9°.
- **Feint into a committed tackle (`in-bf`):** the feint is planned, not yet committed; the tackle is in its recovery step. Both MODERATE, **UNAFFECTED**: each support carries it. Tackle outcome unchanged.
- **The recovering tackle into the feint (`bf-fake`)** — Stage 2's worst case, chest 22.9 cm through chest:
  - torso **22.9 → 3.1 cm**, legs 22.6 → 17.2;
  - the carrier's planned feint is **INTERRUPTED BEFORE THE TECHNICAL EVENT** — it would commit from a body displaced beyond its support chain (ξ 21 > 20 cm). His recovery step is then blocked inside the tackler's shin: a TRIP fall candidate;
  - the tackler, past his contact, **staggers**: three steps of 13, 21 and 8 cm, regaining balance after 2.4–2.7 s;
  - the tackle's outcome (MISS) is unchanged.

## CROQUETA RESULTS

| case | contact (onset s · regions · closing m/s) | player | severity σ | balance | action | steps (foot cm) | root / pelvis cm | lean / rot ° | regained |
|---|---|---|---|---|---|---|---|---|---|
| **croq-close**<br>torso 0.0→0.0 · legs 2.0→2.0 | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **croq-close-m**<br>torso 0.0→0.0 · legs 4.1→4.1 | #1 0.65 · THIGH / THIGH · 1.161 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 5.2 / 0.0 | 5.7 / 1.5 | 0.90 s |
|  | #1 0.65 · THIGH / THIGH · 1.161 | DEF | MODERATE 0.741 | CORRECT | — (ordinary) | — | 8.8 / 0.0 | 5.4 / 2 | 1.38 s |
| **croq-hip**<br>torso 0.0→0.0 · legs 4.7→7.1<br>touches denied 2 | #1 0.66 · THIGH / THIGH · 1.777 | ATT | STRONG 1.339 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | R 14.2 | 42.1 / 0.0 | 8.7 / 6.6 | 1.51 s |
|  | #1 0.66 · THIGH / THIGH · 1.777 | DEF | SEVERE 3 | FALL CANDIDATE | STAGGER / FALL CANDIDATE | R 6.9, R 5.5 | 6.9 / 0.0 | 4.6 / 3.3 | fall cand. |
| **croq-hip-m**<br>torso 0.0→0.0 · legs 4.5→6.7<br>touches denied 2 | #1 0.66 · THIGH / THIGH · 1.864 | ATT | STRONG 1.326 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | L 13.7 | 41.3 / 0.0 | 8.6 / 6.5 | 1.52 s |
|  | #1 0.66 · THIGH / THIGH · 1.864 | DEF | SEVERE 2.99 | STAGGER CANDIDATE | — (ordinary) | L 7.2, R 19.5, R 26.5, L 6.3 | 100.5 / 1.8 | 8.2 / 3.7 | not in replay |
| **croq-leg**<br>torso 0.0→0.0 · legs 4.4→3.8 | #1 0.59 · THIGH / THIGH · 3.012 | ATT | MODERATE 1 | CORRECT | EVENT COMPLETES → RECOVERY | — | 9.7 / 0.0 | 6.6 / 3.2 | 1.08 s |
|  | #1 0.59 · THIGH / THIGH · 3.012 | DEF | STRONG 1.245 | RECOVERY STEP | — (ordinary) | R 10.3 | 20.9 / 0.0 | 8.2 / 1.4 | 1.49 s |
| **croq-leg-m**<br>torso 0.0→0.0 · legs 8.3→3.2 | #1 0.59 · THIGH / THIGH · 2.986 | ATT | STRONG 1.159 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | R 6.7 | 28.6 / 0.4 | 7.6 / 4 | 1.49 s |
|  | #1 0.59 · THIGH / THIGH · 2.986 | DEF | STRONG 1.198 | RECOVERY STEP | — (ordinary) | L 7.2, R 8.3 | 38.0 / 0.0 | 9.3 / 1.5 | 1.48 s |
| **croq-early**<br>torso 11.5→0.0 · legs 22.7→13.7<br>tackle: CONTACT — ATTACKER RECOVERS (same)<br>touches denied 2 | #1 0.57 · THIGH / THIGH · 1.986 | ATT | STRONG 1.191 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | L 8.0 | 29.1 / 0.3 | 5.5 / 3.6 | 2.11 s |
|  | #1 0.57 · THIGH / THIGH · 1.986 | DEF | STRONG 1.262 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | R 11.0, R 7.9 | 45.2 / 1.0 | 7.6 / 1.6 | 1.71 s |
| **croq-early-m**<br>torso 11.5→0.0 · legs 22.7→13.7<br>tackle: CONTACT — ATTACKER RECOVERS (same)<br>touches denied 2 | #1 0.57 · THIGH / THIGH · 1.986 | ATT | STRONG 1.191 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | R 8.0 | 29.1 / 0.3 | 5.5 / 3.6 | 2.11 s |
|  | #1 0.57 · THIGH / THIGH · 1.986 | DEF | STRONG 1.262 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | L 11.0, L 7.9 | 45.2 / 1.0 | 7.6 / 1.6 | 1.71 s |
| **croq-before**<br>torso 0.0→0.0 · legs 14.0→13.7 | #1 0.46 · SHIN / SHIN · 2.533 | ATT | STRONG 1.172 | RECOVERY STEP | INTERRUPTED BEFORE EVENT | L 7.2, R 5.1 | 42.0 / 1.6 | 8.8 / 8.1 | not in replay |
|  | #1 0.46 · SHIN / SHIN · 2.533 | DEF | SEVERE 3 | FALL CANDIDATE | STAGGER / FALL CANDIDATE | R 8.3 | 6.4 / 0.0 | 6.2 / 3.8 | fall cand. |
| **croq-before-m**<br>torso 0.0→0.0 · legs 14.9→13.8 | #1 0.46 · SHIN / SHIN · 2.527 | ATT | STRONG 1.151 | RECOVERY STEP | INTERRUPTED BEFORE EVENT | R 6.4 | 19.7 / 1.9 | 7.2 / 5.6 | 1.45 s |
|  | #1 0.46 · SHIN / SHIN · 2.527 | DEF | STRONG 1.207 | RECOVERY STEP | — (ordinary) | L 8.7 | 19.1 / 0.0 | 8.8 / 3.7 | 1.38 s |
| **croq-between**<br>torso 0.0→0.0 · legs 13.0→5.7<br>touches denied 2 | #1 0.60 · THIGH / THIGH · 1.982 | ATT | STRONG 1.209 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | L 8.8, L 6.0 | 44.0 / 0.0 | 9.4 / 5.7 | not in replay |
|  | #1 0.60 · THIGH / THIGH · 1.982 | DEF | SEVERE 3 | FALL CANDIDATE | STAGGER / FALL CANDIDATE | R 8.6 | 6.3 / 0.0 | 4.1 / 3.9 | fall cand. |
| **croq-between-m**<br>torso 0.0→0.0 · legs 14.1→5.7<br>touches denied 1 | #1 0.60 · THIGH / THIGH · 2.059 | ATT | STRONG 1.211 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | R 8.9, R 5.6 | 36.8 / 0.0 | 9.4 / 5.9 | 1.82 s |
|  | #1 0.60 · THIGH / THIGH · 2.059 | DEF | SEVERE 3 | FALL CANDIDATE | STAGGER / FALL CANDIDATE | L 8.7 | 6.3 / 0.0 | 4.1 / 3.5 | fall cand. |
| **croq-after**<br>torso 0.0→0.0 · legs 2.0→2.0 | #1 0.90 · THIGH / THIGH · 1.969 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 4.2 / 0.0 | 5.1 / 2.1 | 1.49 s |
|  | #1 0.90 · THIGH / THIGH · 1.969 | DEF | MODERATE 0.694 | CORRECT | — (ordinary) | — | 3.6 / 0.0 | 3.5 / 0.5 | 1.11 s |
| **croq-after-m**<br>torso 0.0→0.0 · legs 2.3→2.3 | #1 0.90 · THIGH / THIGH · -0.043 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 8.4 / 0.0 | 8.4 / 1.5 | 0.97 s |
|  | #1 0.90 · THIGH / THIGH · -0.043 | DEF | MODERATE 0.66 | CORRECT | — (ordinary) | — | 3.5 / 0.0 | 5.4 / 2.8 | not in replay |

- **Past a stationary defender (`croq-close`):** no meaningful contact in one direction, Stage 2 exactly. The mirror touches: both MODERATE, CORRECT.
- **Shoulder / hip contact (`croq-hip`), after the transfer:** the Croqueta's decisive touch stands. Its remaining authored touches give way to a 14 cm recovery step (TECHNICAL EVENT COMPLETES, RECOVERY REPLACED). The standing defender is hit at the hip: a fall candidate one way (capture point running away), a four-step stagger the other.
- **Leg contact (`croq-leg`):** the carrier CORRECT or one 7 cm step; the defender one or two steps (7–10 cm).
- **Into a committed tackle (`croq-early`):**
  - torso **11.5 → 0.0 cm**, legs 22.7 → 13.7;
  - both STRONG, both technical events complete, both replaced by recovery steps (8–11 cm);
  - tackle outcome unchanged.
- **Contact before the first touch (`croq-before`, a shin clash at 2.5 m/s).** The carrier is **INTERRUPTED BEFORE THE TECHNICAL EVENT**: the decisive touch was not made (Stage 2 already blocks it) and the support cannot hold ξ 12 cm. He takes two steps. The standing defender is a TRIP fall candidate one way and steps once in the mirror.
- **Between the touches (`croq-between`):**
  - legs 13.0 → 5.7 cm;
  - the carrier completes the transfer, then steps twice;
  - the defender, standing, is a fall candidate (TRIP).
- **After the receiving touch (`croq-after`):** the Croqueta has released; both MODERATE, CORRECT.

## STANDING TACKLE RESULTS

| case | contact (onset s · regions · closing m/s) | player | severity σ | balance | action | steps (foot cm) | root / pelvis cm | lean / rot ° | regained |
|---|---|---|---|---|---|---|---|---|---|
| **carry-jog-l**<br>torso 0.0→0.0 · legs 3.7→3.0<br>tackle: CONTACT — ATTACKER RECOVERS (same) | #1 1.12 · THIGH / THIGH · 0.952 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 6.9 / 0.0 | 4.6 / 1.8 | 1.06 s |
|  | #1 1.12 · THIGH / THIGH · 0.952 | DEF | MODERATE 0.752 | CORRECT | PERTURBED, CONTINUES | — | 2.0 / 1.0 | 6.9 / 1 | 0.90 s |
| **carry-jog-l-m**<br>torso 0.0→0.0 · legs 3.7→3.0<br>tackle: CONTACT — ATTACKER RECOVERS (same) | #1 1.12 · THIGH / THIGH · 0.952 | ATT | MODERATE 1 | CORRECT | — (ordinary) | — | 6.9 / 0.0 | 4.6 / 1.8 | 1.06 s |
|  | #1 1.12 · THIGH / THIGH · 0.952 | DEF | MODERATE 0.752 | CORRECT | PERTURBED, CONTINUES | — | 2.0 / 1.0 | 6.9 / 1 | 0.90 s |
| **croq**<br>torso 0.0→0.0 · legs 1.0→1.0<br>tackle: MISS (same) | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **croq-m**<br>torso 0.0→0.0 · legs 1.0→1.0<br>tackle: MISS (same) | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **carry-walk**<br>torso 0.0→0.0 · legs 10.8→7.3<br>tackle: CONTACT — ATTACKER RECOVERS → **CONTACT — DEFENDER RECOVERS** | #1 1.50 · THIGH / THIGH · -0.165 | ATT | STRONG 1.129 | RECOVERY STEP | — (ordinary) | R 5.4 | 11.0 / 0.0 | 5.4 / 2.7 | 1.32 s |
|  | #1 1.50 · THIGH / THIGH · -0.165 | DEF | MODERATE 1 | CORRECT | EVENT COMPLETES → RECOVERY | — | 19.9 / 3.5 | 6.1 / 4.9 | 1.72 s |
| **carry-walk-m**<br>torso 0.0→0.0 · legs 10.8→7.3<br>tackle: CONTACT — ATTACKER RECOVERS → **CONTACT — DEFENDER RECOVERS** | #1 1.50 · THIGH / THIGH · -0.165 | ATT | STRONG 1.129 | RECOVERY STEP | — (ordinary) | L 5.4 | 11.0 / 0.0 | 5.4 / 2.7 | 1.32 s |
|  | #1 1.50 · THIGH / THIGH · -0.165 | DEF | MODERATE 1 | CORRECT | EVENT COMPLETES → RECOVERY | — | 19.9 / 3.5 | 6.1 / 4.9 | 1.72 s |
| **cut**<br>torso 0.0→0.0 · legs 0.0→0.0<br>tackle: MISS (same) | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **cut-m**<br>torso 0.0→0.0 · legs 0.0→0.0<br>tackle: MISS (same) | no meaningful contact — Stage 2 exactly | | | | | | | | |
| **in-croq**<br>torso 3.4→0.0 · legs 22.7→22.7<br>tackle: CONTACT — DEFENDER RECOVERS (same) | #1 0.55 · THIGH / THIGH · 2.574 | ATT | SEVERE 3 | FALL CANDIDATE | INTERRUPTED BEFORE EVENT → FALL CAND. | R 8.9 | 17.8 / 1.6 | 8.8 / 2.1 | fall cand. |
|  | #1 0.55 · THIGH / THIGH · 2.574 | DEF | STRONG 1.156 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | R 6.6 | 40.9 / 1.6 | 9 / 2.1 | 2.03 s |
| **in-croq-m**<br>torso 3.4→0.0 · legs 22.7→22.7<br>tackle: CONTACT — DEFENDER RECOVERS (same) | #1 0.55 · THIGH / THIGH · 2.574 | ATT | SEVERE 3 | FALL CANDIDATE | INTERRUPTED BEFORE EVENT → FALL CAND. | L 8.9 | 17.8 / 1.6 | 8.8 / 2.1 | fall cand. |
|  | #1 0.55 · THIGH / THIGH · 2.574 | DEF | STRONG 1.156 | RECOVERY STEP | EVENT COMPLETES → RECOVERY | L 6.6 | 40.9 / 1.6 | 9 / 2.1 | 2.03 s |
| **both-committed**<br>torso 0.0→0.0 · legs 22.7→22.5<br>tackle: CONTACT — DEFENDER RECOVERS (same) | #1 0.58 · THIGH / THIGH · 2.117 | ATT | SEVERE 3 | FALL CANDIDATE | EVENT COMPLETES → RECOVERY → FALL CAND. | R 15.3 | 10.6 / 3.0 | 7 / 1.4 | fall cand. |
|  | #1 0.58 · THIGH / THIGH · 2.117 | DEF | SEVERE 3 | FALL CANDIDATE | EVENT COMPLETES → RECOVERY → FALL CAND. | — | 10.9 / 1.8 | 5.8 / 5.7 | fall cand. |
| **both-committed-m**<br>torso 0.0→0.0 · legs 22.7→22.5<br>tackle: CONTACT — DEFENDER RECOVERS (same) | #1 0.58 · THIGH / THIGH · 2.117 | ATT | SEVERE 3 | FALL CANDIDATE | EVENT COMPLETES → RECOVERY → FALL CAND. | L 15.3 | 10.6 / 3.0 | 7 / 1.4 | fall cand. |
|  | #1 0.58 · THIGH / THIGH · 2.117 | DEF | SEVERE 3 | FALL CANDIDATE | EVENT COMPLETES → RECOVERY → FALL CAND. | — | 10.9 / 1.8 | 5.8 / 5.7 | fall cand. |

- **Clean poke (`carry-jog-l`).** The ball contact precedes the bodies' contact (+0.913 s, bodies at +1.121 s). The tackler is PERTURBED BUT CONTINUES; the carrier is CORRECT. Outcome unchanged.
- **Tackle miss (`croq`), sharp cut (`cut`):** no meaningful contact — Stage 2 exactly.
- **Into the carrier (`carry-walk`).** The poke reaches the ball first (+1.308 s); the bodies meet at +1.500 s, slowly (the carrier 11 cm off his line). The carrier must step with the foot that would have collected the loose ball, so the defender recovers it. The outcome moves from ATTACKER RECOVERS to **DEFENDER RECOVERS**, and the cause is listed: ATT RECOVERY STEP · DEF TECHNICAL EVENT COMPLETES, RECOVERY REPLACED. Not tuned.
- **Into a Croqueta (`in-croq`):**
  - torso 3.4 → 0.0 cm;
  - the carrier is **INTERRUPTED BEFORE THE TECHNICAL EVENT** — ξ grows past his chain before the transfer — and his step is blocked: a TRIP fall candidate;
  - the tackler's event completes, then one step. Outcome unchanged.
- **Into a Body Feint:** the Body Feint table's `in-bf` and `bf-fake`.
- **Both committed (`both-committed`):** next section.

## COMMITTED-v-COMMITTED RESULTS

Episodes whose onset has the carrier's Body Feint / Croqueta committed **and** the defender's Standing Tackle committed (`evidence/metrics_*.json`; summary below):

| | matrix | moves | search |
|---|---|---|---|
| episodes | 6 | 76 | 1 |
| the carrier, at onset | after the decisive touch 4 · before 2 | after 46 · before 20 · released 9 · touch not made 1 | released 1 |
| the tackle, at onset | contact 2 · follow-through 2 · recovery step 2 | recovery step 30 · follow-through 17 · drive + reach 17 · contact 5 · return 3 · set 2 · load 2 | follow-through 1 |
| regions · closing (median) | THIGH / THIGH 6 · 2.12 m/s | THIGH / THIGH 60 · SHIN / SHIN 16 · 1.94 m/s | THIGH / THIGH · 0.83 m/s |
| carrier: balance | STEP 2 · FALL 4 | CORRECT 44 · STEP 18 · FALL 11 · STAGGER 2 · ABSORB 1 | CORRECT 1 |
| carrier: action | EVENT COMPLETES → RECOVERY 2 (+2 → fall) · INTERRUPTED BEFORE → fall 2 | PERTURBED, CONTINUES 22 · UNAFFECTED 13 · ordinary (released) 14 · EVENT COMPLETES → RECOVERY 10 (+4 → fall) · INTERRUPTED BEFORE 6 (+3 → fall) · STAGGER / FALL 4 | — |
| tackler: balance | STEP 4 · FALL 2 | CORRECT 45 · STEP 19 · FALL 8 · STAGGER 2 · ABSORB 2 | CORRECT 1 |
| tackler: action | EVENT COMPLETES → RECOVERY 4 (+2 → fall) | EVENT COMPLETES → RECOVERY 35 (+8 → fall) · PERTURBED, CONTINUES 16 · UNAFFECTED 17 | PERTURBED, CONTINUES 1 |
| tackle outcomes changed | 0 of 6 | 8 of 76 | 0 |

- **Committed against committed is no longer "unresolved".** Each side's support decides:
  - most committed carriers keep their authored move (PERTURBED BUT CONTINUES / UNAFFECTED, 35 of 76);
  - a quarter complete their technical event and then give way to a recovery;
  - the rest are interrupted only before the decisive touch, when it is no longer reachable.
- **The tackler is almost always past his contact**, so the event stands and his recovery is replaced (43 of 76).
- **`both-committed`** (a Croqueta just past its transfer × a poke-lunge at its contact; thighs at 2.1 m/s): both are fall candidates. Each player's stepping foot is caught inside the other's leg 0.25 s later (TRIP). It is the clearest case for Stage 3B.
- **Neither side's feet move to resolve it.** The committed planted feet stay exact (Stage 2's 2 / 8 / 12 cm ledger, owner's decision). The collision goes into momentum, the pelvis (≤ 3 cm here) and the trunk (lean 6–7°, rotation up to 6°).

## CONTINUITY (§18) — position, velocity, acceleration

Tool `tools/o3_continuity.mjs`. It measures the drawn pelvis, knees and feet at 60 Hz, ± 5 frames around each transition, against **the same window of the same encounter in Stage 2** (what the motion itself does there). Output: `evidence/continuity_{matrix,review}.{txt,json}`.

| transition (matrix) | n | pelvis acc cm/frame² S2 → S3 (max) | pelvis Δv m/s | pose snap cm | windows where Stage 3 adds > 2 / > 4 cm/frame² |
|---|---|---|---|---|---|
| STAGE 2 → IMPACT | 78 | 10.4 → 10.1 | 4.92 → 5.14 | 5.3 → 5.1 | 4 / 0 |
| IMPACT → MAXIMUM PERTURBATION | 78 | 14.0 → 10.1 | 4.92 → 4.92 | 3.8 → 3.8 | 7 / 2 |
| MAXIMUM → RECOVERY STEP | 39 | 14.0 → 7.2 | 4.27 → 4.32 | 5.3 → 5.1 | 6 / 0 |
| STEP → WEIGHT ACCEPTANCE | 39 | 7.3 → 7.7 | 3.38 → 3.68 | 4.0 → 6.5 | **8 / 2** |
| WEIGHT ACCEPTANCE → LOCOMOTION | 48 | 4.6 → 3.0 | 1.61 → 1.21 | 2.7 → 2.0 | 0 / 0 |

- **The impact itself creates no snap.** The perturbation is a velocity, integrated, and the posture is damped oscillators. The window maxima are Stage 2's own (canonical re-plan blends), not Stage 3's.
- **Weight acceptance is the one place Stage 3 adds jolts.** In 8 of 39 recovery-step landings the pelvis jolt rises above Stage 2's window by > 2 cm/frame² (2 by > 4).
  - Traced on the worst (`croq-early`, the defender at 0.94 s): it is **vertical** — the pelvis drops 5.1 cm in one frame at the landing, then rises 2.5.
  - The **unperturbed canonical pose of the same plan drops the same** (85.1 → 79.8 → 82.2 cm): the canonical body fits the hips to the new support at the landing in one frame.
  - Stage 3's step is blended into the plan (0.12 s); the body's vertical fit at the landing is not.
  - Keeping the step inside the leg's reach did not change it. It is listed as a limitation; smoothing it would mean changing the canonical body (not done).
- **Not smoothed by allowing penetration.** Nowhere is continuity bought by letting the bodies overlap more (§18).

## FALL CANDIDATES — the cases Stage 3 V1 cannot recover

Recorded with the state at the failure point: time, cause, support, the perturbation velocity, the root velocity, the centre of mass, the posture's angles and rates, and the contact. Shown in the Lab (✕ on the timeline, the event list, the frame data).

**After the failure point:** a labelled diagnostic placeholder (`UNRESOLVED FALL CANDIDATE`). The perturbation fades over 0.3 s, then Stage 2 drives the player again. A pending step is cancelled then. Nothing falls; nothing is animated.

| set | fall candidates | TRIP (the stepping foot blocked inside the opponent's leg) | CAPTURE POINT RUNS AWAY (no reachable placement) | MOMENTUM NOT REALISABLE over the support |
|---|---|---|---|---|
| review | 7 (5 encounters) | 7 | 0 | 0 |
| matrix | 14 (12) | 11 | 3 | 0 |
| moves | 40 (30) | 21 | 18 | 1 |
| search | 54 (37) | 30 | 24 | 0 |

The matrix's, one by one (time from the carrier's t = 0):

| encounter | who | failure (impact) | cause | support | \|u\| m/s | action |
|---|---|---|---|---|---|---|
| oblique-firm (+ mirror) | DEF | 1.06 s (1.02) | TRIP | airborne | 0.34 | STAGGER / FALL CANDIDATE |
| bf-fake (+ mirror) | ATT | 0.90 s (0.68) | TRIP | free locomotion | 0.54 | INTERRUPTED BEFORE TECHNICAL EVENT → FALL |
| croq-hip | DEF | 0.73 s (0.66) | capture point runs away (ξ 38 cm) | single support | 0.76 | STAGGER / FALL CANDIDATE |
| croq-before | DEF | 0.65 s (0.46) | TRIP | single support | 0.64 | STAGGER / FALL CANDIDATE |
| croq-between (+ mirror) | DEF | 0.66 s (0.60) | capture point runs away (ξ 35 cm) | single support | 0.68 | STAGGER / FALL CANDIDATE |
| in-croq (+ mirror) | ATT | 0.98 s (0.55) | TRIP | airborne | 0.48 | INTERRUPTED BEFORE TECHNICAL EVENT → FALL |
| both-committed (+ mirror) | ATT and DEF | 0.83 s (0.58) | TRIP, both | free locomotion | 0.64 | EVENT COMPLETES → RECOVERY → FALL |

- **The dominant failure is a trip, not a push.** A swinging leg is held inside the opponent's leg; that is exactly the leg-through-leg overlap Stage 3 does not resolve. Pushes alone rarely beat a recovery step. Where they do, the body was on one foot with ~0.7 m/s of perturbation: a standing defender hit at the hip by a Croqueta's transfer.
- **For a TRIP** the recorded ξ is the balance of the tick before (the failure is the blocked foot, not the capture point).
- **These are the Stage 3B inputs:** stumble, trip, fall, ground contact, get-up.

## PERFORMANCE (§19)

Tool `tools/o3_perf.mjs`, run alone: 69 encounters (review + matrix) × 3, node 22, one core. Output: `evidence/performance.txt`.

| | mean | p99 | max |
|---|---|---|---|
| the world's step, STAGE 2 | 98.5 µs | 587 µs | 18.0 ms |
| the world's step, STAGE 3 | 121.0 µs | 722 µs | 20.3 ms |
| impact pass **IDLE** (beyond the broad phase) | **0.6 µs** | 1.3 µs | 0.5 ms |
| impact pass **NEAR** (within it, no meaningful contact — the contact check) | **9.4 µs** | 22.3 µs | 0.7 ms |
| impact pass **ACTIVE** (an episode responding) | **75 µs** | 321 µs | 2.1 ms |
| of an active pass: both players' response / balance / realisation | 38 µs (the capture analysis 1.5 µs) | | |
| **worst tested 60 Hz frame** (four steps) | S2 31.6 ms · **S3 28.5 ms** (p99 4.7 / 5.2 ms; mean 0.4 / 0.5 ms) | | |

- **Per simulated second** here (17 % of ticks near, 19 % active): the impact pass ≈ 3.9 ms; the step 23.6 → 29.0 ms.
- **The worst frames are one-off spikes in both stages** — first-run compilation and garbage collection, the same in Stage 2.
- **Scale, 22 players.** The pass is per **pair within Stage 2's broad phase** (1.9 m); far pairs cost one distance test. The expensive part (balance, capture, realisation) runs only for players inside an episode. A dense match moment has ≈ 4–8 near pairs and ≈ 1–3 in contact: ≈ 0.2 ms per tick, 0.8 ms per 60 Hz frame, plus an O(N) grid for the pair search. Nothing is O(N²) beyond the broad phase.

## REGRESSION (§21)

| check | result |
|---|---|
| **Stage 2 reproduced exactly** before any change (all Stage 2 tools, compared with `817e0f25`'s evidence) | identical except wall-clock times — `evidence/stage2_reproduction/` |
| canonical files changed (vocab2 / tackle1 / possess1 / occupy1 / occupy2, `tc_baseline_88573ef0*`, `agility99/movement.js`) | **0** (`git diff 817e0f25..HEAD`: new files only); `bl_lock_check.sh` **PASS** |
| the milestone's own regression (Body Feint ≡ its review build, Croqueta LEG-WAVE V4 ≡ its build, chains, Lab cards, sweeps) | **ALL 10 SUITES IDENTICAL** to the milestone's evidence — re-run at the start of this branch; no canonical file changed since |
| **Stage 3 ≡ Stage 2 before the first impact**, every tick (both roots, the ball, the authority, every joint of both bodies) | review **37 / 37** · matrix **52 / 52** · moves **352 / 352** · search **235 / 235**; no meaningful contact (identical throughout): 11 · 13 · 183 · 91 |
| **one footballer** (105 curated canonical cases, the other parked 40 m away, 127,092 ticks) | **105 / 105 identical every tick**; Stage 3 never evaluated anything |
| **two players passing** (Stage 2's near-miss sweep, 64 passes) | no impact opened → **identical every tick 56 / 56**: all near misses (0–5 cm 17, 5–30 cm 22), all apart (5), **all touching within the 2 cm tolerance (11)**; impacts only where Stage 2 had to resolve an overlap (8 of 9) |
| possession torture (possess1, 60 trials × 4 modes, Stage 3 on) | all checks **0**, deterministic |
| no new information before perception | decisions never differ (0 · 0 · 0) except through a denied touch; root differences only with occupancy / an impact acting |
| **torture** (16 seeds × mirror × 40 s, Stage 3 run twice) | **deterministic 32 / 32** · NaN 0 · stuck (contact > 1.5 s steering away) 0 · dual ownership 0 · chatter 0 · collision loops (> 6 s or > 40 episodes) **0** · recovery-step oscillation **0** · 68 episodes, 81 recovery steps, 18 fall candidates · deepest 22.7 → 22.4 cm, ticks > 5 cm 680 → 540, jolts > 4 cm 166 → 151 |
| the browser (the Lab in Chrome, every case) | **19 / 19**: 69 / 69 cases simulate and draw; **page ≡ node 69 / 69** (penetration, outcome, impacts, each player's severity / balance / action / steps); views, skins, every overlay, cameras, rates, frame step, loop, replay; 0 console / HTTP errors |

**Two canonical findings, recorded, not changed:**
- **The canonical Standing Tackle sometimes commits with its control return 19–24 s away.** The defender then stands owned by his tackle (torture runs #1m, #2m; 13 such tackles in Stage 2's torture, 17 in Stage 3's). They account for 684 of Stage 3's 711 "asking to move, not moving" samples. The other 27 compare with Stage 2's 46.
- **The canonical body fits the hips to a new support in one frame** (the weight-acceptance dip above).

## REMAINING LIMITATIONS

Honest, in order of how much they matter for what you will see.

1. **Leg-through-leg overlap is not reduced.** The deepest leg penetration is unchanged (matrix 22.7 → 22.7 cm). Stage 3 gives contact a **momentum consequence**; it does not re-path an authored, ball-anchored limb. A Croqueta's sweep or a tackle's lunge passing through the other's leg still passes through. The trip-risk detector reports it; the physics of a leg deflected by a leg does not exist yet. This is the largest remaining visual defect, and the natural core of Stage 3B (trips).
2. **The swinging limb is not deflected.** A limb strike changes the two bodies' momentum. The striking leg itself keeps its authored path through the strike.
3. **Trips are instrumented, not simulated.** SWINGING LEG BLOCKED — a swinging leg held > 5 cm inside the opponent's leg for 25 ms — becomes a fall candidate when that foot is the one the balance must step with.
4. **Fall candidates end in a labelled placeholder.** The perturbation fades over 0.3 s, then the player is handed back to Stage 2. The body does not fall. Whatever follows a fall candidate in the replay is downstream of an unresolved fall, not meaningful physics.
5. **Crossed legs go up while Stage 3 acts** (matrix 285 → 436 ticks, 306 of them while Stage 3 acts on that player; moves 2070 → 3431, 1863). Recovery steps never cross (the placement rule), but the gait's own landings under a lateral perturbation do.
6. **The canonical body's own mismatches** (found in Stage 2, unchanged):
   - plan-planted feet are sometimes drawn lifted — the support polygon uses only the feet drawn on the turf;
   - re-plan landing blends can slide a drawn foot (largest planted ball-of-foot slide on the turf 11.8 → 11.0 cm on the matrix, the same in both stages). The canonical body also fits the hips to a new support in one frame: at 8 of 39 recovery-step landings this adds a vertical pelvis dip (CONTINUITY).
7. **Momentum, not stiffness.**
   - The bodies are rigid-inertia point masses with a damped posture layer. There are no joint torques, no vertical impulse, no ground contact by the body.
   - Contact is perfectly inelastic (τ 0.03 s). A limb strike stops the limb's relative velocity completely; a walker's knee clipping a standing player's thigh beyond the 2 cm tolerance (articulated 2–2.4 m/s, ≈ 19 N·s) already makes both step. In Stage 2's near-miss sweep, such passes end up to 28 cm off their line.
8. **Equal bodies** (73 kg each, the rig's own). No strength, no size, no bracing skill (as instructed).
9. **The "mirrors" mirror the defender only**: his side, facing, preferred foot and stick. The carrier's authored move is the same move. 6 of 26 matrix pairs therefore meet differently (Stage 2's own penetration already differs on 5 of them).
10. **Balance is not always regained inside the replay** (matrix 48 of 78 responses; moves 272 of 352): the replay ends first, mostly after a stagger or a fall candidate.
11. **Tackle outcomes moved in a few cases** (review 1 · matrix 2 · moves 18 · search 25 encounters). Each has its physical cause listed; nothing was tuned.
12. **"Relative speed after"** is measured 0.2 s after onset along the onset normal. It includes the authored motion continuing, and can exceed the speed before.

## DECISIONS FOR THE OWNER

1. **Impact activation depth** — built: **2 cm** (Stage 2's own contact tolerance). Touching within it is contact without consequence, so a brush past is Stage 2 bit for bit. Alternative measured: **any touching pair** (`penMin 0`).
2. **What carries an ordinary player's impact momentum** — built: **the planted legs' reach** (Stage 2's own reach rule), with the 12 cm lean left as the bound on positional pushes, as decided. Alternative measured: the 12 cm lean applied to the impact too (`impactLean`).
3. **Limb-strike strength.** Perfectly inelastic, with the swinging leg's effective mass. Is a knee clip at walking pace a recovery-step event (as built), or should limb strikes keep some restitution / a lower ceiling? Not tuned (§22).
4. **The fall placeholder.**
   - Built: fade over 0.3 s and hand back to Stage 2.
   - Alternative: freeze both players at the failure point until Stage 3B.
5. **After "technical event completes, recovery replaced"**, the remaining authored touches are not played (e.g. a Croqueta's receiving touch once the transfer is made). The canonical planner re-plans from the ball's real state, and may collect it with an ordinary touch. Keep, or protect the receiving touch as part of the technical event?
6. **When Stage 3B starts:** trip simulation (the leg-blocked detector is the hook), stumble steps beyond one, falls, ground contact, get-up.

## THE REVIEW LAB (§20)

**http://127.0.0.1:8365/sandbox/visual/occupy3_lab.html** — *TOUCHLINE — PLAYER IMPACT + BALANCE V1 REVIEW*. Local only (real players' models).

- **Views:** **STAGE 2 | STAGE 3** side by side, synchronized, from identical inputs (key 3); or STAGE 2 alone (1) or STAGE 3 alone (2).
- **Cases:** every §16 matrix row, each mirror listed under its row, then the rest of Stage 2's review set. Each case shows its node-computed outcome line.
- **Controls:**
  - PLAY · REPLAY · frame step back / forward (`,` / `.`; shift steps one tick) · LOOP;
  - 1× · 0.5× · 0.25×;
  - eight cameras (GAMEPLAY, FRONT, REAR, SIDE LEFT, SIDE RIGHT, 3/4 FRONT, 3/4 REAR, OVERHEAD);
  - SKIN / SKELETON / SKIN + SKELETON (`s` cycles);
  - BALL (`o`) · CONTACT VOLUMES (`v`) · SUPPORT (`f`: footprints + polygon) · CENTRE OF MASS · BALANCE (`b`: the centre of mass, the capture point ξ, the slack) · CONTACT NORMAL (`n`) · IMPACT VECTOR (`i`: the impulse, N·s and Δv) · RECOVERY-STEP TARGET (`r`: the target ring, "lands in … s" / LANDED) · WORLD TRAILS (`t`) · STAGE 2 GHOST (`g`) · FRAME DATA on each view (`h`) · DIAGNOSTICS panel (`d`);
  - the timeline, one lane per stage: the penetration trace (2 / 5 cm lines), the ball contacts; on STAGE 3 the impacts, the episodes coloured by severity, recovery steps ▲, landings ●, interruptions ◆, fall candidates ✕ (click to seek).
- **Live data (each view's frame data + the diagnostics panel), per tick:**
  - contact regions and penetration per pair;
  - relative velocity: closing on the normal, sliding on the tangent;
  - Stage 3's impulse this tick (body contact / limb strike, effective masses);
  - per player: support state, committed action, balance class (A–E), σ and its band, *u*, *e*, ξ, the slack, the drawn pelvis, overflow, this tick's root shift, the posture channels, the recovery step;
  - the action state, the interruption classification with its reason, possession, the maximum penetration;
  - the episode's event list, and the referee facts (below).
- **Automation:** `window.IL` (ready / select / seek / set …), for the browser check below.

## FILES, EVIDENCE, COMMITS

- **Code (new files only):**
  - `sandbox/visual/occupy3/`:
    - `o3_world.js` — the impact world;
    - `o3_body.js` — the perturbed canonical body;
    - `o3_geom.js`;
    - `o3_run.js` — S2 / S2D / S3 from identical inputs;
    - `o3_cases.js` — the §16 matrix + mirrors;
    - `o3_facts.js`;
    - `o3_lab.js`;
  - `sandbox/visual/occupy3_lab.html`;
  - `sandbox/visual/occupy3/tools/` (`HANDOFF.md` lists each tool).
- **Evidence** (`evidence/`):
  - `stage2_reproduction/` — Stage 2 frozen;
  - `study/` — the conflict study, §2;
  - `identity_*`;
  - `solo.txt`;
  - `nearmiss*.{txt,json}`;
  - `metrics_*.{txt,json}`;
  - `ball_*.{txt,json}`;
  - `continuity_*.{txt,json}`;
  - `torture.{txt,json}`;
  - `two_player_possession.txt`, `two_player_early_info.txt`;
  - `variants_matrix.txt`;
  - `performance.txt`;
  - `lab_cases.json`, `browser.{txt,json}`.
- **Screenshots** (real players' models): the scratchpad only, never committed.
- **Commits** (`prototype/player-occupancy-stage3`, local, not pushed): `git log --oneline 817e0f25..HEAD`; the head is in `STATUS.json`.
