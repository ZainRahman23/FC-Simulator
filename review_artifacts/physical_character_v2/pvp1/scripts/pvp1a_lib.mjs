// PVP-1A shared library (pvp1/PVP1A_PREREGISTRATION.md, frozen d7fb69a1). Read-only imports of the bound implementations; nothing in V2 / RUN-1 /
// R0 / V1.3 / IB-1 is modified. Every experiment number below is the preregistration's.
import fs from "fs"; import path from "path"; import zlib from "zlib";
export const IL = await import(new URL("../../ifm1/scripts/ifm1_lib.mjs", import.meta.url).href);
export const { V, Q, MC, CL, RA, P2 } = IL;
const H = await import(P2 + "spec/v2_human.js"), J0 = await import(P2 + "spec/v2_joints.js");
export const { childRotation, anatomicalAngles } = J0;
const GEO = await import(P2 + "sim/v2_geom.js"); export const { bodyLowest } = GEO;
// ── frozen parameters ──
export const PV = Object.freeze({
  id: "PVP-1A", prereg: "pvp1/PVP1A_PREREGISTRATION.md (d7fb69a1)", h: 1 / 240, tauAct: 51.0, tauActMin: 50.0, tauSim: 51.5, steps: 260, primary: 14, secondary: 36,
  local: [50, 0, -34], fit: Object.freeze({ bootMm: 10, centroidMm: 10, shankMm: 30, otherMm: 30, groundShiftMm: 30, legCapR: 0.07, lift: 0.0005 }),
  entry: Object.freeze({ anchorM: 1e-6, turfPenMm: 1, selfPenMm: 10, momentumNs: 0.01, clearMm: 1, runnerGroundMaxMm: 10 }),
  contactNs: 1e-3, extraFrac: 0.10, eqOppNs: 1e-9,
  cg: Object.freeze({ adjMm: 30, plantedMm: 5, tickS: 1 / 60, locM: 0.10, region: 0.25, ovlLo: 1 / 3, ovlHi: 3, angDeg: 45, simPoint: [49.970, 34.208, 0.108], simNormal: [0.671, -0.741] }),
  integrity: Object.freeze({ anchorSepMm: 1, selfPenMm: 10, crossPenMm: 10, turfPenMm: 10, engineMarginDeg: 0.25, speedMax: 25 }),
  ledger: Object.freeze({ linStep: 0.01, linPrim: 0.05, angStep: 0.01, angPrim: 0.05, ePrim: 0.5, eSec: 5 }),
  c0: Object.freeze({ slipMm: 10, pelvisFrac: 0.85, tipEarlyMm: 10, tipPrimMm: 30 }),
  oc: Object.freeze({ tSup: 0.060, omega0: Math.sqrt(9.81 / (1.13 * 0.865)), obstacle: 0.139, leg: 0.865, step: { fwd: 0.42, back: 0.2, out: 0.3, cross: 0.12 }, gStep: 2.756, maxSteps: 4, neg: 0.03, dropCap: 0.121, nonFootDepthMm: 0.5 }),
  response: Object.freeze({ pointMm: 1, rotDeg: 0.1 }), equivalence: Object.freeze({ landmarkMm: 10, orientDeg: 3 }),
  auth: Object.freeze({ gameplayHash: "a2678624", sim: "5042230b5bc162247e151c10bef8634539a92be0", e0: 0.312, J: 75.64, dvCom: 0.259, spin: -0.303, dvTackler: 0.970 }) });
export const SPEC_R = () => IL.SPECS.R0(), SPEC_T = () => IL.generateSpec(H.V1_MATCHED);
// ── records (read-only) ──
const IB = path.join(RA, "interaction_benchmark");
export function records() { const gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
  const OFF = gz(path.join(IB, "records/v13/rx_behind_standing_OFF.json.gz")), LOCO = gz(path.join(IB, "records/v13/rx_behind_standing_LOCO.json.gz")), SC = JSON.parse(fs.readFileSync(path.join(IB, "scenarios/IB1-SR_rx_behind_standing.json")));
  if (OFF.gameplayHash !== PV.auth.gameplayHash || LOCO.gameplayHash !== PV.auth.gameplayHash || SC.authoritativeOutcome.gameplayHash !== PV.auth.gameplayHash) throw new Error("H1: gameplay hash");
  return { OFF, LOCO, SC }; }
