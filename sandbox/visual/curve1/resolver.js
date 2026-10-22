import {resolveShot as frozenResolve,scheduledLaunch as frozenSchedule} from '../ballshot12/resolver.js';
import {EXPONENT,SPIN_AT_75} from './config.js';
export function curveCapability(rating){
 if(!Number.isFinite(rating)||rating<0||rating>99)throw Error('curve must be in [0,99]');
 return (rating/75)**EXPONENT;
}
function prepare(input){
 const rating=input.attributes?.curve??50;
 curveCapability(rating);
 // The frozen resolver validates its then-unused Curve field as 1–99. A
 // validation-only placeholder permits zero; restore the real value in audit.
 // No other player field, context, speed, aim or family behavior is replaced.
 return {rating,input:{...input,attributes:{...input.attributes,curve:rating===0?1:rating}}};
}
function applyCurve(spin,audit,rating){
 const attributes={...audit.attributes,curve:rating};
 if(audit.family!=='INSIDE')return {spin,audit:{...audit,attributes}};
 const capability=curveCapability(rating),handed=audit.context.selectedFoot==='R'?1:-1;
 const execution=audit.executionFactor*audit.chargeFactor;
 const intentionalSideSpin=capability===0||execution===0?0:-handed*SPIN_AT_75*capability*execution;
 const angularVelocity=[spin[0],intentionalSideSpin,spin[2]],spinMagnitude=Math.hypot(...angularVelocity);
 return {spin:angularVelocity,audit:{...audit,version:'CURVE-1',attributes,
  frozenEnvironment:'BALL-FEEL-1.4 Candidate A contacts/drag/turf; separately authorized ordinary continuous-Magnus Finesse candidate',
  angularVelocity,spin:angularVelocity,spinMagnitude,spinAxis:spinMagnitude?angularVelocity.map(v=>v/spinMagnitude):[0,0,0],
  neutralAttributesReserved:audit.neutralAttributesReserved.filter(k=>k!=='curve'),
  curve:{rating,capability,exponent:EXPONENT,referenceRating:75,referenceSpin:SPIN_AT_75,execution,intentionalSideSpin,incidentalSideSpin:0,
   formula:`intentional sidespin = foot sign × ${SPIN_AT_75} rad/s × (Curve/75)^2.7 × existing execution factor × charge`,
   calibrationStatus:'candidate for owner review; unopposed trajectory selected before keeper tests',postLaunchControl:false}
 }};
}
export function resolveShot(input={}){const p=prepare(input),r=frozenResolve(p.input),c=applyCurve(r.spin,r.audit,p.rating);return {...r,...c};}
export function scheduledLaunch(input={},contact={}){const p=prepare(input),r=frozenSchedule(p.input,contact),c=applyCurve(r.spin,r.metadata,p.rating);return {...r,spin:c.spin,metadata:c.audit};}
