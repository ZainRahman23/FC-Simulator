// SLIDE-PHYS-1 M1b audit: the EFFECTIVE joint torque–velocity relation of canonical M1b at full, steady excitation of one muscle group, read from
// the canonical MuscleAxis motor law itself (plan(): drive, Kmus, D = 2ζ√(K_tot·I), the implicit law τ = clamp(τ0 − (D + h·K)·ω, lo, hi)), at
// the joint's optimum angle, for concentric velocities 0 … 15 rad/s. Compared with the capacity curve alone (Hill f_ω, no damping).
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { JN } = L, MC = await import(new URL("./sp_m1c.mjs", import.meta.url).href);
const MODEL = process.argv.includes("--m1c") ? "M1c" : "M1b";
const pose = L.fk({ pos: [0, 1.0, 0], rot: [0, 0, 0, 1] }, {}), lo = L.lowestOf(pose), p2 = pose.map(s => ({ pos: L.V.add(s.pos, [0, 0.0005 - lo.y, 0]), rot: s.rot }));
const sim = await L.soloPlant({ pose: p2, vel: p2.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })), steps: 2, law: (p, c) => { const b = new L.MB.M1bBody(p, c, L.BODY, null); if (MODEL === "M1c") MC.useM1c(c.act); return b; } });
const act = sim.tackler.act, out = {};
const cases = [["hip_R", "flex", 1, 30, "hip flexion"], ["hip_R", "flex", -1, 30, "hip extension"], ["knee_R", "flex", -1, 60, "knee extension"], ["knee_R", "flex", 1, 40, "knee flexion"], ["ankle_R", "df", -1, 0, "plantarflexion"], ["lumbar", "flex", -1, 0, "trunk extension"], ["shoulder_R", "flex", 1, 30, "shoulder flexion"]];
for (const [jn, key, dirAnat, anat, label] of cases) { const k = JN.findIndex(j => j.name === jn), i = act.ax[k].findIndex(x => x && x.key === key), x = act.ax[k][i], m = act.mx[k][i], d = m.d;
  const s = x.s, dir = dirAnat * s;           // constraint-axis direction of the muscle group's torque (+: plus group)
  const rows = []; for (const w of [0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15]) { const u = dir > 0 ? [1, 0] : [0, 1], m2 = new m.constructor(d); m2.plan(u, { anat, w: dir * w, kneeDeg: 30 }, true);
    const tq = m2.torque(dir * w).tau, cap = act.capFull(x, dir > 0 ? 1 : -1, anat, w, 30), r = m2.row; rows.push({ w, effective: +(dir * tq).toFixed(1), clampLo: +(dir > 0 ? m2.row.lo : -m2.row.hi).toFixed(1), capacityFV: +cap.toFixed(1), damping: +((r.D + d.dt * r.Ktot) * w).toFixed(1), D: +r.D.toFixed(2), Ktot: +r.Ktot.toFixed(0), I: +d.I.toFixed(3) }); }
  out[label] = { joint: jn, key, anat, rows }; }
sim.destroy(); fs.writeFileSync(new URL(`../evidence/${MODEL.toLowerCase()}_effective_fv.json`, import.meta.url), JSON.stringify({ model: MODEL, out }, null, 1));
for (const [lb, o] of Object.entries(out)) { console.log(lb.padEnd(17), "w(rad/s): " + o.rows.map(r => String(r.w).padStart(5)).join(""));
  console.log("".padEnd(17), "capacity FV  " + o.rows.map(r => String(r.capacityFV).padStart(5)).join("")); console.log("".padEnd(17), MODEL + " effective" + o.rows.map(r => String(r.effective).padStart(5)).join(""), " D", o.rows[0].D, "K", o.rows[0].Ktot, "I", o.rows[0].I); }
