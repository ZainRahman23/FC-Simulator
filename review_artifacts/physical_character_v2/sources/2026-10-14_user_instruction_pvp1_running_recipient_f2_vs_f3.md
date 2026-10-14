# User instruction, 2026-10-14 ≈ 23:45 BST (verbatim): PVP-1 — first running-recipient test, SP2F2 vs SP2F3

**Context:**
- Received after SP2F3 (`39a0446b`, local).
- The owner pasted the block below with no other text; it is treated as the owner's instruction.

**Terms used below:**
- "The supplied tackle reference" means REFERENCE3 (outside Git).
- "SP2F2" = `sp2f/v2/evidence/SP2F2_opts.json` (`44a80d3c`).
- "SP2F3" = `sp2f/v3/evidence/SP2F3_opts.json` (`39a0446b`).

---

PVP-1 — FIRST RUNNING-RECIPIENT TEST: SP2F2 vs SP2F3
I have visually reviewed the current tackle work.
Do not choose between SP2F2 and SP2F3 yet. I see meaningful positives and negatives in both. Preserve both exactly as they currently exist.
I now want to see what each actually does when tackling another footballer.
This is the next milestone.
Objective
Build the first proper two-player test using a running recipient, and compare:
SP2F2 tackler vs running recipient
against
SP2F3 tackler vs the exact same running recipient.
The purpose is NOT yet to tune either tackle.
The purpose is to answer:
What happens when these two current physical tackle candidates actually collide with a moving footballer?

