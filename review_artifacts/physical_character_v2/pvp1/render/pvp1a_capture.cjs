// PVP-1A-DX VISUAL CAPTURE (visualisation only). The FROZEN RUN-1 viewer page (tag archive, unmodified): each panel = the viewer's own rv1Render
// (CAMERA_V1; rail + subject centring on the mean AUTHORITATIVE position of both players; ground, contact shadows of both) drawing the runner
// (vinicius mesh), then the tackler drawn with the same frozen character renderer (of_char_gl.js ofCharDraw, gabriel mesh from the tag) into the same
// GL frame. Views: A gameplay (zoom 1, 1280×720, 60 Hz), B close (viewer zoom 6, every record step), C diagnostic (B + overlays), D C0 | N2, E N2 | X2.
// Every recorded step is one frame; nothing is interpolated or amplified; overlays are computed from recorded states only.
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node pvp1a_capture.cjs --clips <prep dir> --archive <tag archive> --out <dir> [--port 8344]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8344"), SPAWNED = [];
const load = (f) => JSON.parse(fs.readFileSync(path.join(CL, f))), META = load("meta.json"), LEAD = load("LEAD.json").frames, MODES = { C0: load("C0.json").frames, N2: load("N2.json").frames, X2: load("X2.json").frames };
const FC = META.firstContact;
// frame sequences: lead (240 Hz) + physical (every step) ; gameplay: lead every 4th + physical every 4th
const seqFull = (mode) => [...LEAD.map(f => ({ ...f, mode })), ...MODES[mode].map(f => ({ ...f, mode }))];
const seq60 = (mode) => [...LEAD.filter((_, k) => k % 4 === 0).map(f => ({ ...f, mode })), ...MODES[mode].filter(f => f.n % 4 === 0).map(f => ({ ...f, mode }))];
const VIEWS = [
  { id: "A_gameplay_N2", panels: [{ mode: "N2", label: "NATIVE PVP CONTACT" }], seq: seq60, W: 1280, H: 720, zoom: 1, diag: false, fps: [60], strip: 64 },
  { id: "B_close_N2", panels: [{ mode: "N2", label: "NATIVE PVP CONTACT" }], seq: seqFull, W: 960, H: 640, zoom: 6, diag: false, fps: [60, 24], strip: 80 },
  { id: "C_diag_N2", panels: [{ mode: "N2", label: "NATIVE PVP CONTACT · DIAGNOSTIC" }], seq: seqFull, W: 960, H: 640, zoom: 6, diag: true, fps: [60], strip: 80 },
  { id: "D_pair_C0_N2", panels: [{ mode: "C0", label: "NO CONTACT (C0)" }, { mode: "N2", label: "NATIVE PVP CONTACT (N2)" }], seq: seqFull, W: 640, H: 640, zoom: 6, diag: false, fps: [60], strip: 80 },
  { id: "D_pair_C0_N2_diag", panels: [{ mode: "C0", label: "NO CONTACT (C0)" }, { mode: "N2", label: "NATIVE PVP CONTACT (N2)" }], seq: seqFull, W: 640, H: 640, zoom: 6, diag: true, fps: [60], strip: 80 },
  { id: "E_pair_N2_X2", panels: [{ mode: "N2", label: "NATIVE CONTACT, SUSTAINED (N2)" }, { mode: "X2", label: "CONTACT CUT AFTER FIRST STEP (X2)" }], seq: seqFull, W: 640, H: 640, zoom: 6, diag: false, fps: [60], strip: 80 },
  { id: "E_pair_N2_X2_diag", panels: [{ mode: "N2", label: "NATIVE CONTACT, SUSTAINED (N2)" }, { mode: "X2", label: "CONTACT CUT AFTER FIRST STEP (X2)" }], seq: seqFull, W: 640, H: 640, zoom: 6, diag: true, fps: [60], strip: 80 } ];
