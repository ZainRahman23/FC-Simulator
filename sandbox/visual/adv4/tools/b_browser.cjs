// ballon1/tools/b_browser.cjs — THE BALL-ON PACE PLAYGROUND in Chrome (ballon1.html): it opens on S99 · D38 · A99-C · D99 · BC99 · CONTROLLED ·
// BALL ON with a carry candidate and the same player BALL OFF beside; no console error; for BALL OFF and each candidate the 60 m race preset
// (screenshots mid-race and at the end — the pair camera —, the envelope readout, the gap to the ball-off twin, determinism); the same input
// through the next candidate (⇄ N); the sessions saved for node re-simulation (u_resim.mjs). Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node b_browser.cjs --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RACE = "RACE · standing → 60 m (the same player BALL OFF beside)";
(async () => { const OUT = arg("out"), URL = arg("url", "http://127.0.0.1:8361/sandbox/visual/ballon1.html"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "bpb-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(500);
    const shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 82 });
    const res = { url: URL, defaults: await p.evaluate(() => ({ carry: window.PT.carry(), ball: window.PT.ball(), model: window.PT.model(), pace: window.PT.pace(), vocab: window.PT.vocab(), twin: !!window.PT.V.ref, label: document.getElementById("ver").textContent, buttons: [...document.querySelectorAll("[data-carry]")].map((x) => x.textContent) })), races: [] };
    await shot("00_open_default.jpg");
    for (const c of ["OFF", "A", "B", "C"]) { await p.evaluate((x) => window.PT.carry(x), c); await sleep(200);
      await p.evaluate((n) => window.PT.test(n), RACE); await sleep(4200); await shot(`race_${c}_mid.jpg`); const mid = await p.evaluate(() => ({ box: document.getElementById("pacebox").innerText, ctl: window.PT.ctl() }));
      await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150); await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(80); await shot(`race_${c}_end.jpg`);
      const r = await p.evaluate(() => { const S = window.PT.V.sim, R = window.PT.V.ref, st = S.stateAt(S.t), rs = R ? R.stateAt(R.t) : null, run = window.PT.run(); return { det: window.PT.verify().ok, d: run ? run.d : null, refD: run && run.ref ? run.ref.d : null, peak: run ? run.vmax : null, refPeak: run && run.ref ? run.ref.vmax : null, splits: run ? Object.fromEntries(Object.entries(run.splits).map(([m, x]) => [m, +x.t.toFixed(2)])) : null, exits: window.PT.possLog().filter((e) => e.from === "CONTROLLED").map((e) => e.why), rec: window.PT.record() }; });
      fs.writeFileSync(path.join(OUT, `session_${c}.json`), JSON.stringify(r.rec)); delete r.rec;
      res.races.push(Object.assign({ carry: c, midCtl: mid.ctl, midBox: mid.box.split("\n").slice(0, 6).join(" | ") }, r)); await p.evaluate(() => { window.PT.V.paused = false; }); }
    // the same input through the next candidate
    await p.evaluate(() => window.PT.carry("A")); await p.evaluate((n) => window.PT.test(n), RACE); await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150); await p.evaluate(() => { window.PT.V.paused = true; });
    const before = await p.evaluate(() => ({ c: window.PT.carry(), rec: window.PT.record() })); await p.click("#bNextCarry"); await sleep(2500);
    const after = await p.evaluate(() => ({ c: window.PT.carry(), rec: window.PT.record(), replay: !!window.PT.V.replay, label: document.getElementById("ver").textContent })); await shot("next_carry_replay.jpg");
    res.nextCarry = { from: before.c, to: after.c, replay: after.replay, label: after.label, inputIdentical: JSON.stringify(before.rec.input) === JSON.stringify(after.rec.input) };
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "b_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
