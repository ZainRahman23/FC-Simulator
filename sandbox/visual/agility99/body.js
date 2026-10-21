// Small BALL OFF swing-clearance adapter over the existing baseline body/IK.
// No root offsets or simulation feedback; no changes at planted feet or contacts.
import {PlayBody} from '../tc_baseline_88573ef0/pt_body.js';
export class Body99 extends PlayBody {
 footAt(F,t){
  const f=super.footAt(F,t);if(this.sim.o.ballOn!==false||this.sim.o.profile==='CURRENT'||f.planted||f.contact)return f;
  const plan=this.sim.planAt(t),list=plan.stances[F],prev=[...list].reverse().find(s=>s.t0<=t),next=list.find(s=>s.t0>t);
  if(!prev||!next||!Number.isFinite(prev.t1)||next.t0<=prev.t1)return f;
  const u=Math.max(0,Math.min(1,(t-prev.t1)/(next.t0-prev.t1))),weight=Math.sin(Math.PI*u),st=this.sim.stateAt(t),sx=F==='R'?1:-1,r=[-Math.sin(st.psi),Math.cos(st.psi)],lat=(f.ank[0]-st.P[0])*r[0]+(f.ank[1]-st.P[1])*r[1];
  const offset=Math.min(.12,Math.max(0,.14-sx*lat))*weight;
  return {...f,ank:[f.ank[0]+r[0]*sx*offset,f.ank[1]+r[1]*sx*offset,f.ank[2]+.02*weight],kneeOut:sx*18*Math.PI/180*weight,a99SwingOffset:offset};
 }
}
