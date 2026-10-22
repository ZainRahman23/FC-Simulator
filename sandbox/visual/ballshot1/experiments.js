import {BallWorld} from '../ballfeel14/world.js';
import {scheduledLaunch} from './resolver.js';
import {CANDIDATES,SELECTED,FAMILIES} from './config.js';
export {BallWorld};
const horizontal=v=>Math.hypot(v[0],v[2]);
export function atPlane(frames,x,events=[]){
 // Split read-only measurement segments at exact physical contact times so a
 // near-plane bounce never blends pre-impact and post-impact velocities.
 if(events.length){const inserted=[];for(const e of events.filter(e=>e.kind==='PHYSICAL_CONTACT')){const p=e.point.map((v,j)=>v+.11*e.normal[j]),pre=e.velocity.map((v,j)=>v-e.impulse[j]/.43),r=e.normal.map(v=>-.11*v),J=e.impulse,cross=[r[1]*J[2]-r[2]*J[1],r[2]*J[0]-r[0]*J[2],r[0]*J[1]-r[1]*J[0]],I=(2/3)*.43*.11*.11,preSpin=e.spin.map((v,j)=>v-cross[j]/I);inserted.push({time:e.time,p,v:pre,w:preSpin,mode:'AIRBORNE'},{time:e.time,p,v:e.velocity,w:e.spin,mode:'AIRBORNE'});}frames=[...frames,...inserted].sort((a,b)=>a.time-b.time);}
 const i=frames.findIndex((f,i)=>i>0&&frames[i-1].p[0]<x&&f.p[0]>=x);if(i<0)return null;
 const a=frames[i-1],b=frames[i],u=(x-a.p[0])/(b.p[0]-a.p[0]),mix=(a,b)=>a+(b-a)*u,p=a.p.map((v,j)=>mix(v,b.p[j])),v=a.v.map((v,j)=>mix(v,b.v[j])),w=a.w.map((v,j)=>mix(v,b.w[j]));
 return {distance:x,time:mix(a.time,b.time),position:p,height:p[1],clearance:Math.max(0,p[1]-.11),z:p[2],velocity:v,speed:Math.hypot(...v),horizontalSpeed:horizontal(v),verticalVelocity:v[1],spin:w,mode:b.mode,insideGoalMouth:Math.abs(p[2])<=3.55&&p[1]>=.11&&p[1]<=2.33};
}
// This is an observer, not a world subclass. Only schedule() and step() can
// change the physical state, using the exact imported Candidate A BallWorld.
export function simulateAction(action,{id=action.id,title=id,target=19,duration=4,colliders=[],substeps=4}={}){
 const world=new BallWorld({colliders,substeps}),frames=[world.snapshot()];world.schedule(action);world.onSubstep=f=>frames.push(f);
 for(let i=0;i<Math.ceil(duration*60);i++)world.step();
 const launch=world.events.find(e=>e.kind==='AUTHORITATIVE_LAUNCH'),firstLandingEvent=world.events.find(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf'&&e.time>(launch?.time??0));
 const flight=frames.filter(f=>f.time<=(firstLandingEvent?.time??Infinity)),apexFrame=flight.reduce((a,b)=>b.p[1]>a.p[1]?b:a,flight[0]);
 const planes=Object.fromEntries([...new Set([5,10,15,19,20,25,30,target])].map(x=>[x,atPlane(frames,x,world.events)]));
 for(const p of Object.values(planes))if(p)p.beforeFirstLanding=!firstLandingEvent||p.time<=firstLandingEvent.time;
 const firstLanding=firstLandingEvent?{time:firstLandingEvent.time,distance:firstLandingEvent.point[0],lateral:firstLandingEvent.point[2],position:firstLandingEvent.point.slice(),speedAfter:Math.hypot(...firstLandingEvent.velocity),velocityAfter:firstLandingEvent.velocity,spinAfter:firstLandingEvent.spin}:null;
 const metrics={launch:action.metadata,goalPlane:planes[target],planes,apex:apexFrame.p[1]-.11,apexHeight:apexFrame.p[1],apexTime:apexFrame.time,apexPosition:apexFrame.p.slice(),firstLanding,launchCount:world.events.filter(e=>e.kind==='AUTHORITATIVE_LAUNCH').length,diagnosticPlane:'Free flight: goal is reference geometry, never attraction or steering',heightConvention:'height = ball centre above turf; clearance/apex = ball bottom above turf',maximumSpeed:Math.max(...frames.map(f=>Math.hypot(...f.v))),frozenCurveLaw:world.curveLaw};
 return {id,title,target,duration,action,initial:{p:[0,.11,0]},colliders,frames,events:world.events,metrics,stats:world.stats};
}
export function simulateShot(intent,options={}){return simulateAction(scheduledLaunch(intent),{duration:intent.family==='CHIP'?6:4,...options});}
export function candidateRun(candidate,options={}){const c=typeof candidate==='string'?CANDIDATES.find(x=>x.id===candidate):candidate;if(!c)throw Error('Unknown candidate');return {...simulateShot({family:c.family,bracket:c.bracket,actionId:c.id},{id:c.id,title:c.title,target:c.distance,...options}),definition:c};}
// Offline deterministic charge solve. It simulates unmodified Candidate A
// trajectories before committing one velocity/spin pair. No in-flight control.
export function chipDistanceRun(distance){
 if(!Number.isFinite(distance)||distance<5||distance>30)throw Error('Chip calibration distance outside [5,30] m');
 const family='CHIP',bracket='very-fast',id=`chip-${distance}m`;let lo=.05,hi=1;
 const trial=charge=>simulateShot({family,bracket,charge,actionId:id},{target:distance,duration:7});
 const ceiling=trial(hi);if(!ceiling.metrics.firstLanding||ceiling.metrics.firstLanding.distance<distance)throw Error('Requested chip exceeds charge envelope');
 for(let i=0;i<32;i++){const mid=(lo+hi)/2,r=trial(mid);if((r.metrics.firstLanding?.distance??Infinity)<distance)lo=mid;else hi=mid;}
 const run=trial((lo+hi)/2);run.title=`CHIP · ${distance} m charge`;run.definition={id,family,bracket,distance,charge:run.action.metadata.context.charge,aim:FAMILIES.CHIP.angleDeg};run.metrics.chargeSolve={method:'32-step offline bisection over first physical turf contact; fixed 36° aim / +12 rad/s backspin',targetLandingDistance:distance,error:run.metrics.firstLanding.distance-distance};return run;
}
export function longRangeRuns(){return SELECTED.filter(c=>c.family!=='CHIP').flatMap(c=>[25,30].map(distance=>candidateRun({...c,id:`${c.family.toLowerCase()}-${distance}m`,distance,title:`${FAMILIES[c.family].title} · ${distance} m`})));}
export function parityPayload(){return CANDIDATES.map(c=>{const r=candidateRun(c);return {id:r.id,frames:r.frames,events:r.events};});}
