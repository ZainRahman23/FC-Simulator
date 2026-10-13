// SUPPORT-1 VISUAL CAPTURE (presentation only). The frozen RUN-1 viewer + frozen character renderer + CAMERA_V1 exactly as every PVP review (pvp0_capture.cjs
// structure), recipient only (MC-1 vinicius skin), with the impactor drawn as its actual collision shape (exact perspective silhouette). Each view is
// rendered twice: CLEAN (mesh + impactor) and DIAGNOSTIC (+ the recipient's actual V2 colliders, foot–turf contact points coloured by slip — green
// sticking, red sliding — the support polygon, the COM ground projection, impactor contact points and per-foot normal load / slip). Panels are
// synchronised to the same recorded step relative to first contact. Every recorded 1/240 s step is one frame at 0.25× (every 4th = 60 Hz at 1×).
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node s1_capture.cjs --clips <dir> --views <json> --archive <tag archive> --out <dir> [--only id,id] [--port p]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8391"), ONLY = arg("only", null), SPAWNED = [];
const META = JSON.parse(fs.readFileSync(path.join(CL, "meta.json"))), cache = {}, load = (k) => cache[k] || (cache[k] = JSON.parse(fs.readFileSync(path.join(CL, k + ".json"))).frames);
const VIEWS = JSON.parse(fs.readFileSync(arg("views")));
(async () => {
  const root = path.join(OUT, "_serve"); fs.mkdirSync(root, { recursive: true });
  for (const d of ["sandbox", "assets"]) { const l = path.join(root, d); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ARCH, d), l); }
  fs.copyFileSync(process.env.MP4_MUXER, path.join(root, "mp4-muxer.js"));
  const srv = cp.spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1", "--directory", root], { stdio: "ignore" }); SPAWNED.push(srv); await new Promise(r => setTimeout(r, 900));
  const browser = await puppeteer.launch({ userDataDir: path.join(OUT, "_profile_" + port), executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,1100"] });
  const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: 1500, height: 1100, deviceScaleFactor: 1 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&lanes=diag`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 60000 });
  await page.addScriptTag({ url: `http://127.0.0.1:${port}/mp4-muxer.js` });
  await page.evaluate(() => { Object.assign(RV1, { labels: false, blind: 0, rate: 1 }); Object.assign(RV1.ov, { skel: false, feet: false, com: false, trail: false }); });
  const capture = { tool: "s1_capture.cjs", views: {} }, STRIP = 64;
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue;
    const seqs = V0.panels.map(p => load(p.k).filter(f => (Math.round(f.tMs * 0.24) % V0.every) === 0)), N = Math.min(...seqs.map(s => s.length)), CW = V0.W * V0.panels.length, CH = V0.H + STRIP;
    for (const variant of V0.variants || ["clean", "diag"]) { const t0 = Date.now(), vid = `${V0.id}_${variant}`;
      await page.evaluate((CW, CH) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: 60 }, fastStart: "in-memory" });
        const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * 60 * 0.12), framerate: 60, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc = { muxer, enc };
        window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; window.__crop = null; }, CW, CH);
      const fcIdx = seqs[0].findIndex(f => f.tMs >= 0), stills = (V0.stillsMs || []).map(ms => seqs[0].findIndex(f => f.tMs >= ms - 1e-6));
      for (let k = 0; k < N; k++) {
        const r = await page.evaluate((V0, Fs, k, N, variant, fcIdx, wantPng) => {
          /* global RV1, rv1Render, rv1Proj */
          const S = RV1, gl = S.R.gl, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H; c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
          const box = (txt, x, y, px, col, bg) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; c.fillStyle = bg || "rgba(8,12,10,0.72)"; c.fillRect(x - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); };
          const hull = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (pts.length < 3) return pts; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
          Fs.forEach((F, pi) => { const x0 = pi * W, P0 = V0.panels[pi], RW = V0.crop ? V0.crop.W2 : W, RH = V0.crop ? V0.crop.H2 : H;
            const lane = { key: "runner", i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: F.auth.runner[0], y: F.auth.runner[1], heading: 0, v: 0, vx: 0, vy: 0 }, fk: { joint: F.runner.joint, tip: F.runner.tip, world: [] }, skin: new Float32Array(F.runner.skin), pose: { legs: { L: { st: false }, R: { st: false } } } };
            S.fixedLayout = { W: RW, H: RH, views: [{ id: "game", x: 0, y: 0, w: RW, h: RH }] }; S.zoom = V0.zoom; S.lanes = [lane]; S.run1 = null; rv1Render(); gl.finish();
            const vw = S.fixedLayout.views[0], cam = vw.cam, glc = document.getElementById("gl");
            let cx0 = 0, cy0 = 0, cw = W, ch = H; if (V0.crop) { cw = V0.crop.cw; ch = V0.crop.ch; window.__crop = window.__crop || {}; if (!window.__crop[pi]) { const m = F.focus.map(q => rv1Proj(cam, vw, 1, q)).filter(Boolean), mx = m.reduce((a, b) => a + b[0], 0) / m.length, my = m.reduce((a, b) => a + b[1], 0) / m.length;
                window.__crop[pi] = [Math.max(0, Math.min(RW - cw, mx - cw / 2 + (V0.crop.dx || 0))), Math.max(0, Math.min(RH - ch, my - ch * (V0.crop.fy || 0.55)))]; } [cx0, cy0] = window.__crop[pi]; }
            c.drawImage(glc, cx0, cy0, cw, ch, x0, 0, W, H);
            const Pj = (q) => { const a = rv1Proj(cam, vw, 1, q); return a ? [(a[0] - cx0) * W / cw + x0, (a[1] - cy0) * H / ch] : null; };
            c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
            const poly = (pts, fill, stroke, lw) => { const q = pts.map(Pj).filter(Boolean); if (q.length < 3) return; const h = hull(q); c.beginPath(); h.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.2; c.stroke(); } };
            if (variant === "diag") { for (const s of F.shapes) poly(s.pts, "rgba(70,215,255,0.26)", "rgba(150,240,255,0.85)", 1);
              const all = [...F.feet.L.pts, ...F.feet.R.pts]; if (all.length >= 3) poly(all, "rgba(255,225,74,0.10)", "rgba(255,225,74,0.95)", 1.6);
              for (const s of ["L", "R"]) { const f = F.feet[s], slide = f.vs != null && f.vs > 0.05; for (const p of f.pts) { const a = Pj(p); if (!a) continue; c.fillStyle = slide ? "#ff5a4a" : "#46e07a"; c.beginPath(); c.arc(a[0], a[1], 2.6, 0, 7); c.fill(); } }
              const g = Pj(F.comG); if (g) { c.strokeStyle = "#ffffff"; c.lineWidth = 2; c.beginPath(); c.arc(g[0], g[1], 6, 0, 7); c.stroke(); c.beginPath(); c.moveTo(g[0] - 9, g[1]); c.lineTo(g[0] + 9, g[1]); c.moveTo(g[0], g[1] - 9); c.lineTo(g[0], g[1] + 9); c.stroke(); } }
            if (F.imp) { poly(F.imp.sil, variant === "diag" ? "rgba(255,150,40,0.55)" : "rgba(196,204,226,0.88)", variant === "diag" ? "rgba(255,200,120,1)" : "rgba(40,48,70,0.95)", 1.6); }
            if (variant === "diag") for (const p of F.ipts || []) { const a = Pj(p); if (!a) continue; c.fillStyle = "#ffe14a"; c.beginPath(); c.arc(a[0], a[1], 4, 0, 7); c.fill(); }
            c.restore();
            box(P0.l, x0 + 10, 22, 14, "#ffffff");
            if (variant === "diag") { const f = F.feet, s = (x) => (x == null ? "air" : (x > 0.05 ? "SLIDE " : "stick ") + x.toFixed(2)); box(`left foot ${f.L.N} N · ${f.L.N > 0 ? s(f.L.vs) : "air"}   right foot ${f.R.N} N · ${f.R.N > 0 ? s(f.R.vs) : "air"}`, x0 + 10, H - 30, 11, "#e8fff0");
              box(`pelvis height ${F.pelvisY.toFixed(2)} m${F.sup ? ` · support confidence L ${F.sup.c[0].toFixed(2)} R ${F.sup.c[1].toFixed(2)}` : ""}${F.imp ? ` · impactor ${F.imp.speed.toFixed(1)} m/s` : ""}`, x0 + 10, H - 12, 11, "#d8f6ff"); } });
          const F = Fs[0], y0 = H, T = { x: 12, w: comp.width - 24, y: y0 + 8, h: 7 }; c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, 64);
          c.fillStyle = "#3a4a42"; c.fillRect(T.x, T.y, T.w, T.h); if (fcIdx >= 0) { const xc = T.x + (fcIdx + 0.5) * T.w / N; c.fillStyle = "#ffe14a"; c.beginPath(); c.moveTo(xc, T.y + T.h + 1); c.lineTo(xc - 4, T.y + T.h + 7); c.lineTo(xc + 4, T.y + T.h + 7); c.fill(); }
          const xk = T.x + (k + 0.5) * T.w / N; c.fillStyle = "#fff"; c.fillRect(xk - 1.5, T.y - 3, 3, T.h + 6);
          c.font = "600 13px -apple-system, Helvetica, Arial"; c.fillStyle = "#ffe7a3"; c.fillText(`t = ${F.tMs >= 0 ? "+" : ""}${F.tMs.toFixed(1)} ms ${F.tMs >= 0 ? "after first contact" : "before contact"} · ${V0.every === 4 ? "1× (60 Hz)" : "0.25× (every 1/240 s step)"}`, 12, y0 + 32);
          c.font = "600 11px -apple-system, Helvetica, Arial"; c.fillStyle = "#c9d6cf"; c.fillText(`SUPPORT-1 · ${V0.note}`, 12, y0 + 48);
          c.fillStyle = "#9fb3a9"; c.fillText(variant === "diag" ? "DIAGNOSTIC: actual V2 colliders (cyan) · foot contacts green = sticking, red = sliding · yellow polygon = support · white cross = COM ground projection · orange = impactor · yellow dots = impactor contacts" : "CLEAN: recipient mesh (MC-1) + the impactor's actual collision shape · presentation only · no physics changed", 12, y0 + 61);
          const E = window.__enc, dur = 1e6 / 60, vf = new VideoFrame(comp, { timestamp: Math.round(k * dur), duration: Math.round(dur) }); E.enc.encode(vf, { keyFrame: k % 12 === 0 }); vf.close();
          return { png: wantPng ? comp.toDataURL("image/png") : null };
        }, V0, seqs.map(s => s[k]), k, N, variant, fcIdx, stills.includes(k));
        if (r.png) { const d = path.join(OUT, "frames"); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, `${vid}_t${Math.round(seqs[0][k].tMs)}.png`), Buffer.from(r.png.split(",")[1], "base64")); } }
      const v = await page.evaluate(async () => { const E = window.__enc; await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const b = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { b64: btoa(s), err: window.__encErr || null }; });
      if (v.err) throw new Error(v.err); fs.mkdirSync(path.join(OUT, "video"), { recursive: true }); fs.writeFileSync(path.join(OUT, "video", vid + ".mp4"), Buffer.from(v.b64, "base64"));
      capture.views[V0.id] = { ...(capture.views[V0.id] || {}), panels: V0.panels.map(p => ({ k: p.k, l: p.l, run: META.runs[p.k] })), frames: N, size: [CW, CH], zoom: V0.zoom, every: V0.every, videos: { ...((capture.views[V0.id] || {}).videos || {}), [variant]: vid + ".mp4" } };
      console.log(`${vid}: ${N} frames ${CW}×${CH} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); } }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l)); const cf = path.join(OUT, "capture_" + port + ".json"); fs.writeFileSync(cf, JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} });
