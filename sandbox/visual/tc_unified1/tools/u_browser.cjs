// tc_unified1/tools/u_browser.cjs — THE PRIMARY MORNING PAGE in Chrome (tc_unified1.html): it opens on FULL / BALL ON / the joystick with no
// console error; the morning playtest cases and favourable examples played through the page's own stick (screenshots, the actions chosen, the
// contacts, determinism V, timings); the same-input chain (X: A → A + C → A + C + SUPPORT → A + C + SUPPORT + B4 → FULL, the input identical,
// back to the original hash); BALL OFF (Astra's probe) and the ⚙ diagnostics toggle; every session saved for node re-simulation (u_resim.mjs:
// node ≡ browser). Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node u_browser.cjs --out <dir> [--url http://127.0.0.1:8361/sandbox/visual/tc_unified1.html]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), URL = arg("url", "http://127.0.0.1:8361/sandbox/visual/tc_unified1.html"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "tub-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    const t0 = Date.now(); await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); const loadS = (Date.now() - t0) / 1000; await sleep(500);
    const shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 82 });
    const res = { url: URL, loadS, defaults: await p.evaluate(() => ({ config: window.PT.hud().config, ball: window.PT.ball(), diagnostics: window.PT.diagnostics(), stickVisible: !!document.getElementById("stickPad").getBoundingClientRect().width, attrs: ["aBC", "aDRI", "aAGI"].map((id) => +document.getElementById(id).value), tests: document.getElementById("selTest").options.length })), runs: [] };
    await shot("00_open_default.jpg");
    // (the morning cases below + every favourable example the page offers — read from its own menu)
    const fav = await p.evaluate(() => [...document.querySelectorAll('optgroup[label^="favourable"] option')].map((o) => o.value));
    const CASES = [["straight sprint", 4.2], ["straight run", 4.2], ["sprint 90°", 3.25], ["sprint 180°", 3.5], ["tight analog curve · sprint (60°/s)", 4.5], ["fast circle · sprint (270°/s)", 4.2], ["0 → 90 → 0 → −90 · sprint (0.6 s each)", 4.0], ["rapid sprint left / right (±60° every 0.35 s)", 4.0], ["stop / restart · run", 4.4],
      ...fav.map((n) => [n, 3.45])];
    let i = 0; for (const [name, tShot] of CASES) { i++; await p.evaluate(() => window.PT.resetPerf()); await p.evaluate((n) => window.PT.test(n), name); await sleep(tShot * 1000);
      const tag = String(i).padStart(2, "0") + "_" + name.replace(/[^a-z0-9]+/gi, "_").replace(/_+$/, "").toLowerCase(); await shot(tag + ".jpg");
      await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150);
      const det = await p.evaluate(() => window.PT.verify()), st = await p.evaluate(() => { const s = window.PT.state(); return { contacts: s.contacts.length, missed: s.contacts.filter((c) => c.missed).length, actions: s.actions.filter((a) => !/^(CARRY|STANDING|STOP)$/.test(a.label)).map((a) => `${a.t.toFixed(2)} ${a.label}${a.m ? (a.m > 0 ? " R" : " L") : ""}`) }; });
      const perf = await p.evaluate(() => { const q = window.PT.perf(); return { work: { avg: +q.work.avg.toFixed(2), p99: +q.work.p99.toFixed(2), worst: +q.work.worst.toFixed(2) }, frameP99: +q.frame.p99.toFixed(1), replanWorst: +q.replanCpu.worst.toFixed(2) }; });
      const rec = await p.evaluate(() => window.PT.record()), sf = tag + "_session.json"; fs.writeFileSync(path.join(OUT, sf), JSON.stringify(rec));
      res.runs.push({ name, config: (await p.evaluate(() => window.PT.hud())).config, determinism: det.ok, hash: rec.hash, ...st, perf, shot: tag + ".jpg", session: sf }); }
    // the same-input chain: one free recording on FULL (sprint, a snap right, a diagonal, release), then X through every stack and back
    await p.evaluate(() => window.PT.preset("FULL")); await p.evaluate(() => window.PT.live());
    await p.keyboard.down("Shift"); await p.evaluate(() => window.PT.stick(0, 1)); await sleep(2600); await p.evaluate(() => window.PT.stick(1, 0)); await sleep(800); await p.evaluate(() => window.PT.stick(-0.7, 0.7)); await sleep(900); await p.evaluate(() => window.PT.stick(null)); await p.keyboard.up("Shift"); await sleep(600);
    await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(100); const recF = await p.evaluate(() => window.PT.record()); fs.writeFileSync(path.join(OUT, "chain_source_FULL.json"), JSON.stringify(recF)); const chain = [];
    for (const target of ["A", "AC", "ACS", "ACS4", "FULL"]) { await p.evaluate((x) => window.PT.same(x), target); await sleep(5200); const r = await p.evaluate(() => ({ hud: window.PT.hud(), rec: window.PT.record(), replay: !!window.PT.V.replay }));
      fs.writeFileSync(path.join(OUT, `chain_${target}.json`), JSON.stringify(r.rec)); chain.push({ target, config: r.hud.config, replay: r.replay, inputIdentical: JSON.stringify(r.rec.input) === JSON.stringify(recF.input), hash: r.rec.hash }); await shot(`chain_${target}_replay.jpg`); }
    res.chain = chain; res.chainBackIdentical = chain[chain.length - 1].hash === recF.hash;
    // BALL OFF (Astra's movement probe) and the diagnostics toggle
    await p.evaluate(() => window.PT.live()); await p.evaluate(() => window.PT.ball(false)); await p.evaluate((n) => window.PT.test(n), "sprint 90°"); await sleep(3300); await shot("ball_off_sprint90.jpg"); await p.waitForFunction("!window.PT.V.test", { timeout: 30000 });
    res.ballOff = { config: (await p.evaluate(() => window.PT.hud())).config, determinism: (await p.evaluate(() => window.PT.verify())).ok, rec: "ball_off_session.json" }; fs.writeFileSync(path.join(OUT, "ball_off_session.json"), JSON.stringify(await p.evaluate(() => window.PT.record())));
    await p.evaluate(() => window.PT.ball(true)); await p.evaluate(() => window.PT.diagnostics(true)); await p.evaluate((n) => window.PT.test(n), "rapid sprint left / right (±60° every 0.35 s)"); await sleep(4200); await shot("diagnostics_on_rapid.jpg"); await p.waitForFunction("!window.PT.V.test", { timeout: 30000 });
    res.diagnosticsOn = await p.evaluate(() => window.PT.diagnostics()); await p.evaluate(() => window.PT.diagnostics(false));
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "u_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
