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
const GOAL_BEAT_MS = 4200;          // celebration beat before a goal auto-pause (real ms after the banner)
const GOAL_BEAT_SIM = 5.5;          // …or this many presented sim-seconds after the goal (AnimR2 slows the celebration)
const BANNER_WAIT_MS = 1800;        // longest the goal banner waits for the ball to reach the net
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
/* what the user has SEEN: a goal counts (score, feed) once the ball is in the net */
function shownS(m){
  const s = presS(m), cm = m && m._cm;
  const pb = cm && cm.pendingBanners;
  return pb && pb.length ? Math.min(s, pb[0].e.timestamp - 0.001) : s;
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
    S.coachUI = Object.assign({autoPause: 'moments', cam: 'wide', view: 'broadcast', labels: 'numbers'}, saved);
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
const MGMT_RE = /^\/matches\/([^/?]+)\/(tactics|instructions|formation|substitution|card)$/;
window.api = async function(path, opts){
  opts = opts || {};
  if(path === '/matches/start' && (opts.method || 'GET') === 'POST'){
    const x = safe(() => startExtras(opts.body), null);
    const r = await _api.call(this, path, x ? {...opts, body: {...opts.body, ...x}} : opts);
    safe(() => noteStart(r));
    return r;
  }
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
  if(cm.pendingBanners) cm.pendingBanners = cm.pendingBanners.filter(b => b.e.timestamp <= rt);
  if(cm.pendingGoal && cm.pendingGoal.mo.clock > rt) cm.pendingGoal = null;
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
  if(kind === 'card') return cardLabel(body);
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
  for(const e of (opts.cards || [])){
    const gx = (e.timestamp / FULL) * W, up = isMine(e.team_id), d = e.detail || {};
    const y = up ? 11 : H - 11;
    marks += `<g class="cm-mcard ${up ? 'u' : 'd'}"><title>${esc(`${minuteOf(e.timestamp)}' ${up ? 'you play' : sideName(e.team_id) + ' play'} ${d.name || d.card_id || 'a card'}`)}</title><rect x="${gx - 4}" y="${y - 5.5}" width="8" height="11" rx="1.6"/><path d="M${gx + 0.8} ${y - 3.6} L${gx - 1.8} ${y + 0.6} L${gx + 0.2} ${y + 0.6} L${gx - 0.8} ${y + 3.8} L${gx + 1.9} ${y - 0.6} L${gx - 0.1} ${y - 0.6} Z"/></g>`;
  }
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
    case 'CARD_PLAYED': {
      if(mine && ctx && (d.by || 'USER') === 'USER') return null;        // your own play is logged as "Your call"
      const ln = (d.lines || [])[0];
      return L(mine ? 'you card' : 'tac card', `${mine ? 'You play' : side + ' play'} ${d.name || d.card_id || 'a card'}${ln ? ' · ' + ln : ''}`, {card: true});
    }
    case 'CARD_EXPIRED':
      return L('info', `${d.name || d.card_id || 'A card'} wears off${mine ? '' : ` (${side})`}`);
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
  const cm = C(m), s = shownS(m);
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
    <button class="spdbtn cm-simft" ${late ? 'disabled' : ''} onclick="CM.confirmSimFT()" title="Simulate the rest of the match">⏩ Sim to FT</button>
    <span class="cm-sep"></span>${autoPauseSeg()}
    <span class="cm-sep"></span>${viewSegHTML()}`;
}
function ctrlSig(m){
  const cm = C(m), s = presS(m);
  return [m.htActive, m.status, S.ui.matchSpeed || 1, cm.busy, cm.busyLabel, coachUI().autoPause, coachUI().cam, coachUI().bcCam, s >= FULL - 30, viewPref(), labelsPref(), BC.state].join('|');
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
    const reh = f.friendly && !f.branchOf ? `<div class="cm-reh cm-friendly">PRE-SEASON FRIENDLY · NO LEAGUE CONSEQUENCES${f.camp_week ? ` · CAMP WEEK ${esc(String(f.camp_week))}` : ''}</div>`
      : f.run && !f.branchOf ? `<div class="cm-reh cm-friendly">THE RUN · ${esc(String(f.date || '').toUpperCase())}${f.kind === 'elite' ? ' · ELITE' : ''}</div>`
      : f.exhibition ? `<div class="cm-reh">${f.branchOf ? 'REHEARSAL' : 'EXHIBITION'} — DOESN'T COUNT${f.branchOf && cm && cm.origin ? ` · replaying from ${clockStr(cm.startClock)}` : ''}</div>` : '';
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
  const st = statsAt(real, shownS(real));
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
    hm.innerHTML = momentumBlock(real, s, {h: 40, decisions: cm ? cm.decisions : [], cards: cardEvents(real, shownS(real))});
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
    if(pitch && !wrap.querySelector('#cmHand')){
      const hb = document.createElement('div'); hb.id = 'cmHand'; hb.className = 'cm-hand'; hb.style.display = 'none';
      pitch.after(hb);
      const dr = document.createElement('div'); dr.id = 'cmDrawer'; dr.className = 'cm-drawwrap'; dr.style.display = 'none';
      pitch.appendChild(dr);
      CS(m).barSig = '';
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
/* The Run: the match is a handful of decision beats with football in between */
const RUN_BEATS = [30, 60, 80];
function queueMoment(m, mo){
  const cm = C(m), mode = coachUI().autoPause, s = presS(m);
  const forced = (cm.forceAt && Math.abs(cm.forceAt.clock - mo.clock) <= 2) || (mo.beat && mode !== 'off');
  if(forced) cm.forceAt = null;
  const isGoal = mo.kind === 'goal';
  if(!forced){
    if(mode === 'off') return;
    if(mode === 'goals' && !isGoal) return;
    if(!isGoal && (cm.pauses >= PAUSE_CAP || s - cm.lastPauseS < PAUSE_COOLDOWN)) return;
  }
  if(m.htActive || m.status === 'ft' || cm.ftPresented) return;
  if(isGoal){ cm.pendingGoal = {mo, at: performance.now() + GOAL_BEAT_MS, simAt: mo.clock + GOAL_BEAT_SIM}; return; }
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
    if(e.event_type === 'CARD_PLAYED'){ safe(() => presentCardEvent(m, e)); cm.insAt = -1e9; }
    if((e.event_type === 'SHOT' || e.event_type === 'TACKLE') && !lowFx()) safe(() => formPop(m, e));
    if(e.event_type === 'GOAL') setTimeout(() => safe(() => formPop(m, e)), 1800);
    switch(e.event_type){
      case 'GOAL':
        // the banner waits for the picture: it appears once the ball is in the net
        cm.pendingBanners = cm.pendingBanners || [];
        cm.pendingBanners.push({e, t0: performance.now()});
        (cm.goalLog = cm.goalLog || []).push({ts: e.timestamp, seenAt: performance.now(), bannerAt: null, netAt: null, pauseAt: null});
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
  const beats = (S.matchFixture && S.matchFixture.run) ? RUN_BEATS : null;
  for(const w of beats || [60, 75]){
    const c = w * 60, key = 'w' + w;
    if(!cm.fired.has(key) && s >= c && s < c + 30 && cm.startClock < c - 60){
      cm.fired.add(key);
      if(beats) queueMoment(m, {kind: 'window', clock: c, minute: w, beat: true});
      else if(!cm.decisions.length) queueMoment(m, {kind: 'window', clock: c, minute: w});
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
    case 'window': return mo.beat ? `${mo.minute}' — your call` : `${mo.minute}' — your window`;
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
    case 'window': return mo.beat ? `A decision beat. Read the last 15 minutes below, then play a card — or trust the plan and keep your influence.`
      : `No changes yet. The ${mo.minute === 60 ? 'hour mark' : 'last quarter'} is when managers win games — fresh legs, a tweak to the plan, or a vote of confidence.`;
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
  const cards = hasHand(m);
  if(cards) mo.answers = safe(() => answerCards(m, mo), []);
  else if((mo.kind === 'goal' || mo.kind === 'red') && !mo.choice) mo.choice = choiceInsight(m, mo);
  const cm = C(m);
  cm.moment = mo;
  const el = document.createElement('div');
  el.id = 'cmMoment'; el.className = 'cm-modal';
  el.innerHTML = `<div class="cm-mo" role="dialog" aria-label="Touchline moment">
    <div class="cm-mo-k">TOUCHLINE MOMENT · ${minuteOf(presS(m))}'</div>
    <h2 class="cm-mo-t ${mo.kind === 'goal' ? (isMine(mo.event.team_id) ? 'gf' : 'ga') : mo.kind === 'red' ? 'rc' : ''}">${esc(momentTitle(m, mo))}</h2>
    <div class="cm-mo-l">${esc(momentLede(m, mo))}</div>
    ${situationHTML(m)}
    ${cards ? momentCardsHTML(m, mo) : ''}
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
    list = mo.choice ? [mo.choice, ...list.filter(i => i.severity >= 2).slice(0, 1)] : list.slice(0, cards ? 1 : 2);
    const imps = withLabels(m, (I && I.impacts) || []).slice(-1);
    box.innerHTML = (list.length ? list.map(i => insightCard(m, i)).join('')
      : `<div class="cm-empty">${I ? 'No red flags from the assistant — trust the plan, or make your own call on the Touchline.' : 'The assistant is unavailable right now — the Touchline is still yours.'}</div>`)
      + imps.map(im => impactCard(im)).join('');
  };
  pollInsights(m, 'modal').then(I => fill(I || cm.insights));
}
function closeMoment(){ const el = $('#cmMoment'); if(el) el.remove(); if(S.match && S.match._cm){ S.match._cm.moment = null; if(S.match._cm.cs) S.match._cm.cs.barSig = ''; } }

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
      releaseBanners(m, cm);
      if(cm.pendingGoal && m.status === 'live' && goalPauseDue(m, cm)) fireGoalPause(m, cm);
      if(m.status === 'live' && !m.htActive && s - cm.insAt >= INSIGHT_EVERY && s > cm.startClock + 20) pollInsights(m, 'poll');
    }
    if(S.ui.view !== 'match' || m.status === 'ft') return;
    if(!$('#mHeader')) return;
    updateMatchHeader(m);
    updateFeedList(m);
    updateHtPanel(m);
    renderAssistant(m);
    refreshLabels(m);
    renderHandBar(m);
    traitBanner(m);
    scanCombos(m, shownS(m));
    if(performance.now() - cm.lastRatings > 1000){
      cm.lastRatings = performance.now();
      if(m.sideTab === 'ratings') updateRatingsList(m);
      if(m.selPid) updatePlayerPanel(m);
    }
  });
}
setInterval(monitor, 200);
// The goal beat's sim-clock deadline is also checked every animation frame:
// under load a 200 ms interval can fire late and let high-speed play run on.
function releaseBanners(m, cm){
  if(!cm.pendingBanners || !cm.pendingBanners.length) return;
  const now = performance.now(), ln = ANIM2_ON ? AnimR2.lastNet : null;
  while(cm.pendingBanners.length){
    const pb = cm.pendingBanners[0], ts = pb.e.timestamp;
    const inNet = ln && Math.abs(ln.ts - ts) <= 2 && ln.at > (cm.lastNetUsed || 0);
    if(ANIM2_ON && !inNet && now - pb.t0 < BANNER_WAIT_MS) return;
    cm.pendingBanners.shift();
    if(inNet) cm.lastNetUsed = ln.at;
    const gl = (cm.goalLog || []).find(g => g.ts === ts && !g.bannerAt);
    if(gl){ gl.bannerAt = now; gl.netAt = inNet ? ln.at : null; }
    showGoalBanner(m, pb.e);
    if(cm.pendingGoal && cm.pendingGoal.mo.clock === ts) cm.pendingGoal.at = now + GOAL_BEAT_MS;
  }
}
function goalPauseDue(m, cm){
  const g = cm.pendingGoal;
  if(!g || (cm.pendingBanners && cm.pendingBanners.length)) return false;   // never before the ball is in
  return performance.now() >= g.at || presS(m) >= g.simAt;
}
function fireGoalPause(m, cm){
  const g = cm.pendingGoal; cm.pendingGoal = null;
  const gl = (cm.goalLog || []).find(x => x.ts === g.mo.clock && !x.pauseAt); if(gl) gl.pauseAt = performance.now();
  safe(() => doAutoPause(m, g.mo));
}
(function goalBeat(){
  requestAnimationFrame(goalBeat);
  const m = S.match, cm = m && m.matchId ? C(m) : null;
  if(!cm || cm.busy) return;
  safe(() => releaseBanners(m, cm));
  if(!cm.pendingGoal || m.status !== 'live') return;
  if(goalPauseDue(m, cm)) fireGoalPause(m, cm);
})();

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
    const holds = labHolds(m);
    cm.review = await _api(`/matches/${m.matchId}/review?team=${myTeam()}${holds.length ? '&holds=' + encodeURIComponent(JSON.stringify(holds)) : ''}`);
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
    ${momentumBlock(m, FULL, {h: 56, full: true, rows: R.momentum && R.momentum.length ? normMom(R.momentum) : momentumAt(m, FULL), decisions: cm.decisions, cards: cardEvents(m, FULL)})}
    ${safe(() => buildReviewHTML(m, R), '')}
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

/* "Stay the course" calls, tested against the card the manager turned down */
function labHolds(m){ return (m._cm && m._cm.cs && m._cm.cs.holds || []).filter(h => h.alt); }
/* Decision Lab — one decision at a time so results stream in */
async function runLab(m){
  const cm = C(m);
  if(cm.lab && (cm.lab.running || cm.lab.done)) return;
  const cached = labCacheGet(m);
  if(cached && cached.items && cached.items.length){
    cm.lab = {running: false, done: true, items: cached.items, total: cached.total, error: null, next: 0, samples: cached.samples || 16, cached: true};
    if(S.match === m && m.status === 'ft') renderMatch();
    return;
  }
  cm.lab = {running: true, done: false, items: [], total: null, error: null, next: 0, samples: 16};
  const L = cm.lab;
  const rerender = () => {
    if(S.match !== m || m.status !== 'ft') return;
    if(cm.ftTab === 'lab') renderLabPane(m);
    else if(cm.ftTab === 'review' && cm.review){ const el = $('#cmFtPane'); if(el) el.innerHTML = reviewHTML(m); }
  };
  rerender();
  try{
    for(let i = 0; i < 12; i++){
      L.next = i;
      rerender();
      let r;
      try{
        const holds = labHolds(m);
        r = await _api(`/matches/${m.matchId}/decision-lab`, {method: 'POST', body: {team: myTeam(), samples: 16, index: i, ...(holds.length ? {holds} : {})}});
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
  if(!L.error && L.items.length) labCachePut(m, L);
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
    if(m.pastReview){                     // reopened from Results: analysis only
      const ban = wrap.querySelector('#ccFt'); if(ban) ban.remove();
      wrap.querySelectorAll('button[onclick^="continueSeason"]').forEach(b => {
        b.textContent = '← Back to results'; b.setAttribute('onclick', "S.match=null;S.matchFixture=null;show('results')"); });
    }
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

/* ═══ 9. BROADCAST VIEW (perspective renderer in an iframe) ════════════════
   /sandbox/visual/match.html?embed=1 exposes window.TouchlineBroadcast. It is a
   pure VIEW: it receives the same frame rows AnimR2 ingests and is driven by
   AnimR2's presentation clock every animation frame. AnimR2 keeps running
   underneath (it owns the clock, event queue and every coach feature); only its
   drawing is skipped while the broadcast picture is on screen. Nothing here
   talks to the engine — outcomes are identical whichever view is chosen.
   Weather is presentation only (hash of the fixture id), never sent anywhere. */
const BC_SRC = '/sandbox/visual/match.html?embed=1';
const BC_LOAD_TIMEOUT = 15000;                // .ready never rejects: our own deadline decides the fallback
const BC_FPS_LOW = 40;                        // measured fps under this (twice running) → quality 'low'
const BC = {el: null, api: null, state: 'idle', key: null, actNames: null, visible: null, warned: false,
            optSig: '', plSig: '', numbers: {}, fpsAt: 0, fpsBad: 0, lowFps: false, lowFpsSpeed: null, loadSerial: 0, lastClock: null, clockLog: null};
const bcOn = () => ANIM2_ON;                                   // the broadcast follows AnimR2's clock
function viewPref(){ return coachUI().view === 'tactical' ? 'tactical' : 'broadcast'; }
function labelsPref(){ const l = coachUI().labels; return ['off', 'numbers', 'names'].includes(l) ? l : 'numbers'; }
function bcWanted(){ return bcOn() && viewPref() === 'broadcast' && BC.state !== 'failed'; }
function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(S.coachUI)); }catch(e){} }

/* ── weather per fixture: deterministic, presentation only ── */
function weatherFor(f){
  const id = String((f && (f.id || f.fixture_id)) || (S.match && S.match.matchId) || '').replace(/#branch$/, '');
  const h = a2hash('touchline-weather|' + id) % 100;
  return h < 25 ? 'rain' : h < 40 ? 'light' : 'off';
}
const WX_LABEL = {rain: 'Rain', light: 'Light rain', off: 'Dry'};
const WX_ICON = {rain: '🌧', light: '🌦', off: '☀'};
function forecastHTML(f){
  const w = weatherFor(f);
  return `<span class="cm-fc" data-wx="${w}" title="Presentation only — the weather never changes the football">${WX_ICON[w]} Forecast: ${esc(WX_LABEL[w].toLowerCase())}</span>`;
}

/* ── kits: club colour from CLUBS + a small kit table; guaranteed contrast ── */
const KITS = {
  ARS: {p: '#ef0107', s: '#ffffff', alt: '#1f2a44', altS: '#e8c35a'}, AVL: {p: '#670e36', s: '#95bfe5', alt: '#ffffff', altS: '#670e36'},
  BOU: {p: '#da291c', s: '#111111', alt: '#ffffff', altS: '#da291c'}, BRE: {p: '#e30613', s: '#ffffff', alt: '#10263b', altS: '#ffd200'},
  BHA: {p: '#0057b8', s: '#ffffff', alt: '#ffd100', altS: '#0057b8'}, BUR: {p: '#6c1d45', s: '#99d6ea', alt: '#ffffff', altS: '#6c1d45'},
  CHE: {p: '#034694', s: '#ffffff', alt: '#f2f2f2', altS: '#034694'}, CRY: {p: '#1b458f', s: '#c4122e', alt: '#ffffff', altS: '#1b458f'},
  EVE: {p: '#003399', s: '#ffffff', alt: '#f4f4f4', altS: '#003399'}, FUL: {p: '#f5f5f5', s: '#111111', alt: '#c8102e', altS: '#ffffff'},
  LEE: {p: '#f7f7f7', s: '#1d428a', alt: '#1d428a', altS: '#ffcd00'}, LIV: {p: '#c8102e', s: '#ffffff', alt: '#f2f2f2', altS: '#c8102e'},
  MCI: {p: '#6cabdd', s: '#ffffff', alt: '#1c2c5b', altS: '#6cabdd'}, MUN: {p: '#da291c', s: '#ffffff', alt: '#f4f4f4', altS: '#111111'},
  NEW: {p: '#241f20', s: '#ffffff', alt: '#8ecae6', altS: '#241f20'}, NFO: {p: '#dd0000', s: '#ffffff', alt: '#f4f4f4', altS: '#dd0000'},
  SUN: {p: '#eb172b', s: '#ffffff', alt: '#0d1b3e', altS: '#ffffff'}, TOT: {p: '#f7f7f7', s: '#132257', alt: '#132257', altS: '#ffffff'},
  WHU: {p: '#7a263a', s: '#1bb1e7', alt: '#f4f4f4', altS: '#7a263a'}, WOL: {p: '#fdb913', s: '#231f20', alt: '#231f20', altS: '#fdb913'}
};
const GK_PALETTE = ['#f3e21b', '#27c46a', '#ff8a1f', '#b04fd6', '#19c6d8', '#1a1a1a', '#f06bb4', '#ffffff'];
const KIT_MIN_DE = 40;        // CIE76 ΔE under which two shirts read as "the same team" on a TV picture
function hexLab(hex){
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = lin(n >> 16 & 255), g = lin(n >> 8 & 255), b = lin(n & 255);
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + b * 0.0722),
        z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function deltaE(a, b){ const A = hexLab(a), B = hexLab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
function kitOf(id){
  const k = KITS[id], c = clubById(id);
  return k || {p: (c && c.color) || '#888888', s: '#ffffff', alt: '#f4f4f4', altS: (c && c.color) || '#333333'};
}
function kitsFor(homeId, awayId){
  const H = kitOf(homeId), A = kitOf(awayId);
  const home = {primary: H.p, secondary: H.s};
  const cands = [[A.p, A.s], [A.alt, A.altS], ['#f4f4f4', '#222222'], ['#1a1a1a', '#ffffff'], ['#f3e21b', '#111111']];
  let away = cands.find(([p]) => deltaE(p, home.primary) >= KIT_MIN_DE);
  if(!away) away = cands.slice().sort((x, y) => deltaE(y[0], home.primary) - deltaE(x[0], home.primary))[0];
  const aw = {primary: away[0], secondary: away[1]};
  const far = (c, from) => from.every(o => deltaE(c, o) >= KIT_MIN_DE);
  const outfield = [home.primary, aw.primary];
  const gkH = GK_PALETTE.find(c => far(c, outfield)) || '#1a1a1a';
  const gkA = GK_PALETTE.find(c => c !== gkH && far(c, [...outfield, gkH])) || GK_PALETTE.find(c => c !== gkH && far(c, outfield)) || '#27c46a';
  home.gk = gkH; aw.gk = gkA;
  return {home, away: aw};
}

/* ── shirt numbers: stable per club from the squad order (the app has none) ── */
const NUM_PREF = {GK: [1, 13, 31, 25, 40], RB: [2, 22, 24, 12], LB: [3, 21, 26, 33], CB: [4, 5, 6, 15, 16, 23, 32, 35],
  CDM: [6, 16, 14, 18], CM: [8, 14, 17, 18, 20], CAM: [10, 20, 19], RM: [7, 17, 27], LM: [11, 26, 29],
  RW: [7, 17, 27, 47], LW: [11, 19, 29], ST: [9, 19, 18, 14, 27]};
function squadNumbers(clubId){
  if(BC.numbers[clubId]) return BC.numbers[clubId];
  const map = {}, used = new Set();
  const squad = safe(() => playersForClub(clubId), []) || [];
  const order = [...squad.filter(p => p.pos === 'GK'), ...squad.filter(p => p.pos !== 'GK')];
  for(const p of order){
    const n = (NUM_PREF[p.pos] || []).find(x => !used.has(x));
    if(n){ map[p.id] = n; used.add(n); }
  }
  let next = 12;
  for(const p of order) if(!map[p.id]){ while(used.has(next)) next++; map[p.id] = next; used.add(next); }
  map._next = () => { while(used.has(next)) next++; used.add(next); return next; };
  return (BC.numbers[clubId] = map);
}
function shirtNo(pid, clubId){
  const map = squadNumbers(clubId || '_');
  if(!map[pid]) map[pid] = map._next();
  return map[pid];
}

/* ── the players map (names, numbers, team, position; GK marked) ── */
function bcPlayers(snapPlayers, roster){
  const f = S.matchFixture || {}, out = {};
  const sp = snapPlayers || {};
  const ids = new Set([...(roster || []), ...Object.keys(sp)]);
  for(const pid of ids){
    const s = sp[pid], pl = P(pid);
    const team = (s && s.team) || (pl && pl.clubId ? (pl.clubId === f.home ? 'HOME' : pl.clubId === f.away ? 'AWAY' : null) : null);
    if(!team) continue;
    const club = team === 'HOME' ? f.home : f.away;
    const name = (s && s.name) || (pl && pl.name) || pid;
    const pos = (s && s.slot) || (pl && pl.pos) || '';
    out[pid] = {name, short_name: shortName(String(name)), team, number: shirtNo(pid, club),
                position: pos === 'GK' || (pl && pl.pos === 'GK' && !s) ? 'GK' : pos};
  }
  return out;
}
function bcMeta(snap){
  const f = S.matchFixture || {};
  const c = id => clubById(id) || {name: id || '', abbreviation: id || ''};
  const kits = kitsFor(f.home, f.away);
  const roster = (snap && snap.roster) || AnimR2.roster || [];
  return {
    home: {name: clubName(f.home), short: c(f.home).abbreviation || f.home, kit: kits.home},
    away: {name: clubName(f.away), short: c(f.away).abbreviation || f.away, kit: kits.away},
    players: bcPlayers(snap && snap.players, roster), roster: roster.slice(),
    act_names: (snap && snap.act_names) || BC.actNames || [], weather: weatherFor(f), flip: AnimR2.flip()
  };
}

/* ── lifecycle: create once, keep alive across screens (moved, never reloaded) ── */
function bcPark(){
  let p = $('#cmBcPark');
  if(!p){ p = document.createElement('div'); p.id = 'cmBcPark'; p.setAttribute('aria-hidden', 'true'); document.body.appendChild(p); }
  return p;
}
function bcMove(el, parent){
  if(!el || !parent || el.parentNode === parent) return;
  if(typeof parent.moveBefore === 'function' && el.isConnected && parent.isConnected){
    try{ parent.moveBefore(el, null); return; }catch(e){}
  }
  parent.appendChild(el);                                   // older browsers: the iframe reloads (handled)
}
function bcFail(reason){
  if(BC.state === 'failed') return;
  BC.state = 'failed'; BC.api = null; BC.visible = null;
  if(!BC.warned){ BC.warned = true; console.warn('[coach-match] broadcast view unavailable — using the tactical view:', reason); }
  if(BC.el){ BC.el.remove(); BC.el = null; }
  const pitch = $('#livePitch'); if(pitch) pitch.classList.remove('cm-bc', 'cm-bcload');
  refreshControls(true);
}
function bcCreate(){
  const f = document.createElement('iframe');
  f.id = 'cmBroadcast'; f.className = 'cm-bcframe'; f.title = 'Broadcast match view';
  f.setAttribute('allow', 'autoplay'); f.setAttribute('tabindex', '-1');
  f.addEventListener('load', () => bcOnLoad(f));
  f.addEventListener('error', () => bcFail('iframe error'));
  f.src = BC_SRC;
  BC.el = f; BC.state = 'loading'; BC.api = null;
  const serial = ++BC.loadSerial;
  setTimeout(() => { if(BC.loadSerial === serial && BC.state === 'loading') bcFail('timed out loading ' + BC_SRC); }, BC_LOAD_TIMEOUT);
  return f;
}
async function bcOnLoad(f){
  if(f !== BC.el) return;
  const serial = ++BC.loadSerial;
  BC.state = 'loading'; BC.api = null; BC.visible = null; BC.key = null; BC.optSig = ''; BC.plSig = '';
  const t0 = performance.now();
  let api = null;
  while(performance.now() - t0 < 6000){
    try{ api = f.contentWindow && f.contentWindow.TouchlineBroadcast; }catch(e){ return bcFail('cross-origin frame'); }
    if(api) break;
    await sleep(50);
    if(serial !== BC.loadSerial) return;
  }
  if(!api) return bcFail('TouchlineBroadcast not found');
  try{
    await Promise.race([Promise.resolve(api.ready), sleep(BC_LOAD_TIMEOUT).then(() => { throw new Error('ready timed out'); })]);
  }catch(e){ return bcFail(e && e.message || String(e)); }
  if(serial !== BC.loadSerial || f !== BC.el) return;
  BC.api = api; BC.state = 'ready';
  try{
    api.onPlayerClick = pid => bcPlayerClick(pid);
    // the picture swallows key events (embed mode); hand focus straight back to the
    // app after a click so Space = pause and the other shortcuts keep working
    f.contentWindow.addEventListener('pointerup', () => setTimeout(() => {
      try{ if(document.activeElement === f){ f.blur(); window.focus(); } }catch(e){}
    }, 0), true);
  }catch(e){}
  bcPush();
  refreshControls(true);
}
/* call a contract method; any exception degrades to the tactical view, never breaks the match */
function bcCall(fn, ...args){
  const api = BC.api; if(!api || BC.state !== 'ready') return;
  try{ return api[fn](...args); }catch(e){ bcFail(`${fn}() threw: ${e && e.message || e}`); }
}
/* full re-sync: (re)init for the current match, then hand over AnimR2's buffer —
   the equivalent of replaying every call queued before .ready resolved */
function bcPush(){
  const m = S.match; if(!m || !m.matchId || BC.state !== 'ready') return;
  const meta = bcMeta(Object.assign({}, m.snap, {roster: AnimR2.roster || (m.snap && m.snap.roster)}));
  bcCall('init', meta);
  BC.key = m.matchId; BC.rosterN = meta.roster.length; BC.plSig = ''; BC.optSig = ''; BC.visible = null; BC.lowFpsSpeed = null;
  const F = AnimR2.frames;
  bcCall('reset', F.length ? F[0][0] - 1 : AnimR2.S);
  if(F.length) bcCall('ingest', F.slice(), AnimR2.roster);
}
/* ensure the iframe exists (only when Broadcast is wanted) and sits in the live pitch */
function bcAttach(){
  if(!bcOn()) return;
  const pitch = $('#livePitch');
  const want = bcWanted() && pitch && S.match && $('#matchBody') && $('#matchBody').dataset.mode === 'live';
  if(!want){ if(BC.el) bcMove(BC.el, bcPark()); return; }
  if(!BC.el) pitch.appendChild(bcCreate());
  else bcMove(BC.el, pitch);
}

/* ── feed: every frames batch that reaches AnimR2 also reaches the broadcast ── */
AnimR2.ingest = (function(orig){
  return function(snap){
    const had = this.frames.length, last = this.bufferedUntil();
    const r = orig.apply(this, arguments);
    safe(() => {
      if(!snap || !snap.frames || !snap.frames.length || !ANIM2_ON) return;
      if(snap.act_names) BC.actNames = snap.act_names;
      if(BC.state !== 'ready') return;                       // bcPush() hands over the buffer on ready
      const mid = snap.match_id || (S.match && S.match.matchId);
      if(mid && mid !== BC.key){                             // a new match (kickoff, rehearsal, scenario)
        const meta = bcMeta(snap);
        bcCall('init', meta); BC.key = mid; BC.plSig = ''; BC.optSig = ''; BC.visible = null; BC.rosterN = meta.roster.length; BC.lowFpsSpeed = null;
        bcCall('reset', snap.frames[0][0] - 1);
      }
      const roster = snap.roster || this.roster;
      if(roster && roster.length !== BC.rosterN){             // bench players arrive with the first roster
        BC.rosterN = roster.length;
        bcCall('setPlayers', bcPlayers((S.match && S.match.snap && S.match.snap.players) || snap.players, roster));
      }
      const rows = had ? snap.frames.filter(f => f[0] > last) : snap.frames;
      if(rows.length) bcCall('ingest', rows, roster);
    });
    return r;
  };
})(AnimR2.ingest);
/* …and every rewind / seek / branch / restart resets it */
AnimR2.reset = (function(orig){
  return function(clock){
    const r = orig.apply(this, arguments);
    if(BC.state === 'ready') safe(() => bcCall('reset', clock));
    return r;
  };
})(AnimR2.reset);
/* AnimR2 keeps stepping (clock, events, pacing); only its drawing is skipped under the broadcast */
AnimR2.draw = (function(orig){
  return function(){ if(BC.visible) return; return orig.apply(this, arguments); };
})(AnimR2.draw);

/* ── overlays: highlights (assistant flags + selected player), labels, weather ── */
function bcHighlight(m){
  const cm = C(m), out = [];
  for(const i of (cm.insights && cm.insights.insights) || []){
    const mm = /^(?:fatigue|card):([^:]+)/.exec(String(i.id || ''));
    if(mm && (i.kind === 'fatigue' || i.kind === 'card_risk')) out.push(mm[1]);
  }
  if(m.selPid) out.push(m.selPid);
  return [...new Set(out)];
}
function bcPlayerClick(pid){
  const m = S.match; if(!m || !pid) return;
  const known = (m.snap && m.snap.players && m.snap.players[pid]) || P(pid);
  if(!known) return;
  if(typeof selectLivePlayer === 'function') selectLivePlayer(pid);
  else { m.selPid = pid; updatePlayerPanel(m); }
  BC.optSig = '';
}

/* ── per-frame driver: only while a live match is on screen ── */
function bcFrame(){
  requestAnimationFrame(bcFrame);
  if(!bcOn() || !BC.el) return;
  try{
    const m = S.match, pitch = $('#livePitch');
    const onScreen = !!(m && m.matchId && S.ui.view === 'match' && pitch && BC.el.parentNode === pitch
                        && m.status !== 'ft' && $('#matchBody').dataset.mode === 'live');
    const vis = onScreen && bcWanted() && BC.state === 'ready';
    if(pitch){
      pitch.classList.toggle('cm-bc', vis);
      pitch.classList.toggle('cm-bcload', onScreen && bcWanted() && BC.state === 'loading');
    }
    if(BC.state !== 'ready') return;
    if(vis && m.matchId !== BC.key) bcPush();
    if(vis !== BC.visible){ BC.visible = vis; bcCall('setOptions', {visible: vis}); }
    if(!vis) return;
    const cm = C(m);
    const paused = (m.status === 'paused' && !m.htActive) || m.status === 'reconnecting' || cm.freeze > 0 || cm.busy;
    const playing = !paused && AnimR2.S < AnimR2.bufferedUntil() + 0.5;
    const speed = S.ui.matchSpeed || 1;
    BC.lastClock = {S: AnimR2.S, playing, speed, t: performance.now()};
    if(BC.clockLog){ BC.clockLog.push(AnimR2.S); if(BC.clockLog.length > 600) BC.clockLog.shift(); }
    bcCall('setClock', AnimR2.S, {playing, speed});
    // POSE FEED: the picture shows AnimR2's choreographed state (ball flights into
    // the net, keeper dives, capped pursuit), so both views show the same play and
    // the last frame stays up through every pause, rewind and refill
    const pose = bcPose();
    if(pose) bcCall('setPose', pose);
    // cheap signature checks for options / roster metadata
    const pp = presentedSnap(m, presS(m)).players || {};
    const plSig = Object.keys(pp).map(k => k + (pp[k].slot || '') + (pp[k].active ? 1 : 0)).join('|');
    if(plSig !== BC.plSig){
      const first = !BC.plSig; BC.plSig = plSig;
      if(!first) bcCall('setPlayers', bcPlayers(pp, AnimR2.roster));
    }
    // quality: 'low' at 4x+ or when the measured frame rate sags (sticky until the speed changes)
    if(BC.lowFpsSpeed !== speed){ BC.lowFps = false; BC.fpsBad = 0; BC.lowFpsSpeed = speed; BC.fpsAt = performance.now() + 2500; }
    if(!BC.lowFps && performance.now() > BC.fpsAt){
      BC.fpsAt = performance.now() + 2000;
      const st = BC.api && typeof BC.api.stats === 'function' ? safe(() => BC.api.stats(), null) : null;
      if(st && st.fps > 0 && st.fps < BC_FPS_LOW){ if(++BC.fpsBad >= 2) BC.lowFps = true; } else BC.fpsBad = 0;
    }
    const hl = bcHighlight(m);
    refreshLabels(m);
    const opt = {labels: labelsPref(), highlight: [...new Set([...hl, ...LBL.hi])], weather: weatherFor(S.matchFixture),
                 quality: speed >= 4 || BC.lowFps ? 'low' : 'high', fatigue: LBL.fat, camera: bcCamPref(), flip: AnimR2.flip()};
    const sig = JSON.stringify(opt);
    if(sig !== BC.optSig){ BC.optSig = sig; bcCall('setOptions', opt); }
  }catch(e){ console.warn('[coach-match] broadcast frame', e); }
}
requestAnimationFrame(bcFrame);

function bcPose(){
  const P = AnimR2.players, pl = [];
  for(const pid in P){
    const p = P[pid];
    if(!p || !p.team) continue;
    pl.push({pid, x: p.x, y: p.y, vx: p.vx, vy: p.vy, active: p.active !== 0 && p.active !== false, face: p.face,
             pose: p.pose, poseU: p.poseDur ? Math.min(1, p.poseT / p.poseDur) : 1, poseTx: p.poseTx, poseTy: p.poseTy});
  }
  if(!pl.length) return null;
  const b = AnimR2.ball;
  // celebration: once the ball is in, the camera follows the scorer to the corner
  const g = AnimR2.goalSeq, cel = AnimR2.celebrate, sc = g && g.netAt && cel && P[g.scorer];
  const focus = sc && performance.now() - g.netAt > 700 && AnimR2.S < cel.until ? {x: (sc.x * 2 + g.gx) / 3, y: sc.y} : null;
  return {ball: {x: b.x, y: b.y, z: b.z || 0, state: b.state}, players: pl, carrier: b.holder || null, flip: AnimR2.flip(), focus};
}

/* ── shared presentation state for BOTH views: kits, label chips, fatigue ──
   refreshed a few times a second from the presented snapshot (never the prefetch) */
const LBL = {at: 0, key: null, energy: {}, fat: {}, hi: new Set(), mode: 'numbers', kits: null, sig: ''};
const FATIGUE_WARN = 40, FATIGUE_BAD = 25;            // energy under which a label turns orange / red
function hexRGB(h){ const n = parseInt(String(h).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(h, k){ const [r, g, b] = hexRGB(h); const f = x => Math.max(0, Math.min(255, Math.round(x * k))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
function lumOf(h){ const [r, g, b] = hexRGB(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
function refreshLabels(m){
  const now = performance.now();
  if(now - LBL.at < 250 && LBL.key === m.matchId) return;
  LBL.at = now;
  const f = S.matchFixture || {};
  if(LBL.key !== m.matchId || !LBL.kits){
    const k = kitsFor(f.home, f.away);
    const mk = t => ({shirt: t.primary, shirt2: shade(t.primary, 0.78), shorts: t.secondary, gk: t.gk});
    LBL.kits = {HOME: mk(k.home), AWAY: mk(k.away)};
    LBL.key = m.matchId;
  }
  AnimR2.kits = LBL.kits;
  LBL.mode = labelsPref();
  const pp = presentedSnap(m, presS(m)).players || {};
  const fat = {};
  for(const pid in pp){
    const e = Number(pp[pid].energy);
    LBL.energy[pid] = e;
    if(pp[pid].active !== false && isFinite(e)) { if(e < FATIGUE_BAD) fat[pid] = 2; else if(e < FATIGUE_WARN) fat[pid] = 1; }
  }
  LBL.fat = fat;
  LBL.slot = pp;
  LBL.hi = new Set([...bcHighlight(m), ...((FX.glow && performance.now() < FX.until) ? FX.glow : [])]);
}
const FAT_COL = {1: {bg: '#ff9f1a', fg: '#1a1206', edge: 'rgba(0,0,0,.55)'}, 2: {bg: '#ff4d4d', fg: '#ffffff', edge: 'rgba(255,255,255,.6)'}};
AnimR2.labelFor = function(pid, p){
  if(LBL.mode === 'off') return null;
  const sp = (LBL.slot || {})[pid] || {};
  const f = S.matchFixture || {};
  const club = p.team === 'HOME' ? f.home : f.away;
  const text = LBL.mode === 'names' ? short(p.name || sp.name || pid) : String(shirtNo(pid, club));
  const K = LBL.kits && LBL.kits[p.team];
  const col = K ? (sp.slot === 'GK' ? K.gk : K.shirt) : '#555c66';
  const fz = LBL.fat[pid];
  const light = lumOf(col) > 0.55;
  const c = fz ? FAT_COL[fz] : {bg: col, fg: light ? '#10151b' : '#ffffff', edge: light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.55)'};
  return {text, bg: c.bg, fg: c.fg, edge: c.edge, hi: LBL.hi.has(pid), carrier: AnimR2.ball.holder === pid};
};

/* ── view switch + labels ── */
function setView(v){
  if(v !== 'broadcast' && v !== 'tactical') return;
  coachUI().view = v; savePrefs();
  if(v === 'tactical'){                                   // switch synchronously: AnimR2 draws this very frame
    const pitch = $('#livePitch'); if(pitch) pitch.classList.remove('cm-bc', 'cm-bcload');
    if(BC.state === 'ready'){ BC.visible = false; bcCall('setOptions', {visible: false}); }
  }
  if(v === 'broadcast' && BC.state === 'failed') toast('The broadcast view is unavailable here — staying on the tactical view.');
  bcAttach();
  if(v === 'tactical') applyCam();
  refreshControls(true);
}
function bcCamPref(){ return coachUI().bcCam === 'wide' ? 'wide' : 'tv'; }
function setBcCam(c){ coachUI().bcCam = c === 'wide' ? 'wide' : 'tv'; savePrefs(); BC.optSig = ''; refreshControls(true); }
function setLabels(l){
  if(!['off', 'numbers', 'names'].includes(l)) return;
  coachUI().labels = l; savePrefs(); BC.optSig = '';
  refreshControls(true);
}
function viewSegHTML(){
  if(!bcOn()) return `<button class="spdbtn cm-cam" onclick="CM.toggleCam()" title="Wide shows the whole shape; Follow tracks the ball">${coachUI().cam === 'follow' ? '🎥 Follow' : '🗺 Wide'}</button>`;
  const v = viewPref(), failed = BC.state === 'failed';
  const bc = v === 'broadcast' && !failed;
  const seg = `<span class="cm-apseg cm-viewseg" title="Broadcast: the TV picture · Tactical: the coach's 2D board"><em>VIEW</em>`
    + `<button class="${bc ? 'on' : ''}" data-view="broadcast" ${failed ? 'disabled title="Broadcast view unavailable"' : ''} onclick="CM.setView('broadcast')">Broadcast</button>`
    + `<button class="${bc ? '' : 'on'}" data-view="tactical" onclick="CM.setView('tactical')">Tactical</button></span>`;
  const l = labelsPref();
  const lbl = `<span class="cm-apseg cm-lblseg" title="Player labels (team-coloured; orange/red = tiring)"><em>LABELS</em>${
      [['off', 'Off'], ['numbers', 'No.'], ['names', 'Names']].map(([k, t]) =>
        `<button class="${l === k ? 'on' : ''}" data-lbl="${k}" onclick="CM.setLabels('${k}')">${t}</button>`).join('')}</span>`;
  if(bc){
    const c = bcCamPref();
    return seg + lbl + `<button class="spdbtn cm-cam cm-bccam" onclick="CM.setBcCam('${c === 'wide' ? 'tv' : 'wide'}')" title="TV follows the ball; Wide pulls back to show the shape">${c === 'wide' ? '🗺 Wide' : '📺 TV'}</button>`;
  }
  return seg + lbl + `<button class="spdbtn cm-cam" onclick="CM.toggleCam()" title="Wide shows the whole shape; Follow tracks the ball">${coachUI().cam === 'follow' ? '🎥 Follow' : '🗺 Wide'}</button>`;
}

/* keep the iframe alive across every re-render of the match screen: park it
   before renderMatch rewrites #matchBody, put it back into the new pitch after.
   Installed post-boot so it is the OUTERMOST renderMatch wrapper. */
function bcInstallOuter(){
  const inner = window.renderMatch;
  window.renderMatch = function(){
    if(BC.el && BC.el.parentNode && BC.el.parentNode.id !== 'cmBcPark') bcMove(BC.el, bcPark());
    const r = inner.apply(this, arguments);
    safe(() => {
      bcAttach();
      const wrap = $('#matchBody');
      // the plain (non-career) pre-match board gets the forecast line too
      if(wrap && wrap.dataset.mode === 'pre' && S.matchFixture && !S.match && !wrap.querySelector('.cm-fc')){
        const board = wrap.querySelector('.board');
        const k = board && board.firstElementChild;
        if(k) k.insertAdjacentHTML('beforeend', ' · ' + forecastHTML(S.matchFixture));
      }
    });
    return r;
  };
  const pre = TL.hooks.prematchHTML;
  if(typeof pre === 'function' && !pre._cmWx){
    TL.hooks.prematchHTML = function(f){
      const html = pre.apply(this, arguments);
      return safe(() => String(html).replace(/(<div class="cc-kicker">[\s\S]*?)(<\/div>)/, `$1 · ${forecastHTML(f)}$2`), html);
    };
    TL.hooks.prematchHTML._cmWx = true;
  }
}

/* ═══ 10. TACTIC CARDS (v2 §6.1–6.2, §6.6): hand bar, influence, moments ════
   Contract: docs/v2_progress/build-core.md §7–9. The UI never compiles a card —
   the server does (at the presented second, via the same rewind path as every
   decision). Everything the hand bar shows is derived from the ledger up to the
   PRESENTED clock (CARD_PLAYED / goals / half time), refined by the server's
   `/cards?at=` read when it is available. Matches started without a build (old
   saves, scenarios) have no hand: the bar hides and moments keep the classic
   one-click answers. */
const CARDS = {catalog: null, catP: null, starts: {}, previews: new Map(), prevBusy: new Set()};
const TYPE_CLS = {'SHAPE': 'shape', 'INSTRUCTION': 'instr', 'PLAYER ORDER': 'order', 'SET PIECE': 'setp', 'SUB': 'sub', 'REACTION': 'react', 'STANCE': 'stance'};
const TRIGGER_TEXT = {conceded: 'after you concede', opp_red: 'after an opponent is sent off', level_70: "from 70' with the scores level",
  behind_60: "when behind from 60'", ahead_75: "when ahead from 75'"};
const KW_HELP = {Exhaust: 'Once per match.', Upgrade: 'Training can improve this card (2 TP).',
  Fatigue: 'The affected players lose this much energy.', Combo: 'Needs that partnership on the pitch; stronger at Lv2/Lv3.',
  Trigger: 'A reaction: only playable after the trigger.', Target: 'You choose the player.'};
/* optional routes are probed once through the OpenAPI list (no console 404s on older servers) */
const ROUTE_TPL = {catalog: '/build/catalog', preview: '/build/preview', cardsAt: '/matches/{match_id}/cards', analyst: '/analyst/test',
  ghostToday: '/ghost/today', ghostRun: '/ghost/run', ghostLb: '/ghost/leaderboard'};
CARDS.routes = null;
function probeRoutes(){
  if(CARDS.routesP) return CARDS.routesP;
  CARDS.routesP = (async () => {
    const out = {};
    for(const [k, tpl] of Object.entries(ROUTE_TPL)) out[k] = window.CC && CC.hasRoute ? await CC.hasRoute(tpl).catch(() => false) : true;
    CARDS.routes = out;
    if(!out.preview) CARDS.noPreview = true;
    if(!out.cardsAt) CARDS.noCardsAt = true;
    return out;
  })();
  return CARDS.routesP;
}
function catalog(){
  if(CARDS.catalog) return Promise.resolve(CARDS.catalog);
  if(!CARDS.catP) CARDS.catP = (async () => {
    const tb = TL.build;
    if(tb && typeof tb.catalog === 'function'){ const c = await Promise.resolve(tb.catalog()); if(c && c.cards) return (CARDS.catalog = c); }
    if(tb && tb.ready){ const c = await tb.ready; if(c && c.cards) return (CARDS.catalog = c); }
    const R = await probeRoutes();
    if(!R.catalog) return null;
    return (CARDS.catalog = await _api('/build/catalog'));
  })().catch(() => null);
  return CARDS.catP;
}
function catCard(id){ const c = CARDS.catalog; return (c && (c.cards || []).find(x => x.id === id)) || null; }
function buildState(){ return safe(() => (TL.build && typeof TL.build.state === 'function') ? TL.build.state() : (S.career && S.career.build) || null, null); }
function prepFor(fid){ const u = coachUI(); u.prep = u.prep || {}; return fid ? (u.prep[fid] = u.prep[fid] || {}) : {}; }
function defaultHand(bs){
  const deck = (bs && bs.deck) || [];
  const size = (CARDS.catalog && CARDS.catalog.constants && CARDS.catalog.constants.hand_size) || 5;
  return deck.filter(id => { const c = catCard(id); return !c || c.available !== false; }).slice(0, size);
}

/* ── kick-off: inject the build (+ the picked hand) and the CPU's build into /matches/start ── */
function startExtras(body){
  if(!body || body.scenario_id || body.build || !S.matchFixture) return null;
  const bs = buildState(); if(!bs || !bs.system_id) return null;
  const f = S.matchFixture, prep = prepFor(f.id);
  const kb = safe(() => TL.build.kickoffBuild ? TL.build.kickoffBuild() : null, null) || {
    system_id: bs.system_id, partnerships: bs.partnerships || [], familiarity: bs.familiarity || {},
    set_pieces: bs.set_pieces || {}, upgrades: bs.upgrades || {}, custom_system: bs.custom_system};
  const build = {...kb, hand: (prep.hand && prep.hand.length ? prep.hand : defaultHand(bs)).slice()};
  if(prep.set_pieces) build.set_pieces = {...(build.set_pieces || {}), ...prep.set_pieces};
  const oppClub = f.home === 'LIV' ? f.away : f.home;
  const cpu = safe(() => TL.build.cpuBuildFor ? TL.build.cpuBuildFor(oppClub) : null, null);
  const out = {build, build_team: myTeam()};
  if(cpu) out.cpu_build = cpu;
  return out;
}
function noteStart(r){
  if(!r || !r.match_id) return;
  CARDS.starts[r.match_id] = {hand: r.hand || null, traits: r.active_traits || [], cards: r.cards || null,
                               fit: r.system_fit ?? null, kickoff: r.kickoff_modifiers || null, build: JSON.parse(JSON.stringify(buildState() || {}))};
}

/* ── per-match card state ── */
function CS(m){
  const cm = C(m);
  if(!cm.cs){
    const st = CARDS.starts[m.matchId] || {};
    const blk = (m.snap && m.snap.cards) || st.cards || null;
    cm.cs = {build: st.build || null, hand: st.hand || null, traits: st.traits || [], fit: st.fit, blk, srv: null, srvSig: '', srvBusy: false, revision: 0,
             holds: [], plays: [], fxSerial: 0, traitShown: false, aiSeen: new Set(), comboSeen: new Set(), combos: [], comboSig: '',
             formSeen: new Set(), barSig: '', open: null, target: {}};
  }
  return cm.cs;
}
function handIds(m){
  const cs = CS(m);
  if(cs.hand && cs.hand.length) return cs.hand.map(c => c.id);
  const b = cs.blk && cs.blk[myTeam()];
  return (b && b.hand) || [];
}
function handCard(m, id){
  const cs = CS(m);
  const c = (cs.hand || []).find(x => x.id === id);
  return c || catCard(id) || {id, name: id.replace(/_/g, ' ').toUpperCase(), cost: 0, type: 'INSTRUCTION', lines: []};
}
function hasHand(m){ return !!m && handIds(m).length > 0; }
const kwList = c => (c.keywords || []).map(String);
const isExhaust = c => !!c.exhaust || kwList(c).some(k => /^exhaust$/i.test(k));
function cardEvents(m, s, team){
  const out = [];
  for(const e of m.events){
    if(e.timestamp > s) break;
    if(e.event_type === 'CARD_PLAYED' && (!team || e.team_id === team)) out.push(e);
  }
  return out;
}
/* influence at the presented second — the server's read when fresh, else the rules replayed from the ledger */
function influenceAt(m, s){
  const K = (CARDS.catalog && CARDS.catalog.constants) || {};
  const start = K.influence_start ?? 3, max = K.influence_max ?? 5, me = myTeam();
  const cs = CS(m);
  if(cs.srv && cs.srv.sig === infSig(m, s) && cs.srv.influence != null) return {now: cs.srv.influence, max: cs.srv.max || max, src: 'server'};
  let v = start, htDone = s < HALF ? true : false;
  const add = x => { v = Math.max(0, Math.min(max, v + x)); };
  for(const e of m.events){
    if(e.timestamp > s) break;
    if(!htDone && e.timestamp >= HALF){ add(1); htDone = true; }
    if(e.event_type === 'GOAL' && e.team_id && e.team_id !== me) add(1);
    if(e.event_type === 'CARD_PLAYED' && e.team_id === me) add(-(Number((e.detail || {}).cost) || 0));
  }
  if(!htDone && s >= HALF) add(1);
  return {now: v, max, src: 'ledger'};
}
function infSig(m, s){
  const me = myTeam();
  let n = 0, g = 0;
  for(const e of m.events){ if(e.timestamp > s) break; if(e.event_type === 'CARD_PLAYED') n++; if(e.event_type === 'GOAL') g++; }
  return `${m.matchId}|${n}|${g}|${s >= HALF ? 1 : 0}|${Math.floor(s / 900)}|${me}`;
}
async function refreshServerCards(m, s){
  const cs = CS(m);
  const sig = infSig(m, s), revision = cs.revision;
  if(cs.srvBusy || cs.srvSig === sig || CARDS.noCardsAt || !CARDS.routes || !CARDS.routes.cardsAt) return;
  cs.srvBusy = true; cs.srvSig = sig;
  try{
    const r = await _api(`/matches/${m.matchId}/cards?team=${myTeam()}&at=${Math.floor(s)}`);
    const b = r && (r[myTeam()] || r.cards && r.cards[myTeam()] || r);
    if(b && S.match === m && cs.revision === revision) cs.srv = {sig, influence: b.influence, max: b.max, playable: b.playable || {}, triggers: b.triggers_met || [],
                                      exhausted: b.exhausted || [], opp: r[other(myTeam())] || null};
  }catch(e){ if(/\(404\)|Not Found/.test(e.message)) CARDS.noCardsAt = true; cs.srvSig = ''; }
  finally{ cs.srvBusy = false; if(cs.revision !== revision) cs.srvSig = ''; }
}
function triggerMet(m, s, trig){
  if(!trig) return true;
  const cs = CS(m);
  if(cs.srv && cs.srv.sig === infSig(m, s) && cs.srv.triggers) return cs.srv.triggers.includes(trig);
  const st = statsAt(m, s), me = myTeam(), f = st.score[me], a = st.score[other(me)];
  switch(trig){
    case 'conceded': return m.events.some(e => e.timestamp <= s && e.event_type === 'GOAL' && e.team_id && e.team_id !== me);
    case 'opp_red': return st.T[other(me)].reds > 0;
    case 'level_70': return s >= 70 * 60 && f === a;
    case 'behind_60': return s >= 60 * 60 && f < a;
    case 'ahead_75': return s >= 75 * 60 && f > a;
    default: return true;
  }
}
/* why a card can't be played right now (null = playable) */
function cardBlock(m, id, s, inf){
  const c = handCard(m, id), me = myTeam();
  const mine = cardEvents(m, s, me);
  if(isExhaust(c) && mine.some(e => (e.detail || {}).card_id === id)) return {code: 'exhausted', text: 'Exhausted — once per match'};
  const cs = CS(m);
  const sp = cs.srv && cs.srv.sig === infSig(m, s) ? (cs.srv.playable || {})[id] : null;
  if(sp && sp.ok === false && sp.reason) return {code: 'server', text: sp.reason};
  const cost = Number(c.cost) || 0;
  if(cost > inf.now) return {code: 'cost', text: `Needs ⚡${cost} — you have ${inf.now}`};
  if(c.trigger && !triggerMet(m, s, c.trigger)) return {code: 'trigger', text: `Reaction: playable ${TRIGGER_TEXT[c.trigger] || c.trigger}`};
  if(!isLiveMatch() || m.status === 'ft') return {code: 'ft', text: 'The match is over'};
  if(C(m).busy) return {code: 'busy', text: 'One moment…'};
  return null;
}

/* ── previews: the Analyst's effect-table read for THIS state (cached per card × state) ── */
function previewKey(m, id, s){ const st = statsAt(m, s).score, me = myTeam(); return `${m.matchId}|${id}|${Math.floor(s / 300)}|${st[me] - st[other(me)]}`; }
function previewFor(m, id, s){
  const k = previewKey(m, id, s);
  if(CARDS.previews.has(k)) return CARDS.previews.get(k);
  const c = handCard(m, id);
  if(!CARDS.prevBusy.has(k) && !CARDS.noPreview && CARDS.routes && CARDS.routes.preview){
    CARDS.prevBusy.add(k);
    const st = statsAt(m, s).score, me = myTeam();
    _api('/build/preview', {method: 'POST', body: {match_id: m.matchId, at_clock: Math.floor(s), card_id: id, side: me,
         state: {minute: minuteOf(s), score_diff: st[me] - st[other(me)]}}})
      .then(r => { CARDS.previews.set(k, r); CS(m).barSig = ''; refreshMomentCards(); refreshDrawer(); })
      .catch(e => { if(/\(404\)|Not Found/.test(e.message)) CARDS.noPreview = true; CARDS.previews.set(k, null); })
      .finally(() => CARDS.prevBusy.delete(k));
  }
  return c.preview || null;
}
const sgn = (v, d = 2) => { v = Number(v) || 0; return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d); };
function previewHTML(p, opts = {}){
  if(!p || p.source === 'none' || (p.dxg_for == null && p.dpts == null)) return `<div class="cc-prev none">${opts.loading ? '<i class="cm-spin"></i> Analyst preview…' : 'No Analyst preview for this state'}</div>`;
  const n = p.n ? ` (${p.n} futures)` : '';
  return `<div class="cc-prev" title="Analyst effect-table read for the current minute and score · mean ± standard error${esc(n)}">
    <span>xG for <b class="${p.dxg_for > 0.005 ? 'up' : p.dxg_for < -0.005 ? 'dn' : ''}">${sgn(p.dxg_for)}</b></span>
    <span>against <b class="${p.dxg_against > 0.005 ? 'dn' : p.dxg_against < -0.005 ? 'up' : ''}">${sgn(p.dxg_against)}</b></span>
    ${p.dpts != null ? `<span>pts <b class="${p.dpts > 0.01 ? 'up' : p.dpts < -0.01 ? 'dn' : ''}">${sgn(p.dpts)}</b></span>` : ''}
    ${p.se != null ? `<em>±${(Number(p.se) || 0).toFixed(2)} /15'</em>` : ''}</div>`;
}
function kwChips(c){
  return kwList(c).map(k => `<i class="cc-kw" title="${esc(KW_HELP[k.split(/[ (]/)[0]] || '')}">${esc(k)}</i>`).join('')
    + (c.duration ? `<i class="cc-kw dur" title="Timed effects revert automatically">${esc(String(c.duration))}'</i>` : '');
}
function cardFace(m, id, s, inf, opts = {}){
  const c = handCard(m, id), blk = cardBlock(m, id, s, inf);
  const cls = TYPE_CLS[c.type] || 'instr';
  const played = cardEvents(m, s, myTeam()).filter(e => (e.detail || {}).card_id === id).length;
  const head = c.headline || (c.lines && c.lines[0]) || c.text || '';
  return `<div class="cm-card t-${cls} ${blk ? 'off' : ''} ${opts.hl ? 'hl' : ''} ${played ? 'used' : ''}" data-card="${esc(id)}"
      role="button" tabindex="0" onclick="CM.cardDrawer('${esc(id)}')" title="${esc(blk ? blk.text : 'Open the card for the exact effects')}">
    <div class="cc-top"><span class="cc-cost">⚡${Number(c.cost) || 0}</span><span class="cc-type">${esc(c.type || '')}</span>${c.upgraded ? '<span class="cc-up" title="Upgraded">+</span>' : ''}</div>
    <div class="cc-name">${esc(c.name || id)}</div>
    <div class="cc-head">${esc(head)}</div>
    <div class="cc-kws">${kwChips(c)}</div>
    ${blk ? `<div class="cc-off" data-reason="${esc(blk.code)}">${esc(blk.text)}</div>`
          : `<button class="cc-play" onclick="event.stopPropagation();CM.playCard('${esc(id)}', this)">PLAY${played ? ' AGAIN' : ''}</button>`}
  </div>`;
}
function influenceHTML(inf){
  let pips = '';
  for(let i = 0; i < inf.max; i++) pips += `<i class="${i < inf.now ? 'on' : ''}"></i>`;
  return `<div class="cm-infl" title="Influence: +1 at half time, +1 when you concede (max ${inf.max}). Cards cost 0–3."><em>INFLUENCE</em>
    <div class="cm-pips">${pips}</div><b>⚡${inf.now}<small>/${inf.max}</small></b></div>`;
}
function renderHandBar(m, force){
  const el = $('#cmHand'); if(!el) return;
  const wrap = el.closest('.cm-live');
  if(!hasHand(m) || m.status === 'ft'){ if(el.innerHTML || el.style.display !== 'none'){ el.innerHTML = ''; el.style.display = 'none'; if(wrap) wrap.classList.remove('cm-hashand'); } return; }
  if(wrap && !wrap.classList.contains('cm-hashand')) wrap.classList.add('cm-hashand');
  el.style.display = '';
  const s = shownS(m), inf = influenceAt(m, s), ids = handIds(m);
  refreshServerCards(m, s);
  const hl = (C(m).moment && C(m).moment.answers) || [];
  const blocks = ids.map(id => { const b = cardBlock(m, id, s, inf); return b ? b.code + b.text : ''; });
  const sig = JSON.stringify([ids, inf.now, inf.max, blocks, hl, cardEvents(m, s, myTeam()).length, CS(m).open]);
  if(!force && sig === CS(m).barSig) return;
  CS(m).barSig = sig;
  el.innerHTML = influenceHTML(inf) + `<div class="cm-cards">${ids.map(id => cardFace(m, id, s, inf, {hl: hl.includes(id)})).join('')}</div>`
    + `<div class="cm-hand-note">Cards play at the second on screen — no pause needed.</div>`;
}

/* ── card detail drawer ("choose how much to nerd out") ── */
function drawerHTML(m, id){
  const c = handCard(m, id), s = shownS(m), inf = influenceAt(m, s), blk = cardBlock(m, id, s, inf);
  const p = previewFor(m, id, s);
  const lines = (c.lines && c.lines.length ? c.lines : (c.effects_text || [])).map(l => `<li>${esc(l)}</li>`).join('');
  const kws = kwList(c).map(k => { const h = KW_HELP[k.split(/[ (]/)[0]]; return `<div><b>${esc(k)}</b>${h ? ` — ${esc(h)}` : ''}</div>`; }).join('');
  const tg = targetPicker(m, c);
  return `<div class="cm-drawer t-${TYPE_CLS[c.type] || 'instr'}" role="dialog" aria-label="${esc(c.name)}">
    <div class="cd-h"><span class="cc-cost">⚡${Number(c.cost) || 0}</span><b>${esc(c.name)}</b><span class="cc-type">${esc(c.type || '')}</span>
      <button class="cd-x" onclick="CM.cardDrawer(null)" aria-label="Close">×</button></div>
    ${c.headline ? `<div class="cd-head">${esc(c.headline)}</div>` : ''}
    <div class="cd-sec"><em>EXACT EFFECTS</em><ul class="cd-lines">${lines || '<li>Effects are compiled when played.</li>'}</ul>
      ${c.duration ? `<div class="cd-dur">Lasts ${esc(String(c.duration))}' — timed effects revert automatically (replays exactly on rewind).</div>` : `<div class="cd-dur">Permanent until you change it.</div>`}
      ${c.drawback ? `<div class="cd-draw"><b>Trade-off:</b> ${esc(c.drawback)}</div>` : ''}</div>
    ${kws ? `<div class="cd-sec cd-kws"><em>KEYWORDS</em>${kws}</div>` : ''}
    <div class="cd-sec"><em>ANALYST PREVIEW · ${minuteOf(s)}' · THIS SCORE</em>${previewHTML(p, {loading: !CARDS.noPreview && !CARDS.previews.has(previewKey(m, id, s))})}</div>
    ${tg}
    <div class="cd-f">${blk ? `<span class="cd-why" data-reason="${esc(blk.code)}">${esc(blk.text)}</span>` : `<span class="cm-dim">Applies at ${clockStr(s)} — the second on screen.</span>`}
      <button class="btn pri cd-play" ${blk ? 'disabled' : ''} onclick="CM.playCard('${esc(id)}', this)">Play ⚡${Number(c.cost) || 0}</button></div>
  </div>`;
}
function targetPicker(m, c){
  if(!c.target) return '';
  const cs = CS(m), me = myTeam(), ps = presentedSnap(m, presS(m)).players || {};
  const onPitch = t => Object.entries(ps).filter(([, p]) => p.team === t && p.active !== false && !p.subbed_off);
  const opts = list => list.map(([pid, p]) => `<option value="${esc(pid)}" ${cs.target.player_id === pid || cs.target.opp_player === pid || cs.target.player_off === pid ? 'selected' : ''}>${esc(short(p.name))} · ${esc(p.slot || '')}${p.energy != null ? ` · ${Math.round(p.energy)}%` : ''}</option>`).join('');
  if(c.target === 'opp_player') return `<div class="cd-sec cd-tg"><em>TARGET</em><select onchange="CM.cardTarget('opp_player', this.value)"><option value="">Scouting's pick</option>${opts(onPitch(other(me)))}</select></div>`;
  if(c.target === 'bench'){
    const bench = (S.current.bench || []).filter(pid => !(ps[pid] && ps[pid].subbed_off)).map(pid => [pid, {name: nameOf(pid), slot: (P(pid) || {}).pos || ''}]);
    return `<div class="cd-sec cd-tg"><em>SUBSTITUTION</em><select onchange="CM.cardTarget('player_off', this.value)"><option value="">Off: the card's pick</option>${opts(onPitch(me))}</select>
      <select onchange="CM.cardTarget('player_on', this.value)"><option value="">On: the card's pick</option>${bench.map(([pid, p]) => `<option value="${esc(pid)}">${esc(short(p.name))} · ${esc(p.slot)}</option>`).join('')}</select></div>`;
  }
  return `<div class="cd-sec cd-tg"><em>TARGET</em><select onchange="CM.cardTarget('player_id', this.value)"><option value="">The card's pick</option>${opts(onPitch(me))}</select></div>`;
}
function refreshDrawer(){
  const m = S.match, box = $('#cmDrawer'); if(!m || !box || !m._cm) return;
  const id = CS(m).open;
  if(!id){ box.innerHTML = ''; box.style.display = 'none'; return; }
  const focused = box.contains(document.activeElement) && document.activeElement.tagName === 'SELECT';
  if(focused) return;
  box.style.display = ''; box.innerHTML = drawerHTML(m, id);
}
function cardDrawer(id){
  const m = S.match; if(!m) return;
  const cs = CS(m);
  cs.open = cs.open === id ? null : id; cs.target = {};
  refreshDrawer(); cs.barSig = ''; renderHandBar(m, true);
}

/* ── play a card at the presented second ── */
async function playCard(id, btn){
  const m = S.match; if(!m || !m.matchId) return;
  const cs = CS(m), s = shownS(m), inf = influenceAt(m, s), blk = cardBlock(m, id, s, inf);
  if(blk){ toast(blk.text); return; }
  const c = handCard(m, id);
  const src = document.querySelector(`#cmHand .cm-card[data-card="${CSS.escape(id)}"]`);
  const rect = src ? src.getBoundingClientRect() : null;
  if(btn){ btn.disabled = true; btn.dataset.lbl = btn.textContent; btn.innerHTML = '<i class="cm-spin"></i>'; }
  await waitFor(() => !mgmtPending && !advanceInFlight);
  mgmtPending = true;
  const targets = Object.fromEntries(Object.entries(cs.target || {}).filter(([, v]) => v));
  let r;
  try{
    r = await api(`/matches/${m.matchId}/card`, {method: 'POST', body: {team: myTeam(), card_id: id, ...(Object.keys(targets).length ? {targets} : {})}});
  }catch(e){
    mgmtPending = false;
    toast('Not played: ' + e.message.replace(/^.*?:\s*/, ''));
    if(btn){ btn.disabled = false; btn.textContent = btn.dataset.lbl || 'PLAY'; }
    return;
  }
  mgmtPending = false;
  const snap = r.snapshot || {};
  if(r.cards) cs.blk = r.cards;
  if(r.card) cs.hand = (cs.hand || []).map(x => x.id === id ? {...x, ...r.card} : x);
  cs.revision++;
  const sideCards = (r.cards || snap.cards || {})[myTeam()] || {};
  const sig = infSig(m, shownS(m));
  cs.srvSig = sig; cs.srv = {sig, influence: sideCards.influence ?? (r.influence && r.influence.now), max: sideCards.max || (r.influence && r.influence.max), playable: sideCards.playable || {}, triggers: sideCards.triggers_met || [], exhausted: sideCards.exhausted || []};
  safe(() => reconcileLiveFromEngine(snap.management || r.management));
  const clock = r.rewound_to ?? Math.floor(s), minute = minuteOf(clock);
  cs.plays.push({clock, card_id: id, name: c.name, cost: c.cost, commands: r.commands || []});
  S.changes.push({minute, text: `Card: ${c.name}`});
  saveState();
  cs.open = null; refreshDrawer();
  toast(`✓ ${c.name} — played at ${minute}'`);
  if(!lowFx()) flyCard(rect, c, true);
  cardFx(m, r.commands || [], c, targets);
  const mo = $('#cmMoment .cm-mo');
  if(mo){
    let dn = mo.querySelector('.cm-mo-done');
    if(!dn){ dn = document.createElement('div'); dn.className = 'cm-mo-done'; mo.querySelector('.cm-mo-f').before(dn); }
    dn.textContent = `✓ ${c.name} played at ${minute}'. Resume to watch it work — the tracker follows it.`;
    const b = mo.querySelector(`.cm-ans[data-card="${CSS.escape(id)}"] .cm-ans-play`); if(b){ b.disabled = true; b.textContent = `✓ Played ${minute}'`; }
  }
  cs.barSig = ''; renderHandBar(m, true);
  C(m).asstSig = ''; C(m).htSig = '';
  emit('match:card', {card_id: id, minute, clock});
}
/* decision label for the tracker / feed */
function cardLabel(body){ const m = S.match; const c = m ? handCard(m, body.card_id) : {name: body.card_id}; return `Card: ${c.name}`; }

/* ── visual engagement §6.5: card fly, glow, role arrows, ghost shape ── */
const FX = {glow: [], until: 0};
function lowFx(){ return (S.ui.matchSpeed || 1) >= 4; }
function flyCard(rect, c, mine){
  const pitch = $('#livePitch'); if(!pitch) return;
  const pr = pitch.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `cm-flycard t-${TYPE_CLS[c.type] || 'instr'} ${mine ? 'mine' : 'opp'}`;
  el.innerHTML = `<span class="cc-cost">⚡${Number(c.cost) || 0}</span><b>${esc(c.name || '')}</b>`;
  document.body.appendChild(el);
  const r0 = rect || {left: pr.left + pr.width / 2 - 70, top: mine ? pr.bottom : pr.top - 40, width: 140, height: 60};
  el.style.left = r0.left + 'px'; el.style.top = r0.top + 'px'; el.style.width = r0.width + 'px';
  const tx = pr.left + pr.width / 2 - r0.width / 2, ty = pr.top + pr.height * 0.36;
  requestAnimationFrame(() => {
    el.style.transform = `translate(${tx - r0.left}px, ${ty - r0.top}px) scale(1.12) rotate(${mine ? -2 : 2}deg)`;
    el.style.opacity = '1';
  });
  setTimeout(() => { el.style.transition = 'opacity .5s, transform .5s'; el.style.opacity = '0'; el.style.transform += ' scale(.7)'; }, 1150);
  setTimeout(() => el.remove(), 1750);
}
const FWD_ROLES = /overlap|get forward|inside forward|make runs|run in behind|join attack|attack|forward|bomb|advanced/i;
function cardFx(m, commands, c, targets){
  const me = myTeam(), glow = new Set(), arrows = [];
  let ghost = null;
  const ps = presentedSnap(m, presS(m)).players || {};
  for(const cmd of commands || []){
    const k = cmd.kind || cmd.type, p = cmd.payload || cmd;
    if(p.team && p.team !== me) continue;
    if(k === 'instructions' && p.player_id){
      glow.add(p.player_id);
      const role = String((p.instructions || {}).attackRole || '');
      const fwd = FWD_ROLES.test(role);
      arrows.push({pid: p.player_id, dx: fwd ? 14 : -7, dy: 0, color: fwd ? '#ffd65a' : '#8fd3ff', ms: 2600});
    } else if(k === 'substitution'){ if(p.player_on) glow.add(p.player_on); }
    else if(k === 'modifiers'){ for(const pid of Object.keys(p.deltas || {})) glow.add(pid); }
    else if(k === 'formation' && p.formation){ ghost = ghostShape(m, p.formation); }
    else if(k === 'tactics'){ for(const [pid, q] of Object.entries(ps)) if(q.team === me && q.active !== false && q.slot !== 'GK') glow.add(pid); }
  }
  for(const v of Object.values(targets || {})) if(v && ps[v] && ps[v].team === me) glow.add(v);
  const G = [...glow];
  FX.glow = G; FX.until = performance.now() + 3200;
  const now = performance.now();
  AnimR2.fx = {glow: new Set(G), arrows: arrows.map(a => ({...a, until: now + a.ms})), ghost: ghost ? {...ghost, until: now + 3000} : null};
  if(BC.state === 'ready') bcCall('setFx', {glow: G, arrows, ghost: ghost ? {...ghost, ms: 3000} : null, ms: 3200});
  CS(m).fxSerial++;
}
/* the new shape in world metres: slot anchors laid onto the team's current block (my team attacks +x) */
function ghostShape(m, formation){
  const fid = (typeof FRONTEND_FORMATION_BY_ENGINE !== 'undefined' && FRONTEND_FORMATION_BY_ENGINE[formation]) || formation;
  const F = FORMATIONS.find(f => f.id === fid || f.name === formation);
  if(!F) return null;
  const me = myTeam();
  let sx = 0, n = 0;
  for(const [pid, p] of Object.entries(AnimR2.players)) if(p.team === me && p.active) { sx += p.x; n++; }
  const cx = n ? sx / n : 45;
  const pts = F.slots.filter(sl => sl.id !== 'GK').map(sl => [Math.max(3, Math.min(102, cx + (52 - sl.y) * 0.42)), sl.x * 0.68]);
  return {pts, color: '#ffd65a', name: F.name};
}

/* ── pops over the pitch: AI card plays, COMBO, form, kick-off traits ── */
function popLayer(){
  const pitch = $('#livePitch'); if(!pitch) return null;
  let L = pitch.querySelector('#cmPops');
  if(!L){ L = document.createElement('div'); L.id = 'cmPops'; L.className = 'cm-pops'; pitch.appendChild(L); }
  return L;
}
function pop(cls, html, ms = 3200){
  const L = popLayer(); if(!L) return null;
  const el = document.createElement('div');
  el.className = 'cm-pop ' + cls; el.innerHTML = html;
  L.appendChild(el);
  while(L.children.length > 4) L.firstChild.remove();
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); }, ms);
  setTimeout(() => el.remove(), ms + 600);
  return el;
}
function traitBanner(m){
  const cs = CS(m);
  if(cs.traitShown || !cs.traits || !cs.traits.length) return;
  const s = presS(m);
  if(s > cs0Start(m) + 40) { cs.traitShown = true; return; }
  cs.traitShown = true;
  const chips = cs.traits.map(t => `<span class="cm-trait ${t.active ? 'on' : ''}">${esc(String(t.name || t.label || t.id).toUpperCase())} <b>${t.count ?? 0}/${t.need ?? '?'}</b></span>`).join('');
  const bs = buildState() || {};
  const sys = CARDS.catalog && (CARDS.catalog.systems || []).find(x => x.id === bs.system_id);
  pop('traits', `<div class="cm-pop-k">${esc((sys && sys.name || 'YOUR SYSTEM').toUpperCase())}${cs.fit != null ? ` · FIT ${Math.round(cs.fit)}` : ''}</div><div class="cm-traits">${chips}</div>`, 5200);
}
function cs0Start(m){ return C(m).startClock || 0; }
/* AI (and replayed) card plays reach the picture at the presented second */
function presentCardEvent(m, e){
  const cs = CS(m), key = e.event_id ?? `${e.timestamp}|${(e.detail || {}).card_id}`;
  if(cs.aiSeen.has(key)) return;
  cs.aiSeen.add(key);
  if(isMine(e.team_id)) return;                      // your own plays animate when you play them
  const d = e.detail || {};
  const line = (d.lines || [])[0] || '';
  pop('ai', `<div class="cm-pop-k">${esc(sideName(e.team_id).toUpperCase())} PLAY</div><b>${esc(d.name || d.card_id || 'a card')}</b>${line ? `<span>${esc(line)}</span>` : ''}`, 3600);
  if(!lowFx()) flyCard(null, {name: d.name || d.card_id, cost: d.cost, type: d.type}, false);
}
/* COMBO detection: read-only patterns over the ledger for the manager's active partnerships */
function activePartnerships(m){
  const bs = CS(m).build || buildState(); if(!bs || !bs.partnerships) return [];
  const ps = (m.snap && m.snap.players) || {};
  return bs.partnerships.filter(p => (p.members || []).length >= 2 && (p.fam || 0) >= 30 && p.members.every(pid => ps[pid]));
}
const PATTERN_NAME = {cross_head: 'Cross & Head', overlap: 'Overlap', one_two: 'One-Two', through_ball: 'Through Ball',
  cb_partnership: 'CB Partnership', cb_pair: 'CB Partnership', cb: 'CB Partnership', press_trio: 'Pressing Trio', pressing_trio: 'Pressing Trio', keeper_line: 'Keeper–Back line', keeper_backline: 'Keeper–Back line'};
function patternKey(p){ return String(p.pattern || p.id || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''); }
function detectCombos(m){
  const parts = activePartnerships(m);
  if(!parts.length) return [];
  const ev = m.events, out = [], last = {};
  const done = e => (e.detail || {}).outcome === 'COMPLETED' || (e.detail || {}).outcome === 'AERIAL_COMPLETED';
  for(let i = 0; i < ev.length; i++){
    const e = ev[i], d = e.detail || {}, a = e.actor_id;
    if(!a) continue;
    for(const p of parts){
      const mem = p.members, k = patternKey(p);
      if(!mem.includes(a)) continue;
      if(last[p.id || k] != null && e.timestamp - last[p.id || k] < 240) continue;
      let hit = null;
      if(k.includes('cross') && e.event_type === 'SHOT' && d.shot_type === 'HEADER'){
        for(let j = i - 1; j >= 0 && ev[j].timestamp >= e.timestamp - 5; j--){
          const q = ev[j];
          if((q.event_type === 'CROSS' || (q.event_type === 'PASS' && (q.detail || {}).pass_type === 'CROSS')) && q.actor_id !== a && mem.includes(q.actor_id)){ hit = [q.actor_id, a]; break; }
        }
      } else if(k.includes('through') && e.event_type === 'PASS' && d.pass_type === 'THROUGH' && done(e) && mem.includes(d.target_id) && d.target_id !== a){ hit = [a, d.target_id]; }
      else if(k.includes('one_two') && e.event_type === 'PASS' && done(e) && mem.includes(d.target_id) && d.target_id !== a){
        for(let j = i - 1; j >= 0 && ev[j].timestamp >= e.timestamp - 8; j--){
          const q = ev[j];
          if(q.event_type === 'PASS' && q.actor_id === d.target_id && (q.detail || {}).target_id === a && done(q)){ hit = [d.target_id, a]; break; }
        }
      } else if(k.includes('overlap') && e.event_type === 'PASS' && done(e) && mem.includes(d.target_id) && d.target_id !== a){
        const tx = d.actual_target && d.actual_target[0];
        const rel = tx == null ? 0 : (e.team_id === 'HOME' ? tx : 100 - tx);
        if(rel >= 66) hit = [a, d.target_id];
      } else if((k.includes('cb') || k.includes('keeper') || k.includes('press')) && ['TACKLE', 'CLEARANCE', 'INTERCEPTION', 'RECOVERY', 'BLOCK'].includes(e.event_type)){
        for(let j = i - 1; j >= 0 && ev[j].timestamp >= e.timestamp - 10; j--){
          const q = ev[j];
          if(q.actor_id !== a && mem.includes(q.actor_id) && ['TACKLE', 'CLEARANCE', 'INTERCEPTION', 'RECOVERY', 'BLOCK', 'SHOT'].includes(q.event_type) && (q.event_type !== 'SHOT' || String((q.detail || {}).outcome || '').startsWith('SAVED'))){ hit = [q.actor_id, a]; break; }
        }
      }
      if(hit){ last[p.id || k] = e.timestamp; out.push({ts: e.timestamp, id: `${p.id || k}@${e.timestamp}`, name: PATTERN_NAME[k] || p.pattern || 'Combo', who: hit, level: p.fam >= 90 ? 3 : p.fam >= 60 ? 2 : 1}); }
    }
  }
  return out;
}
/* TRAIT PROCS: the kick-off unit traits doing their job, read from the ledger
   (presentation only — the engine never sees a trait). */
const TRAIT_TXT = {engine_room: 'wins it back high — chance', aerial_threat: 'attacks it in the air', pace_in_behind: 'is in behind', wall: 'holds the box'};
function detectTraitProcs(m){
  const cs = CS(m), me = myTeam(), out = [], last = {};
  const traits = (cs.traits || []).filter(t => t.active && (t.members || []).length);
  if(!traits.length) return out;
  const rel = (e, loc) => !loc ? 50 : (e.team_id === 'HOME' ? loc[0] : 100 - loc[0]);
  const done = e => ['COMPLETED', 'AERIAL_COMPLETED'].includes((e.detail || {}).outcome);
  const ev = m.events;
  // a regain that turns into a shot of ours within 12 s: the press paying off
  const shotSoon = (i, t0) => { for(let j = i + 1; j < ev.length && ev[j].timestamp <= t0 + 12; j++){ const q = ev[j];
    if(q.team_id !== me && ['TACKLE', 'INTERCEPTION', 'RECOVERY', 'CLEARANCE'].includes(q.event_type)) return false;
    if(q.team_id === me && q.event_type === 'SHOT') return true; } return false; };
  for(let i = 0; i < ev.length; i++){
    const e = ev[i];
    if(e.team_id !== me || !e.actor_id) continue;
    const d = e.detail || {}, loc = d.location || e.location || null;
    for(const t of traits){
      if(!t.members.includes(e.actor_id) && !(t.id === 'pace_in_behind' && t.members.includes(d.target_id))) continue;
      if(last[t.id] != null && e.timestamp - last[t.id] < 900) continue;
      let who = null;
      if(t.id === 'engine_room' && ['TACKLE', 'INTERCEPTION', 'RECOVERY'].includes(e.event_type) && (e.event_type !== 'TACKLE' || d.outcome === 'CLEAN_WIN') && rel(e, loc) >= 50 && shotSoon(i, e.timestamp)) who = e.actor_id;
      else if(t.id === 'aerial_threat' && e.event_type === 'SHOT' && d.shot_type === 'HEADER') who = e.actor_id;
      else if(t.id === 'pace_in_behind' && e.event_type === 'PASS' && d.pass_type === 'THROUGH' && done(e) && t.members.includes(d.target_id)) who = d.target_id;
      else if(t.id === 'wall' && ['BLOCK', 'CLEARANCE', 'INTERCEPTION', 'TACKLE'].includes(e.event_type) && rel(e, loc) <= 20) who = e.actor_id;
      if(who){ last[t.id] = e.timestamp; out.push({ts: e.timestamp, id: `trait:${t.id}@${e.timestamp}`, kind: 'trait', trait: t.id, name: String(t.name || t.id), who: [who]}); }
    }
  }
  return out;
}
function scanCombos(m, s){
  const cs = CS(m);
  const sig = m.events.length + ':' + (m.events.length ? m.events[m.events.length - 1].event_id : '');
  if(sig !== cs.comboSig){
    cs.comboSig = sig;
    cs.combos = [...safe(() => detectCombos(m), []), ...safe(() => detectTraitProcs(m), [])].sort((a, b) => a.ts - b.ts);
    AnimR2.slowWindows = cs.combos.map(c => [c.ts - 3.5, c.ts + 1.5]);   // the play slows around it (presentation only)
  }
  for(const c of cs.combos){
    if(c.ts > s || cs.comboSeen.has(c.id)) continue;
    cs.comboSeen.add(c.id);
    if(s - c.ts > 6) continue;
    if(c.kind === 'trait') pop('combo trait', `<div class="cm-pop-k">${esc(c.name.toUpperCase())}</div><b>${esc(short(nameOf(c.who[0])))} ${esc(TRAIT_TXT[c.trait] || '')}</b>`, 3000);
    else pop('combo', `<div class="cm-pop-k">COMBO · ${esc(c.name)}${c.level > 1 ? ` · LV${c.level}` : ''}</div><b>${esc(short(nameOf(c.who[0])))} → ${esc(short(nameOf(c.who[1])))}</b>`, 3400);
  }
}
/* player moments: goal, big save, big tackle → a card-flip "form up" pop */
function formPop(m, e){
  const cs = CS(m), d = e.detail || {};
  let pid = null, why = '';
  if(e.event_type === 'GOAL'){ pid = e.actor_id; why = d.penalty ? 'Penalty' : 'Goal'; }
  else if(e.event_type === 'SHOT' && String(d.outcome || '').startsWith('SAVED') && (Number(d.xg) || 0) >= 0.2){
    pid = AnimR2.pidByName(d.goalkeeper) || null; why = 'Big save';
  } else if(e.event_type === 'TACKLE' && d.outcome === 'CLEAN_WIN'){
    const loc = d.location, rel = loc ? (e.team_id === 'HOME' ? loc[0] : 100 - loc[0]) : 50;
    if(rel < 25){ pid = e.actor_id; why = 'Last-ditch tackle'; }
  }
  if(!pid || cs.formSeen.has(e.event_id)) return;
  cs.formSeen.add(e.event_id);
  if(why === 'Last-ditch tackle' && (cs.lastTacklePop || -1e9) > e.timestamp - 300) return;
  if(why === 'Last-ditch tackle') cs.lastTacklePop = e.timestamp;
  const now = presentedSnap(m, e.timestamp + 30).players || {}, before = presentedSnap(m, e.timestamp - 1).players || {};
  const r1 = now[pid] && Number(now[pid].rating), r0 = before[pid] && Number(before[pid].rating);
  const team = (now[pid] || before[pid] || {}).team;
  const up = isFinite(r1) && isFinite(r0) && r1 > r0 + 0.04;
  pop('form ' + (isMine(team) ? 'mine' : 'opp'), `<div class="cm-flip"><div class="cm-pop-k">${esc(why.toUpperCase())} · FORM ${up ? '▲' : '●'}</div>
    <b>${esc(short(nameOf(pid)))}</b>${isFinite(r1) ? `<span class="cm-rt">${up ? `${r0.toFixed(1)} → ` : ''}<i>${r1.toFixed(1)}</i></span>` : ''}</div>`, 2800);
}

/* ── moments: highlight the 1–2 cards that answer the question ── */
function answerTags(m, mo){
  const s = presS(m), st = statsAt(m, s).score, me = myTeam(), lead = st[me] - st[other(me)];
  const e = mo.event || {};
  switch(mo.kind){
    case 'goal': return isMine(e.team_id) ? (lead > 0 ? ['protect', 'neutral'] : ['chase', 'press']) : ['chase', 'press', 'react'];
    case 'red': return isMine(e.team_id) ? ['protect', 'neutral', 'sub'] : ['chase', 'press'];
    case 'opp_shape': return ['press', 'neutral', 'chase'];
    case 'window': return lead < 0 ? ['chase', 'sub'] : lead > 0 ? ['protect', 'sub', 'energy'] : ['chase', 'press', 'sub'];
    case 'insight': return mo.insight && mo.insight.kind === 'fatigue' ? ['sub', 'energy'] : mo.insight && mo.insight.kind === 'protect' ? ['protect'] : ['chase', 'press', 'neutral'];
    default: return ['neutral'];
  }
}
function answerCards(m, mo){
  const s = shownS(m), inf = influenceAt(m, s), tags = answerTags(m, mo);
  const ids = handIds(m).filter(id => !cardBlock(m, id, s, inf));
  const score = id => {
    const c = handCard(m, id), t = c.tags || [];
    let sc = 0;
    tags.forEach((tag, k) => { if(t.includes(tag)) sc += 10 - k * 2; });
    if(c.trigger && triggerMet(m, s, c.trigger)) sc += 6;          // a reaction that just unlocked is the answer
    if(c.type === 'REACTION' && mo.kind === 'goal' && !isMine((mo.event || {}).team_id)) sc += 3;
    const p = CARDS.previews.get(previewKey(m, id, s)) || c.preview;
    if(p && p.dpts != null) sc += Math.max(-3, Math.min(3, p.dpts * 20));
    return sc;
  };
  return ids.map(id => [id, score(id)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id);
}
function answerHTML(m, id){
  const c = handCard(m, id), s = shownS(m);
  const p = previewFor(m, id, s);
  const lines = (c.lines || []).slice(0, 3).map(l => `<li>${esc(l)}</li>`).join('');
  return `<div class="cm-ans t-${TYPE_CLS[c.type] || 'instr'}" data-card="${esc(id)}">
    <div class="cm-ans-h"><span class="cc-cost">⚡${Number(c.cost) || 0}</span><b>${esc(c.name)}</b><span class="cc-type">${esc(c.type || '')}</span>${kwChips(c)}</div>
    ${lines ? `<ul class="cd-lines">${lines}</ul>` : ''}
    <div class="cm-ans-f">${previewHTML(p, {loading: !CARDS.noPreview && !CARDS.previews.has(previewKey(m, id, s))})}
      <button class="btn pri sm cm-ans-play" onclick="CM.playCard('${esc(id)}', this)">Play ⚡${Number(c.cost) || 0}</button></div></div>`;
}
function momentCardsHTML(m, mo){
  if(!hasHand(m)) return '';
  const ans = mo.answers || [];
  const inf = influenceAt(m, shownS(m));
  const altLabel = ans.length ? handCard(m, ans[0]).name : '';
  return `<div class="cm-answers" id="cmAnswers">
    <div class="cm-asst-h">YOUR HAND ANSWERS <span>⚡${inf.now}/${inf.max}</span></div>
    ${ans.length ? ans.map(id => answerHTML(m, id)).join('') : `<div class="cm-empty">No card in your hand answers this one${inf.now < 1 ? ' — you are out of influence' : ''}. Stay the course, or go Manual.</div>`}
    <div class="cm-ans-alt">
      <button class="btn sec sm" onclick="CM.openTouchline()" title="The full tactics and substitutions panel">Manual — tactics &amp; subs</button>
      <button class="btn sec sm cm-stay" onclick="CM.stayCourse()" title="${ans.length ? esc(`The Decision Lab will test this against playing ${altLabel}`) : 'Keep the plan'}">Stay the course</button>
    </div></div>`;
}
function refreshMomentCards(){
  const m = S.match, box = $('#cmAnswers'); if(!m || !box || !C(m).moment) return;
  const mo = C(m).moment;
  box.outerHTML = momentCardsHTML(m, mo);
}
function stayCourse(){
  const m = S.match; if(!m) return;
  const cm = C(m), mo = cm.moment, cs = CS(m);
  if(mo){
    const clock = Math.floor(presS(m)), alt = (mo.answers || [])[0];
    cs.holds.push({clock, label: `Stayed the course · ${momentTitle(m, mo)}`, alt: alt ? {kind: 'card', card_id: alt} : null,
                   alt_label: alt ? handCard(m, alt).name : null});
    cm.localLines.push({clock, type: 'you', text: 'Stayed the course', local: true});
  }
  CM.resume();
}

/* ═══ 11. MATCH PREP (v2 §6.1): hand picker, set pieces, Analyst test ══════
   Rendered through TL.hooks.prepCardsHTML(fixture) into ui-build's
   #ccPrepCards; every interaction re-renders that element in place. */
const PREP = {busy: false, result: {}, err: {}, runsLeft: null};
function prepEl(){ return document.getElementById('ccPrepCards'); }
function prepRerender(){ const el = prepEl(), f = S.matchFixture; if(el && f && !S.match) el.innerHTML = prepInner(f); }
function oppOf(f){ return f.home === 'LIV' ? f.away : f.home; }
function prepPreview(id, f){
  const k = `prep|${f.id}|${id}`;
  if(CARDS.previews.has(k)) return CARDS.previews.get(k);
  if(!CARDS.prevBusy.has(k) && !CARDS.noPreview && CARDS.routes && CARDS.routes.preview){
    CARDS.prevBusy.add(k);
    _api('/build/preview', {method: 'POST', body: {card_id: id, side: f.home === 'LIV' ? 'HOME' : 'AWAY', state: {minute: 60, score_diff: 0}, opponent: oppOf(f)}})
      .then(r => { CARDS.previews.set(k, r); prepRerender(); })
      .catch(e => { if(/\(404\)|Not Found/.test(e.message)) CARDS.noPreview = true; CARDS.previews.set(k, null); })
      .finally(() => CARDS.prevBusy.delete(k));
  }
  return null;
}
function prepCard(id, f, on, idx){
  const c = catCard(id) || {id, name: id, cost: 0, type: ''};
  const p = prepPreview(id, f) || c.preview;
  const off = c.available === false;
  return `<div class="cm-pcard cm-card t-${TYPE_CLS[c.type] || 'instr'} ${on ? 'picked' : ''} ${off ? 'off' : ''}" data-card="${esc(id)}"
      role="button" tabindex="0" onclick="CM.prepToggle('${esc(id)}')" title="${esc(off ? 'Needs ' + (c.requires || []).join(', ') : on ? 'In your hand — click to remove' : 'Add to your hand')}">
    <div class="cc-top"><span class="cc-cost">⚡${Number(c.cost) || 0}</span><span class="cc-type">${esc(c.type || '')}</span>${on ? `<span class="cm-pick">${idx + 1}</span>` : ''}</div>
    <div class="cc-name">${esc(c.name || id)}</div>
    <div class="cc-head">${esc(c.headline || (c.lines || [])[0] || c.text || '')}</div>
    <div class="cc-kws">${kwChips(c)}</div>
    <div class="cm-pprev"><em>v ${esc(clubById(oppOf(f)) ? clubById(oppOf(f)).abbreviation || oppOf(f) : oppOf(f))} · 60' level</em>${previewHTML(p, {loading: !CARDS.noPreview && !CARDS.previews.has(`prep|${f.id}|${id}`)})}</div>
  </div>`;
}
function xiPlayers(){
  const st = (S.current && S.current.starters) || {};
  return Object.entries(st).filter(([, pid]) => pid).map(([slot, pid]) => ({slot, pid, pl: P(pid)})).filter(x => x.pl);
}
function takerSelect(kind, cur, attr, hooks){
  const xi = xiPlayers().filter(x => x.slot !== 'GK');
  const best = xi.slice().sort((a, b) => ((b.pl.a || {})[attr] || 0) - ((a.pl.a || {})[attr] || 0));
  return `<label class="cm-sp"><span>${esc(kind)}</span><select ${hooks.E1 === false ? 'disabled title="Chosen takers need engine hook E1 — the engine picks automatically"' : ''} onchange="CM.prepSetPiece('${kind === 'Corners' ? 'corner' : kind === 'Free kicks' ? 'free_kick' : 'penalty'}', this.value)">
    <option value="">Auto (best ${esc(attr)}: ${esc(best[0] ? short(best[0].pl.name) : '—')})</option>
    ${best.map(x => `<option value="${esc(x.pid)}" ${cur === x.pid ? 'selected' : ''}>${esc(short(x.pl.name))} · ${esc(x.slot)} · ${esc(attr)} ${Math.round((x.pl.a || {})[attr] || 0)}</option>`).join('')}</select></label>`;
}
function analystResultHTML(r, f){
  if(!r) return '';
  const sm = r.summary || r;
  const pil = sm.pillars ? Object.entries(sm.pillars).map(([k, v]) => {
    const sys = CARDS.catalog && (CARDS.catalog.systems || []).find(x => x.id === (buildState() || {}).system_id);
    const pd = sys && (sys.pillars || []).find(p => p.id === k);
    return `<span class="cm-pill"><em>${esc(pd ? pd.label : k.replace(/_/g, ' '))}</em><b>${typeof v === 'number' ? (Math.abs(v) < 1 ? v.toFixed(2) : v.toFixed(1)) : esc(String(v))}</b>${pd && pd.benchmark != null ? `<i>bench ${esc(String(pd.benchmark))}</i>` : ''}</span>`;
  }).join('') : '';
  const weekRows = (r.weeks || []).map(w => `<div class="cm-dim">Week ${w.week}: ${(Number((w.summary || {}).exp_points) || 0).toFixed(2)} expected pts · xG ${f2((w.summary || {}).xg_for)}–${f2((w.summary || {}).xg_against)}</div>`).join('');
  const variants = (r.variants || []).map(v => { const a = v.summary || {}; return `<div class="cm-dim"><b>${esc(v.label || 'Comparison')}</b> · ${(Number(a.exp_points) || 0).toFixed(2)} expected pts · xG ${f2(a.xg_for)}–${f2(a.xg_against)} · change ${sgn((Number(sm.exp_points) || 0) - (Number(a.exp_points) || 0))} pts for your current plan</div>`; }).join('');
  const plays = sm.card_plays ? Object.entries(sm.card_plays).map(([k, v]) => `${esc((catCard(k) || {}).name || k)} ×${v}`).join(' · ') : '';
  return `<div class="cm-an-res">
    <div class="cm-an-top"><div><em>EXPECTED POINTS</em><b>${(Number(sm.exp_points) || 0).toFixed(2)}</b></div>
      <div class="cm-an-wdl">${wdlBar({win: sm.win, draw: sm.draw})}</div>
      <div><em>xG</em><b>${f2(sm.xg_for)}–${f2(sm.xg_against)}</b></div>
      <div><em>GOALS</em><b>${(Number(sm.goals_for) || 0).toFixed(1)}–${(Number(sm.goals_against) || 0).toFixed(1)}</b></div></div>
    ${pil ? `<div class="cm-an-pil"><em>SYSTEM PILLARS</em>${pil}</div>` : ''}
    ${weekRows}${variants}${plays ? `<div class="cm-dim cm-an-plays">Hand played by the assistant in the ${r.n || 16} futures: ${plays}</div>` : ''}
    <div class="cm-dim">${r.n || 16} seeded futures${r.weeks ? ' of three matchweeks' : ''} against ${esc(clubName(r.test_opponent || oppOf(f)))} with your XI, system and hand. Expected points is a forecast, not a promise.</div></div>`;
}
function prepInner(f){
  const bs = buildState();
  if(!bs){ return `<h4>YOUR HAND</h4><div class="cm-empty">Pick a system on the System Board to build a deck — your hand for this match comes from it.</div>`; }
  if(!CARDS.catalog){ catalog().then(() => prepRerender()); return `<h4>YOUR HAND</h4><div class="cm-empty"><i class="cm-spin"></i> Loading your deck…</div>`; }
  const hooks = CARDS.catalog.engine_hooks || {};
  const size = (CARDS.catalog.constants || {}).hand_size || 5;
  const prep = prepFor(f.id);
  if(!prep.hand) prep.hand = defaultHand(bs);
  const deck = (bs.deck || []);
  const cost = prep.hand.reduce((a, id) => a + (Number((catCard(id) || {}).cost) || 0), 0);
  const sp = {...(bs.set_pieces || {}), ...(prep.set_pieces || {})};
  const runs = bs.analyst_runs_left ?? PREP.runsLeft;
  const res = PREP.result[f.id], err = PREP.err[f.id];
  return `<h4>YOUR HAND <span class="cc-h-r">${prep.hand.length}/${size} picked · ⚡${cost} total · you start with ⚡${(CARDS.catalog.constants || {}).influence_start ?? 3}</span></h4>
    <div class="cm-prep-note">Pick ${size} cards from your ${deck.length}-card deck. Each shows the Analyst's read against ${esc(clubName(oppOf(f)))} at 60' with the scores level. During the match they sit under the pitch — play them live, at the second on screen.
      <button class="cc-link" onclick="CM.prepAuto()">Auto-pick</button></div>
    <div class="cm-pgrid">${deck.map(id => prepCard(id, f, prep.hand.includes(id), prep.hand.indexOf(id))).join('')}</div>
    <div class="cm-prep-row">
      <div class="cm-prep-sp"><h5>SET PIECES</h5>
        ${takerSelect('Corners', sp.corner, 'cro', hooks)}${takerSelect('Free kicks', sp.free_kick, 'fka', hooks)}${takerSelect('Penalties', sp.penalty, 'pen', hooks)}
        <label class="cm-sp"><span>Corner routine</span><select ${hooks.E4 === false ? 'disabled title="Corner routines need engine hook E4"' : ''} onchange="CM.prepSetPiece('routine', this.value)">
          ${[['auto', 'Auto'], ['near', 'Near post'], ['far', 'Far post'], ['short', 'Short corner']].map(([k, l]) => `<option value="${k}" ${(sp.routine || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${hooks.E1 === false ? `<div class="cm-dim">Chosen takers arrive with engine hook E1 — until then the engine picks automatically.</div>` : ''}</div>
      <div class="cm-prep-an"><h5>ANALYST <span class="cc-h-r">${runs != null ? `${runs} run${runs === 1 ? '' : 's'} left this week` : ''}</span></h5>
        <div class="cm-dim">Plays 16 seeded futures of this match with your XI, system and hand and reports what to expect.</div>
        <button class="btn sec cm-an-go" ${PREP.busy || runs === 0 || prep.hand.length !== size ? 'disabled' : ''} onclick="CM.analystTest()">${PREP.busy ? '<i class="cm-spin"></i> Running 16 futures…' : `Test my plan against ${esc(clubName(oppOf(f)))}`}</button>
        ${S.career && S.career.cal && S.career.cal.phase === 'preseason' ? `<button class="btn sec sm" ${PREP.busy || runs < 2 + Math.max(0, ((bs.staff || {}).analyst || 1) - 1) ? 'disabled' : ''} onclick="CM.analystTest('stress')">Stress-test my system · 3 matchweeks</button><div class="cm-dim">Three weeks against Fulham; uses this camp week's Analyst budget. Your save is untouched.</div>` : ''}
        <button class="cc-link" onclick="CM.prepCompare()">${prep.comparison ? 'Replace saved comparison' : 'Save this plan for comparison'}</button>${prep.comparison ? `<div class="cm-dim">Compared with ${esc(prep.comparison.label)}. Change your hand, then test both with the same seeded futures. <button class="cc-link" onclick="CM.prepCompare(true)">Clear</button></div>` : '<div class="cm-dim">Save one variant, change your hand, then compare them in one Analyst run.</div>'}
        ${runs === 0 ? `<div class="cm-dim">No runs left this week — Analyst staff add more.</div>` : ''}
        ${err ? `<div class="cc-note bad">${esc(err)}</div>` : ''}${analystResultHTML(res, f)}</div>
    </div>`;
}
TL.hooks.prepCardsHTML = function(f){
  if(!f) return '';
  return safe(() => prepInner(f), '');
};
function prepToggle(id){
  const f = S.matchFixture; if(!f) return;
  const c = catCard(id); if(c && c.available === false){ toast(`${c.name} needs ${(c.requires || []).join(', ')} first.`); return; }
  const size = (CARDS.catalog && CARDS.catalog.constants || {}).hand_size || 5;
  const prep = prepFor(f.id); prep.hand = prep.hand || [];
  const i = prep.hand.indexOf(id);
  if(i >= 0) prep.hand.splice(i, 1);
  else if(prep.hand.length >= size){ toast(`Your hand is full (${size}). Remove a card first.`); return; }
  else prep.hand.push(id);
  delete PREP.result[f.id];
  savePrefs(); prepRerender();
}
function prepAuto(){
  const f = S.matchFixture, bs = buildState(); if(!f || !bs) return;
  const size = (CARDS.catalog && CARDS.catalog.constants || {}).hand_size || 5;
  const deck = (bs.deck || []).filter(id => (catCard(id) || {}).available !== false);
  // the Analyst's pick: best expected-points read vs this opponent, one of each cost where possible
  const val = id => { const p = CARDS.previews.get(`prep|${f.id}|${id}`); return p && p.dpts != null ? p.dpts : 0; };
  const pick = deck.slice().sort((a, b) => val(b) - val(a)).slice(0, size);
  prepFor(f.id).hand = pick; delete PREP.result[f.id];
  savePrefs(); prepRerender();
}
function prepSetPiece(k, v){
  const f = S.matchFixture; if(!f) return;
  const prep = prepFor(f.id); prep.set_pieces = prep.set_pieces || {};
  prep.set_pieces[k] = v || null;
  savePrefs();
}
function prepCompare(clear){ const f = S.matchFixture, bs = buildState(); if(!f || !bs) return; const prep = prepFor(f.id); if(clear) delete prep.comparison; else { const sys = (CARDS.catalog.systems || []).find(s => s.id === bs.system_id); prep.comparison = {label: (sys && sys.name || bs.system_id) + ' · saved hand', build: JSON.parse(JSON.stringify(bs)), hand: (prep.hand || defaultHand(bs)).slice()}; } savePrefs(); prepRerender(); }
async function analystTest(mode){
  const f = S.matchFixture; if(!f || PREP.busy) return;
  const bs = buildState(); if(!bs) return;
  PREP.busy = true; delete PREP.err[f.id]; prepRerender();
  try{
    if(!(await probeRoutes()).analyst) throw new Error('the Analyst service is not available on this server');
    const testFixture = mode === 'stress' ? {...f, home: 'LIV', away: 'FUL', id: 'stress-' + S.career.year} : f;
    const start_request = buildV07MatchRequest(testFixture);
    const x = startExtras(start_request) || {};
    if(mode === 'stress'){ x.build_team = 'HOME'; x.cpu_build = safe(() => TL.build.cpuBuildFor('FUL'), null); }
    const r = await _api('/analyst/test', {method: 'POST', body: {start_request: {...start_request, ...x}, build: x.build || bs,
      hand: (x.build && x.build.hand) || prepFor(f.id).hand || [], player_id: safe(() => CC.playerId(), 'anon'), week: safe(() => CB.currentWeek().key, f.mw ?? f.camp_week ?? 0), save_id: String(S.season.seed), mode: mode || 'match', variants: mode !== 'stress' && prepFor(f.id).comparison ? [prepFor(f.id).comparison] : []}});
    r.test_opponent = oppOf(testFixture); PREP.result[f.id] = r; PREP.runsLeft = r.runs_left ?? PREP.runsLeft;
    safe(() => { if(TL.build && TL.build.setAnalystRuns) TL.build.setAnalystRuns(r.runs_left); });
  }catch(e){
    PREP.err[f.id] = /\(429\)/.test(e.message) ? 'No Analyst runs left this week.' : 'The Analyst could not run: ' + e.message;
    if(/\(429\)/.test(e.message)) PREP.runsLeft = 0;
  }finally{ PREP.busy = false; prepRerender(); }
}

/* ═══ 12. GHOST LEAGUE (replaces the Daily Challenge) ══════════════════════
   Your saved build plays other managers' saved builds. The day comes from the
   server (UTC); the first run of the day is ranked, later ones are practice. */
const GHOST = {today: null, busy: false, err: null, last: null, lb: null, lbDay: null};
function ghostSnapshot(){
  const hand = defaultHand(buildState());
  const snap = safe(() => TL.build && TL.build.ghostSnapshot ? TL.build.ghostSnapshot(hand) : null, null);
  if(snap) return snap;
  const f = {id: 'ghost', home: 'LIV', away: 'MCI'};
  const team = safe(() => livSideForRequest(), null);
  const x = safe(() => { const prev = S.matchFixture; S.matchFixture = f; try{ return startExtras({}); } finally{ S.matchFixture = prev; } }, null);
  return team ? {team, build: x ? x.build : buildState()} : null;
}
function ghostPid(){ return safe(() => CC.playerId(), 'anon'); }
async function ghostLoad(force){
  if(GHOST.loading || (GHOST.today && !force)) return;
  GHOST.loading = true;
  try{
    const R = await probeRoutes();
    if(!R.ghostToday) throw new Error('(404) Not Found');
    GHOST.today = await _api(`/ghost/today?player_id=${encodeURIComponent(ghostPid())}`);
    GHOST.err = null;
    const lb = !R.ghostLb ? null : await _api(`/ghost/leaderboard?day=${encodeURIComponent(GHOST.today.day)}&player_id=${encodeURIComponent(ghostPid())}`).catch(() => null);
    GHOST.lb = lb;
  }catch(e){ GHOST.err = /\(404\)|Not Found/.test(e.message) ? 'The Ghost League server isn\'t available yet.' : e.message; }
  finally{ GHOST.loading = false; ghostRerender(); }
}
function ghostRerender(){ const el = document.getElementById('ccGhost'); if(el) el.innerHTML = ghostInner(); }
function ghostInner(){
  const T = GHOST.today;
  if(!T && !GHOST.err){ ghostLoad(); return `<h4>GHOST LEAGUE</h4><div class="cc-loading"><i class="cc-dot"></i> Checking today's league…</div>`; }
  if(!T) return `<h4>GHOST LEAGUE</h4><div class="cc-note bad">${esc(GHOST.err)} <button class="cc-link" onclick="CM.ghostRetry()">Retry</button></div>`;
  const used = !!T.ranked_used, L = GHOST.last;
  const rows = ((GHOST.lb && GHOST.lb.entries) || []).slice(0, 10).map((e, i) => `<div class="cm-gl-row ${e.me ? 'me' : ''}"><span>${i + 1}</span><b>${esc(e.manager_name || 'Manager')}</b>
      <span class="cm-stars">${'★'.repeat(e.stars || 0)}${'☆'.repeat(Math.max(0, 3 - (e.stars || 0)))}</span><span>${e.points ?? 0} pts</span><span class="cm-dim">GD ${e.gd >= 0 ? '+' : ''}${e.gd ?? 0}</span></div>`).join('');
  const res = L ? `<div class="cm-gl-res ${L.practice ? 'practice' : 'ranked'}"><div class="cm-gl-k">${L.practice ? 'PRACTICE RUN — NOT RANKED' : 'RANKED RUN'} · ${esc(L.day || T.day)}</div>
      ${(L.results || []).map(r => `<div class="cm-gl-m"><span>v ${esc(r.opponent && (r.opponent.manager_name || r.opponent.name) || r.opponent || 'Ghost')}</span><b>${r.score[0]}–${r.score[1]}</b><span class="cm-chip ${r.points === 3 ? 'good' : r.points === 1 ? 'mid' : 'bad'}">${r.points === 3 ? 'W' : r.points === 1 ? 'D' : 'L'}</span></div>`).join('')}
      <div class="cm-gl-sum">${L.points} pts · <span class="cm-stars">${'★'.repeat(L.stars || 0)}${'☆'.repeat(Math.max(0, 3 - (L.stars || 0)))}</span>${!L.practice && L.rank ? ` · rank ${L.rank} of ${L.total}` : ''}</div></div>` : '';
  return `<h4>GHOST LEAGUE · ${esc(T.day)} <span class="cc-h-r">${T.pool_size != null ? `${T.pool_size} ghosts in today's pool · ` : ''}server day (UTC)</span></h4>
    <div class="cm-gl">
      <div class="cm-gl-l"><p>Your saved build — squad, system and hand — plays three other managers' saved builds, instantly and deterministically.
        <b>The first run of the day is ranked</b>; any later run is practice and is labelled that way.</p>
        <div class="cm-gl-st ${used ? 'used' : ''}">${used ? 'Today\'s ranked run is used — further runs are practice.' : 'Your ranked run for today is available.'}</div>
        <button class="btn pri" ${GHOST.busy ? 'disabled' : ''} onclick="CM.ghostRun()">${GHOST.busy ? '<i class="cm-spin"></i> Playing your ghosts…' : used ? 'Practice run' : 'Play today\'s ranked run'}</button>
        ${res}</div>
      <div class="cm-gl-lb"><h5>TODAY'S TABLE</h5>${rows || '<div class="cm-dim">No ranked runs yet today — be the first.</div>'}</div>
    </div>`;
}
TL.hooks.ghostLeagueHTML = function(){ return safe(() => ghostInner(), ''); };
async function ghostRun(){
  if(GHOST.busy) return;
  const snap = ghostSnapshot();
  if(!snap){ toast('Set up your squad and system first.'); return; }
  GHOST.busy = true; ghostRerender();
  try{
    const mgr = safe(() => (S.career && S.career.manager) || 'Manager', 'Manager');
    GHOST.last = await _api('/ghost/run', {method: 'POST', body: {player_id: ghostPid(), manager_name: mgr, snapshot: snap}});
    GHOST.today = null; await ghostLoad(true);
  }catch(e){ toast('Ghost League: ' + e.message); }
  finally{ GHOST.busy = false; ghostRerender(); }
}
/* until ui-build renders #ccGhost itself, the Daily panels are swapped after their render */
function ghostInstall(){
  const cc = window.CC; if(!cc || typeof cc.renderChallenges !== 'function' || cc.renderChallenges._cmGhost) return;
  const inner = cc.renderChallenges;
  cc.renderChallenges = function(){
    const r = inner.apply(this, arguments);
    safe(() => {
      if(document.getElementById('ccGhost')) { ghostRerender(); return; }
      const daily = document.querySelector('section.cc-daily');
      if(!daily) return;
      const lb = document.getElementById('ccDailyLb'); if(lb && lb.closest('section') && lb.closest('section') !== daily) lb.closest('section').remove();
      const sec = document.createElement('section'); sec.className = 'cc-panel cm-ghost'; sec.id = 'ccGhost';
      daily.replaceWith(sec); ghostRerender();
    });
    return r;
  };
  cc.renderChallenges._cmGhost = true;
}

/* ═══ 13. REVIEW AROUND THE BUILD (v2 §6.3) ═══════════════════════════════
   Rendered from build-core's review fields when present (system_report,
   partnership_report, card_report, player_grades, next_steps); the classic
   review keeps rendering underneath for matches played without a build. */
const GRADE = {good: ['good', 'Worked'], ok: ['mid', 'Mixed'], mixed: ['mid', 'Mixed'], poor: ['bad', "Didn't work"], bad: ['bad', "Didn't work"], na: ['pend', 'Not tested']};
const gradeChip = g => { const [c, l] = GRADE[String(g || 'na').toLowerCase()] || ['mid', String(g)]; return `<span class="cm-chip ${c}">${esc(l)}</span>`; };
function numFmt(v){ if(v == null || v === '') return '—'; const n = Number(v); if(!isFinite(n)) return esc(String(v)); return Math.abs(n) < 1 && n !== 0 ? n.toFixed(2) : Math.abs(n) < 10 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toString(); }
function systemReportHTML(R){
  const rows = R.system_report && (R.system_report.pillars || R.system_report);
  if(!Array.isArray(rows) || !rows.length) return '';
  const sys = R.system_report.name || R.system_name || ((CARDS.catalog && (CARDS.catalog.systems || []).find(x => x.id === (R.system_id || (buildState() || {}).system_id))) || {}).name || 'Your system';
  return `<section class="cm-rv-sys"><h4>SYSTEM REPORT · ${esc(String(sys).toUpperCase())}${R.system_fit != null ? ` <span class="cc-h-r">fit ${Math.round(R.system_fit)}</span>` : ''}</h4>
    ${rows.map(p => {
      const v = Number(p.value), b = Number(p.benchmark), hib = p.higher_is_better !== false;
      const w = isFinite(v) && isFinite(b) && b ? Math.max(4, Math.min(100, v / (b * 1.6) * 100)) : 0;
      const bm = isFinite(b) && b ? Math.min(100, 1 / 1.6 * 100) : null;
      return `<div class="cm-pil-row"><div class="cm-pil-l"><b>${esc(p.label || p.id)}</b></div>
        <div class="cm-pil-bar">${w ? `<i class="${(v >= b) === hib ? 'up' : 'dn'}" style="width:${w}%"></i>` : ''}${bm != null ? `<span class="bm" style="left:${bm}%" title="Benchmark for this system: ${esc(String(p.benchmark))}"></span>` : ''}</div>
        <div class="cm-pil-v"><b>${numFmt(p.value)}</b>${p.benchmark != null ? `<span class="cm-dim"> / ${numFmt(p.benchmark)}</span>` : ''}</div>${gradeChip(p.grade)}
        ${p.text ? `<div class="cm-pil-t">${esc(p.text)}</div>` : ''}</div>`;
    }).join('')}</section>`;
}
function partnershipReportHTML(R){
  const rows = R.partnership_report;
  if(!Array.isArray(rows) || !rows.length) return '';
  return `<section><h4>PARTNERSHIPS</h4>${rows.map(p => {
    const names = (p.member_names || p.members || []).map(x => esc(short(nameOf(x)))).join(' + ');
    const ev = p.events || p.counts || {};
    const stat = Object.entries(ev).map(([k, v]) => `<span><b>${esc(String(v))}</b> ${esc(k.replace(/_/g, ' '))}</span>`).join('');
    return `<div class="cm-pr"><div class="cm-pr-h"><b>${esc(p.name || PATTERN_NAME[patternKey(p)] || p.pattern || 'Partnership')}</b>${p.level ? `<span class="cm-lv">LV${p.level}</span>` : ''}<span class="cm-dim">${names}</span>${gradeChip(p.verdict || p.grade)}</div>
      ${stat ? `<div class="cm-pr-s">${stat}</div>` : ''}${p.text ? `<div class="cm-pil-t">${esc(p.text)}</div>` : ''}</div>`;
  }).join('')}</section>`;
}
function labForClock(m, clock){
  const L = C(m).lab; if(!L || !L.items) return null;
  return L.items.find(d => d && Math.abs((d.clock ?? (d.minute - 1) * 60) - clock) <= 120) || null;
}
function cardReportHTML(m, R){
  let rows = R.card_report;
  if(!Array.isArray(rows) || !rows.length){
    rows = cardEvents(m, FULL, myTeam()).map(e => ({card_id: (e.detail || {}).card_id, name: (e.detail || {}).name, clock: e.timestamp, minute: minuteOf(e.timestamp), lines: (e.detail || {}).lines}));
  }
  const holds = labHolds(m);
  if(!rows.length && !holds.length) return '';
  const L = C(m).lab;
  const labBtn = !L ? `<button class="btn sec sm" onclick="CM.runLabHere()">Run the Decision Lab on these</button>`
    : L.running ? `<span class="cm-dim"><i class="cm-spin"></i> Decision Lab running…</span>` : '';
  return `<section class="cm-rv-cards"><h4>CARD REPORT <span class="cc-h-r">${labBtn}</span></h4>
    ${rows.map(c => {
      const im = c.effect || c.impact || null, lab = labForClock(m, c.clock ?? (c.minute - 1) * 60);
      return `<div class="cm-cr"><div class="cm-cr-h"><span class="cm-mmin">${c.minute ?? minuteOf(c.clock)}'</span><b>${esc(c.name || (catCard(c.card_id) || {}).name || c.card_id)}</b>
        ${lab ? chip(lab.verdict) + `<em class="cm-dim"> Decision Lab ${(Number(lab.delta_points) || 0) >= 0 ? '+' : ''}${(Number(lab.delta_points) || 0).toFixed(2)} pts</em>` : c.verdict ? chip(c.verdict) : ''}</div>
        ${(c.lines || []).length ? `<div class="cm-dim cm-cr-l">${c.lines.slice(0, 2).map(esc).join(' · ')}</div>` : ''}
        ${im && im.before ? impactCard({...im, label: c.name, minute: c.minute}, `Effect since ${c.minute}'`, {review: true, lab}) : ''}
        ${c.text ? `<div class="cm-pil-t">${esc(c.text)}</div>` : ''}${lab && lab.text ? `<div class="cm-pil-t">${esc(lab.text)}</div>` : ''}</div>`;
    }).join('')}
    ${holds.map(h => { const lab = labForClock(m, h.clock); return `<div class="cm-cr hold"><div class="cm-cr-h"><span class="cm-mmin">${minuteOf(h.clock)}'</span><b>Stayed the course</b>
      <span class="cm-dim">instead of ${esc(h.alt_label || 'a card')}</span>${lab ? chip(lab.verdict) : ''}</div>${lab && lab.text ? `<div class="cm-pil-t">${esc(lab.text)}</div>` : ''}</div>`; }).join('')}
  </section>`;
}
function gradesHTML(R){
  const rows = R.player_grades;
  if(!Array.isArray(rows) || !rows.length) return '';
  return `<section><h4>PLAYER GRADES · BY SLOT DEMAND</h4>${rows.slice(0, 8).map(p => `<div class="cm-pl"><span class="rv ${ratingClass(p.rating || 6)}">${p.rating != null ? Number(p.rating).toFixed(1) : '—'}</span>
    <b>${esc(p.name)}</b><span class="cm-dim">${esc(p.text || [p.role, p.stat, p.fit != null ? `fit ${Math.round(p.fit)}` : ''].filter(Boolean).join(' · '))}</span></div>`).join('')}</section>`;
}
function nextStepsHTML(R){
  const rows = R.next_steps;
  if(!Array.isArray(rows) || !rows.length) return '';
  return `<section class="cm-rv-next"><h4>NEXT STEPS FOR THE BUILD</h4><ul class="cm-lessons">${rows.map(x => {
    const t = typeof x === 'string' ? x : x.text; const act = typeof x === 'object' && x.action;
    return `<li>${esc(t)}${act ? ` <button class="cc-link" onclick="show('${esc(x.screen || 'squad')}')">${esc(act)} →</button>` : ''}</li>`;
  }).join('')}</ul></section>`;
}
function buildReviewHTML(m, R){
  const a = systemReportHTML(R), b = partnershipReportHTML(R), c = cardReportHTML(m, R), d = gradesHTML(R), e = nextStepsHTML(R);
  if(!a && !b && !c && !d && !e) return '';
  return `<div class="cm-rv-build">${a}<div class="cm-grid2">${c || ''}${b || d || ''}</div>${b && d ? `<div class="cm-grid2">${d}<div></div>` : ''}${e}</div>`;
}
/* Decision Lab caching (client side): a finished Lab is a pure function of the
   match and its decisions — reopening the match never re-runs it */
const LAB_CACHE_KEY = 'touchline:labcache';
function labCacheGet(m){
  try{ const all = JSON.parse(localStorage.getItem(LAB_CACHE_KEY) || '{}'); const k = m.matchId + '|' + JSON.stringify(labHolds(m)); return all[k] || null; }catch(e){ return null; }
}
function labCachePut(m, L){
  try{
    const all = JSON.parse(localStorage.getItem(LAB_CACHE_KEY) || '{}');
    all[m.matchId + '|' + JSON.stringify(labHolds(m))] = {items: L.items, total: L.total, samples: L.samples, at: Date.now()};
    const keys = Object.keys(all).sort((x, y) => (all[y].at || 0) - (all[x].at || 0));
    for(const k of keys.slice(24)) delete all[k];
    localStorage.setItem(LAB_CACHE_KEY, JSON.stringify(all));
  }catch(e){}
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
  applyAction, setView, setLabels, setBcCam, weatherFor, forecastHTML,
  runLabHere(){ const m = S.match; if(m && m.status === 'ft') runLab(m); },
  buildMoments: m => { m = m || S.match; if(!m) return []; return [...safe(() => detectCombos(m), []), ...safe(() => detectTraitProcs(m), [])].sort((a, b) => a.ts - b.ts); },
  playCard, cardDrawer, stayCourse, prepToggle, prepAuto, prepSetPiece, prepCompare, analystTest, ghostRun,
  ghostRetry(){ GHOST.err = null; GHOST.today = null; ghostRerender(); }, cardTarget(k, v){ const m = S.match; if(m) CS(m).target[k] = v || null; },
  _cards: () => { const m = S.match; if(!m) return null; const s = shownS(m), inf = influenceAt(m, s);
    return {hand: handIds(m), influence: inf, blocks: Object.fromEntries(handIds(m).map(id => [id, cardBlock(m, id, s, inf)])),
            played: cardEvents(m, s).map(e => ({ts: e.timestamp, team: e.team_id, id: (e.detail || {}).card_id, by: (e.detail || {}).by})),
            holds: CS(m).holds, plays: CS(m).plays, traits: CS(m).traits, combos: CS(m).combos, answers: (C(m).moment || {}).answers || null}; },
  _fx: () => ({anim: AnimR2.fx ? {glow: [...(AnimR2.fx.glow || [])], arrows: (AnimR2.fx.arrows || []).length, ghost: !!AnimR2.fx.ghost} : null}),
  /* test/debug: broadcast state + the kits/players handed to the renderer */
  _bc: () => ({state: BC.state, visible: BC.visible, key: BC.key, last: BC.lastClock, view: viewPref(), labels: labelsPref(),
               inPitch: !!(BC.el && BC.el.parentNode && BC.el.parentNode.id === 'livePitch')}),
  _bcMeta: () => S.match ? bcMeta(Object.assign({}, S.match.snap, {roster: AnimR2.roster})) : null,
  _kits: kitsFor, _deltaE: deltaE,
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

/* outermost renderMatch wrapper + forecast hook: install after every module
   script has run (readyState 'interactive' precedes DOMContentLoaded/boot) */
if(document.readyState === 'loading')
  document.addEventListener('readystatechange', function once(){
    if(document.readyState === 'loading') return;
    document.removeEventListener('readystatechange', once); bcInstallOuter();
  });
else bcInstallOuter();

/* post-boot: preferences for old saves */
if(TL.booted) TL.booted.then(() => { coachUI(); ghostInstall(); probeRoutes().then(() => catalog()); }).catch(() => {}); else coachUI();
})();
