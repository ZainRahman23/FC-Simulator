// SLIDE-PHYS-1 committed-entry state: a running touchdown of the plant (fold) foot, built from anatomical angles + explicit joint rates + a
// root velocity, with every body's linear / angular velocity from the central difference of two exact V2 FK poses ±h apart (so the entry is
// joint-consistent: every joint anchor has one velocity), placed so the plant boot's lowest point is 0.5 mm above the turf.
// entry spec: { anat: {joint:{key:deg}}, rate: {joint:{key:deg/s}}, pelvis: { pitchDeg, rollDeg, yawDeg }, pelvisW: [rad/s world], vRoot: [m/s world] }
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, JN, bi } = L;
export const pelvisRot = (p) => Q.norm(Q.mul(L.axisQ([0, 1, 0], p.yawDeg || 0), Q.mul(L.axisQ([1, 0, 0], p.pitchDeg || 0), L.axisQ([0, 0, 1], p.rollDeg || 0))));
const add = (a, r, s) => { const o = {}; for (const j of new Set([...Object.keys(a), ...Object.keys(r)])) { o[j] = { ...(a[j] || {}) }; for (const [k, v] of Object.entries(r[j] || {})) o[j][k] = (o[j][k] || 0) + s * v; } return o; };
export function buildEntry(E, h = 1e-3) { const R0 = pelvisRot(E.pelvis), w = E.pelvisW || [0, 0, 0];
  const rotStep = (s) => { const a = V.len(w) * s; return a === 0 ? R0 : Q.norm(Q.mul(Q.axis(V.norm(w), a), R0)); };
  const raw = L.fk({ pos: [0, 1, 0], rot: R0 }, E.anat), lo = L.lowestOf(raw), off = [0, 0.0005 - lo.y, 0], root0 = V.add([0, 1, 0], off);
  const pose = L.fk({ pos: root0, rot: R0 }, E.anat), vr = E.vRoot;
  const pa = L.fk({ pos: V.add(root0, V.sc(vr, -h)), rot: rotStep(-h) }, add(E.anat, E.rate || {}, -h)), pb = L.fk({ pos: V.add(root0, V.sc(vr, h)), rot: rotStep(h) }, add(E.anat, E.rate || {}, h));
  const velO = L.bodyVels(pa, pb, 2 * h), vel = L.comVels(pose, velO);
  const lowBody = B[L.lowestOf(pose).body].name, Mv = V.sc(vel.reduce((s, x, i) => V.add(s, V.sc(x.v, B[i].mass)), [0, 0, 0]), 1 / L.M);
  const footVel = (s) => { const i = bi("foot_" + s), p = pose[i], sole = V.add(p.pos, Q.rot(p.rot, [0, -0.09, 0.07])); return V.add(vel[i].v, V.cross(vel[i].w, V.sub(sole, L.comBody(pose, i)))); };
  return { pose, vel, root: root0, comVel: Mv, com: L.comOf(pose), lowestBody: lowBody, plantSoleVel: { L: footVel("L"), R: footVel("R") } }; }
