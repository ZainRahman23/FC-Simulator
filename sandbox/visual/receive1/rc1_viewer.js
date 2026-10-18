// ═══ receive1/rc1_viewer.js — RECEIVE-CONTROL-1 lab: the DRIBBLE-V1 lab viewer (dribble15/d15_viewer.js, frozen — this is a copy) running the
// RECEIVE adapter (rc1_core.js) on a receive case: the pass, the receiver's approach, the first touch, the handoff to DRIBBLE-V1. Same cameras, same
// diagnostics; added: the passer, the requested exit, the receiveTurnAngle classification and the first touch. The page runs the SAME simulation as
// the Node tools once at load (deterministic, scrubbable). URL: ?case=F_180R_JOG_MED&seed=1&diag=1&single=game&rate=0.5&t=…
import { ReceiveSim, BALL_DEFAULT, D1, DT } from "./rc1_core.js";
import { PROFILES } from "../dribble1/d1_attrs.js";
import { parseCase, VISUAL } from "./rc1_cases.js";
const W = window, Vv = { t: 0, rate: 1, playing: true, diag: false, ready: false, single: null, labels: true, A: "near", B: "rear34" };
// ── cameras (as the TURN-1 viewer: CAMERA_V1 rail-following; close views at a fixed world azimuth following the runner) ──────────────────────────
function persp(fyNdc, aspect, n, f) { const m = new Float32Array(16); m[0] = fyNdc / aspect; m[5] = fyNdc; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
function lookAt(eye, at, up) { const fz = V3.norm(V3.sub(eye, at)), fx = V3.norm(V3.cross(fz, up)), fy = V3.cross(fx, fz), m = M4.ident();
  m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2]; m[12] = -V3.dot(fx, eye); m[13] = -V3.dot(fy, eye); m[14] = -V3.dot(fz, eye); return m; }
