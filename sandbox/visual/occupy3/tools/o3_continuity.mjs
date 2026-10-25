// occupy3/tools/o3_continuity.mjs — §18 CONTINUITY: position, velocity, acceleration of what the viewer sees (the drawn pelvis, the root, the
// knees and the feet), at 60 Hz (every 4th tick, as a frame shows it), in a window of ± 5 frames around each of Stage 3's transitions, per player
// and episode:  STAGE 2 → IMPACT (the episode's onset) · IMPACT → MAXIMUM PERTURBATION (the player's largest perturbation velocity) · MAXIMUM →
// RECOVERY STEP (the step planned) · STEP → WEIGHT ACCEPTANCE (its landing) · WEIGHT ACCEPTANCE → LOCOMOTION (balance regained). Each against the SAME
// window of the same encounter in STAGE 2 (identical inputs: what the motion itself does there) — Stage 3's added jolt is the difference. Position
// jumps (a pose snap: > 4 cm in one frame beyond the body's own speed), velocity jumps (> 1 m/s between frames), accelerations (cm per frame²).
//   node o3_continuity.mjs --set matrix|review [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf } from "./o3_identity.mjs";
import { runO3 } from "../o3_run.js";
import "../o3_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "matrix"), DT = 1 / 240, hyp = Math.hypot;
const PTS = { pelvis: (J) => J.pelvis.j, kneeR: (J) => J.shin_R.j, kneeL: (J) => J.shin_L.j, footR: (J) => J.foot_R.j, footL: (J) => J.foot_L.j };
// the window's kinematics at 60 Hz: max |acceleration| (cm per frame²), max |Δv| between frames (m/s), max frame displacement beyond the root's (cm)
function win(Wd, ck, kc, rootOf) { const ks = []; for (let f = -5; f <= 5; f++) ks.push(Math.round(kc / 4) * 4 + 4 * f); const out = {};
  for (const [nm, g] of Object.entries(PTS)) { const P = ks.map((k) => { const F = Wd.frames.get(k); return F ? g(F[ck].J) : null; }); let acc = 0, dv = 0, snap = 0;
    for (let i = 2; i < P.length; i++) { if (!P[i] || !P[i - 1] || !P[i - 2]) continue; acc = Math.max(acc, hyp(P[i][0] - 2 * P[i - 1][0] + P[i - 2][0], P[i][1] - 2 * P[i - 1][1] + P[i - 2][1], P[i][2] - 2 * P[i - 1][2] + P[i - 2][2]));
      const v1 = [(P[i][0] - P[i - 1][0]) / (4 * DT), (P[i][1] - P[i - 1][1]) / (4 * DT)], v0 = [(P[i - 1][0] - P[i - 2][0]) / (4 * DT), (P[i - 1][1] - P[i - 2][1]) / (4 * DT)]; dv = Math.max(dv, hyp(v1[0] - v0[0], v1[1] - v0[1])); }
    for (let i = 1; i < P.length; i++) { if (!P[i] || !P[i - 1]) continue; const r1 = rootOf(ks[i]), r0 = rootOf(ks[i - 1]); if (!r1 || !r0) continue; snap = Math.max(snap, hyp((P[i][0] - P[i - 1][0]) - (r1[0] - r0[0]), (P[i][1] - P[i - 1][1]) - (r1[1] - r0[1]))); }
    out[nm] = { acc, dv, snap }; } return out; }
