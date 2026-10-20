# RESPONSIVENESS EXPERIMENT (TC-RESPONSIVE-1) — proposed architecture

*For owner approval. Nothing here is implemented.*

**Goal:** "Move the stick and the elite footballer responds immediately, smoothly and believably."

**Basis:**
- `RESEARCH_SYNTHESIS.md`;
- the owner's report;
- the baseline measurements (`evidence/RESP_CLOCKS_baseline_88573ef0_vs_1.2.txt`).

## 0 Ground rules

**Where it lives:**
- Beside the locked baseline, never on it.
- Code: `sandbox/visual/tc_responsive/`. Page: `tc_responsive.html`, the stable address the baseline's strip already links to.
- It starts from a **copy of 88573ef0's code**, not PLAYTEST-1.2's.
- The baseline is only *imported, read-only*, for the A/B comparison. `bl_lock_check.sh` must stay PASS.

**From PLAYTEST-1.2 we keep only what cannot affect feel:**
- the deterministic trig, so node ≡ browser bit for bit;
- the measurement tools.

None of its gates come across: no intent deferral, no in-flight landing commitment, no feet-order band, no gait validation, no ballFits gate.

**Unchanged constraints:**
- 99 / 99 / 99 only;
- 240 Hz, deterministic;
- the frozen ball kernel, which stays the only ball;
- no attachment, no post-contact correction, nothing frozen or integrated without the owner.

## 1 Authority split

**SIMULATION** — authoritative, hashed, replayable from the input record:

| state | contents |
|---|---|
| Intent | the latest stick vector per tick (direction, magnitude zone, sprint); its urgency (the angle between intent and current velocity × speed) |
| Root | position, velocity vector, gameplay facing ψ, yaw rate |
| **Contact effectors** (R, L) | position, velocity, state `SUPPORT / FREE / COMMITTED / RECOVER`, time of last contact; a coarse **support clock** (which foot carries the weight) |
| Contact plan | family, foot, provisional time, ball point, target outgoing ball state, status (provisional / committed / executed) |
| Ball | the frozen kernel; contacts are immutable records |

**PRESENTATION** — a pure, deterministic function of the simulation's history. The simulation never reads it.

| layer | what it owns |
|---|---|
| Footsteps | plant positions and yaw, stride phase, swing shapes |
| Body | pelvis, torso, head, arms; the acknowledgement lean and twist |
| Motion | base pose choice and transitions |
| Fit | IK; a small visual root offset |

## 2 Evaluation: the gameplay contact effector vs the rendered foot

**Today (baseline):** the simulation has no foot.
- A contact is scheduled at the swing end of a *planned stance*, and the planned stride decides when a touch can happen.
- At execution the only check is that the ball lies within 1.05 m of the centre of mass.
- The rendered leg then has to make it look right.

So stride choreography gates the timing (responsiveness suffers), while the legality check is loose (authority suffers).

**Proposed: two simulation-owned effectors with finite kinematics.**

