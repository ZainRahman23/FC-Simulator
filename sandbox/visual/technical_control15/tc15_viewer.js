// ═══ technical_control15/tc15_viewer.js — TECHNICAL-CONTROL-1.5: THE TECHNIQUE REFERENCES LAB (owner: "show each at normal speed · 0.5× · front 3/4 ·
// rear 3/4 · side · top"; LOCAL ONLY — the character is a real player's model) ════════════════════════════════════════════════════════════════════
// One authored reference at a time (tc15_tech.js on tc15_ref.js): the quad view (front 3/4 · rear 3/4 · side · top) or any single view; 1× … 0.1×.
// Overlays: the ball's path (white) and the centre of mass's (cyan), every stance's footprint (right green, left magenta), every authoritative
// contact (a ring at the ball, its foot · surface · role), the entry and exit lines, and the PRESSURE LINES — from the ball, the five pressure
// directions fixed from the entry heading (front · left · right · rear-left · rear-right): green = a leg blocks a defender's straight reach to the
// ball (R / L: which), red = a direct line (the ball-exposure diagnostic; not gameplay). The header names the phase (ENTRY · CONTACT · PROTECTION ·
// EXIT), the time from the decisive contact, the speeds.
// URL: ?tech=CHOP90&single=quad|fF34|fR34|fSide|fSideR|topF|fRun&rate=0.5&t=…&exp=0&external=1&paused=1&bare=1
// (Cameras, the pitch and the ball's shaders: TECHNICAL-CONTROL-1.4's lab, copied.)
import { RefSim, DT, DIRS } from "./tc15_ref.js";
import { TECH } from "./tc15_tech.js";
const W = window, Vv = { t: 0, rate: 1, playing: true, ready: false, single: "quad", exp: true };
function persp(fyNdc, aspect, n, f) { const m = new Float32Array(16); m[0] = fyNdc / aspect; m[5] = fyNdc; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
function lookAt(eye, at, up) { const fz = V3.norm(V3.sub(eye, at)), fx = V3.norm(V3.cross(fz, up)), fy = V3.cross(fx, fz), m = M4.ident();
  m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2]; m[12] = -V3.dot(fx, eye); m[13] = -V3.dot(fy, eye); m[14] = -V3.dot(fz, eye); return m; }
// [azimuth from the front (deg; 90 = the player's left), elevation, distance, target height]; f* cameras FOLLOW the smoothed facing, topF looks down
// with the ENTRY heading up the screen
const ANG = { fF34: [38, 12, 4.4, 0.62], fR34: [142, 14, 4.4, 0.62], fSide: [90, 8, 4.2, 0.62], fSideR: [-90, 8, 4.2, 0.62], fRun: [62, 10, 6.0, 0.8], topF: [180, 88, 3.4, 0.0] };
const LABEL = { fF34: "front 3/4", fR34: "rear 3/4", fSide: "side (left)", fSideR: "side (right)", topF: "top (entry heading up)", fRun: "run" };
function cam(cx, cy, id, heading0, vw, vh) { const a = ANG[id] || ANG.fF34, tgt = [cx, a[3], -cy], f = [Math.cos(heading0), 0, -Math.sin(heading0)], l = [Math.sin(heading0), 0, Math.cos(heading0)];
  const az = a[0] * Math.PI / 180, el = a[1] * Math.PI / 180, d = a[2], hor = V3.add(V3.scale(f, Math.cos(az)), V3.scale(l, Math.sin(az))), eye = V3.add(tgt, V3.add(V3.scale(hor, d * Math.cos(el)), [0, d * Math.sin(el), 0]));
  const up = el > 80 * Math.PI / 180 ? f : [0, 1, 0]; return { view: lookAt(eye, tgt, up), proj: persp(1 / Math.tan(17 * Math.PI / 180), vw / vh, 0.1, 200) }; }
