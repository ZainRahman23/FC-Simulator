# Touchline — Development Chronicle

The history of the Touchline football project as a whole, from the first requirement for the simulator (18 Aug 2026, about 13:00 local) through the physical-character work of 7 Oct 2026 and its publication early on 8 Oct. It is a development diary, not a changelog: what was tried, what failed, what was learned, and what worked at the end of each day.

Touchline's history is spread across more than one place: two GitHub repositories, a set of local release folders, a separate character-art workstream, and several later handoff documents. **Repository boundaries are treated as evidence, not chapters.** Where the work moved from one place to another, a short *Transition* note explains what moved and why.

## How to read this document

**Certainty.** Three levels, as before:

- Plain statements are **facts** that the cited source records directly: a commit message, a commit or file timestamp, a dated document.
- **Reconstructed:** a conclusion drawn from several sources together.
- **Uncertain:** the evidence cannot settle it.

**Provenance.** Each day opens with an *Evidence* line naming its sources:

| Label | Source |
|---|---|
| **[Chat]** | The original ChatGPT development conversation of 18 Aug, as preserved in `~/Downloads/TOUCHLINE_EARLY_HISTORY_PRIMARY_SOURCE_EXTRACTION.md`: contemporaneous messages, upload times and packaged files, extracted later. Its claims were checked against surviving files wherever possible (Part I). |
| **[FC-Sim Git]** | Commits in the FC-Simulator repository (`github.com/ZainRahman23/FC-Simulator`, local `~/Downloads/FC Simulator`) |
| **[TL Git]** | The TouchlineSimulator repository (`github.com/ZainRahman23/TouchlineSimulator`, the local `origin` remote) |
| **[Doc]** | A dated document committed in the repository, including those carried inside the root checkpoint |
| **[Local]** | A file on the development machine that was never committed: release folders, untracked review folders, exported packages |
| **[Astra]** | Records of the separate character-art workstream (the "Astra" packages in `~/Downloads`) |
| **[Later]** | A handoff or recollection written after the events it describes (the 20 Sep history handoff, the 23 Sep memory export and migration handoff) |
| **[Chat extraction]** | Astra's 8 Oct reconstruction of the user's chat history for 1 – 7 Oct ([`chat_history_reconstruction_2026-10-08/`](../review_artifacts/chat_history_reconstruction_2026-10-08/), ledger C01 – C19): selected dated excerpts with UTC times, not raw transcripts. An assistant's reported delivery or check is recorded as **reported**, not as verified. Used with the local originals it can be checked against |
| **[Session]** | AI-assistant session records on the development machine (Claude Code `~/.claude/projects/`, Codex `~/.codex/sessions/`): the user's contemporaneous instructions and decisions, with timestamps (UTC, converted to local). Used from 28 Sep. Where a decision was also saved verbatim in a repository `sources/` folder, that copy is cited as [Doc] |

Priority when sources disagree: a contemporaneous source or executable artifact, then contemporaneous tool or file output, then contemporaneous conversation, then later reconstruction. A **[Later]** source is used for colour and for work that left no other trace. Where it overlaps Git, Git wins, and the event is counted once.

**Dates.** Each day is dated by the **local time recorded at the time**, and a day runs until 06:00 the next morning, because most sessions ran past midnight.
- Commits carry their own offset: UTC−07:00 from 27 Aug to 7 Sep, UTC+01:00 from 14 Sep, and UTC+02:00 from 25 to 27 Sep.
- Local file times were converted into the offset in force at the time. For August this is proven, not assumed: backup files named with their creation time (for example `…pre-rc7-20260824-025946.db`) match their recorded modification times exactly at −07:00.
- For 8–13 Sep, when the offset changed, local file times are **Uncertain** by up to eight hours.

**Scope.** Conversation evidence starts at 20:00 UTC on 18 Aug (13:00 local), with the opening request. Package and file evidence starts at 14:12 local on 18 Aug; commit evidence starts on 27 Aug. The chronicle runs through the 7 Oct day, which ends with the 8 Oct publication housekeeping. The playable collaboration state is still `touchline-current` (`e2c98ec`, plus documentation commits); the physical-character work of 29 Sep – 7 Oct is on its own branches (Part IV). Parallel work by other contributors is mentioned only where it bears on the main line; one example is the Coach MVP pull request on the FC-Simulator repository (`claude/coach-mvp`, 23 Sep).

---

## Project principles

These are principles the history itself establishes: stated again and again in the source record and enforced by tooling. Each note says where the principle first appears, because several are older than the code that later made them famous.

1. **Individual attributes, never Overall.**
   - The opening requirement on 18 Aug asked for a simulator in which individual attributes cause outcomes.
   - Before any code, it was locked that changing OVR alone must make **zero** engine difference, and that became a regression test from v0.1 onward.
2. **Causal football, not outcome correction.**
   - From the pre-code probability design on 18 Aug (context-first log-odds, geometry before attributes, no OVR term).
   - It was used as a debugging rule all through v0.1–v0.7: fix box-challenge willingness rather than cap penalties; fix shot choice rather than goal rates. The owner insisted that cagey and open scoring must *emerge* rather than come from a multiplier.
   - Later forms: "smallest causal corrections; no statistical tuning anywhere" (cal11, 24 Aug), and "OUTCOME DRIFT (reported, not tuned)" (31 Aug).
3. **Deterministic, with randomness that stays where it belongs.**
   - Same seed gives the same event ledger from v0.1.
   - v0.7 removed event-number dependence from the keyed randomness after the owner's instruction to "keep random integrity" (18 Aug).
   - Later came fixed-step physics, chunk invariance (`2a5ebfc`) and no presentation randomness.
4. **Ratings matter, but underdogs can still win.** An explicit owner decision on 18 Aug, tested in v0.7 with paired home/away quality sweeps and no upset aid.
5. **The presentation never decides the football.**
   - **The first recorded form was about a web UI, not animation.** The first Touchline page (18 Aug) split DATA / STATE / ENGINE / UI, with "UI rendering only; reads STATE, never computes football logic", and the integration contract read "Touchline manages the football team; v0.7 plays the football match".
   - It was first applied to a match renderer on 24 Aug: "the renderer visualizes the authoritative simulation; it is not a second simulator".
   - The animation form, "the simulation decides what happens; presentation explains what happened", appears in the September handoffs and the 19 Sep architecture audit. **It is not evidenced in that exact wording before then.**
6. **Neutrality is proven, not assumed.**
   - Digests identical across renderer modes and hosted runs (RC7–RC8, 24 Aug).
   - Then the determinism digests, keeper gates (43 → 80 scenarios), animation ON/OFF and sprite-vs-3D gates, and the character, dribbling, shooting, squad and slide gates.
7. **Freeze, change behind flags, prove flags-off identity.** From cal7 (23 Aug), every candidate is built in isolation and must reproduce the frozen live digest with its flags off. The same idea appears later as `PT_DEF.slide.rule = "near"`.
8. **Recover before reinventing.**
   - OpenSWOS studied under its licence (25 Aug); the engine's `world.py` and `continuous.py` laws ported into the playtest.
   - Recovered kick families and challenge law reused.
   - Python v0.7 kept as the only football authority, with no JavaScript port of its formulas (the 18 Aug integration contract).
9. **Preserve originals; derive reproducibly.** Frozen, hashed asset manifests; untouched salvage sources; rejected candidates kept with the reason.
10. **The owner judges; work stops for review.**
    - The owner locked the design layer by layer on 18 Aug, and a large share of the later decisions trace directly to owner corrections.
    - Later: "animation acceptance is visual — phase names are not proof".
11. **Known limits are documented, not disguised.**
    - Unresolved issues are listed with every package from v0.2 onward.
    - Later markers: `ART_MISSING`, `UNREALISED`, `WRONG_CLIP`, and published residuals.

---

# Part I — Touchline before the repositories (18–27 Aug 2026)

The first ten days fall into three clearly separate strands:
1. **the packaged simulator lineage v0.1 → v0.7**, built in a single ChatGPT development conversation on 18 Aug;
2. **the first Touchline management website**, built in parallel with Claude on the same evening;
3. **the local project**: integration, calibration revisions cal1–cal12, release candidates RC1–RC8 and the first match renderers (18 Aug evening – 27 Aug).

Only the third strand's working tree ever reached Git, and only as a single squashed snapshot on 27 Aug. It carried the v0.7 engine and the descendant of the second web page with it; the earlier versions and the first page never reached Git.

**Names that must not be confused:**
- **v0.1–v0.7** are engine versions.
- **cal2–cal12** are calibration revisions *of v0.7*. The engine version stays "v0.7" throughout, as the release manifests record: "Engine FC Simulator v0.7, Calibration v0.7-cal5".
- **RC1–RC8** are Touchline app releases.

None of these series is another's renaming.

## Tuesday 18 August 2026 — From an idea to v0.7, and the first Touchline website

**Evidence.**
- **[Chat]** The primary-source extraction of the original ChatGPT development conversation (`~/Downloads/TOUCHLINE_EARLY_HISTORY_PRIMARY_SOURCE_EXTRACTION.md`), with upload times from 20:00:09 UTC on 18 Aug to 03:27:51 UTC on 19 Aug.
- **[Local — recovered originals]** `review_artifacts/history_primary_2026-08-18/TOUCHLINE_2026-08-18_PRIMARY_ARTIFACTS.zip` (local record, not in Git). It holds the original bytes of `fc_simulator_v0_1…v0_7.zip`, their version documents and reference matches, `touchline(1).html`, `touchline(2).html`, `touchline_fc_handoff_2026-08-18.zip`, the three 18 Aug screenshots, the workbooks and the FC 25 transcript. Verified 28 Sep: the archive tests clean, all 56 `MANIFEST.tsv` SHA-256 entries match, and the six v0.1–v0.6 package hashes match the owner's recorded values.
- **[Local]** `~/Downloads/fc_simulator_v0_7.zip`, `LOCKED_PROJECT_MEMORY.md`, `V07_WEBSITE_INTEGRATION_CONTRACT.md`.
- **[Local]** Modification times of the files inside the root checkpoint, which **fall inside the windows between the extraction's package uploads**, as below.
- **[Doc]** The v0.7 documents carried in `a0cd26d` (`ARCHITECTURE.md`, `CALIBRATION.md`, `CAGEY_CALIBRATION.md`, `OPENNESS_MODEL.md`, `ROLE_RATINGS.md`, `QUALITY_RANDOMNESS.md`, `BUILD_SUMMARY.md`, `REFERENCE_RESULTS.md`, `VALIDATION.md`).

**Dating.** One local development day at **UTC−07:00**, even though the upload service's timestamps cross into 19 Aug UTC. The offset is independently confirmed three ways:
- the extraction's screenshot filenames (`Screenshot 2026-08-18 at 7.07.25 PM.png`, uploaded at 02:07:30 UTC);
- the RC backup filenames (22–24 Aug);
- the file times below.

Clock times in this entry are local (−07:00).

**Verification of the chat record against physical files.** The extraction is a later extraction of a conversation, so its claims were checked against artifacts that survive independently.
- **Byte comparison of the v0.7 package.** 47 of the 53 files in `fc_simulator_v0_7.zip` are **byte-identical** to `simulator/` in the Git root commit `a0cd26d`, and the other five are only pytest cache files. The 6 that differ are exactly the files later calibration would change: `engine.py`, `calibration.py`, `models.py`, `ratings.py`, `data/players.json` and `tests/test_engine.py`.
- **File times against the chat's package times.** Surviving file times sit inside the windows between the chat's package times:

  | Files | Last changed (local) | Window |
  |---|---|---|
  | `geometry.py`, `mathcore.py` | 14:12 | just before v0.1 was packaged at 14:14 |
  | `fatigue.py`, `formations.py`, `tactics.py` | 15:07–15:15 | between v0.3 and v0.4 |
  | `rng.py` | during the v0.6 → v0.7 random-integrity work | before v0.7 |
  | `QUALITY_RANDOMNESS.md` | just after v0.7 was packaged at 17:35 | after v0.7 |

- **The website's fingerprints.** `web/touchline.html` in the root carries `touchline(2).html`'s storage key `touchline:liverpool:v2`, its finance model (`SCR_GREEN`) and its engine seam (`setMatchEngine` / `MatchEngineAdapter`), with the browser mock kept only as a labelled `?engine=mock`.

- **The recovered originals confirm the chat record.**
  - The packages' internal file times (newest entries 22:14, 22:40, 22:59, 23:16, 23:52, 00:18, 01:35, on the packaging sandbox's UTC+1 clock) are each exactly one hour after the chat's UTC upload times.
  - The test counts stated here (16, 22, 34, 46, 53) are the counts written in each package's own status or validation document.
  - The quoted boundary "never computes football logic" is in `touchline(1).html`. `SCR_GREEN = 0.85`, `touchline:liverpool:v2`, `setMatchEngine` and the mulberry PRNG are in `touchline(2).html`.
  - The handoff's `current_frontend/touchline.html` **is** `touchline(2).html` byte-for-byte, and its UI reference image is the 7:51 PM screenshot.

**Conclusion (Fact):** the repository's engine is the chat-built v0.7, carried forward, and the repository's website descends from the second chat-era page.

**Starting state.** No simulator code. Two inputs:
- a transcript discussing how EA's FC 25 simulates matches, used as a **reference and an anti-pattern**, since it relied on team ratings and simple weighting;
- the owner's player workbook `2025-26-rankings-fc-attributes_8.xlsx`.

**The requirement (13:00).** A FIFA/FC-style simulator in which **individual attributes, not Overall, cause outcomes**. Better passing should win possession, and high Aggression should produce fouls and cards. It should be "a lot more complex and thorough" than FC's own.

**Design before code** (early afternoon, locked by the owner layer by layer):
- **Match state:** live player ratings during the match; formations and starting positions in the model; energy visible **every second**.
- **Stamina driven by workload.** A cagey low block conserves energy and end-to-end football drains it, so a low-pressing striker with poor Stamina can finish fresher than a relentless high-Stamina midfielder.
- **Nonlinear fatigue** on effective attributes (sprint and acceleration barely affected when fresh, sharply when tired), never on base attributes.
- **Instructions and tactics.**
  - Individual instructions split into **Attack Role, Attack Effort, Defense Role, Defense Effort**, with effort never boosting attributes.
  - Team tactics as discrete dropdowns that change positions, movement, tempo and workload, not ratings.
  - Height and Weight added as contextual metadata: reach and aerials, contact and shielding.
- **Probability model** (Layer 2): context-first log-odds, bounded nonlinear attribute transforms, **geometry before attributes**, staged resolution, action choice separate from execution, seeded and auditable randomness, and **no OVR term**.
- **Fouls:** a causal chain (action → timing → contact → legality → advantage → discipline), with Aggression changing willingness, not legality.
- **Set pieces** reuse the normal engines.
- **Calibration:** micro → meso → macro, with matched seeds, sensitivity sweeps, leakage tests and a regression suite.
- **Build order:** determinism → spatial shell → movement/stamina → passing → loose balls → shooting/GK → duels → tactics/roles → fouls/set pieces → ratings → coach AI → calibration.

**v0.1 "Possession Skeleton" (packaged 14:14).**
- *Problem:* the smallest deterministic 11-v-11 slice that could complete a match without betraying the design.
- *Built:* deterministic RNG, 22 continuous player states, movement and stamina, passing with interceptions and first touch, loose balls, basic shooting and goalkeeping, an event ledger, and OVR loaded as metadata only.
- *Bugs found at once:*
  - pass failure was **counted twice** (a trajectory error plus a second failure roll);
  - shot choice was too eager;
  - post-shot xG suppressed goals a second time.
- *Validated:* same seed → same ledger; OVR-only changes → same match; passing monotonic; stamina behaving as designed.
- *Left open:* goals high (about 3.7 per match in a 25-match batch), **deliberately left as a calibration target** rather than tuned to one roster.

**v0.2 "Physical + Tactical Core" (14:40).**
- *Trigger:* the owner supplied a workbook with Height and Weight (`_9.xlsx`), whose headers the importer did not recognise (fixed). 100 players imported, 170–199 cm and 60–97 kg.
- *Built:* aerials, shielding and physical duels; pressing, carrying, dribbling and tackles; fouls, cards, blocks, corners, crosses; restarts; red-card restructuring; 4-2-3-1 and in-match formation changes; all 13 team tactics; live ratings; coach AI and substitutions.
- *Failures and fixes:*
  - Too direct and chaotic: excess long balls and striker entries.
  - Too many 1-v-1 duels, which were reduced at the decision layer.
  - About 1.2 penalties a match, fixed by **tightening box-challenge willingness, not capping penalties**.
  - Over 100 crosses a match, with every won aerial becoming a header; fixed by adding option cost and making first contact no longer guarantee a shot.
  - Aerial passes double-counted in the statistics.
  - "Marking Orientation" stored but inert.
- *A missing law:* high line + Run Behind produced absurd close-range goals because **offside did not exist yet**. It was added from the real second-last-defender line, and the same test fell to 5 offsides, 14 shots and 1 goal.
- *Validated:* 16/16 regression tests.

**v0.3 "Match Openness + Transition Core" (14:59).**
- *Trigger (owner):* cagey games must score materially less than games where **both** sides are open.
- *Decision:* **no hidden `cagey = fewer goals` multiplier**. Openness must emerge from tactics → positions → turnovers → defensive organisation → chance quality.
- *Built:* geometric defensive organisation, genuine through balls into space, receiver marking, deep-block envelopes, emergency clearances, openness diagnostics.
- *Result* (seed 20260818):
  - cagey 0–0, 0.38 xG, 81 possession changes;
  - end-to-end 2–3, 2.60 xG, 253 changes.

  The separation was clearly causal. 22 tests.
- *Left open:* cagey already "too sterile"; high lines over-produced through balls.

**v0.4 "Role Intelligence + Goalkeeper/Timing Core" (15:17).**
- *Built:*
  - role-aware ratings; walking/jogging/sprinting distances; active versus dead-ball time; halftime recovery;
  - chance chains (key passes, pre-assists);
  - goalkeeper kicking and sweeper roles, claims and punches;
  - a true 4-1-4-1.
- *Bugs:*
  - a new cutback-cover instruction was undone by later marking logic, so **priority order was fixed rather than the test weakened**;
  - role ratings saturated because high-opportunity roles hit the cap, so they were **normalised per opportunity**.
- *Result:* 34 tests. Cagey came out at about 0.13–0.22 xG.

**The owner's correction → v0.5 "Cagey/Open Chance Ecology" (15:53).**
- **The most consequential calibration pivot of the day.** The owner rejected the idea that competent cagey football collapses to about 0.2 xG and 0–0. **About 0.8 total xG** is the right reference; the near-zero games belong to poor attacks or ultra-defensive blocks with no counter.
- *Built:*
  - three styles instead of two: **controlled cagey**, **ultra low block** and **end-to-end**;
  - settled-possession maturation that changes support and pass choices, **not xG**;
  - a cutback pass type;
  - attacking-quality sensitivity tests.
- *Bug:* goals and halftime kickoffs **inherited the previous possession's age**, so a fresh kickoff behaved like a mature 50-second attack. Fixed.
- *Result* (per-90 references): controlled about 0.83, ultra-low about 0.36, end-to-end about 2.92. Strong attackers made about 3× the xG of attackers capped at 60.
- *Rejected for now:* a cross-heavy wide plan that still over-produced close chances.

**v0.6 wide play and spatial integrity (16:18).**
- *Built:* crosses to delivery **zones** instead of a nominated target, cutback cover, and a receiving-stage duel for nearby defenders.
- ***A major causal bug.*** Between decisions, the ball carrier was being moved toward his *off-ball* tactical target, so a striker could **advance 15–20 m silently, with no carry or dribble event**. Fixed: ball progression now requires an explicit football event. This invariant is the ancestor of the September principle that the simulation root is never moved by presentation.
- *Other structural fixes:*
  - high lines held after being broken (emergency goal-side recovery added);
  - low-block defenders dawdling after winning the ball in their own box;
  - tackle/regain ping-pong;
  - viable 10–15 m shots declined for carries to 4–6 m;
  - a centre-back stranded 15–20 m outside the line;
  - a defender on top of the shooter blocking with probability zero;
  - "set-block resistance" wrongly applied to ordinary mid blocks.
- *Rejected:* an intermediate "aggressive-open" preset that made some seeds **more** chaotic. It showed the problem was the transition model, not preset naming, and it was not shipped.
- *Result:* 46 tests. The extreme-open tail (about 6.7 xG per 90) was judged too high and **left exposed rather than capped**.

**The owner's matchup and randomness decisions.**
- *Matchups:* a good attack must break down a low block meaningfully more than two low blocks would, while true end-to-end chaos needs **both** sides to take risks. One aggressive side against a passive block is an **asymmetric siege**. Chance ecology is therefore a function of *both* teams' tactics and quality, not a style label.
- *"Keep random integrity"*, and ratings must matter enough that results are not "insanely random", while underdogs can still win.

**v0.7 "Random Integrity, Asymmetric Matchups & Quality Gap Core" (17:35).**
- *Random integrity:*
  - many random keys still included the **event number**, so an extra logged event could reshuffle later draws; two clearance draws still used `event_id`;
  - all were removed, and the RNG hashes semantic causal keys with no mutable cursor;
  - inserting debug-only events is now tested **not** to change football.
- *Matchups:*
  - one end-to-end side against an ultra-low block was initially **more** explosive than open-v-open, because clearances against a set block were being treated as broken-field transitions. Fixed.
  - ***A methodological bug:*** the calibration builder gave Team A each position's first-ranked player and Team B the second, so "same tactic v same tactic" matches **never had equal personnel**. **Mirrored teams** with identical attributes were introduced to separate tactics from quality.
- *Quality versus randomness:*
  - paired home/away sweeps changing only real attributes gave the stronger side 0.50 → 0.58 → 0.63 → 0.73 of the xG as the attribute gap grew;
  - at a moderate gap the underdog still won 1 of 8, with **no upset aid**.
- *Regression and restoration:* with mirrored teams, controlled cagey had drifted to about 0.17 xG per 90. It was restored to about 0.58 through roles and occupation, **not shot probabilities**.
- *Final matrix* (per 90): ultra-ultra 0.24, controlled 0.59, wide-v-ultra 0.84, open-v-ultra 2.36, open-v-open 3.48. That is the intended ordering, with an admitted high tail.
- *53 tests.*
- *Left open:* controlled cagey below about 0.8; the open-v-ultra tail; no free-kick or penalty attributes; limited injuries, set pieces, coach AI and formations.

**The first Touchline website (with Claude, evening).**
- *The requirement:* an FC-style management site where you drag cards into a formation, flip a card to set its four instructions, see all 13 team tactics, and run a Premier League season as Liverpool.
- **`touchline(1).html` was rejected** (screenshot at 19:07). It mostly swapped CSS cards for PNG art, left a huge pitch with tiny, overlapping cards, and hid the tactics behind a button: it "didn't change what I said to change". Underneath, though, it already had a squad state, drag and drop, the four instructions, a thin mock engine, and a declared boundary: **"UI rendering only; reads STATE, never computes football logic."**
- **`touchline(2).html`** (screenshot 19:51; file 20:15) was judged "much better". It added:
  - a Liverpool/Premier League season shell with all 13 tactics permanently visible;
  - schedule, table and results;
  - transfers and a finance model built on the league's **squad-cost ratio** rather than a fake wage cap, with finance forbidden from touching match attributes;
  - an engine seam (`TOUCHLINE.setMatchEngine`).

  It still ran a **browser mock engine** (OVR-based line strengths, a mutable PRNG), explicitly temporary. **Touchline was not yet running v0.7.**
- *The integration contract* (proposed at 20:27, not implemented in the chat):
  - Python v0.7 as the **single** football authority behind a FastAPI backend, with **no JavaScript port of its formulas**;
  - one-second incremental advancement with a mandatory **run == repeated-advance parity test**;
  - an explicit attribute and tactic mapping;
  - no silent fallback to the mock.
- *Handoff* (20:27): `touchline_fc_handoff_2026-08-18.zip` with `LOCKED_PROJECT_MEMORY.md`, `CURRENT_STATUS_AND_NEXT_STEPS.md`, `V07_WEBSITE_INTEGRATION_CONTRACT.md`, `CLAUDE_INTEGRATION_NOTE.md`, `NEW_CHAT_STARTER.md` and `README_FIRST.md`.

**The same night, locally** ([Local] file times; [Doc]):
- `README_TOUCHLINE.md` ("Touchline × FC Simulator v0.7": `server.py` FastAPI, `bridge.py` mapping layer, integration tests, `?engine=mock` dev-only) was last written at **20:46**, 19 minutes after the handoff.
- A validation harness (`validation/metrics.py`, `scenarios.py`, `run_validation.py`, `fatigue_curve.py`) followed at 22:01–22:44.
- `ratings.py` changed at 22:52; a goalkeeper-statistics fix at 23:00; possession-analysis scripts at 23:50.
- **Reconstructed:** the integration contract was carried out that night, locally, in a new session. **Uncertain:** exactly how complete it was by midnight; the README is the plan's shape, and the tests are first evidenced the next day. The first calibration revisions (cal1 and the "ratings + GK fixes" of cal2) belong to this night too; cal1 is never named in any surviving document.

**End-of-day state.**
- A packaged, 53-test, causally designed simulator (v0.7) with its known weaknesses listed.
- A management website with a mock engine and an engine seam.
- A signed-off integration contract, and a local project beginning to implement it.

> **Transition 0 — from the chat workspace to a local project (18 Aug, evening).**
> - **What moved:** `fc_simulator_v0_7.zip`, unpacked with its file times intact (hence the byte and time matches above); `touchline(2).html`, which became `web/touchline.html`; the FC-style player-card art under `web/cards/` (42 PNGs, last modified 16:50–23:27 on 18 Aug); the handoff documents.
> - **What stayed behind:** the v0.1–v0.6 packages, their demo and reference JSONs, the screenshots and `touchline(1).html`. They were **never in Git**; their original bytes were recovered on 28 Sep into `review_artifacts/history_primary_2026-08-18/TOUCHLINE_2026-08-18_PRIMARY_ARTIFACTS.zip`.
> - **How:** copied, not reimplemented.
> - **Why:** to carry out the integration contract.
> - **Responsibilities from here:** the Python engine owns the football; the browser owns management and presentation; the mock survives only as a labelled developer switch.

## Wednesday 19 August 2026 — cal2 and a structural possession pass

**Evidence:** [Doc] `NOTES-possession-pass.md`, `POSSESSION_STRUCTURAL_REPORT.md` (13:35), `SETTLED_STRUCTURE_REPORT.md` (15:45); [Local] `validation/possession.py` (13:00), `tests/test_structure.py` (15:03).

**Starting state.** Calibration **v0.7-cal2** ("ratings + GK fixes locked") with the integration running: the baseline recorded core 53/53, **integration 22/22, end-to-end 4/4, run-vs-advance parity PASS**. This is the first proof that the contract's parity test existed.

**Work completed.**
- **Diagnostics before change.** A possession-lifecycle analyser built *after the fact* over the event ledgers, with no runtime instrumentation, so its parity is exact by construction. It covered **840 matches** (7 scenarios × 120) with mirrored XIs and frozen coach AI.
- It found and fixed its own attribution bug: turnover passes were logged after the possession change.
- The notes file calls the pass "paused mid-investigation" with zero engine changes. **The same afternoon it resumed:** "Settled Attacking Structure — v0.7-cal2 → v0.7-cal3". The first engine implementation pass after those diagnostics had three families, each validated and accepted, and all were movement geometry, choice utility or possession continuity, with "no accuracy, xG, or attribute math modified".

**End-of-day state.** v0.7-cal3.

**Gap: 20 August.** No evidence.

## Friday 21 August 2026 — Auditing cal3 against a certified twin

**Evidence:** [Doc] `CAL3_POST_STRUCTURAL_AUDIT.md` (23:09).

- An audit-only pass comparing live cal3 against a **certified cal2 reference twin** on matched seeds (same scenarios, teams, tactics, frozen coach AI).
- No football behaviour was changed.
- The method of keeping a frozen reference copy and comparing like for like appears here, two days before the flags-off gates of cal7.

## Saturday 22 August 2026 — Pressing, player data v3, and Live-Test RC1

**Evidence:** [Doc] `PRESSING_ARCHITECTURE_REPORT.md` (14:01), `PLAYER_DATA_V3_4ATTR_INTEGRATION_REPORT.md` (16:09), `RELEASE_RC1.md` (16:58), `LIVE_CASE_EA63CD2C4C6D_FORENSIC.md` (00:43, 23 Aug), `SHOT_CHOICE_CAL6_EXPERIMENT.md` (01:58, 23 Aug). [Local] `~/TouchlineRC1` created 23:50, first database backup 23:58, `ngrok.log` opened 23:50; `bridge.py`, `Dockerfile`, requirements, soak and season smoke tools 16:21–16:52.

**Work completed.**
- **cal3 → cal4, pressing** (14:01): make pressing "a genuine football tradeoff, not a dominant strategy". It acts only through decisions, movement and geometry: "no intensity ever modifies an attribute, no bonus/penalty scalar exists anywhere."
- **cal4 → cal5, player data v3** (16:09): a four-attribute integration of the 160-player workbook (`players-v3-4attrs`).
- **Release engineering** (16:21–16:58): the mapping layer, a reproduction tool, backups, telemetry, a soak test, a season smoke test, a Dockerfile and the **RC1 release manifest**. Touchline `0.1.0-rc1` = FC Simulator **v0.7** + calibration **v0.7-cal5**, football sources byte-identical to a named checkpoint with a rollback tarball, a session cap of 25, and SQLite.
- **Deployment** (23:50) to `~/TouchlineRC1`, behind an ngrok tunnel (`ngrok.log` opened 23:50). The build preserved from that deployment is **0.1.0-rc1.1** (`app-rc1.1-backup`, created 23:50). No app folder for plain `0.1.0-rc1` survives, so whether RC1 itself ever ran there is Uncertain. **Reconstructed**, the first live match: MW01 Everton 0–0 Liverpool, on a season save that later documents keep intact through MW08.

**The first live case, and a rejected fix (after midnight).**
- The MW01 forensic (00:43) reproduced the saved match exactly and found a "systemic shot-selection defect".
- Five shot-only repair formulations were tried as runtime patches, and they **exploded the aggressive ecologies**. Verdict at 01:58: **"KEEP CAL5"**, with the engine never modified.
- The real discovery (accepted the next day as cal6): candidate xG **ignored block risk**. "0.10–0.20 xG" chances in sieges were really worth about 0.03, so cal5 was "far less broken than raw-xG suggested".

**End-of-day state.** A hosted, playable Touchline on a frozen calibration, with the first live season under way.

## Sunday 23 August 2026 — The live-case loop: RC2 to RC6 in one day

**Evidence:** [Local] app backups at 14:21 (RC2), 16:19 (RC3), 18:13 (RC4), 21:38 (RC5) and 23:15 (RC6), each preceded by a database backup; staging folders `TouchlineRC2-staging` … `RC6-staging`; 126 files modified. [Doc] Live-case forensics and the cal7–cal10 reports, all dated 23 Aug.

**The method.** A disciplined loop, run five times in one day:
1. The user played a matchweek on the hosted release.
2. A match that felt wrong became a **live forensic case**, reproduced to the exact saved digest from its seed and versions.
3. The smallest causal repair was built in an isolated experimental copy (`exp_st`, `exp_pd`, `exp_ai`, `exp_gs`) behind flags. The gate: **with the flags off, the experiment reproduces the live digest bit-exactly**.
4. It was released as the next RC, with a database backup and an app rollback folder.

**The repairs.**
- **cal6** (accepted at 13:46, before RC2 at 14:21). The action-choice package. It re-measured candidate chances on the truthful axis `xg·(1 − p_block)` instead of raw xG, the discovery that followed the rejected shot-choice experiment of the night before.
- **cal7** — spatial-temporal architecture, from the structure forensic of live case 2.
- **cal8** — penetration and displacement: rest-attack staffing and more, from live case 3.
- **cal9** — attacking intelligence. Overloads *emerged* from F1+F2, so the planned F3 was not needed and not built.
- **cal10** — game-state risk policy, from live case 5: a weak team's open-play threat.

**End-of-day state.** RC6 live on cal10. The season save is intact, and every earlier matchweek keeps its own calibration stamp.

## Monday 24 August 2026 — RC7 and RC8: the first animated match renderer ships

**Evidence:** [Local] RC7 deployed at 03:10 (`rc7-20260824-031049.log`), RC8 staged at 18:28 and deployed at 20:20 (`rc8-20260824-202037.log`). [Doc] `ANIMATED_RENDERER_MILESTONE1.md`, `RENDERER_MILESTONE2_ANIM2.md`, `RC7_DEPLOYMENT.md`, `RC8_DEPLOYMENT.md`, `BOX_ARRIVAL_EXPLOITATION_CAL11.md`, live case 7.

This is the day **match presentation** first became real, and it is the true beginning of Touchline's visual history.

**Animated renderer, milestone 1 (anim1).**
- The match API gained an opt-in `frames: true`, which advances the engine one simulated second at a time and snapshots positions and activities.
- In the page, a ~600-line vanilla Canvas 2D module (`AnimR`) interpolates between those authoritative states.
- **Architecture decision:** no framework and no game engine. The legacy circle markers stay as `?renderer=circles`.
- **Governing rule, first written here:** "the renderer visualizes the authoritative simulation; it is not a second simulator."
- **RC7** (`0.1.0-rc7`) shipped it at about 03:10. It carried a proof that four configurations produce the same match digest: local full run, local with frames, hosted full run and hosted with frames.
- **Bug found in verification:** an AI substitution arriving mid-batch crashed the frame sampler, because bench players had no state yet.

**Milestone 2 (anim2) — three clocks.**
- The design separates the authoritative simulation clock, a **presentation timeline**, and the wall clock.
- The presentation timeline plays interesting seconds (shots, dribbles, box entries) near real pace and compresses quiet circulation up to 40×, without ever skipping an event, and it holds the simulation clock while a ball is visibly in flight.

