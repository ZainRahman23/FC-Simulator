// IFM-1 CLIP PREPARATION (prereg §11) — POST-FREEZE PRESENTATION TOOLING, added after run 3; it reads the run records and cannot affect any gate.
// For every rendered trajectory, this writes the per-frame rig pose (23 bone world matrices and skin matrices) for the frozen RUN-1 character renderer.
//   LEAD-IN (no physical stepping): RUN-1 exactly as the frozen viewer evaluates it (run1_viewer.js rv1Run1Eval: r1Replay + r1Evaluate of the frozen
//     RUN1_V13 engine at time t on the IFM-1 mover simAt), for τ = −250 ms … −h before the selected instant τ0 = tMid.
//   PHYSICAL RECORD: each V2 state (the frozen fixture's entry write at n = 0, then the run record after step n) rendered by the BOUND render rule
//     MC-1 §2(4) (record_hinged/RH1_PREREG.md, 50eae23a): rotation retarget — a mapped rig bone takes its V2 body's rotation through V2's bind
//     (q_bone = q_body · conj(Z0_body), the inverse of v2_lv2_map.js rawRotations with RUN-1's identity bind rotations); every unmapped bone (root, neck,
//     hair, clavicles, hands, toes) holds its τ0 local rotation (from RUN-1 at τ0); positions by the rig's own FK from the pelvis, the pelvis joint at
//     the V2 hip midpoint (the inverse of MC-1's pelvis rule). No blend, no smoothing, no root correction. The root bone (no mesh weight; checked
//     below) keeps its τ0 rotation and follows the authoritative mover.
//   WORLD: V2 local + the fixture's worldToLocal offset (one fixed transform). CAMERA: CAMERA_V1 on the authoritative mover (identical in every mode).
// Landmarks per frame (projected to pixels in the capture page by the frozen rv1GameCam / rv1Proj): the evaluator's struck-chain points
// (ifm1_eval.mjs geom / CHAIN_LM: V2 joint centres + the fixture witness carried by the target body) and the rendered rig joints of the struck chain.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node ifm1_clip_prep.mjs <runs dir> <out dir>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const L = await import(new URL("../scripts/ifm1_lib.mjs", import.meta.url).href), { V, Q, IFM1, ROLES, BODIES, MC, RA } = L;
const [RUNS, OUT] = process.argv.slice(2); fs.mkdirSync(path.join(OUT, "clipdata"), { recursive: true });
const FIX = JSON.parse(fs.readFileSync(path.join(RA, "ifm1/fixture/IFM1_FIXTURE.json"))), EVAL = JSON.parse(fs.readFileSync(path.join(RUNS, "IFM1_EVAL.json")));
const SUB = FIX.worldToLocal.subtract, toW = (p) => V.add(p, SUB), h = IFM1.h, rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f))));
const LV = L.loadLV2(), RG = L.rigOf(LV), SK = RG.SK, { A } = L.makeActor(LV), E = LV.E, M4 = LV.X.M4;
const INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([body, bone]) => [bone, body]));   // rig bone → V2 body (MC-1's MAP = CARRIER inverted)
const arr = (m) => Array.from(m), r6 = (x) => Math.round(x * 1e6) / 1e6;
// ── RUN-1 at time t: the frozen viewer's evaluation path ──
function run1At(t) { const restore = E.r1Replay(A, L.vOf, null, t), out = E.r1Evaluate(A, L.simAt(t));
  const o = { world: out.fk.world.map(arr), joint: out.fk.joint.map(arr), tip: out.fk.tip.map(arr), skin: arr(out.skinMats) }; restore(); return o; }
const qmat = (q, p) => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
  2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, p[0], p[1], p[2], 1]; };   // column-major 4×4 (anim3d layout)
