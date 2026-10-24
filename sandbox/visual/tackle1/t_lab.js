// ═══ tackle1/t_lab.js — TOUCHLINE — TACKLING LAB V1: the deterministic review of STANDING TACKLE V1 ═══════════════════════════════════════════════
// Each case is simulated once (both footballers, the shared ball) and both bodies are posed at every simulation tick of its clip, in order —
// playback, frame stepping and slow motion then only look poses up (the same pose at the same tick every time). The attacker is drawn in his
// own kit, the defender (the same canonical footballer) with a tinted kit. LOCAL ONLY (real players' models).
import { DT, DEG } from "../vocab2/c_sim.js";
import { PlayBody } from "../vocab2/u_body.js";
import { TCASES } from "./t_cases.js";
import { runCase, caseReport } from "./t_run.js";
import { TK } from "./t_tackle.js";
const W = window, hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x), $ = (id) => document.getElementById(id);
const L = { ready: false, cases: TCASES, done: new Map(), cur: null, t: 0, playing: false, rate: 1, loop: false, cam: "gameplay", ball: true, body: false, skel: false, diag: true, contact: "POKE", camS: null, last: null };
// ── GL ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
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
// the character program of anim3d/of_char_gl.js with ONE addition: a kit tint (the defender's), skin untouched
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
function drawChar(skin, view, proj, tint, alpha = 1) { const gl = L.gl, P = L.charP, G = W.ofCharBuffers(L.R, L.ent); gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.view, false, view); gl.uniformMatrix4fv(P.u.proj, false, proj); gl.uniformMatrix4fv(P.u.bones, false, skin);
  gl.uniform3fv(P.u.light, L.ent.rig.shading.light); gl.uniform3fv(P.u.skinBase, G.skinBase); gl.uniform3fv(P.u.skinShadow, G.skinShadow); gl.uniform3fv(P.u.skinLight, G.skinLight); gl.uniform3fv(P.u.tint, tint); gl.uniform1f(P.u.alpha, alpha);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.tex); gl.uniform1i(P.u.atlas, 0); const pf = gl.getParameter(gl.FRONT_FACE); gl.frontFace(gl.CW); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.bindVertexArray(G.vao); gl.drawElements(gl.TRIANGLES, G.count, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null); gl.frontFace(pf); gl.disable(gl.CULL_FACE); }
const A3 = (p, h) => [p[0], h != null ? h : (p[2] || 0), -p[1]], QA = (q) => [-q[0], -q[1], q[2], q[3]];
const DEF_TINT = [1.05, 0.42, 0.36], ATT_TINT = [1, 1, 1];
// ── A CASE: simulate, then pose both bodies at every tick of the clip ───────────────────────────────────────────────────────────────────────────
function simulate(tc, o = {}) { const c0 = performance.now(), r = runCase(L.env, tc, { contact: L.contact, tackle: o.tackle }), Wd = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT);
  const bA = new PlayBody(L.env, Wd.att), bD = new PlayBody(L.env, Wd.def), F = [];
  for (let k = k0; k <= k1; k++) { const t = k * DT, pa = bA.pose(t), pd = bD.pose(t); F.push({ t, a: { skin: pa.skin, J: pa.J, P: pa.P }, d: { skin: pd.skin, J: pd.J, P: pd.P }, ball: Wd.att.ballTrack(t) }); }
  const rep = caseReport(Wd, r.t0); return { tc, r, W: Wd, F, k0, k1, rep, ms: performance.now() - c0, tackle: o.tackle != null ? o.tackle : tc.tackle }; }
