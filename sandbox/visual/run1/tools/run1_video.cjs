// run1/tools/run1_video.cjs — ARCHIVAL VIDEO CAPTURE of the RUN-1 viewer. Deterministic and frame-exact: for frame k the viewer's own time is SET to
// t0 + k / fps (RUN1V.set: its own rv1Update + rv1Render), and the frame is composited straight from its WebGL canvas into a 2D canvas — no browser
// chrome, cursor, menus, HUD or debug overlay can appear, and no frame can be dropped or repeated. Static labels (optional) are drawn by this tool on the
// composite, never by the viewer. Encoded with ffmpeg: H.264 High, yuv420p (BT.709), constant fps, no interpolation, no retiming.
// Documentation only: changes nothing in the viewer source, the locomotion, the camera or the simulation (a clip may inject a lane list at runtime).
// usage: PUPPETEER_NODE_MODULES=<dir> FFMPEG=<ffmpeg> node run1_video.cjs --clip ladder|history --out <dir> --frames <scratch dir> [--port 8317]
//        [--unlabeled 1]  (also writes <file>_UNLABELED.mp4: the same frames without any text)
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const { CLIPS, W, H } = require("./run1_video_clips.cjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const C = CLIPS[arg("clip", "ladder")], OUT = arg("out", "."), FR = arg("frames", "frames"), port = arg("port", "8317"), alsoBare = arg("unlabeled") === "1";
const FF = process.env.FFMPEG || "ffmpeg", N = arg("n") ? +arg("n") : Math.round((C.t1 - C.t0) * C.fps);   // --n: a short test run
(async () => {
  for (const d of [OUT, path.join(FR, "lab"), path.join(FR, "bare")]) fs.mkdirSync(d, { recursive: true });
  const browser = await puppeteer.launch({ userDataDir: process.env.RUN1_PROFILE || undefined, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new",
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1600,1200"] });
  const page = await browser.newPage(); await page.setCacheEnabled(false);
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&lanes=${C.inject ? "cmp" : C.preset}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 30000 });
  // configure: the clip's lanes, gameplay zoom / direction / V1 mode, every overlay and the viewer's own lane labels OFF, a fixed layout
  const env = await page.evaluate((C, W, H) => {
    /* global RV1_PRESETS, RV1, rv1Reset */
    if (C.inject) RV1_PRESETS[C.preset] = C.inject;
    const S = window.RUN1V.state; Object.assign(S, { preset: C.preset, zoom: C.zoom, dir: C.dir, v1Mode: C.v1Mode, rate: 1, labels: false, blind: 0, speedMode: "const", sampleTicks: false });
    Object.assign(S.ov, { skel: false, feet: false, com: false, trail: false });
    S.fixedLayout = { W, H, views: C.passes[0].views.map(v => Object.assign({}, v)) }; S.viewA = C.passes[0].viewA; S.viewB = C.passes[0].viewB;
    window.RUN1V.set(C.t0, { reset: true });
    return { ua: navigator.userAgent, dpr: window.devicePixelRatio, run1: typeof RUN1 !== "undefined" ? RUN1.id : null, lanes: S.lanes.map(L => ({ key: L.key, eng: L.eng, label: L.label, v: L.v, off: L.off })) };
  }, C, W, H);
  console.log("viewer:", JSON.stringify(env));
  const meta = { clip: arg("clip", "ladder"), file: C.file, title: C.title, env, frames: [] };
  let legendY = null; const poses = [];                                              // the lanes' screen rows (constant: the rail camera only translates along x)
  for (let k = 0; k < N; k++) {
    const t = C.t0 + k / C.fps;
    const r = await page.evaluate((C, W, H, t, legendY0) => {
      /* global rv1Proj */
      const S = window.RUN1V.state, g = document.getElementById("gl"), dpr = g.width / W;
      const comp = window.__comp || (window.__comp = document.createElement("canvas")); comp.width = g.width; comp.height = g.height;
      const c = comp.getContext("2d"); c.fillStyle = "#0f1412"; c.fillRect(0, 0, comp.width, comp.height);
      let legend = legendY0, cams = {};
      for (const ps of C.passes) {
        S.fixedLayout = { W, H, views: ps.views.map(v => Object.assign({}, v)) }; S.viewA = ps.viewA; S.viewB = ps.viewB;
        window.RUN1V.set(t);                                       // the viewer's own update + render at exactly t (a repeat at the same t re-renders only)
        for (const v of S.fixedLayout.views) { c.drawImage(g, v.x * dpr, v.y * dpr, v.w * dpr, v.h * dpr, v.x * dpr, v.y * dpr, v.w * dpr, v.h * dpr); cams[v.id] = v; }
        if (!legend && cams.game && C.lanes) { legend = {}; for (const L of S.lanes) { const p = rv1Proj(cams.game.cam, cams.game, dpr, [L.sim.x, 0.9, -L.sim.y]); legend[L.key] = p ? p[1] : null; } }
      }
      // locomotion fingerprint of every lane (FNV-1a over the float32 bit patterns of every joint world matrix) — compared with an independent replay
      const fnv = (h, u) => { for (let b = 0; b < 4; b++) { h ^= (u >>> (b * 8)) & 255; h = Math.imul(h, 16777619) >>> 0; } return h; };
      const lanes = S.lanes.map(L => { let h = 2166136261; for (const m of L.fk.world) { const u = new Uint32Array(Float32Array.from(m).buffer); for (let i = 0; i < 16; i++) h = fnv(h, u[i]); }
        return { key: L.key, v: L.sim.v, x: L.sim.x, phase: L.A ? L.A.phase : null, h: h.toString(16), W: [].concat(...L.fk.world.map(m => Array.from(Float32Array.from(m)))) }; });
      const bare = comp.toDataURL("image/png");
      // static labels (drawn by this tool, on the composite only)
      const box = (txt, x, y, px, col, right) => { c.font = `600 ${px * dpr}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; if (right) x -= w;   // right: x is the right edge
        c.fillStyle = "rgba(8,12,10,0.62)"; c.fillRect(x - 5 * dpr, y - (px * 0.8 + 4) * dpr, w + 10 * dpr, (px + 7) * dpr); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); };
      if (C.viewTitles) for (const id in C.viewTitles) { const v = cams[id]; if (v) box(C.viewTitles[id], (v.x + 10) * dpr, (v.y + 20) * dpr, 12, id === "game" ? "#e6efe9" : "#5ee0ff"); }
      if (C.lanes && legend) for (const key in C.lanes) if (legend[key] != null) box(C.lanes[key], (cams.game.x + 12) * dpr, legend[key] + 5 * dpr, 13, "#5ee0ff");
      if (C.cellTitles) C.passes.forEach((ps, pi) => ps.views.forEach((v, vi) => box(C.cellTitles[pi * 2 + vi], (v.x + 12) * dpr, (v.y + 24) * dpr, 14, "#e6efe9")));
      if (C.caption) box(C.caption, comp.width - 14 * dpr, comp.height - 12 * dpr, 12, "#c9d6cf", true);
      return { t: S.t, lanes, legend, lab: comp.toDataURL("image/png"), bare };
    }, C, W, H, t, legendY);
    legendY = r.legend;
    fs.writeFileSync(path.join(FR, "lab", String(k).padStart(5, "0") + ".png"), Buffer.from(r.lab.split(",")[1], "base64"));
    if (alsoBare) fs.writeFileSync(path.join(FR, "bare", String(k).padStart(5, "0") + ".png"), Buffer.from(r.bare.split(",")[1], "base64"));
    for (const L of r.lanes) { poses.push(Buffer.from(new Float64Array(L.W).buffer)); delete L.W; }        // every lane's joint world matrices → <frames>/pose.f64 (verification input)
    meta.frames.push({ k, t, viewerT: r.t, lanes: r.lanes });
    if (k % 60 === 0) process.stdout.write(`frame ${k}/${N} t ${t.toFixed(3)}\n`);
  }
  fs.writeFileSync(path.join(FR, "pose.f64"), Buffer.concat(poses));
  meta.logs = logs.filter(l => !/favicon/.test(l) && !/status of 404/.test(l));
  await browser.close();
  // encode: the PNG sequence at its own rate → H.264 (no frame-rate conversion, no interpolation, no retiming)
  const enc = (dir, file) => { const args = ["-hide_banner", "-loglevel", "error", "-y", "-framerate", String(C.fps), "-i", path.join(dir, "%05d.png"),
      "-vf", "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-g", String(C.fps), "-r", String(C.fps), "-movflags", "+faststart", path.join(OUT, file)];
    cp.execFileSync(FF, args, { stdio: "inherit" }); return { file, ffmpegArgs: args.map(a => a.startsWith("/") ? path.basename(a) : a) }; };
  meta.encoded = [enc(path.join(FR, "lab"), C.file + ".mp4")]; if (alsoBare) meta.encoded.push(enc(path.join(FR, "bare"), C.file + "_UNLABELED.mp4"));
  meta.capture = { tool: "sandbox/visual/run1/tools/run1_video.cjs", clipDef: "sandbox/visual/run1/tools/run1_video_clips.cjs", css: [W, H], dpr: 2, px: [W * 2, H * 2], fps: C.fps, nFrames: N, t0: C.t0, t1: C.t1, ffmpeg: cp.execFileSync(FF, ["-version"]).toString().split("\n")[0] };
  fs.writeFileSync(path.join(OUT, C.file + ".capture.json"), JSON.stringify(meta, null, 1));
  console.log(`${N} frames → ${meta.encoded.map(e => e.file).join(", ")}; logs: ${meta.logs.length ? meta.logs.join(" | ") : "clean"}`);
})().catch(e => { console.error(e); process.exit(1); });
