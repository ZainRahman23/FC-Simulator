// receive_turn11/tools/rt11_contin.mjs — FOOT CONTINUITY of any posed body (the same measure for RECEIVE-TURN-1's body and the 1.1 body), read
// from the POSED skeleton only (no knowledge of the body's plan):
//   jump   the largest movement of a foot's ankle or forefoot (MTP joint) in one 1/240 s tick, anywhere in the episode (a snap shows as a jump far
//          beyond any real foot speed: 5 cm per tick = 12 m/s)
//   snap   the largest second difference of a foot joint's position over three ticks (|x(k+1) − 2x(k) + x(k−1)|): a teleport shows as a step
//          of the order of its size; smooth motion (≤ 600 m/s² ≈ 1 mm per tick²) far below; a foot striking the ball (a kink) shows as Δv·dt
//   speed  the largest posed foot-joint speed (m/s)
//   skate  the travel of a foot's forefoot while it is on the turf (its MTP joint within 1 mm of its planted height) and of its ankle while the
//          heel is down (ankle within 1 mm of its planted height), per contiguous stretch, the largest — a planted foot that slides
export const GROUND = { ankle: 0.088, mtp: 0.031, tol: 0.001 };
export function continuity(B, tc, t0, t1, ballAt) {
  const dt = 1 / 240, out = { jump: { m: 0, t: null, foot: null, joint: null }, snap: { m: 0, t: null, foot: null, joint: null }, skate: { forefoot: 0, heel: 0, t: null, foot: null }, ticks: 0 };
  const prev = { R: null, L: null }, prev2 = { R: null, L: null }, run = { R: { mtp: null, ank: null }, L: { mtp: null, ank: null } };
  for (let k = 0, n = Math.round((t1 - t0) / dt); k <= n; k++) { const t = t0 + k * dt, po = B.poseAt(tc + t, ballAt ? ballAt(t) : null); out.ticks++;
    for (const F of ["R", "L"]) { const a = po.J["foot_" + F].j, m = po.J["toe_" + F].j, p = prev[F];
      if (p) { for (const [nm, q, q0] of [["ankle", a, p.a], ["forefoot", m, p.m]]) { const d = Math.hypot(q[0] - q0[0], q[1] - q0[1], q[2] - q0[2]); if (d > out.jump.m) out.jump = { m: d, t, foot: F, joint: nm }; }
        const p2 = prev2[F]; if (p2) for (const [nm, q, q0, q1] of [["ankle", a, p.a, p2.a], ["forefoot", m, p.m, p2.m]]) { const d = Math.hypot(q[0] - 2 * q0[0] + q1[0], q[1] - 2 * q0[1] + q1[1], q[2] - 2 * q0[2] + q1[2]); if (d > out.snap.m) out.snap = { m: d, t: t - dt, foot: F, joint: nm }; }
        const r = run[F];
        if (m[2] <= GROUND.mtp + GROUND.tol && p.m[2] <= GROUND.mtp + GROUND.tol) { r.mtp = (r.mtp || 0) + Math.hypot(m[0] - p.m[0], m[1] - p.m[1]); if (r.mtp > out.skate.forefoot) { out.skate.forefoot = r.mtp; out.skate.t = t; out.skate.foot = F; } } else r.mtp = null;
        if (a[2] <= GROUND.ankle + GROUND.tol && p.a[2] <= GROUND.ankle + GROUND.tol) { r.ank = (r.ank || 0) + Math.hypot(a[0] - p.a[0], a[1] - p.a[1]); out.skate.heel = Math.max(out.skate.heel, r.ank); } else r.ank = null; }
      prev2[F] = prev[F]; prev[F] = { a: a.slice(), m: m.slice() }; } }
  out.jump.speed = out.jump.m / dt; return out;
}
