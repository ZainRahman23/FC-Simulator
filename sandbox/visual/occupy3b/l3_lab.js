// ═══ occupy3b/l3_lab.js — TOUCHLINE — STAGE 3B.1 LIMB CONTACT REVIEW ═══════════════════════════════════════════════════════════════════════════════
// Each case is simulated twice from identical inputs: OLD STAGE 3 (impact + balance as presented, its limb strikes from the animated limb speed —
// occupy3/, the comparison baseline) and STAGE 3B (the limb-contact layer between Stage 2 and Stage 3: the swinging limb yields, slides, deflects,
// stops; only the momentum it actually loses reaches the bodies — occupy3b/). Built on Stage 3's Lab (occupy3/o3_lab.js, unchanged): the same
// recorded live poses, playback, cameras, contact volumes, support, balance, normals, impact vectors, recovery steps, trails, frame data. Added:
// the LIMB CONTACTS (each Stage 3B pair: its point, its stable normal, its depth; STRIKE or HELD), the LIMB VELOCITY before / after the contact
// (the contact point's velocity, and what the impulse removed), the MOMENTUM PASSED (each impulse this tick at its point: through a limb's hip,
// at a body's contact point), the APPROVED REFERENCE (the authored leg dashed beside the physical one wherever the limb layer perturbed it), the
// perturbation and Stage 2's correction in the frame data, the ledger, and — for the flagship — the ACCOUNTING PANEL (why OLD generated a lead and
// why Stage 3B does not). LOCAL ONLY (real players' models).
import { DT, DEG } from "../vocab2/c_sim.js";
import { L3CASES, FLAGSHIP } from "./l3_cases.js";
import { runO3, outcomeO3, O3_LABEL } from "../occupy3/o3_run.js";
import { ImpactWorld, RES3 } from "../occupy3/o3_world.js";
import { LimbWorld } from "./l3_world.js";
import { RES3B } from "./l3_limb.js";
import { actionState } from "../occupy3/o3_facts.js";
import { comOf, footPoly, hull } from "../occupy3/o3_geom.js";
import { volumesOf, detect, OCC, GROUP, RESOLVED } from "../occupy1/o_volumes.js";
const W = window, hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x), $ = (id) => document.getElementById(id), MODES = ["S3", "S3B"], MNAME = { S3: "OLD STAGE 3", S3B: "STAGE 3B" }, HAS3 = (m) => m === "S3" || m === "S3B";
// (the case list: the owner's §10 matrix (occupy3b/l3_cases.js) by group, each row and its mirror; the flagship first)
const ROWS = (() => { const out = [], base = L3CASES.filter((x) => !x.matrixMirror), fl = base.find((x) => x.id === FLAGSHIP); out.push(Object.assign({}, fl, { listGroup: "THE FLAGSHIP (the audit's failure)", name: "FLAGSHIP · " + fl.name }));
  const groups = [...new Set(base.map((x) => x.group))]; for (const g of groups) for (const r of base.filter((x) => x.group === g)) { out.push(Object.assign({}, r, { listGroup: g })); const m = L3CASES.find((x) => x.matrixMirror === r.id); if (m) out.push(Object.assign({}, m, { listGroup: g, name: r.name + " · MIRRORED" })); }
  return out; })();
const L = { ready: false, cases: ROWS, done: new Map(), rows: new Map(), cur: null, mode: "S3B", layout: "2", t: 0, playing: false, rate: 1, loop: false, cam: "gameplay", show: "skin", vol: true, sup: true, bal: true, nrm: true, imp: true, stp: true, trl: true, ghost: false, ref: true, lc: true, lv: true, mom: true, hud: true, ball: true, diag: true, last: null };
const COL = { ATT: "#8fd3ff", DEF: "#ff9e7a", normal: "rgba(205,235,220,0.22)", normalLine: "rgba(225,245,235,0.55)", contact: "rgba(255,212,94,0.45)", contactLine: "#ffd45e", pen: "rgba(255,138,61,0.55)", penLine: "#ff8a3d", deep: "rgba(255,45,85,0.62)", deepLine: "#ff2d55", warn: "#ffb36b", ok: "#8dffa6",
  BRUSH: "#8fa49a", LIGHT: "#8dffa6", MODERATE: "#ffd45e", STRONG: "#ff8a3d", SEVERE: "#ff2d55" };
const BALCOL = { ABSORB: "#8dffa6", CORRECT: "#ffd45e", "RECOVERY STEP": "#ff8a3d", "STAGGER CANDIDATE": "#ff5b8a", "FALL CANDIDATE": "#ff2d55" };
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
// ═══ A CASE: STAGE 2 · STAGE 3 simulated; per tick (from the recorded live poses) the contacts, the support, the centre of mass and the capture point ═══
function plantedAt(p, t) { const P = p.planAt(t); return ["R", "L"].filter((X) => P.stances[X].some((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9)); }
function authAt(Wd, k) { let s = "FREE", o = null; for (const e of Wd.auth.log) { if (e.k > k) break; if (!e.to) continue; /* (a note — a claim denied, no transition) */ s = e.to.replace(/\(.*\)/, ""); o = e.owner; } return o ? `CONTROLLED (${o})` : s; }
function simMode(tc, m) { const c0 = performance.now(), r = runO3(L.env, tc, m, { record: true }), Wd = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT), T = new Map(), MF = L.env.body.massFrac;
  let best = -1, bestK = null, trunk = -1, legs = -1; const pen = new Float32Array(k1 - k0 + 1).fill(-1), over = { tol: 0, hard: 0 }, com = { a: [], d: [] };
  for (let k = k0; k <= k1; k++) { const fr = Wd.frames.get(k); if (!fr) continue; const t = k * DT, near = hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) < OCC.broad + 0.6, va = volumesOf(fr.a.J), vd = volumesOf(fr.d.J), P = near ? detect(va, vd, { within: 0.03 }) : [];
    let mres = -1; for (const p of P) { if (!p.both) continue; if (p.pen > mres) mres = p.pen; const tr = GROUP[p.A] === "TRUNK" && GROUP[p.B] === "TRUNK"; if (tr) trunk = Math.max(trunk, p.pen); else legs = Math.max(legs, p.pen); }
    if (mres > OCC.tol) over.tol++; if (mres > OCC.hard) over.hard++; pen[k - k0] = mres; if (mres > best) { best = mres; bestK = k; }
    // (the contact normal (defender → carrier) and the relative motion on it / along it; per player the support, the centre of mass and the capture point)
    const sa = Wd.att.stateAt(t), sd = Wd.def.stateAt(t); let nb = [0, 0]; for (const p of P) { if (!p.both || p.pen < -0.03) continue; const n = p.nh || [p.n[0], p.n[1]], w = Math.max(0.01, 0.03 + p.pen); nb = [nb[0] + n[0] * w, nb[1] + n[1] * w]; }
    let nrm = null; { const nm = hyp(nb[0], nb[1]); if (nm > 1e-9) { const n = [nb[0] / nm, nb[1] / nm], tn = [-n[1], n[0]], vr = [sa.V[0] - sd.V[0], sa.V[1] - sd.V[1]]; nrm = { n, vn: -(vr[0] * n[0] + vr[1] * n[1]), vt: vr[0] * tn[0] + vr[1] * tn[1] }; } }
    const pl = {}; for (const [key, p, J, ck] of [["ATT", Wd.att, fr.a.J, "a"], ["DEF", Wd.def, fr.d.J, "d"]]) { const feet = plantedAt(p, t), poly = feet.length ? hull(feet.flatMap((X) => footPoly(J, X))) : null, c = comOf(J, MF); com[ck].push([k, c]);
      pl[key] = { feet, poly, com: c, act: actionState(Wd, p, t) }; }
    T.set(k, { va, vd, P, mres, nrm, pl, poss: authAt(Wd, k) }); }
  // (the centre of mass's velocity over ±2 ticks and the instantaneous capture point ξ = x + v / ω, ω = √(g / z) — the same quantity for both stages)
  for (const ck of ["a", "d"]) { const A = com[ck]; for (let i = 0; i < A.length; i++) { const j0 = Math.max(0, i - 2), j1 = Math.min(A.length - 1, i + 2); if (j1 === j0) continue; const [ka, ca] = A[j0], [kb, cb] = A[j1], v = [(cb[0] - ca[0]) / ((kb - ka) * DT), (cb[1] - ca[1]) / ((kb - ka) * DT)], [k, c] = A[i], w = Math.sqrt(9.81 / Math.max(0.6, c[2]));
      const x = T.get(k); if (x) x.pl[ck === "a" ? "ATT" : "DEF"].cp = { v, xi: [c[0] + v[0] / w, c[1] + v[1] / w] }; } }
  const imp = Wd.imp ? new Map(Wd.imp.log.map((x) => [x.k, x])) : null, eps = Wd.imp ? Wd.imp.episodes.slice() : [], l3 = Wd.l3 ? new Map(Wd.l3.log.map((x) => [x.k, x])) : null, l3apps = Wd.l3 ? Wd.l3.apps : [];
  return { m, r, W: Wd, out: outcomeO3(Wd), k0, k1, T, pen, best, bestK, trunk, legs, over, imp, eps, l3, l3apps, ms: performance.now() - c0 }; }
