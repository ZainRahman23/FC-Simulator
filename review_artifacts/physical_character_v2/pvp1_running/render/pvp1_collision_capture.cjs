// PVP-1 COLLISION REVIEW CAPTURE (presentation only): pvp1_capture.cjs / sp_capture.cjs's page, encoder and character renderer, with
//   CAMERA   a per-frame camera on the collision: target = the clip's cam.tgt (the smoothed 3-D midpoint of the two players' COMs), eye at the panel's
//            azimuth (az: 0 = in front of the tackler, 90 = on the tackler's left = the side the recipient comes from, 180 = behind), elevation (el)
//            and distance max(d, 1.3 × the players' COM separation + 2.3 m): close at contact, wider while they are apart; vertical field of view `fov` (deg). The frozen viewer's rv1CloseCam is wrapped in the page only for these renders.
//   CLEAN    meshes only, the time from first contact, and the FIRST-CONTACT frame marked (red border + banner).
//   DIAG     (P0.diag) no meshes: both characters' colliders (tackler cyan, recipient magenta) and joint skeletons (yellow / orange); player–player
//            contact points (red), the contact NORMAL on the recipient (white, 0.3 m), the contact FORCE on the recipient (yellow, 0.3 m per kN, N
//            labelled); the first-contact point (persistent white ring + label); the struck RIGHT foot (orange ring) and the recipient's SUPPORT
//            (green rings, turf load in BW); both COMs (dots + drop lines to the turf).
//   STILLS   V0.stillsN = [steps]: the composed frame at those steps is also written as PNG.
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node pvp1_collision_capture.cjs --clips <dir> --views <json> --archive <tag archive> --out <dir>
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
  await page.evaluate(async () => { window.__gab = await ofCharLoad("gabriel"); window.__vin = await ofCharLoad("vinicius"); const orig = window.rv1CloseCam; window.rv1CloseCam = function (subj, angle, vw, vh) { const C = window.__cam; if (!C) return orig.apply(this, arguments); return { view: rv1LookAt(C.eye, C.tgt, [0, 1, 0]), proj: rv1Persp(C.fy, vw / vh, 0.1, 200), eye: C.eye }; }; Object.assign(RV1, { labels: false, blind: 0, rate: 1 }); Object.assign(RV1.ov, { skel: false, feet: false, com: false, trail: false }); });
  const capture = { tool: "pvp1_collision_capture.cjs", views: {} }, STRIP = 34;
  for (const V0 of VIEWS) { if (ONLY && !ONLY.split(",").includes(V0.id)) continue;
    const fr0 = (p) => p.fromN ?? V0.fromN ?? (p.from || V0.from || 1), seqs = V0.panels.map(p => load(p.k).filter(f => f.n >= fr0(p) && f.n <= (p.to || V0.to || 1e9) && (f.n - fr0(p)) % V0.every === 0)), N = Math.min(...seqs.map(s => s.length)), CW = V0.W * V0.panels.length, CH = V0.H + STRIP;
    await page.evaluate((CW, CH) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: 60 }, fastStart: "in-memory" });
      const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encErr = String(e); } }); enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: Math.round(CW * CH * 60 * 0.14), framerate: 60, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } }); window.__enc = { muxer, enc };
      window.__comp = document.createElement("canvas"); window.__comp.width = CW; window.__comp.height = CH; }, CW, CH);
    const t0 = Date.now(), idx = [];
    const stillsSet = new Set(V0.stillsN || []), contactK = seqs[0].findIndex(f => f.isFirst || f.ms === 0); fs.mkdirSync(path.join(OUT, "stills"), { recursive: true });
    for (let k = 0; k < N; k++) {
      const r = await page.evaluate((V0, Fs, k, N, wantStill, contactK) => {
        const S = RV1, gl = S.R.gl, comp = window.__comp, c = comp.getContext("2d"), W = V0.W, H = V0.H; c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, comp.width, comp.height);
        const box = (txt, x, y, px, col, bg) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; c.fillStyle = bg || "rgba(8,12,10,0.72)"; c.fillRect(x - 5, y - px * 0.82 - 4, w + 10, px + 8); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); return w; };
        const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
        const NM = { foot_R: "right boot", foot_L: "left boot", shank_R: "right shin", shank_L: "left shin", thigh_R: "right thigh", thigh_L: "left thigh", pelvis: "pelvis", abdomen: "abdomen", thorax: "chest", head: "head", upperArm_R: "right upper arm", upperArm_L: "left upper arm", forearm_R: "right forearm", forearm_L: "left forearm" };
        const tName = (b) => (b === "foot_R" ? "tackling right boot" : NM[b] || b), rName = (b) => (b === "foot_R" ? "loaded right boot" : NM[b] || b);
        Fs.forEach((F, pi) => { const x0 = pi * W, P0 = V0.panels[pi];
          const lane = (who, Pp, sim) => ({ key: who, i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim, fk: { joint: Pp.joint, tip: Pp.tip, world: [] }, skin: null, pose: { legs: { L: { st: false }, R: { st: false } } } });
          const simT = { x: F.pitch[0], y: F.pitch[1], heading: 0, v: 0, vx: 0, vy: 0 }, lanes = [lane("tackler", F.tackler, simT), lane("runner", F.runner, { ...simT })];
          const az = P0.az * Math.PI / 180, el = P0.el * Math.PI / 180, C = F.cam, d = Math.max(P0.d, (P0.dk ?? 1.3) * (C.sep || 0) + (P0.d0 ?? 2.3)), hor = add(sc(C.fwd, Math.cos(az)), sc(C.left, Math.sin(az)));
          window.__cam = { tgt: C.tgt, eye: add(C.tgt, add(sc(hor, d * Math.cos(el)), [0, d * Math.sin(el), 0])), fy: 1 / Math.tan((P0.fov || 30) * Math.PI / 360) };
          S.fixedLayout = { W: W, H: H, views: [{ id: "A", x: 0, y: 0, w: W, h: H }] }; S.viewA = "tackler:side"; S.zoom = 1; S.lanes = lanes; S.run1 = null; rv1Render();
          const vw = S.fixedLayout.views[0], cam = vw.cam; gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
          if (!P0.diag) { ofCharDraw(S.R, window.__gab, new Float32Array(F.tackler.skin), cam.view, cam.proj); ofCharDraw(S.R, window.__vin, new Float32Array(F.runner.skin), cam.view, cam.proj); } gl.finish();
          c.drawImage(document.getElementById("gl"), 0, 0, W, H, x0, 0, W, H); window.__cam = null;
          const Pj = (q) => rv1Proj(cam, vw, 1, q); c.save(); c.beginPath(); c.rect(x0, 0, W, H); c.clip();
          const line = (a, b, col, lw, dash) => { const A = Pj(a), Bq = Pj(b); if (!A || !Bq) return; c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath(); c.moveTo(x0 + A[0], A[1]); c.lineTo(x0 + Bq[0], Bq[1]); c.stroke(); c.setLineDash([]); };
          const arrow = (p, v, col, lw) => { const A = Pj(p), Bq = Pj(add(p, v)); if (!A || !Bq) return; line(p, add(p, v), col, lw); const dx = Bq[0] - A[0], dy = Bq[1] - A[1], l = Math.hypot(dx, dy); if (l < 4) return; const ux = dx / l, uy = dy / l, s = Math.min(12, l * 0.4);
            c.fillStyle = col; c.beginPath(); c.moveTo(x0 + Bq[0], Bq[1]); c.lineTo(x0 + Bq[0] - ux * s - uy * s * 0.5, Bq[1] - uy * s + ux * s * 0.5); c.lineTo(x0 + Bq[0] - ux * s + uy * s * 0.5, Bq[1] - uy * s - ux * s * 0.5); c.closePath(); c.fill(); };
          const dot = (p, rr, fill, stroke, lw) => { const A = Pj(p); if (!A) return null; c.beginPath(); c.arc(x0 + A[0], A[1], rr, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } return A; };
          const lab = (p, txt, col, bg, dx, dy) => { const A = Pj(p); if (!A) return; box(txt, x0 + A[0] + (dx || 10), A[1] + (dy || -10), 12, col, bg); };
          if (P0.diag) {
            const poly = (pl, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); let on = false; for (const q of pl) { const a = Pj(q); if (!a) { on = false; continue; } if (on) c.lineTo(x0 + a[0], a[1]); else c.moveTo(x0 + a[0], a[1]); on = true; } c.stroke(); };
            for (const pl of F.wire || []) poly(pl, "rgba(90,230,255,0.55)", 1); for (const pl of F.wireR || []) poly(pl, "rgba(255,110,230,0.55)", 1);
            for (const sg of F.skel || []) poly(sg, "rgba(255,230,80,0.9)", 2.2); for (const sg of F.skelR || []) poly(sg, "rgba(255,150,40,0.9)", 2.2);
            // motion trails since the start of the clip: tackling boot (cyan), struck right foot (orange), both COMs (thin)
            const TK = V0.id + ":" + pi; window.__tr = window.__tr || {}; const tr = (window.__tr[TK] = k === 0 ? { tB: [], sR: [], cT: [], cR: [] } : window.__tr[TK]);
            if (F.tboot) tr.tB.push(F.tboot); tr.sR.push(F.feet[0].p); if (F.coms.T) tr.cT.push(F.coms.T); tr.cR.push(F.coms.R);
            poly(tr.cT, "rgba(90,230,255,0.7)", 1.5); poly(tr.cR, "rgba(255,110,230,0.7)", 1.5); poly(tr.tB, "rgba(0,255,255,1)", 3.5); poly(tr.sR, "rgba(255,140,40,1)", 3.5);
            // COMs
            for (const [p, col, t] of [[F.coms.T, "rgba(90,230,255,1)", "COM tackler"], [F.coms.R, "rgba(255,110,230,1)", "COM recipient"]]) { if (!p) continue; line(p, [p[0], 0.003, p[2]], col, 1.5, [4, 3]); dot([p[0], 0.003, p[2]], 3, col); dot(p, 6, col, "#fff", 2); lab(p, t, "#fff", "rgba(8,12,10,0.6)", 10, -8); }
            // first-contact point (persistent white ring with a cross)
            if (F.first) for (const q of F.first.pts.slice(0, 1)) { const A = dot(q, 12, null, "#ffffff", 2.5); if (A) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + A[0] - 9, A[1] - 9); c.lineTo(x0 + A[0] + 9, A[1] + 9); c.moveTo(x0 + A[0] + 9, A[1] - 9); c.lineTo(x0 + A[0] - 9, A[1] + 9); c.stroke(); } }
            // tackling boot, struck foot, far foot (rings; support = green ring sized by the turf load)
            if (F.tboot) { dot(F.tboot, 9, null, "rgba(0,255,255,1)", 3); lab(F.tboot, "tackling boot", "#9ff", "rgba(8,12,10,0.6)", -100, 26); }
            for (const ft of F.feet) { const sup = !ft.kin && ft.load > 0.02; if (sup) dot(ft.p, 9 + Math.min(14, ft.load * 6), null, "rgba(90,255,140,0.95)", 3); if (ft.side === "R") dot(ft.p, 7, null, "rgba(255,140,40,1)", 3); else dot(ft.p, 5, null, "rgba(200,255,220,0.9)", 2);
              lab(ft.p, ft.side === "R" ? "struck R" : "far L", ft.side === "R" ? "#ffb070" : "#c8ffd8", "rgba(8,12,10,0.6)", 12, ft.side === "R" ? 22 : -14); }
            // player–player contacts this step: points (red), NORMAL on the recipient (white, 0.3 m), FORCE on the recipient (yellow, 0.3 m per kN) — drawn last
            for (const ct of F.cross || []) { const m = ct.pts.reduce((s2, q) => add(s2, q), [0, 0, 0]).map(x => x / ct.pts.length); for (const q of ct.pts) dot(q, 4, "rgba(255,40,40,1)", "#fff", 1);
              arrow(m, sc(ct.n, 0.3), "rgba(255,255,255,1)", 3); if (Math.hypot(...ct.F) > 1) arrow(m, sc(ct.F, 0.3 / 1000), "rgba(255,225,40,1)", 4); }
            // info box (text kept out of the contact region)
            let yy = F.isFirst ? 132 : 56; const info = (t, col) => { box(t, x0 + 10, yy, 12, col || "#e6efe9"); yy += 19; };
            if (F.first) info(`first contact (0 ms): tackler ${tName(F.first.pairs[0][1])} → recipient ${rName(F.first.pairs[0][0])}`, "#ffd0d0");
            if ((F.cross || []).length) for (const ct of F.cross) info(`contact now: tackler ${tName(ct.t)} → recipient ${rName(ct.r)} · ${Math.round(Math.hypot(...ct.F))} N`, "#ffe94a"); else info("no player–player contact this step", "#9fb3a8");
            const fr = F.feet[0], fl = F.feet[1]; info(fr.kin ? "recipient: RUN-1 animation (no turf loads yet)" : `recipient support: right ${fr.load > 0.02 ? fr.load.toFixed(2) + " BW" : "off the turf"} · left ${fl.load > 0.02 ? fl.load.toFixed(2) + " BW" : "off the turf"}`, "#c8ffd8");
            box("trails: cyan = tackling boot · orange = struck right foot · thin = COMs", x0 + 10, H - 56, 11, "#e6efe9"); box("arrows on the recipient: white = contact normal · yellow = contact force (0.3 m per kN)", x0 + 10, H - 37, 11, "#e6efe9"); }
          if (F.isFirst) { c.strokeStyle = "#ff2a2a"; c.lineWidth = 10; c.strokeRect(x0 + 5, 5, W - 10, H - 10); }
          c.restore();
          if (F.isFirst) { box("FIRST PLAYER–PLAYER CONTACT", x0 + 18, 70, 22, "#ffffff", "rgba(210,20,20,0.92)"); if (F.first) box(`tackler ${tName(F.first.pairs[0][1])} → recipient ${rName(F.first.pairs[0][0])}`, x0 + 18, 102, 15, "#ffffff", "rgba(150,20,20,0.85)"); }
          box(P0.l, x0 + 10, 26, W < 400 ? 12 : 16, "#ffffff");
          const tpx = W < 400 ? 13 : 20, tl = F.ms === 0 ? (W < 400 ? "0 ms" : "CONTACT  0 ms") : (F.ms > 0 ? "+" : "") + F.ms + " ms"; c.font = `700 ${tpx}px -apple-system, Helvetica, Arial`; const tw = c.measureText(tl).width; box(tl, x0 + W - tw - 12, W < 400 ? 48 : 28, tpx, F.ms === 0 ? "#fff" : F.ms < 0 ? "#cfe9ff" : "#ffe7a3", F.ms === 0 ? "rgba(210,20,20,0.92)" : undefined);
          if (F.hud && F.hud.recKin) box(W < 400 ? "RUN-1 animation" : "recipient: RUN-1 animation (physical from −50 ms)", x0 + 10, H - 14, W < 400 ? 10 : 12, "#cfe9ff"); });
        const F = Fs[0], y0 = H; c.fillStyle = "#121a16"; c.fillRect(0, y0, comp.width, 34); const T = { x: 12, w: comp.width - 24, y: y0 + 6, h: 6 };
        c.fillStyle = "#2f4a3c"; c.fillRect(T.x, T.y, T.w, T.h); if (contactK >= 0) { c.fillStyle = "#ff2a2a"; const xc = T.x + (contactK + 0.5) * T.w / N; c.fillRect(xc - 2, T.y - 5, 4, T.h + 10); }
        c.fillStyle = "#fff"; const xk = T.x + (k + 0.5) * T.w / N; c.fillRect(xk - 1.5, T.y - 3, 3, T.h + 6);
        c.font = "600 12px -apple-system, Helvetica, Arial"; c.fillStyle = "#ffe7a3"; c.fillText(`${F.ms >= 0 ? "+" : ""}${F.ms} ms from the first player–player contact (red tick) · sim step ${F.n} · ${V0.rate || ""}`, 12, y0 + 28);
        const vf = new VideoFrame(comp, { timestamp: Math.round(k * 1e6 / 60), duration: Math.round(1e6 / 60) }); window.__enc.enc.encode(vf, { keyFrame: k % 60 === 0 }); vf.close(); return { n: F.n, still: wantStill ? comp.toDataURL("image/png") : null };
      }, V0, seqs.map(s => s[k]), k, N, stillsSet.has(seqs[0][k].n), contactK);
      if (r.still) fs.writeFileSync(path.join(OUT, "stills", `${V0.id}_n${r.n}.png`), Buffer.from(r.still.split(",")[1], "base64"));
      idx.push(r.n); }
    const bytes = await page.evaluate(async () => { await window.__enc.enc.flush(); window.__enc.muxer.finalize(); const b = new Uint8Array(window.__enc.muxer.target.buffer); let s = ""; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s); });
    fs.writeFileSync(path.join(OUT, V0.id + ".mp4"), Buffer.from(bytes, "base64")); capture.views[V0.id] = { panels: V0.panels.map(p => ({ k: p.k, l: p.l, az: p.az, el: p.el, d: p.d, fov: p.fov, diag: !!p.diag })), frames: N, every: V0.every, size: [CW, CH], first: idx[0], last: idx[idx.length - 1], ms: Date.now() - t0 };
    console.log(V0.id, N, "frames", ((Date.now() - t0) / 1000).toFixed(1), "s"); }
  fs.writeFileSync(path.join(OUT, "CAPTURE.json"), JSON.stringify({ ...capture, logs: logs.filter(l => /error|PAGEERROR/i.test(l)).slice(0, 20) }, null, 1));
  await browser.close(); SPAWNED.forEach(p => p.kill()); })().catch(e => { console.error(e); SPAWNED.forEach(p => p.kill()); process.exit(1); });
