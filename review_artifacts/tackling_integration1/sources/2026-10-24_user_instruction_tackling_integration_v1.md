# Owner instruction — TOUCHLINE — TACKLING INTEGRATION V1 (overnight run; received 24 Oct 2026 ≈ 06:10 EEST), verbatim

Saved verbatim (the standing rule: owner instructions under review_artifacts/<milestone>/sources/). Nothing below this line is edited.

---

We are going to use this as an OVERNIGHT development run.

The current published Touchline gameplay milestone and its approved/provisional movements must remain protected.

I want you to begin the next major gameplay system:

# TOUCHLINE — TACKLING INTEGRATION V1

The goal tonight is NOT simply to copy old tackle code into the current build.

The goal is to establish a clean, canonical defensive-action lifecycle that works with the CURRENT Touchline gameplay foundation:

```text
locomotion
carry / possession
Body Feint
La Croqueta LEG-WAVE V4
current gait/support system
current ball/contact model
current player body
```

and integrates the best existing tackling work without regressing any of those systems.

This is an overnight task. Work autonomously through the investigation, integration, testing and review-package stages.

Do not stop merely because you encounter a design choice that can be resolved conservatively and reversibly.

Do stop for a genuine architectural blocker, destructive ambiguity, or anything that would require rewriting approved gameplay.

---

# 0. PROTECT CURRENT WORK FIRST

Before developing anything:

- identify the authoritative FC-Simulator repository;
- fetch/check current remote state;
- identify the current published gameplay milestone;
- identify the Body Feint + Croqueta integration milestone;
- identify the current left-stick research branch/worktree;
- verify their SHAs;
- verify clean/dirty status;
- create a recovery checkpoint if appropriate.

Do NOT develop tackling inside:

```text
prototype/left-stick-intent-v1
```

That branch is instrumentation/research and should remain isolated.

Do NOT modify the owner-input recordings or Intent Recognizer research.

Create a dedicated tackling integration branch/worktree from the correct current gameplay milestone.

Use a clear name such as:

```text
prototype/tackling-integration-v1
```

unless repository conventions indicate a better existing name.

Do not touch main.

Do not rewrite history.

---

# 1. FIND ALL EXISTING TACKLING WORK

Before implementing anything new, audit the repository and relevant branches/worktrees for existing tackle development.

Search for:

```text
standing tackle
slide tackle
tackle
defensive approach
defensive contact
ball winning
collision
possession transfer
recovery
control return
tackle lifecycle
```

Also inspect branches, tags, milestone documentation, handoffs and review artifacts.

I know we have previously worked on tackling.

Find the strongest/latest implementations rather than assuming the currently visible file is authoritative.

Produce a tackling lineage:

```text
version / branch
commit
what it implemented
what was visually reviewed
what was mechanically tested
known problems
what superseded it
```

Do not discard useful previous work.

---

# 2. ESTABLISH THE CURRENT TACKLING BASELINE

Determine exactly what the CURRENT gameplay build does when a defender attempts to tackle.

Document whether the current canonical system already has:

```text
tackle request
eligibility
approach
commitment
body pose
foot contact
ball collision
possession contest
miss
recovery
control return
```

For every component classify:

```text
CURRENT
EXISTING BUT NOT INTEGRATED
PROVISIONAL
HISTORICAL
MISSING
```

Do not silently assume an old tackle implementation is current.

---

# 3. CHOOSE THE BEST EXISTING TACKLE FOUNDATION

If multiple tackling implementations exist, compare them.

Prefer the implementation with the strongest combination of:

```text
visual quality
physical continuity
ball/contact integrity
determinism
current-body compatibility
current-gait compatibility
recovery quality
test evidence
```

Do NOT choose based simply on newest commit date.

If an existing reviewed tackle can be reused substantially unchanged, do so.

Do not redesign good work unnecessarily.

---

# 4. START WITH STANDING TACKLE

Standing tackle is the first canonical defensive action.

Do NOT attempt to finish every defensive mechanic tonight.

The primary target is:

# STANDING TACKLE V1 — INTEGRATED LIFECYCLE

Conceptually:

```text
ordinary defensive movement
→ tackle intent/request
→ eligibility
→ approach / final adjustment
→ commitment
→ tackle contact window
→ outcome
→ recovery
→ control return
```

It must be one continuous body action.

---

# 5. REQUEST VS EXECUTION

Keep these concepts separate:

```text
USER REQUEST
```

and:

```text
PHYSICAL EXECUTION OPPORTUNITY
```

The defender may request a tackle before the exact support/contact configuration is available.

Do not teleport the feet to satisfy the request.

Where appropriate, use the same architectural principle we're developing elsewhere:

```text
request
→ short-lived pending action
→ earliest valid physical opportunity
→ commitment
```

Do NOT connect this to the unfinished left-stick recognizer.

Tackling may use an explicit diagnostic request/button for now.

---

# 6. COMMITMENT

Define a clear commitment point.

