// ═══ possess1/p_lab.js — TOUCHLINE — SHARED POSSESSION + REACTION V1 REVIEW ═══════════════════════════════════════════════════════════════════════
// Each case is simulated under every mode (OLD · SHARED NO REACTION · SHORT · MEDIUM · LONG) from identical inputs; each mode's bodies are posed at
// every tick of its clip in order when it is first shown — playback, frame stepping and slow motion only look poses up. Side by side: OLD | the
// selected mode, or all five. The timeline: one lane per mode shown — the ball's authority over time, the contacts, the touches made blind, the
// moments each player perceives, the transitions. LOCAL ONLY (real players' models).
import { DT, DEG } from "../vocab2/c_sim.js";
import { PlayBody } from "../vocab2/u_body.js";
import { TK } from "../tackle1/t_tackle.js";
import { PCASES } from "./p_cases.js";
import { runMode, modeReport, outcomeOf, MODE_LIST, MODE_LABEL } from "./p_run.js";
import { overlapOf } from "./p_overlap.js";
const W = window, hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x), $ = (id) => document.getElementById(id);
const L = { ready: false, cases: PCASES, done: new Map(), cur: null, mode: "MEDIUM", layout: "2", t: 0, playing: false, rate: 1, loop: false, cam: "gameplay", ball: true, body: false, skel: false, diag: true, beliefs: true, last: null };
const COL = { ATT: "#8fd3ff", DEF: "#ff9e7a", FREE: "#4c5852", CONT: "#ffd45e", DUAL: "#ff4fd8", ok: "#8dffa6", bad: "#ff8a80" };
const SHORT = { MISS: "MISS", "CONTACT — ATTACKER RETAINS": "RETAINS", "CONTACT — ATTACKER RECOVERS": "ATT", "CONTACT — DEFENDER RECOVERS": "DEF", "CONTACT — BALL FREE": "FREE" };
const MODE_TAG = { OLD: "OLD", NONE: "NONE", SHORT: "S", MEDIUM: "M", LONG: "L" };
// ── GL (the Tackling Lab's programs: ground, ball, the character with a kit tint) ──────────────────────────────────────────────────────────────
function persp(f, a, n, fa) { const m = new Float32Array(16); m[0] = f / a; m[5] = f; m[10] = -(fa + n) / (fa - n); m[11] = -1; m[14] = -2 * fa * n / (fa - n); return m; }
function lookAt(eye, at, up) { const fz = V3.norm(V3.sub(eye, at)), fx = V3.norm(V3.cross(fz, up)), fy = V3.cross(fx, fz), m = M4.ident();
  m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2]; m[12] = -V3.dot(fx, eye); m[13] = -V3.dot(fy, eye); m[14] = -V3.dot(fz, eye); return m; }
function shader(gl, t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
function groundProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW; void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[8]; uniform int uNSh; out vec4 o;
  float grid(vec2 p, float s, float w){ vec2 q = abs(fract(p / s + 0.5) - 0.5) * s; float d = min(q.x, q.y); float aa = max(fwidth(d), 1e-4); return 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, d); }
  void main(){ vec2 p = vec2(vW.x, -vW.z); float stripe = mod(floor(p.x / 5.25), 2.0); vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe);
    float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453); g *= 0.97 + 0.06 * n; float fade = 1.0 - smoothstep(0.05, 0.16, length(fwidth(p)));
    g = mix(g, g * 1.10 + 0.015, grid(p, 1.0, 0.018) * 0.55 * fade); float sh = 0.0; for (int i = 0; i < 8; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    o = vec4(g * (1.0 - min(0.6, sh)), 1.0); }`;
  const p = program(gl, VS, FS), vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-200, 200, 320, 200, -200, -270, 320, -270]), gl.STATIC_DRAW); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
  return { p, vao, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), sh: gl.getUniformLocation(p, "uSh"), nsh: gl.getUniformLocation(p, "uNSh") } }; }
function ballProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec3 aP; uniform mat4 uView, uProj; uniform vec3 uC; uniform vec4 uQ; uniform float uR; out vec3 vL; out vec3 vN;
  vec3 rot(vec4 q, vec3 v){ vec3 t = 2.0 * cross(q.xyz, v); return v + q.w * t + cross(q.xyz, t); }
  void main(){ vL = aP; vN = rot(uQ, aP); gl_Position = uProj * (uView * vec4(uC + uR * vN, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vL; in vec3 vN; out vec4 o;
  void main(){ vec3 n = normalize(vL); const float P = 1.6180339887; vec3 c[6] = vec3[6](vec3(0,1,P), vec3(0,-1,P), vec3(1,P,0), vec3(-1,P,0), vec3(P,0,1), vec3(P,0,-1));
    float m = 0.0; for (int i = 0; i < 6; i++) { vec3 a = normalize(c[i]); m = max(m, abs(dot(n, a))); } float dark = smoothstep(0.928, 0.936, m); vec3 base = mix(vec3(0.95, 0.94, 0.90), vec3(0.11, 0.13, 0.14), dark);
    float l = 0.45 + 0.55 * max(0.0, dot(normalize(vN), normalize(vec3(0.35, 0.9, 0.25)))); o = vec4(base * l, 1.0); }`;
  const p = program(gl, VS, FS), pts = [], idx = [], NU = 28, NV = 16;
  for (let j = 0; j <= NV; j++) { const v = Math.PI * j / NV; for (let i = 0; i <= NU; i++) { const u = 2 * Math.PI * i / NU; pts.push(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)); } }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); gl.bindVertexArray(null);
  const U = (n) => gl.getUniformLocation(p, n); return { p, vao, n: idx.length, u: { view: U("uView"), proj: U("uProj"), c: U("uC"), q: U("uQ"), r: U("uR") } }; }
function charProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv; layout(location=3) in vec3 aCol; layout(location=4) in uint aCls; layout(location=5) in uvec4 aJ; layout(location=6) in vec4 aW;
  uniform mat4 uView, uProj; uniform mat4 uBones[23]; out vec3 vN; out vec2 vUv; out vec3 vCol; flat out uint vCls;
  void main(){ mat4 sk = aW.x*uBones[aJ.x] + aW.y*uBones[aJ.y] + aW.z*uBones[aJ.z] + aW.w*uBones[aJ.w]; vec4 wp = sk * vec4(aPos,1.0); vN = normalize(mat3(sk)*aNrm); vUv = aUv; vCol = aCol; vCls = aCls; gl_Position = uProj * (uView * wp); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vN; in vec2 vUv; in vec3 vCol; flat in uint vCls; uniform sampler2D uAtlas; uniform vec3 uLight, uSkinBase, uSkinShadow, uSkinLight, uTint; uniform float uAlpha;
  layout(location=0) out vec4 oColor;
  float ss(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0.0, 1.0); return t*t*(3.0-2.0*t); }
  void main(){ vec3 n = normalize(vN); float ndl = max(0.0, dot(n, normalize(uLight))); float hemi = 0.45 + 0.55*max(0.0, n.y); float lum = 0.12 + 0.72*ndl + 0.16*hemi;
    float tone = 0.24 + 0.36*ss(0.25,0.48,lum) + 0.36*ss(0.57,0.85,lum); bool textured = (vCls & 1u) == 1u; uint shade = vCls >> 1u; vec3 c = textured ? texture(uAtlas, vUv).rgb * 255.0 : vCol;
    if (shade == 2u) { c *= (0.62 + 0.48*lum); if (textured) c *= uTint; }
    else if (shade == 1u) { vec3 shadow = uSkinShadow*0.76 + c*0.24; c = tone < 0.82 ? shadow + (c-shadow)*min(1.0, tone/0.82) : c + (uSkinLight-uSkinBase)*(tone-0.82)*2.0; }
    else { float f = (shade == 3u) ? (0.75 + tone*0.28) : (0.52 + tone*0.60); c = c*f + vec3(0.0, 0.0, (1.0-tone)*4.0); if (textured) c *= uTint; }
    oColor = vec4(clamp(c/255.0, 0.0, 1.0), uAlpha); }`;
  const p = program(gl, VS, FS), U = (n) => gl.getUniformLocation(p, n);
  return { p, u: { view: U("uView"), proj: U("uProj"), bones: U("uBones"), atlas: U("uAtlas"), light: U("uLight"), skinBase: U("uSkinBase"), skinShadow: U("uSkinShadow"), skinLight: U("uSkinLight"), tint: U("uTint"), alpha: U("uAlpha") } }; }
function drawChar(skin, view, proj, tint) { const gl = L.gl, P = L.charP, G = W.ofCharBuffers(L.R, L.ent); gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.view, false, view); gl.uniformMatrix4fv(P.u.proj, false, proj); gl.uniformMatrix4fv(P.u.bones, false, skin);
  gl.uniform3fv(P.u.light, L.ent.rig.shading.light); gl.uniform3fv(P.u.skinBase, G.skinBase); gl.uniform3fv(P.u.skinShadow, G.skinShadow); gl.uniform3fv(P.u.skinLight, G.skinLight); gl.uniform3fv(P.u.tint, tint); gl.uniform1f(P.u.alpha, 1);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.tex); gl.uniform1i(P.u.atlas, 0); const pf = gl.getParameter(gl.FRONT_FACE); gl.frontFace(gl.CW); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.bindVertexArray(G.vao); gl.drawElements(gl.TRIANGLES, G.count, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null); gl.frontFace(pf); gl.disable(gl.CULL_FACE); }
const A3 = (p, h) => [p[0], h != null ? h : (p[2] || 0), -p[1]], QA = (q) => [-q[0], -q[1], q[2], q[3]];
const DEF_TINT = [1.05, 0.42, 0.36], ATT_TINT = [1, 1, 1];
// ═══ A CASE: every mode simulated (the record per tick: the beliefs, the possession views); the bodies posed per mode when first shown ════════
function simMode(tc, m, o = {}) { const c0 = performance.now(), ticks = [], r = runMode(L.env, tc, m, { tackle: o.tackle, onTick: (Wd) => {
    if (Wd.auth) { const bel = Wd.players.map((p) => { const G = p.o.ballOn !== false ? p.pc.belief : null; return G ? [G.p[0], G.p[1]] : null; }), cont = Wd.players.map((p) => (p.o.ballOn !== false && p.poss.cont ? (p.poss.cont.ok ? "✓ " : "✗ ") + p.poss.cont.why : null)), on = Wd.players.map((p) => p.o.ballOn !== false);
      ticks.push({ k: Wd.k, bel, cont, on, lab: Wd.auth.label, claims: Wd.auth.claims }); }
    else ticks.push({ k: Math.round(Wd.t / DT), pa: Wd.att.poss.state, pd: Wd.def.o.ballOn === false ? "OFF" : Wd.def.poss.state }); } });
  const rep = modeReport(r.W, r.t0), R = { m, r, W: r.W, rep, out: outcomeOf(r.W), ticks: new Map(ticks.map((x) => [x.k, x])), ms: performance.now() - c0, F: null };
  R.k0 = Math.round(r.clip[0] / DT); R.k1 = Math.round(r.clip[1] / DT); return R; }
function poseMode(R) { if (R.F) return; const bA = new PlayBody(L.env, R.W.att), bD = new PlayBody(L.env, R.W.def), F = [];
  for (let k = R.k0; k <= R.k1; k++) { const t = k * DT, pa = bA.pose(t), pd = bD.pose(t); F.push({ t, a: { skin: pa.skin, J: pa.J, P: pa.P }, d: { skin: pd.skin, J: pd.J, P: pd.P }, ball: R.W.auth ? R.W.trueTrack(t) : R.W.att.ballTrack(t), pen: overlapOf(pa.J, pd.J) }); } R.F = F; }
function simulate(tc, o = {}) { const runs = {}; for (const m of MODE_LIST) runs[m] = simMode(tc, m, o); return { tc, runs, t0: runs.OLD.r.t0, clip: [Math.min(...MODE_LIST.map((m) => runs[m].r.clip[0])), Math.max(...MODE_LIST.map((m) => runs[m].r.clip[1]))], tackle: o.tackle != null ? o.tackle : tc.tackle }; }
const shown = () => (L.layout === "1" ? [L.mode] : L.layout === "2" ? (L.mode === "OLD" ? ["OLD", "MEDIUM"] : ["OLD", L.mode]) : MODE_LIST);
function frameAt(R, t) { poseMode(R); const i = clamp(Math.round(t / DT) - R.k0, 0, R.F.length - 1); return R.F[i]; }
const rowText = (C) => MODE_LIST.map((m) => `${MODE_TAG[m]} ${C.runs[m].out ? SHORT[C.runs[m].out.kind] || C.runs[m].out.kind : "—"}`).join(" · ");
// ── the case list ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function buildList() { const box = $("cases"); box.innerHTML = ""; let g = null;
  for (const tc of L.cases) { if (tc.group !== g) { g = tc.group; const h = document.createElement("h3"); h.textContent = g; box.appendChild(h); }
    const b = document.createElement("button"); b.className = "c"; b.dataset.id = tc.id; b.innerHTML = `${tc.name}<span class="o" id="o_${tc.id}">${L.done.has(tc.id) ? rowText(L.done.get(tc.id)) : "…"}</span>`; b.onclick = () => select(tc.id); box.appendChild(b); } }
function markList() { for (const b of document.querySelectorAll("#cases .c")) b.classList.toggle("on", L.cur && b.dataset.id === L.cur.tc.id); }
function select(id, o = {}) { const tc = L.cases.find((x) => x.id === id); if (!tc) return; const key = id + (o.tackle != null ? "@" + o.tackle.join(",") : "");
  let C = L.done.get(key); if (!C) { C = simulate(tc, o); L.done.set(key, C); } L.cur = C; const el = $("o_" + id); if (el && o.tackle == null) el.textContent = rowText(C);
  L.t = C.clip[0]; L.playing = !o.paused; markList(); writeDiag(); drawTimeline(); try { history.replaceState(null, "", `?case=${id}&mode=${L.mode}&layout=${L.layout}&cam=${L.cam}`); } catch (e) {} }
// ═══ THE VIEWS ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function rects(w, h) { const n = shown().length; if (n === 1) return [[0, 0, w, h]]; if (n === 2) return [[0, 0, w / 2, h], [w / 2, 0, w / 2, h]];
  const cw = w / 3, ch = h / 2; return [0, 1, 2, 3, 4].map((i) => [(i % 3) * cw, Math.floor(i / 3) * ch, cw, ch]); }
// (the cameras: framed on both players of that run (their midpoint over the last 0.4 s), oriented by the defender's facing at commitment)
function camera(R, Fr, vw, vh) { const A = R.W.tk.act, psi = A ? A.entry.psi : R.r.enc.def.h, fw = [Math.cos(psi), Math.sin(psi)], rt = [-Math.sin(psi), Math.cos(psi)];
  const i1 = clamp(Math.round(L.t / DT) - R.k0, 0, R.F.length - 1), i0 = Math.max(0, i1 - 96); let m = [0, 0], n = 0; for (let i = i0; i <= i1; i += 8) { const f = R.F[i]; m[0] += f.a.P[0] + f.d.P[0]; m[1] += f.a.P[1] + f.d.P[1]; n += 2; } m = [m[0] / n, m[1] / n];
  const sep = hyp(Fr.a.P[0] - Fr.d.P[0], Fr.a.P[1] - Fr.d.P[1]), D = clamp(3.6 + 0.9 * sep, 4.2, 9.5), at = (a, l, h) => A3([m[0] + fw[0] * a + rt[0] * l, m[1] + fw[1] * a + rt[1] * l], h);
  let eye, tgt = A3(m, 0.75), up = [0, 1, 0], fov = 40;
  switch (L.cam) { case "front": eye = at(D, 0, 1.3); break; case "rear": eye = at(-D, 0, 1.5); break; case "sideL": eye = at(0, -D, 1.2); break; case "sideR": eye = at(0, D, 1.2); break;
    case "q3f": eye = at(D * 0.72, D * 0.72, 1.9); break; case "q3r": eye = at(-D * 0.72, -D * 0.72, 2.0); break; case "top": eye = A3(m, 9.0); up = [fw[0], 0, -fw[1]]; tgt = A3(m, 0); fov = 36; break;
    default: eye = A3([m[0], m[1] - 15.5], 8.2); tgt = A3(m, 0.4); fov = 26; }
  return { view: lookAt(eye, tgt, up), proj: persp(1 / Math.tan(fov / 2 * DEG), vw / vh, 0.1, 300) }; }
function proj3(c, p, x0, y0, w, h) { const v = M4.transformPoint(c.view, p), pr = c.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], ww = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (ww <= 1e-4) return null; return [x0 + (cx / ww * 0.5 + 0.5) * w, y0 + (0.5 - cy / ww * 0.5) * h]; }
function layoutDom() { const top = $("bar").getBoundingClientRect().height + "px"; $("stage").style.top = top; $("cases").style.top = top; $("diag").style.top = top; document.body.classList.toggle("diag", L.diag); }
function render() { const C = L.cur; if (!C) return; layoutDom(); const gl = L.gl, cv = $("gl"), ov = $("ov"), st = $("stage").getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(st.width * dpr), h = Math.round(st.height * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; ov.width = w; ov.height = h; cv.style.width = ov.style.width = st.width + "px"; cv.style.height = ov.style.height = st.height + "px"; }
  const x = ov.getContext("2d"); x.clearRect(0, 0, w, h); gl.enable(gl.SCISSOR_TEST); gl.clearColor(0.06, 0.08, 0.07, 1); gl.scissor(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const M = shown(), RS = rects(w, h);
  M.forEach((m, i) => { const R = C.runs[m], [rx, ry, rw, rh] = RS[i].map(Math.round), Fr = frameAt(R, L.t), c = camera(R, Fr, rw, rh), B = Fr.ball.p, showBall = L.ball && !L.body;
    gl.viewport(rx, h - ry - rh, rw, rh); gl.scissor(rx, h - ry - rh, rw, rh); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    const sh = new Float32Array(32); let ns = 0; const push = (a, b, s, al) => { sh.set([a, b, s, al], ns * 4); ns++; }; push(Fr.a.P[0], Fr.a.P[1], 0.42, 0.4); push(Fr.d.P[0], Fr.d.P[1], 0.42, 0.4); if (showBall) push(B[0], B[1], 0.12, 0.6);
    const G = L.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, c.view); gl.uniformMatrix4fv(G.u.proj, false, c.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    if (!L.skel) { drawChar(Fr.a.skin, c.view, c.proj, ATT_TINT); drawChar(Fr.d.skin, c.view, c.proj, DEF_TINT); }
    if (showBall) { const P = L.ballP; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.view, false, c.view); gl.uniformMatrix4fv(P.u.proj, false, c.proj); gl.uniform3fv(P.u.c, A3(B)); gl.uniform4fv(P.u.q, QA(Fr.ball.q)); gl.uniform1f(P.u.r, 0.11); gl.bindVertexArray(P.vao); gl.drawElements(gl.TRIANGLES, P.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); }
    const pr = (p) => proj3(c, A3(p, p[2]), rx, ry, rw, rh); x.save(); x.beginPath(); x.rect(rx, ry, rw, rh); x.clip();
    if (L.skel) for (const [J, col] of [[Fr.a.J, COL.ATT], [Fr.d.J, COL.DEF]]) { x.strokeStyle = col; x.lineWidth = 2.5 * dpr; for (const kk of Object.keys(J)) { const a = pr(J[kk].j), b = pr(J[kk].t); if (a && b) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); } } }
    if (L.diag && !L.body) overlays(x, pr, dpr, R, Fr);
    label(x, dpr, R, rx, ry, rw, rh, M.length > 1); if (M.length > 1) { x.strokeStyle = "#2a3530"; x.lineWidth = 2 * dpr; x.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2); } x.restore(); });
  gl.disable(gl.SCISSOR_TEST); }
// the authority / both possession views at t, as text
function authAt(R, t) { const k = Math.round(t / DT); if (!R.W.auth) { const x = R.ticks.get(k) || {}; return { text: `carrier ${x.pa || "—"} · defender ${x.pd === "OFF" ? "ball off" : x.pd || "—"}`, dual: x.pa === "CONTROLLED" && x.pd === "CONTROLLED" }; }
  const x = R.ticks.get(k); return { text: x ? x.lab : "—", lab: x ? x.lab : "", claims: x ? x.claims : [] }; }
function pendingAt(R, p, k) { return p.pc.log.filter((e) => e.k <= k && e.perceived > k); }
function knownAt(p, t) { const k = Math.round(t / DT), L2 = [...p.poss.log.map((e) => ({ t: e.t, s: e.to === "CONTROLLED" ? `CONTROLLED(${p.pid}) — his own` : "FREE" + (e.perceived ? " (perceived)" : " — his own exit") })), ...p.pc.log.filter((e) => e.type === "poss").map((e) => ({ t: e.perceived * DT, s: e.to + " (perceived)" }))].filter((e) => e.t <= t + 1e-9).sort((a, b) => a.t - b.t);
  return L2.length ? L2[L2.length - 1].s : "FREE (the start: not yet played)"; }
const evText = (e) => (e.type === "poss" ? `the ball → ${e.to}` : `${e.by}'s ${e.kind}`);
function label(x, dpr, R, rx, ry, rw, rh, multi) { const t = L.t, k = Math.round(t / DT), A = authAt(R, t), f = (s, n = 12) => `${n * dpr}px ${s}`;
  const lines = [[MODE_LABEL[R.m], "#ffd45e", 700], [A.dual ? "DUAL TRUTH — both models CONTROLLED" : A.text, A.dual ? COL.DUAL : A.lab && A.lab.includes("ATT") ? COL.ATT : A.lab && A.lab.includes("DEF") ? COL.DEF : A.lab && A.lab.includes("CONTESTED") ? COL.CONT : "#cfd8d3", 600]];
  if (R.W.auth) for (const p of R.W.players) { const P = pendingAt(R, p, k); lines.push([`${p.pid} ${P.length ? `REACTING · perceives in ${((P[0].perceived - k) * DT).toFixed(3)} s` : "knowledge current"}`, P.length ? "#ffb36b" : "#8fa49a", 500]); }
  else lines.push(["the carrier re-plans in the contact tick", "#8fa49a", 500]);
  { const Fr = frameAt(R, t); if (Fr.pen > 0.03) lines.push([`BODIES OVERLAP ${(Fr.pen * 100).toFixed(0)} cm — no player collision yet`, "#ff8a80", 500]); }
  if (!L.diag && !multi) return; let y = ry + 8 * dpr; x.textBaseline = "top";
  const bw = Math.max(...lines.map(([s, , wt]) => { x.font = `${wt} ${f("-apple-system, Helvetica, sans-serif", wt === 700 ? 13 : 11.5)}`; return x.measureText(s).width; })) + 14 * dpr;
  x.fillStyle = "rgba(13,18,16,0.78)"; x.fillRect(rx + 8 * dpr, y - 4 * dpr, bw, lines.length * 16 * dpr + 6 * dpr);
  for (const [s, col, wt] of lines) { x.font = `${wt} ${f("-apple-system, Helvetica, sans-serif", wt === 700 ? 13 : 11.5)}`; x.fillStyle = col; x.fillText(s, rx + 15 * dpr, y); y += 16 * dpr; } }
