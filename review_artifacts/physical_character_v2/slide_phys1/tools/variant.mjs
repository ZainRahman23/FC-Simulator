// explained single-variable variants: base u vector + overrides in PHYSICAL units (name=value), runs at the given speeds with the constraint-space
// limit audit, prints Stage-1 measures + cost parts; writes u + records when --save <prefix>
// usage (worktree root): node .../tools/variant.mjs --u base.json --set lumbarLate=10,lumbarBack=-10 --speeds 4.5,5,5.5 [--save prefix] [--steps 480]
import fs from "fs";
const AU = await import(new URL("../scripts/sp_authority.mjs", import.meta.url).href);
const S = "../scripts/", P = await import(new URL(S + "sp_param.mjs", import.meta.url).href), CL = await import(new URL(S + "sp_climits.mjs", import.meta.url).href), L = await import(new URL(S + "sp_lib.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const u = JSON.parse(fs.readFileSync(arg("u"))).slice(); for (const kv of (arg("set", "") || "").split(",").filter(Boolean)) { const [k, v] = kv.split("="), i = P.PARAMS.findIndex(p => p[0] === k); if (i < 0) throw new Error("no param " + k);
  const [, lo, hi] = P.PARAMS[i]; while (u.length <= i) u.push(null); u[i] = (+v - lo) / (hi - lo); if (u[i] < 0 || u[i] > 1) console.log("WARNING", k, v, "outside", lo, hi); }
if (arg("save")) fs.writeFileSync(arg("save") + "_u.json", JSON.stringify(u));
const speeds = arg("speeds", "5").split(",").map(Number), res = await Promise.all(speeds.map(async (v) => { let cand = P.makeCand(P.toPhys(u), v, arg("id", "VAR")); if (arg("seat")) cand.seat = JSON.parse(arg("seat")); if (arg("authority")) cand = AU.apply(cand, arg("authority")); const o = await CL.auditRun(cand, { steps: +arg("steps", "480") });
  const m = P.measures(o), c = P.cost(m); delete m.S; if (arg("save")) L.writeGz(`${arg("save")}_${v}.json.gz`, o); return { v, o, m, c }; }));
for (const { v, o, m, c } of res) { const ct = CL.cTable(o.climits, 1.0);
  console.log(`${v} ${o.finalHash} cost ${c.total.toFixed(2)} | entry ${m.entryT?.toFixed(3)} ${m.first} vh ${m.vhEntry?.toFixed(2)} vy ${m.vyEntry?.toFixed(2)} knee ${m.kneeAtEntry?.toFixed(0)} | slide ${m.slideDist?.toFixed(2)} m stop ${m.stopT?.toFixed(2)} | recl ${m.reclineMean?.toFixed(0)} head ${m.headT ?? "-"} belly ${m.minBelly?.toFixed(2)} | stud ${m.tackleStudFrac?.toFixed(2)} seat ${m.seatFrac?.toFixed(2)} | C-limits ${ct.map(e => e.id + " " + e.beyond + "°/" + (e.dur * 1000).toFixed(0) + "ms").join(", ") || "none >1°"}`);
  console.log("   parts", Object.entries(c.parts).filter(([, x]) => x > 0.01).map(([k, x]) => k + " " + x.toFixed(2)).join(", ")); }
