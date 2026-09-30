/* coach-build — Core Loop v2 career layer. See docs/CORE_LOOP_V2_SPEC.md
   §3.1–3.2 (season / matchweek flow), §4 + §5 UI (System Board, Training),
   §7 (economy, staff, market, calendar), §11 screens 1, 2, 7, 8, 9, §12.3 save.

   The BUILD MATHS (fit, traits, training gains, familiarity, partnerships,
   cards) lives in build.py and is reached through /api/build/*
   (docs/v2_progress/build-core.md). This file only calls it and renders.
   The CAREER rules that are the UI layer's own (calendar, economy, board
   limits, scouting fog, windows) are in section 3 with named constants —
   documented in docs/v2_progress/ui-build.md for the balance harness.

   Integration: wrap-and-delegate over touchline.html + coach-career.js
   (loaded after both). State lives in S.career.build / .cal / .econ /
   .train / .market / .youth and is persisted with the career save. */
window.TL = window.TL || {hooks:{}, bus:new EventTarget()};
TL.hooks = TL.hooks || {};

(function(){
'use strict';
const CC = window.CC;
const CB = window.CB = {};
const LIV = 'LIV';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const sum = a => a.reduce((x, y) => x + y, 0);
const deep = o => JSON.parse(JSON.stringify(o));
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ATTR_NAMES = {acc:'Acceleration', spr:'Sprint speed', agi:'Agility', rea:'Reactions', bco:'Ball control', bln:'Balance',
  dri:'Dribbling', sps:'Short passing', lps:'Long passing', vis:'Vision', cro:'Crossing', fin:'Finishing', apo:'Positioning',
  shp:'Shot power', lsh:'Long shots', vol:'Volleys', hea:'Heading', daw:'Def. awareness', sta:'Standing tackle', sli:'Sliding tackle',
  int:'Interceptions', str:'Strength', stam:'Stamina', agg:'Aggression', jum:'Jumping', fka:'Free-kick acc.', pen:'Penalties',
  cmp:'Composure', cur:'Curve', gkd:'GK diving', gkh:'GK handling', gkk:'GK kicking', gkp:'GK positioning', gkr:'GK reflexes'};
CB.ATTR_NAMES = ATTR_NAMES;
const attrName = k => (CB.catalog && CB.catalog.attrs && CB.catalog.attrs[k]) || ATTR_NAMES[k] || k;

/* ═══ 1. BUILD API — Python is the source of truth for every build value ═══ */
const BAPI = CB.api = {
  source: {},
  async call(route, method, body){
    const result = await api(route, method === 'GET' ? {} : {method, body});
    this.source[route] = 'server';
    return result;
  },
  catalog(){ return this.call('/build/catalog', 'GET'); },
  evaluate(body){ return this.call('/build/evaluate', 'POST', body); },
  train(body){ return this.call('/build/train', 'POST', body); },
  weekTick(body){ return this.call('/build/week_tick', 'POST', body); }
};

/* ═══ 2. BUILD STATE (§12.3) — load, migrate, expose ═════════════════════ */
const BUILD_VERSION = 1;
CB.catalog = null;
const sysById = id => {
  const B = S.career && S.career.build;
  if(id === 'custom' && B && B.custom_system){
    const base = (CB.catalog.systems.find(s => s.id === B.custom_system.base_id) || CB.catalog.systems[0]);
    return {...base, ...B.custom_system, id: 'custom', custom: true, signature_cards: [], identity: `Your own bundle, built on ${base.name}`,
      slots: Object.fromEntries(Object.entries(base.slots).map(([k, v]) => [k, {...v, ...((B.custom_system.slots || {})[k] || {})}]))};
  }
  return CB.catalog && CB.catalog.systems.find(s => s.id === id) || null;
};
CB.sysById = sysById;
const cardById = id => CB.catalog && CB.catalog.cards.find(c => c.id === id) || null;
const patById = id => CB.catalog && CB.catalog.patterns.find(p => p.id === id) || null;
CB.cardById = cardById; CB.patById = patById;
const K = k => { const aliases = {fam_switch: 'sys_switch', fam_switch_custom: 'sys_switch_custom', load_limit: 'load_threshold', load_per_drill: 'drill_load', attr_cap_season: 'season_cap'}; const constants = (CB.catalog && CB.catalog.constants) || {}; return constants[k] ?? constants[aliases[k]]; };
const famLevels = () => K('fam_levels') || [30, 60, 90];
const famLevel = f => { const L = famLevels(); return f >= L[2] ? 3 : f >= L[1] ? 2 : f >= L[0] ? 1 : 0; };
CB.famLevel = famLevel;

/* the preset you were playing → the system you start with */
const PRESET_SYSTEM = {'High Press': 'gegenpress', 'Possession': 'positional', 'Controlled': 'positional',
  'Counter Attack': 'counter_strike', 'Low Block': 'low_block', 'End-to-End': 'total_football'};
const SHAPE_SYSTEM = {'433': 'gegenpress', '4231': 'wing_overload', '4141': 'counter_strike'};
function defaultSystemId(){
  const plan = typeof activePlanName === 'function' && S.current ? activePlanName() : 'Balanced';
  const want = PRESET_SYSTEM[plan] || SHAPE_SYSTEM[S.current && S.current.formationId] || 'gegenpress';
  return sysById(want) ? want : CB.catalog.systems[0].id;
}
function starterDeck(systemId){
  const sys = sysById(systemId);
  return [...new Set((CB.catalog.starter_decks || {})[systemId] || [...(CB.catalog.starter_deck || []), ...((sys && sys.signature_cards) || [])])];
}
function blankBuild(systemId, fam){
  return {version: BUILD_VERSION, system_id: systemId, custom_system: null, familiarity: {[systemId]: fam},
    tp: {wallet: 0, carried: 0}, partnerships: [], deck: starterDeck(systemId), upgrades: {},
    set_pieces: {corner: null, free_kick: null, penalty: null, routine: 'auto'}, load: {}, trained_this_season: {},
    drills_this_season: {}, staff: {coach: 1, fitness: 1, analyst: 1, scout: 1, academy: 1},
    analyst_runs_left: 2, influence_rules_version: 1};
}
/* Career schema v2 (Core Loop v2): build + calendar + economy blocks.
   Versioned and idempotent: runs on every boot, only fills what's missing. */
const CAREER_SCHEMA = 2;
function migrateCareer(){
  const c = CC.ensureCareer();
  const fresh = !Object.keys(S.season.results || {}).length && (S.season.matchweek || 1) === 1;
  const migrated = [];
  if(!c.build || typeof c.build !== 'object'){
    const played = CC_livPlayed();
    const sid = defaultSystemId();
    // §12.3: default system from the current preset, starter deck, no partnerships;
    // the system you have been playing is already partly familiar
    c.build = blankBuild(sid, fresh ? 50 : Math.min(100, 50 + 4 * played));
    c.build.tp.wallet = fresh ? 0 : 6;
    migrated.push('build');
  }
  const B = c.build;
  if(B.version !== BUILD_VERSION){ B.version = BUILD_VERSION; migrated.push('build.version'); }
  const bb = blankBuild(B.system_id, 40);
  for(const k in bb) if(B[k] === undefined) B[k] = bb[k];
  B.staff = {...bb.staff, ...B.staff};
  if(!sysById(B.system_id) && B.system_id !== 'custom'){ B.system_id = defaultSystemId(); }
  if(!c.cal){
    c.cal = {phase: fresh ? 'preseason' : 'season', camp: 1, campDone: {}, friendlies: fresh ? makeFriendlies(c) : [],
      played: {}, weekDone: {}, janNotice: false, v: 1};
    if(fresh){ B.tp.wallet = 10; B.tp.carried = 0; c.cal.applyOnBoot = true; }
    migrated.push('calendar');
  }
  if(!c.econ){ c.econ = blankEcon(c.year); migrated.push('economy'); }
  if(!c.train) c.train = {};
  if(!c.market) c.market = {scouted: {}, requests: {}};
  if(!c.youth) c.youth = [];
  if(!c.renewals) c.renewals = {};
  // weeks already completed before the calendar existed count as done
  if(c.schema !== CAREER_SCHEMA){
    for(const w of weeks()) if(w.kind !== 'camp' && w.mws.every(mw => livDone(mw))) c.cal.weekDone[w.key] = true;
    for(const f of livFixtures()) if(S.season.results[f.id]) c.econ.done['mw:' + f.mw] = true;
    c.schema = CAREER_SCHEMA;
  }
  if(migrated.length) c.migratedAt = {from: c.v, to: CAREER_SCHEMA, parts: migrated, t: Date.now()};
  return migrated;
}
CB.migrateCareer = migrateCareer;
function CC_livPlayed(){ return livFixtures().filter(f => S.season.results[f.id]).length; }
const B = () => S.career.build;
CB.build = B;

/* ═══ 3. CAREER RULES — calendar, economy, windows, fog (tunable) ════════ */
/* Calendar §3.1 / §7.3: 4 camp weeks (3 friendlies), 38 matchweeks of which
   8 pairs are played in one week, summer + January windows.              */
const CAL = CB.CAL = {
  CAMP_WEEKS: 4,
  FRIENDLY_WEEKS: [2, 3, 4],
  FRIENDLY_POOL: ['BUR', 'SUN', 'LEE', 'WOL', 'FUL', 'BRE', 'BOU', 'CRY', 'EVE', 'WHU'],
  DOUBLE_PAIRS: [[12, 13], [14, 15], [16, 17], [18, 19], [31, 32], [33, 34], [35, 36], [37, 38]],
  SUMMER_OPEN_THROUGH_MW: 3,          // deadline day falls before matchweek 4
  JANUARY_MWS: [20, 21, 22],          // the January window: before MW20 → before MW22
  JANUARY_PREMIUM: 1.15,              // January asking prices
  MIDWEEK_RECOVERY: {flat: 4, frac: 0.2},   // between the two legs of a double week (vs 12 + 0.55·gap)
  REST_BONUS: 10,                     // "Rest" toggle: extra condition at the week's end
  LOAD_ENERGY_PEN: 0.05,              // load > limit: −5% starting energy
  LOAD_INJURY_MULT: 1.25              // … and a small injury-risk increase
};
const doubleOf = mw => CAL.DOUBLE_PAIRS.find(p => p.includes(mw)) || null;
CB.doubleOf = doubleOf;
function weeks(){
  const out = [];
  for(let i = 1; i <= CAL.CAMP_WEEKS; i++) out.push({key: 'camp' + i, kind: 'camp', camp: i, mws: []});
  for(let mw = 1; mw <= 38; mw++){
    const d = doubleOf(mw);
    if(d && d[1] === mw) continue;
    out.push({key: 'w' + mw, kind: d ? 'double' : 'single', mws: d ? d : [mw]});
  }
  return out;
}
CB.weeks = weeks;
const livFixtureOf = mw => livFixtures().find(f => f.mw === mw) || null;
const livDone = mw => { const f = livFixtureOf(mw); return !!(f && S.season.results[f.id]); };
function currentWeek(){
  const c = S.career;
  if(c.cal.phase === 'preseason') return weeks().find(w => w.camp === c.cal.camp) || weeks()[0];
  const nf = nextLivFixture();
  if(!nf) return weeks()[weeks().length - 1];
  return weeks().find(w => w.mws.includes(nf.mw));
}
CB.currentWeek = currentWeek;
function windowState(){
  const c = S.career; if(!c || !c.cal) return {open: true, name: 'Summer', premium: 1};
  if(c.cal.phase === 'preseason') return {open: true, name: 'Summer window', closes: `after matchweek ${CAL.SUMMER_OPEN_THROUGH_MW}`, premium: 1};
  const nf = nextLivFixture(), mw = nf ? nf.mw : 39;
  if(mw <= CAL.SUMMER_OPEN_THROUGH_MW) return {open: true, name: 'Summer window', closes: `after matchweek ${CAL.SUMMER_OPEN_THROUGH_MW}`, premium: 1};
  if(CAL.JANUARY_MWS.includes(mw)) return {open: true, name: 'January window', closes: `after matchweek ${CAL.JANUARY_MWS[CAL.JANUARY_MWS.length - 1] - 1}`, premium: CAL.JANUARY_PREMIUM, january: true};
  if(mw < CAL.JANUARY_MWS[0]) return {open: false, name: 'Window closed', opens: `January (before matchweek ${CAL.JANUARY_MWS[0]})`, premium: 1};
  return {open: false, name: 'Window closed', opens: 'next summer', premium: 1};
}
CB.windowState = windowState;
CC.askMult = () => windowState().premium || 1;
function makeFriendlies(c){
  const seed = hashStr(`friendlies|${(S.season || {}).seed}|${c.year}`);
  const pool = [...CAL.FRIENDLY_POOL];
  const out = [];
  CAL.FRIENDLY_WEEKS.forEach((wk, i) => {
    const opp = pool.splice((seed >>> (i * 3)) % pool.length, 1)[0];
    const d = new Date(c.year, 6, 12 + (wk - 1) * 7 + 3);
    out.push({id: `PRE${i + 1}-${c.year}-LIV-${opp}`, n: i + 1, camp_week: wk, opp, home: i % 2 === 0,
      date: d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'}), result: null});
  });
  return out;
}
/* fixture dates follow the calendar: double weeks get a midweek date */
function relabelFixtures(year){
  const wk = weeks().filter(w => w.kind !== 'camp');
  // 30 league weeks spread over mid-August → late May (international breaks
  // fall in the gaps), so December holds the double weeks and MW20 is January
  const span = 40;
  wk.forEach((w, i) => {
    const off = Math.round(i * (span - 1) / (wk.length - 1)) * 7;
    const sat = new Date(year, 7, 15 + off);
    w.mws.forEach((mw, j) => {
      const d = j === 0 ? sat : new Date(year, 7, 15 + off + 3);
      const label = d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'});
      for(const f of S.season.fixtures) if(f.mw === mw) f.date = label;
    });
  });
}
CB.relabelFixtures = relabelFixtures;

/* Economy §7.1 — all money in £m. Income: TV (flat share per league match +
   merit by final position), gate receipts per home match (club size × form ×
   opponent), prize money, sales; commercial accrues weekly. Costs: wages
   weekly, fees up front or in 2 instalments, staff, scouting.             */
const ECON = CB.ECON = {
  TV_FLAT_SEASON: 100,                // equal share, paid 1/38 per league match
  TV_MERIT_PER_PLACE: 3.0,            // (21 − position) × 3.0 at season end
  GATE_PER_HOME: {1: 5.4, 2: 3.8, 3: 2.6, 4: 1.8},   // by club stature (Liverpool = 1)
  GATE_FORM_SPAN: 0.12,               // last-5 form moves the gate ±12%
  GATE_BIG_OPP: 1.08,                 // stature-1 visitors sell out
  FRIENDLY_GATE: 1.2,                 // a home pre-season friendly
  PRIZE: pos => pos === 1 ? 25 : pos <= 4 ? 15 : pos <= 6 ? 7 : pos <= 7 ? 3 : 0,
  SEASON_WEEKS: 34,                   // calendar weeks in a season (4 camp + 30 league); annual flows are spread over them
  INSTALMENT_SPLIT: 0.5,              // 2 instalments: half now, half at the next window
  WAGE_WARN: 0.80, WAGE_FREEZE: 0.90, // board: wage bill / projected revenue
  SCOUT_FEE: 0.25, SCOUT_WEEKS: 1,
  YOUTH_WAGE_K: 8,
  BUDGET_BASE_SHARE: 0.7,             // next budget = base × 0.7 + finish bonus + 30% of what's left + reputation
  REPUTATION_BUDGET: 0.6              // £m of budget per reputation point above 50
};
function blankEcon(year){
  return {year, income: {tv_flat: 0, tv_merit: 0, gate: 0, prize: 0, commercial: 0, sales: 0},
    costs: {wages: 0, running: 0, transfers: 0, instalments: 0, staff: 0, scouting: 0}, log: [], instalments: [], done: {}, reputation: 60, warned: null};
}
function econ(){ return S.career.econ; }
function book(kind, key, amt, text, group, ledgerOnly){
  const E = econ();
  const tgt = group === 'income' ? E.income : E.costs;
  tgt[key] = r2((tgt[key] || 0) + amt);
  if(!ledgerOnly) S.finance.cashBalance = r2(S.finance.cashBalance + (group === 'income' ? amt : -amt));
  E.log.unshift({t: Date.now(), wk: (currentWeek() || {}).key, kind, key, amt: r2(group === 'income' ? amt : -amt), text});
  E.log = E.log.slice(0, 80);
}
CB.book = book;
const commercialAnnual = () => (S.finance.revenues['Commercial & sponsorship'] || 0) + (S.finance.revenues['Merchandise'] || 0);
const stature = id => ({MCI:1, ARS:1, LIV:1, CHE:1, NEW:2, TOT:2, AVL:2, MUN:2, WOL:4, LEE:4, BUR:4, SUN:4})[id] || 3;
function gateFor(f, friendly){
  const base = ECON.GATE_PER_HOME[stature(LIV)] * (friendly ? ECON.FRIENDLY_GATE / ECON.GATE_PER_HOME[stature(LIV)] : 1);
  if(friendly) return r2(ECON.FRIENDLY_GATE);
  const form = livFixtures().filter(x => S.season.results[x.id] && x.mw < f.mw).slice(-5).map(x => {
    const r = S.season.results[x.id], gf = x.home === LIV ? r.score[0] : r.score[1], ga = x.home === LIV ? r.score[1] : r.score[0];
    return gf > ga ? 1 : gf === ga ? 0 : -1; });
  const fm = form.length ? sum(form) / form.length : 0;
  const opp = f.home === LIV ? f.away : f.home;
  return r2(base * (1 + ECON.GATE_FORM_SPAN * fm) * (stature(opp) === 1 ? ECON.GATE_BIG_OPP : 1));
}
CB.gateFor = gateFor;
/* the annual wage bill is paid over the season's calendar weeks */
function weeklyWages(){ return r2(financeSnapshot().weeklyK * 52 / 1000 / ECON.SEASON_WEEKS); }
const runningAnnual = () => (S.finance.coachWagesAnnual || 0) + (S.finance.agentFeesAnnual || 0) + (S.finance.otherFootballCostsAnnual || 0);
/* projected season revenue: what the board budgets wages against */
function projectedRevenue(){
  const row = livRow(), pos = row.p ? row.pos : Math.max(1, (S.career.board.objective || {}).min || 4);
  return r1(ECON.TV_FLAT_SEASON + ECON.TV_MERIT_PER_PLACE * (21 - pos) + ECON.GATE_PER_HOME[stature(LIV)] * 19 + commercialAnnual() + ECON.PRIZE(pos));
}
/* All career finance reads use the current calendar revenue forecast. */
const _financeSnapshotV2 = window.financeSnapshot;
window.financeSnapshot = function(){
  const snap = _financeSnapshotV2.apply(this, arguments);
  if(!S.career || !S.career.econ || !S.career.cal) return snap;
  const revenue = projectedRevenue(), den = revenue + (S.finance.netSalePL || 0);
  const scr = snap.squadCost / Math.max(1, den);
  return {...snap, revenue, den, scr, headroom: ECON.WAGE_WARN * den - snap.squadCost,
    status: scr > ECON.WAGE_FREEZE ? 'Critical' : scr > ECON.WAGE_WARN ? 'Watch' : 'Comfortable',
    projectedProfit: den - snap.squadCost - (S.finance.otherFootballCostsAnnual || 0)};
};
/* The board's measure is the squad cost ratio the Club screen already
   shows (wages + coach wages + agent fees + transfer amortisation, over
   football revenue + sale profit): big fees and big wages both push it. */
function wageRatio(extraWeeklyK = 0, extraAmort = 0){
  const snap = financeSnapshot();
  return (snap.squadCost + extraWeeklyK * 52 / 1000 + extraAmort) / Math.max(1, projectedRevenue() + (S.finance.netSalePL || 0));
}
CB.projectedRevenue = projectedRevenue; CB.wageRatio = wageRatio;
function boardLimits(extraWeeklyK = 0, extraAmort = 0){
  const r = wageRatio(extraWeeklyK, extraAmort);
  return {ratio: r, warn: r > ECON.WAGE_WARN, freeze: r > ECON.WAGE_FREEZE, budget: S.finance.transferBudget};
}
CB.boardLimits = boardLimits;
/* one calendar week of money (idempotent per week key) */
function econWeek(w){
  const E = econ(), key = 'week:' + w.key;
  if(E.done[key]) return;
  const wages = weeklyWages();
  book('wages', 'wages', wages, `Wages · ${weekLabel(w)}`, 'cost');
  book('running', 'running', r2(runningAnnual() / ECON.SEASON_WEEKS), `Coaches, agents & running costs · ${weekLabel(w)}`, 'cost');
  book('commercial', 'commercial', r2(commercialAnnual() / ECON.SEASON_WEEKS), `Commercial & merchandise · ${weekLabel(w)}`, 'income');
  E.done[key] = true;
}
/* your league match: TV share, gate receipts, instalments due */
function econMatch(f){
  const E = econ(), key = 'mw:' + f.mw;
  if(E.done[key]) return;
  book('tv', 'tv_flat', r2(ECON.TV_FLAT_SEASON / 38), `TV equal share · MW${f.mw}`, 'income');
  if(f.home === LIV) book('gate', 'gate', gateFor(f), `Gate receipts v ${clubName(f.away)} · MW${f.mw}`, 'income');
  for(const it of E.instalments) if(!it.paid && f.mw >= it.due_mw){
    it.paid = true; book('instalment', 'instalments', it.amt, `Second instalment · ${it.name}`, 'cost'); }
  E.done[key] = true;
  ratioCheck();
}
function ratioCheck(){
  const E = econ(), L = boardLimits(), lvl = L.freeze ? 'freeze' : L.warn ? 'warn' : null;
  if(lvl && E.warned !== lvl){
    E.warned = lvl;
    S.career.notices.unshift({kind: 'board-bad', mw: S.season.matchweek, text: lvl === 'freeze'
      ? `The board has frozen signings: squad costs are ${Math.round(L.ratio * 100)}% of revenue (limit ${Math.round(ECON.WAGE_FREEZE * 100)}%). Sell to lift it.`
      : `Board warning: squad costs have reached ${Math.round(L.ratio * 100)}% of revenue. Above ${Math.round(ECON.WAGE_FREEZE * 100)}% they freeze signings.`});
  } else if(!lvl) E.warned = null;
}
CB.ratioCheck = ratioCheck;
const weekLabel = w => w.kind === 'camp' ? `camp week ${w.camp}` : w.mws.length > 1 ? `MW${w.mws[0]}–${w.mws[1]}` : `MW${w.mws[0]}`;
CB.weekLabel = weekLabel;

/* Scouting fog §7.4: unscouted attributes show as ranges; the range is
   not centred on the truth (a fixed per-player offset) so its middle
   doesn't give the value away.                                            */
const FOG_BY_SCOUT = {1: 6, 2: 4, 3: 2};
function fogWidth(){ return FOG_BY_SCOUT[(B() && B().staff.scout) || 1] || 6; }
function isScouted(pid){ const m = S.career.market; return !!(m.scouted[pid] || (P(pid) && P(pid).clubId === LIV)); }
function fogRange(pid, key, v){
  if(isScouted(pid)) return null;
  const w = fogWidth(), u = hashStr(`${pid}|${key}|fog|${S.career.year}`) % (2 * w + 1);
  const lo = Math.round(v - u), hi = Math.round(v + (2 * w - u));
  return [clamp(lo, 1, 99), clamp(hi, 1, 99)];
}
CB.fogRange = fogRange; CB.isScouted = isScouted;
const fogTxt = (pid, key, v) => { const r = fogRange(pid, key, v); return r ? `${r[0]}–${r[1]}` : String(Math.round(v)); };
CB.fogTxt = fogTxt;

/* ═══ 4. TRAINING DELTAS ON THE REGISTRY + request payloads ══════════════ */
const _applyCareer = CC.applyCareerToPlayers;
function applyTraining(){
  const t = S.career && S.career.train; if(!t) return;
  for(const [pid, d] of Object.entries(t)){
    const pl = BY_ID[pid]; if(!pl) continue;
    const a = {...pl.a};
    for(const [k, v] of Object.entries(d)) a[k] = r2(clamp((a[k] ?? 50) + v, 1, 99));
    pl.a = a;
  }
}
CC.applyCareerToPlayers = function(){ const r = _applyCareer.apply(this, arguments); applyTraining(); return r; };
CB.reapply = () => { CC.applyCareerToPlayers(); };
const sq = pl => ({...serializePlayer(pl), cond: Math.round(CC.condOf(pl.id))});
CB.squadPayload = (extra = []) => [...clubPool().map(sq), ...extra.map(pl => ({...serializePlayer(pl), cond: 100}))];
const xiNow = () => Object.fromEntries(curForm().slots.map(s => [s.id, S.current.starters[s.id] || null]));

/* ═══ 5. EVALUATE CACHE — one call per (system, XI, squad state) ═════════ */
let _evalSeq = 0;
const _eval = {key: null, data: null, pending: null};
function evalKey(sid, xi, extra){
  const tv = S.career.trainV || 0;
  return [sid, B().custom_system ? JSON.stringify(B().custom_system) : '', JSON.stringify(xi), tv, JSON.stringify(B().partnerships.map(p => [p.id, p.fam])),
    JSON.stringify(B().familiarity), clubPool().map(p => p.id + ':' + Math.round(CC.condOf(p.id))).join(','), (extra || []).map(p => p.id).join(',')].join('|');
}
async function evaluateNow(opts = {}){
  const sid = opts.system_id || B().system_id;
  const sys = sysById(sid);
  const xi = opts.xi || (sys && sys.formation === S.current.formationId ? xiNow() : mapXIToSystem(sys));
  const key = evalKey(sid, xi, opts.extra);
  if(!opts.extra && _eval.key === key && _eval.data) return _eval.data;
  if(!opts.extra && _eval.key === key && _eval.pending) return _eval.pending;
  const body = {squad: CB.squadPayload(opts.extra || []), xi, bench: S.current.bench, system_id: sid, build: B()};
  const p = BAPI.evaluate(body).then(d => { d._xi = xi; d._key = key; if(!opts.extra){ _eval.data = d; _eval.pending = null; } return d; })
    .catch(e => { if(!opts.extra) _eval.pending = null; throw e; });
  if(!opts.extra){ _eval.key = key; _eval.pending = p; _eval.data = null; }
  return p;
}
CB.evaluateNow = evaluateNow;
CB.lastEval = () => _eval.data;
/* the current XI laid onto another system's slots (for previews) */
function mapXIToSystem(sys){
  if(!sys) return xiNow();
  if(sys.formation === S.current.formationId) return xiNow();
  const ids = startingIds().map(P).filter(Boolean);
  const xi = CC.bestXI ? CC.bestXI(ids, formationOf(sys.formation).slots) : {};
  return Object.fromEntries(formationOf(sys.formation).slots.map(s => [s.id, xi[s.id] || null]));
}
CB.mapXIToSystem = mapXIToSystem;

/* ═══ 6. SYSTEM SELECTION — apply, switch cost, custom ═══════════════════ */
function applySystemToSquad(sys, opts = {}){
  if(!sys || isLiveMatch()) return;
  if(S.current.formationId !== sys.formation) setFormation(sys.formation);
  S.current.tactics = {...PRESETS.Balanced, ...sys.tactics};
  for(const sl of curForm().slots){
    const pid = S.current.starters[sl.id], d = sys.slots[sl.id]; if(!pid || !d) continue;
    const r = rolesFor(sl.position);
    const ins = S.current.playerInstructions[pid] = {...(DEFAULT_INSTR[sl.position] || DEFAULT_INSTR.CM)};
    if(r.atk.includes(d.attackRole)) ins.attackRole = d.attackRole;
    if(r.def.includes(d.defenseRole)) ins.defenseRole = d.defenseRole;
    if(d.attackEffort != null) ins.attackEffort = d.attackEffort;
    if(d.defenseEffort != null) ins.defenseEffort = d.defenseEffort;
  }
  if(!opts.quiet){ saveState(); }
}
CB.applySystemToSquad = applySystemToSquad;
function systemApplied(){
  const sys = sysById(B().system_id); if(!sys) return true;
  if(sys.formation !== S.current.formationId) return false;
  return Object.entries(sys.tactics).every(([k, v]) => S.current.tactics[k] === v) && Object.entries(sys.slots).every(([slot, role]) => { const pid = S.current.starters[slot], ins = S.current.playerInstructions[pid]; return !pid || !!ins && ['attackRole','attackEffort','defenseRole','defenseEffort'].every(k => role[k] == null || ins[k] === role[k]); });
}
CB.systemApplied = systemApplied;
/* §5.4: a switch drops the new system's familiarity to 40 (20 custom) */
function switchCost(newId){
  const cur = B().system_id, fam = B().familiarity;
  if(newId === cur) return null;
  const drop = newId === 'custom' ? (K('fam_switch_custom') ?? 20) : (K('fam_switch') ?? 40);
  const now = fam[newId] ?? drop;
  return {from: fam[cur] ?? 40, to: Math.min(now, drop), drop};
}
CB.switchCost = switchCost;
function chooseSystem(newId){
  if(isLiveMatch()) return liveBlocked('Finish the live match before switching your system.');
  const b = B(), sw = switchCost(newId);
  if(sw){
    b.familiarity[newId] = sw.to;
    const old = sysById(b.system_id);
    // signature cards follow the system
    const oldSig = new Set((old && old.signature_cards) || []);
    b.deck = b.deck.filter(id => !oldSig.has(id));
    b.system_id = newId;
    const ns = sysById(newId);
    for(const id of (ns && ns.signature_cards) || []) if(!b.deck.includes(id)) b.deck.push(id);
    S.career.notices.unshift({kind: 'system', mw: S.season.matchweek, text: `New system: ${ns ? ns.name : newId}. Familiarity starts at ${sw.to} and grows every week you stick with it.`});
  }
  applySystemToSquad(sysById(newId));
  CC.saveCareer(); saveState();
  TL.bus.dispatchEvent(new CustomEvent('build:system', {detail: {system_id: newId}}));
}
CB.chooseSystem = chooseSystem;

/* ═══ 7. WEEK JOURNAL — money + build tick, exactly once per step ════════
   coach-career commits your result, the recovery tick and the matchweek in
   one synchronous save and then fires 'career:result' in the same task; the
   money for the match is booked there too (same task → no tab-close gap).
   The build week tick is a server call: its request is journaled first
   (cal.pendingTick), and only its answer + the 'done' mark are saved
   together — on boot a pending tick is simply re-asked (deterministic).  */
function recordLineup(fid, isFriendly){
  const c = S.career;
  c.cal.played[fid] = {xi: startingIds(), system_id: B().system_id, friendly: !!isFriendly};
}
function weekLineups(w){
  const c = S.career, L = [];
  if(w.kind === 'camp'){ const fr = c.cal.friendlies.find(x => x.camp_week === w.camp); if(fr && c.cal.played[fr.id] && fr.result) L.push(c.cal.played[fr.id]); }
  else for(const mw of w.mws){ const f = livFixtureOf(mw); if(f && c.cal.played[f.id]) L.push(c.cal.played[f.id]); }
  return L.map(x => ({xi: x.xi, system_id: x.system_id}));
}
const tickQ = () => (S.career.cal.tickQueue = S.career.cal.tickQueue || []);
function queueWeekTick(w){
  const c = S.career;
  if(c.cal.weekDone[w.key] || tickQ().some(t => t.key === w.key)) return;
  econWeek(w);
  // rested players recover extra (§5.1 Rest toggle)
  for(const pid of Object.keys(B().rest || {})) if(P(pid)) c.cond[pid] = Math.min(100, CC.condOf(pid) + CAL.REST_BONUS);
  tickQ().push({key: w.key, kind: w.kind, lineups: weekLineups(w), t: Date.now()});
  CC.saveCareer(); saveState();
  return runPendingTick();
}
let _tickP = null;
async function runPendingTick(){
  if(_tickP) return _tickP;
  if(!tickQ().length) return;
  _tickP = (async () => {
    while(tickQ().length){
      const pt = tickQ()[0], before = deep(B());
      let res;
      try{
        res = await BAPI.weekTick({squad: CB.squadPayload(), build: before, lineups_played: pt.lineups, week_kind: pt.kind, midweek: pt.kind === 'double'});
      }catch(e){ console.warn('[coach-build] week tick', e); setTimeout(runPendingTick, 4000); return; }
      if(!tickQ().length || tickQ()[0].key !== pt.key) continue;
      const nb = res.build, b = B();
      for(const k of ['familiarity', 'partnerships', 'tp', 'load', 'analyst_runs_left', 'rest', 'trained_this_season', 'drills_this_season'])
        if(nb[k] !== undefined) b[k] = nb[k];
      for(const pp of b.partnerships){ const old = (before.partnerships || []).find(x => x.id === pp.id);
        if(old && famLevel(pp.fam) > famLevel(old.fam)) celebrateLevel(pp, famLevel(pp.fam)); }
      unlockCombos();
      scoutingTick();
      S.career.cal.weekDone[pt.key] = true;
      tickQ().shift();
      S.career.cal.lastTick = {key: pt.key, log: res.log || [], t: Date.now()};
      CC.saveCareer(); saveState();                 // answer + done mark in one save
      TL.bus.dispatchEvent(new CustomEvent('build:week', {detail: {week: pt.key}}));
    }
    if(['home', 'build', 'training', 'schedule'].includes(S.ui.view)) rerender();
  })().finally(() => { _tickP = null; });
  return _tickP;
}
CB.runPendingTick = runPendingTick;
CB.queueWeekTick = queueWeekTick;
CB.tickBusy = () => !!_tickP || !!(S.career && S.career.cal && (S.career.cal.tickQueue || []).length);
/* after your league result (same task as the commit) */
TL.bus.addEventListener('career:result', ev => {
  try{
    const f = S.season.fixtures.find(x => x.id === ev.detail.fixtureId); if(!f || !S.career.cal) return;
    if(S.career.cal.phase === 'preseason') S.career.cal.phase = 'season';
    econMatch(f);
    CC.saveCareer(); saveState();
    const w = weeks().find(x => x.mws.includes(f.mw));
    if(w && w.mws[w.mws.length - 1] === f.mw) queueWeekTick(w);
    if(f.mw === CAL.JANUARY_MWS[0] - 1 && !S.career.cal.janNotice){
      S.career.cal.janNotice = true;
      S.career.notices.unshift({kind: 'window', mw: f.mw + 1, text: `The January window is open until matchweek ${CAL.JANUARY_MWS[CAL.JANUARY_MWS.length - 1]}. Prices are ${Math.round((CAL.JANUARY_PREMIUM - 1) * 100)}% higher — a short, expensive chance to fix the build.`});
      CC.saveCareer();
    }
  }catch(e){ console.warn('[coach-build] result hook', e); }
});
/* resume: any played week whose money or tick never happened */
function resumeJournal(){
  const c = S.career;
  for(const f of livFixtures()) if(S.season.results[f.id] && !c.econ.done['mw:' + f.mw]) econMatch(f);
  for(const w of weeks()){
    if(w.kind === 'camp') continue;
    if(!c.cal.weekDone[w.key] && w.mws.every(livDone)) queueWeekTick(w);
  }
  runPendingTick();
}
CB.resumeJournal = resumeJournal;

/* ═══ 8. CAREER HOOKS (coach-career.js calls these) ══════════════════════ */
CC.recoveryFor = mw => { const d = doubleOf(mw); return d && d[0] === mw ? CAL.MIDWEEK_RECOVERY : {flat: 12, frac: 0.55}; };
const overLoad = pid => { const b = S.career && S.career.build; return !!(b && (b.load || {})[pid] > (K('load_limit') ?? 12)); };
CC.kickCond = (pid, c) => overLoad(pid) ? c * (1 - CAL.LOAD_ENERGY_PEN) : c;
CC.injuryMult = pid => overLoad(pid) ? CAL.LOAD_INJURY_MULT : 1;
CC.relabelFixtures = relabelFixtures;
CC.afterFriendlyView = () => 'schedule';
/* CPU identity → system (+ its deck), per club */
const PLAN_SYSTEMS = {'High Press': ['gegenpress'], 'Possession': ['positional'], 'Controlled': ['positional', 'wing_overload'],
  'Balanced': ['inside_forwards', 'wing_overload', 'target_man'], 'Counter Attack': ['counter_strike'], 'Low Block': ['low_block'], 'End-to-End': ['total_football', 'gegenpress']};
function cpuSystemFor(clubId){
  if(!CB.catalog) return null;
  const club = clubById(clubId), shape = CC.shapeFor(clubId);
  const want = (PLAN_SYSTEMS[club.plan] || ['inside_forwards']).map(sysById).filter(Boolean);
  const same = want.find(s => s.formation === shape) || want[0] || CB.catalog.systems.find(s => s.formation === shape);
  return same || null;
}
CB.cpuSystemFor = cpuSystemFor;
CC.cpuFormationFor = id => { const sys = cpuSystemFor(id); return sys && sys.formation; };
function cpuBuildFor(clubId){
  const sys = cpuSystemFor(clubId); if(!sys) return null;
  return {system_id: sys.id, difficulty: 'normal', deck: starterDeck(sys.id)};
}
CC.cpuBuilds = o => { const h = cpuBuildFor(o.home), a = cpuBuildFor(o.away); return h && a ? {HOME: h, AWAY: a} : undefined; };

/* ── public surface for ui-match (docs/v2_progress/ui-build.md) ─────────── */
TL.build = {
  ready: null,
  state: () => S.career && S.career.build,
  catalog: () => CB.catalog,
  system: () => S.career && sysById(S.career.build.system_id),
  deck: () => (B().deck || []).map(cardById).filter(Boolean),
  kickoffBuild: () => deep(B()),
  setAnalystRuns: n => { if(n != null){ B().analyst_runs_left = n; CC.saveCareer(); } },
  cpuBuildFor,
  /* Ghost League entry: your side as a StartRequest team + your build (hand: pass yours) */
  ghostSnapshot: (hand) => ({team: livSideForRequest(), build: {...TL.build.kickoffBuild(), hand: hand || []}}),
  evaluate: evaluateNow,
  lastEval: () => _eval.data
};

/* ── kick-off: remember the XI that played (week tick credit) ──────────── */
const _kick = window.kickOff;
window.kickOff = async function(){
  const f = S.matchFixture;
  const r = await _kick.apply(this, arguments);
  try{ if(S.match && f && (f.friendly || !f.exhibition) && S.career && S.career.cal){ recordLineup(f.id, !!f.friendly); CC.saveCareer(); } }catch(e){ console.warn(e); }
  return r;
};

/* ── league fixtures during camp: starting one ends camp ───────────────── */
const _startFix = window.startFixture;
window.startFixture = function(fid){
  const c = S.career;
  if(c && c.cal && c.cal.phase === 'preseason' && S.season.fixtures.some(f => f.id === fid)){
    endCamp(true);
  }
  return _startFix.apply(this, arguments);
};

/* ═══ 9. PRE-SEASON CAMP + FRIENDLIES ════════════════════════════════════ */
function campFriendly(week){ return (S.career.cal.friendlies || []).find(fr => fr.camp_week === week) || null; }
function friendlyFixture(fr){
  return {id: fr.id, mw: 0, home: fr.home ? LIV : fr.opp, away: fr.home ? fr.opp : LIV, date: fr.date,
    exhibition: true, friendly: true, n: fr.n, camp_week: fr.camp_week};
}
CB.playFriendly = function(id){
  const fr = S.career.cal.friendlies.find(x => x.id === id); if(!fr || fr.result) return;
  if(isLiveMatch()) return toast('Finish the current match first.');
  S.matchFixture = friendlyFixture(fr);
  show('match');
};
/* quick-sim a friendly (same engine, no watching) */
CB.simFriendly = async function(id){
  const fr = S.career.cal.friendlies.find(x => x.id === id); if(!fr || fr.result) return;
  const f = friendlyFixture(fr);
  if(startingIds().length < 11) return toast('Pick a full XI first.');
  fr.simming = true; rerender();
  try{
    const req = buildV07MatchRequest(f); req.mode = 'full';
    const kb = TL.build.kickoffBuild(), cb = cpuBuildFor(fr.opp);
    if(await CC.hasRoute('/build/catalog')){ req.build = kb; req.build_team = fr.home ? 'HOME' : 'AWAY'; if(cb) req.cpu_build = cb; }
    recordLineup(f.id, true);
    const res = await api('/matches/start', {method: 'POST', body: req});
    const ft = res.full_time || (res.snapshot && res.snapshot.full_time);
    CC.onFriendlyFT(f, {fullTime: ft, matchId: res.match_id});
  }catch(e){ toast('Friendly failed: ' + e.message); }
  fr.simming = false; rerender();
};
CC.onFriendlyFT = function(f, m){
  const c = S.career, fr = c.cal.friendlies.find(x => x.id === f.id); if(!fr || fr.result || !m.fullTime) return;
  const ft = m.fullTime, livHome = f.home === LIV;
  const gf = livHome ? ft.score.home : ft.score.away, ga = livHome ? ft.score.away : ft.score.home;
  fr.result = {score: [ft.score.home, ft.score.away], gf, ga, matchId: m.matchId || null};
  // condition: the minutes are real (lighter than a league match: camp squads rotate)
  const team = livHome ? 'HOME' : 'AWAY';
  for(const [pid, ps] of Object.entries(ft.player_stats || {})){
    if(ps.team_id !== team || !P(pid) || !(ps.minutes > 0)) continue;
    const start = CC.condOf(pid), drain = Math.max(0, start - (ps.energy ?? start));
    c.cond[pid] = Math.round(clamp(start - drain * 0.6, 40, 100));
  }
  if(f.home === LIV) book('gate', 'gate', gateFor(f, true), `Friendly gate v ${clubName(fr.opp)}`, 'income');
  c.notices.unshift({kind: 'result', mw: 0, text: `Friendly: ${gf > ga ? 'beat' : gf < ga ? 'lost to' : 'drew with'} ${clubName(fr.opp)} ${gf}–${ga}. The minutes count for partnerships and system familiarity.`});
  CC.saveCareer(); saveState();
  if(CC.refreshFtBanner) CC.refreshFtBanner();
};
/* finish the current camp week: money + build tick, then the next week */
CB.finishCampWeek = async function(){
  const c = S.career; if(c.cal.phase !== 'preseason') return;
  if(CB.tickBusy()) return toast('The staff are still wrapping up the week…');
  const wk = c.cal.camp, w = weeks().find(x => x.camp === wk);
  queueWeekTick(w);
  await runPendingTick();
  if(wk >= CAL.CAMP_WEEKS){ endCamp(false); }
  else { c.cal.camp = wk + 1; CC.saveCareer(); saveState(); toast(`Camp week ${wk + 1} — ${B().tp.wallet} TP to spend`); }
  rerender();
};
function endCamp(skipped){
  const c = S.career; if(c.cal.phase !== 'preseason') return;
  c.cal.phase = 'season';
  c.notices.unshift({kind: 'season', mw: 1, text: skipped ? `Pre-season camp cut short — straight into matchweek 1.` : `Pre-season camp complete. The league starts now.`});
  if(skipped){
    // the weeks still pass: wages and commercial income for the skipped camp weeks
    for(const w of weeks().filter(x => x.kind === 'camp' && !c.cal.weekDone[x.key])){ econWeek(w); c.cal.weekDone[w.key] = true; }
    B().tp.wallet = Math.min(B().tp.wallet, K('tp_carry_cap') ?? 10); toast('Pre-season camp ended — on to matchweek 1'); }
  CC.saveCareer(); saveState();
}
CB.endCamp = endCamp;

/* ═══ 10. SEASON END / NEW SEASON ════════════════════════════════════════ */
CC.onSeasonEnd = function(se){
  const E = econ(), key = 'season:' + se.year;
  if(E.done[key]) return;
  const merit = r1(ECON.TV_MERIT_PER_PLACE * (21 - se.pos)), prize = ECON.PRIZE(se.pos);
  book('tv', 'tv_merit', merit, `TV merit payment · ${ordinal(se.pos)}`, 'income');
  if(prize) book('prize', 'prize', prize, `Prize money · ${ordinal(se.pos)}`, 'income');
  const o = se.objective;
  const rep0 = E.reputation ?? 60;
  const d = se.verdict === 'exceeded' ? 8 : se.verdict === 'met' ? 3 : se.verdict === 'missed' ? -4 : -9;
  E.reputation = clamp(rep0 + d + (se.pos <= 4 ? 2 : 0), 20, 99);
  se.econ = {merit, prize, reputation: [rep0, E.reputation], income: deep(E.income), costs: deep(E.costs)};
  se.growth = seasonGrowth();
  se.youth = youthIntake(se.year);
  se.contracts = expiringContracts(se.year);
  E.done[key] = true;
};
function seasonGrowth(){
  const c = S.career, rows = [];
  for(const pl of clubPool()){
    const tr = c.train[pl.id] || {}, dv = (c.dev[pl.id] || {}).a || {};
    const tot = {}; for(const [k, v] of Object.entries(tr)) tot[k] = (tot[k] || 0) + v; for(const [k, v] of Object.entries(dv)) tot[k] = (tot[k] || 0) + v;
    const t = r1(sum(Object.values(tot))); if(Math.abs(t) < 0.5) continue;
    const top = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({k, v: r1(v)}));
    rows.push({pid: pl.id, name: pl.name, total: t, top, trained: r1(sum(Object.values(tr)))});
  }
  return rows.sort((a, b) => b.total - a.total).slice(0, 10);
}
/* academy intake: fictional prospects generated from the save seed */
const YOUTH_N = {1: 2, 2: 3, 3: 4}, YOUTH_POT = {1: [70, 80], 2: [74, 84], 3: [78, 89]};
function youthIntake(year){
  const lvl = B().staff.academy || 1, n = YOUTH_N[lvl] || 2, [plo, phi] = YOUTH_POT[lvl] || [70, 80];
  const pos = ['CB', 'CM', 'LW', 'ST', 'RB', 'CDM', 'GK', 'CAM', 'RW', 'LB'];
  const out = [];
  for(let i = 0; i < n; i++){
    const h = hashStr(`youth|${S.career.seasonSeed}|${year}|${i}`);
    out.push({id: `liv_ya_${year}_${i}`, pos: pos[(h >>> 3) % pos.length], pot: plo + (h % (phi - plo + 1)), seed: h, year, signed: false});
  }
  return out;
}
function expiringContracts(year){
  // contracts in the base game are dated from 2026; ending next summer = at most 1 year left
  return clubPool().filter(pl => pl.contract && pl.contract.contractEndSeason <= year + 1)
    .map(pl => ({pid: pl.id, name: pl.name, age: pl.age, ovr: pl.ovr, wage: pl.contract.weeklyWage, end: pl.contract.contractEndSeason}));
}
CB.renew = function(pid){
  const pl = P(pid); if(!pl || !pl.contract) return;
  const wage = Math.round(pl.contract.weeklyWage * 1.12);
  if(boardLimits((wage - pl.contract.weeklyWage)).freeze) return toast('The board won\'t sanction that raise — wages are over the limit.');
  pl.contract.weeklyWage = wage; pl.contract.contractEndSeason = Math.max(pl.contract.contractEndSeason, S.career.year + 1) + 3;
  S.career.renewals[pid] = {wage, end: pl.contract.contractEndSeason, year: S.career.year};
  (S.career.contractOv = S.career.contractOv || {})[pid] = {weeklyWage: wage, contractEndSeason: pl.contract.contractEndSeason};
  const se = S.career.seasonEnd; if(se && se.contracts) se.contracts = se.contracts.filter(x => x.pid !== pid);
  CC.saveCareer(); saveState(); toast(`${shortName(pl.name)} signs a new deal to ${pl.contract.contractEndSeason} — ${fmtK(wage)}`); rerender();
};
CB.release = function(pid){
  const pl = P(pid); if(!pl) return;
  if(!confirm(`Let ${pl.name} go? He leaves on a free when the new season starts.`)) return;
  S.career.renewals[pid] = {released: true, year: S.career.year};
  CC.saveCareer(); rerender();
};
CB.signYouth = function(id){
  const se = S.career.seasonEnd, y = se && (se.youth || []).find(x => x.id === id); if(!y || y.signed) return;
  y.signed = true; S.career.youth.push({...y}); injectYouth(); CC.saveCareer(); saveState();
  toast(`${P(id) ? P(id).name : 'Prospect'} signs his first professional contract`); rerender();
};
/* academy players are rebuilt on every boot from their stored seed */
function youthPlayer(y){
  const r = (() => { let a = y.seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
  const base = CC.buildSide ? null : null;
  const tgt = 60 + Math.round(r() * 6);
  const a = {};
  const keys = ['acc','spr','agi','rea','bco','bln','dri','sps','lps','vis','cro','fin','apo','shp','lsh','vol','hea','daw','sta','sli','int','str','stam','agg','jum','fka','pen','cmp','cur','gkd','gkh','gkk','gkp','gkr'];
  const gk = y.pos === 'GK';
  for(const k of keys) a[k] = Math.round(clamp(gk ? (k.startsWith('gk') ? tgt + 2 : 35 + r() * 20) : (k.startsWith('gk') ? 8 + r() * 6 : tgt - 6 + r() * 14), 5, 90));
  const first = ['Jamie','Kian','Lewis','Tyler','Mason','Rhys','Oscar','Theo','Kai','Luca'][y.seed % 10], last = ['Hughes','Doyle','Carroll','Rowe','McAllister','Owens','Finch','Leigh','Morrow','Bell'][(y.seed >>> 5) % 10];
  const ovr = Math.round(CC.posRating(a, y.pos));
  return {id: y.id, name: `${first} ${last}`, pos: y.pos, elig: [y.pos], clubId: LIV, rank: null, ovr, pot: Math.max(ovr + 6, y.pot), age: 17,
    ht: 172 + (y.seed % 18), wt: 68 + (y.seed % 12), foot: y.seed % 4 ? 'R' : 'L', wf: 2 + (y.seed % 3), sm: 2, side: /^L/.test(y.pos) ? 'L' : /^R/.test(y.pos) ? 'R' : 'C',
    face: [a.spr, a.fin, a.sps, a.dri, a.daw, a.str].map(Math.round), a, fictional: true, academy: true,
    contract: {weeklyWage: ECON.YOUTH_WAGE_K, contractEndSeason: y.year + 3, signedFee: 0, remainingBookValue: 0, squadRole: 'Squad'}};
}
function injectYouth(){
  for(const y of (S.career.youth || [])){
    if(BY_ID[y.id]) continue;
    const pl = youthPlayer(y);
    PLAYERS.push(pl); BY_ID[pl.id] = pl;
    CC.PRISTINE[pl.id] = {aRef: pl.a, a: {...pl.a}, ovr: pl.ovr, pot: pl.pot, age: pl.age - ((S.career.year || 2026) - y.year), face: [...pl.face], club: LIV};
  }
}
CB.injectYouth = injectYouth;
CC.onNewSeason = function(se, bonus){
  const c = S.career, b = B();
  // expired (not renewed) and released players leave on a free
  const gone = [];
  for(const x of (se.contracts || [])){ const pl = P(x.pid); if(!pl || pl.clubId !== LIV) continue;
    const to = CLUBS.filter(k => k.id !== LIV)[hashStr(x.pid + ':free') % 19].id;
    removePlayer(x.pid); pl.clubId = to; gone.push(pl.name);
    S.transfers.completed.push({type: 'sale', pid: x.pid, to, fee: 0, profit: 0, mw: 0, free: true}); }
  if(gone.length) c.notices.unshift({kind: 'sale', mw: 0, text: `Out of contract and gone: ${gone.join(', ')}.`});
  c.renewals = {};
  b.trained_this_season = {}; b.drills_this_season = {}; b.load = {}; b.rest = {};
  // reputation → budget (§3.1 "Reputation feeds the next season's budget")
  const repAdj = r1(((c.econ.reputation ?? 60) - 50) * ECON.REPUTATION_BUDGET);
  S.finance.transferBudget = r1(S.finance.transferBudget + repAdj);
  const E = c.econ, keepRep = E.reputation, keepInst = E.instalments.filter(i => !i.paid);
  c.econ = blankEcon(c.year); c.econ.reputation = keepRep; c.econ.instalments = keepInst.map(i => ({...i, due_mw: 1}));
  c.cal = {phase: 'preseason', camp: 1, campDone: {}, friendlies: makeFriendlies(c), played: {}, weekDone: {}, janNotice: false, v: 1, tickQueue: []};
  b.tp = {wallet: 10, carried: 0};
  c.notices.unshift({kind: 'season', mw: 0, text: `Pre-season camp opens: 4 weeks, 3 friendlies, 40 TP. Reputation ${keepRep} adds ${fmtM(repAdj)} to the budget.`});
};

/* ═══ 11. TRANSFERS × ECONOMY — windows, board freeze, instalments ═══════ */
function transferBlock(extraWeeklyK, extraAmort){
  const w = windowState();
  if(!w.open) return `The transfer window is closed. It opens in ${w.opens}.`;
  const L = boardLimits(extraWeeklyK || 0, extraAmort || 0);
  if(L.freeze) return `The board won't sanction it: squad costs would be ${Math.round(L.ratio * 100)}% of revenue (limit ${Math.round(ECON.WAGE_FREEZE * 100)}%).`;
  return null;
}
CB.transferBlock = transferBlock;
const _submitOffer = window.submitOffer;
window.submitOffer = function(pid){
  const why = transferBlock();
  if(why){ const el = $('#offResult'); if(el) el.innerHTML = `<div class="cc-offer-res bad">${esc(why)}</div>`; else toast(why); return; }
  return _submitOffer.apply(this, arguments);
};
const _openOfferB = window.openOffer;
window.openOffer = function(pid){
  const r = _openOfferB.apply(this, arguments);
  try{
    const w = windowState(), why = transferBlock();
    $('#drawerBody').insertAdjacentHTML('afterbegin', `<div class="cb-window ${w.open ? 'open' : 'shut'}"><b>${esc(w.name.toUpperCase())}</b>
      ${w.open ? `closes ${esc(w.closes)}${w.january ? ` · January prices +${Math.round((CAL.JANUARY_PREMIUM - 1) * 100)}%` : ''}` : `opens in ${esc(w.opens)}`}</div>
      ${why && w.open ? `<div class="cc-note bad">${esc(why)}</div>` : ''}`);
  }catch(e){ console.warn(e); }
  return r;
};
const _openContract = window.openContract;
window.openContract = function(pid, fee, addons){
  const r = _openContract.apply(this, arguments);
  try{
    const imp = $('#impactBox');
    if(imp && !$('#cbPay')) imp.insertAdjacentHTML('beforebegin', `<label class="flabel">PAYMENT</label>
      <select class="finput" id="cbPay" onchange="updateImpact('${pid}', ${fee})">
        <option value="1">Up front — ${fmtM(fee)} now</option>
        <option value="2">2 instalments — ${fmtM(fee * ECON.INSTALMENT_SPLIT)} now, ${fmtM(fee * (1 - ECON.INSTALMENT_SPLIT))} at the next window</option></select>`);
    CB._contractFee = fee;
    updateImpact(pid, fee);
  }catch(e){ console.warn(e); }
  return r;
};
const _updateImpact = window.updateImpact;
window.updateImpact = function(pid, fee){
  const r = _updateImpact.apply(this, arguments);
  try{
    const box = $('#impactBox'); if(!box) return r;
    const wage = +($('#cWage') || {}).value || 0, yrs = +($('#cYears') || {}).value || 4, L0 = boardLimits(), L1 = boardLimits(wage, fee / yrs);
    const cls = L1.freeze ? 'bad' : L1.warn ? 'warn' : 'good';
    box.insertAdjacentHTML('beforeend', `<div class="tprow"><span>Board limit: squad costs / revenue</span>
      <b class="${cls}">${Math.round(L0.ratio * 100)}% → ${Math.round(L1.ratio * 100)}%</b></div>
      ${L1.freeze ? `<div class="cc-note bad">Over the board's ${Math.round(ECON.WAGE_FREEZE * 100)}% limit — they won't sanction this contract.</div>`
        : L1.warn ? `<div class="cc-note warn">Above ${Math.round(ECON.WAGE_WARN * 100)}%: the board will warn you.</div>` : ''}`);
  }catch(e){ console.warn(e); }
  return r;
};
const _agree = window.agreeContract;
window.agreeContract = function(pid, fee){
  const wage = +($('#cWage') || {}).value || 0, yrs = +($('#cYears') || {}).value || 4;
  const why = transferBlock(wage, fee / yrs);
  if(why){ toast(why); return; }
  const inst = ($('#cbPay') || {}).value === '2';
  const pl = P(pid), was = pl && pl.clubId, bonus = +($('#cBonus') || {}).value || 0;
  const r = _agree.apply(this, arguments);
  if(pl && pl.clubId === LIV && was !== LIV){
    const E = econ();
    if(inst){
      const later = r2(fee * (1 - ECON.INSTALMENT_SPLIT));
      S.finance.cashBalance = r2(S.finance.cashBalance + later);       // only the first half leaves now
      const w = windowState();
      E.instalments.push({pid, name: pl.name, amt: later, due_mw: w.january ? 38 : CAL.JANUARY_MWS[0], paid: false, year: S.career.year});
      book('transfer', 'transfers', r2(fee - later + bonus), `${pl.name} — first instalment${bonus ? ' + signing bonus' : ''}`, 'cost', true);
    } else book('transfer', 'transfers', r2(fee + bonus), `${pl.name} — transfer fee${bonus ? ' + signing bonus' : ''}`, 'cost', true);
    ratioCheck(); CC.saveCareer(); saveState();
  }
  return r;
};
const _sellPlayer = window.sellPlayer;
window.sellPlayer = function(pid, fee){
  const pl = P(pid), was = pl && pl.clubId;
  const r = _sellPlayer.apply(this, arguments);
  if(pl && was === LIV && pl.clubId !== LIV && S.career && S.career.econ){ book('sale', 'sales', fee, `${pl.name} sold`, 'income', true); ratioCheck(); CC.saveCareer(); }
  return r;
};

/* ═══ 12. STAFF — bought with money (§7.2) ═══════════════════════════════ */
function staffCost(id, toLevel){ const s = CB.catalog.staff.find(x => x.id === id); return s ? (s.cost || [])[toLevel - 1] ?? null : null; }
CB.buyStaff = function(id){
  const b = B(), lvl = b.staff[id] || 1; if(lvl >= 3) return;
  const cost = staffCost(id, lvl + 1);
  if(cost == null) return;
  if(S.finance.cashBalance < cost) return toast(`Not enough cash — ${fmtM(cost)} needed.`);
  if(!confirm(`Upgrade ${CB.catalog.staff.find(x => x.id === id).name} to level ${lvl + 1} for ${fmtM(cost)}?`)) return;
  book('staff', 'staff', cost, `${CB.catalog.staff.find(x => x.id === id).name} → level ${lvl + 1}`, 'cost');
  b.staff[id] = lvl + 1;
  unlockCombos();
  CC.saveCareer(); saveState();
  CB.flash = {kind: 'staff', id};
  toast(`${CB.catalog.staff.find(x => x.id === id).name} upgraded to level ${lvl + 1}`);
  rerender();
};

/* ═══ 13. SCOUTING — a fee and one week, then exact values ═══════════════ */
CB.scout = function(pid){
  const m = S.career.market, pl = P(pid); if(!pl || m.scouted[pid] || m.requests[pid]) return;
  if(S.finance.cashBalance < ECON.SCOUT_FEE) return toast('Not enough cash to send a scout.');
  const w = currentWeek();
  m.requests[pid] = {week: w.key, t: Date.now()};
  book('scout', 'scouting', ECON.SCOUT_FEE, `Scouting report · ${pl.name}`, 'cost');
  CC.saveCareer(); saveState();
  toast(`A scout is watching ${shortName(pl.name)} — full report after this week`);
  if(typeof openTransferProfile === 'function' && $('#drawer.on')) openTransferProfile(pid);
};
function scoutingTick(){
  const m = S.career.market;
  for(const pid of Object.keys(m.requests)){ m.scouted[pid] = {week: m.requests[pid].week}; delete m.requests[pid];
    S.career.notices.unshift({kind: 'scout', pid, mw: S.season.matchweek, text: `Scouting report in: ${P(pid) ? P(pid).name : pid} — exact attributes now on his profile.`}); }
}

/* ═══ 14. DECK — unlocks (combo cards at partnership Lv2, staff cards) ═══ */
function unlockedCards(){
  const b = B(), out = new Set(CB.catalog.starter_deck || []);
  const sys = sysById(b.system_id); for(const id of (sys && sys.signature_cards) || []) out.add(id);
  for(const pp of b.partnerships){ const pat = patById(pp.pattern); if(pat && pat.card_id && famLevel(pp.fam) >= 2) out.add(pat.card_id); }
  for(const c of CB.catalog.cards){
    const src = c.source || {};
    if(src.kind === 'set_piece' && (b.set_pieces || {}).drilled) out.add(c.id);
    if(src.kind === 'staff' && src.ref){ const [st, lv] = String(src.ref).split(':'); if((b.staff[st] || 1) >= +lv) out.add(c.id); }
  }
  return [...out].filter(id => { const c = cardById(id); return c && c.available !== false; });
}
CB.unlockedCards = unlockedCards;
function unlockCombos(){
  const b = B(), un = new Set(unlockedCards()), max = K('deck_max') ?? 18;
  b.seenUnlocks = b.seenUnlocks || [];
  for(const id of un) if(!b.seenUnlocks.includes(id)){
    b.seenUnlocks.push(id);
    const c = cardById(id); if(!c) continue;
    const src = (c.source || {}).kind;
    if((src === 'combo' || src === 'staff') && !b.deck.includes(id) && b.deck.length < max){
      b.deck.push(id);
      S.career.notices.unshift({kind: 'card', mw: S.season.matchweek, text: `New card unlocked: ${c.name} — added to your deck.`});
      CB.newCards = [...(CB.newCards || []), id];
    }
  }
  // deck cards that are no longer unlocked (e.g. the partnership broke up) drop out
  b.deck = b.deck.filter(id => un.has(id));
}
CB.unlockCombos = unlockCombos;
CB.deckAdd = function(id){ const b = B(), max = K('deck_max') ?? 18;
  if(b.deck.includes(id) || !unlockedCards().includes(id)) return;
  if(b.deck.length >= max) return toast(`Deck is full (${max} cards). Remove one first.`);
  b.deck.push(id); CC.saveCareer(); rerender(); };
const deckMin = () => _eval.data && _eval.data.system_id === B().system_id && _eval.data.deck_min != null ? _eval.data.deck_min : Math.min(K('deck_min') ?? 10, unlockedCards().length);
CB.deckRemove = function(id){ const b = B(), min = deckMin();
  if(b.deck.length <= min) return toast(`A deck needs at least ${min} cards.`);
  b.deck = b.deck.filter(x => x !== id); CC.saveCareer(); rerender(); };

/* ═══ 15. SCREEN HELPERS ═════════════════════════════════════════════════ */
CB.ui = {preview: null, slot: null, wizard: null, deckTab: 'deck', plan: {}, playerSel: null, anim: null};
const fitCls = f => f >= 80 ? 'elite' : f >= 70 ? 'good' : f >= 55 ? 'ok' : 'poor';
CB.fitCls = fitCls;
/* a TFT-style ring: stroke length = fit, colour by band; `from` animates */
function ringSVG(fit, size = 58, from = null){
  const R = 26, C = 2 * Math.PI * R, f = clamp(fit || 0, 0, 100);
  const off = C * (1 - f / 100), off0 = from == null ? off : C * (1 - clamp(from, 0, 100) / 100);
  return `<svg class="cb-ring ${fitCls(f)}" viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="30" cy="30" r="${R}" class="trk"/><circle cx="30" cy="30" r="${R}" class="val" stroke-dasharray="${C.toFixed(1)}"
      stroke-dashoffset="${off0.toFixed(1)}" data-off="${off.toFixed(1)}" transform="rotate(-90 30 30)"/></svg>`;
}
CB.ringSVG = ringSVG;
function animateRings(root){
  requestAnimationFrame(() => requestAnimationFrame(() => {
    (root || document).querySelectorAll('.cb-ring .val[data-off]').forEach(c => { c.style.strokeDashoffset = c.dataset.off; });
  }));
}
const TRAIT_ICON = {engine_room: '⚙', aerial_threat: '▲', pace_in_behind: '»', wall: '▦'};
function traitHTML(t, compact){
  const def = (CB.catalog.traits || []).find(x => x.id === t.id) || {};
  const pips = Array.from({length: t.need}, (_, i) => `<i class="${i < t.count ? 'on' : ''}"></i>`).join('');
  const names = (t.members || []).map(pid => P(pid) ? shortName(P(pid).name) : pid).join(', ');
  return `<div class="cb-trait ${t.active ? 'active' : t.count ? 'part' : 'off'} ${compact ? 'sm' : ''}" title="${esc(def.rule || def.text || '')}${names ? ' — ' + esc(names) : ''}">
    <span class="hex"><b>${TRAIT_ICON[t.id] || '◆'}</b></span>
    <span class="tx"><b>${esc(t.name || def.name || t.id)}</b><em>${t.count}/${t.need}${t.active ? ' · ACTIVE' : ''}</em><span class="pips">${pips}</span></span></div>`;
}
CB.traitHTML = traitHTML;
function famBar(fam, opts = {}){
  const L = famLevels(), lvl = famLevel(fam);
  return `<div class="cb-fam ${opts.big ? 'big' : ''}" title="Familiarity ${Math.round(fam)} · Lv${lvl}">
    <div class="bar"><i style="width:${clamp(fam, 0, 100)}%"></i>${opts.gain ? `<u style="left:${clamp(fam, 0, 100)}%;width:${clamp(opts.gain, 0, 100 - fam)}%"></u>` : ''}
      ${L.map((x, i) => `<s style="left:${x}%" class="${fam >= x ? 'hit' : ''}"><em>Lv${i + 1}</em></s>`).join('')}</div>
    <span class="lv lv${lvl}">Lv${lvl}</span></div>`;
}
CB.famBar = famBar;
function famBoost(fam){ return r1(clamp(((fam ?? 40) - 40) / 60, 0, 1) * 4); }
function cardFace(c, opts = {}){
  if(!c) return '';
  const up = !!(B().upgrades || {})[c.id];
  const src = (c.source || {}).kind || 'universal';
  const cost = up && (c.upgrade || {}).kind === 'cost' ? Math.max(0, c.cost - 1) : c.cost;
  return `<div class="cb-card src-${src} ${up ? 'up' : ''} ${opts.cls || ''}" ${opts.attrs || ''} title="${esc((c.lines || []).join('\n'))}${c.drawback ? '\n' + esc(c.drawback) : ''}">
    <div class="ch"><b>${esc(c.name)}${up ? '+' : ''}</b><span class="cost">⚡${cost}</span></div>
    <div class="ct">${esc(c.type || '')}${c.duration ? ` · ${c.duration}'` : ''}</div>
    <div class="cl">${(c.lines || [c.text || '']).slice(0, 3).map(l => `<div>${esc(l)}</div>`).join('')}</div>
    ${(c.keywords || []).length ? `<div class="kw">${c.keywords.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
    ${opts.foot || ''}</div>`;
}
CB.cardFace = cardFace;
function rerender(){
  const v = S.ui.view;
  try{
    if(v === 'build') renderBoard();
    else if(v === 'training') renderTraining();
    else if(v === 'finances') renderFinances();
    else if(v === 'schedule') renderSchedule();
    else if(v === 'home') renderHome();
    else if(v === 'season' && CC.renderSeasonView) CC.renderSeasonView();
    else if(v === 'transfers') renderTransfers();
  }catch(e){ console.warn('[coach-build] render', e); }
}
CB.rerender = rerender;
const loadingHTML = t => `<div class="cc-loading"><i class="cc-dot"></i> ${esc(t)}</div>`;

/* ═══ 16. SYSTEM BOARD (§11 screen 1) ════════════════════════════════════ */
const _sysFit = {};          // system_id -> {key, fit, pending}
function sysFitFor(sid){
  const sys = sysById(sid); if(!sys) return null;
  const xi = mapXIToSystem(sys), key = evalKey(sid, xi);
  const e = _sysFit[sid];
  if(e && e.key === key) return e;
  const ent = _sysFit[sid] = {key, fit: null, pending: true};
  BAPI.evaluate({squad: CB.squadPayload(), xi, bench: S.current.bench, system_id: sid, build: B()})
    .then(d => { ent.fit = d.system_fit; ent.traits = d.traits; ent.pending = false; if(S.ui.view === 'build') paintSysTiles(); })
    .catch(() => { ent.pending = false; });
  return ent;
}
function paintSysTiles(){ const el = $('#cbSysGrid'); if(el) el.innerHTML = sysTilesHTML(); }
function sysTilesHTML(){
  const b = B(), cur = b.system_id, prev = CB.ui.preview || cur;
  const list = [...CB.catalog.systems.filter(s => !s.custom), ...(b.custom_system ? [sysById('custom')] : [])];
  return list.map(s => {
    const e = sysFitFor(s.id), fam = b.familiarity[s.id];
    return `<button class="cb-sys ${s.id === cur ? 'cur' : ''} ${s.id === prev ? 'sel' : ''}" onclick="CB.previewSystem('${s.id}')">
      <span class="nm">${esc(s.name)}</span><span class="sh">${esc(formationOf(s.formation).name)}${s.id === cur ? ' · <b>YOURS</b>' : ''}</span>
      <span class="id">${esc(s.identity || '')}</span>
      <span class="ft"><em>FIT</em><b class="${e && e.fit != null ? fitCls(e.fit) : ''}">${e && e.fit != null ? e.fit : '…'}</b>
        ${fam != null ? `<em>FAM</em><b>${Math.round(fam)}</b>` : ''}</span></button>`;
  }).join('') + `<button class="cb-sys custom" onclick="CB.openCustom()"><span class="nm">＋ Custom system</span>
    <span class="id">Edit any bundle: shape, the 13 team tactics and every slot's roles. Starts at familiarity ${K('fam_switch_custom') ?? 20}, no named bonuses.</span></button>`;
}
CB.previewSystem = id => { CB.ui.preview = id === B().system_id ? null : id; CB.ui.slot = null; renderBoard(); };
async function renderBoard(){
  const el = document.getElementById('buildBody'); if(!el || S.ui.view !== 'build') return;
  if(!CB.catalog){ el.innerHTML = loadingHTML('Loading systems…'); return; }
  const b = B(), sid = CB.ui.preview || b.system_id, sys = sysById(sid), mine = sid === b.system_id;
  const sw = mine ? null : switchCost(sid);
  const fam = b.familiarity[sid] ?? (sw ? sw.to : 40);
  const ev0 = mine ? _eval.data : null;
  el.innerHTML = `
    <div class="pagehead">SYSTEM BOARD · ${esc(PREMIER_LEAGUE.season)}</div>
    <div class="cb-head">
      <div><h2 class="pagetitle">${esc(sys.name)} <small>${esc(formationOf(sys.formation).name)}</small></h2>
        <div class="cc-small">${esc(sys.identity || '')}${(sys.key_demands || []).length ? ` · <span class="cb-dem">${esc(sys.key_demands.join(' · '))}</span>` : ''}</div></div>
      <div class="cb-headr">
        <div class="cb-bigfit" id="cbBigFit">${ringSVG(ev0 ? ev0.system_fit : 0, 84)}<b>${ev0 ? ev0.system_fit : '…'}</b><em>SYSTEM FIT</em></div>
        <div class="cb-sysfam"><span class="cc-k">FAMILIARITY</span>${famBar(fam, {big: true})}
          <div class="cc-small">+${famBoost(fam)} reactions, positioning, composure at kick-off${!mine ? ` · switching drops it to <b>${sw.to}</b>` : ''}</div></div>
      </div>
    </div>
    ${!mine ? `<div class="cb-switch"><div><b>Previewing ${esc(sys.name)}.</b> Your system is ${esc(sysById(b.system_id).name)} (familiarity ${Math.round(b.familiarity[b.system_id] ?? 40)}).
        Switching costs familiarity: ${esc(sys.name)} starts at ${sw.to} — about 3–4 weeks to feel at home.</div>
      <button class="btn pri" onclick="CB.confirmSwitch('${sid}')">Switch to ${esc(sys.name)}</button><button class="btn sec" onclick="CB.previewSystem('${b.system_id}')">Cancel</button></div>`
      : !systemApplied() ? `<div class="cb-switch warn"><div>Your team isn't set up in ${esc(sys.name)} right now (shape or team tactics differ).</div>
      <button class="btn pri" onclick="CB.applyNow()">Set up ${esc(sys.name)}</button></div>` : ''}
    <div class="cb-sysgrid" id="cbSysGrid">${sysTilesHTML()}</div>
    <div class="cb-board">
      <section class="cc-panel cb-pitchp"><h4>SLOT FIT <span class="cc-h-r"><button class="btn sec sm" onclick="CB.autoPick()" ${mine ? '' : 'disabled'}>Auto-pick for ${esc(sys.name)}</button></span></h4>
        <div class="cb-pitch" id="cbPitch">${loadingHTML('Reading the squad…')}</div>
        <div class="cc-small cc-muted" style="margin-top:8px">Rings: how well each player's attributes match his slot's demands (fatigue included). Click a slot for candidates.</div></section>
      <div class="cb-side">
        <section class="cc-panel"><h4>TRAITS <span class="cc-h-r cc-small" id="cbBonus"></span></h4><div class="cb-traits" id="cbTraits">${loadingHTML('…')}</div></section>
        <section class="cc-panel"><h4>PARTNERSHIPS <span class="cc-h-r cc-small">${b.partnerships.length}/${maxPairs()}</span></h4><div id="cbPairs">${pairsHTML(null)}</div>
          <div class="cc-small cc-muted" style="margin-top:6px">Boosts apply at kick-off when every member starts. v1: a member subbed off keeps the others' boost for that match.</div></section>
      </div>
    </div>
    <section class="cc-panel cb-deckp"><h4>DECK <span class="cc-h-r">${deckCountHTML()}</span></h4><div id="cbDeck">${deckHTML()}</div></section>
    <div id="cbSlotPop"></div><div id="cbModal"></div>`;
  try{
    const ev = mine ? await evaluateNow() : await BAPI.evaluate({squad: CB.squadPayload(), xi: mapXIToSystem(sys), bench: S.current.bench, system_id: sid, build: B()});
    if(S.ui.view !== 'build' || (CB.ui.preview || B().system_id) !== sid) return;
    paintBoard(sys, ev, mine);
  }catch(e){ const p = $('#cbPitch'); if(p) p.innerHTML = `<div class="cc-note bad">Couldn't evaluate the build: ${esc(e.message)}</div>`; }
}
CB.renderBoard = renderBoard;
const maxPairs = () => (K('max_partnerships') ?? 4) + Math.max(0, (B().staff.coach || 1) - 1);
const pitchY = y => 8 + (y - 14) / 80 * 84;     // formation y (14–94) onto the landscape board
function paintBoard(sys, ev, mine){
  CB._boardEval = ev;
  const prevFit = CB._prevFit || {};
  const xi = ev._xi || xiNow(), f = formationOf(sys.formation);
  const pairs = (ev.partnerships || B().partnerships.map(p => ({...p, level: famLevel(p.fam), active: false})));
  const slotOf = pid => Object.keys(xi).find(k => xi[k] === pid);
  const lines = pairs.filter(pp => pp.members.every(slotOf)).map(pp => {
    const pts = pp.members.map(m => f.slots.find(s => s.id === slotOf(m))).filter(Boolean);
    return pts.slice(1).map((q, i) => `<line x1="${pts[i].x}" y1="${pitchY(pts[i].y)}" x2="${q.x}" y2="${pitchY(q.y)}" class="lv${famLevel(pp.fam)} ${pp.active ? 'on' : ''}"/>`).join('');
  }).join('');
  const tok = f.slots.map(sl => {
    const pid = xi[sl.id], pl = P(pid), fit = ev.slot_fit[sl.id] ?? 0, d = sys.slots[sl.id] || {};
    const tr = pl ? (ev.player_traits[pid] || []) : [];
    const key = sys.id + '|' + sl.id;
    const from = prevFit[key] != null && prevFit[key] !== fit ? prevFit[key] : (prevFit[key] == null ? 0 : null);
    prevFit[key] = fit;
    const c = pl ? Math.round(CC.condOf(pid)) : 100;
    return `<button class="cb-tok ${pl ? '' : 'cb-empty'} ${CB.ui.slot === sl.id ? 'sel' : ''}" style="left:${sl.x}%;top:${pitchY(sl.y)}%" onclick="CB.openSlot('${sl.id}')" data-slot="${sl.id}">
      <span class="rg">${ringSVG(pl ? fit : 0, 58, from)}<b class="${fitCls(fit)}">${pl ? fit : '+'}</b></span>
      <span class="nm">${pl ? esc(shortName(pl.name)) : 'Empty'}</span>
      <span class="rl">${esc(sl.id)} · ${esc(d.attackRole || d.label || sl.position)}</span>
      ${pl && c < 80 ? `<span class="cd" style="--c:${c}%">${c}%</span>` : ''}
      ${tr.length ? `<span class="tt">${tr.slice(0, 3).map(t => `<i title="${esc(((CB.catalog.traits.find(x => x.id === t)) || {}).name || t)}">${esc((((CB.catalog.traits.find(x => x.id === t)) || {}).name || t).slice(0, 1))}</i>`).join('')}</span>` : ''}
    </button>`;
  }).join('');
  CB._prevFit = prevFit;
  const pitch = $('#cbPitch');
  if(pitch){ pitch.innerHTML = `<div class="cb-grass"></div><svg class="cb-links" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${tok}`; animateRings(pitch); }
  const big = $('#cbBigFit');
  if(big){ const was = CB._prevSysFit ?? 0; big.innerHTML = `${ringSVG(ev.system_fit, 84, was)}<b class="${fitCls(ev.system_fit)}">${ev.system_fit}</b><em>SYSTEM FIT</em>`; CB._prevSysFit = ev.system_fit; animateRings(big);
    if(was && ev.system_fit !== was){ big.classList.remove('bump'); void big.offsetWidth; big.classList.add('bump'); } }
  const tt = $('#cbTraits');
  if(tt) tt.innerHTML = (ev.traits || []).map(t => traitHTML(t)).join('') || '<div class="cc-small cc-muted">No unit traits for this system.</div>';
  const bo = $('#cbBonus'); if(bo) bo.innerHTML = `base ${ev.base_fit ?? '—'} · bonuses +${ev.bonus_points ?? 0}`;
  const pp = $('#cbPairs'); if(pp) pp.innerHTML = pairsHTML(ev);
}
CB.applyNow = () => { applySystemToSquad(sysById(B().system_id)); renderBoard(); toast('Shape, team tactics and slot roles set for ' + sysById(B().system_id).name); };
CB.confirmSwitch = function(id){
  const sys = sysById(id), sw = switchCost(id), cur = sysById(B().system_id);
  const m = $('#cbModal'); if(!m) return;
  m.innerHTML = `<div class="cb-modal" onclick="if(event.target===this)this.remove()"><div class="cb-mbox">
    <div class="pagehead">SWITCH SYSTEM</div><h3>${esc(cur.name)} → ${esc(sys.name)}</h3>
    <div class="cb-swrow"><div><span class="cc-k">${esc(cur.name.toUpperCase())}</span>${famBar(sw.from)}</div><div class="arr">→</div>
      <div><span class="cc-k">${esc(sys.name.toUpperCase())}</span>${famBar(sw.to)}</div></div>
    <p class="cc-small">Familiarity gives +${famBoost(sw.from)} → +${famBoost(sw.to)} to reactions, positioning and composure at kick-off. It grows +8 a week in your system, +3 a match and +3 per TP drilled. Your deck swaps ${esc(cur.name)}'s 4 signature cards for ${esc(sys.name)}'s.</p>
    <div class="cc-actions"><button class="btn pri" onclick="CB.doSwitch('${id}')">Switch — commit to ${esc(sys.name)}</button><button class="btn sec" onclick="this.closest('.cb-modal').remove()">Keep ${esc(cur.name)}</button></div>
  </div></div>`;
};
CB.doSwitch = function(id){ CB.ui.preview = null; chooseSystem(id); _eval.key = null; renderBoard(); toast(`Now playing ${sysById(id).name}`); };

/* slot candidates, ranked by fit (fatigue included) */
CB.openSlot = async function(slotId){
  const b = B(), sid = CB.ui.preview || b.system_id; if(sid !== b.system_id) return toast('Switch to this system to pick players for it.');
  CB.ui.slot = slotId;
  const ev = CB._boardEval || await evaluateNow(), sys = sysById(sid), sl = formationOf(sys.formation).slots.find(s => s.id === slotId);
  const cur = S.current.starters[slotId];
  const rows = clubPool().filter(p => (sl.position === 'GK') === (p.pos === 'GK'))
    .map(p => ({p, fit: (ev.fit_matrix[p.id] || {})[slotId] ?? 0, c: Math.round(CC.condOf(p.id)), inj: CC.isInjured(p.id), where: Object.keys(S.current.starters).find(k => S.current.starters[k] === p.id)}))
    .sort((x, y) => (y.inj ? -1 : 0) - (x.inj ? -1 : 0) || y.fit - x.fit).slice(0, 12);
  const d = sys.slots[slotId] || {};
  const top = Object.entries(d.demand || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const pop = $('#cbSlotPop'); if(!pop) return;
  pop.innerHTML = `<div class="cb-modal" onclick="if(event.target===this){this.remove();CB.ui.slot=null}"><div class="cb-mbox wide">
    <div class="pagehead">${esc(slotId)} · ${esc(d.attackRole || d.label || '')} / ${esc(d.defenseRole || '')}${d.attackEffort != null ? ` · effort ${d.attackEffort}/${d.defenseEffort}` : ''}</div>
    <h3>Who fits ${esc(slotId)} in ${esc(sys.name)}?</h3>
    <div class="cb-demand">${top.map(([k, w]) => `<span><b>${esc(attrName(k))}</b><i style="width:${Math.round(w * 250)}px"></i></span>`).join('')}</div>
    <div class="cb-cands">${rows.map(r => `<button class="cb-cand ${r.p.id === cur ? 'cur' : ''} ${r.inj ? 'inj' : ''}" ${r.inj ? 'disabled' : ''} onclick="CB.putSlot('${slotId}','${r.p.id}')">
      <span class="rg">${ringSVG(r.fit, 40)}<b class="${fitCls(r.fit)}">${r.fit}</b></span>
      <span class="nm"><b>${esc(r.p.name)}</b><em>${esc(r.p.pos)} · ${r.p.age}y · ${top.slice(0, 3).map(([k]) => `${esc(k.toUpperCase())} ${Math.round(r.p.a[k])}`).join(' · ')}</em></span>
      <span class="st">${r.inj ? '<em class="bad">INJURED</em>' : r.p.id === cur ? '<em class="good">IN SLOT</em>' : r.where ? `<em>at ${esc(r.where)}</em>` : S.current.bench.includes(r.p.id) ? '<em>bench</em>' : '<em>reserves</em>'}
        ${CC.condBar(r.p.id, '48px')} <small>${r.c}%</small></span></button>`).join('')}</div>
    <div class="cc-actions"><button class="btn sec" onclick="this.closest('.cb-modal').remove();CB.ui.slot=null">Close</button></div></div></div>`;
  animateRings(pop);
};
CB.putSlot = function(slotId, pid){
  const cur = S.current.starters[slotId];
  const from = Object.keys(S.current.starters).find(k => S.current.starters[k] === pid);
  if(from && from !== slotId){ swapSlots(from, slotId); }
  else if(!from){ putInSlot(slotId, pid); if(cur && !S.current.bench.includes(cur) && S.current.bench.length < 7) addToBench(cur); }
  instrFor(pid, slotById(slotId).position);
  applySystemToSquad(sysById(B().system_id), {quiet: true});
  CC.rememberFirstChoice && CC.rememberFirstChoice();
  saveState(); CB.ui.slot = null; renderBoard();
};
/* Auto-pick: maximise system fit × fitness with the build's fit matrix */
CB.autoPick = async function(opts = {}){
  if(isLiveMatch()) return liveBlocked('The XI cannot be auto-picked during a live match.');
  const sys = sysById(B().system_id);
  if(S.current.formationId !== sys.formation) setFormation(sys.formation);
  try{
    const squad = clubPool().map(pl => ({...serializePlayer(pl), cond: 100}));    // pure fit; fatigue is added by the optimiser
    const ev = await BAPI.evaluate({squad, xi: xiNow(), system_id: sys.id, build: B()});
    CC.fitMatrix = ev.fit_matrix;
    window.autoFill({fit: sys.name, silent: opts.silent});
  } finally { CC.fitMatrix = null; }
  applySystemToSquad(sys, {quiet: true});
  saveState(); _eval.key = null;
  if(S.ui.view === 'build') renderBoard();
};
/* the Squad screen's "Auto-pick" uses the build fit too */
const _autoFillB = window.autoFill;
window.autoFill = function(opts = {}){
  if(opts.fit || !CB.catalog || !S.career || !S.career.build || isLiveMatch() || (S.matchFixture && S.matchFixture.exhibition && !S.matchFixture.friendly)) return _autoFillB.apply(this, arguments);
  CB.autoPick(opts);
};

/* ── partnerships: slots, familiarity bars, create / dissolve ─────────── */
const PAT_ICON = {cross_head: '✚', overlap: '⇉', one_two: '⇄', through_ball: '➚', cb_pair: '▦', press_trio: '✦', keeper_line: '◈'};
function pairsHTML(ev){
  const b = B(), max = maxPairs(), evp = ev ? Object.fromEntries((ev.partnerships || []).map(p => [p.id, p])) : {};
  const rows = b.partnerships.map(pp => {
    const pat = patById(pp.pattern) || {name: pp.pattern}, lvl = famLevel(pp.fam), e = evp[pp.id] || {};
    const names = pp.members.map(m => P(m) ? shortName(P(m).name) : '?').join(' + ');
    const boosts = lvl && pat.boosts ? Object.entries(pat.boosts[lvl] || {}).map(([role, d]) => `${role}: ${Object.entries(d).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' ')}`).join(' · ') : 'no boost until Lv1 (familiarity 30)';
    const card = pat.card_id ? cardById(pat.card_id) : null;
    return `<div class="cb-pair lv${lvl} ${e.active ? 'on' : ''}" data-pair="${esc(pp.id)}">
      <span class="pi">${PAT_ICON[pp.pattern] || '◆'}</span>
      <div class="pb"><div class="ph"><b>${esc(pat.name)}</b><span class="cc-small">${esc(names)}</span>
        ${e.active === false ? '<em class="warn">not all starting</em>' : e.active ? '<em class="good">active</em>' : ''}</div>
        ${famBar(pp.fam)}
        <div class="cc-small">${esc(boosts)}${card ? ` · <span class="${lvl >= 2 ? 'good' : ''}">${lvl >= 2 ? 'unlocked' : 'Lv2 unlocks'} ${esc(card.name)}</span>` : ''}</div></div>
      <button class="cb-x" title="Dissolve" onclick="CB.dissolvePair('${esc(pp.id)}')">✕</button></div>`;
  });
  for(let i = b.partnerships.length; i < max; i++) rows.push(`<button class="cb-pair cb-empty" onclick="CB.pairWizard()"><span class="pi">＋</span><div class="pb"><b>Add a partnership</b><span class="cc-small">Pick a pattern and the players — train it with TP, play them together.</span></div></button>`);
  return rows.join('');
}
CB.dissolvePair = function(id){
  const pp = B().partnerships.find(p => p.id === id); if(!pp) return;
  if(pp.fam > 0 && !confirm(`Dissolve this partnership? Its familiarity (${Math.round(pp.fam)}) is lost.`)) return;
  B().partnerships = B().partnerships.filter(p => p.id !== id);
  unlockCombos(); CC.saveCareer(); _eval.key = null; rerender();
};
CB.pairWizard = function(pattern, picks){
  const m = $('#cbModal') || $('#tbModal'); if(!m) return;
  if(B().partnerships.length >= maxPairs()) return toast(`All ${maxPairs()} partnership slots are used.`);
  const pats = CB.catalog.patterns;
  if(!pattern){
    m.innerHTML = `<div class="cb-modal" onclick="if(event.target===this)this.remove()"><div class="cb-mbox wide"><div class="pagehead">NEW PARTNERSHIP · 1/2</div><h3>Choose a pattern</h3>
      <div class="cb-pats">${pats.map(p => `<button class="cb-pat" onclick="CB.pairWizard('${p.id}',[])"><span class="pi">${PAT_ICON[p.id] || '◆'}</span><b>${esc(p.name)}</b>
        <span class="cc-small">${esc(p.members.map(x => x.role).join(' + '))}</span><span class="cc-small cc-muted">${esc(Object.entries(p.boosts['2'] || p.boosts[2] || {}).map(([r, d]) => r + ' ' + Object.entries(d).map(([k, v]) => k.toUpperCase() + '+' + v).join(' ')).join(' · '))} at Lv2</span>
        ${p.card_id && cardById(p.card_id) ? `<span class="cb-pc">Lv2 card: ${esc(cardById(p.card_id).name)}</span>` : ''}</button>`).join('')}</div>
      <div class="cc-actions"><button class="btn sec" onclick="this.closest('.cb-modal').remove()">Cancel</button></div></div></div>`;
    return;
  }
  const pat = patById(pattern), i = picks.length;
  if(i >= pat.size){
    const id = `${pattern}:${[...picks].sort().join('+')}`;
    m.innerHTML = '';
    if(B().partnerships.some(p => p.id === id)) return toast('That partnership already exists.');
    B().partnerships.push({id, pattern, members: picks, fam: 0});
    CC.saveCareer(); _eval.key = null;
    toast(`${pat.name}: ${picks.map(x => shortName(P(x).name)).join(' + ')} — familiarity 0. Drill it in Training (1 TP = +10).`);
    return rerender();
  }
  const role = pat.members[i];
  const xi = xiNow();
  const inSlots = new Set(role.slots || []);
  const eligibility = {GK: ['GK'], CB: ['CB'], FB: ['LB','RB','LWB','RWB'], W: ['LW','RW','LM','RM'], MIDP: ['CM','CAM','CDM','LM','RM']};
  const eligible = p => role.rule === 'outfield' ? p.pos !== 'GK' : !eligibility[role.rule] || eligibility[role.rule].includes(p.pos);
  const cands = clubPool().filter(p => eligible(p) && !picks.includes(p.id) && (!role.slots || Object.entries(xi).some(([sl, id]) => id === p.id && inSlots.has(sl)) || (role.slots || []).some(sl => suitability(p, (formationOf(S.current.formationId).slots.find(s => s.id === sl) || {}).position || sl) !== 'out')))
    .sort((a, b) => (Object.values(xi).includes(b.id) ? 1 : 0) - (Object.values(xi).includes(a.id) ? 1 : 0) || b.ovr - a.ovr).slice(0, 14);
  m.innerHTML = `<div class="cb-modal" onclick="if(event.target===this)this.remove()"><div class="cb-mbox wide"><div class="pagehead">NEW PARTNERSHIP · ${esc(pat.name.toUpperCase())} · MEMBER ${i + 1}/${pat.size}</div>
    <h3>Pick the ${esc(role.role)}</h3>${role.rule ? `<div class="cc-small">${esc(role.rule)}</div>` : ''}
    ${picks.length ? `<div class="cc-small">So far: <b>${picks.map(id => esc(shortName(P(id).name))).join(' + ')}</b></div>` : ''}
    <div class="cb-cands">${cands.map(p => { const sl = Object.keys(xi).find(k => xi[k] === p.id);
      return `<button class="cb-cand" onclick='CB.pairWizard("${pattern}", ${JSON.stringify([...picks, p.id])})'><span class="nm"><b>${esc(p.name)}</b><em>${esc(p.pos)} · ${sl ? 'starts at ' + esc(sl) : 'not in the XI'}</em></span>
        <span class="st">${esc(Object.keys(Object.values((pat.boosts[1] || {}))[0] || {}).map(k => k.toUpperCase() + ' ' + Math.round(p.a[k] || 0)).join(' · '))}</span></button>`; }).join('') || '<div class="cc-small">No eligible players.</div>'}</div>
    <div class="cc-actions"><button class="btn sec" onclick="this.closest('.cb-modal').remove()">Cancel</button></div></div></div>`;
};

/* ── deck builder ──────────────────────────────────────────────────────── */
function deckCountHTML(){
  const n = B().deck.length, lo = deckMin(), hi = K('deck_max') ?? 18;
  return `<span class="cb-dcount ${n < lo || n > hi ? 'bad' : ''}">${n} cards <em>(${lo}–${hi}) · hand of ${K('hand_size') ?? 5} chosen per match</em></span>`;
}
function deckHTML(){
  const b = B(), un = unlockedCards(), pool = un.filter(id => !b.deck.includes(id));
  const locked = CB.catalog.cards.filter(c => !un.includes(c.id) && ((c.source || {}).kind === 'combo' || (c.source || {}).kind === 'staff' || (c.source || {}).kind === 'set_piece'));
  const tab = CB.ui.deckTab;
  const isNew = id => (CB.newCards || []).includes(id);
  const body = tab === 'deck' ? b.deck.map(cardById).filter(Boolean).map(c => cardFace(c, {cls: isNew(c.id) ? 'new' : '', foot: `<button class="cb-cbtn" onclick="CB.deckRemove('${c.id}')">Remove</button>`})).join('')
    : tab === 'pool' ? (pool.map(cardById).filter(Boolean).map(c => cardFace(c, {foot: `<button class="cb-cbtn add" onclick="CB.deckAdd('${c.id}')">Add to deck</button>`})).join('') || '<div class="cc-small cc-muted">Every unlocked card is already in your deck.</div>')
    : locked.map(c => cardFace(c, {cls: 'locked', foot: `<div class="cb-lock">🔒 ${esc(lockText(c))}</div>`})).join('') || '<div class="cc-small cc-muted">Nothing locked.</div>';
  return `<div class="subtabs cb-dtabs">${[['deck', `IN DECK (${b.deck.length})`], ['pool', `AVAILABLE (${pool.length})`], ['locked', `LOCKED (${locked.length})`]].map(([k, l]) =>
    `<button class="subtab ${tab === k ? 'on' : ''}" onclick="CB.ui.deckTab='${k}';CB.repaintDeck()">${l}</button>`).join('')}</div>
    <div class="cb-cards">${body}</div>`;
}
function lockText(c){
  const s = c.source || {};
  if(s.kind === 'combo'){ const p = patById(s.ref || c.combo); return `${p ? p.name : 'Partnership'} at Lv2`; }
  if(s.kind === 'staff'){ const [st, lv] = String(s.ref || '').split(':'); const sf = CB.catalog.staff.find(x => x.id === st); return `${sf ? sf.name : st} level ${lv}`; }
  if(s.kind === 'set_piece') return 'Choose a set-piece taker (Training)';
  return 'Locked';
}
CB.repaintDeck = () => { const d = $('#cbDeck'); if(d) d.innerHTML = deckHTML(); const h = document.querySelector('.cb-deckp h4 .cc-h-r'); if(h) h.innerHTML = deckCountHTML(); };
const _deckAdd = CB.deckAdd, _deckRm = CB.deckRemove;
CB.deckAdd = id => { _deckAdd(id); CB.repaintDeck(); };
CB.deckRemove = id => { _deckRm(id); CB.repaintDeck(); };

/* ── custom system editor ──────────────────────────────────────────────── */
CB.openCustom = function(){
  const b = B(), cs = b.custom_system || {base_id: b.system_id === 'custom' ? CB.catalog.systems[0].id : b.system_id, name: 'My system', slots: {}};
  const base = sysById(cs.base_id) || CB.catalog.systems[0];
  const formation = cs.formation || base.formation, tactics = {...base.tactics, ...(cs.tactics || {})};
  CB._custom = {base_id: base.id, name: cs.name || 'My system', formation, tactics, slots: deep(cs.slots || {})};
  paintCustom();
};
function paintCustom(){
  const m = $('#cbModal'); if(!m) return;
  const cs = CB._custom, base = sysById(cs.base_id), f = formationOf(cs.formation);
  const slotRow = sl => { const d = {...(base.formation === cs.formation ? base.slots[sl.id] : {}), ...(cs.slots[sl.id] || {})}, r = rolesFor(sl.position), dflt = DEFAULT_INSTR[sl.position] || DEFAULT_INSTR.CM;
    const ar = d.attackRole && r.atk.includes(d.attackRole) ? d.attackRole : dflt.attackRole, dr = d.defenseRole && r.def.includes(d.defenseRole) ? d.defenseRole : dflt.defenseRole;
    return `<tr><td><b>${esc(sl.id)}</b></td>
      <td><select onchange="CB.customSet('${sl.id}','attackRole',this.value)">${r.atk.map(x => `<option ${x === ar ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></td>
      <td><input type="range" min="10" max="100" step="5" value="${d.attackEffort ?? dflt.attackEffort}" oninput="CB.customSet('${sl.id}','attackEffort',+this.value);this.nextElementSibling.textContent=this.value"><small>${d.attackEffort ?? dflt.attackEffort}</small></td>
      <td><select onchange="CB.customSet('${sl.id}','defenseRole',this.value)">${r.def.map(x => `<option ${x === dr ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></td>
      <td><input type="range" min="10" max="100" step="5" value="${d.defenseEffort ?? dflt.defenseEffort}" oninput="CB.customSet('${sl.id}','defenseEffort',+this.value);this.nextElementSibling.textContent=this.value"><small>${d.defenseEffort ?? dflt.defenseEffort}</small></td></tr>`; };
  m.innerHTML = `<div class="cb-modal" onclick="if(event.target===this)this.remove()"><div class="cb-mbox xwide">
    <div class="pagehead">CUSTOM SYSTEM</div>
    <div class="cb-crow"><label>Name <input class="finput" value="${esc(cs.name)}" maxlength="24" oninput="CB._custom.name=this.value"></label>
      <label>Start from <select class="finput" onchange="CB._custom.base_id=this.value;CB._custom.tactics={...CB.sysById(this.value).tactics};CB._custom.formation=CB.sysById(this.value).formation;CB._custom.slots={};CB.paintCustom()">${CB.catalog.systems.map(s => `<option value="${s.id}" ${s.id === cs.base_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label>Shape <select class="finput" onchange="CB._custom.formation=this.value;CB._custom.slots={};CB.paintCustom()">${SUPPORTED_ENGINE_FORMATIONS.map(id => `<option value="${id}" ${id === cs.formation ? 'selected' : ''}>${formationOf(id).name}</option>`).join('')}</select></label></div>
    <div class="cb-cgrid"><div><h5>TEAM TACTICS (ALL 13)</h5>${TACTIC_GROUPS.flatMap(g => g.controls).map(c => `<div class="cb-tac"><span>${esc(c.label)}</span>
      <select onchange="CB._custom.tactics['${c.id}']=this.value">${c.options.map(o => `<option ${cs.tactics[c.id] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`).join('')}</div>
      <div><h5>SLOT ROLES</h5><table class="cb-slots"><thead><tr><th></th><th>Attack role</th><th>Effort</th><th>Defence role</th><th>Effort</th></tr></thead><tbody>${f.slots.map(slotRow).join('')}</tbody></table></div></div>
    <p class="cc-small">A custom system starts at familiarity ${K('fam_switch_custom') ?? 20} and has no named signature cards — your deck keeps universal, combo and unlocked cards.</p>
    <div class="cc-actions"><button class="btn pri" onclick="CB.saveCustom()">Save &amp; play it</button><button class="btn sec" onclick="this.closest('.cb-modal').remove()">Cancel</button></div></div></div>`;
}
CB.paintCustom = paintCustom;
CB.customSet = (sl, k, v) => { (CB._custom.slots[sl] = CB._custom.slots[sl] || {})[k] = v; };
CB.saveCustom = function(){
  const cs = CB._custom, b = B();
  b.custom_system = {id: 'custom', name: (cs.name || 'My system').slice(0, 24), base_id: cs.base_id, formation: cs.formation, tactics: {...PRESETS.Balanced, ...cs.tactics}, slots: cs.slots};
  const m = $('#cbModal'); if(m) m.innerHTML = '';
  if(b.system_id === 'custom'){ applySystemToSquad(sysById('custom')); CC.saveCareer(); renderBoard(); return toast('Custom system updated'); }
  CB.confirmSwitch('custom');
};

/* ═══ 17. TRAINING WEEK (§11 screen 2) ═══════════════════════════════════ */
const blankPlan = () => ({attr: {}, pair: {}, system: 0, card: {}, rest: {}});
CB.ui.plan = blankPlan();
CB.ui.preview2 = null;
function planList(){
  const p = CB.ui.plan, out = [];
  for(const [pid, d] of Object.entries(p.attr)) for(const [attr, n] of Object.entries(d)) if(n > 0)
    out.push({kind: ['cro', 'fka', 'pen'].includes(attr) && isTaker(pid) ? 'set_piece' : 'attr', pid, attr, tp: n});
  for(const [id, n] of Object.entries(p.pair)) if(n > 0) out.push({kind: 'pair', partnership_id: id, tp: n});
  if(p.system > 0) out.push({kind: 'system', system_id: B().system_id, tp: p.system});
  for(const id of Object.keys(p.card)) if(p.card[id]) out.push({kind: 'card', card_id: id, tp: 2});
  for(const pid of Object.keys(p.rest)) if(p.rest[pid]) out.push({kind: 'rest', pid});
  return out;
}
const isTaker = pid => Object.values(B().set_pieces || {}).includes(pid);
const planTP = () => sum(planList().map(x => x.kind === 'rest' ? 0 : x.tp));
const drillsFor = pid => sum(Object.values(CB.ui.plan.attr[pid] || {}));
const plannedLoad = pid => (B().load[pid] || 0) + drillsFor(pid) * (K('load_per_drill') ?? 3);
let _prevT = null, _prevSeq = 0;
function schedulePreview(){
  clearTimeout(_prevT);
  _prevT = setTimeout(async () => {
    const seq = ++_prevSeq, plan = planList();
    if(!plan.length){ CB.ui.preview2 = null; paintTraining(); return; }
    try{
      const res = await BAPI.train({squad: CB.squadPayload(), build: deep(B()), plan, dry_run: true});
      if(seq !== _prevSeq) return;
      CB.ui.preview2 = res; paintTraining();
    }catch(e){ if(seq === _prevSeq){ CB.ui.preview2 = {errors: [e.message]}; paintTraining(); } }
  }, 120);
}
CB.drill = function(pid, attr, d){
  const p = CB.ui.plan, cur = (p.attr[pid] || {})[attr] || 0, left = B().tp.wallet - planTP();
  if(d > 0 && left <= 0) return toast('No TP left this week.');
  const cap = K('attr_cap_season') ?? 4, done = ((B().trained_this_season || {})[pid] || {})[attr] || 0;
  if(d > 0 && done >= cap) return toast(`${attrName(attr)} is at this season's training cap (+${cap}).`);
  (p.attr[pid] = p.attr[pid] || {})[attr] = Math.max(0, cur + d);
  if(d > 0) delete p.rest[pid];
  paintTraining(); schedulePreview();
};
CB.drillPair = function(id, d){ const p = CB.ui.plan; if(d > 0 && B().tp.wallet - planTP() <= 0) return toast('No TP left this week.');
  p.pair[id] = Math.max(0, (p.pair[id] || 0) + d); paintTraining(); schedulePreview(); };
CB.drillSystem = function(d){ const p = CB.ui.plan; if(d > 0 && B().tp.wallet - planTP() <= 0) return toast('No TP left this week.');
  p.system = Math.max(0, p.system + d); paintTraining(); schedulePreview(); };
CB.toggleCard = function(id){ const p = CB.ui.plan; if(!p.card[id] && B().tp.wallet - planTP() < 2) return toast('A card upgrade costs 2 TP.');
  p.card[id] = !p.card[id]; paintTraining(); schedulePreview(); };
CB.toggleRest = function(pid){ const p = CB.ui.plan; if(drillsFor(pid)) return toast('He is drilling this week — clear his drills to rest him.');
  p.rest[pid] = !p.rest[pid]; paintTraining(); schedulePreview(); };
CB.selPlayer = pid => { CB.ui.playerSel = pid; CB.ui.allAttrs = false; paintTraining(); };
CB.setTaker = function(kind, pid){ B().set_pieces[kind] = pid || null; unlockCombos(); CC.saveCareer(); paintTraining(); };
CB.clearPlan = () => { CB.ui.plan = blankPlan(); CB.ui.preview2 = null; paintTraining(); };
function renderTraining(){
  const el = document.getElementById('trainingBody'); if(!el || S.ui.view !== 'training') return;
  if(!CB.catalog){ el.innerHTML = loadingHTML('Loading the training ground…'); return; }
  if(!CB.ui.playerSel || !P(CB.ui.playerSel) || P(CB.ui.playerSel).clubId !== LIV){
    const xi = startingIds(); CB.ui.playerSel = xi.find(id => P(id).age <= 23) || xi[0] || (clubPool()[0] || {}).id; }
  const w = currentWeek();
  el.innerHTML = `
    <div class="pagehead">TRAINING WEEK · ${esc(weekLabel(w).toUpperCase())}${w.kind === 'double' ? ' · DOUBLE-MATCH WEEK' : ''}</div>
    <div class="cb-head"><div><h2 class="pagetitle">Training ground</h2>
      <div class="cc-small">1 TP = one drill. Gains are exact previews from the build engine: age, potential headroom and diminishing returns included. Each drill adds ${K('load_per_drill') ?? 3} load; above ${K('load_limit') ?? 12} a player starts at −5% energy with a little more injury risk.</div></div>
      <div class="cb-wallet" id="tbWallet"></div></div>
    <div id="tbNote"></div>
    <div class="cb-train">
      <section class="cc-panel cb-roster"><h4>SQUAD <span class="cc-h-r cc-small">load · rest</span></h4><div id="tbRoster"></div></section>
      <section class="cc-panel cb-drills"><h4 id="tbPH">PLAYER</h4><div id="tbPlayer"></div></section>
      <div class="cb-side">
        <section class="cc-panel"><h4>PARTNERSHIP DRILLS <span class="cc-h-r cc-small">1 TP = +10</span></h4><div id="tbPairs"></div></section>
        <section class="cc-panel"><h4>SYSTEM &amp; CARDS</h4><div id="tbSys"></div></section>
        <section class="cc-panel"><h4>SET-PIECE TAKERS</h4><div id="tbSP"></div></section>
      </div>
    </div>
    <div class="cb-tbar" id="tbBar"></div><div id="tbModal"></div><div id="tbFx"></div>`;
  paintTraining();
}
CB.renderTraining = renderTraining;
function paintTraining(){
  if(S.ui.view !== 'training' || !$('#tbWallet')) return;
  const b = B(), wallet = b.tp.wallet, used = planTP(), pv = CB.ui.preview2, dl = (pv && pv.squad_deltas) || {};
  const busy = CB.tickBusy();
  $('#tbWallet').innerHTML = `<span class="cc-k">TRAINING POINTS</span><div class="cb-tp">${Array.from({length: Math.max(wallet, 1)}, (_, i) =>
    `<i class="${i < wallet - used ? 'on' : i < wallet ? 'plan' : 'off'}"></i>`).join('')}</div><b>${wallet - used}</b><em>of ${wallet} left${b.tp.carried ? ` · ${b.tp.carried} carried over` : ''}</em>`;
  const note = $('#tbNote');
  note.innerHTML = busy ? `<div class="cc-note warn">${loadingHTML('The staff are closing last week — training opens in a moment.')}</div>`
    : !wallet ? `<div class="cc-note">No TP left this week. New TP arrive when the week ends (${CB.weekLabel(currentWeek())}${S.career.cal.phase === 'preseason' ? ' — finish the camp week on the Calendar' : ' — after your match'}).</div>` : '';
  // roster
  const groups = [['GOALKEEPERS', p => p.pos === 'GK'], ['DEFENDERS', p => ['CB', 'LB', 'RB'].includes(p.pos)], ['MIDFIELDERS', p => ['CDM', 'CM', 'CAM'].includes(p.pos)], ['FORWARDS', p => ['LW', 'RW', 'LM', 'RM', 'ST'].includes(p.pos)]];
  const lim = K('load_limit') ?? 12;
  $('#tbRoster').innerHTML = groups.map(([g, fn]) => `<div class="cb-rg">${g}</div>` + clubPool().filter(fn).sort((a, c) => (startingIds().includes(c.id) ? 1 : 0) - (startingIds().includes(a.id) ? 1 : 0) || c.ovr - a.ovr).map(p => {
    const ld = plannedLoad(p.id), n = drillsFor(p.id), rest = !!CB.ui.plan.rest[p.id] || !!(b.rest || {})[p.id], c = Math.round(CC.condOf(p.id));
    const gain = r2(sum(Object.values(dl[p.id] || {})));
    return `<div class="cb-rrow ${CB.ui.playerSel === p.id ? 'sel' : ''} ${CC.isInjured(p.id) ? 'inj' : ''}" onclick="CB.selPlayer('${p.id}')">
      <span class="nm"><b>${esc(shortName(p.name))}</b><em>${esc(p.pos)} · ${p.age}${startingIds().includes(p.id) ? ' · XI' : ''}</em></span>
      ${n ? `<span class="dr">${n}×${gain ? ` <b>+${gain}</b>` : ''}</span>` : ''}
      <span class="ld ${ld > lim ? 'over' : ld > lim * .66 ? 'hi' : ''}" title="Load ${ld}/${lim}"><i style="width:${clamp(ld / (lim * 1.5) * 100, 0, 100)}%"></i><s style="left:${100 / 1.5}%"></s></span>
      <span class="cd" style="color:${c >= 85 ? 'var(--good)' : c >= 70 ? '#b6d957' : c >= 55 ? 'var(--warn)' : 'var(--bad)'}">${c}%</span>
      <button class="cb-rest ${rest ? 'on' : ''}" ${n || (b.rest || {})[p.id] ? 'disabled' : ''} title="Rest: +${CAL.REST_BONUS} condition at the end of the week instead of training" onclick="event.stopPropagation();CB.toggleRest('${p.id}')">${rest ? 'RESTING' : 'REST'}</button></div>`;
  }).join('')).join('');
  paintPlayerDrills(dl);
  // partnerships
  const pp = b.partnerships;
  const pvb = pv && pv.build;
  $('#tbPairs').innerHTML = pp.length ? pp.map(x => {
    const pat = patById(x.pattern) || {name: x.pattern}, n = CB.ui.plan.pair[x.id] || 0;
    const after = pvb ? ((pvb.partnerships || []).find(y => y.id === x.id) || {}).fam ?? x.fam : x.fam;
    const lv0 = famLevel(x.fam), lv1 = famLevel(after);
    return `<div class="cb-tpair"><div class="ph"><span class="pi">${PAT_ICON[x.pattern] || '◆'}</span><b>${esc(pat.name)}</b><span class="cc-small">${esc(x.members.map(m => P(m) ? shortName(P(m).name) : '?').join(' + '))}</span></div>
      ${famBar(x.fam, {gain: n ? after - x.fam : 0})}
      <div class="st">${stepper(`CB.drillPair('${x.id}',-1)`, `CB.drillPair('${x.id}',1)`, n)}<span class="cc-small">${n ? `${Math.round(x.fam)} → <b>${Math.round(after)}</b>${lv1 > lv0 ? ` <em class="lvup">LEVEL ${lv1}!</em>` : ''}` : `${Math.round(x.fam)} · Lv${lv0}`}</span></div></div>`;
  }).join('') : `<div class="cc-small cc-muted">No partnerships yet. <button class="cc-link" onclick="CB.pairWizard()">Create one</button> — pairs that fit your system (a crosser + a target, a full-back + winger on one flank…).</div>`;
  // system + cards
  const sys = sysById(b.system_id), fam = b.familiarity[b.system_id] ?? 40, fa = pvb ? (pvb.familiarity || {})[b.system_id] ?? fam : fam;
  const upg = b.deck.map(cardById).filter(c => c && !(b.upgrades || {})[c.id] && c.upgrade);
  $('#tbSys').innerHTML = `<div class="cb-tpair"><div class="ph"><b>${esc(sys.name)} familiarity</b><span class="cc-small">1 TP = +3</span></div>
      ${famBar(fam, {gain: fa - fam})}
      <div class="st">${stepper('CB.drillSystem(-1)', 'CB.drillSystem(1)', CB.ui.plan.system)}<span class="cc-small">${CB.ui.plan.system ? `${Math.round(fam)} → <b>${Math.round(fa)}</b> · boost +${famBoost(fa)}` : `boost +${famBoost(fam)} (reactions, positioning, composure)`}</span></div></div>
    <h5>CARD UPGRADES · 2 TP EACH</h5>
    <div class="cb-upg">${upg.length ? upg.map(c => `<button class="cb-uc ${CB.ui.plan.card[c.id] ? 'on' : ''}" onclick="CB.toggleCard('${c.id}')" title="${esc((c.upgrade || {}).text || '')}">
      <b>${esc(c.name)}${CB.ui.plan.card[c.id] ? '+' : ''}</b><em>${esc((c.upgrade || {}).text || 'Upgrade')}</em></button>`).join('') : '<div class="cc-small cc-muted">Every card in your deck is upgraded.</div>'}</div>`;
  // set pieces
  const opts = (kind, attr) => `<select onchange="CB.setTaker('${kind}',this.value)"><option value="">Automatic (best ${esc(attrName(attr).toLowerCase())})</option>${clubPool().filter(p => p.pos !== 'GK').sort((x, y) => y.a[attr] - x.a[attr]).slice(0, 8).map(p =>
    `<option value="${p.id}" ${b.set_pieces[kind] === p.id ? 'selected' : ''}>${esc(shortName(p.name))} · ${Math.floor(p.a[attr])}</option>`).join('')}</select>`;
  const hooks = (CB.catalog.engine_hooks || {}).E1;
  $('#tbSP').innerHTML = `<div class="cb-sp"><span>Corners</span>${opts('corner', 'cro')}</div><div class="cb-sp"><span>Free kicks</span>${opts('free_kick', 'fka')}</div><div class="cb-sp"><span>Penalties</span>${opts('penalty', 'pen')}</div>
    <div class="cc-small cc-muted">${hooks ? 'Your takers are used in matches.' : 'Takers are used once the engine hook (E1) ships; until then the engine picks the best one.'} Drill a taker's crossing / free kicks / penalties like any attribute.</div>`;
  // bar
  const errs = (pv && pv.errors) || [];
  $('#tbBar').innerHTML = `<div class="sum"><b>${used}</b> TP planned · ${planList().filter(x => x.kind === 'attr' || x.kind === 'set_piece').length} drills · ${Object.values(CB.ui.plan.rest).filter(Boolean).length} resting
      ${errs.length ? `<span class="bad"> · ${esc(errs[0])}</span>` : ''}</div>
    <button class="btn sec" onclick="CB.clearPlan()" ${planList().length ? '' : 'disabled'}>Clear</button>
    <button class="btn pri" id="tbRun" onclick="CB.runTraining()" ${planList().length && !busy && !errs.length ? '' : 'disabled'}>Run training session →</button>`;
}
const stepper = (dn, up, n) => `<span class="cb-step"><button onclick="${dn}" ${n ? '' : 'disabled'} aria-label="Less">−</button><b>${n}</b><button onclick="${up}" aria-label="More">＋</button></span>`;
function slotDemandFor(pid){
  const sys = sysById(B().system_id), sl = Object.keys(S.current.starters).find(k => S.current.starters[k] === pid);
  const d = sys && sl && sys.slots[sl];
  return {slot: sl, demand: d ? d.demand : null, label: d ? d.label : null};
}
function paintPlayerDrills(dl){
  const pid = CB.ui.playerSel, pl = P(pid), box = $('#tbPlayer'); if(!box || !pl) return;
  const b = B(), sd = slotDemandFor(pid), tr = (b.trained_this_season || {})[pid] || {}, cap = K('attr_cap_season') ?? 4;
  const keys = pl.pos === 'GK' ? ['gkd', 'gkh', 'gkp', 'gkr', 'gkk', 'rea', 'cmp'] : Object.keys(ATTR_NAMES).filter(k => !k.startsWith('gk'));
  const ranked = sd.demand ? [...keys].sort((a, c) => (sd.demand[c] || 0) - (sd.demand[a] || 0)) : keys;
  const shown = CB.ui.allAttrs ? ranked : ranked.slice(0, 8);
  const ageF = pl.age <= 21 ? '×1.5 (21 or under)' : pl.age <= 27 ? '×1.0' : pl.age <= 31 ? '×0.6' : '×0.3 (32+)';
  $('#tbPH').innerHTML = `${esc(pl.name.toUpperCase())} <span class="cc-h-r cc-small">${esc(pl.pos)} · age ${pl.age} · pot ${pl.pot}</span>`;
  const anim = CB.ui.anim && CB.ui.anim[pid];
  box.innerHTML = `<div class="cb-pinfo">
      <div>${sd.slot ? `Starts at <b>${esc(sd.slot)}</b>${sd.label ? ` (${esc(sd.label)})` : ''} — attributes ranked by what the slot demands.` : 'Not in the XI — attributes in position order.'}</div>
      <div class="cc-small cc-muted">Age ${ageF} · headroom to potential ${Math.max(0, pl.pot - pl.ovr)} · load this week ${plannedLoad(pid)}/${K('load_limit') ?? 12}</div></div>
    <div class="cb-arows">${shown.map(k => {
      const v = pl.a[k] ?? 0, n = (CB.ui.plan.attr[pid] || {})[k] || 0, g = (dl[pid] || {})[k] || 0, done = tr[k] || 0;
      const w = sd.demand && sd.demand[k] ? Math.round(sd.demand[k] * 100) : 0;
      const A = anim && anim[k];
      const from = A ? A.from : v;
      const crossing = g && Math.floor(v + g) > Math.floor(v);
      return `<div class="cb-arow ${n ? 'on' : ''} ${A ? 'anim' : ''}" data-k="${k}">
        <span class="an">${esc(attrName(k))}${w ? `<i class="dm" title="Slot demand weight">${w}%</i>` : ''}</span>
        <span class="av"><b>${Math.floor(v)}</b>${v % 1 >= 0.05 ? `<small>.${Math.floor((v % 1) * 10)}</small>` : ''}</span>
        <span class="ab"><i class="base" style="width:${clamp(from, 0, 100)}%" data-to="${clamp(v, 0, 100)}"></i>${g ? `<i class="gain" style="left:${clamp(v, 0, 100)}%;width:${Math.max(.6, g)}%"></i>` : ''}</span>
        <span class="ag">${g ? `<b class="${crossing ? 'cross' : ''}">+${g.toFixed(2)}</b><small>→ ${(v + g).toFixed(1)}</small>` : done ? `<small class="cc-muted">+${r1(done)} this season</small>` : ''}</span>
        <span class="acap" title="Season training cap: +${cap}"><i style="width:${clamp((done + g) / cap * 100, 0, 100)}%"></i></span>
        ${stepper(`CB.drill('${pid}','${k}',-1)`, `CB.drill('${pid}','${k}',1)`, n)}</div>`;
    }).join('')}</div>
    <button class="cc-link" onclick="CB.ui.allAttrs=!CB.ui.allAttrs;CB.paintTraining()">${CB.ui.allAttrs ? 'Show the key attributes only' : `All ${keys.length} attributes →`}</button>`;
  if(anim){
    requestAnimationFrame(() => requestAnimationFrame(() => box.querySelectorAll('.cb-arow.anim .base').forEach(i => { i.style.width = i.dataset.to + '%'; })));
  }
}
CB.paintTraining = paintTraining;
/* commit: attributes change for real, bars fill, level-ups flourish */
CB.runTraining = async function(){
  if(isLiveMatch()) return liveBlocked('Training opens after the live match.');
  const plan = planList(); if(!plan.length) return;
  if(CB.tickBusy()) return toast('The staff are still closing last week.');
  const btn = $('#tbRun'); if(btn){ btn.disabled = true; btn.textContent = 'Training…'; }
  const before = {}, b0 = deep(B());
  for(const x of plan) if(x.pid && P(x.pid)) before[x.pid] = {...P(x.pid).a};
  let res;
  try{ res = await BAPI.train({squad: CB.squadPayload(), build: b0, plan, dry_run: false}); }
  catch(e){ toast('Training failed: ' + e.message); paintTraining(); return; }
  if((res.errors || []).length && !Object.keys(res.squad_deltas || {}).length && res.tp_spent === 0){ toast(res.errors[0]); paintTraining(); return; }
  const c = S.career;
  for(const [pid, d] of Object.entries(res.squad_deltas || {})){
    const t = c.train[pid] = c.train[pid] || {};
    for(const [k, v] of Object.entries(d)) t[k] = r2((t[k] || 0) + v);
  }
  // the whole returned build is the new build (build-core.md §3); keep client-only fields
  const keep = {seenUnlocks: B().seenUnlocks};
  c.build = {...B(), ...res.build, ...keep};
  for(const x of plan) if(x.kind === 'rest') (c.build.rest = c.build.rest || {})[x.pid] = true;
  c.trainV = (c.trainV || 0) + 1;
  CC.applyCareerToPlayers();
  unlockCombos();
  c.cal.trainLog = [{t: Date.now(), wk: currentWeek().key, log: res.log || [], tp: res.tp_spent}, ...(c.cal.trainLog || [])].slice(0, 20);
  CC.saveCareer(); saveState();
  _eval.key = null;
  // animation data: bars fill from the old value
  const anim = {};
  for(const [pid, a0] of Object.entries(before)){ anim[pid] = {}; for(const k of Object.keys((res.squad_deltas || {})[pid] || {})) anim[pid][k] = {from: a0[k]}; }
  CB.ui.anim = anim; CB.ui.plan = blankPlan(); CB.ui.preview2 = null;
  const first = Object.keys(anim)[0]; if(first) CB.ui.playerSel = first;
  paintTraining();
  const ups = [...(res.level_ups || [])];
  // partnership levels (in case the server reports them only through fam)
  for(const pp of c.build.partnerships){ const o = (b0.partnerships || []).find(x => x.id === pp.id);
    if(o && famLevel(pp.fam) > famLevel(o.fam) && !ups.some(u => u.kind === 'partnership' && u.id === pp.id)) ups.push({kind: 'partnership', id: pp.id, pattern: pp.pattern, level: famLevel(pp.fam)}); }
  await sleep(700);
  for(const u of ups){ if(u.kind === 'partnership'){ const pp = c.build.partnerships.find(x => x.id === u.id); if(pp) await celebrateLevel(pp, u.level); }
    else if(u.kind === 'attr') await attrPop(u); }
  for(const id of (CB.newCards || [])) await cardPop(cardById(id));
  CB.newCards = [];
  setTimeout(() => { CB.ui.anim = null; }, 1600);
  toast(`Training done — ${res.tp_spent} TP spent${(res.log || []).length ? ' · ' + res.log[0] : ''}`);
};
/* ── flourishes ─────────────────────────────────────────────────────────── */
function fxHost(){ let h = document.getElementById('cbFx'); if(!h){ h = document.createElement('div'); h.id = 'cbFx'; document.body.appendChild(h); } return h; }
async function celebrateLevel(pp, level){
  const pat = patById(pp.pattern) || {name: pp.pattern}, card = pat.card_id && level >= 2 ? cardById(pat.card_id) : null;
  const h = fxHost();
  h.innerHTML = `<div class="cb-flour" onclick="this.remove()"><div class="fl-card lv${level}"><div class="fl-rays"></div>
    <div class="fl-k">PARTNERSHIP</div><div class="fl-lv">LEVEL ${level}</div><div class="fl-nm">${esc(pat.name)}</div>
    <div class="fl-mem">${esc(pp.members.map(m => P(m) ? shortName(P(m).name) : '?').join(' + '))}</div>
    <div class="fl-b">${esc(Object.entries((pat.boosts || {})[level] || {}).map(([r, d]) => `${r} ${Object.entries(d).map(([k, v]) => k.toUpperCase() + ' +' + v).join(' ')}`).join(' · '))}</div>
    ${card ? `<div class="fl-unl">COMBO CARD UNLOCKED · ${esc(card.name)}</div>` : ''}</div></div>`;
  await sleep(2300); const f = h.querySelector('.cb-flour'); if(f){ f.classList.add('out'); await sleep(350); f.remove(); }
}
CB.celebrateLevel = celebrateLevel;
async function attrPop(u){
  const row = document.querySelector(`#tbPlayer .cb-arow[data-k="${u.attr}"]`);
  if(row){ row.classList.add('lvl'); row.insertAdjacentHTML('beforeend', `<span class="cb-plus">+1</span>`); }
  await sleep(450);
}
async function cardPop(c){
  if(!c) return;
  const h = fxHost();
  h.innerHTML = `<div class="cb-flour" onclick="this.remove()"><div class="fl-new"><div class="fl-k">NEW CARD</div>${cardFace(c, {cls: 'big'})}<div class="cc-small">Added to your deck</div></div></div>`;
  await sleep(2000); const f = h.querySelector('.cb-flour'); if(f){ f.classList.add('out'); await sleep(350); f.remove(); }
}

/* ═══ 18. MARKET (§11 screen 7) — fit headline, traits, fog, scouting ════ */
const _mk = {key: null, data: null, pending: false};
function marketEval(list){
  const key = B().system_id + '|' + list.map(p => p.id).join(',') + '|' + (S.career.trainV || 0) + '|' + startingIds().join(',');
  if(_mk.key === key) return _mk.data;
  _mk.key = key; _mk.data = null;
  const sys = sysById(B().system_id);
  BAPI.evaluate({squad: CB.squadPayload(list), xi: mapXIToSystem(sys), system_id: sys.id, build: B()})
    .then(d => { if(_mk.key !== key) return; _mk.data = d; if(S.ui.view === 'transfers') fillMarketFit(); }).catch(e => console.warn('market eval', e));
  return null;
}
function bestSlot(fm){ let best = null; for(const [sl, v] of Object.entries(fm || {})) if(!best || v > best.fit) best = {slot: sl, fit: v}; return best; }
function fillMarketFit(){
  const d = _mk.data; if(!d) return;
  const sys = sysById(B().system_id);
  document.querySelectorAll('#transferTabBody tr[data-pid]').forEach(tr => {
    const pid = tr.dataset.pid, bs = bestSlot(d.fit_matrix[pid]); const td = tr.querySelector('.cb-mfit'), tt = tr.querySelector('.cb-mtr');
    if(td && bs){ const fr = fogRange(pid, 'fit', bs.fit);
      td.innerHTML = `<span class="cb-fitpill ${fitCls(fr ? (fr[0] + fr[1]) / 2 : bs.fit)}" title="Best slot in ${esc(sys.name)}: ${esc(bs.slot)} (${esc((sys.slots[bs.slot] || {}).label || '')})">${fr ? fr[0] + '–' + fr[1] : bs.fit}<em>${esc(bs.slot)}</em></span>`;
      td.dataset.v = bs.fit; }
    if(tt) tt.innerHTML = (d.player_traits[pid] || []).slice(0, 3).map(t => `<span class="cb-tchip">${esc(((CB.catalog.traits.find(x => x.id === t)) || {}).name || t)}</span>`).join('');
  });
  if(CB.ui.mSortFit){
    const tb = document.querySelector('#transferTabBody table.market tbody'); if(!tb) return;
    [...tb.querySelectorAll('tr[data-pid]')].sort((a, b) => (+(b.querySelector('.cb-mfit') || {}).dataset?.v || 0) - (+(a.querySelector('.cb-mfit') || {}).dataset?.v || 0)).forEach(r => tb.appendChild(r));
  }
}
const _renderMarket = window.renderMarket;
window.renderMarket = function(){
  const r = _renderMarket.apply(this, arguments);
  try{
    if(!CB.catalog || !S.career.build) return r;
    const body = $('#transferTabBody'), tbl = body && body.querySelector('table.market'); if(!tbl) return r;
    const w = windowState(), sys = sysById(B().system_id);
    body.insertAdjacentHTML('afterbegin', `<div class="cb-window ${w.open ? 'open' : 'shut'}"><b>${esc(w.name.toUpperCase())}</b> ${w.open ? `closes ${esc(w.closes)}${w.january ? ` · January prices +${Math.round((CAL.JANUARY_PREMIUM - 1) * 100)}%` : ''}` : `opens in ${esc(w.opens)} — you can scout and shortlist meanwhile`}
      <span class="cc-h-r">Fit = best slot in <b>${esc(sys.name)}</b> · ranges until scouted (Scouts Lv${B().staff.scout})
      <button class="btn ${CB.ui.mSortFit ? 'pri' : 'sec'} sm" onclick="CB.ui.mSortFit=!CB.ui.mSortFit;renderMarket()">Sort by fit</button></span></div>`);
    const th = tbl.querySelector('thead tr'); th.children[4].textContent = 'OVR';
    th.insertAdjacentHTML('beforeend', '<th class="num">FIT</th><th>TRAITS</th>');
    const list = [];
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const m = /openTransferProfile\('([^']+)'\)/.exec(tr.getAttribute('onclick') || ''); if(!m) return;
      const pl = P(m[1]); if(!pl) return;
      tr.dataset.pid = pl.id; list.push(pl);
      const ovrTd = tr.children[4]; if(ovrTd) ovrTd.innerHTML = `<b>${esc(fogTxt(pl.id, 'ovr', pl.ovr))}</b>${isScouted(pl.id) ? ' <span class="cb-sc" title="Scouted">✓</span>' : S.career.market.requests[pl.id] ? ' <span class="cb-sc wait" title="Scout on the way">…</span>' : ''}`;
      tr.insertAdjacentHTML('beforeend', '<td class="num cb-mfit"><i class="cc-dot"></i></td><td class="cb-mtr"></td>');
    });
    const d = marketEval(list); if(d) fillMarketFit();
  }catch(e){ console.warn('[coach-build] market', e); }
  return r;
};
async function fitHeadline(pl){
  const sys = sysById(B().system_id), cur = await evaluateNow();
  const ev = await BAPI.evaluate({squad: CB.squadPayload([pl]), xi: xiNow(), system_id: sys.id, build: B()});
  const bs = bestSlot(ev.fit_matrix[pl.id]); if(!bs) return null;
  const xi2 = {...xiNow(), [bs.slot]: pl.id};
  const ev2 = await BAPI.evaluate({squad: CB.squadPayload([pl]), xi: xi2, system_id: sys.id, build: B()});
  const incumbent = xiNow()[bs.slot], incFit = incumbent ? (cur.slot_fit || {})[bs.slot] : null;
  const gains = (ev2.traits || []).map(t => ({t, old: (cur.traits || []).find(x => x.id === t.id) || {count: 0, active: false}})).filter(x => x.t.count > x.old.count);
  const d = sysById(sys.id).slots[bs.slot] || {};
  return {slot: bs.slot, fit: bs.fit, role: d.label || d.attackRole || bs.slot, incumbent, incFit, gains, sysFit: [cur.system_fit, ev2.system_fit], traits: ev.player_traits[pl.id] || []};
}
const _otp = window.openTransferProfile;
window.openTransferProfile = function(pid){
  const r = _otp.apply(this, arguments);
  try{
    const pl = P(pid); if(!pl || !CB.catalog || !S.career.build) return r;
    const sc = isScouted(pid), req = S.career.market.requests[pid];
    $('#drawerSub').textContent = `${clubById(pl.clubId).name} · ${pl.pos} · OVR ${fogTxt(pid, 'ovr', pl.ovr)}`;
    if(!sc){ const cd = document.querySelector('#drawerBody .card'); if(cd && cd.parentElement) cd.parentElement.classList.add('cb-fog'); }
    $('#drawerBody').insertAdjacentHTML('afterbegin', `<div class="cb-headline" id="cbHead">${loadingHTML('Checking how he fits your system…')}</div>`);
    $('#drawerBody').insertAdjacentHTML('beforeend', `<div class="impact cb-scout"><h5>SCOUTING</h5>${sc ? `<div class="cc-small good">Scouted — exact attributes.</div>`
      : req ? `<div class="cc-small warn">A scout is watching him — the report lands after this week.</div>`
      : `<div class="cc-small">Attributes show as ranges (±${fogWidth()}) until scouted.</div><button class="btn sec sm" onclick="CB.scout('${pid}')">Scout him — ${fmtM(ECON.SCOUT_FEE)}, 1 week</button>`}</div>
      <div class="impact" id="cbCompare">${loadingHTML('Comparing with your starter…')}</div>`);
    fitHeadline(pl).then(h => {
      const el = $('#cbHead'); if(!el || !h) return;
      const fr = fogRange(pid, 'fit', h.fit), fitT = fr ? `${fr[0]}–${fr[1]}` : h.fit;
      const g = h.gains[0];
      const fills = g ? (g.t.active && !g.old.active ? `completes your <b>${esc(g.t.name)}</b> (${g.t.count}/${g.t.need})` : `fills your ${ordinal(g.t.count)} <b>${esc(g.t.name)}</b> (${g.t.count}/${g.t.need})`) : null;
      el.innerHTML = `<div class="hl"><b>${esc(shortName(pl.name))}</b>: ${esc(h.role)} fit <span class="cb-fitpill ${fitCls(fr ? (fr[0] + fr[1]) / 2 : h.fit)}">${fitT}<em>${esc(h.slot)}</em></span>${fills ? ` → ${fills}` : ''}</div>
        <div class="cc-small">${h.incumbent ? `Your ${esc(h.slot)} now: ${esc(shortName(P(h.incumbent).name))} (fit ${h.incFit ?? '—'}). ` : `You have nobody at ${esc(h.slot)}. `}${sc ? `System fit with him in the XI: ${h.sysFit[0]} → <b>${h.sysFit[1]}</b>.` : 'Scout him for the exact system-fit change.'}</div>
        ${h.traits.length ? `<div class="cb-tchips">${h.traits.map(t => `<span class="cb-tchip">${esc(((CB.catalog.traits.find(x => x.id === t)) || {}).name || t)}</span>`).join('')}</div>` : ''}
        <div class="cc-small cc-muted">New signings start every partnership at familiarity 0.</div>`;
      compareHTML(pl, h);
    }).catch(e => { const el = $('#cbHead'); if(el) el.innerHTML = `<div class="cc-small cc-muted">Fit unavailable (${esc(e.message)}).</div>`; });
  }catch(e){ console.warn('[coach-build] profile', e); }
  return r;
};
function compareHTML(pl, h){
  const el = $('#cbCompare'); if(!el) return;
  const sys = sysById(B().system_id), d = sys.slots[h.slot] || {}, inc = h.incumbent && P(h.incumbent);
  const keys = Object.entries(d.demand || {}).sort((a, b) => b[1] - a[1]).slice(0, 7).map(e => e[0]);
  el.innerHTML = `<h5>VS YOUR ${esc(h.slot)}${inc ? ' · ' + esc(shortName(inc.name).toUpperCase()) : ''}</h5>
    <div class="cb-cmp">${keys.map(k => { const v = pl.a[k], fr = fogRange(pl.id, k, v), u = inc ? inc.a[k] : null;
      const mid = fr ? (fr[0] + fr[1]) / 2 : v;
      return `<div class="row"><span>${esc(attrName(k))}</span>
        <span class="bars"><i class="them ${fr ? 'fog' : ''}" style="${fr ? `left:${fr[0]}%;width:${fr[1] - fr[0]}%` : `width:${v}%`}"></i>${u != null ? `<i class="you" style="width:${u}%"></i>` : ''}</span>
        <b class="${u != null && mid > u + 2 ? 'good' : u != null && mid < u - 2 ? 'bad' : ''}">${fr ? fr[0] + '–' + fr[1] : Math.floor(v)}</b><em>${u != null ? Math.floor(u) : '—'}</em></div>`; }).join('')}</div>
    <div class="cc-small cc-muted"><span class="cb-lg them"></span>${esc(shortName(pl.name))} <span class="cb-lg you"></span>${inc ? esc(shortName(inc.name)) : 'nobody'} · weighted by what ${esc(h.slot)} demands in ${esc(sys.name)}</div>`;
}
const LABEL_KEY = Object.fromEntries(ATTR_GROUPS.flatMap(([g, rows]) => rows.map(([k, l]) => [l, k])));
/* the player drawer: fractional training shows as whole points; rivals are fogged */
const _odB = window.openDetails;
window.openDetails = function(pid){
  const r = _odB.apply(this, arguments);
  try{
    const pl = P(pid); if(!pl || !S.career || !S.career.market) return r;
    const fog = pl.clubId !== LIV && !isScouted(pid);
    document.querySelectorAll('#drawerBody .arow').forEach(row => {
      const b = row.querySelector('b'); if(!b) return;
      const v = +b.textContent; if(isNaN(v)) return;
      const lab = row.querySelector('span').textContent, k = LABEL_KEY[lab] || Object.keys(ATTR_NAMES).find(x => ATTR_NAMES[x] === lab) || lab;
      if(fog){ b.textContent = fogTxt(pid, k, v); const i = row.querySelector('.track i'); if(i) i.style.opacity = .35; }
      else b.textContent = Math.floor(v);
    });
    if(fog) $('#drawerBody').insertAdjacentHTML('afterbegin', `<div class="cc-note">Not scouted: attributes are ranges (±${fogWidth()}). Scout him from the Transfers screen for exact values.</div>`);
  }catch(e){ console.warn(e); }
  return r;
};

/* ═══ 19. CLUB — finances, staff, board limits (§11 screen 8) ════════════ */
const INC_LABEL = {tv_flat: 'TV — equal share', tv_merit: 'TV — merit payment', gate: 'Gate receipts', prize: 'Prize money', commercial: 'Commercial & merchandise', sales: 'Player sales'};
const COST_LABEL = {wages: 'Wages', running: 'Coaches, agents & running costs', transfers: 'Transfer fees', instalments: 'Instalments', staff: 'Staff upgrades', scouting: 'Scouting'};
function projection(){
  const row = livRow(), pos = row.p ? row.pos : Math.max(1, (S.career.board.objective || {}).min || 4);
  const left = 38 - livFixtures().filter(f => S.season.results[f.id]).length;
  const homeLeft = livFixtures().filter(f => !S.season.results[f.id] && f.home === LIV).length;
  const wkLeft = weeks().filter(w => !S.career.cal.weekDone[w.key] && !(S.career.econ.done['week:' + w.key])).length;
  const E = econ();
  const inc = {tv_flat: E.income.tv_flat + ECON.TV_FLAT_SEASON / 38 * left, tv_merit: E.income.tv_merit || ECON.TV_MERIT_PER_PLACE * (21 - pos),
    gate: E.income.gate + ECON.GATE_PER_HOME[stature(LIV)] * homeLeft, prize: E.income.prize || ECON.PRIZE(pos),
    commercial: E.income.commercial + commercialAnnual() / ECON.SEASON_WEEKS * wkLeft, sales: E.income.sales};
  const cost = {wages: E.costs.wages + weeklyWages() * wkLeft, running: (E.costs.running || 0) + runningAnnual() / ECON.SEASON_WEEKS * wkLeft, transfers: E.costs.transfers, instalments: E.costs.instalments + sum(E.instalments.filter(i => !i.paid).map(i => i.amt)),
    staff: E.costs.staff, scouting: E.costs.scouting};
  return {inc, cost, pos};
}
const _renderFin = window.renderFinances;
window.renderFinances = function(){
  const r = _renderFin.apply(this, arguments);
  try{
    const el = $('#financesBody'); if(!el || !CB.catalog || !S.career.econ) return r;
    const E = econ(), pj = projection(), L = boardLimits(), w = windowState();
    const pct = v => Math.round(v * 100);
    const gaugeMax = 1.1;
    const rows = (obj, lab, pj2) => Object.keys(lab).map(k => `<div class="finrow"><span>${lab[k]}</span><b>${fmtM(obj[k] || 0)}</b><em>${fmtM(pj2[k] || 0)}</em></div>`).join('');
    const totI = sum(Object.values(E.income)), totC = sum(Object.values(E.costs)), pI = sum(Object.values(pj.inc)), pC = sum(Object.values(pj.cost));
    const staff = CB.catalog.staff.map(sf => { const lv = B().staff[sf.id] || 1, next = lv < 3 ? staffCost(sf.id, lv + 1) : null;
      return `<div class="cb-staff ${CB.flash && CB.flash.id === sf.id ? 'flash' : ''}"><div class="sh"><b>${esc(sf.name)}</b><span class="pips">${[1, 2, 3].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span></div>
        <div class="cc-small"><b>Now:</b> ${esc(sf.effects[lv] || sf.effects[String(lv)] || '')}</div>
        ${next != null ? `<div class="cc-small cc-muted"><b>Level ${lv + 1}:</b> ${esc(sf.effects[lv + 1] || sf.effects[String(lv + 1)] || '')}</div>
          <button class="btn sec sm" onclick="CB.buyStaff('${sf.id}')" ${S.finance.cashBalance < next ? 'disabled' : ''}>Upgrade — ${fmtM(next)}</button>` : '<div class="cc-small good">Maximum level</div>'}</div>`; }).join('');
    CB.flash = null;
    el.querySelectorAll('.homegrid, .scrpanel, .fingrid, :scope > .finnote').forEach(n => n.remove());
    el.querySelector('.pagetitle').textContent = 'Club';
    el.querySelector('.pagetitle').insertAdjacentHTML('afterend', `
      <div class="homegrid" style="margin-bottom:14px"><div class="hcard"><div class="hk">TRANSFER BUDGET</div><div class="hv">${fmtM(S.finance.transferBudget)}</div><div class="hs">board allocation</div></div><div class="hcard"><div class="hk">ANNUAL PLAYER WAGES</div><div class="hv">${fmtM(financeSnapshot().annualWages)}</div><div class="hs">${fmtM(financeSnapshot().weeklyK / 1000)} per salary week × 52</div></div><div class="hcard"><div class="hk">CASH BALANCE</div><div class="hv">${fmtM(S.finance.cashBalance)}</div><div class="hs">available cash</div></div><div class="hcard"><div class="hk">PROJECTED SEASON NET</div><div class="hv">${pI - pC >= 0 ? '+' : ''}${fmtM(pI - pC)}</div><div class="hs">income ${fmtM(pI)} · costs ${fmtM(pC)}</div></div></div>
      <div class="cb-club">
        <section class="cc-panel cb-limits"><h4>BOARD LIMITS</h4>
          <div class="cb-gauge"><div class="bar"><i class="${L.freeze ? 'bad' : L.warn ? 'warn' : 'good'}" style="width:${clamp(L.ratio / gaugeMax * 100, 0, 100)}%"></i>
            <s style="left:${ECON.WAGE_WARN / gaugeMax * 100}%"><em>WARN ${pct(ECON.WAGE_WARN)}%</em></s><s class="red" style="left:${ECON.WAGE_FREEZE / gaugeMax * 100}%"><em>FREEZE ${pct(ECON.WAGE_FREEZE)}%</em></s></div>
            <div class="cb-gv"><b class="${L.freeze ? 'bad' : L.warn ? 'warn' : 'good'}">${pct(L.ratio)}%</b><span class="cc-small">annual squad costs (wages + amortisation + fees) ÷ projected revenue</span></div></div>
          <div class="finrow"><span>${esc(w.name)}</span><b>${w.open ? 'closes ' + esc(w.closes) : 'opens in ' + esc(w.opens)}</b></div>
          <div class="finrow"><span>Transfer budget (this window)</span><b>${fmtM(S.finance.transferBudget)}</b></div>
          <div class="finrow"><span>Season objective</span><b>${esc(S.career.board.objective.text)}</b></div>
          <div class="finrow"><span>Reputation</span><b>${E.reputation ?? 60}/100</b></div>
          ${L.freeze ? '<div class="cc-note bad">Signings are frozen until wages drop under the limit.</div>' : L.warn ? '<div class="cc-note warn">The board is watching the wage bill.</div>' : ''}</section>
        <section class="cc-panel"><h4>SEASON LEDGER <span class="cc-h-r cc-small">so far · projected</span></h4>
          <h5>INCOME</h5>${rows(E.income, INC_LABEL, pj.inc)}<div class="finrow tot"><span>Total</span><b>${fmtM(totI)}</b><em>${fmtM(pI)}</em></div>
          <h5>COSTS</h5>${rows(E.costs, COST_LABEL, pj.cost)}<div class="finrow tot"><span>Total</span><b>${fmtM(totC)}</b><em>${fmtM(pC)}</em></div>
          <div class="finrow tot"><span>Net</span><b class="${totI - totC >= 0 ? 'good' : 'bad'}">${fmtM(totI - totC)}</b><em class="${pI - pC >= 0 ? 'good' : 'bad'}">${fmtM(pI - pC)}</em></div>
          <div class="cc-small cc-muted">Projection assumes you finish ${ordinal(pj.pos)}. Wages ${fmtM(weeklyWages())} per calendar week (the annual bill over ${ECON.SEASON_WEEKS} weeks) · TV share ${fmtM(ECON.TV_FLAT_SEASON / 38)}/match · gate ≈ ${fmtM(ECON.GATE_PER_HOME[stature(LIV)])}/home match.</div></section>
        <section class="cc-panel"><h4>STAFF <span class="cc-h-r cc-small">cash ${fmtM(S.finance.cashBalance)}</span></h4><div class="cb-staffg">${staff}</div></section>
        <section class="cc-panel"><h4>RECENT TRANSACTIONS</h4>
          ${E.instalments.filter(i => !i.paid).length ? `<div class="cc-note warn">Instalments due: ${E.instalments.filter(i => !i.paid).map(i => `${esc(i.name)} ${fmtM(i.amt)} (MW${i.due_mw})`).join(' · ')}</div>` : ''}
          <div class="cb-log">${E.log.slice(0, 14).map(x => `<div><span>${esc(x.text)}</span><b class="${x.amt >= 0 ? 'good' : 'bad'}">${x.amt >= 0 ? '+' : ''}${fmtM(x.amt)}</b></div>`).join('') || '<div class="cc-small cc-muted">Money moves appear here week by week.</div>'}</div></section>
      </div>`);
  }catch(e){ console.warn('[coach-build] club', e); }
  return r;
};

/* ═══ 20. CALENDAR — camp, friendlies, windows, double weeks ═════════════ */
const _renderSched = window.renderSchedule;
window.renderSchedule = function(){
  const el = $('#scheduleBody'); if(!el) return;
  if(!CB.catalog || !S.career || !S.career.cal) return _renderSched.apply(this, arguments);
  try{ renderCalendar(el); }catch(e){ console.warn('[coach-build] calendar', e); _renderSched.apply(this, arguments); }
};
function renderCalendar(el){
  const c = S.career, cal = c.cal, next = nextLivFixture(), cw = currentWeek();
  const pre = cal.phase === 'preseason';
  const camp = weeks().filter(w => w.kind === 'camp').map(w => {
    const fr = campFriendly(w.camp), done = cal.weekDone[w.key] || (!pre), cur = pre && cal.camp === w.camp;
    return `<div class="cb-week camp ${cur ? 'cur' : ''} ${done ? 'done' : ''}"><div class="wk"><b>CAMP ${w.camp}</b><em>${K('tp_camp') ? Math.round(K('tp_camp')) : 10} TP</em></div>
      <div class="bd">${fr ? `<div class="fx"><span class="tag fr">FRIENDLY</span>${esc(clubName(fr.home ? LIV : fr.opp))} ${fr.result ? `<b class="sc">${fr.result.score[0]}–${fr.result.score[1]}</b>` : '<span class="vs">vs</span>'} ${esc(clubName(fr.home ? fr.opp : LIV))}
          <span class="dt">${esc(fr.date)}</span>
          ${cur && !fr.result ? `<span class="acts"><button class="btn pri sm" onclick="CB.playFriendly('${fr.id}')">Play</button><button class="btn sec sm" ${fr.simming ? 'disabled' : ''} onclick="CB.simFriendly('${fr.id}')">${fr.simming ? 'Simulating…' : 'Quick sim'}</button></span>` : ''}</div>`
        : '<div class="fx cc-muted">Training camp — no fixture. Build the squad: System Board, Training, Transfers.</div>'}
        ${cur ? `<div class="wa"><button class="btn ${fr && !fr.result ? 'sec' : 'pri'} sm" onclick="CB.finishCampWeek()" ${CB.tickBusy() ? 'disabled' : ''}>${w.camp < CAL.CAMP_WEEKS ? `Finish camp week ${w.camp} →` : 'Finish camp → matchweek 1'}</button>
          ${fr && !fr.result ? '<span class="cc-small cc-muted">(skips the friendly)</span>' : ''}</div>` : ''}</div></div>`;
  }).join('');
  const lw = weeks().filter(w => w.kind !== 'camp').map(w => {
    const fx = w.mws.map(mw => livFixtureOf(mw)).filter(Boolean);
    const isCur = !pre && cw && cw.key === w.key;
    const jan = w.mws.some(mw => CAL.JANUARY_MWS.includes(mw)), sum_ = w.mws.some(mw => mw <= CAL.SUMMER_OPEN_THROUGH_MW);
    return `<div class="cb-week ${w.kind} ${isCur ? 'cur' : ''} ${w.mws.every(livDone) ? 'done' : ''}" ${isCur ? 'id="cbCurWeek"' : ''}>
      <div class="wk"><b>${w.mws.length > 1 ? `MW ${w.mws[0]}–${w.mws[1]}` : `MW ${w.mws[0]}`}</b><em>${w.kind === 'double' ? `${K('tp_midweek') ?? 3} TP · 2 MATCHES` : `${K('tp_week') ?? 6} TP`}</em>
        ${jan ? '<span class="tag win">JANUARY WINDOW</span>' : sum_ ? '<span class="tag win">SUMMER WINDOW</span>' : ''}</div>
      <div class="bd">${fx.map(f => { const r = S.season.results[f.id], isNext = next && next.id === f.id;
        const lr = r ? CC_res(f) : null;
        return `<div class="fx ${r ? 'clickable' : ''}" ${r ? `onclick="(window.CM && CM.openPast) ? CM.openPast('${f.id}') : openResult('${f.id}')"` : ''}>
          <span class="tag ${f.home === LIV ? 'h' : 'a'}">${f.home === LIV ? 'H' : 'A'}</span>${esc(clubName(f.home))} ${r ? `<b class="sc ${lr}">${r.score[0]}–${r.score[1]}</b>` : '<span class="vs">vs</span>'} ${esc(clubName(f.away))}
          <span class="dt">${esc(f.date)}</span>
          ${isNext && !pre ? `<span class="acts"><button class="btn pri sm" onclick="event.stopPropagation();startFixture('${f.id}')">Play match</button></span>` : ''}</div>`; }).join('')}</div></div>`;
  }).join('');
  const nDouble = CAL.DOUBLE_PAIRS.length;
  el.innerHTML = `<div class="pagehead">LIVERPOOL · ${esc(PREMIER_LEAGUE.season)}</div>
    <div class="cb-head"><div><h2 class="pagetitle">Calendar</h2>
      <div class="cc-small">Pre-season camp (4 weeks, 3 friendlies, ${(K('tp_camp') ?? 10) * CAL.CAMP_WEEKS} TP) → matchweeks 1–19 → January window → matchweeks 20–38 → season review.
      ${nDouble} double-match weeks (December and the run-in) play two league rounds with only ${K('tp_midweek') ?? 3} TP and little recovery between them — rotate.</div></div>
      <div class="cb-legend"><span class="tag fr">FRIENDLY</span><span class="tag dbl">DOUBLE WEEK</span><span class="tag win">WINDOW OPEN</span></div></div>
    ${pre ? `<div class="cc-note good cc-wide-note"><b>Pre-season camp · week ${cal.camp} of ${CAL.CAMP_WEEKS}.</b> This is where most building happens: ${B().tp.wallet} TP to spend. The summer window is open.</div>` : ''}
    <h3 class="cc-sub">PRE-SEASON</h3><div class="cb-weeks">${camp}</div>
    <h3 class="cc-sub">PREMIER LEAGUE</h3><div class="cb-weeks">${lw}</div>`;
  const cur = document.getElementById('cbCurWeek'); if(cur && !CB._calScrolled){ CB._calScrolled = true; setTimeout(() => cur.scrollIntoView({block: 'center'}), 50); }
}
function CC_res(f){ const r = S.season.results[f.id], gf = f.home === LIV ? r.score[0] : r.score[1], ga = f.home === LIV ? r.score[1] : r.score[0]; return gf > ga ? 'W' : gf < ga ? 'L' : 'D'; }

/* ═══ 21. SEASON REVIEW (§11 screen 9) — growth, contracts, youth, money ═ */
CC.seasonReviewHTML = function(se){
  try{
    if(!se.econ) CC.onSeasonEnd(se);
    const e = se.econ || {}, rep = e.reputation || [60, 60];
    const repAdj = r1(((rep[1] ?? 60) - 50) * ECON.REPUTATION_BUDGET);
    const bonus = BUDGET_BY_POS_(se.pos), base = INITIAL_CLUB_FINANCES.LIV.transferBudget;
    const nextBudget = r1(base * ECON.BUDGET_BASE_SHARE + bonus + Math.max(0, S.finance.transferBudget) * 0.3 + repAdj);
    const inc = sum(Object.values(e.income || {})), cost = sum(Object.values(e.costs || {}));
    const renewed = S.career.renewals || {};
    return `<section class="cc-panel"><h4>MONEY &amp; REPUTATION</h4>
        <div class="finrow"><span>TV merit payment (${ordinal(se.pos)})</span><b class="good">+${fmtM(e.merit || 0)}</b></div>
        <div class="finrow"><span>Prize money</span><b class="${e.prize ? 'good' : ''}">${e.prize ? '+' + fmtM(e.prize) : '—'}</b></div>
        <div class="finrow"><span>Season income · costs</span><b>${fmtM(inc)} · ${fmtM(cost)}</b></div>
        <div class="finrow"><span>Reputation</span><b>${rep[0]} → <span class="${rep[1] >= rep[0] ? 'good' : 'bad'}">${rep[1]}</span></b></div>
        <div class="cb-budget"><span class="cc-k">NEXT SEASON'S BUDGET</span><b>${fmtM(nextBudget)}</b>
          <span class="cc-small">${fmtM(base * ECON.BUDGET_BASE_SHARE)} base + ${fmtM(bonus)} finish bonus + ${fmtM(Math.max(0, S.finance.transferBudget) * 0.3)} carried + ${fmtM(repAdj)} reputation</span></div></section>
      <section class="cc-panel"><h4>GROWTH <span class="cc-h-r cc-small">training + minutes</span></h4>
        ${(se.growth || []).length ? se.growth.map(g => `<div class="cb-grow"><b>${esc(shortName(g.name))}</b><span class="bar"><i style="width:${clamp(g.total * 8, 3, 100)}%"></i></span>
          <em class="${g.total >= 0 ? 'good' : 'bad'}">${g.total >= 0 ? '+' : ''}${g.total}</em><small>${g.top.map(t => `${esc(t.k.toUpperCase())} ${t.v >= 0 ? '+' : ''}${t.v}`).join(' · ')}</small></div>`).join('')
          : '<div class="cc-small cc-muted">No attribute growth this season.</div>'}</section>
      <section class="cc-panel"><h4>CONTRACTS <span class="cc-h-r cc-small">expiring this summer</span></h4>
        ${(se.contracts || []).length ? se.contracts.map(x => { const st = renewed[x.pid];
          return `<div class="cb-ctr"><b>${esc(x.name)}</b><span class="cc-small">${x.age}y · ${x.ovr} · ${fmtK(x.wage)}</span>
            ${st && st.released ? '<em class="bad">leaving</em>' : st ? `<em class="good">renewed to ${st.end}</em>` : `<span class="acts"><button class="btn pri sm" onclick="CB.renew('${x.pid}')">Renew 3 yrs (+12%)</button><button class="btn sec sm" onclick="CB.release('${x.pid}')">Let go</button></span>`}</div>`; }).join('')
          + '<div class="cc-small cc-muted">Anyone not renewed leaves on a free when the new season starts.</div>'
          : '<div class="cc-small cc-muted">No contracts expire this summer.</div>'}</section>
      <section class="cc-panel"><h4>YOUTH INTAKE <span class="cc-h-r cc-small">Academy Lv${B().staff.academy}</span></h4>
        ${(se.youth || []).map(y => { const pl = youthPlayer(y); return `<div class="cb-ctr"><b>${esc(pl.name)}</b><span class="cc-small">${esc(pl.pos)} · 17y · ${pl.ovr} now · potential <b>${pl.pot}</b></span>
          ${y.signed ? '<em class="good">signed</em>' : `<span class="acts"><button class="btn pri sm" onclick="CB.signYouth('${y.id}')">Sign (${fmtK(ECON.YOUTH_WAGE_K)})</button></span>`}</div>`; }).join('')}
        <div class="cc-small cc-muted">Better Academy staff bring more prospects with higher potential.</div></section>`;
  }catch(e){ console.warn('[coach-build] season review', e); return ''; }
};
const BUDGET_BY_POS_ = pos => pos === 1 ? 45 : pos === 2 ? 35 : pos <= 4 ? 25 : pos <= 6 ? 12 : pos <= 10 ? 5 : 0;

/* ═══ 22. HOME + PRE-MATCH READOUTS ══════════════════════════════════════ */
CC.systemStripHTML = function(f){
  try{
    if(!CB.catalog || !S.career.build) return '';
    const b = B(), sys = sysById(b.system_id), ev = _eval.data;
    if(!ev || ev._key !== evalKey(b.system_id, xiNow())) evaluateNow().then(() => { const el = $('#ccSysStrip'); if(el) el.outerHTML = CC.systemStripHTML(f); }).catch(() => {});
    const fam = b.familiarity[b.system_id] ?? 40;
    return `<div class="cb-strip" id="ccSysStrip"><span class="cc-k">SYSTEM</span><b>${esc(sys.name)}</b>
      <span class="cb-fitpill ${ev ? fitCls(ev.system_fit) : ''}">${ev ? ev.system_fit : '…'}<em>FIT</em></span>
      <span class="cc-small">familiarity ${Math.round(fam)} (+${famBoost(fam)})</span>
      ${ev ? (ev.traits || []).map(t => traitHTML(t, true)).join('') : ''}
      ${!systemApplied() ? `<span class="cc-note warn" style="margin:0">Team not set up in ${esc(sys.name)} — <button class="cc-link" onclick="CB.applyNow();renderMatch()">apply</button></span>` : ''}
      <button class="cc-link" onclick="show('build')">System Board →</button></div>`;
  }catch(e){ return ''; }
};
const _rh = window.renderHome;
window.renderHome = function(){
  const r = _rh.apply(this, arguments);
  try{
    const el = $('#homeBody'); if(!el || !CB.catalog || !S.career || !S.career.build) return r;
    const c = S.career, b = B(), sys = sysById(b.system_id), w = currentWeek(), pre = c.cal.phase === 'preseason';
    const fr = pre ? campFriendly(c.cal.camp) : null, ev = _eval.data, fam = b.familiarity[b.system_id] ?? 40;
    if(!ev) evaluateNow().then(() => { if(S.ui.view === 'home') renderHome(); }).catch(() => {});
    const L = boardLimits(), win = windowState();
    const html = `<section class="cc-panel cb-week-p"><h4>${pre ? `PRE-SEASON CAMP · WEEK ${c.cal.camp}/${CAL.CAMP_WEEKS}` : `THIS WEEK · ${esc(weekLabel(w).toUpperCase())}${w.kind === 'double' ? ' · TWO MATCHES' : ''}`}</h4>
      <div class="cb-hw">
        <div class="cb-hstat"><span class="cc-k">TP</span><b>${b.tp.wallet}</b><button class="cc-link" onclick="show('training')">Train →</button></div>
        <div class="cb-hstat"><span class="cc-k">${esc(sys.name.toUpperCase())}</span><b class="${ev ? fitCls(ev.system_fit) : ''}">${ev ? ev.system_fit : '…'}</b><em>fit · fam ${Math.round(fam)}</em><button class="cc-link" onclick="show('build')">System Board →</button></div>
        <div class="cb-hstat"><span class="cc-k">WINDOW</span><b class="${win.open ? 'good' : ''}" style="font-size:15px">${win.open ? 'OPEN' : 'CLOSED'}</b><em>${esc(win.open ? 'closes ' + win.closes : 'opens ' + win.opens)}</em></div>
        <div class="cb-hstat"><span class="cc-k">SQUAD COST / REV</span><b class="${L.freeze ? 'bad' : L.warn ? 'warn' : ''}">${Math.round(L.ratio * 100)}%</b><button class="cc-link" onclick="show('finances')">Club →</button></div>
      </div>
      ${ev ? `<div class="cb-htraits">${(ev.traits || []).map(t => traitHTML(t, true)).join('')}</div>` : ''}
      ${pre ? `<div class="cc-actions" style="justify-content:flex-start">${fr && !fr.result ? `<button class="btn pri sm" onclick="CB.playFriendly('${fr.id}')">Play friendly v ${esc(clubName(fr.opp))}</button>` : ''}
        <button class="btn ${fr && !fr.result ? 'sec' : 'pri'} sm" onclick="CB.finishCampWeek()">${c.cal.camp < CAL.CAMP_WEEKS ? `Finish camp week ${c.cal.camp}` : 'Finish camp → MW1'}</button>
        <button class="btn sec sm" onclick="show('schedule')">Calendar</button></div>` : ''}</section>`;
    const grid = el.querySelector('.cc-home');
    if(grid) grid.insertAdjacentHTML('afterbegin', html);
    if(pre){ const t = el.querySelector('.pagetitle'); if(t) t.textContent = `Pre-season · camp week ${c.cal.camp}`;
      const nf = el.querySelector('.cc-next h4'); if(nf) nf.textContent = 'OPENING FIXTURE'; }
  }catch(e){ console.warn('[coach-build] home', e); }
  return r;
};
/* Squad screen: fit rings on the pitch cards (current system) */
const _slotInnerB = window.slotInner;
window.slotInner = function(pid, slotPos, opts){
  let h = _slotInnerB.apply(this, arguments);
  try{
    const ev = _eval.data; if(!pid || !ev || !S.career || (S.match && S.match.status !== 'pre')) return h;
    const sl = Object.keys(S.current.starters).find(k => S.current.starters[k] === pid);
    const fit = sl && ev._xi && ev._xi[sl] === pid ? ev.slot_fit[sl] : null;
    if(fit != null) h = h.replace('<div class="tag">', `<div class="cb-sfit ${fitCls(fit)}" title="Fit in ${esc(sysById(B().system_id).name)}">${fit}</div><div class="tag">`);
  }catch(e){}
  return h;
};
const _rp = window.renderPitch;
window.renderPitch = function(){
  const r = _rp.apply(this, arguments);
  try{ if(CB.catalog && S.career && S.career.build && S.ui.view === 'squad' && !isLiveMatch()){
    const ev = _eval.data, key = evalKey(B().system_id, xiNow());
    if(!ev || ev._key !== key){ evaluateNow().then(d => { if(S.ui.view === 'squad' && d._key === evalKey(B().system_id, xiNow())) _rp(); }).catch(() => {}); } } }catch(e){}
  return r;
};

const _rtb = window.renderTopBar;
window.renderTopBar = function(){
  const r = _rtb.apply(this, arguments);
  try{ const el = $('#recordLabel'); if(el && S.career && S.career.cal && S.career.cal.phase === 'preseason') el.textContent = `PRE-SEASON · CAMP WEEK ${S.career.cal.camp}/${CAL.CAMP_WEEKS} · ${B().tp.wallet} TP`; }catch(e){}
  return r;
};

/* ═══ 23. SHELL — nav + views; BOOT — catalog, migrate, resume ═══════════ */
const _shellB = window.shell;
window.shell = function(){
  const r = _shellB.apply(this, arguments);
  const nav = $('.navtabs');
  if(nav){
    const add = (v, label, after) => { if(nav.querySelector(`[data-v="${v}"]`)) return; const bt = document.createElement('button');
      bt.className = 'navtab'; bt.dataset.v = v; bt.textContent = label; bt.setAttribute('onclick', `show('${v}')`);
      const a = nav.querySelector(`[data-v="${after}"]`); nav.insertBefore(bt, a ? a.nextSibling : null); };
    add('build', 'System', 'squad'); add('training', 'Training', 'build');
    const fin = nav.querySelector('[data-v="finances"]'); if(fin) fin.textContent = 'Club';
    const sch = nav.querySelector('[data-v="schedule"]'); if(sch) sch.textContent = 'Calendar';
  }
  const app = $('#app');
  const addView = (id, inner) => { if(!document.getElementById(id)){ const v = document.createElement('div'); v.className = 'view page'; v.id = id; v.innerHTML = inner;
    app.insertBefore(v, document.getElementById('v-match')); } };
  addView('v-build', '<div id="buildBody"></div>');
  addView('v-training', '<div id="trainingBody"></div>');
  return r;
};
const _showB = window.show;
window.show = function(v){
  if(v === 'training' && CB.ui.anim) CB.ui.anim = null;
  const r = _showB.apply(this, arguments);
  if(v === 'build') renderBoard();
  if(v === 'training') renderTraining();
  return r;
};
/* academy players must exist before the core boot filters the XI to the club */
const _bootB = window.boot;
window.boot = async function(){
  try{ const raw = localStorage.getItem('touchline:career:v1'), c = raw && JSON.parse(raw);
    if(c && (c.youth || []).length){ const keep = S.career; S.career = {youth: c.youth, year: c.year}; injectYouth(); S.career = keep; } }catch(e){ console.warn(e); }
  return _bootB.apply(this, arguments);
};
TL.build.ready = TL.booted.then(async () => {
  try{
    CB.catalog = await BAPI.catalog();
    if(CB.catalog.systems) for(const s of CB.catalog.systems) s.formation = String(s.formation);
    injectYouth();
    for(const [pid, ov] of Object.entries(S.career.contractOv || {})) if(P(pid) && P(pid).clubId === LIV) P(pid).contract = {...ensureContract(P(pid)), ...ov};
    const mig = migrateCareer();
    CC.applyCareerToPlayers();
    if(S.career.cal.applyOnBoot && !isLiveMatch()){ delete S.career.cal.applyOnBoot; applySystemToSquad(sysById(B().system_id), {quiet: true}); }
    unlockCombos();
    if(mig.length){ CC.saveCareer(); saveState(); }
    relabelFixtures(S.career.year);
    resumeJournal();
    const hash = location.hash.slice(1);
    if(['build', 'training'].includes(hash) && S.ui.view !== 'match') show(hash);
    else rerender();
    TL.bus.dispatchEvent(new CustomEvent('build:ready', {detail: {source: BAPI.source}}));
  }catch(e){ console.warn('[coach-build] boot', e); }
  return CB.catalog;
});
})();
