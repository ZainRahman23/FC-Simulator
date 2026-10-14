// SP2A run: the physical part from the commitment touchdown (constraint-space limit audit), measured with the SP2 measures; the RUN-1 run-in
// prefix (kinematic presentation) is stored with the record (rec.runIn) for rendering one continuous event.
// usage (worktree root): node sp2a_run.mjs --runin run1_5.json [--td <s>] [--opts '{json}'] [--out rec.json.gz] [--steps 480]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), CL = await import(S1 + "sp_climits.mjs"), EN = await import(S1 + "sp_entry.mjs");
const AA = await import(new URL("./sp2a_author.mjs", import.meta.url).href), P2 = await import(new URL("../../slide_phys2/scripts/sp2_param.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export async function runSP2A(runinFile, tTD, A = {}, steps = 480) { const RI = AA.loadRunIn(runinFile, tTD, 0.66, A.takeover ?? -0.075), cand = AA.makeSP2A(RI, { ...A, steps }), E = EN.buildEntry(cand.entry);
  const o = await CL.auditRun(cand, { steps }); o.contactRule = cand.soleRule; o.candId = cand.id; o.runIn = AA.runInStates(RI, E.root); o.run1Cont = AA.run1Cont(RI); o.entrySpec = cand.entry; o.sp2aOpts = A; o.takeover = RI.takeover; o.tOffset = cand.tOffset; o.speedTackler = +(RI.d.speed * AA.LEGR).toFixed(3); return o; }
if (process.argv[1] && process.argv[1].endsWith("sp2a_run.mjs")) { const A = JSON.parse(arg("opts", "{}")), o = await runSP2A(arg("runin"), arg("td") ? +arg("td") : null, A, +arg("steps", "480"));
  const m = P2.M.measure(o), c = P2.cost(m, o.climits); if (arg("out")) L.writeGz(arg("out"), o);
  console.log(o.candId, o.finalHash, "cost", c.total.toFixed(2), JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k, x]) => x > 0.01 && k !== "total").map(([k, x]) => [k, +x.toFixed(2)]))));
  console.log("  ", P2.M.brief(m)); console.log("   limits:", CL.cTable(o.climits, 1).map(e => `${e.id} ${e.beyond}°/${(e.dur * 1000).toFixed(0)}ms@${e.at}`).join(", ") || "none > 1°", "| contactAuth from", o.ctrl && o.ctrl.contactAuthFrom, o.ctrl && o.ctrl.contactAuthBody, "| entry v", JSON.stringify(o.entrySpec.vRoot.map(x => +x.toFixed(2)))); }
