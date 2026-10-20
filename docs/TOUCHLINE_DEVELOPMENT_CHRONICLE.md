# Touchline — Development Chronicle

The history of the Touchline football project as a whole, from the first requirement for the simulator (18 Aug 2026, about 13:00 local) through the physical-character work of the 8 Oct 2026 chronicle day (ending at 06:00 on 9 Oct). It is a development diary, not a changelog: what was tried, what failed, what was learned, and what worked at the end of each day.

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

**Scope.** Conversation evidence starts at 20:00 UTC on 18 Aug (13:00 local), with the opening request. Package and file evidence starts at 14:12 local on 18 Aug; commit evidence starts on 27 Aug. The chronicle runs through the 8 Oct day (to 06:00 on 9 Oct). The playable collaboration state is still `touchline-current` (`e2c98ec`, plus documentation commits); the physical-character work of 29 Sep – 7 Oct is on its own branches (Part IV). Parallel work by other contributors is mentioned only where it bears on the main line; one example is the Coach MVP pull request on the FC-Simulator repository (`claude/coach-mvp`, 23 Sep).

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


# Part IV — The physical character (29 Sep – 8 Oct)

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

**Evidence:** [FC-Sim Git] 11 commits on `prototype/physical-character-v2`, `b6fe3c0` (12:33) → `b54bb6a` (02:19, 8 Oct), and 4 more after the publication housekeeping, `d426ceb` (03:56) → `de464a8` (04:53, 8 Oct). [Doc] `DECISIONS.md` E2-16 … E2-21 (sections dated 2026-10-07 and 2026-10-08); in `e2/`: `TD2B_PREREG` / `_RESULTS`, `D1G_TD2C_PREREG`, `D1G_RESULTS`, `DVG_PREREG`, `DVG_RESULTS`, `DVG2_PREREG` / `_RESULTS`, `SV2R_PREREG`. Three user decisions and one instruction in `sources/` (two dated 7 Oct, two dated 8 Oct); the publication decision is cited under the housekeeping.

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

