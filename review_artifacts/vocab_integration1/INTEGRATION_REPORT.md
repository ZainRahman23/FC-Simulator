# DRIBBLING VOCABULARY INTEGRATION — the Body Feint and La Croqueta (24 Oct 2026)

Owner instruction, verbatim: `sources/2026-10-23_user_instruction_integrate_body_feint_croqueta.md`.

**The order:** lock the two motions, integrate them into the real dribbling library, and prove they work in ordinary play.

**The build:** `sandbox/visual/vocab2/`, a copy of `croqlw/`.

**Pages (local only):**
- Dribbling Lab: http://127.0.0.1:8361/sandbox/visual/vocab2_lab.html
- Joystick Sandbox: http://127.0.0.1:8361/sandbox/visual/vocab2_sandbox.html

**Status:** both moves are PROVISIONALLY APPROVED MOTION FOUNDATIONS, now AUTHORITATIVE vocabulary entries. Not frozen. Nothing published. The final left-stick recognizer is not started.

## 1. MILESTONE

| | |
|---|---|
| Recovery point **before** integration | tag **`checkpoint/touchline-feint-croqueta-approved-2026-10-23`** (annotated, local) → commit 9140be54. Its code is byte-identical to b489e4fd. |
| Its manifest | `milestone/APPROVED_MOTIONS_MANIFEST.md` / `.json`: branch, commits, sources, dependencies, review pages, evidence, and the git blob of every file the four review pages load (`closure_*.json`, 133 blobs) |
| The motions' commits | Body Feint: video-guided 7853a88f (instruction bbc87f4a), exit foot f8a0e374 (5d1a7ec7) · Croqueta LEG-WAVE V4 b489e4fd (4d63f13a, the owner's L1 screenshot) |
| History | no rewrite, no force push; nothing unrelated merged. The integration is one new folder beside the others. |
| The integrated build's own closure | `milestone/closure_vocab2_lab.json`, `closure_vocab2_sandbox.json` (every file the two pages load, by blob) |

## 2. BODY FEINT — video-guided + exit foot

**Where:**
- request `BODY_FEINT` (`BODY_FEINT_V2` is an alias), MANUAL only;
- templates `BFEINT_L` (walk), `BFEINT_J` (jog), `BFEINT_R` (run) in `vocab2/v_tech.js` `bodyFeintOf()`;
- catalogue `vocab2/v_meta.js`.

**The motion is the approved one, unchanged.** The six approved cases and the mirror, integrated library against feint2ef: **every joint and the ball, every tick: 0.000 mm; contacts identical** (`evidence/reproduction_vs_feint2ef.txt`). In the Lab the A | B lanes measure 0 mm, with identical contacts, in the browser (`evidence/browser.json`). The integration decides only eligibility, start timing, side, entry state and what follows.

**Eligibility.** Measured with `lib_bf_sweep.mjs`, on the approved feint's own standard:
- 0 normal-visible events, and no slow-motion events beyond its two accepted floats;
- the free foot no faster than 900°/s and no more than 5 cm a tick (`feint_foot.mjs`, the approved tool);
- the exit on the OUTSIDE; 0 missed contacts.

The feint is placed only when every check below holds. Otherwise it is **declined with the reason**, and the controlled carry, or B4's ordinary answer to the stick, continues. It is never reshaped.

