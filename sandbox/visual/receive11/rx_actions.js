// ═══ receive11/rx_actions.js — RECEIVE-CONTROL-1.1: the AUTHORED RECEIVE-ACTION LIBRARY ═══════════════════════════════════════════════════════════
// A receive FAMILY is a simulation action — what the player ATTEMPTS — never an outcome. Each family is authored once, in PLAYER-LOCAL coordinates
// for the RIGHT contact foot ([ahead, lateral], + lateral = right; angles 0 = forward, + = right, 180 = back, −90 / 270 = left), and mirrored
// deterministically for the left foot (lateral → −lateral, angle → −angle). The simulation selects a family, a contact foot, a side and a contact
// tick; it derives from the family, the incoming ball and the desired exit:
//   · the body path (root position / velocity / facing — the authored body, with its turn cost: bounded accelerations and rotation rate),
//   · the footwork (touchdowns, the standing foot at the contact, the contact foot's swing and its CONTACT marker),
//   · the IDEAL first touch: the ball state that puts the ball where the player will next play it (the RECONNECTION point on his new line), the
//     surface that can give that impulse, and the action's difficulty.
// Ball Control (rx_exec.js) then decides how well the touch is executed; the ball is a free rigid body before and after the contact.
// Frames: pitch (x, y), heading θ, forward f(θ) = (cos θ, sin θ), right r(θ) = (−sin θ, cos θ) — + = right turn (the lab / TURN-1.2 convention).
export const DEG = Math.PI / 180;
export const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };
export const tab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return T[T.length - 1][1]; };
export const fwd = (th) => [Math.cos(th), Math.sin(th)], rgt = (th) => [-Math.sin(th), Math.cos(th)];
export const hdg = (v) => Math.atan2(v[1], v[0]);
export const toPitch = (P, th, a, l) => [P[0] + a * Math.cos(th) - l * Math.sin(th), P[1] + a * Math.sin(th) + l * Math.cos(th)];   // body-local [ahead, lateral] → pitch
export const toLocal = (P, th, q) => { const dx = q[0] - P[0], dy = q[1] - P[1]; return [dx * Math.cos(th) + dy * Math.sin(th), -dx * Math.sin(th) + dy * Math.cos(th)]; };
export const sideOf = (F) => (F === "R" ? 1 : -1), other = (F) => (F === "R" ? "L" : "R");

// ── TURN-1's approved angle–velocity trade-off (turn1_loco.js T1.sEntry: the largest COM speed a plant at that heading change is entered at) ─────
export const S_ENTRY = [[45, 7.2], [60, 6.0], [90, 4.3], [120, 3.4], [135, 3.0], [180, 2.4]];

// ── CONTACT SURFACES — the boot surface whose outward normal can face the IMPULSE (Δv = v_out − v_in) at the contact. α = the impulse direction
// relative to the body's facing at the contact (deg, + right). Ranges for the RIGHT foot (the left foot mirrors α → −α):
//   INSIDE  — the medial side (neutral: facing left, −90°); hip external rotation turns it to face forward (the side-foot pass) or back-left (the
//             drag behind the standing leg)
//   OUTSIDE — the lateral side (neutral: facing right, +90°)
//   LACES   — the instep, toes down (a push forward)
//   SOLE    — under the foot (a drag back / a trap)
// Preference (receiving): INSIDE, then OUTSIDE, LACES, SOLE. A gentle touch (|Δv| < gentle) can be made with any surface of the family.
// GLANCING TOLERANCE: a boot surface need not face the impulse exactly — friction and the foot's own motion deflect the ball within a cone about the
// surface normal: up to tol(|Δv|) degrees (wide for a soft touch, narrow for a hard redirection); the deviation used adds difficulty (rx_exec)
// FOOT YAW: the authored range of each surface's foot yaw relative to the body (deg, right-foot convention; + = turned out)
export const SURF = {
  INSIDE: { R: [-165, 15], yaw: [-35, 100], pref: 0 }, OUTSIDE: { R: [20, 165], yaw: [-80, 30], pref: 0.25 }, LACES: { R: [-30, 30], yaw: [-35, 35], pref: 0.15 }, SOLE: { R: [150, 210], yaw: [-60, 60], pref: 0.35 },
  gentle: 0.8, tol: [[1, 50], [3, 42], [6, 30], [10, 20], [16, 14]],
};
export function surfacesFor(fam, F, alphaDeg, dvMag) {                          // the family's surfaces that can give this impulse, in preference order
  const a = sideOf(F) * alphaDeg, tol = tab(SURF.tol, dvMag), out = [];            // (mirrored into the right-foot convention)
  for (const s of fam.surfaces) { if (dvMag < SURF.gentle) { out.push(s); continue; } const [lo, hi] = SURF[s].R, x = ((a - lo + tol) % 360 + 360) % 360; if (x <= hi - lo + 2 * tol) out.push(s); }
  return out;
}
// the foot's world yaw that makes surface s of foot F face the impulse heading hn (the procedural body; inside of the right foot = its left side)
export function footYawFor(s, F, hn) { const sg = sideOf(F); return s === "INSIDE" ? hn + sg * 90 * DEG : s === "OUTSIDE" ? hn - sg * 90 * DEG : s === "SOLE" ? hn + Math.PI : hn; }

