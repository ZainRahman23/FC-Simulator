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
import { runD, TESTS_D, TESTS_D6X } from "./pc_gated.js";
import { runG1a, TESTS_G1A } from "./pc_gateg1a.js";
import { initOfLoco, refPose, inPlaceWalkParams, walkParams, poseTargets } from "./pc_ref.js";
import { runG2a, TESTS_G2A, TESTS_G2, analyzeG2a, amBudget, jointAngles } from "./pc_gateg2.js";
import { D6Diag } from "./pc_d6diag.js";
import { D6X_COMPARE } from "./pc_d6x.js";
import { footprint } from "./pc_support.js";
import { buildPoses, fk } from "./pc_control.js";
import { skinMatrices, boneBodyMap, meshLowestY, referencedVertices } from "./pc_fit.js";
import { V, Q, deg } from "./pc_math.js";

OF_CHAR.base = "../../../assets/characters/outfield";
const $ = (id) => document.getElementById(id);
const QS = new URLSearchParams(location.search);
const H = { J: null, spec: null, entry: null, map: null, ref: null, suiteKey: (QS.get("suite") || "C").toUpperCase(), testG1: QS.get("suite") && QS.get("suite").toUpperCase() === "G1" && QS.get("test") || "S4_steps10", testG2: QS.get("suite") && QS.get("suite").toUpperCase() === "G2" && QS.get("test") || "G2a_walkInPlace", drop: "A", test: "E", testC: QS.get("suite") && QS.get("suite").toUpperCase() === "C" && QS.get("test") || "PF60", testC2: QS.get("test") || "D_fwd_R", testD: QS.get("suite") && QS.get("suite").toUpperCase() === "D" && QS.get("test") || "D2_shoved_into", testC3: QS.get("suite") && QS.get("suite").toUpperCase() === "C3" && QS.get("test") || "B_F80", run: null, i: 0, playing: false, speed: 1, acc: 0, last: 0,
  cam: { az: 35, el: 18, dist: 3.4, target: [0, 0.6, 0] }, follow: true, mesh: true, phys: true,
  ov: { bodies: false, colliders: true, coms: false, tcom: true, anchors: true, axes: false, limits: false, ground: true, normals: false, pen: true, vel: false, angvel: false, jerr: true, sleep: true,
        ghost: true, skel: false, errlab: true, torque: true, satur: true, support: true, obstacle: true, impulse: true,
        c_com: true, c_xi: true, c_region: true, c_cop: true, c_feet: true, c_grf: false, c_hip: true, c_banner: true,
        d_fp: true, d_reach: true, d_excl: true, d_path: true, d_trace: true, d_clear: true, d_env: true,
        a_jc: false, a_vis: false, a_pskel: false, a_rskel: false, a_live: false,
        g_fp: true, g_prosp: true, g_swing: true, g_env: true, g_roles: true, g_arb: true, g_views: false, g_ref: true, g_yaw: true },
  ghostRoot: "actual", jsel: "hip_R", comp: "y", suite: null, suiteB: null, skin: null, poses: null,
  arms: QS.get("arms") === "1", prot: QS.get("prot") === "1", calib: QS.get("calib") === "V1" ? "V1" : "V1.1", ctrlv: ["approved", "recal", "diag"].includes(QS.get("ctrl")) ? QS.get("ctrl") : "", specs: {}, posesBy: {}, suitesBy: {} };
