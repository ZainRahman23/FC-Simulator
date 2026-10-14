// SLIDE-PHYS-2 run one full-tackle candidate (solo, with the constraint-space limit audit) and print the SP2 measures.
// usage (worktree root): node sp2_run.mjs --cand H1 [--speed 5] [--steps 480] [--authority A5] [--out rec.json.gz]
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), CL = await import(S1 + "sp_climits.mjs");
const CN = await import(new URL("./sp2_cand.mjs", import.meta.url).href), M = await import(new URL("./sp2_measures.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export async function runSP2(id, speed = 5, steps = 480, authority = "A5", mod = null) { let cand = CN.make(id, speed, authority); if (mod) cand = mod(cand);
  const o = await CL.auditRun(cand, { steps }); o.contactRule = cand.soleRule; o.candId = id; o.speed = speed; return o; }
if (process.argv[1] && process.argv[1].endsWith("sp2_run.mjs")) { const ids = arg("cand", "H1").split(","), speeds = arg("speed", "5").split(",").map(Number);
  for (const id of ids) for (const v of speeds) { const o = await runSP2(id, v, +arg("steps", "480"), arg("authority", "A5")); const m = M.measure(o), cl = CL.cTable(o.climits, 1.0);
    if (arg("out")) L.writeGz(arg("out").replace("{id}", id).replace("{v}", v), o);
    console.log(`${id}@${v}`, o.finalHash, M.brief(m)); console.log("   limits:", cl.map(e => `${e.id} ${e.beyond}°/${(e.dur * 1000).toFixed(0)}ms@${e.at}`).join(", ") || "none > 1°", "| recl@stop", m.posture.reclAtStop); } }
