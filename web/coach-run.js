/* coach-run — THE RUN: the main mode. A short campaign of seven fixtures that
   get harder, three strikes before the board sacks you, and a final to win.
   Design: docs/RUN_MODE.md.

   One fixed sequence, one primary button per step:
     choose your system (1 of 3) → [pick the next opponent → set XI + hand →
     match → result → pick 1 of 3 rewards] × 7.

   Everything the football uses still comes from Python: fit, traits and
   partnership boosts (/api/build/evaluate), kick-off modifiers, card text and
   card plays. The run keeps its own squad and build (localStorage RUN_KEY) and
   never writes into the season save: while a run is on screen its squad is
   swapped into S.current, and the season squad is what saveState() persists.

   Integration: wrap-and-delegate over touchline.html + coach-career.js +
   coach-build.js + coach-match.js (loaded after all of them). */
window.TL = window.TL || {hooks: {}, bus: new EventTarget()};
TL.hooks = TL.hooks || {};

(function(){
'use strict';
const RUN_KEY = 'touchline:run:v1';
const LIV = 'LIV';
const ROUNDS = [
  {name: 'Round 1', tier: 0}, {name: 'Round 2', tier: 0}, {name: 'Round 3', tier: 1}, {name: 'Round of 16', tier: 1},
  {name: 'Quarter-final', tier: 2}, {name: 'Semi-final', tier: 2}, {name: 'Final', tier: 3, final: true}];
const LIVES = 3;
const START_FAM = 50;
const DIFFICULTY = ['easy', 'normal', 'hard', 'hard'];
const OFFERS_BY_RESULT = {W: 3, D: 2, L: 1};
const BASIC_CARDS = ['all_out_attack', 'see_it_out', 'fresh_legs', 'hit_back'];
const deep = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (...parts) => (hashStr(parts.join('|')) >>> 0) / 4294967296;
const shuffle = (list, ...key) => list.map((x, i) => [rnd(...key, i, typeof x === 'string' ? x : JSON.stringify(x)), x]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
const nm = pid => P(pid) ? shortName(P(pid).name) : pid;
const RN = window.RN = {};
const isRunFx = f => !!(f && f.run && !f.branchOf);          // rehearsal branches keep the core flow
const runLive = () => isRunFx(S.matchFixture) && !!S.match;

/* ═══ 1. STATE ═══════════════════════════════════════════════════════════ */
let run = null;
function load(){ try{ const r = JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); return r && r.v === 1 ? r : null; }catch(e){ return null; } }
function save(){ try{ if(run) localStorage.setItem(RUN_KEY, JSON.stringify(run)); else localStorage.removeItem(RUN_KEY); }catch(e){} }
RN.state = () => run;
const active = () => !!(run && run.status === 'active');
const cat = () => window.CB && CB.catalog;
const cardById = id => (cat() && cat().cards.find(c => c.id === id)) || null;
const sysById = id => (cat() && cat().systems.find(s => s.id === id)) || null;
const patById = id => (cat() && cat().patterns.find(p => p.id === id)) || null;
const round = () => ROUNDS[run.round];

/* ── the swap: a run's squad is S.current only while the run is on screen ── */
let SEASON = null;
function swapIn(){
  if(SEASON || !run || !run.squad) return;
  SEASON = S.current; S.current = run.squad;
}
function swapOut(){
  if(!SEASON) return;
  run.squad = S.current; S.current = SEASON; SEASON = null; save();
}
RN.swapped = () => !!SEASON;
const _saveState = window.saveState;
window.saveState = function(){
  if(!SEASON) return _saveState.apply(this, arguments);
  const cur = S.current; S.current = SEASON;
  try{ return _saveState.apply(this, arguments); }   // serialises synchronously before its first await
  finally{ S.current = cur; run.squad = cur; save(); }
};
/* run matches are played at full fitness: no season fatigue carries in */
const _livSide = window.livSideForRequest;
window.livSideForRequest = function(){
  const side = _livSide.apply(this, arguments);
  if(SEASON && S.matchFixture && S.matchFixture.run){   // rehearsals of a run match too
    for(const pl of Object.values(side.lineup)) if(pl) pl.cond = 100;
    for(const pl of side.bench) pl.cond = 100;
  }
  return side;
};
/* the build the match uses: the run's (TL.build is read at call time by coach-match) */
function patchBuildAPI(){
  const tb = TL.build; if(!tb || tb._run) return;
  const st = tb.state, kb = tb.kickoffBuild, cpu = tb.cpuBuildFor;
  tb.state = () => (SEASON && run) ? run.build : st();
  tb.kickoffBuild = () => (SEASON && run) ? deep(run.build) : kb();
  tb.cpuBuildFor = club => {
    const f = S.matchFixture;
    if(SEASON && run && isRunFx(f) && f.opp === club) return deep(f.cpu_build);
    return cpu(club);
  };
  tb._run = true;
}

/* ═══ 2. EVALUATE — fit, traits and partnerships from build.py ══════════ */
function payloadPlayer(pid){
  const pl = P(pid); const out = {...serializePlayer(pl), cond: 100, a: {...pl.a}};
  const b = (run.build.boosts || {})[pid] || {};
  for(const [k, v] of Object.entries(b)) if(out.a[k] != null) out.a[k] = Math.min(99, out.a[k] + v);
  return out;
}
const xiOf = sq => Object.fromEntries(formationOf(sq.formationId).slots.map(s => [s.id, sq.starters[s.id] || null]));
let _ev = {key: null, data: null, p: null};
const evalKey = () => JSON.stringify([xiOf(run.squad), run.build.system_id, run.roster, run.build.boosts, run.build.partnerships, run.build.familiarity]);
const freshEval = () => (_ev.data && _ev.key === evalKey()) ? _ev.data : null;   // never paint a stale XI's fit
async function evaluate(extra = []){
  const sq = run.squad, sid = run.build.system_id;
  const body = {squad: [...run.roster, ...extra].filter(P).map(payloadPlayer), xi: xiOf(sq), system_id: sid, build: run.build};
  const key = evalKey();
  if(!extra.length && _ev.key === key && (_ev.data || _ev.p)) return _ev.data || _ev.p;
  const p = api('/build/evaluate', {method: 'POST', body});
  if(extra.length) return p;
  _ev = {key, data: null, p};
  try{ _ev.data = await p; }catch(e){ _ev = {key: null, data: null, p: null}; throw e; }
  _ev.p = null;
  return _ev.data;
}
RN.lastEval = () => _ev.data;

/* best XI by system fit (Hungarian over the fit matrix), then a 7-man bench */
function autoXI(ev, sys){
  const slots = formationOf(sys.formation).slots, ids = run.roster.filter(P);
  const POS_PEN = {natural: 0, comfortable: 3, secondary: 9, out: 30};
  const W = slots.map(sl => ids.map(pid => ((sl.position === 'GK') !== (P(pid).pos === 'GK')) ? -1e6
    : ((ev.fit_matrix[pid] || {})[sl.id] ?? 0) - POS_PEN[suitability(P(pid), sl.position) || 'out']));
  const rowOf = CC.hungarianMax(W), xi = {};
  slots.forEach((sl, i) => { const j = rowOf[i]; if(j >= 0 && W[i][j] > -1e5) xi[sl.id] = ids[j]; });
  return xi;
}
function autoBench(ev, xi){
  const used = new Set(Object.values(xi));
  const rest = run.roster.filter(pid => P(pid) && !used.has(pid));
  const best = pid => Math.max(0, ...Object.values(ev.fit_matrix[pid] || {}));
  rest.sort((a, b) => best(b) - best(a) || a.localeCompare(b));
  const gk = rest.find(pid => P(pid).pos === 'GK');
  return [...(gk ? [gk] : []), ...rest.filter(pid => P(pid).pos !== 'GK')].slice(0, 7);
}
async function pickBestXI(){
  const sys = sysById(run.build.system_id);
  run.squad.formationId = sys.formation;
  const ev0 = await evaluate();
  const xi = autoXI(ev0, sys);
  run.squad.starters = Object.fromEntries(formationOf(sys.formation).slots.map(s => [s.id, xi[s.id] || null]));
  run.squad.bench = autoBench(ev0, xi);
  applySystem();
  save();
}
function applySystem(){
  const sys = sysById(run.build.system_id); if(!sys) return;
  const had = !!SEASON; swapIn();
  try{ CB.applySystemToSquad(sys, {quiet: true}); } finally { if(!had) swapOut(); }
}

/* ═══ 3. THE LADDER — opponents get harder; elites pay better ═══════════ */
function tiers(){
  const ids = CLUBS.map(c => c.id).filter(id => id !== LIV);
  const sorted = ids.slice().sort((a, b) => CC.clubStrength(a) - CC.clubStrength(b) || a.localeCompare(b));
  return [sorted.slice(0, 6), sorted.slice(6, 12), sorted.slice(12, 18), [sorted[18]]];
}
function cpuXI(club){ try{ const side = cpuSideForRequest(club); return Object.entries(side.lineup).filter(([, p]) => p).map(([slot, p]) => ({slot, id: p.id, pos: p.pos, a: p.a || {}})); }catch(e){ return []; } }
function threatFor(club, kind){
  const xi = cpuXI(club);
  if(kind === 'final'){
    const boosts = Object.fromEntries(xi.map(p => [p.id, {rea: 3, cmp: 3}]));
    return {boosts, text: ['Cup final experience: every starter +3 Reactions, +3 Composure']};
  }
  if(kind === 'elite'){
    const fw = xi.filter(p => ['ST', 'LW', 'RW', 'CAM'].includes(p.pos)).sort((a, b) => ((b.a.fin || 0) - (a.a.fin || 0)) || a.id.localeCompare(b.id))[0];
    if(!fw) return {boosts: {}, text: []};
    return {boosts: {[fw.id]: {fin: 6, cmp: 6}}, text: [`In form: ${nm(fw.id) || 'their striker'} +6 Finishing, +6 Composure`]};
  }
  return {boosts: {}, text: []};
}
function option(club, r, kind){
  const tier = ROUNDS[r].tier;
  const diff = kind === 'elite' ? DIFFICULTY[Math.min(3, tier + 1)] : DIFFICULTY[tier];
  const th = threatFor(club, kind);
  return {club, kind, difficulty: diff, boosts: th.boosts, threats: th.text, system_id: (TL.build.cpuBuildFor(club) || {}).system_id || null};
}
function optionsFor(r){
  const T = tiers(), R = ROUNDS[r], faced = new Set((run.history || []).map(h => h.club));
  if(R.final) return [option(T[3][0], r, 'final')];
  const pool = t => shuffle(T[t].filter(c => !faced.has(c)), run.seed, 'opp', r, t);
  const std = pool(R.tier)[0] || shuffle(T[R.tier], run.seed, 'opp2', r)[0];
  const eliteTier = Math.min(2, R.tier + 1);
  const el = pool(eliteTier).find(c => c !== std) || shuffle(T[eliteTier].filter(c => c !== std), run.seed, 'el2', r)[0];
  return [option(std, r, 'standard'), option(el, r, 'elite')];
}

/* ═══ 4. NEW RUN — the draft: 1 of 3 systems ════════════════════════════ */
RN.newRun = async function(){
  if(isLiveMatch()) return toast('Finish the live match first.');
  if(!cat()) await TL.build.ready;
  const seed = String(Date.now() % 1e9) + Math.floor(Math.random() * 1e6);
  const ids = cat().systems.map(s => s.id);
  run = {v: 1, id: 'r' + seed.slice(-8), seed, status: 'draft', phase: 'draft', created: Date.now(),
    choices: shuffle(ids, seed, 'draft').slice(0, 3), round: 0, lives: LIVES, attempt: 0,
    roster: clubPool().map(p => p.id), history: [], log: [], next: null, offers: null, last: null, fixture: null};
  save(); RN.open();
};
function starterDeck(sys){
  const sig = (sys.signature_cards || []).filter(cardById).slice(0, 2);
  return [...sig, ...BASIC_CARDS.filter(id => cardById(id) && cardById(id).available !== false)];
}
RN.chooseSystem = async function(sid){
  const sys = sysById(sid); if(!sys || !run || run.status !== 'draft') return;
  run.build = {version: 1, system_id: sid, familiarity: {[sid]: START_FAM}, tp: {wallet: 0, carried: 0}, partnerships: [],
    deck: starterDeck(sys), upgrades: {}, set_pieces: {}, load: {}, trained_this_season: {}, drills_this_season: {},
    staff: {coach: 1, fitness: 1, analyst: 1, scout: 1, academy: 1}, analyst_runs_left: 0, influence_rules_version: 1,
    boosts: {}, unlocks: [], influence_bonus: 0};
  run.squad = {...blankSquad(), formationId: sys.formation, starters: {}, bench: [], playerInstructions: {}};
  run.status = 'active'; run.phase = 'path'; run.next = {options: optionsFor(0), pick: null};
  logLine(`You chose ${sys.name}.`);
  save(); render();
  try{ await pickBestXI(); }catch(e){ toast('Could not read the squad: ' + e.message); }
  render();
};
function logLine(t){ (run.log = run.log || []).unshift({r: run.round, t}); run.log = run.log.slice(0, 60); }

/* ═══ 5. PATH → PREP → KICK-OFF ═════════════════════════════════════════ */
RN.pickOpponent = function(i){
  if(!active() || run.phase !== 'path') return;
  run.next.pick = i; run.phase = 'prep';
  const o = run.next.options[i];
  run.hand = null;
  save(); render();
  logLine(`${round().name}: ${o.kind === 'elite' ? 'took on the elite fixture against' : o.kind === 'final' ? 'the final against' : 'drew'} ${clubName(o.club)}.`);
};
function fixtureFor(){
  const o = run.next.options[run.next.pick], home = run.round % 2 === 0 || round().final;
  const cpu = {...(TL.build.cpuBuildFor(o.club) || {}), difficulty: o.difficulty, boosts: o.boosts};
  return {id: `${run.id}-r${run.round + 1}-a${run.attempt}`, mw: 0, home: home ? LIV : o.club, away: home ? o.club : LIV,
    date: round().name, exhibition: true, run: true, round: run.round, opp: o.club, kind: o.kind, cpu_build: cpu};
}
const handSize = () => (cat().constants || {}).hand_size || 5;
/* default hand: build cards that can fire with this XI first (combos, traits), then the system's, then the rest */
function playableNow(c){
  const ev = freshEval(); if(!ev) return true;
  if(c.combo) return (ev.partnerships || []).some(p => p.pattern === c.combo && p.active && p.level >= 1);
  if(c.trait) return (ev.traits || []).some(t => t.id === c.trait && t.active);
  return true;
}
function defaultHand(){
  const deck = run.build.deck.filter(id => cardById(id));
  const rank = id => { const c = cardById(id); if(!playableNow(c)) return 4; return (c.combo || c.trait) ? 0 : (c.source || {}).kind === 'system' ? 1 : c.trigger ? 3 : 2; };
  return deck.slice().sort((a, b) => rank(a) - rank(b) || deck.indexOf(a) - deck.indexOf(b)).slice(0, handSize());
}
RN.toggleHand = function(id){
  run.hand = run.hand || defaultHand();
  const i = run.hand.indexOf(id);
  if(i >= 0) run.hand.splice(i, 1);
  else if(run.hand.length >= handSize()) return toast(`Your hand holds ${handSize()} — take one out first.`);
  else run.hand.push(id);
  save(); paintPrep();
};
RN.swapSlot = function(slot, pid){
  const st = run.squad.starters, from = Object.keys(st).find(k => st[k] === pid);
  const was = st[slot];
  if(from) st[from] = was; else run.squad.bench = run.squad.bench.filter(x => x !== pid).concat(was && !run.squad.bench.includes(was) ? [was] : []).slice(0, 7);
  st[slot] = pid;
  applySystem(); save(); paintPrep();
};
RN.autoXI = async function(){ await pickBestXI(); paintPrep(); };
RN.kickOff = async function(){
  if(!active() || run.phase !== 'prep') return;
  if(isLiveMatch()) return toast('A match is already live.');
  const xi = Object.values(run.squad.starters).filter(Boolean);
  if(xi.length < 11) return toast('Pick eleven players first.');
  const f = fixtureFor();
  run.fixture = f; run.phase = 'match'; run.hand = run.hand || defaultHand();
  save();
  swapIn();
  if(S.coachUI){ const u = S.coachUI; u.prep = u.prep || {}; u.prep[f.id] = {hand: run.hand.slice()}; }
  S.ui.matchSpeed = run.speed || 8;
  S.matchFixture = f;
  show('match');
  try{ await kickOff(); }catch(e){ console.warn('[run] kickoff', e); }
  if(!S.match){ S.matchFixture = null; run.phase = 'prep'; run.fixture = null; swapOut(); save(); show('run'); toast('The match could not start — is the server running?'); return; }
  run.fixture.matchId = S.match.matchId; save();
};

/* ═══ 6. FULL TIME → RESULT ═════════════════════════════════════════════ */
function resultOf(f, m){
  const ft = m.fullTime || {}, sc = ft.score || {home: m.score[0], away: m.score[1]};
  const home = f.home === LIV, gf = home ? sc.home : sc.away, ga = home ? sc.away : sc.home;
  const ts = ft.team_stats || {}, xh = (ts.home || {}).xg, xa = (ts.away || {}).xg;
  return {gf, ga, res: gf > ga ? 'W' : gf < ga ? 'L' : 'D', xg: xh != null && xa != null ? [home ? xh : xa, home ? xa : xh].map(Number) : null};
}
function recordFT(f, m){
  if(!run || !run.fixture || run.fixture.id !== f.id || run.last && run.last.fid === f.id) return;
  const r = resultOf(f, m), R = ROUNDS[f.round];
  const team = f.home === LIV ? 'HOME' : 'AWAY';
  const goals = m.events.filter(e => e.event_type === 'GOAL' && e.team_id === team).map(e => ({min: Math.ceil(e.timestamp / 60), who: e.actor_name}));
  const cards = m.events.filter(e => e.event_type === 'CARD_PLAYED' && e.team_id === team).map(e => ({min: Math.ceil(e.timestamp / 60), name: (e.detail || {}).name}));
  const moments = (window.CM && CM.buildMoments ? CM.buildMoments(m) : []).map(x => ({min: Math.ceil(x.ts / 60), kind: x.kind || 'combo', name: x.name, who: x.who.map(nm)}));
  const lose = r.res === 'L' || (R.final && r.res === 'D');
  run.last = {fid: f.id, round: f.round, club: f.opp, kind: f.kind, ...r, goals, cards, moments, matchId: m.matchId, lostLife: lose};
  run.history.push({round: f.round, club: f.opp, kind: f.kind, gf: r.gf, ga: r.ga, res: r.res, attempt: run.attempt});
  if(lose) run.lives -= 1;
  run.phase = 'result';
  if(R.final && r.res === 'W'){ run.status = 'won'; run.phase = 'over'; logLine(`Won the final ${r.gf}–${r.ga} against ${clubName(f.opp)}.`); }
  else if(run.lives <= 0){ run.status = 'lost'; run.phase = 'over'; logLine(`Sacked after ${r.res === 'D' ? 'drawing' : 'losing'} ${r.gf}–${r.ga} to ${clubName(f.opp)}.`); }
  else logLine(`${R.name}: ${r.res === 'W' ? 'beat' : r.res === 'D' ? 'drew with' : 'lost to'} ${clubName(f.opp)} ${r.gf}–${r.ga}${lose ? ' — a strike' : ''}.`);
  run.fixture.done = true;
  save();
}
const _finalize = window.finalizeFixture;
window.finalizeFixture = function(){
  const f = S.matchFixture, m = S.match;
  if(isRunFx(f)){ if(m && m.fullTime) recordFT(f, m); return Promise.resolve(); }
  if(f && f.run) return Promise.resolve();                    // a rehearsal never counts
  return _finalize.apply(this, arguments);
};
const _ftBanner = TL.hooks.ftBannerHTML;
TL.hooks.ftBannerHTML = function(m){
  const f = S.matchFixture;
  if(f && f.run && f.branchOf) return `<div class="cc-ftb" id="ccFt"><div class="cc-small">Rehearsal — this replay doesn't count for the run.</div></div>`;
  if(!isRunFx(f)) return _ftBanner ? _ftBanner.apply(this, arguments) : '';
  const L = run && run.last && run.last.fid === f.id ? run.last : null;
  if(!L) return `<div class="cc-ftb" id="ccFt"><div class="cc-loading"><i class="cc-dot"></i> Recording the result…</div></div>`;
  const R = ROUNDS[L.round];
  const head = run.status === 'won' ? 'You won the final. The trophy is yours.' : run.status === 'lost' ? 'Three strikes. The board has seen enough.'
    : L.res === 'W' ? 'Through — and you pick 1 of 3 rewards.' : L.res === 'D' ? (R.final ? 'A draw isn\'t enough in a final — that\'s a strike. The final will be replayed.' : 'A draw keeps you going — 1 of 2 rewards.')
    : 'A loss — that\'s a strike. 1 reward to rebuild.';
  return `<div class="cc-ftb rn-ftb" id="ccFt"><div class="rn-ftrow"><div><div class="cc-k">THE RUN · ${esc(R.name.toUpperCase())}</div><b class="rn-ft-h">${esc(head)}</b>
    <div class="cc-small">${livesHTML(run.lives)} ${run.lives} of ${LIVES} strikes left</div></div>
    <button class="btn pri" onclick="continueSeason()">${run.status === 'active' ? 'Continue to rewards →' : 'See the run →'}</button></div></div>`;
};
const _continue = window.continueSeason;
window.continueSeason = function(){
  const f = S.matchFixture;
  if(!isRunFx(f)) return _continue.apply(this, arguments);
  if(S.match && S.match.fullTime) recordFT(f, S.match);
  S.match = null; S.matchFixture = null; S.changes = [];
  if(S.base) S.current = JSON.parse(JSON.stringify(S.base));   // in-match subs never rewrite the run's XI
  S.base = null; clearActiveMatchHandle();
  swapOut();
  if(run && run.phase === 'result') prepareOffers();
  show('run');
};
const _abandon = window.abandonMatch;
window.abandonMatch = function(){
  const f = S.matchFixture;
  if(!isRunFx(f)) return _abandon.apply(this, arguments);
  if(!(S.match && S.match.status === 'ft') && !confirm('Walk off? In the run, abandoning counts as a 3–0 defeat — a strike.')) return;
  if(S.base) S.current = JSON.parse(JSON.stringify(S.base));   // the run keeps its pre-match XI
  const r = _abandon.apply(this, arguments);
  if(run && run.fixture && run.fixture.id === f.id && !run.fixture.done){
    // walking out of a run match is a forfeit: it counts as a defeat
    recordFT(f, {fullTime: {score: f.home === LIV ? {home: 0, away: 3} : {home: 3, away: 0}}, score: [0, 0], events: [], matchId: null});
    S.matchFixture = null; S.match = null; S.base = null;
    swapOut();
    if(run.phase === 'result') prepareOffers();
    show('run');
  }
  return r;
};

/* ═══ 7. REWARDS — pick 1 of 3. The run's real decisions live here ══════ */
const ATTR_LABEL = k => (cat().attrs || {})[k] || k;
const SKIP_ATTR = new Set(['ht', 'wt']);
function eligible(rule, pos){
  return rule === 'outfield' ? pos !== 'GK' : rule === 'GK' ? pos === 'GK' : rule === 'CB' ? pos === 'CB'
    : rule === 'FB' ? ['LB', 'RB', 'LWB', 'RWB'].includes(pos) : rule === 'W' ? ['LW', 'RW', 'LM', 'RM'].includes(pos)
    : rule === 'MIDP' ? ['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(pos) : false;
}
const slotPos = sl => (formationOf(run.squad.formationId).slots.find(s => s.id === sl) || {}).position;
function xiEntries(){ return Object.entries(run.squad.starters).filter(([, pid]) => pid && P(pid)).map(([slot, pid]) => ({slot, pid, pos: slotPos(slot), pl: P(pid)})); }
function patternMembers(pat){
  const xi = xiEntries(), lv3 = pat.boosts['3'] || {};
  const score = (x, role) => Object.keys(lv3[role] || {}).reduce((t, k) => t + ((x.pl.a || {})[k] || 0), 0) + rnd(run.seed, pat.id, x.pid) * 2;
  if(pat.id === 'overlap'){       // a full-back and the winger on his flank
    const pairs = [['LB', ['LW', 'LM', 'LAM']], ['RB', ['RW', 'RM', 'RAM']]].map(([fb, ws]) => {
      const a = xi.find(x => x.slot === fb), b = xi.find(x => ws.includes(x.slot) && eligible('W', x.pos === 'CAM' ? 'LW' : x.pos));
      return a && b ? [a, b] : null;
    }).filter(Boolean);
    return pairs.length ? pairs.sort((p, q) => (score(q[0], 'fb') + score(q[1], 'winger')) - (score(p[0], 'fb') + score(p[1], 'winger')))[0].map(x => x.pid) : null;
  }
  const out = [], used = new Set();
  const pressers = pat.id === 'pressing_trio';      // a pressing trio is midfielders and forwards
  for(const m of pat.members){
    const c = xi.filter(x => !used.has(x.pid) && eligible(m.rule, x.pos) && !(pressers && ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(x.pos))).sort((a, b) => score(b, m.role) - score(a, m.role))[0];
    if(!c) return null;
    out.push(c.pid); used.add(c.pid);
  }
  return out;
}
function offerCard(rare, key){
  const sys = sysById(run.build.system_id), have = new Set(run.build.deck);
  const ev = _ev.data, traits = (ev && ev.traits) || [];
  const live = new Set(traits.filter(t => t.active || t.count >= t.need - 1).map(t => t.id));
  const pool = cat().cards.filter(c => !have.has(c.id) && c.available !== false && !c.combo && (c.source || {}).kind !== 'staff');
  const w = c => (c.trait ? (live.has(c.trait) ? (rare ? 9 : 5) : 0) : (c.source || {}).kind === 'system' ? ((sys.signature_cards || []).includes(c.id) ? 6 : 0)
    : (c.source || {}).kind === 'universal' ? 3 : (c.source || {}).kind === 'set_piece' ? 1.5 : 0);
  const cand = pool.filter(c => w(c) > 0);
  if(!cand.length) return null;
  const tot = cand.reduce((a, c) => a + w(c), 0);
  let x = rnd(run.seed, key, 'card') * tot;
  const c = cand.find(c => (x -= w(c)) <= 0) || cand[0];
  const trait = c.trait ? traits.find(t => t.id === c.trait) : null;
  return {type: 'card', card_id: c.id, title: `Add ${c.name} to your deck`,
    why: c.trait ? (trait && trait.active ? `Your ${trait.name} is active — this card puts it to work.` : `Needs ${trait ? trait.name : c.trait} active on the pitch (${trait ? trait.count + '/' + trait.need : ''}).`)
      : (sys.signature_cards || []).includes(c.id) ? `A ${sys.name} card.` : 'A universal card — works in any system.'};
}
function offerPartner(rare, key){
  const have = run.build.partnerships || [];
  const max = ((cat().constants || {}).max_partnerships) || 4;
  const pats = shuffle(cat().patterns.filter(p => p.card_id || p.id === 'keeper_line'), run.seed, key, 'pat');
  for(const pat of pats){
    const members = patternMembers(pat); if(!members) continue;
    const id = `${pat.id}:${members.join('+')}`, cur = have.find(p => p.id === id);
    if(!cur && have.length >= max) continue;
    const from = cur ? cur.fam : 0, to = cur ? Math.min(100, (from >= 60 ? 90 : 60) + (rare ? 10 : 0)) : (rare ? 90 : 60);
    if(cur && from >= 90) continue;
    const lv = to >= 90 ? 3 : 2, card = pat.card_id ? cardById(pat.card_id) : null;
    const b = Object.entries(pat.boosts[String(lv)] || {}).map(([role, d]) => `${nm(members[pat.members.findIndex(x => x.role === role)])} ${Object.entries(d).map(([k, v]) => `+${v} ${ATTR_LABEL(k)}`).join(', ')}`).join(' · ');
    return {type: 'partner', pattern: pat.id, members, fam: to, id,
      title: `${cur ? 'Level up' : 'Drill'} ${pat.name}: ${members.map(nm).join(' + ')} → Lv${lv}`,
      why: `${b} while they play together.${card ? ` Unlocks ${card.name} — a card that names them.` : ''}`};
  }
  return null;
}
function offerBoost(rare, key){
  const ev = _ev.data; if(!ev) return null;
  const xi = xiEntries().filter(x => x.pos !== 'GK');
  if(!xi.length) return null;
  const order = shuffle(xi, run.seed, key, 'boost').sort((a, b) => (ev.slot_fit[a.slot] ?? 0) - (ev.slot_fit[b.slot] ?? 0));
  const x = order[Math.floor(rnd(run.seed, key, 'bpick') * Math.min(3, order.length))];
  const dem = Object.entries((ev.demands || {})[x.slot] || {}).filter(([k]) => !SKIP_ATTR.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  if(!dem.length) return null;
  const n = rare ? 5 : 3, role = ((sysById(run.build.system_id).slots || {})[x.slot] || {}).attackRole || x.slot;
  return {type: 'boost', pid: x.pid, deltas: Object.fromEntries(dem.map(k => [k, n])),
    title: `Sharpen ${nm(x.pid)}: ${dem.map(k => `+${n} ${ATTR_LABEL(k)}`).join(', ')}`,
    why: `His job (${x.slot} · ${role}) asks most for ${dem.map(ATTR_LABEL).join(' and ')}. Fit now ${ev.slot_fit[x.slot] ?? '—'}.`};
}
async function offerSigning(rare, key){
  const ev = _ev.data; if(!ev) return null;
  const xi = xiEntries();
  const weak = xi.filter(x => x.pos !== 'GK').sort((a, b) => (ev.slot_fit[a.slot] ?? 0) - (ev.slot_fit[b.slot] ?? 0))[0];
  if(!weak) return null;
  const inRun = new Set(run.roster);
  const cands = premierLeaguePlayers.filter(p => !inRun.has(p.id) && p.clubId !== LIV && suitability(p, weak.pos) !== 'out')
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id)).slice(0, rare ? 8 : 24);
  if(!cands.length) return null;
  const pickFrom = shuffle(cands, run.seed, key, 'sign').slice(0, 10).map(p => p.id);
  let e2;
  try{ e2 = await evaluate(pickFrom); }catch(e){ return null; }
  const cur = ev.slot_fit[weak.slot] ?? 0;
  const ranked = pickFrom.map(pid => ({pid, fit: (e2.fit_matrix[pid] || {})[weak.slot] ?? 0})).filter(r => r.fit > cur + 2).sort((a, b) => b.fit - a.fit);
  if(!ranked.length) return null;
  const r = rare ? ranked[0] : ranked[Math.min(ranked.length - 1, 1 + Math.floor(rnd(run.seed, key, 'sg') * Math.min(3, ranked.length - 1)))];
  return {type: 'sign', pid: r.pid, slot: weak.slot, fit: r.fit, from: cur,
    title: `Sign ${P(r.pid).name} (${clubName(P(r.pid).clubId)})`,
    why: `Fit ${r.fit} at ${weak.slot} — ${nm(weak.pid)} is ${cur}. He goes straight into the XI.`};
}
function offerOther(rare, key){
  const fam = run.build.familiarity[run.build.system_id] ?? START_FAM;
  const L = [];
  if(fam < 100) L.push({type: 'fam', add: rare ? 30 : 20, title: `System drills: familiarity ${Math.round(fam)} → ${Math.min(100, fam + (rare ? 30 : 20))}`,
    why: 'Every starter gets more Reactions, Positioning and Composure at kick-off (up to +4 at 100).'});
  const up = run.build.deck.filter(id => !run.build.upgrades[id] && cardById(id));
  if(up.length){ const id = up[Math.floor(rnd(run.seed, key, 'up') * up.length)], c = cardById(id);
    L.push({type: 'upgrade', card_id: id, title: `Upgrade ${c.name}`, why: `It ${((c.upgrade || {}).text) || 'improves'}.`}); }
  if((run.build.influence_bonus || 0) < ((cat().constants || {}).influence_bonus_max || 2) && (rare || run.round >= 2))
    L.push({type: 'influence', title: 'Assistant manager: start every match with +1 ⚡', why: `You kick off with ⚡${3 + (run.build.influence_bonus || 0) + 1} instead of ⚡${3 + (run.build.influence_bonus || 0)}.`});
  return L.length ? L[Math.floor(rnd(run.seed, key, 'other') * L.length)] : null;
}
async function prepareOffers(){
  if(!run || run.phase !== 'result' || run.offers) return;
  const L = run.last, n = OFFERS_BY_RESULT[L.res] || 1, rare = L.kind === 'elite' && L.res === 'W';
  const key = `${run.round}|${run.attempt}`;
  run.offers = {pending: true, n, rare}; save(); render();
  try{ await evaluate(); }catch(e){}
  const makers = shuffle([offerCard, offerPartner, offerBoost, offerSigning, offerOther], run.seed, key, 'types');
  // the build payoff first: a card or a partnership is always on the table
  makers.sort((a, b) => ([offerCard, offerPartner].includes(b) ? 1 : 0) - ([offerCard, offerPartner].includes(a) ? 1 : 0));
  const out = [];
  for(const mk of makers){
    if(out.length >= Math.max(n, 1)) break;
    try{ const o = await mk(rare, key + '|' + out.length); if(o) out.push(o); }catch(e){ console.warn('[run] offer', e); }
  }
  run.offers = {list: out, n, rare};
  save(); render();
}
RN.pickOffer = async function(i){
  if(!run || !run.offers || !run.offers.list) return;
  const o = run.offers.list[i]; if(!o) return;
  const b = run.build;
  if(o.type === 'card'){ b.deck.push(o.card_id); b.unlocks = [...new Set([...(b.unlocks || []), o.card_id])]; }
  else if(o.type === 'partner'){
    const cur = b.partnerships.find(p => p.id === o.id);
    if(cur) cur.fam = o.fam; else b.partnerships.push({id: o.id, pattern: o.pattern, members: o.members, fam: o.fam});
    const pat = patById(o.pattern);
    if(pat && pat.card_id && !b.deck.includes(pat.card_id)){ b.deck.push(pat.card_id); b.unlocks = [...new Set([...(b.unlocks || []), pat.card_id])]; }
  }
  else if(o.type === 'boost'){ const d = (b.boosts[o.pid] = b.boosts[o.pid] || {}); for(const [k, v] of Object.entries(o.deltas)) d[k] = (d[k] || 0) + v; }
  else if(o.type === 'sign'){
    run.roster.push(o.pid);
    const st = run.squad.starters, out = st[o.slot];
    st[o.slot] = o.pid;
    if(out) run.squad.bench = [out, ...run.squad.bench.filter(x => x !== out && x !== o.pid)].slice(0, 7);
    applySystem();
  }
  else if(o.type === 'fam') b.familiarity[b.system_id] = Math.min(100, (b.familiarity[b.system_id] ?? START_FAM) + o.add);
  else if(o.type === 'upgrade') b.upgrades[o.card_id] = 1;
  else if(o.type === 'influence') b.influence_bonus = (b.influence_bonus || 0) + 1;
  logLine(`Reward: ${o.title}.`);
  advance();
};
RN.skipOffer = () => { if(run && run.offers && run.offers.list) { logLine('Took no reward.'); advance(); } };
function advance(){
  const L = run.last, R = ROUNDS[run.round];
  run.offers = null;
  if(R.final && L.res !== 'W'){ run.attempt += 1; }          // finals are replayed until won (or the board loses patience)
  else { run.round += 1; run.attempt = 0; }
  run.fixture = null; run.hand = null;
  run.phase = 'path'; run.next = {options: optionsFor(run.round), pick: null};
  save(); render();
}

/* ═══ 8. SCREENS ════════════════════════════════════════════════════════ */
const livesHTML = n => `<span class="rn-lives">${Array.from({length: LIVES}, (_, i) => `<i class="${i < n ? 'on' : ''}">♥</i>`).join('')}</span>`;
function ladderHTML(){
  const res = r => run.history.filter(h => h.round === r);
  return `<div class="rn-ladder">${ROUNDS.map((R, i) => {
    const hs = res(i), last = hs[hs.length - 1], cur = i === run.round && run.status === 'active';
    const cls = last && (last.res === 'W' || (!R.final && last.res !== 'L')) ? (last.res === 'W' ? 'won' : 'drew') : last ? 'lost' : cur ? 'cur' : '';
    return `<div class="rn-node ${cls} ${R.final ? 'final' : ''}"><em>${esc(R.name)}</em>${hs.map(h => `<b>${esc(clubById(h.club).abbreviation)} ${h.gf}–${h.ga}</b>`).join('') || (cur ? '<b>next</b>' : '<b>·</b>')}</div>`;
  }).join('')}</div>`;
}
const STEPS = [['path', 'Opponent'], ['prep', 'Team & hand'], ['match', 'Match'], ['result', 'Reward']];
function stepsHTML(){
  const i = STEPS.findIndex(s => s[0] === run.phase);
  return `<div class="rn-steps">${STEPS.map((s, k) => `<span class="${k < i ? 'done' : k === i ? 'on' : ''}">${k + 1}. ${s[1]}</span>`).join('')}</div>`;
}
function headerHTML(){
  const sys = run.build && sysById(run.build.system_id);
  return `<div class="rn-head"><div><div class="pagehead">THE RUN${sys ? ' · ' + esc(sys.name.toUpperCase()) + ' · ' + esc(sys.shape || '') : ''}</div>
      <h2 class="pagetitle">${run.status === 'won' ? 'Champions' : run.status === 'lost' ? 'Sacked' : esc(round().name)}${run.attempt && run.status === 'active' ? ' · replay' : ''}</h2></div>
    <div class="rn-hr">${livesHTML(run.lives)}<span class="cc-small">${run.lives}/${LIVES} strikes left</span></div></div>
    ${ladderHTML()}${run.status === 'active' ? stepsHTML() : ''}`;
}
function cardHTML(id, opts = {}){
  const c = cardById(id); if(!c) return '';
  const up = !!(run.build.upgrades || {})[id];
  const cost = up && (c.upgrade || {}).kind === 'cost' ? Math.max(0, c.cost - 1) : c.cost;
  const tag = c.combo ? 'combo' : c.trait ? 'trait' : (c.source || {}).kind === 'system' ? 'system' : c.trigger ? 'react' : 'basic';
  const needs = c.combo ? `Needs ${(patById(c.combo) || {}).name || c.combo} partners on the pitch` : c.trait ? `Needs ${(cat().traits.find(t => t.id === c.trait) || {}).name || c.trait} active` : c.trigger ? (c.keywords || []).find(k => k.startsWith('Trigger')) || '' : '';
  return `<div class="rn-card t-${tag} ${opts.on ? 'on' : ''} ${opts.cls || ''}" ${opts.click ? `role="button" tabindex="0" onclick="${opts.click}"` : ''}>
    <div class="rn-ch"><span class="rn-cost">⚡${cost}</span><b>${esc(c.name)}${up ? '+' : ''}</b>${opts.on ? `<span class="rn-pick">${opts.idx + 1}</span>` : ''}</div>
    <div class="rn-cs">${esc(c.headline || '')}</div>
    <details class="rn-ex" onclick="event.stopPropagation()"><summary>Exact effect</summary><ul>${(c.lines || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>
    ${needs ? `<div class="rn-need">${esc(needs.replace(/^Trigger\(/, 'Reaction: ').replace(/\)$/, ''))}</div>` : ''}
    ${c.drawback ? `<div class="rn-draw">${esc(c.drawback)}</div>` : ''}</div>`;
}

function drawHTML(){
  return `<div class="page rn"><div class="pagehead">THE RUN</div><h2 class="pagetitle">Pick how Liverpool will play</h2>
    <p class="rn-lede">Seven fixtures, each harder than the last, and a final to win. Lose three times and you're sacked. After every match you choose one reward — a new card, a trained partnership, a signing or a sharper player. You keep this system for the whole run.</p>
    <div class="rn-draft">${run.choices.map(sid => { const s = sysById(sid); const deck = starterDeck(s);
      return `<div class="rn-sys"><div class="pagehead">${esc(s.shape || s.formation)}</div><h3>${esc(s.name)}</h3><p>${esc(s.identity)}</p>
        <div class="cc-k">IT ASKS FOR</div><ul class="rn-asks">${(s.key_demands || []).map(d => `<li>${esc(d)}</li>`).join('')}</ul>
        <div class="cc-k">STARTING CARDS</div><div class="rn-mini">${deck.map(id => `<span>${esc((cardById(id) || {}).name || id)}</span>`).join('')}</div>
        <div class="rn-fit" id="rnFit-${sid}"></div>
        <button class="btn pri" onclick="RN.chooseSystem('${sid}')">Play ${esc(s.name)}</button></div>`; }).join('')}</div>
    <div class="cc-actions" style="justify-content:flex-start"><button class="btn sec sm" onclick="RN.leave()">Back to menu</button></div></div>`;
}
async function draftFits(){
  for(const sid of run.choices){
    try{
      const s = sysById(sid);
      const xi = CC.bestXI(run.roster.map(P).filter(Boolean), formationOf(s.formation).slots);
      const ev = await api('/build/evaluate', {method: 'POST', body: {squad: run.roster.filter(P).map(pid => ({...serializePlayer(P(pid)), cond: 100})), xi, system_id: sid, build: {system_id: sid, familiarity: {[sid]: START_FAM}}}});
      const el = document.getElementById('rnFit-' + sid);
      if(el) el.innerHTML = `<span class="rn-fitn ${CB.fitCls(ev.system_fit)}">${ev.system_fit}</span><span class="cc-small">fit with your squad · traits ${(ev.traits || []).filter(t => t.active).map(t => esc(t.name)).join(', ') || 'none active yet'}</span>`;
    }catch(e){}
  }
}

function pathHTML(){
  const ops = run.next.options;
  return `<div class="rn-sec"><h4>${round().final ? 'THE FINAL' : 'CHOOSE YOUR NEXT OPPONENT'}</h4>
    ${round().final ? '' : '<p class="cc-small">The elite fixture is harder, but a win there pays a rare reward: higher-level partnerships, bigger boosts and better signings.</p>'}
    <div class="rn-opts">${ops.map((o, i) => { const c = clubById(o.club), sys = o.system_id && sysById(o.system_id);
      return `<div class="rn-opt k-${o.kind}"><div class="rn-otag">${o.kind === 'elite' ? 'ELITE · RARE REWARD' : o.kind === 'final' ? 'BOSS' : 'STANDARD'}</div>
        <h3><span class="clubdot" style="background:${c.color}"></span>${esc(c.name)}</h3>
        <div class="cc-small">${sys ? esc(sys.name) + ' · ' : ''}difficulty ${esc(o.difficulty)} · ${(run.round % 2 === 0 || round().final) ? (round().final ? 'Wembley' : 'at Anfield') : 'away'}</div>
        ${o.threats.length ? `<ul class="rn-threat">${o.threats.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<div class="cc-small cc-muted">No special threat.</div>'}
        <button class="btn ${o.kind === 'standard' ? 'sec' : 'pri'}" onclick="RN.pickOpponent(${i})">${o.kind === 'final' ? 'To the final' : 'Play ' + esc(c.shortName)}</button></div>`; }).join('')}</div></div>`;
}

const pitchY = y => 8 + (y - 14) / 80 * 84;
function boardHTML(ev){
  const sys = sysById(run.build.system_id), f = formationOf(sys.formation), xi = run.squad.starters;
  const parts = (ev && ev.partnerships) || [];
  const slotOf = pid => Object.keys(xi).find(k => xi[k] === pid);
  const lines = parts.filter(p => p.members.every(slotOf)).map(p => {
    const pts = p.members.map(m => f.slots.find(s => s.id === slotOf(m))).filter(Boolean);
    return pts.slice(1).map((q, i) => `<line x1="${pts[i].x}" y1="${pitchY(pts[i].y)}" x2="${q.x}" y2="${pitchY(q.y)}" class="lv${p.level} on"/>`).join('');
  }).join('');
  const roster = run.roster.filter(P);
  const tok = f.slots.map(sl => {
    const pid = xi[sl.id], pl = P(pid), fit = ev ? (ev.slot_fit[sl.id] ?? 0) : 0, d = sys.slots[sl.id] || {};
    const boosted = pid && run.build.boosts[pid];
    const opts = roster.filter(x => (sl.position === 'GK') === (P(x).pos === 'GK') && (x === pid || suitability(P(x), sl.position) !== 'out')).map(x => ({x, fit: ev ? ((ev.fit_matrix[x] || {})[sl.id] ?? 0) : 0}))
      .sort((a, b) => b.fit - a.fit).slice(0, 10);
    return `<div class="cb-tok rn-tok" style="left:${sl.x}%;top:${pitchY(sl.y)}%">
      <span class="rg">${CB.ringSVG(pl ? fit : 0, 54)}<b class="${CB.fitCls(fit)}">${pl ? fit : '+'}</b></span>
      <select class="rn-sel" onchange="RN.swapSlot('${sl.id}', this.value)" title="Who plays ${esc(sl.id)}?">
        ${opts.map(o => `<option value="${esc(o.x)}" ${o.x === pid ? 'selected' : ''}>${esc(nm(o.x))} · ${o.fit}</option>`).join('')}</select>
      <span class="rl">${esc(sl.id)} · ${esc(d.attackRole || sl.position)}${boosted ? ' · <i class="rn-up">▲</i>' : ''}</span></div>`;
  }).join('');
  return `<div class="cb-pitch rn-pitch"><div class="cb-grass"></div><svg class="cb-links" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${tok}</div>`;
}
function buildSideHTML(ev){
  const b = run.build;
  const traits = ev ? (ev.traits || []).map(t => CB.traitHTML(t, true)).join('') : '';
  const parts = (ev && ev.partnerships) || [];
  const boosts = Object.entries(b.boosts || {}).filter(([pid]) => P(pid));
  const fam = b.familiarity[b.system_id] ?? START_FAM;
  return `<section class="cc-panel"><h4>YOUR BUILD <span class="cc-h-r">${ev ? `system fit <b class="${CB.fitCls(ev.system_fit)}">${ev.system_fit}</b>` : ''}</span></h4>
    <div class="cb-htraits">${traits || '<div class="cc-small cc-muted">Reading traits…</div>'}</div>
    <div class="rn-kv"><span>Familiarity</span><b>${Math.round(fam)}%</b><em>+${(clamp((fam - 40) / 60, 0, 1) * 4).toFixed(1)} Reactions, Positioning, Composure</em></div>
    ${parts.length ? parts.map(p => `<div class="rn-kv"><span>${esc(p.name)} Lv${p.level}</span><b>${p.members.map(nm).map(esc).join(' + ')}</b><em>${p.active ? 'both on the pitch' : 'not together in this XI'}</em></div>`).join('') : '<div class="cc-small cc-muted">No partnerships yet — win one as a reward.</div>'}
    ${boosts.map(([pid, d]) => `<div class="rn-kv"><span>Sharpened</span><b>${esc(nm(pid))}</b><em>${Object.entries(d).map(([k, v]) => `+${v} ${esc(ATTR_LABEL(k))}`).join(', ')}</em></div>`).join('')}
    ${b.influence_bonus ? `<div class="rn-kv"><span>Assistant</span><b>+${b.influence_bonus} ⚡</b><em>at kick-off</em></div>` : ''}
    <div class="rn-kv"><span>Deck</span><b>${b.deck.length} cards</b><em>your hand is ${handSize()}</em></div></section>`;
}
function prepHTML(){
  const o = run.next.options[run.next.pick], c = clubById(o.club);
  return `<div class="rn-sec"><div class="rn-vs"><h4>${esc(round().name.toUpperCase())} · v ${esc(c.name.toUpperCase())}</h4>
      ${o.threats.length ? `<span class="rn-threat-i">${o.threats.map(esc).join(' · ')}</span>` : ''}</div>
    <div class="rn-prep"><div id="rnBoard"></div><div id="rnSide"></div></div>
    <section class="cc-panel"><h4>YOUR HAND <span class="cc-h-r" id="rnHandN"></span></h4>
      <p class="cc-small">Pick ${handSize()} cards to take into the match. You start with ⚡${3 + (run.build.influence_bonus || 0)} influence, gain ⚡1 at half-time and ⚡1 when you concede. Cards that name your players (partnerships, traits) are your build paying off.</p>
      <div class="rn-hand" id="rnHand"></div></section>
    <div class="rn-go"><button class="btn sec" onclick="RN.autoXI()">Best XI for the system</button>
      <label class="cc-small">Match speed <select onchange="RN.setSpeed(this.value)">${[[8, 'Highlights (8×)'], [4, 'Quick (4×)'], [2, 'Watch (2×)'], [1, 'Full (1×)']].map(([v, l]) => `<option value="${v}" ${(run.speed || 8) == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <button class="btn pri rn-kick" onclick="RN.kickOff()">Kick off ▶</button></div></div>`;
}
RN.setSpeed = v => { run.speed = Number(v) || 8; save(); };
async function paintPrep(){
  const board = document.getElementById('rnBoard'); if(!board) return;
  const ev = freshEval();
  board.innerHTML = boardHTML(ev);
  const side = document.getElementById('rnSide'); if(side) side.innerHTML = buildSideHTML(ev);
  const hand = run.hand || defaultHand();
  const hEl = document.getElementById('rnHand');
  if(hEl) hEl.innerHTML = run.build.deck.map(id => cardHTML(id, {on: hand.includes(id), idx: hand.indexOf(id), click: `RN.toggleHand('${id}')`})).join('');
  const n = document.getElementById('rnHandN');
  if(n) n.textContent = `${hand.length}/${handSize()} picked · ⚡${hand.reduce((a, id) => a + ((cardById(id) || {}).cost || 0), 0)} total`;
  if(window.CB && CB.ringSVG) requestAnimationFrame(() => requestAnimationFrame(() => board.querySelectorAll('.cb-ring .val[data-off]').forEach(c => { c.style.strokeDashoffset = c.dataset.off; })));
  if(!ev){ try{ await evaluate(); if(freshEval()) paintPrep(); }catch(e){ board.innerHTML = `<div class="cc-note bad">Couldn't read the squad: ${esc(e.message)}</div>`; } }
}

function resultHTML(){
  const L = run.last, R = ROUNDS[L.round];
  const offers = run.offers;
  const traitLines = L.moments.filter(x => x.kind === 'trait'), combos = L.moments.filter(x => x.kind !== 'trait');
  return `<div class="rn-sec"><div class="rn-res r-${L.res}"><div class="rn-score"><em>${esc(R.name)} · v ${esc(clubName(L.club))}</em><b>${L.gf}–${L.ga}</b>
      <span>${L.res === 'W' ? 'WIN' : L.res === 'D' ? 'DRAW' : 'LOSS'}${L.lostLife ? ' · STRIKE' : ''}</span>${L.xg ? `<i>xG ${L.xg[0].toFixed(2)}–${L.xg[1].toFixed(2)}</i>` : ''}</div>
    <div class="rn-paid"><div class="cc-k">YOUR BUILD IN THIS MATCH</div>
      ${groupMoments(combos, '⇄')}${groupMoments(traitLines, '◆')}
      ${L.cards.length ? `<div>⚡ ${L.cards.map(c => `${esc(c.name)} ${c.min}'`).join(' · ')}</div>` : '<div class="cc-muted">No cards played.</div>'}
      ${L.goals.length ? `<div>● ${L.goals.map(g => `${esc(shortName(g.who || ''))} ${g.min}'`).join(' · ')}</div>` : ''}
      ${!combos.length && !traitLines.length ? '<div class="cc-muted">No partnership or trait moments — rewards that build them make your system visible on the pitch.</div>' : ''}</div></div></div>
    <div class="rn-sec"><h4>CHOOSE ${offers && offers.list ? (offers.list.length > 1 ? `1 OF ${offers.list.length}` : 'YOUR') : ''} REWARD${offers && offers.rare ? ' · RARE' : ''}</h4>
      ${!offers || offers.pending ? '<div class="cc-loading"><i class="cc-dot"></i> The staff are putting options together…</div>'
        : `<div class="rn-offers">${offers.list.map((o, i) => `<button class="rn-offer o-${o.type}" onclick="RN.pickOffer(${i})">
            <em>${{card: 'NEW CARD', partner: 'PARTNERSHIP', boost: 'TRAINING', sign: 'SIGNING', fam: 'SYSTEM', upgrade: 'UPGRADE', influence: 'STAFF'}[o.type]}</em>
            <b>${esc(o.title)}</b><span>${esc(o.why)}</span>${o.type === 'card' ? cardHTML(o.card_id, {cls: 'mini'}) : ''}</button>`).join('')}</div>
          ${offers.list.length ? '' : '<div class="cc-small">Nothing on offer this time.</div>'}
          <div class="cc-actions" style="justify-content:flex-start"><button class="btn sec sm" onclick="RN.skipOffer()">${offers.list.length ? 'Skip the reward' : 'Continue'}</button></div>`}</div>`;
}
/* "Pressing Trio ×5 — 3', 9', 18'…" : one line per partnership/trait */
function groupMoments(list, icon){
  const by = {};
  for(const x of list) (by[x.name] = by[x.name] || []).push(x);
  return Object.entries(by).map(([name, xs]) => `<div>${icon} <b>${esc(name)}</b> ×${xs.length} <em>${xs.slice(0, 5).map(x => x.min + "'").join(', ')}${xs.length > 5 ? '…' : ''}</em>
    <span class="cc-muted">· ${esc([...new Set(xs.flatMap(x => x.who))].join(', '))}</span></div>`).join('');
}
function overHTML(){
  const won = run.status === 'won', W = run.history.filter(h => h.res === 'W').length;
  return `<div class="rn-sec"><div class="rn-over ${won ? 'won' : 'lost'}"><b>${won ? '🏆 You won the final.' : 'The board has sacked you.'}</b>
      <span>${run.history.length} matches · ${W} won · ${run.history.reduce((a, h) => a + h.gf, 0)} scored · ${run.build.deck.length} cards · ${run.build.partnerships.length} partnerships</span></div>
    <div class="rn-log">${(run.log || []).slice().reverse().map(l => `<div>${esc(l.t)}</div>`).join('')}</div>
    <div class="cc-actions" style="justify-content:flex-start"><button class="btn pri" onclick="RN.newRun()">Start a new run</button><button class="btn sec" onclick="RN.leave()">Back to menu</button></div></div>`;
}
function render(){
  const el = document.getElementById('runBody'); if(!el) return;
  if(S.ui.view !== 'run') return;
  if(!run) { el.innerHTML = `<div class="page rn">${heroHTML()}</div>`; return; }
  if(run.status === 'draft'){ el.innerHTML = drawHTML(); draftFits(); return; }
  let body = '';
  if(run.phase === 'path') body = pathHTML();
  else if(run.phase === 'prep') body = prepHTML();
  else if(run.phase === 'match') body = `<div class="rn-sec"><div class="cc-note">A match is in progress. <button class="btn pri sm" onclick="RN.resume()">Back to the match</button></div></div>`;
  else if(run.phase === 'result') body = resultHTML();
  else body = overHTML();
  el.innerHTML = `<div class="page rn">${headerHTML()}${body}
    <div class="cc-actions rn-foot"><button class="btn sec sm" onclick="RN.leave()">Menu</button>${run.status === 'active' ? '<button class="btn sec sm" onclick="RN.abandonRun()">Abandon run</button>' : ''}</div></div>`;
  if(run.phase === 'prep') paintPrep();
  if(run.phase === 'result' && !run.offers) prepareOffers();
}
RN.render = render;

/* ═══ 9. MODE: menu ↔ run; the season is the long mode ══════════════════ */
function heroHTML(){
  const r = run;
  const cont = r && (r.status === 'active' || r.status === 'draft');
  return `<section class="rn-hero"><div><div class="pagehead">THE RUN · MAIN MODE</div><h2>Seven fixtures. Three strikes. One final.</h2>
      <p>Choose a system, build it with rewards after every match — cards, partnerships, signings, sharper players — and watch it play. About 40 minutes.</p></div>
    <div class="rn-hero-a">${cont ? `<button class="btn pri" onclick="RN.open()">Continue run · ${esc(r.status === 'draft' ? 'choose a system' : ROUNDS[r.round].name)} ${livesHTML(r.lives)}</button>` : ''}
      <button class="btn ${cont ? 'sec' : 'pri'}" onclick="RN.newRun()">${cont ? 'Start over' : 'Start a run'}</button></div></section>`;
}
RN.open = function(){ show('run'); };
RN.leave = function(){ if(runLive() && isLiveMatch()) return toast('Finish — or abandon — the match first.'); swapOut(); show('home'); };
RN.abandonRun = function(){ if(!confirm('Abandon this run? It counts as a sacking.')) return; run.status = 'lost'; run.phase = 'over'; logLine('Run abandoned.'); save(); render(); };
RN.resume = async function(){
  if(runLive()){ show('match'); return; }
  const f = run && run.fixture;
  if(!f || !f.matchId){ if(run){ run.phase = 'prep'; run.fixture = null; save(); } return render(); }
  swapIn();
  try{
    const snap = await api(`/matches/${f.matchId}`);
    TL.startLiveFromSnapshot(snap, f);
    if(snap.status === 'ft' && S.match) S.match.status = 'ft';
  }catch(e){
    swapOut(); run.phase = 'prep'; run.fixture = null; save(); render();
    toast('That match expired on the server — kick off again.');
  }
};
const _show = window.show;
window.show = function(v){
  const inRun = isRunFx(S.matchFixture);                        // a run match: its squad stays on S.current
  if(v !== 'run' && !inRun) swapOut();
  document.body.classList.toggle('tl-run', v === 'run' || inRun);
  const r = _show.apply(this, arguments);
  if(v === 'run'){ renderRunBar(); render(); }
  return r;
};
function renderRunBar(){
  const el = document.getElementById('runBar'); if(!el) return;
  el.innerHTML = run && run.status === 'active' ? `<b>THE RUN</b> · ${esc(ROUNDS[run.round].name)} ${livesHTML(run.lives)} <button class="cc-link" onclick="RN.leave()">Menu</button>` : `<b>THE RUN</b> <button class="cc-link" onclick="RN.leave()">Menu</button>`;
}
const _shell = window.shell;
window.shell = function(){
  const r = _shell.apply(this, arguments);
  const app = document.getElementById('app');
  if(!document.getElementById('v-run')){
    const v = document.createElement('div'); v.className = 'view page'; v.id = 'v-run'; v.innerHTML = '<div id="runBody"></div>';
    app.insertBefore(v, document.getElementById('v-match'));
  }
  const top = document.querySelector('.topbar');
  if(top && !document.getElementById('runBar')){
    const b = document.createElement('div'); b.id = 'runBar'; b.className = 'rn-bar';
    top.insertBefore(b, top.querySelector('.topmeta'));
  }
  groupNav();
  return r;
};
/* season nav: the everyday tabs up front, the rest behind "More" */
function groupNav(){
  const nav = document.querySelector('.navtabs'); if(!nav || nav.querySelector('.rn-more')) return;
  const tabs = ['players', 'transfers', 'finances', 'challenges'];
  const more = document.createElement('div'); more.className = 'rn-more';
  more.innerHTML = `<button class="navtab" onclick="this.parentNode.classList.toggle('open')">More ▾</button><div class="rn-menu"></div>`;
  nav.appendChild(more);
  const move = () => { for(const v of tabs){ const t = nav.querySelector(`:scope > .navtab[data-v="${v}"]`); if(t){ t.addEventListener('click', () => more.classList.remove('open')); more.querySelector('.rn-menu').appendChild(t); } } };
  move(); setTimeout(move, 0);   // coach-build / coach-career add their tabs after core shell()
  document.addEventListener('click', e => { if(!more.contains(e.target)) more.classList.remove('open'); });
}
const _home = window.renderHome;
window.renderHome = function(){
  const r = _home.apply(this, arguments);
  try{
    const el = document.getElementById('homeBody');
    if(el && !el.querySelector('.rn-hero')){
      el.insertAdjacentHTML('afterbegin', heroHTML() + `<div class="rn-season-k"><span class="pagehead">SEASON MODE · THE LONG GAME</span><span class="cc-small">A full Premier League season with training, transfers and finances.</span></div>`);
    }
  }catch(e){ console.warn('[run] home', e); }
  return r;
};

/* ═══ 10. BOOT ══════════════════════════════════════════════════════════ */
run = load();
TL.booted.then(async () => {
  if(TL.build && TL.build.ready) await TL.build.ready;
  patchBuildAPI();
  if(run && run.status === 'active' && run.phase === 'match' && !S.match) await RN.resume();   // reload during a run match: reconnect
  else if(location.hash.slice(1) === 'run') show('run');
  if(S.ui.view === 'home') renderHome();
}).catch(e => console.warn('[run] boot', e));
})();
