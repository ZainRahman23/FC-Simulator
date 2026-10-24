# TOUCHLINE — TACKLING INTEGRATION V1 · STANDING TACKLE V1 — report (24 Oct 2026)

**Status: PROVISIONAL**: built, tested, awaiting the owner's visual review. Not frozen, not merged, not pushed.
- The owner's instruction (verbatim): `sources/`.
- The lineage and the choice of foundation: `TACKLING_AUDIT.md`.
- How to run it and the source of truth: `HANDOFF.md`.
- The slide tackle: `SLIDE_TACKLE_AUDIT.md`.

## 1. The verified base

- **The base:** `prototype/tackling-integration-v1`, cut from `milestone/feint-croqueta-vocab-v1` = tag `checkpoint/touchline-feint-croqueta-vocab-v1-2026-10-24` = **`f775daac`**. That is the current published gameplay: `sandbox/visual/vocab2/`, with the Body Feint and La Croqueta LEG-WAVE V4 integrated.
- **The remote** (`fc-simulator`, checked again at the end) is unchanged:

  | ref | SHA |
  |---|---|
  | `main` | `ff3a89fe` |
  | the milestone | `f775daac` |
  | `integration/touchline-gameplay-1` | `dea3abdb` |
  | `prototype/left-stick-intent-v1` | `6ccd9f9a` (pushed in this morning's daily publication; untouched since; its worktree clean) |

- **No canonical file changed.** The work adds only `sandbox/visual/tackle1/`, `sandbox/visual/tackle1_lab.html` and `review_artifacts/tackling_integration1/`.

## 2. The foundation chosen (from the audit)

**The body:**
- Codex's **Phase C revision 2** (`STANDING_POKE` / `STANDING_LUNGE`, continuous commitment by reach), the only standing-tackle body recorded as approved.
- It is re-expressed in the canonical plan format and drawn by the canonical `PlayBody`.

**The lifecycle principles:** Codex's STANDING-TACKLE-V1.
- The defender reads the ball's actual state and predicts its free roll, never the dribbler's plan.
- The nearest feasible foot, inside the forward sector and the reach envelope.
- Recovery is not decided by the result.

**The contact:** the canonical opponent law in `vocab2/c_sim.js` (`opponentStep`), unchanged.

**The possession:** the canonical possession model, unchanged.

**Not used:**
- Codex's own physical duel world (its own carrier, ≈ 1 s contact search, a new collision system);
- the match harness's Defending V1 (a rating roll that places the ball at the winner's feet);
- the Jolt slide lines.

## 3. STANDING TACKLE V1 — the lifecycle and its implementation

```
ordinary defensive movement (the canonical footballer, ball off: A99-C + the support plan, the defender's scripted stick)
→ REQUEST (explicit: the Lab's button / a fixture's tick — never the left-stick recognizer)
→ PENDING ≤ 0.35 s: every tick, the earliest PHYSICAL OPPORTUNITY is searched
→ COMMITMENT: the tackle owns the body (the defender's ordinary re-planning is held off)
→ SET · LOAD · DRIVE + REACH → the CONTACT WINDOW (the boot presented to the canonical opponent law)
→ OUTCOME (the canonical possession model; the race for the ball)
→ FOLLOW-THROUGH / CATCH · RECOVERY STEP · REGAIN STANCE → CONTROL READY (the ordinary gait re-plans from the stances the tackle left)
```

### The world

`t_world.js` holds two footballers and one authoritative ball.
- **The attacker** is the current gameplay player, exactly: vocab2 `ControlledSim`, with the sandbox's settings (S99 · D38 · A99-C · D99 · BC99 · CARRY-B · CONTROLLED · EXPANDED · FULL).
- **The defender** is the same class with the ball off: the canonical locomotion, support plan and `PlayBody`. It adds only:
  - its `ballTrack` reads the authoritative ball, so its head, its boot clearance and its tackle see where the ball is;
  - its `replan` is held while a committed tackle owns the body.