function frameAt(t) { const C = L.cur, i = clamp(Math.round(t / DT) - C.k0, 0, C.F.length - 1); return C.F[i]; }
function outcomeText(C) { const R = C.rep, q = R.requests[0]; if (!q) return "no request (the ordinary encounter)"; const S = R.action; if (!S) return `${q.state}: ${q.reason || ""}`; return `${S.family} (${S.foot}) → ${S.outcome ? S.outcome.kind : "…"}`; }
// ── the case list ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function buildList() { const box = $("cases"); box.innerHTML = ""; let g = null;
  for (const tc of L.cases) { if (tc.group !== g) { g = tc.group; const h = document.createElement("h3"); h.textContent = g; box.appendChild(h); }
    const b = document.createElement("button"); b.className = "c"; b.dataset.id = tc.id; b.innerHTML = `${tc.name}<span class="o" id="o_${tc.id}">${L.done.has(tc.id + L.contact) ? outcomeText(L.done.get(tc.id + L.contact)) : "…"}</span>`; b.onclick = () => select(tc.id); box.appendChild(b); } }
function markList() { for (const b of document.querySelectorAll("#cases .c")) b.classList.toggle("on", L.cur && b.dataset.id === L.cur.tc.id); }
function select(id, o = {}) { const tc = L.cases.find((x) => x.id === id); if (!tc) return; const key = id + L.contact + (o.tackle != null ? "@" + o.tackle.join(",") : "");
  let C = L.done.get(key); if (!C) { C = simulate(tc, o); L.done.set(key, C); } L.cur = C; L.camS = null; const el = $("o_" + id); if (el && o.tackle == null) el.textContent = outcomeText(C);
  L.t = C.r.clip[0]; L.playing = !o.paused; markList(); writeDiag(); drawTimeline(); try { history.replaceState(null, "", `?case=${id}&cam=${L.cam}${L.contact !== "POKE" ? "&contact=" + L.contact : ""}`); } catch (e) {} }
// ── THE CAMERAS: framed on both players (their midpoint, followed smoothly), oriented by the defender's facing at commitment (else at t = 0) ──
function camera(Fr, vw, vh) { const C = L.cur, A = C.W.tk.act, psi = A ? A.entry.psi : C.r.enc.def.h, fw = [Math.cos(psi), Math.sin(psi)], rt = [-Math.sin(psi), Math.cos(psi)];
  // (the framing point: the players' midpoint averaged over the last 0.4 s — a function of the time alone, so a still is the same however it is reached)
  const i1 = clamp(Math.round(L.t / DT) - C.k0, 0, C.F.length - 1), i0 = Math.max(0, i1 - 96); let m = [0, 0], n = 0; for (let i = i0; i <= i1; i += 8) { const f = C.F[i]; m[0] += f.a.P[0] + f.d.P[0]; m[1] += f.a.P[1] + f.d.P[1]; n += 2; } m = [m[0] / n, m[1] / n];
  const sep = hyp(Fr.a.P[0] - Fr.d.P[0], Fr.a.P[1] - Fr.d.P[1]), D = clamp(3.6 + 0.9 * sep, 4.2, 9.5), at = (a, l, h) => A3([m[0] + fw[0] * a + rt[0] * l, m[1] + fw[1] * a + rt[1] * l], h);
  let eye, tgt = A3(m, 0.75), up = [0, 1, 0], fov = 40;
  switch (L.cam) { case "front": eye = at(D, 0, 1.3); break; case "rear": eye = at(-D, 0, 1.5); break; case "sideL": eye = at(0, -D, 1.2); break; case "sideR": eye = at(0, D, 1.2); break;
    case "q3f": eye = at(D * 0.72, D * 0.72, 1.9); break; case "q3r": eye = at(-D * 0.72, -D * 0.72, 2.0); break; case "top": eye = A3(m, 9.0); up = [fw[0], 0, -fw[1]]; tgt = A3(m, 0); fov = 36; break;
    default: { // GAMEPLAY: the broadcast side-on view from the near touchline, high and long
      eye = A3([m[0], m[1] - 15.5], 8.2); tgt = A3(m, 0.4); fov = 26; } }
  return { view: lookAt(eye, tgt, up), proj: persp(1 / Math.tan(fov / 2 * DEG), vw / vh, 0.1, 300) }; }
