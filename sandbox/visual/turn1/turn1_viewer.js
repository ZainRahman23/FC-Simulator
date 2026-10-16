// ═══ turn1/turn1_viewer.js — TURN-1 viewer: the Touchline gameplay camera (CAMERA_V1, rail-following) + two close views + the path / foot debug view ═══
// One WebGL2 canvas (the real character mesh draws through anim3d/of_char_gl.js ofCharDraw), a 2D canvas on top for the diagnostics. The runner is the
// TURN-1 replay of a scenario (turn1_scenarios.js): a straight run, then a requested heading change. Deterministic: the state at time t is the replay of
// the input history on the fixed 1/240 s grid; trails come from that replay (60 Hz samples), never from the rendered frames.
// URL: ?scn=<id> | ?v=5.5&turn=90&tc=1.0 · &views=game,A,B | game · &A=top &B=rear34 · &zoom=1|2.5 · &diag=1 (debug overlay) · &rate=0.25 · &t=…
"use strict";
const TV = { t: 0, rate: 1, playing: true, zoom: 1, diag: false, skel: false, A: "top", B: "rear34", scn: null, actor: null, ready: false, labels: true, loopT: 4.2, single: null, game: true, body: "t11" };   // body: "t11" = TURN-1.1 authored body layer, "t1" = TURN-1 procedural body (same path / plants)
const tvMake = (skel, init) => { const A = TURN1.t1Make(skel, init); if (TV.body === "t11" && typeof TURN11 !== "undefined") TURN11.attach(A); return A; };
function tvPersp(fyNdc, aspect, n, f) { const m = new Float32Array(16); m[0] = fyNdc / aspect; m[5] = fyNdc; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
function tvLookAt(eye, at, up) {                        // the same handedness as run1_viewer.js rv1LookAt (the anim3d world is mirror-handed vs the screen)
  const fz = V3.norm(V3.sub(eye, at)), fx = V3.norm(V3.cross(fz, up)), fy = V3.cross(fx, fz), m = M4.ident();
  m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2];
  m[12] = -V3.dot(fx, eye); m[13] = -V3.dot(fy, eye); m[14] = -V3.dot(fz, eye); return m;
}
// CAMERA_V1 (match.js AUTHOR_DEFAULTS: height 30, dist 43, fov 28, pitch 22, yaw 0) rail-following x; zoom > 1 centres the subject by a clip offset
function tvGameCam(px, py, zoom, vw, vh) {
  const th = 22 * Math.PI / 180, C = [px, 30, -(68 + 43)];
  const r = [1, 0, 0], u = [0, Math.cos(th), Math.sin(th)], f = [0, -Math.sin(th), Math.cos(th)];
  const view = M4.ident(); view[0] = r[0]; view[4] = r[1]; view[8] = r[2]; view[1] = u[0]; view[5] = u[1]; view[9] = u[2]; view[2] = -f[0]; view[6] = -f[1]; view[10] = -f[2];
  const t = M4.transformDir(view, C); view[12] = -t[0]; view[13] = -t[1]; view[14] = -t[2];
  const fpx = 360 / Math.tan(14 * Math.PI / 180), fy = 2 * fpx * zoom / 720, proj = tvPersp(fy, vw / vh, 1.0, 400);
  if (zoom > 1.01) { const pv = M4.transformPoint(view, [px, 0.9, -py]), w = -pv[2], nx = proj[0] * pv[0] / w, ny = proj[5] * pv[1] / w;
    for (let k = 0; k < 4; k++) { proj[k * 4] -= nx * proj[k * 4 + 3]; proj[k * 4 + 1] -= ny * proj[k * 4 + 3]; } }
  return { view, proj, eye: C };
}
// close views: FIXED world azimuth (relative to the run's initial heading), following the runner — a turn is seen turning, not compensated
const TV_ANG = { side: [90, 6, 6.0], sideR: [-90, 6, 6.0], rear34: [150, 14, 6.4], front34: [30, 12, 6.4], rear: [180, 10, 6.5], front: [0, 8, 6.5], top: [-90, 64, 7.5], topClose: [-90, 76, 5.0], low34: [-40, 8, 5.0], cam: [-90, 22, 9.0], camLow: [-90, 10, 6.5], near: [-90, 14, 4.6], nearR: [-60, 12, 4.6], nearL: [-120, 12, 4.6],
  rearC: [180, 8, 3.6], frontC: [0, 8, 3.6], nearC: [-90, 12, 3.6], farC: [90, 8, 3.6], rearRC: [-135, 10, 3.6], frontRC: [-45, 10, 3.6] };   // TURN-1.1 close diagnostics (3.6 m)   // top / cam: from the gameplay camera's side (screen-up = away from it)
