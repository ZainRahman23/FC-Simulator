// PPR-1 VISUAL CAPTURE (presentation only): CURRENT V2 (A) | PHYSIOLOGICAL PRE-REFLEX (B), synchronised to the same recorded step, same tackler /
// collision. The frozen RUN-1 viewer + frozen character renderer + CAMERA_V1 and the TRC-1 mapping (runner MC-1 §2(4), tackler MC-1P), as TRC-1.
// Three variants per view: MESH; MESH + COLLIDERS (actual V2 shapes, Jolt contact points); OVERLAY (both V2 skeletons, runner COM with its ground
// projection, turf contact points sized by force, per-foot ground-reaction force). Time after first contact on every frame; marks at 0 / 40 / 80 /
// 120 ms; frames after 120 ms are not in the primary judgement (the clips stop at +120.8 ms unless labelled CONTEXT).
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node ppr1_capture.cjs --clips <dir> --archive <tag archive> --out <dir> [--only id,id]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8381"), ONLY = arg("only", null), SPAWNED = [];
const META = JSON.parse(fs.readFileSync(path.join(CL, "meta.json"))), cache = {}, load = (k) => cache[k] || (cache[k] = JSON.parse(fs.readFileSync(path.join(CL, k + ".json"))).frames);
const DXN = "PVP-1A-DX collision (unchanged) · tackler integrity untrusted from step 1 (known: its entry pose self-penetrates, forearm in thigh)";
const AB = [{ k: "A_N2", l: "A · CURRENT V2 (frozen pose tone, zero-latency activation)" }, { k: "B_N2", l: "B · PHYSIOLOGICAL PRE-REFLEX (no neural change before 125 ms)" }];
const VIEWS = [
  { id: "G_PVP", panels: AB, zoom: 1, W: 900, H: 560, every: 4, note: DXN },
  { id: "K_PVP", panels: AB, zoom: 8, W: 840, H: 620, every: 1, leadFrom: 44, note: DXN },
  { id: "F_PVP", panels: AB, zoom: 16, W: 840, H: 620, every: 1, leadFrom: 44, crop: { W2: 1440, H2: 1080, cw: 600, ch: 443 }, note: DXN },
  { id: "K_C0", panels: [{ k: "A_C0", l: "A · CURRENT V2 · no contact (C0)" }, { k: "B_C0", l: "B · PRE-REFLEX · no contact (C0)" }], zoom: 8, W: 840, H: 620, every: 1, leadFrom: 44, note: "PVP-1A-DX with contacts disabled by design (the tackler passes through): the same law with nothing to respond to" },
  { id: "K_IMP", panels: [{ k: "A_IMP", l: "A · CURRENT V2 · 10 kg impactor, right shank from behind" }, { k: "B_IMP", l: "B · PRE-REFLEX · same impactor" }], zoom: 8, W: 840, H: 620, every: 1, solo: true, note: "validation away from the tackle: IFM-1's diagnostic sphere (10 kg, 3 m/s) on the runner standing alone" } ];