window.GATEA = H;
const TD = (k) => TESTS_D[k] || TESTS_D6X[k], isD6 = () => H.suiteKey === "D" && (H.testD === "D6_slide" || !!TESTS_D6X[H.testD]);   // D6 diagnostic (D6_slide + D6X)
// (the G2 suite is a G1-family suite: the G1 drawing / status / arbiter / footprint machinery applies; isG2 adds the G2a views)
const isG2 = () => H.suiteKey === "G2", isG1 = () => H.suiteKey === "G1" || isG2();
const isD = () => H.suiteKey === "D", isB = () => H.suiteKey === "B", isC = () => H.suiteKey === "C", isC2 = () => H.suiteKey === "C2", isC3 = () => H.suiteKey === "C3", isBal = () => isC() || isC2() || isC3();

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
const title = () => isG2() ? TESTS_G2[H.testG2].title : isG1() ? TESTS_G1A[H.testG1].title : isD() ? TD(H.testD).title : isC3() ? TESTS_C3[H.testC3].title : isC2() ? TESTS_C2[H.testC2].title : isC() ? TESTS_C1[H.testC].title : isB() ? TESTS[H.test].title : DROPS[H.drop].title;
function simulate() {
  $("status").textContent = `simulating ${title()} …`; H.playing = false; $("play").textContent = "▶ play"; H.run = null;   // no frame is drawn from the previous suite's run while switching
  setTimeout(() => {
    const t0 = performance.now();
    const extra = Object.assign({}, H.arms ? { reactiveArms: true } : {}, H.prot ? { protective: true } : {});
    const dg = isD6() ? new D6Diag(H.spec) : null; H.diag = dg;   // D6 diagnostic: the causal-chain measurement (read-only onStep hook, the same code as tools/d6x_run.js)
    H.run = isG2() ? runG2a(H.J, H.spec, H.testG2, { keepStates: true, poses: H.poses, ...(H.g1main || {}) }) : isG1() ? runG1a(H.J, H.spec, H.testG1, { keepStates: true, poses: H.poses, ...(H.g1main || {}) }) : isD() ? runD(H.J, H.spec, H.testD, { keepStates: true, poses: H.poses, ctrlExtra: extra, onStep: dg ? (x) => dg.onStep(x) : undefined }) : isC3() ? runC3(H.J, H.spec, H.testC3, { keepStates: true, poses: H.poses, ctrlExtra: extra }) : isC2() ? runC2(H.J, H.spec, H.testC2, { keepStates: true, poses: H.poses, ctrl: ctrlOpts() }) : isC() ? runC1(H.J, H.spec, H.testC, { keepStates: true, poses: H.poses, ctrlExtra: extra }) : isB() ? runTest(H.J, H.spec, H.test, { keepStates: true, poses: H.poses }) : runDrop(H.J, H.spec, H.drop, { tsc: GATE_A_TSC, world: GATE_A_WORLD, keepStates: true, seconds: 6 });
    H.cmpRun = isG2() && H.g1cmp ? runG2a(H.J, H.spec, H.g1cmp.key || H.testG2, { keepStates: true, poses: H.poses, ...(H.g1cmp.opts || {}) }) : isG1() && H.g1cmp ? runG1a(H.J, H.spec, H.g1cmp.key || H.testG1, { keepStates: true, poses: H.poses, ...(H.g1cmp.opts || {}) }) : null;
    if (isG1()) prepG1(); if (isG2()) prepG2();
    H.diagSum = dg ? dg.summary(H.run) : null; H.simMs = performance.now() - t0; H.i = 0; H.acc = 0; $("scrub").max = H.run.recs.length - 1; $("scrub").value = 0; renderSide(); drawChart(); drawChart2();
    window.GATEA_READY = true; $("status").textContent = "";
  }, 20);
}
// V1.1 anatomy calibration: the body selector rebuilds the spec (and poses) and re-simulates the same test; the C2 controller variant is
// the approved controller, + the V1.1 recalibration R1·R2 (reach geometry), or + R1·R2 + the D1 diagnostic (unload intent) — never mixed silently
// "" = the body's WORKING controller (pc_balance controllerProfile: V1 → as approved, V1.1 → the integrated V1.1 controller); "approved" = the
// approved Gate C2 controller; "recal" / "diag" = the historical V1.1-report variants (R1·R2 / + D1)
function ctrlOpts() { if (H.ctrlv === "approved") return {}; if (H.ctrlv === "recal") return { anticipateReach: true, reachToGround: true }; if (H.ctrlv === "diag") return { anticipateReach: true, reachToGround: true, diagUnload: true }; return undefined; }
function applySuites() { const b = H.suitesBy[H.calib] || {}; H.suiteD = b.D || null; H.suiteC3 = b.C3 || null; H.suite = b.A || null; H.suiteB = b.B || null; H.suiteC = b.C || null; H.suiteC2 = (H.calib === "V1.1" ? b["C2" + (H.ctrlv || "working")] : b.C2) || null; }
function setCalib(c, ctrlv) { H.calib = c; if (ctrlv != null) H.ctrlv = ctrlv; H.spec = H.specs[c]; H.poses = H.posesBy[c]; H.skin = null; $("calib").value = c; $("ctrlv").value = H.ctrlv; applySuites(); document.title = `Physical character — ${c}${isC2() && H.ctrlv ? " + " + H.ctrlv : ""}`; }
const hz = () => TIMESTEP_CONFIGS[isBal() || isD() || isG1() ? GATE_C1_TSC : isB() ? GATE_B_TSC : GATE_A_TSC].hz;
// ── camera ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const PRESETS = { plan: [0, 89, 1.9], three: [35, 18, 3.4], front: [0, 8, 3.6], side: [90, 8, 3.6], back: [180, 12, 3.6], top: [0, 85, 4.2], left: [-90, 8, 3.6], low: [60, 4, 2.6] };
function camera(rec) {
  if (H.follow && rec) { const c = isD6() && H.diag && H.diag.rec[H.i] ? H.diag.rec[H.i].B.com : totalCom(rec); H.cam.target = [c[0], H.camTy != null ? H.camTy : H.cam.el > 80 ? 0 : Math.max(0.25, c[1]), c[2]]; }   // plan view: look at the ground under the COM (D6: follow the struck player)
  const { az, el, dist, target } = H.cam, a = az * Math.PI / 180, e = el * Math.PI / 180;
  const eye = [target[0] + dist * Math.cos(e) * Math.sin(a), target[1] + dist * Math.sin(e), target[2] + dist * Math.cos(e) * Math.cos(a)];
  return { view: lookAt(eye, target), proj: persp(40, canvas.width / canvas.height, 0.05, 200), eye };
}
const totalCom = (rec) => { let m = 0, c = [0, 0, 0]; rec.states.forEach((s, i) => { const b = H.spec.bodies[i % H.spec.bodies.length]; c = V.add(c, V.sc(s.com, b.mass)); m += b.mass; }); return V.sc(c, 1 / m); };
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
  if (isD()) return drawD(rec, cam, ov, W, Hh);
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
    if (isBal() || isG1()) drawC1(rec, S, labels);
    if (isG1()) drawG1(rec, S, labels);
    if (isC2()) drawC2(rec, S, labels);
    if (isC3()) drawC3(rec, S, labels);
    drawAnat(rec, S, labels);
    flushLines(cam.view, cam.proj, false);
  }
  ov.font = "11px ui-monospace, Menlo, monospace"; for (const [p, t, c] of labels) { const q = project(cam, p); if (!q) continue; ov.fillStyle = "#000a"; ov.fillRect(q[0] + 6, q[1] - 11, ov.measureText(t).width + 6, 14); ov.fillStyle = c; ov.fillText(t, q[0] + 9, q[1]); }
  // live readout
  const meshPen = H.ov.pen && H.mesh ? Math.max(0, -meshLowestY(H.entry.mesh, H.skin || skinMatrices(H.entry.rig, spec, S, H.map), H.ref).minY) : null;
  const head = `${title()}   step ${rec.n}/${H.run.recs.length - 1}   t ${rec.t.toFixed(3)} s   ${hz()} Hz   ${H.playing ? "▶ " + H.speed + "×" : "❚❚"}\n`;
  if (isG1()) $("status").textContent = head + statusG1(rec, meshPen);
  else if (isC3()) $("status").textContent = head + statusC3(rec, meshPen);
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
  $("scrub").value = H.i; drawChart(true); if (isB() || isBal() || isG1()) drawChart2(true); if (isG1()) cursorG1();
  if (isG1() && H.ov.c_banner) bannerG1(ov, rec, W);
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
function drawChart(cursorOnly) { if (isG1()) return drawChartG1(); if (isD()) return drawChartD(); if (isC2()) return drawChartC2(); if (isC() || isC3()) return drawChartC1();
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
function drawChart2() { if (isG1()) return drawChart2G1(); if (isD()) return H.diag ? drawChart2D6() : undefined; if (isBal()) return drawChart2C1();
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
function renderSide() { renderSideInner(); $("side").insertAdjacentHTML(isD() || isG1() ? "beforeend" : "afterbegin", anatSide()); }   // Gate D: its own panel first
function renderSideInner() { if (isG2()) return renderSideG2(); if (isG1()) return renderSideG1(); if (isD()) return renderSideD(); if (isC3()) return renderSideC3(); if (isC2()) return renderSideC2(); if (isC()) return renderSideC1(); if (isB()) return renderSideB();
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
// ── GATE D (vertical slice): two characters. Each is skinned from ITS OWN solved bodies (B with A's bind spec — the mesh is A's bind mesh),
// colliders per character (A cyan, B magenta), the character ↔ character manifolds (red = touching ≤ 0.5 mm, amber = speculative: the solver
// already limits the approach), per-character state labels ──
function drawD(rec, cam, ov, W, Hh) { const spec = H.spec, nb = spec.bodies.length, S = rec.states, SA = S.slice(0, nb), SB = S.slice(nb), O = H.ov, labels = [];
  if (H.mesh) { gl.enable(gl.CULL_FACE); H.skin = skinMatrices(H.entry.rig, spec, SA, H.map, H.skin); ofCharDraw(R, H.entry, H.skin, cam.view, cam.proj); H.skinB = skinMatrices(H.entry.rig, spec, SB, H.map, H.skinB); ofCharDraw(R, H.entry, H.skinB, cam.view, cam.proj); gl.disable(gl.CULL_FACE); }
  if (H.phys) {
    if (O.colliders) { SA.forEach((s, i) => { for (const sh of spec.bodies[i].shapes) wireShape(s, sh, H.mesh ? [0.1, 1, 0.9, 0.7] : [0.1, 0.9, 1, 0.95]); }); SB.forEach((s, i) => { for (const sh of spec.bodies[i].shapes) wireShape(s, sh, H.mesh ? [1, 0.3, 0.9, 0.7] : [1, 0.35, 0.9, 0.95]); }); }
    if (O.tcom) for (const [SS, col] of [[SA, [0.1, 0.9, 1, 1]], [SB, [1, 0.35, 0.9, 1]]]) { let m = 0, c = [0, 0, 0]; SS.forEach((s, i) => { c = V.add(c, V.sc(s.com, spec.bodies[i].mass)); m += spec.bodies[i].mass; }); c = V.sc(c, 1 / m); cross3(c, 0.05, col); L(c, [c[0], 0, c[2]], [col[0], col[1], col[2], 0.6]); }
    if (rec.cts) for (const c of rec.cts) { const inter = c.a >= 0 && c.b >= 0 && (c.a < nb) !== (c.b < nb), turf = c.a === -1 || c.b === -1;
      if (inter) { const touch = c.depth > -0.0005; for (const p of c.pts) { cross3(p, touch ? 0.025 : 0.012, touch ? [1, 0.15, 0.15, 1] : [1, 0.7, 0.1, 0.9]); if (O.normals) L(p, V.add(p, V.sc(c.normal, -0.08)), [0.2, 1, 1, 1]); }
        if (touch && c.pts[0]) labels.push([c.pts[0], `${spec.bodies[(c.a < nb ? c.a : c.b)].name} ↔ ${spec.bodies[(c.a < nb ? c.b : c.a) - nb].name} ${(c.depth * 1000).toFixed(1)} mm`, "#ff8080"]); }
      else if (turf && O.ground) for (const p of c.pts) cross3(p, 0.01, [1, 0.95, 0.2, 1]); }
    if (H.diag && H.diag.rec[H.i]) drawD6(H.diag.rec[H.i], labels);
    const head = (SS, up) => V.add(SS[spec.bodies.findIndex(b => b.name === "head")].pos, [0, up, 0]);   // staggered: in a side view the two heads line up
    labels.push([head(SA, 0.30), `A · ${rec.A.cls}${rec.A.stage && rec.A.stage !== "STAND" && rec.A.stage !== "IDLE" ? " · " + rec.A.stage : ""}`, "#70f0ff"], [head(SB, 0.44), `B · ${rec.B.cls}${rec.B.stage && rec.B.stage !== "STAND" && rec.B.stage !== "IDLE" ? " · " + rec.B.stage : ""}`, "#ff90f0"]);
    flushLines(cam.view, cam.proj, false); }
  ov.font = "11px ui-monospace, Menlo, monospace"; for (const [p, t, c] of labels) { const q = project(cam, p); if (!q) continue; ov.fillStyle = "#000a"; ov.fillRect(q[0] + 6, q[1] - 11, ov.measureText(t).width + 6, 14); ov.fillStyle = c; ov.fillText(t, q[0] + 9, q[1]); }
  const touching = rec.inter.filter(c => c.depth > -0.0005), txt = `t ${rec.t.toFixed(3)} s · step ${rec.n}   ·   A ↔ B: ${touching.length ? touching.map(c => `${c.a.slice(2)}↔${c.b.slice(2)} ${(c.depth * 1000).toFixed(1)} mm`).join(", ") : rec.inter.length ? rec.inter.length + " speculative manifold(s)" : "no contact"}`;
  ov.font = "12px ui-monospace, Menlo, monospace"; ov.fillStyle = "#000b"; ov.fillRect(8, 8, ov.measureText(txt).width + 12, 20); ov.fillStyle = touching.length ? "#ff9090" : "#e0e0e0"; ov.fillText(txt, 14, 22);
  if (H.diag) cursorD6(); drawChart(true); if (H.diag) drawChart2(); }
// chart: A↔B deepest manifold (red: > −0.5 mm = touching), each character's COM speed (A cyan, B magenta), cursor
function drawChartD() { const c = $("chart"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (!w) return; if (c.width !== w) { c.width = w; c.height = h; }
  if (!H.run) return; const R_ = H.run.recs, X = (i) => i / (R_.length - 1) * w; g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  const sp = (q) => Math.hypot(q.vcom[0], q.vcom[2]), vmax = Math.max(0.5, ...R_.map(r => Math.max(sp(r.A), sp(r.B))));
  for (const [key, col] of [["A", "#39d0f0"], ["B", "#f060e0"]]) { g.strokeStyle = col; g.beginPath(); R_.forEach((r, i) => { const y = h - 4 - sp(r[key]) / vmax * (h * 0.55); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); }
  R_.forEach((r, i) => { if (!r.inter.length) return; const d = Math.max(...r.inter.map(q => q.depth)); g.fillStyle = d > -0.0005 ? "#ff4040" : "#c08020"; const hh = d > -0.0005 ? 10 + Math.min(20, d * 1000 * 4) : 5; g.fillRect(X(i), 2, Math.max(1, w / R_.length), hh); });
  g.fillStyle = "#aaa"; g.font = "10px ui-monospace, Menlo, monospace"; g.fillText(`A↔B contact (red touching, amber speculative) · COM speed A (cyan) / B (magenta), max ${vmax.toFixed(2)} m/s`, 6, h - 6);
  g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(X(H.i), 0); g.lineTo(X(H.i), h); g.stroke(); }
function renderSideD() { const r = H.run, f = (x) => x == null ? "-" : x, row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`, T = TD(H.testD), C = r.contact, inv = C.invariant;
  let h = (isD6() ? renderSideD6() : "") + `<h3>${T.title}</h3><div class="small">Gate D (vertical slice): two complete V1.1 characters in ONE Jolt world (28 bodies, 26 joints). Each has its own sensing, balance, stepping and motors and sees the other only as an unknown external body. Physics is the only coupling; nothing here decides a football outcome.</div><table>`;
  h += row("B relative to A", `${T.B.map(v => v.toFixed(2)).join(", ")} m (both face +z)`) + row("action", T.A.push ? `push on A: ${T.A.push.Ns} N·s ${T.A.push.dir} at ${T.A.push.at} s (pelvis)` : T.A.requests ? `A: C2 placement ${T.A.requests.map(q => `${q.foot} ${q.forward * 100} cm fwd`).join(", ")}` : "none");
  h += row("contact", C.any ? `first manifold ${C.firstT} s (${C.firstPair}) · first TOUCH ${f(C.firstTouchT)} s (${f(C.firstTouchPair)}) · deepest ${C.maxDepthMm} mm` : "none", C.maxDepthMm > 3);
  if (inv) { h += row("the invariant", `${inv.pair} closing at ${inv.closingBefore} m/s · arrested on step ${inv.arrestStep} (${inv.arrestVsTouch >= 0 ? "+" : ""}${inv.arrestVsTouch} vs geometric touch; Jolt's speculative contact acts when the gap would close within the step)`);
    h += `</table><table class="small"><tr><th>step</th><th>gap mm</th><th>v<sub>n</sub> m/s</th><th>Δv A</th><th>Δv B</th></tr>` + inv.series.map(q => `<tr${q.step === inv.arrestStep ? ' style="background:#402020"' : ""}><td>${q.step}</td><td>${f(q.gapMm)}</td><td>${q.vn}</td><td>${q.dvA}</td><td>${q.dvB}</td></tr>`).join("") + `</table><table>`; }
  if (r.init) h += row("slider start (initial condition)", `pelvis ${r.init.pelvis.join(", ")} · lead boot front x ${r.init.leadBootFrontX} m vs B's left boot x ${r.init.bLeftBootX} m · run-up NOT simulated`);
  for (const [nm, x] of [["A", r.A], ["B", r.Bres]]) h += row(`character ${nm}`, `<b>${x.slide ? `SLIDE: ${x.slide.startSpeed} m/s start, ${x.slide.travelM} m, stopped at ${x.slide.stopT} s (joint targets from the reference; orientation and path are physics)` : x.fell ? "FELL" : "UPRIGHT"}</b> (final ${x.finalCls})${x.step ? ` · step ${x.step.foot}: ${x.step.status}${x.step.fail ? " — " + x.step.fail : ""}` : x.refused ? " · no step: " + x.refused : ""}${x.request ? ` · request ${x.request.foot}: ${x.request.status}` : ""}<br><span class=small>trunk max ${x.trunkMaxDeg}° · pelvis residual ≤ ${x.maxRootResN} N (no hidden support) · joint sep ≤ ${x.maxJointSepMm} mm · turf ≤ ${x.maxTurfPenMm} mm</span>`, x.maxRootResN > 5);
  h += row("contact pairs", `<span class=small>${Object.entries(C.pairs).map(([k, v]) => `${k}: ${v.touchSteps} touching / ${v.manifoldSteps} manifold steps, deepest ${v.maxMm} mm`).join("<br>") || "-"}</span>`);
  const node = d6Node(H.testD) || (H.suiteD && H.suiteD.results.find(q => q.test === H.testD));   // D6 tests: the D6 diagnostic matrix (current code) first
  h += row("state hash", `${r.hash} ${node ? (node.hash === r.hash ? "<span class=ok>= Node</span>" : `<span class=bad>≠ Node ${node.hash}</span>`) : ""}`) + row("CPU", `${r.cpu.msPerFrame} ms per 60 Hz frame (both characters, browser)`) + `</table>`;
  if (H.suiteD) h += `<h3>D suite (Node, same WASM, ×3)</h3><table><tr><th>test</th><th>first touch</th><th>deepest</th><th>A</th><th>B</th><th>det</th></tr>` + H.suiteD.results.map(q => `<tr><td>${q.test}</td><td>${q.contact.firstTouchPair ? q.contact.firstTouchPair.replace(/A\.|B\./g, "") : "-"}</td><td>${q.contact.maxDepthMm} mm</td><td class="${q.A.fell ? "bad" : "ok"}">${q.A.slide ? "slide" : q.A.fell ? "fell" : "up"}</td><td class="${q.Bres.fell ? "bad" : "ok"}">${q.Bres.fell ? "fell" : "up"}</td><td>${q.deterministic ? "✓" : "✗"}</td></tr>`).join("") + `</table>`;
  $("side").innerHTML = h; }
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
// ── D6 DIAGNOSTIC (D6_slide + the D6X matrix): the struck player's causal chain — live from pc_d6diag (the same measurement code as
// tools/d6x_run.js), plus the Node matrix JSON for the instrumented twin's EXACT contact force / momentum ledger (JoltPhysics.js exposes no
// contact impulses; see pc_d6diag.js) ──────────────────────────────────────────────────────────────────────────────────────────────
const d6Node = (k) => H.d6x && H.d6x.results ? H.d6x.results.find(q => q.test === k) : null;
const d6Force = (t) => { const n = d6Node(H.testD), s = n && n.forceSeries; if (!s) return null; const i = Math.round((t - s.t0) / s.dt); return i >= 0 && i < s.F.length ? { F: s.F[i], turf: s.turf[i] } : null; };
function drawD6(d, labels) { const O = H.ov, b = d.B, c = b.com, cg = [c[0], 0.004, c[2]], hs = (v) => Math.hypot(v[0], v[2]);
  if (O.c_region && b.region && b.region.length >= 3) { polyLine(b.region, [0.3, 1, 0.5, 1]);
    labels.push([G2(b.region[0], 0.01), `B support region · ξ margin ${b.xiM > -999 ? (b.xiM * 100).toFixed(1) + " cm" : "— (no support polygon)"}`, b.xiM > 0.015 ? "#8cf0a0" : b.xiM > -0.05 ? "#ffd070" : "#ff7070"]); }
  if (O.c_com) { cross3(cg, 0.03, [1, 0.35, 0.9, 1]); L(c, cg, [1, 0.35, 0.9, 0.5]); L(c, V.add(c, V.sc(b.vcom, 0.5)), [1, 0.5, 1, 1]); if (hs(b.vcom) > 0.03) labels.push([V.add(c, V.sc(b.vcom, 0.5)), `B COM ${hs(b.vcom).toFixed(2)} m/s`, "#ff90ff"]); }
  if (O.c_xi) { const x = [b.xi[0], 0.006, b.xi[1]]; ring(x, 0.035, [0.2, 1, 1, 1]); L(cg, x, [0.2, 1, 1, 0.8]); labels.push([x, "ξ", "#60ffff"]); }
  if (O.c_cop) { if (b.cop) cross3([b.cop[0], 0.008, b.cop[1]], 0.03, [1, 1, 1, 1]); if (b.pStar) ring([b.pStar[0], 0.01, b.pStar[1]], 0.02, [0.3, 0.7, 1, 1]); }
  if (O.c_feet) for (const s of ["L", "R"]) { const f = b.feet[s], col = FOOT_COL[f.st] || [1, 1, 1, 1], base = [f.pos[0], f.pos[1] + 0.12, f.pos[2]], top = V.add(base, [0, Math.max(0, f.load) / 800 * 0.4, 0]);
    if (f.sole) polyLine([0, 1, 3, 2].map(q => f.sole[q]), [col[0], col[1], col[2], 0.8], 0.003); L(base, top, col);
    labels.push([V.add(top, [0, 0.02, 0]), `${s === "L" ? "struck L" : "far R"} ${f.st} ${f.load.toFixed(0)} N${f.slip ? " · SLIP" : ""}`, f.slip ? "#ff6060" : "#c8f0c8"]); }
  if (O.impulse && d.pairs.length) { const fz = d6Force(d.t), F = fz && fz.F, len = F ? Math.hypot(...F) : 0;
    for (const p of d.pairs.slice(0, 3)) { const dir = F && len > 1 ? V.sc(F, 1 / len) : p.n, sc = F ? Math.min(0.6, len * 0.00025) : 0.12; L(V.sub(p.p, V.sc(dir, sc)), p.p, [1, 0.25, 0.25, 1]); cross3(p.p, 0.02, [1, 0.25, 0.25, 1]); }
    labels.push([d.pairs[0].p, `${d.pairs[0].a} → ${d.pairs[0].b} @ ${d.pairs[0].y.toFixed(2)} m${F ? ` · A→B ${hs(F).toFixed(0)} N horiz. (twin)` : ""}`, "#ff8080"]); } }
// chart 2 (D6): contact force A→B and turf→B (twin, exact) · foot loads (struck L / far R; slip and air shaded) · ξ margin + classification band
function drawChart2D6() { const c = $("chart2"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (!w) return; if (c.width !== w) { c.width = w; c.height = h; }
  const R_ = H.diag.rec, n = R_.length, X = (i) => i / (n - 1) * w, h1 = Math.round(h * 0.34), h2 = Math.round(h * 0.33), y3 = h1 + h2, h3 = h - y3; g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  g.font = "10px ui-monospace, Menlo"; const node = d6Node(H.testD), s = node && node.forceSeries;
  if (s) { const fmax = Math.max(500, ...s.F.map(f => f ? Math.hypot(f[0], f[2]) : 0)), idx = (i) => Math.round((R_[i].t - s.t0) / s.dt);
    for (const [key, col] of [["turf", "#50d070"], ["F", "#ff5050"]]) { g.strokeStyle = col; g.beginPath(); for (let i = 0; i < n; i++) { const k = idx(i), v = k >= 0 && k < s[key].length && s[key][k] ? Math.hypot(s[key][k][0], s[key][k][2]) : 0, y = h1 - 1 - Math.min(1, v / fmax) * (h1 - 12); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); } g.stroke(); }
    g.fillStyle = "#9aa0a6"; g.fillText(`contact force A→B (red) · turf→B (green), horizontal — instrumented twin, exact · max ${fmax.toFixed(0)} N`, 6, 10); }
  else { g.fillStyle = "#9aa0a6"; g.fillText("contact force: no Node matrix entry for this test (run tools/d6x_run.js)", 6, 10); }
  const lmax = Math.max(800, ...R_.map(q => Math.max(q.B.feet.L.load, q.B.feet.R.load)));
  for (let i = 0; i < n; i++) { const q = R_[i].B.feet; if (q.L.slip) { g.fillStyle = "#ff303033"; g.fillRect(X(i), h1, Math.max(1, w / n), h2); } if (!q.R.touch) { g.fillStyle = "#3080ff33"; g.fillRect(X(i), h1, Math.max(1, w / n), h2); } }
  for (const [side, col] of [["L", "#ffa040"], ["R", "#40c8ff"]]) { g.strokeStyle = col; g.beginPath(); for (let i = 0; i < n; i++) { const y = h1 + h2 - 1 - Math.max(0, R_[i].B.feet[side].load) / lmax * (h2 - 12); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); } g.stroke(); }
  g.fillStyle = "#9aa0a6"; g.fillText(`foot load: struck L (orange) · far R (cyan), max ${lmax.toFixed(0)} N · red = struck foot SLIPPING · blue = far foot off the turf`, 6, h1 + 10);
  const xm = (v) => y3 + 4 + (0.2 - Math.max(-0.3, Math.min(0.2, v))) / 0.5 * (h3 - 12); g.strokeStyle = "#555"; g.beginPath(); g.moveTo(0, xm(0)); g.lineTo(w, xm(0)); g.stroke();
  g.strokeStyle = "#e0e0e0"; g.beginPath(); for (let i = 0; i < n; i++) { const v = R_[i].B.xiM, y = xm(v <= -999 ? -0.3 : v); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); } g.stroke();
  for (let i = 0; i < n; i++) { g.fillStyle = CLS_COL[R_[i].B.cls] || "#888"; g.fillRect(X(i), h - 5, Math.max(1, w / n), 5); if (R_[i].B.stage && !["STAND", "IDLE"].includes(R_[i].B.stage)) { g.fillStyle = "#b080ff"; g.fillRect(X(i), h - 9, Math.max(1, w / n), 3); } }
  g.fillStyle = "#9aa0a6"; g.fillText("B capture-point margin ξ (white; 0 = support edge, −30 cm clipped) · classification band (bottom) · stepping (violet)", 6, y3 + 10);
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h); }
const f1 = (x, d = 1) => x == null || !Number.isFinite(+x) ? "-" : (+x).toFixed(d);
function cursorD6() { const el = $("d6cur"); if (!el || !H.diag) return; const d = H.diag.rec[H.i]; if (!d) return; const b = d.B, J_ = b.joints, fz = d6Force(d.t);
  const jr = (n, lab, ax) => { const j = J_[n]; if (!j) return ""; const one = !Array.isArray(j.a), a = one ? j.a : j.a[ax], tq = one ? j.tq : j.tq[ax], sp = one ? j.spr : j.spr[ax], dm = one ? j.dmp : j.dmp[ax];
    return `<tr><td>${lab}</td><td>${f1(a)}°</td><td>${f1(tq, 0)}</td><td class="${j.sat >= 0.98 ? "bad" : ""}">${f1(j.sat * 100, 0)} %</td><td>${f1(sp, 0)} / ${f1(dm, 0)}</td></tr>`; };
  el.innerHTML = `t ${d.t.toFixed(3)} s · B <b style="color:${CLS_COL[b.cls] || "#fff"}">${b.cls}</b>${b.frozen ? " (FROZEN — diagnostic)" : ""}${b.stage && b.stage !== "STAND" ? " · C3 " + b.stage : ""}${b.refused ? " · C3 refused: " + b.refused : ""}<br>`
    + `contact ${d.pairs.length ? d.pairs.map(p => `${p.a}→${p.b} @${p.y.toFixed(2)} m`).join(", ") : d.spec ? "speculative only" : "none"}${fz && fz.F ? ` · A→B ${Math.hypot(fz.F[0], fz.F[2]).toFixed(0)} N, turf→B ${fz.turf ? Math.hypot(fz.turf[0], fz.turf[2]).toFixed(0) : "-"} N (twin)` : ""}<br>`
    + `struck L ${b.feet.L.st} ${b.feet.L.load} N${b.feet.L.slip ? " SLIP" : ""} · far R ${b.feet.R.st} ${b.feet.R.load} N · ξ margin ${b.xiM > -999 ? f1(b.xiM * 100) + " cm" : "no support"} · COM ${f1(Math.hypot(b.vcom[0], b.vcom[2]), 2)} m/s · trunk ${f1(b.trunk)}°`
    + `<table><tr><th>struck leg</th><th>angle</th><th>τ N·m</th><th>sat</th><th>spring / damping N·m</th></tr>${jr("ankle_L", "ankle roll (Z)", 2)}${jr("knee_L", "knee flexion", 0)}${jr("hip_L", "hip ad/abduction (Z)", 2)}${jr("hip_L", "hip flex/ext (Y)", 1)}${jr("hip_R", "far hip ad/abd (Z)", 2)}</table>`; }
function renderSideD6() { const S = H.diagSum, n = d6Node(H.testD), row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`;
  let h = `<h3>D6 diagnostic — ${H.testD}</h3><div class="small">${TD(H.testD).title}. Everything below is MEASURED from the solved bodies (pc_d6diag); the response label is a description of those measurements, never an input.</div>`;
  h += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">${D6X_COMPARE.map(([k, lab]) => `<button onclick="D6_PICK('${k}')" style="background:${k === H.testD ? "#f0c060" : "#262a30"};color:${k === H.testD ? "#111" : "#e6e4df"};border:1px solid #2e3238;border-radius:4px;padding:2px 6px;font:11px -apple-system,system-ui;cursor:pointer">${lab}</button>`).join("")}</div><table>`;
  if (!S) return h + "</table>";
  const C = S.contact, M = n && n.momentum, Fe = S.feet, Bo = S.body;
  h += row("observed response", `<b>${S.outcome}</b>${n && n.twin && n.twin.outcome !== S.outcome ? `<br><span class=small>instrumented twin (Node): ${n.twin.outcome} — this case sits on a decision boundary</span>` : ""}`, /fall/.test(S.outcome));
  h += row("1 · contact", C.pair ? `${C.pair} at ${f1(C.heightM, 2)} m (${C.where}) · slider ${f1(C.aSpeed, 2)} m/s at touch · first touch ${f1(C.firstTouchT, 3)} s · bodies hit: ${C.bodiesHit.join(", ")} · deepest ${f1(C.maxDepthMm)} mm` : "none");
  if (M) { const Wn = M.windows, wr = (k) => `<tr><td>${k}</td><td>${f1(Wn[k].AtoB[0])}</td><td>${f1(Wn[k].AtoB[2])}</td><td>${f1(Wn[k].turfToB[0])}</td><td>${f1(Wn[k].turfToB[1])}</td></tr>`;
    const twinNote = n.twin && n.twin.outcome !== S.outcome ? `<br><span class=small>⚠ the instrumented twin took the other branch (${n.twin.outcome}): its ledger after the first ~100 ms describes that branch</span>` : "";
    h += row("2 · contact impulse (twin, exact)", `peak ${M.peakForceN} N at +${M.peakAtMs} ms · high force (> 25 % of peak) for ${M.highForceMs ?? "-"} ms<br><table class=small><tr><th>window</th><th>A→B x</th><th>A→B z</th><th>turf→B x</th><th>turf→B y</th></tr>${Object.keys(Wn).map(wr).join("")}</table>`);
    h += row("momentum transfer", `slider ${M.A.atTouch} N·s at touch → ${M.A.after100} (+100 ms) → ${M.A.after250} (+250 ms) → ${M.A.after500} (+500 ms) · B's whole-body peak ${M.BpeakMomentum} N·s (COM ${f1(M.BpeakComSpeed, 2)} m/s): B's feet hand the rest to the turf${twinNote}`); }
  h += row("3 · struck foot", `slid ${f1(Fe.struckSlideCm)} cm (peak ${f1(Fe.struckPeakSpeed, 2)} m/s, SLIPPING ${Fe.struckSlipMs} ms, off the turf ${Fe.struckAirMs} ms) · peak load ${Fe.struckPeakLoadN} N (before: L ${Fe.preLoad.L} / R ${Fe.preLoad.R} N) · far foot off the turf ${Fe.farAirMs} ms, moved ${f1(Fe.farMovedCm)} cm`);
  h += row("4 · joints (first 150 ms)", `<table class=small><tr><th>joint</th><th>excursion °</th><th>peak rate °/s</th><th>peak τ N·m</th><th>sat steps</th><th>spring / damping N·m</th></tr>${Object.entries(S.joints).map(([k, j]) => `<tr><td>${k} ${j.axes.join("/")}</td><td>${j.excursionDeg.join(" / ")}</td><td>${j.peakRateDegS.join(" / ")}</td><td>${j.peakTorqueNm.join(" / ")}</td><td>${j.satSteps}</td><td>${j.peakSpringNm.join(" / ")} · ${j.peakDampingNm.join(" / ")}</td></tr>`).join("")}</table>`);
  h += row("5 · whole body", `COM peak ${f1(Bo.comPeakSpeed, 2)} m/s at ${f1(Bo.comPeakT, 3)} s · moved ${f1(Bo.comMovedCm)} cm · dropped ${f1(Bo.comDropCm)} cm · trunk ≤ ${f1(Bo.trunkMaxDeg)}° · |L| horizontal ≤ ${f1(Bo.Lpeak)} kg·m²/s · ξ min ${f1(Bo.xiMinCm)} cm (outside ${Bo.xiOutsideMs} ms${Bo.noSupportMs ? `, no support polygon ${Bo.noSupportMs} ms` : ""})`, /fall/.test(S.outcome));
  h += row("6 · classification", S.classes.map(c => `<span style="color:${CLS_COL[c.state] || "#fff"}">${f1(c.t, 3)} ${c.state}</span>${c.why ? ` <span class=small>(${c.why})</span>` : ""}`).join("<br>"));
  h += row("7 · C3 stepping", (S.stepper.length ? S.stepper.map(e => `${f1(e.t, 3)} ${e.kind}: ${e.what}`).join("<br>") : "no step decision") + (S.refused ? `<br><span class=small>refused: ${S.refused}</span>` : ""));
  h += `</table><h3>at the cursor</h3><div id="d6cur" class="small"></div>`;
  if (H.d6x) h += `<h3>D6 diagnostic matrix (Node ×3, deterministic; twin = instrumented run)</h3><table class=small><tr><th>test</th><th>response</th><th>arrive m/s</th><th>contact</th><th>A→B 35 ms / total N·s</th><th>foot cm</th><th>COM m/s</th><th>twin</th></tr>` + H.d6x.results.map(q => { const m = q.momentum;
      return `<tr style="cursor:pointer;${q.test === H.testD ? "background:#3a3320" : ""}" onclick="D6_PICK('${q.test}')"><td>${q.test}</td><td class="${/fall/.test(q.outcome) ? "bad" : /step/.test(q.outcome) ? "" : "ok"}">${q.outcome}</td><td>${f1(q.contact.aSpeed, 1)}</td><td>${q.contact.pair ? q.contact.pair.replace("foot_R → ", "") + " @" + f1(q.contact.heightM, 2) : "-"}</td><td>${m ? f1(m.windows["−10–35 ms"].AtoB[0], 0) + " / " + f1(Object.values(m.windows).reduce((s, w) => s + w.AtoB[0], 0), 0) : "-"}</td><td>${f1(q.feet.struckSlideCm, 0)}</td><td>${f1(q.body.comPeakSpeed, 2)}</td><td class=small>${q.twin.outcome === q.outcome ? "=" : q.twin.outcome}</td></tr>`; }).join("") + `</table>`;
  return h; }
// ── GATE G1a: the NEW locomotion stack (pc_loco: gait / support state · viability monitor · actuator arbiter · delayed views) ───────────
// Scene: C1's balance overlays + planned vs actual footholds, the monitor's PROSPECTIVE support, the swing target / path / trace, unknown
// geometry (slab, box), each foot's gait ROLE (truth-overridden), the arbiter's yields / saturations, and (option) the delayed views.
// Charts: the gait diagram (roles L / R, support mode, monitor verdict, events) and the ARBITER of the selected joint axis over time.
const ROLE_COL = { STANCE: "#3a7d44", UNLOADING: "#f0c060", SWING: "#5ad0ff", DESCENDING: "#3a70ff", LOADING: "#b890ff", OBSTRUCTED: "#ff5a5a", AIR_UNPLANNED: "#ff9a30" };
const SUP_COL = { DOUBLE: "#6b7078", SINGLE_L: "#2f8f8f", SINGLE_R: "#2f8f8f", FLIGHT: "#ff5a5a", NON_FOOT: "#a02020" };
const MON_COL = { NOMINAL: "#5ad08a", STEPPING: "#5ad0ff", WAIT_VIEW: "#9aa0a6", MODIFIED: "#ff9a30", SEQUENCE: "#ff9a30", STEP_NEEDED: "#ff9a30", NO_CAPTURE_FOUND: "#ff5a5a", PHYSICAL: "#ff5a5a" };
const G1_CRIT = { S1_stance: ["S1"], S2_transfer: ["S2"], S2b_transfer: ["S2b"], S2x_twice: ["S2x"], S3_place: ["S3"], S4_steps10: ["S4", "S10"], S7a_swingPush: ["S7a"], S7b_stancePush: ["S7b"], S7c_swingPush30: ["S7c"], S7d_stancePush30: ["S7d"],
  S8_styleConflict: ["S8"], S8n_naive: ["S8"], S9_internal: ["S9"], S9d_damped: ["S9"], S11a_earlyTurf: ["S11a"], S11b_obstacle: ["S11b"], S11c_toeCatch: ["S11c"] };
// the compact G1 REVIEW: the most informative cases, each with its comparison ghost, camera and chart (notes: physical / human-likeness)
const G1_REVIEW = [
  { id: "steps", label: "1 · 10 in-place steps", test: "S4_steps10", cam: "front", chart: "yaw", note: '<b>Physical:</b> 10/10 landed, touchdowns +12…17 ms against plan, footholds ≤ 3.3 cm, stance slip ≤ 0.02 cm, ledger closed. <b>Looks:</b> robotic marching in place — a 7 cm flat-footed vertical foot lift, little knee bend, a bolt-upright rigid trunk, arms hanging motionless, head fixed; the pelvis yaws up to ±12° (chart: pelvis yaw), growing over the ten steps. Nothing here resembles human stepping yet (no arm swing, no heel–toe, no trunk counter-rotation).' },
  { id: "transfer", label: "2 · transfer + one step", test: "S3a_transferStep", cam: "side", chart: "grf", note: "<b>Physical:</b> C2's transfer opens the liftoff gate at 1.17 s (C2 1.196 s); the R foot is placed 2.2 cm from the request and accepted; the vertical-force chart shows the load moving between feet. <b>Looks:</b> slow and statue-like — the approved C2 placement hovers and lowers for 1.5 s; a person takes this step in about half a second with a trunk and arm counterbalance." },
  { id: "push", label: "3 · push in swing", test: "S7a_swingPush", cmp: { key: "S4_steps10", label: "no push" }, cam: "front", chart: "xi", note: '<b>Physical:</b> 15 N·s at mid-swing; the next footholds move (5.2 cm) and he keeps stepping (compare ξ with the no-push ghost). <b>Looks:</b> the reaction is almost invisible — no arm or trunk response; a person would show a clear lateral catch.' },
  { id: "early", label: "4 · early touchdown", test: "S11a_earlyTurf", cmp: { key: "S11f_flatStep", label: "flat turf" }, cam: "side", chart: "grf", note: '<b>Physical:</b> the foot meets 2.5 cm of raised turf 108 ms early, 8 cm short of plan; the contact is the touchdown at that instant (banner), roles and phase re-synchronise, he stays up. The ghost is the same step on flat turf. <b>Looks:</b> a short, careful step; the early contact produces no visible stumble.' },
  { id: "obstacle", label: "5 · obstacle", test: "S11b_obstacle", cmp: { key: "S11f_flatStep", label: "flat turf" }, cam: "side", chart: "xiz", note: '<b>Physical:</b> the swing foot hits the 16 cm box, the gait layer flags OBSTRUCTION at the contact, the executor stops the swing 50 ms later and sets the foot down in front of the box (0.9 mm penetration, no pass-through). <b>Looks:</b> correct outcome, but the stop is abrupt and the body gives no trip reaction.' },
  { id: "sat", label: "6 · saturation", test: "S8_styleConflict", cmp: { key: "S8n_naive", label: "no arbitration" }, cam: "side", chart: "com", jsel: "knee_L", note: '<b>Physical:</b> a deep-crouch style request fights the stance legs; the arbiter admits 1 % of it and support is realised at 96 % (COM chart: flat). The magenta ghost is the SAME request without arbitration: it sags 11.7 cm and releases. <b>Looks:</b> the arbitrated body simply ignores the style — correct priority, no visible compromise.' },
  { id: "latency", label: "7 · latency 50 vs 100 ms", test: "S5_F80", main: { loco: { delayFb: 0.05, delayPlan: 0.12 } }, cmp: { key: "S5_F80", opts: { loco: { delayFb: 0.1, delayPlan: 0.17 } }, label: "100 / 170 ms" }, cam: "side", chart: "com", note: '<b>Physical:</b> 80 N·s forward. At 50/120 ms he bends sharply at the hips, then lunges a corrective step (foothold 19.6 cm off) and recovers; the ghost at 100/170 ms steps too late (MISSED ground) and falls. At 0/0 ms the same push is a clean step (2.5 cm). <b>Looks:</b> the hip jackknife before the step is exaggerated; the fall is plausible.' },
  { id: "rate", label: "8 · 240 vs 480 Hz", test: "S4_steps10", cmp: { key: "S4_steps10", opts: { sub: 2 }, label: "480 Hz physics" }, cam: "front", chart: "grf", note: '<b>Physical:</b> the 480 Hz ghost lies on the 240 Hz body — the same landing: contact time, approach speed, COM low point and loading time identical; the impulse agrees within 3 % over 100 ms and 0.3 % over 200 ms. Only the first ~50 ms of the impact is shaped differently (chart: vertical force peak 1.2 kN at 240 Hz vs 1.7 kN at 480 Hz — impact peaks never converge for rigid contact).' } ];
function g1ReviewApply(id) { const c = G1_REVIEW.find(q => q.id === id); H.g1review = c ? id : null; H.g1main = c && c.main ? c.main : null; H.g1cmp = c && c.cmp ? c.cmp : null; if (!c) return;
  H.testG1 = c.test; if (c.chart) { H.g1chart = c.chart; const el = $("g1chart"); if (el) el.value = c.chart; } if (c.jsel) { H.jsel = c.jsel; $("jsel").value = c.jsel; } if (c.cam) { const p = PRESETS[c.cam]; H.cam.az = p[0]; H.cam.el = p[1]; H.cam.dist = p[2]; } }
window.G1_REVIEW_PICK = (id) => { if (!isG1()) setSuite("G1"); g1ReviewApply(id); $("drop").value = H.testG1; simulate(); };
const g1i = (t) => Math.max(0, Math.min(H.run.recs.length - 1, Math.round(t * hz()) - 1));
function prepG1() { const R_ = H.run.recs, spec = H.spec, fI = { L: spec.bodies.findIndex(b => b.name === "foot_L"), R: spec.bodies.findIndex(b => b.name === "foot_R") }, box = spec.bodies[fI.L].shapes[0], ev = H.run.gaitEvents || [];
  const cen = (st) => { const c = V.add(st.pos, Q.rot(st.rot, box.pos)); return [c[0], c[2]]; }, idx = (p) => { const i = R_.findIndex(p); return i < 0 ? 0 : i; }, first = (p) => { const e = ev.find(p); return e ? g1i(e.t) : 0; };
  H.g1box = box; H.g1fI = fI; H.g1curI = -1;
  H.g1steps = H.run.steps.filter(s => s.tdT != null).map(s => { const i = g1i(s.tdT), r = R_[i], st = r.states[fI[s.sw]]; return { sw: s.sw, kind: s.kind, tdT: s.tdT, i, actual: cen(st), yaw: yawOfQ(st.rot), planned: r.exec && r.exec.planned && r.exec.planned.center ? r.exec.planned.center : null, err: s.footholdErrCm }; });
  H.run.worst = { push: idx(r => r.push), liftoff: first(e => e.kind === "LIFTOFF"), touchdown: first(e => e.kind === "TOUCHDOWN"), event: first(e => e.early || e.kind === "OBSTRUCTION"), corrective: idx(r => r.exec && r.exec.kind === "corrective"),
    yield: idx(r => r.arb && r.arb.some(e => e.yielded && e.yielded.length)), sat: idx(r => r.satN > 0), falling: idx(r => r.mon.state === "FALLING"), grounded: idx(r => r.nonFootGround) }; }
const jointAnchor = (S, j) => { const P = S[j.parentIndex], pb = H.spec.bodies[j.parentIndex]; return V.add(P.pos, Q.rot(P.rot, V.sub(j.at, pb.origin))); };
function drawG1(rec, S, labels) { const O = H.ov, spec = H.spec, box = H.g1box, R_ = H.run.recs, fp = (c, yaw, col, y) => polyLine(footprint(box, c, yaw), col, y); if (isG2()) drawG2(rec, S, labels);
  if (O.g_env && rec.obstacles) for (const o of rec.obstacles) { const slab = o.kind === "slab"; wireShape({ pos: o.pos, rot: [0, 0, 0, 1] }, { type: "box", he: o.he, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, slab ? [0.85, 0.75, 0.45, 1] : [1, 0.3, 0.3, 1]);
    labels.push([V.add(o.pos, [0, o.he[1] + 0.02, 0]), slab ? `raised turf ${(o.he[1] * 200).toFixed(1)} cm — unknown to the plan` : `box ${(o.he[1] * 200).toFixed(0)} cm — unknown to the plan`, slab ? "#e0d0a0" : "#ff8080"]); }
  if (O.g_fp) { for (const q of H.g1steps || []) { if (q.i > H.i) continue; const recent = H.i - q.i < 0.6 * hz(), a = recent ? 1 : 0.35;
      fp(q.actual, q.yaw, [0.2, 0.9, 1, a], 0.016); if (q.planned) { fp(q.planned, q.yaw, [1, 0.55, 0.1, a * 0.9], 0.013); if (recent) L(G2(q.planned, 0.015), G2(q.actual, 0.017), [1, 1, 1, 0.8]); }
      if (recent) labels.push([G2(q.actual, 0.03), `${q.sw} ${q.kind} landed · ${q.err != null ? q.err + " cm from plan" : ""}`, "#60e0ff"]); }
    const e = rec.exec; if (e && e.planned && e.planned.center && ["SWING", "DESCEND", "OBSTRUCTED", "ACCEPT"].includes(e.stage)) { const st = S[H.g1fI[e.sw]]; fp(e.planned.center, yawOfQ(st.rot), [1, 0.55, 0.1, 1], 0.014);
      labels.push([G2(e.planned.center, 0.02), `planned ${e.sw} foothold · touchdown ${e.planned.t != null ? e.planned.t.toFixed(3) + " s" : "-"}`, "#ffb060"]); } }
  if (O.g_prosp && rec.prosp && rec.prosp.length >= 3) { polyLine(rec.prosp, [0.35, 0.75, 1, 0.9], 0.009); labels.push([G2(rec.prosp[0], 0.012), `prospective support (monitor) · beyond ${rec.mon.beyond != null ? (rec.mon.beyond * 100).toFixed(1) + " cm" : "-"}`, "#80c0ff"]); }
  if (O.g_swing && rec.exec && rec.swingTgt) { const e = rec.exec, key = e.planned ? e.planned.t : null, fi = H.g1fI[e.sw]; let a = H.i, b = H.i;
    while (a > 0 && R_[a - 1].exec && R_[a - 1].exec.sw === e.sw && R_[a - 1].exec.planned && R_[a - 1].exec.planned.t === key && R_[a - 1].swingTgt) a--;
    while (b < R_.length - 1 && R_[b + 1].exec && R_[b + 1].exec.sw === e.sw && R_[b + 1].exec.planned && R_[b + 1].exec.planned.t === key && R_[b + 1].swingTgt) b++;
    let prev = null; for (let q = a; q <= b; q++) { const p = R_[q].swingTgt.pos; if (prev) L(prev, p, [1, 0.9, 0.2, 0.9]); prev = p; } prev = null;
    for (let q = a; q <= H.i; q++) { const p = R_[q].states[fi].pos; if (prev) L(prev, p, [0.2, 0.9, 1, 1]); prev = p; } cross3(rec.swingTgt.pos, 0.025, [1, 0.9, 0.2, 1]); }
  if (O.g_roles) for (const s of ["L", "R"]) { const fi = H.g1fI[s], p = V.add(S[fi].pos, [0, -0.02, s === "L" ? -0.12 : -0.12]), role = rec.gait.role[s]; labels.push([p, `${s}: ${role}`, ROLE_COL[role] || "#ddd"]); }
  if (O.g_arb && rec.arb) rec.arb.forEach((e, k) => { const j = spec.joints[k], a1 = jointAnchor(S, j), sat = Array.isArray(e.sat) ? e.sat.some(Boolean) : e.sat;
    if (e.yielded && e.yielded.length) { const amt = e.yielded.reduce((t, y) => t + y.amt.reduce((u, x) => u + x, 0), 0); if (amt > 0.5) { ring([a1[0], a1[1], a1[2]], 0.03, [1, 0.3, 1, 1], a1[1]); labels.push([V.add(a1, [0.03, 0.02, 0]), `${j.name}: ${e.yielded.map(y => y.m).join(", ")} yielded ${amt.toFixed(0)} N·m`, "#ff80ff"]); } }
    if (sat) { cross3(a1, 0.035, [1, 0.1, 0.1, 1]); labels.push([V.add(a1, [0.03, -0.02, 0]), `${j.name} SATURATED (${e.owner})`, "#ff5050"]); } });
  if (O.g_views && rec.views) for (const [tv, col, nm] of [[rec.views.fb, [1, 0.85, 0.2, 0.9], "feedback view"], [rec.views.pl, [0.7, 0.7, 0.7, 0.9], "planning view"]]) { const r = R_[g1i(tv)] || R_[0], x = [r.xi[0], 0.007, r.xi[1]];
    ring(x, 0.028, col); labels.push([x, `ξ as the ${nm} sees it (${((rec.t - tv) * 1000).toFixed(0)} ms old)`, nm.startsWith("f") ? "#ffd860" : "#b0b0b0"]); }
  // COMPARISON run (G1 review): the other run's bodies as a magenta ghost at the same instant
  if (H.cmpRun) { const c = H.cmpRun.recs[Math.min(H.i, H.cmpRun.recs.length - 1)], col = [1, 0.3, 0.85, 0.55]; c.states.forEach((st, i) => { for (const sh of spec.bodies[i].shapes) wireShape(st, sh, col); }); skeleton(c.states, [1, 0.35, 0.9, 0.95]);
    labels.push([V.add(c.states[0].pos, [0, 0.35, 0]), `ghost: ${H.g1cmp.label} — ${c.mon.verdict}${c.nonFootGround ? " · ON THE TURF" : ""}`, "#ff80e0"]); } }
function statusG1(rec) { const g = rec.gait, m = rec.mon, e = rec.exec, f = rec.feet, arb = rec.arb || [], yl = arb.filter(a => a.yielded && a.yielded.length).length, sat = arb.reduce((a, q) => a + (Array.isArray(q.sat) ? q.sat.filter(Boolean).length : q.sat ? 1 : 0), 0);
  return `support ${g.support}   roles L ${g.role.L} · R ${g.role.R}   phase ${g.phase.toFixed(2)}   monitor ${m.state} · ${m.verdict}${m.reason ? " — " + m.reason.slice(0, 80) : ""}\n` +
    `executor ${e ? `${e.kind} ${e.sw} ${e.stage} u ${e.u != null ? e.u.toFixed(2) : "-"}` : "idle"}${rec.rhythm ? `   rhythm ${rec.rhythm.stage} ${rec.rhythm.i}` : ""}   views: feedback ${((rec.t - rec.views.fb) * 1000).toFixed(0)} ms old · planning ${((rec.t - rec.views.pl) * 1000).toFixed(0)} ms old\n` +
    `feet L ${f.L.state} ${f.L.load.toFixed(0)} N · R ${f.R.state} ${f.R.load.toFixed(0)} N   ξ margin ${rec.xiMargin < -1 ? "no support polygon" : (rec.xiMargin * 100).toFixed(1) + " cm"}   trunk ${rec.trunk.toFixed(1)}°   arbiter: ${yl} joint(s) yielding · ${sat} saturated axis(es)\n` +
    `external-impulse ledger this step: residual ${(rec.ledger.res * 1000).toFixed(2)} mN·s · turf ${rec.ledger.turf.map(v => v.toFixed(2)).join(", ")} N·s${V.len(rec.ledger.obst) > 1e-4 ? " · obstacle " + rec.ledger.obst.map(v => v.toFixed(2)).join(", ") : ""}${rec.push ? " · PUSH " + V.len(rec.push.J).toFixed(2) + " N·s" : ""} · no support fixture / root force`; }
function bannerG1(ov, rec, W) { const m = rec.mon, ev = (H.run.gaitEvents || []).filter(e => e.t <= rec.t + 1e-9 && rec.t - e.t < 0.3 && e.kind !== "LIFTOFF").pop();
  const txt = `${m.state.replace(/_/g, " ")} · ${m.verdict.replace(/_/g, " ")}`, y0 = 96; ov.font = "bold 16px -apple-system, system-ui, sans-serif"; const w = ov.measureText(txt).width;
  ov.fillStyle = "#000b"; ov.fillRect(W / 2 - w / 2 - 12, y0, w + 24, 26); ov.fillStyle = MON_COL[m.verdict] || "#fff"; ov.fillText(txt, W / 2 - w / 2, y0 + 19);
  if (ev) { const t2 = `${ev.kind} — ${ev.what}`.slice(0, 120); ov.font = "12px ui-monospace, Menlo, monospace"; const w2 = ov.measureText(t2).width; ov.fillStyle = "#000b"; ov.fillRect(W / 2 - w2 / 2 - 8, y0 + 30, w2 + 16, 18);
    ov.fillStyle = ev.kind === "OBSTRUCTION" ? "#ff7070" : ev.early ? "#60e0ff" : ev.kind === "TOUCHDOWN" ? "#ffffff" : "#ffb060"; ov.fillText(t2, W / 2 - w2 / 2, y0 + 43); } }
function drawChartG1() { const c = $("chart"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (!w) return; if (c.width !== w) { c.width = w; c.height = h; } if (!H.run) return;
  const R_ = H.run.recs, X = (i) => i / (R_.length - 1) * w, bw = Math.max(1, w / R_.length) + 0.5; g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  R_.forEach((r, i) => { g.fillStyle = ROLE_COL[r.gait.role.L] || "#444"; g.fillRect(X(i), 0, bw, 11); g.fillStyle = ROLE_COL[r.gait.role.R] || "#444"; g.fillRect(X(i), 13, bw, 11);
    g.fillStyle = SUP_COL[r.gait.support] || "#444"; g.fillRect(X(i), 26, bw, 5); g.fillStyle = MON_COL[r.mon.verdict] || "#444"; g.fillRect(X(i), 33, bw, 5); if (r.push) { g.fillStyle = "#ffff40"; g.fillRect(X(i) - 1, 0, 2, h); } });
  for (const e of H.run.gaitEvents || []) { const x = X(g1i(e.t)); g.fillStyle = e.kind === "OBSTRUCTION" ? "#ff4040" : e.kind === "TOUCHDOWN" ? (e.early ? "#60e0ff" : "#ffffff") : /LIFT/.test(e.kind) && e.kind !== "LIFTOFF" ? "#ff9a30" : e.kind === "LIFTOFF" ? "#9aa0a6" : "#b890ff"; g.fillRect(x - 1, 39, 2, h - 39); }
  g.fillStyle = "#cfd3d8"; g.font = "9px ui-monospace, Menlo"; g.fillText("L", 2, 9); g.fillText("R", 2, 22);
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h); }
function g1q(r, q) { if (q === "grf") return r.ledger.turf[1] * 240; if (q === "com") return r.com[1]; if (q === "xi") return r.xi[0]; if (q === "xiz") return r.xi[1]; if (q === "yaw") { const fz = Q.rot(r.states[0].rot, [0, 0, 1]); return Math.atan2(fz[0], fz[2]) * 57.2958; } return 0; }
const G1Q = { grf: ["vertical ground force", "N"], com: ["COM height", "m"], xi: ["capture point ξ, lateral", "m"], xiz: ["capture point ξ, fore–aft", "m"], yaw: ["pelvis yaw", "°"] };
function drawCmpChartG1(c, g, w, h) { const q = H.g1chart, R_ = H.run.recs, C_ = H.cmpRun ? H.cmpRun.recs : null, n = Math.max(R_.length, C_ ? C_.length : 0), X = (i) => i / (n - 1) * w;
  const a = R_.map(r => g1q(r, q)), b = C_ ? C_.map(r => g1q(r, q)) : [], lo = Math.min(...a, ...b), hi = Math.max(...a, ...b), pad = (hi - lo) * 0.08 + 1e-6, Y = (v) => h - 3 - (v - lo + pad) / (hi - lo + 2 * pad) * (h - 16);
  g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h); const line = (arr, col) => { g.strokeStyle = col; g.beginPath(); arr.forEach((v, i) => { i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); }); g.stroke(); };
  if (b.length) line(b, "#ff60e0"); line(a, "#5ad0ff"); g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h); const i = Math.min(H.i, R_.length - 1), j = C_ ? Math.min(H.i, C_.length - 1) : -1, d = q === "com" || q.startsWith("xi") ? 3 : 0;
  g.fillStyle = "#cfd3d8"; g.font = "10px ui-monospace, Menlo"; g.fillText(`${G1Q[q][0]} (${G1Q[q][1]}): this run (cyan) ${a[i].toFixed(d)}${C_ ? ` · ghost ${H.g1cmp.label} (magenta) ${b[j].toFixed(d)}` : ""}   [${lo.toFixed(d)} … ${hi.toFixed(d)}]`, 6, 10); }
