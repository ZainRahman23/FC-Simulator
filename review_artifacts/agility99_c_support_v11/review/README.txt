TOUCHLINE — AGILITY-99-V1.1

Owner decision: A99-C is the provisional movement ceiling. No freeze.

START
Double-click Launch.command. Keep its terminal open while playing; Control-C stops it.
The launcher binds only to this computer and opens Report.html. No installation is required beyond Python 3 already present on this machine.
Report.html also opens directly for videos and diagnostic tables. The playable lab needs the launcher because the browser loads local modules/assets.

REVIEW
The lab defaults to A99-C, BALL OFF, NEW DIRECTION-CHANGE LOCOMOTION.
Play: drag joystick or WASD; Shift/sprint lock; inner walk, middle jog, outer run.
BODY swaps the body without resetting the live simulation.
Compare: original and new bodies share one simulation. Select case, entry offset, direction and camera. Support guides reveal planned landings and current family/next foot/revisions.
Start with fast circle, then repeated steering, 45–90 cuts, reversals and straight sprint.
BALL ON is diagnostic only: new support feet are not aligned to authored touches.

CONTENTS
Report.html — findings, normal-speed videos, diagnostic explorer and limitations.
lab/ — complete isolated runnable source and character assets.
replays/ — 20 normal-speed MP4 comparisons and poster images.
data/ — full diagnostic CSV/JSON, original/new joint traces, support events, verification and provenance.
Football-footwork-research.md — cited research memo, distinguishing evidence from implementation choices.
review-tools/ — reproducible body audits and trace scripts; run from this package root with Node.

CHANGES
New: lab/sandbox/visual/agility99/support.js and direction_body.js.
Updated: agility99/viewer.js and agility99.html.
1,604 existing V1 files unchanged. Movement, original body, baseline TC and ball code unchanged.
No production changes. B4/B5 remain separate. No ratings below 99.

MEASUREMENT
Audit: node review-tools/audit.mjs
BALL ON diagnostic: node review-tools/audit.mjs --ball
Original trace: node review-tools/diagnose.mjs
New trace: node review-tools/new_diagnose.mjs
These overwrite matching files in data/ only. The packaged report embeds the reviewed measurements; rerunning scripts does not regenerate the report.
The full exact-comparison verification was run against the preceding V1 workspace; its results and SHA-256 source hashes are in data/verification.json.

LIMITS
Zero threshold flags is not mesh-perfect clearance. Curved running still turns during flight. Repeated ±30 has increased flight share, and late endpoint corrections can be roughly 25 cm. The new body uses controlled boot pivots and bounded orientation lag; it does not simulate ground forces. BALL ON touches need separate integration. Owner visual/playable acceptance remains open.
