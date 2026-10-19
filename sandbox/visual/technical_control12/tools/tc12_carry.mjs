// technical_control12/tools/tc12_carry.mjs — THE CARRY METRICS (owner §19 – §20) for TECHNICAL-CONTROL-1 (the old model) and TECHNICAL-CONTROL-1.2:
// feet (left / right / preferred %), surfaces (inside / outside / instep / sole %), same-foot consecutive contacts %, running steps between contacts,
// the ball's lateral offset from the player's centre line (mean signed toward the preferred side, |mean|, distribution in 5 cm bins), the
// centre-line crossings, the time in the preferred-side lane; touches per second and the impulse per touch (a push, not a pass).
//   node tc12_carry.mjs <out.jsonl> <ids…> (id@seed@foot, e.g. TURN0_V5_B99_D99_A99_SDOMINANT_CLOSE@1@L)  [--model old|new|both]
import fs from "fs"; import { makeTech, footPlayer } from "../../technical_control1/tools/tc_env.mjs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { CarrySim } from "../tc12_core.js";
import { cfgFor } from "../../receive_elite1/tools/re1_env.mjs";
const DT = 1 / 240, hyp = Math.hypot;
export function makeCarry(cs, o = {}) { if (o.foot && !o.player) o = Object.assign({}, o, { player: footPlayer(o.foot) }); const c = cfgFor(cs, o); c.elite = true; c.style = o.style || cs.style || "NEUTRAL"; c.bridge = o.bridge || cs.bridge || "off"; c.moveIntent = o.moveIntent || cs.moveIntent || null; c.dribble = cs.dribble || null; c.EliteBody = o.anim ? o.Body || null : null; return new CarrySim(c); }
export function carryMetrics(S, pref) {
  const ep = S.rc2.ep, C = ep.contacts.filter((c) => c.t >= 0.2), n = C.length, k1 = ep.contacts[0] ? ep.contacts[0].k : 0, out = { contacts: n };
  const share = (f) => (n ? +(C.filter(f).length / n).toFixed(3) : null);
  out.feet = { L: share((c) => c.F === "L"), R: share((c) => c.F === "R") }; out.prefShare = pref ? share((c) => c.F === pref) : null;
  out.surfaces = { inside: share((c) => c.surface === "INSIDE"), outside: share((c) => c.surface === "OUTSIDE"), instep: share((c) => c.surface === "LACES"), sole: share((c) => c.surface === "SOLE") };
  let same = 0; for (let i = 1; i < n; i++) if (C[i].F === C[i - 1].F) same++; out.sameFoot = n > 1 ? +(same / (n - 1)).toFixed(3) : null;
  // running steps between contacts: the footfalls (touchdowns) strictly between two contact times
  // (the touching foot's own landing just after its touch ends the touch's stride: not a running step between touches)
  const TD = ep.swings.map((s) => ({ t: s.t1, F: s.F })).sort((a, b) => a.t - b.t), steps = [];
  for (let i = 1; i < n; i++) { const own = TD.find((x) => x.F === C[i - 1].F && x.t > C[i - 1].t - 1e-6 && x.t < C[i - 1].t + 0.2); steps.push(TD.filter((x) => x.t > C[i - 1].t + 1e-6 && x.t < C[i].t - 1e-6 && x !== own).length); }
  const hist = {}; for (const s of steps) hist[s] = (hist[s] || 0) + 1; out.stepsBetween = { mean: steps.length ? +(steps.reduce((a, b) => a + b, 0) / steps.length).toFixed(2) : null, hist };
  const T = (C.length ? C[C.length - 1].t - C[0].t : 0); out.touchesPerS = T > 0 ? +((n - 1) / T).toFixed(2) : null;
  out.impulse = { median: (() => { const a = C.map((c) => hyp(c.vExec[0] - c.vIn[0], c.vExec[1] - c.vIn[1])).sort((x, y) => x - y); return a.length ? +a[a.length >> 1].toFixed(2) : null; })(), outSpeedMedian: (() => { const a = C.map((c) => hyp(c.vExec[0], c.vExec[1])).sort((x, y) => x - y); return a.length ? +a[a.length >> 1].toFixed(2) : null; })() };
  // the ball's lateral offset (from the record: the ball against the player's centre and his facing, from 0.2 s after the first contact)
  const sg = pref === "L" ? -1 : 1, lat = []; for (const r of S.rec) { if (r.k < k1 + 48) continue; const t = (r.k - S.rc2.kc) * DT, F = S.rc2.frame, b = F.loc(r.ball.p), P = ep.rootAt(t), psi = ep.psiAt(t);
    lat.push(-(b[0] - P[0]) * Math.sin(psi) + (b[1] - P[1]) * Math.cos(psi)); }
  const m = lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : 0, bins = {}; for (const x of lat) { const k = (Math.round(x / 0.05) * 5).toString(); bins[k] = (bins[k] || 0) + 1; }
  let cross = 0, side = 0; for (const x of lat) { const s = x > 0.02 ? 1 : x < -0.02 ? -1 : 0; if (s && side && s !== side) cross++; if (s) side = s; }
  out.lane = { meanLatPrefSide: pref ? +(sg * m).toFixed(3) : null, meanAbs: +(lat.reduce((a, b) => a + abs(b), 0) / max(1, lat.length)).toFixed(3), meanSigned: +m.toFixed(3), prefLaneShare: pref ? +(lat.filter((x) => sg * x > 0.02).length / max(1, lat.length)).toFixed(3) : null,
    centreCrossings: cross, crossingsPerS: +(cross / max(0.1, lat.length * DT)).toFixed(2), binsCm: Object.fromEntries(Object.entries(bins).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => [k, +(v / lat.length).toFixed(3)])) };
  out.sep = { max: +Math.max(...S.rec.filter((r) => r.k >= k1).map((r) => hyp(r.ball.p[0] - r.P[0], r.ball.p[2] - r.P[1]))).toFixed(2) };
  out.seq = C.map((c) => c.F + c.surface[0]).join(" "); out.actions = (ep.techLog || []).filter((e) => e.ev === "action").map((e) => e.fam); out.failed = !!ep.failed; out.fault = S.fault || null;
  return out;
}
const abs = Math.abs, max = Math.max;
if (process.argv[1] && process.argv[1].endsWith("tc12_carry.mjs")) {
  const outF = process.argv[2], mi = process.argv.indexOf("--model"), model = mi > 0 ? process.argv[mi + 1] : "both", ids = process.argv.slice(3).filter((x, i) => !x.startsWith("--") && !(mi > 0 && i + 3 === mi + 1)), fd = fs.openSync(outF, "a");
  for (const spec of ids) { const [id, seed, foot] = spec.split("@"), pref = foot === "B" ? null : foot || "R";
    for (const M of model === "both" ? ["old", "new"] : [model]) { const cs = anyCase(id, +(seed || 1)), S = M === "old" ? makeTech(cs, { seed: +(seed || 1), foot: foot || "R" }) : makeCarry(cs, { seed: +(seed || 1), foot: foot || "R" }); S.run();
      const r = Object.assign({ id, seed: +(seed || 1), foot: foot || "R", model: M }, carryMetrics(S, pref)); fs.writeSync(fd, JSON.stringify(r) + "\n");
      console.log(M.padEnd(3), id.padEnd(44), foot, "L", r.feet.L, "R", r.feet.R, "| in", r.surfaces.inside, "out", r.surfaces.outside, "instep", r.surfaces.instep, "sole", r.surfaces.sole, "| same", r.sameFoot, "steps", r.stepsBetween.mean, JSON.stringify(r.stepsBetween.hist), "| lat", r.lane.meanSigned, "prefLane", r.lane.prefLaneShare, "cross", r.lane.centreCrossings, "| t/s", r.touchesPerS, "dv", r.impulse.median, "sep", r.sep.max, r.failed ? "FAILED" : "", "|", r.seq); } }
}
