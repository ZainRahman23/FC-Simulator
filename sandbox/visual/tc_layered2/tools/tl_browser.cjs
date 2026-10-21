// tc_layered2/tools/tl_browser.cjs — the B4 + B5 page in Chrome: every preset of the candidate stack and the locked engine played through the page's
// own stick on the owner's sprint 90° test, the same-input chain (X: A → B1 → … → ALL, then the locked engine), determinism on each, the sessions
// saved for node re-simulation (tl_resim.mjs), screenshots, timings, the console. Deletes its Chrome profile.
//   PT_TMP=<dir> TMPDIR=<dir> PUPPETEER_NODE_MODULES=<dir> node tl_browser.cjs --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "tlb-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = [], http = []; p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto("http://127.0.0.1:8361/sandbox/visual/tc_layered2.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(400);
    const res = { runs: [] }, shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 85 }), TEST = arg("test", "snap 90° · run R #0");
    for (const cfg of ["baseline", "A", "B4", "B5", "B45", "B452"]) {
      if (cfg === "baseline") await p.evaluate(() => window.PT.engine("baseline")); else { await p.evaluate(() => window.PT.engine("layered")); await p.evaluate((c) => window.PT.preset(c), cfg); }
      await p.evaluate(() => window.PT.resetPerf()); await p.evaluate((n) => window.PT.test(n), TEST); await sleep(3000 + 120); await shot(`${cfg}_+120ms.jpg`); await sleep(400); await shot(`${cfg}_+520ms.jpg`);
      await p.waitForFunction("!window.PT.test()", { timeout: 20000 }); await sleep(200);
      const det = await p.evaluate(() => window.PT.verify()), st = await p.evaluate(() => { const s = window.PT.state(); return { contacts: s.contacts.length, missed: s.contacts.filter((c) => c.missed).length, actions: s.actions.filter((a) => !/^(CARRY|STANDING|STOP)$/.test(a.label)).map((a) => `${a.t.toFixed(2)} ${a.label}`) }; });
      const perf = await p.evaluate(() => { const q = window.PT.perf(); return { work: { avg: +q.work.avg.toFixed(2), p99: +q.work.p99.toFixed(2), worst: +q.work.worst.toFixed(2) }, frameP99: +q.frame.p99.toFixed(1), replanWorst: +q.replanCpu.worst.toFixed(2) }; });
      const rec = await p.evaluate(() => window.PT.record()), sf = `${cfg}_session.json`; fs.writeFileSync(path.join(OUT, sf), JSON.stringify(rec));
      res.runs.push({ cfg, config: (await p.evaluate(() => window.PT.hud())).config, determinism: det.ok, hash: rec.hash, ...st, perf, session: sf }); }
    // the same-input chain: one recording (ALL, free stick input), then X through the whole chain and the locked engine
    await p.evaluate(() => window.PT.engine("layered")); await p.evaluate(() => window.PT.preset("B45")); await p.evaluate(() => window.PT.live());
    await p.keyboard.down("Shift"); await p.evaluate(() => window.PT.stick(0, 1)); await sleep(2500); await p.evaluate(() => window.PT.stick(1, 0)); await sleep(700); await p.evaluate(() => window.PT.stick(-0.7, 0.7)); await sleep(800); await p.evaluate(() => window.PT.stick(null)); await p.keyboard.up("Shift"); await sleep(300); await p.evaluate(() => window.PT.set({ paused: true })); await sleep(100);
    const recA = await p.evaluate(() => window.PT.record()); fs.writeFileSync(path.join(OUT, "chain_source.json"), JSON.stringify(recA)); const chain = [];
    for (const target of ["A", "B4", "B5", "B45", "B452", "baseline"]) { await p.evaluate((x) => window.PT.same(x), target); await sleep(4200); const r = await p.evaluate(() => ({ hud: window.PT.hud(), rec: window.PT.record(), replay: !!window.PT.V.replay }));
      fs.writeFileSync(path.join(OUT, `chain_${target}.json`), JSON.stringify(r.rec)); chain.push({ target, config: r.hud.config, replay: r.replay, inputIdentical: JSON.stringify(r.rec.input) === JSON.stringify(recA.input), hash: r.rec.hash }); if (target === "B45") await shot("chain_B45_replay.jpg"); }
    res.chain = chain; res.chainBackIdentical = chain.find((x) => x.target === "B45").hash === recA.hash;
    await p.evaluate(() => window.PT.live()); await p.evaluate(() => window.PT.preset("B45")); await p.evaluate(() => window.PT.set({ show: { hud: true, side: true, prot: false, body: true, anim: true, diag: true } })); await p.evaluate((n) => window.PT.test(n), "rapid L/R · run R #0"); await sleep(4200); await shot("B45_rapidLR_bodydebug.jpg");
    for (const [n, f] of [["named · ronaldo chop favourable · run snap 95° #0", "named_chop_B45.jpg"], ["named · ronaldo chop nearby · run snap 65° #0", "named_chop_nearby_B45.jpg"], ["named · drag-back nearby · jog snap 180° #0", "named_dragback_nearby_B45.jpg"]]) { await p.evaluate(() => window.PT.set({ show: { hud: true, side: true, prot: false, body: false, anim: true, diag: true } })); await p.evaluate((x) => window.PT.test(x), n); await sleep(3000 + 260); await shot(f); await p.waitForFunction("!window.PT.test()", { timeout: 20000 }); }
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "tl_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