function drawChart2G1() { const c = $("chart2"), g = c.getContext("2d"), w = c.clientWidth, h = c.clientHeight; if (!w) return; if (c.width !== w) { c.width = w; c.height = h; }
  if (H.run && isG2() && ["yawset", "lzset", "knees"].includes(H.g1chart)) return drawChartG2(c, g, w, h);
  if (H.run && H.g1chart && H.g1chart !== "arbiter") return drawCmpChartG1(c, g, w, h);
  if (!H.run || !H.run.recs[0].arb) return; const R_ = H.run.recs, k = H.spec.joints.findIndex(j => j.name === H.jsel), j = H.spec.joints[k], hinge = j.type === "hinge", ax = hinge ? 0 : H.comp === "t" ? 0 : H.comp === "z" ? 2 : 1;
  const v = (x) => x == null ? 0 : Array.isArray(x) ? x[ax] : (ax === 0 ? x : 0), E = R_.map(r => r.arb[k]), sum = (e, p, al) => e.terms.filter(p).reduce((a, t) => a + v(al && t.alw !== undefined ? t.alw : t.req), 0);
  const pred = E.map(e => v(e.pred)), real = E.map(e => v(e.real)), hold = E.map(e => sum(e, t => t.kind === "hold")), grav = E.map(e => sum(e, t => t.m === "gravity")), p1 = E.map(e => sum(e, t => t.c === "P1" && t.kind === "ff")), p3r = E.map(e => sum(e, t => t.c === "P3")), p3a = E.map(e => sum(e, t => t.c === "P3", true));
  const lo = E.map(e => v(e.env.lo)), hi = E.map(e => v(e.env.hi)), mx = Math.max(10, ...[...pred, ...real, ...hold, ...grav, ...p1, ...p3r].map(Math.abs)) * 1.15, X = (i) => i / (R_.length - 1) * w, Y = (x) => { const y = h / 2 + 6 - x / mx * (h / 2 - 8); return Math.max(12, Math.min(h - 1, y)); };
  g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h); g.strokeStyle = "#333"; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke();
  E.forEach((e, i) => { const y = (e.yielded || []).reduce((a, q) => a + (q.amt[ax] || 0), 0), s = Array.isArray(e.sat) ? e.sat[ax] : e.sat; if (y > 0.2) { g.fillStyle = "#ff40ff30"; g.fillRect(X(i), 12, Math.max(1, w / R_.length) + 0.5, h - 12); } if (s) { g.fillStyle = "#ff303050"; g.fillRect(X(i), 12, Math.max(1, w / R_.length) + 0.5, h - 12); } });
  const line = (arr, col, dash) => { g.strokeStyle = col; g.setLineDash(dash || []); g.beginPath(); arr.forEach((x, i) => { const y = Y(x); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); g.setLineDash([]); };
  line(lo, "#ff505080", [4, 4]); line(hi, "#ff505080", [4, 4]); line(hold, "#8a8f96"); line(grav, "#5ad08a"); line(p1, "#ff9a30"); line(p3r, "#ff60ff", [2, 3]); line(p3a, "#ff60ff"); line(pred, "#e8e8e8", [6, 3]); line(real, "#5ad0ff");
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h); const i = H.i, e = E[i], f0 = (x) => x.toFixed(0);
  g.fillStyle = "#cfd3d8"; g.font = "10px ui-monospace, Menlo";
  g.fillText(`${j.name}${hinge ? "" : " " + ["twist", "swing Y", "swing Z"][ax]} · owner ${e.owner} · spring ${f0(hold[i])} · gravity ${f0(grav[i])} · P1 ff ${f0(p1[i])} · P3 ${f0(p3r[i])}→${f0(p3a[i])} · allowed ${f0(pred[i])} · REALIZED ${f0(real[i])} N·m · envelope [${f0(lo[i])}, ${f0(hi[i])}]${(e.yielded || []).length ? " · YIELD " + e.yielded.map(y => y.m + " (" + y.why.filter(Boolean).join("/") + ")").join(", ") : ""}   [±${f0(mx)} N·m]`, 6, 10); }
