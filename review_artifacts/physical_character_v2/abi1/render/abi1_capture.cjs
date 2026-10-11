// ABI-1 VISUAL CAPTURE (prereg §10; visualisation only). The FROZEN RUN-1 viewer page from the tag archive, unmodified: each panel is the viewer's
// own rv1Render (CAMERA_V1; rail + subject centring on the mean AUTHORITATIVE position of both players; ground and contact shadows) drawing the
// runner (vinicius mesh), then the tackler drawn with the frozen character renderer (of_char_gl.js ofCharDraw, gabriel mesh from the tag) into the
// same GL frame — exactly the PVP-1A-DX capture, with three synchronised panels A | B | C (same step in every panel, same entry, same camera).
// Every recorded step is one frame; nothing is interpolated, amplified or re-framed. Diagnostic overlays are computed from recorded data only:
// skeletons, contact points / normals / impulse, COMs with velocity, foot loads, the CURRENT XcoM and base of support (offline metrics, every
// condition), and for B / C the controller's own delayed XcoM / BoS and C's step foothold and swing reference.
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node abi1_capture.cjs --clips <clips root> --archive <tag archive> --out <dir> [--only id,id]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8361"), ONLY = arg("only", null), SPAWNED = [];
const sets = {}; const loadSet = (s) => sets[s] || (sets[s] = (() => { const d = path.join(CL, s), L = (f) => JSON.parse(fs.readFileSync(path.join(d, f))); const meta = L("meta.json");
  const keys = Object.keys(meta.runs), runs = Object.fromEntries(keys.map(k => [k, L(k + ".json").frames])); return { meta, runs, lead: fs.existsSync(path.join(d, "LEAD.json")) ? L("LEAD.json").frames : [] }; })());
const PANELS = (cs, pre) => [{ key: `A_N2_${cs}`, label: `A · ${pre}PASSIVE (current V2)`, col: "#ffffff" }, { key: `B_N2_${cs}`, label: `B · ${pre}ACTIVE BALANCE, NO STEP`, col: "#7fe3ff" }, { key: `C_N2_${cs}`, label: `C · ${pre}ACTIVE BALANCE + REACTIVE STEP`, col: "#ffb35c" }];
const NOTE = { primary: "the PVP-1A collision (CF1 fixture) · frozen contact set", ext: "EXT — restricted contact set (only runner-leg ↔ tackler-leg contacts; diagnostic continuation, bit-identical to the frozen set through step 60)",
  v075: "S-IMPACT diagnostic: tackler entry velocity × 0.75 (not adopted) · frozen contact set · only the authoritative pairs touch for the whole record", tone: "S-TONE diagnostic: runner tone stiffness at the measured intrinsic level (K × 0.561, D × 0.749) · EXT contact set" };
