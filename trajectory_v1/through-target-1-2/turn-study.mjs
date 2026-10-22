import fs from 'node:fs';
import {FootballNavigator,wrap,NAV_REFERENCE} from './navigation.mjs';
import {MotionPlan,DT} from './foundation/sandbox/visual/technical_control1/tc_motion.js';
import {techParams} from './foundation/sandbox/visual/technical_control1/tc_attrs.js';
export const ANGLES=[15,30,45,60,90,120,150,180],SPEEDS={jog:3,run:5.5,sprint:8.2};
export function correction(angle,speed,mode){
 const theta=angle*Math.PI/180,target=[20*Math.cos(theta),0,20*Math.sin(theta)],ag=techParams({agi:99}).agi,nav=mode==='new'?new FootballNavigator():null;
 let st={t:0,P:[0,0],V:[speed,0],psi:0,w:0},next=0,plan,frames=[],pathLength=0,maxLateral=0,brakingDistance=null,faceTime=null,lineTime=null,faceStart=null,lineStart=null,minSpeed=speed,prior=st.P;
 const frame=()=>frames.push({time:st.t,p:[...st.P],v:[...st.V],heading:st.psi,navigation:nav?.snapshot()??{phase:'RUN',kind:'CURRENT'}});frame();
 for(let k=0;k<12/DT;k++){
  if(st.t>=next-1e-9){const th=Math.atan2(target[2]-st.P[1],target[0]-st.P[0]);plan=new MotionPlan(st,ag,.2).build({kind:'RUN',theta:th,v:speed});nav?.replan(st,{position:target,commandTheta:th,plan},speed);next=st.t+.15;}
  const prevPhase=nav?.phase;
  if(nav)st=nav.step(st,(k+1)*DT);else{const t=(k+1)*DT,s=plan.at(t);st={t,...s,w:plan.w[plan.idx(t)]};}
  const sp=Math.hypot(...st.V);minSpeed=Math.min(minSpeed,sp);pathLength+=Math.hypot(st.P[0]-prior[0],st.P[1]-prior[1]);prior=st.P;
  maxLateral=Math.max(maxLateral,Math.abs(-Math.sin(theta)*st.P[0]+Math.cos(theta)*st.P[1]));
  if(nav&&prevPhase==='BRAKE'&&nav.phase==='PLANT'&&brakingDistance===null)brakingDistance=pathLength;
  const to=Math.atan2(target[2]-st.P[1],target[0]-st.P[0]),faceOK=Math.abs(wrap(st.psi-to))<=10*Math.PI/180,lineOK=sp>=speed*.9&&Math.abs(wrap(Math.atan2(st.V[1],st.V[0])-to))<=10*Math.PI/180;
  faceStart=faceOK?(faceStart??st.t):null;lineStart=lineOK?(lineStart??st.t):null;
  if(faceTime===null&&faceStart!==null&&st.t-faceStart>=.1-1e-9)faceTime=faceStart;
  if(lineTime===null&&lineStart!==null&&st.t-lineStart>=.1-1e-9)lineTime=lineStart;
  if(k%4===3)frame();
  if(Math.hypot(target[0]-st.P[0],target[2]-st.P[1])<=.5)break;
 }
 if(frames.at(-1).time!==st.t)frame();const directDistance=Math.hypot(...st.P);
 return {angle,speed,mode,target,frames,events:nav?.events??[],metrics:{brakingDistance,maximumLateralExcursion:maxLateral,timeToFace:faceTime,timeOntoNewLine:lineTime,pathLength,directDistance,pathRatio:pathLength/directDistance,minSpeed,arrivalTime:st.t,reached:Math.hypot(target[0]-st.P[0],target[2]-st.P[1])<=.5}};
}
if(process.argv[1]?.endsWith('/turn-study.mjs')){
const runs=[];for(const [pace,speed] of Object.entries(SPEEDS))for(const angle of ANGLES){const current=correction(angle,speed,'current'),candidate=correction(angle,speed,'new');runs.push({pace,angle,speed,current,candidate});console.log(JSON.stringify({pace,angle,current:current.metrics,candidate:candidate.metrics}));}
fs.writeFileSync(new URL('turn-study.json',import.meta.url),JSON.stringify({profile:NAV_REFERENCE,definitions:{targetDistance:20,arrivalRadius:.5,face:'Within 10 degrees of the direction from current position to fixed target, sustained 0.10s.',ontoLine:'At least 90% of starting/requested speed and velocity within 10 degrees of current target direction, sustained 0.10s.',lateral:'Maximum perpendicular distance from the direct start-to-target line over the approach.',braking:'Path travelled to first plant. Null means no deliberate braking phase.',ratio:'Travelled path divided by direct start-to-observed-endpoint distance.'},runs}));

}
