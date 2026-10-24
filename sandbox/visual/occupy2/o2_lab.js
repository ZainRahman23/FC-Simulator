// ═══ occupy2/o2_lab.js — TOUCHLINE — PLAYER OCCUPANCY STAGE 2 REVIEW ═══════════════════════════════════════════════════════════════════════════
// Each case is simulated three times from identical inputs: OLD (Shared Possession + Reaction V1, MEDIUM 0.200 s), STAGE 1 (Player Occupancy V1,
// occupy1/, unchanged) and STAGE 2 (committed-action contact resolution, o2_world.js). Every world records each tick's LIVE pose (the body as
// drawn at that tick): playback, frame stepping and slow motion only look poses up — the three views stay on the same tick.
// Over the bodies: the OCCUPANCY CAPSULES (normal · contact · penetrating · deep), the CONTACT NORMALS, the SUPPORT ANCHORS (each planted foot's
// authored world position; when the body has been moved while it stayed planted, the SUPPORT CONSISTENCY ERROR drawn from it), the ROOT
// CORRECTION VECTOR (what occupancy moved each root by at this tick, ×20), the BALL-ACCESS PATH (each contact's playing leg against the
// opponent's body: THROUGH / BLOCKED / clear), and per view the FRAME DATA: contact regions, depth, normal and tangential relative motion, root
// correction, support state and error, action commitment, ball access CLEAR / BLOCKED. The timeline: one lane per mode. LOCAL ONLY (real
// players' models).
import { DT, DEG } from "../vocab2/c_sim.js";
import { O2CASES } from "./o2_cases.js";
import { runO2, outcomeO2, O2_LABEL } from "./o2_run.js";
import { volumesOf, detect, legThrough, OCC, GROUP, RESOLVED } from "../occupy1/o_volumes.js";
import { RES2 } from "./o2_world.js";
const W = window, hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x), $ = (id) => document.getElementById(id), MODES = ["OLD", "S1", "S2"], MNAME = { OLD: "OLD", S1: "STAGE 1", S2: "STAGE 2" };
const L = { ready: false, cases: O2CASES, done: new Map(), cur: null, mode: "S2", layout: "3", t: 0, playing: false, rate: 1, loop: false, cam: "gameplay", show: "skin", vol: true, nrm: true, anc: true, cor: true, acc: true, hud: true, ball: true, diag: true, last: null };
const COL = { ATT: "#8fd3ff", DEF: "#ff9e7a", normal: "rgba(205,235,220,0.22)", normalLine: "rgba(225,245,235,0.55)", contact: "rgba(255,212,94,0.45)", contactLine: "#ffd45e", pen: "rgba(255,138,61,0.55)", penLine: "#ff8a3d", deep: "rgba(255,45,85,0.62)", deepLine: "#ff2d55", blocked: "#ff4fd8", anchor: "#8dffa6", warn: "#ffb36b" };
const SHORT = { MISS: "MISS", "CONTACT — ATTACKER RETAINS": "RETAINS", "CONTACT — ATTACKER RECOVERS": "ATT", "CONTACT — DEFENDER RECOVERS": "DEF", "CONTACT — BALL FREE": "FREE" };
const CLS5 = (A, B) => { const g = [GROUP[A], GROUP[B]]; if (g.includes("ARM")) return "ARM ↔ BODY"; if (g.includes("FOOT")) return "FOOT ↔ BODY"; if (g[0] === "TRUNK" && g[1] === "TRUNK") return "TORSO/PELVIS ↔ TORSO/PELVIS"; if (g[0] === "TRUNK" || g[1] === "TRUNK") return "TORSO ↔ LEG"; return "LEG ↔ LEG"; };
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
// ═══ A CASE: OLD · STAGE 1 · STAGE 2 simulated; per tick the volumes' contacts, the support, the corrections (from the recorded live poses) ═══
const MOVE = /BODY FEINT|CROQUETA/;
// (the commitment and the support state at t from the plan LIVE at t — the same definitions for the three modes; o2_world.js supportState)
// (a Standing Tackle owns the body from its commitment to its control end — tk.owns alone has no lower bound)
function committedAt(p, t) { if (p.tk && (p.tk.acts || []).some((A) => t >= A.t0 - 1e-9 && t < A.tCtl - 1e-9)) return "STANDING TACKLE"; const a = p.planAt(t).action; return a && a.tech && a.tCommit != null && t >= a.tCommit - 1e-9 && t < a.tRelease ? a.label : null; }
function plantedAt(p, t) { const P = p.planAt(t); return ["R", "L"].map((X) => [X, P.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9)]).filter((x) => x[1]); }
function supportAt(p, t) { const n = plantedAt(p, t).length, c = committedAt(p, t), s = p.stateAt(t); if (c && n) return "COMMITTED PLANT"; if (!n) return "AIRBORNE"; if (hyp(s.V[0], s.V[1]) >= RES2.still) return "FREE LOCOMOTION"; return n === 2 ? "DOUBLE SUPPORT" : "SINGLE SUPPORT"; }
function simMode(tc, m) { const c0 = performance.now(), E = new Map();
  // (the executed root displacement per tick and player, read from the plan around each correction — the same instrument for both stages)
  const before = (Wd) => { if (!Wd.occOn) return; const sp = Wd.shiftPlan.bind(Wd); Wd.shiftPlan = (p, d, t, ...a) => { const P = p.plan, i1 = Math.min(P.n, Math.max(0, Math.round((t - P.t0) / DT)) + 1), b = [P.P[2 * i1], P.P[2 * i1 + 1]], o = sp(p, d, t, ...a), k = Math.round(t / DT), key = p === Wd.att ? "ATT" : "DEF", q = E.get(k) || { ATT: [0, 0], DEF: [0, 0], dATT: [0, 0], dDEF: [0, 0] };
      q[key][0] += P.P[2 * i1] - b[0]; q[key][1] += P.P[2 * i1 + 1] - b[1]; q["d" + key][0] += d[0]; q["d" + key][1] += d[1]; E.set(k, q); return o; }; };
  const r = runO2(L.env, tc, m, { before }), Wd = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT), T = new Map();
  let best = -1, bestK = null; const pen = new Float32Array(k1 - k0 + 1).fill(-1), run = new Float32Array(k1 - k0 + 1).fill(-1), over = { tol: 0, hard: 0 }, per = { TRUNK: -1, LEGS: -1, FEET: -1, ARMS: -1 };
  const led = { ATT: {}, DEF: {} }; let sceMax = 0;
  for (let k = k0; k <= k1; k++) { const fr = Wd.frames.get(k); if (!fr) continue; const t = k * DT, near = hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) < OCC.broad + 0.6, va = volumesOf(fr.a.J), vd = volumesOf(fr.d.J), P = near ? detect(va, vd, { within: 0.03 }) : [];
    const g = {}; let mres = -1; for (const p of P) { const G = p.A && GROUP[p.A] === "TRUNK" && GROUP[p.B] === "TRUNK" ? "TRUNK" : [GROUP[p.A], GROUP[p.B]].includes("ARM") ? "ARMS" : [GROUP[p.A], GROUP[p.B]].includes("FOOT") ? "FEET" : "LEGS"; if (!g[G] || p.pen > g[G].pen) g[G] = p; per[G] = Math.max(per[G], p.pen); if (p.both && p.pen > mres) mres = p.pen; }
    if (mres > OCC.tol) over.tol++; if (mres > OCC.hard) over.hard++; pen[k - k0] = mres; if (mres > best) { best = mres; bestK = k; } run[k - k0] = best;
    // (the contact NORMAL — the aggregate separating direction, from the defender toward the carrier — and the roots' relative motion on it
    // (closing > 0) and along it (the tangent))
    const sa = Wd.att.stateAt(t), sd = Wd.def.stateAt(t); let nb = [0, 0]; for (const p of P) { if (!p.both || p.pen < -0.03) continue; const n = p.nh || [p.n[0], p.n[1]], w = Math.max(0.01, 0.03 + p.pen); nb = [nb[0] + n[0] * w, nb[1] + n[1] * w]; }
    let nrm = null; { const nm = hyp(nb[0], nb[1]); if (nm > 1e-9) { const n = [nb[0] / nm, nb[1] / nm], tn = [-n[1], n[0]], vr = [sa.V[0] - sd.V[0], sa.V[1] - sd.V[1]]; nrm = { n, vn: -(vr[0] * n[0] + vr[1] * n[1]), vt: vr[0] * tn[0] + vr[1] * tn[1] }; } }
    // (per player: support state, commitment, the planted anchors and their SUPPORT CONSISTENCY ERROR, the root correction, ball access)
    const e = E.get(k), pl = {};
    for (const [key, p, mine, theirs] of [["ATT", Wd.att, va, vd], ["DEF", Wd.def, vd, va]]) { const anchors = [], st = plantedAt(p, t), L2 = led[key];
      for (const X of ["R", "L"]) { const q = st.find((s) => s[0] === X); if (!q) { L2[X] = null; continue; } const s = q[1], kk = X + s.id + "@" + s.t0.toFixed(4); if (!L2[X] || L2[X].key !== kk) L2[X] = { key: kk, v: [0, 0] }; if (e) { L2[X].v[0] += e[key][0]; L2[X].v[1] += e[key][1]; }
        const sce = hyp(L2[X].v[0], L2[X].v[1]); sceMax = Math.max(sceMax, sce); anchors.push({ X, pos: s.pos ? s.pos.slice() : null, v: L2[X].v.slice(), sce }); }
      const legs = near ? Math.max(legThrough(mine, theirs, "R").pen, legThrough(mine, theirs, "L").pen) : -1;
      pl[key] = { state: supportAt(p, t), commit: committedAt(p, t), anchors, sce: Math.max(0, ...anchors.map((a) => a.sce)), corr: e ? e[key].slice() : [0, 0], push: e ? e["d" + key].slice() : [0, 0], legPen: legs }; }
    T.set(k, { va, vd, P, g, mres, nrm, pl }); }
  // (every ball contact: the playing leg against the opponent's body at that tick — THROUGH beyond the hard limit, AMBIGUOUS within it)
  const cons = []; for (const c of Wd.contactLog) { if (c.k < k0 || c.k > k1) continue; const who = c.by === "ATT" ? Wd.att : Wd.def, F = c.kind === "tackle" ? Wd.tk.act && Wd.tk.act.F : (who.contacts.find((x) => x.k === c.k && !x.missed) || {}).F, x = T.get(c.k); if (!F || !x) continue;
    const lt = legThrough(c.by === "ATT" ? x.va : x.vd, c.by === "ATT" ? x.vd : x.va, F); cons.push({ k: c.k, t: c.t, by: c.by, kind: c.kind, role: c.role, F, lt, verdict: lt.pen > OCC.hard ? "THROUGH" : lt.pen > OCC.tol ? "AMBIGUOUS" : "CLEAR" }); }
  const occ = Wd.occ && Wd.occOn ? new Map(Wd.occ.log.map((x) => [x.k, x])) : null;
  return { m, r, W: Wd, out: outcomeO2(Wd), k0, k1, T, pen, run, best, bestK, over, per, cons, occ, sceMax, ms: performance.now() - c0 }; }
