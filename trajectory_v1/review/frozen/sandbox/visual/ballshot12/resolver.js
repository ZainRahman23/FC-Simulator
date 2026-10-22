import {resolveShot as previousResolve,scheduledLaunch as previousSchedule,capability} from '../ballshot11/resolver.js';
import {PLAYER,FAMILIES,REFERENCE_RATING,CHIP_RATING_EXPONENT} from './config.js';
export {capability};

function prepare(input={}){
 return {...input,attributes:{...PLAYER,...input.attributes},shotPower:input.shotPower??input.attributes?.shotPower??PLAYER.shotPower};
}
// Reuse the existing validated player/context/contact contract and family spin.
// Recompose only scalar launch speed before the physical world's schedule().
function calibrate(velocity,audit){
 const technique=FAMILIES[audit.family],referenceCapability=capability(REFERENCE_RATING);
 const capabilityRatio=audit.strikeCapability/referenceCapability;
 const ratingExponent=audit.family==='CHIP'?CHIP_RATING_EXPONENT:1;
 const ratingRatio=Math.pow(capabilityRatio,ratingExponent);
 const speed=audit.referenceLacesSpeed*ratingRatio*technique.conversion*audit.commitment*audit.bracketScale*audit.chargeFactor*audit.executionFactor;
 const factor=audit.speed===0?0:speed/audit.speed,v=velocity.map(x=>x*factor);
 return {velocity:v,audit:{...audit,version:'BALL-SHOT-1.2',referenceRating:REFERENCE_RATING,referenceCapability,capabilityRatio,ratingExponent,ratingRatio,
  techniqueConversion:technique.conversion,speed,velocity:v.slice(),horizontalVelocity:[v[0],v[2]],horizontalSpeed:Math.hypot(v[0],v[2]),verticalVelocity:v[1],
  referenceAdjustment:technique.note,
  formula:'speed = 34 × (capability(SP)/capability(90))^ratingExponent × technique conversion × commitment × bracket scale × charge × execution/context; capability and physical solver unchanged'
 }};
}
export function resolveShot(input={}){const r=previousResolve(prepare(input));return {...r,...calibrate(r.velocity,r.audit)};}
export const resolveLaunch=resolveShot;
export function scheduledLaunch(input,contact={}){const a=previousSchedule(prepare(input),contact),r=calibrate(a.velocity,a.metadata);return {...a,velocity:r.velocity,metadata:r.audit};}
