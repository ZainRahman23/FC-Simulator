import fs from 'node:fs';import {frameAt} from '../../ballphys1/render.js';
const root=new URL('../',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL('evidence/'+n+'.json',root))),m=read('measurements'),review=read('review'),tests=read('tests'),foundation=read('foundation-regression'),get=id=>m.candidates.find(r=>r.id===id),fmt=(n,d=2)=>Number(n).toFixed(d);
const statuses={
'REFERENCE A ANALYZED':'YES','REFERENCE B ANALYZED':'YES','NORMAL-PASS PACE MATCH':'PASS','NORMAL-PASS TURF TEXTURE MATCH':'PARTIAL','THROUGH-BALL WEIGHT MATCH':'PARTIAL','THROUGH BALL PROGRESSIVELY SLOWS':'YES','THROUGH BALL NATURALLY RUNNABLE-ONTO':'YES','EXCESSIVE GROUND RUNOUT REDUCED':'YES','NORMAL/FIRM/DRIVEN CONTINUUM':'PASS','LOW-SHOT SKIM PRESERVED':'YES','MEANINGFUL VERTICAL BOUNCE PRESERVED':'YES','CURVE LEFT FROZEN':'YES','ONE COMMON PHYSICAL TURF MODEL':'YES','INCIDENTAL PHYSICS REGRESSION':'PASS','DETERMINISM':'PASS','READY FOR OWNER VISUAL REVIEW':'YES'};
fs.writeFileSync(new URL('evidence/status.json',root),JSON.stringify(statuses,null,2));
const selected=['ground','through','firm','driven','power'].map(f=>get(f+'-A'));
const table=['| Action | Launch m/s | Current runout | Candidate A | Candidate B |','|---|---:|---:|---:|---:|',...selected.map(r=>{const f=r.definition.family;return `| ${f==='ground'?'Normal 13 m':f==='power'?'Low shot':f} | ${fmt(r.launch.velocity[0])} | ${fmt(get(f+'-current').range,1)} m | ${fmt(r.range,1)} m | ${fmt(get(f+'-B').range,1)} m |`;})].join('\n');
const through=review.candidates.filter(r=>r.definition.family==='through');
const timeRows=review.refs.through.speedSegments.map(p=>{const lo=p.t-.25,hi=p.t+.25;return `| ${fmt(lo)}–${fmt(hi)} s | ${fmt(p.low,1)}–${fmt(p.high,1)} | ${through.map(r=>fmt((frameAt(r,hi).p[0]-frameAt(r,lo).p[0])/(hi-lo),1)).join(' | ')} |`;});
const thirdRows=[0,25/3,50/3,25].map(x=>{const values=through.map(r=>{const b=r.frames.find(f=>f.p[0]>=x)??r.frames.at(-1),v=x===0?r.action.velocity:b.v;return fmt(Math.hypot(v[0],v[2]),1);});return `| ${fmt(x,1)} m | ${values.join(' | ')} |`;});
const normal=get('ground-A'),normalB=get('ground-B'),catchA=get('through-A').runner.at(-1).catchAt,catchB=get('through-B').runner.at(-1).catchAt;
const text=`# BALL-FEEL-1.4 — supplied ground-ball references

Ready for owner visual review. Candidate A is the provisional coherent surface/launch set; Candidate B is the tighter alternative. **Not ready to freeze for receiving/dribbling integration until the owner selects the 1× feel.** No receiving, dribbling or match integration was added.

Open [the portable review](review.html) or [the live review](http://127.0.0.1:8769/sandbox/visual/ballfeel14/). The live review has been exercised in Chrome. The offline HTML is self-contained for data/code but needs the adjacent references folder for footage; its module graph, embedded data and local links are validated. Direct file:// browsing was unavailable in this session, so an offline browser-open is not claimed.

## Best comparisons

- **BEST REFERENCE A VS TOUCHLINE COMPARISON:** [Through-ball 1× synchronized reel](videos/A-reference-comparison.mp4), or the live review's A section. Reference is the **5.44.46 PM short clip**, mapping confirmed by the owner. It starts after the kick; first-visible-frame alignment is approximate.
- **BEST REFERENCE B VS TOUCHLINE COMPARISON:** [Normal-pass 1× synchronized reel](videos/B-reference-comparison.mp4), or the B section. Reference is the **5.36.19 PM long clip**. Main kick aligned around 1.15 s; receiver contact around 2.0 s. Additional passes were inspected as cross-checks.
- Choose at 1×. Quarter-speed close views expose actual position, orientation and contacts; they do not determine the selected texture. The 1.7× shared camera crop magnifies every candidate equally without retiming physics. Touchline wide remains available.

## Reference evidence: measured, estimated, uncertain

Both complete supplied clips were played at 1× and inspected through ordered 20 Hz frame extracts plus original-pixel crops **before implementation**. [Reference analysis](evidence/reference-analysis.json) records the estimates, original manual centres, corrected displacements and uncertainty. [Provenance](evidence/reference-provenance.json) records source and review-copy hashes. Original files are untouched. Review copies preserve framing, duration and 60 fps, resize to 1960 px wide and remove audio.

**Directly measurable:** recording A is 3.30 s, B is 9.33 s, both 60 fps. A already contains a travelling ball at frame zero; the chase closes around source 2.5–2.7 s. B's primary release is bracketed 1.10–1.20 s and reception 1.95–2.05 s. The source clips end or show a player touch before natural rest.

**Visual estimates:** A covers about 22–31 m of observed useful travel; early observed speed roughly 13–21 m/s, first-third region 9–14, second-third region 6–11, late 5–10. B's main pass is about 10–15 m in .75–.95 s, launch roughly 16–23 m/s and arrival 10–17. Two other ordinary passes were estimated at 6–10 m / .4–.7 s and 11–17 m / .5–.8 s.

**Uncertain:** A's actual launch speed, full travel distance and stopping distance are not visible. Pitch projection is not solved: median grass-patch phase correlation approximates camera translation, and a broad 50–70 horizontal pixels/metre scale uses pitch markings and assumed standard geometry. Zoom/depth/occlusion broaden the bounds. Ball spin cannot be inferred reliably. B's subtle shadow/ball disturbances suggest a few low skips, but exact heights, contact count, spacing and stable-roll time are unresolved. The 0–8 cm band is a visual envelope, not a measured height series. The rough speed estimate loses pace most strongly early; it does **not** prove increasingly strong absolute deceleration. Increasing catchability is visible.

## REFERENCE-ESTIMATED VS TOUCHLINE SPEED PROFILE FOR THE THROUGH BALL

Half-second mean speeds, in m/s. Reference windows begin at its first visible frame; simulations begin at launch, so this is a useful pace comparison, **not an exact phase fit**. Bands include approximate camera/scale error.

| Window | Reference estimated band | Current 1.3 | A | B |
|---|---:|---:|---:|---:|
${timeRows.join('\n')}

Test-lane thirds (25 m lane; not claimed as measured source thirds). Time-plot markers use Candidate A’s observed plane crossings:

| Distance | Current speed | A speed | B speed |
|---|---:|---:|---:|
${thirdRows.join('\n')}

[Speed vs time](evidence/through-time.svg), [speed vs distance](evidence/through-distance.svg), [height vs distance](evidence/through-height.svg), [runner window](evidence/runner-window.svg). Reference bands are estimates; physics traces are sampled at 240 Hz. Contact markers are exact CCD events.

Receiver diagnostic: a runner begins **10 m ahead of the passer**, holds for a .12 s reaction delay, enters at RUN 5 m/s, then accelerates at 4.8 m/s² toward 8.2 m/s SPRINT. These are existing Touchline movement constants from match.js:2185. Catch means the ball overtakes by >1 m and the returning lead reaches .5 m. The marker is offset from the corridor, has no collider, and never changes the ball.

- A: sprint catches at **${fmt(catchA.time)} s / ${fmt(catchA.distance,1)} m**, ball still **${fmt(catchA.ballSpeed,1)} m/s**.
- B: sprint catches at **${fmt(catchB.time)} s / ${fmt(catchB.distance,1)} m**, ball still **${fmt(catchB.ballSpeed,1)} m/s**.
- Current: catches beyond 50 m, outside the intended 20–31 m zone.
- Slower RUN trajectories often meet an already stopped ball. The pass is not guaranteed for every receiver speed. Runner positions are a disclosed representative lane, not reconstructed source positions.

## REFERENCE-ESTIMATED VS TOUCHLINE SKIP HEIGHT/RHYTHM FOR NORMAL PASS

A reaches 13 m in **${fmt(normal.planes[13].time,3)} s at ${fmt(normal.planes[13].horizontalSpeed,1)} m/s**, versus current ${fmt(get('ground-current').planes[13].time,3)} s at ${fmt(get('ground-current').planes[13].horizontalSpeed,1)} m/s. B reaches it in ${fmt(normalB.planes[13].time,3)} s at ${fmt(normalB.planes[13].horizontalSpeed,1)} m/s. This approaches the source's brisk ordinary passing.

A's physical peak is **${fmt(normal.apex*100)} cm**. Meaningful hops (≥1 mm, ≥12.5 ms) peak at ${normal.hops.filter(h=>h.meaningful).map(h=>fmt(h.height*100)+' cm').join(' → ')}. Contact distances are ${normal.hops.filter(h=>h.meaningful).map(h=>fmt(h.endX)+' m').join(', ')}; stable rolling begins at ${fmt(normal.stableRoll.time,3)} s / ${fmt(normal.stableRoll.x,2)} m. B peaks at **${fmt(normalB.apex*100)} cm**, with stable rolling at ${fmt(normalB.stableRoll.time,3)} s. A 5 m layoff peaks at ${fmt(get('short-A').apex*100)} cm, so short and medium passes do not share identical hops.

The [height plot](evidence/ground-height.svg) overlays the broad reference envelope and exact candidate contacts. There is no invented source contact series. Texture remains **PARTIAL**: at match scale it is subtle and concentrated early, and the footage cannot establish an exact rhythm to match.

## TOTAL RUNOUT OF SELECTED NORMAL / THROUGH / FIRM / DRIVEN

${table}

The selected A through, firm and driven reduce runout by ${['through','firm','driven'].map(f=>fmt(100*(1-get(f+'-A').range/get(f+'-current').range),1)+'%').join(', ')} respectively. Normal A runs farther than its slower 1.3 control (${fmt(normal.range,1)} vs ${fmt(get('ground-current').range,1)} m) because restoring crisp pace adds launch energy; this tradeoff is disclosed rather than hidden. The reference does not show natural stopping distance.

## Physical implementation

Only versioned ballfeel14 files are new. All **529** prior ballphys1 / ballfeel1 / ballfeel11 / ballfeel12 / ballfeel13 source and evidence files are byte-preserved. The original dirty FC Simulator checkout is untouched.

The resolver now has a distinct through intent. A one-time distance/arrival solve chooses speed, then continuous speed/distance-dependent small lift and action spin choose launch character. Through and normal may have similar speed for different target distances, but differ in desired arrival state; firm uses more forward spin, driven uses .20 rolling fraction and a longer skid. Low-shot launch remains 34.5 m/s / 1.2 m/s lift / approved spin. Existing direction, technique, foot, attainable power and resolved execution remain compatible. Optional normalized Passing, quality, pressure and seed affect bounded launch errors once; callers must choose seeded execution OR already-resolved execution, never both. There is no new integration into match decision-making.

The shared rolling resistance is the existing smooth rational function:

\`a(v) = [high + (low-high)/(1+(v/knee)^2)] × v/(v+terminal)\`

A uses high=3.6, low=8.8, knee=12, terminal=.35; B uses 4.2, 10, 14, .35. Each candidate uses one environment across all actions. Resistance becomes larger relative to speed as useful pace drains; existing sleep removes the final crawl. Sliding and rolling remain distinct.

A necessary small contact refinement removes a numerical trap: the old abrupt restitution boundary at .2 m/s could sustain submillimetre rebounds under downward Magnus and delay rolling. The old contact solver now receives restitution smoothly faded from zero at .2 to its approved .6 at .4 m/s. At ≥.4 m/s the impact response is exactly unchanged. This only changes terminal bounces whose gravity-only outgoing apex is below about 3 mm; it is not a new vertical animation, target brake or action-specific decay. The formerly bad through launch had ~35 tiny impacts and ~3.89 m timestep disagreement; the regression now settles into roll before .2 s with less than .25 m disagreement. This correction is applied equally to all new candidate balls.

Curve/Magnus code and curve calibration are untouched. All tested flights and meaningful bounce impacts are bit-identical to 1.3 until the first terminal sub-3-mm rebound. Late terminal contact and grounded runout intentionally change. Low-shot first skim and visible contacts remain identical; only its tiny terminal settling and later ground travel change. The 1.3 result that more airborne time can increase range remains valid: no hidden horizontal brake is introduced during flight.

## Validation

- ${foundation.passed}/${foundation.total} foundation assertions pass, including post, crossbar, boot/shin/body, blocked shot, tackle, CCD, rest and launch arbitration.
- **Tackle fixture disclosure:** the old boot aimed at x=.63 m misses because the new ground ball slows sooner. The 1.4 fixture is re-aimed to x=.50 m; its geometry, speed and contact assertions are unchanged. The old scene is preserved. This is a setup correction, not a scripted outgoing kick.
- ${tests.passed}/${tests.total} focused checks pass, including once-only attributes, shared-law behavior, momentum/energy accounting, the reported chatter case, 42 distance/strength profiles, and no metadata/ghost influence on physics.
- 240/480 Hz selected-profile maximum range disagreement: **${fmt(Math.max(...m.convergence.map(c=>c.rangeError)),3)} m**; maximum apex disagreement **${fmt(Math.max(...m.convergence.map(c=>c.apexError))*1000,2)} mm**. Small terminal contact counts can differ by timestep; no claim of timestep-invariant tiny-hop count.
- Node and Chrome agree across **${m.parity.runs} full unrounded state/event streams**, ${m.parity.bytes.toLocaleString('en-US')} bytes. SHA-256: \`${m.parity.hash}\`.
- Isolated 308-collider benchmark: median **${fmt(m.cpu.msPerTick.slice().sort((a,b)=>a-b)[2],3)} ms per 60 Hz tick**. This is not a full-match integration benchmark.
- Six MP4 exports decode successfully. Live UI covers synchronized 1×, reference hold, replay, scrub, close side/.25×, full view, action/regression selection, plots and browser parity. Portable package validation is separate from an offline browser-open.

Run focused checks from source/ballfeel14 with \`node tools/test.mjs\`; run foundation assertions with \`node tools/foundation-regression.mjs\`. Evidence regeneration's frozen-file audit expects the repository history, so it is a repository workflow rather than a standalone-package claim.

## THREE REMAINING GROUND-BALL DIFFERENCES VISIBLE AT 1×

1. Our normal pass becomes smooth rolling after roughly the first 3–4 m; the source appears to retain small irregular disturbances longer, although exact contacts are unresolved.
2. The candidates' early through-ball motion is brisker than the centre of the camera-corrected source estimate. The source's missing launch phase prevents exact kick-to-kick alignment.
3. Candidate late speed dies more sharply than the last observed source segment, especially B. This eliminates endless runout, but the final weight still needs the owner's 1× choice.

**WHETHER READY TO FREEZE FOR DRIBBLE/RECEIVING INTEGRATION: NO — ready for owner visual selection first.** Architecture and regressions are ready; reference texture and through-weight fit remain partial. Do not begin integration automatically.

## Final status

${Object.entries(statuses).map(([k,v])=>'- '+k+': '+v).join('\n')}
`;
fs.writeFileSync(new URL('README.md',root),text);console.log('report written',text.length);