function gameCam(px, py, zoom, vw, vh) {
  const th = 22 * Math.PI / 180, C = [px, 30, -(68 + 43)], r = [1, 0, 0], u = [0, Math.cos(th), Math.sin(th)], f = [0, -Math.sin(th), Math.cos(th)];
  const view = M4.ident(); view[0] = r[0]; view[4] = r[1]; view[8] = r[2]; view[1] = u[0]; view[5] = u[1]; view[9] = u[2]; view[2] = -f[0]; view[6] = -f[1]; view[10] = -f[2];
  const t = M4.transformDir(view, C); view[12] = -t[0]; view[13] = -t[1]; view[14] = -t[2];
  const fpx = 360 / Math.tan(14 * Math.PI / 180), fy = 2 * fpx * zoom / 720, proj = persp(fy, vw / vh, 1.0, 400);
  if (zoom > 1.01) { const pv = M4.transformPoint(view, [px, 0.9, -py]), w = -pv[2], nx = proj[0] * pv[0] / w, ny = proj[5] * pv[1] / w; for (let k = 0; k < 4; k++) { proj[k * 4] -= nx * proj[k * 4 + 3]; proj[k * 4 + 1] -= ny * proj[k * 4 + 3]; } }
  return { view, proj };
}
const ANG = { side: [90, 6, 6.0], near: [-90, 14, 4.6], nearC: [-90, 10, 3.2], rear34: [150, 14, 6.4], front34: [30, 12, 6.4], top: [-90, 64, 7.5], rearC: [180, 8, 3.6], low: [-90, 4, 3.0] };
function closeCam(cx, cy, angle, heading0, vw, vh) {
  const a = ANG[angle] || ANG.near, tgt = [cx, 0.55, -cy], f = [Math.cos(heading0), 0, -Math.sin(heading0)], l = [Math.sin(heading0), 0, Math.cos(heading0)];
  const az = a[0] * Math.PI / 180, el = a[1] * Math.PI / 180, d = a[2], hor = V3.add(V3.scale(f, Math.cos(az)), V3.scale(l, Math.sin(az))), eye = V3.add(tgt, V3.add(V3.scale(hor, d * Math.cos(el)), [0, d * Math.sin(el), 0]));
  return { view: lookAt(eye, tgt, [0, 1, 0]), proj: persp(1 / Math.tan(17 * Math.PI / 180), vw / vh, 0.1, 200) };
}
// ── the pitch (the RUN-1 / TURN-1 viewer's procedural ground with contact shadows) ─────────────────────────────────────────────────────────────────
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
// ── the football: a lit sphere with truncated-icosahedron panels from its integrated orientation (rendering never writes the ball) ─────────────────
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
// ── run the simulation once and keep the record ───────────────────────────────────────────────────────────────────────────────────────────────────
async function simulate(ent) {
  const q = new URLSearchParams(location.search), cs = parseCase(q.get("case") || VISUAL[0].id), vis = VISUAL.find((v) => v.id === cs.id), scn = Object.assign({}, cs.scenario, { label: (vis ? vis.tag + " · " : "") + cs.id }), arch = q.get("arch") || "B", prof = q.get("prof") || "HIGH", seed = +(q.get("seed") || 1); Vv.cs = cs;
  const colliders = await (await fetch("dribble1/d1_colliders.json")).json(), t0 = performance.now();
  // (DIAGNOSTIC ONLY — the review's counterfactuals: ?ovr={"setup14":{"graded":false}} overrides resolver parameters for this page, one level deep)
  const ovr = q.get("ovr"); Vv.ovr = ovr || null; if (ovr) for (const [k, v] of Object.entries(JSON.parse(ovr))) D1[k] = v && typeof v === "object" && !Array.isArray(v) && D1[k] ? { ...D1[k], ...v } : v;
  const S = new ReceiveSim({ T1: W.TURN1, E: W.RUN1_V13, M4: M4, TURN11: W.TURN11, skel: ent.skel, colliders, ball: BALL_DEFAULT, arch, seed, player: PROFILES[prof], scenario: scn, opts: { record: true, recViewer: true, errScale: q.get("err") != null ? +q.get("err") : undefined } });
  if (q.get("dur")) scn.dur = +q.get("dur"); S.cfg.scenario.dur = scn.dur; S.run(); Vv.simMs = performance.now() - t0; Vv.S = S; Vv.scn = scn; Vv.arch = arch; Vv.prof = prof; Vv.seed = seed; Vv.rec = S.rec; Vv.dur = S.fault ? (S.rec.length - 1) * DT : scn.dur;
  // a determinism fingerprint of the run (ball + COM at every tick, touches): identical in Node for the same scenario / arch / profile / seed
  let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k);
  Vv.hash = h.toString(16);
}
// ── draw ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const K2A = (p) => [p[0], p[1], -p[2]], QA = (q) => [-q[0], -q[1], q[2], q[3]];
function layout() { if (Vv.fixedLayout) return Vv.fixedLayout; const bar = document.getElementById("bar"), top = bar ? bar.getBoundingClientRect().height : 50, Wd = Math.max(640, Math.min(window.innerWidth - 8, 2400)), H = Math.max(420, window.innerHeight - top - 40);
  if (Vv.single) return { W: Wd, H, views: [{ id: Vv.single, x: 0, y: 0, w: Wd, h: H }] }; const gw = Math.round(Wd * 0.62), cw = Wd - gw - 4, ch = Math.floor((H - 4) / 2);
  return { W: Wd, H, views: [{ id: "game", x: 0, y: 0, w: gw, h: H }, { id: "A", x: gw + 4, y: 0, w: cw, h: ch }, { id: "B", x: gw + 4, y: ch + 4, w: cw, h: H - ch - 4 }] }; }
