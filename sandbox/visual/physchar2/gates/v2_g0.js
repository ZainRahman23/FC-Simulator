// ═══ physchar2/gates/v2_g0.js — V2-G0: anatomy / static construction gate (spec §22 G0 + the user's G0 brief) ═══════════════════════
// No active control, no gravity stepping of a standing body. Jolt is used to BUILD the character, READ BACK every parameter, query
// collider contacts at static poses, and take one zero-gravity step that must produce zero motion. Every check has a declared tolerance and
// fails loudly. Runs identically in Node (tools/g0_run.js) and the browser review page.
import { V, Q, hashNums } from "../core/v2_math.js";
import { V2JoltWorld, G0_WORLD } from "../core/v2_jolt.js";
import { generateSpec, specJSON, specHash, fnv1a } from "../spec/v2_spec.js";
import { V2_REF, V1_MATCHED, VARIATION_SET, DE_LEVA, EQUIP, PROFILE } from "../spec/v2_human.js";
import { BONES, UNITY_REQUIRED, TOUCHLINE_REQUIRED_OPTIONAL, UNITY_PARENT, mirrorName, mirrorPos, mirrorQuat, mirroredCopy } from "../spec/v2_skeleton.js";
import { decompose, constraintParams, childRotation, passiveTorque, anatomicalAngles } from "../spec/v2_joints.js";
import { wholeBody } from "../spec/v2_body.js";
import { POSES, REFERENCE_POSES, posedBodies, toWorld } from "../spec/v2_pose.js";
import { bindData, evaluateSkeleton, chainResidual } from "../map/v2_render_map.js";
import { fOmega, activationStep, CAPACITY } from "../spec/v2_actuators.js";

const D = 180 / Math.PI, R = Math.PI / 180;
// declared tolerances (every one is reported with its check)
export const TOL = {
  mass: 1e-9, fraction: 1e-12, inertiaSym: 1e-12, triangleMargin: 0.01, comHband: [0.55, 0.58], comAP: 0.01,
  inertiaBandREF: { pitch: [11, 14], roll: [11, 14], yaw: [1.0, 1.5] }, interHJC: [0.090, 0.110], interSJCrel: 0.10,
  roundTrip: 1e-9, chain: 1e-9, specPos: 1.5e-4, specMass: 1e-4, specInertia: 2e-5, canonicalMarginDeg: 5, singularityMarginDeg: 20,
  overlapM: 0.001, groundM: 0.0005, otherAboveGroundM: 0.03, readRel: 1e-5, readM: 1e-6, readRad: 1e-6, qCSRad: 1e-5, zeroMotionM: 1e-6, zeroMotionRad: 1e-6,
  mirror: 1e-12, headTol: [-0.015, 0.005], limbTol: [-0.010, 0.003], trunkTol: [-0.020, 0.005], bootTol: 0.005, sjcDropMax: 0.015,
};
const sub = V.sub, add = V.add, dist = V.dist;
const eig3 = (I) => {                                    // symmetric 3×3 eigenvalues (validation only)
  const a = I[0][0], b = I[1][1], c = I[2][2], d = I[0][1], e = I[1][2], f = I[0][2], p1 = d * d + e * e + f * f;
  if (p1 < 1e-30) return [a, b, c].sort((x, y) => x - y);
  const q = (a + b + c) / 3, p2 = (a - q) ** 2 + (b - q) ** 2 + (c - q) ** 2 + 2 * p1, p = Math.sqrt(p2 / 6);
  const B = [[(a - q) / p, d / p, f / p], [d / p, (b - q) / p, e / p], [f / p, e / p, (c - q) / p]];
  const det = B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) - B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) + B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
  const r = Math.max(-1, Math.min(1, det / 2)), phi = Math.acos(r) / 3, e1 = q + 2 * p * Math.cos(phi), e3 = q + 2 * p * Math.cos(phi + 2 * Math.PI / 3);
  return [e3, 3 * q - e1 - e3, e1].sort((x, y) => x - y);
};
// well-conditioned rotation angle between two quaternions (2·acos(|dot|) amplifies float32 rounding near 1)
const qAngle = (a, b) => { const d = Q.mul(Q.conj(a), b); return 2 * Math.atan2(Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]), Math.abs(d[3])); };
const fmt = (x, n = 4) => (typeof x === "number" ? +x.toFixed(n) : x);

