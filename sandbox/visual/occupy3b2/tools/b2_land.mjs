// occupy3b2/tools/b2_land.mjs — STAGE 3B.2 DIAGNOSIS: every TOUCHDOWN and every PLANTED STANCE of both players, the bodies as drawn.
//   TOUCHDOWNS — each foot's landing (live: the tick its plan first has it planted): the landing leg's drawn shin + boot (+ lower thigh) against the
//     opponent's drawn legs at the touchdown tick and the next 2 ticks (the deepest); the swing before it (lift → land): the deepest that leg went
//     into the opponent's legs (the corridor actually travelled); recovery step or ordinary; committed or not; LANDING SNAP (3B.1's) at it
//   PLANTED STANCES — the drawn ball of the foot's drift (o3_metrics' rule), split into the FEET TIMELINE's own (the canonical target: the plan's
//     stance, its offsets, pivots — present in Stage 2 alike) and the LEG's SHORTFALL (the drawn ankle short of its target: the hips too far for the
//     leg — the body outrunning its planted foot)
//   node b2_land.mjs --set review [--ids a,b] [--modes S3,S3B] [--top 12] [--json f]
import { ENV, setOf, arg, cm } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 as runO3 } from "../b2_run.js";
import { volumesOf, detect } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
const DT = 1 / 240, hyp = Math.hypot, SET = arg("set", "review"), IDS = arg("ids") ? arg("ids").split(",") : null, MODES = arg("modes", "S2D,S3,S3B").split(","), TOP = +arg("top", 12);
const LEGV = /^(THIGH|SHIN|FOOT)_/;
// the deepest penetration of leg X's lower part (shin, boot, the thigh's lower half) into the opponent's legs (thigh / shin / boot)
// (lower: the PLACEMENT's parts — the landing leg's boot and shin against the opponent's legs below his hips (the knee half of the thigh, the
// shin, the boot); the default also counts the landing thigh's lower half against his whole thigh — the bodies' overlap at the landing)
function legPen(Jm, Jo, X, lower = false) { const mine = volumesOf(Jm).filter((v) => v.id === "SHIN_" + X || v.id === "FOOT_" + X || (!lower && v.id === "THIGH_" + X)), theirs = volumesOf(Jo).filter((v) => LEGV.test(v.id));
  let best = { pen: -1, A: null, B: null }; for (const x of detect(mine, theirs, { within: 0.3 })) { if (x.A === "THIGH_" + X && x.uA < 0.5) continue; if (lower && /^THIGH/.test(x.B) && x.uB < 0.5) continue; if (x.pen > best.pen) best = { pen: x.pen, A: x.A, B: x.B }; } return best; }