function cursorG1() { const el = $("g1cur"); if (!el || H.g1curI === H.i || !H.run) return; H.g1curI = H.i; const r = H.run.recs[H.i]; if (!r.arb) return; const f0 = (x) => Array.isArray(x) ? `[${x.map(v => v.toFixed(0)).join(",")}]` : (+x).toFixed(0);
  el.innerHTML = `<table class=small><tr><th>joint</th><th>owner</th><th>requests (module: N·m, constraint axes)</th><th>allowed</th><th>realized</th><th>yield</th></tr>` + r.arb.map(e => `<tr><td>${e.joint}</td><td>${e.owner}</td><td>${e.terms.filter(t => (Array.isArray(t.req) ? Math.hypot(...t.req) : Math.abs(t.req)) > 0.5).map(t => `${t.m}${t.c ? "<sup>" + t.c + "</sup>" : ""} ${f0(t.req)}${t.alw !== undefined && JSON.stringify(t.alw) !== JSON.stringify(t.req) ? "→" + f0(t.alw) : ""}`).join("<br>")}</td><td>${f0(e.pred)}</td><td>${e.real != null ? f0(e.real) : "-"}</td><td class="${(e.yielded || []).length ? "bad" : ""}">${(e.yielded || []).map(y => y.m + " " + y.why.filter(Boolean).join("/")).join("<br>")}${(Array.isArray(e.sat) ? e.sat.some(Boolean) : e.sat) ? " SAT" : ""}</td></tr>`).join("") + `</table>`; }