Before commitment, the player may still be able to cancel or continue ordinary defensive movement.

After commitment:

```text
the tackle owns the body
```

until an appropriate recovery/control-return state.

Do not allow ordinary gait to overwrite the tackle halfway through.

Document:

```text
request time
commit time
contact window
recovery start
control ready
```

---

# 7. WHOLE-BODY TACKLE

The standing tackle cannot be merely:

```text
foot reaches toward ball
```

The whole athlete must participate.

Audit/use:

```text
support foot
tackling foot
knees
hips
pelvis
centre of mass
torso
shoulders
arms
head
```

The body should read correctly even with the ball hidden.

If the existing tackling body already meets this standard, preserve it.

If it clearly fails, improve it only within the tackling branch and document the change.

---

# 8. BALL CONTACT

A successful tackle must be based on real geometric/contact conditions.

Do NOT make:

```text
tackle button
=
automatic possession transfer
```

Audit:

```text
tackling-foot surface
ball distance
relative velocity
contact timing
ball trajectory after contact
```

Use the existing canonical ball/contact architecture wherever possible.

A tackle may:

```text
win cleanly
poke ball loose
deflect ball
fail to reach
miss
```

depending on actual contact.

Do not invent defender ratings yet.

---

# 9. POSSESSION

Tackling and possession must be separate.

A defender touching the ball does not necessarily mean:

```text
instant CONTROLLED possession
```

Support outcomes such as:

```text
controlled win
loose ball
deflection
opponent retains
miss
```

using the current possession model rather than a tackle-specific shortcut.

Document exactly how possession ownership changes.

---

# 10. ATTACKER INTERACTION

Use the current attacking player/body where possible.

Test the standing tackle against at least:

```text
ordinary carry

gentle steering

sharp cut

Body Feint

La Croqueta
```

This does NOT mean inventing AI defenders or automatically countering skills.

Use deterministic scripted/replay encounters.

The important question is:

> Can both players' existing systems coexist during a real tackle interaction?

---

# 11. BODY FEINT / CROQUETA MUST NOT BE NERFED

Do not alter either attacking move to make tackling easier.

The defender must interact with the approved movement as it exists.

If Body Feint successfully causes the defender's committed tackle to miss, that is potentially correct.

If Croqueta carries the ball outside the tackle contact window, that may also be correct.

Do not script outcomes.

Let geometry/timing determine them.

---

# 12. MISS BEHAVIOUR

A missed tackle must have a real cost.

Do not instantly return the defender to perfect locomotion.

The body should complete a believable:

```text
reach
→ miss
→ momentum continuation
→ recovery
→ control return
```

But avoid excessively canned punishment.

Measure the actual recovery duration.

---

# 13. SUCCESSFUL-TACKLE RECOVERY

A clean tackle also needs continuation.

After ball contact:

```text
contact
→ body continues
→ support reorganizes
→ possession state resolves
→ next useful movement becomes available
```

Do not snap into ordinary gait immediately after contact.

---

# 14. MIRRORING

Standing tackle must work from both sides.

Test:

```text
left-foot tackle
right-foot tackle
```

where physically appropriate.

Do not assume simple mirroring if the canonical technical/support-foot system requires different entry states.

---

# 15. SPEED ENVELOPES

Audit at least:

```text
walk
jog
run
```

Do not automatically allow every tackle from every speed.

Determine what the existing implementation supports cleanly.

If sprint tackling is not ready, explicitly decline it rather than inventing an unstable version.

---

# 16. ENTRY ANGLES

Test useful relative approach angles between defender and attacker.

At minimum:

```text
roughly head-on
slightly left
slightly right
side-biased approach
```

Do not attempt impossible rear tackles just to increase coverage.

Document the validated envelope.

---

# 17. COLLISION / BODY INTERACTION

Audit whether the current engine supports meaningful player-player body collision.

Do NOT build a giant new physics system tonight.

If body collision exists, use it carefully.

If it does not, keep V1 focused on:

```text
tackling body
ball contact
possession outcome
```

and document player-player collision as a future system.

Do not fake complex shoulder/contact physics inside the tackle animation.

---

# 18. NO DEFENDER AI YET

Do NOT build:

```text
defensive AI
auto tackle
auto positioning
defensive ratings
anticipation
reaction attributes
```

tonight.

Use deterministic fixtures/manual explicit requests.

This task is about the action lifecycle.

---

# 19. SLIDE TACKLE

After standing tackle is integrated and fully tested:

Audit the best existing slide-tackle work.

If a strong implementation already exists and can be integrated safely, begin a separate:

```text
SLIDE TACKLE V1
```

integration section.

But standing tackle takes priority.

Do NOT compromise standing-tackle verification to claim both are finished.

If slide tackle requires substantial redesign, prepare its handoff/review package and stop there rather than rushing it.

---

# 20. BUILD A TACKLING LAB

Create:

# TOUCHLINE — TACKLING LAB V1

I want deterministic review cases.

For standing tackle include:

