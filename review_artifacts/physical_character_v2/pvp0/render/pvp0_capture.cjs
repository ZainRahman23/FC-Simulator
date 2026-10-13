// PVP-0 VISUAL CAPTURE (presentation only): trc1/render/trc1_capture.cjs with the view list read from --views (nothing else changed).
// --- original header (trc1_capture.cjs) ---
// TRC-1 VISUAL CAPTURE (presentation only). The frozen RUN-1 viewer + frozen character renderer + CAMERA_V1, exactly as every earlier review, with the
// tackler drawn by MC-1P (gabriel stretched onto its V2 joints). Each view is rendered twice: MESH (clean) and MESH + COLLIDERS (the actual V2 shapes
// as exact perspective silhouettes over the mesh — runner cyan, tackler orange — Jolt contact points / normals and the closest-pair separation).
// Panels are synchronised to the same recorded step. Every recorded 1/240 s step is one frame (gameplay views: every 4th = 60 Hz at 1×).
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node pvp0_capture.cjs --clips <dir> --views <json> --archive <tag archive> --out <dir> [--only id,id]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8381"), ONLY = arg("only", null), SPAWNED = [];
const META = JSON.parse(fs.readFileSync(path.join(CL, "meta.json"))), cache = {}, load = (k) => cache[k] || (cache[k] = JSON.parse(fs.readFileSync(path.join(CL, k + ".json"))).frames);
const DXN = "PVP-1A-DX · the DX tackler's entry pose self-penetrates (forearm in thigh): tackler integrity untrusted from step 1 (known, PVP-1A-DX)";
const VIEWS = JSON.parse(fs.readFileSync(arg("views"))); // PVP-0: views from a file (pvp0/review/video/VIEWS_PVP0.json)
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
  const capture = { tool: "trc1_capture.cjs", views: {} }, STRIP = 70;
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue;
    const seqs = V0.panels.map(p => load(p.k).filter(f => f.phase === "lead" ? (f.k % V0.every === 0) : f.n % V0.every === 0)), N = Math.min(...seqs.map(s => s.length)), CW = V0.W * V0.panels.length, CH = V0.H + STRIP;
    const win = Math.min(...V0.panels.map(p => META.runs[p.k].window)), fc = META.runs[V0.panels[V0.panels.length - 1].k].firstContact;
    for (const variant of ["mesh", "colliders"]) { const t0 = Date.now(), vid = `${V0.id}_${variant}`;
      await page.evaluate((CW, CH) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: 60 }, fastStart: "in-memory" });
        const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * 60 * 0.12), framerate: 60, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc = { muxer, enc };
        window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH);
      const tlSegs = []; seqs[0].slice(0, N).forEach((f, j) => { const col = f.phase === "lead" ? "#4aa8ff" : (f.window === "w" || f.window === "entry") ? "#3fd17a" : "#6a3a36", last = tlSegs[tlSegs.length - 1]; if (last && last.col === col) last.b = j; else tlSegs.push({ col, a: j, b: j }); });
      const fcIdx = fc == null ? -1 : seqs[seqs.length - 1].findIndex(f => f.phase === "phys" && f.n >= fc); await page.evaluate((sg, i) => { window.__tl = sg; window.__fcIdx = i; }, tlSegs, fcIdx);
      const idx = [];
      for (let k = 0; k < N; k++) {
        const r = await page.evaluate((V0, Fs, k, N, variant, win, fc) => {
          /* global RV1, rv1Render, rv1Proj, ofCharDraw */
          const S = RV1, gl = S.R.gl, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H; c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
          const box = (txt, x, y, px, col, bg) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; c.fillStyle = bg || "rgba(8,12,10,0.75)"; c.fillRect(x - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); };
          const hull = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
          Fs.forEach((F, pi) => { const x0 = pi * W, P0 = V0.panels[pi], T = P0.old && F.tacklerOld ? F.tacklerOld : F.tackler;
            const RW = V0.crop ? V0.crop.W2 : W, RH = V0.crop ? V0.crop.H2 : H;
            const lane = (who, Pp, skinOn) => ({ key: who, i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: F.auth[who][0], y: F.auth[who][1], heading: 0, v: 0, vx: 0, vy: 0 }, fk: { joint: Pp.joint, tip: Pp.tip, world: [] }, skin: skinOn ? new Float32Array(Pp.skin) : null, pose: { legs: { L: { st: false }, R: { st: false } } } });
            S.fixedLayout = { W: RW, H: RH, views: [{ id: "game", x: 0, y: 0, w: RW, h: RH }] }; S.zoom = V0.zoom; S.lanes = [lane("runner", F.runner, true), lane("tackler", T, false)]; S.run1 = null; rv1Render();
            const vw = S.fixedLayout.views[0], cam = vw.cam; gl.viewport(0, 0, RW, RH); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
            ofCharDraw(S.R, window.__gab, new Float32Array(T.skin), cam.view, cam.proj); gl.finish(); const glc = document.getElementById("gl");
            let cx0 = 0, cy0 = 0, cw = W, ch = H; if (V0.crop && F.feetRT) { cw = V0.crop.cw; ch = V0.crop.ch; const m = F.feetRT.map(q => rv1Proj(cam, vw, 1, q)).filter(Boolean); if (m.length) { const mx = m.reduce((a, b) => a + b[0], 0) / m.length, my = m.reduce((a, b) => a + b[1], 0) / m.length; cx0 = Math.max(0, Math.min(RW - cw, mx - cw / 2)); cy0 = Math.max(0, Math.min(RH - ch, my - ch * 0.6)); } }
            c.drawImage(glc, cx0, cy0, cw, ch, x0, 0, W, H);
            const Pj = (q) => { const a = rv1Proj(cam, vw, 1, q); return a ? [(a[0] - cx0) * W / cw + x0, (a[1] - cy0) * H / ch] : null; };
            if (variant === "colliders" && F.phase === "phys" && F.shapes) { c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
              for (const s of F.shapes) { const q = s.pts.map(Pj).filter(Boolean); if (q.length < 3) continue; const h = hull(q); c.beginPath(); h.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
                c.fillStyle = s.who === "R" ? "rgba(70,215,255,0.33)" : "rgba(255,150,40,0.36)"; c.fill(); c.strokeStyle = s.who === "R" ? "rgba(150,240,255,0.95)" : "rgba(255,200,120,0.95)"; c.lineWidth = 1.1; c.stroke(); }
              for (const x of F.cross || []) for (const q of x.pts) { const a = Pj(q.p); if (!a) continue; c.fillStyle = q.lam > 0 ? "#ffe14a" : "rgba(255,225,74,0.5)"; c.beginPath(); c.arc(a[0], a[1], q.lam > 0 ? 3.5 : 2.2, 0, 7); c.fill(); const e = Pj([q.p[0] + x.n[0] * 0.06, q.p[1] + x.n[1] * 0.06, q.p[2] + x.n[2] * 0.06]); if (e && q.lam > 0) { c.strokeStyle = "#ffe14a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
              c.restore(); if (F.near && F.near.length) F.near.slice(0, 2).forEach((nr, i) => box(`${nr.key.replace("|", " ↔ ")}: ${nr.dmm >= 0 ? "gap " + nr.dmm.toFixed(1) : "overlap " + (-nr.dmm).toFixed(1)} mm`, x0 + 10, H - 14 - i * 18, 11, nr.dmm < -5 ? "#ff8080" : "#d8f6ff")); }
            box(P0.l, x0 + 10, 24, 14, "#ffffff");
            if (F.phase === "phys" && F.window === "beyond") box("beyond the trustworthy window — no inference", x0 + 10, 48, 11, "#ffb3a6", "rgba(70,16,12,0.85)"); });
          const F = Fs[Fs.length - 1], y0 = H, T = { x: 12, w: comp.width - 24, y: y0 + 8, h: 8 }; c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, 70);
          const segs = window.__tl || []; segs.forEach(sg => { c.fillStyle = sg.col; c.fillRect(T.x + sg.a * T.w / N, T.y, Math.max(1, (sg.b - sg.a + 1) * T.w / N - 1), T.h); });
          if (window.__fcIdx >= 0) { const xc = T.x + (window.__fcIdx + 0.5) * T.w / N; c.fillStyle = "#ffe14a"; c.beginPath(); c.moveTo(xc, T.y + T.h + 1); c.lineTo(xc - 4, T.y + T.h + 7); c.lineTo(xc + 4, T.y + T.h + 7); c.fill(); }
          const xk = T.x + (k + 0.5) * T.w / N; c.fillStyle = "#fff"; c.fillRect(xk - 1.5, T.y - 3, 3, T.h + 6);
          c.font = "600 13px -apple-system, Helvetica, Arial"; c.fillStyle = F.phase === "lead" ? "#bfe9ff" : "#ffe7a3";
          c.fillText(F.phase === "lead" ? `τ ${F.tauMs.toFixed(1)} ms before activation · lead-in (no physics; tackler constructed from the authoritative slide)` : `τ +${F.tauMs.toFixed(2)} ms after activation · record step ${F.n}${fc != null && F.n >= fc ? ` · +${((F.n - fc) * 1000 / 240).toFixed(1)} ms after first contact` : ""}${F.window === "w" ? " · inside the trustworthy window" : F.window === "beyond" ? " · beyond the trustworthy window" : ""}`, 12, y0 + 32);
          c.font = "600 11px -apple-system, Helvetica, Arial"; c.fillStyle = "#c9d6cf"; c.fillText(`TRC-1 · tackler rendered on its physical joints (MC-1P; presentation only) · ${V0.note} · CAMERA_V1 ${V0.zoom > 1 ? "viewer zoom " + V0.zoom + "× (same pose / perspective)" : "zoom 1×"}${V0.crop ? " · cropped around the contacting feet" : ""}`, 12, y0 + 50);
          c.fillStyle = "#9fb3a9"; c.fillText(`${variant === "colliders" ? "MESH + ACTUAL V2 COLLIDERS (runner cyan · tackler orange · yellow = Jolt contact points)" : "MESH"} · every recorded 1/240 s step is one frame${V0.every === 4 ? " (gameplay: every 4th = 60 Hz at 1×)" : ""} · green = trustworthy window · ▲ first contact`, 12, y0 + 64);
          const E = window.__enc, dur = 1e6 / 60, vf = new VideoFrame(comp, { timestamp: Math.round(k * dur), duration: Math.round(dur) }); E.enc.encode(vf, { keyFrame: k % 12 === 0 }); vf.close();
          return { png: comp.toDataURL("image/png") };
        }, V0, seqs.map(s => s[k]), k, N, variant, win, fc);
        if (r.png) { const d = path.join(OUT, "frames", vid); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, String(k).padStart(4, "0") + ".png"), Buffer.from(r.png.split(",")[1], "base64")); }
        idx.push([seqs[0][k].phase === "lead" ? -1 : seqs[0][k].n, seqs[0][k].tauMs, seqs[0][k].window || "lead"]); }
      const v = await page.evaluate(async () => { const E = window.__enc; await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const b = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { b64: btoa(s), err: window.__encErr || null }; });
      if (v.err) throw new Error(v.err); fs.mkdirSync(path.join(OUT, "video"), { recursive: true }); fs.writeFileSync(path.join(OUT, "video", vid + ".mp4"), Buffer.from(v.b64, "base64"));
      capture.views[V0.id] = { ...(capture.views[V0.id] || {}), panels: V0.panels.map(p => ({ k: p.k, l: p.l, old: !!p.old })), frames: N, size: [CW, CH], zoom: V0.zoom, every: V0.every, window: win, firstContact: fc, index: idx, videos: { ...((capture.views[V0.id] || {}).videos || {}), [variant]: vid + ".mp4" } };
      console.log(`${vid}: ${N} frames ${CW}×${CH} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); } }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l)); const cf = path.join(OUT, "capture.json"), prev = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf)) : { views: {} };
  capture.views = { ...prev.views, ...capture.views }; fs.writeFileSync(cf, JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} });
