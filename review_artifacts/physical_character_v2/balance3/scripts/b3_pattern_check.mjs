// BALANCE-3 body-model check (diagnostic identification, not tuning): does the two-segment reduction (b3_sagittal_model.mjs) predict the full
// V2 body's response to torque PATTERNS? OPEN LOOP (deafferented replay, so feedback cannot confound the mechanics): the frozen C3 (noise off) runs
// the undisturbed twin and logs its commands; each test replays exactly those commands plus an additive intent pulse (through the canonical M1b
// excitation path, like any controller output) of 200 ms from step 480: (a) hip only, (b) ankle only, (c) the COM-neutral pattern τa = k·τh,
// (d) the hip-mode modal pattern; both hips / ankles equally; τa > 0 rotates the legs forward (opposite to the COM map's restoring ankle rows), τh > 0 pitches the HAT forward
// (verified on the body: the pelvis pitches forward). Reports the push − twin COM and HAT-pitch
// excursions over 0.4 s. usage (worktree root): node .../b3_pattern_check.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { Q } = PL, SPEC = PL.SPEC_R(), J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const SM = J("balance3/evidence/B3_SAGITTAL_MODEL.json"), P = { ...J("balance2/c3/params/C3.json") }; P.noise = { ...P.noise, cv: 0 };
const ON = 480, DUR = 48, jk = (n) => SPEC.joints.findIndex(j => j.name === n), PEL = SPEC.bodies.findIndex(b => b.name === "pelvis"), THO = SPEC.bodies.findIndex(b => b.name === "thorax");
const ST = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), { unitStates } = await import(PL.P2 + "core/v2_math.js"), V = PL.V;
let TWIN = null; // the twin's logged commands (flattened per step)
class Pulse extends C3Controller { constructor(p, ta, th, replay) { super(p); this.ta = ta; this.th = th; this.replay = replay; }
  attach(b, p, c) { super.attach(b, p, c); const g = this.grp.hat, su = unitStates(c.st), ja = (k) => c.ctrl.jointAt(su, k), piv = V.sc(V.add(ja(this.J.hipL), ja(this.J.hipR)), 0.5);
    // the pivot-fixed HAT map (b2_ctrl.mjs option, recomputed read-only): +z rotation of the HAT about the hip axis = BACKWARD pitch (x → −x above the pivot)
    const t0 = ST.staticsG(c, su, [0, -9.81, 0]).tff, s2 = ST.rotateBodies(su, g.bodies, piv, [0, 0, 1], 1e-3), t2 = ST.staticsG(c, s2, [0, -9.81, 0]).tff;
    this.hipDir = g.joints.map(k => { const i = this.ax[k].findIndex(x => x && x.key === "flex"); return { k, i, jx: t2[k][i] - t0[k][i] }; }); }
  step(n, st, ev) { let out; if (this.replay) { const f = TWIN[n]; out = this.c.spec.joints.map((_, k) => [f[3 * k], f[3 * k + 1], f[3 * k + 2]]); } else out = super.step(n, st, ev);
    if (n >= ON && n < ON + DUR && (this.ta || this.th)) {
      for (const k of [this.J.ankL, this.J.ankR]) { const i = this.ankI[k === this.J.ankL ? 0 : 1], jf = this.Jf[k][i][0]; out[k][i] += -Math.sign(jf) * this.ta / 2; }
      for (const r of this.hipDir) out[r.k][r.i] += Math.sign(r.jx) * this.th / 2; }   // +τh: forward HAT pitch (opposite to the static torque change of a backward rotation)
    return out; } }
const k = SM.comNeutral.tauAnklePerTauHip, hm = SM.modes.hip.modal, A0 = 10; // 10 N·m reference amplitude
const cases = { hipOnly: [0, A0], ankleOnly: [A0, 0], comNeutral: [k * A0, A0], hipModal: [(hm.tauAnkle / hm.tauHip) * A0, A0] }; // hip modal pattern scaled to τh = +A0
const pitch = (r, i) => { const f = Q.rot(r.S[i].rot, [0, 1, 0]); return Math.atan2(f[0], f[1]) * 180 / Math.PI; };
let tw = null; const base = await runOne({ law: "M1B", params: J("balance1/params/B1_BODY.json"), ctrl: () => (tw = new Pulse(P, 0, 0, false)), steps: ON + 120 }); TWIN = {}; tw.log.n.forEach((n, q) => { TWIN[n] = tw.log.cmd[q]; });
const rb = await runOne({ law: "M1B", params: J("balance1/params/B1_BODY.json"), ctrl: () => new Pulse(P, 0, 0, true), steps: ON + 120 }), out = { amplitudeNm: A0, k, replayIdentity: rb.finalHash === base.finalHash, cases: {} }; console.log("replay identity (no pulse):", out.replayIdentity);
for (const [nm, [ta, th]] of Object.entries(cases)) { const o = await runOne({ law: "M1B", params: J("balance1/params/B1_BODY.json"), ctrl: () => new Pulse(P, ta, th, true), steps: ON + 120 });
  const tr = []; for (const ms of [50, 100, 150, 200, 300, 400]) { const q = ON + Math.round(ms * 0.24) - 1, a = base.recs[q], b = o.recs[q]; tr.push({ ms, comMm: +((b.chars.runner.com[0] - a.chars.runner.com[0]) * 1000).toFixed(2), pelvisPitchDeg: +(pitch(b, PEL) - pitch(a, PEL)).toFixed(3), thoraxPitchDeg: +(pitch(b, THO) - pitch(a, THO)).toFixed(3) }); }
  out.cases[nm] = { tauAnkleNm: +ta.toFixed(2), tauHipNm: th, trace: tr }; console.log(nm.padEnd(11), "τa", ta.toFixed(2), "τh", th, tr.map(t => `${t.ms}ms COM ${t.comMm} pel ${t.pelvisPitchDeg}° tho ${t.thoraxPitchDeg}°`).join(" | ")); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));