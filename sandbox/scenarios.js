/* CFR scenario laboratory — 24 deterministic, repeatable physical scenarios. */
'use strict';
function parkAll(w){
  for(const p of w.players){ w.intents[p.pid] = {kind:'HOLD', scripted:true}; }
  w.freeplay = false; w.restart.state = 'OPEN'; w.ball.state = 'ROLLING';
}
function put(w, pid, x, y, face){
  const p = w.players[pid]; p.x = x; p.y = y; p.vx = p.vy = 0;
  if(face !== undefined) p.facing = face;
  return p;
}
function ballAt(w, x, y){ const b = w.ball; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; b.state='ROLLING'; b.controller=null; b.heldBy=null; }
function at(w, t, fn){ (w._cues = w._cues || []).push({t, fn, done:false});
  w.scenarioTick = w.scenarioTick || (ww => { for(const c of ww._cues) if(!c.done && ww.worldClock >= c.t){ c.done = true; c.fn(ww); } }); }
function passSeq(w, chain, gap){  // scripted pass chain by pid list
  let t = 0.6;
  for(let i = 0; i < chain.length - 1; i++){
    const from = chain[i], to = chain[i+1];
    at(w, t, ww => { ww.intents[from] = {kind:'PASS', to, scripted:true}; });
    t += gap;
  }
}

