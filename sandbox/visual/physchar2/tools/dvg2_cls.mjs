// ═══ physchar2/tools/dvg2_cls.mjs — DVG2 step 0 (e2/DVG2_PREREG.md §3): the class of every SV-2 case from the FROZEN execution-feasibility certifier (tools/exec_qualify.mjs,
// e2/EXECUTION_FEASIBILITY.md, DVG off): class A = "→ QUALIFIED", class B = "→ NOT QUALIFIED". 8 bodies × 2 legs × 10 trajectories × {180, 240, 480} Hz. The 240 Hz verdicts must equal
// e2/evidence_exec/sweep.txt (the certifier's committed sweep; a difference is a test defect). Also writes the class-B executable set (cases present in the SV-2 servo-on list).
// usage: node tools/dvg2_cls.mjs --dir=<certifier logs> --sweep=<evidence_exec/sweep.txt> --sv2list=<CQ_RUN_LIST.json> --out=<cls.json>
import fs from "fs"; import path from "path";
const arg = (k, d = "") => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const BODIES = ["V2-REF", "V2-165-62", "V2-175-70", "V2-190-85", "V2-198-92", "V2-long-legs", "V2-short-legs", "V1-matched"], TRAJ = ["R-F", "R-L", "C-F7", "C-F13", "C-L5", "C-L11", "H-T45", "H-A40", "H-D", "H-F15"];
const verdictOf = (line) => { const m = line.match(/→ (NOT QUALIFIED|QUALIFIED)/); return m ? m[1] : null; };
const sweep = {}; for (const l of fs.readFileSync(arg("sweep"), "utf8").split("\n").filter(x => x.startsWith("EXQ "))) { const m = l.match(/^EXQ (\S+) ([LR]) (\d+) Hz (\S+):/); if (m) sweep[`${m[1]}|${m[2]}|${m[3]}|${m[4]}`] = l; }
const out = { generated: "tools/dvg2_cls.mjs", prereg: "e2/DVG2_PREREG.md §3", cls: {}, missing: [], sweepMismatch: [], sweepLineDiff: [], classBexecutable: [] };
for (const body of BODIES) for (const side of ["L", "R"]) for (const hz of [180, 240, 480]) for (const traj of TRAJ) { const k = `${body}|${side}|${hz}|${traj}`, f = path.join(arg("dir"), `exq_${body}_${side}_${hz}_${traj}.log`);
  const line = fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").find(x => x.startsWith("EXQ ")) : null, v = line ? verdictOf(line) : null; if (!v) { out.missing.push(k); continue; }
  out.cls[k] = { qualified: v === "QUALIFIED", verdict: v, line };
  if (hz === 240) { const s = sweep[k]; if (!s || verdictOf(s) !== v) out.sweepMismatch.push(`${k}: ${v} vs sweep ${s ? verdictOf(s) : "absent"}`); else if (s !== line) out.sweepLineDiff.push(k); } }
const L = JSON.parse(fs.readFileSync(arg("sv2list"))); for (const q of L.sv2) { const c = out.cls[`${q.body}|${q.side}|${q.hz}|${q.traj}`]; if (c && !c.qualified) out.classBexecutable.push(q); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
const n = Object.values(out.cls), nb = n.filter(x => !x.qualified).length;
console.log(`DVG2-CLS cases ${n.length} (missing ${out.missing.length}); class A ${n.length - nb}, class B ${nb}; 240 Hz vs sweep: verdict mismatches ${out.sweepMismatch.length}, line differences ${out.sweepLineDiff.length}; class-B cases in the SV-2 servo-on list: ${out.classBexecutable.length} (${out.classBexecutable.map(q => `${q.body} ${q.side} ${q.hz} ${q.traj}`).join("; ")})`);
