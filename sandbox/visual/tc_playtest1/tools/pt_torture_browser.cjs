// tc_playtest1/tools/pt_torture_browser.cjs — the page's TORTURE PRESET in Chrome: for each sequence, RESET, play it through the page's own analog
// stick at the given speed group (the real-time loop), sample the CONTROL HUD every 0.1 s, screenshot mid-run and at the end; then the page's
// determinism check and the session (node re-simulates it: tools/pt_resim.mjs; posed audit: tools/pt_audit.mjs)
//   PUPPETEER_NODE_MODULES=<dir> node pt_torture_browser.cjs --out <dir> [--seqs "a|b"] [--mode SPRINT]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "ptt-")), OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1440,900"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const logs = []; p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
    await p.goto("http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()"); const res = [];
    for (const name of arg("seqs", "0→90→180→-90→0 fast|flicks ±90 / 0.12 s|random #3").split("|")) { const mode = arg("mode", "SPRINT"); await p.evaluate(() => window.PT.reset()); await sleep(300); await p.evaluate(() => window.PT.resetPerf());
      await p.evaluate((n, m) => window.PT.torture(n, m), name, mode); const dur = await p.evaluate((n) => window.PT.V.torture ? window.PT.V.torture.seq.dur : 0, name); const st = {}; let shot = false;
      for (let i = 0; i < dur * 10 + 6; i++) { await sleep(100); const h = await p.evaluate(() => window.PT.hud()); st[h.control.status] = (st[h.control.status] || 0) + 1;
        if (!shot && i > dur * 5) { shot = true; await p.screenshot({ path: path.join(OUT, `tort_${res.length}_mid.jpg`), type: "jpeg", quality: 85 }); } }
      const det = await p.evaluate(() => window.PT.verify()), rec = await p.evaluate(() => window.PT.record()), perf = await p.evaluate(() => window.PT.perf()), sf = path.join(OUT, `tort_${res.length}_session.json`); fs.writeFileSync(sf, JSON.stringify(rec));
      await p.evaluate(() => window.PT.replay("last")); await sleep(1500); await p.screenshot({ path: path.join(OUT, `tort_${res.length}_replay.jpg`), type: "jpeg", quality: 85 }); await p.evaluate(() => window.PT.live());
      res.push({ name, mode, statusSamples: st, determinism: det.ok, ticks: det.ticks, work: { avg: +perf.work.avg.toFixed(2), worst: +perf.work.worst.toFixed(2) }, frameP99: perf.frame.p99, session: path.basename(sf) }); }
    res.logs = logs; fs.writeFileSync(path.join(OUT, "torture_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1), logs.slice(0, 5)); } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
