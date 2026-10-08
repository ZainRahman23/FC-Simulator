# Quantitative design record — keep revisions and evidence levels distinct

This is a retrospective text extraction, **not a replacement workbook or executable final specification**. C-numbers refer to the source register/ledger. All checks are historical assistant reports unless explicitly identified as this package’s own validation.

## Ratings and export lineage (C02,C03,C06,C07)

| Recorded delivery | Scope reported | Caveat |
|---|---|---|
| October1 23:14:44 UTC |19 Liverpool cards|Not the later corrected collection|
| October2 13:39:50 UTC |21players,42 transparent front/back PNGs|Tactical fields unassigned|
| October2 22:11:25 UTC |Flank workbook,226 player checks|Final penalty scale conflicts with saved summary|
| October3 15:37:29 UTC |226players,11profile review,original formulas|Original bytes not recovered; superseded by October4 reviewed export|
| October4 13:30:53 UTC |226players,416input changes across20players,78eligible-position calculations|Assistant-reported; no independent recalculation here|

The October4 export report gives Anderson87.40→87 and Barcola81.46→81, Messi rank6→4, Osimhen12→8. Araújo remains pending in the latest retrieved October4 record. Do not silently append him to a delivered workbook.

**Conflicting full-profile summaries.** The inherited saved overview and a retrieved October3 delivery summary give different displayed OVRs: examples include Mbappé94 versus92, Olise92 versus93, Bellingham94 versus91, and Nuno Mendes91 versus89. These pairs are *conflicting source summaries*, not new proposed ratings. Recover the original file and compute from its unchanged coefficients before choosing any as the authoritative dataset. The historical event that an export was reported does not settle its contents.

## Opposite-flank weak-foot penalties (C03)

Latest retrieved October2 output:

|Weak foot|HIGH deduction|MEDIUM deduction|LOW deduction|
|---|---:|---:|---:|
|5★|0|0|0|
|4★|3|2|1|
|3★|4|3|2|
|2★|5|4|3|
|1★|6|5|4|

The saved overview instead contains4★3/2/1,3★6/4/2,2★9/6/3,1★12/8/4. Original workbook/module recovery is required. Both records concern attribute-level penalties; do not substitute a flat OVR deduction. Separately, the out-of-position rule was−5 to every attribute followed by positional OVR recalculation.

## Exposure-only development: target before finalized credits (C13,C14)

The October6 02:12 UTC user target (October5 chronicle day) for a70OVR/85POT reference:

|Minutes|Light target OVR|Medium target OVR|Intense target OVR|
|---:|---:|---:|---:|
|0|70|71|73–74|
|60|71|72|75|
|90|72|73|76|

Exposure stays small and nonnegative. Performance is separate and may add or subtract more; age is excluded from positive exposure and instead drives separate decline. These are user design targets, not measured season results.

The early proposal used52matches/190sessions. At11:49:19 UTC the user adopted50matches/190sessions:

|Input|Credit reported|
|---|---:|
|Light training/session|.00125|
|Medium/Normal training/session|.00500|
|Intense training/session|.01750|
|15match minutes|.00187|
|30match minutes|.00612|
|45match minutes|.01223|
|60match minutes|.02000|
|75match minutes|.02929|
|90match minutes|.04000|

For arithmetic transparency,190sessions at those explicit rates sum to.2375/.95/3.325 *before the model’s POT treatment and other adjustments*;50×.020=1 and50×.040=2. Earlier rounded seasonal descriptions+.25/+1/+3.5 are not exact substitutes. The original JSON/JS must supply the actual interpolation, aggregation and suppression order; this report does not invent them.

POT-gap targets under the stated Medium+90minute reference:

|Gap|Target exposure gain|
|---:|---:|
|0|0|
|1|.2|
|2|.4|
|3|.8|
|4|1.2|
|5|1.6|
|6|2.0|
|7|2.2|
|8|2.4|
|9|2.6|
|10|2.8|
|11+|approximately3.0|

These are reference-response targets, **not a recovered multiplicative factor table**.

## Aging revisions (C15)