function tvCloseCam(A, angle, heading0, vw, vh) {
  const a = TV_ANG[angle] || TV_ANG.side, tgt = [A.P[0], 0.85, -A.P[1]], f = [Math.cos(heading0), 0, -Math.sin(heading0)], l = [Math.sin(heading0), 0, Math.cos(heading0)];
  const az = a[0] * Math.PI / 180, el = a[1] * Math.PI / 180, d = a[2], hor = V3.add(V3.scale(f, Math.cos(az)), V3.scale(l, Math.sin(az)));
  const eye = V3.add(tgt, V3.add(V3.scale(hor, d * Math.cos(el)), [0, d * Math.sin(el), 0]));
  return { view: tvLookAt(eye, tgt, [0, 1, 0]), proj: tvPersp(1 / Math.tan(17 * Math.PI / 180), vw / vh, 0.2, 200), eye };
}
function tvGround(gl) {                                  // the RUN-1 viewer's procedural pitch (markings, stripes, contact shadows)
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW;
  void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[16]; uniform int uNSh; layout(location=0) out vec4 o; layout(location=1) out vec4 oId;
  float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float d=length(pa-ba*h); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float ring(vec2 p, vec2 c, float r, float w){ float d=abs(length(p-c)-r); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float dotm(vec2 p, vec2 c, float r){ float d=length(p-c); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(r-aa, r+aa, d); }
  void main(){
    vec2 p = vec2(vW.x, -vW.z);
    bool inP = p.x > -2.0 && p.x < 107.0 && p.y > -2.0 && p.y < 70.0;
    float stripe = mod(floor(p.x / 5.25), 2.0);
    vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe);
    float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453);
    g *= 0.97 + 0.06 * n;
    if (!inP) g = vec3(0.17, 0.33, 0.19) * (0.97 + 0.06 * n);
    float w = 0.12, L = 0.0;
    L = max(L, seg(p, vec2(0,0), vec2(105,0), w)); L = max(L, seg(p, vec2(0,68), vec2(105,68), w));
    L = max(L, seg(p, vec2(0,0), vec2(0,68), w)); L = max(L, seg(p, vec2(105,0), vec2(105,68), w));
    L = max(L, seg(p, vec2(52.5,0), vec2(52.5,68), w)); L = max(L, ring(p, vec2(52.5,34), 9.15, w)); L = max(L, dotm(p, vec2(52.5,34), 0.15));
    for (int s = 0; s < 2; s++) { float x0 = s == 0 ? 0.0 : 105.0, sg = s == 0 ? 1.0 : -1.0;
      L = max(L, seg(p, vec2(x0, 13.84), vec2(x0 + sg*16.5, 13.84), w)); L = max(L, seg(p, vec2(x0, 54.16), vec2(x0 + sg*16.5, 54.16), w)); L = max(L, seg(p, vec2(x0 + sg*16.5, 13.84), vec2(x0 + sg*16.5, 54.16), w));
      L = max(L, seg(p, vec2(x0, 24.84), vec2(x0 + sg*5.5, 24.84), w)); L = max(L, seg(p, vec2(x0, 43.16), vec2(x0 + sg*5.5, 43.16), w)); L = max(L, seg(p, vec2(x0 + sg*5.5, 24.84), vec2(x0 + sg*5.5, 43.16), w));
      L = max(L, dotm(p, vec2(x0 + sg*11.0, 34.0), 0.15));
      float arc = ring(p, vec2(x0 + sg*11.0, 34.0), 9.15, w); if (sg * (p.x - (x0 + sg*16.5)) > 0.0) L = max(L, arc); }
    vec3 c = mix(g, vec3(0.93, 0.95, 0.92), L * 0.92);
    float sh = 0.0; for (int i = 0; i < 16; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    c *= 1.0 - min(0.55, sh);
    o = vec4(c, 1.0); oId = vec4(0.0); }`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-25, 25, 130, 25, -25, -130, 130, -130]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
  return { p, vao, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), sh: gl.getUniformLocation(p, "uSh"), nsh: gl.getUniformLocation(p, "uNSh") } };
}
// ── replay with deterministic 60 Hz samples (feet, COM, root, headings) for trails and the debug view ─────────────────────────────────
function tvAdvance(t) {
  const T = TURN1, A = TV.actor, scn = TV.scn;
  if (A._rt == null || t < A._rt - 1e-9) { const fresh = tvMake(TV.entry.skel, scn.init); for (const k of Object.keys(A)) delete A[k]; Object.assign(A, fresh); A._rt = 0; A.samples = []; }
  while (A._rt + T.T1.step <= t + 1e-9) {
    T.t1Step(A, T.t1Input(scn, A._rt)); A._rt += T.T1.step;
    if (A.n % 4 === 0) { const ev = T.t1Evaluate(A), B = A.body.idx, fk = ev.fk; A.samples.push({ t: A.t, P: A.P.slice(), V: A.V.slice(), psi: A.psi, gaze: A.gaze, dir: A.input.dir, aR: fk.joint[B.foot_R].slice(), aL: fk.joint[B.foot_L].slice(), tR: fk.tip[B.toe_R].slice(), tL: fk.tip[B.toe_L].slice(), feet: ev.pose.diag.feet, role: A.st.role ? A.st.role.kind : "RUN" }); }
  }
  TURN1.t1Evaluate(A);
}
function tvLayout() {
  if (TV.fixedLayout) return TV.fixedLayout;
  const bar = document.getElementById("bar"), top = bar ? bar.getBoundingClientRect().height : 50, W = Math.max(640, Math.min(window.innerWidth - 8, 2400)), H = Math.max(420, window.innerHeight - top - 40);
  if (TV.single) return { W, H, views: [{ id: TV.single, x: 0, y: 0, w: W, h: H }] };
  const gw = Math.round(W * 0.62), cw = W - gw - 4, ch = Math.floor((H - 4) / 2);
  return { W, H, views: [{ id: "game", x: 0, y: 0, w: gw, h: H }, { id: "A", x: gw + 4, y: 0, w: cw, h: ch }, { id: "B", x: gw + 4, y: ch + 4, w: cw, h: H - ch - 4 }] };
}
function tvProj(cam, vw, dpr, p) {
  const v = M4.transformPoint(cam.view, p), pr = cam.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], w = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (w <= 1e-4) return null; return [(vw.x + (cx / w * 0.5 + 0.5) * vw.w) * dpr, (vw.y + (0.5 - cy / w * 0.5) * vw.h) * dpr];
}
function tvRender() {
  const gl = TV.gl, cv = TV.cv, dpr = TV.dpr || Math.min(window.devicePixelRatio || 1, 2), L = tvLayout(), A = TV.actor;
  if (cv.width !== Math.round(L.W * dpr) || cv.height !== Math.round(L.H * dpr)) { cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr); cv.style.width = L.W + "px"; cv.style.height = L.H + "px";
    TV.ovc.width = cv.width; TV.ovc.height = cv.height; TV.ovc.style.width = cv.style.width; TV.ovc.style.height = cv.style.height; const wr = document.getElementById("wrap"); wr.style.width = L.W + "px"; wr.style.height = L.H + "px"; }
  const ctx = TV.ov2d; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, TV.ovc.width, TV.ovc.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.SCISSOR_TEST); gl.viewport(0, 0, cv.width, cv.height); gl.scissor(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const fk = A.fk, B = A.body.idx, sh = new Float32Array(64); let ns = 0;
  { const pv = fk.joint[B.pelvis]; sh.set([pv[0], -pv[2], 0.42, 0.42], 0); ns = 1; for (const sd of ["R", "L"]) { const a = fk.joint[B["foot_" + sd]], tt = fk.tip[B["toe_" + sd]], m = V3.lerp(a, tt, 0.45), hg = Math.max(0, m[1] - 0.05); sh.set([m[0], -m[2], 0.16 + hg * 0.3, 0.55 * Math.exp(-hg * 7)], ns * 4); ns++; } }
  const h0 = TV.scn.heading || 0;
  for (const vw of L.views) {
    const px = Math.round(vw.x * dpr), py = Math.round((L.H - vw.y - vw.h) * dpr), pw = Math.round(vw.w * dpr), ph = Math.round(vw.h * dpr);
    gl.viewport(px, py, pw, ph); gl.scissor(px, py, pw, ph); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let cam, label;
    if (vw.id === "game") { cam = tvGameCam(TV.camX(), A.P[1], TV.zoom, vw.w, vw.h); label = `GAMEPLAY CAMERA (CAMERA_V1)${TV.zoom > 1.01 ? " · zoom " + TV.zoom + "×" : ""}`; }
    else { const ang = vw.id === "A" ? TV.A : vw.id === "B" ? TV.B : vw.id; cam = tvCloseCam(A, ang, h0, vw.w, vw.h); label = ang; }
    vw.cam = cam;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    if (TV.sil) { gl.clearColor(1.0, 0.0, 1.0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }   // silhouette test: no pitch, no shadows (the capture thresholds the figure)
    else { const Gp = TV.ground; gl.useProgram(Gp.p); gl.uniformMatrix4fv(Gp.u.view, false, cam.view); gl.uniformMatrix4fv(Gp.u.proj, false, cam.proj); gl.uniform4fv(Gp.u.sh, sh); gl.uniform1i(Gp.u.nsh, ns);
    gl.bindVertexArray(Gp.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null); }
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    ofCharDraw(TV.R, TV.entry, A.skinMats, cam.view, cam.proj);
    tvOverlay(ctx, vw, cam, dpr, label);
  }
  gl.disable(gl.SCISSOR_TEST);
}
const TV_COL = { R: "rgba(110,255,150,0.95)", L: "rgba(255,110,200,0.95)", ROLE: { RUN: "#bfe8ff", ARC: "#9fd8ff", BRAKE: "#ffb347", PLANT: "#ff4d4d", EXIT: "#ffe14d", ACCEL: "#7dff7d" } };
function tvOverlay(ctx, vw, cam, dpr, label) {
  const A = TV.actor, P = (p) => tvProj(cam, vw, dpr, p), W3 = (x, y, h) => [x, h || 0, -y];
  ctx.save(); ctx.beginPath(); ctx.rect(vw.x * dpr, vw.y * dpr, vw.w * dpr, vw.h * dpr); ctx.clip();
  const line = (pts, col, wid, dash) => { ctx.beginPath(); let f = true; for (const q of pts) { const p = P(q); if (!p) continue; if (f) { ctx.moveTo(p[0], p[1]); f = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = col; ctx.lineWidth = wid * dpr; ctx.setLineDash(dash ? dash.map(d => d * dpr) : []); ctx.stroke(); ctx.setLineDash([]); };
  const arrow = (x, y, th, len, col, wid) => { const a = W3(x, y, 0.02), b = W3(x + Math.cos(th) * len, y + Math.sin(th) * len, 0.02), l1 = W3(x + Math.cos(th) * len - Math.cos(th - 0.4) * len * 0.18, y + Math.sin(th) * len - Math.sin(th - 0.4) * len * 0.18, 0.02), l2 = W3(x + Math.cos(th) * len - Math.cos(th + 0.4) * len * 0.18, y + Math.sin(th) * len - Math.sin(th + 0.4) * len * 0.18, 0.02); line([a, b], col, wid); line([l1, b, l2], col, wid); };
  if (TV.diag && (!TV.diagViews || TV.diagViews.includes(vw.id))) {
    const S = A.samples, n = S.length;
    // COM ground track (past), foot trails (ankle), plants by role, swing aims
    line(S.map(q => W3(q.P[0], q.P[1], 0.01)), "rgba(255,255,255,0.75)", 1.4);
    line(S.slice(-70).map(q => q.aR), TV_COL.R, 1.4); line(S.slice(-70).map(q => q.aL), TV_COL.L, 1.4);
    for (const e of A.plantHist || []) { const p = P(W3(e.pos[0], e.pos[1], 0.01)); if (!p) continue; ctx.fillStyle = TV_COL.ROLE[e.role] || "#fff"; ctx.strokeStyle = e.F === "R" ? TV_COL.R : TV_COL.L; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2 * dpr, 0, 7); ctx.fill(); ctx.stroke(); }
    for (const F of ["R", "L"]) { const f = A.pose && A.pose.diag.feet[F]; if (f && !f.stance && f.aim) { const p = P(W3(f.aim[0], f.aim[1], 0.01)); if (p) { ctx.strokeStyle = F === "R" ? TV_COL.R : TV_COL.L; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(p[0], p[1], 6 * dpr, 0, 7); ctx.stroke(); } } }
    // vectors at the COM: requested direction (cyan), velocity (white, length ∝ speed), pelvis heading (yellow), gaze (violet)
    arrow(A.P[0], A.P[1], A.input.dir, 2.2, "#4de8ff", 2.2);
    const sp = Math.hypot(A.V[0], A.V[1]); if (sp > 0.05) arrow(A.P[0], A.P[1], Math.atan2(A.V[1], A.V[0]), 0.35 * sp, "#ffffff", 2.4);
    arrow(A.P[0], A.P[1], A.psi, 1.4, "#ffd84d", 2.2); arrow(A.P[0], A.P[1], A.gaze, 1.0, "#c08bff", 1.6);
  }
  if (TV.skel) { const fk = A.fk, bones = A.body.skel.bones; ctx.lineWidth = 2 * dpr; ctx.strokeStyle = "#5ee0ff"; for (const b of bones) { if (!b.parent || b.name === "pelvis" || b.name === "hair") continue; const a = P(fk.joint[b.parent.idx]), c = P(fk.joint[b.idx]); if (a && c) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); } } }
  if (TV.labels && TV.labMode === "short") {   // before / after panels: which body, the time and (TURN-1.1) the authored phase; big enough to read in a side-by-side
    const l11 = A.pose && A.pose.diag.l11, big = Math.max(13, Math.round(vw.h / 30));
    ctx.font = `700 ${big * dpr}px -apple-system, Helvetica`; ctx.fillStyle = TV.sil ? (TV.body === "t11" ? "rgba(150,95,0,0.95)" : "rgba(20,70,140,0.95)") : TV.body === "t11" ? "rgba(255,214,94,0.95)" : "rgba(170,215,255,0.95)";
    ctx.fillText(TV.body === "t11" ? "TURN-1.1 — authored body" : "TURN-1 — procedural body", (vw.x + 10) * dpr, (vw.y + big + 8) * dpr);
    ctx.font = `600 ${Math.round(big * 0.8) * dpr}px -apple-system, Helvetica`; ctx.fillStyle = TV.sil ? "rgba(40,40,40,0.9)" : "rgba(235,242,238,0.9)";
    ctx.fillText(`t ${A.t.toFixed(2)} s${TV.body === "t11" && l11 && l11.phase !== "—" ? "   " + l11.phase : ""}`, (vw.x + 10) * dpr, (vw.y + vw.h - 12) * dpr);
    ctx.restore(); return; }
  if (TV.diag && TV.labels && (vw.id === "game" || TV.single)) {   // diagnostics readout (drawn into the frame, so it is in the renders)
    const M = tvMeasure(A), l = A.pose && A.pose.diag.l11, D = 180 / Math.PI, man = A.man, lines = [
      `${TV.body === "t11" ? "TURN-1.1" : "TURN-1"} · phase ${l ? l.phase : "—"}${l && l.tau != null ? " (τ " + l.tau.toFixed(2) + ")" : ""} · brake drive ${l ? l.brake.toFixed(2) : "–"} · exit drive ${l ? l.exit.toFixed(2) : "–"}`,
      `cut family ${man ? man.tech : (l && l.fam) || "–"} · requested ${man ? (man.delta * D).toFixed(0) + "°" : "–"} · plant foot ${man ? man.plantFoot : "–"} · entry speed ${man ? man.sEntry.toFixed(1) : "–"} m/s`,
      `torso lean ${M.torsoLat.toFixed(0)}° side / ${M.torsoFwd.toFixed(0)}° fwd · pelvis ${(M.pelvisY * 100).toFixed(0)} cm (load ${(M.load * 100).toFixed(0)}) · knee R ${M.kneeR.toFixed(0)}° L ${M.kneeL.toFixed(0)}° · shoulders vs hips ${M.shoulderRot.toFixed(0)}°`];
    ctx.font = `600 ${11 * dpr}px Menlo, monospace`; ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(vw.x * dpr, (vw.y + vw.h - 70) * dpr, vw.w * dpr, 46 * dpr);
    ctx.fillStyle = "rgba(255,236,160,0.95)"; lines.forEach((tx, i) => ctx.fillText(tx, (vw.x + 8) * dpr, (vw.y + vw.h - 56 + i * 14) * dpr)); }
  if (TV.labels) { ctx.font = `600 ${11 * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(230,240,235,0.85)"; ctx.fillText(label, (vw.x + 8) * dpr, (vw.y + 16) * dpr);
    if (vw.id === "game" || TV.single) { const r = A.log[A.log.length - 1] || {}, D = 180 / Math.PI; const txt = `${TV.scn.label || ""}   t ${A.t.toFixed(2)} s   ${(r.s || 0).toFixed(2)} m/s   travel ${((r.thv || 0) * D).toFixed(0)}°   pelvis ${((r.psi || 0) * D).toFixed(0)}°   req ${((r.dir || 0) * D).toFixed(0)}°   ${r.role || ""} ${r.man ? "· " + r.man : ""}   ${TV.body === "t11" ? "[TURN-1.1 " + ((A.pose && A.pose.diag.l11) ? A.pose.diag.l11.phase : "—") + "]" : "[TURN-1 body]"}`;
      ctx.fillText(txt, (vw.x + 8) * dpr, (vw.y + vw.h - 10) * dpr); } }
  ctx.restore();
}
function tvHud() { const el = document.getElementById("hud"); if (!el) return; const A = TV.actor, r = A.log[A.log.length - 1]; if (!r) return; const D = 180 / Math.PI;
  const l = A.pose && A.pose.diag.l11, M = tvMeasure(A);
  el.textContent = `t ${A.t.toFixed(3)}  speed ${r.s.toFixed(2)}  travel ${(r.thv * D).toFixed(1)}°  pelvis ${(r.psi * D).toFixed(1)}°  gaze ${(r.gaze * D).toFixed(1)}°  role ${r.role}  ${r.man || ""}\n` +
    `body ${TV.body === "t11" ? "TURN-1.1 authored" : "TURN-1 procedural"}  phase ${l ? l.phase : "—"}${l && l.tau != null ? " (τ " + l.tau.toFixed(2) + ")" : ""}  brake ${l ? l.brake.toFixed(2) : "–"}  exit ${l ? l.exit.toFixed(2) : "–"}\n` +
    `torso lean ${M.torsoLat.toFixed(0)}° side / ${M.torsoFwd.toFixed(0)}° fwd  pelvis ${(M.pelvisY * 100).toFixed(0)} cm (load ${(M.load * 100).toFixed(0)} cm)  knee R ${M.kneeR.toFixed(0)}° L ${M.kneeL.toFixed(0)}°  shoulders vs hips ${M.shoulderRot.toFixed(0)}°`; }
