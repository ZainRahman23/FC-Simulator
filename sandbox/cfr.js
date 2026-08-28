/* ═══════════════════════════════════════════════════════════════════════════
   TOUCHLINE CONTINUOUS FOOTBALL RUNTIME (CFR) — isolated sandbox substrate.
   Phase: BODY ONLY. No cal11 import, no production dependency, no deployment.
   Physical principles informed by OpenSWOS (MIT, (c) 2026 Grzegorz Korycki,
   github.com/angree/openswos): continuous x/y/z ball with linear friction and
   per-impact restitution, radius-based possession with kicker exclusion,
   touch-ahead dribbling, physical restart states, slew camera. All code
   Touchline-native, metric units, fixed 60 Hz deterministic timestep.
   Determinism: zero Math.random; primitive test-AI tie-breaks use a stateless
   keyed hash of (seed, tick, player, tag) — order-independent, replayable.
   THE BALL MAY NOT TELEPORT: position only ever integrates velocity; the only
   sanctioned placements are dead-ball restarts, each logged with its reason.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const DT = 1/60;
const PITCH = {W: 105, H: 68, GOAL_W: 7.32, GOAL_H: 2.44};
const BALL = {R: 0.11, G: 9.81, MU_ROLL: 4.2, MU_AIR: 0.8, REST: 0.55, KEEP: 0.80, SETTLE: 1.0};
const BODY = {R: 0.42, REACH: 0.9, GK_REACH: 1.6, EXCL: 0.45,
              ACC: 4.8, BRAKE: 6.5, VMAX: 8.4, VJOG: 4.4, CARRY_MUL: 0.875, RUNBACK_MUL: 0.625};

/* keyed deterministic hash → [0,1) */
function kh(seed, a, b, c){
  let h = (seed|0) ^ 0x9e3779b9;
  for(const v of [a|0, b|0, c|0]){
    h = Math.imul(h ^ v, 2654435761); h ^= h >>> 13; h = Math.imul(h, 2246822519); h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a + Math.PI*3) % (Math.PI*2) - Math.PI; return d; };

/* ── formations (sandbox 4-4-2, attacking left→right for HOME) ──────────── */
const F442 = [
  {r:'GK', x: 4,  y: 34}, {r:'LB', x: 20, y: 12}, {r:'LCB', x: 17, y: 26}, {r:'RCB', x: 17, y: 42},
  {r:'RB', x: 20, y: 56}, {r:'LM', x: 42, y: 12}, {r:'LCM', x: 38, y: 26}, {r:'RCM', x: 38, y: 42},
  {r:'RM', x: 42, y: 56}, {r:'ST1', x: 52, y: 28}, {r:'ST2', x: 52, y: 40},
];
function kickoffAnchor(slot, team, kicking){
  const a = {...F442[slot]};
  if(team === 1){ a.x = PITCH.W - a.x; }
  if(kicking && (a.r === 'ST1')) { a.x = team === 0 ? 52.2 : PITCH.W - 52.2; a.y = 33.2; }
  else if(a.r === 'ST1' || a.r === 'ST2'){ a.x = team === 0 ? 45 : PITCH.W - 45; }
  return a;
}
function openAnchor(slot, team, ballX){
  const a = {...F442[slot]};
  if(team === 1) a.x = PITCH.W - a.x;
  const shift = clamp((ballX - PITCH.W/2) * 0.35, -14, 14);
  if(a.r !== 'GK'){ a.x = clamp(a.x + shift, 3, PITCH.W - 3); }
  return a;
}

/* ── world construction ─────────────────────────────────────────────────── */
function makeWorld(seed){
  const w = {
    seed: seed|0, tick: 0, worldClock: 0, matchClock: 0, matchScale: 1,
    ball: {x: PITCH.W/2, y: PITCH.H/2, z: 0, vx: 0, vy: 0, vz: 0,
           state: 'DEAD', lastTouch: null, controller: null, exclPid: null, exclT: 0, heldBy: null},
    players: [], score: [0, 0],
    restart: {state: 'KICKOFF_SETUP', t: 0, team: 0, spot: {x: PITCH.W/2, y: PITCH.H/2}, taker: null, reason: 'match start'},
    log: {contacts: [], placements: [], violations: 0, maxJump: 0},
    metrics: {spd: [], acc: [], ballspd: [], flights: [], touches: 0},
    intents: {}, selected: null, scenarioTick: null, freeplay: true, camHint: null,
  };
  for(let team = 0; team < 2; team++)
    for(let s = 0; s < 11; s++){
      const a = kickoffAnchor(s, team, false);
      w.players.push({pid: team*11 + s, team, slot: s, role: F442[s].r,
                      x: a.x, y: a.y, vx: 0, vy: 0, facing: team === 0 ? 0 : Math.PI,
                      vmax: F442[s].r === 'GK' ? 7.2 : 8.0 + (s % 3) * 0.25,
                      loco: 'IDLE', contact: 'NONE', gait: (team*11+s) * 0.61,
                      touchT: 0, windup: null, stunned: 0, ai: {}});
    }
  return w;
}

