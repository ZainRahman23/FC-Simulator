// receive_elite1/tools/re1_set.mjs — the elite review set: CURRENT vs NEW at the given ratings (seeds), the owner's required metrics per action
//   node re1_set.mjs <out.json> [seeds] [B,D,A] [ids]
import fs from "fs"; import { makeElite, makeCurrent } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js"; import { tight } from "./re1_metrics.mjs";
const out = process.argv[2], seeds = (process.argv[3] || "1").split(",").map(Number), rt = (process.argv[4] || "99,99,99").split(",").map(Number), ids = process.argv[5] ? process.argv[5].split(",") : ALL, rows = [];
for (const id of ids) for (const sd of seeds) for (const pipe of ["CURRENT", "NEW"]) { const cs = parseCase(`${id}_B${rt[0]}_D${rt[1]}_A${rt[2]}`), S = pipe === "CURRENT" ? makeCurrent(cs, { seed: sd }) : makeElite(cs, { seed: sd }); S.run(cs.scenario.dur);
  const m = tight(S, cs); m.seed = sd; m.pipeline = pipe; if (pipe === "NEW" && S.rc2 && S.rc2.kind === "ELITE") m.elite = S.rc2.ep.summary(); rows.push(m); }
if (out !== "-") fs.writeFileSync(out, JSON.stringify({ ratings: rt, seeds, rows }, null, 1));
const f = (x) => (x == null ? "  -  " : String(x).padStart(5));
console.log("case".padEnd(22), "fam".padEnd(13), "outcome(C/N)".padEnd(16), "turnMax C→N", "recvMax C→N", "recvMean C→N", " nC", "gapMin", "vMin C→N", "v+1s C→N", "align C→N", "stable C→N");
for (const id of ids) for (const sd of seeds) { const c = rows.find((r) => r.base === id && r.seed === sd && r.pipeline === "CURRENT"), n = rows.find((r) => r.base === id && r.seed === sd && r.pipeline === "NEW");
  console.log(id.padEnd(22), (n.family || "").padEnd(13), (c.cls5 + "/" + n.cls5).padEnd(16), f(c.sep.turn && c.sep.turn.max), "→", f(n.sep.turn && n.sep.turn.max), f(c.sep.receive && c.sep.receive.max), "→", f(n.sep.receive && n.sep.receive.max), f(c.sep.receive && c.sep.receive.mean), "→", f(n.sep.receive && n.sep.receive.mean), f(n.receiveContacts), f(n.gapMin), f(c.speed.min), "→", f(n.speed.min), f(c.speed.after10), "→", f(n.speed.after10), f(c.tAlign), "→", f(n.tAlign), f(c.tStable), "→", f(n.tStable)); }