function overlays(x, pr, dpr, R, Fr) { const t = L.t, k = Math.round(t / DT), A = R.W.tk.act;
  // the boot's contact spheres through the window; the contacts (in → out); THE BELIEFS (where a player who has not yet perceived plans the ball)
  if (A && t >= A.tW0 - 1e-9 && t <= A.tW1 + 1e-9) for (const s of R.W.tk.spheresAt(Math.round(t / DT) * DT)) { const a = pr(s.p), b = pr([s.p[0] + TK.r, s.p[1], s.p[2]]); if (!a || !b) continue; x.strokeStyle = s.surf === "TOE" ? "rgba(255,212,94,0.95)" : "rgba(255,255,255,0.7)"; x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(a[0], a[1], Math.max(2, hyp(b[0] - a[0], b[1] - a[1])), 0, 2 * Math.PI); x.stroke(); }
  const CL = R.W.auth ? R.W.contactLog : A ? A.hits.map((h) => ({ t: h.t, at: h.at, vIn: h.vIn, vOut: h.vOut, by: "DEF", kind: "tackle" })) : [];
  for (const c of CL) if (t >= c.t - 1e-9 && t <= c.t + 0.4) { const p = pr([c.at[0], c.at[1], 0.11]); if (!p) continue; const col = c.by === "DEF" ? COL.DEF : COL.ATT; x.fillStyle = col; x.beginPath(); x.arc(p[0], p[1], 4.5 * dpr, 0, 2 * Math.PI); x.fill();
    const q = pr([c.at[0] + c.vOut[0] * 0.15, c.at[1] + c.vOut[1] * 0.15, 0.11]); if (q) { x.strokeStyle = col; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke(); }
    x.fillStyle = "#f2f6f3"; x.font = `${10.5 * dpr}px Menlo`; x.fillText(`${c.by} ${c.kind}`, p[0] + 8 * dpr, p[1] + 12 * dpr); }
  if (R.W.auth && L.beliefs) { const T = R.ticks.get(k); if (T) T.bel.forEach((b, i) => { if (!b) return; const pid = R.W.players[i].pid, p = pr([b[0], b[1], 0.11]), e = pr([b[0] + 0.11, b[1], 0.11]); if (!p || !e) return; x.strokeStyle = pid === "ATT" ? COL.ATT : COL.DEF; x.setLineDash([4 * dpr, 3 * dpr]); x.lineWidth = 2 * dpr; x.beginPath(); x.arc(p[0], p[1], Math.max(5 * dpr, hyp(e[0] - p[0], e[1] - p[1])), 0, 2 * Math.PI); x.stroke(); x.setLineDash([]); x.fillStyle = x.strokeStyle; x.font = `${10.5 * dpr}px Menlo`; x.fillText(`${pid} still plans this ball`, p[0] + 10 * dpr, p[1] - 8 * dpr); }); } }
