// receive_control2/tools/rc2_chrome.cjs — CHROME = NODE for the integrated pipeline: the lab page (receive_control2.html) simulates each case with
// its presentation bodies; Node simulates it without; the run's fingerprint (the ball and the receiver's root at every tick, every touch tick) and
// the resolver's action and the launch list must be identical.   PUPPETEER_NODE_MODULES=<dir> node rc2_chrome.cjs <out.json> [profile]
const path = require("path"), fs = require("fs"), puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
const [out = "rc2_chrome.json", prof] = process.argv.slice(2);
const CASES = []; for (const c of ["A", "B", "D", "F", "H", "I", "J", "K", "I2", "A2"]) for (const [bc, sd] of [[50, 1], [99, 2]]) CASES.push({ id: c + "_BC" + bc, seed: sd });
CASES.push({ id: "L", seed: 1 }, { id: "F_90_RUN_MED_BC99", seed: 1 }, { id: "FL_0_RUN_MED_BC99", seed: 1 }, { id: "F_180R_JOG_MED_BC99", seed: 2 }, { id: "R_90_FAST_MED", seed: 1 });
(async () => {
  const node = await import(path.resolve(__dirname, "rc2_chrome_node.mjs")), N = await node.run(CASES);
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const C = []; for (const c of CASES) { const p = await b.newPage(); await p.goto(`http://127.0.0.1:8361/sandbox/visual/receive_control2.html?external=1&paused=1&case=${c.id}&seed=${c.seed}`, { waitUntil: "load" });
    await p.waitForFunction("window.D1V && window.D1V.ready && window.D1V.ready() === true", { timeout: 180000 });
    C.push(await p.evaluate(() => { const S = window.D1V.state.S, sm = S.rx.stand ? S.summary2() : null; return { hash: window.D1V.state.hash, action: sm && sm.cls ? sm.cls.action : null, launches: S.W.events.filter((e) => e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED").map((e) => e.id + "@" + e.tick + ":" + e.kind[0]) }; })); await p.close(); }
  await b.close();
  const rows = CASES.map((c, i) => ({ case: c, same: JSON.stringify(C[i]) === JSON.stringify(N[i]), chrome: C[i], node: N[i] }));
  const S = { total: rows.length, identical: rows.filter((r) => r.same).length, rows }; fs.writeFileSync(out, JSON.stringify(S, null, 1)); console.log(`chrome = node: ${S.identical}/${S.total}`);
  for (const r of rows.filter((r) => !r.same).slice(0, 3)) console.log("DIFF", JSON.stringify(r).slice(0, 400));
})().catch((e) => { console.error(e); process.exit(1); });
