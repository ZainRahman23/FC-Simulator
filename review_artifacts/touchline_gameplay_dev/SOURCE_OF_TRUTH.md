# CURRENT TOUCHLINE GAMEPLAY DEVELOPMENT — source of truth

Milestone of 23 Oct 2026. **Nothing here is frozen except the items marked FROZEN / LOCKED.** Owner instruction (verbatim): `sources/2026-10-23_user_instruction_preserve_publish.md`. Machine-readable copy: `MANIFEST.json`.

## 1. Where it is

| | |
|---|---|
| Repository | **https://github.com/ZainRahman23/FC-Simulator** (remote `fc-simulator` in the `dribble-1` worktree). `origin` there is a different repo (TouchlineSimulator); do not use it. |
| Development branch | **`prototype/dribble-1`** — the working line. All gameplay work since 20 Oct is on it. |
| Milestone | tag **`checkpoint/touchline-gameplay-dev-2026-10-23`** (immutable) · branch **`milestone/touchline-gameplay-dev`** (same commit; advance it only by fast-forward to the next coherent milestone) |
| Code commit | **`0c65eac3`** — the last commit that changes source (BODY FEINT V2). Every later commit up to the tag is documentation or housekeeping only. |
| Local checkout | `/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1` |
| Serve | from the checkout root: `python3 -m http.server 8361 --bind 127.0.0.1` |
| Retrieve | `git fetch https://github.com/ZainRahman23/FC-Simulator.git 'refs/tags/checkpoint/touchline-gameplay-dev-2026-10-23:refs/tags/checkpoint/touchline-gameplay-dev-2026-10-23'` then `git checkout -b <yours> checkpoint/touchline-gameplay-dev-2026-10-23` |

**Local only:** the characters are real players' models. Never publish the pages or captures to claude.ai or any web host.

## 2. The current build is `sandbox/visual/feint2/`

All gameplay lives in browser-sandbox prototypes under `sandbox/visual/`. **None of it is wired into the production game** (`server.py`, `web/`, `simulator/` are untouched since `main`).

Each milestone folder is a **copy** of the previous one, and the previous folder is kept unchanged as the A/B reference. The newest folder is the current build:

```
tc_baseline_88573ef0 (LOCKED; owner-approved 88573ef0)
 → tc_layered (B1–B6 layers) → tc_layered2 (B4 + B5) → tc_unified1 (UnifiedSim + Astra's A99-C + support gait)
 → tc_controlled1 (CONTROLLED ball) → speed99 (S99 38 km/h · D38; s99.html) → ballon1 (CARRY-B) → phys1 (ratings · Agility scale B)
 → vocab1 (DRIBBLING VOCAB-1) → cruyff_chop1 (elite Cruyff / chop) → adv4 (croqueta · V-turn · Matthews · stop-and-go; croqueta refinement c11579a3)
 → feint2  ← CURRENT (BODY FEINT V2, 0c65eac3)
```

`feint2/` differs from `adv4/` only in `u_tc.js`, `u_body.js`, `v_tech.js`, `v_meta.js`, `v_cases.js` and `u_viewer.js` (`BODY_FEINT_V2_REPORT.md`, HANDOFF). Every other module is byte-identical to `adv4/`.

## 3. Component map (paths relative to `sandbox/visual/`)