- **Each tick's order** is fixed:
  1. the tackle's pending search / plan switch / control return;
  2. the defender's tick;
  3. the boot's spheres presented to the attacker's opponent law;
  4. the attacker's tick;
  5. the contacts read back.

### The opportunity (every tick while pending)

A commitment needs all of these:
- the approach ≤ 3.4 m/s;
- the ball's centre ≤ 0.24 m high;
- the **support foot planted now**, and the tackling foot free (planted beside it, or in its swing);
- the predicted free ball, at the contact time its own commitment implies (`tc = 0.145 + 0.13 c`; the reach decides `c`), inside the forward sector ±75° and Phase C's reach ellipse (1.28 / 1.30 m);
- the ball ≥ 0.30 m from the body;
- the tackling foot on the ball's side, or ≤ 0.12 m across its midline.

Otherwise the request waits for a later tick or the next stride.

### The action

Phase C rev 2's formulas, from the actual entry state:
- **the root:** the approach's momentum braked continuously (C¹ with the approach velocity), Phase C's drive toward the challenge, its small load shift onto the support, one smooth curve through the recovery;
- **the pelvis:** yaw turned toward the challenge (3 + 15 c)°·|sin θ|;
- **the support:** its actual planted stance held through the reach, its ball of foot anchored, the heel rising and the foot pivoting 0.22 × the challenge angle toward it;
- **the reaching foot's path:** the **authoritative boot**, given to the body as dense waypoints, to the catch (the lunge) or back to the ready stance (the poke);
- **the steps:** the recovery step, the settle;
- **the posture channels:** the lean toward the challenge (3 + 25 c)°, the side lean, the counter-rotated trunk, the drop, the hip roll, the arms' counterbalance, the head down to the ball, the gait cycle faded out.

**What integration changed in Phase C's motion**, each one a defect the canonical body showed (§9) or a contact Phase C never had:
1. **The contact (POKE).**
   - The toe is placed 1 cm into the ball's proxy, not Phase C's 0.15 m visual allowance; with that allowance the toe stopped 0.5 – 1.6 cm short.
   - The foot jabs along its own line of reach at 3.0 − 1.8 c m/s, never below Phase C's 0.7 + 0.55 c. The speed is provisional, with no reference measurement.
   - Phase C's exact contact stays selectable (Lab: *contact*).
2. **The two-step commitment.** For 0.045 s the tackle's root and posture run on the gait's own stances while the gait cycle fades; then the tackle's stances take over. Changing the stances under a live cycle lifted the pelvis 1.1 cm in one tick.
3. **The load.** The pelvis drop is eased over 0.15 s instead of Phase C's 0.085 s, which reached 2.4 m/s with the knees at ≈ 2000°/s.
4. **The reaching foot is weighted out before its lift-off** (it lifts at 0.07 s). Otherwise the body judged the swinging foot at its landing a metre away and dropped the pelvis 6.6 cm in a tick.
5. **Lift-off heels authored from the leg's geometry.** At the support's lift-off and at the reaching foot's, the body had raised the heel past the authored toe-off, and the foot jumped 6.5 – 13 cm (the knee 10 – 38°).

### The times (each review case lists them; typical standing lunge)

| from the request | standing lunge |
|---|---|
| commitment | +0.00 … +0.32 s (waits for the opportunity) |
| contact planned | commitment + 0.145 – 0.275 s |
| contact window | commitment + 0.05 s … the catch (lunge) / the return (poke) |
| recovery start | commitment + 0.20 – 0.40 s (the catch) |
| control ready | commitment + 0.43 – 1.03 s (median 0.89 s over 209 commitments) |

## 4. The validated envelope

