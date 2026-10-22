import fs from 'node:fs';const statuses={
'BALL-FEEL-1.2 FOUNDATION PRESERVED':'YES',
'CURVE LEFT FROZEN':'YES',
'NORMAL PASS MICRO-BOUNCE':'PARTIAL',
'FIRM PASS TURF SKIP':'PASS',
'DRIVEN PASS TURF SKIP':'PASS',
'LOW SHOT SKIM/SKIP':'PASS',
'MICRO-BOUNCE IS PHYSICAL':'YES',
'EARLY GROUND-BALL PACE PRESERVED':'YES',
'TURF CONTACT DISSIPATES MEANINGFUL ENERGY':'YES',
'DRIVEN RUNOUT REDUCED VS SHORTER SKID B':'PARTIAL',
'VERTICAL BOUNCE PRESERVED':'YES',
'PROGRESSIVE TURF PRESERVED':'YES',
'MICRO-TURF MODEL REQUIRED':'NO',
'INCIDENTAL PHYSICS REGRESSION':'PASS',
'DETERMINISM':'PASS',
'CPU VIABLE':'YES',
'READY FOR OWNER VISUAL REVIEW':'YES'};
const text=Object.entries(statuses).map(([k,v])=>k+': '+v).join('\n')+`\n\nNORMAL PARTIAL: physical hops pass; subtle 2.52 cm texture is subpixel at Touchline scale. The 6.63 cm upper candidate adds a visible comparison. Owner camera judgment remains pending.\nRUNOUT PARTIAL: subtle option cuts 63.57 → 60.79 m (4.4%), but stronger skips run 64.40–65.47 m and the subtle option slides longer.\n\nTHREE NORMAL-PASS CANDIDATES TO WATCH: MICRO-SKIP (2.52 cm), VISIBLE MICRO-SKIP (6.63 cm), TOO BOUNCY (42.12 cm).\nTHREE DRIVEN-PASS CANDIDATES TO WATCH: SUBTLE / RUNOUT OPTION, MEDIUM SKIP, STRONG FOOTBALL SKIP.\nBEST LOW-SHOT SKIP: TURF SKIM; 5.50 cm peak, 34.5 m/s horizontal launch.\nBEST OVERALL FOOTBALL-TURF CHARACTER: provisional MICRO-SKIP normal → FIRM FOOTBALL SKIP → STRONG FOOTBALL SKIP driven → TURF SKIM low shot. Strong driven is the texture choice, not the range winner.\nWHICH CANDIDATE IS TOO BOUNCY: normal TOO BOUNCY (42.12 cm) and driven TOO BOUNCY (48.60 cm); driven EXAGGERATED (19.89 cm) is the borderline game-style option.\nDRIVEN RUNOUT BEFORE VS AFTER: 63.57 → 60.79 m subtle; 64.40 m medium; 65.47 m strong.\nEARLY 10/15/25 m TIMES BEFORE VS AFTER: control 0.358 / 0.612 / 1.176 s; subtle 0.348 / 0.580 / 1.159 s; medium 0.331 / 0.537 / 1.086 s; strong 0.329 / 0.523 / 1.041 s.\nTHREE REMAINING GROUND-BALL DEFECTS: (1) subtle normal/firm hops are small at gameplay scale; (2) stronger skips increase total runout, while the shorter-range option slides longer; (3) last millimetre-scale hops depend on timestep/cutoff, despite bit-exact fixed-step replay.\n\n79 checks pass (53 foundation + 26 focused). Node/Chrome agree on 38 full unrounded streams. All 365 prior tracked files are byte-identical. No match/receiving integration, no curve selection. Stop for owner choice of normal, firm, driven and low-shot character.\n`;
fs.writeFileSync(new URL('../evidence/final-report.txt',import.meta.url),text);fs.writeFileSync(new URL('../evidence/status.json',import.meta.url),JSON.stringify(statuses,null,2));console.log('Final owner-review report written');
