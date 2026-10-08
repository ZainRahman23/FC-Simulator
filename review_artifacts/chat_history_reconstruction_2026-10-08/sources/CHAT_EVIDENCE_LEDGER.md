# Chat evidence ledger — retrospective extraction

**Created:** 8 October 2026. These are faithfully recorded retrieval findings, not a verbatim transcript and not original exported chat files. Exact UTC timestamps are retained when supplied. Undated entries remain undated. Status describes what the source supports, not a fresh test result.

## C01 — Design Salah Card — tiers, photographic direction and flip prototype

**Locator:** Chat title: Design Salah Card; original conversation UUID not exposed by retrieval

- **2026-10-01T16:36:36Z — User** [designed_decided]: Reusable manager-simulation season cards, not promo/event cards.
- **2026-10-01T17:43:36Z — User** [designed_decided]: Tier thresholds: Diamond 90+, black/gold 85–89, gold 75–84, silver 65–74, bronze 55–64, copper ≤54. Reject AI faces in favour of real photographs.
- **2026-10-01T17:56:04Z — User** [designed_decided]: Real photographic headshots; remove/blacken jersey, preserve face pixels.
- **2026-10-01T18:23:41Z — Assistant** [reported_partial_implementation]: Downloaded real Salah photo, began replacing faces across six cards; exports unfinished after editing disconnected during edge cleanup.
- **2026-10-01T21:05:29Z — Assistant** [reported_prototype_delivery]: Delivered Touchline_Salah_Flip.html and Touchline_Salah_Back_Preview.jpg; later Diamond Flip and Glimmer variants were reported.
- **2026-10-01T23:14:44Z — Assistant** [reported_artifact_delivery]: Delivered Touchline_Liverpool_2027_Cards.zip with 19 cards.

**Limits:** No historical card or HTML bytes recovered in this session. Exact individual timestamps for later Diamond/Glimmer outputs are not recovered; Git supplies local file-time corroboration. The repaired six-tier photo export was not demonstrated complete.

## C02 — Liverpool corrected fronts/backs and playable squad

**Locator:** Chat titles: Design Salah Card / Liverpool Player Stats Extraction

- **2026-10-02T13:06:25Z — User** [designed_decided]: Correct Liverpool workbook ratings/buckets and make matching backs/positions.
- **2026-10-02T13:39:50Z — Assistant** [reported_artifact_delivery]: Delivered corrected 21-player fronts/backs, 42 transparent PNGs; tactical fields remained unassigned.
- **2026-10-02T16:29:41Z — Assistant** [reported_prototype_delivery]: Touchline_Squad.html delivered: dragging/dropping players, formations, expandable bench, flip cards and tactical controls.
- **2026-10-02T18:02:32Z — Assistant** [reported_implementation_test]: Workbook-driven live ratings; Szoboszlai CDM; −5 to each attribute for out-of-position selection; Van Dijk CB88 → ST76 → CB88 and Szoboszlai CDM82 reported.

**Limits:** A later retrieved account says final save/visual sizing remained unresolved after a dropped connection. Do not conflate logic checks with final file persistence or production integration. One retrieval mislabels the Squad output as Matchday; no such renaming is assumed.

## C03 — Attribute-based weak-foot flank penalties

**Locator:** sandbox:/workspace/scratch/0352664771fb/outputs/flank-ratings-update/2026-27-ratings-flank-rules-updated.xlsx

- **2026-10-02T22:10:17Z — Assistant** [reported_implementation_test]: Reported Barcola RW80 at 3★ and no flank penalty at 5★; latest extracted 4★→1★ HIGH penalties −3/−4/−5/−6, MEDIUM −2/−3/−4/−5, LOW −1/−2/−3/−4.
- **2026-10-02T22:11:25Z — Assistant** [reported_artifact_delivery]: Delivered 2026-27-ratings-flank-rules-updated.xlsx; 226 player checks; Szoboszlai CDM and attribute-based flank rules.

**Limits:** A pre-existing saved summary gives a different progression (e.g. 3★ −6/−4/−2). Preserve the discrepancy; original workbook bytes are required before treating either table as an authoritative final implementation.

## C04 — Pack opening and Influence controls

**Locator:** Chat title: Design Salah Card