```text
clean win
poke loose
miss left
miss right
late request / decline
attacker sharp cut
attacker Body Feint
attacker Croqueta
mirror tackle
```

where the current systems make those outcomes possible.

Do not force outcomes merely to populate the list.

---

# 21. REVIEW CONTROLS

Provide:

```text
PLAY
REPLAY
1×
0.5×
0.25×
frame step
loop
ball shown / hidden
body only
skeleton
```

Cameras:

```text
GAMEPLAY
FRONT
REAR
SIDE LEFT
SIDE RIGHT
3/4 FRONT
3/4 REAR
OVERHEAD
```

For two-player cases make sure both players remain readable.

---

# 22. DIAGNOSTICS

For each tackle replay expose:

```text
request
eligibility result
commit
support foot
tackling foot
stride phase
ball distance
contact
contact surface
ball velocity before/after
possession before/after
recovery
control ready
```

For misses explain why no ball contact occurred.

---

# 23. BODY-ONLY REVIEW

Hide the ball.

The tackle should still read as:

```text
approach
→ commit
→ reach/challenge
→ momentum continuation
→ recovery
```

rather than a leg animation underneath an ordinary running torso.

---

# 24. REGRESSION

Run the existing milestone regression suites.

Protect at minimum:

```text
ordinary locomotion
carry
Body Feint
Croqueta LEG-WAVE V4
possession
ball contact
determinism
existing curated vocabulary
```

No tackle integration is acceptable if it silently changes those systems outside a tackle request.

Also verify the left-stick research milestone remains untouched.

---

# 25. TORTURE TESTS

Create deterministic tackle-specific torture tests.

Include repeated:

```text
valid requests
invalid requests
requests near stride boundaries
misses
successful contacts
rapid repeated requests
mirrors
```

Look for:

```text
foot teleporting
leg crossing
plant sliding
knee pops
body spikes
duplicate ball contacts
duplicate possession changes
stuck commitment
failure to return control
```

---

# 26. PERFORMANCE

Measure incremental CPU cost with tackling idle.

When no tackle is requested:

```text
tackling integration should add effectively no meaningful simulation cost.
```

Report active-action cost separately.

Do not optimize prematurely unless there is an obvious regression.

---

# 27. SOURCE OF TRUTH

Create/update an isolated tackling handoff containing:

```text
branch
commit
base milestone
source files
entry points
validated envelope
decline policy
contact model
possession outcomes
known limitations
tests
review page
```

Do NOT declare tackling frozen.

Status should be:

```text
PROVISIONAL
```

until I visually review it.

---

# 28. COMMITS

Commit coherent milestones locally as you work.

Examples:

```text
audit / instruction
standing tackle integration
tackle lab
verification / handoff
```

Run the project's lock/check rules before commits.

Do not push unless existing publication rules explicitly require it and permissions allow it.

Do not merge to main.

---

# 29. OVERNIGHT AUTONOMY

Do not stop for minor questions.

When there are several safe reversible choices:

- choose the most conservative;
- preserve existing canonical behaviour;
- document the choice;
- continue.

If a proposed change would alter approved Body Feint, Croqueta, locomotion, ball physics or possession globally:

# DO NOT MAKE IT.

Isolate the problem and continue with work that does not require that change.

Use the night for:

```text
research
integration
instrumentation
deterministic fixtures
regression
torture testing
review evidence
documentation
```

rather than speculative rewrites.

---

# FINAL MORNING DELIVERABLE

Return:

# TOUCHLINE — TACKLING INTEGRATION V1

with:

## VERIFIED BASE

Exact milestone/branch/SHA.

## TACKLING LINEAGE

What previous tackling work existed and which foundation you selected.

## STANDING TACKLE V1

Lifecycle and implementation.

## VALIDATED ENVELOPE

Speeds, sides, angles and physical states known to work.

## CONTACT / POSSESSION

How successful tackles, loose balls and misses resolve.

## ATTACKER INTERACTION

Results against carry, cuts, Body Feint and Croqueta.

## RECOVERY

Successful and missed-tackle recovery/control-return behaviour.

## SLIDE TACKLE STATUS

Integrated if genuinely ready; otherwise audited/prepared separately.

## REGRESSION

Exact results.

## TORTURE TESTS

Exact results and remaining defects.

## PERFORMANCE

Idle and active cost.

## KNOWN LIMITATIONS

No hiding them.

## PLAYABLE

Give me the local:

# TOUCHLINE — TACKLING LAB V1

for visual review.

## COMMITS

List all local commits and current branch/worktree status.

Then STOP.

Do not freeze tackling.

Do not merge to main.

# CENTRAL TARGET

> Build tackling as a real canonical football action lifecycle on top of the current Touchline foundation: request → physical opportunity → commitment → geometric ball interaction → possession outcome → momentum-consistent recovery → control return. Preserve the approved attacking vocabulary exactly. A tackle must coexist with Body Feint and Croqueta rather than forcing them to accommodate it.
