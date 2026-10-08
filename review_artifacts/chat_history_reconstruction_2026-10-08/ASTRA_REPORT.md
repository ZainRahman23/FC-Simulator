# Touchline — recent development-history reconstruction

**Prepared 8 October 2026 · Development days reconstructed: 1–7 October 2026**

## Result and publication status

Seven import-ready daily supplements reconstruct the recent manager-interface, player-ratings and development/progression work. They follow Claude’s existing evidence-led chronicle format and expand its short parallel-workstream notes rather than duplicate the physical-character entries.

The GitHub archive was inspected before reconstruction. Claude’s screenshot commit `c1328ef1e9d5b251d45c9cb92a769b965a0fed3c` and chronicle commit `9e95b87ad04adc0cd7fc1ec39bc318acb8153c3e` were both published at **02:12:04 UTC on 8 October 2026**. The canonical archive is on `touchline-current`, not the repository’s default branch. Its eleven original screenshot records include **nine manager-UI images**, which this package references rather than duplicates. [GitHub inspection](evidence/GITHUB_INSPECTION.md)

**No repository update was made.** Repository metadata reported write privileges, but an actual attempt to create a documentation-only branch returned **403: Resource not accessible by integration**. No branch, commit, pull request, game file or published history was changed. This package is the requested fallback for Claude.

The source searches yielded selected dated chat excerpts and delivery summaries, not a complete raw conversation export with original attachment bytes. The narrative therefore says “the assistant reported delivery/checks” where that is the evidence. A source’s claim that an HTML prototype passed checks is not converted into a new verified production implementation. [Source register](sources/source_register.json)

## Chronology and dating

The reconstructed development days run **October 1 through October 7**. The archive’s local development day ends at **06:00 the following morning**. The source ledger keeps original UTC message times alongside the day grouping. Events at 01:xx–02:xx UTC in this period clearly belong to the preceding development day under either recorded +01/+02 offset; one 03:59–04:04 UTC rim/revert sequence cannot be assigned safely without the original timezone.

No September 30 manager/card day was created from undated recollections. The already documented **August 18 first website** was not reconstructed a second time.

A useful correction to the broad narrative is that the recovered recent sequence was **individual cards and manager pages first (October 1–3), a broad connected mockup on October 4, then intensive page-by-page standings/knockout/calendar refinement**. That is distinct from the August first website and avoids imposing an invented single straight-line development order.

## Daily entries prepared

| Development day | Main reconstruction | End-state and important boundary |
|---|---|---|
| [October 1](daily_entries/2026-10-01.md) | Reusable card tiers; photographic rather than generated faces; front/back, flip and glimmer; initial Liverpool collection | Card and HTML deliveries reported; one six-style photographic cleanup/export explicitly incomplete |
| [October 2](daily_entries/2026-10-02.md) | Corrected 21-player / 42-image collection; interactive squad; workbook-driven positional ratings; flank penalties; pack opening; associated Influence decisions | Prototype/workbook deliveries reported; final persistence and exact flank scale unresolved; no gameplay/payment backend established |
| [October 3](daily_entries/2026-10-03.md) | Simplified finance, transfer and staff screens; consolidated ratings review | Finance/staff prototypes and a 226-player workbook reported; save/visual limits retained; several numeric summaries conflict |
| [October 4](daily_entries/2026-10-04.md) | Further ratings re-ranking; connected manager mockup; Manager versus Club Runner; partial Figma; focused standings review | Final broad report says 30 screens, earlier one 33; Figma content unfinished; Araújo pending |
| [October 5](daily_entries/2026-10-05.md) | Crest/alignment fixes; metallic and hierarchy iterations; fixed-panel knockout refinements and cups; training-ground prototype; initial progression separation | Mixed reported browser and code-only checks; not all final rendering verified; exposure design still preliminary |
| [October 6](daily_entries/2026-10-06.md) | Exposure package; position-specific aging; Fitness exception; calendar/Set Pieces logic; performance calibration | Packages and 18/19 calendar checks reported; no authoritative-engine integration established; performance and some Fitness scaling provisional |
| [October 7](daily_entries/2026-10-07.md) | Calendar/competition cleanup; scoped squad colour changes; background iterations; last red-status/competition-text request | Several deliveries reported; last requested colour implementation cannot be verified from the recovered response |

### October 1–2: cards become interactive manager components

The card work established rating-based materials rather than promo/event cards: Diamond **90+**, black/gold **85–89**, gold **75–84**, silver **65–74**, bronze **55–64**, copper **54 or lower**. The user rejected generated faces in favour of genuine photographic heads and a blackened/removed jersey. The initial 19-card Liverpool batch should not be confused with the next day’s corrected **21-player, 42-PNG front/back** collection. The retrieved record explicitly admits one interrupted cleanup/export.