function simulate(tc) { const runs = {}; for (const m of MODES) runs[m] = simMode(tc, m); return { tc, runs, t0: runs.S3.r.t0, clip: [Math.min(...MODES.map((m) => runs[m].r.clip[0])), Math.max(...MODES.map((m) => runs[m].r.clip[1]))] }; }
const shown = () => (L.layout === "2" ? MODES : [L.layout]);
function frameAt(R, t) { const k = clamp(Math.round(t / DT), R.k0, R.k1); let fr = R.W.frames.get(k), kk = k; while (!fr && kk > R.k0) fr = R.W.frames.get(--kk); return { k: kk, fr, x: R.T.get(kk), ball: R.W.trueTrack(kk * DT), o3: R.imp ? R.imp.get(kk) : null, l3: R.l3 ? R.l3.get(kk) : null }; }
const sevOf = (R) => { let s = null; const rank = ["BRUSH", "LIGHT", "MODERATE", "STRONG", "SEVERE"]; for (const e of R.eps) for (const k of ["ATT", "DEF"]) { const q = e.players[k]; if (q && (!s || rank.indexOf(q.sev) > rank.indexOf(s))) s = q.sev; } return s; };
const rowText = (C) => MODES.map((m) => { const R = C.runs[m]; return `${MNAME[m]} ${(Math.max(0, R.best) * 100).toFixed(1)}${HAS3(m) ? ` · ${R.eps.length ? R.eps.length + " impact" + (R.eps.length > 1 ? "s " : " ") + (sevOf(R) || "") : "no impact"}` : ""}${m === "S3B" && R.W.l3 ? ` · ${R.W.l3.contacts} strike${R.W.l3.contacts === 1 ? "" : "s"}` : ""}${R.out ? " · " + (SHORT[R.out.kind] || R.out.kind) : ""}`; }).join("  ");
// ── the case list ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function buildList() { const box = $("cases"); box.innerHTML = ""; let g = null;
  for (const tc of L.cases) { if (tc.listGroup !== g) { g = tc.listGroup; const h = document.createElement("h3"); h.textContent = g; box.appendChild(h); }
    const b = document.createElement("button"); b.className = "c"; b.dataset.id = tc.id; b.innerHTML = `${tc.name}<span class="o" id="o_${tc.id}">${L.rows.has(tc.id) ? L.rows.get(tc.id) : "…"}</span>`; b.onclick = () => select(tc.id); box.appendChild(b); } }
function markList() { for (const b of document.querySelectorAll("#cases .c")) b.classList.toggle("on", L.cur && b.dataset.id === L.cur.tc.id); }
// (the recorded runs are heavy — both stages' every frame: only the KEEP most recently viewed cases keep theirs; every case keeps its one-line
// summary for the list. Re-selecting an evicted case simulates it again: deterministic, the same replay)
const KEEP = 6;
function keep(id, C) { L.done.delete(id); L.done.set(id, C); L.rows.set(id, rowText(C)); while (L.done.size > KEEP) { const old = L.done.keys().next().value; if (L.cur && L.cur.tc.id === old) { const c = L.done.get(old); L.done.delete(old); L.done.set(old, c); continue; } L.done.delete(old); } }
function select(id, o = {}) { const tc = L.cases.find((x) => x.id === id); if (!tc) return; let C = L.done.get(id); if (!C) C = simulate(tc); L.cur = C; keep(id, C); const el = $("o_" + id); if (el) el.textContent = L.rows.get(id);
  L.t = C.clip[0]; L.playing = !o.paused; markList(); writeDiag(); drawTimeline(); try { history.replaceState(null, "", `?case=${id}&layout=${L.layout}&cam=${L.cam}&show=${L.show}`); } catch (e) {} }
// ═══ THE VIEWS ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function rects(w, h) { const n = shown().length; return Array.from({ length: n }, (_, i) => [i * w / n, 0, w / n, h]); }
// (the cameras: framed on both players of that run (their midpoint over the last 0.4 s), oriented by the carrier's heading at t = 0 — the same for
// both stages, so the two are seen from the same side)
function camera(C, R, Fr, vw, vh) { const h0 = C.runs.S3.r.enc.att0.h, fw = [Math.cos(h0), Math.sin(h0)], rt = [-Math.sin(h0), Math.cos(h0)];
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
    const pr = (p) => proj3(c, A3(p, p[2] || 0), rx, ry, rw, rh); x.save(); x.beginPath(); x.rect(rx, ry, rw, rh); x.clip();
    if (L.trl) trails(x, pr, dpr, R, Fr);
    if (L.sup && Fr.x) support(x, pr, dpr, Fr.x);
    if (L.show !== "skin") for (const [J, col] of [[F.a.J, COL.ATT], [F.d.J, COL.DEF]]) skel(x, pr, dpr, J, col, 2.5);
    if (L.ghost && m === "S3B") { const G2 = frameAt(C.runs.S3, L.t); if (G2.fr) { x.globalAlpha = 0.55; skel(x, pr, dpr, G2.fr.a.J, "#d8d8d8", 1.6, [5, 4]); skel(x, pr, dpr, G2.fr.d.J, "#d8d8d8", 1.6, [5, 4]); x.globalAlpha = 1; } }
    if (L.ref && m === "S3B") reference(x, pr, dpr, F, rx + rw);
    if (Fr.x) { if (L.vol) volumes(x, pr, c, dpr, Fr.x); if (L.nrm) normals(x, pr, dpr, Fr.x, F); if (L.bal) balance(x, pr, dpr, Fr); }
    if (HAS3(m)) { if (L.imp) impacts(x, pr, dpr, R, Fr); if (L.stp) steps(x, pr, dpr, R, Fr, rx + rw); }
    if (m === "S3B") { if (L.lc) limbContacts(x, pr, dpr, Fr, rx + rw); if (L.lv) limbVel(x, pr, dpr, R, Fr); if (L.mom) momentum(x, pr, dpr, R, Fr, rx + rw); }
    label(x, dpr, R, Fr, rx, ry, rw, rh, C); if (M.length > 1) { x.strokeStyle = "#2a3530"; x.lineWidth = 2 * dpr; x.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2); } x.restore(); });
  gl.disable(gl.SCISSOR_TEST); }
function skel(x, pr, dpr, J, col, wd, dash) { x.strokeStyle = col; x.lineWidth = wd * dpr; if (dash) x.setLineDash(dash.map((v) => v * dpr)); for (const kk of Object.keys(J)) { const a = pr(J[kk].j), b = pr(J[kk].t); if (a && b) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); } } x.setLineDash([]); }
// ── THE CAPSULES: each drawn as its silhouette, coloured by its deepest pair this tick: normal · contact (gap within 0.5 cm) · penetrating (beyond
// the 2 cm tolerance) · deep (beyond the 5 cm hard limit). The upper arms and feet are detected only (outlines) ──
function capsulePath(x, a, b, r) { const dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy); x.beginPath(); if (l < 1e-3) { x.arc(a[0], a[1], r, 0, 2 * Math.PI); return; } const g = Math.atan2(dy, dx);
  x.arc(b[0], b[1], r, g - Math.PI / 2, g + Math.PI / 2); x.arc(a[0], a[1], r, g + Math.PI / 2, g + 1.5 * Math.PI); x.closePath(); }
function volumes(x, pr, c, dpr, X) { const st = new Map(); for (const p of X.P) for (const [side, id] of [["a", p.A], ["d", p.B]]) { const key = side + id; if (!st.has(key) || p.pen > st.get(key)) st.set(key, p.pen); }
  const cls = (pen) => (pen == null || pen < -0.005 ? "normal" : pen <= OCC.tol ? "contact" : pen <= OCC.hard ? "pen" : "deep");
  for (const [side, V] of [["a", X.va], ["d", X.vd]]) for (const v of V) { const a = pr(v.a), b = pr(v.b), e = pr([v.a[0] + c.right[0] * v.r, v.a[1] + c.right[1] * v.r, v.a[2] + c.right[2] * v.r]); if (!a || !b || !e) continue;
    const rp = hyp(e[0] - a[0], e[1] - a[1]), k = cls(st.get(side + v.id)), res = RESOLVED.has(v.id); capsulePath(x, a, b, rp);
    if (res || k !== "normal") { x.fillStyle = COL[k]; x.fill(); } x.strokeStyle = COL[k + "Line"]; x.lineWidth = (k === "normal" ? 1.2 : 2) * dpr; if (!res) x.setLineDash([5 * dpr, 4 * dpr]); x.stroke(); x.setLineDash([]); } }