if (process.argv[1] && process.argv[1].endsWith("o3_continuity.mjs")) {
  const L = setOf(SET), T = {}, NAMES = ["STAGE 2 → IMPACT", "IMPACT → MAXIMUM PERTURBATION", "MAXIMUM → RECOVERY STEP", "STEP → WEIGHT ACCEPTANCE", "WEIGHT ACCEPTANCE → LOCOMOTION"]; for (const n of NAMES) T[n] = { n: 0, S3: { pelvis: { acc: 0, dv: 0, snap: 0 }, knee: { acc: 0, dv: 0, snap: 0 }, foot: { acc: 0, dv: 0, snap: 0 } }, S2: { pelvis: { acc: 0, dv: 0, snap: 0 }, knee: { acc: 0, dv: 0, snap: 0 }, foot: { acc: 0, dv: 0, snap: 0 } }, worst: null };
  const rows = [];
  for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
    const roots = { S2D: new Map(), S3: new Map() }, R2 = runO3(ENV, tc, "S2D", { record: true, onTick: (W) => roots.S2D.set(W.k, [W.att.stateAt(W.att.t).P.slice(), W.def.stateAt(W.def.t).P.slice()]) }), R3 = runO3(ENV, tc, "S3", { record: true, onTick: (W) => roots.S3.set(W.k, [W.att.stateAt(W.att.t).P.slice(), W.def.stateAt(W.def.t).P.slice()]) }), W3 = R3.W;
    for (const e of W3.imp.episodes) for (const [i, pid, ck] of [[0, "ATT", "a"], [1, "DEF", "d"]]) { const q = e.players[pid]; if (!q) continue;
      // (the transitions' ticks: onset; the largest perturbation velocity; the step planned; its landing; regained)
      let kMax = e.kA, uMax = -1; for (const x of W3.imp.log) { if (x.k < e.kA || (e.t1 != null && x.k * DT > e.t1)) continue; const p = x.p && x.p[i]; if (p && hyp(...p.u) > uMax) { uMax = hyp(...p.u); kMax = x.k; } }
      const ev = W3.imp.events.filter((x) => x.who === pid && x.t >= e.t0 - 1e-9 && (e.t1 == null || x.t <= e.t1 + 1e-9)), st = ev.find((x) => x.kind === "RECOVERY STEP"), ld = ev.find((x) => x.kind === "STEP LANDED"), rg = ev.find((x) => x.kind === "BALANCE REGAINED");
      const at = { [NAMES[0]]: e.kA, [NAMES[1]]: kMax, [NAMES[2]]: st ? st.k : null, [NAMES[3]]: ld ? ld.k : null, [NAMES[4]]: rg ? rg.k : null };
      for (const n of NAMES) { const k = at[n]; if (k == null) continue; const a = win(W3, ck, k, (kk) => (roots.S3.get(kk) || [])[i]), b = win(R2.W, ck, k, (kk) => (roots.S2D.get(kk) || [])[i]); T[n].n++;
        for (const [M, src] of [["S3", a], ["S2", b]]) { const D = T[n][M]; for (const [g, keys] of [["pelvis", ["pelvis"]], ["knee", ["kneeR", "kneeL"]], ["foot", ["footR", "footL"]]]) for (const kk of keys) for (const f of ["acc", "dv", "snap"]) D[g][f] = Math.max(D[g][f], src[kk][f]); }
        const add = a.pelvis.acc - b.pelvis.acc; if (!T[n].worst || add > T[n].worst.add) T[n].worst = { id: tc.id, pid, t: +(k * DT - R3.t0).toFixed(3), add: +add.toFixed(4), s3: +a.pelvis.acc.toFixed(4), s2: +b.pelvis.acc.toFixed(4) };
        rows.push({ id: tc.id, ep: e.n, pid, tr: n, t: +(k * DT - R3.t0).toFixed(3), S3: a, S2: b }); } }
    process.stderr.write("."); }
  const cm = (v) => (v * 100).toFixed(1);
  console.log(`\n§18 CONTINUITY — set ${SET}: the drawn pelvis, knees and feet at 60 Hz, ± 5 frames around each Stage 3 transition, against the same window in STAGE 2`);
  console.log(`${"transition".padEnd(34)}${"n".padStart(5)}  ${"pelvis acc cm/f² S2 → S3".padStart(26)}${"pelvis Δv m/s".padStart(16)}${"pose snap cm".padStart(15)}${"knee acc".padStart(14)}${"foot acc".padStart(14)}  worst added pelvis jolt`);
  for (const n of NAMES) { const x = T[n]; console.log(`${n.padEnd(34)}${String(x.n).padStart(5)}  ${(cm(x.S2.pelvis.acc) + " → " + cm(x.S3.pelvis.acc)).padStart(26)}${(x.S2.pelvis.dv.toFixed(2) + " → " + x.S3.pelvis.dv.toFixed(2)).padStart(16)}${(cm(x.S2.pelvis.snap) + " → " + cm(x.S3.pelvis.snap)).padStart(15)}${(cm(x.S2.knee.acc) + "→" + cm(x.S3.knee.acc)).padStart(14)}${(cm(x.S2.foot.acc) + "→" + cm(x.S3.foot.acc)).padStart(14)}  ${x.worst ? `${x.worst.id} ${x.worst.pid} ${x.worst.t} s: ${cm(x.worst.s2)} → ${cm(x.worst.s3)}` : "—"}`); }
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ set: SET, T, rows }, null, 0));
}