/* ── the ONLY inbound control surface (future brain/body interface) ─────── */
function issueIntent(w, pid, intent){ w.intents[pid] = intent; }

/* ── kick solver: family + from + to → impulse (real-speed physics) ─────── */
function solveKick(from, to, fam){
  const D = Math.max(0.5, dist(from, to));
  const ux = (to.x - from.x)/D, uy = (to.y - from.y)/D;
  let v0, vz = 0;
  switch(fam){
    case 'SHORT':   v0 = clamp(Math.sqrt(2*BALL.MU_ROLL*D) + 2.5, 9, 17); break;
    case 'DRIVEN':  v0 = clamp(14 + D*0.35, 20, 24); break;
    case 'LONGG':   v0 = clamp(16 + D*0.3, 24, 27); break;
    case 'THROUGH': v0 = clamp(13 + D*0.35, 18, 22); break;
    case 'CUTBACK': v0 = clamp(10 + D*0.3, 12, 16); break;
    case 'LOFT': { const T = clamp(D/13, 0.9, 2.6); vz = BALL.G*T/2; v0 = D/T; break; }
    case 'CROSS': { const T = clamp(D/15, 0.8, 2.0); vz = BALL.G*T/2; v0 = D/T; break; }
    case 'CLEAR': { const T = clamp(D/11, 1.2, 2.6); vz = BALL.G*T/2*1.15; v0 = D/T; break; }
    case 'SHOT':    v0 = clamp(24 + D*0.3, 24, 31); vz = clamp(0.5 + D*0.06, 0.5, 2.2); break;
    case 'PUNT': { const T = clamp(D/12, 1.6, 2.8); vz = BALL.G*T/2; v0 = D/T; break; }
    case 'THROWIN': { const T = clamp(D/8, 0.7, 1.4); vz = BALL.G*T/2*0.8; v0 = D/T; break; }
    case 'HEADER':  v0 = clamp(8 + D*0.3, 8, 15); vz = 1.2; break;
    default:        v0 = clamp(Math.sqrt(2*BALL.MU_ROLL*D) + 2.5, 9, 17);
  }
  return {vx: ux*v0, vy: uy*v0, vz};
}

/* ── contact log: every ball velocity change has a named physical cause ── */
function contact(w, kind, pid, note){
  w.ball.lastTouch = pid !== null ? pid : w.ball.lastTouch;
  w.log.contacts.push({t: +w.worldClock.toFixed(2), kind, pid, note});
  if(w.log.contacts.length > 4000) w.log.contacts.splice(0, 2000);
}
function place(w, x, y, reason){       // sanctioned dead-ball placement ONLY
  const b = w.ball;
  w.log.placements.push({t: +w.worldClock.toFixed(2), from: [b.x, b.y].map(v=>+v.toFixed(1)), to: [x, y], reason});
  b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; b.state = 'DEAD'; b.controller = null; b.heldBy = null;
}
function kickBall(w, p, to, fam){
  const b = w.ball;
  const k = solveKick(b, to, fam);
  b.vx = k.vx; b.vy = k.vy; b.vz = k.vz;
  b.z = Math.max(b.z, 0.001 * (k.vz > 0 ? 1 : 0));
  b.state = k.vz > 0.4 ? 'AIRBORNE' : 'ROLLING';
  b.controller = null; b.heldBy = null;
  b.exclPid = p.pid; b.exclT = w.worldClock + BODY.EXCL;
  p.contact = 'NONE';
  contact(w, 'KICK:'+fam, p.pid, `${Math.hypot(k.vx,k.vy).toFixed(1)} m/s`);
  if(k.vz > 0.4) w.metrics.flights.push({t0: w.worldClock, fam});
}

/* ── locomotion: acceleration/brake/turn-limited physical bodies ────────── */
function locomote(w, p, want){
  // want: {x, y, speed} desired destination + travel speed (0 = stop)
  let dvx = 0, dvy = 0;
  if(want && want.speed > 0.05){
    const d = dist(p, want);
    const sp = Math.min(want.speed, d < 1.8 ? Math.max(0.6, d*2.2) : want.speed);
    if(d > 0.12){ dvx = (want.x - p.x)/d * sp; dvy = (want.y - p.y)/d * sp; }
  }
  const cur = Math.hypot(p.vx, p.vy);
  const des = Math.hypot(dvx, dvy);
  // turning at speed: if the desired direction differs sharply, must brake first
  let accLim = BODY.ACC;
  if(des < cur - 0.2) accLim = BODY.BRAKE;
  else if(cur > 3 && des > 0.1){
    const turn = Math.abs(angDiff(Math.atan2(p.vy, p.vx), Math.atan2(dvy, dvx)));
    if(turn > 1.15){ accLim = BODY.BRAKE; dvx *= 0.15; dvy *= 0.15; }   // overcommit: kill speed, then re-accelerate
    else if(turn > 0.55) accLim = BODY.ACC * 0.7;
  }
  const ax = dvx - p.vx, ay = dvy - p.vy, am = Math.hypot(ax, ay);
  const lim = accLim * DT;
  if(am > lim){ p.vx += ax/am*lim; p.vy += ay/am*lim; } else { p.vx = dvx; p.vy = dvy; }
  p.x = clamp(p.x + p.vx*DT, -2, PITCH.W + 2);
  p.y = clamp(p.y + p.vy*DT, -2, PITCH.H + 2);
  const v = Math.hypot(p.vx, p.vy);
  // facing: toward motion (rate limited, slower while sprinting), else toward ball
  const wantFace = v > 0.7 ? Math.atan2(p.vy, p.vx) : angTo(p, w.ball);
  const rate = clamp(5.5 - v*0.45, 1.5, 5.5) * DT;
  const df = angDiff(p.facing, wantFace);
  p.facing += Math.abs(df) > rate ? Math.sign(df)*rate : df;
  p.loco = p.stunned > w.worldClock ? 'RECOVER'
         : v < 0.3 ? 'IDLE' : v < 2 ? 'WALK' : v < 4.5 ? 'JOG' : v < 6.8 ? 'RUN' : 'SPRINT';
  p.gait += v * DT * 1.4;
  return v;
}

