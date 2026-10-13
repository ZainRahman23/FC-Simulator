// BALANCE-3 pre-freeze sign / construction check (no B3 performance run). (1) On the frozen C3 in open-loop replay (as b3_identify.mjs), a 200 ms
// forward-trunk hip pulse: does the controller's own sensed anatomical hip angle (the B3 H-mode coordinate) INCREASE when the trunk rotates forward
// about the hips (flexSign = +1)? (2) B3 constructed at the entry for one step: its entry constants (G_H, per-hip trunk-forward signs, ankle
// legs-forward signs) against the BALANCE-3 audit, and the sign of its H-mode law for a synthetic +1° hip-angle deviation (expected: trunk-backward hip
// torque, legs-backward... i.e. both negative in their forward conventions). usage (worktree root): node .../b3_signcheck.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs"), { B3Controller } = await import(RA + "balance3/b3/b3_ctrl.mjs");
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SPEC = PL.SPEC_R(), ST = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), { unitStates, unitEv } = await import(PL.P2 + "core/v2_math.js");
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, body = J("balance1/params/B1_BODY.json");
const P = { ...J("balance2/c3/params/C3.json") }; P.noise = { ...P.noise, cv: 0 }; const ON = 480, out = {};
let TWIN = null;
class Probe extends C3Controller { constructor(p, pulse, replay) { super(p); this.pulse = pulse; this.replay = replay; this.hipAng = {}; }
  attach(b, p, c) { super.attach(b, p, c); const su = unitStates(c.st), g = this.grp.hat, ja = (k) => c.ctrl.jointAt(su, k), piv = V.sc(V.add(ja(this.J.hipL), ja(this.J.hipR)), 0.5);
    const t0 = ST.staticsG(c, su, [0, -9.81, 0]).tff, s2 = ST.rotateBodies(su, g.bodies, piv, [0, 0, 1], 1e-3), t2 = ST.staticsG(c, s2, [0, -9.81, 0]).tff;
    this.hips = g.joints.map(k => { const i = this.ax[k].findIndex(x => x && x.key === "flex"); return { k, i, fwd: Math.sign(t2[k][i] - t0[k][i]) }; }); }
  step(n, st, ev) { const smp = this._sample(unitStates(st), unitEv(ev)); this.hipAng[n] = this.hips.map(r => smp.ang[r.k][r.i]);
    let o; if (this.replay) { const f = TWIN[n]; o = this.c.spec.joints.map((_, k) => [f[3 * k], f[3 * k + 1], f[3 * k + 2]]); } else o = super.step(n, st, ev);
    if (this.pulse && n >= ON && n < ON + 48) for (const r of this.hips) o[r.k][r.i] += r.fwd * 5 / 2; return o; } }
let tw = null; await runOne({ law: "M1B", params: body, ctrl: () => (tw = new Probe(P, false, false)), steps: ON + 120 }); TWIN = {}; tw.log.n.forEach((n, q) => { TWIN[n] = tw.log.cmd[q]; });
let pr = null; await runOne({ law: "M1B", params: body, ctrl: () => (pr = new Probe(P, true, true)), steps: ON + 120 });
const q = ON + 95; out.sensedHipAngleDeltaDegAt400ms = pr.hipAng[q].map((v, j) => +(v - tw.hipAng[q][j]).toFixed(4)); out.flexSignVerified = out.sensedHipAngleDeltaDegAt400ms.every(x => x > 0) ? 1 : -1;
let B = null; await runOne({ law: "M1B", params: body, ctrl: () => (B = new B3Controller(J("balance3/b3/params/B3.json"))), steps: 1 });
const hm = B.hm; out.entry = { GH: +hm.GH.toFixed(2), hipFwd: hm.hips.map(r => r.fwd), probeHipFwd: tw.hips.map(r => r.fwd), ankleFwd: hm.ankles.map(r => r.fwd), K: +hm.K.toFixed(2), D: +hm.D.toFixed(2), c: hm.c, flexSign: hm.flexSign };
// synthetic H-mode law evaluation (no dynamics): +1° hip angle, zero rate
const tH = -(hm.K * hm.flexSign * (1 * Math.PI / 180)), tA = hm.c * tH; out.synthetic1deg = { tauTrunkForwardNm: +tH.toFixed(3), tauLegsForwardNm: +tA.toFixed(3) };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
