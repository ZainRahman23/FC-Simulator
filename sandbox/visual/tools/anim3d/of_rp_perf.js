// RECEIVING + PASSING V1 — PERFORMANCE on real production rigs.
// A squad of N outfield players (real characters, shared by reference) plays scripted passes for a fixed number of ticks while the page
// renders every frame (Mixed view). Reports, per tick / per frame: the whole simulation step, the reception planning share, the squad
// presentation (every player's locomotion + kick + touch + receiving solve), skinning, the GL render and the composite.
//   node of_rp_perf.js [--n 22] [--ticks 900] [--every 120] [--out perf.json]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const N = +opt("--n", 22), TICKS = +opt("--ticks", 900), EVERY = +opt("--every", 120), OUT = opt("--out", "");
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-rpperf"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  const res = await p.evaluate(async (N, TICKS, EVERY) => {
    S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} }
    const players = [];
    for (let i = 0; i < N; i++) { const team = i < Math.ceil(N / 2) ? 0 : 1, j = team ? i - Math.ceil(N / 2) : i;
      const x = 45 + (j % 4) * 8 + (team ? 3 : 0), y = 18 + Math.floor(j / 4) * 8 + (team ? 3 : 0);
      players.push({ name: (team ? "D" : "A") + (j + 1), team, x, y, facing: team ? Math.PI : 0, char: OF_CHAR.order[i % OF_CHAR.order.length], ai: { mode: team ? "SHADOW" : "SUPPORT" }, mark: team ? j % Math.ceil(N / 2) : null }); }
    ofSquadStart("perf", { label: "perf", center: [58, 30], owner: 0, active: 0, players });
    await new Promise(r => setTimeout(r, 100));
    OFPLAY.mixed = true; OFPLAY.dbg.hud = false; if (OFPLAY.panel) OFPLAY.panel.style.display = "none";
    for (const k in OFPLAY.perf) OFPLAY.perf[k] = []; OFSQ.perf.plan = []; OFSQ.perf.pres = [];
    const t = S.pt, simT = [], frameT = [];
    let passes = 0, recv = 0;
    for (let k = 0; k < TICKS; k++) {
      t.keys = {};
      if (k % EVERY === 20 && t.b.ctrl) { const Q = t.squad; let best = null, bd = 1e9; for (const c of Q.ctx) { if (c.team !== Q.ctx[Q.active].team || c.idx === Q.active) continue; const d = Math.hypot(c.p.x - t.p.x, c.p.y - t.p.y); if (d > 6 && d < bd) { bd = d; best = c.idx; } }
        if (best != null) { ptSquadPassTo(t, "SHORT", best, Q.ctx[best].p.x, Q.ctx[best].p.y); passes++; } }
      const t0 = performance.now(); ptStep(); simT.push(performance.now() - t0);
      const f0 = performance.now(); updateRig(1 / 60, null); draw(null, 1 / 60); frameT.push(performance.now() - f0);
    }
    recv = t.squad.events.filter(e => e.kind === "RECEPTION").length;
    const st = (v) => { const s = v.slice().sort((x, y) => x - y); return { mean: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(3), p95: +s[Math.floor(s.length * 0.95)].toFixed(3), max: +s[s.length - 1].toFixed(3) }; };
    return { n: N, ticks: TICKS, passes, receptions: recv, chars: OFSQ.actors.filter(a => a.char).length,
      stepTotal: st(simT), frameDraw: st(frameT), sim: st(OFPLAY.perf.sim), plan: st(OFSQ.perf.plan.length ? OFSQ.perf.plan : [0]), presentation: st(OFSQ.perf.pres),
      skin: st(OFPLAY.perf.skin), render: st(OFPLAY.perf.render), composite: st(OFPLAY.perf.comp), layer: OFPLAY.lastLayer };
  }, N, TICKS, EVERY);
  res.errors = errs; if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