globalThis.__b2opts = JSON.parse(arg("cfg", "null")) || undefined;
const L = setOf(SET).filter((x) => !IDS || IDS.includes(x.id)), out = {};
for (const m of MODES) out[m] = { td: [], drift: [] };
for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  for (const mode of MODES) { const live = new Map(), wasPl = new Map();
    const R = runO3(ENV, tc, mode, { record: true, onTick: (W) => { const t = W.att.t, k = W.k, LP = W.livePoses(), row = { t, td: [] };
      for (const [key, p, pose] of [["a", W.att, LP.a], ["d", W.def, LP.d]]) { const s = W.ps ? W.ps.get(p) : null; row[key] = { s3: !!(s && s.active), cm: W.committed ? W.committed(p, t) : null, X: {} };
        for (const X of ["R", "L"]) { const st = p.plan.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), f = pose.feet && pose.feet[X], lg = pose.legs && pose.legs[X];
          row[key].X[X] = { planted: !!st, id: st ? st.id : null, pos: st ? st.pos : null, rec: !!(st && /recovery step/.test(st.kind || "")), tgt: f ? f.ank.slice() : null, short: lg ? lg.short : 0, step: s && s.step && !s.step.landed && s.step.X === X };
          const wk = key + X, was = wasPl.get(wk); if (st && !was) row.td.push({ who: key, X, id: st.id, rec: !!(/recovery step/.test(st.kind || "")), kind: st.kind || "", t0: st.t0, cm: row[key].cm, s3: row[key].s3 }); wasPl.set(wk, !!st); } }
      live.set(k, row); } });
    const W = R.W, k0 = Math.round(R.clip[0] / DT), k1 = Math.round(R.clip[1] / DT), O = out[mode], snaps = W.l3 ? W.l3.snaps : [], lastLift = { a: {}, d: {} }, swingMax = { a: {}, d: {} }, land = { a: {}, d: {} };
    for (let k = Math.max(1, k0 - 240); k <= k1; k++) { const F = W.frames.get(k), q = live.get(k); if (!F || !q) continue; const t = k * DT, inClip = k >= k0;
      for (const [ck, ok] of [["a", "d"], ["d", "a"]]) for (const X of ["R", "L"]) { const s = q[ck].X[X];
        // (the swing's corridor actually travelled: the deepest the leg went into the opponent's legs while swinging)
        if (!s.planted) { const pn = legPen(F[ck].J, F[ok].J, X); const m = swingMax[ck][X]; if (!m || pn.pen > m.pen) swingMax[ck][X] = Object.assign({ t }, pn); }
        // (planted: the drawn ball against its first grounded tick, the target ankle's own drift, the leg's shortfall)
        const J = F[ck].J, ball = J["toe_" + X].j, an = J["foot_" + X].j;
        if (!s.planted || ball[2] > 0.05) { land[ck][X] = null; } else if ((!land[ck][X] || land[ck][X].id !== s.id) && s.pos && hyp(an[0] - s.pos[0], an[1] - s.pos[1]) > 0.03) land[ck][X] = null;
        else if (!land[ck][X] || land[ck][X].id !== s.id) land[ck][X] = { id: s.id, p: ball.slice(), tg: s.tgt ? s.tgt.slice() : an.slice(), k, max: null };
        else if (k - land[ck][X].k > 3 && inClip) { const Lx = land[ck][X], d = hyp(ball[0] - Lx.p[0], ball[1] - Lx.p[1]), dT = s.tgt ? hyp(s.tgt[0] - Lx.tg[0], s.tgt[1] - Lx.tg[1]) : 0, sh = s.tgt ? hyp(an[0] - s.tgt[0], an[1] - s.tgt[1]) : 0;
          if (!Lx.max || d > Lx.max.d) Lx.max = { d, dT, sh, short: s.short, t: t - R.t0, rec: s.rec, s3: q[ck].s3, cm: q[ck].cm }; Lx.done = false; } }
      // (touchdowns: the landing leg against the opponent's at the touchdown and the 2 ticks after; the swing that led there)
      for (const e of q.td) { if (!inClip) { swingMax[e.who][e.X] = null; continue; } const ok = e.who === "a" ? "d" : "a"; let worst = { pen: -1 };
        let low = { pen: -1 }; for (let j = 0; j <= 2; j++) { const Fj = W.frames.get(k + j); if (!Fj) continue; const pn = legPen(Fj[e.who].J, Fj[ok].J, e.X), pl = legPen(Fj[e.who].J, Fj[ok].J, e.X, true); if (pn.pen > worst.pen) worst = Object.assign({ j }, pn); if (pl.pen > low.pen) low = pl; }
        const sw = swingMax[e.who][e.X], snap = snaps.find((z) => Math.abs(z.k - k) <= 1 && z.who === (e.who === "a" ? "ATT" : "DEF") && z.X === e.X);
        O.td.push({ id: tc.id, t: +(t - R.t0).toFixed(3), who: e.who === "a" ? "ATT" : "DEF", X: e.X, rec: e.rec, kind: e.kind, cm: e.cm, s3: e.s3, pen: worst.pen, A: worst.A, B: worst.B, low: low.pen, lowA: low.A, lowB: low.B, swing: sw ? sw.pen : -1, swingAt: sw ? +(sw.t - R.t0).toFixed(3) : null, swingB: sw ? sw.B : null, snap: snap ? snap.d : 0 });
        swingMax[e.who][e.X] = null; } }
    for (const ck of ["a", "d"]) for (const X of ["R", "L"]) {} // (stances closed below)
    // (every stance's largest drift, collected from the per-foot trackers as they were replaced — re-walk to gather: simpler to scan again)
    const land2 = { a: {}, d: {} }, mx = new Map();
    for (let k = k0; k <= k1; k++) { const F = W.frames.get(k), q = live.get(k); if (!F || !q) continue;
      for (const ck of ["a", "d"]) for (const X of ["R", "L"]) { const s = q[ck].X[X], J = F[ck].J, ball = J["toe_" + X].j, an = J["foot_" + X].j;
        if (!s.planted || ball[2] > 0.05) { land2[ck][X] = null; continue; } if ((!land2[ck][X] || land2[ck][X].id !== s.id) && s.pos && hyp(an[0] - s.pos[0], an[1] - s.pos[1]) > 0.03) { land2[ck][X] = null; continue; }
        if (!land2[ck][X] || land2[ck][X].id !== s.id) { land2[ck][X] = { id: s.id, p: ball.slice(), tg: s.tgt ? s.tgt.slice() : an.slice(), k }; continue; } if (k - land2[ck][X].k <= 3) continue;
        const Lx = land2[ck][X], d = hyp(ball[0] - Lx.p[0], ball[1] - Lx.p[1]), dT = s.tgt ? hyp(s.tgt[0] - Lx.tg[0], s.tgt[1] - Lx.tg[1]) : 0, sh = s.tgt ? hyp(an[0] - s.tgt[0], an[1] - s.tgt[1]) : 0, key = ck + X + s.id + "@" + Lx.k, o = mx.get(key);
        // (the split: DURING the stance — the tick 2 later still planted on it — and the LIFT-OFF, its last 2 planted ticks: the one-tick jump of the
        // ball when the stance ends, which is how a stance cut short (a re-plan lifting it, a released plant) shows)
        const q2 = live.get(k + 2), s2 = q2 && q2[ck].X[X], interior = !!(s2 && s2.planted && s2.id === s.id), Fp = W.frames.get(k - 1), bp = Fp ? Fp[ck].J["toe_" + X].j : ball, jump = interior ? 0 : hyp(ball[0] - bp[0], ball[1] - bp[1]);
        const rowD = o || { id: tc.id, who: ck === "a" ? "ATT" : "DEF", X, d: 0, dT, sh, short: s.short, t: 0, rec: s.rec, s3: q[ck].s3, cm: q[ck].cm, dIn: 0, jump: 0 };
        if (d > rowD.d) Object.assign(rowD, { d, dT, sh, short: s.short, t: +(k * DT - R.t0).toFixed(3), rec: s.rec, s3: q[ck].s3, cm: q[ck].cm });
        if (interior) rowD.dIn = Math.max(rowD.dIn, d); rowD.jump = Math.max(rowD.jump, jump); mx.set(key, rowD); } }
    O.drift.push(...[...mx.values()].filter((x) => x.d > 0.005));
  }
  process.stderr.write("."); }
