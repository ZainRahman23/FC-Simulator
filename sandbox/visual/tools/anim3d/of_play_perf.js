// OUTFIELD LOCOMOTION V1 — PERFORMANCE PROBE on the live harness (?ofPlay=1).
// Steps the real page at 60 Hz with N extra runners and reads the harness's own per-stage timers:
// simulation step, animation + IK solve, skinning, character render, compositing. Also checks that the
// presentation frame cap holds and that no GL target is recreated per frame (targets are grow-only).
//   node of_play_perf.js --out <json> [--runners 0,10,21] [--ticks 400]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "of_perf.json"), BALL = a.indexOf("--ball") > 0, RUNNERS = opt("--runners", "0,10,21").split(",").map(Number), TICKS = +opt("--ticks", 400);
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), CHAR = opt("--character", "");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-ofperf"), args: ["--no-sandbox", "--use-gl=angle", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage(); await p.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?ofPlay=1&fps=60&body=AVG_ATHLETIC&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 600; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  // a real character measures the REAL cost: its own skeleton drives the solve and its own geometry is what the GPU skins and draws
  if (CHAR) { const ok = await p.evaluate(async (id) => { try { await ofCharLoad(id); ofPlaySetCharacter(id); await new Promise(r => setTimeout(r, 300)); return OFPLAY.charId === id; } catch (e) { return String(e); } }, CHAR);
    if (ok !== true) { console.error("character load failed:", ok); process.exit(3); } }
  const rows = [];
  for (const n of RUNNERS) {
    await p.evaluate((n, BALL) => { S.pt.paused = true; OFPLAY.mixed = true; ofPlaySetRunners(n);
      const t = S.pt;
      if (BALL) { t.p.x = 60; t.p.y = 34; t.b.x = 61.2; t.b.y = 34; t.b.z = 0; t.b.vx = 5; t.b.vy = 0; t.b.ctrl = true; t.p.touchT = 0; }
      else { t.b.x = 3; t.b.y = 3; t.b.ctrl = false; t.b.vx = 0; t.b.vy = 0; }
      OFPLAY.perf = { sim: [], anim: [], skin: [], render: [], comp: [] }; }, n, BALL);
    // warm up, then measure
    await p.evaluate((T) => { for (let k = 0; k < 90; k++) { S.pt.keys = { right: true }; ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60); } OFPLAY.perf = { sim: [], anim: [], skin: [], render: [], comp: [] }; }, TICKS);
    const r = await p.evaluate((T) => {
      for (let k = 0; k < T; k++) { S.pt.keys = { right: true, sprint: k % 240 < 120 }; ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60); }
      const q = (v) => { if (!v.length) return { mean: 0, p95: 0 }; const s = v.slice().sort((x, y) => x - y); return { mean: +(s.reduce((a, c) => a + c, 0) / s.length).toFixed(3), p95: +s[Math.floor(s.length * .95)].toFixed(3) }; };
      const P = OFPLAY.perf, L = OFPLAY.lastLayer || {}, R = OFPLAY.R || {};
      return { rigs: 1 + OFPLAY.runners.length, touches: S.pt.touchN, carried: !!S.pt.b.ctrl, sim: q(P.sim), anim: q(P.anim), skin: q(P.skin), render: q(P.render), comp: q(P.comp),
               layer: { w: L.w, h: L.h, draws: L.draws }, roi: R.roi ? { w: R.roi.w, h: R.roi.h } : null, cap: S.fpsCap };
    }, TICKS);
    rows.push(r);
  }
  // grow-only check: the ROI target must not shrink/recreate between the passes above
  const roiFinal = await p.evaluate(() => (OFPLAY.R && OFPLAY.R.roi) ? { w: OFPLAY.R.roi.w, h: OFPLAY.R.roi.h } : null);
  fs.writeFileSync(OUT, JSON.stringify({ rows, roiFinal, errors: errs, ticks: TICKS }, null, 1));
  console.log((BALL ? "WITH a carried ball" : "no ball") + " — rigs   sim      anim+IK   skin     render    composite   (ms/frame, mean | p95)");
  for (const r of rows) { const f = (x) => `${x.mean.toFixed(2)}|${x.p95.toFixed(2)}`.padStart(9); console.log(String(r.rigs).padStart(4), f(r.sim), f(r.anim), f(r.skin), f(r.render), f(r.comp), "  layer", r.layer.w + "x" + r.layer.h, "draws", r.layer.draws, "cap", r.cap, "touches", r.touches); }
  console.log("ROI target (grow-only):", JSON.stringify(roiFinal), "errors", errs.length, errs.slice(0, 2));
  await b.close();
})();
