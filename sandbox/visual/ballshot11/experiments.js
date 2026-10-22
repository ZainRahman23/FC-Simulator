import {simulateAction} from '../ballshot1/experiments.js';
import {scheduledLaunch} from './resolver.js';
import {CANDIDATES,SELECTED,FAMILIES} from './config.js';
export {BallWorld,simulateAction,atPlane} from '../ballshot1/experiments.js';
export function simulateShot(intent,options={}){return simulateAction(scheduledLaunch(intent),{duration:intent.family==='CHIP'?6:4,...options});}
export function candidateRun(candidate,options={}){
 const c=typeof candidate==='string'?CANDIDATES.find(x=>x.id===candidate):candidate;if(!c)throw Error('Unknown candidate');
 return {...simulateShot({family:c.family,bracket:c.bracket,actionId:c.id},{id:c.id,title:c.title,target:c.distance,...options}),definition:c};
}
export function longRangeRuns(){return SELECTED.filter(c=>c.family!=='CHIP').flatMap(c=>[25,30].map(distance=>candidateRun({...c,id:`${c.family.toLowerCase()}-${distance}m`,distance,title:`${FAMILIES[c.family].title} · ${distance} m`})));}
export function chipDistanceRun(distance){
 if(!Number.isFinite(distance)||distance<5||distance>30)throw Error('Chip calibration distance outside [5,30] m');
 const id=`chip-${distance}m`,trial=charge=>simulateShot({family:'CHIP',bracket:'very-fast',charge,actionId:id},{id,target:distance,duration:7});let lo=.05,hi=1;
 if(trial(hi).metrics.firstLanding.distance<distance)throw Error('Requested chip exceeds charge envelope');
 for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(trial(mid).metrics.firstLanding.distance<distance)lo=mid;else hi=mid;}
 const r=trial((lo+hi)/2);r.title=`CHIP · ${distance} m charge`;r.definition={id,family:'CHIP',bracket:'very-fast',distance};
 r.metrics.chargeSolve={method:'Offline bisection before launch; fixed 30° and +12 rad/s backspin',targetLandingDistance:distance,error:r.metrics.firstLanding.distance-distance};return r;
}
export function parityPayload(){return CANDIDATES.map(c=>{const r=candidateRun(c);return {id:r.id,frames:r.frames,events:r.events};});}