function renderSideG1() { const r = H.run, T = TESTS_G1A[H.testG1], f = (x) => x == null ? "-" : x, row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`, node = H.g1 && H.g1.scenarios ? H.g1.scenarios[H.testG1] : null, crit = H.g1 && H.g1.criteria ? H.g1.criteria : [];
  const cRow = (c) => `<tr><td>${c.id}</td><td class="${c.pass === null ? "" : c.pass ? "ok" : "bad"}">${c.pass === null ? "obs" : c.pass ? "PASS" : "FAIL"}</td><td class=small>${c.criterion}<br><b>${c.measured}</b>${c.note ? "<br><i>" + c.note + "</i>" : ""}</td></tr>`;
  let h = `<h3>G1 review — the most informative cases</h3><div>${G1_REVIEW.map(c => `<button style="margin:2px 2px;${H.g1review === c.id ? "background:#f0c060;color:#111" : ""}" onclick="G1_REVIEW_PICK('${c.id}')">${c.label}</button>`).join("")}</div>` + (H.g1review ? `<div class="small" style="margin:6px 0;padding:6px;border:1px solid #444">${(G1_REVIEW.find(c => c.id === H.g1review) || {}).note || ""}</div>` : "");
  h += `<h3>${T.title}${H.g1main && H.g1main.loco ? ` — delays ${H.g1main.loco.delayFb * 1000}/${H.g1main.loco.delayPlan * 1000} ms` : ""}</h3><div class="small">Gate G1a: the NEW locomotion stack on the approved V1.1 body — gait / support state from contact truth, a viability monitor on a 120 ms planning view, the C1 balance law on a 50 ms feedback view, ONE actuator arbiter per joint axis (P0 support › P1 balance › P2 task › P3 style › P4 comfort), the turf as a force plate. No pelvis support, no root anchor, no state writes after t = 0.</div>`;
  const mine = crit.filter(c => (G1_CRIT[H.testG1] || (H.testG1.startsWith("S5_") ? ["S5"] : [])).includes(c.id)); if (mine.length) h += `<table>${mine.map(cRow).join("")}</table>`;
  h += `<table>` + row("outcome", `<b>${r.outcome}</b> · delays feedback ${r.delays.fb * 1000} ms / planning ${r.delays.pl * 1000} ms${r.push ? ` · push ${JSON.stringify(r.push)}` : ""}`, r.fell && !/S5_R55|S7c|S7d|S9/.test(H.testG1));
  h += row("whole body", `COM excursion ${r.whole.comExcursionCm} cm · drop ${r.whole.comDropCm} cm · trunk ≤ ${r.whole.trunkMaxDeg}°${r.whole.quiet && H.testG1 === "S1_stance" ? ` · quiet sway RMS ${r.whole.quiet.swayRmsMm} mm, drift ${r.whole.quiet.comDriftCm} cm` : ""}`);
  const Lg = r.ledger; h += row("external-impulse ledger (force plate)", `per-step residual ≤ ${Lg.residualMaxNs} N·s (after Jolt's body damping ${Lg.residualMaxAfterDampingNs}) · turf ${Lg.turfImpulseNs.join(", ")} · push ${Lg.pushImpulseNs.join(", ")} · obstacle ${Lg.obstacleImpulseNs.join(", ")} · engine damping ${Lg.engineDampingNs.join(", ")} N·s · <b>no root force: ${Lg.noRootForce}</b>`, !Lg.noRootForce || Lg.residualMaxNs > 0.2);
  if (r.internal) h += row("internal momentum", `ΔP ${r.internal.dPNs} N·s · ΔL ${r.internal.dLkgm2s} kg·m²/s (peak ${r.internal.peakL})`);
  if (r.supportRealization) h += row("support realised under contention", `${(r.supportRealization.ratio * 100).toFixed(1)} % of the P0 core request (${r.supportRealization.jointSteps} joint-steps with a lower-class request)`);
  if (r.transfer) h += row("transfer", r.transfer.map(e => `${e.t.toFixed(3)} ${e.kind}: ${e.what}`).join("<br>"));
  if (r.requests) h += row("placements (C2 sequencer)", r.requests.map(q => `${q.foot} ${q.status} · ${q.errCm} cm · ${q.why}`).join("<br>"));
  h += row("state hash", `${r.hash} ${node ? (node.hash === r.hash ? "<span class=ok>= Node</span>" : `<span class=bad>≠ Node ${node.hash}</span>`) : ""}`) + row("CPU (browser)", `${r.cpu.msPerFrame} ms per 60 Hz frame (Jolt ${r.cpu.jolt} · controller ${r.cpu.controller})`) + `</table>`;
  if (r.steps.length) h += `<h3>Steps (executor)</h3><table class=small><tr><th>kind</th><th>foot</th><th>status</th><th>lift</th><th>td (plan)</th><th>foothold cm</th><th>adj cm</th><th>stance slip cm</th></tr>` + r.steps.map(s => `<tr style="cursor:pointer" onclick="G1_SEEK(${s.tdT ?? s.liftoffT ?? 0})"><td>${s.kind}</td><td>${s.sw}</td><td class="${/FAIL/.test(s.status) ? "bad" : ""}">${s.status}${s.fail ? "<br>" + s.fail : ""}${s.obstructed ? `<br>obstructed ${s.obstructed.tTruth} s, reaction ${s.obstructed.reactMs} ms` : ""}</td><td>${f(s.liftoffT)}</td><td>${f(s.tdT)} (${f(s.plannedTdT)})</td><td>${f(s.footholdErrCm)}</td><td>${f(s.adjustCm)}</td><td>${f(s.stanceSlipCm)}</td></tr>`).join("") + `</table>`;
  h += `<h3>Arbiter at the cursor</h3><div id="g1cur"></div>`;
  h += `<h3>Arbiter over the run (N·m·s, |·| summed over axes)</h3><table class=small><tr><th>module</th><th>class</th><th>requested</th><th>allowed</th><th>yielded</th></tr>` + Object.entries(r.arbiter).map(([m, a]) => `<tr><td>${m}</td><td>${a.cls}</td><td>${a.requestedNms}</td><td>${a.allowedNms}</td><td class="${a.yieldedNms > 0 ? "bad" : ""}">${a.yieldedNms}${a.why ? " " + JSON.stringify(a.why) : ""}</td></tr>`).join("") + `</table>`;
  const ev = r.gaitEvents || []; h += `<h3>Gait / support events (truth)</h3><table class=small>` + ev.slice(0, 60).map(e => `<tr style="cursor:pointer" onclick="G1_SEEK(${e.t})"><td>${e.t.toFixed(3)}</td><td style="color:${e.kind === "OBSTRUCTION" ? "#ff7070" : e.early ? "#60e0ff" : "#ddd"}">${e.kind}</td><td>${e.what}</td></tr>`).join("") + `</table>`;
  h += `<details><summary class=small>viability monitor (${(r.monitor.log || []).length}) · executor (${(r.execLog || []).length}) · planner (${(r.plannerLog || []).length}) logs</summary><table class=small>` + [...(r.monitor.log || []).map(e => ["monitor", e.t, e.what]), ...(r.execLog || []).map(e => ["exec", e.t, e.kind + ": " + e.what]), ...(r.plannerLog || []).map(e => ["planner", e.t, e.kind + ": " + e.what])].sort((a, b) => a[1] - b[1]).map(([s, t, w]) => `<tr style="cursor:pointer" onclick="G1_SEEK(${t})"><td>${t.toFixed(3)}</td><td>${s}</td><td>${w}</td></tr>`).join("") + `</table><div class=small>(times are each layer's own VIEW time: the executor sees 50 ms, the monitor 120 ms into the past)</div></details>`;
  h += `<h3>Chart legend</h3><div class=small>top: gait roles L / R (stance green · unloading yellow · swing cyan · descending blue · loading violet · obstructed red · unplanned air orange), support mode, monitor verdict (nominal green · stepping cyan · wait-view grey · modified orange · no capture red); ticks: touchdown white (early cyan), obstruction red, early / unplanned lift orange, push yellow. Bottom: the arbiter of the selected joint axis (joint / axis selectors on the left).</div>`;
  if (H.g1) { h += `<details open><summary><b>G1a criteria (Node evidence, tools/g1a_run.js ×${H.g1.repeat})</b></summary><table>${crit.map(cRow).join("")}</table></details>`;
    const s6 = H.g1.s6 || {}; h += `<details><summary class=small>S6 — D6 with the new stack as B</summary><table class=small><tr><th>test</th><th>baseline</th><th>0/0</th><th>50/120</th><th>releases while re-planting</th></tr>` + Object.entries(s6).map(([k, v]) => `<tr><td>${k}</td><td>${v.baseline ? (v.baseline.fell ? "fell" : "recovered") : "-"}</td><td>${v.zeroDelay.fell ? "fell " + v.zeroDelay.tFalling : "recovered"}</td><td>${v.defaultDelay.fell ? "fell " + v.defaultDelay.tFalling : "recovered"}</td><td>${v.zeroDelay.releasesWhileReplanting}/${v.defaultDelay.releasesWhileReplanting}</td></tr>`).join("") + `</table></details>`;
    const sw = H.g1.sweep || {}; h += `<details><summary class=small>latency sweep (feedback / planning ms)</summary><table class=small><tr><th>scenario</th>${(Object.values(sw)[0] || []).map(q => `<th>${q.fbMs}/${q.plMs}</th>`).join("")}</tr>` + Object.entries(sw).map(([k, rows]) => `<tr style="cursor:pointer" onclick="G1_PICK('${k}')"><td>${k}</td>${rows.map(q => `<td class="${/FELL/.test(q.outcome) ? "bad" : "ok"}">${q.outcome.replace("RECOVERED_WITH_STEP", "STEP").replace("RELEASED_REENGAGED", "RELEASED")}<br>${q.landed}/${q.steps} st${q.obstructionReactMs != null ? " · " + q.obstructionReactMs + " ms" : ""}</td>`).join("")}</tr>`).join("") + `</table></details>`;
    const s10 = H.g1.s10 || {}; h += `<details><summary class=small>S10 — 240 vs 480 Hz physics</summary><pre class=small style="white-space:pre-wrap">${JSON.stringify(Object.fromEntries(Object.entries(s10).map(([k, v]) => [k, v.compare])), null, 1)}</pre></details>`;
    const pl = H.g1.plate || {}; h += `<details><summary class=small>plate-as-turf vs static turf</summary><table class=small><tr><th>scenario</th><th>plate</th><th>static</th></tr>` + Object.entries(pl).map(([k, v]) => `<tr><td>${k}</td><td>${v.plate.outcome} · COM ${v.plate.comExcursionCm} cm</td><td class="${v.sameOutcome ? "" : "bad"}">${v.static.outcome} · COM ${v.static.comExcursionCm} cm</td></tr>`).join("") + `</table></details>`;
    h += `<h3>Scenarios (click to load)</h3><table class=small><tr><th>scenario</th><th>outcome</th><th>det</th></tr>` + Object.entries(H.g1.scenarios).map(([k, q]) => `<tr style="cursor:pointer;${k === H.testG1 ? "background:#3a3320" : ""}" onclick="G1_PICK('${k}')"><td>${k}</td><td class="${q.fell ? "bad" : "ok"}">${q.outcome}</td><td>${q.deterministic ? "✓" : "✗"}</td></tr>`).join("") + `</table>`; }
  $("side").innerHTML = h; H.g1curI = -1; cursorG1(); }
// ── GATE G2a: the human in-place gait + yaw regulation (a G1-family suite: the G1 overlays, status, arbiter and footholds apply) ──────
// Adds: the REFERENCE skeleton (of_loco WALK in place, at the measured phase, by forward kinematics from the ACTUAL pelvis — the request,
// never applied to a body), the pelvis / chest / intended headings, and charts of yaw, the vertical angular-momentum budget by body group
// and knee / hip flexion against the reference. Physical validation and human-likeness are reported separately in the side panel.
const G2_REVIEW = [
  { id: "walk", label: "1 · the walk (¾)", test: "G2a_walkInPlace", cmp: { key: "G2a_G1style", label: "G1 stepping (robotic)" }, cam: "three", chart: "yawset", note: '<b>Physical:</b> 16 / 16 steps, footholds ≤ 2 cm from plan, stance slip ≤ 0.13 cm, external-impulse ledger ≤ 0.04 N·s, no root force; the pelvis stays within 5° of the intended heading (chart) — the magenta ghost is G1\'s robotic stepping (±13°). <b>Looks:</b> a real knee lift (knee 70°, hip 35°, foot 14 cm up, toes hanging), the contralateral arm forward as the knee rises, a steady upright trunk. It still reads as a <i>careful march</i>: both feet are down ≈ 45 % of the time, the foot leaves nearly flat (no heel peel), and the side-to-side weight shift (9 cm) is deliberate.' },
  { id: "front", label: "2 · counter-swing (front)", test: "G2a_walkInPlace", cam: "front", chart: "lzset", note: '<b>Physical:</b> the chart is the vertical angular momentum by body group — the arms (orange) mirror the legs (green, r −0.83), so the whole body (white) swings 1.8 against the legs\' 3.3 kg·m²/s and the stance ankle\'s small twist budget (5–8 N·m) is enough. <b>Looks:</b> knee lift with the opposite arm forward, pelvis roll ≈ 6°, a visible lateral weight shift; the arms swing mainly at the shoulder (elbow change 15°).' },
  { id: "side", label: "3 · legs vs reference (side)", test: "G2a_walkInPlace", cam: "side", chart: "knees", note: '<b>Physical:</b> the orange skeleton is the reference (of_loco WALK in place) at the measured phase, drawn from the ACTUAL pelvis — the request, never applied. Chart: right knee / hip, physical (solid) vs reference (dashed): the physical swing lifts higher (knee 70° vs 60°, hip 35° vs 28°) because the toe-clearance requirement of the 36 cm boot raises the foot; stance legs are solved by the balance controller, not copied. <b>Looks:</b> forefoot contact, the heel lowers over ≈ 56 ms.' },
  { id: "noarms", label: "4 · yaw without arms", test: "G2a_walkInPlace", cmp: { key: "G2a_noArms", label: "arms held (no counter-swing)" }, cam: "three", chart: "yawset", note: '<b>Physical:</b> magenta ghost = the same gait with the arms held in the IDLE pose: the pelvis yaw almost doubles (8.7° → 15° peak-to-peak) and the whole-body angular momentum doubles (1.8 → 3.4 kg·m²/s) — in place the arm counter-swing carries the yaw regulation. <b>Looks:</b> without arm swing the whole body visibly twists with each step.' },
  { id: "phase", label: "5 · walk-timed arms", test: "G2a_walkInPlace", cmp: { key: "G2a_walkPhaseArms", label: "arms on the WALK's timing" }, cam: "front", chart: "yawset", note: '<b>Physical:</b> magenta ghost = the arms (and trunk / pelvis yaw) on the WALK\'s own cos 2πu timing: in place their momentum is uncorrelated with the legs\' (r −0.03) and the pelvis yaw doubles (18.8°). In place the swing leg\'s momentum follows the knee\'s fore-aft motion (forward as it rises, back as it lowers), a quarter cycle from the walk\'s. <b>Looks:</b> the arms swing out of step with the knee lift.' },
  { id: "turn", label: "6 · intended turn 30°", test: "G2a_turn30", cam: "three", chart: "yawset", note: '<b>Physical:</b> the intended heading ramps −30° over 3 s from 3.5 s; the in-place footholds and their yaw rotate with it; pelvis −30.0°, chest −29.9°, feet −29.2° at the end, the pelvis within 5° of the moving intended heading throughout. Nothing pins the heading — the same finite stance-leg torques make the turn. <b>Looks:</b> ≈ 6° per step, the chest lags the pelvis slightly in the turn.' },
  { id: "landing", label: "7 · landing: forefoot → heel", test: "G2a_walkInPlace", cam: "side", chart: "grf", note: '<b>Physical:</b> each foot lands forefoot-first with the heel 2 cm up and the target pressed 1.5 cm through the surface (a finite contact velocity, so it loads at once — a target arriving at rest kissed the turf and hovered); the landed ankle is compliant in pitch only (heel rocker), stiff in twist and roll; the double support ends on CONTACT (heel and toe down, ≥ 35 % BW). Chart: vertical ground force. <b>Looks:</b> a soft landing; the touchdown is ≈ 40 ms before the planned time by design.' } ];
function g2ReviewApply(id) { const c = G2_REVIEW.find(q => q.id === id); H.g1review = c ? id : null; H.g1main = c && c.main ? c.main : null; H.g1cmp = c && c.cmp ? c.cmp : null; if (!c) return;
  H.testG2 = c.test; if (c.chart) { H.g1chart = c.chart; const el = $("g1chart"); if (el) el.value = c.chart; } if (c.cam) { const p = PRESETS[c.cam]; H.cam.az = p[0]; H.cam.el = p[1]; H.cam.dist = p[2]; } }
window.G2_REVIEW_PICK = (id) => { if (!isG2()) setSuite("G2"); g2ReviewApply(id); $("drop").value = H.testG2; simulate(); };
const wrapDeg = (a) => Math.atan2(Math.sin(a), Math.cos(a)) * 57.2958;
function g2Series(run, key) { const spec = H.spec, R_ = run.recs, T = TESTS_G2[key] || {}, turn = T.loco && T.loco.rhythm && T.loco.rhythm.turn, bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n);
  const mj = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (10 - 15 * x + 6 * x * x); }, intended = (t) => turn ? turn.deg * Math.PI / 180 * mj((t - turn.at) / turn.dur) : 0;
  const f0 = R_[0].states, a = Q.rot(f0[bi("foot_L")].rot, [0, 0, 1]), b = Q.rot(f0[bi("foot_R")].rot, [0, 0, 1]), yaw0 = Math.atan2(a[0] + b[0], a[2] + b[2]), hu = T.loco && T.loco.human, P = hu && hu.walk ? walkParams(hu.walk, hu.over) : inPlaceWalkParams(hu && hu.over);
  return R_.map(r => { const L_ = amBudget(spec, r.states), ref = r.ref && P ? refPose(P, r.ref.u, r.ref.w) : null;
    return { pel: wrapDeg(yawOfQ(r.states[0].rot) - yaw0), che: wrapDeg(yawOfQ(r.states[bi("chest")].rot) - yaw0), int: intended(r.t) * 57.2958, lz: L_,
      knee: jointAngles(spec, r.states, ji("knee_R")).a, hip: -jointAngles(spec, r.states, ji("hip_R")).y, rKnee: ref ? ref.shin_R[0] : null, rHip: ref ? -ref.thigh_R[0] : null }; }); }