**Speeds** (`t_envelope.mjs`: approach × the ball's side × lateral offset × facing, against the jog carry):

| defender | set-ups that committed | notes |
|---|---|---|
| standing | 12 / 12 | both sides, every facing |
| walking in (1.5 m/s) | 8 / 12 | the others passed the ball before a support-and-reach moment |
| jogging in (≤ 3.4 m/s) | 4 / 12 | commits at 2.3 – 3.2 m/s |
| running in (5.3 m/s) | 0 / 12 | declined: `SPEED` while running |

Over 1,500 searched runs (100 set-ups × 15 request times), 209 commitments: 196 standing, 13 walking. **Run and sprint tackles are declined.** Phase C's fixtures stop at 3 m/s, and at a run the support cannot hold the plant through the reach.

**Sides and feet:** left 108, right 101 of 209; the mirror (the left-footed carrier) behaves as the right-footed one, mirrored (Lab: MIRROR ×2).

**Angles:** commitments span |θ| 0.2° – 75°, median 54°.
- Roughly head-on is valid only with the defender beside the carrier's path. A head-on contact puts the bodies through each other (§11).
- Slightly left / right, and side-biased (facing 135°), are covered in the envelope sweep.
- Rear tackles are not attempted: the sector stops them.

**Families:** 159 lunges, 34 poke → lunge, 16 pokes.

**States:** standing, walking, jogging; a support foot planted. A defender in flight waits (`NO SUPPORT`).

## 5. Contact and possession

- **The contact.** The boot's four spheres meet the authoritative ball through the canonical law. Impulses on consecutive ticks are one sustained contact (one episode), e.g. the boot pushing the ball along.
- **The carrier's possession.**
  - Every contact goes to the carrier's canonical model: CONTROLLED → FREE as `OPPONENT_TACKLE`.
  - The exception is a minor deflection (Δv < 2 m/s with his next touch within 0.6 s), where his control simply continues.
- **The defender's possession: only through his own canonical receive.** Once his tackle has touched the ball and returned control, and while the carrier does not control it, he is the ball-on footballer on the shared ball. It goes FREE → COLLECTED → CONTROLLED by his own touches. Each player's touches are, for the other, an opponent's contact recorded exactly as the opponent law records one.
- **There is no possession shortcut anywhere:** the button never transfers the ball.

**What the outcomes are, measured** (209 committed tackles over 1,500 runs; the same set-ups):

| outcome | POKE (V1 default) | PHASE C contact (exact) |
|---|---|---|
| ATTACKER RECOVERS: the carrier touches it again within 0.6 s | 59.3 % | 60.8 % |
| MISS: no contact | 22.5 % | 29.2 % |
| POKED LOOSE · CARRIER RE-COLLECTS (after > 0.6 s) | 14.4 % | 7.2 % |
| WON · CONTESTED: the defender collects; the carrier touches again within 1 s | 2.4 % | 0 % |
| OPPONENT RETAINS: a minor deflection | 1.4 % | 2.9 % |
| CONTROLLED WIN | 0 % | 0 % |

**A CONTROLLED WIN does occur, but rarely.**
- The Croqueta sweep produced one (1 of its 82 committed tackles). It is the Lab case *LA CROQUETA · CLOSE DEFENDER*: a poke-lunge knocks the ball 10.8 m/s away, both players race for it, the defender's own touch comes 1.88 s later, and he keeps it for 1 s.
- WON · CONTESTED appears in 2.4 % of the search, 3 of 99 Body Feint tackles, and the walking- and jogging-in envelope cases.

**Why, as measured** (all on the attacker's side, which this work must not change):
1. **Zero reaction latency.** The 99 CONTROLLED carrier re-plans in the tick of the contact. Its B4 plays a compact redirect to a ball deflected 4 m/s sideways 0.20 s later.
2. **Reach.** A carrier touch plays any ball within 1.05 m of his body (the canonical execute rule).
3. **One-player possession models.** After the defender collects, the carrier's own model keeps playing a ball within reach (no opponent-aware possession, no challenge or foul layer).
4. **No player collision.** The carrier reaches the ball through the defender's body.

## 6. Attacker interaction

All from deterministic curated cases (`t_lab_cases.mjs`, `t_moves.mjs`). Nothing in the attacking moves was changed: they are their curated cases verbatim.

| carrier | result |
|---|---|
| **Ordinary carry** (walk / jog) | Commits and contacts; the carrier recovers (POKED LOOSE when the defender jogs in) |
| **Gentle steering** (15°) | Contact; the carrier recovers |
| **Sharp cut** (60° just before the contact) | **MISS**: the carrier's correction touch moved the ball 7 cm from where it was predicted, and the boot missed by 5 cm |
| **Body Feint** (FAKE LEFT → EXIT RIGHT) | Tackling into the fake: **MISS**, because the feint's exit touch takes the ball out of the boot's path. On the exit side: POKED LOOSE. Before the feint: the carrier recovers |
| **La Croqueta** (REF · JOG R → L) | As the transfer starts: **MISS**, because the Croqueta's touches carry the ball out of the window. Before the transfer: the carrier recovers |
| **Mirror** | The left-footed twin: the same outcomes, the other foot |

**Against a standing tackle in front** (`t_moves.mjs`: 4 distances × 4 lateral offsets × 11 request times):
- **Body Feint:** 99 committed tackles: ATTACKER RECOVERS 60, POKED LOOSE 22, **MISS 14**, WON · CONTESTED 3.
- **Croqueta:** 82 committed tackles: ATTACKER RECOVERS 48, **MISS 29**, POKED LOOSE 3, **CONTROLLED WIN 1**, OPPONENT RETAINS 1.

Both are in `evidence/moves.txt`. **Both moves beat committed tackles on geometry alone**, which the instruction anticipated as potentially correct.

## 7. Recovery and control return

- **One rule for a hit and a miss.** The same authored catch → recovery step → settle, as Phase C intended ("no hit/miss input").
- **Contact to control ready:** 0.55 – 0.83 s for a lunge, 0.32 s for a poke (the Lab cases).
- **The cost after control returns.** The defender is braced near 0 m/s, then needs ≈ 0.19 s to reach 2 m/s again (A99-C). From the contact moment to moving at 2 m/s: ≈ 0.9 s for a lunge.
- **Momentum continuation.** A walking or jogging defender's approach is braked continuously through the action (≤ 7 m/s²), not stopped.
- **Control return.** At control ready the defender's ordinary re-planning resumes from the stances the tackle left (standing, the feet set). It needs the user's stick to move on: a fixture's scripted "after" input pushes along his facing.
- **Not done:** an extra stumble or overreach cost for a miss at speed. The cost is the same for a hit and a miss, for the owner to judge.

## 8. Slide tackle

**Audited and prepared, not integrated** (`SLIDE_TACKLE_AUDIT.md`).
- The best foundation is the match harness's **Slide Contact Geometry V1.2** (owner-accepted 28 Sep): the far-leg sweep, a swept physical ball contact, the balance law. It runs on a different engine.
- Integrating it needs a **ground-contact capability in the canonical body**: the hip and thigh on the turf, the trunk rolled on its side. That is a canonical-body change reserved for a separate reviewed step.
- Three owner decisions are listed there.

## 9. Regression (exact)

| check | result |
|---|---|
| **The attacker is the canonical player** (`t_identity.mjs`) | **244 / 244 identical**: every curated case of the Dribbling Lab (122 cases, each with no request and with a declined request) alone vs in the tackling world. Hash, the ball on every tick, contacts, possession log, skills |
| **The milestone's 10 regression suites** (`tools/milestone_regress.mjs`) | **ALL 10 IDENTICAL** to the evidence committed at `f775daac` (CPU timings masked). Covers the approved motions ≡ their review builds (Croqueta V4, Body Feint), the Lab cards, the vocabulary chains, the Body Feint and Croqueta envelopes, the 122 curated cases, the battery, determinism (18 seeds × 30 s), the possession torture (40 seeds × 60 s) |
| **The Lab in Chrome** (`t_browser.cjs`) | **14 / 14 checks**: 0 console / HTTP errors; every case simulates, poses and draws (21 / 21); the page's runs equal node's (21 / 21); 8 cameras, 8 different views; ball hidden / body only / skeleton; frame step; the contact switch; tackle-at-playhead |
| **The left-stick research** | Untouched: its branch `6ccd9f9a` (local = remote), its worktree clean, none of its files differ in this branch |
| **The lock check** (`bl_lock_check.sh`) | PASS before every commit |

## 10. Torture (exact; `t_torture.mjs --n 60 --seed 3`, each trial run twice)

**Requests:** 60 trials, 407 requests.
- 45 COMMITTED, 241 DECLINED, 121 IGNORED (duplicates while pending).
- The request patterns were single, rapid bursts every 0.06 – 0.12 s, on the defender's footfalls ± 1 tick, and invalid.
- The commitments: 39 lunges, 4 pokes, 2 poke → lunge; left foot 20, right foot 25.

| defect | count |
|---|---|
| stuck commitment | **0** |
| control not returned | **0** |
| a request accepted while the tackle owns the body | **0** |
| duplicate possession changes | **0** |
| nondeterministic trials | **0** |
| ball contacts | 50 impulses in 42 contact episodes; **1 re-contact** 29 ms after an episode (a sweeping boot meeting the ball again) |

**The body**: the same measures (thresholds: foot > 5 cm / tick, knee > 6° / tick, pelvis off the root > 2 cm / tick, trunk > 3° / tick, a planted ball-of-foot drifting > 3 cm, legs crossed > 4 cm):

| | inside the tackles (39.3 s) | the same footballer's ordinary movement (270 s) | the canonical carrier, for reference (310 s) |
|---|---|---|---|
| knee "pops" | 1.93 / s | 2.86 / s | 10.26 / s |
| foot jumps | 0.15 / s | 0.93 / s | 6.33 / s |
| plant slides | 0.48 / s (worst 9.3 cm, a walking defender's support under a large heel rise) | 1.36 / s | — |
| pelvis spikes | 0.08 / s | 0.27 / s | 0.04 / s |
| trunk spikes | 0 | 1.22 / s | 1.14 / s |
| legs crossed | 0 | 0.16 / s | — |

These thresholds flag the canonical footballer's own fast swings too, so the comparison column is the meaningful one: **the tackle's events per second are below the same footballer's ordinary movement.**

**Remaining in the tackle:**
- borderline knee rates (7 – 10° / tick) at the settle;
- larger heel rises and a few foot / knee events when the defender commits **while walking or jogging in** (the reaching foot already in its swing; the swing redirected and blended over 0.12 s).

**Player overlap** (no collision exists): > 3 cm on 1,347 ticks inside the tackles; the deepest is 29.9 cm.

## 11. Performance (node, no drawing; `t_cpu.mjs`, 5 × 20 Lab cases)

| | per 240 Hz tick |
|---|---|
| **the tackle module, idle** (no request) | **median 0.1 µs** (0.03 ms per simulated second) |
| the tackle module, pending (the opportunity search) | median 9.5 µs, p95 23 µs |
| the tackle module, active (commitment → window end) | median 1.0 µs, p95 4.5 µs |
| the commitment (once: the action and its two plans) | median 0.21 ms, max 2.4 ms |
| **the attacker before any request: in the world vs alone (like for like)** | **2.91 vs 2.96 ms per simulated second**: no difference |
| the defender's own simulation (a second canonical footballer, ball off) | 2.27 ms per simulated second (the cost of a second player, not of tackling) |
| the attacker after contacts (his canonical pursuit re-planning) | 6.07 ms per simulated second over runs with tackles, vs 3.05 without |
| the Lab: one case simulated and both bodies posed at every tick | 0.17 – 0.36 s per case |

## 12. Known limitations (none hidden)

1. **No player–player collision.**
   - The bodies overlap: up to 29.9 cm in the torture, 28 – 30 cm in some curated Body Feint / Croqueta cases where the carrier runs into the defender.
   - The Lab's fixtures keep the defender ≥ 0.8 m beside the path where they can.
   - A future system (it is also the precondition for man-first contacts, trips and fouls).
2. **Wins are rare against the 99 CONTROLLED carrier** for the four reasons in §5. Each is an attacker-side or world-level change, deliberately not made.
3. **The POKE contact speed** (3.0 − 1.8 c m/s) is provisional, with no reference measurement. The A/B with Phase C's contact is in §5.
4. **Moving commitments** (walking / jogging in) show more body events than standing ones (§10). Running tackles are declined.
5. **The same recovery for a hit and a miss.** No extra overreach / stumble cost for a miss at speed.
6. **The defender plays a loose ball only after control returns** (≈ 0.3 – 1.0 s after commitment), and only with a stick input.
7. **Re-contacts.** A sweeping boot can meet the ball again within 0.1 s: 1 in 45 tackles.
8. **The models.**
   - The defender is the same canonical footballer (the same body, a tinted kit), not a defender's anatomy.
   - Defender ratings, ability and reaction times are not modelled (by instruction).
9. **Phase C's envelope.**
   - Only the forward sector ±75° and the 1.28 / 1.30 m reach.
   - No block / cushion family: Codex V2's four families need its own physical world.

## 13. PLAYABLE — TOUCHLINE — TACKLING LAB V1 (local only)

`http://127.0.0.1:8363/sandbox/visual/tackle1_lab.html` (serve the worktree on :8363, `HANDOFF.md`).

**The cases**, 21, each a deterministic replay labelled with what its own run produced:
- ordinary carry (6);
- the race for a poked ball;
- steering and the cut;
- Body Feint (3);
- Croqueta (3, one of them the controlled win);
- mirror (2);
- declines: late, early, running, and no request as the reference.

**The controls:**
- PLAY / PAUSE, REPLAY, ◀ ▶| frame step (4 ticks; Shift 1), LOOP, 1× / 0.5× / 0.25×;
- 8 cameras (GAMEPLAY, FRONT, REAR, SIDE LEFT, SIDE RIGHT, 3/4 FRONT, 3/4 REAR, OVERHEAD), framed on both players, oriented by the defender's facing;
- BALL, BODY ONLY, SKELETON, DIAGNOSTICS;
- *contact* POKE / PHASE C;
- TACKLE AT PLAYHEAD (T) and NO TACKLE: re-run the case with the request where the playhead is, or with none;
- the timeline marks the request, commitment, the contact window, contacts, recovery, control ready and the carrier's possession changes.

**The diagnostics** (per replay):
- the request and every pending tick's reasons, the eligibility result, the commitment;
- the support and tackling feet, the stride at commitment, the ball's distance at commitment and at contact;
- the contact (time, surface, episodes), the ball's velocity before / after, both players' possession before / after;
- recovery start, control ready, the recovery duration and the time to 2 m/s;
- for a miss, why: the carrier's touches after commitment, the closest boot–ball gap, how far the ball was from its prediction.

## 14. The owner's decisions

1. **The contact:** POKE (V1 default) or Phase C's exact contact, and the jab speed.
2. **The attacker's reaction to an opponent's contact.** Should the carrier's possession model gain a reaction latency, and an opponent-aware possession (who may play a ball the opponent controls)? Both are attacker / possession changes outside tackling.
3. **Player–player collision as the next system.** It precedes the slide tackle.
4. **Recovery after a miss:** the same as a hit (Phase C), or longer for an overreach.
5. **The slide tackle:** the three decisions in `SLIDE_TACKLE_AUDIT.md` §4.