// ── THE FAMILIES ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// rta: the |receiveTurnAngle| range (deg) the family serves (ordinary < 90 ≤ turning; the classification is RECEIVE-CONTROL-1's, unchanged).
// feet: "either" (both feet are candidates), "near" (the foot on the TURN side), "far" (the foot away from the turn side).
// contact: candidate positions of the ball at the CONTACT marker, body-local [ahead, lateral] for the right contact foot (mirrored for the left).
// stand: the standing foot's plant at the contact (same frame). face: the body's facing at the contact (preparation). vContact: the body speed at
// the contact (the turn cost: TURN-1's sEntry for the turn, × k). follow: the contact foot lands this long after the contact. txMin: the shortest
// contact → handoff. rotShare: the share of the exit rotation done by the handoff touchdown (the rest is TURN-1.2's first step).
// reconnect: where the ideal first touch sends the ball — for a "go" family the ball is ON the player's new line, HANDOFF_AHEAD(speed) in front of
// him, at the handoff tick (the state DRIBBLE-V1 takes over best: receive11/tools/rx_d1accept.mjs measured its takeover from ball states ahead
// of a runner — on the line and ≥ 1 m ahead it takes over almost always, 0.2 m off the line or 0.6 m ahead often not); for a kill the rest
// point in front of the feet.
export const HANDOFF_AHEAD = [[2.5, 1.2], [4.0, 1.4], [5.5, 1.6], [7.8, 2.0], [9.5, 2.4]];
export const FAMILIES = {
  CUSHION: {
    id: "CUSHION", label: "kill / cushion", kind: "ordinary", rta: [0, 90], intents: ["kill"], feet: "either", surfaces: ["INSIDE", "SOLE"],
    contact: [[0.36, 0.17]], stand: [-0.02, -0.15], face: { mode: "ball", max: 70 }, vContact: { max: 1.0 }, follow: 0.18, txMin: 0.55,
    reconnect: { rest: 0.42 }, crouch: 0.07, pref: 0,
    doc: "The ball deadened in front of the feet: the contact foot meets it with the inside and gives with it; the body squares up to the pass and settles. Ideal outgoing speed: what rolls the ball to rest `rest` m in front of the body.",
  },
  STRIDE: {
    id: "STRIDE", label: "touch into stride", kind: "ordinary", rta: [0, 90], intents: ["go"], feet: "either", surfaces: ["INSIDE", "OUTSIDE", "LACES"],
    contact: [[0.42, 0.17], [0.40, -0.03]], stand: [-0.02, -0.11], face: { mode: "lead", k: 0.35, max: 35 }, vContact: { k: 1.25, keep: true }, follow: 0.14, txMin: 0.26,
    reconnect: { handoff: true }, crouch: 0.03, pref: 0,
    doc: "The runner does not stop: the first touch is the next touch of his run — the ball sent ahead along the new line (an angled receive redirects it there) so that he meets it at his next stride, `tauK` × the dribble's shortest touch interval later.",
  },
  OPEN_TURN: {
    id: "OPEN_TURN", label: "open-body turn (near foot)", kind: "turning", rta: [90, 150], intents: ["go"], feet: "near", surfaces: ["OUTSIDE", "LACES", "INSIDE"],
    contact: [[0.34, 0.20]], stand: [0.0, -0.15], face: { mode: "turn", k: 0.45, max: 60 }, vContact: { k: 1.1 }, follow: 0.15, txMin: 0.40,
    reconnect: { handoff: true }, exitV: [[90, 4.2], [120, 3.6], [150, 3.1]], rotShare: 0.92, crouch: 0.05, pref: 0.10,
    doc: "Half-turn receive: the body opens toward the new direction before the ball arrives, the foot on the turn side takes the ball into the new line, the body completes the turn around it.",
  },
  THROUGH_TURN: {
    id: "THROUGH_TURN", label: "through-stance turn (far foot inside)", kind: "turning", rta: [90, 181], intents: ["go"], feet: "far", surfaces: ["INSIDE", "SOLE"],
    // across: the far foot reaches in front of the standing foot (the ball crosses in front of / through the stance); behind: it takes the ball
    // beside the standing foot and sends it behind the standing leg (the Cruyff / Gravenberch receive)
    contact: [[0.30, 0.02], [0.14, 0.05]], stand: [0.04, -0.19], face: { mode: "turn", k: 0.22, max: 35 }, vContact: { k: 1.0 }, follow: 0.17, txMin: 0.46,
    reconnect: { handoff: true }, exitV: [[90, 4.0], [135, 3.2], [180, 2.8]], rotShare: 0.92, crouch: 0.07, pref: 0,
    doc: "(SOLE: when the ball must be pulled straight back — a drag-back through the stance.) Through / across-stance turn (Gravenberch-like): the foot AWAY from the turn redirects the ball with its inside across / behind the standing leg in an INTERMEDIATE direction — toward the point where the player will rejoin it on his new line — while the body rotates around the ball's path on the standing foot, steps round and emerges on the new line.",
  },
};
export const FAMILY_ORDER = ["CUSHION", "STRIDE", "OPEN_TURN", "THROUGH_TURN"];

