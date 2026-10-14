// SP2C final evaluation (evidence for the report / review page): the chosen SP2C candidate and SP2A, both at the TEMPORARY friction F37.5, on the
// 3 RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s), 6 s. Per run: hash; the SP2C diagnosis at the milestones (first fold-side contact, +50 / +100 / +250 /
// +500 ms, +1.0 s, end of slide — knee / ankle in pelvis, joint angles, fold-boot sole normal / toe / heel, tackling boot clearance, pelvis / trunk /
// head, arm contacts, regional authority, COM velocity, angular momentum, contacts by region with normal load and braking); the braking ledger with
// its horizontal-momentum closure (contacts are the only horizontal force: no root propulsion); the roll ledger; joint-limit excursions; first
// prone; final state; the controller's phases (contact-authority onset, recovery trigger, regional failures / whole-body fallback); the SP2C cost.
// Determinism: SP2C at 5.0 m/s re-run. Records (outside Git) are written for the renders.
// usage (worktree root): node sp2c_final.mjs --opts <SP2C opts.json> --records <dir outside git> --out <SP2C_eval.json>
import fs from "fs";
const B0 = new URL("../../", import.meta.url).href, RC = await import(new URL("./sp2c_run.mjs", import.meta.url).href), DG = await import(new URL("./sp2c_diag.mjs", import.meta.url).href), SS = await import(new URL("./sp2c_search.mjs", import.meta.url).href);
const P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), RG = await import(B0 + "slide_phys2/scripts/sp2_regions.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REC = arg("records"); fs.mkdirSync(REC, { recursive: true });
const S = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/", RUNINS = { "4.5": `${S}run1g_4.147.json`, "5.0": `${S}run1g_4.608.json`, "5.5": `${S}run1g_5.069.json` };
const COPTS = JSON.parse(fs.readFileSync(arg("opts"))), AOPTS = JSON.parse(fs.readFileSync(new URL("../../sp2a/evidence/SP2A_opts.json", import.meta.url)));
const one = async (key, A, sp) => { const ri = RUNINS[sp], o = await RC.runC(ri, A, RC.TEMP_M, 1440), d = DG.diagnose(o, RC.TEMP_M), m2 = P2.M.measure(o), c2 = P2.cost(m2, o.climits), c = SS.costSP2C(o, d, m2, c2, L, RG);
  const tag = `${key}_${ri.split("/").pop().replace(".json", "")}`; L.writeGz(`${REC}/${tag}.json.gz`, o); fs.writeFileSync(`${REC}/${tag}.diag.json`, JSON.stringify(d, null, 1));
  const ctrl = o.ctrl || {}, tc = ctrl.contactAuthFrom;
  console.log(key, sp, o.finalHash, "| contact", d.firstFoldContactT, "prone", d.proneT, "| slide", d.sweepMeasures.slidePathM, "| final", d.sweepMeasures.finalState.class, "| recover", ctrl.recoverFrom ?? "–", "| closure", d.sweepMeasures.ledgerSlide && d.sweepMeasures.ledgerSlide.closureResidualNs, "| cost", c.total.toFixed(2));
  return { speed: sp, runin: ri.split("/").pop(), hash: o.finalHash, firstFoldContactT: d.firstFoldContactT, pushOffT: d.pushOffT, proneT: d.proneT, milestones: d.milestones, rollLedger2s: d.rollLedger2s, sweepMeasures: d.sweepMeasures,
    series: d.series, seriesCols: d.seriesCols, ctrl: { contactAuthFrom: tc ?? null, contactAuthBody: ctrl.contactAuthBody ?? null, recoverFrom: ctrl.recoverFrom ?? null, failures: ctrl.failures ?? null, wholeBody: ctrl.wholeBody ?? null },
    cost: Object.fromEntries(Object.entries(c).filter(([k]) => k !== "m").map(([k, v]) => [k, +(+v).toFixed(3)])), costM: c.m }; };
const out = { tool: "sp2c_final.mjs", friction: { m: RC.TEMP_M, id: "F37.5", temporary: true, note: "development value (owner, 14 Oct) — not canonical, not tuned in SP2C" }, sp2cOpts: COPTS, sp2aOpts: AOPTS, runs: { SP2C: {}, SP2A: {} } };
for (const sp of Object.keys(RUNINS)) { out.runs.SP2C[sp] = await one("C37", COPTS, sp); out.runs.SP2A[sp] = await one("A37", AOPTS, sp); }
const re = await RC.runC(RUNINS["5.0"], COPTS, RC.TEMP_M, 1440); out.determinism = { first: out.runs.SP2C["5.0"].hash, rerun: re.finalHash, identical: re.finalHash === out.runs.SP2C["5.0"].hash };
console.log("determinism", JSON.stringify(out.determinism)); fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
