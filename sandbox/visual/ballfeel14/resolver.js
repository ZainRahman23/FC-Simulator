import {resolveLaunch as base,resolveExecution as baseExecution,fromLegacyDecision as legacy} from '../ballfeel11/resolver.js';
import {resolveLaunch as frozen} from '../ballfeel13/resolver.js';
import {NORMAL,FIRM,DRIVEN,SHOTS} from '../ballfeel13/config.js';
import {FAMILIES,GLOBAL,TURF} from './config.js';
const unit=(x,name)=>{if(!Number.isFinite(x)||x<0||x>1)throw Error(name+' must be in [0,1]');return x;};
export function resolveExecution(input){return baseExecution({...input,family:input.family==='through'?'ground':input.family});}
export function fromLegacyDecision(decision,options){const intent=legacy(decision,options);if(decision.action==='PASS'&&decision.family==='THROUGH')intent.family='through';return intent;}
export function resolveLaunch(intent,{variant='A'}={}){
 if(!TURF[variant])throw Error('Unknown turf calibration');
 if(variant==='current'){
  const family=intent.family==='through'?'firm':intent.family;
  const c=({ground:NORMAL[2],firm:FIRM[2],driven:DRIVEN[3],power:SHOTS[1]})[family];
  return frozen({...intent,family},c?{turfCandidate:c}:{});
 }
 if(!['ground','short','through','firm','driven'].includes(intent.family)){
  // Explicit low-shot option; ordinary aerial/curve launch remains frozen.
  if(intent.lowShot&&intent.family==='power')return frozen(intent,{turfCandidate:SHOTS[1]});
  return frozen(intent);
 }
 // Passing affects bounded launch error through execution quality, once upstream.
 // No attributes enter the world. A normalized passing value is accepted as a
 // quality multiplier when a caller supplies an explicit seeded execution input.
 let execution=intent.execution??{quality:1};
 if(intent.seed!==undefined){
  if(intent.execution!==undefined)throw Error('Supply seeded execution OR resolved execution, not both');
  const quality=unit(intent.quality??1,'quality')*unit(intent.passing??1,'passing');
  execution=resolveExecution({seed:intent.seed,actionId:intent.actionId,quality,pressure:intent.pressure??0,family:intent.family,distance:intent.distance??FAMILIES[intent.family].distance});
 }
 const p=(intent.power??.5)*(intent.attainablePower??1);
 const families={...FAMILIES,through:{...FAMILIES.through,arrival:variant==='B'?[3.5,6.5]:FAMILIES.through.arrival},driven:{...FAMILIES.driven,horizontal:[27,39],rollingFraction:.20}};
 const launch=base({...intent,distance:intent.distance??families[intent.family].distance,technique:intent.technique??families[intent.family].technique,execution},GLOBAL,families,TURF[variant]);
 const speed=Math.hypot(launch.velocity[0],launch.velocity[2]);
 // Continuous launch texture: a layoff has less lift than a longer/faster pass.
 // This is a one-time launch choice. Every subsequent hop is a real turf impulse.
 const strength=Math.max(0,Math.min(1,(speed-7)/20));
 const k=intent.family==='through'?.75:intent.family==='firm'?1.1:1;
 const texture=(variant==='A'?.65:.85)+strength*(variant==='A'?.9:1.1);
 const distanceScale=['ground','short'].includes(intent.family)?Math.max(.4,Math.min(1.3,Math.sqrt((intent.distance??families[intent.family].distance)/13))):1;
 const lift=intent.lift??(intent.family==='driven'?1.3+.6*p:k*texture*distanceScale);
 const vy=Math.max(0,lift+(execution.liftMps??0));
 if(!Number.isFinite(vy)||vy>14)throw Error('Lift exceeds V1 envelope');
 launch.velocity[1]=vy;
 const fraction=intent.family==='driven'?.20:intent.family==='firm'?.78:intent.family==='through'?.90:.96;
 if(intent.spinOverride===undefined){const f=fraction*(1+(execution.spinFraction??0));launch.spin=[launch.velocity[2]*f/GLOBAL.radius,launch.spin[1],-launch.velocity[0]*f/GLOBAL.radius];}
 launch.audit={...launch.audit,version:'BALL-FEEL-1.4',family:intent.family,variant,liftMps:vy,rollingFraction:fraction,spin:launch.spin.slice(),execution:structuredClone(execution),environment:{...launch.audit.environment,rollingLaw:TURF[variant]},formula:'Launch-only distance/arrival solve; continuous speed-dependent lift and action spin. Shared physical turf thereafter.'};
 return launch;
}
export function scheduledLaunch(intent,selection={},contact={}){const r=resolveLaunch(intent,selection);return {id:intent.actionId,tick:contact.tick??0,position:(contact.position??[0,.11,0]).slice(),preparedAt:contact.preparedAt??0,colliderId:contact.colliderId,velocity:r.velocity,spin:r.spin,metadata:r.audit};}