// ── FOOTWORK TIMING: the touchdowns from the action start to the handoff, fitted to the CONTACT marker ─────────────────────────────────────────
// Touchdowns alternate feet: index 0 = the foot that has just landed at the start (TURN-1.2's touchdown, or for a standing receiver the foot that
// stays planted while the other steps first). S (the standing foot) lands at index m shortly before the contact (δ ∈ plantBefore) and supports it;
// the contact foot C swings into the ball and lands `follow` after it; steps continue until the HANDOFF touchdown h (≥ txMin after the contact),
// whose previous stance ends one flight before it (TURN-1.2's state at a touchdown: the other foot lifted off one flight ago).
export const STEPS = { iLo: 0.17, iHi: 0.5, plantBefore: [0.05, 0.24], plantNom: 0.10, liftBefore: 0.14, sSupport: 0.05, sRun: 0.07, iPost: [0.2, 0.36], walk: 2.0 };
export function planSteps(o) {
  // o: { t0, tc, F0 (index-0 foot), S, iNom (nominal step interval), dcK (stance share of an interval), follow, txMin, iPost (nominal post-contact
  // interval), tfH (the flight of TURN-1.2's gait at the handoff speed), slow (walking: stances overlap), hold (no handoff: kill + hold) }
  const parityOk = (m) => (m % 2 === 0) === (o.S === o.F0);
  let best = null;
  for (let m = 1; m <= 6; m++) { if (!parityOk(m)) continue;
    for (let q = 0; q <= 8; q++) { const dl = STEPS.plantBefore[0] + (STEPS.plantBefore[1] - STEPS.plantBefore[0]) * q / 8, tm = o.tc - dl, I = (tm - o.t0) / m; if (I < STEPS.iLo || I > STEPS.iHi) continue;
      const cost = Math.abs(I - o.iNom) / o.iNom + 0.6 * Math.abs(dl - STEPS.plantNom) / 0.1; if (!best || cost < best.cost) best = { m, I, tm, dl, cost }; } }
  if (!best) return null;
  const steps = [], { m, I } = best, dStance = (Ii) => (o.slow ? Ii + 0.1 : clamp(o.dcK * Ii, 0.1, Ii - 0.035));
  const foot = (i) => (i % 2 === 0 ? o.F0 : (o.F0 === "R" ? "L" : "R"));
  for (let i = 0; i <= m; i++) steps.push({ i, F: foot(i), t: o.t0 + i * I, d: dStance(I) });
  // the contact foot (index m − 1) must have left the ground liftBefore before the contact
  const C = steps[m - 1]; if (C.t + C.d > o.tc - STEPS.liftBefore) { C.d = o.tc - STEPS.liftBefore - C.t; if (C.d < 0.06 && m - 1 > 0) return null; if (m - 1 === 0) C.d = Math.max(0, C.d); }
  // after the contact
  const tC2 = o.tc + o.follow; steps.push({ i: m + 1, F: foot(m + 1), t: tC2, d: 0 });
  if (o.hold) { const S = steps[m]; S.d = Infinity; steps[m + 1].d = Infinity; return { steps, m, h: null, th: null, I, dl: best.dl }; }
  const ip = clamp(Math.max(o.iPost, o.tfH + 0.11), STEPS.iPost[0], STEPS.iPost[1]);
  let h = m + 1, th = tC2; while (th - o.tc < o.txMin - 1e-9) { h++; th += ip; steps.push({ i: h, F: foot(h), t: th, d: 0 }); }
  // stance durations after the contact: S supports the contact (and the follow-through); the handoff's previous stance ends one flight before it
  // (running: the standing foot leaves the ground soon after the contact — the body's momentum carries it on; walking: until the contact foot lands)
  const S = steps[m]; S.d = (o.slow ? Math.max(o.tc + STEPS.sSupport, (h === m + 1 ? th - o.tfH : steps[m + 1].t + 0.03)) : Math.min(o.tc + STEPS.sRun, h === m + 1 ? th - o.tfH : steps[m + 1].t)) - S.t;
  for (let i = m + 1; i < h; i++) { const nx = steps[i + 1].t; steps[i].d = i === h - 1 ? nx - o.tfH - steps[i].t : (o.slow ? nx - steps[i].t + 0.08 : clamp(o.dcK * (nx - steps[i].t), 0.1, nx - steps[i].t - 0.035)); }
  if (h === m + 1) S.d = Math.min(th - o.tfH, o.slow ? Infinity : o.tc + STEPS.sRun) - S.t;
  if (steps[h - 1].d < 0.06) return null;
  steps[h].d = 0.05;                                                                // (TURN-1.2 owns the handoff stance)
  return { steps, m, h, th, I, dl: best.dl, ip };
}

