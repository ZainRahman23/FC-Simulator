// BALANCE-3 body audit (read-only, entry body schema): for each sagittal joint group of the upper body and the legs — HAT about the hips, trunk
// about the lumbar joint, upper trunk about the thoracic joint, head about the neck, and the whole body about the ankles — the GRAVITATIONAL
// stiffness of the supported mass (pivot-fixed rotation, statics; N·m/rad, both sides summed) against the body's INTRINSIC stiffness at entry
// (M1b short-range stiffness of the developed entry forces, kP·f⁺·c⁺ + kM·f⁻·c⁻, plus passive B), and the net stiffness the frozen C3 objective
// adds (kP · its gravity-load map × lever). usage (worktree root): node .../b3_stiffness_audit.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), SPEC = PL.SPEC_R(), V = PL.V, ST = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), { unitStates } = await import(PL.P2 + "core/v2_math.js"), MG = await import(PL.P2 + "spec/v2_muscles.js");
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, D2R = Math.PI / 180;
let C = null; class Cap extends C3Controller { attach(b, p, c) { super.attach(b, p, c); C = this; this.cc = c; this.bb = b; } }
await runOne({ law: "M1B", params: J("balance1/params/B1_BODY.json"), ctrl: () => new Cap(J("balance2/c3/params/C3.json")), steps: 1 });
const c = C.cc, su = unitStates(c.st), ja = (k) => c.ctrl.jointAt(su, k), t0 = ST.staticsG(c, su, [0, -9.81, 0]).tff, out = {};
const Ksrs = (k, i) => { const r = C.bb.ax.find(a => a.k === k).rows[i], m = c.act.mx[k][i]; return m.d.kP * r.u0[0] * m.d.cP + m.d.kM * r.u0[1] * m.d.cM; };
const flexI = (k) => c.act.ax[k].findIndex(x => x && x.key === "flex"), dfI = (k) => c.act.ax[k].findIndex(x => x && x.key === "df");
const PB = (k, key) => { const fam = SPEC.joints[k].name.replace(/_[LR]$/, ""), pb = MG.PASSIVE_B[`${fam}.${key}`]; return pb ? pb.k : 0; };
const group = (name, joints, bodies, pivot, axisI) => { const ang = 1e-3, s2 = ST.rotateBodies(su, bodies, pivot, [0, 0, 1], ang), t2 = ST.staticsG(c, s2, [0, -9.81, 0]).tff;
  const grav = joints.reduce((s, k) => s + Math.abs((t2[k][axisI(k)] - t0[k][axisI(k)]) / ang), 0), intr = joints.reduce((s, k) => s + Ksrs(k, axisI(k)), 0), pas = joints.reduce((s, k) => s + PB(k, c.act.ax[k][axisI(k)].key), 0);
  let m = 0; for (const i of bodies) m += SPEC.bodies[i].mass; return { joints: joints.map(k => SPEC.joints[k].name), massKg: +m.toFixed(2), gravityNmPerRad: +grav.toFixed(1), intrinsicSRSNmPerRad: +intr.toFixed(1), passiveBNmPerRad: pas, intrinsicOverGravity: +((intr + pas) / grav).toFixed(3) }; };
const g = C.grp; out.hatAtHips = group("hat", g.hat.joints, g.hat.bodies, V.sc(V.add(ja(C.J.hipL), ja(C.J.hipR)), 0.5), flexI);
out.trunkAtLumbar = group("trunk", g.trunk.joints, g.trunk.bodies, ja(C.J.lumbar), flexI); out.upperAtThoracic = group("upper", g.upper.joints, g.upper.bodies, ja(C.J.thoracic), flexI); out.headAtNeck = group("head", g.head.joints, g.head.bodies, ja(C.J.neck), flexI);
const notFeet = SPEC.bodies.map((b, i) => i).filter(i => !/foot/.test(SPEC.bodies[i].name)); out.bodyAtAnkles = group("body", [C.J.ankL, C.J.ankR], notFeet, V.sc(V.add(ja(C.J.ankL), ja(C.J.ankR)), 0.5), dfI);
out.c3Objectives = { comKP: 1.33, orientationKP: 1.3, note: "C3 active stiffness on each correctly-mapped group ≈ kP × its gravity-load stiffness (trunk / upper / head); the HAT-at-hips AP map is ≈ 0 (defect), so the hips get no orientation stiffness; the COM objective adds its own ankle/knee/hip pattern" };
for (const [k, v] of Object.entries(out)) if (v.gravityNmPerRad) v.netWithC3OverGravity = +((v.intrinsicSRSNmPerRad + v.passiveBNmPerRad) / v.gravityNmPerRad + (k === "hatAtHips" ? 0 : (k === "bodyAtAnkles" ? 1.33 : 1.3)) - 1).toFixed(3);
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