- **2026-10-02T23:08:13Z — User** [designed_decided]: Tear the pack from the top, five tier-coloured concealed cards fly left-to-right, click to reveal.
- **2026-10-02T23:27:59Z — Assistant** [reported_prototype_delivery]: Delivered Touchline_Pack_Opening.html; tear, five-card sequence, reveal/replay and Diamond glints reported.
- **Date/time not independently recovered — User, visible excerpt within Design Salah Card thread** [designed_decided]: Design surrounding match UI without wiring gameplay. Limit ways to spend Influence to at most six; state-dependent losing/tied/winning controls; start0/8, +1 each15min, +1 halftime, intended7/game; player-role cost1. Later Change Formation cost4 and ratings closer to names for a larger stamina bar.

**Limits:** The exact message dates of the last Influence corrections and a verified final Matchday build were not recovered. Keep them as a session-associated decision, not a dated completed engine feature.

## C05 — Finance simplification, transfers and staff

**Locator:** sandbox:/Users/zainrahman/Documents/Codex/2026-10-01/new-chat-2/touchline_finance/Touchline_Finance.html

- **2026-10-03T11:33:24Z — User** [designed_decided]: Finance HTML: SCR-style gauge,85% budget, expand scale to150% after100%,115% fine marker, established Touchline quality.
- **2026-10-03T12:03:53Z — Assistant** [reported_prototype_delivery]: Touchline_Finance.html delivered with interactive revenue/cost charts, forecasts, cash/signing planner; calculations checked, visuals incomplete.
- **2026-10-03T12:37:37Z — User** [designed_decided]: No amortization; one-time transfer fees; sales return full amount1:1; overage reduces next-season budget; spending95% against85% produces75% next-season budget;24-point threshold120%, not130%.
- **2026-10-03T13:03:59Z — Assistant** [reported_implementation_test]: Updated copies supplied; £100m sale adds£100m room;95% spending →75% budget; existing-file save failed.
- **2026-10-03T14:15:14Z — Assistant** [reported_prototype_delivery]: Finance revision adds POT beside OVR and Transfer player search/popup, illustrative offers, full-fee credit/wage savings, budget impact and Undo.
- **2026-10-03T17:42:58Z — Assistant** [reported_prototype_delivery]: Staff artifact delivered with six roles, searchable hiring, traits, manager tiers, contracts and budget updates.

**Limits:** These are the project’s simplified game rules, not claims about real financial regulations. Exact final staff filename and byte identity were not recovered. Saved context mentions 6–8 roles/traits, but do not elevate an undated request to a tested final count.

## C06 — October 3 consolidated ratings export

**Locator:** sandbox:/mnt/data/2026-27-ratings-final-review-2026-10-03.xlsx

- **2026-10-03T15:37:29Z — Assistant** [reported_artifact_delivery]: Delivered 2026-27-ratings-final-review-2026-10-03.xlsx:226 players,11 changed profiles, earlier Liverpool edits and original formulas retained; review/position/change/validation tabs; no formula errors reported.
- **2026-10-03T15:37:29Z — Assistant** [reported_calculation]: Reported Haaland PAS71 correction and POT≥OVR correction for Olise/Yamal/Kane. Named11 profiles: Dembélé,Haaland,Mbappé,Olise,Bellingham,Kane,Hakimi,Saliba,Yamal,Messi,Nuno Mendes.

**Limits:** Retrieved numeric OVR summaries conflict with pre-existing saved summaries for several players. Do not assert a complete final rating table without recovering the workbook. No formulas were recalculated in this reconstruction.

## C07 — October 4 re-ranking and pending Araújo

**Locator:** sandbox:/mnt/data/2026-27-ratings-updated-ranked-2026-10-04.xlsx

- **2026-10-04T13:30:53Z — Assistant** [reported_artifact_delivery]: Delivered 2026-27-ratings-updated-ranked-2026-10-04.xlsx:226 players,416 approved input changes across20 players, physical ranks1–226, Rank changes tab,78 eligible-position calculations, no formula errors reported.
- **2026-10-04T13:30:53Z — Assistant** [reported_calculation]: Anderson87.40→87 and Barcola81.46→81, approved attributes unchanged; Messi rank6→4, Osimhen12→8. Export supersedes October3 file for the reviewed data.
- **2026-10-04T19:53:45Z — User / retrieved pending-edit record** [designed_pending]: Araújo original-baseline edits remain pending.
- **2026-10-04T19:55:10Z — Assistant** [reported_pending]: Araújo proposed/current, not locked or workbook-delivered.

