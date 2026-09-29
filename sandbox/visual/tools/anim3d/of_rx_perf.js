// TACKLED-PLAYER V1 — performance: per-part cost of defending + reactions at 2 / 6 / 22 players (headless Chrome, 60 Hz ticks).
//   node of_rx_perf.js [--ticks 3600] [--drills D7,D9,D22] [--out perf.json]
// Parts: contact detection (ptRxDetect), balance + reaction planning (ptRxResolve), bodies on the pitch (ptRxOccupancy), the V1 disc
// occupancy (ptDefOccupancy), the reaction skeleton solve incl. its ground measurement (ofRxApply), and the whole tick (sim / sim + rigs).
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const TICKS = +opt("--ticks", 3600), DRILLS = opt("--drills", "D7,D9,D22").split(",");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-rxperf"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html") + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} }
    window.__T = { rx: 0, rxN: 0, occ: 0, def: 0 };
    const w = (name, key) => { const f = window[name]; window[name] = function () { const t0 = performance.now(); const r = f.apply(this, arguments); window.__T[key] += performance.now() - t0; if (key === "rx") window.__T.rxN++; return r; }; };
    w("ofRxApply", "rx"); w("ptDefOccupancy", "occ"); w("ofDefApply", "def"); });
  const out = {};
  for (const D of DRILLS) for (const anim of [false, true]) {
    const r = await p.evaluate(async (D, anim, TICKS) => {
      ofSquadStart(D); for (let i = 0; i < 40; i++) await new Promise(r => setTimeout(r, 25));        // let the real characters load
      const Q = S.pt.squad; Q.humanAi = true; OFPLAY.animOff = !anim;
      Object.assign(PT_RX_PERF, { detect: 0, detectN: 0, resolve: 0, resolveN: 0, occ: 0, ticks: 0 }); Object.assign(window.__T, { rx: 0, rxN: 0, occ: 0, def: 0 });
      const t0 = performance.now(); let mx = 0;
      for (let k = 0; k < TICKS; k++) { const q = performance.now(); ptStep(); mx = Math.max(mx, performance.now() - q); }
      const tot = performance.now() - t0, n = Q.ctx.length, ev = Q.events;
      return { players: n, anim, ms: tot / TICKS, max: mx, detect: PT_RX_PERF.detect / TICKS, detectCalls: PT_RX_PERF.detectN, resolve: PT_RX_PERF.resolve / TICKS, resolveCalls: PT_RX_PERF.resolveN,
        occLying: PT_RX_PERF.occ / TICKS, occDisc: window.__T.occ / TICKS, rxSolve: window.__T.rx / TICKS, rxSolveCalls: window.__T.rxN, defSolve: window.__T.def / TICKS, contacts: ev.filter(e => e.kind === "PLAYER_CONTACT").length };
    }, D, anim, TICKS);
    out[D + (anim ? "_anim" : "_sim")] = r;
    console.log(D.padEnd(4), anim ? "sim+rigs" : "sim only", `players ${r.players}  tick ${r.ms.toFixed(3)} ms (max ${r.max.toFixed(2)})  detect ${(r.detect * 1000).toFixed(1)} µs/tick (${r.detectCalls} tests)  resolve ${(r.resolve * 1000).toFixed(1)} µs/tick (${r.resolveCalls})  lying-occupancy ${(r.occLying * 1000).toFixed(1)} µs  disc-occupancy ${(r.occDisc * 1000).toFixed(1)} µs  reaction solve ${(r.rxSolve * 1000).toFixed(1)} µs/tick (${r.rxSolveCalls} actor-ticks)  contacts ${r.contacts}`);
  }
  fs.writeFileSync(opt("--out", "rx_perf.json"), JSON.stringify({ out, errors: errs }));
  console.log("errors", errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
