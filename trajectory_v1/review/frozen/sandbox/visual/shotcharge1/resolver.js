import {resolveShot as frozenResolve,scheduledLaunch as frozenSchedule} from '../ballshot12/resolver.js';
import {VERSION,CHARGE,SETUP,FORMULA} from './config.js';
export function requestedCharge(holdMs){
 if(!Number.isFinite(holdMs)||holdMs<0)throw Error('holdMs must be a finite nonnegative number');
 return {registered:holdMs>=CHARGE.minimumHoldMs,holdMs,q:Math.max(0,Math.min(1,(holdMs-CHARGE.minimumHoldMs)/(CHARGE.fullHoldMs-CHARGE.minimumHoldMs)))};
}
export function speedFraction(q){if(!Number.isFinite(q)||q<0||q>1)throw Error('q must be in [0,1]');return CHARGE.floorFraction+(1-CHARGE.floorFraction)*(1-(1-q)**2);}
export function chargeElevation(q){if(!Number.isFinite(q)||q<0||q>1)throw Error('q must be in [0,1]');return CHARGE.minimumAngleDeg+(CHARGE.maximumAngleDeg-CHARGE.minimumAngleDeg)*q**3*(4-3*q);}
function prepare(input){
 if((input.family??'LACES')!=='LACES')throw Error('SHOT-CHARGE-1 supports LACES only');
 if(input.charge!==undefined||input.context?.charge!==undefined)throw Error('Use holdMs; direct charge is not a SHOT-CHARGE-1 input');
 if(input.bracket!==undefined&&input.bracket!=='fast')throw Error('Only the frozen clean fast LACES capability is supported');
 if(input.aim?.elevationDeg!==undefined)throw Error('V1 elevation is resolved from holdMs');
 const requested=requestedCharge(input.holdMs),f=speedFraction(requested.q),angle=chargeElevation(requested.q);
 const intent={...input,family:'LACES',bracket:'fast',charge:1,aim:{yawDeg:input.aim?.yawDeg??SETUP.yawDeg,elevationDeg:angle}};
 return {requested,f,angle,intent};
}
function transform(base,p){
 const velocity=base.velocity.map(x=>x*p.f),speed=base.audit.speed*p.f;
 return {registered:p.requested.registered,velocity,spin:base.spin.slice(),audit:{...base.audit,version:VERSION,foundationVersion:'BALL-SHOT-1.2',holdMs:p.requested.holdMs,normalizedCharge:p.requested.q,q:p.requested.q,registered:true,minimumHoldMs:CHARGE.minimumHoldMs,fullHoldMs:CHARGE.fullHoldMs,capabilityCeiling:base.audit.speed,requestedSpeedFraction:p.f,chargeFactor:p.f,chargeIntent:p.requested.q,launchAngleDeg:p.angle,speed,velocity:velocity.slice(),horizontalVelocity:[velocity[0],velocity[2]],horizontalSpeed:Math.hypot(velocity[0],velocity[2]),verticalVelocity:velocity[1],formula:FORMULA.launch,chargeFormula:FORMULA,context:{...base.audit.context,charge:p.f}}};
}
export function resolveShot(input={}){
 const p=prepare(input),base=frozenResolve(p.intent);
 if(!p.requested.registered)return {registered:false,velocity:null,spin:null,audit:{version:VERSION,...p.requested,normalizedCharge:p.requested.q,reason:'below isolated-harness registration threshold; no shot'}};
 return transform(base,p);
}
export const resolveLaunch=resolveShot;
export function scheduledLaunch(input={},contact={}){
 const p=prepare(input),base=frozenSchedule(p.intent,{...contact,position:contact.position??SETUP.origin});
 if(!p.requested.registered)return null;
 const resolved=transform({velocity:base.velocity,spin:base.spin,audit:base.metadata},p);
 return {...base,velocity:resolved.velocity,spin:resolved.spin,metadata:resolved.audit};
}
