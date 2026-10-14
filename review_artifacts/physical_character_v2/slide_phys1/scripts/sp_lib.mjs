// SLIDE-PHYS-1 shared library. Read-only imports of the frozen V2 / PVP-0 implementations (nothing there is modified):
//   world + ledgers + contact decode   = pvp1a_sim.mjs PvpPlant (solo "tackler") through pvp0_plant.mjs Pvp0Plant (tackler law hook, parked → dynamic
//                                        activation with ONE velocity write per body = the initial condition)
//   body                               = the PVP-1A / PVP-0 tackler spec (V1-matched V2, 1.90 m, 78.9 kg: the qualified body closest to gabriel)
//   muscles                            = the canonical M1b MuscleLayer through balance1/scripts/b1_body.mjs M1bBody (excitation only)
// This file adds only pose construction (anatomical angles → V2 forward kinematics), kinematic helpers and measurement helpers.
import fs from "fs"; import zlib from "zlib";
export const RA = new URL("../../", import.meta.url).href;
export const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"); export const { V, Q, IL } = PL;
const J0 = await import(PL.P2 + "spec/v2_joints.js"); export const { childRotation, anatomicalAngles } = J0;
const { loadJolt } = await import(PL.P2 + "core/v2_jolt.js");
export const MB = await import(RA + "balance1/scripts/b1_body.mjs");
const { Pvp0Plant } = await import(RA + "pvp0/scripts/pvp0_plant.mjs");
// solo mode: PPR-1's runner-only ledger / readback helpers are inert without a runner (the tackler's own ledgers are PvpPlant._record's)
export class SoloPlant extends Pvp0Plant { _extLedger(...a) { if (this.runner) super._extLedger(...a); } _actRows() { return this.runner ? super._actRows() : []; } _passiveRows() { return this.runner ? super._passiveRows() : []; }
  // ENTRY MUSCLE STATE (SLIDE-PHYS-1 fix, 14 Oct): the parked construction state has zero velocities, so the law's first command (which sets the
  // muscle steady state, init = true) saw the entry's joint rates as tracking error. At activation the command is recomputed on the TRUE entry
  // state (positions + the written velocities) and the muscles are initialised at its steady state ("as if commanding this for a while":
  // physically self-consistent pre-activation). No body state is changed by this.
  _activate() { super._activate(); if (!this.reinitEntry || !this.lawT) return; const c = this.tackler, S = this.readAll(); c.st = S.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt);
    const { cmd } = this.lawT.command(c, c.st, c.up.ev, this.n); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); this.entryReinit = true; } }
export { Pvp0Plant };
export const SPEC = PL.SPEC_T();
export const B = SPEC.bodies, JN = SPEC.joints, M = B.reduce((s, b) => s + b.mass, 0), G = 9.81, D2R = Math.PI / 180;
export const bi = (n) => B.findIndex(b => b.name === n), ji = (n) => JN.findIndex(j => j.name === n);
export const BODY = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA)));
let JOLT = null; export async function jolt() { return JOLT || (JOLT = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js")); }
export const readGz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), writeGz = (f, o) => fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(o)));

// ── forward kinematics from anatomical angles ──
// root = { pos: pelvis body origin (world), rot: pelvis world rotation }; anat = { jointName: { key: deg } } (missing = 0)
export function fk(root, anat) { const R = [], P = []; R[0] = Q.norm(root.rot); P[0] = root.pos.slice();
  for (const j of JN) { const pa = j.parentIndex, ch = j.childIndex; R[ch] = childRotation(j, R[pa], anat[j.name] || {});
    P[ch] = V.sub(V.add(P[pa], Q.rot(R[pa], V.sub(j.at, B[pa].origin))), Q.rot(R[ch], V.sub(j.at, B[ch].origin))); }
  return B.map((_, i) => ({ pos: P[i], rot: R[i] })); }
export function anatOf(pose) { const o = {}; for (const j of JN) o[j.name] = anatomicalAngles(j, pose[j.parentIndex].rot, pose[j.childIndex].rot); return o; }
export const comBody = (pose, i) => V.add(pose[i].pos, Q.rot(pose[i].rot, B[i].comLocal));
export const comOf = (pose) => V.sc(pose.reduce((s, p, i) => V.add(s, V.sc(comBody(pose, i), B[i].mass)), [0, 0, 0]), 1 / M);
export const lowestOf = (pose) => PL.lowest(SPEC, pose);
// body velocities from two consistent poses dt apart (central rotation vector of R1·R0⁻¹; joint chain consistency follows from FK of both poses)
export function bodyVels(p0, p1, dt) { return p0.map((s, i) => { const v = V.sc(V.sub(p1[i].pos, s.pos), 1 / dt), dq0 = Q.norm(Q.mul(p1[i].rot, Q.conj(s.rot))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0;
  const ang = 2 * Math.acos(Math.min(1, dq[3])), sn = Math.sin(ang / 2), w = sn > 1e-12 ? V.sc([dq[0], dq[1], dq[2]], ang / sn / dt) : [0, 0, 0]; return { v, w }; }); }
// velocity of the body ORIGIN → velocity of the body COM (Jolt velocities are at the COM)
export const comVels = (pose, vel) => vel.map((x, i) => ({ v: V.add(x.v, V.cross(x.w, Q.rot(pose[i].rot, B[i].comLocal))), w: x.w }));
// Jolt quaternion slerp
export const slerp = (a, b, u) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(x => -x); d = -d; } if (d > 0.9995) return Q.norm(a.map((x, i) => x + (b[i] - x) * u));
  const th = Math.acos(d), s = Math.sin(th); return a.map((x, i) => (Math.sin((1 - u) * th) * x + Math.sin(u * th) * b[i]) / s); };
