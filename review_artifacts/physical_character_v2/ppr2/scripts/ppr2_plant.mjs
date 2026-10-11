// PPR-2 plant: PPR-1's plant (ppr1/scripts/ppr1_plant.mjs — itself the frozen PVP-1A plant plus inert hooks) plus one isolated-test fixture:
//   opts.platform = { from, ramp, amp, hold }: from step `from`, BOTH feet are kinematic platforms rotated toes-up about their own ankle centre
//   (world axis = the runner's left) by a 0 → amp (rad) linear ramp over `ramp` steps, then held — the stance-ankle stiffness protocol of
//   Vlutters et al. 2015 (40 ms ramp-and-hold) / Sakanaka et al. 2021. Before `from` the feet are ordinary dynamic bodies on the turf.
//   opts.drive = { joint, axis, sign, from, ramp, amp, hold: [bodies], move: [bodies] }: an ISOLATED joint displacement test (the dynamometer
//   protocol): from step `from` the `hold` bodies are kinematic and fixed, and the `move` bodies (the child chain) are kinematic and rotate rigidly
//   about the joint centre, about the joint's constraint axis (world direction at `from`), by sign·amp (anatomical sense) in a linear ramp of
//   `ramp` steps, then held. Both sides of the joint are prescribed, so the joint's torque readback is its own intrinsic response.
// Everything else (law hook, perturbations, impactor, measurement, run length) is PPR-1's plant unchanged.
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const { PprPlant } = await import(new URL("../../ppr1/scripts/ppr1_plant.mjs", import.meta.url).href);
export class Ppr2Plant extends PprPlant {
  constructor(J, entries, flags, mode, opts = {}) { super(J, entries, flags, mode, opts); this.platform = opts.platform || null; this.platLog = []; this.drive = opts.drive || null; }
  _drive() { const d = this.drive; if (!d || this.n < d.from) return; const c = this.runner, spec = c.spec;
    if (!d.init) { const k = spec.joints.findIndex(j => j.name === d.joint), j = spec.joints[k], q = ["x", "y", "z"].find(a => j.def.axes[a] && j.def.axes[a].key === d.axis), i = ["x", "y", "z"].indexOf(q);
      const ci = j.childIndex, sc = this.w.read(this.bodyIdx(spec.bodies[ci].name)), piv = V.add(sc.pos, Q.rot(sc.rot, V.sub(j.at, spec.bodies[ci].origin)));
      const ax = Q.rot(Q.mul(sc.rot, j.F2), [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]), s = j.def.axes[q].s ?? 1;
      d.init = { k, i, piv, ax, s, hold: d.hold.map(n => { const b = this.bodyIdx(n), st = this.w.read(b); this.w.setKinematic(b); return { b, pos: st.pos, rot: st.rot }; }),
        move: d.move.map(n => { const b = this.bodyIdx(n), st = this.w.read(b); this.w.setKinematic(b); return { b, pos: st.pos, rot: st.rot }; }) }; }
    const I = d.init, m = this.n + 1 - d.from, ang = d.sign * d.amp * Math.min(1, m / d.ramp) * I.s, dq = [...V.sc(I.ax, Math.sin(ang / 2)), Math.cos(ang / 2)];
    for (const h of I.hold) this.w.moveKinematic(h.b, h.pos, h.rot, this.dt);
    for (const f of I.move) this.w.moveKinematic(f.b, V.add(I.piv, Q.rot(dq, V.sub(f.pos, I.piv))), Q.norm(Q.mul(dq, f.rot)), this.dt);
    this.platLog.push([this.n + 1, ang]); }
  _applyPerturb() { this._drive(); const out = super._applyPerturb(), pf = this.platform; if (!pf || this.n < pf.from) return out;
    const c = this.runner, spec = c.spec;
    if (!pf.init) { pf.init = ["foot_L", "foot_R"].map(n => { const i = this.bodyIdx(n), s = this.w.read(i), kA = spec.joints.findIndex(j => j.name === "ankle_" + n.slice(-1)), j = spec.joints[kA], ci = j.childIndex;
        const ank = V.add(s.pos, Q.rot(s.rot, V.sub(j.at, spec.bodies[ci].origin))); this.w.setKinematic(i); return { i, pos0: s.pos, rot0: s.rot, ank }; });
      const pel = this.w.read(this.bodyIdx("pelvis")), lr = V.sub(pf.init[0].ank, pf.init[1].ank); pf.axis = V.norm([lr[0], 0, lr[2]]); }   // the runner's left: toes-up = +rotation about it
    const m = this.n + 1 - pf.from, ang = pf.amp * Math.min(1, m / pf.ramp), dq = [...V.sc(pf.axis, Math.sin(ang / 2)), Math.cos(ang / 2)];
    for (const f of pf.init) { const pos = V.add(f.ank, Q.rot(dq, V.sub(f.pos0, f.ank))), rot = Q.norm(Q.mul(dq, f.rot0)); this.w.moveKinematic(f.i, pos, rot, this.dt); }
    this.platLog.push([this.n + 1, ang]); return out; }
}
