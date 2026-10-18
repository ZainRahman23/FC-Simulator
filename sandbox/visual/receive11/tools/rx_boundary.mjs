// receive11/tools/rx_boundary.mjs — the receiveTurnAngle convention and its validated boundaries (RECEIVE-CONTROL-1's function, unchanged):
// 89° ordinary · 90° turning · 270° turning · 271° ordinary — from every pass direction at JOG / MED, and the KIND of the family the action
// selection then chose (an ordinary family for an ordinary receive, a turning family for a turning one).  usage: node rx_boundary.mjs out.json
import fs from "fs"; import { makeReceive, receiveTurnAngle, exitTurn } from "./rx_env.mjs"; import { parseCase, DIRS } from "../rx_cases.js"; import { FAMILIES } from "../rx_actions.js";
const DEG = Math.PI / 180, rows = []; let ok = 0, n = 0;
const fn = [[89, "ordinary"], [90, "turning"], [270, "turning"], [271, "ordinary"], [0, "ordinary"], [180, "turning"]].map(([a, k]) => { const c = receiveTurnAngle(0, exitTurn(a) * DEG); return { angle: a, kind: c.turning ? "turning" : "ordinary", expect: k, deg360: c.deg360 }; });
for (const d of Object.keys(DIRS)) for (const a of [89, 90, 270, 271]) { const cs = parseCase(`${d}_${a}_JOG_MED`), S = makeReceive(cs, { seed: 1 }); S.run(); const sm = S.summary(), want = a === 89 || a === 271 ? "ordinary" : "turning";
  const famKind = sm.action ? FAMILIES[sm.action.fam].kind : null, pass = sm.cls.kind === want && (!sm.action || famKind === want); n++; if (pass) ok++;
  rows.push({ id: cs.id, cls: sm.cls.kind, deg360: sm.cls.deg360, want, family: sm.action ? sm.action.fam : null, familyKind: famKind, pass }); }
const out = { function: fn, functionPass: fn.every((r) => r.kind === r.expect), cases: rows, pass: ok, n };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log("function:", fn.map((r) => `${r.angle}°→${r.kind}`).join(" "), out.functionPass ? "PASS" : "FAIL", `· matrix ${ok}/${n} (classification + family kind)`);
for (const r of rows) if (!r.pass) console.log("  FAIL", r.id, r.cls, r.family, r.familyKind);
