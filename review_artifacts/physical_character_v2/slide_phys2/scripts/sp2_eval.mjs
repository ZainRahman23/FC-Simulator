// SLIDE-PHYS-2 Phase 10 / 15 / 3 / 19 qualification of one SP2 parameter set (physical values, H structure, controller A6):
//   • speeds 4.25 … 5.75 m/s (robustness) — every SP2 measure, constraint-space limits, tackling-boot clearance / sole orientation / impulses,
//     region loads (impulse, per-step and 29 ms peaks in BW and kN), glide shares, slide from first body contact AND from the commit, ledger;
//   • determinism (re-run hash at 5.0), CPU per step;
//   • counterfactuals at 5.0 (diagnostic): M1b instead of M1c; boots without TCF-1 (μ 1.2 whatever the orientation); body|turf μ 0.35 / 0.45 /
//     0.55 (the literature bracket, research/SLIDE2_LITERATURE.md); A5 controller instead of A6.
// usage (worktree root): node sp2_eval.mjs --params <phys.json> --out <dir> [--speeds 4.25,4.5,4.75,5,5.25,5.5,5.75] [--steps 480]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), CL = await import(S1 + "sp_climits.mjs"), { V, M: MASS, G, bi, B } = L;
const P = await import(new URL("./sp2_param.mjs", import.meta.url).href), BF = await import(new URL("./sp2_contact.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const phys = JSON.parse(fs.readFileSync(arg("params"))), steps = +arg("steps", "480"), BW = MASS * G, r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000;
async function runOne(speed, opts = {}) { let cand = P.finalize(P.makeCand(phys, speed, "SP2"), opts.ctrl || "A6"); if (opts.muscle) cand = { ...cand, muscle: opts.muscle }; if (opts.noTCF) cand = { ...cand, soleRule: null };
  const o = await CL.auditRun(cand, { steps, setup: opts.bodyMu != null ? (sim) => BF.installBodyFriction(sim, opts.bodyMu, new Set([bi("foot_L") + 1, bi("foot_R") + 1])) : undefined }); o.contactRule = cand.soleRule; return o; }
function summarise(o) { const m = P.M.measure(o), c = P.cost(m, o.climits), recs = o.recs, s = m.series;
  // commit-to-stop COM travel (from t = 0) and first-contact-to-stop
  const c0 = recs[0].chars.tackler.com, endR = m.stopT != null ? recs.find(r => r.t >= m.stopT - 1e-9) : recs[recs.length - 1], cE = endR.chars.tackler.com;
  // tackling boot during the glide: height, sole-down cosine, contact impulse by part
  const tA = m.firstBodyT ?? 0.4, tB = m.stopT ?? s[s.length - 1].t, gl = s.filter(x => x.t >= tA && x.t <= tB), fR = bi("foot_R");
  const loads = Object.fromEntries(Object.entries(m.groups).map(([g, e]) => [g, { first: e.first, JnNs: e.JnNs, peakStepBW: e.peakStepBW, peak29msBW: e.peak29msBW, peak29msKN: r3(e.peak29msBW * BW / 1000), regions: e.regions }]));
  return { hash: o.finalHash, cost: r3(c.total), parts: Object.fromEntries(Object.entries(c).filter(([k, x]) => x > 0.005 && k !== "total").map(([k, x]) => [k, r3(x)])), firstBodyT: m.firstBodyT, sequence: m.sequence, atFirstBody: m.atFirstBody, retention: m.retention,
    slideFromContactM: m.slideDistM, slideFromCommitM: r3(Math.hypot(cE[0] - c0[0], cE[2] - c0[2])), stopT: m.stopT, meanDecel: m.meanDecel, glideShare: m.glideShare, loads,
    tacklingBoot: { ...m.tacklingBoot, heightDuringGlide: { min: r3(Math.min(...gl.map(x => x.bootLow))), mean: r3(gl.reduce((a, x) => a + x.bootLow, 0) / Math.max(1, gl.length)), max: r3(Math.max(...gl.map(x => x.bootLow))) },
      soleDownCosDuringGlide: { min: r3(Math.min(...gl.map(x => x.bootSoleDownCos))), max: r3(Math.max(...gl.map(x => x.bootSoleDownCos))) }, regions: m.groups.tackBoot ? m.groups.tackBoot.regions : {} },
    posture: m.posture, limits: CL.cTable(o.climits, 0.5), ctrl: o.ctrl ? { failures: o.ctrl.failures, wholeBody: o.ctrl.wholeBody } : null,
    cpuMsPerStep: r3(o.wallMs / o.recs.length), cpu: Object.fromEntries(Object.entries(o.cpu || {}).map(([k, v]) => [k, typeof v === "number" ? r3(v / o.recs.length) : v])),
    vSeries: s.filter((_, i) => i % 12 === 0).map(x => ({ t: x.t, vh: x.vh, vy: x.vy, comY: x.comY, pelY: x.pelY, recl: x.recl, bootLow: x.bootLow })) }; }
const out = { tool: "sp2_eval.mjs", phys, steps, speeds: {}, counterfactuals: {} };
for (const v of arg("speeds", "4.25,4.5,4.75,5,5.25,5.5,5.75").split(",").map(Number)) { const o = await runOne(v); out.speeds[v] = summarise(o); if (v === 5) L.writeGz(`${OUT}/SP2_5.json.gz`, o);
  const s = out.speeds[v]; console.log(v, s.hash, "cost", s.cost, JSON.stringify(s.parts), "| slide", s.slideFromContactM, "/", s.slideFromCommitM, "decel", s.meanDecel, "| glide", JSON.stringify(s.glideShare).slice(0, 90), "| head", s.posture.headTurfT, "belly", s.posture.minBellyY); }
const re = await runOne(5); out.determinism = { first: out.speeds[5] ? out.speeds[5].hash : null, rerun: re.finalHash, identical: out.speeds[5] ? out.speeds[5].hash === re.finalHash : null };
for (const [k, opts] of Object.entries({ M1b: { muscle: "M1b" }, noTCF1: { noTCF: true }, bodyMu035: { bodyMu: 0.35 }, bodyMu045: { bodyMu: 0.45 }, bodyMu055: { bodyMu: 0.55 }, A5: { ctrl: "A5" } })) {
  const o = await runOne(5, opts); out.counterfactuals[k] = summarise(o); const s = out.counterfactuals[k]; console.log("CF", k, s.hash, "cost", s.cost, JSON.stringify(s.parts), "| slide", s.slideFromContactM, "boot", s.tacklingBoot.JnNs, "glide", JSON.stringify(s.glideShare).slice(0, 80)); }
fs.writeFileSync(`${OUT}/SP2_eval.json`, JSON.stringify(out, null, 1)); console.log("determinism", JSON.stringify(out.determinism));
