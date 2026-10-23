// speed99/tools/s99_browser.cjs — THE PRIMARY PAGE in Chrome (s99.html, S99 MISSION): it opens on the owner's 99 player (99 PACE = S99 38 km/h ·
// D38 · A99-C, D99 / BC99, CONTROLLED_BALL, FULL, BALL ON) with no console error; a sprint with the ball through the page's own stick (SPRINT LOCK +
// the stick held up, 9 s: the speed, the touches, the HUD's phase — SPRINT CARRY —, screenshots); the same input through CURRENT PACE (⇄); the
// determinism check; the session saved for node re-simulation (u_resim.mjs). Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node s99_browser.cjs --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), URL = arg("url", "http://127.0.0.1:8361/sandbox/visual/s99.html"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "s99b-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(500);
    const shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 82 });
    const res = { url: URL, defaults: await p.evaluate(() => ({ vocab: window.PT.vocab(), pace: window.PT.pace(), ball: window.PT.ball(), model: window.PT.model(), config: window.PT.preset(), attrs: window.PT.V.sim.attrs || null, label: document.getElementById("ver").textContent, paceButtons: [...document.querySelectorAll("[data-pace]")].map((x) => x.textContent) })) };
    await shot("00_open_default.jpg");
    // a sprint with the ball: SPRINT LOCK, the stick straight up and held
    await p.click("#bLock"); await sleep(80); const c = await p.$eval("#stickPad", (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
    await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x, c.y - c.w * 0.45, { steps: 1 }); const phases = new Set(); let vmax = 0;
    for (let i = 0; i < 36; i++) { await sleep(250); const h = await p.evaluate(() => { const x = window.PT.poss(), s = window.PT.V.sim.stateAt(window.PT.V.sim.t); return { phase: x ? x.phase : "", state: x ? x.state : "", v: s.s }; }); phases.add(h.phase.split(" (")[0]); vmax = Math.max(vmax, h.v); if (i === 20) await shot("01_sprint_carry.jpg"); }
    await p.mouse.up(); await sleep(1500); await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(80);
    const st = await p.evaluate(() => ({ state: window.PT.state(), poss: window.PT.poss(), possLog: window.PT.possLog(), det: window.PT.verify(), rec: window.PT.record() }));
    fs.writeFileSync(path.join(OUT, "sprint_session.json"), JSON.stringify(st.rec));
    const T = st.state.contacts.filter((x) => !x.missed); res.sprint = { vmax: +vmax.toFixed(2), kmh: +(vmax * 3.6).toFixed(1), touches: T.length, phases: [...phases], exits: st.possLog.filter((e) => e.from === "CONTROLLED").map((e) => e.why), state: st.poss && st.poss.state, determinism: st.det.ok };
    // the same input through CURRENT PACE
    const before = await p.evaluate(() => ({ pace: window.PT.pace(), rec: window.PT.record() })); await p.click("#bNextPace"); await sleep(2500);
    const after = await p.evaluate(() => ({ pace: window.PT.pace(), rec: window.PT.record(), replay: !!window.PT.V.replay, label: document.getElementById("ver").textContent })); await shot("02_same_input_current_pace.jpg");
    res.otherPace = { from: before.pace, to: after.pace, replay: after.replay, label: after.label, inputIdentical: JSON.stringify(before.rec.input) === JSON.stringify(after.rec.input) };
    // the EXPANDED families' presets (back on 99 PACE): the actions B4 chose, screenshots during the move; then the same input through CORE (T)
    await p.evaluate(() => { window.PT.live(); window.PT.pace("D38"); window.PT.vocab("EXPANDED"); }); res.presets = [];
    for (const [name, tShot] of [["REVIEW · KNOCK-ON · run → sprint 35° into space", 3.35], ["REVIEW · LATERAL TRANSFER · run → 40° right", 3.3], ["REVIEW · SOLE ROLL · walk → 120°", 3.5], ["B4 CHOOSES · run → sprint 35° (EXPANDED, unforced)", 3.35], ["SPRINT CARRY → 90° cut + explode", 7.4]]) {
      await p.evaluate((n) => window.PT.test(n), name); await sleep(tShot * 1000); const tag = name.replace(/[^A-Z0-9]+/gi, "_").slice(0, 40).toLowerCase(); await shot(`03_${tag}.jpg`);
      await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150); await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(80);
      const r = await p.evaluate(() => ({ st: window.PT.state(), poss: window.PT.possLog(), vocab: window.PT.vocab(), det: window.PT.verify(), rec: window.PT.record() })); fs.writeFileSync(path.join(OUT, `session_${tag}.json`), JSON.stringify(r.rec));
      res.presets.push({ name, vocab: r.vocab, force: await p.evaluate(() => window.PT.force()), actions: [...new Set(r.st.actions.map((a) => a.label))], touches: r.st.contacts.filter((c) => !c.missed && c.t > 2.5).slice(0, 5).map((c) => c.role), exits: r.poss.filter((e) => e.from === "CONTROLLED").map((e) => e.why), determinism: r.det.ok });
      await p.evaluate(() => { window.PT.V.paused = false; }); }
    { await p.evaluate(() => { window.PT.V.paused = true; }); const b0 = await p.evaluate(() => ({ v: window.PT.vocab(), rec: window.PT.record() })); await p.click("#bOtherVocab"); await sleep(2500);
      const a0 = await p.evaluate(() => ({ v: window.PT.vocab(), rec: window.PT.record(), replay: !!window.PT.V.replay, label: document.getElementById("ver").textContent })); await shot("04_same_input_core.jpg");
      res.otherVocab = { from: b0.v, to: a0.v, replay: a0.replay, label: a0.label, inputIdentical: JSON.stringify(b0.rec.input) === JSON.stringify(a0.rec.input) }; }
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "s99_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