function arrow(x, a, b, col, dpr, w = 2) { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = w * dpr; x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 6 * dpr;
  x.beginPath(); x.moveTo(...b); x.lineTo(b[0] - s * Math.cos(ang - 0.45), b[1] - s * Math.sin(ang - 0.45)); x.lineTo(b[0] - s * Math.cos(ang + 0.45), b[1] - s * Math.sin(ang + 0.45)); x.fill(); }
const tag = (x, dpr, p, s, col, xMax) => { x.font = `600 ${10.5 * dpr}px -apple-system, Helvetica, sans-serif`; const tw = x.measureText(s).width, lx = Math.min(p[0] + 6 * dpr, xMax - tw - 14 * dpr); x.fillStyle = "rgba(13,18,16,0.82)"; x.fillRect(lx, p[1] + 4 * dpr, tw + 8 * dpr, 16 * dpr); x.textBaseline = "alphabetic"; x.fillStyle = col; x.fillText(s, lx + 4 * dpr, p[1] + 16 * dpr); };
// ── THE CONTACT NORMALS: every pair within 1 cm, an arrow from its contact point along the separating direction (defender → carrier), the depth; and
// the AGGREGATE normal on the ground between the roots (white) with the tangent (dashed) ──
function normals(x, pr, dpr, X, F) { for (const p of X.P) { if (p.pen < -0.01) continue; const a = pr(p.at), b = pr([p.at[0] + p.n[0] * 0.22, p.at[1] + p.n[1] * 0.22, p.at[2] + p.n[2] * 0.22]); if (!a || !b) continue;
    const col = p.pen > OCC.hard ? COL.deepLine : p.pen > OCC.tol ? COL.penLine : COL.contactLine; arrow(x, a, b, col, dpr); if (p.pen > OCC.tol) { x.font = `${10 * dpr}px Menlo`; x.fillText(`${(p.pen * 100).toFixed(1)}`, a[0] + 5 * dpr, a[1] - 5 * dpr); } }
  if (X.nrm && X.mres > -0.01) { const m = [(F.a.P[0] + F.d.P[0]) / 2, (F.a.P[1] + F.d.P[1]) / 2, 0.02], n = X.nrm.n, a = pr(m), b = pr([m[0] + n[0] * 0.45, m[1] + n[1] * 0.45, 0.02]), t0 = pr([m[0] - n[1] * 0.35, m[1] + n[0] * 0.35, 0.02]), t1 = pr([m[0] + n[1] * 0.35, m[1] - n[0] * 0.35, 0.02]);
    if (a && b) arrow(x, a, b, "#ffffff", dpr, 2.5); if (t0 && t1) { x.strokeStyle = "rgba(255,255,255,0.7)"; x.lineWidth = 1.5 * dpr; x.setLineDash([6 * dpr, 4 * dpr]); x.beginPath(); x.moveTo(...t0); x.lineTo(...t1); x.stroke(); x.setLineDash([]); } } }
// ── THE SUPPORT: each planted foot's footprint (the player's colour) and the support polygon (their hull, dashed) on the ground ──
function support(x, pr, dpr, X) { for (const key of ["ATT", "DEF"]) { const P = X.pl[key]; if (!P || !P.poly) continue; const col = key === "ATT" ? COL.ATT : COL.DEF; x.strokeStyle = col; x.lineWidth = 1.6 * dpr; x.setLineDash([5 * dpr, 3 * dpr]); x.beginPath();
    P.poly.forEach((q, i) => { const s = pr([q[0], q[1], 0.004]); if (!s) return; if (i) x.lineTo(...s); else x.moveTo(...s); }); x.closePath(); x.stroke(); x.setLineDash([]); x.fillStyle = key === "ATT" ? "rgba(143,211,255,0.16)" : "rgba(255,158,122,0.16)"; x.fill(); } }
// ── THE BALANCE DIAGNOSTIC: the centre of mass on the ground (a dot, with its height line), the instantaneous capture point ξ = x + v / ω (a diamond),
// joined; in Stage 3 the balance state's colour; outside the support polygon the capture point says the body must step ──
function balance(x, pr, dpr, Fr) { for (const key of ["ATT", "DEF"]) { const P = Fr.x.pl[key]; if (!P || !P.cp) continue; const o3 = Fr.o3 && Fr.o3.p ? Fr.o3.p[key === "ATT" ? 0 : 1] : null, col = o3 ? BALCOL[o3.cls] || "#ffffff" : key === "ATT" ? COL.ATT : COL.DEF;
    const c0 = pr([P.com[0], P.com[1], 0.01]), cH = pr(P.com), q = pr([P.cp.xi[0], P.cp.xi[1], 0.01]); if (!c0 || !q) continue; x.strokeStyle = col; x.lineWidth = 1.5 * dpr; if (cH) { x.setLineDash([2 * dpr, 3 * dpr]); x.beginPath(); x.moveTo(...cH); x.lineTo(...c0); x.stroke(); x.setLineDash([]); }
    x.beginPath(); x.moveTo(...c0); x.lineTo(...q); x.stroke(); x.fillStyle = col; x.beginPath(); x.arc(c0[0], c0[1], 4 * dpr, 0, 2 * Math.PI); x.fill(); x.beginPath(); x.moveTo(q[0], q[1] - 6 * dpr); x.lineTo(q[0] + 6 * dpr, q[1]); x.lineTo(q[0], q[1] + 6 * dpr); x.lineTo(q[0] - 6 * dpr, q[1]); x.closePath(); x.fill();
    if (o3) { x.font = `600 ${9.5 * dpr}px -apple-system, Helvetica, sans-serif`; x.fillStyle = col; x.fillText(o3.cls, q[0] + 8 * dpr, q[1] + 3 * dpr); } } }
// ── THE IMPACT VECTOR: the impulse each body took over the last 0.15 s (N·s; 1 cm per N·s) from its centre of mass, its Δv; the contact point ──
function impacts(x, pr, dpr, R, Fr) { if (!R.imp) return; const sum = { ATT: [0, 0], DEF: [0, 0] }; let cpt = null;
  for (let k = Fr.k - 36; k <= Fr.k; k++) { const o = R.imp.get(k); if (!o || !o.p) continue; if (o.imp && k > Fr.k - 4) cpt = o.imp.c; for (const [i, key] of [[0, "ATT"], [1, "DEF"]]) { const q = o.p[i]; if (q && q.J) { sum[key][0] += q.J[0]; sum[key][1] += q.J[1]; } } }
  for (const key of ["ATT", "DEF"]) { const v = sum[key], m = hyp(v[0], v[1]); if (m < 0.5) continue; const P = Fr.x.pl[key], a = pr([P.com[0], P.com[1], P.com[2]]), b = pr([P.com[0] + v[0] * 0.01, P.com[1] + v[1] * 0.01, P.com[2]]); if (!a || !b) continue;
    arrow(x, a, b, "#ff4fd8", dpr, 3.5); x.font = `700 ${10.5 * dpr}px -apple-system, Helvetica, sans-serif`; x.fillStyle = "#ff4fd8"; x.fillText(`${m.toFixed(1)} N·s · Δv ${(m / 73).toFixed(2)} m/s`, b[0] + 5 * dpr, b[1] - 5 * dpr); }
  if (cpt) { const c = pr(cpt); if (c) { x.strokeStyle = "#ff4fd8"; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(c[0], c[1], 7 * dpr, 0, 2 * Math.PI); x.stroke(); } } }
// ── THE RECOVERY STEP: the stepping foot's target (a ring where it will land, a line from the foot), its landing time; landed: filled ──
function steps(x, pr, dpr, R, Fr, xMax) { const t = Fr.k * DT, Wd = R.W; for (const e of Wd.imp.events) { if (e.kind !== "RECOVERY STEP" || !e.pos) continue; if (t < e.t - 1e-9 || t > e.tLand + 0.35) continue; const key = e.who, col = key === "ATT" ? COL.ATT : COL.DEF, landed = t >= e.tLand - 1e-9;
    x.strokeStyle = "#ff8a3d"; x.lineWidth = 2.5 * dpr; x.beginPath(); for (let i = 0; i <= 24; i++) { const g = i / 24 * 2 * Math.PI, q = pr([e.pos[0] + 0.11 * Math.cos(g), e.pos[1] + 0.11 * Math.sin(g), 0.006]); if (!q) continue; if (i) x.lineTo(...q); else x.moveTo(...q); } x.closePath(); x.stroke(); if (landed) { x.fillStyle = "rgba(255,138,61,0.35)"; x.fill(); }
    const J = key === "ATT" ? Fr.fr.a.J : Fr.fr.d.J, f = J["foot_" + e.X], q = pr([e.pos[0], e.pos[1], 0.006]); if (f && q && !landed) { const a = pr(f.j); if (a) { x.strokeStyle = col; x.setLineDash([4 * dpr, 3 * dpr]); x.lineWidth = 1.5 * dpr; x.beginPath(); x.moveTo(...a); x.lineTo(...q); x.stroke(); x.setLineDash([]); } }
    if (q) tag(x, dpr, q, `${key} ${e.X} RECOVERY STEP · ${landed ? "LANDED" : `lands in ${(e.tLand - t).toFixed(2)} s`}`, "#ff8a3d", xMax); } }
