// TACKLED-PLAYER V1 — deterministic contact matrix (simulation only, animation off). A runner (no ball) crosses the pitch at a set speed and
// stride phase; a defender running on a set line launches a slide timed to reach him; the geometry is swept (approach angle, lateral
// offset = square … glancing, stride phase at contact, runner speed, tackler speed). Every first contact's record and the reaction the
// model derives are dumped. Nothing is scripted about the outcome: only where and when two players are.
//   node of_react_matrix.js --out matrix.json [--speeds 0,1.5,3,5.5,7.5] [--angles 90,-90,135,45,0,180] [--phases 0,0.1,...] [--offsets 0,0.15,0.3]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const L = (k, d) => opt(k, d).split(",").map(Number);
const SPEEDS = L("--speeds", "0,1.5,3,5.5,7.5"), ANGLES = L("--angles", "90,-90,135,-135,45,0,180"), PHASES = L("--phases", "0,0.125,0.25,0.375,0.5,0.625,0.75,0.875"), OFFS = L("--offsets", "0,0.2,0.4");
const TSPEED = L("--tspeeds", "5"), MASS = L("--mass", "75");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-rxmatrix"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html") + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  const cases = []; for (const v of SPEEDS) for (const ang of ANGLES) for (const ph of PHASES) for (const off of OFFS) for (const u of TSPEED) for (const m of MASS) cases.push({ v, ang, ph, off, u, m });
  const res = await p.evaluate((cases) => {
    S.pt.paused = true; OFPLAY.animOff = true; const out = [];
    for (const K of cases) {
      const Tc = 0.95, tReq = 0.5, dirA = 0, th = K.ang * Math.PI / 180, fx = Math.cos(th), fy = Math.sin(th);   // the slide's direction in the pitch
      // where the runner's legs will be at the planned contact moment, the defender's line, his start
      const Ax = 50, Ay = 34, AT = [Ax + K.v * Tc, Ay], leg = PT.LEG_REF, v0 = Math.max(PT_DEF.slide.vMin, Math.min(PT_DEF.slide.vMax, K.u + PT_DEF.slide.vAdd));
      const tau = Tc - tReq - PT_DEF.slide.windT, sTau = v0 * tau - 0.5 * PT_DEF.slide.decel * tau * tau, reachC = 0.8 * leg;
      const Preq = [AT[0] - fx * (reachC + sTau + K.u * PT_DEF.slide.windT) - fy * K.off, AT[1] - fy * (reachC + sTau + K.u * PT_DEF.slide.windT) + fx * K.off];
      const P0 = [Preq[0] - fx * K.u * tReq, Preq[1] - fy * K.u * tReq];
      const spec = { defending: true, center: [60, 34], owner: null, active: 1, autoSwitch: false, ball: { x: 20, y: 5 },
        players: [{ name: "A", team: 0, x: Ax, y: Ay, vx: K.v, vy: 0, facing: dirA, gaitPhase: ((K.ph - (K.v > 0.2 ? 0 : 0)) % 1 + 1) % 1, massKg: K.m, ai: { mode: "SCRIPT", path: [{ t: 0, x: 200, y: Ay, v: K.v }] } },
                  { name: "D", team: 1, x: P0[0], y: P0[1], vx: fx * K.u, vy: fy * K.u, facing: th, massKg: 75, ai: { mode: "SCRIPT", path: [{ t: 0, x: P0[0] + fx * 100, y: P0[1] + fy * 100, v: K.u }] } }] };
      const Q = ptSquadSetup(spec); Q.spec.center = spec.center; Q.humanAi = true;
      const rows = []; let rec = null, fallInfo = null, phaseAt = null;
      for (let k = 0; k < 360; k++) {
        if (k === Math.round(tReq / PT_DT)) ptDefSlide(S.pt, 1, th);
        ptStep();
        const A = Q.ctx[0];
        if (!rec) { const e = Q.events.find(e => e.kind === "PLAYER_CONTACT"); if (e) { rec = e; } }
        { const D = Q.ctx[1]; rows.push([k, +A.p.x.toFixed(2), +A.p.y.toFixed(2), +A.p.vx.toFixed(2), A.react ? A.react.kind : "-", +D.p.x.toFixed(2), +D.p.y.toFixed(2), +D.p.vx.toFixed(2), +D.p.vy.toFixed(2), D.def ? D.def.kind + ":" + (D.def.vNow != null ? D.def.vNow.toFixed(2) : "") : "-"]); }
      }
      const A = Q.ctx[0], r = A.react;
      out.push({ K, rec, endPos: [A.p.x, A.p.y], trace: rows.filter((_, i) => i % 3 === 0 && i > 20 && i < 90), slideStop: Q.ctx[1].def ? Q.ctx[1].def.stopAt : null, ev: Q.events.filter(e => /TACKLE|PLAYER_CONTACT|LOOSE/.test(e.kind)).map(e => e.kind + ":" + (e.react || e.out || e.cls || "")) });
    }
    OFPLAY.animOff = false; return out;
  }, cases);
  fs.writeFileSync(opt("--out", "matrix.json"), JSON.stringify({ res, errors: errs }));
  const cnt = {}; for (const r of res) { const k = r.rec ? r.rec.react || r.rec.cls : "NO_CONTACT"; cnt[k] = (cnt[k] || 0) + 1; }
  console.log(res.length, "cases", JSON.stringify(cnt), "errors", errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