**Limits:** No October4 workbook bytes recovered; numbers are contemporaneous reported calculations, not independent verification. Full Araújo raw attributes appear only in saved context and are not asserted as an applied change.

## C08 — Broad club-management mockup and Figma limits

**Locator:** Chat titles: Map Touchline Mockup / Check Figma Edit Access

- **2026-10-04T19:48:17Z — User** [designed_decided]: Unify simulator UI; focus team management, with Home destinations Ultimate Team,Draft,Career,Manage a Club.
- **2026-10-04T20:07:50Z — User** [designed_decided]: Use Squad stadium/card theme and Matchday buttons. Manager/Club Runner share full controls; differ in firing/leaving/continuity. Calendar core:match/training/rest. Browser first.
- **2026-10-04T20:29:40Z — User** [designed_decided]: Create mockup from previous session and accepted visual direction.
- **2026-10-04T21:16:54Z — Assistant** [reported_prototype_delivery]: Touchline_Club_Management_Mockup.html and Touchline_Mockup_Package.zip reported.
- **2026-10-04T21:18:38Z — Assistant** [reported_scope_claim]: Earlier scope claimed33-screen mockup and Touchline_Mockup_Handoff.zip.
- **2026-10-04T21:29:28Z — Assistant** [reported_partial_implementation]: Final account:30-screen connected HTML,21-player/stadium assets,23 checks; Touchline_Mockup_Review_Package.zip. Figma retained shells/navigation/tokens/10 components, detailed content/original images unfinished after quota.

**Limits:** 30/33 counts differ across the session and are not a verified screen inventory. Figma edit access is not proof of completed detailed mockups. Gameplay was not integrated. No current Figma canvas inspection performed.

## C09 — Standings concepts and first linked HTML

**Locator:** Chat title: Standings Visual Concepts

- **2026-10-04T21:36:58Z — User** [designed_decided]: Refine standings with shared Squad quality, switching,qualification/relegation markers and console-style UI.
- **2026-10-04T21:57:39Z — User** [designed_decided]: Reject concepts2 and5; prefer concept1’s modern console feel and clarity; quieter matchday,no Overall/Home/Away/trophy; Next opponent crest then dash after season.
- **2026-10-04T22:04:38Z — User** [exploratory_decided]: Reject distracting/AI-looking stadium or pitch backgrounds in these concepts; try clean-charcoal directions.
- **2026-10-05T02:14:16Z — User** [designed_decided]: Require actual HTML, qualification/relegation bands and Squad navigation.
- **2026-10-05T02:25:27Z — Assistant** [reported_prototype_delivery]: Touchline_Playable.html and Touchline_HTML_Source.zip reported; standings20 teams, zones,Liverpool highlight,Next crests,navigation.
- **2026-10-05T02:40:10Z — Assistant** [reported_implementation_test]: Playable HTML: centred single-colour zones,star user indicator,PL/UCL/Carabao/FA; interaction checks reported, browser verification blocked.
- **2026-10-05T03:59:36Z — Assistant** [reported_prototype_delivery]: Solid-gold Liverpool fill/purple rim revision reported.
- **2026-10-05T04:04:56Z — Assistant** [reported_reversion]: User-requested revert to prior treatment, rim removed.

**Limits:** The last two UTC times straddle the 06:00 boundary under +01 versus +02 local offsets; retain exact UTC and do not silently assign them. Earlier 02:xx messages unambiguously belong to October4 development day under either documented offset.

## C10 — Focused standings hierarchy/material/crest revisions

**Locator:** Chat titles: Fix Team Logo Wrapping / Update HTML Design

