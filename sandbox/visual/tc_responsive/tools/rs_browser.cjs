// tc_responsive/tools/rs_browser.cjs — the A/B page in Chrome: the experiment and the baseline played through the page's own stick (sprint → snap 90° /
// 180°, the torture preset), the ⇄ same-input switch, the determinism check on both engines, the sessions saved for node re-simulation
// (tools/rs_resim.mjs: node ≡ browser), screenshots, frame / work timings. Deletes its Chrome profile.
//   PT_TMP=<dir> TMPDIR=<dir> PUPPETEER_NODE_MODULES=<dir> node rs_browser.cjs --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "rsb-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1440,900"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const logs = [], http = []; p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto("http://127.0.0.1:8361/sandbox/visual/tc_responsive.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(400);
    const res = { runs: [] }; const shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 85 });
    for (const engine of ["experiment", "baseline"]) for (const [label, x, y] of [["snap 90°", 1, 0], ["snap 180°", 0, -1]]) {
      await p.evaluate((e) => window.PT.engine(e), engine); await p.evaluate(() => window.PT.reset()); await p.evaluate(() => window.PT.resetPerf()); await sleep(200);
      await p.keyboard.down("Shift"); await p.evaluate(() => window.PT.stick(0, 1)); await sleep(3000); await p.evaluate((a, b2) => window.PT.stick(a, b2), x, y); await sleep(120);
      const tag = `${engine}_${label.replace(/[^0-9a-z]/gi, "")}`; await shot(`${tag}_+120ms.jpg`); const h120 = await p.evaluate(() => window.PT.hud()); await sleep(400); await shot(`${tag}_+520ms.jpg`);
      await sleep(1500); await p.evaluate(() => window.PT.stick(null)); await p.keyboard.up("Shift"); await sleep(400);
      const det = await p.evaluate(() => window.PT.verify()), st = await p.evaluate(() => { const s = window.PT.state(); return { contacts: s.contacts.length, missed: s.contacts.filter((c) => c.missed).length, actions: s.actions.filter((a) => !/CARRY|STANDING|STOP|PURSUIT/.test(a.label)).map((a) => `${a.t.toFixed(2)} ${a.label}`) }; });
      const perf = await p.evaluate(() => { const q = window.PT.perf(); return { work: { avg: +q.work.avg.toFixed(2), p99: +q.work.p99.toFixed(2), worst: +q.work.worst.toFixed(2) }, frameP99: +q.frame.p99.toFixed(1), replanWorst: +q.replanCpu.worst.toFixed(2) }; });
      const rec = await p.evaluate(() => window.PT.record()), sf = `${tag}_session.json`; fs.writeFileSync(path.join(OUT, sf), JSON.stringify(rec));
      res.runs.push({ engine, label, hud120: { action: h120.action, speed: +h120.speed.toFixed(2), clocks: h120.clocks, next: h120.next }, determinism: det.ok, ...st, perf, session: sf }); }
    // the same-input switch: an experiment session replayed on the baseline and back
    await p.evaluate(() => window.PT.engine("experiment")); await p.evaluate(() => window.PT.reset()); await sleep(200); await p.keyboard.down("Shift"); await p.evaluate(() => window.PT.stick(0, 1)); await sleep(2500);
    await p.evaluate(() => window.PT.stick(1, 0)); await sleep(700); await p.evaluate(() => window.PT.stick(-1, 0)); await sleep(900); await p.evaluate(() => window.PT.stick(null)); await p.keyboard.up("Shift"); await sleep(300);
    const recA = await p.evaluate(() => window.PT.record()); await p.evaluate(() => window.PT.same()); await sleep(4500); const onB = await p.evaluate(() => ({ engine: window.PT.engine(), replay: !!window.PT.V.replay, rec: window.PT.record() })); await shot("same_input_on_baseline.jpg");
    await p.evaluate(() => window.PT.same()); await sleep(4500); const backA = await p.evaluate(() => ({ engine: window.PT.engine(), rec: window.PT.record() })); await shot("same_input_back_on_experiment.jpg");
    res.sameInput = { inputIdentical: JSON.stringify(recA.input) === JSON.stringify(onB.rec.input) && JSON.stringify(recA.input) === JSON.stringify(backA.rec.input), engines: [recA.engine, onB.engine, backA.engine], replayShown: onB.replay, backHashIdentical: recA.hash === backA.rec.hash };
    fs.writeFileSync(path.join(OUT, "same_input_A.json"), JSON.stringify(recA)); fs.writeFileSync(path.join(OUT, "same_input_B.json"), JSON.stringify(onB.rec));
    // the torture preset on the experiment
    await p.evaluate(() => window.PT.live()); await p.evaluate(() => window.PT.engine("experiment")); await p.evaluate(() => window.PT.reset()); await sleep(200);
    await p.evaluate(() => window.PT.torture("0→90→180→-90→0 fast", "SPRINT")); const dur = await p.evaluate(() => window.PT.V.torture.seq.dur); await sleep(dur * 500); await shot("torture_mid.jpg"); await sleep(dur * 500 + 600);
    res.torture = { determinism: (await p.evaluate(() => window.PT.verify())).ok, contacts: (await p.evaluate(() => window.PT.state())).contacts.length }; const recT = await p.evaluate(() => window.PT.record()); fs.writeFileSync(path.join(OUT, "torture_session.json"), JSON.stringify(recT));
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "rs_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
