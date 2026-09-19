// Scaling measurement for the SKELETAL_3D backend: keeper draw cost (graph+IK+GL, flushed) and full-frame cost vs number of characters.
//   node perf_scale.js --copies 0,4,9,21 --out perf.json
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const COPIES = opt("--copies", "0,4,9,21").split(",").map(Number), OUT = opt("--out", "perf.json"), URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-perf"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.goto(URL + "?gkBackend=3d&r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  const res = await p.evaluate((COPIES) => {
    if (!(S.pt && S.pt.on)) ptEnter(); S.pb.playing = false; GK_PRESENTATION.set("SKELETAL_3D"); ptReset(); ptGkScenario(42); S.pt.paused = true;
    for (let k = 0; k < 55; k++) { ptStep(); gkPresentationDraw(S.pt, S.pt.gk, 1 / 60); }   // mid-flight pose (IK active)
    const gl = GK3D.R.gl, px = new Uint8Array(4); const tm = (f, n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) f(); return +((performance.now() - t0) / n).toFixed(3); };
    const rows = []; const info = { renderer: (function () { const d = gl.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); })(), target: null };
    for (const c of COPIES) {
      GK3D.copies = c; gkPresentationDraw(S.pt, S.pt.gk, 1 / 60);
      const keeper = tm(() => { gkPresentationDraw(S.pt, S.pt.gk, 1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }, 20);
      const graphOnly = tm(() => { const cur = S.gkAnim.cur; const desc = gkActionDescription(S.pt, S.pt.gk, cur); const g = gkGraphEvaluate(desc, GK_CLIP_FAR_DIVE, GK3D.skel, GK3D.state); gkGraphSolve(desc, g, GK3D.skel, GK3D.state); }, 50) * (c + 1);
      const full = tm(() => { draw(null, 1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }, 5);
      rows.push({ characters: c + 1, keeperDrawMs_flushed: keeper, graphIkMs_estimated: +graphOnly.toFixed(3), glDraws: GK3D.perf.glDraws, fullFrameMs: full, target: GK3D.perf.target });
    }
    GK3D.copies = 0; info.target = GK3D.perf.target; info.canvas = [cv.width, cv.height];
    const spriteOnly = (function () { GK_PRESENTATION.set("SPRITE"); const v = tm(() => gkPresentationDraw(S.pt, S.pt.gk, 1 / 60), 20); GK_PRESENTATION.set("SKELETAL_3D"); return v; })();
    const fullSprite = (function () { GK_PRESENTATION.set("SPRITE"); const v = tm(() => draw(null, 1 / 60), 5); GK_PRESENTATION.set("SKELETAL_3D"); return v; })();
    return { info, rows, spriteKeeperMs: spriteOnly, fullFrameSpriteMs: fullSprite };
  }, COPIES);
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();
})();