function proj3(c, p, w, h) { const v = M4.transformPoint(c.view, p), pr = c.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], ww = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (ww <= 1e-4) return null; return [(cx / ww * 0.5 + 0.5) * w, (0.5 - cy / ww * 0.5) * h]; }
// ── RENDER ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function layout() { const top = $("bar").getBoundingClientRect().height + "px"; $("stage").style.top = top; $("cases").style.top = top; }
function render() { const C = L.cur; if (!C) return; layout(); const gl = L.gl, cv = $("gl"), ov = $("ov"), st = $("stage").getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(st.width * dpr), h = Math.round(st.height * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; ov.width = w; ov.height = h; cv.style.width = ov.style.width = st.width + "px"; cv.style.height = ov.style.height = st.height + "px"; }
  const Fr = frameAt(L.t), c = camera(Fr, w, h), B = Fr.ball.p, showBall = L.ball && !L.body;
  gl.viewport(0, 0, w, h); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
  const sh = new Float32Array(32); let ns = 0; const push = (x, y, s, a) => { sh.set([x, y, s, a], ns * 4); ns++; }; push(Fr.a.P[0], Fr.a.P[1], 0.42, 0.4); push(Fr.d.P[0], Fr.d.P[1], 0.42, 0.4); if (showBall) push(B[0], B[1], 0.12, 0.6);
  const G = L.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, c.view); gl.uniformMatrix4fv(G.u.proj, false, c.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  if (!L.skel) { drawChar(Fr.a.skin, c.view, c.proj, ATT_TINT); drawChar(Fr.d.skin, c.view, c.proj, DEF_TINT); }
  if (showBall) { const P = L.ballP; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.view, false, c.view); gl.uniformMatrix4fv(P.u.proj, false, c.proj); gl.uniform3fv(P.u.c, A3(B)); gl.uniform4fv(P.u.q, QA(Fr.ball.q)); gl.uniform1f(P.u.r, 0.11); gl.bindVertexArray(P.vao); gl.drawElements(gl.TRIANGLES, P.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); }
  const x = ov.getContext("2d"); x.clearRect(0, 0, w, h); const pr = (p) => proj3(c, A3(p, p[2]), w, h);
  if (L.skel) for (const [J, col] of [[Fr.a.J, "#8fd3ff"], [Fr.d.J, "#ff9e7a"]]) { x.strokeStyle = col; x.lineWidth = 2.5 * dpr; for (const k of Object.keys(J)) { const a = pr(J[k].j), b = pr(J[k].t); if (a && b) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); } } }
  if (L.diag && !L.body) overlays(x, pr, dpr, Fr);
  hud(Fr); }
function overlays(x, pr, dpr, Fr) { const C = L.cur, A = C.W.tk.act, t = L.t; if (!A) return; x.save();
  // the boot's contact spheres through the window (the authoritative boot the opponent law saw), the planned ball point, the contact made
  if (t >= A.tW0 - 1e-9 && t <= A.tW1 + 1e-9) { for (const s of C.W.tk.spheresAt(Math.round(t / DT) * DT)) { const a = pr(s.p), b = pr([s.p[0] + TK.r, s.p[1], s.p[2]]); if (!a || !b) continue; x.strokeStyle = s.surf === "TOE" ? "rgba(255,212,94,0.95)" : "rgba(255,255,255,0.7)"; x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(a[0], a[1], Math.max(2, hyp(b[0] - a[0], b[1] - a[1])), 0, 2 * Math.PI); x.stroke(); } }
  if (t >= A.t0 && t <= A.tC + 0.15) { const p = pr([A.bp[0], A.bp[1], 0.11]); if (p) { x.strokeStyle = "rgba(255,212,94,0.8)"; x.setLineDash([4 * dpr, 4 * dpr]); x.beginPath(); x.arc(p[0], p[1], 9 * dpr, 0, 2 * Math.PI); x.stroke(); x.setLineDash([]); x.fillStyle = "#ffd45e"; x.font = `${11 * dpr}px Menlo`; x.fillText("predicted ball @ contact", p[0] + 12 * dpr, p[1] - 6 * dpr); } }
  for (const hh of A.hits) if (t >= hh.t - 1e-9 && t <= hh.t + 0.5) { const p = pr([hh.at[0], hh.at[1], 0.11]); if (!p) continue; x.fillStyle = "#ff8a80"; x.beginPath(); x.arc(p[0], p[1], 5 * dpr, 0, 2 * Math.PI); x.fill();
    const q = pr([hh.at[0] + hh.vOut[0] * 0.15, hh.at[1] + hh.vOut[1] * 0.15, 0.11]), q0 = pr([hh.at[0] - hh.vIn[0] * 0.15, hh.at[1] - hh.vIn[1] * 0.15, 0.11]); x.lineWidth = 2 * dpr;
    if (q0) { x.strokeStyle = "rgba(143,211,255,0.9)"; x.beginPath(); x.moveTo(...q0); x.lineTo(...p); x.stroke(); } if (q) { x.strokeStyle = "#ff8a80"; x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke(); }
    x.fillStyle = "#ffcfc9"; x.font = `${11 * dpr}px Menlo`; x.fillText(`${hh.surface} · ${hyp(...hh.vIn).toFixed(1)} → ${hyp(...hh.vOut).toFixed(1)} m/s`, p[0] + 9 * dpr, p[1] + 16 * dpr); }
  x.restore(); }
