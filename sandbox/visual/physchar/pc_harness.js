// ═══ physchar/pc_harness.js — interactive review harness: GATE A (passive drops) + GATE B (active finite-strength control) ══════════
// The run is simulated IN THE BROWSER with the same modules the Node measurement uses (pc_body / pc_jolt / pc_gatea / pc_control /
// pc_gateb, the same vendored Jolt WASM), every physics step recorded, then played back: scrub, ±1 physics step, 1× / 0.5× / 0.25×,
// jump to the worst frame. The mesh is skinned from the solved bodies only (pc_fit.js). In Gate B the authored request is drawn as a
// GHOST (forward kinematics of the joint targets) — it is never applied to a body.
import { buildBodySpec, CALIBS } from "./pc_body.js";
import { limitsFor } from "./pc_balance.js";
import { loadJolt } from "./pc_jolt.js";
import { runDrop, DROPS, GATE_A_TSC, GATE_A_WORLD, TIMESTEP_CONFIGS, jointState } from "./pc_gatea.js";
import { runTest, TESTS, GATE_B_TSC } from "./pc_gateb.js";
import { runC1, TESTS_C1, GATE_C1_TSC } from "./pc_gatec1.js";
import { runC2, TESTS_C2 } from "./pc_gatec2.js";
import { runC3, TESTS_C3 } from "./pc_gatec3.js";
import { footprint } from "./pc_support.js";
import { buildPoses, fk } from "./pc_control.js";
import { skinMatrices, boneBodyMap, meshLowestY, referencedVertices } from "./pc_fit.js";
import { V, Q, deg } from "./pc_math.js";

OF_CHAR.base = "../../../assets/characters/outfield";
const $ = (id) => document.getElementById(id);
const QS = new URLSearchParams(location.search);
const H = { J: null, spec: null, entry: null, map: null, ref: null, suiteKey: (QS.get("suite") || "C").toUpperCase(), drop: "A", test: "E", testC: QS.get("suite") && QS.get("suite").toUpperCase() === "C" && QS.get("test") || "PF60", testC2: QS.get("test") || "D_fwd_R", testC3: QS.get("suite") && QS.get("suite").toUpperCase() === "C3" && QS.get("test") || "B_F80", run: null, i: 0, playing: false, speed: 1, acc: 0, last: 0,
  cam: { az: 35, el: 18, dist: 3.4, target: [0, 0.6, 0] }, follow: true, mesh: true, phys: true,
  ov: { bodies: false, colliders: true, coms: false, tcom: true, anchors: true, axes: false, limits: false, ground: true, normals: false, pen: true, vel: false, angvel: false, jerr: true, sleep: true,
        ghost: true, skel: false, errlab: true, torque: true, satur: true, support: true, obstacle: true, impulse: true,
        c_com: true, c_xi: true, c_region: true, c_cop: true, c_feet: true, c_grf: false, c_hip: true, c_banner: true,
        d_fp: true, d_reach: true, d_excl: true, d_path: true, d_trace: true, d_clear: true, d_env: true,
        a_jc: false, a_vis: false, a_pskel: false, a_rskel: false, a_live: false },
  ghostRoot: "actual", jsel: "hip_R", comp: "y", suite: null, suiteB: null, skin: null, poses: null,
  arms: QS.get("arms") === "1", prot: QS.get("prot") === "1", calib: QS.get("calib") === "V1" ? "V1" : "V1.1", ctrlv: ["approved", "recal", "diag"].includes(QS.get("ctrl")) ? QS.get("ctrl") : "", specs: {}, posesBy: {}, suitesBy: {} };
window.GATEA = H;
const isB = () => H.suiteKey === "B", isC = () => H.suiteKey === "C", isC2 = () => H.suiteKey === "C2", isC3 = () => H.suiteKey === "C3", isBal = () => isC() || isC2() || isC3();

// ── GL: mirrored camera (the engine's; Astra meshes are wound for it), a line renderer, the turf ──────────────────────────────────
const canvas = $("gl"), gl = canvas.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true }), R = { gl };
function persp(fovDeg, aspect, n, f) { const p = new Float32Array(16), s = 1 / Math.tan(fovDeg * Math.PI / 360); p[0] = -s / aspect; p[5] = s; p[10] = (f + n) / (n - f); p[11] = -1; p[14] = 2 * f * n / (n - f); return p; }
function lookAt(e, t) { const f = V.norm(V.sub(t, e)), r = V.norm(V.cross(f, [0, 1, 0])), u = V.cross(r, f), m = new Float32Array(16);
  m[0] = r[0]; m[4] = r[1]; m[8] = r[2]; m[1] = u[0]; m[5] = u[1]; m[9] = u[2]; m[2] = -f[0]; m[6] = -f[1]; m[10] = -f[2];
  m[12] = -V.dot(r, e); m[13] = -V.dot(u, e); m[14] = V.dot(f, e); m[15] = 1; return m; }
const mul4 = (a, b) => { const r = new Float32Array(16); for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) { let s = 0; for (let j = 0; j < 4; j++) s += a[j * 4 + k] * b[c * 4 + j]; r[c * 4 + k] = s; } return r; };
function shader(vs, fs) { const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; }
const LP = shader(`#version 300 es
  layout(location=0) in vec3 aP; layout(location=1) in vec4 aC; uniform mat4 uV, uP; out vec4 vC; void main(){ vC = aC; gl_Position = uP * uV * vec4(aP, 1.0); }`,
  `#version 300 es
  precision highp float; in vec4 vC; layout(location=0) out vec4 o; void main(){ o = vC; }`);
const lineBuf = gl.createBuffer(), lineVao = gl.createVertexArray(); let lines = [];
gl.bindVertexArray(lineVao); gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12); gl.bindVertexArray(null);
const L = (a, b, c) => { lines.push(a[0], a[1], a[2], c[0], c[1], c[2], c[3], b[0], b[1], b[2], c[0], c[1], c[2], c[3]); };
function flushLines(view, proj, depth) { if (!lines.length) return; gl.useProgram(LP); gl.uniformMatrix4fv(gl.getUniformLocation(LP, "uV"), false, view); gl.uniformMatrix4fv(gl.getUniformLocation(LP, "uP"), false, proj);
  if (depth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STREAM_DRAW); gl.bindVertexArray(lineVao); gl.drawArrays(gl.LINES, 0, lines.length / 7); gl.bindVertexArray(null); lines = []; gl.disable(gl.BLEND); }
const GP = shader(`#version 300 es
  layout(location=0) in vec3 aP; uniform mat4 uV, uP; out vec3 vW; void main(){ vW = aP; gl_Position = uP * uV * vec4(aP, 1.0); }`,
  `#version 300 es
  precision highp float; in vec3 vW; layout(location=0) out vec4 o;
  void main(){ vec2 g = abs(fract(vW.xz) - 0.5); float line = step(0.492, max(g.x, g.y)); float stripe = mod(floor(vW.x / 2.0), 2.0);
    vec3 c = mix(vec3(0.20, 0.42, 0.20), vec3(0.23, 0.47, 0.22), stripe); c = mix(c, vec3(0.34, 0.56, 0.32), line * 0.6); o = vec4(c, 1.0); }`);
const groundBuf = gl.createBuffer(), groundVao = gl.createVertexArray();
gl.bindVertexArray(groundVao); gl.bindBuffer(gl.ARRAY_BUFFER, groundBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-30, 0, -30, 30, 0, -30, 30, 0, 30, -30, 0, -30, 30, 0, 30, -30, 0, 30]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);

// ── shapes → world wireframes ─────────────────────────────────────────────────────────────────────────────────────────────────────
const toW = (s, sh, p) => V.add(s.pos, Q.rot(s.rot, V.add(sh.pos, Q.rot(sh.rot, p))));
function wireShape(s, sh, col) {
  const circ = (y, r, plane) => { const out = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2, c = Math.cos(a) * r, d = Math.sin(a) * r; out.push(plane === "xz" ? [c, y, d] : plane === "xy" ? [c, y + d, 0] : [0, y + d, c]); } return out; };
  const poly = (pts) => { for (let k = 1; k < pts.length; k++) L(toW(s, sh, pts[k - 1]), toW(s, sh, pts[k]), col); };
  if (sh.type === "sphere") { for (const pl of ["xz", "xy", "zy"]) poly(circ(0, sh.r, pl)); return; }
  if (sh.type === "capsule" || sh.type === "tapered") { const rT = sh.type === "capsule" ? sh.r : sh.rTop, rB = sh.type === "capsule" ? sh.r : sh.rBot, h = sh.half;
    poly(circ(h, rT, "xz")); poly(circ(-h, rB, "xz"));
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L(toW(s, sh, [x * rT, h, z * rT]), toW(s, sh, [x * rB, -h, z * rB]), col);
    const cap = (y, r, sgn) => { for (const pl of ["xy", "zy"]) { const pts = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI, c = Math.cos(a) * r, d = Math.sin(a) * r * sgn; pts.push(pl === "xy" ? [c, y + d, 0] : [0, y + d, c]); } poly(pts); } };
    cap(h, rT, 1); cap(-h, rB, -1); return; }
  if (sh.type === "box") { const e = sh.he, c = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) c.push([x * e[0], y * e[1], z * e[2]]);
    for (const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) L(toW(s, sh, c[a]), toW(s, sh, c[b]), col); }
}
const cross3 = (p, r, col) => { L(V.add(p, [-r, 0, 0]), V.add(p, [r, 0, 0]), col); L(V.add(p, [0, -r, 0]), V.add(p, [0, r, 0]), col); L(V.add(p, [0, 0, -r]), V.add(p, [0, 0, r]), col); };

// ── simulation ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const title = () => isC3() ? TESTS_C3[H.testC3].title : isC2() ? TESTS_C2[H.testC2].title : isC() ? TESTS_C1[H.testC].title : isB() ? TESTS[H.test].title : DROPS[H.drop].title;
function simulate() {
  $("status").textContent = `simulating ${title()} …`; H.playing = false; $("play").textContent = "▶ play"; H.run = null;   // no frame is drawn from the previous suite's run while switching
  setTimeout(() => {
    const t0 = performance.now();
    const extra = Object.assign({}, H.arms ? { reactiveArms: true } : {}, H.prot ? { protective: true } : {});
    H.run = isC3() ? runC3(H.J, H.spec, H.testC3, { keepStates: true, poses: H.poses, ctrlExtra: extra }) : isC2() ? runC2(H.J, H.spec, H.testC2, { keepStates: true, poses: H.poses, ctrl: ctrlOpts() }) : isC() ? runC1(H.J, H.spec, H.testC, { keepStates: true, poses: H.poses, ctrlExtra: extra }) : isB() ? runTest(H.J, H.spec, H.test, { keepStates: true, poses: H.poses }) : runDrop(H.J, H.spec, H.drop, { tsc: GATE_A_TSC, world: GATE_A_WORLD, keepStates: true, seconds: 6 });
    H.simMs = performance.now() - t0; H.i = 0; H.acc = 0; $("scrub").max = H.run.recs.length - 1; $("scrub").value = 0; renderSide(); drawChart(); drawChart2();
    window.GATEA_READY = true; $("status").textContent = "";
  }, 20);
}
// V1.1 anatomy calibration: the body selector rebuilds the spec (and poses) and re-simulates the same test; the C2 controller variant is
// the approved controller, + the V1.1 recalibration R1·R2 (reach geometry), or + R1·R2 + the D1 diagnostic (unload intent) — never mixed silently
// "" = the body's WORKING controller (pc_balance controllerProfile: V1 → as approved, V1.1 → the integrated V1.1 controller); "approved" = the
// approved Gate C2 controller; "recal" / "diag" = the historical V1.1-report variants (R1·R2 / + D1)
function ctrlOpts() { if (H.ctrlv === "approved") return {}; if (H.ctrlv === "recal") return { anticipateReach: true, reachToGround: true }; if (H.ctrlv === "diag") return { anticipateReach: true, reachToGround: true, diagUnload: true }; return undefined; }
function applySuites() { const b = H.suitesBy[H.calib] || {}; H.suiteC3 = b.C3 || null; H.suite = b.A || null; H.suiteB = b.B || null; H.suiteC = b.C || null; H.suiteC2 = (H.calib === "V1.1" ? b["C2" + (H.ctrlv || "working")] : b.C2) || null; }
function setCalib(c, ctrlv) { H.calib = c; if (ctrlv != null) H.ctrlv = ctrlv; H.spec = H.specs[c]; H.poses = H.posesBy[c]; H.skin = null; $("calib").value = c; $("ctrlv").value = H.ctrlv; applySuites(); document.title = `Physical character — ${c}${isC2() && H.ctrlv ? " + " + H.ctrlv : ""}`; }
const hz = () => TIMESTEP_CONFIGS[isBal() ? GATE_C1_TSC : isB() ? GATE_B_TSC : GATE_A_TSC].hz;
// ── camera ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const PRESETS = { plan: [0, 89, 1.9], three: [35, 18, 3.4], front: [0, 8, 3.6], side: [90, 8, 3.6], back: [180, 12, 3.6], top: [0, 85, 4.2], left: [-90, 8, 3.6], low: [60, 4, 2.6] };
function camera(rec) {
  if (H.follow && rec) { const c = totalCom(rec); H.cam.target = [c[0], H.cam.el > 80 ? 0 : Math.max(0.25, c[1]), c[2]]; }   // plan view: look at the ground under the COM
  const { az, el, dist, target } = H.cam, a = az * Math.PI / 180, e = el * Math.PI / 180;
  const eye = [target[0] + dist * Math.cos(e) * Math.sin(a), target[1] + dist * Math.sin(e), target[2] + dist * Math.cos(e) * Math.cos(a)];
  return { view: lookAt(eye, target), proj: persp(40, canvas.width / canvas.height, 0.05, 200), eye };
}
const totalCom = (rec) => { let m = 0, c = [0, 0, 0]; rec.states.forEach((s, i) => { const b = H.spec.bodies[i]; c = V.add(c, V.sc(s.com, b.mass)); m += b.mass; }); return V.sc(c, 1 / m); };
function project(cam, p) { const vp = mul4(cam.proj, cam.view), x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0.01) return null; return [(x / w * 0.5 + 0.5) * canvas.width, (1 - (y / w * 0.5 + 0.5)) * canvas.height]; }
// ── draw ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const COLS = ["#e6c229", "#f17105", "#d11149", "#6610f2", "#1a8fe3", "#3bb273", "#1a8fe3", "#3bb273", "#e07bd0", "#43c6db", "#ffb86b", "#e07bd0", "#43c6db", "#ffb86b"].map(h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 0.95]);
const heat = (f) => f >= 0.98 ? [1, 0.15, 0.15, 1] : f > 0.5 ? [1, 0.75 - 0.5 * (f - 0.5), 0.2, 1] : [0.35 + f, 1, 0.35, 1];
// skeleton polyline of a body set: each joint anchor → child origin chain, plus a stub toward the distal end of end bodies
function skeleton(S, col) { const spec = H.spec;
  spec.joints.forEach((j) => { const P = S[j.parentIndex], pb = spec.bodies[j.parentIndex]; L(V.add(P.pos, Q.rot(P.rot, V.sub(j.at, pb.origin))), S[j.childIndex].pos, col);
    L(P.pos, V.add(P.pos, Q.rot(P.rot, V.sub(j.at, pb.origin))), col); });
  for (const n of ["head", "foreArm_L", "foreArm_R", "foot_L", "foot_R"]) { const i = spec.bodies.findIndex(b => b.name === n), s = S[i], sh = spec.bodies[i].shapes[spec.bodies[i].shapes.length - 1];
    L(s.pos, V.add(s.pos, Q.rot(s.rot, V.add(sh.pos, n.startsWith("foot") ? [0, -0.02, 0.17] : [0, 0, 0]))), col); } }
