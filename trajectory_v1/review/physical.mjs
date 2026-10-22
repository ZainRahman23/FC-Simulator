import {BallWorld} from './frozen/sandbox/visual/ballfeel14/world.js';
import {resolveShot as capabilityResolve} from './frozen/sandbox/visual/ballshot12/resolver.js';
import {scheduledLaunch,requestedCharge,speedFraction,profileForHold,overchargeJoin} from './frozen/sandbox/visual/shotcharge13/resolver.js';
import {launchVector} from './frozen/sandbox/visual/shotcharge11/resolver.js';
import {GEOMETRY as G} from './geometry-data.mjs';
import {dispersion} from './locked-model.mjs';
export {requestedCharge,speedFraction,profileForHold,overchargeJoin,launchVector};
const rad=Math.PI/180;
export function rotateHeading(v,yaw){const a=yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [v[0]*c-v[2]*s,v[1],v[0]*s+v[2]*c];}
export function resolveCapability(shotPower,yaw=0){const base=capabilityResolve({family:'LACES',shotPower,bracket:'fast',charge:1,attributes:{preferredFoot:'R'},aim:{yawDeg:0,elevationDeg:0},context:{selectedFoot:'R',pressure:0,stamina:1,energy:1,bodySetup:1,executionQuality:1,startingVelocity:[0,0,0]}});return {...base,velocity:rotateHeading(base.velocity,yaw),spin:rotateHeading(base.spin,yaw)};}
export function projectLaunch({origin,velocity,spin},maxSeconds=12){
 const w=new BallWorld({p:origin.slice(),v:[0,0,0],w:[0,0,0],colliders:[],dt:1/60,substeps:4});
 w.schedule({id:'accuracy-calibration-only',tick:0,position:origin.slice(),velocity:velocity.slice(),spin:spin.slice()});
 let prev=w.snapshot(),cross=null,apex=origin[1];
 w.onSubstep=f=>{apex=Math.max(apex,f.p[1]);if(!cross&&prev.p[0]<G.goalX&&f.p[0]>=G.goalX){const u=(G.goalX-prev.p[0])/(f.p[0]-prev.p[0]);cross={x:prev.p[2]+u*(f.p[2]-prev.p[2])-G.goalCentreZ,y:prev.p[1]+u*(f.p[1]-prev.p[1]),time:prev.time+u*(f.time-prev.time),apex};}prev=f;};
 for(let i=0;i<maxSeconds*60&&!cross;i++){w.step();if(w.ball.sleeping)break;}
 const contacts=w.events.filter(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf'&&e.time<=(cross?.time??Infinity));
 return cross?{...cross,landed:contacts.length>0,status:contacts.length?'turf-before-plane':'first-flight'}:{status:'unreached',landed:contacts.length>0,apex,end:w.ball.p.slice()};
}
export function solveIdeal({forward=20,lateral=0,target={x:0,y:1.22},shotPower=80,fraction=.9,mode='targeted',holdMs=280}){
 const origin=[G.goalX-forward,G.ballRadius,G.goalCentreZ+lateral];
 const yaw=Math.atan2(target.x-lateral,forward)/rad;
 const cap=resolveCapability(shotPower,yaw),ceiling=cap.audit.speed;
 if(mode==='charge'){
  const action=scheduledLaunch({family:'LACES',shotPower,holdMs,actionId:'unchanged-charge-reference',aim:{yawDeg:0},attributes:{preferredFoot:'R'},context:{selectedFoot:'R',pressure:0,stamina:1,energy:1,bodySetup:1,executionQuality:1,startingVelocity:[0,0,0]}},{position:origin});
  const base={origin,velocity:rotateHeading(action.velocity,yaw),spin:rotateHeading(action.spin,yaw),speed:action.metadata.speed,capability:ceiling,fraction:action.metadata.speed/ceiling,yaw,elevation:action.metadata.launchAngleDeg,mode,holdMs,requestedApex:action.metadata.trajectoryProfile.desiredApex,target};
  return {...base,plane:projectLaunch(base),audit:action.metadata};
 }
 // A controlled experiment, never a replacement for the authoritative charge resolver:
 // fixed resolved speed; choose only pre-contact elevation to hit the chosen plane point.
 const speed=ceiling*fraction,spin=cap.spin;
 const probe=angle=>projectLaunch({origin,velocity:launchVector(speed,angle,yaw),spin});
 let low=null,high=null;
 for(const step of [2.5,.5]){let previous=null;for(let a=-5;a<=70;a+=step){const p=probe(a);if(p.status==='first-flight'){if(p.y>=target.y){high={a,p};low=previous??{a:a-step,p:null};break;}previous={a,p};}}if(high)break;}
 if(!high)return {unreachable:true,reason:'No natural first-flight target solution found in the −5° to 70° calibration bracket',origin,speed,capability:ceiling,fraction,yaw,mode,target};
 for(let i=0;i<23;i++){const a=(low.a+high.a)/2,p=probe(a);if(p.status==='first-flight'&&p.y>=target.y)high={a,p};else low={a,p};}
 const elevation=(low.a+high.a)/2,velocity=launchVector(speed,elevation,yaw),plane=probe(elevation);
 if(plane.status!=='first-flight'||Math.hypot(plane.x-target.x,plane.y-target.y)>.002)return {unreachable:true,reason:'Target solver failed 2 mm tolerance',origin,speed,capability:ceiling,fraction,yaw,mode,target};
 return {origin,velocity,spin,speed,capability:ceiling,fraction,yaw,elevation,plane,mode,target,targetError:Math.hypot(plane.x-target.x,plane.y-target.y)};
}
export function projectError(ideal,h,v){return projectLaunch({origin:ideal.origin,velocity:launchVector(ideal.speed,ideal.elevation+v,ideal.yaw+h),spin:ideal.spin});}
export function localProjection(ideal,accuracy){
 const ds=dispersion(accuracy,ideal.fraction),e=.001,hm=projectError(ideal,-e,0),hp=projectError(ideal,e,0),vm=projectError(ideal,0,-e),vp=projectError(ideal,0,e);
 if([hm,hp,vm,vp].some(p=>p.status==='unreached'))return {ds,unavailable:true};
 const J={xx:(hp.x-hm.x)/(2*e),yx:(hp.y-hm.y)/(2*e),xy:(vp.x-vm.x)/(2*e),yy:(vp.y-vm.y)/(2*e)};
 return {ds,J,sigmaH:Math.hypot(J.xx*ds.sigmaH,J.xy*ds.sigmaV),sigmaV:Math.hypot(J.yx*ds.sigmaH,J.yy*ds.sigmaV),definition:'Local linearized spatial sigma, not sampled standard deviation'};
}
export function projectionMesh(ideal,accuracy,N=21){
 if(ideal.unreachable||ideal.plane.status==='unreached')return {ideal,unavailable:true};
 const ds=dispersion(accuracy,ideal.fraction),grid=[];
 for(let j=0;j<N;j++){const row=[];for(let i=0;i<N;i++){const u=-1+2*i/(N-1),v=-1+2*j/(N-1);row.push({...projectError(ideal,u*ds.maxH,v*ds.maxV),u,v});}grid.push(row);}
 const finite=grid.flat().filter(p=>p.status!=='unreached');
 const bound=finite.length?{left:Math.min(...finite.map(p=>p.x)),right:Math.max(...finite.map(p=>p.x)),bottom:Math.min(...finite.map(p=>p.y)),top:Math.max(...finite.map(p=>p.y))}:null;
 return {ideal,accuracy,ds,grid,bound,local:localProjection(ideal,accuracy),method:'Deterministic angular grid pushed through frozen physical ball; no random shots',nodes:N*N};
}