function hud(Fr) { const C = L.cur, A = C.W.tk.act, t = L.t, t0 = C.r.t0, ph = C.W.tk.phaseAt(t), a = C.W.att.stateAt(t), d = C.W.def.stateAt(t);
  const sep = hyp(Fr.ball.p[0] - Fr.d.P[0], Fr.ball.p[1] - Fr.d.P[1]), owner = (() => { const pa = C.W.att.poss.log.filter((e) => e.t <= t + 1e-6).slice(-1)[0], pd = (C.W.def.poss.log || []).filter((e) => e.t <= t + 1e-6).slice(-1)[0]; return `carrier ${pa ? pa.to : "FREE"} · defender ${pd ? pd.to : "—"}`; })();
  $("hud").innerHTML = `<div class="ph">${A && t >= A.t0 ? ph : C.W.tk.log.some((r) => r.tReq <= t && (r.tEnd == null || r.tEnd > t)) ? "PENDING" : ph}</div>t ${(t - t0 >= 0 ? "+" : "")}${(t - t0).toFixed(3)} s${A ? ` · ${(t - A.tReq >= 0 ? "+" : "")}${(t - A.tReq).toFixed(3)} from the request` : ""}\nattacker ${a.s.toFixed(1)} m/s · defender ${d.s.toFixed(1)} m/s\nball ↔ defender ${sep.toFixed(2)} m\n${owner}`; }
