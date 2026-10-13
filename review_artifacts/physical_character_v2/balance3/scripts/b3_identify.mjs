// BALANCE-3 open-loop identification (deafferented replay of the frozen C3 twin's own commands, noise off; identity-checked): the body's response
// to a 200 ms, 5 N·m-per-joint-pair intent pulse at the ankles, knees, hips, lumbar and thoracic joints (sagittal; both sides equally; sign: the
// direction that rotates the distal / upper part FORWARD, from each joint's own gravity-load sign at entry). Responses (push − twin) at 0.1 … 0.6 s:
// COM AP (mm), HAT-composite pitch about the hips, pelvis / abdomen / thorax / thigh / shank pitch in space (deg). usage: node ... --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { Q, V } = PL, SPEC = PL.SPEC_R(), ST = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), { unitStates } = await import(PL.P2 + "core/v2_math.js");
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, R2D = 180 / Math.PI;
const P = { ...J("balance2/c3/params/C3.json") }; P.noise = { ...P.noise, cv: 0 }; const ON = 480, DUR = 48, AMP = 5;
const jk = (n) => SPEC.joints.findIndex(j => j.name === n), bi = (n) => SPEC.bodies.findIndex(b => b.name === n), hatIds = SPEC.bodies.map((b, i) => i).filter(i => !/thigh|shank|foot/.test(SPEC.bodies[i].name));
const PAIRS = { ankle: ["ankle_L", "ankle_R"], knee: ["knee_L", "knee_R"], hip: ["hip_L", "hip_R"], lumbar: ["lumbar"], thoracic: ["thoracic"] };
let TWIN = null;
class Probe extends C3Controller { constructor(p, which, replay) { super(p); this.which = which; this.replay = replay; }
  attach(b, p, c) { super.attach(b, p, c); const su = unitStates(c.st), t0 = ST.staticsG(c, su, [0, -9.81, 0]).tff; this.dir = {};
    // forward direction per joint: rotate the subtree distal to the joint (for the ankle: everything but the feet, about the ankle) by −z (forward pitch),
    // and take the sign of the resulting static torque change: a FORWARD-rotating intent is the opposite of that restoring change
    const kids = SPEC.bodies.map(() => []); SPEC.bodies.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
    for (const [nm, js] of Object.entries(PAIRS)) this.dir[nm] = js.map(n => { const k = jk(n), j = SPEC.joints[k], i = c.act.ax[k].findIndex(x => x && (x.key === "flex" || x.key === "df")), piv = c.ctrl.jointAt(su, k);
      const bodies = nm === "ankle" ? SPEC.bodies.map((b, q) => q).filter(q => !/foot/.test(SPEC.bodies[q].name)) : sub(j.childIndex), s2 = ST.rotateBodies(su, bodies, piv, [0, 0, 1], -1e-3), t2 = ST.staticsG(c, s2, [0, -9.81, 0]).tff;
      return { k, i, s: -Math.sign(t2[k][i] - t0[k][i]) }; }); }
  step(n, st, ev) { let out; if (this.replay) { const f = TWIN[n]; out = this.c.spec.joints.map((_, k) => [f[3 * k], f[3 * k + 1], f[3 * k + 2]]); } else out = super.step(n, st, ev);
    if (this.which && n >= ON && n < ON + DUR) for (const r of this.dir[this.which]) out[r.k][r.i] += r.s * AMP / this.dir[this.which].length; return out; } }
const pitch = (r, i) => { const f = Q.rot(r.S[i].rot, [0, 1, 0]); return Math.atan2(f[0], f[1]) * R2D; };
const hatP = (r) => { let m = 0, x = 0, y = 0; for (const i of hatIds) { const mm = SPEC.bodies[i].mass; m += mm; x += mm * r.S[i].com[0]; y += mm * r.S[i].com[1]; } const a = SPEC.joints[jk("hip_L")].childIndex, b = SPEC.joints[jk("hip_R")].childIndex; return Math.atan2(x / m - (r.S[a].pos[0] + r.S[b].pos[0]) / 2, y / m - (r.S[a].pos[1] + r.S[b].pos[1]) / 2) * R2D; };
const body = J("balance1/params/B1_BODY.json"); let tw = null; const base = await runOne({ law: "M1B", params: body, ctrl: () => (tw = new Probe(P, null, false)), steps: ON + 160 }); TWIN = {}; tw.log.n.forEach((n, q) => { TWIN[n] = tw.log.cmd[q]; });
const out = { ampNmPerPair: AMP, pulseMs: DUR / 0.24, responses: {} };
for (const w of Object.keys(PAIRS)) { const o = await runOne({ law: "M1B", params: body, ctrl: () => new Probe(P, w, true), steps: ON + 160 }), rows = [];
  for (const ms of [100, 200, 300, 400, 500, 600]) { const q = ON + Math.round(ms * 0.24) - 1, a = base.recs[q], b = o.recs[q], dp = (n) => +(pitch(b, bi(n)) - pitch(a, bi(n))).toFixed(3);
    rows.push({ ms, comMm: +((b.chars.runner.com[0] - a.chars.runner.com[0]) * 1000).toFixed(3), hatDeg: +(hatP(b) - hatP(a)).toFixed(3), pelvis: dp("pelvis"), abdomen: dp("abdomen"), thorax: dp("thorax"), thigh: dp("thigh_L"), shank: dp("shank_L") }); }
  out.responses[w] = rows; const r4 = rows[3]; console.log(w.padEnd(9), JSON.stringify(r4)); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
