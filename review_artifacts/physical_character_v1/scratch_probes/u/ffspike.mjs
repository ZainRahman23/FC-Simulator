import { J, body, G2, M } from "../fg/lib.mjs";
const { spec, poses } = body("F0"); const ev = [];
for (const [first, at] of [["R", 0.5], ["L", 0.55]]) {
  const n = 10, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at }, onLoco: l => { LOCO = l; } });
  const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
  for (const q of r.recs) { if (q.t > tF - 0.3 || !q.arb || !q.exec || q.exec.kind !== "rhythmic") continue; const e = q.arb.find(x => x.joint === "hip_" + q.exec.sw); if (!e) continue;
    const ff = e.terms.find(tm => tm.m === "swing ID feed-forward"); if (!ff) continue; const v = Math.abs((ff.alw ?? ff.req)[1]);
    if (v > 300) ev.push({ start: first + at, t: q.t.toFixed(3), u: q.exec.u != null ? q.exec.u.toFixed(2) : "-", stage: q.exec.stage, ff: v.toFixed(0), swTouch: q.feet[q.exec.sw].touching, load: (q.feet[q.exec.sw].load / 750).toFixed(2) }); } }
console.log("FF > 300 N·m events:", ev.length); const byStage = {}; for (const e of ev) byStage[e.stage + (e.swTouch ? "+touching" : "")] = (byStage[e.stage + (e.swTouch ? "+touching" : "")] || 0) + 1; console.log(byStage); console.log(ev.slice(0, 25).map(e => JSON.stringify(e)).join("\n"));
