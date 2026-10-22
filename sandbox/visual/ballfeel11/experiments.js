import {BallWorld,LAWS,resistance} from './world.js';
import {GLOBAL,BALANCED,FAMILIES,SPEEDS,CURVES} from './config.js';
import {resolveLaunch,scheduledLaunch,resolveExecution} from './resolver.js';
import {resolveLaunch as previousLaunch} from '../ballfeel1/resolver.js';
import {measure} from '../ballfeel1/experiments.js';
import {SCENARIOS} from '../ballphys1/scenarios.js';
import {goal} from '../ballphys1/fixtures.js';
import {dnorm} from '../physchar2/core/v2_math.js';
export function simulate({id,title=id,initial={},action,colliders=[],parameters=GLOBAL,rollingLaw=LAWS.responsive,target=0,duration=7,maxTime=60,record=true}){
 const world=new BallWorld({...initial,colliders,parameters,rollingLaw}),frames=[world.snapshot()],samples=[world.snapshot()];
 if(action)world.schedule(action);
 world.onSubstep=s=>samples.push(s);
 for(let i=0;i<maxTime*60;i++){world.step();if(record&&world.time<=duration+1e-7)frames.push(world.snapshot());if(world.ball.sleeping&&world.time>=duration)break;}
 const metrics=measure(samples,world.events,target,action);
 metrics.slideDuration=0;metrics.rollDuration=0;metrics.motionStopTime=null;
 for(let i=1;i<samples.length;i++){const f=samples[i],dt=f.time-samples[i-1].time;if(!f.sleeping){if(f.mode==='SLIDING')metrics.slideDuration+=dt;if(f.mode==='ROLLING')metrics.rollDuration+=dt;}}
 // Translation can settle before high sidespin stops. Report both explicitly.
 const moving=samples.findLastIndex(f=>dnorm(...f.v)>=parameters.restSpeed);
 metrics.motionStopTime=samples[Math.min(samples.length-1,moving+1)].time;
 const launchV=world.events.find(e=>e.kind==='AUTHORITATIVE_LAUNCH')?.velocity??samples[0].v;
 const startSpeed=dnorm(launchV[0],launchV[2]),trace=[{time:0,speed:startSpeed,deceleration:null,rollingResistance:resistance(startSpeed,rollingLaw),mode:samples[0].mode}];
 for(let i=1;i<samples.length;i+=4){const f=samples[i],prev=samples[i-1],v=dnorm(f.v[0],f.v[2]),before=i===1?startSpeed:dnorm(prev.v[0],prev.v[2]);trace.push({time:f.time,speed:v,deceleration:(before-v)/(f.time-prev.time),rollingResistance:resistance(v,rollingLaw),mode:f.mode});}
 return {id,title,target,duration,frames,events:world.events,colliders,parameters,rollingLaw,initial,action,metrics,trace,stats:world.stats};
}
export function groundMatrix(){return SPEEDS.flatMap(s=>Object.values(LAWS).map(law=>{
 const speed=s.id==='balanced'?previousLaunch({family:'ground',power:.5,distance:15}).velocity[0]:s.speed;
 const id=`ground-${s.id}-${law.id}`,action={id,tick:0,position:[0,.11,0],velocity:[speed,0,0],spin:[0,0,-speed/.11]};
 const r=simulate({id,title:`${s.label} · ${law.label}`,action,target:15,rollingLaw:law,duration:13});return {...r,candidate:s.label,launchBand:s.id,decay:law.id};
}));}
export function curveBracket(){return CURVES.map(c=>({...simulate({id:`curve-${c.id}`,title:c.label,action:{id:`curve-${c.id}`,tick:0,position:[0,.11,0],velocity:[22.5,6.9,0],spin:[0,c.spin,0]},target:22,duration:4}),candidate:c.label,curveBand:c.id}));}
export function actionExperiment(family,{power=.5,distance=FAMILIES[family].distance,...extra}={}){
 const id=`action-${family}-${power}-${distance}`,intent={family,power,distance,actionId:id,...extra},action=scheduledLaunch(intent),launch=resolveLaunch(intent);
 const r=simulate({id,title:FAMILIES[family].title,action,target:distance,duration:family==='chip'?5:6});
 if(FAMILIES[family].shot){const display=simulate({id,title:r.title,action,target:distance,duration:r.duration,maxTime:r.duration,colliders:goal(distance)});r.displayFrames=display.frames;r.displayEvents=display.events;r.colliders=display.colliders;}
 return {...r,family,intent,launch,candidate:power===.5?'FAST center':power===1?'FAST+ ceiling':'FAST lower'};
}
export function lowSpeed(speed){const r=simulate({id:`low-${speed}`,title:`Free ball · ${speed} m/s`,initial:{v:[speed,0,0],w:[0,0,-speed/.11]},target:5,duration:2});r.separation=Object.fromEntries([.1,.25,.5,1].map(t=>[t,r.frames.find(f=>f.time>=t-1e-8).p[0]]));return r;}
export function makeScenario(input,options={}){const s=typeof input==='string'?SCENARIOS.find(s=>s.id===input):input;if(!s)throw Error('Unknown scenario');const w=new BallWorld({...s.initial,colliders:s.colliders,parameters:GLOBAL,...options});if(s.action)w.schedule(s.action);return w;}
export function runScenario(input,options={}){const s=typeof input==='string'?SCENARIOS.find(s=>s.id===input):input;return simulate({...s,target:s.targetDistance??0,...options});}
export function parityPayload(){
 const runs=[],capture=(id,w,seconds)=>{const frames=[];w.onSubstep=f=>frames.push(f);for(let i=0;i<seconds*60;i++)w.step();runs.push({id,frames,events:w.events});};
 for(const r of groundMatrix()) {const w=new BallWorld({parameters:r.parameters,rollingLaw:r.rollingLaw});w.schedule(r.action);capture(r.id,w,14);}
 for(const r of curveBracket()){const w=new BallWorld({parameters:GLOBAL});w.schedule(r.action);capture(r.id,w,12);}
 for(const [family,f] of Object.entries(FAMILIES))for(const power of [.15,.5,1]){const w=new BallWorld({parameters:GLOBAL});w.schedule(scheduledLaunch({family,power,distance:f.distance,actionId:`${family}-${power}`,execution:resolveExecution({family,seed:73421,actionId:`${family}-${power}`,quality:.72,pressure:.4})}));capture(`${family}-${power}`,w,4);}
 for(const s of SCENARIOS)capture(s.id,makeScenario(s),s.duration);
 return runs;
}
