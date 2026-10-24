// possess1/tools/p_identity.mjs — WHAT THE NEW ARCHITECTURE MUST NOT CHANGE, against OLD (Standing Tackle V1's world, unchanged):
//   1. both players and the ball bit-identical, tick by tick, until the first world event between them (the tackle's first ball contact);
//      the whole run when there is none (declined / no request)
//   2. the TACKLE BODY (§30): the defender's posed body (every joint, PlayBody) identical from commitment to control return under every mode
//   node p_identity.mjs [--search 20]          (the 21 Lab cases, + the first N set-ups of the search set × 15 request times)
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { PlayBody } from "../../vocab2/u_body.js";
import { TCASES } from "../../tackle1/t_cases.js";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import { runMode, MODE_LIST } from "../p_run.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, NS = +arg("search", 0);
const sig = (W) => { const a = W.att.stateAt(W.att.t, W.att.plan), d = W.def.stateAt(W.def.t, W.def.plan), b = W.att.ballTrack ? (W.auth ? W.trueTrack(W.t) : W.att.ballTrack(W.t)) : null; return [a.P[0], a.P[1], a.psi, d.P[0], d.P[1], d.psi, b.p[0], b.p[1], b.v[0], b.v[1]]; };
const cases = TCASES.slice(); for (let i = 0; i < NS; i++) { const t0 = trialCase(i, 7); for (let q = 0; q <= 14; q++) cases.push(Object.assign({}, t0, { id: `${t0.id}@${(q * 0.1).toFixed(1)}`, tackle: [+(q * 0.1).toFixed(2)] })); }
let w2 = 0, look = 0, lookB = 0, pre = 0, preBad = 0, full = 0, fullBad = 0, body = 0, bodyBad = 0, bodyTicks = 0, worst = 0; const bad = [];
for (const tc of cases) { const runs = {};
  for (const m of MODE_LIST) { const S = []; const r = runMode(ENV, tc, m, { onTick: (W) => S.push(sig(W)) }); runs[m] = { r, S }; }
  const O = runs.OLD, A = O.r.W.tk.act, kE = A && A.hits.length ? Math.round(A.hits[0].t / DT) : Infinity;
  for (const m of MODE_LIST.slice(1)) { const S = runs[m].S, n = Math.min(S.length, O.S.length), kE2 = (() => { const B = runs[m].r.W.tk.act; return B && B.hits.length ? Math.round(B.hits[0].t / DT) : Infinity; })();
    let first = -1; for (let i = 0; i < n; i++) { const k = i + 1; if (k > Math.min(kE, kE2)) break; if (S[i].some((x, j) => x !== O.S[i][j])) { first = k; break; } }
    if (kE === Infinity) { full++; if (first >= 0 || S.length !== O.S.length) { fullBad++; bad.push(`${tc.id} ${m}: differs at tick ${first} (no contact)`); } }
    else { pre++; if (first >= 0 || kE2 !== kE) { preBad++; bad.push(`${tc.id} ${m}: differs at tick ${first} before the contact (OLD ${kE}, ${m} ${kE2})`); } }
    // the tackle body from commitment to control return
    // (the head and neck LOOK AT THE REAL BALL — after the contact the ball moves differently, because the carrier reacts differently: that is
    // presentation following the ball, not the tackle's motion. So: every other joint as posed; and every joint posed against OLD's ball.
    // The window ends 2 ticks before control return: the body's root velocity is a central difference (u_body.js stateAt(t ± DT)), so the
    // pose one tick before the control-return re-plan already reads the next decision — which legitimately differs: the ball may be loose)
    const B = runs[m].r.W.tk.act; if (A && B && Math.abs(A.t0 - B.t0) < 1e-9) { body++; const Nd = runs[m].r.W.def, pO = new PlayBody(ENV, O.r.W.def), pN = new PlayBody(ENV, Nd), pX = new PlayBody(ENV, Object.create(Nd, { ballTrack: { value: (t) => O.r.W.def.ballTrack(t) } })); let w = 0, wl = 0, wr = 0;
      for (let t = A.t0; t <= A.tCtl - 2 * DT + 1e-9; t += DT) { const a = pO.pose(t).J, b = pN.pose(t).J, x = pX.pose(t).J, ra = O.r.W.def.stateAt(t), rb = Nd.stateAt(t); wr = Math.max(wr, Math.hypot(ra.P[0] - rb.P[0], ra.P[1] - rb.P[1]), Math.abs(ra.psi - rb.psi));
        for (const key of Object.keys(a)) for (const e of ["j", "t"]) { const u = a[key][e], v = b[key][e], z = x[key][e]; if (!u || !v) continue; const d = Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]); if (/head|neck|hair/i.test(key)) wl = Math.max(wl, d); else w = Math.max(w, d); w2 = Math.max(w2, Math.hypot(u[0] - z[0], u[1] - z[1], u[2] - z[2])); } bodyTicks++; }
      worst = Math.max(worst, w2, wr); look = Math.max(look, wl); lookB = Math.max(lookB, w); if (w2 > 0 || wr > 0) { bodyBad++; bad.push(`${tc.id} ${m}: tackle body differs (body ${(w * 1000).toFixed(3)} mm, against OLD's ball ${(w2 * 1000).toFixed(3)} mm, root ${wr})`); } w2 = 0; } }
  process.stderr.write("."); }
console.log(`\nIDENTITY vs OLD — ${cases.length} cases × 4 shared modes`);
console.log(`  until the first tackle contact: ${pre - preBad} / ${pre} identical (both players + the ball, every tick)`);
console.log(`  runs with no contact (declined / missed / no request): ${full - fullBad} / ${full} identical for the whole run`);
console.log(`  the tackle body, commitment → control return − 2 ticks (${bodyTicks} posed ticks): ${body - bodyBad} / ${body} identical — the root path and every joint posed against OLD's ball exactly (worst ${(worst * 1000).toFixed(3)} mm). As drawn, the LOOK at the real ball (which moves differently after the contact, because the carrier reacts differently) moves the head / neck by up to ${(look * 1000).toFixed(0)} mm and the trunk / arms by up to ${(lookB * 1000).toFixed(1)} mm`);
for (const b of bad.slice(0, 30)) console.log("  ✗ " + b);