At15:57:50 UTC, wide-player decline beginning27 and an initial4.0 annual-base cap were accepted. Initial wide ages27–37 were retrieved as.20,.40,.70,1.00,1.35,1.70,2.10,2.50,3.00,3.50,4.00. Later changes must remain separate:

|Source UTC|Group and ages|Values recorded|Status|
|---|---|---|---|
|19:48:46|Wide29–33|.80,1.50,3.00,4.00,3.00|User revision|
|19:48:46|CB30–40|.50,1,2,3,4,3,2,2.5,3,3.5,4|User revision|
|19:48:46|ST34–40|2,2.5,3,3.5,4,4,4.5|User revision|
|20:08:35|Midfield26–32|.10,.20,.40,.60,1,2,4|Intermediate assistant “locked” report; later revised|
|20:29:33|Midfield27–32|.40,1,1.25,1.5,1.75,4|Later assistant report|
|20:15:04 andlater|41,42,43,44,45+|5,7,9,12,15|Reported “universal cliff”; recovered explicit wide/striker/midfield descriptions|

The complete last midfielder table, final affected-attribute law, full-back grouping changes, GK law, birthdays/season-end age convention and final cap semantics are not independently established from the recovered package bytes. **Do not publish the initial4.0 cap as the final rule.** Do not apply all partial tables together as an implementation.

## Fitness:190 Medium sessions, user-accepted halved packages (C16)

Fitness bypasses POT suppression and improves athletic attributes directly; it must not also receive generic training credit. Accepted vector order is Acceleration / Sprint Speed / Agility / Reactions / Stamina / Jumping / Balance / Strength.

|Group|ACC|Sprint|Agility|Reactions|Stamina|Jumping|Balance|Strength|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|Wide|.5|2|1|.5|2.5|1|2|1.5|
|ST|.5|1.5|.5|1|2|1.5|1.5|2.5|
|Midfield|.5|1|1|1|2.5|1|2|2|
|CB|.5|1|.5|1|1.5|2|2|2.5|

Normal/Medium was described as locked; Light/Intense Fitness remained provisional. The generic training1:4:14 ratio is not proof that Fitness uses the same finalized scaling.

## Calendar and Set Pieces (C17)

Stamina change:Rest+25,Light+15,Normal+5,Intense−10 percentage points; the source’s demonstration is45→70 afterRest. Generic development rates yield a UI labelled LOW/STANDARD/HIGH with rounded proportional fills7%/29%/100%, rather than equally spaced bars.18logic checks were reported after Fitness/aging integration;19after Set Pieces. A three-second preview rotation was replaced by one eight-second timer.

Set Pieces uses normal POT-suppressed training;Jumping excluded. Retrieved groups:Wide/CAM/CM—Crossing,Curve,FKAccuracy,LongPassing,smallShotPower;ST—HeadingAccuracy,Penalties,Volleys,smallFinishing/ShotPower;CB/CDM—HeadingAccuracy,ShortPassing,Penalties,smallVolleys. Exact coefficients were not recovered; do not invent them.

## Performance calibration — last retrieved *proposal*, not accepted final (C18)

User’s EPL expected-match-rating anchors:75→6.0,85→7.0. The earlier universal+.03/OVR proposal was not the preferred approach. G+A/90 was favoured in the comparison over treating season totals as the internal benchmark; original minute-confidence formula not recovered.

Latest retrieved assistant proposal,October7 00:32:21UTC (October6 development day):

|OVR|ST G+A/90|RW/LW G+A/90|CAM G+A/90|
|---:|---:|---:|---:|
|75|.35|.18|.20|
|80|.50|.30|.40|
|85|.70|.50|.65|
|90|.90|.90|.95|
|95|1.20|1.45|1.40|
|99|1.60|1.80|2.10|

The immediately preceding user verdict:low-end CAM far too generous,ST high,wings close. No subsequent user acceptance or implementation/export is recovered. Historical2025–26 EPL comparisons were reported, with sample-size concerns; underlying statistics and exact player samples were not independently checked here. Do not call this a validated final progression model.
