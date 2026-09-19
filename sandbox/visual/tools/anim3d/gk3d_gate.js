// SKELETAL_3D vs SPRITE simulation-neutrality gate. Runs the chosen scenarios with the given presentation backend drawn
// EVERY tick (worst case for side effects) and records the per-tick SIMULATION trace: keeper root, velocity, hand, leg tip,
// ball position AND velocity, held flag, gk phase/state, commit (action, t0, target), contact (tick, volume, outcome, point).
//   node gk3d_gate.js --backend sprite|3d --scenarios 42 (or all) --ticks 160 --out <json>
// Compare with gk3d_gate_compare.py: identical hashes = identical simulation; only presentation differed.
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), crypto = require("crypto");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const BACKEND = opt("--backend", "3d"), SC = opt("--scenarios", "42"), TICKS = +opt("--ticks", 160), OUT = opt("--out", "gate3d.json"), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-gate3d-" + BACKEND), args: ["--no-sandbox"] /* default GPU path (ANGLE Metal on macOS): SwiftShader made the first GL frame take ~6 s and ticks ~15 ms */ });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "?gkBackend=" + (BACKEND === "3d" ? "3d" : "sprite") + "&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  const res = await p.evaluate((TICKS, BACKEND, SC) => {
    if (!(S.pt && S.pt.on)) ptEnter(); S.pb.playing = false;
    GK_PRESENTATION.set(BACKEND === "3d" ? "SKELETAL_3D" : "SPRITE");
    const idxs = SC === "all" ? GK_SCENARIOS.map((_, i) => i) : SC.split(",").map(Number);
    const out = {}; const r4 = v => v == null ? "-" : (Array.isArray(v) ? v.map(x => (+x).toFixed(4)).join(",") : (+v).toFixed(4));
    for (const idx of idxs) {
      ptReset(); ptGkScenario(idx); gkAnimResetView(); if (typeof gk3dReset === "function") gk3dReset(); S.pt.paused = true;
      const lines = []; let commitTick = null, contactTick = null;
      for (let k = 0; k < TICKS; k++) {
        ptStep(); gkPresentationDraw(S.pt, S.pt.gk, 1 / 60);        // the backend draws every tick
        const g = S.pt.gk, bl = S.pt.b;
        if (g.committed && commitTick == null) commitTick = k; if (g.contact && contactTick == null) contactTick = k;
        lines.push([k, S.pt.now.toFixed(4), r4([g.x, g.y]), r4([g.vx, g.vy]), r4(g.handNow), r4(g.legTipNow), r4([bl.x, bl.y, bl.z]), r4([bl.vx, bl.vy, bl.vz]), bl.held || "-", g.state, g.phase || "-",
          g.committed ? g.committed.action + "/" + g.committed.t0.toFixed(4) + "/" + r4(g.committed.target) + "/" + g.committed.commitTick : "-",
          g.contact ? g.contact.tickT + "/" + g.contact.volume + "/" + g.contact.outcome + "/" + r4(g.contact.point) : "-"].join("|"));
      }
      out[idx] = { name: GK_SCENARIOS[idx].name, trace: lines.join("\n"), commitTick, contactTick, last: lines[lines.length - 1] };
    }
    const perf = GK_PRESENTATION.backend === "SKELETAL_3D" ? GK3D.perf : S.gkAnim.perf;
    return { out, perf: { n: perf.n, avgMs: perf.n ? perf.ms / perf.n : 0, maxMs: perf.max, draws: perf.glDraws || null, target: perf.target || null }, backend: GK_PRESENTATION.backend };
  }, TICKS, BACKEND, SC);
  const summary = {}; for (const [k, v] of Object.entries(res.out)) summary[k] = { name: v.name, hash: crypto.createHash("sha256").update(v.trace).digest("hex").slice(0, 16), commitTick: v.commitTick, contactTick: v.contactTick, last: v.last, trace: v.trace };
  fs.writeFileSync(OUT, JSON.stringify({ url: URL, backend: res.backend, ticks: TICKS, perf: res.perf, scenarios: summary, errors: errs }, null, 1));
  console.log("gate3d", res.backend, "scenarios", Object.keys(summary).length, "errors", errs.length, "perf", JSON.stringify(res.perf)); for (const [k, v] of Object.entries(summary)) console.log(" ", k, v.hash, "commit", v.commitTick, "contact", v.contactTick, v.name); await b.close();
})();
