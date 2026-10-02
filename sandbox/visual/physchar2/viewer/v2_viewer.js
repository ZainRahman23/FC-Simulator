// ═══ physchar2/viewer/v2_viewer.js — V2-G0 static inspection / review page (presentation only; never writes physics) ════════════════
import { V, Q } from "../core/v2_math.js";
import { loadJolt, V2JoltWorld } from "../core/v2_jolt.js";
import { generateSpec, specHash } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { BONES } from "../spec/v2_skeleton.js";
import { POSES } from "../spec/v2_pose.js";
import { posedBodies, toWorld } from "../spec/v2_pose.js";
import { bindData, evaluateSkeleton } from "../map/v2_render_map.js";
import { g0Body } from "../gates/v2_g0.js";
import { createGL } from "./v2_gl.js";

const $ = (id) => document.getElementById(id), D = 180 / Math.PI;
const canvas = $("gl"), ov = $("ov"), R = createGL(canvas), g2 = ov.getContext("2d");
const CLS_COL = { DIRECT: [0.35, 0.95, 0.45, 0.9], AIM: [0.3, 0.85, 1, 0.9], PROC: [1, 0.4, 0.95, 0.9], DEFORM: [1, 0.62, 0.2, 0.9], DERIVED: [0.7, 0.7, 0.7, 0.9] };
const bodyColor = (b) => { if (b.side === "L") return [0.32, 0.55, 0.95]; if (b.side === "R") return [0.95, 0.42, 0.32];
  return { pelvis: [0.55, 0.72, 0.5], abdomen: [0.5, 0.66, 0.6], thorax: [0.45, 0.62, 0.68], head: [0.75, 0.68, 0.5] }[b.name] || [0.6, 0.6, 0.6]; };
const ST = { human: "V2-REF", pose: "canonical", cam: { yaw: 35, pitch: 14, dist: 3.1, target: [0, 0.95, 0], fov: 0.62 }, sel: null, selJoint: null,
  show: { skeleton: true, bodies: true, colliders: false, centres: true, axes: false, limits: false, coms: false, com: true, boneNames: false, bodyNames: false, mapping: false, lr: true, ground: true, dims: false } };
let J = null, SPEC = null, MESH = [], BIND = null, G0 = null, NODE = null, dirty = true;

const CAMS = { front: { yaw: 0, pitch: 4 }, back: { yaw: 180, pitch: 6 }, right: { yaw: 90, pitch: 4 }, left: { yaw: -90, pitch: 4 }, three: { yaw: 35, pitch: 14 }, top: { yaw: 0, pitch: 88 } };
const FOCUS = {
  hips: () => ({ target: [0, SPEC.landmarks.yH, 0], dist: 0.95, yaw: 20, pitch: 12, show: { skeleton: true, centres: true, boneNames: true, bodyNames: true, mapping: true, bodies: false, colliders: true },
    labels: /^(hips|root|spine_01|upperLeg_[LR]|thigh_twist_[LR]|pelvis|abdomen|thigh_[LR]|hip_[LR]|lumbar)$/ }),
  knee: () => ({ target: [SPEC.landmarks.hipHalf, SPEC.landmarks.yK, 0], dist: 0.75, yaw: 40, pitch: 10, show: { axes: true, centres: true, bodies: false, colliders: true } , joint: "knee_R" }),
  foot: () => ({ target: [SPEC.landmarks.hipHalf, 0.06, 0.07], dist: 0.62, yaw: 72, pitch: 8, show: { dims: true, skeleton: true, centres: true, boneNames: true, bodies: false, colliders: true, mapping: true }, labels: /^(foot|toe|lowerLeg|calf_twist)_R$|^ankle_R$|^foot_R$/ }),
  shoulder: () => ({ target: [SPEC.landmarks.shoulderHalf, SPEC.landmarks.ySJC, 0], dist: 0.85, yaw: 25, pitch: 15, show: { centres: true, skeleton: true, boneNames: true, bodyNames: true, bodies: false, colliders: true, axes: true }, joint: "shoulder_R",
    labels: /^(spine_03|clavicle_R|upperArm_R|upperArm_twist_R|lowerArm_R|neck|thorax|upperArm_R|shoulder_R)$/ }),
  spine: () => ({ target: [0, 1.3 * SPEC.human.H / 1.82, 0], dist: 1.35, yaw: 90, pitch: 6, pose: "neutral", show: { skeleton: true, centres: true, boneNames: true, bodyNames: true, mapping: true, bodies: false, colliders: true },
    labels: /^(root|hips|spine_0[123]|neck|head|pelvis|abdomen|thorax|lumbar|thoracic)$/ }),
  proportions: () => ({ target: [0, 0.92 * SPEC.human.H / 1.82, 0], dist: 3.1, yaw: 0, pitch: 4, show: { dims: true, skeleton: true, bodies: true, centres: true, com: true } }),
};

