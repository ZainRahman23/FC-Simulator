// LC-1 official exporter (LC1_PREREG.md §5): pres_diag_export.cjs (moving-handoff investigation, itself air_export_v13.cjs + presentation diagnostics) with
// (1) --set rx | def | speed: the 20 rx fixtures (of_react_scenarios.js, unchanged), the 6 defending slide fixtures (of_def_scenarios.js sl_*, with
//     their per-tick keys and stand / slide / standWhen / slideWhen commands exactly as air_export_v13_def.cjs applies them), or the §5.1 speed fixtures
//     (rxCase({ v, ang: 90, ph: 0, off: 30 }): a scripted straight run, the tackler 30 m off the line, never interacting);
// (2) --cont on | off: OF_CONT.on in-page before the runs (presentation only; recorded);
// (3) each presentation frame also records the LC-1 layer state (pose._pelvis offset, per-foot layer mode / contact / slip / ground-reference
//     lift / clearance lift / anchor). Nothing in the page source is edited.
// MOVING-HANDOFF INVESTIGATION item 6 (read-only diagnostic export): air_export_v13.cjs UNCHANGED except (1) each presentation frame also records the
// presentation's own per-tick diagnostics (pose pelvis offset / flight flag / stance phases from a.pose, ac.sol.diag pelvisDrop / ground / legFloor /
// feet / jump / jerk, ac.loco.diag) and the rig leg length; (2) --gait '<json>' assigns PRESENTATION-ONLY OF_GAIT values in-page before the runs
// (OF_GAIT is read only by anim3d, never by match.js / pt_*.js; the gameplay hash is recorded to verify). Nothing in the page source is edited.
// PI-1 AIR exporter for SLIDE CONTACT V1.3 (CHARCOLLIDE-1; TRACKB_PREREG.md §2 / §4) — derived from air_export_v12.cjs (unchanged) with three changes:
// (1) surface distances use the simulation's own tapered radius ptRxSegR(seg, t); (2) recorded runner segments carry ra / rb; (3) --noprofile removes
// the CHARCOLLIDE profiles in-page (the §2.9 synthetic legacy run, which must reproduce the e2c98ec hashes). Original V1.2 header follows.
// PI-1 AIR exporter for SLIDE CONTACT V1.2 (e2c98ec) — PI1_COMPAT_GATE.md §1 (ab9a626); derived from air_export.cjs (f5f6076 record, unchanged).
// Adds per contact sub-step: every tackler primitive (V1.2: LEG, THIGH, TUCK, TUCKSHIN, BODY, TRUNK), the simulation's runner segments (ptRxBody with the V1.2
// foot length exactly as ptRxDetect selects it), the slide's contact history (def.manifold) and the full slide state. Original header follows.
// READ-ONLY with respect to the football
// simulation: drives the unchanged f5f6076 page (served from a detached worktree) the way tools/anim3d/of_rp_probe.js does — page paused, characters
// preloaded, per tick: commands → ptStep() → updateRig / draw — and records, per tick: the authoritative state (ball, every player's x, y, vx, vy,
// facing, gaitPhase; the runner's reaction state; the tackler's tackle state), the predictor d_pred (simulation's own pure geometry functions on the
// CURRENT state, dt ∈ [0, 0.10] s), the current-tick sub-step surface distance d_now, the tackler's primitives, and (presentation modes) the runner
// actor's 23 rig-bone world matrices + foot-contact flags + its per-tick ofActorTick time.
// Modes: OFFNP (presentation off, no predictor calls), OFF (presentation off), FULL (ordinary presentation), LOCO (FULL with ofRxLink not called).
//   node air_export.cjs --wt <f5f6076 worktree> --url http://127.0.0.1:8191/sandbox/visual/match.html --out <dir> [--select-miss] [--cases a,b] [--modes ...]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), zlib = require("zlib"), crypto = require("crypto");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; }, flag = (k) => a.indexOf(k) > 0;
const WT = opt("--wt"), URL = opt("--url", "http://127.0.0.1:8191/sandbox/visual/match.html"), OUT = opt("--out", "air");
const SET = opt("--set", "rx"), CONT = opt("--cont", "on") === "on";
const RX = require(path.join(WT, "sandbox/visual/tools/anim3d/of_react_scenarios.js")), DEF = require(path.join(WT, "sandbox/visual/tools/anim3d/of_def_scenarios.js"));
const SPEEDS = opt("--speeds", "1.45,2.2,3,4.2,5.5,6.5,7.5,8.2").split(",").map(Number);
const CASES = SET === "rx" ? Object.fromEntries(Object.entries(RX.SCEN).map(([k, v]) => [k, v.K])) : SET === "def" ? Object.fromEntries(Object.entries(DEF.SCEN).filter(([k]) => /^sl_/.test(k)))
  : Object.fromEntries(SPEEDS.map(v => ["lc_v" + v, { v, ang: 90, ph: 0, off: 30 }]));
