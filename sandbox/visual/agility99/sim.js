// Adapter beside the locked baseline. No ball, technique, contact, IK or selection edits.
import {PlaySim,Curve,DT,DEG,wrap} from '../tc_baseline_88573ef0/pt_sim.js';
import {PROFILES,advance} from './movement.js';
import {bodyGaitFrom} from './body_gait.js';
export {DT,DEG,wrap,PROFILES};
export class AgilitySim extends PlaySim {
 reset(o={}){super.reset(o);if(this.o.ballOn===false){this.ball.p[0]=-1000;this.ball.p[1]=-1000;this.record();}return this;}
 stateAt(t,plan=this.planAt(t)){
  const s=super.stateAt(t,plan);if(!plan.aw)return s;
  const i=Math.max(0,Math.min(plan.n,Math.round((t-plan.t0)/DT)));s.w=plan.aw[i];s.h=plan.ah[i];s.turnRate=plan.ar[i];
  let m=null;for(const x of plan.am){if(x.t<=t+1e-9)m=x.m;else break;}s.motion=m;return s;
 }
 step(req){
  // BALL OFF is a movement probe: sample analog changes at up to 60 Hz, without
  // the TC resolver. BALL ON uses original request thresholds/commitment untouched.
  if(this.o.ballOn===false&&this.k%4===0&&req?.h!=null&&this.req?.h!=null&&Math.abs(wrap(req.h-this.plan.req.h))>.1*DEG)this.flags.replan='analog movement';
  return super.step(req);
 }
 replan(reason){
  if(this.o.ballOn!==false)return super.replan(reason);
  const st=this.stateAt(this.t,this.plan),keep=this.committed(this.plan,this.t),q=this.req;
  keep.contacts=[];
  const plan=this.mkPlan({t0:this.t,st,stances:null,contacts:[],action:{id:1,kind:'CARRY',label:'BODY MOVEMENT'},req:q,prog:{kind:'carry'},chKeys:this.carryChannels(st,q,this.t)});
  if(this.o.profile!=='CURRENT')for(const F of ['R','L']){
   keep.stances[F]=keep.stances[F].map(s=>({...s}));
   for(const stance of keep.stances[F])if(stance.t0<=this.t&&stance.t1>this.t){
    for(let dt=.025;dt<=Math.min(.32,stance.t1-this.t);dt+=DT){
     const x=this.stateAt(this.t+dt,plan),dx=stance.pos[0]-x.P[0],dy=stance.pos[1]-x.P[1],side=(-dx*Math.sin(x.psi)+dy*Math.cos(x.psi))*(F==='R'?1:-1);
     if(Math.hypot(dx,dy)>.60||side<-.05){stance.t1=Math.min(stance.t1,Math.max(this.t+.025,stance.t0+.06,this.t+dt));break;}
    }
   }
  }
  plan.stances=(this.o.profile==='CURRENT'?this.gaitFrom:bodyGaitFrom).call(this,plan,keep,[],this.t+1.5);plan.reason=reason;this.adopt(plan);
 }
 mkPlan(o){
  const profile=PROFILES[this.o?.profile||'CURRENT'];if(profile.id==='CURRENT')return super.mkPlan(o);
  const n=Math.round(1.5/DT),P=new Float64Array(2*(n+1)),V=new Float64Array(2*(n+1)),psi=new Float64Array(n+1),aw=new Float64Array(n+1),ah=new Float64Array(n+1),ar=new Float64Array(n+1),am=[];
  let pos=o.st.P.slice(),x={s:o.st.s,h:o.st.h,psi:o.st.psi,w:o.st.w||0,m:o.st.motion||null,turnRate:o.st.turnRate||0};let lastM;
  for(let i=0;i<=n;i++){
   const t=o.t0+i*DT;P[2*i]=pos[0];P[2*i+1]=pos[1];V[2*i]=x.s*Math.cos(x.h);V[2*i+1]=x.s*Math.sin(x.h);psi[i]=x.psi;aw[i]=x.w;ah[i]=x.h;ar[i]=x.turnRate;
   if(x.m!==lastM){am.push({t,m:x.m});lastM=x.m;}if(i===n)break;
   const d=this.progAt(o.prog,t+DT,x.s,x.h,o.req,pos);
   if(d.keyed){
    // Preserve the baseline's authored movement exactly whenever TC owns the path.
    x.s=d.s;x.turnRate=wrap(d.h-x.h)/DT;x.h=d.h;x.m=null;
    if(d.psi!=null){x.w=wrap(d.psi-x.psi)/DT;x.psi=d.psi;}
    else{const tgt=x.s>1?x.h:o.req?.h??x.psi,err=wrap(tgt-x.psi),a=Math.max(-9000*DEG,Math.min(9000*DEG,360*err-38*x.w));x.w=Math.max(-this.P.yawRate,Math.min(this.P.yawRate,x.w+a*DT));x.psi+=x.w*DT;}
   }else x=advance(x,d,t+DT,profile,this.P);
   pos=[pos[0]+x.s*Math.cos(x.h)*DT,pos[1]+x.s*Math.sin(x.h)*DT];
  }
  const plan={t0:o.t0,k0:Math.round(o.t0/DT),n,P,V,psi,aw,ah,ar,am,stances:o.stances,contacts:o.contacts,action:o.action,req:o.req,prog:o.prog};plan.ch=this.channels(o,plan);
  if(this.o.ballOn===false){
   // Presentation-only lean/crouch channels read the actual trajectory. No root
   // translation, foot proxy or simulation feedback. Original pose/IK is retained.
   const keys={lean:[],side:[],crouch:[],arms:[]},cl=(v,a,b)=>Math.max(a,Math.min(b,v));
   for(const dt of [.025,.06,.12,.20,.30,.45,.65,.9,1.2,1.5]){
    const i=Math.min(n-1,Math.round(dt/DT)),vx=V[2*i],vy=V[2*i+1],s=Math.hypot(vx,vy),ax=(V[2*i+2]-vx)/DT,ay=(V[2*i+3]-vy)/DT,h=ah[i],brake=Math.max(0,-ax*Math.cos(h)-ay*Math.sin(h)),lat=-ax*Math.sin(h)+ay*Math.cos(h),t=o.t0+dt;
    keys.lean.push([t,6+6*cl(s/6,0,1)-cl(brake*.5,0,12)]);keys.side.push([t,cl(lat*.55,-22,22)]);keys.crouch.push([t,.022+cl(brake*.006+Math.abs(lat)*.001,0,.065)]);keys.arms.push([t,.15+cl((brake+Math.abs(lat))/90,0,.35)]);
   }
   for(const [key,values] of Object.entries(keys))plan.ch[key]=new Curve([[o.t0,plan.ch[key].at(o.t0)],...values]);
  }
  return plan;
 }
}
