import {dsin,dcos,dexp,dnorm} from '../physchar2/core/v2_math.js';
import {add,sub,mul,dot,cross,len,norm,clamp,advanceQ,finite3} from './math.js';
import {collider,distance,sweep} from './geometry.js';
export const PARAMETERS=Object.freeze({radius:0.11,mass:0.43,inertiaFactor:2/3,gravity:9.81,airDensity:1.2,dragCoefficient:0.25,liftSlope:1.0,maxLift:0.30,airSpinDecay:0.08,
 rollingDecel:0.65,slideFriction:0.30,turfRestitution:0.55,turfFriction:0.30,spinDecel:1.2,restSpeed:0.015,restSpin:0.12,restDwell:0.15,bounceCutoff:0.20});
export const MATERIALS=Object.freeze({turf:{e:0.55,mu:0.30},post:{e:0.72,mu:0.12},boot:{e:0.48,mu:0.45},body:{e:0.35,mu:0.38}});
const UP=[0,1,0],ZERO=[0,0,0];
export class BallWorld{
 constructor({p=[0,0.11,0],v=[0,0,0],w=[0,0,0],q=[0,0,0,1],dt=1/60,substeps=4,parameters={},colliders=[]}={}){
  if(!finite3(p)||!finite3(v)||!finite3(w)||!Number.isFinite(dt)||dt<=0||dt>0.1||!Number.isInteger(substeps)||substeps<1||substeps>64)throw Error('Invalid ball configuration');
  this.cfg={...PARAMETERS,...parameters};const c=this.cfg;
  if(p[1]<c.radius-1e-8)throw Error('Initial ball centre is below the turf');
  if(!Array.isArray(q)||q.length!==4||q.some(x=>!Number.isFinite(x))||Math.abs(Math.sqrt(q.reduce((a,x)=>a+x*x,0))-1)>1e-6)throw Error('Orientation must be a unit quaternion');
  if(Object.values(c).some(x=>!Number.isFinite(x)||x<0)||c.radius<=0||c.mass<=0||c.inertiaFactor<=0||c.turfRestitution>1)throw Error('Invalid physical parameters');
  this.I=c.inertiaFactor*c.mass*c.radius*c.radius;this.dt=dt;this.substeps=substeps;this.tick=0;this.time=0;
  this.ball={p:p.slice(),v:v.slice(),w:w.slice(),q:q.slice(),mode:'AIRBORNE',slip:0,sleeping:false};
  this.colliders=colliders.map(collider).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(new Set(this.colliders.map(c=>c.id)).size!==this.colliders.length)throw Error('Duplicate collider ids');
  this.events=[];this.actions=[];this.actionIds=new Set();this.guards=[];this.restTime=0;
  this.stats={steps:0,substeps:0,candidates:0,distanceQueries:0,ccdExhausted:0,impacts:0};
 }
 setColliderFrame(id,{p,q,v,w}){
  const co=this.colliders.find(c=>c.id===id);if(!co||![p,v,w].every(finite3)||!Array.isArray(q)||q.length!==4||q.some(x=>!Number.isFinite(x)))throw Error('Invalid collider frame');
  Object.assign(co,{p:p.slice(),q:q.slice(),v:v.slice(),w:w.slice(),epoch:this.time});
 }
 snapshot(){return {time:this.time,tick:this.tick,...structuredClone(this.ball)};}
 energy(){const b=this.ball,c=this.cfg;return c.mass*(dot(b.v,b.v)/2+c.gravity*Math.max(0,b.p[1]-c.radius))+this.I*dot(b.w,b.w)/2;}
 emit(kind,detail={}){const e={kind,time:this.time,tick:this.tick,...detail};this.events.push(e);return e;}
 schedule(action){
  if(!action.id||this.actionIds.has(action.id)||!Number.isInteger(action.tick)||action.tick<this.tick||!finite3(action.position)||!finite3(action.velocity)||!finite3(action.spin))throw Error('Invalid or duplicate resolved action');
  if(!Number.isFinite(action.maxContactError??0.04)||(action.maxContactError??0.04)<0||(action.maxContactError??0.04)>0.20)throw Error('Invalid contact tolerance');
  this.actionIds.add(action.id);this.actions.push(structuredClone({preparedAt:this.time,...action}));
  this.actions.sort((a,b)=>a.tick-b.tick||(a.id<b.id?-1:1));
 }
 launch(a){
  const b=this.ball,c=this.cfg;
  // Contact position is an eligibility assertion, NEVER a teleport destination.
  if(len(sub(b.p,a.position))>(a.maxContactError??0.04))return this.emit('LAUNCH_CANCELLED',{id:a.id,reason:'ball left contact region'});
  // Any earlier physical touch since preparation invalidates the promised action.
  if(a.preparedAt!=null&&this.events.some(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider!=='turf'&&e.collider!==a.colliderId&&e.time>=a.preparedAt))return this.emit('LAUNCH_CANCELLED',{id:a.id,reason:'intervening physical contact'});
  // Same-time external contact wins, independent of array insertion order.
  for(const co of this.colliders){if(co.id===a.colliderId)continue;if(distance(co,b.p,this.time).d<=c.radius+1e-5)return this.emit('LAUNCH_CANCELLED',{id:a.id,reason:'contested contact',collider:co.id});}
  if(a.colliderId){
   const own=this.colliders.find(co=>co.id===a.colliderId);
   if(!own||distance(own,b.p,this.time).d>c.radius+0.025)return this.emit('LAUNCH_CANCELLED',{id:a.id,reason:'striking surface absent'});
  }
  b.v=a.velocity.slice();b.w=a.spin.slice();b.sleeping=false;this.restTime=0;
  // Only this striking surface's current contact episode is suppressed. Release
  // as soon as separated; hard cap 2 substeps. Defenders remain live throughout.
  if(a.colliderId)this.guards.push({id:a.colliderId,until:this.time+2*this.dt/this.substeps,action:a.id});
  return this.emit('AUTHORITATIVE_LAUNCH',{id:a.id,position:b.p.slice(),velocity:b.v.slice(),spin:b.w.slice(),metadata:a.metadata||{},collider:a.colliderId||null});
 }
 isGuarded(co){return this.guards.some(g=>g.id===co.id);}
 refreshGuards(){this.guards=this.guards.filter(g=>{
  const co=this.colliders.find(c=>c.id===g.id);if(!co)return false;
  if(distance(co,this.ball.p,this.time).d>this.cfg.radius+0.002)return false;
  if(this.time>=g.until-1e-10)throw Error('Deliberate contact did not separate within two substeps: '+g.id);
  return true;
 });}
 impulse(hit){
  const b=this.ball,c=this.cfg,n=hit.n,r=mul(n,-c.radius),u=sub(add(b.v,cross(b.w,r)),hit.surface),vn=dot(u,n);
  if(vn>=-1e-8)return;
  const mat=hit.c?.response||MATERIALS[hit.c?.material||'turf'];
  const e=hit.c?mat.e:(-vn<c.bounceCutoff?0:c.turfRestitution),mu=hit.c?mat.mu:c.turfFriction;
  const jn=-(1+e)*vn*c.mass;
  const tang=sub(u,mul(n,vn)),st=len(tang),jt=st?mul(tang,-Math.min(st/(1/c.mass+c.radius*c.radius/this.I),mu*jn)/st):ZERO;
  const J=add(mul(n,jn),jt);b.v=add(b.v,mul(J,1/c.mass));b.w=add(b.w,mul(cross(r,jt),1/this.I));b.sleeping=false;this.restTime=0;this.stats.impacts++;
  this.emit('PHYSICAL_CONTACT',{collider:hit.c?.id||'turf',material:hit.c?.material||'turf',point:hit.point.slice(),normal:n.slice(),impulse:J,oppositeImpulse:mul(J,-1),normalImpulse:jn,velocity:b.v.slice(),spin:b.w.slice()});
 }
 ground(h){
  const b=this.ball,c=this.cfg,r=[0,-c.radius,0];b.p[1]=c.radius;b.v[1]=0;
  const slip=add(b.v,cross(b.w,r)),s=len(slip),cap=c.slideFriction*c.mass*c.gravity*h;let frictionImpulse=[0,0,0];
  if(s>1e-12){const jt=mul(slip,-Math.min(s/(1/c.mass+c.radius*c.radius/this.I),cap)/s);frictionImpulse=jt;b.v=add(b.v,mul(jt,1/c.mass));b.w=add(b.w,mul(cross(r,jt),1/this.I));}
  const residual=len(add(b.v,cross(b.w,r)));
  if(residual<1e-7){
   const speed=dnorm(b.v[0],b.v[2]),ns=Math.max(0,speed-c.rollingDecel*h);
   if(speed){b.v[0]*=ns/speed;b.v[2]*=ns/speed;}
   // Rolling constraint w × (-r up) = -v. Its resistive torque removes
   // translational and rotational energy together; no hidden spin reset in air.
   b.w[0]=b.v[2]/c.radius;b.w[2]=-b.v[0]/c.radius;
  }
  b.w[1]=Math.sign(b.w[1])*Math.max(0,Math.abs(b.w[1])-c.spinDecel*h);
  b.slip=len(add(b.v,cross(b.w,r)))/Math.max(len(b.v),c.radius*len(b.w),0.05);
  b.mode=b.slip>0.01?'SLIDING':'ROLLING';
  b.groundContact={point:[b.p[0],0,b.p[2]],normal:[0,1,0],normalImpulse:c.mass*c.gravity*h,frictionImpulse};
 }
 air(h,supported){
  const b=this.ball,c=this.cfg;
  if(!supported)b.v[1]-=c.gravity*h;
  const speed=len(b.v),k=0.5*c.airDensity*Math.PI*c.radius*c.radius/c.mass;
  if(speed>1e-9){
   // Exact scalar quadratic drag decay over a substep, always dissipative.
   b.v=mul(b.v,1/(1+k*c.dragCoefficient*speed*h));
   if(!supported&&len(b.w)>1e-8){
    const mag=cross(b.w,b.v),m=len(mag),perpSpin=m/Math.max(len(b.v),1e-9),S=c.radius*perpSpin/Math.max(len(b.v),0.1),cl=Math.min(c.maxLift,c.liftSlope*S);
    // Rodrigues velocity rotation integrates transverse Magnus without adding
    // kinetic energy. Lift direction is omega cross velocity, not target error.
    if(m>1e-9){const axis=norm(cross(b.v,mag)),angle=k*cl*len(b.v)*h,cs=dcos(angle),sn=dsin(angle);b.v=add(mul(b.v,cs),mul(cross(axis,b.v),sn));}
   }
  }
  if(!supported)b.w=mul(b.w,dexp(-c.airSpinDecay*h));
 }
 drift(h){
  const b=this.ball,c=this.cfg;let rem=h,iterations=0;
  while(rem>1e-10){
   if(++iterations>24)throw Error('Contact iteration budget exhausted');
   this.refreshGuards();let hit=null;
   if(b.v[1]<-1e-9){const t=(c.radius-b.p[1])/b.v[1];if(t>=-1e-9&&t<=rem){const at=add(b.p,mul(b.v,Math.max(0,t)));hit={time:Math.max(0,t),n:UP,point:[at[0],0,at[2]],surface:ZERO};}}
   for(const co of this.colliders){if(this.isGuarded(co))continue;const x=sweep(co,b.p,b.v,this.time,rem,c.radius,this.stats);if(x&&(!hit||x.time<hit.time-1e-9))hit=x;}
   const d=hit?hit.time:rem;b.p=add(b.p,mul(b.v,d));b.q=advanceQ(b.q,b.w,d);this.time+=d;rem-=d;
   if(!hit)break;
   this.impulse(hit);
   if(hit.c&&hit.d<c.radius)b.p=add(b.p,mul(hit.n,c.radius-hit.d+1e-7));
   if(!hit.c)b.p[1]=c.radius;
   // Separate by a submicrometre to prevent the same surface consuming the
   // collision budget; this never bridges an external body or changes velocity.
   b.p=add(b.p,mul(hit.n,2e-7));
  }
 }
 step(){
  this.time=this.tick*this.dt;
  let accepted=false;
  while(this.actions[0]?.tick===this.tick){const a=this.actions.shift();if(accepted)this.emit('LAUNCH_CANCELLED',{id:a.id,reason:'simultaneous action already resolved'});else accepted=this.launch(a).kind==='AUTHORITATIVE_LAUNCH';}
  const b=this.ball,c=this.cfg,h=this.dt/this.substeps;
  for(let i=0;i<this.substeps;i++){
   const supported=b.p[1]<=c.radius+2e-6&&b.v[1]<=0.025;
   if(supported){b.p[1]=c.radius;b.v[1]=0;}
   this.air(h,supported);if(supported)this.ground(h);else{b.mode='AIRBORNE';b.slip=0;b.groundContact=null;}
   this.drift(h);this.stats.substeps++;
   const settled=b.p[1]<=c.radius+2e-6&&len(b.v)<c.restSpeed&&len(b.w)<c.restSpin;
   this.restTime=settled?this.restTime+h:0;
   if(this.restTime>=c.restDwell){b.v=[0,0,0];b.w=[0,0,0];b.p[1]=c.radius;b.sleeping=true;b.mode='REST';}
   if(b.p[1]>c.radius+2e-6||b.v[1]>.025)b.mode='AIRBORNE';
   if(this.onSubstep)this.onSubstep(this.snapshot());
  }
  this.tick++;this.time=this.tick*this.dt;this.stats.steps++;
  if(!finite3(b.p)||!finite3(b.v)||!finite3(b.w))throw Error('Non-finite ball state');
  return this.snapshot();
 }
}
