// occupy1/tools/o_measure.mjs — THE PENETRATION RECORD of one run (OLD or OCCUPANCY V1): both bodies posed at every tick of the clip (PlayBody),
// every pair of occupancy volumes detected (o_volumes.js), per tick: the deepest penetration per group (TRUNK–TRUNK · LEGS (any resolved pair with
// a leg) · FEET · ARMS), the regions, the separating direction, the players' distance and closing speed, the ball, the possession state; and
// every ball contact checked for a leg inside the opponent's body (the ball reached THROUGH him: > the hard limit; AMBIGUOUS: tol … hard)
import { DT } from "../../vocab2/c_sim.js";
import { PlayBody } from "../../vocab2/u_body.js";
import { volumesOf, detect, legThrough, OCC, GROUP, RESOLVED } from "../o_volumes.js";
const hyp = Math.hypot;
export const groupOf = (A, B) => { const g = [GROUP[A], GROUP[B]]; if (g.includes("ARM")) return "ARMS"; if (g.includes("FOOT")) return "FEET"; if (g[0] === "TRUNK" && g[1] === "TRUNK") return "TRUNK"; return "LEGS"; };
export function measureRun(env, W, clip, o = {}) {
  // (the bodies as DRAWN: the world's record of each tick's live pose when it has one — else posed now, in order)
  const F = W.frames || null, bA = F ? null : new PlayBody(env, W.att), bD = F ? null : new PlayBody(env, W.def), k0 = Math.round(clip[0] / DT), k1 = Math.round(clip[1] / DT), ticks = [], V = new Map();
  for (let k = k0; k <= k1; k++) { const t = k * DT, sa = W.att.stateAt(t), sd = W.def.stateAt(t), dist = hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]);
    const fr = F ? F.get(k) : null; if (F && !fr) continue; const JA = fr ? fr.a.J : bA.pose(t).J, JD = fr ? fr.d.J : bD.pose(t).J, va = volumesOf(JA), vd = volumesOf(JD); V.set(k, { va, vd, JA, JD });
    if (dist > OCC.broad + 0.5) { ticks.push({ k, dist }); continue; }
    const pairs = detect(va, vd), g = {}; for (const p of pairs) { const G = groupOf(p.A, p.B); if (!g[G] || p.pen > g[G].pen) g[G] = { pen: p.pen, A: p.A, B: p.B, n: p.nh }; }
    const u = dist > 1e-6 ? [(sd.P[0] - sa.P[0]) / dist, (sd.P[1] - sa.P[1]) / dist] : [1, 0], closing = (sa.V[0] - sd.V[0]) * u[0] + (sa.V[1] - sd.V[1]) * u[1];
    const B = W.trueTrack ? W.trueTrack(t) : W.att.ballTrack(t), auth = W.auth ? W.auth.labels.filter((x) => x.k <= k).slice(-1)[0] : null;
    ticks.push({ k, dist, closing, g, top: pairs.slice(0, 3).map((p) => ({ A: p.A, B: p.B, pen: p.pen })), ball: [B.p[0], B.p[1]], auth: auth ? auth.label : "—", rel: [sd.P[0] - sa.P[0], sd.P[1] - sa.P[1]] }); }
  // every ball contact: the toucher's leg against the opponent's body at that tick
  const C = [], feet = (p, k) => { const c = p.contacts.find((x) => x.k === k && !x.missed); return c ? c.F : null; };
  for (const c of (W.contactLog || [])) { if (c.k < k0 || c.k > k1) continue; const who = c.by === "ATT" ? W.att : W.def, F = c.kind === "tackle" ? W.tk.act && W.tk.act.F : feet(who, c.k); if (!F) continue; const v = V.get(c.k) || V.get(c.k + 1); if (!v) continue;
    const L = legThrough(c.by === "ATT" ? v.va : v.vd, c.by === "ATT" ? v.vd : v.va, F); C.push({ k: c.k, by: c.by, kind: c.kind, F, pen: L.pen, A: L.A, B: L.B, verdict: L.pen > OCC.hard ? "THROUGH" : L.pen > OCC.tol ? "AMBIGUOUS" : "CLEAR" }); }
  return { ticks, contacts: C, V }; }
// the summary of a record: the deepest penetration (resolved volumes) and where, ticks beyond the tolerance / the hard limit, per-group maxima
export function summary(rec, t0 = 0) { let best = null; const per = { TRUNK: 0, LEGS: 0, FEET: 0, ARMS: 0 }; let nTol = 0, nHard = 0;
  for (const x of rec.ticks) { if (!x.g) continue; for (const [G, v] of Object.entries(x.g)) per[G] = Math.max(per[G], v.pen); const r = Math.max(x.g.TRUNK ? x.g.TRUNK.pen : -1, x.g.LEGS ? x.g.LEGS.pen : -1);
    if (r > OCC.tol) nTol++; if (r > OCC.hard) nHard++; if (!best || r > best.pen) { const G = x.g.TRUNK && (!x.g.LEGS || x.g.TRUNK.pen >= x.g.LEGS.pen) ? x.g.TRUNK : x.g.LEGS; best = { pen: r, t: x.k * DT - t0, A: G && G.A, B: G && G.B, dist: x.dist, closing: x.closing, ball: x.ball, auth: x.auth, rel: x.rel }; } }
  return { best, per, nTol, nHard, through: rec.contacts.filter((c) => c.verdict === "THROUGH"), ambiguous: rec.contacts.filter((c) => c.verdict === "AMBIGUOUS") }; }
