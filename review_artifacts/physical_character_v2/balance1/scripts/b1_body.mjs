// BALANCE-1 body: the canonical V2 MuscleLayer (M1b; sandbox/visual/physchar2/sim/v2_muscle.js) on the runner, driven ONLY by excitation.
// Neural side (a law object for the PPR plant): the tonic intent = minimum-effort rest statics at the standing entry minus the passive-B share
// (PPR-3 A2, unchanged), plus an optional controller's delayed correction Δτ (intent, N·m per axis); intent → excitation by the canonical allocator
// (solveFloors at the character's entry capacities with the tone floors T). The controller never touches torque or muscle state.
// Muscle state starts AT the entry steady state (delay line = activation = developed force = u0): "as if he had been standing there".
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, P2 } = PL;
const STS = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), MUS = await import(P2 + "sim/v2_muscle.js"), MG = await import(P2 + "spec/v2_muscles.js"), { unitStates, unitEv } = await import(P2 + "core/v2_math.js");
const D2R = Math.PI / 180;
export class M1bBody {
  // params: { groupOverrides (labelled), passiveB (default true), floors (default TONE_T), ctrlOutput: "intent" }
  constructor(plant, c, params = {}, ctrl = null) {
    this.plant = plant; this.c = c; this.p = params; this.ctrl = ctrl; const spec = c.spec, P = c.P, st = c.st, ev = c.up.ev;
    const act = new MUS.MuscleLayer(spec, c.view, P, { groupOverrides: params.groupOverrides, passiveB: params.passiveB }); act.ax = act.ax;   // capacity descriptors as V2
    const capsMean = spec.joints.map((j, k) => [0, 1, 2].map(i => { const x = act.ax[k][i]; if (!x) return null; const d = P.jd[k], an = P.anat(d, ev.qs[k], x.key), kk = act.kneeOf[k], kd = kk != null ? P.anat(P.jd[kk], ev.qs[kk], "flex") : null; return (act.capFull(x, 1, an, 0, kd) + act.capFull(x, -1, an, 0, kd)) / 2; }));
    c.act = act; this.rest = STS.minEffortStatics(c, st, capsMean); const T = params.floors || MG.TONE_T;
    this.ax = spec.joints.map((j, k) => { const fam = j.name.replace(/_[LR]$/, ""); return { k, fam, name: j.name, rows: [0, 1, 2].map(i => { const x = act.ax[k][i]; if (!x) return null; const key = x.key, anat = P.anat(P.jd[k], ev.qs[k], key);
      const pb = MG.PASSIVE_B[`${fam}.${key}`], kp = pb && params.passiveB !== false ? pb.k : 0, tauB0 = pb ? -kp * (anat - pb.slackDeg) * D2R * x.s : 0, fa = T[`${fam}.${key}`] || { pos: T.default, neg: T.default }, fl = x.s > 0 ? [fa.pos, fa.neg] : [fa.neg, fa.pos];
      return { i, key, s: x.s, fl, tauStatic: this.rest.tff[k][i] - tauB0, tauB0 }; }) }; });
    // entry capacities come from the muscle layer itself (the allocator uses the character's own fixed scale)
    const u0 = this.ax.map(a => a.rows.map(() => null)); act.init(st, ev, u0, plant.dt);
    for (const a of this.ax) a.rows.forEach((r, i) => { if (!r) return; const cc = act.entryCaps(a.k, i); r.cP = cc[0]; r.cM = cc[1]; r.u0 = MUS.solveFloors(r.tauStatic, r.fl[0], r.fl[1], cc[0], cc[1]); u0[a.k][i] = r.u0; });
    this.last = null; if (this.ctrl) this.ctrl.attach(this, plant, c); }
  command(c, st, ev, n) { st = unitStates(st); ev = unitEv(ev); const dTau = this.ctrl ? this.ctrl.step(n, st, ev) : null, cmd = [], info = [];
    for (const a of this.ax) cmd[a.k] = a.rows.map((r, i) => { if (!r) return null; const d = dTau && dTau[a.k] ? dTau[a.k][i] || 0 : 0, tgt = r.tauStatic + d, u = d === 0 ? r.u0 : MUS.solveFloors(tgt, r.fl[0], r.fl[1], r.cP, r.cM);
      info.push([a.k, i, tgt, u[0], u[1], d]); return { uP: u[0], uM: u[1] }; });
    this.last = info; return { cmd }; }
  after(c, st, actRes, n) { if (this.ctrl && this.ctrl.after) this.ctrl.after(n, st); }
  // per axis: [k, i, τ_intent, u+, u−, a+, a−, f+, f−, K_mus, D, τ_elastic, τ_passiveB, drive, Δτ_ctrl, R+, R−]
  info() { const plan = this.c.aplan, M = plan ? Object.fromEntries(plan.joints.flatMap(p => p.rows.map((r, i) => (r && !r.off ? [p.k + "_" + i, r] : null)).filter(Boolean))) : {};
    return (this.last || []).map(([k, i, tgt, uP, uM, d]) => { const r = M[k + "_" + i] || {}; return [k, i, +tgt.toFixed(6), +uP.toFixed(6), +uM.toFixed(6), +(r.aP ?? 0).toFixed(6), +(r.aM ?? 0).toFixed(6), +(r.fP ?? 0).toFixed(6), +(r.fM ?? 0).toFixed(6), +(r.Kmus ?? 0).toFixed(4), +(r.D ?? 0).toFixed(4), +(r.tauE ?? 0).toFixed(5), +(r.tauP ?? 0).toFixed(5), +(r.drive ?? 0).toFixed(5), +d.toFixed(6), +(r.Rp ?? 0).toFixed(4), +(r.Rm ?? 0).toFixed(4)]; }); }
  meta() { return { params: this.p, slips: this.c.act.slips || 0, ctrl: this.ctrl && this.ctrl.meta ? this.ctrl.meta() : null }; }
  entryInfo() { return this.ax.flatMap(a => a.rows.filter(Boolean).map(r => ({ joint: a.name, key: r.key, k: a.k, i: r.i, tauStatic: r.tauStatic, u0: r.u0, floors: r.fl, capIso: [r.cP, r.cM] }))); }
}
