// technical_control14/tools/tc14_eff.mjs — THE TECHNIQUE-EFFICIENCY TEST (owner §13): a direction change of 30 … 180° asked at running speed, the
// player's Dribbling 50 … 99 (Ball Control / Agility 99 first), and per run, from the authoritative simulation (animation off):
//   · the selected technique(s) — the actions taken after the request, and the carry touches between
//   · the ball contacts required — every contact from the request until the body runs on the new line
//   · the decisive contact — the one that turns the ball's line the most; the setup contacts before it, the recovery contacts after it
//   · the preparation time (request → the decisive contact), contact → new line (the decisive contact → the body on the new line: its velocity
//     within 15° of the intent's heading at ≥ 2.5 m/s, held 0.2 s), the exit speed (the body's speed 0.4 s after), the ball – body separation
//     (worst, the request → 0.6 s after the new line)
//   node tc14_eff.mjs <out.jsonl> <model tc12|tc14> [shard/of] [--set main|styles|attrs]
import fs from "fs"; import { anyCase, courseCase } from "../../technical_control1/tc_course.js";
const DT = 1 / 240, hyp = Math.hypot, D = Math.PI / 180, wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a)), hdg = (v) => Math.atan2(v[1], v[0]);
export const ANGLES = [30, 60, 90, 120, 150, 180], DRI = [50, 70, 80, 90, 99];
export function effMetrics(S, cs) {
  const ep = S.rc2 && S.rc2.ep; if (!ep) return { error: "no episode" };
  const kc0 = ep.kc0, tReq = cs.tTurn - kc0 * DT, th = (cs.turn || 0) * D, vI = cs.v0, rec = S.rec, tOf = (r) => (r.k - kc0) * DT;
  const R = rec.map((r) => ({ t: tOf(r), P: [r.P[0], r.P[1]], V: [r.V[0], r.V[1]], B: [r.ball.p[0], r.ball.p[2]] }));
  // the body on the new line: velocity within 15° of the intent at ≥ 2.5 m/s (or 60 % of the intent's speed if lower), held 0.2 s
  const vMin = Math.min(2.5, 0.6 * vI); let tLine = null;
  for (let i = 0; i < R.length; i++) { const r = R[i]; if (r.t < tReq) continue; const ok = (q) => hyp(...q.V) >= vMin && Math.abs(wrapA(hdg(q.V) - th)) < 15 * D;
    if (ok(r)) { let held = true; for (let j = i; j < R.length && R[j].t < r.t + 0.2; j++) if (!ok(R[j])) { held = false; break; } if (held) { tLine = r.t; break; } } }
  const C = ep.contacts.map((c) => ({ i: c.i, t: c.t, F: c.F, surface: c.surface, vIn: c.vIn, v: c.vExec, vI: c.vIdeal, D: c.D, recovery: !!c.recovery })), acts = ep.techLog.filter((e) => e.ev === "action" && e.t >= tReq - 0.3);
  const tEnd = tLine != null ? tLine - 1e-6 : R[R.length - 1].t, win = C.filter((c) => c.t >= tReq - 1e-6 && c.t <= tEnd);
  // the decisive contact: the largest turn of the ball's line toward the new heading (the change of the ball's heading at the contact, weighted by
  // how much closer to the new line it brings it)
  let dec = null; for (const c of win) { const hi = hyp(c.vIn[0], c.vIn[1]) > 0.3 ? hdg(c.vIn) : 0, ho = hdg(c.v), turn = Math.abs(wrapA(ho - hi)), gain = Math.abs(wrapA(hi - th)) - Math.abs(wrapA(ho - th)), sc = turn + 1.5 * gain;
    if (!dec || sc > dec.sc) dec = Object.assign({ sc, turnDeg: +(turn / D).toFixed(0), outDeg: +(wrapA(ho - th) / D).toFixed(0) }, c); }
  const sep = (t0, t1) => { let m = 0; for (const r of R) if (r.t >= t0 && r.t <= t1) m = Math.max(m, hyp(r.B[0] - r.P[0], r.B[1] - r.P[1])); return m; };
  const vAt = (t) => { const r = R.find((q) => q.t >= t); return r ? hyp(...r.V) : null; };
  const fams = acts.map((a) => a.fam), actC = (c) => acts.some((a) => Math.abs(a.tc - c.t) < 0.03);
  // the contact already due when the turn was asked (the one the ball was travelling to): a carry touch in the run's rhythm, not one chosen for the turn
  const due = win.length && win[0].t - tReq <= 0.40 && !(acts[0] && Math.abs(acts[0].tc - win[0].t) < 0.03 && acts[0].absorbed) ? win[0] : null;
  return { turn: cs.turn, tReq: +tReq.toFixed(3), due: due ? `${due.F}${due.surface[0]}@${(due.t - tReq).toFixed(2)}` : null, actionContacts: win.length - (due ? 1 : 0), tLine: tLine != null ? +tLine.toFixed(3) : null, contacts: win.length, setup: dec ? win.filter((c) => c.t < dec.t - 1e-6).length : null, recovery: dec ? win.filter((c) => c.t > dec.t + 1e-6).length : null,
    technique: fams.length ? fams.join(" + ") : "carry", decisive: dec ? { t: +dec.t.toFixed(3), F: dec.F, surface: dec.surface, turnDeg: dec.turnDeg, outDeg: dec.outDeg, action: actC(dec), difficulty: +(dec.D || 0).toFixed(3),
      errDeg: dec.vI ? +(Math.abs(wrapA(hdg(dec.v) - hdg(dec.vI))) / D).toFixed(1) : null, errSpeed: dec.vI ? +(hyp(dec.v[0], dec.v[1]) / Math.max(0.1, hyp(dec.vI[0], dec.vI[1])) - 1).toFixed(3) : null } : null,
    prepS: dec ? +(dec.t - tReq).toFixed(3) : null, toLineS: dec && tLine != null ? +(tLine - dec.t).toFixed(3) : null, reqToLineS: tLine != null ? +(tLine - tReq).toFixed(3) : null,
    exitV: tLine != null ? +(vAt(tLine + 0.4) || 0).toFixed(2) : null, sepMax: +sep(tReq, (tLine != null ? tLine : tReq + 2) + 0.6).toFixed(2), failed: !!(ep.failed || S.fault),
    seq: win.map((c) => `${c.F}${c.surface[0]}@${(c.t - tReq).toFixed(2)}${actC(c) ? "*" : ""}${dec && c.i === dec.i ? "!" : ""}`).join(" ") };
}
// the matrix: angles × Dribbling (BC / AGI 99) × seeds 1 – 3 (the request at a different phase of the touch rhythm), right turns; + left turns at 99
export function jobs(set) {
  const out = []; const add = (ang, d, b, a, seed, left, style, foot) => out.push({ id: `CUT${ang}${left ? "_L" : ""}_B${b}_D${d}_A${a}${style ? "_S" + style : ""}`, ang, d, b, a, seed, left: !!left, style: style || null, foot: foot || "R" });
  if (set === "main") for (const ang of ANGLES) for (const d of DRI) for (const seed of [1, 2, 3]) add(ang, d, 99, 99, seed, false);
  if (set === "main") for (const ang of ANGLES) for (const seed of [1, 2, 3]) add(ang, 99, 99, 99, seed, true);
  if (set === "attrs") for (const ang of ANGLES) for (const [d, b, a] of [[99, 50, 99], [99, 99, 50], [50, 99, 50]]) for (const seed of [1, 2, 3]) add(ang, d, b, a, seed, false);
  if (set === "styles") for (const ang of [60, 90, 120, 150]) for (const [st, foot] of [["DOMINANT_CLOSE", "L"], ["TWO_FOOT", "B"], ["CLOSE_CONTROL", "R"], ["DIRECT_RUNNER", "R"]]) for (const seed of [1, 2, 3]) add(ang, 99, 99, 99, seed, false, st, foot);
  return out;
}
if (process.argv[1] && process.argv[1].endsWith("tc14_eff.mjs")) {
  const [out, model, shard] = process.argv.slice(2), [sh, of] = (shard || "0/1").split("/").map(Number), set = (process.argv.find((x) => x.startsWith("--set=")) || "--set=main").slice(6);
  const mk = model === "tc12" ? (await import("../../technical_control12/tools/tc12_carry.mjs")).makeCarry : (await import("./tc14_env.mjs")).makeEff;
  const fd = fs.openSync(out, "a");
  for (const [n, J] of jobs(set).entries()) { if (n % of !== sh) continue; let row;
    try { const cs = anyCase(J.id, J.seed), S = mk(cs, { seed: J.seed, foot: J.foot, style: J.style || undefined }); S.run(); row = Object.assign({ model, set }, J, effMetrics(S, cs)); }
    catch (e) { row = Object.assign({ model, set, error: String(e && e.stack || e).slice(0, 400) }, J); }
    fs.writeSync(fd, JSON.stringify(row) + "\n"); }
}