// ── the diagnostics panel (the case's own record) ──────────────────────────────────────────────────────────────────────────────────────────────────
function writeDiag() { const C = L.cur, R = C.rep, S = R.action, f = (x, n = 3) => (x == null ? "—" : (+x).toFixed(n)), el = $("diag"); el.classList.toggle("hidden", !L.diag);
  const lines = [`<b>${C.tc.name}</b>`, `<span class="k">${C.tc.note || ""}</span>`, `attacker case: ${C.tc.c.tech} · ${C.tc.c.variant} (${C.tc.c.mode})${C.tc.c.pref === "L" ? " · left-footed" : ""}`, `contact model: ${L.contact} · simulated in ${C.ms.toFixed(0)} ms`, ""];
  for (const q of R.requests) { lines.push(`<b>REQUEST #${q.n}</b> at +${f(q.t)} s → <b>${q.state}</b>${q.reason ? ` <span class="bad">${q.reason}</span>` : ""}`);
    const why = Object.entries(q.why || {}).sort((a, b) => b[1] - a[1]).slice(0, 3); if (why.length) lines.push(`<span class="k">  while pending (ticks): ${why.map(([k, n]) => `${n}× ${k}`).join(" · ")}</span>`); }
  if (S) { const A = C.W.tk.act, r = (x) => (x == null ? "—" : `+${(+x).toFixed(3)} s`);
    lines.push("", `<b>THE ACTION</b>  ${S.family} · tackling foot <b>${S.foot}</b> · support ${S.support} · commitment c ${f(S.c, 2)}`, `challenge ${f(S.angle, 1)}° · ball ${f(S.range, 2)} m at contact (envelope ${f(A.mx, 2)} m) · approach ${f(S.approach, 2)} m/s`,
      `stride at commit: R ${A.stride.R.planted ? `planted ${A.stride.R.since}s` : `in swing u ${A.stride.R.u}`} · L ${A.stride.L.planted ? `planted ${A.stride.L.since}s` : `in swing u ${A.stride.L.u}`}`,
      `contact: ${A.contact} · boot speed at contact ${f(A.vJab, 2)} m/s · ball ${f(S.ballAtCommit, 2)} m away at commitment`, "", `<b>TIMES</b> (from the request)`, `  request        +0.000 s`, `  commit         ${r(S.commit)}`, `  contact plan   ${r(S.contactPlanned)}`,
      `  contact window ${r(S.window[0])} … ${r(S.window[1])}`, `  recovery start ${r(S.recoveryStart)}`, `  control ready  ${r(S.controlReady)}`,
      `  recovery ${f(S.recovery, 3)} s from the ${S.hits.length ? "contact" : "planned contact"} to control ready${S.regain ? ` · ${f(S.regain.speedAtControl, 2)} m/s then; 2 m/s again after ${S.regain.to2ms != null ? f(S.regain.to2ms, 2) + " s" : "— (not within the replay)"}` : ""}`);
    lines.push("", `<b>BALL CONTACT</b>`); if (!S.hits.length) lines.push(`  <span class="bad">none</span>`); if (S.hits.length) lines.push(`  ${S.hits.length} impulse(s) in ${S.episodes} contact episode(s)`); for (const h of S.hits) lines.push(`  ${r(h.t)} ${h.surface} · ball ${hyp(...h.vIn).toFixed(2)} → ${hyp(...h.vOut).toFixed(2)} m/s (Δv ${f(h.dv, 2)}) · possession ${h.possBefore} → ${h.possAfter}`);
    lines.push("", `<b>OUTCOME</b>  ${S.outcome ? S.outcome.kind : "—"}`, `  ${S.outcome ? S.outcome.why : ""}`); }
  if (R.possA.length) lines.push("", `<b>CARRIER'S POSSESSION</b> (the canonical model)`, ...R.possA.map((e) => `  +${f(e.t)} → ${e.to} (${e.why})`));
  if (R.possD.length) lines.push("", `<b>DEFENDER'S POSSESSION</b>`, ...R.possD.map((e) => `  +${f(e.t)} → ${e.to} (${e.why})`));
  if (R.world.length) lines.push("", `<b>WORLD</b>`, ...R.world.map((e) => `  +${f(e.t)} ${e.kind}${e.why ? " — " + e.why : ""}${e.surface ? " " + e.surface : ""}`));
  el.innerHTML = lines.join("\n"); }
