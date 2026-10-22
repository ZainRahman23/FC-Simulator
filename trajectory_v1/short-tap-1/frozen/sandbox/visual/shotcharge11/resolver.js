import {resolveShot as frozenChargeResolve,scheduledLaunch as frozenChargeSchedule,requestedCharge,speedFraction} from '../shotcharge1/resolver.js';
import {BallWorld} from '../ballfeel14/world.js';
import {VERSION,SETUP,DEFAULT_PROFILE,SOLVER,FORMULA} from './config.js';
export {requestedCharge,speedFraction};
export function trajectoryProfile(q,anchors=DEFAULT_PROFILE){
 if(!Number.isFinite(q)||q<0||q>1)throw Error('q must be in [0,1]');
 const {minimumApex,maximumApex}=anchors;
 if(!Number.isFinite(minimumApex)||!Number.isFinite(maximumApex)||minimumApex<=.11||maximumApex<minimumApex)throw Error('Invalid physical trajectory anchors');
 const shapeFraction=q**3*(4-3*q);
 return {kind:'first-flight-apex',minimumApex,maximumApex,shapeFraction,desiredApex:minimumApex+(maximumApex-minimumApex)*shapeFraction,heightConvention:'ball-centre height above turf'};
}
const radians=a=>a*Math.PI/180;
export function launchVector(speed,angleDeg,yawDeg=0){const a=radians(angleDeg),y=radians(yawDeg),forward=speed*Math.cos(a);return [forward*Math.cos(y),speed*Math.sin(a),forward*Math.sin(y)];}
// A private physical preview is used only before contact; it is never replayed as a path.
export function previewApex({speed,angleDeg,spin,position=SETUP.origin,yawDeg=0}){
 const world=new BallWorld({p:position.slice(),v:[0,0,0],w:[0,0,0],colliders:[],dt:SETUP.dt,substeps:SETUP.substeps});
 let apex={height:position[1],time:0,position:position.slice()};
 world.onSubstep=f=>{if(f.p[1]>apex.height)apex={height:f.p[1],time:f.time,position:f.p.slice()};};
 world.schedule({id:'pre-contact-apex-probe',tick:0,position:position.slice(),velocity:launchVector(speed,angleDeg,yawDeg),spin:spin.slice()});
 let ended=false;
 for(let i=0;i<Math.ceil(SOLVER.maxPreviewSeconds/SETUP.dt);i++){
  world.step();
  if(world.ball.v[1]<=0||world.events.some(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf')){ended=true;break;}
 }
 if(!ended||!Number.isFinite(apex.height))throw Error('Physical apex preview did not converge');
 return apex;
}
export function solveVertical({speed,spin,profile,position=SETUP.origin,yawDeg=0}){
 if(!Number.isFinite(speed)||speed<=0)throw Error('Positive resolved speed required');
 if(!profile||!Number.isFinite(profile.desiredApex)||profile.desiredApex<position[1])throw Error('Finite apex at or above launch position required');
 let lo=SOLVER.minimumAngleDeg,hi=SOLVER.maximumAngleDeg;
 const probe=angleDeg=>previewApex({speed,spin,position,yawDeg,angleDeg});
 const lower=probe(lo),upper=probe(hi),desired=profile.desiredApex;
 if(desired<lower.height-SOLVER.apexTolerance||desired>upper.height+SOLVER.apexTolerance)throw Error(`Unreachable apex ${desired} m at ${speed} m/s in ${lo}–${hi}° bracket`);
 for(let i=0;i<SOLVER.iterations;i++){const mid=(lo+hi)/2;if(probe(mid).height<desired)lo=mid;else hi=mid;}
 const angleDeg=(lo+hi)/2,apex=probe(angleDeg),error=apex.height-desired;
 if(Math.abs(error)>SOLVER.apexTolerance)throw Error('Pre-contact apex solve failed tolerance');
 return {angleDeg,velocity:launchVector(speed,angleDeg,yawDeg),desiredApex:desired,predictedApex:apex.height,predictedApexTime:apex.time,predictedApexPosition:apex.position,error,iterations:SOLVER.iterations,preContactOnly:true};
}
function transform(base,input,position){
 if(!base.registered)return base;
 const profile=trajectoryProfile(base.audit.q,input.trajectoryProfile??DEFAULT_PROFILE);
 const solution=solveVertical({speed:base.audit.speed,spin:base.spin,profile,position,yawDeg:input.aim?.yawDeg??SETUP.yawDeg});
 const velocity=solution.velocity;
 return {...base,velocity,audit:{...base.audit,version:VERSION,foundationVersion:'SHOT-CHARGE-1 / BALL-SHOT-1.2',aim:{...base.audit.aim,elevationDeg:solution.angleDeg,kind:'pre-contact physical apex solve; no target correction after launch'},context:{...base.audit.context,description:'Preferred right foot; neutral technique attributes; clean stationary ball and body; no pressure; full stamina/energy; effort set only by frozen hold response.'},launchAngleDeg:solution.angleDeg,velocity:velocity.slice(),horizontalVelocity:[velocity[0],velocity[2]],horizontalSpeed:Math.hypot(velocity[0],velocity[2]),verticalVelocity:velocity[1],trajectoryProfile:profile,verticalSolve:solution,chargeFormula:FORMULA,formula:'Frozen charge speed; charge-only apex profile; elevation solved before contact using frozen physics'}};
}
export function resolveShot(input={}){return transform(frozenChargeResolve(input),input,SETUP.origin);}
export const resolveLaunch=resolveShot;
export function scheduledLaunch(input={},contact={}){
 const base=frozenChargeSchedule(input,contact);if(!base)return null;
 const resolved=transform({registered:true,velocity:base.velocity,spin:base.spin,audit:base.metadata},input,base.position);
 return {...base,velocity:resolved.velocity,spin:resolved.spin,metadata:resolved.audit};
}
