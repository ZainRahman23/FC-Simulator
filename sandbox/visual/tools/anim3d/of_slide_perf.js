// SLIDE CONTACT GEOMETRY V1.2 — performance (of_rx_perf.js + the V1.2 parts): per-part cost at 2 / 6 / 22 players and on a slide-dense loop of the
// side-on demo cases (headless Chrome, 60 Hz ticks). V1.2 parts: the swept ball contact (ptDefSlideBall), the persistent contact history
// (ptRxSlideManifold, incl. its detections / resolutions), the tackled-player response (ptRxResolve), the V1.2 presentation (ofDefApply).
//   node of_slide_perf.js [--ticks 3600] [--drills D7,D9,D22,SGD] [--out perf.json]
// Parts: contact detection (ptRxDetect), balance + reaction planning (ptRxResolve), bodies on the pitch (ptRxOccupancy), the V1 disc
// occupancy (ptDefOccupancy), the reaction skeleton solve incl. its ground measurement (ofRxApply), and the whole tick (sim / sim + rigs).
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const TICKS = +opt("--ticks", 3600), DRILLS = opt("--drills", "D7,D9,D22,SGD").split(",");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-slideperf"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html") + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} }
    window.__T = { rx: 0, rxN: 0, occ: 0, def: 0, ball: 0, ballN: 0, man: 0, manN: 0 };
    const w = (name, key) => { const f = window[name]; window[name] = function () { const t0 = performance.now(); const r = f.apply(this, arguments); window.__T[key] += performance.now() - t0; if (window.__T[key + "N"] != null) window.__T[key + "N"]++; return r; }; };
    w("ofRxApply", "rx"); w("ptDefOccupancy", "occ"); w("ofDefApply", "def"); w("ptDefSlideBall", "ball"); w("ptRxSlideManifold", "man"); });
  const out = {};
  for (const D of DRILLS) for (const anim of [false, true]) {
    const r = await p.evaluate(async (D, anim, TICKS) => {
      const SGD = D === "SGD"; if (SGD) { OFSGD.on = true; OFSGD.i = 0; ofSgdStart(); } else { OFSGD.on = false; ofSquadStart(D); } for (let i = 0; i < 40; i++) await new Promise(r => setTimeout(r, 25));        // let the real characters load
      let Q = S.pt.squad; if (!SGD) Q.humanAi = true; OFPLAY.animOff = !anim;
      Object.assign(PT_RX_PERF, { detect: 0, detectN: 0, resolve: 0, resolveN: 0, occ: 0, ticks: 0 }); Object.assign(window.__T, { rx: 0, rxN: 0, occ: 0, def: 0, ball: 0, ballN: 0, man: 0, manN: 0 }); let contacts = 0, slides = 0;
      const t0 = performance.now(); let mx = 0;
      for (let k = 0; k < TICKS; k++) { const q = performance.now(); if (SGD) { const Q0 = S.pt.squad; ofSgdPre(); if (S.pt.squad !== Q0) { contacts += Q0.events.filter(e => e.kind === "PLAYER_CONTACT").length; slides += Q0.events.filter(e => e.kind === "TACKLE_START").length; } } ptStep(); mx = Math.max(mx, performance.now() - q); }
      if (SGD) { OFSGD.on = false; } Q = S.pt.squad; const tot = performance.now() - t0, n = Q.ctx.length, ev = Q.events;
      return { players: n, anim, ms: tot / TICKS, max: mx, detect: PT_RX_PERF.detect / TICKS, detectCalls: PT_RX_PERF.detectN, resolve: PT_RX_PERF.resolve / TICKS, resolveCalls: PT_RX_PERF.resolveN,
        occLying: PT_RX_PERF.occ / TICKS, occDisc: window.__T.occ / TICKS, rxSolve: window.__T.rx / TICKS, rxSolveCalls: window.__T.rxN, defSolve: window.__T.def / TICKS, contacts: contacts + ev.filter(e => e.kind === "PLAYER_CONTACT").length, slides: slides + ev.filter(e => e.kind === "TACKLE_START").length,
        ball: window.__T.ball / TICKS, ballCalls: window.__T.ballN, man: window.__T.man / TICKS, manCalls: window.__T.manN };
    }, D, anim, TICKS);
    out[D + (anim ? "_anim" : "_sim")] = r;
    console.log(D.padEnd(4), anim ? "sim+rigs" : "sim only", `players ${r.players}  tick ${r.ms.toFixed(3)} ms (max ${r.max.toFixed(2)})  slides ${r.slides}  contacts ${r.contacts}  |  V1.2 swept ball contact ${(r.ball * 1000).toFixed(2)} µs/tick (${r.ballCalls} calls, ${r.ballCalls ? (r.ball * TICKS / r.ballCalls * 1000).toFixed(1) : "-"} µs/call)  contact history ${(r.man * 1000).toFixed(2)} µs/tick (${r.manCalls} calls, ${r.manCalls ? (r.man * TICKS / r.manCalls * 1000).toFixed(1) : "-"} µs/call)  |  detect ${(r.detect * 1000).toFixed(2)} µs/tick (${r.detectCalls})  response ${(r.resolve * 1000).toFixed(2)} µs/tick (${r.resolveCalls})  lying ${(r.occLying * 1000).toFixed(2)} µs  disc ${(r.occDisc * 1000).toFixed(2)} µs  slide pose ${(r.defSolve * 1000).toFixed(1)} µs  reaction pose ${(r.rxSolve * 1000).toFixed(1)} µs`);
  }
  fs.writeFileSync(opt("--out", "rx_perf.json"), JSON.stringify({ out, errors: errs }));
  console.log("errors", errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