export const yawQ = (deg) => { const a = deg * D2R / 2; return [0, Math.sin(a), 0, Math.cos(a)]; }, axisQ = (ax, deg) => Q.axis(V.norm(ax), deg * D2R);

// ── the solo tackler plant: the frozen PVP-0 world with the tackler only (PvpPlant solo mode) ──
// entry = { pose, vel (COM velocities, per body), steps, law: (plant, c) => law, flags }; the tackler is parked kinematic at construction with zero
// velocity and becomes dynamic at step 0 with `vel` (one write per body), exactly the PVP-0 activation mechanism.
export async function soloPlant(entry) { const J = await jolt();
  const entries = { tackler: { poses: entry.pose, vel: entry.pose.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })) } };
  const sim = new SoloPlant(J, entries, { tackler: entry.flags || { L: false, R: false } }, "N2", { solo: "tackler", O: [0, 0, 0], instrument: entry.instrument !== false, maxSteps: entry.steps,
    lawT: entry.law, activate: 0, tacklerVel: entry.vel, ...(entry.plantOpts || {}) });
  sim.reinitEntry = entry.reinitEntry !== false; return sim; }
export const FIX = () => JSON.parse(fs.readFileSync(new URL("ppr3/fixture/PPR3_STANDING_ENTRY.json", RA)));
export const C3P = () => JSON.parse(fs.readFileSync(new URL("balance2/c3/params/C3.json", RA)));

// ── skeleton points for quick-look drawings (joint centres + segment tips) ──
export const SEGS = [["pelvisL", "pelvisR"], ["pelvisM", "lumbar"], ["lumbar", "thoracic"], ["thoracic", "neck"], ["neck", "headTop"], ["thoracic", "shoulder_L"], ["thoracic", "shoulder_R"],
  ["shoulder_L", "elbow_L"], ["elbow_L", "hand_L"], ["shoulder_R", "elbow_R"], ["elbow_R", "hand_R"], ["hip_L", "knee_L"], ["knee_L", "ankle_L"], ["ankle_L", "toe_L"], ["ankle_L", "heel_L"],
  ["hip_R", "knee_R"], ["knee_R", "ankle_R"], ["ankle_R", "toe_R"], ["ankle_R", "heel_R"]];
export function skel(pose) { const o = {}, at = (j) => V.add(pose[j.parentIndex].pos, Q.rot(pose[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin)));
  for (const j of JN) o[j.name] = at(j); o.pelvisL = o.hip_L; o.pelvisR = o.hip_R; o.pelvisM = V.sc(V.add(o.hip_L, o.hip_R), 0.5);
  const loc = (i, p) => V.add(pose[i].pos, Q.rot(pose[i].rot, p));
  o.headTop = loc(bi("head"), [0, 0.24, 0.03]);
  for (const s of ["L", "R"]) { const f = bi("foot_" + s), fa = bi("forearm_" + s), sgn = s === "L" ? -1 : 1; o["toe_" + s] = loc(f, [0, -0.07, 0.23]); o["heel_" + s] = loc(f, [0, -0.07, -0.07]); o["hand_" + s] = loc(fa, [sgn * 0.46, 0, 0]); }
  return o; }

// ── TCF-1 (labelled turf-contact candidate, OFF unless requested): boot studs grip only when the sole faces the turf. For a boot–turf manifold the
// combined friction is blended from the studded value (spec boot|turf, 1.2) to the boot-upper / heel-counter value (default = spec body|turf 0.5)
// by the angle between the sole's outward normal and straight down: studded below 35°, upper above 55°, smoothstep between. Every other pair is
// the spec's table, unchanged. footUD = the Jolt user data of the boot bodies it applies to (body index + 1).
export function installSoleRule(sim, footUD, opts = {}) { const J = sim.J, w = sim.w, Lr = w.listener, GROUND = 1000, muS = opts.studded ?? 1.2, muU = opts.upper ?? 0.5, c35 = Math.cos(35 * D2R), c55 = Math.cos(55 * D2R);
  const set = new Set(footUD), log = sim.soleLog = { n: 0, upper: 0 };
  const adj = (b1p, b2p, mp, sp) => { const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), u1 = b1.GetUserData(), u2 = b2.GetUserData();
    const foot = u1 === GROUND && set.has(u2) ? b2 : u2 === GROUND && set.has(u1) ? b1 : null; if (!foot) return;
    const r = foot.GetRotation(), q = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], ns = Q.rot(q, [0, -1, 0]), c = -ns[1], s = Math.max(0, Math.min(1, (c - c55) / (c35 - c55))), k = s * s * (3 - 2 * s);
    const cs = J.wrapPointer(sp, J.ContactSettings); cs.mCombinedFriction = muU + (muS - muU) * k; log.n++; if (k < 1) log.upper++; };
  const oa = Lr.OnContactAdded, op = Lr.OnContactPersisted;
  Lr.OnContactAdded = (a, b, c, d) => { oa(a, b, c, d); adj(a, b, c, d); }; Lr.OnContactPersisted = (a, b, c, d) => { op(a, b, c, d); adj(a, b, c, d); };
  return log; }
