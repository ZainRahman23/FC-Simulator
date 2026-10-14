// SLIDE-PHYS-1 single-tackler run (Stage 1): node sp_run.mjs --cand G1 [--out rec.json.gz] [--steps N] [--quick out.json]
// The candidate's committed-entry state is written once (pose at construction, velocities at step 0); afterwards the body is driven only by
// its own excitation through canonical M1b. No pose writes, no root drive, no external force, no outcome logic.
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, M } = L;
const C = await import(new URL("./sp_chor.mjs", import.meta.url).href), CT = await import(new URL("./sp_ctrl.mjs", import.meta.url).href), EN = await import(new URL("./sp_entry.mjs", import.meta.url).href);
const MS = await import(new URL("./sp_metrics.mjs", import.meta.url).href), MC = await import(new URL("./sp_m1c.mjs", import.meta.url).href);
export async function runCand(cand, opts = {}) { const E = EN.buildEntry(cand.entry), chor = C.compile(cand.chor), steps = opts.steps || cand.steps;
  let tr = null; const mk = cand.makeCtrl ? cand.makeCtrl : (c2) => new CT.SlideTracker({ chor, lead: c2.lead, gains: c2.gains, authority: c2.authority, yield: c2.yield, vf: c2.vf });
  const sim = await L.soloPlant({ pose: E.pose, vel: E.vel, steps, law: (p, c) => { const b = new L.MB.M1bBody(p, c, L.BODY, (tr = mk(cand, chor, E))); if (cand.muscle === "M1c") MC.useM1c(c.act, cand.tauCbMs); return b; }, plantOpts: opts.plantOpts });
  if (opts.setup) opts.setup(sim); if (cand.soleRule) L.installSoleRule(sim, [L.bi("foot_L") + 1, L.bi("foot_R") + 1], cand.soleRule);
  const t0 = performance.now(); let stop = null;
  while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], c = r.chars.tackler; if (!c.integrity.finite || c.integrity.maxSpeed > 25) { stop = { step: sim.n, reason: c.integrity.finite ? "speed" : "non-finite" }; break; } }
  const out = { protocol: "SLIDE-PHYS-1 Stage 1 (single tackler)", cand: cand.id, entry: { spec: cand.entry, com: E.com, comVel: E.comVel, plantSoleVel: E.plantSoleVel, lowestBody: E.lowestBody },
    steps, wallMs: performance.now() - t0, cpu: sim.cpu, stop, recs: sim.recs, ctrlLog: tr ? tr.log : null, ctrl: tr ? tr.meta() : null, slips: sim.tackler.act.slips || 0, soleRule: cand.soleRule || null, soleLog: sim.soleLog || null, muscle: cand.muscle || "M1b" };
  out.finalHash = L.IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }
export function quickFrames(out, every = 12) { return { segs: L.SEGS, title: out.cand, frames: out.recs.filter((_, i) => i % every === 0).map(r => { const S = r.S.slice(0, B.length); return { t: r.t, p: L.skel(S), com: r.chars.tackler.com }; }) }; }
if (process.argv[1] && process.argv[1].endsWith("sp_run.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const CD = await import(new URL("./sp_cand.mjs", import.meta.url).href), cand = CD.CANDS[arg("cand", "G1")]; const o = await runCand(cand, { steps: arg("steps") ? +arg("steps") : null });
  if (arg("out")) L.writeGz(arg("out"), o); if (arg("quick")) fs.writeFileSync(arg("quick"), JSON.stringify(quickFrames(o, +(arg("every", "12")))));
  const S = MS.series(o), ev = MS.events(S);
  console.log(cand.id, "steps", o.recs.length, "hash", o.finalHash, "wall", (o.wallMs / 1000).toFixed(1), "s", o.stop ? "STOP " + JSON.stringify(o.stop) : "", "entry comVel", o.entry.comVel.map(x => x.toFixed(2)), "plant sole vel", o.entry.plantSoleVel.L.map(x => x.toFixed(2)), "lowest", o.entry.lowestBody);
  console.log(MS.table(S, +(arg("every", "12")))); console.log(JSON.stringify(ev)); }
