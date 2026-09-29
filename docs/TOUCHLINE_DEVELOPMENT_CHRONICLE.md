# Touchline — Development Chronicle

The history of the Touchline football project as a whole, from the first requirement for the simulator (18 Aug 2026, about 13:00 local) to the current collaboration state (`touchline-current`, 28 Sep 2026). It is a development diary, not a changelog: what was tried, what failed, what was learned, and what worked at the end of each day.

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

Priority when sources disagree: a contemporaneous source or executable artifact, then contemporaneous tool or file output, then contemporaneous conversation, then later reconstruction. A **[Later]** source is used for colour and for work that left no other trace. Where it overlaps Git, Git wins, and the event is counted once.

**Dates.** Each day is dated by the **local time recorded at the time**, and a day runs until 06:00 the next morning, because most sessions ran past midnight.
- Commits carry their own offset: UTC−07:00 from 27 Aug to 7 Sep, UTC+01:00 from 14 Sep, and UTC+02:00 from 25 to 27 Sep.
- Local file times were converted into the offset in force at the time. For August this is proven, not assumed: backup files named with their creation time (for example `…pre-rc7-20260824-025946.db`) match their recorded modification times exactly at −07:00.
- For 8–13 Sep, when the offset changed, local file times are **Uncertain** by up to eight hours.

**Scope.** Conversation evidence starts at 20:00 UTC on 18 Aug (13:00 local), with the opening request. Package and file evidence starts at 14:12 local on 18 Aug; commit evidence starts on 27 Aug. The chronicle ends at `touchline-current` = `e2c98ec` (28 Sep). Parallel work by other contributors is mentioned only where it bears on the main line; one example is the Coach MVP pull request on the FC-Simulator repository (`claude/coach-mvp`, 23 Sep).

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

**Evidence:** [FC-Sim Git] 5 commits at 12:19, `5a0e025` → `e2c98ec` (merge). Branch `touchline-current`, pushed to the FC-Simulator GitHub repository this day.

**Reconstructed — the environment work.** It was authored in the main working tree between about 25 and 28 Sep, in parallel with the tackling branch. **Who authored it, and in which session, is not recorded (Uncertain).** The dates come from file modification times: `corner-flags.js` 25 Sep, `ball-art.js` and `stadium-art.js` 27 Sep, `rain.js` 28 Sep 00:16. It consists of:
- a Tottenham-inspired seating bowl with a crowd atlas and the near stand cut away for the broadcast camera;
- pitch mowing bands on the real box/spot/halfway boundaries;
- a continuous 32-panel sphere ball at the physical 0.11 m radius, with a design selector;
- seeded rain with a weather selector.

**Discovery.** `match.html` had loaded `corner-flags.js` since Defending V1 (`57c6539`), but the file had never been committed, so any fresh clone would fail to load it (`5a0e025`).

**Work completed.**
- The environment work was committed on its own branch (`environment/stadium-ball-pitch-v1`) at the point where it was authored (`f5f6076`).
- It was merged into the accepted slide-contact state as a visible merge (`e2c98ec`).
- A fresh-clone smoke test confirmed the collaboration state works, including 128 deterministic fixtures identical to `d539e7a`.
- `touchline-current` and the baseline tags were published.
- The Coach MVP pull request by another contributor, which touches only the manager and web layer, was left untouched.

**End-of-day state.** One branch another developer can clone and run: the full outfield and keeper runtime with the new stadium, pitch, ball and weather.

---


# Part IV — The present

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

**Touchline material that exists but is *not* in `touchline-current`** (nothing here should be assumed integrated):
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
- **Contact physics.** No limb-level collision: residual limb brushes and leg–leg tangles in slide pile-ups; arms posed rather than collided. There is no general rigid-body system, by design.
- **Sprint dribbling** still loses the ball (not hidden). The Dribbling V1 boot-plan lateral mirror is recorded and unfixed.
- **Goalkeeper presentation.**
  - Two backends coexist, with families still review-only.
  - Audits flagged set-depth geometry at close range and the X3 curl's size (about 4–5× a measured free kick).
- **Characters.** Most of the Astra roster, back-print B and the workshop are outside the runtime, and the workshop source is missing.
- **Referee.** Foul facts are recorded but no calls are made.
- **Repository weight.** About 1.5 GB of history, mostly committed review media.

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
- **Terminology.** "V6" names three different things:
  1. the **SOUTH V6** dive sprite (6 Sep);
  2. the **v6** skeletal far-dive lifecycle (20 Sep);
  3. the Astra **V6** character renderer built on that lifecycle (21 Sep).

## Appendix C — Chronology cross-check

**Development days represented: 30 dated days, plus the undated 8–13 Sep period.**
- 8 before Git: 18 (the chat day plus the local evening), 19, 21, 22, 23, 24, 25 and 26 Aug. The morning of 27 Aug belongs to the 27 Aug Git day.
- 19 Git days.
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
| Mon 28 Sep | 5 | 12:19 (+01:00) |

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

The request to use at the end of each day:

> Update today's Touchline Development Chronicle entry from today's commits and work. Include important experiments, discoveries, decisions, failures and remaining issues — not just the final code. Documentation only; do not run validation.
