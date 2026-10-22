import {SCENARIO,HEALTH_LIMITS} from './config.js';
export function health(physical,s=SCENARIO){
 const dx=s.target[0]-s.origin[0],dz=s.target[2]-s.origin[2],l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l;
 const frames=physical.frames.filter(f=>f.time<=physical.metrics.firstFlightEndTime+1e-10);
 const speeds=frames.map(f=>Math.hypot(...f.v)),along=frames.map(f=>f.v[0]*ux+f.v[2]*uz),side=frames.map(f=>-f.v[0]*uz+f.v[2]*ux);
 const turns=frames.slice(1).map((f,i)=>{const a=frames[i],d=Math.atan2(f.v[2],f.v[0])-Math.atan2(a.v[2],a.v[0]);return Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))*180/Math.PI;});
 const m={scope:'Entire unopposed first airborne flight, including goal-to-first-turf segment',firstFlightEndTime:physical.metrics.firstFlightEndTime,
  minWorldForwardSpeed:Math.min(...frames.map(f=>f.v[0])),minTargetLineForwardSpeed:Math.min(...along),maxOffTargetHeadingDegrees:Math.max(...along.map((v,i)=>Math.abs(Math.atan2(side[i],v))*180/Math.PI)),
  maxWorldHeadingDegrees:Math.max(...frames.map(f=>Math.atan2(f.v[2],f.v[0])*180/Math.PI)),minWorldHeadingDegrees:Math.min(...frames.map(f=>Math.atan2(f.v[2],f.v[0])*180/Math.PI)),
  maxHeadingChangePerStepDegrees:Math.max(...turns),maxSpeed:Math.max(...speeds),launchSpeed:physical.metrics.launchSpeed,finite:physical.metrics.finite,
  targetError:physical.error,solverIterations:physical.iterations,ccdExhausted:physical.stats.ccdExhausted,inwardBeforeGoal:physical.action.spin[1]===0?physical.metrics.curvature.every(c=>Math.abs(c.normalAcceleration)<1e-8):physical.metrics.curvature.every(c=>c.normalAcceleration<0),preGoalTurfContact:physical.metrics.preGoalTurfContact,firstFlightCompleted:physical.metrics.firstFlightCompleted};
 const reasons=[];
 if(m.minWorldForwardSpeed<=0||m.minTargetLineForwardSpeed<=0)reasons.push('Forward reversal');
 if(m.maxOffTargetHeadingDegrees>=HEALTH_LIMITS.maxOffTargetHeadingDegrees)reasons.push('Lateral travel dominates progress toward the intended target');
 if(!m.finite||!m.firstFlightCompleted||m.ccdExhausted||!m.inwardBeforeGoal||m.preGoalTurfContact||m.maxHeadingChangePerStepDegrees>HEALTH_LIMITS.maxHeadingChangePer240HzStepDegrees||m.maxSpeed>m.launchSpeed+HEALTH_LIMITS.speedGainTolerance)reasons.push('Pathological physical flight');
 if(!physical.plane||m.targetError>=HEALTH_LIMITS.targetErrorMetres)reasons.push('Target not naturally resolved');
 return {...m,rejected:reasons.length>0,reasons};
}
