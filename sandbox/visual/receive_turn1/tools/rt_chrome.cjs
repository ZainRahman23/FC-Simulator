// receive_turn1/tools/rt_chrome.cjs — CHROME vs NODE: the receive-turn lab runs each episode (RTL.evalCase) and Node runs the same cases; the
// action chosen, the contact tick, the executed launch, the continuation and the ball at the end (the fingerprint) must be bit-identical.
//   PUPPETEER_NODE_MODULES=<dir> node rt_chrome.cjs <out.json> [profile dir]
const path = require("path"), fs = require("fs"), puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
const [out = "rt_chrome.json", prof] = process.argv.slice(2);
const CASES = []; for (const c of [{ v: 6, theta: 0 }, { v: 12, theta: 30 }, { v: 12, theta: 60 }, { v: 12, theta: 90 }, { v: 12, theta: 120 }, { v: 12, theta: 135 }, { v: 12, theta: 150 }, { v: 12, theta: 180 }, { v: 18, theta: 90 }, { v: 18, theta: 165 }, { v: 6, theta: -120 }, { v: 12, theta: -180 }, { v: 12, theta: 135, prep: "0.3" }, { v: 12, theta: 90, lat: 0.25 }, { v: 12, theta: 135, family: "THROUGH_TURN" }])
  for (const [bc, draw] of [[30, "seed3"], [70, "TYPICAL"], [99, "seed7"]]) CASES.push({ cond: c, bc, draw });
(async () => {
  const node = await import(path.resolve(__dirname, "rt_chrome_node.mjs")), N = await node.run(CASES);
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const p = await b.newPage(); await p.goto("http://127.0.0.1:8361/sandbox/visual/receive_turn1_lab.html?external=1&paused=1&ladder=0", { waitUntil: "load" });
  await p.waitForFunction("window.RTL_READY === true", { timeout: 120000 });
  const C = await p.evaluate((cases) => cases.map((c) => RTL.evalCase(c.cond, c.bc, c.draw)), CASES); await b.close();
  const rows = CASES.map((c, i) => ({ case: c, same: JSON.stringify(C[i]) === JSON.stringify(N[i]), chrome: C[i], node: N[i] }));
  const S = { total: rows.length, identical: rows.filter((r) => r.same).length, decisions: rows.filter((r) => r.chrome.fid === r.node.fid && r.chrome.F === r.node.F && r.chrome.kc === r.node.kc).length, rows };
  fs.writeFileSync(out, JSON.stringify(S, null, 1)); console.log(`chrome = node: ${S.identical}/${S.total} bit-identical, decisions ${S.decisions}/${S.total}`);
})().catch((e) => { console.error(e); process.exit(1); });