function proj3(cam, vw, dpr, p) { const v = M4.transformPoint(cam.view, p), pr = cam.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], w = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (w <= 1e-4) return null; return [(vw.x + (cx / w * 0.5 + 0.5) * vw.w) * dpr, (vw.y + (0.5 - cy / w * 0.5) * vw.h) * dpr]; }
function frameAt(t) { const i = Math.max(0, Math.min(Vv.rec.length - 1, Math.floor(t / DT + 1e-6))); return { i, r: Vv.rec[i] }; }
function render() {
  const gl = Vv.gl, cv = Vv.cv, dpr = Vv.dpr || Math.min(window.devicePixelRatio || 1, 2), L = layout(), { i, r } = frameAt(Vv.t);
  if (cv.width !== Math.round(L.W * dpr) || cv.height !== Math.round(L.H * dpr)) { cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr); cv.style.width = L.W + "px"; cv.style.height = L.H + "px";
    Vv.ovc.width = cv.width; Vv.ovc.height = cv.height; Vv.ovc.style.width = cv.style.width; Vv.ovc.style.height = cv.style.height; const wr = document.getElementById("wrap"); wr.style.width = L.W + "px"; wr.style.height = L.H + "px"; }
  const ctx = Vv.ov2d; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, Vv.ovc.width, Vv.ovc.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.SCISSOR_TEST); gl.viewport(0, 0, cv.width, cv.height); gl.scissor(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const bA = K2A(r.ball.p), sh = new Float32Array(64); let ns = 0; const pushSh = (x, y, s, w) => { if (ns < 16) { sh.set([x, y, s, w], ns * 4); ns++; } };
  pushSh(r.P[0], r.P[1], 0.42, 0.40); if (r.feet) for (const F of ["R", "L"]) { const a = r.feet[F], hg = Math.max(0, a[1] - 0.09); pushSh(a[0], -a[2], 0.15 + hg * 0.3, 0.5 * Math.exp(-hg * 7)); }
  const bh = Math.max(0, bA[1] - 0.11); pushSh(bA[0], -bA[2], 0.12 + bh * 0.4, 0.65 * Math.exp(-bh * 5));
  const h0 = Vv.scn.init.heading || 0;
  for (const vw of L.views) {
    const px = Math.round(vw.x * dpr), py = Math.round((L.H - vw.y - vw.h) * dpr), pw = Math.round(vw.w * dpr), ph = Math.round(vw.h * dpr);
    gl.viewport(px, py, pw, ph); gl.scissor(px, py, pw, ph); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const ang = vw.id === "A" ? Vv.A : vw.id === "B" ? Vv.B : vw.id, cx = (r.P[0] + bA[0]) / 2, cy = (r.P[1] - bA[2]) / 2;
    const cam = vw.id === "game" ? gameCam(Vv.camX(r), r.P[1], Vv.zoom || 1, vw.w, vw.h) : closeCam(cx, cy, ang, h0, vw.w, vw.h); vw.cam = cam;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    const G = Vv.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, cam.view); gl.uniformMatrix4fv(G.u.proj, false, cam.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(Vv.R, Vv.ent, r.skin, cam.view, cam.proj); gl.disable(gl.CULL_FACE);
    const B = Vv.ball; gl.useProgram(B.p); gl.uniformMatrix4fv(B.u.view, false, cam.view); gl.uniformMatrix4fv(B.u.proj, false, cam.proj); gl.uniform3fv(B.u.c, bA); gl.uniform4fv(B.u.q, QA(r.ball.q)); gl.uniform1f(B.u.r, 0.11); gl.uniform3fv(B.u.tint, [1, 1, 1]);
    gl.bindVertexArray(B.vao); gl.drawElements(gl.TRIANGLES, B.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null);
    for (const f of r.fx || []) if (f) for (const c of f) { gl.uniform3fv(B.u.c, K2A(c.p)); gl.uniform1f(B.u.r, c.r); gl.uniform3fv(B.u.tint, [1.0, 0.45, 0.35]); gl.uniform4fv(B.u.q, [0, 0, 0, 1]); gl.bindVertexArray(B.vao); gl.drawElements(gl.TRIANGLES, B.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); }
    overlay(ctx, vw, cam, dpr, i, r);
  }
  gl.disable(gl.SCISSOR_TEST);
}
const COL = { R: "rgba(110,255,150,0.95)", L: "rgba(255,110,200,0.95)", CONTROLLED: "#7dff9b", LOOSE: "#ffb347", CONTESTED: "#ff5d5d" };
function overlay(ctx, vw, cam, dpr, i, r) {
  const P = (p) => proj3(cam, vw, dpr, p), rec = Vv.rec, S = Vv.S;
  ctx.save(); ctx.beginPath(); ctx.rect(vw.x * dpr, vw.y * dpr, vw.w * dpr, vw.h * dpr); ctx.clip();
  const line = (pts, col, wid, dash) => { ctx.beginPath(); let f = true; for (const q of pts) { const p = P(q); if (!p) continue; if (f) { ctx.moveTo(p[0], p[1]); f = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = col; ctx.lineWidth = wid * dpr; ctx.setLineDash(dash ? dash.map(d => d * dpr) : []); ctx.stroke(); ctx.setLineDash([]); };
  const dot = (q, rad, col, stroke) => { const p = P(q); if (!p) return; ctx.beginPath(); ctx.arc(p[0], p[1], rad * dpr, 0, 7); if (stroke) { ctx.strokeStyle = col; ctx.lineWidth = 1.6 * dpr; ctx.stroke(); } else { ctx.fillStyle = col; ctx.fill(); } };
  const text = (q, s, col, size) => { const p = P(q); if (!p) return; ctx.font = `600 ${(size || 11) * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(0,0,0,0.55)"; const w = ctx.measureText(s).width; ctx.fillRect(p[0] - 3 * dpr, p[1] - 12 * dpr, w + 6 * dpr, 15 * dpr); ctx.fillStyle = col; ctx.fillText(s, p[0], p[1]); };
  if (Vv.diag) {
    const ballTr = (a, b) => rec.slice(Math.max(0, a), Math.min(rec.length, b)).filter((_, k) => k % 4 === 0).map(q => [q.ball.p[0], 0.02, -q.ball.p[2]]);
    line(ballTr(i - 240, i + 1), "rgba(255,255,255,0.85)", 1.6); line(ballTr(i, i + 240), "rgba(255,255,255,0.35)", 1.2, [4, 4]);   // ball: past (solid) / future (dashed)
    line(rec.slice(Math.max(0, i - 360), i + 1).filter((_, k) => k % 6 === 0).map(q => [q.P[0], 0.01, -q.P[1]]), "rgba(77,232,255,0.8)", 1.4);   // COM ground track
    for (const F of ["R", "L"]) line(rec.slice(Math.max(0, i - 60), i + 1).filter(q => q.feet).map(q => q.feet["t" + F]), COL[F], 1.3);   // toe trails
    if (r.plan && r.plan.viz) { const z = r.plan.viz; line(z.toe, COL[r.plan.F], 1.6, [3, 3]); dot(z.ball, 7, "#ffd45e", true); if (z.target) dot([z.target[0], 0.02, z.target[2]], 5, "rgba(255,212,94,0.6)", true);
      text([z.ball[0], 0.45, z.ball[2]], `plan ${r.plan.F} ${r.plan.reg} @${(r.plan.kc * DT).toFixed(2)}s`, "#ffd45e"); }
    // control envelope around the COM (radius = the speed's dribble separation), coloured by the control classification
    const env = []; for (let a = 0; a <= 64; a++) { const th = a / 64 * 2 * Math.PI; env.push([r.P[0] + Math.cos(th) * (r.env + 0.3), 0.01, -(r.P[1] + Math.sin(th) * (r.env + 0.3))]); } line(env, COL[r.ctrl] || "#fff", 1.0, [2, 5]);
    // velocities: ball (white), player (cyan)
    const bv = r.ball.v, bA = K2A(r.ball.p); line([[bA[0], 0.03, bA[2]], [bA[0] + bv[0] * 0.2, 0.03, bA[2] - bv[2] * 0.2]], "#ffffff", 2.2); line([[r.P[0], 0.03, -r.P[1]], [r.P[0] + r.V[0] * 0.2, 0.03, -r.P[1] - r.V[1] * 0.2]], "#4de8ff", 2.2);
    // authoritative contacts: marker + family / foot / speed for 1 s
    for (const T of S.touches) { if (T.k > i || i - T.k > 240) continue; const a = 1 - (i - T.k) / 240, p = T.ball; dot(p, 5, `rgba(255,80,80,${a})`); if (i - T.k < 140) text([p[0], 0.32, p[2]], `${T.F} ${T.reg} ${T.executed.speed.toFixed(1)} m/s${T.launched ? "" : " ✕"}`, `rgba(255,236,160,${a})`); }
    // DRIBBLE-1.1 — THE FOLLOW-THROUGH: around the latest touch, TURN-1.2's own toe path for that swing (white dashed) against the adjusted toe path
    // the player actually swings (foot colour, solid), the toe at +50 / +100 / +200 ms, the swing's authoritative landing (unchanged), the launch
    // velocity arrow, the follow-through used (yield / arc) and the minimum boot–ball clearance measured after the contact
    const LT = [...S.touches].reverse().find(T => T.launched && T.k <= i + 40 && i - T.k < 150);
    if (LT && Vv.ft !== false) { const F = LT.F, a = Math.max(0, LT.k - 40), b = Math.min(rec.length - 1, i, LT.k + 70), seg = rec.slice(a, b + 1);
      line(seg.filter(q => q.d11 && q.d11.orig && q.d11.orig[F]).map(q => q.d11.orig[F].toe), "rgba(255,255,255,0.85)", 1.3, [3, 4]);
      line(seg.filter(q => q.feet).map(q => q.feet["t" + F]), COL[F], 2.6);
      for (const ms of [50, 100, 200]) { const q = rec[LT.k + Math.round(ms / 1000 / DT)]; if (q && q.feet && LT.k + Math.round(ms / 1000 / DT) <= i) { dot(q.feet["t" + F], 3.5, COL[F]); text([q.feet["t" + F][0], q.feet["t" + F][1] + 0.12, q.feet["t" + F][2]], `+${ms}`, "#e8f5ee", 9); } }
      const q0 = rec[LT.k], tg = q0 && q0.d11 && q0.d11.tgt && q0.d11.tgt[F]; if (tg) { const c = [tg[0], 0.012, -tg[1]], ring = []; for (let t = 0; t <= 24; t++) ring.push([c[0] + 0.09 * Math.cos(t / 24 * 6.283), 0.012, c[2] + 0.09 * Math.sin(t / 24 * 6.283)]); line(ring, "#7df9ff", 1.8); text([c[0], 0.05, c[2]], "TURN-1.2 landing", "#7df9ff", 9); }
      const v = LT.executed.v, p0 = LT.ball; line([[p0[0], p0[1], p0[2]], [p0[0] + v[0] * 0.12, p0[1] + v[1] * 0.12, p0[2] + v[2] * 0.12]], "#ffd45e", 2.4);
      if (i - LT.k >= 0) text([p0[0], 0.78, p0[2]], `authoritative impulse · ${LT.role || "touch"} · ${F} ${LT.reg} · launch ${LT.executed.speed.toFixed(1)} m/s · follow-through ${LT.caft ? `yield ${LT.caft.iy.toFixed(2)} / arc ${LT.caft.ia.toFixed(2)}` : "–"} · min clearance ${LT.minClear != null && isFinite(LT.minClear) ? (LT.minClear * 1000).toFixed(0) + " mm" : "–"}`, "#ffe9a8", 10); }
    // DRIBBLE-1.2 — CUT CONTACT GEOMETRY: inside (cyan) / outside (orange) striking surfaces of both boots with their outward direction; the selected
    // contact (yellow ring) with its impulse normal; the next touch's target with the corridor it was aimed at (ring = inscribed margin; green: a
    // decisive / next window, violet: a SET-UP TARGET REGION) and the plan's role; a set-up's planned decisive contact
    if (Vv.geo !== false) {
      const sf = r.d12 && r.d12.surf; if (sf) for (const F of ["R", "L"]) for (const [reg, col] of [["INSIDE", "#5ff2ff"], ["OUTSIDE", "#ffa64d"]]) { const q = sf[F] && sf[F][reg]; if (!q) continue; const [p, n] = q; dot(p, 2.6, col); line([p, [p[0] + n[0] * 0.09, p[1] + n[1] * 0.09, p[2] + n[2] * 0.09]], col, 1.6); }
      if (r.plan && r.plan.viz && r.plan.viz.n) { const z = r.plan.viz, c = z.contact, rcol = z.role === "setup" ? "#c58bff" : "#7dff9b";
        if (c) { dot(c, 5, "#ffd45e", true); const nn = z.nImp || z.n; line([c, [c[0] + nn[0] * 0.35, c[1] + nn[1] * 0.35, c[2] + nn[2] * 0.35]], "#ffd45e", 2.0, [5, 3]); }
        if (z.target) { const tq = z.target, m = z.corr ? Math.max(0.02, z.corr.margin) : 0.05, ring = []; for (let a = 0; a <= 32; a++) ring.push([tq[0] + m * Math.cos(a / 32 * 6.283), 0.015, tq[2] + m * Math.sin(a / 32 * 6.283)]);
          line(ring, rcol, 2.0); dot([tq[0], 0.015, tq[2]], 3, rcol);
          text([tq[0], 0.30, tq[2]], `${z.role === "setup" ? "SET-UP TARGET REGION" : "next window"}${z.corr ? ` · ${z.corr.F} ${z.corr.reg} corridor ±${(z.corr.margin * 100).toFixed(0)} cm @${(z.corr.k * DT).toFixed(2)}s` : ""}`, rcol, 10); }
        text([z.ball[0], 0.62, z.ball[2]], `${z.role.toUpperCase()} · ${(Math.atan2(-z.n[2], z.n[0]) * 180 / Math.PI).toFixed(0)}° ${z.speed != null ? z.speed.toFixed(1) + " m/s" : ""}${z.dec ? ` · decisive ${z.dec.F} ${z.dec.reg} ${(z.dec.dir * 180 / Math.PI).toFixed(0)}° @${(z.dec.kc * DT).toFixed(2)}s` : ""}`, "#ffd45e", 10);
        // DRIBBLE-1.5: the set-up's validation against the physical ball future — where BALL-PHYS predicts the ball around the decisive tick for the
        // planned launch (large violet) and for the execution envelope (green: the decisive foot can still meet it, red: it cannot)
        if (z.setupEnv) { let nom = null; for (const e of z.setupEnv) { if (!e.p) continue; if (e.tag === "nominal") { nom = e; dot([e.p[0], 0.02, e.p[2]], 6, "#c58bff", true); } else dot([e.p[0], 0.02, e.p[2]], 3.2, e.exists ? "#7dff9b" : "#ff6a6a", true); }
          if (nom) text([nom.p[0], 0.42, nom.p[2]], `BALL-PHYS prediction at the decisive (planned launch; ±1.5σ execution: ${z.setupEnv.filter((e) => e.tag !== "nominal" && e.exists).length}/${z.setupEnv.length - 1} reachable)`, "#c58bff", 10); } }
    }
    for (const c of S.contacts) { if (c.k > i || i - c.k > 240 || c.striking) continue; const q = rec[c.k]; if (q) { const p = K2A(q.ball.p); dot(p, 6, c.own ? "rgba(255,160,40,0.9)" : "rgba(255,40,40,0.95)", true); if (i - c.k < 140) text([p[0], 0.5, p[2]], (c.own ? "own " : "OPPONENT ") + c.part, "#ff9a7a"); } }
  }
  if (Vv.labels && (vw.id === "game" || Vv.single)) {
    const D = 180 / Math.PI, sp = Math.hypot(r.V[0], r.V[1]), bs = Math.hypot(r.ball.v[0], r.ball.v[2]), dx = r.ball.p[0] - r.P[0], dy = r.ball.p[2] - r.P[1];
    const tl = (S.turnLog || []).filter((e) => e.k <= i && (e.kind === "stage" || e.kind === "release")).pop(), last = [...S.touches].reverse().find(T => T.k <= i), lt = (tl ? `${tl.kind === "stage" ? "staged turn" : "turn released"} @${(tl.k * DT).toFixed(2)} s (tick ${tl.k}) · ` : "") + (last ? `last touch ${last.F} ${last.reg} ${(i - last.k) * DT < 1 ? (i - last.k) * DT < 0.02 ? "NOW" : ((i - last.k) * DT).toFixed(2) + " s ago" : ""}` : "");
    ctx.font = `600 ${12 * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(vw.x * dpr, (vw.y + vw.h - 40) * dpr, vw.w * dpr, 40 * dpr); ctx.fillStyle = "rgba(235,242,238,0.95)";
    ctx.fillText(`RECEIVE-CONTROL-1${Vv.ovr ? " · DIAGNOSTIC OVERRIDE " + Vv.ovr : ""} · ${Vv.scn.label} · ${Vv.arch === "B" ? "B resolved" : Vv.arch === "C" ? "C hybrid" : "A pure physical"} · ${PROFILES[Vv.prof].name} · seed ${Vv.seed}`, (vw.x + 10) * dpr, (vw.y + vw.h - 24) * dpr);
    ctx.fillStyle = COL[r.ctrl] || "#fff"; ctx.fillText(`t ${r.t.toFixed(2)} s · player ${sp.toFixed(1)} m/s · ball ${bs.toFixed(1)} m/s · separation ${Math.hypot(dx, dy).toFixed(2)} m · ${r.ctrl}${r.held ? " · cut held for the touch" : ""} · ${lt}${r.p13 ? ` · planner ${r.p13.job ? "searching (tick " + r.p13.job.ticks + ")" : "idle"} ${(r.p13.wu / 1000).toFixed(1)} / ${(r.p13.budget / 1000).toFixed(0)} ms` : ""}`, (vw.x + 10) * dpr, (vw.y + vw.h - 8) * dpr);
    ctx.fillStyle = "rgba(230,240,235,0.85)"; ctx.font = `600 ${11 * dpr}px -apple-system, Helvetica`; ctx.fillText(vw.id === "game" ? "TOUCHLINE GAMEPLAY CAMERA · 1×" : "", (vw.x + 8) * dpr, (vw.y + 16) * dpr);
  } else if (Vv.labels) { ctx.font = `600 ${11 * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(230,240,235,0.85)"; ctx.fillText(vw.id === "A" ? Vv.A : vw.id === "B" ? Vv.B : vw.id, (vw.x + 8) * dpr, (vw.y + 16) * dpr); }
  // RECEIVE-CONTROL-1: the passer (where the pass came from), the requested exit (arrow from the receiver, until the first touch + 1 s), the
  // classification, and the first touch
  if (Vv.labels !== false) { const rc = S.rc, f = rc.first, D = 180 / Math.PI;
    if (rc.pass && rc.pass.origin) { const o = rc.pass.origin; dot([o[0], 0.02, -o[1]], 6, "#9fd3ff", true); text([o[0], 0.4, -o[1]], "passer", "#9fd3ff", 10); }
    if (!f || i <= f.k + 240) { const ex = rc.exitDir, L = 2.2; line([[r.P[0], 0.03, -r.P[1]], [r.P[0] + Math.cos(ex) * L, 0.03, -(r.P[1] + Math.sin(ex) * L)]], "rgba(255,212,94,0.9)", 3.0, [8, 5]);
      text([r.P[0] + Math.cos(ex) * L, 0.2, -(r.P[1] + Math.sin(ex) * L)], `exit · receiveTurnAngle ${rc.cls ? rc.cls.deg360.toFixed(0) : "?"}° (${rc.cls ? rc.cls.kind : "?"})`, "#ffd45e", 11); }
    if (f && i >= f.k && i - f.k < 360) { const T = S.touches.find((x) => x.k === f.k); if (T) text([T.ball[0], 1.0, T.ball[2]], `FIRST TOUCH ${f.F} ${f.reg} · ${f.role} · ball ${f.speedIn.toFixed(1)} → ${f.speedOut.toFixed(1)} m/s · ${f.dirOutRel.toFixed(0)}° (exit error ${f.exitErrDeg.toFixed(0)}°) · body turned ${f.facingAtContact.toFixed(0)}°`, "#ffffff", 11); }
    if (rc.chase != null && i >= rc.chase) text([r.P[0], 1.3, -r.P[1]], "pass went by — chasing", "#ff9a7a", 11); }
  ctx.restore();
}
function hud() { const el = document.getElementById("hud"); if (!el || !Vv.rec) return; const { r } = frameAt(Vv.t), S = Vv.S;
  const rc = S.rc, f = rc.first; el.textContent = `RECEIVE ${Vv.cs.id} · pass ${rc.pass.speed} m/s from ${rc.pass.from}° at ${rc.pass.dist} m (arrival ${rc.pass.vArr} m/s @${rc.pass.T} s) · receiveTurnAngle ${rc.cls ? rc.cls.deg360.toFixed(1) + "° → " + rc.cls.kind : "?"} · first touch ${f ? `${f.t.toFixed(2)} s ${f.F} ${f.reg} ${f.role}` : "none"} · phase ${rc.phase}\n` + `t ${r.t.toFixed(3)}  touches ${S.touches.filter(T => T.launched).length}  contacts ${S.contacts.length}  control changes ${S.ctrl.changes.map(c => c.t.toFixed(2) + " " + c.to).join(", ") || "—"}\n` +
    (S.yields && S.yields.length ? `pinched ball: the leg yielded ${S.yields.length}× (${S.yields.map(y => y.t.toFixed(2) + " s").join(", ")})\n` : "") + (S.fault ? `BALL KERNEL FAULT at ${S.fault.t.toFixed(3)} s ("${S.fault.message}") — the run ends here\n` : "") + `simulated in ${Vv.simMs.toFixed(0)} ms (${(Vv.simMs / Vv.dur / 10).toFixed(1)} % of real time) · fingerprint ${Vv.hash} · ball ${BALL_DEFAULT.id}`; }
function frame(now) { if (Vv.lastT == null) Vv.lastT = now; const dt = Math.min(0.05, (now - Vv.lastT) / 1000); Vv.lastT = now;
  if (Vv.playing) { Vv.t += dt * Vv.rate; if (Vv.t > Vv.dur) Vv.t = 0; } render(); hud(); if (!Vv.external) requestAnimationFrame(frame); }
async function boot() {
  const q = new URLSearchParams(location.search);
  Vv.cv = document.getElementById("gl"); Vv.ovc = document.getElementById("ov"); Vv.ov2d = Vv.ovc.getContext("2d");
  const gl = Vv.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { document.body.textContent = "WebGL2 unavailable"; return; }
  Vv.gl = gl; Vv.R = { gl }; Vv.ground = groundProg(gl); Vv.ball = ballProg(gl);
  if (q.get("diag") === "1") Vv.diag = true; if (q.get("ft") === "0") Vv.ft = false; if (q.get("geo") === "0") Vv.geo = false; if (q.get("labels") === "0") Vv.labels = false; if (q.get("single")) Vv.single = q.get("single"); if (q.get("rate")) Vv.rate = +q.get("rate"); if (q.get("zoom")) Vv.zoom = +q.get("zoom"); if (q.get("A")) Vv.A = q.get("A"); if (q.get("B")) Vv.B = q.get("B");
  Vv.camX = (r) => r.P[0];
  const sel = document.getElementById("selScn"); sel.innerHTML = VISUAL.map(s => `<option value="${s.id}">${s.tag} · ${s.id}</option>`).join(""); sel.value = q.get("case") || VISUAL[0].id;
  const sp = document.getElementById("selProf"); sp.innerHTML = Object.entries(PROFILES).map(([k, p]) => `<option value="${k}">${k} · ${p.name} (${p.preferred_foot}, wf ${p.weak_foot})</option>`).join(""); sp.value = q.get("prof") || "HIGH";
  const sa = document.getElementById("selArch"); sa.value = q.get("arch") || "B";
  const go = (k, v) => { const u = new URL(location.href); u.searchParams.set(k, v); location.href = u.toString(); };
  sel.onchange = (e) => go("case", e.target.value); sp.onchange = (e) => go("prof", e.target.value); sa.onchange = (e) => go("arch", e.target.value);
  document.querySelectorAll("[data-rate]").forEach(b => b.onclick = () => { Vv.rate = +b.dataset.rate; document.querySelectorAll("[data-rate]").forEach(x => x.classList.toggle("on", x === b)); });
  const bp = document.getElementById("bPlay"); bp.onclick = () => { Vv.playing = !Vv.playing; bp.textContent = Vv.playing ? "❚❚ Pause" : "▶ Play"; };
  const cd = document.getElementById("cDiag"); cd.checked = Vv.diag; cd.onchange = () => { Vv.diag = cd.checked; };
  window.addEventListener("keydown", (e) => { if (e.key === " ") { Vv.playing = !Vv.playing; e.preventDefault(); } if (e.key === ".") { Vv.playing = false; Vv.t += 1 / 60; } if (e.key === ",") { Vv.playing = false; Vv.t = Math.max(0, Vv.t - 1 / 60); } if (e.key === "r") Vv.t = 0; });
  const ent = await W.ofCharLoad(q.get("char") || "vinicius"); Vv.ent = ent;
  await simulate(ent); Vv.ready = true; if (q.get("t")) Vv.t = +q.get("t"); if (q.get("paused") === "1") Vv.playing = false;
  if (q.get("external") === "1") { Vv.external = true; render(); hud(); } else requestAnimationFrame(frame);
}
W.D1V = { state: Vv, set(t, o) { if (o) Object.assign(Vv, o); Vv.t = t; render(); hud(); return true; } };
boot().catch((err) => { const h = document.getElementById("hud"); if (h) h.textContent = "RECEIVE-CONTROL-1 lab failed: " + (err && err.stack || err); console.error(err); });
