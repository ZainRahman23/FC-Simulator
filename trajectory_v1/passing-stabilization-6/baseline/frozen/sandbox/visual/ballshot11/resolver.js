import {resolveShot as baseResolve,scheduledLaunch as baseSchedule} from '../ballshot1/resolver.js';
import {FAMILIES as OLD,BRACKETS} from '../ballshot1/config.js';
import {FAMILIES} from './config.js';
export {capability} from '../ballshot1/resolver.js';

function prepare(input){
 const family=FAMILIES[input.family];
 if(!family)throw Error('Unknown shot family');
 return {...input,aim:{...input.aim,elevationDeg:input.aim?.elevationDeg??family.angleDeg}};
}
// This transforms a resolved launch before schedule(), never a flying ball.
// All validation, player attributes, context factors and contact eligibility
// continue to use the preserved resolver contract.
function transform(velocity,audit){
 const family=FAMILIES[audit.family],old=OLD[audit.family],index=BRACKETS.indexOf(audit.bracket);
 const factor=family.speeds[index]/old.speeds[index],v=velocity.map(x=>x*factor);
 return {velocity:v,audit:{...audit,version:'BALL-SHOT-1.1',velocity:v.slice(),speed:Math.hypot(...v),horizontalVelocity:[v[0],v[2]],horizontalSpeed:Math.hypot(v[0],v[2]),verticalVelocity:v[1],techniqueConversion:family.conversion,bracketScale:family.bracketScale[index],referenceAdjustment:family.note}};
}
export function resolveShot(input={}){
 const r=baseResolve(prepare(input)),t=transform(r.velocity,r.audit);
 return {...r,...t};
}
export const resolveLaunch=resolveShot;
export function scheduledLaunch(input,contact={}){
 const action=baseSchedule(prepare(input),contact),t=transform(action.velocity,action.metadata);
 return {...action,velocity:t.velocity,metadata:t.audit};
}
