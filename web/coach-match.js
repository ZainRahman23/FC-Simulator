/* coach-match — the live coaching loop (see docs/COACH_MVP_SPEC.md)
   Owner: match-ui. Wraps globals from touchline.html (wrap-and-delegate).

   Core idea: the PRESENTED clock (AnimR2.S) is the only clock the user ever
   sees. Feed, score, stats, key moments, half/full time and decisions are all
   gated to it; the server may run up to ~2 minutes ahead (prefetch) and is
   rewound deterministically when a decision is made at the presented second. */
window.TL = window.TL || {hooks: {}, bus: new EventTarget()};
TL.hooks = TL.hooks || {};
TL.bus = TL.bus || new EventTarget();

(function(){
'use strict';

const HALF = HALF_SECONDS, FULL = 90 * 60;
const GOAL_BEAT_MS = 2600;          // celebration beat before a goal auto-pause
const PAUSE_COOLDOWN = 300;         // presented seconds between non-goal pauses
const PAUSE_CAP = 8;                // non-goal pauses per match
const INSIGHT_EVERY = 45;           // presented seconds between assistant polls
const MOMENT_LEAD = 10;             // next-moment lands this many seconds before the moment
const SPEEDS = [1, 2, 4, 8];

/* 8x: 40 sim-s per tick x3 (anim2 prefetch) = 120 s — the server's frame cap */
MATCH_SPEEDS[8] = 40; PLAY_RATE[8] = 48;

/* ── small utils ─────────────────────────────────────────────────────────── */
const _api = window.api;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(cond, timeout = 8000){
  const t0 = performance.now();
  while(!cond()){
    if(performance.now() - t0 > timeout) return false;
    await sleep(25);
  }
  return true;
}
const minuteOf = t => Math.max(1, Math.min(90, Math.ceil((t || 0) / 60)));
const clockStr = t => { t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const short = n => n ? shortName(String(n)) : '';
const f2 = v => (Number(v) || 0).toFixed(2);
const pct = v => Math.round((Number(v) || 0) * 100);
const other = tid => tid === 'HOME' ? 'AWAY' : 'HOME';
const myTeam = () => livTeamId();
const isMine = tid => !!tid && tid === myTeam();
function safe(fn, dflt){ try{ return fn(); }catch(e){ console.warn('[coach-match]', e); return dflt; } }
function emit(name, detail){ try{ TL.bus.dispatchEvent(new CustomEvent(name, {detail})); }catch(e){} }
/* The presented clock. AnimR2.S can step back a fraction of a second while a
   ball flight holds the sim head at high speed; everything the user is shown
   is keyed to a monotonic version of it (re-based on every renderer reset). */
let RESET_SERIAL = 0;
AnimR2.reset = (function(orig){ return function(){ RESET_SERIAL++; return orig.apply(this, arguments); }; })(AnimR2.reset);
function presS(m){
  m = m || S.match;
  if(ANIM2_ON){
    const cm = m && m._cm;
    if(!cm) return AnimR2.S;
    if(cm.resetSerial !== RESET_SERIAL){ cm.resetSerial = RESET_SERIAL; cm.sMon = AnimR2.S; }
    else cm.sMon = Math.max(cm.sMon, AnimR2.S);
    return cm.sMon;
  }
  if(ANIM_ON) return AnimR.head;
  return (m && m.clockSeconds) || 0;
}
function nameOf(pid, m){
  m = m || S.match;
  const sp = m && m.snap && m.snap.players && m.snap.players[pid];
  return (sp && sp.name) || (P(pid) && P(pid).name) || pid;
}
const homeName = () => clubName(S.matchFixture.home), awayName = () => clubName(S.matchFixture.away);
const myName = () => sideName(myTeam()), oppName = () => sideName(other(myTeam()));
function scoreLine(sc){ return `${homeName()} ${sc.HOME}–${sc.AWAY} ${awayName()}`; }

/* ── preferences (S.coachUI, mirrored to localStorage: saveState() only
      persists squad/season/finance, so the pref lives in its own key) ──── */
const PREF_KEY = 'touchline:coachUI';
function coachUI(){
  if(!S.coachUI){
    let saved = {};
    try{ saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; }catch(e){}
    S.coachUI = Object.assign({autoPause: 'moments', cam: 'wide'}, saved);
  }
  if(!['moments', 'goals', 'off'].includes(S.coachUI.autoPause)) S.coachUI.autoPause = 'moments';
  return S.coachUI;
}
/* Camera: a coach reads the whole shape ("wide"), or follows the ball. */
function applyCam(){ const w = coachUI().cam !== 'follow'; if(AnimR2 && AnimR2.cam) AnimR2.cam.mode = w ? 'tactical' : 'gameplay'; }
function toggleCam(){
  coachUI().cam = coachUI().cam === 'follow' ? 'wide' : 'follow';
  try{ localStorage.setItem(PREF_KEY, JSON.stringify(S.coachUI)); }catch(e){}
  applyCam(); refreshControls(true);
}
function setAutoPause(mode){
  coachUI().autoPause = mode;
  try{ localStorage.setItem(PREF_KEY, JSON.stringify(S.coachUI)); }catch(e){}
  refreshControls(true);
  const mo = $('#cmMoment .cm-apseg'); if(mo) mo.outerHTML = autoPauseSeg();
  toast({moments: 'Auto-pause: key moments', goals: 'Auto-pause: goals only', off: 'Auto-pause off'}[mode]);
}

/* ── per-match runtime state (lives on the match object, never persisted) ── */
function C(m){
  if(!m) return null;
  if(!m._cm){
    const start = m.clockSeconds || 0;
    Object.defineProperty(m, '_cm', {enumerable: false, writable: true, value: {
      startClock: start, scanPtr: 0, feedPtr: 0, feedCtx: null, feedDirty: true, localLines: [],
      snapHist: [], insights: null, insAt: -1e9, insBusy: false, seenIns: new Set(), newIns: 0,
      pauses: 0, lastPauseS: -1e9, fired: new Set(), forceAt: null, pendingGoal: null,
      decisions: [], freeze: 0, busy: false, busyLabel: '',
      serverFT: false, pendingFT: null, ftPresented: false, finalizeCalled: false, finalizeDone: false,
      review: null, reviewErr: null, reviewBusy: false, lab: null, ftTab: 'review', replayMin: 60,
      origin: null, lastRatings: 0, htSig: '', asstSig: '', applied: {}
    }});
    const cm = m._cm;
    cm.scanPtr = firstAfter(m.events, start);
  }
  return m._cm;
}
function firstAfter(events, t){
  let i = 0; while(i < events.length && events[i].timestamp <= t) i++;
  return i;
}

/* ═══ 1. EXACT-MINUTE DECISIONS: api() wrapper ═════════════════════════════ */
const MGMT_RE = /^\/matches\/([^/?]+)\/(tactics|instructions|formation|substitution)$/;
window.api = async function(path, opts){
  opts = opts || {};
  const mm = MGMT_RE.exec(path);
  const m = S.match;
  if(!mm || (opts.method || 'GET') !== 'POST' || !m || m.matchId !== mm[1] || m.status === 'ft')
    return _api.apply(this, arguments);
  const cm = C(m);
  const at = Math.floor(presS(m));
  const before = {tactics: {...(S.current.tactics || {})}};
  cm.freeze++;                                  // hold the picture while the call is in flight
  try{
    await waitFor(() => !advanceInFlight);      // never race an in-flight /advance
    const body = {...(opts.body || {})};
    if(body.at_clock == null) body.at_clock = at;
    const r = await _api(path, {...opts, body});
    if(S.match === m){
      applyRewind(m, r);
      m.clock = minuteOf(r.rewound_to ?? at);   // callers log S.changes with m.clock
      recordDecision(m, mm[2], body, before, r, at);
    }
    return r;
  }finally{ cm.freeze = Math.max(0, cm.freeze - 1); }
};

/* Central rewind handling (management responses and /seek responses). */
function applyRewind(m, r){
  const cm = C(m);
  const snap = r.snapshot || (r.score && r.players && r.clock_seconds !== undefined ? r : null);
  if(r.rewound_to == null){
    if(snap) mergeMatchSnapshot(m, {...snap, new_events: [], frames: undefined, roster: snap.roster});
    m.eventIndex = m.events.length;     // the command's own ledger event arrives with the next advance
    return false;
  }
  const rt = r.rewound_to;
  const n = r.event_count ?? (snap && snap.event_count) ?? m.events.length;
  const A = activeAnim(); if(A && A.reset) A.reset(rt);
  // keep the shared past (events up to the rewind second); `event_count` already
  // includes the command's own new event, which arrives with the next advance
  const keep = Math.min(n, firstAfter(m.events, rt));
  if(m.events.length > keep) m.events.length = keep;
  m.feed = m.events.map(e => presentEvent(e)).filter(Boolean);
  m.renderedFeed = 0;
  m.eventIndex = n;
  cm.snapHist = cm.snapHist.filter(h => h.clock <= rt);
  cm.serverFT = false; cm.pendingFT = null; m.fullTime = null;
  if(rt < HALF) m.htShown = false;
  cm.scanPtr = Math.min(cm.scanPtr, firstAfter(m.events, rt));
  cm.feedDirty = true;
  cm.localLines = cm.localLines.filter(l => l.clock <= rt + 1);
  if(snap) mergeMatchSnapshot(m, {...snap, new_events: [], frames: undefined});
  m.eventIndex = m.events.length;       // fetch the command's own ledger event(s) next
  return true;
}

const TKEY_LABEL = k => k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, c => c.toUpperCase());
function decisionLabel(kind, body, before){
  if(kind === 'substitution') return `${short(nameOf(body.player_on))} on for ${short(nameOf(body.player_off))}`;
  if(kind === 'formation') return `Shape → ${(formationOf(body.formation) || {}).name || body.formation}`;
  if(kind === 'instructions'){
    const i = body.instructions || {};
    return `${short(nameOf(body.player_id))}: ${i.attackRole || ''} ${i.attackEffort ?? ''} · ${i.defenseRole || ''} ${i.defenseEffort ?? ''}`.trim();
  }
  const t = body.tactics || {}, b = before.tactics || {};
  const diff = Object.keys(t).filter(k => b[k] !== t[k]).map(k => `${TKEY_LABEL(k)} → ${t[k]}`);
  if(!diff.length) return 'Tactics confirmed';
  return diff.slice(0, 3).join(', ') + (diff.length > 3 ? ` (+${diff.length - 3} more)` : '');
}
function recordDecision(m, kind, body, before, r, at){
  const cm = C(m);
  const clock = r.rewound_to ?? Math.min(at, m.clockSeconds);
  const label = decisionLabel(kind, body, before);
  const d = {clock, minute: minuteOf(clock), kind, label};
  cm.decisions.push(d);
  cm.localLines.push({clock, type: 'you', text: label, local: true});
  cm.insAt = -1e9;                                // re-read the game (impact tracking)
  emit('match:decision', {kind, minute: d.minute, label, clock});
}

/* ═══ 2. PRESENTATION-GATED MATCH STATE ════════════════════════════════════ */
const _merge = window.mergeMatchSnapshot;
window.mergeMatchSnapshot = function(m, snap){
  const prev = m.status;
  const r = _merge.apply(this, arguments);
  const cm = C(m);
  if(snap && snap.players){
    cm.snapHist.push({clock: snap.clock_seconds, players: snap.players, possession: snap.possession, management: snap.management});
    if(cm.snapHist.length > 120) cm.snapHist.splice(0, cm.snapHist.length - 120);
  }
  if(m.status === 'ft' && !cm.ftPresented){
    // the SERVER reached full time; the presentation has not — hold it back
    cm.serverFT = true;
    cm.pendingFT = m.fullTime || cm.pendingFT;
    m.fullTime = null;
    m.status = prev && prev !== 'ft' ? prev : 'live';
  }
  return r;
};
/* board drift-heal (e.g. a red card) must follow the picture, not the prefetch */
const _drift = window.reconcileDriftIfNeeded;
window.reconcileDriftIfNeeded = function(mg){
  const m = S.match;
  if(!m || !m._cm || !ANIM2_ON) return _drift.apply(this, arguments);
  const ps = presentedSnap(m, presS(m));
  return _drift.call(this, ps.management || mg);
};
function presentedSnap(m, s){
  const H = C(m).snapHist;
  let best = null;
  for(const h of H){ if(h.clock <= s + 0.5) best = h; else break; }
  return best || H[0] || {players: m.snap.players || {}, possession: m.snap.possession};
}

/* stats from the event ledger up to the presented second */
function statsAt(m, s){
  const T = {HOME: {shots: 0, sot: 0, xg: 0, reds: 0}, AWAY: {shots: 0, sot: 0, xg: 0, reds: 0}};
  const score = {HOME: 0, AWAY: 0};
  for(const e of m.events){
    if(e.timestamp > s) break;
    const d = e.detail || {}, t = T[e.team_id];
    switch(e.event_type){
      case 'SHOT':
        if(!t) break;
        t.shots++; t.xg += Number(d.xg) || 0;
        if(d.outcome === 'GOAL' || String(d.outcome || '').startsWith('SAVED')) t.sot++;
        break;
      case 'PENALTY':
        if(!t) break;
        t.shots++; if(d.outcome === 'GOAL' || String(d.outcome || '').startsWith('SAVED')) t.sot++;
        break;
      case 'GOAL':
        if(d.score && d.score.HOME !== undefined){ score.HOME = d.score.HOME; score.AWAY = d.score.AWAY; }
        else if(e.team_id) score[e.team_id]++;
        break;
      case 'CARD':
        if(t && String(d.card || '').includes('RED')) t.reds++;
        break;
    }
  }
  const ps = presentedSnap(m, s);
  const poss = s < 5 ? {home: 50, away: 50} : (ps.possession || {home: 50, away: 50});
  return {T, score, poss};
}
/* process metrics for `team` over (t0, t1] — mirrors coach.window_metrics */
function windowAt(m, team, t0, t1){
  const w = {xg_for: 0, xg_against: 0, shots_for: 0, shots_against: 0, box_for: 0, box_against: 0};
  let pf = 0, pa = 0;
  for(const e of m.events){
    const ts = e.timestamp;
    if(ts <= t0) continue;
    if(ts > t1) break;
    const d = e.detail || {}, mine = e.team_id === team;
    if(e.event_type === 'SHOT'){ w[mine ? 'shots_for' : 'shots_against']++; w[mine ? 'xg_for' : 'xg_against'] += Number(d.xg) || 0; }
    else if(e.event_type === 'BOX_ENTRY') w[mine ? 'box_for' : 'box_against']++;
    else if(e.event_type === 'POSSESSION_CHANGE'){
      const dur = Number(d.previous_duration_s) || 0;
      if(d.from === team) pf += dur; else if(d.from) pa += dur;
    }
  }
  w.possession = pf + pa > 0 ? Math.round(100 * pf / (pf + pa)) : 50;
  return w;
}
/* threat per 5-minute bucket (xG + 0.04 per box entry) — mirrors coach.momentum */
function momentumAt(m, s, events){
  events = events || m.events;
  const n = 18, rows = [];
  for(let i = 0; i < n; i++) rows.push({minute: (i + 1) * 5, HOME: 0, AWAY: 0, goals: [], reds: []});
  for(const e of events){
    const ts = e.timestamp;
    if(ts > s) break;
    if(ts <= 0 || !e.team_id) continue;
    const i = Math.min(n - 1, Math.floor((ts - 1) / 300)), d = e.detail || {};
    if(e.event_type === 'SHOT') rows[i][e.team_id] += Number(d.xg) || 0;
    else if(e.event_type === 'BOX_ENTRY') rows[i][e.team_id] += 0.04;
    else if(e.event_type === 'GOAL') rows[i].goals.push({team: e.team_id, minute: minuteOf(ts), ts, name: short(e.actor_name)});
    else if(e.event_type === 'CARD' && String(d.card || '').includes('RED')) rows[i].reds.push({team: e.team_id, ts});
  }
  return rows;
}

/* Momentum chart (SVG): you above the midline, them below; goals marked. */
function momentumSVG(m, s, opts = {}){
  const rows = opts.rows || momentumAt(m, s);
  const W = 900, H = opts.h || 44, mid = H / 2, bw = W / 18;
  const me = myTeam(), op = other(me);
  const maxv = Math.max(0.35, ...rows.map(r => Math.max(r.HOME, r.AWAY)));
  const upto = opts.full ? FULL : s;
  let bars = '', marks = '';
  rows.forEach((r, i) => {
    if(i * 300 >= upto && !opts.full) return;
    const x = i * bw + 2, w = bw - 4;
    const hu = Math.max(r[me] > 0 ? 2 : 0, (r[me] / maxv) * (mid - 7));
    const hd = Math.max(r[op] > 0 ? 2 : 0, (r[op] / maxv) * (mid - 7));
    const tip = `${i * 5}'–${(i + 1) * 5}': ${myName()} ${f2(r[me])} · ${oppName()} ${f2(r[op])} threat`;
    bars += `<g><title>${esc(tip)}</title><rect x="${x}" y="${1}" width="${w}" height="${H - 2}" fill="transparent"/>`
      + (hu ? `<rect class="cm-mu" x="${x}" y="${mid - 1 - hu}" width="${w}" height="${hu}" rx="2"/>` : '')
      + (hd ? `<rect class="cm-md" x="${x}" y="${mid + 1}" width="${w}" height="${hd}" rx="2"/>` : '') + `</g>`;
    for(const g of r.goals){
      const gx = (g.ts / FULL) * W, up = g.team === me;
      marks += `<g><title>${esc(`${g.minute}' ${g.name} scores`)}</title><circle class="cm-mg ${up ? 'u' : 'd'}" cx="${gx}" cy="${up ? 5 : H - 5}" r="4.2"/></g>`;
    }
    for(const rc of r.reds){
      const gx = (rc.ts / FULL) * W, up = rc.team === me;
      marks += `<rect class="cm-mr" x="${gx - 2.5}" y="${up ? 1 : H - 9}" width="5" height="8" rx="1"/>`;
    }
  });
  for(const dcs of (opts.decisions || [])){
    const gx = (dcs.clock / FULL) * W;
    marks += `<g><title>${esc(`${dcs.minute}' your call: ${dcs.label}`)}</title><path class="cm-mdec" d="M${gx - 4} ${mid - 4} L${gx + 4} ${mid - 4} L${gx} ${mid + 3} Z"/></g>`;
  }
  const cur = opts.full ? '' : `<line class="cm-mcur" x1="${(s / FULL) * W}" x2="${(s / FULL) * W}" y1="0" y2="${H}"/>`;
  const sel = opts.sel != null ? `<line class="cm-msel" x1="${(opts.sel / FULL) * W}" x2="${(opts.sel / FULL) * W}" y1="0" y2="${H}"/>` : '';
  return `<svg class="cm-mom" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Momentum by 5-minute period">
    <line class="cm-mht" x1="${W / 2}" x2="${W / 2}" y1="0" y2="${H}"/>
    <line class="cm-mmid" x1="0" x2="${W}" y1="${mid}" y2="${mid}"/>${bars}${marks}${cur}${sel}</svg>`;
}
function momentumBlock(m, s, opts = {}){
  return `<div class="cm-momwrap ${opts.cls || ''}">
    <div class="cm-momlab"><span class="u">${esc(myName().toUpperCase())}</span><span class="d">${esc(oppName().toUpperCase())}</span></div>
    <div class="cm-momplot">${momentumSVG(m, s, opts)}
      <div class="cm-momax"><span>0'</span><span>45'</span><span>90'</span></div></div></div>`;
}

/* ── commentary ─────────────────────────────────────────────────────────── */
function commentary(e, ctx){
  const d = e.detail || {}, tid = e.team_id, nm = e.actor_name || '';
  const side = tid ? sideName(tid) : '';
  const who = nm || side || 'Someone';
  const min = minuteOf(e.timestamp);
  const mine = isMine(tid);
  const hdr = d.shot_type === 'HEADER';
  const L = (type, text, extra) => Object.assign({min, type, text, ts: e.timestamp}, extra || {});
  switch(e.event_type){
    case 'KICKOFF': return e.timestamp < 5 ? L('info', `Kick-off — ${homeName()} v ${awayName()}`) : null;
    case 'GOAL': {
      if(ctx){ if(d.score) ctx.score = {...d.score}; else ctx.score[tid]++; }
      const sc = ctx ? ctx.score : (d.score || null);
      const assist = d.assist ? ` (assist ${short(d.assist)})` : '';
      return L(mine ? 'goal' : 'conc', `GOAL! ${who}${assist}${d.penalty ? ' from the spot' : ''}${sc ? ` — ${scoreLine(sc)}` : ''}`, {goal: true});
    }
    case 'SHOT': {
      const o = String(d.outcome || ''), xg = Number(d.xg) || 0, dist = Math.round(Number(d.distance_m) || 0);
      if(o === 'GOAL') return null;
      const gk = d.goalkeeper ? short(d.goalkeeper) : 'the keeper';
      const verb = hdr ? 'heads' : 'shoots';
      if(xg >= 0.3){
        const how = o === 'MISS' ? (hdr ? 'heads wide' : 'puts it wide') : o === 'BLOCKED' ? `is blocked${d.blocker ? ' by ' + short(d.blocker) : ''}`
          : `is denied by ${gk}`;
        return L(mine ? 'bigf' : 'biga', `Big chance! ${who} ${how} from ${dist}m (${f2(xg)} xG)`);
      }
      if(o === 'SAVED_PARRIED') return L('shot', `${who} ${verb} from ${dist}m — ${gk} parries it away`);
      if(o.startsWith('SAVED')) return L('shot', `${who} ${verb} from ${dist}m — ${gk} holds on`);
      if(o === 'BLOCKED') return L('shot', `${who}'s effort from ${dist}m is blocked${d.blocker ? ' by ' + short(d.blocker) : ''}`);
      return L('shot', `${who} ${hdr ? 'heads' : 'fires'} wide from ${dist}m`);
    }
    case 'PENALTY': {
      const gk = d.goalkeeper ? short(d.goalkeeper) : 'the keeper';
      return L('cardev', d.outcome === 'GOAL' ? `Penalty to ${side} — ${who} sends ${gk} the wrong way`
        : `Penalty to ${side} — ${who} ${String(d.outcome || '').startsWith('SAVED') ? 'is denied by ' + gk : 'misses!'}`);
    }
    case 'FOUL':
      if(d.penalty && nm) return L('cardev', `Foul in the box! ${nm} brings down ${d.victim || 'his man'}`);
      return null;
    case 'CARD': {
      const c = String(d.card || 'YELLOW');
      if(!c.includes('RED')) return L('cardev', `Yellow card — ${who} (${side})`);
      let left = 10;
      if(ctx){ ctx.reds[tid] = (ctx.reds[tid] || 0) + 1; left = 11 - ctx.reds[tid]; }
      return L('red', `${c === 'SECOND_YELLOW_RED' ? `Second yellow for ${who} — he's off!` : `RED CARD! ${who} is sent off`} ${side} down to ${left}`);
    }
    case 'FREE_KICK': {
      const loc = d.location; if(!loc || !tid) return null;
      const rel = tid === 'HOME' ? loc[0] : 100 - loc[0];
      return rel >= 70 ? L('att', `Free kick to ${side} in a dangerous position${d.taker ? ` — ${short(d.taker)} stands over it` : ''}`) : null;
    }
    case 'CORNER': return L('shot', `Corner to ${side}${nm ? ` — ${short(nm)} to take` : ''}`);
    case 'OFFSIDE': {                                  // mention it, don't narrate every flag
      const cmx = S.match && S.match._cm; if(!nm) return null;
      if(cmx){ const last = cmx.lastOff ?? -1e9; if(e.timestamp - last < 360 && e.timestamp >= last) return null; cmx.lastOff = e.timestamp; }
      return L('shot', `${nm} is caught offside`);
    }
    case 'GK_HIGH_BALL_MISS': return nm ? L('att', `${nm} flaps at a cross — danger in the box!`) : null;
    case 'SUBSTITUTION':
      if(mine && ctx) return null;                 // your own change is logged as "Your call"
      return L(mine ? 'you' : 'info', `${mine ? 'Your change' : side + ' change'}: ${d.player_on} on for ${d.player_off}${!mine && String(d.reason || '').includes('FATIGUE') ? ' (fresh legs)' : ''}`);
    case 'FORMATION_CHANGE':
      if(mine && ctx) return null;
      return L(mine ? 'you' : 'tac', mine ? `Your shape: ${d.to}` : `${side} change shape: ${d.from} → ${d.to}`);
    case 'TACTIC_CHANGE': {
      if(d.mode === 'MANAGER') return null;
      const mode = String(d.mode || '');
      return L('tac', mode.includes('RISK+') || mode.includes('CHASE') ? `${side} push more players forward`
        : mode.includes('RISK-') || mode.includes('PROTECT') ? `${side} drop deeper to protect what they have`
        : `${side} adjust their approach`);
    }
    case 'BOX_ENTRY':
      if(!ctx || !tid) return null;
      if(e.timestamp - (ctx.lastBox[tid] ?? -1e9) < 360) return null;
      ctx.lastBox[tid] = e.timestamp;
      return L('att', `${side} break into the box${nm ? ' — ' + short(nm) + ' ' + (d.via === 'CARRY' ? 'drives in' : 'is found') : ''}`);
    case 'HALFTIME': return L('info', `Half-time${ctx ? ' — ' + scoreLine(ctx.score) : ''}`, {min: 45});
    case 'FULL_TIME': return L('info', `Full-time${ctx ? ' — ' + scoreLine(ctx.score) : (d.score ? ' — ' + scoreLine(d.score) : '')}`, {min: 90});
    default: return null;
  }
}
window.presentEvent = e => safe(() => commentary(e, null), null);

/* ── presented feed ─────────────────────────────────────────────────────── */
function feedRow(l){
  const div = document.createElement('div');
  div.className = 'ev cm-ev ' + l.type;
  div.innerHTML = `<div class="min">${l.min}'</div><div class="txt">${l.type === 'you' ? '<b class="cm-youtag">YOUR CALL</b> ' : ''}${esc(l.text)}</div>`;
  return div;
}
window.updateFeedList = function(m){
  const list = $('#feedList'); if(!list || !m) return;
  const cm = C(m), s = presS(m);
  if(cm.feedDirty || !list.dataset.cm){
    list.innerHTML = ''; list.dataset.cm = '1';
    cm.feedPtr = 0; cm.localPtr = 0; cm.feedDirty = false; cm.lastOff = null;
    cm.feedCtx = {score: {HOME: 0, AWAY: 0}, reds: {}, lastBox: {}};
  }
  const add = [];
  const locals = cm.localLines;
  cm.localPtr = cm.localPtr || 0;
  while(true){
    const e = cm.feedPtr < m.events.length && m.events[cm.feedPtr].timestamp <= s ? m.events[cm.feedPtr] : null;
    const l = cm.localPtr < locals.length && locals[cm.localPtr].clock <= s + 1 ? locals[cm.localPtr] : null;
    if(!e && !l) break;
    if(l && (!e || l.clock < e.timestamp)){
      add.push({...l, min: minuteOf(l.clock)}); cm.localPtr++;
    } else {
      cm.feedPtr++;
      const line = safe(() => commentary(e, cm.feedCtx), null);
      if(line) add.push(line);
    }
  }
  for(const l of add) list.prepend(feedRow(l));
  while(list.children.length > 90) list.lastChild.remove();
  if(!list.children.length) list.innerHTML = `<div class="cm-empty">The feed follows the picture — nothing yet.</div>`;
  else { const em = list.querySelector('.cm-empty'); if(em) em.remove(); }
};

/* ratings / player panel from the presented snapshot (no rating spoilers) */
function presentedView(m){
  const v = Object.create(m);
  const ps = presentedSnap(m, presS(m));
  v.snap = Object.assign({}, m.snap, {players: ps.players || m.snap.players});
  return v;
}
const _ratings = window.updateRatingsList;
window.updateRatingsList = function(m){ return m ? _ratings.call(this, presentedView(m)) : undefined; };
const _pinfo = window.updatePlayerPanel;
window.updatePlayerPanel = function(m){ return m ? _pinfo.call(this, presentedView(m)) : undefined; };

/* ═══ HEADER: score, clock, stats strip, momentum, pace controls ═══════════ */
function autoPauseSeg(){
  const ap = coachUI().autoPause;
  return `<span class="cm-apseg" title="When should the assistant stop the game for you?"><em>AUTO-PAUSE</em>${
    [['moments', 'Moments'], ['goals', 'Goals'], ['off', 'Off']].map(([k, l]) =>
      `<button class="${ap === k ? 'on' : ''}" data-ap="${k}" onclick="CM.setAutoPause('${k}')">${l}</button>`).join('')}</span>`;
}
function controlsHTML(m){
  const cm = C(m), spd = S.ui.matchSpeed || 1, s = presS(m);
  if(m.htActive) return `<span class="cm-htnote">Half time — make your changes, then start the second half below.</span>${autoPauseSeg()}`;
  if(cm.busy) return `<span class="cm-busy"><i class="cm-spin"></i>${esc(cm.busyLabel || 'Working…')}</span>`;
  const paused = m.status === 'paused';
  const late = s >= FULL - 30 || cm.serverFT && s >= FULL - 60;
  return `<button class="spdbtn cm-pp ${paused ? 'on' : ''}" onclick="togglePlay()">${paused ? '▶ Resume' : '❚❚ Pause'}</button>
    <span class="cm-spds">${SPEEDS.map(x => `<button class="spdbtn ${spd === x && !paused ? 'on' : ''}" data-spd="${x}" onclick="setSpeed(${x})">${x}×</button>`).join('')}</span>
    <span class="cm-sep"></span>
    <button class="spdbtn cm-next" ${late ? 'disabled' : ''} onclick="CM.nextMoment()" title="Skip ahead to just before the next key moment">⏭ Next moment</button>
    <button class="spdbtn cm-simft" ${late ? 'disabled' : ''} onclick="CM.confirmSimFT()" title="Simulate the rest of the match">⏩ Sim to full time</button>
    <span class="cm-sep"></span>${autoPauseSeg()}
    <button class="spdbtn cm-cam" onclick="CM.toggleCam()" title="Wide shows the whole shape; Follow tracks the ball">${coachUI().cam === 'follow' ? '🎥 Follow' : '🗺 Wide'}</button>`;
}
function ctrlSig(m){
  const cm = C(m), s = presS(m);
  return [m.htActive, m.status, S.ui.matchSpeed || 1, cm.busy, cm.busyLabel, coachUI().autoPause, coachUI().cam, s >= FULL - 30].join('|');
}
function refreshControls(force){
  const m = S.match, el = $('#cmCtrl'); if(!m || !el) return;
  const sig = ctrlSig(m);
  if(!force && el.dataset.sig === sig) return;
  el.dataset.sig = sig; el.innerHTML = controlsHTML(m);
}
window.updateMatchHeader = function(m){
  const el = $('#mHeader'); if(!el || !m || !S.matchFixture) return;
  if(ANIM3_ON || ANIM4_ON){                        // comparison renderers: keep their presented views
    const A = ANIM3_ON ? AnimR3 : AnimR4;
    if(A.statsHist && A.statsHist.length) m = A.presentedView(m);
  }
  const f = S.matchFixture, cm = C(S.match);
  if(!el.dataset.cm){
    el.dataset.cm = '1';
    el.classList.add('cm-head');
    const reh = f.exhibition ? `<div class="cm-reh">${f.branchOf ? 'REHEARSAL' : 'EXHIBITION'} — DOESN'T COUNT${f.branchOf && cm && cm.origin ? ` · replaying from ${clockStr(cm.startClock)}` : ''}</div>` : '';
    el.innerHTML = `${reh}
      <div class="mh-top">
        <div class="mh-club h">${esc(clubName(f.home))}<small>${f.home === 'LIV' ? 'YOU' : 'CPU'}</small></div>
        <div class="mh-score" id="cmScore">0<span>–</span>0</div>
        <div class="mh-club">${esc(clubName(f.away))}<small>${f.away === 'LIV' ? 'YOU' : 'CPU'}</small></div>
      </div>
      <div class="mh-clock"><b id="cmClock">0:00</b><span id="cmHalf">1ST HALF</span><span class="statuschip live" id="cmChip">LIVE</span></div>
      <div class="cm-row">
        <div class="cm-strip" id="cmStrip"></div>
        <div class="cm-hmom" id="cmHMom"></div>
      </div>
      <div class="mh-ctrl cm-ctrl" id="cmCtrl"></div>`;
  }
  const real = S.match, s = presS(real);
  const st = statsAt(real, s);
  const H = st.T.HOME, A = st.T.AWAY;
  const sc = $('#cmScore', el) || el.querySelector('#cmScore');
  const scTxt = `${st.score.HOME}<span>–</span>${st.score.AWAY}`;
  if(sc && sc.dataset.v !== scTxt){ sc.dataset.v = scTxt; sc.innerHTML = scTxt; }
  const status = real.htActive ? 'ht' : real.status === 'reconnecting' ? 'paused' : real.status;
  const chip = real.htActive ? 'HALF TIME' : real.status === 'paused' ? 'PAUSED' : real.status === 'reconnecting' ? 'RECONNECTING' : 'LIVE';
  const setT = (id, v) => { const n = el.querySelector('#' + id); if(n && n.textContent !== v) n.textContent = v; };
  setT('cmClock', real.htActive ? '45:00' : clockStr(s));
  setT('cmHalf', real.htActive ? 'HALF TIME' : s < HALF ? '1ST HALF' : '2ND HALF');
  const ch = el.querySelector('#cmChip');
  if(ch){ ch.className = 'statuschip ' + status; if(ch.textContent !== chip) ch.textContent = chip; }
  const strip = el.querySelector('#cmStrip');
  const stripHTML = `<div class="st"><em>POSS</em>${Math.round(st.poss.home)}–${100 - Math.round(st.poss.home)}</div>
      <div class="st"><em>xG</em>${f2(H.xg)}–${f2(A.xg)}</div>
      <div class="st"><em>SHOTS</em>${H.shots}–${A.shots}</div>
      <div class="st"><em>ON TARGET</em>${H.sot}–${A.sot}</div>`;
  if(strip && strip.dataset.v !== stripHTML){ strip.dataset.v = stripHTML; strip.innerHTML = stripHTML; }
  const hm = el.querySelector('#cmHMom');
  const bucket = Math.floor(s / 20);
  if(hm && hm.dataset.v !== String(bucket) + ':' + real.events.length){
    hm.dataset.v = String(bucket) + ':' + real.events.length;
    hm.innerHTML = momentumBlock(real, s, {h: 40, decisions: cm ? cm.decisions : []});
  }
  refreshControls();
};

/* ═══ LIVE SHELL: assistant tab, goal banner, pitch sizing ═════════════════ */
const _shell = window.buildLiveShell;
window.buildLiveShell = function(wrap, m){
  const r = _shell.apply(this, arguments);
  safe(() => {
    wrap.classList.add('cm-live');
    const tabs = wrap.querySelector('.sidetabs');
    if(tabs && !tabs.querySelector('#sideTabAsst')){
      const b = document.createElement('button');
      b.id = 'sideTabAsst'; b.innerHTML = 'ASSISTANT<i class="cm-badge" id="cmAsstBadge"></i>';
      b.onclick = () => setSideTab('assistant');
      tabs.appendChild(b);
      const body = wrap.querySelector('.sidebody');
      const pane = document.createElement('div');
      pane.id = 'cmAsst'; pane.className = 'cm-asst'; pane.style.display = 'none';
      body.appendChild(pane);
    }
    const pitch = wrap.querySelector('#livePitch');
    if(pitch && !pitch.querySelector('#cmBanner')){
      const bn = document.createElement('div'); bn.id = 'cmBanner'; bn.className = 'cm-banner';
      pitch.appendChild(bn);
    }
    const hdr = wrap.querySelector('#mHeader'); if(hdr) delete hdr.dataset.cm;
    C(m).asstSig = ''; C(m).htSig = ''; C(m).feedDirty = true;
    const fl = wrap.querySelector('#feedList'); if(fl) delete fl.dataset.cm;
    // the side column's "Touchline" button reads better with the new tools
    const tb = [...wrap.querySelectorAll('.sidecol .btn')].find(b => /Touchline/.test(b.textContent));
    if(tb){ tb.textContent = 'Tactics & subs'; tb.title = 'Tactics, shape and substitutions'; }
    const cm0 = C(m);
    if(cm0 && cm0.origin){
      const ab = [...wrap.querySelectorAll('.sidecol .btn')].find(b => /Abandon/.test(b.textContent));
      if(ab){ ab.textContent = 'End rehearsal'; ab.setAttribute('onclick', 'CM.exitRehearsal()'); }
    }
  });
  return r;
};
const _sideTab = window.setSideTab;
window.setSideTab = function(tab){
  const m = S.match; if(!m) return;
  if(tab !== 'assistant'){
    const a = $('#cmAsst'); if(a) a.style.display = 'none';
    $('#sideTabAsst')?.classList.remove('on');
    return _sideTab.call(this, tab);
  }
  m.sideTab = 'assistant';
  $('#sideTabFeed')?.classList.remove('on'); $('#sideTabRatings')?.classList.remove('on');
  $('#sideTabAsst')?.classList.add('on');
  const fl = $('#feedList'), rl = $('#ratingsList'), a = $('#cmAsst');
  if(fl) fl.style.display = 'none'; if(rl) rl.style.display = 'none'; if(a) a.style.display = '';
  const cm = C(m); cm.newIns = 0; cm.asstSig = '';
  renderAssistant(m);
};

/* ═══ 3. ASSISTANT: insights polling + impact cards ════════════════════════ */
let INS_STATE = {ok: null, retryAt: 0};
async function pollInsights(m, reason){
  const cm = C(m);
  if(cm.insBusy || !m.matchId) return null;
  if(INS_STATE.ok === false && performance.now() < INS_STATE.retryAt) return null;
  const at = Math.floor(presS(m));
  cm.insBusy = true;
  try{
    const r = await _api(`/matches/${m.matchId}/insights?team=${myTeam()}&at=${at}`);
    INS_STATE.ok = true;
    if(S.match !== m) return null;
    cm.insights = Object.assign(r, {at});
    cm.insAt = at;
    let fresh = 0;
    for(const i of r.insights || []){
      if(!cm.seenIns.has(i.id)){
        cm.seenIns.add(i.id);
        if(i.severity >= 2) fresh++;
        if(i.severity >= 3 && reason !== 'modal' && at > cm.startClock + 30)
          queueMoment(m, {kind: 'insight', clock: at, insight: i});
      }
    }
    if(fresh && m.sideTab !== 'assistant') cm.newIns += fresh;
    cm.asstSig = '';
    return cm.insights;
  }catch(e){
    INS_STATE = {ok: false, retryAt: performance.now() + 20000};
    cm.insAt = at;
    return null;
  }finally{ cm.insBusy = false; }
}
const SEV = {3: 'urgent', 2: 'worth a look', 1: 'note'};
function actionKey(m, a){ return `${a.type}:${a.player_off || a.player_id || ''}:${a.player_on || ''}:${a.label}`; }
function insightCard(m, i, opts = {}){
  const cm = C(m);
  const acts = (i.actions || []).map((a, k) => {
    const key = actionKey(m, a), done = cm.applied[key];
    return `<button class="cm-act ${done ? 'done' : ''} ${a.type === 'resume' ? 'resume' : ''}" ${done || !isLiveMatch() ? 'disabled' : ''}
      onclick="CM.applyAction(this, '${esc(i.id)}', ${k})" title="${esc(a.summary || a.note || '')}">${done ? `✓ ${esc(a.label)} · ${done}'` : esc(a.label)}</button>`;
  }).join('');
  return `<div class="cm-ins sev${i.severity}" data-id="${esc(i.id)}">
    <div class="cm-ins-h"><span class="cm-sev">${SEV[i.severity] || ''}</span><b>${esc(i.title)}</b></div>
    <div class="cm-ins-t">${esc(i.text)}</div>
    ${i.why ? `<div class="cm-ins-why"><em>WHY</em>${esc(i.why)}</div>` : ''}
    ${acts ? `<div class="cm-ins-a">${acts}</div>` : ''}</div>`;
}
const VERD = {better: ['good', 'Better'], worse: ['bad', 'Worse'], neutral: ['mid', 'No change'], pending: ['pend', 'Too early'],
  helped: ['good', 'Helped'], hurt: ['bad', 'Hurt'], 'no clear effect': ['mid', 'No clear effect']};
const chip = v => { const [c, l] = VERD[v] || ['mid', v]; return `<span class="cm-chip ${c}">${esc(l)}</span>`; };
function impactCard(im, heading, opts = {}){
  const b = im.before || {}, a = im.after;
  const row = (lab, k, fmt, goodUp) => {
    if(!a) return '';
    const bv = b[k] ?? 0, av = a[k] ?? 0, dlt = av - bv;
    const cls = Math.abs(dlt) < (k === 'possession' ? 3 : 0.05) ? '' : (dlt > 0) === goodUp ? 'up' : 'dn';
    return `<div class="cm-imrow"><span>${lab}</span><b>${fmt(bv)}</b><i>→</i><b class="${cls}">${fmt(av)}</b></div>`;
  };
  return `<div class="cm-imp">
    <div class="cm-imp-h"><span>${heading || `Since your change at ${im.minute}'`}</span>${
      opts.lab ? chip(opts.lab.verdict) + `<em class="cm-dim"> Decision Lab</em>`
      : opts.review ? `<span class="cm-chip pend" title="The before/after pattern only — the Decision Lab gives the verdict">Pattern only</span>`
      : `<span class="cm-dim" style="font-size:11px">early read</span> ${chip(im.verdict)}`}</div>
    <div class="cm-imp-l">${esc(im.label)}</div>
    ${a ? `<div class="cm-imtab"><div class="cm-imrow hd"><span>per 15'</span><b>before</b><i></i><b>after</b></div>
      ${row('Chances created (xG)', 'xg_for', f2, true)}${row('Chances conceded (xG)', 'xg_against', f2, false)}
      ${row('Possession', 'possession', v => Math.round(v) + '%', true)}</div>` : ''}
    <div class="cm-imp-t">${esc(im.text || '')}${a && im.after_minutes ? ` <span class="cm-dim">(${im.after_minutes}' since)</span>` : ''}</div></div>`;
}
/* backend impact labels are generic ("Tactical change"); prefer the label we logged */
function withLabels(m, imps){
  const decs = C(m).decisions;
  return (imps || []).map(im => {
    const mine = decs.filter(d => Math.abs(d.clock - im.clock) <= 120 && d.clock >= im.clock - 1);
    if(!mine.length || !/Tactical change|New instructions/.test(im.label || '')) return im;
    return {...im, label: mine.map(d => d.label).join(' · ')};
  });
}
function renderAssistant(m){
  const el = $('#cmAsst'); if(!el) return;
  const cm = C(m), I = cm.insights;
  const badge = $('#cmAsstBadge');
  if(badge){ badge.textContent = cm.newIns ? String(cm.newIns) : ''; badge.style.display = cm.newIns ? '' : 'none'; }
  if(m.sideTab !== 'assistant') return;
  const sig = JSON.stringify([I && I.at, Object.keys(cm.applied).length, INS_STATE.ok, isLiveMatch()]);
  if(cm.asstSig === sig) return;
  cm.asstSig = sig;
  if(!I){
    el.innerHTML = INS_STATE.ok === false
      ? `<div class="cm-empty">The assistant can't reach the analysis service right now — it will retry shortly.</div>`
      : `<div class="cm-empty"><i class="cm-spin"></i> The assistant is watching the first minutes…</div>`;
    return;
  }
  const ins = I.insights || [], imps = withLabels(m, I.impacts).slice().reverse();
  el.innerHTML = `<div class="cm-asst-h">ASSISTANT'S READ <span>at ${minuteOf(I.at)}'</span></div>
    ${ins.length ? ins.map(i => insightCard(m, i)).join('') : `<div class="cm-empty">Nothing urgent. The game is following the plan — the assistant will flag moments as they come.</div>`}
    ${imps.length ? `<div class="cm-asst-h">YOUR CHANGES</div>${imps.map(im => impactCard(im)).join('')}` : ''}`;
}

/* ═══ 4. KEY MOMENTS & AUTO-PAUSE ══════════════════════════════════════════ */
function queueMoment(m, mo){
  const cm = C(m), mode = coachUI().autoPause, s = presS(m);
  const forced = cm.forceAt && Math.abs(cm.forceAt.clock - mo.clock) <= 2;
  if(forced) cm.forceAt = null;
  const isGoal = mo.kind === 'goal';
  if(!forced){
    if(mode === 'off') return;
    if(mode === 'goals' && !isGoal) return;
    if(!isGoal && (cm.pauses >= PAUSE_CAP || s - cm.lastPauseS < PAUSE_COOLDOWN)) return;
  }
  if(m.htActive || m.status === 'ft' || cm.ftPresented) return;
  if(isGoal){ cm.pendingGoal = {mo, at: performance.now() + GOAL_BEAT_MS, simAt: mo.clock + 8}; return; }
  doAutoPause(m, mo);
}
function doAutoPause(m, mo){
  const cm = C(m);
  if(cm.ftPresented || m.htActive) return;
  if(m.status === 'live'){ m.status = 'paused'; clearInterval(matchTimer); }
  if(mo.kind !== 'goal') cm.pauses++;
  cm.lastPauseS = presS(m);
  emit('match:keymoment', {kind: mo.kind, minute: minuteOf(mo.clock)});
  openMoment(m, mo);
  if(S.ui.view === 'match') renderMatch();
}
function scanMoments(m, s){
  const cm = C(m), ev = m.events;
  while(cm.scanPtr < ev.length && ev[cm.scanPtr].timestamp <= s){
    const e = ev[cm.scanPtr++], d = e.detail || {};
    switch(e.event_type){
      case 'GOAL':
        showGoalBanner(m, e);
        cm.insAt = -1e9;
        queueMoment(m, {kind: 'goal', clock: e.timestamp, event: e});
        break;
      case 'CARD':
        if(String(d.card || '').includes('RED')){ cm.insAt = -1e9; queueMoment(m, {kind: 'red', clock: e.timestamp, event: e}); }
        break;
      case 'FORMATION_CHANGE':
        if(!isMine(e.team_id)){ cm.insAt = -1e9; queueMoment(m, {kind: 'opp_shape', clock: e.timestamp, event: e}); }
        break;
      case 'SUBSTITUTION': case 'TACTIC_CHANGE':
        if(!isMine(e.team_id)) cm.insAt = Math.min(cm.insAt, s - INSIGHT_EVERY + 8);
        break;
    }
  }
  for(const w of [60, 75]){
    const c = w * 60, key = 'w' + w;
    if(!cm.fired.has(key) && s >= c && s < c + 30 && cm.startClock < c - 60){
      cm.fired.add(key);
      if(!cm.decisions.length) queueMoment(m, {kind: 'window', clock: c, minute: w});
    }
  }
}
function momentTitle(m, mo){
  const e = mo.event || {}, d = e.detail || {}, s = presS(m), st = statsAt(m, s).score;
  const me = myTeam(), f = st[me], a = st[other(me)];
  switch(mo.kind){
    case 'goal': {
      const who = short(e.actor_name) || sideName(e.team_id);
      if(isMine(e.team_id)) return f > a ? (f - a === 1 && a === f - 1 ? `${who} scores — you lead ${f}–${a}` : `${who} scores — ${f}–${a}`)
        : f === a ? `${who} scores — level at ${f}–${a}` : `${who} pulls one back — ${f}–${a}`;
      return a > f ? `Conceded — ${who} makes it ${f}–${a}` : a === f ? `${who} equalises for ${oppName()} — ${f}–${a}` : `${who} scores for ${oppName()} — ${f}–${a}`;
    }
    case 'red': return isMine(e.team_id) ? `Down to ten — ${short(e.actor_name)} is sent off` : `${oppName()} are down to ten — ${short(e.actor_name)} is off`;
    case 'opp_shape': return `${oppName()} switch to ${d.to || 'a new shape'}`;
    case 'window': return `${mo.minute}' — your window`;
    case 'insight': return mo.insight.title;
    case 'takeover': {
      const f0 = S.matchFixture || {};
      if(f0.scenario && f0.scenario.title) return f0.scenario.title;
      return f0.branchOf ? `Rehearsal from ${clockStr(mo.clock)}` : `You take charge at ${minuteOf(mo.clock)}'`;
    }
    default: return 'Touchline moment';
  }
}
function momentLede(m, mo){
  switch(mo.kind){
    case 'takeover': {
      const f0 = S.matchFixture || {};
      if(f0.scenario && f0.scenario.brief) return f0.scenario.brief;
      return f0.branchOf ? 'Everything up to now happened exactly as in the real match. From here it\'s yours — try a different call. This doesn\'t count.'
        : 'Read the situation, then make your call.';
    }
    case 'window': return `No changes yet. The ${mo.minute === 60 ? 'hour mark' : 'last quarter'} is when managers win games — fresh legs, a tweak to the plan, or a vote of confidence.`;
    case 'opp_shape': return `Their coach is reacting. A new shape means new gaps — and new problems for you.`;
    case 'red': return isMine((mo.event || {}).team_id) ? `Ten men for the rest of it. Reshape or protect — the assistant has options.` : `A man advantage. Push the numbers and make it count.`;
    case 'goal': return isMine((mo.event || {}).team_id) ? `Momentum is yours. Keep the foot down or manage the game?` : `How do you respond?`;
    default: return '';
  }
}
function situationHTML(m){
  const s = presS(m), me = myTeam(), st = statsAt(m, s);
  const w0 = windowAt(m, me, Math.max(0, s - 900), s);
  const hm = me === 'HOME';
  const w = {xg_for: hm ? w0.xg_for : w0.xg_against, xg_against: hm ? w0.xg_against : w0.xg_for,
             shots_for: hm ? w0.shots_for : w0.shots_against, shots_against: hm ? w0.shots_against : w0.shots_for,
             box_for: hm ? w0.box_for : w0.box_against, box_against: hm ? w0.box_against : w0.box_for,
             possession: hm ? w0.possession : Math.round(100 - w0.possession)};
  return `<div class="cm-sit">
    <div class="cm-sit-sc"><span>${esc(homeName())}</span><b>${st.score.HOME}–${st.score.AWAY}</b><span>${esc(awayName())}</span><em>${clockStr(s)}</em></div>
    <div class="cm-sit-w"><em>LAST 15'</em>
      <span>xG <b>${f2(w.xg_for)}</b>–<b>${f2(w.xg_against)}</b></span>
      <span>Shots <b>${w.shots_for}</b>–<b>${w.shots_against}</b></span>
      <span>Box entries <b>${w.box_for}</b>–<b>${w.box_against}</b></span>
      <span>Possession <b>${w.possession}–${Math.round(100 - w.possession)}</b></span></div>
    ${momentumBlock(m, s, {h: 46, decisions: C(m).decisions})}</div>`;
}
/* A goal or red card asks a question — offer the two answers as one-click calls. */
function choiceInsight(m, mo){
  const e = mo.event || {}, st = statsAt(m, presS(m)).score, me = myTeam();
  const lead = st[me] - st[other(me)], mine = isMine(e.team_id);
  const T = {...(S.current && S.current.tactics || {})};
  const tac = (label, ch, summary) => ({type: 'tactics', label, tactics: {...T, ...ch}, summary});
  const stay = label => ({type: 'resume', label});
  const safe = {defensiveBlockHeight: T.defensiveBlockHeight === 'High' ? 'Mid' : 'Deep', buildUpTempo: 'Patient',
                progressionRisk: 'Secure', afterWinningPossession: 'Secure', boxCommitment: 'Cautious'};
  const bold = {boxCommitment: 'Commit', progressionRisk: 'Ambitious', buildUpTempo: 'Quick', afterLosingPossession: 'Counterpress'};
  let title, text, actions;
  if(mo.kind === 'goal'){
    if(mine && lead > 0){ title = 'Your call'; text = 'Kill the game with a second, or protect what you have?';
      actions = [stay('Stay on the front foot'), tac('See it out', safe, 'deeper block, patient and secure')]; }
    else if(mine){ title = 'Your call'; text = 'The momentum is with you — go for the next one?';
      actions = [tac('Go for the next one', bold, 'commit bodies, take risks, counterpress'), stay('Keep the shape')]; }
    else if(lead < 0){ title = 'Your call'; text = 'Chase it now, or keep calm and trust the plan?';
      actions = [tac('Respond — go for it', bold, 'commit bodies, take risks, counterpress'), stay('Stay calm')]; }
    else { title = 'Your call'; text = lead > 0 ? 'Still ahead. Tighten up, or keep playing your game?' : 'Level again. Respond, or settle it down?';
      actions = lead > 0 ? [tac('Tighten up', safe, 'deeper block, patient and secure'), stay('Keep playing')]
                         : [tac('Go and win it', bold, 'commit bodies, take risks'), stay('Settle it down')]; }
  } else if(mo.kind === 'red'){
    if(mine){ title = 'Your call'; text = 'Ten men: get compact and hard to beat, or keep your shape and ride it out?';
      actions = [tac('Get compact', {defensiveWidth: 'Narrow', defensiveBlockHeight: T.defensiveBlockHeight === 'High' ? 'Mid' : 'Deep',
                   pressingIntensity: 'Selective', afterLosingPossession: 'Regroup'}, 'narrow, deeper, regroup'), stay('Ride it out')]; }
    else { title = 'Your call'; text = 'They are a man down. Push the advantage?';
      actions = [tac('Press the advantage', {pressingIntensity: 'Aggressive', attackingWidth: 'Wide', boxCommitment: 'Commit'},
                   'press harder, stretch them wide, commit bodies'), stay('Stay patient')]; }
  } else return null;
  return {id: `choice:${mo.kind}:${mo.clock || presS(m) | 0}`, kind: 'choice', severity: 2, title, text, why: '', actions};
}
setInterval(() => { if(S.match && S.ui.view === 'match') applyCam(); }, 1000);
function openMoment(m, mo){
  closeMoment();
  if((mo.kind === 'goal' || mo.kind === 'red') && !mo.choice) mo.choice = choiceInsight(m, mo);
  const cm = C(m);
  cm.moment = mo;
  const el = document.createElement('div');
  el.id = 'cmMoment'; el.className = 'cm-modal';
  el.innerHTML = `<div class="cm-mo" role="dialog" aria-label="Touchline moment">
    <div class="cm-mo-k">TOUCHLINE MOMENT · ${minuteOf(presS(m))}'</div>
    <h2 class="cm-mo-t ${mo.kind === 'goal' ? (isMine(mo.event.team_id) ? 'gf' : 'ga') : mo.kind === 'red' ? 'rc' : ''}">${esc(momentTitle(m, mo))}</h2>
    <div class="cm-mo-l">${esc(momentLede(m, mo))}</div>
    ${situationHTML(m)}
    <div class="cm-mo-cards" id="cmMoCards"><div class="cm-empty"><i class="cm-spin"></i> The assistant is reading the game…</div></div>
    <div class="cm-mo-f">
      <button class="btn sec sm" onclick="CM.openTouchline()">Tactics &amp; subs</button>
      ${autoPauseSeg()}
      <button class="btn pri cm-resume" onclick="CM.resume()">Resume ▶</button>
    </div></div>`;
  el.addEventListener('click', ev => { if(ev.target === el) CM.resume(); });
  document.body.appendChild(el);
  const fill = I => {
    const box = $('#cmMoCards'); if(!box || S.match !== m) return;
    let list = (I && I.insights) || [];
    if(mo.kind === 'insight' && !list.some(i => i.id === mo.insight.id)) list = [mo.insight, ...list];
    if(mo.kind === 'insight') list = [list.find(i => i.id === mo.insight.id), ...list.filter(i => i.id !== mo.insight.id)];
    // one voice, few loaded calls: the question's answers first, then at most one more read
    list = mo.choice ? [mo.choice, ...list.filter(i => i.severity >= 2).slice(0, 1)] : list.slice(0, 2);
    const imps = withLabels(m, (I && I.impacts) || []).slice(-1);
    box.innerHTML = (list.length ? list.map(i => insightCard(m, i)).join('')
      : `<div class="cm-empty">${I ? 'No red flags from the assistant — trust the plan, or make your own call on the Touchline.' : 'The assistant is unavailable right now — the Touchline is still yours.'}</div>`)
      + imps.map(im => impactCard(im)).join('');
  };
  pollInsights(m, 'modal').then(I => fill(I || cm.insights));
}
function closeMoment(){ const el = $('#cmMoment'); if(el) el.remove(); if(S.match && S.match._cm) S.match._cm.moment = null; }

function showGoalBanner(m, e){
  const bn = $('#cmBanner'); if(!bn || S.ui.view !== 'match') return;
  const d = e.detail || {}, mine = isMine(e.team_id);
  const sc = d.score || statsAt(m, e.timestamp).score;
  bn.className = 'cm-banner on ' + (mine ? 'gf' : 'ga');
  bn.innerHTML = `<div class="cm-bn-k">${mine ? 'GOAL!' : 'GOAL — ' + esc(sideName(e.team_id).toUpperCase())}</div>
    <div class="cm-bn-n">${esc(e.actor_name || '')} <span>${minuteOf(e.timestamp)}'</span></div>
    ${d.assist ? `<div class="cm-bn-a">assist ${esc(d.assist)}</div>` : d.penalty ? `<div class="cm-bn-a">penalty</div>` : ''}
    <div class="cm-bn-s">${esc(homeName())} <b>${sc.HOME}–${sc.AWAY}</b> ${esc(awayName())}</div>`;
  const scoreEl = $('#cmScore'); if(scoreEl){ scoreEl.classList.remove('cm-flash'); void scoreEl.offsetWidth; scoreEl.classList.add('cm-flash'); }
  clearTimeout(showGoalBanner._t);
  showGoalBanner._t = setTimeout(() => { bn.className = 'cm-banner'; }, 3400);
}

/* one-click action from an assistant card */
async function applyAction(btn, insId, k){
  const m = S.match; if(!m || !isLiveMatch()) return;
  const cm = C(m);
  const pool = [...((cm.insights && cm.insights.insights) || []), ...(cm.moment && cm.moment.insight ? [cm.moment.insight] : []),
                ...(cm.moment && cm.moment.choice ? [cm.moment.choice] : [])];
  const ins = pool.find(i => i.id === insId); if(!ins) return;
  const a = (ins.actions || [])[k]; if(!a) return;
  if(a.type === 'resume'){ CM.resume(); return; }
  if(btn){ btn.disabled = true; btn.classList.add('work'); btn.textContent = 'Applying…'; }
  await waitFor(() => !mgmtPending && !advanceInFlight);
  mgmtPending = true;
  const team = myTeam();
  let path, body;
  if(a.type === 'sub'){ path = 'substitution'; body = {team, player_off: a.player_off, player_on: a.player_on, target_slot: a.target_slot}; }
  else if(a.type === 'tactics'){ path = 'tactics'; body = {team, tactics: {...a.tactics}}; }
  else if(a.type === 'instructions'){ path = 'instructions'; body = {team, player_id: a.player_id, instructions: {...a.instructions}}; }
  else { mgmtPending = false; return; }
  try{
    const r = await api(`/matches/${m.matchId}/${path}`, {method: 'POST', body});
    mgmtPending = false;
    if(a.type === 'tactics') S.current.tactics = {...a.tactics};
    if(a.type === 'instructions') S.current.playerInstructions[a.player_id] = {...a.instructions};
    reconcileLiveFromEngine(r.management);
    const minute = minuteOf(r.rewound_to ?? presS(m));
    S.changes.push({minute, text: a.label});
    cm.applied[actionKey(m, a)] = minute;
    saveState();
    toast(`✓ ${a.label} — applied at ${minute}'`);
    if(btn){ btn.classList.remove('work'); btn.classList.add('done'); btn.textContent = `✓ ${a.label} · ${minute}'`; }
    const mo = $('#cmMoment .cm-mo');
    if(mo){
      let dn = mo.querySelector('.cm-mo-done');
      if(!dn){ dn = document.createElement('div'); dn.className = 'cm-mo-done'; mo.querySelector('.cm-mo-f').before(dn); }
      const all = cm.decisions.filter(d => d.clock >= (cm.lastPauseS | 0) - 1).map(d => d.label);
      dn.textContent = `✓ Applied at ${minute}': ${all.join(' · ') || a.label}. Resume to see it play out — the assistant will track the effect.`;
    }
    cm.asstSig = ''; cm.htSig = '';
    if(S.ui.view === 'match') renderMatch();
  }catch(e){
    mgmtPending = false;
    toast('Not applied: ' + e.message);
    if(btn){ btn.disabled = false; btn.classList.remove('work'); btn.textContent = a.label; }
  }
}

/* ═══ HALF TIME PANEL ═════════════════════════════════════════════════════ */
window.updateHtPanel = function(m){
  const el = $('#htPanel'); if(!el || !m) return;
  const cm = C(m);
  if(!m.htActive){ if(el.innerHTML) el.innerHTML = ''; cm.htSig = ''; return; }
  const I = cm.insights;
  const sig = JSON.stringify([I && I.at, Object.keys(cm.applied).length, m.events.length]);
  if(cm.htSig === sig) return;
  cm.htSig = sig;
  const s = HALF, st = statsAt(m, s), H = st.T.HOME, A = st.T.AWAY;
  const ins = ((I && I.insights) || []).slice(0, 3);
  const imps = withLabels(m, (I && I.impacts) || []).slice(-1);
  el.innerHTML = `<div class="htpanel cm-ht">
    <div class="cm-ht-top">
      <div><h3>HALF TIME</h3>
        <div class="cm-ht-sc">${esc(homeName())} <b>${st.score.HOME} – ${st.score.AWAY}</b> ${esc(awayName())}</div>
        <div class="cm-ht-st"><span>xG <b>${f2(H.xg)}–${f2(A.xg)}</b></span><span>Shots <b>${H.shots}–${A.shots}</b></span>
          <span>On target <b>${H.sot}–${A.sot}</b></span><span>Possession <b>${Math.round(st.poss.home)}–${100 - Math.round(st.poss.home)}</b></span></div>
        ${momentumBlock(m, s, {h: 40, decisions: cm.decisions})}
        <div class="cm-ht-btns"><button class="btn pri" onclick="startSecondHalf()">Start second half ▶</button>
          <button class="btn sec" onclick="show('squad')">Tactics &amp; subs</button></div>
      </div>
      <div class="cm-ht-read"><div class="cm-asst-h">ASSISTANT'S HALF-TIME READ</div>
        ${I ? (ins.length ? ins.map(i => insightCard(m, i)).join('') : `<div class="cm-empty">No alarms at the break. The plan is working — or at least, not failing.</div>`)
          : `<div class="cm-empty"><i class="cm-spin"></i> Reviewing the first half…</div>`}
        ${imps.map(im => impactCard(im)).join('')}</div>
    </div></div>`;
};

/* ═══ 5. PACE: speeds, next moment, sim to full time ═══════════════════════ */
let SEEK_OK = null;          // null unknown · true · false (fallback to /advance)
async function seekTo(m, to){
  to = Math.max(0, Math.min(FULL, Math.round(to)));
  if(SEEK_OK !== false){
    try{
      const r = await _api(`/matches/${m.matchId}/seek`, {method: 'POST', body: {to_clock: to, last_event_index: m.eventIndex}});
      SEEK_OK = true;
      if(r.rewound_to != null) applyRewind(m, r);
      else mergeMatchSnapshot(m, {...r, frames: undefined});
      return true;
    }catch(e){
      if(!/\(404\)|\(405\)|Not Found|Method Not Allowed/.test(e.message)) throw e;
      SEEK_OK = false;
    }
  }
  if(to <= m.clockSeconds) return false;       // fallback cannot rewind
  while(m.clockSeconds < to && !C(m).serverFT){
    const snap = await _api(`/matches/${m.matchId}/advance`, {method: 'POST',
      body: {seconds: Math.min(600, to - m.clockSeconds), last_event_index: m.eventIndex, frames: false}});
    mergeMatchSnapshot(m, snap);
  }
  return true;
}
function findTarget(m, s0){
  const me = myTeam(), cm = C(m);
  let best = null;
  const cand = (clock, kind, event) => { if(clock > s0 + 1 && (!best || clock < best.clock)) best = {clock, kind, event}; };
  for(const e of m.events){
    if(e.timestamp <= s0 + 1) continue;
    const d = e.detail || {};
    if(e.event_type === 'GOAL') { cand(e.timestamp, 'goal', e); break; }
    if(e.event_type === 'CARD' && String(d.card || '').includes('RED')) { cand(e.timestamp, 'red', e); break; }
    if(e.event_type === 'FORMATION_CHANGE' && e.team_id !== me) { cand(e.timestamp, 'opp_shape', e); break; }
  }
  if(!cm.decisions.length) for(const w of [60, 75]){
    const c = w * 60;
    if(!cm.fired.has('w' + w) && c > s0 + 1 && c <= m.clockSeconds) cand(c, 'window', null);
  }
  return best;
}
function jumpPresentation(m, land, note){
  const cm = C(m);
  const A = activeAnim(); if(A && A.reset) A.reset(land);
  cm.scanPtr = Math.max(cm.scanPtr, firstAfter(m.events, land));
  if(note) cm.localLines.push({clock: land, type: 'skip', text: note, local: true});
  if(land >= HALF && !m.htShown && land > HALF) m.htShown = true;
}
async function withBusy(m, label, fn){
  const cm = C(m);
  if(cm.busy) return;
  cm.busy = true; cm.busyLabel = label;
  const wasLive = m.status === 'live';
  if(wasLive){ m.status = 'paused'; clearInterval(matchTimer); }
  closeMoment();
  refreshControls(true);
  try{
    await waitFor(() => !advanceInFlight && !mgmtPending, 15000);
    return await fn(wasLive);
  }catch(e){
    toast('Could not skip ahead: ' + e.message);
    if(wasLive && m.status === 'paused'){ m.status = 'live'; clearInterval(matchTimer); matchTimer = setInterval(tick, TICK_MS); }
  }finally{
    cm.busy = false; cm.busyLabel = '';
    refreshControls(true);
    if(S.ui.view === 'match') renderMatch();
  }
}
function resumeLive(m){
  if(m.status === 'ft' || m.htActive) return;
  m.status = 'live';
  clearInterval(matchTimer); matchTimer = setInterval(tick, TICK_MS);
}
async function nextMoment(){
  const m = S.match; if(!m || !isLiveMatch() || m.htActive) return;
  await withBusy(m, 'Scanning ahead for the next moment…', async () => {
    const cm = C(m);
    const s0 = presS(m);
    let target = findTarget(m, s0);
    const stopAt = s0 < HALF ? HALF : FULL;
    while(!target && m.clockSeconds < stopAt && !cm.serverFT){
      const to = Math.min(stopAt, m.clockSeconds + 240);   // stay inside the server's 300 s reveal grace
      if(!(await seekTo(m, to))) break;
      target = findTarget(m, s0);
      if(S.match !== m) return;
    }
    if(target){
      const land = target.kind === 'window' ? target.clock
        : Math.max(Math.ceil(s0), target.clock - MOMENT_LEAD);
      if(land < m.clockSeconds && SEEK_OK !== false) await seekTo(m, land);
      const at = Math.min(land, m.clockSeconds);
      jumpPresentation(m, at, `Skipped ahead to ${clockStr(at)}`);
      if(target.kind === 'window'){
        cm.fired.add('w' + (target.clock / 60));
        doAutoPause(m, {kind: 'window', clock: target.clock, minute: target.clock / 60});
      } else {
        cm.forceAt = {clock: target.clock, kind: target.kind};
        resumeLive(m);
        if(at >= target.clock){          // fallback: we could not land before it
          cm.scanPtr = Math.min(cm.scanPtr, m.events.indexOf(target.event));
        }
      }
    } else {
      const land = Math.min(stopAt, m.clockSeconds);
      jumpPresentation(m, land, land >= FULL ? 'Skipped to full time' : `Skipped ahead to ${clockStr(land)}`);
      if(land < stopAt) resumeLive(m);
      else if(stopAt === HALF){ m.status = 'live'; }   // presentation reaches HT → HT panel
      else m.status = 'live';
      toast(stopAt === HALF ? 'Nothing major before the break — here\'s half time.' : 'No more key moments — full time.');
    }
  });
}
function confirmSimFT(){
  const m = S.match; if(!m || !isLiveMatch()) return;
  closeMoment();
  if(m.status === 'live'){ togglePlay(); C(m).resumeOnCancel = true; }
  const el = document.createElement('div');
  el.id = 'cmMoment'; el.className = 'cm-modal';
  el.innerHTML = `<div class="cm-mo cm-confirm" role="dialog" aria-label="Simulate to full time">
    <div class="cm-mo-k">SIM TO FULL TIME</div>
    <h2 class="cm-mo-t">Leave the touchline?</h2>
    <div class="cm-mo-l">The rest of the match (${clockStr(presS(m))} → 90:00) is simulated with your current plan. You won't be able to make changes.</div>
    <div class="cm-mo-f"><button class="btn sec" onclick="CM.cancelSimFT()">Keep watching</button>
      <button class="btn pri cm-go" onclick="CM.simToFT()">Sim to full time ⏩</button></div></div>`;
  el.addEventListener('click', ev => { if(ev.target === el) cancelSimFT(); });
  document.body.appendChild(el);
}
function cancelSimFT(){
  const m = S.match; closeMoment();
  if(m && C(m).resumeOnCancel && m.status === 'paused'){ C(m).resumeOnCancel = false; togglePlay(); }
}
async function simToFT(){
  const m = S.match; closeMoment(); if(!m || !isLiveMatch()) return;
  await withBusy(m, 'Simulating to full time…', async () => {
    const cm = C(m);
    if(!cm.serverFT) await seekTo(m, FULL);
    m.htShown = true; m.htActive = false;
    jumpPresentation(m, FULL, 'Simulated to full time');
    cm.scanPtr = m.events.length;
    m.status = 'live';
  });
  checkClock(m);
}

/* ═══ SCHEDULER: own tick (prefetch) + presentation monitor ════════════════ */
window.tick = async function(){
  const m = S.match;
  if(!m || m.status !== 'live' || advanceInFlight || mgmtPending) return;
  const cm = C(m);
  if(cm.busy || cm.freeze || cm.serverFT) return;
  if(!m.htShown && m.clockSeconds >= HALF) return;       // server holds at HT until the picture gets there
  if(m.clockSeconds >= FULL) return;
  advanceInFlight = true;
  try{
    if(ANIM_ANY && activeAnim().frames.length && activeAnim().remaining() > currentBatch() * 1.5) return;
    let secs = currentBatch();
    if(m.clockSeconds < HALF) secs = Math.min(secs, HALF - m.clockSeconds);
    secs = Math.max(1, Math.min(secs, FULL - m.clockSeconds));
    const snap = await _api(`/matches/${m.matchId}/advance`,
      {method: 'POST', body: {seconds: secs, last_event_index: m.eventIndex, frames: ANIM_ANY}});
    if(S.match !== m || cm.busy) { if(S.match === m) mergeMatchSnapshot(m, {...snap, frames: undefined}); return; }
    mergeMatchSnapshot(m, snap);
  }catch(e){
    if(S.match === m && !cm.busy){
      m.status = 'reconnecting'; clearInterval(matchTimer);
      toast('Engine connection lost — reconnecting…');
      scheduleResync(m.matchId);
    }
  }finally{
    advanceInFlight = false;
  }
  if(S.ui.view === 'squad') renderPitch();
};

/* presentation-clock transitions: half time and full time */
function checkClock(m){
  const cm = C(m), s = presS(m);
  if(cm.ftPresented) return;
  if(!m.htShown && m.clockSeconds >= HALF && s >= HALF - 0.6){
    m.htShown = true; m.htActive = true;
    m.status = 'paused'; clearInterval(matchTimer);
    closeMoment(); cm.pendingGoal = null;
    cm.insAt = -1e9; pollInsights(m, 'ht').then(() => { cm.htSig = ''; });
    if(S.ui.view === 'match') renderMatch();
  }
  if(cm.serverFT && (s >= FULL - 0.6 || !ANIM2_ON && !ANIM_ON)) presentFT(m);
}
function presentFT(m){
  const cm = C(m);
  if(cm.ftPresented) return;
  cm.ftPresented = true;
  m.fullTime = cm.pendingFT || m.fullTime;
  m.status = 'ft'; m.htActive = false;
  clearInterval(matchTimer);
  closeMoment();
  clearActiveMatchHandle();
  emit('match:ft', {matchId: m.matchId, score: m.score, exhibition: !!(S.matchFixture && S.matchFixture.exhibition)});
  if(S.ui.view === 'match') renderMatch();
  fetchReview(m);
  (async () => {
    if(cm.finalizeCalled) return;
    cm.finalizeCalled = true;
    try{ await window.finalizeFixture(); }catch(e){ console.warn('[coach-match] finalize', e); }
    cm.finalizeDone = true;
    try{ if(TL.hooks.afterFullTime) await TL.hooks.afterFullTime(m); }catch(e){ console.warn('[coach-match] afterFullTime', e); }
    if(S.match === m && S.ui.view === 'match') renderMatch();
  })();
}

const PRES_KEY = 'touchline:cm_presented';
let presSavedAt = 0;
function monitor(){
  safe(() => {
    livePill();
    const m = S.match;
    if(!m || !m.matchId || m.status === 'ft') return;
    const cm = C(m), s = presS(m);
    if(performance.now() - presSavedAt > 1000 && !cm.busy){
      presSavedAt = performance.now();
      try{ localStorage.setItem(PRES_KEY, JSON.stringify({matchId: m.matchId, s})); }catch(e){}
    }
    if(!cm.busy){
      scanMoments(m, s);
      checkClock(m);
      if(cm.pendingGoal && (performance.now() >= cm.pendingGoal.at || s >= cm.pendingGoal.simAt)){
        const g = cm.pendingGoal; cm.pendingGoal = null;
        doAutoPause(m, g.mo);
      }
      if(m.status === 'live' && !m.htActive && s - cm.insAt >= INSIGHT_EVERY && s > cm.startClock + 20) pollInsights(m, 'poll');
    }
    if(S.ui.view !== 'match' || m.status === 'ft') return;
    if(!$('#mHeader')) return;
    updateMatchHeader(m);
    updateFeedList(m);
    updateHtPanel(m);
    renderAssistant(m);
    if(performance.now() - cm.lastRatings > 1000){
      cm.lastRatings = performance.now();
      if(m.sideTab === 'ratings') updateRatingsList(m);
      if(m.selPid) updatePlayerPanel(m);
    }
  });
}
setInterval(monitor, 200);

/* floating "back to the match" pill when the manager leaves the match view */
function livePill(){
  let el = $('#cmPill');
  const m = S.match;
  const want = m && m.matchId && m.status !== 'ft' && S.ui.view !== 'match' && S.matchFixture;
  if(!want){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement('button'); el.id = 'cmPill'; el.className = 'cm-pill'; el.onclick = () => show('match'); document.body.appendChild(el); }
  const st = statsAt(m, presS(m));
  el.classList.toggle('paused', m.status !== 'live');
  const txt = `<i></i>${m.status === 'live' ? 'LIVE' : m.htActive ? 'HALF TIME' : 'PAUSED'} ${m.htActive ? '45\'' : minuteOf(presS(m)) + '\''} · ${esc(homeName())} ${st.score.HOME}–${st.score.AWAY} ${esc(awayName())} <b>Back to match →</b>`;
  if(el.dataset.v !== txt){ el.dataset.v = txt; el.innerHTML = txt; }
}

/* ── wrappers on existing controls ──────────────────────────────────────── */
const _toggle = window.togglePlay;
window.togglePlay = function(){
  const m = S.match;
  if(m && m._cm && m._cm.busy) return;
  if(m && m.status !== 'live') closeMoment();
  if(m && m.status === 'reconnecting') return;
  return _toggle.apply(this, arguments);
};
const _setSpeed = window.setSpeed;
window.setSpeed = function(x){ closeMoment(); const r = _setSpeed.apply(this, arguments); refreshControls(true); return r; };
const _second = window.startSecondHalf;
window.startSecondHalf = function(){ closeMoment(); return _second.apply(this, arguments); };
AnimR2.step = (function(orig){
  return function(dt){
    const m = S.match;
    if(m && m._cm && (m._cm.freeze > 0 || m._cm.busy) && m.status === 'live'){
      m.status = 'paused';
      try{ return orig.call(this, dt); }finally{ m.status = 'live'; }
    }
    return orig.call(this, dt);
  };
})(AnimR2.step);
const _resume = window.resumeActiveMatch;
window.resumeActiveMatch = async function(){
  const ok = await _resume.apply(this, arguments);
  const m = S.match;
  if(ok && m){
    // come back to the second the manager was actually watching (never skip unseen play)
    let seen = null;
    try{ seen = JSON.parse(localStorage.getItem(PRES_KEY) || 'null'); }catch(e){}
    if(seen && seen.matchId === m.matchId && seen.s < m.clockSeconds - 2 && m.clockSeconds - seen.s < 880){
      try{ await seekTo(m, Math.floor(seen.s)); }catch(e){}
    }
    const A = activeAnim(); if(A && A.reset) A.reset(m.clockSeconds || 0);
    const cm = C(m); cm.startClock = m.clockSeconds || 0; cm.scanPtr = m.events.length;
    if(m.clockSeconds > HALF) m.htShown = true;
  }
  return ok;
};
const _abandon = window.abandonMatch;
window.abandonMatch = function(){
  const m = S.match, cm = m && C(m);
  closeMoment();
  if(cm && cm.origin){                // abandoning a rehearsal returns to the real match
    clearInterval(matchTimer);
    if(m.matchId) _api(`/matches/${m.matchId}`, {method: 'DELETE'}).catch(() => {});
    return restoreOrigin(cm.origin);
  }
  return _abandon.apply(this, arguments);
};
const _kick = window.kickOff;
window.kickOff = async function(){
  const r = await _kick.apply(this, arguments);
  if(S.match){ const A = activeAnim(); if(A && A.reset && (S.match.clockSeconds || 0) === 0 && presS(S.match) > 5) A.reset(0); }
  return r;
};

/* ═══ 8. TL.startLiveFromSnapshot ═════════════════════════════════════════ */
TL.startLiveFromSnapshot = function(snap, fixture){
  clearInterval(matchTimer);
  closeMoment();
  S.matchFixture = fixture;
  S.changes = [];
  S.base = JSON.parse(JSON.stringify(S.current));
  const clock = snap.clock_seconds || 0;
  const A = activeAnim(); if(A && A.reset) A.reset(clock);
  S.match = makeLiveMatch(snap);
  const m = S.match, cm = C(m);
  cm.startClock = clock;
  cm.scanPtr = firstAfter(m.events, clock);
  if(clock >= HALF) m.htShown = true;
  if(clock >= HALF && clock < HALF + 1){ m.htShown = false; }
  safe(() => reconcileLiveFromEngine(snap.management));
  if(!fixture || !fixture.exhibition) setActiveMatchHandle(snap.match_id, fixture && fixture.id);
  const wrap = $('#matchBody'); if(wrap) wrap.dataset.mode = '';
  clearInterval(matchTimer);
  if(clock > 60){
    // taking over mid-match: start on a Touchline moment so the manager can read the game first
    m.status = 'paused';
    show('match');
    setTimeout(() => { if(S.match === m && m.status === 'paused' && !m.htActive) openMoment(m, {kind: 'takeover', clock}); }, 60);
  } else {
    m.status = 'live';
    show('match');
    matchTimer = setInterval(tick, TICK_MS);
  }
  return m;
};

/* ═══ 7. FULL TIME: review, decision lab, replay-from ═════════════════════ */
async function fetchReview(m){
  const cm = C(m);
  if(cm.review || cm.reviewBusy) return;
  cm.reviewBusy = true;
  try{
    cm.review = await _api(`/matches/${m.matchId}/review?team=${myTeam()}`);
    cm.reviewErr = null;
  }catch(e){ cm.reviewErr = e.message; }
  finally{ cm.reviewBusy = false; }
  if(S.match === m && S.ui.view === 'match' && m.status === 'ft') renderMatch();
}
const RES_WORD = (f, a) => f > a ? 'you won' : f === a ? 'you drew' : 'you lost';
const MOMENT_ICON = {goal_for: ['gf', '●'], goal_against: ['ga', '●'], big_miss_for: ['mf', '○'], big_miss_against: ['ma', '○'],
  red_for: ['rf', '■'], red_against: ['ra', '■'], penalty: ['pen', 'P'], swing_for: ['sf', '↗'], swing_against: ['sa', '↘']};

function ftTabsHTML(cm){
  const tabs = [['review', 'REVIEW'], ['lab', 'DECISION LAB'], ['replay', 'REPLAY FROM…'], ['stats', 'MATCH STATS']];
  return `<div class="cm-fttabs" role="tablist">${tabs.map(([k, l]) =>
    `<button class="${cm.ftTab === k ? 'on' : ''}" data-ft="${k}" onclick="CM.ftTab('${k}')">${l}</button>`).join('')}</div>`;
}
function reviewHTML(m){
  const cm = C(m), R = cm.review;
  if(!R) return cm.reviewErr
    ? `<div class="cm-panel"><div class="cm-empty">The match review isn't available (${esc(cm.reviewErr)}). <button class="btn sec sm" onclick="CM.retryReview()">Try again</button></div></div>`
    : `<div class="cm-panel"><div class="cm-empty"><i class="cm-spin"></i> Your assistant is writing the match review…</div></div>`;
  const res = {W: ['good', 'WIN'], D: ['mid', 'DRAW'], L: ['bad', 'DEFEAT']}[R.result] || ['mid', ''];
  const moments = R.moments || [];
  const tl = moments.map(mo => {
    const [c, ic] = MOMENT_ICON[mo.kind] || ['', '•'];
    return `<span class="cm-tlm ${c}" style="left:${Math.min(99, Math.max(1, mo.minute / 90 * 100))}%" title="${esc(`${mo.minute}' ${mo.text}`)}">${ic}</span>`;
  }).join('');
  const decs = withLabels(m, R.impacts);
  const pl = (p, cls) => `<div class="cm-pl ${cls}"><span class="rv ${ratingClass(p.rating)}">${Number(p.rating).toFixed(1)}</span>
    <b>${esc(p.name)}</b><span class="cm-dim">${esc(p.why || '')}</span></div>`;
  return `<div class="cm-panel cm-review">
    <div class="cm-rv-head"><span class="cm-chip ${res[0]}">${res[1]} ${R.score[0]}–${R.score[1]}</span>
      <h2>${esc(R.verdict)}</h2><p>${esc(R.process)}</p></div>
    ${momentumBlock(m, FULL, {h: 56, full: true, rows: R.momentum && R.momentum.length ? normMom(R.momentum) : momentumAt(m, FULL), decisions: cm.decisions})}
    <div class="cm-grid2">
      <section><h4>TURNING POINTS</h4>
        <div class="cm-tl"><div class="cm-tlbar"></div>${tl}<span class="cm-tlht"></span></div>
        ${moments.length ? moments.map(mo => { const [c, ic] = MOMENT_ICON[mo.kind] || ['', '•'];
          return `<div class="cm-mrow"><span class="cm-mmin">${mo.minute}'</span><span class="cm-tlm st ${c}">${ic}</span><span>${esc(mo.text)}</span></div>`; }).join('')
          : `<div class="cm-empty">A quiet game — no big swings.</div>`}
      </section>
      <section><h4>YOUR DECISIONS</h4>
        ${decs.length ? decs.map(im => impactCard(im, `${im.minute}'`, {review: true,
            lab: ((cm.lab && cm.lab.items) || []).find(d => d && d.minute === im.minute)})).join('')
          : `<div class="cm-empty">${cm.decisions.length ? 'Your changes came too early to measure a before/after — see the Decision Lab.' : 'You didn\'t change anything. Sometimes that\'s the right call — the Decision Lab can only test decisions you make.'}</div>`}
        ${decs.length ? `<button class="btn sec sm cm-tolab" onclick="CM.ftTab('lab')">Test them in the Decision Lab →</button>` : ''}
      </section>
    </div>
    <div class="cm-grid2">
      <section><h4>PLAYERS</h4>
        ${(R.best || []).map(p => pl(p, 'best')).join('')}
        ${(R.worst || []).length ? `<div class="cm-subh">STRUGGLED</div>${R.worst.map(p => pl(p, 'worst')).join('')}` : ''}
        ${(R.tired || []).length ? `<div class="cm-subh">FINISHED ON FUMES</div><div class="cm-dim cm-tired">${R.tired.map(t => `${esc(short(t.name))} ${t.energy}%`).join(' · ')}</div>` : ''}
      </section>
      <section><h4>LESSONS</h4><ul class="cm-lessons">${(R.lessons || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul></section>
    </div></div>`;
}
function normMom(rows){
  return rows.slice(0, 18).map((r, i) => ({minute: r.minute, HOME: r.HOME || 0, AWAY: r.AWAY || 0,
    goals: (r.goals || []).map(g => ({...g, ts: (g.minute - 0.5) * 60})), reds: []}));
}

/* Decision Lab — one decision at a time so results stream in */
async function runLab(m){
  const cm = C(m);
  if(cm.lab && (cm.lab.running || cm.lab.done)) return;
  cm.lab = {running: true, done: false, items: [], total: null, error: null, next: 0, samples: 16};
  const L = cm.lab;
  const rerender = () => { if(S.match === m && m.status === 'ft' && cm.ftTab === 'lab') renderLabPane(m); };
  rerender();
  try{
    for(let i = 0; i < 12; i++){
      L.next = i;
      rerender();
      let r;
      try{
        r = await _api(`/matches/${m.matchId}/decision-lab`, {method: 'POST', body: {team: myTeam(), samples: 16, index: i}});
      }catch(e){
        if(/index must be/i.test(e.message)) break;   // past the last decision (or none at all)
        throw e;
      }
      if(r.decision_count != null) L.total = r.decision_count;
      else if(r.total != null) L.total = r.total;
      if(L.total === 0) break;
      if(r.samples) L.samples = r.samples;
      const ds = (r.decisions || []).filter(d => d.index === undefined || d.index === i || (r.decisions || []).length === 1);
      if(!ds.length) break;
      L.items.push(...ds);
      if(L.total != null && L.items.length >= L.total) break;
      if((r.decisions || []).length > 1){ L.items = r.decisions; break; }   // server ignored `index`
    }
  }catch(e){ L.error = e.message; }
  L.running = false; L.done = true;
  rerender();
}
function wdlBar(o){
  const w = pct(o.win), d = pct(o.draw), l = Math.max(0, 100 - w - d);
  return `<div class="cm-wdl" title="Win ${w}% · Draw ${d}% · Loss ${l}%"><i class="w" style="width:${w}%">${w >= 12 ? w + '%' : ''}</i><i class="d" style="width:${d}%">${d >= 12 ? d + '%' : ''}</i><i class="l" style="width:${l}%">${l >= 12 ? l + '%' : ''}</i></div>`;
}
function labCard(d){
  const [af, aa] = d.actual.score, [xf, xa] = d.exact_without.score;
  const same = af === xf && aa === xa;
  const cf = same ? `In this match, standing pat would have ended the same, ${xf}–${xa} (${RES_WORD(af, aa)} ${af}–${aa}).`
    : `In this match, standing pat would have ended ${xf}–${xa} (${RES_WORD(af, aa)} ${af}–${aa}).`;
  const W = d.with || {}, O = d.without || {};
  const ep = v => (Number(v) || 0).toFixed(2);
  const dp = Number(d.delta_points) || 0;
  return `<div class="cm-lab">
    <div class="cm-lab-h"><span class="cm-mmin">${d.minute}'</span><b>${esc(d.label)}</b>${chip(d.verdict)}</div>
    <div class="cm-lab-cf">${esc(cf)}</div>
    <div class="cm-lab-grid">
      <div class="cm-lab-lbl"></div><div class="cm-lab-col">EXPECTED POINTS</div><div class="cm-lab-col">WIN · DRAW · LOSS</div>
      <div class="cm-lab-lbl">With your call</div>
      <div class="cm-epb"><i class="with" style="width:${Math.min(100, (W.exp_points || 0) / 3 * 100)}%"></i><b>${ep(W.exp_points)}</b></div>${wdlBar(W)}
      <div class="cm-lab-lbl">Standing pat</div>
      <div class="cm-epb"><i class="wo" style="width:${Math.min(100, (O.exp_points || 0) / 3 * 100)}%"></i><b>${ep(O.exp_points)}</b></div>${wdlBar(O)}
    </div>
    <div class="cm-lab-t"><b class="${dp > 0.05 ? 'up' : dp < -0.05 ? 'dn' : ''}">${dp >= 0 ? '+' : ''}${dp.toFixed(2)} expected points.</b> ${esc(d.text || '')}</div>
  </div>`;
}
function labHTML(m){
  const cm = C(m), L = cm.lab;
  const intro = `<p class="cm-lab-intro">The Lab replays alternate futures of this match from the moment of each decision —
    ${L ? L.samples : 12} reseeded simulations <b>with</b> your call and the same ${L ? L.samples : 12} <b>without</b> it (same dice for both), plus the exact
    counterfactual of this very match. It shows whether the decision helped, not just whether you got lucky.</p>`;
  if(!L) return `<div class="cm-panel">${intro}<div class="cm-empty"><i class="cm-spin"></i> Preparing the lab…</div></div>`;
  const items = L.items.map(labCard).join('');
  let status = '';
  if(L.running) status = `<div class="cm-lab-prog"><i class="cm-spin"></i> Testing decision ${L.items.length + 1}${L.total ? ` of ${L.total}` : ''} — running ${L.samples * 2} alternate futures…</div>`;
  else if(L.error && !L.items.length) status = `<div class="cm-empty">The Decision Lab couldn't run (${esc(L.error)}). <button class="btn sec sm" onclick="CM.retryLab()">Try again</button></div>`;
  else if(!L.items.length) status = `<div class="cm-lab-none"><h3>No decisions to test</h3>
      <p>You didn't make a change during this match, so there is nothing to compare. Next time, act when the assistant flags a moment
      — a substitution, a tweak to the press, a change of shape — and come back here to see if it moved the needle.</p>
      <button class="btn sec sm" onclick="CM.ftTab('replay')">Rehearse it: replay from any minute →</button></div>`;
  else if(L.error) status = `<div class="cm-dim cm-lab-note">Stopped early: ${esc(L.error)}</div>`;
  else {
    const net = L.items.reduce((a, d) => a + (Number(d.delta_points) || 0), 0);
    status = `<div class="cm-lab-sum">${L.items.length} decision${L.items.length > 1 ? 's' : ''} tested · net effect <b class="${net > 0.05 ? 'up' : net < -0.05 ? 'dn' : ''}">${net >= 0 ? '+' : ''}${net.toFixed(2)} expected points</b></div>`;
  }
  return `<div class="cm-panel cm-labpane">${intro}${items}${status}</div>`;
}
function renderLabPane(m){ const el = $('#cmFtPane'); if(el && C(m).ftTab === 'lab') el.innerHTML = labHTML(m); }

function replayHTML(m){
  const cm = C(m), f = S.matchFixture;
  const min = cm.replayMin;
  const chips = [];
  const decs = (cm.origin ? C(cm.origin.match).decisions : []).concat(cm.decisions);
  const first = cm.decisions[0];
  if(first) chips.push([Math.max(1, Math.floor((first.clock - 30) / 60)), `Before your first change (${first.minute}')`]);
  const ga = m.events.find(e => e.event_type === 'GOAL' && !isMine(e.team_id));
  if(ga) chips.push([Math.max(1, Math.floor(ga.timestamp / 60) - 2), `Before they scored (${minuteOf(ga.timestamp)}')`]);
  chips.push([45, 'Second half kick-off'], [60, 'The hour mark'], [75, 'Last 15']);
  const ready = cm.finalizeDone || (f && f.exhibition);
  return `<div class="cm-panel cm-replay">
    <p class="cm-lab-intro"><b>Rehearsal</b> replays this exact match up to the minute you pick — same seed, same decisions — then hands
      you the touchline. Try a different call and see what happens. <b>Rehearsals don't count</b> toward your season.</p>
    <div class="cm-rp-tl" onclick="CM.pickReplay(event)">${momentumBlock(m, FULL, {h: 60, full: true, rows: momentumAt(m, FULL), decisions: cm.decisions, sel: min * 60})}</div>
    <div class="cm-rp-ctl">
      <input type="range" id="cmReplayMin" min="1" max="88" step="1" value="${min}" oninput="CM.setReplay(this.value)" aria-label="Replay from minute">
      <div class="cm-rp-val">from <b id="cmReplayVal">${min}:00</b></div>
    </div>
    <div class="cm-rp-chips">${chips.map(([mm, l]) => `<button class="cm-rpchip ${mm === min ? 'on' : ''}" onclick="CM.setReplay(${mm})">${esc(l)}</button>`).join('')}</div>
    ${(cm.rehearsals || []).length ? `<div class="cm-rp-hist"><h4>YOUR REHEARSALS</h4>${cm.rehearsals.map(r => `<div class="cm-mrow"><span class="cm-mmin">${clockStr(r.from)}</span>
      <span>${r.done ? 'Finished' : 'Stopped'} ${r.score[0]}–${r.score[1]} with ${r.decisions} change${r.decisions === 1 ? '' : 's'} of your own
      <span class="cm-dim">· the real match ended ${m.score[myTeam() === 'HOME' ? 0 : 1]}–${m.score[myTeam() === 'HOME' ? 1 : 0]}</span></span></div>`).join('')}</div>` : ''}
    <div class="cm-rp-go"><button class="btn pri" ${ready ? '' : 'disabled'} onclick="CM.startRehearsal()">Start rehearsal from ${min}:00 ▶</button>
      ${ready ? '' : `<span class="cm-dim">Waiting for the round's results…</span>`}</div>
  </div>`;
}

const _ftView = window.renderFullTimeView;
window.renderFullTimeView = function(wrap, m){
  // a resumed/recovered match has no pre-kickoff snapshot (S.base isn't saved)
  if(!S.base && S.current) S.base = JSON.parse(JSON.stringify(S.current));
  const prog = $('#simProgress') ? $('#simProgress').innerHTML : '';
  const r = _ftView.apply(this, arguments);
  safe(() => {
    const cm = C(m), f = S.matchFixture || {};
    wrap.classList.add('cm-ft');
    const board = wrap.querySelector('.board');
    const sp = wrap.querySelector('#simProgress'); if(sp && prog) sp.innerHTML = prog;
    // scorers under the score line
    if(board){
      const goals = m.events.filter(e => e.event_type === 'GOAL');
      const line = tid => goals.filter(e => e.team_id === tid).map(e => `${esc(short(e.actor_name))} ${minuteOf(e.timestamp)}'${(e.detail || {}).penalty ? ' (p)' : ''}`).join(', ');
      const sl = board.querySelector('.scoreline');
      if(sl && goals.length) sl.insertAdjacentHTML('afterend', `<div class="cm-scorers"><span>${line('HOME')}</span><i>⚽</i><span>${line('AWAY')}</span></div>`);
      if(f.exhibition && cm.origin){
        const btns = board.querySelector('.btn.pri')?.parentElement;
        if(btns) btns.innerHTML = `<button class="btn pri" style="flex:0 0 auto;padding:10px 22px" onclick="CM.exitRehearsal()">Back to the real match</button>
          <button class="btn sec" onclick="CM.ftTab('replay')">Rehearse again</button>`;
        const o = cm.origin.match;
        board.insertAdjacentHTML('afterbegin', `<div class="cm-reh">REHEARSAL — DOESN'T COUNT · the real match ended ${o.score[0]}–${o.score[1]}</div>`);
      }
    }
    // career banner hook at the very top
    const banner = safe(() => TL.hooks.ftBannerHTML ? (TL.hooks.ftBannerHTML(m) || '') : '', '');
    if(banner) wrap.insertAdjacentHTML('afterbegin', `<div class="cm-ftbanner">${banner}</div>`);
    // coach tabs: everything after the board becomes the MATCH STATS pane
    const kids = [...wrap.children];
    const bi = kids.indexOf(board);
    const statsPane = document.createElement('div');
    statsPane.id = 'cmFtStats';
    for(const k of kids.slice(bi + 1)) statsPane.appendChild(k);
    const nav = document.createElement('div');
    nav.innerHTML = ftTabsHTML(cm);
    board.after(nav.firstElementChild);
    const pane = document.createElement('div'); pane.id = 'cmFtPane';
    wrap.appendChild(pane); wrap.appendChild(statsPane);
    statsPane.style.display = cm.ftTab === 'stats' ? '' : 'none';
    pane.style.display = cm.ftTab === 'stats' ? 'none' : '';
    if(cm.ftTab === 'review') pane.innerHTML = reviewHTML(m);
    else if(cm.ftTab === 'lab'){ pane.innerHTML = labHTML(m); if(!cm.lab) runLab(m); }
    else if(cm.ftTab === 'replay') pane.innerHTML = replayHTML(m);
    if(!cm.review && !cm.reviewBusy && !cm.reviewErr) fetchReview(m);
  });
  return r;
};

