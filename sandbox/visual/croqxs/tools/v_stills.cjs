// vocab1/tools/v_stills.cjs — stills of curated cases at fixed moments around the decisive contact (close side camera), for a visual check
//   PT_TMP=… PUPPETEER_NODE_MODULES=… node v_stills.cjs --out dir --cases "ELASTICO·NORMAL,SCISSORS·NORMAL" --at "-0.25,-0.1,0,0.12"
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "vst-")), cases = arg("cases").split(","), at = arg("at", "-0.25,-0.1,0,0.12").split(",").map(Number), cam = arg("cam", "explosion"); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,900"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 900 }); await p.goto("http://127.0.0.1:8361/sandbox/visual/vocab1_lab.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(600);
    for (const key of cases) { const [tech, variant] = key.split("·");
      const ok = await p.evaluate((tech, variant) => { const bs = [...document.querySelectorAll("#labPanel [data-case]")]; const card = document.querySelector(`#labPanel .card[data-tech="${tech}"]`); if (!card) return false; const b = [...card.querySelectorAll("[data-case]")].find((x) => (variant === "NORMAL" ? x.classList.contains("play") : x.textContent === variant)); if (!b) return false; b.click(); return true; }, tech, variant);
      if (!ok) { console.log("no case", key); continue; } await sleep(500);
      const dec = await p.evaluate(() => { const S = window.PT.V.labSum, ph = S.phases.find((x) => x.tDecisive != null); return ph ? ph.tDecisive : 0.6; });
      await p.evaluate((cam) => { const V = window.PT.V; V.camId = cam; V.labCam = cam; document.getElementById("selCam").value = cam; V.cam = null; V.lastShown = null; }, cam);
      for (const dt of at) { await p.evaluate((dt, dec) => { const V = window.PT.V, R = V.replay; R.playing = false; R.t = V.labT0 + dec + dt - 0.15; R.playing = true; R.rate = 1; }, dt, dec); await sleep(160); await p.evaluate(() => { window.PT.V.replay.playing = false; }); await sleep(120);
        await p.screenshot({ path: path.join(OUT, `${tech}_${variant}_${dt >= 0 ? "+" : ""}${dt.toFixed(2)}.jpg`), type: "jpeg", quality: 78, clip: { x: 360, y: 100, width: 1140, height: 640 } }); } }
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
