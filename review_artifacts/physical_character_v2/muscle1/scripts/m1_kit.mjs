// MUSCLE-1 axis kit (measurement only): boots the FROZEN PPR-3 S2 body on the PPR-3 standing entry for one step and extracts, for chosen actuator
// axes, everything the actuator law needs at that operating point — the S2 row constants (entry capacities, floors, tonic target, short-range
// constants, passive B, axis inertia), V2's capacity descriptor and its capFull() (force–length / force–velocity, unchanged), C's arm constants.
// The standalone axis models (m1_models.mjs) evaluate the same equations on prescribed kinematics, so actuators can be compared on IDENTICAL inputs.
import fs from "fs";
const RA = new URL("../../", import.meta.url), BT = await import(new URL("ppr3/scripts/ppr3_battery.mjs", RA).href), { runOne } = await import(new URL("ppr3/scripts/ppr3_run.mjs", RA).href);
const PL = await import(new URL("pvp1/scripts/pvp1a_lib.mjs", RA).href), { ACT } = await import(PL.P2 + "sim/v2_actuation.js"), AV = await import(PL.P2 + "spec/v2_actuators.js");
export const S2PARAMS = JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_S2_CANDIDATE.json", RA)));
export { ACT, AV };
export async function bootKits(axes) { let kits = null;
  await runOne(BT.makeJob("S2", { body: S2PARAMS }, { steps: 1, instrument: false, onStep: (sim) => { const law = sim.law, act = sim.runner.act, plan = sim.runner.aplan, P = sim.runner.P, ev = sim.runner.up.ev;
    kits = Object.fromEntries(axes.map(([name, k, i]) => { const r = law.ax[k].rows[i], x = act.ax[k][i], kk = act.kneeOf[k], row = plan.joints.find(p => p.k === k).rows[i];
      return [name, { name, k, i, fam: r.fam, key: r.key, s: r.s, cP: r.cP, cM: r.cM, fl: r.fl, tauStatic: r.tauStatic, tauPentry: r.tauPentry, u0: r.u0, kp: r.kp, slack: r.slack, dp: r.dp, kP: r.kP, kM: r.kM, ePs: r.ePs, eMs: r.eMs, I: r.I, anat0: r.anat0,
        kneeDeg0: kk != null ? P.anat(P.jd[kk], ev.qs[kk], "flex") : null, a0: act.a[k][i].slice(), x, capFull: (dir, anat, wDir, kneeDeg) => act.capFull(x, dir, anat, wDir, kneeDeg),
        zeta: law.sp.zeta, ecc: law.ecc, dt: sim.dt, decayF: law.decayF, decayS: law.decayS, Dmin: ACT.D_MIN, row1: { aP: row.aP, aM: row.aM, drive: row.drive, Kmus: row.Kmus } }]; })); } }));
  // CURRENT V2's own controller at the same entry (SnapshotTone, IFM-1 §6.4: bias + K·err + (D + h·K)·ω_ref; K / D from PostureDriver at entry)
  await runOne({ law: "A", steps: 1, instrument: false, onStep: (sim) => { for (const [name, k, i] of axes) { const T = sim.runner.tone.find(t => t.k === k); kits[name].tone = T && T.K ? { K: T.K[i], D: T.D[i], bias: T.bias[i] } : null; } } });
  return kits; }
