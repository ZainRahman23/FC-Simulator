// ═══ receive_kill12/rk_lab.js — RECEIVE-KILL-1.2: the episode lab with a SCALE selector (original · current · A · B = candidate)
// ═══ (RECEIVE-KILL-1.1's lab:) THE CONTROL LAB — the whole CONTROL EPISODE (first contact + follow-up foot controls) ═══
// (RECEIVE-KILL-1's lab, playing rk_sim.runEpisode: the ideal episode is the green ghost; the BC ladder shows each rating's stable-control point.)
// ═══ (RECEIVE-KILL-1 header) ═══════════════════════════════════════════════════════════════════════════════════
// One KILL at a time, every input on a control: Ball Control, incoming speed, arrival height, descent angle (vertical velocity), arrival bearing,
// lateral offset, the control surface (AUTO or forced) and the execution draw (a named standardised example or a keyed seed). Views: a gameplay /
// 3D view (the real character on the placeholder body, the ball, the ghost IDEAL ball in green), a SIDE view (height, vertical damping) and a TOP
// view (lateral control) — incoming grey, ideal green dashed, actual orange, intended point a green ring — and the BC LADDER: the same draw at
// Ball Control 10 … 99, each rating's ball 2.0 s after the touch. The page runs the same chain as the Node evidence (rk_sim.js).
// URL: ?v=12&h=0.11&drop=0&bear=0&lat=0&surface=AUTO&bc=60&draw=TYPICAL|seed3&t=…&rate=0.5&cam=near&paused=1&external=1
import { prepare, runBC, runEpisode, firstContact, drawsFor, EXAMPLES, DT, toW, at } from "./rk_sim.js";
import { RK, BC_STEPS, SURFACE_ORDER, qBC, SCALES, setScale, scaleKey, gBC } from "./rk_model.js";
import { BENCHMARKS, MATRICES, condLabel } from "./rk_conditions.js";
import { KillBody } from "./rk_body.js";
import { view, extents, COL } from "./rk_draw.js";
const W = window, M4G = typeof M4 !== "undefined" ? M4 : W.M4, Q = new URLSearchParams(location.search), $ = (s) => document.querySelector(s), fmt = (x, n = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(n));
const L = { cond: { v: +(Q.get("v") || 12), h: +(Q.get("h") || 0.11), drop: +(Q.get("drop") || 0), bear: +(Q.get("bear") || 0), lat: +(Q.get("lat") || 0), surface: Q.get("surface") || "AUTO" },
  scale: scaleKey(Q.get("scale") || "candidate"), bc: +(Q.get("bc") || 60), draw: Q.get("draw") || "TYPICAL", t: 0, rate: +(Q.get("rate") || 0.5), playing: Q.get("paused") !== "1", cam: Q.get("cam") || "near", ladder: Q.get("ladder") !== "0", ready: false };
