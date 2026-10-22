import {BallWorld,crossing} from './aim.js';
import {goal} from '../ballphys1/fixtures.js';
import {len} from '../ballphys1/math.js';
import {PROFILE} from './config.js';
import {keeperFor,toLegacy,physicalPoint,keeperSnapshot} from './keeper.js';
const DT=1/60,H=DT/4;
export const frame=()=>goal(105).map(c=>({...c,p:[c.p[0],c.p[1],c.p[2]+34]}));
export const onTarget=c=>!!c&&Math.abs(c.p[2]-34)<=3.55+1e-7&&c.p[1]>=.11-1e-7&&c.p[1]<=2.33+1e-7;
// The current keeper owns its 12-sample linear TOI and contact response. Only
// after that real contact, finish the remaining frame with the unchanged world
// methods at <=1/240s. The no-contact path calls the original step() verbatim.
function remainder(w,end){
 const b=w.ball,c=w.cfg;
 while(w.time<end-1e-10){const next=(Math.floor((w.time+1e-10)/H)+1)*H,h=Math.min(next,end)-w.time,supported=b.p[1]<=c.radius+2e-6&&b.v[1]<=.025;
  if(supported){b.p[1]=c.radius;b.v[1]=0;}w.air(h,supported);if(supported)w.ground(h);else{b.mode='AIRBORNE';b.slip=0;b.groundContact=null;}w.drift(h);w.stats.substeps++;
  const settled=b.p[1]<=c.radius+2e-6&&len(b.v)<c.restSpeed&&len(b.w)<c.restSpin;w.restTime=settled?w.restTime+h:0;
  if(w.restTime>=c.restDwell){b.v=[0,0,0];b.w=[0,0,0];b.p[1]=c.radius;b.sleeping=true;b.mode='REST';}
  if(b.p[1]>c.radius+2e-6||b.v[1]>.025)b.mode='AIRBORNE';if(w.onSubstep)w.onSubstep(w.snapshot());
 }w.tick++;w.time=w.tick*w.dt;w.stats.steps++;
}
function compactContact(c,time){return {t:time,clock:c.tickT,surface:c.surface,volume:c.volume,outcome:c.outcome,held:c.held,point:physicalPoint(c.exact.point),keeperPoint:physicalPoint(c.exact.keeperPoint),vIn:physicalPoint(c.exact.velocityIn),vOut:physicalPoint(c.vOut),normal:physicalPoint(c.respNormal),quality:{norm:c.q.norm,catchScore:c.q.catchScore,catchThreshold:c.q.catchThresh,controlScore:c.q.controlScore,controlThreshold:c.q.ctrlThresh,stable:c.q.cStable,jitter:c.q.jitter,support:c.q.support,u:c.q.u,fingertip:c.q.fingertip,relativeSpeed:c.q.sRel},remaining:c.remDt};}
function classify({goal,contacts,free,frameHit,whole,rest,exhausted}){
 if(goal)return contacts.length?'GK CONTACT BUT GOAL':'GOAL';
 if(!onTarget(free.whole))return frameHit&&!contacts.length?'POST/CROSSBAR WITHOUT GK':'MISS';
 if(!contacts.length)return frameHit?'POST/CROSSBAR WITHOUT GK':exhausted?'UNRESOLVED':'MISS';
 if(contacts.some(c=>c.held))return 'CLEAN CATCH';
 if(exhausted)return 'UNRESOLVED';
 if(whole&&!onTarget(whole))return 'DEFLECTION WIDE/OVER';
 if(contacts.at(-1).outcome==='CONTROLLED PARRY')return 'CONTROLLED PARRY';
 return 'DANGEROUS PARRY';
}
export function runShot(solution,{profile=PROFILE,enabled=true,record=false,horizon=10}={}){
 const reference=solution.plane??solution.aimPlane,action=solution.action,origin=action.position,{api,t,set}=keeperFor(origin,profile),g=t.gk,w=new BallWorld({p:origin,colliders:frame()});
 const kickoff=w.launch(action);if(kickoff.kind!=='AUTHORITATIVE_LAUNCH')throw Error('Shot launch cancelled');t.kick={kicked:true};
 let plane=null,whole=null,keeperPlane=null,goalScored=false,firstDecision=null,firstMove=null,ready=null,prep=null,commit=null,frameHit=false,landing=null,closest={distance:1e9,t:null},predictionAtReady=null,predictionAtCommit=null,maxAdvance=0,maxRetreat=0,movement=0,rootAtArrival=null,priorRoot=set.slice(),observedTime=0;
 const contacts=[],frames=record?[{...w.snapshot(),keeper:keeperSnapshot(g)}]:null;let previous=w.snapshot();
 const observer=f=>{
  if(!plane)plane=crossing(previous,f,105);if(!whole)whole=crossing(previous,f,105.11);if(!keeperPlane)keeperPlane=crossing(previous,f,set[0]);
  if(onTarget(whole))goalScored=true;
  if(!rootAtArrival&&f.time>=reference.t)rootAtArrival=[g.x,g.y];
  const hand=physicalPoint(g.handNow),d=Math.hypot(...f.p.map((v,i)=>v-hand[i]));if(d<closest.distance)closest={distance:d,t:f.time,ball:f.p.slice(),hand};
  if(record)frames.push({...f,keeper:keeperSnapshot(g)});previous=f;
 };
 w.onSubstep=observer;
 for(let i=0;i<Math.ceil(horizon/DT);i++){
  const start=i*DT;t.now=(i+1)*DT;t.b=toLegacy(w.ball);api.update(t);
  if(firstDecision===null&&g.shotActive)firstDecision=t.now;
  if(ready===null&&g.reactRemain<=0){ready=t.now;predictionAtReady=g.predict?.crossing?{...g.predict.crossing,absoluteTime:t.now+g.predict.crossing.t}:null;}
  const moved=Math.hypot(g.x-priorRoot[0],g.y-priorRoot[1]);movement+=moved;if(firstMove===null&&moved>1e-7)firstMove=t.now;priorRoot=[g.x,g.y];
  maxAdvance=Math.max(maxAdvance,set[0]-g.x);maxRetreat=Math.max(maxRetreat,g.x-set[0]);
  if(!prep&&g.prepared)prep={t:t.now,target:g.prepTarget?.slice()};
  if(!commit&&g.committed){commit=structuredClone(g.committed);predictionAtCommit=g.predict?.crossing?{...g.predict.crossing,absoluteTime:t.now+g.predict.crossing.t}:null;}
  const contact=enabled?api.contact(t,t.b):null;
  if(contact){
   const ct=start+contact.exact.fraction*DT,c=compactContact(contact,ct);contacts.push(c);
   // Test line crossing BEFORE contact too: a late touch cannot erase a goal.
   observer({time:ct,p:physicalPoint(contact.exact.point),v:w.ball.v.slice(),w:w.ball.w.slice()});
   w.time=ct;w.ball.p=[t.b.x,t.b.z,t.b.y];w.ball.v=[t.b.vx,t.b.vz,t.b.vy];w.ball.sleeping=false;w.restTime=0;
   // Legacy keeper has no angular impulse. Retain physical angular velocity;
   // its obsolete b.curve=null cannot replace or zero the new spin vector.
   w.emit('GOALKEEPER_CONTACT',{contact:c});previous=w.snapshot();
   if(contact.held){if(record)frames.push({...w.snapshot(),held:true,keeper:keeperSnapshot(g)});observedTime=ct;break;}
   remainder(w,(i+1)*DT);
  }else w.step();
  observedTime=w.time;
  if(!landing){const e=w.events.find(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf');if(e)landing={t:e.time,p:e.point};}
  if(w.events.some(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider!=='turf'))frameHit=true;
  if(goalScored||whole||w.ball.sleeping)break;
 }
 const exhausted=observedTime>=horizon-1e-7&&!whole&&!w.ball.sleeping&&!contacts.some(c=>c.held),outcome=classify({goal:goalScored,contacts,free:solution,frameHit,whole,rest:w.ball.sleeping,exhausted}),saved=['CLEAN CATCH','CONTROLLED PARRY','DANGEROUS PARRY','DEFLECTION WIDE/OVER'].includes(outcome);
 const actualIntercept=contacts[0]?.point??null,actualTime=contacts[0]?.t??null,moveBefore=actualTime==null?null:Math.max(0,actualTime-(firstMove??actualTime)),reactWindow=(actualTime??reference.t)-(firstDecision+(g.latency??0));
 let limit=null,tags=[];
 if(goalScored){
  if(contacts.length){limit='CONTACT GEOMETRY LIMITED';tags.push('contact response allowed goal');}
  else if(firstMove===null||reactWindow<.10){limit='REACTION LIMITED';}
  else if(commit?.bestEffort){limit='REACH LIMITED';}
  else if(commit&&closest.t<commit.t0+commit.execTime-.02){limit='BALL TOO FAST FOR CURRENT ENVELOPE';}
  else if(commit&&Math.hypot(...closest.ball.map((v,j)=>v-physicalPoint(commit.ballPoint)[j]))>.35){limit='WRONG SAVE SELECTION';tags.push('prediction/intercept mismatch; diagnostic inference, not causal proof');}
  else if(prep&&commit&&Math.hypot(...commit.feet.map((v,j)=>v-set[j]))<.4*Math.hypot(...prep.target.map((v,j)=>v-set[j]))){limit='MOVEMENT LIMITED';}
  else{limit='CONTACT GEOMETRY LIMITED';tags.push('no overlap at the measured hand/body path');}
 }
 const predictionError=p=>p?{lateral:p.y-reference.p[2],height:p.z-reference.p[1],time:p.absoluteTime-reference.t}:null;
 const result={outcome,saved,goal:goalScored,actual:plane,whole,free:solution.plane,freeWhole:solution.whole,onTarget:onTarget(solution.whole),keeperPlane,contacts,frameHit,landing,freeLanding:solution.landing,apex:solution.apex,clock:{kick:0,perception:firstDecision,firstMovement:firstMove,reactionReady:firstDecision+(g.latency??0),firstEligibleDecision:ready,commit:commit?.t0??null,commitTick:commit?.commitTick??null,contact:actualTime,goalPlane:plane?.t??null,unopposedGoalPlane:reference.t,reactionWindow:reactWindow,movementBeforeInterception:moveBefore},keeper:{set,latency:g.latency,prep,commit,movement,rootAtArrival:rootAtArrival??[g.x,g.y],displacementAtArrival:Math.hypot(...(rootAtArrival??[g.x,g.y]).map((v,i)=>v-set[i])),advance:maxAdvance,retreat:maxRetreat,closest,predictionErrorAtReady:predictionError(predictionAtReady),predictionErrorAtCommit:predictionError(predictionAtCommit),observedJitter:g.obsJitter,envelope:api.envelope(t,g,g.height)},failure:{primary:limit,tags,method:'Measured diagnostic rule; categories are hypotheses, not intervention-proven causes'},end:{t:observedTime,p:w.ball.p.slice(),v:w.ball.v.slice(),w:w.ball.w.slice(),sleeping:w.ball.sleeping,exhausted},stats:w.stats};
 if(record){result.frames=frames;result.events=w.events;}return result;
}