| Component | Current source | Notes |
|---|---|---|
| **Simulation** | `feint2/c_sim.js` `ControlledSim` ⟶ extends `feint2/u_sim.js` `UnifiedSim` ⟶ extends `feint2/u_tc.js` `PlaySim` | `c_sim`: the CONTROLLED ball model. `u_sim`: 88573ef0's sim + A99-C + the shared support plan + B4 / B5. `u_tc`: the layered copy of 88573ef0's PlaySim + Technical Control. |
| Ball / contact physics | `tc_baseline_88573ef0/pt_ball.js` → `dribble15/d15_core.js` (**FROZEN**, tag `dribble-v1-foundation-1`) → `ballfeel13/` → `ballfeel12/` → `ballfeel11/` → `ballfeel1/`, `ballphys1/`, `physchar2/core/v2_math.js`, `dribble1/d1_rng.js`, `dribble1/d1_attrs.js` | the shared modules are 88573ef0's, checked by the lock check |
| **Movement** (Agility) | `agility99/movement.js` (**Astra's A99-C — never modify**) and `feint2/s_movement.js` (a verbatim copy plus two pace hooks that are inert at CURRENT pace) | `agility99/support.js` and `direction_body.js` (Astra's support-body V1.1) are **not** used by feint2 |
| **Pace** | `feint2/pace.js` (S99 38.0 km/h · D38) · `feint2/ratings.js` (Sprint / Acceleration / Agility ratings, scale B) · `feint2/carry_env.js` (CARRY-B ball-on envelope) | |
| **Body / PlayBody** | `feint2/u_body.js` `PlayBody` | Built on 88573ef0's presentation (`tc_baseline_88573ef0/pt_body.js`), `technical_control15/tc15_ref.js` and `receive_turn11/rt11_body.js` (`HumanTurnBody`). Holds the continuous foot timeline, the committed landings, the gait cycle (arm swing / pelvis twist / bob; **9 s fix here only**) and the feint channels (`armSide` `armHold` `shDrop` `headYaw`). |
| **Gait / support** | `feint2/u_gait.js` (`bodyGaitFrom`: Astra's `agility99/body_gait.js` + one TC line) · `agility99/body_gait.js` · the support rules in `feint2/u_tc.js` | The support rules are ABL-switchable for tools: `ant app heel pivkeep set side turn dup pivot` (VOCAB-1), `bfdrift bfseq bfflight cycle9` (feint). The S99 leg fixes are in `u_body` / `u_gait`: planted-foot yaw hold, plant pivot ≤ 5°/tick, compression ramps. |
| **Leg / IK** | `technical_control11/tc11_leg.js` (`legIK`, ROM, boot hull, ball gap) for the sim and body; `anim3d/ik.js` for the renderer rig | |
| **Technical Control** | `feint2/u_tc.js` (templates → `instantiate`, `channels()`, the skill-request state machine, B4 outcome scoring, B5 exits, `TRIMMED` / `ENTRY_FAMILY` entries) + `feint2/c_sim.js` (CONTROLLED) | |
| **Dribbling vocabulary** | `feint2/v_tech.js` (authored templates: `ELITE` Cruyff / chop, `VTURN`, `MATTHEWS_C`, `DEADEN` / `HESITATE`, `BFEINT_L/J/R/JS/JX`, …) · `feint2/v_meta.js` (catalogue, STATUS, AUTO / MANUAL, `AUTO_TECH`) · `tc_baseline_88573ef0/pt_tech.js` (base techniques) | In `v_meta`, STATUS `INTEGRATED` means "in the sandbox's automatic library". It is an engineering tag, **not owner approval**. |
| **Character skeleton / rendering** | classic scripts loaded by the page: `anim3d/m4.js` `skeleton.js` `ik.js` `of_rig.js` `of_motion.js` `of_loco.js` `of_character.js` `of_char_gl.js`, `run1/run1_gait_v13.js` (**FROZEN**, tag `locomotion-v2-straight-baseline-1`) | Assets `assets/characters/outfield/<name>/{rig.json, mesh.bin, atlas.png}`, default `vinicius`, `?char=` to switch. Also `dribble1/d1_colliders.json` and `tc_baseline_88573ef0/pt_baked.json`. |
| **Viewer / review** | `feint2/u_viewer.js` (Lab + sandbox UI, cameras, FEINT DIAG, OLD \| V2, replays) · `feint2/v_cases.js` (curated cases, `BF_COMPARES`, `BF_RAPID`) · `feint2/v_run.js` (deterministic runner shared with node) | The page's engine switch: `layered` = feint2 `ControlledSim` + `PlayBody`; `baseline` = the locked 88573ef0 `PlaySim` + `PlayBody`. |

ES-module chain from the page: `feint2_lab.html` → `feint2/u_viewer.js` → { `c_sim` → `u_sim` → `u_tc` → (`pt_ball` `pt_params` `pt_tech` `v_tech` `v_meta` `agility99/movement` `tc11_leg`); `u_sim` → (`s_movement` `pace` `carry_env` `agility99/body_gait` `u_gait`); `u_body` → (`tc15_ref` `rt11_body` `tc11_leg` `pt_ball` `v_tech`); `ratings` `u_tests` `s_tests` `v_cases` `v_run` `tc_baseline_88573ef0/{pt_sim, pt_body, pt_input}` }.

## 4. Playables (LOCAL, server on :8361)

- **Current Lab:** http://127.0.0.1:8361/sandbox/visual/feint2_lab.html. The BODY FEINT V2 section comes first, then every earlier curated case.
- **Current joystick sandbox:** http://127.0.0.1:8361/sandbox/visual/feint2_sandbox.html.
- **Latest the owner has reviewed:** BODY FEINT V2, in these two pages. On 23 Oct the owner called it "an improvement", not approved.
- **Earlier pages the owner gave verdicts on (kept unchanged as references):**
  - `adv4_lab.html` (the croqueta recording of 22 Oct);
  - `cruyff_chop1_lab.html` ("hierarchy is looking good");
  - `ballon1.html` (CARRY-B);
  - `phys1.html` (Agility B);
  - `tc_controlled1.html` ("much, much better");
  - `tc_layered.html` (the layer verdicts);
  - `tc_baseline_88573ef0.html` (the approved, locked baseline).

## 5. Status

| | Component | Basis |
|---|---|---|
| **LOCKED** | BASELINE-88573ef0 (`tc_baseline_88573ef0*`) | owner-approved foundation, 20 Oct; tag `tc-baseline-88573ef0-locked`; never modify |
| **FROZEN deps** | DRIBBLE-V1 foundation (`dribble15/`), RUN-1.3 straight gait (`run1/run1_gait_v13.js`) | tags `dribble-v1-foundation-1`, `locomotion-v2-straight-baseline-1` |
| **APPROVED** (owner decisions; not frozen) | Sprint Speed 99 = 38.0 km/h and the Sprint mapping · Acceleration 99 = D38 · A99-C as the Agility-99 ceiling ("selected provisional ceiling") · Agility scale B · CARRY-B (the "provisional D99 / BC99 envelope") · CONTROLLED possession ("much, much better") · the hook → Cruyff / Ronaldo-chop hierarchy ("looking good", 22 Oct) | owner messages 21–22 Oct; recorded in the milestone STATUS files |
| **PROVISIONAL** (built, presented, owner review open) | B4 / B5 ("promising — develop") · Technical Control 1.x carry / contact model · the support, committed-landing and leg fixes (TC-UNIFIED-1, S99, VOCAB-1) · DRIBBLING VOCAB-1 library · CRUYFF-CHOP-1 elite templates · **ADV-4**: croqueta + its refinement `c11579a3`, V-turn, compact Matthews, stop-and-go (stopped for owner review, not frozen, 5 decisions open in `adv4/ADV4_REPORT.md` §9) · **BODY FEINT V2** (4 decisions open in `body_feint_v2/BODY_FEINT_V2_REPORT.md` §11) · the 9 s gait-cycle fix (feint2 only) | the owner listed carry / Cruyff / chop / croqueta / V-turn / Matthews / stop-and-go / movement / CONTROLLED as the "current known-good" regression set (23 Oct) — that protects them from regression, it does not freeze them |
| **EXPERIMENTAL** | heel chop, roulette, SOL sole roll, the old FNO / FNI body feints (owner: "failures visually"), B2 (optional toggle) · Astra's A99-C support-body V1.1 (`agility99/support.js`, `direction_body.js`: handoff only, BALL ON not integrated) · Acceleration / Agility mappings below 99 · REJECTED and kept as records: TC-RESPONSIVE-1, PLAYTEST-1.2, B1 / B3 / B6 | |

## 6. Known issues (measured; none hidden)

1. **Gait-cycle freeze after 9 s** of sim time (`cycle()` ±9 sentinels): no arm swing, pelvis twist or bob. It affects every build since 88573ef0, including the locked baseline. It is fixed in `feint2` only (`ABL=cycle9` restores the old behaviour). Carrying it further is the owner's decision.
2. **Angular spikes above 1000°/s:**
   - the Cruyff (1223–1962°/s);
   - the outside cut (2109–3180°/s, plus a 5.7 cm crossing);
   - the croqueta hand-overs (≈1030°/s);
   - every template's approach-drift snap (≈1250°/s; fixed for the feint only).
3. **The carry's far-foot crossing** (7 cm) when feints are requested faster than one can finish (rapid-input stress case); a hand step at a stop (8–11 cm in one tick).
4. **Random-play body totals** (18 × 60 s): normal-visible 254, slow-motion 328 (mostly CROSS / FLOAT / KNEE). Possession torture: 10 observed losses in 40 seeds (0.26/min), 0 missed contacts.
5. **The croqueta refinement:** slow-motion events per touch 0.31 vs 0.22; the random-play totals are inconclusive (452 vs 410). A99-C's low-speed facing whip (≈1000–1200°/s at a reversal's stop) causes crossings, and is an Agility decision. The fake stop keeps a 0.22 s float.
6. **The D38 cap** is not applied to the Cruyff / chop (capped, the Cruyff at a run is 1.05 → 1.13 s).
7. **The Body Feint V2's limits:**
   - the request → touch latency depends on the stride (0.70–1.02 s at a jog);
   - no sprint variant;
   - exits limited to 12–90°;
   - no defenders, so no "fooled" measure.
