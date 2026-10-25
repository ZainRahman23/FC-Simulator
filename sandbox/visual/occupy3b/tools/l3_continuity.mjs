// occupy3b/tools/l3_continuity.mjs — §18 CONTINUITY with STAGE 3B (Stage 3's o3_continuity.mjs, its windows unchanged, run for OLD STAGE 3 and
// STAGE 3B): the drawn pelvis, knees and feet at 60 Hz, ± 5 frames around each transition (Stage 3's five, plus STAGE 3B's LIMB CONTACT: each
// player's first contact application of each episode), against the same window of the same encounter in STAGE 2 (as decided). Accelerations in cm
// per frame², velocity jumps between frames (m/s), pose snaps (> the root's own displacement, cm).
//   node l3_continuity.mjs --set matrix|review|l3 [--json f]
import { ENV, runO3, arg, setOf, DT, hyp } from "./l3_common.mjs";
import fs from "node:fs";
const SET = arg("set", "matrix");
const PTS = { pelvis: (J) => J.pelvis.j, kneeR: (J) => J.shin_R.j, kneeL: (J) => J.shin_L.j, footR: (J) => J.foot_R.j, footL: (J) => J.foot_L.j };
// (Stage 3's window, verbatim)
function win(Wd, ck, kc, rootOf) { const ks = []; for (let f = -5; f <= 5; f++) ks.push(Math.round(kc / 4) * 4 + 4 * f); const out = {};
  for (const [nm, g] of Object.entries(PTS)) { const P = ks.map((k) => { const F = Wd.frames.get(k); return F ? g(F[ck].J) : null; }); let acc = 0, dv = 0, snap = 0;
    for (let i = 2; i < P.length; i++) { if (!P[i] || !P[i - 1] || !P[i - 2]) continue; acc = Math.max(acc, hyp(P[i][0] - 2 * P[i - 1][0] + P[i - 2][0], P[i][1] - 2 * P[i - 1][1] + P[i - 2][1], P[i][2] - 2 * P[i - 1][2] + P[i - 2][2]));
      const v1 = [(P[i][0] - P[i - 1][0]) / (4 * DT), (P[i][1] - P[i - 1][1]) / (4 * DT)], v0 = [(P[i - 1][0] - P[i - 2][0]) / (4 * DT), (P[i - 1][1] - P[i - 2][1]) / (4 * DT)]; dv = Math.max(dv, hyp(v1[0] - v0[0], v1[1] - v0[1])); }
    for (let i = 1; i < P.length; i++) { if (!P[i] || !P[i - 1]) continue; const r1 = rootOf(ks[i]), r0 = rootOf(ks[i - 1]); if (!r1 || !r0) continue; snap = Math.max(snap, hyp((P[i][0] - P[i - 1][0]) - (r1[0] - r0[0]), (P[i][1] - P[i - 1][1]) - (r1[1] - r0[1]))); }
    out[nm] = { acc, dv, snap }; } return out; }
