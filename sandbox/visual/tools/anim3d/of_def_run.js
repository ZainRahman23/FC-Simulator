// DEFENDING V1 — headless runner: drives a defending drill (optionally a scripted-INPUT defensive demo) for N ticks and dumps events.
//   node of_def_run.js [--drill D8] [--ticks 3600] [--anim off] [--demo PATTERN] [--out def.json] [--human none]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const DRILLS = opt("--drill", "D8").split(","), TICKS = +opt("--ticks", 3600), ANIMOFF = opt("--anim", "on") === "off", OUT = opt("--out", "def.json");
const DEMOS = opt("--demo", "").split(",").filter(Boolean), HUMAN = opt("--human", "ai"), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-def"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); await p.setViewport({ width: 1200, height: 800 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} } });
  await p.evaluate(() => { window.__EV = []; const _e = ptSquadEvent; ptSquadEvent = function (t, e) { _e(t, e); window.__EV.push(e); }; });
  const out = {};
  const runs = DEMOS.length ? DEMOS.map(d => ({ drill: null, demo: d })) : DRILLS.map(d => ({ drill: d, demo: null }));
  for (const R of runs) {
    const r = await p.evaluate(async (R, TICKS, ANIMOFF, HUMAN) => {
      if (R.demo) { OFDEF.on = true; OFDEF.pattern = OFDEF_PATTERNS.findIndex(x => x.id === R.demo); OFDEF.results = []; ofDefStart(); }
      else { ofSquadStart(R.drill); if (HUMAN === "ai") { const Q = S.pt.squad; Q.humanAi = true; } }
      OFPLAY.animOff = ANIMOFF; await new Promise(r => setTimeout(r, 50)); window.__EV = [];
      const trace = [], t0 = performance.now(); let tMax = 0;
      for (let k = 0; k < TICKS; k++) { const q0 = performance.now(); ptStep(); tMax = Math.max(tMax, performance.now() - q0);
        const t = S.pt; trace.push([+t.b.x.toFixed(5), +t.b.y.toFixed(5), t.b.owner == null ? -1 : t.b.owner]); }
      const Q = S.pt.squad, res = { drill: R.drill, demo: R.demo, events: window.__EV.slice(), trace, msPerTick: (performance.now() - t0) / TICKS, msMax: tMax, contacts: (typeof OFDEF !== "undefined" && OFDEF.contacts || []).slice(), demoResults: R.demo ? OFDEF.results.slice() : null };
      OFPLAY.animOff = false; if (R.demo) OFDEF.on = false; return res;
    }, R, TICKS, ANIMOFF, HUMAN);
    out[R.demo || R.drill] = r;
    const cnt = {}; for (const e of r.events) { const k = e.kind + (e.out ? ":" + e.type + ":" + e.out : e.outcome ? ":" + e.outcome : ""); cnt[k] = (cnt[k] || 0) + 1; }
    console.log((R.demo || R.drill).padEnd(12), "ms/tick", r.msPerTick.toFixed(3), "max", r.msMax.toFixed(2), JSON.stringify(cnt));
  }
  fs.writeFileSync(OUT, JSON.stringify({ out, errors: errs }));
  console.log("page errors", errs.length, errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
