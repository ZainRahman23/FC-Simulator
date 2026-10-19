// receive_turn11/tools/rt11_chrome.cjs — CHROME vs NODE for the human-motion lab: the page runs each episode through its own chain (RTL.evalCase)
// and poses its HumanTurnBody at fixed times (RTL.bodyProbe); Node does the same. The action, contact tick, launch, continuation and final ball
// (the fingerprint) and every posed joint (to 1e-7 m) must be identical.   PUPPETEER_NODE_MODULES=<dir> node rt11_chrome.cjs <out.json> [profile dir]
const path = require("path"), fs = require("fs"), puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
const [out = "rt11_chrome.json", prof] = process.argv.slice(2), TS = [-0.6, -0.3, -0.15, -0.05, 0, 0.05, 0.12, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.3];
const CASES = []; for (const c of [{ v: 6, theta: 0 }, { v: 12, theta: 30 }, { v: 12, theta: 60 }, { v: 12, theta: 90 }, { v: 12, theta: 120 }, { v: 12, theta: 135 }, { v: 12, theta: 150 }, { v: 12, theta: 180 }, { v: 18, theta: 90 }, { v: 18, theta: 165 }, { v: 6, theta: -120 }, { v: 12, theta: -180 }, { v: 12, theta: 135, prep: "0.3" }, { v: 12, theta: 90, lat: 0.25 }, { v: 12, theta: 135, family: "THROUGH_TURN" }, { v: 4, theta: 90, family: "OUTSIDE_TURN" }, { v: 12, theta: 90, pref: "L" }, { v: 12, theta: 180, pref: "both" }])
  for (const [bc, draw] of [[30, "seed3"], [70, "TYPICAL"], [99, "seed7"]]) CASES.push({ cond: c, bc, draw });
(async () => {
  const node = await import(path.resolve(__dirname, "rt11_chrome_node.mjs")), N = await node.run(CASES, TS);
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const p = await b.newPage(); await p.goto("http://127.0.0.1:8361/sandbox/visual/receive_turn11_lab.html?external=1&paused=1&ladder=0", { waitUntil: "load" });
  await p.waitForFunction("window.RTL_READY === true", { timeout: 120000 });
  const C = await p.evaluate((cases, ts) => cases.map((c) => { const sim = RTL.evalCase(c.cond, c.bc, c.draw); return { sim, body: sim.none ? null : RTL.bodyProbe(ts) }; }), CASES, TS); await b.close();
  const rows = CASES.map((c, i) => ({ case: c, simSame: JSON.stringify(C[i].sim) === JSON.stringify(N[i].sim), bodySame: C[i].body === N[i].body, chrome: C[i], node: N[i] }));
  const S = { total: rows.length, simIdentical: rows.filter((r) => r.simSame).length, bodyIdentical: rows.filter((r) => r.bodySame).length, probeTimes: TS, rows };
  fs.writeFileSync(out, JSON.stringify(S, null, 1)); console.log(`chrome = node: simulation ${S.simIdentical}/${S.total}, body poses ${S.bodyIdentical}/${S.total}`);
})().catch((e) => { console.error(e); process.exit(1); });