- **2026-10-05T11:36:12Z — User** [designed_decided]: Fix right-shifted Liverpool row; normalize crests including Chelsea; player-card metal-quality reference.
- **2026-10-05T11:53:12Z — Assistant** [reported_implementation_test]: Touchline_Playable_Fixed.html:20 crest corrections,Liverpool alignment,18px purple frame; Chromium8 widths,navigation/table refresh,no JS errors reported.
- **2026-10-05T12:02:01Z — User** [designed_decided]: Reject oversized/neon/nested treatment; require2–4px subtle compound/directional rim; later request one stronger uncluttered strip.
- **2026-10-05T12:52:52Z — Assistant** [reported_implementation_test]: Touchline_Playable_Metallic.html plus Metallic_Rim_Detail.png/Standings_Metallic.png;7px foil band,8px lower curves; desktop/Retina/mobile comparisons reported.
- **2026-10-05T13:15:57Z — User** [designed_decided]: Focused hierarchy pass; preserve established theme/geometry.
- **2026-10-05T13:32:04Z — Assistant** [reported_implementation_test]: Touchline_Playable_Hierarchy.html:arrows/chevron removed,integrated/brighter headings;8 viewport/Retina configurations and navigation checked,no JS errors reported.
- **2026-10-05T20:33:21Z — User** [designed_decided]: Only requested headers,six teams,centred competition dividers.
- **2026-10-05T20:35:36Z — Assistant** [reported_prototype_delivery]: Touchline_Playable_Six_Teams.html; code checks pass,rendered layout unverified.

**Limits:** These are revisions, not a single frozen material specification:18px→requested2–4px→reported7px. Do not combine them into a fictitious final design. Test claims were not rerun here.

## C11 — Knockout refinement and two cup extensions

**Locator:** sandbox:/Users/zainrahman/Documents/Codex/2026-10-05/new-chat-3/Touchline_Playable_Minimal_Knockouts.html

- **2026-10-06T01:00:32Z — User** [designed_decided]: Fixed panel size,SEMI-FINALS/FINAL headings,larger final crests,proportional logo scaling,Chelsea correction; dim eliminated score when final leg draws.
- **2026-10-06T01:05:02Z — Assistant** [reported_prototype_delivery]: Touchline_Playable_Minimal_Knockouts.html updated with headings,larger final crests/names,fixed panel;appearance unverified.
- **2026-10-06T01:33:03Z — Assistant** [reported_implementation_test]: FA and Carabao from third round to final;own palettes,penalty outcomes;progression checks passed,44 crest links checked;draws illustrative,crests online.

**Limits:** Chronicle day October5, not October6. Retrieval does not independently establish whether the requested drawn-final-leg loser-dimming fix was in the final bytes.

## C12 — Training-ground research prototype

**Locator:** Chat title: Training Pitch Research / Branch · Training Pitch Research

- **2026-10-05T22:25:01Z — Assistant** [reported_prototype_delivery]: Harbour Training Centre delivered:Touchline_Training_Ground.html,Touchline_Training_Ground_Research.html,Touchline_Training_Ground_Source.zip,preview PNG. Main/second pitches,GK/technical areas,performance centre,equipment,shelters,fencing,floodlights/landscaping. Canvas render/geometry checks reported.

**Limits:** Browser controls and Mixed×2 unverified; not integrated into live game. Exact preview basename and full source URLs not recovered; research claims not freshly fact-checked.

## C13 — Exposure-only progression: early design

**Locator:** Chat title: Refine Development Model

- **2026-10-06T02:01:31Z — User** [designed_decided]: Remove age from positive development; age drives a separate decline system.
- **2026-10-06T02:12:10Z — User** [designed_decided]: Exposure small/nonnegative; performance separate,larger,bidirectional. For70OVR/85POT:0min light/medium/intense70/71/73–74;60min71/72/75;90min72/73/76.
- **2026-10-06T02:15:35Z — Assistant** [exploratory_proposal]: Early reference52 matches/190 training sessions; season match contribution60min+1,90min+2; approximate light/medium/intense+.25/+1/+3.5.

**Limits:** Chronicle day October5. The52-match reference was revised to50 the next development day; these are design targets, not tested season outcomes.

## C14 — Exposure calibration and implementation-ready package

**Locator:** sandbox:/mnt/data/TOUCHLINE_Exposure_Development_Package.zip

- **2026-10-06T11:49:19Z — User** [designed_decided]: Reference50 matches/190 sessions; training Light.00125,Medium.005,Intense.0175/session; match credits15min.00187,30.00612,45.01223,60.020,75.02929,90.040.
- **2026-10-06T11:52:13Z — User** [designed_decided]: POT scaling should be curved, little falloff until close to potential.
- **2026-10-06T12:05:32Z — User** [designed_decided]: Medium+90min reference exposure targets by POTgap:0→0,1→.2,2→.4,3→.8,4→1.2,5→1.6,6→2,7→2.2,8→2.4,9→2.6,10→2.8,11+→approximately3.
- **2026-10-06T15:26:45Z — Assistant** [reported_artifact_delivery]: TOUCHLINE_Exposure_Development_Package.zip delivered:spec Markdown,JSON config,JS module; calibration/POT/example/integration instructions; performance kept separate.

