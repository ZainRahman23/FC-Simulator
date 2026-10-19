// receive_elite1/tools/re1_chrome.cjs — CHROME = NODE: the lab (animation off) computes the same simulation as the Node tools, fingerprint for fingerprint.
//   PUPPETEER_NODE_MODULES=<dir> node re1_chrome.cjs <out.json> <node.json> <profile dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
(async () => { const node = JSON.parse(fs.readFileSync(process.argv[3], "utf8")), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: process.argv[4], args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const res = { runs: 0, identical: 0, rows: [] };
  try { const p = await b.newPage(); await p.setViewport({ width: 900, height: 600 });
    for (const spec of Object.keys(node)) { const [id, pipe] = spec.split("@"), m = /^(.*)_B(\d+)_D(\d+)_A(\d+)$/.exec(id);
      await p.goto(`http://127.0.0.1:8361/sandbox/visual/receive_elite1.html?external=1&paused=1&anim=0&graph=0&case=${m[1]}&b=${m[2]}&d=${m[3]}&a=${m[4]}&pipe=${pipe || "NEW"}`, { waitUntil: "load" });
      await p.waitForFunction("window.D1V && window.D1V.ready && window.D1V.ready() === true", { timeout: 180000 }); const h = await p.evaluate(() => window.D1V.state.sims[0].hash);
      res.runs++; const same = h === node[spec]; if (same) res.identical++; res.rows.push({ spec, chrome: h, node: node[spec], same }); console.log(spec, same ? "IDENTICAL" : "DIFFERENT"); } }
  finally { await b.close(); } fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1)); console.log(res.identical + "/" + res.runs); })().catch((e) => { console.error(e.message); process.exit(1); });
