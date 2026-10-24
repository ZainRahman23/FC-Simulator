// tackle1/tools/t_moves.mjs — THE APPROVED MOVES AGAINST A STANDING TACKLE: the curated Body Feint and Croqueta cases (verbatim) × the defender in
// front (ahead 2.4 – 4.0 m, lateral −1.0 … +1.0 m, facing the carrier) × the request time 0 … 1.0 s — the outcome distribution, and the same set-ups
// with the plain carry (the move's own effect: what the tackle would have met without it)    node t_moves.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { runCase, caseReport } from "../t_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const MOVES = { BODY_FEINT: CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CROQUETA: CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") };
const out = {}, ex = {};
for (const [name, c0] of Object.entries(MOVES)) for (const lane of ["MOVE", "PLAIN CARRY"]) { const c = lane === "MOVE" ? c0 : Object.assign({}, c0, { intents: [], tech: "CARRY", variant: "PLAIN (same run-up, stick " + c0.ang + "°)" }), T = (out[name + " · " + lane] = {});
  for (const ahead of [2.4, 3.0, 3.6, 4.2]) for (const lat of [-1.0, -0.5, 0.5, 1.0]) for (let q = 0; q <= 10; q++) { const tq = +(q * 0.1).toFixed(1), tc = { id: "x", c, def: { at: [ahead, lat], face: 180, stick: [] }, tackle: [tq] };
    const r = runCase(ENV, tc), S = caseReport(r.W, r.t0).action; const k = S ? S.outcome.kind : "DECLINED"; T[k] = (T[k] || 0) + 1; if (S && lane === "MOVE") (ex[name + ":" + k] || (ex[name + ":" + k] = [])).push(`${ahead}/${lat}@${tq}`); } }
for (const [k, v] of Object.entries(out)) { const n = Object.values(v).reduce((a, b) => a + b, 0) - (v.DECLINED || 0); console.log(`${k.padEnd(28)} committed ${n}: ${Object.entries(v).filter(([x]) => x !== "DECLINED").sort((a, b) => b[1] - a[1]).map(([x, m]) => `${x} ${m}`).join(" · ")} (declined ${v.DECLINED || 0})`); }
for (const [k, v] of Object.entries(ex)) console.log(k, v.slice(0, 8).join(" "));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ out, ex }, null, 1));
