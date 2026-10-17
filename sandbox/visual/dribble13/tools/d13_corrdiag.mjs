// dribble13/tools/d13_corrdiag.mjs — WHERE THE CUT CONTACT CORRIDORS ARE vs WHERE THE BALL IS, at a cut request. The run is stopped at the request;
// from that exact state TURN-1.2 is predicted (a) on the held line and (b) with the cut released at switch ticks kS (now … +0.4 s). In each motion,
// for every swing tick of the next second (path phases with the warp), every surface and launch directions toward the cut (cut, cut − 10°, − 20°,
// − 30°, relative to the pre-cut heading), the corridor of feasible ball-centre positions is computed; reported: the best corridor per foot /
// surface / direction (largest margin), its time and centre in the pre-cut heading frame (forward / lateral of the COM), the boot's closing speed,
// and the free ball at that tick: its own position and its margin (> 0: the ball is already in the corridor; < 0: by how much it misses).
// usage: node d13_corrdiag.mjs SCENARIO seed [tReq 2.2] [ver d12]
import { makeSim, DT, CORES, D1 } from "./d13_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id = "CUT60_RUN", seedA = "1", tReqA, ver = "d13"] = process.argv.slice(2), scn = get(id), D = 180 / Math.PI;
const cmd = (scn.cmds || []).find((c) => c.turn != null && Math.abs(c.turn) > 8), tReq = tReqA != null ? +tReqA : cmd.t, cutDeg = cmd.turn;
const S = makeSim(scn, { ver, seed: +seedA, opts: { record: false } }); S.run(tReq + DT / 2);
const k0 = S.k, th0 = 0, f0 = [Math.cos(th0), 0, -Math.sin(th0)], r0 = [-Math.sin(th0), 0, -Math.cos(th0)], ballMap = S.predictBall(k0, 360);
const K = (a) => [a[0], a[1], -a[2]], fr = (p, P) => { const d = [p[0] - P[0], 0, p[2] + P[1]]; return [d[0] * f0[0] + d[2] * f0[2], d[0] * r0[0] + d[2] * r0[2]]; };
const inpHeld = S.input, inpCut = { dir: cutDeg / D, v: S.input.v };
console.log(`${id} seed ${seedA} · request ${cutDeg}° at ${tReq} s (k ${k0}) · input ${(inpHeld.dir * D).toFixed(1)}° ${inpHeld.v} m/s · held ${!!S.held} · legs ${["R", "L"].map((F) => F + (S.A.legs[F].stance ? " stance" : " w" + (S.A.legs[F].w || 0).toFixed(2))).join(" ")}`);
const b0 = K(S.W.ball.p); { const c = fr(b0, S.A.P); console.log(`ball now: fwd ${c[0].toFixed(2)} lat ${c[1].toFixed(2)} speed ${Math.hypot(S.W.ball.v[0], S.W.ball.v[2]).toFixed(2)} m/s`); }
const branches = [{ tag: "held", kS: null }]; for (let d = 1; d <= 97; d += 12) branches.push({ tag: "rel+" + ((d - 1) * DT).toFixed(2), kS: k0 + d });
const regs = ["INSIDE", "OUTSIDE", "FRONT", "LACES"], dirs = [0, -10, -20, -30], elevs = [0, 10, 20, 30, 38];
for (const B of branches) {
  const tr = B.kS == null ? S.viewFor(k0, 300).track : new (S.viewFor(k0, 1).track.constructor)(S, k0, S.A, inpHeld, inpCut, B.kS, null);
  const at = (kk) => tr.at(kk), best = new Map();
  for (let kk = k0 + 1; kk <= k0 + 240; kk++) {
    const smp = at(kk), bk = ballMap.get(kk); if (!bk) break; const ball = K(bk.p), vBall = K(bk.v);
    for (const F of ["R", "L"]) { const L = smp.legs[F]; if (L.stance || L.w < D1.wLo || L.w > D1.wHi) continue;
      for (let dB = 0; dB <= 36; dB += 12) { const sp = at(kk - dB); if (!sp || kk - dB <= k0 || !sp.bones || sp.legs[F].stance || sp.legs[F].swing !== L.swing) break;
        const gs = { bones: sp.bones, psi: smp.psi, legs: smp.legs, k: smp.k, P: smp.P };
        for (const reg of regs) for (const dd of dirs) { const th = (Math.sign(cutDeg) * (Math.abs(cutDeg) + dd)) / D, nH = [Math.cos(th), 0, -Math.sin(th)];
          for (const e of elevs) { const c = S.corridor(gs, F, reg, nH, e / D); if (c.why) continue;
            const mb = S.corridorMargin(c, ball), key = F + ":" + reg + ":" + (Math.abs(cutDeg) + dd), cur = best.get(key);
            // closing along the launch: the boot point's path velocity (no warp) minus the ball's
            const nx = tr.at(kk - dB + 1), vb = nx && nx.bones ? (() => { const fa = sp.bones["foot_" + F], fb = nx.bones["foot_" + F], la = [0, 1, 2].map((i) => c.cW[i] - fa.p[i]); const lr = [fa.R[0] * la[0] + fa.R[3] * la[1] + fa.R[6] * la[2], fa.R[1] * la[0] + fa.R[4] * la[1] + fa.R[7] * la[2], fa.R[2] * la[0] + fa.R[5] * la[1] + fa.R[8] * la[2]]; const pb = [0, 1, 2].map((i) => fb.p[i] + fb.R[i * 3] * lr[0] + fb.R[i * 3 + 1] * lr[1] + fb.R[i * 3 + 2] * lr[2]); return pb.map((x, i) => (x - c.cW[i]) / DT); })() : null;
            const close = vb ? (vb[0] - vBall[0]) * c.n[0] + (vb[2] - vBall[2]) * c.n[2] : null;
            const rec = { t: +((kk - k0) * DT).toFixed(3), dB, e, m: c.margin, mb, cen: fr(c.center, smp.P), ballRel: fr(ball, smp.P), close, w: +L.w.toFixed(2) };
            if (!cur || mb > cur.ballBest.mb) best.set(key, Object.assign(cur || {}, { ballBest: rec, n: (cur ? cur.n : 0) + 1, first: cur ? cur.first : rec, wide: cur && cur.wide.m > c.margin ? cur.wide : rec }));
            else { cur.n++; if (c.margin > cur.wide.m) cur.wide = rec; } } } } } }
  const man = tr.C.man ? `${tr.C.man.kind}/${tr.C.man.tech} plant ${tr.C.man.plantFoot}` : "";
  console.log(`\n── ${B.tag} ${man}`);
  const rows = [...best.entries()].filter(([k]) => !k.includes("FRONT") && !k.includes("LACES") || true).sort((a, b) => b[1].ballBest.mb - a[1].ballBest.mb);
  for (const [k, v] of rows.slice(0, 14)) { const bb = v.ballBest, wd = v.wide;
    console.log(`  ${k.padEnd(18)} n ${String(v.n).padStart(4)} · first +${v.first.t.toFixed(2)} · widest +${wd.t.toFixed(2)} m ${(wd.m * 100).toFixed(1)}cm at fwd ${wd.cen[0].toFixed(2)} lat ${wd.cen[1].toFixed(2)} (ball fwd ${wd.ballRel[0].toFixed(2)} lat ${wd.ballRel[1].toFixed(2)}) · ball best margin ${(bb.mb * 100).toFixed(1)}cm @+${bb.t.toFixed(2)} close ${bb.close != null ? bb.close.toFixed(1) : "-"}`); }
}
