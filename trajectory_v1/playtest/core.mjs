import {BallWorld} from './foundation/frozen/sandbox/visual/ballfeel14/world.js';
import {scheduledLaunch,requestedCharge,speedFraction,profileForHold} from './foundation/frozen/sandbox/visual/shotcharge13/resolver.js';
import {launchVector} from './foundation/frozen/sandbox/visual/shotcharge11/resolver.js';
import {GEOMETRY as G} from './foundation/geometry-data.mjs';
import {classifyZone,lockedFinishingRadius} from './foundation/geometry.mjs';
import {dispersion} from './accuracy-candidate.mjs';
import {accuracyDraws} from './foundation/rng.mjs';
export {G,BallWorld,requestedCharge,speedFraction,profileForHold,dispersion};
export const DT=1/60,MAX_SECONDS=12;
export const ZONES={1:{name:'FINISHING ZONE',weights:'100% Finishing',color:'#76e4b4'},3:{name:'MIXED ZONE',weights:'50% Finishing / 50% Long Shots',color:'#f4ce79'},2:{name:'LONG SHOTS ZONE',weights:'100% Long Shots',color:'#9abfff'}};
export function zoneAt(player,ratings){return classifyZone(G,player,lockedFinishingRadius(G),ratings.finishing,ratings.longShots);}
export const rotate=(v,a)=>{a*=Math.PI/180;return [v[0]*Math.cos(a)-v[2]*Math.sin(a),v[1],v[0]*Math.sin(a)+v[2]*Math.cos(a)];};
export function possession(player,aimZ){const yaw=Math.atan2(aimZ-player.z,G.goalX-player.x);return [player.x+.42*Math.cos(yaw)-.16*Math.sin(yaw),G.ballRadius,player.z+.42*Math.sin(yaw)+.16*Math.cos(yaw)];}
export function validateInput(input){
 for(const k of ['finishing','longShots','shotPower'])if(!Number.isFinite(input.ratings[k])||input.ratings[k]<1||input.ratings[k]>99)throw Error('Ratings must be between 1 and 99');
 if(!Number.isFinite(input.holdMs)||input.holdMs<0)throw Error('Hold must be nonnegative');
 if(![input.player.x,input.player.z,input.aimZ].every(Number.isFinite))throw Error('Position and aim must be finite');
 if(input.player.x>104||input.player.x<55||input.player.z<1||input.player.z>67)throw Error('Position is outside the attacking-area sandbox');
 if(!/^\d{1,16}$/.test(String(input.seed)))throw Error('Seed must contain 1–16 digits');
 if(!/^[a-zA-Z0-9:_-]{1,80}$/.test(input.drawEventId))throw Error('Invalid draw event ID');
}
export function planeCross(a,b){if(a.p[0]<G.goalX&&b.p[0]>=G.goalX){const u=(G.goalX-a.p[0])/(b.p[0]-a.p[0]);return {x:G.goalX,y:a.p[1]+u*(b.p[1]-a.p[1]),z:a.p[2]+u*(b.p[2]-a.p[2]),time:a.time+u*(b.time-a.time)};}return null;}
export function createFlight(action){
 const world=new BallWorld({p:action.position.slice(),v:[0,0,0],w:[0,0,0],q:[0,0,0,1],dt:DT,substeps:4,colliders:[]});
 const flight={world,frames:[world.snapshot()],plane:null,done:false,reason:null};let prev=flight.frames[0];
 world.schedule(action);world.onSubstep=f=>{if(!flight.plane)flight.plane=planeCross(prev,f);flight.frames.push(f);prev=f;};
 return flight;
}
export function advanceFlight(flight){if(flight.done)return;flight.world.step();const w=flight.world;
 if(flight.plane&&w.time>=flight.plane.time+.4){flight.done=true;flight.reason='plane-crossed';}
 else if(w.ball.sleeping){flight.done=true;flight.reason='rest-before-plane';}
 else if(w.time>=MAX_SECONDS){flight.done=true;flight.reason='observation-limit';}
 return flight;
}
export function summarizeFlight(f){return {frames:f.frames,plane:f.plane,reason:f.reason,duration:f.world.time,apex:Math.max(...f.frames.map(x=>x.p[1])),lastPosition:f.world.ball.p.slice(),launchCount:f.world.events.filter(e=>e.kind==='AUTHORITATIVE_LAUNCH').length,turfContacts:f.world.events.filter(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf').length};}
export function simulateFlight(action){const f=createFlight(action);while(!f.done)advanceFlight(f);return summarizeFlight(f);}
export async function prepareShot(input){
 validateInput(input);const started=performance.now(),origin=possession(input.player,input.aimZ),yaw=Math.atan2(input.aimZ-origin[2],G.goalX-origin[0])*180/Math.PI;
 // Resolve in the canonical frame, then rotate velocity AND spin together. This
 // preserves the exact approved Laces solve beyond its legacy ±75° aim guard.
 const a=scheduledLaunch({family:'LACES',shotPower:input.ratings.shotPower,holdMs:input.holdMs,actionId:input.shotId,aim:{yawDeg:0},attributes:{preferredFoot:'R'},context:{selectedFoot:'R',pressure:0,stamina:1,energy:1,bodySetup:1,executionQuality:1,startingVelocity:[0,0,0]}},{position:origin});
 const idealAction={...a,id:input.shotId+':ideal',tick:0,velocity:rotate(a.velocity,yaw),spin:rotate(a.spin,yaw)};
 const z=zoneAt(input.player,input.ratings),fraction=a.metadata.speed/a.metadata.capabilityCeiling,ds=dispersion(z.effectiveAccuracy,fraction,input.accuracyCurve??'current'),draws=await accuracyDraws({matchSeed:input.seed,shooterId:'calibration-player',stableShotEventId:input.drawEventId});
 const errorH=ds.sigmaH*draws.standardizedHorizontal,errorV=ds.sigmaV*draws.standardizedElevation;
 const actualAction={...idealAction,id:input.shotId,velocity:launchVector(a.metadata.speed,a.metadata.launchAngleDeg+errorV,yaw+errorH),spin:idealAction.spin.slice()};
 const audit={version:'SHOT-ACCURACY-PLAYTEST-1',accuracyCurve:input.accuracyCurve??'current',input:structuredClone(input),shooterPosition:[input.player.x,0,input.player.z],ballPosition:origin.slice(),startingVelocity:[0,0,0],startingSpin:[0,0,0],startingOrientation:[0,0,0,1],zone:z,dispersion:ds,draws,errorH,errorV,yaw,idealElevation:a.metadata.launchAngleDeg,actualElevation:a.metadata.launchAngleDeg+errorV,requestedSpeed:a.metadata.speed,capabilityCeiling:a.metadata.capabilityCeiling,speedFraction:fraction,requestedApex:a.metadata.trajectoryProfile.desiredApex,distance:Math.hypot(G.goalX-input.player.x,input.player.z-G.goalCentreZ),idealLaunch:{velocity:idealAction.velocity,spin:idealAction.spin},actualLaunch:{velocity:actualAction.velocity,spin:actualAction.spin},charge:a.metadata};
 const ideal=simulateFlight(idealAction);
 return {idealAction,actualAction,ideal,audit,prepareMs:performance.now()-started};
}
export function difference(ideal,actual){if(!ideal||!actual)return null;const horizontal=(actual.z-ideal.z)*100,vertical=(actual.y-ideal.y)*100;return {horizontal,vertical,total:Math.hypot(horizontal,vertical)};}