8. **Astra's support body** (not used by feint2): with the ball on, 51 / 144 contacts are more than 10 cm from the ball; the owner judged its straight running worse than 88573ef0's.
9. **No production integration:** nothing here runs in `server.py` / `web/`.

## 7. Test commands (from the checkout root; node ≥ 18)

```sh
bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh          # must PASS before every commit
cd sandbox/visual/feint2/tools
node v_cases_run.mjs --body 1                 # = review_artifacts/body_feint_v2/evidence/cases.txt
node feint_measure.mjs                        # = evidence/feint_measure.txt
node feint_rapid.mjs                          # = evidence/rapid_input.txt
node v_det.mjs --seeds 18 --dur 30            # = evidence/determinism.txt
node v_battery.mjs                            # = evidence/battery.txt
node v_extreme.mjs --ball 1                   # = evidence/extreme_ball_on.txt   (--ball 0 → extreme_ball_off.txt)
node v_bodytort.mjs --seeds 18 --dur 60       # = evidence/body_torture_18.txt   (ABL=cycle9 → body_torture_18_ABL_cycle9.txt)
node c_torture.mjs --configs CONTROLLED --seeds 40 --dur 60 --pace D38 --vocab EXPANDED --carry B --verbose   # = evidence/torture_page_40.txt (except its CPU figures)
node v_cpu.mjs                                # CPU vs adv4 (timing, not byte-comparable)
PUPPETEER_NODE_MODULES=<dir with puppeteer-core> PT_TMP=<dir> node v_browser.cjs --out <dir>   # headless Chrome; needs the :8361 server
```

Each deterministic line reproduces its committed evidence file byte for byte; the torture's CPU figures are timings and vary (re-run 23 Oct: `PUBLICATION_CHECKS.md`).

## 8. Rules for the next session

- Never modify `tc_baseline_88573ef0*`, `agility99/movement.js`, the frozen folders, or any earlier milestone folder. Build beside them: copy the newest folder.
- Claude does no tackle work; the Codex tackle branches are read-only.
- Save owner instructions verbatim under `review_artifacts/<milestone>/sources/`. No freezing or integration without the owner's word. Only owner screenshots go into Git; no third-party footage.
- Each earlier milestone has `review_artifacts/<milestone>/` with REPORT, HANDOFF, STATUS.json and evidence.