| property | rule |
|---|---|
| Reach | an envelope from the hip, shaped per foot (wide on the foot's own side, limited across the body) |
| Speed | bounded speed and acceleration relative to the root |
| Availability | `SUPPORT` = loaded, cannot touch · `FREE` = can travel to the ball · `COMMITTED` = on its final ≈ 40 ms to a contact · `RECOVER` = ≈ 0.15 s before the same foot can touch again |
| Support clock | the only anatomy rule left in the simulation: never a touch with the foot carrying the weight, and never both feet touching at once; the loaded foot may hand over early (after ≥ 60 ms of support) so the other foot can take the weight |
| The contact itself | executes only if the committed effector actually reaches the *actual* ball; otherwise it is a miss and a re-plan |

**What it solves:**
- **Contact timing becomes reachability**, not stride phase. The earliest moment any free foot can legally get to the ball is the next opportunity. That gives "bring the next touch forward" and urgent reaches without any planned-stance machinery.
- **Authority gets stronger, not weaker.** A continuous, bounded foot proxy physically witnesses every touch. That is stricter than today's "ball within 1.05 m of the body".
- **Footwork is freed.** The rendered skeleton must agree with the effector only near the contact, and with the coarse support flag (it never shows a touch with the loaded foot). Everything else (plant positions, pivots, slides, shortened or re-timed steps) becomes presentation that can cheat.

**What it does not solve on its own:** the biggest measured delay, the 260–430 ms before the body visibly answers, sits in the root and the pose (synthesis §4). The effector must come with the root controller (§3) and the acknowledgement layer (§7).

**Risks and their controls:**

| risk | control |
|---|---|
| A contact the leg cannot explain (a stretched or across-body reach) | per-foot envelope with an own-side bias; across-body balls only through the slower "gather" family; finite speed |
| Touch spam or alternating flicks | the RECOVER time; the support clock |
| A visible pop when a provisional effector path changes | the renderer follows the effector tightly only inside the committed window; elsewhere it blends with decaying offsets |
| Determinism | effector state is simulation state, hashed and recorded |
| Later defending | tackles and shielding will need body and leg proxies in the simulation too, as the report says; the effector design extends to that |

**Verdict:** adopt it, in this minimal form. It resolves the responsiveness-versus-footwork conflict for *contact timing* without loosening Touchline's rule — simulation decides, animation explains. It actually tightens that rule.

## 3 Root controller (simulation)

It replaces the carry hold, the technique approach cruise, the 50° braking rule and the lateral-acceleration ÷ speed curvature limit.

- **Velocity-vector steering:**
  - the component of velocity off the new line is braked hard (A99 brake, and more in the urgent family);
  - the component along it is built at aAcc;
  - the lateral acceleration cap is raised in the urgent family;
  - at low speed the player pivots or shuffles.
- **It responds from the first tick of an intent change.**
- **It is ball-aware.** While turning toward the intent, the root heads for where the chosen contact can happen, never straight on along the old line.
- **Facing ψ** turns toward a blend of the intent and the ball at A99's yaw rate. The feet do not constrain it.
- **Continuity:** position stays continuous and velocity changes are bounded. The bounds are tuned for feel, openly, in the simulation, not hidden in the animation.

## 4 Contact resolver: the generic vocabulary (simulation data)

**When it runs:** on every intent change, contact, effector state change and refresh.

**What it evaluates:**
- each family × each free (or re-phaseable) foot;
- the earliest legal contact time t_c, from effector reach and speed against the *predicted* ball;
- the outgoing ball state for the **latest** intent, which must pass the control-envelope check (§6).

**Cost:**
- time to the first relevant contact;
- time to the new line;
- the ball's separation;
- the family's effort;
- continuity with the current family;
- the preferred foot.

**Replacement:** the chosen contact replaces any superseded, uncommitted one. A committed or executed contact is never touched.

| family | used for | what it does |
|---|---|---|
| carry push | on the line (±15°) | laces or outer instep; ball placed for the next opportunity |
| inside redirect | ≈ 15–70° toward the touching foot's inside | compact touch, body turns with it |
| outside redirect | ≈ 15–60° toward its outside | compact touch, short step |
| across-body gather | ball on the other side, or a larger change | the far foot's inside, a little slower |
| **urgent reach (effort touch)** | drastic change when the next ordinary contact is too late | the free foot reaches early; short ball; hard brake; prompt exit |
| braking pivot | 100–180° | brake, then a sole or inside pull with a short exit |
| sole check / stop | stop, or a reversal at low speed | ball under the sole |

**Named techniques** (Ronaldo chop, Cruyff, hook, drag-back, outside cut) are kept unchanged but become **contextual**. They are candidates only when the stick is held in their comfort range for at least X ms and they are not slower than the best generic family by more than Y ms. The thresholds are an owner decision. A page toggle (off / contextual / always eligible, as in the baseline) supports A/B.

## 5 Commitment and the latest intent

**Phases:**

| phase | what holds |
|---|---|
| provisional | revisable until t_c − ≈ 40 ms (D99 ≈ 10 ticks, the report's 2–3 ticks at 60 Hz) |
| committed | only the contacting effector's final ≈ 40 ms; the root and the other foot stay free |
| executed | the record is immutable |
| recovery | straight back to carrying; no decorative completion |

**Rapid input:**
- Every tick holds the latest intent, and superseded uncommitted plans are dropped.
- There must be zero stale actions: no obsolete 90° turn played after the stick has moved on.
- A committed contact that is still physically valid completes. It is logged separately as a bounded commitment, not as a stale action.

## 6 Cadence and the control envelope

**Cadence is an opportunity schedule by context:**
- open sprint: a touch every 2–3 steps, ball 1.2–2 m ahead;
- run: every 1–2 steps;
- jog or tight play: every step;
- volatile input: at most one step, with shorter touches.

**A drastic request** asks the resolver for an earlier reachable contact, any free foot or the urgent reach. That contact **replaces** the next touch.

**The envelope (how zero loss is achieved):**
- Every outgoing ball state must keep the ball inside the predicted reach of the root at the next opportunity, under the latest intent.
- If it would not, the touch is shortened, redirected, given another surface or another family *before* the contact.
- Nothing is corrected after a contact. There is no permission gate.

## 7 Presentation: what is allowed to cheat

**Acknowledgement layer**, from the first tick of an intent change:
- the torso and head lead toward the intent, bounded at ≈ 25–35°;
- the pelvis leads by ≤ 15°;
- the body leans back in proportion to the *authoritative* braking;
- the arms respond;
- all of this decays as the root turns.

It is a function of the simulation's intent and the root's acceleration, so it is deterministic and the same live and in replay.

**Footsteps synthesized from the root path:**
- step length comes from speed, and step time from the cadence table (stride warping);
- step direction follows the root's velocity (orientation warping);
- which foot is planted follows the simulation's support clock;
- a plant may pivot (yaw) and slide ≤ ≈ 4 cm at a bounded rate;
- steps can be shortened or re-timed at once (abbreviated support transfer);
- a contact never needs a plant.

**Around a contact:**
- From ≈ 80 ms before to ≈ 40 ms after a committed contact, the rendered foot is IK-locked to the effector. The visible touch is the simulation's touch.
- Outside that window the foot follows its own swing and blends toward the effector with a decaying offset.

**Motion, transitions and bounds:**
- **Base motions:** RUN-1's gait poses, the TC1.5 technique poses, and new short generic family poses.
- **Transitions:** inertialization-style offset decay; never a full-body restart on input.
- **Visual root offset:** ≤ ≈ 4 cm, settling within ≈ 0.2 s; it never moves the simulation root.
- **Still forbidden:** gross leg intersections, foot teleports, a touch shown with the support foot, false contacts.
- **Tolerated:** tiny discrepancies that are invisible at 1×. The order of judgement is 1×, then responsiveness, then fluidity, readability, 0.5×, and only last the frame diagnostics.

## 8 A/B page and harness

**The page** `tc_responsive.html`:
- the experiment, with the same WASD, analog stick, sprint, replay and slow motion as the baseline;
- a one-click switch to BASELINE-88573ef0, whose strip links back;
- **"Same input on the other engine":** this session's recorded stick input is re-simulated on the other build and replayed, so both can be compared on identical input.

**The harness** (headless, deterministic, identical traces for A and B):

**Preregistered primary set** — the report's 24 paired sequences:
- held 90°, a reversal at the commitment boundary, and 0 → 90 → 0 → −90 then hold;
- at jog and sprint × 4 fixed offsets, spanning the baseline's contact cycle;
- the same script times for both builds, never moved to suit either.

**Secondary sets:**
- the owner's key tests: sprint snaps of 45 / 90 / 120 / 180°, rapid left/right, the circle, small 20–40° corrections;
- the torture suite and 960 random runs, for control.

**Metrics:**
- the four clocks: acknowledgement; visible response; relevant contact; new line (heading within 15°, speed ≥ 40 % of the requested, held for 100 ms);
- lock time, and stale actions;
- completions against shared deadlines, with right-censored latencies;
- the ball's separation;
- loss categories;
- contacts per second, and their burstiness;
- exit acceleration;
- body artifacts, as diagnostics only.

**Integrity tests:**
- **Renderer-off / visual-variant hash test:** with the presentation off or changed, the gameplay hashes must stay identical.
- node ≡ browser.

**The report card** (the report's §9.2 targets):
- acknowledgement ≤ 1 tick;
- visible response p95 ≤ 50 ms;
- close-ball relevant contact p95 ≤ 150 ms;
- new-line p95 ≥ 25 % better than the baseline on the affected subset;
- zero stale actions;
- zero unforced losses in eligible cases.

**It is not an automatic gate:** the owner decides by playing.

## 9 Build order (after approval), and decisions needed

**Build order:**
1. Preregister the harness on the baseline: metrics, eligibility rules, deadlines. Tool only.
2. Simulation core: intent, root controller, effectors with the support clock, generic families, commitment, cadence and envelope.
3. Presentation: synthesized footsteps, the acknowledgement layer, the IK lock at contact.
4. The A/B page and the harness report, then stop for the owner's playtest.

**Owner decisions:**
1. **Effectors:** adopt simulation-owned contact effectors (minimal: two kinematic feet and a coarse support clock), with presentation-owned footsteps? *(recommended)*
2. **Named techniques** in ordinary analog play: contextual only *(recommended)*. What hold time X and speed margin Y?
3. **Starting point:** 88573ef0's code plus the deterministic trig only? *(recommended)*
4. **Contest gate:** a headless interceptor probe now, a real defender later? *(recommended)*
5. **Targets:** the report-card targets above, as a report card rather than a gate?