// the exporter's own gameplay hash (FNV-1a of JSON(rows) + "|" + JSON(events)) — recomputed from the consumed record (neutrality)
export function gameplayHashOf(rec) { const s = JSON.stringify(rec.rows) + "|" + JSON.stringify(rec.events); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); }
// τ ↔ (row, slot): slot s of row r ends at τ = r + (s + 1) / 4
export const rowSlot = (tau) => { const r = Math.floor(tau - 0.25 + 1e-9), s = Math.round((tau - r) * 4) - 1; return [r, s]; };
export const pitchToLocal = (p) => [p[0] - 50, p[2], 34 - p[1]];          // pitch (x east, y south, z up) → local (anim3d − (50, 0, −34))
export const localToPitch = (l) => [l[0] + 50, 34 - l[2], l[1]];
export function primsAt(OFF, tau) { const [r, s] = rowSlot(tau); return OFF.prims[r][s].map(p => ({ prim: p.prim, a: pitchToLocal(p.a), b: pitchToLocal(p.b), r: p.r, v: [p.v[0], 0, -p.v[1]] })); }
export function runnerSegsAt(OFF, tau) { const [r, s] = rowSlot(tau); return OFF.simBody[r][s].segs.map(g => ({ ...g, a: pitchToLocal(g.a), b: pitchToLocal(g.b) })); }
// ── two characters in one unmodified V2JoltWorld: the combined spec (runner 0…13, tackler 14…27; disabled pairs within a character only) ──
export function combine(sR, sT) {
  for (const k of Object.keys(sR.contact)) if (JSON.stringify(sR.contact[k]) !== JSON.stringify(sT.contact[k])) throw new Error("H1: contact configuration differs: " + k);
  if (Object.keys(sR.contact).length !== Object.keys(sT.contact).length) throw new Error("H1: contact configuration keys differ");
  const nB = sR.bodies.length;
  sR.bodies.forEach((b, i) => { if (b.index !== i) throw new Error("runner body index"); }); sT.bodies.forEach((b, i) => { if (b.index !== i) throw new Error("tackler body index"); });
  const bodies = [...sR.bodies, ...sT.bodies.map(b => ({ ...b, index: b.index + nB, parentIndex: b.parentIndex >= 0 ? b.parentIndex + nB : -1 }))];
  const joints = [...sR.joints, ...sT.joints.map(j => ({ ...j, parentIndex: j.parentIndex + nB, childIndex: j.childIndex + nB }))];
  return { ...sR, human: { id: "PVP-1A combined (R0 + V1-matched)" }, bodies, joints, disabledPairs: [...sR.disabledPairs, ...sT.disabledPairs.map(([a, b]) => [a + nB, b + nB])], contact: sR.contact, nB, nJ: sR.joints.length };
}
// an index-offset view of the shared world for one character's unmodified components (every other world function throws: no silent mapping)
export function worldView(w, bOff, kOff) {
  const k = (x) => x + kOff, b = (x) => x + bOff;
  const map = { driveOn: (kk, i) => w.driveOn(k(kk), i), setDrive: (kk, i, s, d, l) => w.setDrive(k(kk), i, s, d, l), setDriveTarget: (kk, q, wv) => w.setDriveTarget(k(kk), q, wv), driveTarget: (kk) => w.driveTarget(k(kk)),
    rotationCS: (kk) => w.rotationCS(k(kk)), setDriveVel: (kk, wv) => w.setDriveVel(k(kk), wv), addTorquePair: (p, c, T) => w.addTorquePair(b(p), b(c), T),
    actOn: (kk, i, on) => w.actOn(k(kk), i, on), setAct: (kk, i, K, D, lo, hi) => w.setAct(k(kk), i, K, D, lo, hi), actRotationCS: (kk) => w.actRotationCS(k(kk)), setActTarget: (kk, q, wv) => w.setActTarget(k(kk), q, wv),
    actTarget: (kk) => w.actTarget(k(kk)), setActVel: (kk, wv) => w.setActVel(k(kk), wv), lambdaAct: (kk) => w.lambdaAct(k(kk)) };
  return new Proxy({}, { get: (_, p) => { if (p in map) return map[p]; const x = w[p]; if (typeof x === "function") throw new Error("worldView: unmapped world method " + String(p)); return x; } });
}
// ── geometry helpers ──
export const perpToLine = (p, a, b) => { const u = V.norm(V.sub(b, a)), d = V.sub(p, a); return V.sub(d, V.sc(u, V.dot(d, u))); };
export const segParam = (p, a, b) => { const ab = V.sub(b, a); return Math.max(0, Math.min(1, V.dot(V.sub(p, a), ab) / V.dot(ab, ab))); };
export const segDist = (p, a, b) => V.dist(p, V.add(a, V.sc(V.sub(b, a), segParam(p, a, b))));
export function supportBody(body, st, dir) { let best = null, bv = -Infinity; for (const s of body.shapes) { const p = CL.supportOf(s, st)(dir), v = V.dot(p, dir); if (v > bv) { bv = v; best = p; } } return best; }
export function hullCentroid(body, st) { const P = body.shapes.filter(s => s.type === "hull").flatMap(s => s.points.map(q => V.add(st.pos, Q.rot(st.rot, V.add(s.pos, Q.rot(s.rot, q)))))); return V.sc(P.reduce((a, p) => V.add(a, p), [0, 0, 0]), 1 / P.length); }
export function lowest(spec, S) { let m = Infinity, who = -1; spec.bodies.forEach((b, i) => { const l = bodyLowest(b, S[i]); if (l.y < m) { m = l.y; who = i; } }); return { y: m, body: who }; }
// minimum distance between two characters (GJK over every shape pair; 0 = touching / overlapping)
export function crossClearance(sR, SR, sT, ST) { let best = { d: Infinity }; for (let i = 0; i < sR.bodies.length; i++) for (let j = 0; j < sT.bodies.length; j++) for (const a of sR.bodies[i].shapes) for (const c of sT.bodies[j].shapes) {
  const g = CL.gjk(CL.supportOf(a, SR[i]), CL.supportOf(c, ST[j])), d = g.overlap ? 0 : g.d; if (d < best.d) best = { d, rb: sR.bodies[i].name, tb: sT.bodies[j].name }; } return best; }
