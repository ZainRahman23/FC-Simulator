# RECEIVE-KILL-1.1 animation contract — the control episode

This adds to the first-contact contract, `review_artifacts/receive_kill1/RECEIVE_KILL1_ANIMATION_CONTRACT.md`. That contract still holds for every first control: FOOT_KILL, THIGH_KILL, CHEST_KILL and HEAD_CUSHION. Here are the rules for the whole **control episode**: first control → the ball drops or rolls → adjustment → follow-up foot control → stable control.

**Placeholder:** `sandbox/visual/receive_kill11/rk_body.js`. It is presentation only: the body is not in the ball's world, and animation on vs off gives identical outcomes (`rk11_determinism.json`, 14/14).

**Status:** calibration values, not locked.

## Rules for the episode

1. **Every contact is authoritative.**
   - Each contact of the episode is one kernel `schedule()` with its own CONTACT tick and its own 6 cm contact window.
   - The simulation plans a follow-up from the real post-contact ball (a kernel prediction of the actual state), never from the intended one.
   - Between and after the contacts the ball is a free rigid body. It is never held or attached.
2. **The simulation decides each contact's** surface, side, CONTACT tick, contact point and adjustment step. The clip shows them: it must put the named surface on the ball at each CONTACT tick, and move the player's stance to the planned position before the follow-up.
3. **Ball Control never changes timing.** The same ball gets the same first control at every rating. The follow-up's timing and step differ only because the actual ball differs: a less ideal drop means a different landing, a bigger step and possibly an extra touch. Ball Control never makes the leg faster or slower (that will be Dribbling or Agility later).
4. **Fluid sequences.** The follow-up's preparation overlaps the first action's unwinding. The clip must blend them, not play two separate actions back to back:
   - the leg prepares while the chest cushions;
   - a thigh control's own leg comes down into the foot control.

## When the body is free for a follow-up

The follow-up's preparation may start this long after a contact:

| First contact | Free after | Why |
|---|---|---|
| FOOT | 0.15 s | the kicking foot returns |
| THIGH | 0.20 s | the same leg comes down |
| CHEST | 0.12 s | the legs are free during the chest cushion |
| HEAD | 0.20 s, +0.15 s after a jump | landing |

The earliest follow-up CONTACT is free time + max(0.22 s foot preparation, 0.12 s reaction + adjustment / 3.0 m/s).

## FOLLOW-UP FOOT CONTROL

The follow-up uses the four foot surfaces of the first-contact contract. Their heights, contact poses and ideals are unchanged, with these differences:

| Item | Follow-up |
|---|---|
| Typical surface | **SOLE** on the landing of a dropping ball (chest, thigh and most headers); **INSTEP** cushion of a dropping ball; **INSIDE** of a rolling or bouncing ball (a recovery touch after a heavy foot kill) |
| Arrival bearing | Not a constraint: the recovering player turns as he adjusts. A ball moving away is harder (the difficulty's bearing term). |
| Descent | SOLE and INSTEP accept a vertical drop. INSIDE takes balls up to a 50° descent. |
| Adjustment (step) | From the previous stance to the follow-up stance: up to 4.0 m at 3.0 m/s, after a 0.12 s reaction. The clip plays it as a shuffle or steps, leading foot first, finishing 0.10 s before the CONTACT. |
| Ideal result | The surface's own: ball dead under the sole; ball put down at the foot; ball rolled to the settle point 0.40 m ahead. |
| Selection | Cost J = D + 0.8·adjustment + 1.0·(wait + expected settling) + preference. Expected settling is the time a ball put down from that height needs to stop bouncing. A sole trap on the landing therefore beats waiting for the top of a bounce. |
| Recovery touch | If the follow-up (or a foot kill) leaves a ball that will not settle within reach, a second follow-up is planned. An episode has at most 3 contacts. |

## Stable control (the end of the episode, for measurement)

This is a diagnostic only. It is never a possession switch and never attaches the ball. All of these must hold for 0.10 s:
- the ball centre is at most 0.21 m high, and |vz| ≤ 0.8 m/s (any remaining hops are under ~3 cm);
- the ball's speed is ≤ 0.8 m/s;
- the ball is inside the player's usable zone (forward −0.20 … 0.70 m, side ≤ 0.55 m, within 0.72 m of his stance);
- the player is settled: no action or adjustment in progress (each contact's preparation through 0.22 s after it).

The clip should end the episode in a ready stance with the playing foot near the ball.

## Continuation (what the episode leaves possible)

Every class is measured against the IDEAL episode: the same ball executed perfectly. A header's ideal already includes a step forward, so "extra" means beyond what perfect execution needed.

| Class | Definition | What the clip should convey |
|---|---|---|
| IMMEDIATE | The natural number of contacts (foot 1, aerial 2), extra adjustment ≤ 0.25 m, at most 0.25 s later than the ideal | One fluid sequence |
| ADJUSTED | The natural contacts, extra adjustment ≤ 1.0 m | A visible step to the ball, a later continuation |
| RECOVERY | An extra touch, or extra adjustment > 1.0 m | Chasing or re-controlling the ball |
| UNSTABLE | No stable control within reach (4 m) during the episode | A loose, contestable ball |