async function startRehearsal(){
  const m = S.match; if(!m || m.status !== 'ft') return;
  const cm = C(m);
  const at = Math.max(60, Math.min(88 * 60, cm.replayMin * 60));
  const btn = $('.cm-rp-go .btn'); if(btn){ btn.disabled = true; btn.innerHTML = '<i class="cm-spin"></i> Rebuilding the match…'; }
  try{
    const snap = await _api(`/matches/${m.matchId}/branch`, {method: 'POST', body: {at_clock: at}});
    const origin = cm.origin || {match: m, fixture: S.matchFixture, changes: [...(S.changes || [])],
      base: S.base ? JSON.parse(JSON.stringify(S.base)) : null, current: JSON.parse(JSON.stringify(S.current)),
      kickoff: S.matchKickoff};
    const fx = {...origin.fixture, exhibition: true, branchOf: m.matchId, rehearsal: true};
    // board = kickoff lineup, then the engine's state at the branch minute
    if(origin.base) S.current = JSON.parse(JSON.stringify(origin.base));
    const keep = C(origin.match).decisions.filter(d => d.clock <= at);
    TL.startLiveFromSnapshot(snap, fx);
    S.base = origin.base ? JSON.parse(JSON.stringify(origin.base)) : S.base;
    S.changes = origin.changes.filter(c => (c.minute - 1) * 60 <= at);
    const ncm = C(S.match);
    ncm.origin = origin; ncm.decisionsCarried = keep.length;
    ncm.localLines.push({clock: at, type: 'skip', text: `Rehearsal from ${clockStr(at)} — the match so far is exactly as it happened`, local: true});
    const wrap = $('#matchBody'); if(wrap) wrap.dataset.mode = '';
    renderMatch();
    toast(`Rehearsal from ${clockStr(at)} — doesn't count`);
  }catch(e){
    toast('Could not start the rehearsal: ' + e.message);
    if(btn){ btn.disabled = false; btn.textContent = `Start rehearsal from ${cm.replayMin}:00 ▶`; }
  }
}
function restoreOrigin(o){
  clearInterval(matchTimer);
  S.match = o.match; S.matchFixture = o.fixture;
  S.changes = o.changes; S.base = o.base; S.current = o.current; S.matchKickoff = o.kickoff;
  saveState();
  const wrap = $('#matchBody'); if(wrap) wrap.dataset.mode = '';
  show('match');
}
function exitRehearsal(){
  const m = S.match, cm = m && C(m);
  if(!cm || !cm.origin) return;
  const oc = C(cm.origin.match);
  const sc = statsAt(m, presS(m)).score, me = myTeam();
  oc.rehearsals = oc.rehearsals || [];
  oc.rehearsals.push({from: cm.startClock, done: m.status === 'ft', score: m.status === 'ft' ? [m.score[me === 'HOME' ? 0 : 1], m.score[me === 'HOME' ? 1 : 0]] : [sc[me], sc[other(me)]],
    decisions: cm.decisions.length});
  if(m.status !== 'ft' && m.matchId) _api(`/matches/${m.matchId}`, {method: 'DELETE'}).catch(() => {});
  restoreOrigin(cm.origin);
}