const SCENARIOS = [
{id:1, name:'1. Stationary short pass', cam:'zoom', setup(w){
  parkAll(w); put(w,6, 40,30, 0); put(w,7, 52,36); ballAt(w, 40.8,30.2); w.ball.controller = 6;
  passSeq(w, [6,7,6,7,6], 2.8);
}},
{id:2, name:'2. Moving short pass', cam:'zoom', setup(w){
  parkAll(w); put(w,6, 38,30, 0); put(w,7, 50,38); ballAt(w, 38.8,30.2); w.ball.controller = 6;
  at(w, 0.4, ww => { ww.intents[7] = {kind:'MOVE_TO', x: 58, y: 30, speed: 5.5, scripted:true}; });
  at(w, 1.0, ww => { ww.intents[6] = {kind:'PASS', to: 7, scripted:true}; });
  at(w, 4.0, ww => { ww.intents[7] = {kind:'CARRY', scripted:true}; });
}},
{id:3, name:'3. Long ground pass', cam:'broadcast', setup(w){
  parkAll(w); put(w,2, 20,26, 0); put(w,9, 55,40); ballAt(w, 20.8,26.2); w.ball.controller = 2;
  at(w, 0.8, ww => { ww.intents[2] = {kind:'PASS', to: 9, scripted:true}; });
}},
{id:4, name:'4. Diagonal switch (long)', cam:'broadcast', setup(w){
  parkAll(w); put(w,5, 34,10, 0); put(w,8, 62,58); ballAt(w, 34.8,10.2); w.ball.controller = 5;
  at(w, 0.8, ww => { ww.intents[5] = {kind:'PASS', to: 8, scripted:true}; });
}},
{id:5, name:'5. Lofted pass (rise/apex/descent/bounce)', cam:'broadcast', setup(w){
  parkAll(w); put(w,6, 30,34, 0); put(w,10, 62,34); ballAt(w, 30.8,34);
  w.ball.controller = 6;
  at(w, 0.8, ww => { const b = ww.ball, p = ww.players[6];
    const k = solveKick(b, {x: 60, y: 34}, 'LOFT');
    b.vx=k.vx; b.vy=k.vy; b.vz=k.vz; b.state='AIRBORNE'; b.controller=null; b.exclPid=6; b.exclT=ww.worldClock+0.45;
    contactHook(ww, 'KICK:LOFT', 6); });
  at(w, 1.0, ww => { ww.intents[10] = {kind:'PURSUE', scripted:true}; });
}},
{id:6, name:'6. Cross into the box', cam:'broadcast', setup(w){
  parkAll(w); put(w,8, 88,62, -1.2); put(w,9, 96,30); put(w,10, 93,38); put(w,13, 98,33); put(w,11, 102.5,34);
  ballAt(w, 88.5,61.5); w.ball.controller = 8;
  at(w, 0.7, ww => { const b = ww.ball;
    const k = solveKick(b, {x: 96.5, y: 31}, 'CROSS');
    b.vx=k.vx; b.vy=k.vy; b.vz=k.vz; b.state='AIRBORNE'; b.controller=null; b.exclPid=8; b.exclT=ww.worldClock+0.45;
    contactHook(ww, 'KICK:CROSS', 8); });
  at(w, 0.9, ww => { ww.intents[9] = {kind:'PURSUE', scripted:true}; ww.intents[13] = {kind:'PURSUE', scripted:true}; });
}},
{id:7, name:'7. Through ball behind the line', cam:'broadcast', setup(w){
  parkAll(w); put(w,7, 55,34, 0); put(w,9, 68,26, 0); put(w,14, 70,30); put(w,15, 70,42);
  ballAt(w, 55.8,34.2); w.ball.controller = 7;
  at(w, 0.5, ww => { ww.intents[9] = {kind:'MOVE_TO', x: 88, y: 24, speed: 8.2, scripted:true}; });
  at(w, 0.9, ww => { const b = ww.ball;
    const k = solveKick(b, {x: 84, y: 23}, 'THROUGH');
    b.vx=k.vx; b.vy=k.vy; b.vz=k.vz; b.state='ROLLING'; b.controller=null; b.exclPid=7; b.exclT=ww.worldClock+0.45;
    contactHook(ww, 'KICK:THROUGH', 7); });
  at(w, 1.2, ww => { ww.intents[14] = {kind:'PURSUE', scripted:true}; });
  at(w, 2.2, ww => { ww.intents[9] = {kind:'PURSUE', scripted:true}; });
}},
{id:8, name:'8. Shot on goal', cam:'broadcast', setup(w){
  parkAll(w); put(w,9, 85,32, 0); put(w,11, 103,34); ballAt(w, 85.8,32.2); w.ball.controller = 9;
  w.intents[11] = {kind:'HOLD', scripted:true};
  at(w, 0.6, ww => { ww.intents[9] = {kind:'SHOOT', scripted:true}; });
}},
{id:9, name:'9. Goalkeeper collect vs parry', cam:'zoom', setup(w){
  parkAll(w); put(w,9, 82,34, 0); put(w,11, 103,34); ballAt(w, 82.8,34);
  w.ball.controller = 9;
  at(w, 0.5, ww => { ww.intents[9] = {kind:'SHOOT', scripted:true}; });
  at(w, 5.5, ww => { put(ww,9, 90,30, 0); ballAt(ww, 90.8,30); ww.ball.controller = 9;
                     ww.intents[9] = {kind:'SHOOT', scripted:true}; });
}},
{id:10, name:'10. First touch from a firm pass', cam:'zoom', setup(w){
  parkAll(w); put(w,6, 30,34, 0); put(w,9, 52,34, Math.PI); ballAt(w, 30.8,34); w.ball.controller = 6;
  at(w, 0.7, ww => { const b = ww.ball;
    const k = solveKick(b, {x: 52, y: 34}, 'DRIVEN');
    b.vx=k.vx; b.vy=k.vy; b.vz=0; b.state='ROLLING'; b.controller=null; b.exclPid=6; b.exclT=ww.worldClock+0.45;
    contactHook(ww, 'KICK:DRIVEN', 6); });
  at(w, 2.6, ww => { ww.intents[9] = {kind:'CARRY', scripted:true}; });
}},
{id:11, name:'11. Loose ball scramble', cam:'zoom', setup(w){
  parkAll(w); put(w,7, 48,28); put(w,17, 56,40); ballAt(w, 52,34);
  w.ball.vx = 3; w.ball.vy = -1.5;
  at(w, 0.2, ww => { ww.intents[7] = {kind:'PURSUE', scripted:true}; ww.intents[17] = {kind:'PURSUE', scripted:true}; });
}},
{id:12, name:'12. Interception of a risky pass', cam:'broadcast', setup(w){
  parkAll(w); put(w,6, 40,30, 0); put(w,9, 66,34); put(w,18, 54,32.5, Math.PI); ballAt(w, 40.8,30.2); w.ball.controller = 6;
  at(w, 0.7, ww => { ww.intents[6] = {kind:'PASS', to: 9, scripted:true}; });
  at(w, 1.0, ww => { ww.intents[18] = {kind:'PURSUE', scripted:true}; });
}},
{id:13, name:'13. Tackle (poke) on a carrier', cam:'zoom', setup(w){
  parkAll(w); put(w,9, 55,34, 0); put(w,18, 63,35, Math.PI); ballAt(w, 55.8,34.2); w.ball.controller = 9;
  at(w, 0.3, ww => { ww.intents[9] = {kind:'CARRY', scripted:true}; ww.intents[18] = {kind:'PRESS', scripted:true}; });
}},
{id:14, name:'14. 1v1 take-on (inside cut)', cam:'zoom', setup(w){
  parkAll(w); put(w,8, 70,50, 0); put(w,12, 78,48, Math.PI); ballAt(w, 70.8,50.2); w.ball.controller = 8;
  at(w, 0.3, ww => { ww.intents[8] = {kind:'CARRY', scripted:true}; ww.intents[12] = {kind:'PRESS', scripted:true}; });
  at(w, 1.1, ww => { ww.intents[8] = {kind:'TAKE_ON', side: -1, scripted:true}; });
}},
{id:15, name:'15. Beat + chase (fast att vs slow def)', cam:'broadcast', setup(w){
  parkAll(w);
  const a = put(w,8, 62,44, 0); a.vmax = 8.8;
  const d = put(w,12, 70,44, Math.PI); d.vmax = 7.2;
  ballAt(w, 62.8,44.2); w.ball.controller = 8;
  at(w, 0.3, ww => { ww.intents[8] = {kind:'CARRY', scripted:true}; ww.intents[12] = {kind:'PRESS', scripted:true}; });
  at(w, 1.0, ww => { ww.intents[8] = {kind:'TAKE_ON', side: 1, scripted:true}; });
  at(w, 2.2, ww => { ww.intents[8] = {kind:'CARRY', scripted:true}; });
}},
{id:16, name:'16. Beat + chase (slow att vs fast def)', cam:'broadcast', setup(w){
  parkAll(w);
  const a = put(w,8, 62,24, 0); a.vmax = 7.3;
  const d = put(w,12, 70,24, Math.PI); d.vmax = 8.8;
  ballAt(w, 62.8,24.2); w.ball.controller = 8;
  at(w, 0.3, ww => { ww.intents[8] = {kind:'CARRY', scripted:true}; ww.intents[12] = {kind:'PRESS', scripted:true}; });
  at(w, 1.0, ww => { ww.intents[8] = {kind:'TAKE_ON', side: 1, scripted:true}; });
  at(w, 2.2, ww => { ww.intents[8] = {kind:'CARRY', scripted:true}; });
}},
{id:17, name:'17. Dribble at jog vs sprint (touch spacing)', cam:'broadcast', setup(w){
  parkAll(w); put(w,9, 25,20, 0); ballAt(w, 25.8,20.2); w.ball.controller = 9;
  at(w, 0.3, ww => { ww.intents[9] = {kind:'MOVE_TO', x: 60, y: 20, speed: 4.2, scripted:true}; });
  w.scenarioTick2 = true;
  at(w, 0.31, ww => { ww._carryJog = true; });
  at(w, 9.0, ww => { put(ww,9, 25,44, 0); ballAt(ww, 25.8,44.2); ww.ball.controller = 9;
                     ww.intents[9] = {kind:'CARRY', scripted:true}; });
  const baseTick = w.scenarioTick;
  w.scenarioTick = ww => { baseTick(ww);
    if(ww._carryJog && ww.worldClock < 9.0){ const p = ww.players[9];
      if(ww.ball.controller === 9) carryTouchesHook(ww, p, 0); } };
}},
{id:18, name:'18. Kickoff', cam:'broadcast', setup(w){
  w.freeplay = true;
  w.restart = {state:'KICKOFF_SETUP', t:0, team:0, spot:{x:52.5,y:34}, taker:null, reason:'scenario kickoff'};
  for(const p of w.players){ p.x += (kh(w.seed, p.pid, 1, 1)-0.5)*30; p.y += (kh(w.seed, p.pid, 2, 2)-0.5)*20; }
}},
{id:19, name:'19. Throw-in', cam:'broadcast', setup(w){
  w.freeplay = true;
  ballAt(w, 60, 1); w.ball.state='ROLLING'; w.ball.lastTouch = 13; w.restart.state = 'OPEN';
  w.ball.vy = -4; w.ball.y = 0.5;  // rolling out over the line
}},
{id:20, name:'20. Corner', cam:'broadcast', setup(w){
  w.freeplay = true;
  w.restart = {state:'CORNER_SETUP', t:0, team:0, spot:{x:104.7,y:0.3}, taker:null, reason:'scenario corner'};
}},
{id:21, name:'21. Free kick (edge of box)', cam:'broadcast', setup(w){
  w.freeplay = true;
  w.restart = {state:'FREE_KICK_SETUP', t:0, team:0, spot:{x:84,y:30}, taker:null, reason:'scenario free kick'};
}},
{id:22, name:'22. Goal → aftermath → kickoff reset', cam:'broadcast', setup(w){
  parkAll(w); w.freeplay = true;
  put(w,9, 96,32, 0); put(w,11, 103.4,38.5); ballAt(w, 96.8,32.2); w.ball.controller = 9;
  const gk = w.players[11]; gk.vmax = 0.1;   // wrong-footed keeper: the reset choreography must show
  at(w, 0.5, ww => { ww.intents[9] = {kind:'SHOOT', scripted:true}; });
  at(w, 1.2, ww => { for(const p of ww.players) delete ww.intents[p.pid]; ww.players[11].vmax = 7.2; });
}},
{id:23, name:'23. 3v3 sequence', cam:'broadcast', setup(w){
  parkAll(w); w.freeplay = true;
  const use = [6,8,9, 14,15,12];
  put(w,6, 55,30, 0); put(w,8, 62,42, 0); put(w,9, 70,32, 0);
  put(w,14, 76,30, Math.PI); put(w,15, 74,42, Math.PI); put(w,12, 84,36, Math.PI);
  put(w,11, 103,34);
  for(const p of w.players) if(!use.includes(p.pid) && p.pid !== 11){ p.x = p.team === 0 ? 8 + p.slot : PITCH.W - 8 - p.slot; p.y = 2 + p.slot*1.2; w.intents[p.pid] = {kind:'HOLD', scripted:true}; }
  ballAt(w, 55.8,30.2); w.ball.controller = 6;
}},
{id:24, name:'24. Primitive 11v11 match', cam:'broadcast', setup(w){
  w.freeplay = true;
  w.restart = {state:'KICKOFF_SETUP', t:0, team:0, spot:{x:52.5,y:34}, taker:null, reason:'match start'};
}},
];
/* hooks used by scenarios (bound in index.html to runtime internals) */
let contactHook = () => {}, carryTouchesHook = () => {};
function bindScenarioHooks(ch, cth){ contactHook = ch; carryTouchesHook = cth; }
if(typeof module !== 'undefined') module.exports = {SCENARIOS, bindScenarioHooks};
