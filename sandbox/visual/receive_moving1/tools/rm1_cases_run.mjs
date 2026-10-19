// receive_moving1/tools/rm1_cases_run.mjs — the owner's critical moving cases (A–H + extras) × Ball Control 50 / 70 / 80 / 90 / 99 × seeds (matched
// draws): the outcome (RECEIVE-CONTROL-1.1's scorecard), the action, the momentum metrics (§31), the takeover window, the DRIBBLE-V1 continuation;
// and the BC-independence of the body: the run before the contact is identical at every rating.   node rm1_cases_run.mjs <out.json> [seeds]
import fs from "fs"; import { makeReceiveM, DT } from "./rm1_env.mjs"; import { CASES, parseCase, seedCase } from "../rm1_cases.js"; import { score } from "../../receive11/tools/rx_metrics.mjs"; import { momentum } from "./rm1_metrics.mjs";
const out = process.argv[2] || "rm1_cases.json", seeds = (process.argv[3] || "1,2,3").split(",").map(Number), BCS = [50, 70, 80, 90, 99], rows = [], bodyBC = { sets: 0, same: 0 };
for (const c of CASES) { const base = c.id.replace(/_BC\d+$/, ""), bcs = /_BC\d+$/.test(c.id) ? [+c.id.match(/_BC(\d+)$/)[1]] : BCS;
  for (const sd of seeds) { const pre = [];
    for (const bc of bcs) { const cs = seedCase(parseCase(base + "_BC" + bc), sd), S = makeReceiveM(cs, { seed: sd }); S.run(cs.scenario.dur);
      const row = score(S, Object.assign({ angle: cs.turn, side: null }, cs), { recvPerS: null, afterPerS: null, worst: 0 }), m = momentum(S), c2 = S.rc2, ex = S.rx.contact && S.rx.contact.ex;
      rows.push({ case: c.id.replace(/_BC\d+$/, ""), tag: c.tag, id: cs.id, seed: sd, bc: S.bc, outcome: row.outcome, cls5: row.cls5, action: row.action ? { fam: row.action.fam, F: row.action.F, surface: row.action.surface } : (c2 && c2.cls ? { fam: c2.cls.action } : null), momentum: m,
        touch: ex ? { dirErr: +(+ex.dirErrDeg).toFixed(2), speedErr: +(+ex.speedErr).toFixed(2), D: ex.D != null ? +(+ex.D).toFixed(3) : null } : null, window: c2 && c2.window || null, handoff: row.handoff, ctrlEnd: row.ctrlEnd, fault: S.fault ? S.fault.message : null,
        trace: S.rec.filter((r, k) => k % 12 === 0 && k <= (m.tContact != null ? Math.round(m.tContact / DT) + 360 : 720)).map((r) => +Math.hypot(r.V[0], r.V[1]).toFixed(2)) });   // the speed every 0.05 s, the strike → the contact + 1.5 s
      const k1 = S.rx.contact && S.rx.contact.T ? S.rx.contact.T.k : null; pre.push(k1 != null ? JSON.stringify(S.rec.slice(0, k1).map((r) => [r.P[0], r.P[1], r.V[0], r.V[1]])) : null); }
    if (bcs.length > 1) { bodyBC.sets++; if (pre.every((x) => x === pre[0])) bodyBC.same++; } } }
fs.writeFileSync(out, JSON.stringify({ rows, bodyBeforeContactIdenticalAcrossBC: bodyBC }, null, 1)); console.log(rows.length, "runs; body before the contact identical across BC:", JSON.stringify(bodyBC));
const R = (cid) => rows.filter((r) => r.case === cid);
for (const c of CASES) { const Q = R(c.id.replace(/_BC\d+$/, "")); if (!Q.length) continue; const oc = {}; for (const r of Q) oc[r.cls5] = (oc[r.cls5] || 0) + 1; const m = Q[0].momentum;
  console.log(c.id.padEnd(22), (Q[0].action && Q[0].action.fam || "").padEnd(14), JSON.stringify(oc), `v ${m.vBefore}→min ${m.vMin}, contact ${m.vContact}, +0.5 ${m.v050}, +1.0 ${m.v100}`); }