// ── the simulation's balance law (pt_react.js ptRxResolve @5042230) as an OFFLINE evaluator of a physical state ──
// e: horizontal XcoM error (pitch frame x east, y south) relative to the remaining support foot; facing 0 → f = (1, 0), right = (−fy, fx) = (0, 1)
export function balanceLaw(eVec) { const O = PV.oc, eh = Math.hypot(eVec[0], eVec[1]), eH = eh + O.obstacle, ez = eh > 1e-6 ? [eVec[0] / eh, eVec[1] / eh] : [1, 0];
  const f = [1, 0], rgt = [0, 1], ef = ez[0] * f[0] + ez[1] * f[1], er = ez[0] * rgt[0] + ez[1] * rgt[1], outward = -er > 0;   // step side L ("other" of the struck R): outward = −er > 0
  const rc = O.leg * Math.hypot(ef > 0 ? ef * O.step.fwd : ef * O.step.back, er * (outward ? O.step.out : O.step.cross));
  let e = eH, steps = 0; const trace = [eH]; while (e > 1e-3 && steps < O.maxSteps) { steps++; if (e <= rc) { e = 0; trace.push(0); break; } e = (e - rc) * O.gStep; trace.push(e); }
  const fell = e > 1e-3, cls = eH <= O.neg ? "NEGLIGIBLE" : fell ? "FALL" : steps <= 1 ? "CORRECTION" : "STUMBLE";
  return { eHoriz: eh, eH, rc, steps, trace, cls }; }