| Check | Rule | Why (what the sweep showed outside it) |
|---|---|---|
| Speed → template | walk ≤ 2.65 m/s `BFEINT_L` · jog 2.65 – 4.3 `BFEINT_J` · run ≥ 4.3 `BFEINT_R` | a walk feint chosen at a jog or a run (another template's band) failed at 65–75° |
| Requested direction | walk **45–55°**, jog **35–60°**, run **35–40°** (±3° for heading drift) | toe snaps of 1100–1500°/s outside these |
| Ball side / support foot | the playing foot is the carrying foot; the exit goes to its side and the fake to the other | a right-footed carry asked to fake RIGHT → exit LEFT crossed the body (crossings, knee pops, 9 cm a tick) |
| Ball position | on that foot's side and ≥ 0.42 m out ahead | a feint placed just after a touch, with the ball 0.37 m ahead, floated |
| Previous touch | the carrying foot's | (both moves) |
| Gait state | settled: speed within ±0.4 m/s over 0.5 s (walk 1.0 s), heading within ±6° of 0.2 s ago, and the stick not asking another gait | feints placed while accelerating, braking or turning: 1500°/s toe turns, crossings |
| Entry | a set touch, as in all six approved cases | entered with the ball rolling to it, the walk's free foot jumped 6–9 cm a tick |
| Start timing | the earliest tick it is feasible. A pending request holds the entry line and is retried every 0.05 s within its window (0.55 s). | (earliest natural opportunity) |

**Results.** Each player, 560 entries: steady walk / jog / run × angles 25–65° × 8 stride phases, plus four speed transitions × 8 delays.

| | Right-footed player | Left-footed twin |
|---|---|---|
| Pass (played, every check clean) | **158** | **158** |
| **Played but failed** | **0** | **0** |
| Declined (with the reason) | 402 | 402 |
| Inside the validated bands, steady gait | walk 24 / 24 · jog 48 / 48 · run 16 / 16: **every stride phase plays and is clean** | identical |

**Fake LEFT → exit RIGHT and fake RIGHT → exit LEFT.**
- The approved mirror is the left-footed twin. It plays fake RIGHT → exit LEFT with the same counts, case for case.
- The right-footed player asking for fake RIGHT → exit LEFT is declined ("the ball is on the right foot"). That entry is not validated.
- Its motion would cross the body. In the earlier ungated sweep it failed broadly.

**Start timing.** From request to the exit touch (the feint's decisive contact): walk 0.74 / 0.97 / 1.27 s, jog 0.63 / 0.82 / 1.12 s, run 0.55 / 0.74 / 0.97 s (min / median / max). The approved jog case is 1.02 s. Most requests are placed on the request tick itself; the rest wait for the next feasible tick.

After a gait change, the feint becomes available again:
- jog after a walk: from +0.6 s;
- jog after a run: from +0.3 s;
- run after a jog: from +0.45 s;
- walk after a jog: from +1.0 s.

Before that it is declined with "the carry is accelerating", "braking" or "still settling into this speed" (`evidence/bf_sweep_*.txt`).

**AUTO:** no AUTO Body Feint. It is not in `AUTO_TECH`, and VOCAB-1's analog feint, which auto-played the old overlay feint from the stick, is off.

## 3. CROQUETA — LEG-WAVE V4

**Where:**
- request `CROQUETA`, MANUAL only;
- template `CROQ_LW` in `vocab2/v_tech.js` `croqLWOf()`;
- catalogue `vocab2/v_meta.js`. `CROQUETA` names `CROQ_LW` only: no other croqueta template and no generic fallback.

**The motion is the approved one, unchanged.** REF · JOG R → L, REF · JOG L → R and the mirror, against croqlw: **0.000 mm, every joint and the ball, every tick; contacts identical** (`evidence/reproduction_vs_croqlw.txt`). The browser's A | B also measures 0 mm.

Everything the owner named is preserved because the motion is not touched:
- the right-side setup;
- the leg wave `| | → \ \ → / / → | |`;
- the receiving foot opening outward;
- the left foot never passing the ball before the receive;
- the diagonal left+back first wave, the bow reversal, the left-inside cushion, the continuous sweep;
- never "touch right → touch left".

The sweep's checks:
- toe ≤ 900°/s (max 814);
- the receiving foot never ahead of the ball;
- forward speed ≤ 9 m/s (max 7.2);
- the legs through vertical within 20 ms of each other (max 8 ms);
- the `/ /` reached;
- the ball across and back.

**Capability hierarchy**, as ordered:

| State | Answer |
|---|---|
| a proven V4 entry | V4 |
| a valid mirror (the left foot's ball → right, the left-footed twin) | the mirrored V4: numerically exact, the same counts in every sweep |
| an unvalidated entry | **declined**, with "**CROQUETA V4 NOT CURRENTLY FEASIBLE**" and the reason |

The decline policy: there is no ADV-4 fallback for a CROQUETA request. ADV-4 never silently overrides V4, and nothing teleports. The controlled carry, or B4's ordinary answer to the stick, continues.

**Eligibility** (`lib_croq_sweep.mjs`):

| Check | Rule | Why |
|---|---|---|
| Speed / gait | a settled jog **2.6 – 3.6 m/s** (steady 0.5 s, the stick not asking another gait) | a run entry braked from 5.3 m/s into it; a walk entry at 1.5 m/s |
| Requested direction | **40 – 45°** toward the receiving side | toe snaps, crossings and the foot ahead of the ball outside it |
| Ball side / support foot | the ball on the carrying foot: right-footed → LEFT, left-footed → RIGHT | the right-footed player asking → RIGHT has the ball on the wrong foot: "the ball is on the right foot" |
| Ball position | rolling where V4 meets it: 0.39 – 0.47 m ahead, 0.20 – 0.30 m out; its first touch ≤ 0.62 s away; **no set touch** | a set touch to the nominal point always failed; the ball 0.51 m or more ahead gave toe snaps; 0.33 m put the foot ahead of the ball; a touch a stride later drove the foot forward at 8.5 – 9.7 m/s |
| Previous touch | the carrying foot's | a V4 entered one stride after a left-foot carry touch floated 0.25 s |
| Start timing | earliest feasible tick; a pending request **holds its line** and is retried every 0.05 s | without these the window closed unplayed in 7 of 17 stride phases (see below) |

Two integration fixes made V4 available at every stride phase, without touching it:
1. **The carry touch re-aimed toward the stick.** While a request was pending, `c_sim.js` `reaim` aimed the carry touches at the stick, which rolled the ball across to the other foot. The request now holds its entry line, as a braking preparation already did.
2. **Retries only at footfalls.** The request was retried only at footfalls, but V4's feasible phase came about 0.3 s after the request, between two of them. It is now retried every 0.05 s while pending, and only then; it costs nothing otherwise.

**Results:**

| | |
|---|---|
| Inside 40 – 45°, steady jog, both sides | **102 / 102 stride phases play, every check clean** (17 phases × 3 angles × 2 sides) |
| Outside (35, 38, 48, 50°) | declined with the reason |
| **Played but failed** | **0** |
| Entry in transition | walk → jog and run → jog: declined for 0.3 s ("still settling"); from +0.6 s, 4 / 4 at every delay |
| The cross case (right-footed → RIGHT) | declined, "the ball is on the right foot" |
| Request → first touch | 0.37 / 0.72 / 1.04 s (min / median / max); the reference case 0.57 s |

## 4. VOCABULARY CLEANUP

Every catalogue entry has a class (`v_meta.js` `lib`, `libOf()`). The full table is in `VOCABULARY.md`, and in the Lab's last integrated card.

| Class | Entries |
|---|---|
| **AUTHORITATIVE** (provisionally approved) | `BODY_FEINT`, `CROQUETA` |
| **PRODUCTION** (unchanged) | the rest of the vocabulary: carry, B4's actions, hooks, Cruyff, Chop, Matthews, V-turn, Stop-and-Go, drag-back, the shields, scissors / stepovers / elasticos, the shoulder drop and the hip fake |
| **SUPERSEDED · not eligible** | `BODY_FEINT_OVERLAY` (the old overlay feint), `FEINT_OUTSIDE_CUT`, `FEINT_INSIDE_CUT` |
| **EXPERIMENTAL · not eligible** | `BODY_FEINT_V2_SHALLOW`, `_STRONG` (never-reviewed depths) |
| **EXPERIMENTAL** (as before) | roulette, heel chop |
| **HISTORICAL** (templates no entry reaches) | croqueta V1 `CROQ_W/J/R`, V2 `CROQ_HS`, V3 `CROQ_XS`; ADV-4's croqueta |

A request for a not-eligible entry is rejected at once, with its reason. Only the current technique of each move is eligible.

**B4's LATERAL TRANSFER** (`GENERIC.LAT`, ADV-4's lateral mechanics) is preserved and documented. It is an automatic redirect of the EXPANDED vocabulary, not the Croqueta. It never plays for a CROQUETA request: a pending request holds its line, so B4 sees no turn. AUTO is not expanded: `AUTO_TECH` is unchanged.

**The old analog feint** (VOCAB-1 `feintTick`) auto-played the old overlay Body Feint from the stick, so it is off. `ABL=analogfeint` restores it for tools. That proves its removal is the only change to ordinary play (§6).

## 5. PLAYABLE

**Dribbling Lab** (`vocab2_lab.html`, title "Dribbling Lab"). The first section is **THE DRIBBLING VOCABULARY — INTEGRATED**:
- **BODY FEINT** and **LA CROQUETA** cards, badged **PROVISIONALLY APPROVED** and **INTEGRATED INTO VOCABULARY**. Each shows its version, purpose, entry, validated envelope, what is not generalized, templates, request and TRY.
- Each approved case: ▶ PLAY (B · the integrated library) · MIRROR · A · REVIEW BUILD (feint2ef / croqlw, untouched) · A | B side by side · 1× / 0.5× / 0.25×.
- FROM ORDINARY PLAY: the move requested inside its envelope, at other stride phases. DECLINED: entries it refuses, with the reason shown, e.g. "CROQUETA V4 NOT CURRENTLY FEASIBLE — REASON: entry 5.3 m/s outside its validated 2.6–3.6 m/s".
- THE CHAINS (7) and THE VOCABULARY's class table.
- Cameras: GAMEPLAY first, then REAR LOW, FRONT HIGH, REAR CLOSE, OVERHEAD CLOSE, SIDE CLOSE, and A | B front and rear.
- Everything starts at 1×. The generation-by-generation review sections are on their own pages (`croqlw_lab.html`, `feint2ef_lab.html`). The main Lab no longer shows the ADV-4 croqueta compares.

**Joystick Sandbox** (`vocab2_sandbox.html`). Temporary explicit requests from ordinary dribbling (**not** the final control scheme):

| Key | Request |
|---|---|
| **7** | BODY FEINT · fake L → exit R |
| **8** | BODY FEINT · fake R → exit L |
| **9** | CROQUETA → LEFT |
| **0** | CROQUETA → RIGHT |
| **U** | CRUISE (keeps the gait and the line, so the buttons work with a mouse alone) |

- Each issues the move's request with the stick held at the validated angle for the gait. That is 50 / 45 / 38° for the feint at a walk / jog / run, and 42° for the croqueta.
- The line is held while pending. If the request is declined, the carry goes on straight.
- The outcome line shows the result and its reason.
- The palette lists eligible entries only, and the analog-feint switch is gone.

**Browser check** (`tools/vi_browser.cjs`, headless Chrome; `evidence/browser.json`; the screenshots stay local, not in Git):

**Lab:**
- 0 console errors, 0 HTTP errors.
- Both cards and their badges, 7 chains, the 41-row class table, no old review section.
- All **48** PLAY / MIRROR clicks: the page's outcome ≡ node's (48 / 48), all at 1×, 0 possession exits.
- **A | B for all 8 approved cases: root 0 mm, ball 0 mm, contacts identical** (A = feint2ef / croqlw, B = vocab2).
- 0.5× / 0.25× / 1× and TRY work.

**Sandbox:**
- 0 errors.
- The palette has 25 entries and no ineligible one; the analog-feint switch is gone.
- Driven by the keyboard + CRUISE:

| Request | Outcome |
|---|---|
| JOG · BODY FEINT fake L → exit R | PLAYED `BFEINT_J` |
| WALK · BODY FEINT fake L → exit R | PLAYED `BFEINT_L` |
| RUN · BODY FEINT fake L → exit R | PLAYED `BFEINT_R` |
| JOG · CROQUETA → LEFT | PLAYED `CROQ_LW` |
| JOG · BODY FEINT fake R → exit L | REJECTED: the ball is on the right foot |
| JOG · CROQUETA → RIGHT | REJECTED: "CROQUETA V4 NOT CURRENTLY FEASIBLE: the ball is on the right foot" |
| RUN · CROQUETA → LEFT | REJECTED: "… entry 5.3 m/s outside its validated 2.6–3.6 m/s" |

0 possession exits.

## 6. REGRESSION

**The comparison:** `tools/regress_compare.mjs`, line by line against croqlw's committed evidence, produced by the same commands.
- **A** is vocab2 as built.
- **B** is vocab2 with `ABL=analogfeint`, which restores the old analog feint.

A differing line is classed REQUEST if it makes a Body Feint, Croqueta or retired-entry request; otherwise OTHER.

| Suite (croqlw → vocab2) | **A** · vocab2 as built | **B** · vocab2 + ABL=analogfeint |
|---|---|---|
| **Extreme, ball on** (140 runs) | **identical, every line**: 47 runs with a normal-visible event, normal 61, slow 131, 0 missed, 0 exits | identical |
| **Extreme, ball off** (140) | **identical, every line** | identical |
| **Curated cases** (122) | 85 lines identical. 30 REQUEST lines: the Body Feint / Croqueta requests now play or decline by their envelopes, and the retired entries are rejected. 8 OTHER lines: AUTO cases whose B4 choice changed without the analog feint (e.g. CLOSE_CARRY, INSIDE_CUT · NORMAL) — none adds a normal-visible event (one gains a slow-motion one). Normal-visible: 10 in 9 cases → **9 in 8**. Possession exits 0, missed 0. "Every request PLAYED" 97 / 107 → 76 / 107 (the declines). | **every OTHER line identical**; only the 29 REQUEST lines and the summary differ |
| **Battery** (72) | 65 lines identical; the 8 REQUEST lines are the retired feint → cut combos and declined Body Feint / Croqueta entries. PLAYED 67 → 59. | the same |
| **Body torture** (18 × 60 s, random play) | normal-visible 254 → **234**, slow-motion 328 → **298**, diag 21 → **2** (the analog feint's removal) | **identical numbers**: 254 / 328 / 21 |
| **Possession torture** (40 × 60 s) | observed losses 10 → **8**, missed contacts 0, separation max 1.76 → 1.70 m | **identical, every line** (15 / 15, with `--verbose`): 10 losses, 0 missed, the same contacts by kind and the same per-seed losses |
| **Intent torture** (361 random manual requests, 12 × 60 s) | CONTROLLED exits 0, missed contacts 0, ball > 3 m 0 s. PLAYED 73 → 36: the retired entries (37 requests) are rejected, and BODY_FEINT / CROQUETA are declined in the random mid-turn states. The others differ by cascade (a different request plays → a different state). | the same (the catalogue's request list changed, so the random draws differ) |
| **Determinism** | **18 / 18** identical simulated twice, and **18 / 18** re-simulated from the recorded input (the page's replay path) | — |
| **Body Feint suites** (feint_integrity, feint_sync; feint_measure's six approved cases) | **identical**. feint_measure differs only for the right-footed fake R → L (declined: the ball on the right foot) and the unreviewed depths and the old feint (not eligible). | — |
| **Croqueta integrity** | the jog reference cases **identical**; the walk and run reference cases are declined (not validated) | — |
| **Rapid input** (the feint's stress sequences, 28 runs) | normal 13 → **10**, slow 72 → **42**, but angular spikes 80 → 95 and planted-foot turns 0 → 2. They are all in B4's ordinary answers (lateral transfer shoulder roll 1039°/s, compact redirect pelvis 957°/s, a walk plant turning 21°). Those answers follow the second, opposite feint of a sequence, which a right-footed player is now refused. | — |
| **Chains, cards** | 14 / 14 chains clean, deterministic; the Lab's 34 card runs as expected | — |

**Conclusion.**
- With the analog feint restored (B), vocab2 equals croqlw in every suite outside the Body Feint / Croqueta / retired-entry requests. That proves the analog feint's removal is the integration's only change to ordinary play.
- Its effect (A) is fewer visible events in random play and fewer possession losses.
- The carry, hooks, Cruyff, Chop, Matthews, V-turn, Stop-and-Go, possession and determinism are otherwise unchanged.

**CPU (no Body Feint / Croqueta request).** `tools/vi_cpu.mjs`: the torture's stick input, 4 programs × 60 s, interleaved rounds; `evidence/cpu.txt`, `cpu_repeat.txt`.

| | best · median ms CPU per simulated s | re-plan mean | per re-plan: instances tried · candidates scored |
|---|---|---|---|
| vocab2 | 116.8 · 127.0 | 2.70 ms | 35.25 · 2.64 |
| vocab2 + the old analog feint (`o.analogFeint`, the same process) | 115.1 · 117.1 | 2.65 ms | 34.89 · 2.81 |
| croqlw | 116.8 · 125.6 | 2.69 ms | 34.89 · 2.81 |
| feint2ef | 113.3 · 126.0 | 2.62 ms | 34.89 · 2.81 |

**No meaningful new per-tick cost.**
- **The first measurement looked worse:** 133 vs 121 ms. It was repeated rather than called noise. With 7 interleaved rounds and the same code in one process, vocab2's best equals croqlw's.
- **The integration's own code costs nothing:** with the analog feint on, vocab2 (115.1 ms) matches croqlw. Its per-tick additions are a few comparisons, made only while an integrated request is pending.
- **The only change in the work:** 1 % more technique instances tried per re-plan (35.25 vs 34.89), because a stick turn the analog feint used to hold now reaches B4's search at once.
- **Worst ticks** are single outliers, in every build: 150 / 47 / 202 / 42 ms.

## 7. Chains and control return

**The chains** (`evidence/chains.txt`). Each request is separate (no canned combo): ordinary jog, right-footed player, no defender, each also mirrored and each run twice:

| Chain | Requests | Body (normal / slow) | Possession | Deterministic |
|---|---|---|---|---|
| CARRY → BODY FEINT → CARRY | BF PLAYED | 0 / 2 (its accepted floats) | kept | yes |
| CARRY → CROQUETA → CARRY | CROQ PLAYED | 0 / 0 | kept | yes |
| BODY FEINT → ordinary cut (stick −50° at +1.2 s) | BF PLAYED → B4 lateral transfer | 0 / 1 | kept | yes |
| BODY FEINT → CROQUETA (at +2.2 s) | BF PLAYED + CROQ PLAYED | 0 / 2 | kept | yes |
| CROQUETA → ordinary cut (stick +50° at +1.2 s) | CROQ PLAYED → B4 compact Matthews | 0 / 0 | kept | yes |
| CROQUETA → CRUYFF (at +1.5 s) | CROQ PLAYED + CRUYFF PLAYED | 0 / 1 | kept | yes |
| CROQUETA → carry (back to the first line, +1.0 s) | CROQ PLAYED | 0 / 0 | kept | yes |

**14 / 14** (7 × straight and mirrored): every request PLAYED, 0 normal-visible, 0 possession exits, 0 missed, deterministic.

**Control return.** `evidence/control_return/`; `lib_chain_probe.mjs` sweeps the follow-up's timing.

- **Body Feint (jog):**
  - its decisive outside touch is at 1.02 s;
  - the planner releases control +0.20 s after it;
  - an ordinary cut can be asked from the decisive touch on, and its first contact comes at +0.37 s, the exit touch's slot;
  - the carry's next touch is at +0.35 s after the exit touch;
  - a stick change **before** the decisive touch cancels the uncommitted feint (the latest intent wins);
  - a Croqueta request is declined until its own entry is valid again: the heading settled on the new line, a settled jog, the carrying foot's touch. It plays from ≈ +0.8 s after the feint's exit touch.
- **Croqueta (jog):**
  - first touch 0.57 s, receive 0.75 s, planner release +0.24 s after the first touch (+0.06 s after the receive), its exit touch 1.03 s;
  - an ordinary cut or carry back can be asked from +0.15 s after the receive, and its first contact comes +0.36 – 0.57 s after the receive;
  - a Cruyff plays from +0.75 s after the receive.

**Measured, and identical in the review builds (not caused by the integration):**
- **Croqueta → cut back to the right** (stick +50° at +0.8, +1.1 or +1.3 s): one leg crossing in the ordinary carry that follows. It is the same in croqlw with the same input (`croq_then_cut__croqlw.txt`).
- **Body Feint → cut** (stick −50° at +1.6 s): B4's compact outside redirect crosses the legs, identically in feint2ef (`bf_then_cut__feint2ef.txt`).

These are ordinary-play residuals of B4's carry and cuts. They are not retuned here: B4 and AUTO were not to be expanded.

## 8. Limits (not generalized) and owner decisions

1. **Envelopes.**
   - Body Feint: walk 45 – 55°, jog 35 – 60°, run 35 – 40°; no sprint.
   - Croqueta: jog 40 – 45° only.

   Elsewhere they are declined.
2. **The fake toward the carrying foot** (a right-footed player's fake RIGHT → exit LEFT) and the croqueta to the carrying foot's side (right-footed → RIGHT) need the ball on the other foot first. They are declined, not played.
3. **Random-input play** (the intent torture). The two moves are declined in nearly every random state (mid-turn, accelerating), so the integrated requests play 0 times there. In ordinary settled dribbling they play at every stride phase. This is the gap the final left-stick recognizer must address.
4. **After a gait change**, a move waits 0.3 – 1.0 s for the carry to settle.
5. **No defenders**, so no "fooled" measure. Dribbling, Ball Control and Agility are tested at 99 only.

**Owner decisions:**
1. The envelopes: accept them as the validated scope, or name the next entries to validate.
2. The decline policy: decline with the reason. ADV-4 is never used as a fallback; B4's ordinary answer to the stick continues.
3. Whether the old analog feint stays off. It was an AUTO old Body Feint, and its removal is the only ordinary-play change.
