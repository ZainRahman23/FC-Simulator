// speed99/tools/s_browser.cjs — THE PACE PLAYGROUND in Chrome (speed99.html): opens BALL OFF on the default candidate with the CURRENT reference
// runner, no console error; for each pace the 0–30 m preset and the 90° cut preset (screenshots mid-run, the pace panel's splits, determinism V);
// the same input through the next pace (N); every session saved for node re-simulation (u_resim.mjs). Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node s_browser.cjs --out <dir> [--paces CURRENT,A,B,C]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), URL = arg("url", "http://127.0.0.1:8361/sandbox/visual/speed99.html"), paces = arg("paces", "CURRENT,C38,D38,E38").split(","), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "spb-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(500);
    const shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 82 });
    const res = { url: URL, defaults: await p.evaluate(() => ({ pace: window.PT.pace(), ref: window.PT.refPace(), ball: window.PT.ball(), model: window.PT.model() })), runs: [] }; await shot("00_open_default.jpg");
    for (const pace of paces) { await p.evaluate((x) => window.PT.pace(x), pace);
      for (const [name, tShot] of [["0–30 m · standing → sprint", 3.6], ["sprint → 90° cut + accelerate", 6.4]]) {
        await p.evaluate((n) => window.PT.test(n), name); await sleep(tShot * 1000); const tag = `${pace}_${name.replace(/[^a-z0-9]+/gi, "_").replace(/_+$/, "").toLowerCase()}`; await shot(tag + ".jpg");
        await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150); await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(80);
        const det = await p.evaluate(() => window.PT.verify()), run = await p.evaluate(() => window.PT.run()), ref = await p.evaluate(() => window.PT.refState()), rec = await p.evaluate(() => window.PT.record()), sf = tag + "_session.json"; fs.writeFileSync(path.join(OUT, sf), JSON.stringify(rec));
        res.runs.push({ pace, name, determinism: det.ok, splits: run && Object.fromEntries(Object.entries(run.splits).map(([m, x]) => [m, +x.t.toFixed(2)])), vmax: run && +run.vmax.toFixed(2), refSplits: run && run.ref ? Object.fromEntries(Object.entries(run.ref.splits).map(([m, x]) => [m, +x.t.toFixed(2)])) : null, refPace: ref ? true : false, session: sf });
        await p.evaluate(() => { window.PT.V.paused = false; }); } }
    // the same input through the next pace
    await p.evaluate(() => window.PT.pace("C38")); await p.evaluate((n) => window.PT.test(n), "0–20 m · standing → sprint"); await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150);
    const before = await p.evaluate(() => ({ pace: window.PT.pace(), rec: window.PT.record() })); await p.evaluate(() => window.PT.nextPace()); await sleep(2500);
    const after = await p.evaluate(() => ({ pace: window.PT.pace(), rec: window.PT.record(), replay: !!window.PT.V.replay })); await shot("next_pace_replay.jpg");
    res.nextPace = { from: before.pace, to: after.pace, replay: after.replay, inputIdentical: JSON.stringify(before.rec.input) === JSON.stringify(after.rec.input) };
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "s_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