// ── the timeline (markers: request, commitment, the contact window, contacts, recovery, control ready, possession changes) ───────────────────────
function drawTimeline() { const C = L.cur; if (!C) return; const cv = $("tlc"), r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const x = cv.getContext("2d"), [a, b] = C.r.clip, X = (t) => 10 * dpr + (t - a) / (b - a) * (cv.width - 20 * dpr), H = cv.height; x.fillStyle = "#151d19"; x.fillRect(0, 0, cv.width, H);
  x.fillStyle = "#2a3530"; x.fillRect(X(a), H * 0.55, X(b) - X(a), 3 * dpr); const A = C.W.tk.act;
  if (A) { x.fillStyle = "rgba(255,212,94,0.25)"; x.fillRect(X(A.tW0), H * 0.42, X(A.tW1) - X(A.tW0), H * 0.3); x.fillStyle = "rgba(255,158,122,0.22)"; x.fillRect(X(A.tRec), H * 0.42, X(A.tCtl) - X(A.tRec), H * 0.3); }
  const mk = (t, col, lab, row) => { x.strokeStyle = col; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(X(t), H * 0.3); x.lineTo(X(t), H * 0.85); x.stroke(); x.fillStyle = col; x.font = `${10 * dpr}px Menlo`; x.fillText(lab, X(t) + 3 * dpr, H * (row ? 0.27 : 0.97)); };
  for (const q of C.W.tk.log) { mk(q.tReq, "#8fd3ff", "request", 0); if (q.tEnd != null && q.state !== "COMMITTED") mk(q.tEnd, "#ff8a80", q.state.toLowerCase(), 1); }
  if (A) { mk(A.t0, "#ffd45e", "commit", 1); for (const h of A.hits) mk(h.t, "#ff8a80", "contact", 0); mk(A.tRec, "#ff9e7a", "recovery", 1); mk(A.tCtl, "#8dffa6", "control", 0); }
  for (const e of C.W.att.poss.log) if (e.t >= a && e.t <= b && e.to === "FREE") mk(e.t, "#ff8a80", "carrier→FREE", 1);
  x.strokeStyle = "#fff"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(X(L.t), 0); x.lineTo(X(L.t), H); x.stroke(); }
// ── LOOP ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function frame(now) { const dt = L.last != null ? Math.min(0.05, (now - L.last) / 1000) : 0; L.last = now; const C = L.cur;
  if (C && L.playing) { L.t += dt * L.rate; if (L.t >= C.r.clip[1]) { if (L.loop) L.t = C.r.clip[0]; else { L.t = C.r.clip[1]; L.playing = false; } } }
  render(); drawTimeline(); $("bPlay").textContent = L.playing ? "❚❚ PAUSE" : "▶ PLAY"; if (!L.external) requestAnimationFrame(frame); }
function step(n) { const C = L.cur; L.playing = false; L.t = clamp(Math.round(L.t / DT + n) * DT, C.r.clip[0], C.r.clip[1]); }
function bindUI() {
  $("bPlay").onclick = () => { if (!L.playing && L.t >= L.cur.r.clip[1] - 1e-9) L.t = L.cur.r.clip[0]; L.playing = !L.playing; };
  $("bReplay").onclick = () => { L.t = L.cur.r.clip[0]; L.playing = true; }; $("bBack").onclick = () => step(-4); $("bFwd").onclick = () => step(4);
  $("bLoop").onclick = () => { L.loop = !L.loop; $("bLoop").classList.toggle("on", L.loop); };
  for (const b of document.querySelectorAll("[data-rate]")) b.onclick = () => { L.rate = +b.dataset.rate; for (const x of document.querySelectorAll("[data-rate]")) x.classList.toggle("on", x === b); };
  $("selCam").onchange = (e) => { L.cam = e.target.value; L.camS = null; };
  const tog = (id, k, after) => { $(id).onclick = () => { L[k] = !L[k]; $(id).classList.toggle("on", L[k]); if (after) after(); }; };
  tog("bBall", "ball"); tog("bBody", "body"); tog("bSkel", "skel"); tog("bDiag", "diag", writeDiag);
  $("selContact").onchange = (e) => { L.contact = e.target.value; buildList(); select(L.cur.tc.id); };
  $("bTry").onclick = () => { const C = L.cur, t = +(L.t - C.r.t0).toFixed(4); select(C.tc.id, { tackle: [t], paused: true }); L.t = Math.max(C.r.clip[0], L.cur.r.t0 + t - 0.3); };
  $("bNoTk").onclick = () => select(L.cur.tc.id, { tackle: [] });
  $("tlc").onclick = (e) => { const C = L.cur, r = e.target.getBoundingClientRect(), u = clamp((e.clientX - r.left - 10) / (r.width - 20), 0, 1); L.t = Math.round((C.r.clip[0] + u * (C.r.clip[1] - C.r.clip[0])) / DT) * DT; L.playing = false; };
  window.addEventListener("keydown", (e) => { if (e.target.tagName === "SELECT") return; const k = e.key;
    if (k === " ") { e.preventDefault(); $("bPlay").onclick(); } else if (k === ",") step(e.shiftKey ? -1 : -4); else if (k === ".") step(e.shiftKey ? 1 : 4); else if (k === "t" || k === "T") $("bTry").onclick();
    else if (k === "b" || k === "B") $("bBall").onclick(); else if (k >= "1" && k <= "8") { const v = ["gameplay", "front", "rear", "sideL", "sideR", "q3f", "q3r", "top"][+k - 1]; L.cam = v; $("selCam").value = v; L.camS = null; } }); }
