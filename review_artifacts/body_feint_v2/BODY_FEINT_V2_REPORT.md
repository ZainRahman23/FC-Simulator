# BODY FEINT V2 — report (overnight 22 → 23 Oct 2026)

**State:** stopped for the owner's visual review. **Not frozen, not integrated.**

**Pages (local only; the character is a real player's model, never published):**
- Lab: http://127.0.0.1:8361/sandbox/visual/feint2_lab.html. The BODY FEINT V2 section comes first.
- Sandbox: http://127.0.0.1:8361/sandbox/visual/feint2_sandbox.html.

**Code:** `sandbox/visual/feint2/`, a copy of `adv4/` at c11579a3. ADV-4, CRUYFF-CHOP-1, VOCAB-1 and the locked BASELINE-88573ef0 are unchanged.

**I cannot play video in real time.** Every visual statement below comes from posed-body measurements and still frames. The 1× judgement is the owner's.

---

## 0. In one paragraph

The old body feint (VOCAB-1) was a short ball hold followed by an outside redirect. Its body barely took part:
- a 3 cm pelvis shift;
- a 1° shoulder drop;
- 0° head turn;
- no false step and no speed cost.

V2 is a new technique. It is a parameterised family:

| Variant | Use |
|---|---|
| `BFEINT_J` | jog |
| `BFEINT_L` | low speed |
| `BFEINT_R` | running |
| `BFEINT_JS` | shallow |
| `BFEINT_JX` | strong |

Every variant mirrors exactly between left and right. The sequence:
1. A **real false step**, wide on the fake side with the toe out, the support knee flexed under the load.
2. The authoritative **centre of mass moves toward the fake**, by a small amount on purpose (the honest signal).
3. The **segments exaggerate the lie**:
   - the shoulder line drops toward the fake;
   - the upper trunk twists further than the hips;
   - the head turns;
   - the arms go asymmetric.
4. The **reversal**: the hips release first, then the outside of the other foot takes the ball out at 45°.
5. A **laces exit touch** and a burst on the rated curves (A99-C, Agility B, D38), with no bonus.

The feint has a cost: jog 3.2 → 2.6 → 3.2 m/s, against 3.2 → 3.2 → 3.2 for the old one.

**Integrity:**
- every curated V2 case has 0 normal-speed-visible body events and 0 angular spikes;
- left/right numbers are identical;
- possession, determinism and every regression set are unchanged against ADV-4.

**The overnight finding:** in every build since BASELINE-88573ef0, the gait cycle freezes after 9 s of simulated time (§9.1). It is fixed in `feint2` only, pending the owner's decision.

## 1. ADV-4 / croqueta status (the first part of the mission)

- **Croqueta refinement:** committed as **c11579a3** (local). The owner's BODY FEINT V2 instruction was committed verbatim as **273cf9ab** (local). The 23 Oct 06:10 publication pushed `prototype/dribble-1` to 3d27eca2. c11579a3 and 273cf9ab follow the next daily rule (after 06:00 on 24 Oct).
- **The torture questions, re-run tonight on ADV-4 HEAD (c11579a3), same machine:**

  | Check | Result |
  |---|---|
  | Possession torture, page config (`--pace D38 --vocab EXPANDED --carry B`), seeds 1–40 | **10 losses (0.26/min), 0 missed.** Matches the refinement report's figure. BODY FEINT V2 gives the identical output, line for line apart from CPU. |
  | Same, with the tool's default config | 3 losses in both builds, identical (`evidence/*torture_defaultcfg_40.txt`; not the page's config) |
  | Body torture, 18 seeds × 60 s | 251 normal-visible / 305 slow-motion (`evidence/adv4_ref/body_torture_18.txt`) |

  The croqueta's "random-play totals +10 %, inconclusive" (ADV-4 report §10) stands as reported. Nothing was found that the croqueta itself causes.
- **Nothing in the croqueta was reverted.** The ADV-4 owner decisions (report §9) are still open.

## 2. Research (full text in `RESEARCH.md`)

- **Brault, Bideau, Kulpa & Craig (2012, PLoS ONE), the deceptive rugby sidestep.**
  - The attacker exaggerates head yaw, upper-trunk yaw and the out-foot placement.
  - The attacker minimises the centre of mass's lateral displacement.
  - Expert defenders read the centre of mass.