**cal11** (from live case 7, a "sterile equilibrium").
- Box-arrival runs onto *relational* destinations such as the near post, far post and penalty spot, plus a post-beat exploitation window.
- "Smallest causal corrections; no statistical tuning anywhere."

**RC8** (`0.1.0-rc8`, about 20:20) shipped cal11 with anim2 as the default renderer.
- Six configurations, from circles to anim2 at 4×, produced **one digest**: "renderer modes and playback speeds provably cannot touch football".
- A test harness's timeout killed the production process mid-battery. Recovery worked, with no data lost.

**End-of-day state.** A hosted Touchline in which you manage a team and watch matches animated in 2D, on a frozen, provably renderer-neutral engine.

## Tuesday 25 August 2026 — The continuous body: studying SWOS, rejecting "B", accepting Hybrid-C

**Evidence:** [Doc] `SWOS_PHYSICS_MOVEMENT_REFERENCE_STUDY.md`, `RENDERER_MILESTONE4_PHYSICAL_BALL.md`, `rforensic/ANIMR3_CHECKPOINT.md`, `sandbox/CFR_REFERENCE_SPEC.md`, `sandbox/CFR_MILESTONE_REPORT.md`, `CONTINUOUS_WORLD_ARCHITECTURE_STUDY.md`, `BRAIN_BODY_INTEGRATION_STUDY.md`, `HYBRID_EMERGENT_EXECUTION_STUDY.md`, `PHYSICAL_POSSESSION_ECOLOGY_STUDY.md`, `TRANSITION_BOX_DEFENSE_REPAIR.md`, `PRODUCTION_INTEGRATION_PREREQUISITES.md`, `FINAL_PREREQUISITE_WORKSTREAM.md` (all dated 25 Aug). [Local] 116 files modified, mostly under `integration/`. [Later] an engine memory note records "B (brain-steered) rejected permanently 2026-08-25; Hybrid-C accepted".

**The question.** The animated renderer could only *interpolate* one-second states. What would it take for the ball and players to move physically?

**Research.** Sensible Soccer (SWOS) was studied as a reference through the MIT-licensed **OpenSWOS**. The unlicensed `swos-port` code was deliberately not used. Every SWOS principle was classified:
- **Adopt:** linear friction, restitution with a sticky settle, radius possession with kicker exclusion, touch-ahead dribbling, camera slew, separate clocks.
- **Add** (Touchline-native, missing in SWOS): locomotion inertia and facing.
- **Reject:** SWOS's AI, 8-way facing and arcade pace.
- **Defer:** spin, slides and a full goalkeeper machine.

**Renderer milestones 3–4.**
- anim3 added an authoritative-alignment layer.
- **anim4** replaced the interpolated ball with a **continuous physical ball**: x/y/z with velocities, gravity, linear decay and restitution.
- Both are staging only.

**The Continuous Football Runtime (CFR).** An isolated sandbox body, milestone "body only; stopped before integration".

**Three architectures were compared on matched seeds:**
- **A, native:** the frozen cal11 engine resolves outcomes abstractly.
- **B, brain-steered:** the brain rolls the outcome first, then steers the physical ball to "realise the script".
- **Hybrid-C:** the brain decides *what* to attempt; the physical body resolves *what happens*.

**Decision.** **B was rejected permanently and Hybrid-C was accepted** as the target body architecture: "randomness pre-consequence only". A Python port of the body (`integration/body.py`) and an adapter were built in a lab.

**Discovery.** Several of cal11's own mechanisms had been silently cut at the brain–body seam, and were reconnected at physical events.

**Transition repair.** Counter-attacks converted at about 50% because of goalkeeper and touch mechanics (a back-pass parried as a shot, dives without landings, cushions toward goal), not because of weak rest-defence. Conversion fell to about 4%.

**End-of-day state.** A physical body ready to sit under the frozen brain, with every prerequisite passed except box-defence structure (repaired the same day). Production RC8 untouched.

## Wednesday 26 August 2026 — Integration gate, cal12, and the authority forensic

**Evidence:** [Doc] `PRODUCTION_INTEGRATION_GATE.md`, `CAL12_CADENCE_STUDY.md`, `CAL12_FINAL_READINESS_STUDY.md`, `CAL12_READONLY_EVIDENCE_PACKAGE.md`, `POSSESSION_AUTHORITY_REPAIR_STUDY.md`, `PURSUIT_REPAIR_STUDY.md`, `RECEPTION_REPAIR_STUDY.md`, `LONGBALL_MOTION_REPAIR_STUDY.md`, `AUTHORITY_ARCHITECTURE_FORENSIC.md` (dated 26 Aug). [Local] 94 files modified.

**Production integration gate.**
- Hybrid-C + cal12 went into the real package (`fc_simulator/world.py`, `continuous.py`, `worldflags.py`) **behind a flag defaulting OFF**.
- The integrated engine reproduced the accepted candidate **bit-for-bit across 20 matched seeds**.
- A checkpoint tarball was taken for rollback.

**Repairs.** Receptions, pursuit, possession authority and long balls were each fixed at their measured cause.
- Example: a reception "fat tail", where 6 of 86 episodes drifted more than 2.5 m, was physical. The receiver's arrival momentum and the cushion direction disagreed.

**Authority forensic.** A map of which system writes what, when and with what priority, written from the call sites rather than the documentation, and compared against an FC 26 reference report.

## Thursday 27 August 2026 — Throw-ins, then the repository is born

**Evidence:** [Doc] `BALLOUT_BARRIER_STUDY.md` (dated 27 Aug). [Local] 40 files modified 12:31–17:48. [FC-Sim Git] and [TL Git] root commit `a0cd26d` at 17:48.

**Morning — the throw-in barrier.**
- A viewer and a harness disagreed. **"The harness measured a different game than the one shown"**: the viewer's generator injected a forced goal that the harness census never ran.
- The real cause was a throw-in executed with the ball still beyond the line, which was then re-ruled out for the other team.
- The fix was a hard rules-state barrier.

The evening entry below continues with the repository.

> **Transition 1 — from a working tree to Git (27 Aug, 17:48).** Everything above lived in one working directory, backed up by tarballs and the `~/TouchlineRC1` release folders. At 17:48 it was committed as a single squashed root, `a0cd26d` ("checkpoint: pre-visual-integration simulator baseline", 535 files). It was pushed the same minute to **TouchlineSimulator** (`main`, later tagged `pre-visual-integration`) — the first GitHub repository ([TL Git]; reflog "update by push").
> - **What moved:** the whole engine, lab, app, studies and tests, *as a snapshot*.
> - **What stayed behind:** the day-by-day history, the release folders and the database backups; there are no per-file commits before this point.
> - **Why:** Reconstructed from its name and the following commits. To checkpoint the simulator before "visual integration" began on a separate branch (`visual-integration-v1` was created 40 minutes later).

---

# Part II — Visual integration, physical football, and the goalkeeper (27 Aug – 14 Sep)

## Thursday 27 August 2026 (evening) — Visual V1: a perspective pixel-art match view

**Evidence:** [FC-Sim Git] 25 commits, `a0cd26d` (17:48) → `c4f13e1` (00:58, 28 Aug). [TL Git] `a0cd26d` pushed to TouchlineSimulator at 17:49. The branch `visual-integration-v1` was created at 18:28 (reflog).

**Starting state.**
- RC8 in production, with the 2D Canvas renderers anim1/anim2 (and anim3/anim4 staged).
- A set of PixelLab assets already accepted: a 128 px 8-direction player (character `31a11357`: idle, jog, sprint) and a grass tileset. **Uncertain:** when and how these were generated. The import commit calls itself a "read-only retrieval" of accepted assets, so the generation happened earlier and left no other record.

**Goals.** Move from the flat 2D Canvas match renderer to a pixel-art broadcast view with a real camera, without touching the engine.

**Work completed.**
- **Asset freeze** (`5c07b25`): the accepted PixelLab assets were imported read-only with a `MANIFEST.json` acceptance record and `HASHES.sha256` lock. Competing variants were kept but not used at runtime.
- **Renderer and camera sandbox** (`f1fde10`): a standalone browser sandbox with a regulation 105 × 68 m procedural pitch, goals and an FC-style sideline camera, plus `pivots.json` measuring each sprite's foot offset.
- **Grass:** per-metre Wang tiling produced a "corduroy" of micro-stripes, so it was replaced by palettes extracted from the frozen tiles plus deterministic value noise (`fee6295`).
- **A true perspective camera** replaced affine Y-compression (`97ec2d0`). The ground uses an exact per-scanline homography, and markings and goals are projected vector geometry (the centre circle becomes a true conic). `CAMERA_V1` was recorded that evening (height 30 m, 43 m from the touchline, FOV 28°, `ad72d17`).
- **Stadium composition v2** (`65b5d99`): the stadium became projected world geometry, textured from measured bands of the generated grandstand strip.

**Experiments and iterations — the goal.** The goal went through six versions in one evening:
- a generated front-on goal (orientation wrong for this camera);
- a procedural 3D goal with a spring-mesh net (`a819b59`) and then a denser production Goal V3 (`4a88fac`);
- a reference-guided oblique goal sprite, made with exactly one authorised image-to-image generation (`92d637e`) and regenerated at full resolution (`9d0b5fb`);
- a deterministic "V2.1" rebuild that was **rejected** in favour of repairing the V2 art itself: V2.2 "surgical repair" cleared stray poles and filled net tears, changing 3,246 pixels, all logged (`d0b561c`).

Fitting a 2D sprite to a perspective goal kept failing:
- the first two-post fit ballooned the sprite (`f6c0b7c`);
- the left/right orientation was reversed (`5c20be6`);
- scaling from a fixed player depth made the goal "breathe" as the camera tracked, so it was re-scaled from the goal's own projection (`e29dadc`).

**Camera architecture — tried, and partly reverted.** After midnight, `ab76899` introduced a "frozen projection" renderer: the world is projected once into a 2D V-space, and the camera only pans and zooms.
- A measured finding followed (`61b32a9`): no translation-plus-uniform-scale can seat the baked goal art, because its mouth-line angle (69.4°) differs from the projection's (31.6°), leaving 27 px of error per post. A one-time projective bake fixed that (`c67496a`).
- Panning a single-viewpoint projection read as "a fixed rig looking around", so a strip/pushbroom projection was tried (`0614d2a`) and **reverted six minutes later** (`2019be6`).
- The accepted answer was a **physically translating rail camera** (`9a4294c`): the `CAMERA_V1` pose travels along the touchline, with the camera and its look-at point moving together. A 10 m test square projected identically at every rig position, which proves the camera translates rather than pans.

**Live match preview** (`9d3ed6a`). The first engine-driven view: `match.html`/`match.js` render a real simulator match through the untouched Touchline API. `serve_match.py` adds a static server with an `/api` proxy. `verify_determinism.py` showed that requesting render keyframes does not change the match (three full matches, digests identical). It carries forward the renderer-neutrality rule first written on 24 Aug.

**Design decisions.**
- The engine is read-only to the renderer.
- Generated art is used only where it survives geometric scrutiny.
- The camera is a physical rig, not an image effect.

**End-of-day state.** A live simulated match is visible in a perspective broadcast view: frozen sprite players, grass, a stadium shell, a travelling rail camera, and the V2.2 goal mapped onto the true 3D goal quads as world-anchored panels (`c4f13e1`, foot registration 0.000000 px).

**Next direction.** Goal nets, ball height, and anything beyond sprite billboards.

---

## Sunday 30 August 2026 — Nets, net physics, a 3D ball, and the continuous body goes live

**Evidence:** [FC-Sim Git] 26 commits, `9d2a67b` (20:08) → `5cc7461` (03:10, 31 Aug). No commits on 28 (after 01:00) or 29 Aug.

**Starting state.** Rail camera and goal panels accepted. The net was baked art, and the ball had no height.

**Work completed — goal nets.**
- The net was rebuilt panel by panel, and each step came from a diagnosis:
  - a dedicated far-side panel (`9d2a67b`);
  - a derived regular weave, because the transplanted art was a baked two-layer composite that "no corner homography can unbake" (`b770672`);
  - the missing rear plane (`a6a11b7`);
  - a continuous sag field over the cage (`3e3234e`, `fe10239`);
  - one unified net definition around all faces (`eba51a4`);
  - a density study choosing a 0.222 m pitch (`e620862`).
- Then an **architecture change**: a strand-based hexagonal mesh in which the visible net *is* the logical net, with no textures (`99d129f`). Square and diamond topologies were compared and rejected.

**Net physics.**
- A deterministic 240 Hz mass-spring net whose render topology is the physics topology (`6726be8`).
- The first tuning only made local dents. Measurement showed it was "triple-suppressed": the anchor spring leashed each node, damping killed the wavefront, and the wave speed was 1.8 m/s. A six-candidate matrix produced travelling waves that wrap the corner into the side net (`eaf9037`).

**Ball flight and facing — the engine is extended.**
- **Checkpoint A** (`601ff74`). An audit found the calibrated engine resolves aerial actions inside one second, and that its `BallHeightState` is never set. A deterministic z-axis ball-flight integrator was added, launched from the engine's own events, and the server now emits per-second ball height with sub-second samples plus per-player facing. Outcome A/B tests were digest-identical.
- **Checkpoints B and C** (`9428bc5`, `9c026e0`). The renderer draws true height with a separate shadow and uses the authoritative facing.

**The continuous transport runtime** (`8ee2748` → `a7f561c`, just after midnight).
- The integration lab's "Hybrid-C brain × body" (accepted on 25 Aug, integrated behind a flag on 26 Aug; this is **the same work switched on, not a new design**) became the live match runtime: the calibrated brain keeps deciding, and a 60 Hz physical body owns ball transport. That covers real 3D flight, bounces, rolling resistance, receivers meeting the ball, and multi-second flights.
- **Decision:** this intentionally changes match dynamics. It was authorised, and the drift was measured and reported (`a7f561c`) rather than hidden.
- The app version became `0.2.0-world`, and pre-transport live rows are refused on recovery rather than replayed into different outcomes.

**The ball sprite** went through four designs in two hours:
1. a procedural per-pixel ball, rejected as mushy;
2. a hand-authored 15 × 15 ball (`ff6fd6a`); the root cause of the blur was arbitrary resampling, so sprites now render only at 1:1 or integer scales;
3. a PixelLab animated ball (`902b574`), whose first master was rejected at close zoom;
4. round 2 (`33a0bec`), where the rotation set was rejected whole for identity drift and regenerated.

A micro level-of-detail for tiny projected sizes was hand-authored after three generator probes were rejected (`1d600d7`).

**Renderer.**
- A 2× device-pixel-ratio renderer with one authoritative `RES` factor (`fb2e98d`). Player sprites went from about 61 to about 123 device pixels.
- A two-constant visual calibration (`5cc7461`): player scale 0.85 → 0.60 (implied height 2.66 m → 1.88 m), and ball visual radius 0.13 → 0.15 m with the physical 0.11 m untouched.

**End-of-day state.**
- Live matches run on the physical body.
- Nets deform and carry waves.
- The ball flies, bounces and spins from authoritative motion.
- The view renders at 2×.

---

## Monday 31 August 2026 — Occupancy, possession, dribbling, and the kick library

**Evidence:** [FC-Sim Git] 21 commits, `8615592` (14:15) → `5f68f2e` (04:15, 1 Sep).

**Starting state.** The continuous body was live, but players overlapped freely, possession changed hands by proximity, and animation was an idle/jog/sprint loop.

**Visual calibration by user choice.**
- Ball visual radius 0.19 m, chosen from a six-candidate live study (`8615592`).
- True-depth perspective for sprites (`52e3245`), then a **perspective compression** of α = 0.40, chosen from seven candidates with flat (0.00) and full perspective (1.00) as controls (`7eb4ae3`). Full perspective made near and far players differ in size by 2.12×; α = 0.40 gives 1.35×.

**Engine: player physical occupancy V1** (`65da1c7`).
- Players are solid 0.32 m discs in the authoritative body. The solver predicts per-body velocity, then does a positional mop-up.
- It replaced a single-pass push that skipped exactly-coincident pairs and shoved stationary blockers.
- Zero penetration in the harness, with a maximum of 5 mm in full matches.
- Scores drifted (1-0/1-0/1-0 → 0-1/1-0/3-0) and were **reported, not tuned**.

**Animation prototype and the single-player playtest.**
- PixelLab dribble and shoot clips, ball-free so the authoritative ball is never contradicted (`6cca706`).
- A **contact-sync contract**: the kick instant is scheduled first, and the animation's authored contact frame is shown exactly then.
- The **Single Player Test** harness (`cbfd5d8`): a verbatim client-side port of `world.py`'s movement and ball laws. Keys feed desired velocity only, and deterministic replay was verified.
- A "button not appearing" report turned out to have three independent causes, including browser caching and a server at its session cap (`3e24abd`).

**Engine: possession, dribbling and locomotion.**
- **Persistent possession + challenge routing V1** (`d3858ef`) separated three things one 0.95 m threshold had collapsed together: ownership, challengeability and loss. It removed silent proximity steals (16% of possession spells → 0).
- **Controlled Dribbling V1** (`cf7b81c`): touches are *solved* (cadence, contact distance, impulse), not set, so ball–carrier separation now depends on speed. Before, it was about 1.0 m at every speed. V1.1 (`5663d02`) added corridor slew for turns.
- It exposed a limit that was not the dribble's fault: a sprinting body needs about 5 m to reverse. **Player Locomotion Responsiveness V1** fixed it (`c9bde59`, 0 → sprint in 0.87 s, previously 1.55 s), and the dribbling U-turn limit was resolved.

**Dribble and kick animation — the sprite era's peak, and its limits.**
- **Dribble animation V2/V2.1/V3** (`c007a81`, `4a9707a`, `546c050`): a foot-synchronised touch library in which physics chooses the foot and pose, then an 8-direction version. Reported art gaps included sprint reach, diagonal reach, and turns through north/south.
- **Kick animation V2** (`dcf4f3d`): techniques (inside, laces, power, outside/trivela, chip) plus preferred-foot selection from the engine's own kick descriptor, with no new randomness.

**Experiments — the inside-foot kick (rejected three times).**
- **V2.0.1** re-authored side-foot mechanics (`ecacfde`); rejected live because it "read as a weaker laces drive".
- **V2.0.2** authored four exaggeration levels, and the finesse-like one won (`f1c3d88`); rejected live again.
- **V2.0.3** (`4876e23`). A capability finding: the generator "cannot hold static poses or articulate ankle-vs-shin rotation", so the contact frame was **hand-pixelled**.
- **V2.0.4** (`b2f7427`). The contact geometry was chosen from G1–G4 body candidates and an H0–H4 contact-height sweep. It is implemented as eased, presentation-only root motion.
- Finally (`5f68f2e`), west-facing kicks were found to show the *wrong leg*: the documented "mirror flips the foot label" had never been implemented.

**End-of-day state.**
- A playable single player with solved dribbling, responsive locomotion and technique-specific kicks, on an engine with occupancy and duel-routed possession.
- Every animation gap is labelled, not disguised.

---

## Tuesday 1 September 2026 — Power, curve, a rigid goal and a real net membrane

**Evidence:** [FC-Sim Git] 9 commits, `28bb8d9` (15:46) → `2a5ebfc` (04:07, 2 Sep).

**Work completed.**
- **POWER_R V2-BR5** (`28bb8d9`). A driven laces kinetic chain, the product of ten user-gated study rounds (18 generations, final assembly hand-authored). It replaced a toe-up, chip-like follow-through.
- **Variable shot charge + INSIDE_R curve** (`8c96b83`): hold-to-charge per technique, and a spin law curling the ball toward the travel-left.
- Then **target-solved launch + the X3 curve** (`96c7b67`): the curve strength (k = 0.22) and an oracle-calibrated setup surface make the curling ball re-cross the aim line *at* the intended target, with zero post-launch steering. The earlier "S1 setup ramp" was removed.
- **Goal Frame V1** (`7d6e306`). Posts and crossbar became swept, rigid capsules (restitution 0.72), and a goal became a **whole-ball crossing**: the trailing point of the ball, not its centre. A far-post "distortion" was traced to the crossbar strokes, not the net (`ff4fd4d`).
- **Net Physics V2** (`2ad37ae`). The ball collides with the *current deformed* node cloud, two-sided and swept, so it cannot tunnel or leak through the roof. Goals became a continuous legal-mouth crossing event.
  - V2 had frozen the net after contact, a "dead net" regression. V2.1 (`06fb7d9`) decoupled containment from excitation, and the approved candidate C restored the waves.
- **Directional kick authoring package** (`4ae5160`). The six missing shooting directions were handed off as a specification package for skilled pixel artists, with rejected experiments quarantined "do not author from".

**An important discovery — chunk invariance** (`2a5ebfc`, the early hours of 2 Sep).
- The continuous runtime overshot its requested time by up to one tick per call. As a result, `run(a); run(b)` differed from `run(a + b)`, so a *watched* match and an *instant* match with the same seed diverged.
- Three fixes followed: a cumulative-time tick target, matched termination with an in-simulation score sync, and a shared canonical event stream.
- Full and live matches became byte-identical over 90 minutes. This is the clearest early statement of principle 3.

**End-of-day state.** Charged, curling, target-solved shots; rigid posts; and a physically containing net, all on a runtime whose results no longer depend on how time is chunked.

> **Transition 2 — a checkpoint to TouchlineSimulator (2 Sep, 06:12).** The whole visual-integration line up to `2a5ebfc` (81 commits) was pushed to TouchlineSimulator as branch `checkpoint0` ([TL Git], reflog). It is a copy, not separate development: every one of those commits is also in FC-Simulator. It was the last push to TouchlineSimulator.

---

## Wednesday 2 – Thursday 3 September 2026 — Goalkeeper V1 (committed as one checkpoint)

**Evidence:** [FC-Sim Git] 1 commit, `fbcd19c` (21:21, 3 Sep). [Local] Dated review folders `gk_v1_stage0`, `gk_v1_stage1`, `gk_v1_stage2` (2 Sep); `gk_v1_stage3*`, the reach, envelope, read-commit and foot-save studies (3 Sep).

**Reconstructed:** the keeper was built in stages over two days and committed once. The commit calls itself a "local checkpoint … uncommitted since 2a5ebfc". The exact split of the work between 2 and 3 Sep cannot be established from Git.

**What the checkpoint contains** (a JS playtest keeper in `match.js`):
- Stages 0–3: aperture positioning (Q2.5), a READ → PREPARE → COMMIT → SAVE decision with a frozen commit, a coupled anisotropic reach envelope, and swept FOOT/LEG/BODY/HAND anatomy.
- **Stage 3 "freeze v2".** An interception-point audit found the selection and the commit disagreeing: fingertip-band points beat deeper, reachable ones.
  - Rule **S2** (the earliest point reachable with margin) was adopted.
  - **S3** ("most comfortable") was tried and **rejected** because the keeper retreated.
  - The ball predictor was rewritten to mirror the real ball's integration order and curve law, which fixed 0.7–1.4 m post-bounce errors.
- **Stage 4:** contact quality (catch / controlled parry / weak parry / fingertip / body block / foot save / leg save) from continuous contact geometry, with no save roll.
- A deterministic evaluation battery (`tools/gk_eval`).

**Validation.** Keeper collision off = byte-identical to `2a5ebfc` across 14 batteries; 0 mirror mismatches in 300 cases.

---

## Friday 4 September 2026 — Keeper integration, attributes, and the first sprite keeper animation

**Evidence:** [FC-Sim Git] 5 commits, `4067542` (06:06) → `ed47bac` (23:48). [Local] About twenty dated audit folders (positioning V2, set-depth calibration, depth, causal-behaviour, curve/depth, X3 magnitude, long-shot movement, goal-face audits).

**Work completed.**
- **Integration pass** (`4067542`):
  - A new positioning surface and the "D2 BALANCED" set depth.
  - A fix for a forward "hop" caused by a stale clamp from an older positioning layer.
  - A causal save-action time (reflexes, diving, jumping) replacing per-tier constants.
  - Keeper-clock prediction.
  - Rebound continuity: any number of contacts per shot.
- **Gather, chest catch and bounded reach maps** (`cad400a`): the Courtois profile uses the project's own ratings (no external OVR). Reach exponents were A/B-tested and the envelope exponent was kept at 2.2.
- **A continuous attribute system** (`132837f`):
  - Ratings of 90–99 were "mechanically identical" under the old clamp and now saturate softly.
  - A sub-tick commit origin removed a 16.7 ms reaction staircase.
  - A 200 cm keeper had reached *less* along the ground than a 175 cm one, which was fixed.

**Reconstructed — findings from the day's audits** (local records; titles and dates only in the repository evidence):
- The keeper's depth rule was too deep beyond 12 m.
- Curl did not "fool" the keeper, and central concessions were physically unreachable rather than bad decisions.
- The accepted X3 curl was about 4–5× the size of a measured professional free kick, although its shape was right.

These fed the following days' work but did not change the mechanics that day.

**GK Animation V1** (`80231f9`). A physics-driven sprite runtime:
- a frozen `GK_BASE_V1` identity, a manifest, and a simulation-driven state machine;
- authored PixelLab clips and a 43-scenario **simulation-neutrality gate** (traces identical to the frozen `132837f`).

This gate protected every keeper change for the next ten days.

**Rejected the same night — V1.1** (`ed47bac`).
- The side-view dive clips were **retired from live selection**, and families without approved art now draw `ART_MISSING` instead of reusing another family's clip.
- The save taxonomy now comes from the physical action.
- Crucially, the save direction became independent of the keeper's facing.

**End-of-day state.** A mechanically rich keeper with honest, partly missing, sprite presentation.

> **Transition 3 — FC-Simulator becomes the project's repository (4 Sep, 19:34).** Branch `visual-integration-v1` at `cad400a` was pushed to a new GitHub repository, **FC-Simulator**, where it is still the default branch; `main` followed within minutes ([FC-Sim Git], reflog).
> - **What moved:** the same Git history (`a0cd26d` onward), nothing re-implemented.
> - **What stayed behind:** TouchlineSimulator, frozen at `a0cd26d` / `checkpoint0`.
> - **Why:** not recorded (Uncertain). From here on, FC-Simulator is the only repository receiving work.

---

## Saturday 5 September 2026 — Salvaging a keeper from sprites

**Evidence:** [FC-Sim Git] 26 commits, `96ee85e` (12:10) → `a45a802` (03:21, 6 Sep).

**Goal.** Give every save a believable contact pose using stills, while keeping the simulation untouched.

**Work completed, and the path to it.**
- **V1.2 camera-space save poses** (`96ee85e`): two screen-space save directions (up- and down-screen), one continuous airborne-dive family, and a review page.
- **SW/NW goalkeeper footwork** (`67baf53`) appended to the existing PixelLab group, with the manifest byte-identical elsewhere.
- **A regression and its lesson** (`dd15136` → `e959db6` → `021f6b2`):
  - A "fix" for a frozen shuffle frame measured speed from displacement, but it zeroed footwork for *every* facing, because the previous root was refreshed before the state machine ran. It was reverted within 16 minutes.
  - The real root cause, found an hour later: the visible readiness motion is the footwork loop idling on the controller's ±0.7 mm residual step. SW/NW had been playing their loop *reversed* on one side.
  - **Lesson recorded in the tooling:** visual acceptance needs `dir8_trace` against a frozen build; the gate alone is not enough.
- **Crouch art** (`ca0812d` → `fde52f2`, then removed from live in `9b78308`): the generator's image edit folded the keeper at the waist. A PixelLab "crouching" template frame gave an upright-backed squat. In the end the original frames were kept.
- **Pose salvage** (`5decf7c` → `9b78308` → `1514097`): five inventory stills became *contextual* save poses, chosen by scoring the committed geometry (reach similarity, facing, tight angle, near/far post). Six low side-save variants followed, with orientation corrections from live review (`c81ba0c`, `ff9d7a6`).
- **Pro-generated contact poses**:
  - DIVE_NORTH (`9f44a6e`, 50° rotation, derived by the builder from an untouched source), then extended to all far dives (`a08e3e6`).
  - The dive pose made the keeper **39% larger** whenever it appeared, because the Pro art is drawn at a different pixel density. Anchors now carry a measured `pixel_scale` (0.72), taken from the body's proportions (`5084e55`), and the low stills were calibrated the same way (`248eac7`).
  - A top-left-corner pose salvaged from a failed south attempt (`a680683`); a south-west far dive whose mapping was established from the simulation, not from labels (`e335671`); a low far dive to the left (`9a3ae9f`, with its scale revised twice in live review).
- **Rig tooling** (`a45a802`): an articulated component rig and an in-engine dive interpolation test (review-only).

**Neutrality.** 43/43 on every one of the 26 commits.

**End-of-day state.** Every contact pose in the save matrix has art or an honest diagnostic, but a pose is still a single still: there is no motion between SET and contact.

---

## Sunday 6 September 2026 — The first real dive animations

**Evidence:** [FC-Sim Git] 14 commits, `5ad087c` (11:35) → `6659cc2` (02:48, 7 Sep).

**Work completed.**
- **SOUTH V6 → DIVE_SOUTH_MEDHIGH** (`5ad087c`, `7736a3b`, `112ffb0`, `a1e8838`): a manually cleaned, mirrored Pro sprite, calibrated in camera and rotated (15° CW, then finally 20° CW at scale 0.85).
  - [Local] folders `gk_dive_south_v1` … `v7`, all 6 Sep, show seven iterations.
  - [Later] The 20 Sep history handoff explains why V6 won. **V6 had trustworthy pose geometry** (body axis about 138°), while a generated **V7** read better (separate arms and gloves, a face) but changed the pose (about 90°). V7 was rejected as geometry-authoritative.
  - V6 was then **cleaned by hand**: 76 pixels recoloured, no alpha changes, silhouette byte-identical.
  - Standing rule from this: re-derive from the preserved clean source rather than re-transforming a transformed raster.
- **Live ART_MISSING fixes** (`ece4481`, `7701343`), reproduced through the keyboard free-play path:
  - The frozen facing pointed away from the shooter on late or rebound dives.
  - Flank shots fell below the minimum score.
  - A forced keeper-side fallback took live ART_MISSING from 4/301 to 0/302.
- **A prototype full dive** READY → CONTACT → LAND → RECOVER → READY through the review harness only:
  - V1 (`1228e67`) used a shoulder-pivot cartwheel.
  - V2 (`6777b5f`) re-authored it with hips and head on their own paths, a style bridge to the Pro contact art, and a **presentation root** that continues the dive's momentum and eases back to the simulation root.
- **LEFT_FAR, the first production dive animation** (`b03176f`): 12 pre-contact and 13 post-contact frames baked from the prototype. The pre-contact frames are keyed to the simulation's own progress `u`, and the post-contact frames run in seconds after `endT`. Free-play ON vs OFF deviation: 0.000000 m.
- **The animation library overnight** (`e6f54b8`, `21ba259`, `8f17f9b`): RIGHT far, RIGHT top-corner, six low/ground sequences, south-west far dives, low-far left and four tight-angle sequences. That made **16 sequences live**, with per-facing anticipation variants.
- A final review-package toolchain (`6659cc2`).

**Experiments — the component rig** (tooling from `a45a802`, 5 Sep; [Later] 20 Sep handoff).
- About 244 sprites were audited. A west-facing SET keeper was cut into about 18 parts with pivots, and a north-dive interpolation test was built.
- It removed the worst SET → contact pop and helped with load, push, early flight and bridge frames.
- Its limits:
  - 2–3 px rotated limbs stair-stepped at native resolution;
  - joints showed seams;
  - perspective changes could not be solved by articulation;
  - base-style and Pro-style art popped against each other.
- **It was the conceptual precursor of the skeletal system, not its final form.**

**End-of-day state.** The sprite keeper dives with motion, both sides, several heights and three facings, still bit-neutral to the simulation. [Later] The handoff's own verdict on the overnight library: the broad attempt "made the sprite asset-scaling problem obvious". It lists base-to-Pro style steps, low stills flipping perspective at bridge frames, missing stills, and cleanup that was automatic rather than hand-authored.

---

## Monday 7 September 2026 — Rebuilding the right-side dive; the contact angle

**Evidence:** [FC-Sim Git] 7 commits, `27b60cd` (13:50) → `07359c7` (15:55).

**Work completed.**
- A **RIGHT far-dive V2 rebuild**, review-only (`27b60cd`): pre-contact frames designed backwards from the approved NORTH contact art.
- **The contact-orientation test.** Round 1 tilted the NORTH contact sprite to 50/45/40/35° clockwise (`44be84a`), which turned out to be the **wrong direction**. Round 2 tested 50/55/60/65° (`c01e85c`), and **60° CW** was approved and went live (`de8451b`). The 50° asset was kept as the approval record of 5 Sep.
- **Lesson (reconstructed from the two rounds):** contact angles are judged visually in camera, not derived from vector maths.
- V2b late flight retargeted to 60° (`b2995de`), and a world-plane landing/recovery plan (`07359c7`): both review-only, not integrated.

**End-of-day state.** The sprite keeper library as of the evening of 6 Sep, plus a better right-side contact angle. The V2 rebuild was left awaiting review.

---

## 8–13 September 2026 (no commits) — A new sprite generator, the Salah sprite, and dive lessons

**Evidence:** [Later] only: the 20 Sep history handoff (phase 11) and the 23 Sep memory export, which dates these "historical sprite lessons" to **10–14 Sep**. [Local] `review_artifacts/gk_right_generator_input/` (14 Sep). No commit, and no surviving output image, is identified. **Every claim in this entry is a later recollection.**

**A new sprite generator.**
- All eight directional idle sprites were given to a newly available image generator. The aim was for it to infer the character's identity, kit, proportions and pixel language, then draw left and right dives.
- Its outputs **repeatedly used the wrong camera**: conventional horizontal side-on dives instead of Touchline's fixed-camera, west-perspective foreshortening.
- More precise prompts did not reliably fix the geometry. **Decision: generated dive replacements rejected.**

