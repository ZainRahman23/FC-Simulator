// dribble1/tools/d1_chrome_fp.cjs — cross-engine replay: every scenario's fingerprint from the lab page in headless Chrome against Node's
// (d1_determinism.mjs output). The page simulates the same scenario / seed / player (HIGH, B) and exposes D1V.state.hash.
// usage: PUPPETEER_NODE_MODULES=<dir> CHROME_PROFILE=<dir> node d1_chrome_fp.cjs <determinism_node.json> <out.json> [port 8361]
const path = require("path"), fs = require("fs");
const puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
(async () => {
  const node = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), port = process.argv[4] || 8361, out = {};
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: process.env.CHROME_PROFILE,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const ver = await b.version(); let ok = 0;
  for (const id of Object.keys(node)) {
    const p = await b.newPage(); await p.setViewport({ width: 800, height: 500 });
    await p.goto(`http://127.0.0.1:${port}/sandbox/visual/dribble1.html?external=1&paused=1&scn=${id}`, { waitUntil: "load" });
    await p.waitForFunction("window.D1V && D1V.state.ready", { timeout: 180000 });
    const r = await p.evaluate(() => ({ hash: D1V.state.hash, ms: D1V.state.simMs, dur: D1V.state.dur })); await p.close();
    const same = r.hash === node[id].node1; if (same) ok++;
    out[id] = { node: node[id].node1, chrome: r.hash, identical: same, chromeSimMs: +r.ms.toFixed(0), dur: r.dur };
    console.log(id.padEnd(18), node[id].node1, r.hash, same ? "IDENTICAL" : "DIFFERENT", r.ms.toFixed(0) + " ms");
  }
  console.log(`Node ${process.version} vs ${ver}: ${ok}/${Object.keys(node).length} identical`);
  fs.writeFileSync(process.argv[3], JSON.stringify({ node: process.version, chrome: ver, identical: ok, total: Object.keys(node).length, results: out }, null, 1)); await b.close();
})();