- **The football "lunge" body feint (Coerver-style description).**
  - The fake-side foot steps and lunges; the weight, head and shoulders go onto it, and the shoulder drops as it plants.
  - The push off it, then the ball away about 45° with the outside of the other foot, then the burst.
- **Messi.** No footage was stepped through, and nothing is claimed to replicate him. The target is his style: small, quick, whole body, a quiet ball.

## 3. What was built: the mechanics, phase by phase (jog, fake LEFT → exit RIGHT, times from the request)

| Phase | Time (s) | Support (authored stances, authoritative) | Root / centre of mass | Body channels |
|---|---|---|---|---|
| Approach | 0 → 0.52 | the ordinary stride. The entry waits for a stride that fits. | on the entry line; never a drift toward the exit (§4) | — |
| Last stride | 0.52 – 0.66 | right foot; its push starts the body left | heading −7° → −10° (toward the fake) | face −4°, trunk −7°, arms widen |
| **False step** | 0.70 – 1.00 | **left foot wide**: 0.23 m outside the pelvis, toe out 24°, knee 75° | the pelvis reaches **0.12 m** toward the fake at 0.92 | trunk −17° vs hips; shoulder drop 13°; head −14°; left arm wide, right forward |
| **Reversal** | 0.92 | the false step drives back | lateral velocity turns at 0.92 | hips release first (trunk −15° → −9°), shoulders still lagging |
| **Outside touch** | 1.02 | the exit-side (right) foot's outside, ball out at 45° | heading +4° → +22° | face +10°, side lean +6°, shoulder drop releases |
| Exit plant | 1.08 | right foot down on the new line | heading +40° by 1.22 | trunk +3°, the arms drive |
| Exit stride + laces touch | 1.26 – 1.60 | left stride, the right foot's laces touch at 1.40 | +45° | gait back to 1.15 |
| Control returned | +0.20 after the touch | — | — | — |

- **Four new channels.** `armSide` (arm asymmetry), `armHold` (a held arm posture), `shDrop` (clavicle drop) and `headYaw`. They are zero for every other action, so other poses are unchanged.
- **The ball stays quiet.** The touches are the set touch in stride, the outside touch and the exit touch. Nothing touches the ball during the lie.

## 4. Entry and the tells

- **The full entry vs. the false-step entry.** The full entry needs a fitting stride, so a jog request waits about 0.5 s and touches at 1.02 s. A second entry opens at the false step (`TRIMMED`, the shortest-entry family): 0.70 s.
- **A steer toward the true exit is rejected.** Opened at the false step, the approach often has to line the ball up first. In the curated jog phase that meant **steering 10° toward the true exit** before the fake, which is a tell. A feint approach may therefore not drift toward its exit (> 4 cm), nor more than 8 cm toward its fake.
  - The jog curated cases take the full entry (1.02 s).
  - The right-footed R → L case uses the short one (0.72 s).
- **The general drift snap (finding).** For every template with an approach drift, the heading ramps away and snaps back at the window start: a ≈ 10° heading / pelvis jump in one tick, about 1250°/s. It is fixed for the feint only: a sin-shaped bump, with the pelvis keyed to the heading.

## 5. OLD vs V2 (identical entries; Lab "OLD | V2")

| Jog, fake left → exit right | OLD (VOCAB-1) | BODY FEINT V2 |
|---|---|---|
| False step | none | 0.23 m wide, toe-out 24°, knee 75° |
| Centre of mass toward the fake | 0.03 m | 0.12 m |
| Shoulder drop / trunk twist / pelvis yaw / head | 1° / 4° / 7° / 0° | 13° / 20° / 9° / 14° |
| Arms (hands fore-aft apart) | 0.58 m | 0.62 m |
| Request → touch | 0.45 s | 1.02 s (0.70 s from a fitting phase) |
| Useful exit | 0.48 s | 1.07 s |
| Speed before → lowest → 1 s after | 3.2 → 3.2 → 3.2 | 3.2 → 2.6 → 3.2 |
| Body events (visible / slow) · spikes | 0/0 · 0 | 0/1 · 0 |

V2 is slower to the exit: it pays for the lie. Whether the lie is worth 0.6 s cannot be measured without defenders, and no "fooled" score is invented.

