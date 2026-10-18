// receive11/tools/rx_cpu.mjs — CPU of RECEIVE-CONTROL-1.1, measured in ONE process (run it on an idle machine, nothing in parallel): per case the
// RECEIVE PHASE (pass struck → handoff: the TURN-1.2 approach, the action selection and the authored action) and the dribble after the handoff
// (frozen DRIBBLE-V1) separately — ms of CPU per simulated second — the worst single 240 Hz step per phase, the candidate counts; and a replay
// (each case run twice: identical fingerprints). Animation (the placeholder body) off, as the matrix; anim=1 measures it on.
// usage: node rx_cpu.mjs "ID1,ID2,…" out.json [seed] [anim]
import fs from "fs"; import { makeReceive, DT } from "./rx_env.mjs"; import { parseCase, seedCase } from "../rx_cases.js";
const [idsA, outFile, seedA = "1", animA = "0"] = process.argv.slice(2), ids = idsA.split(","), seed = +seedA, anim = animA === "1", rows = [];
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
for (const id of ids) {
  const cs = seedCase(parseCase(id), seed), run = () => { const S = makeReceive(cs, { seed, anim }), n = Math.round(cs.scenario.dur / DT); let rc = 0, rcK = 0, dr = 0, drK = 0, wR = 0, wD = 0, steps = [];
    while (S.k < n && !S.fault) { const ph = S.rx.phase === "dribble" ? "dribble" : "receive", t0 = performance.now(); S.step(); const dt = performance.now() - t0; steps.push(dt);
      if (ph === "receive") { rc += dt; rcK++; wR = Math.max(wR, dt); } else { dr += dt; drK++; wD = Math.max(wD, dt); } }
    steps.sort((a, b) => a - b); return { S, rc, rcK, dr, drK, wR, wD, p99: steps[Math.floor(0.99 * (steps.length - 1))], n: steps.length }; };
  const A = run(), B = run(), f1 = fp(A.S), f2 = fp(B.S), sm = A.S.summary();
  rows.push({ id, seed, anim, receiveMsPerS: +(A.rc / Math.max(1, A.rcK) / DT).toFixed(1), receiveSimS: +(A.rcK * DT).toFixed(3), receiveMsTotal: +A.rc.toFixed(1), afterMsPerS: +(A.dr / Math.max(1, A.drK) / DT).toFixed(1), afterSimS: +(A.drK * DT).toFixed(3),
    worstReceiveStepMs: +A.wR.toFixed(2), worstAfterStepMs: +A.wD.toFixed(2), p99StepMs: +A.p99.toFixed(2), planningEvents: sm.plans, candidates: sm.cands, family: sm.action ? sm.action.fam : null, replayIdentical: f1 === f2, fp: f1 });
  const r = rows[rows.length - 1]; console.log(id.padEnd(24), `receive ${r.receiveMsPerS} ms/s over ${r.receiveSimS} s (${r.receiveMsTotal} ms) · worst ${r.worstReceiveStepMs} ms · candidates ${r.candidates} in ${r.planningEvents} · after ${r.afterMsPerS} ms/s worst ${r.worstAfterStepMs} ms · replay ${r.replayIdentical ? "identical" : "DIFFERS"}`);
}
const m = (k) => +(rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(1), med = (k) => { const a = rows.map((r) => r[k]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const out = { node: process.version, seed, anim, cases: rows.length, mean: { receiveMsPerS: m("receiveMsPerS"), receiveMsTotal: m("receiveMsTotal"), afterMsPerS: m("afterMsPerS"), candidates: m("candidates") }, median: { receiveMsPerS: med("receiveMsPerS"), afterMsPerS: med("afterMsPerS") },
  worstReceiveStepMs: Math.max(...rows.map((r) => r.worstReceiveStepMs)), worstAfterStepMs: Math.max(...rows.map((r) => r.worstAfterStepMs)), replayIdentical: rows.filter((r) => r.replayIdentical).length, rows };
fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); console.log("MEAN", JSON.stringify(out.mean), "MEDIAN", JSON.stringify(out.median), "worst receive step", out.worstReceiveStepMs, "ms · worst after", out.worstAfterStepMs, "ms; replay identical", out.replayIdentical + "/" + rows.length);