**Lessons recorded for dive art.** The keeper-right direction is body-relative, not screen-right, and the fixed camera looks along the shoulders rather than at the chest. The recorded constraints:
- depth order right arm → head → left arm;
- the head between the arms, gaze level;
- the near glove shown edge-on by rotating the wrist;
- a piecewise angular body line in the keeper's own frontal plane, not a smooth arc across the screen.

The recurring failure modes were a frontal torso, a palm-facing near glove, the head above the arms, a long neck and an upward gaze.

**The Salah sprite.** A request for a Salah sprite matching the existing eight-direction idle baseline, from two reference photographs, in a Liverpool kit with **11** on the back. It is the first recorded real-player *sprite* request; real-player *management cards* (including Salah) already existed on 18 Aug. It is distinct from the later 3D Salah in the Astra roster (22 Sep), which is not in the runtime.


---

## Sunday 13 September 2026 — The user's vertical high-save sprite

**Evidence:** [FC-Sim Git] 6 commits, `a01737d` (01:25, 14 Sep) → `ff3a89f` (02:50, 14 Sep). [Local] `gk_vertical_high` (never committed). [Later] The 20 Sep handoff: the image was "not a native sprite" but an upscaled render with a noisy background; its native grid was recovered at 47×124 px. The lean was bracketed 0–20° and then 20–30°, and the user preferred the stronger lean.

**Work completed.**
- Tooling to recover the native pixel grid of an upscaled sprite the user supplied (`a01737d`), and a rotation-only test (`8b9e816`).
- **VERTICAL_HIGH live** at 25° CW, scale 1.00 (`92ddc33`), replacing the overhead reach pose, with a post-frame commit hold so the landing is not cut off.
- Jump-sequence authoring tooling, review-only (`29fbd87`), and two fixes to the free-play hunt harness (`204ac3e`, `ff3a89f`).

`ff3a89f` became `main` and was later tagged `checkpoint/sprite-baseline-2026-09-19`: **the last state of the sprite era.**

---

## Monday 14 September 2026 — The manager app, photographed

**Evidence:** [Local] `review_artifacts/touchline_screens/` (README dated 14 Sep; folder created 15 Sep).

A set of cinematic screenshots of the **Touchline manager app** (`web/touchline.html` on the live FastAPI server). Every state was reached through the app's own functions, with nothing edited:
- the squad builder with a Liverpool XI (4-2-3-1) and a card mid-drag;
- the card flip (attributes on the front, per-player instructions on the back);
- the 13 team-tactics controls with the High Press preset applied live;
- the manager panel;
- the match viewer (both the app view and the pixel-art view, with 8 s recordings);
- a player-detail page with 28 outfield attributes.

This is the app layer that the renderer and physics work sits beneath.

**Gap: 15–18 September.** No commits. **Uncertain:** whether work happened in this gap cannot be established.

---

# Part III — The skeletal era and the outfield game (19–28 Sep)

## Saturday 19 September 2026 — The move to a skeletal 3D presentation

**Evidence:** [FC-Sim Git] 22 commits, `6e14899` (18:38) → `bdfb222` (03:28, 20 Sep). Branch `prototype/3d-animation-pipeline`. Documents: `review_artifacts/3d_animation_architecture/ARCHITECTURE_AUDIT.md`, `PROTOTYPE_FINDINGS.md`.

**Before the pivot — a handoff to Astra.** Earlier the same day ([Local] `review_artifacts/astra_kick_system_handoff/`, 19 Sep; [Later] 20 Sep handoff), a 157-file context package was extracted from the real repository at `ff3a89f`. It was for **Astra**, a second model acting as an independent technical-animation designer, to design a skeletal kick library. It recorded:
- the live match view has no real kick animation, and the richer kicks are playtest-only;
- the server does not serialise the kick descriptor;
- kick art is east-authored, west is mirrored, and six other facings are missing.

This began a two-workstream arrangement: Claude, with repository access, implements; Astra designs, and later builds characters.

**Why the sprite approach became limiting** (from the audit and findings, measured on scenario 42, a real POWER shot tipped over the bar):
- **Contact accuracy.** At the contact tick the best sprite pose (DIVE_NORTH_MEDHIGH) needed a 50 px placement correction. It was capped at 12 px, leaving a **38 px (0.75 m) residual flagged WRONG_CLIP**. The skeletal prototype's glove met the simulation hand to **4.7 cm**.
- **Coverage.** The committed target was a near-vertical tip at 2.68 m. The sprite library had no vertical-jump art, so it played a generic far dive. In the audit's words: "the two backends disagree on the physical action, and the 3D one is right."
- **Scale of the authoring burden.** Every new situation needed new art, orientation studies, per-sprite pixel scale and bounded 2D pixel IK. The 5–14 Sep entries show the cost: salvages, rotations and mirror corrections, one pose at a time.
- **Customisation** ([Later] 20 Sep handoff, phase 13). Sprites multiply work across facing × action × phase × extension × body type × skin × hair × kit × gloves × boots. Meanwhile the animation logic had "become sophisticated enough to resemble a skeletal controller". The purpose of the pivot was stated as **separating motion from appearance** while keeping Touchline's look, not "generic 3D".

**Work completed.**
- **Phase 0:** the checkpoint `ff3a89f` was pushed and tagged `checkpoint/sprite-baseline-2026-09-19`.
- **The audit** (`6e14899`) classified the pipeline into layers and proposed a renderer-independent chain: ActionDescription → animation graph → authored base animation → IK → skeleton → fixed camera. It came with an explicit **simulation root vs presentation root contract**.
- **Backend interface** (`fde2867`): `gkPresentationDraw()` dispatches between SPRITE (unchanged, default) and SKELETAL_3D.
- **A zero-dependency WebGL2 renderer** (`ddad196`) reproducing `CAMERA_V1` exactly, with a 23-bone football-player skeleton. Two-bone analytic IK (`25f7e62`) and an animation graph with an authored far-dive clip (`61cbc0d`).
- **A backend neutrality gate** (`6435145`): 43/43 identical, sprite vs 3D.
- **Lifecycle iterations the same night** (v2–v5), each fixing a measured fault:
  - v2 added anticipation and landings (`e9c73bb`).
  - v3 made the load and push-off readable, with the feet planted by leg IK (`ae745e4`).
  - v4: **one momentum-continuous airborne arc** through contact (`1852141`).
  - v5: the get-up had slid the lying body 0.7 m toward the root, which read as a jump to the near side, so the recovery was split from the repositioning (`eeb7723`).
- After midnight:
  - v6: the body flipped mid-settle because the side was re-derived from the live ball after a parry (pelvis roll about −82° → +82° in one tick). The mirror is now **frozen at commit** (`1db60c0`). [Later] The core rule came from this sequence: continuity must hold for position, velocity **and** orientation. "Animation acceptance is visual; phase names are not proof."
  - A **skinned humanoid test character** on the same skeleton (`15652dd`).
  - A **goalkeeper skeletal motion library** of eight canonical motions (`bdfb222`), with the v6 far dive bit-frozen.

**Design decisions.**
- Keep the sprite backend as the default and the rollback.
- No external 3D library.
- Pixel/2.5D styling with a low-resolution target and nearest upscale.
- The simulation root is never written.

**End-of-day state.** A skeletal keeper that visually explains the same simulation, gated identical to the sprite keeper, with a full dive lifecycle.

---

## Sunday 20 September 2026 — Motion library quality: foot saves and catches

**Evidence:** [FC-Sim Git] 11 commits, `fe08d2e` (13:09) → `2c80700` (01:00, 21 Sep).

**Work completed.**
- **Landing/IK continuity from free play** (`fe08d2e`): a one-way post phase, a uniform-deceleration low landing, IK bend-plane memory, and fold-radius handling.
- A motion library review page and a reference package for **Astra**, the external character/rendering pipeline collaborator (`fc77de1`).

**Rejected and rebuilt.**
- **FOOT_SAVE v8** (stand, lift the leg forward, retract) was rejected on review. **v9** is a lateral **spread block** with hip abduction, a centre-of-mass drop and a grounded absorb (`f57040b`).
- **CATCH v10** was rebuilt from the production sprite catch (`7099645`).
  - Its arms were rejected: the authoritative contact point of a chest catch is at the chest, so two independent arm solves folded the elbows back through the ribcage.
  - **v11** (`6c96f7e`) solves both arms as one cradle, with a receiving plane, elbows sampled outside a torso exclusion volume, and a contained held-ball path.
- **Goalkeeper Distribution v12** (`abe57bd`, just after midnight). A held ball had *no release* in the simulation, so a minimal authoritative contract was added (put-down / roll / throw / punt, fixed release points, no randomness) with skeletal motions presenting it.
- The **Astra handoff package** for the far-dive vertical slice (`2c80700`): the exact skeleton, the per-tick solved motion of fixture 42 and its mirror 49, the camera and the ball. This is the export that the Astra character track (21 Sep) was built on.
- [Later] **V6 accepted.** The v6 lifecycle was reviewed at full speed and accepted, then frozen (fixture 42 must stay bit-identical). The 20 Sep history handoff, written at 00:09, records the decision: put a proper skinned humanoid on the skeleton before authoring any more dives. V6 is "one complete representative far-dive lifecycle, not all dives".

**Validation.** 55 → 64 fixtures identical, sprite vs 3D and animation ON vs OFF. The v6 far dive stayed bit-identical (28 joints × 320 ticks).

**Gap in Git: 21 September.** No commits after 01:00.

---

## Monday 21 September 2026 — Astra: a character for V6

**Evidence:** [Astra] `~/Downloads/TOUCHLINE_ASTRA_MIGRATION_PACKAGE/finished-gameplay/touchline-v6/COMMITS.txt` (commit labels, no dates), `Touchline_V6_Report.md` and `Touchline_V6_Review.html` (01:41), `Touchline_V6_Normal.mp4` (01:42), `Touchline_Density_Motion.mp4` (02:22), `Touchline_Character_V6.mp4` (11:09), `Touchline_Face_Gloves_V6.mp4` (12:12); [Later] migration handoff §3. **The Astra repository's objects were never recovered, so its commits are known only as labels, in order. Splitting them between 21 and 22 Sep is Reconstructed from the times of the delivered files** (the faces-and-gloves video at 12:12 on 21 Sep lines up with `4047fb1`).

**Starting state.** Fixture 42's exported V6 motion (`2c80700`), with no simulation code, in an isolated local repository built from that snapshot.

**Work completed** (Astra commits `57bddf9` → `8f854c8` → `d3c86f7` → `bf5d4b5` → `4047fb1`):
- **A rig-driven character with a deterministic pixel renderer.** A purpose-shaped keeper mesh (1,118 vertices) skinned from the exported post-IK bone matrices. It uses fixed bind-space colour bands and a one-pixel contour, rendered by a CPU rasteriser with the exact `CAMERA_V1`.
- **Experiments.** Flat colours merged the sleeves into the torso, and moving light broke the jersey into patches, so **fixed bands** were chosen. A density study showed that more samples "could not invent missing face, hair, anatomy or kit construction", which redirected the effort to designing the character itself.
- **Customisation** (jersey, skin, hair, gloves, boots, girth) from one set of matrices, with no per-player frames.
- **Measured:** a mean of 1.69 ms per keeper on the CPU, so the report advised porting the treatment to the GPU skinning path. The original game's ON/OFF gates could not be run there.

**Remaining.** Faces and gloves, which were refined next.

---

## Tuesday 22 September 2026 — A real goalkeeper character

**Evidence:** [FC-Sim Git] 10 commits, `856c605` (22:15) → `aae3bcb` (04:48, 23 Sep).

**Work completed.**
- **Distribution v13** (`856c605`): a quick one-hand put-down, a palm-carried roll, a long forceful throw and a laterally loaded punt, with ball/hand quality metrics.
- **v13.1** (`cf6c85c`):
  - The post-put-down "retreat" was traced to the *simulation's* positioning controller resuming, not to animation. The simulation now holds a `BALL_AT_FEET` state.
  - Throws use a driven launch law.
- `BALL_AT_FEET` is documented as the future entry point into the shared on-ball controller (`e7aebdd`).
- **The true-proportion Courtois character** through the 3D keeper system (`da3ea2f`): GLB, a tall rig, contact calibration, a proportion-aware FK → IK → skin path, and the ball radius at 0.11 m for every character. Plus a playable keeper harness `?gkPlay=1` (`1e41af3`).
- **Far-dive reach correction** (`88ae210`): post-contact flight is capped at the jump ceiling, with an anatomical elbow limit.
- **Outfield skeletal foundation** (`aae3bcb`): a shared hierarchy with per-player morphology, plus Courtois drawn as a merged single draw.

**The Astra track the same day** ([Astra] `Touchline_V6_Review (1)`–`(4).html` 11:53–20:57, `Touchline_Courtois_Hair_Review.html` 21:43, `Touchline_Roster_Review.html` 23:04, `Touchline_Back_Print_Roster.png` 02:43 on 23 Sep; commit labels `58d20f2` → `3f67705` → `64bffcc` → `8c7f540` → `78afaea` → `5e89a7a`; [Later] migration handoff §3).
- **The character.** A sculpt-first head (**I23**: head 10% larger, seated 24 mm lower, shaped neck), **S3** athletic shoulders, **L2** lower-body integration.
- **Rendering.** "Native-output Refined" framebuffer sampling (**C**) and the **Mixed** presentation: the environment at 2×, the character at 4×.
- **Bodies.** Body variants and a **true-proportion Courtois**, whose scalp was corrected after Mixed output exposed a notch.
- **The roster.** Then **19 individually researched players plus Courtois**, and a reversible back-print study.
- At 12:21 a **scene-environment package** was exported to Astra (`TOUCHLINE_SCENE_ENVIRONMENT.zip`, an unmodified copy of the repository at `2c80700`). That is a duplicate, not development.

> **Transition 4 — Astra's Courtois into the runtime (`da3ea2f`, 01:39 on 23 Sep).** The tall Courtois came back from the Astra track as a package (`CLAUDE_GK_CHARACTER_PACKAGE.zip`, recorded in the migration package's recovered-archive list). It was integrated **by re-building it through the runtime's own path** (GLB + tall rig + contact calibration + the proportion-aware FK → IK → skin path), not by copying Astra's CPU renderer. The C shader treatment was ported.

**End-of-day state.** A named, correctly proportioned keeper that distributes the ball, and the skeletal foundation for outfield players.

---

## Wednesday 23 September 2026 — Outfield runtime: locomotion, dribbling, shooting, real players, passing

**Evidence:** [FC-Sim Git] 19 commits, `5a26b51` (12:54) → `c8d0b5c` (05:14, 24 Sep). Tags later placed on this day's work: `baseline/shooting-v1` (`277c56c`) and `baseline/outfield-runtime-v1` (`23b7af4`). Co-authoring moves from Claude Fable 5.1 to Claude Opus 5 in the evening (`d19de7e`, 21:27).

The longest single run of the project, taking the outfield player from nothing to a playable, ball-carrying, shooting and passing athlete.

**Keeper far-lateral fixes (morning).**
- A proportional redirect roll, no target-bending torso assist, and an impact-released IK (`5a26b51`).
- Trailing-arm clearance for an arm that the authored clip itself passed through the chest (`87ccbfe`).
- A **reachability contract** before the dive solver (`7fcf310`).
  - Tried and **removed**: a hand-separation feedback and a chest-hold cradle for dive catches.
  - The dive-catch hold on a lying body is reported as a known limitation.

**Outfield locomotion V1** (`d19de7e`, `c11b70c`, `9ba93d2`).
- One continuous speed-driven gait, not a clip library: five parameter sets blended by the *authoritative* speed.
- Stride is a multiple of the player's own leg length, and a single never-reset phase keeps the legs from swapping.
- The contact solve was rebuilt so every exit from a foot lock is continuous. The fixes covered release by offset decay, contact detection, heel-to-forefoot roll, a slewed pelvis hand-over, and one per-leg application.
- Walk and jog became **desired-speed gears in the simulation law** (`WALKV`, `JOGV`). Pulsing the input had produced lurching, which the presentation would have had to "explain".
- Measured: planted-foot slide 0.0 cm (p95) at every gait. The keeper's fixture 42 was bit-identical.

**A read-only audit** (`dc74bb1`) found that the ball physics were real but the touches were *not foot contacts*:
- the touch fired on a timer unrelated to the stride;
- the nearest foot was 0.36–0.80 m from the ball at the touch.

**Dribbling V1** (`c672fdf`, `f907bb9`, `3a7372a`, `059b691`).
- The simulation keeps an **authoritative stride clock and boot plan** shared with the presentation. A touch the carry law has authorised waits, inside a bounded window, for a real boot.
- Three subtleties had to be right: a search window on both sides of the nominal time, not restarting the clock on an early fire, and a minimum half-stride interval.
- `ptReset` did not clear the carry state, which made the first seconds after a reset unreproducible; that was fixed.
- Sprinting still loses the ball, and **the envelope was not widened to hide that**.
- Measured over 123 touches: 120 realised within 10 cm, with a median toe-to-ball-surface distance of 1.8 cm.

**Shooting V1** (`5a77976`, `277c56c`, just after midnight).
- "**Recovered first, not reinvented**": the five families map onto the existing techniques and keep the recovered sprite rhythms, which define the contact instant.
- POWER was rebuilt to the approved V2-BR5 shape.
- Action timing is warped so its contact lands exactly on the simulation's `kickAt`.
- 20 combinations are ON/OFF-identical.

**The Astra migration (afternoon)** ([Astra] `TOUCHLINE_ASTRA_MIGRATION_PACKAGE.zip` 13:12, handoff, receipt, state and memory export 16:36–16:40).
- Character work moved to another account. Everything was frozen and packaged: the 20-player roster, the **B / Strong Gameplay** back-print lock (explicitly approved at 01:42 UTC), and provenance.
- An honest "missing and unverified" ledger records that the reusable **player-art workshop** begun afterwards was **not recovered** as a saved source tree.
- Then, in the evening, new outfield reviews ([Astra] `Touchline_Osimhen_Review.html` 22:13, `Touchline_Szoboszlai_Review.html` 22:36, `Touchline_Batch_1_Review.html` 23:18) led to the package integrated below.

> **Transition 5 — Astra's outfield players into the runtime (`f8254a2`, 01:40 on 24 Sep → `7cba78d`).** The package (`TOUCHLINE_OUTFIELD_CHARACTER_INTEGRATION_V1`: a shared canonical library plus about 2 KB per player) was **hash-verified**, and each player's runtime asset was **derived by a build step** (`of_char_build.js`). The canonical storage stays Astra's.
> - **What crossed:** six players (Cucurella, Gabriel, Osimhen, Szoboszlai, Vinícius, James).
> - **What stayed behind:** the 20-player roster (including the 3D Salah), back-print B and the workshop.
> - **Division of responsibility from here:** Astra owns character construction and appearance; the FC-Simulator runtime owns skeleton binding, animation, contact and neutrality.

**Real players** (`f8254a2`, `f80cbd6`, `7cba78d`).
- Astra's six real outfield characters on the shared runtime: one skeleton, one gait, one kick library, one shader.
- Findings:
  - The same hierarchy is not the same skeleton (the generic rig misplaced joints by up to 7.6 cm).
  - The saved stance is not a bind pose.
  - The ground is the stud tip.
  - Two renderer bugs only real characters could expose: reversed face winding and 16-bit depth precision.
- **A neutrality decision:** selecting a character must not change the simulation, so publishing the real leg length to the stride clock became an explicit opt-in (`?charSim=1`).
- A proportion-aware carry standoff was implemented, measured to change nothing, and **rejected**.

**Shooting V1.1** (`23b7af4`, 04:06). "The V1 diagnosis was wrong."
- The ground clamp rebuilt forward kinematics and re-applied only *locked* legs, which discarded the swinging strike leg's contact placement on every tick for any body with a standing ground lift.
- The generic body, with zero lift, had hidden it.
- Boot residual: mean 11.1 → 1.6 cm, with no contact target re-authored.

**Receiving + Passing V1** (`c8d0b5c`, 05:14).
- Squad play on one authoritative ball: `ptStep` split per player, aimed passes using the ported `world.py` families, and receptions whose timing and boot come from the boot geometry.
- **Finding:** the shared Dribbling V1 boot plan has its lateral side mirrored relative to the rig. It was recorded, not fixed, because fixing it would move Dribbling V1 outcomes.

**End-of-day state.** Six real players who walk, run, dribble with real touches, shoot five kinds of shot and pass to each other, all ON/OFF-neutral against `baseline/outfield-runtime-v1`.

---

## Thursday 24 September 2026 — Receiving: timing and transition quality

**Evidence:** [FC-Sim Git] 3 commits, `0c2bec7` (06:07), `565436d` (07:28), `75d0d83` (05:03 +0200, 25 Sep). **Reconstructed:** `0c2bec7` and `565436d` are the tail of the previous night's session, just past the 06:00 boundary. Tag `baseline/receiving-passing-v1.1` is on `75d0d83`.

**Work completed.**
- **Reception fires on comfort-zone entry** (`0c2bec7`). Firing at the closest approach kept postponing the contact until the ball was under the boot.
- Receivers face the ball's incoming line; the standing set-down no longer teleports the boot 30 cm; a review page (`565436d`).
- **Receiving V1.1, transition quality** (`75d0d83`). The method was "attribution first": every fixture was run with the receiving layer off, on, and each sub-layer alone, measuring pops per joint.
  - A tracking reach replaced a weight ramp (running-take knee pop 67 → 7 cm/tick).
  - Stale bend-plane memories had dragged the knee 41–43 cm.
  - The quick return to the passer went from 12–14 cm to 1.4–2.5 cm on all seven bodies.
  - **Correction of record:** V1 had blamed the passer's follow-through; the real cause was a late, switching plan.

**End-of-day state.** Receptions that look like receptions; outcomes unchanged, 27/27 identical.

---

## Friday 25 September 2026 — An auto pass demo exposes a stall; Defending V1

**Evidence:** [FC-Sim Git] 3 commits, `b9825f1` (23:18 +0200) → `57c6539` (03:30 +0200, 26 Sep). Tag `baseline/possession-v1.1-handoff` on `a30ddab`.

**Work completed.**
- **AUTO PASS / RECEIVE demo** (`b9825f1`): instrumentation that plays repeated passes using only player inputs.
  - **Finding:** after a clean reception on the move, with no input, the receiver braked to a stop with the ball 0.9–2.9 m ahead: outside the touch range, inside the possession envelope. Possession stayed "EXPOSED" forever (22 cases).
- **Post-reception hand-off** (`a30ddab`): a moving receiver continues his intent toward his own ball through the *normal input path*, bounded to 1.5 s. Stranded possessions 22 → 0.
- **Defending V1** (`57c6539`): jockey, standing tackle and slide tackle on the squad playtest, active only in defending drills.
  - The `continuous.py` challenge-quality law was ported, and it is reached *only through physical contact*.
  - Foul facts are recorded but never called.
  - A simple deterministic AI, and 1v1, 2v2 and 3v3 drills.

**End-of-day state.** Players can defend, and a tackle can only happen when bodies actually meet.

---

## Saturday 26 September 2026 — The researched slide tackle and tackled-player physics

**Evidence:** [FC-Sim Git] 2 commits, `cdb0735` (21:13 +0200) → `f5f6076` (04:53 +0200, 27 Sep). Tags `baseline/defending-v1.1-slide`, `baseline/tackled-player-v1`.

**Defending V1.1 — researched normal slide** (`cdb0735`, presentation only).
- From coaching manuals, technique guides and IFAB Law 12: an ordinary slide is side-on, on the tucked-leg hip, with **one** tackling leg extended and the other tucked under it.
- The V1 pose was diagnosed at the contact tick: square on both buttocks, trailing knee up, sole facing the ball. That reads as a reckless lunge.
- The V1 pose was kept as a review-only `reckless_v1` variant.

**Tackled-Player Contact, Balance & Fall V1** (`f5f6076`).
- The attacker's body is rebuilt from the authoritative stride clock as per-leg capsules, planted versus swinging, against swept tackler primitives. The contact record includes the ball-first / man-first order.
- An impulse from recorded weights.
- **Balance** as a linear inverted pendulum with a capture point: the error is corrected per step and grows e^(ωT) between steps → CORRECTION / STUMBLE / FALL.
- Falls travel and rotate from momentum and tip; a fall releases the ball.
- Presentation: a stumble overlay and a continuous directional fall basis.
- A **contact-aware gate** allows defending fixtures to diverge *only* at a player-body contact or a launched slide.

**End-of-day state.** Tackles have physical consequences. The slide *pose* is correct, but the tackling leg is still the V1 near leg.

---

## Sunday 27 September 2026 — Slide contact geometry and reciprocal body interaction

**Evidence:** [FC-Sim Git] 2 commits on `prototype/slide-contact-v1.2` in a separate worktree: `a1357dd` (20:54) and `d539e7a` (03:05, 28 Sep). Review: `review_artifacts/slide_contact_v1_2/`. Tag `baseline/slide-contact-v1.2` → `d539e7a`.

**Starting state.** Tackled-player V1, with the user's uncommitted stadium and ball work isolated in the main working tree. The slide work was deliberately done in a separate worktree so neither disturbed the other.

**Slide Contact Geometry V1.2** (`a1357dd`).
- Research (Human Kinetics, Soccer Coach Weekly, Christensen 2004) showed V1 used the wrong leg. The ball's side is the **near** side, so that leg tucks and the player drops on that hip, while the **far** leg tackles and sweeps across: 0 → 75° when the ball is beside the slide line, 0 → 17° when it is on it.
- The world mapping was verified on the rendered rig.
- V1 geometry is kept bit-for-bit behind `PT_DEF.slide.rule = "near"`.
- Also:
  - the simulated leg calibrated to the rendered leg;
  - an adaptive swept ball contact (0 missed in 460 crossings at 0–40 m/s) with a physical ball response;
  - a bounded **per-challenge contact history** that re-resolves new contacts through the V1 balance law.
- **A counterfactual** showed the far leg alone does not stop the bodies overlapping when the slide line converges *through* the carrier. What removes the overlap is that the correct leg lets the slide line stay *beside* him.

**The follow-up, "stop condition #2"** (`d539e7a`). The remaining 13–22 cm overlaps on slides that cut across the attacker. Found and fixed at their causes:
- The simulation's tackler capsules were where the V1 pose had them, 13–20 cm from the rendered V1.2 body, so they were re-measured.
- Nothing kept resolved bodies apart, so a bounded **non-penetration** constraint was added: velocities only, shared by recorded mass, with the slider slowed and deflected. An axis-based normal was needed because a deep closest-point normal pointed the wrong way.
- **OVERRUN:** a planted foot trapped under the seat has its support re-resolved.
- A faller's fall rotates around the slider's upper body.
- **A V1 presentation sign error:** a struck *left* swing leg was pulled *into* the tackler. It caused a 22 cm overlap in one fixture.
- A slider coming to rest popped a player 38 cm in one tick, which was effectively a teleport. The mop-up is now bias-rate.
- The leg reach was re-calibrated from 1.25 to 1.20 × leg.

**Rejected on the way** (reconstructed from the review record):
- Whole-body mass sharing for leg contacts flipped valid ball outcomes.
- An effective-mass variant was too weak.
- Mass-shared in-air pushes shoved fallers.
- Laying a faller on a rising slider floated him to 1.5 m.

**Audit.** `sl_from_behind`'s change from MISS to WON was audited and retained: man first, from behind, then the swept leg meeting the loose ball 37 ticks later. It is physically coherent but not a clean tackle, and it is recorded as a foul fact.

**Validation.**
- Pelvis/torso overlap 0 cm in every fixture.
- Every unrelated gate identical.
- V1 path bit-identical; CCD 0 missed.

**Remaining.**
- Two limb brushes of about 80 ms (16 cm and 10.6 cm).
- Leg–leg tangles of up to about 13 cm in pile-ups.

---

## Monday 28 September 2026 — Environment integration and publishing

**Evidence:** [FC-Sim Git] 5 commits at 12:19, `5a0e025` → `e2c98ec` (merge), and 2 documentation commits, `d064fe0` (16:32) and `4baf37b` (19:54). Branch `touchline-current`, pushed to the FC-Simulator GitHub repository this day. [Session] Codex and Claude Code session records (added 8 Oct). [Local] as noted.

**The environment work** was authored in the main working tree between 25 and 28 Sep, in parallel with the tackling branch. It consists of:
- a Tottenham-inspired seating bowl with a crowd atlas and the near stand cut away for the broadcast camera;
- pitch mowing bands on the real box/spot/halfway boundaries;
- a continuous 32-panel sphere ball at the physical 0.11 m radius, with a design selector;
- seeded rain with a weather selector.

**Who authored it (corrected 8 Oct; previously Uncertain).** [Session] records show it was done in the user's own Codex sessions:
- the corner flag from 25 Sep 23:31 ("one continuous red flag", pole "akin to the white stripes on the pitch");
- the ball on 27 Sep from 12:41, with the 2026 World Cup ball as a broad-brush reference and the physical scale researched;
- the pitch colours at 15:26;
- the dugout, stands and crowd from 15:52;
- rain from 00:14 on 28 Sep.

The file modification times agree: `corner-flags.js` 25 Sep, `ball-art.js` and `stadium-art.js` 27 Sep, `rain.js` 28 Sep 00:16.

**Discovery.** `match.html` had loaded `corner-flags.js` since Defending V1 (`57c6539`), but the file had never been committed, so any fresh clone would fail to load it (`5a0e025`).

**Work completed.**
- The environment work was committed on its own branch (`environment/stadium-ball-pitch-v1`) at the point where it was authored (`f5f6076`).
- It was merged into the accepted slide-contact state as a visible merge (`e2c98ec`).
- A fresh-clone smoke test confirmed the collaboration state works, including 128 deterministic fixtures identical to `d539e7a`.
- `touchline-current` and the baseline tags were published.
- The Coach MVP pull request by another contributor, which touches only the manager and web layer, was left untouched.

**Later the same day (added 8 Oct).** [FC-Sim Git] `d064fe0` (16:32) and `4baf37b` (19:54), docs only: this chronicle and `TOUCHLINE_PORTFOLIO_RECOVERABILITY_AUDIT.md`, pushed. [Session] user instructions from 20:23 to 02:26. The rest is [Local].
- **Snow, and weather on the ball** (Codex session, 16:27 – 17:42). The user asked: "now add snowing (with a couple of different states and one of them can be extreme snow)", then "make it affect the ball trajectory", then "add snow affect".
  - Light snow, snow and extreme snow were added, with snow drawn on the grass outside the pitch lines too.
  - A per-weather ball surface (`ball-surface.js`, mirrored in `world.py`) and a match weather that locks at kickoff. The "off" constants are unchanged.
  - Recorded in that session: the same pass travels 17.2 m dry, 16.7 / 11.9 / 7.9 m in light / normal / extreme snow; rain is unchanged.
  - **It was never committed.** Found during the 8 Oct audit, it is now committed as it stood, on its own branch: `environment/weather-snow-surface-v1`, `9468ddd`, from `8ae5e94`, not merged into `touchline-current`.
- **Portfolio Capture V1** (20:23 – 20:56): a curated source package for a future portfolio, not the portfolio site.
  - `~/Downloads/TOUCHLINE_PORTFOLIO_SOURCE_ASSETS/`: 22 stage folders, 186 candidate files, 187 MB.
  - A manifest that tags each file ORIGINAL, RECAPTURED or DERIVED.
  - Historical states were recaptured only from disposable worktrees (`a0cd26d`, `c4f13e1`, `5f68f2e`, `4baf37b`) and copies.
  - A local contact-sheet page, `PORTFOLIO_CAPTURE_REVIEW.html`.
  - A curated transfer zip for the Astra portfolio workstream, `TOUCHLINE_PORTFOLIO_FOR_ASTRA.zip` (57.7 MB). The user decided against putting the 187 MB into GitHub "just to give Astra access".
- **Slide tackle: rear-contact fall direction** (from 23:08; worktree `rear-contact-fall`, branch `prototype/rear-contact-fall` at `4baf37b`, uncommitted). The user's problem: an attacker slide-tackled from behind could be sent *forward*.
  - **Diagnosis** (review `review_artifacts/rear_contact_fall/`, 01:06):
    - the contact normal was right, but the contact was frictionless, so the tackler's travel along the run (the defining fact of a rear challenge) was discarded;
    - the topple read the attacker's world velocity as if the swept support were still planted;
    - separately, the presentation blended the SIDE and BACK landings through an upright body, so a correct 137° back fall rendered as a man still standing.
  - **Change** (slide contacts only; standing tackles keep V1 bit-for-bit):
    - a Coulomb-bounded tangential impulse, μc = 0.5;
    - a lost support carried with the impulse, with the tackler paying the friction impulse;
    - back falls drawn from the BACK basis alone, turned by the residual.
  - **Result:** direct rear at 3 and 5 m/s now falls BACK (head direction −2.40 / +2.93 rad) while still travelling downfield. Every non-slide fixture is identical, and the slide outcome changes are itemised. One example: `sl_from_behind` changes from WON to MISS, caused only by the tackler's friction impulse.
  - **User (01:26):** "I approve of the rear-contact physics direction from the previous pass, including the new contact/friction behavior and the fact that physically corrected contacts may legitimately change tackle outcomes."
- **Slide Follow-through V1** (01:26 – 02:05; presentation only, same worktree; review `review_artifacts/slide_follow_through/`).
  - **Diagnosis:** the tackler held one key pose from launch to get-up (limb "liveliness" 0.0 – 0.3 rad/s for 0.8 – 1.3 s), and the carrier lay frozen while his root slid.
  - **Found on the way:** the previous pass's back-fall yaw sign was mirrored for rear-diagonal falls. The rig frame is (x, height, −y). The simulation was never wrong.
  - **Change:** follow-through driven by simulation facts: hip settle, counter-twist, the free arm coming down, a swept-foot carry, a lower-body-first cascade, a startle-then-protective arm reach, and a trunk-inertia spring on the authoritative root acceleration.
  - **Result:** frozen windows gone (tackler slide 0.07 – 0.28 → 0.54 – 0.85 rad/s); recovery hand-back pop 412 → 150 and 420 → 16 rad/s²; authority checks identical with animation on and off.