async function init() {
  J = await loadJolt(new URL("../vendor/jolt-physics.wasm-compat.js", import.meta.url).href);
  for (const h of VARIATION_SET) $("human").add(new Option(`${h.id}  (${h.H} m, ${h.M} kg${h.overrides ? ", legs ×" + h.overrides.legScale : ""})`, h.id));
  for (const [k, p] of Object.entries(POSES)) $("pose").add(new Option(p.title, k));
  $("human").value = ST.human; $("pose").value = ST.pose;
  $("human").onchange = () => { ST.human = $("human").value; build(); }; $("pose").onchange = () => { ST.pose = $("pose").value; dirty = true; };
  for (const k of Object.keys(ST.show)) { const el = $("t_" + k); if (!el) continue; el.checked = ST.show[k]; el.onchange = () => { ST.show[k] = el.checked; ST.labelFilter = null; dirty = true; }; }
  for (const k of Object.keys(CAMS)) $("c_" + k).onclick = () => { Object.assign(ST.cam, CAMS[k]); dirty = true; };
  for (const k of Object.keys(FOCUS)) $("f_" + k).onclick = () => focus(k);
  $("reset").onclick = () => { Object.assign(ST.cam, { yaw: 35, pitch: 14, dist: 3.1 * SPEC.human.H / 1.82, target: [0, 0.95 * SPEC.human.H / 1.82, 0] }); dirty = true; };
  orbitControls();
  try { NODE = await (await fetch(new URL("../../../../review_artifacts/physical_character_v2/g0/json/g0_results.json", import.meta.url))).json(); } catch (e) { NODE = null; }
  build(); browserNodeCheck(); loop();
}
function focus(k) { const f = FOCUS[k](); Object.assign(ST.cam, { target: f.target, dist: f.dist, yaw: f.yaw, pitch: f.pitch }); ST.labelFilter = f.labels || null;
  if (f.pose) { ST.pose = f.pose; $("pose").value = f.pose; } for (const [s, v] of Object.entries(f.show || {})) { ST.show[s] = v; const el = $("t_" + s); if (el) el.checked = v; }
  ST.selJoint = f.joint || null; if (f.joint) { ST.show.limits = true; $("t_limits").checked = true; } dirty = true; }