function prepG2() { const T = TESTS_G2[H.testG2]; H.g2yaw0 = null; const hu = T.loco && T.loco.human; H.g2P = hu && hu.walk ? walkParams(hu.walk, hu.over) : inPlaceWalkParams(hu && hu.over); H.g2an = analyzeG2a(H.spec, H.run); H.g2s = g2Series(H.run, H.testG2);
  H.g2cs = H.cmpRun ? g2Series(H.cmpRun, H.g1cmp.key || H.testG2) : null; }
function drawG2(rec, S, labels) { const O = H.ov, spec = H.spec;
  if (O.g_ref && rec.ref && H.g2P && rec.ref.w > 0.01) { const pose = refPose(H.g2P, rec.ref.u, rec.ref.w), T = poseTargets(spec, pose), Ta = spec.joints.map((j, k) => T[k]);
    if (Ta.every(x => x != null)) { const G = fk(spec, S[0].pos, S[0].rot, Ta); skeleton(G, [1, 0.62, 0.12, 0.95]); labels.push([V.add(G[spec.bodies.findIndex(b => b.name === "head")].pos, [0.12, 0.18, 0]), `reference (of_loco WALK, in place) · phase u ${rec.ref.u.toFixed(2)} · blend ${rec.ref.w.toFixed(2)}`, "#ffb040"]); } }
  if (O.g_yaw && H.g2s) { const s = H.g2s[H.i], p = S[0].pos, ch = S[spec.bodies.findIndex(b => b.name === "chest")].pos, arrow = (o, deg, col, len) => { const a = deg * Math.PI / 180 + H.g2yaw0, d = [Math.sin(a) * len, 0, Math.cos(a) * len], e = V.add(o, d); L(o, e, col); const q = [Math.sin(a + 2.6) * 0.05, 0, Math.cos(a + 2.6) * 0.05], r = [Math.sin(a - 2.6) * 0.05, 0, Math.cos(a - 2.6) * 0.05]; L(e, V.add(e, q), col); L(e, V.add(e, r), col); };
    if (H.g2yaw0 == null) { const f0 = H.run.recs[0].states, bi = (n) => spec.bodies.findIndex(b => b.name === n), a = Q.rot(f0[bi("foot_L")].rot, [0, 0, 1]), b = Q.rot(f0[bi("foot_R")].rot, [0, 0, 1]); H.g2yaw0 = Math.atan2(a[0] + b[0], a[2] + b[2]); }
    const o1 = V.add(p, [0, 0.02, 0]), o2 = V.add(ch, [0, 0.12, 0]); arrow(o1, s.int, [1, 1, 1, 0.9], 0.42); arrow(o1, s.pel, [0.3, 0.9, 1, 1], 0.36); arrow(o2, s.che, [1, 0.85, 0.2, 1], 0.36);
    labels.push([V.add(o1, [0, -0.06, 0]), `pelvis ${(s.pel - s.int).toFixed(1)}° · chest ${(s.che - s.int).toFixed(1)}° from intended${Math.abs(s.int) > 0.05 ? ` (intended ${s.int.toFixed(1)}°)` : ""}`, "#80e0ff"]); } }