// ═══ THE DIAGNOSTICS (the primary mode at the playhead + its record) ═══════════════════════════════════════════════════════════════════════════
function nextPlanned(p, t) { const P = p.planAt(t), c = P.contacts.filter((q) => q.t > t + 1e-9).sort((a, b) => a.t - b.t)[0]; return c ? `${c.role} ${c.F} in ${(c.t - t).toFixed(3)} s` : "—"; }
function nextActual(R, pid, t) { const L2 = R.W.auth ? R.W.contactLog.filter((c) => c.by === pid && c.kind !== "tackle" && c.t > t + 1e-9) : (pid === "ATT" ? R.W.att.contacts : R.W.def.contacts).filter((c) => !c.missed && c.t > t + 1e-9); const c = L2[0]; return c ? `${c.role || c.kind} in ${(c.t - t).toFixed(3)} s` : "— (none in the replay)"; }
function writeDiag() { const C = L.cur, el = $("diag"); el.classList.toggle("hidden", !L.diag); if (!L.diag || !C) return; const R = C.runs[L.mode], Wd = R.W, t = L.t, k = Math.round(t / DT), t0 = C.t0, f = (x, n = 3) => (x == null ? "—" : (+x).toFixed(n)), rel = (x) => `${x - t0 >= 0 ? "+" : ""}${(x - t0).toFixed(3)}`;
  const lines = [`<b>${C.tc.name}</b>`, `<span class="k">attacker case: ${C.tc.c.tech} · ${C.tc.c.variant}${C.tc.c.pref === "L" ? " · left-footed" : ""} · tackle request ${(C.tackle || []).join(", ") || "none"} s · POKE (untuned)</span>`, "",
    `<b>MODE</b> ${MODE_LABEL[R.m]} · simulated in ${R.ms.toFixed(0)} ms`, `<b>OUTCOME</b> ${R.out ? R.out.kind : "— (no tackle committed)"}`, R.out ? `<span class="k">  ${R.out.why}</span>` : "", "", `<b>AT THE PLAYHEAD</b>  t ${rel(t)} s`];
  if (Wd.auth) { const A = authAt(R, t), tr = Wd.auth.log.filter((e) => e.to && e.t <= t + 1e-9).slice(-1)[0], cl = Wd.contactLog.filter((c) => c.t <= t + 1e-9).slice(-1)[0];
    lines.push(`BALL AUTHORITY  <b>${A.lab}</b>${tr ? ` since ${rel(tr.t)}` : ""}`, tr ? `  <span class="k">reason: ${tr.why}</span>` : "", A.claims && A.claims.length ? `  credible claims: ${A.claims.map((c) => `${c.who} touch in ${c.in.toFixed(2)} s`).join(" · ")}` : "",
      `LAST WORLD EVENT  ${cl ? `${rel(cl.t)} ${cl.by} ${cl.kind} (ball ${hyp(...cl.vIn).toFixed(1)} → ${hyp(...cl.vOut).toFixed(1)} m/s)` : "—"}`);
    const T = R.ticks.get(k);
    for (const [i, p] of Wd.players.entries()) { const P = pendingAt(R, p, k), sp = p.planAt(t);
      lines.push("", `<b>${p.pid === "ATT" ? "ATTACKER" : "DEFENDER"}</b>  ${T && T.on[i] ? "ball on (plans touches)" : "ball off"}${p.tk && p.tk.act && t >= p.tk.act.t0 && t < p.tk.act.tCtl ? " · TACKLE: " + p.tk.phaseAt(t) : ""}`,
        `  knowledge: ${P.length ? `<span class="bad">REACTING</span> — ${P.map((e) => `${evText(e)} at ${rel(e.k * DT)} → perceived ${rel(e.perceived * DT)}`).join("; ")}` : `<span class="ok">current</span>`}`,
        `  believes the ball is: ${knownAt(p, t)}`, `  plan: ${sp.action.label} <span class="k">(${sp.reason || ""})</span>`, `  next planned touch: ${nextPlanned(p, t)}`, `  actual next touch: ${nextActual(R, p.pid, t)}`,
        T && T.cont[i] ? `  continuation: ${T.cont[i]}` : ""); } }
  else { const A = authAt(R, t); lines.push(`POSSESSION (two independent models)  ${A.dual ? '<span class="bad">DUAL TRUTH</span> — ' : ""}${A.text}`);
    for (const p of [Wd.att, Wd.def]) { const sp = p.planAt(t); lines.push("", `<b>${p === Wd.att ? "ATTACKER" : "DEFENDER"}</b>  plan: ${sp.action.label} <span class="k">(${sp.reason || ""})</span>`, `  next planned touch: ${nextPlanned(p, t)}`, `  actual next touch: ${nextActual(R, p === Wd.att ? "ATT" : "DEF", t)}`); }
    const A0 = Wd.tk.act; if (A0 && A0.hits.length) { const kC = Math.round(A0.hits[0].t / DT), rp = Wd.att.plans.find((p) => Math.round(p.t0 / DT) === kC); lines.push("", `<b>WHY THE CARRIER GETS IT BACK</b>`, `  contact ${rel(A0.hits[0].t)} → his re-plan "${rp ? rp.reason : "?"}" in the SAME tick (${rp ? rp.action.label : "?"}), planned on the deflected ball`); } }
  { const Fr = frameAt(R, t); lines.push("", `BODIES  ${Fr.pen > 0.005 ? `<span class="bad">overlap ${(Fr.pen * 100).toFixed(1)} cm</span>` : "apart"} <span class="k">(no player–player collision exists: Milestone 3 — measured, never resolved)</span>`); }
  lines.push("", `<b>THE RECORD</b>`);
  if (Wd.auth) { for (const e of Wd.auth.log) if (e.to) lines.push(`  ${rel(e.t)} ${e.from} → <b>${e.to}</b> <span class="k">${e.why}</span>`); else if (e.note) lines.push(`  <span class="k">${rel(e.t)} ${e.note}</span>`);
    for (const d of Wd.auth.denied) lines.push(`  <span class="bad">${rel(d.t)} claim DENIED ${d.who}: ${d.why}</span>`);
    lines.push("", `<b>CONTACTS</b>`, ...Wd.contactLog.filter((c) => c.t >= t0 - 0.05).map((c) => `  ${rel(c.t)} ${c.by} ${c.kind}${c.role ? " · " + c.role : ""} (${hyp(...c.vIn).toFixed(1)} → ${hyp(...c.vOut).toFixed(1)} m/s)`));
    const blind = [Wd.att, Wd.def].flatMap((p) => p.contacts.filter((c) => c.blind).map((c) => `  ${rel(c.t)} ${p.pid} touch made blind: ${c.phys} (believed ball ${f(c.dBlind * 100, 0)} cm from the real one)`)); if (blind.length) lines.push(...blind);
    for (const p of Wd.players) { const P = p.pc.log.filter((e) => e.k * DT >= t0 - 0.05 && e.type === "contact"); if (P.length) lines.push("", `<b>${p.pid} PERCEIVED</b>`, ...P.map((e) => `  ${e.by}'s ${e.kind} at ${rel(e.k * DT)} → ${rel(e.perceived * DT)}`)); } }
  else lines.push(...Wd.att.poss.log.filter((e) => e.t >= t0 - 0.05).map((e) => `  ${rel(e.t)} carrier → ${e.to} (${e.why})`), ...(Wd.def.poss.log || []).map((e) => `  ${rel(e.t)} defender → ${e.to} (${e.why})`));
  el.innerHTML = lines.filter((s) => s !== "").join("\n"); }
