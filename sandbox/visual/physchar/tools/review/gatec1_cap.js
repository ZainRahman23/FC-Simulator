// one headless Chrome against the Gate B harness: boot, optional cross-runtime hash check of every test, then captures
// usage: node gateb_cap.js --out dir [--hash --suite results.json] [--shots file.json]
module.paths.unshift(process.env.PUPPETEER_NODE_MODULES);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "gbcap"), URL_ = opt("--url", "http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=C&test=SV_static"), SHOTS = opt("--shots") ? JSON.parse(fs.readFileSync(opt("--shots"), "utf8")) : [];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: path.join(OUT, ".udd"), args: ["--no-sandbox", "--use-angle=metal"] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 }); const errs = [];
    p.on("pageerror", e => errs.push(String(e).slice(0, 400))); p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 300)); });
    await p.goto(URL_, { waitUntil: "load" });
    for (let i = 0; i < 600; i++) { const s = await p.evaluate(() => window.GATEA_READY ? 1 : window.GATEA_ERROR ? 2 : 0); if (s) break; await new Promise(r => setTimeout(r, 100)); }
    const st = await p.evaluate(() => ({ ready: !!window.GATEA_READY, err: window.GATEA_ERROR || null })); if (!st.ready) { console.log("NOT READY", JSON.stringify(st), errs); return; }
    if (a.includes("--hash")) { const suite = JSON.parse(fs.readFileSync(opt("--suite"), "utf8")).results;
      for (const r of suite) { const h = await p.evaluate((k) => window.GATEC1_TEST(k), r.test); console.log(`test ${r.test.padEnd(14)} browser ${h}  node ${r.hash}  ${h === r.hash ? "IDENTICAL" : "DIFFERENT"}`); } }
    let cur = null;
    for (const s of SHOTS) {
      if (s.test !== cur) { await p.evaluate((k) => window.GATEC1_TEST(k), s.test); cur = s.test; }
      const r = await p.evaluate((o) => window.GATEA_SET(o), s); await new Promise(r_ => setTimeout(r_, 150));
      await p.screenshot({ path: path.join(OUT, s.name + ".png") }); console.log("shot", s.name, JSON.stringify(r));
    }
    if (errs.length) console.log("errors", errs);
  } finally { await b.close(); }
})();