/* ── public surface for inline handlers ─────────────────────────────────── */
/* ═══ PAST MATCHES: reopen Review / Decision Lab / Replay from Results ═════ */
async function openPast(fid){
  const f = S.season && S.season.fixtures.find(x => x.id === fid), r = f && S.season.results[fid];
  if(!r || !r.matchId) return toast('No stored analysis for that match.');
  if(isLiveMatch()) return toast('Finish your live match first.');
  if(typeof closeAll === 'function') closeAll();
  let snap;
  try{ snap = await api(`/matches/${r.matchId}`); }catch(e){ return toast('Could not load that match: ' + e.message); }
  if(!snap || !snap.full_time) return toast('That match has no stored full-time record.');
  S.matchFixture = f;
  const m = makeLiveMatch(snap);
  m.status = 'ft'; m.fullTime = snap.full_time; m.pastReview = true;
  m.events = (snap.full_time.events || []).slice(); m.eventIndex = m.events.length;
  S.match = m;
  const cm = C(m);
  Object.assign(cm, {serverFT: true, ftPresented: true, finalizeCalled: true, finalizeDone: true, ftTab: 'review'});
  if(!S.base && S.current) S.base = JSON.parse(JSON.stringify(S.current));
  show('match');
  fetchReview(m);
}
const _openResult = window.openResult;
window.openResult = function(fid){
  const r = _openResult.apply(this, arguments);
  safe(() => {
    const res = S.season.results[fid], foot = $('#drawerFoot');
    if(res && res.matchId && foot && !foot.querySelector('.cm-past'))
      foot.insertAdjacentHTML('afterbegin', `<button class="btn sec cm-past" onclick="CM.openPast('${esc(fid)}')">Review · Decision Lab · Replay →</button>`);
  });
  return r;
};

