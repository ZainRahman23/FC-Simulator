// dribble1/tools/d1_envelope.mjs — the FEASIBLE TOUCH ENVELOPE of the frozen TURN-1.2 gait: for a straight run at speed v, for each late-swing phase w
// of one swing, every ball centre position (forward / lateral of the COM, on the turf) that the swing foot can meet with a bounded free-leg adjustment
// (the resolver's own contactGeom: any region, any contact elevation), and the boot's speed there. usage: node d1_envelope.mjs [v] [F]
import { makeSim, DT, D1 } from "./d1_env.mjs";
const v = +(process.argv[2] || 5.5), F = process.argv[3] || "R";
const S = makeSim({ id: "ENV", init: { v, heading: 0, pos: [10, 34] }, cmds: [], dur: 3, ball: { ahead: 30, speed: 0 } }, {});
for (let i = 0; i < 240 && !S.fault; i++) S.step();                                      // settle into the cycle
const pred = S.predictLoco(S.k, S.input, 240), rows = [];
let swing = null;
for (let j = 0; j < pred.length - 1; j++) {
  const p = pred[j], L = p.legs[F]; if (L.stance || !p.bones || L.w < 0.55) continue; if (swing == null) swing = L.swing; if (L.swing !== swing) break;
  const com = [p.P[0], 0, -p.P[1]], vb0 = S.bootVel(pred, j, F, p.bones["toe_" + F].p);
  const feas = []; let vbN = [];
  for (let fx = 0.2; fx <= 1.2001; fx += 0.04) for (let lx = -0.30; lx <= 0.30001; lx += 0.04) {
    const ball = [com[0] + fx, 0.11, com[2] - lx], nL = [1, 0, 0]; let ok = null;
    for (const reg of (process.env.REGS || "LACES,INSIDE,OUTSIDE,FRONT").split(",")) { for (const e of D1.elevs) { const g = S.contactGeom(p, F, reg, nL, ball, [0, 0, 0], e * Math.PI / 180); if (g) { const vb = S.bootVel(pred, j, F, g.cW); ok = { reg, e, vn: vb ? vb[0] * Math.cos(e * Math.PI / 180) : 0 }; break; } } if (ok) break; }
    if (ok) { feas.push([+fx.toFixed(2), +lx.toFixed(2), ok.reg[0], ok.e]); vbN.push(ok.vn); }
  }
  const fxs = feas.map(q => q[0]), lxs = feas.map(q => q[1]);
  rows.push({ t: (p.k * DT).toFixed(3), w: L.w.toFixed(2), n: feas.length, fwd: fxs.length ? `${Math.min(...fxs).toFixed(2)}..${Math.max(...fxs).toFixed(2)}` : "-", lat: lxs.length ? `${Math.min(...lxs).toFixed(2)}..${Math.max(...lxs).toFixed(2)}` : "-",
    regions: [...new Set(feas.map(q => q[2]))].join(""), vBoot: vbN.length ? `${Math.min(...vbN).toFixed(1)}..${Math.max(...vbN).toFixed(1)}` : "-", toeAhead: (p.bones["toe_" + F].p[0] - com[0]).toFixed(2), vToe: vb0 ? vb0[0].toFixed(1) : "-" });
}
console.log(`ENVELOPE v ${v} foot ${F} (COM-relative ball centre; lateral + = right of travel)`); console.table(rows);
