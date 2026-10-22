import {FAMILIES,GLOBAL} from './config.js';
import {resistance,LAWS} from './world.js';
import {dexp,dsin,dcos,dnorm} from '../physchar2/core/v2_math.js';
const lerp=(a,b,t)=>a+(b-a)*t;
const unit=(v,name)=>{if(!Number.isFinite(v)||v<0||v>1)throw Error(name+' must be in [0,1]');return v;};
const finite=(v,name)=>{if(!Number.isFinite(v))throw Error(name+' must be finite');return v;};
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;}
// Independent keyed draws: adding another action or presentation effect cannot
// advance this stream. Triangular bounded errors, deliberately NOT a hidden
// reimplementation of the engine's Gaussian error distribution.
function draw(seed,id,channel){let h=hash(JSON.stringify([seed,id,channel]));const next=()=>{h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};return next()-next();}
export function resolveExecution({seed,actionId,quality=1,pressure=0,family='ground',distance=15}){
 if(!Number.isInteger(seed)||!actionId)throw Error('Seed and stable actionId required');
 unit(quality,'quality');unit(pressure,'pressure');finite(distance,'distance');if(distance<0)throw Error('Negative distance');
 const shot=FAMILIES[family]?.shot;if(!FAMILIES[family])throw Error('Unknown family');
 const difficulty=(1-quality)*(1+.75*pressure),spreadM=(shot?.9:.45)+distance*(shot?.018:.012);
 const draws=Object.fromEntries(['aim','weight','lift','spin'].map(k=>[k,draw(seed,actionId,k)]));
 return {quality,yawRad:draws.aim*difficulty*spreadM/Math.max(1,distance),weightFraction:draws.weight*difficulty*.16,liftMps:draws.lift*difficulty*.6,spinFraction:draws.spin*difficulty*.20,audit:{source:'BALL-FEEL-1 local triangular execution',seed,actionId,quality,pressure,difficulty,draws}};
}
// Integrate u=v² backwards over DISTANCE: du/dD=2(a(sqrt(u))+k*u).
// Fixed 256-step RK4 runs once in the resolver. It estimates the initial state;
// the world never receives a target, a desired arrival speed or a steering law.
export function rollingLaunch(distance,arrival,cfg=GLOBAL,law=LAWS.responsive){
 const k=.5*cfg.airDensity*Math.PI*cfg.radius*cfg.radius*cfg.dragCoefficient/(cfg.mass*(1+cfg.inertiaFactor));
 const rate=u=>2*(resistance(Math.sqrt(Math.max(0,u)),law)+k*u),h=distance/256;
 let u=arrival*arrival;
 for(let i=0;i<256;i++){const a=rate(u),b=rate(u+h*a/2),c=rate(u+h*b/2),d=rate(u+h*c);u+=h*(a+2*b+2*c+d)/6;}
 return Math.sqrt(u);
}
export function resolveLaunch(intent,cfg=GLOBAL,families=FAMILIES,law=LAWS.responsive){
 const {family,actionId='preview',direction=[1,0],distance=FAMILIES[family]?.distance,power=.5,lift,curve=FAMILIES[family]?.curveDefault??0,technique=FAMILIES[family]?.technique,selectedFoot='R',preferredFoot=selectedFoot,attainablePower=1,curveSkill=1,execution={quality:1},spinOverride}=intent;
 const f=families[family];if(!f)throw Error('Unknown family '+family);
 unit(power,'power');unit(attainablePower,'attainablePower');unit(curveSkill,'curveSkill');unit(curve,'curve');unit(execution.quality??1,'execution.quality');
 if(!['R','L'].includes(selectedFoot)||!['R','L'].includes(preferredFoot))throw Error('Foot must be R or L');
 if(!['INSIDE','INSIDE_FINISH','OUTSIDE','LACES','LACES_POWER','CHIP'].includes(technique))throw Error('Unknown technique');
 finite(distance,'distance');if(distance<=0||distance>60)throw Error('Distance must be in (0,60] metres');
 if(!Array.isArray(direction)||direction.length!==2||!direction.every(Number.isFinite)||dnorm(...direction)<1e-9)throw Error('Nonzero horizontal direction [x,z] required');
 for(const k of ['yawRad','weightFraction','liftMps','spinFraction'])finite(execution[k]??0,'execution.'+k);
 if(Math.abs(execution.yawRad??0)>.5||Math.abs(execution.weightFraction??0)>.5||Math.abs(execution.liftMps??0)>3||Math.abs(execution.spinFraction??0)>.5)throw Error('Execution error exceeds contract');
 const p=power*attainablePower,weightFactor=1+(execution.weightFraction??0),quality=execution.quality??1;
 const baseArrival=f.arrival?lerp(...f.arrival,p):null;
 const rawSpeed=f.kind==='ground'?rollingLaunch(distance,baseArrival,cfg,law):lerp(...f.horizontal,p);
 const cap=f.cap??f.horizontal[1],speed=Math.max(0,Math.min(cap,rawSpeed*weightFactor));
 const baseLift=f.kind==='ground'?0:lerp(...f.vertical,p),vy=Math.max(0,finite(lift??baseLift,'lift')+(execution.liftMps??0));if(vy>14)throw Error('Lift exceeds V1 envelope');
 const yaw=execution.yawRad??0,L=dnorm(...direction),dx=direction[0]/L,dz=direction[1]/L,cs=dcos(yaw),sn=dsin(yaw),ux=dx*cs-dz*sn,uz=dx*sn+dz*cs;
 const isRoll=f.kind==='ground'&&vy===0;
 const backspin=isRoll?-speed/cfg.radius:f.rollingFraction!=null?-f.rollingFraction*speed/cfg.radius:f.backspin?lerp(...f.backspin,p):0;
 // Right inside turns toward -Z: match.js left-perp is [vy,-vx] in a
 // pitch-Y-grows-south frame. Left foot and outside reverse that intent.
 const sign=(selectedFoot==='R'?1:-1)*(technique==='OUTSIDE'?-1:1),techFactor=({INSIDE:1,INSIDE_FINISH:1,OUTSIDE:1.15,LACES:.18,LACES_POWER:.10,CHIP:.08})[technique];
 const side=sign*(f.sideSpin??0)*curve*(.06+.94*curveSkill*curveSkill)*(.15+.85*quality*quality)*techFactor*(1+(execution.spinFraction??0));
 let spin=[-uz*backspin,side,ux*backspin];
 if(spinOverride!==undefined){if(!Array.isArray(spinOverride)||spinOverride.length!==3||!spinOverride.every(Number.isFinite)||dnorm(...spinOverride)>400)throw Error('Invalid explicit spin');spin=spinOverride.slice();}
 return {velocity:[ux*speed,vy,uz*speed],spin,audit:{version:'BALL-FEEL-1.1',family,actionId,power,attainablePower,effectivePower:p,distance,baseArrival,rawSpeed,weightFactor,capped:speed!==rawSpeed*weightFactor,horizontalSpeed:speed,liftMps:vy,backspinRadS:backspin,sideSpinRadS:side,curve,curveSkill,technique,selectedFoot,preferredFoot,execution:structuredClone(execution),formula:f.kind==='ground'?'256 fixed RK4 distance steps: du/dD=2(a(sqrt(u))+k*u)':'linear interpolation of horizontal / vertical / spin endpoints',environment:{rollingLaw:structuredClone(law),maxLift:cfg.maxLift,dragCoefficient:cfg.dragCoefficient}}};
}
// No resampling here. Existing engine err/aim_off must first alter direction /
// distance upstream; pass its provenance in execution.audit, with zero local
// errors. Never call resolveExecution as well as replaying the same engine error.
export function scheduledLaunch(intent,{tick=0,position=[0,GLOBAL.radius,0],colliderId,preparedAt=0}={},cfg=GLOBAL,law=LAWS.responsive){const r=resolveLaunch(intent,cfg,FAMILIES,law);return {id:intent.actionId,tick,position:position.slice(),velocity:r.velocity,spin:r.spin,colliderId,preparedAt,metadata:r.audit};}
export function fromLegacyDecision(decision,{actionId,delta,power=.5,selectedFoot='R',preferredFoot=selectedFoot}){
 if(!Array.isArray(delta)||delta.length!==2||!delta.every(Number.isFinite)||dnorm(...delta)<1e-6)throw Error('Target displacement required');
 const isShot=decision.action==='SHOOT';
 if(!isShot&&decision.action!=='PASS')throw Error('Only resolved pass / shot decisions supported');
 let family=isShot?'shot':({SHORT:'ground',PROGRESSIVE:'driven',LONG:'loft',LOFT:'loft',CROSS:'cross',THROUGH:'firm',DRIVEN:'driven',CUTBACK:'short'}[decision.family]??'ground');
 // Despite the engine RNG channel names lat/lon, continuous.py applies err
 // directly in WORLD X/Y. delta must already include receiver lead or the
 // selected shot corner. Preserve that actual behavior, without another draw.
 const ex=isShot?0:(decision.err?.[0]??0),ez=isShot?Math.max(-8,Math.min(8,decision.aim_off??0)):(decision.err?.[1]??0);
 finite(ex,'legacy X error');finite(ez,'legacy Y error');const target=[delta[0]+ex,delta[1]+ez];
 if(family==='loft'&&dnorm(...target)<20)family='driven';
 return {actionId,family,direction:target,distance:dnorm(...target),power,selectedFoot,preferredFoot,execution:{quality:1,audit:{source:'engine.body_decide; supplied error applied once',decision:structuredClone(decision),intendedDelta:delta.slice(),resolvedDelta:target}}};
}
