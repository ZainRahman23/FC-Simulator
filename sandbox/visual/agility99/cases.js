import {stickVector,stickMode,headingFrom} from '../tc_baseline_88573ef0/pt_input.js';
import {AgilitySim,DT,DEG,PROFILES} from './sim.js';
export {AgilitySim,DT,DEG,PROFILES};
export function request(deg,mode='SPRINT'){
 const r=mode==='WALK'?.25:mode==='JOG'?.56:.95,v=stickVector(Math.sin((deg||0)*DEG)*r,Math.cos((deg||0)*DEG)*r);
 return {h:deg===null?null:headingFrom(0,v.x,v.y),mode:mode==='SPRINT'?'SPRINT':stickMode(v.r),keys:64|(mode==='SPRINT'?128:0)};
}
export function scenario(kind='snap',mode='SPRINT',angle=90,phase=0,sign=1){
 const t0=Math.round((4+phase)/DT)*DT,steps=[];let duration=4,fn;
 if(kind==='snap')steps.push([t0,sign*angle]);
 if(kind==='stop')steps.push([t0,null]);
 if(kind==='rapid'){for(let i=0;i<8;i++)steps.push([t0+i*.35,sign*(i%2?-60:60)]);steps.push([t0+2.8,0]);duration=4.2;}
 if(kind==='repeat30'){for(let i=0;i<8;i++)steps.push([t0+i*.45,sign*(i%2?-30:30)]);steps.push([t0+3.6,0]);duration=4.6;}
 if(kind==='sequence'){[90,0,-90,0].forEach((a,i)=>steps.push([t0+i*.6,sign*a]));duration=4;}
 if(kind==='gradual'||kind==='ramp-fast'){const ramp=kind==='gradual'?1.0:.15;fn=t=>t<t0?0:sign*90*Math.min(1,(t-t0)/ramp);steps.push([t0,sign*90]);}
 if(kind==='circle'||kind==='circle-fast'){const hz=kind==='circle'?.25:.75;fn=t=>t<t0?0:sign*360*hz*(t-t0);duration=4;}
 fn??=t=>{let a=0;for(const [s,v]of steps)if(t>=s-1e-9)a=v;return a;};
 return {id:`${mode}_${kind}${kind==='snap'?'_'+angle:''}_p${phase}_${sign>0?'R':'L'}`,kind,mode,angle,phase,sign,t0,duration,end:t0+duration,steps,fn};
}
export function run(env,spec,profile='CURRENT',ballOn=false,{straight=false}={}){
 const sim=new AgilitySim(env,{profile,ballOn}),ticks=[];
 for(let k=0;k<Math.round(spec.end/DT);k++){
  const t=k*DT,req=request(t<.2?null:straight?0:spec.fn(t),spec.mode);sim.step(req);const x=sim.stateAt(sim.t),b=sim.ball.p,plan=sim.plan;
  ticks.push({t:sim.t,p:x.P,v:x.V,s:x.s,h:x.h,psi:x.psi,b:b.slice(),bv:sim.ball.v.slice(),sep:Math.hypot(x.P[0]-b[0],x.P[1]-b[1]),req:sim.req.h,prog:plan.prog.kind,action:plan.action.kind,hold:!!(plan.prog.hold&&sim.t<plan.prog.hold.until),keyed:!!sim.progAt(plan.prog,sim.t,x.s,x.h,plan.req,x.P).keyed,future:plan.contacts.some(c=>!c.done&&c.t>=sim.t-1e-9)});
 }
 return {sim,ticks};
}