// ── one body: every spec-level and engine-level check ─────────────────────────────────────────────────────────────────────────────────
export function g0Body(J, human, opts = {}) {
  const checks = [], add_ = (id, name, pass, value, limit, detail, reportOnly) => checks.push({ id, name, pass: !!pass, value, limit, detail, reportOnly: !!reportOnly });
  const S = generateSpec(human), H = human.H, M = human.M, L = S.landmarks, sole = L.sole;
  const byName = Object.fromEntries(S.bodies.map(b => [b.name, b])), J_ = Object.fromEntries(S.joints.map(j => [j.name, j]));
  // 0.1 determinism of the generator (×3)
  const hashes = [specHash(S), specHash(generateSpec(human)), specHash(generateSpec(human))];
  add_("0.1", "spec generation deterministic (×3 identical hash)", hashes.every(h => h === hashes[0]), hashes.join(" "), "identical");
  // 0.2 mass bookkeeping
  const equip = 2 * EQUIP.boot + 2 * EQUIP.shinPad + EQUIP.kitUpper + EQUIP.kitLower;
  add_("0.2a", "total mass = M + equipment", Math.abs(S.totals.mass - (M + equip)) <= TOL.mass, fmt(S.totals.mass, 9), `${M} + ${equip.toFixed(2)} ± ${TOL.mass}`);
  add_("0.2b", "segment mass sum = M (body only)", Math.abs(S.totals.massBody - M) <= TOL.mass, fmt(S.totals.massBody, 9), `${M} ± ${TOL.mass}`);
  const fracOf = { pelvis: ["LPT"], abdomen: ["MPT"], thorax: ["UPT"], head: ["head"], upperArm: ["upperArm"], forearm: ["forearm", "hand"], thigh: ["thigh"], shank: ["shank"], foot: ["foot"] };
  let worstFrac = 0, wf = "";
  for (const b of S.bodies) { const segs = fracOf[b.name.replace(/_[LR]$/, "")], expect = segs.reduce((s, k) => s + DE_LEVA[k].m / 100 * M, 0), e = Math.abs(b.massBody - expect) / expect; if (e > worstFrac) { worstFrac = e; wf = b.name; } }
  add_("0.2c", "every segment = de Leva fraction × M (relative error)", worstFrac <= TOL.fraction, worstFrac.toExponential(2) + (wf ? " (" + wf + ")" : ""), `≤ ${TOL.fraction}`);
  // 0.3 inertia realisability
  let worstSym = 0, minEig = Infinity, minTri = Infinity, tri = "";
  for (const b of S.bodies) { const I = b.inertia; worstSym = Math.max(worstSym, Math.abs(I[0][1] - I[1][0]), Math.abs(I[0][2] - I[2][0]), Math.abs(I[1][2] - I[2][1]));
    const ev = eig3(I); minEig = Math.min(minEig, ev[0]); const m = (ev[0] + ev[1] - ev[2]) / ev[2]; if (m < minTri) { minTri = m; tri = b.name; } }
  add_("0.3a", "inertia tensors symmetric", worstSym <= TOL.inertiaSym, worstSym.toExponential(2), `≤ ${TOL.inertiaSym}`);
  add_("0.3b", "inertia tensors positive definite (min principal moment)", minEig > 0, minEig.toExponential(3) + " kg·m²", "> 0");
  add_("0.3c", "triangle inequality I_a + I_b ≥ I_c with margin", minTri >= TOL.triangleMargin, `${(100 * minTri).toFixed(2)} % (${tri})`, `≥ ${100 * TOL.triangleMargin} %`);
  // 0.4 whole-body COM
  const down = posedBodies(S, {}), wbDown = wholeBody(S.bodies, down, true), wbDownEq = wholeBody(S.bodies, down, false), wbCan = wholeBody(S.bodies);
  const comH = (wbDown.com[1] - sole) / H, comHeq = (wbDownEq.com[1] - sole) / H;
  const population = (human.kind || "population") === "population";   // spec §22 0.12 as amended (C2): population bands apply to population bodies only
  if (population) add_("0.4a", "standing arms-down COM height, barefoot-equivalent (no equipment) — population band", comH >= TOL.comHband[0] && comH <= TOL.comHband[1], comH.toFixed(4) + " H", `${TOL.comHband[0]}–${TOL.comHband[1]} H`, `with equipment ${comHeq.toFixed(4)} H; canonical T-pose COM y = ${wbCan.com[1].toFixed(4)} m`);
  else add_("0.4a-R", "standing arms-down COM height — REPORTED (morphology variant: population band not applicable, spec §22 0.12 / C2)", true, comH.toFixed(4) + " H", "report only", `population band ${TOL.comHband[0]}–${TOL.comHband[1]} H is for normally proportioned bodies`, true);
  add_("0.4b", "canonical COM AP within ±1 cm of the ankle line", Math.abs(wbCan.com[2]) <= TOL.comAP, (100 * wbCan.com[2]).toFixed(2) + " cm", `|z| ≤ ${100 * TOL.comAP} cm`, `x = ${wbCan.com[0].toExponential(1)} m`);
  // 0.5 whole-body inertia (arms down, no equipment) — band defined at V2-REF size, scaled ∝ M·H²
  const sc = (M * H * H) / (V2_REF.M * V2_REF.H * V2_REF.H), Iw = wbDown.I, band = TOL.inertiaBandREF;
  const inB = (v, b) => v >= b[0] * sc && v <= b[1] * sc;
  if (population) add_("0.5", "whole-body inertia about COM in the literature band (Santschi 1963, recalled; scaled ∝ M·H²) — population band", inB(Iw[0][0], band.pitch) && inB(Iw[2][2], band.roll) && inB(Iw[1][1], band.yaw),
    `pitch ${Iw[0][0].toFixed(2)} · roll ${Iw[2][2].toFixed(2)} · yaw ${Iw[1][1].toFixed(3)} kg·m²`, `pitch/roll ${(band.pitch[0] * sc).toFixed(1)}–${(band.pitch[1] * sc).toFixed(1)}, yaw ${(band.yaw[0] * sc).toFixed(2)}–${(band.yaw[1] * sc).toFixed(2)}`,
    `independent de Leva assembly (research pass, 1.82 m / 78 kg): 13.2 / 14.0 / 1.1`);
  else add_("0.5-R", "whole-body inertia about COM — REPORTED (morphology variant: population band not applicable, spec §22 0.12 / C2)", true,
    `pitch ${Iw[0][0].toFixed(2)} · roll ${Iw[2][2].toFixed(2)} · yaw ${Iw[1][1].toFixed(3)} kg·m²`, "report only", `population band at this size: pitch/roll ${(band.pitch[0] * sc).toFixed(1)}–${(band.pitch[1] * sc).toFixed(1)}, yaw ${(band.yaw[0] * sc).toFixed(2)}–${(band.yaw[1] * sc).toFixed(2)}`, true);
  // 0.4c requested morphology realised (every body; the internal-consistency check C2 requires for variants)
  { const ov = human.overrides || {}, ls = ov.legScale ?? 1, as = ov.armScale ?? 1;
    const legOK = Math.abs(L.legLength - (PROFILE.hipH - PROFILE.ankleH) * H * ls) < 1e-12, statOK = Math.abs(L.yVERT - sole - H) < 1e-12;
    const c7OK = Math.abs((L.yCERV - sole) - (1 - 242.9 / 1741) * H) < 1e-12, armOK = Math.abs(L.segLen.upperArm - 281.7 / 1741 * H * as) < 1e-12 && Math.abs(L.segLen.forearm - 268.9 / 1741 * H * as) < 1e-12;
    const trunk = (L.yCERV - L.yH), trunkRef = (1 - 242.9 / 1741) * H - (PROFILE.hipH + (PROFILE.hipH - PROFILE.ankleH) * (ls - 1)) * H - sole + sole;
    add_("0.4c", "requested morphology realised exactly (stature, leg length × legScale, trunk refit keeping C7, arm lengths × armScale)", legOK && statOK && c7OK && armOK,
      `stature ${(L.yVERT - sole).toFixed(4)} m, leg ${(L.legLength / H).toFixed(4)} H (legScale ${ls}), C7 ${((L.yCERV - sole) / H).toFixed(4)} H, HJC→C7 ${(trunk / H).toFixed(4)} H`, "exact", Math.abs(trunk - trunkRef) < 1e-12 ? "" : "trunk refit residual " + (trunk - trunkRef).toExponential(1)); }
  // 0.6 joint-centre geometry + generated height
  const interHJC = 2 * L.hipHalf / H, interSJC = 2 * L.shoulderHalf / H, sjcExpect = 2 * PROFILE.shoulderHalf;
  add_("0.6a", "inter-HJC distance", interHJC >= TOL.interHJC[0] && interHJC <= TOL.interHJC[1], `${interHJC.toFixed(4)} H = ${(2 * L.hipHalf).toFixed(3)} m`, `${TOL.interHJC[0]}–${TOL.interHJC[1]} H`);
  add_("0.6b", "inter-SJC distance within ±10 % of the spec value", Math.abs(interSJC - sjcExpect) / sjcExpect <= TOL.interSJCrel, `${interSJC.toFixed(4)} H = ${(2 * L.shoulderHalf).toFixed(3)} m`, `${sjcExpect.toFixed(3)} H ± 10 %`);
  add_("0.6c", "generated stature: vertex landmark − sole = H", Math.abs(L.yVERT - sole - H) <= 1e-12, (L.yVERT - sole).toFixed(6) + " m", `${H} m exact`, `stature closure (HJC + de Leva trunk + head − H) = ${(1000 * L.closure).toFixed(1)} mm`);
  const hdS = byName.head.shapes[0], headTop = byName.head.origin[1] + Math.max(hdS.pos[1], byName.head.shapes[1].pos[1]) + hdS.r;   // AP sphere pair (C4): top = centre + r
  add_("0.6d", "collider stature: top of the head collider vs vertex", headTop - L.yVERT >= TOL.headTol[0] && headTop - L.yVERT <= TOL.headTol[1], (1000 * (headTop - L.yVERT)).toFixed(1) + " mm", "−15 … +5 mm");
  const sjcDrop = (PROFILE.sjcH - 0.818) * H;
  add_("0.6e", "segment lengths = profile fractions (leg = 0.476 H, thigh / shank / upper arm / forearm)", Math.abs(L.legLength - (PROFILE.hipH - PROFILE.ankleH) * H * (human.overrides?.legScale ?? 1)) < 1e-12 && Math.abs(L.segLen.upperArm - 281.7 / 1741 * H * (human.overrides?.armScale ?? 1)) < 1e-12,
    `leg ${L.legLength.toFixed(4)} m (${(L.legLength / H).toFixed(4)} H), thigh ${L.segLen.thigh.toFixed(4)}, shank ${L.segLen.shank.toFixed(4)}, upper arm ${L.segLen.upperArm.toFixed(4)}, forearm ${L.segLen.forearm.toFixed(4)}`, "exact", `SJC ${(1000 * -sjcDrop).toFixed(1)} mm below the Drillis acromion height`);
  // 0.7 skeleton: hierarchy, Unity mapping, round trip
  const names = BONES.map(b => b.name), uniq = new Set(names).size === names.length, roots = BONES.filter(b => !b.parent);
  const parentFirst = BONES.every((b, i) => !b.parent || names.indexOf(b.parent) < i), allParents = BONES.every(b => !b.parent || names.includes(b.parent));
  const twistLeaves = BONES.filter(b => b.cls === "DEFORM").every(b => !BONES.some(c => c.parent === b.name));
  const noHipBones = !names.some(n => /^hip_[LR]$|heel/.test(n));
  add_("0.7a", "semantic hierarchy valid (31 bones, unique, one root, parent-first, twist branches are leaves, no hip_L/R or heel bones)",
    BONES.length === 31 && uniq && roots.length === 1 && roots[0].name === "root" && parentFirst && allParents && twistLeaves && noHipBones,
    `${BONES.length} bones, root '${roots.map(r => r.name)}'`, "31 / valid");
  const mapped = BONES.filter(b => b.unity), sem = mapped.map(b => b.unity), dup = sem.length !== new Set(sem).size;
  const missingReq = UNITY_REQUIRED.filter(u => !sem.includes(u)), missingOpt = TOUCHLINE_REQUIRED_OPTIONAL.filter(u => !sem.includes(u));
  const nearestMapped = (b) => { let p = BONES.find(x => x.name === b.parent); while (p && !p.unity) p = BONES.find(x => x.name === p.parent); return p ? p.unity : null; };
  const badAncestry = mapped.filter(b => UNITY_PARENT[b.unity] && nearestMapped(b) !== UNITY_PARENT[b.unity]).map(b => `${b.name}:${nearestMapped(b)}≠${UNITY_PARENT[b.unity]}`);
  add_("0.7b", "Unity Humanoid mapping complete (15 required + Touchline-required Chest/UpperChest/Neck/Shoulders/Toes), unique, hierarchy-consistent; root unmapped",
    !dup && !missingReq.length && !missingOpt.length && !badAncestry.length && !BONES.find(b => b.name === "root").unity,
    `${mapped.length} mapped (${UNITY_REQUIRED.length - missingReq.length}/15 required, ${TOUCHLINE_REQUIRED_OPTIONAL.length - missingOpt.length}/7 Touchline-required)`, "complete",
    [missingReq.length ? "missing " + missingReq : "", missingOpt.length ? "missing " + missingOpt : "", badAncestry.join(", ")].filter(Boolean).join("; "));
  const bodyDrives = S.bodies.map(b => BONES.filter(x => x.body === b.name).length), classes = new Set(["DIRECT", "AIM", "PROC", "DEFORM", "DERIVED"]);
  add_("0.7c", "every bone has one driver class; every body drives ≥ 1 bone", BONES.every(b => classes.has(b.cls) && byName[b.body]) && bodyDrives.every(n => n >= 1), `min bones per body ${Math.min(...bodyDrives)}`, "≥ 1");
  const bind = bindData(S), canon = S.bodies.map(b => ({ pos: b.origin.slice(), rot: [0, 0, 0, 1] })), W0 = evaluateSkeleton(S, bind, canon);
  let rtP = 0, rtR = 0; for (const b of BONES) { rtP = Math.max(rtP, dist(W0[b.name].pos, b.name === "root" ? [canon[0].pos[0], 0, canon[0].pos[2]] : S.skeleton.positions[b.name])); rtR = Math.max(rtR, qAngle(W0[b.name].rot, b.name === "root" ? [0, 0, 0, 1] : S.skeleton.frames[b.name].q)); }
  add_("0.7d", "skeleton round trip: canonical bodies → 31 bones reproduce §6 positions and local-axis frames", rtP <= TOL.roundTrip && rtR <= TOL.roundTrip, `${rtP.toExponential(2)} m / ${rtR.toExponential(2)} rad`, `≤ ${TOL.roundTrip}`);
  // mapping at every reference pose + a heel-raised foot (toe rule) + AIM / DEFORM twist fractions
  let chainW = { worst: 0, at: null }, directW = 0;
  for (const pk of REFERENCE_POSES) { const St = posedBodies(S, POSES[pk].angles), W = evaluateSkeleton(S, bind, St), cr = chainResidual(bind, W); if (cr.worst > chainW.worst) chainW = { worst: cr.worst, at: pk + " " + cr.at };
    for (const b of BONES) if (b.cls === "DIRECT") { const d = bind[b.name], s = St[d.body], p = add(s.pos, Q.rot(s.rot, d.offsetPos)); directW = Math.max(directW, dist(p, W[b.name].pos)); } }
  add_("0.7e", "physics→render mapping consistent at the 7 reference poses (rigid bind chain; DIRECT bones exact)", chainW.worst <= TOL.chain && directW <= TOL.chain, `${chainW.worst.toExponential(2)} m (${chainW.at || "—"})`, `≤ ${TOL.chain} m`, "root→hips translation is free by design");
  // the AIM bone carries a fraction of the child body's twist measured about the BONE's own axis (the neck bone points C7 → skull base, ~10° from vertical)
  const twistOf = (rel, ax) => 2 * Math.atan2(V.dot([rel[0], rel[1], rel[2]], ax), rel[3]) * D;
  const twistTest = (jn, ang, bone, parentBone, childBody, parentBody, frac) => { const a = {}; a[jn] = ang; const St = posedBodies(S, Object.assign({}, POSES.canonical.angles, a)), W = evaluateSkeleton(S, bind, St);
    const dB = Q.mul(W[bone].rot, Q.conj(bind[bone].canonRot)), dP = Q.mul(W[parentBone].rot, Q.conj(bind[parentBone].canonRot)), ax = bind[bone].axis;
    const relBodies = Q.norm(Q.mul(Q.conj(St[byName[parentBody].index].rot), St[byName[childBody].index].rot));
    return { tw: twistOf(Q.norm(Q.mul(Q.conj(dP), dB)), ax), expect: frac * twistOf(relBodies, ax) }; };
  const t1 = twistTest("thoracic", { rot: 20 }, "spine_02", "spine_01", "thorax", "abdomen", 0.5), t2 = twistTest("neck", { rot: 30 }, "neck", "spine_03", "head", "thorax", 0.27);
  add_("0.7f", "AIM twist split about the bone axis: spine_02 = 50 % of the thorax twist; neck = 27 % of the head twist", Math.abs(t1.tw - t1.expect) < 1e-9 && Math.abs(t2.tw - t2.expect) < 1e-9 && Math.abs(t1.expect - 10) < 1e-9,
    `spine_02 ${t1.tw.toFixed(4)}° (expect ${t1.expect.toFixed(4)}° of a 20° thoracic rotation); neck ${t2.tw.toFixed(4)}° (expect ${t2.expect.toFixed(4)}° of a 30° cervical rotation about vertical)`, "≤ 1e-9°");
  const tt = (() => { const St = posedBodies(S, Object.assign({}, POSES.canonical.angles, { hip_R: { rot: 20 } })), W = evaluateSkeleton(S, bind, St);
    const dB = Q.mul(W.thigh_twist_R.rot, Q.conj(bind.thigh_twist_R.canonRot)), dG = Q.mul(W.hips.rot, Q.conj(bind.hips.canonRot)), rel = Q.norm(Q.mul(Q.conj(dG), dB)), ax = bind.upperLeg_R.axis;
    return Math.abs(2 * Math.atan2(V.dot([rel[0], rel[1], rel[2]], ax), rel[3]) * D); })();
  add_("0.7g", "DEFORM twist branch: thigh_twist carries 50 % of a 20° hip axial rotation", Math.abs(tt - 10) < 1e-6, `${tt.toFixed(4)}°`, "10°");
  const toe = (() => {                                   // heel raised 20° about the MTP line: the PROC toe keeps the toe tip on the turf
    const St = posedBodies(S, Object.assign({}, POSES.canonical.angles, { ankle_R: { df: -20 } })), fi = byName.foot_R.index;
    const mtpW = toWorld(St, fi, sub(S.skeleton.positions.toe_R, byName.foot_R.origin)), drop = mtpW[1] - (sole + PROFILE.mtpHeight * L.footLength);
    const St2 = St.map(s => ({ pos: s.pos.slice(), rot: s.rot.slice() })); St2[fi].pos[1] -= drop;          // lower the foot so the MTP sits at its canonical height
    const W = evaluateSkeleton(S, bind, St2), tip = add(W.toe_R.pos, Q.rot(Q.mul(W.toe_R.rot, Q.conj(bind.toe_R.canonRot)), sub(S.toeTip.R, S.skeleton.positions.toe_R)));
    return { df: W.toe_R.toeDF * D, tipY: tip[1], canonDF: evaluateSkeleton(S, bind, canon).toe_R.toeDF * D }; })();
  add_("0.7h", "PROC toe (rigid F0 foot): 0° at canonical; heel raised 20° → toes dorsiflex so the render toe tip lies on the turf", toe.canonDF === 0 && toe.df > 0 && Math.abs(toe.tipY) <= 0.001,
    `canonical ${toe.canonDF}°, heel-up ${toe.df.toFixed(2)}°, tip y ${(1000 * toe.tipY).toFixed(2)} mm`, "0° · > 0° · |tip y| ≤ 1 mm");
  // 0.8 chirality + mirror operator
  const P0 = S.skeleton.positions, chir = (pos) => pos.upperLeg_R[0] > 0 && pos.hand_R[0] > 0 && pos.foot_R[0] > 0 && pos.upperLeg_L[0] < 0;
  const yaw = Q.axis([0, 1, 0], 90 * R), footR = Q.rot(yaw, byName.foot_R.origin), facing = Q.rot(yaw, [0, 0, 1]), pitchY = -footR[2], pitchFacingX = facing[0];
  const mappedFoot = BONES.find(b => b.name === "foot_R").body === "foot_R" && dist(W0.foot_R.pos, byName.foot_R.origin) < 1e-12;
  add_("0.8a", "chirality: anatomical right at +X; facing pitch +x (ψ = h + 90°) puts the right foot at pitch y > 0 (south); render foot_R = physical foot_R",
    chir(P0) && pitchFacingX > 0.999 && pitchY > 0 && mappedFoot, `upperLeg_R x = ${P0.upperLeg_R[0].toFixed(3)}, facing x ${pitchFacingX.toFixed(3)}, right foot pitch y = ${pitchY.toFixed(3)}`, "all true");
  add_("0.8b", "no mirrored-coordinate mistake: a deliberately mirrored copy FAILS the chirality test", !chir(mirroredCopy(P0)), chir(mirroredCopy(P0)) ? "mirrored copy passed (BAD)" : "mirrored copy rejected", "rejected");
  let mirB = 0, mirQ = 0, mirBody = 0, mirJ = 0, mirJat = "";
  for (const b of BONES) { const m = mirrorName(b.name); mirB = Math.max(mirB, dist(mirrorPos(P0[b.name]), P0[m])); mirQ = Math.max(mirQ, qAngle(mirrorQuat(S.skeleton.frames[b.name].q), S.skeleton.frames[m].q)); }
  for (const b of S.bodies) { const m = byName[mirrorName(b.name)]; mirBody = Math.max(mirBody, dist(mirrorPos(b.com), m.com), Math.abs(b.mass - m.mass),
    ...[[0, 0, 1], [1, 1, 1], [2, 2, 1], [0, 1, -1], [0, 2, -1], [1, 2, 1]].map(([r, c, sg]) => Math.abs(b.inertia[r][c] * sg - m.inertia[r][c]))); }
  const motions = { shoulder: ["flex", "abd", "rot"], elbow: ["flex", "pron"], hip: ["flex", "abd", "rot"], knee: ["flex", "rot"], ankle: ["df", "inv", "fabd"] };
  for (const [jn, ms] of Object.entries(motions)) for (const mk of ms) {
    const base = POSES.canonical.angles, aR = Object.assign({}, base, { [jn + "_R"]: Object.assign({}, base[jn + "_R"] || {}, { [mk]: ((base[jn + "_R"] || {})[mk] || 0) + 20 }) }),
      aL = Object.assign({}, base, { [jn + "_L"]: Object.assign({}, base[jn + "_L"] || {}, { [mk]: ((base[jn + "_L"] || {})[mk] || 0) + 20 }) });
    const SR = posedBodies(S, aR), SL = posedBodies(S, aL), iR = byName[J_[jn + "_R"].child].index, iL = byName[J_[jn + "_L"].child].index;
    const e = Math.max(qAngle(mirrorQuat(SR[iR].rot), SL[iL].rot), dist(mirrorPos(toWorld(SR, iR, byName[J_[jn + "_R"].child].comLocal)), toWorld(SL, iL, byName[J_[jn + "_L"].child].comLocal)));
    if (e > mirJ) { mirJ = e; mirJat = jn + " " + mk; } }
  add_("0.8c", "bilateral symmetry: bones / bodies / joint motions mirror exactly (q → (x, −y, −z, w), p → (−x, y, z))",
    mirB <= TOL.mirror && mirQ <= 1e-9 && mirBody <= TOL.mirror && mirJ <= 1e-9, `bones ${mirB.toExponential(1)} m / ${mirQ.toExponential(1)} rad · bodies ${mirBody.toExponential(1)} · +20° motions ${mirJ.toExponential(1)} (${mirJat || "—"})`, "≤ 1e-12 m / 1e-9 rad");
  // 0.9 joints: canonical inside the hard limits, singularity margin, anatomical axis directions, extremes
  let minMargin = Infinity, mmAt = "", minSing = Infinity, msAt = "";
  for (const j of S.joints) {
    const d = decompose(j.qCanon), v = [d.tw, d.sy, d.sz];
    for (let i = 0; i < 3; i++) { if (j.locked.includes("xyz"[i])) { if (Math.abs(v[i]) > 1e-9) { minMargin = -1; mmAt = j.name + " locked axis " + "xyz"[i]; } continue; }
      const m = Math.min(v[i] - j.limits.hard.lo[i], j.limits.hard.hi[i] - v[i]) * D; if (m < minMargin) { minMargin = m; mmAt = `${j.name} ${"xyz"[i]}`; } }
    const E = j.limits.engine || j.limits.hard, t = (a) => Math.tan(a / 2); for (const sy of [E.lo[1], E.hi[1]]) for (const sz of [E.lo[2], E.hi[2]]) {   // C2: the engine box (≥ anatomical)
      const sw = 2 * Math.atan(Math.sqrt(t(sy) ** 2 + t(sz) ** 2)) * D, marg = 180 - sw; if (marg < minSing) { minSing = marg; msAt = j.name; } }
  }
  add_("0.9a", "canonical pose inside every joint's hard limits (margin)", minMargin >= TOL.canonicalMarginDeg, `${minMargin.toFixed(2)}° (${mmAt})`, `≥ ${TOL.canonicalMarginDeg}°`);
  add_("0.9b", "swing–twist singularity margin over every joint's full engine box", minSing >= TOL.singularityMarginDeg, `${minSing.toFixed(1)}° (${msAt})`, `≥ ${TOL.singularityMarginDeg}°`);
  let nProbes = 0; const axisFails = [], probe = (jn, a, bodyName, localPt, expectFn, label) => { nProbes++;
    const zero = Object.assign({}, POSES.canonical.angles); if (/shoulder/.test(jn)) zero[jn] = {};   // shoulder motions from its anatomical zero (arm hanging)
    const St0 = posedBodies(S, zero), St1 = posedBodies(S, Object.assign({}, zero, { [jn]: Object.assign({}, zero[jn] || {}, a) })), i = byName[bodyName].index;
    const p0 = toWorld(St0, i, localPt), p1 = toWorld(St1, i, localPt), d = sub(p1, p0); if (!expectFn(d)) axisFails.push(`${jn} ${label}: Δ=${d.map(x => x.toFixed(3))}`); };
  const g = (s) => (s === "R" ? 1 : -1), distalVec = (b) => sub(byName[b].distal, byName[b].origin);
  for (const s of ["L", "R"]) {
    probe("hip_" + s, { flex: 10 }, "thigh_" + s, distalVec("thigh_" + s), d => d[2] > 0, "flexion → knee forward");
    probe("hip_" + s, { abd: 10 }, "thigh_" + s, distalVec("thigh_" + s), d => g(s) * d[0] > 0, "abduction → knee lateral");
    probe("hip_" + s, { rot: 10 }, "thigh_" + s, [0, -0.2, 0.1], d => -g(s) * d[0] > 0, "internal rotation → anterior thigh turns medial");
    probe("knee_" + s, { flex: 10 }, "shank_" + s, distalVec("shank_" + s), d => d[2] < 0, "flexion → ankle backward");
    probe("knee_" + s, { rot: 10 }, "shank_" + s, [0, -0.2, 0.1], d => -g(s) * d[0] > 0, "tibial IR → anterior shank turns medial");
    probe("ankle_" + s, { df: 10 }, "foot_" + s, [0, 0, 0.2], d => d[1] > 0, "dorsiflexion → toes up");
    probe("ankle_" + s, { inv: 10 }, "foot_" + s, [0, 0.05, 0], d => g(s) * d[0] > 0, "inversion → foot top lateral (sole medial)");
    probe("ankle_" + s, { fabd: 10 }, "foot_" + s, [0, 0, 0.2], d => -g(s) * d[0] > 0, "foot adduction → toes medial");
    probe("shoulder_" + s, { flex: 10 }, "upperArm_" + s, distalVec("upperArm_" + s), d => d[2] > 0, "flexion → elbow forward (from arm hanging)");
    probe("shoulder_" + s, { abd: 10 }, "upperArm_" + s, distalVec("upperArm_" + s), d => g(s) * d[0] > 0, "abduction → elbow lateral");
    probe("shoulder_" + s, { rot: 10 }, "upperArm_" + s, [0, -0.1, 0.1], d => -g(s) * d[0] > 0, "internal rotation → anterior arm turns medial");
    probe("elbow_" + s, { flex: 10 }, "forearm_" + s, sub(byName["forearm_" + s].distal, byName["forearm_" + s].origin), d => d[2] > 0, "flexion → hand forward (T-pose)");
    probe("elbow_" + s, { pron: 10 }, "forearm_" + s, [g(s) * 0.1, -0.05, 0], d => d[2] < 0, "pronation → palm (−Y in T-pose) turns backward");
  }
  for (const jn of ["lumbar", "thoracic", "neck"]) { const c = byName[J_[jn].child].name;
    probe(jn, { flex: 10 }, c, [0, 0.2, 0], d => d[2] > 0, "flexion → top forward"); probe(jn, { lat: 10 }, c, [0, 0.2, 0], d => d[0] > 0, "right lateral bend → top right");
    probe(jn, { rot: 10 }, c, [0, 0, 0.1], d => d[0] > 0, "right axial rotation → front turns right"); }
  add_("0.9c", `joint axes: every anatomical motion moves the body in its anatomical direction, both sides (${nProbes} probes)`, axisFails.length === 0, axisFails.length ? axisFails.join("; ") : `${nProbes} / ${nProbes}`, "all");
  let actOut = [], looseMax = 0, looseAt = "";
  for (const j of S.joints) for (const row of j.extremes.active) { const v = [row.tw, row.sy, row.sz].map(x => x * R);
    for (let i = 0; i < 3; i++) if (v[i] < j.limits.hard.lo[i] - 1e-9 || v[i] > j.limits.hard.hi[i] + 1e-9) actOut.push(`${j.name} ${row.label}`); }
  for (const j of S.joints) for (const k of ["x", "y", "z"]) { const ax = j.def.axes[k]; if (!ax || ax.locked) continue; const rom = j.def.rom[ax.key].hard, i = "xyz".indexOf(k);
    const c = (j.centreAnat[ax.key] || 0) * ax.s, naive = [Math.min(...rom.map(v => v * ax.s)) - c, Math.max(...rom.map(v => v * ax.s)) - c];
    const loose = Math.max(naive[0] - j.limits.hard.lo[i] * D, j.limits.hard.hi[i] * D - naive[1]); if (loose > looseMax) { looseMax = loose; looseAt = `${j.name} ${ax.key}`; } }
  add_("0.9d", "every anatomical ACTIVE extreme inside the engine hard limits (hard limits = tight hull of the anatomical hard extremes)", actOut.length === 0, actOut.length ? actOut.join("; ") : "all inside",
    "all inside", `largest widening beyond (anatomical limit − centre) from swing–twist coupling: ${looseMax.toFixed(1)}° (${looseAt})`);
  // passive law sanity: zero inside, opposes excursion, reaches its design torque at the hard limit, monotone
  let pBad = []; for (const j of S.joints) j.passive.forEach((pp, i) => { if (!pp) return; const mid = (pp.soft[0] + pp.soft[1]) / 2;
    if (passiveTorque(pp, mid) !== 0) pBad.push(j.name + " inside≠0");
    if (!(passiveTorque(pp, pp.hard[1]) < 0 && passiveTorque(pp, pp.hard[0]) > 0)) pBad.push(j.name + " sign");
    if (Math.abs(-passiveTorque(pp, pp.hard[1]) - pp.tauAtHard[1]) > 1e-6 * Math.max(1, pp.tauAtHard[1])) pBad.push(j.name + " τ(hard)"); });
  add_("0.9e", "passive end-range law: 0 inside the soft range, opposes excursion, equals 25 % of the opposing isometric capacity at the hard limit", pBad.length === 0, pBad.length ? pBad.join(", ") : "all joints", "all");
  const capOK = Math.abs(fOmega(CAPACITY.knee.flex[1], 0) - 1) < 1e-12 && Math.abs(fOmega(CAPACITY.knee.flex[1], 3.14159 / 3 * 1) - 0) > 0 &&
    Math.abs(fOmega(CAPACITY.knee.flex[1], -10) - 1.25) < 1e-12 && fOmega(CAPACITY.knee.flex[1], 25) === 0 && activationStep(0, 1, 0.015) > 0.6 && activationStep(0, 1, 0.015) < 0.64;
  const kRatio = [3.1416, 5.236].map(w => fOmega(CAPACITY.knee.flex[1], w) / fOmega(CAPACITY.knee.flex[1], 1.0472));
  add_("0.9f", "actuator capacity functions: f(0)=1, eccentric plateau, zero at ω₀; activation τ 15 ms; knee-extension 180/300°/s ratios vs Fousekis 0.70/0.57", capOK,
    `ratios ${kRatio.map(x => x.toFixed(3)).join(" / ")}; a(15 ms) = ${activationStep(0, 1, 0.015).toFixed(3)}`, "0.74 / 0.55 (spec fit)");
  // 0.10 colliders vs anthropometric surfaces
  const surf = [];
  const delt = byName.upperArm_R.shapes[0], bidel = 2 * (byName.upperArm_R.origin[0] + delt.pos[0] + delt.r); surf.push({ what: "bideltoid (deltoid spheres)", v: (bidel - PROFILE.bideltoid * H) / 2, tol: TOL.limbTol });
  const hA = byName.head.shapes[0], hP = byName.head.shapes[1], sep = V.sub(hA.pos, hP.pos), hOff = V.len(sep) / 2;   // C4 AP sphere pair (C1 dimensions)
  surf.push({ what: "head sphere-pair AP half-extent vs head length / 2", v: hOff + hA.r - PROFILE.headLength * H / 2, tol: TOL.headTol });
  surf.push({ what: "head sphere-pair lateral half-extent vs head breadth / 2", v: hA.r - PROFILE.headBreadth * H / 2, tol: TOL.headTol });
  surf.push({ what: "head sphere-pair side waist (between the centres) vs head breadth / 2", v: Math.sqrt(hA.r * hA.r - hOff * hOff) - PROFILE.headBreadth * H / 2, tol: TOL.headTol });
  surf.push({ what: "head sphere pair along anterior–posterior", v: 0, tol: [-1e-12, 1e-12], ok: hA.type === "sphere" && hP.type === "sphere" && Math.abs(hA.r - hP.r) < 1e-15 && Math.abs(sep[0]) < 1e-12 && Math.abs(sep[1]) < 1e-12 && sep[2] > 0 });
  const pb = byName.pelvis.shapes[0]; surf.push({ what: "pelvis box vs hip breadth / 2", v: pb.he[0] - 0.190 * H / 2, tol: TOL.trunkTol });
  const cb = byName.thorax.shapes[0]; surf.push({ what: "thorax box vs chest depth / 2", v: cb.he[2] - PROFILE.chestDepth * H / 2, tol: TOL.trunkTol }, { what: "thorax box vs Drillis chest breadth 0.174 H / 2", v: cb.he[0] - 0.174 * H / 2, tol: TOL.trunkTol });
  const ab = byName.abdomen.shapes[0]; surf.push({ what: "abdomen box vs waist depth / 2", v: ab.he[2] - PROFILE.waistDepth * H / 2, tol: TOL.trunkTol });
  const surfBad = surf.filter(x => x.v < x.tol[0] - 1e-12 || x.v > x.tol[1] + 1e-12 || x.ok === false);
  add_("0.10a", "colliders vs anthropometric surfaces (§15.1 tolerances: limbs −10…+3, trunk −20…+5, head −15…+5 mm)", surfBad.length === 0,
    surf.filter(x => x.ok === undefined).map(x => `${x.what} ${(1000 * x.v).toFixed(1)} mm`).join("; ") + `; head pair along AP ${surf.find(x => x.ok !== undefined).ok}`, "within tolerance", surfBad.length ? "OUTSIDE: " + surfBad.map(x => x.what).join(", ") : "");
  const ft = byName.foot_R, hull = ft.shapes[0].points, ext = (k, f) => f(...hull.map(p => p[k]));
  const footDims = { length: ext(2, Math.max) - ext(2, Math.min), width: ext(0, Math.max) - ext(0, Math.min), heel: -ext(2, Math.min), tip: ext(2, Math.max), soleY: ext(1, Math.min) + ft.origin[1] };
  const fdOK = Math.abs(footDims.length - ft.boot.length) <= TOL.bootTol && Math.abs(footDims.width - ft.boot.ballWidth) <= TOL.bootTol && Math.abs(footDims.heel - ft.boot.heelBehindAJC) <= 1e-12 &&
    Math.abs(footDims.tip - ft.boot.tipAheadAJC) <= 1e-12 && Math.abs(footDims.soleY) <= 1e-12;
  add_("0.10b", "boot hull dimensions = specification (length, ball width, heel behind / tip ahead of the AJC, sole on the stud plane)", fdOK,
    `length ${(100 * footDims.length).toFixed(2)} cm, width ${(100 * footDims.width).toFixed(2)} cm, heel ${(100 * footDims.heel).toFixed(2)} cm behind / tip ${(100 * footDims.tip).toFixed(2)} cm ahead of the AJC, AJC ${(100 * ft.origin[1]).toFixed(2)} cm up, MTP1 ${(100 * ft.boot.mtp1AheadAJC).toFixed(2)} cm ahead`,
    `spec ${(100 * ft.boot.length).toFixed(2)} × ${(100 * ft.boot.ballWidth).toFixed(2)} cm ± 5 mm`);
  // ── engine build + readback + contacts ──
  const eng = engineChecks(J, S, opts);
  for (const c of eng.checks) checks.push(c);
  return { human, spec: S, specHash: hashes[0], checks, engine: eng, measures: measures(S), wbDown, wbCan, toe, surf, footDims };
}

