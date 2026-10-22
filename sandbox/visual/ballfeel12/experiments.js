import {BallWorld,smooth,CONTACT_CONTROL,CURVE_CONTROL} from './world.js';
import {GLOBAL,DRIVEN,CURVES,PROPOSED} from './config.js';import {scheduledLaunch} from './resolver.js';
import {measure} from '../ballfeel1/experiments.js';import {SCENARIOS} from '../ballphys1/scenarios.js';import {len,cross} from '../ballphys1/math.js';
import {touchlineProjection} from '../ballfeel1/camera.js';
export function aeroDiagnostic(f,law){
 const v=len(f.v),w=Math.abs(f.w[1]),activation=smooth(law.spinStart,law.spinFull,w),late=1-smooth(law.lowSpeed,law.highSpeed,v),response=law.early+(law.gain-law.early)*late,windowed=law.fadeHigh>law.fadeLow?law.tail+(response-law.tail)*smooth(law.fadeLow,law.fadeHigh,v):response,spinScale=law.spinCap>0&&w>0?Math.min(1,law.spinCap/w):1,gain=1+activation*(windowed-1)*spinScale;
 const mag=cross(f.w,f.v),m=len(mag),S=GLOBAL.radius*m/Math.max(v*v,.01),cl=Math.min(GLOBAL.maxLift+(law.cap-GLOBAL.maxLift)*activation,GLOBAL.liftSlope*S*gain),k=.5*GLOBAL.airDensity*Math.PI*GLOBAL.radius**2/GLOBAL.mass;
 const a=m>0?mag.map(x=>x/m*k*cl*v*v):[0,0,0],h=Math.sqrt(f.v[0]**2+f.v[2]**2),lat=Math.sqrt(a[0]**2+a[2]**2),curvature=h>.1?Math.abs(f.v[0]*a[2]-f.v[2]*a[0])/(h*h*h):0;
 return {gain,cl,lateralAcceleration:f.mode==='AIRBORNE'?lat:0,curvature:f.mode==='AIRBORNE'?curvature:0};
}
function plane(samples,x){const i=samples.findIndex(f=>f.p[0]>=x);if(i<0)return null;const b=samples[i],a=samples[Math.max(0,i-1)],u=b.p[0]===a.p[0]?0:(x-a.p[0])/(b.p[0]-a.p[0]),mix=(x,y)=>x+(y-x)*u;return {distance:x,time:mix(a.time,b.time),lateral:mix(a.p[2],b.p[2]),height:mix(a.p[1],b.p[1])-.11,speed:len(b.v.map((v,j)=>mix(a.v[j],v))),spin:b.w.map((v,j)=>mix(a.w[j],v)),mode:b.mode};}
export function simulate({id,title=id,initial={},action,colliders=[],contactLaw=CONTACT_CONTROL,curveLaw=CURVE_CONTROL,target=25,duration=8,maxTime=45}={}){
 const world=new BallWorld({...initial,colliders,parameters:GLOBAL,contactLaw,curveLaw}),samples=[world.snapshot()];if(action)world.schedule(action);world.onSubstep=f=>samples.push(f);for(let i=0;i<maxTime*60;i++){world.step();if(world.ball.sleeping&&world.time>=duration)break;}
 const metrics=measure(samples,world.events,target,action),planes=Object.fromEntries([10,15,18,20,22,25,30].map(x=>[x,plane(samples,x)]));
 let skidTime=0,skidDistance=0,nearTurfSlipTime=0,nearTurfSlipDistance=0,rollingDistance=0,lastSlip=-1,peakAcceleration={value:0},peakCurvature={value:0},maxIncrement=0,path=0;const pathAt=new Map();
 const trace=[];for(let i=1;i<samples.length;i++){
  const f=samples[i],p=samples[i-1],dt=f.time-p.time,dx=Math.sqrt((f.p[0]-p.p[0])**2+(f.p[2]-p.p[2])**2),v=len(f.v),r=GLOBAL.radius,slipSpeed=len([f.v[0]+r*f.w[2],0,f.v[2]-r*f.w[0]]),physicalSlip=slipSpeed/Math.max(v,r*len(f.w),.05),aero=aeroDiagnostic(f,curveLaw);
  path+=dx;pathAt.set(f,path);
  if(f.mode==='SLIDING'){skidTime+=dt;skidDistance+=dx;lastSlip=i;}
  if(f.p[1]-.11<.01&&physicalSlip>.01&&v>.1){nearTurfSlipTime+=dt;nearTurfSlipDistance+=dx;}
  if(f.mode==='ROLLING')rollingDistance+=dx;
  if(aero.lateralAcceleration>peakAcceleration.value)peakAcceleration={value:aero.lateralAcceleration,time:f.time,x:f.p[0],z:f.p[2]};
  if(f.mode==='AIRBORNE'&&f.time<(metrics.firstLanding?.time??Infinity)&&aero.curvature>peakCurvature.value)peakCurvature={value:aero.curvature,time:f.time,x:f.p[0],z:f.p[2]};
  if(i>1&&f.mode===p.mode)maxIncrement=Math.max(maxIncrement,len(f.v.map((x,j)=>x-p.v[j])));
  if(i%4===0)trace.push({t:f.time,x:f.p[0],z:f.p[2],height:f.p[1]-.11,speed:v,v:f.v,w:f.w,slip:f.slip,physicalSlip,slipSpeed,mode:f.mode,...aero});
 }
 const lastSlide=samples[lastSlip],stableRoll=lastSlip>=0?samples.slice(lastSlip+1).find(f=>f.mode==='ROLLING'):samples.find(f=>f.mode==='ROLLING');
 const firstRoll=samples.find(f=>f.mode==='ROLLING'),P=touchlineProjection(1280,720,target/2),projected=samples.filter(f=>f.time<=duration).map(f=>({time:f.time,p:P(f.p).slice(0,2)}));
 Object.assign(metrics,{planes,skidTime,skidDistance,nearTurfSlipTime,nearTurfSlipDistance,firstRoll:firstRoll?{time:firstRoll.time,x:firstRoll.p[0],speed:len(firstRoll.v)}:null,stableRoll:stableRoll?{time:stableRoll.time,x:stableRoll.p[0],speed:len(stableRoll.v)}:null,rollingDistance,postTransitionDistance:stableRoll?path-(pathAt.get(stableRoll)??0):null,peakAcceleration,peakCurvature,minForwardVelocity:Math.min(...samples.map(f=>f.v[0])),maxForward:Math.max(...samples.map(f=>f.p[0])),maxIncrement});
 return {id,title,target,duration,frames:samples.filter(f=>f.time<=duration+1e-8),trace,events:world.events,metrics,contactLaw,curveLaw,parameters:GLOBAL,initial,action,colliders,stats:world.stats,projected};
}
export function drivenBracket(){return DRIVEN.map(c=>({...simulate({id:'driven-'+c.id,title:c.title,action:scheduledLaunch({family:'driven',power:.5,distance:25,actionId:'driven-'+c.id},{driven:c}),contactLaw:c.contact,duration:8}),candidate:c.title,note:c.note,definition:c}));}
export function curveBracket(){return CURVES.map(c=>({...simulate({id:'curve-'+c.id,title:c.title,action:scheduledLaunch({family:'curve',power:.5,distance:22,actionId:'curve-'+c.id},{curve:c}),curveLaw:c.law,target:22,duration:5}),candidate:c.title,note:c.note,definition:c}));}
export function makeScenario(input,options={}){const s=typeof input==='string'?SCENARIOS.find(x=>x.id===input):input;const w=new BallWorld({...s.initial,colliders:s.colliders,...PROPOSED,...options});if(s.action)w.schedule(s.action);return w;}
export function runScenario(input,options={}){const s=typeof input==='string'?SCENARIOS.find(x=>x.id===input):input;return simulate({...s,...PROPOSED,...options});}
export function parityPayload(){const runs=[];function capture(id,w,seconds){const frames=[];w.onSubstep=f=>frames.push(f);for(let i=0;i<seconds*60;i++)w.step();runs.push({id,frames,events:w.events});}
 for(const c of DRIVEN){const w=new BallWorld({contactLaw:c.contact});w.schedule(scheduledLaunch({family:'driven',actionId:c.id,distance:25},{driven:c}));capture('driven-'+c.id,w,10);}
 for(const c of CURVES){const w=new BallWorld({curveLaw:c.law});w.schedule(scheduledLaunch({family:'curve',actionId:c.id,distance:22},{curve:c}));capture('curve-'+c.id,w,12);}
 for(const s of SCENARIOS)capture(s.id,makeScenario(s),s.duration);
 for(const family of ['short','ground','firm','shot','power','loft','cross','chip'])for(const power of [.15,.5,1]){const w=new BallWorld(PROPOSED);w.schedule(scheduledLaunch({family,power,actionId:family+'-'+power}));capture(family+'-'+power,w,8);}
 return runs;
}