// (where each stage's world placement first differs from the untouched reference (OLD), per player: the root, the same tick)
function divergence(C) { const O = C.runs.OLD.W, out = {}; for (const m of ["S1", "S2"]) { const S = C.runs[m].W, R = C.runs[m]; out[m] = {};
    for (const [key, a, b] of [["ATT", O.att, S.att], ["DEF", O.def, S.def]]) { let kd = null; for (let k = R.k0; k <= Math.min(R.k1, C.runs.OLD.k1); k++) { const t = k * DT, p = a.stateAt(t).P, q = b.stateAt(t).P; if (hyp(p[0] - q[0], p[1] - q[1]) > 1e-4) { kd = k; break; } } out[m][key] = kd; } } return out; }
function simulate(tc) { const runs = {}; for (const m of MODES) runs[m] = simMode(tc, m); const C = { tc, runs, t0: runs.OLD.r.t0, clip: [Math.min(...MODES.map((m) => runs[m].r.clip[0])), Math.max(...MODES.map((m) => runs[m].r.clip[1]))] }; C.div = divergence(C); return C; }
const shown = () => (L.layout === "3" ? MODES : L.layout === "12" ? ["S1", "S2"] : [L.layout]);
function frameAt(R, t) { const k = clamp(Math.round(t / DT), R.k0, R.k1); let fr = R.W.frames.get(k), kk = k; while (!fr && kk > R.k0) fr = R.W.frames.get(--kk); return { k: kk, fr, x: R.T.get(kk), ball: R.W.trueTrack(kk * DT) }; }
const rowText = (C) => MODES.map((m) => { const R = C.runs[m]; return `${MNAME[m]} ${(Math.max(0, R.best) * 100).toFixed(1)}${m !== "OLD" ? ` sce ${(R.sceMax * 100).toFixed(0)}` : ""}${R.out ? " · " + (SHORT[R.out.kind] || R.out.kind) : ""}`; }).join("  ");
// ── the case list ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function buildList() { const box = $("cases"); box.innerHTML = ""; let g = null;
  for (const tc of L.cases) { if (tc.group !== g) { g = tc.group; const h = document.createElement("h3"); h.textContent = g; box.appendChild(h); }
    const b = document.createElement("button"); b.className = "c"; b.dataset.id = tc.id; b.innerHTML = `${tc.name}<span class="o" id="o_${tc.id}">${L.done.has(tc.id) ? rowText(L.done.get(tc.id)) : "…"}</span>`; b.onclick = () => select(tc.id); box.appendChild(b); } }
function markList() { for (const b of document.querySelectorAll("#cases .c")) b.classList.toggle("on", L.cur && b.dataset.id === L.cur.tc.id); }
function select(id, o = {}) { const tc = L.cases.find((x) => x.id === id); if (!tc) return; let C = L.done.get(id); if (!C) { C = simulate(tc); L.done.set(id, C); } L.cur = C; const el = $("o_" + id); if (el) el.textContent = rowText(C);
  L.t = C.clip[0]; L.playing = !o.paused; markList(); writeDiag(); drawTimeline(); try { history.replaceState(null, "", `?case=${id}&layout=${L.layout}&cam=${L.cam}&show=${L.show}`); } catch (e) {} }
