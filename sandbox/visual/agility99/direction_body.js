import {PlayBody} from '../tc_baseline_88573ef0/pt_body.js';
import {clearancesOf} from '../technical_control15/tc15_ref.js';
import {Q,legIK,swivelFor,footOut,ankleFor,ballGap} from '../technical_control11/tc11_leg.js';
import {SupportTimeline,clamp} from './support.js';
const DEG=Math.PI/180,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class DirectionBody extends PlayBody{
 constructor(env,sim){super(env,sim);this.support=new SupportTimeline(sim);}
 pose(t){const z=this.support.at(t),s=this.sim.stateAt(t),P=s.P.slice(),psi=z.psi,V=s.V,b=this.b,E=this.E,R3=E.R3,sp=s.s,run=clamp(sp/6,0,1),cy=z.cycle,rot={},feet=structuredClone(z.feet),gTw=(cy.sw==='R'?1:-1)*6*DEG*Math.sin(Math.PI*cy.u)*run;
 const lean=(6+6*run)*DEG,side=z.side*DEG,trunk=z.trunk*DEG,bob=-.014*run*Math.cos(2*Math.PI*(cy.u-.35));let pelvis=[0,b.pelvisY-.02-z.crouch+bob,0.015*run];const Rp=R3.mul3(R3.y(gTw),R3.x(lean*.3),R3.z(-side*.40));rot.pelvis=Rp;rot.spine=R3.mul3(R3.y(trunk*.45-gTw*.6),R3.x(lean*.3),R3.z(-side*.3));rot.chest=R3.mul3(R3.y(trunk*.55-gTw*.4),R3.x(lean*.4),R3.z(-side*.3));
 const swing=(20+28*run)*DEG*Math.sin(Math.PI*cy.u)*(cy.sw==='R'?1:-1);
 for(const X of ['R','L']){const sx=X==='R'?1:-1;rot['clavicle_'+X]=R3.I();rot['upperArm_'+X]=R3.mul3(R3.z(sx*(12+Math.abs(z.side)*.35)*DEG),R3.x(-sx*swing-8*DEG),R3.y(-sx*8*DEG));rot['foreArm_'+X]=R3.x(-(45+35*run)*DEG);rot['hand_'+X]=R3.x(-8*DEG);}
 rot.neck=R3.y(-trunk*.3);rot.head=R3.y(-trunk*.2);
 // A small COM compression is shared by the whole body before the leg solve.
 // It follows continuous targets, including the approaching swing, so touchdown
 // cannot suddenly switch on a pelvis/root reach correction.
 const nominalY=pelvis[1];for(const X of ['R','L']){const sx=X==='R'?1:-1,a=this.toM(feet[X].ank,P,psi),hip=Q.v(Rp,[sx*b.hipX,0,0]),dx=a[0]-hip[0],dz=a[2]-pelvis[2]-hip[2],vertical=Math.sqrt(Math.max(.1,(b.legLen*.985)**2-dx*dx-dz*dz));pelvis[1]=Math.min(pelvis[1],Math.max(nominalY-.075,a[1]+vertical-hip[1]));}
 const legs={};
 for(const X of ['R','L']){const f=feet[X],sx=X==='R'?1:-1,hip=Q.v(Rp,[sx*b.hipX,0,0]).map((x,i)=>x+pelvis[i]),an=this.toM(f.ank,P,psi),Rf=Q.mul3(Q.y(wrap(f.yaw-psi)),Q.x(-f.pitch),Q.z(f.roll)),sw=swivelFor(footOut(Rp,Rf,X),X)+f.kneeOut,ik=legIK(b,Rp,sw,hip,an,7*DEG),Rsh=Q.mul3(Rp,ik.Rthigh,Q.x(ik.k)),A=ankleFor(Rsh,Rf,X,ik.k);
 rot['thigh_'+X]=ik.Rthigh;rot['shin_'+X]=Q.mul(Q.x(ik.k),Q.y(A.tau));rot['foot_'+X]=Q.yxz(A.fy,A.fp,A.fr);rot['toe_'+X]=Q.I();legs[X]={short:ik.short,err:A.err,an,Rfoot:Q.mul(Rsh,Q.mul(Q.y(A.tau),Q.yxz(A.fy,A.fp,A.fr)))};}
 const pose={rot,pelvisPos:pelvis},fk=E.r1FK({body:b},pose,E.r1RootMatrix(P[0],P[1],psi,0),this.fk);this.fk=fk;const sk=b.skel,skin=new Float32Array(16*sk.bones.length);for(let i=0;i<fk.world.length;i++)skin.set(this.M4.mul(fk.world[i],sk.invBind[i]),i*16);const J={};for(const bn of sk.bones){const w=fk.joint[bn.idx],q=fk.tip[bn.idx];J[bn.name]={j:[w[0],-w[2],w[1]],t:[q[0],-q[2],q[1]]};}
 const ball=this.ballAt(t),gap={};if(this.hull)for(const X of ['R','L'])gap[X]=ballGap(this.hull[X],X,legs[X].Rfoot,this.toM(J['foot_'+X].j,P,psi),this.toM(ball,P,psi),.11);
 return{t,skin,J,pose,P,psi,V,feet,legs,ball,gap,clr:clearancesOf(J),support:z,plan:this.sim.planAt(t),reach:0};
 }
}