## 6. Every curated case (`evidence/feint_measure.txt`)

| Case | False step plants | Load starts → max (m @ s) | Touch | Exit plant | Useful | v before / min / after | Drop · trunk · head | Body · spikes |
|---|---|---|---|---|---|---|---|---|
| FAKE LEFT → RIGHT | 0.70 | 0.73 → 0.12 @ 0.92 | 1.02 | 1.08 | 1.07 | 3.2 / 2.6 / 3.2 | 13° · 20° · 14° | 0/1 · 0 |
| FAKE RIGHT → LEFT (exact mirror) | 0.70 | identical | 1.02 | 1.08 | 1.07 | identical | identical | 0/1 · 0 |
| R → L, right-footed | 0.40 | 0.43 → 0.12 @ 0.62 | 0.72 | 0.78 | 0.77 | 3.2 / 2.6 / 3.2 | 13° · 20° · 14° | 0/1 · 0 |
| LOW-SPEED L → R (and mirror) | 0.45 | 0.47 → 0.08 @ 0.71 | 0.81 | 0.88 | 0.86 | 1.5 / 1.2 / 1.5 | 13° · 20° · 14° | 0/2 · 0 |
| RUNNING L → R (and mirror) | 0.71 | 0.75 → 0.13 @ 0.93 | 0.97 | 1.02 | 1.00 | 5.3 / 4.5 / 5.3 | 11° · 18° · 12° | 0/1 · 0 |
| SHALLOW | 0.68 | 0.71 → 0.08 @ 0.86 | 0.97 | 1.03 | 1.02 | 3.2 / 2.8 / 3.2 | 7° · 12° · 8° | 0/1 · 0 |
| STRONG | 0.71 | 0.75 → 0.16 @ 0.97 | 1.06 | 1.13 | 1.13 | 3.2 / 2.4 / 3.2 | 17° · 28° · 20° | 0/2 · 0 |