// ═══ THE VIEWS ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function rects(w, h) { const n = shown().length; return Array.from({ length: n }, (_, i) => [i * w / n, 0, w / n, h]); }
// (the cameras: framed on both players of that run (their midpoint over the last 0.4 s), oriented by the carrier's heading at t = 0 — the same
// for every mode, so the three are seen from the same side)
function camera(C, R, Fr, vw, vh) { const h0 = C.runs.OLD.r.enc.att0.h, fw = [Math.cos(h0), Math.sin(h0)], rt = [-Math.sin(h0), Math.cos(h0)];
  let m = [0, 0], n = 0; for (let kk = Fr.k - 96; kk <= Fr.k; kk += 8) { const f = R.W.frames.get(clamp(kk, R.k0, R.k1)); if (!f) continue; m[0] += f.a.P[0] + f.d.P[0]; m[1] += f.a.P[1] + f.d.P[1]; n += 2; } m = n ? [m[0] / n, m[1] / n] : [Fr.fr.a.P[0], Fr.fr.a.P[1]];
  const sep = hyp(Fr.fr.a.P[0] - Fr.fr.d.P[0], Fr.fr.a.P[1] - Fr.fr.d.P[1]), D = clamp(3.0 + 0.9 * sep, 3.6, 9.5) * (vw / vh < 0.6 ? 1.5 : vw / vh < 0.9 ? 1.25 : 1), at = (a, l, h) => A3([m[0] + fw[0] * a + rt[0] * l, m[1] + fw[1] * a + rt[1] * l], h);
  let eye, tgt = A3(m, 0.75), up = [0, 1, 0], fov = 40;
  switch (L.cam) { case "front": eye = at(D, 0, 1.3); break; case "rear": eye = at(-D, 0, 1.5); break; case "sideL": eye = at(0, -D, 1.2); break; case "sideR": eye = at(0, D, 1.2); break;
    case "q3f": eye = at(D * 0.72, D * 0.72, 1.9); break; case "q3r": eye = at(-D * 0.72, -D * 0.72, 2.0); break; case "top": eye = A3(m, 7.5 * (vw / vh < 0.9 ? 1.3 : 1)); up = [fw[0], 0, -fw[1]]; tgt = A3(m, 0); fov = 36; break;
    default: eye = A3([m[0], m[1] - 15.5], 8.2); tgt = A3(m, 0.4); fov = vw / vh < 0.6 ? 17 : vw / vh < 0.9 ? 21 : 26; }
  const view = lookAt(eye, tgt, up); return { view, proj: persp(1 / Math.tan(fov / 2 * DEG), vw / vh, 0.1, 300), right: [view[0], -view[8], view[4]] }; }
function proj3(c, p, x0, y0, w, h) { const v = M4.transformPoint(c.view, p), pr = c.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], ww = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (ww <= 1e-4) return null; return [x0 + (cx / ww * 0.5 + 0.5) * w, y0 + (0.5 - cy / ww * 0.5) * h]; }
function layoutDom() { const top = $("bar").getBoundingClientRect().height + "px"; $("stage").style.top = top; $("cases").style.top = top; $("diag").style.top = top; document.body.classList.toggle("diag", L.diag); }
function render() { const C = L.cur; if (!C) return; layoutDom(); const gl = L.gl, cv = $("gl"), ov = $("ov"), st = $("stage").getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(st.width * dpr), h = Math.round(st.height * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; ov.width = w; ov.height = h; cv.style.width = ov.style.width = st.width + "px"; cv.style.height = ov.style.height = st.height + "px"; }
  const x = ov.getContext("2d"); x.clearRect(0, 0, w, h); gl.enable(gl.SCISSOR_TEST); gl.clearColor(0.06, 0.08, 0.07, 1); gl.scissor(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const M = shown(), RS = rects(w, h);
  M.forEach((m, i) => { const R = C.runs[m], [rx, ry, rw, rh] = RS[i].map(Math.round), Fr = frameAt(R, L.t); if (!Fr.fr) return; const c = camera(C, R, Fr, rw, rh), B = Fr.ball.p, F = Fr.fr;
    gl.viewport(rx, h - ry - rh, rw, rh); gl.scissor(rx, h - ry - rh, rw, rh); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    const sh = new Float32Array(32); let ns = 0; const push = (a, b, s, al) => { sh.set([a, b, s, al], ns * 4); ns++; }; push(F.a.P[0], F.a.P[1], 0.42, 0.4); push(F.d.P[0], F.d.P[1], 0.42, 0.4); if (L.ball) push(B[0], B[1], 0.12, 0.6);
    const G = L.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, c.view); gl.uniformMatrix4fv(G.u.proj, false, c.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    if (L.show !== "skel") { drawChar(F.a.skin, c.view, c.proj, ATT_TINT); drawChar(F.d.skin, c.view, c.proj, DEF_TINT); }
    if (L.ball) { const P = L.ballP; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.view, false, c.view); gl.uniformMatrix4fv(P.u.proj, false, c.proj); gl.uniform3fv(P.u.c, A3(B)); gl.uniform4fv(P.u.q, QA(Fr.ball.q)); gl.uniform1f(P.u.r, 0.11); gl.bindVertexArray(P.vao); gl.drawElements(gl.TRIANGLES, P.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); }
    const pr = (p) => proj3(c, A3(p, p[2]), rx, ry, rw, rh); x.save(); x.beginPath(); x.rect(rx, ry, rw, rh); x.clip();
    if (L.show !== "skin") for (const [J, col] of [[F.a.J, COL.ATT], [F.d.J, COL.DEF]]) { x.strokeStyle = col; x.lineWidth = 2.5 * dpr; for (const kk of Object.keys(J)) { const a = pr(J[kk].j), b = pr(J[kk].t); if (a && b) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); } } }
    if (Fr.x) { if (L.vol) volumes(x, pr, c, dpr, Fr.x); if (L.nrm) normals(x, pr, dpr, Fr.x, F); if (L.anc) anchors(x, pr, dpr, Fr.x, F); if (L.cor) corrections(x, pr, dpr, Fr.x, F); }
    if (L.acc) access(x, pr, dpr, R, Fr, rx + rw);
    label(x, dpr, R, Fr, rx, ry, rw, rh, C); if (M.length > 1) { x.strokeStyle = "#2a3530"; x.lineWidth = 2 * dpr; x.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2); } x.restore(); });
  gl.disable(gl.SCISSOR_TEST); }
// ── THE CAPSULES: each drawn as its silhouette, coloured by its deepest pair this tick: normal · contact (gap within 0.5 cm) · penetrating
// (beyond the 2 cm tolerance) · deep (beyond the 5 cm hard limit). The upper arms and feet are detected only (outlines) ──
function capsulePath(x, a, b, r) { const dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy); x.beginPath(); if (l < 1e-3) { x.arc(a[0], a[1], r, 0, 2 * Math.PI); return; } const g = Math.atan2(dy, dx);
  x.arc(b[0], b[1], r, g - Math.PI / 2, g + Math.PI / 2); x.arc(a[0], a[1], r, g + Math.PI / 2, g + 1.5 * Math.PI); x.closePath(); }