function shader(gl, t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
function groundProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW; void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[16]; uniform int uNSh; out vec4 o;
  float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float d=length(pa-ba*h); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float ring(vec2 p, vec2 c, float r, float w){ float d=abs(length(p-c)-r); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  void main(){ vec2 p = vec2(vW.x, -vW.z); bool inP = p.x > -2.0 && p.x < 107.0 && p.y > -2.0 && p.y < 70.0; float stripe = mod(floor(p.x / 5.25), 2.0);
    vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe); float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453); g *= 0.97 + 0.06 * n; if (!inP) g = vec3(0.17, 0.33, 0.19) * (0.97 + 0.06 * n);
    float w = 0.12, L = 0.0; L = max(L, seg(p, vec2(0,0), vec2(105,0), w)); L = max(L, seg(p, vec2(0,68), vec2(105,68), w)); L = max(L, seg(p, vec2(0,0), vec2(0,68), w)); L = max(L, seg(p, vec2(105,0), vec2(105,68), w));
    L = max(L, seg(p, vec2(52.5,0), vec2(52.5,68), w)); L = max(L, ring(p, vec2(52.5,34), 9.15, w));
    vec3 c = mix(g, vec3(0.93, 0.95, 0.92), L * 0.92); float sh = 0.0; for (int i = 0; i < 16; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    c *= 1.0 - min(0.6, sh); o = vec4(c, 1.0); }`;
  const p = program(gl, VS, FS), vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-25, 25, 130, 25, -25, -130, 130, -130]), gl.STATIC_DRAW); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
  return { p, vao, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), sh: gl.getUniformLocation(p, "uSh"), nsh: gl.getUniformLocation(p, "uNSh") } };
}
function ballProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec3 aP; uniform mat4 uView, uProj; uniform vec3 uC; uniform vec4 uQ; uniform float uR; out vec3 vL; out vec3 vN;
  vec3 rot(vec4 q, vec3 v){ vec3 t = 2.0 * cross(q.xyz, v); return v + q.w * t + cross(q.xyz, t); }
  void main(){ vL = aP; vN = rot(uQ, aP); gl_Position = uProj * (uView * vec4(uC + uR * vN, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vL; in vec3 vN; uniform vec3 uTint; out vec4 o;
  void main(){ vec3 n = normalize(vL); const float P = 1.6180339887; vec3 c[6] = vec3[6](vec3(0,1,P), vec3(0,-1,P), vec3(1,P,0), vec3(-1,P,0), vec3(P,0,1), vec3(P,0,-1));
    float m = 0.0; for (int i = 0; i < 6; i++) { vec3 a = normalize(c[i]); m = max(m, abs(dot(n, a))); }
    float dark = smoothstep(0.928, 0.936, m); vec3 base = mix(vec3(0.95, 0.94, 0.90), vec3(0.11, 0.13, 0.14), dark) * uTint;
    float l = 0.45 + 0.55 * max(0.0, dot(normalize(vN), normalize(vec3(0.35, 0.9, 0.25)))); o = vec4(base * l, 1.0); }`;
  const p = program(gl, VS, FS), pts = [], idx = [], NU = 28, NV = 16;
  for (let j = 0; j <= NV; j++) { const v = Math.PI * j / NV; for (let i = 0; i <= NU; i++) { const u = 2 * Math.PI * i / NU; pts.push(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)); } }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); gl.bindVertexArray(null);
  const U = (n) => gl.getUniformLocation(p, n); return { p, vao, n: idx.length, u: { view: U("uView"), proj: U("uProj"), c: U("uC"), q: U("uQ"), r: U("uR"), tint: U("uTint") } };
}
const K2A = (p) => [p[0], p[1], -p[2]], QA = (q) => [-q[0], -q[1], q[2], q[3]];
// ── build the reference once ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function build(ent) { const q = new URLSearchParams(location.search), id = q.get("tech") || "CHOP90", T = TECH[id] || TECH.CHOP90, colliders = await (await fetch("dribble1/d1_colliders.json")).json(), t0 = performance.now();
  const S = new RefSim({ E: W.RUN1_V13, M4, skel: ent.skel, colliders }, T).run(); Vv.S = S; Vv.T = T; Vv.ms = performance.now() - t0; Vv.dur = T.dur; Vv.id = T.id; }