**End-of-day state.** `touchline-current` is published: one branch another developer can clone and run, with the full outfield and keeper runtime and the new stadium, pitch, ball and rain. Outside it are the uncommitted snow work, the portfolio package, and the rear-contact and Follow-through V1 passes in the `rear-contact-fall` worktree, which are awaiting review.

---


# Part IV — The physical character (29 Sep – 7 Oct)

From 29 Sep the main line of work left the playable game.
- **The aim:** a physically articulated character whose body really occupies space, so that contact changes motion on the step it happens.
- **The method:** a sequence of gates, each preregistered, frozen before its battery and stopped at any failure for the user's decision.
- **Where it lives:** local branches in their own worktrees, until the 8 Oct publication (7 Oct entry).

**In parallel** (1 – 7 Oct) a redesigned manager interface, player-ratings workbooks and a player-development model were built as self-contained HTML prototypes, workbooks and design packages, outside every repository.
- **Where they come from (Reconstructed):** the user's own chat sessions. The evidence is the local Codex workspace paths (`~/Documents/Codex/2026-10-0X/new-chat-N/`, where most originals survive) and Astra's reconstruction of the chat history ([Chat extraction], integrated 8 Oct).
- **Evidence levels used in each day's block:**
  - **located:** the original file is present locally; time and SHA-256 are recorded in [`ORIGINALS_STATUS.tsv`](../review_artifacts/chat_history_reconstruction_2026-10-08/ORIGINALS_STATUS.tsv);
  - **reported:** an assistant's delivery or check report, not re-verified;
  - **designed:** a user decision;
  - **incomplete**;
  - **uncertain / conflicting**.
- **Times:** local (+01:00, the offset of every commit of 1 – 7 Oct), converted from the extraction's UTC.
- **Scope:** nothing here is integrated into the playable game or the simulator.

## Tuesday 29 September 2026 — Follow-through V2 set aside, one reference tackle, then a physical character

**Evidence:** [Session] user instructions from 10:39. [Local] worktrees `rear-contact-fall` and `reference-tackle` (uncommitted, review pages 16:54 and 18:37); `~/Desktop/Screen Recording 2026-09-29 at 5.25.13 PM.mov` (the reference clip). Physical character:
- [FC-Sim Git] 24 commits on `prototype/physical-character-v1`, `4dbb5a2` (02:12, 30 Sep) → `4062764` (04:39, 30 Sep).
  - The branch was created from `touchline-current` at `4baf37b` at 19:25 (branch reflog).
  - Tag `checkpoint/physchar-pre-crossover` → `b0a84d2` (03:26).
- [Session] user messages 19:16 → 02:10 (transcript `6a70b682…`).
- [Doc] all first committed in `4dbb5a2`: `ARCHITECTURE.md`, `SUBSTRATE_DECISION.md` (+ `spikes/substrate/`), the Gate A / B / C1 / C2 reports, `balance_review/BALANCE_REVIEW.md`, `v1_1/ANATOMY_V1_1_REPORT.md`.
- [Doc] from the runway: `v1_1/PROMOTION.md`, `OVERNIGHT_2026-09-30_REPORT.md`, `LOCOMOTION_PROPOSAL.md`.
- [Local] uncommitted snapshots in `worktrees/`: `_preserved_2026-09-29_physical_character_gate_a` (21:39), `…gate_b` (22:37), `…gate_c1` (23:28), `_preserved_2026-09-30_physical_character_gate_c2` (00:37), `…v1_1` (01:59).

**Slide Follow-through V2** (10:39 – 16:56; [Local] `review_artifacts/slide_follow_through_v2/`). The user: "I reviewed Follow-through V1. It is an improvement, but I do not consider the follow-through finished yet". After contact, both players settled into fixed shapes and slid.
- **Diagnosis, measured on V1:** after the sweep the simulation had no rotational state at all. The tackler's pelvis was flat (0.1 – 0.3 rad/s) while his root decelerated from 5.3 m/s, and the faller's ground phase was pure translation.
- **FALL BODY V2:** a fallen player becomes a reduced rigid body until his momentum is gone: rounded rings of contact points, inelastic contacts, Coulomb friction at the slide's own body-on-grass μ, rolling resistance, and 8 sub-steps per tick.
- **SLIDE BODY V2:** the slider gets roll toward the stomach, trunk lowering and yaw, and the tackling leg extends → sweeps → unloads → retracts.
- **Validation:**
  - animation on and off are identical; non-slide fixtures identical with the new physics on and off; deterministic; energy never increases;
  - the direct-rear mirror pair is exact (2 · 10⁻¹⁴ m). The diagonal pair grows a 2 µm rounding asymmetry to 12.7 cm through a later reception;
  - several slide outcomes changed and were itemised.
- **Limits recorded:** a rigid fall body lands on the shoulders where a real body folds at the hip; the fall body does not touch the ball; a standing-occupancy pop of 370 m/s² remains.

**V2 set aside; Reference Tackle V1** (17:33 – 18:38; [Local] worktree `reference-tackle`, branch `prototype/reference-tackle-v1` at `4baf37b`).
- **User (17:33):** "Stop work on the generalized Follow-through V2 approach. Do not commit V2. Put it aside as an experiment." Instead: reproduce **one** real slide tackle, from a 1.6 s reference clip the user supplied, "as closely and convincingly as possible", as a gold-standard vertical slice.
- **User (17:44):** approved authoring "dense paired joint curves rather than trying to derive this motion from V2's generalized rigid-body system". The reference is authoritative: "Match what is actually visible". "Do not commit yet."
- **Built:** `sandbox/visual/reftackle/`, a standalone harness that reuses only the skeleton / IK, locomotion run-in, character loader and ball. It has:
  - a master timeline f56 – f152;
  - per-joint keys flagged measured or inferred, about every 2 frames through launch → seat → curl;
  - plant intervals and a fitted reference camera;
  - side-by-side, ghost and gameplay-camera views.
- **Corrections to the approved breakdown, found while matching:** the camera is static (the breakdown said it pushed in), and the ball is not pinned after the block (it squirts on at about 3 m/s).
- **Archived:** [the approved event breakdown](../review_artifacts/chronicle_screens/2026-09-29_reference_tackle/Screenshot_2026-09-29_at_5.42.54_PM.png) (17:42).

**Status of the slide-tackle line** (as at 8 Oct): every pass of 28 – 29 Sep is still uncommitted, under the user's instructions:
- rear-contact physics and Follow-through V1 (approved direction, reviewed) and V2 ("Do not commit V2") share one worktree's files;
- Reference Tackle V1 is under "Do not commit or push without my approval";
- the reference clip is third-party footage and is not for the public repository.

They were left [Local] in the 8 Oct housekeeping; the decision is the user's.

**The pivot (19:16).**
- The user: "MAJOR PIVOT — PHYSICALLY ARTICULATED CHARACTER / CONTACT SYSTEM V1 … Stop extending the current defensive-animation/contact architecture."
  - The recurring failure across all the defensive work: "players visually make contact → their bodies continue through/inside one another → only afterward does a fall/reaction animation occur."
- The new model:
  - authored animation supplies intent;
  - an articulated physical body occupies space and collides;
  - finite motors drive that body;
  - the rendered skeleton follows the body.
- Reference Tackle V1 was kept as target data, with Gates A–E to follow.
- The first deliverable was to be research and architecture only, "Then STOP and wait for my approval."
- The test the architecture would be judged by: "When shin meets leg, the physical bodies cannot continue through one another. The contact must affect their motion on that contact step."
- Work moved to a new worktree and branch at 19:25. Nothing was committed until 02:12.

> **Transition 6 — from presentation-driven contact to a physical character (29 Sep, 19:16 → 19:25).** Reference Tackle V1 made the defect behind every defensive pass explicit: the bodies visibly met, carried on *through* each other, and only then played a reaction.
> - The work moved to a Jolt rigid-body humanoid, driven by finite motors, which the rendered skeleton follows.
> - It got a new branch and worktree, `prototype/physical-character-v1`, from `4baf37b`. It does not touch `touchline-current`.
> - The authored Reference Tackle motion was kept as target data.

**Architecture, then the substrate reopened (19:16 → 20:40).**
- The first proposal (`ARCHITECTURE.md`):
  - 14 rigid bodies;
  - de Leva mass fractions applied to the recorded weight (Gabriel 78 kg);
  - swing–twist joints and implicit PD motors;
  - a **custom XPBD solver at 60 Hz × 20 substeps**, with Jolt as the fallback.
- At 19:56 the user accepted the diagnosis but reopened the solver choice: "Own the football-specific physical-character/controller layer ourselves, but do not unnecessarily reinvent mature generic rigid-body physics infrastructure." The context was Rabona (Furkan Sarıhan), built on Bullet.
- Research plus a disposable spike (`spikes/substrate/`, Node, a few seconds of CPU):
  - **Jolt** was the only engine to keep first touch at 0.2 mm in both a 15 m/s rotating shin sweep and a 13 m/s linear hit, with a same-frame response and no tunnelling. It needed speculative contacts plus Touchline-owned adaptive substeps.
  - **Rapier:** CCD on both bodies behaved bit-identically to no CCD (100 mm penetration, 2 of 5 tunnels at 15 m/s).
  - **Bullet:** ammo.js is still Bullet 2.82 and blew up at 60 Hz.
  - **Custom XPBD** was rejected as the substrate: "we would be building a general engine."
- At 20:40 the user approved Jolt via JoltPhysics.js as the "provisional physics substrate", with Rapier as first fallback and XPBD as a last resort.
- A single-state rule was locked: "There is one character spatial state. The Jolt articulated bodies are that physical state."
- Fast-limb collision was explicitly left unresolved until Gate D.

**Gate A — passive 14-body humanoid (approved 21:36).**
- Set-up: Jolt 5.6.0, Gabriel (190 cm, 78 kg), 240 Hz, 30 velocity / 4 position iterations, soft knee and elbow stops, five deterministic drops.
- Results:
  - joints separate by at most 4.6 mm in flight;
  - colliders sink at most 13.9 mm into the turf briefly and 5.3 mm at rest;
  - every drop is asleep within 1.85 s;
  - the largest single-step energy gain is 2.6 J;
  - cost is 0.17–0.26 ms per 60 Hz frame;
  - 3/3 repeats bit-identical, and Node = Chrome.
- Flagged for the user: the rendered mesh dips up to 2.4 cm below the turf at rest, and hard limits yield up to 7.2° on impact.
- Discoveries:
  - `Math.sin` is not bit-identical between Node 22 and Chrome 154. Deterministic `dsin` / `dcos` were added, and a production rule followed: no `Math.sin/cos/…` in any input to the physics.
  - Hard knee stops injected up to 14 J.
  - A trapped box-shaped hand injected 29 J.
  - Raising position iterations from 4 to 8 increased the energy gain from 2.6 to 7.2 J.
- The user: "Do not spend this pass polishing the remaining turf sinking or brief joint-limit overshoot".

**Gate B — finite motors (21:36 → 22:13).**
- Results, as recorded in the 22:13 review request:
  - about 3° tracking error across 13 joints;
  - about 8° peak on a reversal;
  - no position or velocity writes after initialisation;
  - a boot moving at 1.02 m/s was stopped by a post on its arrival step (885 N, no geometric penetration), and penetration stayed ≤ 0.74 mm even at 8× strength;
  - a blocked hip kept 22° of error at 208 N·m against its 220 N·m limit;
  - cost about 0.6 ms per frame.
- **Limitation:** the whole-body tests relied on a temporary pelvis support (≤ 250 N, 100 N·m per axis). Without it the body toppled after about 5.5 s.
- **Self-review** (`balance_review/`: "I built Gate B, so I have tried to review it as an outsider would"). The support had absorbed 45 of the 46.6 N·s chest shove and 25 of the 45 N·s pelvis shove.
- At 22:28 the user accepted the motor architecture, but whole-body results "must be labelled support-assisted". The support was retired and kept only as a labelled historical fixture.

**Gate C1 — unsupported balance, feet in place (approved 23:25).**
- Rules: zero pelvis support, root anchor or state writes, asserted in every test.
- Control: a capture-point CoP law plus a hip strategy.
- Sensing: per-foot loads reconstructed from whole-body momentum change and ankle constraint impulse.
- Results over 59 tests:
  - 20 s of quiet standing with 1.0 mm sway RMS;
  - 10–30 N·s pushes recovered in 0.13–0.33 s;
  - outcome classes escalate IN_PLACE → HIP → STEP_NEEDED → released → GROUNDED;
  - on ice (μ 0.08) the feet are flagged SLIPPING within 42 ms;
  - a 100 ms sensing delay makes recovery 2–4× slower;
  - falls are honest, beginning 62 ms after STEP_NEEDED;
  - pelvis residual force 0.039 N mean;
  - 59/59 bit-identical ×3, and Chrome = Node.

**Gate C2 — weight transfer and foot placement (approved 00:47 after live review).**
- Results over 13 tests:
  - the load share moves 5 % → 95 % → 50 %;
  - a foot lifts only once its load is under 5 % BW for 50 ms;
  - single support holds for 3.3 s;
  - a target 1.2 m away is projected to 18.5 cm;
  - a swing that hits a box stalls and is held (0.12 mm penetration);
  - 5 of 6 alternating placements complete, and one was honestly rejected.
- Exposed by C2:
  - the hip joint centres sit **32.3 cm apart (≈ 1.8× human)**;
  - standing on one leg therefore needs 124 N·m of hip abduction (88 % of the 140 N·m cap) and a 13.4° trunk lean;
  - 20° of ankle dorsiflexion limited reach.
- The user: "Do not add an arbitrary large minimum foot-separation rule" and "Do not compensate with stronger muscles". The response was a bounded anatomy calibration, V1.1, with V1 kept reproducible.

**V1.1 anatomy / ROM calibration (00:47 → 01:59).**
- **Cause of the 32 cm hips:** the Astra shared-skeleton template hangs each leg at x = ±0.1805 m (±0.1615 m for this player), and V1 used rig bone origins as joint centres. "It was a rig-template property carried into the physics."
- **Corrections:**
  - hip centres moved to 18.4 cm apart (Bardakos & Freeman 2012; Hara 2016);
  - knees placed on the hip → ankle line;
  - shoulder centres lowered;
  - ankle dorsiflexion raised from 20° to 30°;
  - **no strength raised**, and four torque caps lowered to the evidence;
  - mesh, colliders and visible width unchanged.
- **Effect:** static hip-abduction demand 124 → 74 N·m, and the trunk lean 13.4° → 0°.
- **Regressions reported rather than hidden:**
  - C2 weight transfer no longer completes: the swing foot keeps 85 N against the 38 N gate;
  - Gate A drop A gains 12.8 J at the knee stop;
  - drop B overshoots a shoulder limit by 16.4°.
- [Local] Snapshot taken as a "CANDIDATE" at 01:59.

**The overnight runway (02:10).** "I am going to leave this running unattended for approximately 6 hours."
- The roadmap: V1.1 integration → C3 → C4 → C5 → a two-character slice → the Reference Tackle "if — and only if" the slice was sound.
- "Clearly labelled local checkpoint commits" were allowed; nothing was to be pushed.

**Checkpoint and V1.1 promotion** (`4dbb5a2`, `e14354b`).
- `4dbb5a2` committed the evening's untracked work (178 files). V1 reproduces under `--calib V1`: A 5/5, B 20/20, C1 59/59, C2 13/13.
- `e14354b` (02:36) promoted V1.1 (`WORKING_CALIB = "V1.1"`).
  - **The C2 fix:** a planned upper bound on the unloading foot's share, never below the physical minimum (found by exact convex clipping).
  - One stricter liftoff condition was added.
  - Reach is now a consistent pelvis-height band.
  - Result: J_repeat 6/6 (V1: 5/6).
  - `v1_1/PROMOTION.md` records that V1 had lifted off partly through an accidental +6 mm medial CoP bias, which was not restored.

**C3 — one physics-driven corrective step** (`1aa4f5e`, `d0d8e0f`, `e4dc66a`, `e97f909`, `cca491e`, `be5c27b`, `73eabe4`).
- 29 tests ×3, Browser = Node 29/29. One step catches forward pushes of 70–100 N·s (115 N·s with a projected foothold) and backward pushes of 40–50 N·s.
- Lateral pushes of 55 N·s and more fall honestly.
  - The 3-D crossover planner shows they need a foot speed of 5.1–6.3 m/s, above the 4.5 m/s cap.
  - With the cap lifted to 7 m/s, the swing foot struck the stance shin and came to rest on the stance boot.
- **Multi-step experiment: 0 of 8 rescued.**
  - First reading: the longest first step leaves no room for a second (Koolen 2012).
  - That reading was overturned 14 minutes later (`cca491e`): the failed steps already *predicted* capture. They touched down early, at u = 0.44–0.73 of the swing and 26–57 cm short, because the hip saturated on backward swings and the toe skimmed the turf on late forward ones.
- Swing-shaping options (`step.h0`, `step.heelUp`) cut landing error from 26.6 to 8.3 cm but changed no outcome. The default was kept.
- All the options combined still rescued 0 of 8 (`73eabe4`): "capacity is the locomotion gate's job".

**C4 reactive arms and C5 protective falls, both opt-in** (`40ad2fe`, `b0a84d2`, `596b147`, `963bade`, `5535a06`).
- **C4:** no in-place boundary moved; recovery times changed by −43 % to +18 %; one marginal step regressed. The first, unbraked version had turned 3 recovered steps into falls.
- **C5:**
  - forward and backward falls now land hands-first, with head impact 0.12–0.30 m/s (0.41–1.09 m/s without it);
  - lateral falls are mixed;
  - one late case is worse (0.77 → 1.2 m/s).
  - A bracing arm that stayed raised on the turf now fades once the body is at rest; two variants of that fix were rejected.
  - Browser = Node 34/34.

**Gate D — two characters in one world** (`4cd5526`, `9df21f0`, `c509497`, `7c7a6fc`).
- 28 bodies, with physics the only coupling between the two characters.
- **The invariant holds.** On the step the gap would close, both bodies' velocities change in opposite directions. In D2 (3.9 m/s closing), A changes by −1.19 m/s and B by +0.44 m/s. This happens 1–2 steps before the ≤ 0.5 mm touch.
- Contact depth: first touch ≤ 1.8 mm. A foot trapped under a falling pelvis compresses up to 8.4 mm.
- **Isolation:** while apart, each character is bit-identical to its single-character run. Cost is 1.2–2.0 ms per frame.
- `c509497` corrected the report's account of D4: A leans on B for about 2 s, then drifts off and falls because his one step is already used.

**D6 — a physical slide into a standing player** (`d79b5b3`, `f5503ba`, `0dee87c`).
- **Set-up:**
  - the slider holds the Reference Tackle's measured tackler joint keys (f94 → f114) through finite motors, with no root actuator;
  - he starts at 5.5 m/s, and the run-up is not simulated;
  - B stands with C1 + C3.
- **Result:** the contact is arrested on its step, and B stays upright.
- `f5503ba`: the reference keys broke this body's range of motion (trail knee 145° against a 140° limit; ankle 48° against 30°). They are now clamped, and first-touch penetration fell from 9.3 to 5.1 mm.
- `0dee87c`: a reactive contact yield was rejected. The penetration happens on the impact step itself, so the lever is how stiffly the leg tracks *before* impact.

**Stopping short of the Reference Tackle** (`1542819`, `6d24d27`, `4062764`).
- From the report: the reference attacker jogs at about 3 m/s and hurdles the slider. Reproducing him would need a kinematic attacker or root dragging, so "the Reference Tackle is blocked on a prerequisite, and I stopped there instead of faking it."
- `6d24d27` corrected two claims in the report:
  - the multi-step "Cause" was relabelled "First reading";
  - "no outcome flipped" was corrected: B is knocked down when the slide gap is 0.85 m.
- `4062764`: `LOCOMOTION_PROPOSAL.md` ("nothing built").
  - It recommends Coros-style walking with reference gait targets (B + C) through gates L1–L6.
  - It leaves four decisions to the user.

**Validation.** After every change:
- the approved and promoted hashes were identical: A, B, C1 and C2 on V1 and on V1.1, plus C3 29/29;
- 0 teleports and 0 velocity writes after t = 0.

**Adopted:** Jolt; V1.1 as the working body; C3's one-step default.

**Default-off:** C4, C5, `step.maxSteps` / `nStep` / `h0` / `heelUp`, `externalSupport`.

**Rejected:** the 2-D crossover route (reverted), a boot-sized foot collider, unbraked arms, the reactive yield, and lateral head flexion.

**End-of-day state.** At 04:39 there were 24 local commits, nothing pushed, and 360 review images left untracked under the media policy.
- **Approved on V1 (by the user):** Gates A–C2.
- **Promoted:** V1.1 as the working foundation.
- **Partial:** C3; C4 and C5 (both off by default); D6.
- **Passed with limitations:** Gate D.
- **Blocked:** the Reference Tackle.
- **Next decision:** locomotion, i.e. how the attacker moves.

---

## Wednesday 30 September 2026 — Reboot, the D6 diagnostic, a reconciled locomotion architecture, G1 and G2a

**Evidence:**
- [FC-Sim Git] 5 commits on `prototype/physical-character-v1`, `2e66018` (13:41) → `6f1ef85` (01:32, 1 Oct).
- [Session] [Doc] user messages at 13:38, 16:01, 22:55, 23:25 and 01:31, in `sources/`. From 16:01 the work ran in a new Claude session (`d4761610…`) after the reboot.
- [Astra] an independent architecture review, pasted at 17:01 (`sources/2026-09-30T1601_astra_…`).
- [Doc] `HANDOFF_2026-09-30_REBOOT.md`, `d6_diagnostic/D6_DIAGNOSTIC_REPORT.md`, `LOCOMOTION_ARCHITECTURE_FINAL.md`, `g1a/G1A_REPORT.md`, `g1b/G1B_REPORT.md`, `g2a/G2A_REPORT.md`.
- [Local] `_preserved_2026-09-30_physical_character_overnight/` (13:42).

**No recorded work from 04:39 to 13:38** (Uncertain whether any happened).

**Reboot preservation (13:38 → 13:42)** (`2e66018`, `6e13e9c`).
- The user: "I need to reboot my Mac now. Stop all further development and make the entire current physical-character project state safely recoverable".
- **Discovery:** the overnight evidence had been produced with tools that lived only in the session scratchpad (`/private/tmp`, cleared on reboot).
- `2e66018` moved them into `tools/review/`:
  - `regress.sh`;
  - the Browser = Node checker;
  - the capture scripts;
  - 87 analysis probes (716 KB, text only).
- `6e13e9c` added the reboot handoff. The session's closing "REBOOT SAFE" report (14:45) is archived [as a screenshot](../review_artifacts/chronicle_screens/2026-09-30_physical_character/Screenshot_2026-09-30_at_2.45.58_PM.png).
- [Local] The snapshot holds a git bundle of the branch and the 360 untracked review images (≈ 94 MB). The five earlier snapshots were verified at 90/90 checksums.

**D6 diagnostic (16:01 → 16:52)** (`f18c8a7`). The user had reviewed the overnight gates: "Gate D contact generally looks solid", but in D6 the standing player barely reacts. "Do not simply make the standing player fall."
- **Measured, not assumed:**
  - the slider hits the outer side of B's left boot 1.8 cm above the turf;
  - it sweeps that boot 16 cm toward the midline, under the COM, where it becomes the loaded support (≈ 1.9 BW) and its friction pins it;
  - A → B impulse 173 N·s (2.3 kN peak); B's own peak momentum is 18 N·s.
- **Checks:**
  - with B's controller frozen at impact, the same hit knocks him down;
  - a 100 ms sensing delay changes nothing.
- **Verdict:** physically justified. **The user's decision:** the baseline is not made to fall.
- **A real bug, fixed (general, approved).** The friction observer took a foot pushed by another body as a turf measurement. B "measured" μ 0.037 on 0.9 turf and kept it. The observer now ignores feet touched by a non-turf body. Only D6_slide changed. A "step at 70 % load" in the matrix had been an artefact of this bug.
- **D6X matrix (24 variants ×3).** The response forms a continuous spectrum:
  - absorbed (slider arrives at 1.3 m/s);
  - local disturbance;
  - recovered in place (the 3.4 m/s baseline);
  - corrective step (a knee-height hit);
  - fall (arrival ≥ 4.8 m/s, a thigh-height hit, or 80 % of the weight on the struck foot).
- **Four observations documented, not changed:**
  - C3 never re-plans after one refusal;
  - C1 releases posture early;
  - the outcome is sensitive to arrival speed;
  - shin contact is bistable.
- Browser = Node was deferred (puppeteer-core not installed).

**Locomotion architecture: Claude and Astra reconciled (17:01).**
- [Astra]: "make its next milestone 'explainable disturbance response,' not 'make D6 fall'". It recommended:
  - a contact-aware hybrid controller;
  - a single actuator authority;
  - flight and landing before running.
- The user, with it: "I approve the physical-contact foundation as sufficient to proceed … Do not automatically defer to Astra. Do not defend your previous proposal merely because you wrote it."
- `LOCOMOTION_ARCHITECTURE_FINAL.md` ([Local] file time 17:12; committed in `772d0bd`):
  - **one actuator arbiter per joint axis**, in priority order P0 support > P1 balance > P2 task > P3 style;
  - a gait/support state taken from contact truth;
  - a planner with a viability monitor;
  - C1–C5 re-hosted as modules, with claims tagged [R] research / [E] engineering / [H] hypothesis;
  - first gate: G1a.
- **Uncertain:** the user's approval of this document is not preserved as a source.

**G1a and G1b** (G1a report [Local] 22:48; G1b report 23:19).
- **G1a:** new arbiter, gait, planner and loco layers. **18 criteria pass**, including:
  - parity with C1–C3;
  - support realised at 96.2 % under saturation (9.2 % without arbitration);
  - an early touchdown accepted 108 ms early.
- **G1a fails two:**
  - 480 Hz convergence: 4–15 % differences in the 50 ms landing windows;
  - controller cost 0.13–0.76 ms against a 0.4 ms budget.
- At 22:55 the user approved the architecture, but asked for a G1b closure pass first.
- **G1b:**
  - 240 and 480 Hz are the same physical event (0–100 ms impulse 73.6 vs 75.6 N·s), so 240 Hz is kept;
  - 22 characters measured in one world cost 20.1 / 26.1 ms (p50 / p95) per 60 Hz frame, against a 16.7 ms frame, so "a physics-scaling plan" is needed;
  - of five open items, only pelvis yaw (±12°, growing) blocks G2;
  - the motion still reads as "robotic marching".
- At 23:25 the user promoted G1. The 30 N·s mid-swing fall was accepted as an honest boundary. "G2 … should be the first genuinely human-looking physical walk."
- `772d0bd` (23:27) recorded G1 PROMOTED and added the G1 baseline (26 scenarios ×3) to `regress.sh`. Browser = Node was verified with headless Chrome.

**G2a — yaw regulation and an in-place gait** (`6f1ef85`).
- Pelvis yaw stays within 5° of the intended heading (G1: ±13°). An intended 30° turn is followed.
- External-impulse ledger ≤ 0.041 N·s; 16/16 in-place steps.
- In its own words, "a careful march": double support ≈ 45 %, and no heel rise before toe-off.
- At 01:31 the user approved G2a "as the foundation for forward walking" and opened an 8-hour runway, G2b → G2e, each gated on evidence.

**End-of-day state.** 29 local commits, nothing pushed.
- G1 promoted; G2a approved.
- The G2b overnight runway is under way (next entry).
- Still open: the four D6 observations; C3–C5 partial.

---

## Thursday 1 October 2026 — G2b forward walking: six stops for review, no robust walk

**Evidence:**
- [FC-Sim Git] 16 commits on `prototype/physical-character-v1`, `dbc1ddb` (10:05) → `37a0849` (04:19, 2 Oct). Six are labelled WIP.
- [Doc] user decisions at 10:26, 11:29, 13:15, 16:32, 18:22 and 22:20, plus the 02:52 overnight brief (2 Oct), in `sources/`.
- [Doc] `g2_walk/NIGHT_LOG.md`, `G2B_OPTION1_REVIEW.md`, `g2_char/G2_PLANT_REPORT.md`, `g2_walker/G2B_WALKER_REVIEW.md`, `foot_gate/FOOT_GATE_REVIEW.md`, `g2_speed/G2_SPEED_SWING_REVIEW.md`, `g2_unified/G2B_UNIFIED_REVIEW.md`, `g2_overnight/OVERNIGHT_LOG.md`.

The day ran as a fixed loop: build → measure → STOP for review → user decision.

**Overnight G2b (01:32 → 10:05)** (`dbc1ddb`, `adade72`).
- The design: a capture-point (DCM) walking plan with finite double support, a cadence derived from the human walk ratio, and of_loco's WALK as the reference.
- **Measured rigid-foot limit.** The 0.358 m boot pivots only at its toe edge, 0.277 m ahead of the ankle, so a loaded heel rise needs ≈ 208 N·m against an ≈ 150 N·m envelope. A toe joint was documented but not built.
- **Result:** 56 configurations at 0.4–0.8 m/s all fell within 2–7 steps, with pelvis yaw of ±20–30° at touchdown.
- **General findings:**
  - the late-stance ankle has ≈ 1 cm of sideways CoP authority;
  - the weight-split solver assumed sole-edge CoPs the ankles cannot produce (fixed opt-in with a ±2.5 cm band).

**Option 1: landing and closed-loop placement (10:26 → 11:24)** (`77966eb`, `34de412`). The user: "fix landing mechanics and forward foot-placement control … do not change the body architecture or add a toe joint yet."
- **Touchdown moved into the human range:**
  - foot forward velocity 1.55 → −0.07 m/s;
  - peak vertical force 1136 → 578 N;
  - foothold error 6–12 → 0.5–2 cm.
- **The walk:** 2–5 upright steps over six starts.
- Zero sensing delay and independent torque limits did not help, so "the stepping-controller design is" the limit.
- **Own errors found by bisection:**
  - the option `retract` collided with an of_loco parameter, adding ≈ 1 m of "retraction" to every swing without an explicit override;
  - a default-on clearance change broke the in-place baseline (20/20 → 2).
- **Recount:** the overnight "20/20" and "5–7 step" counts included steps taken after a fall. They are now counted fall-aware.

**Plant characterisation (11:29 → 12:16)** (`9d4f7d9`). The user: "Do not continue parameter-tuning the current stepping controller."
- 456 deterministic open-loop runs:
  - a sideways error grows 10–12× per step and flips side;
  - independent forward and sideways laws are stable in ≈ 1 % of the gain plane;
  - double support lasts 0.22–0.38 s, not the assumed 0.15 s;
  - the arms cancel ≈ 40 % of the yaw (human ≈ 64 %).
- An earlier "5× the arms" figure was corrected to ≈ 1.7×.

**Controller A vs a SIMBICON-style B (13:15 → 16:29)** (`981e761`, `e39f312`). Approved by the user, with a cadence of 105–115 steps/min and a width of 0.20–0.22 m "as evidence-backed experimental starting regions, not immutable constants".
- **Results:** A walks 9–13 steps from all six starts (mean 11.2); B 5–7; the old G2b 2–3.
- **Closed-loop eigenvalues:** sideways −0.44 (stable); forward +1.25 (unstable).
- **The bound:** steps longer than ≈ 0.30 m fail their swing.
- **Correction:** an unverified human bound on whole-body angular momentum ("< 0.03") was replaced by the verified 0.014 ± 0.003.

**Foot-architecture gate (16:32 → 17:53)** (`89f970c`). The user: keep A, "Do not accept Option C", and compare feet before changing the body.
- **Feet compared:**
  - F1: a rigid, human-sized outline;
  - F2: a passive MTP toe joint (0.15 m ahead of the ankle, −30…+60°);
  - F2h: the same toe on the human-sized outline.
- **At matched states, no foot beat the current boot (F0).** Maximum viable step: F0 0.42, F1 0.39, F2 0.32, F2h 0.38 m.
- F2's stance worked (heel rise, rollover), but after long steps 94–99 % of its swings failed.
- **Correction:** the walker review's "mostly the body" claim was measured on an older inner loop (v7) and does not hold on v8.

**Speed regulation and swing execution (18:22 → 21:04)** (`53a81db`, `c7fd98b`, `45426b6`). The user: keep F0 (F2h opt-in), make the logic foot-agnostic, and classify every failure.
- **Causal account of the speed creep:**
  - no hidden force (the turf impulse matches the pendulum geometry within ±5 N·s);
  - Controller A's target was a ≈ 0.63 m/s state, so it steered the walk faster;
  - every baseline fall was a swing that was already infeasible when it was planned;
  - the swing ran 50 ms behind real time.
- **Capture-point tracking (`walk.dcmRef`):** speed held at 0.45 ± 0.08 m/s (previously 0.65 ± 0.25), but survival was 10.2 steps (7–15), against 11.2 (9–13).
- **Not adopted:** a generic swing; a pelvis lowered by 3 cm made swing failures worse (23 → 36 %).

**Unified controller (22:20 → 02:10)** (`10c8d74`, `fa55c9d`, `0c4520e`). The user: one hierarchy, "desired locomotion velocity → stance/ground-reaction regulation → … → physical swing execution", with reachability as a hard constraint.
- **The 50 ms lag located:** the swing hip used the delayed pelvis pitch rate.
- **The fix keeps the 50 ms latency.** An internal forward model predicts the pelvis rate instead: landing error +6.7 → +1.0 cm, swing success 63 → 87 %.
- **Best result:** 14.7 upright steps (6–40) over six starts. One start walked all 40 steps at ≈ 0.5 m/s; the others ended after 6–11.
- The review named the inherited swing as the binding limit.

