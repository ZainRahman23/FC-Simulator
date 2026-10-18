// receive_kill1/tools/rk_chrome.cjs — CHROME vs NODE: the lab page runs the KILL chain for each case (RKL.evalCase); Node runs the same cases;
// the decisions (surface, contact tick), the executed launch, the ball 3 s later and the fingerprint must be bit-identical.
//   PUPPETEER_NODE_MODULES=<dir> node rk_chrome.cjs <out.json> [profile dir]
const path = require("path"), fs = require("fs"), puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
const [out = "rk_chrome.json", prof] = process.argv.slice(2);
const CASES = []; for (const c of [{ v: 2 }, { v: 12 }, { v: 22 }, { v: 30 }, { v: 8, h: 0.30, drop: -12 }, { v: 8, h: 0.40, drop: 25 }, { v: 8, h: 0.95, drop: 35, surface: "THIGH" }, { v: 16, h: 0.95, drop: 35, surface: "THIGH" }, { v: 8, h: 1.32, drop: 20, surface: "CHEST" }, { v: 20, h: 1.32, drop: 20, surface: "CHEST" }, { v: 6, h: 1.78, drop: 15, surface: "HEAD" }, { v: 15, h: 1.78, drop: 25, surface: "HEAD" }, { v: 12, bear: 60 }, { v: 10, h: 2.0, drop: 20 }, { v: 12, h: 1.30, drop: 50 }])
  for (const [bc, draw] of [[10, "seed3"], [60, "TYPICAL"], [99, "seed7"]]) CASES.push({ cond: c, bc, draw });
(async () => {
  const node = await import(path.resolve(__dirname, "rk_chrome_node.mjs")), N = await node.run(CASES);
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const p = await b.newPage(); await p.goto("http://127.0.0.1:8361/sandbox/visual/receive_kill1_lab.html?external=1&paused=1&ladder=0", { waitUntil: "load" });
  await p.waitForFunction("window.RKL_READY === true", { timeout: 120000 });
  const C = await p.evaluate((cases) => cases.map((c) => RKL.evalCase(c.cond, c.bc, c.draw)), CASES); await b.close();
  const rows = CASES.map((c, i) => { const a = C[i], n = N[i], same = JSON.stringify(a) === JSON.stringify(n); return { case: c, same, chrome: a, node: n }; });
  const S = { total: rows.length, identical: rows.filter((r) => r.same).length, decisions: rows.filter((r) => r.chrome.surface === r.node.surface && r.chrome.kc === r.node.kc).length, rows };
  fs.writeFileSync(out, JSON.stringify(S, null, 1)); console.log(`chrome = node: ${S.identical}/${S.total} bit-identical, decisions ${S.decisions}/${S.total}`);
})().catch((e) => { console.error(e); process.exit(1); });
