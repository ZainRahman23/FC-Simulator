import {BallWorld} from './frozen/sandbox/visual/ballfeel14/world.js';
import {C,magnitude} from './config.mjs';
export {BallWorld};
const lerp=(a,b,u)=>a+(b-a)*u;
export function blend(a,b,u){return {time:lerp(a.time,b.time,u),p:a.p.map((v,i)=>lerp(v,b.p[i],u)),v:a.v.map((v,i)=>lerp(v,b.v[i],u)),w:a.w.map((v,i)=>lerp(v,b.w[i],u))};}
export function makeWorld(action){const w=new BallWorld({p:action.position.slice(),v:[0,0,0],w:[0,0,0],q:[0,0,0,1],dt:C.dt,substeps:C.substeps,colliders:[]});w.schedule(action);return w;}
// Candidate endpoint is measured from the real 240 Hz world, never a substitute flight model.
export function candidate(velocity,spin,{arrivalSpeed=null,arrivalHeight=null}={}){
 const action={id:'solver-candidate',tick:0,position:[0,C.radius,0],velocity,spin};const world=makeWorld(action);
 let prev=world.snapshot(),endpoint=null,apex=C.radius,airborne=false;
 world.onSubstep=f=>{apex=Math.max(apex,f.p[1]);if(f.p[1]>C.radius+.03)airborne=true;
  if(endpoint)return;
  if(arrivalSpeed!==null&&Math.hypot(f.v[0],f.v[2])<=arrivalSpeed){const a=Math.hypot(prev.v[0],prev.v[2]),b=Math.hypot(f.v[0],f.v[2]);if(prev.time>0)endpoint=blend(prev,f,Math.max(0,Math.min(1,(a-arrivalSpeed)/(a-b||1))));}
  if(arrivalHeight!==null&&airborne&&prev.p[1]>=arrivalHeight&&f.p[1]<arrivalHeight&&f.v[1]<0)endpoint=blend(prev,f,(prev.p[1]-arrivalHeight)/(prev.p[1]-f.p[1]));
  prev=f;
 };
 while(!endpoint&&!world.ball.sleeping&&world.time<C.maxSeconds)world.step();
 return {endpoint:endpoint??world.snapshot(),hit:!!endpoint,apex};
}
export function createFlight(action,target,referenceTime=null){
 const world=makeWorld(action),p0=action.position,d=[target[0]-p0[0],target[2]-p0[2]],dist=Math.hypot(...d),axis=d.map(v=>v/dist);
 const f={world,frames:[world.snapshot()],target,axis,plane:null,landing:null,atReference:null,referenceTime,apex:{height:C.radius,position:p0,time:0},done:false,reason:null,airborne:false};let prev=f.frames[0],eventCursor=0;
 world.onSubstep=s=>{
  if(s.p[1]>f.apex.height)f.apex={height:s.p[1],position:s.p.slice(),time:s.time};
  const da=(prev.p[0]-target[0])*axis[0]+(prev.p[2]-target[2])*axis[1],db=(s.p[0]-target[0])*axis[0]+(s.p[2]-target[2])*axis[1];
  if(!f.plane&&da<0&&db>=0)f.plane=blend(prev,s,-da/(db-da));
  if(s.p[1]>.18)f.airborne=true;
  for(;eventCursor<world.events.length;eventCursor++){const e=world.events[eventCursor];if(f.airborne&&!f.landing&&e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf')f.landing={time:e.time,p:[e.point[0],C.radius,e.point[2]],v:e.velocity.slice()};}
  if(referenceTime!==null&&!f.atReference&&prev.time<=referenceTime&&s.time>=referenceTime)f.atReference=blend(prev,s,(referenceTime-prev.time)/(s.time-prev.time));
  f.frames.push(s);prev=s;
 };return f;
}
export function advanceFlight(f){if(f.done)return f;f.world.step();if(f.world.ball.sleeping){f.done=true;f.reason='physical-rest';}else if(f.world.time>=C.maxSeconds){f.done=true;f.reason='12-second-observation-limit';}return f;}
export function summarize(f){return {frames:f.frames,plane:f.plane,landing:f.landing,atReference:f.atReference??(f.referenceTime!==null&&f.world.ball.sleeping?{...f.world.snapshot(),time:f.referenceTime}:null),apex:f.apex,last:f.world.snapshot(),reason:f.reason,duration:f.world.time,launchCount:f.world.events.filter(e=>e.kind==='AUTHORITATIVE_LAUNCH').length,turfContacts:f.world.events.filter(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf').length};}
export function simulate(action,target,referenceTime=null){const f=createFlight(action,target,referenceTime);while(!f.done)advanceFlight(f);return summarize(f);}
export function atTime(frames,t){let lo=0,hi=frames.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(frames[mid].time<t)lo=mid+1;else hi=mid;}const b=frames[lo],a=frames[Math.max(0,lo-1)];return blend(a,b,Math.max(0,Math.min(1,(t-a.time)/(b.time-a.time||1))));}