/* ── ball physics + physical interaction ────────────────────────────────── */
function stepBall(w){
  const b = w.ball;
  if(b.state === 'DEAD') return;
  if(b.heldBy !== null){                       // in the keeper's hands (physical hold)
    const gk = w.players[b.heldBy];
    b.x = gk.x + Math.cos(gk.facing)*0.5; b.y = gk.y + Math.sin(gk.facing)*0.5;
    b.z = 0.9; b.vx = gk.vx; b.vy = gk.vy; b.vz = 0;
    return;
  }
  const px = b.x, py = b.y;
  const preSp = Math.hypot(b.vx, b.vy);
  b.x += b.vx*DT; b.y += b.vy*DT; b.z += b.vz*DT;
  if(b.z > 0) b.vz -= BALL.G*DT;
  if(b.z <= 0){
    if(b.vz < 0){
      const r = -b.vz*BALL.REST;
      if(r < BALL.SETTLE){ b.vz = 0; b.state = 'ROLLING'; }
      else { b.vz = r; b.vx *= BALL.KEEP; b.vy *= BALL.KEEP; contact(w, 'BOUNCE', null, `vz ${r.toFixed(1)}`); }
    }
    b.z = Math.max(0, b.z);
  } else b.state = 'AIRBORNE';
  const sp = Math.hypot(b.vx, b.vy);
  if(sp > 0){
    const mu = b.z > 0.05 ? BALL.MU_AIR : BALL.MU_ROLL;
    const ns = Math.max(0, sp - mu*DT);
    b.vx *= ns/sp; b.vy *= ns/sp;
    if(ns < 0.15 && b.z <= 0.01){ b.vx = b.vy = 0; }
  }
  // continuity check: displacement must equal integrated velocity
  const d = Math.hypot(b.x - px, b.y - py);
  const allowed = Math.max(preSp, sp, Math.hypot(b.vx, b.vy)) * DT + 0.02;
  if(d > allowed + 0.05){ w.log.violations++; }
  if(d > w.log.maxJump) w.log.maxJump = d;
  if(w.tick % 6 === 0) w.metrics.ballspd.push(sp);
}

