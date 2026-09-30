// one headless Chrome against the physical-character harness (V1.1 anatomy pass): boot, cross-runtime hash check (browser vs Node) for
// the V1.1 suites, then captures. usage: node v11_cap.js --out dir [--hash plan.json] [--shots shots.json]
module.paths.unshift(process.env.PUPPETEER_NODE_MODULES);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "v11cap"), URL_ = opt("--url", "http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=C&test=QS20&calib=V1.1");
const HASH = opt("--hash") ? JSON.parse(fs.readFileSync(opt("--hash"), "utf8")) : [], SHOTS = opt("--shots") ? JSON.parse(fs.readFileSync(opt("--shots"), "utf8")) : [];
const HOOK = { D: "GATED_TEST", A: "GATEA_DROP", B: "GATEB_TEST", C: "GATEC1_TEST", C2: "GATEC2_TEST", C3: "GATEC3_TEST" };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: path.join(OUT, ".udd"), args: ["--no-sandbox", "--use-angle=metal"] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 }); const errs = [];
    p.on("pageerror", e => errs.push(String(e).slice(0, 400))); p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 300)); });
    await p.goto(URL_, { waitUntil: "load" });
    for (let i = 0; i < 600; i++) { const s = await p.evaluate(() => window.GATEA_READY ? 1 : window.GATEA_ERROR ? 2 : 0); if (s) break; await new Promise(r => setTimeout(r, 100)); }
    const st = await p.evaluate(() => ({ ready: !!window.GATEA_READY, err: window.GATEA_ERROR || null })); if (!st.ready) { console.log("NOT READY", JSON.stringify(st), errs); return; }
    let same = 0, n = 0; const t0 = Date.now();
    for (const h of HASH) { await p.evaluate((c, v, ar, pr) => window.PC_SETCALIB(c, v, ar, pr), h.calib, h.ctrlv || "", h.arms ?? false, h.prot ?? false); const got = await p.evaluate((f, k) => window[f](k), HOOK[h.suite], h.test);
      n++; if (got === h.hash) same++; console.log(`${h.calib.padEnd(5)} ${(h.ctrlv || "-").padEnd(6)} ${h.suite.padEnd(3)} ${(h.test + (h.arms ? " +arms" : "") + (h.prot ? " +prot" : "")).padEnd(24)} browser ${String(got).padEnd(9)} node ${String(h.hash).padEnd(9)} ${got === h.hash ? "IDENTICAL" : "DIFFERENT"}`); }
    if (n) console.log(`cross-runtime: ${same}/${n} identical (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    let cur = null;
    for (const s of SHOTS) { const key = `${s.calib}|${s.ctrlv || ""}|${s.suite}|${s.test}|${s.arms}|${s.prot}`;
      if (key !== cur) { await p.evaluate((c, v, a, pr) => window.PC_SETCALIB(c, v, a, pr), s.calib, s.ctrlv || "", s.arms ?? null, s.prot ?? null); await p.evaluate((f, k) => window[f](k), HOOK[s.suite], s.test); cur = key; }
      const r = await p.evaluate((o) => window.GATEA_SET(o), s); await new Promise(r_ => setTimeout(r_, 150));
      await p.screenshot({ path: path.join(OUT, s.name + ".png") }); console.log("shot", s.name, JSON.stringify(r)); }
    if (errs.length) console.log("errors", errs);
  } finally { await b.close(); }
})();
