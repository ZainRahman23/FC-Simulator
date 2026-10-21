// Presentation-only persistent support timeline. Reads recorded C; never writes it.
// Forecasts use only the authoritative plan available at this tick, plus recent
// coherent curvature. A later recorded input is never consulted for prediction.
import {DT,DEG,wrap} from './sim.js';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const F=['R','L'],sgn=x=>x==='R'?1:-1,other=x=>x==='R'?'L':'R',H=.088;
const rot=(p,h)=>[p[0]*Math.cos(h)-p[1]*Math.sin(h),p[0]*Math.sin(h)+p[1]*Math.cos(h)];
const local=(p,s,h)=>rot([p[0]-s[0],p[1]-s[1]],-h);
const herm=(p,v,q,w,T,u)=>{const u2=u*u,u3=u2*u;return p.map((x,i)=>(2*u3-3*u2+1)*x+(u3-2*u2+u)*T*v[i]+(-2*u3+3*u2)*q[i]+(u3-u2)*T*w[i]);};
export class SupportTimeline{
 constructor(sim){this.sim=sim;this.frames=[];this.events=[];this.k=0;this.feet={};this.next='L';this.nextLand=0;this.phaseStart=0;this.phaseEnd=.25;this.revision=0;this.started=false;this.curveTime=0;this.rate=0;this.lean=0;this.crouch=.035;this.trunk=0;const s=sim.stateAt(0);this.phi=s.psi;
 for(const X of F){const a=rot([0,sgn(X)*.17],this.phi);this.feet[X]={F:X,p:[s.P[0]+a[0],s.P[1]+a[1],H],v:[0,0,0],yaw:this.phi,planted:true,td:0,lift:Infinity,id:X+'0',slide:0};}this.prev=s;this.record(0,s,'STRAIGHT_RUN');}
 forecast(t,dt,s,plan,curve){const x=this.sim.stateAt(t+dt,plan);if(!curve)return x;const w=this.rate,h=s.h,ss=s.s;let d=Math.abs(w)>.001?[(Math.sin(h+w*dt)-Math.sin(h))*ss/w,(-Math.cos(h+w*dt)+Math.cos(h))*ss/w]:[Math.cos(h)*ss*dt,Math.sin(h)*ss*dt];const blend=clamp(this.curveTime/.12,0,1);return {...x,P:x.P.map((v,i)=>v*(1-blend)+(s.P[i]+d[i])*blend),h:x.h+wrap(h+w*dt-x.h)*blend,psi:x.psi+wrap(h+w*dt-x.psi)*blend,s:ss*blend+x.s*(1-blend)};}
 family(s,t){const m=s.motion,active=m&&t<m.t0+m.duration-.001,a=active?m.angle:0,brake=(this.prev.s-s.s)/DT;if(active&&a>135)return 'BRAKE_REPLACE';if(active&&a>40)return 'CUT_SUPPORT';if(this.curveTime>.07&&s.s>1.2)return 'CURVED_RUN';if(brake>7)return 'BRAKE_REPLACE';return 'STRAIGHT_RUN';}
 landing(X,t,dt,s,plan,family){const curve=this.curveTime>.07&&(s.motion?.angle||0)<40,x=this.forecast(t,dt,s,plan,curve),out=sgn(X)*Math.sign(this.rate)<0,lead=Math.min(.36,x.s*.045),width=.17+(curve&&out?.025:family==='CUT_SUPPORT'?.035:0),a=rot([lead,sgn(X)*width],x.h);return {p:[x.P[0]+a[0],x.P[1]+a[1],H],yaw:x.h+sgn(X)*3*DEG,root:x.P.slice(),h:x.h};}
 release(f,t,s,plan,family,period){f.planted=false;f.t0=t;f.land=Math.max(t+.13,this.nextLand);this.nextLand=f.land+period;f.lift=t;f.start=f.p.slice();f.startV=f.v.slice();f.startYaw=f.yaw;f.segT=t;f.duration=f.land-t;f.phase0=0;f.phaseT=t;f.releaseRel=local(f.p,s.P,this.phi);f.target=this.landing(f.F,t,f.land-t,s,plan,family);f.predicted=f.target.p.slice();f.frozen=false;f.extensions=0;f.revisions=0;f.family=family;f.slide=0;this.events.push({t,type:'lift',F:f.F,family,next:f.land,predicted:f.target.p.slice()});}
 tick(){const t=++this.k*DT,plan=this.sim.planAt(Math.max(0,t-DT/2)),s=this.sim.stateAt(t,plan),raw=s.s>.4?wrap(s.h-this.prev.h)/DT:0;this.rate+=clamp(raw-this.rate,-7000*DEG*DT,7000*DEG*DT)*.35;
 const a=s.motion?.angle||0;if(Math.abs(this.rate)>35*DEG&&a<40&&s.s>1)this.curveTime=Math.min(.3,this.curveTime+DT);else this.curveTime=Math.max(0,this.curveTime-DT*2);const family=this.family(s,t);
 this.phi+=wrap(s.psi-this.phi)*(1-Math.exp(-DT/.025));const pe=wrap(s.psi-this.phi);if(Math.abs(pe)>12*DEG)this.phi=s.psi-Math.sign(pe)*12*DEG;
 const lat=s.s*this.rate,brake=Math.max(0,(this.prev.s-s.s)/DT),wantLean=clamp(lat*.72,-26,26);this.lean+=(wantLean-this.lean)*(1-Math.exp(-DT/.065));const wantC=.035+clamp(Math.abs(lat)*.0016+brake*.003,0,.075);this.crouch+=(wantC-this.crouch)*(1-Math.exp(-DT/.045));this.trunk+=(clamp(-this.rate/DEG*.022,-12,12)-this.trunk)*(1-Math.exp(-DT/.05));
 let period=this.sim.gait(Math.max(.1,s.s)).Ts;if(family==='CURVED_RUN')period=period*(1-clamp(Math.abs(this.rate)/(270*DEG),0,.95))+.17*clamp(Math.abs(this.rate)/(270*DEG),0,.95);if(family==='CUT_SUPPORT'||family==='BRAKE_REPLACE')period=Math.min(period,.185);period=clamp(period,.16,.34);
 const stance=Math.min(period*1.05,Math.max(.09,.80/Math.max(s.s,1))),moving=s.s>.12||s.motion?.target!=null;
 if(!this.started&&moving){this.started=true;this.nextLand=t+.17;this.feet.L.lift=t;this.feet.R.lift=t+.17;}
 for(const X of F){const f=this.feet[X];if(f.planted){const r=local(f.p,s.P,this.phi),danger=Math.hypot(r[0],r[1]-sgn(X)*.15)>.44||r[1]*sgn(X)<.10;
  if(this.started&&moving&&(t>=f.lift-1e-9||danger)){if(this.nextLand<t+.13)this.nextLand=t+.13;this.release(f,t,s,plan,danger?'REPLACEMENT_STEP':family,period);}
  else{const target=this.phi+sgn(X)*3*DEG;f.yaw+=clamp(wrap(target-f.yaw),-650*DEG*DT,650*DEG*DT);f.v=[0,0,0];}
 }
 if(!f.planted){let rem=Math.max(DT,f.land-t),u=clamp(f.phase0+(1-f.phase0)*(t-f.phaseT)/Math.max(DT,f.land-f.phaseT),0,1);
  if(this.k%4===0){const wanted=this.landing(X,t,rem,s,plan,family),diff=Math.hypot(wanted.p[0]-f.target.p[0],wanted.p[1]-f.target.p[1]);
   if(rem<.065&&diff>.34&&f.extensions<2){f.phase0=u;f.phaseT=t;f.land+=.065;f.duration=f.land-f.t0;rem=f.land-t;f.extensions++;f.frozen=false;f.family='REPLACEMENT_STEP';this.events.push({t,type:'retime',F:X,delay:.065,reason:'late unreachable landing'});}
   if(rem>.055){const maxShift=rem>.12?.25:.08,scale=Math.min(1,maxShift/(diff||1));f.target={...wanted,p:wanted.p.map((x,i)=>i===2?H:f.target.p[i]+(x-f.target.p[i])*scale)};if(diff>.025){f.revisions++;this.revision++;}f.start=f.p.slice();f.startV=f.v.slice();f.segT=t-DT;}
   else f.frozen=true;
  }
  const span=Math.max(DT,f.land-f.segT),z=clamp((t-f.segT)/span,0,1),old=f.p.slice();let p=herm(f.start,f.startV,f.target.p,[0,0,0],span,z);
  // Reachable, separate swing corridors belong to the support trajectory, before
  // the leg solver. No planted target or authoritative root is pulled by IK.
  const height=(.20+Math.min(.10,s.s*.012))*Math.sin(Math.PI*u)**2;p[2]=H+height;
  const r=local(p,s.P,this.phi),maxF=.38+.25*Math.sin(Math.PI*u),maxL=.29;const settle=smooth((t-f.t0)/.09),extraF=Math.max(0,Math.abs(f.releaseRel[0])-maxF)*(1-settle),minL=.13+(Math.min(.13,sgn(X)*f.releaseRel[1])-.13)*(1-settle),outerL=maxL+Math.max(0,Math.abs(f.releaseRel[1])-maxL)*(1-settle);let rr=[clamp(r[0],-maxF-extraF,maxF+extraF),sgn(X)*clamp(sgn(X)*r[1],minL,outerL)];const pp=rot(rr,this.phi);p[0]=s.P[0]+pp[0];p[1]=s.P[1]+pp[1];
  f.p=p;f.v=p.map((x,i)=>(x-old[i])/DT);
  // Orient the recovering boot with the pelvis through mid-swing; exposing its
  // final landing yaw too early sweeps the toe through the opposite calf. The
  // landing rotation is admitted late, with any remainder taken as a plant pivot.
  const yawLimit=(22+23*smooth((u-.65)/.35))*DEG,safeYaw=this.phi+clamp(wrap(f.target.yaw-this.phi),-yawLimit,yawLimit);
  f.yaw+=clamp(wrap(safeYaw-f.yaw),-800*DEG*DT,800*DEG*DT);
  if(t>=f.land-1e-9){f.p[2]=H;f.v=[0,0,0];f.planted=true;f.td=t;f.id=X+this.k;f.lift=t+stance;const actual=f.p.slice();this.events.push({t,type:'land',F:X,family:f.family,predicted:f.predicted,planned:f.target.p.slice(),actual,error:Math.hypot(actual[0]-f.target.p[0],actual[1]-f.target.p[1]),revisions:f.revisions});this.next=other(X);this.phaseStart=t;this.phaseEnd=t+period;const o=this.feet[other(X)];if(o.planted)o.lift=Math.min(o.lift,t+Math.max(.015,period-.18));}
 }
 }
 const pending=F.map(X=>this.feet[X]).filter(f=>!f.planted).sort((a,b)=>a.land-b.land);if(pending.length)this.next=pending[0].F;this.record(t,s,family);this.prev=s;}
 record(t,s,family){const feet={};for(const X of F){const f=this.feet[X],u=f.planted?0:clamp(f.phase0+(1-f.phase0)*(t-f.phaseT)/Math.max(DT,f.land-f.phaseT),0,1);feet[X]={ank:f.p.slice(),yaw:f.yaw,pitch:f.planted?0:(-18*Math.sin(2*Math.PI*u))*DEG,roll:0,toe:0,planted:f.planted,contact:false,stance:{id:f.id,t0:f.td,t1:f.lift,pos:f.p.slice()},ballPt:[f.p[0]+Math.cos(f.yaw)*.18,f.p[1]+Math.sin(f.yaw)*.18],family:f.family||family,phase:u,landing:f.target?.p.slice(),landingTime:f.land,frozen:!!f.frozen,kneeOut:sgn(X)*6*DEG};}this.frames.push({t,feet,psi:this.phi,side:this.lean,crouch:this.crouch,trunk:this.trunk,family,nextSupport:this.next,cycle:{u:clamp((t-this.phaseStart)/Math.max(.05,this.phaseEnd-this.phaseStart),0,1),sw:this.next},revision:this.revision,root:s.P.slice()});}
 at(t){const k=Math.max(0,Math.round(t/DT));while(this.k<k)this.tick();return this.frames[k];}
}
