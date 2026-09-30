// one headless Chrome against the Gate A harness: boot, cross-runtime hash check per drop, and a list of captures
// usage: node gatea_cap.js --out dir [--hash] [--shots '[{"drop":"B","t":0.2,"cam":"three","mesh":true,"phys":true,"name":"B_mid"}]']
module.paths.unshift(process.env.PUPPETEER_NODE_MODULES);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "gcap"), URL_ = opt("--url", "http://127.0.0.1:8171/sandbox/visual/physchar/index.html"), SHOTS = JSON.parse(opt("--shots", "[]"));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: path.join(OUT, ".udd"), args: ["--no-sandbox", "--use-angle=metal"] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: 1500, height: 860, deviceScaleFactor: 1 }); const errs = [];
    p.on("pageerror", e => errs.push(String(e).slice(0, 400))); p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 300)); });
    await p.goto(URL_, { waitUntil: "load" });
    for (let i = 0; i < 400; i++) { const s = await p.evaluate(() => window.GATEA_READY ? 1 : window.GATEA_ERROR ? 2 : 0); if (s) break; await new Promise(r => setTimeout(r, 100)); }
    const st = await p.evaluate(() => ({ ready: !!window.GATEA_READY, err: window.GATEA_ERROR || null })); if (!st.ready) { console.log("NOT READY", JSON.stringify(st), errs); return; }
    if (a.includes("--hash")) {
      const suite = JSON.parse(fs.readFileSync(opt("--suite"), "utf8")).results;
      for (const r of suite) { const h = await p.evaluate((k) => window.GATEA_DROP(k), r.drop); console.log(`drop ${r.drop}: browser ${h}  node ${r.hash}  ${h === r.hash ? "IDENTICAL" : "DIFFERENT"}`); }
    }
    let cur = null;
    for (const s of SHOTS) {
      if (s.drop !== cur) { await p.evaluate((k) => window.GATEA_DROP(k), s.drop); cur = s.drop; }
      const r = await p.evaluate((o) => window.GATEA_SET(o), s); await new Promise(r_ => setTimeout(r_, 120));
      await p.screenshot({ path: path.join(OUT, s.name + ".png") }); console.log("shot", s.name, JSON.stringify(r));
    }
    if (errs.length) console.log("errors", errs);
  } finally { await b.close(); }
})();
