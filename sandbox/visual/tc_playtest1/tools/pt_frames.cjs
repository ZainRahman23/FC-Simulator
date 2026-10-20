// tc_playtest1/tools/pt_frames.cjs — a session record (tools/pt_record.mjs / PT.record()) loaded into the page, re-simulated there, and the replay
// seeked to given instants: one screenshot each (camera / overlays chosen); the browser profile is removed afterwards
//   PUPPETEER_NODE_MODULES=<dir> node pt_frames.cjs --rec <record.json> --out <dir> --times "3.55,3.60" [--cam top|side|follow] [--set '{…}'] [--w 1280 --h 800]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "ptf-")), W = +arg("w", 1280), H = +arg("h", 800);
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  try { const p = await b.newPage(); await p.setViewport({ width: W, height: H }); const logs = []; p.on("pageerror", (e) => logs.push(e.message));
    await p.goto(`http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html?external=1&cam=${arg("cam", "top")}`, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()");
    const rec = JSON.parse(fs.readFileSync(arg("rec"))), res = await p.evaluate((r) => window.PT.load(r), rec); console.log("loaded", JSON.stringify(res));
    if (arg("set")) await p.evaluate((o) => window.PT.set(JSON.parse(o)), arg("set"));
    await p.evaluate(() => window.PT.replay("buffer")); const out = arg("out"); fs.mkdirSync(out, { recursive: true });
    for (const t of arg("times").split(",").map(Number)) { await p.evaluate((x) => { window.PT.seek(x); window.PT.tick(0, null); }, t); await p.screenshot({ path: path.join(out, `f_${t.toFixed(3)}.jpg`), type: "jpeg", quality: 85 }); }
    if (logs.length) console.log(logs.slice(0, 5).join("\n")); } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
