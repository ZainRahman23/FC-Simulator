# BASELINE-88573ef0 — the restored joystick playtest (before PLAYTEST-1.2)

**Page (local only — the character is a real player's model, never published):** http://127.0.0.1:8361/sandbox/visual/tc_baseline_88573ef0.html
**One-click switch:** the green strip at the top-left links to PLAYTEST-1.2 (`tc_playtest1.html`), whose yellow strip links back here.
**Owner instruction (verbatim):** `sources/2026-10-20_user_instruction_restore_baseline_88573ef0.md`

## What it is

The playable state of commit **88573ef0** (20 Oct 13:48 +0300, "the on-screen movement joystick"). That is the last commit before the owner's rapid-direction instruction that became PLAYTEST-1.2. It includes:
- WASD;
- the analog stick with walk / jog / run zones;
- the SPRINT / WALK buttons;
- replay with the stick drawn;
- 0.5× and 0.25×.

It contains **none** of PLAYTEST-1.2's changes:
- no intent deferral;
- no in-flight landing commitment;
- no feet-order pelvis band, gait validation or own-side touch rules;
- no ballFits;
- no CONTROL HUD;
- no torture preset;
- no deterministic-trig switch.

Tag: `tc-baseline-88573ef0` → 88573ef0 (local).

## How it was restored (nothing was overwritten)

The code is `git archive 88573ef0 sandbox/visual/tc_playtest1` extracted into `sandbox/visual/tc_baseline_88573ef0/`, at the same directory depth, so every shared import resolves as it did. The page `tc_baseline_88573ef0.html` is 88573ef0's `tc_playtest1.html`.

Only these differ from the commit:
- the page's module path;
- the viewer's `pt_baked.json` fetch path;
- the title;
- the version strip.

Every shared module the baseline imports is unchanged since 88573ef0 (`git diff 88573ef0 HEAD` touches only `tc_playtest1/`, `tc_playtest1.html` and the PLAYTEST-1.2 report folder).

Never modify `tc_baseline_88573ef0/`. Experiments are built beside it.

## Verification (`evidence/`)

| check | result |
|---|---|
| `BL_FILES_VS_88573ef0.txt` | 18 / 19 files byte-identical to the commit's blobs; `pt_viewer.js` differs only in the fetch path |
| `BL_STICK_INPUT_TESTS_rerun.txt` | the commit's own stick tests, re-run from the restored copy: **identical** to 88573ef0's committed `PT1_STICK_INPUT_TESTS.txt` |
| `BL_INPUT_TESTS_rerun.txt` | the commit's own input tests: **identical** to `PT1_INPUT_TESTS.txt` |
| `BL_BROWSER_CHECK.json` | Chrome: the page loads its own code; sprint → stick snap 90° right = Ronaldo chop L; 9 contacts, 0 missed; determinism identical; no errors / missing files |
| `BL_NODE_EQUALS_BROWSER.txt` | node re-simulation of that session: identical |

Outcomes the owner remembers, re-run from the restored copy:
- **sprint, stick rotated smoothly 0 → 90°:** carry only;
- **sprint held at 60°:** outside cut R;
- **sprint snap 90° right:** Ronaldo chop L;
- **sprint snap 150° right:** drag-back R;
- **run snap 137° left:** inside hook R.
