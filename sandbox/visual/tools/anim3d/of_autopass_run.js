// AUTO PASS / RECEIVE demo — headless run of every pattern (and family), dumping each pass record and every classified failure.
//   node of_autopass_run.js [--ticks 2400] [--patterns 0,1,2,3] [--fams SHORT,DRIVEN,THROUGH] [--out autopass.json] [--anim off]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const TICKS = +opt("--ticks", 2400), PATS = opt("--patterns", "0,1,2,3").split(",").map(Number), FAMS = opt("--fams", "SHORT").split(","), OUT = opt("--out", "autopass.json");
const CONTRA = opt("--contra", "off") === "on", COLLECT = opt("--collect", "on") !== "off", ANIMOFF = opt("--anim", "on") === "off", URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-autopass"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} } });
  const out = {};
  for (const fam of FAMS) for (const pi of PATS) {
    const r = await p.evaluate(async (pi, fam, TICKS, ANIMOFF, COLLECT, CONTRA) => {
      Object.assign(OFAUTO, { on: true, collect: COLLECT, contra: CONTRA, contraUntil: null, handoffs: [], pattern: pi, fam, n: 0, ok: 0, fail: 0, results: [], cases: [] }); ofAutoStart(); OFPLAY.animOff = ANIMOFF;
      await new Promise(r => setTimeout(r, 50));
      const trace = [];
      for (let k = 0; k < TICKS; k++) { ptStep(); const t = S.pt; trace.push([+t.b.x.toFixed(5), +t.b.y.toFixed(5), t.b.owner == null ? -1 : t.b.owner]); }
      const res = { pattern: OFAUTO_PATTERNS[pi].id, fam, n: OFAUTO.n, ok: OFAUTO.ok, fail: OFAUTO.fail, results: OFAUTO.results.map(c => ({ recvSpeed: c.recvSpeed, pushSpeed: c.pushSpeed, n: c.n, from: c.from, to: c.to, fam: c.fam, target: c.target, tech: c.tech, foot: c.foot, ok: c.ok, reason: c.reason, recv: c.recv || null, residual: c.residual != null ? +c.residual.toFixed(4) : null, detail: c.detail || null })), cases: OFAUTO.cases, handoffs: OFAUTO.handoffs || [], trace };
      OFAUTO.on = false; OFPLAY.animOff = false; return res;
    }, pi, fam, TICKS, ANIMOFF, COLLECT, CONTRA);
    out[fam + ":" + r.pattern] = r;
    const fails = {}; for (const c of r.results) if (!c.ok) { const k = c.reason.split(" (")[0].split(" —")[0]; fails[k] = (fails[k] || 0) + 1; }
    const res = r.results.filter(c => c.ok && c.residual != null).map(c => c.residual * 100).sort((x, y) => x - y);
    console.log(`${fam.padEnd(8)} ${r.pattern.padEnd(11)} passes ${String(r.n).padStart(3)}  ok ${String(r.ok).padStart(3)}  fail ${String(r.fail).padStart(2)}  residual median ${res.length ? res[res.length >> 1].toFixed(1) : "-"} max ${res.length ? res[res.length - 1].toFixed(1) : "-"} cm  ${JSON.stringify(fails)}  stuck cases ${r.cases.length}`);
  }
  fs.writeFileSync(OUT, JSON.stringify({ out, errors: errs }));
  console.log("page errors", errs.length, errs.slice(0, 2));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
