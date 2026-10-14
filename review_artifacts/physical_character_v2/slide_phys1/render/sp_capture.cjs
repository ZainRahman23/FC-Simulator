// SLIDE-PHYS-1 VISUAL CAPTURE (presentation only). The frozen RUN-1 viewer (CAMERA_V1 gameplay camera, pitch, stadium) from the Locomotion V2
// tag archive + the frozen character renderer, exactly as PVP-0 / TRC-1: tackler = gabriel (MC-1P, drawn on its V2 joints), recipient = vinicius.
// One video = a row of synchronised panels; every recorded 1/240 s step is one source frame; `every` steps per 60 fps video frame (4 = 1×, 2 = 0.5×,
// 1 = 0.25×). Panel views: { view: "game", zoom } (the gameplay camera, rail following the tackler; zoom > 1 = subject-centred crop of the same camera)
// or { view: "close", angle } (the viewer's close camera: side, front34, rear34, front, rear, sideR, top). Optional per-panel turf-contact markers.
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node sp_capture.cjs --clips <dir> --views <json> --archive <tag archive> --out <dir> [--only id]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8383"), ONLY = arg("only", null), SPAWNED = [];
const cache = {}, load = (k) => cache[k] || (cache[k] = JSON.parse(fs.readFileSync(path.join(CL, k + ".json"))).frames);
const VIEWS = JSON.parse(fs.readFileSync(arg("views")));
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
  const capture = { tool: "sp_capture.cjs", views: {} }, STRIP = 34;
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue;
    const fr0 = (p) => p.fromN ?? V0.fromN ?? (p.from || V0.from || 1), seqs = V0.panels.map(p => load(p.k).filter(f => f.n >= fr0(p) && f.n <= (p.to || V0.to || 1e9) && (f.n - fr0(p)) % V0.every === 0)), N = Math.min(...seqs.map(s => s.length)), CW = V0.W * V0.panels.length, CH = V0.H + STRIP;
    await page.evaluate((CW, CH) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: 60 }, fastStart: "in-memory" });
      const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * 60 * 0.14), framerate: 60, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc = { muxer, enc };
      window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH);
    const t0 = Date.now(), idx = [];
    for (let k = 0; k < N; k++) {
      const r = await page.evaluate((V0, Fs, k, N) => {
        const S = RV1, gl = S.R.gl, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H; c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
        const box = (txt, x, y, px, col, bg) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; c.fillStyle = bg || "rgba(8,12,10,0.72)"; c.fillRect(x - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); };
        Fs.forEach((F, pi) => { const x0 = pi * W, P0 = V0.panels[pi];
          const lane = (who, Pp, sim) => ({ key: who, i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim, fk: { joint: Pp.joint, tip: Pp.tip, world: [] }, skin: null, pose: { legs: { L: { st: false }, R: { st: false } } } });
          const simT = { x: P0.camFix ? P0.camFix[0] : F.pitch[0], y: P0.camFix ? P0.camFix[1] : F.pitch[1], heading: P0.heading ?? 0, v: 0, vx: 0, vy: 0 };
          const lanes = [lane("tackler", F.tackler, simT)]; if (F.runner) lanes.push(lane("runner", F.runner, { ...simT }));
          if (P0.view === "close") { S.fixedLayout = { W: W, H: H, views: [{ id: "A", x: 0, y: 0, w: W, h: H }] }; S.viewA = "tackler:" + (P0.angle || "side"); }
          else S.fixedLayout = { W: W, H: H, views: [{ id: "game", x: 0, y: 0, w: W, h: H }] };
          S.zoom = P0.zoom || 1; S.lanes = lanes; S.run1 = null; rv1Render();
          const vw = S.fixedLayout.views[0], cam = vw.cam; gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
          const SK = P0.show === "intent" && F.intent ? F.intent : F.tackler; if (P0.mesh !== false) ofCharDraw(S.R, window.__gab, new Float32Array(SK.skin), cam.view, cam.proj); if (F.runner) ofCharDraw(S.R, S.entry || window.__vin, new Float32Array(F.runner.skin), cam.view, cam.proj); gl.finish();
          if (P0.crop) c.drawImage(document.getElementById("gl"), P0.crop[0], P0.crop[1], P0.crop[2], P0.crop[3], x0, 0, W, H); else c.drawImage(document.getElementById("gl"), 0, 0, W, H, x0, 0, W, H);
          if (F.obst && F.obst.length) { const Pj = (q) => rv1Proj(cam, vw, 1, q); c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
            for (const ob of F.obst) { const pts = ob.c.map(Pj).filter(Boolean).map(a => [x0 + a[0], a[1]]); if (pts.length < 3) continue; pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
              const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = []; for (const q of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
              for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); } const hull = lo.slice(0, -1).concat(hi.slice(0, -1));
              c.beginPath(); hull.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.fillStyle = ob.dyn ? "rgba(255,150,40,0.55)" : "rgba(170,170,190,0.6)"; c.fill(); c.strokeStyle = "rgba(20,20,20,0.9)"; c.lineWidth = 1.5; c.stroke(); } c.restore(); }
          if (P0.contacts) { const Pj = (q) => rv1Proj(cam, vw, 1, q); c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
            for (const ct of F.turf || []) for (const q of ct.pts) { const a = Pj(q); if (!a) continue; c.fillStyle = /^foot_/.test(ct.body) ? "rgba(255,215,60,0.95)" : /^forearm_/.test(ct.body) ? "rgba(120,200,255,0.95)" : "rgba(255,90,90,0.95)"; c.beginPath(); c.arc(x0 + a[0], a[1], ct.J > 0 ? 3.2 : 1.8, 0, 7); c.fill(); } c.restore(); }
          // SP2A (opt-in): collision-shape wireframe + physical joint skeleton (P0.wire), authored-intent skeleton ghost (P0.ghost)
          if ((P0.wire && F.wire) || (P0.ghost && F.intentSkel)) { const Pj = (q) => rv1Proj(cam, vw, 1, q); c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
            const poly = (pl, col, lw, dash) => { c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath(); let on = false; for (const q of pl) { const a = Pj(q); if (!a) { on = false; continue; } if (on) c.lineTo(x0 + a[0], a[1]); else c.moveTo(x0 + a[0], a[1]); on = true; } c.stroke(); };
            if (P0.wire && F.wire) { for (const pl of F.wire) poly(pl, P0.wireCol || "rgba(90,230,255,0.55)", 1); for (const sg of F.skel || []) poly(sg, "rgba(255,230,80,0.95)", 2.4); }
            if (P0.ghost && F.intentSkel) for (const sg of F.intentSkel) poly(sg, "rgba(255,80,220,0.9)", 2, [5, 4]); c.setLineDash([]); c.restore(); }
          // SP2A body-friction sweep diagnostic overlay (opt-in P0.diag; frames carry F.fsd): COM ground trail + current COM drop line, a 0.5 m ruler
          // from the ground-entry point along the travel, contact normal forces (cyan, up) and friction forces (red; boots: yellow = stud-engaged,
          // orange = partial), HUD: multiplier, v_h, slide distance, active contacts, stud engagement. 1 BW (774 N) = 0.5 m of arrow.
          if (P0.diag && F.fsd) { const D = F.fsd, Pj = (q) => rv1Proj(cam, vw, 1, q), key = V0.id + ":" + pi; window.__fsT = window.__fsT || {}; const tr = (window.__fsT[key] = (k === 0 ? [] : window.__fsT[key] || []));
            tr.push([D.com[0], 0.002, D.com[2]]); if (D.entry && !window.__fsT[key + ":e"]) window.__fsT[key + ":e"] = { p: D.entry, d: D.dir }; if (k === 0) delete window.__fsT[key + ":e"];
            c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip(); const line = (a, b, col, lw) => { const A = Pj(a), Bq = Pj(b); if (!A || !Bq) return; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x0 + A[0], A[1]); c.lineTo(x0 + Bq[0], Bq[1]); c.stroke(); };
            const E = window.__fsT[key + ":e"]; if (E) { const d = E.d, lat = [d[2], 0, -d[0]]; for (let s = 0; s <= 30; s++) { const m0 = s * 0.5, b = [E.p[0] + d[0] * m0, 0.003, E.p[2] + d[2] * m0], w = s % 2 === 0 ? 0.25 : 0.12; line([b[0] - lat[0] * w, 0.003, b[2] - lat[2] * w], [b[0] + lat[0] * w, 0.003, b[2] + lat[2] * w], s % 2 === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)", s % 2 === 0 ? 2 : 1);
                if (s % 2 === 0) { const L0 = Pj([b[0] + lat[0] * 0.32, 0.003, b[2] + lat[2] * 0.32]); if (L0) { c.font = "600 11px -apple-system, Helvetica, Arial"; c.fillStyle = "rgba(255,255,255,0.9)"; c.fillText((s / 2) + " m", x0 + L0[0] - 8, L0[1] + 4); } } } }
            c.strokeStyle = "rgba(255,230,80,0.95)"; c.lineWidth = 2.2; c.beginPath(); let on = false; for (const q of tr) { const a = Pj(q); if (!a) { on = false; continue; } if (on) c.lineTo(x0 + a[0], a[1]); else c.moveTo(x0 + a[0], a[1]); on = true; } c.stroke();
            line(D.com, [D.com[0], 0.002, D.com[2]], "rgba(255,230,80,0.8)", 1.5); const Cm = Pj(D.com); if (Cm) { c.fillStyle = "rgba(255,230,80,1)"; c.beginPath(); c.arc(x0 + Cm[0], Cm[1], 4, 0, 7); c.fill(); }
            const sc = 0.5 / 774; for (const q of D.cs) { line(q.p, [q.p[0], q.p[1] + q.N * sc, q.p[2]], "rgba(90,230,255,0.95)", 2.2); const fc = q.k == null ? "rgba(255,70,70,0.95)" : q.k >= 0.999 ? "rgba(255,230,0,1)" : q.k > 0 ? "rgba(255,150,40,1)" : "rgba(255,70,70,0.95)"; line(q.p, [q.p[0] + q.F[0] * sc, q.p[1] + 0.004, q.p[2] + q.F[2] * sc], fc, 2.6); }
            c.restore(); const bw = 774, act = {}; for (const q of D.cs) { const a = act[q.reg] = act[q.reg] || [0, 0]; a[0] += q.N / bw; a[1] += Math.hypot(q.F[0], q.F[2]) / bw; }
            const studs = (s) => { const b = D.cs.filter(q => q.k != null && q.reg.startsWith("boot_" + s)); if (!b.length) return "—"; return b.some(q => q.k >= 0.999) ? "STUD-ENGAGED" : b.some(q => q.k > 0) ? "partial" : "upper/side"; };
            box(`non-stud friction ×${D.m.toFixed(2)}   v_h ${D.vh.toFixed(2)} m/s   slide ${D.dist.toFixed(2)} m`, x0 + 10, H - 64, 13, "#ffe7a3");
            box("turf: " + (Object.keys(act).length ? Object.entries(act).sort((a, b) => b[1][0] - a[1][0]).slice(0, 4).map(([r, [nn, ff]]) => `${r} N${nn.toFixed(1)} F${ff.toFixed(1)}`).join("  ") + " BW" : "airborne"), x0 + 10, H - 40, 12, "#cfe9ff");
            box(`studs: tackling ${studs("R")} · fold ${studs("L")}   (arrows: cyan normal, red friction, 1 BW = 0.5 m)`, x0 + 10, H - 16, 11, "#d8ffd8"); }
          if (P0.hud && F.hud && F.hud.kin) box(F.hud.label || ((F.hud.phase === "flight" ? "authored final flight (kinematic, ballistic COM)" : "RUN-1 run-in (authored animation, kinematic)") + (F.hud.stance ? "  stance: " + (F.hud.stance.L ? "L " : "") + (F.hud.stance.R ? "R" : "") : "")), x0 + 10, H - 16, 12, "#cfe9ff");
          else if (P0.hud && F.hud) { box(`v_h ${F.hud.vh.toFixed(2)} m/s   v_y ${F.hud.vy.toFixed(2)} m/s`, x0 + 10, H - 40, 13, "#ffe7a3");
            box("turf: " + (F.hud.regions.length ? F.hud.regions.slice(0, 4).map(([k, v]) => `${k} ${v.toFixed(1)}BW`).join("  ") : "airborne"), x0 + 10, H - 16, 12, "#cfe9ff"); }
          if (P0.l) box(P0.l, x0 + 10, 24, 14, "#ffffff"); });
        const F = Fs[0], y0 = H; c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, 34); const T = { x: 12, w: comp.width - 24, y: y0 + 6, h: 6 };
        c.fillStyle = "#2f4a3c"; c.fillRect(T.x, T.y, T.w, T.h); c.fillStyle = "#fff"; const xk = T.x + (k + 0.5) * T.w / N; c.fillRect(xk - 1.5, T.y - 3, 3, T.h + 6);
        c.font = "600 12px -apple-system, Helvetica, Arial"; c.fillStyle = "#ffe7a3"; c.fillText(`t ${F.t.toFixed(3)} s ${V0.tlabel || "after the plant touchdown"} · record step ${F.n} · ${V0.rate || ""}`, 12, y0 + 28);
        const vf = new VideoFrame(comp, { timestamp: Math.round(k * 1e6 / 60), duration: Math.round(1e6 / 60) }); window.__enc.enc.encode(vf, { keyFrame: k % 60 === 0 }); vf.close(); return { n: F.n };
      }, V0, seqs.map(s => s[k]), k, N);
      idx.push(r.n); }
    const bytes = await page.evaluate(async () => { await window.__enc.enc.flush(); window.__enc.muxer.finalize(); const b = new Uint8Array(window.__enc.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s); });
    fs.writeFileSync(path.join(OUT, V0.id + ".mp4"), Buffer.from(bytes, "base64")); capture.views[V0.id] = { panels: V0.panels.map(p => ({ k: p.k, l: p.l, view: p.view || "game", zoom: p.zoom || 1, angle: p.angle || null })), frames: N, every: V0.every, size: [CW, CH], first: idx[0], last: idx[idx.length - 1], ms: Date.now() - t0 };
    console.log(V0.id, N, "frames", ((Date.now() - t0) / 1000).toFixed(1), "s"); }
  fs.writeFileSync(path.join(OUT, "CAPTURE.json"), JSON.stringify({ ...capture, logs: logs.filter(l => /error|PAGEERROR/i.test(l)).slice(0, 20) }, null, 1));
  await browser.close(); SPAWNED.forEach(p => p.kill()); })().catch(e => { console.error(e); SPAWNED.forEach(p => p.kill()); process.exit(1); });
