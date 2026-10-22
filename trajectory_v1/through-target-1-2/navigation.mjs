// Authored football navigation only. No ball, target-selection or feasibility code.
export const NAV_REFERENCE=Object.freeze({name:'neutral/high reference',brake:18,redirect:22,pushAcceleration:9,hipRate:720*Math.PI/180,hipAcceleration:5400*Math.PI/180,smoothAngle:30*Math.PI/180,retargetRestart:45*Math.PI/180,plantMin:.035,plantMax:.09});
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),len=Math.hypot,smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
function retained(deg){const knots=[[0,1],[30,.95],[60,.65],[90,.30],[120,.12],[150,.04],[180,0]];for(let k=1;k<knots.length;k++)if(deg<=knots[k][0]){const [a,x]=knots[k-1],[b,y]=knots[k];return x+(y-x)*smooth((deg-a)/(b-a));}return 0;}
function advanceVector(v,to,amount){const d=[to[0]-v[0],to[1]-v[1]],m=len(...d);return m<=amount?to.slice():v.map((x,k)=>x+d[k]*amount/m);}
function yaw(st,theta,dt,p){const e=wrap(theta-st.psi),wanted=Math.sign(e)*Math.min(p.hipRate,Math.sqrt(2*p.hipAcceleration*Math.abs(e)),Math.abs(e)/dt);const w=clamp(wanted,(st.w??0)-p.hipAcceleration*dt,(st.w??0)+p.hipAcceleration*dt);return {psi:st.psi+w*dt,w};}
export class FootballNavigator{
 constructor(profile=NAV_REFERENCE){this.profile=profile;this.phase='RUN';this.target=null;this.theta=0;this.events=[];this.runPlan=null;this.started=0;this.entry=0;this.exit=0;this.initialAngle=0;this.kind='SMOOTH';}
 event(kind,t,st){this.events.push({kind,time:t,position:[st.P[0],0,st.P[1]],speed:len(...st.V),heading:st.psi,target:this.target?.slice()});}
 replan(st,meeting,sprint){
  if(!meeting)return;this.target=meeting.position.slice();this.sprint=sprint;
  const theta=Math.atan2(this.target[2]-st.P[1],this.target[0]-st.P[0]),speed=len(...st.V),heading=speed>.5?Math.atan2(st.V[1],st.V[0]):st.psi,angle=Math.abs(wrap(theta-heading)),active=['BRAKE','PLANT','REDIRECT'].includes(this.phase),targetShift=Math.abs(wrap(theta-this.theta));
  // Preserve an ongoing plant/cut across ordinary 150ms target refinements.
  if(active&&targetShift<=this.profile.retargetRestart){this.theta=theta;return;}
  if(angle<=this.profile.smoothAngle){
   this.theta=meeting.commandTheta??theta;
   if(this.phase==='RUN'){this.runPlan=meeting.plan??null;this.kind='SMOOTH';}
   else {this.theta=theta;this.runPlan=null;}
   return;
  }
  this.theta=theta;this.runPlan=null;this.initialAngle=angle;this.started=st.t;
  const deg=angle*180/Math.PI;this.kind=deg<75?'RUNNING_CUT':deg<120?'HARD_CUT':'REVERSAL';
  this.entry=speed*retained(deg);this.exit=Math.min(sprint,Math.max(2.2,this.entry));this.plantDuration=this.profile.plantMin+(this.profile.plantMax-this.profile.plantMin)*smooth((deg-30)/150);
  this.phase=speed>this.entry+.03?'BRAKE':'PLANT';this.phaseAt=st.t;this.event(this.phase,st.t,st);
 }
 step(st,time){
  const dt=time-st.t,p=this.profile;
  if(this.phase==='RUN'&&this.runPlan){const m=this.runPlan,s=m.at(time);return {t:time,...s,w:m.w[m.idx(time)]};}
  let v=st.V.slice();const speed=len(...v),u=[Math.cos(this.theta),Math.sin(this.theta)];
  if(this.phase==='BRAKE'){
   const next=Math.max(this.entry,speed-p.brake*dt);v=speed>0?v.map(x=>x*next/speed):[0,0];
   if(next<=this.entry+1e-8){this.phase='PLANT';this.phaseAt=time;this.event('PLANT',time,{...st,V:v});}
  }else if(this.phase==='PLANT'){
   // A support step holds the deliberately reduced entry speed, not a full-speed arc.
   if(time-this.phaseAt>=this.plantDuration&&Math.abs(wrap(this.theta-st.psi))<=20*Math.PI/180){this.phase='REDIRECT';this.phaseAt=time;this.event('PUSH_OFF',time,st);}
  }else if(this.phase==='REDIRECT'){
   const target=u.map(x=>x*this.exit);v=advanceVector(v,target,p.redirect*dt);
   if(len(v[0]-target[0],v[1]-target[1])<1e-8){this.phase='ACCELERATE';this.phaseAt=time;this.event('ACCELERATE',time,{...st,V:v});}
  }else{
   v=advanceVector(v,u.map(x=>x*this.sprint),p.pushAcceleration*dt);
   if(this.phase==='ACCELERATE'&&len(...v)>=.98*this.sprint&&Math.abs(wrap(Math.atan2(v[1],v[0])-this.theta))<3*Math.PI/180){this.phase='RUN';this.runPlan=null;this.event('SPRINT',time,{...st,V:v});}
  }
  // Integrate the authored velocity change. Never snap root position or rotate a moving velocity instantly.
  const P=st.P.map((x,k)=>x+(st.V[k]+v[k])*.5*dt),body=yaw(st,this.theta,dt,p);
  return {t:time,P,V:v,...body};
 }
 snapshot(){return {phase:this.phase,kind:this.kind,target:this.target?.slice(),targetHeading:this.theta,correctionDegrees:this.initialAngle*180/Math.PI,entrySpeed:this.entry,exitSpeed:this.exit,started:this.started,profile:this.profile.name};}
}
