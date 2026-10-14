// SP2A BODY-FRICTION SWEEP — DIAGNOSTIC contact-material separation (NOT canonical V2; not adopted anywhere).
// The V2 contact listener sets each turf contact's friction from the spec table (body|turf 0.5, hand|turf 0.7, boot|turf 1.2); TCF-1
// (sp_lib.installSoleRule) then overrides boot–turf contacts with μ = μ_U + (μ_S − μ_U)·k, k = smoothstep of the sole-down angle (studded
// below 35°, upper above 55°). This diagnostic wraps the listener AFTER TCF-1 and scales only the NON-STUD part by m:
//   • non-boot tackler bodies (body / hand materials: shin, knee, thigh, pelvis, trunk, arms, forearms, hands): μ ← m · μ_spec
//   • boots: μ ← m·μ_U + (μ_S − m·μ_U)·k — a properly sole-down boot (k = 1) keeps μ_S = 1.2 exactly (TCF-1's studded value), a boot on its side
//     or upper (k = 0) gets m·μ_U; in between, TCF-1's own blend between those two ends.
// m = 1 reproduces the unmodified run bit-for-bit (checked). The contact normal response, restitution, geometry and everything else are untouched.
const L = await import(new URL("../../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), { Q, bi } = L;
const D2R = Math.PI / 180, GROUND = 1000;
export const soleK = (rot) => { const c35 = Math.cos(35 * D2R), c55 = Math.cos(55 * D2R), ns = Q.rot(rot, [0, -1, 0]), c = -ns[1], s = Math.max(0, Math.min(1, (c - c55) / (c35 - c55))); return s * s * (3 - 2 * s); };
export function installBodyFrictionScale(sim, m, sole = { studded: 1.2, upper: 0.5 }) { const J = sim.J, Lr = sim.w.listener, feet = new Set([bi("foot_L") + 1, bi("foot_R") + 1]), nB = L.B.length;
  const log = sim.fsLog = { m, scaled: 0, boots: 0 };
  const adj = (b1p, b2p, mp, sp) => { const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), u1 = b1.GetUserData(), u2 = b2.GetUserData();
    const body = u1 === GROUND ? b2 : u2 === GROUND ? b1 : null; if (!body) return; const u = body.GetUserData(); if (!(u >= 1 && u <= nB)) return;   // tackler bodies only (user data = index + 1)
    const cs = J.wrapPointer(sp, J.ContactSettings);
    if (feet.has(u)) { const r = body.GetRotation(), k = soleK([r.GetX(), r.GetY(), r.GetZ(), r.GetW()]); cs.mCombinedFriction = m * sole.upper + (sole.studded - m * sole.upper) * k; log.boots++; }
    else { cs.mCombinedFriction = m * cs.mCombinedFriction; log.scaled++; } };
  const oa = Lr.OnContactAdded, op = Lr.OnContactPersisted;
  Lr.OnContactAdded = (a, b, c, d) => { oa(a, b, c, d); adj(a, b, c, d); }; Lr.OnContactPersisted = (a, b, c, d) => { op(a, b, c, d); adj(a, b, c, d); };
  return log; }
// run hook: installs the wrapper on the FIRST tick, i.e. after runCand has installed TCF-1 (runCand calls setup before the sole rule)
export const sweepSetup = (m) => (sim) => { const t0 = sim.tick.bind(sim); sim.tick = () => { sim.tick = t0; installBodyFrictionScale(sim, m); return t0(); }; };