// ── engine-side checks (Jolt) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function engineChecks(J, S, opts) {
  const checks = [], add_ = (id, name, pass, value, limit, detail) => checks.push({ id, name, pass: !!pass, value, limit, detail });
  const w = new V2JoltWorld(J, S, S.contact);
  // 0.11 readback
  let dm = 0, dI = 0, dc = 0, damp = 0, mav = 0, rb = [];
  S.bodies.forEach((b, i) => { const r = w.readbackBody(i); rb.push(r);
    dm = Math.max(dm, Math.abs(r.mass - b.mass) / b.mass); const Imax = Math.max(...b.inertia.flat().map(Math.abs));
    dI = Math.max(dI, ...b.inertia.flatMap((row, a) => row.map((x, c) => Math.abs(r.inertia[a][c] - x) / Imax)));
    dc = Math.max(dc, dist(r.comWorld, add(b.origin, b.comLocal)), dist(w.shapeInfo[i].comLocal, b.comLocal));
    damp = Math.max(damp, Math.abs(r.linDamp), Math.abs(r.angDamp)); mav = Math.max(mav, Math.abs(r.maxAngVel - G0_WORLD.maxAngVel)); });
  { // 0.5b COM / inertia calculation consistent: whole body recomposed independently from the ENGINE readback vs the spec composition (canonical)
    const Mr = rb.reduce((a, r) => a + r.mass, 0); let cr = [0, 0, 0]; rb.forEach(r => { cr = add(cr, V.sc(r.comWorld, r.mass)); }); cr = V.sc(cr, 1 / Mr);
    let Ir = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; rb.forEach(r => { const d = sub(r.comWorld, cr), dd = V.dot(d, d); for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) Ir[a][c] += r.inertia[a][c] + r.mass * ((a === c ? dd : 0) - d[a] * d[c]); });
    const ws = wholeBody(S.bodies), Imax = Math.max(...ws.I.flat().map(Math.abs)), dI2 = Math.max(...ws.I.flatMap((row, a) => row.map((x, c) => Math.abs(Ir[a][c] - x) / Imax)));
    add_("0.5b", "COM / inertia calculation consistent: whole body recomposed from the Jolt readback = spec composition (canonical)", Math.abs(Mr - ws.M) / ws.M <= TOL.readRel && dist(cr, ws.com) <= TOL.readM && dI2 <= TOL.readRel,
      `mass ${(Math.abs(Mr - ws.M) / ws.M).toExponential(1)} rel · COM ${dist(cr, ws.com).toExponential(1)} m · inertia ${dI2.toExponential(1)} rel`, `≤ ${TOL.readRel} rel / ${TOL.readM} m`); }
  add_("0.11a", "Jolt bodies: mass, full inertia tensor, COM read back = spec", dm <= TOL.readRel && dI <= TOL.readRel && dc <= TOL.readM,
    `mass ${dm.toExponential(1)} rel · inertia ${dI.toExponential(1)} rel · COM ${dc.toExponential(1)} m`, `≤ ${TOL.readRel} rel / ${TOL.readM} m`);
  add_("0.11b", "Jolt bodies: zero linear / angular damping; max angular velocity 100 rad/s; no sleeping", damp === 0 && mav < 1e-4, `damping ${damp}, maxAngVel Δ ${mav.toExponential(1)}`, "0 / 100 rad/s");
  let fr = 0, lim = 0, qcs = 0, fixOK = true, motorOK = true, motLim = 0, fric = 0;
  S.joints.forEach((j, k) => { const r = w.readbackJoint(k), b1 = S.bodies[j.parentIndex], b2 = S.bodies[j.childIndex];
    const c1 = add(b1.origin, b1.comLocal), c2 = add(b2.origin, b2.comLocal);
    fr = Math.max(fr, dist(r.toBody1.x, j.F1axes.x), dist(r.toBody1.y, j.F1axes.y), dist(r.toBody2.x, j.F2axes.x), dist(r.toBody2.y, j.F2axes.y), dist(r.toBody1.t, sub(j.at, c1)), dist(r.toBody2.t, sub(j.at, c2)));
    for (let i = 0; i < 3; i++) { if (j.locked.includes("xyz"[i])) { if (!r.fixedRot[i]) fixOK = false; continue; } const E = j.limits.engine || j.limits.hard; lim = Math.max(lim, Math.abs(r.rotLo[i] - E.lo[i]), Math.abs(r.rotHi[i] - E.hi[i])); }   // C2: Jolt holds the engine (emergency) stop
    if (!r.fixedLin.every(Boolean)) fixOK = false; if (!r.motorState.every(s => s === r.motorOff)) motorOK = false;
    ["x", "y", "z"].forEach((ak, i) => { const cap = j.capacity[ak]; if (cap) motLim = Math.max(motLim, Math.abs(r.motorLimits[i][0] + cap.minus.Nm), Math.abs(r.motorLimits[i][1] - cap.plus.Nm)); fric = Math.max(fric, Math.abs(r.friction[i])); });
    qcs = Math.max(qcs, qAngle(r.qCS, j.qCanon)); });
  add_("0.11c", "Jolt joints: constraint frames (F1 on parent, F2 on child) and positions read back = spec", fr <= 1e-5, fr.toExponential(2), "≤ 1e-5");
  add_("0.11d", "Jolt joints: rotation limits = spec; translations fixed; knee / elbow locked axis fixed", lim <= TOL.readRad && fixOK, `${lim.toExponential(1)} rad, fixed axes ${fixOK}`, `≤ ${TOL.readRad} rad`);
  add_("0.11e", "Jolt joints: constraint-space rotation at canonical = predicted Cm⁻¹·P(canonical)", qcs <= TOL.qCSRad, qcs.toExponential(2) + " rad", `≤ ${TOL.qCSRad} rad`);
  add_("0.11f", "Jolt motors exist structurally, OFF, directional torque limits = isometric capacity, Coulomb friction 0", motorOK && motLim <= 1e-3 && fric === 0, `state OFF ${motorOK}, limit Δ ${motLim.toExponential(1)} N·m, friction ${fric}`, "OFF / exact / 0");
  // ground alignment + zero motion at the canonical pose (gravity 0, one 1/240 s step, resting on the turf)
  const tri = S.bodies.map((b, i) => w.bodyTriangles(i)); let footMin = Infinity, otherMin = Infinity, otherAt = "";
  S.bodies.forEach((b, i) => { let m = Infinity; for (let k = 1; k < tri[i].length; k += 3) m = Math.min(m, tri[i][k] + b.origin[1]); if (/^foot_/.test(b.name)) footMin = Math.min(footMin, m); else if (m < otherMin) { otherMin = m; otherAt = b.name; } });
  add_("0.10c", "ground alignment: boot soles on the stud plane y = 0; every other collider clear of the turf", Math.abs(footMin) <= TOL.groundM && otherMin >= TOL.otherAboveGroundM,
    `sole ${(1000 * footMin).toFixed(2)} mm; lowest other ${(100 * otherMin).toFixed(1)} cm (${otherAt})`, `|sole| ≤ ${1000 * TOL.groundM} mm; others ≥ ${100 * TOL.otherAboveGroundM} cm`);
  w.setGravity(0); const s0 = S.bodies.map((b, i) => w.read(i)); w.step(1 / 240); const s1 = S.bodies.map((b, i) => w.read(i));
  let mp = 0, mr = 0, mv = 0; S.bodies.forEach((b, i) => { mp = Math.max(mp, dist(s0[i].pos, s1[i].pos)); mr = Math.max(mr, qAngle(s0[i].rot, s1[i].rot)); mv = Math.max(mv, V.len(s1[i].v), V.len(s1[i].w)); });
  const groundContacts = w.contacts.filter(c => (c.a < 0) !== (c.b < 0) && c.depth > -0.001), gcBodies = [...new Set(groundContacts.map(c => S.bodies[Math.max(c.a, c.b)].name))];
  const selfC = w.contacts.filter(c => c.a >= 0 && c.b >= 0 && c.depth > TOL.overlapM);
  add_("0.11g", "static construction: one zero-gravity step at the canonical pose produces zero motion", mp <= TOL.zeroMotionM && mr <= TOL.zeroMotionRad && mv <= 1e-6,
    `Δpos ${mp.toExponential(1)} m, Δrot ${mr.toExponential(1)} rad, |v| ${mv.toExponential(1)}`, `≤ ${TOL.zeroMotionM} m / ${TOL.zeroMotionRad} rad`, `turf contacts: ${gcBodies.join(", ") || "none"}`);
  const stateHash = hashNums(s1.flatMap(s => [...s.pos, ...s.rot, ...s.v, ...s.w])).toString(16).padStart(8, "0");
  const readHash = hashNums(rb.flatMap(r => [r.mass, ...r.inertia.flat(), ...r.comWorld])).toString(16).padStart(8, "0");
  w.destroy();
  // 0.10d self-overlap of allowed pairs at the 7 reference poses (lifted 1 m above the turf: self contacts only)
  const overlaps = [], perPose = {};
  for (const pk of REFERENCE_POSES) {
    const wp = new V2JoltWorld(J, S, S.contact); wp.setGravity(0);
    const St = posedBodies(S, POSES[pk].angles); let lo = Infinity; St.forEach((s, i) => { for (let k = 1; k < tri[i].length; k += 3) { const p = Q.rot(s.rot, [tri[i][k - 1], tri[i][k], tri[i][k + 1]]); lo = Math.min(lo, p[1] + s.pos[1]); } });
    const up = 1.0 - lo; St.forEach((s, i) => wp.setPose(i, [s.pos[0], s.pos[1] + up, s.pos[2]], s.rot)); wp.step(1 / 6000);
    const near = wp.contacts.filter(c => c.a >= 0 && c.b >= 0); let worst = -Infinity, wpair = "";
    for (const c of near) { if (c.depth > worst) { worst = c.depth; wpair = `${S.bodies[c.a].name}–${S.bodies[c.b].name}`; } if (c.depth > TOL.overlapM) overlaps.push(`${pk}: ${S.bodies[c.a].name}–${S.bodies[c.b].name} ${(1000 * c.depth).toFixed(1)} mm`); }
    perPose[pk] = near.length ? { closestPair: wpair, depthMm: +(1000 * worst).toFixed(2) } : { closestPair: "none within the speculative distance", depthMm: null };
    wp.destroy();
  }
  add_("0.10d", "no collider interpenetration between allowed pairs at the 7 reference poses (Jolt contact query)", overlaps.length === 0, overlaps.length ? overlaps.join("; ") : "none",
    `depth ≤ ${1000 * TOL.overlapM} mm`, Object.entries(perPose).map(([k, v]) => `${k}: ${v.depthMm == null ? "clear" : v.closestPair + " " + v.depthMm + " mm"}`).join("; "));
  return { checks, stateHash, readHash, triangles: opts.keepTriangles ? tri : null, perPose, groundContactBodies: gcBodies, selfContactsAtCanonical: selfC.length };
}
// headline measures for the report / viewer (V2-REF table)
export function measures(S) {
  const L = S.landmarks, H = S.human.H, ft = S.bodies.find(b => b.name === "foot_R").boot;
  return { stature: H, vertexAboveGround: L.yVERT, HJC: L.yH, KJC: L.yK, AJC: L.yA, SJC: L.ySJC, C7: L.yCERV, interHJC: 2 * L.hipHalf, interSJC: 2 * L.shoulderHalf, legLength: L.legLength,
    footLength: L.footLength, bootLength: ft.length, bootBallWidth: ft.ballWidth, bootHeelWidth: ft.heelWidth, heelBehindAJC: ft.heelBehindAJC, tipAheadAJC: ft.tipAheadAJC, mtp1AheadAJC: ft.mtp1AheadAJC, mtp5AheadAJC: ft.mtp5AheadAJC,
    totalMass: S.totals.mass, comCanonical: S.totals.com };
}
// agreement with the approved Python calculation (PHYSICAL_CHARACTER_V2_SPEC.json) — fail loudly outside the rounding tolerance
export function specAgreement(S, ref) {
  if (!ref) return null;
  let wm = 0, wc = 0, wi = 0, ws = 0, at = { m: "", c: "", i: "", s: "" };
  for (const rb of ref.bodies) { const b = S.bodies.find(x => x.name === rb.name); if (!b) return { pass: false, detail: "missing body " + rb.name };
    const m = Math.abs(b.mass - rb.mass), c = Math.max(...b.com.map((x, i) => Math.abs(x - rb.com_ccs[i]))), I = Math.max(...b.inertia.flatMap((r, i) => r.map((x, j) => Math.abs(x - rb.inertia_about_com_ccs[i][j]))));
    if (m > wm) { wm = m; at.m = b.name; } if (c > wc) { wc = c; at.c = b.name; } if (I > wi) { wi = I; at.i = b.name; } }
  for (const s of ref.skeleton) { const d = Math.max(...S.skeleton.positions[s.bone].map((x, i) => Math.abs(x - s.pos_ccs[i]))); if (d > ws) { ws = d; at.s = s.bone; } }
  const rc = ref.colliders, b = (n) => S.bodies.find(x => x.name === n);
  const cDiff = Math.max(Math.abs(b("pelvis").shapes[0].he[0] * 2 - rc.pelvis.size_m[0]), Math.abs(b("thorax").shapes[0].he[2] * 2 - rc.thorax.size_m[2]), Math.abs(b("head").shapes[0].r - rc.head.sphere_r), Math.abs(V.len(V.sub(b("head").shapes[0].pos, b("head").shapes[1].pos)) / 2 - rc.head.sphere_offset_AP),
    Math.abs(b("thigh_R").shapes[0].rTop - rc.thigh.r_prox), Math.abs(b("shank_R").shapes[0].rTop - rc.shank.r_prox), Math.abs(b("shank_R").shapes[0].rBot - rc.shank.r_dist),
    Math.abs(b("upperArm_R").shapes[1].rTop - rc.upperArm.r_prox), Math.abs(b("forearm_R").shapes[0].rBot - rc.forearm.r_dist),
    Math.abs(b("foot_R").boot.length - rc.foot.boot_len), Math.abs(b("foot_R").boot.ballWidth - rc.foot.ball_w), Math.abs(b("foot_R").boot.tipAheadAJC - rc.foot.tip_ahead_AJC), Math.abs(b("foot_R").boot.heelBehindAJC - rc.foot.heel_behind_AJC));
  const pass = wm <= TOL.specMass && wc <= TOL.specPos && wi <= TOL.specInertia && ws <= TOL.specPos && cDiff <= TOL.specPos;
  return { pass, mass: wm, com: wc, inertia: wi, skeleton: ws, colliders: cDiff, at };
}
export { V2_REF, V1_MATCHED, VARIATION_SET };