function ballInteraction(w){
  const b = w.ball;
  if(b.state === 'DEAD' || b.heldBy !== null) return;
  // nearest eligible body (keepers get hands priority in own box)
  let best = null, bd = 1e9;
  for(const p of w.players){
    if(b.exclPid === p.pid && w.worldClock < b.exclT) continue;
    const isGK = p.role === 'GK';
    const inOwnBox = isGK && ((p.team === 0 && b.x < 16.5) || (p.team === 1 && b.x > PITCH.W - 16.5)) && Math.abs(b.y - 34) < 20.15;
    const reach = inOwnBox ? BODY.GK_REACH : BODY.REACH;
    const zmax = inOwnBox ? 2.3 : 1.4;
    const d = dist(p, b);
    if(d < reach && b.z < zmax && d < bd){ best = p; bd = d; }
  }
  if(!best) return;
  const p = best;
  const rvx = b.vx - p.vx, rvy = b.vy - p.vy;
  const rv = Math.hypot(rvx, rvy);
  const isGK = p.role === 'GK' && ((p.team === 0 && b.x < 16.5) || (p.team === 1 && b.x > PITCH.W - 16.5));
  if(isGK && rv >= 16 && bd > 0.8) return;    // too fast: only stops what his hands truly reach
  if(isGK && b.z < 2.3){
    if(rv < 9){ b.heldBy = p.pid; b.state = 'ROLLING'; contact(w, 'GK_CATCH', p.pid, ''); }
    else {  // parry: physical deflection
      const n = angTo(b, p) + Math.PI + (kh(w.seed, w.tick, p.pid, 7) - 0.5);
      const spd = rv * 0.45;
      b.vx = Math.cos(n)*spd; b.vy = Math.sin(n)*spd; b.vz = Math.max(b.vz*0.3, 1.5);
      b.exclPid = p.pid; b.exclT = w.worldClock + 0.4;
      contact(w, 'GK_PARRY', p.pid, '');
    }
    return;
  }
  if(b.controller === p.pid){
    // carrier touch management happens in the AI/carry logic (touch impulses)
    return;
  }
  if(rv < 5.5){
    // clean first touch: settle the ball just ahead of the body
    const a = p.facing;
    b.vx = p.vx*0.7 + Math.cos(a)*1.1; b.vy = p.vy*0.7 + Math.sin(a)*1.1;
    if(b.z > 0 && b.z < 1.6){ b.vz = Math.min(b.vz, 0.4); }
    b.controller = p.pid; b.state = 'ROLLING';
    p.contact = 'CARRY';
    contact(w, 'CONTROL', p.pid, `rv ${rv.toFixed(1)}`);
    w.metrics.touches++;
  } else if(rv < 12){
    // imperfect touch: killed but loose
    const bias = angTo(b, {x: b.x + rvx, y: b.y + rvy});
    const a = bias + (kh(w.seed, w.tick, p.pid, 3) - 0.5) * 1.2;
    const spd = rv * 0.35;
    b.vx = Math.cos(a)*spd + p.vx*0.4; b.vy = Math.sin(a)*spd + p.vy*0.4; b.vz = Math.min(b.vz, 0.8);
    b.controller = null;
    b.exclPid = p.pid; b.exclT = w.worldClock + 0.35;
    contact(w, 'TOUCH_LOOSE', p.pid, `rv ${rv.toFixed(1)}`);
    w.metrics.touches++;
  } else {
    // hard deflection off the body
    const n = angTo(p, b);
    const spd = rv * 0.5;
    b.vx = Math.cos(n)*spd; b.vy = Math.sin(n)*spd; b.vz = Math.max(0.5, b.vz*0.4);
    b.exclPid = p.pid; b.exclT = w.worldClock + 0.35;
    contact(w, 'DEFLECT', p.pid, `rv ${rv.toFixed(1)}`);
  }
}

/* carrier dribble touches: the ball is never glued — repeated impulses */
function carryTouches(w, p, corridor){
  const b = w.ball;
  if(b.controller !== p.pid || b.heldBy !== null) return;
  const d = dist(p, b);
  p.touchT -= DT;
  if(d > 4.2){ b.controller = null; p.contact = 'NONE'; return; }   // ball got away
  if(d < 0.85 && p.touchT <= 0){
    const pv = Math.hypot(p.vx, p.vy);
    const a = corridor !== undefined ? corridor : p.facing;
    const knock = pv > 6 ? pv + 2.6 : pv > 3 ? pv + 1.5 : Math.max(2.0, pv + 1.0);
    b.vx = Math.cos(a)*knock; b.vy = Math.sin(a)*knock; b.vz = 0; b.state = 'ROLLING';
    p.touchT = pv > 6 ? 0.5 : 0.38;
    contact(w, 'DRIBBLE_TOUCH', p.pid, `${knock.toFixed(1)} m/s`);
    w.metrics.touches++;
  }
}

/* soft body separation so duels have physical presence */
function separateBodies(w){
  const ps = w.players;
  for(let i = 0; i < ps.length; i++)
    for(let j = i+1; j < ps.length; j++){
      const a = ps[i], c = ps[j];
      const dx = c.x - a.x, dy = c.y - a.y;
      const d2 = dx*dx + dy*dy, min = BODY.R*2*1.05;
      if(d2 < min*min && d2 > 1e-6){
        const d = Math.sqrt(d2), push = (min - d)/2;
        const ux = dx/d, uy = dy/d;
        a.x -= ux*push; a.y -= uy*push; c.x += ux*push; c.y += uy*push;
      }
    }
}

