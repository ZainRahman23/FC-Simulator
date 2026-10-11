// CXA-1 VISUAL CAPTURE (visualisation only): two synchronised panels per frame, same frozen RUN-1 viewer + frozen character renderer + CAMERA_V1 as every
// PVP-1A-DX / ABI-1 visual. LEFT: the rendered footballers exactly as before (what you saw). RIGHT: the same frame faded, with the ACTUAL V2 collision shapes
// of both players drawn as exact perspective silhouettes (runner cyan, tackler orange; RED when the audit measures that shape penetrating beyond the solver's
// 5 mm penetration slop), the Jolt contact manifold points / normals the solver used for this configuration, and the audit's signed separation of the
// closest pairs. Strip: step, time since first contact, maximum collider penetration (audit) and maximum visible mesh intersection (mesh audit).
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node cxa1_capture.cjs --clips <dir> --archive <tag archive> --out <dir> [--only id,id]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8371"), ONLY = arg("only", null), SPAWNED = [];
const META = JSON.parse(fs.readFileSync(path.join(CL, "meta.json"))), load = (k) => JSON.parse(fs.readFileSync(path.join(CL, k + ".json"))).frames;
const TITLE = { DX: "PVP-1A-DX run 1 (committed record, frozen contact set)", CF1: "PVP-1A-DX CF1 variant (ABI-1's input, frozen contact set)", EXT: "ABI-1 A · EXT (restricted contact set: non-leg cross pairs FILTERED by design)" };
const VIEWS = [
  { id: "X_DX", key: "DX", zoom: 6, W: 720, H: 620 }, { id: "X_DX_close", key: "DX", zoom: 16, W: 720, H: 620 },
  { id: "X_CF1", key: "CF1", zoom: 6, W: 720, H: 620 }, { id: "X_CF1_close", key: "CF1", zoom: 16, W: 720, H: 620 },
  { id: "X_EXT", key: "EXT", zoom: 6, W: 720, H: 620 },
  { id: "X_DX_feet", key: "DX", zoom: 16, W: 720, H: 620, crop: { W2: 1440, H2: 1080, cw: 560, ch: 482 } }, { id: "X_CF1_feet", key: "CF1", zoom: 16, W: 720, H: 620, crop: { W2: 1440, H2: 1080, cw: 560, ch: 482 } } ];
