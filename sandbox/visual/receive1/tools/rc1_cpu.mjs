// receive1/tools/rc1_cpu.mjs — CPU of RECEIVE-CONTROL-1, measured in ONE process (run it on an idle machine, nothing in parallel): per case the
// receive phase (pass struck → first touch launched, or the chase / end) and the dribble after the handoff (frozen DRIBBLE-V1) separately — ms of
// CPU per simulated second — and the worst single 240 Hz step; plus a determinism replay (each case run twice: identical fingerprints)
// usage: node rc1_cpu.mjs "ID1,ID2,…" out.json [seed]
import fs from "fs"; import { makeReceive } from "./rc1_env.mjs"; import { parseCase } from "../rc1_cases.js";
const [idsA, outFile, seedA = "1"] = process.argv.slice(2), ids = idsA.split(","), seed = +seedA, rows = [];
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
for (const id of ids) {
  const cs = parseCase(id), run = () => { const S = makeReceive(cs.scenario, { seed }), n = Math.round(cs.scenario.dur * 240); let rc = 0, rcK = 0, dr = 0, drK = 0, worst = 0, worstPh = null, steps = [];
    while (S.k < n && !S.fault) { const ph = S.rc.phase === "approach" && S.rc.chase == null ? "receive" : S.rc.phase === "approach" ? "chase" : "dribble", t0 = performance.now(); S.step(); const dt = performance.now() - t0; steps.push(dt);
      if (ph === "receive") { rc += dt; rcK++; } else { dr += dt; drK++; } if (dt > worst) { worst = dt; worstPh = ph; } }
    steps.sort((a, b) => a - b); return { S, rc, rcK, dr, drK, worst, worstPh, p99: steps[Math.floor(0.99 * (steps.length - 1))], over20: steps.filter((x) => x > 20).length, n: steps.length }; };
  const A = run(), B = run(), f1 = fp(A.S), f2 = fp(B.S);
  rows.push({ id, seed, receiveMsPerS: +(A.rc / Math.max(1, A.rcK) * 240).toFixed(1), receiveSimS: +(A.rcK / 240).toFixed(3), afterMsPerS: +(A.dr / Math.max(1, A.drK) * 240).toFixed(1), afterSimS: +(A.drK / 240).toFixed(3),
    totalMsPerS: +((A.rc + A.dr) / (A.n / 240)).toFixed(1), worstStepMs: +A.worst.toFixed(1), worstPhase: A.worstPh, p99StepMs: +A.p99.toFixed(2), stepsOver20ms: A.over20, replayIdentical: f1 === f2, fp: f1 });
  const r = rows[rows.length - 1]; console.log(id.padEnd(18), `receive ${r.receiveMsPerS} ms/s (${r.receiveSimS} s) · after ${r.afterMsPerS} ms/s · total ${r.totalMsPerS} · worst ${r.worstStepMs} ms (${r.worstPhase}) · p99 ${r.p99StepMs} · >20ms ${r.stepsOver20ms} · replay ${r.replayIdentical ? "identical" : "DIFFERS"}`);
}
const m = (k) => +(rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(1);
const out = { node: process.version, seed, cases: rows.length, mean: { receiveMsPerS: m("receiveMsPerS"), afterMsPerS: m("afterMsPerS"), totalMsPerS: m("totalMsPerS") }, worstStepMs: Math.max(...rows.map((r) => r.worstStepMs)), replayIdentical: rows.filter((r) => r.replayIdentical).length, rows };
fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); console.log("MEAN", JSON.stringify(out.mean), "worst step", out.worstStepMs, "ms; replay identical", out.replayIdentical + "/" + rows.length);
