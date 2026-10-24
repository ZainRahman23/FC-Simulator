// occupy2/tools/o2_diag52.mjs — STAGE 1 DIAGNOSIS: the "52 cm" foot discrepancy, tick by tick. One move window under Stage 1 against OLD: the
// world root difference, and per foot its state (PLANTED on a stance / SWING / at a ball CONTACT), its world and root-relative difference from
// OLD, and the root displacement occupancy accumulated over the current planted stance.   node o2_diag52.mjs [<BODY_FEINT|CROQUETA> <ahead> <lat> <request> <S1|S2>]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { runO } from "../../occupy1/o_run.js";
import { runO2 } from "../o2_run.js";
const DT = 1 / 240, hyp = Math.hypot, [tech = "CROQUETA", ahead = "2.4", lat = "-0.5", rq = "0.3", MODE = "S1"] = process.argv.slice(2);
const c = tech === "CROQUETA" ? CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") : CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT");
const tc = { id: "diag", c, def: { at: [+ahead, +lat], face: 180, stick: [] }, tackle: [+rq] }, RO = runO(ENV, tc, "OLD"), RC = MODE === "S2" ? runO2(ENV, tc, "S2") : runO(ENV, tc, "OCC"), WO = RO.W, WC = RC.W, t0 = RO.t0, L = new Map(WC.occ.log.map((x) => [x.k, x]));
const live = (W) => W.att.plans.map((P) => P.action).find((a) => a && a.tCommit != null && /BODY FEINT|CROQUETA/.test(a.label || "") && W.att.planAt(a.tCommit + 1e-6).action === a);
const a = live(WO); console.log(`${tech} ${ahead}/${lat}@${rq}: ${a.label} · ${MODE === "S2" ? "STAGE 2" : "STAGE 1"} vs OLD · committed +${(a.tCommit - t0).toFixed(3)} released +${(a.tRelease - t0).toFixed(3)} (s from the carrier's t = 0)`);
const loc = (J, s, j) => { const c = Math.cos(s.psi), sn = Math.sin(s.psi), x = J[j].j[0] - s.P[0], y = J[j].j[1] - s.P[1]; return [c * x + sn * y, -sn * x + c * y, J[j].j[2]]; };
const acc = { R: null, L: null }; let worst = null;
for (let k = Math.round(a.tCommit / DT); k <= Math.round(a.tRelease / DT); k++) { const t = k * DT, fO = WO.frames.get(k), fC = WC.frames.get(k); if (!fO || !fC) continue; const sO = WO.att.stateAt(t), sC = WC.att.stateAt(t), P = WC.att.planAt(t), o = L.get(k);
  const row = [`+${(t - t0).toFixed(3)}`, `rootΔ ${(hyp(sC.P[0] - sO.P[0], sC.P[1] - sO.P[1]) * 100).toFixed(1)}`];
  for (const X of ["R", "L"]) { const st = P.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), con = P.contacts.find((q) => q.F === X && Math.abs(q.t - t) < 0.05), state = st ? "PLANT" : con ? "CONTACT" : "SWING";
    const key = st ? X + st.id + "@" + st.t0.toFixed(4) : null; if (st) { if (!acc[X] || acc[X].key !== key) acc[X] = { key, v: [0, 0] }; if (o) { acc[X].v[0] += o.dA[0]; acc[X].v[1] += o.dA[1]; } } else acc[X] = null;
    const lO = loc(fO.a.J, sO, "foot_" + X), lC = loc(fC.a.J, sC, "foot_" + X), dl = hyp(lO[0] - lC[0], lO[1] - lC[1], lO[2] - lC[2]), dw = hyp(fO.a.J["foot_" + X].j[0] - fC.a.J["foot_" + X].j[0], fO.a.J["foot_" + X].j[1] - fC.a.J["foot_" + X].j[1]);
    row.push(`${X} ${state.padEnd(7)} local ${(dl * 100).toFixed(1).padStart(5)} world ${(dw * 100).toFixed(1).padStart(5)}${acc[X] ? ` stanceΣ ${(hyp(...acc[X].v) * 100).toFixed(1)}` : ""}`);
    if (!worst || dl > worst.dl) worst = { dl, t: t - t0, X, state, rootD: hyp(sC.P[0] - sO.P[0], sC.P[1] - sO.P[1]), stance: acc[X] ? hyp(...acc[X].v) : null }; }
  if (o) row.push(`${o.conflict ? "CONFLICT" : ""} dA ${(hyp(...o.dA) * 100).toFixed(2)}`); if (k % 6 === 0) console.log(row.join(" · ")); }
console.log(`WORST: +${worst.t.toFixed(3)} foot ${worst.X} ${worst.state}: ${(worst.dl * 100).toFixed(1)} cm from its authored place relative to the root; the root ${(worst.rootD * 100).toFixed(1)} cm from OLD${worst.stance != null ? `; the stance's accumulated correction ${(worst.stance * 100).toFixed(1)} cm` : ""}`);
