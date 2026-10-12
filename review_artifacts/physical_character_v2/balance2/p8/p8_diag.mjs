// BALANCE-2 P8 DIAGNOSTIC (post-hoc, causal attribution; nothing here is a candidate or a criterion). The failing case is B2M back.small
// (5.84 N·s, 50 ms, onset 480) on the frozen C3: overshoot 0.287 vs ≤ 0.26. Exposure disclosed: this diagnosis runs on that exact case.
// (1) the push − twin AP COM trace and when the opposite excursion happens; (2) torque accounting at the ankles / hips / spine (push − twin):
//     controller intent, developed active drive, the body's history-carrying strain-arm torque (M1b τ_elastic), passive; (3) the controller's
//     internal AP terms; (4) single-factor diagnostic ablations, each applied to BOTH twin and push: motor noise off, AP COM integral held from
//     onset, every controller integral held from onset, AP prediction off, direction-specific muscle constants off, governor off (= C2), B1.
// usage (worktree root): node .../p8_diag.mjs --out <json> [--cases back.small,back.moderate,fwd.small]
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M, overshoot } = await import(RA + "balance2/scripts/b2_qualify.mjs");
const { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs"), { BalanceController } = await import(RA + "balance1/scripts/b1_ctrl.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), SPEC = PL.SPEC_R();
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA)));
const BODY = J("balance1/params/B1_BODY.json"), C3P = J("balance2/c3/params/C3.json"), B1P = J("balance1/params/B1_B.json"), ON = B2M.onset, WIN = +(arg("window", B2M.window)), STEPS = ON + WIN; // --window: longer diagnostic window (steps)
const jk = (n) => SPEC.joints.findIndex(j => j.name === n), AX = { ankle: [[jk("ankle_L"), 1], [jk("ankle_R"), 1]], knee: [[jk("knee_L"), 1], [jk("knee_R"), 1]], hip: [[jk("hip_L"), 1], [jk("hip_R"), 1]], lumbar: [[jk("lumbar"), 1]], thoracic: [[jk("thoracic"), 1]] };
// diagnostic controller: C3 with optional holds from the onset step
class Diag extends C3Controller { constructor(p, o) { super(p); this.o = o; }
  step(n, st, ev) { const hold = n >= ON; let snap = null;
    if (hold && this.o.holdAPI) { this.ciAP_h = this.ciAP_h ?? this.ciAP; this.ciAPH_h = this.ciAPH_h ?? this.ciAPH; }
    if (hold && this.o.holdAll) snap = { g: Object.fromEntries(Object.entries(this.grp).map(([k, g]) => [k, g.I ? g.I.slice() : null])), ci: this.ci.slice(), ciH: this.ciH ? this.ciH.slice() : null, sup: this.supI, ap: this.ciAP, aph: this.ciAPH };
    const out = super.step(n, st, ev);
    if (hold && this.o.holdAPI) { this.ciAP = this.ciAP_h; this.ciAPH = this.ciAPH_h; }
    if (snap) { for (const [k, g] of Object.entries(this.grp)) if (snap.g[k]) g.I = snap.g[k]; this.ci = snap.ci; if (snap.ciH) this.ciH = snap.ciH; this.supI = snap.sup; this.ciAP = snap.ap; this.ciAPH = snap.aph; }
    return out; } }
// BODY-SIDE DIAGNOSTIC ONLY (never a candidate; the body is not changed for any candidate): the M1b persistent strain arm (residual force
// enhancement, STRAIN_ARMS.fRes 0.15 of the short-range stiffness, no decay) zeroed on every muscle axis of this process's body instance at attach
class ArmR0 extends Diag { attach(body, plant, c) { super.attach(body, plant, c); let n = 0; c.act.mx.forEach(row => row.forEach(m => { if (m && m.W) { m.W.r = 0; n++; } })); this.armR0 = n; } }
const variants = {
  armR0: () => new ArmR0(C3P, {}),
  armR0_noNoise: () => new ArmR0({ ...C3P, noise: { ...C3P.noise, cv: 0 } }, {}),
  armR0_noNoise_holdAllI: () => new ArmR0({ ...C3P, noise: { ...C3P.noise, cv: 0 } }, { holdAll: true }),
  C3: () => new C3Controller(C3P),
  noNoise: () => new C3Controller({ ...C3P, noise: { ...C3P.noise, cv: 0 } }),
  holdAPI: () => new Diag(C3P, { holdAPI: true }),
  holdAllI: () => new Diag(C3P, { holdAll: true }),
  noPredAP: () => new C3Controller({ ...C3P, predict: { ...C3P.predict, axes: [false, true] } }),
  noDirMuscle: () => new C3Controller({ ...C3P, b2: { ...C3P.b2, dirMuscle: undefined } }),
  noGovernor_C2: () => new C3Controller({ ...C3P, c3: {} }),
  noNoise_holdAllI: () => new Diag({ ...C3P, noise: { ...C3P.noise, cv: 0 } }, { holdAll: true }),
  B1: () => new BalanceController(B1P) };
