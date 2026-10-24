<!-- The owner's instruction, verbatim, as given on 24 Oct 2026 (~19:40 EEST), after PLAYER OCCUPANCY V1 (Stage 1, fb35347d) was presented. -->

Continue from **PLAYER OCCUPANCY V1**, but do NOT integrate/freeze/publish it yet.

# PLAYER OCCUPANCY — STAGE 2: COMMITTED-ACTION CONTACT RESOLUTION

Stage 1 is a successful architectural foundation.

Keep its core principles:

- one real occupancy representation for each footballer;
- bodies cannot simply phase through each other;
- ball access through an opponent's body is blocked;
- planted feet matter;
- approved Body Feint, Croqueta LEG-WAVE V4 and Standing Tackle motions remain authoritative;
- shared possession + Reaction MEDIUM remain unchanged;
- no strength/impact/foul model yet.

But Stage 1 exposes a major unresolved problem:

> **Root correction is currently fighting committed animation/support geometry.**

The clearest symptom is the reported committed-action foot discrepancy of up to **52 cm**.

That is unacceptable.

Do NOT hide this with stronger smoothing.

Do NOT tune tackle outcomes yet.

Solve committed-body coexistence first.

---

# 1. PRIMARY GOAL

When two footballers physically meet, they should:

**make contact**
→ **occupy space**
→ **yield/redirect around each other where possible**
→ **preserve believable support**
→ **continue their authored action**

without:

- passing through each other;
- teleporting roots;
- sliding planted feet;
- stretching the body away from its feet;
- cancelling approved moves arbitrarily;
- producing large visible jolts.

This is still an **occupancy/contact solver**, NOT yet an impact-response system.

---

# 2. FIX THE ROOT-vs-FOOT PROBLEM FIRST

Stage 1 currently moves player/root positions and future footholds while leaving joint animation unchanged.

That works for simple movement but fails badly when an action has a committed planted foot.

A committed action cannot be treated as:

> animation pose + freely movable root

when the pose contains a meaningful world-space support constraint.

For every player, explicitly determine the current support state:

**FREE LOCOMOTION**

**SINGLE SUPPORT**

**DOUBLE SUPPORT**

**COMMITTED PLANT**

**AIRBORNE**

and solve occupancy accordingly.

---

# 3. COMMITTED PLANT IS A REAL CONSTRAINT

For:

- Body Feint;
- Croqueta;
- Standing Tackle;
- future shooting actions;

a genuinely planted foot should act as a world-space constraint while that plant exists.

The collision solver must respect it.

Do not move the root 20 cm and then leave the planted foot's animation behind.

Instead solve the body's allowable displacement/rotation **around its support geometry**.

Think:

> planted foot anchors the chain; pelvis/body has a limited reachable region around it.

Not:

> move root first, reconcile legs afterward.

---

# 4. SUPPORT-CONSTRAINED BODY CORRECTION

For a player with a planted support foot:

prefer, in order:

1. allowable pelvis/root translation inside the planted leg's reach;
2. small pelvis yaw/rotation around the support;
3. anatomically plausible hip/knee/ankle adjustment;
4. torso lean/compliance;
5. redistribution to the OTHER player;

before allowing meaningful plant movement.

The plant itself should remain fixed unless the authored action already releases it.

Do not create new plant slides.

---

# 5. DO NOT EDIT THE APPROVED MOTION'S IDENTITY

Important distinction:

The collision system MAY alter the player's **world placement / constrained body accommodation**.

It must NOT rewrite the authored action.

Body Feint must remain recognizably the approved Body Feint.

Croqueta must remain LEG-WAVE V4.

Standing Tackle must remain Standing Tackle V1.

Preserve their:

- phase;
- relative joint motion;
- technical-foot sequence;
- ball-touch intent;
- support transitions;
- release timing;

as far as physically possible.

Occupancy is environmental constraint resolution around the motion—not a replacement animation.

---

# 6. BOTH COMMITTED — DO NOT JUST SPLIT THE ERROR

Stage 1 reports up to **23 cm** overlap when both actions are committed.

Do not solve this by simply giving each player an arbitrary half of the displacement.

Use their actual support and momentum state.

For each player evaluate:

- planted feet;
- number of supports;
- approach velocity;
- movement direction;
- body contact normal;
- action phase;
- remaining anatomical accommodation;
- whether the action has already committed;
- whether the player is airborne.

Then find the smallest physically plausible pair correction.

---

# 7. NO STRENGTH MODEL YET

Do NOT introduce:

- player strength;
- balance ratings;
- tackle ratings;
- mass advantages;
- canned winner/loser logic.

We are not yet deciding who wins an impact.

For now use only geometric/kinematic facts:

- momentum direction;
- support state;
- available displacement;
- contact normal;
- anatomical reach;
- action commitment.

A strength/impact system comes later.

---

# 8. FIX THE VISIBLE JOLTS

Stage 1 reports:

- 323 frames with root jolts over 1 cm;
- largest roughly 12–15 cm/frame²;
- walking into committed tackle: 13.3 cm;
- fast swinging limbs head-on: 13.5 cm.

These are too visible.

But do NOT simply low-pass filter the correction.

Your own Stage 1 study found that generic smoothing increases penetration.

Instead make correction **predictive and support-aware**.

---

# 9. USE SHORT LOOK-AHEAD

Test the proposed **2-tick look-ahead**.

The purpose is NOT to predict gameplay decisions.

It is only to see:

> these two occupied volumes are about to violate each other if both continue their already-known current motion.

Begin allocating the necessary displacement slightly before deep penetration occurs.

Compare:

**CURRENT / reactive**

vs

**1-TICK**

vs

**2-TICK**

look-ahead.

Measure:

- penetration;
- root jerk;
- support error;
- action distortion.

Do not choose 2-tick automatically. Let the evidence decide.

---

# 10. CONTACT SHOULD BEGIN AS A SOFT CONSTRAINT

Before penetration becomes severe, begin resisting relative movement along the contact normal.

Preserve tangential motion wherever possible.

This is extremely important.

If two players meet shoulder-to-shoulder, they should still be able to move **alongside** each other.

The solver should primarily remove the component of relative motion that pushes:

**INTO** the other body.

Do not unnecessarily kill motion:

**ALONG** the other body.

This should naturally produce sliding/deflection around opponents rather than stopping both players.

---

# 11. THINK NORMAL/TANGENT

At every meaningful body contact derive:

**CONTACT NORMAL**

and

**CONTACT TANGENT**

Resolve penetration/approach mainly on the normal.

Preserve tangential velocity/movement where physically possible.

This is the foundation we will later use for:

- shoulder challenges;
- shielding;
- glancing tackles;
- running contact;
- jostling.

Do not implement those systems yet.

Just make the occupancy response compatible with them.

---

# 12. BODY REGIONS MATTER

Do not treat every capsule collision identically.

At minimum distinguish:

**TORSO/PELVIS ↔ TORSO/PELVIS**

**TORSO ↔ LEG**

**LEG ↔ LEG**

**FOOT ↔ BODY**

**ARM ↔ BODY**

Feet and arms can remain primarily detection volumes where appropriate.

The main occupancy solution should be driven by the player's substantial body/support structure, not a hand brushing a shoulder.

---

# 13. FAST SWINGING LIMBS

Stage 1 identifies head-on fast swinging limbs as a weakness.

Do NOT push the entire footballer's root violently because a fast shin briefly intersects another leg.

For transient limb contacts distinguish:

**core-body occupancy conflict**

from:

**fast articulated limb contact.**

For now, fast limb contact should prevent impossible deep penetration but should not create a huge whole-body root correction.

Later impact physics can decide what that collision actually does.

---

# 14. BALL ACCESS

Keep Stage 1's successful principle:

> you cannot play the ball through another player's body.

But investigate the remaining one-tick ball-access delay.

Ball access should be evaluated using the same current/predictive occupancy information as player contact.

Do NOT allow:

`body blocks path on tick N`
but
`boot wins ball through body because gate notices on N+1`.

Remove that timing inconsistency if it can be done without introducing future information.

---

# 15. COMMITMENT VS BALL ACCESS

For this stage:

**physical impossibility beats animation commitment.**

Meaning:

A committed action does NOT grant permission for a foot to pass through another player's torso to reach the ball.

But do not cancel the whole committed animation simply because its intended contact became blocked.

Instead:

- ball access is denied;
- action continues/reconciles physically;
- outcome is determined from what actually happened.

This is important for future tackles and shots.

---

# 16. BODY FEINT

Stress-test specifically:

**Body Feint vs standing defender**

**Body Feint past recovering tackle**

**Body Feint into committed tackle**

The approved Body Feint trajectory must remain unchanged until physical occupancy actually requires accommodation.

Once contact occurs:

- preserve its fake/exit identity;
- preserve support;
- resolve body occupancy;
- do not produce 52 cm foot reconciliation.

Show exactly where world placement begins differing from the untouched reference.

---

# 17. CROQUETA

Stress-test:

**Croqueta past standing defender**

**Croqueta into committed tackle**

The leg-wave must remain intact.

The Croqueta should be able to carry the body/ball around a defender if there is physical space.

It should NOT:

- phase through;
- have the ball touched through a torso;
- terminate merely because Stage 1 moved the root badly.

If the defender genuinely occupies the Croqueta's route, show the physical conflict honestly.

---

# 18. STANDING TACKLE

Keep Standing Tackle's authored motion unchanged.

The tackler's reaching leg must not gain supernatural authority over occupancy.

A tackle can be physically blocked.

The tackler can also make legitimate boot-to-ball contact around the opponent.

Distinguish:

**boot reaches ball around body**

from

**boot reaches ball through body.**

---

# 19. TEST ORDINARY LOCOMOTION TOO

Do not optimize only around special moves.

Test:

- walk into standing player;
- jog into standing player;
- head-on jog;
- side-by-side jog;
- crossing paths;
- player overtaking player;
- two players turning into each other;
- one stationary, one moving;
- both moving;
- glancing contact;
- near miss.

The solution must become general player occupancy infrastructure.

---

# 20. METRICS

For OLD / STAGE 1 / STAGE 2 report:

### Penetration
- median;
- p95;
- p99;
- max;

for:

- torso/pelvis;
- legs;
- feet;
- arms.

### Continuity
- root displacement/frame;
- root acceleration/jerk;
- pelvis displacement;
- largest correction;
- correction reversals.

### Support
- planted-foot drift;
- body-to-support discrepancy;
- support-chain stretch;
- number of forced plant releases.

### Motion preservation
For Body Feint / Croqueta / Standing Tackle:

- exact-match ticks before contact;
- deviations after physical contact;
- maximum local joint difference;
- phase/timing differences.

---

# 21. THE 52 CM ERROR MUST DISAPPEAR

Create a dedicated metric:

# SUPPORT CONSISTENCY ERROR

Measure distance between:

**where the authored planted/support foot should be in world space**

and

**where the resolved body/root implies that support chain should be.**

For genuinely planted support:

target essentially zero world drift.

There should never again be a hidden 52 cm reconciliation.

If the system cannot resolve a collision without violating support, classify it explicitly as:

**UNRESOLVED COMMITTED CONFLICT**

rather than silently deforming the player.

---

# 22. DO NOT FORCE EVERY CONFLICT TO ZERO PENETRATION

A small soft-body/contact tolerance is reasonable.

Stage 1 currently uses roughly:

- 2 cm contact tolerance;
- 5 cm hard impossibility threshold.

Test these rather than assuming they are final.

The objective is not mathematically zero overlap.

The objective is:

> visually believable physical contact with no body phasing.

Compare a few tolerance candidates if useful.

---

# 23. 18 CM LEAN BUDGET IS PROVISIONAL

Do not automatically keep the Stage 1 **18 cm body lean allowance**.

Test whether that produces believable posture.

Compare approximately:

**LOW**

**CURRENT**

**HIGH**

allowance if useful.

Judge:

- penetration;
- support stretch;
- visible body distortion;
- root correction.

Do not optimize a number in isolation.

---

# 24. REVIEW LAB

Build:

# TOUCHLINE — PLAYER OCCUPANCY STAGE 2 REVIEW

Keep OLD and STAGE 1.

Add STAGE 2.

I want synchronized:

**OLD | STAGE 1 | STAGE 2**

for identical inputs.

Include:

- 1×;
- 0.5×;
- 0.25×;
- frame step;
- loop;
- eight cameras;
- skin;
- skeleton;
- skin+skeleton;
- occupancy capsules;
- contact normals;
- support anchors;
- root correction vector;
- ball-access path;
- current support state.

---

# 25. MAKE CONFLICTS EASY TO SEE

For every frame show:

**CONTACT REGIONS**

**PENETRATION DEPTH**

**NORMAL**

**TANGENTIAL RELATIVE MOTION**

**ROOT CORRECTION**

**SUPPORT ERROR**

**ACTION COMMITMENT**

**BALL ACCESS: CLEAR / BLOCKED**

This needs to be debuggable visually.

---

# 26. DO NOT START IMPACT RESPONSE

Hard boundary:

Do NOT yet implement:

- shoulder barges;
- balance loss;
- stumbling;
- knockback;
- tackle force;
- player strength;
- fouls;
- falls;
- tackle outcome tuning;
- slide tackle.

Those are Stage 3.

Stage 2 exists to give those systems a trustworthy physical-contact foundation.

---

# 27. ACCEPTANCE TARGET

I want Stage 2 to establish:

> Two footballers can occupy the same football world, meet physically, and continue moving without passing through one another or destroying their authored support/motion.

Specifically:

- no deep torso phasing;
- no through-body ball wins;
- planted feet remain coherent;
- committed actions retain their identity;
- substantially reduced visible root jolts;
- no huge hidden foot reconciliation;
- glancing movement remains possible;
- deterministic;
- single-player behavior unchanged.

---

# 28. STOP FOR REVIEW

Do not integrate.

Do not freeze.

Do not publish.

Do not begin impact physics.

Return:

1. Stage 1 diagnosis;
2. Stage 2 architecture;
3. OLD vs Stage 1 vs Stage 2 measurements;
4. committed-action conflict study;
5. support-consistency study;
6. look-ahead comparison;
7. tolerance/lean comparison;
8. ball-access audit;
9. performance;
10. regression;
11. remaining limitations.

Then STOP for my visual review.

# CENTRAL PRINCIPLE

> **Stage 1 proved that footballers can have physical occupancy. Stage 2 must make that occupancy compatible with real football animation. Do not solve collisions by dragging an animated body away from its planted feet. Resolve contact through support-aware body placement, normal/tangential separation and short predictive correction, while preserving the identity of committed actions. Only after this works should we add actual impact, strength, balance and tackle consequences.**
