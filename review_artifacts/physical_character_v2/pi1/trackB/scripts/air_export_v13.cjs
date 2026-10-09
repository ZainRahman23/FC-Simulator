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
const { rxCase } = require(path.join(WT, "sandbox/visual/tools/anim3d/of_react_scenarios.js"));
const { SCEN } = require(path.join(WT, "sandbox/visual/tools/anim3d/of_react_scenarios.js"));
const CASES = Object.fromEntries(Object.entries(SCEN).map(([k, v]) => [k, v.K]));   // every rx fixture, unchanged definitions
const MODES = opt("--modes", "OFFNP,OFF,FULL,LOCO").split(","), TICKS = 260;
const fnv = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", path.join(OUT, "..", "chrome-air")), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); await p.setViewport({ width: 1200, height: 800 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async (NOPROF) => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} }
    window.__ofRxLink = ofRxLink; window.__ofActorTick = ofActorTick;
    window.__noProfile = NOPROF; if (NOPROF && typeof PT_CHARCOLLIDE !== "undefined") PT_CHARCOLLIDE.profiles = {};
    ofActorTick = function (ac, dt, now) { const t0 = performance.now(); window.__ofActorTick(ac, dt, now); ac.__cpu = performance.now() - t0; }; }, flag("--noprofile"));
  // one run of a case in one mode → { rows, hash, events, pres, ... } (all computed in-page from the page's own state)
  const run = async (K, mode, wantPres) => p.evaluate((S0, mode, wantPres, TICKS) => {
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
      const t = S.pt; t.keys = { up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false };
      for (const c of (S0.cmds || []).filter(c => c.at === k)) { if (c.do === "humanAi") t.squad.humanAi = true; else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : null); }
      ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
      const Q = t.squad, bb = t.b, A = Q.ctx[0], Dc = Q.ctx[1];
      rows.push([k, bb.x, bb.y, bb.z, bb.vx, bb.vy, bb.owner == null ? -1 : bb.owner, Q.active].concat(...Q.ctx.map(c => [c.p.x, c.p.y, c.p.vx, c.p.vy, c.p.facing, c.p.gaitPhase])));
      react.push(A.react ? JSON.parse(JSON.stringify(A.react)) : null); def.push(Dc.def ? JSON.parse(JSON.stringify({ kind: Dc.def.kind, dir: Dc.def.dir, foot: Dc.def.foot, tuck: Dc.def.tuck, tech: Dc.def.tech, th1: Dc.def.th1, rule: Dc.def.rule, launchT: Dc.def.launchT, launchAt: Dc.def.launchAt, vNow: Dc.def.vNow, stopAt: Dc.def.stopAt, contact: Dc.def.contact || null, manifold: Dc.def.manifold || null })) : null);
      if (mode !== "OFFNP") { let dp = Infinity; for (let n = 0; n <= 24; n++) dp = Math.min(dp, surf(Dc, A, n / 240)); pred.push(dp === Infinity ? null : dp);
        let dn = Infinity; for (let n = 1; n <= 4; n++) dn = Math.min(dn, surf(Dc, A, -PT_DT * (1 - n / 4))); dnow.push(dn === Infinity ? null : dn);
        prims.push([1, 2, 3, 4].map(n => { const dt = -PT_DT * (1 - n / 4); return ptRxTacklerPrims(Dc, dt).map(x => ({ prim: x.prim, a: x.a.slice(), b: x.b.slice(), r: x.r, v: x.v ? x.v.slice() : null })); }));
        simBody.push([1, 2, 3, 4].map(n => { const dt = -PT_DT * (1 - n / 4), Bd = ptRxBody(A, dt, fl(Dc)); return { phase: Bd.phase, legs: { L: { planted: Bd.legs.L.planted, up: Bd.legs.L.up }, R: { planted: Bd.legs.R.planted, up: Bd.legs.R.up } }, segs: ptRxSegments(Bd).map(g => ({ name: g.name, seg: g.seg, sd: g.sd || null, a: g.a.slice(), b: g.b.slice(), r: g.r, ra: g.ra != null ? g.ra : null, rb: g.rb != null ? g.rb : null, planted: g.planted })) }; })); }
      if (wantPres) { const ac = OFSQ.actors[0], fk = ac.sol.fk, d = ac.sol.diag || { feet: {} };
        pres.push({ world: fk.world.map(m => Array.from(m).map(r8)), feet: ["L", "R"].map(sd => { const f = d.feet[sd] || {}; return { contact: !!f.contact, mode: f.mode || null }; }) });
        cpu.push(OFSQ.actors.map(x => x.__cpu != null ? x.__cpu : null)); for (const x of OFSQ.actors) x.__cpu = null; }
    }
    ofRxLink = window.__ofRxLink; OFPLAY.animOff = false;
    return { rows, pred, dnow, prims, simBody, react, def, pres, cpu, events: JSON.parse(JSON.stringify(S.pt.squad.events)), bones: skel.bones.map(x => ({ name: x.name, parent: x.parent ? x.parent.name : null })), bind,
      chars: OFSQ.actors.map(x => (x.char ? x.char.id : "generic")), mass: S.pt.squad.ctx.map(c => c.massKg || null), legLen: S.pt.squad.ctx.map(c => c.p.legLen || null), LEG_REF: PT.LEG_REF, slide: PT_DEF.slide, react0: PT_REACT };
  }, K, mode, wantPres, TICKS);
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
  const all = { ...(miss ? { rx_miss: { v: 3, ang: 90, ph: 0.0, off: miss.off } } : {}), ...CASES }, names = opt("--cases", Object.keys(all).join(",")).split(",");
  const summary = {};
  for (const name of names) { const K = rxCase(all[name]); summary[name] = { params: all[name] };
    for (const mode of MODES) { const r = await run(K, mode, mode === "FULL" || mode === "LOCO"), h = hashOf(r), c = contactOf(r);
      const rec = { schema: "pi1.air/3-v13", case: name, mode, params: all[name], scenario: { ticks: TICKS, cmds: K.cmds, drill: K.drill }, gameplayHash: h, baseline: opt("--baseline", "v1.3"), charcollide: !flag("--noprofile"), ...r };
      const file = path.join(OUT, `${name}_${mode}.json.gz`); fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(rec)));
      summary[name][mode] = { gameplayHash: h, contact: c ? { tick: c.tick, seg: c.seg, segPlanted: c.segPlanted, react: c.react || c.cls, J: c.J, family: c.family || null } : null, contacts: contactsOf(r),
        firstPredTick: r.pred.length ? r.pred.findIndex(x => x != null && x <= 0.25) : null, minSurfM: r.dnow.length ? +minNow(r).toFixed(4) : null, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16) };
      console.log(name.padEnd(18), mode.padEnd(5), h, JSON.stringify(summary[name][mode].contacts), "pred@", summary[name][mode].firstPredTick, "minSurf", summary[name][mode].minSurfM); } }
  fs.writeFileSync(path.join(OUT, "air_summary" + (opt("--tag", "") ? "_" + opt("--tag") : "") + ".json"), JSON.stringify({ summary, errors: errs }, null, 1));
  console.log("page errors", errs.length, errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