function volumes(x, pr, c, dpr, X) { const st = new Map(); for (const p of X.P) for (const [side, id] of [["a", p.A], ["d", p.B]]) { const key = side + id; if (!st.has(key) || p.pen > st.get(key)) st.set(key, p.pen); }
  const cls = (pen) => (pen == null || pen < -0.005 ? "normal" : pen <= OCC.tol ? "contact" : pen <= OCC.hard ? "pen" : "deep");
  for (const [side, V] of [["a", X.va], ["d", X.vd]]) for (const v of V) { const a = pr(v.a), b = pr(v.b), e = pr([v.a[0] + c.right[0] * v.r, v.a[1] + c.right[1] * v.r, v.a[2] + c.right[2] * v.r]); if (!a || !b || !e) continue;
    const rp = hyp(e[0] - a[0], e[1] - a[1]), k = cls(st.get(side + v.id)), res = RESOLVED.has(v.id); capsulePath(x, a, b, rp);
    if (res || k !== "normal") { x.fillStyle = COL[k]; x.fill(); } x.strokeStyle = COL[k + "Line"]; x.lineWidth = (k === "normal" ? 1.2 : 2) * dpr; if (!res) x.setLineDash([5 * dpr, 4 * dpr]); x.stroke(); x.setLineDash([]); } }
function arrow(x, a, b, col, dpr, w = 2) { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = w * dpr; x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 6 * dpr;
  x.beginPath(); x.moveTo(...b); x.lineTo(b[0] - s * Math.cos(ang - 0.45), b[1] - s * Math.sin(ang - 0.45)); x.lineTo(b[0] - s * Math.cos(ang + 0.45), b[1] - s * Math.sin(ang + 0.45)); x.fill(); }
// ── THE CONTACT NORMALS: every pair within 1 cm, an arrow from its contact point along the separating direction (defender → carrier), the depth;
// and the AGGREGATE normal on the ground between the roots (white) with the tangent (dashed) ──
function normals(x, pr, dpr, X, F) { for (const p of X.P) { if (p.pen < -0.01) continue; const a = pr(p.at), b = pr([p.at[0] + p.n[0] * 0.22, p.at[1] + p.n[1] * 0.22, p.at[2] + p.n[2] * 0.22]); if (!a || !b) continue;
    const col = p.pen > OCC.hard ? COL.deepLine : p.pen > OCC.tol ? COL.penLine : COL.contactLine; arrow(x, a, b, col, dpr); if (p.pen > OCC.tol) { x.font = `${10 * dpr}px Menlo`; x.fillText(`${(p.pen * 100).toFixed(1)}`, a[0] + 5 * dpr, a[1] - 5 * dpr); } }
  if (X.nrm && X.mres > -0.01) { const m = [(F.a.P[0] + F.d.P[0]) / 2, (F.a.P[1] + F.d.P[1]) / 2, 0.02], n = X.nrm.n, a = pr(m), b = pr([m[0] + n[0] * 0.45, m[1] + n[1] * 0.45, 0.02]), t0 = pr([m[0] - n[1] * 0.35, m[1] + n[0] * 0.35, 0.02]), t1 = pr([m[0] + n[1] * 0.35, m[1] - n[0] * 0.35, 0.02]);
    if (a && b) arrow(x, a, b, "#ffffff", dpr, 2.5); if (t0 && t1) { x.strokeStyle = "rgba(255,255,255,0.7)"; x.lineWidth = 1.5 * dpr; x.setLineDash([6 * dpr, 4 * dpr]); x.beginPath(); x.moveTo(...t0); x.lineTo(...t1); x.stroke(); x.setLineDash([]); } } }
// ── THE SUPPORT ANCHORS: each planted foot's authored world position (a ring on the ground, the player's colour); when the root has been moved
// while that foot stayed planted, the SUPPORT CONSISTENCY ERROR: a line to where the moved body implies its support (the anchor + the root's
// displacement since the landing) with its length — 0 for a body never dragged off its feet ──
function anchors(x, pr, dpr, X, F) { for (const [key, J] of [["ATT", F.a.J], ["DEF", F.d.J]]) { const P = X.pl[key]; if (!P) continue; const col = key === "ATT" ? COL.ATT : COL.DEF;
    for (const a of P.anchors) { const pos = a.pos || [J["toe_" + a.X].j[0], J["toe_" + a.X].j[1]]; x.strokeStyle = P.state === "COMMITTED PLANT" ? COL.anchor : col; x.lineWidth = 2 * dpr; x.beginPath(); for (let i = 0; i <= 20; i++) { const g = i / 20 * 2 * Math.PI, q = pr([pos[0] + 0.09 * Math.cos(g), pos[1] + 0.09 * Math.sin(g), 0.005]); if (!q) continue; if (i) x.lineTo(...q); else x.moveTo(...q); } x.stroke();
      if (a.sce > 0.005) { const p0 = pr([pos[0], pos[1], 0.005]), p1 = pr([pos[0] + a.v[0], pos[1] + a.v[1], 0.005]); if (p0 && p1) { const c2 = a.sce > 0.10 ? COL.deepLine : a.sce > 0.03 ? COL.warn : COL.contactLine; x.strokeStyle = c2; x.lineWidth = 2 * dpr; x.setLineDash([4 * dpr, 3 * dpr]); x.beginPath(); x.moveTo(...p0); x.lineTo(...p1); x.stroke(); x.setLineDash([]);
          x.fillStyle = c2; x.font = `600 ${10 * dpr}px -apple-system, Helvetica, sans-serif`; x.fillText(`SCE ${(a.sce * 100).toFixed(1)} cm`, p1[0] + 4 * dpr, p1[1] + 12 * dpr); } } } } }
// ── THE ROOT CORRECTION VECTOR: what occupancy moved each root by at this tick (executed: push + the soft wall's path change), drawn ×20 from the
// root on the ground ──
function corrections(x, pr, dpr, X, F) { for (const [key, P] of [["ATT", F.a.P], ["DEF", F.d.P]]) { const p = X.pl[key]; if (!p) continue; const v = p.corr, m = hyp(v[0], v[1]); if (m < 2e-4) continue; const a = pr([P[0], P[1], 0.03]), b = pr([P[0] + v[0] * 20, P[1] + v[1] * 20, 0.03]); if (!a || !b) continue;
    arrow(x, a, b, key === "ATT" ? "#3fe0ff" : "#ff6a3d", dpr, 3); x.font = `600 ${10 * dpr}px Menlo`; x.fillStyle = key === "ATT" ? "#3fe0ff" : "#ff6a3d"; x.fillText(`${(m * 100).toFixed(1)} cm`, b[0] + 4 * dpr, b[1] - 4 * dpr); } }
