// SP2C evaluation of one candidate on the 3 RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s) at the TEMPORARY friction F37.5, 6 s: the SP2C cost
// (sp2c_search.costSP2C) by term and the key measures (folded knee in the pelvis at first fold contact, fold toe / sole share, first prone,
// trunk-up / head at 6 s, slide path, final state, limits). usage (worktree root):
//   node sp2c_eval.mjs --opts <opts.json | '{json}'> [--runins a,b,c] [--save <dir>] [--tag name] [--json out.json] [--brief 1]
import fs from "fs";
const B0 = new URL("../../", import.meta.url).href, RC = await import(new URL("./sp2c_run.mjs", import.meta.url).href), DG = await import(new URL("./sp2c_diag.mjs", import.meta.url).href), SS = await import(new URL("./sp2c_search.mjs", import.meta.url).href);
const P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), RG = await import(B0 + "slide_phys2/scripts/sp2_regions.mjs");
export async function evalOpts(A, runins, save, tag) { const out = []; for (const ri of runins) { const o = await RC.runC(ri, A, RC.TEMP_M, 1440), d = DG.diagnose(o, RC.TEMP_M), m2 = P2.M.measure(o), c2 = P2.cost(m2, o.climits), c = SS.costSP2C(o, d, m2, c2, L, RG);
  const r = { runin: ri.split("/").pop(), hash: o.finalHash, total: +c.total.toFixed(3), parts: Object.fromEntries(Object.entries(c).filter(([k, v]) => k !== "m" && k !== "total" && v > 0.005).map(([k, v]) => [k, +v.toFixed(3)])), m: c.m,
    limits: (d.sweepMeasures.climits || []).filter(e => e.beyondDeg >= 0.5) }; out.push(r);
  if (save) { fs.mkdirSync(save, { recursive: true }); const nm = `${tag || A.id || "cand"}_${r.runin.replace(".json", "")}`; L.writeGz(`${save}/${nm}.json.gz`, o); fs.writeFileSync(`${save}/${nm}.diag.json`, JSON.stringify(d, null, 1)); } }
  return out; }
if (process.argv[1] && process.argv[1].endsWith("sp2c_eval.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const os = arg("opts"), A = os.trim().startsWith("{") ? JSON.parse(os) : JSON.parse(fs.readFileSync(os)), S = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/";
  const runins = (arg("runins") || ["4.147", "4.608", "5.069"].map(v => `${S}run1g_${v}.json`).join(",")).split(","), out = await evalOpts(A, runins, arg("save"), arg("tag"));
  if (arg("brief")) for (const r of out) console.log((arg("tag") || A.id || "?").padEnd(10), r.runin.padEnd(17), String(r.total).padEnd(7), "prone", String(r.m.proneT).padEnd(6), "up6", String(r.m.upEnd).padEnd(6), "head6", String(r.m.headEnd).padEnd(6), "slide", r.m.slide, r.m.final);
  else for (const r of out) console.log((arg("tag") || A.id || "?").padEnd(10), r.runin.padEnd(17), r.hash, String(r.total).padEnd(7), JSON.stringify(r.parts), "|", JSON.stringify({ k0: r.m.knee0, ts: r.m.foldToeSole, st: r.m.foldStud, prone: r.m.proneT, minB: r.m.minBelly, up6: r.m.upEnd, head6: r.m.headEnd, slide: r.m.slide, fin: r.m.final }), "| lim", JSON.stringify(r.limits.map(e => `${e.id} ${e.beyondDeg}°/${e.durS}s`)));
  const tot = out.map(r => r.total); console.log("  combined", (tot.reduce((a, b) => a + b, 0) / tot.length + 0.5 * Math.max(...tot)).toFixed(3));
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ opts: A, friction: "F37.5 temporary", runs: out }, null, 1)); }
