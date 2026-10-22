// THROUGH-TARGET-1, provisional integration only. Imported foundations are byte-identical.
import {prepareSpace,dyingEndpoint} from '../passing-v1-approved/passing/space-pass.mjs';
import {rangeCapability} from '../passing-v1-approved/passing/range-capability.mjs';
import {BallWorld,simulate,atTime} from '../passing-v1-approved/passing/physics.mjs';
import {MotionPlan,DT} from './foundation/sandbox/visual/technical_control1/tc_motion.js';
import {techParams,STYLES} from './foundation/sandbox/visual/technical_control1/tc_attrs.js';
import {TechEpisode} from './foundation/sandbox/visual/technical_control1/tc_core.js';
import {Frame} from './foundation/sandbox/visual/receive_control2/rc2_episode.js';
const R=.11, h=Math.hypot, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), dist=(a,b)=>h(a[0]-b[0],a[2]-b[2]), round=x=>Math.round(x*1e9)/1e9;
export const RULES=Object.freeze({version:'THROUGH-TARGET-1.1-provisional',endpointRadius:22,pathRadius:14,behindPasser:2,pastEndpoint:8,maxAttackSeconds:5,replanSeconds:.15,horizon:5,contactReach:.63,maxReceiveBallSpeed:13,ownership:'locked for flight; no automatic reassignment',sprint:'existing MotionPlan RUN, commanded player sprintSpeed throughout approach',receive:'TECHNICAL-CONTROL-1 TechEpisode (RECEIVE-ELITE-1 moving sequence)'});
export const CHASE_RULES=Object.freeze({initialCommitment:.6,infeasibleReplans:4,infeasibleDuration:.45,reachableMargin:.25,receiveTolerance:.25,hopelessDeficit:.65,restGrace:1.5,forecastLimit:12,forecastSample:.10,arrivalStep:1/120,pitchBounds:{xMin:-20,xMax:85,zMin:-34,zMax:34}});
const inPitch=(p,b)=>p[0]>=b.xMin-R&&p[0]<=b.xMax+R&&p[2]>=b.zMin-R&&p[2]<=b.zMax+R;
function boundsFor(input){const b=input.pitchBounds??CHASE_RULES.pitchBounds;if(!b||!['xMin','xMax','zMin','zMax'].every(k=>Number.isFinite(b[k]))||b.xMax<=b.xMin||b.zMax<=b.zMin)throw Error('Pitch bounds require finite ordered xMin/xMax/zMin/zMax');return {...b};}
function normalized(input){
 if(!input||typeof input!=='object')throw Error('A scenario object is required');
 const i=structuredClone(input);i.origin??=[0,R,0];i.aimDeg??=0;i.holdMs??=200;i.shotPower??=99;i.longPassing??=99;i.vision??=99;i.seed??=1;i.players??=[];
 const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite),rating=v=>Number.isFinite(v)&&v>=1&&v<=99;
 if(!vector(i.origin)||i.origin[1]!==R)throw Error('Origin must be a finite grounded ball centre [x,0.11,z]');
 if(!Number.isFinite(i.aimDeg)||Math.abs(i.aimDeg)>360||!Number.isFinite(i.holdMs)||i.holdMs<0||i.holdMs>10000)throw Error('Aim and hold must be finite and within the input envelope');
 if(i.facingYaw!=null&&!Number.isFinite(i.facingYaw))throw Error('Facing must be finite');
 if(![i.shotPower,i.longPassing,i.vision].every(rating))throw Error('Passing attributes must be1–99');
 if(!/^\d{1,16}$/.test(String(i.seed)))throw Error('Use a seed containing 1–16 digits.');
 if(!Array.isArray(i.players)||i.players.length>30)throw Error('Expected at most30 attackers');
 const ids=new Set();for(const p of i.players){if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Attacker ids must be unique nonempty strings');ids.add(p.id);if(!vector(p.position)||!vector(p.velocity??[0,0,0])||h(...(p.velocity??[0,0,0]))>12)throw Error('Attacker position/velocity must be finite; speed at most12 m/s');if(!Number.isFinite(p.sprintSpeed??8.2)||(p.sprintSpeed??8.2)<2||(p.sprintSpeed??8.2)>9.5)throw Error('Sprint capability must be2–9.5 m/s');if(![p.agility??99,p.dribbling??99,p.ballControl??99].every(rating))throw Error('Receiving attributes must be1–99');if(p.facingDeg!=null&&!Number.isFinite(p.facingDeg))throw Error('Attacker facing must be finite');}
 return i;
}
function passInput(input){const i=normalized(input),a=i.aimDeg*Math.PI/180;return {family:'THROUGH',origin:i.origin,aimPoint:[i.origin[0]+Math.cos(a)*10,R,i.origin[2]+Math.sin(a)*10],receiver:{id:'USER_SPACE_ANCHOR',position:i.origin.slice(),velocity:[0,0,0]},attributes:{short_passing:99,long_passing:i.longPassing,crossing:99,shot_power:i.shotPower,vision:i.vision,curve:75},holdMs:i.holdMs,...(i.requestedDistance==null?{}:{requestedDistance:i.requestedDistance}),seed:String(i.seed),drawEventId:'THROUGH_TARGET_1',passId:'THROUGH_TARGET_1',facingYaw:i.facingYaw??0,accuracyModel:'variation'};}
export function endpoint(input){const i=passInput(input),capability=rangeCapability(i),a=input.aimDeg*Math.PI/180||0,direction=[Math.cos(a),0,Math.sin(a)],point=d=>i.origin.map((v,k)=>k===1?R:v+direction[k]*d);return {userEndpoint:point(capability.requestedRange),idealEndpoint:point(capability.resolvedRange),requestedDistance:capability.requestedRange,resolvedDistance:capability.resolvedRange,capability,direction};}
export function selectRunner(input,ep=endpoint(input)){const i=normalized(input),u=ep.direction,L=ep.requestedDistance,candidates=i.players.map(p=>{const delta=p.position.map((x,k)=>x-i.origin[k]),along=delta[0]*u[0]+delta[2]*u[2],lateral=Math.abs(delta[2]*u[0]-delta[0]*u[2]),distance=dist(p.position,ep.userEndpoint),v=p.velocity??[0,0,0],sp=h(v[0],v[2]),dot=sp?clamp((v[0]*u[0]+v[2]*u[2])/sp,-1,1):1,turnCost=sp>1?Math.min(4,sp*.32*(1-dot)):0,arrival=distance/(p.sprintSpeed??8.2)+sp*Math.max(0,-dot)/(techParams({agi:p.agility??99}).agi.aBrake),eligible=distance<=RULES.endpointRadius&&lateral<=RULES.pathRadius&&along>=-RULES.behindPasser&&along<=L+RULES.pastEndpoint&&arrival<=RULES.maxAttackSeconds;return {id:p.id,eligible,endpointDistance:distance,score:distance+turnCost,headingPenalty:turnCost,along,lateral,estimatedAttackSeconds:arrival,reason:eligible?'eligible':distance>RULES.endpointRadius?'outside endpoint radius':lateral>RULES.pathRadius?'outside path corridor':along< -RULES.behindPasser?'behind passer':along>L+RULES.pastEndpoint?'beyond endpoint region':'cannot plausibly attack'};});const rank=candidates.filter(p=>p.eligible).sort((a,b)=>a.score-b.score||(String(a.id)<String(b.id)?-1:1));return {selectedId:rank[0]?.id??null,candidates,rule: RULES.ownership,scoreRule:'endpoint distance + bounded (0–4 m) current-heading penalty; deterministic id tie-break'};}
export async function prepareScenario(input){const i=normalized(input),ep=endpoint(i),selection=selectRunner(i,ep),pass=await prepareSpace(passInput(i)),freeFlight=simulate(pass.actualAction,ep.idealEndpoint),dying=dyingEndpoint(freeFlight);return {input:i,endpoint:ep,selection,pass,freeFlight,actualEndpoint:dying?.p??freeFlight.last.p,pitchBounds:boundsFor(i)};}
function newWorld(action){const w=new BallWorld({p:action.position.slice(),v:[0,0,0],w:[0,0,0],dt:DT,substeps:1,colliders:[]});w.schedule(action);return w;}
function cloneBall(W){const c=new BallWorld({p:W.ball.p.slice(),v:W.ball.v.slice(),w:W.ball.w.slice(),q:W.ball.q.slice(),dt:DT,substeps:1,colliders:[]});c.ball=structuredClone(W.ball);c.tick=W.tick;c.time=W.time;c.restTime=W.restTime;c.actions=structuredClone(W.actions);c.actionIds=new Set(W.actionIds);return c;}
function predict(W,seconds){const c=cloneBall(W),out=[{time:c.time,p:c.ball.p.slice(),v:c.ball.v.slice(),w:c.ball.w.slice()}];for(let n=0;n<Math.round(seconds/DT);n++){c.step();if(n%12===11)out.push({time:c.time,p:c.ball.p.slice(),v:c.ball.v.slice(),w:c.ball.w.slice()});}return out;}
function motion(st,ag,speed,theta,seconds){return new MotionPlan(st,ag,Math.max(DT,seconds)).build({kind:'RUN',theta,v:speed});}
function stateOf(p){const v=p.velocity??[0,0,0];return {t:0,P:[p.position[0],p.position[2]],V:[v[0],v[2]],psi:h(v[0],v[2])>.1?Math.atan2(v[2],v[0]):(p.facingDeg??0)*Math.PI/180,w:0};}
// Every candidate is rolled out with the same physical movement controller at FULL sprint.
export function planMeeting(W,st,player,previous=null){const ag=techParams({agi:player.agility??99}).agi,speed=player.sprintSpeed??8.2,trajectory=predict(W,RULES.horizon);let best=null,fallback=null;
 for(let j=2;j<trajectory.length;j+=2){const b=trajectory[j],T=b.time-st.t;if(T<.12||b.p[1]>.45)continue;const vb=h(b.v[0],b.v[2]);let theta=Math.atan2(b.p[2]-st.P[1],b.p[0]-st.P[0]),plan,s,e,usedTheta;
  // Adjust heading only; never lower the requested sprint speed to fit the rendezvous.
  for(let it=0;it<3;it++){usedTheta=theta;plan=motion(st,ag,speed,theta,T);s=plan.at(b.time);const sp=h(...s.V),ux=sp?s.V[0]/sp:Math.cos(theta),uz=sp?s.V[1]/sp:Math.sin(theta);e=[b.p[0]-s.P[0]-.42*ux,b.p[2]-s.P[1]-.42*uz];const lateral=-e[0]*Math.sin(theta)+e[1]*Math.cos(theta);theta+=clamp(lateral/Math.max(1,dist([st.P[0],0,st.P[1]],b.p)),-.35,.35);}
  const miss=h(...e),sv=h(...s.V),compat=vb>.2&&sv>.2?clamp((s.V[0]*b.v[0]+s.V[1]*b.v[2])/(sv*vb),-1,1):1,reverse=Math.max(0,-compat),score=T*.55+miss*3+(1-compat)*.7+Math.max(0,vb-8)*.12+(previous?Math.min(1,Math.abs(b.time-previous.time))*.1:0),candidate={time:b.time,position:b.p.slice(),ballVelocity:b.v.slice(),runnerPosition:[s.P[0],0,s.P[1]],predictedRunnerVelocity:[s.V[0],0,s.V[1]],miss,score,compatible:compat,commandTheta:usedTheta,feasible:miss<.65&&vb<=RULES.maxReceiveBallSpeed&&reverse<.85};
  // Store the actually simulated commanded heading, not any post-loop correction.
  candidate.plan=plan;
  if(!fallback||miss+T*.12<fallback.miss+ (fallback.time-st.t)*.12)fallback=candidate;
  if(candidate.feasible&&(!best||score<best.score))best=candidate;
 }
 const chosen=best??fallback;if(!chosen)return null;return {...chosen,source:'actual BallWorld clone',status:best?'feasible moving receive':'full-sprint pursuit; no clean meeting yet'};}
