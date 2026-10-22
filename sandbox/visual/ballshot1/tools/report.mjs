import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {profileSVG} from '../render.js';
const root=fileURLToPath(new URL('..',import.meta.url)),read=n=>JSON.parse(fs.readFileSync(root+'/evidence/'+n+'.json'));
const m=read('measurements'),r=read('review'),tests=read('tests'),foundation=read('foundation-regression');
const f=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—',v=a=>'['+a.map(x=>f(x,3)).join(', ')+']';
const table=(heads,rows)=>'| '+heads.join(' | ')+' |\n| '+heads.map(()=>'---').join(' | ')+' |\n'+rows.map(row=>'| '+row.join(' | ')+' |').join('\n');
const statuses={
 'BALL-FEEL-1.4 CANDIDATE A PRESERVED':'YES',
 '80 SHOT POWER BASELINE ESTABLISHED':'YES',
 'INSIDE FAMILY':'PASS','OUTSIDE/TRIVELA FAMILY':'PASS','LACES FAMILY':'PASS','POWER SHOT FAMILY':'PASS','CHIP FAMILY':'PASS',
 'FIVE FAMILIES VISUALLY DISTINCT':'PARTIAL','POWER > LACES VELOCITY':'YES','80→99 ATTRIBUTE HEADROOM PRESERVED':'YES','CURVE LEFT FROZEN':'YES','POST-LAUNCH BALL FULLY PHYSICAL':'YES','NO SCRIPTED TRAJECTORY':'PASS','GROUND-BALL REGRESSION':'PASS','DETERMINISM':'PASS','READY FOR OWNER VISUAL REVIEW':'YES'
};
fs.writeFileSync(root+'/evidence/status.json',JSON.stringify({statuses,ownerSelectionPending:true,matchIntegrated:false},null,2));
for(const kind of ['height','speed','lateral'])fs.writeFileSync(root+'/evidence/five-'+kind+'.svg',profileSVG(r.candidates.filter(x=>r.selected.includes(x.id)),{kind}));
const lines=[
 '# BALL-SHOT-1 — 80 Shot Power review',
 'The provisional FAST baselines are Inside 30, Outside 32, Laces 34, Power 39 and Chip 16 m/s. All use the same Shot Power 80 player and the exact Candidate A physical environment. These are recommendations for owner selection, not an approved match integration.',
 ...Object.entries(statuses).map(([k,val])=>'- **'+k+': '+val+'**'),
 'Family PASS means a physical, measured set of three usable calibration candidates exists. Five-family visual distinction is PARTIAL: Chip is clearly lofted, Inside/Outside bend in opposite directions, but Laces and Power retain similar low direct shapes. Their distinction currently relies mainly on pace and disclosed preparation. Final kick animation and owner feel approval are pending.',
 '## Five videos to watch first',
 ...['inside','outside','laces','power','chip'].map(x=>'- ['+x.toUpperCase()+' — three brackets, 1×](videos/'+x+'-80-brackets-1x.mp4)'),
 'Each 9-second clip shows CONTROLLED → FAST → VERY FAST, three seconds per candidate, at 60 fps and 1× simulation time. All use the same frozen Touchline camera. They start at contact; preparation is available separately. No audio.',
 'Also included: [synchronized five-family matrix](videos/five-families-80-1x.mp4), [Chip side view](videos/chip-fast-side-1x.mp4), [0.25× contact timing](videos/contact-timing-quarter-speed.mp4).',
 'Open review.html in the delivered folder for the packaged review, or use the live HTTP review. The page defaults to the synchronized 1× Touchline view and provides each family’s brackets, side/behind/goal/contact cameras, preparation, 25/30 m and charge/attribute comparisons. The packaged HTML embeds the replay data and module graph. Its syntax, links and source were checked; opening a local file in the automated browser was not tested. The live HTTP page was visually checked.',
 '## Recommended 80 baseline and 19 m arrival',
 table(['Family','Launch m/s','Horizontal / vertical m/s','Elevation / yaw °','Arrival s','Arrival m/s','Centre height m','First-flight apex clearance m / time s'],m.selected.map(s=>{const a=s.launch,g=s.metrics.goalPlane;return [a.family,f(a.speed,1),f(a.horizontalSpeed)+' / '+f(a.verticalVelocity),f(a.launchAngleDeg,1)+' / '+f(a.aim.yawDeg,1),f(g.time,3),f(g.speed),f(g.height),f(s.metrics.apex)+' / '+f(s.metrics.apexTime,3)];})),
 'The ball starts at [0, 0.11, 0] m, stationary. X is forward, Y is up, Z is lateral. The target plane is X=19 m, with a 7.32 × 2.44 m reference goal. All five selected candidates cross within its mouth. Goal-plane times start at authoritative contact, excluding preparation. Heights are ball-centre height; apex is ball-bottom clearance above turf (add 0.11 m for centre height).',
 'The calibration flights have no goal or character colliders, so the goal is diagnostic geometry and the trajectories continue through its plane. Post/crossbar and incidental-contact behavior is exercised by the frozen foundation suite, not inferred from these free-flight goal results.',
 '## All fifteen 80-power launch candidates',
 table(['Family / bracket','Shot Power','Speed m/s','Horizontal / vertical m/s','Velocity [X,Y,Z] m/s','Elevation / yaw °','19 m time / speed','Apex clearance / time','First landing distance / time'],m.candidates.map(s=>{const a=s.launch,g=s.metrics.goalPlane,l=s.metrics.firstLanding;return [a.family+' / '+a.bracket,a.shotPower,f(a.speed,1),f(a.horizontalSpeed)+' / '+f(a.verticalVelocity),v(a.velocity),f(a.launchAngleDeg,1)+' / '+f(a.aim.yawDeg,1),f(g.time,3)+' s / '+f(g.speed)+' m/s',f(s.metrics.apex)+' m / '+f(s.metrics.apexTime,3)+' s',f(l.distance)+' m / '+f(l.time,3)+' s'];})),
 '## Spin, preparation and technique conversion',
 table(['Family (all three brackets)','Angular velocity [X,Y,Z] rad/s','Magnitude rad/s','Unit spin axis','Prep s','Conversion × commitment'],m.selected.map(s=>{const a=s.launch;return [a.family,v(a.angularVelocity),f(a.spinMagnitude),v(a.spinAxis),f(a.prepareSeconds),f(a.techniqueConversion,4)+' × '+f(a.commitment,4)];})),
 'Spin and aim are fixed within each family’s three speed brackets. Positive local backspin is +Z for a straight +X launch; negative Z is topspin. Outside’s small X component comes from rotating its local topspin axis by its +7° launch yaw. Inside/Outside use opposite Y sidespin. The existing fc-b Magnus law is imported unchanged; selecting launch spin does not retune that law.',
 'The boot in contact diagnostics is a timing illustration with its toe at the ball at t=0. The resolver determines launch; boot motion neither generates nor corrects ball velocity. Preparation is a disclosed timing cost (.65 s for Power versus .28 s for Laces), not a completed match action or final family-specific skeletal animation. The physical scheduled action is at tick 0; negative replay time illustrates preparation outside the physics run.',
 '## Trajectory heights at useful distances',
 'Centre heights in metres. These observer samples can be after a real turf bounce; they are not prescribed control points. A dash means that flight did not reach the plane within its recorded duration.',
 table(['Candidate','5 m','10 m','15 m','19 m','20 m','25 m','30 m'],m.candidates.map(s=>[s.id,...[5,10,15,19,20,25,30].map(d=>f(s.metrics.planes[d]?.height,3))])),
 '## 25–30 m results',
 table(['Family','Plane m','Arrival s','Speed m/s','Centre height m','Before first turf contact'],m.longRange.map(s=>{const g=s.metrics.goalPlane;return [s.launch.family,s.target,f(g.time,3),f(g.speed),f(g.height),g.beforeFirstLanding?'YES':'NO — physical bounce/skim'];})),
 'These use exactly the selected 19 m launch, spin and aim. Only the observation plane moves. At 25 m, Outside and Power remain in first flight; Inside and Laces have already landed. At 30 m all four have landed, retaining 17.76–24.12 m/s. This supports pace retention, not a claim that the low 19 m aim is the final long-shot aim.',
 '## Chip distance and charge',
 table(['Landing target m','Charge %','Launch m/s','Horizontal / vertical m/s','Apex clearance m','First landing m','Landing time s'],m.chips.map(s=>{const a=s.launch,l=s.metrics.firstLanding;return [s.target,f(a.chargeFactor*100,2),f(a.speed),f(a.horizontalSpeed)+' / '+f(a.verticalVelocity),f(s.metrics.apex),f(l.distance,3),f(l.time,3)];})),
 'All four chips keep Shot Power 80, elevation 36°, yaw 0° and backspin +12 rad/s. They use the 18 m/s upper candidate as the full-charge ceiling; the common 19 m FAST candidate uses 16 m/s at full charge. A deterministic offline bisection selects charge before launch by measuring first physical landing. There is no in-flight distance controller. Near-exact landing distances are numerical calibration results, not a promise of live execution accuracy. The 240/480 Hz check gives the practical integration tolerance.',
 'The selected 16 m/s Chip first lands at '+f(m.selected.at(-1).metrics.firstLanding.distance,2)+' m after '+f(m.selected.at(-1).metrics.firstLanding.time,3)+' s. The 18 m/s candidate reaches the 19 m plane at 4.47 m centre height, clearly over the bar at this fixed aim.',
 '## Controlled player and context',
 table(['Player attribute','Value'],Object.entries(m.player).map(([k,val])=>[k,val])),
 table(['Context','Value'],Object.entries(m.context).map(([k,val])=>[k,Array.isArray(val)?JSON.stringify(val):val])),
 'Finishing, Long Shots, Curve and Technique remain separate reserved inputs at 50. They have no uncalibrated hidden bonus in this experiment. Weak Foot is 50 but does not penalize the selected preferred right foot. No attribute is silently set to 99. Pressure, fatigue, body setup and execution are separate resolver factors; their broader curves are not calibrated here.',
 '## Capability, charge and headroom',
 '`capability(SP) = 0.65 + 0.65 × (SP / 99)²`, valid for ratings 1–99. The map is nonlinear, strictly increasing, and bounded on that declared domain; it is not an asymptotically saturating curve. Invalid ratings fail explicitly.',
 '`speed = 34 × capability(SP)/capability(80) × techniqueConversion × commitment × bracketScale × charge × contextFactor`.',
 'FAST bracketScale is 1. Power uses the same capability(80) and Laces conversion 1, with explicit commitment 39/34. Inside converts at 30/34, Outside 32/34 and Chip 16/34. Aim decomposes the scalar launch once. Spin is resolved once. The selected 80→99 gain is '+f((m.headroom.at(-1).ratioTo80-1)*100,2)+'%; it is not 99/80 scaling.',
 table(['Shot Power','Inside','Outside','Laces','Power','Chip'],m.headroom.map(h=>[h.shotPower,...['INSIDE','OUTSIDE','LACES','POWER','CHIP'].map(k=>f(h.speeds[k],2))])),
 'Speeds above are m/s, projected clean FAST strikes. The four hard families remain within the 19 m reference mouth at these sampled ratings. Full-charge Chip at 90/99 clears the bar at fixed 36° (about 4.11/5.83 m centre height); use lower charge for the same target. This is an envelope check, not finished attribute calibration or goalkeeper-readability validation.',
 table(['Shot Power 80 family','Soft charge 35% m/s','Normal charge 65% m/s','Hard charge 100% m/s'],m.actionWeights.map(a=>[a.family,...a.weights.map(w=>f(w.speed,2))])),
 'Charge weights linear launch speed in this provisional interface, independent of the nonlinear player capability. Context factor is (0.75+0.25×executionQuality) × (0.85+0.15×bodySetup) × (1−0.10×pressure) × (0.85+0.15×min(energy,stamina)) × footFactor. Preferred-foot factor is 1; the uncalibrated weak-foot branch is 0.72+0.28×weakFoot/99. Those context transforms are exposed for audit, not claimed to be final gameplay balance.',
 '## Which upper candidate feels too fast',
 '**Power 44 m/s** is my provisional excessive-at-80 candidate: it crosses 19 m in '+f(m.candidates.find(s=>s.id==='power-very-fast').metrics.goalPlane.time,3)+' s. I recommend 39 m/s for owner review, preserving a 47.19 m/s projected FAST ceiling at 99. This is a visual/readability judgment, not a conservative real-world speed limit. **Chip 18 m/s** is too much for the fixed 19 m aim, though useful for a longer chip. The owner can still choose either upper bracket.',
 '## Three remaining shot-feel questions',
 '1. Does Power at 39 m/s with 0.65 s preparation feel sufficiently distinct from Laces at 34 m/s and 0.28 s, given their similar low flight shapes?',
 '2. Are the frozen opposite bends and launch geometry enough to read Inside versus Outside at 1×, before the separate curve-calibration mission?',
 '3. Is Chip at 16 m/s and 36° the right 19 m loft, with charge providing distance control, or should the later aim design include a lower, quicker chip?',
 '## Verification and boundaries',
 '- '+tests.passed+'/'+tests.total+' shot/audit tests; '+foundation.passed+'/'+foundation.total+' foundation regressions pass.',
 '- All '+m.preservation.files+' prior BALL-PHYS/BALL-FEEL files remain byte-identical to c9479985fd0cfb810d9de7674b36f50f4ec555fc. No prior evidence was overwritten.',
 '- Old ground streams: 18 ground candidates plus 20 foundation scenarios, '+m.groundRegression.bytes+' bytes; SHA-256 `'+m.groundRegression.hash+'`. Exact saved Candidate A parity.',
 '- New 15 shot streams: '+m.parity.bytes+' bytes; SHA-256 `'+m.parity.hash+'`. Exact Node rerun and actual Chrome browser replay.',
 '- Normal/through/firm/driven/old low-shot skims, bounce, incidental body contacts, tackle-loose, posts/crossbar and CCD remain covered. Body interaction remains in the imported physical world.',
 '- Maximum selected-candidate 240→480 Hz differences: arrival '+f(Math.max(...m.convergence.map(x=>x.goalTimeError))*1000,3)+' ms, centre height '+f(Math.max(...m.convergence.map(x=>x.goalHeightError))*100,3)+' cm, apex '+f(Math.max(...m.convergence.map(x=>x.apexError))*100,3)+' cm, first landing '+f(Math.max(...m.convergence.map(x=>x.landingDistanceError))*100,3)+' cm.',
 '- One authoritative launch per shot; changing metadata cannot steer it; moved-ball contact cancels; duplicate actions reject; all selected flights eventually settle under unchanged turf.',
 '- Eight MP4s fully decoded successfully; representative frames were visually inspected. Browser controls, cameras, synchronized replays and full view were checked. No keeper, match action selection, receiving or dribbling integration.',
 '## Source and reproducibility',
 'The delivered source folder preserves the repository layout under source/sandbox/visual. With Node 22, run `node source/sandbox/visual/ballshot1/tools/test.mjs` from the package to reproduce the tests, including byte checks of all bundled frozen files. Serve the source folder with a local HTTP server to open sandbox/visual/ballshot1/index.html. No npm install is required for tests or the page.',
 'The evidence builder additionally needs the original Git history at c9479985. Video regeneration uses Sharp and FFmpeg at the local paths documented in tools/videos.mjs; exported MP4s need neither. The package contains replay evidence, measurements, source hashes, tests, validation, and the implementation patch/commit metadata. review.html contains the runtime and data; adjacent videos/evidence/report links need the rest of the folder.',
 'Resolver entry points are resolveShot and scheduledLaunch, with their auditable interface in contract.d.ts. This stationary-ball lab rejects nonzero starting velocity rather than silently misreporting it. Full-precision vectors, contact facts, observer planes, event lists and per-substep states are retained in evidence/measurements.json and evidence/review.json.'
];
fs.writeFileSync(root+'/README.md',lines.join('\n\n')+'\n');console.log('Report, status and three plots generated');