window.CM = {
  setAutoPause, nextMoment, confirmSimFT, cancelSimFT, simToFT, closeMoment, openPast, toggleCam,
  applyAction,
  resume(){ const m = S.match; closeMoment(); if(m && m.status === 'paused' && !m.htActive) togglePlay(); },
  openTouchline(){ closeMoment(); show('squad'); },
  ftTab(k){ const m = S.match; if(!m) return; C(m).ftTab = k; renderMatch(); window.scrollTo({top: 0}); },
  retryReview(){ const m = S.match; if(!m) return; const cm = C(m); cm.reviewErr = null; cm.review = null; renderMatch(); },
  retryLab(){ const m = S.match; if(!m) return; C(m).lab = null; renderMatch(); },
  setReplay(v){
    const m = S.match; if(!m) return; const cm = C(m);
    cm.replayMin = Math.max(1, Math.min(88, Math.round(Number(v)) || 60));
    const val = $('#cmReplayVal'); if(val) val.textContent = cm.replayMin + ':00';
    const pane = $('#cmFtPane');
    if(pane && cm.ftTab === 'replay'){
      const inp = $('#cmReplayMin'), focused = document.activeElement === inp;
      if(!focused) pane.innerHTML = replayHTML(m);
      else {
        const tl = pane.querySelector('.cm-rp-tl'); if(tl) tl.innerHTML = momentumBlock(m, FULL, {h: 60, full: true, rows: momentumAt(m, FULL), decisions: cm.decisions, sel: cm.replayMin * 60});
        const go = pane.querySelector('.cm-rp-go .btn'); if(go) go.textContent = `Start rehearsal from ${cm.replayMin}:00 ▶`;
        pane.querySelectorAll('.cm-rpchip').forEach(b => b.classList.toggle('on', b.getAttribute('onclick').includes(`(${cm.replayMin})`)));
      }
    }
  },
  pickReplay(ev){
    const plot = ev.currentTarget.querySelector('.cm-momplot') || ev.currentTarget;
    const r = plot.getBoundingClientRect();
    CM.setReplay(Math.round((ev.clientX - r.left) / r.width * 90));
  },
  startRehearsal, exitRehearsal,
  /* test/debug: jump the picture to `to` (server seeks, presentation resumes there) */
  async _jump(to){
    const m = S.match; if(!m || !isLiveMatch()) return;
    await withBusy(m, 'Skipping…', async () => {
      await seekTo(m, to);
      if(to > HALF) m.htShown = true;
      jumpPresentation(m, Math.min(to, m.clockSeconds));
      resumeLive(m);
    });
  },
  _state: () => S.match && C(S.match),
  _presS: () => presS(S.match),
  _stats: () => S.match && statsAt(S.match, presS(S.match))
};

/* Space = pause / resume while watching (never while typing) */
document.addEventListener('keydown', e => {
  if(e.code !== 'Space' || S.ui.view !== 'match' || !S.match || !S.match.matchId) return;
  const t = e.target, tag = t && t.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
  const m = S.match;
  if(m.status === 'ft' || m.htActive || (m._cm && m._cm.busy)) return;
  e.preventDefault();
  if(m.status === 'paused') CM.resume(); else togglePlay();
});

/* post-boot: preferences for old saves */
if(TL.booted) TL.booted.then(() => coachUI()).catch(() => {}); else coachUI();
})();