// ═══ THE TIMELINE: one lane per mode shown ═══════════════════════════════════════════════════════════════════════════════════════════════════
function drawTimeline() { const C = L.cur; if (!C) return; const cv = $("tlc"), M = shown(), lh = 26; $("tl").style.height = (M.length * lh + 22) + "px"; $("stage").style.bottom = (M.length * lh + 22) + "px";
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const x = cv.getContext("2d"), [a, b] = C.clip, LW = 118 * dpr, X = (t) => LW + (t - a) / (b - a) * (cv.width - LW - 10 * dpr); x.fillStyle = "#151d19"; x.fillRect(0, 0, cv.width, cv.height);
  M.forEach((m, i) => { const R = C.runs[m], y = (4 + i * lh) * dpr, hh = (lh - 8) * dpr; x.fillStyle = m === L.mode ? "#ffd45e" : "#8fa49a"; x.font = `600 ${10.5 * dpr}px -apple-system, Helvetica, sans-serif`; x.textBaseline = "middle"; x.fillText(m === "OLD" ? "OLD" : m === "NONE" ? "SHARED · 0" : `SHARED · ${m}`, 6 * dpr, y + hh / 2);
    // the state band, per tick (merged runs of equal state)
    let s0 = null, c0 = null; const flush = (t1) => { if (s0 == null) return; x.fillStyle = c0; x.fillRect(X(s0), y, Math.max(1, X(t1) - X(s0)), hh); };
    for (let k = Math.round(a / DT); k <= Math.round(b / DT); k++) { const T = R.ticks.get(k); let col = COL.FREE; if (T) { if (R.W.auth) col = T.lab.includes("ATT") ? COL.ATT : T.lab.includes("DEF") ? COL.DEF : T.lab.includes("CONTESTED") ? COL.CONT : COL.FREE; else col = T.pa === "CONTROLLED" && T.pd === "CONTROLLED" ? COL.DUAL : T.pa === "CONTROLLED" ? COL.ATT : T.pd === "CONTROLLED" ? COL.DEF : COL.FREE; }
      if (col !== c0) { flush(k * DT); s0 = k * DT; c0 = col; } } flush(b);
    const mk = (t, col, h = 1, w = 2) => { if (t < a || t > b) return; x.fillStyle = col; x.fillRect(X(t) - w * dpr / 2, y - 2 * dpr, w * dpr, hh * h + 4 * dpr); };
    const A = R.W.tk.act; if (A) { x.fillStyle = "rgba(255,255,255,0.10)"; x.fillRect(X(A.t0), y + hh * 0.75, X(A.tCtl) - X(A.t0), hh * 0.25); }
    if (R.W.auth) { for (const c of R.W.contactLog) mk(c.t, c.kind === "tackle" ? "#ffffff" : c.by === "ATT" ? "#1d5a7a" : "#8a3b26", 1, c.kind === "tackle" ? 3 : 2);
      for (const p of R.W.players) for (const c of p.contacts) if (c.blind) { const xx = X(c.t), yy = y + hh / 2; x.strokeStyle = "#ffffff"; x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(xx, yy, 4 * dpr, 0, 2 * Math.PI); x.stroke(); if (c.phys && c.phys.startsWith("MISS")) { x.beginPath(); x.moveTo(xx - 3 * dpr, yy - 3 * dpr); x.lineTo(xx + 3 * dpr, yy + 3 * dpr); x.stroke(); } }
      for (const p of R.W.players) for (const e of p.pc.log) if (e.type === "contact" && e.perceived > e.k) { const xx = X(e.perceived * DT); x.fillStyle = p.pid === "ATT" ? COL.ATT : COL.DEF; x.beginPath(); x.moveTo(xx, y + hh); x.lineTo(xx - 4 * dpr, y + hh + 5 * dpr); x.lineTo(xx + 4 * dpr, y + hh + 5 * dpr); x.fill(); } }
    else { for (const c of R.W.att.contacts) if (!c.missed) mk(c.t, "#1d5a7a"); for (const c of R.W.def.contacts) if (!c.missed) mk(c.t, "#8a3b26"); if (A) for (const h of A.hits) mk(h.t, "#ffffff", 1, 3); } });
  x.fillStyle = "#8fa49a"; x.font = `${10 * dpr}px Menlo`; x.textBaseline = "bottom"; x.fillText("authority: carrier ▮  defender ▮  FREE ▮  CONTESTED ▮  dual truth ▮ · white = tackle contact · ○ blind touch (× missed) · ▲ perceived", LW, cv.height - 3 * dpr);
  x.strokeStyle = "#fff"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(X(L.t), 0); x.lineTo(X(L.t), cv.height - 14 * dpr); x.stroke(); }