**Limits:** Package was described as implementation-ready; not equivalent to authoritative engine integration. No original JS/config recovered or executed in this reconstruction. Exact interpolation should be recovered, not reinvented from targets.

## C15 — Aging curves revised, then packaged

**Locator:** sandbox:/mnt/data/TOUCHLINE_Aging_Fitness_v1-2026-10-06.zip

- **2026-10-06T15:57:50Z — User** [designed_decided_then_revised]: Wide attackers start decline27;early4.0 annual-base cap accepted.
- **2026-10-06T19:48:46Z — User** [designed_decided]: Revised wide ages29–33:.8,1.5,3,4,3;CB30–40:.5,1,2,3,4,3,2,2.5,3,3.5,4;ST34–40:2,2.5,3,3.5,4,4,4.5.
- **2026-10-06T20:08:35Z — Assistant** [reported_intermediate_design]: Reported midfielder curve≤25:0;26:.1,27:.2,28:.4,29:.6,30:1,31:2,32:4,33:3,34:2,35:1,36:1.25,37:1.5,38:2,39:2.5,40:3.
- **2026-10-06T20:15:04Z — Assistant** [reported_design]: Reported41+ cliff:41:5,42:7,43:9,44:12,45+:15;described as universal across wide/striker/midfield.
- **2026-10-06T20:29:33Z — Assistant** [reported_later_design]: Later midfield correction:27:.40,28:1,29:1.25,30:1.5,31:1.75,32:4;41+ cliff retained.
- **2026-10-06T21:03:50Z — Assistant** [reported_artifact_delivery]: Delivered TOUCHLINE_Aging_Fitness_v1-2026-10-06.zip.

**Limits:** Never combine the20:08 and20:29 midfielder values as one final table. Early4cap is incompatible with laterST4.5 and41+ values; full final config/GK rules/age convention/internal package inventory were not recovered.

## C16 — Fitness exception and role-specific packages

**Locator:** Chat titles: Refine Development Model / Branch · Training Pitch Research

- **2026-10-06T17:48:18Z — User** [designed_decided]: Fitness bypasses POT suppression; other training remains POT-suppressed.
- **2026-10-06T18:01:18Z — User** [designed_decided]: Accepted halved190-Medium-session Fitness packages by position; exact vector table is reproduced in QUANTITATIVE_RECORD.md.
- **2026-10-06T21:13:42Z — Assistant** [reported_design]: Fitness direct athletic gains,not generic training credit;no double counting;Normal locked,Light/Intense provisional.
- **2026-10-06T21:22:44Z — Assistant** [reported_prototype_delivery]: Preview roles:Wide Stamina/Sprint/Balance;ST Strength/Stamina/Jumping;midfield Stamina/Strength/Balance;CB Strength/Jumping/Balance;provisional fills withheld.

**Limits:** A normal-intensity package does not prove final light/intense calibration. Outfield groups only recovered.

## C17 — Calendar progression implementation and honest UI

**Locator:** sandbox:/Users/zainrahman/Documents/Codex/2026-10-05/new-chat-5/Touchline_Playable_Calendar.html

- **2026-10-06T15:32:20Z — User** [designed_decided]: Replace time/load with development and stamina;Rest+25%,Light+15%,Normal+5%,Intense−10%;advance to chosen matchday,auto-sim intervening matches,leave target match unplayed.
- **2026-10-06T21:11:23Z — User** [designed_decided]: Hide tiny OVR decimals;LOW/STANDARD/HIGH with proportional7%/29%/100% meter,not misleading1/2/3 bars.
- **2026-10-06T21:17:39Z — Assistant** [reported_implementation_test]: Calendar HTML updated with meters,Fitness and season-end aging;18 logic checks passed;visual verification unavailable.
- **2026-10-06T21:29:00Z — User** [designed_decided]: Set Pieces normal POT-suppressed,role-specific;Jumping excluded.
- **2026-10-06T21:32:08Z — Assistant** [reported_implementation_test]: Set Pieces added;19 logic checks passed;visuals unverified.
- **2026-10-06T21:55:50Z — Assistant** [reported_prototype_delivery]: Remove player selector;automatic role/attribute preview every3seconds with hover pause.
- **2026-10-06T22:08:30Z — Assistant** [reported_prototype_delivery]: Preview moved into Set Pieces area and corrected to8-second single timer.
- **2026-10-06T22:20:24Z — Assistant** [reported_implementation_test]: Initialize starters at45% stamina;rest demonstrates70%.

