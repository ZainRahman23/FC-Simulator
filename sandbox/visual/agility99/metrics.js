import {DT,DEG,wrap} from './sim.js';
const median=a=>a.length?a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)]:null;
const residual=(v,h)=>{if(h===null)return Math.hypot(...v);const c=Math.cos(h),s=Math.sin(h),along=Math.max(0,v[0]*c+v[1]*s);return Math.hypot(v[0]-along*c,v[1]-along*s);};
export function measure(main,spec,counterfactuals=[]){
 const T=main.ticks,sim=main.sim,entry=T[Math.round(spec.t0/DT)-1],modeSpeed=sim.P.speed[spec.mode],per=[];
 for(let i=0;i<spec.steps.length;i++){
  const [tc,deg]=spec.steps[i],tn=spec.steps[i+1]?.[0]??spec.end,start=T[Math.round(tc/DT)-1],h=deg===null?null:deg*DEG,angle=h===null?0:Math.abs(wrap(h-start.h))/DEG,tol=Math.min(10,Math.max(2,angle*.2))*DEG,initialResidual=residual(start.v,h);
  const q={inputTime:tc,requestedDeg:deg,entrySpeed:start.s,entryAngle:angle,toleranceDeg:tol/DEG,ack:null,old50:null,old90:null,newLine:null,directionalLine:null,recovery90:null,heading10:null,minSpeed:Infinity,speedAtLine:null,speedAfterLine025:null,speedAfterLine050:null,path:0,pathToLine:null,lateralMax:0,oldAxisProgress:0,tcOwnedSeconds:0};let lineStart=null,dirStart=null,recStart=null,prev=start,dist=0;
  const C=counterfactuals[i]?.ticks;
  for(let k=Math.round(tc/DT);k<T.length&&T[k].t<=tn+1e-9;k++){
   const x=T[k],dt=x.t-tc,e=h===null?0:Math.abs(wrap(x.h-h));
   if(C&&q.ack===null&&(Math.hypot(x.v[0]-C[k].v[0],x.v[1]-C[k].v[1])>=.05||Math.abs(wrap(x.psi-C[k].psi))>=1*DEG))q.ack=dt;
   const old=residual(x.v,h);if(q.old50===null&&old<=initialResidual*.5+.005)q.old50=dt;if(q.old90===null&&old<=initialResidual*.1+.005)q.old90=dt;
   const good=h===null?x.s<.3:e<=tol&&x.s>=modeSpeed*.6;
   if(good){lineStart??=x.t;if(q.newLine===null&&x.t-lineStart>=.06-1e-9)q.newLine=lineStart-tc;}else lineStart=null;
   const directionGood=h!==null&&e<=tol&&x.s>=.5;if(directionGood){dirStart??=x.t;if(q.directionalLine===null&&x.t-dirStart>=.06-1e-9)q.directionalLine=dirStart-tc;}else dirStart=null;
   const high=h!==null&&e<=tol&&x.s>=modeSpeed*.9;if(high){recStart??=x.t;if(q.recovery90===null&&x.t-recStart>=.06-1e-9)q.recovery90=recStart-tc;}else recStart=null;
   if(q.heading10===null&&x.s>=.5&&Math.abs(wrap(x.h-start.h))>=Math.min(10,Math.max(2,angle*.5))*DEG)q.heading10=dt;
   q.minSpeed=Math.min(q.minSpeed,x.s);dist+=Math.hypot(x.p[0]-prev.p[0],x.p[1]-prev.p[1]);
   if(h!==null)q.lateralMax=Math.max(q.lateralMax,Math.abs(-(x.p[0]-start.p[0])*Math.sin(h)+(x.p[1]-start.p[1])*Math.cos(h)));
   q.oldAxisProgress=Math.max(q.oldAxisProgress,(x.p[0]-start.p[0])*Math.cos(start.h)+(x.p[1]-start.p[1])*Math.sin(start.h));if(x.keyed||x.hold)q.tcOwnedSeconds+=DT;prev=x;
  }
  q.path=dist;q.failed=q.newLine===null;
  if(q.newLine!==null){const line=tc+q.newLine,k=Math.max(0,Math.round(line/DT)-1);q.speedAtLine=T[k].s;
   q.minSpeedToLine=Math.min(start.s,...T.slice(Math.round(tc/DT),k+1).map(x=>x.s));
   for(const [name,d]of [['speedAfterLine025',.25],['speedAfterLine050',.5]])if(line+d<=tn)q[name]=T[Math.min(T.length-1,Math.round((line+d)/DT)-1)].s;
   let last=start,dd=0;for(const x of T.slice(Math.round(tc/DT),k+1)){dd+=Math.hypot(x.p[0]-last.p[0],x.p[1]-last.p[1]);last=x;}q.pathToLine=dd;
  }
  q.retainedMin=q.minSpeed/(q.entrySpeed||1);per.push(q);
 }
 const A=T.slice(Math.round(spec.t0/DT)),made=sim.contacts.filter(c=>!c.missed),contacts=made.filter(c=>c.t>=spec.t0);let lost=0,onPrev=false,noFuture=0,lastTouch=0,j=0,lossSeconds=0;
 for(const x of T){while(j<made.length&&made[j].t<=x.t+1e-9){lastTouch=made[j].t;j++;}const atFeet=Math.hypot(...x.bv)<.3&&x.sep<.8;noFuture=x.req!==null&&!x.future&&!atFeet?noFuture+DT:0;const on=x.req!==null&&!atFeet&&(noFuture>.5||x.t-lastTouch>1.8);if(x.t>=spec.t0){if(on&&!onPrev)lost++;if(on)lossSeconds+=DT;}onPrev=on;}
 return {id:spec.id,kind:spec.kind,mode:spec.mode,angle:spec.angle,phase:spec.phase,sign:spec.sign,profile:sim.o.profile,ballOn:sim.o.ballOn,entrySpeed:entry.s,per,meanHeadingError:A.reduce((s,x)=>s+(x.req===null?0:Math.abs(wrap(x.h-x.req))/DEG),0)/A.length,minSpeed:Math.min(...A.map(x=>x.s)),maxSpeed:Math.max(...A.map(x=>x.s)),separationMedian:sim.o.ballOn?median(A.map(x=>x.sep)):null,separationMax:sim.o.ballOn?Math.max(...A.map(x=>x.sep)):null,losses:sim.o.ballOn?lost:null,lossSeconds:sim.o.ballOn?lossSeconds:null,touches:sim.o.ballOn?contacts.length:null,misses:sim.o.ballOn?sim.contacts.filter(c=>c.t>=spec.t0&&c.missed).length:null,techniques:sim.o.ballOn?Object.fromEntries([...new Set(contacts.map(c=>c.tech))].map(k=>[k,contacts.filter(c=>c.tech===k).length])):null,contacts:sim.o.ballOn?sim.contacts.map(c=>({t:c.t,F:c.F,tech:c.tech,role:c.role,missed:!!c.missed})):null,hash:sim.hash};
}