// ── LOOP ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let diagT = 0;
function frame(now) { const dt = L.last != null ? Math.min(0.05, (now - L.last) / 1000) : 0; L.last = now; const C = L.cur;
  if (C && L.playing) { L.t += dt * L.rate; if (L.t >= C.clip[1]) { if (L.loop) L.t = C.clip[0]; else { L.t = C.clip[1]; L.playing = false; } } }
  render(); drawTimeline(); if (now - diagT > 120 || !L.playing) { writeDiag(); diagT = now; } $("bPlay").textContent = L.playing ? "❚❚ PAUSE" : "▶ PLAY"; if (!L.external) requestAnimationFrame(frame); }
function step(n) { const C = L.cur; L.playing = false; L.t = clamp(Math.round(L.t / DT + n) * DT, C.clip[0], C.clip[1]); }
function bindUI() {
  $("bPlay").onclick = () => { if (!L.playing && L.t >= L.cur.clip[1] - 1e-9) L.t = L.cur.clip[0]; L.playing = !L.playing; };
  $("bReplay").onclick = () => { L.t = L.cur.clip[0]; L.playing = true; }; $("bBack").onclick = () => step(-4); $("bFwd").onclick = () => step(4);
  $("bLoop").onclick = () => { L.loop = !L.loop; $("bLoop").classList.toggle("on", L.loop); };
  for (const b of document.querySelectorAll("[data-rate]")) b.onclick = () => { L.rate = +b.dataset.rate; for (const y of document.querySelectorAll("[data-rate]")) y.classList.toggle("on", y === b); };
  for (const b of document.querySelectorAll("[data-mode]")) b.onclick = () => setMode(b.dataset.mode);
  for (const b of document.querySelectorAll("[data-layout]")) b.onclick = () => setLayout(b.dataset.layout);
  $("selCam").onchange = (e) => { L.cam = e.target.value; };
  const tog = (id, k, after) => { $(id).onclick = () => { L[k] = !L[k]; $(id).classList.toggle("on", L[k]); if (after) after(); }; };
  tog("bBall", "ball"); tog("bBody", "body"); tog("bSkel", "skel"); tog("bDiag", "diag", writeDiag); tog("bBel", "beliefs");
  $("bTry").onclick = () => { const C = L.cur, t = +(L.t - C.t0).toFixed(4); select(C.tc.id, { tackle: [t], paused: true }); L.t = Math.max(L.cur.clip[0], L.cur.t0 + t - 0.3); };
  $("bNoTk").onclick = () => select(L.cur.tc.id, { tackle: [] });
  $("tlc").onclick = (e) => { const C = L.cur, r = e.target.getBoundingClientRect(), LW = 118, u = clamp((e.clientX - r.left - LW) / (r.width - LW - 10), 0, 1); L.t = Math.round((C.clip[0] + u * (C.clip[1] - C.clip[0])) / DT) * DT; L.playing = false; };
  window.addEventListener("keydown", (e) => { if (e.target.tagName === "SELECT") return; const k = e.key;
    if (k === " ") { e.preventDefault(); $("bPlay").onclick(); } else if (k === ",") step(e.shiftKey ? -1 : -4); else if (k === ".") step(e.shiftKey ? 1 : 4); else if (k === "t" || k === "T") $("bTry").onclick();
    else if (k === "b" || k === "B") $("bBall").onclick(); else if (k === "d" || k === "D") $("bDiag").onclick(); else if (k >= "1" && k <= "5") setMode(MODE_LIST[+k - 1]); }); window.addEventListener("resize", () => drawTimeline()); }