const iAt = (t) => Math.max(0, Math.min(Vv.S.rec.length - 1, Math.round(t / DT)));
function followHeading(i) { const rec = Vv.S.rec, a = Math.max(0, i - 60), b = Math.min(rec.length - 1, i + 60); let x = 0, y = 0; for (let k = a; k <= b; k += 4) { x += Math.cos(rec[k].psi); y += Math.sin(rec[k].psi); } return Math.atan2(y, x); }
function layout() { if (Vv.bare) return mk(window.innerWidth, window.innerHeight); const bar = document.getElementById("bar"), top = bar ? bar.getBoundingClientRect().height : 50; return mk(Math.max(640, Math.min(window.innerWidth - 8, 2400)), Math.max(420, window.innerHeight - top - 40)); }
function mk(Wd, H) { const views = []; if (Vv.single === "quad") { const w2 = Math.floor((Wd - 4) / 2), h2 = Math.floor((H - 4) / 2); ["fF34", "fR34", "fSide", "topF"].forEach((id, j) => views.push({ id, x: (j % 2) * (w2 + 4), y: Math.floor(j / 2) * (h2 + 4), w: j % 2 ? Wd - w2 - 4 : w2, h: j >= 2 ? H - h2 - 4 : h2 })); }
  else views.push({ id: Vv.single, x: 0, y: 0, w: Wd, h: H }); return { W: Wd, H, views }; }