const mkCase = (P) => SET === "def" ? Object.assign({}, P, { __keys: Array.from({ length: P.ticks }, (_, k) => DEF.keysAt(P, k)) }) : Object.assign(RX.rxCase(P), { __keys: null });
const MODES = opt("--modes", "OFFNP,OFF,FULL,LOCO").split(",");
const fnv = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", path.join(OUT, "..", "chrome-air")), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); await p.setViewport({ width: 1200, height: 800 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate((G, C) => { window.__GAIT = G; window.__CONT = C; }, JSON.parse(opt("--gait", "null")), CONT);
  await p.evaluate(async (NOPROF) => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} }
    window.__ofRxLink = ofRxLink; window.__ofActorTick = ofActorTick;
    window.__noProfile = NOPROF; if (NOPROF && typeof PT_CHARCOLLIDE !== "undefined") PT_CHARCOLLIDE.profiles = {}; if (window.__GAIT) Object.assign(OF_GAIT, window.__GAIT); window.__OFGAIT = JSON.parse(JSON.stringify(OF_GAIT)); if (typeof OF_CONT !== "undefined") OF_CONT.on = !!window.__CONT; window.__OFCONT = typeof OF_CONT !== "undefined" ? JSON.parse(JSON.stringify(OF_CONT)) : null;
    ofActorTick = function (ac, dt, now) { const t0 = performance.now(); window.__ofActorTick(ac, dt, now); ac.__cpu = performance.now() - t0; }; }, flag("--noprofile"));
  // one run of a case in one mode → { rows, hash, events, pres, ... } (all computed in-page from the page's own state)
  const run = async (K, mode, wantPres) => p.evaluate((S0, mode, wantPres) => { const TICKS = S0.ticks; window.__watch = [];
    const D = JSON.parse(JSON.stringify(S0.drill)); ofSquadStart("probe", D);
    for (let i = 0; i < D.players.length; i++) { const id = D.players[i].char, e = id && OF_CHAR.get(id);
      if (e && e.status === "ready") { const c = S.pt.squad.ctx[i]; const ac = ofPlayMakeActor(e.skel, c.p); ac.char = e; ac.team = c.team; ac.palette = c.team ? OFPLAY_KIT_B : SKEL_PARTS; OFSQ.actors[i] = ac; } }
    OFPLAY.actor = OFSQ.actors[S.pt.squad.active]; OFPLAY.animOff = mode === "OFF" || mode === "OFFNP"; ofRxLink = mode === "LOCO" ? null : window.__ofRxLink;
    const r8 = (x) => Math.round(x * 1e8) / 1e8, rows = [], pred = [], dnow = [], prims = [], simBody = [], react = [], def = [], pres = [], cpu = [];
    const fl = (c) => (c.def && c.def.kind === "SLIDE" && c.def.rule === "far" ? PT_REACT.footLenV12 : null);   // exactly ptRxDetect's choice
    const surf = (c, a, dt) => { const pr = ptRxTacklerPrims(c, dt); if (!pr.length) return Infinity; const Bd = ptRxBody(a, dt, fl(c)), sg = ptRxSegments(Bd); let m = Infinity;
      for (const x of pr) for (const s of sg) { const cc = ptRxSegSeg3(x.a, x.b, s.a, s.b); m = Math.min(m, cc.d - x.r - (typeof ptRxSegR === "function" ? ptRxSegR(s, cc.t) : s.r)); } return m; };
    const ac0 = OFSQ.actors[0], skel = ac0.skel, bind = skelFK(skel, {}, M4.ident()).world.map(m => Array.from(m).map(r8));
    for (let k = 0; k < TICKS; k++) {
      const t = S.pt, cmd = (S0.cmds || []).filter(c => c.at === k); t.keys = Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, (S0.__keys && S0.__keys[k]) || {});
      for (const c of cmd) { if (c.do === "humanAi") t.squad.humanAi = true; else if (c.do === "stand") ptDefStand(t, t.squad.active); else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : null); }
      for (const c of window.__watch) if (!c.fired && k >= c.at) { const me = t.squad.ctx[t.squad.active].p, dB = Math.hypot(t.b.x - me.x, t.b.y - me.y);
        if (dB <= c.d) { c.fired = k; if (c.do === "standWhen") ptDefStand(t, t.squad.active); else ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : ptDefSlideAim(t, t.squad.ctx[t.squad.active])); } }
      for (const c of cmd) if (c.do === "standWhen" || c.do === "slideWhen") window.__watch.push(Object.assign({}, c));
      ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
      const Q = t.squad, bb = t.b, A = Q.ctx[0], Dc = Q.ctx[1];
      rows.push([k, bb.x, bb.y, bb.z, bb.vx, bb.vy, bb.owner == null ? -1 : bb.owner, Q.active].concat(...Q.ctx.map(c => [c.p.x, c.p.y, c.p.vx, c.p.vy, c.p.facing, c.p.gaitPhase])));
      react.push(A.react ? JSON.parse(JSON.stringify(A.react)) : null); def.push(Dc.def ? JSON.parse(JSON.stringify({ kind: Dc.def.kind, dir: Dc.def.dir, foot: Dc.def.foot, tuck: Dc.def.tuck, tech: Dc.def.tech, th1: Dc.def.th1, rule: Dc.def.rule, launchT: Dc.def.launchT, launchAt: Dc.def.launchAt, vNow: Dc.def.vNow, stopAt: Dc.def.stopAt, contact: Dc.def.contact || null, manifold: Dc.def.manifold || null })) : null);
      if (mode !== "OFFNP") { let dp = Infinity; for (let n = 0; n <= 24; n++) dp = Math.min(dp, surf(Dc, A, n / 240)); pred.push(dp === Infinity ? null : dp);
        let dn = Infinity; for (let n = 1; n <= 4; n++) dn = Math.min(dn, surf(Dc, A, -PT_DT * (1 - n / 4))); dnow.push(dn === Infinity ? null : dn);
        prims.push([1, 2, 3, 4].map(n => { const dt = -PT_DT * (1 - n / 4); return ptRxTacklerPrims(Dc, dt).map(x => ({ prim: x.prim, a: x.a.slice(), b: x.b.slice(), r: x.r, v: x.v ? x.v.slice() : null })); }));
        simBody.push([1, 2, 3, 4].map(n => { const dt = -PT_DT * (1 - n / 4), Bd = ptRxBody(A, dt, fl(Dc)); return { phase: Bd.phase, legs: { L: { planted: Bd.legs.L.planted, up: Bd.legs.L.up }, R: { planted: Bd.legs.R.planted, up: Bd.legs.R.up } }, segs: ptRxSegments(Bd).map(g => ({ name: g.name, seg: g.seg, sd: g.sd || null, a: g.a.slice(), b: g.b.slice(), r: g.r, ra: g.ra != null ? g.ra : null, rb: g.rb != null ? g.rb : null, planted: g.planted })) }; })); }
      if (wantPres) { const ac = OFSQ.actors[0], fk = ac.sol.fk, d = ac.sol.diag || { feet: {} };
        const pz = ac.pose || {}, lgs = pz._legs || {}, ld = (ac.loco && ac.loco.diag) || {};
        pres.push({ world: fk.world.map(m => Array.from(m).map(r8)), feet: ["L", "R"].map(sd => { const f = d.feet[sd] || {}; return { contact: !!f.contact, mode: f.mode || null }; }),
          dg: { pelvisOff: pz._pelvis ? r8(pz._pelvis[1]) : null, flight: !!pz._flight, legs: { R: lgs.R ? { st: lgs.R.st, s: r8(lgs.R.s), w: r8(lgs.R.w) } : null, L: lgs.L ? { st: lgs.L.st, s: r8(lgs.L.s), w: r8(lgs.L.w) } : null },
            drop: d.pelvisDrop || 0, ground: d.ground || 0, legFloor: d.legFloor || null, jump: d.jump, jumpBone: d.jumpBone, jerk: d.jerk, jerkBone: d.jerkBone,
            feet: Object.fromEntries(["L", "R"].map(sd => { const f = d.feet[sd] || {}; return [sd, { mode: f.mode || null, contact: !!f.contact, w: f.w != null ? f.w : null, slide: f.slide != null ? f.slide : null, residual: f.residual != null ? f.residual : null, overReach: f.overReach != null ? f.overReach : null, soleY: f.soleY != null ? f.soleY : null }]; })),
            loco: { t: ld.t, gait: ld.gait, phase: ld.phase, cadence: ld.cadence, step: ld.step } },
          lc: { pel: pz._pelvis ? pz._pelvis.map(r8) : null, feet: Object.fromEntries(["L", "R"].map(sd => { const f = d.feet[sd] || {}; return [sd, { cont: !!f.cont, mode: f.mode || null, contact: !!f.contact, slide: f.slide != null ? f.slide : null, gLift: f.gLift != null ? f.gLift : null, lift: f.lift != null ? f.lift : null, P: f.P ? f.P.map(r8) : null, gRef: f.gRef ? f.gRef.map(r8) : null }]; })) } });
        cpu.push(OFSQ.actors.map(x => x.__cpu != null ? x.__cpu : null)); for (const x of OFSQ.actors) x.__cpu = null; }
    }
    ofRxLink = window.__ofRxLink; OFPLAY.animOff = false;
    return { rows, pred, dnow, prims, simBody, react, def, pres, cpu, events: JSON.parse(JSON.stringify(S.pt.squad.events)), bones: skel.bones.map(x => ({ name: x.name, parent: x.parent ? x.parent.name : null })), bind,
      rigLegLen: OFSQ.actors[0].skel.legLen, ofGait: window.__OFGAIT, ofCont: window.__OFCONT, chars: OFSQ.actors.map(x => (x.char ? x.char.id : "generic")), mass: S.pt.squad.ctx.map(c => c.massKg || null), legLen: S.pt.squad.ctx.map(c => c.p.legLen || null), LEG_REF: PT.LEG_REF, slide: PT_DEF.slide, react0: PT_REACT };
  }, K, mode, wantPres);
  const hashOf = (r) => fnv(JSON.stringify(r.rows) + "|" + JSON.stringify(r.events));
  const contactOf = (r) => r.events.find(e => e.kind === "PLAYER_CONTACT") || null, contactsOf = (r) => r.events.filter(e => e.kind === "PLAYER_CONTACT").map(c => ({ tick: c.tick, sub: c.sub, prim: c.prim, seg: c.seg, segPlanted: c.segPlanted, react: c.react || c.cls, J: c.J, family: c.family || null, tag: c.tag || c.kind2 || null }));
  const minNow = (r) => r.dnow.filter(x => x != null).reduce((m, x) => Math.min(m, x), Infinity);
  // near-miss selection (§2): smallest |off| on a 0.01 m grid, positive first, no contact and min surface distance in [0.10, 0.20] m
  let miss = null;
  // the frozen rule has no range limit; the f5f6076 exporter capped the search at 1.00 m (found at 0.91); V1.2 needs a longer search (cap 2.00 m)
  if (flag("--select-miss")) { const tried = [];
    for (let n = 1; n <= 200 && !miss; n++) for (const sg of [1, -1]) { const off = +(sg * n * 0.01).toFixed(2), K = rxCase({ v: 3, ang: 90, ph: 0.0, off }), r = await run(K, "OFF", false), c = contactOf(r), m = minNow(r);
      tried.push({ off, contact: c ? c.seg + "→" + (c.react || c.cls) : null, minSurfM: +m.toFixed(4) }); if (!c && m >= 0.10 && m <= 0.20) { miss = { off, minSurfM: m }; break; } }
    fs.writeFileSync(path.join(OUT, "rx_miss_selection.json"), JSON.stringify({ rule: "PI1_PREREGISTRATION.md §2: smallest |off| (0.01 m grid, positive first) with no PLAYER_CONTACT and min surface distance in [0.10, 0.20] m", selected: miss, tried }, null, 1));
    console.log("rx_miss selected", JSON.stringify(miss)); if (!miss) throw new Error("no rx_miss offset satisfies the rule"); }
  else if (fs.existsSync(path.join(OUT, "rx_miss_selection.json"))) miss = JSON.parse(fs.readFileSync(path.join(OUT, "rx_miss_selection.json"))).selected;
  const all = { ...(SET === "rx" && miss ? { rx_miss: { v: 3, ang: 90, ph: 0.0, off: miss.off } } : {}), ...CASES }, names = opt("--cases", Object.keys(all).join(",")).split(",");
  const summary = {};
  for (const name of names) { const K = mkCase(all[name]); summary[name] = { params: SET === "def" ? { def: name } : all[name] };
    for (const mode of MODES) { const r = await run(K, mode, mode === "FULL" || mode === "LOCO"), h = hashOf(r), c = contactOf(r);
      const rec = { schema: "pi1.air/3-v13+presdiag+lc1", set: SET, cont: CONT, case: name, mode, params: summary[name].params, scenario: { ticks: K.ticks, cmds: K.cmds, keys: K.keys || null, drill: K.drill }, gameplayHash: h, baseline: opt("--baseline", "v1.3"), charcollide: !flag("--noprofile"), ...r };
      const file = path.join(OUT, `${name}_${mode}.json.gz`); fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(rec)));
      summary[name][mode] = { gameplayHash: h, contact: c ? { tick: c.tick, seg: c.seg, segPlanted: c.segPlanted, react: c.react || c.cls, J: c.J, family: c.family || null } : null, contacts: contactsOf(r),
        firstPredTick: r.pred.length ? r.pred.findIndex(x => x != null && x <= 0.25) : null, minSurfM: r.dnow.length ? +minNow(r).toFixed(4) : null, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16) };
      console.log(name.padEnd(18), mode.padEnd(5), h, JSON.stringify(summary[name][mode].contacts), "pred@", summary[name][mode].firstPredTick, "minSurf", summary[name][mode].minSurfM); } }
  fs.writeFileSync(path.join(OUT, "air_summary" + (opt("--tag", "") ? "_" + opt("--tag") : "") + ".json"), JSON.stringify({ summary, errors: errs }, null, 1));
  console.log("page errors", errs.length, errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