// ── THE WORLD TRAILS: both roots over the last 1.5 s and the ball's (the ball only when shown) ──
function trails(x, pr, dpr, R, Fr) { for (const [ck, col] of [["a", COL.ATT], ["d", COL.DEF]]) { x.strokeStyle = col; x.globalAlpha = 0.75; x.lineWidth = 2 * dpr; x.beginPath(); let first = true;
    for (let kk = Fr.k - 360; kk <= Fr.k; kk += 4) { const f = R.W.frames.get(clamp(kk, R.k0, R.k1)); if (!f) continue; const q = pr([f[ck].P[0], f[ck].P[1], 0.01]); if (!q) continue; if (first) { x.moveTo(...q); first = false; } else x.lineTo(...q); } x.stroke(); x.globalAlpha = 1; }
  if (L.ball) { x.strokeStyle = "rgba(255,255,255,0.55)"; x.lineWidth = 1.5 * dpr; x.beginPath(); let first = true; for (let kk = Fr.k - 360; kk <= Fr.k; kk += 4) { const b = R.W.trueTrack(Math.max(R.k0, kk) * DT).p, q = pr([b[0], b[1], Math.max(0.02, b[2] || 0)]); if (!q) continue; if (first) { x.moveTo(...q); first = false; } else x.lineTo(...q); } x.stroke(); } }
// ── THE VIEW'S FRAME DATA (top-left) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const cmf = (v) => (v * 100).toFixed(1);
function frameLines(R, Fr, C) { const X = Fr.x, now = X ? X.mres : -1, col = (v) => (v > OCC.hard ? COL.deepLine : v > OCC.tol ? COL.penLine : v > -0.005 ? COL.contactLine : "#8dffa6"), o3 = Fr.o3;
  const top = X && X.P.filter((p) => p.both).sort((a, b) => b.pen - a.pen)[0];
  const lines = [[`${MNAME[R.m]} · ${R.m === "S3" ? "impact + balance (limb strikes from the animated limb speed)" : "limb contact → impact + balance (only what the limb lost)"}`, "#ffd45e", 700], [`PENETRATION now ${now > 0 ? `${cmf(now)} cm` : now > -0.005 ? "touching" : "apart"}${top && now > -0.005 ? `  ·  ${CLS5(top.A, top.B)} (${top.A} ↔ ${top.B})` : ""} · run max ${cmf(Math.max(0, R.best))} cm (torso ${cmf(Math.max(0, R.trunk))} · legs ${cmf(Math.max(0, R.legs))})`, col(now), 600]];
  if (!L.hud || !X) return lines;
  if (X.nrm && now > -0.03) lines.push([`RELATIVE VELOCITY closing ${X.nrm.vn.toFixed(2)} m/s on the normal · ${X.nrm.vt.toFixed(2)} m/s along the tangent`, "#e6efe9", 500]);
  if (o3 && o3.imp) lines.push([`IMPACT ${o3.imp.regions} · bodies closing ${o3.imp.close} m/s · effective masses ${o3.imp.mA} / ${o3.imp.mD} kg`, "#ff4fd8", 600]);
  if (o3 && o3.strike && o3.strike.length) lines.push([`LIMB STRIKE (OLD) ${o3.strike.map((s) => `${s.regions} ${s.art} m/s → ${s.j} N·s · the limb continues unchanged`).join(" · ")}`, "#ff4fd8", 600]);
  if (R.m === "S3B") for (const s of limbLines(R, Fr)) lines.push(s);
  lines.push([`POSSESSION ${X.poss}`, "#b8c8bf", 500]);
  for (const [i, key] of [[0, "ATT"], [1, "DEF"]]) { const P = X.pl[key], q = o3 && o3.p ? o3.p[i] : null, a = P.act;
    lines.push([`${key === "ATT" ? "CARRIER " : "DEFENDER"}  ${a.kind === "ORDINARY" ? a.label : a.label + " · " + a.phase}${P.feet.length ? " · planted " + P.feet.join("") : " · airborne"}`, key === "ATT" ? COL.ATT : COL.DEF, 600]);
    if (q) lines.push([`   ${q.sev} (σ ${q.sigma}) · ${q.cls} · ${q.state}${q.outcome ? " · " + q.outcome.kind : ""}${q.step ? ` · step ${q.step.X} ${(q.step.d * 100).toFixed(0)} cm${q.step.landed ? " landed" : ""}` : ""}${q.fall ? " · UNRESOLVED FALL CANDIDATE" : ""}`, BALCOL[q.cls] || "#b8c8bf", 600]);
    else if (HAS3(R.m)) lines.push([`   no impact response (Stage 2 occupancy only)`, "#8fa49a", 500]); }
  return lines; }
function label(x, dpr, R, Fr, rx, ry, rw, rh, C) { const raw = frameLines(R, Fr, C), f = (n) => `${n * dpr}px -apple-system, Helvetica, sans-serif`; let y = ry + 8 * dpr; x.textBaseline = "top";
  const fs = (wt) => (wt === 700 ? 12.5 : 10.8), maxW = rw - 30 * dpr, lines = [];
  for (const [s, c, wt] of raw) { x.font = `${wt} ${f(fs(wt))}`; if (x.measureText(s).width <= maxW) { lines.push([s, c, wt]); continue; } const parts = s.split(" · "); let cur = "";
    for (const q of parts) { const nx = cur ? cur + " · " + q : q; if (cur && x.measureText(nx).width > maxW) { lines.push([cur, c, wt]); cur = "   " + q; } else cur = nx; } if (cur) lines.push([cur, c, wt]); }
  const bw = Math.min(rw - 16 * dpr, Math.max(...lines.map(([s, , wt]) => { x.font = `${wt} ${f(fs(wt))}`; return x.measureText(s).width; })) + 14 * dpr);
  x.fillStyle = "rgba(13,18,16,0.80)"; x.fillRect(rx + 8 * dpr, y - 4 * dpr, bw, lines.length * 14.5 * dpr + 6 * dpr);
  for (const [s, c, wt] of lines) { x.font = `${wt} ${f(fs(wt))}`; x.fillStyle = c; x.fillText(s, rx + 14 * dpr, y); y += 14.5 * dpr; } void rh; }
