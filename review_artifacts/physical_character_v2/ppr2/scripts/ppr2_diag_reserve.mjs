// PPR-2 DIAGNOSTIC (post-qualification, read-only; not a criterion): per key axis of a substrate at the PVP-1A-DX entry — fixed drive, excitation
// u±, isometric capacity, short-range muscle stiffness K = Σ kθ·a·capIso, the strain reserve R± = (e± − 1)·a±·capIso± and the elastic range R/K (°)
// on each side, plus the passive (B) stiffness. Explains which axes have an elastic range and which are on a yield plateau from the first degree.
// usage: V2_KNEE_MODEL=v2k node ppr2_diag_reserve.mjs --params <json> --out <json>
import fs from "fs";
const R = new URL("../../", import.meta.url).href, { Ppr2Plant } = await import(R + "ppr2/scripts/ppr2_plant.mjs"), { Jolt } = await import(R + "ppr2/scripts/ppr2_run.mjs"), SUB = await import(R + "ppr2/scripts/ppr2_substrate.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FIX = JSON.parse(fs.readFileSync(new URL("pvp1/fixture/PVP1A_FIXTURE.json", R))), params = JSON.parse(fs.readFileSync(arg("params")));
const sim = new Ppr2Plant(Jolt, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, "N2", { O: FIX.O, instrument: true, solo: "runner", maxSteps: 2, law: (p, c) => new SUB.SubstrateLaw(p, c, params) });
const L = sim.law, spec = sim.runner.spec, rows = [];
L.ax.forEach((a, ai) => L.fixed[ai].forEach(f => { if (!f) return; const isoP = f.uP > 0 ? null : null; const aP = f.uP, aM = f.uM, x = L.c.act.ax[a.k][f.i], P = sim.runner.P, ev = sim.runner.up.ev;
  const anat = P.anat(P.jd[a.k], ev.qs[a.k], f.key), kneeK = L.c.act.kneeOf ? L.c.act.kneeOf[a.k] : null, kneeDeg = kneeK != null ? P.anat(P.jd[kneeK], ev.qs[kneeK], "flex") : null;
  const cP = L.c.act.capFull(x, 1, anat, 0, kneeDeg), cM = L.c.act.capFull(x, -1, anat, 0, kneeDeg), K = f.kP * aP * cP + f.kM * aM * cM, Rp = (f.ePs - 1) * aP * cP, Rm = (f.eMs - 1) * aM * cM;
  rows.push({ axis: spec.joints[a.k].name + "." + f.key, drive: +f.tauAct.toFixed(2), passiveEntry: +f.tauPentry.toFixed(2), uP: +aP.toFixed(3), uM: +aM.toFixed(3), capIsoP: +cP.toFixed(1), capIsoM: +cM.toFixed(1), Kmus: +K.toFixed(1), Kpassive: f.kp,
    reserveP: +Rp.toFixed(2), reserveM: +Rm.toFixed(2), elasticRangePdeg: +(Rp / Math.max(1e-9, K) * 180 / Math.PI).toFixed(3), elasticRangeMdeg: +(Rm / Math.max(1e-9, K) * 180 / Math.PI).toFixed(3) }); }));
sim.destroy(); if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ params: params.id, rows }, null, 1));
for (const r of rows) console.log(r.axis.padEnd(16), `drive ${String(r.drive).padStart(7)} u± ${r.uP}/${r.uM} capIso± ${r.capIsoP}/${r.capIsoM} Kmus ${r.Kmus} Kp ${r.Kpassive} reserve± ${r.reserveP}/${r.reserveM} N·m → elastic ±${r.elasticRangePdeg}/${r.elasticRangeMdeg}°`);