**Overnight runway, first phases (02:52 → 04:19, 2 Oct)** (`996dd7b`, `37a0849`). The brief: "COMPLETE THE WALKING FOUNDATION".
- **Swing executor X** was built but not adopted. The inherited swing turned out to execute late foothold changes with a gain of ≈ 0.65 / 0.57 / 0.50, and timing changes fully. That overturned the unified review's premise.
- **Failure mechanism:** the heel-strike CoP stays behind the COM for 0.2–0.3 s in early stance.
- Rocker compliance, a two-step preview and a stronger stance gain were tested; none was adopted.
- **Speed envelope:** no stable range anywhere from 0.30 to 0.70 m/s.

**Validation.** At every commit:
- `regress.sh` identical (12 suites by the evening);
- G2W_A8 hashes and foot-gate F0 / F2h 42/42 unchanged from when each was introduced;
- all walking code opt-in.

Identification dumps (up to 361 MB) were kept out of Git.

**Parallel: player cards** ([Chat extraction] C01; [Local] workspace `~/Documents/Codex/2026-10-01/new-chat-2/`, `~/Downloads`).
- **Designed** (17:36 – 18:56): reusable season cards for the manager simulation, not promo / event cards.
  - Six rating tiers: Diamond 90+, black / gold 85 – 89, gold 75 – 84, silver 65 – 74, bronze 55 – 64, copper ≤ 54.
  - Real photographic headshots with the jersey removed or blackened and the face pixels preserved.
  - Generated faces were rejected. The two AI-generated Salah images (17:24, 17:47) were an earlier experiment, not the accepted treatment.
- **Reported, incomplete** (19:23): the six-style photographic replacement began; the export stopped when editing disconnected during edge cleanup.
- **Reported and located** (22:05): `Touchline_Salah_Flip.html` and `Touchline_Salah_Back_Preview.jpg` (workspace 22:03 / 22:04). The Diamond Flip / Glimmer variants follow: workspace builds 22:50 – 22:55; `~/Downloads` copies 22:39 / 22:56, the Glimmer copy byte-identical to the workspace build.
- **Reported and located** (00:14, 2 Oct): `Touchline_Liverpool_2027_Cards.zip`, the first 19-card Liverpool batch (workspace, 53 MB). It is superseded the next day by the corrected 21-player set.
- **Not archived in Git:** the files depict real players; the 8 Oct publication decision is unchanged.
- **Workstream end of day:** the tier system and photographic direction are set, and the flip / glimmer prototypes and the first batch exist. A fully cleaned six-tier photographic export does not.

**End-of-day state.** 45 local commits, nothing pushed.
- G2b not achieved.
- Default foot F0; F2h opt-in.
- Yaw unresolved.
- The runway continued past 06:00, ending in the decision report `39c8dd2` (06:46, next day).

---

## Friday 2 October 2026 — Physical Character V1 frozen; V2 begins as a clean sheet

**Evidence:** [FC-Sim Git] 12 commits: 4 on `prototype/physical-character-v1`, then 8 on `prototype/physical-character-v2`, `39c8dd2` (06:46) → `77815db` (04:31, 3 Oct). Tag `checkpoint/physchar-v1-final-research` → `11149df` (annotated 16:28, local only). [Doc] `PHYSICAL_CHARACTER_V1_FINAL_HANDOFF.md`, `PHYSICAL_CHARACTER_V1_LESSONS.md`, `g2_stepper/`; `PHYSICAL_CHARACTER_V2_SPEC.md`, `DECISIONS.md` (the 2026-10-02 sections and the first 2026-10-03 section), `g0/G0_REPORT.md`, `g1/G1_REPORT.md`; 8 user briefs and decisions in the two `sources/` folders. [Local] The snapshot `_preserved_2026-10-02_physical_character_v1_final/` (files written 16:21–16:31). The V2 branch and worktree were created at 17:45 (branch reflog, directory birth time).