// ═══ THE DIAGNOSTICS (both stages' records; Stage 3's episodes, events and the referee facts; the selected stage at the playhead) ════════════════
function writeDiag() { const C = L.cur, el = $("diag"); el.classList.toggle("hidden", !L.diag); if (!L.diag || !C) return; const t = L.t, t0 = C.t0, rel = (v) => `${v - t0 >= 0 ? "+" : ""}${(v - t0).toFixed(3)}`, cm = cmf;
  const lines = [`<b>${C.tc.name}</b>`, `<span class="k">${C.tc.listGroup} · attacker ${C.tc.c.tech} · ${C.tc.c.variant} · tackle request ${(C.tc.tackle || []).join(", ") || "none"} · Reaction MEDIUM 0.200 s · equal bodies (the rig's ${L.env.skel.identity ? L.env.skel.identity.weightKg : 73} kg)</span>`, ""];
  for (const m of MODES) { const R = C.runs[m];
    lines.push(`<b>${O3_LABEL[m]}</b>  <span class="k">(simulated in ${R.ms.toFixed(0)} ms)</span>`, `  tackle outcome  ${R.out ? R.out.kind : "— (no tackle committed)"}`,
      `  deepest  ${R.best > OCC.hard ? '<span class="bad">' : R.best > OCC.tol ? '<span class="warn">' : '<span class="ok">'}${cm(Math.max(0, R.best))} cm</span> at ${R.bestK != null ? rel(R.bestK * DT) : "—"} · torso ${cm(Math.max(0, R.trunk))} · legs ${cm(Math.max(0, R.legs))} · ticks > 2 cm ${R.over.tol} · > 5 cm ${R.over.hard}`);
    if (m === "S3B" && R.W.l3) { const L3 = R.W.l3, c = L3.check; lines.push(`  STAGE 3B: ${L3.contacts} strike${L3.contacts === 1 ? "" : "s"} · ${c.n} impulse applications · Σ ${L3.apps.reduce((a, x) => a + x.lam, 0).toFixed(1)} N·s · ledger: Stage 3 took exactly its impulses ${c.stage3.toExponential(1)} · pairing ${c.pair.toExponential(1)} · bound ${c.bound.toExponential(1)} · energy ${c.energy.toExponential(1)}`);
      for (const e of L3.events.slice(0, 24)) lines.push(`    ${rel(e.t)} ${e.who} ${e.kind}: ${e.why}`); }
    if (HAS3(m)) { if (!R.eps.length) lines.push(`  <span class="ok">no meaningful contact</span>`);
      for (const e of R.eps) { const o = e.onset; lines.push(`  <b>IMPACT #${e.n}</b> ${rel(e.t0)} → ${e.t1 != null ? rel(e.t1) : "end"} · ${e.why}`, o ? `    onset: ${o.contact.regions} (${o.contact.pair}) · bodies closing ${o.contact.closing} m/s · tangential ${o.contact.tangential} m/s · on ATT ${o.contact.onATT} · on DEF ${o.contact.onDEF} · ${o.ball.state}${o.ball.owner ? "(" + o.ball.owner + ")" : ""}` : "");
        for (const k of ["ATT", "DEF"]) { const q = e.players[k]; if (!q) continue; lines.push(`    ${k}: <span class="${q.sev === "SEVERE" ? "bad" : q.sev === "STRONG" ? "warn" : "ok"}">${q.sev}</span> σ ${q.sigma} · ${q.cls} · ${q.outcome}${q.why ? ` <span class="k">(${q.why})</span>` : ""}`,
          `       impulse ${q.J} N·s (Δv ${q.du} m/s) · peak u ${q.peakU} m/s · pelvis ${cm(q.peakP)} cm · trunk lean ${q.peakLean}° · rotation ${q.peakYaw}° · ${q.steps.length ? "steps " + q.steps.map((s) => `${s.X} ${cm(s.d)} cm ${rel(s.t)} → ${rel(s.tLand)}`).join(", ") : "no step"} · ${q.regainAfter != null ? "balance regained after " + q.regainAfter + " s" : q.fall ? "UNRESOLVED FALL CANDIDATE" : "not regained in the replay"}`); } } }
    lines.push(""); }
  if (C.tc.id === FLAGSHIP || C.tc.matrixMirror === FLAGSHIP) for (const s of accounting(C)) lines.push(s);
  const R = C.runs[L.mode], Fr = frameAt(R, t), X = Fr.x; lines.push(`<b>AT THE PLAYHEAD</b>  t ${rel(t)} s · tick ${Fr.k} · ${MNAME[L.mode]} <span class="k">(1 / 2 select · 3 both)</span>`);
  if (X) { const P = X.P.filter((p) => p.pen > -0.01).sort((a, b) => b.pen - a.pen).slice(0, 6);
    lines.push(`  <b>CONTACT REGIONS · PENETRATION</b>`, P.length ? P.map((p) => `  ${CLS5(p.A, p.B).padEnd(28)} ${(p.A + " ↔ " + p.B).padEnd(18)} ${p.pen > 0 ? (p.pen > OCC.hard ? '<span class="bad">' : p.pen > OCC.tol ? '<span class="warn">' : "<span>") + cm(p.pen) + " cm in</span>" : "gap " + cm(-p.pen) + " cm"}`).join("\n") : "  no volumes within 1 cm");
    if (X.nrm) lines.push(`  <b>RELATIVE VELOCITY</b> closing ${X.nrm.vn.toFixed(2)} m/s on the normal [${X.nrm.n.map((v) => v.toFixed(2)).join(", ")}] · ${X.nrm.vt.toFixed(2)} m/s along the tangent`);
    lines.push(`  <b>POSSESSION</b> ${X.poss}`);
    for (const key of ["ATT", "DEF"]) { const P2 = X.pl[key], a = P2.act; lines.push(`  <b>${key === "ATT" ? "CARRIER" : "DEFENDER"}</b> ${a.label}${a.kind !== "ORDINARY" ? " · " + a.phase : ""} · planted ${P2.feet.join("") || "none"}${P2.cp ? ` · centre of mass ${cm(P2.com[2])} cm high · v ${hyp(...P2.cp.v).toFixed(2)} m/s · capture point ${cm(hyp(P2.cp.xi[0] - P2.com[0], P2.cp.xi[1] - P2.com[1]))} cm ahead of it` : ""}`); } }
  const o3 = Fr.o3; if (o3 && o3.p) { lines.push("", `<b>STAGE 3 AT THIS TICK</b>`); if (o3.imp) lines.push(`  body contact ${o3.imp.regions} (${o3.imp.pair}) · closing ${o3.imp.close} m/s · normal [${o3.imp.n.join(", ")}] · effective masses ${o3.imp.mA} / ${o3.imp.mD} kg · impulse this tick ${o3.imp.j} N·s`);
    for (const s of o3.strike || []) lines.push(`  limb strike ${s.regions} (${s.pair}) · articulated ${s.art} m/s · effective masses ${s.mA} / ${s.mD} kg · ${s.j} N·s over 6 ticks`);
    for (const [i, key] of [[0, "ATT"], [1, "DEF"]]) { const q = o3.p[i]; if (!q) continue; lines.push(`  <b>${key}</b> ${q.state}${q.committed ? " · committed: " + q.committed : ""} · ${q.cls} · ${q.sev} (σ ${q.sigma}) · demand ${q.demand}`,
        `     perturbation u [${q.u.join(", ")}] m/s · offset e [${q.e.map((v) => cm(v)).join(", ")}] cm · capture point ξ [${q.xi.map((v) => cm(v)).join(", ")}] cm · slack ${cm(q.slack)} cm`,
        `     drawn pelvis [${q.P.map((v) => cm(v)).join(", ")}] cm · overflow [${q.O.map((v) => cm(v)).join(", ")}] cm · root this tick [${q.root.map((v) => cm(v)).join(", ")}] cm${q.J ? ` · impulse [${q.J.join(", ")}] N·s (ground ${q.ground.join(", ")})` : ""}`,
        `     posture lean ${q.osc.lean}° side ${q.osc.side}° chest ${q.osc.trunk}° pelvis yaw ${q.osc.yaw}° knees ${cm(q.osc.crouch)} cm${q.step ? ` · step ${q.step.X} → [${q.step.pos.join(", ")}] at ${rel(q.step.tLand)}${q.step.landed ? " LANDED" : ""}` : ""}${q.outcome ? ` · ACTION: ${q.outcome.kind}` : ""}`); } }
  if (R.W.imp && R.W.imp.events.length) { lines.push("", `<b>STAGE 3 EVENTS</b>`); for (const e of R.W.imp.events.slice(0, 40)) lines.push(`  ${rel(e.t)} ${e.who !== "—" ? e.who + " " : ""}${e.kind}: ${e.why}`); }
  if (HAS3(L.mode) && R.eps.length) { lines.push("", `<b>THE REFEREE FACTS</b> <span class="k">(objective only — no foul, no rule)</span>`); for (const e of R.eps) { const f = e.referee; if (!f) continue;
      const bc = (c, who) => (c ? `${who} ${c.kind} ${rel(c.t)} (${c.before.toFixed(2)} s before)` : `${who} none`), tk = f.tackle ? ` · the tackle's ball contact ${f.tackle.ballBeforePlayerContact ? "PRECEDED the player contact" : f.tackle.ballOnlyAfterPlayerContact ? "came only AFTER the player contact" : "never happened"}${f.tackle.ballContacts.length ? " (" + f.tackle.ballContacts.map(rel).join(", ") + ")" : ""}` : "";
      lines.push(`  #${e.n}: player contact ${rel(f.playerContact)} (impact ${rel(f.impactOnset)}) · regions ${f.regions} · on ATT ${f.onATT} / DEF ${f.onDEF} · relative velocity ${f.closing} m/s closing, ${f.tangential} m/s tangential`,
        `      last ball contact before it: ${bc(f.lastBallContactATT, "ATT")} · ${bc(f.lastBallContactDEF, "DEF")}${f.firstBallContactAfter ? ` · first after it: ${f.firstBallContactAfter.by} ${f.firstBallContactAfter.kind} ${rel(f.firstBallContactAfter.t)}` : ""}${tk}`,
        `      balance loss ${["ATT", "DEF"].map((k) => e.players[k] ? `${k} ${e.players[k].sev} ${e.players[k].cls}` : "").filter(Boolean).join(" · ")} · action disruption ${["ATT", "DEF"].map((k) => e.players[k] ? `${k} ${e.players[k].outcome}` : "").filter(Boolean).join(" · ")}`); } }
  lines.push("", `<span class="k">Stage 3B: a limb contact is a swinging leg's lower thigh / shin / boot beyond the ${RES3B.tol * 100} cm tolerance; the limb yields (hip ab/adduction ≤ ${RES3B.lim[0]}°, flexion ≤ ${RES3B.lim[1]}°, knee swivel ≤ ${RES3B.lim[2]}°, ≤ ${RES3B.qdMax} rad/s), its contact impulse λ = closing / (w_A + w_B) passes through its hip; held contacts yield; the stable side-on normal for near-parallel bodies; landings within ${RES3B.landForce * 1000} ms land where their stance is. In STAGE 3B Stage 3's limb strikes are off (limbMin ∞).</span>`);
  lines.push("", `<span class="k">Stage 3: impact when a contact deeper than ${RES3.penMin * 100} cm (Stage 2's tolerance) closes > ${RES3.uMin} m/s at the bodies or strikes > ${RES3.limbMin} m/s with a limb (articulated), or Stage 2 cannot resolve it · soft inelastic contact τ ${RES3.tauC} s · equal bodies · strut share friction μ ${RES3.mu} · capture-point balance (LIP) · committed: Stage 2's 2 / 8 / 12 cm, the pelvis ≤ ${RES3.pelvisCom * 100} cm · ordinary: the planted legs' reach, the pelvis ≤ ${RES3.pelvisOrd * 100} cm · recovery step ≤ ${RES3.stepOut * 100} cm out / ${RES3.stepCross * 100} cm across · steps < ${RES3.stepMin * 100} cm are the gait's own (CORRECT)</span>`);
  el.innerHTML = lines.filter((s) => s !== "").join("\n"); }