const MARKS = [0, 40, 80, 120];
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
  await page.evaluate((m) => { window.MARKS = m; }, MARKS); await page.evaluate(async () => { window.__gab = await ofCharLoad("gabriel"); Object.assign(RV1, { labels: false, blind: 0, rate: 1 }); Object.assign(RV1.ov, { skel: false, feet: false, com: false, trail: false }); });
  const capture = { tool: "ppr1_capture.cjs", views: {} }, STRIP = 70;
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue;
    const seqs = V0.panels.map(p => load(p.k).filter(f => f.phase === "lead" ? (f.k % V0.every === 0 && f.k >= (V0.leadFrom || 0)) : f.n % V0.every === 0)), N = Math.min(...seqs.map(s => s.length)), CW = V0.W * V0.panels.length, CH = V0.H + STRIP;
    const win = 31, fc = META.runs[V0.panels[V0.panels.length - 1].k].firstContact;
    for (const variant of ["mesh", "colliders", "overlay"]) { const t0 = Date.now(), vid = `${V0.id}_${variant}`;
      await page.evaluate((CW, CH) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: 60 }, fastStart: "in-memory" });
        const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * 60 * 0.12), framerate: 60, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc = { muxer, enc };
        window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH);
      const tlSegs = []; seqs[0].slice(0, N).forEach((f, j) => { const col = f.phase === "lead" ? "#4aa8ff" : (f.tContactMs == null || f.tContactMs <= 0) ? "#7d8a84" : f.tContactMs <= 121 ? "#3fd17a" : "#6a3a36", last = tlSegs[tlSegs.length - 1]; if (last && last.col === col) last.b = j; else tlSegs.push({ col, a: j, b: j }); });
      const markIdx = MARKS.map(ms => seqs[0].slice(0, N).findIndex(f => f.phase === "phys" && f.tContactMs != null && f.tContactMs >= ms - 2.1)); await page.evaluate((m) => { window.__marks = m; }, markIdx);
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
            S.fixedLayout = { W: RW, H: RH, views: [{ id: "game", x: 0, y: 0, w: RW, h: RH }] }; S.zoom = V0.zoom; S.lanes = V0.solo ? [lane("runner", F.runner, true)] : [lane("runner", F.runner, true), lane("tackler", T, false)]; S.run1 = null; rv1Render();
            const vw = S.fixedLayout.views[0], cam = vw.cam; gl.viewport(0, 0, RW, RH); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
            if (!V0.solo) ofCharDraw(S.R, window.__gab, new Float32Array(T.skin), cam.view, cam.proj); gl.finish(); const glc = document.getElementById("gl");
            let cx0 = 0, cy0 = 0, cw = W, ch = H; if (V0.crop && F.feetRT) { cw = V0.crop.cw; ch = V0.crop.ch; const m = F.feetRT.map(q => rv1Proj(cam, vw, 1, q)).filter(Boolean); if (m.length) { const mx = m.reduce((a, b) => a + b[0], 0) / m.length, my = m.reduce((a, b) => a + b[1], 0) / m.length; cx0 = Math.max(0, Math.min(RW - cw, mx - cw / 2)); cy0 = Math.max(0, Math.min(RH - ch, my - ch * 0.6)); } }
            c.drawImage(glc, cx0, cy0, cw, ch, x0, 0, W, H);
            const Pj = (q) => { const a = rv1Proj(cam, vw, 1, q); return a ? [(a[0] - cx0) * W / cw + x0, (a[1] - cy0) * H / ch] : null; };
            if (F.imp) { const p = Pj(F.imp.c), q = Pj([F.imp.c[0], F.imp.c[1] + F.imp.r, F.imp.c[2]]); if (p && q) { const rr = Math.hypot(q[0] - p[0], q[1] - p[1]), gr = c.createRadialGradient(p[0] - rr * 0.35, p[1] - rr * 0.35, rr * 0.1, p[0], p[1], rr); gr.addColorStop(0, "#d9dde0"); gr.addColorStop(1, "#4a5056");
                c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip(); c.fillStyle = gr; c.beginPath(); c.arc(p[0], p[1], Math.max(rr, 6), 0, 7); c.fill(); c.strokeStyle = "#ffd45e"; c.lineWidth = 1.5; c.stroke(); c.restore(); } }
            if (variant === "colliders" && F.phase === "phys" && F.shapes) { c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
              for (const s of F.shapes) { const q = s.pts.map(Pj).filter(Boolean); if (q.length < 3) continue; const h = hull(q); c.beginPath(); h.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
                c.fillStyle = s.who === "R" ? "rgba(70,215,255,0.33)" : "rgba(255,150,40,0.36)"; c.fill(); c.strokeStyle = s.who === "R" ? "rgba(150,240,255,0.95)" : "rgba(255,200,120,0.95)"; c.lineWidth = 1.1; c.stroke(); }
              for (const x of F.cross || []) for (const q of x.pts) { const a = Pj(q.p); if (!a) continue; c.fillStyle = q.lam > 0 ? "#ffe14a" : "rgba(255,225,74,0.5)"; c.beginPath(); c.arc(a[0], a[1], q.lam > 0 ? 3.5 : 2.2, 0, 7); c.fill(); const e = Pj([q.p[0] + x.n[0] * 0.06, q.p[1] + x.n[1] * 0.06, q.p[2] + x.n[2] * 0.06]); if (e && q.lam > 0) { c.strokeStyle = "#ffe14a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
              c.restore(); if (F.near && F.near.length) F.near.slice(0, 2).forEach((nr, i) => box(`${nr.key.replace("|", " ↔ ")}: ${nr.dmm >= 0 ? "gap " + nr.dmm.toFixed(1) : "overlap " + (-nr.dmm).toFixed(1)} mm`, x0 + 10, H - 14 - i * 18, 11, nr.dmm < -5 ? "#ff8080" : "#d8f6ff")); }
            if (variant === "overlay" && F.phase === "phys") { c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip(); c.fillStyle = "rgba(0,0,0,0.28)"; c.fillRect(x0, 0, W, H);
              const bones = (sk, col) => { c.strokeStyle = col; c.lineWidth = 2.2; for (const [a, b] of sk) { const p = Pj(a), q = Pj(b); if (!p || !q) continue; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], 2.6, 0, 7); c.fill(); } };
              if (F.skelT) bones(F.skelT, "rgba(255,170,70,0.95)"); if (F.skelR) bones(F.skelR, "rgba(240,250,255,0.98)");
              if (F.com) { const p = Pj(F.com), g = Pj([F.com[0], 0, F.com[2]]); if (p && g) { c.setLineDash([4, 4]); c.strokeStyle = "#7dffb0"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(g[0], g[1]); c.stroke(); c.setLineDash([]); c.fillStyle = "#7dffb0"; c.beginPath(); c.arc(p[0], p[1], 6, 0, 7); c.fill(); c.fillStyle = "#0b0f0d"; c.beginPath(); c.arc(p[0], p[1], 2.4, 0, 7); c.fill(); c.strokeStyle = "#7dffb0"; c.beginPath(); c.arc(g[0], g[1], 4, 0, 7); c.stroke(); } }
              for (const t of F.turf || []) { const p = Pj(t.p); if (!p) continue; c.fillStyle = "rgba(90,200,255,0.9)"; c.beginPath(); c.arc(p[0], p[1], Math.min(9, 2 + Math.sqrt(Math.max(0, t.F)) * 0.25), 0, 7); c.fill(); }
              for (const x of F.cross || []) for (const q of x.pts) { const a2 = Pj(q.p); if (!a2) continue; c.fillStyle = q.lam > 0 ? "#ffe14a" : "rgba(255,225,74,0.45)"; c.beginPath(); c.arc(a2[0], a2[1], q.lam > 0 ? 4 : 2.4, 0, 7); c.fill(); }
              c.restore(); if (F.feetN) box(`ground reaction  L ${F.feetN[0].toFixed(0)} N · R ${F.feetN[1].toFixed(0)} N   (body weight ${(73.91 * 9.81).toFixed(0)} N)`, x0 + 10, H - 14, 11, "#bff0ff"); }
            if (F.phase === "phys" && F.tContactMs != null) { const t = F.tContactMs, mk = MARKS.find(ms => Math.abs(t - ms) < 2.1); box(t <= 0 ? `t ${t.toFixed(1)} ms (before contact)` : `t +${t.toFixed(1)} ms after first contact`, x0 + W - 230, 24, 13, mk != null ? "#1a1a10" : "#ffe7a3", mk != null ? "rgba(255,212,94,0.95)" : null); }
            box(P0.l, x0 + 10, 24, 14, "#ffffff");
            if (F.phase === "phys" && F.tContactMs != null && F.tContactMs > 121) box("after 120 ms — not in the primary pre-reflex judgement", x0 + 10, 48, 11, "#ffb3a6", "rgba(70,16,12,0.85)"); });
          const F = Fs[Fs.length - 1], y0 = H, T = { x: 12, w: comp.width - 24, y: y0 + 8, h: 8 }; c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, 70);
          const segs = window.__tl || []; segs.forEach(sg => { c.fillStyle = sg.col; c.fillRect(T.x + sg.a * T.w / N, T.y, Math.max(1, (sg.b - sg.a + 1) * T.w / N - 1), T.h); });
          if (window.__fcIdx >= 0) { const xc = T.x + (window.__fcIdx + 0.5) * T.w / N; c.fillStyle = "#ffe14a"; c.beginPath(); c.moveTo(xc, T.y + T.h + 1); c.lineTo(xc - 4, T.y + T.h + 7); c.lineTo(xc + 4, T.y + T.h + 7); c.fill(); }
          (window.__marks || []).forEach((mi, j) => { if (mi < 0) return; const xm = T.x + (mi + 0.5) * T.w / N; c.fillStyle = "#ffd45e"; c.fillRect(xm - 0.5, T.y - 5, 1, T.h + 10); c.font = "600 9px -apple-system, Helvetica, Arial"; c.fillText(MARKS[j] + " ms", xm + 2, T.y - 1); });
          const xk = T.x + (k + 0.5) * T.w / N; c.fillStyle = "#fff"; c.fillRect(xk - 1.5, T.y - 3, 3, T.h + 6);
          c.font = "600 13px -apple-system, Helvetica, Arial"; c.fillStyle = F.phase === "lead" ? "#bfe9ff" : "#ffe7a3";
          c.fillText(F.phase === "lead" ? `τ ${F.tauMs.toFixed(1)} ms before activation · lead-in (no physics; tackler constructed from the authoritative slide)` : `record step ${F.n} · τ +${F.tauMs.toFixed(2)} ms after activation${F.tContactMs != null ? ` · t ${F.tContactMs >= 0 ? "+" : ""}${F.tContactMs.toFixed(1)} ms after first contact (start of the first impulse step)` : ""}${F.tContactMs != null && F.tContactMs > 121 ? " · NOT in the primary judgement" : ""}`, 12, y0 + 32);
          c.font = "600 11px -apple-system, Helvetica, Arial"; c.fillStyle = "#c9d6cf"; c.fillText(`PPR-1 · TRC-1 rendering (tackler on its physical joints) · ${V0.note} · CAMERA_V1 ${V0.zoom > 1 ? "viewer zoom " + V0.zoom + "× (same pose / perspective)" : "zoom 1×"}${V0.crop ? " · cropped around the struck leg" : ""}`, 12, y0 + 50);
          c.fillStyle = "#9fb3a9"; c.fillText(`${variant === "colliders" ? "MESH + ACTUAL V2 COLLIDERS (runner cyan · tackler orange · yellow = Jolt contact points)" : variant === "overlay" ? "OVERLAY: V2 skeletons (runner white · tackler orange) · runner COM (green) + ground projection · turf contacts (blue, size ∝ force) · yellow = tackle contact" : "MESH"} · every recorded 1/240 s step is one frame${V0.every === 4 ? " (gameplay: every 4th = 60 Hz at 1×)" : ""} · green = 0–120 ms after contact · gold ticks 0 / 40 / 80 / 120 ms`, 12, y0 + 64);
          const E = window.__enc, dur = 1e6 / 60, vf = new VideoFrame(comp, { timestamp: Math.round(k * dur), duration: Math.round(dur) }); E.enc.encode(vf, { keyFrame: k % 12 === 0 }); vf.close();
          return { png: comp.toDataURL("image/png") };
        }, V0, seqs.map(s => s[k]), k, N, variant, win, fc);
        if (r.png) { const d = path.join(OUT, "frames", vid); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, String(k).padStart(4, "0") + ".png"), Buffer.from(r.png.split(",")[1], "base64")); }
        idx.push([seqs[0][k].phase === "lead" ? -1 : seqs[0][k].n, seqs[0][k].tauMs, seqs[0][k].phase === "lead" ? "lead" : seqs[0][k].tContactMs]); }
      const v = await page.evaluate(async () => { const E = window.__enc; await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const b = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { b64: btoa(s), err: window.__encErr || null }; });
      if (v.err) throw new Error(v.err); fs.mkdirSync(path.join(OUT, "video"), { recursive: true }); fs.writeFileSync(path.join(OUT, "video", vid + ".mp4"), Buffer.from(v.b64, "base64"));
      capture.views[V0.id] = { ...(capture.views[V0.id] || {}), panels: V0.panels.map(p => ({ k: p.k, l: p.l })), frames: N, size: [CW, CH], zoom: V0.zoom, every: V0.every, firstContact: fc, marks: MARKS, markIdx: (await page.evaluate(() => window.__marks)), index: idx, videos: { ...((capture.views[V0.id] || {}).videos || {}), [variant]: vid + ".mp4" } };
      console.log(`${vid}: ${N} frames ${CW}×${CH} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); } }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l)); const cf = path.join(OUT, "capture.json"), prev = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf)) : { views: {} };
  capture.views = { ...prev.views, ...capture.views }; fs.writeFileSync(cf, JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} if (global.__browser) global.__browser.close().catch(() => {}); setTimeout(() => process.exit(1), 3000); });
