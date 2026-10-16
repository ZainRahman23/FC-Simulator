// dribble1/tools/d1_batch.mjs — run many seeds of a straight dribble and classify every LOSS (first unplanned own-body contact or overrun):
// the relative ball state, both feet's swing phase, the last planning pass's rejection profile. usage: node d1_batch.mjs v seeds dur [arch] [prof]
import { makeSim, DT, PROFILES } from "./d1_env.mjs";
const v = +(process.argv[2] || 5.5), N = +(process.argv[3] || 8), dur = +(process.argv[4] || 12), arch = process.argv[5] || "B", prof = PROFILES[process.argv[6] || "HIGH"];
const out = [];
for (let seed = 1; seed <= N; seed++) {
  const scn = { id: "STRAIGHT", init: { v, heading: 0, pos: [10, 34] }, cmds: [], dur, ball: { ahead: +(process.env.AHEAD || 1.4), speed: v * +(process.env.BSP || 0.55) } };
  const S = makeSim(scn, { seed, arch, player: prof, opts: { noError: !!process.env.NOERR, errScale: process.env.ERRK ? +process.env.ERRK : undefined } });
  let lastRej = null, loss = null; const orig = S.makePlan.bind(S); S.makePlan = (k) => { S.rej = {}; orig(k); lastRej = { k, plan: !!S.plan, rej: Object.fromEntries(Object.entries(S.rej).filter(([a]) => !["samples", "win", "fdbg"].includes(a))) }; };
  while (S.k * DT < dur && !S.fault) { S.step(); if (!loss) { const c = S.contacts.find(c => c.own && !(S.lastTouch && c.k - S.lastTouch.k <= 3));
      const b = S.W.ball, dx = b.p[0] - S.A.P[0], dy = b.p[2] - S.A.P[1], f = dx * Math.cos(S.A.psi) + dy * Math.sin(S.A.psi), l = -dx * Math.sin(S.A.psi) + dy * Math.cos(S.A.psi);
      if (c || f < -0.3) { loss = { t: +(S.k * DT).toFixed(3), why: c ? "contact " + c.part : "overrun", f: +f.toFixed(2), l: +l.toFixed(2), vb: +Math.hypot(b.v[0], b.v[2]).toFixed(2), wR: S.A.legs.R.stance ? "st" : +(S.A.legs.R.w).toFixed(2), wL: S.A.legs.L.stance ? "st" : +(S.A.legs.L.w).toFixed(2), last: lastRej }; break; } } }
  const T = S.touches.filter(t => t.launched);
  out.push({ seed, jumps: (S.jumps || []).length, touches: T.length, untilLoss: loss ? loss.t : dur, loss: loss ? `${loss.why} @${loss.t} f${loss.f} l${loss.l} vb${loss.vb} wR${loss.wR} wL${loss.wL}` : "none", rej: loss && loss.last ? JSON.stringify(loss.last.rej).slice(0, 220) : "" });
}
for (const o of out) console.log(`seed ${o.seed} jumps ${o.jumps} touches ${o.touches} until ${o.untilLoss} ${o.loss}\n     ${o.rej}`);
console.log("mean time to loss", (out.reduce((a, o) => a + o.untilLoss, 0) / out.length).toFixed(2), "s; mean touches", (out.reduce((a, o) => a + o.touches, 0) / out.length).toFixed(1));
