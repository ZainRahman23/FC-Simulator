// MIXED / C NATIVE-OUTPUT capture (review tooling): reproduces the approved Mixed composition for the finished character on the
// live scene — environment rasterized natively at density 2 (device scale 2, the page's own 2D pass, keeper layer hidden; nearest 2×
// to the output), the character (+ shared-depth presentation ball) rasterized natively at density 4 in its render-ROI with the
// 4-sample resolve (gk3dRenderLayer), composited at one native character pixel per output pixel. Output 2000×1800 for the review
// clip [600,150,500,450] of the 1100×900 base canvas. Same camera, world scale 1, no fit-to-box. Also writes the exact-crop and the
// enlarged diagnostic crop of the same pixels. Requires python3 + Pillow for the composite step (node has no canvas here).
//   node gk3d_capture_mixed.js --scenario 64 --ticks 100,120,... --out <dir> [--character COURTOIS] [--url ...] [--udd ...]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const IDX = +opt("--scenario", 64), TICKS = opt("--ticks", "100,140,165,190").split(",").flatMap(x => { const m = x.match(/^(\d+)-(\d+)$/); return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i) : [+x]; }), OUT = opt("--out", "mixed"), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), CHARACTER = opt("--character", "COURTOIS"), UDD = opt("--udd", "chrome-mixed"), CLIP = [600, 150, 500, 450], ENV_D = 2, CHAR_D = 4;
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: UDD, args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: ENV_D }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?gkBackend=3d&gkChar=" + CHARACTER.toLowerCase() + "&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); const e = typeof GK_CHAR !== "undefined" && GK_CHAR.get("COURTOIS"); return !!(el && el.style.display === "none" && typeof ptEnter === "function" && e && (e.status === "ready" || e.status === "error")); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  const info0 = await p.evaluate((IDX, CHARACTER) => { if (!(S.pt && S.pt.on)) ptEnter(); S.pb.playing = false; GK_PRESENTATION.set("SKELETAL_3D"); GL3D.character = CHARACTER; ptReset(); ptGkScenario(IDX); gkAnimResetView(); gk3dReset(); S.pt.paused = true; return { RES, cvW: cv.width, cvH: cv.height, status: GK_CHAR.get("COURTOIS").status }; }, IDX, CHARACTER);
  console.log("page", JSON.stringify(info0)); if (info0.RES !== ENV_D) console.warn("RES is", info0.RES, "expected", ENV_D);
  const maxT = Math.max(...TICKS), rec = [];
  for (let k = 0; k <= maxT; k++) {
    const want = TICKS.includes(k);
    const info = await p.evaluate((k, want) => {
      ptStep(); updateRig(1 / 60, null); TRAVEL = RIG.x - 52.5;
      GK3D.hideCharacter = want; if (want) draw(null, 1 / 60); else gkPresentationDraw(S.pt, S.pt.gk, 1 / 60); GK3D.hideCharacter = false;   // capture ticks: the full 2D frame WITHOUT the character layer (the solve still ran; shadow + 2D world drawn)
      const g = S.pt.gk, L = GK3D.last; return { k, t: +S.pt.now.toFixed(4), phase: L && L.g ? L.g.phase : null, sub: L && L.g ? L.g.sub : null, root: [g.x, g.y], ball: [S.pt.b.x, S.pt.b.y, S.pt.b.z], held: S.pt.b.held === "GK", rig: { x: RIG.x, zoom: RIG.zoom }, layer: want ? gk3dRenderLayer(4) : null, roi: GK3D.lastLayer ? GK3D.lastLayer.roi : null };
    }, k, want);
    if (want) {
      const tt = "t" + String(k).padStart(3, "0"); const envPath = path.join(OUT, `env_${IDX}_${tt}.png`);
      await p.screenshot({ path: envPath, clip: { x: CLIP[0], y: CLIP[1], width: CLIP[2], height: CLIP[3] } });                          // device scale 2 → 1000×900 native environment pixels
      let layerPath = null; if (info.layer) { layerPath = path.join(OUT, `layer_${IDX}_${tt}.png`); fs.writeFileSync(layerPath, Buffer.from(info.layer.png.split(",")[1], "base64")); }
      rec.push({ k: info.k, t: info.t, phase: info.phase, sub: info.sub, root: info.root, ball: info.ball, held: info.held, rig: info.rig, env: path.basename(envPath), layer: layerPath ? path.basename(layerPath) : null, roi: info.layer ? info.layer.roi : null, layerW: info.layer ? info.layer.w : null, layerH: info.layer ? info.layer.h : null, density: CHAR_D });
      console.log(k, info.t, info.phase, info.sub, "roi", JSON.stringify(info.roi), "layer", info.layer ? info.layer.w + "x" + info.layer.h : "none");
    }
  }
  fs.writeFileSync(path.join(OUT, `mixed_${IDX}_record.json`), JSON.stringify({ scenario: IDX, clip: CLIP, envDensity: ENV_D, charDensity: CHAR_D, output: [CLIP[2] * CHAR_D, CLIP[3] * CHAR_D], rec, errors: errs }, null, 1));
  await b.close();
  // composite: env (nearest 2×) → character layer at [ (roi.x − clip.x)·4, (roi.y − clip.y)·4 ] one native pixel per output pixel
  const py = `
import json, sys, os
from PIL import Image
d = json.load(open(sys.argv[1])); out = os.path.dirname(sys.argv[1]); cx, cy, cw, ch = d["clip"]; D = d["charDensity"]
for r in d["rec"]:
    env = Image.open(os.path.join(out, r["env"])).convert("RGBA").resize((cw * D, ch * D), Image.NEAREST)
    if r["layer"]:
        lay = Image.open(os.path.join(out, r["layer"])).convert("RGBA"); roi = r["roi"]; env.alpha_composite(lay, (int(round((roi["x"] - cx) * D)), int(round((roi["y"] - cy) * D))))
    env.convert("RGB").save(os.path.join(out, "mixed_%d_t%03d.png" % (d["scenario"], r["k"])))
print("composited", len(d["rec"]))
`;
  console.log(execFileSync("python3", ["-c", py, path.join(OUT, `mixed_${IDX}_record.json`)]).toString().trim());
})();