**DVG2 and the TD2C freeze, early morning** (catch-up, added 9 Oct; `d426ceb` 03:56, `3e1c33c` 04:51, `cb958cf` and `de464a8` 04:53).
- This came after the publication housekeeping described below. The user's overnight runway (03:44; DECISIONS E2-21): "Preserve the current DVG qualification as FAIL. Do not reinterpret CQ-1b retrospectively." And: "Do not raise the old 5% saturation threshold based on the observed 5.17%."
- **DVG2 preregistered and frozen** (`d426ceb`). It is a versioned qualification of the unchanged DVG implementation (no code change since `d3f9bcc`).
  - CQ-3a: "on its soft bound" means a margin ≤ IK.h (10⁻⁶ rad, the bounded solver's own perturbation step, not the observed 4.5 · 10⁻¹⁰). Every newly classified fold must also show mirror equivalence.
  - CQ-1b is split by the frozen execution-feasibility certifier. Class A keeps the frozen gate in full. Class B (NOT QUALIFIED) is gated on B-1 … B-8, with continuous saturation ≤ 50 ms (the E2-11 / I-4 bound, τ_deact); the 5 % fraction is reported only.
- **Battery** (03:56 – 04:49): 480 certifier runs, 12 class-B extras, and the 1,522 frozen CQ jobs.
- **Erratum E1** (`3e1c33c`). The evaluator read the SV-2 evaluator's per-run metrics one level too high, so B-2, B-3 and B-6 compared undefined values and failed every class-B run. The original FAIL (CQ-1bB) is preserved, and the same records were re-evaluated.
- **PASS** (`cb958cf`).
  - 48 class-B cases, all C-L11; the 240 Hz verdicts are identical to the 6 Oct sweep.
  - The 6 engaged V2-long-legs C-L11 runs pass B-1 … B-8: saturation 5.2 %, ≤ 33 ms; safety items {I-6} ⊂ unguarded {I-3, I-6}; the certifier still says NOT QUALIFIED.
  - CQ-3a passes: the one newly classified fold is mirror-equivalent.
  - 1,496 / 1,496 end hashes are identical to the DVG CQ battery. Reported under TD-17: 7 of the 13 exact-flag folds are robust to perturbation.
  - **DVG adopted** (`d1Guard: 2`) in PSTAR5CHABV / PSTAR5CHABTDV.
- **TD2C amendment A5 and freeze** (`de464a8`).
  - Only the configuration and the guard-law checks change. Criteria C-1 … C-10 and U-1 … U-7, the 3,552-run matrix and the stop rules are unchanged.
  - Tool check: the nominal V2-REF case reproduces TD2B's hash `787cc0c9` with 0 guard engagements.
  - SV-2R (the swing / servo re-qualification for PG-1) was preregistered on TD2C's 432 nominal runs.
- The TD2C battery started at 04:53 and was still running at 06:00; its result is in the 8 Oct entry. Under "do not push these new development commits tonight", the four commits stayed local.

**Corrections and process errors.** TD2B A1 evaluator false flag; D1G's preregistered V1 – V3 rule, which would predictably have failed (V4 added, disclosed); DVG erratum E1 and the aborted first run; the CQ-3a classifier, whose test was stricter than the preregistered definition; DVG2 evaluator erratum E1 (`3e1c33c`), a metrics path read one level too high, fixed before re-evaluation with the original FAIL preserved.

**Adopted / not adopted.** Nothing adopted. TD2, TD2B, D1G v1 and DVG are all FAIL; the TD2C battery has never run. TD-17 recorded; TD-15 reaffirmed as gating.

*Catch-up, 9 Oct* (the line above was true when written, before the four early-morning commits): DVG adopted at 04:53 on 8 Oct (`cb958cf`), through the versioned DVG2 qualification; DVG's own combined qualification stays FAIL as recorded. TD2, TD2B and D1G v1 are FAIL. TD2C was amended (A5) and frozen, and its battery started at 04:53. TD-17 recorded; TD-15 reaffirmed as gating.

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

*Catch-up, 9 Oct:* At 06:00 on 8 Oct, DVG was adopted (`cb958cf`) and the frozen TD2C battery (3,552 runs, `de464a8`) was running; its result is in the 8 Oct entry.
- The two decisions left at `b54bb6a` (`DVG_RESULTS.md` §3) were taken in the 03:44 instruction:
  - the CQ-3a classifier was corrected from the solver's own tolerance;
  - CQ-1b was not reinterpreted but re-qualified in DVG2, split by the execution-feasibility certifier.
- The prepared path after TD2C: E2 integration (the draft is preserved in `e2/drafts/`, `e5ea11f`) → SV-2R → PG-1 → official E2.
- No PG-1 or official E2 has run.
- The four DVG2 / TD2C commits were held locally, as instructed.

## Thursday 8 October 2026 — TD2C stops, V2 walks slowly, and the pivot to promotion

**Evidence:** [FC-Sim Git] 32 commits on `prototype/physical-character-v2`, `0c11450` (14:34) → `0ddba2b` (05:11, 9 Oct), none pushed by 06:00; 2 documentation commits on `touchline-current`, `36e6f58` (14:52) and `39770e5` (15:43). [Doc] `DECISIONS.md` E2-22 and the sections dated 2026-10-08 (architecture pivot) and 2026-10-09 (SLP-1 … D-1F1); `e2/TD2C_RESULTS.md`; `diagnostics/loco_probe_2026-10-08/`, `loco_cf1` … `loco_cf6_2026-10-08/`, `loco_cf5_speed_2026-10-08/`; `slp1/`, `slp2/`; `PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md`; `pi1/` with `pi1/f1/`. 23 files in `sources/`: 13 dated 8 Oct (including the CF-6 human walking calibration pack the user supplied) and 10 dated 9 Oct, all inside this chronicle day. [Session] the times of the user's messages, from the Claude Code session record (UTC + 1 h). [Local] the portfolio package. One owner screenshot.

**TD2C result, early afternoon** (`0c11450`, 14:34).
- The battery had been frozen and started at 04:53 under the overnight instruction (7 Oct entry). 3,552 / 3,552 runs, 04:53 – 14:27. The machine slept for about 8 h mid-battery; the runs were paused, not altered.
- **DOES NOT VALIDATE as preregistered, on U-1 only.**
  - Pass: C-1 … C-10 (the full touchdown contract), C-6x classification, U-2 … U-7 (all 1,296 obstacle runs RECOVERED, no abort or fall), TD-G2 / G3, DG-6 / DG-4b.
  - Fail U-1 in 54 runs, all at the +20 mm obstacle: 180 Hz 48, 240 Hz 6, 480 Hz 0. Σ+ 0.501 – 0.771 J against 0.5 J; 18 runs (all 180 Hz) also exceed a collision window's cumulative +0.05 J.
- **Mechanism** (post-hoc, labelled):
  1. the first contact force comes one tick before the sensed onset, so the frozen window (A2.8) misses the impact's dissipation tick. Measured from that tick, the collision's net closure is −0.35 J;
  2. the positive closure accompanies IK-derived feed-forward held across the impact: no feed-forward 0.14 J, guard off 0.98 J, DVG 0.77 J. DVG reduces it rather than causing it;
  3. read as a timestep-proportional ledger closure error at a stiff impact, the TD-15 class. Not established: no independent fine-time-step work integral was computed.
- SV-2R, evaluated as a diagnostic only, would validate (432 / 432; allowance 1.75 … 0.55 mm, not entered). The declared smoke SMK-R shows the R-B recovery touchdown still failing R-4 / R-5 on the final configuration.
- Stop rule applied: no E2 integration, PG-1 or official E2. The three options in `TD2C_RESULTS.md` §4 (keep U-1 and investigate the ledger; a versioned U-1; a controller change at impact) were never taken.

**Publication, mid-afternoon** ([FC-Sim Git] `touchline-current`; [Local]).
- The user supplied Astra's reconstruction of the 1 – 7 Oct chat history (14:39). `36e6f58` merged it by hand into the 1 – 7 Oct entries, added the [Chat extraction] label and Appendix G, and located 26 of 30 queued originals (`ORIGINALS_STATUS.tsv`). It also corrected the 7 Oct entry's "no longer in `~/Downloads`".
- The user then asked for a portfolio-media archival pass (14:54). `39770e5` added eight owner screenshots under their days and pointers in the chronicle. [Local] The portfolio package gained stages 23 – 29: 75 media and 5 originals (Appendix G).

**The locomotion viability probe** (`9595dcb`, 16:11).
- User (15:50): "Before spending another long cycle closing the current E2/TD2C qualification blockers, run a small, diagnostic-only downstream locomotion viability probe of V2." And: "A character that walks six ugly but genuinely physical steps is much more encouraging architecturally than a beautifully qualified isolated step that cannot transition into another one."
- The harness (`tools/loco_probe.mjs`) composes existing primitives on one continuing simulation, PSTAR5CHABV: the λ transfer, the E2 release rule, and one E2 commanded step per step from a fresh StepSequencer. The TD2C coordinator was not used, because it had not validated.
- 16 runs at 240 Hz: V2-REF, V2-165-62, V2-198-92 and V2-long-legs × L / R × forward / lateral.
  - Step 1 is clean on all 16: liftoff 0.12 s, contact at φ 0.91 – 0.92, clearance 6.5 – 6.8 mm, slip ≤ 0.01 mm.
  - Step 2 never starts. Forward, the lateral-only transfer leaves the trailing foot at 12 – 14 % BW, so it is never released (A, missing gait-level transfer planning). Lateral, the stance-only supervisor aborts the wider transfer at share 0.85 (B).
- No body, contact, actuation or energy problem (no C). Probes 2 – 4 not run (stop rule). **Verdict YELLOW.**

**CF-1 … CF-3, late afternoon** (`5b87cbd` 16:25, `dafecd5` 17:04, `51461ab` 18:40). Each counterfactual lives only in the harness behind `--cf=N`, default off, and every earlier study reproduces bit-identically.
- **CF-1, the between-steps transfer.** User (16:13): "once the identified missing between-step gait-transfer layer is supplied, can the existing V2 physical character and existing step primitives genuinely chain repeated steps?"
  - The existing DCM Hermite, from the measured DCM to the new stance foot's region centroid, in 2-D over 4 s.
  - Forward, the transfer succeeds (DCM error 0.3 – 0.5 mm; trailing foot 0.17 % BW and released). Then the single-step planner refuses step 2: 35 / 35 reach nodes fail the path certificate, the trailing leg's mid-swing needing 2.65 – 5.25° of ankle dorsiflexion beyond the soft box (A).
  - Lateral, the transfer leaves 1.2 – 1.6 % BW on the trailing foot (B). No physical step 2. YELLOW (strengthened).
- **CF-2, the trailing-leg swing, forward only.** User (16:46): "Planner acceptance alone is not a step."
  - Diagnosis: mid-swing needs 20.1 – 25.3° dorsiflexion at 25 – 41° knee flexion. The planner's static box allows 20°, while the body model's own coupled passive limit, already applied in the physics, allows 24.2 – 26.8°.
  - CF-2 retries a failed soft IK solve with that coupling law as the bound. No new parameter.
  - 9 consecutive physical alternating steps on all 8 runs (72), every metric stationary (foothold 1.2 – 2.6 mm, slip ≤ 0.04 mm, E+ ≤ 0.058 J).
  - Step 10 is refused: "forward" is the stance foot's 7.1° toe-out heading, so the stance narrows 12.6 – 12.9 mm per step (predicted 12.4) until side-by-side footholds overlap the boot (A). GREEN (provisional, quasi-static).
- **CF-3, a walking frame and a cadence sweep.** User (18:06): "What happens when the next step begins before the errors and momentum from the previous step have disappeared?"
  - The frame is fixed at t = 1 s (the feet's heading bisector; width = each body's initial stance, 0.158 – 0.190 m).
  - Stage 1: 20 consecutive physical steps on all 4 bodies, bounded and periodic, with a 10 s release window. With the original 3 s window three bodies stop at step 6.
  - Stage 2: nominal 5 / 3 / 2 s per step run 20 / 20, but the realised cycle is ≥ 4.3 s. The trailing foot is released only after the DCM settles (lag 2.2 – 3.9 s), so COM speed is ≤ 2.1 mm/s at every swing decision (B). At 1.5 s the double-support-to-midpoint plan is refused (A).
  - GREEN (provisional): no C in four studies.

**CF-4, CF-5 and the speed ladder, evening** (`bb6505d` 19:36, `30273b1` 20:14, `ab78bee` 20:59).
- **CF-4, momentum-carrying gait.** User (18:47): "Did we finally test the regime in which V1 failed—successive swings beginning with momentum from previous steps—and what happened?"
  - Direct stance-to-stance transfer plus planned trailing-foot unloading; every trailing foot released 0.117 s after the transfer.
  - Every swing starts with forward COM 23 – 46 mm/s (11 – 22× CF-3). 20 / 20 bounded periodic steps on all 4 bodies at 2.75 and 1.73 s per step; 60 / 60 on the two bodies run longest.
  - The unchanged E2 stop-step swing still brakes the momentum before touchdown (COM −6.4 … +1.2 mm/s). GREEN (scoped); the document records that on a strict reading of "continuous gait" it is YELLOW.
- **CF-5, a continuous forward walk.** User (19:49): "If forward velocity repeatedly collapses near zero at touchdown, explicitly report NOT CONTINUOUS WALKING regardless of how many steps complete."
  - One walking swing / foothold plan on CF-4 (periodic DCM offsets; foothold from the achievable touchdown DCM).
  - Forward COM survives every touchdown (24 – 26 mm/s, never below 16 mm/s in a cycle). 19 consecutive genuine continuous steps on all 4 bodies (20 / 20 physical); periodic within 2 – 3 steps, period 1.74 s.
  - Very slow: 0.034 m/s mean, capped by the planner's 0.13 m corridor (step ≤ 0.065 m). No failure, no C.
- **The speed ladder.** User (20:35): "A planner simply refusing an infeasible faster foothold is not C."
  - Only `--Tst` / `--Tsw` varied; 30 runs, each executed twice with identical hashes.
  - Continuous to 53.0 mm/s on V2-REF (0.89 steps/s) and 43.0 – 43.4 mm/s on all four bodies (0.73 steps/s).
  - First refusal at 59.6 mm/s (0.98 steps/s) on V2-REF, and at ≈ 53 mm/s on light / short (step 11) and heavy / tall (step 4). The unchanged stop-step capture certificate refuses every corridor foothold (A), driven by the balance law's DCM tracking lag (B).
  - No flight (both feet down 54 – 68 % of the cycle). Ankle-inversion saturation depends only on cadence up to 0.73 steps/s; above that it accumulates step to step, reaching a plateau within ~12 steps where the run continues. Recommended next: production walking development, not a running prototype.

**The replay viewer and CF-6, late evening** (`1e98e1d` 22:30, `b6edadc` and `7651a25` 23:03).
- **Viewer** (presentation only). A pose recorder re-executes the unmodified harness and writes a replay only if every per-second hash and the end hash match the evidence; a WebGL page plays it back with telemetry. [Session] At 21:07 the user reported that the local server was opening a directory listing instead of the page. The committed replays: CF-5 V2-REF 20 steps (39 / 39 hashes), CF-6 0.1 m/s 60 steps (58 / 58), the CF-6 0.2 m/s attempt (12 / 12).
- **CF-6, a walking-gait counterfactual.** User (21:30): "I watched the authoritative CF-5 replay. The important result is that V2 is physically stable and genuinely stepping continuously, but the motion is still clearly a slow stepping controller rather than a real human walking gait."
  - The draft preregistration stopped for missing evidence. User (21:49): option (a), shorter steps at higher cadence, with heel–toe allowed to emerge (c), no pelvis-height motion (b): "Do not force human step lengths that the fixed-height V2 body cannot physically reach."
  - The user supplied an external human walking calibration pack (22:19; M / D / F labels kept). The preregistration was frozen at 22:30: mechanisms M1 – M3, ladder L1 – L5 from the pack, flat-foot step limit 0.38 – 0.42 m by body.
  - **Result (V2-REF only; the stop rule ended the study there).** L1, 0.4 m/s, fails at step 2. The 0.2 m/s bracket walks 8 physical steps (6 continuous, 0.2045 m/s) and fails at step 9.
  - At 0.1 m/s: 60 / 60 physical, 59 consecutive continuous, P1 – P4 pass (0.1008 m/s, 65.8 steps/min, step 0.092 m, double support 30.6 %, clearance 7.1 mm).
  - First blocker in both failures: the double-support handover. The lifecycle's acceptance time uses up the transfer, the DCM ends short, and the CF-4 CoP pin lets the shortfall diverge while the trailing foot is not released (A + B).
  - Saturation stayed ≈ 0 and hard margins > 5° until the DCM was 0.3 – 0.8 m outside support. No C.

**The first pivot: a supported physical character** (`836437b`, 23:26).
- User (23:12): "Approved: pivot the physical-character V2 production architecture now." CF-6 was closed as evidence: 59 continuous steps at 0.10 m/s, "not considered production-quality walking; it is evidence about repeated physical support stability".
- The football simulation owns the trajectory; V2 remains the physical character; an artificial support / locomotion-authority layer keeps it upright with contacts live. "Do not implement an arbitrary impulse > X = ragdoll rule." No CF-7.

**The SLP series, around midnight** (`49785b7` 23:46 → `e63be8b` 01:55, 9 Oct).
- **SLP-1** (approved 23:30 with amendments 1 – 4, "support must not cheat"; frozen `49785b7`; code `a38e8fa`; result `627d935` 00:14).
  - A turf↔pelvis 6-DOF spring with caps derived from V2, a recoverability authority α, and a 21-case disturbance matrix that includes a genuine rigid impactor.
  - **STOPPED at calibration:** no support frequency (1 / 2 / 4 Hz) meets A1 – A6 at 1.2, 3 or 6 m/s. Stop rule: "ordinary undisturbed motion requires forces beyond the frozen caps".
  - Walk: tracked at 1.197 – 1.203 m/s, but the support saturated on 68 – 93 % of ticks (pitch / roll cap 81.8 N·m) and carried 74 – 88 % of body weight. Jog / run: the forward cap (275 / 334 N) saturates, then a fall at 2.36 – 2.88 s.
  - CPU 933 – 952 µs per step against 892 for autonomous V2: no saving.
- **SLP-1b** (user, 00:36: "the artificial support must remove autonomous balance, not replace ordinary locomotion forces"; amendment `1137244`; result `e4f572f` 00:55).
  - The legs take pelvis orientation and propulsion; caps unchanged.
  - **STOPPED:** walk falls at 2.42 / 6.91 s or is dragged; jog falls at 2.08 – 2.17 s, run at 2.61 – 2.73 s. The legs carry 78 – 123 % of body weight, but the support still supplies 52 – 88 % of the forward impulse.
- **The separation** (user, 00:59; `a9450d1`): "authoritative football locomotion may supply ordinary translational motion directly". Three layers: A, locomotion authority; B, support / recoverability; C, leg / skeletal locomotion. B's caps stay tied to recovery.
- **SLP-2** (approved 01:07: "A does not compensate leg forces"; frozen `03455b8`; result `e3c99e1` 01:20).
  - A, a uniform whole-body field α·m_i·a_T, delivered exactly M·v (94.69 / 236.7 / 473.46 N·s), read no state, applied no torque and cost ≈ 3 – 7 µs per step.
  - **STOPPED:** the legs braked −202 to −369 N·s and B absorbed it, so A9 (B ≤ 25 % of caps) and A10 failed at every speed. Jog falls at 2.38 – 2.60 s, run at 2.85 – 2.93 s.
- **SLP-2C, contact-compatible legs** (user, 01:39: "I specifically want to know whether C has become mechanically neutral with respect to authoritative translation while remaining physically real."; frozen `b35b31a`; result `e63be8b` 01:55).
  - **STOPPED at stage 1:** the 1.2 m/s walk falls at 2.358 s (hash `d05c186a`, twice).
  - C2 removed stance braking but overshot into propulsion that B cancelled (+27.4 N·s).
  - C1 cut touchdown speed to 0.045 m/s, but its compressed swing (1.33 m in 0.247 s) could not be followed: the trailing foot lagged by up to 0.88 m and dragged on the turf (−62.6 N·s) before the pitch collapse.
  - C was physically real but not mechanically neutral. P9 passes.

**The second pivot: cheap locomotion, promotion into physics, PI-1** (`e01bb67` 02:16, `6ef7e1e` 02:41, `529d8a5` 03:02).
- User (01:59), option 3: end the SLP series. "Fully physical foot-ground contacts will not be required during ordinary unobstructed locomotion." And: "This is not evidence that V2's physical body failed."
  - Ordinary locomotion becomes simulation-authoritative procedural skeletal locomotion with foot IK, with no V2 stack per tick.
  - A player is promoted into V2 physics only for a meaningful interaction, from a consistent pose and momentum. The simulation stays authoritative over the outcome, and the body returns to locomotion deterministically.
  - A is retained as a validated mechanism, B as recoverability research. V2 is untouched.
- **CPU estimate** (`PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md` §8). Continuous V2 for 22 players costs 4.3 – 5.1 s of CPU per simulated second (SLP-2 figures; M4, single thread, unoptimised); procedural locomotion with IK ≈ 0.13 – 0.16 s. The promotion architecture is therefore estimated at roughly 18 – 38× less on average. The promotion rates in that estimate are assumptions, not measurements.
- **PI-1** (designed in `e01bb67`; approved 02:20 with D-1 … D-5, D-2 modified; frozen `6ef7e1e`). One runner is promoted into the Tackled-Player V1 (`f5f6076`) slide-contact pair (near miss → recover → fall), using a V2 runner body from the Vinícius record (1.76 m, 73 kg). User: "The simulation remains authoritative over gameplay state; the physical presentation is allowed to determine the detailed body trajectory of an already-authorized fall."
- **STOPPED at the D-1 body check** (`529d8a5`), before any PI-1 physics.
  - The AIR export is complete. The baseline reproduces (CORRECTION J 4.26 N·s, FALL SIDE J 116.93 N·s, both at tick 50), and gameplay hashes are identical across OFF / FULL / LOCO.
  - The record body fails G0 anatomical-band rows (hip spacing 0.305 m, shoulder 0.494 m).
  - It also fails G1 isoSelfCol 1.4d: boot↔boot 24.6 mm against ≤ 10 mm (V2-REF 3.0 mm).
  - The stop report also claimed a weight-bearing mismatch, withdrawn below.

**D-1A, D1C and the compatibility gate** (`6726ad5` 03:32, `d000cee` 03:39, `ab9a626` 03:44, `3a140db` 04:17).
- User (03:12): "Do not accept a D-1 exception or modify the rig yet."
- **D-1A, read-only.** The 24.6 mm penetration is unreachable in the recorded PI-1 motion (closest boot↔boot 205 mm).
  - The "mismatch" was a one-tick reading error: AIR row k is the state after squad tick k + 1. Both systems have the left foot planted.
  - The recorded fall collision is not representable: the simulation's V1 capsules sweep the planted foot by 33 – 64 mm, where the D-1 boot is only grazed (≤ 9.5 mm), and solid contact comes ≈ 0.2 s later.
  - Recommendation D1C.
- **D1C accepted** (03:36): the old fall case is withdrawn; a PI-1-scoped isoSelfCol exception is permitted, with 10 mm still enforced in every PI-1 state. The rule added to the architecture: "A gameplay collision may be simplified, but it cannot claim an interaction that the corresponding physical character cannot plausibly reproduce." The gate thresholds were fixed (`ab9a626`) before any V1.2 record existed.
- **V1.2 gate: FAILS → STOPPED for review** (`3a140db`).
  - Slide-contact V1.2 (`e2c98ec`) supplies all three cases by its own rules: near miss (+1.01 m), swing-shin CORRECTION (J 10.4 N·s), planted-shin FALL SIDE.
  - Near miss passes. Both contact cases fail segment / region (CG-1 / CG-5) and pose continuity (CG-7). The runner's gameplay capsules (`ptRxBody`, a default 0.865 m leg) strike the ankle or lower shin, where the promoted body is hit at the forefoot or instep. None of the other 16 fixtures passes.
  - Knee = B: the R-K retarget makes the centres exact (≤ 0.004 mm, from 37.6 mm).
  - Boot / foot = C: a rigid ≈ 0.22 m V2 boot against the presentation's 0.27 m foot + toe. Toe-pivot frames need 5.8 – 15.6° extra pitch with 25 – 42 mm of toe penetration, and the heel is 6 – 11 mm below the pitch at heel strike.

**The toe body, before dawn** (`7c090de` 04:40; `8d2c04b` and `0ddba2b`, both 05:11).
- User (04:20): Options 1 + 2. "Do not weaken or reinterpret the frozen 30 mm adjacency criterion, and do not solve this by restricting promotion to convenient frames."
- **Frozen** (`7c090de`, before any corrected code):
  - CHARCOLLIDE-1: runner leg / foot / toe capsules from the character's own skeleton, as a new simulation baseline;
  - D-1F1: a V2 spec §12.3 toe body (record heel / tip, transverse MTP hinge, 16.5 % of the foot + boot mass, passive 0.75 N·m/deg, no actuator);
  - PM-1 promotion mapping and the promotion tolerances.
- **D-1F1 built** (`8d2c04b`), default-off. Construction exact, existing spec hashes unchanged, deterministic.
  - New G1 ESSENTIAL failures against F0: drop1m 1.2a / b +3.607 J in one landing step; leanF +0.741 J; singleLeg 1.4f, which also happens with a rigid long boot and is explained by the intended change.
  - isoSelfCol improves 24.59 → 13.84 mm; MTP minimum margin 4.9°.
- User (04:57, overnight instruction, while the diagnosis ran): "Do not endlessly tune it overnight." And: "A failed experiment is an acceptable overnight result."
- **Diagnosis and stop** (`0ddba2b`).
  - The energy rise needs both a separate light (0.198 kg) body carrying turf contacts and contact-lambda warm starting. It persists with the toe locked and vanishes as one rigid body; joint warm start is not responsible.
  - No leaf-local probe fixes it: passive law, lock, one hull, inertia ×4, mass 18 %, hinge gaps.
  - The global alternatives fail other rows. At 480 Hz the energy is fixed, but F1 awkward reaches the hip emergency stop in 5 / 5 members, at ≈ 1.85× CPU. With contact warm start off, resting penetration reaches 5 mm in F0 and F1, and F1 awkward 1.3b fails 4 / 5.
  - Toe work stopped under the hard stop. Nothing adopted; no criterion changed.

**Owner screenshot.** [The CF-3 report as shown in the session](../review_artifacts/chronicle_screens/2026-10-08_physical_character/Screenshot_2026-10-08_at_6.46.12_PM.png) (18:46). It ends 'Verdict on "Is V2 a credible architecture on which to build actual continuous walking?": GREEN, provisional.' (`51461ab`).

**Corrections and process errors.**
- **TD2C.** U-1's preregistered window starts at the sensed onset, one tick after the first contact force. Found post hoc and not corrected, because the criterion is frozen.
- **CF-3.** The physical-step flag counted the touchdown tick's 0.00 mm clearance and spuriously failed 2 long-legs steps (measurement only; same end hash).
- **CF-4.** Three harness defects were fixed before any reported result:
  - a `//` comment that disabled the shadow test;
  - a shadow test on the wrong stance foot;
  - a missing landing error.
- **CF-4 tables (corrected during CF-5).** `CF4_TABLES.md` held a misfiled CF-3 block, because the report tool selected runs by label substring.
- **CF-6.** Event-anchored stride segmentation was added to the analysis after rebounds of up to 108 ms; it is identical on the clean 0.1 m/s run.
- **SLP-1.**
  - Amendment 2 reverted freeze-time change 5 after smoke run 0 (pelvis 6 – 9 cm high, fall at 2.21 s).
  - Two implementation fixes: a crash in the `pitched()` sign test, and a `_sense` stub for the lean CPU mode only.
  - The ≈ 10 – 20 % CPU saving estimated in the design was not demonstrated.
- **PI-1.** The stop report's weight-bearing mismatch was a one-tick record-reading error. It is withdrawn, and an erratum is appended to that report.
- **D-1F1.** Measurement corrections M1 – M4 (toe bodies in `firstNonFoot` and the 1.4f sole classification, the F1 construction checks, the MTP display) were disclosed separately from the physical failures.

**Adopted / not adopted.**
- **No code or configuration adopted.** The adopted configuration is still PSTAR5CHABV (DVG, adopted at 04:53; 7 Oct entry).
- **Failed or diagnostic, preserved as evidence:** TD2C (FAIL), CF-1 … CF-6, SLP-1, 1b, 2 and 2C, and the D-1F1 toe body (default-off).
- **Decided (architecture, not implemented):**
  - cheap simulation-authoritative locomotion plus promotion into V2 physics, superseding continuously supported physical locomotion (the 23:26 direction) for ordinary movement;
  - A retained as a validated mechanism;
  - the collision-geometry mapping rule;
  - D1C, with the PI-1-scoped isoSelfCol exception.

**End-of-day state** (06:00, 9 Oct).
- **Toe work stopped** at `0ddba2b`. Options 1 – 4 in `pi1/f1/F1_TOE_FAILURE_REPORT.md` §8 await the user:
  1. a time-boxed solver investigation;
  2. a versioned global change, 480 Hz being the closest;
  3. keep the rigid boot and resolve class C in the presentation;
  4. CHARCOLLIDE-1 alone.

  The recommendation is 1, with 4 in parallel.
- **Not started:** CHARCOLLIDE-1, PM-1, the slide-contact rebaseline, the gate rerun and PI-1.
- **E2:** TD2C stays FAIL at E2-22 with its decisions untaken. No E2 integration, PG-1 or official E2.
- **Publication:** 36 local commits above the published `21b6f06`, not pushed (4 from the 7 Oct day, 32 from this one).

---

# Part V — The present

## Friday 9 October 2026 — Track A closes, PI-1 hard stops, and the interaction-time pivot

**Evidence:** [FC-Sim Git] 48 commits on `prototype/physical-character-v2`, `7111a04` (13:26) → `c647f4c` (05:09, 10 Oct); `5042230` (13:46) on the new branch `prototype/slide-contact-v1.3-charcollide`; `9d57d46` (23:28) on the new branch `prototype/locomotion-continuity-v1`; 21 RUN-1 commits on the new branch `prototype/locomotion-v2-run1` (from `9d57d46`), `8e3f4949` (05:07) → `affc30b0` (05:52, 10 Oct), covered in their own paragraph. The morning housekeeping commit `bb96657` (06:00) on `touchline-current` and the 06:01 pushes are in the remote-tracking reflog. None of the later commits was pushed by 06:00 on 10 Oct. [Doc] `DECISIONS.md`, the sections dated 2026-10-09 from Track A / B onward and those dated 2026-10-10; `pi1/track_a/`, `pi1/trackB/`, `pi1/rev1/`, `pi1/rev2/`, `pi1/hga/`, `pi1/moving_handoff/`, `locomotion_continuity/`, `promotion_carrier/` (with `slice/` and `leg_law/`), `consolidation/`, `interaction_benchmark/`, `interaction_time/`. 13 user decisions and instructions saved verbatim in `sources/` (6 dated 9 Oct, 7 dated 10 Oct). [Session] the times of the user's messages, from the Claude Code session record (UTC + 1 h). Four owner screenshots.

**Publication housekeeping, 06:00** (`bb96657`).
- This ran under the overnight instruction (04:57; 8 Oct entry): "At the start of the new development day under the existing 06:00 rule, before continuing new work, perform the established daily publication housekeeping".
- `bb96657` added the 8 Oct entry, the 7 Oct catch-up notes, the Part V state and one owner screenshot.
- **Pushed at 06:01, unchanged:**
  - `prototype/physical-character-v2` `21b6f06` → `0ddba2b`: 36 commits, 4 from the 7 Oct day and 32 from 8 Oct;
  - `touchline-current` `39770e5` → `bb96657`.
- No further commit until 13:26.

**Track A: the toe and contact warm start, early afternoon** (`7111a04` 13:26, `34cb41a` 13:32, `c94ff5d` 13:43, `dc9b35f` 13:46, `24a8803` 13:47).
- User (13:23), answering the toe report (8 Oct entry): "Approve Option 1, with Option 4 in parallel." And: "If no clean local/principled solution emerges, close Track A as an engine/configuration limitation and retain the rigid-foot fallback. Do not spend the day tuning Jolt."
- **Preregistered and frozen** before any instrumented run: Jolt v5.6.0 source facts, decoding of the contact cache through the state recorder, per-contact work attribution, single-step counterfactual restores, hypotheses H1 – H5, at most 3 mechanism-driven fixes.
- **Mechanism** (frozen with the candidates, before any candidate ran).
  - The separate 0.198 kg toe makes the foot's support subsystem ill-conditioned for the sequential-impulse solver. The toe contacts' effective mass is 0.027 – 0.155 kg, coupled to a 1 kg foot that carries body weight.
  - At 150 iterations the solve does not converge, and warm starting carries the unconverged remainder in as positive work.
  - drop1m: the stale impulses are the rear foot's landing impulses (202 N·s offered vs ≈ 15 needed): +3.607 J. With 300 iterations, or cold, the step gives −4.287 J. F0 converges at 150.
  - leanF: the toe carries load with no topology change, and the solve is unconverged even at 4,800 iterations.
- **Candidates.** Cold leaf contacts, and a reset when the loaded contact set changes (the user's suggestion), both fix drop1m but fail leanF (+0.569 / +1.611 J) and resting contact (penetration 3.5 / 5.1 mm). More iterations was excluded by the evidence. No candidate was frozen, so no battery ran.
- **CLOSED as an engine-solver limitation. F0 retained; nothing adopted.** The toe is not fixable by any warm-start policy within the accepted Jolt configuration. The routes left are versioned model-level designs: a compliant toe joint, a reduced-coordinate foot-chain solve, or a non-physiological toe mass. The record calls this a solver-class limitation, not evidence against V2's anatomy.

**Track B: CHARCOLLIDE-1 and slide-contact V1.3** (`dd88ee9` 13:33, `469d7ef` 13:38, `3e28e02` 13:43, `0a60763` and `5042230` 13:46, `6802742` 13:51, `e48fa5d` 14:18).
- **Frozen before any V1.3 code:** CHARCOLLIDE-1's operational details and PCG-F0, a pose-compatibility gate for the rigid F0 foot (rows P-1 … P-17).
- **Amendment A1** (before any code or fixture). The frozen capsule placement protruded 3.8 mm at the rounded heel and 10.0 mm at the toe spring, so A1 takes the largest inscribed sphere at each end.
- **The vinicius profile** (`3e28e02`): thigh 84.5 → 59.8 mm, shin 53.6 → 36.1, foot 29.5 → 24.8, toe 9.4 mm.
- **V1.3, a new simulation baseline** (`5042230`, branched from `e2c98ec`; local).
  - The profiled runner's leg, foot and toe contact segments come from the character's own skeleton, posed by the shared locomotion law at the simulation's stride clock.
  - The legacy path is byte-identical (480 / 480 unit cases).
  - The commit: "Gameplay outcomes for the profiled runner are expected to change; nothing was tuned to preserve or obtain any outcome."
- **Amendment A2** (before any gate evaluation) fixed the operational gate definitions. Its P-17 floor of 1 kg·m²/s was "chosen from no data".
- **Neutral:** with the profiles removed, V1.2 hashes reproduce 19 / 19; modes are identical 26 / 26; export twice 20 / 20.
- **The rebaseline supplies all three classes naturally:** a near miss at +1.13 m; rx_free_leg, a STUMBLE through a toe_R contact; rx_planted_leg, a FALL SIDE on the planted shin_L (J 144).
- **0 / 26 pass the unchanged gate. All three PI-1 classes BLOCKED; PI-1 not run.**
  - The blockers: the rigid F0 boot against the presentation's toe pivot / heel strike (P-9); the frozen R-K retarget's long-axis twist rates (P-15 / P-17); contact location (CG-1 / CG-4).
  - rx_behind_standing fails only CG-7's tackler-primitive continuity, 17.9 vs 10 mm.
  - F0 is compatible with ordinary running only in pre-heel-strike windows of ≤ 7 frames.
- No V2 body or joint limit: the pose rows pass almost exactly (pelvis 0 mm, knee / ankle ≤ 3 µm). The runner body model costs 67.4 µs per call with CHARCOLLIDE-1, against 2.98 µs for the legacy model (unoptimised).

**PI-1 Revision 1, mid-afternoon** (`ebfb90b` 15:42, `c437d0c` 15:53, `d7d49e0` 16:03).
- User (15:40): "Knee mapping: fix the mapping, not the body." And on the tackler: "Do not simply raise 10 mm to 17.9+ mm after seeing the result."
- **Frozen:**
  - PM-2, a minimum inertia-weighted-displacement knee retarget;
  - RF-1, a rigid-foot reconciliation (the physical foot pitched to the turf; the rendered foot blends to physics over 0.10 s);
  - the tackler criterion retained as gating.
- **HARD STOP.**
  - The tackler: a rigid stand-in frozen at k_p diverges wherever the far-rule leg still extends or sweeps. First contact lands on a different segment, 7.5 – 12 ticks late, or never; the leg endpoints at contact differ by 112 – 1,050 mm.
  - PM-2 is worse than R-K on MC-1 / 2 / 3 and was not adopted. The spin comes from the presentation's plant-IK on / off steps (a ≈ 4.5° knee-plane jump in one frame), which no causal hinge mapping can absorb.
  - RF-1 raises the eligible promotion frames from 6 to 10 of 26. At toe pivot the rigid boot cannot reach the turf (≥ 22.9 mm).
  - The gate rerun gives 0 / 26: near miss 0 / 5, recoverable 0 / 4, planted-leg FALL 0 / 8.
- Architectural answer: not yet demonstrated. Simulation authority held throughout.

**PI-1 Revision 2, late afternoon** (`7f76e82` 17:08, `f8cd44a` 17:13, `f2016c6` 17:18, `cf1d412` 17:24, `881f5b3` 17:39).
- User (17:03): "After promotion: stop requiring the physical body to reproduce future authored/presentation poses." And: "If Revision 2 still produces zero representatives in any class, stop and identify the smallest remaining blocker. Do not introduce Revision 3 automatically."
- **Frozen:**
  - a strict handoff gate at k_p, including HG-A (the authoritative COM velocity) and HG-T (the stand-in can be instantiated);
  - no presentation targets after promotion;
  - PS-2, an outcome-neutral latest-clean-frame selector;
  - AST-1, a two-segment stand-in tackler (torso plus slide leg);
  - a demotion gate.
- **Amendments before the scan:** A1 compares the decisive gameplay contact with the first physical contact. A2 detects physical contact from the stand-in's contact impulse, because a 2-case smoke test showed that the touching-depth test missed Jolt's speculative-contact collisions (smoke outputs superseded).
- **HARD STOP: NEAR MISS 0 of 7, RECOVERABLE 1 of 4, PLANTED-LEG FALL 0 of 8.**
  - Only 3 of 26 candidates reach a valid promotion frame, all standing runners.
  - rx_behind_standing passes end to end: zero handoff discontinuity, stand-in tracking 0.05 mm, physical contact on the same segment and sub-step as gameplay, 37 mm apart.
  - rx_facing_front fails CG-1: the F0 boot is struck 93 mm from the ankle, before the shin.
  - rx_side_standing fails the retained 10 mm criterion at 10.8 mm. The cause is the simulation's own `SLIDER_BLOCKED_BY_FALLER` stop (3.0 → 0.4 m/s in one sub-step).
  - The smallest remaining blocker is HG-A. The pelvis moves at exactly 3.00 m/s, but the mapped COM velocity swings 2.2 – 4.0 m/s from frame to frame, and 48 window frames fail on HG-A alone.
- Architectural answer: demonstrated for a standing footballer up to and through the contact. Hand-back was not tested. Not demonstrated for a moving footballer.
- **Owner screenshot** (18:02): [the end of the REV2 report in the session](../review_artifacts/chronicle_screens/2026-10-09_physical_character/Screenshot_2026-10-09_at_6.02.32_PM.png). It recommends a separately approved presentation task, "mainly by smoothing the stance-leg switching".

**HG-A, early evening** (`b13cafd` 18:07, `192816b` 18:17, `09d67d9` 18:22; `f6265b5` 19:45, `cf144e8` 19:46).
- User (18:03): "Do not smooth or modify the running animation yet. Do not create Revision 3 yet." And: "I do not want to repair the animation merely to force instantaneous whole-body COM velocity to equal a constant gameplay trajectory velocity."
- A read-only investigation. The replacement criterion was frozen as a proposal (`192816b`) before any count.
- **What HG-A protected:** mainly total linear momentum, since without it the promoted body carries 6.5 – 89.5 N·s that the simulation never had. Its 0.05 m/s cap came from P-16, a mapping-fidelity tolerance rather than a visibility one.
- **The presentation** (22 moving candidates, 1,166 frames):
  - its COM velocity matches the authority over a gait cycle (≤ 0.015 m/s);
  - frame to frame it is non-physical: in flight it implies a 0.7 BW horizontal force and an 871 N·m torque (medians), and the pelvis height jumps by up to 72 mm in one frame.
- **Three handoffs:** A (REV2's velocities) imports the momentum error; B (every body at the authoritative velocity) destroys the internal motion, with segment jumps up to 14 m/s; C (a uniform shift to M·v_auth) is exact and preserves angular momentum and all relative velocities. C matches the architecture.
- **HG-A v2** (proposed): exact momentum through the one shift, |s| ≤ 0.180 m/s, from PR-2's 3 mm per 60 Hz frame.
  - Diagnostic count: 10 / 26 promotable, but the representatives stay 0 / 1 / 0. The admissible frames lie 1 – 9.25 ticks before contact, where the drift of the non-locomoting body binds.
  - New findings, not acted on (N1 – N4): unbounded vertical and angular imports; PR-2 would fail every moving promotion; contact-flagged feet move; "angular motion" was implemented as linear only.
- **Owner screenshots** (19:39, three): [the HG-A report in the session](../review_artifacts/chronicle_screens/2026-10-09_physical_character/), answers 1 – 6, including the A / B / C table.
- User (19:44): "Adopt HG-A v2 as the replacement for HG-A." And: "This is a correction of what the handoff should conserve, not a relaxation intended to make PI-1 pass." Versioned in `cf144e8`: v1 tolerated up to 3.7 N·s of momentum error, v2 none, and REV2's results stay as recorded under v1.

**The moving handoff, evening** (`1846be4` 20:17; read-only).
- **Presentation defects, by source:**
  - the pelvis-height pose term (unblended stance / flight / heel-toe switches and the flight bob): the vertical defect at every speed, and the only blocker of valid frames at 7.5 m/s;
  - plant-IK transitions: the main horizontal and leg error at 3 – 5.5 m/s. With the locks off, valid frames go from 20 to 75 of 302;
  - a ground-clamp root-bone bug (12 mm single-tick drops);
  - a stride clock built on a 0.865 m leg, against the rig's 0.834 m.
- **PR-2:** its REV2 reading tested limb acceleration and was the session's own error (0 / 208 moving runs pass). It should compare against the genuine continuation over the same frame, with the 3 mm kept.
- **Long-lead drift** (732 runs, no tackle). From fully valid frames, coherence lasts typically 1 – 2 ticks and at most 6, against required leads of 1 – 22 ticks (none at 7.5 m/s).
  - The causes: A, missing locomotion (primary); B, the pelvis tether at a fixed height; D, presentation artefacts.
  - No V2 body limitation.
- **Recommended, not implemented:** a general locomotion-presentation continuity correction.

**LC-1, the locomotion-continuity slice, late evening** (`df28867` 22:09, `313280f` 22:38, `f3cc1f6` and `9d57d46` 23:28, `19ff19d` 23:53).
- User (22:07): "Treat this as a small general locomotion-development slice, not as tuning the animation to make PI-1 pass."
- **Preregistered** before any implementation: criteria LC-1 … LC-8, design D1 – D7.
- **Implementation freeze** on `prototype/locomotion-continuity-v1` (`9d57d46`, from V1.3). Presentation only.
  - The build: a spring-mass vertical COM with ballistic flight (Morin 2005); continuous plants with a rolling sole; the root-bone fix; PR-2 v2; an angular handoff state, AH-1.
  - With `OF_CONT.on = false` it reproduces V1.3 bit for bit. The shared law, which the simulation's CHARCOLLIDE legs also use, is untouched.
  - Design changes made during development were recorded before the evaluation, each with the defect behind it.
- **Result (one evaluation on the frozen code): NOT continuous by the preregistered verdict.**
  - Pass: pelvis / COM C1 at every speed, ballistic flight ≤ 1.5 mm, no net drift, determinism, gameplay neutrality, V1.3 reproduction.
  - Fail: joint continuity except at 1.45 / 3 m/s; 60 Hz COM velocity and vertical force except at 3 m/s; planted slip at 5.5 / 6.5 / 8.2 m/s; the angular rows.
  - Three defects found after the freeze were recorded and not fixed.
- **Promotion:**
  - valid frames rise at 7 of 8 speeds (7.5 m/s: 30 vs 5 of 228);
  - a promoted unobstructed runner stays coherent for 2 – 6 ticks (about 1 – 2 under V1.3);
  - the REV2 scan with HG-A v2 gives 0 / 0 / 0, against the V1.3 control's 0 / 1 / 0, because rx_behind_standing's REV2 pass had relied on the 12 mm root-bone bug.
- CPU 154 → 694 µs per actor tick (Node, prototype). Browser replay: `locomotion_continuity/stride_replay.html`.

**The promotion carrier, after midnight** (`d91080d` 00:04, `da6b226` 00:29, `2c39acf` 00:38, `8585adc` 00:52, `fbdb6f5` 02:07).
- User (00:03): "I do not want to restart autonomous V2 walking/balance work."
- **Investigation (read-only):** the 1 – 6 ticks are not a translation failure.
  - At the first incoherent tick the root is within 9.5 mm and |Δv| ≤ 0.25 m/s, but the legs are 107 – 207 mm from the gameplay legs and B is at its torque cap.
  - A perfect translation carrier with the current legs fails NM-2 at t = 1 in 33 / 33 promotions.
  - Servos that read physical state would be a second recovery authority, and were rejected.
  - Recommended: feed-forward along the authoritative trajectory, with posture targets on the simulation's own leg law.
- User (00:35) approved D-1 … D-8, with one added criterion: "The locomotion gait driver itself must not erase the collision."
- **PCS-1** was preregistered and built: K0 passes in all three cases (bit-exact against the recorded `simBody`), and K4b passes for rx_miss.
- **STOPPED at the promotion-frame re-check.**
  - The preregistered frames k39 / k38 fail HG-T: the slide leg first reaches full extension at frame 43.
  - The investigation had taken them from `valid_on_rx.json`, whose "valid" flag leaves out HG-T. An erratum was appended.
  - Under the full gate: rx_miss k47 is valid; rx_free_leg's latest valid frame is k45 (4.25 ticks); rx_planted_leg has none.
  - No carrier run.

**AST-1E and the PCS-1 run, small hours** (`3ec464e` 02:18, `7b77dc5` 02:23, `bc12611` 02:27, `5e990e0` 02:35, `2306cc0` and `2a3f24c` 03:02, `badd7e9` 03:11).
- User (02:11): "Choose C, but constrain it very tightly." And: "At the physical collision itself, the contact response must be solved physically and must not be overwritten or cancelled by that prescription."
- **AST-1E**, an extending stand-in slide leg, following the record (it grows 0.0889 m per tick to 0.6401 m and is rigid after frame 43).
  - A1: it uses a MutableCompoundShape of 8 pieces, because OffsetCenterOfMassShape aborts this Jolt wasm build.
  - The gate gives frames 47 / 39 / 38, with hashes, the near miss and the contact regions all holding.
  - **STOPPED on item 2:** slide-leg tracking 12.99 / 13.23 / 12.24 mm against 10 mm. The tether's spring target, inherited from REV2's AST-1, is the end-of-step pose, while Jolt evaluates spring error at the start of the step (AST-1 itself: 14.45 mm).
- User (03:00): "Approve the one-line stand-in timing correction." With A2, checks 2 – 6 pass: 0.24 / 0.11 / 0.11 mm, frames 47 / 39 / 38.
- **PCS-1 STOPPED at case 1**, rx_miss, on pre-contact coherence. Runs were deterministic, and the driver commands were identical with and without the tackler.
  - Coherent for 3 ticks. Then the swing foot struck the turf 6 ticks early, with the pelvis 102 – 137 mm below the law's pelvis, and slid 141 mm.
  - B was saturated on 87 % of pre-contact steps, and feed-forward requests reached 3,198 N·m. The runner fell, and the dragging foot was struck at 59.75 (18.75 N·s).
  - rx_free_leg and rx_planted_leg were not run.
  - Attribution: the temporary gait driver plus the source law's non-physical vertical. No V2 body failure.
  - The core architecture is not yet demonstrated.

**The leg law** (`f7e78c9` 03:19, `ed582f8` 03:41; read-only).
- User (03:16): "Our next gate should be simpler: a promoted unobstructed runner must remain physically coherent for at least the entire longest required pre-contact window with no tackler."
- **The shared law's pelvis vertical is a geometric by-product.** At jog and above:
  - two thirds of stance needs a pulling ground force;
  - flight is non-ballistic;
  - take-off is −4.3 … −14.7 m/s;
  - the stance foot skates;
  - a spring-mass vertical sits 117 – 140 mm below the law's vault.
- **Predictions:** physical collision legs would change 12 / 26 first contacts, so this is a gameplay change. Even with a physical reference, the frozen carrier holds coherence for only 0 – 6 ticks (1.4 – 4.5 kN·m feed-forward): the carrier is the binding blocker.
- From 4.2 m/s the swing needs more hip torque than V2's modelled capacity: a candidate model limit, not an observed failure.
- Options A – D were put to the user. The recommendation was C, a read-only redesign of the carrier's actuation; it was not started.

**The pause and the consolidation** (`71129ac` 03:48, `15b0d5c` 04:12).
- User (03:47): "Pause all further PI-1 architecture development while an external architecture review is underway." And: "Then stop. Do not recommend or implement the next architecture."
- **Delivered, architecture-neutral:**
  - `consolidation/CANONICAL_EVIDENCE.md`: every experiment from CF-0 to the leg law, with 11 contradictions / open facts and 8 questions for the review;
  - the IB-1 interaction benchmark: five frozen scenarios from existing records (rx_miss, rx_free_leg, rx_planted_leg, rx_glancing, rx_behind_standing). The body bump and torso collision were not frozen, because no trustworthy case exists;
  - metrics H1 – H8 (hard) and Q1 – Q8 (quality);
  - a component audit (classification only);
  - a read-only extractor and verifier: 59 pass, 1 note, 0 fail.
- **Newly recorded:** rx_planted_leg fails V1.3's CG-1 / CG-3 / CG-5 rows; FULL / LOCO record bytes are not reproducible (a wall-clock `cpu` field).
- No existing tool, simulation, V2, Jolt setting or criterion changed.

**The interaction-time pivot and ITS-1, before dawn** (`2c6900d` 04:45, `cb886b1` 04:56, `c647f4c` 05:09).
- User (04:42): "Architecture decision: adopt the interaction-time physics pivot." And: "I am ending the attempt to make sustained autonomous V2 locomotion or pre-contact physical running a production prerequisite." And: "The objective is NOT to prove that V2 can run."
- *Transition:* the decision cites Astra's architecture review as complete. The review itself is not among the committed sources.
- **The architecture:** the simulation stays authoritative; ordinary locomotion is animation-driven, a separate effort outside this session; V2 is the interaction body, activated only for meaningful interactions. All CF, SLP, PI-1, PCS, LC-1 and V1.3 work is kept as evidence.
- **ITS-1, contract and preregistration** (frozen before any code).
  - V2 is initialized from the simulation's own collision-skeleton pose at τ_c − 0.25. Velocities come from a KE-metric projection: stance foot fixed, M·v_auth, vertical COM velocity 0, angular momentum from the authority.
  - The authoritative impulse is applied once, over one step, at the mapped point.
  - REV2's posture tone is frozen at initialization; there is no B, carrier or stand-in.
  - PI-1's locomotion gates are listed as not applicable.
- **STOPPED at PF-0, activation validity, before any struck run.** Four control runs (no impulse):
  - S-A (rx_free_leg, early stance) passes;
  - S-A2 (rx_free_leg, late stance) fails on slip, 18.8 mm;
  - S-B (rx_planted_leg, early stance) fails on activation load, 8.80 vs 6.04 N·s per step, with Σ+ 0.5115 vs 0.5 J;
  - S-B2 (rx_glancing, touchdown) fails on a 17.9 N·s-per-step slap and 12 mm of slip.
- **Attribution** (STOP diagnostics on the controls; the default path re-ran bit-identically):
  - the binding element is the frozen-target posture tone acting against the initialized stance-leg rates. With it off the impact vanishes, but the body falls freely;
  - also the rigid boot at heel strike, and a toe-edge support in late stance.
- Neutrality and determinism held. Physics costs 643 – 683 µs per step, ≈ 24 ms per 0.15 s interaction.

**RUN-1, a fresh production-locomotion track, before dawn** (`8e3f4949` 05:07 → `affc30b0` 05:52; branch `prototype/locomotion-v2-run1` from `9d57d46`, local).
- User (04:44), the overnight mission: "Make the footballer run beautifully." And: "Not: Make physics discover how to run." Ordinary locomotion is simulation-authoritative and animation-driven; the first target is one V2 player straight ahead at about 5 – 6 m/s, judged on the actual gameplay camera. [Session]
- **Construction**, presentation only, in new files (`sandbox/visual/run1/`, `run1.html`). No existing file was modified; Locomotion V1 and the shared law the simulation consumes are untouched.
  - A spring-mass pelvis: a half-sine stance force and ballistic flight (Morin 2005), scaled × 0.6.
  - A foot-space stance: a fixed plant that rolls heel → flat → MTP → toe pad, an analytic two-bone leg IK, and a knee-driven late stance.
  - A joint-space swing: Hermite curves matched in value and slope to the stance at toe-off and touchdown, so every leg channel is C1 through both contacts by construction.
  - A counter-rotating thorax, contralateral shoulder-driven arms and a stabilised head.
  - It runs on the real Vinícius mesh. The PI-1 V2 runner body was generated from the same rig, so the V2 proportions and joint ranges apply.
- **Research** (a read-only agent; `review_artifacts/locomotion_v2_run1/RUN1_RESEARCH.md`, measured vs design vs Touchline choices):
  - 192 spm, 0.175 s contact and toe-off at 28 % at 5.5 m/s;
  - stance knee 22 → 40 → 23°; peak swing knee 115° and hip 62°;
  - the wrist kept lateral of the midline (Hild 2005).
- **Viewer** `sandbox/visual/run1.html`:
  - the exact CAMERA_V1 gameplay camera plus close side / front / rear / ¾ views;
  - V1 driven by its own unmodified `ofActorTick` on a parallel lane;
  - playback at 1× – 0.1×, frame step, and skeleton / contact / COM / trail overlays.
- **Iterations 0 – 13** (`RUN1_ITERATIONS.md`):
  - an infeasible contact time for this leg;
  - a knee still extending at toe-off, which dragged the swing foot 7 cm through the turf (fixed by the knee-driven late stance);
  - a mirror-handed close camera that culled the real mesh's front faces;
  - "hands on hips" arms;
  - 74° of MTP extension at toe-off, replaced by a 52° cap and a toe-pad roll;
  - a swing foot passing through the stance calf at mid-swing (a sign error in the mid-swing abduction), now clearing it by 11 cm;
  - a gyroscope head and a pendulum hand path (found with a new motion-path plot).
- **Measured** (5.5 m/s, 60 Hz):
  - contact slip 0.000 cm, and C0 / C1 at both joins;
  - joint second difference p99, pelvis 0.29 and knees 2.96 cm per tick², against V1.3 12.0 / 21.7 and LC-1 0.58 / 11.1;
  - swing foot ≥ 11 cm from the stance leg, and every joint inside V2's planning box (hard − 5°) except 0.9° of sprint hip extension;
  - bit-identical across runs;
  - 24 µs per rig and 0.52 ms for 22 rigs, against V1.3's 2.86 ms (Node).
- **Generalisation:** jog (3.0 m/s) and sprint (7.8 m/s) anchors, a speed-grid cache of the solved gait, plants carried back by the root's own travel, and an acceleration lean. On the 3 → 7.8 → 3 m/s ramp, slip stays at 0.01 mm per tick.
- **Known deviations:** peak stance dorsiflexion is ≈ 32° (≈ 27° measured); the touchdown knee rate is ≈ 850 °/s.
- The work continues into the 10 Oct day.
- RUN-1 commits before 06:00: `8e3f4949`, `0dec5bd5`, `5daa2a0d`, `3a589a38`, `e2dfc0a8`, `c315e4c7`, `f89710fb`, `87840d6d`, `7ed8bb41`, `40158535`, `71f3b07f`, `ed98bfe3`, `a84dbf47`, `839cc357`, `694fe5a2`, `41110a54`, `a2373467`, `b35c974a`, `aad9da8d`, `6c6301d6`, `affc30b0`.

**Parallel work outside this repository** ([Local], file times only; not investigated). In the user's Codex workspace and `~/Downloads`, 10 Oct 03:06 – 04:58:
- `TOUCHLINE_PORTFOLIO_REV8.html` (03:06);
- `Touchline_Playable_Calendar.html` and `Touchline_Calendar_Source.zip` in `~/Documents/Codex/2026-10-05/new-chat-5/` (03:10);
- `2026-27-ratings-updated-ranked-2026-10-09.xlsx` (03:23) and `…-2026-10-10.xlsx` (03:44);
- a statistics build in `~/Documents/Codex/2026-10-10/new-chat/` (`Touchline_Playable_Statistics.html`, `build_statistics.py` and others, 03:09 – 04:58);
- `Touchline_Liverpool_2027_Fronts_and_Backs.zip` (04:51, 120.5 MB).

What was done is not reconstructed here.

**Corrections and process errors.**
- **Track B.** E1: a 10⁻¹² tolerance overlooked `gkRootMatrix`'s Float32Array storage (3.7 · 10⁻⁶ m). A gate bug that overwrote the fails list was fixed before any reported result; the pre-fix output and the failed pre-A1 profile are kept.
- **REV1.** PM-2 was called "free of constants", but it implicitly fixes a one-frame time scale. CG-7's implemented tackler metric differs from its text; this is disclosed and kept for comparability.
- **REV2.** Post-scan E1: CG-6 had been read after the contact impulse (74.3°); measured before contact it is 0.0°, and no count changes.
- **HG-A.** The report discloses that the 0.18 m/s tolerance, derived from PR-2, was written when the HG-A values were already known (screenshot, 19:39).
- **Moving handoff.** PR-2's REV2 reading was the session's own error.
- **LC-1.** The lead-drift harness copy (it holds the far stand-in) is disclosed.
- **PCS-1.** k39 / k38 were described as passing the full gate although HG-T had been left out. The original evidence is kept, with an erratum.
- **AST-1E.** A1 (MutableCompoundShape) and a harness logging fix are disclosed.
- **ITS-1.** V-3's 2·M·g·dt row is PI-1's PR-4 value, while running stance loads are about 2 – 3 BW. It was noted and not changed.

**Adopted / not adopted.**
- **Adopted:** HG-A v2 (`cf144e8`), a criterion correction.
- **Kept frozen as the gameplay-collision baseline for this work:** V1.3 (`5042230`), on its own branch and not merged (user, 15:40: "Keep V1.3 frozen.").
- **Corrected inside an experiment:** AST-1E A2, the stand-in's drive timing.
- **Decided (architecture):** PI-1 development paused; the interaction-time physics pivot (`2c6900d`).
- **Not adopted, kept as evidence:** the F1 toe, PM-2, LC-1 (on its branch) and the PCS-1 carrier.
- **Unchanged:** V2 and its adopted configuration PSTAR5CHABV, the Jolt settings and every frozen criterion.
- **Never run:** a PI-1 qualifying run, and an ITS-1 struck run.

**End-of-day state** (06:00, 10 Oct).
- **ITS-1 stopped at PF-0** (`c647f4c`). Decisions requested in `ITS1_STOP_PF0.md` §7:
  1. V-3 rows for running stance;
  2. an interaction-time stance tone;
  3. the treatment of touchdown states;
  4. a single-state C design;
  5. optionally, A alone on S-A.

  The recommendation is 1, 2 and 4 together, as amendment ITS-1 A1, not started.
- **E2:** unchanged since the 8 Oct entry.
- **Publication:** 48 V2 commits above the published `0ddba2b`, plus the local branches `prototype/slide-contact-v1.3-charcollide`, `prototype/locomotion-continuity-v1` and `prototype/locomotion-v2-run1`. Pushed in the 10 Oct housekeeping.

## Saturday 10 October 2026 — Locomotion V2 frozen, the handoff contract, RH1, IFM-1 and the first player-v-player contact

**Evidence:** [FC-Sim Git] 30 commits on `prototype/locomotion-v2-run1`, `0d032424` (06:05) → `4a226b1f` (18:40), with the annotated tag `locomotion-v2-straight-baseline-1` (18:40); 34 commits on `prototype/physical-character-v2`, `4da41c4` (14:20) → `1e39418` (05:39, 11 Oct). The housekeeping commit `e57bf98` (06:00) on `touchline-current` and the 06:00 – 06:01 pushes are in the remote-tracking reflog. None of the later commits, and not the tag, was pushed by 06:00 on 11 Oct. [Doc] `review_artifacts/locomotion_v2_run1/` (`RUN1_REPORT.md`, `RUN1_1_EFFORT.md`, `RUN1_2_REGIMES.md`, `RUN1_3_ALLOUT.md`, `LOCOMOTION_V2_STRAIGHT_BASELINE.md`, `LOCOMOTION_V2_STATE_CONTRACT.md`, `video/VIDEO_CAPTURES.md`); in `review_artifacts/physical_character_v2/`: `DECISIONS.md` (the sections from "ITS-1 amendment A1 PAUSED" onward), `interaction_time/run1_handoff/`, `record_hinged/`, `ifm1/`, `pvp1/`. 8 user decisions and instructions saved verbatim in `sources/` (4 dated 10 Oct, 4 dated 11 Oct). The five RUN-1 instructions, and the 03:03 and 03:18 review requests, are not in `sources/`; they are quoted from the session records. [Session] the times of the user's messages, from the two Claude Code session records (UTC + 1 h). One owner screen recording; no owner screenshots.

**Publication housekeeping, 06:00** (`e57bf98`).
- `e57bf98` added the 9 Oct entry, the Current state / open problems update and four owner screenshots.
- **Pushed at 06:00 – 06:01, unchanged:**
  - `prototype/physical-character-v2` `0ddba2b` → `c647f4c` (48 commits);
  - the new branches `prototype/slide-contact-v1.3-charcollide` (`5042230`), `prototype/locomotion-continuity-v1` (`9d57d46`) and `prototype/locomotion-v2-run1` (`affc30b`);
  - `touchline-current` `bb96657` → `e57bf98`.

**RUN-1 closes its overnight pass, 06:05 – 06:11** (`0d03242`, `b0e016e`, `88cd4d8`, `10c5cd1`, `56fada1`, `3caa5d5`).
- Iteration 14: a speed-dependent heel-rise onset (jog 0.50 / run 0.46 / sprint 0.28 of stance). The sprint stance knee no longer whips towards lock: peak rate 1,509 → 1,054 °/s, minimum angle 12 → 23.4°.
- **Contact on the skinned mesh** (every boot vertex skinned as the GPU does): RUN-1's stance median is 0.0 mm above the stud plane and never below it; V1.3 hovers 17 mm above it and dips up to 7 mm below.
- Iteration 15: the toe-pad contact moves 8 cm ahead of the MTP joint, and the boot mesh no longer penetrates at any speed (sprint toe-off −1.4 → +1.3 mm).
- `3caa5d5`: the final RUN-1 report (`RUN1_REPORT.md`: weaknesses, diagnostics, CPU, verdict against V1, recommendations) and work log.

**RUN-1.1, the effort pass, early afternoon** (`0ecdbd6` 13:43, `c2b824c` 14:00, `141859c` 14:10, `156f90b` 14:11, `f2fac23` 14:16, `949bd76` 14:18, `da3035f` 14:30, `83a457d` 14:37).
- User (13:18): "Decision: RUN-1 is a major improvement over Locomotion V1. Keep this architecture and continue developing RUN-1." And: "Running looks too effortless." The target: "effort without fatigue; force without stiffness; weight without sluggishness."
- **Setup:** RUN-1.0 frozen byte for byte (`run1_gait_orig.js` = `3caa5d5`); the viewer runs RUN-1.1 / RUN-1.0 / V1 on three lanes. Reference tools on real running (CMU motion capture, data kept outside the repository) gave phase sheets and coordination metrics against 9 real strides (E0).
- **E1 – E6:**
  - E1, a loaded stance and propulsion: a true-gravity vertical with a skewed stance force fitted to real strides, the knee driving from 24 % of stance with the heel rolling up as it loads, and a mid-foot landing under a bent knee;
  - E2, arm carriage: the elbow drives back, the upper arm 50° behind to 5° in front at 5.5 m/s, elbow 102 ± 18°;
  - E3, trunk: lean 12.5° with a ±3° pitch into every stance (real 12.6° / 6.2°);
  - E4, the recovery leg: heel recovery → knee drive → the foot comes down onto the turf instead of reaching out and pawing back;
  - E5, the pelvis turns with the thorax; spine twist ±17 → ±7°;
  - E6, landing: heel 7° up at touchdown, knee 28°, jog contact 0.25 s. Every limb is smoother than in RUN-1.0, and all joints sit inside V2's box. A COM-consistent pelvis was tried and kept as a not-adopted patch.
- `83a457d`: `RUN1_1_EFFORT.md`, with phase sheets, motion paths, chronophotographs, gameplay-camera sheets and the regression.

**RUN-1.2, speed regimes, mid-afternoon** (`decc581` 15:01, `f4f5426` 15:08, `e5c8790` 15:33, `84af00d` and `f697eee` 15:35, `a5dce3a` and `7cd0385` 15:37, `8e55f7e` 15:43, `2a716e2` 15:45, `cddaf89` 15:52).
- User (14:50): "Preserve RUN-1.1 exactly. Do not overwrite it." And: "visually it reads to me as a good athletic jog, not as a convincing 5–6 m/s football run or sprint." The goal: "jog looks like jogging; run looks like running; sprint looks like sprinting."
- RUN-1.1 frozen as `run1_gait_v11.js` (`83a457d` byte for byte).
- **Evidence:** RUN-1.1 at 5.5 m/s reproduces the joint waveforms of real joggers at 3.6 – 4.1 m/s.
- **Investigation** (`RUN1_2_REGIMES.md`):
  - why RUN-1.1 reads as a jog: run timing on a jog body (a sinking stance, jog arms, a pelvis and trunk moving as one block, a placed landing);
  - the architecture answer: regime anchors inside the existing continuous speed blend, with no new constructs;
  - measured and extrapolated evidence kept apart, including a pelvis-phase analysis of the Fukuchi data set (CC BY).
- **RUN regime, 5.5 m/s** (R1 – R4): a stiffer stance on a fore-foot landing (knee 24 → 46 → 16°); a front-loaded recovery (swing knee 125°); driving arms (upper arm 56° back to 22° forward); and a driving pelvis (±10°) countered by the shoulders (spine twist ±11°, against ±4.5°).
- **SPRINT regime, 7.8 m/s** (S1): front-side mechanics, the thigh driven nearly horizontal (hip 77°); 4.05 steps/s, contact 121 ms, flight 129 ms.
- RUN-1.2 equals RUN-1.1 at 3.0 / 3.5 / 4.0 m/s.
- **Regression** (`cddaf89`): a wider limits scan found −20.15° of hip extension at 4.0 – 4.25 m/s (planning box −20°, hard −25°), inherited from RUN-1.1. An erratum went into `RUN1_1_EFFORT.md`, whose "inside" claim had come from a 3-speed scan. It was not patched, to keep the identity with RUN-1.1.

**RUN-1.3, ALL-OUT, late afternoon** (`e023b11` 17:12, `7a8204c` 17:12, `bdab1f5` 17:19, `15574a4` 17:27).
- User (16:51): "Preserve all three current RUN-1.2 regimes exactly. I like them." They read "approximately one category slower than their current labels suggest", so the request was "one additional top-end locomotion regime representing a footballer running at or near maximum speed."
- RUN-1.2 frozen as `run1_gait_v12.js` (`cddaf89` verbatim).
- **A1**, the first ALL-OUT draft at 9.5 m/s, was too track-like for a footballer: a forefoot strike, the heel tucked to 138°, the rear thigh only −25°, a force skew of 1.8.
- **A2 – A3**, calibrated to top-speed evidence (`RUN1_3_ALLOUT.md`): 4.55 steps/s, contact 104 ms, flight 117 ms, force skew 1.4, FAST RUN's foot strike, stance hip extension 808 °/s (Miyashiro: 850 ± 73), lean 10°. Identical to RUN-1.2 at ≤ 8.0 m/s.
- **Viewer:** the Ladder preset LOW 3.0 / JOG 5.5 / FAST RUN 7.8 / ALL-OUT 9.5 (the user's names for the regimes), a blind test (`?blind=1-4`) and a 6 → 9.5 → 6 m/s ramp.
- **Limits tool corrected:** the elbow had been read through a YXZ `asin` capped at 90°. RUN-1.2's reported elbow maximum of 90° was really 125°, inside the 145° box.

**Archival captures and the freeze, early evening** (`a7f9a8c` 17:58; `4a226b1` 18:40 and the tag).
- User (17:42), attaching a screen recording: "Before we freeze the new Locomotion V2 straight-line baseline, I want two short archival video clips created and committed with the locomotion evidence." And: "Do not change any locomotion behavior, parameters, camera geometry, simulation behavior, or animation code to make these videos."
- **Owner screen recording** (17:40): `Screen Recording 2026-10-10 at 5.40.26 PM.mov`, 7.0 s, 2940 × 1302, 38.9 MB, SHA-256 `a94e0a1b1f21b8f9d22ee9bf0a5cc16f8a8e0d24c8c59797f6695e39d2d388ba`. It is the composition reference for the first clip, and `VIDEO_CAPTURES.md` records that use. As a video rather than a screenshot it is kept outside Git, on the Desktop.
- **The captures** (`a7f9a8c`):
  - `LOCOMOTION_V2_FINAL_LADDER.mp4`, with an `_UNLABELED` companion;
  - `LOCOMOTION_V2_VERSION_HISTORY.mp4`: V1 / RUN-1.0 / RUN-1.1 / RUN-1.2 at 5.5 m/s. RUN-1.3 is bit-identical to RUN-1.2 at that speed, so one labelled cell shows both;
  - 7.000 s, 420 frames at 60 fps, copied frame-exactly from the viewer's WebGL canvas; an independent Node replay matches every lane-frame.
- User (18:06): "Approved." And: "Now freeze the current four-regime straight-line locomotion system as the Locomotion V2 straight-line baseline." Also to be frozen: the locomotion-side state interface for the Physical Character V2 handoff.
- **Frozen** (`4a226b1`, tag `locomotion-v2-straight-baseline-1`; local):
  - RUN-1.3 as `run1_gait_v13.js`, the implementation that rendered the approved captures. RUN-1.0, 1.1 and 1.2 are kept as historical references;
  - straight lines only. Acceleration and deceleration, curves, turning, per-player speed characteristics and ball carry are not frozen;
  - the state contract LV2-STATE-1 (`lv2_state.js`, `LOCOMOTION_V2_STATE_CONTRACT.md`): a pure O(1) float64 root-relative state, with analytic velocities where a closed form exists and a declared central difference otherwise.
- **Final regression:** identity 36 / 36, determinism, neutrality, slip 0, limits (only the inherited −20.1° hip), 0.59 ms for 22 rigs, contract 21 / 21, and both clips match the frozen file. Found at the freeze and documented, not changed: the heel-rise onset is a velocity kink, and the replay path has a plant transient of ≤ 0.1 mm on speed changes.

**The RUN-1 → V2 handoff contract, afternoon and evening** (`4da41c4` 14:20, `14b5cba` 14:33; `3977238` 20:18, `6a0cf34` 20:56; read-only).
- User (14:19): "Architecture sequencing decision: pause implementation of the proposed interaction-controller amendment." And: "I do not want to optimize the production animation→physics handoff around V1.3/LC-1 if that locomotion representation is going to be retired."
- **Draft** (`14b5cba`):
  - the interface split into rows RUN-1 exposes (R-0 … R-8), rows V2 derives (V-a … V-g) and rows the simulation owns (S-a … S-g), with hard preconditions H-1 … H-5 and the ITS-1 tests kept or retired;
  - probed from a git-archive copy of RUN-1 at `949bd76`: its stride clock differs from the simulation's (2.75 vs 3.21 steps/s at 3 m/s), its kinematics export was float32 and mutating, and its heel-up / MTP stance makes the rigid F0 foot mismatch central.
- User (20:17): "The Locomotion V2 straight-line baseline is now formally frozen." And: "Consume it only through a git archive of that tag, never from the live worktree."
- **Draft R2** (`6a0cf34`), reconciled with LV2-STATE-1:
  - the contract checks give 21 / 21 from a git archive. R-0 … R-8 are all answered directly for straight running; clock ownership (R-5 / H-1) and turning (R-7) are unresolved;
  - instantaneous transfer measured with V2's frozen mapping at 3.0 / 5.5 / 7.8 / 9.5 m/s, no physics stepped: **verdict B, NOT READY.** The smallest blocker is V-a, the 23 → 14 bone mapping (owner: V2). At FAST RUN / ALL-OUT the shoulders, elbows and hands are 16 – 31 mm and 0.23 – 0.57 m/s off, and the shoulder's hard range is exceeded at ALL-OUT (≤ 1.34°). The leg chain transfers exactly;
  - reported, not decided: the simulation's stride clock runs 17 – 44 % faster; the F0 foot is representable only in flat stance and flight; the gameplay legs are 0.19 – 0.29 m from the runner's at any phase offset; the simulation's VMAX of 8.2 m/s is below ALL-OUT.

**The upper body and RH1, late evening** (`a7a5bfb` 21:10, `edfa2b8` 21:50; `084f736` 21:54, `50eae23` 22:06, `2ab15ca` 22:20, `196815e` 22:24, `fa5915b` 23:32).
- User (21:09): "Accept verdict B and keep the frozen Locomotion V2 baseline completely untouched." And: "does the physical interaction body actually need a one-to-one representation of all 23 presentation bones?"
- **Investigation** (`edfa2b8`, read-only, 14 alternatives): classification D, a combination.
  - Physics is mainly a mapping problem. The velocity reference must be the rig's material velocities, not a differenced copied pose: ALL-OUT per-body velocity error 0.52 → 0.14 m/s with V2 unchanged.
  - Visible continuity needs lumbar, thoracic and elbow joint anchors taken from the record. A clavicle is not justified, and the 1.34° shoulder exceedance is a copy-mapping artefact.
  - Also found: the frozen P-14 … P-17 reference misplaces V2's trunk mass by 50 – 60 mm, and P-17 swaps the arm inertia axes.
- User (21:53), approving D1 – D4: "Adopt the record-hinged runner as a new V2 body-spec version." "Do not add physical clavicle articulation." And: "I do not consider the new body valid until the existing V2 physical-body gates have been rerun against the new version."
- **RH1**, preregistered (`50eae23`) and built (`2ab15ca`): spec `PI1-runner-vinicius-RH1`, hinge-only (masses, COM, inertia, colliders, ranges and the lower body preserved; the 20 existing spec hashes unchanged), with mapping contract MC-1.
- **Verdict C, RECORD-HINGED V2 BODY INVALID** (`fa5915b`). RH1 passes 50 / 54 gating rows.
  - Two failures are new and caused by the hinges, both in G1: leanL (shoulder_L 1.74° against 1.5°) and dropA (a late left-arm settle at the edge of the 10 s window).
  - G3 G / H / K′ fail too, inherited from the record hip spacing: R0 fails them identically. Newly found: R0 had never run G3.
  - The transfer itself was close: at ALL-OUT ≤ 6.5 / 5.4 / 2.6 mm at shoulder / elbow / wrist, no visible pops, the lower body bit-exact. But the rigid F0 boot fails P-9 and stance-contact consistency, so the handoff would be B regardless.
  - The preregistration's reproduction stop rule failed as written (≤ 1.15 · 10⁻⁴), a preregistration defect; the verdict does not depend on it.

**The hold and the audit, after midnight** (`36ec2e9` 00:15, `ff5be5e` 00:21, `196f466` 00:36).
- User (00:13): "Hold here." And: "We are having the accumulated architecture independently reviewed."
- `RH1_AUDIT_HANDOFF.md`, facts and provenance only. The four failing rows are separated into:
  - RH1-introduced: G1 leanL and dropA;
  - shared with R0: G3 G, H and K′;
  - recorded exceptions: isoSelfCol, permitted for PI-1 only, and the G0 rows, recorded but never waived by the user;
  - unresolved rigid-foot / promotion issues.
- A clean-tree audit from a git archive: 0 / 14 comparisons differ.

**IFM-1, the impact-first matched-state comparison, small hours** (`5b5883f` 01:13, `7315537` 01:32, `1c3e264` 01:32, `7c4f4ea` 01:32, `796a6e1` 02:01, `365dfd9` 02:02, `b1dc620` 02:05, `2139709` 02:10, `f22a914` 02:49; slow-motion review `df2f206` 03:31).
- User (01:12): "I approve IFM-1 for implementation and execution under this preregistration." The preregistration was the user's attached `Touchline_IFM1_Claude_Preregistration.md` (`~/Downloads`, 01:10), copied byte for byte into `ifm1/`.
- Inputs bound (`7c4f4ea`) and the implementation frozen (`796a6e1`) before any stepping; an erratum on P-17's units (`7315537`). A side-convention bug in the fixture was fixed before the freeze and disclosed.
- Corrections C1 – C6 were recorded over runs 1 – 2 (an orientation-angle precision bug, contact sub-shape decoding, a double world destroy, a path join). Run 3 is the reported run; runs 1 – 2 are kept.
- **Results** (no combined verdict; R0 and RH1 runners at 3.0 m/s, struck by an impactor closing at 3 m/s):
  - SW (swing shank): native integrity failed at step 1;
  - PL (planted shank), SH (shoulder) and TP (toe-pad stance): the native response is mechanically valid over 0 – 50 ms;
  - continued native contact matters for PL (33 mm / 2° when contact is cut after one step) and TP (42.5 mm / 3.5°), but not for SH;
  - every entry carries the frozen HANDOFF_FAILED label;
  - at the gameplay camera, no 0 – 50 ms response differs from the no-hit control by more than 0.68 px.
- `IFM1_ARCHITECTURE_DECISION.md` proposes INT-1; not started.
- User (03:18): "Create a focused slow-motion visual review of the existing IFM-1 results." `df2f206`: C0 | N side by side for all four cells on both bodies, an exact 8× crop of the gameplay projection at 0.25× and 0.1×, CLEAN and DIAGNOSTIC versions, and `SLOWMO_REVIEW.html`. Verified against the records (clip data 26 / 26 byte-identical).

**PVP-1, the first player-v-player design, before dawn** (`17fa068` 03:39, `34a5086` 04:00; research only).
- User (03:39): "I want the next milestone to be our first genuine player-v-player physical interaction." And: "Do not build it yet."
- **Case selection:** of the 26 V1.3 fixtures, 4 are recoverable. IB1-SR (rx_behind_standing) was recommended: a standing runner, a slide from behind, the tackler's boot on the planted right shin at τ 51.5, outcome STUMBLE.
- **Readiness:** a running two-body test was judged premature (the simulation's contact legs are 0.197 / 0.251 m from LV2's at 3 m/s, p50 / p90; the running presentation's momentum is incoherent).
- A draft preregistration, with owner decisions D1 – D5.

**PVP-1A, overnight** (`25a87d5` 04:28, `d7fb69a` 04:34, `9fa1f57` 04:49, `0a82906` 05:03, `7849713` 05:08, `fa34dd1` 05:17, `9fbf7a4` 05:39, `1e39418` 05:39).
- User (04:25): "OVERNIGHT PVP-1A MISSION — work autonomously for an extended session and maximize useful evidence, not the probability of a PASS." And: "A rigorous failure is more valuable than a manufactured success."
- The instruction referred to an earlier approval and architecture amendment that had not been received. This was recorded on receipt (`25a87d5`), and the instruction was taken as the operative approval.
- **Frozen** (`d7fb69a`) before any code: the R0 runner and a V1-matched tackler in one unmodified V2JoltWorld; activation at τ 51.0; a no-contact control C0, native contact N2 and a contact-cut branch X2; CG-1 … 6; integrity rows; the simulation's balance law as an offline evaluator (OC-3); hard stops H1 – H7.
- **PVP-1A BLOCKED at H2** (`9fa1f57`), before any two-character stepping. The tackler's fit to the simulation's slide primitives fails G-T1 and G-T3, and no V1-matched pose inside the hard ranges satisfies the gates: the primitives put the thighs 0.265 m apart at the hips, against the body's 0.190 m.
- **PVP-1A-DX**, the identical frozen design with the tackler entered by the frozen fit objective and every verdict DX-prefixed (protocol `9fa1f57`, implementation freeze `0a82906`):
  - run 1 (`7849713`): first native contact at step 3 (τ 51.75), boot → runner shank_R; CG-1 … 6 pass; contact on 166 of 260 steps; the runner clean; determinism bit-identical;
  - the tackler fails integrity from step 1: its entry pose has the forearm 39.5 mm inside the thigh. **Corrected verdict DX-BLOCKED** (DX-C1: the evaluator had omitted that frozen entry check). The original evaluation is preserved.
- **Visual evidence** (`fa34dd1`): gameplay camera 1×, 6× slow motion, a diagnostic view, and synchronized C0 | N2 and N2 | X2 pages, all on `pvp1/review/PVP1A_REVIEW.html`.
- **Post-hoc diagnostics** (`9fbf7a4`, labelled as such):
  - the shin strike carries 5.0 N·s; the boot then rides under the planted foot for 61.6 N·s (steps 7 – 30);
  - from step 63 (262 ms) the still-sliding tackler's head strikes the runner's pelvis, a contact the simulation does not have;
  - the tackler's isolation failure is the solver's body-ID ordering: the runs are bit-identical when the bodies occupy the same slots;
  - CF1, a separately named variant with the tackler's arms cleared: the tackler stays clean to step 18, and the runner's first 75 ms are unchanged;
  - under the simulation's own balance law, the runner's no-contact state is already FALL (eH 0.356). Its STUMBLE comes from a contact push toward the stance foot, while the physical push points 55° away from it.
- `PVP1A_MORNING_REPORT.md`, and `PVP1A_R1_SUCCESSOR_PROPOSAL.md`: a draft, outcome-informed, neither frozen nor implemented, with PARTIAL predicted.

**Parallel work outside this repository** ([Local], file times only; not investigated).
- In the user's Codex workspace `~/Documents/Codex/2026-10-10/new-chat/`, 15:51 – 21:03: statistics, transfers, club, overview, home, squad-play and matchday pages with their `build_*.py` and `verify_*.cjs` scripts, `matchday-integrated.html`, and `Touchline_Playable_Statistics.html` (41.1 MB; a copy in `~/Downloads` at 21:01).
- In `~/Downloads`: `2026-27-ratings-updated-ranked-2026-10-10-elite-pace-locked.xlsx` (21:12); after midnight, `Touchline_2026-27_Ratings_Final_Pace_2026-10-10.xlsx` (01:27), `Touchline_2026-27_Ratings_Rebuilt_Validated.xlsx` (02:12), `Touchline_2026-27_Ratings_Live_OVR_Olise92.xlsx` (02:31) and `Touchline_226_Player_Stamina_Review.xlsx` (03:31).

What was done is not reconstructed here.

**Corrections and process errors.**
- **RUN-1.1** claimed every joint inside V2's box from a 3-speed scan; RUN-1.2's wider scan found −20.15° of hip extension (erratum).
- **RUN-1.2** reported an elbow maximum of 90°, a limits-tool artefact (really 125°). Its identity with RUN-1.1 is bit-exact only at grid speeds, ≤ 0.12 mm between cells (erratum in `RUN1_2_REGIMES.md`).
- **RH1.** The reproduction stop rule failed as written; the P-17 units erratum (`7315537`).
- **IFM-1.** C1 – C6 recorded, runs 1 – 2 superseded and kept, the pre-freeze side-convention bug disclosed.
- **PVP-1A-DX.** DX-C1 (the omitted tackler self-penetration check) and DX-C2 (the CG-6 reading), with the original evaluation preserved.
- **Sources.** The 03:03 and 03:18 review requests were not saved to `sources/`.

**Adopted / not adopted.**
- **Frozen (owner decision):** the Locomotion V2 straight-line baseline, `locomotion-v2-straight-baseline-1` = `4a226b1`, with LV2-STATE-1. RUN-1.0, 1.1 and 1.2 are kept as frozen historical copies.
- **Paused:** ITS-1 amendment A1 (user, 14:19).
- **Not adopted, kept as evidence:** RH1 (verdict C, on hold); the IFM-1 results (visual review pending); PVP-1A and PVP-1A-DX; the PVP-1A-R1 draft.
- **Unchanged:** V2 and its configuration, R0, the simulation (V1.3), the Jolt settings and every frozen criterion.

**End-of-day state** (06:00, 11 Oct).
- **Locomotion V2** is frozen for straight-line running. Acceleration, turning and match integration are not started.
- **Physical character:**
  - the handoff state contract is NOT READY (verdict B), and RH1 is invalid (verdict C), held for the independent architecture review;
  - IFM-1 awaits the owner's visual review;
  - PVP-1A is BLOCKED and its DX diagnostics are complete. Pending owner decisions: the visual review, whether IB1-SR's STUMBLE should be physically explicable at all, and PVP-1A-R1.
- **Publication:** 34 V2 commits above the published `c647f4c`, 30 RUN-1 commits above `affc30b` and the baseline tag. Pushed in the 11 Oct housekeeping.

## Sunday 11 October 2026 — Active balance, the collision audit, a physiological standing body and the muscle layer

**Evidence:** [FC-Sim Git] 32 commits on `prototype/physical-character-v2`, `64ce7d0` (13:34) → `6ac988e` (05:34, 12 Oct). The housekeeping commit `384c61d` (13:32) on `touchline-current` and the 13:32 – 13:33 pushes are in the remote-tracking reflog. None of the 32 commits was pushed by 06:00 on 12 Oct. [Doc] in `review_artifacts/physical_character_v2/`: `DECISIONS.md` (the sections from "ABI-1 active balance investigation" onward), `abi1/`, `cxa1/`, `trc1/`, `ppr1/`, `ppr2/`, `ppr3/`, `muscle1/` and `balance1/`. 8 user instructions and approvals saved verbatim in `sources/` (6 dated 11 Oct, 2 dated 12 Oct). [Session] the times of the user's messages, from the Claude Code session record (UTC + 1 h). [Astra] commit labels and file times of a separate slide workstream (below). No owner screenshots or screen recordings.

**Publication housekeeping, 13:32** (`384c61d`).
- `384c61d` added the 10 Oct entry and the Current state / open problems update, and noted one owner screen recording (kept outside Git).
- **Pushed at 13:32 – 13:33, unchanged:**
  - `prototype/locomotion-v2-run1` `affc30b` → `4a226b1` (30 commits), with the tag `locomotion-v2-straight-baseline-1` (on the remote; tag pushes are not in the reflog);
  - `prototype/physical-character-v2` `c647f4c` → `1e39418` (34 commits);
  - `touchline-current` `e57bf98` → `384c61d`.

**ABI-1, the active balance investigation, early afternoon** (`64ce7d0` 13:34, `7ab2907` and `7cf107f` 14:05, `5a8704c` 14:12, `dc4da05` 14:15, `ea0b20f` 14:19, `984b466` 14:28).
- User (13:23): "isolate whether the poor PVP response comes from inadequate impact or inadequate active control." And: "The controller must be outcome-blind."
- **Research before code** (`7ab2907`): on the CF1 record the struck right foot unloads at 121 ms with the XcoM 0.19 m outside the remaining support. A's frozen SnapshotTone is a zero-latency, non-yielding 1.39 mgh at the ankles against a measured intrinsic 0.64 – 0.91 mgh, the literature's "pillar" pitfall. Literature timing: first corrective torque ≈ 120 – 160 ms, step onset ≥ 160 ms.
- **Preregistered** (`7cf107f`) and frozen (`5a8704c`) before any contact run:
  - A, the frozen SnapshotTone;
  - B, A + GBC-1: the V2-G2 balance law on a 120.8 ms-delayed frame, applied as increments through the unchanged ActuatorLayer, with an outcome-blind input whitelist;
  - C, B + an XcoM-triggered capture-point step.
- **Results** (`dc4da05`, `ea0b20f`, `984b466`; VISUAL_PENDING, no adoption):
  - validity V1 – V8 pass; B and C equal A through step 30, and the first contact-caused active response comes 120.8 ms after contact;
  - **0 – 250 ms: B − A ≤ 0.57 px at the gameplay camera.** The support loss at 121 ms reaches the controller at 242 ms;
  - EXT, a restricted contact set: B − A 3.4 px from step 88, carried by the arms and trunk; no condition recovers at 1.0×. EXT after step 60 was later withdrawn (CXA-1);
  - C's step law, acting on delayed support state, re-lifts the passively re-planted foot;
  - S-IMPACT at 0.75×: A's trunk folds progressively to 35 – 38° while B and C hold it (6.5 px);
  - controller CPU 0.025 ms (B) / 0.21 ms (C) per step.
- **Answer:** in the first 250 ms neither magnitude nor active control decides the look; the frozen passive tone and physiological latency do. After 250 ms active control is the missing ingredient. The collision is not too weak.
- Review `abi1/review/ABI1_REVIEW.html` (A | B | C, gameplay 1×, close 6× slow, diagnostic overlays).

**CXA-1, the collision-exclusion audit, mid-afternoon** (`f1933ad` 14:38, `d2c872a` 15:11; read-only, nothing fixed).
- User (14:36): "This becomes priority zero. I would stop the passive-balance work for now." The question: "are the two V2 bodies actually maintaining rigid collision exclusion throughout the trustworthy interaction window?" And: "Not visually. Numerically."
- **Measured:** the exact per-step signed separation of every runner × tackler collision-shape pair, matched to Jolt's manifolds (mean depth difference 0.008 mm).
  - Maximum penetration: PVP-1A-DX ≤ 1.19 mm in the window, CF1 ≤ 3.30, ABI-1 B / C ≤ 3.52, a creation-order swap ≤ 2.78, S-IMPACT 0.75× ≤ 3.04. All are below Jolt's 5 mm penetration slop.
  - No overlap without a contact, no side crossings or normal flips; 196 / 196 cross pairs enabled in the filter table; approach per step inside the speculative distance.
- **The visible phasing is presentation:** the tackler was rendered 54 – 87 mm from its physics skeleton, and V2's colliders are inscribed in the meshes (the F0 boot is a sole-only slab), so the rendered players interpenetrated while the colliders only touched.
- **Corrections to earlier readings:**
  - the sustained 61.6 N·s contact is a heel sweep from behind and above, not the boot riding "under the foot";
  - ABI-1's EXT window was blind to filtered non-leg pairs, which phase from step 61 by up to 154 mm. The erratum `abi1/ABI1_ERRATUM_CXA1.md` withdraws EXT after step 60.
- `CXA1_REPORT.md` (ten answers; fixes M1 – M4 proposed, not implemented) and `cxa1/review/CXA1_REVIEW.html`.

**TRC-1, the tackler render correction, late afternoon** (`3b86466` 15:21, `bf84bee` 16:16; presentation only).
- User (15:19): "Approve the presentation-only tackler rendering correction recommended by CXA-1." The goal: "make the rendered tackler accurately follow the physical tackler that already exists in the committed PVP-1A-DX / ABI records."
- **Render rule MC-1P** (`trc1/scripts/trc1_retarget.mjs`): Gabriel drawn on the tackler's actual V2 joints, limb bones stretched to the next joint, the pelvis scaled laterally × 0.588 (rig 323 mm against the V1-matched 190 mm, the one visible appearance cost). Records and final hashes are unchanged.
- **Joint audit:** tackler joints 51 – 153 mm off before, 0.00 mm after.
- **Remaining mesh overlap** (robust, window maximum, before → after): PVP-1A-DX 43 → 12 mm, ABI A / B / C 43 → 15 – 16 mm, S-IMPACT 0.75× 42 → 13 – 14 mm. Almost all of it is the tackler's left boot against the runner's right heel and ankle. The meshes first touch at the step Jolt builds the contact from, on the same anatomy.
- Review `trc1/review/TRC1_REVIEW.html` (18 videos: gameplay 1×, 8× close, heel / shin close-up, mesh / colliders toggle, frame stepping). Remaining mesh penetration not fixed, as instructed.

**PPR-1, the physiological pre-reflex response, late afternoon** (`468c897` 16:21, `d8849a6` 17:22, `e7afc26` 17:25, `06591e7` 17:40).
- User (16:19): "Can V2's first ~0–120 ms after an unexpected collision behave like a physically compliant, pre-activated human athlete rather than a rigid pose-controlled mannequin, before any collision-triggered neural response is allowed?"
- **Audit of CURRENT V2** (A, read-only): a pose spring to the frozen entry pose, K = 1.5 × supported load on every axis, damping ≈ 100× human, and an excitation computed from the same tick's servo request (zero neural latency). In the collision the struck ankle goes from 9 % to 96 % activation in ≈ 50 ms. A cannot stand from the PVP entry: it falls at 1.45 s.
- **B, preregistered and frozen before any B code:** a collision-blind tonic drive from the runner's own state 125 ms earlier, with intrinsic, load-dependent short-range stiffness that yields at V2's eccentric plateau.
- **Result: B FAILED its preregistration, 12 / 23** (preserved, diagnosed, not retuned).
  - In the window B is compliant: struck ankle 16° against 5.5°, knee 19° against 3.2°; struck-leg torque change ≤ 10 against 69 N·m.
  - H1 / H2 / H3 / PR3 fail because B's excitation divided the drive by the current-angle capacity, a specification error. A post-hoc diagnostic with entry-capacity normalisation leaves the window kinematics within 0.05°.
  - B falls standing at 0.85 s; diagnostics show this is not latency but joint-space tone with thin yield margins.
- Successor B′ proposed, not run. Review `ppr1/review/PPR1_REVIEW.html`.

**PPR-2, the standing body, late evening** (`f1f2478` 21:50, `e454b06` 22:43, `03c4fe8` 22:58).
- User (21:48): "PPR-1 is preserved as a failed preregistered experiment." And: "establish whether V2 can represent a mechanically plausible pre-reflex standing human at all." PVP-1A-DX sealed during calibration.
- **Findings kept separate** (`e454b06`): A, excitation fixed from the pre-contact state; A2, new: the PostureDriver's leg-line statics are not a rest equilibrium (ankle 10 against 21 N·m), which made every compliant body fall from t = 0; B, passive mid-range elasticity from the literature; C, a strain-based short-range / eccentric reserve.
- **Candidate S\* = A + A2 + B + C FAILED its frozen qualification, 36 / 45** (`03c4fe8`). It passes the ankle against human curves, the knee, the continuum, large-push loss, release, energy and determinism; it fails standing (envelope exit 0.26 s), hip intrinsic stiffness (16.6 against 30 – 91 N·m/rad), small lateral pushes and two further push rows.
- **Decision C:** standing needs continuous delayed feedback as well as the substrate. Battery limitation reported: its 300 ms window exceeds the ≈ 175 ms loop delay.

**PPR-3, the physiological standing foundation, around midnight** (`f7cef6b` 23:41; `594a6d3` 00:44, `ca7674b` 00:47, `932cd11` 01:24, `f53b791` 01:27, `391c4f0` 01:55, 12 Oct).
- User (23:39): "A physically active footballer requires (1) a physiological mechanical substrate and (2) continuous delayed postural control." And: "We are NOT returning to PVP yet."
- **S2, the substrate without feedback: QUALIFIED 18 / 18** (`594a6d3`, `ca7674b`). A flat-footed standing entry carries body weight within 4 steps. S2 = fixed excitation + minimum-effort rest statics + ready-stance tone T + passive B + relaxing strain arms C + a bidirectional short-range-stiffness cap. Ankle 0.78 – 1.21 × Vlutters; open-loop standing exits its envelope at 1.43 s (CURRENT V2 0.34 s). Ablations support T and C; B is not shown necessary.
- **S2 + P2, continuous delayed control: FAILED 10 / 14** (`932cd11`, `f53b791`). It stands 60 s with motor noise, commands are bit-identical to an undisturbed twin until 29 ms on every push, and large pushes topple it. It fails lateral settling, the human-matched recovery and the thresholds (forward 1.00 × the zero-delay limit, over-robust; lateral 0.32 ×, fragile). Diagnosis: superhuman torque development and no COM acceleration feedback.
- **P2b**, a labelled exploration with a physiological EMG → torque filter and acceleration feedback in three literature variants, diverges undisturbed (`391c4f0`). Stop condition B: owner decisions on where muscle contraction dynamics live and on P2's controller class. Review `ppr3/review/PPR3_REVIEW.html`.

**MUSCLE-1, the muscle / actuator layer, small hours** (`4b8e665` 02:48, `77630dc` 04:05, `6c68177` 04:07, `ee2c146` 04:08, `bae8cea` 04:09, `f6cffbc` 04:13).
- User (02:47): "Astra's independent architecture review raised a specific hypothesis: V2's activation dynamics may constrain the amount of torque available without sufficiently constraining how quickly actual physical torque changes inside that envelope." And: "MUSCLE-1 exists to test that hypothesis, not assume it."
- **Audit** (`77630dc`): the hypothesis is exactly right for CURRENT V2's canonical actuator (activation bounds only the envelope; the motor changes torque in one tick inside it). PPR-3's S2 has no contraction dynamics either; its ankle torque rise was ≈ 87 % P2's own command.
- **Design:** excitation → activation (V2's 15 / 50 ms, kept) → developed force through a contraction lag per muscle group, inverted from the literature → torque; the mechanical path (force–length, force–velocity, short-range stiffness, passive B, damping) stays immediate. S2's strain arms C were replaced by history-consistent force-based arms; the C audit found S2's law creates energy (0.026 J) and restores 51 % of abolished enhancement.
- **M1 FAILED its frozen preregistration on one criterion** (`6c68177`, ankle 15 / 16): A4, a first-tick force change of 1.11 % against 1 %, because the cascade had no electrochemical latency. The 1.11 % was computable before the freeze: a preregistration error, preserved, not re-scored.
- **M1b**, a labelled successor (`ee2c146`): M1 + an 8.33 ms electrochemical delay (Nordez 2009, 6.05 ms, rounded up to 2 steps). **PASSED: ankle 16 / 16, knee 14 / 14** (`bae8cea`). Replaying PPR-3's moderate forward push with P2's identical commands, the ankle torque slew goes 974 (command) → CURRENT V2 974 → S2 922 → M1b 256 active / 313 total N·m/s (human 372 ± 267). 19 µs per character-step.
- Report `muscle1/MUSCLE1_REPORT.md` (seventeen answers) and `muscle1/review/MUSCLE1_REVIEW.html` (`f6cffbc`).

**BALANCE-1 begins, before dawn** (`2f16fff` 05:02, `6ac988e` 05:34).
- User (04:59): "You have approval to proceed from MUSCLE-1." "Decision: adopt M1b as the V2 muscle/actuator architecture." And: "Do not return to PVP tonight."
- **The canonical muscle layer** (`6ac988e`): `sim/v2_muscle.js` and `spec/v2_muscles.js`.
  - `MuscleLayer.compute()` accepts excitation only and throws on any torque command: no controller route to instantaneous physical torque.
  - A strict lookup: an unparameterised muscle group throws, so ankle and knee constants cannot be silently generalised.
  - The legacy ActuatorLayer is kept only to reproduce frozen evidence (PVP-1A, G1 – G3, PPR-1 … 3).
  - The canonical layer reproduces the qualified M1b fixture byte for byte on every MUSCLE-1 experiment (`balance1/evidence/CANONICAL_M1B_EQUIVALENCE.json`).
- The BALANCE-1 freeze (`01653ab`, 06:30) and results (`903c12d`, 06:47) belong to 12 Oct.

**Parallel work outside this repository** ([Astra], commit labels and file times only; not investigated).
- A separate slide workstream in the user's Codex workspace, `~/Documents/Codex/2026-10-12/new-chat/touchline-slide`: a clone of the local repository on branch `research/rds4-plant-launch`, whose merge base with the V2 branch is `4b8e665`. 22 own commits, 03:29 → 05:33 on 12 Oct, not pushed. Labels: ISL-1 … ISL-4 (isolated slide qualification), RDS-1 / RDS-2 (reference-driven slide), RDS4 / RDS4A / RDS4B (plant and launch, "import committed M1b").
- Reports in the same folder: `Touchline_V2_Slide_Evidence_Report.html` (03:19), `Touchline_V2_Isolated_Slide_Qualification.html` (03:53; a copy in `~/Downloads` at 03:56), `Touchline_Reference_Driven_Slide_Report.html` (04:36) and `Touchline_RDS4_Plant_Launch_Report.html` (05:33, 29.7 MB).
- `~/Downloads/slidetacklereference.mov` (04:07, 22.5 MB), a slide-tackle reference video, [Local]. Not archived: probably third-party footage.

What was done there is not reconstructed here.

**Corrections and process errors.**
- **ABI-1.** Amendment AM-1, before any contact run (a wording defect in the validity claim; claim unchanged). EXT withdrawn after step 60 by the CXA-1 erratum.
- **PVP-1A-DX post-hoc reading.** The 61.6 N·s "boot rides under the planted foot" is a heel sweep from behind and above (CXA-1).
- **CXA-1.** Its interpolated-normal inside test gave false positives; its "25 – 81 mm" visible overlap reads ≈ 16 – 43 mm robust (erratum in `TRC1_REPORT.md` §2; CXA-1's conclusion unchanged, its files not edited).
- **PPR-1.** The excitation specification error (H1 / H2 / H3 / PR3); PR1 / PR2 were partly criterion errors (yield demanded in unloading or ground-blocked directions).
- **PPR-2.** Its 300 ms battery window exceeds the loop delay (reported, not changed). Its finding A2 also explains PPR-1's B falling from t = 0.
- **PPR-3.** PPR-2's indefinite eccentric hold was overstated (its ablation fails 5 rows).
- **MUSCLE-1.** M1's A4 threshold was not cross-checked against the design script, and the preregistered BC1 ratio did not discriminate S2's energy creation, which shows only in the exact ledger.

**Adopted / not adopted.**
- **Adopted (owner decision, 04:59 on 12 Oct):** M1b as V2's muscle / actuator architecture, canonical from `6ac988e`. The adopted force path is recorded in the V2 spec at `903c12d` (12 Oct).
- **In use, review pending:** TRC-1's render rule MC-1P for the tackler; the user's 16:19 instruction lists the "corrected TRC-1 rendering" among the things to keep unchanged.
- **Stopped by the owner:** ABI-1 (14:36), VISUAL_PENDING.
- **Not adopted, kept as evidence:** GBC-1 and the step law (ABI-1); PPR-1's B and the proposed B′; PPR-2's S\*; PPR-3's S2 + P2 and the P2b exploration; MUSCLE-1's M1.
- **Unchanged:** the simulation, RUN-1, the slide, PVP records and fixtures, V2 anatomy and colliders, the Jolt settings and every frozen criterion. PVP sealed from 21:48.

**End-of-day state** (06:00, 12 Oct).
- **Physical character:**
  - M1b is the canonical V2 muscle layer, and controllers may command excitation only;
  - the standing body: S2 qualified as a substrate; no delayed balance controller is qualified. BALANCE-1, the continuous delayed controller on M1b, is in progress; its freeze and results came after 06:00;
  - no explicit review verdict is recorded for ABI-1, TRC-1, PPR-1, PPR-2, PPR-3 or MUSCLE-1. Each later instruction built on the previous result, and MUSCLE-1's recommendation was approved at 04:59;
  - PVP-1A stays BLOCKED, and PVP is sealed until the receiving player is qualified.
- **Publication:** 32 V2 commits above the published `1e39418`, and 2 more after 06:00. All 34 were pushed at 16:10 on 12 Oct (`1e39418` → `903c12d`), in the 12 Oct housekeeping; the push was delayed by a tool-permission block from 14:24 until the user's explicit authorization.

## Monday 12 October 2026 — BALANCE-1 and BALANCE-2: a legitimate flat-foot balance controller, one gap left

**Evidence.**
- **[FC-Sim Git]:**
  - `prototype/physical-character-v2` has `01653ab` (06:30) and `903c12d` (06:47), both pushed at 16:10, then 22 commits, `4154eb4` (16:11) → `0055641` (00:59, 13 Oct).
  - Those 22 were pushed at 01:04 on 13 Oct (below).
  - `touchline-current` has the 11 Oct chronicle commits `23771df` (14:31) and `38496e4` (16:11), pushed 16:10 – 16:11.
- **[Doc]** in `review_artifacts/physical_character_v2/`: `balance1/` and `balance2/` (`BALANCE2_AUDIT.md`, `BALANCE2_MATCHED_CRITERIA.md`, `BALANCE2_REPORT.md`, `BALANCE2_C3_PREREGISTRATION.md`, `BALANCE2_C3_REPORT.md`, `BALANCE2_FLAT_SOLE_CRITERION.md`, `BALANCE2_B2F_P8_REPORT.md`, `successor/`, `c3/`, `p8/`, `c4/`).
- **[Doc]** 5 user instructions and the push authorization, saved verbatim in `sources/` (the authorization and 4 instructions dated 12 Oct, 1 instruction dated 13 Oct). The short ≈ 16:55 stop request was not saved as a source.
- **[Session]** the times of the user's messages, from the Claude Code session record (UTC + 1 h).
- **[Astra]** commit labels and file times of the separate slide workstream (below).
- No owner screenshots or screen recordings.
- **Run records outside Git** (`_preserved_2026-10-12_evidence_outside_git/…/balance2/records/`, `SHA256SUMS*`):
  - 28 BALANCE-2 review runs, 413 MB;
  - 7 C3 review runs, 113 MB;
  - 2 P8 runs, 79 MB.

**BALANCE-1 results, early morning** (`01653ab` 06:30 freeze; `903c12d` 06:47 results and close). The night's instruction was 04:59 (11 Oct entry).
- **Variants:**
  - A is a continuous, delayed, whole-body no-step controller on M1b;
  - B is A plus an internal model of the ML COM mode.
  - Both were frozen with the battery before any run.
- **Status B, promising but not qualified:**
  - A and B each pass 13 / 16;
  - every failure is forward: the 12 N·s push does not settle in 4 s and the 20 N·s push falls;
  - the P4 criterion itself was flawed.
- B was adopted by the preregistered rule. The adopted M1b force path was recorded in the V2 spec (§14A).

**Publication housekeeping for 11 Oct, afternoon.**
- A tool-permission block stopped the push from 14:24.
- User (16:09): "complete the overdue daily publication by pushing the already-approved local Physical Character V2 and touchline-current commits to their existing configured remote branches".
- **Pushed:**
  - `prototype/physical-character-v2` `1e39418` → `903c12d` (34 commits) at 16:10;
  - `touchline-current` `384c61d` → `23771df` and then `38496e4`, whose chronicle fix records the real push time.

**BALANCE-2, the forward audit, afternoon** (`4154eb4` 16:11, `ae48940` 16:53, `0c0f5f2` 16:56).
- User (14:24): "BALANCE-1 is accepted as a promising result, but the recipient is not yet qualified for PVP." The task was a forward-balance audit, correction and qualification.
- **Audit** (`ae48940`, diagnostic; BALANCE-1 and M1b untouched):
  - the 16 – 23 N·s forward band was not a 50 ms feet-in-place threshold. Its sources were natural stepping, one subject's curve and sub-threshold pushes;
  - duration and support distance were not matched;
  - V2's anatomy is human; its support is not. The rigid F0 boot has no toe loading, so the flat-foot support ends at the oblique MTP break.
  - The P4 test correction (P4′) was frozen before any successor used it.
- **The matched battery B2M** (`0c0f5f2`, frozen before any candidate ran):
  - human "try not to step" fractions (0.50 – 0.70) of the body's zero-delay limit, at the 102.95 mm battery edge;
  - forward band 13.01 – 18.22 N·s;
  - a new overshoot criterion, P8 (≤ 0.26 of the peak).
- At ≈ 16:55 the user asked for a stop at the nearest exit within five minutes. Work paused at the B2M freeze.

**BALANCE-2, the successor C2, early evening** (`36f2e63` 18:08, `a32506b` 18:11, `4b6ebd9` 18:40, `b995c13` 18:42, `ca21830` 18:45, `85792a6` and `01743ae` 18:58).
- User (18:08): "Approved. Continue BALANCE-2 exactly from the frozen checkpoint." And: "The rigid-toe limitation remains a documented body limitation, not something to compensate for through stronger control."
- **Unchanged BALANCE-1 B on B2M:** 16 / 17, failing only P8 (overshoot up to 0.61).
- **C2** = B + three mechanisms:
  - an AP integral confined to the quiet-stance band;
  - a support-aware AP internal model, with a flat-foot envelope of [−124.76, +64.8] mm (Kim 2009);
  - direction-specific muscle constants.
- C2 was frozen before its B2M run.
- **C2 result:** 16 / 17, failing only P8 (backward small 0.287). Causality re-audit PASS. Adopted by the frozen rule.
- Four ankle → hip transitions and a corrected HAT map were tested on DEV and not adopted.
- **A latent BALANCE-1 defect was found:** the trunk-lean loop is ≈ 0 at the hips in AP.
- **Four-system battery:** CURRENT V2 2 / 11, S2 + P2 6 / 11.
- **Post-hoc finding:** C2 recovers forward pushes up to 21.5 N·s by rocking onto its rigid boot tips, which the fall rule scores as falls.
- Review: 28 clips (`balance2/review/BALANCE2_REVIEW.html`); a 23-question report.

**The boot-tip decision and C3, late evening** (`fe301b3` 22:12, `727f475` 22:25, `d590fd4` 22:34, `2bc0275` 22:49).
- User (22:12): "Decision: rigid boot-tip support is not legitimate toe support." And: "require the controller to respect the current rigid foot's legitimate support envelope."
- **A boot-tip load measure** (`scripts/c3_support.mjs`):
  - it classifies each contact as flat sole or raised tip, in the foot's own frame;
  - **B and C2's in-band forward recoveries at 13.65 – 16.5 N·s were 100 % on the tip.**
- **C3** = C2 + a support-envelope governor:
  - the AP command is bounded so that the modelled developed force stays inside C2's own flat-foot envelope;
  - the mode was chosen on DEV by a rule declared before any run;
  - no gain, body or criterion changed.
- **C3 results:**
  - 15 / 17 on B2M, as preregistered;
  - **legitimate support only:** no boot-tip load in any recovered run;
  - its physical forward limit, 12.13 N·s, equals its fall-rule threshold of 12.09, with genuine falls beyond;
  - it failed T1′ forward (12.09 < 13.01, a band scaled to the boot-rocker edge) and P8;
  - status C.

**The flat-sole criterion and the P8 diagnosis, around midnight** (`2b70f3d` and `5773306` 23:18, `44e782d` 23:36, `ae8177f` 23:38, `65373ab` 23:41, `010d03c` 23:42, `ae78010` 00:55 on 13 Oct).
- User (23:16): "Decision: retain the rigid flat-foot body for the current no-step recipient baseline." And: "This is a criterion correction, not permission to tune C3."
- **B2F, the criterion correction** (`44e782d`, frozen before use):
  - the human fractions were normalised to each subject's *loadable* reach, so the fixture must use the loadable flat-sole edge, 80.29 mm;
  - T1′ forward 13.01 – 18.22 → **10.15 – 14.21 N·s**;
  - everything else is unchanged;
  - B2M and C3's 15 / 17 are preserved.
- **Unchanged C3 on B2F: 16 / 17, failing P8 only.** Every run is bit-identical to the original.
- **P8 diagnosis** (`p8/P8_DIAGNOSIS.md`):
  - after a backward push the trunk stays ≈ 1.2° forward about the hips (the HAT-map defect);
  - the integrals turn the slow decay into a ≈ 9 s oscillation, against a human 2 – 3 s response;
  - it is not noise, not body memory (the M1b strain arm resists it) and not the test (feet move < 0.1 mm);
  - classified as controller-side.
- **The one declared minimal successor** (`65373ab` declaration, `010d03c` result):
  - it repaired the hip map with the declared P / D and no new integrator;
  - it made overshoot worse on DEV (back 6: 0.311 → 0.455), so it was rejected;
  - a fix needs coordinated ankle – hip control.
- Report `BALANCE2_B2F_P8_REPORT.md`, which separates human anatomical, rigid-flat-foot and controller capability. Review `balance2/p8/review/`.

**BALANCE-3 instructed** (00:58, 13 Oct; `0055641` 00:59).
- User: "Approved: close the remaining P8 defect with a coordinated ankle–hip controller." And: "Also complete the due 12 Oct publication according to the existing project rule."
- The housekeeping below came first. BALANCE-3 work after it belongs to this chronicle day (until 06:00) and will be added in the next housekeeping.

**Parallel work outside this repository** ([Astra], commit labels and file times only; not investigated).
- The slide workstream continued in the user's Codex workspace clone `~/Documents/Codex/2026-10-12/new-chat/touchline-slide`, branch `research/slide-a1-authored`.
- 15 own commits, 16:05 → 00:47 (13 Oct), not pushed. Labels:
  - SLIDE-A1 authored candidates A – E and Gate A partial (16:05 – 16:48);
  - F, a pelvis-led hip turn (18:15);
  - G, rebuilt from dense reference motion (22:57 – 23:01);
  - H (23:29 – 23:58);
  - I / J, the ground-side leg bend (00:20);
  - a static Gate P source reconstruction (00:29 – 00:47).
- Delivery packages in `~/Documents/Codex/2026-10-12/referenced-chatgpt-conversation-this-is-an/outputs/`: SLIDE_A1 (16:49), hip turn (18:15), G (23:02), H (23:30), I (23:59), J (00:21), GATE_P (00:48).

What was done there is not reconstructed here.

**Addendum, written at the 13 Oct housekeeping (23:45 on 13 Oct): the rest of the chronicle day, 01:05 → 06:00.**

*Evidence for the addendum.*
- **[FC-Sim Git]** `prototype/physical-character-v2`, 12 commits `9662f99` (01:15) → `8aa4eba` (04:48), all local until this housekeeping.
- **[Doc]** `balance3/`, `pvp0/` and `support1/` in `review_artifacts/physical_character_v2/`, each with a report and a review page; 2 user instructions saved verbatim in `sources/` (PVP-0 ≈ 01:50, SUPPORT-1 ≈ 03:41).
- **[Astra]** commit labels only (below).
- No owner screenshots in this window. Run records are outside Git (`_preserved_2026-10-12_evidence_outside_git/…/balance3`, `…/pvp0`, `…/support1`).

**BALANCE-3 results** (`9662f99` 01:15, `ba2ce96` 01:18 audit; `42130c7` 01:33 freeze; `0befb6b` 01:46 results and close).
- **Audit:** the rigid two-segment ankle – hip reduction is wrong for this body (hip torque moves the COM ≈ 7× less than predicted); the low-frequency HAT-at-hips stiffness is neutral (the P8 mechanism); the spine, not the hips, is the soft link for trunk orientation.
- **B3** = C3's A-mode unchanged + an H-mode objective on the hip angle (Alexandrov 2005 eigenmovement control) with a COM-neutral ankle companion, frozen before any run.
- **Result: NOT QUALIFIED.** B2F 14 / 17 (P8 back small 0.34, worse than C3's 0.287; P2; P6 from a preregistration error); hip – ankle torque correlation −0.77 (the loops fight); the forward 12 N·s push now falls. A post-hoc diagnostic was also worse, so the failure is architectural.
- Stop condition: a working modal controller needs a COM pattern from an identified multi-segment model. **C3 stays the 16 / 17 baseline.** Owner decision pending.

**PVP-0, the first two-player physical contact** (user ≈ 01:50: "We are ready for the first controlled two-player integration diagnostic." `64459a7` 01:52 instruction; `d43958e` 02:06 setup freeze; `200eedd` 02:36 erratum; `052b41a` 02:40 results).
- **Inputs:** C3 exactly as frozen (`d590fd4`) × Astra's SLIDE-A1 **K** (`59b7245`, Gate A open: current, not approved), physicalized by a pose tracker through M1b with constant finite authority and no root drive; airborne start at K t 0.30 s (K's run-up is unphysical); three strengths around 6.74 m/s; TWIN and CALIB (no contact) references.
- **Verdicts:** contact physics PARTIAL (a real strike, exact equal-and-opposite, but 12 – 14 mm in sustained crush); visual response FAIL; tackler recognizable NO; recipient plausible NO; ready for the next PVP NO.
- **Three problems:** the tackler belly-flops face-down even with nobody there (CALIB); the bodies lock because constant authority keeps pressing the boot into the pinned foot; the recipient reads as a mannequin.
- **Process error:** the volume is case-insensitive, and PVP-0's `PROVENANCE.json` overwrote K's `provenance.json`; fixed in `200eedd` with no effect on any run.

**SUPPORT-1, the receiver's support loss** (user ≈ 03:41, an overnight mission; `7fa9289` 03:44 instruction; `ca82716` 04:42 audit, lab and successors; `223bba3` 04:42 review media; `8aa4eba` 04:48 report).
- The attached reference recording sat in macOS's protected screen-capture temporary folder and could not be read; no saved copy existed.
- **PVP-0 audit:** the anchored look was the tackler pinning the recipient's feet from above (downward 274 – 334 N·s; a 7.2 kN crush in NOMINAL), not turf friction: the far foot's friction demand peaked at 0.17 of μ 1.2.
- **Literature:** studded traction is if anything higher than V2's (≈ 1.9 – 2.7 at standing loads); rotational traction and ankle stiffness are realistic.
- **Lab:** the unchanged V2 recipient already releases its support passively and produces absorbed / displaced / sliced-out responses. An exploratory sliding body (K's slide pose lowered to the turf) at 6.74 – 8.43 m/s sliced the recipient out in ≈ 0.3 s; at 3.37 m/s it stopped on the feet. K's slide pose floats 85 mm above the turf.
- Four successors were tested: load-scaled stance, an unloading reflex, a load-dependent traction law (LDG), and LDG with the reflex. None beats V2; LDG is more realistic but makes planted feet harder to sweep. **Verdict:** mechanics understood YES; plausible PARTIAL; regressions PASS; visual improvement over PVP-0 NO; canonical NOT YET.
- **Process error:** the disk filled at ≈ 04:19 (per-frame PNG capture dumps); regenerable dumps were deleted.

**Parallel work outside this repository, after 00:47** ([Astra], commit labels only; not investigated).
- `research/slide-a1-authored` in `~/Documents/Codex/2026-10-12/new-chat/touchline-slide`: `071312f` and `59b7245` (01:36), "Author SLIDE-A1 K and add Touchline motion review" (the K consumed by PVP-0), then `3aa0d16` (02:12), "Refine authored tackle entry, arm swing and partial slide roll" (`slide_a1/l/`). Not pushed.

**End-of-day state, corrected** (06:00, 13 Oct). C3 remains the 16 / 17 recipient baseline (BALANCE-3 not qualified). PVP-0 showed the tackler, not the recipient or the turf, is the binding problem; SUPPORT-1 confirmed it. Owner decisions pending on BALANCE-3 and on the tackler. The 12 commits were pushed at 23:45 on 13 Oct in two batches (`0055641` → `052b41a` → `8aa4eba`), verified by a fetch of the remote branch; this chronicle addendum was pushed straight after.

**Corrections and process errors.**
- **The chronicle for 11 Oct** got a follow-up commit (`38496e4`) recording the real push time.
- **BALANCE-2's own instruction file** for 23:16 first carried a wrong receipt time (≈ 23:25). It was corrected in `5773306`, body unchanged.
- **The C3 legitimacy tool** first ran out of memory (it held the 60 s record). It was fixed before the freeze.
- **The P8 diagnosis wording** "doubles" was corrected to "raises to 0.477" before the close.
- **B2M's forward normalisation** was found inconsistent with the boot-tip decision. B2M is preserved; B2F corrects T1′ only.

**Adopted / not adopted.**
- **Adopted by frozen rules:**
  - BALANCE-1 B (06:47);
  - C2 (18:42), then not adopted as the recipient after the 22:12 decision.
- **Owner decisions:**
  - boot-tip support is not legitimate (22:12);
  - the rigid flat foot is retained with no toes or stepping in BALANCE-2, and the corrected flat-sole forward criterion applies (23:16; confirmed 00:58).
- **Current candidate:** C3, 16 / 17 on B2F, failing P8 only. Not qualified; C3 is preserved unchanged.
- **Not adopted, kept as evidence:** C2, the C3 governor modes `command` / `activation`, the C4 hip-map repair H1 and the full-repair reference.
- **Unchanged:** M1b, anatomy, stance, foot and colliders, the fall rule, every frozen battery. PVP sealed.

**End-of-day state** (at the 13 Oct housekeeping, 01:04; the chronicle day runs to 06:00).
- **Physical character:**
  - the canonical M1b muscle layer;
  - a legitimate flat-foot no-step balance controller, C3: forward threshold 12.09 N·s, a human-typical fraction of the rigid flat foot's limit, with no boot-tip support and genuine falls beyond;
  - one gap, P8 (backward small 0.287 vs ≤ 0.26): a slow trunk-lean mode that needs coordinated ankle – hip control (BALANCE-3, in progress);
  - PVP sealed.
- **Publication:** the 22 commits above `903c12d` were pushed at 01:04 on 13 Oct (`903c12d` → `0055641`), in the 12 Oct housekeeping requested at 00:58. This chronicle entry was pushed straight after.

## Tuesday 13 October 2026 — A physical slide tackle: SLIDE-PHYS-1 (SP1) and SLIDE-PHYS-2 (SP2)

**Evidence.**
- **[FC-Sim Git]:**
  - `prototype/physical-character-v2` has 7 commits, `fdbc14d` (23:48) → `b6fc818` (01:10, 14 Oct) → `a4cbf50` and `c7ac9aa` (02:24) → `c12d879` (03:51) → `a730e69` (04:53) → `a59d84b` (05:03).
  - They were pushed at the 14 Oct housekeeping (12:23 on 14 Oct) and verified by fetch.
  - `touchline-current` has `65a6fa8` (23:45, the 12 Oct addendum), pushed at 23:45.
- **[Doc]** in `review_artifacts/physical_character_v2/`:
  - `slide_phys1/`: `SLIDE_PHYS1_REPORT.md` (40 answers), `SLIDE_PHYS1_LOG.md`, `REFERENCE_ANALYSIS.md`, scripts, evidence, review page.
  - `slide_phys2/`: `SLIDE_PHYS2_REPORT.md` (48 answers), `SLIDE_PHYS2_LOG.md`, `REFERENCE2_ANALYSIS.md`, `RECEIVER_PREREG.md`, `research/SLIDE2_LITERATURE.md`, scripts, evidence, review page.
  - 2 user instructions saved verbatim in `sources/` (13 Oct ≈ 23:30; 14 Oct 03:50).
- **[Session]** the times of the user's messages, from the Claude Code session record (UTC + 1 h).
- **[Codex workspace]** file times only (below).
- **Owner screenshots:** 4, archived in `review_artifacts/chronicle_screens/2026-10-13_manager_ui/` (18:58, 19:01, 19:10, 00:35).
- **Screen recordings, not archived (third-party footage):**
  - 19:40, the EA FC playstyle tutorial: the SLIDE-PHYS-1 reference;
  - 23:54 and 23:56, two Rainbow Six pack-opening clips: references for the pack work;
  - 03:49, a broadcast slide-tackle clip: the SLIDE-PHYS-2 reference.
  - The two tackle references and their analyses are preserved outside Git (`_preserved_2026-10-13_evidence_outside_git/slide_phys1/reference/`, `_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/`).
- **Run records outside Git** (`SHA256SUMS*`):
  - SLIDE-PHYS-1: 342 MB;
  - SLIDE-PHYS-2: 385 MB.

**The 13 Oct housekeeping (23:45).** The 12 Oct day and its addendum were published: V2 → `8aa4eba`, and the chronicle `65a6fa8`.

**SLIDE-PHYS-1** (instructed ≈ 23:30, `fdbc14d`): a physically executable slide tackle for the V2 tackler.
- **Reference first.**
  - The EA FC tutorial clip: a bent-leg slide on the trailing hip and thigh, with the trailing hand posting.
  - Slow approach; the hip accelerates horizontally while it descends, with no spring.
- **Astra's K was audited and replaced:** its root accelerates from 2.5 to 7 m/s at up to 3.1 g, 63 % of that airborne.
- **Findings along the way:**
  - **M1b's high-velocity defect:** a shortening group's torque is ≈ 0 above 4–5 rad/s. The M1c candidate (tackler only) fixes it; not adopted.
  - **The entry muscle-state fix.**
  - **TCF-1:** sole-orientation boot friction, tackler only.
  - **G1–G24:** 24 hand-built generations.
  - **Search:** a disclosed CMA-ES authoring search.
- **SP1** (`a4cbf50`):
  - **What works:** a recognisable bent-leg slide from a 4.5–5.5 m/s plant-foot touchdown, with no belly-flop, hover or phasing; deterministic.
  - **Defects:** the tackling heel lands first and the ankle goes 13.5° past its hard limit; the slide is ≈ 0.5 m; it lies back at 5.25 m/s.
  - **Obstacles:** the leg yields; A5's whole-body fallback never fired.
  - **Against unchanged C3:** STRONG gave an unscripted sliced-out fall; LIGHT and MODERATE gave slow falls; GRAZE was absorbed only because the slider's boots pressed the recipient's boots down.
  - **Verdict:** single-player PARTIAL; canonical NOT YET.

**SLIDE-PHYS-2** (instructed 03:50, `c12d879`): the owner's bent-leg / thigh-slide hypothesis.
- **Phase 1 ledger:** the tackling boot gave 71 % of SP1's braking, and it was also SP1's kickstand.
- **Reference 2** (a broadcast clip; ≈ 0.4× slow motion, so a ≈ 9 m/s sprint):
  - trailing instep and shin first, then the knee (+0.04 s), the outer thigh, the hip (+0.24 s), and the hand;
  - the tackling boot never plants; it skims.
  - Literature round 2 agrees.
- **What was tried:**
  - fixtures F1–F3R;
  - hand candidates H1 and H2;
  - searches H1–H6;
  - an A6 RegionalTracker with tactile regional yielding, after two rejected detectors.
- **SP2** (`a730e69`):
  - **Contact:** the folded knee lands first (1.3–2.6 kN over 29 ms), the outer thigh and hip within ≈ 0.1 s. The tackling boot carries ≤ 6 % of the support and its studs never engage.
  - **Slide:** 1.0–1.8 m (SP1: 0.45 m), from 4.25 to 5.5 m/s; deterministic. The mirrored side is neutral (≤ 2.3 mm, `a59d84b`).
  - **Defects:** the fold-hip adduction goes 4–8° past its stop for ≈ 1 s; the knee carries ≈ 50 % of the glide; it fails at ≥ 5.75 m/s.
  - **Requirements:** M1c and TCF-1 are both required, and neither is adopted.
- **Against unchanged C3:** the response is a geometric spectrum (passes, absorbed, displaced-recovered, slow fall), with no sliced-out fall, and the recipient looks rigid. A running, single-support recipient was preregistered (`RECEIVER_PREREG.md`) and not developed.
- **Verdict:**
  - hypothesis CONFIRMED;
  - SP2 PARTIAL;
  - ground entry PASS;
  - slide mechanics PARTIAL;
  - local yielding PASS;
  - graded two-player response PARTIAL;
  - sliced-out NO;
  - SP2 recommended as the development baseline;
  - not ready for the next integration milestone.

**In parallel: the user's Codex workspace** (file times only). None of it is in Git: the card images and HTML that embed real players' photos stay unpublished under the 8 Oct decision.
- **`~/Documents/Codex/2026-10-13/new-chat`** (15:40): input `Touchline_Playable_Statistics.html` plus three reference images (15:43). A Desktop copy of the statistics page is dated 19:42.
- **`…/i-want-you-to-study-games`** (19:17 → 04:06): a pack-opening study.
  - Sub-folders: `touchline-packs` (its own git repository, `dist` 19:47), `r6-reference`, `r6-procedural`.
  - Outputs: `Touchline_Pack_Opening_Heavy` (23:18), `…_R6_Tear` (23:49), `…_Reference` (00:12), `…_Premium` (00:20), `R6_Alpha_Pack_Opening` (00:29), `R6_Alpha_Pack_Procedural` (01:17), `Touchline_Pack_Opening` (04:06).
  - Desktop copies: Reference 00:13, Premium 00:21, R6 Alpha 00:31.
- **`~/Documents/Codex/2026-10-14/new-chat`** (01:33): four generated images (01:34 – 01:42).
- **The owner's screenshots** show the manager UI: a player-card grid, the Club overview (twice), and Club → Staff.

**End-of-day state.** 7 V2 commits, all pushed at the 14 Oct housekeeping. Nothing changed in `touchline-current` except this chronicle.

## Wednesday 14 October 2026 — The tackler's follow-through (SP2A → SP2F3), the first running recipient (PVP-1) and an animation-driven, interruptible runner (HYBRID-RUN-1)

**Evidence.**
- **[FC-Sim Git]:**
  - `prototype/physical-character-v2` has 34 commits, `3fa9d39` (12:25) → `2a70c7d` (14:06) → `58b055d` (14:53) → `e66fe88` (16:56) → `ea7ce07` (18:12) → `be54722` (18:51) → `2849197` (21:29) → `44a80d3` (22:19) → `39a0446` (23:38) → `9d2e951` (00:42, 15 Oct) → `af04ffb` (01:05) → `6e425dd` (03:58) → `d0497c5` (04:17) → `00a9441` (04:51) → `70d4ef2` (05:00) → `d74c10d` (05:04) → `405f086` (05:09) → `fa06d61` (05:18) → `1aa3c60` (05:22) → `4c3a2dd` (05:36) → `68461e6` (05:38) → `bdc5680` (05:40) → `dbc8aa2` (05:57).
  - They were pushed at the 15 Oct housekeeping (06:04 on 15 Oct) and verified by fetch.
  - `touchline-current` has `33fe7f2` (12:24, the 13 Oct entry), pushed at 12:24.
- **[Doc]** in `review_artifacts/physical_character_v2/`:
  - `sp2a/` (with `fsweep/`), `sp2c/`, `sp2d/`, `sp2e/`, `sp2f/` (with `v2/`, `v3/`): a report, a log, scripts, evidence and a review page each.
  - `pvp1_running/`: `PVP1_REPORT.md`, `PVP1_LOG.md`, the main review page and the collision review page.
  - `hybrid_run1/`: `HYBRID_RUN1_REPORT.md` (15 answers), `HYBRID_RUN1_LOG.md`, review page.
  - `hac1/`: `HAC1_REPORT.md` (statuses, defects, blockers), `HAC1_LOG.md` (every candidate, including the failed fully physical runner), scripts, the regression battery and its expectations, evidence, review page.
  - 13 user instructions saved verbatim in `sources/` (14 Oct 12:19 → 15 Oct ≈ 04:15).
- **[Session]** the times of the user's messages, from the Claude Code session record (UTC + 1 h).
- **[Codex workspace]** file times only (below).
- **Owner screenshots:** 2, archived in `review_artifacts/chronicle_screens/2026-10-14_physical_character/` (18:18, 18:19).
- **Screen recording, not archived (third-party footage):** 21:06, a broadcast side-slide tackle clip, REFERENCE3. It is preserved outside Git (`_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/`); every composite with it stays in gitignored `local_reference/` folders.
- **Run records outside Git:** `_preserved_2026-10-14_evidence_outside_git/` (SP2A … SP2F3, 1.1 GB) and `_preserved_2026-10-15_evidence_outside_git/` (PVP-1, HYBRID-RUN-1, HAC-1; 474 MB).

**The 14 Oct housekeeping (12:23 – 12:24).** The 13 Oct day was published: V2 → `a59d84b`, and the chronicle `33fe7f2`. 4 owner screenshots were archived.

**SP2A** (instructed 12:19, `2a70c7d`): the tackler's RUN → DIVE transition.
- **Architecture:** RUN-1's run-in, read-only, to the last toe-off; an authored final flight on the exact ballistic arc; physics from the plant touchdown (SP2's tackle, a contact-authority rule, a searched 3D tuck).
- **Finding:** physics cannot take over the run's last stride. About 60 variants all ended face-down: the limbs lag running-speed motion by 50–100 ms, and RUN-1's stance is not dynamically consistent (its centre of pressure is 0.27 m behind the heel).
- **Result (5.0 m/s):** fold side first, studs away, a 1.35 m slide, deterministic. PARTIAL, not frozen: the knee carries 50 % of the glide, the fold hip overruns 3° for ≈ 1 s, and at 4.5 m/s the body ends face-down.
- **The body-friction sweep** (instructed 14:30, `58b055d`, diagnostic only): non-stud body/turf friction ×1 … ×0. Body friction explains the short slide; F50 looked best; nothing adopted.

**SP2C → SP2E: the follow-through** (all at a temporary body friction F37.5 = ×0.375, not canonical).
- **SP2C** (instructed 15:53, `e66fe88`): a 3D folded-leg tuck before contact and an active follow-through. The universal face-down roll was a lateral trunk/pelvis organisation defect, removed by a stronger trunk counter-lean. Seated at all three speeds, never prone.
- **SP2D** (instructed 17:19, `ea7ce07`): the owner found SP2C too upright, with a floating arm. SP2D lowers the torso onto the folded side / back with a physical folded-side arm post. The arm takes load only when the trunk leans toward the folded side. Never chest-down, but ≈ 3× slower than the reference. The owner's screenshots (18:18) capture this report; the owner approved the direction.
- **SP2E** (instructed 18:22, `be54722`): the same follow-through at the reference's pace. Established +0.43–0.48 s (SP2D ≈ +1.1 s), an early physical post (hand 9–10 % of the load), the shoulder at 134–144°.

**SP2F → SP2F3: the posting arm** (instructed 21:04, 22:18 and 22:59).
- **SP2F** (`2849197`): one continuous recline and a persistent sliding arm post.
- **SP2F2** (`44a80d3`, with REFERENCE3): an early in-air counter-lean release and a two-sided support regulator. **The owner rejected the arm**, and did not accept the folded-knee overrun.
- **SP2F3** (`39a0446`): the post built from the hand outward. The hand's offset from the pelvis is held by a compliant spring, with an eccentric strut and a bent elbow. Hand drift 0.24–0.29 m (SP2F: 0.7–1.0 m); the knee overrun is gone; robust over 30 perturbed runs.

**PVP-1** (instructed 23:47, `9d2e951`): SP2F2 vs SP2F3 against the same running recipient.
- **Setup:** RUN-1 at 4.5 m/s on the tackler's V2 body, handed to a fully physical body 50 ms before contact. Five conditions, each with a no-tackle TWIN.
- **Result:** the physical recipient cannot keep running. Its TWIN falls at +0.42 s, so the up-and-over fall is mostly its own collapse. Struck foot swept 16–40 cm; no pinning. Running recipient state valid: NO.
- **The collision review** (instructed 00:46, `af04ffb`, rendering only): the first contact is the tackling boot against the loaded boot, a brief catch, then a sweep.

**HYBRID-RUN-1** (instructed 02:35, `6e425dd`): RUN-1 stays the locomotor intent; a fully collidable V2 body tracks it with finite authority; contacts win.
- **Works:** the no-contact run is preserved for all of RUN-1's data; contacts override the body region by region, with no ragdoll switch; the PVP rerun has a stable twin.
- **Does not work yet:**
  - a displaced runner never recovers: even after a light brush it falls about 2 s later;
  - an external "animation-consistency" pelvis moment (≤ 450 N·m) has no physical source and props struck runners up;
  - the tackled recipient keeps running about 1 s before falling.
- **Verdicts:** coexistence YES; regional override YES; recovery NO; root motion PARTIAL; recommend NEEDS MORE EVIDENCE.
- An erratum was found: PVP-1's collision review labels the recipient's right as "left". It is recorded in the report; PVP-1 is not edited.

**HAC-1, the night mission** (instructed ≈ 04:15, `d0497c5`). Its WIP commits run 04:51 → 05:22, the milestone is `4c3a2dd` (05:36), then `68461e6` (05:38, an arm balance reaction tried and rejected), `bdc5680` (05:40, review renders) and `dbc8aa2` (05:57, after the report: a placement-carried recovery rejected, and a candidate V1.1 with an earlier fall commitment, not adopted). This is the hybrid active-physics character V1.
- **What was built:**
  - continuous action viability (placement feasibility of the next recovery step, height margin, trunk organisation; no collision-size term);
  - a fall commitment with hysteresis;
  - support-integrity and lost-support detection;
  - a bounded recovery step and an emergency step;
  - regional RUN-intent weights;
  - an active protect intent;
  - a deterministic 22-scene battery and CPU measurement.
- **The fully physical runner fails.** Support only through joints and contact was built in over 20 documented candidates; none ran more than ≈ 2 s:
  - RUN-1 is not angular-momentum consistent;
  - touchdowns come early and cascade;
  - the ankle rolls.
  The hybrid keeps HYBRID-RUN-1's gait abstraction, now withdrawn whenever RUN is not viable.
- **Found:** RUN-1 cannot turn. HYBRID-RUN-1's shoulder pusher B falls even alone, so the shoulder tests use a prescribed push.
- **Push results:** 30 N·s runs on; 60 N·s is knocked 27–33 cm off line and recovers (marginally); 100 N·s falls. The same holds from both sides.
- **The frozen tackle at three support phases:**
  - unloading: absorbed;
  - PVP-1's phase: stumble and forward fall at ≈ +0.7 s;
  - freshly loaded: the boot holds and he runs on.
- **CPU:** ≈ 0.6 ms per character per 240 Hz step.
- **Statuses:** PASS / PARTIAL mix; "hybrid recommended" YES; ready for owner review.
- **After the report** (`dbc8aa2`):
  - **Rejected:** a recovery carried by foot placement instead of the support's sideways servo. The step became visible, but every push fell: the free foot lands off RUN-1's schedule and gets no support.
  - **Candidate V1.1, not adopted:** an earlier fall commitment. Falls carry their speed onto the forearms instead of folding onto a thigh or knees; the battery outcomes are unchanged.

**In parallel: the user's Codex workspace** (file times only; not in Git).
- **`…/2026-10-13/i-want-you-to-study-games`:**
  - 14:43–14:48: pack-opening audio checkpoints ("electrical tear", "rocket audio");
  - 15 Oct 03:14–03:37: an audio-clarity pass, wand and roar reference audio, foil foley;
  - output: `outputs/Touchline_Pack_Opening.html` (03:37).
- **New empty chat folders:** `2026-10-14/new-chat-2` (23:52) and `2026-10-15/new-chat` (01:13).

**End-of-day state.** 34 V2 commits, all pushed at the 15 Oct housekeeping. Nothing changed in `touchline-current` except this chronicle.

## Thursday 15 October 2026 — The 14 Oct publication; TACKLE-REACTION-1 and the tackle lifecycle built in the Codex workspace while the Claude session was blocked; ball physics lab

**Evidence.**
- **[FC-Sim Git]:**
  - `touchline-current`: `f33bcf8` (06:04 BST, the 14 Oct entry), pushed at 06:04.
  - `prototype/physical-character-v2`: no commits after the 06:04 push (head `dbc8aa2`).
  - **[Local]** One linear chain of branches on top of `dbc8aa2`, made in a worktree of this repository inside the user's Codex workspace (`~/Documents/Codex/2026-10-15/files-pasted-by-the-user-astra/work/touchline-tackle-reaction1`). None was pushed:
    - `prototype/tackle-reaction-1`: `859ef12` (10:47 BST), `741d086` (11:02);
    - `prototype/tackle-impact-1`: `0a705cb`, `8b8d2cb` (11:58);
    - `prototype/tackle-contact-v1`: `72f4069`, `da295a7` (13:00);
    - `prototype/tackle-contact-v1-polish`: `6c051cd` (16 Oct 03:38 EEST);
    - `prototype/tackle-recovery-v1`: `2ce6c44` (04:51 EEST);
    - `prototype/tackle-recovery-v1-1` and `prototype/tackle-recovery-v1-2`: `dbc13ff` (05:33 EEST). An uncommitted `tackle_recovery_v1_2/` folder was still in progress at 06:00; it belongs to 16 Oct.
  - **[Local]** A separate clone in the Codex workspace (`~/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/touchline-ball-phys1`), also from `dbc8aa2`: `f3e2ff6` BALL-PHYS-1 (04:38 EEST) and `51bbcb2` BALL-FEEL-1 (05:37 EEST) on `prototype/ball-feel-1-1`; an uncommitted `sandbox/visual/ballfeel11/` was in progress.
- **[Doc]** in those branches, under `review_artifacts/physical_character_v2/`: `tackle_reaction1/` (`TACKLE_REACTION1_REPORT.md`, `REFERENCE_RECIPIENT.md`, `STATE_RECONSTRUCTION.md`), `tackle_impact1/`, `tackle_contact_v1/`, `tackle_contact_polish/`, `tackle_recovery_v1/`, `tackle_recovery_v1_1/`: a report and a review page each. The Codex `outputs/` folders mirror them (TACKLE-REACTION-1 13:03 BST → TACKLE-RECOVERY-V1.1 05:36 EEST); ball review archives 04:42 and 05:40 EEST.
- **[Session]** The owner's TACKLE-REACTION-1 instruction reached the Claude Code session at 09:47 BST. The session had hit its weekly usage limit and did nothing; a "test" message at 03:58 EEST met the same limit. The session resumed at 06:01 EEST on 16 Oct.
- **Clock.** The machine's time zone changed from Europe/London to Europe/Athens at ≈ 23:27 UTC (the `/etc/localtime` link). Times after that are EEST (UTC + 3); this chronicle day ends at 06:00 local, 03:00 UTC.
- **Owner screenshots:** none found.

**The 15 Oct housekeeping (06:04 BST).** The 14 Oct day was published: V2 `a59d84b` → `dbc8aa2` in one ≈ 530 MB push (after a larger HTTP buffer) and the chronicle `f33bcf8`, both verified by fetch.

**TACKLE-REACTION-1** (instructed 09:47 BST; built in the Codex workspace, `859ef12` / `741d086`). The owner moved the priority from general bump / recovery / balance work to the two-player slide tackle: authored athletic intent + rigid bodies + real contacts + finite active control. HAC-1 is frozen as research.
- **Built:** a `TackledRunner` that runs HAC-1's RUN until an explicit tackle result, then commits RUN → TACKLED_FALL within one 240 Hz step, starting from the exact physical state (every segment's pose and velocity). After the commitment all RUN support and external pelvis moments are off. A protect response adapts to the measured trunk orientation (neck, arms; forearm turf friction 0.20).
- **Candidate R6** (six versions; R1 – R4 rejected for head contact or joint range): F3 + R6 is preferred. Forward speed 4.45 m/s at contact, ≈ 96 % kept at +100 ms; ≈ 1 m of pelvis travel by +300 ms (2.6× the drop); first ground contact a forearm at +346 / +362 ms; no head contact; no kneeling.
- **Contact height:** first contact switches between boot and shin; the ankle band was not resolved separately. Best current region: BOOT.
- **Not solved:** a front-dominant, sharp landing (pelvis turf impulses 37.5 / 84.2 N·s in one step), early ankle range excursions, tackler over-capacity counters.

**TACKLE-IMPACT-1** (`0a705cb`, `8b8d2cb`, 11:58 BST): a physical impact ledger. COMBO6_EARLY (F3 entering at 6 m/s) was selected, with stop condition B for the tested F3 family: the fixture's 135° near-opposing approach brakes the recipient, whereas the reference's paths cross at ≈ 25 – 35°.

**TACKLE-CONTACT-V1** (`72f4069`, `da295a7`, 13:00 BST): a ten-case collision spectrum (five approach angles × NORMAL / HIGH speed) with a continuous TRIP / SLICE / IMPACT resolver fed by measured contact facts. The owner's review verdicts are preserved in the branch.

**Overnight (16 Oct, EEST):**
- **Polish** (`6c051cd`, 03:38): landing-protection candidate C10. The 135° HIGH head impact goes to zero; the F3 follow-through and entanglement remain partial.
- **TACKLE-RECOVERY-V1** (`2ce6c44`, 04:51): the whole lifecycle (fall → active settle → orientation-classified authored get-up → IDLE) for all 20 players. Recovery availability is a gameplay input, never an animation output.
- **TACKLE-RECOVERY-V1.1** (`dbc13ff`, 05:33): each player recovers independently, and the adjustment before the get-up is much shorter.
- **BALL-PHYS-1** (`f3e2ff6`, 04:38) and **BALL-FEEL-1** (`51bbcb2`, 05:37), from their commit messages: a deterministic physical football lab with an authoritative launch hand-off, then turf and launch calibration with camera review evidence.
- None of these branches was pushed, and none is integrated.

**End-of-day state.** No V2 commits from the Claude session after the 06:04 push. The Codex tackle chain (9 commits) and the ball clone (2 commits) are local. Nothing changed in `touchline-current` except this chronicle.

## Friday 16 October 2026 — The 15 Oct publication; TURN-1 → TURN-1.2, a frozen turning baseline; DRIBBLE-1 and DRIBBLE-1.1, physical dribbling on it; the Codex ball and tackle labs

**Evidence.**
- **[FC-Sim Git]:**
  - `touchline-current`: `5b0d9b0` (06:05 EEST, the 15 Oct entry), pushed at 06:06.
  - `prototype/physical-character-v2`: `1588a9d` (06:06) and `ec79770` (06:07). Both save owner instructions verbatim: TACKLE-REACTION-1 of 15 Oct, and the TURN-1 pivot mission. They are pushed in the 17 Oct housekeeping.
  - **`prototype/turn-1`** (new; cut from `prototype/locomotion-v2-run1`, the frozen RUN-1.3 straight baseline): 17 commits, `6185b97` (06:43) → `2129ca0` (17:37). The annotated tag **`locomotion-turn12-baseline-1`** → `2129ca0`. Pushed with the tag at 17:58 and verified by fetch.
  - **`prototype/dribble-1`** (new, on `2129ca0`):
    - DRIBBLE-1: 15 commits, `7c749a9` (18:25) → `7fe57fd` (23:55);
    - DRIBBLE-1.1: 8 commits, `e134462` (17 Oct 01:28) → `7d8c852` (05:00).
    - Pushed in the 17 Oct housekeeping.
  - **[Local]** The Codex tackle worktree (the same repository; `~/Documents/Codex/2026-10-15/…/touchline-tackle-reaction1`): `prototype/tackle-recovery-v1-2` `0500c76` (06:12) and `prototype/tackle-recovery-v1-3` `e4d6716` (16:02). Not pushed.
  - **[Local]** The Codex ball clone (`~/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/touchline-ball-phys1`), one branch per step. None was pushed to FC-Simulator.

    | Branch | Commit | Time |
    |---|---|---|
    | `prototype/ball-feel-1-1` | `e8da0c3` | 06:20 |
    | `-1-2` | `db526cc` | 16:21 |
    | `-1-3` | `75866e9` | 17:02 |
    | `-1-4` | `c947998` | 18:35 |
    | `prototype/ball-shot-1` | `d5790bf` | 20:39 |
    | `prototype/ball-shot-1-1` | `0b60ba9` | 17 Oct 00:40 |
    | `prototype/gk-shot-map-1` | `dba4976` | 02:25 |

    BALL-FEEL-1.3 was fetched read-only into this repository (`balllab/ball-feel-1-3`) as DRIBBLE-1's ball.
- **[Doc]:**
  - `review_artifacts/turn1/`: `TURN1_REPORT.md`, `turn11/TURN11_REPORT.md`, `turn12/TURN12_REPORT.md`, `turn12/TURN12_HANDOFF.md`, review pages;
  - `review_artifacts/dribble1/`: `DRIBBLE1_REPORT.md`, `DRIBBLE1_HANDOFF.md`, review page;
  - `review_artifacts/dribble11/`: `DRIBBLE11_REPORT.md`, `DRIBBLE11_HANDOFF.md`, review page.
  - The Codex `outputs/` folders hold the ball and shot READMEs and their review zips.
  - The DRIBBLE review pages name real players; they are local review pages only.
- **[Session]** The Claude session resumed at 06:01. Owner instructions:

  | Time (EEST) | Instruction | Saved verbatim in |
  |---|---|---|
  | start of the day | Stop the tackle task ("another agent has taken over"); TURN-1 | V2 `ec79770` |
  | 15:14 | TURN-1 approved; TURN-1.1 | `382e915` |
  | 16:46 | TURN-1.2 | `a83e199` |
  | 17:34 | Freeze / publish / handoff | `8a5a8f1` |
  | ≈ 18:22 | DRIBBLE-1 | `7c749a9` |
  | 17 Oct 01:26 | DRIBBLE-1.1 | `e134462` |

- **Owner screenshots:** none.
  - Six owner screen recordings of football broadcast footage (16 Oct, 5.36 PM – 9.15 PM, Desktop and Downloads) were supplied to the Codex ball lab as pace and shot references.
  - They are third-party footage and stay outside Git.

**The 15 Oct housekeeping (06:06).** The chronicle `5b0d9b0` was pushed and verified. Two owner instructions were then saved to the V2 branch (`1588a9d`, `ec79770`) and left for this publication.

**The pivot.** The owner stopped Claude's tackle work: the Codex agent owns the tackle line. Claude moved to turning and cutting locomotion, with no ball.

**TURN-1** (06:43 – 07:40, `6185b97` → `7b58d1a`). A turning and cutting engine on the unmodified RUN-1.3 straight baseline (`sandbox/visual/turn1/turn1_loco.js`).
- **How it works:**
  - The centre of mass changes horizontal velocity only through the stance foot: a half-sine ΔV per stance, bounded by what that stance can deliver. Flights are ballistic, with no root rotation.
  - Plants are world-locked points chosen at touchdown (RUN-1's placement plus the inverted-pendulum offset).
  - The swing is RUN-1's own path, warped onto the aimed plant.
  - The pelvis heading is its own state.
  - A resolver turns each request into ARC / CUT (side-step or crossover) / PIVOT.
  - Braking is planned from what a braking stance can really remove: up to 4 braking steps before a cut, 5 before a reversal.
- **Results** (77 scenarios):
  - deterministic;
  - plant slip median 0.02 cm, p90 0.46 cm;
  - mirroring exact in 32 / 32;
  - pelvis continuity ≤ 11.6 mm.
- **Statuses:** PASS except 120 – 150°, 180° and sprint coverage (PARTIAL).
- **At 15:14 the owner approved TURN-1 as the mechanical foundation.** Its movement maths is frozen.

**TURN-1.1** (15:14 – 16:28, `382e915` → `bb97f42`). Authored football cut body language as a presentation-only layer (`turn11_body.js`):
- three plant bases (SIDESTEP, XOVER, PIVOT) as key poses on a plant timeline;
- BRAKE / EXIT modifiers and a reaction term;
- authored for the right and mirrored.

Results:
- Movement identity 84 / 84 with and without the layer.
- Slip p90 0.46 → 0.11 cm.
- Visible reaction 0.20 → 0.07 s.
- Crossover and sprint 180° PARTIAL.

Found on the way:
- Arms must be authored as directions in the pelvis-heading frame.
- Replacing TURN-1's crouch exposes the leg's reach budget.

**The owner preferred original TURN-1 for ordinary turns**, so TURN-1.1 is kept as research.

**TURN-1.2** (16:46 – 17:19, `a83e199` → `634bf20`). TURN-1 is restored as the default and stays bit-identical (77 / 77). It gains one opt-in family for large turns under real momentum:
- **The family:** BRAKE → REORGANISE → TURN → ACCELERATE (BRAKE_TURN, BRAKE_SHUFFLE_TURN). It has new step roles BRAKEQ and REORG, and the turn plant goes on the outside foot.
- **When it applies:** the angle must be large for the speed (118° at 5 m/s falling to 102° at 9.5 m/s), and at least 3.6 m/s of excess speed must remain. In the ±10° transition band the stride state decides.
- **Compact pivot:** TURN-1's pivot no longer waits through a braking stride once its speed is already down.
- **Statuses:** all PASS / YES. TURN-1.1's 84 hashes are untouched.

**The freeze** (17:34 – 17:37, `8a5a8f1`, `2129ca0`). The owner approved TURN-1.2 as the locomotion baseline.
- The handoff (`TURN12_HANDOFF.md`), freeze manifest and parameters were committed.
- **Tag `locomotion-turn12-baseline-1`.**
- The branch and tag were pushed at 17:58 and verified. The final regression was byte-identical to the reviewed evidence.

**DRIBBLE-1** (18:25 – 23:55, `7c749a9` → `7fe57fd`). Physics-based dribbling with no tether, on the frozen TURN-1.2 and the Codex BALL-FEEL-1.3 world (`75866e9`, 23 files imported byte-identical).

How it works:
- The touch is a time-warp of TURN-1.2's own free-leg swing, pinned at both ends, so the plants stay bit-identical.
- **Three touch architectures** on identical fixtures (straight / 60° cut, controlled share):
  - A, pure physical boot impulse: 26 % / 33 %; the boot misses or glances.
  - **B, resolved: 99 % / 70 %.** One authoritative launch through the kernel's `schedule()` at a verified boot contact.
  - C, bounded hybrid: 88 % / 60 %.
- **B was selected.** Between touches the ball is fully physical; a defender's leg sweep or a slide knocks it loose with no snap-back.

Results (8 seeds):

| Case | Result |
|---|---|
| Straight JOG / RUN / FAST | 100 / 97 / 100 % |
| Straight SPRINT | 88 % (PARTIAL) |
| Curves | 95 – 96 % |
| Turns taken with the ball | 45° 5/8, 60° 5/8, 90° 1 – 2/8, 135° / 180° 0/8 |
| Double impulses | 0 |
| Tether audit | 0 unexplained deviations |
| Node replay | 20 / 20 |
| Chrome vs Node | 18 / 20; DRIBBLE-1.1 later showed these differences are last-bit floating point, not branching |
| CPU | 497 ms per simulated second, of which ≈ 470 is the resolver's look-ahead |

Discoveries:
- **The controlled share hides failed cuts.** A player who never takes the cut keeps the ball, so the honest metric became "taken with the ball": released by a touch, heading within 20°, controlled at the end.
- **The cut limit is the follow-through.** After an early-swing contact the foot races to its unchanged plant, so only firm launches escape a second contact.

Stopped for owner visual review.

**DRIBBLE-1.1** (17 Oct 01:26 – 05:00, `e134462` → `7d8c852`). Soft-touch follow-through, cut reliability and resolver CPU. DRIBBLE-1 is kept frozen.
- **An optimisation twin first** (`511923e`): the new planning machinery running DRIBBLE-1's football. It is bit-identical to DRIBBLE-1 in 40 / 40 runs (touches, kernel events, the 240 Hz record). The machinery:
  - one shared, lazily extended TURN-1.2 prediction per input;
  - pose evaluation without skinning;
  - memoised windows and launches.
- **Then the behaviour:**
  - **A contact-aware follow-through:** a yield in the swing's time-warp, plus an arc away from the ball's new line with a lift. It is solved per touch from the executed launch. It is zero at the contact, done by 95 % of the swing, and the foot lands on TURN-1.2's unchanged plant.
  - **The touching swing is committed until it lands.** TURN-1.2 retargets a swing on every input change, which had made the foot run ≈ 80 mm ahead of the model.
  - Held and staged cuts, and plan-relative pursuit.
  - Decision-level planning savings.
  - A kernel step that recovers a pinched ball: the leg yields, and the ball's state is never written.
- **Results** (HIGH profile, 8 seeds; DRIBBLE-1 in brackets):

  | Case | Result |
  |---|---|
  | 45° | 7/8 |
  | 60° | 4/8 (5/8) |
  | 60° left | 5/8 (3/8) |
  | 90° | 2/8 (1/8) |
  | 90° left | 4/8 (2/8) |
  | Straight RUN | 80.5 % (97 %), a regression |
  | Firm recovery touches | 78 → 31 |
  | Same-foot second contacts | 1.1 % (0 %) |
  | Outside-of-the-foot touches | none |
  | Resolver CPU | 465 → 144 ms per simulated second (3.2×, not the 10× aimed for) |
  | Chrome / Node decisions | 20 / 20 |
  | Pinched-ball stress | 0 unrecovered in 3,000 wedges |

- **Diagnosis:** cuts are now limited by where the ball is when the foot can reach it, not by the follow-through. A left-footed profile takes the right 60° cut 8 / 8 on its inside, while the right-footer's outside contact is never feasible.
- **A self-inflicted error, caught and recorded:** a silently failed edit left one cut-cost parameter undefined (NaN costs). That first evidence batch was superseded and kept as `evidence/old_bb3efc73/`.
- **Proposed next:** DRIBBLE-1.2 = cut geometry (an outside contact and a set-up touch), plus fixes for the two regressions. Stopped for owner review.

**The Codex labs** (read-only from the outputs and commit messages; not integrated):
- **The ball line:**
  - **BALL-FEEL-1.1:** faster launches and a progressive rolling law.
  - **1.2:** driven-pass grip and curve shapes.
  - **1.3:** opt-in launch-only turf skips; this is the world DRIBBLE-1 imports.
  - **1.4:** ground-ball pace calibrated against two owner-supplied reference clips; Candidate A is provisional.
  - **BALL-SHOT-1:** a Shot Power 80 family lab (Inside 30, Outside 32, Laces 34, Power 39, Chip 16 m/s).
  - **BALL-SHOT-1.1:** reference-guided candidates; working technique labels await owner confirmation.
  - **GK-SHOT-MAP-1:** a frozen goalkeeper shot-envelope lab.
- **The tackle line:** TACKLE-RECOVERY-V1.2 (keep tackle contacts while braking broad prone F3 exits) and V1.3 (the separated F3 posting arm with finite sliding support).

**End-of-day state.**

| Item | State |
|---|---|
| TURN-1.2 | Frozen, tagged and published |
| DRIBBLE-1 | Committed, awaiting owner review; published in the 17 Oct housekeeping |
| DRIBBLE-1.1 | Committed, awaiting owner review; published in the 17 Oct housekeeping |
| V2 | Gained only two instruction files |
| Codex ball and tackle labs | Local branches |
| `touchline-current` | No changes except this chronicle |

## Saturday 17 October 2026 — The 16 Oct publication; DRIBBLE-1.2 → DRIBBLE-1.5, the DRIBBLE-V1 foundation frozen; RECEIVE-CONTROL-1 begun; the Codex shot, curve and charge labs

**Evidence.**
- **[FC-Sim Git]:**
  - `touchline-current`: `adabb41` (06:00 EEST, the 16 Oct entry), pushed in the 17 Oct housekeeping.
  - **`prototype/dribble-1`**, 28 commits this day, all pushed in the 18 Oct housekeeping:

    | Milestone | Commits | Time |
    |---|---|---|
    | DRIBBLE-1.2 | `a883739` → `a2f0505` (12) | 07:04 – 16:43 |
    | DRIBBLE-1.3 | `d7e0b41` → `2e44e1f` (7) | 17:40 – 23:39 |
    | DRIBBLE-1.4 | `e05a42d`, `7e15213`, `33ce1ca` | 18 Oct 00:01 – 02:02 |
    | DRIBBLE-1.5 | `daa5352`, `4f20d28` | 02:38 – 03:48 |
    | RECEIVE-CONTROL-1 | `c420657`, `d13963a`, `ab65d46`, `b6434a2` | 04:36 – 05:43 |

  - The annotated tag **`dribble-v1-foundation-1`** → `4f20d28`, pushed explicitly in the 18 Oct housekeeping.
  - **[Local]** The Codex ball clone (`~/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/work/touchline-ball-phys1`), one branch per step. None was pushed to FC-Simulator.

    | Branch | Commit | Time |
    |---|---|---|
    | `prototype/ball-shot-1.2` | `c62f854` | 17:27 |
    | `prototype/curve-1` | `83564d5` | 17:55 |
    | `prototype/curve-1-simple-review` (= `curve-magnitude-brackets`) | `4f72fbf` | 20:45 |
    | `prototype/curve-1-1-strength` | `aae44ae` | 21:04 |
    | `prototype/shot-charge-1` | `05d1e68` | 21:45 |
    | `prototype/shot-charge-1-1-shape` | `b71910b` | 22:35 |
    | `prototype/shot-charge-1-2-overcharge` | `c7d04b9` | 23:05 |
    | `prototype/shot-charge-1-3-faster-input` | `7653bcb` | 18 Oct 00:16 |

    An output folder `SHOT-ACCURACY-1.0-VISUAL` was written at 18 Oct 04:48 with no commit; it is listed here only.
- **[Doc]:**
  - `review_artifacts/dribble12/` … `dribble15/`: each `DRIBBLE1x_REPORT.md`, `DRIBBLE1x_HANDOFF.md`, `DRIBBLE1x_STATUS.json` (1.2 – 1.5), review page and videos;
  - `review_artifacts/receive1/`: the owner instruction and the frozen-file hashes at its start.
  - The DRIBBLE review pages name real players; they are local review pages only.
  - The Codex `outputs/` folders hold the shot, curve and charge READMEs, review pages and videos.
- **[Session]** Owner instructions:

  | Time (EEST) | Instruction | Saved verbatim in |
  |---|---|---|
  | ≈ 07:03 | DRIBBLE-1.2 — cut contact geometry and the set-up touch | `a883739` |
  | 17:39 | DRIBBLE-1.3 — make DRIBBLE-1.2 fast without losing the football | `d7e0b41` |
  | ≈ 23:59 | DRIBBLE-1.4 — final foundation cleanup before attributes | `e05a42d` |
  | 18 Oct ≈ 02:35 | DRIBBLE-1.5 — the last narrow foundation pass; freeze if it passes | `daa5352` |
  | 18 Oct ≈ 04:30 | RECEIVE-CONTROL-1 — full-throttle receiving and turning first touches | `c420657` |

- **Owner screenshots:** none.

**The 16 Oct housekeeping (06:00 – 06:37).** The chronicle `adabb41` was committed and pushed. The V2 instruction commits (`ec79770`) and `prototype/dribble-1` up to DRIBBLE-1.1 (`7d8c852`) were pushed and verified.

**DRIBBLE-1.2** (07:04 – 16:43, `a883739` → `a2f0505`). Cut contact geometry on DRIBBLE-1.1, which stays frozen (`sandbox/visual/dribble12/`).
- **What was added:**
  - a **future contact corridor**: for a later swing, foot and surface, the exact set of ball positions that surface can meet with a given launch;
  - a **set-up touch**: a touch on the line that places the ball inside a later swing's decisive corridor, validated before it is made;
  - genuine **outside-of-the-foot** cut contacts; the side surfaces strike with whichever forefoot hull meets the ball first;
  - staged release-now for big cuts; exact time-warped poses in non-steady motion (the root cause of 1.1's same-foot toe re-contacts).
- **Results** (HIGH profile, seeds 1–8; 16 seeds in brackets):

  | Case | Result |
  |---|---|
  | 60° right / left | 7/8 (14/16) / 6/8 (14/16) |
  | 90° right / left | 5/8 (12/16) / 5/8 (9/16) |
  | Straight RUN | 100 % |
  | Decisive cut surfaces | OUTSIDE 45 % / INSIDE 36 % / FRONT 8 % (1.1: FRONT 88 %) |
  | Request → redirect | 1.98 → 0.83 s |
  | Same-foot re-contacts | 1 in 1,647 |
  | CPU | 253 ms per simulated second, worst planning pass 604 ms — FAIL |
  | Chrome / Node decisions | 20 / 20 |

- Stopped for owner review at ≈ 17:00.

**DRIBBLE-1.3** (17:40 – 23:39, `d7e0b41` → `2e44e1f`). Make 1.2 fast without losing its football.
- **An incremental planner** (`plan13`): 1.2's search runs as generators over deterministic work units, a fixed budget per 240 Hz tick (2 ms; 8 ms while a decision is due), so a replay pauses at the same points on any machine. Plus an exact leg-only pose and speed caches solved at load.
- **A behavioural twin suite** against 1.2 (200 runs) guarded every step.
- **Results:**
  - CPU 208 → 148 ms per simulated second, measured with each core in its own process (1.2's published 253 came from a shared-process instrument);
  - worst step 538 → 41 ms;
  - football 256 / 384 cuts taken (1.2: 258); clean cuts 114 (1.2: 129).
- Readiness for integration: NOT YET; stopped for owner review at ≈ 23:40.

**DRIBBLE-1.4** (18 Oct 00:01 – 02:02, `e05a42d` → `33ce1ca`). Final foundation cleanup.
- **The known early-release case** (90° right, seed 16): the release search sampled contacts every 3 ticks from the release tick, so the release lead modulo 3 moved the contact by one tick, and with it the keyed execution draw. Fixed with an every-tick release contact window and a contact-timed re-release.
- **The set-up validator** rejected 59 % of working set-ups; it now grades physical quality (mean window coverage over the execution envelope).
- **Results** (384 cut runs, seeds 1–96): 273 taken, 121 clean; toe 5.9 %; 143 ms per simulated second, worst step 23 ms; Chrome / Node 20 / 20; TURN-1.2 bit-identical.
- READY TO FREEZE: NO — clean 90° cuts had fallen to 27 (1.2: 48).

**DRIBBLE-1.5** (02:38 – 03:48, `daa5352`, `4f20d28`). The last narrow foundation pass.
- **Root cause of the slow 90° cuts:** after a staged first touch, the planner measured the rest of the cut from the lagging velocity heading, so a 90° cut staged to 45° still looked big and was staged a second time — one more touch and ≈ 0.5 s. It now measures from the stage line, as the intent layer already did (`plan15.stageLine`).
- The rest of the gap was decision latency: the decision-tick budget went from 8 to 12 ms.
- `maxSetups`, `rStop1` and `c12CutAtContact` were each tested alone on the 384-run matrix: no effect.
- **Results** (384 cut runs; D1.4 in brackets): 273 taken (273), **140 clean (121)**, clean 90° 47 (27); toe 6.2 %; 144 ms per simulated second, worst step 34 ms; Chrome / Node 20 / 20; leg pose bit-identical in 112,319 checks. Seeds 97–192: 282 taken / 146 clean.
- **READY TO FREEZE: YES.** The foundation is frozen as **DRIBBLE-V1** (`sandbox/visual/dribble15/d15_core.js`), tag **`dribble-v1-foundation-1`**. Next on the dribble line: the attribute layer.

**RECEIVE-CONTROL-1** (from 04:36, `c420657` → `b6434a2`). Full-throttle receiving and turning first touches, on the frozen DRIBBLE-V1.
- Built as an adapter (`sandbox/visual/receive1/rc1_core.js`): a receive subclass of the frozen dribble simulation. The frozen core is unchanged (sha256 recorded at the start).
- What it does so far: the incoming pass, a meeting-point interception, the receive-turn-angle classification (90° – 270° is a turning receive), and receive options handed to the frozen planner — approach lines, the turn released at ticks timed to the ball's arrival, and early turns from lines on the turn side.
- In progress at the end of the day: work-in-progress commits `d13963a`, `ab65d46` and `b6434a2`; not yet presented. A first representative matrix at 05:51 (714 runs, 3 seeds): 36 % clean receives and 31 % with no touch at all; firm passes, jogging receivers and passes from front-right or behind are the weak cases.

**The Codex labs** (read-only from the outputs and commit messages; not integrated):
- **BALL-SHOT-1.2:** the final V1 Shot Power calibration (shot speed anchored at 90; chip response compressed).
- **CURVE-1 → CURVE-1.1:** a continuous-Magnus Finesse Curve candidate (sidespin 40 × (Curve / 75)^2.7 rad/s), a simple behind-the-shooter review, then the same system 40 % stronger.
- **SHOT-CHARGE-1 → 1.3:** an isolated Laces hold-to-charge lab: the charge sets the trajectory shape before contact (a physical apex solver), then a capped-speed overcharge and a live hold-to-shoot lab, then faster input timing. Owner review candidates; no winner selected.

**End-of-day state.**

| Item | State |
|---|---|
| DRIBBLE-V1 (DRIBBLE-1.5) | Frozen and tagged; published in the 18 Oct housekeeping |
| DRIBBLE-1.2 – 1.4 | Committed; frozen as references; published in the 18 Oct housekeeping |
| RECEIVE-CONTROL-1 | In progress (work-in-progress commit) |
| Codex ball / curve / charge labs | Local branches |
| `touchline-current` | No changes except this chronicle |

## Sunday 18 October 2026 — The 17 Oct publication; RECEIVE-CONTROL-1 presented; RECEIVE-CONTROL-1.1, authored receive actions; RECEIVE-KILL-1 → 1.2 B, the Ball Control scale; RECEIVE-TURN-1 and 1.1, the stationary receive-and-turn and its human motion; the Codex shot-accuracy and standing-tackle labs

**Evidence.**
- **[FC-Sim Git]:**
  - `touchline-current`: `c01274e` (the 17 Oct entry), pushed in the 18 Oct housekeeping.
  - **`prototype/dribble-1`**, 24 commits this day, all pushed in the 19 Oct housekeeping:

    | Milestone | Commits | Time |
    |---|---|---|
    | RECEIVE-CONTROL-1 | `d6dd233`, `dc6693c` | 06:34 – 07:04 |
    | RECEIVE-CONTROL-1.1 | `f4a896f` → `470a4ab` (4) | 12:41 – 14:28 |
    | RECEIVE-KILL-1 | `21d9010`, `5758445`, `d0064a8` | 19:52 – 21:22 |
    | RECEIVE-KILL-1.1 | `869264b`, `a1f8fbd`, `f6f7a88` | 21:46 – 22:27 |
    | RECEIVE-KILL-1.2 (and B) | `9867a1a`, `9aba8b9`, `e5aacc9`, `ec5d972` | 23:17 – 19 Oct 01:54 |
    | RECEIVE-TURN-1 | `da7bdcf`, `6881ce0`, `33c58e5` | 19 Oct 02:39 – 04:10 |
    | RECEIVE-TURN-1.1 | `26cb992`, `23b6dca` | 19 Oct 04:26 – 05:24 |
    | The queued receive work (instruction only) | `d03b6fc` | 19 Oct 04:46 |
    | RECEIVE-CONTROL-2 (QUEUE #1), work in progress | `53a6f0d`, `3dddda5` | 19 Oct 05:46 – 05:56 |

  - **[Local]** The Codex workspaces, read-only, no commits this day:
    - the ball clone's `outputs/SHOT-ACCURACY-1.0-VISUAL` folder was updated (file times to 19 Oct 04:20);
    - a new workspace, `~/Documents/Codex/2026-10-19/files-pasted-by-the-user-touchline/` (19 Oct 04:37 – 05:04): **Standing Tackle V1 — Phase C**, an isolated visual prototype (`outputs/standing-tackle-review.html`, `validation.md`).
- **[Doc]:**
  - `review_artifacts/receive1/`, `receive11/`, `receive_kill1/`, `receive_kill11/`, `receive_kill12/`, `receive_turn1/`, `receive_turn11/`: each milestone's report, handoff, status, evidence and review page;
  - every owner instruction verbatim in that milestone's `sources/`;
  - the review pages show a real player's model; they are local review pages only.
- **[Session]** Owner instructions:

  | Time (EEST) | Instruction | Saved verbatim in |
  |---|---|---|
  | ≈ 12:30 | RECEIVE-CONTROL-1.1 — authored receive actions with one authoritative contact, not a contact search | `f4a896f` |
  | ≈ 19:50 | RECEIVE-KILL-1 — isolate the kill / deaden action and show how Ball Control meets difficulty | `21d9010` |
  | ≈ 21:45 | RECEIVE-KILL-1.1 — compress Ball Control's error; follow-up control for thigh / chest / head | `869264b` |
  | ≈ 23:00 | RECEIVE-KILL-1.2 — a harsher rating scale with two anchors | `9867a1a` |
  | 19 Oct ≈ 01:10 | RECEIVE-KILL-1.2 — use alternative B | `e5aacc9` |
  | 19 Oct ≈ 02:30 | RECEIVE-TURN-1 — execution variance around B; a stationary receive-and-turn library by angle | `da7bdcf` |
  | 19 Oct ≈ 04:20 | RECEIVE-TURN-1.1 — human body motion around the authoritative football action | `26cb992` |
  | 19 Oct ≈ 04:45 | Two queued assignments: integrate RECEIVE-KILL + RECEIVE-TURN into RECEIVE-CONTROL; then receiving while moving | `d03b6fc` |

- **Owner screenshots:** none.

**The 17 Oct housekeeping (06:00 – 06:08).** The chronicle `c01274e` was committed and pushed. `prototype/dribble-1` up to `b6434a2` and the tag `dribble-v1-foundation-1` were pushed and verified.

**RECEIVE-CONTROL-1** (06:34 – 07:04, `d6dd233`, `dc6693c`). Presented for review: a receive adapter on the frozen DRIBBLE-V1 that hands receive options to the frozen planner.
- **Results** (714 runs = 238 situations × 3 seeds): CLEAN 279, TAKEN 27, RECEIVED 157, RECOVERED 38, MISSED 213; the receive phase cost 816 ms per simulated second; Chrome / Node decisions 20 / 20; DRIBBLE-V1 unchanged.
- **Finding:** the frozen dribble contact model only meets a ball within ≈ 15 cm of a late-swing foot path. Not ready to freeze; the owner's answer was a dedicated receive contact model.

**RECEIVE-CONTROL-1.1** (12:41 – 14:28, `f4a896f` → `470a4ab`). Receiving as authored receive actions beside DRIBBLE-V1 (`sandbox/visual/receive11/`).
- **The model:** a family (CUSHION, STRIDE, OPEN_TURN, THROUGH_TURN) × contact foot × side × contact tick, scored deterministically; one authoritative contact at the action's CONTACT marker; the ideal post-contact ball state; a Ball Control execution error; the free rigid-body ball; an explicit handoff to a TURN-1.2 actor and the frozen resolver.
- **Results** (the same 714 runs, BC 89): CLEAN 583, TAKEN 83, RECEIVED 9, no contact 39; 180° 94 / 120 clean; receive phase 8.8 ms per simulated second (RECEIVE-CONTROL-1: 816); Chrome / Node 20 / 20; animation on / off identical; mirror 10 / 10; DRIBBLE-V1 60 / 60 + 48 / 48.
- **Lesson:** the handoff must deliver what DRIBBLE-V1 can take over — the ball on the runner's line, ≥ 1 m ahead.
- Not frozen (owner: do not freeze yet).

**RECEIVE-KILL-1** (19:52 – 21:22, `21d9010` → `d0064a8`). One action alone — kill / deaden — and how Ball Control meets incoming difficulty (`sandbox/visual/receive_kill1/`).
- **The model:** foot inside / sole / instep / outside, thigh, chest and head surfaces with envelopes; a continuous difficulty D; the error E = 0.0068 + 0.40 · ((100 − BC) / 90)^1.1 · D / (D + 1), easy balls compressing the ratings.
- **Results** (200 seeds): a 22 m/s pass ends 0.03 / 0.12 / 0.33 / 0.68 / 1.80 m from the intended point at BC 99 / 90 / 80 / 70 / 50; a 2 m/s roller ≤ 3 cm at every rating; Chrome / Node 45 / 45.

**RECEIVE-KILL-1.1** (21:46 – 22:27, `869264b` → `f6f7a88`). A compressed scale (BC 50 – 70 = professionals) and follow-up control.
- **Follow-up control:** the real ball re-predicted after each contact; up to three contacts per episode; stable control; continuation classes IMMEDIATE / ADJUSTED / RECOVERY / UNSTABLE against the ideal episode.
- **Results:** the 22 m/s pass's 2-second median 2.46 / 0.57 / 0.23 / 0.03 m at BC 10 / 50 / 70 / 99; an 8 m/s chest ball is trapped with the sole at 0.45 s and stable at 0.67 s. The owner found it overcorrected.

**RECEIVE-KILL-1.2** (23:17 – 19 Oct 01:54, `9867a1a` → `ec5d972`). A harsher rating scale as a remap of 1.1: E_new(BC) = E_current(g(BC)), g a monotone cubic.
- Candidate A met the owner's two anchors exactly but flattened BC 50 – 75; a what-if B was offered.
- **Owner decision (01:13): alternative B**, knots (1, −8.5) (10, 0.7) (50, 35.4) (75, 54.5) (99, 98.5). B behaves as measured (99 / 99); the 22 m/s pass is IMMEDIATE 29 / 47 / 73 / 95 / 100 % at BC 50 / 70 / 80 / 90 / 99; an easy roller is IMMEDIATE at every rating. The Ball Control candidate; not frozen.

**RECEIVE-TURN-1** (19 Oct 02:39 – 04:10, `da7bdcf` → `33c58e5`). Two phases (`sandbox/visual/receive_turn1/`).
- **Execution variance around B:** bounded draws (identity to |N| 1.5, a soft cap at 2.5), keyed per receive event and contact, never by Ball Control. B stays the centre over 1,000 seeds; BC 99's largest placement error is 0.07 m.
- **A stationary receive-and-turn library:** DIRECTIONAL, HALF-TURN, OUTSIDE-OF-FOOT and THROUGH-STANCE, selected by feasibility and cost (never by Ball Control). At 12 m/s: directional 0 – 60°, half-turn 75 – 135°, through-stance 150 – 180°; the outside of the foot only for slow passes. Mirror 50,400 / 50,400; regressions unchanged.
- Three owner decisions pending (the half-turn's range, the outside turn, large-turn difficulty).

**RECEIVE-TURN-1.1** (19 Oct 04:26 – 05:24, `26cb992`, `23b6dca`). Human body motion around the unchanged RECEIVE-TURN-1 action (`sandbox/visual/receive_turn11/`).
- **The body:** an authored reference per family and angle; a footstep plan (the support step with the toe already in the turn, forefoot pivots exact about the rig's MTP joint, the contact swing through the authoritative contact pose, the step-through); gaze → shoulders → hips sequencing; the root pulled toward the loaded foot.
- **Results:** animation on / off 750 / 750; Chrome / Node 54 / 54 including every posed joint; the left / right mirror 176 / 176, joint for joint; plant slip 0.0 mm; foot snaps ≤ 18 mm, at the ball touches only (RECEIVE-TURN-1's body: 86 – 172 mm). Boundary snaps of up to 27 cm and two right-foot biases were found and fixed during the milestone. Presented for review; not frozen.

**The queued receive work** (04:46, `d03b6fc`). QUEUE #1: integrate RECEIVE-KILL + RECEIVE-TURN into RECEIVE-CONTROL (stop, test, report); QUEUE #2: receiving while moving (stop, test, report). The integration (RECEIVE-CONTROL-2) was begun at 05:25 (work-in-progress commits `53a6f0d`, `3dddda5`).
- RECEIVE-TURN-1's and RECEIVE-KILL's episodes run as live controllers inside the DRIBBLE-V1 ball kernel and reproduce the stand-alone episodes bit for bit (turns 864 / 864, kills and aerial controls 585 / 585); the full pipeline, striking the stand-alone passes, chooses the same actions and reproduces their contacts and ball (180 / 180, 260 / 260).
- On RECEIVE-CONTROL-1.1's matrix of record (714 runs): standing receivers 108 / 108 CLEAN (RECEIVE-CONTROL-1.1: 92), moving receivers 500 / 606 CLEAN (491), the same 39 misses; the kill blocks 108 / 108 KILLED. Not yet presented.

**The Codex labs** (read-only from the outputs; not integrated):
- **SHOT-ACCURACY-1.0-VISUAL:** the folder written on 18 Oct at 04:48 (17 Oct day) was extended; file times only.
- **Standing Tackle V1 — Phase C:** an isolated visual prototype with four cameras, frame strips, mirroring and an 11-angle × 5-reach table per ball state; its automated sweep ran 220 configurations and 9,020 sampled poses. Not a production validation or a freeze.

**End-of-day state.**

| Item | State |
|---|---|
| RECEIVE-CONTROL-1 / 1.1 | Presented; not frozen; published in the 19 Oct housekeeping |
| RECEIVE-KILL-1 / 1.1 / 1.2 | Presented; 1.2's alternative B is the Ball Control candidate; not frozen |
| RECEIVE-TURN-1 / 1.1 | Presented; not frozen; owner decisions pending |
| RECEIVE-CONTROL-2 (the queued integration) | In progress (work-in-progress commit) |
| Codex shot-accuracy / standing-tackle labs | Local |
| `touchline-current` | No changes except this chronicle |

## Monday 19 October 2026 — The 18 Oct publication; the receive queue (RECEIVE-CONTROL-2, RECEIVE-MOVING-1); RECEIVE-ELITE-1; TECHNICAL-CONTROL-1 → 1.5, the technique reset; TECHNICAL-CONTROL PLAYTEST-1, the playable dribbling sandbox; the Codex standing-tackle labs

**Evidence.**
- **[FC-Sim Git]:**
  - `touchline-current`: `b245213` (the 18 Oct entry), pushed in the 19 Oct housekeeping.
  - **`prototype/dribble-1`**, 15 commits this day, all pushed in the 20 Oct housekeeping:

    | Milestone | Commits | Time |
    |---|---|---|
    | RECEIVE-CONTROL-2 (QUEUE #1) | `3f55590`, `6060e13` | 06:22 – 07:11 |
    | RECEIVE-MOVING-1 (QUEUE #2) | `036d60c` | 10:03 |
    | RECEIVE-ELITE-1 | `140e96f` | 14:40 |
    | TECHNICAL-CONTROL-1 | `394b865`, `4cb9714`, `5180c8d` | 15:15 – 16:34 |
    | TECHNICAL-CONTROL-1.1 and 1.2 | `870804c`, `7d14872` | 21:25 |
    | TECHNICAL-CONTROL-1.3 | `0e12422` | 23:30 |
    | TECHNICAL-CONTROL-1.4 | `cd9de15` | 20 Oct 00:26 |
    | TECHNICAL-CONTROL-1.5 | `a34070e` | 20 Oct 04:07 |
    | TECHNICAL-CONTROL PLAYTEST-1 | `2be64dd`, `1877207`, `8899869` | 20 Oct 05:23 – 05:35 |

  - **[Local]** The Codex workspace `~/Documents/Codex/2026-10-19/files-pasted-by-the-user-touchline/outputs/`, read-only, no commits:
    - Standing Tackle Phase C revision 2 (23:30 – 23:31);
    - STANDING-TACKLE-V1, a functional real-carrier review (20 Oct 00:09 – 00:11);
    - a standing-tackle duel v2 page and the report "Standing tackle visual design" (20 Oct 05:12).
- **[Doc]:**
  - `review_artifacts/receive_control2/`, `receive_moving1/`, `receive_elite1/`, `technical_control1/`, `technical_control11/` … `technical_control15/`, `tc_playtest1/`: each milestone's report, handoff, status, evidence and review page or playable page;
  - every owner instruction verbatim in that milestone's `sources/`;
  - the pages show a real player's model; they are local pages only.
- **[Session]** Owner instructions. The time is when each instruction was saved; it was received a few minutes before.

  | Saved (EEST) | Instruction | Saved verbatim in |
  |---|---|---|
  | ≈ 13:25 | RECEIVE-ELITE-1 — elite tight control at 99 / 99 / 99, then work backward per attribute | `140e96f` |
  | ≈ 14:56 | TECHNICAL-CONTROL-1 — own the receive + dribbling phase: no exit touch, no ball into space, human fast dribbling | `394b865` |
  | ≈ 19:57 | TECHNICAL-CONTROL-1.1 — feet, ankles and lower-leg IK | `870804c` |
  | ≈ 21:05 | TECHNICAL-CONTROL-1.2 — the carry model: ball lanes, outside / instep, the same foot, not inside-foot ping-pong | `7d14872` |
  | ≈ 22:17 | TECHNICAL-CONTROL-1.3 — remove body / leg phasing, especially receive → dribble transitions | `0e12422` |
  | ≈ 23:41 | TECHNICAL-CONTROL-1.4 — Dribbling 99 = the fastest technique, not the most touches | `cd9de15` |
  | 20 Oct ≈ 02:23 | TECHNICAL-CONTROL-1.5 — technique reset: research first, the Ronaldo chop spec, authored elite references | `a34070e` |
  | 20 Oct ≈ 04:17 | TECHNICAL-CONTROL PLAYTEST-1 — a full playable dribbling sandbox (WASD, no skill button) | `2be64dd` |

- **Owner media:**
  - one screen recording, `Screen Recording 2026-10-20 at 3.54.57 AM.mov`:
    - 20 Oct 03:55, 2.6 s, 460 × 534, 1.9 MB;
    - SHA-256 `13173b3d7b70a7364cf23452a68913c088fc87d9dff67fbc547455cb3775f794`;
    - third-party console football-game footage, a dribbling reference; kept outside Git.
  - No screenshots.

**The 18 Oct housekeeping (06:00 – 06:13).** The chronicle `b245213` was committed and pushed. `prototype/dribble-1` up to `3dddda5` was pushed and verified.

**RECEIVE-CONTROL-2 (QUEUE #1)** (begun 05:25 in the 18 Oct day → 07:11, `3f55590`, `6060e13`). RECEIVE-KILL and RECEIVE-TURN integrated into one authoritative RECEIVE-CONTROL pipeline that hands off to the frozen DRIBBLE-V1 (`sandbox/visual/receive_control2/`).
- **Integration by equivalence:** RECEIVE-TURN-1's and RECEIVE-KILL's episodes run as live controllers in DRIBBLE-V1's ball world, bit-identical to the stand-alone episodes (864 / 864 turns, 585 / 585 kills; full pipeline 180 / 180 and 260 / 260).
- **Results:**
  - standing receivers 108 / 108 CLEAN (RECEIVE-CONTROL-1.1: 92);
  - moving receivers 500 / 606;
  - cases A – M: go 136 / 138 CLEAN;
  - neutrality 122 / 122; Chrome = Node 25 / 25; protected files 578 / 578.
- **Lessons:**
  - DRIBBLE-V1 reads the control state and how long it has held, so a cosmetic label forced until the handoff changed 6 of 108 takeovers;
  - TURN-1.2 cannot start below 2.5 m/s.
- Presented; not frozen.

**RECEIVE-MOVING-1 (QUEUE #2)** (→ 10:03, `036d60c`). Receiving while moving (`sandbox/visual/receive_moving1/`).
- **The model:** velocity-first meeting; late redirect, with the turn's cost paid after the contact; a takeover window for DRIBBLE-V1.
- **Results:**
  - moving receivers CLEAN 426 / 504 (RECEIVE-CONTROL-2: 365), MISSED 17 (66);
  - paired speed kept, by turn 0 → 180°: 0.96 / 0.95 / 0.83 / 0.57 / 0.40 / 0.23 / 0.15.
- **Lesson:** the test must be checked before the model — RECEIVE-CONTROL-1.1's pass solver could not lead sprinters, which had faked a "universal braking".
- Presented; the owner's queue was then empty.

**RECEIVE-ELITE-1** (≈ 13:20 → 14:40, `140e96f`). The ball "almost glued" at 99 / 99 / 99, then each attribute worked backward (`sandbox/visual/receive_elite1/`).
- **Results:**
  - moving turns ≥ 90°: maximum separation 3.30 – 5.22 → 0.45 – 0.65 m;
  - stationary 0.65 – 0.85 → 0.42 – 0.54 m;
  - the 672-run matrix: CLEAN 639 → 657, TAKEN 15 → 0.
- The exit touch to DRIBBLE-V1 stayed 1.6 – 2.0 m ahead. Presented; not frozen.

**TECHNICAL-CONTROL-1** (≈ 14:56 → 16:34, `394b865` → `5180c8d`). One technical-control layer from the receive into the carry and the actions: no exit touch, no ball into space, a human fast-dribbling body (`sandbox/visual/technical_control1/`).
- **Results:**
  - separation after the receive 1.70 / 2.37 → 0.85 / 0.87 m;
  - Agility 50's worst 5.67 → 1.00 m;
  - body IK error p99 32 → 4.1 cm;
  - neutrality 80 / 80; determinism 300 / 300; Chrome = Node 13 / 13.
- Presented; not frozen.

**TECHNICAL-CONTROL-1.1 and 1.2** (≈ 19:57 → 21:25, `870804c`, `7d14872`).
- **1.1:** the leg as a chain (pelvis → hip swivel → knee → tibia → ankle → contact surface), contact poses on DRIBBLE-1's boot hull.
  - Ankle angular speed p99 4277 → 853 °/s (RUN-1: 1139).
  - Boot-in-ball frames 4617 → 33.
  - Gameplay bit-identical 48 / 48.
- **1.2, the owner's correction mid-pass — the carry model:**
  - ball lanes, the foot following the lane (same-foot carrying), outside / instep at speed;
  - left-dominant: outside 10 → 79 %;
  - the neutral default: centre crossings 0.95 → 0.25 per second.
- Presented; not frozen.

**TECHNICAL-CONTROL-1.3** (≈ 22:17 → 23:30, `0e12422`). Body / leg phasing removed, especially receive → dribble.
- **Results (26 torture cases at 99):**
  - leg intersections 496 → 14 frames;
  - pelvis worst 4294 → 712 m/s²;
  - pops 48.5 → 7.5 per case;
  - plant slip median 9.6 → 2.0 mm.
- Gameplay identical and pose-repeatable 123 / 123. Presented; not frozen.

**TECHNICAL-CONTROL-1.4** (≈ 23:41 → 20 Oct 00:26, `cd9de15`). Dribbling 99 = the fastest technique, not the most touches.
- **What changed:** the turn decided when asked (TECHNICAL-CONTROL-1's between-contacts decision had never been called); difficulty against capability as a cost; a chop off a planted standing leg; the exit touch.
- **Results at 5.5 m/s:**
  - 90° 3 → 1 contact; 120 / 150° 4 → 2;
  - request → new line at 90°: 1.13 → 0.83 s.
- **Owner review:** its "Ronaldo chop" was not one — the ball stayed exposed outside the body.

**TECHNICAL-CONTROL-1.5** (20 Oct ≈ 02:23 → 04:07, `a34070e`). The technique reset: research first, then the actions.
- **Research:** coaching and change-of-direction biomechanics notes; the owner's technique table for 11 techniques; the action map by angle; the Ronaldo chop specification with top-down vector diagrams.
- **Five elite 99 references, authored as football actions** (ENTRY · CONTACT · PROTECTION · EXIT) on a new engine (`technical_control15/tc15_ref.js`): the 45° outside-foot cut, the 90° Ronaldo chop, the 120° Cruyff turn, the 150° inside hook and the 180° drag-back.
- **The chop:** 8 / 8 on the owner's acceptance test — the ball chopped behind the left heel, under the body.
- **The exposure diagnostic:** a defender's reaching leg from five directions, blocked by legs / hips / trunk.
- Presented for visual approval; not frozen, not integrated.

**TECHNICAL-CONTROL PLAYTEST-1** (20 Oct ≈ 04:17 → 05:35, `2be64dd`, `1877207`, `8899869`). A full playable dribbling sandbox (`sandbox/visual/tc_playtest1.html`).
- **How it plays:** WASD is the desired direction, latched in the camera frame; Shift / Alt sprint / walk; no skill button.
- **The resolver:** a 240 Hz simulation scores the carry and every feasible TECHNICAL-CONTROL-1.5 technique instance, parametric by angle on both feet. The terms: time to the new line, the decisive contact, contacts, separation, comfort, protection, weak foot, speed fit. The reason is shown live.
- **The ball** is the frozen kernel's, one launch per contact. The body is TECHNICAL-CONTROL-1.5's pose code reading the simulation's history.
- **The page:**
  - follow / touchline / top-down / side cameras;
  - HUD, contact history, separation graph, technique frequency;
  - protection and body-debug overlays; courses;
  - live provisional BC / DRI / AGI, the preferred foot;
  - pause / 0.5× / 0.25× / frame step;
  - a replay buffer with REPLAY LAST ACTION and the WASD pressed.
- **Results:**
  - 13 scripted input tests and two timing sweeps: 0 missed contacts, deterministic. Sprint W → A gives a Ronaldo chop; sprint W → S a drag-back; W → D → W → A gives chop L → chop R → outside cut.
  - A 34 s browser tour with real key presses: 60 contacts, 0 missed; 60 fps; work per frame 1.23 ms average, 4.9 ms worst.
  - The session re-simulated from its input is identical, and node ≡ browser. Animation on / off identical.
- **Fixes in the two follow-up commits:**
  - a gait tie-break gave the left-foot chop an extra planted step; chop L and chop R are now exact mirrors, and leg intersections fell from 6.3 % to 0.6 – 1.7 % of ticks;
  - a left-dominant player now starts with his left foot;
  - feet are placed off the ball's coming path; the ball inside a boot fell from 12.8 % to 2.3 – 2.7 % of ticks.
- **Limitations, measured:** the remaining overlaps are visual only, in short spans around lateral carry touches.
- Presented for the owner's playtest; provisional, not frozen, not integrated.

**The Codex labs** (read-only from the outputs; not integrated):
- **Standing Tackle Phase C revision 2:** STANDING_POKE and STANDING_LUNGE authored with continuous commitment.
- **STANDING-TACKLE-V1:** a functional real-carrier review against TECHNICAL-CONTROL-1.3's unchanged carrier in an isolated harness; the defender reads the real ball and presents its boot to the same physical world.
- **A duel v2 page and a visual-design report** (20 Oct 05:12).
- None is frozen or merged.

**End-of-day state.**

| Item | State |
|---|---|
| RECEIVE-CONTROL-2 / RECEIVE-MOVING-1 (the owner's queue) | Presented; not frozen; published in the 20 Oct housekeeping |
| RECEIVE-ELITE-1 | Presented; not frozen |
| TECHNICAL-CONTROL-1 / 1.1 / 1.2 / 1.3 / 1.4 | Presented; not frozen; 1.4's chop superseded by 1.5 |
| TECHNICAL-CONTROL-1.5 | Presented; four owner decisions pending; not frozen |
| TECHNICAL-CONTROL PLAYTEST-1 | Presented for the owner's playtest (local page); not frozen |
| Codex standing-tackle labs | Local |
| `touchline-current` | No changes except this chronicle |

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

**The physical character** (`prototype/physical-character-v2`, head `ec79770`, 16 Oct 06:07: two owner-instruction files after `dbc8aa2`; pushed on 17 Oct; not part of the playable game):
- **The body.** A clean-sheet Jolt humanoid: 14 bodies, 35 rotational DOF, finite actuators at exact capacity, a 10-piece boot on a `PlaneShape` turf; validated at 180, 240 and 480 Hz. An articulated toe body (D-1F1) exists only as a default-off extension and is not adopted.
- **Gates.**
  - V2-G0 to G3 passed; G3 under criteria v3.3, with J2a as the normative symmetry gate.
  - E1a (lift, hover, replace) passed; E1b closed under PSTAR4.
  - The qualified swing baseline is PSTAR5CHAB. DVG was adopted on 8 Oct after the versioned DVG2 qualification (configuration PSTAR5CHABV).
- **E2 (one physical step) has not passed; the work is paused.**
  - TD2, TD2B, D1G v1 and DVG's first qualification DO NOT VALIDATE.
  - TD2C with DVG also DOES NOT VALIDATE, on U-1 only: the +20 mm obstacle at 180 / 240 Hz.
  - The decisions in `e2/TD2C_RESULTS.md` §4 have not been taken. E2 integration, PG-1 and official E2 have not run.
  - Debts TD-15 (180 Hz end-range integration) and TD-17 (bounded-IK fold) gate later certification.
- **Locomotion evidence** (8 Oct; counterfactual diagnostics CF-1 … CF-6, not adopted). With harness-only gait layers, V2-REF walked 59 consecutive continuous steps at 0.10 m/s. Every failure at higher speed lay in the gait / planning / control layer; no body limit was found. Autonomous V2 walking is no longer pursued.
- **Architecture** (decided 10 Oct 04:42, after Astra's review, `2c6900d`): interaction-time physics.
  - The simulation is authoritative.
  - Ordinary locomotion is animation-driven: the Locomotion V2 straight-line baseline (below), frozen on 10 Oct, is an immutable upstream dependency consumed only through a git archive of its tag.
  - V2 is activated only at a meaningful interaction, initialized at the interaction state.
  - Sustained or pre-contact V2 locomotion is no longer a prerequisite.
  - The 9 Oct promotion design (PI-1) is paused and kept as evidence.
- **The PI-1 / PCS line is paused and superseded.**
  - Track A closed the F1 toe as an engine-solver limitation; F0 is retained.
  - V1.3 (`5042230`, CHARCOLLIDE-1) is the character-derived gameplay-collision baseline, on its own branch.
  - REV1 and REV2 hard-stopped (REV2: 0 / 1 / 0, standing runners only). HG-A v2 was adopted.
  - LC-1 was not continuous by its preregistration.
  - PCS-1 stopped at case 1 on pre-contact coherence.
  - No PI-1 qualifying run has ever run.
- **ITS-1**, the first interaction-time slice (`cb886b1`), stopped at PF-0 activation validity (`c647f4c`).
  - 1 of 4 control states is valid, and no struck run has been made.
  - Amendment A1 (an interaction-time stance tone, running-stance V-3 rows and a single-state C design) was paused by the user on 10 Oct.
- **The RUN-1 → V2 handoff contract** (`interaction_time/run1_handoff/`, R2 `6a0cf34`, reconciled with LV2-STATE-1): **NOT READY (verdict B).** The leg chain transfers exactly; the upper body does not under V2's frozen mapping. Stride-clock ownership and turning are unresolved.
- **RH1**, the record-hinged runner (`fa5915b`): **verdict C, body invalid** (50 / 54 rows; two new G1 failures, three G3 failures shared with R0). Held for the independent architecture review, with a facts-only audit (`record_hinged/RH1_AUDIT_HANDOFF.md`).
- **IFM-1** (`f22a914`, run 3): native contact is mechanically valid over 0 – 50 ms for the planted shank, shoulder and toe-pad stance, and continued contact matters for the first and last; at the gameplay camera no response exceeds 0.68 px. Every entry carries HANDOFF_FAILED. Visual review pending; nothing adopted.
- **PVP-1A**, the first player-v-player test (IB1-SR, `pvp1/`): **BLOCKED at H2** (the simulation's slide primitives cannot be fitted by the tackler's body). The labelled diagnostic PVP-1A-DX made native two-body contact that matches the simulation's (CG-1 … 6) but is DX-BLOCKED by the tackler's entry pose. Post-hoc diagnostics and the PVP-1A-R1 draft await the owner (`PVP1A_MORNING_REPORT.md`).
- **ABI-1**, active balance on the PVP-1A collision (`984b466`, 11 Oct): a 120.8 ms-delayed balance law changes the first 250 ms by ≤ 0.57 px at the gameplay camera; later, active control matters. Stopped by the owner for the collision audit; its EXT window is withdrawn after step 60.
- **CXA-1 / TRC-1** (`d2c872a`, `bf84bee`): the colliders do not phase (≤ 3.3 mm on the frozen contact set, below Jolt's 5 mm slop); the visible phasing was presentation. The render rule MC-1P now draws the tackler on its V2 joints (0.00 mm); the remaining mesh overlap, ≤ 12 – 16 mm robust, is mostly the boot envelope and is not fixed.
- **The physiological standing body** (11 – 12 Oct): PPR-1's pre-reflex B FAILED 12 / 23 (`06591e7`); PPR-2's S\* FAILED 36 / 45, decision C (`03c4fe8`); PPR-3's substrate S2 QUALIFIED 18 / 18, while S2 + P2 FAILED 10 / 14 on superhuman torque development (`391c4f0`).
- **The muscle layer** (MUSCLE-1, `f6cffbc`): M1 failed one criterion (A4) and is preserved; M1b (M1 + an 8.33 ms electrochemical delay) passed ankle 16 / 16 and knee 14 / 14. **Adopted by the owner on 12 Oct as V2's canonical muscle layer** (`sim/v2_muscle.js`, `spec/v2_muscles.js`, `6ac988e`): controllers command excitation only, never physical torque.
- **BALANCE-1** (`903c12d`, 12 Oct): a continuous, delayed, whole-body no-step controller on M1b. **Status B, promising but not qualified:** variants A and B each pass 13 / 16, and every failure is forward (the 12 N·s push does not settle in 4 s, the 20 N·s push falls, and the P4 criterion is flawed). B was adopted by the preregistered rule.
- **BALANCE-2** (12 – 13 Oct, `01743ae` → `ae78010`).
  - The forward audit found the 16 – 23 N·s band mismatched. The matched battery B2M uses the human "try not to step" fraction.
  - C2 = B + three mechanisms: quiet-band AP integral, support-aware internal model, direction-specific muscle constants. C2 scored 16 / 17, but its forward capacity rested on rigid boot-tip rocking.
  - **Owner decisions:** boot-tip support is not legitimate (22:12); the rigid flat foot is retained with no toes or stepping (23:16).
  - **C3** = C2 + a support-envelope governor. It uses legitimate support only: forward threshold 12.09 N·s, which equals its physical limit, with genuine falls beyond.
  - **B2F** corrects T1′ forward to the loadable flat-sole edge (80.29 mm): 10.15 – 14.21 N·s.
  - **Unchanged C3 on B2F: 16 / 17, status B, not qualified.** The one failure is P8, backward small 0.287 vs ≤ 0.26: a slow trunk-lean mode (the BALANCE-1 hip-map defect).
  - The minimal hip-map repair made it worse and was rejected. **BALANCE-3** (coordinated ankle – hip control) was instructed at 00:58 on 13 Oct.
- **BALANCE-3** (`0befb6b`, 13 Oct): the coordinated ankle – hip candidate B3 is **NOT QUALIFIED** (14 / 17, worse than C3; the hip and ankle loops fight). C3 stays the 16 / 17 baseline; owner decision pending.
- **PVP-0** (`052b41a`, 13 Oct): the first two-player physical contact, C3 × Astra's SLIDE-A1 K. Contact physics PARTIAL, visual FAIL: the tracked K tackler belly-flops even alone, and constant authority pins the recipient's feet.
- **SUPPORT-1** (`8aa4eba`, 13 Oct): the anchored look was the tackler pressing down on the feet, not turf friction. The unchanged V2 recipient already releases support, and an exploratory sliding body at 6.74 – 8.43 m/s slices it out in ≈ 0.3 s. No recipient successor beats V2; canonical NOT YET.
- **SLIDE-PHYS-1** (`a4cbf50`, 14 Oct, 13 Oct day): SP1, the first muscle-driven slide tackle. It works from 4.25 to 5.5 m/s, but the tackling heel acts as a stud strut: 71 % of the braking, an ankle 13.5° past its stop, a 0.5 m slide. Against C3 it gave an unscripted STRONG sliced-out fall.
- **SLIDE-PHYS-2** (`a730e69` / `a59d84b`): SP2 rebuilt the ground entry on the owner's bent-leg / thigh-slide hypothesis, which was CONFIRMED.
  - **What works:** the folded knee lands first and the outer thigh and hip take over; the tackling boot only skims (≤ 6 %); the slide is 1.0–1.8 m; tactile regional yielding (A6). SP2 is the single-player development baseline.
  - **Not solved:** the fold hip goes past its adduction stop; the knee carries ≈ 50 % of the glide; it fails at ≥ 5.75 m/s; against standing C3 there is no sliced-out fall.
  - M1c and TCF-1 are required by the tackler and not adopted.
- **The follow-through and the posting arm** (SP2A → SP2F3, 14 Oct): an authored RUN → DIVE flight; at a temporary body friction F37.5, a 3D tuck, a descent onto the folded side / back at the reference's pace (SP2E), and a posting arm built from the hand outward (SP2F3). All stopped for owner review; F37.5 is not canonical.
- **PVP-1** (`9d2e951`): SP2F2 vs SP2F3 against the same running recipient. A recipient handed to a fully physical body cannot keep running (its no-tackle twin falls at +0.42 s), so the recipient was invalid.
- **HYBRID-RUN-1** (`6e425dd`): RUN-1 stays the intent and a collidable V2 body tracks it with finite authority. Undisturbed running is preserved, and contacts override the body region by region. Two defects remain: there is no recovery from a lateral disturbance, and an external "animation-consistency" pelvis moment carries load.
- **HAC-1** (`4c3a2dd`, the night mission, 15 Oct 05:36): continuous action viability, regional intent weights, a bounded recovery step, support integrity and an active protect intent, built on HYBRID-RUN-1's support (withdrawn whenever RUN is not viable).
  - **Pushes:** 30 / 60 N·s at the shoulder recover; 100 N·s falls.
  - **The frozen tackle's outcome depends on the support phase:** absorbed at unloading; a forward fall at PVP-1's phase; at the freshly loaded phase the boot holds.
  - **Not achieved:** a fully physical RUN-1 runner (> 20 candidates, none longer than ≈ 2 s).
  - **Found:** RUN-1 cannot turn.
  - **Candidate V1.1** (earlier fall commitment) awaits the owner; the review page compares it with V1.
- **The tackle line** (15 – 16 Oct, built in the Codex workspace; local branches on top of `dbc8aa2`, not pushed, not integrated): TACKLE-REACTION-1 (F3 + R6: RUN → TACKLED_FALL from the exact collision state) → TACKLE-IMPACT-1 → TACKLE-CONTACT-V1 (ten-case TRIP / SLICE / IMPACT spectrum) → polish C10 → TACKLE-RECOVERY-V1 / V1.1 (the get-up lifecycle to IDLE) → V1.2 / V1.3 (16 Oct: contacts kept while braking prone F3 exits; the separated F3 posting arm with finite sliding support). HAC-1 is frozen as research.
- **The IB-1 interaction benchmark** (`interaction_benchmark/`: 5 frozen scenarios, metrics H1 – H8 / Q1 – Q8) and `consolidation/CANONICAL_EVIDENCE.md` (`15b0d5c`) are the architecture-neutral reference for any future interaction system.
- **V1** (`prototype/physical-character-v1` = `11149df`) is frozen as the research record: Gates A–D, C3–C5, D6 and the G2b walking studies, with no robust walk.

**Touchline material that exists but is *not* in `touchline-current`** (nothing here should be assumed integrated):
- **Locomotion and collision branches of 9 – 10 Oct** (pushed in the 10 and 11 Oct housekeeping, not merged):
  - `prototype/slide-contact-v1.3-charcollide` (`5042230`);
  - `prototype/locomotion-continuity-v1` (`9d57d46`, LC-1);
  - `prototype/locomotion-v2-run1`: RUN-1, frozen on 10 Oct as **the Locomotion V2 straight-line baseline** (tag `locomotion-v2-straight-baseline-1` = `4a226b1`; LOW 3.0 / JOG 5.5 / FAST RUN 7.8 / ALL-OUT 9.5 m/s; state contract LV2-STATE-1), with its viewer `sandbox/visual/run1.html` and the archival videos in `review_artifacts/locomotion_v2_run1/video/`.
- **Turning and physical dribbling** (16 – 17 Oct, pushed, not merged):
  - `prototype/turn-1`: TURN-1 → TURN-1.2. **Frozen as the turning baseline**, tag `locomotion-turn12-baseline-1` = `2129ca0` (handoff `review_artifacts/turn1/turn12/TURN12_HANDOFF.md`).
  - `prototype/dribble-1`: physics dribbling with a resolved touch and no tether, on TURN-1.2 and BALL-FEEL-1.3 — DRIBBLE-1 (`7fe57fd`) → DRIBBLE-1.4 (`33ce1ca`), then DRIBBLE-1.5, **frozen on 18 Oct as the DRIBBLE-V1 foundation**, tag `dribble-v1-foundation-1` = `4f20d28` (handoff `review_artifacts/dribble15/DRIBBLE15_HANDOFF.md`). The receive line on the same branch (18 – 19 Oct, presented for review, none frozen or integrated): RECEIVE-CONTROL-1 (an adapter, superseded), RECEIVE-CONTROL-1.1 (authored receive actions beside DRIBBLE-V1), RECEIVE-KILL-1 → 1.2 (kill / deaden and the Ball Control scale; alternative B is the candidate), RECEIVE-TURN-1 (bounded keyed execution variance around B; a stationary receive-and-turn library) and RECEIVE-TURN-1.1 (human body motion around it). RECEIVE-CONTROL-2 (QUEUE #1: RECEIVE-KILL and RECEIVE-TURN integrated into one receive pipeline), RECEIVE-MOVING-1 (QUEUE #2, receiving while moving) and RECEIVE-ELITE-1 (elite tight control) followed on 19 Oct. The technical-control line (19 – 20 Oct, presented, none frozen or integrated): TECHNICAL-CONTROL-1 (one layer from the receive into the dribble) → 1.1 (feet / ankle IK) → 1.2 (the carry model) → 1.3 (no phasing) → 1.4 (the fastest technique) → 1.5 (the technique reset: five authored elite references, the Ronaldo chop), and **TECHNICAL-CONTROL PLAYTEST-1**, the playable WASD dribbling sandbox (`sandbox/visual/tc_playtest1.html`, a local page).
- **The Codex ball lab** (16 – 17 Oct, [Local] clone in `~/Documents/Codex/2026-10-16/files-pasted-by-the-user-ball/`): BALL-PHYS-1 → BALL-FEEL-1 … 1.4, BALL-SHOT-1 / 1.1 / 1.2, GK-SHOT-MAP-1, CURVE-1 / 1.1, SHOT-CHARGE-1 … 1.3, SHOT-ACCURACY-1.0-VISUAL (outputs only). Owner-selection labs, not integrated; BALL-FEEL-1.3 is DRIBBLE's ball.
- **Standing Tackle V1 — Phase C** (19 Oct, [Local] Codex workspace `~/Documents/Codex/2026-10-19/files-pasted-by-the-user-touchline/`): an isolated visual prototype with its review page and validation record; Phase C revision 2 and STANDING-TACKLE-V1 (a functional real-carrier review against TECHNICAL-CONTROL-1.3's carrier) followed on 19 – 20 Oct; no commits, not a freeze.
- **Snow weather and weather-dependent ball physics** (28 Sep, the user's Codex session): committed on 8 Oct on its own branch, `environment/weather-snow-surface-v1` (`9468ddd`, GitHub). Not merged.
- **The 28 – 29 Sep slide-tackle passes** ([Local], uncommitted by the user's instruction):
  - rear-contact friction and fall direction, and Follow-through V1 and V2, all in worktree `rear-contact-fall`;
  - Reference Tackle V1, in worktree `reference-tackle`, with its third-party reference clip on the Desktop.
- **The manager interface, ratings workbooks and development model** ([Local] + [Chat extraction], 1 – 7 Oct). None is in Git, and none is integrated. Performance calibration, Fitness Light / Intense and the Araújo edits are pending (Appendix G).
  - **HTML prototypes:** cards, squad, pack opening, finance / staff, the broad mockup, standings, knockouts, training ground, calendar.
  - **Workbooks:** flank rules; the 4 Oct ranked workbook.
  - **Design packages:** exposure; aging / Fitness.
  - **Location:** the user's Codex workspace (`~/Documents/Codex/2026-10-0X/`) and `~/Downloads`.
  - **Later file activity** (9 – 11 Oct, file times only): statistics, transfers, club, overview, home and matchday pages in `~/Documents/Codex/2026-10-10/new-chat/`, and further ratings and stamina workbooks in `~/Downloads`.
  - **13 Oct file activity** (file times only): the statistics page and a pack-opening study, with Touchline and Rainbow Six-style pack-opening pages, in `~/Documents/Codex/2026-10-13/`; generated images in `~/Documents/Codex/2026-10-14/new-chat/`.
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
- **Contact physics.** No limb-level collision in the playable game: residual limb brushes and leg–leg tangles in slide pile-ups; arms posed rather than collided. The game has no general rigid-body system, by design. The physical-character branches (Part IV) are the attempt to change that, and are not integrated. Since 9 Oct the intended route is promotion into V2 physics for meaningful interactions only, not continuous physical locomotion.
- **Physical character.**
  - **Interaction-time activation is not yet valid.**
    - ITS-1's frozen-target posture tone opposes the initialized stance-leg rates: activation load 8.80 vs 6.04 N·s per step, slips of 12 – 18.8 mm.
    - The touchdown and late-stance states also fail. The ITS-1 amendment is paused.
  - **The handoff state is NOT READY** (verdict B, 10 Oct): V2's 23 → 14 upper-body mapping, and the rigid F0 boot against the frozen runner's heel-up / toe-pad stance (P-9, stance-contact consistency). RH1, the attempted body-spec fix, is invalid (verdict C).
  - **Standing balance** (BALANCE-2, 12 – 13 Oct): the legitimate flat-foot controller C3 passes 16 / 17 on the corrected battery. The forward threshold of 12.09 N·s is inside the flat-sole band, with no boot-tip support. One gap remains, the backward-small overshoot P8 (0.287 vs ≤ 0.26): a slow trunk-lean mode that needs coordinated ankle – hip control (BALANCE-3). The receiving player is not yet qualified. BALANCE-3 (B3) did not qualify (13 Oct).
  - **The tackler** (SLIDE-PHYS-1 / -2, 13 Oct day). SP2 is a physical bent-leg slide at 4.25–5.5 m/s, but it is PARTIAL:
    - the fold hip goes 4–8° past its adduction stop for about a second;
    - the knee carries about half of the glide;
    - there is no sprint commit or sprint entry, while the reference tackle is a ≈ 9 m/s sprint;
    - M1c and TCF-1 are required and not adopted.
    - Against the standing C3 there is no fast sliced-out fall. The next decision is a running, single-support recipient (`slide_phys2/RECEIVER_PREREG.md`).
  - **The running recipient** (PVP-1, HYBRID-RUN-1, 14 Oct day). A body handed to physics cannot run. The hybrid that keeps RUN-1 as its intent runs, but has two gaps:
    - it does not recover from lateral disturbances;
    - it needs a non-physical pelvis moment, because RUN-1 is not angular-momentum consistent.
    - A fully physical RUN-1 runner needs a balance controller of the SIMBICON class, and has not been achieved (HAC-1, 15 Oct).
    - RUN-1 cannot turn or sidestep: a runner whose intent turns falls even without contact.
    - The frozen tackle's boot-on-boot sweep cannot take a loaded foot.
  - **Player-v-player** (PVP-1A, 11 Oct): the simulation's slide primitives cannot be fitted by the tackler's body (hips 0.265 vs 0.190 m apart). Neither body has a stepping or sliding controller, so STUMBLE steps and the slide's continuation cannot be tested. Under the simulation's own balance law the standing runner's no-contact state is already FALL, and the physical contact push points 55° from the simulation's.
  - **Gameplay vs physical geometry.**
    - V1.3's character-derived capsules still disagree with the rigid F0 boot: front strikes hit the boot first (CG-1).
    - The simulation's contact legs are 0.19 – 0.29 m from the frozen Locomotion V2 runner's at any phase offset, and its stride clock runs 17 – 44 % faster.
    - The shared leg law's pelvis vertical is not physically realisable. A physical law would change 12 / 26 first contacts, a gameplay change that is undecided.
  - **The interaction-time architecture is decided, but its later stages are untested:** hand-back / reconciliation, recovery and broader tackle coverage. The articulated toe (F1) is closed at the solver, and toe-pivot geometry remains a rigid-boot limitation.
  - **A candidate V2 model limit:** from 4.2 m/s the swing hip torque exceeds the modelled capacity (Hill w0 15 rad/s). This is not an observed failure.
  - **Production locomotion (Locomotion V2, frozen 10 Oct)** covers straight-line running only, in four regimes from 3.0 to 9.5 m/s. Acceleration and deceleration, curves, turning and cutting, walking, per-player speed, ball carry and integration into the match runtime are not started. The simulation's VMAX (8.2 m/s) is below ALL-OUT.
  - **Turning and cutting** exist since 16 Oct as the frozen TURN-1.2 baseline (animation-driven, stance-impulse dynamics; no ball), not integrated. The locomotion authority contract with the simulation is undecided.
  - **E2 touchdown** is blocked at TD2C (U-1, the +20 mm obstacle at 180 / 240 Hz). The recovery-step touchdown (R-4 / R-5) is unsolved. TD-15 and TD-17 are open.
  - **CPU.** Continuous V2 locomotion for 22 players measured 4.3 – 5.1 s CPU per simulated second (SLP-2, unoptimised, one core). Promotion is estimated at roughly 18 – 38× less on average, but the interaction rates behind that estimate are assumed, not measured.
- **Sprint dribbling** still loses the ball (not hidden). The Dribbling V1 boot-plan lateral mirror is recorded and unfixed.
- **Physical dribbling** (DRIBBLE-V1, frozen 18 Oct; prototype, not integrated):
  - Straight and curved dribbling work (straight 100 %).
  - 60° and 90° cuts on 384 runs: 273 taken with the ball, 140 clean. 135° and 180° dribbling cuts are not attempted.
  - Inside, outside and set-up touches are used; toe 6.2 % of decisive touches.
  - The resolver costs 144 ms per simulated second per dribbler (worst step 34 ms).
  - Not started: the attribute layer (Dribbling / Ball Control / Agility, preferred and weak foot, pressure). Receiving and turning first touches are in progress (RECEIVE-CONTROL-1).
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
| 11 Oct | ABI-1 active balance on the PVP-1A collision: B − A ≤ 0.57 px in 0 – 250 ms; stopped by the owner for CXA-1 | FC-Sim Git | `7cf107f`, `5a8704c`, `dc4da05`, `ea0b20f`, `984b466` |
| 11 Oct | CXA-1 collision-exclusion audit: the colliders do not phase; ABI-1 EXT withdrawn after step 60 | FC-Sim Git | `d2c872a` |
| 11 Oct | TRC-1 tackler render correction (MC-1P, presentation only) | FC-Sim Git | `bf84bee` |
| 11 Oct | PPR-1 pre-reflex B FAILED its preregistration 12 / 23 | FC-Sim Git | `d8849a6`, `e7afc26`, `06591e7` |
| 11 Oct | PPR-2 standing body S\* FAILED 36 / 45; decision C | FC-Sim Git | `e454b06`, `03c4fe8` |
| 11 Oct | PPR-3: substrate S2 QUALIFIED 18 / 18; S2 + P2 FAILED 10 / 14; stop B (12 Oct 00:44 – 01:55) | FC-Sim Git | `594a6d3`, `ca7674b`, `932cd11`, `f53b791`, `391c4f0` |
| 11 Oct | MUSCLE-1: M1 FAILED A4; successor M1b PASSES, ankle 16 / 16, knee 14 / 14 (12 Oct 04:05 – 04:13) | FC-Sim Git | `77630dc`, `6c68177`, `ee2c146`, `bae8cea`, `f6cffbc` |
| 11 Oct | **M1b adopted by the owner** (12 Oct 04:59); the canonical V2 muscle layer, excitation only (05:34) | FC-Sim Git | `2f16fff`, `6ac988e` |
| 12 Oct | BALANCE-1, a continuous delayed no-step controller on M1b: status B (A and B 13 / 16, every failure forward); B adopted by rule | FC-Sim Git | `01653ab`, `903c12d` |
| 12 Oct | BALANCE-2 forward audit (the 16 – 23 N·s band mismatched); matched battery B2M frozen | FC-Sim Git | `ae48940`, `0c0f5f2` |
| 12 Oct | C2 16 / 17 on B2M (P8); post hoc: forward saves by rocking on the rigid boot tip | FC-Sim Git | `4b6ebd9`, `b995c13`, `85792a6` |
| 12 Oct | **Owner: boot-tip support not legitimate** (22:12); C3, a support-envelope governor, uses legitimate support only, 15 / 17 on B2M | FC-Sim Git | `fe301b3`, `d590fd4`, `2bc0275` |
| 12 Oct | **Owner: rigid flat foot retained** (23:16); B2F flat-sole forward criterion 10.15 – 14.21 N·s; unchanged C3 16 / 17 (P8 only); P8 diagnosed controller-side; minimal successor rejected (13 Oct 00:55) | FC-Sim Git | `44e782d`, `ae8177f`, `65373ab`, `010d03c`, `ae78010` |
| 16 Oct | TURN-1 turning / cutting engine on frozen RUN-1.3, approved as the mechanical foundation; TURN-1.1 authored cut body (research only) | FC-Sim Git | `7b58d1a`, `bb97f42` |
| 16 Oct | **TURN-1.2 frozen as the turning baseline**, tag `locomotion-turn12-baseline-1` | FC-Sim Git | `634bf20`, `2129ca0` |
| 16 Oct | DRIBBLE-1: physical dribbling, resolved touch selected over pure physical / hybrid; cuts PARTIAL | FC-Sim Git | `7fe57fd` |
| 16 Oct | DRIBBLE-1.1 (17 Oct 01:26 – 05:00): contact-aware follow-through, twin bit-identical to DRIBBLE-1, resolver 3.2× faster; 60° / 90° targets missed | FC-Sim Git | `511923e`, `8f36164`, `7d8c852` |
| 17 Oct | DRIBBLE-1.2: contact corridor, set-up touch, outside-of-the-foot cuts (FRONT 88 → 8 %); CPU target missed | FC-Sim Git | `a2f0505` |
| 17 Oct | DRIBBLE-1.3: incremental planner on deterministic work units (148 ms per simulated second, worst step 41 ms) | FC-Sim Git | `54ff810`, `2e44e1f` |
| 17 Oct | DRIBBLE-1.4 (18 Oct 00:01 – 02:02): every-tick release window, graded set-up validator; not ready to freeze | FC-Sim Git | `7e15213`, `33ce1ca` |
| 17 Oct | **DRIBBLE-1.5 (18 Oct 02:38 – 03:48): stage-line fix + 12 ms decision budget; frozen as DRIBBLE-V1**, tag `dribble-v1-foundation-1` | FC-Sim Git | `4f20d28` |
| 18 Oct | RECEIVE-CONTROL-1 presented: 279 / 714 clean; the frozen contact model cannot receive → a dedicated receive contact model | FC-Sim Git | `dc6693c` |
| 18 Oct | RECEIVE-CONTROL-1.1: authored receive actions, one authoritative contact, Ball Control execution, DRIBBLE-V1 handoff (583 / 714 clean) | FC-Sim Git | `470a4ab` |
| 18 Oct | RECEIVE-KILL-1 / 1.1: kill / deaden, surfaces to the head, easy-ball compression; follow-up foot control | FC-Sim Git | `d0064a8`, `f6f7a88` |
| 18 Oct | RECEIVE-KILL-1.2 (19 Oct 00:00 – 01:54): the Ball Control remap; **alternative B chosen by the owner** | FC-Sim Git | `9aba8b9`, `ec5d972` |
| 18 Oct | RECEIVE-TURN-1 (19 Oct 02:39 – 04:10): bounded keyed variance around B; the stationary receive-and-turn library | FC-Sim Git | `6881ce0` |
| 18 Oct | RECEIVE-TURN-1.1 (19 Oct 04:26 – 05:24): human body motion — neutrality 750 / 750, mirror 176 / 176, plant slip 0 | FC-Sim Git | `23b6dca` |
| 18 Oct | RECEIVE-CONTROL-2 begun (19 Oct 05:25 –): RECEIVE-KILL + RECEIVE-TURN integrated, bit-identical to the stand-alone episodes | FC-Sim Git | `53a6f0d`, `3dddda5` (WIP) |
| 19 Oct | RECEIVE-CONTROL-2 (QUEUE #1): one receive pipeline, integration proved bit-identical; standing receivers 108 / 108 CLEAN | FC-Sim Git | `6060e13` |
| 19 Oct | RECEIVE-MOVING-1 (QUEUE #2): receiving while moving; moving receivers CLEAN 426 / 504 | FC-Sim Git | `036d60c` |
| 19 Oct | RECEIVE-ELITE-1: elite tight control at 99 / 99 / 99, each attribute worked backward | FC-Sim Git | `140e96f` |
| 19 Oct | TECHNICAL-CONTROL-1: receive → dribble technical control — no exit touch, no ball into space | FC-Sim Git | `5180c8d` |
| 19 Oct | TECHNICAL-CONTROL-1.1 / 1.2: feet / ankle IK; the carry model (lanes, outside / instep, the same foot) | FC-Sim Git | `870804c`, `7d14872` |
| 19 Oct | TECHNICAL-CONTROL-1.3: body / leg phasing removed (leg intersections 496 → 14 frames) | FC-Sim Git | `0e12422` |
| 19 Oct | TECHNICAL-CONTROL-1.4 (20 Oct 00:26): the fastest technique, not the most touches | FC-Sim Git | `cd9de15` |
| 19 Oct | **TECHNICAL-CONTROL-1.5 (20 Oct 04:07): the technique reset — five authored elite references; the Ronaldo chop 8 / 8** | FC-Sim Git | `a34070e` |
| 19 Oct | **TECHNICAL-CONTROL PLAYTEST-1 (20 Oct 05:23 – 05:35): the playable WASD dribbling sandbox** | FC-Sim Git | `2be64dd`, `1877207`, `8899869` |

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

**Development days represented: 40 dated days, plus the undated 8–13 Sep period.**
- 8 before Git: 18 (the chat day plus the local evening), 19, 21, 22, 23, 24, 25 and 26 Aug. The morning of 27 Aug belongs to the 27 Aug Git day.
- 29 Git days (19 to 28 Sep, plus 29 Sep – 8 Oct on the physical-character branches).
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
| Sun 11 Oct | 33: the housekeeping `384c61d` on `touchline-current`, then 32 on `prototype/physical-character-v2` | 13:32 → 05:34 on 12 Oct (+01:00) |
| Mon 12 Oct | 26: 2 on `prototype/physical-character-v2` (06:30, 06:47), the 11 Oct housekeeping `23771df` (14:31) and `38496e4` (16:11) on `touchline-current`, then 22 on `prototype/physical-character-v2` | 06:30 → 00:59 on 13 Oct (+01:00) |

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