Freeze both tacklers
SP2F2 and SP2F3 must be used unchanged.
Do not:
- improve their arms;
- change torso motion;
- change tuck;
- change entry;
- change motors;
- change joint limits;
- change F37.5;
- change TCF behavior;
- change their speed after observing results.
We need an honest A/B comparison.
Label them clearly:
PVP-F2
PVP-F3
Recipient must be a real running state
Do NOT use the stationary two-foot-loaded C3 fixture as the primary recipient.
Use the actual RUN locomotion system/state as the source.
The recipient should be moving at a normal football running/dribbling speed and should be caught mid-stride, preferably in a one-foot-dominant support condition similar in character to the supplied tackle reference.
At the instant the physical tackle interaction begins, preserve the recipient's actual:
- world velocity;
- COM velocity;
- angular velocity;
- pelvis state;
- trunk state;
- joint positions;
- joint velocities;
- foot contacts;
- per-foot ground loads;
- muscle/actuator state;
- balance-controller state;
- physical momentum.
Do not construct a fake one-legged standing pose.
I want a runner who was genuinely running immediately before being tackled.
No canned recipient reaction
For this first test, do NOT author a tackle reaction.
Do not select:
- stumble animation;
- trip animation;
- fall animation;
- sliced-out animation;
- ragdoll trigger based on tackle severity.
Let the existing physical runner/body/balance system react to the collision.
If it cannot cope, record that honestly.
I specifically want to learn how much of the reference-like reaction emerges from:
running state + one-foot support + tackle geometry + momentum + physical contact
without scripting the outcome.
Contacts must remain authoritative
Neither SP2F2 nor SP2F3 may ghost through the recipient.
Tackler animation/control remains finite.
If the recipient's leg blocks:
- tackling leg yields;
- folded leg yields;
- pelvis/trunk may be disturbed;
- arm support may be disturbed.
Likewise the recipient must receive the real impulses.
Do not preserve either player's intended pose at the expense of collision.
Start with one canonical collision
Do not immediately build a giant test matrix.
First construct one highly reviewable canonical tackle:
- recipient running;
- recipient caught at a representative one-foot-loaded stride phase;
- tackler approaching from a plausible football angle;
- tackle aimed at the ball/near-foot region represented by the reference;
- SP2F2 and SP2F3 starting from exactly the same geometry and velocity.
Freeze that setup before comparing the two tackle candidates.
Run both from identical initial recipient state.
Then add a very small robustness set
Once the canonical case is frozen, add only a few perturbations:
TIMING EARLY
recipient slightly earlier in stride.
TIMING LATE
recipient slightly later in stride.
LIGHT / GLANCING
less central tackle geometry.
STRONG
more direct sweep geometry.
Do not tune F2/F3 separately for any of them.
What I expect may happen
Do NOT force these outcomes, but explicitly look for:
- struck/loaded foot being swept laterally;
- support disappearing beneath the recipient;
- free leg continuing its existing stride;
- pelvis continuing forward from running momentum;
- upper body initially continuing with its pre-contact momentum;
- recipient being “sliced out” when support is removed quickly enough;
- lighter contact being absorbed or producing a recoverable stumble;
- strong contact producing a faster fall;
- tackler continuing through the contact rather than pinning the recipient's feet from above.
Again: these must emerge physically.
Very important: watch for the old pinning failure
PVP-0 failed partly because the tackler landed on/pushed down into the recipient's feet.
Explicitly diagnose whether either F2 or F3:
- pins the struck foot;
- pins the far foot;
- presses downward excessively;
- loses all horizontal momentum into the recipient;
- becomes a barrier the recipient simply falls over;
- actually sweeps through the support as intended.
I want sweep, not crush/pin.
Compare what collision does to F2 vs F3
This is particularly important.
Their single-player differences may matter differently once another body interrupts them.
Measure whether collision disrupts:
- torso organization;
- side-slide orientation;
- folded-leg tuck;
- posting arm;
- hand contact;
- tackling leg;
- pelvis orientation.
Does F2 remain recognizable?
Does F3 remain recognizable?
Does one recover from collision more athletically?
Does one become unnaturally stiff?
Does one transmit the tackle impulse more cleanly?
Recipient response
Measure:
- struck-foot displacement;
- far-foot displacement;
- loss of support;
- foot unloading timing;
- COM velocity before/after contact;
- pelvis translation;
- pelvis rotation;
- trunk rotation;
- recipient fall onset;
- ground-contact sequence;
- whether a recovery is physically possible;
- whether the balance controller meaningfully intervenes before support is lost.
Also report the recipient's exact stride/support state at first contact.
Review page is the priority
Give me synchronized:
REFERENCE | PVP-F2 | PVP-F3
for the canonical case.
I want:
- 1× gameplay/close view;
- 0.25×;
- useful side view;
- rear/front 3/4 where appropriate;
- skeleton/collider diagnostic.
Also provide:
PVP-F2 | PVP-F3
directly side-by-side with identical camera, timing and recipient.
Show from roughly:
0.5 s before first player-player contact → 2 s afterward.
I care enormously about the normal-speed result.
Do not hide ugly results
If:
- recipient explodes;
- recipient barely reacts;
- tackler stops dead;
- legs tangle;
- F2/F3 collapse;
- balance controller behaves badly;
- collision looks ridiculous;
preserve and show it.
Do not fix it before I see the first frozen result.
This is an integration experiment.
Keep the two candidates separate
Do not build an F2/F3 hybrid yet.
I deliberately want both.
Seeing them interact with another player may tell us which parts of each are worth carrying into the eventual tackle.
After the test, identify:
WHAT F2 DOES BETTER
WHAT F3 DOES BETTER
WHAT BOTH GET WRONG
but do not merge them without my review.
Stop condition
Stop after the canonical comparison and small robustness set are rendered and measured.
Do not:
- tune either tackle;
- calibrate friction;
- build a canned recipient reaction;
- merge F2/F3;
- integrate into production simulation.
Finish with:
RUNNING RECIPIENT STATE VALID: YES / NO
F2 CONTACT PHYSICS PLAUSIBLE: YES / PARTIAL / NO
F3 CONTACT PHYSICS PLAUSIBLE: YES / PARTIAL / NO
F2 REMAINS RECOGNIZABLE AFTER CONTACT: YES / PARTIAL / NO
F3 REMAINS RECOGNIZABLE AFTER CONTACT: YES / PARTIAL / NO
RECIPIENT RESPONSE EMERGES WITHOUT SCRIPTING: YES / PARTIAL / NO
SLICED-OUT RESPONSE OBSERVED: YES / NO
LIGHTER RECOVERABLE RESPONSE OBSERVED: YES / NO
FOOT PINNING PRESENT: F2 / F3 / BOTH / NEITHER
READY TO CHOOSE OR HYBRIDIZE F2/F3: WAIT FOR OWNER VISUAL REVIEW
The point of this milestone is simple:
Stop judging these tackles only against empty turf. Put both current candidates into the same real football collision with a genuinely running player and let us see what their differences actually mean.
