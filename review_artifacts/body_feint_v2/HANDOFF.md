# BODY FEINT V2 — handoff

- **Lab:** http://127.0.0.1:8361/sandbox/visual/feint2_lab.html. The BODY FEINT V2 section is first, with its camera bar, FEINT DIAG, the curated cards and RAPID INPUT.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/feint2_sandbox.html.
- **The code** is `sandbox/visual/feint2/`, a copy of `adv4/` at c11579a3. `adv4/`, `cruyff_chop1/`, `vocab1/` and the locked `tc_baseline_88573ef0*` are unchanged.
- **Local only:** the character is a real player's model.

| File | What changed |
|---|---|
| `v_tech.js` | `bodyFeintOf(o)`: the template, with time scale `tS`, amplitude `amp`, reference speed `v0`, cost and exit stance length `sd`.<br>`BODY_FEINT_V2` = `BFEINT_L` / `_J` / `_R` / `_JS` / `_JX`, spread into `NEW_TEMPLATES`. |
| `u_tc.js` | the four channels (`armSide`, `armHold`, `shDrop`, `headYaw`) in `channels()` and `instantiate`<br>the feint's approach: a sin-shaped drift bump, the pelvis keyed to the heading and blended from its facing (`prog.bf`, `psiOff`)<br>`TRIMMED` + `ENTRY_FAMILY` for the five ids<br>the drift-direction rule (`bfdrift`)<br>the no-flight rule (`bfflight`)<br>the sequence rules: `bfEnd` in `adopt()`; the request window extended; the running instance does not fulfil a new request (`bfseq`)<br>SUPERSEDED requests logged |
| `u_body.js` | the channels: arm abduction / hold, the clavicle drop, the head's yaw<br>**`cycle()` sentinels ±∞** (`ABL=cycle9` restores ±9: the 9 s freeze, report §9.1) |
| `v_meta.js` | `BODY_FEINT_V2` (`BFEINT_L` / `J` / `R`), `_SHALLOW` (`JS`), `_STRONG` (`JX`): MANUAL / REVIEW |
| `v_cases.js` | the BODY FEINT V2 curated cases<br>`BF_COMPARES` (OLD \| V2)<br>`BF_RAPID` (14 rapid-input sequences) |
| `u_viewer.js` | the BODY FEINT V2 section (cameras, FEINT DIAG overlay `feintOverlay`, cards, RAPID INPUT)<br>`ALL_CASES` + `BF_RAPID` |
| `../feint2_lab.html` | the section's styles |

## Tools (`feint2/tools/`)

- `node feint_measure.mjs [--only s] [--json f]` — the curated feint cases on the posed body. It reports:
  - timings: false load, maximum, reversal, touch, exit plant, useful exit, control;
  - the lie: shoulder drop, trunk / pelvis yaw, false step offset and toe, support knee, arms, head;
  - speeds: before / min / after;
  - integrity: body events and angular spikes.
- `node feint_rapid.mjs [--only s] [--json f]` — `BF_RAPID`, as written and mirrored. It reports:
  - body classes;
  - yaw / roll spikes over 900°/s;
  - pelvis horizontal and vertical steps;
  - hand steps;
  - planted-foot turns;
  - request results.
- `v_cpu.mjs` now compares against `adv4`.
- `ABL=` switches: `bfdrift`, `bfseq`, `bfflight`, `cycle9` (plus ADV-4's and CRUYFF-CHOP-1's).

## Evidence (`review_artifacts/body_feint_v2/evidence/`)

| File | What it holds |
|---|---|
| `feint_measure.*` | the curated cases (report §6) |
| `rapid_input.*` | rapid input (§7) |
| `curated_angular.txt` | V2 and approved techniques, angular rates and steps |
| `cases.*` | all 116 curated replays |
| `extreme_ball_on` / `_off` | the extreme reversal scenarios |
| `body_torture_18.txt` | 18 seeds, gait-cycle fix on |
| `body_torture_18_ABL_cycle9.txt` | 18 seeds, the old sentinels |
| `adv4_ref/` | the same checks on ADV-4 HEAD, run tonight on the same machine |
| `torture_page_40.txt` | possession torture, page config (the comparable one) |
| `torture_defaultcfg_40.txt` | the tool's defaults |
| `determinism.txt` | determinism |
| `battery.txt` | the technique battery |
| `intent_torture.txt` | random manual requests under torture |
| `cpu.txt` | CPU against `adv4` |
| `browser.json` | the headless Chrome run (no images are committed, as for the earlier dribbling milestones) |

## Not done / next on the owner's word

1. The 1× review: the curated cards, OLD | V2 and RAPID INPUT.
2. The four decisions in report §11.
3. The open items from report §9:
   - the carry's far-foot crossing under over-fast alternation;
   - the stop's hand step;
   - the drift snap in other templates;
   - the spikes in the Cruyff / outside cut / croqueta.
