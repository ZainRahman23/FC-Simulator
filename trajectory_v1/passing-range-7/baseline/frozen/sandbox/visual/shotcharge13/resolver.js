import {resolveShot as capabilityResolve,scheduledLaunch as capabilitySchedule} from '../shotcharge1/resolver.js';
import {solveVertical} from '../shotcharge11/resolver.js';
import {VERSION,SETUP,CHARGE,PROFILE,OVERCHARGE,FORMULA} from './config.js';
export function requestedCharge(holdMs){
 if(!Number.isFinite(holdMs)||holdMs<0)throw Error('holdMs must be finite and nonnegative');
 return {registered:true,holdMs,q:Math.max(0,Math.min(1,(holdMs-CHARGE.tapFloorEndMs)/(CHARGE.fullHoldMs-CHARGE.tapFloorEndMs)))};
}
export function speedFraction(q){if(!Number.isFinite(q)||q<0||q>1)throw Error('q must be in [0,1]');return CHARGE.floorFraction+(1-CHARGE.floorFraction)*(1-(1-q)**2);}
export function normalProfileForHold(holdMs){
 const {q}=requestedCharge(holdMs),shapeFraction=q**PROFILE.power*(PROFILE.power+1-PROFILE.power*q);
 return {kind:'first-flight-apex',minimumApex:PROFILE.minimumApex,maximumApex:PROFILE.maximumApex,shapeFraction,desiredApex:PROFILE.minimumApex+(PROFILE.maximumApex-PROFILE.minimumApex)*shapeFraction,heightConvention:'ball-centre height above turf'};
}
export function overchargeJoin(){
 const q=requestedCharge(OVERCHARGE.startMs).q,a=PROFILE.power;
 const height=normalProfileForHold(OVERCHARGE.startMs).desiredApex;
 const slope=(PROFILE.maximumApex-PROFILE.minimumApex)*a*(a+1)*q**(a-1)*(1-q)/(CHARGE.fullHoldMs-CHARGE.tapFloorEndMs);
 return {holdMs:OVERCHARGE.startMs,height,slope,limit:PROFILE.maximumApex+OVERCHARGE.extraApexLimit};
}
export function profileForHold(holdMs){
 const profile=normalProfileForHold(holdMs);
 if(holdMs<=OVERCHARGE.startMs)return profile;
 const join=overchargeJoin(),d=holdMs-join.holdMs,L=join.limit-join.height;
 return {...profile,desiredApex:join.height+L*(-Math.expm1(-join.slope*d/L-(d/OVERCHARGE.scaleMs)**OVERCHARGE.power)),overcharged:true,overchargeHoldMs:d,asymptoticApex:join.limit,overchargeJoin:join};
}
function prepare(input){
 requestedCharge(input.holdMs);
 if(input.trajectoryProfile!==undefined)throw Error('The selected trajectory profile is fixed in this candidate');
 // Resolve the unchanged family/context capability at full commitment. The old
 // input timeline is not used for this shot; raw duration is applied below.
 return {...input,holdMs:600};
}
function transform(base,input,position){
 const request=requestedCharge(input.holdMs),fraction=speedFraction(request.q),speed=base.audit.capabilityCeiling*fraction,profile=profileForHold(input.holdMs);
 const solution=solveVertical({speed,spin:base.spin,profile,position,yawDeg:input.aim?.yawDeg??SETUP.yawDeg}),velocity=solution.velocity;
 return {...base,registered:true,velocity,audit:{...base.audit,...request,version:VERSION,foundationVersion:'BALL-SHOT-1.2 / SHOT-CHARGE-1.1 physical vertical solve',normalizedCharge:request.q,minimumHoldMs:0,tapFloorEndMs:CHARGE.tapFloorEndMs,fullHoldMs:CHARGE.fullHoldMs,requestedSpeedFraction:fraction,chargeFactor:fraction,chargeIntent:request.q,speed,aim:{...base.audit.aim,elevationDeg:solution.angleDeg,kind:'pre-contact physical apex solve; no target correction after launch'},launchAngleDeg:solution.angleDeg,velocity:velocity.slice(),horizontalVelocity:[velocity[0],velocity[2]],horizontalSpeed:Math.hypot(velocity[0],velocity[2]),verticalVelocity:velocity[1],context:{...base.audit.context,charge:fraction},trajectoryProfile:profile,verticalSolve:solution,chargeFormula:FORMULA,formula:'Faster continuous input timing; unchanged player ceiling and physical pre-contact apex solve'}};
}
export function resolveShot(input={}){return transform(capabilityResolve(prepare(input)),input,SETUP.origin);}
export const resolveLaunch=resolveShot;
export function scheduledLaunch(input={},contact={}){
 const base=capabilitySchedule(prepare(input),contact),resolved=transform({registered:true,velocity:base.velocity,spin:base.spin,audit:base.metadata},input,base.position);
 return {...base,velocity:resolved.velocity,spin:resolved.spin,metadata:resolved.audit};
}