// Optimistic minimum-arrival envelope under the existing sprint acceleration and
// lateral-turn limits. It integrates forward progress toward the target, including
// negative progress while facing away. Lateral offset is deliberately not charged:
// this is a lower bound, so search uncertainty cannot itself prove a lost ball.
// Actual meeting feasibility still comes from the unchanged MotionPlan rollout.
export function minimumArrival(st,player,point){
 const ag=techParams({agi:player.agility??99}).agi,top=player.sprintSpeed??8.2,d=[point[0]-st.P[0],point[2]-st.P[1]],distance=Math.max(0,h(...d)-RULES.contactReach),theta=Math.atan2(d[1],d[0]);
 let speed=h(...st.V),angle=speed>.1?Math.abs(Math.atan2(Math.sin(Math.atan2(st.V[1],st.V[0])-theta),Math.cos(Math.atan2(st.V[1],st.V[0])-theta))):0,progress=0,t=0;
 const dt=CHASE_RULES.arrivalStep;
 while(progress<distance&&t<20){const a=clamp((top-speed)*4,-ag.aBrake,ag.accel*clamp(1.1-speed/10,.35,1));speed=Math.min(Math.max(top,h(...st.V)),Math.max(0,speed+a*dt));angle=Math.max(0,angle-ag.aLat/Math.max(speed,.3)*dt);progress+=speed*Math.cos(angle)*dt;t+=dt;}
 return t;
}
// Search the entire useful remaining physical flight, through rest or pitch exit.
// The first forecast anchors the physical-rest deadline: it never slides forward
// after the ball has stopped. Beyond that deadline a ball may still be retrieved,
// but that is ordinary loose-ball work, not this special through-ball run.
function remainingFlight(W,bounds,memory){
 const C=cloneBall(W),states=[],start=W.time;let rest=memory.restTime??null,exit=null,complete=false;
 const sample=()=>states.push({time:C.time,p:C.ball.p.slice(),v:C.ball.v.slice()});sample();
 for(let k=0;C.time<CHASE_RULES.forecastLimit-1e-9;k++){
  C.step();if(!inPitch(C.ball.p,bounds)){exit=C.time;complete=true;break;}
  if(k%24===23)sample();
  if(C.ball.sleeping){rest=rest??C.time;memory.restTime=rest;sample();complete=true;break;}
 }
 if(!inPitch(W.ball.p,bounds)){exit=W.time;states.length=0;complete=true;}
 const usefulUntil=exit??(rest==null?CHASE_RULES.forecastLimit:rest+CHASE_RULES.restGrace),receiveUntil=usefulUntil+(exit==null&&rest!=null?CHASE_RULES.receiveTolerance:0);
 if(rest!=null&&exit==null&&receiveUntil>=start){const p=C.ball.p.slice();for(let t=Math.max(start,rest);t<receiveUntil;t+=CHASE_RULES.forecastSample)states.push({time:t,p:p.slice(),v:[0,0,0]});states.push({time:receiveUntil,p:p.slice(),v:[0,0,0]});}
 return {states:states.filter(b=>b.time>=start&&b.time<=receiveUntil&&inPitch(b.p,bounds)),rest,exit,complete,usefulUntil,receiveUntil,restPosition:rest==null?null:C.ball.p.slice()};
}
export function assessFeasibility(W,st,player,meeting,bounds=CHASE_RULES.pitchBounds,memory={}){
 const flight=remainingFlight(W,bounds,memory);let best=null,count=0;
 for(const b of flight.states){const t=b.time-W.time;if(t<.04||b.p[1]>.45||h(b.v[0],b.v[2])>RULES.maxReceiveBallSpeed)continue;
  const T=minimumArrival(st,player,b.p),deficit=T-t,c={meetingPoint:b.p.slice(),ballArrivalTime:t,runnerMinArrivalTime:T,arrivalDeficit:deficit,ballSpeed:h(b.v[0],b.v[2])};count++;if(!best||deficit<best.arrivalDeficit)best=c;
 }
 const verified=!!(meeting?.feasible&&meeting.time<=flight.receiveUntil+1e-9&&inPitch(meeting.position,bounds));
 if(verified){const t=meeting.time-W.time,T=minimumArrival(st,player,meeting.position);const verifiedPoint={meetingPoint:meeting.position.slice(),ballArrivalTime:t,runnerMinArrivalTime:T,arrivalDeficit:T-t,ballSpeed:h(...meeting.ballVelocity)};if(!best||verifiedPoint.arrivalDeficit<best.arrivalDeficit)best=verifiedPoint;}
 let state,reason;
 if(!flight.complete&&!verified){state='MARGINAL';reason='Physical forecast has not reached rest or a pitch exit; uncertainty does not justify abandonment.';}
 else if(verified){state=best.arrivalDeficit<=-CHASE_RULES.reachableMargin?'REACHABLE':'MARGINAL';reason='Existing full-sprint MotionPlan supplies a useful physical meeting; diagnostics show the best remaining arrival margin.';}
 else if(best&&best.arrivalDeficit<=-CHASE_RULES.reachableMargin){state='REACHABLE';reason='A useful remaining ball state has positive arrival-time margin; continue full-sprint planning.';}
 else if(best&&best.arrivalDeficit<=CHASE_RULES.hopelessDeficit){state='MARGINAL';reason='A useful meeting remains within the fight-on arrival tolerance; keep committing.';}
 else {state='UNREACHABLE';reason=flight.exit!=null?'Ball leaves the pitch before a controllable meeting is reachable.':(!best||W.time>flight.receiveUntil)?'No controllable samples remain in the useful through-ball receive window; later retrieval belongs to ordinary loose-ball movement.':'Even the optimistic runner-arrival envelope misses every useful controllable ball state.';}
 const eventual=flight.restPosition&&inPitch(flight.restPosition,bounds)?minimumArrival(st,player,flight.restPosition):null;
 return {state,plannedMeetingPoint:meeting?.position??null,...(best??{meetingPoint:null,ballArrivalTime:Math.max(0,flight.usefulUntil-W.time),runnerMinArrivalTime:null,arrivalDeficit:null}),assessedAt:W.time,timeBasis:'seconds remaining from assessment',reason,physicalMeetingVerified:verified,searchPoints:count,predictedExitTime:flight.exit,predictedRestTime:flight.rest,usefulUntil:flight.usefulUntil,receiveUntil:flight.receiveUntil,eventualLooseBallArrivalTime:eventual,forecastComplete:flight.complete,arrivalMethod:'optimistic capability envelope; full-sprint MotionPlan verifies concrete meetings'};
}
function neutralStep(st,player,time){const dt=time-st.t,s=h(...st.V),brake=techParams({agi:player.agility??99}).agi.aBrake,v=Math.max(0,s-brake*dt),distance=s>0?(s+v)*.5*Math.min(dt,s/brake):0,u=s>0?st.V.map(x=>x/s):[0,0];return {...st,t:time,P:[st.P[0]+u[0]*distance,st.P[1]+u[1]*distance],V:u.map(x=>x*v),w:0};}
function publicMeeting(m){if(!m)return null;const {plan,...out}=m;return out;}
function rollSpeed(distance,seconds){let lo=0,hi=Math.max(5,distance/seconds+8);for(let n=0;n<14;n++){const s=(lo+hi)/2,w=new BallWorld({p:[0,R,0],v:[s,0,0],w:[0,0,-s/R],dt:DT,substeps:1,colliders:[]});for(let k=0;k<Math.round(seconds/DT);k++)w.step();if(w.ball.p[0]<distance)lo=s;else hi=s;}return (lo+hi)/2;}
function receiveEpisode(W,st,p,input){const F=new Frame(st.P,0),el=techParams({bc:p.ballControl??99,dri:p.dribbling??99,agi:p.agility??99}),theta=Math.atan2(st.V[1],st.V[0]),local={t:0,P:[0,0],V:st.V.slice(),psi:st.psi,w:st.w},mp=motion(local,el.agi,p.sprintSpeed??8.2,theta,4),path={kind:'moving',th:theta,base:t=>mp.at(t).P,psi:t=>mp.at(t).psi},B=F.loc(W.ball.p),vb=F.locV(W.ball.v),F0=(-Math.sin(theta)*B[0]+Math.cos(theta)*B[1])>=0?'R':'L',tech={fid:'STRIDE',label:'Moving receive into stride',F0,surfaces:['INSIDE','OUTSIDE','LACES'],famM:1,sig:1,theta,stand:[0,F0==='R'?-.14:.14],shift:0,lift0:-.16,land0:.08,firstExit:true,ballC0:{p:B,v:vb}};return new TechEpisode({F,kc0:W.tick,k0:W.tick,path,mode:'moving',tech,el,bc:p.ballControl??99,spec:{seed:input.seed,receiver:p.id,receiveEvent:'THROUGH_TARGET_1'},idp:'TT1_RECEIVE',vFloor:2,vX:p.sprintSpeed??8.2,rollSpeed,style:STYLES.DIRECT_RUNNER,pref:'R',intent:()=>({theta,v:p.sprintSpeed??8.2,contest:0}),bridge:'off'});}
export function simulateRun(prepared,options={}){const started=performance.now(),{input,endpoint:ep,selection,pass}=prepared,player=input.players.find(p=>p.id===selection.selectedId),W=newWorld(pass.actualAction),frames=[],plans=[],events=[];let st=player?stateOf(player):null,meeting=null,nextPlan=0,episode=null,receive=null,replanCount=0,maxFreeBallDeviation=0,abandonment=null,feasibility=null,chaseState=player?'COMMITTED':'UNOWNED',badCount=0,badSince=null;const forecastMemory={},bounds=prepared.pitchBounds??boundsFor(input);const duration=options.duration??8,postSeconds=options.postReceiveSeconds??2;
 const record=()=>frames.push({time:round(W.time),ball:{p:W.ball.p.slice(),v:W.ball.v.slice(),w:W.ball.w.slice()},runner:st?{id:player.id,position:[st.P[0],0,st.P[1]],velocity:[st.V[0],0,st.V[1]],sprintCommand:episode||abandonment?null:player.sprintSpeed??8.2}:null,meeting:publicMeeting(meeting),selected:selection.selectedId,currentBall:{p:W.ball.p.slice(),v:W.ball.v.slice()},feasibility:feasibility?structuredClone(feasibility):null,chaseState,abandonment:abandonment?structuredClone(abandonment):null,phase:episode?'RECEIVE_CONTROL':abandonment?'NEUTRAL_RECOVERY':player?'FULL_SPRINT':'UNOWNED'});
 record();
 while(W.time<duration-1e-9){
  if(st&&!episode&&!abandonment){
   if(W.time>=nextPlan-1e-8){meeting=planMeeting(W,st,player,meeting);feasibility=assessFeasibility(W,st,player,meeting,bounds,forecastMemory);nextPlan=W.time+RULES.replanSeconds;replanCount++;
    if(feasibility.state==='UNREACHABLE'){badCount++;badSince??=W.time;}else{badCount=0;badSince=null;}
    if(W.time>=CHASE_RULES.initialCommitment-1e-9&&badCount>=CHASE_RULES.infeasibleReplans&&W.time-badSince>=CHASE_RULES.infeasibleDuration-1e-9){chaseState='ABANDONED';abandonment={time:W.time,reason:feasibility.reason,infeasibleReplans:badCount,infeasibleSince:badSince,intentReleased:'THROUGH_BALL_RUN',handoff:'NEUTRAL_RECOVERY_PLACEHOLDER',placeholder:'No team AI in this lab: continuous neutral deceleration at existing Agility braking capability.'};events.push({kind:'THROUGH_BALL_RUN_ABANDONED',...abandonment});}
    plans.push({at:W.time,...publicMeeting(meeting),selected:selection.selectedId,currentBall:{p:W.ball.p.slice(),v:W.ball.v.slice()},feasibility:structuredClone(feasibility),chaseState,abandonment:abandonment?structuredClone(abandonment):null});}

   const b=W.ball,sp=h(...st.V),dx=b.p[0]-st.P[0],dz=b.p[2]-st.P[1],ahead=sp>.1?(dx*st.V[0]+dz*st.V[1])/sp:0,lateral=sp>.1?Math.abs(-dx*st.V[1]+dz*st.V[0])/sp:h(dx,dz),vb=h(b.v[0],b.v[2]);
   // Physical foot reach and a playable moving state gate the existing receive controller.
   if(!abandonment&&inPitch(b.p,bounds)&&W.time>.2&&sp>1&&ahead>=-.04&&ahead<=.65&&lateral<=.25&&h(ahead-Math.min(.46,.30+.03*sp),lateral-.10)<=techParams({dri:player.dribbling??99}).dri.reach&&b.p[1]<=.35&&vb<=RULES.maxReceiveBallSpeed){episode=receiveEpisode(W,st,player,input);chaseState='RECEIVED';receive={time:W.time,point:b.p.slice(),runnerPosition:[st.P[0],0,st.P[1]],runnerVelocity:[st.V[0],0,st.V[1]],ballVelocityBefore:b.v.slice(),speedBefore:sp,footReach:h(dx,dz),authoredFootError:h(ahead-Math.min(.46,.30+.03*sp),lateral-.10),interface:RULES.receive};events.push({kind:'MOVING_RECEIVE_HANDOFF',...receive});}
  }
  if(episode){episode.pre(W);W.step();episode.post(W);const t=(W.tick-episode.kc0)*DT,P=episode.F.pitch(episode.rootAt(t)),V=episode.F.pitchV(episode.velAt(t));st={t:W.time,P,V,psi:episode.F.head(episode.psiAt(t)),w:0};}
  else {W.step();if(st&&abandonment){st=neutralStep(st,player,W.time);}else if(st&&meeting?.plan){const m=meeting.plan,s=m.at(W.time);st={t:W.time,...s,w:m.w[m.idx(W.time)]};}if(!episode){const f=atTime(prepared.freeFlight.frames,W.time);maxFreeBallDeviation=Math.max(maxFreeBallDeviation,dist(W.ball.p,f.p));}}
  if(W.tick%4===0)record();if(receive&&W.time>=receive.time+postSeconds)break;

 }
 if(frames.at(-1).time!==round(W.time))record();
 const contacts=episode?.contacts??[];if(receive){receive.contacts=contacts;const firstTouch=W.events.find(e=>e.id==='TT1_RECEIVE.c0'&&e.kind==='AUTHORITATIVE_LAUNCH');receive.firstTouchExecuted=!!firstTouch;receive.status=firstTouch?'EXECUTED_PHYSICAL_TOUCH':'HANDOFF_WITHOUT_EXECUTED_TOUCH';receive.handoffPoint=receive.point.slice();receive.handoffTime=receive.time;receive.point=firstTouch?.position??null;receive.time=firstTouch?.time??receive.handoffTime;receive.firstTouch=firstTouch??null;receive.speedAfter=h(...st.V);receive.continuationFailed=episode.failed;receive.notes=episode.notes;}
 const actual=prepared.actualEndpoint,diagnostics={userEndpoint:ep.userEndpoint,idealEndpoint:ep.idealEndpoint,actualEndpoint:actual,receivePoint:receive?.point??null,endpointMiss:dist(actual,ep.idealEndpoint),requestedMiss:dist(actual,ep.userEndpoint),capability:ep.capability,effectiveAccuracy:pass.audit.effectivePassingAccuracy,selectedId:selection.selectedId,ownershipChanges:0,replanCount,receive,chaseState,abandonment,feasibilityFinal:feasibility,pitchBounds:bounds,chaseRules:CHASE_RULES,maxFreeBallDeviation,fullSprintWhileCommitted:true,fullSprintBeforeHandoff:!abandonment,ballLaunches:W.events.filter(e=>e.kind==='AUTHORITATIVE_LAUNCH').length,receiveFoundation:'TECHNICAL-CONTROL-1 / RECEIVE-ELITE-1',receivePredictionLimitation:'Unchanged RECEIVE post-contact predictor uses its BALL-FEEL-1.3 kernel; pre-contact prediction and authoritative execution both use frozen PASSING BALL-FEEL-1.4.'};
 return {version:RULES.version,input,endpoint:ep,selection,frames,plans,events,diagnostics,receive,freeFlight:prepared.freeFlight,idealFlight:pass.ideal,actualAction:pass.actualAction,idealAction:pass.idealAction,audit:pass.audit,performance:{simulationMs:performance.now()-started,replanCount},outcome:receive?.firstTouchExecuted?'RECEIVED_MOVING':player?(abandonment?'CHASE_ABANDONED':'NOT_RECEIVED'):'NO_ELIGIBLE_RUNNER'};
}
