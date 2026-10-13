// BALANCE-3 audit (diagnostic, DEV case only — the BALANCE-2 DEV back 6 N·s / 100 ms push, already exposed in C4's DEV run): WHY did the C4
// hip-map repair (H1) worsen overshoot? Push − twin traces for C3 and H1: COM AP (mm), HAT / pelvis / thorax pitch (deg), hip, knee, ankle,
// lumbar angles (deg), and the summed hip / ankle / knee sagittal torques (N·m), every 0.1 s over 6 s. usage: node .../b3_h1_mechanism.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs");
const { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs"), { C4Controller } = await import(RA + "balance2/c4/c4_ctrl.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { Q } = PL, SPEC = PL.SPEC_R();
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, ON = 480, STEPS = ON + 1440, R2D = 180 / Math.PI;
const bi = (n) => SPEC.bodies.findIndex(b => b.name === n), jk = (n) => SPEC.joints.findIndex(j => j.name === n), pitch = (r, i) => { const f = Q.rot(r.S[i].rot, [0, 1, 0]); return Math.atan2(f[0], f[1]) * R2D; };
const hatIds = SPEC.bodies.map((b, i) => i).filter(i => !/thigh|shank|foot/.test(SPEC.bodies[i].name)), tq = (r, k, i) => { const a = (r.act || []).find(x => x[0] === k && x[1] === i); return (a ? a[2] : 0) + r.passive[k][i]; };
const hatPitch = (r) => { let m = 0, x = 0, y = 0; for (const i of hatIds) { const mm = SPEC.bodies[i].mass; m += mm; x += mm * r.S[i].com[0]; y += mm * r.S[i].com[1]; } const hp = [jk("hip_L"), jk("hip_R")]; return { x: x / m, y: y / m }; };
const sys = { C3: () => new C3Controller(J("balance2/c3/params/C3.json")), H1: () => new C4Controller(J("balance2/c4/params/C4.json")) }, out = {};
for (const [nm, mk] of Object.entries(sys)) { const job = (x) => ({ law: "M1B", params: J("balance1/params/B1_BODY.json"), ctrl: mk, steps: STEPS, ...x }), a = await runOne(job({})), b = await runOne(job({ perturb: BT.pushJob("back", 6, ON, 24) }));
  const tr = []; for (let q = ON; q < STEPS; q += 24) { const A = a.recs[q], Bq = b.recs[q], d = (f) => +(f(Bq) - f(A)).toFixed(3), sum2 = (n1, n2, i) => (r) => tq(r, jk(n1), i) + tq(r, jk(n2), i), ang = (n, i) => (r) => r.chars.runner.th[jk(n)][i] * R2D;
    tr.push({ t: +((q - ON) / 240).toFixed(1), comMm: d(r => r.chars.runner.com[0] * 1000), pelvisDeg: d(r => pitch(r, bi("pelvis"))), thoraxDeg: d(r => pitch(r, bi("thorax"))), shankDeg: d(r => pitch(r, bi("shank_L"))), thighDeg: d(r => pitch(r, bi("thigh_L"))),
      hipDeg: d(ang("hip_L", 1)), kneeDeg: d(ang("knee_L", 1)), ankleDeg: d(ang("ankle_L", 1)), lumbarDeg: d(ang("lumbar", 1)), hipNm: d(sum2("hip_L", "hip_R", 1)), ankleNm: d(sum2("ankle_L", "ankle_R", 1)), kneeNm: d(sum2("knee_L", "knee_R", 1)) }); }
  out[nm] = tr; }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
for (const t of [0.3, 0.6, 1, 1.5, 2, 2.5, 3, 4, 5, 5.9]) { const r3 = out.C3.find(x => x.t === t), r1 = out.H1.find(x => x.t === t); console.log(`t ${t}  C3: com ${r3.comMm} pel ${r3.pelvisDeg} tho ${r3.thoraxDeg} hip ${r3.hipDeg} knee ${r3.kneeDeg} | H1: com ${r1.comMm} pel ${r1.pelvisDeg} tho ${r1.thoraxDeg} hip ${r1.hipDeg} knee ${r1.kneeDeg} hipNm ${r1.hipNm} ankNm ${r1.ankleNm}`); }
