// HYBRID-RUN-1 ANIMATION DRIVE: the joint-tracking actuator of the hybrid runner. It is the V2 actuator layer (sim/v2_actuation.js ActuatorLayer:
// one implicit Jolt motor per motorised joint axis, its torque limited to [lo, hi] INSIDE the solver, exact torque readback), with the capacity
// model replaced by a constant finite DRIVE limit per axis and direction:
//   τ_max = κ · T_iso · M      (T_iso: the V2 athlete isometric capacity table, spec/v2_actuators.js; κ = 2 by default)
// It has no force–velocity curve and no activation lag. The drive is the animation's authority over the body, not a model of muscle: its job is to
// make an undisturbed body follow RUN-1, not to explain how RUN-1 is produced. It is finite, so any contact that needs more than τ_max wins, and
// the hybrid runner's regional authority scales its K, D and feed-forward.
// usage: c.act = new AnimationDrive(spec, c.view, c.P, { kappa }) (replaces the character's actuator layer before its first command)
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs");
const { ActuatorLayer, ACT } = await import(PL.P2 + "sim/v2_actuation.js"), { V, Q, unitStates, unitEv } = await import(PL.P2 + "core/v2_math.js");
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export class AnimationDrive extends ActuatorLayer {
  constructor(spec, world, passive, opts = {}) { super(spec, world, passive, {}); this.kappa = opts.kappa ?? 2; this.driveCap = this.ax.map(r => r.map(x => (x ? [this.kappa * x.plus.cap.Tiso * this.M, this.kappa * x.minus.cap.Tiso * this.M] : null))); }
  compute(st, ev, cmd, dt, init = false) { st = unitStates(st); ev = unitEv(ev); const P = this.P, out = [];
    for (const d of P.jd) { const k = d.k, R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E.map(e => Q.rot(R2F2, e)), wrel = V.sub(st[d.child].w, st[d.parent].w);
      const rows = [0, 1, 2].map(i => { const x = this.ax[k][i]; if (!x) return null; const c = cmd[k] && cmd[k][i]; if (!c) return { off: true };
        const w = V.dot(wrel, axW[i]), K = Math.max(0, c.K), D = Math.max(ACT.D_MIN, c.D), [capP, capM] = this.driveCap[k][i], req = c.tau0 - (D + dt * K) * w;
        return { K, D, tau0: c.tau0, req, capP, capM, hi: capP, lo: -capM, w, anat: 0 }; });
      out.push({ k, axW, rows, wrel }); }
    return (this.plan = { joints: out, dt, applied: false }); }
}