// ── runner entry: MC-1 on R0's frames applied to the static LOCO presentation pose (row 50), every velocity 0, both legs stance ──
export function runnerEntry(spec, LOCO, rig, row = 50) {
  const W = LOCO.pres[row].world, joints = rig.bones.map(b => { const k = LOCO.bones.findIndex(x => x.name === b.name); if (k < 0) throw new Error("bone " + b.name); const m = W[k];
    return { name: b.name, world: { position: [m[12] - PV.local[0], m[13] - PV.local[1], m[14] - PV.local[2]], rotation: [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]], linearVelocity: [0, 0, 0], angularVelocity: [0, 0, 0] } }; });
  const q = { joints, legs: { L: { stance: true, contact: {} }, R: { stance: true, contact: {} } } }, map = MC.mapLV2toV2(spec, rig, { m: q, 0: q, p: q });
  const bindDiff = Math.max(...rig.bones.map((b, i) => { const k = LOCO.bones.findIndex(x => x.name === b.name); return Math.max(...LOCO.bind[k].map((x, j) => Math.abs(x - rig.bind[i][j]))); }));
  const S0 = map.S.map(s => ({ pos: s.pos.slice(), rot: s.rot.slice() })), lo = lowest(spec, S0), dy = PV.fit.lift - lo.y;
  const S = S0.map(s => ({ pos: V.add(s.pos, [0, dy, 0]), rot: s.rot }));
  return { S, vel: map.vel, groundShiftM: dy, lowestBefore: lo, mapper: { fit: map.fit, vd: map.vd, foot: map.lower.poses[1].foot }, bindDiffVsRig: bindDiff, maxVel: Math.max(...map.vel.map(x => Math.max(V.len(x.v), V.len(x.w)))) };
}
// ── tackler entry: the primitive fit (projected Levenberg–Marquardt inside the hard ranges) ──
export const FIT_MAP = Object.freeze({ LEG: ["shank_L", "foot_L"], THIGH: ["thigh_L"], TUCK: ["thigh_R"], TUCKSHIN: ["shank_R"], BODY: ["pelvis"], TRUNK: ["abdomen", "thorax", "head"] });
const FREE = ["lumbar", "thoracic", "hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R"];
export function tacklerModel(spec) { const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), joints = spec.joints;
  const keys = joints.map(j => Object.keys(anatomicalAngles(j, [0, 0, 0, 1], [0, 0, 0, 1]))), free = joints.map(j => FREE.includes(j.name));
  const idx = []; joints.forEach((j, k) => { if (free[k]) keys[k].forEach(key => idx.push([k, key])); });
  const rv2q = (r) => { const a = V.len(r); return a < 1e-15 ? [0, 0, 0, 1] : Q.axis(V.sc(r, 1 / a), a); };
  const pose = (x) => { const S = new Array(B.length); S[0] = { pos: x.slice(0, 3), rot: rv2q(x.slice(3, 6)) }; const ang = joints.map(() => ({})); idx.forEach(([k, key], n) => { ang[k][key] = x[6 + n]; });
    for (const j of joints) { const p = j.parentIndex, c = j.childIndex; S[c] = { pos: V.add(S[p].pos, Q.rot(S[p].rot, V.sub(B[c].origin, B[p].origin))), rot: childRotation(j, S[p].rot, ang[joints.indexOf(j)]) }; } return S; };
  const lim = idx.map(([k, key]) => { const h = joints[k].def.rom[key] && joints[k].def.rom[key].hard; return h ? [h[0], h[1]] : [-180, 180]; });   // anatomical angles are in DEGREES (spec/v2_joints.js)
  return { B, bi, joints, idx, pose, lim, rv2q, nx: 6 + idx.length };
}
export function fitResiduals(md, x, P) {
  const S = md.pose(x), B = md.B, bi = md.bi, g = (n) => P.find(p => p.prim === n), r = [], at = (n) => S[bi(n)].pos;
  const LEG = g("LEG"), u = V.norm(V.sub(LEG.b, LEG.a)), cap = V.add(LEG.b, V.sc(u, PV.fit.legCapR));
  const fwd = supportBody(B[bi("foot_L")], S[bi("foot_L")], u), cen = hullCentroid(B[bi("foot_L")], S[bi("foot_L")]);
  const push = (v, w) => { for (const c of v) r.push(c * w); };
  push(V.sub(fwd, cap), 10); push(perpToLine(cen, LEG.a, LEG.b), 10);
  push(perpToLine(at("shank_L"), LEG.a, LEG.b), 5); push(perpToLine(at("foot_L"), LEG.a, LEG.b), 5);
  const line = (pn, names, wEnd) => { const p = g(pn); for (const n of names) push(perpToLine(at(n), p.a, p.b), 1); if (wEnd) { push(V.sub(at(names[0]), p.a), wEnd); push(V.sub(at(names[names.length - 1]), p.b), wEnd); } };
  line("THIGH", ["thigh_L", "shank_L"], 0.3); line("TUCK", ["thigh_R", "shank_R"], 0.3); line("TUCKSHIN", ["shank_R", "foot_R"], 0.3); line("TRUNK", ["abdomen", "thorax", "head"], 0.3);
  { const p = g("BODY"), c = V.add(S[0].pos, Q.rot(S[0].rot, B[0].comLocal)); push(perpToLine(c, p.a, p.b), 1); push(V.sub(c, V.lerp(p.a, p.b, 0.5)), 0.3); }
  // turf (implementation detail serving the frozen grounding gate G-T4, added before the pre-run freeze): no body below the turf, lowest point near +lift
  { let mn = Infinity; B.forEach((bd, i) => { const y = bodyLowest(bd, S[i]).y; mn = Math.min(mn, y); r.push(Math.min(0, y) * 10); }); r.push((mn - PV.fit.lift) * 5); }
  for (let n = 6; n < md.nx; n++) r.push(1e-3 * x[n] * Math.PI / 180);   // angle regulariser (per radian)
  return r; }