The squad prototype then linked card presentation to workbook-based calculations. The out-of-position decision was **−5 to each attribute, followed by a positional OVR recalculation**, not simply −5 OVR. Historical reported examples include Van Dijk CB 88 → ST 76 → CB 88 and Szoboszlai CDM eligibility. The weak-foot/opposite-flank scale has conflicting source summaries and is not presented as a recovered definitive rule.

Pack opening was specified as a top tear, five concealed tier-coloured cards travelling left-to-right and click-to-flip reveals. A prototype delivery was reported. The associated Influence discussion kept gameplay disconnected, limited control choices, used **0/8**, intended **seven earned points per match**, player-role cost **1**, and later formation-change cost **4**. Exact timestamps/final build for those Influence corrections were not recovered, so they remain a session-associated decision rather than a newly dated completion. [C01–C04](sources/CHAT_EVIDENCE_LEDGER.md)

### October 3–4: finance, ratings and broad application mapping

Finance decisions were simplified game rules: no amortization, one-time transfer fees, sales replenishing budget **1:1**, an **85%** spending budget, next-season overage reduction, and a **120%** rather than 130% threshold for the 24-point sanction. The UI gained transfer/POT controls and a staff hiring/contract treatment. Some calculations were reported checked, while an existing-file save failure and incomplete visual checking were disclosed. These are not assertions about real financial regulations.

The October 3 export reported **226 players** and eleven reviewed profiles with original formulas retained. A later October 4 ranked export was also discovered: **416 input changes across 20 players**, **78 eligible-position calculations**, and physical rank ordering. Its report gives Anderson **87.40 → 87** and Barcola **81.46 → 81**, with Araújo still pending later in the day. These are source-specific reported calculations. Original workbook bytes are needed to resolve conflicts with earlier saved overviews and to confirm exactly what was exported.

The October 4 application-mapping thread distinguishes Manager from Club Runner through firing/leaving/continuity rather than different basic controls. Ultimate Team, Draft and Career were future destinations/placeholders. The final retrieved delivery describes a **30-screen HTML mockup with 23 checks**, following an earlier 33-screen claim. Figma reached shells, navigation, tokens and ten components, not a finished content/image-filled mockup. [C05–C09](sources/CHAT_EVIDENCE_LEDGER.md)

### October 5–7: refinement and development-model design

Standings work was not a single finished redesign. It moved through Liverpool-row alignment and Chelsea crest normalization, restrained versus oversized metal treatments, compound light/dark bevels rather than single-colour outlines, quieter headings, denser/cleaner tables and header/carousel reversions. The user then demanded consistent outer knockout-panel dimensions, explicit semi-final/final labels, larger final crests and correct loser treatment. FA and Carabao extensions were reported, with illustrative draws and online crest dependencies.

A separate training-ground research/prototype delivery belongs to the same period. It is preserved as an environment/UI workstream, not live-game integration or a new physical-character gate.

The progression discussion separated **small nonnegative exposure**, **larger positive/negative performance effects**, **age-only decline**, and **direct athletic Fitness gains**. The accepted reference became **50 matches and 190 training sessions**, replacing an earlier 52-match proposal. Reported generic per-session credits were **0.00125 / 0.005 / 0.0175** for Light / Medium / Intense; match credits ranged from **0.00187 at 15 minutes to 0.040 at 90 minutes**. POT-gap targets and example seasons are recorded as targets, not invented final multipliers.

Fitness was to bypass POT suppression, improve role-specific athletic attributes directly and avoid also receiving generic exposure credit. The aging model was revised repeatedly: the early **4.0** cap cannot be published as the final rule when later striker age-40 decline is **4.5** and a 41+ cliff is described. An intermediate midfielder “locked” table was later revised. The full final config, keeper law and age convention remain recovery items.

Calendar reports include stamina changes of **Rest +25 / Light +15 / Normal +5 / Intense −10 percentage points**, development meters proportional to the generic rates, an eight-second preview timer replacing three seconds, and Set Pieces excluding Jumping. The reported 18/19 checks were not rerun here.

Performance calibration remained open. The user preferred league-specific linear/bucketed expectations, with EPL **75 OVR → 6.0 match rating** and **85 → 7.0**. The conversation challenged both elite ceilings and low-end generosity; the latest low-end verdict was that CAM was much too generous, striker high and winger close. The latest recovered replacement curves are **proposals without recovered acceptance or implementation**. The underlying sports-statistics examples were not reverified in this historical task.