// ── THE AUTHORED BODY PATH (root): cubic Hermite pieces in position (exact endpoint positions and velocities), facing by smootherstep keys ─────
export function herm(P0, V0, P1, V1, T) {                                          // the piece on [0, T]
  const d = [P1[0] - P0[0], P1[1] - P0[1]];
  const a0 = [(6 * d[0] - 4 * T * V0[0] - 2 * T * V1[0]) / (T * T), (6 * d[1] - 4 * T * V0[1] - 2 * T * V1[1]) / (T * T)];
  const a1 = [(-6 * d[0] + 2 * T * V0[0] + 4 * T * V1[0]) / (T * T), (-6 * d[1] + 2 * T * V0[1] + 4 * T * V1[1]) / (T * T)];
  return { T, P0, V0, P1, V1, aPeak: Math.max(Math.hypot(a0[0], a0[1]), Math.hypot(a1[0], a1[1])),
    at(t) { const u = clamp(t / T, 0, 1), u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      const g00 = (6 * u2 - 6 * u) / T, g10 = 3 * u2 - 4 * u + 1, g01 = (-6 * u2 + 6 * u) / T, g11 = 3 * u2 - 2 * u;
      return { P: [h00 * P0[0] + h10 * T * V0[0] + h01 * P1[0] + h11 * T * V1[0], h00 * P0[1] + h10 * T * V0[1] + h01 * P1[1] + h11 * T * V1[1]],
        V: [g00 * P0[0] + g10 * V0[0] + g01 * P1[0] + g11 * V1[0], g00 * P0[1] + g10 * V0[1] + g01 * P1[1] + g11 * V1[1]] }; } };
}
// the minimum speed along a piece (sampled) — a touch into stride must not brake the runner
export function minSpeed(h, n = 12) { let m = Infinity; for (let i = 0; i <= n; i++) { const v = h.at(h.T * i / n).V; m = Math.min(m, Math.hypot(v[0], v[1])); } return m; }