function drawChartG2(c, g, w, h) { const q = H.g1chart, A = H.g2s, C = H.g2cs, n = A.length, X = (i) => i / (n - 1) * w; g.clearRect(0, 0, w, h); g.fillStyle = "#0d0f12"; g.fillRect(0, 0, w, h);
  const sets = q === "yawset" ? [["pelvis", A.map(s => s.pel), "#5ad0ff"], ["chest", A.map(s => s.che), "#ffd040"], ["intended", A.map(s => s.int), "#ffffff", [5, 4]]].concat(C ? [["ghost pelvis", C.map(s => s.pel), "#ff60e0"]] : [])
    : q === "lzset" ? [["legs", A.map(s => s.lz.legs), "#5ad08a"], ["arms", A.map(s => s.lz.arms), "#ff9a30"], ["trunk + pelvis", A.map(s => s.lz.trunk + s.lz.pelvis), "#b890ff"], ["WHOLE BODY", A.map(s => s.lz.all), "#ffffff"]]
    : [["knee R", A.map(s => s.knee), "#5ad0ff"], ["knee R ref", A.map(s => s.rKnee), "#5ad0ff", [4, 3]], ["hip R flexion", A.map(s => s.hip), "#5ad08a"], ["hip R ref", A.map(s => s.rHip), "#5ad08a", [4, 3]]];
  const all = sets.flatMap(x => x[1].filter(v => v != null)), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.06 + 1e-6, Y = (v) => h - 3 - (v - lo + pad) / (hi - lo + 2 * pad) * (h - 16);
  if (lo < 0 && hi > 0) { g.strokeStyle = "#333"; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke(); }
  for (const [nm, arr, col, dash] of sets) { g.strokeStyle = col; g.setLineDash(dash || []); g.beginPath(); let st = false; arr.forEach((v, i) => { if (v == null) { st = false; return; } st ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); st = true; }); g.stroke(); g.setLineDash([]); }
  g.fillStyle = "#fff"; g.fillRect(X(H.i) - 1, 0, 2, h); const i = Math.min(H.i, n - 1), u = q === "lzset" ? " kg·m²/s" : "°";
  g.font = "10px ui-monospace, Menlo"; let x = 6; for (const [nm, arr, col] of sets) { const t = `${nm} ${arr[Math.min(i, arr.length - 1)] != null ? arr[Math.min(i, arr.length - 1)].toFixed(q === "lzset" ? 2 : 1) : "-"}`; g.fillStyle = col; g.fillText(t, x, 10); x += g.measureText(t).width + 12; }
  g.fillStyle = "#9aa0a6"; g.fillText(`${q === "yawset" ? "yaw from the initial heading" : q === "lzset" ? "vertical angular momentum about the whole-body COM" : "joint flexion (dashed: the reference at the measured phase)"} [${lo.toFixed(1)} … ${hi.toFixed(1)}]${u}`, x, 10); }
function renderSideG2() { const r = H.run, T = TESTS_G2[H.testG2], a = H.g2an, f = (x) => x == null ? "-" : x, row = (k, v, bad) => `<tr><td>${k}</td><td class="${bad ? "bad" : ""}">${v}</td></tr>`, G = H.g2 || null, node = G && G.scenarios ? G.scenarios[H.testG2] : null;
  const cRow = (c) => `<tr><td>${c.id}</td><td class="${c.pass === null ? "" : c.pass ? "ok" : "bad"}">${c.pass === null ? "obs" : c.pass ? "PASS" : "FAIL"}</td><td class=small>${c.criterion}<br><b>${c.measured}</b>${c.note ? "<br><i>" + c.note + "</i>" : ""}</td></tr>`;
  let h = `<h3>G2a review — human in-place gait + yaw regulation</h3><div>${G2_REVIEW.map(c => `<button style="margin:2px 2px;${H.g1review === c.id ? "background:#f0c060;color:#111" : ""}" onclick="G2_REVIEW_PICK('${c.id}')">${c.label}</button>`).join("")}</div>` + (H.g1review ? `<div class="small" style="margin:6px 0;padding:6px;border:1px solid #444">${(G2_REVIEW.find(c => c.id === H.g1review) || {}).note || ""}${H.g1cmp ? `<br>magenta ghost: <b>${H.g1cmp.label}</b>` : ""}</div>` : "");
  h += `<h3>${T.title}</h3><div class="small">The G1 stack (contact truth · viability monitor · C1 balance law · one arbiter per joint axis · turf as force plate) driving a HUMAN swing and posture from of_loco's WALK (in place): the reference supplies joint-space PREFERENCES at the MEASURED phase — P3 style for trunk / neck / arms, the planned pelvis posture, the swing foot's path — never the root, a foothold, a touchdown or any state. Jolt decides the motion. Orange skeleton = the reference request (FK from the actual pelvis).</div>`;
  if (G && G.criteria) { const mine = G.criteria.filter(c => !c.scenario || c.scenario === H.testG2); if (mine.length) h += `<details open><summary><b>criteria (Node evidence, tools/g2a_run.js)</b></summary><table>${mine.map(cRow).join("")}</table></details>`; }
  h += `<h3>Physical validation</h3><table>` + row("outcome", `<b>${r.outcome}</b> · steps landed ${r.steps.filter(s => s.status === "LANDED").length}/${r.steps.length} · delays ${r.delays.fb * 1000}/${r.delays.pl * 1000} ms`, r.fell);
  const errs = r.steps.map(s => s.footholdErrCm).filter(v => v != null), slips = r.steps.map(s => s.stanceSlipCm).filter(v => v != null);
  h += row("footholds · stance slip", `max ${errs.length ? Math.max(...errs) : "-"} cm from plan · stance slip ≤ ${slips.length ? Math.max(...slips) : "-"} cm`, errs.some(v => v > 5));
  const Lg = r.ledger; h += row("external-impulse ledger", `residual ≤ ${Lg.residualMaxNs} N·s · turf ${Lg.turfImpulseNs.join(", ")} N·s · <b>no root force: ${Lg.noRootForce}</b> · teleports ${r.audit.teleports} · velocity writes ${r.audit.velocityWrites}`, !Lg.noRootForce);
  h += row("state hash", `${r.hash} ${node ? (node.hash === r.hash ? "<span class=ok>= Node</span>" : `<span class=bad>≠ Node ${node.hash}</span>`) : ""}`) + row("CPU (browser, review instrumentation)", `${r.cpu.msPerFrame} ms per 60 Hz frame (Jolt ${r.cpu.jolt} · controller ${r.cpu.controller})`) + `</table>`;
  if (a) { const y = a.yaw, am = a.angularMomentum, gt = a.gait, st = a.style, rf = st.reference || {};
    h += `<h3>Yaw · angular momentum (window ${a.window.t0}–${a.window.t1} s, ${a.window.steps} steps)</h3><table>` + row("pelvis yaw (vs intended)", `${y.pelvisPtpDeg}° peak-to-peak · max |${y.pelvisMaxAbsDeg}°| · drift ${y.driftDegPerCycle}°/cycle · net ${y.netDeg}°`, y.pelvisMaxAbsDeg > 8) + row("chest yaw", `${y.chestPtpDeg}° p-t-p · thorax vs pelvis ${y.trunkCounterPtpDeg}°`);
    if (y.turn) h += row("intended turn", `intended ${y.turn.intendedDeg}° → pelvis ${y.turn.pelvisDeg}° · feet ${y.turn.feetDeg}° · chest ${y.turn.chestDeg}°`, Math.abs(y.turn.pelvisDeg - y.turn.intendedDeg) > 3);
    h += row("L_z p-t-p (kg·m²/s)", `whole body <b>${am.ptp.all}</b> · legs ${am.ptp.legs} · arms ${am.ptp.arms} · trunk ${am.ptp.trunk} · pelvis ${am.ptp.pelvis}`) + row("counter-rotation (correlation with the legs' L_z)", `arms ${am.armsVsLegs} · trunk+pelvis ${am.trunkVsLegs} · whole upper body ${am.upperVsLegs} (−1 = exact cancellation)`) + `</table>`;
    h += `<h3>Human-likeness (measured — judge visually)</h3><table>` + row("cadence · swing", `${gt.cadenceSpm} steps/min · airborne ${gt.swingS} s`) + row("swing knee · hip flexion", `${gt.kneeFlexSwingDeg}° · ${gt.hipFlexDeg}°`) + row("stance knee", `mean ${gt.stanceKneeDeg.mean}° (min ${gt.stanceKneeDeg.min}°) — not locked straight`) + row("foot lift · toe clearance", `ankle lift ${gt.ankleLiftCm} cm · min toe clearance ${gt.minClearCm} cm`, gt.minClearCm < 0.5)
      + row("heel rise before toe-off", `${gt.heelRiseCm} cm — the foot leaves nearly flat, then pitches toes-down in the air (NOT a human toe-off; see the report)`, true) + row("contact", `first contact ${JSON.stringify(gt.firstContact)} · heel down after ${gt.heelDownMs} ms`) + row("pelvis · COM", `bob ${gt.pelvisBobCm} cm · roll ${gt.pelvisRollDeg}° · lateral COM sway ${gt.comSwayCm} cm`)
      + row("arms", `shoulder swing ${st.shoulderSwingDeg.L}° / ${st.shoulderSwingDeg.R}° (reference ${rf.shoulderSwingDeg}°) · elbow ${st.elbowDeg}° (ref ${rf.elbowDeg}°) · phase with the legs ${st.armPhase}`) + row("trunk twist", `${st.trunkTwistDeg}° (walk reference ${rf.trunkTwistDeg}°; in place: thorax stabilisation)`) + `</table>`;
    h += `<details><summary class=small>per-swing kinematics</summary><table class=small><tr><th>sw</th><th>T</th><th>lift</th><th>clear</th><th>heel</th><th>hip</th><th>knee</th><th>first</th><th>heel↓ ms</th></tr>` + a.swings.map(q => `<tr><td>${q.sw}</td><td>${f(q.T)}</td><td>${f(q.ankleLiftCm)}</td><td>${f(q.minClearCm)}</td><td>${f(q.heelRiseCm)}</td><td>${f(q.hipFlexDeg)}</td><td>${f(q.kneeFlexDeg)}</td><td>${f(q.firstContact)}</td><td>${f(q.heelDownMs)}</td></tr>`).join("") + `</table></details>`; }
  if (G && G.attribution) h += `<h3>Yaw attribution (click to load)</h3><table class=small><tr><th>variant</th><th>outcome</th><th>pelvis p-t-p / max</th><th>chest</th><th>L_z all</th><th>arms·legs</th></tr>` + Object.entries(G.attribution).map(([k, v]) => `<tr style="cursor:pointer;${k === H.testG2 ? "background:#3a3320" : ""}" onclick="G2_PICK('${k}')"><td>${k}</td><td class="${v.fell ? "bad" : "ok"}">${v.outcome}</td><td>${v.pelvisPtpDeg} / ${v.pelvisMaxAbsDeg}</td><td>${v.chestPtpDeg}</td><td>${v.lzAll}</td><td>${v.armsVsLegs}</td></tr>`).join("") + `</table>`;
  if (r.steps.length) h += `<h3>Steps (executor)</h3><table class=small><tr><th>foot</th><th>status</th><th>lift</th><th>td (plan)</th><th>foothold cm</th><th>slip cm</th></tr>` + r.steps.map(s => `<tr style="cursor:pointer" onclick="G1_SEEK(${s.tdT ?? s.liftoffT ?? 0})"><td>${s.sw}</td><td class="${/FAIL/.test(s.status) ? "bad" : ""}">${s.status}</td><td>${f(s.liftoffT)}</td><td>${f(s.tdT)} (${f(s.plannedTdT)})</td><td>${f(s.footholdErrCm)}</td><td>${f(s.stanceSlipCm)}</td></tr>`).join("") + `</table>`;
  h += `<h3>Arbiter at the cursor</h3><div id="g1cur"></div>`;
  h += `<h3>Arbiter over the run (N·m·s)</h3><table class=small><tr><th>module</th><th>class</th><th>requested</th><th>allowed</th><th>yielded</th></tr>` + Object.entries(r.arbiter).map(([m, q]) => `<tr><td>${m}</td><td>${q.cls}</td><td>${q.requestedNms}</td><td>${q.allowedNms}</td><td class="${q.yieldedNms > 0 ? "bad" : ""}">${q.yieldedNms}${q.why ? " " + JSON.stringify(q.why) : ""}</td></tr>`).join("") + `</table>`;
  h += `<h3>Views · legend</h3><div class=small>Speeds 1× / 0.5× / 0.25× / 0.1× and ◀ step ▶ (one 240 Hz physics step) in the top bar; cameras ¾ / front / side. Overlays: orange skeleton = reference request; cyan / yellow / white arrows = pelvis / chest / intended heading; footholds planned (orange) vs actual (cyan); swing target path (yellow) vs the actual foot (cyan). Bottom chart: pick yaw / angular momentum / knees in the G1a bar. Top chart: gait roles L / R, support, monitor verdict, events.</div>`;
  $("side").innerHTML = h; H.g1curI = -1; cursorG1(); }