// ── THE BALL-ACCESS PATH: the ball's last 0.4 s; every ball contact within 0.4 s of the playhead — the playing leg bold, against the opponent's
// body: THROUGH (the ball reached through him) / AMBIGUOUS / CLEAR; under occupancy the touches and boots BLOCKED ──
function access(x, pr, dpr, R, Fr, xMax) { const k = Fr.k, t = k * DT; x.strokeStyle = "rgba(255,255,255,0.55)"; x.lineWidth = 1.5 * dpr; x.beginPath(); let first = true;
  for (let kk = k - 96; kk <= k; kk += 4) { const b = R.W.trueTrack(Math.max(R.k0, kk) * DT).p, q = pr([b[0], b[1], Math.max(0.02, b[2] || 0)]); if (!q) continue; if (first) { x.moveTo(...q); first = false; } else x.lineTo(...q); } x.stroke();
  const legOf = (J, F) => [[J["thigh_" + F].j, J["thigh_" + F].t], [J["shin_" + F].j, J["shin_" + F].t], [J["foot_" + F].j, J["foot_" + F].t]];
  const ev = []; for (const c of R.cons) if (t >= c.t - 0.05 && t <= c.t + 0.4) ev.push({ k: c.k, by: c.by, F: c.F, what: `${c.by} ${c.kind === "tackle" ? "TACKLE BOOT" : (c.role || "touch").toUpperCase()}`, verdict: c.verdict, pen: c.lt.pen, body: c.lt.B });
  if (R.W.occOn) for (const e of R.W.occ.events) if (/BLOCKED/.test(e.kind) && t >= e.t - 0.05 && t <= e.t + 0.4) ev.push({ k: e.k, by: e.who, F: e.F, what: e.kind + (e.held ? " · move held" : ""), verdict: "BLOCKED", pen: e.through.pen, body: e.through.body });
  for (const e of ev) { const fr = R.W.frames.get(e.k) || Fr.fr, J = e.by === "ATT" ? fr.a.J : fr.d.J; if (!e.F || !J["thigh_" + e.F]) continue; const col = e.verdict === "THROUGH" ? COL.deepLine : e.verdict === "BLOCKED" ? COL.blocked : e.verdict === "AMBIGUOUS" ? COL.penLine : (e.by === "ATT" ? COL.ATT : COL.DEF);
    x.strokeStyle = col; x.lineWidth = 4 * dpr; x.lineCap = "round"; for (const [a0, b0] of legOf(J, e.F)) { const a = pr(a0), b = pr(b0); if (a && b) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); } } x.lineCap = "butt";
    const p = pr(J["foot_" + e.F].t); if (!p) continue; const s = e.verdict === "CLEAR" ? `${e.what} · around his body` : `${e.what} · ${e.verdict}${e.verdict === "BLOCKED" ? " — the leg was" : " — the leg"} ${(e.pen * 100).toFixed(0)} cm inside his ${e.body}`;
    x.font = `600 ${10.5 * dpr}px -apple-system, Helvetica, sans-serif`; const tw = x.measureText(s).width, lx = Math.min(p[0] + 6 * dpr, xMax - tw - 14 * dpr); x.fillStyle = "rgba(13,18,16,0.82)"; x.fillRect(lx, p[1] + 4 * dpr, tw + 8 * dpr, 16 * dpr); x.textBaseline = "alphabetic"; x.fillStyle = col; x.fillText(s, lx + 4 * dpr, p[1] + 16 * dpr); } }
// ── THE VIEW'S FRAME DATA (top-left): the mode; penetration now and its region; the normal / tangent; per player: support state, commitment,
// support error, root correction, ball access; Stage 2's classification of an unresolved tick ──
const cmf = (v) => (v * 100).toFixed(1);
function frameLines(R, Fr, C) { const X = Fr.x, now = X ? X.mres : -1, so = R.run[clamp(Fr.k - R.k0, 0, R.run.length - 1)], col = (v) => (v > OCC.hard ? COL.deepLine : v > OCC.tol ? COL.penLine : v > -0.005 ? COL.contactLine : "#8dffa6");
  const top = X && X.P.filter((p) => p.both).sort((a, b) => b.pen - a.pen)[0], o = R.occ ? R.occ.get(Fr.k) : null;
  const lines = [[`${MNAME[R.m]} · ${O2_LABEL[R.m].split(" · ").slice(1).join(" · ")}`, "#ffd45e", 700], [`NOW  ${now > 0 ? `${cmf(now)} cm penetration` : now > -0.005 ? "touching" : "apart"}${top && now > -0.005 ? `  ·  ${CLS5(top.A, top.B)} (${top.A} ↔ ${top.B})` : ""}`, col(now), 600],
    [`REPLAY max ${cmf(Math.max(0, so))} cm · run ${cmf(Math.max(0, R.best))} cm`, col(so), 500]];
  if (!L.hud || !X) return lines;
  if (X.nrm && now > -0.03) lines.push([`NORMAL closing ${X.nrm.vn.toFixed(2)} m/s · TANGENT ${X.nrm.vt.toFixed(2)} m/s`, "#e6efe9", 500]);
  for (const key of ["ATT", "DEF"]) { const p = X.pl[key]; if (!p) continue; const acc = p.legPen > OCC.hard ? (R.m === "OLD" ? "OPEN THROUGH HIS BODY" : "BLOCKED") : "CLEAR", cm2 = hyp(p.corr[0], p.corr[1]);
    lines.push([`${key === "ATT" ? "CARRIER " : "DEFENDER"}  ${p.state}${p.commit ? " · " + p.commit : ""}`, key === "ATT" ? COL.ATT : COL.DEF, 600]);
    lines.push([`   support error ${cmf(p.sce)} cm · root correction ${cmf(cm2)} cm · ball access ${acc}`, p.sce > 0.10 || acc !== "CLEAR" ? COL.warn : "#b8c8bf", 500]); }
  if (o && o.conflict) lines.push(["CONFLICT · both committed — " + o.act.join(" · "), COL.warn, 600]);
  if (o && o.unresolved) lines.push([(/^UNRESOLVED/.test(o.unresolved) ? "" : "UNRESOLVED · ") + o.unresolved + (o.supportLimited ? ` (${o.supportLimited.filter(Boolean).join(" / ")})` : ""), COL.warn, 600]);
  else if (!R.occ && now > OCC.hard) lines.push(["NO PLAYER OCCUPANCY — the bodies pass through", COL.deepLine, 600]);
  if (R.m !== "OLD" && C.div && C.div[R.m]) { const d = C.div[R.m], s = ["ATT", "DEF"].filter((k) => d[k] != null).map((k) => `${k} ${d[k] <= Fr.k ? "differs" : "same"} (from ${((d[k] * DT) - C.t0).toFixed(3)} s)`); lines.push([`WORLD PLACEMENT vs OLD: ${s.length ? s.join(" · ") : "identical"}`, "#8fa49a", 500]); }
  return lines; }
function label(x, dpr, R, Fr, rx, ry, rw, rh, C) { const raw = frameLines(R, Fr, C), f = (n) => `${n * dpr}px -apple-system, Helvetica, sans-serif`; let y = ry + 8 * dpr; x.textBaseline = "top";
  const fs = (wt) => (wt === 700 ? 12.5 : 10.8), maxW = rw - 30 * dpr, lines = [];
  // (a line wider than the view wraps at its " · " separators — a narrow view (three side by side) keeps every quantity readable)
  for (const [s, c, wt] of raw) { x.font = `${wt} ${f(fs(wt))}`; if (x.measureText(s).width <= maxW) { lines.push([s, c, wt]); continue; } const parts = s.split(" · "); let cur = "";
    for (const q of parts) { const nx = cur ? cur + " · " + q : q; if (cur && x.measureText(nx).width > maxW) { lines.push([cur, c, wt]); cur = "   " + q; } else cur = nx; } if (cur) lines.push([cur, c, wt]); }
  const bw = Math.min(rw - 16 * dpr, Math.max(...lines.map(([s, , wt]) => { x.font = `${wt} ${f(fs(wt))}`; return x.measureText(s).width; })) + 14 * dpr);
  x.fillStyle = "rgba(13,18,16,0.80)"; x.fillRect(rx + 8 * dpr, y - 4 * dpr, bw, lines.length * 14.5 * dpr + 6 * dpr);
  for (const [s, c, wt] of lines) { x.font = `${wt} ${f(fs(wt))}`; x.fillStyle = c; x.fillText(s, rx + 14 * dpr, y); y += 14.5 * dpr; } void rh; }