const VIEWS = [
  { id: "G_primary", set: "primary", cs: "ALL", note: NOTE.primary, zoom: 1, W: 640, H: 600, diag: false, fps: [60], every: 4, lead: true, strip: 74 },
  { id: "K_primary", set: "primary", cs: "ALL", note: NOTE.primary, zoom: 6, W: 600, H: 560, diag: false, fps: [60, 24], every: 1, lead: true, strip: 74 },
  { id: "D_primary", set: "primary", cs: "ALL", note: NOTE.primary, zoom: 6, W: 600, H: 560, diag: true, fps: [60], every: 1, lead: true, strip: 74 },
  { id: "G_ext", set: "primary", cs: "LEGS", note: NOTE.ext, zoom: 1, W: 640, H: 600, diag: false, fps: [60], every: 4, lead: true, strip: 74 },
  { id: "K_ext", set: "primary", cs: "LEGS", note: NOTE.ext, zoom: 6, W: 600, H: 560, diag: false, fps: [60], every: 1, lead: true, strip: 74 },
  { id: "D_ext", set: "primary", cs: "LEGS", note: NOTE.ext, zoom: 6, W: 600, H: 560, diag: true, fps: [60], every: 1, lead: true, strip: 74 },
  { id: "G_v075", set: "v075", cs: "ALL", note: NOTE.v075, zoom: 1, W: 640, H: 600, diag: false, fps: [60], every: 4, lead: false, strip: 74, authOnly: true, pre: "0.75× · " },
  { id: "K_v075", set: "v075", cs: "ALL", note: NOTE.v075, zoom: 6, W: 600, H: 560, diag: false, fps: [60], every: 1, lead: false, strip: 74, authOnly: true, pre: "0.75× · " },
  { id: "K_tone", set: "tone", cs: "LEGS", note: NOTE.tone, zoom: 6, W: 600, H: 560, diag: false, fps: [60], every: 1, lead: true, strip: 74, pre: "TONE · " } ];
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
  const meta0 = loadSet("primary").meta;
  const env = await page.evaluate(async (bR, bT) => { window.__gab = await ofCharLoad("gabriel"); window.__bR = bR; window.__bT = bT;
    Object.assign(RV1, { labels: false, blind: 0, rate: 1 }); Object.assign(RV1.ov, { skel: false, feet: false, com: false, trail: false });
    return { ua: navigator.userAgent, runnerChar: RV1.entry.id || "vinicius", tackler: window.__gab.id, gabTris: window.__gab.mesh.triangleCount }; }, meta0.bonesR, meta0.bonesT);
  console.log("viewer:", JSON.stringify(env));
  const capture = { tool: "abi1_capture.cjs", env, views: {} };
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue; const t0 = Date.now(), S = loadSet(V0.set), panels = PANELS(V0.cs, V0.pre || "");
    const seqOf = (key) => [...(V0.lead ? S.lead.filter((_, j) => j % V0.every === 0).map(f => ({ ...f, key })) : []), ...S.runs[key].filter(f => f.n % V0.every === 0).map(f => ({ ...f, key }))];
    const seqs = panels.map(p => seqOf(p.key)), N = seqs[0].length, CW = V0.W * panels.length, CH = V0.H + V0.strip, mk = S.meta.markers;
    const marks = { contact: mk.firstContact, response: mk.firstResponse && mk.firstResponse.B, w1End: 60, supportLoss: (mk.support[`A_N2_${V0.cs}`] || []).find(t => t.foot === "R" && t.to === "OFF"), steps: mk.steps[`C_N2_${V0.cs}`] || [] };
    const winEnd = Object.fromEntries(panels.map(p => [p.key, S.meta.runs[p.key].windowEnd]));
    await page.evaluate((CW, CH, fps) => { window.__enc = {}; for (const f of fps) { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: f }, fastStart: "in-memory" });
      const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * f * 0.12), framerate: f, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc[f] = { muxer, enc, f }; }
      window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH, V0.fps);
    const timeline = (() => { const out = []; seqs[0].forEach((f, j) => { const w = f.phase === "lead" ? "lead" : f.n === 0 ? "entry" : V0.authOnly ? "auth" : f.n <= winEnd[panels[0].key] ? (V0.cs === "LEGS" ? "ext" : "w1") : "beyond"; const last = out[out.length - 1]; if (last && last.w === w) last.b = j; else out.push({ w, a: j, b: j }); }); return out; })();
    const idxOf = (n) => seqs[0].findIndex(f => f.phase === "phys" && f.n === n), frameIdx = [];
    const tlMarks = [{ n: marks.contact, col: "#ffe14a", t: "contact" }, { n: marks.supportLoss ? marks.supportLoss.n : null, col: "#ff78c8", t: "R foot support lost (A)" }, { n: marks.response, col: "#7fe3ff", t: "first active response (B / C)" }, { n: V0.authOnly ? null : marks.w1End, col: "#ffffff", t: "W1 end" },
      ...marks.steps.filter(s => s.phase === "SWING" || s.phase === "HOLD").map(s => ({ n: s.n, col: "#ffb35c", t: s.phase === "SWING" ? "C step trigger" : "C touchdown sensed" }))].filter(m => m.n != null).map(m => ({ ...m, j: idxOf(m.n) })).filter(m => m.j >= 0);
    for (let k = 0; k < N; k++) {
      const r = await page.evaluate((V0, Fs, k, N, panels, tl, tlMarks, winEnd, marks) => {
        /* global RV1, rv1Render, rv1Proj, ofCharDraw, V3 */
        const S = RV1, gl = S.R.gl, bR = window.__bR, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H;
        c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
        const box = (txt, x, y, px, col, bg, align) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width, xa = align === "right" ? x - w : align === "center" ? x - w / 2 : x; c.fillStyle = bg || "rgba(8,12,10,0.72)"; c.fillRect(xa - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, xa, y); };
        const panelDraw = (F, x0, P) => {
          const lane = (who, Pp, skinOn) => ({ key: who, i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: F.auth[who][0], y: F.auth[who][1], heading: 0, v: 0, vx: 0, vy: 0 }, fk: { joint: Pp.joint, tip: Pp.tip, world: [] }, skin: skinOn ? new Float32Array(Pp.skin) : null, pose: { legs: { L: { st: false }, R: { st: false } } } });
          S.fixedLayout = { W, H, views: [{ id: "game", x: 0, y: 0, w: W, h: H }] }; S.zoom = V0.zoom; S.lanes = [lane("runner", F.runner, true), lane("tackler", F.tackler, false)]; S.run1 = null; rv1Render();
          const vw = S.fixedLayout.views[0], cam = vw.cam; gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
          ofCharDraw(S.R, window.__gab, new Float32Array(F.tackler.skin), cam.view, cam.proj); gl.finish();
          c.drawImage(document.getElementById("gl"), 0, 0, W, H, x0, 0, W, H);
          const Pj = (q) => { const a = rv1Proj(cam, vw, 1, q); return a ? [a[0] + x0, a[1]] : null; };
          if (V0.diag && F.phase === "phys") { c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
            const skel = (Pp, col, bones) => { c.strokeStyle = col; c.lineWidth = 1.6; for (const b of bones) { if (b.parent == null || b.name === "pelvis" || b.name === "hair") continue; const a = Pj(Pp.joint[b.parent]), e = Pj(Pp.joint[b.idx]); if (a && e) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } } };
            const poly = (pts, col, dash, fill) => { const q = (pts || []).map(Pj).filter(Boolean); if (q.length < 3) return; c.setLineDash(dash || []); c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.stroke(); c.setLineDash([]); };
            const diamond = (pt, col, hollow) => { const a = pt && Pj(pt); if (!a) return; c.beginPath(); c.moveTo(a[0], a[1] - 7); c.lineTo(a[0] + 7, a[1]); c.lineTo(a[0], a[1] + 7); c.lineTo(a[0] - 7, a[1]); c.closePath(); if (hollow) { c.strokeStyle = col; c.lineWidth = 2; c.stroke(); } else { c.fillStyle = col; c.fill(); } };
            poly(F.bosNow, "rgba(120,255,160,0.95)", null, "rgba(120,255,160,0.12)"); diamond(F.xiNow, "#ffd45e", false);
            if (F.ctl) { poly(F.ctl.bos, "rgba(127,227,255,0.9)", [5, 4]); diamond(F.ctl.xi, "#7fe3ff", true);
              if (F.ctl.step && F.ctl.step.foothold) { const g = Pj(F.ctl.step.foothold); if (g) { c.strokeStyle = "#ffb35c"; c.lineWidth = 2.4; c.beginPath(); c.arc(g[0], g[1], 9, 0, 7); c.stroke(); c.beginPath(); c.moveTo(g[0] - 13, g[1]); c.lineTo(g[0] + 13, g[1]); c.moveTo(g[0], g[1] - 13); c.lineTo(g[0], g[1] + 13); c.stroke(); } }
              if (F.ctl.step && F.ctl.step.ref) { const g = Pj(F.ctl.step.ref); if (g) { c.fillStyle = "#ffb35c"; c.beginPath(); c.arc(g[0], g[1], 4, 0, 7); c.fill(); } } }
            skel(F.runner, "rgba(255,255,255,0.95)", bR); skel(F.tackler, "rgba(255,170,60,0.95)", window.__bT);
            if (F.comR) for (const [cm, col] of [[F.comR, "#ffd45e"], [F.comT, "#7fe3ff"]]) { const a = Pj(cm.c), e = Pj(V3.add(cm.c, V3.scale(cm.v, 0.25))); if (!a) continue; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(a[0], a[1], 6, 0, 7); c.stroke();
              if (e && Math.hypot(...cm.v) > 0.02) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
            if (F.feetR) for (const [sd, bn] of [["L", "foot_L"], ["R", "foot_R"]]) { const bi = bR.find(b => b.name === bn).idx, an = F.runner.joint[bi], g = Pj([an[0], 0.002, an[2]]); if (!g || F.feetR[sd] == null) continue; const col = sd === "L" ? "#ff78c8" : "#78ffa0"; c.beginPath(); c.arc(g[0], g[1] + 4, 7, 0, 7); c.fillStyle = F.feetR[sd] > 0 ? col : "rgba(0,0,0,0)"; c.fill(); c.strokeStyle = col; c.lineWidth = 1.6; c.stroke(); }
            for (const x of F.cross || []) for (const q of x.points) { const a = Pj(q), e = Pj(V3.add(q, V3.scale(x.nTR, 0.08))); if (!a) continue; c.fillStyle = "#ffe14a"; c.beginPath(); c.arc(a[0], a[1], 4, 0, 7); c.fill(); if (e) { c.strokeStyle = "#ffe14a"; c.lineWidth = 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
            c.restore();
            const lines = [`cross impulse ${(F.crossJ || 0).toFixed(2)} N·s · foot loads L ${(F.feetR.L * 240).toFixed(0)} / R ${(F.feetR.R * 240).toFixed(0)} N`];
            if (F.ctl) lines.push(`controller: Δτ max ${(F.ctl.dtauMax || 0).toFixed(1)} N·m · sensed support ${F.ctl.sup ? F.ctl.sup.map(s => (s ? "■" : "□")).join("") : "—"} (L R)${F.ctl.step ? " · step " + F.ctl.step.phase + (F.ctl.step.leg === 1 ? " (right)" : " (left)") : ""}`);
            lines.forEach((t, i) => box(t, x0 + 10, H - 12 - (lines.length - 1 - i) * 18, 11, "#ffe7a3")); }
          box(P.label, x0 + 10, 26, 15, P.col);
          if (F.phase === "phys" && !V0.authOnly && F.n > winEnd[P.key]) box(V0.cs === "LEGS" ? "outside the EXT window — no inference" : "NON-AUTHORITATIVE CONTACT FROM HERE — no inference", x0 + 10, 50, 11, "#ffb3a6", "rgba(70,16,12,0.85)");
          if (V0.diag && F.phase === "phys" && F.tacklerBad) box("tackler integrity marker (ankle at limit)", x0 + 10, 72, 10, "#ffb37a"); };
        Fs.forEach((F, i) => panelDraw(F, i * W, panels[i]));
        const F = Fs[0], y0 = H, isLead = F.phase === "lead";
        const txt = (s, x, y, px, col) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; c.fillStyle = col; c.fillText(s, x, y); };
        c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, V0.strip);
        const BC = { lead: "#4aa8ff", entry: "#d8e6ff", w1: "#3fd17a", ext: "#9a8cff", auth: "#3fd17a", beyond: "#6a3a36" }, T = { x: 12, w: comp.width - 24, y: y0 + 8, h: 9 };
        tl.forEach(sg => { c.fillStyle = BC[sg.w]; c.fillRect(T.x + sg.a * T.w / N, T.y, Math.max(1, (sg.b - sg.a + 1) * T.w / N - 1), T.h); });
        tlMarks.forEach(m => { const x = T.x + (m.j + 0.5) * T.w / N; c.fillStyle = m.col; c.beginPath(); c.moveTo(x, T.y + T.h + 1); c.lineTo(x - 4, T.y + T.h + 7); c.lineTo(x + 4, T.y + T.h + 7); c.fill(); });
        const xk = T.x + (k + 0.5) * T.w / N; c.fillStyle = "#fff"; c.fillRect(xk - 1.5, T.y - 3, 3, T.h + 6);
        const fc = marks.contact, sinceC = !isLead && fc != null && F.n >= fc ? ` · +${((F.n - fc) * 1000 / 240).toFixed(1)} ms after first contact` : "";
        txt(isLead ? `τ ${F.tauMs.toFixed(1)} ms before activation · lead-in (no physics: runner = frozen presentation; tackler = constructed from the authoritative slide)` : `τ +${F.tauMs.toFixed(2)} ms after activation · record step ${F.n}${F.n === fc ? " · FIRST NATIVE CONTACT" : sinceC}`, 12, y0 + 34, 13, isLead ? "#bfe9ff" : "#ffe7a3");
        txt(`ABI-1 · same entry state and same native collision in A, B and C · ${V0.note} · frozen camera CAMERA_V1 · ${V0.zoom > 1 ? "viewer zoom " + V0.zoom + "× (same pose / perspective)" : "zoom 1×"}`, 12, y0 + 52, 11, "#c9d6cf");
        txt("every recorded 1/240 s step is one frame · no interpolation, no amplification, no authored animation · markers: ▲ yellow contact · ▲ pink right-foot support lost (A) · ▲ cyan first active response · ▲ white W1 end · ▲ orange C step trigger / touchdown", 12, y0 + 68, 10, "#9fb3a9");
        for (const f of Object.keys(window.__enc)) { const E = window.__enc[f], dur = 1e6 / E.f, vf = new VideoFrame(comp, { timestamp: Math.round(k * dur), duration: Math.round(dur) }); E.enc.encode(vf, { keyFrame: k % 12 === 0 }); vf.close(); }
        return { png: comp.toDataURL("image/png") };
      }, { ...V0 }, seqs.map(s => s[k]), k, N, panels, timeline, tlMarks, winEnd, marks);
      const d = path.join(OUT, "frames", V0.id); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, String(k).padStart(4, "0") + ".png"), Buffer.from(r.png.split(",")[1], "base64"));
      frameIdx.push([seqs[0][k].phase === "lead" ? -1 : seqs[0][k].n, seqs[0][k].tauMs]); }
    const vids = await page.evaluate(async () => { const out = {}; for (const [f, E] of Object.entries(window.__enc)) { await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const b = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); out[f] = btoa(s); } return { out, err: window.__encErr || null }; });
    if (vids.err) throw new Error(vids.err); fs.mkdirSync(path.join(OUT, "video"), { recursive: true });
    const names = {}; for (const [f, b64] of Object.entries(vids.out)) { const name = `${V0.id}${V0.every === 4 ? "_1x" : +f === 60 ? "_0.25x" : "_0.10x"}.mp4`; names[f] = name; fs.writeFileSync(path.join(OUT, "video", name), Buffer.from(b64, "base64")); }
    capture.views[V0.id] = { set: V0.set, contactSet: V0.cs, frames: N, size: [CW, CH], zoom: V0.zoom, fps: V0.fps, every: V0.every, videos: names, index: frameIdx, marks: tlMarks.map(m => ({ n: m.n, t: m.t })), windowEnd: winEnd, seconds: (Date.now() - t0) / 1000 };
    console.log(`${V0.id}: ${N} frames ${CW}×${CH} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l)); const cf = path.join(OUT, "capture.json"); const prev = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf)) : { views: {} };
  capture.views = { ...prev.views, ...capture.views }; fs.writeFileSync(cf, JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} });
