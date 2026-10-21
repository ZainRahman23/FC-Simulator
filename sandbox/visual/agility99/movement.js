// AGILITY-99-V1: provisional behavior envelopes, not attribute multipliers.
// Existing acceleration gain and requested speed are supplied by the unchanged baseline.
export const DEG=Math.PI/180,DT=1/240;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=a=>{a=(a+Math.PI)%(2*Math.PI);return (a<0?a+2*Math.PI:a)-Math.PI;};
export const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const ANGLES=[0,15,30,45,60,90,120,150,165,180];
// Duration describes the travel reorientation at 8 m/s. Retention describes the
// available incoming speed at its completion. Retention is a ceiling, never a speed grant.
export const PROFILES={
 CURRENT:{id:'CURRENT',label:'Restored baseline',color:'#e5e9e6'},
 'A99-A':{id:'A99-A',label:'Composed elite',color:'#a5d9b1',time:[0,.09,.15,.23,.32,.48,.60,.66,.65,.64],retention:[1,.998,.985,.96,.89,.66,.43,.18,.055,0],stopTime:.57,faceTau:.047},
 'A99-B':{id:'A99-B',label:'Momentum first',color:'#edcc76',time:[0,.065,.115,.18,.255,.385,.49,.55,.535,.52],retention:[1,.999,.992,.975,.93,.77,.53,.24,.075,0],stopTime:.43,faceTau:.038},
 'A99-C':{id:'A99-C',label:'Aggressive ceiling',color:'#ff9b8d',time:[0,.04,.075,.12,.18,.275,.375,.445,.435,.42],retention:[1,1,.996,.985,.96,.84,.64,.30,.095,0],stopTime:.34,faceTau:.031}
};
// C1 interpolation: smooth transitions between investigation buckets, no hard angle gates.
function sample(values,angle){let i=0;while(i<ANGLES.length-2&&angle>ANGLES[i+1])i++;const u=clamp((angle-ANGLES[i])/(ANGLES[i+1]-ANGLES[i]),0,1);return values[i]+(values[i+1]-values[i])*ease(u);}
export function envelope(profile,angle,speed){
 const p=typeof profile==='string'?PROFILES[profile]:profile,v=clamp(speed/8,0,1),reversal=ease((angle-150)/30);
 // Compact low-speed corrections cost less momentum; a true reversal still loses all.
 const lossScale=(.35+.65*v)*(1-reversal)+reversal;
 return {duration:Math.max(.032,sample(p.time,angle)*(.58+.42*v)),retention:1-(1-sample(p.retention,angle))*lossScale};
}
function newMotion(st,h,t,p){
 const theta=h===null?0:wrap(h-st.h),a=Math.abs(theta)/DEG,e=h===null?{duration:Math.max(.12,p.stopTime*(.4+.6*st.s/8)),retention:0}:envelope(p,a,st.s);
 return {h0:st.h,target:h,s0:st.s,theta,angle:a,t0:t,duration:e.duration,retention:e.retention,rate0:st.turnRate||0,stop:h===null};
}
export function advance(state,drive,t,profile,params){
 let {s,h,psi,w,m}=state;const oldH=h,target=drive.h;
 if(!m||(m.target===null)!==(target===null)||(target!==null&&Math.abs(wrap(target-m.target))>1e-5))m=newMotion({s,h,turnRate:state.turnRate},target,t-DT,profile);
 const u=clamp((t-m.t0)/m.duration,0,1),angle=m.angle;
 // Increasing angular delay concentrates reorientation at lower speed for major cuts.
 // A true 180° reaches zero incoming speed before it gains any opposite speed.
 const reversal=ease((angle-120)/60),delay=.5*reversal;
 let hWanted=h;
 if(target!==null){
  const z=clamp((u-delay)/(1-delay),0,1),slope=m.rate0*m.duration*(1-delay);
  // Hermite continuation carries travel angular velocity through analog retargets.
  // A new small joystick sample must not repeatedly restart the turn from rest.
  hWanted=m.h0+m.theta*ease(z)+slope*z*(1-z)*(1-z);h=hWanted;
 }
 if(m.stop){s=Math.min(s,m.s0*(1-ease(u)));}
 else {
  const lossProgress=ease(u/(1-.28*reversal)),cap=m.s0*(1-(1-m.retention)*lossProgress);
  if(m.s0>.3&&u<1){s=Math.min(s,cap);}
  // No speed is restored by a changed request or a refreshed plan. Every positive
  // speed gain is bounded by the same baseline acceleration function.
  const acc=params.aAcc*clamp(1-s/11,.35,1),want=drive.speed;
  const canGain=m.s0<=.3||u>=1;
  if(s<want&&canGain)s=Math.min(want,s+acc*DT);
  else if(s>want)s=Math.max(want,s-params.aBrake*DT);
 }
 // Carry facing owns no root offset. Preserve angular velocity across replans.
 // Lead by at most 5 degrees while cutting, then critically damp to travel.
 const travelRate=wrap(h-oldH)/DT;
 const facingTarget=h+clamp(travelRate*.012,-5*DEG,5*DEG);
 const tau=profile.faceTau,omega=1/tau;
 const a=clamp(omega*omega*wrap(facingTarget-psi)+2*omega*(travelRate-w),-12000*DEG,12000*DEG);
 w=clamp(w+a*DT,-1200*DEG,1200*DEG);psi+=w*DT;
 return {s,h,psi,w,m,turnRate:travelRate};
}
