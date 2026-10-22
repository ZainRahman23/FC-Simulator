import {BallWorld} from '../ballphys1/ball.js';
import {SCENARIOS,runScenario} from '../ballphys1/scenarios.js';
import {goal} from '../ballphys1/fixtures.js';
import {GLOBAL,FAMILIES,CANDIDATES,ENVIRONMENTS} from './config.js';
import {resolveLaunch,scheduledLaunch,resolveExecution} from './resolver.js';
import {dnorm} from '../physchar2/core/v2_math.js';
export function simulate({id,title,initial={},action,colliders=[],parameters=GLOBAL,target=0,duration=5,maxTime=45,record=true}){
 const w=new BallWorld({...initial,colliders,parameters}),frames=[],samples=[w.snapshot()];if(action)w.schedule(action);
 if(record)frames.push(w.snapshot());
 // Every measurement sees 240 Hz state; display stores 60 Hz snapshots, while
 // parity tests separately hash every 240 Hz unrounded snapshot.
 w.onSubstep=f=>samples.push(f);
 for(let n=0;n<maxTime*60;n++){w.step();if(record&&w.time<=duration+1e-7)frames.push(w.snapshot());if(w.ball.sleeping&&w.time>=duration)break;}
 const r={id,title,duration,target,frames,events:w.events,colliders,parameters,stats:w.stats,initial,action};r.metrics=measure(samples,w.events,target,action);return r;
}
export function measure(frames,events,target,action){
 const first=frames[0],last=frames.at(-1),launch=events.find(e=>e.kind==='AUTHORITATIVE_LAUNCH'),v=launch?.velocity??first.v,w=launch?.spin??first.w;
 const cross=frames.findIndex(f=>f.p[0]>=target);let arrival=null;
 if(target>0&&cross>=0){const b=frames[cross],a=frames[Math.max(0,cross-1)],u=b.p[0]===a.p[0]?0:(target-a.p[0])/(b.p[0]-a.p[0]),mix=(x,y)=>x+(y-x)*u;arrival={time:mix(a.time,b.time),speed:dnorm(...b.v.map((x,i)=>mix(a.v[i],x))),height:mix(a.p[1],b.p[1])-.11,lateral:mix(a.p[2],b.p[2]),mode:b.mode};}
 let path=0,prev=action?.position??[0,.11,0];for(const f of frames){path+=dnorm(f.p[0]-prev[0],f.p[2]-prev[2]);prev=f.p;}
 const bounces=events.filter(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf'),landing=bounces[0];
 return {launchSpeed:dnorm(...v),horizontalSpeed:dnorm(v[0],v[2]),launchAngle:Math.atan2(v[1],dnorm(v[0],v[2]))*180/Math.PI,spin:w,spinRps:dnorm(...w)/(2*Math.PI),arrival,apex:Math.max(...frames.map(f=>f.p[1]))-.11,firstLanding:landing?{time:landing.time,x:landing.point[0],z:landing.point[2],outSpeed:dnorm(...landing.velocity)}:null,bounces:bounces.length,rollingAt:frames.find(f=>f.mode==='ROLLING')?.time??null,stopTime:last.sleeping?frames.find(f=>f.sleeping).time:null,range:dnorm(last.p[0],last.p[2]),forwardRange:last.p[0],pathLength:path,maxLateral:Math.max(...frames.map(f=>Math.abs(f.p[2]))),settled:last.sleeping,speedAt1s:dnorm(...(frames.find(f=>f.time>=1)?.v??last.v))};
}
export function actionExperiment(family,candidate='balanced',parameters=GLOBAL,extra={}){
 const f=FAMILIES[family],c=CANDIDATES.find(c=>c.id===candidate),intent={family,actionId:`${family}-${candidate}`,power:c.power,distance:f.distance,...(family==='curve'?{curve:{slow:.25,balanced:.65,fast:1}[candidate]}:{}),...extra};
 const action=scheduledLaunch(intent,{},parameters),r=simulate({id:intent.actionId,title:f.title,action,parameters,target:intent.distance,duration:f.seconds});r.family=family;r.candidate=candidate;r.intent=intent;r.launch=resolveLaunch(intent,parameters);
 // Metrics are untouched. Goal-frame version is a separate physical run;
 // free flight remains available to inspect range, even after the goal line.
 if(f.shot){const g=simulate({id:r.id,title:r.title,action,parameters,target:intent.distance,duration:f.seconds,colliders:goal(intent.distance),maxTime:f.seconds});r.displayFrames=g.frames;r.displayEvents=g.events;r.colliders=g.colliders;}
 return r;
}
export function lowSpeed(speed,parameters=GLOBAL){const r=simulate({id:`low-${speed}`,title:`${speed} m/s`,initial:{v:[speed,0,0],w:[0,0,-speed/parameters.radius]},parameters,duration:2,maxTime:15});r.separation=Object.fromEntries([.1,.25,.5,1].map(t=>[t,r.frames.find(f=>f.time>=t-1e-8).p[0]]));return r;}
export function globalExperiments(){const action=scheduledLaunch({family:'ground',power:.5,distance:15,actionId:'same-launch'});return Object.entries(ENVIRONMENTS).map(([id,parameters])=>({id,parameters,roll:[3,6,10].map(speed=>({speed,...simulate({id:'roll',initial:{v:[speed,0,0],w:[0,0,-speed/.11]},parameters,duration:2,record:false}).metrics})),pass:simulate({id,title:id+' global surface',action,parameters,target:15,duration:4}),drop:runScenario('drop-2',{parameters}),slide:runScenario('slide-roll',{parameters})}));}
export function parityPayload(){
 const runs=[];
 const capture=(id,w,seconds)=>{const frames=[];w.onSubstep=f=>frames.push(f);for(let n=0;n<seconds*60;n++)w.step();runs.push({id,frames,events:w.events});};
 for(const [family,f] of Object.entries(FAMILIES))for(const c of CANDIDATES){const w=new BallWorld({parameters:GLOBAL});w.schedule(scheduledLaunch({family,power:c.power,distance:f.distance,actionId:`${family}-${c.id}`,execution:resolveExecution({family,seed:73421,actionId:`${family}-${c.id}`,quality:.72,pressure:.4})}));capture(`${family}-${c.id}`,w,4);}
 for(const s of SCENARIOS){const w=new BallWorld({...s.initial,colliders:s.colliders,parameters:GLOBAL});if(s.action)w.schedule(s.action);capture(s.id,w,s.duration);}
 return runs;
}