// ═══ THE TIMELINE: one lane per stage — the deepest penetration per tick (0 – 25 cm), contacts; Stage 3: impact episodes (their severity), recovery
// steps (▲ planned, ● landed), action interruptions (◆), fall candidates (✕) ═══════════════════════════════════════════════════════════════════════
function drawTimeline() { const C = L.cur; if (!C) return; const cv = $("tlc"), lh = 34; $("tl").style.height = (MODES.length * lh + 22) + "px"; $("stage").style.bottom = (MODES.length * lh + 22) + "px";
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const x = cv.getContext("2d"), [a, b] = C.clip, LW = 78 * dpr, X = (t) => LW + (t - a) / (b - a) * (cv.width - LW - 10 * dpr); x.fillStyle = "#151d19"; x.fillRect(0, 0, cv.width, cv.height);
  MODES.forEach((m, i) => { const R = C.runs[m], y = (4 + i * lh) * dpr, hh = (lh - 8) * dpr; x.fillStyle = shown().includes(m) ? "#ffd45e" : "#8fa49a"; x.font = `600 ${10.5 * dpr}px -apple-system, Helvetica, sans-serif`; x.textBaseline = "middle"; x.fillText(MNAME[m], 6 * dpr, y + hh / 2);
    x.fillStyle = "#1c2621"; x.fillRect(X(a), y, X(b) - X(a), hh); const yy = (v) => y + hh - clamp(v / 0.25, 0, 1) * hh;
    for (const [v, c] of [[OCC.tol, "rgba(255,212,94,0.35)"], [OCC.hard, "rgba(255,45,85,0.45)"]]) { x.fillStyle = c; x.fillRect(X(a), yy(v), X(b) - X(a), 1 * dpr); }
    for (let k = R.k0; k <= R.k1; k++) { const v = R.pen[k - R.k0]; if (v <= 0) continue; x.fillStyle = v > OCC.hard ? COL.deepLine : v > OCC.tol ? COL.penLine : COL.contactLine; x.fillRect(X(k * DT), yy(v), Math.max(1, X((k + 1) * DT) - X(k * DT)), y + hh - yy(v)); }
    for (const c of R.W.contactLog) { x.fillStyle = c.kind === "tackle" ? "#ffffff" : c.by === "ATT" ? COL.ATT : COL.DEF; x.fillRect(X(c.t) - 1 * dpr, y - 2 * dpr, 2 * dpr, 5 * dpr); }
    if (m === "S3B" && R.W.l3) for (const a of R.W.l3.apps) { if (a.held) continue; const xx = X(a.k * DT); x.fillStyle = "#4fe3ff"; x.fillRect(xx - 1 * dpr, y + hh - clamp(a.lam / 40, 0.15, 1) * hh, 2 * dpr, clamp(a.lam / 40, 0.15, 1) * hh); }
    if (HAS3(m)) { for (const e of R.eps) { const sv = ["ATT", "DEF"].map((k) => e.players[k] && e.players[k].sev).filter(Boolean), rank = ["BRUSH", "LIGHT", "MODERATE", "STRONG", "SEVERE"], top = sv.sort((p, q) => rank.indexOf(q) - rank.indexOf(p))[0] || "LIGHT"; x.fillStyle = COL[top]; x.globalAlpha = 0.85; x.fillRect(X(e.t0), y + hh - 3 * dpr, Math.max(2 * dpr, X(e.t1 != null ? e.t1 : b) - X(e.t0)), 3 * dpr); x.globalAlpha = 1; }
      for (const e of R.W.imp.events) { const xx = X(e.t), yc = y + 6 * dpr; x.fillStyle = e.who === "ATT" ? COL.ATT : e.who === "DEF" ? COL.DEF : "#ff4fd8";
        if (e.kind === "RECOVERY STEP") { x.beginPath(); x.moveTo(xx, yc - 4 * dpr); x.lineTo(xx + 4 * dpr, yc + 3 * dpr); x.lineTo(xx - 4 * dpr, yc + 3 * dpr); x.fill(); }
        else if (e.kind === "STEP LANDED") { x.beginPath(); x.arc(xx, yc, 3 * dpr, 0, 2 * Math.PI); x.fill(); }
        else if (/INTERRUPTED|RECOVERY REPLACED/.test(e.kind)) { x.beginPath(); x.moveTo(xx, yc - 5 * dpr); x.lineTo(xx + 5 * dpr, yc); x.lineTo(xx, yc + 5 * dpr); x.lineTo(xx - 5 * dpr, yc); x.fill(); }
        else if (/FALL CANDIDATE$/.test(e.kind)) { x.strokeStyle = COL.deepLine; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(xx - 4 * dpr, yc - 4 * dpr); x.lineTo(xx + 4 * dpr, yc + 4 * dpr); x.moveTo(xx + 4 * dpr, yc - 4 * dpr); x.lineTo(xx - 4 * dpr, yc + 4 * dpr); x.stroke(); }
        else if (e.kind === "IMPACT") { x.fillStyle = "#ff4fd8"; x.fillRect(xx - 1 * dpr, y, 2 * dpr, hh); } } } });
  x.fillStyle = "#8fa49a"; x.font = `${9.5 * dpr}px Menlo`; x.textBaseline = "bottom"; x.fillText("penetration 0–25 cm (2 / 5 cm lines) · ticks: ball contacts · │ impact ▬ episode ▲ step ● landed ◆ action ✕ fall candidate · 3B: cyan │ a limb strike (height ∝ N·s, 40 = full)", LW, cv.height - 3 * dpr);
  x.strokeStyle = "#fff"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(X(L.t), 0); x.lineTo(X(L.t), cv.height - 14 * dpr); x.stroke(); }
// ── LOOP ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let diagT = 0;
function frame(now) { const dt = L.last != null ? Math.min(0.05, (now - L.last) / 1000) : 0; L.last = now; const C = L.cur;
  if (C && L.playing) { L.t += dt * L.rate; if (L.t >= C.clip[1]) { if (L.loop) L.t = C.clip[0]; else { L.t = C.clip[1]; L.playing = false; } } }
  render(); drawTimeline(); if (now - diagT > 120 || !L.playing) { writeDiag(); diagT = now; } $("bPlay").textContent = L.playing ? "❚❚ PAUSE" : "▶ PLAY"; if (!L.external) requestAnimationFrame(frame); }
function step(n) { const C = L.cur; L.playing = false; L.t = clamp(Math.round(L.t / DT + n) * DT, C.clip[0], C.clip[1]); }
const TOG = [["vol", "bVol", "v"], ["sup", "bSup", "f"], ["bal", "bBal", "b"], ["nrm", "bNrm", "n"], ["imp", "bImp", "i"], ["stp", "bStp", "r"], ["trl", "bTrl", "t"], ["ghost", "bGhost", "g"], ["hud", "bHud", "h"], ["ball", "bBall", "o"], ["diag", "bDiag", "d"], ["ref", "bRef", "e"], ["lc", "bLc", "l"], ["lv", "bLv", "k"], ["mom", "bMom", "m"]];
function bindUI() {
  $("bPlay").onclick = () => { if (!L.playing && L.t >= L.cur.clip[1] - 1e-9) L.t = L.cur.clip[0]; L.playing = !L.playing; };
  $("bReplay").onclick = () => { L.t = L.cur.clip[0]; L.playing = true; }; $("bBack").onclick = (e) => step(e && e.shiftKey ? -1 : -4); $("bFwd").onclick = (e) => step(e && e.shiftKey ? 1 : 4);
  $("bLoop").onclick = () => { L.loop = !L.loop; $("bLoop").classList.toggle("on", L.loop); };
  for (const b of document.querySelectorAll("[data-rate]")) b.onclick = () => { L.rate = +b.dataset.rate; for (const y of document.querySelectorAll("[data-rate]")) y.classList.toggle("on", y === b); };
  for (const b of document.querySelectorAll("[data-layout]")) b.onclick = () => setLayout(b.dataset.layout);
  for (const b of document.querySelectorAll("[data-show]")) b.onclick = () => setShow(b.dataset.show);
  $("selCam").onchange = (e) => { L.cam = e.target.value; };
  for (const [k, id] of TOG) $(id).onclick = () => { L[k] = !L[k]; $(id).classList.toggle("on", L[k]); if (k === "diag") writeDiag(); };
  $("tlc").onclick = (e) => { const C = L.cur, r = e.target.getBoundingClientRect(), LW = 78, u = clamp((e.clientX - r.left - LW) / (r.width - LW - 10), 0, 1); L.t = Math.round((C.clip[0] + u * (C.clip[1] - C.clip[0])) / DT) * DT; L.playing = false; };
  window.addEventListener("keydown", (e) => { if (e.target.tagName === "SELECT") return; const k = e.key;
    if (k === " ") { e.preventDefault(); $("bPlay").onclick(); } else if (k === ",") step(e.shiftKey ? -1 : -4); else if (k === ".") step(e.shiftKey ? 1 : 4);
    else if (k === "s" || k === "S") setShow({ skin: "skel", skel: "both", both: "skin" }[L.show]); else if (k === "1") setLayout("S3"); else if (k === "2") setLayout("S3B"); else if (k === "3") setLayout("2");
    else { const t2 = TOG.find((q) => q[2] === k.toLowerCase()); if (t2) $(t2[1]).onclick(); } }); window.addEventListener("resize", () => drawTimeline()); }
