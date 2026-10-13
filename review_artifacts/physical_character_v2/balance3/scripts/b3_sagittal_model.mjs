// BALANCE-3 body audit (read-only, entry body schema): the sagittal two-segment reduction of the frozen V2 body at the C3 standing entry —
// legs (thighs + shanks; the feet are fixed to the turf) rotating about the ankle mid-point, the HAT (pelvis, abdomen, thorax, head, arms) about the
// hip mid-point, absolute segment angles φ1 (legs), φ2 (HAT), forward positive. Linearised double inverted pendulum M·φ¨ = G·φ + Q, with
// Q = [τa − τh, τh] (τa ankle torque on the legs, τh hip torque on the HAT, both "rotate forward" positive). Computes from masses, entry COMs and
// entry inertia tensors only: M, G, the eigenmovements (ankle / hip mode: shapes, rates), the COM Jacobian J_c, the COM acceleration produced by a
// hip-only torque (the BALANCE-2 C4 failure), the COM-NEUTRAL torque direction (J_c·M⁻¹·Q = 0) and the modal torque patterns M·v.
// usage (worktree root): node .../b3_sagittal_model.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { Q } = PL, SPEC = PL.SPEC_R(), { unitStates } = await import(PL.P2 + "core/v2_math.js"), J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA)));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, g = 9.81;
let cap = null; class Cap extends C3Controller { attach(b, p, c) { super.attach(b, p, c); cap = { st: unitStates(c.st), c }; } }
await runOne({ law: "M1B", params: J("balance1/params/B1_BODY.json"), ctrl: () => new Cap(J("balance2/c3/params/C3.json")), steps: 1 });
const { st, c } = cap, B = SPEC.bodies, ja = (n) => c.ctrl.jointAt(st, SPEC.joints.findIndex(j => j.name === n));
const A = ja("ankle_L").map((v, i) => (v + ja("ankle_R")[i]) / 2), H = ja("hip_L").map((v, i) => (v + ja("hip_R")[i]) / 2);
const legs = B.map((b, i) => i).filter(i => /thigh|shank/.test(B[i].name)), hat = B.map((b, i) => i).filter(i => !/thigh|shank|foot/.test(B[i].name));
const IzzW = (i) => { const R = [0, 1, 2].map(k => Q.rot(st[i].rot, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][k])), I = B[i].inertia; let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += R[a][2] * I[a][b] * R[b][2]; return s; };
const grp = (ids, piv) => { let m = 0, cx = 0, cy = 0; for (const i of ids) { m += B[i].mass; cx += B[i].mass * st[i].com[0]; cy += B[i].mass * st[i].com[1]; } cx /= m; cy /= m;
  let Ic = 0; for (const i of ids) Ic += IzzW(i) + B[i].mass * ((st[i].com[0] - cx) ** 2 + (st[i].com[1] - cy) ** 2); return { m, c: [cx, cy], Ic, r: [cx - piv[0], cy - piv[1]] }; };
const L = grp(legs, A), Ht = grp(hat, H), L1 = [H[0] - A[0], H[1] - A[1]], Mtot = B.reduce((s, b) => s + b.mass, 0), mfeet = Mtot - L.m - Ht.m;
const I1A = L.Ic + L.m * (L.r[0] ** 2 + L.r[1] ** 2);
const M = [[I1A + Ht.m * (L1[0] ** 2 + L1[1] ** 2), Ht.m * (L1[0] * Ht.r[0] + L1[1] * Ht.r[1])], [0, Ht.Ic + Ht.m * (Ht.r[0] ** 2 + Ht.r[1] ** 2)]]; M[1][0] = M[0][1];
const G = [[g * (L.m * L.r[1] + Ht.m * L1[1]), 0], [0, g * Ht.m * Ht.r[1]]];
const inv2 = (m) => { const d = m[0][0] * m[1][1] - m[0][1] * m[1][0]; return [[m[1][1] / d, -m[0][1] / d], [-m[1][0] / d, m[0][0] / d]]; }, mul = (a, b) => a.map(r => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0))), mv = (a, v) => a.map(r => r[0] * v[0] + r[1] * v[1]);
const Mi = inv2(M), K = mul(Mi, G), tr = K[0][0] + K[1][1], det = K[0][0] * K[1][1] - K[0][1] * K[1][0], disc = Math.sqrt(tr * tr / 4 - det), lam = [tr / 2 + disc, tr / 2 - disc];
const vec = (l) => { const v = Math.abs(K[0][1]) > 1e-12 ? [K[0][1], l - K[0][0]] : [l - K[1][1], K[1][0]]; const n = Math.hypot(...v); return v.map(x => x / n * Math.sign(v[0] || 1)); };
const modes = lam.map(l => ({ lambda: l, rate: Math.sqrt(Math.abs(l)), shape: vec(l) })), ank = modes.find(m => m.shape[0] * m.shape[1] > 0) || modes[0], hip = modes.find(m => m !== ank);
const Jc = [(L.m * L.r[1] + Ht.m * L1[1]) / Mtot, Ht.m * Ht.r[1] / Mtot]; // ∂x_com/∂φ (feet fixed, small angles)
const comAcc = (Qv) => { const a = mv(Mi, Qv); return Jc[0] * a[0] + Jc[1] * a[1]; }, toQ = (ta, th) => [ta - th, th];
const hipOnly = comAcc(toQ(0, 1)), ankOnly = comAcc(toQ(1, 0)), neutralTa = -comAcc(toQ(0, 1)) / ankOnly; // τa per unit τh for zero COM acceleration
const modal = (m) => { const q = mv(M, m.shape); return { Q: q, tauHip: q[1], tauAnkle: q[0] + q[1] }; }, modalGrav = (m) => { const Gm = m.shape[0] * (G[0][0] * m.shape[0]) + m.shape[1] * (G[1][1] * m.shape[1]), Mm = m.shape[0] * mv(M, m.shape)[0] + m.shape[1] * mv(M, m.shape)[1]; return { Gmodal: Gm, Mmodal: Mm }; };
const out = { protocol: "BALANCE-3 sagittal two-segment reduction at the C3 standing entry (entry body schema; read-only)", masses: { legs: L.m, hat: Ht.m, feet: mfeet, total: Mtot }, geometryM: { ankle: A, hip: H, legsCOMfromAnkle: L.r, hatCOMfromHip: Ht.r, hipFromAnkle: L1 },
  inertia: { legsAboutAnkle: I1A, hatAboutCOM: Ht.Ic }, M, G, modes: { ankle: { ...ank, hz: ank.rate / (2 * Math.PI), modal: modal(ank), ...modalGrav(ank) }, hip: { ...hip, hz: hip.rate / (2 * Math.PI), modal: modal(hip), ...modalGrav(hip) } }, Jc,
  comAccPerNm: { hipOnly, ankleOnly: ankOnly }, comNeutral: { tauAnklePerTauHip: neutralTa, note: "τa = k·τh with k = −a_com(hip only)/a_com(ankle only): this combined pattern produces no instantaneous COM acceleration" },
  hipOnlyVsAnkleRatio: hipOnly / ankOnly };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, (k, v) => typeof v === "number" ? +v.toPrecision(5) : v, 1));
