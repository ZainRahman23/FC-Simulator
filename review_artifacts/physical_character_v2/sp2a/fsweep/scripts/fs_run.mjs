// SP2A BODY-FRICTION SWEEP — runner. The frozen SP2A candidate (evidence/SP2A_opts.json), the 5.0 m/s RUN-1 run-in, every condition identical
// except the diagnostic non-stud body/turf friction multiplier m (fs_contact.mjs). 6 s per run (1440 steps) so low-friction slides can stop.
// usage (worktree root): node fs_run.mjs --runin <run1g_4.608.json> --out <evidence dir> --records <dir outside git> [--ms 1,0.75,0.5,0.25,0.1,0] [--steps 1440]
import fs from "fs";
const L = await import(new URL("../../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), FL = await import(new URL("../../scripts/sp2a_flight.mjs", import.meta.url).href);
const FC = await import(new URL("./fs_contact.mjs", import.meta.url).href), FM = await import(new URL("./fs_measure.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"), REC = arg("records"); fs.mkdirSync(OUT, { recursive: true }); if (REC) fs.mkdirSync(REC, { recursive: true });
const A = JSON.parse(fs.readFileSync(new URL("../../evidence/SP2A_opts.json", import.meta.url))), ms = arg("ms", "1,0.75,0.5,0.25,0.1,0").split(",").map(Number), steps = +arg("steps", "1440");
const out = { tool: "fs_run.mjs", candidate: A, runin: arg("runin").split("/").pop(), steps, conditions: {} };
for (const m of ms) { const id = "F" + Math.round(m * 100); let log = null;
  const o = await FL.runFlight(arg("runin"), { ...A, id }, steps, { setup: (sim) => { FC.sweepSetup(m)(sim); const t0 = sim.tick.bind(sim); sim.tick = () => { const r = t0(); log = sim.fsLog; return r; }; } });
  o.fsweep = { m, id, contactLog: log }; if (REC) L.writeGz(`${REC}/${id}.json.gz`, o);
  const r = FM.measure(o, m); r.contactLog = log; out.conditions[id] = r;
  const lg = r.ledgerSlide; console.log(id, r.hash, "| entry", JSON.stringify(r.groundEntry && { t: r.groundEntry.t, vh: r.groundEntry.vh }), "| est", JSON.stringify(r.slideEstablished), "| stop", JSON.stringify(r.stopped), "| path", r.slidePathM, "disp", r.slideDisplacementM, "| avgDec", r.avgDecel, "peak", JSON.stringify(r.peakDecel), "| final", r.finalState.class,
    "\n   ledger brake N·s:", lg ? Object.entries(lg.byRegion).map(([c, e]) => `${c} ${e.brakeNs}(${Math.round(100 * (e.brakeShare || 0))}%) N ${e.normalNs}`).join(" | ") : "-", "| closure", lg && lg.closureResidualNs, "normalRatio", lg && lg.normalRatio, "| log", JSON.stringify(log)); }
fs.writeFileSync(`${OUT}/fsweep_summary.json`, JSON.stringify(out, null, 1));