**The overnight G2b stop** (`39c8dd2`, 06:46; the tail of the 1 Oct night's runway).
- **Still no robust walk.** Used as a perfect-model oracle, the simulator searching one step ahead averaged 17.0 upright steps; a depth-2 beam held all 28 searched steps on two starts.
- **The report** concluded that "the plant is controllable by lookahead placement". It offered A, stance mechanics (recommended), or B, a lookahead predictive layer.
- **Not adopted:** `ctrl.Lref` and three new map sets, whose best typical walk was 10.8 steps.

**The Physical Stepper consolidation** (`157ba0b` 14:55, `d133e1a` 15:24).
- **The brief:** the user's "MAJOR ARCHITECTURE CONSOLIDATION" came with three Astra reports. It asked for a KEEP / REPLACE / DEFER / EXPERIMENTAL record before any code. Where a report conflicts with a measurement, the measurement wins (`g2_stepper/DECISION_RECORD.md`).
- **Built, all opt-in:** exact snapshot / restore sessions (16/16 bit-identical to replays); a contact-event schema; a surrogate model and a step planner (held-out live: 8.7–10.0 upright steps).
- **The best oracle** held all 20 searched steps on 6/6 starts. On a 40-step horizon it held one start but collapsed after 29 on another. Not robust.
- **Recommendation A, transition-planned walking:** plan the double support's duration at touchdown. It went to the user and was never implemented (handoff §S).

**Corrections made the same day.**
- **The overnight beam's 28–34 steps** reproduce only with its 4-decimal command rounding. Exact commands give 26 / 13 / 20, so a 0.1 mm difference decided between 13 and 34 steps.
- **"Stepping cannot brake"** (`157ba0b`) holds only near the controller's own decision; long steps brake by −0.03 to −0.07 m/s per step (`d133e1a`). This claim and the overnight lookahead claim are two of the three overturned conclusions in `PHYSICAL_CHARACTER_V1_LESSONS.md` §19.
- **An event target** used the foot-body origin, not the sole centre (≈ 7 cm). Control was unaffected.

**The V1 freeze** (`11149df`, 16:28). The user's preservation brief: "Do not begin V2. … Do not improve walking."
- **No runtime code changed.** The commit adds the final handoff (A–V), the lessons, a manifest, and the user's briefs and the Astra reports verbatim. Regression at `d133e1a`: regress.sh 12/12, G2W_A8 6/6, foot gate 42/42 ×2, session_check 16/16.
- [Local] **Outside Git:** bundles (1.68 GB / 46 MB), untracked evidence (431 MB), scratch files and transcripts, with checksums.

> **Transition — V1 frozen; V2 starts from a clean sheet (`11149df` → `5646d71`).** The user's brief: "V2 is not a patch to V1. It is a clean-sheet physical humanoid designed using everything V1 taught us." V2 got its own branch, cut from the freeze tag, and its own worktree; V1's branch has stayed at the freeze commit.
> - **What crossed (spec §21):** the lessons, the Jolt adapter pattern, deterministic maths and hashing, the snapshot oracle, the contact-event lifecycle.
> - **What stayed behind:** V1's display-mesh body, its walking controllers, its maps and its opt-in flags.
> - **The rule carried forward:** "Simulation decides what happens; animation visually explains what happened."

**The V2 specification** (`5646d71`, 18:26; research only, 27 sections, every number reproducible from `calc/`).
- **The premise was challenged first:** "A new body is justified. What makes it justified is not the walking failure." V1's geometry came from a stylised display mesh (36 × 16.4 cm box boots, an upper arm 25 % short). No V1 body property was tied to the speed creep.
- **The body:** 14 bodies and 13 joints, with 35 rotational DOF against V1's 31 (knee axial rotation and forearm pronation added); a 31-bone Unity-compatible skeleton; a 1.82 m / 78 kg reference, an 11.3 cm boot and zero body damping.
- **Gates:** the brief's "DO NOT DESIGN WALKING FIRST" became gates G0 (anatomy) to G7 (forward walking), with G5 a first-class transition gate.
- **User decision:** D1–D10 approved, except D7 (browser WASM vs native Jolt for 22 players), which is deferred; on a contradiction in G0, "stop rather than silently changing the specification."

**V2-G0: anatomy and static construction** (`9aacdf3` 19:32, `e84bca9` 20:10).
- **Built:** a deterministic human generator (bodies, joints, colliders, skeleton, physics → render mapping); a Jolt adapter ported from V1; a WebGL2 review page. Node and headless Chrome agree on 8/8 bodies.
- **The first run stopped on two specification contradictions,** and the spec was not changed: no head sphere fits both head length and breadth (+15.5 mm); population bands were applied to the ±2 SD leg variants.
- **User decision:** C1, a front-to-back head capsule ("Do not widen the tolerance merely to preserve the sphere"); C2, separate checks for morphology variants.
- **G0 PASS** on all 8 bodies (46/46 or 45/45), global 4/4.
- **The user approved G0 visually** and briefed G1, passive physics only: "A passive body falling over is success, not failure."

**V2-G1: passive physics (overnight).**
- **Criteria first:** pre-registered (`5e4548d`, 00:58) "so the history shows the thresholds were fixed first".
- **Built** (`963cd9c`, 01:37): the passive tissue as one conservative potential in Jolt's implicit motor rows; 17 curated scenarios.
- **A G0 defect:** Jolt's gyroscopic term was off, so a free body conserved angular velocity instead of angular momentum. A free asymmetric body drifted |ΔL|/|L| = 1.53 over 2 s; with the term on, 2.5e-3.
- **G1 FAIL** on 5 of 13 checks, traced to seven causes: impact warm-start; the rigid stops; the boot's one-face manifold; the head capsule; slop; float32; the 15 m/s impact.
- **User decisions C1–C7**, then autonomy ("Under no circumstances begin G2 while I am away"): 60 iterations; end-stop margins measured per joint ("Do not silently redefine human ROM to whatever Jolt permits"); a boot experiment first; a two-sphere head; no global 720 Hz and no indiscriminate CCD.
- **Applied by 04:31** (`7632dbe`, `e06d177`, `77815db`), with criteria v2 pre-registered.
- **Seven passive-drive defects (G1-D2…D8)** were found and fixed. Two examples: start-of-step linearisation let a joint enter the stiff stop without doing work (thoracic +9.2 J in one step); Jolt silently clamped drive targets onto the joint limits.

**Parallel: corrected cards, live squad ratings, pack opening** ([Chat extraction] C02 – C04; [Local] the 1 Oct workspace).
- **Reported and located** (14:40): the corrected Liverpool collection, `Touchline_Liverpool_2027_Fronts_and_Backs.zip` (workspace 14:37, 120 MB).
  - 21 players, 42 transparent front / back PNGs, with corrected ratings, tiers and eligible positions; tactical fields unassigned.
  - It supersedes the 19-card batch for that collection; it is not a second player database.
- **Reported and located** (17:30): `Touchline_Squad.html` — drag and drop, formation switching, an expandable bench, flip cards and tactical controls (workspace build 19:18).
- **Designed and reported** (19:02): workbook-driven live ratings.
  - An ineligible position costs −5 on **every attribute**, then the positional OVR is recalculated. It is not a flat OVR penalty.
  - Reported examples: Van Dijk CB 88 → ST 76 → CB 88; Szoboszlai gains CDM eligibility (82, no penalty). Not re-verified.
- **Reported, conflicting** (23:11): `2026-27-ratings-flank-rules-updated.xlsx`, attribute-based weak-foot / opposite-flank deductions, 226 player checks.
  - The chat's last scale (high / medium / low: 4★ 3 / 2 / 1, 3★ 4 / 3 / 2, 2★ 5 / 4 / 3, 1★ 6 / 5 / 4, 5★ none) conflicts with a saved summary (3★ 6 / 4 / 2 …).
  - A file of that name is on the Desktop (23:13). [Local, inspected 8 Oct] Its Rules sheet stores the chat's last scale (1★ 6 / 5 / 4, 2★ 5 / 4 / 3, 3★ 4 / 3 / 2, 4★ 3 / 2 / 1, 5★ none). For that file the conflict therefore resolves in the chat's favour. The file is archived in the portfolio package (Stage 24, Appendix G).
- **Reported and located** (00:28, 3 Oct): `Touchline_Pack_Opening.html` (workspace 00:26).
  - Top tear, five concealed tier-coloured cards flying left to right, click-to-flip reveal, replay, Diamond glints.
  - No spending, payment or acquisition backend.
- **Designed, placement uncertain:** match-interface Influence controls, with gameplay not connected.
  - At most six options; losing / tied / winning action sets.
  - 0 / 8 at the start, +1 every 15 minutes and at half-time (7 per match).
  - A role change costs 1 and a formation change 4; out-of-10 ratings move beside the names.
  - The exact time and final build are not recovered. A `touchline_matchday/` build exists in the workspace, but that it is the final Influence artifact is not established.
- **Problems:** a connection drop affected the final squad save and visual sizing.
- **Screenshot** (added 8 Oct): the ratings workbook during the review (14:04), in [`chronicle_screens/2026-10-02_ratings/`](../review_artifacts/chronicle_screens/2026-10-02_ratings/).
- **Workstream end of day:** cards corrected; live-rating squad, flank workbook and pack-opening prototypes exist. The final flank scale and every UI save are unverified.

**End-of-day state.** V1 is frozen and recoverable. V2 is specified; G0 has passed and been approved. G1's criteria v2 are fixed and its final evidence run is under way (it finished at 07:15 on 3 Oct).

---

## Saturday 3 October 2026 — V2-G1 and G2 pass; a Jolt turf-contact defect; G3 held at the pre-G4 stop

**Evidence:** [FC-Sim Git] 33 commits on `prototype/physical-character-v2`, `7d10111` (07:15) → `f85e396` (04:34, 4 Oct). [Doc] `DECISIONS.md` (the 2026-10-03 sections, "2026-10-03/04" and the two early 2026-10-04 sections); `g1/` (incl. `g1/heel/HEEL_RISE_REPORT.md`); `g2/`; `g3/`; `engine_blowup_B/B_REPORT.md`; `symmetry_corrections/`; `PRE_G4_OVERNIGHT_REPORT.md`; 13 user decisions and instructions in `sources/` (11 dated 2026-10-03, 2 dated 2026-10-04 but given before 06:00).

A day of stop-and-decide cycles: 11 commits stop for a user decision or review, and 10 pre-register criteria or tolerances before their evaluation run.

**G1 closed** (`7d10111` → `2108c15`).
- **The overnight run ended NOT YET PASSED** (V2-REF 10/17, V1-matched 12/17, variants 31/40), with four causes left. The main one: Jolt builds a boot manifold from one supporting face and drops the deepest point. The single hull therefore missed > 10 mm in 1.6 % of orientations (worst 35 mm).
- **User decisions D1–D4:** a 10-piece boot of identical geometry (+19 % physics); 150 velocity iterations, "a validated correctness configuration, not yet the accepted production-performance configuration" (debt TD-1); 1.5° settled excursion tolerated, with the ROM unchanged; four test-definition corrections.
- **G1 PASS** (`e531487`, 11:04): 17/17, 17/17, 40/40; step energy rise 0.000 J; emergency-stop ticks 0; 0.458 ms per tick per player (+39 %). Two genuine rate effects failed row 8 as pre-registered; a v3.1 evaluation applying the user's D4a text was "recorded openly".
- **Found while integrating:** Jolt's default 1 mm hull tolerance dropped slivers at the boot's internal seams (−0.28 % volume). Fixed with 1e-5 m.
- **The heel rise** (`dd9026a`). The user asked for the cause of a heel rise (0 → 238 mm) onto the toe in the 1 m feet-first drop. The collapsing shank does +2.75 J of work on the foot through the ankle joint, while the ankle tissue absorbs −1.03 J. The rise stops at a torque-free strut pose (70.2°; the geometric value is 70.84°).
- **User decision** (`2108c15`, 12:20): "Do not tune the body to make this passive fall look more human." The drop is "a mechanical torture test of the passive plant", and the probe stays permanently. **V2-G1 accepted as passed.**

**V2-G2: active standing** (`3bd8533` 13:11, `a3ccc46` 13:37).
- **V1's standing work** was studied read-only, not ported.
- **New:** finite actuators in a parallel constraint whose limits are exactly the capacity; a capture-point ankle strategy (kξ = 1/3, i.e. 1.33 mgh, from human evidence); a measured CoP region.
- **PASS 13/13** (620 runs): quiet stance on 8/8 bodies for 60 s at ≤ 8.1 % of capacity. V2-REF no-step boundary, recovered / not: F 15 / 20, B 15 / 20, L = R 20 / 25 N·s.
- **Run 1** had exposed an L/R order dependence in the CoP allocation and a measurement-window bug. Both were fixed, and run 1 is kept.
- **Hip and arm strategies:** no gain, not adopted.
- **Accepted** in the user's G3 instruction (`e2c0df3`, 13:51).

**V2-G3: weight transfer, and the ankle law** (`871ab62` → `12309ee`).
- **NOT PASSED, 15/19** (`f080253`, 15:08). Failing rows: the short-legs body's near-single-support share 0.948 vs 0.95; mirrored slip 0.76 vs 0.5 mm; browser ≠ Node (`Math.hypot` / `atan2` in G2-era IK); controller cost 0.152 ms under a 9-process load.
- **New finding TD-11:** the ankle's ab/adduction axis has no actuator and no stiffness inside ±10°, so the leg twists freely on the planted foot. G2 has it too.
- **User:** "do not declare G3 passed and do not start G4."
- **The resolution** (`677cb6e`, `3d9ebb7`): deterministic maths in the controller and the G1 passive layer, with G2 outcomes 620/620 identical; G3 16/19; the 95 % threshold was the brief's example number; isolated controller cost 0.036 ms; both safety mechanisms kept: without the hold, a push drags an unloaded foot 53–230 mm.
- **User:** revised criteria approved, and an evidence-based ankle law near 0.3–0.5 N·m/° ordered: "do not simply choose a stiffness because it gives the best controller result."
- **The literature check:** the primary sources did not support 0.3–0.5 N·m/° for this coordinate, so 0.10 N·m/° was pre-registered (`a028bed`).
- **It failed G1** (`12309ee`, 17:15): a one-step +450 J ankle blow-up at 720 Hz. Every stiffness from 0.05 to 0.5 failed (up to +45,983 J). **Not adopted.** The default returned to k = 0. Switching to 0.15, which removed the twist, was refused as "choosing by G3 score".

**Investigation B: the energy came from under the turf** (`1bbf994` 18:56, `d7a7fcb` 19:43). The user: "approve B only", then two autonomous hours.
- **The root cause is Jolt v5.6.0's narrow phase, not the ankle.** Near the 100 m turf box, GJK hands a boot piece to EPA, which returns an unconverged triangle facing the wrong way. The contact lands on the box's bottom face, 2 m down, and the position solver teleports the boot 25–160 mm and turns it 45–173° in one step, with no velocity change. The +182 J … +75,766 J is the end-stop potential of that forced pose.
- **The accepted k = 0 plant was exposed too:** 4 events in 1,054 runs; +34,300 J from sliding the turf 341 mm under a resting body; G2 / G3 had 0 invalid manifolds in 37 M contacts.
- **The proof:** bit-exact native reproduction, reduced to one shape query; a diagnostic EPA patch took reversals from 2,110 to 0 over 175 M poses; Jolt's `PlaneShape` turf gave 0.
- **Falsified:** a smaller box, the convex radius, speculative contacts, the compound boot.
- An upstream issue was drafted, not sent. **Corrected openly:** TD-12 was reworded; an event count first written "5 of ~2,800" is 4 of 1,054.

**The flat-plane turf** (`68693b9` → `1204777`). **User:** "a collision-representation correction, not a change to the intended world geometry"; "Do not patch Jolt"; reopen G1.
- **G1 PASS** under criteria v4, which gate turf-contact validity (`e17bc73`, 22:49): the 19 recorded reversed states are clean; 225 M native poses gave 0 invalid; no systematic difference over 254 paired plane-vs-box runs; physics −7 %.
- **G2 PASS** (`13b0848`): 620/620, 0 outcome changes.
- **G3 18/19** (`1204777`): only J2 failed, and it failed identically on the box. A direct probe found the controller mirror-equivariant to numerical tolerance. The cause was J2's own definition, which compared two physical runs.

**Symmetry and the pre-G4 stop (after midnight).**
- **User:** split J2 into J2a (controller mirror-equivariance) and J2b (mirrored physical outcomes). Criteria v3 (`97a0c5d`) disclosed in advance that J2a would fail; the tolerances were not widened.
- **The v3 result** (`d80f88f`, 00:34): 19/20, J2a 0/81. Three controller defects: a collinear hull vertex kept on the left boot only (4.8 µm, amplified to 1.66 mm of CoP); a one-sided finite-difference IK Jacobian; unit-quaternion formulas applied to Jolt's non-unit float32 orientations.
- **User, Option 1:** "Do not preserve an asymmetric controller merely because its errors partially cancel the plant's solver-order asymmetry." Corrected in `e9bcf96`, with permanent component regressions.
- **Validation** (`7eb6248`): J2a 79/81. The J2b floor (1,027 runs) is chaotic amplification, not Jolt's ordering. IK cost rose 0.023 → 0.107 ms, and two marginal G1 rows now failed.
- **Overnight, unattended** (`833ec4a` → `f85e396`): global quaternion normalisation was **rejected** because it flipped those two G1 rows; normalising only at the controller boundary leaves the plant bit-identical.
- **Also overnight:** an exact point-in-region test (a reflex vertex had made the old convex-only test misclassify ~2.7 % of the foot region); an IK polish; staged forward kinematics (−25 % IK cost). A G4 IK study found 1,336 of 16,704 reachable targets anatomically invalid; bounded IK stays opt-in, default off.
- **G3 v3.2** (`d67f417`, 04:31): **all 20 rows pass, but G3 is not declared.** The J2b tolerances fixed before the run (A 0.5 / B 10 / C 2 mm, `8e57a3e`) failed their pre-registered meaningfulness test: 0 of 3 injected asymmetries detected. J2a detected all three by 9–12 orders of magnitude.

**Corrections and process errors** (recorded in `DECISIONS.md`).
- **Gate errors:** in G3 run 1 a one-tick probe lag at release failed three rows (window fixed, physics hashes identical); row J's 0.5 mm tolerance was "my criterion-design error".
- **Bookkeeping:** a TD-3 / TD-11 label collision; a comparator reading 620/620 as 617/620; a "minimality" note drawn from nominal scenes, withdrawn.
- **Tooling and checks:** mid-line `//` comments silently swallowed code twice, and `node --check` does not catch it; `sigmaErr` was gated by mistake, a category error kept in the history; an earlier "1 change" in G3 was a pairing artifact.

**Adopted vs not adopted.**
- **Adopted:** the 10-piece boot and 150 iterations; the 3° end-stop with its 1.5° tolerance; parallel finite actuators and the capture-point ankle strategy; the G3 transfer / hold / feasibility options; deterministic maths; the `PlaneShape` turf; the symmetry package.
- **Not adopted, or left default-off:** the hip / trunk / arm and knee strategies; the ankle neutral-zone law (`V2_ANKLE_NEUTRAL_K`, default 0); the EPA patches, the contact guard and the penetration cap; global quaternion normalisation; bounded leg IK.

**Parallel: finance, transfers, staff; ratings consolidation** ([Chat extraction] C05 – C06; [Local] workspace `touchline_finance/`, `~/Downloads`).
- **Designed** (12:33 – 13:37), first request: an SCR-style finance page with an 85 % spending-budget marker, the scale expanding to 150 % beyond 100 %, and a 115 % fine marker.
- **Designed**, then a simplified game model (game rules, not claims about real regulations):
  - no amortization; one-time transfer fees; sales credited 1 : 1;
  - overspending reduces next season's budget (example: 95 % against 85 % → next budget 75 %);
  - the 24-point sanction at **120 %**, not 130 %.
    - [Local, recaptured 8 Oct] In the final build (23:34), 120 % is next season's 24-point threshold after the 95 % example overspend (75 % / 105 % / 120 %).
    - This season's scale gives 6 points just above the 115 % red limit, then +6 per 5 pp, so 24 points at 130 %.
    - The 13:02 first pass still used real-regulation-style rules: amortisation, a levy and a separate 70 % UEFA limit.
- **Reported:** `Touchline_Finance.html`.
  - First pass 13:03; the build survives as the workspace's `before_contracts/` (13:02, 0.3 MB).
  - Corrected calculations at 14:03 ("a £100m sale adds £100m of room"), with an in-place save **failure**; replacement copies were supplied.
  - At 15:15: POT beside OVR, and a transfer popup (search, illustrative offers, fee credit, wage savings, budget impact, Undo).
  - Final workspace build 23:34; `~/Downloads` 23:50.
- **Reported, partly located** (18:42): a staff screen with six roles, searchable hiring, traits, manager tiers, contracts and budget updates. No staff HTML basename is recovered; staff previews and `staff_model.js` are in the finance workspace.
- **Reported, not located** (16:37): `2026-27-ratings-final-review-2026-10-03.xlsx`.
  - 226 players and 11 reviewed profiles (Dembélé, Haaland, Mbappé, Olise, Bellingham, Kane, Hakimi, Saliba, Yamal, Messi, Nuno Mendes); original positional formulas kept; Haaland PAS → 71; POT ≥ OVR enforced.
  - **Conflicting:** its summary OVRs disagree with an older saved overview (e.g. Mbappé 94 vs 92, Bellingham 94 vs 91). Neither is promoted.
- **Also in `~/Downloads`:** `Touchline_Squad.html` (23:54) and `Touchline_Matchday.html` (02:01, 4 Oct).
- **Workstream end of day:** finance / staff prototypes and an 11-profile ratings export are reported. Save identity and some staff details are unverified.

**End-of-day state.**
- **Gates:** V2-G0, G1 (flat plane, criteria v4) and G2 pass. G3 passes all 20 rows under v3.2 but is not declared.
- **Plant:** `PlaneShape` turf, 10-piece boot, 150 iterations, ankle k = 0.
- **Not started:** G4, the ankle re-investigation and the 180 Hz study.
- **Next blocker:** the user's choice on J2b and the G4 foothold-IK policy, then the ankle (`PRE_G4_OVERNIGHT_REPORT.md`, 21 items).

---

## Sunday 4 October 2026 — G3 closed, a corrected knee, and the first E1a run

**Evidence:** [FC-Sim Git] 46 commits on `prototype/physical-character-v2`, `bb0ec47` (11:20) → `7b0ecf6` (05:56, 5 Oct). [Doc] `review_artifacts/physical_character_v2/`: `DECISIONS.md` FP-11 → UF-1; `PRE_G4_REPORT_ANKLE_IK.md`, `PRE_G4_DECISION_REPORT.md`, `pre_g4_runway/`, `final_pre_e1a/`, `knee_axial_review/`, `knee_correction/`, `e1a/`, `unload_fix/`, `touch_semantics/`. Ten user decisions and instructions are saved verbatim in `sources/`: six dated 2026-10-04, and four dated 2026-10-05 that were committed before 06:00.

**Starting state.** The overnight report (`f85e396`, 04:34, previous entry) had stopped at the pre-G4 decision point. All 20 rows of G3 v3.2 passed, but G3 was not declared, because J2b failed its own pre-registered meaningfulness test.

**User decision: J2 Option (a), and G3 passes** (`bb0ec47`).
- J2a (controller mirror-equivariance) becomes the normative left/right gate. J2b (two physical runs compared) becomes a permanent diagnostic, reported by class. The user called this "a test-design correction supported by the preregistered test-of-the-test, not a relaxation made because the production character failed."
- **G3 criteria v3.3: PASS 20/20** (19 gating rows, J2b reported); J2a 81/81. The history from v1 to v3.2 is preserved.
- The same decision authorised the ankle reinvestigation (Phase F), the 180 Hz investigation (Phase G) and IK research. G4 was still not authorised.

**Ankle Phase F / G and anatomical IK** (`4b544ca` → `4cc8b09`, 11:24–13:59).
- Pre-registered before any k > 0 run: k = 0.11 / 0.13 / 0.15 against 0, requirements A–H, and "never by G3 score".
- **No candidate is evidence-supported with the validated controller.** B, C and D fail for all three. Perturbed G1 failure rates are 6.3 / 11.3 / 7.7 %, against 5.0 % at k = 0 (`3219bdc`).
- **Mechanism** (`2d4815e`): the residual leg twist is an *actuator-powered* limit cycle of the posture IK's "twist DOFs at current" policy, present even at k = 0. A second mechanism is a knee-axial end range reached in prone rest.
- **Phase G:** the 180 Hz event is an end-range integration error. It converges with dt and is net dissipative.
- **IK:** ground-level footholds within ±30° yaw are 0 of 2,256 invalid. The invalid 8 % is mostly ±45° yaw with a pelvis that does not turn. The bounded-IK fallback was refined but **not adopted**, and a foothold contract was proposed (L1 geometric / L2 anatomical / L3 dynamic, `5dcb7ce`).

**Pre-G4 research runway** (`bd29db7` → `f31e523`, 11 commits, 14:11–16:30). The user was away "approximately 2–3 hours": "Do not start G4 and do not stop early merely because you encounter a decision point."
- **Twist root cause** (`8cfb25b`, `4718079`). "Twist at current" turns the hip into a world-referenced pelvis spring acting on unanchored legs. It pumps in +19 J against −17 J of damping per 8 s.
  - Across 8 bodies × 5 disturbances, "current" fails to decay in 25/40 runs; reference, blend and drift fail in 0/40.
- **The G4-critical finding** (`adaad68`, `aa3bf6d`): in single support the stance ankle reaches its ab/adduction end range under every twist policy. The passive ankle axial path is the only net yaw anchor.
- **Interface audit** (`2dc9f04`, `1952f20`): 12 hazards at contact-to-liftoff, 7 and later 8 of them confirmed with an external-lift probe. One example is 55–158 N·m torque steps at re-contact.
- **Reachability certificates** (`e98aa2f`): all 1,336 invalid targets are proven infeasible as defined. But with the held twist DOFs free, 94.7 % become feasible, so the definition decides the answer.
- E1a / E1b (lift → hover → replace) and an E2 short step were designed. Verdict: "Not yet for G4 experiment runs" (`PRE_G4_DECISION_REPORT.md`).

**Final pre-E1a resolution** (`07ca15d` → `82dfdba`, 9 commits, 17:27–19:14). The user asked for a state "where the next decision can simply be AUTHORISE E1a or DO NOT AUTHORISE E1a".
- **Support / contact lifecycle** built, default OFF (`07ca15d`): SUPPORT → UNLOADING → TOUCHING → LIFTOFF → AIRBORNE → TOUCHDOWN → LOAD_ACCEPT.
  - Refined and frozen (`1926df6`, `f4fa331`, `0bdde9f`). One fix: a state-switched height had caused an 88 N·m τ0 jump.
  - External-lift matrix: 88 runs, 0 falls, 0 chatter.
- **Twist-policy battery** (pre-registered `d22a1e7`): strictly, none is eligible (`60471db`). Reference fails only a capacity fall shared by every policy, which is a pre-registration flaw and was not re-scored. "Current" is rejected.
- **Single-support yaw:** human yaw resistance is distributed, including an active subtalar path that our ankle omits.
- **Knee:** the knee envelope is what blocks k > 0, but a literature-shaped envelope breaks other G1 rows.
- **Ankle law:** k ≈ 0.13 fails G1 under every knee model.
- The E1 pre-registration was frozen (5 mm lift, 2.5 cm pelvis drop). Verdict: **DO NOT AUTHORISE E1a**, and nothing was adopted (FP-14).

**Knee axial literature review** (`b2f25bb`, 20:53). The user asked: "Do not design the model to make our existing G1/G2/G3 tests pass."
- At physiological torques the current knee is 2.6–4× too wide (64–66° at 5 N·m, against 16° in vivo at full extension). Its zero is fixed.
- The evidence supports a neutral θ0 that moves with flexion (the Walker curve to 120°). No code was changed (KR-1).

**Corrected knee `v2k`** (`0267291`, `097dcb7`, `89cb31e`, 21:23–22:54).
- **User:** "I approve proceeding with the knee architecture correction before E1a, but I do not approve treating uncertain deep-flexion numbers as established anatomy."
- The instruction cites an independent "Astra knee review" that was never supplied as a file (**Uncertain:** its content).
- **Order of work:** the parameterisation and the KV0–KV10 battery were pre-registered first (`0267291`). The implementation was then frozen default-off (`097dcb7`), with one potential U(θ, φ).
- **Results:** the mechanics validate. The plant follows the law within 0.001°, and in the E1a pelvis drop the knee tracks θ0 within 1.4°.
- **Strictly NOT QUALIFIED:** three threshold flaws in the pre-registration (errata E1–E3), a bad test premise (E4), and a splayed-leg hip rest in G1 1.S′.
- **Gain:** the perturbed G1 failure rate is 4.3 / 5.3 %, against 5.0 / 11.3 % with the old knee.

**Closing the decisions before E1a** (`56a87b8`, `ed59b3b`, `1d43f80`, 23:55–00:32). The user: "Do not simply convert failures into passes."
- **Superseding criteria** KV2b′ / KV3b′ / KV4a.3′ / G1-5′. Each passes on the corrected and the old knee and fails on adversarial variants. The original FAILs are kept.
- **The splayed-leg hip rest** is a genuine finding, 15/15 in all 35 deep-flexion cells. This corrects KC-1's reading.
- **Configuration frozen:** `v2k` central, ankle k 0.13 (as a passive tissue value only), reference twist semantics and the lifecycle; G3 row K → K′.
- **Qualification v2:** everything qualifies except the hip rest (2.09° at hip_L.rot, against 1.5°). So E1a was **NOT READY, with one blocker**.

**E1a authorised, run, and failed** (`76cd5ef` → `74fd215`, 03:23–03:49).
- **User:** "I now explicitly authorize E1a."
  - The hip rest becomes a recorded exception that does not gate E1a, with a hip review made mandatory (TD-16): "not an acceptance of the hip excursion as anatomically correct, not a tolerance change, and not permission to tune around it."
  - E1b and anything later stayed unauthorised.
- **Result:** the harness was committed before the run (`c3b09d1`). All 10 runs then hit the pre-registered unload time-out, so no lift was ever commanded. Nine criteria fail, all as consequences of no lift; determinism is 21/21.
- **Cause:** the zero-share foot keeps 1.02–1.25 % BW, just above the 1 % release threshold. Earlier tests had unloaded the foot with an *external* lift, which hid this.

**The unload root cause, and B1 + B3** (`fd1993d` → `2ce81f3`, 04:16–05:12).
- **Root cause, a latent controller bug:** the knee flexion feed-forward lacked the locked-axis twist term −tan t·(T·ẑ).
  - The feed-forward is 5.9 N·m short, so the posture PD sags and leaves the pelvis 0.94 mm low.
  - The zero-share leg then presses 8.75 N into the turf, and the lifecycle deadlocks.
- **User:** B1 + B3 approved; the 1 % threshold stays. The controller "may never kinematically lift, teleport, pin, detach or otherwise force the foot".
- **Results** (2,182 runs): B1 cuts the residual from 7.7–9.5 N to 0.4–0.8 N. But at drops ≥ 1 cm the released foot leaves the turf by itself (A1 fails), because of a pre-existing defect in the TOUCHING hold. **Not adopted** (UF-1).

**The touching-foot runway begins** (`1ce8cd2`, `63543e8`, `7b0ecf6`, 05:43–05:56). The user was away "for several hours".
- **Cause found:** the released foot's target height follows the foot itself, so the foot has no vertical stiffness, and pelvis settling lifts it.
- Only "surface vertical reference + small seating force" gave 0 spontaneous lift-offs everywhere. Candidate C (B1 + `touchRest`) was pre-registered with 2,146 runs, before any result.

**Corrections and process errors.**
- **The mid-line `//` defect** (recorded twice in FP-6) recurred twice:
  - `1926df6` crashed `gates/v2_g1.js`; fixed in `6c8140c`; no results came from the broken file;
  - `knee_v2k_ctrl.mjs` (`ed59b3b`); three items were re-run.
- **Figures corrected:** the pelvis-yaw figure became 85 %, not "74–91 %" (`e98aa2f`). A contaminated box-turf G1 sweep was discarded (`82dfdba`).
- **Development errors:** an ablation dispatch bug, with 25 runs marked void (`fd1993d`).

**Adopted vs not adopted.**
- **Adopted:** G3 criteria v3.3, and the frozen pre-E1a configuration (accepted by the user at 03:23, KC-5).
- **Not adopted, or left default-off / diagnostic:** the bounded IK, the twist policies other than reference, the diagnostic knees, the deep-flexion alternatives, and B1 + B3.

**Parallel: re-ranked ratings, the broad manager mockup, standings review** ([Chat extraction] C07 – C09; [Local] `~/Downloads`, workspace `2026-10-04/new-chat-6/`; screenshots).
- **Reported and located** (14:30): `2026-27-ratings-updated-ranked-2026-10-04.xlsx`.
  - 226 players; 416 approved input changes across 20 players; physical rank 1 – 226; a rank-changes tab; 78 eligible-position calculations; no formula errors reported.
  - Anderson 87.40 → 87 and Barcola 81.46 → 81 (inputs unchanged); Messi rank 6 → 4, Osimhen 12 → 8.
  - A file of that name is in `~/Downloads` (17:37, 733,683 bytes, SHA-256 `d4ddabc8…`). Checked 8 Oct against its stored values (no recalculation): these four figures and the 226-player / 20-profile / 416-change counts match. Archived in the portfolio package (Stage 26).
- **Incomplete:** Araújo's edits were still proposed / pending at 20:53 – 20:55. No later lock, or workbook applying them, is recovered.
- **Designed** (20:48 – 21:07):
  - unify the separately built screens around the Squad stadium / card look;
  - Home destinations for Ultimate Team, Draft, Career and Manage a Club, as placeholders;
  - Manager and Club Runner differ in firing / leaving / continuity, not in controls;
  - browser first, with the match / training / rest calendar as the core flow.
- **Reported, partly located:** a connected HTML mockup.
  - **Conflicting count:** an earlier reply claimed 33 screens; the final one (22:29) says 30 screens and 23 checks. The build's own screen map lists 29 numbered entries (recaptured 8 Oct, portfolio Stage 26).
  - `Touchline_Club_Management_Mockup.html` is in `~/Downloads` (22:19, 8.7 MB). The review-package ZIP is not found.
  - **Figma incomplete:** shells, navigation, tokens and 10 components; detailed content and images unfinished after the quota.
- **Designed, then reported** (from 03:14, 5 Oct): the standings review.
  - **Rejected:** concepts 2 and 5, and distracting backgrounds. **Kept:** the console clarity of concept 1, Next-opponent crests (a dash at season end).
  - The user required real linked HTML with qualification / relegation bands and navigation back to Squad.
  - `Touchline_Playable.html` and its source ZIP were reported at 03:25 (workspace output 05:21; the `~/Downloads` copy of 20:57 is a later build).
  - At 03:40: centred zone labels, a user-club star, and PL / UCL / Carabao / FA coverage. Interaction checks were reported; the browser visual check was blocked.
- **Reconstructed day assignment:** a gold-fill / rim experiment (04:59) and its reversion (05:04) fall inside this day at +01:00. The reconstruction had left them unplaced.
- **Earlier record:** `Touchline_Squad_Updated.html` (00:42, 5 Oct). The first screenshots of the redesigned standings and squad-management screens (04:13) are archived in [`chronicle_screens/2026-10-04_manager_ui/`](../review_artifacts/chronicle_screens/2026-10-04_manager_ui/).
- **Workstream end of day:** a ranked workbook and a broad linked mockup are reported (Figma partial). Standings have become a focused page-by-page review; Araújo is pending.

**End-of-day state.** E1a has been run once and failed before any lift. The deadlock is explained (B1), but a released foot then floats off the turf. Candidate C is frozen. **Reconstructed:** its official validation ran across the day boundary, and the result was committed at 06:36. Next blocker: the released-but-touching foot.

---

## Monday 5 October 2026 — E1a passes, E1b closes, E2 stops at the planning gate

**Evidence:** [FC-Sim Git] 35 commits on `prototype/physical-character-v2`, `ac3a3c4` (06:36) → `d202cac` (05:26, 6 Oct). The first five (06:36–07:25) finish the overnight touch-rest runway. [Doc] `DECISIONS.md` TR-1 → E2-8 (headings dated 2026-10-05 and 2026-10-06); `touch_semantics/`, `preswing/`, `e1a/`, `e1b_fix/`, `p15_capture/`, `e1b_ta/`, `e1b_close/`, `e2/`. Eleven user decisions and instructions are saved in `sources/`: six dated 2026-10-05, five dated 2026-10-06.

**Candidate C fails, at the end of the night** (`ac3a3c4` → `9e2a0b7`, 06:36–07:25).
- **Official validation FAIL** on three criteria:
  - R1, 2/240: late release on a straight leg (pre-existing);
  - R3, 17/144: 0.5 mm hovers bounce;
  - R7, 150/480: the resting foot drifts (pre-existing, halved by C).
- **The hold itself works:** across 1,447 runs C has zero spontaneous contact losses, while B1 alone loses contact in 122 of 352 (`touch_semantics/RUNWAY_REPORT.md`).
- **C2**, a continuous seat ramp, was refuted (18/144 against 17). R3 is caused by the 0.5 mm touch-sensing gap, not the seat (TR-1a).
- **G0–G3:** C fails G2 2.2b symmetry (9/12) because of `touchRest`; B1 alone gives 12/12 (TR-2).

**Pre-swing / contact-boundary runway** (`a98d43a` → `3da5e5e`, 13:11–14:44).
- **User:** "The vertical release/touching problem appears converged", but "do not simply accept the observed ~1 mm drag and do not arbitrarily anchor the foot."
- **Research:** a lightly loaded foot in contact should be held by contact and friction, not servoed.
- **Erratum TR-3:** R7 had measured rotation about a fixed contact point, not slip.
- **Refuted and kept as records:** `nullWanted` (a fall), `nullAccept` (an acceptance slide), and the actual-pelvis frame.
- **Candidate P\*** = B1 + `touchRest` + `lcVff "lin"` + `lcTouch.reseed`. Its 924-run validation was pre-registered (`abdd3da`), and the E1b tooling was committed before any E1b run (`9ef02bf`).
- **P\* passes V1–V15** (`3da5e5e`):
  - contact-point slip ≤ 0.04 mm; 20 mm hover error ≤ 0.89 mm;
  - slip under fast motion ≤ 1.9 mm (C: 9.1); G0–G3 pass.
  - Adopted as configuration **PSTAR** (defaults off). B1 alone fails G3 I2, so it is adopted only together with the hold.

**E1a PASS, E1b FAIL** (`d499453`, `11d2fea`, 14:50–14:59).
- **E1a**, rerun with PSTAR on the frozen protocol, criteria and harness: **all E1a-1…17 pass** on 8 bodies plus the mirrored run, with determinism 21/21.
  - Hover error ≤ 1.3 mm (limit 3); touchdown 0.25 mm from the foothold; torque steps ≤ 6.2 N·m.
  - Erratum E1-3: one sub-check was vacuous because of a harness defect. Its corrected measurement passes.
- **E1b** (28 runs: 20 mm lift, 1.5 s hover) fails two criteria; everything else, including the 5 N·s pushes, passes.
  - **E1b-7:** the abort clears the swing target in one tick, which causes 114–218 N·m τ0. This is pre-existing hazard H9.
  - **E1b-17:** V2-REF's stance-ankle yaw is under-damped (±6–8°).

**E1b fix, reuse-first** (`a89c307`, `99c71e9`, `19dbc73`, 18:35–19:18).
- **User:** "Do not start broad new bottom-up invention if an established solution already covers the problem." The named references were PyPnC, IHMC and BLF.
- **PSTAR2** adds two mechanisms:
  - `footYaw`: an actuator on the passive-only foot ab/adduction axis, at 0.64 × the approved subtalar capacity;
  - `lcPutDown`: a quintic put-down from BLF's swing planner.
- **E1b-17 fixed:** 56/56 yaw runs.
- **The put-down is smooth** (0.9–2.2 N·m against 22–38), **but 13/23 P15 aborts now fall.** A second, masked E1b-7 source was found, which corrects E1-4. PSTAR2 was **not adopted** (E1-5).

**The P15 capture study, then T-A** (`997a5e7` → `7a945de`, 20:46–21:48).
- **User:** "Do not choose P1–P5 yet and do not weaken P15."
- **Research:** IHMC's `FlamingoStanceState` puts the lifted foot straight down in place.
- **Capture analysis:** a lateral LIPM predicts 32/32 outcomes. P15 is recoverable in place if support follows measured contact. What actually fails is the acceptance pipeline: a 0.15 s intent delay, the 10 % floor and the fixed ramp.
- **User:** "Choose T-A: capture-timed put-down", and "do not force an impossible in-place recovery."
- **PSTAR3** catches all 23 P15 aborts with 0 falls (`7a945de`). But it still fails three items:
  - E1b-18 on V2-165-62: the old stance foot moves 6.8–7.9 mm (limit 5);
  - E1b-7 on V2-long-legs: 10.23 N·m;
  - E1b-7 on V2-REF at 480 Hz: one tick over.
- 12/23 aborts were classed "step required", though all were still caught. The study's claim that all eight bodies recover in place was "too strong" (TA-1).

**E1b closed; foot-yaw adopted; E2 frozen for review** (`ca4aad6`, `6e0bf0a`, 22:05–23:17).
- **User:** "Approve Decision 1." P15 is split by T-A's capture verdict into class A (in place) and class B (STEP_REQUIRED). Class B is not to be counted "as E1b passes merely because the current in-place controller happens to catch them".
- **Two evidence-based corrections**, pre-registered before the run:
  - T-A revision 1 had double-counted the timing margin;
  - the RATE limit now scales by × max(1, 240/hz).
- **E1b CLOSED** with PSTAR4: class A 19/19 recovered without changing the foothold, and 0 falls. The 4 STEP_REQUIRED cases (all on V2-165-62) became E2 obligations.
- **Foot-yaw** was adopted independently as PSTARY. The E2 design and criteria were frozen for review, not implemented.

**E2 overnight** (`5eb1ccb` → `d202cac`, 13 commits, 00:15–05:26 on 6 Oct).
- **E2 v2** (`5eb1ccb`): an explicit CERTIFIED_ONE_STEP / NO_CERTIFIED_ONE_STEP planner verdict, and reach taken from Touchline's own IK certifier.
- **User:** "Approve E2 v2 architecture and frozen criteria. Authorize implementation and physical E2 execution", and "The planning certificates are predictions only."
- **PSTAR5** (`41a5cc8`): the planning gate PG-1 certifies 0 of 32 steps (clearance 3.0/3.2 mm against 5 mm).
- **A1 + B1** (`b2dde1c`): PG-1 still fails, now at φ 0.80.
- **D1** (`c9b9485` → `25b185c`): the acceleration feed-forward is exact. But the servo battery does not validate, because of a ~30 % shortfall in the velocity feed-forward.
- **Root cause** (`9570ccc`): `lcVff`'s one-step IK rate is damped by μ0 = 0.01, which is close to the smallest Gauss–Newton eigenvalue, so vertical rates come out at ×0.31–0.34.
- **Under the overnight autonomous instruction** (`6c30e64` → `9578ccf`):
  - `vffRate "sr"` (damping on the commanded-target term only) cuts tracking error from 5.6 to 3.6–4.1 mm RMS;
  - `srAll` was **refuted** (τ0 up to 11,553 N·m);
  - a handoff fix cut the liftoff torque step from 9.6 to 0.8 N·m;
  - the PSTAR4S regressions pass.
- **S2 servo re-validation fails** (V-1/V-2/V-4), with RMS 1.3–2.0 mm. PG-1 is 0/32, because the frozen reference is 5.40 mm above the turf at φ 0.80. `E2_OVERNIGHT_REPORT.md`: "**BLOCKED ON PLANNING DECISION**" (`d202cac`).

**Corrections and process errors.**
- **Causes revised:** the R3 cause (TR-1a), the TR-1 / TR-2 causes (TR-3), and the single-cause E1b-7 diagnosis in E1-4 (`19dbc73`).
- **Errata:** in the harnesses and tooling (E1-3, E1b-e1, E1bF-e1…e3), E1bF-e4 (hip z is abduction), and a count corrected from 11/16 to 10/16.
- **The mid-line `//` defect, for the third time in two days:** `e1bta_checks.mjs`, fixed in `610aad0`.
- **A report omission** is admitted in E2-3: "my previous report omitted that the descent end failed too".

**Adopted vs not adopted.**
- **Adopted:** PSTAR (P\*), PSTAR4 (which closed E1b), PSTARY (foot-yaw), and `vffRate "sr"` for E2 (E2-6).
- **Not adopted:** C, C2, PSTAR2, PSTAR3, `srAll` and `vffPassive`.
- **Implemented default-off, never officially run:** PSTAR5 / 5B / 5C.
- **Left to the user:** whether PSTAR4S replaces PSTAR4 as the E1 baseline.

**Parallel: standings, knockouts, training ground, first development design** ([Chat extraction] C10 – C13; [Local] `~/Downloads`, workspaces `2026-10-05/new-chat-3` and `new-chat-5`; screenshots).
- **Standings, reported with file evidence** (successive revisions, not one final specification):
  - `Touchline_Playable_Fixed.html` (reported 12:53; `~/Downloads` 12:59): Liverpool row alignment and 20 crest corrections, Chelsea named; Chromium at eight widths reported.
  - The metal treatment iterated: a reported 18 px first frame; the user's 2 – 4 px compound directional bevel (no neon or nested outlines); then one stronger strip.
  - `…_Metallic.html` (reported 13:52, a 7 px foil band; `~/Downloads` 13:53).
  - `…_Hierarchy.html` (reported 14:32; `~/Downloads` 14:34): header chevrons removed, headings integrated; eight viewport configurations reported.
  - `…_Six_Teams.html` (reported 21:35; workspace 21:34): density and centred dividers; code checks only.
- **File-time record:** thirteen `Touchline_Playable_*.html` iterations, 12:59 → 02:40 (6 Oct): Fixed, Refined, Metallic, Hierarchy; glass standings, Carousel, Restored header; All competitions, Training ground, Schedule; Knockout rounds, Minimal knockouts.
- **Knockouts, designed then reported** (02:00 – 02:33, 6 Oct):
  - fixed outer panel size across rounds; explicit SEMI-FINALS / FINAL labels; larger final crests without a Chelsea regression;
  - `…_Minimal_Knockouts.html` reported 02:05 (workspace 02:32, `~/Downloads` 02:40); appearance unverified;
  - FA Cup and Carabao Cup from the third round to the final, with their own colours and penalties; 44 crest links checked (reported 02:33). Draws illustrative, crests online;
  - **Uncertain:** whether the requested eliminated-team dimming on a drawn final leg is in the final bytes.
- **Training ground, reported and located** (23:25): the Harbour Training Centre prototype.
  - Main and second pitches, goalkeeper / technical areas, performance centre, portable goals, shelters, fencing, floodlights, landscaping.
  - `Touchline_Training_Ground.html`, `…_Research.html`, `…_Source.zip` and `…_Preview.png` are in the workspace (23:23 – 23:24).
  - Canvas checks were reported; browser controls unverified. Environment / UI work, not live-game integration.
- **Designed** (03:01 – 03:12, 6 Oct):
  - age removed from positive development; a separate decline system;
  - small, nonnegative exposure growth separated from a larger, bidirectional performance effect;
  - user target end ratings for a 70 OVR / 85 POT player (e.g. Medium training: 71 / 72 / 73 after 0 / 60 / 90 minutes);
  - an early assistant proposal used 52 matches / 190 sessions.
- **Screenshots:** the metallic and glass standings, the Champions League knockout view and the schedule are archived in [`chronicle_screens/2026-10-05_manager_ui/`](../review_artifacts/chronicle_screens/2026-10-05_manager_ui/).
- **`~/Downloads/Touchline_Reuse_Blueprint.md`** with `Touchline_Reuse_Source_Register.json` (13:43): "independent research, not an implementation", ranking 31 reusable locomotion sources (PyPnC, BLF, IHMC first).
  - These are the three references the day's reuse-first instruction names.
  - Its author is not recorded (Uncertain).
- **Workstream end of day:** focused HTML revisions and two cup extensions are reported, with mixed verification; a separate training-ground prototype exists. The four-way development split is decided but not yet packaged.

**End-of-day state.** E1a passed and E1b closed. E2 is implemented default-off but has had no official run: PG-1 certifies 0/32 commanded steps under the frozen 25 mm apex. Decisions requested: A, the apex and window (recommendation 30 mm); B, the E2-5 impact metric; C, the servo-battery criteria; D, PSTAR4S as the E1 baseline.

---

## Tuesday 6 October 2026 — Apex 30 mm, A + B, and the first touchdown coordinators

**Evidence:** [FC-Sim Git] 20 commits on `prototype/physical-character-v2`, `ac4674e` (12:19) → `6606ad5` (04:35, 7 Oct). [Doc] `review_artifacts/physical_character_v2/DECISIONS.md` E2-9 … E2-15; in `e2/`: `E2_PREREG_AMENDMENT_A30`, `E2_A30_PG1_RESULTS`, `SWING_SERVO_VALIDATION_V2_PROPOSAL` / `_PREREG` / `_RESULTS`, `TOUCHDOWN_A30_ANALYSIS_PLAN`, `VERTICAL_RESIDUAL_DIAGNOSIS`, `AB_VALIDATION_*`, `AB2_VALIDATION_*`, `TOUCHDOWN_COORDINATOR_DESIGN_STOP`, `EXECUTION_FEASIBILITY`, `FB1A_TR1B_*`, `TD2_DESIGN_STUDY`, `TD2_PREREG` / `_RESULTS`, `OVERNIGHT_TD2_MORNING_REPORT`. Seven user decisions saved verbatim in `sources/` (six dated 6 Oct, one dated 7 Oct).

**Starting state.** The overnight run had ended at 05:26 (`d202cac`, 5 Oct entry) "BLOCKED ON PLANNING DECISION": the S2 servo re-validation did not validate and PG-1 was 0 / 32, because the frozen 25 mm swing passed only 5.40 mm above the turf at φ 0.80 against a 5 mm clearance requirement.

**Method, all day.** Each step followed the same pattern: a user decision saved verbatim; a preregistration committed before any code ("freeze step 1"); a default-off implementation, harness and evaluator committed before any battery run ("freeze step 2"); the full battery; a results document and a DECISIONS entry; a stop at any failure. Default paths were checked bit-identical at every stage (KV0, reference hashes, suite 58 / 58).

**Apex 30 mm and PG-1** (`ac4674e`, `eaddffd`).
- User: "Approve A1: revise the nominal E2 swing apex from 25 mm to 30 mm" … "Do not continue increasing apex height." Recorded as the versioned trajectory `A30`; T 0.6 s, the 50 % knot and every threshold unchanged.
- The amendment documented the measured tracking uncertainty (0.75 mm worst at φ 0.75 – 0.80) and a clearance budget of 1.60 mm at φ 0.8 (0.40 mm at 25 mm).
- **PG-1: 0 / 32.** The gate configuration refused all 32 decisions because no validated tracked allowance existed. Envelope margin 3.41 – 3.62 mm; only an offline φ-resolved check would certify (5.87 mm, margin 0.87). The 30 mm swing is path-certified for every body: "the gate is servo validation".
- Touchdown analysis on the old 25 mm data: the instantaneous peak scales with the solver step (480 / 180 Hz ratio up to 2.30); a 10 ms window mean does not (≤ 0.95). Recommended, **not adopted**. A new servo battery, SV-2, was proposed.

**SV-2 swing-servo validation** (frozen `7bde433` 15:53 → results `76f81d0` 16:29).
- The user approved it with per-0.05-φ-bin allowances drawn from independent runs; trajectories a body cannot reach are to be rejected by the reachability check, not allowed to inflate the allowance.
- Frozen: 876 runs, four separate verdicts. The reachability pre-check rejected C-L11 for 7 bodies. The touchdown analysis plan (`9a538a7`) and the PG-1 runner (`a7def97`) were committed before the SV-2 evaluation was read.
- **DOES NOT VALIDATE.** The representative set passes everything; tracking RMS 1.3 – 2.3 mm. Fails: T-1 (C-F7 0.26, C-L5 0.28, limit ≤ 0.25; residual vertical and D1-insensitive); I-2 (52 runs, foot-flat transients 6 – 21 ms after contact); I-3 / I-4 (C-L11 on V2-long-legs, a servo runaway near the reach boundary: "certified reachable but not executable"); I-6 (84 runs, contact loss after long fast landings).
- Allowance computed for the record, NOT VALID, not entered. With it, a what-if PG-1 is still 0 / 32: 4.977 mm at φ 0.80, short by 0.023 mm. PG-1 and the 30 mm touchdown matrix were not run.

**Vertical-residual diagnosis** (`84a6922`, `4afccb7`). The user asked for a diagnosis only ("Do not change behaviour yet") and said "do not round the 4.977 mm result into a pass".
- Default-off diagnostic hooks (including removing the turf), then 884 matched runs.
- **M1, floating-base pelvis coupling:** the velocity feed-forward's pelvis-motion term keeps damping μ0, so the leg drags the foot with the pelvis. It accounts for the whole T-1 vertical residual. **M2, uncompensated passive ankle damping:** 0.99° tilt predicted vs 0.94° measured.
- With both causes removed, T-1 C-F7 0.259 → 0.009 and C-L5 0.275 → 0.088, so T-1 was kept as frozen.
- Contact speed ∝ δ^0.62 (r 0.90, 315 touchdowns). Most of the 10 ms "impact" is premature load: 22.3 → 10.2 % BW with the pelvis term kept through contact.
- Proposed, not implemented: (A) singularity-robust damping on the pelvis term during flight; (B) passive-damping feed-forward.

**A + B, then AB2** (`1a65417`, `b735b95`, `3c46742`, `85758ab`).
- The user approved A and B, a minimal touchdown coordinator and an execution-feasibility check, in an eight-step order.
- A (`vffPelvisAir`) and B (`vffPassiveRef`) were built default-off, with a recording-only torque ledger.
- **Factorial battery, 1,728 runs: DOES NOT VALIDATE**, stopped at stage 2.
  - T-1 passes every id under AB, for the predicted reason (C-1 … C-3 pass); tilt −90 %; worst binding-window deviation −1.60 → −0.60 mm.
  - FAIL AB-4a / 4b: 7 runs (V2-198-92 R-L) exceed the commanded-torque continuity limit by 0.7 – 6 % within −2 … +5 ticks of contact.
  - FAIL AB-7: R-L β_y falls 47 % against the 50 % required.
- User: "preserve the completed A+B battery exactly as a failed preregistered validation" and "Do not accelerate A's early-airborne ramp merely to turn the measured 47% beta reduction into the old 50% threshold."
- The **AB2** amendment split ownership by lifecycle: A is judged from the first genuinely airborne tick, and contact-transition continuity moves to the coordinator ("not exempted").
- **AB2 VALIDATES** (1,728 / 1,728, bit-identical to the AB records; airborne β_y −56 … −74 %). A + B are qualified as swing mechanisms (PSTAR5CHAB). The AB battery stays FAIL.

**The first touchdown coordinator, stopped at design** (`bc3d558`, 22:56).
- A default-off draft (`ctrl/v2_touchdown.js`) was checked on smoke runs only. Within T 0.6 s, the apex at T / 2 and the validated A + B envelope, no C2 final approach could finish tangential motion before the contact band, keep normal approach speed low (best ≈ 60 mm/s) **and** stay inside the jerk envelope. It was not preregistered, validated or adopted.
- **Execution-feasibility certifier** (`certifyExecution` plus closed-loop replay, `tools/exec_qualify.mjs`): 240 Hz sweep 144 / 160 qualified, no false rejection. All 16 rejections are C-L11, including the V2-long-legs counterexample. Not yet wired into `plan()`.

**1A / 1B, after midnight** (`c4c7061`, `0150ce8`, `e658953`).
- After a research review, the user ordered two controller fixes before any touchdown timing choice: floating-base angular compensation (1A) and a command-level near-contact transition (1B).
- Freeze amendment A1 replaced 1A-0's tolerance with a like-for-like control after the raw check failed. The cause was D1's own 1 mm finite-difference step, and the change was disclosed as made after seeing the output. A3 predicted that 1B would fail.
- **2,160 runs. 1A DOES NOT VALIDATE** on one item: foot angular speed at the first touching tick 0.464 vs 0.363 rad/s on set H, an impact-phase sampling effect. **1B DOES NOT VALIDATE**: transition-violating runs R 6 → 10, H 8 → 42 (max commanded 64.4 N·m); 6 new rebounds; slip up to 10.4 mm.
- User (committed 02:53): "do not adopt 1A, reject 1B, and proceed from the qualified AB baseline."

**Overnight runway: TD2** (`3bb6752`, `d285f10`, `20d7837`, `6606ad5`).
- The user handed over an autonomous runway: "The goal overnight is maximum legitimate progress, not a forced E2 pass." **Reconstructed:** the user was away from about 02:53 until the next decision, committed at 12:33.
- Offline design study: C0 (the AB baseline), C1 (corridor), C5 (clock) and C6 (creep) were rejected. **C2 was selected:** the validated swing to a raised band top, a tangential-settling dwell, then a bounded rest-to-rest search until measured contact.
- **Discovery:** AB's load peak is not the first impact. It is a flat-foot slap about 20 ms after an edge-first contact.
- At freeze step 2, amendments A1 – A5 re-derived the parameters from a turf-off qualification (h_B 2.05 → 2.80 mm, D_max 2.70 mm, τ_s 0.205 s, τ_c 0.1459 s, plus τ_d 0.085 s). They also replaced the preregistered escalation, which turned out to be a target step (9.15 × the E1a-7 ratio), with an E2-style re-target.
- **Battery, 1,824 runs (03:34 – 04:29): DOES NOT VALIDATE.**
  - Nominal + late, 864 runs, clean: 0 E1a-7 violations (AB 14); impact ≤ 11.9 % BW (AB ≤ 60 %, 261 runs > 25 %); horizontal contact speed ≤ 34 mm/s; 0 rebounds.
  - Fails on the early condition, which was bit-identical to AB (predicted).
  - Fails on the beyond condition: the E2-style escalation drops ≈ 12.8 mm in ≈ 0.1 s, with 28 / 96 runs violating. A counterfactual TD2-step escalation was 18 / 18 clean.
  - Fails on TD-10, touchdown-time rate stability: up to 18.8 ms vs 10 ms.
- Stopped before SV-2 re-qualification, PG-1 and E2. Morning report at 04:35.

**Corrections and process errors** (all recorded in the documents).
- `ac4674e`: the overnight report's 0.75 mm window-restricted allowance was wrong; it is 2.24 mm.
- `9a538a7`: the 25 mm touchdown analysis in `eaddffd` used integer-tick windows and R-leg-only groups, and wrongly claimed "≥ 2 ticks". It was recomputed with exact windows. Its 10 ms rationale, first "recalled, not sourced", was given sources (Blackburn 2016; Gruber 2017).
- TD2, from the morning report §7:
  - a wrong apex-knot rule in the design kinematics;
  - the preregistered band was inadequate for the new region ("I should have run it before the first preregistration");
  - the early condition "was defined so that it equals the AB baseline";
  - TD-10 copied a provisional 10 ms;
  - the harness was edited mid-qualification;
  - a job script had an unexported variable;
  - the web-search budget ran out (200 / 200).

**Adopted / not adopted.** Adopted: the A30 trajectory; A + B as qualified swing mechanisms (AB2). Not adopted: the 10 ms impact formulation (E2-5 unchanged), the SV-2 allowance, `vffPassive` (stays diagnostic), the coordinator draft, 1A. Rejected: 1B. Failed: TD2.

**Parallel: development model (exposure, aging, Fitness), calendar, performance calibration** ([Chat extraction] C14 – C18; [Local] workspace `2026-10-05/new-chat-5/`).
- **Designed — exposure** (12:49):
  - the reference season is 50 matches + 190 sessions (replacing 52);
  - per-session credits Light 0.00125, Medium 0.005, Intense 0.0175; per-match 0.00187 (15 min) … 0.020 (60) … 0.040 (90);
  - exposure falls towards zero near potential: POT gap 1 → 0.2, 6 → 2.0, 11+ → ≈ 3.0 under Medium + 90 min.

  These are targets, not a recovered factor table.
- **Reported and located** (16:27): `TOUCHLINE_Exposure_Development_Package.zip` (spec, JSON, JS).
  - The attachment is 16:32, 6,050 bytes, SHA-256 `6e14f8de…`; the three files are also in `schedule-calendar/development/`.
  - Not executed or adopted into the simulator here.
- **Designed, revised repeatedly — aging:**
  - wide decline from 27, with an early 4.0 annual cap (16:57), later superseded: striker 4.5 at 40, and a 41+ cliff of 5 / 7 / 9 / 12 / 15;
  - the midfielder table "locked" at 21:08 was revised at 21:29;
  - the final interpolation, goalkeeper law and age convention are not established from the chat. **The early 4.0 cap is not the final rule.**
- **Designed — Fitness** (18:48 – 19:01):
  - bypasses POT suppression and gives role-specific athletic gains directly (halved annual packages for 190 Medium sessions; e.g. wide: Sprint 2, Stamina 2.5, Balance 2);
  - no generic exposure credit;
  - Normal is locked; Light / Intense are provisional.
- **Reported and located** (22:04): `TOUCHLINE_Aging_Fitness_v1_2026-10-06.zip`.
  - The attachment is 22:12, 12,586 bytes, SHA-256 `ab7eee6f…`; the spec, config and JS are also in `schedule-calendar/aging-fitness/`.
  - The chat recorded the name with a hyphen. Contents were not executed here.
  - [Local, read 8 Oct; not executed] Its config (v1.0) has decline tables for six outfield groups and none for goalkeepers, striker 4.5 at 40, and the universal 41+ cliff. Charted in the portfolio package (Stage 28).
- **Designed and reported — calendar:**
  - session time / load replaced by development and stamina (Rest +25, Light +15, Normal +5, Intense −10 points);
  - LOW / STANDARD / HIGH with proportional 7 % / 29 % / 100 % meters, instead of equal 1 / 2 / 3 bars;
  - advance-to-matchday simulates the intervening games and leaves the selected match unplayed.
  - `Touchline_Playable_Calendar.html` was reported with meters, Fitness and season-end aging, 18 logic checks (22:17). Then Set Pieces (role-specific, POT-suppressed, Jumping excluded), 19 checks (22:32).
  - One 8-second preview timer replaced the 3-second rotation; a 45 % → 70 % Rest demonstration state. No browser visual check was reported.
- **Incomplete — performance calibration:**
  - the +0.03-per-OVR universal proposal gave way to league-specific linear / bucketed expectations (EPL 75 → 6.0, 85 → 7.0), benchmarked on G+A/90 with sample confidence;
  - the user's last verdict: wingers close, strikers too generous, CAM much too generous;
  - the latest replacement curves (01:32, 7 Oct) are proposals; no acceptance or implementation is recovered.
- **Screenshot** (added 8 Oct): the calendar's training panel (23:10: focus, intensity, development rate, stamina), in [`chronicle_screens/2026-10-06_manager_ui/`](../review_artifacts/chronicle_screens/2026-10-06_manager_ui/).
- **Workstream end of day:**
  - the exposure and aging / Fitness packages are delivered (files located), and the calendar prototype has reported logic checks;
  - Fitness Light / Intense and the performance benchmark are provisional;
  - nothing is adopted into the authoritative simulator.

**End-of-day state.** The qualified swing baseline is PSTAR5CHAB. TD2 is clean inside its certified window but fails as preregistered. Three user decisions stand before the prerequisite gates: F1, the uncertified early-contact scope; F2, the escalation as a TD2 step; F3, the touchdown-time rate criterion. No PG-1 or official E2 run.

---

## Wednesday 7 October 2026 — TD2B, the D1 guard and DVG

**Evidence:** [FC-Sim Git] 11 commits on `prototype/physical-character-v2`, `b6fe3c0` (12:33) → `b54bb6a` (02:19, 8 Oct). [Doc] `DECISIONS.md` E2-16 … E2-20 (sections dated 2026-10-07 and 2026-10-08); in `e2/`: `TD2B_PREREG` / `_RESULTS`, `D1G_TD2C_PREREG`, `D1G_RESULTS`, `DVG_PREREG`, `DVG_RESULTS`. Three user decisions in `sources/` (two dated 7 Oct, one dated 8 Oct).

**TD2B, midday** (`b6fe3c0`, `2200cd9`, `4836364`).
- User: "Preserve the existing TD2 preregistration and 1,824-run result permanently as FAIL." Three decisions:
  - a certified possible-contact window derived before the battery;
  - an escalation that keeps the search's invariants ("Do not retain the current failed escalation that jumps the target ~13 mm in ~0.1 s");
  - physics-rate invariance in place of the ≤ 10 ms touchdown-time criterion.
- Preregistered:
  - the window from contact geometry, qualified tracking and terrain uncertainty (h_B 2.85 mm, D_max 2.75 mm, τ_s 0.21 s; in-window terrain ± 0.05 mm);
  - out-of-envelope early terrain at +10 mm ("earlyOOE"), judged by E2 §2a;
  - escalation as a continued bounded search (offline: reachable, 0.765 s, 24.5 mm/s);
  - no ground as an explicit failure.
- Freeze amendments: A1 fixed an evaluator false flag (the B-8 search floor had been applied to approach rows). A2 disclosed a smoke blow-up on earlyOOE V2-198-92 L 480 H-D (commanded Δτ0 ≈ 10¹⁴ N·m) and predicted that B-9 might fail. Criteria unchanged.
- **Battery, 2,688 runs (12:40 – 14:22): DOES NOT VALIDATE, on earlyOOE only.**
  - B-9 integrity fails in 170 runs (closure up to 477 J per tick); B-11 handling fails in 16 (12 aborts).
  - The other 2,256 runs (nominal, earlyC, lateC, beyond, no ground) are clean: 0 E1a-7 violations; impact ≤ 14.3 % BW; no rebounds; escalated contact ≈ 9 mm/s.
  - B-10 physics-rate invariance passes.
- **Mechanism:**
  1. a collision at ≈ 180 mm/s;
  2. E2's hand-back overshoots 3.3 – 4.3 mm into the turf;
  3. the IK target becomes unreachable;
  4. D1, evaluated at a singular configuration, commands up to 2 · 10¹⁸ N·m.

  Counterfactual: no D1 at unreachable targets removes every Σ+ failure, abort and fall (24 / 24). The documents record this as "a pre-existing controller robustness defect".

**D1 guard (D1G v1), evening** (`8e0cf07` 22:56, `19eb4d5`, `20e782d` 23:56).
- User: approve the guard as a versioned correction ("Do not implement this merely as a special case for the +10 mm obstacle"). Out-of-window terrain becomes an unexpected-obstacle event: "Do not require 'no abort or fall' for an arbitrary unexpected obstacle."
- Preregistered:
  - D1 is valid only when the IK target is reached, well-conditioned and finite, with a continuous fade / ramp over 0.10 s;
  - validation DG-0 … DG-7;
  - TD2C = TD2B + D1G, with event classes TOUCHDOWN / LATE_TOUCHDOWN / UNEXPECTED_OBSTACLE / TOUCHDOWN_FAILED and obstacles at +5 / +10 / +20 mm.
- Amendment A1 added V4, the certifier's torque feasibility, after a smoke run showed that V1 – V3 let a "valid" D1 reach ≈ 5,000 N·m before the guard engaged. The amendment discloses that the change came from an obstacle smoke run: "The user may judge otherwise."
- **Battery, 774 jobs (23:29 – 23:51): DOES NOT VALIDATE.**
  - The guard's own items pass: DG-0; DG-1 (c), 432 / 432 SV-2 runs bit-identical; DG-3 (b); DG-4; DG-6, guard step ≤ 6.2 N·m. Commands 10²⁰ – 10²¹ → ≤ 4.2 · 10³ N·m; Σ+ ≈ 2,500 → ≤ 0.9 J.
  - FAIL DG-2 (iv): 26 runs above B_cmd, caused by the servo's joint-rate feed-forward, not D1.
  - FAIL DG-5: 43 runs, rate-dependent (180 Hz 37, 240 Hz 6, 480 Hz 0) and consistent with the existing debt TD-15.
  - FAIL DG-3 (a): 4 of 4,056 samples, an IK mirror fold.
- Stop rule: TD2C not run, D1G not adopted.

**DVG (D1G v2), after midnight** (`72506d0`, `f9e0a11`, `6b7ab90`, `d3f9bcc`, `b54bb6a`).
- User (dated 8 Oct):
  - extend the validity rule to the joint-rate feed-forward;
  - treat the 180 Hz end-range energy as pre-existing debt "provided the existing evidence really establishes independence";
  - record the mirror fold as an IK-level finding;
  - "Do not redefine the failed historical command-bound criterion".
- Preregistered: one validity verdict and one slew-limited fade weight per leg, covering every IK-derived feed-forward (D1, joint rate, B's reference rate); qualification CQ-0 … CQ-6.
  - The hold-phase energy persists with no IK feed-forward at all, so it is recorded as TD-15-consistent and gates any later certification of that regime.
  - **New debt TD-17:** bounded-IK branch selection at a soft-bound fold.
- **Erratum E1** (`d3f9bcc`): the first implementation dropped a held D1 in one tick when the target ended mid-fade (162 / 18 per-axis law violations, found by the smoke of the prepared TD2C amendment). The first CQ run on `6b7ab90` was **aborted unevaluated** at 01:05 (73 / 1,426 jobs). Set CQ-6x was added (the commanded target released while the guard is engaged).
- **Battery, 1,522 jobs on `d3f9bcc` (01:13 – 02:15): DOES NOT VALIDATE.**
  - Passes:
    - identity;
    - AB 432 / 432 and E1a / E1b 38 / 38 bit-identical;
    - reach stress: finite, 0 over-capacity, joint-rate commands ≤ 0.35 × the force–velocity limit;
    - L / R pairs, determinism;
    - energy: 24 failures, all attributed to TD-15;
    - guard law: step ≤ 0.66 × the bound.
  - FAIL CQ-1b: on the out-of-envelope SV-2 run C-L11, V2-long-legs, 180 Hz, I-4 saturation rises 4.26 → 5.17 % (one knee axis, 33 ms, during the fade). On the same run I-2, I-3 and the blow-up are resolved.
  - FAIL CQ-3a: one mirror mismatch the classifier missed. The knee was 4.5 · 10⁻¹⁰ rad inside its soft bound, so the exact `atBound` flag was false: "a mechanical tool defect", not re-evaluated.

**Corrections and process errors.** TD2B A1 evaluator false flag; D1G's preregistered V1 – V3 rule, which would predictably have failed (V4 added, disclosed); DVG erratum E1 and the aborted first run; the CQ-3a classifier, whose test was stricter than the preregistered definition.

**Adopted / not adopted.** Nothing adopted. TD2, TD2B, D1G v1 and DVG are all FAIL; the TD2C battery has never run. TD-17 recorded; TD-15 reaffirmed as gating.

**Parallel: calendar and competition polish; the last colour request** ([Chat extraction] C19; [Local] workspace `2026-10-05/new-chat-5/`, `~/Downloads`; screenshots).
- **Reported** (13:06 – 14:21):
  - duplicate Prepare-match / debug notices removed; competition colours in the legend; out-of-month cells dimmed;
  - a compact, bold charcoal cutoff band;
  - the EPL header fade / charcoal table extended to FA and Carabao;
  - stamina colours and a custom emerald bolt.
- **Screenshots** 12:59 – 16:39 show the standings, the Champions League league-phase and knockout views, and the schedule with a training-day panel (focus, intensity, development and stamina). A selection is archived in [`chronicle_screens/2026-10-07_manager_ui/`](../review_artifacts/chronicle_screens/2026-10-07_manager_ui/).
- **The squad colour test** (`Touchline_Development_Colour_Test.html`, 22:33; screenshot 22:34) precedes the scoped correction below. The file is in `~/Downloads`, unchanged since 22:33; this corrects the entry's earlier "no longer in `~/Downloads`".
- **Designed, then reported** (22:47 → 22:49): a tightly scoped correction.
  - Use the supplied HTML only for the left Squad Management base; make the fitness icon and 100 % white; keep the gold stars; change nothing else.
  - The user-supplied reference build is in the workspace (`attachments/squad-summary-reference/`, 22:48).
- **Background:** almost-black green → grainy charcoal → the standings dark-glass background, the last accepted direction.
- **Requested** (23:07): light-green status text to a muted red distinct from the bolt, and competition names in their competition's colours.
  - The reply's body is not recovered (23:09).
  - **Reconstructed as implemented:** the final build `Touchline_Playable_Calendar.html` (workspace 23:09, `~/Downloads` 23:10, identical, SHA-256 `8021cf56…`) differs from the 22:48 reference by:
    - both panels in the standings dark-glass material;
    - per-competition label colours (UCL, FA Cup, Carabao);
    - only the fitness value and bolt white, with the stars untouched;
    - stamina-cost text in a muted rose beside the unchanged red bolt and bar.
  - **Uncertain:** whether "status text" meant exactly that element.
  - [Local, recaptured 8 Oct] Compared with the session's own pre-change snapshot (`outputs/before-impact-league-colours.html`, 23:09), the final build changes two things:
    - the stamina-cost value and "Bar consumed" go from light green to muted rose;
    - the Champions League label goes from lilac to blue.

    The image attached with the request (`attachments/impact-colours/reference-1.png`, 23:08) shows the stamina element. Portfolio Stage 29.
- **Workstream end of day:** the manager design is refined across standings, competitions, calendar and squad, and the final file is located. Model calibration (performance; Fitness Light / Intense) is still open.

**Publication housekeeping** (8 Oct, from about 02:40; inside this chronicle day by the 06:00 rule). [Session] The user: "Before doing any further physical-character/E2 work, perform repository publication and daily-archive housekeeping … Do not fabricate, backdate or rewrite commit timestamps".
- **Audit.**
  - 202 local physical-character commits, author dates 30 Sep 02:12 → 8 Oct 02:19.
  - Committer dates equal author dates, apart from one 13-second amend.
  - No secrets in the unpublished history.
- **Pushed unchanged to FC-Simulator** (no rewrite, no force), 170 of the 202 commits:
  - `prototype/physical-character-v1` = `11149df`, all 49 of V1's commits;
  - `prototype/physical-character-v2` through `9578ccf` (6 Oct 04:56).
  - It went up in batches of ≤ 0.4 GB, because 1.2 GB batches were disconnected by the server.
- **Held back, then repaired the same morning: 33 commits.**
  - They ran from the original `e519c8f` (6 Oct 05:26) through `bd4c56e` and `6e03afe`.
  - `e519c8f` had added `e2/evidence_smoke_H/runs_records_240_REF_165.tgz`: 105,822,358 bytes of generated evidence, above GitHub's 100 MiB per-file limit.
  - **User decision** (saved in `sources/2026-10-08_user_decision_publication_rewrite.md`): remove the archive from the unpublished history only. No Git LFS, and nothing published is to be rewritten.
  - **The repair.** The 33 commits were replayed one for one: same trees minus that one file, the same order, author and committer dates, original messages plus provenance trailers. They were then pushed as a normal fast-forward on `9578ccf`.
  - **Provenance:** `PUBLICATION_REWRITE_2026-10-08.md` / `.tsv` on the V2 branch map every old hash to its replacement, and references in the V2 documents now carry both (`old [published as new]`).
  - **The archive** is kept locally outside Git (SHA-256 `765df83e…`). It can be regenerated with `e2/scripts/run_smoke_matrix_H.sh` on `9578ccf`.
  - **Prevention:** an evidence-storage policy, a `.gitignore` rule for raw run-record archives, and a pre-commit size guard.
  - **In this chronicle, hashes from 6 Oct 05:26 onward are the published ones.**
- **Committed and pushed:** `environment/weather-snow-surface-v1` (`9468ddd`), the 28 Sep snow work.
- **Preserved:** `e5ea11f` moves the unadopted TD2C amendment A5 and the E2 integration draft out of a temporary scratch directory into `e2/drafts/`, not applied.
- **Left [Local]** under the user's earlier instructions or the media policy:
  - the slide-tackle passes (`rear-contact-fall`);
  - Reference Tackle V1 (`reference-tackle`);
  - V1's untracked review stills, logs and dumps (510 files, ≈ 0.95 GB);
  - the ≈ 4 GB of goalkeeper review folders.
- **This chronicle** was caught up from 29 Sep. Eleven screenshots were archived in [`review_artifacts/chronicle_screens/`](../review_artifacts/chronicle_screens/) (with [`MANIFEST.tsv`](../review_artifacts/chronicle_screens/MANIFEST.tsv): original bytes and SHA-256), and the daily publication rule was added (Appendix F, rule 6).

**End-of-day state.** DVG stopped before adoption at `b54bb6a`. Decisions pending (`DVG_RESULTS.md` §3; none taken):
1. CQ-1b: judge the out-of-envelope run by "no newly failing item" or by no material worsening. Options: (a) accept as non-material; (b) investigate saturation during the fade; (c) other.
2. The CQ-3a erratum: treat a coordinate within 10⁻⁶ rad of its soft bound as on it, then re-run the 24 mirror probes.
3. If both resolve: adopt DVG → the prepared TD2C amendment → the frozen TD2C battery → E2 integration (the draft is preserved, not applied, in `e2/drafts/`, `e5ea11f`) → SV-2 re-qualification → PG-1 → official E2.

The recommendation is 1 (a) and 2. No PG-1 or official E2 has run.

---

# Part V — The present

## Current state of the Touchline project

**The playable software** (`touchline-current`, `e2c98ec`, on FC-Simulator):
- **Engine and app.**
  - FC Simulator v0.7 (cal11 brain) with the Hybrid-C continuous body live in the server: ball transport, occupancy, persistent possession, solved dribbling, responsive locomotion.
  - The Touchline FastAPI manager app; watched and instant matches are byte-identical.
- **The playtest harness** (`sandbox/visual/match.html`):
  - the live match view (sprite players) and the single-player playtest;
  - the **outfield runtime** (`?ofPlay=1`) with six real characters (Cucurella, Gabriel, Osimhen, Szoboszlai, Vinícius, James): locomotion, dribbling with real boot touches, five shot families, passing and receiving, defending (jockey, standing tackle, the researched far-leg slide), and tackled-player balance, stumble and fall with reciprocal body interaction;
  - the **goalkeeper**: staged decision and reach, continuous attributes, gather/catch, distribution; a sprite backend with 16 dive sequences and a skeletal 3D backend with the true-proportion Courtois; `?gkPlay=1`.
- **Environment.** Rail broadcast camera, pitch with mowing, stadium bowl and crowd, rigid goal frame and strand net, sphere ball art and rain.
- **Baselines.** Frozen tags `baseline/*` on GitHub.

**The physical character** (`prototype/physical-character-v2`, head `21b6f06` on GitHub; not part of the playable game):
- **The body.** A clean-sheet Jolt humanoid: 14 bodies, 35 rotational DOF, finite actuators at exact capacity, a 10-piece boot on a `PlaneShape` turf; validated at 180, 240 and 480 Hz.
- **Gates.**
  - V2-G0 to G3 passed; G3 under criteria v3.3, with J2a as the normative symmetry gate.
  - E1a (lift, hover, replace) passed; E1b closed under PSTAR4.
  - The qualified swing baseline is PSTAR5CHAB.
- **E2 (one physical step) has not passed.** TD2, TD2B, the D1 guard v1 and DVG all DO NOT VALIDATE as preregistered.
  - The decisions in `e2/DVG_RESULTS.md` §3 are pending: CQ-1b judgement, the CQ-3a erratum, then TD2C → E2 integration → SV-2 re-qualification → PG-1 → official E2.
  - Debts TD-15 (180 Hz end-range integration) and TD-17 (bounded-IK fold) gate later certification.
- **V1** (`prototype/physical-character-v1` = `11149df`) is frozen as the research record: Gates A–D, C3–C5, D6 and the G2b walking studies, with no robust walk.

**Touchline material that exists but is *not* in `touchline-current`** (nothing here should be assumed integrated):
- **Snow weather and weather-dependent ball physics** (28 Sep, the user's Codex session): committed on 8 Oct on its own branch, `environment/weather-snow-surface-v1` (`9468ddd`, GitHub). Not merged.
- **The 28 – 29 Sep slide-tackle passes** ([Local], uncommitted by the user's instruction):
  - rear-contact friction and fall direction, and Follow-through V1 and V2, all in worktree `rear-contact-fall`;
  - Reference Tackle V1, in worktree `reference-tackle`, with its third-party reference clip on the Desktop.
- **The manager interface, ratings workbooks and development model** ([Local] + [Chat extraction], 1 – 7 Oct). None is in Git, and none is integrated. Performance calibration, Fitness Light / Intense and the Araújo edits are pending (Appendix G).
  - **HTML prototypes:** cards, squad, pack opening, finance / staff, the broad mockup, standings, knockouts, training ground, calendar.
  - **Workbooks:** flank rules; the 4 Oct ranked workbook.
  - **Design packages:** exposure; aging / Fitness.
  - **Location:** the user's Codex workspace (`~/Documents/Codex/2026-10-0X/`) and `~/Downloads`.
- **The portfolio source package** ([Local], `~/Downloads/TOUCHLINE_PORTFOLIO_SOURCE_ASSETS/`, 28 Sep) and the Astra transfer zip. It was extended on 8 Oct with stages 23 – 29 for the 1 – 7 Oct work (Appendix G).
- **One generated evidence archive** (`runs_records_240_REF_165.tgz`, 105.8 MB), removed from the V2 history for publication on 8 Oct, is kept locally outside Git (7 Oct entry).
- **The Astra character roster** ([Astra], `~/Downloads/TOUCHLINE_ASTRA_MIGRATION_PACKAGE`): 20 individually built players (19 plus Courtois), including the 3D Salah; the B back-print lock; the unfinished player-art workshop, whose source was never recovered. Only Courtois and the six later outfield players reached the runtime.
- **The Astra V6 character-renderer repository:** its commit history (`57bddf9` … `5e89a7a`) is known only as labels; no object database was recovered.
- **The Astra kick-system design** ([Local] `review_artifacts/astra_kick_system_handoff/`): handed off on 19 Sep. The design that came back is not recorded here, and Shooting V1 was instead recovered from the existing sprite kick families.
- **The chat-era simulator lineage and first website**: the v0.1–v0.6 packages and their reference matches, `touchline(1).html`, the screenshots and the 18 Aug handoff. They are held as recovered originals in `review_artifacts/history_primary_2026-08-18/TOUCHLINE_2026-08-18_PRIMARY_ARTIFACTS.zip`, outside Git. Only v0.7 (as calibrated) and `touchline(2).html`'s descendant are in the repository.
- **Pre-repository release history** ([Local] `~/TouchlineRC1` with backups, logs and the season database; the `TouchlineRC2–8-staging` folders).
- **About 4 GB of goalkeeper and sprite review folders** that were never committed ([Local] `review_artifacts/`), plus the manager-app screenshots of 14 Sep.
- **The TouchlineSimulator repository:** a stale subset (`main` = `a0cd26d`, `checkpoint0` = `2a5ebfc`). It holds nothing that FC-Simulator lacks.
- **Coach MVP** (pull request #1 on FC-Simulator, another contributor): manager-layer work based on `main`, disjoint from and not merged into `touchline-current`.

## Major open problems

- **Two authorities.**
  - Live matches run the Python engine and body.
  - The playtest's physical stack, including the goalkeeper, dribbling, shooting, passing, defending and contact physics, runs in JavaScript (`match.js`, `pt_*.js`).
  - Reconciling the two is the largest open architectural task.
- **Contact physics.** No limb-level collision in the playable game: residual limb brushes and leg–leg tangles in slide pile-ups; arms posed rather than collided. The game has no general rigid-body system, by design. The physical-character branches (Part IV) are the attempt to change that, and are not integrated.
- **Physical character.**
  - E2 touchdown is blocked on the DVG decisions.
  - The 180 Hz end-range energy (TD-15) and the IK soft-bound fold (TD-17) are open.
  - Twenty-two characters cost 20 – 26 ms per 60 Hz frame (G1b, V1), so a physics-scaling plan is needed.
  - No robust walk exists yet (V1).
- **Sprint dribbling** still loses the ball (not hidden). The Dribbling V1 boot-plan lateral mirror is recorded and unfixed.
- **Goalkeeper presentation.**
  - Two backends coexist, with families still review-only.
  - Audits flagged set-depth geometry at close range and the X3 curl's size (about 4–5× a measured free kick).
- **Characters.** Most of the Astra roster, back-print B and the workshop are outside the runtime, and the workshop source is missing.
- **Referee.** Foul facts are recorded but no calls are made.
- **Repository weight.** About 1.5 GB of history before 8 Oct. The physical-character branches add about 2.6 GB of objects (uncompressed), mostly battery evidence and review media.

## Architecture at a glance

```
   Touchline app (web/touchline.html)                    Playtest harness (sandbox/visual/match.html)
          │ REST (server.py, store.py, bridge.py)                 │ keyboard / demo drivers (inputs only)
          ▼                                                        ▼
   FC Simulator v0.7 brain (cal11) ── Hybrid-C seam ──►   JS authoritative playtest simulation
   decides WHAT to attempt              continuous 60 Hz     match.js   player law, ball, goal frame, net,
                                        body (world.py,                 keeper READ→COMMIT→SAVE, reach, contact
                                        continuous.py)       pt_squad.js squad play, passes, receptions
                                        resolves WHAT        pt_defend.js jockey / tackles / slide contact
                                        HAPPENS              pt_react.js  contact, balance, fall, body interaction
          │ frames (read-only)                                    │ read-only
          ▼                                                        ▼
   PRESENTATION — never writes simulation state; every change gated ON/OFF-identical
     2D renderers (anim1–4, Aug) → perspective rail-camera renderer (Visual V1, Aug 27+)
     sprite backend: frozen PixelLab assets, manifests, contextual poses, dive sequences (Sep 4–14)
     skeletal backend (anim3d/, Sep 19+): ActionDescription → graph / motion library → authored base → IK
         → 23-bone skeleton → skinned characters (Courtois + six outfield, from the Astra track) → WebGL2
     environment: rail camera, pitch + mowing, stadium bowl, goal frame + strand net, ball art, rain
   VERIFICATION — digests, flags-off identity, keeper / outfield / dribble / shot / character / squad /
                  defending / slide gates, frozen baseline tags
```

---

## Appendix A — Cross-repository milestone map

An index to the narrative above, not a substitute for it.

| Date | Touchline milestone | Where | Commit / tag / artifact |
|---|---|---|---|
| 18 Aug 13:00 | Owner's requirement: attributes, not Overall; design locked layer by layer | Chat | first upload 20:00:09 UTC |
| 18 Aug 14:14–17:35 | Simulator v0.1 → v0.7 (16 → 22 → 34 → 46 → 53 tests) | Chat + Local | `fc_simulator_v0_1…v0_7.zip`; v0.7 is 47/53 byte-identical to `a0cd26d:simulator/` |
| 18 Aug ~19:07–20:27 | First Touchline website: `touchline(1).html` rejected, `touchline(2).html` (mock engine); integration contract; handoff | Chat | `touchline_fc_handoff_2026-08-18.zip` |
| 18 Aug 20:46–23:51 | Local integration begins (FastAPI + bridge), validation harness | Local | `README_TOUCHLINE.md`, `validation/*.py` |
| 19 Aug | v0.7-cal2 baseline (integration 22/22, parity PASS); cal2 → cal3 settled structure | Doc | `NOTES-possession-pass.md`, `SETTLED_STRUCTURE_REPORT.md` |
| 21 Aug | cal3 audited against a certified cal2 twin | Doc | `CAL3_POST_STRUCTURAL_AUDIT.md` |
| 22 Aug | cal4 pressing, cal5 player data v3; RC1 manifest, RC1.1 deployed; first live case; shot-choice cal6 rejected | Local / Doc | `RELEASE_RC1.md`, `~/TouchlineRC1`, `SHOT_CHOICE_CAL6_EXPERIMENT.md` |
| 23 Aug | Live-case loop: cal6–cal10, RC2–RC6 | Local / Doc | `app-rc2…rc6-backup`, cal6–cal10 reports |
| 24 Aug | First animated match renderer; RC7, RC8 (cal11 + anim2) | Local / Doc | `ANIMATED_RENDERER_MILESTONE1.md`, `RC7/RC8_DEPLOYMENT.md` |
| 25 Aug | OpenSWOS study; CFR body; Architecture B rejected, Hybrid-C accepted | Doc | `HYBRID_EMERGENT_EXECUTION_STUDY.md`, `CFR_MILESTONE_REPORT.md` |
| 26 Aug | Hybrid-C + cal12 integrated behind a flag, bit-identical | Doc | `PRODUCTION_INTEGRATION_GATE.md` |
| 27 Aug | Root checkpoint; TouchlineSimulator created; Visual V1 renderer, rail camera, live match preview | TL Git + FC-Sim Git | `a0cd26d` (tag `pre-visual-integration`), `9d3ed6a`, `9a4294c` |
| 30 Aug | Strand net + net physics; ball flight; continuous body live in the server | FC-Sim Git | `99d129f`, `6726be8`, `601ff74`, `8ee2748` |
| 31 Aug | Occupancy, possession, solved dribbling, locomotion; dribble and kick animation | FC-Sim Git | `65da1c7`, `d3858ef`, `cf7b81c`, `c9bde59`, `546c050`, `dcf4f3d` |
| 1 Sep | Power strike, target-solved curl, Goal Frame V1, Net V2 | FC-Sim Git | `28bb8d9`, `96c7b67`, `7d6e306`, `2ad37ae` |
| 2 Sep | Chunk invariance; TouchlineSimulator `checkpoint0` pushed | FC-Sim / TL Git | `2a5ebfc` |
| 2–3 Sep | Goalkeeper V1 stages 0–4 | FC-Sim Git + Local | `fbcd19c` |
| 4 Sep | Keeper integration, attributes, sprite keeper animation V1; FC-Simulator repository first pushed | FC-Sim Git | `4067542`, `132837f`, `80231f9`, `cad400a` (`visual-integration-v1`) |
| 5 Sep | Pose salvage; Pro contact poses | FC-Sim Git | `9b78308`, `9f44a6e`, `5084e55` |
| 6 Sep | First production dive animation; 16-sequence sprite library | FC-Sim Git | `b03176f`, `8f17f9b` |
| 7 Sep | Contact angle 60° CW; RIGHT V2 rebuild (review-only) | FC-Sim Git | `de8451b`, `27b60cd` |
| 10–14 Sep | New sprite-generator dive attempts (rejected); Salah sprite request | Later | memory export, 20 Sep handoff |
| 13 Sep | User's vertical high-save sprite live; last sprite-era state | FC-Sim Git | `92ddc33`, `ff3a89f` → tag `checkpoint/sprite-baseline-2026-09-19` |
| 14 Sep | Manager-app cinematic screenshots | Local | `review_artifacts/touchline_screens/` |
| 19 Sep | Astra kick handoff; architecture audit; skeletal WebGL2 keeper | FC-Sim Git + Local | `6e14899`, `ddad196`, `1852141`; `astra_kick_system_handoff/` |
| 20 Sep | V6 lifecycle accepted; motion library, foot save, catch; distribution v12; Astra V6 handoff | FC-Sim Git + Later | `1db60c0`, `bdfb222`, `6c96f7e`, `abe57bd`, `2c80700`; history handoff |
| 21–22 Sep | Astra character track: V6 character renderer → faces → I23 → S3 → L2 | Astra | `57bddf9` … `5e89a7a` (labels only); `Touchline_V6_Review.html` |
| 22 Sep | Distribution v13; scene package exported to Astra; roster and back print | FC-Sim Git + Astra | `856c605`; `TOUCHLINE_SCENE_ENVIRONMENT.zip`; `Touchline_Roster_Review.html` |
| 23 Sep | Courtois character integrated; Astra migration; outfield runtime, dribbling, shooting, six real characters | FC-Sim Git + Astra | `da3ea2f`, `d19de7e`, `c672fdf`, `5a77976`, `7cba78d`; migration package |
| 23–24 Sep | Shooting V1.1; Receiving + Passing V1 | FC-Sim Git | `23b7af4` (`baseline/outfield-runtime-v1`), `c8d0b5c` |
| 24 Sep | Receiving V1.1 | FC-Sim Git | `75d0d83` (`baseline/receiving-passing-v1.1`) |
| 25 Sep | Auto-pass demo, hand-off; Defending V1 | FC-Sim Git | `a30ddab` (`baseline/possession-v1.1-handoff`), `57c6539` |
| 26 Sep | Researched slide; tackled-player balance and fall | FC-Sim Git | `cdb0735`, `f5f6076` (`baseline/tackled-player-v1`) |
| 27 Sep | Slide contact geometry V1.2 and body interaction | FC-Sim Git | `a1357dd`, `d539e7a` (`baseline/slide-contact-v1.2`) |
| 25–28 Sep | Stadium / pitch / ball / rain presentation | Local → FC-Sim Git | `2ecefaf` |
| 28 Sep | `touchline-current` published | FC-Sim Git | `e2c98ec` |
| 28 Sep | Snow weather and weather-dependent ball surface (user's Codex session); committed 8 Oct on its own branch | Session → FC-Sim Git | `9468ddd` (`environment/weather-snow-surface-v1`) |
| 28 Sep | Portfolio source package (186 files) and Astra transfer zip | Local | `~/Downloads/TOUCHLINE_PORTFOLIO_SOURCE_ASSETS/` |
| 28–29 Sep | Slide tackle: rear-contact friction and fall direction (approved direction), Follow-through V1 | Local | worktree `rear-contact-fall` (uncommitted) |
| 29 Sep | Follow-through V2 set aside ("Do not commit V2"); Reference Tackle V1 | Local | worktrees `rear-contact-fall`, `reference-tackle` (uncommitted) |
| 29 Sep | Physical-character pivot; Jolt substrate approved; Gates A–C2 approved (uncommitted until 02:12) | FC-Sim Git | `4dbb5a2` |
| 29 Sep | V1.1 anatomy promoted as working foundation | FC-Sim Git | `e14354b` |
| 29 Sep | C3 corrective stepping (partial); C4 / C5 opt-in | FC-Sim Git | `1aa4f5e`, `cca491e`, `40ad2fe`, `b0a84d2` |
| 29 Sep | Gate D two-character slice; D6 physical slide | FC-Sim Git | `4cd5526`, `d79b5b3`, `f5503ba` |
| 29 Sep | Overnight report; locomotion proposal | FC-Sim Git | `1542819`, `4062764` |
| 30 Sep | Reboot preservation (tooling + handoff) | FC-Sim Git | `2e66018`, `6e13e9c` |
| 30 Sep | D6 diagnostic; friction-sensing fix | FC-Sim Git | `f18c8a7` |
| 30 Sep | G1 promoted (locomotion architecture parity) | FC-Sim Git | `772d0bd` |
| 30 Sep | G2a approved (yaw + in-place gait) | FC-Sim Git | `6f1ef85` |
| 1 Oct | Player-card tiers and photographic direction; flip / glimmer prototypes; first Liverpool batch | Chat extraction + Local | C01; workspace `touchline_card_back/`, `liverpool_card_batch/` |
| 2 Oct | Corrected 21-player cards; live-rating squad prototype (−5 per attribute out of position); flank workbook; pack opening | Chat extraction + Local | C02 – C04 |
| 3 Oct | Simplified finance / transfer model; staff screen; 11-profile ratings export (file not found) | Chat extraction + Local | C05 – C06 |
| 4 Oct | Re-ranked ratings workbook; broad 30-screen mockup (Figma partial); standings review begins | Chat extraction + Local | C07 – C09; `2026-27-ratings-updated-ranked-2026-10-04.xlsx` (local); `chronicle_screens/2026-10-04_manager_ui/` |
| 5 Oct | Standings / knockout refinements; FA and Carabao cups; training ground; development split decided | Chat extraction + Local | C10 – C13; `chronicle_screens/2026-10-05_manager_ui/` |
| 6 Oct | Exposure and aging / Fitness packages; calendar development and stamina; performance calibration open | Chat extraction + Local | C14 – C18; packages located locally |
| 7 Oct | Calendar / competition polish; final colour pass (final build located) | Chat extraction + Local | C19; `chronicle_screens/2026-10-07_manager_ui/` |

| 1 Oct | G2b Option 1 (landing fixed; walk not stable) | FC-Sim Git | `77966eb` |
| 1 Oct | Plant characterisation; Controller A vs B | FC-Sim Git | `9d4f7d9`, `e39f312` |
| 1 Oct | Foot-architecture gate (F0 kept) | FC-Sim Git | `89f970c` |
| 1 Oct | Speed regulation stop; unified controller stop | FC-Sim Git | `c7fd98b`, `fa55c9d` |
| 2 Oct | Physical Stepper consolidation; V1 walking research stops (transition-planned walking recommended, not built) | FC-Sim Git | `157ba0b`, `d133e1a` |
| 2 Oct | Physical Character V1 frozen; tag `checkpoint/physchar-v1-final-research` | FC-Sim Git | `11149df` |
| 2 Oct | V2 clean-sheet specification approved; branch `prototype/physical-character-v2` | FC-Sim Git | `5646d71` |
| 2 Oct | V2-G0 anatomy / static construction PASS (after C1 / C2) | FC-Sim Git | `9aacdf3`, `e84bca9` |
| 2 Oct | V2-G1 passive physics built; FAIL, decisions C1–C7; passive-drive defects G1-D1…D8 fixed | FC-Sim Git | `963cd9c`, `7632dbe`, `77815db` |
| 3 Oct | V2-G1 PASS (10-piece boot, 150 iterations); accepted after the heel-rise investigation | FC-Sim Git | `e531487`, `dd9026a`, `2108c15` |
| 3 Oct | V2-G2 active standing PASS 13/13; accepted | FC-Sim Git | `a3ccc46`, `e2c0df3` |
| 3 Oct | V2-G3 15/19 → 16/19; ankle neutral-zone law not adopted | FC-Sim Git | `f080253`, `677cb6e`, `12309ee` |
| 3 Oct | Investigation B (Jolt EPA reversed turf manifold); flat-plane turf adopted; G1 / G2 re-validated | FC-Sim Git | `d7a7fcb`, `e17bc73`, `13b0848` |
| 3 Oct | J2 split; controller symmetry corrections; G3 v3.2 20/20 but not declared; pre-G4 stop | FC-Sim Git | `d80f88f`, `e9bcf96`, `833ec4a`, `d67f417`, `f85e396` |
| 4 Oct | G3 PASS 20/20 under criteria v3.3: J2a the normative symmetry gate, J2b a permanent diagnostic | FC-Sim Git | `bb0ec47` |
| 4 Oct | Ankle k > 0 reinvestigation: no candidate evidence-supported; the posture IK's twist limit cycle identified | FC-Sim Git | `4b544ca`, `2d4815e`, `3219bdc`, `4cc8b09` |
| 4 Oct | Pre-G4 research runway and consolidated decision report ("not yet for G4 experiment runs") | FC-Sim Git | `8cfb25b`, `2dc9f04`, `afe14e4`, `e98aa2f` |
| 4 Oct | Support / contact lifecycle built (default off); final pre-E1a report: DO NOT AUTHORISE E1a | FC-Sim Git | `07ca15d`, `f4fa331`, `82dfdba` |
| 4 Oct | Knee axial literature review; corrected knee `v2k` pre-registered, built default-off, qualified | FC-Sim Git | `b2f25bb`, `0267291`, `097dcb7`, `89cb31e` |
| 4 Oct | Pre-E1a configuration frozen (`v2k` + ankle k 0.13 + reference twist + lifecycle); qualification v2: one blocker | FC-Sim Git | `56a87b8`, `1d43f80` |
| 4 Oct | E1a authorised (5 Oct 03:23); first official E1a run fails before any lift; knee feed-forward bug found; B1 + B3 not qualified | FC-Sim Git | `76cd5ef`, `439175a`, `74fd215`, `fd1993d`, `2ce81f3` |
| 5 Oct | Candidate C fails its validation; pre-swing candidate P\* passes and is adopted as configuration PSTAR | FC-Sim Git | `ac3a3c4`, `abdd3da`, `3da5e5e` |
| 5 Oct | **E1a PASS** (5 mm lift, hover, replace; 8 bodies + mirrored) | FC-Sim Git | `d499453` |
| 5 Oct | E1b fails under PSTAR; PSTAR2 and T-A (PSTAR3) fail validation; P15 capture study | FC-Sim Git | `11d2fea`, `19dbc73`, `997a5e7`, `7a945de` |
| 5 Oct | **E1b CLOSED** (PSTAR4, P15 split A / B); foot-yaw actuator adopted (PSTARY); E2 architecture frozen for review | FC-Sim Git | `ca4aad6`, `6e0bf0a` |
| 5 Oct | E2 v2 implemented default-off (PSTAR5 / 5B / 5C); velocity-feed-forward rate defect found and corrected; E2 blocked on the planning gate (6 Oct 00:15–05:26) | FC-Sim Git | `5eb1ccb`, `41a5cc8`, `9570ccc`, `6c30e64`, `d202cac` |
| 6 Oct | Apex 30 mm amendment (A30); PG-1 0 / 32 | FC-Sim Git | `ac4674e`, `eaddffd` |
| 6 Oct | SV-2 swing-servo validation frozen and run: DOES NOT VALIDATE | FC-Sim Git | `7bde433`, `76f81d0` |
| 6 Oct | Vertical-residual diagnosis (pelvis coupling M1, passive ankle damping M2) | FC-Sim Git | `84a6922`, `4afccb7` |
| 6 Oct | A + B: AB battery FAIL; AB2 VALIDATES, A + B qualified as swing mechanisms | FC-Sim Git | `1a65417`, `b735b95`, `3c46742`, `85758ab` |
| 6 Oct | First touchdown coordinator stopped at design; execution-feasibility certifier | FC-Sim Git | `bc3d558` |
| 6 Oct | 1A / 1B: both DO NOT VALIDATE (later: 1A not adopted, 1B rejected) | FC-Sim Git | `c4c7061`, `0150ce8`, `e658953` |
| 6 Oct | TD2 touchdown coordinator: DOES NOT VALIDATE (clean in its certified window); morning report | FC-Sim Git | `3bb6752`, `d285f10`, `20d7837`, `6606ad5` |
| 7 Oct | TD2B: DOES NOT VALIDATE (earlyOOE only); D1 singularity defect found | FC-Sim Git | `b6fe3c0`, `2200cd9`, `4836364` |
| 7 Oct | D1 guard v1: DOES NOT VALIDATE; TD2C not run | FC-Sim Git | `8e0cf07`, `19eb4d5`, `20e782d` |
| 7 Oct | DVG (D1G v2): erratum E1, first run aborted; combined qualification DOES NOT VALIDATE; TD-17 recorded | FC-Sim Git | `72506d0`, `f9e0a11`, `6b7ab90`, `d3f9bcc`, `b54bb6a` |
| 8 Oct | Physical-character branches published with their original dates; the unpublished 33-commit tail replayed without a 105.8 MB generated archive (old → new map kept); chronicle caught up | FC-Sim Git | `11149df`, `9578ccf`, `21b6f06`; `PUBLICATION_REWRITE_2026-10-08.md` |

## Appendix B — Repository provenance

**Why there are two repositories, and how they relate.**

- **TouchlineSimulator** (`github.com/ZainRahman23/TouchlineSimulator`; the local remote `origin`).
  - Created 27 Aug at 17:48 (−07:00) with the squashed root `a0cd26d` on `main`, tagged `pre-visual-integration`.
  - On 2 Sep at 06:12 (−07:00) the branch `checkpoint0` was pushed at `2a5ebfc`: the whole visual-integration line through chunk invariance (81 commits).
  - Nothing has been pushed to it since. The 19 Sep architecture audit records it as "139 behind" and "intentionally left as is".
  - **All of its content is contained in FC-Simulator** (`checkpoint0` is an ancestor of `touchline-current`), so it has **no unique history**.
- **FC-Simulator** (`github.com/ZainRahman23/FC-Simulator`; the local remote `fc-simulator`; local path `~/Downloads/FC Simulator`).
  - First pushed on 4 Sep at 19:34 (−07:00): branch `visual-integration-v1` at `cad400a` (still the default branch), with `main` fast-forwarded to it minutes later.
  - `main` was advanced to `ff3a89f` on 19 Sep and tagged `checkpoint/sprite-baseline-2026-09-19`.
  - `touchline-current` and the `baseline/*` tags were pushed on 28 Sep.
  - **8 Oct:** `prototype/physical-character-v1` (`11149df`), `prototype/physical-character-v2` (through `9578ccf`) and `environment/weather-snow-surface-v1` (`9468ddd`) were pushed. This was authentic history with its original dates: no rewrite, no force. The 33 commits after `9578ccf` were first held back by a 105.8 MB generated archive. On the user's decision they were replayed without it and pushed, with an old → new map (`PUBLICATION_REWRITE_2026-10-08.md`; 7 Oct entry). No published commit was rewritten. The checkpoint tags `checkpoint/physchar-pre-crossover` and `checkpoint/physchar-v1-final-research` were pushed with them.
  - It also carries the Coach MVP pull request (`claude/coach-mvp`).
  - It is **authoritative for everything from 27 Aug onward**.
- **Why the switch happened is not recorded (Uncertain).** The evidence shows the move but not the reason. TouchlineSimulator received checkpoint pushes, while FC-Simulator became the tracking remote from 4 Sep, when the goalkeeper work began to accumulate.
- **Before any repository: the ChatGPT development conversation** (18 Aug). The design and the packaged simulator lineage v0.1–v0.7, and the first two Touchline HTML pages. It survives as the primary-source extraction, and locally as `fc_simulator_v0_7.zip`, `LOCKED_PROJECT_MEMORY.md` and `V07_WEBSITE_INTEGRATION_CONTRACT.md` in `~/Downloads`.
  - **Proven continuity:** 47 of 53 files of the v0.7 package are byte-identical in `a0cd26d`, and the website carries `touchline(2).html`'s identifiers.
  - **Never in Git:** v0.1–v0.6, all demo and reference JSONs, `touchline(1).html` and the screenshots. **Recovered originals** (28 Sep, hash-verified) are held locally in `review_artifacts/history_primary_2026-08-18/TOUCHLINE_2026-08-18_PRIMARY_ARTIFACTS.zip`.
  - **Early artifact index.** All of these, except where noted, are present as recovered originals in `review_artifacts/history_primary_2026-08-18/TOUCHLINE_2026-08-18_PRIMARY_ARTIFACTS.zip`:
    - the FC 25 simulation transcript (`Pasted markdown.md`);
    - workbooks `2025-26-rankings-fc-attributes_8.xlsx` (original) and `_9.xlsx` (Height/Weight);
    - `fc_simulator_v0_1.zip` … `fc_simulator_v0_7.zip`, each with its documents;
    - reference matches: `demo_match.json`, `demo_match_v0_2.json`, `tactical_demo_v0_2.json`, `cagey_demo_v0_3.json`, `end_to_end_demo_v0_3.json`, `tactical_openness_v0_3.json`, `role_report_cagey_v0_4.json`, `tactical_ecology_v0_5.json`, `attack_quality_v0_5.json`, four v0.6 90-minute references, `tactical_distribution_v0_6_final.json`, `matchup_matrix_v0_7.json`, `quality_sweep_paired_v0_7.json`;
    - calibration and design documents: `OPENNESS_MODEL.md` (v0.3), `ROLE_RATINGS.md` / `VALIDATION.md` / `REFERENCE_RESULTS.md` (v0.4), `CAGEY_CALIBRATION.md` (v0.5), `QUALITY_RANDOMNESS.md` (v0.7);
    - `Haaland.png` and a formation-screen reference; screenshots `2026-08-18 at 5.08.54 PM`, `7.07.25 PM` and `7.51.18 PM`;
    - `touchline(1).html` and `touchline(2).html`;
    - `touchline_fc_handoff_2026-08-18.zip` with `LOCKED_PROJECT_MEMORY.md`, `CURRENT_STATUS_AND_NEXT_STEPS.md`, `V07_WEBSITE_INTEGRATION_CONTRACT.md`, `CLAUDE_INTEGRATION_NOTE.md`, `NEW_CHAT_STARTER.md` and `README_FIRST.md`.
- **Local work before Git** (18 Aug evening – 27 Aug) survives only in:
  - the documents and files carried inside `a0cd26d`;
  - the `~/TouchlineRC1` release folders (app backups, databases, logs);
  - the `TouchlineRC2–8-staging` folders.
- **The Astra character track** (about 20–23 Sep) was a separate workstream.
  - It used another model ("Astra"), later moved to another account, and kept its own isolated local repository.
  - That repository's commit identifiers survive only as a list (`COMMITS.txt`: `57bddf9`, `8f854c8`, `d3c86f7`, `bf5d4b5`, `4047fb1`, `58d20f2`, `3f67705`, `64bffcc`, `8c7f540`, `78afaea`, `5e89a7a`); the object database was not recovered.
  - It was fed from FC-Simulator by exports (`2c80700`, `TOUCHLINE_SCENE_ENVIRONMENT.zip`), and fed back into it by packages that Claude integrated (`da3ea2f` Courtois; `f8254a2` / `7cba78d` six outfield players).
- **Duplicates, not counted as events:**
  - `checkpoint0` (the same commits as FC-Simulator);
  - the root-level `ASTRA_VISUAL_PIPELINE_EXPERIMENT.zip` (an export of the committed `review_artifacts/astra_visual_pipeline_experiment/`);
  - `TOUCHLINE_SCENE_ENVIRONMENT.zip` (an unmodified copy of repository files at `2c80700`);
  - `review_artifacts/ASTRA_KICK_SYSTEM_HANDOFF.zip` (a zip of the kick-handoff folder);
  - the 20 Sep history handoff and the 23 Sep memory export (later summaries of 5–23 Sep).
- **Chat extraction (integrated 8 Oct).** Astra reconstructed the user's 1 – 7 Oct chat history and supplied it as a documentation package. It could not write to the repository (HTTP 403).
  - Its ledger, source register, quantitative record, conflict register and acquisition queue are kept in [`review_artifacts/chat_history_reconstruction_2026-10-08/`](../review_artifacts/chat_history_reconstruction_2026-10-08/), as the citation record, not a second chronicle.
  - Its seven day supplements were audited and merged into the day entries here.
  - A local audit of the 30 queued originals is in [`ORIGINALS_STATUS.tsv`](../review_artifacts/chat_history_reconstruction_2026-10-08/ORIGINALS_STATUS.tsv): 26 located locally; none in Git.
- **Session records ([Session], from 28 Sep).** The Claude Code and Codex session logs on the development machine record the user's instructions with timestamps. From 2 Oct, the physical-character branches also save every user decision verbatim in `review_artifacts/physical_character_v1|v2/sources/`. The V1 file names carry UTC times; the V2 file names carry only dates.
- **Terminology.** "V6" names three different things:
  1. the **SOUTH V6** dive sprite (6 Sep);
  2. the **v6** skeletal far-dive lifecycle (20 Sep);
  3. the Astra **V6** character renderer built on that lifecycle (21 Sep).

## Appendix C — Chronology cross-check

**Development days represented: 39 dated days, plus the undated 8–13 Sep period.**
- 8 before Git: 18 (the chat day plus the local evening), 19, 21, 22, 23, 24, 25 and 26 Aug. The morning of 27 Aug belongs to the 27 Aug Git day.
- 28 Git days (19 to 28 Sep, plus 29 Sep – 7 Oct on the physical-character branches).
- 3 evidenced only outside Git: 2 Sep (goalkeeper stages, [Local]), 14 Sep (screenshots, [Local]) and 21 Sep (the Astra character, [Astra]).
- The 8–13 Sep sprite-generator period is [Later] only and has no dated artifact.

The FC-Simulator day headings were checked against every commit's recorded timestamp (06:00 boundary):

| Day | Commits | First → last (recorded local time) |
|---|---|---|
| Thu 27 Aug | 25 | 17:48 → 00:58 (−07:00) |
| Sun 30 Aug | 26 | 20:08 → 03:10 (−07:00) |
| Mon 31 Aug | 21 | 14:15 → 04:15 (−07:00) |
| Tue 1 Sep | 9 | 15:46 → 04:07 (−07:00) |
| Thu 3 Sep | 1 | 21:21 (−07:00) |
| Fri 4 Sep | 5 | 06:06 → 23:48 (−07:00) |
| Sat 5 Sep | 26 | 12:10 → 03:21 (−07:00) |
| Sun 6 Sep | 14 | 11:35 → 02:48 (−07:00) |
| Mon 7 Sep | 7 | 13:50 → 15:55 (−07:00) |
| Sun 13 Sep | 6 | 01:25 → 02:50 on 14 Sep (+01:00) |
| Sat 19 Sep | 22 | 18:38 → 03:28 (+01:00) |
| Sun 20 Sep | 11 | 13:09 → 01:00 (+01:00) |
| Tue 22 Sep | 10 | 22:15 → 04:48 (+01:00) |
| Wed 23 Sep | 19 | 12:54 → 05:14 (+01:00) |
| Thu 24 Sep | 3 | 06:07 → 05:03 on 25 Sep (+01:00 / +02:00) |
| Fri 25 Sep | 3 | 23:18 → 03:30 (+02:00) |
| Sat 26 Sep | 2 | 21:13 → 04:53 (+02:00) |
| Sun 27 Sep | 2 | 20:54 → 03:05 (+01:00) |
| Mon 28 Sep | 7 | 12:19 → 19:54 (+01:00) |
| Tue 29 Sep | 24 | 02:12 → 04:39, both on 30 Sep (+01:00) |
| Wed 30 Sep | 5 | 13:41 → 01:32 on 1 Oct (+01:00) |
| Thu 1 Oct | 16 | 10:05 → 04:19 on 2 Oct (+01:00) |
| Fri 2 Oct | 12 | 06:46 → 04:31 on 3 Oct (+01:00) |
| Sat 3 Oct | 33 | 07:15 → 04:34 on 4 Oct (+01:00) |
| Sun 4 Oct | 46 | 11:20 → 05:56 on 5 Oct (+01:00) |
| Mon 5 Oct | 35 | 06:36 → 05:26 on 6 Oct (+01:00) |
| Tue 6 Oct | 20 | 12:19 → 04:35 on 7 Oct (+01:00) |
| Wed 7 Oct | 11, then housekeeping | 12:33 → 02:19 on 8 Oct; then from 02:55 on 8 Oct: `9468ddd`, `e5ea11f`, `c1328ef`, `9e95b87`, and the publication repair `7ecd115`, `117168e`, `21b6f06` with its chronicle update (+01:00) |

**Where the evidence is incomplete or ambiguous.**
1. **Before 18 Aug:** no evidence of any work. The conversation opens with the requirement itself, and the extraction finds nothing earlier.
2. **18 Aug:** the order of versions and minute-level times come from the chat's upload times and are confirmed by file times. The exact times of the early design messages are not preserved. The local integration that night is dated only by file times.
3. **19–27 Aug:** no commits. Days are dated by file modification times (which record the *last* change, so earlier work on a file is invisible) and by documents' own dates. 20 Aug has no evidence. cal1 is never named in any surviving document.
4. **Time zones.** Commits and August files are at −07:00, proven by the backup filenames; commits from 14 Sep are at +01:00/+02:00. The switch fell between 7 and 14 Sep, so local file times in that window are Uncertain by up to eight hours.
5. **2–3 Sep:** Goalkeeper V1 stages 0–3 were committed once (`fbcd19c`). Their split rests on the dates of local folders.
6. **Morning boundaries:** `4067542` (06:06, 4 Sep) and `0c2bec7` (06:07, 24 Sep) are probably the tail of the previous night.
7. **8–14 Sep:** no commits until the night of 13 Sep. The sprite-generator dive attempts and the Salah sprite request rest only on later recollections ([Later]), with no surviving artifact identified.
8. **15–18 Sep and 21 Sep:** no commits. The Astra files of 21 Sep are Astra-track work.
9. **The Astra track:** dated by delivered file times and by commit labels without dates. The order of its commits is known; their exact days are Reconstructed.
10. **The environment work (25–28 Sep):** dated by working-tree file times; who authored it, and in which session, is not recorded.
11. **Deduplicated overlaps:** listed in Appendix B.
12. **Morning boundaries, 29 Sep – 7 Oct:** `39c8dd2` (06:46, 2 Oct), `7d10111` (07:15, 3 Oct) and `ac3a3c4` … `9e2a0b7` (06:36 – 07:25, 5 Oct) are probably the tails of the previous nights' autonomous runways.
13. **Preregistration order** (2 – 7 Oct): commit messages state that each preregistration came before its code. Git proves only commit times, and some gaps are minutes (TD2B 6 min, DVG 13 min).
14. **User decisions, 2 – 7 Oct:** their time is known from the commits that saved them. A `sources/` file's date is a calendar date, so some belong to the previous chronicle day.
15. **Work outside Git, 28 Sep – 7 Oct:** dated by session records and file times. These cover the 28 Sep snow work and portfolio package, and the slide-tackle worktrees. The 1 – 7 Oct manager-interface, ratings and development work is dated by the chat extraction's UTC times, converted at +01:00, and by the local originals' file times. The extraction is selected excerpts, so an undated or unrecovered step is not filled in.
16. **Corrected 8 Oct:**
    - the 7 Oct entry had said `Touchline_Development_Colour_Test.html` was "no longer in `~/Downloads`"; it is there, unchanged since 22:33 (a truncated directory listing caused the error);
    - the "authorship not recorded" notes on the manager pages are qualified by the chat extraction and the Codex workspace paths.


## Appendix D — The early simulator lineage and calibration record

Engine versions (all 18 Aug local, from the [Chat] record; times −07:00):

| Version | Packaged | What it added | What forced the next step | Tests |
|---|---|---|---|---|
| design | early afternoon | Attributes not OVR; per-second workload stamina; four-part instructions; tactic dropdowns; Height/Weight; causal log-odds with no OVR term; foul chain; calibration plan | — | — |
| v0.1 Possession Skeleton | 14:14 | Deterministic 11-v-11, movement/stamina, passing, loose balls, basic shooting, ledger | Double-counted pass failure; double post-shot xG suppression; goals ~3.7 left as a target | core invariants |
| v0.2 Physical + Tactical | 14:40 | Height/Weight duels, pressing/dribbling/tackles, fouls/cards, crosses, restarts, 4-2-3-1, all 13 tactics, coach AI | Chaos, duel excess, 1.2 penalties a match, 100+ crosses, **no offside** | 16 |
| v0.3 Openness + Transition | 14:59 | Emergent cagey/open ecology (no multiplier): organisation, through balls, deep-block envelopes | Cagey 0–0 / 0.38 xG — "too sterile" | 22 |
| v0.4 Role + GK/Timing | 15:17 | Role ratings, active/dead-ball time, GK roles/claims, 4-1-4-1 | Role saturation (normalised per opportunity); cagey ~0.13–0.22 xG | 34 |
| v0.5 Chance Ecology | 15:53 | Owner's ~0.8 cagey target: controlled vs ultra-low vs end-to-end; settled maturation; cutbacks | Kickoffs inheriting possession age; wide plan deferred | — |
| v0.6 Wide + Spatial Integrity | 16:18 | Zone crosses, cutback cover, **no silent carrier movement**, recovery and compactness fixes | "Aggressive-open" preset rejected; extreme-open tail ~6.7 xG/90 left exposed | 46 |
| v0.7 Random Integrity + Matchups + Quality | 17:35 | Semantic keyed RNG (no event numbers), mirrored calibration teams, asymmetric matrix, paired quality sweep | Controlled cagey ~0.58 (below 0.8); open-v-ultra tail | 53 |

Calibration and releases of v0.7 (local project):

| Revision | Date | Change | Evidence |
|---|---|---|---|
| cal1 | 18 Aug night (Reconstructed) | Never named in a surviving document | — |
| cal2 | 18–19 Aug | "ratings + GK fixes locked"; integration 22/22, E2E 4/4, parity PASS | `NOTES-possession-pass.md` |
| cal3 | 19 Aug | Settled attacking structure (geometry, choice utility, possession continuity) | `SETTLED_STRUCTURE_REPORT.md`; audit 21 Aug |
| cal4 | 22 Aug | Pressing as a real tradeoff | `PRESSING_ARCHITECTURE_REPORT.md` |
| cal5 → RC1 | 22 Aug | Player data v3 (four attributes); Touchline 0.1.0-rc1 | `PLAYER_DATA_V3…`, `RELEASE_RC1.md` |
| (cal6 shot-choice) | 22–23 Aug night | **Rejected: KEEP CAL5** | `SHOT_CHOICE_CAL6_EXPERIMENT.md` |
| cal6 → RC2 | 23 Aug 13:46 / 14:21 | Action choice on block-risk-adjusted xG | `ACTION_CHOICE_CAL6_PACKAGE.md` |
| cal7–cal10 → RC3–RC6 | 23 Aug | Spatial-temporal; penetration; attacking intelligence; game-state risk | cal7–cal10 reports |
| cal10 + anim1 → RC7 | 24 Aug 03:10 | First animated renderer | `RC7_DEPLOYMENT.md` |
| cal11 + anim2 → RC8 | 24 Aug 20:20 | Box arrival and post-beat exploitation; three-clock renderer | `RC8_DEPLOYMENT.md` |
| cal12 + Hybrid-C | 26 Aug | Integrated behind a flag, bit-identical | `PRODUCTION_INTEGRATION_GATE.md` |

## Appendix E — Reconciliation of the early-history source

How the 18 Aug primary-source extraction ([Chat]) was reconciled with the other evidence. **Resulting certainty** is the certainty in this chronicle.

| Claim | Previous chronicle | [Chat] extraction | Other evidence | Conclusion | Resulting certainty |
|---|---|---|---|---|---|
| Project start | Earliest evidence 18 Aug 14:12; engine "already v0.7", origin Uncertain | Requirement at 13:00 local (20:00 UTC), design, then v0.1 | v0.1 files' times 14:12 local, 2 min before the v0.1 upload | Starts 18 Aug ~13:00 with the requirement | Fact |
| Origin of v0.7 | Unknown | v0.1→v0.7 same day | v0.7 zip 47/53 byte-identical to `a0cd26d`; file times inside version windows | The repository engine is the chat-built v0.7 plus calibration | Fact |
| Time zone | −07:00 proven from RC backup names | −07:00 from screenshot names | Both agree | −07:00 for August | Fact |
| cal/RC vs versions | Not addressed | No RC/cal evidence in the chat | `RELEASE_RC1.md`: engine v0.7 + calibration cal5 | cal = calibration of v0.7; RC = app release; not a renaming | Fact |
| Touchline app on 18 Aug | "FastAPI app existed" | Only an HTML page with a mock; integration proposed at 20:27 | `README_TOUCHLINE.md` 20:46; tests first evidenced 19 Aug | Integration began the evening of 18 Aug, locally, after the handoff | Reconstructed |
| First Touchline UI | Absent | `touchline(1)` rejected; `touchline(2)` accepted, mock engine | `web/touchline.html` carries `touchline(2)` identifiers | The web app descends from `touchline(2)` | Fact |
| "Presentation never decides" | First from the 24 Aug renderer | UI "never computes football logic" (18 Aug) | 24 Aug renderer docs; 19 Sep audit | Ancestor 18 Aug (UI); renderer 24 Aug; animation wording from Sep | Fact (each stage) |
| Determinism / random integrity | From the 24 Aug neutrality proofs | Same-seed ledger from v0.1; event-number keys removed in v0.7 | `QUALITY_RANDOMNESS.md` in `a0cd26d` | Origin 18 Aug | Fact |
| No-tuning / causal rule | From cal11 (24 Aug) | From the design and v0.2–v0.7 fixes | `CALIBRATION.md` ("never tune a final scoreline") | Origin 18 Aug | Fact |
| 19 Aug possession pass | "Paused; zero engine changes" | — | `SETTLED_STRUCTURE_REPORT.md` 15:45 (cal2 → cal3) | Resumed and implemented the same afternoon | Fact |
| 21 Aug | One file, no content | — | `CAL3_POST_STRUCTURAL_AUDIT.md` | An audit day | Fact |
| cal6 | "Uncertain 22–23 Aug" | — | Forensic 00:43, rejection 01:58, acceptance 13:46 | A rejected attempt, then an accepted cal6 before RC2 | Fact |
| Chat-era artifacts | Known only from the extraction | Listed by name | Recovered originals, 56/56 hashes verified; package times match the upload times; quoted identifiers present | The chat record is physically confirmed | Fact |
| Salah | First real-player art 10–14 Sep | — | Salah card PNG among the 18 Aug `web/cards` | An 18 Aug management card precedes the September sprite request | Fact (card), [Later] (sprite) |

## Appendix F — Keeping this chronicle current

1. **One entry per development day**, dated by that day's recorded local time, with the day running until 06:00. Use the same headings, and leave out any heading with nothing to say.
2. **Update at the end of a working day** in a documentation-only commit (`docs: chronicle <date>`) after the day's code is committed. Never mix it into a code commit.
3. **Record failures as they happen:** commit messages should keep saying what was tried and rejected. Review-only work that is never committed gets one line labelled **[Local]**. Work done in another workstream (Astra, another account, another repository) gets an entry with its provenance label.
4. **Label certainty and provenance** as in this document. When work crosses a repository or workstream boundary, add a *Transition* note.
5. **Keep the appendices current:** new baseline tags go into the day entry, Current state and the milestone map.

6. **Daily publication/archive rule** (the user's instruction, 8 Oct 2026, verbatim):

   > Daily publication/archive rule: On the first Touchline development prompt/session of each new calendar day, before beginning new research, design, implementation or simulation work: 1. identify whether the previous day's work has been completely committed; 2. finish coherent commits for that previous work; 3. update the existing daily development archive for the previous day; 4. archive relevant new screenshots/photos/evidence; 5. push the legitimate previous-day commits and archive update to the configured remote; 6. verify the push; 7. only then begin the new day's requested work. If multiple days have elapsed, catch up each missing daily archive entry from evidence before beginning new work. Never fabricate work, commit dates or archive entries to fill a calendar. This housekeeping should happen once at the start of the first project work of a new day, not before every prompt during the same day.

   In practice:
   - **The archive** is this chronicle on `touchline-current`. Screenshots go to `review_artifacts/chronicle_screens/<date>_<subject>/`, as unmodified originals listed in `MANIFEST.tsv` with SHA-256.
   - **Exclude** personal images and third-party footage.
   - **The remote** is `fc-simulator`. Never rewrite, squash or force-push published history without the user's approval.
   - **GitHub rejects files over 100 MiB**, and large pushes go in batches of ≤ 0.4 GB.
   - **An original recovered later is filed under its historical day**, not as new work: images in `chronicle_screens/<date>_<subject>/` with a `MANIFEST.tsv` row; other originals noted in the day entry and in `ORIGINALS_STATUS.tsv`. A candidate is never added without its original bytes, and no date, hash or screenshot is invented.
   - **Generated archives of 50 MB or more**, and raw per-run record archives, stay outside Git with a SHA-256 pointer file (the V2 branch's `EVIDENCE_STORAGE_POLICY.md`; the pre-commit guard is in `tools/git-hooks/`).

The request to use at the end of each day:

> Update today's Touchline Development Chronicle entry from today's commits and work. Include important experiments, discoveries, decisions, failures and remaining issues — not just the final code. Documentation only; do not run validation.

## Appendix G — Originals still to archive or recover (1 – 7 Oct)

The full list of 30 entries is in [`ORIGINALS_STATUS.tsv`](../review_artifacts/chat_history_reconstruction_2026-10-08/ORIGINALS_STATUS.tsv), with paths, sizes, times and SHA-256.

**Archived on 8 Oct in the portfolio source package** (local, outside Git as decided on 28 Sep; byte-identical copies):

| day | original | package path (`~/Downloads/TOUCHLINE_PORTFOLIO_SOURCE_ASSETS/`) | identity |
|---|---|---|---|
| 2 Oct | `2026-27-ratings-flank-rules-updated.xlsx` | `24_squad_live_ratings/original/` | Desktop file (23:13); its Rules sheet stores the chat's last weak-foot scale (2 Oct entry) |
| 4 Oct | `2026-27-ratings-updated-ranked-2026-10-04.xlsx` | `26_ranked_ratings_broad_mockup/original/` | stored values match the reported figures (4 Oct entry); a Quick Look render of the rank-changes sheet is beside it |
| 6 Oct | `TOUCHLINE_Exposure_Development_Package.zip` | `28_development_model/original/` | attachment (16:32), inner files 15:26; charted, not executed |
| 6 Oct | `TOUCHLINE_Aging_Fitness_v1_2026-10-06.zip` | `28_development_model/original/` | attachment (22:12), inner files 21:03; name differs from the chat's by one character; charted, not executed |
| 7 Oct | `Touchline_Playable_Calendar.html` (latest) | `29_calendar_polish/original/` | the 23:09 build (= `~/Downloads` 23:10); recaptured against the 23:09 pre-change snapshot (7 Oct entry) |

**The package's stages 23 – 29**, one per chronicle day from 1 to 7 Oct, add 75 media and these 5 originals. Open them in the package's `PORTFOLIO_CAPTURE_REVIEW.html`, group 9. The media are:
- 44 ORIGINAL: the owner's screenshots, the sessions' own preview renders and two animated card previews;
- 15 RECAPTURED: finance, mockup, workbook, pack opening and calendar, all from disposable copies of the original files;
- 10 GENERATED (AI images): card art, standings concepts, a background and an icon study;
- 2 derived charts;
- 4 third-party references.

Paths, hashes and the fidelity notes are in the package's `TOUCHLINE_PORTFOLIO_ASSET_MANIFEST.md`, and the per-original status is in `ORIGINALS_STATUS.tsv` (column `portfolio_package`).

**Also added to Git on 8 Oct:** eight of the owner's screenshots from these days, filed under their days in `chronicle_screens/` with `MANIFEST.tsv` rows (2 Oct ratings; 4, 5, 6 and 7 Oct manager UI). Until then they existed only on the Desktop or as chat attachments. Three are surviving chat-attachment copies at 2047 px. Session preview renders, card images, generated images and third-party references stay local.

**Not found:**
- the 3 Oct final-review workbook;
- the 4 Oct mockup review-package ZIP;
- the 5 Oct metallic rim-detail / standings PNGs (the 5 Oct 12:00 – 15:00 standings work left no workspace files; the 13:56 screenshot and the `~/Downloads` HTML builds survive);
- images of the 4:59 gold-fill / rim experiment and its 05:04 reversion (4 Oct entry);
- the first 6 Oct Calendar builds (22:17 / 22:32), which were overwritten in place; the 23:10 screenshot of their training panel survives;
- the 6 – 7 Oct performance-comparison tables (never files).

**Publication limits that still apply:**
- card images and HTML that embed real players' photos stay unpublished (8 Oct decision);
- the HTML pages rely on online crests.