// ── the bound render rule MC-1 §2(4) ──
function retarget(md, Sloc, tau0, rootX) {
  const Sw = Sloc.map(s => ({ pos: toW(s.pos), rot: s.rot })), q0 = tau0.world.map(MC.m2q), q = [], p = [], bi = md.bi;
  const offHip = V.sc(V.add(SK.byName.thigh_L.off, SK.byName.thigh_R.off), 0.5);
  for (const b of SK.bones) { const i = b.idx, vb = INV[b.name];
    if (!b.parent) { q[i] = q0[i]; p[i] = [MC.m2p(tau0.world[i])[0] + rootX, MC.m2p(tau0.world[i])[1], MC.m2p(tau0.world[i])[2]]; continue; }
    q[i] = vb != null ? Q.norm(Q.mul(Sw[bi(vb)].rot, Q.conj(md.Z0[bi(vb)].rot))) : Q.norm(Q.mul(q[b.parent.idx], Q.mul(Q.conj(q0[b.parent.idx]), q0[i])));
    p[i] = b.name === "pelvis" ? V.sub(V.add(Sw[0].pos, Q.rot(Sw[0].rot, V.sub(md.hipMid0, md.B[0].origin))), Q.rot(q[i], offHip)) : V.add(p[b.parent.idx], Q.rot(q[b.parent.idx], b.off)); }
  const world = SK.bones.map(b => qmat(q[b.idx], p[b.idx])), skin = [];
  SK.bones.forEach((b, i) => skin.push(...arr(M4.mul(world[i], SK.invBind[i]))));
  return { Sw, world, joint: p, tip: SK.bones.map(b => V.add(p[b.idx], Q.rot(q[b.idx], V.sc(b.dir, b.len)))), skin };
}
// ── evaluator landmark definitions (ifm1_eval.mjs geom, CHAIN_LM) ──
const CHAIN_LM = { SW: ["knee_R", "ankle_R"], PL: ["knee_L", "ankle_L"], TP: ["knee_L", "ankle_L"], SH: ["shoulder_L", "elbow_L", "wrist_L"] };
const RIG_LM = { knee_R: "shin_R", ankle_R: "foot_R", knee_L: "shin_L", ankle_L: "foot_L", shoulder_L: "upperArm_L", elbow_L: "foreArm_L", wrist_L: "hand_L" };
function geomLM(spec) { const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), loc = (i, p) => V.sub(p, B[i].origin), LM = {};
  for (const sd of ["L", "R"]) { LM["knee_" + sd] = { i: bi("shank_" + sd), l: [0, 0, 0] }; LM["ankle_" + sd] = { i: bi("foot_" + sd), l: [0, 0, 0] }; LM["shoulder_" + sd] = { i: bi("upperArm_" + sd), l: [0, 0, 0] };
    LM["elbow_" + sd] = { i: bi("forearm_" + sd), l: [0, 0, 0] }; LM["wrist_" + sd] = { i: bi("forearm_" + sd), l: loc(bi("forearm_" + sd), B[bi("forearm_" + sd)].distal) }; } return LM; }
const at = (S, i, l) => V.add(S[i].pos, Q.rot(S[i].rot, l));
// ── collider outlines (diagnostic overlay only) ──
function colliders(spec, Sw) { const out = [];
  spec.bodies.forEach((b, i) => b.shapes.forEach(s => { const X = L.shapeWorld(s, Sw[i]), P = (l) => V.add(X.p, Q.rot(X.q, l));
    if (s.type === "sphere") out.push({ t: "s", c: X.p, r: s.r });
    else if (s.type === "tapered" || s.type === "capsule") out.push({ t: "c", a: P([0, s.half, 0]), ra: s.type === "capsule" ? s.r : s.rTop, b: P([0, -s.half, 0]), rb: s.type === "capsule" ? s.r : s.rBot });
    else if (s.type === "box") { const e = s.he, c = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) c.push(P([sx * e[0], sy * e[1], sz * e[2]])); out.push({ t: "b", c }); }
    else if (s.type === "hull") out.push({ t: "h", c: s.points.map(P) }); }));
  return out.map(o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === "number" ? r6(v) : v))); }