// ── UI ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const WORST = { G1: [["push", "push"], ["liftoff", "first liftoff"], ["touchdown", "first touchdown"], ["event", "first EARLY / OBSTRUCTION event"], ["corrective", "first corrective step"], ["yield", "first style yield"], ["sat", "first saturated axis"], ["falling", "fall release"], ["grounded", "non-foot ground contact"]], D: [["contact", "first A↔B manifold"], ["arrest", "approach arrested"], ["touch", "first A↔B touch"], ["push", "push on A"], ["fallA", "A falls"], ["fallB", "B falls"]], C3: [["push", "push"], ["stepNeeded", "STEP_NEEDED"], ["liftoff", "liftoff"], ["touchdown", "touchdown"], ["recovered", "recovered"], ["falling", "fall release"], ["grounded", "first non-foot ground contact"]], C2: [["liftoff", "first liftoff"], ["touchdown", "first touchdown"], ["done", "first request outcome"]], C: [["push", "push"], ["stepNeeded", "STEP_NEEDED declared"], ["falling", "fall transition (release)"], ["grounded", "first non-foot ground contact"], ["minMargin", "smallest capture-point margin"], ["footRoll", "first foot roll / lift"]], A: [["groundPen", "ground penetration"], ["anchor", "joint separation"], ["limit", "limit violation"], ["pop", "correction pop"], ["self", "self penetration"], ["energy", "energy gain"]],
  B: [["err", "target error (RMS peak)"], ["contact", "first obstacle contact"], ["penetration", "deepest obstacle penetration"], ["disturbance", "disturbance"], ["limit", "limit violation"], ["anchor", "joint separation"], ["ground", "ground penetration"], ["self", "self penetration"]] };
function setSuite(k) { H.suiteKey = k; document.body.classList.toggle("suiteD", isD()); document.body.classList.toggle("suiteB", isB()); document.body.classList.toggle("suiteC", isBal() || isG1()); document.body.classList.toggle("suiteG1", isG1()); document.body.classList.toggle("suiteG2", isG2()); document.body.classList.toggle("suiteC2", isC2()); $("suite").value = k; const sel = $("drop"); sel.innerHTML = "";
  if (isG2()) { let grp = null, og = null; for (const t of Object.keys(TESTS_G2)) { if (TESTS_G2[t].group !== grp) { grp = TESTS_G2[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_G2[t].title}`, t)); } }
  else if (isG1()) { let grp = null, og = null; for (const t of Object.keys(TESTS_G1A)) { if (TESTS_G1A[t].group !== grp) { grp = TESTS_G1A[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_G1A[t].title}`, t)); } }
  else if (isD()) { let grp = null, og = null; for (const t of [...Object.keys(TESTS_D), ...Object.keys(TESTS_D6X)]) { const T = TD(t); if (T.group !== grp) { grp = T.group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${T.title}`, t)); } }
  else if (isC3()) { let grp = null, og = null; for (const t of Object.keys(TESTS_C3)) { if (TESTS_C3[t].group !== grp) { grp = TESTS_C3[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_C3[t].title}`, t)); } }
  else if (isC2()) { let grp = null, og = null; for (const t of Object.keys(TESTS_C2)) { if (TESTS_C2[t].group !== grp) { grp = TESTS_C2[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_C2[t].title}`, t)); } }
  else if (isC()) { let grp = null, og = null; for (const t of Object.keys(TESTS_C1)) { if (TESTS_C1[t].group !== grp) { grp = TESTS_C1[t].group; og = document.createElement("optgroup"); og.label = grp; sel.appendChild(og); } og.appendChild(new Option(`${t} — ${TESTS_C1[t].title}`, t)); } }
  else if (isB()) for (const t of Object.keys(TESTS)) sel.add(new Option(TESTS[t].title, t)); else for (const d of Object.keys(DROPS)) sel.add(new Option(DROPS[d].title, d));
  sel.value = isG2() ? H.testG2 : isG1() ? H.testG1 : isD() ? H.testD : isC3() ? H.testC3 : isC2() ? H.testC2 : isC() ? H.testC : isB() ? H.test : H.drop; $("tlhelp").textContent = isG1() ? "ARBITER, selected joint · axis: allowed total (white dashed) · realized by Jolt (cyan) · posture spring (grey) · P1 feed-forward (orange) · P3 style requested (magenta dotted) / allowed (magenta) · envelope (red dashed) · yield (magenta band) · saturated (red band)" : isBal() ? "nominal (grey dashed) · final target (white dashed) · actual (cyan) · gravity offset (green) · balance offset (orange) · effort / limit (red) · saturated (red band)" : "target (dashed) vs actual (solid) · error (red) · motor effort / limit (orange) · saturated (red band) · contact force (magenta) · support force (violet)"; $("worst").innerHTML = ""; for (const [v, t] of WORST[k === "G2" ? "G1" : k]) $("worst").add(new Option(t, v)); applySuites(); }
function ui() {
  for (const j of ["lumbar", "thoracic", "neck", "shoulder_L", "elbow_L", "shoulder_R", "elbow_R", "hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R"]) $("jsel").add(new Option(j, j));
  $("jsel").value = H.jsel; $("jsel").onchange = () => { H.jsel = $("jsel").value; drawChart2(); }; $("comp").onchange = () => { H.comp = $("comp").value; drawChart2(); };
  $("groot").onchange = () => { H.ghostRoot = $("groot").value; };
  if ($("g1chart")) { $("g1chart").value = H.g1chart || "arbiter"; $("g1chart").onchange = () => { H.g1chart = $("g1chart").value; drawChart2(); }; }
  $("suite").onchange = () => { setSuite($("suite").value); applySuites(); simulate(); };
  $("calib").onchange = () => { setCalib($("calib").value); simulate(); };
  $("prot").onclick = (e) => { H.prot = !H.prot; e.target.classList.toggle("on", H.prot); simulate(); }; $("prot").classList.toggle("on", H.prot);
  $("arms").onclick = (e) => { H.arms = !H.arms; e.target.classList.toggle("on", H.arms); simulate(); }; $("arms").classList.toggle("on", H.arms); $("ctrlv").onchange = () => { setCalib(H.calib, $("ctrlv").value); simulate(); };
  $("drop").onchange = () => { if (isG2()) { H.testG2 = $("drop").value; H.g1review = null; H.g1main = null; H.g1cmp = null; } else if (isG1()) { H.testG1 = $("drop").value; H.g1review = null; H.g1main = null; H.g1cmp = null; } else if (isD()) H.testD = $("drop").value; else if (isC3()) H.testC3 = $("drop").value; else if (isC2()) H.testC2 = $("drop").value; else if (isC()) H.testC = $("drop").value; else if (isB()) H.test = $("drop").value; else H.drop = $("drop").value; simulate(); }; $("restart").onclick = () => { H.i = 0; H.acc = 0; H.playing = true; $("play").textContent = "❚❚ pause"; };
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
window.GATEG1_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isG1()) setSuite("G1"); H.testG1 = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.G1_SEEK = (t) => { H.playing = false; H.i = Math.max(0, Math.min(H.run.recs.length - 1, Math.round(t * hz()) - 1)); $("play").textContent = "▶ play"; };
window.G1_PICK = (k) => { if (!isG1()) setSuite("G1"); H.testG1 = k; $("drop").value = k; simulate(); };
window.G2_PICK = (k) => { if (!isG2()) setSuite("G2"); H.testG2 = k; H.g1review = null; H.g1main = null; H.g1cmp = null; $("drop").value = k; simulate(); };
window.GATEG2_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isG2()) setSuite("G2"); H.testG2 = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.D6_PICK = (k) => { if (!isD()) setSuite("D"); H.testD = k; $("drop").value = k; simulate(); };
window.GATED_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isD()) setSuite("D"); H.testD = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.GATEC3_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isC3()) setSuite("C3"); H.testC3 = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.GATEC2_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isC2()) setSuite("C2"); H.testC2 = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.PC_SETCALIB = (c, ctrlv, arms, prot) => { setCalib(c, ctrlv || ""); if (arms != null) { H.arms = !!arms; $("arms").classList.toggle("on", H.arms); } if (prot != null) { H.prot = !!prot; $("prot").classList.toggle("on", H.prot); } return H.calib; };   // no re-simulation (the next GATE*_TEST call simulates)
window.PC_CALIB = (c, ctrlv) => new Promise((res) => { window.GATEA_READY = false; setCalib(c, ctrlv || ""); simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
window.GATEB_TEST = (k) => new Promise((res) => { window.GATEA_READY = false; if (!isB()) setSuite("B"); H.test = k; $("drop").value = k; simulate(); const w = () => window.GATEA_READY ? res(H.run.hash) : setTimeout(w, 30); w(); });
// SHOT mode (review sheets, headless): ?suite=G1&review=<id>&shot=t1,t2,…&cam=side&phys=0&cols=4 — simulate, render each time into one sheet,
// show only the sheet (no animation loop, so a headless browser's virtual-time budget ends promptly)
function g1Shot() { const ts = QS.get("shot").split(",").map(Number), cols = +(QS.get("cols") || 4), cw = +(QS.get("cw") || 480), ch = +(QS.get("ch") || 360);
  if (QS.get("phys") === "0") H.phys = false; if (QS.get("mesh") === "0") H.mesh = false; if (QS.get("ov") === "none") for (const k of Object.keys(H.ov)) H.ov[k] = false; if (QS.get("ovon")) for (const k of QS.get("ovon").split(",")) H.ov[k] = true; if (QS.get("cam")) { const p = PRESETS[QS.get("cam")]; H.cam.az = p[0]; H.cam.el = p[1]; H.cam.dist = p[2]; }
  if (QS.get("dist")) H.cam.dist = +QS.get("dist"); if (QS.get("ty")) H.camTy = +QS.get("ty"); if (QS.get("el")) H.cam.el = +QS.get("el"); if (QS.get("az")) H.cam.az = +QS.get("az");
  simulate(); const wait = () => { if (!window.GATEA_READY) return setTimeout(wait, 30); const rows = Math.ceil(ts.length / cols), sh = document.createElement("canvas"); sh.width = cols * cw; sh.height = rows * ch + 28; const g = sh.getContext("2d");
    g.fillStyle = "#111"; g.fillRect(0, 0, sh.width, sh.height); g.fillStyle = "#eee"; g.font = "15px -apple-system, system-ui, sans-serif"; g.fillText(`${title()}${H.g1main && H.g1main.loco ? ` · delays ${H.g1main.loco.delayFb * 1000}/${H.g1main.loco.delayPlan * 1000} ms` : ""}${H.g1cmp ? ` · magenta ghost: ${H.g1cmp.label}` : ""} · hash ${H.run.hash}`, 8, 19);
    ts.forEach((t, k) => { H.i = Math.max(0, Math.min(H.run.recs.length - 1, Math.round(t * hz()) - 1)); draw(); const x = (k % cols) * cw, y = 28 + Math.floor(k / cols) * ch; g.drawImage(canvas, x, y, cw, ch); g.drawImage($("ov"), x, y, cw, ch);
      g.fillStyle = "#000a"; g.fillRect(x, y, 86, 20); g.fillStyle = "#ffd060"; g.font = "13px ui-monospace, Menlo, monospace"; g.fillText(`t ${H.run.recs[H.i].t.toFixed(2)} s`, x + 5, y + 15); });
    document.body.innerHTML = ""; document.body.style.background = "#111"; sh.style.width = "100%"; document.body.appendChild(sh); window.G1_SHOT_DONE = true; }; wait(); }
(async function boot() {
  try {
    ui();
    const [J, entry] = await Promise.all([loadJolt(new URL("./vendor/jolt-physics.wasm-compat.js", import.meta.url).href), ofCharLoad("gabriel")]);
    H.J = J; H.entry = entry; H.map = boneBodyMap(entry.rig); H.ref = referencedVertices(entry.mesh);
    try { initOfLoco(await (await fetch("../anim3d/of_loco.js")).text()); } catch (e) { console.warn("of_loco reference unavailable", e); }   // G1a: the P3 style reference
    for (const c of ["V1", "V1.1"]) { H.specs[c] = buildBodySpec(entry.rig, entry.mesh, { calib: c }); H.posesBy[c] = buildPoses(H.specs[c]); }
    H.visHip = visibleHipWidth(entry.rig, entry.mesh, H.specs.V1);
    const get = async (u) => { try { return await (await fetch(u)).json(); } catch (e) { return null; } };
    H.suitesBy.V1 = { A: await get("results/gatea_final_240x1.json"), B: await get("results/gateb_final_240x1.json"), C: await get("results/gatec1_final_240x1.json"), C2: await get("results/gatec2_final_240x1.json") };
    const c3 = await get("results/v1_1/gatec3_V1.1.json"), dd = (await get("results/v1_1/gated_V1.1_post_mu_fix.json")) || await get("results/v1_1/gated_V1.1.json");   // Gate D: the post friction-sensing-fix baseline (the pre-fix file is kept as history)
    H.d6x = await get("../../../review_artifacts/physical_character_v1/d6_diagnostic/json/d6x_matrix.json");
    H.g1 = await get("../../../review_artifacts/physical_character_v1/g1a/json/g1a_results.json"); H.g2 = await get("../../../review_artifacts/physical_character_v1/g2a/json/g2a_results.json");   // G2a: tools/g2a_run.js   // G1a: the Node evidence run (tools/g1a_run.js)   // D6 diagnostic matrix (Node: ×3 hashes + the instrumented twin's exact momentum ledger)
    H.suitesBy["V1.1"] = { D: dd, C3: c3, A: await get("results/v1_1/gatea_V1.1.json"), B: await get("results/v1_1/gateb_V1.1.json"), C: await get("results/v1_1/gatec1_V1.1.json"),
      C2working: await get("results/v1_1/gatec2_V1.1_working.json"), C2approved: await get("results/v1_1/gatec2_V1.1_raw.json"), C2recal: await get("results/v1_1/gatec2_V1.1_recal.json"), C2diag: await get("results/v1_1/gatec2_V1.1_recal_diag.json") };
    setCalib(H.calib); if (QS.get("review")) { if (H.suiteKey === "G2") { g2ReviewApply(QS.get("review")); $("drop").value = H.testG2; } else { if (!isG1()) setSuite("G1"); g1ReviewApply(QS.get("review")); $("drop").value = H.testG1; } }
    if (QS.get("shot")) return g1Shot(); simulate(); requestAnimationFrame(loop);
  } catch (e) { $("status").textContent = "BOOT FAILED: " + (e.stack || e); window.GATEA_ERROR = String(e); }
})();