(async () => {
  const root = path.join(OUT, "_serve"); fs.mkdirSync(root, { recursive: true });
  for (const d of ["sandbox", "assets"]) { const l = path.join(root, d); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ARCH, d), l); }
  fs.copyFileSync(process.env.MP4_MUXER, path.join(root, "mp4-muxer.js"));
  const srv = cp.spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1", "--directory", root], { stdio: "ignore" }); SPAWNED.push(srv); await new Promise(r => setTimeout(r, 900));
  const browser = await puppeteer.launch({ userDataDir: path.join(OUT, "_profile"), executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,1100"] });
  const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: 1500, height: 1100, deviceScaleFactor: 1 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&lanes=diag`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 60000 });
  await page.addScriptTag({ url: `http://127.0.0.1:${port}/mp4-muxer.js` });
  await page.evaluate(async () => { window.__gab = await ofCharLoad("gabriel"); Object.assign(RV1, { labels: false, blind: 0, rate: 1 }); Object.assign(RV1.ov, { skel: false, feet: false, com: false, trail: false }); });
  const capture = { tool: "cxa1_capture.cjs", views: {} }, STRIP = 70;
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue; const t0 = Date.now(), seq = load(V0.key), N = seq.length, CW = V0.W * 2, CH = V0.H + STRIP, fps = 60;
    await page.evaluate((CW, CH, fps) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: fps }, fastStart: "in-memory" });
      const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * fps * 0.12), framerate: fps, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc = { muxer, enc, fps };
      window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH, fps);
    const idx = [];
    for (let k = 0; k < N; k++) {
      const r = await page.evaluate((V0, F, k, N, title, win) => {
        /* global RV1, rv1Render, rv1Proj, ofCharDraw */
        const S = RV1, gl = S.R.gl, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H; c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
        const lane = (who, P, skinOn) => ({ key: who, i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: F.auth[who][0], y: F.auth[who][1], heading: 0, v: 0, vx: 0, vy: 0 }, fk: { joint: P.joint, tip: P.tip, world: [] }, skin: skinOn ? new Float32Array(P.skin) : null, pose: { legs: { L: { st: false }, R: { st: false } } } });
        const RW = V0.crop ? V0.crop.W2 : W, RH = V0.crop ? V0.crop.H2 : H; S.fixedLayout = { W: RW, H: RH, views: [{ id: "game", x: 0, y: 0, w: RW, h: RH }] }; S.zoom = V0.zoom; S.lanes = [lane("runner", F.runner, true), lane("tackler", F.tackler, false)]; S.run1 = null; rv1Render();
        const vw = S.fixedLayout.views[0], cam = vw.cam; gl.viewport(0, 0, RW, RH); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        ofCharDraw(S.R, window.__gab, new Float32Array(F.tackler.skin), cam.view, cam.proj); gl.finish(); const glc = document.getElementById("gl");
        let cx0 = 0, cy0 = 0, cw = W, ch = H; if (V0.crop) { cw = V0.crop.cw; ch = V0.crop.ch; const m = F.feetRT.map(q => rv1Proj(cam, vw, 1, q)).filter(Boolean); if (m.length) { const mx = m.reduce((a, b) => a + b[0], 0) / m.length, my = m.reduce((a, b) => a + b[1], 0) / m.length; cx0 = Math.max(0, Math.min(RW - cw, mx - cw / 2)); cy0 = Math.max(0, Math.min(RH - ch, my - ch * 0.62)); } }
        c.drawImage(glc, cx0, cy0, cw, ch, 0, 0, W, H); c.save(); c.globalAlpha = 0.33; c.drawImage(glc, cx0, cy0, cw, ch, W, 0, W, H); c.restore();
        const P = (q) => { const a = rv1Proj(cam, vw, 1, q); return a ? [(a[0] - cx0) * W / cw + W, (a[1] - cy0) * H / ch] : null; };
        const box = (txt, x, y, px, col, bg) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; c.fillStyle = bg || "rgba(8,12,10,0.75)"; c.fillRect(x - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); };
        c.save(); c.beginPath(); c.rect(W, 0, W, H); c.clip();
        const hull = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
        for (const s of F.shapes) { const q = s.pts.map(P).filter(Boolean); if (q.length < 3) continue; const h = hull(q); c.beginPath(); h.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
          c.fillStyle = s.hot ? "rgba(255,40,40,0.55)" : s.who === "R" ? "rgba(70,215,255,0.30)" : "rgba(255,160,50,0.30)"; c.fill(); c.strokeStyle = s.hot ? "#ff3030" : s.who === "R" ? "rgba(140,235,255,0.95)" : "rgba(255,190,110,0.95)"; c.lineWidth = s.hot ? 2.2 : 1.1; c.stroke(); }
        for (const x of F.cross) for (const q of x.pts) { const a = P(q.p); if (!a) continue; const e = P([q.p[0] + x.n[0] * 0.06, q.p[1] + x.n[1] * 0.06, q.p[2] + x.n[2] * 0.06]); c.fillStyle = q.lam > 0 ? "#ffe14a" : "rgba(255,225,74,0.45)"; c.beginPath(); c.arc(a[0], a[1], q.lam > 0 ? 3.5 : 2.2, 0, 7); c.fill(); if (e && q.lam > 0) { c.strokeStyle = "#ffe14a"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
        F.near.slice(0, 3).forEach((nr, i) => { const a = P(nr.p); if (!a) return; c.strokeStyle = nr.dmm < -5 ? "#ff5050" : "#ffffff"; c.lineWidth = 1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(W + W - 250, 70 + i * 20); c.stroke(); });
        c.restore();
        box("RENDERED MESHES (what the review showed)", 10, 24, 14, "#ffffff"); box("ACTUAL V2 COLLIDERS (runner cyan · tackler orange · red = penetration > 5 mm slop)", W + 10, 24, 12, "#bff3ff");
        F.near.slice(0, 3).forEach((nr, i) => box(`${nr.key.replace("|", " ↔ ")}: ${nr.dmm >= 0 ? "gap " + nr.dmm.toFixed(1) : "overlap " + (-nr.dmm).toFixed(1)} mm${nr.J ? " · J " + nr.J.toFixed(2) + " N·s" : ""}`, W + W - 250, 70 + i * 20, 11, nr.dmm < -5 ? "#ff8080" : "#e8f6ff"));
        if (F.visible) box(`visible mesh intersection ${F.visible.d10.toFixed(0)} mm (10th-deepest vertex; ${F.visible.n10} vertices > 10 mm)`, 10, H - 14, 11, "#ffd0a0");
        box(`collider max penetration ${F.maxPenMm.toFixed(1)} mm${F.nOverSlop ? ` · ${F.nOverSlop} pair(s) > 5 mm slop` : " (≤ 5 mm slop)"}${F.uncached.length ? ` · ${F.uncached.length} overlapping pair(s) with NO contact (filtered)` : ""}`, W + 10, H - 14, 11, F.nOverSlop ? "#ff9090" : "#b8ffcf");
        const y0 = H; c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, 70); const T = { x: 12, w: comp.width - 24, y: y0 + 8, h: 8 };
        c.fillStyle = "#3fd17a"; c.fillRect(T.x, T.y, T.w * Math.min(1, win / N), T.h); c.fillStyle = "#6a3a36"; c.fillRect(T.x + T.w * Math.min(1, win / N), T.y, T.w * Math.max(0, 1 - win / N), T.h); const xk = T.x + (k + 0.5) * T.w / N; c.fillStyle = "#fff"; c.fillRect(xk - 1.5, T.y - 3, 3, T.h + 6);
        c.font = "600 13px -apple-system, Helvetica, Arial"; c.fillStyle = "#ffe7a3"; c.fillText(`${title} · record step ${F.n} · τ +${F.tauMs.toFixed(2)} ms after activation · viewer zoom ${V0.zoom}× (CAMERA_V1 pose / perspective)${V0.crop ? " · cropped " + (V0.crop.W2 / V0.crop.cw * 720 / 1440).toFixed(2) + "× around the two contacting feet" : ""}`, 12, y0 + 34);
        c.font = "600 11px -apple-system, Helvetica, Arial"; c.fillStyle = "#9fb3a9"; c.fillText("CXA-1 collision-exclusion audit · every recorded 1/240 s step is one frame · colliders = exact silhouettes of the V2 shapes · contact points = the Jolt manifolds the solver used for this configuration (yellow; dimmed = speculative) · green bar = trustworthy window", 12, y0 + 54);
        const E = window.__enc, dur = 1e6 / E.fps, vf = new VideoFrame(comp, { timestamp: Math.round(k * dur), duration: Math.round(dur) }); E.enc.encode(vf, { keyFrame: k % 12 === 0 }); vf.close();
        return { png: comp.toDataURL("image/png") };
      }, V0, seq[k], k, N, TITLE[V0.key], META.runs[V0.key].window);
      const d = path.join(OUT, "frames", V0.id); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, String(k).padStart(4, "0") + ".png"), Buffer.from(r.png.split(",")[1], "base64")); idx.push([seq[k].n, seq[k].tauMs]); }
    const vid = await page.evaluate(async () => { const E = window.__enc; await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const b = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { b64: btoa(s), err: window.__encErr || null }; });
    if (vid.err) throw new Error(vid.err); fs.mkdirSync(path.join(OUT, "video"), { recursive: true }); fs.writeFileSync(path.join(OUT, "video", V0.id + "_0.25x.mp4"), Buffer.from(vid.b64, "base64"));
    capture.views[V0.id] = { key: V0.key, frames: N, size: [CW, CH], zoom: V0.zoom, video: V0.id + "_0.25x.mp4", index: idx, window: META.runs[V0.key].window, seconds: (Date.now() - t0) / 1000 };
    console.log(`${V0.id}: ${N} frames ${CW}×${CH} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l)); const cf = path.join(OUT, "capture.json"), prev = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf)) : { views: {} };
  capture.views = { ...prev.views, ...capture.views }; fs.writeFileSync(cf, JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} });