// robust fit (implementation detail, before the pre-run freeze): a fixed deterministic multi-start set (pelvis recline × yaw × hip flexion × tucked-knee
// flexion = 36 starts), each to convergence (≤ 1500 LM iterations); the lowest objective wins (ties: first in the fixed order)
export function fitTackler(spec, P) { let best = null; const starts = [];
  for (const recline of [0, -20, -40]) for (const yawOff of [-15, 0, 15]) for (const hipF of [60, 80]) for (const kneeR of [120, 145]) starts.push({ recline, yawOff, hipF, kneeR });
  for (const st of starts) { const F = fitTacklerFrom(spec, P, st); if (!best || F.f < best.f) best = { ...F, start: st }; }
  return { ...best, starts: starts.length }; }
function fitTacklerFrom(spec, P, st) {
  const md = tacklerModel(spec), clamp = (x) => x.map((v, n) => (n < 6 ? v : Math.min(md.lim[n - 6][1], Math.max(md.lim[n - 6][0], v))));
  // initial guess: pelvis at the BODY midpoint, facing the slide direction (local +x: canonical anterior +z → +x is a yaw of +90° about y), hips flexed 75°
  const g = (n) => P.find(p => p.prim === n), x0 = new Array(md.nx).fill(0); const c0 = V.lerp(g("BODY").a, g("BODY").b, 0.5); x0[0] = c0[0]; x0[1] = c0[1] + 0.05; x0[2] = c0[2];
  const q0 = Q.norm(Q.mul(Q.axis([0, 1, 0], (90 + st.yawOff) * Math.PI / 180), Q.axis([1, 0, 0], st.recline * Math.PI / 180))), hw = q0[3] < 0 ? q0.map(v => -v) : q0;
  const ang = 2 * Math.atan2(V.len(hw.slice(0, 3)), hw[3]), ax = V.len(hw.slice(0, 3)) > 1e-12 ? V.norm(hw.slice(0, 3)) : [0, 1, 0]; [x0[3], x0[4], x0[5]] = V.sc(ax, ang);
  md.idx.forEach(([k, key], n) => { const jn = md.joints[k].name; if ((jn === "hip_L" || jn === "hip_R") && key === "flex") x0[6 + n] = st.hipF; if (jn === "knee_R" && key === "flex") x0[6 + n] = st.kneeR; });
  let x = clamp(x0), r = fitResiduals(md, x, P), f = r.reduce((s, v) => s + v * v, 0), lam = 1e-3, it = 0; const hStep = 1e-6;
  for (; it < 1500; it++) { const Jc = []; for (let n = 0; n < md.nx; n++) { const x2 = x.slice(); x2[n] += hStep; const r2 = fitResiduals(md, x2, P); Jc.push(r2.map((v, i) => (v - r[i]) / hStep)); }
    const JtJ = Jc.map(a => Jc.map(b => a.reduce((s, v, i) => s + v * b[i], 0))), Jtr = Jc.map(a => a.reduce((s, v, i) => s + v * r[i], 0)); let improved = false;
    for (let tries = 0; tries < 10; tries++) { const A = JtJ.map((row, a) => row.map((v, b) => v + (a === b ? lam * (1 + JtJ[a][a]) : 0))), step = MC.solveDense(A, Jtr.map(v => -v)), x2 = clamp(x.map((v, n) => v + step[n])), r2 = fitResiduals(md, x2, P), f2 = r2.reduce((s, v) => s + v * v, 0);
      if (f2 < f) { const df = f - f2; x = x2; r = r2; f = f2; lam = Math.max(1e-12, lam / 4); improved = true; if (df < 1e-14 * Math.max(1, f)) it = 1e9; break; } lam *= 8; }
    if (!improved) break; }
  return { md, x, S: md.pose(x), f, iterations: it };
}
// fit gates G-T1…G-T4 on a (grounded) tackler pose
export function fitGates(spec, S, P, groundShiftM) { const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), g = (n) => P.find(p => p.prim === n), at = (n) => S[bi(n)].pos, mm = (x) => x * 1000;
  const LEG = g("LEG"), u = V.norm(V.sub(LEG.b, LEG.a)), cap = V.add(LEG.b, V.sc(u, PV.fit.legCapR)), fwd = supportBody(B[bi("foot_L")], S[bi("foot_L")], u), cen = hullCentroid(B[bi("foot_L")], S[bi("foot_L")]);
  const d = (p, pn) => mm(V.len(perpToLine(p, g(pn).a, g(pn).b)));
  const T1 = { bootFwdMm: mm(V.dist(fwd, cap)), centroidMm: d(cen, "LEG") }, T2 = { kneeMm: d(at("shank_L"), "LEG"), ankleMm: d(at("foot_L"), "LEG") };
  const T3 = { hipL_THIGH: d(at("thigh_L"), "THIGH"), kneeL_THIGH: d(at("shank_L"), "THIGH"), hipR_TUCK: d(at("thigh_R"), "TUCK"), kneeR_TUCK: d(at("shank_R"), "TUCK"), kneeR_TUCKSHIN: d(at("shank_R"), "TUCKSHIN"), ankleR_TUCKSHIN: d(at("foot_R"), "TUCKSHIN"),
    lumbar_TRUNK: d(at("abdomen"), "TRUNK"), thoracic_TRUNK: d(at("thorax"), "TRUNK"), neck_TRUNK: d(at("head"), "TRUNK"), pelvisCOM_BODY: mm(segDist(V.add(S[0].pos, Q.rot(S[0].rot, B[0].comLocal)), g("BODY").a, g("BODY").b)) };
  const pass = { T1: T1.bootFwdMm <= PV.fit.bootMm && T1.centroidMm <= PV.fit.centroidMm, T2: T2.kneeMm <= PV.fit.shankMm && T2.ankleMm <= PV.fit.shankMm, T3: Object.values(T3).every(v => v <= PV.fit.otherMm), T4: Math.abs(mm(groundShiftM)) <= PV.fit.groundShiftMm };
  return { T1, T2, T3, T4: { groundShiftMm: mm(groundShiftM) }, pass, all: Object.values(pass).every(Boolean) }; }
export const rad = (d) => d * Math.PI / 180;