const NAMES = ["LIMB CONTACT (3B)", "STAGE 2 → IMPACT", "IMPACT → MAXIMUM PERTURBATION", "MAXIMUM → RECOVERY STEP", "STEP → WEIGHT ACCEPTANCE", "WEIGHT ACCEPTANCE → LOCOMOTION"];
const blank = () => ({ pelvis: { acc: 0, dv: 0, snap: 0 }, knee: { acc: 0, dv: 0, snap: 0 }, foot: { acc: 0, dv: 0, snap: 0 } });
const T = {}; for (const M of ["S3", "S3B"]) { T[M] = {}; for (const n of NAMES) T[M][n] = { n: 0, X: blank(), S2: blank(), worst: null }; }
const rows = [];
for (const tc of setOf(SET)) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  const roots = { S2D: new Map(), S3: new Map(), S3B: new Map() }, rec = (M) => (W) => roots[M].set(W.k, [W.att.stateAt(W.att.t).P.slice(), W.def.stateAt(W.def.t).P.slice()]);
  const R2 = runO3(ENV, tc, "S2D", { record: true, onTick: rec("S2D") });
  for (const M of ["S3", "S3B"]) { const R3 = runO3(ENV, tc, M, { record: true, onTick: rec(M) }), W3 = R3.W;
    const at = []; // [pid, i, ck, transition, k]
    for (const e of W3.imp.episodes) for (const [i, pid, ck] of [[0, "ATT", "a"], [1, "DEF", "d"]]) { const q = e.players[pid]; if (!q) continue;
      let kMax = e.kA, uMax = -1; for (const x of W3.imp.log) { if (x.k < e.kA || (e.t1 != null && x.k * DT > e.t1)) continue; const p = x.p && x.p[i]; if (p && hyp(...p.u) > uMax) { uMax = hyp(...p.u); kMax = x.k; } }
      const ev = W3.imp.events.filter((x) => x.who === pid && x.t >= e.t0 - 1e-9 && (e.t1 == null || x.t <= e.t1 + 1e-9)), st = ev.find((x) => x.kind === "RECOVERY STEP"), ld = ev.find((x) => x.kind === "STEP LANDED"), rg = ev.find((x) => x.kind === "BALANCE REGAINED");
      for (const [n, k] of [[NAMES[1], e.kA], [NAMES[2], kMax], [NAMES[3], st ? st.k : null], [NAMES[4], ld ? ld.k : null], [NAMES[5], rg ? rg.k : null]]) if (k != null) at.push([pid, i, ck, n, k]); }
    // (3B's contact onsets: an application more than 0.5 s after the previous one opens a new contact — both players are in every application)
    if (W3.l3) { let last = -Infinity; for (const a of W3.l3.apps) { if (a.k - last > 120) for (const [pid, i, ck] of [["ATT", 0, "a"], ["DEF", 1, "d"]]) at.push([pid, i, ck, NAMES[0], a.k]); last = a.k; } }
    for (const [pid, i, ck, n, k] of at) { const a = win(W3, ck, k, (kk) => (roots[M].get(kk) || [])[i]), b = win(R2.W, ck, k, (kk) => (roots.S2D.get(kk) || [])[i]), X = T[M][n]; X.n++;
      for (const [D, src] of [[X.X, a], [X.S2, b]]) for (const [g, keys] of [["pelvis", ["pelvis"]], ["knee", ["kneeR", "kneeL"]], ["foot", ["footR", "footL"]]]) for (const kk of keys) for (const f of ["acc", "dv", "snap"]) D[g][f] = Math.max(D[g][f], src[kk][f]);
      const add = a.pelvis.acc - b.pelvis.acc; if (!X.worst || add > X.worst.add) X.worst = { id: tc.id, pid, t: +(k * DT - R3.t0).toFixed(3), add: +add.toFixed(4) };
      rows.push({ id: tc.id, mode: M, pid, tr: n, t: +(k * DT - R3.t0).toFixed(3), X: a, S2: b }); } }
  process.stderr.write("."); }
const cm = (v) => (v * 100).toFixed(1);
console.log(`\n§18 CONTINUITY — set ${SET}: the drawn pelvis, knees and feet at 60 Hz, ± 5 frames around each transition, against the same window in STAGE 2`);
for (const M of ["S3", "S3B"]) { console.log(`\n${M === "S3" ? "OLD STAGE 3" : "STAGE 3B"}`);
  console.log(`${"transition".padEnd(34)}${"n".padStart(5)}  ${"pelvis acc cm/f² S2 → X".padStart(26)}${"pelvis Δv m/s".padStart(16)}${"pose snap cm".padStart(15)}${"knee acc".padStart(14)}${"foot acc".padStart(14)}${"knee Δv m/s".padStart(16)}${"foot Δv m/s".padStart(16)}  worst added pelvis jolt`);
  for (const n of NAMES) { const x = T[M][n]; if (!x.n) { console.log(`${n.padEnd(34)}${"0".padStart(5)}`); continue; }
    console.log(`${n.padEnd(34)}${String(x.n).padStart(5)}  ${(cm(x.S2.pelvis.acc) + " → " + cm(x.X.pelvis.acc)).padStart(26)}${(x.S2.pelvis.dv.toFixed(2) + " → " + x.X.pelvis.dv.toFixed(2)).padStart(16)}${(cm(x.S2.pelvis.snap) + " → " + cm(x.X.pelvis.snap)).padStart(15)}${(cm(x.S2.knee.acc) + "→" + cm(x.X.knee.acc)).padStart(14)}${(cm(x.S2.foot.acc) + "→" + cm(x.X.foot.acc)).padStart(14)}${(x.S2.knee.dv.toFixed(2) + "→" + x.X.knee.dv.toFixed(2)).padStart(16)}${(x.S2.foot.dv.toFixed(2) + "→" + x.X.foot.dv.toFixed(2)).padStart(16)}  ${x.worst ? `${x.worst.id} ${x.worst.pid} @${x.worst.t}s +${cm(x.worst.add)}` : ""}`); } }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ set: SET, T, rows }, null, 0));
