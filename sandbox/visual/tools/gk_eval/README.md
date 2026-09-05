# Goalkeeper V1 evaluation tooling (deterministic)

Measurement harnesses for the JS playtest keeper in `sandbox/visual/match.js`. Everything fires **real production
shots** (or controlled synthetic arrivals) into a deterministic 60 Hz playtest with no RNG: identical inputs give
byte-identical JSON. Nothing here is an objective — never tune keeper constants against these numbers.

All tools take `--url` (default the mirror server `http://127.0.0.1:8126/sandbox/visual/match.html`; point it at a
frozen `_<tag>_match.html` copy to compare builds) and need `PUPPETEER_NODE_MODULES` (a scratch `node_modules` with
`puppeteer-core`) and `GK_EVAL_PROFILE_DIR` (where Chrome profile dirs are created). Google Chrome is launched headless.

## Core corpus harnesses

| tool | purpose |
|---|---|
| `gk_profile_goalface.js` | **matched multi-profile goal-face corpus**: one dead-centre shooter (default apex of the D, 20.15 m) fires an aim × charge sweep of production STRAIGHT (laces) and INSIDE_R shots; keeper-OFF once per shot (goal-line crossing = the shot's coordinate), keeper-ON once per profile with a full reset. Profiles are explicit attribute bundles (no OVR anywhere): K1/K2/K3, COURTOIS (our players.json ratings), tier-free fixtures POOR/AVERAGE/GOOD/ELITE, style fixtures TALL_SLOW/SHORT_EXPLOSIVE/HANDLER/STOPPER, single-attribute sensitivity profiles. Options: `--profiles`, `--sweep "reflexes=40,50,…" --base K1` (one attribute varied, everything else held), `--dist 16 --angle 30` (shooter placement; aims span the mouth; D2 SET solved from the shooter), `--holdPositioning false`, `--compact`, `--set "GK_REACH.envExp=2.0,…"` (in-page constant overrides, recorded in `meta.sets`), `--aimN/--chargeN/--cmin/--cmax`, `--determinismN`. |
| `gk_run.sh <outdir> <label> [args]` | self-terminating runner for the above (the harness writes its dataset before it may hang on browser close); `GK_PAGE=_tag_match.html` selects a frozen page. |
| `gk_gather_battery.js` + `gk_gather_lib.js` | **controlled arrivals** at the SET keeper: `WHICH=ground` (rollers with realistic run-ups, low air, bounce, drop, point-blank `rollNear`; speeds 1–15 m/s; laterals 0…±1 m) and `WHICH=chest` (8–32 m/s at stomach → head, laterals 0…±0.4, from 3/5/8 m and 12 m). `PROFS=…` or `SWEEP="handling=40,…" BASE=K1`. |
| `gk_envelope.js` | save-envelope maps from synthetic launches (goal-line or keeper-plane grids, controlled flight/usable time). |
| `gk_reach_envelope.js` | executed (empirical) reach envelope measurement. |
| `gk_rebound_chains.js` | multi-contact scenarios (keeper → post → goal, …) with a tunnelling detector. |
| `gk_eval_battery.js` | the original shooter-matrix battery (positions × techniques × charges × aims). |
| `gk_attr_monotonic.js`, `gk_trace_cell.js`, `gk_goalface_audit.js` | earlier per-attribute / per-cell tracers and the single-profile goal-face audit. |

## Read-only page probes

| tool | purpose |
|---|---|
| `gk_reach_analytic.js` | closed-form envelope from the live constants per profile (hand-centre / fingertip / ball-centre; coupling checks) plus `--finite 0.2,0.3,…` finite-time envelopes from the causal action-time model and the full-stretch execution time. |
| `gk_constants_dump.js` | every keeper constant block + reference attributes + the attribute transforms, as JSON (baseline record input). |
| `gk_hud_smoke.js` | real render loop with a shot: page errors, outcome, screenshot. |

## Analysis (Python; matplotlib for sheets)

| tool | purpose |
|---|---|
| `gk_attr_curves.py sweep.json` | attribute **response curves**: owned quantities (from the page env record), outcome metrics, hard-subset band saves, adjacent-step monotonicity with loss classification (contact lost / same contact different outcome / same contact & outcome rebound / geometry). |
| `gk_profile_bands.py dataset.json --ref X` | band table + matched-shot gains/losses vs a reference for all profiles in one dataset (fixture ladder, styles, interaction grids). |
| `gk_distance_angle_table.py d30=… d8=…` | contact / save / catch vs shooter distance or angle, reaction-bound share, usable time, SET depth/lateral per placement. |
| `gk_goalface_compare.py A=a.json B=b.json` | side-by-side BEFORE/AFTER of whole datasets (all + hard subset, bands, corners, monotonicity). |
| `gk_profile_goalface_render.py`, `gk_goalface_audit_render.py`, `gk_goalface_trace_render.py` | heat-map sheets for goal-face datasets. |
| `gk_gather_analyze.py`, `gk_gather_tables.py`, `gk_gather_sheets.py`, `gk_handling_battery_table.py` | battery tables and sheets (before/after, Handling sweep). |
| `gk_sensitivity_check.py` | Handling / height independence checks (contact identity, catch agreement). |
| `gk_acceptance_table.py` | the reference-profile acceptance table (attributes, hard save, bands, corners, reach, latency, gathers, chest catches, catch/parry shares). |
| `gk_pointblank_audit.py` | point-blank inversion listing with keeper state and arm-gap candidates. |
| `gk_baseline_record.py` | machine-readable baseline record of one build (constants + corpus/battery/analytic summaries). |
| `gk_envelope_render.py`, `gk_envelope_plots.py`, `gk_envelope_sheet_from_maps.py` | envelope sheets. |
| `runs/` | the batch scripts used by the attribute-system pass (`attr_sweeps.sh`, `fixtures_styles_distance_angle.sh`, `interactions.sh`, `analyze_all.sh`) — examples of the sequencing; outputs go to a scratch directory. |

## Tracked vs generated
Source (tracked): every `.js`, `.py`, `.sh` here and `README.md`. Generated (never commit): the JSON datasets (tens of MB
each), Chrome profile dirs (`.gk-*`, `chrome-*`), PNG sheets and the `review_artifacts/` records they feed. Frozen page
copies `_<tag>_match.html/.js` live in the mirror server directory, not in the repo.

## Determinism
Two runs of the same build produce byte-identical datasets apart from the `generated` timestamp; each corpus run also
repeats a sample of shots (`--determinismN`) and checks the keeper-OFF crossing equals a no-keeper run.
