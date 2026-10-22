import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {allRuns,simulateShot} from '../experiments.js';
import {requestedCharge,resolveShot} from '../resolver.js';
import {VERSION,SETUP,FORMULA,RATINGS,HOLDS} from '../config.js';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../evidence');
fs.mkdirSync(dir,{recursive:true});
const save=(name,data,pretty=true)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,pretty?2:undefined)+'\n');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function physicalPayload(run){return {velocity:run.action.velocity,spin:run.action.spin,position:run.action.position,frames:run.frames,events:run.events.map(({id,metadata,...event})=>event),stats:run.stats};}
const runs=allRuns();
for(const r of runs)r.physicalSha256=hash(physicalPayload(r));
save('review.json',{version:VERSION,setup:SETUP,formula:FORMULA,ratings:RATINGS,holds:HOLDS,defaultRun:'sp80-hold350',runs},false);
const rows=runs.map(r=>{const m=r.metrics;return {id:r.id,holdMs:r.holdMs,normalizedCharge:m.normalizedCharge,shotPower:r.shotPower,capabilityCeiling:m.capabilityCeiling,speedFraction:m.launch.requestedSpeedFraction,launchSpeed:m.launchSpeed,horizontalSpeed:m.horizontalSpeed,verticalVelocity:m.verticalVelocity,launchAngleDeg:m.launchAngleDeg,timeTo10m:m.timeTo10m,timeToGoalPlane:m.timeToGoalPlane,speedAtGoalPlane:m.speedAtGoalPlane,horizontalSpeedAtGoalPlane:m.horizontalSpeedAtGoalPlane,verticalVelocityAtGoalPlane:m.verticalVelocityAtGoalPlane,heightAt5m:m.planes[5]?.height??null,heightAt10m:m.planes[10]?.height??null,heightAt15m:m.planes[15]?.height??null,heightAtGoalPlane:m.goalPlane?.height??null,goalBeforeFirstLanding:m.goalPlane?.beforeFirstLanding??null,goalInsideMouth:m.goalPlane?.insideGoalMouth??null,firstFlightApexCentre:m.apexHeight,firstFlightApexClearance:m.apex,firstFlightApexTime:m.apexTime,firstLandingTime:m.firstLanding?.time??null,firstLandingDistance:m.firstLanding?.distance??null,usefulRange:m.range.useful.distance,usefulTime:m.range.useful.time,usefulRangeCensored:m.range.useful.censored,stoppingRange:m.range.stopping.distance,stoppingTime:m.range.stopping.time,stoppingRangeCensored:m.range.stopping.censored,physicalSha256:r.physicalSha256};});
save('measurements.json',{version:VERSION,setup:SETUP,formula:FORMULA,measurementPolicy:{height:'centre above turf unless explicitly labelled clearance',apex:'First flight only: launch to first turf impact, sampled at 240 Hz.',usefulRange:'First total-speed drop below 3 m/s sustained for 0.25s.',stoppingRange:'First frozen-world sleep. Censored results are lower bounds at max120s.',missingPlane:'null means ball never reached that forward plane before physical sleep or simulation end.'},rows});
save('clamp.json',{definition:'SHA-256 over launch vectors/contact position, all native state frames, all physical events excluding audit-only id and metadata, and physics statistics. Hold/id labels intentionally excluded.',pairs:RATINGS.map(shotPower=>{const a=runs.find(r=>r.shotPower===shotPower&&r.holdMs===600),b=runs.find(r=>r.shotPower===shotPower&&r.holdMs===800);return {shotPower,hold600:a.physicalSha256,hold800:b.physicalSha256,identical:a.physicalSha256===b.physicalSha256,frameCount:a.frames.length};})});
const invalid=[['undefined',undefined],['null',null],['string','350'],['negative',-1],['NaN',NaN],['Infinity',Infinity]].map(([label,holdMs])=>{try{resolveShot({holdMs,shotPower:80});return {label,rejected:false};}catch(e){return {label,rejected:true,reason:e.message};}});
save('input-characterization.json',{registrationHypothesis:FORMULA.registration,belowThreshold:[0,20,79,79.999999].map(holdMs=>({...requestedCharge(holdMs),action:resolveShot({holdMs,shotPower:80}).velocity})),invalid,atThreshold:resolveShot({holdMs:80,shotPower:80}).audit,at500ms:resolveShot({holdMs:500,shotPower:80}).audit,notes:['A zero requested q at the valid 80ms boundary means a 40% shot, not zero speed. A hold of zero is unregistered.','The registration gate is intentionally discrete. Once registered, both output functions are continuous; no ground/air mode is requested.','No existing controller threshold, animation delay, input buffering or perceived feel is claimed.']});
const continuity=[];
for(const shotPower of [50,80,99])for(const centreHold of [80,250,350,450,600]){
 const holds=centreHold===80?[80,80.001,81]:[centreHold-.5,centreHold,centreHold+.5];
 const values=holds.map(holdMs=>{const m=simulateShot({shotPower,holdMs}).metrics;return {holdMs,launchSpeed:m.launchSpeed,angle:m.launchAngleDeg,apex:m.apex,landingTime:m.firstLanding.time,landingDistance:m.firstLanding.distance,stoppingDistance:m.range.stopping.distance};});
 continuity.push({shotPower,centreHold,values});
}
save('continuity.json',{purpose:'Focused physical observations around registered floor and representative useful/full timings; no candidate tuning sweep.',registration:'No-shot/shot gate is intentionally discrete at80ms. All probes here are registered.',rows:continuity});
console.log(JSON.stringify({runs:runs.length,reviewBytes:fs.statSync(path.join(dir,'review.json')).size,allSleep:runs.every(r=>!r.metrics.range.stopping.censored),longestSeconds:Math.max(...runs.map(r=>r.duration)),floorSpeedRange:[Math.min(...rows.filter(r=>r.holdMs===80).map(r=>r.launchSpeed)),Math.max(...rows.filter(r=>r.holdMs===80).map(r=>r.launchSpeed))]}));