async function boot() { const q = new URLSearchParams(location.search); bindUI(); const cv = $("gl"), gl = cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { $("loading").textContent = "WebGL2 unavailable"; return; }
  L.gl = gl; L.R = { gl }; L.ground = groundProg(gl); L.ballP = ballProg(gl); L.charP = charProg(gl);
  const [colliders, baked, ent] = await Promise.all([fetch("dribble1/d1_colliders.json").then((r) => r.json()), fetch("tc_baseline_88573ef0/pt_baked.json").then((r) => r.json()), W.ofCharLoad("vinicius")]);
  L.ent = ent; const E = W.RUN1_V13; L.env = { E, M4, skel: ent.skel, colliders, baked, body: E.r1Body(ent.skel) };
  if (q.get("contact") === "PHASE_C") { L.contact = "PHASE_C"; $("selContact").value = "PHASE_C"; } if (q.get("cam")) { L.cam = q.get("cam"); $("selCam").value = L.cam; }
  for (const [k, id] of [["ball", "bBall"], ["body", "bBody"], ["skel", "bSkel"], ["diag", "bDiag"]]) if (q.get(k) != null) { L[k] = q.get(k) === "1"; $(id).classList.toggle("on", L[k]); }
  buildList(); select(q.get("case") && L.cases.some((c) => c.id === q.get("case")) ? q.get("case") : L.cases[0].id, { paused: q.get("play") === "0" }); if (q.get("t") != null) { L.t = Math.round((L.cur.r.t0 + +q.get("t")) / DT) * DT; L.playing = false; }
  $("loading").remove(); L.ready = true; L.external = q.get("external") === "1"; if (!L.external) requestAnimationFrame(frame); else frame(performance.now());
  // (the remaining cases' outcomes, one per idle moment)
  const rest = L.cases.filter((c) => !L.done.has(c.id + L.contact)); const next = () => { const c = rest.shift(); if (!c || L.external) return; select.lazy = true; const C = simulate(c); L.done.set(c.id + L.contact, C); const el = $("o_" + c.id); if (el) el.textContent = outcomeText(C); setTimeout(next, 30); }; setTimeout(next, 400); }
// the automation surface (puppeteer: stills, checks)
W.TL = { ready: () => L.ready, L, select: (id, o) => select(id, o || { paused: true }), seek: (t) => { L.t = Math.round((L.cur.r.t0 + t) / DT) * DT; L.playing = false; frame(performance.now()); return L.t; }, cam: (c) => { L.cam = c; L.camS = null; $("selCam").value = c; frame(performance.now()); },
  set: (o) => { for (const k of ["ball", "body", "skel", "diag"]) if (o[k] != null) { L[k] = !!o[k]; } frame(performance.now()); }, report: () => (L.cur ? { id: L.cur.tc.id, rep: L.cur.rep, ms: L.cur.ms, frames: L.cur.F.length } : null),
  times: () => { const A = L.cur && L.cur.W.tk.act, t0 = L.cur.r.t0; return A ? { t0, req: A.tReq - t0, commit: A.t0 - t0, contact: A.tC - t0, hits: A.hits.map((h) => h.t - t0), rec: A.tRec - t0, ctl: A.tCtl - t0 } : { t0 }; } };
boot().catch((e) => { const l = $("loading"); if (l) l.textContent = "TACKLING LAB failed: " + (e && e.stack || e); console.error(e); });