console.log(`\nSTAGE 3B.2 DIAGNOSIS — TOUCHDOWNS AND PLANTED STANCES — set ${SET} (${L.length} cases)`);
for (const m of MODES) { const O = out[m], TD = O.td, bad = (x) => x.pen > 0.02, rec = TD.filter((x) => x.rec), ord = TD.filter((x) => !x.rec && !x.cm), com = TD.filter((x) => !x.rec && x.cm);
  console.log(`\n══ ${m} ══  touchdowns ${TD.length} (recovery ${rec.length} · ordinary ${ord.length} · committed ${com.length})`);
  for (const [nm, S] of [["RECOVERY", rec], ["ORDINARY", ord], ["COMMITTED", com]]) console.log(`  ${nm.padEnd(10)} the landing's BOOT / SHIN into his legs below the hip (> 2 cm): ${S.filter((x) => x.low > 0.02).length} / ${S.length} (> 5 cm ${S.filter((x) => x.low > 0.05).length}, deepest ${cm(Math.max(0, ...S.map((x) => x.low)))}) · with the thighs (> 2 cm): ${S.filter(bad).length} · > 5 cm ${S.filter((x) => x.pen > 0.05).length} · deepest ${cm(Math.max(0, ...S.map((x) => x.pen)))} cm · swing THROUGH his legs (> 2 cm) ${S.filter((x) => x.swing > 0.02).length} (> 5 cm ${S.filter((x) => x.swing > 0.05).length}) · landing snaps ${S.filter((x) => x.snap > 0.005).length}`);
  console.log(`  worst landings (boot / shin):`); for (const x of TD.filter((x) => x.low > 0.02).sort((a, b) => b.low - a.low).slice(0, TOP)) console.log(`    ${cm(x.low).padStart(5)} cm  ${x.id.padEnd(22)} t ${x.t.toFixed(3)} ${x.who} ${x.X} ${x.rec ? "RECOVERY" : x.cm ? x.cm : "ordinary"}  ${x.lowA} into ${x.lowB}  (with thighs ${cm(x.pen)} · swing ${cm(Math.max(0, x.swing))} cm)`);
  const D = O.drift, imp = D.filter((x) => x.short > 0.005), mxOf = (S, f) => Math.max(0, ...S.map(f));
  console.log(`  PLANTED STANCES with drift > 0.5 cm: ${D.length} · largest drawn drift ${cm(mxOf(D, (x) => x.d))} cm · the feet timeline's own (target) largest ${cm(mxOf(D, (x) => x.dT))} cm · the LEG SHORT of its target (body outran the foot) largest ${cm(mxOf(D, (x) => x.sh))} cm in ${D.filter((x) => x.sh > 0.01).length} stances (${D.filter((x) => x.sh > 0.01 && x.s3).length} with Stage 3 acting)`);
  const nIn = (c) => D.filter((x) => x.dIn > c).length, nJ = (c) => D.filter((x) => x.jump > c).length;
  console.log(`  SPLIT: DURING the stance > 2 cm ${nIn(0.02)} · > 5 cm ${nIn(0.05)} (largest ${cm(mxOf(D, (x) => x.dIn))}) · a one-tick JUMP of the ball at the LIFT-OFF > 2 cm ${nJ(0.02)} · > 5 cm ${nJ(0.05)} (largest ${cm(mxOf(D, (x) => x.jump))}) · during the stance with Stage 3 acting > 2 cm ${D.filter((x) => x.dIn > 0.02 && x.s3).length}`);
  console.log(`  largest drifts (drawn · target · leg short):`); for (const x of D.sort((a, b) => b.d - a.d).slice(0, TOP)) console.log(`    ${cm(x.d).padStart(5)} · ${cm(x.dT).padStart(5)} · ${cm(x.sh).padStart(5)} cm  ${x.id.padEnd(22)} t ${x.t.toFixed(3)} ${x.who} ${x.X}${x.rec ? " RECOVERY" : ""}${x.s3 ? " S3" : ""}${x.cm ? " " + x.cm : ""}`);
  console.log(`  largest LEG SHORTFALLS:`); for (const x of D.filter((x) => x.sh > 0.01).sort((a, b) => b.sh - a.sh).slice(0, TOP)) console.log(`    ${cm(x.sh).padStart(5)} cm (drawn drift ${cm(x.d)})  ${x.id.padEnd(22)} t ${x.t.toFixed(3)} ${x.who} ${x.X}${x.rec ? " RECOVERY" : ""}${x.s3 ? " S3" : ""}${x.cm ? " " + x.cm : ""}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out));