// body measurements from the posed skeleton (world): torso lean (pelvis → neck vs vertical, in the pelvis-heading frame), pelvis height and its load
// below RUN-1's at this speed, knee flexion, shoulder line yaw relative to the hip line
function tvMeasure(A) {
  const fk = A.fk, B = A.body.idx, D = 180 / Math.PI, pl = fk.joint[B.pelvis], nk = fk.joint[B.neck], th = A.psi, f = [Math.cos(th), 0, -Math.sin(th)], rt = [-Math.sin(th), 0, -Math.cos(th)];
  const tv = [nk[0] - pl[0], nk[1] - pl[1], nk[2] - pl[2]], lg = A.pose.legs;
  const line = (a, b) => Math.atan2(-(fk.joint[B[b]][2] - fk.joint[B[a]][2]), fk.joint[B[b]][0] - fk.joint[B[a]][0]);
  const sh = line("upperArm_L", "upperArm_R"), hp = line("thigh_L", "thigh_R");
  return { torsoLat: Math.atan2(tv[0] * rt[0] + tv[2] * rt[2], tv[1]) * D, torsoFwd: Math.atan2(tv[0] * f[0] + tv[2] * f[2], tv[1]) * D, pelvisY: pl[1], load: Math.max(0, A.pose.p.y0 - pl[1]),
    kneeR: lg.R.knee, kneeL: lg.L.knee, shoulderRot: TURN1.wrapA(sh - hp) * D };
}
function tvUpdate(t) { tvAdvance(t); const A = TV.actor; A.plantHist = A.plantHist || []; tvPlants(); }
function tvPlants() {                                    // plant history from the event log (deterministic)
  const A = TV.actor; A.plantHist = []; const seen = {};
  for (const q of A.samples) for (const F of ["R", "L"]) { const f = q.feet[F]; if (f && f.stance) { const k = F + f.plant[0].toFixed(3) + f.plant[1].toFixed(3); if (!seen[k]) { seen[k] = 1; A.plantHist.push({ F, pos: f.plant, role: f.role }); } } }
}
function tvFrame(now) {
  if (TV.lastT == null) TV.lastT = now; const dt = Math.min(0.05, (now - TV.lastT) / 1000); TV.lastT = now;
  if (TV.playing) { TV.t += dt * TV.rate; if (TV.t > TV.loopT) TV.t = 0; tvUpdate(TV.t); }
  tvRender(); tvHud(); if (!TV.external) requestAnimationFrame(tvFrame);
}
function tvBoot() {
  const q = new URLSearchParams(location.search);
  TV.cv = document.getElementById("gl"); TV.ovc = document.getElementById("ov"); TV.ov2d = TV.ovc.getContext("2d");
  const gl = TV.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { document.body.textContent = "WebGL2 unavailable"; return; }
  TV.gl = gl; TV.R = { gl }; TV.ground = tvGround(gl);
  TV.scn = q.get("scn") ? T1SCN.get(q.get("scn")) : T1SCN.make(+(q.get("v") || 5.5), +(q.get("turn") || 90), +(q.get("tc") || 1.0));
  for (const [k, key] of [["zoom", "zoom"], ["rate", "rate"]]) if (q.get(k)) TV[key] = +q.get(k);
  if (q.get("diag") === "1") TV.diag = true; if (q.get("diagViews")) { TV.diag = true; TV.diagViews = q.get("diagViews").split(","); } if (q.get("skel") === "1") TV.skel = true; if (q.get("labels") === "0") TV.labels = false;
  if (q.get("body")) TV.body = q.get("body") === "t1" ? "t1" : "t11"; if (q.get("sil") === "1") TV.sil = true; if (q.get("lab")) TV.labMode = q.get("lab"); if (q.get("A")) TV.A = q.get("A"); if (q.get("B")) TV.B = q.get("B"); if (q.get("single")) TV.single = q.get("single");
  TV.loopT = TV.scn.dur || 4.2;
  // the rail: the gameplay camera follows the runner's x with a gentle lag-free rail (the match camera follows play along the touchline)
  TV.camX = () => TV.actor.P[0];
  const sel = document.getElementById("selScn"); if (sel) { sel.innerHTML = T1SCN.list().map(s => `<option value="${s.id}">${s.label}</option>`).join(""); sel.value = TV.scn.id; sel.onchange = (e) => { const u = new URL(location.href); u.searchParams.set("scn", e.target.value); location.href = u.toString(); }; }
  document.querySelectorAll("[data-rate]").forEach(b => b.onclick = () => { TV.rate = +b.dataset.rate; document.querySelectorAll("[data-rate]").forEach(x => x.classList.toggle("on", x === b)); });
  const bp = document.getElementById("bPlay"); if (bp) bp.onclick = () => { TV.playing = !TV.playing; bp.textContent = TV.playing ? "❚❚ Pause" : "▶ Play"; };
  const cd = document.getElementById("cDiag"); if (cd) { cd.checked = TV.diag; cd.onchange = () => { TV.diag = cd.checked; }; }
  const cb = document.getElementById("cBody"); if (cb) { cb.checked = TV.body === "t11"; cb.onchange = () => { const u = new URL(location.href); u.searchParams.set("body", cb.checked ? "t11" : "t1"); location.href = u.toString(); }; }
  const cs = document.getElementById("cSkel"); if (cs) { cs.checked = TV.skel; cs.onchange = () => { TV.skel = cs.checked; }; }
  window.addEventListener("keydown", (e) => { if (e.key === " ") { TV.playing = !TV.playing; e.preventDefault(); } if (e.key === ".") { TV.playing = false; TV.t += 1 / 60; tvUpdate(TV.t); } if (e.key === ",") { TV.playing = false; TV.t = Math.max(0, TV.t - 1 / 60); tvUpdate(TV.t); } if (e.key === "r") { TV.t = 0; tvUpdate(0); } });
  ofCharLoad(q.get("char") || "vinicius").then((ent) => {
    TV.entry = ent; TV.actor = tvMake(ent.skel, TV.scn.init); TV.actor._rt = 0; TV.actor.samples = [];
    tvUpdate(0); TV.ready = true; if (q.get("t")) { TV.t = +q.get("t"); tvUpdate(TV.t); }
    if (q.get("paused") === "1") TV.playing = false;
    if (q.get("external") === "1") { TV.external = true; tvRender(); tvHud(); } else requestAnimationFrame(tvFrame);
  }).catch((err) => { const h = document.getElementById("hud"); if (h) h.textContent = "character load failed: " + err; });
}
window.TURN1V = { state: TV, set(t, o) { if (o) { Object.assign(TV, o); } TV.t = t; tvUpdate(t); tvRender(); tvHud(); return true; }, layout: () => tvLayout(), actor: () => TV.actor };
window.addEventListener("load", tvBoot);