**Limits:** Prototype logic checks are historical assistant reports, not independently rerun tests or production game integration. Rotation3seconds was superseded by8seconds.

## C18 — Performance benchmark calibration

**Locator:** Chat title: Refine Development Model

- **2026-10-06T22:51:29Z — Assistant** [exploratory_proposal]: Earlier universal expected rating proposal+.03 perOVR:60≈6.1,70≈6.4,80≈6.7,90≈7.0.
- **Date/time not independently recovered — User, earlier within same session** [designed_decided]: Prefer linear/bucketed league-specific expected ratings;EPL75=6.0,85=7.0. Compare ST,wingers,CAM;99 outputs initially too low,then wing/CAM top end too generous after tests.
- **2026-10-07T00:25:44Z — Assistant** [reported_analysis]: Reported75–80OVR stress tests against2025–26 EPL G+A/90;CAM biggest generosity problem,ST high,wings close.
- **2026-10-07T00:31:46Z — User** [designed_decided]: CAM at that level far too generous;wing very close;striker high.
- **2026-10-07T00:32:21Z — Assistant** [exploratory_proposal]: Latest retrieved response supplies proposed ST/wing/CAM curves (quantitative appendix);no implementation/export recorded.

**Limits:** Earlier anchor adoption timestamps are not separately exposed; retrieval sometimes groups them under the last user correction. G+A/90/minutes-confidence was favoured in the discussion; exact acceptance of every supporting rule is not established. Underlying sports statistics not reverified; do not treat proposed curve as a final calibrated model.

## C19 — October7 calendar/competition polish

**Locator:** sandbox:/Users/zainrahman/Documents/Codex/2026-10-05/new-chat-5/Touchline_Playable_Calendar.html

- **2026-10-07T12:06:03Z — Assistant** [reported_prototype_delivery]: Removed duplicate Prepare match/debug notices;competition colours in legend;dim out-of-month cells.
- **2026-10-07T13:09:05Z — Assistant** [reported_prototype_delivery]: Compact,bolder dark-charcoal cutoff band.
- **2026-10-07T13:14:45Z — Assistant** [reported_prototype_delivery]: Apply EPL header fade/charcoal table styling to FA and Carabao.
- **2026-10-07T13:21:39Z — Assistant** [reported_prototype_delivery]: Stamina colours/custom emerald bolt updated.
- **2026-10-07T21:47:23Z — User** [designed_decided]: Only copy left Squad base from supplied HTML;fitness bolt/100%white;keep original gold stars;change nothing else.
- **2026-10-07T21:49:23Z — Assistant** [reported_prototype_delivery]: Calendar HTML delivered with original left styling/gold stars restored,only fitness icon/percentage white.
- **2026-10-07T21:53:06Z — User / retrieved iteration summary** [designed_decided]: Try almost-black green,grainy charcoal,then exact standings background;last accepted direction exact standings dark-glass.
- **2026-10-07T22:07:49Z — User** [designed_decided]: Light-green status text→muted/light red distinct from bolt;competition-name text in competition colour.
- **2026-10-07T22:09:45Z — Assistant timestamp only** [uncertain]: Retrieval exposed a response timestamp but not its body;targeted follow-up did not recover it.

**Limits:** Last red-status/league-text request is not promoted to completed implementation. Exact final HTML bytes unavailable; earlier screenshot may predate these changes.

## U01 — Unplaced material and search limits

**Locator:** Unavailable

- **Date/time not independently recovered — Saved summary** [uncertain]: 2026-27-ratings-updated-audited.xlsx:226 players,21 Liverpool,22 validated cards,80 unverified retained club assignments,5 unknown expiries.
- **Date/time not independently recovered — Search result** [retrieval_limit]: No directly dated September30 card/manager/ratings/progression source recovered. Earlier August18 broad website is already archived.

**Limits:** Do not manufacture aSeptember30 entry or claim the audited workbook delivered on a particular day. Saved summary alone is not a recovered original timestamp or attachment.

