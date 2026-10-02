import fs from "fs"; import { walk, f3, fallT } from "./lib.mjs";
const M = JSON.parse(fs.readFileSync(process.env.MODEL || "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/model0.json", "utf8"));
const arg = JSON.parse(process.argv[2] || "{}"), inner = { dsLead: true, dsFlat: false };
const ctrl = { kind: "A", model: M, nom: arg.nom || [0.34, 0.24, 0.42], rho: arg.rho ?? 0.4, sig: arg.sig || [0.05, 0.05, 0.03], lo: arg.lo, hi: arg.hi };
const n = arg.n ?? 20, r = walk({ n, seconds: 1.6 + n * 0.58, keep: false, first: arg.first || "R", walk: { ...inner, char: { 0: { df: 0.237, dl: 0.368, T: 0.45 } }, ctrl } });
const tF = fallT(r), log = r.LOCO.planner.rhythm.walkerLog || [], done = r.LOCO.planner.exec.done.filter(d => d.kind === "rhythmic");
console.log(`outcome ${r.outcome} · fall ${f3(tF, 2)} · landed before fall ${done.filter(d => d.td && d.td.t < tF).length}/${n}`);
for (const e of log) { const d = done.find(q => q.stepIndex === e.i); console.log(`k${e.i} t ${f3(e.t, 2)} x ${e.x.map(v => f3(v)).join(",")} → u df ${f3(e.u[0])} dl ${f3(e.u[1])} T ${f3(e.u[2])} pred ${e.info.pred ? e.info.pred.map(v => f3(v)).join(",") : "-"} x* ${e.info.xs ? e.info.xs.map(v => f3(v)).join(",") : "-"} ${e.info.clamped && e.info.clamped.length ? "clamped " + e.info.clamped.join("/") : ""} ${d && d.td ? (d.td.t < tF ? "" : "AFTER FALL") : "no td"}`); }
