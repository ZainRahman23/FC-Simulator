// SLIDE-PHYS-2 Phase 1 counterfactuals (DIAGNOSTIC ONLY — never a candidate): SP1 re-run with ONLY the tackling boot's turf friction changed,
// to separate "studs grip" from "strut geometry". The bent-leg boot keeps the TCF-1 rule (1.2 studded / 0.5 upper); every other pair is the spec.
//   CF0  identical to SP1 (both boots TCF-1)            — must reproduce the SP1 hash
//   CF1  tackling boot μ 0.5 whatever its orientation (= body|turf: no stud grip)
//   CF2  tackling boot μ 0 (a frictionless strut: normal force only)
// usage (worktree root): node sp2_cf.mjs --u <SP1_u.json> --speed 5 --case CF0|CF1|CF2 --out <rec.json.gz>
const L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), RUN = await import(new URL("../../slide_phys1/scripts/sp_run.mjs", import.meta.url).href);
const P = await import(new URL("../../slide_phys1/scripts/sp_param.mjs", import.meta.url).href), AU = await import(new URL("../../slide_phys1/scripts/sp_authority.mjs", import.meta.url).href);
import fs from "fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, cs = arg("case", "CF0");
const cand = AU.apply(P.makeCand(P.toPhys(JSON.parse(fs.readFileSync(arg("u")))), +arg("speed", "5"), "SP1-" + cs), "A5"), rule = cand.soleRule;
const R = { CF0: rule, CF1: { studded: 0.5, upper: 0.5 }, CF2: { studded: 0, upper: 0 } }[cs];
const c2 = { ...cand, soleRule: null };
const o = await RUN.runCand(c2, { steps: +arg("steps", "480"), setup: (sim) => { L.installSoleRule(sim, [L.bi("foot_L") + 1], rule); L.installSoleRule(sim, [L.bi("foot_R") + 1], R); } });
o.soleRule = rule; o.soleRuleByFoot = { foot_L: rule, foot_R: R }; o.cf = { case: cs, tacklingBoot: R }; L.writeGz(arg("out"), o); console.log(cs, o.finalHash);
