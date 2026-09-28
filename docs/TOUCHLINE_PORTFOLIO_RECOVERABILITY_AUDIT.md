# Touchline — Portfolio Recoverability Audit

For each meaningful stage in `docs/TOUCHLINE_DEVELOPMENT_CHRONICLE.md`: what survives, and whether that historical state could later be reproduced for portfolio screenshots and clips.

**Method.** Inventory only (28 Sep 2026): filesystem listings, Git metadata, archive listings and existing documents. Nothing was executed: no builds, servers, browsers, captures or installs. Every "runnable" judgement below is a **prediction from the files present**, not a test.

## Recoverability classes

| Class | Meaning |
|---|---|
| **A** | Directly runnable historical state: the original files exist and open or run as they are |
| **B** | Runnable after lightweight setup: a Git worktree at the right commit, a Python environment, a local static server, a data copy |
| **C** | Source or artifacts survive, but reconstruction would be needed: missing data, regeneration, or a build step with unknown outcome |
| **D** | Only screenshots or review media survive |
| **E** | Not enough evidence to reproduce visually |

**The general rules for later capture:**
1. **Git-era states:** check out the exact commit into a *throwaway worktree*, never the working tree, and never make current code imitate an old state: `git worktree add ../tl-hist-<ref> <ref>`.
2. **Pre-Git release states:** run a **copy** of the `~/TouchlineRC1` app folder with a **copy** of its database. Running in place would write to the preserved backups.
3. **Where a historical screenshot or review sheet already exists** and the state cannot be reproduced exactly (live matches, lost art, other accounts), **use the original.** It is better evidence than a recreation.

## Shared launch facts (from the files, not tested)

- **The engine API.** `server.py` (FastAPI, port 8000) needs Python 3.12 with `fastapi 0.141.1`, `uvicorn 0.52.3` and `pydantic 2.13.4`.
  - Environments present: the repository `.venv`, and `~/TouchlineRC1/venv` (Python 3.12.4 with fastapi).
  - The data directory is taken from `TOUCHLINE_DATA_DIR`; the default is `<repo>/data_rc`, which is git-ignored and created empty on first run.
- **The match page.** `sandbox/visual/serve_match.py` serves static files on port 8124 and proxies `/api` to 8000. It exists from `9d3ed6a` (27 Aug).
  - Its **playtests are client-side**: Single Player Test from `cbfd5d8`, `?gkPlay=1` from `1e41af3`, `?ofPlay=1` from `c11b70c`.
  - Without the engine, the page's live-match call fails and it carries on.
- **Deterministic scenario sources:**
  - `verify_determinism.py` fixtures (Aug);
  - `GK_SCENARIOS` (43 → 80 fixtures, Sep);
  - `tools/anim3d` scenario files for outfield, dribbling, shooting, squad, defending, reactions and slides;
  - `of_autopass.js` and the defending demos.
- **Capture tooling in the repository.** `tools/anim3d/capture.js`, `of_rp_probe.js --frames`, `of_rp_media.py` and `of_slide_media*.sh`. They need Chrome with a GPU and a `puppeteer-core` install that is **not in the repository** (`PUPPETEER_NODE_MODULES`). The skeletal and 3D stages need WebGL2 on the GPU; the software renderer is about 50× slower.

---

## Milestone inventory

Columns, as requested: date · milestone · why it matters · exact source (type · path/ref) · runnable as-is? · likely launch method · dependencies known? · deterministic scenario? · existing media? · fresh capture likely? · confidence · risks / missing pieces. Each era is laid out as one table.

### Era 1 — The simulator and the first website (18 Aug, chat era) — **recovered originals**

**The archive.** `review_artifacts/history_primary_2026-08-18/TOUCHLINE_2026-08-18_PRIMARY_ARTIFACTS.zip`
- Local record, read-only, not in Git; SHA-256 `8e2ae7a5…6555`, 18,741,312 bytes.
- 56 files, all verified against `MANIFEST.tsv` on 28 Sep, and the six v0.1–v0.6 package hashes match the owner's recorded values. The v0.7 package is identical to `~/Downloads/fc_simulator_v0_7.zip` and to the copy inside the handoff.

**Rules for every capture from it:**
- extract a **disposable copy** elsewhere; **never run, extract into or repackage the archive or its inner packages in place**;
- keep the **original screenshots as the evidence** for how each state looked on the day, even when a re-run is possible.