**Angular rates and steps** (`evidence/curated_angular.txt`; the owner's limit is "whip torso 1000 °/s"):
- **V2 cases:** pelvis yaw ≤ 300°/s, shoulder yaw ≤ 380°/s, shoulder roll ≤ 375°/s; pelvis vertical step ≤ 1.0 cm per tick; hand step ≤ 4 cm per tick.
- **The approved techniques, same measure:**
  - Cruyff: pelvis 915–1962°/s, shoulders 1223–1960°/s;
  - outside cut: 2109°/s.

## 7. Rapid input (`evidence/rapid_input.txt`; 14 sequences × as written + mirrored = 28 runs; in the Lab under RAPID INPUT)

| Sequence | Requests | Visible / slow | Notes |
|---|---|---|---|
| Fake L → exit R → at once LEFT | PLAYED; then a braking pivot | 0/0 | — |
| Fake L → exit R → at once FAKE R → exit L | both PLAYED (second touch 2.91) | 0/1 | the second feint waits for the first one's exit (§8.2) |
| Fake L → LEFT inside the lie | CANCELLED → carry | 0/0 | — |
| Fake R → cancel: straight on during the lie | PLAYED (the lie was committed) | 0/1 | shoulder roll 924°/s in the carry after it |
| Fake R → cancel: stick released during the lie | PLAYED | 0/0 | 8.7–11.3 cm hand step at the stop (§9.5) |
| Fake R → cancel before the window | CANCELLED | 0/0 | — |
| Feint → straight | PLAYED; B4 then a croqueta pair | 0/0 | 1036°/s shoulder roll between the two croqueta plans (the croqueta's own, §9.3) |
| Feint → hard cut RIGHT (outside cut 90°) | both PLAYED | 0/1 | 1967°/s in the outside cut (its own: 2109–3180°/s alone) |
| Feint → hard cut LEFT (stick −90°) | PLAYED; B4 a Cruyff | 0/1 | the Cruyff's own 1283°/s |
| Alternating feints × 4 at the feint's cycle, jog | **4/4 PLAYED** | **0/6** | mirrors identical |
| Alternating feints × 3, run | 2 PLAYED; 3rd REJECTED → Cruyff | 0/3 | the third asks 80° from the current line |
| Alternating feints × 3, walk | **3/3 PLAYED** | **0/7** | — |
| Alternating requests faster than a feint (every 1.25 s) | first PLAYED; 2nd and 3rd SUPERSEDED·ENTERED (the 2nd's feint abandoned before its touch, the 3rd's still touched at 4.32); the 4th runs past the replay's end | **1/3** | ‼ a 7 cm crossing in the plain **carry** after the first feint's exit touch (the far foot plays the ball across, §9.4) |
| Request spam (every 0.25 s) | 8 SUPERSEDED (2 of them ·ENTERED); the last one PLAYED | 0/1 | 1.3 cm pelvis step inside an outside cut B4 chose |
| **Total, 28 runs** | — | **2 / 48** | possession exits 0 · missed 0 · planted foot turned (> 20° in one stance) 0 |

**Fixed tonight for rapid input** (each is scoped to the feint and can be switched off for tools with `ABL=…`):
1. A feint requested during a feint was "fulfilled" by the still-running first instance, then reported CANCELLED. The running instance no longer counts (`bfseq`).
2. A new feint is not begun inside the previous one's authored exit (to the exit foot's landing after the exit touch). Its request window runs from there (`bfseq`). Begun earlier, the set touch's swing went through the planted exit leg: a 6 cm crossing.
3. An entry whose steps would leave both feet off the ground longer than the gait allows (0.13 s walking, 0.22 s running) is rejected (`bfflight`). It had made a 0.32 s float at a jog.
4. The approach drift rule from §4 (`bfdrift`).
5. A request replaced by a newer one is logged as SUPERSEDED, or SUPERSEDED·ENTERED when its technique had already begun. Before, rapid input left no record of it. This is a log change only; the curated replays are unchanged.

Tried and **reverted**, because they made things worse:
- a set touch never across the body / never beyond the standing foot (more rejections, more events);
- no set touch at all (the feint was then almost never possible);
- a slower channel hand-over after a feint (no effect: the spikes are the next technique's own).

## 8. Integrity and regression (feint2 vs ADV-4 HEAD c11579a3, the same machine)

| Check | BODY FEINT V2 | ADV-4 |
|---|---|---|
| Curated cases | 116 (10 new) · 92/101 all PLAYED · 0 exits · 0 missed · 10 normal-visible in 9 cases. **All 106 old cases line-identical.** | 106 · 82/91 · 10 in 9 |
| Extreme, ball on (140 runs) | normal 61 · slow 131 · 0 exits · 0 missed | 62 · 131 |
| Extreme, ball off (140 runs) | 61 · 69 | 61 · 69 |
| Body torture, 18 seeds × 60 s | **254 / 328** with the gait-cycle fix · **251 / 305** with `ABL=cycle9` (the old sentinels) | 251 / 305 |
| Possession torture, page config, 40 seeds | 10 losses (0.26/min), 0 missed. **Identical output.** | 10 |
| Determinism | 18/18 simulated twice + 18/18 replay path | same |
| Battery | 67/72 PLAYED (CRUYFF-CHOP-1's own 5 failures) | 67/72 |
| Intent torture (361 random manual requests incl. the V2 families) | 0 exits · 0 missed. V2 played 3 of 31 random requests: random angles and speeds are mostly outside its envelope, much like the V-turn (0/14) and the outside hook (0/13). | — |
| CPU (4 programs × 60 s, CONTROLLED, interleaved, best of 3) | 110.4 ms per simulated s · re-plans 40.8/s, mean 2.53 ms, p99 7.0 ms · worst tick 12.4 ms | 108.9 · 40.8/s, 2.49 ms, 6.9 ms · 10.6 ms |
| Browser (headless Chrome, `evidence/browser.json`) | 0 console errors · 0 HTTP errors. 10 curated + 14 RAPID INPUT cards: 128 buttons clicked, every one produced a replay; ▶ PLAY / OLD \| V2 / MIRROR at 1×; OLD \| V2 drew both lanes (9/9); the six cameras; FEINT DIAG on/off; frame step (paused, 1/60 s per click); TRY. ADV-4's 30 cards / 180 clicks and the croqueta trios as before. Sandbox: BODY_FEINT_V2 requested at a jog, PLAYED (BFEINT_R) | — |

**What the table shows:**
- **The feint leaves random play unchanged.** With `ABL=cycle9`, random play is identical to ADV-4 in both body torture and possession torture. B4 never chooses the feint: it is MANUAL only.
- **The +3 visible / +23 slow-motion is the gait-cycle fix (§9.1).** Those 18 minutes now have their arm swing, pelvis twist and bob after 9 s.

## 9. Findings for the owner

1. **The gait cycle freezes after 9 s of simulated time. This affects every build since BASELINE-88573ef0, including the locked one.**
   - **Cause:** `u_body.js cycle()` used ±9 (absolute seconds) as its "no footfall" sentinels. From 9 s onward no touchdown is ever found as "next", so the phase sticks at 0.5.
   - **Effect:** the arm swing, pelvis twist and bob stop for the rest of a sandbox session.
   - **Measured on the committed ADV-4 build, straight jog:** right-hand fore-aft swing 46.8 cm at 5–6 s and 8–9 s, **0.0 cm at 10–11 s**.
   - Lab replays are shorter than 9 s, but the sandboxes run indefinitely.
   - **Fixed in `feint2` only**, with ±∞ sentinels (`ABL=cycle9` restores the old ones). The locked baseline and earlier builds are untouched. **Owner decision:** whether to carry the fix over.
2. **The approach-drift snap in every template with a drift** (§4). Fixed for the feint only.
3. **Spikes above 1000°/s in the approved / existing techniques** (not the feint's):
   - Cruyff 1223–1962°/s;
   - outside cut 2109–3180°/s, with a 5.7 cm crossing alone;
   - croqueta hand-overs 1022–1036°/s.

   Reported, not touched.
4. **The plain carry can play a ball that is across the body with the far foot.** After a feint's exit touch under requests faster than a feint can complete, it made a 7 cm crossing. This is the remaining visible event of the rapid set.
5. **The stop's hand step.** When the body comes to a stand (no next footfall), the gait phase falls back to 0.5 and the arms jump 8–11 cm in one tick. This is pre-existing, the same fallback as (1).

## 10. Limitations

- **Request latency is set by the stride.** At a jog: 0.70–1.02 s from request to touch. It waits for the full entry whenever the short one would steer toward the exit first.
- **The family is jog-centred.** Walk (1.0–2.9 m/s) and run (4.0–7.6 m/s) have their own variants. Nothing is authored for a sprint.
- **The exit angle is 12–90° (comfort 25–70°).** An 80° alternation from a run is rejected.
- **Alternating feints work at the feint's own cycle (≈ 1.9 s apart).** Faster requests supersede each other.
- **No defenders,** so there is no "fooled" score and no protection value.
- **The visual read at 1× is unverified by me.** I cannot play video in real time.

## 11. Owner decisions

1. **The look at 1×.** Amplitude (shallow / normal / strong) and the false phase's length, ≈ 0.3 s from the false step to the touch.
2. **The entry trade-off.** Keep refusing the short entry when it would steer toward the exit (latency up to 1.02 s at a jog), or accept the steer for speed.
3. **The gait-cycle fix (§9.1).** Carry it to other builds, or keep it in `feint2` only.
4. **Classification.** MANUAL / REVIEW as built (B4 never plays it). AUTO only with defenders.

## 12. The Lab (`feint2_lab.html`): the BODY FEINT V2 section, first

- **Camera bar:** GAMEPLAY · FRONT · REAR · SIDE (close) · SIDE · OVERHEAD CLOSE.
- **FEINT DIAG**, off by default. It shows:
  - the pelvis position and facing;
  - the shoulder line and the chest's facing;
  - the support feet and their load;
  - the centre of mass;
  - the false and the true direction;
  - the ball.
- **Cards:** FAKE LEFT → RIGHT · FAKE RIGHT → LEFT · R → L right-footed · LOW-SPEED both ways · RUNNING both ways · SHALLOW · STRONG · OLD (VOCAB-1).
  - Each card has ▶ PLAY (1×), OLD | V2 (two lanes from the identical entry and input), MIRROR, TRY (live, manual) and 1× / 0.5× / 0.25×.
  - The replay bar has frame stepping and scrubbing.
  - The small REPLAY box at the bottom right is the baseline sandbox's last-action replay. It has its own 0.25× default and is not the Lab's rate.
- **RAPID INPUT:** the 14 sequences of §7, each with PLAY / MIRROR / rates.
