// PPR-3 VISUAL CAPTURE (presentation only): N synchronised panels (CURRENT V2 | S2 | S2 + P2), the same recorded step in every panel. The frozen
// RUN-1 viewer + frozen character renderer + the TRC-1 runner mapping, as TRC-1 / PPR-1 / PPR-2; the camera is either CAMERA_V1 (gameplay, zoom
// with subject centring) or one of the viewer's own close orbit views (e.g. "front", "side": RV1_ANGLES, unchanged) — no viewer code is modified.
// Two variants: CLEAN (mesh only) and OVERLAY (V2 skeleton, COM + ground projection, support polygon = hull of loaded turf contacts, turf contact
// forces, per-foot ground reaction). Speed per view: `every` recorded steps per video frame at 60 fps (4 = normal speed, 1 = 0.25× slow motion).
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node ppr3_capture.cjs --clips <dir> --views <views.json> --archive <tag archive> --out <dir> [--only id,id]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8382"), ONLY = arg("only", null), SPAWNED = [];
const META = JSON.parse(fs.readFileSync(path.join(CL, "meta.json"))), cache = {}, load = (k) => cache[k] || (cache[k] = JSON.parse(fs.readFileSync(path.join(CL, k + ".json"))).frames);
const VIEWS = JSON.parse(fs.readFileSync(arg("views")));
(async () => {
  const root = path.join(OUT, "_serve"); fs.mkdirSync(root, { recursive: true });
  for (const d of ["sandbox", "assets"]) { const l = path.join(root, d); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ARCH, d), l); }
  fs.copyFileSync(process.env.MP4_MUXER, path.join(root, "mp4-muxer.js"));
  const srv = cp.spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1", "--directory", root], { stdio: "ignore" }); SPAWNED.push(srv); await new Promise(r => setTimeout(r, 900));
  const browser = await puppeteer.launch({ userDataDir: path.join(OUT, "_profile"), executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,1100"] });
  global.__browser = browser; const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: 1500, height: 1100, deviceScaleFactor: 1 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&lanes=diag`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 60000 });
  await page.addScriptTag({ url: `http://127.0.0.1:${port}/mp4-muxer.js` });
  await page.evaluate(() => { Object.assign(RV1, { labels: false, blind: 0, rate: 1 }); Object.assign(RV1.ov, { skel: false, feet: false, com: false, trail: false }); });
  const capture = { tool: "ppr3_capture.cjs", views: {} }, STRIP = 64;
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue;
    const seqs = V0.panels.map(p => load(p.k).filter(f => f.n % V0.every === 0 && f.n >= (V0.from || 0) && f.n <= (V0.to ?? 1e9))), N = Math.min(...seqs.map(s => s.length)), CW = V0.W * V0.panels.length, CH = V0.H + STRIP;
    for (const variant of (V0.variants || ["clean", "overlay"])) { const t0 = Date.now(), vid = `${V0.id}_${variant}`;
      await page.evaluate((CW, CH) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: 60 }, fastStart: "in-memory" });
        const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * 60 * 0.12), framerate: 60, hardwareAcceleration: "prefer-software", latencyMode: "quality" });
        window.__enc = { enc, muxer }; window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH);
      for (let k = 0; k < N; k++) {
        const r = await page.evaluate((V0, Fs, k, N, variant, save) => {
          /* global RV1, rv1Render, rv1Proj */
          const S = RV1, gl = S.R.gl, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H; c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
          const box = (txt, x, y, px, col, bg) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; c.fillStyle = bg || "rgba(8,12,10,0.75)"; c.fillRect(x - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); };
          Fs.forEach((F, pi) => { const x0 = pi * W, P0 = V0.panels[pi];
            const lane = { key: "runner", i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: F.auth.runner[0], y: F.auth.runner[1], heading: 0, v: 0, vx: 0, vy: 0 }, fk: { joint: F.runner.joint, tip: F.runner.tip, world: [] }, skin: new Float32Array(F.runner.skin), pose: { legs: { L: { st: false }, R: { st: false } } } };
            const game = V0.camera === "game"; S.fixedLayout = { W, H, views: [game ? { id: "game", x: 0, y: 0, w: W, h: H } : { id: "A", subject: "runner", x: 0, y: 0, w: W, h: H }] }; if (!game) S.viewA = "runner:" + V0.camera;
            S.zoom = V0.zoom || 1; S.lanes = [lane]; S.run1 = null; rv1Render(); const vw = S.fixedLayout.views[0], cam = vw.cam; gl.finish(); c.drawImage(document.getElementById("gl"), 0, 0, W, H, x0, 0, W, H);
            const Pj = (q) => { const a = rv1Proj(cam, vw, 1, q); return a ? [a[0] + x0, a[1]] : null; };
            if (variant === "overlay") { c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip(); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x0, 0, W, H);
              if (F.support && F.support.length > 2) { const q = F.support.map(Pj).filter(Boolean); c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = "rgba(90,200,255,0.18)"; c.fill(); c.strokeStyle = "rgba(120,220,255,0.9)"; c.lineWidth = 1.5; c.stroke(); }
              c.strokeStyle = "rgba(240,250,255,0.98)"; c.lineWidth = 2.2; for (const [a, b] of F.skelR) { const p = Pj(a), q = Pj(b); if (!p || !q) continue; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); c.fillStyle = "#f0faff"; c.beginPath(); c.arc(p[0], p[1], 2.6, 0, 7); c.fill(); }
              const p = Pj(F.com), g = Pj([F.com[0], 0.003, F.com[2]]); if (p && g) { c.setLineDash([4, 4]); c.strokeStyle = "#7dffb0"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(g[0], g[1]); c.stroke(); c.setLineDash([]); c.fillStyle = "#7dffb0"; c.beginPath(); c.arc(p[0], p[1], 6, 0, 7); c.fill(); c.beginPath(); c.arc(g[0], g[1], 4, 0, 7); c.fill(); }
              for (const t of F.turf || []) { const q = Pj(t.p); if (!q) continue; c.fillStyle = "rgba(90,200,255,0.9)"; c.beginPath(); c.arc(q[0], q[1], Math.min(8, 1.5 + Math.sqrt(Math.max(0, t.F)) * 0.22), 0, 7); c.fill(); }
              c.restore(); if (F.feetN) box(`ground reaction  L ${F.feetN[0].toFixed(0)} N · R ${F.feetN[1].toFixed(0)} N  (body weight 725 N)`, x0 + 10, H - 14, 11, "#bff0ff"); }
            box(P0.l, x0 + 10, 24, 14, "#ffffff");
            if (F.tContactMs != null) { const t = F.tContactMs, mk = (V0.marks || []).find(ms => Math.abs(t - ms) < 2.1 * V0.every); box(t < 0 ? `t ${t.toFixed(0)} ms (before the perturbation)` : `t +${t.toFixed(0)} ms after the perturbation began`, x0 + W - 300, 24, 13, mk != null ? "#1a1a10" : "#ffe7a3", mk != null ? "rgba(255,212,94,0.95)" : null); }
            else box(`t ${(F.n / 240).toFixed(2)} s`, x0 + W - 110, 24, 13, "#ffe7a3"); });
          const F = Fs[0], y0 = H, Tb = { x: 12, w: comp.width - 24, y: y0 + 8, h: 8 }; c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, 64);
          c.fillStyle = "#2a3a33"; c.fillRect(Tb.x, Tb.y, Tb.w, Tb.h); const xk = Tb.x + (k + 0.5) * Tb.w / N; c.fillStyle = "#fff"; c.fillRect(xk - 1.5, Tb.y - 3, 3, Tb.h + 6);
          c.font = "600 12px -apple-system, Helvetica, Arial"; c.fillStyle = "#ffe7a3"; c.fillText(`record step ${F.n} · ${(F.n * 1000 / 240).toFixed(1)} ms after the entry${F.tContactMs != null ? ` · ${F.tContactMs >= 0 ? "+" : ""}${F.tContactMs.toFixed(1)} ms after the perturbation began` : ""}`, 12, y0 + 34);
          c.font = "600 11px -apple-system, Helvetica, Arial"; c.fillStyle = "#c9d6cf"; c.fillText(`PPR-3 · TRC-1 runner rendering · runner alone · ${V0.note} · ${V0.camera === "game" ? "CAMERA_V1 zoom " + V0.zoom + "×" : "viewer close view: " + V0.camera} · ${V0.every === 4 ? "normal speed (60 fps)" : (4 / V0.every) + "× slow motion"} · ${variant === "overlay" ? "OVERLAY: skeleton · COM + projection (green) · support polygon + contacts (blue)" : "CLEAN"}`, 12, y0 + 52);
          const E = window.__enc, dur = 1e6 / 60, vf = new VideoFrame(comp, { timestamp: Math.round(k * dur), duration: Math.round(dur) }); E.enc.encode(vf, { keyFrame: k % 30 === 0 }); vf.close();
          return save ? { png: comp.toDataURL("image/png") } : {};
        }, V0, seqs.map(s => s[k]), k, N, variant, !!V0.saveFrames);
        if (r.png) { const d = path.join(OUT, "frames", vid); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, String(k).padStart(4, "0") + ".png"), Buffer.from(r.png.split(",")[1], "base64")); } }
      const v = await page.evaluate(async () => { const E = window.__enc; await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const b = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { b64: btoa(s), err: window.__encErr || null }; });
      if (v.err) throw new Error(v.err); fs.mkdirSync(path.join(OUT, "video"), { recursive: true }); fs.writeFileSync(path.join(OUT, "video", vid + ".mp4"), Buffer.from(v.b64, "base64"));
      capture.views[V0.id] = { ...(capture.views[V0.id] || {}), panels: V0.panels, frames: N, size: [CW, CH], camera: V0.camera, zoom: V0.zoom, every: V0.every, videos: { ...((capture.views[V0.id] || {}).videos || {}), [variant]: vid + ".mp4" } };
      console.log(`${vid}: ${N} frames ${CW}×${CH} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); } }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l)); const cf = path.join(OUT, "capture.json"), prev = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf)) : { views: {} };
  capture.views = { ...prev.views, ...capture.views }; fs.writeFileSync(cf, JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} if (global.__browser) global.__browser.close().catch(() => {}); setTimeout(() => process.exit(1), 3000); });