// ── vertex weights on bones the render rule does not drive physically (reported) ──
const { ofCharViews } = require(path.join(LV.arch, "sandbox/visual/anim3d/of_character.js"));
const rigJ = JSON.parse(fs.readFileSync(path.join(LV.arch, "assets/characters/outfield/vinicius/rig.json"))), mesh = ofCharViews(fs.readFileSync(path.join(LV.arch, "assets/characters/outfield/vinicius/mesh.bin")).buffer.slice(0), rigJ.mesh.layout);
const wsum = new Array(SK.bones.length).fill(0); for (let v = 0; v < mesh.weights.length / 4; v++) for (let k = 0; k < 4; k++) wsum[mesh.joints[v * 4 + k]] += mesh.weights[v * 4 + k];
const nV = mesh.weights.length / 4, meshWeights = Object.fromEntries(SK.bones.map((b, i) => [b.name, { vertexWeightShare: r6(wsum[i] / nV), driven: b.parent ? (INV[b.name] ? "V2 body " + INV[b.name] : "held τ0 local rotation") : "root (τ0 rotation, authoritative mover)" }]));
// ── states: lead-in, τ0 reference and consistency with the fixture ──
const meta = { tool: "ifm1_clip_prep.mjs", note: "post-freeze presentation tooling (prereg §11); reads run records only", renderRule: "MC-1 §2(4) (record_hinged/RH1_PREREG.md, 50eae23a)", worldToLocal: FIX.worldToLocal,
  fps: IFM1.render.fps, leadInMs: IFM1.render.leadInMs, h, meshWeights, states: {}, clips: [] };
const tau0 = {}, lead = {};
for (const sid of ["S-FLAT", "S-TOE"]) { const st = FIX.states[sid], t0 = st.tMid; tau0[sid] = run1At(t0);
  const fxErr = Math.max(...st.joints.map((j, i) => V.dist(j.position, tau0[sid].joint[i]))), rig = Math.max(...SK.bones.filter(b => b.parent).map(b => { const pw = tau0[sid].world[b.parent.idx], pr = [pw[12], pw[13], pw[14]], qp = MC.m2q(pw); return V.dist(V.add(pr, Q.rot(qp, b.off)), tau0[sid].joint[b.idx]); }));
  const fr = (k, hz) => { const t = t0 - IFM1.render.leadInMs / 1000 + k / hz, r = run1At(t); return { tauMs: r6((t - t0) * 1000), simX: L.simAt(t).x, skin: r.skin.map(r6), joint: r.joint.map(p => p.map(r6)), tip: r.tip.map(p => p.map(r6)), world: r.world.map(m => m.map(r6)) }; };
  lead[sid] = { f60: Array.from({ length: 15 }, (_, k) => fr(k, 60)), f240: Array.from({ length: 60 }, (_, k) => fr(k, 240)) };
  meta.states[sid] = { tMid: t0, run1VsFixtureJointsM: fxErr, run1RigChainResidualM: rig, tau0: { joint: tau0[sid].joint, tip: tau0[sid].tip } };
  fs.writeFileSync(path.join(OUT, "clipdata", `LEAD_${sid}.json`), JSON.stringify(lead[sid]));
  console.log(`${sid}: τ0 ${t0.toFixed(6)} s · RUN-1 joints vs fixture ${fxErr.toExponential(2)} m · RUN-1 rig chain residual ${rig.toExponential(2)} m`); }