// ── WebGL: the pitch and the ball (the RUN-1 / TURN-1 / DRIBBLE-V1 viewers' programs) ────────────────────────────────────────────────────────────
function persp(fy, aspect, n, f) { const m = new Float32Array(16); m[0] = fy / aspect; m[5] = fy; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
function lookAt(eye, at, up) { const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], nrm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); }, cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fz = nrm(sub(eye, at)), fx = nrm(cr(up, fz)), fy = cr(fz, fx), m = new Float32Array(16); m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2]; m[12] = -dt(fx, eye); m[13] = -dt(fy, eye); m[14] = -dt(fz, eye); m[15] = 1; return m; }
function shader(gl, t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
function groundProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW; void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[8]; uniform int uNSh; out vec4 o;
  void main(){ vec2 p = vec2(vW.x, -vW.z); float stripe = mod(floor(p.x / 5.25), 2.0); vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe);
    float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453); g *= 0.97 + 0.06 * n;
    vec2 q = fract(p); float grid = (smoothstep(0.985, 1.0, q.x) + smoothstep(0.985, 1.0, q.y)) * 0.05; g += grid;
    float sh = 0.0; for (int i = 0; i < 8; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    o = vec4(g * (1.0 - min(0.6, sh)), 1.0); }`;
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
// ── cameras (local offsets from the receiver's stance, then the kernel world) ───────────────────────────────────────────────────────────────────
const CAMS = { broadcast: { eye: [1.2, -24, 12], at: [1.2, 0, 0.6], fov: 13 }, near: { eye: [-2.6, -5.2, 2.4], at: [0.9, 0, 0.75], fov: 30 }, side: { eye: [0.8, -6.5, 1.2], at: [0.8, 0, 0.9], fov: 30 }, behind: { eye: [-4.8, -1.1, 2.0], at: [1.4, 0, 0.7], fov: 30 }, front: { eye: [5.2, -1.6, 1.7], at: [0.2, 0, 0.9], fov: 32 } };
function camFor(id, w, h) { const c = CAMS[id] || CAMS.near; return { view: lookAt(toW(c.eye), toW(c.at), [0, 1, 0]), proj: persp(1 / Math.tan(c.fov * Math.PI / 360), w / h, 0.1, 300) }; }
function proj3(cam, w, h, p) { const v = cam.view, pr = cam.proj, x = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12], y = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13], z = v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14];
  const cx = pr[0] * x, cy = pr[5] * y, cw = -z; if (cw <= 1e-3) return null; return [(cx / cw * 0.5 + 0.5) * w, (0.5 - cy / cw * 0.5) * h]; }

// ── the simulation of the current settings ────────────────────────────────────────────────────────────────────────────────────────────────────
function drawSpec() { return L.draw.startsWith("seed") ? { seed: +L.draw.slice(4) } : { example: L.draw }; }
function compute() {
  setScale(L.scale); const t0 = performance.now(), P = prepare(Object.assign({}, L.cond)); L.P = P; const spec = drawSpec(); L.N = drawsFor(Object.assign({ event: "kill1" }, spec));
  if (P.plan.none) { L.run = null; L.ep = null; L.ladder = L.ladder === false ? false : []; L.body = null; L.dur = 2; L.t0 = 0; L.simMs = performance.now() - t0; return; }
  L.run = runBC(P, L.bc, L.N, { post: 2.2, every: 2 }); L.fc = firstContact(P, L.run.ex, L.run.run); L.ep = runEpisode(P, L.bc, spec, { every: 1 }); L.IE = runEpisode(P, 99, { example: "PERFECT" }, { every: 2 });
  L.ladder = L.ladder !== false ? BC_STEPS.map((bc) => ({ bc, ep: runEpisode(P, bc, spec, { every: 12 }) })) : false;
  L.body = W.RUN1_V13 && L.skel ? new KillBody(W.RUN1_V13, M4G, L.skel, P, L.ep) : null; L.tc = P.kc * DT; L.t0 = Math.max(0, L.tc - 1.3); L.dur = L.tc + 3.0;
  if (L.t < L.t0 || L.t > L.dur) L.t = L.t0; L.simMs = performance.now() - t0;
  // a fingerprint (Chrome = Node): every contact's executed launch and tick, the ball at the end, the stable time
  let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const c of L.ep.contacts) { mix(c.i); for (const x of c.ex.v) mix(x); } for (const x of L.ep.m.finalBall) mix(x); mix(L.ep.m.tStable == null ? -1 : L.ep.m.tStable); mix(P.kc); L.hash = h.toString(16);
}
function ballState(t) { const P = L.P, k = Math.round(t / DT); if (!L.ep || k <= P.kc) { const s = P.pred.P[Math.min(P.pred.P.length - 1, Math.max(0, k))]; return { a: s.p, i: s.p }; } const i = k - P.kc; return { a: at({ rec: L.ep.rec }, i).p, i: at({ rec: L.IE.rec }, i).p }; }
const epParts = (ep) => ({ path: ep.rec.filter((r, j) => j % 3 === 0 && r.i <= 2.8 / DT).map((r) => r.p), follow: ep.contacts.slice(1).map((c) => ({ p: c.contact, label: "contact " + c.n })), stable: ep.m.stablePoint, moves: [ep.contacts[0].stance].concat(ep.contacts.slice(1).map((c) => c.stance)) });

// ── rendering ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function render() {
  if (!L.ready) return; const P = L.P, gl = L.gl, cv = L.cv, dpr = L.dpr || W.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); L.ov.width = cv.width; L.ov.height = cv.height; }
  const ctx = L.ov.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, L.ov.width, L.ov.height); ctx.scale(dpr, dpr);
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const cam = camFor(L.cam, w, h), bs = P.plan.none ? null : ballState(L.t), pose = L.body && bs ? L.body.poseAt(L.t, bs.a) : null;
  const sh = new Float32Array(32); let ns = 0; const push = (p, s, wt) => { if (ns < 8) { sh.set([toW(p)[0], -toW(p)[2], s, wt], ns * 4); ns++; } };
  if (bs) { push([bs.a[0], bs.a[1], 0], 0.12 + Math.max(0, bs.a[2] - 0.11) * 0.4, 0.6 * Math.exp(-Math.max(0, bs.a[2] - 0.11) * 4)); } if (pose) push([pose.S[0], pose.S[1], 0], 0.42, 0.4);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
  const G = L.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, cam.view); gl.uniformMatrix4fv(G.u.proj, false, cam.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  if (pose && L.ent) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(L.R, L.ent, pose.skin, cam.view, cam.proj); gl.disable(gl.CULL_FACE); }
  const B = L.ball, drawBall = (p, tint) => { gl.useProgram(B.p); gl.uniformMatrix4fv(B.u.view, false, cam.view); gl.uniformMatrix4fv(B.u.proj, false, cam.proj); gl.uniform3fv(B.u.c, toW(p)); gl.uniform4fv(B.u.q, [0, 0, 0, 1]); gl.uniform1f(B.u.r, 0.11); gl.uniform3fv(B.u.tint, tint); gl.bindVertexArray(B.vao); gl.drawElements(gl.TRIANGLES, B.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); };
  if (bs) { if (L.t > L.tc + 1e-6 && L.showIdeal !== false) drawBall(bs.i, [0.45, 1.0, 0.6]); drawBall(bs.a, [1, 1, 1]); }
  // overlay in the 3D view: paths, contact marker, intended point, ladder
  if (!P.plan.none) {
    const pr = (p) => proj3(cam, w, h, toW(p)), line = (pts, col, wd, dash) => { ctx.beginPath(); let s = false; for (const p of pts) { const q = pr(p); if (!q) continue; if (!s) { ctx.moveTo(q[0], q[1]); s = true; } else ctx.lineTo(q[0], q[1]); } ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
    const kc = P.kc, inc = []; for (let k = Math.max(0, kc - Math.round(1.3 / DT)); k <= kc; k += 3) inc.push(P.pred.P[k].p); line(inc, COL.incoming, 1.5, [4, 4]);
    const EI = epParts(L.IE), EA = epParts(L.ep); line(EI.path, COL.ideal, 2, [6, 4]); line(EA.path, COL.actual, 2.2);
    for (const F of EA.follow) { const q = pr(F.p); if (q) { ctx.beginPath(); ctx.arc(q[0], q[1], 6, 0, 2 * Math.PI); ctx.strokeStyle = COL.follow; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = COL.follow; ctx.font = "11px Menlo, monospace"; ctx.fillText(F.label, q[0] + 8, q[1] - 6); } }
    if (EA.stable) { const q = pr(EA.stable); if (q) { ctx.strokeStyle = COL.stable; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0], q[1] - 7); ctx.lineTo(q[0] + 7, q[1]); ctx.lineTo(q[0], q[1] + 7); ctx.lineTo(q[0] - 7, q[1]); ctx.closePath(); ctx.stroke(); } }
    if (EA.moves.length > 1) line(EA.moves.map((S) => [S[0], S[1], 0.01]), COL.move, 2);
    const tg = P.ideal.target, ring = []; for (let a = 0; a <= 32; a++) ring.push([tg[0] + 0.5 * Math.cos(a / 32 * 2 * Math.PI), tg[1] + 0.5 * Math.sin(a / 32 * 2 * Math.PI), 0.005]); line(ring, "rgba(79,209,139,0.6)", 1.2);
    const cq = pr(P.contact); if (cq) { ctx.beginPath(); ctx.arc(cq[0], cq[1], 7, 0, 2 * Math.PI); ctx.strokeStyle = COL.surf[P.plan.sf.S.group]; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = COL.surf[P.plan.sf.S.group]; ctx.font = "11px Menlo, monospace"; ctx.fillText("CONTACT · " + P.plan.sf.key, cq[0] + 10, cq[1] - 8); }
    if (L.ladder) for (const rn of L.ladder) { const p = rn.ep.m.stablePoint || rn.ep.m.finalBall, q = pr(p); if (q) { ctx.fillStyle = ladderCol(rn.bc); ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, 2 * Math.PI); ctx.fill(); ctx.font = "10px Menlo, monospace"; ctx.fillText(rn.bc, q[0] + 4, q[1] - 3); } }
    if (document.body.classList.contains("compare")) { const m = L.ep.m, lbl = `BC ${L.bc} · ${SCALES[L.scale].tag}`, sub = `${m.continuation} · ${m.contacts} contact${m.contacts > 1 ? "s" : ""} · extra step ${m.extraAdj == null ? "—" : fmt(m.extraAdj) + " m"} · stable ${m.tStable == null ? "—" : fmt(m.tStable) + " s"}`;
      ctx.fillStyle = "rgba(10,14,12,0.72)"; ctx.fillRect(0, 0, w, 58); ctx.fillStyle = "#ffffff"; ctx.font = "bold 26px -apple-system, Helvetica, sans-serif"; ctx.fillText(lbl, 12, 32); ctx.fillStyle = COL.cls[m.continuation]; ctx.font = "bold 15px -apple-system, Helvetica, sans-serif"; ctx.fillText(sub, 12, 52);
      ctx.fillStyle = "#e6efe9"; ctx.font = "13px Menlo, monospace"; ctx.fillText(`t ${L.t - L.tc >= 0 ? "+" : ""}${fmt(L.t - L.tc, 2)} s`, w - 110, 32); }
    else { ctx.fillStyle = "#e6efe9"; ctx.font = "12px Menlo, monospace"; ctx.fillText(`t ${fmt(L.t - L.tc, 2)} s from the first contact · BC ${L.bc} · ${L.ep.contacts.map((c) => c.sf.key).join(" → ")} · ${L.ep.m.continuation} · camera ${L.cam}`, 10, 18); }
  }
  // 2D views
  for (const [id, kind] of [["#side", "side"], ["#top", "top"]]) {
    const c = $(id), cw = c.clientWidth, chh = c.clientHeight; if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(chh * dpr); }
    const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cw, chh); if (P.plan.none) { x.fillStyle = COL.dim; x.fillText("no feasible authored action for this ball and surface", 12, 20); continue; }
    const kc = P.kc, inc = []; for (let k = Math.max(0, kc - Math.round(1.3 / DT)); k <= kc; k += 3) inc.push(P.pred.P[k].p);
    const EI = epParts(L.IE), EA = epParts(L.ep), lad = L.ladder ? L.ladder.map((rn) => ({ p: rn.ep.m.stablePoint || rn.ep.m.finalBall, label: String(rn.bc), color: ladderCol(rn.bc) })) : [];
    const ext = L.extCache || (L.extCache = extents([inc.slice(-20), EI.path, EA.path, lad.map((l) => l.p), [[0, 0, 1.9]]], L.near ? { near: 3.5 } : {}));
    const grp = P.plan.sf.S.group, hi = { FOOT: ["foot_", "toe_", "shin_"].map((b) => b + (P.plan.sf.side === "L" ? "L" : "R")), THIGH: ["thigh_" + (P.plan.sf.side === "L" ? "L" : "R")], CHEST: ["chest", "spine"], HEAD: ["head", "neck"] }[grp];
    view(x, kind, { x: 0, y: 0, w: cw, h: chh }, ext, { incoming: inc, ideal: EI.path, actual: EA.path, contact: P.contact, target: P.ideal.target, group: grp, J: pose ? pose.J : null, hiBones: hi, ballNow: bs ? bs.a : null, idealNow: bs && L.t > L.tc ? bs.i : null, ladder: lad.length ? lad : null, follow: EA.follow.map((f, k) => ({ p: f.p, label: String(k + 2) })), stable: EA.stable, moves: EA.moves, drop: grp !== "FOOT" ? L.fc.drop : null, dropIdeal: grp !== "FOOT" ? L.fc.dropIdeal : null }, { font: 10, ladderLabels: true, ringM: 1, lw: 1.3, label: kind === "side" ? "SIDE — forward (→ passer) × height" : "TOP — forward × the receiver's right (down)" });
  }
}
const ladderCol = (bc) => { const t = (bc - 10) / 89; return `hsl(${(t * 130).toFixed(0)}, 80%, ${(55 + 10 * t).toFixed(0)}%)`; };
function hud() {
  const P = L.P, el = $("#hud"); if (!P) return; if (P.plan.none) { el.innerHTML = `<b>No feasible authored action</b> for this ball with surface ${L.cond.surface}. Rejections per surface: <pre>${JSON.stringify(P.plan.rej, null, 1)}</pre>`; return; }
  const pl = P.plan, d = pl.dif, ex = L.run.ex, fc = L.fc, m = L.ep.m, arr = P.sol.arrival, sp = Math.hypot(...arr.v), v = (a) => `(${a.map((x) => fmt(x)).join(", ")})`, X = RK.exec;
  const contacts = L.ep.contacts.map((c) => `<tr><td>${c.n}</td><td style="color:${COL.surf[c.sf.S.group]}">${c.sf.key}</td><td>${fmt(c.i * DT)} s</td><td>D ${fmt(c.D)}</td><td>σ ${fmt(c.ex.sig.reb)}</td><td>N ${fmt(c.N.reb)}/${fmt(c.N.lat)}/${fmt(c.N.third)}</td><td>exit ${fmt(Math.hypot(...c.ex.v))} (ideal ${fmt(Math.hypot(...c.ideal.v))})</td><td>${c.adjust != null ? "step " + fmt(c.adjust) + " m" : ""}</td></tr>`).join("");
  el.innerHTML = `<div class="cols"><div><h3>Incoming (at the reach plane)</h3>
   ${fmt(sp, 2)} m/s · vertical ${fmt(arr.v[2], 2)} m/s · height ${fmt(arr.p[2])} m · ${P.sol.kind} · at the contact descent ${fmt(pl.inc.descentDeg, 1)}°, bearing ${fmt(pl.inc.bear, 0)}°
   <h3>First action (BC-independent)</h3><b style="color:${COL.surf[pl.sf.S.group]}">${pl.sf.key}</b> · CONTACT ${fmt(P.kc * DT, 3)} s · D ${fmt(d.D, 3)} (m ${fmt(d.m)} × vEff/vRef ${fmt(d.parts.speed, 3)} × (1 + ${fmt(d.parts.height, 3)} + ${fmt(d.parts.jump, 3)} + ${fmt(d.parts.bearing, 3)} + ${fmt(d.parts.shift, 3)}))<br>
   ideal ${P.ideal.kind} → intended point ${v(P.ideal.target.slice(0, 2))} · exit ${v(P.ideal.v)} m/s${P.ideal.capExtra > 0 ? ` · surface limit +${fmt(P.ideal.capExtra)}` : ""}
   <h3>Ball Control ${L.bc} — ${SCALES[L.scale].label}</h3>E = ${X.eFloor} + ${X.eSkill} · s ${fmt(qBC(L.bc), 4)} · c(D) ${fmt(d.D / (d.D + X.Dc), 3)} = <b>${fmt(ex.sig.E, 4)}</b>${X.curve === "remap" ? ` · BC ${L.bc} executes like current BC ${fmt(gBC(L.bc), 1)}` : ""}</div>
   <div><h3>FIRST CONTACT</h3>exit ${v(fc.v)} m/s (${fmt(fc.speed)}; ideal ${fmt(fc.idealSpeed)}) · <b>velocity error ${fmt(fc.velErr)} m/s</b>${ex.capped ? " · capped" : ""}<br>
   position error vs the ideal: 0.10 s <b>${fmt(fc["e0.1"])}</b> · 0.25 s <b>${fmt(fc["e0.25"])}</b> · 0.50 s ${fmt(fc["e0.5"])} · 1.0 s ${fmt(fc["e1"])} · 2.0 s ${fmt(fc["e2"])} m${fc.dropErr != null ? ` · <b>drop point ${fmt(fc.dropErr)} m</b>` : ""}
   <h3>The episode's contacts</h3><table class="lad">${contacts}</table>
   <h3>COMPLETE RECEIVE</h3><b style="color:${COL.cls[m.continuation]}">${m.continuation}</b> · ${m.contacts} contact${m.contacts > 1 ? "s" : ""} · next feasible control ${fmt(m.tNextFeasible)} s · adjustment ${fmt(m.adjust)} m (extra ${m.extraAdj == null ? "—" : fmt(m.extraAdj)} m) · stable ${m.stable ? fmt(m.tStable) + " s (ideal " + fmt(L.IE.m.tStable) + ", " + (m.extraT >= 0 ? "+" : "") + fmt(m.extraT) + ")" + " · ball " + fmt(m.dStable) + " m from the player" : "— a loose ball"}${L.ep.notes.length ? "<br><span class='dim'>" + L.ep.notes.join("; ") + "</span>" : ""}</div>
   <div><h3>BC ladder (the same draws, every contact)</h3>${L.ladder ? `<table class="lad"><tr><td></td>${L.ladder.map((r) => `<td style="color:${ladderCol(r.bc)}">${r.bc}</td>`).join("")}</tr><tr><td class="dim">class</td>${L.ladder.map((r) => `<td style="color:${COL.cls[r.ep.m.continuation]}">${r.ep.m.continuation.slice(0, 3)}</td>`).join("")}</tr><tr><td class="dim">+adj m</td>${L.ladder.map((r) => `<td>${r.ep.m.extraAdj == null ? "—" : fmt(r.ep.m.extraAdj)}</td>`).join("")}</tr><tr><td class="dim">stable s</td>${L.ladder.map((r) => `<td>${r.ep.m.tStable == null ? "—" : fmt(r.ep.m.tStable)}</td>`).join("")}</tr><tr><td class="dim">contacts</td>${L.ladder.map((r) => `<td>${r.ep.m.contacts}</td>`).join("")}</tr></table>` : "off"}
   <span class="dim">computed in ${fmt(L.simMs, 0)} ms · fingerprint ${L.hash}</span></div></div>`;
}
// ── controls ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SL = [["bc", "Ball Control", 1, 99, 1], ["v", "speed m/s", 1, 32, 0.5], ["h", "height m", 0.11, 2.3, 0.01], ["drop", "descent °", -30, 70, 1], ["bear", "bearing °", -110, 110, 5], ["lat", "lateral m", -0.8, 0.8, 0.05]];
function controls() {
  const box = $("#ctl"); box.innerHTML = `<b class="t">Kill scale lab · RECEIVE-KILL-1.2</b><label>scale <select id="scl">${Object.entries(SCALES).map(([k, S]) => `<option value="${k}" ${k === L.scale ? "selected" : ""}>${S.label}</option>`).join("")}</select></label>` + SL.map(([k, l, a, b, s]) => `<label class="sl">${l} <input type="range" id="s_${k}" min="${a}" max="${b}" step="${s}" value="${k === "bc" ? L.bc : L.cond[k]}"><output id="o_${k}">${k === "bc" ? L.bc : L.cond[k]}</output></label>`).join("") +
    `<label>surface <select id="surf">${["AUTO", "FOOT", "THIGH", "CHEST", "HEAD", ...SURFACE_ORDER.filter((s) => s.startsWith("FOOT_"))].map((s) => `<option ${s === L.cond.surface ? "selected" : ""}>${s}</option>`).join("")}</select></label>
     <label>draw <select id="drw">${Object.keys(EXAMPLES).map((k) => `<option value="${k}" ${k === L.draw ? "selected" : ""}>${k.toLowerCase()}</option>`).join("")}${Array.from({ length: 40 }, (_, i) => `<option value="seed${i + 1}" ${"seed" + (i + 1) === L.draw ? "selected" : ""}>seed ${i + 1}</option>`).join("")}</select></label>
     <label>preset <select id="pre"><option value="">—</option>${BENCHMARKS.map((b) => `<option value="${b.id}">${b.id}</option>`).join("")}</select></label>
     <label>camera <select id="cam">${Object.keys(CAMS).map((c) => `<option ${c === L.cam ? "selected" : ""}>${c}</option>`).join("")}</select></label>
     <button id="play">${L.playing ? "❚❚" : "▶"}</button>${[1, 0.5, 0.25, 0.1].map((r) => `<button class="rt ${r === L.rate ? "on" : ""}" data-r="${r}">${r}×</button>`).join("")}<button id="rst">⟲</button>
     <label><input type="checkbox" id="lad" ${L.ladder !== false ? "checked" : ""}> BC ladder</label><label><input type="checkbox" id="nr"> near 3.5 m</label>
     <input type="range" id="scrub" min="0" max="1000" value="0" style="width:220px"><a href="receive_kill12.html" target="_blank">matrix ↗</a>`;
  const upd = () => { const u = new URL(location.href); for (const [k] of SL) u.searchParams.set(k, k === "bc" ? L.bc : L.cond[k]); u.searchParams.set("surface", L.cond.surface); u.searchParams.set("scale", L.scale); u.searchParams.set("draw", L.draw); u.searchParams.set("cam", L.cam); history.replaceState(null, "", u.toString()); };
  let pend = null; const recompute = () => { if (pend) clearTimeout(pend); pend = setTimeout(() => { L.extCache = null; compute(); hud(); render(); upd(); }, 30); };
  for (const [k] of SL) $("#s_" + k).oninput = (e) => { const x = +e.target.value; $("#o_" + k).textContent = x; if (k === "bc") L.bc = x; else L.cond[k] = x; recompute(); };
  $("#scl").onchange = (e) => { L.scale = e.target.value; recompute(); };
  $("#surf").onchange = (e) => { L.cond.surface = e.target.value; recompute(); }; $("#drw").onchange = (e) => { L.draw = e.target.value; recompute(); }; $("#cam").onchange = (e) => { L.cam = e.target.value; upd(); };
  $("#pre").onchange = (e) => { const b = BENCHMARKS.find((x) => x.id === e.target.value); if (!b) return; L.cond = Object.assign({ v: 12, h: 0.11, drop: 0, bear: 0, lat: 0, surface: "AUTO" }, b.cond); if (L.cond.h == null) L.cond.h = 0.11; for (const [k] of SL) if (k !== "bc") { $("#s_" + k).value = L.cond[k]; $("#o_" + k).textContent = L.cond[k]; } $("#surf").value = L.cond.surface; recompute(); };
  $("#play").onclick = () => { L.playing = !L.playing; $("#play").textContent = L.playing ? "❚❚" : "▶"; }; $("#rst").onclick = () => { L.t = L.t0; };
  document.querySelectorAll(".rt").forEach((b) => (b.onclick = () => { L.rate = +b.dataset.r; document.querySelectorAll(".rt").forEach((x) => x.classList.toggle("on", x === b)); }));
  $("#lad").onchange = (e) => { L.ladder = e.target.checked ? [] : false; recompute(); }; $("#nr").onchange = (e) => { L.near = e.target.checked; L.extCache = null; render(); };
  $("#scrub").oninput = (e) => { L.playing = false; $("#play").textContent = "▶"; L.t = L.t0 + (L.dur - L.t0) * (+e.target.value / 1000); };
  W.addEventListener("keydown", (e) => { if (e.target.tagName === "INPUT" && e.target.type !== "range") return; if (e.key === " ") { L.playing = !L.playing; e.preventDefault(); } if (e.key === ".") { L.playing = false; L.t += 1 / 60; } if (e.key === ",") { L.playing = false; L.t -= 1 / 60; } if (e.key === "r") L.t = L.t0; });
}
function frame(now) { if (L.last == null) L.last = now; const dt = Math.min(0.05, (now - L.last) / 1000); L.last = now; if (L.playing) { L.t += dt * L.rate; if (L.t > L.dur) L.t = L.t0; } const sc = $("#scrub"); if (sc && L.dur > L.t0) sc.value = String(Math.round(1000 * (L.t - L.t0) / (L.dur - L.t0))); render(); requestAnimationFrame(frame); }
async function boot() {
  L.cv = $("#gl"); L.ov = $("#ov"); const gl = L.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) throw new Error("WebGL2 unavailable");
  L.gl = gl; L.R = { gl }; L.ground = groundProg(gl); L.ball = ballProg(gl);
  try { L.ent = await W.ofCharLoad("vinicius"); L.skel = L.ent.skel; } catch (e) { console.warn("character", e); }
  if (Q.get("ladder") === "0") L.ladder = false; else L.ladder = [];
  controls(); compute(); hud(); L.ready = true; if (Q.get("t")) L.t = L.tc + +Q.get("t");
  if (Q.get("compare") === "1") document.body.classList.add("compare");
  W.RKL = { state: L, set(t, o) { if (o) Object.assign(L, o); L.t = t; render(); return true; }, setRel(dt) { L.t = L.tc + dt; render(); return true; },
    // Chrome = Node: one condition through the page's own chain (no reload)
    evalCase(cond, bc, draw, scale) { if (scale) L.scale = scaleKey(scale); L.cond = Object.assign({ h: 0.11, drop: 0, bear: 0, lat: 0, surface: "AUTO" }, cond); L.bc = bc; L.draw = draw; L.extCache = null; L.ladder = false; compute(); const P = L.P; if (P.plan.none) return { none: true }; const ep = L.ep; return { hash: L.hash, surface: P.plan.sf.key, kc: P.kc, D: P.plan.dif.D, contacts: ep.contacts.map((c) => [c.sf.key, c.i, c.ex.v]), final: ep.m.finalBall, tStable: ep.m.tStable, cls: ep.m.continuation, launched: ep.launched, fc: [L.fc.velErr, L.fc["e0.25"], L.fc.dropErr] }; } }; W.RKL_READY = true;
  if (Q.get("external") === "1") { L.playing = false; render(); } else requestAnimationFrame(frame);
}
boot().catch((e) => { $("#hud").textContent = "lab failed: " + (e && e.stack || e); console.error(e); });
