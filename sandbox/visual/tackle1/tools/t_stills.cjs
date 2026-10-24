// tackle1/tools/t_stills.cjs — stills from the TACKLING LAB (headless Chrome): a case at given times and cameras → JPEGs (NOT committed:
// real players' models — the scratchpad). PUPPETEER_NODE_MODULES=<dir> node t_stills.cjs --case carry-jog-l --at -0.1,0,0.1,0.2 --cams front,sideL --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:8363/sandbox/visual/"), OUT = arg("out", "."), CASE = arg("case", "carry-jog-l"), CAMS = arg("cams", "front").split(","), REL = arg("rel", "commit"), AT = arg("at", "0,0.1,0.2,0.3").split(",").map(Number);
(async () => { fs.mkdirSync(OUT, { recursive: true }); const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "tk-"));
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,900"] });
  const p = await b.newPage(); await p.setViewport({ width: +arg("w", 1500), height: +arg("h", 900) }); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(BASE + `tackle1_lab.html?case=${CASE}&external=1&play=0${arg("q", "")}`, { waitUntil: "load" }); await p.waitForFunction(() => window.TL && TL.ready(), { timeout: 120000 });
  const T = await p.evaluate(() => TL.times()), rep = await p.evaluate(() => TL.report()); console.log(JSON.stringify(T), JSON.stringify(rep.rep.action ? rep.rep.action.outcome : rep.rep.requests[0]), "frames", rep.frames, "ms", rep.ms.toFixed(0));
  const base = REL === "commit" && T.commit != null ? T.commit : REL === "contact" && T.hits && T.hits.length ? T.hits[0] : REL === "req" && T.req != null ? T.req : 0;
  if (arg("opts")) await p.evaluate((o) => TL.set(o), JSON.parse(arg("opts")));
  for (const cam of CAMS) for (const dt of AT) { await p.evaluate((c) => TL.cam(c), cam); await p.evaluate((t) => TL.seek(t), base + dt); await new Promise((r) => setTimeout(r, 60));
    const f = path.join(OUT, `${CASE}_${cam}_${REL}${dt >= 0 ? "+" : ""}${dt.toFixed(2)}.jpg`); const el = await p.$("#stage"); await el.screenshot({ path: f, type: "jpeg", quality: 78 }); console.log(f); }
  if (errs.length) console.log("ERRORS", errs.slice(0, 5)); await b.close(); fs.rmSync(prof, { recursive: true, force: true }); })().catch((e) => { console.error(e); process.exit(2); });
