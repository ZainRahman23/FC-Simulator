import {BallWorld,PARAMETERS} from './ball.js';
import {bodyFixture,goal,CHARACTER} from './fixtures.js';
import {resolvedAction,spinForLegacyCurve} from './adapter.js';
const R=PARAMETERS.radius;
const sh=CHARACTER.landmarks.yK,ankle=CHARACTER.landmarks.yA;
const launch=(id,v,w=[0,0,0],p=[0,R,0],metadata={})=>({id,tick:0,position:p,velocity:v,spin:w,metadata:{family:id,...metadata}});
const roll=v=>[0,0,-v/R];
export const SCENARIOS=[
 ...[0.25,0.5,1,2].map(h=>({id:`drop-${h}`,title:`DROP / BOUNCE · ${h} m`,duration:5,initial:{p:[0,R+h,0]},note:'Height is clearance beneath the ball. No launch or animation.'})),
 {id:'ground-pass',title:'GROUND PASS',duration:10,action:launch('INSIDE',[13.2,0,0],roll(13.2),undefined,{selectedFoot:'R',preferredFoot:'R'}),note:'Resolved 13.2 m/s pass, rolling-consistent spin. No foot force needed.'},
 {id:'driven-pass',title:'DRIVEN PASS',duration:8,action:launch('LACES',[21,0.8,0],[0,0,-75]),note:'Slight lift, then real bounce and slip into rolling.'},
 {id:'lofted-pass',title:'LOFTED PASS',duration:8,action:launch('LOFT',[16,8,0],[0,0,12]),note:'Backspin and gravity carry the ball; contact determines the landing.'},
 {id:'power-shot',title:'POWER SHOT',duration:4,action:launch('LACES_POWER',[29,7.86,0],[0,0,-10]),colliders:goal(20),note:'Existing power family ratio 0.271 at 29 m/s. Physical goal frame.'},
 {id:'curved-shot',title:'CURVED SHOT',duration:5,action:launch('INSIDE_FINISH',[24,5,0],[0,45,0]),colliders:goal(24),note:'45 rad/s actual sidespin. Magnus bends free flight; no target tracking.'},
 {id:'chip',title:'CHIP',duration:7,action:launch('CHIP',[10.4,7.697,0],[0,0,24]),note:'Charge 0.6 legacy chip velocity; explicit backspin added for V1.'},
 {id:'slide-roll',title:'SLIDE → ROLL',duration:10,initial:{v:[9,0,0],w:[0,0,0]},note:'Zero initial spin. Contact friction exchanges translation and rotation.'},
 {id:'post-rebound',title:'POST REBOUND',duration:3,initial:{p:[0,0.6,-3.60]},action:launch('SHOT',[31,0,0],[0,25,0],[0,0.6,-3.60]),colliders:goal(6),note:'Off-centre 31 m/s post contact; spin, normal and friction determine rebound.'},
 {id:'crossbar',title:'CROSSBAR REBOUND',duration:3,initial:{p:[0,2.30,0]},action:launch('SHOT',[31,1.0,0],[0,0,18],[0,2.30,0]),colliders:goal(5),note:'Crossbar collision uses the same swept sphere response as the posts.'},
 {id:'shin-deflection',title:'SHIN DEFLECTION',duration:4,initial:{p:[0,0.35,0]},action:launch('PASS',[14,0,0],[0,0,0],[0,0.35,0]),colliders:[bodyFixture('shank_R',[2,sh,0.06])],note:'Actual V2 tapered shin collider. No scripted outgoing direction.'},
 {id:'boot-deflection',title:'BOOT DEFLECTION',duration:4,initial:{v:[4,0,0],w:roll(4)},colliders:[bodyFixture('foot_R',[1,ankle,0.03])],note:'Actual ten-piece V2 boot hull. The upper can pop the ball slightly upward.'},
 {id:'blocked-shot',title:'BLOCKED SHOT · 50 ms',duration:3,initial:{p:[0,0.40,0]},action:launch('SHOT',[25,0,0],[0,0,0],[0,0.40,0]),colliders:[bodyFixture('shank_R',[1.43,sh,0.04])],note:'25 m/s authoritative launch, defender contact about 50 ms later. No residual trajectory.'},
 {id:'tackle-loose',title:'TACKLE KNOCKS BALL LOOSE',duration:4,initial:{v:[3,0,0],w:roll(3)},colliders:[bodyFixture('foot_R',[0.63,ankle,-1.0],[0,0,4.8],'tackler:foot_R')],note:'A moving boot physically intercepts a rolling ball. No authored loose-ball launch.'},
 {id:'thigh-deflection',title:'THIGH DEFLECTION',duration:3,initial:{p:[0,0.85,0]},action:launch('PASS',[14,0,0],[0,0,0],[0,0.85,0]),colliders:[bodyFixture('thigh_R',[2,CHARACTER.landmarks.yH,0.07])],note:'Actual V2 thigh, with prescribed fixture transform.'},
 {id:'torso-deflection',title:'TORSO DEFLECTION',duration:3,initial:{p:[0,1.35,0]},action:launch('PASS',[14,0,0],[0,0,0],[0,1.35,0]),colliders:[bodyFixture('thorax',[2,CHARACTER.landmarks.yXYPH,0.08])],note:'Actual V2 chest and shoulder shapes.'},
 {id:'head-deflection',title:'HEAD DEFLECTION',duration:3,initial:{p:[0,1.70,0]},action:launch('PASS',[14,0,0],[0,0,0],[0,1.70,0]),colliders:[bodyFixture('head',[2,CHARACTER.landmarks.yCERV,0])],note:'Actual V2 head sphere pair and neck capsule.'}
];
export function makeScenario(s,options={}){if(typeof s==='string')s=SCENARIOS.find(x=>x.id===s);if(!s)throw Error('Unknown scenario');const world=new BallWorld({...s.initial,colliders:s.colliders||[],...options});if(s.action)world.schedule(s.action);return world;}
export function runScenario(s,options={}){if(typeof s==='string')s=SCENARIOS.find(x=>x.id===s);const world=makeScenario(s,options),frames=[world.snapshot()];world.onSubstep=f=>frames.push(f);for(let n=0;n<Math.round(s.duration/world.dt);n++)world.step();return {id:s.id,title:s.title,note:s.note,duration:s.duration,frames,events:world.events,stats:world.stats,colliders:s.colliders||[],parameters:world.cfg};}
