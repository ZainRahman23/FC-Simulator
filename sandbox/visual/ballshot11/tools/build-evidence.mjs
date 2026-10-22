import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {PLAYER,CONTEXT,CANDIDATES,SELECTED,FAMILY_ORDER,SHOT_POWER_PROJECTIONS} from '../config.js';
import {resolveShot,capability} from '../resolver.js';
import {candidateRun,longRangeRuns,chipDistanceRun,parityPayload,simulateShot} from '../experiments.js';
import {parityPayload as groundParity} from '../../ballfeel14/experiments.js';
import {parityPayload as oldShotParity} from '../../ballshot1/experiments.js';
const root=fileURLToPath(new URL('..',import.meta.url)),repo=path.resolve(root,'../../..'),out=path.join(root,'evidence'),base='d5790bf4565c07698e54ac4340906030a5484ca1';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p)),write=(n,x)=>fs.writeFileSync(path.join(out,n+'.json'),JSON.stringify(x,null,2)+'\n');
fs.mkdirSync(out,{recursive:true});
const old=read(path.join(root,'../ballshot1/evidence/review.json')),candidates=CANDIDATES.map(c=>candidateRun(c));
const previous=old.candidates.filter(c=>old.selected.includes(c.id)).map(c=>({...c,id:'previous-'+c.id,title:c.definition.family+' · PREVIOUS',definition:{...c.definition,bracket:'previous'}}));
const headroom=SHOT_POWER_PROJECTIONS.map(shotPower=>({shotPower,ratioTo80:capability(shotPower)/capability(80),speeds:Object.fromEntries(FAMILY_ORDER.map(f=>[f,resolveShot({family:f,shotPower}).audit.speed])),flights:Object.fromEntries(FAMILY_ORDER.map(f=>{const m=simulateShot({family:f,shotPower}).metrics;return [f,{goalPlane:m.goalPlane,apex:m.apex,firstLanding:m.firstLanding}];}))}));
const convergence=SELECTED.map(c=>{const a=candidates.find(r=>r.id===c.id).metrics,b=candidateRun(c,{substeps:8}).metrics;return {id:c.id,goalTimeError:Math.abs(a.goalPlane.time-b.goalPlane.time),goalSpeedError:Math.abs(a.goalPlane.speed-b.goalPlane.speed),goalHeightError:Math.abs(a.goalPlane.height-b.goalPlane.height),landingDistanceError:Math.abs(a.firstLanding.distance-b.firstLanding.distance)};});
const files=execFileSync('git',['ls-tree','-r','--name-only',base,'sandbox/visual'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(f=>/^sandbox\/visual\/ball(?:phys|feel|shot1\/)/.test(f));
const preserved=files.map(file=>{const a=execFileSync('git',['show',base+':'+file],{cwd:repo,maxBuffer:128e6}),b=fs.readFileSync(path.join(repo,file));return {file,bytes:b.length,baseSha256:hash(a),sha256:hash(b),exact:a.equals(b)};});
write('preservation',{base,allExact:preserved.every(p=>p.exact),files:preserved});
const stream=fn=>{const raw=JSON.stringify(fn());return {hash:hash(raw),bytes:Buffer.byteLength(raw)};};
const parity={...stream(parityPayload),runs:15},groundRegression={...stream(groundParity)},previousShotRegression={...stream(oldShotParity)};
groundRegression.exact=groundRegression.hash===old.groundRegression.hash;previousShotRegression.exact=previousShotRegression.hash===old.parity.hash;
const sources=read(path.join(root,'references/sources.json'));
const references=[
 {...sources[3],family:'CHIP',label:'Chip',labelConfirmed:false,usable:'Clear launch, loft and goalkeeper interaction.',observed:'Ball leaves boot around 0.75–0.80 s; clear upward arc then descent toward the keeper around 1.9–2.0 s. Subsequent movement is affected by the keeper.',limits:'Shorter in-box distance, moving camera and unknown playback speed. This is a shape/feel reference, not a measured 19 m speed target.',change:'17 m/s at 30° replaces 16 m/s at 36°; backspin stays +12 rad/s. Quicker flight and lower apex at the common 19 m setup.'},
 {...sources[2],family:'INSIDE',label:'Finesse / Inside (working label)',labelConfirmed:false,usable:'A complete short rising strike, followed by a crossfade.',observed:'Contact near the beginning; the ball rises past the keeper and enters the goal region around 0.4–0.5 s. Ignore the later crossfade.',limits:'Technique label needs confirmation. Perspective, distance and source playback are not calibrated.',change:'Keep 30 m/s; lift increases from 10° to 11.5°. Existing inside spin and curve law stay fixed.'},
 {...sources[1],family:'POWER',label:'Power (working label)',labelConfirmed:false,usable:'A hard shot from around the edge of the area in the middle example.',observed:'Middle shot contact around 3.1–3.2 s; ball reaches the goal region around 3.6–3.7 s. Opening and closing shots are edited examples.',limits:'Technique label needs confirmation; edits and camera motion prevent reliable world-speed fitting.',change:'Keep strongest 39 m/s and 0.65 s preparation; elevation rises from 7° to 10° for a rising drive.'},
 {...sources[0],family:'OUTSIDE',label:'Trivela / Outside (working label)',labelConfirmed:false,usable:'End-state appearance only.',observed:'Ball is already airborne and the scene is essentially held; a pause indicator appears. No launch-to-arrival interval is visible.',limits:'Insufficient motion to calibrate speed, spin, bend or timing. No inferred m/s or spin values are attributed to this recording.',change:'Retain 32 m/s, 11°, +60 rad/s sidespin and existing aim. Do not retune from a paused end-state.'}
];
const review={version:'BALL-SHOT-1.1',frozenCommit:base,player:PLAYER,context:CONTEXT,candidates,selected:SELECTED.map(c=>c.id),previous,references,longRange:longRangeRuns(),chips:[10,15,20,25].map(chipDistanceRun),headroom,convergence,parity,groundRegression,previousShotRegression,actionWeights:FAMILY_ORDER.map(family=>({family,shotPower:80,weights:[.35,.65,1].map(charge=>({charge,speed:resolveShot({family,charge}).audit.speed}))})),notes:{mapping:'Working content-based mapping; owner confirmation pending. The user named four techniques without a file-to-technique mapping.',scope:'Reference-guided launch candidates; no metric reconstruction, force-law change, curve tuning, goalkeeper or match integration.',powerOrder:'At equal rating, bracket, charge and execution: Power > Normal/Laces > Trivela > Finesse > Chip.',comparison:'The five-family view uses revised candidates. References & before/after shows each supplied recording beside the previous and revised FAST trajectories.'}};
write('review',review);
const summary=r=>({id:r.id,title:r.title,target:r.target,definition:r.definition,launch:r.action.metadata,metrics:r.metrics,stats:r.stats});
write('measurements',{...review,candidates:candidates.map(summary),selected:candidates.filter(c=>review.selected.includes(c.id)).map(summary),previous:previous.map(summary),longRange:review.longRange.map(summary),chips:review.chips.map(summary),preservation:{base,files:preserved.length,allExact:preserved.every(p=>p.exact)}});
write('references',{sources,references,mappingConfirmed:false});
console.log(JSON.stringify({preserved:preserved.length,allExact:preserved.every(p=>p.exact),parity,groundRegression,previousShotRegression},null,2));