// ═══ THE DIAGNOSTICS (the three modes' records + the selected mode at the playhead, every per-frame quantity) ═══════════════════════════════════
function writeDiag() { const C = L.cur, el = $("diag"); el.classList.toggle("hidden", !L.diag); if (!L.diag || !C) return; const t = L.t, t0 = C.t0, rel = (x) => `${x - t0 >= 0 ? "+" : ""}${(x - t0).toFixed(3)}`, cm = cmf;
  const lines = [`<b>${C.tc.name}</b>`, `<span class="k">${C.tc.group} · attacker ${C.tc.c.tech} · ${C.tc.c.variant} · tackle request ${(C.tc.tackle || []).join(", ") || "none"} · Reaction MEDIUM 0.200 s · POKE untuned</span>`, ""];
  for (const m of MODES) { const R = C.runs[m], O = R.W.occOn ? R.W.occ : null, th = R.cons.filter((c) => c.verdict === "THROUGH");
    lines.push(`<b>${O2_LABEL[m]}</b>  <span class="k">(simulated in ${R.ms.toFixed(0)} ms)</span>`, `  outcome  ${R.out ? R.out.kind : "— (no tackle committed)"}`,
      `  deepest  ${R.best > OCC.hard ? '<span class="bad">' : R.best > OCC.tol ? '<span class="warn">' : '<span class="ok">'}${cm(Math.max(0, R.best))} cm</span> at ${R.bestK != null ? rel(R.bestK * DT) : "—"} · ticks > 2 cm ${R.over.tol} · > 5 cm ${R.over.hard}`,
      `  per region  ${Object.entries(R.per).map(([g, v]) => `${g === "TRUNK" ? "TORSO/PELVIS" : g} ${cm(Math.max(0, v))}`).join(" · ")} <span class="k">(arms, feet: detected only)</span>`,
      `  ball contacts  ${R.cons.length} · THROUGH a body ${th.length ? `<span class="bad">${th.length}</span>` : "0"}${th.length ? " — " + th.map((c) => `${rel(c.t)} ${c.by} ${c.kind} ${c.F} ${cm(c.lt.pen)} cm in his ${c.lt.B}`).join("; ") : ""}`);
    if (O) lines.push(`  support consistency error (largest, one planted stance)  ${R.sceMax > 0.10 ? '<span class="bad">' : R.sceMax > 0.03 ? '<span class="warn">' : '<span class="ok">'}${cm(R.sceMax)} cm</span>`,
      `  corrections  carrier ${(R.W.att.occShift || 0).toFixed(2)} m · defender ${(R.W.def.occShift || 0).toFixed(2)} m (summed) · conflicts ${O.conflicts} · blocked ${O.blocked}${O.held ? ` · moves held ${O.held}` : ""}${O.unresolved ? ` · unresolved ticks ${Object.entries(O.unresolved).map(([k, v]) => `${k} ${v}`).join(", ")}` : ""}`);
    if (m !== "OLD" && C.div) lines.push(`  world placement first differs from OLD  carrier ${C.div[m].ATT != null ? rel(C.div[m].ATT * DT) : "never"} · defender ${C.div[m].DEF != null ? rel(C.div[m].DEF * DT) : "never"}`);
    lines.push(""); }
  const R = C.runs[L.mode], Fr = frameAt(R, t), X = Fr.x; lines.push(`<b>AT THE PLAYHEAD</b>  t ${rel(t)} s · tick ${Fr.k} · ${MNAME[L.mode]} <span class="k">(1 / 2 / 3 select · 4 all three)</span>`);
  if (X) { const P = X.P.filter((p) => p.pen > -0.01).sort((a, b) => b.pen - a.pen).slice(0, 7);
    lines.push(`  <b>CONTACT REGIONS · PENETRATION</b>`, P.length ? P.map((p) => `  ${CLS5(p.A, p.B).padEnd(28)} ${(p.A + " ↔ " + p.B).padEnd(18)} ${p.pen > 0 ? (p.pen > OCC.hard ? '<span class="bad">' : p.pen > OCC.tol ? '<span class="warn">' : "<span>") + cm(p.pen) + " cm in</span>" : "gap " + cm(-p.pen) + " cm"} ${p.both ? "" : '<span class="k">(detected only)</span>'}`).join("\n") : "  no volumes within 1 cm");
    if (X.nrm) lines.push(`  <b>NORMAL</b> (defender → carrier) [${X.nrm.n.map((v) => v.toFixed(2)).join(", ")}] · relative motion: closing ${X.nrm.vn.toFixed(2)} m/s on the normal · ${X.nrm.vt.toFixed(2)} m/s along the TANGENT`);
    for (const key of ["ATT", "DEF"]) { const p = X.pl[key]; if (!p) continue; const acc = p.legPen > OCC.hard ? (L.mode === "OLD" ? `OPEN THROUGH HIS BODY (a leg ${cm(p.legPen)} cm in — OLD does not gate it)` : `BLOCKED (a leg ${cm(p.legPen)} cm inside his body)`) : "CLEAR";
      lines.push(`  <b>${key === "ATT" ? "CARRIER" : "DEFENDER"}</b>  ${p.state} · action commitment ${p.commit || "none"}`, `     ROOT CORRECTION executed ${cm(hyp(p.corr[0], p.corr[1]))} cm (pushed ${cm(hyp(p.push[0], p.push[1]))}) · SUPPORT ERROR ${cm(p.sce)} cm${p.anchors.length ? " (" + p.anchors.map((a) => `${a.X} ${cm(a.sce)}`).join(", ") + ")" : " (no foot planted)"} · BALL ACCESS ${acc}`); } }
  if (R.occ) { const o = R.occ.get(Fr.k); if (o) { const d = (v) => `${(hyp(v[0], v[1]) * 100).toFixed(2)} cm`;
      lines.push("", `<b>THE SOLVER AT THIS TICK</b>`, `  planted feet  carrier ${o.sup[0]} · defender ${o.sup[1]}${o.state ? ` · support state ${o.state.join(" · ")}` : ""}`, `  actions  ${o.act.join(" · ")}`, `  committed  ${o.committed.map((c) => c || "—").join(" · ")}${o.conflict ? ' <span class="warn">CONFLICT</span>' : ""}`,
        `  approach  ${o.approach ? o.approach.join(" / ") + " m/s" : "—"} · share ${o.share ? o.share.join(" / ") : "—"}${o.limb ? ` · fast-limb pairs ${o.limb}` : ""}`, `  root correction (pushed)  carrier ${d(o.dA)} · defender ${d(o.dD)}${o.wA || o.wD ? ` · soft wall ${((o.wA || 0) * 100).toFixed(1)} / ${((o.wD || 0) * 100).toFixed(1)} cm (planned path)` : ""}`,
        o.supportLimited ? `  <span class="warn">support-limited: ${o.supportLimited.map((w) => w || "—").join(" · ")} — ${cm(o.left || 0)} cm not applied</span>` : "",
        o.pairs && o.pairs.length && o.pairs[0].tier ? `  tiers  ${o.pairs.slice(0, 4).map((q) => `${q.A}↔${q.B} ${q.tier}${q.vc ? ` ${q.vc} m/s` : ""}`).join(" · ")}` : "",
        o.sce && o.sce.length ? `  stance ledgers  ${o.sce.map((s) => `${s.who} ${s.X} push ${cm(s.push)} total ${cm(s.total)}${s.committed ? " (committed)" : ""}`).join(" · ")}` : "",
        o.foot && o.foot.length ? `  footholds  ${o.foot.map((f) => `${f.who} ${f.foot} ${f.kind || "moved clear of " + f.clearOf} by ${(f.by * 100).toFixed(1)} cm (lands in ${f.landsIn} s)`).join("; ")}` : "",
        o.legConflict ? `  <span class="warn">leg conflict (planted lower legs): ${o.legConflict.map((c) => c.A + "↔" + c.B).join(", ")}</span>` : "", o.unresolved ? `  <span class="warn">UNRESOLVED: ${o.unresolved}</span>` : ""); }
    else lines.push("", `<span class="k">occupancy: the roots beyond the broad phase (${OCC.broad} m) — nothing evaluated</span>`); }
  if (R.W.occOn && R.W.occ.events.length) { lines.push("", `<b>OCCUPANCY EVENTS</b>`); for (const e of R.W.occ.events.slice(0, 24)) lines.push(`  ${rel(e.t)} ${e.kind}${e.who ? " · " + e.who : ""}${e.what ? " · " + e.what : ""}${e.through ? ` — the leg ${cm(e.through.pen)} cm in his ${e.through.body}${e.through.now ? " (at the contact's own tick)" : ""}` : ""}${e.held ? " · the move held to its release" : ""}${e.pen != null ? (e.pen >= 0 ? ` (${cm(e.pen)} cm deep)` : ` (gap ${cm(-e.pen)} cm)`) : ""}`); }
  lines.push("", `<span class="k">Stage 2: tolerance ${RES2.coreTol * 100} cm · hard limit ${RES2.hard * 100} cm · committed ≤ ${RES2.commitPlant * 100} cm per plant, ${RES2.commitAir * 100} cm per flight, ${RES2.commitTotal * 100} cm per commitment · lean ${RES2.lean * 100} cm per stance inside the leg's reach · fast limb > ${RES2.vFast} m/s (classified, resolved at the leg rate) · torso ≤ ${RES2.rMax * 100} cm / tick, legs ≤ ${RES2.legCap * 100} · look-ahead ${RES2.look} ticks</span>`);
  el.innerHTML = lines.filter((s) => s !== "").join("\n"); }