(async () => {
  const root = path.join(OUT, "_serve"); fs.mkdirSync(root, { recursive: true });
  for (const d of ["sandbox", "assets"]) { const l = path.join(root, d); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ARCH, d), l); }
  fs.copyFileSync(process.env.MP4_MUXER, path.join(root, "mp4-muxer.js"));
  const srv = cp.spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1", "--directory", root], { stdio: "ignore" }); SPAWNED.push(srv); await new Promise(r => setTimeout(r, 900));
  const browser = await puppeteer.launch({ userDataDir: path.join(OUT, "_profile"), executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1400,1000"] });
  const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&lanes=diag`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 60000 });
  await page.addScriptTag({ url: `http://127.0.0.1:${port}/mp4-muxer.js` });
  const env = await page.evaluate(async (bR, bT) => { /* global RV1, ofCharLoad */ window.__gab = await ofCharLoad("gabriel"); window.__bR = bR; window.__bT = bT;
    Object.assign(RV1, { labels: false, blind: 0, rate: 1 }); Object.assign(RV1.ov, { skel: false, feet: false, com: false, trail: false });
    return { ua: navigator.userAgent, runnerChar: RV1.entry.id || "vinicius", tackler: window.__gab.id, gabTris: window.__gab.mesh.triangleCount }; }, META.bonesR, META.bonesT);
  console.log("viewer:", JSON.stringify(env));
  const capture = { tool: "pvp1a_capture.cjs", env, views: {} };
  for (const V0 of VIEWS) { const t0 = Date.now(), seqs = V0.panels.map(p => V0.seq(p.mode)), N = seqs[0].length, CW = V0.W * V0.panels.length, CH = V0.H + V0.strip;
    await page.evaluate((CW, CH, fps) => { window.__enc = {}; for (const f of fps) { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: f }, fastStart: "in-memory" });
      const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * f * 0.12), framerate: f, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc[f] = { muxer, enc, f }; }
      window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH, V0.fps);
    const frameIdx = [];
    for (let k = 0; k < N; k++) {
      const r = await page.evaluate((V0, Fs, k, N, FC, trust) => {
        /* global RV1, rv1Render, rv1Proj, ofCharDraw, V3 */
        const S = RV1, gl = S.R.gl, bR = window.__bR, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H;
        c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
        const panelDraw = (F, x0, label) => {
          const lane = (who, P, skinOn) => ({ key: who, i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: F.auth[who][0], y: F.auth[who][1], heading: 0, v: 0, vx: 0, vy: 0 }, fk: { joint: P.joint, tip: P.tip, world: [] }, skin: skinOn ? new Float32Array(P.skin) : null, pose: { legs: { L: { st: false }, R: { st: false } } } });
          S.fixedLayout = { W, H, views: [{ id: "game", x: 0, y: 0, w: W, h: H }] }; S.zoom = V0.zoom; S.lanes = [lane("runner", F.runner, true), lane("tackler", F.tackler, false)]; S.run1 = null; rv1Render();
          const vw = S.fixedLayout.views[0], cam = vw.cam; gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
          ofCharDraw(S.R, window.__gab, new Float32Array(F.tackler.skin), cam.view, cam.proj); gl.finish();
          c.drawImage(document.getElementById("gl"), 0, 0, W, H, x0, 0, W, H);
          const P = (q) => { const a = rv1Proj(cam, vw, 1, q); return a ? [a[0] + x0, a[1]] : null; };
          const box = (txt, x, y, px, col, bg, align) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width, xa = align === "right" ? x - w : align === "center" ? x - w / 2 : x; c.fillStyle = bg || "rgba(8,12,10,0.72)"; c.fillRect(xa - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, xa, y); };
          if (V0.diag) { c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
            const skel = (Pp, col, bones) => { c.strokeStyle = col; c.lineWidth = 1.6; for (const b of bones) { if (b.parent == null || b.name === "pelvis" || b.name === "hair") continue; const a = P(Pp.joint[b.parent]), e = P(Pp.joint[b.idx]); if (a && e) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } } for (const b of bones) { const a = P(Pp.joint[b.idx]); if (a) { c.fillStyle = col; c.beginPath(); c.arc(a[0], a[1], 2.2, 0, 7); c.fill(); } } };
            const circ = (q, r) => { const a = P(q), right = [cam.view[0], cam.view[4], cam.view[8]], b = P(V3.add(q, V3.scale(right, r))); if (!a || !b) return null; const rr = Math.hypot(b[0] - a[0], b[1] - a[1]); c.beginPath(); c.arc(a[0], a[1], rr, 0, 7); c.stroke(); return [a, rr]; };
            const capsule = (a, ra, b, rb) => { const A = circ(a, ra), B = circ(b, rb); if (A && B) { const d = [B[0][0] - A[0][0], B[0][1] - A[0][1]], l = Math.hypot(d[0], d[1]) || 1, nx = -d[1] / l, ny = d[0] / l; for (const s of [1, -1]) { c.beginPath(); c.moveTo(A[0][0] + s * nx * A[1], A[0][1] + s * ny * A[1]); c.lineTo(B[0][0] + s * nx * B[1], B[0][1] + s * ny * B[1]); c.stroke(); } } };
            // authoritative simulation geometry (dashed): tackler primitives + runner shin / foot segments
            c.setLineDash([5, 4]); c.strokeStyle = "rgba(255,90,216,0.75)"; c.lineWidth = 1.2; for (const p of F.prims || []) capsule(p.a, p.r, p.b, p.r); c.strokeStyle = "rgba(255,200,90,0.8)"; for (const g of F.segs || []) capsule(g.a, g.ra, g.b, g.rb); c.setLineDash([]);
            if (F.colR) { c.strokeStyle = "rgba(90,235,255,0.85)"; c.lineWidth = 1.2; for (const o of [...F.colR, ...F.colT]) { if (o.t === "c") capsule(o.a, o.ra, o.b, o.rb); else if (o.t === "s") circ(o.c, o.r); else if (o.t === "h") { const pts = o.c.map(P).filter(Boolean); if (pts.length < 3) continue; pts.sort((u, v) => u[0] - v[0] || u[1] - v[1]); const cr = (o2, a, b) => (a[0] - o2[0]) * (b[1] - o2[1]) - (a[1] - o2[1]) * (b[0] - o2[0]), lo = [], up = []; for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } const hp = lo.slice(0, -1).concat(up.slice(0, -1)); c.beginPath(); hp.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.stroke(); } } }
            skel(F.runner, "rgba(255,255,255,0.95)", bR); skel(F.tackler, "rgba(255,170,60,0.95)", window.__bT);
            if (F.comR) for (const [cm, col] of [[F.comR, "#ffd45e"], [F.comT, "#7fe3ff"]]) { const a = P(cm.c), e = P(V3.add(cm.c, V3.scale(cm.v, 0.25))); if (!a) continue; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(a[0], a[1], 6, 0, 7); c.stroke(); c.beginPath(); c.moveTo(a[0] - 6, a[1]); c.lineTo(a[0] + 6, a[1]); c.moveTo(a[0], a[1] - 6); c.lineTo(a[0], a[1] + 6); c.stroke();
              if (e && Math.hypot(...cm.v) > 0.02) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); const ang = Math.atan2(e[1] - a[1], e[0] - a[0]); c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[0] - 7 * Math.cos(ang - 0.4), e[1] - 7 * Math.sin(ang - 0.4)); c.lineTo(e[0] - 7 * Math.cos(ang + 0.4), e[1] - 7 * Math.sin(ang + 0.4)); c.closePath(); c.fillStyle = col; c.fill(); } }
            if (F.feetR) for (const [sd, bn] of [["L", "foot_L"], ["R", "foot_R"]]) { const bi = bR.find(b => b.name === bn).idx, an = F.runner.joint[bi], g = P([an[0], 0.002, an[2]]); if (!g || F.feetR[sd] == null) continue; const col = sd === "L" ? "#ff78c8" : "#78ffa0"; c.beginPath(); c.arc(g[0], g[1] + 4, 7, 0, 7); c.fillStyle = F.feetR[sd] > 0 ? col : "rgba(0,0,0,0)"; c.fill(); c.strokeStyle = col; c.lineWidth = 1.6; c.stroke(); }
            for (const x of F.cross || []) { for (const q of x.points) { const a = P(q), e = P(V3.add(q, V3.scale(x.nTR, 0.08))); if (!a) continue; c.fillStyle = "#ffe14a"; c.beginPath(); c.arc(a[0], a[1], 4, 0, 7); c.fill(); if (e) { c.strokeStyle = "#ffe14a"; c.lineWidth = 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } } }
            if (F.cross && F.cross.length) { const a = P(F.cross[0].points[0]); if (a) box(`cross impulse ${F.crossJ.toFixed(2)} N·s (step ${F.n}) · ${[...new Set(F.cross.map(x => x.pair.join("↔")))].join(", ")}`, a[0] + 12, a[1] - 14, 11, "#ffe14a"); }
            c.restore(); }
          box(label, x0 + 12, 28, 16, "#ffffff");
          if (F.phase === "phys" && F.untrusted && (F.untrusted.tackler || F.untrusted.runner)) box(`untrusted: ${[F.untrusted.runner ? "runner (integrity failed)" : null, F.untrusted.tackler ? "tackler (entry self-penetration)" : null].filter(Boolean).join(" · ")}`, x0 + 12, 52, 11, "#ffb37a");
          return cam; };
        Fs.forEach((F, i) => panelDraw(F, i * W, V0.panels[i].label));
        const F = Fs[0], y0 = H, tau = F.phase === "lead" ? F.tauMs : F.tauMs, isLead = F.phase === "lead";
        const box2 = (txt, x, y, px, col) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; c.fillStyle = col; c.fillText(txt, x, y); };
        c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, V0.strip);
        const BC = { lead: "#4aa8ff", entry: "#d8e6ff", primary: "#3fd17a", secondary: "#f0c64a", continuation: "#9a8cff" }, tl = { x: 12, w: comp.width - 24, y: y0 + 10, h: 10 };
        for (let j = 0; j < N; j++) { const G = j < N ? (j < (V0.leadN || 0) ? null : null) : null; }
        // timeline by frame index (lead / entry / windows), cursor and contact marker
        const segs = V0.timeline; segs.forEach(sg => { c.fillStyle = BC[sg.w]; c.fillRect(tl.x + sg.a * tl.w / N, tl.y, Math.max(1, (sg.b - sg.a + 1) * tl.w / N - 1), tl.h); });
        const xk = tl.x + (k + 0.5) * tl.w / N; c.fillStyle = "#fff"; c.fillRect(xk - 1.5, tl.y - 4, 3, tl.h + 8);
        if (V0.contactIdx != null) { const xc = tl.x + (V0.contactIdx + 0.5) * tl.w / N; c.fillStyle = "#ffe14a"; c.beginPath(); c.moveTo(xc, tl.y + tl.h + 2); c.lineTo(xc - 5, tl.y + tl.h + 9); c.lineTo(xc + 5, tl.y + tl.h + 9); c.fill(); }
        box2(isLead ? `τ ${tau.toFixed(1)} ms before activation · lead-in (no physics; runner = frozen presentation, tackler = constructed from the authoritative slide primitives)` : `τ +${tau.toFixed(2)} ms after activation · record step ${F.n} · ${F.window}${FC != null && F.n === FC ? " · FIRST NATIVE CONTACT" : FC != null && F.n > FC ? ` · +${((F.n - FC) * 1000 / 240).toFixed(1)} ms after first contact` : ""}`, 12, y0 + 38, 13, isLead ? "#bfe9ff" : "#ffe7a3");
        box2("PVP-1A-DX DIAGNOSTIC — not a PVP-1A result (PVP-1A blocked at the tackler entry; the DX tackler entry self-penetrates and is untrusted from step 1) · frozen camera CAMERA_V1" + (V0.zoom > 1 ? ` · viewer zoom ${V0.zoom}× (same pose / perspective)` : " · zoom 1×"), 12, y0 + 58, 11, "#c9d6cf");
        if (V0.strip > 64) box2("every recorded 1/240 s step is one frame · no interpolation, no amplification, no authored animation", 12, y0 + 74, 11, "#9fb3a9");
        for (const f of Object.keys(window.__enc)) { const E = window.__enc[f], dur = 1e6 / E.f, vf = new VideoFrame(comp, { timestamp: Math.round(k * dur), duration: Math.round(dur) }); E.enc.encode(vf, { keyFrame: k % 12 === 0 }); vf.close(); }
        return { png: comp.toDataURL("image/png") };
      }, { ...V0, seq: undefined, timeline: timelineOf(seqs[0]), contactIdx: seqs[0].findIndex(f => f.phase === "phys" && f.n === FC) }, seqs.map(s => s[k]), k, N, FC, META.trust);
      const d = path.join(OUT, "frames", V0.id); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, String(k).padStart(4, "0") + ".png"), Buffer.from(r.png.split(",")[1], "base64"));
      frameIdx.push({ k, phase: seqs[0][k].phase, n: seqs[0][k].n, tauMs: seqs[0][k].tauMs }); }
    const vids = await page.evaluate(async () => { const out = {}; for (const [f, E] of Object.entries(window.__enc)) { await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const b = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); out[f] = btoa(s); } return { out, err: window.__encErr || null }; });
    if (vids.err) throw new Error(vids.err); fs.mkdirSync(path.join(OUT, "video"), { recursive: true });
    for (const [f, b64] of Object.entries(vids.out)) { const name = `${V0.id}${V0.zoom > 1 ? (+f === 60 ? "_0.25x" : "_0.10x") : "_1x"}.mp4`; fs.writeFileSync(path.join(OUT, "video", name), Buffer.from(b64, "base64")); }
    capture.views[V0.id] = { frames: N, size: [CW, CH], zoom: V0.zoom, fps: V0.fps, index: frameIdx, seconds: (Date.now() - t0) / 1000 };
    console.log(`${V0.id}: ${N} frames ${CW}×${CH} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l)); fs.writeFileSync(path.join(OUT, "capture.json"), JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} });
function timelineOf(seq) { const out = []; seq.forEach((f, j) => { const w = f.phase === "lead" ? "lead" : f.window; const last = out[out.length - 1]; if (last && last.w === w) last.b = j; else out.push({ w, a: j, b: j }); }); return out; }