/* ── restart manager: explicit dead-ball state machines ─────────────────── */
function outOfPlayCheck(w){
  const b = w.ball;
  if(b.state === 'DEAD' || w.restart.state !== 'OPEN') return;
  const lastTeam = b.lastTouch !== null ? w.players[b.lastTouch].team : 0;
  if(b.y < -0.1 || b.y > PITCH.H + 0.1){
    startRestart(w, 'THROW_IN', 1 - lastTeam, {x: clamp(b.x, 1, PITCH.W-1), y: b.y < 0 ? 0 : PITCH.H}, 'ball over touchline');
  } else if(b.x < -0.1 || b.x > PITCH.W + 0.1){
    const atRight = b.x > PITCH.W;
    const inMouth = Math.abs(b.y - PITCH.H/2) < PITCH.GOAL_W/2 && b.z < PITCH.GOAL_H;
    if(inMouth){
      const scorer = 1 - (atRight ? 1 : 0) === 1 ? null : null;
      const scoringTeam = atRight ? 0 : 1;
      w.score[scoringTeam]++;
      w.restart = {state: 'GOAL_AFTERMATH', t: 0, team: 1 - scoringTeam, spot: {x: PITCH.W/2, y: PITCH.H/2},
                   taker: null, reason: `GOAL team ${scoringTeam}`};
      w.ball.state = 'DEAD'; w.ball.vx *= 0.1; w.ball.vy *= 0.1;
      contact(w, 'GOAL', b.lastTouch, `score ${w.score[0]}-${w.score[1]}`);
    } else {
      const defendingTeam = atRight ? 1 : 0;
      if(lastTeam === defendingTeam){
        const cy = b.y < PITCH.H/2 ? 0.3 : PITCH.H - 0.3;
        const cx = atRight ? PITCH.W - 0.3 : 0.3;
        startRestart(w, 'CORNER', 1 - defendingTeam, {x: cx, y: cy}, 'ball over goal line off defender');
      } else {
        const gx = atRight ? PITCH.W - 5.5 : 5.5;
        startRestart(w, 'GOAL_KICK', defendingTeam, {x: gx, y: PITCH.H/2 + (b.y < PITCH.H/2 ? -6 : 6)}, 'ball over goal line off attacker');
      }
    }
  }
}
function startRestart(w, kind, team, spot, reason){
  w.ball.state = 'DEAD'; w.ball.vx = w.ball.vy = w.ball.vz = 0; w.ball.heldBy = null; w.ball.controller = null;
  w.restart = {state: kind + '_SETUP', t: 0, team, spot, taker: null, reason};
}
function nearestPlayer(w, team, pt, excludeGK){
  let best = null, bd = 1e9;
  for(const p of w.players){
    if(p.team !== team) continue;
    if(excludeGK && p.role === 'GK') continue;
    const d = dist(p, pt);
    if(d < bd){ best = p; bd = d; }
  }
  return best;
}
function restartTick(w){
  const r = w.restart;
  if(r.state === 'OPEN') return false;
  r.t += DT;
  const kind = r.state.replace('_SETUP','').replace('_TAKE','');
  if(r.state === 'GOAL_AFTERMATH'){
    // brief celebration/recovery, then everyone physically returns for kickoff
    if(r.t > 2.5){ w.restart = {state: 'KICKOFF_SETUP', t: 0, team: r.team, spot: {x: PITCH.W/2, y: PITCH.H/2}, taker: null, reason: 'kickoff after goal'}; }
    for(const p of w.players) locomote(w, p, null);
    stepBall(w);
    return true;
  }
  if(r.state.endsWith('_SETUP')){
    // players physically move to restart positions (run-back pace)
    let ready = 0, total = 0;
    for(const p of w.players){
      let a;
      if(kind === 'KICKOFF'){ a = kickoffAnchor(p.slot, p.team, p.team === r.team); }
      else {
        a = openAnchor(p.slot, p.team, r.spot.x);
        if(kind === 'CORNER' && p.team === r.team && (p.role === 'ST1' || p.role === 'ST2' || p.role === 'LCM' || p.role === 'RCM')){
          a = {x: r.team === 0 ? PITCH.W - 9 - (p.slot % 3)*2.4 : 9 + (p.slot % 3)*2.4, y: 28 + (p.slot % 4)*4};
        }
        if(kind === 'CORNER' && p.team !== r.team && p.role !== 'GK'){
          a = {x: p.team === 0 ? 8 + (p.slot % 4)*2.2 : PITCH.W - 8 - (p.slot % 4)*2.2, y: 27 + (p.slot % 5)*3.5};
        }
        if(kind === 'KICKOFF' || kind === 'FREE_KICK'){ /* default shape */ }
      }
      if(r.taker === p.pid) a = {x: r.spot.x - (p.team === 0 ? 1.2 : -1.2) * (kind === 'THROW_IN' ? 0 : 1), y: r.spot.y + (kind === 'THROW_IN' ? (r.spot.y < 34 ? -0.8 : 0.8) : 0)};
      const d = dist(p, a);
      total++;
      if(d < 1.6) ready++;
      locomote(w, p, {x: a.x, y: a.y, speed: BODY.VMAX * BODY.RUNBACK_MUL * (d > 12 ? 1.25 : 1)});
    }
    if(r.taker === null){ const tk = nearestPlayer(w, r.team, r.spot, kind !== 'GOAL_KICK'); r.taker = tk ? tk.pid : null; }
    stepBall(w);
    if((ready >= total - 2 && r.t > 1.2) || r.t > 14){
      place(w, r.spot.x, r.spot.y, kind + ' placement (' + r.reason + ')');
      r.state = kind + '_TAKE'; r.t = 0;
    }
    return true;
  }
  if(r.state.endsWith('_TAKE')){
    const taker = r.taker !== null ? w.players[r.taker] : null;
    for(const p of w.players) if(p !== taker) locomote(w, p, null);
    if(taker){
      const d = dist(taker, w.ball);
      if(d > 1.0){ locomote(w, taker, {x: w.ball.x, y: w.ball.y, speed: 3.2}); }
      else if(r.t > 0.5){
        w.ball.state = 'ROLLING';
        let to, fam;
        const dir = r.team === 0 ? 1 : -1;
        if(kind === 'KICKOFF'){ const mate = w.players[r.team*11 + 10]; to = {x: mate.x, y: mate.y}; fam = 'SHORT'; }
        else if(kind === 'THROW_IN'){ const m = nearestMate(w, taker, 14); to = m ? {x: m.x, y: m.y} : {x: taker.x + dir*8, y: clamp(taker.y + (taker.y < 34 ? 6 : -6), 2, 66)}; fam = 'THROWIN'; }
        else if(kind === 'CORNER'){ to = {x: r.team === 0 ? PITCH.W - 8 : 8, y: 31 + kh(w.seed, w.tick, taker.pid, 5)*6}; fam = 'CROSS'; }
        else if(kind === 'GOAL_KICK'){ to = {x: taker.x + dir*46, y: clamp(taker.y + (kh(w.seed, w.tick, taker.pid, 6) - 0.5)*30, 6, 62)}; fam = 'PUNT'; }
        else if(kind === 'FREE_KICK'){ const m = nearestMate(w, taker, 26); to = m ? {x: m.x, y: m.y} : {x: taker.x + dir*20, y: taker.y}; fam = dist(taker, {x: r.team===0?105:0, y:34}) < 30 ? 'CROSS' : 'DRIVEN'; }
        else { to = {x: taker.x + dir*12, y: taker.y}; fam = 'SHORT'; }
        kickBall(w, taker, to, fam);
        w.restart = {state: 'OPEN', t: 0, team: r.team, spot: r.spot, taker: null, reason: ''};
      }
    } else { w.restart.state = 'OPEN'; }
    stepBall(w);
    return true;
  }
  return false;
}
function nearestMate(w, p, maxD){
  let best = null, bd = maxD || 1e9;
  for(const m of w.players){
    if(m.team !== p.team || m === p || m.role === 'GK') continue;
    const d = dist(p, m);
    if(d < bd){ best = m; bd = d; }
  }
  return best;
}

