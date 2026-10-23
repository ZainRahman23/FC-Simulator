// phys1/tools/r_browser.cjs — THE PHYSICAL RATINGS PLAYGROUND in Chrome (phys1.html): it opens on PHYSICAL-80-B (a starting point only) with
// PHYSICAL-99 beside; no console error; for each of PHYSICAL-99 / 80-A / 80-B / 80-C the standing sprint (the pair camera, mid-run and at the end:
// the readout, the splits, the gap to the reference, determinism) and the 90° cut (the readout after it: the redirection demand, the new-line
// time, the momentum retained); the same input through the next (⇄ N); the custom rating set; the sessions saved for node re-simulation
// (r_resim.mjs). Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node r_browser.cjs --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SPRINT = "STANDING SPRINT · 0–40 m (the reference beside)", CUT = "90° CUT · from a full sprint";
(async () => { const OUT = arg("out"), URL = arg("url", "http://127.0.0.1:8361/sandbox/visual/phys1.html"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "prb-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(500);
    const shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 80 });
    const res = { url: URL, defaults: await p.evaluate(() => ({ phys: window.PT.phys(), ref: window.PT.refPhys(), ball: window.PT.ball(), label: document.getElementById("ver").textContent, buttons: [...document.querySelectorAll("[data-phys]")].map((x) => x.textContent), tests: [...document.querySelectorAll("#selTest optgroup")][0].label + ": " + [...document.querySelectorAll("#selTest optgroup")][0].children.length })), runs: [] };
    await shot("00_open_default.jpg");
    for (const id of ["PHYSICAL-99", "PHYSICAL-80-A", "PHYSICAL-80-B", "PHYSICAL-80-C"]) { await p.evaluate((x) => window.PT.phys(x), id); await sleep(200);
      await p.evaluate((n) => window.PT.test(n), SPRINT); await sleep(3300); await shot(`sprint_${id}_mid.jpg`); const mid = await p.evaluate(() => document.getElementById("pacebox").innerText);
      await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150); await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(80); await shot(`sprint_${id}_end.jpg`);
      const r = await p.evaluate(() => { const run = window.PT.run(); return { det: window.PT.verify().ok, d: run ? run.d : null, refD: run && run.ref ? run.ref.d : null, peak: run ? run.vmax : null, refPeak: run && run.ref ? run.ref.vmax : null, splits: run ? Object.fromEntries(Object.entries(run.splits).map(([m, x]) => [m, +x.t.toFixed(3)])) : null, refSplits: run && run.ref ? Object.fromEntries(Object.entries(run.ref.splits).map(([m, x]) => [m, +x.t.toFixed(3)])) : null, ref: window.PT.refPhys(), rec: window.PT.record() }; });
      fs.writeFileSync(path.join(OUT, `session_sprint_${id}.json`), JSON.stringify(r.rec)); delete r.rec; await p.evaluate(() => { window.PT.V.paused = false; });
      await p.evaluate((n) => window.PT.test(n), CUT); await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(100); await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(80); await shot(`cut90_${id}_end.jpg`);
      const c = await p.evaluate(() => ({ det: window.PT.verify().ok, redir: window.PT.redir(), box: document.getElementById("pacebox").innerText, rec: window.PT.record() }));
      fs.writeFileSync(path.join(OUT, `session_cut90_${id}.json`), JSON.stringify(c.rec)); delete c.rec; await p.evaluate(() => { window.PT.V.paused = false; });
      res.runs.push(Object.assign({ id, midBox: mid.split("\n").slice(0, 9).join(" | "), cut90: { det: c.det, redir: c.redir, box: c.box.split("\n").slice(5, 9).join(" | ") } }, r)); }
    // the same input through the next
    await p.evaluate(() => window.PT.phys("PHYSICAL-80-A")); await p.evaluate((n) => window.PT.test(n), CUT); await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150); await p.evaluate(() => { window.PT.V.paused = true; });
    const before = await p.evaluate(() => ({ c: window.PT.phys().id, rec: window.PT.record() })); await p.click("#bNextPhys"); await sleep(2500);
    const after = await p.evaluate(() => ({ c: window.PT.phys().id, rec: window.PT.record(), replay: !!window.PT.V.replay, label: document.getElementById("ver").textContent, ref: window.PT.refPhys() })); await shot("next_phys_replay.jpg");
    res.nextPhys = { from: before.c, to: after.c, replay: after.replay, label: after.label, ref: after.ref, inputIdentical: JSON.stringify(before.rec.input) === JSON.stringify(after.rec.input) };
    // the custom rating set (diagnostics)
    await p.evaluate(() => { window.PT.live(); window.PT.diagnostics(true); document.getElementById("cuS").value = "50"; document.getElementById("cuA").value = "99"; document.getElementById("cuG").value = "40"; document.getElementById("cuSc").value = "C"; }); await p.click("#bCust"); await sleep(300);
    res.custom = await p.evaluate(() => ({ phys: window.PT.phys(), vmax: window.PT.V.sim.P.speed.SPRINT, label: document.getElementById("ver").textContent, ref: window.PT.refPhys() })); await shot("custom_ratings.jpg");
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "r_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
