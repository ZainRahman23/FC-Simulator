import {keeperFor} from './keeper.js';
import {enrichDiagnostics} from './diagnostics.js';
import {solveAim,freeFlight} from './aim.js';import {runShot,frame,onTarget} from './simulation.js';import {ORIGINS,sampleTarget,cellOf} from './config.js';
export function runCase(origin,family,ix,iy,attempt,{record=false}={}){
 const target=sampleTarget(origin,ix,iy,attempt),sol=solveAim(family,ORIGINS[origin],target.lateral,target.height),base={id:`${origin}-${family}-${ix}-${iy}-${attempt}`,origin,family,ix,iy,attempt,target};
 if(!sol.solved)return {...base,unsolved:true,error:sol.error,aimCalls:sol.calls,outcome:'AIM UNSOLVED'};
 const common={...base,unsolved:false,aim:{yaw:sol.yaw,elevation:sol.elevation,error:sol.error,calls:sol.calls,precision:sol.aimPrecision},action:{velocity:sol.action.velocity,spin:sol.action.spin,shotPower:80,speed:sol.action.metadata.speed}};let control=null,stage='no-keeper physical control';
 try{control=freeFlight(sol.action,{colliders:frame()});stage='keeper-on physical continuation';const r=enrichDiagnostics(runShot({...sol,aimPlane:sol.plane,...control},{record}));let extra={freeKeeperPlane:null};if(family==='CHIP'){try{const f=freeFlight(sol.action,{colliders:frame(),stopAtWhole:false,stopAtLanding:true,measurePlanes:[keeperFor(ORIGINS[origin]).set[0]]});extra={freeLanding:f.landing,freeKeeperPlane:Object.values(f.planes)[0]??null,apex:f.apex};}catch(e){extra.landingDiagnosticError=e.message;}}return {...common,actualBin:cellOf(control.plane),...r,...extra};}
 catch(e){return {...common,numericalFailure:true,outcome:'NUMERICAL FAILURE',error:{stage,message:e.message},actualBin:cellOf(control?.plane),free:control?.plane??null,freeWhole:control?.whole??null,onTarget:control?onTarget(control.whole):null};}
}