function setLayout(v) { L.layout = v; if (MODES.includes(v)) L.mode = v; for (const b of document.querySelectorAll("[data-layout]")) b.classList.toggle("on", b.dataset.layout === v); writeDiag(); drawTimeline(); }
function setShow(v) { L.show = v; for (const b of document.querySelectorAll("[data-show]")) b.classList.toggle("on", b.dataset.show === v); }
async function boot() { const q = new URLSearchParams(location.search); bindUI(); const cv = $("gl"), gl = cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { $("loading").textContent = "WebGL2 unavailable"; return; }
  L.gl = gl; L.R = { gl }; L.ground = groundProg(gl); L.ballP = ballProg(gl); L.charP = charProg(gl);
  const [colliders, baked, ent] = await Promise.all([fetch("dribble1/d1_colliders.json").then((r) => r.json()), fetch("tc_baseline_88573ef0/pt_baked.json").then((r) => r.json()), W.ofCharLoad("vinicius")]);
  L.ent = ent; const E = W.RUN1_V13; L.env = { E, M4, skel: ent.skel, colliders, baked, body: E.r1Body(ent.skel) };
  if (q.get("layout")) L.layout = q.get("layout"); if (q.get("cam")) { L.cam = q.get("cam"); $("selCam").value = L.cam; } if (q.get("show")) L.show = q.get("show"); if (q.get("mode")) L.mode = q.get("mode");
  for (const [k, id] of TOG) { if (q.get(k) != null) L[k] = q.get(k) === "1"; $(id).classList.toggle("on", L[k]); }
  setLayout(L.layout); setShow(L.show); buildList(); select(q.get("case") && L.cases.some((c) => c.id === q.get("case")) ? q.get("case") : L.cases[0].id, { paused: q.get("play") === "0" }); if (q.get("t") != null) { L.t = Math.round((L.cur.t0 + +q.get("t")) / DT) * DT; L.playing = false; }
  $("loading").remove(); L.ready = true; L.external = q.get("external") === "1"; if (!L.external) requestAnimationFrame(frame); else frame(performance.now());
  const rest = L.cases.filter((c) => !L.rows.has(c.id)); const next = () => { const c = rest.shift(); if (!c || L.external) return; const C = simulate(c); L.rows.set(c.id, rowText(C)); const el = $("o_" + c.id); if (el) el.textContent = L.rows.get(c.id); setTimeout(next, 30); }; setTimeout(next, 600); }   // (the summaries only: the recordings are dropped)
// the automation surface (puppeteer: stills, checks)
W.IL = { ready: () => L.ready, L, select: (id, o) => select(id, o || { paused: true }), layout: setLayout, show: setShow, seek: (t) => { L.t = Math.round((L.cur.t0 + t) / DT) * DT; L.playing = false; frame(performance.now()); return L.t; }, cam: (c) => { L.cam = c; $("selCam").value = c; frame(performance.now()); },
  set: (o) => { for (const [k] of TOG) if (o[k] != null) L[k] = !!o[k]; writeDiag(); frame(performance.now()); }, play: (r) => { L.rate = r || 1; L.playing = true; },
  live: () => { if (L.external) { L.external = false; L.last = null; requestAnimationFrame(frame); } },
  report: () => (L.cur ? { id: L.cur.tc.id, t0: L.cur.t0, runs: Object.fromEntries(MODES.map((m) => { const R = L.cur.runs[m]; return [m, { best: R.best, trunk: R.trunk, legs: R.legs, over5: R.over.hard, strikes: R.W.l3 ? R.W.l3.contacts : null, lamSum: R.W.l3 ? +R.W.l3.apps.reduce((a, x) => a + x.lam, 0).toFixed(6) : null, out: R.out ? R.out.kind : null, impacts: R.eps.length, eps: R.eps.map((e) => ({ t0: e.t0 - L.cur.t0, why: e.why, players: Object.fromEntries(["ATT", "DEF"].filter((k) => e.players[k]).map((k) => [k, { sev: e.players[k].sev, sigma: e.players[k].sigma, cls: e.players[k].cls, outcome: e.players[k].outcome, steps: e.players[k].steps.length }])) })), ms: Math.round(R.ms) }]; })) } : null) };
boot().catch((e) => { const l = $("loading"); if (l) l.textContent = "REVIEW LAB failed: " + (e && e.stack || e); console.error(e); });
void ImpactWorld; void LimbWorld;

// ═══ STAGE 3B's OVERLAYS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const LIMBC = { STRIKE: "#4fe3ff", HELD: "#9cf0ff", ROUTE: { "LIMB YIELDS": "#4fe3ff", "LIMB AT RANGE": "#ff2d55", BODY: "#ffd45e" } };
// (the APPROVED REFERENCE: wherever the limb layer perturbed a leg, the authored leg (hip, knee, ankle, ball of the foot, toe) dashed white over it)
function reference(x, pr, dpr, F, xMax) { for (const [P, col] of [[F.a, COL.ATT], [F.d, COL.DEF]]) { if (!P.legAuth || !P.limbQ) continue; for (const X of ["R", "L"]) { const q = P.limbQ[X]; if (!q || !q.some((v) => v)) continue; const A = P.legAuth[X], pts = [A.H, A.K, A.A, A.B, A.T].map(pr); if (pts.some((p) => !p)) continue;
      x.strokeStyle = "rgba(255,255,255,0.9)"; x.lineWidth = 2 * dpr; x.setLineDash([5 * dpr, 4 * dpr]); x.beginPath(); x.moveTo(...pts[0]); for (const p of pts.slice(1)) x.lineTo(...p); x.stroke(); x.setLineDash([]);
      const k = pr(A.A); if (k) tag(x, dpr, k, `APPROVED ${X} · physical ${q.map((v) => (v * 180 / Math.PI).toFixed(0)).join(" / ")}°`, "#ffffff", xMax); } } }
// (the LIMB CONTACTS of this tick: the point, the stable normal (22 cm), the depth; STRIKE (the first resolution) or HELD (yielding))
function limbContacts(x, pr, dpr, Fr, xMax) { const r = Fr.l3; if (!r) return; for (const c of r.contacts) { const a = pr(c.at), b = pr([c.at[0] + c.n[0] * 0.22, c.at[1] + c.n[1] * 0.22, c.at[2]]); if (!a || !b) continue; const col = c.held ? LIMBC.HELD : LIMBC.STRIKE;
    arrow(x, a, b, col, dpr, 2.5); x.strokeStyle = col; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(a[0], a[1], 6 * dpr, 0, 2 * Math.PI); x.stroke();
    tag(x, dpr, a, `${c.region} ${(c.pen * 100).toFixed(1)} cm · ${c.held ? "HELD (yielding)" : "STRIKE"}${c.lam ? ` · ${c.lam.toFixed(1)} N·s` : ""}${c.unresolved ? " · UNRESOLVED" : ""}`, col, xMax); } }
// (the LIMB VELOCITY at each contact applied this tick: the contact point's velocity before (orange, 10 cm per m/s), the normal speed the impulse
// removed (cyan, along the normal) — the limb that struck, slowed by exactly what it passed on)
function limbVel(x, pr, dpr, R, Fr) { for (const a of R.l3apps) { if (a.k !== Fr.k) continue; for (const [v, dv, sgn] of [[a.vA, a.dvnA, 1], [a.vB, a.dvnB, -1]]) { if (!v) continue; const p0 = a.at, p1 = [p0[0] + v[0] * 0.1, p0[1] + v[1] * 0.1, p0[2]], q0 = pr(p0), q1 = pr(p1); if (q0 && q1) arrow(x, q0, q1, "#ffb36b", dpr, 2);
      if (dv) { const p2 = [p0[0] + a.n[0] * sgn * dv * 0.1, p0[1] + a.n[1] * sgn * dv * 0.1, p0[2]], q2 = pr(p2); if (q0 && q2) arrow(x, q0, q2, "#4fe3ff", dpr, 3); } } } }
