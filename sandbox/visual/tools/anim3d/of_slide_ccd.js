// SLIDE CONTACT GEOMETRY V1.2 — can a fast sliding foot and a fast ball (or a fast leg and a body) cross between ticks unseen?
// Simulation only (animation off). BALL: V1.2 slides against a loose ball crossing the slide at 0–30 m/s at several offsets / times; every tick
// the SAME within-tick kinematics the simulation uses (root and sweep angle linear over the tick, ball b → b + v·dt) are re-checked DENSELY
// (400 samples) and with V1's fixed 4 sub-steps; a tunnel = a tick whose dense check touches while the simulation (or V1's scheme) found
// nothing. BODY: the side-on and tackled-player fixtures; the sweeping leg / slider parts against the attacker's stride-clock segments
// re-checked with 64 samples per tick vs the simulation's 4.   node of_slide_ccd.js --out ccd.json [--url …]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const URL = opt("--url", "http://127.0.0.1:8150/sandbox/visual/match.html"), OUT = opt("--out", "ccd.json");
const SW = require("./of_slide_scenarios.js"), RX = require("./of_react_scenarios.js");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-ccd"), args: ["--no-sandbox"] });
  const p = await b.newPage(); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  const res = await p.evaluate((SWS, RXS) => {
    S.pt.paused = true; OFPLAY.animOff = true; const R = PT_BALL_R + PT_DEF.slide.footR12, out = { ball: [], body: [] };
    const dist = (L, qx, qy) => ptSegDist(qx, qy, L.hx, L.hy, L.ex, L.ey);
    // ── BALL: a defender sliding along +x at v; a loose ball crossing the slide line (y) at speed vb, arriving at the leg's reach around tick kx
    const LEADS = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55], OFFS = [0, 0.25, 0.5, 0.75, 1.0];
    for (const vb of [0, 5, 10, 20, 30, 40]) for (const off of OFFS) for (const lead of (vb ? LEADS : [0.3])) for (const sg of [1, -1]) {
      const y0 = 34 - sg * vb * lead, bx = 52.5 + off, D = { defending: true, center: [55, 34], owner: null, active: 0, autoSwitch: false, ball: { x: bx, y: vb ? y0 : 34 - sg * 0.6, vx: 0, vy: sg * vb },
        players: [{ name: "D", team: 1, x: 50, y: 34 + sg * 0.05, vx: 6, vy: 0, facing: 0, char: null, ai: { mode: "SCRIPT", path: [{ t: 0, x: 150, y: 34 + sg * 0.05, v: 6 }] } }, { name: "A", team: 0, x: 40, y: 20, facing: 0, char: null, ai: { mode: "HOLD" } }] };
      ofSquadStart("ccd", D); const t = S.pt; t.squad.humanAi = true; ptDefSlide(t, 0, 0);
      const d = t.squad.ctx[0].def; let simTick = null, dense = null, v1 = null, subMax = 0;
      for (let k = 0; k < 90 && !t.squad.over; k++) {
        const c = t.squad.ctx[0], bb = t.b, r0 = c.p.x, r0y = c.p.y, tau0 = t.now - d.launchAt, bx0 = bb.x, by0 = bb.y, bvx = bb.vx, bvy = bb.vy;
        ptStep(); if (d.contact && d.contact.out !== "MISS" && simTick == null) simTick = d.contact.contactTick;
        if (d.contact && d.contact.subN) subMax = Math.max(subMax, d.contact.subN);
        // re-check the tick just stepped with the simulation's own kinematics (the ball's pre-step state; the root / sweep from previous → now)
        if (t.now - PT_DT >= d.launchAt && d.rootPrev) {
          const tau1 = t.now - d.launchAt, rx1 = c.p.x, ry1 = c.p.y, pr = [r0, r0y], chk = (n) => { for (let s = 1; s <= n; s++) { const u = s / n, L = ptDefSlideLeg(d, pr[0] + (rx1 - pr[0]) * u, pr[1] + (ry1 - pr[1]) * u, tau0 + (tau1 - tau0) * u, c.p.legLen || PT.LEG_REF);
              if (dist(L, bx0 + bvx * PT_DT * u, by0 + bvy * PT_DT * u) <= R) return true; } return false; };
          if (dense == null && bb.z <= PT_DEF.slide.zMax && chk(400)) dense = t.squad.tick;
          if (v1 == null && bb.z <= PT_DEF.slide.zMax && chk(4)) v1 = t.squad.tick; }
        if (simTick != null && dense != null && v1 != null) break;
      }
      out.ball.push({ vb, off, lead, sg, dense, sim: simTick, v1, subN: subMax, simMissed: dense != null && (simTick == null || simTick > dense), v1Missed: dense != null && (v1 == null || v1 > dense) });
    }
    // ── BODY: fixtures (the attacker's stride-clock segments vs the slider's parts), dense 64 vs the simulation's 4
    const denseDetect = (ci, ai, n) => { const Q = S.pt.squad, c = Q.ctx[ci], a = Q.ctx[ai]; if (Math.hypot(c.p.x - a.p.x, c.p.y - a.p.y) > 2.6) return false;
      for (let s = 1; s <= n; s++) { const dt = -PT_DT * (1 - s / n), B = ptRxBody(a, dt, PT_REACT.footLenV12), segs = ptRxSegments(B), prims = ptRxTacklerPrims(c, dt, null);
        for (const pr of prims) for (const sg of segs) { const cc = ptRxSegSeg3(pr.a, pr.b, sg.a, sg.b); if (pr.r + sg.r - cc.d > 0) return true; } } return false; };
    for (const [name, S0] of Object.entries(Object.assign({}, SWS, RXS))) {
      const D = JSON.parse(JSON.stringify(S0.drill)); for (const q of D.players) q.char = null; ofSquadStart("ccdb", D); window.__watch = [];
      const t = S.pt, ti = D.players.findIndex(q => q.team === 1), ai = D.players.findIndex(q => q.team === 0); let simBody = null, dense = null;
      for (let k = 0; k < (S0.ticks || 200); k++) {
        const keys = Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, (S0.keys || []).reduce((m, r) => k >= r.from && k < r.to ? Object.assign({}, r.keys) : m, {}));
        t.keys = keys; for (const c of (S0.cmds || []).filter(c => c.at === k)) { if (c.do === "humanAi") t.squad.humanAi = true; else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : null); else if (c.do === "slideWhen") window.__watch.push(Object.assign({}, c)); }
        for (const c of window.__watch) if (!c.fired) { const me = t.squad.ctx[t.squad.active].p; if (Math.hypot(t.b.x - me.x, t.b.y - me.y) <= c.d) { c.fired = k; ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : ptDefSlideAim(t, t.squad.ctx[t.squad.active])); } }
        ptStep(); const Q = t.squad, d = Q.ctx[ti].def;
        if (simBody == null) { const e = Q.events.find(e => e.kind === "TACKLE_BODY_CONTACT"); if (e) simBody = e.tick; }
        if (dense == null && d && d.kind === "SLIDE" && d.rule === "far" && t.now >= d.launchAt && (d.vNow > 0 || d.stopAt === t.now) && !(Q.ctx[ai].react && Q.ctx[ai].react.kind === "FALL")) {
          d.launchT = t.now - d.launchAt; if (denseDetect(ti, ai, 64)) dense = Q.tick; }
        if (simBody != null && dense != null) break; }
      out.body.push({ name, dense, sim: simBody, missed: dense != null && (simBody == null || simBody > dense) });
    }
    return out;
  }, SW.SCEN, RX.SCEN);
  const bm = res.ball.filter(r => r.simMissed), v1m = res.ball.filter(r => r.v1Missed), bodyM = res.body.filter(r => r.missed);
  console.log(`BALL: ${res.ball.length} crossings (ball 0–40 m/s), dense contact in ${res.ball.filter(r => r.dense != null).length}; V1.2 adaptive sub-steps missed ${bm.length}; V1's fixed 4 would have missed ${v1m.length}; max sub-steps used ${Math.max(...res.ball.map(r => r.subN))}`);
  console.log(`BODY: ${res.body.length} fixtures; dense-64 first contact vs the simulation's 4 sub-steps: missed ${bodyM.length}`, bodyM.map(r => r.name + " dense@" + r.dense + " sim@" + r.sim).join(", "));
  fs.writeFileSync(OUT, JSON.stringify(Object.assign(res, { errors: errs })));
  console.log("page errors", errs.length, errs.slice(0, 2));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