**What the packages need** (from listings, not tested):
- Each `fc_simulator_v0_N` engine imports only the Python standard library and ships a pre-imported `data/players.json`, a `cli.py` and a `pyproject.toml`.
- The only non-standard import, `artifact_tool` (a ChatGPT-sandbox helper), is in `scripts/import_players.py` (the workbook importer), plus `scripts/quality_sweep.py` in v0.7. None of these scripts is needed to run the engine.
- There is **no visual interface in any version**. Output is the event ledger, JSON reference matches and Markdown reports, so portfolio visuals are rendered charts and ledger excerpts, not screenshots of a game.

| # | Date (local) | Milestone | Why | Source (type · path/ref) | Class | Runnable as-is? | Launch method | Deps known? | Deterministic scenario? | Existing media | Fresh capture likely? | Confidence | Risks / missing |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 18 Aug ~13:00 | Requirement and design (no code) | The origin story | Archive: `Pasted markdown.md` (FC 25 transcript), workbooks `_8.xlsx` / `_9.xlsx` / `_9(1).xlsx`, `touchline_fc_handoff…/LOCKED_PROJECT_MEMORY.md`; extraction in `~/Downloads` | D (documents) | n/a | n/a | n/a | n/a | Documents only | As designed text slides | High | No visual state ever existed |
| 2 | 14:14 | **v0.1** Possession Skeleton | The first executable simulator | Archive: `fc_simulator_v0_1.zip` (23 files, 5 tests) + `v0.1/demo_match.json` | **B** | From a disposable copy | `python3 -m fc_simulator.cli` (standard library) | Yes | Yes (seeded; `demo_match.json` exists) | Reference ledger | Charts / ledger excerpt: yes | High | Status document unreadable per the extraction; tests and demo present |
| 3 | 14:40 | **v0.2** Physical + Tactical | Physical football, offside | Archive: `fc_simulator_v0_2.zip` (38 files) + `v0.2/` (ARCHITECTURE, CALIBRATION, STATUS, `demo_match_v0_2.json`, `tactical_demo_v0_2.json`) | **B** | Copy | As above | Yes | Yes | Reference ledgers | Yes | High | none |
| 4 | 14:59 | **v0.3** Openness + Transition | Cagey vs open emerges causally | Archive: `fc_simulator_v0_3.zip` + `v0.3/` (`OPENNESS_MODEL.md`, cagey and open demos, `tactical_openness_v0_3.json`) | **B** | Copy | As above | Yes | Yes (seed 20260818) | Reference ledgers | Yes: cagey vs open comparison chart | High | none |
| 5 | 15:17 | **v0.4** Role + GK/Timing | Role ratings, 4-1-4-1 | Archive: `fc_simulator_v0_4.zip` + `v0.4/` (VALIDATION 34/34, REFERENCE_RESULTS, `role_report_cagey_v0_4.json`, demos) | **B** | Copy | As above | Yes | Yes | Reference ledgers | Yes | High | none |
| 6 | 15:53 | **v0.5** Chance Ecology | The owner's ~0.8 cagey correction | Archive: `fc_simulator_v0_5.zip` + `v0.5/` (`CAGEY_CALIBRATION.md`, `tactical_ecology_v0_5.json`, `attack_quality_v0_5.json`, demos) | **B** | Copy | As above | Yes | Yes (seed 9300) | Reference ledgers | Yes: three-tier ecology chart | High | none |
| 7 | 16:18 | **v0.6** Wide + Spatial Integrity | The silent-carrier fix; 46 tests | Archive: `fc_simulator_v0_6.zip` (46 test functions) + `v0.6/` (four 90-minute demos, `tactical_distribution_v0_6_final.json`) | **B** | Copy | As above | Yes | Yes (seed 13000) | Reference ledgers | Yes | High | none |
| 8 | 17:35 | **v0.7** Random Integrity + Matchups + Quality | The engine everything else is built on | Archive: `v0.7/fc_simulator_v0_7.zip` + `v0.7/` (QUALITY_RANDOMNESS, VALIDATION, REFERENCE_RESULTS); also `~/Downloads/fc_simulator_v0_7.zip` (identical) | **B** | Copy | As above | Yes | Yes (matchup matrix, paired quality sweep) | Reference ledgers + JSON | Yes: matchup-matrix and quality-sweep charts | High | none |
| 9 | ~17:08 | Early UI reference | What the owner was aiming at | Archive: `Screenshot 2026-08-18 at 5.08.54 PM.png` (2048×1496), `Haaland.png`; handoff `reference_assets/` | **D (original, preferred)** | Image | Open | — | — | **Original screenshot** | Not applicable | High | Use as is |
| 10 | ~19:07 | **`touchline(1).html`**, the rejected first website | An honest dead end | Archive: `touchline(1).html` (158,794 B) + `Screenshot 2026-08-18 at 7.07.25 PM.png` (2047×1156) | **B** (page) / **D (original screenshot, preferred)** | Opens as a file | Open a disposable copy in a browser (mock engine, no server) | Yes: Google Fonts over the network (falls back to system fonts offline); card images from `cards/<id>.png`, falling back to `cards/_random.png` | Mock only | **Original screenshot** | Approximate only | High | **The `cards/` folder is not in the archive.** A copy of `a0cd26d:web/cards` supplies `_random.png` but not the day's exact card set. Use the original screenshot as the record |
| 11 | ~19:51 / 20:15 | **`touchline(2).html`**, the Liverpool / Premier League shell | The first real Touchline look | Archive: `touchline(2).html` (236,285 B; identical to the handoff's `current_frontend/touchline.html`) + `Screenshot 2026-08-18 at 7.51.18 PM.png` (2047×1274) | **B** (page) / **D (original screenshot, preferred)** | Opens as a file | As #10 | Yes: fonts as #10; art from `cards/<League>/<Name>.png`, then `cards/<id>.png`, `cards/_blank.png` | Mock engine, mutable PRNG | **Original screenshot** | Yes, close: `a0cd26d:web/cards` has the same league-folder layout | High | The repository card set includes cards added after 19:51, so a re-capture would show slightly more art. Label any re-capture "re-opened original page, later card set" |
| 12 | 20:27 | **The 18 Aug handoff state** | The state the local project started from | Archive: `touchline_fc_handoff_2026-08-18.zip` (README_FIRST, SHA256SUMS, LOCKED_PROJECT_MEMORY, CURRENT_STATUS_AND_NEXT_STEPS, V07_WEBSITE_INTEGRATION_CONTRACT, CLAUDE_INTEGRATION_NOTE, NEW_CHAT_STARTER; `context/fc25_transcript_source.md`; `data/player_attributes_with_height_weight.xlsx`; `simulator/fc_simulator_v0_7.zip`; `current_frontend/touchline.html`; `reference_assets/`) | **B** | Contents open / run as #8 and #11 | As #8 and #11 | Yes | Yes | The reference PNGs (one is the 7:51 PM screenshot) | Yes | High | The handoff's own `SHA256SUMS.txt` can verify its contents |
| 13 | 18 Aug | Player-card art | Visual identity of the management layer | PNGs · `web/cards/**` (42 PNGs; first commit `a0cd26d`) | A | Yes (images) | Open the files | — | — | The cards themselves | n/a | High | none |

### Era 2 — The local project, releases and the first renderers (19–27 Aug, pre-Git)

| # | Date | Milestone | Why | Source | Class | Runnable as-is? | Launch | Deps | Deterministic? | Existing media | Fresh capture? | Confidence | Risks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 14 | 22 Aug | **Touchline Live-Test RC1.1**, the first hosted release (manager + circle-marker match view) | The first playable Touchline | Release folder · `~/TouchlineRC1/app-rc1.1-backup/` (`APP_VERSION 0.1.0-rc1.1`, full app + `data_rc`) + DB `~/TouchlineRC1/data/backup-touchline-20260822-235840.db` | B | Almost | Copy the folder; `~/TouchlineRC1/venv/bin/python server.py` with `TOUCHLINE_DATA_DIR`=copy; open `:8000` | Yes (`requirements.txt`, venv present) | Yes (seeded fixtures, persisted season) | none from the time | Yes | High | **Plain RC1 (0.1.0-rc1) was not preserved**, only rc1.1. Never run in place (it would write to the backups) |
| 15 | 23 Aug | RC2–RC6 (cal6–cal10), the live-case loop | Iteration discipline; mostly engine changes, visually similar | `~/TouchlineRC1/app-rc2…rc6-backup/` + the matching pre-release DBs | B | Almost | As #7 | Yes | Yes; live cases reproduce from seed + save (`tools/reproduce_match.py`) | none | Yes, but they look alike | High | Visually close to RC1.1; better told as a before/after of one live case (e.g. MW01 on cal5 vs cal6) |
| 16 | 24 Aug | **RC7, the first animated match renderer (anim1)** | The birth of Touchline's match presentation | `~/TouchlineRC1/app-rc7-backup/` (0.1.0-rc7) | B | Almost | As #7; match view (`?renderer=anim1`; `circles` for the old markers) | Yes | Yes (seeded matches; season save) | none | Yes | High | Needs a copy of the RC7-era DB (`backup-touchline-pre-rc8-20260824-201444.db`) |
| 17 | 24 Aug | **RC8, anim2 with the presentation timeline** | Readable pacing (three clocks) | `~/TouchlineRC1/app/` (0.1.0-rc8, live at the time) | B | Almost | As #7; `?renderer=anim2` default (`anim1`, `circles` also present) | Yes | Yes | none | Yes | High | `app/` was the live production folder: copy before use |
| 18 | 25 Aug | anim3 / **anim4, the first physical ball** (staging, never released) | The first continuous ball in the view | Git · `a0cd26d:web/touchline.html` (`?renderer=anim3/anim4`) | B | Via worktree | Worktree `a0cd26d`; `server.py` + open `:8000/?renderer=anim4` | Yes | Yes | none | Likely | Medium | anim3/4 were staging-only: the root copy is the *final* pre-Git state, which may differ from 25 Aug |
| 19 | 25 Aug | Continuous Football Runtime sandbox | The physical body before integration | Git · `a0cd26d:sandbox/index.html` + `cfr.js` + `scenarios.js` | B | Static | Static server over the worktree; open `sandbox/index.html` | Yes (no engine) | Yes (scripted scenarios) | none | Yes | High | none known |
| 20 | 25 Aug | "Architecture B" prototype (rejected) | A rejected road | Git · `a0cd26d:prototype/continuous_world.html` | C | No | Needs `proto_data.json` (**not in Git or on disk**) | Partly | — | none | Only after regenerating the data | Low | Data missing |
| 21 | 25–27 Aug | Integration lab viewers (about 25 before/after pages: authority, reception, pursuit, barrier, restarts, cal12, 90-minute sequences) | Before/after proof of the repairs | Git · `a0cd26d:integration/viewer_*.html` + `gen_*_viewer.py` | C | No | Regenerate traces with the lab scripts, then serve statically | Partly (the lab is in `integration/`) | Yes (matched seeds) | none | Possible but costly | Low–Medium | **Every trace/label JSON they fetch was git-ignored and is gone** |

### Era 3 — Visual V1, physical football and the sprite goalkeeper (27 Aug – 14 Sep, Git)

| # | Date | Milestone | Why | Source (commit/tag) | Class | Runnable as-is? | Launch | Deps | Deterministic? | Existing media | Fresh capture? | Confidence | Risks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 22 | 27 Aug | Visual V1 sandbox: pixel players, grass, perspective camera, 22-player fixture | The first pixel-art pitch | `f1fde10` → `97ec2d0` → `ad72d17` (`sandbox/visual/index.html`, fixtures, frozen assets) | B | Static | Worktree; `python3 -m http.server`; open `sandbox/visual/` | Yes | Yes (fixture scenes) | none | Yes | High | none |
| 23 | 27 Aug | Goal art iterations (V1 → V2 → V2.1 rejected → V2.2 → V2.3 bake) | A vivid iteration story | Git · `sandbox/visual/goal_compare.html` + `sandbox/visual/compare/*.png` at `c4f13e1` | A (images) / B (page) | Images yes | Open the PNGs; the compare page via a static server | Yes | n/a | **Yes: committed comparison PNGs** | Not needed | High | **Prefer the committed originals** |
| 24 | 27–28 Aug | **Live match preview on the rail camera** (the first engine-driven pixel match) | Touchline's match look is born | `9d3ed6a` (preview), `9a4294c` (rail camera), `c4f13e1` (goals restored) | B | Via worktree | Worktree; `server.py` (:8000) + `serve_match.py` (:8124); `match.html` | Yes | Yes (`fixture_liv_eve.json`, seed 20260827) | none | Yes | High | Needs the engine at *that* commit (same worktree); the session cap of 25 applies |
| 25 | 30–31 Aug | Strand net + net physics; 3D ball flight; continuous body live | Physical goal and ball | `99d129f`, `eaf9037` (nets), `601ff74`/`9428bc5` (ball), `8ee2748` (body), `fb2e98d` (2×) | B | Via worktree | As #17; test keys 1–5 (net), 6–9/C (ball), T (transport) | Yes | Yes (synthetic harness keys) | none | Yes | High | none known |
| 26 | 31 Aug | Single Player Test: dribbling, kick techniques, inside-foot contact | Playable sprite football | `cbfd5d8`, `c9bde59`, `546c050` (8-direction dribble), `dcf4f3d`/`b2f7427` (kicks) | B | Via worktree | `match.html` → Single Player Test; WASD, X/Z/C, keys 1–6 | Yes | Scripted replay was used in commits; scripts not all preserved | `review_artifacts/power`, `kick_charge`, `dir_study` [Local] | Yes | High | The contact sheets named in commits were in a scratchpad, **not preserved** |
| 27 | 1 Sep | Charged, curling shots; goal frame; Net V2 | Shooting feel | `96c7b67` (X3 curl), `7d6e306`, `06fb7d9`; tag-free | B | Via worktree | Playtest keys 1–6 | Yes | Yes | `review_artifacts/inside_curve/*_EVIDENCE.png`, `goal_frame`, `net_v2` [Local] | Yes | High | none |
| 28 | 3–4 Sep | Goalkeeper V1 mechanics (stages 0–4) | The keeper brain | `fbcd19c`, `132837f` | B | Via worktree | Playtest keeper; `tools/gk_eval` batteries | Yes | **Yes, `GK_SCENARIOS`** | [Local] `gk_v1_stage*`, audits (heatmaps, goal-face sheets) | Yes (stick-figure keeper) | High | The pre-animation keeper is a debug figure |
| 29 | 4–5 Sep | Sprite keeper V1 → V1.1 (dive art retired) → V1.2 poses | Sprite-era keeper | `80231f9`, `ed47bac`, `96ee85e`; review page `sandbox/visual/gk_anim_review.html` | B | Via worktree | `gk_anim_review.html` or the playtest | Yes | Yes (`GK_SCENARIOS`, review overrides) | [Local] `gk_anim_v1`, `v1_1`, `v1_2`, `perspective_proof` (PNG sheets) | Yes | High | The V1.2 candidate poses live in untracked `review_artifacts` (`?savePoses=1`) |
| 30 | 5 Sep | Pose salvage + Pro contact poses | Resourcefulness | `9b78308`, `9f44a6e`, `5084e55` | B | Via worktree | Playtest shots | Yes | Yes | [Local] `gk_pose_inventory`, `gk_pose_salvage`, `gk_dive_north_v1` | Yes | High | none |
| 31 | 6 Sep | SOUTH V6 sprite (V7 rejected); component rig; **first production dive animation (LEFT_FAR)**; 16-sequence library | The peak of the sprite keeper | `a1e8838`, `a45a802`, `b03176f`, `8f17f9b`/`6659cc2` | B | Via worktree | Playtest / free-play (`live_freeplay_hunt.js`, seeded) | Yes | Yes (seeded free play) | **[Local] `GK_ANIMATION_LIBRARY_FINAL_REVIEW` (178 GIFs), `gk_left_far_integration` (76 GIFs), `gk_proto_dive`, `gk_rig_v1`, `gk_dive_south_v1…v7`** | Yes | High | **Prefer the existing review GIFs** for the V7 and rig experiments |
| 32 | 7 Sep | Contact-angle study (wrong direction → 60° CW) | "Judge visually, not by vector maths" | `de8451b` | D (+B) | — | — | — | — | [Local] `gk_contact_tilt`, `gk_contact_tilt_round2` sheets | Unnecessary | High | Use the original sheets |
| 33 | 8–13 Sep | New sprite generator dive attempts; Salah sprite request | Rejected generative art | None identified | E | — | — | — | — | Not found | No | Low | No artifact located |
| 34 | 13–14 Sep | Vertical high-save sprite; **sprite-era baseline** | The end of the sprite era | `92ddc33`; tag **`checkpoint/sprite-baseline-2026-09-19`** (= `ff3a89f`) | B | Via worktree | Playtest | Yes | Yes | [Local] `gk_vertical_high` (2,366 PNGs, 9 GIFs) | Yes | High | none |
| 35 | 14 Sep | Manager app cinematic screenshots | The app layer at its best | [Local] `review_artifacts/touchline_screens/final/` (11 PNGs, 2 GIFs, `touchline_build.zip` = 54-file `web/` snapshot) | **D (preferred)** / B | Yes (images) | — | — | — | **Yes** | Not needed | High | **Use these originals**: they were captured from a live season save |

### Era 4 — The skeletal era, characters and the outfield game (19–28 Sep, Git + Astra)

| # | Date | Milestone | Why | Source | Class | Runnable as-is? | Launch | Deps | Deterministic? | Existing media | Fresh capture? | Confidence | Risks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 36 | 19 Sep | **Sprite vs skeletal 3D keeper (vertical slice)** | The architectural pivot | `ddad196` … `b46f19b`; committed review `review_artifacts/3d_animation_architecture/visual_review/VISUAL_REVIEW.html` | A (review page) / B | Review page yes | Open `VISUAL_REVIEW.html`; or a worktree + `?gkBackend=3d` | Yes | **Fixture 42** | **Yes: committed PNGs and GIFs (75 / 26)** | Yes (GPU) | High | WebGL2 needs a GPU |
| 37 | 19–20 Sep | Dive lifecycle v2 → v6 (momentum arc, in-place get-up, frozen mirror) | Iteration toward a believable dive | `e9c73bb`, `1852141`, `eeb7723`, `1db60c0` | A (review) / B | Yes (review) | As #29 | Yes | Fixture 42 (v6 bit-frozen) | **Committed v2–v6 sections in `VISUAL_REVIEW.html`** | Yes | High | none |
| 38 | 20 Sep | Motion library, spread-block foot save, cradle catch; distribution v12 | Keeper breadth | `bdfb222`, `f57040b`, `6c96f7e`, `abe57bd`; reviews `gk_motion_library/`, `gk_distribution/` | A (review) / B | Yes | As #29 | Yes | 55–80 fixtures | Committed (167 / 66, 119 / 59 PNG / GIF) | Yes | High | none |
| 39 | 21–22 Sep | **Astra V6 character**, faces/gloves, I23/S3/L2, Mixed rendering | Character construction | [Astra] `~/Downloads/Touchline_V6_Review.html` (self-contained), `Touchline_V6_Review (1)–(4).html`, `Touchline_Character_V6.mp4`, `Touchline_Face_Gloves_V6.mp4`, `Touchline_Density_Motion.mp4`; source in `TOUCHLINE_ASTRA_MIGRATION_PACKAGE/finished-gameplay/touchline-v6/` | **A (reviews and videos)** / C (rebuild) | Yes (open the HTML / MP4) | Open files; rebuild = `node tools/export.cjs` + `python3 tools/build.py` | Partly | Fixture 42 export | **Yes: review pages and MP4s** | Rebuild uncertain | High (media) | **Prefer the originals**: the Astra repository objects are not recovered (commit labels only), and a rebuild is untested |
| 40 | 22–23 Sep | **The 20-player Astra roster** + back-print B | Player identity | [Astra] `Touchline_Roster_Review.html` (39 MB), `Touchline_Courtois_Hair_Review.html`, `Touchline_Back_Print_Roster.png`, `Touchline_Back_Print_Candidates/deliverables/Touchline_Back_Print_Review.html`; 31 GLBs, about 2,700 PNGs in the migration package | A (reviews) / C (models) | Yes | Open the HTML | — | — | **Yes** | Rebuilding renders is uncertain | High | **Not in the runtime**; the roster exists only as Astra deliverables |
| 41 | 22–23 Sep | True-proportion Courtois in the game; `?gkPlay=1` | A named keeper | `da3ea2f`, `1e41af3`; review `gk_character_courtois/` | A (review) / B | Yes | Worktree; `?gkPlay=1` | Yes | Fixtures + distribution fixtures | Committed (161 PNGs / 54 GIFs) | Yes | High | none |
| 42 | 23 Sep | **Outfield locomotion** (walk → sprint) | The outfield runtime is born | `d19de7e`, `c11b70c`, `9ba93d2`; review `outfield_locomotion/` | A (review) / B | Yes | Worktree; `?ofPlay=1&fps=60` | Yes | `of_play_capture.js` scripts | Committed (18 strips) | Yes | High | none |
| 43 | 23 Sep | Dribbling with real boot touches | Ball at the feet | `c672fdf`, `f907bb9`, `3a7372a`; review `outfield_dribbling/` | A / B | Yes | `?ofPlay=1`, J / L keys | Yes | `of_ball_probe.js` fixtures | Committed (7 strips) | Yes | High | none |
| 44 | 23–24 Sep | Shooting V1 / V1.1 (five families) | Striking | `5a77976`, tag **`baseline/shooting-v1`** (`277c56c`), `23b7af4`; review `outfield_shooting/` | A / B | Yes | `?ofPlay=1`, keys 1–5 | Yes | `of_shot_probe.js` | Committed | Yes | High | none |
| 45 | 24 Sep | **Six real Astra players** on the runtime | Real characters in motion | `7cba78d`, tag **`baseline/outfield-runtime-v1`** (`23b7af4`); review `outfield_characters/` | A / B | Yes | `?ofPlay=1`, C cycles characters | Yes | `of_char_regress.js` | Committed (10) | Yes | High | none |
| 46 | 24–25 Sep | Receiving + passing (squad) | Team play | `c8d0b5c`, tag **`baseline/receiving-passing-v1.1`** (`75d0d83`); review `receiving_passing_v1/` | A / B | Yes | `?ofPlay=1&squad=7…9`; Y = auto demo | Yes | 27 squad fixtures | Committed (77 WebP clips) | Yes | High | none |
| 47 | 25 Sep | Possession hand-off; **Defending V1** | Defending exists | tag **`baseline/possession-v1.1-handoff`** (`a30ddab`), `57c6539`; review `defending_v1/` | A / B | Yes | Shift+7/8/9 drills; Shift+Y demo | Yes | 24 defending fixtures | Committed (18 WebP) | Yes | High | none |
| 48 | 26 Sep | Researched slide (V1 "reckless" vs V1.1) | A before/after | tag **`baseline/defending-v1.1-slide`** (`cdb0735`); V1 pose kept as `OF_DEF.slide.variant="reckless_v1"` | B | Via worktree | Defending drill, F = slide | Yes | Yes | In `defending_v1/` review (V1 only) | **Yes: both poses in one build** | High | none |
| 49 | 27 Sep | Tackled-player balance, stumble, fall | Physical consequence | tag **`baseline/tackled-player-v1`** (`f5f6076`); review `tackled_player_v1/` | A / B | Yes | Shift+T demo; reaction fixtures | Yes | 17 reaction fixtures | Committed (28 WebP) | Yes | High | none |
| 50 | 27–28 Sep | Slide contact V1.2 (far-leg sweep, body interaction) | Contact physics | `a1357dd`, tag **`baseline/slide-contact-v1.2`** (`d539e7a`); review `slide_contact_v1_2/` | A / B | Yes | Shift+G side-on demo | Yes | Scenario and proof sets | Committed (56 WebP, 37 PNG, V1.2 vs follow-up clips) | Yes | High | none |
| 51 | 25–28 Sep | Stadium bowl, pitch mowing, sphere ball, rain | The environment | `2ecefaf` / `e2c98ec` (`touchline-current`) | B | Yes | Current playable; selectors for weather and ball design | Yes | Any of the above scenarios | none | Yes | High | none |
| 52 | 28 Sep | **Current playable** | The end state | `touchline-current` = `e2c98ec` (GitHub) | B | Yes (fresh-clone tested 28 Sep) | README steps (`server.py` + `serve_match.py`) | Yes | All gates' fixtures | Smoke screenshot only | Yes | High | none |

---

## Where an existing original beats a recreation

- **RC-era live matches (#14–#17).** The *season save* and *live matches* happened on hosted builds with real play. A re-run can replay seeds exactly, but not the moment itself. Capture fresh, but label it "re-run of RC7 on the preserved season database".
- **The 14 Sep manager screenshots (#35).** They were taken from a live Liverpool season through the app's own functions: use them.
- **The goal-art comparison PNGs (#23), the contact-angle sheets (#32), the sprite library GIFs and SOUTH V6/V7 sheets (#31), and the Astra reviews and MP4s (#39–#40).** All come from states that cannot be recreated exactly: rejected generations, other accounts, unrecovered repositories, scratchpad-only assets.
- **The three 18 Aug screenshots (#9–#11)** are the only exact images of the first websites as they looked on the day. They are now recovered originals; use them even though both pages can be re-opened.

## What is still missing before capture

1. **Chat-era gaps.**
   - The exact `cards/` folder that `touchline(1)` and `touchline(2)` saw on 18 Aug; the repository has a later superset.
   - A readable v0.1 `IMPLEMENTATION_STATUS.md`, which the extraction could not read. The v0.1 package itself is intact.
   - Every other 18 Aug item in the plan is now recovered.
2. **The Architecture B and integration-lab trace data** (#20–#21): never kept. It could be regenerated with the committed lab scripts, but at a cost.
3. **A `puppeteer-core` install** outside the repository, for any automated capture.
4. **Plain RC1 (0.1.0-rc1):** not preserved; RC1.1 is the earliest release build.

## Portfolio Capture Plan (narrative sequence, 22 stages)

| # | Stage | What to capture eventually | Source |
|---|---|---|---|
| 1 | **The brief** (18 Aug) | Title card quoting the requirement ("attributes, not Overall"), set against an excerpt of the original FC 25 transcript and the 5:08 PM UI-reference screenshot | Archive (#1, #9) |
| 2 | **A causal simulator in one day** (v0.1 → v0.7) | Timeline of the seven **original packages** (packaging times, test counts 5 → 16 → 22 → 34 → 46 → 53) with the owner's corrections; per-version charts rendered from each package's own reference JSONs (e.g. v0.3 cagey vs open, v0.5 three tiers, v0.6 distribution) | Archive (#2–#8), each run from a disposable copy |
| 3 | **What v0.7 knew** | Charts from `matchup_matrix_v0_7.json` and `quality_sweep_paired_v0_7.json`; an event-ledger excerpt from `end_to_end_demo_v0_7.json` | Archive v0.7 (#8) |
| 4 | **The first website, rejected and redone** | Before/after using the **original 7:07 PM and 7:51 PM screenshots**, with the owner's rejection quote. An optional short clip of a disposable copy of `touchline(2).html` (card flip, tactics panel), labelled as a re-opening | Archive (#10–#11), cards (#13) |
| 5 | **Touchline goes live** (RC1.1) | UI screenshots: squad board, card flip, tactics panel, match view with circle markers | RC1.1 folder (#14) |
| 6 | **The live-case loop** | A two-panel of one live case: the saved match versus the repaired calibration on the same seed, with the forensic's headline | RC1.1 / RC2 (#15) |
| 7 | **The first animated match** (anim1 → anim2 → anim4) | A 10 s clip per renderer on the same seed, side by side | RC7, RC8, `a0cd26d` (#16–#18) |
| 8 | **Designing a physical body** | Clip of the CFR sandbox scenarios | `a0cd26d:sandbox` (#19) |
| 9 | **A pixel-art broadcast view** | Screenshot: Visual V1 sandbox, then the live match preview on the rail camera | `ad72d17`, `9d3ed6a`/`c4f13e1` (#22, #24) |
| 10 | **Making a goal** | Goal-art evolution strip (V1 → V2.2 → world panels → strand net) | Committed compare PNGs + `99d129f` (#23, #25) |
| 11 | **Physical ball and net** | GIF: a strike rippling the strand net; a ball arcing over its shadow | `eaf9037`, `9428bc5` (#25) |
| 12 | **Sprite-era football** | GIF: dribbling touches and the inside-foot kick contact frames; the contact-study sheets | Single Player Test (#26–#27) |
| 13 | **A goalkeeper that thinks** | Heatmap/goal-face sheet + a stick-figure save | [Local] audits, `fbcd19c` (#28) |
| 14 | **Salvaging a keeper from sprites** | Contact sheet of salvaged poses; SOUTH V6 vs V7; the 16-sequence library GIF montage | Existing [Local] review media (#29–#31) |
| 15 | **Why sprites hit a wall** | Side-by-side at the same contact tick: sprite (38 px off, WRONG_CLIP) vs skeletal (4.7 cm) | Committed `VISUAL_REVIEW.html` (#36) |
| 16 | **Making the dive believable** | v2 → v6 lifecycle comparison, gameplay speed and 4× slow motion | `VISUAL_REVIEW.html` (#37) |
| 17 | **A keeper library** | Grid of catch / foot save / distribution clips | Committed reviews (#38) |
| 18 | **Building characters** | Astra V6 character, faces/gloves, the 20-player roster turntable, back-print B | Astra reviews and MP4s (#39–#40) |
| 19 | **Courtois and the outfield runtime** | Courtois dive clip; locomotion walk → sprint strip on three bodies | `da3ea2f`, `d19de7e` (#41–#42) |
| 20 | **Playing the ball** | Dribble touches, the five shot families, a passing triangle | #43–#46 |
| 21 | **Defending and its consequences** | V1 "reckless" vs researched slide (same build); tackled-player stumble/fall; the far-leg sweep | #47–#50 |
| 22 | **The stadium, today** | Gameplay screenshot and a 10 s clip of the current playable in rain, with the stadium bowl and a match ball | `touchline-current` (#51–#52) |

## Notes for the chronicle

- **RC1 vs RC1.1** (reported in the previous pass, applied 28 Sep). The chronicle now says the build preserved from the 23:50 deployment is 0.1.0-rc1.1, and that whether plain RC1 ran there is Uncertain.
- **The recovered 18 Aug originals confirm the chronicle's claims.** The archive strengthened provenance labels only; no narrative claim changed.