On October 7, scoped styling corrections specifically protected gold stars while changing the fitness icon/100% to white. The background moved toward the existing standings treatment. The last request changed light-green status text to muted red and league text to competition colours; the next response’s timestamp was recovered but not its body. That final change is not counted as completed. [C10–C19](sources/CHAT_EVIDENCE_LEDGER.md)

## Portfolio evidence selection

### Existing originals already in Claude’s Git archive

The nine selected records remain in their original folders. Their names, sizes, recorded SHA-256 values, local timestamps and captions are in [SELECTED_SCREENSHOTS.tsv](evidence/SELECTED_SCREENSHOTS.tsv).

| Entry | Existing selected evidence | Why selected |
|---|---|---|
| October 4 | First captured PL standings; Liverpool 4-3-3 squad | Establish the two key manager-screen states before subsequent refinement |
| October 5 | Metallic standings; glass standings; UCL semi-finals; schedule/training calendar | Show meaningful material/layout and screen-family progression without repeating minor colour tweaks |
| October 7 | UCL league-phase table; schedule with training-day panel; 4-2-2-2 squad colour test | Show competition coverage, the progression/training UI, and a later squad iteration |

These are **existing Git records**, not newly recovered image binaries in this ZIP. The raster content was not viewed in this reconstruction. Their SHA-256 values are the archive’s recorded values, not newly calculated image hashes. The exact 3,088-byte manifest snapshot does reproduce Git blob `75eb420c372bda8a92a16f4f63ed7f383bea28f3`.

### Originals selected for recovery

The [30-record acquisition queue](evidence/ACQUISITION_QUEUE.tsv) associates candidate files with dates, source locators, intended portfolio use and verification gaps. It includes the card/photo before-and-after and Flip/Glimmer files; corrected Liverpool collection; squad/positional-rating evidence; flank and October 3/4 workbooks; finance/staff and pack-opening HTML; broad mockup/source package; standings/knockout revisions; training-ground preview/source; Exposure and Aging–Fitness packages; calendar files and performance-comparison tables.

These records are **not thirty recovered files**. Some records group variants, and some exact filenames are unavailable. No filename, capture date or hash has been manufactured to make a missing candidate look archived.

## What chats and Git jointly support

The strongest overlap is the **existence and broad sequence of the presentation workstream**: October 1 Diamond Flip/Glimmer local filenames; October 4 standings/squad captures; October 5 named HTML iterations and metallic/glass/knockout/calendar evidence; October 7 competition/training/squad captures and a later Calendar file. The chat excerpts provide design decisions and reported implementation details, while the committed chronicle and media manifest provide separate local-file/capture records.

This is **partial corroboration**, not proof that every chat download equals a local file byte-for-byte. A committed retrospective note is also weaker than an independently inspected executable artifact for behavioural claims. The October 3/4 workbook contents, progression module internals, exact last UI changes and all historical check counts are **not jointly verified by original Git code and original chat attachments** in this pass. [Conflicts and limits](evidence/CONFLICTS_AND_GAPS.md)

## Significant gaps and discrepancies

The principal unresolved issues are the original attachment bytes; missing raw message identifiers; one uncertain day-boundary sequence; full-rating/weak-foot summary conflicts; incomplete final aging/Fitness details; pending Araújo; unfinished Figma content; unaccepted final performance curves; several save/visual-verification failures; the final red-status/league-text implementation; and whether particular prototype logic ever reached authoritative game code.

The acquisition queue and quantitative record retain source-specific numbers and revisions rather than silently selecting a convenient “final” version. No later HTML should be used to fabricate earlier snapshots. No empty date was filled simply to make the project appear continuously busy.

## Related work recovered beyond the three main requests

The reconstruction also preserves finance/budget simplification; transfer and staff-management prototypes; pack-opening interaction; Influence/matchday controls; game-mode scope and Manager/Club Runner distinction; incomplete Figma work; training-ground research/prototype; and competition identity, crest-normalization and knockout logic. It deliberately excludes already archived physical-character experiments, the earlier migration/art library and the August simulator lineage from new accomplishment counts.

## Import and next verification step

[README.md](README.md) explains the guarded importer. It expands the existing day entries on the inspected chronicle blob, copies only evidence documentation into a separate reconstruction folder, leaves the existing image archive/manifest unchanged, and does not commit or push. A changed chronicle causes a stop for manual reconciliation rather than an overwrite.

The next useful verification is recovery of the **October 4 ranked workbook, Exposure/Aging–Fitness ZIPs and latest Calendar HTML**, followed by exact formula/config/content comparisons. That would resolve substantive uncertainty; generating replacement screenshots or new approximate implementations would not.
