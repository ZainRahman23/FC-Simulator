/* coach-career — see docs/COACH_MVP_SPEC.md
   Career & modes: believable opponents, fast matchweeks, pre-match scouting,
   season stakes (board, condition, injuries, form, development, season end),
   onboarding, challenges and the home dashboard.
   Integration: wrap-and-delegate globals from touchline.html; all state lives
   in S.career (persisted under its own key + mirrored server-side). */
window.TL = window.TL || {hooks:{}, bus:new EventTarget()};
TL.hooks = TL.hooks || {};
TL.bus = TL.bus || new EventTarget();

(function(){
'use strict';

/* no favicon ships with the app: declare an empty one so the browser does not
   log a 404 on every load (keeps the console clean for testers) */
try{ if(!document.querySelector('link[rel~="icon"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="data:,">'); }catch(e){}

/* ═══ 0. UTILITIES ═══════════════════════════════════════════════════════ */
const CC = window.CC = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
function mulberry(seed){
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rngFor = key => mulberry(hashStr(key));
function gauss(r){ let u = 0; while(!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
function weighted(r, pairs){ const tot = pairs.reduce((a, p) => a + p[1], 0); let x = r() * tot;
  for(const p of pairs){ x -= p[1]; if(x <= 0) return p[0]; } return pairs[pairs.length - 1][0]; }
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd'
  : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const LIV = 'LIV';

/* ═══ 1. BELIEVABLE OPPONENTS — deterministic fictional squads ═══════════ */
const NAME_POOLS = {
  en:{w:30, f:['Jack','Harry','Callum','Lewis','Ben','Tom','Josh','Ryan','Jordan','Luke','Alfie','George','Charlie','Reece','Kieran','Nathan','Aaron','Mason','Tyler','Jamie','Liam','Owen','Ethan','Freddie','Archie','Sam','Joe','Adam','Dan','Louie'],
      l:['Walsh','Thompson','Barker','Holloway','Fletcher','Marsh','Pritchard','Gibbons','Sutton','Wade','Hale','Brooks','Cartwright','Dawson','Ellison','Farrow','Garside','Hendry','Ingram','Jessop','Kemp','Lister','Maddox','Norris','Osborne','Radcliffe','Sheard','Tolley','Underwood','Whitfield','Ashby','Bramall','Colley','Durrant','Etheridge','Fenwick','Gorton','Hurst','Kettle','Lowther']},
  ie:{w:7, f:['Cian','Conor','Eoin','Darragh','Ruairi','Fraser','Lachlan','Callan','Rory','Seamus','Aidan','Niall','Ross','Euan'],
      l:['Byrne','Brennan','Quigley','Donnelly','McGrath','Fitzgerald','Kerr','Mackay','Munro','Buchanan','Sinclair','Gallagher','Devlin','Lynch','Moran','Tierney']},
  fr:{w:9, f:['Théo','Mathis','Enzo','Lucas','Hugo','Nathan','Maxime','Yanis','Rayan','Noah','Bastien','Clément','Loïc','Adrien'],
      l:['Moreau','Lefebvre','Girard','Fontaine','Rousseau','Chevalier','Garnier','Perrin','Marchand','Lambert','Mercier','Faure','Blanchard','Roux','Gauthier','Boyer']},
  es:{w:8, f:['Álvaro','Pablo','Diego','Sergio','Iker','Marcos','Rúben','Tiago','Gonçalo','Nuno','Andrés','Javier','Hugo','Rodrigo'],
      l:['Ortega','Navarro','Iglesias','Carvalho','Ferreira','Moreno','Serrano','Tavares','Pinto','Domínguez','Castro','Medina','Salgado','Figueira','Lozano','Vidal']},
  sa:{w:9, f:['Matheus','Gabriel','Thiago','Rafael','Vinícius','Felipe','Mateo','Santiago','Julián','Emiliano','Facundo','Caio','Nicolás','Bruno'],
      l:['Souza','Oliveira','Ribeiro','Almeida','Barbosa','Cardoso','Acosta','Benítez','Sosa','Correa','Herrera','Villalba','Moraes','Paredes','Quintero','Arévalo']},
  nl:{w:6, f:['Daan','Sem','Thijs','Jesse','Milan','Bram','Lars','Senne','Arne','Wout','Jens','Ruben'],
      l:['de Vries','Bakker','Visser','Smit','van Leeuwen','Janssens','Peeters','Claes','Verbruggen','Hendriks','de Groot','Kuipers','Mulder','Wouters']},
  de:{w:5, f:['Lukas','Jonas','Felix','Leon','Niklas','Moritz','Tim','Florian','Julian','Maximilian','Fabian','Jannik'],
      l:['Hofmann','Krüger','Schreiber','Becker','Wagner','Lehmann','Vogel','Hartmann','Zimmermann','Keller','Baumann','Richter','Brandl','Seidel']},
  no:{w:5, f:['Oskar','Emil','Magnus','Anders','Mikkel','Rasmus','Viktor','Elias','Sander','Tobias'],
      l:['Lindqvist','Andersen','Hansen','Nyberg','Dahl','Holm','Berg','Sørensen','Lund','Strand','Ekdal','Aalto']},
  wa:{w:9, f:['Kwame','Kofi','Yaw','Emeka','Chidi','Tunde','Ibrahima','Moussa','Mamadou','Samuel','Abdoulaye','Victor','Seydou','Ousmane'],
      l:['Mensah','Boateng','Asante','Okafor','Adeyemi','Diallo','Traoré','Koné','Ndiaye','Owusu','Nwosu','Bamba','Cissé','Fofana','Obi','Danso']},
  ee:{w:6, f:['Luka','Marko','Nikola','Filip','Stefan','Dominik','Kacper','Jakub','Mateusz','Aleksandar','Tomáš','Ivan'],
      l:['Petrović','Kovačević','Horvat','Novak','Jovanović','Babić','Wiśniewski','Kowalczyk','Dvořák','Marić','Šimić','Lukić','Zieliński','Radu']},
  as:{w:3, f:['Kaito','Yuki','Ren','Takumi','Ji-ho','Seung-woo','Daichi','Hyun-woo'],
      l:['Tanaka','Sato','Nakamura','Watanabe','Park','Choi','Kobayashi','Jung']},
  na:{w:3, f:['Youssef','Amine','Bilal','Hamza','Ilias','Nabil','Rayane','Sofiane'],
      l:['Benali','El Idrissi','Haddad','Mansouri','Bennani','Cherif','Belkacem','Amrani']}
};
const REGIONS = Object.entries(NAME_POOLS).map(([k, v]) => [k, v.w]);

/* Club stature: mean OVR of the fictional squad players around the stars. */
const CLUB_TIER = {MCI:80, ARS:80, LIV:79, CHE:78, NEW:77, TOT:76, AVL:76, MUN:76, BHA:75, NFO:74,
  CRY:74, BOU:73, BRE:73, FUL:73, EVE:72, WHU:72, WOL:71, LEE:69, BUR:68, SUN:68};
/* Supported engine shapes per club, derived from club.plan (unsupported
   real-world shapes such as 3-4-3 / 5-4-1 map to the nearest back four). */
const CLUB_SHAPE = {ARS:'433', AVL:'4231', BOU:'4231', BRE:'4231', BHA:'4231', BUR:'4141', CHE:'4231',
  CRY:'4231', EVE:'4141', FUL:'4231', LEE:'433', LIV:'433', MCI:'4141', MUN:'4231', NEW:'433',
  NFO:'4231', SUN:'4141', TOT:'433', WHU:'4141', WOL:'4231'};
const PLAN_SHAPE = {'High Press':'433', 'Possession':'433', 'Controlled':'4231', 'Balanced':'4231',
  'Counter Attack':'4231', 'Low Block':'4141', 'End-to-End':'433'};
const shapeFor = clubId => CLUB_SHAPE[clubId] || PLAN_SHAPE[(clubById(clubId) || {}).plan] || '433';
CC.shapeFor = shapeFor;

const SQUAD_TEMPLATE = ['GK','GK','CB','CB','CB','CB','LB','LB','RB','RB','CDM','CDM','CM','CM','CM','CAM','LW','RW','ST','ST'];
const ELIG_OPTIONS = {GK:[['GK']], CB:[['CB'],['CB','RB'],['CB','LB'],['CB','CDM']], LB:[['LB','LM'],['LB'],['LB','CB'],['LB','LW']],
  RB:[['RB','RM'],['RB'],['RB','CB'],['RB','RW']], CDM:[['CDM','CM'],['CDM','CB'],['CDM']], CM:[['CM','CDM'],['CM','CAM'],['CM','CDM','CAM']],
  CAM:[['CAM','CM'],['CAM','ST'],['CAM','LW','RW']], LW:[['LW','LM'],['LW','LM','ST'],['LW','RW','LM']],
  RW:[['RW','RM'],['RW','RM','ST'],['RW','LW','RM']], LM:[['LM','LW']], RM:[['RM','RW']], ST:[['ST'],['ST','CAM'],['ST','LW','RW']]};

const ATTR_KEYS = ['acc','spr','agi','rea','bco','bln','dri','sps','lps','vis','cro','fin','apo','shp','lsh','vol','hea',
  'daw','sta','sli','int','str','stam','agg','jum','fka','pen','cmp','cur','gkd','gkh','gkk','gkp','gkr'];
const GK_KEYS = ['gkd','gkh','gkk','gkp','gkr'];
/* Position shapes: offsets from the player's base level. */
const SHAPE = {
  CB:{acc:-12,spr:-8,agi:-18,rea:0,bco:-12,bln:-16,dri:-24,sps:-8,lps:-10,vis:-22,cro:-30,fin:-40,apo:-40,shp:-20,lsh:-35,vol:-40,hea:4,daw:6,sta:6,sli:5,int:4,str:6,stam:-6,agg:2,jum:4,fka:-40,pen:-30,cmp:-6,cur:-35},
  FB:{acc:2,spr:3,agi:-4,rea:-2,bco:-6,bln:-4,dri:-6,sps:-4,lps:-10,vis:-14,cro:0,fin:-32,apo:-20,shp:-20,lsh:-28,vol:-34,hea:-14,daw:-2,sta:0,sli:0,int:-2,str:-8,stam:4,agg:-4,jum:-10,fka:-30,pen:-28,cmp:-10,cur:-18},
  CDM:{acc:-12,spr:-12,agi:-10,rea:0,bco:-2,bln:-8,dri:-8,sps:3,lps:1,vis:-4,cro:-20,fin:-22,apo:-18,shp:-6,lsh:-8,vol:-22,hea:-8,daw:2,sta:3,sli:0,int:4,str:2,stam:4,agg:2,jum:-8,fka:-18,pen:-20,cmp:0,cur:-14},
  CM:{acc:-6,spr:-8,agi:-4,rea:0,bco:2,bln:-4,dri:-2,sps:4,lps:2,vis:2,cro:-10,fin:-12,apo:-8,shp:-4,lsh:-2,vol:-14,hea:-16,daw:-10,sta:-8,sli:-12,int:-6,str:-8,stam:4,agg:-6,jum:-14,fka:-12,pen:-14,cmp:0,cur:-6},
  CAM:{acc:0,spr:-4,agi:4,rea:0,bco:4,bln:0,dri:4,sps:3,lps:-4,vis:5,cro:-8,fin:-2,apo:2,shp:-4,lsh:0,vol:-6,hea:-22,daw:-34,sta:-30,sli:-38,int:-28,str:-18,stam:-4,agg:-18,jum:-20,fka:-6,pen:-8,cmp:2,cur:0},
  W:{acc:6,spr:6,agi:6,rea:-2,bco:2,bln:4,dri:5,sps:-3,lps:-12,vis:-4,cro:0,fin:-6,apo:-2,shp:-8,lsh:-8,vol:-12,hea:-24,daw:-36,sta:-32,sli:-38,int:-30,str:-18,stam:0,agg:-16,jum:-20,fka:-14,pen:-12,cmp:-4,cur:-2},
  ST:{acc:2,spr:3,agi:-2,rea:2,bco:0,bln:-4,dri:-2,sps:-8,lps:-18,vis:-12,cro:-20,fin:6,apo:6,shp:4,lsh:-4,vol:0,hea:0,daw:-44,sta:-40,sli:-46,int:-38,str:0,stam:-6,agg:-8,jum:-2,fka:-18,pen:-4,cmp:2,cur:-10}
};
const ARCHETYPES = {
  CB:[['Stopper',{str:5,hea:4,agg:4,jum:3,sps:-4,lps:-3}],['Ball-playing',{sps:6,lps:6,cmp:5,vis:4,str:-3,hea:-2}],['Quick cover',{acc:7,spr:8,int:3,str:-3,hea:-3}]],
  FB:[['Attacking',{cro:6,dri:4,stam:3,acc:2,daw:-4,sta:-3}],['Defensive',{daw:5,sta:5,int:4,cro:-5,dri:-4}],['Inverted',{sps:6,vis:4,cmp:3,cro:-5,spr:-2}]],
  CDM:[['Destroyer',{sta:6,agg:6,str:4,int:3,vis:-5,lps:-4}],['Deep playmaker',{lps:7,vis:6,sps:4,cmp:4,sta:-4,agg:-4}]],
  CM:[['Box-to-box',{stam:7,sta:4,spr:3,apo:3,vis:-3}],['Playmaker',{vis:7,lps:6,sps:3,cur:3,stam:-3,sta:-4}],['Runner',{apo:5,fin:5,acc:4,lps:-4,daw:-3}]],
  CAM:[['Creator',{vis:6,sps:4,cur:4,fin:-3}],['Shadow striker',{fin:6,apo:6,shp:3,vis:-4,sps:-2}]],
  W:[['Classic winger',{cro:8,spr:4,dri:2,fin:-5,cmp:-2}],['Inside forward',{fin:6,lsh:5,cur:4,cro:-6}],['Dribbler',{dri:6,agi:6,bco:4,bln:3,str:-4,sps:-2}]],
  ST:[['Poacher',{fin:6,apo:7,rea:3,sps:-4,str:-3}],['Target man',{hea:9,str:8,jum:6,acc:-6,spr:-5,agi:-4}],['Pace in behind',{acc:7,spr:8,apo:3,hea:-5,str:-4}],['Complete forward',{sps:5,vis:4,shp:3,apo:-2}]]
};
const shapeKey = pos => ({LB:'FB', RB:'FB', LW:'W', RW:'W', LM:'W', RM:'W'})[pos] || pos;
/* Position rating weights (display OVR + squad-selection score). */
const OVR_W = {
  GK:{gkd:.23,gkh:.22,gkp:.22,gkr:.23,gkk:.05,rea:.05},
  CB:{daw:.17,sta:.17,sli:.12,int:.12,hea:.10,str:.10,jum:.03,agg:.07,sps:.05,bco:.04,spr:.03},
  FB:{acc:.07,spr:.08,sta:.12,sli:.11,int:.12,daw:.09,cro:.09,sps:.07,bco:.07,stam:.08,dri:.05,hea:.05},
  CDM:{sps:.14,lps:.10,int:.14,sta:.12,daw:.09,sli:.05,bco:.10,vis:.04,str:.06,stam:.06,agg:.05,rea:.05},
  CM:{sps:.17,lps:.13,vis:.13,bco:.14,dri:.07,rea:.08,stam:.06,fin:.03,lsh:.04,int:.05,sta:.05,apo:.05},
  CAM:{sps:.16,vis:.14,bco:.15,dri:.13,apo:.09,fin:.07,lsh:.05,agi:.04,acc:.04,rea:.07,shp:.02,cmp:.04},
  W:{acc:.08,spr:.07,agi:.03,cro:.09,dri:.16,bco:.13,sps:.09,fin:.10,apo:.08,vis:.06,lsh:.04,rea:.07},
  ST:{fin:.19,apo:.13,shp:.10,hea:.10,bco:.10,dri:.07,rea:.08,acc:.04,spr:.05,str:.05,vol:.02,lsh:.03,cmp:.04}
};
function posRating(a, pos){
  const w = OVR_W[pos === 'GK' ? 'GK' : shapeKey(pos)] || OVR_W.CM;
  let s = 0, t = 0; for(const k in w){ s += (a[k] ?? 50) * w[k]; t += w[k]; }
  return s / t;
}
CC.posRating = posRating;
function faceOf(a, gk){
  const R = Math.round;
  if(gk) return [a.gkd, a.gkh, a.gkk, a.gkr, R((a.acc + a.spr) / 2), a.gkp].map(R);
  return [R(.45 * a.acc + .55 * a.spr),
    R(.45 * a.fin + .2 * a.shp + .2 * a.lsh + .05 * a.pen + .05 * a.vol + .05 * a.apo),
    R(.35 * a.sps + .2 * a.vis + .2 * a.cro + .15 * a.lps + .05 * a.fka + .05 * a.cur),
    R(.5 * a.dri + .35 * a.bco + .1 * a.agi + .05 * a.bln),
    R(.3 * a.daw + .3 * a.sta + .2 * a.int + .1 * a.hea + .1 * a.sli),
    R(.5 * a.str + .25 * a.stam + .2 * a.agg + .05 * a.jum)];
}
function makeAttrs(r, pos, target){
  const gk = pos === 'GK';
  const a = {};
  if(gk){
    const abs = {acc:42,spr:44,agi:56,rea:target,bco:32,bln:46,dri:18,sps:46,lps:52,vis:50,cro:14,fin:12,apo:12,shp:52,lsh:15,
      vol:12,hea:18,daw:22,sta:16,sli:14,int:22,str:66,stam:40,agg:32,jum:66,fka:14,pen:22,cmp:target - 10,cur:15};
    for(const k in abs) a[k] = abs[k] + gauss(r) * 5;
    a.gkd = target + 1; a.gkh = target - 1; a.gkk = target - 7; a.gkp = target; a.gkr = target + 2;
    for(const k of GK_KEYS) a[k] += gauss(r) * 3;
  } else {
    const sk = shapeKey(pos), base = SHAPE[sk];
    const arch = ARCHETYPES[sk] ? pick(r, ARCHETYPES[sk]) : null;
    for(const k of ATTR_KEYS){
      if(GK_KEYS.includes(k)){ a[k] = 7 + r() * 8; continue; }
      // position flavour at half amplitude: the engine was calibrated on
      // well-rounded 75s; full-strength shapes (e.g. CB pace 60 vs winger 85)
      // turned every mismatch into a rout
      a[k] = target + 0.5 * ((base[k] ?? -8) + ((arch && arch[1][k]) || 0)) + gauss(r) * 2.4;
    }
    a._arch = arch ? arch[0] : null;
  }
  // calibrate so the position rating lands on target
  for(let it = 0; it < 3; it++){
    const d = target - posRating(a, pos);
    for(const k of ATTR_KEYS) if(gk ? GK_KEYS.includes(k) || k === 'rea' : !GK_KEYS.includes(k)) a[k] += d;
  }
  const out = {};
  for(const k of ATTR_KEYS) out[k] = Math.round(clamp(a[k], 5, k === 'spr' || k === 'acc' ? 97 : 94));
  return {a: out, arch: a._arch || null};
}
function heightFor(r, pos){
  const m = {GK:191, CB:188, LB:178, RB:178, CDM:182, CM:179, CAM:176, LW:175, RW:175, LM:176, RM:176, ST:184}[pos] || 180;
  return Math.round(m + gauss(r) * 4.5);
}
function ageFor(r){ return Math.round(clamp(weighted(r, [[18,4],[19,6],[20,8],[21,9],[22,10],[23,10],[24,10],[25,10],[26,9],[27,8],[28,7],[29,6],[30,5],[31,4],[32,3],[33,2],[34,1]]) + 0, 17, 36)); }
const USED_NAMES = new Set(PLAYERS.map(p => p.name));
function makeName(r){
  for(let i = 0; i < 40; i++){
    const reg = NAME_POOLS[weighted(r, REGIONS)];
    const n = pick(r, reg.f) + ' ' + pick(r, reg.l);
    if(!USED_NAMES.has(n)){ USED_NAMES.add(n); return n; }
  }
  const n = 'Sam Kettle ' + Math.floor(r() * 99); USED_NAMES.add(n); return n;
}
function makeFictional(clubId, idx, pos, target, role){
  const r = rngFor(`squad|${clubId}|${idx}|${pos}`);
  const age = role === 'youth' ? 17 + Math.floor(r() * 4) : ageFor(r);
  // The engine was calibrated on 75-rated squads and is very sensitive to
  // attribute gaps (a 6-point squad gap produced 0-11s), so club tiers are
  // compressed around 75 and the per-player spread is kept tight.
  const tierAdj = 76.5 + (target - 74) * 0.4;
  let tgt = tierAdj + gauss(r) * 1.6 + (role === 'first' ? 1 : role === 'youth' ? -4 : -1.5);
  if(age >= 32) tgt -= 1;
  tgt = Math.round(clamp(tgt, 55, 90));
  const {a, arch} = makeAttrs(r, pos, tgt);
  const ovr = Math.round(posRating(a, pos));
  const gap = age <= 20 ? 6 + Math.floor(r() * 9) : age <= 23 ? 2 + Math.floor(r() * 6) : age <= 27 ? Math.floor(r() * 3) : 0;
  const ht = heightFor(r, pos);
  const leftSided = ['LB','LW','LM'].includes(pos);
  const foot = leftSided ? (r() < .78 ? 'L' : 'R') : (['RB','RW','RM'].includes(pos) ? (r() < .1 ? 'L' : 'R') : (r() < .22 ? 'L' : 'R'));
  const side = leftSided ? 'L' : ['RB','RW','RM'].includes(pos) ? 'R' : 'C';
  const wide = ['LW','RW','LM','RM','CAM'].includes(pos);
  return {
    id: `${clubId.toLowerCase()}_sq_${String(idx).padStart(2, '0')}`, name: makeName(r), pos,
    elig: pick(r, ELIG_OPTIONS[pos] || [[pos]]), clubId, rank: null, ovr, pot: Math.min(94, ovr + gap), age,
    ht, wt: Math.round(ht - 105 + gauss(r) * 4), foot, wf: 2 + Math.floor(r() * 3), sm: pos === 'GK' ? 1 : wide ? 3 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2),
    side, face: faceOf(a, pos === 'GK'), a, fictional: true, archetype: arch
  };
}
/* Liverpool's flat-75 fillers get shaped numbers; ids and names are kept. */
function reshapeLiverpoolGenerics(){
  LIVERPOOL_GENERICS.forEach((g, i) => {
    const r = rngFor(`livgen|${g.id}`);
    const tgt = Math.round(clamp(73 + gauss(r) * 2.2, 68, 78));
    const {a, arch} = makeAttrs(r, g.pos, tgt);
    g.a = a; g.attributeProfileId = null; g.archetype = arch;
    g.ovr = Math.round(posRating(a, g.pos));
    g.age = g.pos === 'GK' ? g.age : ageFor(r);
    g.pot = Math.min(92, g.ovr + (g.age <= 20 ? 5 + Math.floor(r() * 8) : g.age <= 23 ? 1 + Math.floor(r() * 5) : 0));
    g.ht = heightFor(r, g.pos); g.wt = Math.round(g.ht - 105 + gauss(r) * 4);
    g.face = faceOf(a, g.pos === 'GK'); g.fictional = true;
    g.sm = g.pos === 'GK' ? 1 : 2 + Math.floor(r() * 2); g.wf = 2 + Math.floor(r() * 3);
  });
}
function buildLeagueSquads(){
  reshapeLiverpoolGenerics();
  for(const club of CLUBS){
    if(club.id === LIV) continue;
    const real = PLAYERS.filter(p => p.clubId === club.id);
    const need = [...SQUAD_TEMPLATE];
    const take = pos => { const i = need.indexOf(pos); if(i > -1){ need.splice(i, 1); return true; } return false; };
    const leftovers = [];
    for(const p of real) if(!take(p.pos)) leftovers.push(p);
    const NEAR = {LM:'LW', RM:'RW', LW:'RW', RW:'LW', CAM:'CM', CM:'CDM', CDM:'CM', LB:'RB', RB:'LB', ST:'CAM'};
    for(const p of leftovers) take(NEAR[p.pos]) || take((p.elig || [])[1]);
    while(real.length + need.length < 18) need.push(['CM','CB','ST','LW'][need.length % 4]);
    const tier = CLUB_TIER[club.id] || 72;
    const seen = {};
    need.forEach((pos, i) => {
      seen[pos] = (seen[pos] || 0) + 1;
      const already = real.filter(p => p.pos === pos).length;
      const role = (i === need.length - 1 && need.length > 4) ? 'youth' : (already + seen[pos] === 1 ? 'first' : 'backup');
      const pl = makeFictional(club.id, i, pos, tier, role);
      PLAYERS.push(pl); BY_ID[pl.id] = pl; premierLeaguePlayers.push(pl);
    });
  }
}
buildLeagueSquads();

/* Pristine snapshot: the untouched numbers every career delta is applied on,
   and what challenges use (fair for everyone, regardless of your save). */
const PRISTINE = {};
for(const p of PLAYERS) if(p.clubId)
  PRISTINE[p.id] = {aRef: p.a, a: {...p.a}, ovr: p.ovr, pot: p.pot, age: p.age, face: [...(p.face || [])], club: p.clubId};
CC.PRISTINE = PRISTINE;
const pristineClubPool = clubId => PLAYERS.filter(p => PRISTINE[p.id] && PRISTINE[p.id].club === clubId);

/* ── card art: only request files that exist; otherwise a generated card ── */
const CARD_FILES = new Set(['Caicedo','Haaland','Salah','Saka','Szoboszlai','Alisson','Magalhães','Donnarumma','James',
  'Martínez','Cucurella','Cherki','Raya','van Dijk','Saliba','Timber','Gravenberch']);
const ART_ALIAS = {gabrielmagalhaes:'Magalhães', emilianomartinez:'Martínez', reecejames:'James'};
function knownArt(pl){
  if(pl.fictional) return null;
  const al = ART_ALIAS[pl.id]; if(al && CARD_FILES.has(al)) return al;
  const sn = shortName(pl.name), last = String(pl.name).split(' ').pop();
  if(pl.id === 'alisson') return 'Alisson';
  // guard against surname clashes (e.g. several "Fernandes"): only unique mapped surnames
  if(CARD_FILES.has(sn) && !['James','Martínez'].includes(sn)) return sn;
  if(CARD_FILES.has(last) && !['James','Martínez'].includes(last)) return last;
  return null;
}
window.artCandidates = function(pl){
  const k = knownArt(pl);
  return k ? [encodeURI(LEAGUE_ART_DIR + k + '.png')] : [];
};
function kitOf(clubId){ const c = clubById(clubId); return c ? c.color : '#3a4660'; }
function genCardHTML(pl, opts){
  const labels = pl.pos === 'GK' ? FACE_LABELS.gk : FACE_LABELS.out;
  const kit = kitOf(pl.clubId || (PRISTINE[pl.id] || {}).club);
  const club = clubById(pl.clubId);
  const tierCls = pl.ovr >= 85 ? 'gold' : pl.ovr >= 78 ? 'silver' : 'bronze';
  return `<div class="card cc-gcard ${tierCls} ${opts.mini ? 'mini' : ''}" role="img" style="--kit:${kit}"
      aria-label="${esc(pl.name)} — ${pl.ovr} ${esc(pl.pos)}">
    <div class="cc-gk-top"><div class="cc-g-ovr">${pl.ovr}</div><div class="cc-g-pos">${esc(pl.pos)}</div>
      ${club ? `<div class="cc-g-club">${esc(club.abbreviation)}</div>` : ''}</div>
    <div class="cc-g-art"><span>${esc(initials(pl.name))}</span></div>
    <div class="cc-g-nm">${esc(shortName(pl.name))}</div>
    <div class="cc-g-st">${labels.map((l, i) => `<span><i>${l}</i><b>${(pl.face || [])[i] ?? '—'}</b></span>`).join('')}</div>
  </div>`;
}
const _cardHTML = window.cardHTML;
window.cardHTML = function(pl, opts = {}){
  if(!pl) return '';
  if(!knownArt(pl)) return genCardHTML(pl, opts);
  return _cardHTML.call(this, pl, opts);
};

/* ── CPU sides: suitability-driven XI + bench, club shape and style ────── */
const FIT_PEN = {natural:0, comfortable:2, secondary:10, out:24};
function slotScore(pl, slotPos){
  return posRating(pl.a, slotPos) - FIT_PEN[suitability(pl, slotPos) || 'out'];
}
CC.slotScore = slotScore;
function pickXI(pool, formationId){
  const slots = formationOf(formationId).slots;
  const used = new Set(), xi = {};
  const order = [...slots].sort((a, b) => (a.position === 'GK' ? -1 : 0) - (b.position === 'GK' ? -1 : 0) ||
    pool.filter(p => suitability(p, a.position) !== 'out').length - pool.filter(p => suitability(p, b.position) !== 'out').length);
  for(const sl of order){
    const cand = pool.filter(p => !used.has(p.id) && (sl.position === 'GK' ? p.pos === 'GK' : p.pos !== 'GK'));
    cand.sort((x, y) => slotScore(y, sl.position) - slotScore(x, sl.position));
    if(cand[0]){ xi[sl.id] = cand[0].id; used.add(cand[0].id); }
  }
  // pairwise improvement pass
  for(let it = 0; it < 3; it++){
    let improved = false;
    for(const a of slots) for(const b of slots){
      if(a === b || a.position === 'GK' || b.position === 'GK') continue;
      const pa = P(xi[a.id]), pb = P(xi[b.id]); if(!pa || !pb) continue;
      const now = slotScore(pa, a.position) + slotScore(pb, b.position);
      const sw = slotScore(pb, a.position) + slotScore(pa, b.position);
      if(sw > now + .5){ xi[a.id] = pb.id; xi[b.id] = pa.id; improved = true; }
    }
    if(!improved) break;
  }
  return xi;
}
function pickBench(pool, xi, n = 7){
  const used = new Set(Object.values(xi));
  const rest = pool.filter(p => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  const bench = [];
  const gk = rest.find(p => p.pos === 'GK'); if(gk) bench.push(gk);
  const band = p => ['CB','LB','RB'].includes(p.pos) ? 'D' : ['CDM','CM','CAM'].includes(p.pos) ? 'M' : p.pos === 'GK' ? 'G' : 'A';
  for(const b of ['D','M','A']){ const x = rest.find(p => band(p) === b && !bench.includes(p)); if(x) bench.push(x); }
  for(const p of rest){ if(bench.length >= n) break; if(!bench.includes(p) && p.pos !== 'GK') bench.push(p); }
  return bench.slice(0, n);
}
function serializePristine(pl){
  const pr = PRISTINE[pl.id];
  const s = serializePlayer(pl);
  if(pr){ s.a = {...pr.a}; s.ovr = pr.ovr; s.pot = pr.pot; s.age = pr.age; }
  return s;
}
/* opts: {pristine, cond:(pid)=>0-100, formation, tactics} */
/* AI clubs play their identity in its calibrated range. The engine's own
   notes flag the extreme presets (Relentless press, man-marking, full box
   commitment) as an over-productive tail — AI sides using them turned
   routine fixtures into 0-11s. The manager can still pick the extremes. */
function cpuTactics(plan){
  // identity = how they build and where they defend; the high-risk dials
  // (press intensity, marking, box commitment, line behaviour, transitions)
  // stay in the calibrated band
  const P0 = PRESETS[plan] || PRESETS['Balanced'], t = {...PRESETS['Balanced']};
  for(const k of ['buildUpTempo', 'passingDirectness', 'attackingWidth', 'chanceCreationFocus',
                  'defensiveBlockHeight', 'defensiveWidth', 'afterWinningPossession']) t[k] = P0[k];
  t.pressingIntensity = {Relentless: 'Aggressive', Aggressive: 'Selective'}[P0.pressingIntensity] || P0.pressingIntensity;
  if(P0.defensiveBlockHeight === 'Deep') t.defensiveLineBehavior = 'Drop';
  return t;
}
CC.cpuTactics = cpuTactics;
function buildSide(clubId, pool, opts = {}){
  const club = clubById(clubId);
  const formation = opts.formation || shapeFor(clubId);
  const xi = pickXI(pool, formation);
  const bench = pickBench(pool, xi);
  const ser = pl => { const s = opts.pristine ? serializePristine(pl) : serializePlayer(pl);
    s.cond = Math.round(opts.cond ? opts.cond(pl.id) : 100); return s; };
  const lineup = {};
  for(const sl of formationOf(formation).slots) lineup[sl.id] = xi[sl.id] ? ser(P(xi[sl.id])) : null;
  return {club_id: clubId, name: club.name, formation, lineup, bench: bench.map(ser),
    tactics: {...(opts.tactics || PRESETS[club.plan] || PRESETS['Balanced'])}, player_instructions: {}};
}
CC.buildSide = buildSide;
/* CPU rotation is abstracted: a seeded per-matchweek condition (86-100) so
   opponents are not always perfectly fresh while you manage real fatigue. */
function cpuCond(pid){
  const mw = (S.season && S.season.matchweek) || 1;
  return 86 + (hashStr(`${(S.season || {}).seed}|${pid}|${mw}|cpucond`) % 15);
}
window.cpuSideForRequest = function(clubId){
  return buildSide(clubId, playersForClub(clubId), {cond: cpuCond, tactics: cpuTactics(clubById(clubId).plan)});
};
window.clubFormation = function(clubId){ return shapeFor(clubId); };
const _clubLines = window.clubLines;
window.clubLines = function(clubId){ const o = _clubLines.apply(this, arguments);
  o.tactics = cpuTactics(clubById(clubId).plan); return o; };

/* club strength = average OVR of the XI the builder would pick */
const _strCache = {};
function clubStrength(clubId){
  const pool = playersForClub(clubId).filter(p => clubId !== LIV || !isInjured(p.id));
  const key = clubId + '|' + pool.map(p => p.id + p.ovr).join(',');
  if(_strCache[clubId] && _strCache[clubId].key === key) return _strCache[clubId].v;
  const xi = pickXI(pool, clubId === LIV ? S.current.formationId : shapeFor(clubId));
  const ids = Object.values(xi);
  const v = ids.length ? ids.reduce((a, id) => a + P(id).ovr, 0) / ids.length : 70;
  _strCache[clubId] = {key, v};
  return v;
}
CC.clubStrength = clubStrength;

/* ═══ 2. CAREER STATE — S.career (persisted, migrated safely) ════════════ */
const CAREER_KEY = 'touchline:career:v1';
const CAREER_VERSION = 1;
const OBJECTIVES = {
  1:{min:4, stretch:1, text:'Finish in the top four', stretchText:'Win the Premier League'},
  2:{min:6, stretch:4, text:'Qualify for Europe (top six)', stretchText:'Break into the top four'},
  3:{min:10, stretch:7, text:'A top-half finish', stretchText:'Push for Europe'},
  4:{min:17, stretch:12, text:'Avoid relegation', stretchText:'Finish comfortably mid-table'}
};
const STATURE = {MCI:1, ARS:1, LIV:1, CHE:1, NEW:2, TOT:2, AVL:2, MUN:2, BHA:3, NFO:3, CRY:3, BOU:3, BRE:3, FUL:3, EVE:3, WHU:3, WOL:4, LEE:4, BUR:4, SUN:4};
function objectiveFor(clubId, lastPos){
  const o = {...OBJECTIVES[STATURE[clubId] || 3]};
  if(lastPos === 1){ o.min = Math.min(o.min, 2); o.stretch = 1; o.text = 'Defend the title — top two at worst'; o.stretchText = 'Retain the Premier League'; }
  else if(lastPos && lastPos > o.min + 4 && o.min > 1){ o.text += ' — a bounce-back season'; }
  return o;
}
function blankCareer(){
  return {v: CAREER_VERSION, year: 2026, seasonNo: 1, seasonSeed: null, ageAdd: 0, manager: null, introSeen: false,
    board: {confidence: 60, objective: objectiveFor(LIV), history: [], lastWarn: null},
    cond: {}, injuries: {}, form: {}, dev: {}, xp: {}, stats: {}, notices: [],
    processed: {}, lastReport: null, kick: null, seasonEnd: null, sacked: null, history: [],
    challenges: {best: {}, lastDaily: null, submitted: {}}, ui: {advanced: false}, batchMs: 3500, exBackup: null};
}
function ensureCareer(){
  if(!S.career || typeof S.career !== 'object') S.career = blankCareer();
  const b = blankCareer(), c = S.career;
  for(const k in b) if(c[k] === undefined || c[k] === null && b[k] !== null) c[k] = b[k];
  c.board = {...b.board, ...c.board}; c.challenges = {...b.challenges, ...c.challenges}; c.ui = {...b.ui, ...c.ui};
  return c;
}
CC.ensureCareer = ensureCareer;
function readCareerLocal(){
  try{ const raw = localStorage.getItem(CAREER_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
let _mirrorT = null;
function saveCareer(){
  if(!S.career) return;
  try{ localStorage.setItem(CAREER_KEY, JSON.stringify(S.career)); }catch(e){}
  clearTimeout(_mirrorT);
  _mirrorT = setTimeout(() => {
    fetch('/api/saves/' + SAVE_ID + '-career', {method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({state: S.career})}).catch(() => {});
  }, 800);
}
CC.saveCareer = saveCareer;
const _saveState = window.saveState;
window.saveState = function(){ const r = _saveState.apply(this, arguments); saveCareer(); return r; };

/* Apply development deltas + ageing onto the live registry (pristine kept). */
function applyCareerToPlayers(){
  const c = S.career;
  for(const [id, pr] of Object.entries(PRISTINE)){
    const pl = BY_ID[id]; if(!pl) continue;
    pl.age = pr.age + (c.ageAdd || 0);
    const d = c.dev[id];
    if(d && (d.ovr || Object.keys(d.a || {}).length)){
      const a = {...pr.a};
      for(const [k, v] of Object.entries(d.a || {})) a[k] = clamp(a[k] + v, 5, 97);
      pl.a = a;
      pl.ovr = clamp(pr.ovr + (d.ovr || 0), 40, 97);
      pl.pot = Math.max(pr.pot, pl.ovr);
      const f0 = faceOf(pr.a, pl.pos === 'GK'), f1 = faceOf(a, pl.pos === 'GK');
      pl.face = pr.face.map((v, i) => clamp(v + (f1[i] - f0[i]), 1, 99));
    } else { pl.a = pr.aRef; pl.ovr = pr.ovr; pl.pot = pr.pot; pl.face = [...pr.face]; }
  }
}
CC.applyCareerToPlayers = applyCareerToPlayers;

/* ── condition / injuries / form accessors ─────────────────────────────── */
const condOf = pid => { const c = S.career && S.career.cond[pid]; return c == null ? 100 : c; };
function isInjured(pid){ return !!(S.career && S.career.injuries[pid] && S.career.injuries[pid].weeks > 0); }
const injuryOf = pid => (S.career && S.career.injuries[pid]) || null;
function formOf(pid){ return (S.career && S.career.form[pid]) || []; }
function formTrend(pid){
  const f = formOf(pid); if(f.length < 2) return null;
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  const recent = f.slice(-2).reduce((a, b) => a + b, 0) / 2;
  const cls = avg >= 7.3 ? 'hot' : avg <= 6.2 ? 'cold' : 'ok';
  const dir = recent - avg > .25 ? 'up' : recent - avg < -.25 ? 'down' : 'flat';
  return {avg, dir, cls};
}
CC.condOf = condOf; CC.isInjured = isInjured; CC.formTrend = formTrend;
const condColor = c => c >= 85 ? 'var(--good)' : c >= 70 ? '#b6d957' : c >= 55 ? 'var(--warn)' : 'var(--bad)';
const condLabel = c => c >= 90 ? 'Fresh' : c >= 78 ? 'Good' : c >= 65 ? 'Tired' : 'Exhausted';
function formBadge(pid){
  const t = formTrend(pid); if(!t) return '<span class="cc-form none"></span>';
  const arrow = t.dir === 'up' ? '▲' : t.dir === 'down' ? '▼' : '▶';
  return `<span class="cc-form ${t.cls} ${t.dir}" title="Form: ${t.avg.toFixed(2)} avg over last ${formOf(pid).length}">${arrow}</span>`;
}
function condBar(pid, w){
  const c = Math.round(condOf(pid));
  return `<span class="cc-cond" title="Condition ${c}% — ${condLabel(c)}" style="${w ? 'width:' + w : ''}"><i style="width:${c}%;background:${condColor(c)}"></i></span>`;
}
CC.condBar = condBar; CC.formBadge = formBadge;

/* ── availability: injured players never start ─────────────────────────── */
function hideInjured(fn){
  const hidden = [];
  for(const pid of Object.keys((S.career || {}).injuries || {}))
    if(isInjured(pid) && P(pid) && P(pid).clubId === LIV){ P(pid).clubId = '__INJ'; hidden.push(pid); }
  try{ return fn(); } finally { for(const pid of hidden) P(pid).clubId = LIV; }
}
const _autoFill = window.autoFill, _fillBench = window.fillBench;
window.autoFill = function(){ const a = arguments; return hideInjured(() => _autoFill.apply(this, a)); };
window.fillBench = function(){ const a = arguments; return hideInjured(() => _fillBench.apply(this, a)); };
function enforceAvailability(){
  if(!S.current || !S.career || isLiveMatch()) return [];
  const st = S.current, notes = [];
  const f = formationOf(st.formationId);
  st.bench = st.bench.filter(pid => { if(isInjured(pid)){ notes.push(`${shortName(P(pid).name)} dropped from the bench (injured)`); return false; } return true; });
  for(const sl of f.slots){
    const pid = st.starters[sl.id];
    if(!pid || !isInjured(pid)) continue;
    const used = new Set([...Object.values(st.starters).filter(Boolean)]);
    const cands = clubPool().filter(p => !used.has(p.id) && !isInjured(p.id) && (sl.position === 'GK') === (p.pos === 'GK'));
    cands.sort((x, y) => (slotScore(y, sl.position) - (100 - condOf(y.id)) * .15) - (slotScore(x, sl.position) - (100 - condOf(x.id)) * .15));
    const rep = cands[0];
    const inj = injuryOf(pid);
    st.starters[sl.id] = rep ? rep.id : null;
    if(rep){ const bi = st.bench.indexOf(rep.id); if(bi > -1) st.bench.splice(bi, 1); instrFor(rep.id, sl.position); }
    notes.push(`${shortName(P(pid).name)} (${inj.type === 'Suspended' ? 'suspended' : inj.type + ', ' + inj.weeks + ' wk' + (inj.weeks > 1 ? 's' : '')}) is out — ${rep ? shortName(rep.name) + ' comes into the XI at ' + sl.position : 'no fit replacement'}`);
  }
  // any empty slot (e.g. a player lost from the live XI) is filled, and said so
  for(const sl of f.slots){
    if(st.starters[sl.id]) continue;
    const used = new Set(Object.values(st.starters).filter(Boolean));
    const cands = clubPool().filter(p => !used.has(p.id) && !isInjured(p.id) && (sl.position === 'GK') === (p.pos === 'GK'));
    cands.sort((x, y) => slotScore(y, sl.position) - slotScore(x, sl.position));
    const r = cands[0]; if(!r) continue;
    st.starters[sl.id] = r.id;
    const bi = st.bench.indexOf(r.id); if(bi > -1) st.bench.splice(bi, 1);
    instrFor(r.id, sl.position);
    notes.push(`${sl.position} was empty — ${shortName(r.name)} goes in`);
  }
  if(notes.length && st.bench.length < 7) _fillBenchQuiet();
  return notes;
}
function _fillBenchQuiet(){ hideInjured(() => { const st = S.current; const pool = clubPool().filter(p => !isUsed(p.id)).sort((a, b) => b.ovr - a.ovr);
  if(!st.bench.some(id => P(id).pos === 'GK')){ const gk = pool.find(p => p.pos === 'GK'); if(gk) st.bench.push(gk.id); }
  for(const p of pool){ if(st.bench.length >= 7) break; if(!isUsed(p.id)) st.bench.push(p.id); } }); }
CC.enforceAvailability = enforceAvailability;
function startersBelow(th){
  if(!S.current) return 0;
  return curForm().slots.filter(sl => { const pid = S.current.starters[sl.id]; return pid && condOf(pid) < th; }).length;
}
/* In a career only your own players can be picked (buy them first). */
function blockIfRival(pid){
  const pl = P(pid);
  if(!pl || !S.career || isLiveMatch() || (S.matchFixture && S.matchFixture.exhibition)) return false;
  if(pl.clubId === LIV) return false;
  toast(`${shortName(pl.name)} plays for ${clubById(pl.clubId) ? clubById(pl.clubId).shortName : 'another club'} — make an offer on the Transfers screen first.`);
  return true;
}
function blockIfInjured(pid){
  if(!isInjured(pid)) return false;
  const inj = injuryOf(pid);
  toast(inj.type === 'Suspended' ? `${shortName(P(pid).name)} is suspended for this match.`
    : `${shortName(P(pid).name)} is injured (${inj.type}) — back in ${inj.weeks} week${inj.weeks > 1 ? 's' : ''}.`);
  return true;
}
function tiredWarn(pid){
  const c = condOf(pid);
  if(c < 70) setTimeout(() => toast(`Heads up: ${shortName(P(pid).name)} is at ${Math.round(c)}% condition — he will fade early.`), 30);
}
const _putInSlot = window.putInSlot, _addToBench = window.addToBench, _pickPlayer = window.pickPlayer;
window.putInSlot = function(slotId, pid){ if(pid && !isLiveMatch() && (blockIfRival(pid) || blockIfInjured(pid))) return; return _putInSlot.apply(this, arguments); };
window.addToBench = function(pid){ if(pid && !isLiveMatch() && (blockIfRival(pid) || blockIfInjured(pid))) return; return _addToBench.apply(this, arguments); };
window.pickPlayer = function(pid){
  if(blockIfRival(pid) || blockIfInjured(pid)) return;
  if(S.ui.pickSlot) tiredWarn(pid);
  return _pickPlayer.apply(this, arguments);
};

/* ── cond on the lineup entries we send (spec §4.7) ────────────────────── */
const _livSide = window.livSideForRequest;
window.livSideForRequest = function(){
  const side = _livSide.apply(this, arguments);
  const kick = {};
  for(const [sl, pl] of Object.entries(side.lineup)) if(pl){ pl.cond = Math.round(condOf(pl.id)); kick[pl.id] = pl.cond; }
  for(const pl of side.bench){ pl.cond = Math.round(condOf(pl.id)); kick[pl.id] = pl.cond; }
  CC._lastLivKick = kick;
  return side;
};

const _kickOff = window.kickOff;
window.kickOff = async function(){
  const f = S.matchFixture;
  if(f && !f.exhibition && !S.match){
    const notes = enforceAvailability();
    if(notes.length){ toast(notes[0]); renderPitch(); }
  }
  const r = await _kickOff.apply(this, arguments);
  if(S.match && f && !f.exhibition && S.career){ S.career.kick = {fid: f.id, cond: {...(CC._lastLivKick || {})}}; saveCareer(); }
  return r;
};

/* ═══ 3. EXPECTATIONS — the board's view of a fixture ═══════════════════ */
function matchOdds(livStr, oppStr, livHome){
  const d = livStr - oppStr + (livHome ? 1.6 : -1.6);
  const s = 1 / (1 + Math.exp(-d / 4));
  const pD = .27 * (1 - Math.abs(2 * s - 1) * .6);
  const pW = s * (1 - pD), pL = (1 - s) * (1 - pD);
  return {pW, pD, pL, exp: 3 * pW + pD, d};
}
function expectationFor(f){
  const home = f.home === LIV, opp = home ? f.away : f.home;
  const o = matchOdds(clubStrength(LIV), clubStrength(opp), home);
  const verdict = o.exp >= 2.1 ? 'anything less is dropped points' : o.exp >= 1.7 ? 'three points are expected here' :
    o.exp >= 1.25 ? 'a draw is tolerable, three points ideal' : o.exp >= .9 ? 'a point would be acceptable' : 'no disgrace in defeat — a point is a bonus';
  const short = o.exp >= 1.7 ? 'WIN' : o.exp >= 1.25 ? 'WIN OR DRAW' : o.exp >= .9 ? 'A POINT' : 'COMPETE';
  return {...o, verdict, short, opp, home};
}
CC.expectationFor = expectationFor;
/* One outlook everywhere (pre-match, home, board): from the same odds. */
function outlookText(f){
  const o = expectationFor(f);
  return o.exp >= 2.2 ? "You're clear favourites." : o.exp >= 1.75 ? 'You should have the edge.'
    : o.exp >= 1.3 ? 'Evenly matched.' : o.exp >= 0.9 ? "They're stronger on paper." : 'A big underdog game — a draw would be a good result.';
}
CC.outlookText = outlookText;

/* ═══ 4. AFTER THE MATCH — condition, injuries, form, development, board ═ */
const INJURY_TYPES = [
  [1, ['Dead leg','Ankle knock','Tight calf','Bruised foot']],
  [2, ['Calf strain','Hip flexor strain','Back spasm']],
  [3, ['Hamstring strain','Groin strain','Ankle sprain']],
  [4, ['Thigh strain','Hamstring tear (minor)']],
  [5, ['Knee ligament sprain','Adductor tear']],
  [6, ['Medial ligament damage','Stress reaction (foot)']]
];
function rollInjury(pid, minutes, energy, key){
  const r = rngFor(`inj|${key}|${pid}`);
  const p = .022 * (.4 + .6 * clamp(minutes / 90, 0, 1.2)) * (1 + Math.max(0, 70 - energy) / 30);
  if(r() >= p) return null;
  const weeks = weighted(r, [[1,35],[2,25],[3,18],[4,10],[5,7],[6,5]]);
  const types = INJURY_TYPES.find(t => t[0] === weeks)[1];
  return {weeks, total: weeks, type: pick(r, types)};
}
function keyAttrsFor(pos){
  const w = OVR_W[pos === 'GK' ? 'GK' : shapeKey(pos)] || OVR_W.CM;
  return Object.entries(w).sort((a, b) => b[1] - a[1]).map(e => e[0]).filter(k => k !== 'rea').slice(0, 6);
}
function developPlayer(pid, minutes, rating, key){
  const pl = P(pid), c = S.career; if(!pl) return null;
  if(pl.age > 23 || pl.ovr >= pl.pot || minutes < 15) return null;
  const gain = (minutes / 90) * (.6 + Math.max(0, rating - 6) * .5) * (pl.age <= 20 ? 1.25 : 1);
  c.xp[pid] = (c.xp[pid] || 0) + gain;
  const need = 5.5 + Math.max(0, pl.ovr - 72) * .2;
  if(c.xp[pid] < need) return null;
  c.xp[pid] -= need;
  const r = rngFor(`dev|${key}|${pid}`);
  const d = c.dev[pid] = c.dev[pid] || {a: {}, ovr: 0};
  const keys = keyAttrsFor(pl.pos).sort(() => r() - .5).slice(0, 3);
  for(const k of keys) d.a[k] = (d.a[k] || 0) + 1 + (r() < .35 ? 1 : 0);
  d.ovr = (d.ovr || 0) + 1;
  applyCareerToPlayers();
  return {pid, text: `${shortName(pl.name)} +1 OVR (now ${pl.ovr})`, kind: 'dev'};
}
function boardUpdate(f, gf, ga, xgf, xga){
  const c = S.career, b = c.board;
  const ex = CC._expCache && CC._expCache.fid === f.id ? CC._expCache.e : expectationFor(f);
  const pts = gf > ga ? 3 : gf === ga ? 1 : 0;
  let delta = (pts - ex.exp) * 4.6 + clamp(xgf - xga, -2.5, 2.5) * 1.5;
  const row = livRow();
  if(row.p >= 8){ const o = b.objective; delta += row.pos > o.min ? -Math.min(3, (row.pos - o.min) * .5) : .6; }
  delta = clamp(delta, -14, 10);
  const before = b.confidence;
  b.confidence = Math.round(clamp(before + delta, 0, 100));
  const res = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
  const why = (pts - ex.exp) > .6 ? `beat expectations (${ex.exp.toFixed(1)} pts expected)` :
    (pts - ex.exp) < -.6 ? `fell short (${ex.exp.toFixed(1)} pts expected)` : `about as expected (${ex.exp.toFixed(1)} pts)`;
  const perf = xgf - xga >= .6 ? 'and the performance (xG ' + xgf.toFixed(2) + '–' + xga.toFixed(2) + ') impressed' :
    xgf - xga <= -.6 ? 'and the performance (xG ' + xgf.toFixed(2) + '–' + xga.toFixed(2) + ') worried them' : 'on a level performance';
  const entry = {mw: f.mw, fid: f.id, opp: ex.opp, home: ex.home, res, score: [gf, ga], exp: r1(ex.exp), delta: r1(b.confidence - before), conf: b.confidence,
    why: `Result ${why} ${perf}.`};
  b.history.push(entry);
  if(b.history.length > 60) b.history = b.history.slice(-60);
  let warn = null;
  const played = b.history.length;
  if(b.confidence <= 5 && played >= 6){
    c.sacked = {year: c.year, mw: f.mw, pos: row.pos, pts: row.pts, record: `${row.w}-${row.d}-${row.l}`, conf: b.confidence,
      reason: 'A run of results well below expectations has left the board with no confidence.'};
  } else if(b.confidence < 20 && before >= 20) warn = 'Final warning: the board is considering your position. Results must improve immediately.';
  else if(b.confidence < 35 && before >= 35) warn = 'The board is concerned by recent results and expects a response.';
  else if(b.confidence >= 80 && before < 80) warn = 'The board is delighted with the direction of the team.';
  if(warn){ b.lastWarn = {text: warn, mw: f.mw, level: b.confidence < 35 ? 'bad' : 'good'};
    c.notices.unshift({kind: b.confidence < 35 ? 'board-bad' : 'board-good', text: warn, mw: f.mw}); }
  return {entry, warn};
}
function boardMood(conf){
  return conf >= 80 ? ['Delighted','good'] : conf >= 62 ? ['Pleased','good'] : conf >= 45 ? ['Content','ok'] :
    conf >= 30 ? ['Uneasy','warn'] : conf >= 15 ? ['Concerned','bad'] : ['Losing patience','bad'];
}
CC.boardMood = boardMood;

function careerAfterMatch(f, m){
  const c = ensureCareer();
  if(c.processed[f.id]) return c.lastReport;
  const ftd = m.fullTime, team = f.home === LIV ? 'HOME' : 'AWAY';
  const key = `${S.season.seed}|${f.id}`;
  const kick = (c.kick && c.kick.fid === f.id) ? c.kick.cond : {};
  const rep = {fid: f.id, mw: f.mw, injuries: [], tired: [], dev: [], board: null, motm: null};
  let motm = null;
  for(const [pid, ps] of Object.entries(ftd.player_stats || {})){
    if(ps.team_id !== team || !P(pid)) continue;
    const mins = ps.minutes ?? 90;
    if(mins <= 0) continue;
    const start = kick[pid] ?? condOf(pid);
    const drain = Math.max(0, start - (ps.energy ?? start));
    c.cond[pid] = Math.round(clamp(start - drain * 0.9 - 3, 10, 100));
    const st = c.stats[pid] = c.stats[pid] || {apps: 0, mins: 0, g: 0, as: 0, rsum: 0};
    st.apps++; st.mins += mins; st.g += ps.goals || 0; st.as += ps.assists || 0; st.rsum += ps.rating || 6;
    const fm = c.form[pid] = c.form[pid] || []; fm.push(r1(ps.rating || 6)); if(fm.length > 5) fm.shift();
    if(!motm || ps.rating > motm.rating) motm = {pid, name: ps.name, rating: ps.rating};
    if((ps.cards || [0, 0])[1] > 0 && !c.injuries[pid]){          // red card → one-match ban
      c.injuries[pid] = {type: 'Suspended', weeks: 1, since: f.id, mw: f.mw};
      rep.injuries.push({pid, name: P(pid).name, type: 'Suspended', weeks: 1});
      c.notices.unshift({kind: 'injury', pid, text: `${shortName(P(pid).name)} is suspended for the next match (red card).`, mw: f.mw});
    }
    const inj = c.injuries[pid] ? null : rollInjury(pid, mins, ps.energy ?? 70, key);
    if(inj){ c.injuries[pid] = {...inj, since: f.id, mw: f.mw};
      rep.injuries.push({pid, name: P(pid).name, ...inj});
      c.notices.unshift({kind: 'injury', pid, text: `${shortName(P(pid).name)} picked up ${/^[aeiou]/i.test(inj.type) ? 'an' : 'a'} ${inj.type.toLowerCase()} — out for ${inj.weeks} week${inj.weeks > 1 ? 's' : ''}.`, mw: f.mw}); }
    if(c.cond[pid] < 62) rep.tired.push({pid, name: P(pid).name, cond: c.cond[pid]});
    const d = developPlayer(pid, mins, ps.rating || 6, key);
    if(d){ rep.dev.push(d); c.notices.unshift({kind: 'dev', pid, text: d.text, mw: f.mw}); }
  }
  rep.motm = motm;
  const H = ftd.team_stats.home || {}, A = ftd.team_stats.away || {};
  const gf = team === 'HOME' ? ftd.score.home : ftd.score.away, ga = team === 'HOME' ? ftd.score.away : ftd.score.home;
  const xgf = +(team === 'HOME' ? H.xg : A.xg) || 0, xga = +(team === 'HOME' ? A.xg : H.xg) || 0;
  rep.board = boardUpdate(f, gf, ga, xgf, xga);
  const oppN = clubName(team === 'HOME' ? f.away : f.home), be = rep.board.entry;
  c.notices.unshift({kind: 'result', mw: f.mw, text: `${gf > ga ? 'Beat' : gf < ga ? 'Lost to' : 'Drew with'} ${oppN} ${gf}–${ga}${motm ? ` · ${shortName(motm.name)} ${motm.rating.toFixed(1)}` : ''} · board ${be.delta >= 0 ? '+' : ''}${be.delta}`});
  c.processed[f.id] = true;
  c.notices = c.notices.slice(0, 40);
  c.lastReport = rep;
  return rep;
}
CC.careerAfterMatch = careerAfterMatch;

/* A week passes: recovery, injury countdown. */
function weekPasses(mw){
  const c = S.career;
  for(const pl of clubPool()){
    const cur = condOf(pl.id);
    c.cond[pl.id] = Math.round(Math.min(100, cur + 12 + 0.55 * (100 - cur)));
  }
  for(const [pid, inj] of Object.entries(c.injuries)){
    if(inj.mw === mw) continue;             // picked up this week: "out N" means N matches missed
    inj.weeks -= 1;
    if(inj.weeks <= 0){
      delete c.injuries[pid];
      if(P(pid)){ c.cond[pid] = Math.min(condOf(pid), 82);
        c.notices.unshift({kind: 'return', pid, text: `${shortName(P(pid).name)} has recovered from his ${inj.type.toLowerCase()} and is available again.`, mw}); }
    }
  }
}
CC.weekPasses = weekPasses;

/* ═══ 5. FAST MATCHWEEKS — one batch call for the other nine fixtures ═══ */
function compactPlayers(players){
  const out = {};
  for(const [pid, ps] of Object.entries(players || {}))
    out[pid] = {n: ps.name, t: ps.team_id, g: ps.goals || 0, as: ps.assists || 0, r: r1(ps.rating || 6), m: ps.minutes ?? 90};
  return out;
}
function resultFromFull(o, res){
  const ft = res.full_time || {};
  const r = {score: [ft.score.home, ft.score.away], engine: ft.engine || null, matchId: res.match_id, scorers: {}, ratings: null};
  try{ r.stats = normalizeTeamStats({team_stats: ft.team_stats || {home:{}, away:{}}, possession: ft.possession || {home: 50, away: 50}}); }catch(e){}
  r.lg = compactPlayers(ft.players || ft.player_stats);
  for(const [pid, p] of Object.entries(r.lg)) if(p.g) r.scorers[pid] = p.g;
  if(ft.scorers) r.goals = ft.scorers.map(s => ({n: s.name, t: s.team, m: s.minute}));
  return r;
}
function cpuRequest(o){
  return {save_id: SAVE_ID, fixture_id: o.id, seed: fixtureSeed(o), mode: 'full',
    config: {duration_seconds: 90 * 60}, coach_ai: {home: true, away: true},
    home_team: cpuSideForRequest(o.home), away_team: cpuSideForRequest(o.away)};
}
let _batchUI = null;
function simHost(){ return document.getElementById('ccSimHost') || document.getElementById('ccSimFloat') || (() => {
  const d = document.createElement('div'); d.id = 'ccSimFloat'; d.className = 'cc-simfloat'; document.body.appendChild(d); return d; })(); }
function renderBatch(){
  const u = _batchUI; if(!u) return;
  const host = simHost();
  host.innerHTML = batchHTML();
  if(!host.id.includes('Float')) { const fl = document.getElementById('ccSimFloat'); if(fl) fl.remove(); }
}
function batchHTML(){
  const u = _batchUI; if(!u) return '';
  const done = u.results ? u.revealed : 0;
  const pct = u.results ? 100 : Math.min(94, u.pct);
  return `<div class="cc-sim">
    <div class="cc-sim-h"><b>AROUND THE LEAGUE · MATCHWEEK ${u.mw}</b>
      <span>${u.error ? '<em class="bad">' + esc(u.error) + '</em>' : u.results ? `${u.n} results in ${(u.ms / 1000).toFixed(1)}s` : `simulating ${u.n} matches · ${((performance.now() - u.t0) / 1000).toFixed(1)}s`}</span>
      ${u.float && u.results ? `<button class="cc-x" onclick="CC.closeSim()" aria-label="Close">✕</button>` : ''}</div>
    <div class="cc-bar"><i style="width:${pct}%"></i></div>
    <div class="cc-sim-list">${u.fixtures.map((o, i) => {
      const res = u.results && i < done ? S.season.results[o.id] : null;
      return `<div class="cc-sim-row ${res ? 'in' : ''}"><span class="h">${esc(clubName(o.home))}</span>
        <span class="s">${res ? res.score[0] + '–' + res.score[1] : '<i class="cc-dot"></i>'}</span><span class="a">${esc(clubName(o.away))}</span></div>`; }).join('')}</div>
  </div>`;
}
CC.closeSim = () => { const fl = document.getElementById('ccSimFloat'); if(fl) fl.remove(); };
async function simulateOthers(f){
  const others = S.season.fixtures.filter(x => x.mw === f.mw && !S.season.results[x.id]);
  if(!others.length) return;
  const est = S.career.batchMs || 3500;
  const u = _batchUI = {mw: f.mw, fixtures: others, n: others.length, t0: performance.now(), pct: 0, results: null, revealed: 0, ms: 0,
    float: !document.getElementById('ccSimHost')};
  const timer = setInterval(() => { u.pct = 100 * (1 - Math.exp(-(performance.now() - u.t0) / (est * .55))); renderBatch(); }, 120);
  renderBatch();
  let results = null;
  try{
    const reqs = others.map(cpuRequest);
    try{
      const j = await api('/matches/batch', {method: 'POST', body: {requests: reqs, summary_only: true}});
      results = j.results;
    }catch(e){
      if(!/\((404|405)\)|Not Found|Method Not Allowed/.test(e.message)) throw e;
      // endpoint unavailable: parallel singles, still one progress UI
      results = await Promise.all(reqs.map(rq => api('/matches/start', {method: 'POST', body: rq})));
    }
    others.forEach((o, i) => { S.season.results[o.id] = resultFromFull(o, results[i]); });
    u.ms = performance.now() - u.t0;
    S.career.batchMs = Math.round(u.ms);
  }catch(e){
    u.error = 'League simulation failed: ' + e.message; toast(u.error);
  }finally{ clearInterval(timer); }
  u.results = results || [];
  for(let i = 1; i <= others.length; i++){ u.revealed = i; renderBatch(); await new Promise(r => setTimeout(r, 55)); }
  setTimeout(() => { if(_batchUI === u) CC.closeSim(); }, 6000);
  return !u.error;
}
CC.simulateOthers = simulateOthers; CC.cpuRequest = cpuRequest;

function recordLivResult(f, m){
  const ftd = m.fullTime, scorers = {}, ratings = {};
  for(const e of ftd.events || [])
    if(e.event_type === 'GOAL' && e.actor_id && P(e.actor_id) && P(e.actor_id).clubId === LIV) scorers[e.actor_id] = (scorers[e.actor_id] || 0) + 1;
  for(const [pid, ps] of Object.entries(ftd.player_stats || {})) if(P(pid) && P(pid).clubId === LIV) ratings[pid] = ps.rating;
  S.season.results[f.id] = {
    score: [ftd.score.home, ftd.score.away], matchId: m.matchId, engine: ftd.engine, kickoff: S.matchKickoff,
    changes: [...(S.changes || [])],
    managementEvents: (ftd.events || []).filter(e => ['SUBSTITUTION','FORMATION_CHANGE','TACTIC_CHANGE','INSTRUCTION_CHANGE'].includes(e.event_type))
      .map(e => ({t: e.timestamp, type: e.event_type, team: e.team_id, detail: e.detail})),
    stats: normalizeTeamStats(ftd), rich: {team_stats: ftd.team_stats, match_dynamics: ftd.match_dynamics},
    players: ftd.player_stats, scorers, ratings, lg: compactPlayers(ftd.player_stats)
  };
}

let _finalizing = null;
window.finalizeFixture = function(){
  if(_finalizing) return _finalizing;
  _finalizing = (async () => {
    const f = S.matchFixture, m = S.match;
    if(!f || !m || !m.fullTime) return;
    if(f.exhibition) return finalizeExhibition(f, m);
    if(S.season.results[f.id]) return;
    ensureCareer();
    recordLivResult(f, m);
    careerAfterMatch(f, m);
    saveState();
    refreshFtBanner();
    TL.bus.dispatchEvent(new CustomEvent('career:result', {detail: {fixtureId: f.id}}));
    await simulateOthers(f);
    weekPasses(f.mw);
    S.season.matchweek = Math.min(38, f.mw + 1);
    S.season.standings = computeStandings();
    checkSeasonEnd();
    saveState(); renderTopBar(); refreshFtBanner();
  })().finally(() => { _finalizing = null; });
  return _finalizing;
};

CC.isFinalizing = () => !!_finalizing;
const _startFixture = window.startFixture;
window.startFixture = function(fid){
  CC.lastRotation = null;
  if(_finalizing){ toast('Results from around the league are still coming in…'); _finalizing.then(() => window.startFixture(fid)); return; }
  return _startFixture.apply(this, arguments);
};
window.continueSeason = function(){
  const f = S.matchFixture;
  if(f && f.exhibition && f.scenario){ endExhibition(); return; }
  // in-match changes were for that match: next fixture starts from your plan
  const hadChanges = S.base && S.changes && S.changes.length;
  if(S.base && !(f && f.exhibition)) S.current = JSON.parse(JSON.stringify(S.base));
  S.match = null; S.matchFixture = null; S.changes = []; S.base = null;
  if(hadChanges) setTimeout(() => toast('In-match changes reset — you’re back on your pre-match plan.'), 250);
  const notes = enforceAvailability(); if(notes.length){ saveState(); setTimeout(() => toast(notes[0]), 300); }
  if(S.career && S.career.sacked) return show('gameover');
  if(S.career && S.career.seasonEnd && !S.career.seasonEnd.done) return show('season');
  show('home');
};
const _abandon = window.abandonMatch;
window.abandonMatch = function(){
  const f = S.matchFixture;
  const r = _abandon.apply(this, arguments);
  if(f && f.exhibition && f.scenario && !S.match){ restoreSquadBackup(); show('challenges'); }
  return r;
};

/* ═══ 6. SEASON END → NEXT SEASON ═══════════════════════════════════════ */
function leagueStats(){
  const acc = {};
  for(const f of S.season.fixtures){
    const r = S.season.results[f.id]; if(!r || !r.lg) continue;
    for(const [pid, p] of Object.entries(r.lg)){
      const club = p.t === 'HOME' ? f.home : f.away;
      const a = acc[pid] = acc[pid] || {pid, name: p.n, club, g: 0, as: 0, apps: 0, rsum: 0, mins: 0};
      a.club = club; a.g += p.g; a.as += p.as; if(p.m > 0){ a.apps++; a.rsum += p.r; a.mins += p.m; }
    }
  }
  return Object.values(acc);
}
CC.leagueStats = leagueStats;
function computeSeasonEnd(){
  const c = S.career, rows = computeStandings();
  const pos = rows.findIndex(r => r.clubId === LIV) + 1, row = rows[pos - 1];
  const o = c.board.objective;
  const verdict = pos <= o.stretch ? 'exceeded' : pos <= o.min ? 'met' : pos <= o.min + 3 ? 'missed' : 'failed';
  const ls = leagueStats();
  const top = [...ls].sort((a, b) => b.g - a.g || b.as - a.as)[0] || null;
  const livStats = ls.filter(p => P(p.pid) && P(p.pid).clubId === LIV && p.apps >= 8);
  const poty = [...livStats].sort((a, b) => b.rsum / b.apps - a.rsum / a.apps)[0] || null;
  const young = [...ls].filter(p => P(p.pid) && P(p.pid).age <= 21 && p.apps >= 8).sort((a, b) => b.rsum / b.apps - a.rsum / a.apps)[0] || null;
  const confAdj = {exceeded: 15, met: 6, missed: -12, failed: -25}[verdict];
  return {year: c.year, label: PREMIER_LEAGUE.season, pos, pts: row.pts, record: `${row.w}-${row.d}-${row.l}`, gd: row.gd,
    champion: rows[0].clubId, objective: {...o}, verdict, confAdj,
    awards: {top: top && {pid: top.pid, name: top.name, club: top.club, g: top.g, as: top.as},
      poty: poty && {pid: poty.pid, name: poty.name, avg: +(poty.rsum / poty.apps).toFixed(2), apps: poty.apps, g: poty.g},
      young: young && {pid: young.pid, name: young.name, club: young.club, avg: +(young.rsum / young.apps).toFixed(2), apps: young.apps}},
    table: rows.map(r => ({c: r.clubId, p: r.pts, gd: r.gd})), done: false};
}
function checkSeasonEnd(){
  const c = S.career; if(!c || c.seasonEnd) return;
  if(!S.season.fixtures.every(f => S.season.results[f.id])) return;
  c.seasonEnd = computeSeasonEnd();
  const se = c.seasonEnd;
  c.board.confidence = Math.round(clamp(c.board.confidence + se.confAdj, 0, 100));
  if(se.verdict === 'failed' && c.board.confidence < 25)
    c.sacked = {year: c.year, mw: 38, pos: se.pos, pts: se.pts, record: se.record, conf: c.board.confidence,
      reason: `Finishing ${ordinal(se.pos)} against an objective of "${se.objective.text}" was not acceptable to the board.`};
  saveCareer();
}
CC.checkSeasonEnd = checkSeasonEnd;
const seasonLabel = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
function relabelFixtures(year){
  for(const f of S.season.fixtures){
    const d = new Date(year, 7, 15 + (f.mw - 1) * 7);
    f.date = d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'});
  }
}
function seasonEndDevelopment(){
  const c = S.career, notes = [];
  for(const pl of clubPool()){
    const age = pl.age + 1;
    const d = c.dev[pl.id] = c.dev[pl.id] || {a: {}, ovr: 0};
    const r = rngFor(`agedev|${c.year}|${pl.id}`);
    if(age >= 31){
      const drop = age >= 35 ? 2 : age >= 33 ? 1 + (r() < .3 ? 1 : 0) : (r() < .5 ? 1 : 0);
      if(!drop) continue;
      for(const k of ['acc','spr','agi','stam']) d.a[k] = (d.a[k] || 0) - (drop + (r() < .5 ? 1 : 0));
      d.ovr = (d.ovr || 0) - drop;
      notes.push({kind: 'decline', pid: pl.id, text: `${shortName(pl.name)} −${drop} OVR (age ${age})`});
    } else if(age <= 22 && pl.ovr < pl.pot){
      const mins = (c.stats[pl.id] || {}).mins || 0;
      const g = mins >= 1500 ? 1 : 0;
      if(!g) continue;
      for(const k of keyAttrsFor(pl.pos).slice(0, 3)) d.a[k] = (d.a[k] || 0) + g;
      d.ovr = Math.min((d.ovr || 0) + g, pl.pot - PRISTINE[pl.id].ovr);
      notes.push({kind: 'dev', pid: pl.id, text: `${shortName(pl.name)} +${g} OVR over the summer (${mins} league minutes last season)`});
    }
  }
  return notes;
}
const BUDGET_BY_POS = pos => pos === 1 ? 45 : pos === 2 ? 35 : pos <= 4 ? 25 : pos <= 6 ? 12 : pos <= 10 ? 5 : 0;
CC.startNextSeason = function(){
  const c = S.career, se = c.seasonEnd; if(!se) return;
  if(isLiveMatch()) return toast('Finish the current match first.');
  se.done = true;
  c.history.push({year: c.year, label: se.label, pos: se.pos, pts: se.pts, record: se.record, verdict: se.verdict,
    objective: se.objective.text, awards: se.awards, champion: se.champion});
  const devNotes = seasonEndDevelopment();
  c.ageAdd = (c.ageAdd || 0) + 1;
  c.year += 1; c.seasonNo += 1;
  applyCareerToPlayers();
  PREMIER_LEAGUE.season = seasonLabel(c.year);
  S.season = blankSeason();
  relabelFixtures(c.year);
  c.seasonSeed = S.season.seed;
  c.board.objective = objectiveFor(LIV, se.pos);
  c.board.confidence = Math.round(clamp(55 + (se.confAdj > 0 ? 10 : se.confAdj < -15 ? -10 : 0) + (c.board.confidence - 55) * .3, 30, 80));
  c.board.history = []; c.board.lastWarn = null;
  const bonus = BUDGET_BY_POS(se.pos);
  const base = INITIAL_CLUB_FINANCES.LIV.transferBudget;
  S.finance.transferBudget = Math.round((base * .7 + bonus + Math.max(0, S.finance.transferBudget) * .3) * 10) / 10;
  S.finance.seasonTransferSpend = 0; S.finance.seasonSalesIncome = 0;
  for(const pid of Object.keys(c.cond)) c.cond[pid] = 100;          // pre-season
  for(const [pid, inj] of Object.entries(c.injuries)){ inj.weeks -= 6; if(inj.weeks <= 0) delete c.injuries[pid]; }
  c.stats = {}; c.processed = {}; c.lastReport = null; c.kick = null; c.seasonEnd = null;
  c.notices = [{kind: 'season', text: `Welcome to ${PREMIER_LEAGUE.season}. Objective: ${c.board.objective.text}. Transfer budget ${fmtM(S.finance.transferBudget)} (finish bonus ${fmtM(bonus)}).`, mw: 1},
    ...devNotes.map(n => ({...n, mw: 1})), ...c.notices].slice(0, 40);
  enforceAvailability();
  saveState(); renderTopBar(); show('home');
  toast(`${PREMIER_LEAGUE.season} begins — ${devNotes.length} squad changes over the summer`);
};
CC.restartCareer = function(){
  if(!confirm('Start a new career? Your current save will be wiped.')) return;
  try{
    localStorage.removeItem(STORE_KEY); localStorage.removeItem(CAREER_KEY);
    localStorage.removeItem('touchline:active_match'); localStorage.removeItem('touchline:save_id');
  }catch(e){}
  location.hash = ''; location.reload();
};

/* ═══ 7. PRE-MATCH — scouting, board expectation, squad readiness ═══════ */
const TACTIC_LABEL = Object.fromEntries(TACTIC_GROUPS.flatMap(g => g.controls.map(c => [c.id, c.label])));
let _scout = {key: null, data: null, loading: false, error: null};
function scoutKey(f){ return f.id + '|' + startingIds().join(',') + '|' + S.current.formationId; }
async function loadScout(f, force){
  const key = scoutKey(f);
  if(!force && (_scout.key === key && (_scout.data || _scout.loading))) return;
  _scout = {key, data: null, loading: true, error: null};
  const opp = f.home === LIV ? f.away : f.home;
  try{
    if(startingIds().length < 11) throw new Error('Pick a full XI to compare line strengths');
    const d = await api('/scout', {method: 'POST', body: {opponent: cpuSideForRequest(opp), mine: livSideForRequest()}});
    if(_scout.key === key) _scout = {key, data: d, loading: false, error: null};
  }catch(e){ if(_scout.key === key) _scout = {key, data: null, loading: false, error: e.message}; }
  if(S.ui.view === 'match' && S.matchFixture && !S.match){ const el = $('#ccScout'); if(el) renderScoutInto(f); }
}
CC.loadScout = loadScout;
function strengthRows(d){
  const L = [['attack','Attack'],['midfield','Midfield'],['defence','Defence'],['keeper','Goalkeeper']];
  return L.map(([k, l]) => {
    const t = d.strength[k] ?? 0, y = d.your_strength[k] ?? 0, diff = y - t;
    return `<div class="cc-str"><span class="l">${l}</span>
      <span class="cc-strbars"><i class="you" style="width:${clamp(y, 0, 100)}%"></i><i class="them" style="width:${clamp(t, 0, 100)}%"></i></span>
      <span class="v"><b>${y}</b> <em>v</em> ${t}</span><span class="d ${diff >= 3 ? 'good' : diff <= -3 ? 'bad' : ''}">${diff > 0 ? '+' : ''}${diff}</span></div>`;
  }).join('');
}
function planChanges(t){
  return Object.entries(t || {}).filter(([k]) => TACTIC_LABEL[k]).map(([k, v]) => {
    const cur = S.current.tactics[k];
    return `<span class="cc-chg ${cur === v ? 'same' : ''}">${esc(TACTIC_LABEL[k])}: ${cur === v ? '<b>' + esc(v) + '</b> ✓' : esc(cur) + ' → <b>' + esc(v) + '</b>'}</span>`;
  }).join('');
}
const planApplied = t => Object.entries(t || {}).every(([k, v]) => S.current.tactics[k] === v);
function renderScoutInto(f){
  const el = $('#ccScout'), pl = $('#ccPlan'); if(!el) return;
  const opp = clubById(f.home === LIV ? f.away : f.home);
  if(_scout.loading || !_scout.data){
    el.innerHTML = _scout.error
      ? `<div class="cc-muted">Scouting report unavailable — ${esc(_scout.error)}. <button class="cc-link" onclick="CC.loadScout(S.matchFixture,true).then(()=>renderMatch())">Retry</button></div>`
      : `<div class="cc-loading"><i class="cc-dot"></i> Your analysts are compiling the report on ${esc(opp.shortName)}…</div>`;
    if(pl) pl.innerHTML = el.innerHTML.includes('unavailable') ? '<div class="cc-muted">No plan without a report.</div>' : '<div class="cc-loading"><i class="cc-dot"></i> Drafting a game plan…</div>';
    return;
  }
  const d = _scout.data;
  el.innerHTML = `
    <div class="cc-outlook">${esc(outlookText(f))}</div>
    <div class="cc-style"><b>${esc(formationOf(d.formation || shapeFor(opp.id)).name)}</b> · ${esc(opp.plan)} — they ${esc(d.style || 'play a balanced game')}.</div>
    <h5>LINE STRENGTHS <span class="cc-legend"><i class="you"></i>You <i class="them"></i>${esc(opp.abbreviation)}</span></h5>
    ${strengthRows(d)}
    <h5>KEY PLAYERS</h5>
    <div class="cc-keys">${(d.key_players || []).map(k => `<div class="cc-key"><span class="cc-tagk">${esc(k.label)}</span>
      <b>${esc(k.name)}</b> <span class="cc-slot">${esc(k.slot)}</span><div class="why">${esc(k.why)}</div></div>`).join('') || '<div class="cc-muted">No standout individuals.</div>'}</div>
    ${(d.matchups || []).length ? `<h5>MATCHUPS</h5>${d.matchups.map(mu => `<div class="cc-mu ${mu.edge === 'you' ? 'good' : 'bad'}"><span>${mu.edge === 'you' ? 'EDGE YOU' : 'DANGER'}</span>${esc(mu.text)}</div>`).join('')}` : ''}
    ${(d.weaknesses || []).length ? `<h5>WHERE THEY'RE VULNERABLE</h5><ul class="cc-weak">${d.weaknesses.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}`;
  if(pl) pl.innerHTML = (d.plan || []).map((p, i) => {
    const has = p.tactics && Object.keys(p.tactics).length, done = has && planApplied(p.tactics);
    return `<div class="cc-plan ${done ? 'done' : ''}"><div class="t">${esc(p.text)}</div>
      ${has ? `<div class="cc-chgs">${planChanges(p.tactics)}</div>
      <button class="btn ${done ? 'sec' : 'pri'} sm" data-plan="${i}" onclick="CC.applyPlan(${i})" ${done ? 'disabled' : ''}>${done ? 'Applied ✓' : 'Apply'}</button>` : '<div class="cc-muted" style="margin-top:4px">No change to your plan needed.</div>'}
    </div>`; }).join('') + (CC._undoTac ? `<button class="cc-link" onclick="CC.undoPlan()">Undo last change</button>` : '');
}
CC.applyPlan = function(i){
  const d = _scout.data; if(!d || !d.plan[i]) return;
  const t = Object.fromEntries(Object.entries(d.plan[i].tactics || {}).filter(([k]) => TACTIC_IDS.includes(k)));
  CC._undoTac = {...S.current.tactics};
  S.current.tactics = {...S.current.tactics, ...t};
  saveState(); toast(`Plan updated — now “${activePlanName()}”`);
  renderMatch();
};
CC.undoPlan = function(){ if(!CC._undoTac) return; S.current.tactics = CC._undoTac; CC._undoTac = null; saveState(); renderMatch(); };
CC.rotateTired = function(){
  const st = S.current, f = curForm(), swaps = [], kept = [];
  for(const sl of f.slots){
    const pid = st.starters[sl.id]; if(!pid) continue;
    const c0 = condOf(pid); if(c0 >= 75) continue;
    const used = new Set(Object.values(st.starters).filter(Boolean));
    const cand = clubPool().filter(p => !used.has(p.id) && !isInjured(p.id) && condOf(p.id) >= Math.max(80, c0 + 15)
        && (sl.position === 'GK') === (p.pos === 'GK'))
      .sort((a, b) => slotScore(b, sl.position) - slotScore(a, sl.position))[0];
    // the more tired he is, the bigger the quality drop worth taking
    const allowed = 7 + (75 - c0) * 0.5;
    if(!cand || slotScore(P(pid), sl.position) - slotScore(cand, sl.position) > allowed){
      kept.push(`${shortName(P(pid).name)} (${Math.round(c0)}%)`); continue; }
    const bi = st.bench.indexOf(cand.id); if(bi > -1) st.bench.splice(bi, 1);
    st.starters[sl.id] = cand.id; instrFor(cand.id, sl.position);
    if(!st.bench.includes(pid)) st.bench.unshift(pid);
    swaps.push(`${shortName(cand.name)} in for ${shortName(P(pid).name)} (${Math.round(c0)}%)`);
  }
  while(st.bench.length > 7) st.bench.pop();
  saveState();
  CC.lastRotation = {swaps, kept};
  toast(swaps.length ? `Rested ${swaps.length}: ${swaps.join(', ')}` : 'No fresher like-for-like options — pick manually on the team screen.');
  renderMatch();
};
function readiness(){
  const st = S.current, f = curForm(), rows = [], warns = [];
  for(const sl of f.slots){
    const pid = st.starters[sl.id]; if(!pid) continue;
    const pl = P(pid), c = condOf(pid), fit = suitability(pl, sl.position), t = formTrend(pid);
    rows.push({sl, pl, c, fit, t});
    if(c < 75) warns.push({lvl: c < 62 ? 'bad' : 'warn', text: `${shortName(pl.name)} is at ${Math.round(c)}% condition — expect him to tire early.`});
    if(fit === 'out') warns.push({lvl: 'warn', text: `${shortName(pl.name)} is out of position at ${sl.position}.`});
    if(t && t.cls === 'cold') warns.push({lvl: 'warn', text: `${shortName(pl.name)} is out of form (${t.avg.toFixed(1)} over his last ${formOf(pid).length}).`});
  }
  const inj = Object.entries(S.career.injuries).filter(([pid]) => P(pid) && P(pid).clubId === LIV && isInjured(pid));
  return {rows, warns, inj};
}
TL.hooks.prematchHTML = function(f){
  ensureCareer();
  const notes = enforceAvailability();
  const home = f.home === LIV, opp = clubById(home ? f.away : f.home);
  const ex = expectationFor(f); CC._expCache = {fid: f.id, e: ex};
  const online = ENGINE_MODE === 'mock' || !!ENGINE_HEALTH;
  const sideSub = id => id === LIV ? `${curForm().name} · ${esc(activePlanName())}` : `${formationOf(shapeFor(id)).name} · ${esc(clubById(id).plan)}`;
  const R = readiness();
  const pct = v => Math.round(v * 100);
  const canRotate = R.rows.some(r => r.c < 75);
  return `<div class="cc-pre">
    <div class="board cc-prehead">
      <div class="cc-kicker">PREMIER LEAGUE · MATCHWEEK ${f.mw} · ${esc(f.date)} · ${home ? 'ANFIELD' : 'AWAY AT ' + esc(opp.shortName.toUpperCase())}${ENGINE_MODE === 'mock' ? ' · <b style="color:var(--warn)">MOCK ENGINE (DEV)</b>' : ''}</div>
      <div class="scoreline" style="margin-top:10px">
        <div class="tm"><span><span class="clubdot" style="background:${clubById(f.home).color}"></span>${esc(clubName(f.home))}</span><small>${sideSub(f.home)}</small></div>
        <div class="sc" style="font-size:22px;color:var(--dim)">vs</div>
        <div class="tm"><span><span class="clubdot" style="background:${clubById(f.away).color}"></span>${esc(clubName(f.away))}</span><small>${sideSub(f.away)}</small></div>
      </div>
      <div class="cc-expect">
        <div><span class="cc-k">THE BOARD EXPECTS</span><b>${ex.short}</b><span class="cc-muted"> — ${esc(ex.verdict)}</span></div>
        <div class="cc-odds" title="The board's pre-match estimate from squad strength and venue — not the engine's odds">
          <i class="w" style="flex:${ex.pW.toFixed(3)}">${pct(ex.pW) >= 12 ? 'W ' + pct(ex.pW) + '%' : ''}</i><i class="d" style="flex:${ex.pD.toFixed(3)}">${pct(ex.pD) >= 12 ? 'D ' + pct(ex.pD) + '%' : ''}</i><i class="l" style="flex:${ex.pL.toFixed(3)}">${pct(ex.pL) >= 12 ? 'L ' + pct(ex.pL) + '%' : ''}</i></div>
        <div class="cc-muted cc-small">Board confidence ${S.career.board.confidence}/100 · strength ${clubStrength(LIV).toFixed(1)} v ${clubStrength(opp.id).toFixed(1)} · a result above expectation lifts confidence</div>
      </div>
      <div class="cc-actions">
        <button class="btn pri" style="flex:0 0 auto;padding:12px 30px" ${online ? '' : 'disabled style="opacity:.5"'} onclick="kickOff()">Kick off</button>
        <button class="btn sec" onclick="show('squad')">Edit team &amp; tactics</button>
        <button class="btn sec" onclick="S.matchFixture=null;show('schedule')">Back</button>
      </div>
      ${!online ? `<p class="cc-err">Match engine unavailable. Start the Touchline server (<code>python server.py</code>) and try again.</p>` : ''}
      ${!SUPPORTED_ENGINE_FORMATIONS.includes(S.current.formationId) ? `<p class="cc-warnp">${curForm().name} isn't available in matches yet — switch to 4-3-3, 4-2-3-1 or 4-1-4-1 on the team screen.</p>` : ''}
      ${startingIds().length < 11 ? `<p class="cc-warnp">Only ${startingIds().length} of 11 selected.</p>` : ''}
    </div>
    <div class="cc-pregrid">
      <section class="cc-panel"><h4>SCOUTING REPORT · ${esc(opp.name.toUpperCase())}</h4><div id="ccScout"></div></section>
      <div class="cc-col">
        <section class="cc-panel"><h4>SUGGESTED PLAN</h4><div id="ccPlan"></div></section>
        <section class="cc-panel"><h4>YOUR SQUAD <span class="cc-h-r">${canRotate ? `<button class="btn sec sm" onclick="CC.rotateTired()">Rest tired players</button>` : ''}</span></h4>
          ${CC.lastRotation ? `<div class="cc-rot">${CC.lastRotation.swaps.length ? '✓ ' + esc(CC.lastRotation.swaps.join(' · ')) : ''}${CC.lastRotation.kept.length ? `<div class="cc-rot-k">Kept (no fresher like-for-like): ${esc(CC.lastRotation.kept.join(', '))}</div>` : ''}</div>` : ''}
          ${notes.map(n => `<div class="cc-note bad">⚕ ${esc(n)}</div>`).join('')}
          ${R.warns.slice(0, 5).map(w => `<div class="cc-note ${w.lvl}">${esc(w.text)}</div>`).join('')}
          ${!notes.length && !R.warns.length ? (startersBelow(85) ? '' : '<div class="cc-note good">Everyone is fit, fresh and in position.</div>') : ''}
          <div class="cc-xi">${R.rows.map(r => `<div class="cc-xirow"><span class="pos">${esc(r.sl.position)}</span>
            <span class="nm">${esc(shortName(r.pl.name))}${r.fit === 'out' ? ' <em class="bad">OOP</em>' : ''}</span>
            ${formBadge(r.pl.id)}${condBar(r.pl.id)}<span class="pc" style="color:${condColor(r.c)}">${Math.round(r.c)}%</span></div>`).join('')}</div>
          ${R.inj.length ? `<div class="cc-injl"><span class="cc-k">INJURED</span> ${R.inj.map(([pid, i]) => `${esc(shortName(P(pid).name))} <em>${esc(i.type)} · ${i.weeks}w</em>`).join(' · ')}</div>` : ''}
        </section>
      </div>
    </div>
  </div>`;
};
const _renderMatch = window.renderMatch;
window.renderMatch = function(){
  const wrap = $('#matchBody');
  const f = S.matchFixture;
  if(wrap) wrap.classList.toggle('cc-wide', !!(f && !S.match && !f.exhibition));
  if(wrap && f && !S.match && !f.exhibition && S.season && S.season.fixtures.some(x => x.id === f.id)){
    wrap.dataset.mode = 'pre';
    const sc = $('#v-match'), st = sc ? sc.scrollTop : 0;
    wrap.innerHTML = TL.hooks.prematchHTML(f);
    renderScoutInto(f); if(sc) sc.scrollTop = st;
    loadScout(f);
    return;
  }
  return _renderMatch.apply(this, arguments);
};

/* ═══ 8. FULL TIME — board reaction / scenario stars (match-ui hook) ═════ */
function starsFor(kind, gf, ga){
  const d = gf - ga;
  if(kind === 'protect') return d >= 2 ? 3 : d === 1 ? 2 : d === 0 ? 1 : 0;
  if(kind === 'deadlock') return d > 0 ? 3 : d === 0 ? 1 : 0;
  return d > 0 ? 3 : d === 0 ? 2 : d === -1 ? 1 : 0;
}
CC.starsFor = starsFor;
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
function scenarioFinal(m, sc){
  const snapScore = m.fullTime ? [m.fullTime.score.home, m.fullTime.score.away] : m.score;
  return sc.team === 'HOME' ? snapScore : [snapScore[1], snapScore[0]];
}
function ftLeagueHTML(f){
  const c = S.career, rep = c && c.lastReport && c.lastReport.fid === f.id ? c.lastReport : null;
  if(!rep) return `<div class="cc-ftb" id="ccFt"><div class="cc-loading"><i class="cc-dot"></i> Updating the season…</div><div id="ccSimHost">${_batchUI && _batchUI.mw === f.mw ? batchHTML() : ''}</div></div>`;
  const b = rep.board && rep.board.entry, [mood, mcls] = boardMood(c.board.confidence);
  return `<div class="cc-ftb" id="ccFt">
    <div class="cc-ftgrid">
      <div class="cc-ftc"><span class="cc-k">BOARD</span>
        <div class="cc-big ${mcls}">${c.board.confidence}<small>/100</small> <span class="cc-delta ${b.delta >= 0 ? 'good' : 'bad'}">${b.delta > 0 ? '▲ +' : b.delta < 0 ? '▼ ' : '● '}${b.delta}</span></div>
        <div class="cc-small">${esc(b.delta >= 3 ? 'The board liked that' : b.delta <= -3 ? 'The board is disappointed' : 'The board noted it')} — ${esc(b.why.charAt(0).toLowerCase() + b.why.slice(1))} <span class="cc-muted">Overall: ${esc(mood.toLowerCase())}.</span></div>
        ${rep.board.warn ? `<div class="cc-note ${c.board.confidence < 35 ? 'bad' : 'good'}">${esc(rep.board.warn)}</div>` : ''}</div>
      <div class="cc-ftc"><span class="cc-k">MEDICAL</span>
        ${rep.injuries.length ? rep.injuries.map(i => `<div class="cc-note bad">⚕ <b>${esc(shortName(i.name))}</b> — ${esc(i.type)}, out ${i.weeks} week${i.weeks > 1 ? 's' : ''}</div>`).join('') : '<div class="cc-small good">No new injuries.</div>'}
        ${rep.tired.length ? `<div class="cc-small">Leggy after this: ${rep.tired.map(t => `${esc(shortName(t.name))} <b style="color:${condColor(t.cond)}">${t.cond}%</b>`).join(', ')} <span class="cc-muted">(most of it comes back by next week)</span></div>` : ''}</div>
      <div class="cc-ftc"><span class="cc-k">DEVELOPMENT & FORM</span>
        ${rep.dev.map(d => `<div class="cc-note good">↑ ${esc(d.text)}</div>`).join('')}
        ${rep.motm ? `<div class="cc-small">Your best player: <b>${esc(shortName(rep.motm.name))}</b> ${rep.motm.rating.toFixed(1)}</div>` : ''}
        ${!rep.dev.length && !rep.motm ? '<div class="cc-small cc-muted">—</div>' : ''}</div>
    </div>
    ${c.sacked ? `<div class="cc-note bad" style="margin-top:10px"><b>The board has lost patience.</b> Press Continue.</div>` : c.seasonEnd && !c.seasonEnd.done ? `<div class="cc-note good" style="margin-top:10px"><b>That's the season.</b> Press Continue for the final table and awards.</div>` : ''}
    <div id="ccSimHost">${_batchUI && _batchUI.mw === f.mw ? batchHTML() : ''}</div>
  </div>`;
}
function ftScenarioHTML(f, m){
  const sc = f.scenario, [gf, ga] = scenarioFinal(m, sc), stars = starsFor(sc.kind, gf, ga);
  const c = ensureCareer(), sub = c.challenges.submitted[sc.scenario_id + '|' + m.matchId];
  const objs = ((sc.objective || {}).stars || []);
  return `<div class="cc-ftb cc-ftsc" id="ccFt">
    <div class="cc-k">${sc.daily ? 'TOUCHLINE DAILY · ' + esc(sc.date) : 'SCENARIO'} · ${esc(sc.title || KIND_INFO[sc.kind].name)}</div>
    <div class="cc-stars s${stars}">${starStr(stars)}</div>
    <div class="cc-small">${gf}–${ga} from ${sc.state.score[0]}–${sc.state.score[1]} at ${Math.round(sc.takeover_clock / 60)}'</div>
    ${objs.length ? `<div class="cc-objs">${objs.map(o => `<span class="${stars >= o.stars ? 'hit' : ''}">${starStr(o.stars)} ${esc(o.label)}</span>`).join('')}</div>` : ''}
    <div class="cc-subm" id="ccSubmit">${sub ? submittedHTML(sub) : c.manager
      ? `<div class="cc-loading"><i class="cc-dot"></i> Submitting to the leaderboard as ${esc(c.manager)}…</div>`
      : managerFormHTML(`CC.submitCurrent()`)}</div>
    <div class="cc-actions" style="margin-top:8px">
      <button class="btn sec sm" onclick="CC.share('${esc(sc.scenario_id)}')">Copy share text</button>
    </div>
    <div id="ccLb"></div>
  </div>`;
}
function managerFormHTML(action){
  return `<div class="cc-mform"><label for="ccMgr">Manager name for leaderboards</label>
    <input id="ccMgr" maxlength="24" placeholder="e.g. Klopp's Heir" onkeydown="if(event.key==='Enter'){${action}}">
    <button class="btn pri sm" style="flex:0 0 auto" onclick="${action}">Submit</button></div>`;
}
function submittedHTML(sub){
  return `<div class="cc-small">Submitted as <b>${esc(sub.name)}</b> — rank <b>${sub.rank}</b> of ${sub.total}${sub.best ? ' · <span class="good">new personal best</span>' : ''}</div>`;
}
const _ftView = window.renderFullTimeView;
window.renderFullTimeView = function(wrap, m){
  const r = _ftView.apply(this, arguments);
  try{
    const f = S.matchFixture;
    if(f && f.exhibition && f.scenario){
      const k = [...wrap.querySelectorAll('.board div')].find(d => /^\s*MATCHWEEK 0 ·/.test(d.textContent));
      if(k) k.innerHTML = k.innerHTML.replace(/MATCHWEEK 0 ·/, f.scenario.daily ? 'TOUCHLINE DAILY ·' : 'SCENARIO ·');
    }
  }catch(e){}
  return r;
};
TL.hooks.ftBannerHTML = function(m){
  try{
    const f = S.matchFixture; if(!f) return '';
    if(f.exhibition && f.scenario) return ftScenarioHTML(f, m);
    if(f.exhibition) return `<div class="cc-ftb" id="ccFt"><div class="cc-small">Exhibition — this match does not count towards the season.</div></div>`;
    return ftLeagueHTML(f);
  }catch(e){ console.warn('ftBanner', e); return ''; }
};
function refreshFtBanner(){
  const el = document.getElementById('ccFt'); if(!el || !S.match) return;
  const sim = document.getElementById('ccSimHost'); const keep = sim ? sim.innerHTML : '';
  const html = TL.hooks.ftBannerHTML(S.match); if(!html) return;
  el.outerHTML = html;
  const ns = document.getElementById('ccSimHost'); if(ns && keep) ns.innerHTML = keep;
  if(S.matchFixture && S.matchFixture.scenario) loadLeaderboardInto(S.matchFixture.scenario.scenario_id, 'ccLb');
}
CC.refreshFtBanner = refreshFtBanner;
TL.hooks.afterFullTime = async function(m){
  const f = S.matchFixture; if(!f) return;
  if(f.exhibition && f.scenario){
    await finalizeExhibition(f, m);
    loadLeaderboardInto(f.scenario.scenario_id, 'ccLb');
    if(S.career.manager) CC.submitCurrent(true);
  }
};

/* ═══ 9. EXHIBITIONS & CHALLENGES ═══════════════════════════════════════ */
const KIND_INFO = {
  chase:{name:'The Chase', blurb:'One down at the hour. Find the equaliser — and maybe the winner.', stars:['Win','Draw','—']},
  comeback:{name:'The Comeback', blurb:'Two down after 55 minutes. The crowd is restless.', stars:['Win','Draw','Lose by one']},
  protect:{name:'Hold the Line', blurb:'One up with twenty to go. See it out — or kill it off.', stars:['Win by 2+','Win','Draw']},
  tenmen:{name:'Ten Men', blurb:'A red card has left you a man short. Stay in it.', stars:['Win','Draw','—']},
  deadlock:{name:'Break the Deadlock', blurb:'0–0 at 65 and they have had the better chances.', stars:['Win','—','Draw']}
};
const KINDS = ['chase','comeback','protect','tenmen','deadlock'];
const LIB_DEFAULT_OPP = {chase:'ARS', comeback:'MCI', protect:'NEW', tenmen:'CHE', deadlock:'EVE'};
const DAILY_OPPS = ['MCI','ARS','CHE','NEW','TOT','AVL','MUN'];
function localDate(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dailySpec(date){
  const [y, mo, d] = date.split('-').map(Number);
  const dayIdx = Math.floor(Date.UTC(y, mo - 1, d) / 86400000);
  const h = hashStr('daily|' + date);
  return {date, kind: KINDS[dayIdx % KINDS.length], opp: DAILY_OPPS[h % DAILY_OPPS.length], livHome: (h >> 3) % 2 === 0, base_seed: h, daily: true};
}
CC.dailySpec = dailySpec;
/* Canonical Liverpool (pristine data, never your modified squad). */
function canonicalLiverpool(){
  const pool = pristineClubPool(LIV);
  return buildSide(LIV, pool, {pristine: true, formation: '433', tactics: cpuTactics('High Press')});
}
function scenarioRequest(spec){
  const liv = canonicalLiverpool();
  const opp = buildSide(spec.opp, pristineClubPool(spec.opp), {pristine: true});
  const fid = spec.daily ? `DAILY-${spec.date}` : `SCN-${spec.kind}-${spec.opp}`;
  return {save_id: SAVE_ID, fixture_id: fid, seed: spec.base_seed, mode: 'live',
    config: {duration_seconds: 90 * 60, record_timeline: false},
    coach_ai: {home: !spec.livHome, away: spec.livHome},
    home_team: spec.livHome ? liv : opp, away_team: spec.livHome ? opp : liv};
}
CC.scenarioRequest = scenarioRequest;
const _scen = {};   // key -> {status, sc, spec, request, error}
function specKey(spec){ return spec.daily ? 'daily|' + spec.date : `lib|${spec.kind}|${spec.opp}`; }
async function findScenario(spec){
  const key = specKey(spec);
  if(_scen[key] && (_scen[key].status === 'loading' || _scen[key].status === 'ready')) return _scen[key];
  const request = scenarioRequest(spec);
  const ent = _scen[key] = {status: 'loading', spec, request};
  renderChallenges();
  try{
    ent.sc = await api('/scenarios/find', {method: 'POST', body: {request, team: spec.livHome ? 'HOME' : 'AWAY', kind: spec.kind, base_seed: spec.base_seed}});
    ent.status = 'ready';
    if(spec.daily){ const c = ensureCareer(); c.challenges.daily = {date: spec.date, id: ent.sc.scenario_id, kind: ent.sc.kind || spec.kind, title: ent.sc.title, fallback: !!ent.sc.fallback}; saveCareer(); }
  }catch(e){ ent.status = 'error'; ent.error = e.message; }
  renderChallenges();
  return ent;
}
CC.findScenario = findScenario;
function backupSquad(){ const c = ensureCareer(); if(!c.exBackup) c.exBackup = JSON.parse(JSON.stringify(S.current)); saveCareer(); }
function restoreSquadBackup(){
  const c = S.career; if(!c || !c.exBackup) return;
  S.current = {...blankSquad(), ...c.exBackup}; c.exBackup = null;
  saveState();
}
CC.restoreSquadBackup = restoreSquadBackup;
function squadFromSide(side){
  const st = blankSquad();
  st.formationId = side.formation;
  st.starters = Object.fromEntries(Object.entries(side.lineup).map(([k, p]) => [k, p ? p.id : null]));
  st.bench = side.bench.map(p => p.id);
  st.tactics = {...side.tactics};
  for(const sl of formationOf(side.formation).slots){ const pid = st.starters[sl.id]; if(pid) st.playerInstructions[pid] = {...(DEFAULT_INSTR[sl.position] || DEFAULT_INSTR.CM)}; }
  return st;
}
CC.takeCharge = async function(key){
  const ent = _scen[key]; if(!ent || ent.status !== 'ready') return;
  if(isLiveMatch() || (S.match && S.match.status !== 'ft')) return toast('Finish or abandon the current match first.');
  const sc = ent.sc, spec = ent.spec;
  const team = spec.livHome ? 'HOME' : 'AWAY';
  let snap;
  ent.starting = true; renderChallenges();
  try{
    snap = await api('/matches/start', {method: 'POST', body: {...ent.request, scenario_id: sc.scenario_id, mode: 'live', save_id: SAVE_ID}});
  }catch(e){ ent.starting = false; renderChallenges(); return toast('Could not start the scenario: ' + e.message); }
  ent.starting = false;
  backupSquad();
  const livSide = spec.livHome ? ent.request.home_team : ent.request.away_team;
  S.current = squadFromSide(livSide);
  S.base = JSON.parse(JSON.stringify(S.current)); S.changes = [];
  const fixture = {id: ent.request.fixture_id, mw: 0, home: ent.request.home_team.club_id, away: ent.request.away_team.club_id,
    date: spec.daily ? 'Daily ' + spec.date : 'Scenario', exhibition: true,
    scenario: {...sc, team, kind: sc.kind || spec.kind, daily: !!spec.daily, date: spec.date || null, opp: spec.opp, key}};
  S.matchKickoff = null;
  if(typeof TL.startLiveFromSnapshot === 'function') TL.startLiveFromSnapshot(snap, fixture);
  else { S.matchFixture = fixture; S.match = makeLiveMatch(snap); S.match.status = 'paused'; show('match'); renderMatch(); }
};
async function finalizeExhibition(f, m){
  const c = ensureCareer();
  if(!f.scenario) return;
  const sc = f.scenario, [gf, ga] = scenarioFinal(m, sc), stars = starsFor(sc.kind, gf, ga);
  const best = c.challenges.best[sc.scenario_id];
  if(!best || stars > best.stars || (stars === best.stars && gf - ga > best.score[0] - best.score[1]))
    c.challenges.best[sc.scenario_id] = {stars, score: [gf, ga], kind: sc.kind, opp: sc.opp, daily: sc.daily, date: sc.date,
      from: sc.state.score, at: Math.round(sc.takeover_clock / 60), title: sc.title};
  c.challenges.last = {id: sc.scenario_id, stars, score: [gf, ga], from: sc.state.score, at: Math.round(sc.takeover_clock / 60), date: sc.date, daily: sc.daily};
  saveCareer();
}
function endExhibition(){
  S.match = null; S.matchFixture = null; S.changes = []; S.base = null;
  clearActiveMatchHandle();
  restoreSquadBackup();
  show('challenges');
}
CC.submitCurrent = async function(auto){
  const f = S.matchFixture, m = S.match; if(!f || !f.scenario || !m) return;
  const c = ensureCareer();
  const inp = document.getElementById('ccMgr');
  if(inp){ const v = inp.value.trim(); if(!v){ inp.focus(); return toast('Enter a manager name'); } c.manager = v.slice(0, 24); saveCareer(); }
  if(!c.manager) return;
  const k = f.scenario.scenario_id + '|' + m.matchId;
  if(c.challenges.submitted[k]) return;
  const box = document.getElementById('ccSubmit');
  if(box) box.innerHTML = `<div class="cc-loading"><i class="cc-dot"></i> Submitting as ${esc(c.manager)}…</div>`;
  try{
    const r = await api(`/challenges/${encodeURIComponent(f.scenario.scenario_id)}/submit`, {method: 'POST', body: {match_id: m.matchId, manager_name: c.manager}});
    c.challenges.submitted[k] = {name: c.manager, rank: r.rank, total: r.total, best: r.best, stars: r.stars};
    saveCareer();
    if(box) box.innerHTML = submittedHTML(c.challenges.submitted[k]);
    loadLeaderboardInto(f.scenario.scenario_id, 'ccLb');
  }catch(e){
    if(box) box.innerHTML = `<div class="cc-note bad">Leaderboard submit failed: ${esc(e.message)} <button class="cc-link" onclick="CC.submitCurrent()">Retry</button></div>`;
  }
};
async function loadLeaderboardInto(id, elId){
  const el = document.getElementById(elId); if(!el) return;
  try{
    const lb = await api(`/challenges/${encodeURIComponent(id)}/leaderboard`);
    const me = S.career && S.career.manager;
    const el2 = document.getElementById(elId); if(!el2) return;
    el2.innerHTML = `<div class="cc-lb"><div class="cc-k">LEADERBOARD · ${lb.total} manager${lb.total === 1 ? '' : 's'}</div>
      ${(lb.entries || []).length ? `<table><tbody>${lb.entries.slice(0, 10).map((e, i) => `<tr class="${e.manager_name === me ? 'me' : ''}">
        <td class="rk">${i + 1}</td><td class="nm">${esc(e.manager_name)}</td><td class="st">${starStr(e.stars)}</td>
        <td class="sc">${e.score[0]}–${e.score[1]}</td><td class="dc">${e.decisions ?? '—'} dec.</td></tr>`).join('')}</tbody></table>`
      : '<div class="cc-small cc-muted">No entries yet — be the first.</div>'}</div>`;
  }catch(e){ el.innerHTML = `<div class="cc-small cc-muted">Leaderboard unavailable (${esc(e.message)}).</div>`; }
}
CC.loadLeaderboardInto = loadLeaderboardInto;
function shareText(id){
  const c = S.career, b = c.challenges.best[id] || {};
  const last = c.challenges.last && c.challenges.last.id === id ? c.challenges.last : b;
  if(!last || last.stars == null) return null;
  const head = last.daily ? `Touchline Daily ${last.date}` : `Touchline · ${(KIND_INFO[b.kind] || {}).name || 'Scenario'}`;
  return `${head} · ${starStr(last.stars)} · ${last.score[0]}–${last.score[1]} from ${last.from[0]}–${last.from[1]} at ${last.at}'`;
}
CC.shareText = shareText;
CC.share = function(id){ const t = shareText(id); if(!t) return toast('Play it first to share a result'); copyText(t, 'Copied: ' + t); };

/* ── Challenges view ───────────────────────────────────────────────────── */
let _libOpp = {...LIB_DEFAULT_OPP};
CC.setLibOpp = (kind, opp) => { _libOpp[kind] = opp; renderChallenges(); };
function briefingHTML(key, ent, big){
  const c = ensureCareer();
  if(!ent || ent.status === 'loading') return `<div class="cc-loading"><i class="cc-dot"></i> Searching seeded matches for the right moment…</div>`;
  if(ent.status === 'error') return `<div class="cc-note bad">Couldn't build this scenario: ${esc(ent.error)} <button class="cc-link" onclick="CC.retryScen('${key}')">Retry</button></div>`;
  const sc = ent.sc, st = sc.state || {}, best = c.challenges.best[sc.scenario_id];
  const opp = clubById(ent.spec.opp), min = Math.round((sc.takeover_clock || 0) / 60);
  const two = a => Array.isArray(a) ? a.map(v => typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v).join('–') : '—';
  return `<div class="cc-brief">
    <div class="cc-brief-h"><div><div class="cc-btitle">${esc(sc.title || KIND_INFO[ent.spec.kind].name)}</div>
      <div class="cc-small cc-muted">Liverpool ${ent.spec.livHome ? 'v' : 'at'} ${esc(opp.name)} · everyone plays the same squads and the same match${sc.fallback && sc.kind !== ent.spec.kind ? ` · <span class="warn" title="No ${esc(KIND_INFO[ent.spec.kind].name)} moment turned up in today's matches, so you get the closest chase instead">no ${esc(KIND_INFO[ent.spec.kind].name)} today — it's The Chase instead</span>` : ''}</div></div>
      ${best ? `<div class="cc-best" title="Your best">${starStr(best.stars)}<small>${best.score[0]}–${best.score[1]}</small></div>` : ''}</div>
    <p class="cc-btext">${esc(sc.brief || KIND_INFO[ent.spec.kind].blurb)}</p>
    <div class="cc-state"><div><span class="cc-k">MINUTE</span><b>${min}'</b></div><div><span class="cc-k">SCORE</span><b>${two(st.score)}</b></div>
      <div><span class="cc-k">xG</span><b>${two(st.xg)}</b></div><div><span class="cc-k">SHOTS</span><b>${two(st.shots)}</b></div>
      <div><span class="cc-k">REDS</span><b>${two(st.reds)}</b></div></div>
    <div class="cc-objs">${((sc.objective || {}).stars || []).map(o => `<span class="${best && best.stars >= o.stars ? 'hit' : ''}">${starStr(o.stars)} ${esc(o.label)}</span>`).join('')}</div>
    <div class="cc-actions">
      <button class="btn pri" style="flex:0 0 auto;padding:10px 24px" ${ent.starting ? 'disabled' : ''} onclick="CC.takeCharge('${key}')">${ent.starting ? 'Starting…' : 'Take charge'}</button>
      ${best ? `<button class="btn sec sm" onclick="CC.share('${esc(sc.scenario_id)}')">Copy share text</button>` : ''}
      ${big ? `<button class="btn sec sm" onclick="CC.loadLeaderboardInto('${esc(sc.scenario_id)}','ccDailyLb')">Refresh leaderboard</button>` : ''}
    </div>
  </div>`;
}
CC.retryScen = key => { const e = _scen[key]; if(!e) return; delete _scen[key]; findScenario(e.spec); };
function renderChallenges(){
  const el = document.getElementById('challengesBody'); if(!el || S.ui.view !== 'challenges') return;
  const c = ensureCareer();
  const date = localDate(), ds = dailySpec(date), dkey = specKey(ds), dent = _scen[dkey];
  const kinfo = KIND_INFO[(dent && dent.sc && dent.sc.kind) || ds.kind] || KIND_INFO[ds.kind];
  el.innerHTML = `
    <div class="pagehead">CHALLENGES · SEEDED & FAIR</div>
    <h2 class="pagetitle">Take charge mid-match</h2>
    <p class="cc-lead">Every challenge drops you into a real engine match at a decisive moment. Same squads, same seed, same dice for everyone — only your decisions differ.</p>
    <div class="cc-chgrid">
      <section class="cc-panel cc-daily"><h4>TOUCHLINE DAILY · ${esc(date)} <span class="cc-h-r cc-kind">${esc(kinfo.name.toUpperCase())}</span></h4>
        <div id="ccDaily">${briefingHTML(dkey, dent, true)}</div>
        ${c.manager ? `<div class="cc-small cc-muted" style="margin-top:8px">Playing as <b>${esc(c.manager)}</b> · <button class="cc-link" onclick="CC.renameManager()">change</button></div>` : ''}
      </section>
      <section class="cc-panel"><h4>DAILY LEADERBOARD</h4><div id="ccDailyLb">${dent && dent.status === 'ready' ? '<div class="cc-loading"><i class="cc-dot"></i> Loading…</div>' : '<div class="cc-small cc-muted">Available once today\'s scenario is ready.</div>'}</div></section>
    </div>
    <h3 class="cc-sub">SCENARIO LIBRARY</h3>
    <div class="cc-lib">${KINDS.map(k => {
      const spec = {kind: k, opp: _libOpp[k], livHome: true, base_seed: hashStr(`lib|${k}|${_libOpp[k]}`), daily: false};
      const key = specKey(spec), ent = _scen[key];
      const best = ent && ent.sc ? c.challenges.best[ent.sc.scenario_id] : Object.values(c.challenges.best).find(b => !b.daily && b.kind === k && b.opp === _libOpp[k]);
      return `<div class="cc-panel cc-libc"><div class="cc-libh"><b>${esc(KIND_INFO[k].name)}</b>${best ? `<span class="cc-best">${starStr(best.stars)}</span>` : ''}</div>
        <div class="cc-small cc-muted">${esc(KIND_INFO[k].blurb)}</div>
        <div class="cc-librow"><label>vs</label><select onchange="CC.setLibOpp('${k}',this.value)">${CLUBS.filter(x => x.id !== LIV).map(x =>
          `<option value="${x.id}" ${x.id === _libOpp[k] ? 'selected' : ''}>${esc(x.shortName)}</option>`).join('')}</select>
          ${!ent ? `<button class="btn sec sm" onclick='CC.findScenario(${JSON.stringify(spec)})'>Find scenario</button>` : ''}</div>
        ${ent ? briefingHTML(key, ent, false) : ''}</div>`; }).join('')}</div>`;
  if(!dent) findScenario(ds);
  else if(dent.status === 'ready' && !CC._lbLoaded){ CC._lbLoaded = true; loadLeaderboardInto(dent.sc.scenario_id, 'ccDailyLb').then(() => { CC._lbLoaded = false; }); }
}
CC.renderChallenges = renderChallenges;
CC.renameManager = function(){ const v = prompt('Manager name for leaderboards', S.career.manager || ''); if(v && v.trim()){ S.career.manager = v.trim().slice(0, 24); saveCareer(); renderChallenges(); } };

/* ═══ 10. HOME DASHBOARD ═════════════════════════════════════════════════ */
function sparkline(vals, w = 150, h = 34){
  if(vals.length < 2) return '';
  const xs = i => (i / (vals.length - 1)) * (w - 4) + 2, ys = v => h - 2 - (v / 100) * (h - 4);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  return `<svg class="cc-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <line x1="0" x2="${w}" y1="${ys(35)}" y2="${ys(35)}" class="thr"/><path d="${d}"/>
    <circle cx="${xs(vals.length - 1)}" cy="${ys(vals[vals.length - 1])}" r="2.6"/></svg>`;
}
function resultLetter(f){ const r = S.season.results[f.id]; const gf = f.home === LIV ? r.score[0] : r.score[1], ga = f.home === LIV ? r.score[1] : r.score[0];
  return {l: gf > ga ? 'W' : gf < ga ? 'L' : 'D', gf, ga}; }
function scoutTeaser(nf){
  const opp = clubById(nf.home === LIV ? nf.away : nf.home);
  const d = _scout.data && _scout.key && _scout.key.startsWith(nf.id + '|') ? _scout.data : null;
  const ls = clubStrength(LIV), os = clubStrength(opp.id);
  if(d){ const kp = (d.key_players || [])[0];
    return `${esc(outlookText(nf))} ${kp ? `Watch <b>${esc(shortName(kp.name))}</b> (${esc(kp.why)}).` : ''}`; }
  // the same report the pre-match screen shows: fetch it, then re-render home
  if(!_scout.loading && !CC._teaserFetch){ CC._teaserFetch = true;
    loadScout(nf).then(() => { CC._teaserFetch = false; if(S.ui.view === 'home') renderHome(); }).catch(() => { CC._teaserFetch = false; }); }
  return `${esc(outlookText(nf))} ${esc(opp.shortName)} set up ${esc(formationOf(shapeFor(opp.id)).name)} with ${/^[aeiou]/i.test(opp.plan) ? 'an' : 'a'} ${esc(opp.plan.toLowerCase())} approach. Your analysts are finishing the report…`;
}
const _renderHome = window.renderHome;
window.renderHome = function(){
  const el = $('#homeBody'); if(!el) return;
  try{ renderHomeCC(el); }catch(e){ console.warn('career home failed, falling back', e); _renderHome.apply(this, arguments); }
};
function miniTable(){
  const rows = computeStandings(), li = rows.findIndex(r => r.clubId === LIV);
  const show = new Set([0, 1, 2, 3, li, li - 1, li + 1].filter(i => i >= 0 && i < rows.length));
  let prev = -1, out = '';
  for(const i of [...show].sort((a, b) => a - b)){
    if(prev >= 0 && i > prev + 1) out += '<tr class="gap"><td colspan="4">·&nbsp;·&nbsp;·</td></tr>';
    const r = rows[i];
    out += `<tr class="${r.clubId === LIV ? 'liv' : ''} ${i === 3 ? 'cut' : ''}"><td>${i + 1}</td><td><span class="clubdot" style="background:${clubById(r.clubId).color}"></span>${esc(clubById(r.clubId).shortName)}</td><td>${r.p}</td><td><b>${r.pts}</b></td></tr>`;
    prev = i;
  }
  return `<table class="cc-mini" style="margin-top:10px">${out}</table>`;
}
function renderHomeCC(el){
  const c = ensureCareer();
  if(c.sacked){ show('gameover'); return; }
  const row = livRow(), nf = nextLivFixture();
  const played = livFixtures().filter(f => S.season.results[f.id]);
  const last = played[played.length - 1];
  const b = c.board, [mood, mcls] = boardMood(b.confidence);
  const trend = b.history.slice(-8);
  const tr = trend.length >= 2 ? b.confidence - (trend.length >= 4 ? trend[trend.length - 4].conf : trend[0].conf - trend[0].delta) : 0;
  const o = b.objective;
  const onTrack = row.p === 0 ? 'Season not started' : row.p < 8 ? `Early days — ${ordinal(row.pos)} on ${row.pts} pts. The board starts judging the table after matchweek 8.` : row.pos <= o.stretch ? 'On course for the stretch target' : row.pos <= o.min ? 'On track' : `${row.pos - o.min} place${row.pos - o.min > 1 ? 's' : ''} below target`;
  const inj = Object.entries(c.injuries).filter(([pid]) => P(pid) && P(pid).clubId === LIV && isInjured(pid)).sort((a, b) => b[1].weeks - a[1].weeks);
  const tired = clubPool().filter(p => !isInjured(p.id) && condOf(p.id) < 80).sort((a, b) => condOf(a.id) - condOf(b.id));
  const hot = clubPool().map(p => ({p, t: formTrend(p.id)})).filter(x => x.t).sort((a, b) => b.t.avg - a.t.avg).slice(0, 3);
  const ds = dailySpec(localDate()), dinfo = c.challenges.daily && c.challenges.daily.date === ds.date ? c.challenges.daily : null, dbest = Object.values(c.challenges.best).find(x => x.daily && x.date === ds.date);
  const ex = nf ? expectationFor(nf) : null;
  const pts = last ? resultLetter(last) : null;
  const se = c.seasonEnd && !c.seasonEnd.done ? c.seasonEnd : null;
  const goals = {};
  for(const f of played){ const r = S.season.results[f.id]; if(r.scorers) for(const [pid, n] of Object.entries(r.scorers)) goals[pid] = (goals[pid] || 0) + n; }
  const scorers = Object.entries(goals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  el.innerHTML = `
    <div class="pagehead">LIVERPOOL · PREMIER LEAGUE ${PREMIER_LEAGUE.season}${c.seasonNo > 1 ? ' · SEASON ' + c.seasonNo : ''}</div>
    <h2 class="pagetitle">${se ? 'Season complete' : nf ? 'Matchweek ' + nf.mw : 'Matchweek ' + S.season.matchweek}</h2>
    ${se ? `<div class="cc-panel cc-seband"><div><b>The ${esc(se.label)} season is over — you finished ${ordinal(se.pos)}.</b>
      <div class="cc-small">Objective: ${esc(se.objective.text)} · verdict: <b class="${se.verdict === 'failed' || se.verdict === 'missed' ? 'bad' : 'good'}">${se.verdict.toUpperCase()}</b></div></div>
      <button class="btn pri" style="flex:0 0 auto" onclick="show('season')">Season review →</button></div>` : ''}
    ${b.lastWarn && b.confidence < 35 ? `<div class="cc-note bad cc-wide-note"><b>Board:</b> ${esc(b.lastWarn.text)}</div>` : ''}
    <div class="cc-home">
      <section class="cc-panel cc-board"><h4>BOARD CONFIDENCE</h4>
        <div class="cc-conf"><div class="cc-gauge ${mcls}" style="--p:${b.confidence}"><b>${b.confidence}</b><small>/100</small></div>
          <div><div class="cc-mood ${mcls}">${esc(mood)}${trend.length >= 2 ? ` <span class="cc-delta ${tr >= 0 ? 'good' : 'bad'}">${tr >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(tr))} last ${Math.min(3, trend.length)}</span>` : ''}</div>
          ${sparkline([60, ...trend.map(t => t.conf)].slice(-9))}</div></div>
        <div class="cc-meter"><i style="width:${b.confidence}%" class="${mcls}"></i><span class="danger" title="Below 20: your job is at risk"></span></div>
        <div class="cc-obj"><span class="cc-k">OBJECTIVE</span> ${esc(o.text)} <span class="cc-muted">· stretch: ${esc(o.stretchText)}</span></div>
        <div class="cc-small ${row.p >= 8 && row.pos > o.min ? 'bad' : row.p >= 8 ? 'good' : ''}">${esc(onTrack)}</div>
        ${trend.length ? `<div class="cc-small cc-muted" style="margin-top:6px">Last: ${esc(trend[trend.length - 1].why)}</div>` : '<div class="cc-small cc-muted" style="margin-top:6px">Each result is judged against the board\'s expectation for that fixture (opponent strength, venue) and your xG performance.</div>'}
      </section>
      <section class="cc-panel cc-next"><h4>NEXT FIXTURE</h4>
        ${nf ? `<div class="cc-nf"><span class="clubdot" style="background:${clubById(nf.home).color}"></span>${esc(clubName(nf.home))} <small>vs</small>
          <span class="clubdot" style="background:${clubById(nf.away).color}"></span>${esc(clubName(nf.away))}</div>
          <div class="cc-small cc-muted">MW ${nf.mw} · ${esc(nf.date)} · ${nf.home === LIV ? 'Anfield' : 'away'}</div>
          <div class="cc-expline"><span class="cc-k">BOARD EXPECTS</span> <b>${ex.short}</b> <span class="cc-muted" title="Average points the board expects from this fixture (win = 3, draw = 1)">(about ${ex.exp.toFixed(1)} of 3 points)</span></div>
          <div class="cc-teaser">${scoutTeaser(nf)}</div>
          <button class="btn pri sm" style="margin-top:10px;flex:0 0 auto;padding:9px 20px" onclick="startFixture('${nf.id}')">Prepare match →</button>`
        : `<div class="cc-small">No fixtures left this season.</div>`}
      </section>
      <section class="cc-panel"><h4>LEAGUE</h4>
        <div class="cc-lgrow"><div><span class="cc-k">POSITION</span><b class="cc-big2">${row.p ? ordinal(row.pos) : '—'}</b></div>
          <div><span class="cc-k">POINTS</span><b class="cc-big2">${row.pts}</b></div>
          <div><span class="cc-k">W–D–L</span><b class="cc-big2">${row.w}–${row.d}–${row.l}</b></div>
          <div><span class="cc-k">GD</span><b class="cc-big2">${row.gd >= 0 ? '+' : ''}${row.gd}</b></div></div>
        <div class="cc-k" style="margin-top:10px">FORM GUIDE</div>
        ${played.length ? `<div class="cc-formg">${played.slice(-5).map(f => { const x = resultLetter(f); const opp = f.home === LIV ? f.away : f.home;
          return `<span class="cc-fg ${x.l}" title="${esc(clubName(opp))} ${x.gf}–${x.ga}"><b>${x.l}</b><small>${esc(clubById(opp).abbreviation)} ${x.gf}–${x.ga}</small></span>`; }).join('')}</div>` : '<div class="cc-small cc-muted">No matches yet.</div>'}
        ${row.p ? miniTable() : ''}
        <button class="cc-link" onclick="show('table')">Full table →</button>
      </section>
      <section class="cc-panel"><h4>SQUAD ALERTS</h4>
        ${inj.length ? inj.map(([pid, i]) => `<div class="cc-alert"><span class="cc-injb">${i.weeks}w</span><b>${esc(shortName(P(pid).name))}</b> <span class="cc-muted">${esc(i.type)}</span>
          <span class="cc-rec"><i style="width:${Math.round(100 * (1 - i.weeks / (i.total || i.weeks)))}%"></i></span></div>`).join('') : '<div class="cc-small good">No injuries.</div>'}
        ${tired.length ? `<div class="cc-k" style="margin-top:8px">NEEDS A REST</div>${tired.slice(0, 4).map(p => `<div class="cc-alert"><b>${esc(shortName(p.name))}</b> ${condBar(p.id, '70px')} <span style="color:${condColor(condOf(p.id))}">${Math.round(condOf(p.id))}%</span></div>`).join('')}` : (startersBelow(85) ? `<div class="cc-small" style="margin-top:6px;color:var(--warn)">${startersBelow(85)} starters below 85% — consider rotating.</div>` : '<div class="cc-small good" style="margin-top:6px">Squad condition is good.</div>')}
        ${hot.length ? `<div class="cc-k" style="margin-top:8px">IN FORM</div><div class="cc-small">${hot.map(x => `${esc(shortName(x.p.name))} ${formBadge(x.p.id)} <b>${x.t.avg.toFixed(1)}</b>`).join(' · ')}</div>` : ''}
      </section>
      <section class="cc-panel"><h4>LAST RESULT</h4>
        ${last ? `<div class="cc-nf">${esc(clubName(last.home))} <b class="cc-res ${pts.l}">${S.season.results[last.id].score.join('–')}</b> ${esc(clubName(last.away))}</div>
          <div class="cc-small cc-muted">MW ${last.mw}${b.history.length && b.history[b.history.length - 1].fid === last.id ? ` · board ${b.history[b.history.length - 1].delta >= 0 ? '+' : ''}${b.history[b.history.length - 1].delta}` : ''}</div>
          ${scorers.length ? `<div class="cc-small" style="margin-top:6px">Top scorers: ${scorers.map(([pid, n]) => `${esc(shortName(P(pid).name))} <b>${n}</b>`).join(' · ')}</div>` : ''}
          <button class="btn sec sm" style="margin-top:10px" onclick="(window.CM && CM.openPast) ? CM.openPast('${last.id}') : openResult('${last.id}')">Match review →</button>` : '<div class="cc-small cc-muted">Your first match is waiting.</div>'}
      </section>
      <section class="cc-panel cc-dailyc"><h4>TOUCHLINE DAILY</h4>
        <div class="cc-nf">${esc(dinfo ? dinfo.title : KIND_INFO[ds.kind].name)} <small>v ${esc(clubById(ds.opp).shortName)}</small></div>
        <div class="cc-small cc-muted">${esc(KIND_INFO[dinfo ? dinfo.kind : ds.kind].blurb)}</div>
        ${dbest ? `<div class="cc-best" style="margin-top:6px">${starStr(dbest.stars)} <small>${dbest.score[0]}–${dbest.score[1]}</small></div>` : ''}
        <button class="btn ${dbest ? 'sec' : 'pri'} sm" style="margin-top:10px;flex:0 0 auto" onclick="show('challenges')">${dbest ? 'Try again' : 'Play today\'s challenge'} →</button>
      </section>
      <section class="cc-panel cc-news"><h4>CLUB NEWS</h4>
        ${c.notices.length ? c.notices.slice(0, 6).map(n => `<div class="cc-newsi ${n.kind}"><span>${n.mw ? 'MW' + n.mw : ''}</span>${esc(n.text)}</div>`).join('') : '<div class="cc-small cc-muted">Injuries, player development and board news will appear here.</div>'}
      </section>
      <section class="cc-panel"><h4>CLUB FINANCES</h4>
        <div class="cc-small">Transfer budget <b>${fmtM(S.finance.transferBudget)}</b> · wage bill <b>${fmtM(financeSnapshot().weeklyK / 1000)}/wk</b> · <span title="Squad cost ratio: wages + transfer amortisation as a share of revenue. Keep it under ~70%.">wages/revenue</span> <b>${Math.round(financeSnapshot().scr * 100)}%</b></div>
        <button class="cc-link" onclick="show('finances')">Finances →</button> <button class="cc-link" onclick="show('transfers')">Transfers →</button>
      </section>
    </div>`;
  if(!c.introSeen) showIntro();
}

/* ═══ 11. SEASON REVIEW / GAME OVER VIEWS ════════════════════════════════ */
function renderSeasonView(){
  const el = document.getElementById('seasonBody'); if(!el) return;
  const c = ensureCareer(), se = c.seasonEnd || (c.history.length ? null : null);
  if(!se){ el.innerHTML = `<div class="pagehead">SEASON</div><h2 class="pagetitle">Season in progress</h2>
    <div class="cc-small cc-muted">The season review appears after matchweek 38.</div>`; return; }
  const aw = se.awards, vcls = se.verdict === 'exceeded' || se.verdict === 'met' ? 'good' : 'bad';
  const vtxt = {exceeded: 'Exceeded expectations', met: 'Objective met', missed: 'Objective missed', failed: 'A failed season'}[se.verdict];
  el.innerHTML = `
    <div class="pagehead">PREMIER LEAGUE ${esc(se.label)} · FINAL</div>
    <h2 class="pagetitle">${esc(clubById(se.champion).name)} are champions${se.champion === LIV ? ' — that\'s you!' : ''}</h2>
    <div class="cc-segrid">
      <section class="cc-panel"><h4>BOARD VERDICT</h4>
        <div class="cc-big ${vcls}">${ordinal(se.pos)} <small>${se.pts} pts · ${se.record} · GD ${se.gd >= 0 ? '+' : ''}${se.gd}</small></div>
        <div class="cc-verdict ${vcls}">${vtxt}</div>
        <div class="cc-small">Objective: ${esc(se.objective.text)} (top ${se.objective.min}) · stretch: ${esc(se.objective.stretchText)}</div>
        <div class="cc-small" style="margin-top:6px">Board confidence ${se.confAdj >= 0 ? '+' : ''}${se.confAdj} → <b>${c.board.confidence}</b>/100.
          Next season's budget grows with your finish (${fmtM(BUDGET_BY_POS(se.pos))} bonus).</div>
        ${c.sacked ? `<div class="cc-note bad" style="margin-top:10px">The board has decided to make a change.</div>
          <button class="btn pri" style="margin-top:12px" onclick="show('gameover')">Continue</button>`
        : `<button class="btn pri" style="margin-top:14px;padding:12px 26px;flex:0 0 auto" onclick="CC.startNextSeason()">Start ${seasonLabel(c.year + 1)} season →</button>
          <div class="cc-small cc-muted" style="margin-top:8px">New fixtures · everyone ages a year · youngsters with minutes develop, veterans decline · the board sets a new objective and budget.</div>`}
      </section>
      <section class="cc-panel"><h4>AWARDS</h4>
        <div class="cc-awards">
          <div class="cc-award"><span class="cc-k">GOLDEN BOOT</span>${aw.top ? `<b>${esc(aw.top.name)}</b><small>${esc(clubById(aw.top.club).shortName)} · ${aw.top.g} goals, ${aw.top.as} assists</small>` : '<b>—</b><small>No goals recorded</small>'}</div>
          <div class="cc-award"><span class="cc-k">LIVERPOOL PLAYER OF THE SEASON</span>${aw.poty ? `<b>${esc(aw.poty.name)}</b><small>${aw.poty.avg} avg rating · ${aw.poty.apps} apps · ${aw.poty.g} goals</small>` : '<b>—</b><small>No player made 8+ appearances</small>'}</div>
          <div class="cc-award"><span class="cc-k">YOUNG PLAYER OF THE SEASON</span>${aw.young ? `<b>${esc(aw.young.name)}</b><small>${esc(clubById(aw.young.club).shortName)} · ${aw.young.avg} avg · ${aw.young.apps} apps</small>` : '<b>—</b><small>No under-22 made 8+ appearances</small>'}</div>
        </div>
      </section>
      <section class="cc-panel cc-setable"><h4>FINAL TABLE</h4>
        <table class="cc-mini">${se.table.map((r, i) => `<tr class="${r.c === LIV ? 'liv' : ''} ${i === 3 ? 'cut' : ''} ${i === 16 ? 'cut rel' : ''}"><td>${i + 1}</td>
          <td><span class="clubdot" style="background:${clubById(r.c).color}"></span>${esc(clubById(r.c).shortName)}</td><td>${r.gd >= 0 ? '+' : ''}${r.gd}</td><td><b>${r.p}</b></td></tr>`).join('')}</table>
      </section>
    </div>`;
}
function renderGameOver(){
  const el = document.getElementById('gameoverBody'); if(!el) return;
  const s = S.career.sacked || {};
  el.innerHTML = `<div class="cc-over">
    <div class="pagehead">LIVERPOOL FOOTBALL CLUB · STATEMENT</div>
    <h2 class="cc-overt">You have been relieved of your duties.</h2>
    <p>${esc(s.reason || 'The board has decided to make a change.')}</p>
    <div class="cc-state" style="justify-content:center"><div><span class="cc-k">SEASON</span><b>${seasonLabel(s.year || S.career.year)}</b></div>
      <div><span class="cc-k">MATCHWEEK</span><b>${s.mw || '—'}</b></div><div><span class="cc-k">POSITION</span><b>${s.pos ? ordinal(s.pos) : '—'}</b></div>
      <div><span class="cc-k">RECORD</span><b>${esc(s.record || '—')}</b></div><div><span class="cc-k">CONFIDENCE</span><b>${s.conf ?? '—'}</b></div></div>
    ${S.career.history.length ? `<div class="cc-small">Your tenure: ${S.career.history.map(h => `${esc(h.label)} ${ordinal(h.pos)}`).join(' · ')}</div>` : ''}
    <div class="cc-actions" style="justify-content:center;margin-top:18px">
      <button class="btn pri" style="flex:0 0 auto;padding:12px 28px" onclick="CC.restartCareer()">Start a new career</button>
      <button class="btn sec" onclick="show('challenges')">Play challenges</button></div>
  </div>`;
}

/* ═══ 12. ONBOARDING ═════════════════════════════════════════════════════ */
function showIntro(){
  if(document.getElementById('ccIntro')) return;
  const d = document.createElement('div'); d.id = 'ccIntro'; d.className = 'cc-intro';
  d.innerHTML = `<div class="cc-introc" role="dialog" aria-label="Welcome">
    <div class="pagehead">WELCOME TO TOUCHLINE</div>
    <h2>You're the Liverpool coach.</h2>
    <p class="cc-lead">Every match runs on a real football engine. You don't control players — you read the game and make the calls. The loop:</p>
    <div class="cc-steps">
      <div><b>1 · Prepare</b><span>Open the next fixture: read the scouting report, apply a game plan, rest tired legs.</span></div>
      <div><b>2 · React</b><span>Watch live. Your assistant flags the moments that need a decision — subs, shape, tempo.</span></div>
      <div><b>3 · Review</b><span>At full time see why it went the way it did. The board judges results against expectations.</span></div>
    </div>
    <p class="cc-small cc-muted">Condition carries between matches, injuries happen, young players grow with minutes — and a board with a target of the top four is watching.</p>
    <div class="cc-actions"><button class="btn pri" style="flex:0 0 auto;padding:11px 26px" onclick="CC.closeIntro(true)">Let's go</button>
      <button class="btn sec" onclick="CC.closeIntro(false)">Try a challenge first</button></div>
  </div>`;
  document.body.appendChild(d);
}
CC.closeIntro = function(home){
  const d = document.getElementById('ccIntro'); if(d) d.remove();
  S.career.introSeen = true; saveCareer();
  if(!home) show('challenges');
};

/* ═══ 13. SHELL / NAV / VIEW WRAPS ═══════════════════════════════════════ */
const _shell = window.shell;
window.shell = function(){
  const r = _shell.apply(this, arguments);
  const nav = $('.navtabs');
  if(nav && !nav.querySelector('[data-v="challenges"]')){
    const b = document.createElement('button');
    b.className = 'navtab'; b.dataset.v = 'challenges'; b.textContent = 'Challenges';
    b.setAttribute('onclick', "show('challenges')");
    const after = nav.querySelector('[data-v="results"]');
    nav.insertBefore(b, after ? after.nextSibling : null);
  }
  const app = $('#app');
  const addView = (id, inner) => { if(!document.getElementById(id)){ const v = document.createElement('div'); v.className = 'view page'; v.id = id; v.innerHTML = inner;
    const ref = document.getElementById('v-match'); app.insertBefore(v, ref); } };
  addView('v-challenges', '<div id="challengesBody"></div>');
  addView('v-season', '<div id="seasonBody"></div>');
  addView('v-gameover', '<div id="gameoverBody"></div>');
  return r;
};
const _show = window.show;
window.show = function(v){
  if(S.career && S.career.sacked && !['gameover','challenges','match','table','results','players'].includes(v)) v = 'gameover';
  const r = _show.apply(this, arguments.length ? [v, ...[].slice.call(arguments, 1)] : arguments);
  if(v === 'squad' && S.career && !isLiveMatch() && !(S.matchFixture && S.matchFixture.exhibition)){
    const notes = enforceAvailability(); if(notes.length){ renderPitch(); saveState(); toast(notes[0]); } }
  // squad screen opened from match prep: a way back
  let pill = document.getElementById('ccPrepPill');
  const wantPill = v === 'squad' && S.matchFixture && !S.match;
  if(wantPill && !pill){ pill = document.createElement('button'); pill.id = 'ccPrepPill'; pill.className = 'cm-pill';
    pill.onclick = () => show('match'); document.body.appendChild(pill); }
  if(pill){ if(wantPill) pill.innerHTML = `<i></i>MATCH PREP · ${esc(clubName(S.matchFixture.home))} v ${esc(clubName(S.matchFixture.away))} <b>← Back to match prep</b>`; else pill.remove(); }
  if(v === 'challenges') renderChallenges();
  if(v === 'season') renderSeasonView();
  if(v === 'gameover') renderGameOver();
  return r;
};

/* ── tactics panel: Philosophy first, the 13 dials behind "Advanced" ──── */
const PHILO = {
  'Balanced':['No extremes: mid block, mixed passing. A safe default.', 0],
  'Controlled':['Patient, short and wide. Keep the ball, wait for the opening.', 0],
  'Possession':['Dominate the ball, counterpress, squeeze high.', 1],
  'High Press':['Relentless pressing, quick vertical attacks.', 2],
  'Low Block':['Deep and compact, go direct. You concede territory and shots — best for protecting a lead.', 0],
  'Counter Attack':['Sit deep and break at speed when you win it.', 1],
  'End-to-End':['Everyone attacks, everyone presses. Chaos in both boxes.', 2]
};
Object.assign(PRESETS['High Press'], {pressingIntensity: 'Aggressive', markingOrientation: 'Hybrid', boxCommitment: 'Balanced'});
Object.assign(PRESETS['Possession'], {pressingIntensity: 'Selective'});
Object.assign(PRESETS['End-to-End'], {boxCommitment: 'Balanced', markingOrientation: 'Hybrid', pressingIntensity: 'Selective'});
const _rtp = window.renderTacticsPanel;
window.renderTacticsPanel = function(){
  const r = _rtp.apply(this, arguments);
  try{
    const el = $('#tacticsPanel'), body = el && el.querySelector('.tpbody'); if(!body) return r;
    const adv = !!(S.career && S.career.ui.advanced);
    const active = activePlanName();
    const box = document.createElement('div'); box.className = 'cc-philo';
    box.innerHTML = `<h4 class="cc-ph">PHILOSOPHY</h4>
      <div class="cc-phgrid">${Object.keys(PRESETS).map(k => `<button class="cc-phc ${k === active ? 'on' : ''}" onclick="applyPreset('${k}')">
        <b>${esc(k)}${PHILO[k] && PHILO[k][1] ? ` <span class="cc-leg" title="Demanding on condition">${'⚡'.repeat(PHILO[k][1])}</span>` : ''}</b>
        <span>${esc((PHILO[k] || [''])[0])}</span></button>`).join('')}</div>
      ${active === 'Custom' ? '<div class="cc-small cc-muted" style="margin:6px 0 0">Custom plan — tweaked in Advanced.</div>' : ''}
      <button class="cc-advt" onclick="CC.toggleAdvanced()" aria-expanded="${adv}">${adv ? '▾' : '▸'} Advanced — all 13 team instructions</button>`;
    body.insertBefore(box, body.firstChild);
    el.classList.toggle('cc-simple', !adv);
  }catch(e){ console.warn(e); }
  return r;
};
CC.toggleAdvanced = function(){ ensureCareer().ui.advanced = !S.career.ui.advanced; saveCareer(); renderTacticsPanel(); };

/* ── squad cards: condition, form, injury ──────────────────────────────── */
const _slotInner = window.slotInner;
window.slotInner = function(pid, slotPos, opts){
  let h = _slotInner.apply(this, arguments);
  if(!pid || !S.career || (S.match && S.match.status !== 'pre')) return h;
  const inj = isInjured(pid) ? injuryOf(pid) : null;
  const extra = `${condBar(pid)}${formBadge(pid)}${inj ? `<span class="cc-injb" title="${esc(inj.type)}">${inj.weeks}w</span>` : ''}`;
  h = h.replace('<div class="under"></div>', `<div class="under cc-under">${extra}</div>`);
  return h;
};
function pidFromOnclick(n){ const m = /\('([^']+)'\)/.exec(n.getAttribute('onclick') || ''); return m ? m[1] : null; }
function annotateCards(sel){
  $$(sel).forEach(n => {
    const pid = pidFromOnclick(n); if(!pid || !P(pid) || P(pid).clubId !== LIV) return;
    const fl = n.querySelector('.fitline'); if(!fl || fl.querySelector('.cc-cond')) return;
    const inj = isInjured(pid) ? injuryOf(pid) : null;
    fl.insertAdjacentHTML('beforeend', `<div class="cc-fl">${condBar(pid, '46px')}<span style="color:${condColor(condOf(pid))}">${Math.round(condOf(pid))}%</span>${formBadge(pid)}${inj ? `<span class="cc-injb">INJ ${inj.weeks}w</span>` : ''}</div>`);
    if(inj) n.classList.add('cc-injured');
  });
}
const _renderPicker = window.renderPicker;
window.renderPicker = function(){ const r = _renderPicker.apply(this, arguments); annotateCards('#pickBody .pw'); return r; };
const _renderList = window.renderList;
window.renderList = function(){ const r = _renderList.apply(this, arguments); annotateCards('#listGrid .pw'); return r; };
const _openDetails = window.openDetails;
window.openDetails = function(pid){
  const r = _openDetails.apply(this, arguments);
  try{
    const pl = P(pid), c = S.career; if(!pl || !c) return r;
    const pr = PRISTINE[pid], d = c.dev[pid];
    const devTxt = pr && pl.ovr !== pr.ovr ? `<span class="${pl.ovr > pr.ovr ? 'good' : 'bad'}">${pl.ovr > pr.ovr ? '+' : ''}${pl.ovr - pr.ovr} OVR since ${2026}</span>` : '';
    const st = c.stats[pid], f = formOf(pid), inj = isInjured(pid) ? injuryOf(pid) : null;
    const extra = pl.clubId === LIV ? `<div class="detblk cc-det"><h5>CAREER</h5>
      <div class="cc-detrow"><span>Condition</span>${condBar(pid, '120px')}<b style="color:${condColor(condOf(pid))}">${Math.round(condOf(pid))}% · ${condLabel(condOf(pid))}</b></div>
      <div class="cc-detrow"><span>Fitness</span><b class="${inj ? 'bad' : 'good'}">${inj ? `${esc(inj.type)} — back in ${inj.weeks} week${inj.weeks > 1 ? 's' : ''}` : 'Available'}</b></div>
      <div class="cc-detrow"><span>Form (last ${f.length || 0})</span><b>${f.length ? f.map(v => `<i class="cc-fr ${v >= 7.3 ? 'hi' : v <= 6.2 ? 'lo' : ''}">${v.toFixed(1)}</i>`).join('') + ' ' + formBadge(pid) : '—'}</b></div>
      <div class="cc-detrow"><span>Season</span><b>${st ? `${st.apps} apps · ${st.mins}' · ${st.g}g ${st.as}a · ${(st.rsum / st.apps).toFixed(2)} avg` : 'No appearances yet'}</b></div>
      <div class="cc-detrow"><span>Development</span><b>${devTxt || (pl.age <= 23 && pl.ovr < pl.pot ? 'Grows with minutes (potential ' + pl.pot + ')' : pl.age >= 31 ? 'Veteran — may decline at season end' : 'Established')}</b></div>
    </div>` : (pl.archetype ? `<div class="detblk cc-det"><h5>PROFILE</h5><div class="cc-detrow"><span>Type</span><b>${esc(pl.archetype)} ${esc(pl.pos)}</b></div></div>` : '');
    if(extra) $('#drawerBody').insertAdjacentHTML('afterbegin', extra);
  }catch(e){ console.warn(e); }
  return r;
};

/* ── table: league top scorers / assists / ratings ─────────────────────── */
const _renderTable = window.renderTable;
window.renderTable = function(){
  const r = _renderTable.apply(this, arguments);
  try{
    const el = $('#tableBody'); if(!el) return r;
    const ls = leagueStats();
    if(!ls.length){ el.insertAdjacentHTML('beforeend', `<div class="cc-small cc-muted" style="margin-top:14px">League leaders appear after the first matchweek.</div>`); return r; }
    const list = (arr, val, lab) => arr.slice(0, 8).map((p, i) => `<tr class="${P(p.pid) && P(p.pid).clubId === LIV ? 'liv' : ''}"><td>${i + 1}</td><td>${esc(p.name)}</td>
      <td><span class="clubdot" style="background:${clubById(p.club).color}"></span>${esc(clubById(p.club).abbreviation)}</td><td class="n"><b>${val(p)}</b></td></tr>`).join('');
    const goals = ls.filter(p => p.g).sort((a, b) => b.g - a.g || b.as - a.as);
    const assists = ls.filter(p => p.as).sort((a, b) => b.as - a.as || b.g - a.g);
    const minApps = Math.max(1, Math.floor(S.season.matchweek / 3));
    const rated = ls.filter(p => p.apps >= minApps).sort((a, b) => b.rsum / b.apps - a.rsum / a.apps);
    el.classList.add('cc-tl');
    el.insertAdjacentHTML('beforeend', `<div class="cc-leaders">
      <section class="cc-panel"><h4>TOP SCORERS</h4><table class="cc-mini">${list(goals, p => p.g) || '<tr><td>—</td></tr>'}</table></section>
      <section class="cc-panel"><h4>ASSISTS</h4><table class="cc-mini">${list(assists, p => p.as) || '<tr><td>—</td></tr>'}</table></section>
      <section class="cc-panel"><h4>AVERAGE RATING <small>(${minApps}+ apps)</small></h4><table class="cc-mini">${list(rated, p => (p.rsum / p.apps).toFixed(2)) || '<tr><td>—</td></tr>'}</table></section>
    </div>`);
  }catch(e){ console.warn(e); }
  return r;
};
const _renderTopBar = window.renderTopBar;
window.renderTopBar = function(){
  const r = _renderTopBar.apply(this, arguments);
  const el = $('#recordLabel'); if(el && S.career) el.title = `Board confidence ${S.career.board.confidence}/100`;
  return r;
};

/* ═══ 14. BOOT — load + migrate career, then render ══════════════════════ */
const _boot = window.boot;
window.boot = async function(){
  let saved = readCareerLocal();
  let hadMain = false;
  try{ hadMain = !!localStorage.getItem(STORE_KEY); }catch(e){}
  if(!saved && !hadMain){
    try{ const r = await fetch('/api/saves/' + SAVE_ID + '-career'); if(r.ok){ const j = await r.json(); saved = j.state || null; } }catch(e){}
  }
  S.career = saved;
  ensureCareer();
  PREMIER_LEAGUE.season = seasonLabel(S.career.year);
  applyCareerToPlayers();
  const res = await _boot.apply(this, arguments);
  try{ postBoot(); }catch(e){ console.warn('career post-boot', e); }
  return res;
};
function postBoot(){
  const c = ensureCareer();
  // migrate: an old save (no career yet) keeps its results without retro effects
  if(c.seasonSeed == null || c.seasonSeed !== S.season.seed){
    if(c.seasonSeed != null && c.seasonSeed !== S.season.seed){ c.processed = {}; c.stats = {}; }
    for(const f of livFixtures()) if(S.season.results[f.id]) c.processed[f.id] = true;
    c.seasonSeed = S.season.seed;
  }
  // an exhibition interrupted by a reload: give the squad back
  if(c.exBackup && !(S.matchFixture && S.matchFixture.exhibition)) restoreSquadBackup();
  checkSeasonEnd();
  const notes = enforceAvailability();
  if(notes.length) setTimeout(() => toast(notes[0]), 400);
  saveCareer();
  if(S.ui.view === 'home') renderHome();
  if(S.ui.view === 'squad'){ renderPitch(); renderTacticsPanel(); }
  else renderTacticsPanel();
  const hash = location.hash.slice(1);
  if(['challenges','season'].includes(hash) && S.ui.view !== 'match') show(hash);
  if(c.sacked && S.ui.view !== 'match') show('gameover');
  renderTopBar();
}
CC.postBoot = postBoot;

/* ── transfer offers: say what the club wants and answer clearly ───────── */
VALUATION.potFactor = 0.06;            // young high-potential players cost more
window.openOffer = function(pid){
  const pl = P(pid);
  const stance = interestFor(pl), ask = askingPrice(pl);
  const club = clubById(pl.clubId);
  $('#drawerTitle').textContent = `Offer — ${pl.name}`;
  $('#drawerSub').textContent = `${club.name} · estimated value ${fmtM(playerValue(pl))}`;
  const stanceTxt = stance === 'Unavailable' ? `${club.shortName} won't sell him at any price this window.`
    : stance === 'Uncertain' ? `${club.shortName} would rather keep him — expect to pay a premium (about ${fmtM(ask)}).`
    : `${club.shortName} are willing to sell for around ${fmtM(ask)}.`;
  $('#drawerBody').innerHTML = `
    <div class="cc-offer-stance ${stance === 'Unavailable' ? 'bad' : stance === 'Uncertain' ? 'warn' : 'good'}">${esc(stanceTxt)}</div>
    <label class="flabel">TRANSFER FEE (£m)</label>
    <input class="finput" id="offFee" type="number" min="0" step="0.5" value="${ask}" ${stance === 'Unavailable' ? 'disabled' : ''}>
    <label class="flabel">ADD-ONS (£m) <span style="opacity:.6">— count half toward their valuation</span></label>
    <input class="finput" id="offAddons" type="number" min="0" step="0.5" value="0" ${stance === 'Unavailable' ? 'disabled' : ''}>
    <div class="impact"><h5>CONTEXT</h5>
      <div class="tprow"><span>Transfer budget</span><b>${fmtM(S.finance.transferBudget)}</b></div>
      <div class="tprow"><span>Their asking price</span><b>${stance === 'Unavailable' ? 'not for sale' : fmtM(ask)}</b></div>
    </div>
    <div id="offResult"></div>`;
  $('#drawerFoot').innerHTML = `
    <button class="btn sec" onclick="openTransferProfile('${pid}')">Back</button>
    <button class="btn pri" onclick="submitOffer('${pid}')" ${stance === 'Unavailable' ? 'disabled style="opacity:.45"' : ''}>Submit offer</button>`;
};
window.submitOffer = function(pid){
  const pl = P(pid), club = clubById(pl.clubId);
  const fee = +$('#offFee').value || 0, addons = +$('#offAddons').value || 0;
  const out = msg => { const el = $('#offResult'); if(el) el.innerHTML = msg; };
  if(interestFor(pl) === 'Unavailable') return out(`<div class="cc-offer-res bad">${esc(club.shortName)} aren't selling.</div>`);
  if(fee + addons > S.finance.transferBudget)
    return out(`<div class="cc-offer-res bad">That's beyond your transfer budget (${fmtM(S.finance.transferBudget)}).</div>`);
  const ask = askingPrice(pl), worth = fee + addons * 0.5;
  if(worth < ask){
    const gap = Math.max(0.5, Math.round((ask - worth) * 2) / 2);
    return out(`<div class="cc-offer-res warn"><b>${esc(club.shortName)} reject the offer.</b> They're about ${fmtM(gap)} short of what they want (${fmtM(ask)}).</div>`);
  }
  out(`<div class="cc-offer-res good"><b>Fee agreed!</b> Now agree personal terms with ${esc(shortName(pl.name))}.</div>`);
  setTimeout(() => openContract(pid, fee, addons), 700);
};

/* ── result recovery: the server is the source of truth ──────────────────
   A result can only be lost in the browser (crash/reload/network before
   finalize ran). On boot, any Liverpool fixture the server has finished for
   this save is re-imported and processed exactly like a normal full time,
   and any matchweek whose other fixtures never landed is re-simulated
   (deterministic seeds → the same results). */
async function recoverResults(){
  if(!S.season) return;
  const busy = !!S.match;
  const h = (typeof getActiveMatchHandle === 'function') ? getActiveMatchHandle() : null;
  const played = new Set();
  // only the fixture you're up to can have been played without being recorded
  for(const f of (busy ? [] : [nextLivFixture()].filter(Boolean))){
    if(S.season.results[f.id] || (h && h.fixtureId === f.id)) continue;
    let row;
    try{ row = await api(`/matches/lookup?soft=1&save_id=${encodeURIComponent(SAVE_ID)}&fixture_id=${encodeURIComponent(f.id)}`); }
    catch(e){ continue; }                          // 404: never played
    if(!row || row.status !== 'ft') continue;
    let snap;
    try{ snap = await api(`/matches/${row.match_id}`); }catch(e){ continue; }
    if(!snap || !snap.full_time) continue;
    S.matchFixture = f;
    S.match = {matchId: row.match_id, status: 'ft', fullTime: snap.full_time, recovered: true};
    S.changes = []; S.matchKickoff = null;
    try{ await window.finalizeFixture(); }
    finally{ S.match = null; S.matchFixture = null; }
    played.add(f.id);
    toast(`Recovered your result: ${clubName(f.home)} ${snap.full_time.score.home}–${snap.full_time.score.away} ${clubName(f.away)}`);
  }
  // matchweeks where Liverpool played but the rest of the round is missing
  for(const f of livFixtures()){
    if(!S.season.results[f.id] || played.has(f.id)) continue;
    const missing = S.season.fixtures.some(x => x.mw === f.mw && !S.season.results[x.id]);
    if(missing){ await simulateOthers(f); S.season.standings = computeStandings(); played.add('round:' + f.mw); }
  }
  if(played.size){ saveState(); renderTopBar(); if(S.ui.view === 'home') renderHome(); }
}
CC.recoverResults = recoverResults;
TL.booted.then(() => setTimeout(async () => {
  try{ await recoverResults(); }catch(e){ console.warn('recover', e); }
  // prefetch today's Daily so "Play today's challenge" opens instantly
  try{ const spec = dailySpec(localDate()); if(!S.match) findScenario(spec); }catch(e){}
}, 600));
})();
