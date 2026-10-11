// IFM-1 CLIP CAPTURE (prereg §11) — POST-FREEZE PRESENTATION TOOLING. Drives the FROZEN RUN-1 viewer page (sandbox/visual/run1.html from the
// locomotion-v2-straight-baseline-1 archive, unmodified) in headless Chrome: for every frame, the prepared rig pose (ifm1_clip_prep.mjs) is placed
// in the viewer's own lane object and the viewer's own rv1Render draws it (CAMERA_V1 rv1GameCam on the authoritative mover, zoom 1, its ground
// and contact shadows, the frozen character mesh / atlas / skinning / shading through of_char_gl.js ofCharDraw). A 1280 × 720 viewport at device
// pixel ratio 1 (CAMERA_V1's 720-px focal definition). This tool adds only: the diagnostic impactor sphere (r 0.060 m, depth-tested, in the same
// GL frame), text labels on a composite canvas, and (diagnostic variant) collider / contact / landmark overlays. Landmark pixels come from the
// viewer's own rv1Proj with the same camera.
// Outputs per trajectory: <out>/frames/<id>/{lab,blind}/NNNNN.png (normal speed, 60 Hz: lead-in −250 … −16.7 ms + physical 0 … 150 ms)
//                          <out>/frames/<id>/diag/NNNNN.png (DIAGNOSTIC: 0.25× = every 1/240 s step at 60 fps, the viewer's own 4× gameplay zoom, overlays) and <out>/proj/<id>.json (projected pixels).
// usage: PUPPETEER_NODE_MODULES=<dir> node ifm1_clip_capture.cjs --clips <clip out dir> --archive <tag archive> --out <dir> [--port 8341] [--only id,id]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const SPAWNED = [], CL = arg("clips"), ARCH = arg("archive"), OUT = arg("out"), port = arg("port", "8341"), only = arg("only") ? arg("only").split(",") : null, W = 1280, H = 720;
const META = JSON.parse(fs.readFileSync(path.join(CL, "clip_meta.json"))), BLIND = JSON.parse(fs.readFileSync(path.join(__dirname, "IFM1_BLIND_KEY.json")));
const ROLE_TXT = { SW: "SW · right (swing) shank", PL: "PL · left (planted) shank", SH: "SH · left deltoid", TP: "TP · left shank, toe-pad stance" };
const MODE_TXT = { C0: "C0 · no-contact control", N: "N · native contact", W: "W · first-step wrench replay (offline)", X: "X · contact disabled after h (offline)" };
(async () => {
  // a scratch web root: the frozen archive's sandbox/ and assets/ (read through symlinks; nothing in the archive is written)
  const root = path.join(OUT, "_serve"); fs.mkdirSync(root, { recursive: true });
  for (const d of ["sandbox", "assets"]) { const l = path.join(root, d); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ARCH, d), l); }
  const srv = cp.spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1", "--directory", root], { stdio: "ignore" }); SPAWNED.push(srv);
  await new Promise(r => setTimeout(r, 900));
  const browser = await puppeteer.launch({ userDataDir: path.join(OUT, "_profile"), executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W + 40},${H + 300}`] });
  const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: W + 40, height: H + 300, deviceScaleFactor: 1 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&lanes=diag`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 60000 });
  const env = await page.evaluate((W, H) => {
    /* global RV1 */
    const S = RV1; Object.assign(S, { zoom: 1, labels: false, blind: 0, rate: 1 }); Object.assign(S.ov, { skel: false, feet: false, com: false, trail: false });
    S.fixedLayout = { W, H, views: [{ id: "game", x: 0, y: 0, w: W, h: H }] };
    // the diagnostic impactor: a UV sphere, Lambert-shaded, drawn after the viewer's frame in the same GL context with depth testing
    const gl = S.R.gl, sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, `#version 300 es
      layout(location=0) in vec3 aP; uniform mat4 uView, uProj; uniform vec3 uC; uniform float uR; out vec3 vN;
      void main(){ vN = aP; gl_Position = uProj * (uView * vec4(uC + uR * aP, 1.0)); }`));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float; in vec3 vN; layout(location=0) out vec4 o;
      void main(){ vec3 n = normalize(vN); float l = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(-0.42, 0.72, -0.54)))); o = vec4(vec3(1.0, 0.30, 0.82) * l, 1.0); }`));
    gl.linkProgram(p); const v = []; const NA = 24, NB = 16;
    for (let i = 0; i < NB; i++) for (let j = 0; j < NA; j++) { const P = (a, b) => { const th = Math.PI * a / NB, ph = 2 * Math.PI * b / NA; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
      v.push(...P(i, j), ...P(i + 1, j), ...P(i + 1, j + 1), ...P(i, j), ...P(i + 1, j + 1), ...P(i, j + 1)); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
    window.__imp = { p, vao, n: v.length / 3, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), c: gl.getUniformLocation(p, "uC"), r: gl.getUniformLocation(p, "uR") } };
    return { ua: navigator.userAgent, dpr: window.devicePixelRatio, glVendor: gl.getParameter(gl.VENDOR), glRenderer: gl.getParameter(gl.RENDERER), char: S.entry.id || "vinicius", meshTriangles: S.entry.mesh.triangleCount };
  }, W, H);
  console.log("viewer:", JSON.stringify(env));
  // one frame: viewer render + impactor + composites; returns projected landmarks and PNGs
  const frame = (fr, opt) => page.evaluate((fr, opt, W, H) => {
    /* global RV1, rv1Render, rv1Proj, V3 */
    const S = RV1, gl = S.R.gl;
    S.lanes = [{ key: "L0", i: 0, eng: "run1", off: 0, col: "#e6efe9", trail: [], label: "", sim: { x: fr.simX, y: 36, heading: 0, v: 3, vx: 3, vy: 0 },
      fk: { joint: fr.joint, tip: fr.tip, world: fr.world }, skin: new Float32Array(fr.skin), pose: { legs: { L: { st: false }, R: { st: false } } } }];
    S.run1 = null; S.zoom = opt.zoom; rv1Render();
    const vw = S.fixedLayout.views[0], cam = vw.cam, P = (q) => rv1Proj(cam, vw, 1, q);
    if (fr.imp) { const I = window.__imp; gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.useProgram(I.p);
      gl.uniformMatrix4fv(I.u.view, false, cam.view); gl.uniformMatrix4fv(I.u.proj, false, cam.proj); gl.uniform3fv(I.u.c, fr.imp); gl.uniform1f(I.u.r, 0.060);
      gl.bindVertexArray(I.vao); gl.drawArrays(gl.TRIANGLES, 0, I.n); gl.bindVertexArray(null); }
    gl.finish();
    const proj = { lm: {}, lmR: {} }; for (const k of ["lm", "lmR"]) for (const r in (fr[k] || {})) { proj[k][r] = {}; for (const n in fr[k][r]) proj[k][r][n] = P(fr[k][r][n]); }
    proj.joint = fr.joint.map(P); proj.imp = fr.imp ? P(fr.imp) : null;
    const g = document.getElementById("gl"), out = {};
    const comp = window.__comp || (window.__comp = document.createElement("canvas")); comp.width = W; comp.height = H; const c = comp.getContext("2d");
    const box = (txt, x, y, px, col, bg) => { c.font = `600 ${px}px -apple-system, Helvetica, Arial`; const w = c.measureText(txt).width; c.fillStyle = bg || "rgba(8,12,10,0.66)"; c.fillRect(x - 5, y - px * 0.8 - 4, w + 10, px + 7); c.fillStyle = col || "#eef4f0"; c.fillText(txt, x, y); return w; };
    const impTag = () => { if (!proj.imp) return; const [x, y] = proj.imp; c.strokeStyle = "rgba(255,120,220,0.95)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 5, y - 5); c.lineTo(x + 34, y - 34); c.stroke(); box("diagnostic impactor (not a tackler)", x + 38, y - 34, 12, "#ffb3ec"); };
    const texts = (variant) => {
      const L1 = variant === "blind" ? `IFM-1 · ${fr.roleTxt} · version ${fr.blindLabel} · ${fr.modeTxt}` : `IFM-1 · ${fr.roleTxt} · ${fr.body} · ${fr.modeTxt}`;
      box(L1, 14, 26, 15); box(fr.timeTxt, 14, 50, 14, fr.phase === "lead" ? "#bfe9ff" : "#ffe7a3");
      if (fr.outsideTxt) box(fr.outsideTxt, 14, 74, 13, "#ffb37a");
      if (variant !== "blind" && fr.statusTxt) box(fr.statusTxt, 14, H - 40, 12, "#c9d6cf");
      box(`CAMERA_V1 gameplay camera · 1280×720 · ${opt.zoom === 1 ? "zoom 1× · " : ""}${fr.cadence} · render rule MC-1 §2(4)`, 14, H - 16, 11, "#9fb3a9"); };
    const overlay = () => {   // diagnostic only: V2 colliders, opponent contact points / normals, evaluator struck-chain points
      c.lineWidth = 1; c.strokeStyle = "rgba(90,235,255,0.75)";
      const circ = (q, r) => { const a = P(q), right = [cam.view[0], cam.view[4], cam.view[8]], b = P(V3.add(q, V3.scale(right, r))); if (!a || !b) return; c.beginPath(); c.arc(a[0], a[1], Math.hypot(b[0] - a[0], b[1] - a[1]), 0, 7); c.stroke(); return [a, Math.hypot(b[0] - a[0], b[1] - a[1])]; };
      const hull2 = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
        for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
      for (const o of fr.colliders) {
        if (o.t === "s") circ(o.c, o.r);
        else if (o.t === "c") { const A = circ(o.a, o.ra), B = circ(o.b, o.rb); if (A && B) { const d = [B[0][0] - A[0][0], B[0][1] - A[0][1]], l = Math.hypot(d[0], d[1]) || 1, nx = -d[1] / l, ny = d[0] / l;
          for (const s of [1, -1]) { c.beginPath(); c.moveTo(A[0][0] + s * nx * A[1], A[0][1] + s * ny * A[1]); c.lineTo(B[0][0] + s * nx * B[1], B[0][1] + s * ny * B[1]); c.stroke(); } } }
        else { const pts = o.c.map(P).filter(Boolean); if (pts.length < 3) continue; const hp = hull2(pts); c.beginPath(); hp.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); } }
      if (fr.imp) circ(fr.imp, 0.060);
      for (const k of fr.opp || []) for (const q of k.points) { const a = P(q), b = P(V3.add(q, V3.scale(k.n, 0.12))); if (!a) continue; c.fillStyle = "#ffe14a"; c.beginPath(); c.arc(a[0], a[1], 3, 0, 7); c.fill();
        if (b) { c.strokeStyle = "#ffe14a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } }
      c.strokeStyle = "#ffffff"; c.lineWidth = 1.2; for (const r in proj.lm) for (const n in proj.lm[r]) { const a = proj.lm[r][n]; if (!a) continue; c.beginPath(); c.moveTo(a[0] - 4, a[1]); c.lineTo(a[0] + 4, a[1]); c.moveTo(a[0], a[1] - 4); c.lineTo(a[0], a[1] + 4); c.stroke(); } };
    for (const v of opt.variants) { c.drawImage(g, 0, 0, W, H, 0, 0, W, H); if (v === "diag") overlay(); impTag(); texts(v); out[v] = comp.toDataURL("image/png"); }
    return { proj, out };
  }, fr, opt, W, H);
  const pad = (k) => String(k).padStart(5, "0"), save = (dir, k, url) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, pad(k) + ".png"), Buffer.from(url.split(",")[1], "base64")); };
  const lead = {}; for (const sid of ["S-FLAT", "S-TOE"]) lead[sid] = JSON.parse(fs.readFileSync(path.join(CL, "clipdata", `LEAD_${sid}.json`)));
  const capture = { tool: "ifm1_clip_capture.cjs", env, W, H, dpr: 1, page: "sandbox/visual/run1.html?external=1&paused=1&lanes=diag (frozen archive, unmodified)", clips: {} };
  fs.mkdirSync(path.join(OUT, "proj"), { recursive: true });
  for (const c of META.clips) { if (only && !only.includes(c.id)) continue;
    const D = JSON.parse(fs.readFileSync(path.join(CL, "clipdata", `${c.id}.json`))), roles = c.role ? [c.role] : null;
    const base = { body: c.body, roleTxt: c.role ? ROLE_TXT[c.role] : `${c.state} control (all ${c.state} placements)`, modeTxt: MODE_TXT[c.mode], blindLabel: BLIND.mapping[c.body],
      statusTxt: "status: " + (Array.isArray(c.cellStatus) ? c.cellStatus.join(" · ") : String(c.cellStatus)) };
    const outTxt = (f) => f.outsideControl ? `outside healthy control interval (> ${c.healthyControlUntilMs.toFixed(1)} ms: ${c.healthyReason})` + (f.afterOwnSecondary ? " · after this run's own secondary failure" : "") : (f.afterOwnSecondary ? `after this run's own secondary failure (${(c.ownSecondaryFailure.t * 1000).toFixed(1)} ms)` : null);
    const P = { id: c.id, normal: [], diag: [] }; const t0 = Date.now();
    // normal speed (60 Hz): 15 lead-in frames + physical n = 0, 4, …, 36
    const seq60 = [...lead[c.state].f60.map(f => ({ ...f, phase: "lead", imp: null, lm: null, lmR: null, colliders: [], opp: [] })), ...D.frames.filter(f => f.n % 4 === 0).map(f => ({ ...f, phase: "phys" }))];
    for (let k = 0; k < seq60.length; k++) { const f = seq60[k];
      const fr = { ...base, ...f, cadence: "normal speed, 60 Hz", timeTxt: f.phase === "lead" ? `τ = ${f.tauMs.toFixed(1)} ms · RUN-1 lead-in (no physical stepping)` : `τ = +${f.tauMs.toFixed(1)} ms · physical record, step ${f.n}${f.n <= 12 ? " (primary window)" : ""}`, outsideTxt: f.phase === "phys" ? outTxt(f) : null };
      if (f.phase === "lead") { fr.lm = {}; fr.lmR = {}; }
      const r = await frame(fr, { variants: ["lab", "blind"], zoom: 1 }); save(path.join(OUT, "frames", c.id, "lab"), k, r.out.lab); save(path.join(OUT, "frames", c.id, "blind"), k, r.out.blind);
      P.normal.push({ k, phase: f.phase, n: f.n ?? null, tauMs: f.tauMs, outsideControl: !!f.outsideControl, proj: r.proj }); }
    // 0.25× diagnostic (every 1/240 s): 60 lead-in frames + physical n = 0 … 36, collider / contact / landmark overlays
    const seq240 = [...lead[c.state].f240.map(f => ({ ...f, phase: "lead", imp: null, lm: {}, lmR: {}, colliders: [], opp: [] })), ...D.frames.map(f => ({ ...f, phase: "phys" }))];
    for (let k = 0; k < seq240.length; k++) { const f = seq240[k];
      const fr = { ...base, ...f, cadence: "DIAGNOSTIC 0.25× · viewer's own 4× zoom (CAMERA_V1 pose) · cyan colliders · yellow contacts / normals · white struck-chain points", timeTxt: f.phase === "lead" ? `τ = ${f.tauMs.toFixed(2)} ms · RUN-1 lead-in (no physical stepping)` : `τ = +${f.tauMs.toFixed(2)} ms · physical record, step ${f.n}`, outsideTxt: f.phase === "phys" ? outTxt(f) : null };
      const r = await frame(fr, { variants: ["diag"], zoom: 4 }); save(path.join(OUT, "frames", c.id, "diag"), k, r.out.diag);
      P.diag.push({ k, phase: f.phase, n: f.n ?? null, tauMs: f.tauMs, proj: r.proj }); }
    fs.writeFileSync(path.join(OUT, "proj", `${c.id}.json`), JSON.stringify(P));
    capture.clips[c.id] = { normalFrames: seq60.length, diagFrames: seq240.length, seconds: (Date.now() - t0) / 1000 };
    console.log(`${c.id}: ${seq60.length} + ${seq240.length} frames (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  capture.logs = logs.filter(l => !/favicon|status of 404/.test(l));
  fs.writeFileSync(path.join(OUT, "capture.json"), JSON.stringify(capture, null, 1));
  await browser.close(); srv.kill("SIGKILL"); await new Promise(r => srv.exitCode !== null || srv.signalCode ? r() : srv.once("exit", r));
})().catch(e => { console.error(e); process.exitCode = 1; for (const c of SPAWNED) try { c.kill("SIGKILL"); } catch (_) {} });