function setMode(m) { L.mode = m; for (const b of document.querySelectorAll("[data-mode]")) b.classList.toggle("on", b.dataset.mode === m); writeDiag(); drawTimeline(); if (L.cur) try { history.replaceState(null, "", `?case=${L.cur.tc.id}&mode=${L.mode}&layout=${L.layout}&cam=${L.cam}`); } catch (e) {} }
function setLayout(v) { L.layout = v; for (const b of document.querySelectorAll("[data-layout]")) b.classList.toggle("on", b.dataset.layout === v); drawTimeline(); }
async function boot() { const q = new URLSearchParams(location.search); bindUI(); const cv = $("gl"), gl = cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { $("loading").textContent = "WebGL2 unavailable"; return; }
  L.gl = gl; L.R = { gl }; L.ground = groundProg(gl); L.ballP = ballProg(gl); L.charP = charProg(gl);
  const [colliders, baked, ent] = await Promise.all([fetch("dribble1/d1_colliders.json").then((r) => r.json()), fetch("tc_baseline_88573ef0/pt_baked.json").then((r) => r.json()), W.ofCharLoad("vinicius")]);
  L.ent = ent; const E = W.RUN1_V13; L.env = { E, M4, skel: ent.skel, colliders, baked, body: E.r1Body(ent.skel) };
  if (q.get("mode") && MODE_LIST.includes(q.get("mode"))) L.mode = q.get("mode"); if (q.get("layout")) L.layout = q.get("layout"); if (q.get("cam")) { L.cam = q.get("cam"); $("selCam").value = L.cam; }
  for (const [k, id] of [["ball", "bBall"], ["body", "bBody"], ["skel", "bSkel"], ["diag", "bDiag"], ["beliefs", "bBel"]]) { if (q.get(k) != null) L[k] = q.get(k) === "1"; $(id).classList.toggle("on", L[k]); }
  setMode(L.mode); setLayout(L.layout); buildList(); select(q.get("case") && L.cases.some((c) => c.id === q.get("case")) ? q.get("case") : L.cases[0].id, { paused: q.get("play") === "0" }); if (q.get("t") != null) { L.t = Math.round((L.cur.t0 + +q.get("t")) / DT) * DT; L.playing = false; }
  $("loading").remove(); L.ready = true; L.external = q.get("external") === "1"; if (!L.external) requestAnimationFrame(frame); else frame(performance.now());
  const rest = L.cases.filter((c) => !L.done.has(c.id)); const next = () => { const c = rest.shift(); if (!c || L.external) return; const C = simulate(c); L.done.set(c.id, C); const el = $("o_" + c.id); if (el) el.textContent = rowText(C); setTimeout(next, 30); }; setTimeout(next, 600); }