function proj3(c, vw, dpr, p) { const v = M4.transformPoint(c.view, p), pr = c.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], w = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (w <= 1e-4) return null; return [(vw.x + (cx / w * 0.5 + 0.5) * vw.w) * dpr, (vw.y + (0.5 - cy / w * 0.5) * vw.h) * dpr]; }
function render() {
  const gl = Vv.gl, cv = Vv.cv, dpr = Vv.dpr || Math.min(window.devicePixelRatio || 1, 2), L = layout(), S = Vv.S;
  if (cv.width !== Math.round(L.W * dpr) || cv.height !== Math.round(L.H * dpr)) { cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr); cv.style.width = L.W + "px"; cv.style.height = L.H + "px";
    Vv.ovc.width = cv.width; Vv.ovc.height = cv.height; Vv.ovc.style.width = cv.style.width; Vv.ovc.style.height = cv.style.height; const wr = document.getElementById("wrap"); wr.style.width = L.W + "px"; wr.style.height = L.H + "px"; }
  const ctx = Vv.ov2d; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, Vv.ovc.width, Vv.ovc.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.SCISSOR_TEST); gl.viewport(0, 0, cv.width, cv.height); gl.scissor(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const i = iAt(Vv.t), r = S.rec[i], bA = K2A(r.ball.p);
  for (const vw of L.views) { const sh = new Float32Array(64); let ns = 0; const push = (x, y, s, w) => { if (ns < 16) { sh.set([x, y, s, w], ns * 4); ns++; } };
    push(r.P[0], r.P[1], 0.42, 0.40); if (r.feet) for (const F of ["R", "L"]) { const a = r.feet[F], hg = Math.max(0, a[1] - 0.09); push(a[0], -a[2], 0.15 + hg * 0.3, 0.5 * Math.exp(-hg * 7)); }
    const bh = Math.max(0, bA[1] - 0.11); push(bA[0], -bA[2], 0.12 + bh * 0.4, 0.65 * Math.exp(-bh * 5));
    const px = Math.round(vw.x * dpr), py = Math.round((L.H - vw.y - vw.h) * dpr), pw = Math.round(vw.w * dpr), ph = Math.round(vw.h * dpr);
    gl.viewport(px, py, pw, ph); gl.scissor(px, py, pw, ph); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const top = vw.id === "topF", fa = r.feet, mx = fa ? (fa.R[0] + fa.L[0]) / 2 : r.P[0], mz = fa ? (fa.R[2] + fa.L[2]) / 2 : -r.P[1], cx = top ? r.P[0] * 0.6 + bA[0] * 0.4 : mx * 0.7 + bA[0] * 0.3, cy = top ? r.P[1] * 0.6 - bA[2] * 0.4 : -(mz * 0.7 + bA[2] * 0.3);
    const c = cam(cx, cy, vw.id, top ? S.th0 : followHeading(i), vw.w, vw.h); vw.cam = c;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    const G = Vv.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, c.view); gl.uniformMatrix4fv(G.u.proj, false, c.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    if (r.skin) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(Vv.R, Vv.ent, r.skin, c.view, c.proj); gl.disable(gl.CULL_FACE); }
    const B = Vv.ball; gl.useProgram(B.p); gl.uniformMatrix4fv(B.u.view, false, c.view); gl.uniformMatrix4fv(B.u.proj, false, c.proj); gl.uniform3fv(B.u.c, bA); gl.uniform4fv(B.u.q, QA(r.ball.q)); gl.uniform1f(B.u.r, 0.11); gl.uniform3fv(B.u.tint, [1, 1, 1]);
    gl.bindVertexArray(B.vao); gl.drawElements(gl.TRIANGLES, B.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null);
    overlay(ctx, vw, c, dpr, i, r); }
  gl.disable(gl.SCISSOR_TEST);
}
const P2 = (p, h) => [p[0], h || 0.03, -p[1]];
function overlay(ctx, vw, c, dpr, i, r) {
  const S = Vv.S, T = Vv.T, P = (p) => proj3(c, vw, dpr, p), top = vw.id === "topF", big = Vv.single !== "quad";
  ctx.save(); ctx.beginPath(); ctx.rect(vw.x * dpr, vw.y * dpr, vw.w * dpr, vw.h * dpr); ctx.clip();
  const line = (pts, col, wid, dash) => { ctx.beginPath(); let f = true; for (const q of pts) { const p = P(q); if (!p) continue; if (f) { ctx.moveTo(p[0], p[1]); f = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = col; ctx.lineWidth = wid * dpr; ctx.setLineDash(dash ? dash.map((d) => d * dpr) : []); ctx.stroke(); ctx.setLineDash([]); };
  const ring = (cc, rad, col, wid) => { const pts = []; for (let a = 0; a <= 28; a++) pts.push([cc[0] + rad * Math.cos(a / 28 * 6.283), cc[1], cc[2] + rad * Math.sin(a / 28 * 6.283)]); line(pts, col, wid); };
  const text = (q, s, col, size) => { const p = P(q); if (!p) return; ctx.font = `600 ${(size || 11) * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(0,0,0,0.6)"; const w = ctx.measureText(s).width; ctx.fillRect(p[0] - 3 * dpr, p[1] - 12 * dpr, w + 6 * dpr, 15 * dpr); ctx.fillStyle = col; ctx.fillText(s, p[0], p[1]); };
  const rec = S.rec, tr = (f, a, b) => rec.slice(Math.max(0, a), Math.min(rec.length, b)).filter((_, k) => k % 3 === 0).map(f);
  // the entry and exit lines through the decisive contact's centre of mass (dashed)
  const O = S.O, th0 = S.th0, thE = th0 + T.turnDeg * Math.PI / 180; line([[O[0] - Math.cos(th0) * 4, 0.01, -(O[1] - Math.sin(th0) * 4)], [O[0], 0.01, -O[1]], [O[0] + Math.cos(thE) * 4, 0.01, -(O[1] + Math.sin(thE) * 4)]], "rgba(255,255,255,0.28)", 1.2, [6, 5]);
  // the paths: ball (white) and centre of mass (cyan) up to now, the ball's coming path faint
  line(tr((q) => [q.ball.p[0], 0.015, -q.ball.p[2]], 0, i + 1), "rgba(255,255,255,0.8)", 1.6); line(tr((q) => [q.ball.p[0], 0.015, -q.ball.p[2]], i, rec.length), "rgba(255,255,255,0.18)", 1.2, [3, 4]); line(tr((q) => [q.P[0], 0.012, -q.P[1]], 0, i + 1), "rgba(77,232,255,0.75)", 1.6);
  // the stances' footprints up to now (right green, left magenta)
  for (const X of ["R", "L"]) for (const s of S.st[X]) { if (s.t0 > r.t + 1e-9) continue; const ft = S.stanceFoot(s, s.t0), d = [Math.cos(ft.yaw), Math.sin(ft.yaw)], n = [-d[1], d[0]], a = ft.ank, pts = [[-0.08, -0.045], [0.27, -0.045], [0.27, 0.045], [-0.08, 0.045], [-0.08, -0.045]].map(([u, v]) => [a[0] + d[0] * u + n[0] * v, 0.006, -(a[1] + d[1] * u + n[1] * v)]);
    line(pts, X === "R" ? "rgba(110,255,150,0.65)" : "rgba(255,110,200,0.65)", r.t <= s.t1 ? 2.2 : 1.0); }
  // the authoritative contacts
  for (const cn of S.contacts) { if (cn.t > r.t + 1e-9) continue; const fresh = r.t - cn.t < 0.4, col = cn.role === "CHOP" || /CRUYFF|HOOK|DRAG|CUT/.test(cn.role) ? "rgba(255,212,94,0.95)" : "rgba(125,240,255,0.85)", p = [cn.ball[0], 0.02, -cn.ball[1]];
    ring(p, 0.14, col, fresh ? 3 : 1.6); if (fresh || big) text([p[0], top ? 0.05 : 0.33, p[2]], `${cn.role} · ${cn.F} ${cn.surface.toLowerCase()}`, col, top ? 11 : 10); }
  // THE PRESSURE LINES: a defender's straight reach at the ball from the five directions (green = a leg blocks it, red = a direct line)
  if (Vv.exp && r.exp) { const b = [r.ball.p[0], r.ball.p[2]]; for (const [k, deg] of Object.entries(DIRS)) { const a = th0 + deg * Math.PI / 180, e = [b[0] + Math.cos(a) * 0.9, b[1] + Math.sin(a) * 0.9], who = r.exp.named[k];
      line([[e[0], 0.85, -e[1]], [b[0], 0.11, -b[1]]], who ? "rgba(120,255,140,0.9)" : "rgba(255,80,70,0.95)", who ? 2.0 : 2.6, who ? [5, 3] : null); if (top || big) text([e[0], 0.88, -e[1]], `${k}${who ? " · " + who.replace("B", "body") : ""}`, who ? "#9dffae" : "#ff8a80", 9.5); } }
  // (dbg=1) the posed legs as segments: hip → knee → ankle → toe tip (right green, left magenta)
  if (Vv.dbg && r.J) for (const X of ["R", "L"]) { const J = r.J, w = (q) => [q[0], q[2], -q[1]]; line([w(J["thigh_" + X].j), w(J["shin_" + X].j), w(J["foot_" + X].j), w(J["toe_" + X].t)], X === "R" ? "rgba(60,255,120,1)" : "rgba(255,60,200,1)", 3); }
  const hd = (s, y, col) => { ctx.font = `600 ${11.5 * dpr}px -apple-system, Helvetica`; const w = ctx.measureText(s).width; ctx.fillStyle = "rgba(0,0,0,0.58)"; ctx.fillRect((vw.x + 6) * dpr, (vw.y + y - 13) * dpr, w + 10 * dpr, 17 * dpr); ctx.fillStyle = col; ctx.fillText(s, (vw.x + 11) * dpr, (vw.y + y) * dpr); };
  const sp = Math.hypot(r.V[0], r.V[1]), bs = Math.hypot(r.ball.v[0], r.ball.v[2]), tc = r.t - T.tC;
  if (big || vw.id === "fF34") { hd(`${T.label} · TECHNICAL-CONTROL-1.5 reference · Ball Control 99 · Dribbling 99 · Agility 99`, 18, "#ffd45e"); hd(`${r.phase}`, 36, "#e8f5ee");
    hd(`t ${tc >= 0 ? "+" : ""}${tc.toFixed(2)} s from the decisive contact · player ${sp.toFixed(1)} m/s · ball ${bs.toFixed(1)} m/s${r.exp ? ` · direct lines ${Object.keys(DIRS).filter((k) => !r.exp.named[k]).join(", ") || "none"}` : ""}`, 54, "#e8f5ee"); }
  if (!big) hd(LABEL[vw.id] || vw.id, vw.id === "fF34" ? 72 : 18, "rgba(230,240,235,0.9)");
  ctx.restore();
}
function hud() { const el = document.getElementById("hud"); if (!el || !Vv.S) return; const S = Vv.S; el.textContent = `${S.T.id} · ${S.T.label} · contacts ${S.contacts.map((c) => `${c.role}@${(c.t - S.T.tC).toFixed(2)}s ${c.F} ${c.surface.toLowerCase()} → ${c.speedOut.toFixed(1)} m/s ${c.outDeg.toFixed(0)}°`).join(" · ")} · built in ${Vv.ms.toFixed(0)} ms`; }
function frame(now) { if (Vv.lastT == null) Vv.lastT = now; const dt = Math.min(0.05, (now - Vv.lastT) / 1000); Vv.lastT = now; if (Vv.playing) { Vv.t += dt * Vv.rate; if (Vv.t > Vv.dur) Vv.t = 0; } render(); hud(); if (!Vv.external) requestAnimationFrame(frame); }
async function boot() {
  const q = new URLSearchParams(location.search); Vv.cv = document.getElementById("gl"); Vv.ovc = document.getElementById("ov"); Vv.ov2d = Vv.ovc.getContext("2d");
  const gl = Vv.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { document.body.textContent = "WebGL2 unavailable"; return; }
  Vv.gl = gl; Vv.R = { gl }; Vv.ground = groundProg(gl); Vv.ball = ballProg(gl);
  if (q.get("single")) Vv.single = q.get("single"); if (q.get("rate")) Vv.rate = +q.get("rate"); if (q.get("exp") === "0") Vv.exp = false; if (q.get("dbg") === "1") Vv.dbg = true; if (q.get("bare") === "1") { Vv.bare = true; for (const id of ["bar", "hud"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; } document.body.style.overflow = "hidden"; }
  const go = (o) => { const u = new URL(location.href); for (const [k, v] of Object.entries(o)) { if (v == null) u.searchParams.delete(k); else u.searchParams.set(k, v); } location.href = u.toString(); };
  const st = document.getElementById("selTech"); st.innerHTML = Object.values(TECH).map((T) => `<option value="${T.id}">${T.label}</option>`).join(""); st.value = q.get("tech") || "CHOP90"; st.onchange = (e) => go({ tech: e.target.value });
  const sv = document.getElementById("selView"); sv.value = Vv.single; sv.onchange = (e) => go({ single: e.target.value });
  const ce = document.getElementById("cbExp"); ce.checked = Vv.exp; ce.onchange = (e) => { Vv.exp = e.target.checked; };
  document.querySelectorAll("[data-rate]").forEach((b) => { b.classList.toggle("on", +b.dataset.rate === Vv.rate); b.onclick = () => { Vv.rate = +b.dataset.rate; document.querySelectorAll("[data-rate]").forEach((x) => x.classList.toggle("on", x === b)); }; });
  const bp = document.getElementById("bPlay"); bp.onclick = () => { Vv.playing = !Vv.playing; bp.textContent = Vv.playing ? "❚❚ Pause" : "▶ Play"; };
  window.addEventListener("keydown", (e) => { if (e.key === " ") { Vv.playing = !Vv.playing; e.preventDefault(); } if (e.key === ".") { Vv.playing = false; Vv.t += 1 / 60; } if (e.key === ",") { Vv.playing = false; Vv.t = Math.max(0, Vv.t - 1 / 60); } if (e.key === "r") Vv.t = 0; });
  const ent = await W.ofCharLoad(q.get("char") || "vinicius"); Vv.ent = ent; await build(ent); Vv.ready = true; if (q.get("t")) Vv.t = +q.get("t"); if (q.get("paused") === "1") Vv.playing = false;
  if (q.get("external") === "1") { Vv.external = true; render(); hud(); } else requestAnimationFrame(frame);
}
W.TC15 = { ready: () => Vv.ready, set(t, o) { if (o) Object.assign(Vv, o); Vv.t = t; render(); hud(); return true; }, tC: () => Vv.T.tC, dur: () => Vv.dur,
  contacts: () => Vv.S.contacts.map((c) => ({ t: c.t, F: c.F, surface: c.surface, role: c.role })), summary: () => ({ id: Vv.id, contacts: Vv.S.contacts.map((c) => ({ t: c.t, role: c.role, outDeg: c.outDeg, speedOut: c.speedOut })) }) };
boot().catch((err) => { const h = document.getElementById("hud"); if (h) h.textContent = "TECHNICAL-CONTROL-1.5 lab failed: " + (err && err.stack || err); console.error(err); });
