// BALANCE-2 §3 — geometric (laboratory-convention) sagittal joint angles of a standing state, from segment positions (read-only).
// knee flexion = angle between thigh (HJC→KJC) and shank (KJC→AJC); ankle dorsiflexion = 90° − angle(shank-up, foot forward);
// hip flexion = angle between −pelvis-up and the thigh axis, signed + when the knee is ahead; segment tilts from vertical (+ forward).
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SPEC = PL.SPEC_R(), R2D = 180 / Math.PI;
const bi = (n) => SPEC.bodies.findIndex(b => b.name === n), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, V.dot(a, b) / (V.len(a) * V.len(b))))) * R2D;
export function segmentAngles(S) { const out = {}; const pelUp = Q.rot(S[bi("pelvis")].rot, [0, 1, 0]);
  for (const s of ["L", "R"]) { const H = S[bi("thigh_" + s)].pos, K = S[bi("shank_" + s)].pos, A = S[bi("foot_" + s)].pos, ff = Q.rot(S[bi("foot_" + s)].rot, [0, 0, 1]);
    const th = V.sub(K, H), sh = V.sub(A, K), knee = ang(th, sh), ankle = 90 - ang(V.sub(K, A), ff), hip = ang(V.sc(pelUp, -1), th) * Math.sign(th[0] - (-pelUp[0]) * V.len(th) + 1e-12);
    out[s] = { kneeFlexDeg: knee, ankleDorsiDeg: ankle, hipFlexDeg: ang(V.sc(pelUp, -1), th), thighTiltDeg: Math.atan2(th[0], -th[1]) * R2D, shankTiltDeg: Math.atan2(-sh[0], -sh[1]) * R2D, HJC: H, KJC: K, AJC: A }; }
  const tilt = (n) => { const u = Q.rot(S[bi(n)].rot, [0, 1, 0]); return Math.atan2(u[0], u[1]) * R2D; };
  out.tiltDeg = { pelvis: tilt("pelvis"), abdomen: tilt("abdomen"), thorax: tilt("thorax"), head: tilt("head") }; return out; }