function draw() {
  const W = canvas.clientWidth, Hh = canvas.clientHeight; if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; $("ov").width = W; $("ov").height = Hh; }
  const rec = H.run ? H.run.recs[H.i] : null, cam = camera(rec), ov = $("ov").getContext("2d"); ov.clearRect(0, 0, W, Hh);
  gl.viewport(0, 0, W, Hh); gl.clearColor(0.55, 0.72, 0.9, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
  gl.useProgram(GP); gl.uniformMatrix4fv(gl.getUniformLocation(GP, "uV"), false, cam.view); gl.uniformMatrix4fv(gl.getUniformLocation(GP, "uP"), false, cam.proj);
  gl.disable(gl.CULL_FACE); gl.bindVertexArray(groundVao); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.bindVertexArray(null);
  if (!rec) return;
  const S = rec.states, spec = H.spec;
  if (H.mesh) { H.skin = skinMatrices(H.entry.rig, spec, S, H.map, H.skin); gl.enable(gl.CULL_FACE); ofCharDraw(R, H.entry, H.skin, cam.view, cam.proj); gl.disable(gl.CULL_FACE); }
  const labels = [], O = H.ov;
  if (H.phys) {
    S.forEach((s, i) => { const b = spec.bodies[i], asleep = !isB() && O.sleep && !s.awake, col = asleep ? [0.6, 0.6, 0.6, 0.9] : (H.mesh ? [0.1, 1, 0.9, 0.9] : COLS[i]);
      if (O.colliders) for (const sh of b.shapes) wireShape(s, sh, col);
      if (O.bodies) { const ax = (v, c) => L(s.pos, V.add(s.pos, Q.rot(s.rot, v)), c); ax([0.07, 0, 0], [1, 0.2, 0.2, 1]); ax([0, 0.07, 0], [0.2, 1, 0.2, 1]); ax([0, 0, 0.07], [0.3, 0.5, 1, 1]); }
      if (O.coms) cross3(s.com, 0.02, [1, 1, 0.2, 1]);
      if (O.vel) L(s.com, V.add(s.com, V.sc(s.v, 0.1)), [1, 0.55, 0.1, 1]);
      if (O.angvel) L(s.com, V.add(s.com, V.sc(s.w, 0.05)), [0.8, 0.3, 1, 1]); });
    if (O.tcom) { const c = totalCom(rec); cross3(c, 0.06, [1, 0.1, 0.8, 1]); L(c, [c[0], 0, c[2]], [1, 0.1, 0.8, 0.7]); }
    spec.joints.forEach((j, k) => { const P = S[j.parentIndex], C = S[j.childIndex], pb = spec.bodies[j.parentIndex], a1 = V.add(P.pos, Q.rot(P.rot, V.sub(j.at, pb.origin))), a2 = C.pos;
      const js = rec.jstates ? rec.jstates[k] : jointState(j, S), err = V.dist(a1, a2), bad = js.viol > 1e-3;
      if (O.anchors) { cross3(a1, 0.012, [1, 1, 1, 1]); }
      if (O.jerr && err > 0.0005) { L(a1, V.add(a1, V.sc(V.sub(a2, a1), 20)), [1, 0.25, 0.25, 1]); if (err > 0.002) labels.push([a1, `${j.name} ${(err * 1000).toFixed(1)} mm`, "#ff8080"]); }
      if (O.axes) { const fr = j.type === "hinge" ? [j.axis, j.normal, V.cross(j.axis, j.normal)] : [j.X, j.Y, j.Z]; [[1, 0.2, 0.2, 1], [0.2, 1, 0.2, 1], [0.3, 0.5, 1, 1]].forEach((c, n) => L(a1, V.add(a1, V.sc(Q.rot(P.rot, fr[n]), 0.09)), c)); }
      if (O.limits) { const col = bad ? [1, 0.2, 0.2, 1] : [1, 0.85, 0.3, 0.8];
        if (j.type === "hinge") { let prev = null; for (let n = 0; n <= 16; n++) { const th = j.lo + (j.hi - j.lo) * n / 16, d = Q.rot(P.rot, Q.rot(Q.axis(j.axis, th), j.normal)), p = V.add(a1, V.sc(d, 0.13)); if (prev) L(prev, p, col); prev = p; }
          L(a1, V.add(a1, V.sc(Q.rot(C.rot, j.normal), 0.16)), [1, 1, 1, 1]); }
        else { const Cq = Q.fromAxes(j.X, j.Y, j.Z), dirAt = (y, z) => Q.rot(P.rot, Q.rot(Cq, Q.rot(Q.norm([0, Math.tan(y / 2), Math.tan(z / 2), 1]), [1, 0, 0]))), Lm = j.limits;
          const edge = []; for (let n = 0; n <= 8; n++) edge.push([Lm.swingY[0] + (Lm.swingY[1] - Lm.swingY[0]) * n / 8, Lm.swingZ[0]]); for (let n = 0; n <= 8; n++) edge.push([Lm.swingY[1], Lm.swingZ[0] + (Lm.swingZ[1] - Lm.swingZ[0]) * n / 8]);
          for (let n = 0; n <= 8; n++) edge.push([Lm.swingY[1] - (Lm.swingY[1] - Lm.swingY[0]) * n / 8, Lm.swingZ[1]]); for (let n = 0; n <= 8; n++) edge.push([Lm.swingY[0], Lm.swingZ[1] - (Lm.swingZ[1] - Lm.swingZ[0]) * n / 8]);
          let prev = null; for (const [y, z] of edge) { const p = V.add(a1, V.sc(dirAt(y, z), 0.12)); if (prev) L(prev, p, col); prev = p; }
          for (const [y, z] of [[Lm.swingY[0], Lm.swingZ[0]], [Lm.swingY[1], Lm.swingZ[0]], [Lm.swingY[1], Lm.swingZ[1]], [Lm.swingY[0], Lm.swingZ[1]]]) L(a1, V.add(a1, V.sc(dirAt(y, z), 0.12)), [col[0], col[1], col[2], 0.35]);
          L(a1, V.add(a1, V.sc(Q.rot(C.rot, j.X), 0.16)), [1, 1, 1, 1]); }
        if (bad) labels.push([a1, `${j.name} +${deg(js.viol).toFixed(1)}°`, "#ff6060"]); }
      // GATE B: motor effort (world torque vector at the joint, 1.5 mm per N·m, heat = |τ| / limit) + target error label
      if ((isB() || isBal()) && rec.J) { const m = rec.J[k], pr = isB() ? H.run.profile[k] : null;
        if (O.torque && m.lam != null) { let tw;
          if (j.type === "hinge") tw = V.sc(Q.rot(C.rot, j.axis), m.lam * hz());
          else { const Cq = Q.fromAxes(j.X, j.Y, j.Z); tw = Q.rot(C.rot, Q.rot(Cq, V.sc(m.lam, hz()))); }
          const f = isB() ? m.tauAx / pr.tau : m.eff; if (V.len(tw) > 0.5) L(a1, V.add(a1, V.sc(tw, 0.0015)), heat(f)); }
        if (O.satur && m.sat) { cross3(a1, 0.035, [1, 0.1, 0.1, 1]); labels.push([V.add(a1, [0, 0.03, 0]), `${j.name} SAT ${(isB() ? m.tauAx : m.tq).toFixed(0)} N·m`, "#ff4040"]); }
        if (isB() && O.errlab && m.err > 0.07) labels.push([a1, `${j.name} Δ${deg(m.err).toFixed(0)}°`, m.err > 0.35 ? "#ff9040" : "#ffd070"]); } });
    if (rec.cts) for (const c of rec.cts) { const kind = c.a === -1 || c.b === -1 ? "turf" : (c.a <= -2 || c.b <= -2) ? "obstacle" : "self";
      const show = (kind === "turf" && O.ground) || (kind !== "turf" && (O.normals || (kind === "obstacle" && O.obstacle)));
      if (show) for (const p of c.pts) { cross3(p, 0.01 + Math.min(0.03, Math.max(0, c.depth) * 2), kind === "turf" ? [1, 0.95, 0.2, 1] : kind === "obstacle" ? [1, 0.3, 0.3, 1] : [1, 0.4, 1, 1]);
        if (O.normals) L(p, V.add(p, V.sc(c.normal, -0.06)), [0.2, 1, 1, 1]); }
      if (O.pen && c.depth > 0.004) labels.push([c.pts[0] || [0, 0, 0], `${kind} ${(c.depth * 1000).toFixed(1)} mm`, kind === "turf" ? "#ffe066" : "#ff80ff"]); }
    if (isB()) drawGateB(rec, S, labels);
    if (isBal()) drawC1(rec, S, labels);
    if (isC2()) drawC2(rec, S, labels);
    if (isC3()) drawC3(rec, S, labels);
    drawAnat(rec, S, labels);
    flushLines(cam.view, cam.proj, false);
  }
  ov.font = "11px ui-monospace, Menlo, monospace"; for (const [p, t, c] of labels) { const q = project(cam, p); if (!q) continue; ov.fillStyle = "#000a"; ov.fillRect(q[0] + 6, q[1] - 11, ov.measureText(t).width + 6, 14); ov.fillStyle = c; ov.fillText(t, q[0] + 9, q[1]); }
  // live readout
  const meshPen = H.ov.pen && H.mesh ? Math.max(0, -meshLowestY(H.entry.mesh, H.skin || skinMatrices(H.entry.rig, spec, S, H.map), H.ref).minY) : null;
  const head = `${title()}   step ${rec.n}/${H.run.recs.length - 1}   t ${rec.t.toFixed(3)} s   ${hz()} Hz   ${H.playing ? "▶ " + H.speed + "×" : "❚❚"}\n`;
  if (isC3()) $("status").textContent = head + statusC3(rec, meshPen);
  else if (isC2()) $("status").textContent = head + statusC2(rec, meshPen);
  else if (isC()) $("status").textContent = head + statusC1(rec, meshPen);
  else if (isB()) { const worst = rec.J.reduce((a, m, k) => m.err > a.e ? { e: m.err, k } : a, { e: -1, k: 0 }), nsat = rec.J.filter(m => m.sat).length, mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    $("status").textContent = head + `target error RMS ${deg(rec.errRms).toFixed(2)}°   worst ${spec.joints[worst.k].name} ${deg(worst.e).toFixed(1)}°   motors saturated ${nsat}/13   KE ${rec.ke.toFixed(2)} J\n` +
      `pelvis vs requested root ${(rec.pelvisErr.pos * 1000).toFixed(0)} mm / ${deg(rec.pelvisErr.ang).toFixed(1)}°   ${rec.sup ? `SUPPORT (temporary) ${mag(rec.sup.F).toFixed(0)} N ${mag(rec.sup.T).toFixed(0)} N·m${rec.sup.sat ? " SAT" : ""}` : "no pelvis support"}\n` +
      (rec.ob ? (rec.ob.removed ? "obstacle REMOVED\n" : `obstacle gap ${(rec.ob.gap * 1000).toFixed(2)} mm   contact force ${mag(rec.ob.F).toFixed(0)} N   post moved ${(V.dist(rec.ob.pos, H.run.block.obstacle.pos) * 1000).toFixed(0)} mm\n`) : "") +
      `turf pen (colliders) ${(rec.groundPen * 1000).toFixed(1)} mm   ${meshPen != null ? "rendered mesh below turf " + (meshPen * 1000).toFixed(1) + " mm   " : ""}self ${(rec.selfPen * 1000).toFixed(1)} mm   joint sep ${(rec.anchorErr * 1000).toFixed(2)} mm   limit ${deg(rec.hardViol).toFixed(1)}°`; }
  else $("status").textContent = head +
    `KE ${rec.ke.toFixed(1)} J  PE ${rec.pe.toFixed(1)} J  E ${rec.E.toFixed(1)} J   awake ${rec.awake}/14   contacts ${rec.contacts}\n` +
    `turf pen (colliders) ${(rec.groundPen * 1000).toFixed(1)} mm   ${meshPen != null ? "rendered mesh below turf " + (meshPen * 1000).toFixed(1) + " mm   " : ""}self ${(rec.selfPen * 1000).toFixed(1)} mm\n` +
    `worst joint separation ${(rec.anchorErr * 1000).toFixed(2)} mm (${rec.anchorJoint >= 0 ? spec.joints[rec.anchorJoint].name : "-"})   limit ${deg(rec.limitViol).toFixed(1)}° (${rec.limitJoint >= 0 ? spec.joints[rec.limitJoint].name : "-"})   pop ${(rec.pop * 1000).toFixed(2)} mm`;
  if (H.ov.a_live) $("status").textContent += "\n" + anatLive(S);
  $("scrub").value = H.i; drawChart(true); if (isB() || isBal()) drawChart2(true);
  if ((isC() || isC3()) && H.ov.c_banner) bannerC1(ov, rec, W);
  if (isC3() && H.ov.c_banner) bannerC3(ov, rec, W);
  if (isC2() && H.ov.c_banner) bannerC2(ov, rec, W);
}
// Gate B scene overlays: the target ghost, the actual skeleton, the temporary support, the obstacle + contact force, the disturbance
function drawGateB(rec, S, labels) {
  const O = H.ov, spec = H.spec, mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (O.ghost && rec.tgt) { const G = H.ghostRoot === "target" ? fk(spec, rec.tgt.rootPos, rec.tgt.rootRot, rec.tgt.T) : fk(spec, S[0].pos, S[0].rot, rec.tgt.T);
    skeleton(G, [1, 0.55, 0.05, 1]); G.forEach((g, i) => { for (const sh of spec.bodies[i].shapes) wireShape(g, sh, [1, 0.6, 0.1, 0.28]); }); }
  if (O.skel) skeleton(S, [1, 1, 1, 1]);
  if (O.support && rec.sup && rec.tgt) { const p = S[0].pos, tp = rec.tgt.rootPos, col = rec.sup.sat ? [1, 0.2, 0.9, 1] : [0.75, 0.35, 1, 1];
    cross3(tp, 0.04, [0.75, 0.35, 1, 1]); L(tp, p, [0.75, 0.35, 1, 0.6]); L(p, V.add(p, V.sc(rec.sup.F, 0.0012)), col);
    const f = mag(rec.sup.F), t = mag(rec.sup.T); if (f > 15 || t > 10) labels.push([V.add(p, [0, -0.08, 0]), `SUPPORT ${f.toFixed(0)} N · ${t.toFixed(0)} N·m${rec.sup.sat ? " SAT" : ""}`, "#d08cff"]); }
  if (O.obstacle && rec.ob && !rec.ob.removed) { const ob = H.run.block.obstacle, s = { pos: rec.ob.pos, rot: [0, 0, 0, 1] };
    wireShape(s, { type: "capsule", half: 0.22, r: ob.r, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, [1, 0.25, 0.25, 1]);
    const c = rec.cts && rec.cts.find(c => c.a <= -2 || c.b <= -2), F = mag(rec.ob.F);
    if (c && F > 1) { const p = c.pts[0]; L(p, V.add(p, V.sc(rec.ob.F, -0.0012)), [1, 0.2, 1, 1]); labels.push([V.add(p, [0, 0.05, 0]), `contact ${F.toFixed(0)} N · gap ${(rec.ob.gap * 1000).toFixed(1)} mm`, "#ff70ff"]); } }
  if (O.impulse) { const R_ = H.run.recs; for (let q = H.i; q >= Math.max(0, H.i - 72); q--) if (R_[q].imp) { const im = R_[q].imp, a = q === H.i ? 1 : 0.35;
    L(V.sub(im.pt, V.sc(V.norm(im.J), 0.35)), im.pt, [1, 1, 0.1, a]); cross3(im.pt, 0.03, [1, 1, 0.1, a]); if (q === H.i) labels.push([im.pt, `impulse ${V.len(im.J).toFixed(2)} N·s this step`, "#ffff40"]); break; } }
}
// ── charts: KE (+ target-error RMS in Gate B) with the cursor; Gate B joint panel ────────────────────────────────────────────────────
function drawChart(cursorOnly) { if (isC2()) return drawChartC2(); if (isC() || isC3()) return drawChartC1();
  const c = $("chart"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (c.width !== w) { c.width = w; c.height = h; }
  if (!H.run) return; const R_ = H.run.recs, maxKE = Math.max(1, ...R_.map(r => r.ke)); g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  const X = (i) => i / (R_.length - 1) * w;
  g.strokeStyle = "#f0c060"; g.beginPath(); R_.forEach((r, i) => { const y = h - 2 - r.ke / maxKE * (h - 4); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke();
  if (isB()) { const maxE = Math.max(0.02, ...R_.map(r => r.errRms)); g.strokeStyle = "#5ad0ff"; g.beginPath(); R_.forEach((r, i) => { const y = h - 2 - r.errRms / maxE * (h - 4); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke();
    R_.forEach((r, i) => { if (r.imp) { g.fillStyle = "#ffff40"; g.fillRect(X(i) - 1, 0, 2, h); } });
    const b = H.run.block; if (b && b.firstContactT != null) { g.fillStyle = "#ff70ff"; g.fillRect(X(Math.round(b.firstContactT * hz())) - 1, 0, 2, h); } if (b && b.removedT != null) { g.fillStyle = "#70ff90"; g.fillRect(X(Math.round(b.removedT * hz())) - 1, 0, 2, h); }
    for (const k of Object.keys(H.run.worst)) { const n = H.run.worst[k]; if (n) { g.fillStyle = "#ff5a5a"; g.fillRect(X(n) - 1, 0, 2, 6); } }
    g.fillStyle = "#9aa0a6"; g.font = "10px ui-monospace, Menlo"; g.fillText(`KE (yellow, max ${maxKE.toFixed(0)} J)   target error RMS over 13 joints (cyan, max ${deg(maxE).toFixed(1)}°)   contact (magenta) · obstacle removed (green) · impulse (yellow)`, 6, 10); }
  else { g.strokeStyle = "#5ad08a"; g.beginPath(); R_.forEach((r, i) => { const y = h - 2 - (r.awake / 14) * (h - 4) * 0.35; i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke();
    for (const k of ["groundPen", "anchor", "limit", "pop", "self", "energy"]) { const n = H.run.worst[k]; g.fillStyle = "#ff5a5a"; g.fillRect(X(n) - 1, 0, 2, 6); }
    g.fillStyle = "#9aa0a6"; g.font = "10px ui-monospace, Menlo"; g.fillText(`KE (yellow, max ${maxKE.toFixed(0)} J)   awake bodies (green)   worst frames (red ticks)`, 6, 10); }
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h);
}
// the selected joint: requested vs solved angle (hinge: the angle; SixDOF: the chosen swing-twist component), |error|, motor effort / limit
function drawChart2() { if (isBal()) return drawChart2C1();
  const c = $("chart2"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (!w) return; if (c.width !== w) { c.width = w; c.height = h; }
  if (!H.run || !isB()) return; const R_ = H.run.recs, k = H.spec.joints.findIndex(j => j.name === H.jsel), j = H.spec.joints[k], pr = H.run.profile[k];
  const comp = (q) => { if (j.type === "hinge") return q; const s = Q.swingTwist(q); return H.comp === "z" ? s.swingZ : H.comp === "t" ? s.twist : s.swingY; };
  const tg = R_.map(r => deg(comp(r.tgt.T[k]))), ac = R_.map(r => deg(comp(r.J[k].act))), er = R_.map(r => deg(r.J[k].err)), ef = R_.map(r => r.J[k].tauAx / pr.tau);
  const lo = Math.min(...tg, ...ac, 0) - 5, hi = Math.max(...tg, ...ac, 5) + 5, X = (i) => i / (R_.length - 1) * w, Y = (v) => h - 3 - (v - lo) / (hi - lo) * (h - 16);
  g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ff303040"; R_.forEach((r, i) => { if (r.J[k].sat) g.fillRect(X(i), 12, Math.max(1, w / R_.length), h - 12); });
  const line = (arr, col, dash, Yf) => { g.strokeStyle = col; g.setLineDash(dash || []); g.beginPath(); arr.forEach((v, i) => { const y = (Yf || Y)(v); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); g.setLineDash([]); };
  const Yf = (f) => h - 3 - f * (h - 16);
  line(ef, "#ff9a30", null, Yf);
  if (H.run.block) { const F = R_.map(r => r.ob ? Math.hypot(...r.ob.F) : 0), mF = Math.max(1, ...F); line(F.map(v => v / mF), "#ff60ff", null, Yf); }
  if (R_[0].sup) { const F = R_.map(r => Math.hypot(...r.sup.F)), mF = Math.max(1, ...F); line(F.map(v => v / mF * 0.6), "#a070ff80", null, Yf); }
  line(er, "#ff4545"); line(tg, "#e8e8e8", [5, 4]); line(ac, "#5ad0ff");
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h);
  const r = R_[H.i]; g.fillStyle = "#cfd3d8"; g.font = "10px ui-monospace, Menlo";
  g.fillText(`${j.name} (${pr.region}, τmax ${pr.tau} N·m, kp ${pr.kp} N·m/rad, kd ${pr.kd})  ${j.type === "hinge" ? "angle" : "swing/twist " + H.comp}: target ${tg[H.i].toFixed(1)}°  actual ${ac[H.i].toFixed(1)}°  |error| ${er[H.i].toFixed(1)}°  effort ${(ef[H.i] * 100).toFixed(0)}%${r.J[k].sat ? " SATURATED" : ""}   [angle axis ${lo.toFixed(0)}…${hi.toFixed(0)}°]`, 6, 10);
}
// ── side panel ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function renderSide() { renderSideInner(); $("side").insertAdjacentHTML("afterbegin", anatSide()); }
function renderSideInner() { if (isC3()) return renderSideC3(); if (isC2()) return renderSideC2(); if (isC()) return renderSideC1(); if (isB()) return renderSideB();
  const s = H.run, spec = H.spec, T = TIMESTEP_CONFIGS[GATE_A_TSC], f = (x, d = 1) => (x == null ? "-" : (+x).toFixed(d));
  const row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`;
  let h = `<h3>${DROPS[H.drop].title}</h3><div class="small">${DROPS[H.drop].note}</div><table>`;
  h += row("solver", `Jolt 5.6.0 (JoltPhysics.js 1.1.0) · ${T.label} · ${GATE_A_WORLD.velSteps || 10} vel / ${GATE_A_WORLD.posSteps || 2} pos iterations · slop 5 mm · soft knee/elbow stops ${GATE_A_WORLD.hingeSoftHz} Hz`);
  h += row("start: lowest body", s.initialLowestBody) + row("initial KE / PE", `${s.E0.ke} J / ${s.E0.pe} J`);
  h += row("max turf penetration (colliders)", `${s.maxGroundPenMm} mm @ ${s.maxGroundPenAt.t}s ${s.maxGroundPenAt.body} · rest ${s.restGroundPenMm} mm`, s.maxGroundPenMm > 20);
  h += row("max joint separation", `${s.maxAnchorErrMm} mm @ ${s.maxAnchorAt.t}s ${s.maxAnchorAt.joint}`, s.maxAnchorErrMm > 10);
  h += row("max limit violation", `${s.maxLimitViolDeg}° @ ${s.maxLimitAt.t}s ${s.maxLimitAt.joint}`, s.maxLimitViolDeg > 10);
  h += row("max self penetration", `${s.maxSelfPenMm} mm @ ${s.maxSelfPenAt.t}s ${s.maxSelfPenAt.pair || ""}`, s.maxSelfPenMm > 10);
  h += row("max correction pop", `${s.maxPopMm} mm @ ${s.maxPopAt.t}s ${s.maxPopAt.body}`, s.maxPopMm > 5);
  h += row("energy gain events", `${s.energyGain.stepsOver50mJ} steps > 50 mJ · max ${s.energyGain.maxJ} J @ ${s.energyGain.at}s (${s.energyGain.body})`, s.energyGain.maxJ > 5);
  h += row("settled (KE < 0.2 J) / asleep", `${f(s.settleT, 2)} s / ${f(s.sleepT, 2)} s`) + row("residual speed (last 0.5 s)", `${s.residualMaxSpeedMmS} mm/s`);
  h += row("first turf contacts", s.firstGroundContactOrder.slice(0, 6).join("<br>"));
  h += row("CPU (this browser)", `${f(s.cpuMsPerStep, 4)} ms/step · ${f(s.cpuMsPerFrame, 3)} ms per 60 Hz frame · whole 6 s run ${f(H.simMs, 0)} ms`);
  h += row("state hash (this run)", s.hash) + `</table>`;
  if (H.suite) { h += `<h3>Suite (Node, 3 runs each, same WASM)</h3><table><tr><th>drop</th><th>turf</th><th>mesh</th><th>joint</th><th>limit</th><th>self</th><th>E+ max</th><th>sleep</th><th>det</th></tr>`;
    for (const r of H.suite.results) h += `<tr><td>${r.drop}</td><td>${r.maxGroundPenMm}</td><td>${r.maxMeshPenMm}</td><td>${r.maxAnchorErrMm}</td><td>${r.maxLimitViolDeg}°</td><td>${r.maxSelfPenMm}</td><td>${r.energyGain.maxJ}</td><td>${r.sleepT}</td><td class="${r.deterministic ? "ok" : "bad"}">${r.deterministic ? "✓" : "✗"}</td></tr>`;
    h += `</table><div class="small">mm unless noted · browser hash for this drop ${s.hash === (H.suite.results.find(r => r.drop === H.drop) || {}).hash ? "<span class=ok>matches</span>" : "<span class=bad>differs from</span>"} the Node run</div>`; }
  h += `<h3>Bodies (${spec.bodies.length}) · ${spec.totalMass.toFixed(2)} kg</h3><table><tr><th>body</th><th>kg</th><th>fit in%</th></tr>` + spec.bodies.map(b => `<tr><td>${b.name}</td><td>${b.mass.toFixed(2)}</td><td>${b.fit.insidePct}</td></tr>`).join("") + `</table>`;
  $("side").innerHTML = h;
}
function renderSideB() {
  const s = H.run, T = TIMESTEP_CONFIGS[GATE_B_TSC], f = (x, d = 1) => (x == null ? "-" : (+x).toFixed(d)), row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`;
  let h = `<h3>${s.title}</h3><div class="small">${s.note}</div><table>`;
  h += row("solver", `Jolt 5.6.0 · ${T.label} · 30 vel / 4 pos iterations · Gate A body + joints unchanged · sleeping off`);
  h += row("motors", `Jolt constraint motors, PositionAndVelocity, implicit spring (kp, kd), torque-limited per axis · strength <b>${s.strength}</b>`);
  h += row("pelvis support — HISTORICAL GATE B FIXTURE", s.supportSettings ? `<b>${s.supportSettings.level}</b>: ${s.supportSettings.fMax} N / ${s.supportSettings.tMax} N·m per axis — whole-body results of this run are <b class=bad>SUPPORT-ASSISTED</b> (retired from all new tests)` : "<b>OFF</b> — none", !!s.supportSettings);
  h += row("target error RMS (all joints, whole run)", `${s.errRmsDeg}° · worst RMS instant ${s.errPeakRmsDeg}° @ ${s.errPeakRmsAt}s`);
  h += row("peak joint error", `${s.errPeakJointDeg}° ${s.errPeakJoint}`) + row("motor saturation (sum over joints)", `${s.satMsTotal} ms`);
  h += row("hold windows (last 0.5 s)", s.holds.map(x => `[${x.t0}–${x.t1}] ${x.errRmsDeg}° · ω ${x.bodyAngVelRmsDegS}°/s · KE ${x.keMaxJ} J`).join("<br>"));
  h += row("pelvis vs requested root (end)", `${s.pelvisEnd.posMm} mm · ${s.pelvisEnd.angDeg}°${s.fell ? " — <b class=bad>FELL</b>" : ""}`, s.fell);
  if (s.supportUse) h += row("support effort", `mean ${s.supportUse.meanForceN} N (lift ${s.supportUse.meanLiftPctBW}% BW) / ${s.supportUse.meanTorqueNm} N·m · peak ${s.supportUse.peakForceN} N / ${s.supportUse.peakTorqueNm} N·m · saturated ${s.supportUse.satMs} ms`, s.supportUse.satMs > 500);
  if (s.block) { const b = s.block; h += row("obstacle", `${typeof b.obstacle.hold === "string" ? "fixed post" : "movable post (spring, " + b.obstacle.hold.fMax + " N limit)"} · first contact ${f(b.firstContactT, 3)} s (${b.firstContactBody || "-"})`);
    h += row("max penetration into the post", `${b.maxPenetrationMm} mm (geometric, post-step) · listener ${b.maxListenerDepthMm} mm`, b.maxPenetrationMm > 5);
    h += row("contact force", `peak ${b.maxForceN} N${b.whileBlocked ? ` · while blocked ${b.whileBlocked.contactForceN} N` : ""} · post moved ${b.obstacleMaxDisplacementMm} mm`);
    if (b.whileBlocked) h += row("while blocked", `hip_R error ${b.whileBlocked.hipErrDeg}° · τ ${b.whileBlocked.hipTauNm} N·m · saturated ${b.whileBlocked.hipSatPct}% · support ${b.whileBlocked.supportForceN} N`);
    if (b.afterRemoval) h += row("after the post is removed", `hip_R ${b.afterRemoval.hipErrAtRemovalDeg}° → within 5° in ${b.afterRemoval.timeToWithin5degS} s`); }
  if (s.disturbance) { const d = s.disturbance; h += row("disturbance", `${d.impulseNs} N·s @ ${d.at}s · RMS ${d.baselineRmsDeg}° → peak ${d.peakRmsDeg}° (+${d.peakAt}s) · recovered in <b>${f(d.recoveryS, 3)} s</b> · pelvis ${d.pelvisMaxDisplacementMm} mm · support peak ${d.supportPeakN} N`); }
  h += row("stability", `joint sep ${s.maxAnchorErrMm} mm · limit ${s.maxHardLimitDeg}° · soft ${s.maxSoftOvershootDeg}° · turf ${s.maxGroundPenMm}/${s.restGroundPenMm} mm · self ${s.maxSelfPenMm} mm · pop ${s.maxPopMm} mm · NaN ${s.nan}`);
  h += row("state writes after t = 0", `${s.audit.teleports} teleports · ${s.audit.velocityWrites} velocity writes`, s.audit.teleports + s.audit.velocityWrites > 0);
  h += row("CPU (this browser)", `${f(s.cpuMsPerFrame, 3)} ms per 60 Hz frame (Jolt ${f(s.cpuJoltMsPerFrame, 3)} · controller ${f(s.cpuControllerMsPerFrame, 3)}) · whole run ${f(H.simMs, 0)} ms incl. recording`);
  const node = H.suiteB && H.suiteB.results.find(r => r.test === H.test);
  h += row("state hash (this run)", `${s.hash} ${node ? (node.hash === s.hash ? "<span class=ok>= Node</span>" : "<span class=bad>≠ Node " + node.hash + "</span>") : ""}`) + `</table>`;
  h += `<h3>Joints (this run)</h3><table><tr><th>joint</th><th>rms°</th><th>peak°</th><th>τ peak / max</th><th>sat ms</th></tr>` +
    s.joints.map(j => `<tr><td>${j.joint}</td><td>${j.rmsDeg}</td><td>${j.peakDeg}</td><td class="${j.peakTauPct >= 98 ? "bad" : ""}">${j.peakTauNm} / ${j.tauMax}</td><td>${j.satMs}</td></tr>`).join("") + `</table>`;
  h += `<h3>Motor profile (${s.strength})</h3><table><tr><th>joint</th><th>τmax N·m</th><th>kp</th><th>kd</th><th>I load</th></tr>` + s.profile.map(m => `<tr><td>${m.joint}</td><td>${m.tau}</td><td>${m.kp}</td><td>${m.kd}</td><td>${m.Iload}</td></tr>`).join("") + `</table>`;
  if (H.suiteB) { h += `<h3>Suite (Node, same WASM)</h3><table><tr><th>test</th><th>err rms°</th><th>sat ms</th><th>joint mm</th><th>det</th></tr>` +
    H.suiteB.results.map(r => `<tr><td>${r.test}</td><td>${r.errRmsDeg}</td><td>${r.satMsTotal}</td><td>${r.maxAnchorErrMm}</td><td class="${r.deterministic ? "ok" : "bad"}">${r.deterministic ? "✓" : "✗"}</td></tr>`).join("") + `</table>`; }
  $("side").innerHTML = h;
}
// ── GATE C1: balance overlays, status, banner, charts, side panel ─────────────────────────────────────────────────────────────────────
const CLS_COL = { INIT: "#9aa0a6", RECOVERABLE_IN_PLACE: "#5ad08a", RECOVERABLE_HIP: "#f0c060", STEP_NEEDED: "#ff9a30", UNRECOVERABLE: "#ff5a5a", FALLING: "#ff5a5a", GROUNDED: "#b0b0b0", HOLD: "#9aa0a6" };
const FOOT_COL = { FLAT: [0.35, 1, 0.45, 1], HEEL: [1, 0.85, 0.2, 1], TOE: [1, 0.85, 0.2, 1], EDGE: [1, 0.55, 0.15, 1], SLIPPING: [1, 0.15, 0.15, 1], LIFTOFF: [0.4, 0.7, 1, 1], TOUCHDOWN: [0.4, 0.7, 1, 1], AIR: [0.6, 0.6, 0.6, 0.6] };
const G2 = (p, y) => [p[0], y == null ? 0.004 : y, p[1]];
function ring(c, r, col, y) { let prev = null; for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2, p = [c[0] + Math.cos(a) * r, y ?? 0.004, c[2] + Math.sin(a) * r]; if (prev) L(prev, p, col); prev = p; } }
function polyLine(poly, col, y) { if (!poly || poly.length < 2) return; for (let i = 0; i < poly.length; i++) L(G2(poly[i], y), G2(poly[(i + 1) % poly.length], y), col); }
function drawC1(rec, S, labels) {
  const O = H.ov, spec = H.spec, mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (O.ghost && rec.tgt) { const G = fk(spec, S[0].pos, S[0].rot, rec.tgt.T); skeleton(G, [1, 0.55, 0.05, 1]); G.forEach((g, i) => { for (const sh of spec.bodies[i].shapes) wireShape(g, sh, [1, 0.6, 0.1, 0.22]); }); }
  if (O.skel) skeleton(S, [1, 1, 1, 1]);
  const c = rec.com, cg = [c[0], 0.004, c[2]];
  if (O.c_region) { polyLine(rec.region, [0.3, 1, 0.5, 1]); polyLine(rec.polyReliable, [1, 0.95, 0.3, 0.9], 0.006);
    labels.push([G2(rec.region && rec.region.length ? rec.region[0] : [c[0], c[2]], 0.01), `support region · ξ margin ${(rec.xiMargin * 100).toFixed(1)} cm · COM margin ${(rec.comMargin * 100).toFixed(1)} cm${rec.degraded ? " · DEGRADED (slip)" : ""}`, rec.xiMargin > 0.015 ? "#8cf0a0" : rec.xiMargin > -0.05 ? "#ffd070" : "#ff7070"]); }
  if (O.c_com) { cross3(c, 0.05, [1, 0.2, 0.9, 1]); L(c, cg, [1, 0.2, 0.9, 0.6]); cross3(cg, 0.03, [1, 0.2, 0.9, 1]); L(c, V.add(c, V.sc(rec.vcom, 0.5)), [1, 0.5, 1, 1]);
    if (V.len(rec.vcom) > 0.02) labels.push([V.add(c, V.sc(rec.vcom, 0.5)), `v ${V.len(rec.vcom).toFixed(2)} m/s`, "#ff90ff"]); }
  if (O.c_xi) { const x = [rec.xi[0], 0.006, rec.xi[1]]; ring(x, 0.035, [0.2, 1, 1, 1]); L(cg, x, [0.2, 1, 1, 0.8]); labels.push([x, "ξ", "#60ffff"]); }
  if (O.c_cop) { if (rec.copSmooth) { const p = [rec.copSmooth[0], 0.008, rec.copSmooth[1]]; cross3(p, 0.03, [1, 1, 1, 1]); labels.push([p, "CoP (measured)", "#ffffff"]); }
    if (rec.ctl) { const d = [rec.ctl.pStar[0], 0.01, rec.ctl.pStar[1]]; ring(d, 0.02, [0.3, 0.7, 1, 1]); if (Math.hypot(...rec.ctl.r) > 0.002) { const rw = [rec.ctl.pRaw[0], 0.01, rec.ctl.pRaw[1]]; L(d, rw, [0.3, 0.7, 1, 0.5]); ring(rw, 0.012, [0.3, 0.7, 1, 0.5]); }
      const xr = [rec.ctl.xiRef[0], 0.004, rec.ctl.xiRef[1]]; cross3(xr, 0.015, [0.6, 0.6, 0.6, 1]); } }
  if (O.c_feet) for (const s of ["L", "R"]) { const f = rec.feet[s], col = FOOT_COL[f.state] || [1, 1, 1, 1];
    for (const p of f.points) cross3(p, 0.012, col);
    if (f.sole) polyLine([0, 1, 3, 2].map(q => [f.sole[q][0], f.sole[q][2]]), [col[0], col[1], col[2], 0.45], 0.003);   // sole corners (−x−z, −x+z, +x+z, +x−z)
    const fi = spec.bodies.findIndex(b => b.name === "foot_" + s), base = V.add(S[fi].pos, [0, 0.12, 0]);
    L(base, V.add(base, [0, Math.max(0, f.load) / 800 * 0.4, 0]), col);
    labels.push([V.add(base, [0, Math.max(0, f.load) / 800 * 0.4 + 0.02, 0]), `${s} ${f.state} ${f.load.toFixed(0)} N${f.slipping ? ` SLIP ${(f.slipSpeed * 100).toFixed(1)} cm/s μ ${f.muUsed != null ? f.muUsed.toFixed(2) : "?"}` : ""}${f.slipDist > 0.005 ? ` slid ${(f.slipDist * 100).toFixed(1)} cm` : ""}`, f.slipping ? "#ff6060" : "#c8f0c8"]); }
  if (O.c_grf && rec.grf && rec.copSmooth) { const p = [rec.copSmooth[0], 0.01, rec.copSmooth[1]]; L(p, V.add(p, V.sc(rec.grf, 0.0006)), [0.9, 0.9, 0.3, 1]); labels.push([V.add(p, V.sc(rec.grf, 0.0006)), `GRF ${mag(rec.grf).toFixed(0)} N`, "#ffff80"]); }
  if (O.c_hip && rec.ctl && rec.ctl.tauTrunk && mag(rec.ctl.tauTrunk) > 5) { const p = S[0].pos; L(p, V.add(p, V.sc(rec.ctl.tauTrunk, 0.002)), [1, 0.6, 0.1, 1]); labels.push([V.add(p, V.sc(rec.ctl.tauTrunk, 0.002)), `hip strategy ${mag(rec.ctl.tauTrunk).toFixed(0)} N·m`, "#ffb060"]); }
  if (O.impulse) { const R_ = H.run.recs; for (let q = H.i; q >= Math.max(0, H.i - 72); q--) if (R_[q].push) { const im = R_[q].push, a = q === H.i ? 1 : 0.4;
    L(V.sub(im.at, V.sc(V.norm(im.J), 0.45)), im.at, [1, 1, 0.1, a]); cross3(im.at, 0.04, [1, 1, 0.1, a]); if (q === H.i) labels.push([im.at, `push ${(V.len(im.J) * 12).toFixed(0)} N·s over 50 ms`, "#ffff40"]); break; } }
}
function statusC1(rec, meshPen) {
  const nsat = rec.J.filter(m => m.sat).length, f = rec.feet;
  return `class ${rec.cls}   ξ margin ${(rec.xiMargin * 100).toFixed(1)} cm   COM margin ${(rec.comMargin * 100).toFixed(1)} cm   |v_COM| ${V.len(rec.vcom).toFixed(3)} m/s   trunk ${rec.trunk.toFixed(1)}°  spine ${rec.spine.toFixed(1)}°\n` +
    `feet  L ${f.L.state} ${f.L.load.toFixed(0)} N  R ${f.R.state} ${f.R.load.toFixed(0)} N   ΣGRF ${rec.grf ? rec.grf[1].toFixed(0) : "-"} N   motors saturated ${nsat}/13   KE ${rec.ke.toFixed(2)} J\n` +
    `pelvis external-force residual ${rec.rootRes ? V.len(rec.rootRes).toFixed(2) + " N" : "n/a (pelvis in contact)"}   ·   NO pelvis support in C1 (asserted)\n` +
    `turf pen ${(rec.groundPen * 1000).toFixed(1)} mm   ${meshPen != null ? "rendered mesh below turf " + (meshPen * 1000).toFixed(1) + " mm   " : ""}self ${(rec.selfPen * 1000).toFixed(1)} mm   joint sep ${(rec.anchorErr * 1000).toFixed(2)} mm   limit ${deg(rec.hardViol).toFixed(1)}°`;
}
function bannerC1(ov, rec, W) {
  const cls = rec.cls, col = CLS_COL[cls] || "#fff", txt = cls.replace(/_/g, " ") + (cls === "STEP_NEEDED" ? "  — a step would be required (C1: no stepping)" : cls === "FALLING" ? "  — balance released, falling physically" : "");
  const y0 = 96; ov.font = "bold 18px -apple-system, system-ui, sans-serif"; const w = ov.measureText(txt).width; ov.fillStyle = "#000b"; ov.fillRect(W / 2 - w / 2 - 12, y0, w + 24, 30); ov.fillStyle = col; ov.fillText(txt, W / 2 - w / 2, y0 + 22);
  const t = H.run.classTimes || {}, bits = Object.entries(t).map(([k, v]) => `${k.replace("RECOVERABLE_", "")} ${v}s`).join("  ·  ");
  if (bits) { ov.font = "11px ui-monospace, Menlo, monospace"; const w2 = ov.measureText(bits).width; ov.fillStyle = "#000a"; ov.fillRect(W / 2 - w2 / 2 - 8, y0 + 32, w2 + 16, 16); ov.fillStyle = "#ddd"; ov.fillText(bits, W / 2 - w2 / 2, y0 + 44); }
}
function drawChartC1() {
  const c = $("chart"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (c.width !== w) { c.width = w; c.height = h; } if (!H.run) return;
  const R_ = H.run.recs, X = (i) => i / (R_.length - 1) * w, M = H.spec.totalMass * 9.81; g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  R_.forEach((r, i) => { g.fillStyle = CLS_COL[r.cls] || "#666"; g.fillRect(X(i), h - 5, Math.max(1, w / R_.length) + 0.5, 5); });
  const Ym = (m) => { const v = Math.max(-0.2, Math.min(0.2, m)); return (h - 8) / 2 - v / 0.2 * ((h - 14) / 2) + 2; };
  g.strokeStyle = "#333"; g.beginPath(); g.moveTo(0, Ym(0)); g.lineTo(w, Ym(0)); g.stroke();
  const line = (f, col, Y) => { g.strokeStyle = col; g.beginPath(); R_.forEach((r, i) => { const y = Y(f(r)); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); };
  line(r => r.xiMargin, "#5ad0ff", Ym); line(r => r.comMargin, "#3a70ff", Ym);
  const Yl = (x) => h - 7 - Math.max(0, Math.min(1.5, x)) / 1.5 * (h - 14); line(r => r.feet.L.load / M, "#ff70ff80", Yl); line(r => r.feet.R.load / M, "#ff9a3080", Yl);
  R_.forEach((r, i) => { if (r.push) { g.fillStyle = "#ffff40"; g.fillRect(X(i) - 1, 0, 2, h - 6); } });
  for (const [k, col] of [["stepNeeded", "#ff9a30"], ["falling", "#ff5a5a"], ["grounded", "#b0b0b0"]]) { const n = H.run.worst[k]; if (n) { g.fillStyle = col; g.fillRect(X(n) - 1, 0, 2, h - 6); } }
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h);
  g.fillStyle = "#9aa0a6"; g.font = "10px ui-monospace, Menlo"; g.fillText("ξ margin (cyan) · COM margin (blue) [±20 cm] · foot load L (magenta) R (orange) / body weight · class strip · push (yellow) · step-needed (orange) · fall (red) · ground (grey)", 6, 10);
}
function drawChart2C1() {
  const c = $("chart2"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (!w) return; if (c.width !== w) { c.width = w; c.height = h; }
  if (!H.run || !H.run.recs[0].jt) return; const R_ = H.run.recs, k = H.spec.joints.findIndex(j => j.name === H.jsel), j = H.spec.joints[k], ci = H.comp === "t" ? 0 : H.comp === "z" ? 2 : 1;
  const comp = (q) => { if (j.type === "hinge") return q; const s = Q.swingTwist(q); return H.comp === "z" ? s.swingZ : H.comp === "t" ? s.twist : s.swingY; }, offC = (d) => j.type === "hinge" ? d : d[ci];
  const nom = R_.map(r => deg(comp(r.jt[k].nom))), fin = R_.map(r => deg(comp(r.jt[k].fin))), act = R_.map(r => deg(comp(r.jt[k].act))), go = R_.map(r => deg(offC(r.jt[k].g))), bo = R_.map(r => deg(offC(r.jt[k].b))), ef = R_.map(r => r.J[k].eff);
  const lo = Math.min(...nom, ...fin, ...act, ...go, ...bo) - 3, hi = Math.max(...nom, ...fin, ...act, ...go, ...bo) + 3, X = (i) => i / (R_.length - 1) * w, Y = (v) => h - 3 - (v - lo) / (hi - lo) * (h - 16), Yf = (f) => h - 3 - Math.min(1.2, f) / 1.2 * (h - 16);
  g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ff303040"; R_.forEach((r, i) => { if (r.J[k].sat) g.fillRect(X(i), 12, Math.max(1, w / R_.length), h - 12); });
  const line = (arr, col, dash, Yy) => { g.strokeStyle = col; g.setLineDash(dash || []); g.beginPath(); arr.forEach((v, i) => { const y = (Yy || Y)(v); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); g.setLineDash([]); };
  line(ef, "#ff5a5a90", null, Yf); line(go, "#5ad08a"); line(bo, "#ff9a30"); line(nom, "#8a8f96", [3, 3]); line(fin, "#e8e8e8", [6, 3]); line(act, "#5ad0ff");
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h);
  const r = R_[H.i], i = H.i; g.fillStyle = "#cfd3d8"; g.font = "10px ui-monospace, Menlo";
  g.fillText(`${j.name} ${j.type === "hinge" ? "angle" : "swing/twist " + H.comp}: nominal ${nom[i].toFixed(1)}° + gravity ${go[i].toFixed(1)}° + balance ${bo[i].toFixed(1)}° → target ${fin[i].toFixed(1)}° · actual ${act[i].toFixed(1)}° · effort ${(ef[i] * 100).toFixed(0)}% of its (budgeted) limit${r.J[k].sat ? " SATURATED" : ""} · ${r.J[k].tq.toFixed(0)} N·m   [axis ${lo.toFixed(0)}…${hi.toFixed(0)}°]`, 6, 10);
}
function renderSideC1() {
  const s = H.run, f = (x, d = 1) => (x == null ? "-" : (+x).toFixed(d)), row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`, w = s.whole, se = s.sensing, fr = s.friction;
  let h = `<h3>${s.test} — ${s.title}</h3><div class="small">Gate C1: no pelvis support, no root anchor, no state writes after t = 0. Strength <b>${s.strength}</b> · sensing delay <b>${s.delayMs} ms</b>${s.push ? ` · push ${s.push.Ns} N·s ${s.push.dir}` : ""}</div><table>`;
  h += row("outcome", `<b>${s.outcome}</b> · highest class ${s.maxClass}`, s.outcome === "FELL" && !(s.push && s.push.Ns >= 60) && s.test !== "G_fall");
  h += row("classification times (from push)", Object.entries(s.classTimes).map(([k, v]) => `${k} ${v}s`).join("<br>") || "-");
  if (s.fallReason) h += row("fall reason", s.fallReason);
  h += row("recovery / fall lead", `recovery ${f(s.recoveryS, 3)} s · grounded ${f(s.tGrounded, 3)} s · lead (flag → ground) ${f(s.fallLeadS, 3)} s · first foot roll ${f(s.tFootRoll, 3)} s`);
  h += row("whole body", `COM excursion ${w.comMaxExcursionCm} cm · peak |v| ${w.comPeakSpeed} m/s · ξ margin min ${w.xiMarginMinCm} cm · trunk ${w.trunkTiltMaxDeg}° · pelvis ${w.pelvisTiltMaxDeg}° · spine bend ${w.spineBendMaxDeg}° · L peak ${w.angMomPeak} · slid ${w.footSlipMaxCm} cm · load share L ${w.loadShareL ? w.loadShareL.join("–") : "-"}`);
  if (s.quiet) h += row("quiet stance", `drift ${s.quiet.comDriftCm} cm · sway RMS ${s.quiet.swayRmsMm} mm · CoP path ${s.quiet.copPathMm} mm · ankle effort ${s.quiet.ankleEffortPct}% · in-place throughout ${s.quiet.stayedInPlace}`);
  h += row("friction / slip", fr.firstSlipL != null || fr.firstSlipR != null ? `first SLIPPING L ${fr.firstSlipL} R ${fr.firstSlipR} s · degraded ${fr.degradedMs} ms · μ observed ${fr.muObserved} · friction CoP limit ${fr.frictionLimitCmMin} cm · slid L ${fr.slidCm.L} R ${fr.slidCm.R} cm` : "no slip detected");
  h += row("sensing checks", `ΣGRF_y vs Mg ${se.grfYErrN} N · L+R vs total ${se.footSumErrN} N (max ${se.footSumErrMaxN}) · lever-rule share err ${se.leverShareErr ? se.leverShareErr.mean + " (max " + se.leverShareErr.max + ")" : "-"} · airborne foot ${se.airborneFootResidualN ? se.airborneFootResidualN.mean + " N" : "-"} · CoP in polygon ${se.copInsidePct}%`);
  h += row("ROOT SUPPORT (must be 0)", `fixture present: <b>${s.supportFixture}</b> · constraints ${s.constraints} (13 joints) · pelvis external-force residual mean ${se.rootResidualN ? se.rootResidualN.mean : "-"} N (max ${se.rootResidualN ? se.rootResidualN.max : "-"}) · state writes ${s.audit.teleports}/${s.audit.velocityWrites}`, s.supportFixture || s.audit.teleports + s.audit.velocityWrites > 0);
  h += row("stability", `joint sep ${s.stability.maxJointSepMm} mm · hard limit ${s.stability.maxHardLimitDeg}° · soft ${s.stability.maxSoftOvershootDeg}° · turf ${s.stability.maxTurfPenMm} mm · self ${s.stability.maxSelfPenMm} mm · NaN ${s.nan}`);
  if (s.flags.length) h += row("flags", s.flags.join("<br>"), true);
  h += row("hip-strategy capacity", `fwd ${s.hipCapCm.fwd} · bwd ${s.hipCapCm.bwd} · lat ${s.hipCapCm.lat} cm`);
  h += row("CPU (this browser)", `${f(s.cpu.msPerFrame, 3)} ms / 60 Hz frame (Jolt ${f(s.cpu.jolt, 3)} · sensing ${f(s.cpu.sensing, 3)} · controller ${f(s.cpu.controller, 3)}) · run ${f(H.simMs, 0)} ms`);
  const node = H.suiteC && H.suiteC.results.find(r => r.test === s.test);
  h += row("state hash", `${s.hash} ${node ? (node.hash === s.hash ? "<span class=ok>= Node</span>" : "<span class=bad>≠ Node " + node.hash + "</span>") : ""}`) + `</table>`;
  h += `<h3>Motors (this run)</h3><table><tr><th>joint</th><th>peak N·m</th><th>effort</th><th>sat ms</th><th>|τ|/max</th></tr>` + s.joints.map(j => `<tr><td>${j.joint}</td><td>${j.peakNm}</td><td class="${j.peakEff >= 0.98 ? "bad" : ""}">${j.peakEff}</td><td>${j.satMs}</td><td>${j.budgetMax}</td></tr>`).join("") + `</table>`;
  if (H.suiteC) { h += `<h3>C1 suite (Node, same WASM)</h3><table><tr><th>test</th><th>outcome</th><th>max class</th><th>rec s</th><th>det</th></tr>` +
    H.suiteC.results.map(r => `<tr><td>${r.test}</td><td>${r.outcome}</td><td>${(r.maxClass || "").replace("RECOVERABLE_", "")}</td><td>${r.recoveryS ?? "-"}</td><td class="${r.deterministic ? "ok" : "bad"}">${r.deterministic ? "✓" : "✗"}</td></tr>`).join("") + `</table>`; }
  $("side").innerHTML = h;
}
// ── GATE C2: support transitions — footprints, reach, exclusion, swing path vs trace, clearance, phase banner, load-transfer chart ────
const PHASE_COL = (p) => !p ? "#9aa0a6" : /TRANSFER/.test(p) ? "#f0c060" : /LIFTOFF/.test(p) ? "#ffb060" : /ALIGN/.test(p) ? "#b890ff" : /SWING|HELD|LOWERING|SEEKING/.test(p) ? "#5ad0ff" : /BLOCKED/.test(p) ? "#ff5a5a" : /ACCEPT/.test(p) ? "#5ad08a" : /LOST/.test(p) ? "#ff5a5a" : "#8a8f96";
const yawOfQ = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
function fpLine(center, yaw, col, y, grow) { const b = H.run.box, bx = grow ? { he: [b.he[0] + grow, b.he[1], b.he[2] + grow], pos: b.pos } : b; polyLine(footprint(bx, center, yaw), col, y); }
function curReq(rec) { const R = H.run.reqRaw || []; if (rec.reqId != null) return R.find(r => r.id === rec.reqId) || null;
  let last = null; for (const r of R) if (r.type !== "shift" && H.run.recs.some(q => q.reqId === r.id && q.n <= rec.n)) last = r; return last; }
function drawC2(rec, S, labels) {
  const O = H.ov, env = H.run.env || {};
  if (O.d_env) { for (const b of env.terrain || []) { wireShape({ pos: b.pos, rot: [0, 0, 0, 1] }, { type: "box", he: b.he, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, [0.85, 0.75, 0.45, 1]); labels.push([V.add(b.pos, [0, b.he[1] + 0.02, 0]), `slab ${(b.he[1] * 200).toFixed(0)} cm`, "#e0d0a0"]); }
    if (env.obstacle) { const o = env.obstacle; wireShape({ pos: o.pos, rot: [0, 0, 0, 1] }, { type: "box", he: o.he, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, [1, 0.3, 0.3, 1]);
      labels.push([V.add(o.pos, [0, o.he[1] + 0.03, 0]), `obstacle${rec.obF > 1 ? ` · contact ${rec.obF.toFixed(0)} N` : ""}`, "#ff8080"]); } }
  const R = curReq(rec); if (!R || R.type === "shift") return;
  const sw = R.foot, win = H.run.recs.filter(q => q.reqId === R.id);
  if (R.proj && O.d_fp) { fpLine(R.proj.requested, R.proj.yaw, [1, 0.55, 0.1, 0.95], 0.012); labels.push([G2(R.proj.requested, 0.015), R.proj.rejected ? "requested — REJECTED" : "requested", "#ffb060"]);
    if (R.proj.target && !R.proj.rejected) { fpLine(R.proj.target, R.proj.yaw, [0.35, 1, 0.45, 1], 0.014); if (Math.hypot(R.proj.target[0] - R.proj.requested[0], R.proj.target[1] - R.proj.requested[1]) > 0.01) { L(G2(R.proj.requested, 0.014), G2(R.proj.target, 0.014), [1, 0.8, 0.3, 0.8]); labels.push([G2(R.proj.target, 0.02), "feasible (projected)", "#8cf0a0"]); } else labels.push([G2(R.proj.target, 0.02), "feasible = requested", "#8cf0a0"]); } }
  if (R.td && O.d_fp && rec.n >= Math.round(R.td.t * hz())) { fpLine(R.td.center, yawOfQ(R.td.rot), [0.2, 0.9, 1, 1], 0.016); labels.push([G2(R.td.center, 0.03), "actual touchdown", "#60e0ff"]); }
  if (R.accepted && O.d_fp && rec.n >= Math.round(R.accepted.t * hz())) { fpLine(R.accepted.center, yawOfQ(R.accepted.rot), [1, 1, 1, 1], 0.018); labels.push([G2(R.accepted.center, 0.045), "final loaded contact", "#ffffff"]); }
  if (O.d_reach && R.reach) polyLine(R.reach, [0.75, 0.45, 1, 0.9], 0.008);
  if (O.d_excl && R.excl) { polyLine(R.excl, [1, 0.25, 0.25, 0.9], 0.009); const st = sw === "L" ? "R" : "L", c = R.excl.reduce((a, p) => [a[0] + p[0] / R.excl.length, a[1] + p[1] / R.excl.length], [0, 0]);
    const s0 = win[0] && win[0].states[H.spec.bodies.findIndex(b => b.name === "foot_" + st)]; if (s0) fpLine(c, yawOfQ(s0.rot), [1, 0.25, 0.25, 0.45], 0.009, H.run.sup.footClear); }
  if (O.d_path) { let prev = null; for (const q of win) if (q.swingTgt) { const p = q.swingTgt.pos; if (prev) L(prev, p, [1, 0.9, 0.2, 0.9]); prev = p; } if (rec.swingTgt) cross3(rec.swingTgt.pos, 0.025, [1, 0.9, 0.2, 1]); }
  if (O.d_trace) { const fi = H.spec.bodies.findIndex(b => b.name === "foot_" + sw); let prev = null; for (const q of win) { if (q.n > rec.n) break; if (!q.swingTgt && !(R.td && q.t >= R.td.t && q.t <= R.td.t + 0.1)) { prev = null; continue; } const p = q.states[fi].pos; if (prev) L(prev, p, [0.2, 0.9, 1, 1]); prev = p; } }
  if (O.d_clear && rec.swingTgt) { const fi = H.spec.bodies.findIndex(b => b.name === "foot_" + sw); labels.push([V.add(S[fi].pos, [0, -0.06, 0]), `sole ${(rec.soleY[sw] * 100).toFixed(1)} cm above turf${rec.legClear != null ? ` · ${(rec.legClear * 100).toFixed(1)} cm from stance leg` : ""}`, "#ffe080"]); }
}
function statusC2(rec, meshPen) {
  const nsat = rec.J.filter(m => m.sat).length, f = rec.feet, rr = rec.rootRes ? V.len(rec.rootRes) : null;
  return `phase ${rec.phase}   roles L ${rec.roles.L} · R ${rec.roles.R}   class ${rec.cls}\n` +
    `feet  L ${f.L.state} ${f.L.load.toFixed(0)} N  R ${f.R.state} ${f.R.load.toFixed(0)} N   ξ margin ${(rec.xiMargin * 100).toFixed(1)} cm   |v_COM| ${V.len(rec.vcom).toFixed(3)} m/s   trunk ${rec.trunk.toFixed(1)}°   motors saturated ${nsat}/13\n` +
    `ROOT SUPPORT: none (asserted) · pelvis external-force residual ${rr != null ? rr.toFixed(2) + " N" : "n/a (pelvis in contact)"}   joint-limit margin ${deg(rec.limMargin).toFixed(1)}° (${rec.limJoint})\n` +
    `turf pen ${(rec.groundPen * 1000).toFixed(1)} mm   ${meshPen != null ? "rendered mesh below turf " + (meshPen * 1000).toFixed(1) + " mm   " : ""}self ${(rec.selfPen * 1000).toFixed(1)} mm   joint sep ${(rec.anchorErr * 1000).toFixed(2)} mm`;
}
function bannerC2(ov, rec, W) {
  const txt = rec.phase || "", col = PHASE_COL(txt), y0 = 96; ov.font = "bold 18px -apple-system, system-ui, sans-serif"; const w = ov.measureText(txt).width;
  ov.fillStyle = "#000b"; ov.fillRect(W / 2 - w / 2 - 12, y0, w + 24, 30); ov.fillStyle = col; ov.fillText(txt, W / 2 - w / 2, y0 + 22);
  const R = curReq(rec), live = rec.reqId === (R && R.id) ? (rec.reqStatus || rec.reqStage) : (R ? R.status : null);
  const sub = R ? `request #${R.id} ${R.type} ${R.foot || ""} ${R.label || ""} → ${live}${rec.reqStatus && R.why ? " — " + R.why : ""}` : "";
  if (sub) { ov.font = "11px ui-monospace, Menlo, monospace"; const w2 = Math.min(W - 20, ov.measureText(sub).width); ov.fillStyle = "#000a"; ov.fillRect(W / 2 - w2 / 2 - 8, y0 + 32, w2 + 16, 16); ov.fillStyle = "#ddd"; ov.fillText(sub, W / 2 - w2 / 2, y0 + 44, W - 24); }
}
function drawChartC2() {
  const c = $("chart"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (c.width !== w) { c.width = w; c.height = h; } if (!H.run) return;
  const R_ = H.run.recs, X = (i) => i / (R_.length - 1) * w, M = H.spec.totalMass * 9.81; g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  R_.forEach((r, i) => { g.fillStyle = PHASE_COL(r.phase); g.fillRect(X(i), h - 5, Math.max(1, w / R_.length) + 0.5, 5); });
  const line = (f, col, Y) => { g.strokeStyle = col; g.beginPath(); R_.forEach((r, i) => { const y = Y(f(r)); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); };
  const Yl = (x) => h - 7 - Math.max(0, Math.min(1.2, x)) / 1.2 * (h - 14); g.strokeStyle = "#333"; g.beginPath(); g.moveTo(0, Yl(1)); g.lineTo(w, Yl(1)); g.moveTo(0, Yl(0.05)); g.lineTo(w, Yl(0.05)); g.stroke();
  line(r => r.feet.L.load / M, "#ff70ff", Yl); line(r => r.feet.R.load / M, "#ff9a30", Yl);
  const Ym = (m) => h - 7 - (Math.max(-0.1, Math.min(0.2, m)) + 0.1) / 0.3 * (h - 14); line(r => r.xiMargin, "#5ad0ff80", Ym);
  for (const e of H.run.events || []) { if (e.t == null) continue; const i = Math.round(e.t * hz()), col = e.kind === "touchdown" ? "#60e0ff" : e.kind === "liftoff" ? "#ffb060" : e.kind === "DONE" ? "#5ad08a" : /FAIL|REJECT/.test(e.kind) ? "#ff5a5a" : null; if (col) { g.fillStyle = col; g.fillRect(X(i) - 1, 0, 2, h - 6); } }
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h);
  g.fillStyle = "#9aa0a6"; g.font = "10px ui-monospace, Menlo"; g.fillText("foot load / body weight: L (magenta) R (orange) · lines at 100 % and the 5 % liftoff gate · ξ margin (cyan) · phase strip · liftoff (orange) touchdown (cyan) done (green) fail/reject (red)", 6, 10);
}
function renderSideC2() {
  const s = H.run, f = (x, d = 1) => (x == null ? "-" : (+x).toFixed(d)), row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`, L_ = s.lean || {};
  let h = `<h3>${s.test} — ${s.title}</h3><div class="small">Gate C2: no pelvis support, no root anchor, no state writes after t = 0 (asserted every test). The support layer only moves the balance reference and a swing-foot target; every phase change is gated by sensed contact / load / motion. No corrective stepping.</div><table>`;
  h += row("outcome", `<b>${s.fell ? "FELL" : "upright"}</b> · final class ${s.finalClass}`, s.fell);
  h += row("ROOT SUPPORT (must be 0)", `fixture present: <b>${s.supportFixture}</b> · pelvis external-force residual mean ${s.root.residualMeanN} N (max ${s.root.residualMaxN}) · state writes ${s.audit.teleports}/${s.audit.velocityWrites}`, s.supportFixture || s.audit.teleports + s.audit.velocityWrites > 0);
  h += row("load transfer", `ΣL+R vs body weight ${s.loads.totalVsBodyWeightN} N · max per-step change ${s.loads.maxStepChangeN} N · R share ${s.loads.shareR ? s.loads.shareR.join(" → ") : "-"}`);
  h += row("drift (whole run)", `feet L ${s.drift.footL} · R ${s.drift.footR} cm · COM ${s.drift.com} cm · slid L ${s.drift.slidL} R ${s.drift.slidR} mm`);
  h += row("single-support statics", `hip centres ${f(L_.hipHalfWidth * 200, 1)} cm apart · stance-hip abduction ${f(L_.tau0, 0)} N·m unleaned (${f(L_.tau0 / L_.cap * 100, 0)} % of ${L_.cap}) → lean ${f(L_.leanDeg, 1)}° → ${f(L_.tauAtLean, 0)} N·m`);
  h += row("stability", `joint sep ${s.stability.maxJointSepMm} mm · min joint-limit margin ${s.stability.minJointLimitMarginDeg}° · turf ${s.stability.maxTurfPenMm} mm · self ${s.stability.maxSelfPenMm} mm · NaN ${s.nan}`);
  h += row("CPU (this browser)", `${f(s.cpu.msPerFrame, 3)} ms / 60 Hz frame (Jolt ${f(s.cpu.jolt, 3)} · sensing ${f(s.cpu.sensing, 3)} · controller+support ${f(s.cpu.controller, 3)}) · run ${f(H.simMs, 0)} ms`);
  const node = H.suiteC2 && H.suiteC2.results.find(r => r.test === s.test);
  h += row("state hash", `${s.hash} ${node ? (node.hash === s.hash ? "<span class=ok>= Node</span>" : "<span class=bad>≠ Node " + node.hash + "</span>") : ""}`) + `</table>`;
  for (const q of s.requests) { if (q.type === "shift") continue; const bad = !/DONE|FAILED_BLOCKED/.test(q.status) && !(q.status === "REJECTED" && /no feasible/.test(q.why || ""));
    h += `<h3>#${q.id} ${q.type} ${q.foot} ${q.label || ""} → <span class="${q.status === "DONE" ? "ok" : bad ? "bad" : ""}">${q.status}</span></h3><table>`;
    if (q.why) h += row("reason", q.why);
    if (q.requested) h += row("requested → feasible", `${q.correctedCm ? `projected by <b>${q.correctedCm} cm</b>` : "feasible as requested"}${q.projectionReasons && q.projectionReasons.length ? "<br><span class=small>" + q.projectionReasons.join("<br>") + "</span>" : ""}`);
    if (q.liftoff) h += row("liftoff gate (measured)", `swing load ${q.liftoff.swingLoadN} N (${q.liftoff.swingLoadPctBW} % BW) · stance ξ margin ${q.liftoff.stanceXiMarginCm} cm · COM margin ${q.liftoff.stanceComMarginCm} cm · |v| ${q.liftoff.vcom} m/s · transfer ${q.liftoff.transferS} s · physically off at ${q.liftoff.physicalT} s`);
    if (q.touchdown) h += row("touchdown (sensed)", `single support ${q.touchdown.singleSupportS} s · landing error ${q.touchdown.landingErrorCm} cm · v ↓${q.touchdown.verticalVelocity} / ↔${q.touchdown.horizontalVelocity} m/s · ${q.touchdown.early ? "EARLY (u " + q.touchdown.uAt + ")" : "at the planned end"} · foot tilt ${q.touchdown.footTiltDeg}°`);
    if (q.accepted) h += row("load acceptance", `${q.accepted.fromTouchdownS} s after touchdown · ${q.accepted.loadN} N · final error ${q.accepted.finalErrorCm} cm · moved after touchdown ${q.accepted.driftAfterTouchdownCm} cm`);
    if (q.blocked) h += row("blocked", `at ${q.blocked.t} s · ${q.blocked.lagCm} cm behind · obstacle force ${q.blocked.obstacleMaxForceN} N · penetration ${q.blocked.obstaclePenetrationMm} mm · first contact ${q.blocked.firstObstacleContactT} s`);
    if (q.metrics) { const m = q.metrics; h += row("metrics", `sole clearance (progression) min ${m.minSoleClearanceCm ?? "-"} / peak ${m.peakSoleClearanceCm ?? "-"} cm · to stance leg ${m.minClearanceToStanceLegCm ?? "-"} cm · swing-foot penetration ${m.peakSwingFootPenetrationMm ?? "-"} mm · stance slid ${m.stanceFootSlidMm} mm · leg self-contact ${m.legSelfContactMm} mm · joint-limit margin ${m.jointLimitMarginDeg}° (${m.jointLimitMarginJoint}) · root max ${m.rootResidualMaxN} N · worst class ${m.classMax}<br>saturation ${Object.entries(m.saturationMs).map(([k, v]) => `${k} ${v} ms`).join(" · ") || "none"}`); }
    h += `</table>`; }
  if (H.suiteC2) { h += `<h3>C2 suite (Node, same WASM)</h3><table><tr><th>test</th><th>outcome</th><th>requests</th><th>det</th></tr>` +
    H.suiteC2.results.map(r => `<tr><td>${r.test}</td><td>${r.fell ? "FELL" : "upright"}</td><td>${r.requests.filter(q => q.type !== "shift").map(q => q.status).join(" · ") || r.requests.length + " shifts"}</td><td class="${r.deterministic ? "ok" : "bad"}">${r.deterministic ? "✓" : "✗"}</td></tr>`).join("") + `</table>`; }
  $("side").innerHTML = h;
}
// ── V1.1 ANATOMY / ROM calibration overlays: hip + shoulder joint centres of BOTH calibrations on the current pelvis / chest, the mesh's
// visible hip width (what the eye reads — not the joint-centre width), the physics skeleton (body origins = joint centres) and the rendered
// skeleton (the rig's bone chain as skinned: each bone segment carried by its own body — where a physics joint centre is not at the rig
// bone origin the rendered chain visibly separates at that joint), live joint angles with their limit margins ──
function visibleHipWidth(rig, mesh, spec) { const y0 = spec.bodies[spec.bodies.findIndex(b => b.name === "thigh_R")].origin[1], P = mesh.positions, Jn = mesh.joints, Wt = mesh.weights;
  const keep = new Set(rig.bones.map((b, i) => /^(pelvis|thigh_)/.test(b.name) ? i : -1).filter(i => i >= 0)); let lo = 1e9, hi = -1e9;
  for (let v = 0; v < P.length / 3; v++) { if (Math.abs(P[v * 3 + 1] - y0) > 0.02) continue; let bw = -1, bj = -1; for (let q = 0; q < 4; q++) if (Wt[v * 4 + q] > bw) { bw = Wt[v * 4 + q]; bj = Jn[v * 4 + q]; }
    if (!keep.has(bj)) continue; lo = Math.min(lo, P[v * 3]); hi = Math.max(hi, P[v * 3]); }
  return { y: y0, lo, hi }; }
function ball(p, r, col) { for (const pl of [0, 1, 2]) { let prev = null; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2, c = Math.cos(a) * r, d = Math.sin(a) * r, q = pl === 0 ? [p[0] + c, p[1], p[2] + d] : pl === 1 ? [p[0] + c, p[1] + d, p[2]] : [p[0], p[1] + d, p[2] + c]; if (prev) L(prev, q, col); prev = q; } } }
function drawAnat(rec, S, labels) {
  const O = H.ov, spec = H.spec, bi = (sp, n) => sp.bodies.findIndex(b => b.name === n);
  const inFrameOf = (bodyName, pBind) => { const k = bi(spec, bodyName), s = S[k]; return V.add(s.pos, Q.rot(s.rot, V.sub(pBind, spec.bodies[k].origin))); };
  if (O.a_vis && H.visHip) { const v = H.visHip, a = inFrameOf("pelvis", [v.lo, v.y, 0]), b = inFrameOf("pelvis", [v.hi, v.y, 0]); L(a, b, [0.9, 0.9, 0.9, 0.9]); for (const p of [a, b]) L(V.add(p, [0, -0.03, 0]), V.add(p, [0, 0.03, 0]), [0.9, 0.9, 0.9, 0.9]);
    labels.push([V.add(a, [0, 0.035, 0]), `visible hip width ${((v.hi - v.lo) * 100).toFixed(0)} cm (mesh surface at hip-centre height)`, "#e0e0e0"]); }
  if (O.a_jc) for (const c of ["V1", "V1.1"]) { const sc = H.specs[c], cur = c === H.calib, col = c === "V1" ? [1, 0.35, 0.3, 1] : [0.25, 1, 0.45, 1], hex = c === "V1" ? "#ff7a6a" : "#6aff95";
    const jc = (parent, child) => inFrameOf(parent, sc.bodies[bi(sc, child)].origin), hl = jc("pelvis", "thigh_L"), hr = jc("pelvis", "thigh_R");
    for (const p of [hl, hr]) { ball(p, cur ? 0.03 : 0.022, col); cross3(p, 0.012, col); } L(hl, hr, col);
    labels.push([V.add(hl, [0, c === "V1" ? 0.06 : -0.05, 0]), `${c}${cur ? " (this body)" : ""} hip joint centres ${(V.dist(hl, hr) * 100).toFixed(1)} cm apart`, hex]);
    const par = spec.bodies[spec.joints.find(j => j.name === "shoulder_L").parentIndex].name, sl = jc(par, "upperArm_L"), sr = jc(par, "upperArm_R");
    for (const p of [sl, sr]) ball(p, cur ? 0.024 : 0.018, col); L(sl, sr, [col[0], col[1], col[2], 0.45]);
    labels.push([V.add(sl, [0, c === "V1" ? 0.05 : -0.04, 0]), `${c} shoulder centres ${(V.dist(sl, sr) * 100).toFixed(1)} cm`, hex]); }
  if (O.a_pskel) { skeleton(S, [0.35, 0.8, 1, 1]); spec.bodies.forEach((b, i) => cross3(S[i].pos, 0.014, [0.35, 0.8, 1, 1])); }
  if (O.a_rskel) { const rig = H.entry.rig, M = H.skin = H.mesh && H.skin ? H.skin : skinMatrices(rig, spec, S, H.map, H.skin), idx = {}; rig.bones.forEach((b, i) => { idx[b.name] = i; });
    const X = (i, p) => { const m = i * 16; return [M[m] * p[0] + M[m + 4] * p[1] + M[m + 8] * p[2] + M[m + 12], M[m + 1] * p[0] + M[m + 5] * p[1] + M[m + 9] * p[2] + M[m + 13], M[m + 2] * p[0] + M[m + 6] * p[1] + M[m + 10] * p[2] + M[m + 14]]; };
    const col = [1, 0.62, 0.1, 1]; rig.bones.forEach((b, i) => { if (!b.parent || b.parent === "root") return; const p = idx[b.parent]; L(X(p, rig.bones[p].bindOrigin), X(p, b.bindOrigin), col); ball(X(i, b.bindOrigin), 0.008, col); }); }
}
const ANAT_J = ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R", "shoulder_L", "shoulder_R", "elbow_L", "elbow_R"];
function anatLive(S) { const spec = H.spec, f = (x) => deg(x).toFixed(1).padStart(6); let out = `joint angles (deg; margin = distance to the nearest limit)   body ${H.calib}`;
  for (let n = 0; n < ANAT_J.length; n += 2) { out += "\n"; for (const name of ANAT_J.slice(n, n + 2)) { const j = spec.joints.find(q => q.name === name), js = jointState(j, S);
    if (j.type === "hinge") { const m = Math.min(js.a - j.lo, j.hi - js.a); out += `${name.padEnd(10)} flex ${f(js.a)}           margin ${f(m)}      `; }
    else { const Lm = j.limits, m = Math.min(js.twist - Lm.twist[0], Lm.twist[1] - js.twist, js.swingY - Lm.swingY[0], Lm.swingY[1] - js.swingY, js.swingZ - Lm.swingZ[0], Lm.swingZ[1] - js.swingZ);
      out += `${name.padEnd(10)} Y ${f(js.swingY)} Z ${f(js.swingZ)} T ${f(js.twist)} margin ${f(m)}${j.bindAbductionDeg != null ? " (bind abd " + j.bindAbductionDeg + "°)" : j.bindInversionDeg != null ? " (bind inv " + j.bindInversionDeg + "°)" : ""}   `; } } }
  return out; }
function anatSide() { const spec = H.spec, bi = (n) => spec.bodies.findIndex(b => b.name === n), o = (n) => spec.bodies[bi(n)].origin, J = (n) => spec.joints.find(j => j.name === n), lim = limitsFor(spec);
  const cm = (x) => (x * 100).toFixed(1), rng = (a) => `${(+a[0]).toFixed(0)} … ${(+a[1]).toFixed(0)}`, other = H.calib === "V1" ? "V1.1" : "V1", so = H.specs[other], oo = (n) => so.bodies[so.bodies.findIndex(b => b.name === n)].origin;
  const hipS = 2 * Math.abs(o("thigh_R")[0]), kneeS = 2 * Math.abs(o("shin_R")[0]), ankS = 2 * Math.abs(o("foot_R")[0]), shS = 2 * Math.abs(o("upperArm_R")[0]);
  let com = [0, 0, 0]; spec.bodies.forEach(b => { com = V.add(com, V.sc(V.add(b.origin, b.com), b.mass)); }); com = V.sc(com, 1 / spec.totalMass);
  const row = (k, v, w) => `<tr><td>${k}</td><td><b>${v}</b></td><td class="small">${w ?? ""}</td></tr>`, hip = J("hip_R"), ank = J("ankle_R"), kn = J("knee_R"), sh = J("shoulder_R");
  let h = `<h3>Body: ${H.calib}${H.calib === "V1.1" ? " — anatomy / ROM calibration" : " — approved baseline"}${isC2() ? ` · C2 controller: ${H.ctrlv === "recal" ? "approved + R1·R2 (historical)" : H.ctrlv === "diag" ? "approved + R1·R2 + D1 (historical)" : H.ctrlv === "approved" ? "approved Gate C2" : H.calib === "V1.1" ? "V1.1 working (integrated)" : "approved (V1 working)"}` : ""}</h3>`;
  h += `<table><tr><th>quantity</th><th>${H.calib}</th><th>${other}</th></tr>`;
  h += row("hip joint centres apart", `${cm(hipS)} cm`, `${cm(2 * Math.abs(oo("thigh_R")[0]))} cm`) + row("knee joint centres apart", `${cm(kneeS)} cm`, `${cm(2 * Math.abs(oo("shin_R")[0]))} cm`) + row("ankle joint centres apart", `${cm(ankS)} cm`, `${cm(2 * Math.abs(oo("foot_R")[0]))} cm`);
  h += row("shoulder centres (apart · height)", `${cm(shS)} · ${o("upperArm_R")[1].toFixed(3)} m`, `${cm(2 * Math.abs(oo("upperArm_R")[0]))} · ${oo("upperArm_R")[1].toFixed(3)} m`);
  if (H.visHip) h += row("visible hip width (mesh)", `${cm(H.visHip.hi - H.visHip.lo)} cm`, "same mesh");
  h += row("hip ROM flex/ext (swing Y)", rng(hip.swingY), rng(so.joints.find(j => j.name === "hip_R").swingY)) + row("hip ROM ad/ab (swing Z, about bind)", rng(hip.swingZ) + (hip.bindAbductionDeg != null ? ` · bind abd ${hip.bindAbductionDeg}°` : ""), rng(so.joints.find(j => j.name === "hip_R").swingZ));
  h += row("knee range", `${deg(kn.lo).toFixed(0)} … ${deg(kn.hi).toFixed(0)}`, `${deg(so.joints.find(j => j.name === "knee_R").lo).toFixed(0)} … ${deg(so.joints.find(j => j.name === "knee_R").hi).toFixed(0)}`);
  h += row("ankle DF/PF (swing Y)", rng(ank.swingY), rng(so.joints.find(j => j.name === "ankle_R").swingY)) + row("ankle inv/ev (swing Z)", rng(ank.swingZ), rng(so.joints.find(j => j.name === "ankle_R").swingZ));
  h += row("shoulder (swing Y · Z)", `${rng(sh.swingY)} · ${rng(sh.swingZ)}`, "");
  h += row("torque caps hip Y · Z (N·m)", `${rng(lim.hip.Y)} · ${rng(lim.hip.Z)}`, `${rng(limitsFor(so).hip.Y)} · ${rng(limitsFor(so).hip.Z)}`) + row("torque caps shoulder Z · elbow", `${rng(lim.shoulder.Z)} · ${rng(lim.elbow.H)}`, `${rng(limitsFor(so).shoulder.Z)} · ${rng(limitsFor(so).elbow.H)}`);
  h += row("mass · whole-body COM (bind)", `${spec.totalMass} kg · ${com[1].toFixed(3)} m`, "");
  if (H.run && H.run.lean) { const l = H.run.lean; h += row("single-leg statics (hip abduction τ0 · lean)", `${(+l.tau0).toFixed(0)} N·m · ${(+l.leanDeg).toFixed(1)}°`, `hip half-width ${cm(l.hipHalfWidth)} cm`); }
  return h + `</table><div class="small">V1 hip centres come from the Astra template skeleton (thigh bone x 0.1805 → 0.1615 for this player); V1.1 places them at the anatomical hip-joint-centre width (±9.2 cm; Bardakos & Freeman 2012, Hara 2016). The mesh is unchanged — only the physics joint centres move. Overlays: Anatomy row.</div>`; }
// ── GATE C3: corrective stepping overlays — the planned step (predicted capture point at touchdown, wanted foothold, projected foothold,
// the stance CoP it was planned from), the swing target, and the SENSED touchdown ──
const S3COL = { want: [1, 0.55, 0.2, 0.9], target: [0.35, 1, 0.45, 1], td: [0.3, 0.75, 1, 1], xtd: [1, 0.3, 0.9, 1], pst: [1, 1, 1, 0.9] };
function footQuad(center, yaw) { const b = H.spec.bodies[H.spec.bodies.findIndex(q => q.name === "foot_L")].shapes[0]; return footprint(b, center, yaw); }
function drawC3(rec, S, labels) {
  const st = rec.step, R = H.run.step; if (!st && !(R && R.touchdown)) return;
  if (st && st.target) { const yaw = st.yaw || 0, tq = footQuad(st.target, yaw); polyLine(tq, S3COL.target, 0.012); labels.push([G2(st.target, 0.02), `planned foothold (${st.sw})${st.projected ? " — PROJECTED onto reach" : ""}`, "#70ff90"]);
    if (st.projected && st.want) { polyLine(footQuad(st.want, yaw), S3COL.want, 0.01); labels.push([G2(st.want, 0.02), "wanted (capture) foothold — beyond reach", "#ffa050"]); L(G2(st.target, 0.012), G2(st.want, 0.012), [1, 0.55, 0.2, 0.5]); } }
  if (st && st.xtd) { const x = G2(st.xtd, 0.014); ring(x, 0.04, S3COL.xtd, 0.014); cross3(x, 0.03, S3COL.xtd); labels.push([x, `predicted ξ at touchdown · margin ${st.margin != null ? (st.margin * 100).toFixed(1) : "-"} cm`, "#ff70e0"]); }
  if (st && st.pst) { const p = G2(st.pst, 0.012); cross3(p, 0.025, S3COL.pst); labels.push([p, "stance CoP (planned)", "#ffffff"]); if (st.xtd) L(p, G2(st.xtd, 0.012), [1, 0.3, 0.9, 0.5]); }
  if (rec.swingTgt) { cross3(rec.swingTgt.pos, 0.02, [1, 0.9, 0.2, 1]); }
  if (R && R.touchdown && rec.t >= (H.run.worst.touchdown || 1e9) / 240) { const c = R.touchdown.center; polyLine(footQuad(c, (st && st.yaw) || 0), S3COL.td, 0.016); labels.push([G2(c, 0.03), `touchdown (sensed) · ${R.touchdown.errCm} cm from the plan`, "#60c0ff"]); }
}
function statusC3(rec, meshPen) { const R = H.run.step, st = rec.step;
  return statusC1(rec, meshPen) + `\nstep ${rec.stepStage || "-"}${st ? ` · ${st.sw} foot${st.projected ? " (projected foothold)" : ""}` : ""}   outcome ${H.run.outcome}${H.run.refused ? " — " + H.run.refused : ""}${R && R.fail ? " — " + R.fail : ""}`; }
function bannerC3(ov, rec, W) { const stg = rec.stepStage; if (!stg || stg === "STAND") return; const txt = { SWING: "CORRECTIVE STEP — SWING", DESCEND: "CORRECTIVE STEP — SEEKING GROUND", ACCEPT: "CORRECTIVE STEP — LOAD ACCEPTANCE", FAILED: "CORRECTIVE STEP FAILED — releasing" }[stg] || stg;
  ov.font = "bold 15px -apple-system, system-ui, sans-serif"; const w = ov.measureText(txt).width; ov.fillStyle = "#000b"; ov.fillRect(W / 2 - w / 2 - 10, 150, w + 20, 24); ov.fillStyle = stg === "FAILED" ? "#ff6060" : "#70e0ff"; ov.fillText(txt, W / 2 - w / 2, 168); }
function renderSideC3() { const r = H.run, R = r.step, f = (x) => x == null ? "-" : x, row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`;
  let h = `<h3>${TESTS_C3[H.testC3].title}</h3><div class="small">Gate C3: C1's STEP_NEEDED → a physically executed corrective step (one step). No pelvis support, no teleport; liftoff and touchdown are SENSED.</div><table>`;
  h += row("outcome", `<b>${r.outcome}</b>${r.refused ? " — " + r.refused : ""}`, /FELL/.test(r.outcome)) + row("push", r.push ? `${r.push.Ns} N·s ${r.push.dir} at ${r.push.at} s` : "-") + (r.delayMs ? row("sensing delay", r.delayMs + " ms") : "") + (r.friction ? row("turf friction μ", r.friction) : "");
  if (R) { h += row("swing foot", R.foot) + row("timeline", `STEP_NEEDED ${f(R.tStepNeeded)} s · liftoff +${f(R.liftoffAfterNeedS)} · touchdown +${f(R.touchdownAfterNeedS)} · recovered +${f(R.recoveredAfterNeedS)} s`);
    if (R.planned) h += row("foothold", `${R.planned.projected ? "PROJECTED onto reach" : "as wanted"} · predicted ξ margin at touchdown ${R.planned.predictedXiMarginCm} cm · swing ${R.planned.tSwing} s${R.planned.reasons && R.planned.reasons.length ? "<br><span class=small>" + R.planned.reasons.join("; ") + "</span>" : ""}`);
    if (R.touchdown) h += row("touchdown", `${R.touchdown.errCm} cm from the planned foothold (u ${R.touchdown.uAt}) · ξ margin at touchdown ${f(R.xiMarginAtTouchdownCm)} cm`, R.touchdown.errCm > 15);
    if (R.fail) h += row("failure", R.fail, true); }
  h += row("whole body", `COM excursion ${r.whole.comExcursionCm} cm · trunk max ${r.whole.trunkMaxDeg}° · COM drop ${r.whole.comDropCm} cm · stance slid ${f(r.whole.stanceSlidCm)} cm`) + row("stability", `joint sep ≤ ${r.stability.maxJointSepMm} mm · limit margin ${r.stability.minJointLimitMarginDeg}° (${r.stability.limJoint}) · turf ${r.stability.maxTurfPenMm} mm · self ${r.stability.maxSelfPenMm} mm`);
  h += row("state hash", `${r.hash} ${H.suiteC3 ? ((H.suiteC3.results.find(q => q.test === H.testC3) || {}).hash === r.hash ? "<span class=ok>= Node</span>" : "<span class=bad>≠ Node</span>") : ""}`) + `</table>`;
  if (r.events && r.events.length) h += `<h3>Stepper events</h3><table>` + r.events.map(e => `<tr><td>${e.t != null ? e.t.toFixed(3) : "-"}</td><td>${e.kind}</td><td class="small">${e.what}</td></tr>`).join("") + `</table>`;
  if (H.suiteC3) h += `<h3>C3 suite (Node, same WASM, ×3)</h3><table><tr><th>test</th><th>outcome</th><th>det</th></tr>` + H.suiteC3.results.map(q => `<tr><td>${q.test}</td><td class="${/FELL/.test(q.outcome) ? "bad" : "ok"}">${q.outcome}</td><td>${q.deterministic ? "✓" : "✗"}</td></tr>`).join("") + `</table>`;
  $("side").innerHTML = h; }
// ── UI ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const WORST = { C3: [["push", "push"], ["stepNeeded", "STEP_NEEDED"], ["liftoff", "liftoff"], ["touchdown", "touchdown"], ["recovered", "recovered"], ["falling", "fall release"], ["grounded", "first non-foot ground contact"]], C2: [["liftoff", "first liftoff"], ["touchdown", "first touchdown"], ["done", "first request outcome"]], C: [["push", "push"], ["stepNeeded", "STEP_NEEDED declared"], ["falling", "fall transition (release)"], ["grounded", "first non-foot ground contact"], ["minMargin", "smallest capture-point margin"], ["footRoll", "first foot roll / lift"]], A: [["groundPen", "ground penetration"], ["anchor", "joint separation"], ["limit", "limit violation"], ["pop", "correction pop"], ["self", "self penetration"], ["energy", "energy gain"]],
  B: [["err", "target error (RMS peak)"], ["contact", "first obstacle contact"], ["penetration", "deepest obstacle penetration"], ["disturbance", "disturbance"], ["limit", "limit violation"], ["anchor", "joint separation"], ["ground", "ground penetration"], ["self", "self penetration"]] };
function setSuite(k) { H.suiteKey = k; document.body.classList.toggle("suiteB", isB()); document.body.classList.toggle("suiteC", isBal()); document.body.classList.toggle("suiteC2", isC2()); $("suite").value = k; const sel = $("drop"); sel.innerHTML = "";
  if (isC3()) { let grp = null, og = null; for (const t of Object.keys(TESTS_C3)) { if (TESTS_C3[t].group !== grp) { grp = TESTS_C3[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_C3[t].title}`, t)); } }
  else if (isC2()) { let grp = null, og = null; for (const t of Object.keys(TESTS_C2)) { if (TESTS_C2[t].group !== grp) { grp = TESTS_C2[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_C2[t].title}`, t)); } }
  else if (isC()) { let grp = null, og = null; for (const t of Object.keys(TESTS_C1)) { if (TESTS_C1[t].group !== grp) { grp = TESTS_C1[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_C1[t].title}`, t)); } }
  else if (isB()) for (const t of Object.keys(TESTS)) sel.add(new Option(TESTS[t].title, t)); else for (const d of Object.keys(DROPS)) sel.add(new Option(DROPS[d].title, d));
  sel.value = isC3() ? H.testC3 : isC2() ? H.testC2 : isC() ? H.testC : isB() ? H.test : H.drop; $("tlhelp").textContent = isBal() ? "nominal (grey dashed) · final target (white dashed) · actual (cyan) · gravity offset (green) · balance offset (orange) · effort / limit (red) · saturated (red band)" : "target (dashed) vs actual (solid) · error (red) · motor effort / limit (orange) · saturated (red band) · contact force (magenta) · support force (violet)"; $("worst").innerHTML = ""; for (const [v, t] of WORST[k]) $("worst").add(new Option(t, v)); applySuites(); }
function ui() {
  for (const j of ["lumbar", "thoracic", "neck", "shoulder_L", "elbow_L", "shoulder_R", "elbow_R", "hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R"]) $("jsel").add(new Option(j, j));
  $("jsel").value = H.jsel; $("jsel").onchange = () => { H.jsel = $("jsel").value; drawChart2(); }; $("comp").onchange = () => { H.comp = $("comp").value; drawChart2(); };
  $("groot").onchange = () => { H.ghostRoot = $("groot").value; };
  $("suite").onchange = () => { setSuite($("suite").value); applySuites(); simulate(); };
  $("calib").onchange = () => { setCalib($("calib").value); simulate(); };
  $("prot").onclick = (e) => { H.prot = !H.prot; e.target.classList.toggle("on", H.prot); simulate(); }; $("prot").classList.toggle("on", H.prot);
  $("arms").onclick = (e) => { H.arms = !H.arms; e.target.classList.toggle("on", H.arms); simulate(); }; $("arms").classList.toggle("on", H.arms); $("ctrlv").onchange = () => { setCalib(H.calib, $("ctrlv").value); simulate(); };
  $("drop").onchange = () => { if (isC3()) H.testC3 = $("drop").value; else if (isC2()) H.testC2 = $("drop").value; else if (isC()) H.testC = $("drop").value; else if (isB()) H.test = $("drop").value; else H.drop = $("drop").value; simulate(); }; $("restart").onclick = () => { H.i = 0; H.acc = 0; H.playing = true; $("play").textContent = "❚❚ pause"; };
  $("play").onclick = () => { H.playing = !H.playing; if (H.playing && H.i >= H.run.recs.length - 1) H.i = 0; $("play").textContent = H.playing ? "❚❚ pause" : "▶ play"; };
  $("speed").onchange = () => { H.speed = +$("speed").value; };
  $("sm").onclick = () => { H.playing = false; H.i = Math.max(0, H.i - 1); $("play").textContent = "▶ play"; }; $("sp").onclick = () => { H.playing = false; H.i = Math.min(H.run.recs.length - 1, H.i + 1); $("play").textContent = "▶ play"; };
  $("scrub").oninput = () => { H.playing = false; H.i = +$("scrub").value; $("play").textContent = "▶ play"; };
  $("goworst").onclick = () => { H.playing = false; H.i = H.run.worst[$("worst").value] || 0; $("play").textContent = "▶ play"; };
  $("v_mesh").onclick = (e) => { H.mesh = !H.mesh; e.target.classList.toggle("on", H.mesh); }; $("v_phys").onclick = (e) => { H.phys = !H.phys; e.target.classList.toggle("on", H.phys); };
  document.querySelectorAll("[data-cam]").forEach(b => b.onclick = () => { const p = PRESETS[b.dataset.cam]; H.cam.az = p[0]; H.cam.el = p[1]; H.cam.dist = p[2]; });
  $("follow").onclick = (e) => { H.follow = !H.follow; e.target.classList.toggle("on", H.follow); };
  document.querySelectorAll("[data-ov]").forEach(b => { b.classList.toggle("on", !!H.ov[b.dataset.ov]); b.onclick = () => { H.ov[b.dataset.ov] = !H.ov[b.dataset.ov]; b.classList.toggle("on", H.ov[b.dataset.ov]); }; });
  let drag = null; canvas.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; }; window.onmouseup = () => { drag = null; };
  canvas.oncontextmenu = (e) => e.preventDefault();
  window.onmousemove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { H.follow = false; $("follow").classList.remove("on"); const a = H.cam.az * Math.PI / 180, k = H.cam.dist * 0.002; H.cam.target = V.add(H.cam.target, [Math.cos(a) * dx * k, dy * k, -Math.sin(a) * dx * k]); }
    else { H.cam.az += dx * 0.4; H.cam.el = Math.max(-5, Math.min(89, H.cam.el + dy * 0.3)); } };
  canvas.onwheel = (e) => { e.preventDefault(); H.cam.dist = Math.max(0.6, Math.min(15, H.cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); };
  window.onkeydown = (e) => { if (e.target.tagName === "SELECT") return; if (e.key === " ") { e.preventDefault(); $("play").click(); } if (e.key === "ArrowRight") $("sp").click(); if (e.key === "ArrowLeft") $("sm").click(); };
  // clicking the joint chart scrubs
  $("chart2").onclick = (e) => { const r = $("chart2").getBoundingClientRect(); H.playing = false; H.i = Math.round((e.clientX - r.left) / r.width * (H.run.recs.length - 1)); };
  $("chart").onclick = (e) => { const r = $("chart").getBoundingClientRect(); H.playing = false; H.i = Math.round((e.clientX - r.left) / r.width * (H.run.recs.length - 1)); };
  setSuite(H.suiteKey);
}
function loop(ts) {
  const dt = H.last ? Math.min(0.1, (ts - H.last) / 1000) : 0; H.last = ts;
  if (H.playing && H.run) { H.acc += dt * H.speed * hz(); const adv = Math.floor(H.acc); if (adv > 0) { H.acc -= adv; H.i = Math.min(H.run.recs.length - 1, H.i + adv); if (H.i >= H.run.recs.length - 1) { H.playing = false; $("play").textContent = "▶ play"; } } }
  draw(); requestAnimationFrame(loop);
}
// testing hooks (one headless capture): set frame / camera / overlays; switch drop / test
window.GATEA_SET = (o) => { if (o.i != null) H.i = Math.max(0, Math.min(H.run.recs.length - 1, o.i)); if (o.worst) H.i = H.run.worst[o.worst] || 0; if (o.t != null) H.i = Math.min(H.run.recs.length - 1, Math.round(o.t * hz()));
  if (o.cam) { const p = PRESETS[o.cam]; H.cam.az = p[0]; H.cam.el = p[1]; H.cam.dist = p[2]; } if (o.az != null) H.cam.az = o.az; if (o.el != null) H.cam.el = o.el; if (o.dist != null) H.cam.dist = o.dist;
  if (o.mesh != null) H.mesh = o.mesh; if (o.phys != null) H.phys = o.phys; if (o.ov) Object.assign(H.ov, o.ov); if (o.groot) H.ghostRoot = o.groot; if (o.jsel) { H.jsel = o.jsel; $("jsel").value = o.jsel; } if (o.comp) { H.comp = o.comp; $("comp").value = o.comp; }
  if (o.follow != null) H.follow = o.follow; if (o.target) H.cam.target = o.target;
  document.querySelectorAll("[data-ov]").forEach(b => b.classList.toggle("on", !!H.ov[b.dataset.ov]));
  H.playing = false; drawChart2(); draw(); return { i: H.i, t: H.run.recs[H.i].t }; };
window.GATEA_DROP = (k) => new Promise((res) => { window.GATEA_READY = false; if (H.suiteKey !== "A") setSuite("A"); H.drop = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.GATEC1_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isC()) setSuite("C"); H.testC = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.GATEC3_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isC3()) setSuite("C3"); H.testC3 = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.GATEC2_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isC2()) setSuite("C2"); H.testC2 = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.PC_SETCALIB = (c, ctrlv, arms, prot) => { setCalib(c, ctrlv || ""); if (arms != null) { H.arms = !!arms; $("arms").classList.toggle("on", H.arms); } if (prot != null) { H.prot = !!prot; $("prot").classList.toggle("on", H.prot); } return H.calib; };   // no re-simulation (the next GATE*_TEST call simulates)
window.PC_CALIB = (c, ctrlv) => new Promise((res) => { window.GATEA_READY = false; setCalib(c, ctrlv || ""); simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.GATEB_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isB()) setSuite("B"); H.test = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
(async function boot() {
  try {
    ui();
    const [J, entry] = await Promise.all([loadJolt(new URL("./vendor/jolt-physics.wasm-compat.js", import.meta.url).href), ofCharLoad("gabriel")]);
    H.J = J; H.entry = entry; H.map = boneBodyMap(entry.rig); H.ref = referencedVertices(entry.mesh);
    for (const c of ["V1", "V1.1"]) { H.specs[c] = buildBodySpec(entry.rig, entry.mesh, { calib: c }); H.posesBy[c] = buildPoses(H.specs[c]); }
    H.visHip = visibleHipWidth(entry.rig, entry.mesh, H.specs.V1);
    const get = async (u) => { try { return await (await fetch(u)).json(); } catch (e) { return null; } };
    H.suitesBy.V1 = { A: await get("results/gatea_final_240x1.json"), B: await get("results/gateb_final_240x1.json"), C: await get("results/gatec1_final_240x1.json"), C2: await get("results/gatec2_final_240x1.json") };
    const c3 = await get("results/v1_1/gatec3_V1.1.json");
    H.suitesBy["V1.1"] = { C3: c3, A: await get("results/v1_1/gatea_V1.1.json"), B: await get("results/v1_1/gateb_V1.1.json"), C: await get("results/v1_1/gatec1_V1.1.json"),
      C2working: await get("results/v1_1/gatec2_V1.1_working.json"), C2approved: await get("results/v1_1/gatec2_V1.1_raw.json"), C2recal: await get("results/v1_1/gatec2_V1.1_recal.json"), C2diag: await get("results/v1_1/gatec2_V1.1_recal_diag.json") };
    setCalib(H.calib); simulate(); requestAnimationFrame(loop);
  } catch (e) { $("status").textContent = "BOOT FAILED: " + (e.stack || e); window.GATEA_ERROR = String(e); }
})();
