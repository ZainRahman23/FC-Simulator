// IFM-1 SLOW-MOTION REVIEW — CAPTURE (visualisation only). Drives the FROZEN RUN-1 viewer page (sandbox/visual/run1.html of the tag archive, unmodified)
// exactly as ifm1_clip_capture.cjs does: each panel is the viewer's own rv1Render of one injected lane (prepared rig pose → its frozen character mesh,
// skinning, shading, ground, contact shadows) with CAMERA_V1 at the viewer's own gameplay zoom 8 (same camera pose and perspective; subject-centred by
// the viewer's clip-space offset = an exact 8× magnified crop of the 1280 × 720 gameplay projection). LEFT = C0, RIGHT = N, same camera per frame.
// Per frame: render C0 → copy; render N → copy (character only); draw the diagnostic impactor into N's depth buffer → copy. CLEAN and DIAGNOSTIC are
// composed from these SAME copies (overlays are 2D, drawn on top). Every committed record step is one video frame: 0.25× = 240 Hz record at 60 fps,
// 0.1× = at 24 fps. Encoding: WebCodecs H.264 (software) + mp4-muxer (MIT, scratch install) inside the page; lossless PNG composites are saved too.
// Verification data per frame: FNV-1a of the skin matrices actually uploaded (per panel), and left / right base-panel pixel equality.
// usage: PUPPETEER_NODE_MODULES=<dir> MP4_MUXER=<mp4-muxer.js> node ifm1_slowmo_capture.cjs --prep <dir> --archive <tag archive> --out <dir> [--port 8343] [--only SH_R0]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const PREP = arg("prep"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8343"), only = arg("only") ? arg("only").split(",") : null;
const PW = 560, PH = 620, STRIP = 96, CW = PW * 2, CH = PH + STRIP, ZOOM = 8, SPAWNED = [];
const META = JSON.parse(fs.readFileSync(path.join(PREP, "slowmo_meta.json")));
(async () => {
  const root = path.join(OUT, "_serve"); fs.mkdirSync(root, { recursive: true });
  for (const d of ["sandbox", "assets"]) { const l = path.join(root, d); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ARCH, d), l); }
  fs.copyFileSync(process.env.MP4_MUXER, path.join(root, "mp4-muxer.js"));
  const srv = cp.spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1", "--directory", root], { stdio: "ignore" }); SPAWNED.push(srv);
  await new Promise(r => setTimeout(r, 900));
  const browser = await puppeteer.launch({ userDataDir: path.join(OUT, "_profile"), executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${CW + 40},${CH + 300}`] });
  const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: CW + 40, height: CH + 300, deviceScaleFactor: 1 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&lanes=diag`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 60000 });
  await page.addScriptTag({ url: `http://127.0.0.1:${port}/mp4-muxer.js` });
  const env = await page.evaluate((PW, PH, ZOOM, bones) => {
    /* global RV1 */
    const S = RV1; Object.assign(S, { zoom: ZOOM, labels: false, blind: 0, rate: 1 }); Object.assign(S.ov, { skel: false, feet: false, com: false, trail: false });
    S.fixedLayout = { W: PW, H: PH, views: [{ id: "game", x: 0, y: 0, w: PW, h: PH }] }; window.__bones = bones;
    const gl = S.R.gl, sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, `#version 300 es
      layout(location=0) in vec3 aP; uniform mat4 uView, uProj; uniform vec3 uC; uniform float uR; out vec3 vN;
      void main(){ vN = aP; gl_Position = uProj * (uView * vec4(uC + uR * aP, 1.0)); }`));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float; in vec3 vN; layout(location=0) out vec4 o;
      void main(){ vec3 n = normalize(vN); float l = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(-0.42, 0.72, -0.54)))); o = vec4(vec3(1.0, 0.30, 0.82) * l, 1.0); }`));
    gl.linkProgram(p); const v = [], NA = 32, NB = 20;
    for (let i = 0; i < NB; i++) for (let j = 0; j < NA; j++) { const P = (a, b) => { const th = Math.PI * a / NB, ph = 2 * Math.PI * b / NA; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
      v.push(...P(i, j), ...P(i + 1, j), ...P(i + 1, j + 1), ...P(i, j), ...P(i + 1, j + 1), ...P(i, j + 1)); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
    window.__imp = { p, vao, n: v.length / 3, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), c: gl.getUniformLocation(p, "uC"), r: gl.getUniformLocation(p, "uR") } };
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    window.__cv = { L: mk(PW, PH), R: mk(PW, PH), Ri: mk(PW, PH), clean: mk(PW * 2, PH + 96), diag: mk(PW * 2, PH + 96) };
    return { ua: navigator.userAgent, dpr: window.devicePixelRatio, mp4muxer: typeof Mp4Muxer, webcodecs: typeof VideoEncoder };
  }, PW, PH, ZOOM, META.bones);
  console.log("viewer:", JSON.stringify(env));
  const pad = (k) => String(k).padStart(4, "0");
  const files = fs.readdirSync(PREP).filter(f => /^slowmo_.*\.json$/.test(f) && f !== "slowmo_meta.json").sort();
  const capture = { tool: "ifm1_slowmo_capture.cjs", env, panel: [PW, PH], composite: [CW, CH], zoom: ZOOM, cases: {} };
  for (const f of files) { const D = JSON.parse(fs.readFileSync(path.join(PREP, f))), key = `${D.case}_${D.body}`; if (only && !only.includes(key)) continue;
    const t0 = Date.now();
    // set up the four encoders (clean / diag × 0.25× / 0.1×)
    await page.evaluate((CW, CH) => {
      window.__enc = {}; const mk = (name, fps) => { const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: CW, height: CH, frameRate: fps }, fastStart: "in-memory" });
        const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { window.__encErr = String(e); } });
        enc.configure({ codec: "avc1.640028", width: CW, height: CH, bitrate: fps === 60 ? 14e6 : 5.6e6, framerate: fps, hardwareAcceleration: "prefer-software", latencyMode: "quality", avc: { format: "avc" } });
        window.__enc[name] = { muxer, enc, fps }; };
      for (const v of ["clean", "diag"]) { mk(v + "_025", 60); mk(v + "_010", 24); } }, CW, CH);
    const frameLog = [];
    for (let k = 0; k < D.frames.length; k++) {
      const r = await page.evaluate((D, k, PW, PH) => {
        /* global RV1, rv1Render, rv1Proj, V3 */
        const S = RV1, gl = S.R.gl, F = D.frames[k], cv = window.__cv, bones = window.__bones;
        const fnv = (arr) => { let h = 2166136261; const u = new Uint32Array(Float32Array.from(arr).buffer); for (let i = 0; i < u.length; i++) for (let b = 0; b < 4; b++) { h ^= (u[i] >>> (b * 8)) & 255; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
        const lane = (P) => ({ key: "L0", i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: F.simX, y: 36, heading: 0, v: 3, vx: 3, vy: 0 }, fk: { joint: P.joint, tip: P.tip, world: [] }, skin: new Float32Array(P.skin), pose: { legs: { L: { st: false }, R: { st: false } } } });
        const PL = F.phase === "lead" ? F.both : F.C0, PR = F.phase === "lead" ? F.both : F.N;
        const draw = (P, dst) => { S.lanes = [lane(P)]; S.run1 = null; rv1Render(); gl.finish(); dst.getContext("2d").drawImage(document.getElementById("gl"), 0, 0); return S.lanes[0].skin; };
        const skL = draw(PL, cv.L), camL = S.fixedLayout.views[0].cam; const skR = draw(PR, cv.R), vw = S.fixedLayout.views[0], cam = vw.cam;
        const sameCam = Array.from(camL.view).every((x, i) => x === cam.view[i]) && Array.from(camL.proj).every((x, i) => x === cam.proj[i]);
        const imp = F.phase === "phys" ? F.N.imp : null;
        if (imp) { const I = window.__imp; gl.viewport(0, 0, PW, PH); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.useProgram(I.p);
          gl.uniformMatrix4fv(I.u.view, false, cam.view); gl.uniformMatrix4fv(I.u.proj, false, cam.proj); gl.uniform3fv(I.u.c, imp); gl.uniform1f(I.u.r, 0.060);
          gl.bindVertexArray(I.vao); gl.drawArrays(gl.TRIANGLES, 0, I.n); gl.bindVertexArray(null); gl.finish(); }
        cv.Ri.getContext("2d").drawImage(document.getElementById("gl"), 0, 0);
        const pxL = cv.L.getContext("2d").getImageData(0, 0, PW, PH).data, pxR = cv.R.getContext("2d").getImageData(0, 0, PW, PH).data;
        let diffPx = 0; for (let i = 0; i < pxL.length; i += 4) if (pxL[i] !== pxR[i] || pxL[i + 1] !== pxR[i + 1] || pxL[i + 2] !== pxR[i + 2]) diffPx++;
        const P = (q) => rv1Proj(cam, vw, 1, q);
        // ── composition ──
        const tau = F.tauMs, isLead = F.phase === "lead", n = F.n, contactN = D.contact.firstStep;
        const BAND = { lead: ["RUN-1 LEAD-IN (frozen RUN-1, no physics)", "#4aa8ff"], entry: ["ENTRY INTO V2 (τ = 0, n = 0)", "#d8e6ff"], primary: ["PRIMARY WINDOW 0–50 ms", "#3fd17a"],
          secondary: ["SECONDARY, control still valid", "#f0c64a"], outsideControl: [`OUTSIDE CONTROL-VALID WINDOW (> ${D.healthyControlUntilMs.toFixed(1)} ms)`, "#ff8a3d"],
          ownSecondary: [`AFTER N's SECONDARY FAILURE (${D.ownSecondaryFailure ? (D.ownSecondaryFailure.t * 1000).toFixed(1) : ""} ms, ${D.ownSecondaryFailure ? D.ownSecondaryFailure.subsystem.join(", ") : ""})`, "#ff4a4a"],
          invalid: ["MECHANICALLY INVALID — native integrity failed at step 1", "#ff3b3b"] };
        const band = isLead ? "lead" : F.band, [bandTxt, bandCol] = BAND[band];
        const compose = (variant) => {
          const C = cv[variant], c = C.getContext("2d"); c.fillStyle = "#0b0f0d"; c.fillRect(0, 0, C.width, C.height);
          c.drawImage(cv.L, 0, 0); c.drawImage(variant === "diag" || (!isLead && n <= contactN) ? cv.Ri : cv.R, PW, 0);
          c.fillStyle = "#0b0f0d"; c.fillRect(PW - 1, 0, 2, PH);
          const box = (txt, x, y, px, col, bg, align) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width, x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
            c.fillStyle = bg || "rgba(8,12,10,0.72)"; c.fillRect(x0 - 6, y - px * 0.82 - 5, w + 12, px + 9); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x0, y); return w; };
          // band bars on both panels
          for (const x0 of [0, PW]) { c.fillStyle = bandCol; c.fillRect(x0, 0, PW - (x0 ? 0 : 1), 6); if (band === "outsideControl" || band === "ownSecondary" || band === "invalid") { c.save(); c.globalAlpha = 0.16; c.fillStyle = bandCol; c.fillRect(x0, 6, PW - 1, PH - 6); c.restore(); } }
          box("NO HIT · C0", 14, 34, 18, "#ffffff"); box("NATIVE HIT · N", PW + 14, 34, 18, "#ffd0f2");
          box(isLead ? `τ = ${tau.toFixed(2)} ms` : `τ = +${tau.toFixed(2)} ms · step ${n}`, PW * 2 - 14, 34, 16, "#ffe7a3", null, "right");
          if (!isLead && n >= 1) box(`+${tau.toFixed(2)} ms after contact-step start`, PW * 2 - 14, 60, 13, "#ffd0f2", null, "right");
          if (isLead) box(diffPx === 0 ? "left / right pixel-identical ✓" : `left / right differ in ${diffPx} px`, PW, PH - 16, 13, diffPx === 0 ? "#bfe9ff" : "#ff8a3d", null, "center");
          if (!isLead && n === 0) box(diffPx === 0 ? "entry state identical on both sides ✓ (character pixels)" : `entry: character pixels differ in ${diffPx} px`, PW, PH - 16, 13, diffPx === 0 ? "#d8e6ff" : "#ff8a3d", null, "center");
          // contact marker at the exact contact step: a ring at the recorded contact point (both versions), only on that frame
          if (!isLead && n === contactN && F.N.opp.length) { for (const k2 of F.N.opp) for (const q of k2.points) { const a = P(q); if (!a) continue; c.strokeStyle = "#ffe14a"; c.lineWidth = 2.5; c.beginPath(); c.arc(PW + a[0], a[1], 13, 0, 7); c.stroke(); }
            box("● CONTACT — step 1 (τ 0 → 4.17 ms): gap 0.5 mm closing at 3.0 m/s", PW + 14, 88, 13, "#ffe14a"); }
          if (D.invalid) { box(D.invalidText, PW, 122, 16, "#ffffff", "rgba(200,20,20,0.92)", "center"); }
          if (variant === "diag") diagOverlay(c);
          // bottom strip: frame timeline coloured by band, cursor, contact tick, labels
          const y0 = PH, tl = { x: 14, w: PW * 2 - 28, y: y0 + 12, h: 14 }, N = D.frames.length;
          c.fillStyle = "#121a16"; c.fillRect(0, y0, PW * 2, 96);
          D.frames.forEach((G, j) => { const b2 = G.phase === "lead" ? "lead" : G.band; c.fillStyle = BAND[b2][1]; c.fillRect(tl.x + j * tl.w / N, tl.y, tl.w / N - 1, tl.h); });
          const xk = tl.x + (k + 0.5) * tl.w / N; c.fillStyle = "#ffffff"; c.fillRect(xk - 1.5, tl.y - 5, 3, tl.h + 10);
          const jc = D.frames.findIndex(G => G.phase === "phys" && G.n === contactN); const xc = tl.x + (jc + 0.5) * tl.w / N; c.fillStyle = "#ffe14a"; c.beginPath(); c.moveTo(xc, tl.y + tl.h + 2); c.lineTo(xc - 5, tl.y + tl.h + 10); c.lineTo(xc + 5, tl.y + tl.h + 10); c.fill();
          c.font = "600 14px -apple-system, Helvetica, Arial"; c.fillStyle = bandCol; c.fillText(bandTxt, 14, y0 + 52);
          c.font = "500 12px -apple-system, Helvetica, Arial"; c.fillStyle = "#c9d6cf"; c.fillText(`IFM-1 ${D.title} · ${D.body} · ${D.state} · gameplay camera CAMERA_V1, viewer zoom 8× (same pose / perspective) · every 1/240 s record step`, 14, y0 + 72);
          c.fillStyle = "#9fb3a9"; c.fillText(`preregistered — N: ${D.statusN.join(" · ")}`, 14, y0 + 89);
          c.textAlign = "right"; c.fillText(`preregistered — C0: ${D.statusC0.join(" · ")}`, PW * 2 - 14, y0 + 52); c.textAlign = "left";
        };
        const diagOverlay = (c) => {
          const panels = isLead ? [[0, F.both, null], [PW, F.both, null]] : [[0, F.C0, null], [PW, F.N, F.C0]];
          for (const [x0, Pp, ghost] of panels) { const Q = (q) => { const a = P(q); return a ? [a[0] + x0, a[1]] : null; };
            c.save(); c.beginPath(); c.rect(x0, 6, PW - 1, PH - 6); c.clip();
            if (!isLead) { c.strokeStyle = x0 ? "#ff5ad8" : "rgba(255,90,216,0.7)"; c.lineWidth = 1.6; c.setLineDash(x0 ? [] : [5, 4]);   // struck body colliders
              const circ = (q, r) => { const a = Q(q), right = [cam.view[0], cam.view[4], cam.view[8]], b = Q(V3.add(q, V3.scale(right, r))); if (!a || !b) return null; const rr = Math.hypot(b[0] - a[0], b[1] - a[1]); c.beginPath(); c.arc(a[0], a[1], rr, 0, 7); c.stroke(); return [a, rr]; };
              for (const o of Pp.struck) { if (o.t === "s") circ(o.c, o.r); else if (o.t === "c") { const A = circ(o.a, o.ra), B = circ(o.b, o.rb); if (A && B) { const d = [B[0][0] - A[0][0], B[0][1] - A[0][1]], l = Math.hypot(d[0], d[1]) || 1, nx = -d[1] / l, ny = d[0] / l;
                for (const s of [1, -1]) { c.beginPath(); c.moveTo(A[0][0] + s * nx * A[1], A[0][1] + s * ny * A[1]); c.lineTo(B[0][0] + s * nx * B[1], B[0][1] + s * ny * B[1]); c.stroke(); } } } }
              c.setLineDash([]); }
            if (ghost) { c.strokeStyle = "rgba(120,220,255,0.85)"; c.lineWidth = 1.2; for (const b of bones) { if (b.parent == null || b.name === "pelvis" || b.name === "hair") continue; const a = Q(ghost.joint[b.parent]), e = Q(ghost.joint[b.idx]); if (a && e) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } } }
            c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 1.6; for (const b of bones) { if (b.parent == null || b.name === "pelvis" || b.name === "hair") continue; const a = Q(Pp.joint[b.parent]), e = Q(Pp.joint[b.idx]); if (a && e) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
            for (const nm of ["toe_R", "toe_L", "head", "hand_R", "hand_L"]) { const b = bones.find(x => x.name === nm), a = Q(Pp.joint[b.idx]), e = Q(Pp.tip[b.idx]); if (a && e) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
            const divCol = (mm) => mm < 1 ? "#ffffff" : mm < 5 ? "#fff36b" : mm < 20 ? "#ffad3b" : "#ff4040";
            for (const b of bones) { const a = Q(Pp.joint[b.idx]); if (!a) continue; c.fillStyle = x0 && !isLead ? divCol(F.divergenceMm[b.idx]) : "#ffffff"; c.beginPath(); c.arc(a[0], a[1], x0 && !isLead ? 3.2 : 2.4, 0, 7); c.fill(); }
            const pv = Q(Pp.joint[1]); if (pv) { c.strokeStyle = "#ffd45e"; c.lineWidth = 2; c.strokeRect(pv[0] - 5, pv[1] - 5, 10, 10); }
            if (!isLead) { const cm = Q(Pp.com), g = Q([Pp.com[0], 0.002, Pp.com[2]]); if (cm) { c.strokeStyle = "#ffd45e"; c.lineWidth = 2; c.beginPath(); c.arc(cm[0], cm[1], 6, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cm[0] - 6, cm[1]); c.lineTo(cm[0] + 6, cm[1]); c.moveTo(cm[0], cm[1] - 6); c.lineTo(cm[0], cm[1] + 6); c.stroke(); }
              if (cm && g) { c.setLineDash([3, 4]); c.strokeStyle = "rgba(255,212,94,0.7)"; c.beginPath(); c.moveTo(cm[0], cm[1]); c.lineTo(g[0], g[1]); c.stroke(); c.setLineDash([]); } }
            // feet: recorded turf normal impulse this step (filled = loaded), RUN-1 stance flag during the lead-in
            for (const [sd, bn] of [["L", "foot_L"], ["R", "foot_R"]]) { const b = bones.find(x => x.name === bn), ank = Pp.joint[b.idx], g = Q([ank[0], 0.002, ank[2]]); if (!g) continue;
              const loaded = isLead ? F.run1Legs[sd] : (Pp.footLoadNs[sd] != null && Pp.footLoadNs[sd] > 0), col = sd === "L" ? "#ff78c8" : "#78ffa0";
              c.beginPath(); c.arc(g[0], g[1] + 4, 7, 0, 7); c.fillStyle = loaded ? col : "rgba(0,0,0,0)"; c.fill(); c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
              const t2 = isLead ? `${sd} ${loaded ? "stance" : "swing"} (RUN-1)` : (Pp.footLoadNs[sd] == null ? `${sd} —` : `${sd} ${Pp.footLoadNs[sd].toFixed(2)} N·s`);
              c.font = "600 11px -apple-system, Helvetica"; c.fillStyle = col; c.fillText(t2, g[0] + (sd === "L" ? -82 : 12), g[1] + 22); }
            if (x0 && !isLead) for (const k2 of F.N.opp) { for (const q of k2.points) { const a = Q(q), e = Q(V3.add(q, V3.scale(k2.n, 0.08))); if (!a) continue; c.fillStyle = "#ffe14a"; c.beginPath(); c.arc(a[0], a[1], 4, 0, 7); c.fill();
                if (e) { c.strokeStyle = "#ffe14a"; c.lineWidth = 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke(); } }
              const a0 = Q(k2.points[0]); if (a0) { c.font = "600 11px -apple-system, Helvetica"; c.fillStyle = "#ffe14a"; c.fillText(`Jn ${k2.Jn.toFixed(2)} N·s (step ${n})`, a0[0] + 10, a0[1] - 10); } }
            c.restore(); }
          // legend
          const lg = ["white skeleton / joints = rendered rig (MC-1 §2(4))", "N panel: joint colour = |N − C0| rendered-joint distance: white < 1 · yellow < 5 · orange < 20 · red ≥ 20 mm", "cyan = C0 skeleton (same instant) · magenta = struck body colliders · yellow = recorded contact point / normal / step impulse",
            "feet: filled = recorded turf normal impulse > 0 this step (lead-in: RUN-1 stance flag) · gold square = pelvis joint · gold ⊕ = whole-body COM (V2 masses) with ground projection"];
          c.font = "500 11px -apple-system, Helvetica"; lg.forEach((s, i) => { const w = c.measureText(s).width; c.fillStyle = "rgba(8,12,10,0.72)"; c.fillRect(8, PH - 82 + i * 18 - 12, w + 10, 16); c.fillStyle = "#dfe9e3"; c.fillText(s, 13, PH - 82 + i * 18); });
        };
        compose("clean"); compose("diag");
        // encode this frame into the four streams (every record step = one frame; 0.25× = 60 fps, 0.1× = 24 fps)
        for (const v of ["clean", "diag"]) for (const sp of ["_025", "_010"]) { const E = window.__enc[v + sp], dur = 1e6 / E.fps, vf = new VideoFrame(cv[v], { timestamp: Math.round(k * dur), duration: Math.round(dur) });
          E.enc.encode(vf, { keyFrame: k % 6 === 0 }); vf.close(); }
        return { k, phase: F.phase, n, tauMs: tau, skinHashL: fnv(skL), skinHashR: fnv(skR), panelDiffPx: diffPx, sameCamera: sameCam, clean: cv.clean.toDataURL("image/png"), diag: cv.diag.toDataURL("image/png") };
      }, D, k, PW, PH);
      for (const v of ["clean", "diag"]) { const d = path.join(OUT, "frames", key, v); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, pad(k) + ".png"), Buffer.from(r[v].split(",")[1], "base64")); delete r[v]; }
      frameLog.push(r); }
    const vids = await page.evaluate(async () => { const out = {}; for (const [name, E] of Object.entries(window.__enc)) { await E.enc.flush(); E.enc.close(); E.muxer.finalize(); const buf = new Uint8Array(E.muxer.target.buffer); let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); out[name] = btoa(s); } return { out, err: window.__encErr || null }; });
    if (vids.err) throw new Error("encoder: " + vids.err);
    fs.mkdirSync(path.join(OUT, "video"), { recursive: true });
    for (const [name, b64] of Object.entries(vids.out)) { const [v, sp] = name.split("_"); fs.writeFileSync(path.join(OUT, "video", `${key}_${v.toUpperCase()}_${sp === "025" ? "0.25x" : "0.10x"}.mp4`), Buffer.from(b64, "base64")); }
    capture.cases[key] = { frames: frameLog, seconds: (Date.now() - t0) / 1000 };
    console.log(`${key}: ${D.frames.length} frames · lead-in left/right identical ${frameLog.filter(x => x.phase === "lead").every(x => x.panelDiffPx === 0)} · entry identical ${frameLog.find(x => x.n === 0).panelDiffPx === 0} · same camera ${frameLog.every(x => x.sameCamera)} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l));
  fs.writeFileSync(path.join(OUT, "slowmo_capture.json"), JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} });