// the automation surface (puppeteer: stills, checks)
W.SP = { ready: () => L.ready, L, select: (id, o) => select(id, o || { paused: true }), mode: setMode, layout: setLayout, seek: (t) => { L.t = Math.round((L.cur.t0 + t) / DT) * DT; L.playing = false; frame(performance.now()); return L.t; }, cam: (c) => { L.cam = c; $("selCam").value = c; frame(performance.now()); },
  set: (o) => { for (const k of ["ball", "body", "skel", "diag", "beliefs"]) if (o[k] != null) L[k] = !!o[k]; writeDiag(); frame(performance.now()); },
  report: () => (L.cur ? { id: L.cur.tc.id, outcomes: Object.fromEntries(MODE_LIST.map((m) => [m, L.cur.runs[m].out ? L.cur.runs[m].out.kind : null])), auth: Object.fromEntries(MODE_LIST.filter((m) => m !== "OLD").map((m) => [m, L.cur.runs[m].rep.authority])), ms: Object.fromEntries(MODE_LIST.map((m) => [m, Math.round(L.cur.runs[m].ms)])) } : null),
  times: () => { const C = L.cur, A = C.runs.OLD.W.tk.act, t0 = C.t0; return A ? { t0, commit: A.t0 - t0, hits: A.hits.map((h) => h.t - t0), ctl: A.tCtl - t0 } : { t0 }; } };
boot().catch((e) => { const l = $("loading"); if (l) l.textContent = "REVIEW LAB failed: " + (e && e.stack || e); console.error(e); });