function build() {
  const h = VARIATION_SET.find(x => x.id === ST.human); SPEC = generateSpec(h); BIND = bindData(SPEC);
  const w = new V2JoltWorld(J, SPEC, SPEC.contact); MESH = SPEC.bodies.map((b, i) => R.mesh(w.bodyTriangles(i))); w.destroy();
  G0 = g0Body(J, h, {}); ST.cam.target = [0, 0.95 * h.H / 1.82, 0]; ST.cam.dist = 3.1 * h.H / 1.82;
  renderPanels(); dirty = true;
}
// ── scene ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function poseState() {
  const S = posedBodies(SPEC, POSES[ST.pose].angles);
  if (ST.pose !== "canonical") {                      // display only: rest the lowest collider point on the turf
    let lo = Infinity; S.forEach((s, i) => { const v = MESH[i].edges; for (const p of v) lo = Math.min(lo, Q.rot(s.rot, p)[1] + s.pos[1]); });
    for (const s of S) s.pos[1] -= lo; }
  return S;
}
function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== w * devicePixelRatio) { canvas.width = w * devicePixelRatio; canvas.height = h * devicePixelRatio; ov.width = canvas.width; ov.height = canvas.height; }
  const c = ST.cam, cp = Math.cos(c.pitch / D), eye = [c.target[0] + c.dist * Math.sin(c.yaw / D) * cp, c.target[1] + c.dist * Math.sin(c.pitch / D), c.target[2] + c.dist * Math.cos(c.yaw / D) * cp];
  R.begin({ eye, target: c.target, fov: c.fov }, canvas.width, canvas.height);
  const S = poseState(), W = evaluateSkeleton(SPEC, BIND, S), L = [], push = (a, b, col) => L.push(a[0], a[1], a[2], ...col, b[0], b[1], b[2], ...col), labels = [];
  const H = SPEC.human.H;
  // ground
  if (ST.show.ground) { for (let i = -15; i <= 15; i++) { const x = i * 0.1, col = i % 5 === 0 ? [0.42, 0.45, 0.48, 0.9] : [0.28, 0.3, 0.33, 0.7]; push([x, 0, -1.5], [x, 0, 1.5], col); push([-1.5, 0, x], [1.5, 0, x], col); }
    push([0, 0.001, 0], [0.3, 0.001, 0], [1, 0.3, 0.3, 1]); push([0, 0.001, 0], [0, 0.3, 0], [0.3, 1, 0.3, 1]); push([0, 0.001, 0], [0, 0.001, 0.3], [0.3, 0.5, 1, 1]);
    labels.push({ p: [0.32, 0, 0], t: "+X right", c: "#f66" }, { p: [0, 0.32, 0], t: "+Y up", c: "#6f6" }, { p: [0, 0, 0.32], t: "+Z forward", c: "#69f" }); }
  // bodies (solid) + colliders (wireframe)
  SPEC.bodies.forEach((b, i) => { const M = R.m4.trs(S[i].pos, S[i].rot), col = bodyColor(b), sel = ST.sel === b.name;
    if (ST.show.bodies) R.drawMesh(MESH[i], M, [...col.map(x => sel ? Math.min(1, x * 1.35) : x), ST.show.skeleton ? 0.55 : 0.92]);
    else if (ST.show.colliders) R.drawMesh(MESH[i], M, [...col, 0.18]);
    if (ST.show.colliders || sel) for (let k = 0; k < MESH[i].edges.length; k += 2) { const a = V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k])), e = V.add(S[i].pos, Q.rot(S[i].rot, MESH[i].edges[k + 1])); push(a, e, [...col.map(x => Math.min(1, x + 0.25)), 0.85]); }
    if ((ST.show.bodyNames && (!ST.labelFilter || ST.labelFilter.test(b.name))) || sel) labels.push({ p: toWorld(S, i, b.comLocal), t: b.name, c: "#fff", bold: true, bg: true }); });
  const sph = (p, r, col) => { if (!sph.m) sph.m = R.icosphere(1, 2); R.drawMesh(sph.m, R.m4.trs(p, [0, 0, 0, 1], r), col); };
  // physical joint centres
  if (ST.show.centres) for (const j of SPEC.joints) { const p = toWorld(S, j.parentIndex, V.sub(j.at, SPEC.bodies[j.parentIndex].origin)); sph(p, 0.0125 * H / 1.82, [0.97, 0.97, 0.97, 1]);
    if ((ST.show.bodyNames && (!ST.labelFilter || ST.labelFilter.test(j.name))) || ST.selJoint === j.name) labels.push({ p: V.add(p, [0.02, 0.01, 0]), t: "⊕ " + j.name, c: "#ddd" }); }
  // semantic skeleton
  if (ST.show.skeleton) for (const bone of BONES) { const p = W[bone.name].pos; sph(p, 0.0065 * H / 1.82, [1, 0.82, 0.15, 1]);
    if (bone.parent && bone.parent !== "root") push(W[bone.parent].pos, p, bone.cls === "DEFORM" ? [1, 0.62, 0.2, 0.9] : [1, 0.85, 0.2, 1]);
    if (bone.parent === "root") push(W.root.pos, p, [0.7, 0.7, 0.7, 0.8]);
    if (ST.show.boneNames && (!ST.labelFilter || ST.labelFilter.test(bone.name))) labels.push({ p, t: bone.name + (bone.unity ? " · " + bone.unity : ""), c: "#ffd34d", italic: true });
    const ax = 0.035 * H / 1.82, dq = W[bone.name].rot; push(p, V.add(p, V.sc(Q.rot(dq, [1, 0, 0]), ax * 0.6)), [1, 0.35, 0.35, 0.8]); push(p, V.add(p, V.sc(Q.rot(dq, [0, 1, 0]), ax)), [0.4, 1, 0.4, 0.8]); push(p, V.add(p, V.sc(Q.rot(dq, [0, 0, 1]), ax * 0.6)), [0.4, 0.6, 1, 0.8]); }
  // mapping lines bone → driving body COM
  if (ST.show.mapping) for (const bone of BONES) { const bi = SPEC.bodies.findIndex(b => b.name === bone.body); push(W[bone.name].pos, toWorld(S, bi, SPEC.bodies[bi].comLocal), CLS_COL[bone.cls]); }
  // COMs
  if (ST.show.coms) SPEC.bodies.forEach((b, i) => sph(toWorld(S, i, b.comLocal), 0.0095 * H / 1.82, [0.95, 0.25, 0.9, 1]));
  if (ST.show.com) { let m = 0, c = [0, 0, 0]; SPEC.bodies.forEach((b, i) => { c = V.add(c, V.sc(toWorld(S, i, b.comLocal), b.mass)); m += b.mass; }); c = V.sc(c, 1 / m);
    sph(c, 0.024 * H / 1.82, [1, 0.2, 0.85, 1]); push(c, [c[0], 0, c[2]], [1, 0.3, 0.9, 0.9]); push([c[0] - 0.05, 0.002, c[2]], [c[0] + 0.05, 0.002, c[2]], [1, 0.3, 0.9, 1]); push([c[0], 0.002, c[2] - 0.05], [c[0], 0.002, c[2] + 0.05], [1, 0.3, 0.9, 1]);
    labels.push({ p: V.add(c, [0.04, 0, 0]), t: `COM ${c[1].toFixed(3)} m`, c: "#f6c" }); }
  // anatomical joint axes (parent-attached frame A): twist red · flexion green · third blue
  if (ST.show.axes) for (const j of SPEC.joints) { if (ST.selJoint && ST.selJoint !== j.name && !(ST.selJoint.slice(0, -2) === j.name.slice(0, -2))) continue;
    const p = toWorld(S, j.parentIndex, V.sub(j.at, SPEC.bodies[j.parentIndex].origin)), Rp = S[j.parentIndex].rot, l = 0.09 * H / 1.82;
    const tw = Q.rot(S[j.childIndex].rot, Q.rot(Q.conj(j.Rz), j.anatAxes.x)), fl = Q.rot(Rp, j.anatAxes.y), th = Q.rot(Rp, j.anatAxes.z);
    push(p, V.add(p, V.sc(tw, l)), [1, 0.3, 0.3, 1]); push(V.sub(p, V.sc(fl, l)), V.add(p, V.sc(fl, l)), [0.3, 1, 0.3, 1]); if (!j.locked.includes("z")) push(p, V.add(p, V.sc(th, l * 0.8)), [0.35, 0.55, 1, 1]);
    labels.push({ p: V.add(p, V.sc(fl, l * 1.1)), t: `${j.name} ${j.def.axes.y.pos} axis`, c: "#7f7" }); }
  // joint limit cones: the child's distal direction swept over the engine box boundary (hard red, soft amber)
  if (ST.show.limits) for (const j of SPEC.joints) { if (ST.selJoint && ST.selJoint !== j.name) continue; drawLimits(j, S, push); }
  // dimensions
  if (ST.show.dims) dims(S, push, labels);
  // left / right identification
  if (ST.show.lr) for (const [n, t] of [["hand_L", "L"], ["hand_R", "R"], ["foot_L", "L"], ["foot_R", "R"]]) labels.push({ p: V.add(W[n].pos, [0, n.startsWith("foot") ? -0.03 : 0.08, n.startsWith("foot") ? 0.25 : 0]), t, c: t === "L" ? "#7aa7ff" : "#ff8a70", big: true });
  R.drawLines(L);
  // overlay text
  g2.clearRect(0, 0, ov.width, ov.height); const dpr = devicePixelRatio;
  for (const lb of labels) { const s = R.project(lb.p, ov.width, ov.height); if (!s) continue;
    g2.font = `${lb.big ? "bold 26" : lb.bold ? "bold 12" : "12"}px ${lb.italic ? "ui-serif, Georgia" : "ui-sans-serif, system-ui"}`.replace(/(\d+)px/, (m, x) => `${x * dpr}px`);
    if (lb.italic) g2.font = `italic ${11 * dpr}px ui-sans-serif, system-ui`;
    if (lb.bg) { const wdt = g2.measureText(lb.t).width; g2.fillStyle = "rgba(0,0,0,0.55)"; g2.fillRect(s[0] + 4, s[1] - 13 * dpr, wdt + 6, 16 * dpr); }
    g2.fillStyle = lb.c; g2.fillText(lb.t, s[0] + 6, s[1]); }
  g2.fillStyle = "rgba(255,255,255,0.75)"; g2.font = `${12 * dpr}px ui-sans-serif, system-ui`;
  g2.fillText(`${SPEC.human.id} · ${POSES[ST.pose].title} · view: anatomically correct (left-handed CCS; seen from the front the character's RIGHT is on your LEFT)`, 10 * dpr, 20 * dpr);
}
function drawLimits(j, S, push) {
  const Rp = S[j.parentIndex].rot, F1w = Q.mul(Rp, j.F1), p = toWorld(S, j.parentIndex, V.sub(j.at, SPEC.bodies[j.parentIndex].origin));
  const child = SPEC.bodies[j.childIndex], vLoc = child.distal ? V.sub(child.distal, child.origin) : /^foot/.test(child.name) ? [0, -0.04, child.boot.tipAheadAJC] : [0, child.length * 0.8, 0];
  const twC = Math.atan2(j.qCanon[0], j.qCanon[3]) * 2, pyr = (tw, sy, sz) => { const qt = Q.axis([1, 0, 0], tw), qs = Q.norm([0, Math.tan(sy / 2), Math.tan(sz / 2), 1]); return Q.norm(Q.mul(qs, qt)); };
  const dirAt = (sy, sz) => { const qc = Q.mul(Q.mul(F1w, pyr(twC, sy, sz)), Q.conj(j.F2)); return V.add(p, Q.rot(qc, vLoc)); };
  for (const [box, col] of [[j.limits.hard, [1, 0.25, 0.25, 0.95]], [j.limits.soft, [1, 0.75, 0.2, 0.9]]]) {
    const [y0, z0] = [box.lo[1], box.lo[2]], [y1, z1] = [box.hi[1], box.hi[2]], path = [];
    const N = 24; for (let i = 0; i <= N; i++) path.push([y0 + (y1 - y0) * i / N, z0]); for (let i = 0; i <= N; i++) path.push([y1, z0 + (z1 - z0) * i / N]);
    for (let i = 0; i <= N; i++) path.push([y1 - (y1 - y0) * i / N, z1]); for (let i = 0; i <= N; i++) path.push([y0, z1 - (z1 - z0) * i / N]);
    for (let i = 1; i < path.length; i++) push(dirAt(...path[i - 1]), dirAt(...path[i]), col);
    if (box === j.limits.hard) for (const [sy, sz] of [[y0, z0], [y1, z0], [y1, z1], [y0, z1]]) push(p, dirAt(sy, sz), [1, 0.3, 0.3, 0.35]); }
  push(p, toWorld(S, j.childIndex, vLoc), [1, 1, 1, 1]);
}
function dims(S, push, labels) {
  const Lm = SPEC.landmarks, H = SPEC.human.H, x0 = -0.55 * H / 1.82, c = [0.4, 0.9, 1, 1], tick = (y, t) => { push([x0 - 0.03, y, 0], [x0 + 0.03, y, 0], c); labels.push({ p: [x0 - 0.04, y, 0], t, c: "#8ef" }); };
  if (ST.pose === "canonical") {
    push([x0, 0, 0], [x0, Lm.yVERT, 0], c); tick(Lm.yVERT, `vertex ${Lm.yVERT.toFixed(3)} (H ${H} + sole ${Lm.sole})`); tick(Lm.ySJC, `SJC ${Lm.ySJC.toFixed(3)}`); tick(Lm.yH, `HJC ${Lm.yH.toFixed(3)}`); tick(Lm.yK, `KJC ${Lm.yK.toFixed(3)}`); tick(Lm.yA, `AJC ${Lm.yA.toFixed(3)}`); tick(0, "stud plane 0");
    const yh = Lm.yH - 0.02; push([-Lm.hipHalf, yh, 0.18], [Lm.hipHalf, yh, 0.18], c); labels.push({ p: [0, yh - 0.03, 0.18], t: `inter-HJC ${(2 * Lm.hipHalf).toFixed(3)} m`, c: "#8ef" });
    const ys = Lm.ySJC + 0.06; push([-Lm.shoulderHalf, ys, 0], [Lm.shoulderHalf, ys, 0], c); labels.push({ p: [0, ys + 0.02, 0], t: `inter-SJC ${(2 * Lm.shoulderHalf).toFixed(3)} m`, c: "#8ef" });
  }
  if (Math.abs(Math.sin(ST.cam.yaw / D)) < 0.5) return;                // foot dimensions are only legible in side-type views
  const fi = SPEC.bodies.findIndex(b => b.name === "foot_R"), ft = SPEC.bodies[fi], bt = ft.boot, y = -Lm.yA - 0.012, q = (z) => toWorld(S, fi, [0.075, y, z]);
  push(q(-bt.heelBehindAJC), q(bt.tipAheadAJC), c); for (const z of [-bt.heelBehindAJC, 0, bt.mtp1AheadAJC, bt.tipAheadAJC]) push(toWorld(S, fi, [0.075, y - 0.01, z]), toWorld(S, fi, [0.075, y + 0.012, z]), c);
  labels.push({ p: q(-bt.heelBehindAJC / 2), t: `heel ${(100 * bt.heelBehindAJC).toFixed(1)} cm`, c: "#8ef" }, { p: q(bt.mtp1AheadAJC / 2), t: `AJC→MTP1 ${(100 * bt.mtp1AheadAJC).toFixed(1)}`, c: "#8ef" },
    { p: q((bt.mtp1AheadAJC + bt.tipAheadAJC) / 2), t: `forefoot ${(100 * bt.tipAheadAJC).toFixed(1)} cm ahead`, c: "#8ef" }, { p: toWorld(S, fi, [0.075, y - 0.035, bt.tipAheadAJC * 0.3]), t: `boot ${(100 * bt.length).toFixed(1)} × ${(100 * bt.ballWidth).toFixed(1)} cm · AJC ${(100 * Lm.yA).toFixed(1)} cm up`, c: "#8ef" });
}
// ── panels ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const f3 = (v, n = 3) => v.map(x => x.toFixed(n)).join(", "), dg = (r) => (r * D).toFixed(1);
function renderPanels() {
  const nP = G0.checks.filter(c => c.pass).length, nF = G0.checks.length - nP;
  $("g0").innerHTML = `<div class="hdr ${nF ? "bad" : "ok"}">G0 (browser run, ${SPEC.human.id}): ${nP}/${G0.checks.length} pass${nF ? ` — ${nF} FAIL` : ""} · spec ${G0.specHash} · engine ${G0.engine.stateHash}/${G0.engine.readHash}</div>` +
    G0.checks.map(c => `<div class="chk ${c.pass ? "ok" : "bad"}"><b>${c.pass ? "PASS" : "FAIL"} ${c.id}</b> ${c.name}<br><span>${c.value}</span> <i>[${c.limit}]</i>${c.detail ? `<br><small>${c.detail}</small>` : ""}</div>`).join("");
  $("bodies").innerHTML = `<tr><th>body</th><th>mass kg</th><th>COM local (m)</th><th>I diag kg·m²</th><th>colliders</th><th>parent joint</th><th>bones</th></tr>` + SPEC.bodies.map(b =>
    `<tr data-b="${b.name}"><td>${b.name}</td><td>${b.mass.toFixed(3)}</td><td>${f3(b.comLocal)}</td><td>${f3([b.inertia[0][0], b.inertia[1][1], b.inertia[2][2]], 4)}</td><td>${b.shapes.map(s => s.type).join(" + ")}</td><td>${b.joint || "—"}</td><td>${b.bones.join(", ")}</td></tr>`).join("");
  $("joints").innerHTML = `<tr><th>joint</th><th>bodies</th><th>centre (m)</th><th>axis: + / − motion · hard [lo, hi]° · soft [lo, hi]° · capacity +/− N·m</th><th>ROM centre</th><th>damping</th></tr>` + SPEC.joints.map(j =>
    `<tr data-j="${j.name}"><td>${j.name}</td><td>${j.parent} → ${j.child}</td><td>${f3(j.at)}</td><td>${["x", "y", "z"].map((k, i) => { const ax = j.def.axes[k]; if (!ax) return ""; if (ax.locked) return `${k}: locked`;
      const cap = j.capacity[k]; return `${k}: ${ax.pos} / ${ax.neg} · [${dg(j.limits.hard.lo[i])}, ${dg(j.limits.hard.hi[i])}] · [${dg(j.limits.soft.lo[i])}, ${dg(j.limits.soft.hi[i])}] · ${cap ? cap.plus.Nm.toFixed(0) + " / " + cap.minus.Nm.toFixed(0) : "passive"}`; }).join("<br>")}</td>
      <td>${Object.entries(j.centreAnat).map(([k, v]) => `${k} ${(+v).toFixed(1)}`).join(", ")}</td><td>${j.damping}</td></tr>`).join("");
  $("bones").innerHTML = `<tr><th>#</th><th>bone</th><th>parent</th><th>Unity</th><th>class</th><th>driven by</th><th>T-pose position (m)</th></tr>` + BONES.map((b, i) =>
    `<tr><td>${i}</td><td>${b.name}</td><td>${b.parent || "—"}</td><td>${b.unity || "unmapped"}${b.unityRequired ? " ✱" : ""}</td><td style="color:${"#" + CLS_COL[b.cls].slice(0, 3).map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}">${b.cls}</td><td>${b.body}</td><td>${f3(SPEC.skeleton.positions[b.name])}</td></tr>`).join("");
  const m = G0.measures; $("meas").innerHTML = Object.entries(m).map(([k, v]) => `<tr><td>${k}</td><td>${Array.isArray(v) ? f3(v) : (+v).toFixed(4)}</td></tr>`).join("");
  for (const tr of document.querySelectorAll("#bodies tr[data-b]")) tr.onclick = () => { ST.sel = ST.sel === tr.dataset.b ? null : tr.dataset.b; dirty = true; };
  for (const tr of document.querySelectorAll("#joints tr[data-j]")) tr.onclick = () => { ST.selJoint = ST.selJoint === tr.dataset.j ? null : tr.dataset.j; ST.show.limits = ST.show.axes = !!ST.selJoint; $("t_limits").checked = $("t_axes").checked = !!ST.selJoint; dirty = true; };
}
// browser = Node determinism: every variation-set body's spec + engine hashes vs the Node run
function browserNodeCheck() {
  const el = $("hashcheck"); if (!NODE) { el.textContent = "Node results not found (run tools/g0_run.js)"; el.className = "bad"; return; }
  const rows = VARIATION_SET.map(h => { const r = h.id === ST.human ? G0 : g0Body(J, h, {}), n = NODE.runs.find(x => x.human.id === h.id);
    const ok = n && n.specHash === r.specHash && n.engine.stateHash === r.engine.stateHash && n.engine.readHash === r.engine.readHash; return { id: h.id, ok, b: `${r.specHash}/${r.engine.stateHash}/${r.engine.readHash}`, n: n ? `${n.specHash}/${n.engine.stateHash}/${n.engine.readHash}` : "—" }; });
  const all = rows.every(r => r.ok); el.className = all ? "ok" : "bad";
  el.innerHTML = `<b id="hash-status">${all ? "BROWSER = NODE" : "BROWSER ≠ NODE"}</b> (${rows.filter(r => r.ok).length}/${rows.length} bodies: spec / engine-state / readback hashes)<br>` + rows.map(r => `${r.ok ? "✓" : "✗"} ${r.id}: ${r.b}${r.ok ? "" : " vs Node " + r.n}`).join("<br>");
}
function orbitControls() {
  let drag = null; canvas.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; e.preventDefault(); };
  canvas.oncontextmenu = (e) => e.preventDefault(); window.onmouseup = () => { drag = null; };
  window.onmousemove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { const s = ST.cam.dist * 0.0015, yw = ST.cam.yaw / D, r = [-Math.cos(yw), 0, Math.sin(yw)]; ST.cam.target = V.add(V.add(ST.cam.target, V.sc(r, dx * s)), [0, dy * s, 0]); }
    else { ST.cam.yaw -= dx * 0.4; ST.cam.pitch = Math.max(-80, Math.min(89, ST.cam.pitch + dy * 0.3)); } dirty = true; };
  canvas.onwheel = (e) => { ST.cam.dist = Math.max(0.2, Math.min(9, ST.cam.dist * Math.exp(e.deltaY * 0.001))); dirty = true; e.preventDefault(); };
  window.onkeydown = (e) => { const k = { 1: "front", 2: "back", 3: "right", 4: "left", 5: "three", 6: "top" }[e.key]; if (k) { Object.assign(ST.cam, CAMS[k]); dirty = true; } };
}
function loop() { if (dirty) { dirty = false; frame(); } requestAnimationFrame(loop); }
window.addEventListener("resize", () => { dirty = true; });
// URL parameters for scripted captures: ?human=&pose=&cam=&focus=&show=a,b&hide=a,b
const qp = new URLSearchParams(location.search);
init().then(() => {
  if (qp.get("human")) { $("human").value = ST.human = qp.get("human"); build(); }
  if (qp.get("pose")) { $("pose").value = ST.pose = qp.get("pose"); }
  if (qp.get("focus")) focus(qp.get("focus")); if (qp.get("cam") && CAMS[qp.get("cam")]) Object.assign(ST.cam, CAMS[qp.get("cam")]);
  for (const k of (qp.get("show") || "").split(",").filter(Boolean)) { ST.show[k] = true; if ($("t_" + k)) $("t_" + k).checked = true; }
  for (const k of (qp.get("hide") || "").split(",").filter(Boolean)) { ST.show[k] = false; if ($("t_" + k)) $("t_" + k).checked = false; }
  if (qp.get("joint")) ST.selJoint = qp.get("joint"); dirty = true; document.body.dataset.ready = "1";
}).catch(e => { document.body.dataset.ready = "error"; $("hashcheck").textContent = "ERROR: " + (e && e.stack || e); console.error(e); });