const lawRow = (r, k, i) => (r.law || []).find(x => x[0] === k && x[1] === i), actT = (r, k, i) => { const a = (r.act || []).find(x => x[0] === k && x[1] === i); return (a ? a[2] : 0) + r.passive[k][i]; };
const T = (r, axes, f) => axes.reduce((s, [k, i]) => s + f(r, k, i), 0);
async function one(mk, dir, Jn) { const base = await runOne({ law: "M1B", params: BODY, ctrl: mk, steps: STEPS }), o = await runOne({ law: "M1B", params: BODY, ctrl: mk, steps: STEPS, perturb: BT.pushJob(dir, Jn, ON, B2M.pulse) });
  const os = overshoot(base, o, ON, WIN, dir), ax = dir === "fwd" || dir === "back" ? 0 : 2, sg = dir === "fwd" || dir === "left" ? 1 : -1, n = Math.min(base.recs.length, o.recs.length);
  const d = (q) => sg * (o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]) * 1000; let ipk = ON, pk = 0; for (let q = ON; q < n; q++) if (d(q) > pk) { pk = d(q); ipk = q; } let imn = ipk, mn = 0; for (let q = ipk; q < n; q++) if (d(q) < mn) { mn = d(q); imn = q; }
  let zc = null; for (let q = ipk; q < n; q++) if (d(q) < 0) { zc = q; break; } let first = 0, ifirst = null; if (zc != null) { for (let q = zc; q < n; q++) { if (d(q) < first) { first = d(q); ifirst = q; } if (d(q) > 0 && q > zc + 12) break; } }
  const trace = []; for (let q = ON; q < n; q += 24) trace.push([+((q - ON) / 240).toFixed(2), +d(q).toFixed(2)]);
  const win = (a, b) => { const qs = []; for (let q = ON + Math.round(a * 240); q < Math.min(n, ON + Math.round(b * 240)); q++) qs.push(q); return qs; }, avg = (qs, f) => qs.reduce((s, q) => s + f(q), 0) / qs.length;
  const acct = {}; for (const [lbl, [a, b]] of Object.entries({ "0.5-1.0s": [0.5, 1.0], "1-2s": [1, 2], "2-3s": [2, 3], "3-4s": [3, 4], ...(WIN > 960 ? { "6-8s": [6, 8], "10-12s": [10, 12] } : {}) })) { const qs = win(a, b), P = o.recs, A = base.recs; acct[lbl] = { comMm: +avg(qs, d).toFixed(2) };
    for (const [nm, axes] of Object.entries(AX)) { const L = (r, k, i, j) => { const w = lawRow(r, k, i); return w ? w[j] : 0; };
      acct[lbl][nm] = { intent: +avg(qs, q => T(P[q], axes, (r, k, i) => L(r, k, i, 2)) - T(A[q], axes, (r, k, i) => L(r, k, i, 2))).toFixed(2), drive: +avg(qs, q => T(P[q], axes, (r, k, i) => L(r, k, i, 13)) - T(A[q], axes, (r, k, i) => L(r, k, i, 13))).toFixed(2),
        strainArms: +avg(qs, q => T(P[q], axes, (r, k, i) => L(r, k, i, 11)) - T(A[q], axes, (r, k, i) => L(r, k, i, 11))).toFixed(2), passiveB: +avg(qs, q => T(P[q], axes, (r, k, i) => L(r, k, i, 12)) - T(A[q], axes, (r, k, i) => L(r, k, i, 12))).toFixed(2),
        total: +avg(qs, q => T(P[q], axes, actT) - T(A[q], axes, actT)).toFixed(2), angleDeg: +avg(qs, q => T(P[q], axes, (r, k, i) => r.chars.runner.th[k][i]) - T(A[q], axes, (r, k, i) => r.chars.runner.th[k][i])).toFixed(4) * 57.2958 / axes.length }; } }
  return { overshoot: { frac: +os.frac.toFixed(3), peakMm: +os.peakMm.toFixed(2), oppositeMm: +os.oppositeMm.toFixed(2) }, tPeakS: +((ipk - ON) / 240).toFixed(2), tOppositeMaxS: +((imn - ON) / 240).toFixed(2), firstReboundMm: +(-first).toFixed(2), tFirstReboundS: ifirst != null ? +((ifirst - ON) / 240).toFixed(2) : null, endMm: +d(n - 1).toFixed(2), trace, acct }; }
const cases = arg("cases", "back.small").split(","), out = { note: "POST-HOC DIAGNOSTIC on the B2M back.small case (exposure disclosed); not a criterion, not a candidate", runs: {} };
const only = arg("variants") ? arg("variants").split(",") : Object.keys(variants);
for (const c of cases) { const [dir, lvl] = c.split("."), Jn = B2M.J[dir][lvl]; for (const v of only) { const r = await one(variants[v], dir, Jn); out.runs[c + "|" + v] = r; console.log(c.padEnd(14), v.padEnd(18), "os", r.overshoot.frac, "pk", r.overshoot.peakMm, "opp", r.overshoot.oppositeMm, "@", r.tOppositeMaxS, "s; first rebound", r.firstReboundMm, "@", r.tFirstReboundS, "end", r.endMm); } }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