/* ── primitive TEST AI (disposable scaffolding — NOT the Touchline brain) ── */
function testAI(w){
  const b = w.ball;
  const attTeam = b.controller !== null ? w.players[b.controller].team
               : (b.lastTouch !== null ? w.players[b.lastTouch].team : 0);
  // pursuit assignment: nearest 1-2 per team to a loose ball
  const loose = b.controller === null && b.heldBy === null;
  const byDist = [[],[]];
  for(const p of w.players) byDist[p.team].push([dist(p, b), p]);
  byDist[0].sort((a,c)=>a[0]-c[0]); byDist[1].sort((a,c)=>a[0]-c[0]);
  for(const p of w.players){
    if(w.intents[p.pid] && w.intents[p.pid].scripted) continue;   // scenario-scripted players
    const goalX = p.team === 0 ? PITCH.W : 0;
    if(b.heldBy === p.pid){
      // GK distributes after a short hold
      if(!p.ai.holdT) p.ai.holdT = w.worldClock;
      if(w.worldClock - p.ai.holdT > 2.2){
        const m = nearestMate(w, p, 30) || w.players[p.team*11+9];
        b.heldBy = null; b.state = 'ROLLING';
        kickBall(w, p, kh(w.seed, w.tick, p.pid, 9) < 0.5 && m ? {x: m.x, y: m.y} : {x: p.x + (p.team===0?42:-42), y: clamp(p.y + (kh(w.seed, w.tick, p.pid, 10)-0.5)*28, 6, 62)}, 'PUNT');
        p.ai.holdT = 0;
      }
      issueIntent(w, p.pid, {kind: 'HOLD'});
      continue;
    }
    if(b.controller === p.pid){
      p.ai.holdT = 0;
      // carrier decision every 0.3 s (deterministic)
      if(!p.ai.nextDec || w.worldClock >= p.ai.nextDec){
        p.ai.nextDec = w.worldClock + 0.3;
        const gd = dist(p, {x: goalX, y: PITCH.H/2});
        const press = byDist[1 - p.team][0] && dist(byDist[1-p.team][0][1], p) < 3.5 ? byDist[1-p.team][0][1] : null;
        // shoot?
        if(gd < 20 && Math.abs(p.y - 34) < 16){
          issueIntent(w, p.pid, {kind: 'SHOOT'});
        } else if(press && kh(w.seed, (w.worldClock*10)|0, p.pid, 11) < 0.45){
          // pressed: pass to the most open forward mate
          const m = bestPassOption(w, p);
          issueIntent(w, p.pid, m ? {kind: 'PASS', to: m.pid} : {kind: 'CARRY'});
        } else if(press && Math.abs(angDiff(angTo(p, press), Math.atan2((34-p.y)*0.2 + 0.001, goalX - p.x))) < 0.8 && dist(p, press) < 4.5){
          // defender directly in the path: attempt a take-on
          const side = kh(w.seed, (w.worldClock*10)|0, p.pid, 12) < 0.5 ? 1 : -1;
          issueIntent(w, p.pid, {kind: 'TAKE_ON', side});
        } else {
          const m = kh(w.seed, (w.worldClock*10)|0, p.pid, 13) < 0.25 ? bestPassOption(w, p) : null;
          issueIntent(w, p.pid, m ? {kind: 'PASS', to: m.pid} : {kind: 'CARRY'});
        }
      }
    } else if(loose && byDist[p.team][0] && byDist[p.team][0][1] === p && w.restart.state === 'OPEN'){
      issueIntent(w, p.pid, {kind: 'PURSUE'});
    } else if(p.team !== attTeam){
      // defense: nearest presses the ball, second covers goal-side
      const rank = byDist[p.team].findIndex(e => e[1] === p);
      if(rank === 0) issueIntent(w, p.pid, {kind: 'PRESS'});
      else if(rank === 1) issueIntent(w, p.pid, {kind: 'COVER'});
      else issueIntent(w, p.pid, {kind: 'SHAPE'});
    } else {
      // simple support: one forward runner beyond the ball
      if((p.role === 'ST1' || p.role === 'ST2') && b.controller !== null && Math.abs(p.y - b.y) < 22 && kh(w.seed, (w.worldClock*2)|0, p.pid, 14) < 0.3)
        issueIntent(w, p.pid, {kind: 'RUN_BEYOND'});
      else issueIntent(w, p.pid, {kind: 'SHAPE'});
    }
  }
}
function bestPassOption(w, p){
  let best = null, bs = -1e9;
  for(const m of w.players){
    if(m.team !== p.team || m === p || m.role === 'GK') continue;
    const d = dist(p, m);
    if(d < 5 || d > 38) continue;
    // openness: nearest opponent distance to the passing lane
    let openness = 1e9;
    for(const o of w.players){
      if(o.team === p.team) continue;
      const t = clamp(((o.x-p.x)*(m.x-p.x) + (o.y-p.y)*(m.y-p.y)) / (d*d), 0, 1);
      const lx = p.x + (m.x-p.x)*t, ly = p.y + (m.y-p.y)*t;
      openness = Math.min(openness, Math.hypot(o.x-lx, o.y-ly));
    }
    const forward = (p.team === 0 ? m.x - p.x : p.x - m.x);
    const score = openness*2 + forward*0.5 - d*0.08;
    if(openness > 1.6 && score > bs){ bs = score; best = m; }
  }
  return best;
}
/* execute intents through the physical vocabulary */
function actIntents(w){
  const b = w.ball;
  for(const p of w.players){
    const it = w.intents[p.pid];
    if(!it){ locomote(w, p, null); continue; }
    const goalX = p.team === 0 ? PITCH.W : 0;
    switch(it.kind){
      case 'PURSUE': case 'PRESS': {
        // predict a simple intercept point (ball + velocity lead), with human
        // REACTION LATENCY: the pursuit point refreshes every 0.3 s, so a sharp
        // direction change by the carrier buys a genuine transient advantage
        if(!p.ai.pressPt || w.worldClock >= (p.ai.pressT || 0)){
          const lead = Math.min(1.2, dist(p, b)/8);
          p.ai.pressPt = {x: b.x + b.vx*lead, y: b.y + b.vy*lead};
          p.ai.pressT = w.worldClock + 0.3;
        }
        locomote(w, p, {x: p.ai.pressPt.x, y: p.ai.pressPt.y, speed: BODY.VMAX});
        // tackle attempt: ball within poke range and not shielded
        if(b.controller !== null && w.players[b.controller].team !== p.team){
          const c = w.players[b.controller];
          if(dist(p, b) < 1.15 && dist(c, b) > 0.55){
            const a = angTo(c, b) + (kh(w.seed, w.tick, p.pid, 15) - 0.5)*0.6;
            b.vx = Math.cos(a)*7.5; b.vy = Math.sin(a)*7.5; b.vz = 0.2;
            b.controller = null; b.exclPid = c.pid; b.exclT = w.worldClock + 0.4;
            contact(w, 'TACKLE_POKE', p.pid, '');
            p.contact = 'DUEL';
          }
        }
        break;
      }
      case 'COVER': {
        const c = b.controller !== null ? w.players[b.controller] : b;
        const gx = p.team === 0 ? 0 : PITCH.W;
        locomote(w, p, {x: c.x + (gx - c.x)*0.25, y: c.y + (34 - c.y)*0.25, speed: BODY.VMAX*0.85});
        break;
      }
      case 'SHAPE': {
        const a = openAnchor(p.slot, p.team, b.x);
        locomote(w, p, {x: a.x, y: a.y, speed: BODY.VJOG});
        break;
      }
      case 'RUN_BEYOND': {
        locomote(w, p, {x: clamp(p.x + (p.team === 0 ? 16 : -16), 2, PITCH.W-2), y: p.y, speed: BODY.VMAX});
        break;
      }
      case 'CARRY': {
        const tx = clamp(p.x + (p.team === 0 ? 14 : -14), 2, PITCH.W - 2);
        const corr = Math.atan2(clamp(34 - p.y, -8, 8)*0.25, p.team === 0 ? 10 : -10);
        if(b.controller === p.pid){
          locomote(w, p, {x: b.x + Math.cos(corr)*2, y: b.y + Math.sin(corr)*2, speed: BODY.VMAX*BODY.CARRY_MUL});
          carryTouches(w, p, corr);
        } else locomote(w, p, {x: b.x, y: b.y, speed: BODY.VMAX});
        break;
      }
      case 'TAKE_ON': {
        // knock into the chosen corridor and burst
        if(b.controller === p.pid){
          const base = Math.atan2(0, p.team === 0 ? 1 : -1);
          const corr = base + it.side * 0.55;
          if(!it.knocked){
            const knock = Math.hypot(p.vx,p.vy) + 4.2;
            b.vx = Math.cos(corr)*knock; b.vy = Math.sin(corr)*knock; b.vz = 0;
            contact(w, 'TAKEON_KNOCK', p.pid, '');
            it.knocked = true; w.metrics.touches++;
          }
          locomote(w, p, {x: p.x + Math.cos(corr)*10, y: p.y + Math.sin(corr)*10, speed: BODY.VMAX});
        } else {
          locomote(w, p, {x: b.x + b.vx*0.25, y: b.y + b.vy*0.25, speed: BODY.VMAX});
          if(dist(p, b) < 0.9) w.intents[p.pid] = {kind: 'CARRY'};
        }
        break;
      }
      case 'PASS': {
        const m = w.players[it.to];
        if(b.controller === p.pid && m){
          if(!p.windup){ p.windup = w.worldClock + 0.28; p.contact = 'KICK_WINDUP'; locomote(w, p, {x: b.x, y: b.y, speed: 1.5}); }
          else if(w.worldClock >= p.windup && dist(p, b) < 1.0){
            const lead = clamp(dist(p, m)/16, 0.2, 1.1);
            const to = {x: m.x + m.vx*lead, y: m.y + m.vy*lead};
            const D = dist(b, to);
            kickBall(w, p, to, D > 26 ? 'LOFT' : D > 15 ? 'DRIVEN' : 'SHORT');
            p.windup = null; w.intents[p.pid] = {kind: 'SHAPE'};
          } else locomote(w, p, {x: b.x, y: b.y, speed: 1.8});
        } else { p.windup = null; locomote(w, p, {x: b.x, y: b.y, speed: BODY.VMAX}); }
        break;
      }
      case 'SHOOT': {
        if(b.controller === p.pid){
          if(!p.windup){ p.windup = w.worldClock + 0.32; p.contact = 'KICK_WINDUP'; locomote(w, p, {x: b.x, y: b.y, speed: 1.5}); }
          else if(w.worldClock >= p.windup && dist(p, b) < 1.0){
            const gy = 34 + (kh(w.seed, w.tick, p.pid, 16) - 0.5) * 5.2;
            kickBall(w, p, {x: goalX, y: gy}, 'SHOT');
            p.windup = null; w.intents[p.pid] = {kind: 'SHAPE'};
          } else locomote(w, p, {x: b.x, y: b.y, speed: 1.8});
        } else locomote(w, p, {x: b.x, y: b.y, speed: BODY.VMAX});
        break;
      }
      case 'MOVE_TO': locomote(w, p, {x: it.x, y: it.y, speed: it.speed || BODY.VJOG}); break;
      case 'HOLD': locomote(w, p, null); break;
      default: locomote(w, p, null);
    }
  }
}

