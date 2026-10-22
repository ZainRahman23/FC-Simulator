import {resolveShot as approvedResolve,scheduledLaunch as approvedSchedule,trajectoryProfile,solveVertical,requestedCharge,speedFraction} from '../shotcharge11/resolver.js';
import {VERSION,SETUP,DEFAULT_PROFILE,OVERCHARGE,FORMULA} from './config.js';
export {requestedCharge,speedFraction};
export function profileForHold(holdMs){
 const {q}=requestedCharge(holdMs),profile=trajectoryProfile(q,DEFAULT_PROFILE);
 if(holdMs<=OVERCHARGE.startMs)return profile;
 const x=(holdMs-OVERCHARGE.startMs)/OVERCHARGE.scaleMs;
 return {...profile,desiredApex:profile.maximumApex+OVERCHARGE.extraApexLimit*(-Math.expm1(-(x**OVERCHARGE.power))),overcharged:true,overchargeHoldMs:holdMs-OVERCHARGE.startMs,asymptoticApex:profile.maximumApex+OVERCHARGE.extraApexLimit};
}
function transform(base,input,position){
 if(!base.registered||input.holdMs<=OVERCHARGE.startMs)return base; // Preserve the approved launch bit for bit.
 const profile=profileForHold(input.holdMs),solution=solveVertical({speed:base.audit.speed,spin:base.spin,profile,position,yawDeg:input.aim?.yawDeg??SETUP.yawDeg}),velocity=solution.velocity;
 return {...base,velocity,audit:{...base.audit,version:VERSION,foundationVersion:'SHOT-CHARGE-1.1 / BALL-SHOT-1.2',aim:{...base.audit.aim,elevationDeg:solution.angleDeg},launchAngleDeg:solution.angleDeg,velocity:velocity.slice(),horizontalVelocity:[velocity[0],velocity[2]],horizontalSpeed:Math.hypot(velocity[0],velocity[2]),verticalVelocity:velocity[1],trajectoryProfile:profile,verticalSolve:solution,chargeFormula:FORMULA,formula:'Frozen charge speed; smooth overcharge apex request; the unchanged pre-contact solver sets initial elevation only'}};
}
function validate(input){if(input.trajectoryProfile!==undefined)throw Error('The owner-selected trajectory anchors are fixed in SHOT-CHARGE-1.2');}
export function resolveShot(input={}){validate(input);return transform(approvedResolve(input),input,SETUP.origin);}
export const resolveLaunch=resolveShot;
export function scheduledLaunch(input={},contact={}){
 validate(input);const base=approvedSchedule(input,contact);if(!base)return null;
 if(input.holdMs<=OVERCHARGE.startMs)return base;
 const resolved=transform({registered:true,velocity:base.velocity,spin:base.spin,audit:base.metadata},input,base.position);
 return {...base,velocity:resolved.velocity,spin:resolved.spin,metadata:resolved.audit};
}