// ═══ THE TIMELINE: one lane per mode — the deepest resolved penetration per tick (0 – 25 cm), contacts, blocks, conflicts, unresolved, and where
// the world placement first differs from OLD ═══════════════════════════════════════════════════════════════════════════════════════════════════
function drawTimeline() { const C = L.cur; if (!C) return; const cv = $("tlc"), lh = 30; $("tl").style.height = (MODES.length * lh + 22) + "px"; $("stage").style.bottom = (MODES.length * lh + 22) + "px";
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const x = cv.getContext("2d"), [a, b] = C.clip, LW = 78 * dpr, X = (t) => LW + (t - a) / (b - a) * (cv.width - LW - 10 * dpr); x.fillStyle = "#151d19"; x.fillRect(0, 0, cv.width, cv.height);
  MODES.forEach((m, i) => { const R = C.runs[m], y = (4 + i * lh) * dpr, hh = (lh - 8) * dpr; x.fillStyle = shown().includes(m) ? "#ffd45e" : "#8fa49a"; x.font = `600 ${10.5 * dpr}px -apple-system, Helvetica, sans-serif`; x.textBaseline = "middle"; x.fillText(MNAME[m], 6 * dpr, y + hh / 2);
    x.fillStyle = "#1c2621"; x.fillRect(X(a), y, X(b) - X(a), hh); const yy = (v) => y + hh - clamp(v / 0.25, 0, 1) * hh;
    for (const [v, c] of [[OCC.tol, "rgba(255,212,94,0.35)"], [OCC.hard, "rgba(255,45,85,0.45)"]]) { x.fillStyle = c; x.fillRect(X(a), yy(v), X(b) - X(a), 1 * dpr); }
    for (let k = R.k0; k <= R.k1; k++) { const v = R.pen[k - R.k0]; if (v <= 0) continue; x.fillStyle = v > OCC.hard ? COL.deepLine : v > OCC.tol ? COL.penLine : COL.contactLine; x.fillRect(X(k * DT), yy(v), Math.max(1, X((k + 1) * DT) - X(k * DT)), y + hh - yy(v)); }
    for (const c of R.cons) { x.fillStyle = c.kind === "tackle" ? "#ffffff" : c.by === "ATT" ? COL.ATT : COL.DEF; x.fillRect(X(c.t) - 1 * dpr, y - 2 * dpr, 2 * dpr, 5 * dpr); }
    if (R.occ) { for (const e of R.W.occ.events) { if (!/BLOCKED/.test(e.kind)) continue; x.fillStyle = COL.blocked; x.beginPath(); x.arc(X(e.t), y + 3 * dpr, 3.5 * dpr, 0, 2 * Math.PI); x.fill(); }
      for (const [k, o] of R.occ) { if (o.conflict) { x.fillStyle = "rgba(255,179,107,0.9)"; x.fillRect(X(k * DT), y + hh - 2 * dpr, Math.max(1, X((k + 1) * DT) - X(k * DT)), 2 * dpr); } else if (o.unresolved) { x.fillStyle = "rgba(190,140,255,0.9)"; x.fillRect(X(k * DT), y + hh - 2 * dpr, Math.max(1, X((k + 1) * DT) - X(k * DT)), 2 * dpr); } }
      if (C.div && C.div[m]) for (const [key, kd] of Object.entries(C.div[m])) { if (kd == null) continue; x.fillStyle = key === "ATT" ? COL.ATT : COL.DEF; const xx = X(kd * DT); x.beginPath(); x.moveTo(xx - 4 * dpr, y); x.lineTo(xx + 4 * dpr, y); x.lineTo(xx, y + 6 * dpr); x.fill(); } } });
  x.fillStyle = "#8fa49a"; x.font = `${9.5 * dpr}px Menlo`; x.textBaseline = "bottom"; x.fillText("penetration 0–25 cm (2 / 5 cm lines) · ticks: contacts (white = tackle) · ● BLOCKED · ▬ conflict / ▬ unresolved · ▼ world placement first differs from OLD", LW, cv.height - 3 * dpr);
  x.strokeStyle = "#fff"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(X(L.t), 0); x.lineTo(X(L.t), cv.height - 14 * dpr); x.stroke(); }
// ── LOOP ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let diagT = 0;
function frame(now) { const dt = L.last != null ? Math.min(0.05, (now - L.last) / 1000) : 0; L.last = now; const C = L.cur;
  if (C && L.playing) { L.t += dt * L.rate; if (L.t >= C.clip[1]) { if (L.loop) L.t = C.clip[0]; else { L.t = C.clip[1]; L.playing = false; } } }
  render(); drawTimeline(); if (now - diagT > 120 || !L.playing) { writeDiag(); diagT = now; } $("bPlay").textContent = L.playing ? "❚❚ PAUSE" : "▶ PLAY"; if (!L.external) requestAnimationFrame(frame); }