/* ── master tick ────────────────────────────────────────────────────────── */
function tick(w){
  w.tick++; w.worldClock += DT; w.matchClock += DT * w.matchScale;
  if(w.scenarioTick) w.scenarioTick(w);
  if(restartTick(w)){ separateBodies(w); return; }
  if(w.freeplay) testAI(w);
  actIntents(w);
  // carrier default touches (when carrying without explicit CARRY intent)
  if(w.ball.controller !== null){
    const c = w.players[w.ball.controller];
    if(c.contact !== 'KICK_WINDUP') carryTouches(w, c, undefined);
  }
  separateBodies(w);
  stepBall(w);
  ballInteraction(w);
  outOfPlayCheck(w);
  // metrics
  if(w.tick % 6 === 0){
    for(const p of w.players){
      const v = Math.hypot(p.vx, p.vy);
      w.metrics.spd.push(v);
      const pa = Math.hypot(p.vx - (p._pvx||0), p.vy - (p._pvy||0)) / (DT*6);
      if(w.tick > 12) w.metrics.acc.push(pa);
      p._pvx = p.vx; p._pvy = p.vy;
    }
    if(w.metrics.spd.length > 60000){ w.metrics.spd.splice(0, 30000); w.metrics.acc.splice(0, 30000); }
  }
}

if(typeof module !== 'undefined') module.exports = {makeWorld, tick, issueIntent, solveKick, PITCH, BODY, BALL};