// ── trajectories ──
const jobs = [];
for (const b of BODIES) for (const sid of ["S-FLAT", "S-TOE"]) jobs.push({ id: `C0_${b}_${sid}`, file: `C0_${b}_${sid}.json.gz`, body: b, state: sid, mode: "C0", role: null });
for (const r of ROLES) for (const b of BODIES) for (const m of ["N", "W", "X"]) if (fs.existsSync(path.join(RUNS, `${m}_${r.id}_${b}.json.gz`))) jobs.push({ id: `${m}_${r.id}_${b}`, file: `${m}_${r.id}_${b}.json.gz`, body: b, state: r.state, mode: m, role: r.id });
for (const j of jobs) {
  const run = rd(j.file), spec = L.SPECS[j.body](), md = MC.model(spec), LM = geomLM(spec), entry = FIX.entries[`${j.body}/${j.state}`], t0 = FIX.states[j.state].tMid;
  const roles = j.role ? [j.role] : ROLES.filter(r => r.state === j.state).map(r => r.id);   // a control carries the landmarks of every role of its state
  const ctl = EVAL.controls[`${j.body}/${j.state}`], tone = ctl.toneTruncation ? ctl.toneTruncation.t : Infinity, cSec = ctl.mechanics.secondaryFailure ? ctl.mechanics.secondaryFailure.t : Infinity;
  const cell = j.role ? EVAL.cells[`${j.role}/${j.body}`] : null, own = cell && cell[j.mode] && cell[j.mode].mechanics ? cell[j.mode].mechanics.secondaryFailure : null;
  const healthyUntil = Math.min(tone, cSec);
  const frames = [];
  for (let n = 0; n <= IFM1.stepsTotal; n++) {
    const rec = n === 0 ? null : run.recs[n - 1]; if (n > 0 && !rec) { frames.push({ n, missing: true }); continue; }
    const S = n === 0 ? entry.write.poses : rec.S, R = retarget(md, S, tau0[j.state], IFM1.v * n * h), Sw = R.Sw;
    const lm = {}, lmR = {};
    for (const rid of roles) { const fx = FIX.fixtures[`${rid}/${j.body}`], ti = spec.bodies.findIndex(b => b.name === fx.target.body);
      lm[rid] = Object.fromEntries([["witness", at(Sw, ti, fx.witnessLocal)], ...CHAIN_LM[rid].map(k => [k, at(Sw, LM[k].i, LM[k].l)])].map(([k, v]) => [k, v.map(r6)]));
      lmR[rid] = Object.fromEntries(CHAIN_LM[rid].map(k => [k, R.joint[SK.byName[RIG_LM[k]].idx].map(r6)])); }
    const imp = j.mode === "C0" ? null : n === 0 ? toW(FIX.fixtures[`${j.role}/${j.body}`].centre) : toW(rec.imp.pos);
    const opp = rec ? rec.contacts.filter(c => c.kind === "opponent").map(c => ({ n: c.n, Jn: c.Jn, points: c.points.map(p => toW(p.p).map(r6)) })) : [];
    frames.push({ n, tauMs: r6(n * h * 1000), simX: L.simAt(t0 + n * h).x, skin: R.skin.map(r6), joint: R.joint.map(p => p.map(r6)), tip: R.tip.map(p => p.map(r6)), world: R.world.map(m => m.map(r6)),
      imp: imp && imp.map(r6), lm, lmR, colliders: colliders(spec, Sw), opp, outsideControl: n * h > healthyUntil + 1e-12, afterOwnSecondary: !!(own && n * h >= own.t - 1e-12) });
  }
  const c = { id: j.id, body: j.body, state: j.state, mode: j.mode, role: j.role, source: j.file, status: run.status, stop: run.stop, finalHash: run.finalHash, healthyControlUntilMs: healthyUntil * 1000,
    healthyReason: tone <= cSec ? `C0 SnapshotTone reference truncated at ${(tone * 1000).toFixed(1)} ms (${ctl.toneTruncation.joint})` : `C0 secondary failure at ${(cSec * 1000).toFixed(1)} ms`,
    ownSecondaryFailure: own, cellStatus: cell ? cell.status : [ctl.status, ctl.handoff.label], frames: frames.length };
  meta.clips.push(c); fs.writeFileSync(path.join(OUT, "clipdata", `${j.id}.json`), JSON.stringify({ ...c, frames }));
  // entry continuity (n = 0 vs RUN-1 at τ0): every rig joint, metres
  const f0 = frames[0], e = SK.bones.map(b => V.dist(f0.joint[b.idx], tau0[j.state].joint[b.idx])), et = SK.bones.map(b => V.dist(f0.tip[b.idx], tau0[j.state].tip[b.idx]));
  c.entryVsRun1Tau0 = { maxJointM: Math.max(...e), maxJointBone: SK.bones[e.indexOf(Math.max(...e))].name, maxTipM: Math.max(...et), maxTipBone: SK.bones[et.indexOf(Math.max(...et))].name };
  console.log(`${j.id}: ${frames.length} frames · healthy control to ${(healthyUntil * 1000).toFixed(1)} ms · entry vs RUN-1 τ0 max joint ${(c.entryVsRun1Tau0.maxJointM * 1000).toFixed(1)} mm (${c.entryVsRun1Tau0.maxJointBone}), tip ${(c.entryVsRun1Tau0.maxTipM * 1000).toFixed(1)} mm (${c.entryVsRun1Tau0.maxTipBone})`);
}
meta.bones = SK.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.name : null }));
fs.writeFileSync(path.join(OUT, "clip_meta.json"), JSON.stringify(meta, null, 1));
console.log("mesh weight share:", Object.entries(meshWeights).filter(([, w]) => w.vertexWeightShare > 0 && !w.driven.startsWith("V2")).map(([k, w]) => `${k} ${(w.vertexWeightShare * 100).toFixed(2)}%`).join(", "));
