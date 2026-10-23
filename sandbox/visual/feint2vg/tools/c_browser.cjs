// tc_controlled1/tools/c_browser.cjs — THE CONTROLLED-BALL PAGE in Chrome (tc_controlled1.html): opens on CONTROLLED / FULL / BALL ON / the joystick
// with no console error; the morning cases in both models (actions, contacts, the possession state, determinism V); free stick play with an
// OPPONENT POKE and a RELEASE (recorded events: determinism with them, the possession log's exits); ⇄ same input → the other model (the input
// identical); every session saved for node re-simulation (u_resim.mjs: node ≡ browser, events included). Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node c_browser.cjs --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), URL = arg("url", "http://127.0.0.1:8361/sandbox/visual/tc_controlled1.html"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "tcb-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(500);
    const shot = (n) => p.screenshot({ path: path.join(OUT, n), type: "jpeg", quality: 82 });
    const res = { url: URL, defaults: await p.evaluate(() => ({ config: window.PT.hud().config, model: window.PT.model(), ball: window.PT.ball(), diagnostics: window.PT.diagnostics(), attrs: ["aBC", "aDRI", "aAGI"].map((id) => +document.getElementById(id).value) })), runs: [] };
    await shot("00_open_default.jpg");
    for (const model of ["CONTROLLED", "FREE"]) for (const [name, tShot] of [["rapid sprint left / right (±60° every 0.35 s)", 4.0], ["fast circle · sprint (270°/s)", 4.2], ["sprint 90°", 3.25], ["favourable · Ronaldo Chop (run -105° #2)", 3.4]]) {
      await p.evaluate((m) => window.PT.model(m), model); await p.evaluate((n) => window.PT.test(n), name); await sleep(tShot * 1000);
      const tag = `${model}_${name.replace(/[^a-z0-9]+/gi, "_").replace(/_+$/, "").toLowerCase()}`; await shot(tag + ".jpg"); await p.waitForFunction("!window.PT.V.test", { timeout: 30000 }); await sleep(150);
      const det = await p.evaluate(() => window.PT.verify()), st = await p.evaluate(() => { const s = window.PT.state(); return { contacts: s.contacts.length, missed: s.contacts.filter((c) => c.missed).length, actions: s.actions.filter((a) => !/^(CARRY|STANDING|STOP)$/.test(a.label)).map((a) => a.label) }; });
      const poss = await p.evaluate(() => ({ now: window.PT.poss(), log: window.PT.possLog() })), rec = await p.evaluate(() => window.PT.record()), sf = tag + "_session.json"; fs.writeFileSync(path.join(OUT, sf), JSON.stringify(rec));
      res.runs.push({ model, name, determinism: det.ok, ...st, state: poss.now && poss.now.state, exits: poss.log.filter((e) => e.to === "FREE").map((e) => e.why), session: sf }); }
    // free play with an opponent poke and a release, CONTROLLED, diagnostics on (the possession HUD)
    await p.evaluate(() => window.PT.model("CONTROLLED")); await p.evaluate(() => window.PT.diagnostics(true)); await p.evaluate(() => window.PT.live());
    await p.evaluate(() => window.PT.stick(0, 1)); await sleep(2500); await p.evaluate(() => window.PT.poke()); await sleep(600); await shot("poke_diag.jpg"); await sleep(1800);
    await p.evaluate(() => window.PT.stick(0.7, 0.7)); await sleep(1500); await p.evaluate(() => window.PT.release()); await sleep(1200); await shot("release_diag.jpg"); await p.evaluate(() => window.PT.stick(null)); await sleep(500);
    await p.evaluate(() => { window.PT.V.paused = true; }); await sleep(100);
    const fp = await p.evaluate(() => ({ verify: window.PT.verify(), log: window.PT.possLog(), events: window.PT.V.sim.log.events.map((e) => e.kind), ext: window.PT.V.sim.extLog.length, rec: window.PT.record() }));
    fs.writeFileSync(path.join(OUT, "freeplay_poke_release_session.json"), JSON.stringify(fp.rec)); res.freeplay = { determinism: fp.verify.ok, events: fp.events, opponentHits: fp.ext, exits: fp.log.filter((e) => e.to === "FREE").map((e) => `${e.why} @${e.t}`), entries: fp.log.filter((e) => e.to === "CONTROLLED").length };
    // the same input through the other model
    await p.evaluate(() => window.PT.other()); await sleep(5200); const r2 = await p.evaluate(() => ({ model: window.PT.model(), rec: window.PT.record(), replay: !!window.PT.V.replay }));
    fs.writeFileSync(path.join(OUT, "freeplay_other_model_session.json"), JSON.stringify(r2.rec)); res.otherModel = { model: r2.model, replay: r2.replay, inputIdentical: JSON.stringify(r2.rec.input) === JSON.stringify(fp.rec.input), eventsIdentical: JSON.stringify(r2.rec.events.map((e) => e.kind)) === JSON.stringify(fp.rec.events.map((e) => e.kind)) };
    await shot("other_model_replay.jpg"); await p.evaluate(() => window.PT.diagnostics(false));
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "c_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
