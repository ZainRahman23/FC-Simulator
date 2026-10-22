import {BallWorld} from '../ballfeel14/world.js';
import {atPlane} from '../ballshot1/experiments.js';
import {scheduledLaunch} from './resolver.js';
import {RATINGS,HOLDS,SETUP} from './config.js';
export {BallWorld};
const speed=f=>Math.hypot(...f.v);
const travel=p=>Math.hypot(p[0]-SETUP.origin[0],p[2]-SETUP.origin[2]);
export function simulateShot({shotPower,holdMs,...intent},options={}){
 const id=options.id??`sp${shotPower}-hold${holdMs}`;
 const action=scheduledLaunch({...intent,family:'LACES',shotPower,holdMs,actionId:id,attributes:{preferredFoot:'R'},context:{selectedFoot:'R',pressure:0,stamina:1,energy:1,bodySetup:1,executionQuality:1,startingVelocity:[0,0,0]}});
 if(!action)return {id,shotPower,holdMs,registered:false,action:null,frames:[],events:[],metrics:null};
 const world=new BallWorld({p:SETUP.origin.slice(),v:SETUP.startingVelocity.slice(),w:SETUP.startingSpin.slice(),colliders:[],dt:SETUP.dt,substeps:SETUP.substeps});
 const frames=[world.snapshot()];world.schedule(action);world.onSubstep=f=>frames.push(f);
 const maxDuration=options.maxDuration??SETUP.maxDuration;
 for(let i=0;i<Math.ceil(maxDuration/SETUP.dt);i++){world.step();if(world.ball.sleeping)break;}
 const launch=world.events.find(e=>e.kind==='AUTHORITATIVE_LAUNCH');
 if(!launch)throw Error('Shot was not launched');
 const landing=world.events.find(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf'&&e.time>launch.time);
 const launchFrame={time:launch.time,p:launch.position,v:launch.velocity,w:launch.spin};
 const flight=[launchFrame,...frames.filter(f=>f.time>launch.time&&f.time<=(landing?.time??Infinity))];
 const apex=flight.reduce((a,b)=>b.p[1]>a.p[1]?b:a);
 const planes=Object.fromEntries([5,10,15,19].map(d=>{
  const value=atPlane(frames,SETUP.origin[0]+d,world.events);
  if(value){value.absoluteX=value.distance;value.distance=d;value.insideGoalMouth=Math.abs(value.z-SETUP.origin[2])<=SETUP.goalWidth/2-.11&&value.height>=.11&&value.height<=SETUP.goalHeight-.11;value.beforeFirstLanding=!landing||value.time<=landing.time;}
  return [d,value];
 }));
 const end=frames.at(-1),rest=frames.find(f=>f.sleeping),firstLanding=landing?{time:landing.time,distance:landing.point[0]-SETUP.origin[0],horizontalDistance:travel(landing.point),lateral:landing.point[2]-SETUP.origin[2],position:landing.point.slice(),speedAfter:Math.hypot(...landing.velocity),velocityAfter:landing.velocity.slice(),spinAfter:landing.spin.slice()}:null;
 // Useful range is a disclosed measurement threshold, never a physics input.
 // Locate the first <3 m/s crossing that stays below for 250 ms thereafter.
 let useful=null;
 for(let i=1;i<frames.length;i++){
  const b=frames[i],a=frames[i-1];if(b.time<=launch.time||speed(b)>=SETUP.usefulSpeedThreshold||speed(a)<SETUP.usefulSpeedThreshold)continue;
  const dwell=frames.findIndex((f,j)=>j>=i&&f.time>=b.time+SETUP.usefulDwellSeconds-1e-10);if(dwell<0||frames.slice(i,dwell+1).some(f=>speed(f)>=SETUP.usefulSpeedThreshold))continue;
  const u=(speed(a)-SETUP.usefulSpeedThreshold)/(speed(a)-speed(b)),position=a.p.map((x,j)=>x+u*(b.p[j]-x));
  useful={time:a.time+u*(b.time-a.time),distance:position[0]-SETUP.origin[0],horizontalDistance:travel(position),position,censored:false};break;
 }
 if(!useful)useful={time:end.time,distance:end.p[0]-SETUP.origin[0],horizontalDistance:travel(end.p),position:end.p.slice(),censored:true};
 const range={useful:{...useful,thresholdSpeed:SETUP.usefulSpeedThreshold,dwellSeconds:SETUP.usefulDwellSeconds,definition:'First total-speed crossing below 3 m/s sustained for 0.25 s; observer only.'},stopping:{time:(rest??end).time,distance:(rest??end).p[0]-SETUP.origin[0],horizontalDistance:travel((rest??end).p),position:(rest??end).p.slice(),censored:!rest,sleeping:!!rest,definition:'First frozen-world sleeping state; if censored, distance is observed lower bound at simulation end.'},observedDuration:end.time,maxDuration,sleepPolicy:{restSpeed:world.cfg.restSpeed,restSpin:world.cfg.restSpin,restDwell:world.cfg.restDwell},endSpeed:speed(end)};
 const metrics={launch:action.metadata,holdMs,normalizedCharge:action.metadata.q,shotPower,capabilityCeiling:action.metadata.capabilityCeiling,launchSpeed:action.metadata.speed,horizontalSpeed:action.metadata.horizontalSpeed,verticalVelocity:action.metadata.verticalVelocity,launchAngleDeg:action.metadata.launchAngleDeg,timeTo10m:planes[10]?.time??null,timeToGoalPlane:planes[19]?.time??null,speedAtGoalPlane:planes[19]?.speed??null,horizontalSpeedAtGoalPlane:planes[19]?.horizontalSpeed??null,verticalVelocityAtGoalPlane:planes[19]?.verticalVelocity??null,planes,goalPlane:planes[19],apex:apex.p[1]-.11,apexHeight:apex.p[1],apexTime:apex.time,apexPosition:apex.p.slice(),firstFlightApex:{centreHeight:apex.p[1],clearance:apex.p[1]-.11,time:apex.time,position:apex.p.slice(),definition:'Maximum sampled centre height from authoritative launch to first physical turf contact, at 240 Hz; excludes subsequent rebounds.'},firstLanding,range,launchCount:world.events.filter(e=>e.kind==='AUTHORITATIVE_LAUNCH').length,maximumSpeed:Math.max(action.metadata.speed,...frames.map(speed)),heightConvention:'All plane heights and apexHeight are ball-centre heights above turf. apex is ball-bottom clearance. First landing position is the turf contact point.',physicalWorld:'Unmodified ballfeel14/BallWorld, inherited frozen fc-b; sidespin zero means fc-b yaw activation zero.',frozenCurveLaw:world.curveLaw};
 return {id,title:`${shotPower} SP · ${holdMs} ms`,shotPower,holdMs,registered:true,target:19,duration:end.time,action,initial:{p:SETUP.origin.slice(),v:[0,0,0],w:[0,0,0]},colliders:[],frames,events:world.events,metrics,stats:world.stats};
}
export function allRuns(){return RATINGS.flatMap(shotPower=>HOLDS.map(holdMs=>simulateShot({shotPower,holdMs})));}