function step(n) { const C = L.cur; L.playing = false; L.t = clamp(Math.round(L.t / DT + n) * DT, C.clip[0], C.clip[1]); }
function bindUI() {
  $("bPlay").onclick = () => { if (!L.playing && L.t >= L.cur.clip[1] - 1e-9) L.t = L.cur.clip[0]; L.playing = !L.playing; };
  $("bReplay").onclick = () => { L.t = L.cur.clip[0]; L.playing = true; }; $("bBack").onclick = (e) => step(e && e.shiftKey ? -1 : -4); $("bFwd").onclick = (e) => step(e && e.shiftKey ? 1 : 4);
  $("bLoop").onclick = () => { L.loop = !L.loop; $("bLoop").classList.toggle("on", L.loop); };
  for (const b of document.querySelectorAll("[data-rate]")) b.onclick = () => { L.rate = +b.dataset.rate; for (const y of document.querySelectorAll("[data-rate]")) y.classList.toggle("on", y === b); };
  for (const b of document.querySelectorAll("[data-layout]")) b.onclick = () => setLayout(b.dataset.layout);
  for (const b of document.querySelectorAll("[data-show]")) b.onclick = () => setShow(b.dataset.show);
  $("selCam").onchange = (e) => { L.cam = e.target.value; };
  const tog = (id, k, after) => { $(id).onclick = () => { L[k] = !L[k]; $(id).classList.toggle("on", L[k]); if (after) after(); }; };
  tog("bVol", "vol"); tog("bNrm", "nrm"); tog("bAnc", "anc"); tog("bCor", "cor"); tog("bAcc", "acc"); tog("bHud", "hud"); tog("bBall", "ball"); tog("bDiag", "diag", writeDiag);
  $("tlc").onclick = (e) => { const C = L.cur, r = e.target.getBoundingClientRect(), LW = 78, u = clamp((e.clientX - r.left - LW) / (r.width - LW - 10), 0, 1); L.t = Math.round((C.clip[0] + u * (C.clip[1] - C.clip[0])) / DT) * DT; L.playing = false; };
  window.addEventListener("keydown", (e) => { if (e.target.tagName === "SELECT") return; const k = e.key;
    if (k === " ") { e.preventDefault(); $("bPlay").onclick(); } else if (k === ",") step(e.shiftKey ? -1 : -4); else if (k === ".") step(e.shiftKey ? 1 : 4);
    else if (k === "v" || k === "V") $("bVol").onclick(); else if (k === "n" || k === "N") $("bNrm").onclick(); else if (k === "a" || k === "A") $("bAcc").onclick(); else if (k === "d" || k === "D") $("bDiag").onclick(); else if (k === "f" || k === "F") $("bAnc").onclick(); else if (k === "c" || k === "C") $("bCor").onclick(); else if (k === "h" || k === "H") $("bHud").onclick();
    else if (k === "s" || k === "S") setShow({ skin: "skel", skel: "both", both: "skin" }[L.show]); else if (k === "1") setMode("OLD"); else if (k === "2") setMode("S1"); else if (k === "3") setMode("S2"); else if (k === "4") setLayout("3"); }); window.addEventListener("resize", () => drawTimeline()); }
function setMode(m) { L.mode = m; if (L.layout !== "3") setLayout(m); writeDiag(); }
function setLayout(v) { L.layout = v; if (MODES.includes(v)) L.mode = v; for (const b of document.querySelectorAll("[data-layout]")) b.classList.toggle("on", b.dataset.layout === v); writeDiag(); drawTimeline(); }
function setShow(v) { L.show = v; for (const b of document.querySelectorAll("[data-show]")) b.classList.toggle("on", b.dataset.show === v); }
async function boot() { const q = new URLSearchParams(location.search); bindUI(); const cv = $("gl"), gl = cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { $("loading").textContent = "WebGL2 unavailable"; return; }
  L.gl = gl; L.R = { gl }; L.ground = groundProg(gl); L.ballP = ballProg(gl); L.charP = charProg(gl);
  const [colliders, baked, ent] = await Promise.all([fetch("dribble1/d1_colliders.json").then((r) => r.json()), fetch("tc_baseline_88573ef0/pt_baked.json").then((r) => r.json()), W.ofCharLoad("vinicius")]);
  L.ent = ent; const E = W.RUN1_V13; L.env = { E, M4, skel: ent.skel, colliders, baked, body: E.r1Body(ent.skel) };
  if (q.get("layout")) L.layout = q.get("layout"); if (q.get("cam")) { L.cam = q.get("cam"); $("selCam").value = L.cam; } if (q.get("show")) L.show = q.get("show"); if (q.get("mode")) L.mode = q.get("mode");
  for (const [k, id] of [["vol", "bVol"], ["nrm", "bNrm"], ["anc", "bAnc"], ["cor", "bCor"], ["acc", "bAcc"], ["hud", "bHud"], ["ball", "bBall"], ["diag", "bDiag"]]) { if (q.get(k) != null) L[k] = q.get(k) === "1"; $(id).classList.toggle("on", L[k]); }
  setLayout(L.layout); setShow(L.show); buildList(); select(q.get("case") && L.cases.some((c) => c.id === q.get("case")) ? q.get("case") : L.cases[0].id, { paused: q.get("play") === "0" }); if (q.get("t") != null) { L.t = Math.round((L.cur.t0 + +q.get("t")) / DT) * DT; L.playing = false; }
  $("loading").remove(); L.ready = true; L.external = q.get("external") === "1"; if (!L.external) requestAnimationFrame(frame); else frame(performance.now());
  const rest = L.cases.filter((c) => !L.done.has(c.id)); const next = () => { const c = rest.shift(); if (!c || L.external) return; const C = simulate(c); L.done.set(c.id, C); const el = $("o_" + c.id); if (el) el.textContent = rowText(C); setTimeout(next, 30); }; setTimeout(next, 600); }
// the automation surface (puppeteer: stills, checks)
W.OL = { ready: () => L.ready, L, select: (id, o) => select(id, o || { paused: true }), layout: setLayout, show: setShow, mode: setMode, seek: (t) => { L.t = Math.round((L.cur.t0 + t) / DT) * DT; L.playing = false; frame(performance.now()); return L.t; }, cam: (c) => { L.cam = c; $("selCam").value = c; frame(performance.now()); },
  set: (o) => { for (const k of ["vol", "nrm", "anc", "cor", "acc", "hud", "ball", "diag"]) if (o[k] != null) L[k] = !!o[k]; writeDiag(); frame(performance.now()); }, play: (r) => { L.rate = r || 1; L.playing = true; },
  live: () => { if (L.external) { L.external = false; L.last = null; requestAnimationFrame(frame); } },
  report: () => (L.cur ? { id: L.cur.tc.id, t0: L.cur.t0, runs: Object.fromEntries(MODES.map((m) => { const R = L.cur.runs[m]; return [m, { best: R.best, bestT: R.bestK != null ? R.bestK * DT - L.cur.t0 : null, over5: R.over.hard, out: R.out ? R.out.kind : null, through: R.cons.filter((c) => c.verdict === "THROUGH").length, blocked: R.W.occOn ? R.W.occ.blocked : 0, sce: R.sceMax, ms: Math.round(R.ms) }]; })) } : null) };
boot().catch((e) => { const l = $("loading"); if (l) l.textContent = "REVIEW LAB failed: " + (e && e.stack || e); console.error(e); });