// (the MOMENTUM PASSED this tick: each impulse at its point (2 cm per N·s) — through a limb's hip, at a body's contact point; magenta = the
// accumulated impulse over 0.15 s from the centre of mass, Stage 3's own arrow)
function momentum(x, pr, dpr, R, Fr, xMax) { const r = Fr.l3; if (!r || !r.ext) return; for (const [L2, col] of [[r.ext.A, COL.ATT], [r.ext.D, COL.DEF]]) for (const e of L2) { const a = pr(e.at), m = hyp(e.J[0], e.J[1]); if (!a || m < 0.05) continue; const b = pr([e.at[0] + e.J[0] * 0.02, e.at[1] + e.J[1] * 0.02, e.at[2]]); if (!b) continue;
    arrow(x, a, b, col, dpr, 3); tag(x, dpr, b, `${m.toFixed(1)} N·s · ${e.src.replace(/ —.*$/, "")}`, col, xMax); } }
// (the frame data of Stage 3B: this tick's limb contacts and impulses, the perturbation per leg, Stage 2's correction this tick, the ledger so far)
function limbLines(R, Fr) { const out = [], r = Fr.l3, W2 = R.W; if (r) { for (const c of r.contacts.slice(0, 3)) out.push([`LIMB CONTACT ${c.region} (${c.key}) ${(c.pen * 100).toFixed(1)} cm · ${c.held ? "HELD — yielding" : "STRIKE"} · normal [${c.n.join(", ")}]${c.lam ? ` · λ ${c.lam.toFixed(2)} N·s` : ""}${c.yielded ? ` · yielded ${c.yielded.toFixed(2)} m/s` : ""}`, c.held ? LIMBC.HELD : LIMBC.STRIKE, 600]);
    for (const a of r.apps.slice(0, 2)) out.push([`  closing ${(-a.vn).toFixed(2)} m/s · effective masses ${(1 / a.wA).toFixed(1)} / ${(1 / a.wB).toFixed(1)} kg (${a.routeA} / ${a.routeB}) → ${a.lam.toFixed(2)} N·s · energy ${a.keB.toFixed(2)} → ${a.keA.toFixed(3)} J`, "#e6efe9", 500]);
    const lg = r.legs.map((P, i) => ["R", "L"].filter((X) => P[X].q.some((v) => v)).map((X) => `${i ? "DEF" : "ATT"} ${X} ${P[X].q.join("/")}° (ankle ${(P[X].d * 100).toFixed(1)} cm)`)).flat(); if (lg.length) out.push([`LIMB PERTURBATION (ab/add · flex · swivel) ${lg.join(" · ")}`, "#9cf0ff", 500]); }
  const o = W2.occ && W2.occ.log.find((q) => q.k === Fr.k); if (o && (o.dA[0] || o.dA[1] || o.dD[0] || o.dD[1])) out.push([`STAGE 2 CORRECTION this tick ATT ${(hyp(...o.dA) * 1000).toFixed(1)} mm · DEF ${(hyp(...o.dD) * 1000).toFixed(1)} mm${o.unresolved ? " · " + o.unresolved : ""}`, "#b8c8bf", 500]);
  return out; }
// (THE ACCOUNTING PANEL, the flagship: OLD's limb strike — its source, its vector, its component along the carrier's heading, the lead the impact's
// own root shifts made — against STAGE 3B's applications, their bound, energy, components and lead; the ledger)
function accounting(C) { const out = ["", `<b>THE FLAGSHIP — THE ACCOUNTING</b> <span class="k">(the audit's failure: equal-speed side by side, a thigh brush, the bodies closing ≈ 0.20 m/s)</span>`], t0 = C.t0;
  const lead = (R, mean) => { const own = [0, 0]; for (const rr of R.W.imp.log) { const s = R.W.att.stateAt(rr.t), d = R.W.def.stateAt(rr.t), hx = Math.cos(s.psi) + (mean ? Math.cos(d.psi) : 0), hy = Math.sin(s.psi) + (mean ? Math.sin(d.psi) : 0), m = hyp(hx, hy) || 1, h = [hx / m, hy / m]; (rr.p || []).forEach((q, i) => { if (q && q.root) own[i] += q.root[0] * h[0] + q.root[1] * h[1]; }); } return own; };
  // (also along the pair's MEAN heading — the symmetric axis: the carrier leaning in is 6–7° off it, so a purely lateral push shows on his own heading)
  const leadM = (R) => { const o = lead(R, true); return `along the pair's MEAN heading (the symmetric axis): ATT ${(o[0] * 100).toFixed(1)} cm · DEF ${(o[1] * 100).toFixed(1)} cm → LEAD ${((o[0] - o[1]) * 100).toFixed(1)} cm`; };
  { const R = C.runs.S3, o = lead(R); out.push(`<b>OLD STAGE 3</b>`); for (const rr of R.W.imp.log) for (const s of rr.strike || []) { const st = R.W.att.stateAt(rr.t), h = [Math.cos(st.psi), Math.sin(st.psi)], ep = R.W.imp.episodes[0], n = ep && ep.onset ? ep.onset.contact.normal : null;
      out.push(`  LIMB STRIKE ${s.regions} at ${(rr.t - t0).toFixed(3)} s: the limbs' ARTICULATED closing ${s.art} m/s × the limbs' reduced mass (${s.mA} / ${s.mD} kg) = <span class="bad">${s.j} N·s</span> — on the LOCAL capsule normal${n ? ` [${n.join(", ")}]` : ""}: along the carrier's heading <span class="bad">${n ? (s.j * (n[0] * h[0] + n[1] * h[1])).toFixed(2) : "?"} N·s</span>`,
        `  the limb that "supplied" it: its speed after the strike <span class="bad">unchanged</span> (the animation continues — momentum from nowhere)`); }
    out.push(`  the impact's own root shifts along the carrier's heading: ATT ${(o[0] * 100).toFixed(1)} cm · DEF ${(o[1] * 100).toFixed(1)} cm → <span class="bad">LEAD ${((o[0] - o[1]) * 100).toFixed(1)} cm</span>`, `  … <span class="bad">${leadM(R)}</span>`); }
  { const R = C.runs.S3B, o = lead(R), c = R.W.l3.check; out.push(`<b>STAGE 3B</b>`); for (const a of R.W.l3.apps) { const st = R.W.att.stateAt(a.k * DT), h = [Math.cos(st.psi), Math.sin(st.psi)];
      out.push(`  ${a.held ? "held" : "STRIKE"} ${a.region} at ${(a.k * DT - t0).toFixed(3)} s: the contact points closing ${(-a.vn).toFixed(2)} m/s on the STABLE normal [${a.n.slice(0, 2).map((v) => v.toFixed(3)).join(", ")}] · effective masses ${(1 / a.wA).toFixed(1)} / ${(1 / a.wB).toFixed(1)} kg → <span class="ok">${a.lam.toFixed(2)} N·s</span> (bound ${a.src.toFixed(2)}) · the limbs' normal speed removed ${a.dvnA != null ? a.dvnA.toFixed(2) : "—"} / ${a.dvnB != null ? a.dvnB.toFixed(2) : "—"} m/s · energy ${a.keB.toFixed(2)} → ${a.keA.toFixed(3)} J · along the heading <span class="ok">${(a.lam * (a.n[0] * h[0] + a.n[1] * h[1])).toFixed(3)} N·s</span>`); }
    out.push(`  the impact's own root shifts along the carrier's heading: ATT ${(o[0] * 100).toFixed(1)} cm · DEF ${(o[1] * 100).toFixed(1)} cm → <span class="ok">LEAD ${((o[0] - o[1]) * 100).toFixed(1)} cm</span> (the bodies' headings differ by a few degrees: the side-on normal's small component along each one)`, `  … <span class="ok">${leadM(R)}</span> · 3B's impulses along it: <span class="ok">${R.W.l3.apps.reduce((sum, a) => { const s1 = R.W.att.stateAt(a.k * DT), d1 = R.W.def.stateAt(a.k * DT), hx = Math.cos(s1.psi) + Math.cos(d1.psi), hy = Math.sin(s1.psi) + Math.sin(d1.psi), m = hyp(hx, hy) || 1; return sum + a.lam * (a.n[0] * hx + a.n[1] * hy) / m; }, 0).toFixed(4)} N·s</span>`,
      `  THE LEDGER: Stage 3 took exactly what it was given ${c.stage3.toExponential(1)} N·s · every impulse paired ${c.pair.toExponential(1)} · no impulse above its bound ${c.bound.toExponential(1)} · no energy gained ${c.energy.toExponential(1)} J · OLD limb strikes: ${R.W.imp.events.filter((e) => /LIMB STRIKE/.test(e.kind)).length}`); }
  out.push(""); return out; }
