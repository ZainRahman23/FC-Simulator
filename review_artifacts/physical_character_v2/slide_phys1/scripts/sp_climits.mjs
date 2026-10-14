// SLIDE-PHYS-1 constraint-space joint-limit audit: re-runs a parameter vector in the SAME solo plant (bit-identical: the subclass only reads) and
// records, per joint and engine axis, the largest excursion beyond the V2 HARD limit in the plant's own constraint coordinates (the quantity behind
// integrity.hardExcDeg), when it happened, and which contacts were active then. Distinguishes a real constraint violation (contact force driving a
// joint past its stop) from a decomposition artefact of the anatomical (sp_limits) angles.
// usage (worktree root): node sp_climits.mjs --u <params.json> --speed 5 [--steps 480]
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), RUN = await import(new URL("./sp_run.mjs", import.meta.url).href), P = await import(new URL("./sp_param.mjs", import.meta.url).href);
import fs from "fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, KEYS = ["x", "y", "z"], D2R = Math.PI / 180;
export class AuditPlant extends L.SoloPlant { _measureChars(S, mf) { const out = super._measureChars(S, mf); const c = this.tackler; if (!c || !c.up) return out; const acc = this.cacc || (this.cacc = {});
  c.spec.joints.forEach((j, k) => { const per = c.up.ev.per[k]; for (let i = 0; i < 3; i++) { if (j.locked.includes(KEYS[i])) continue; const th = per.th[i], hT = per.T[i] && per.T[i].hard, lo = hT ? hT[0] : j.limits.hard.lo[i], hi = hT ? hT[1] : j.limits.hard.hi[i];
    const ex = Math.max(lo - th, th - hi, 0) / D2R, id = j.name + "." + KEYS[i], e = acc[id] || (acc[id] = { max: 0, at: null, t: 0, lo: lo / D2R, hi: hi / D2R, min: Infinity, mx: -Infinity });
    e.min = Math.min(e.min, th / D2R); e.mx = Math.max(e.mx, th / D2R); if (ex > 0) e.t += this.dt; if (ex > e.max) { e.max = ex; e.at = this.n * this.dt; } } }); return out; }
  destroy() { AuditPlant.last = this.cacc; return super.destroy(); } }
// run a candidate with the audit; returns the ordinary record + the per-axis constraint-space excess table
export async function auditRun(cand, opts = {}) { const o = await RUN.runCand(cand, { ...opts, PlantClass: AuditPlant }); o.climits = AuditPlant.last || {}; return o; }
export const cTable = (acc, min = 0.2) => Object.entries(acc).filter(([, e]) => e.max > min).sort((a, b) => b[1].max - a[1].max).map(([id, e]) => ({ id, beyond: +e.max.toFixed(1), at: +e.at.toFixed(3), dur: +e.t.toFixed(3), range: [+e.min.toFixed(0), +e.mx.toFixed(0)], hard: [+e.lo.toFixed(0), +e.hi.toFixed(0)] }));
if (process.argv[1] && process.argv[1].endsWith("sp_climits.mjs")) { const u = JSON.parse(fs.readFileSync(arg("u"))), cand = P.makeCand(P.toPhys(u), +arg("speed", "5"), "CL");
  const o = await auditRun(cand, { steps: +arg("steps", "480") }); console.log("hash", o.finalHash, "(must equal the plain run)");
  for (const e of cTable(o.climits)) console.log(e.id.padEnd(16), "range", `${e.range[0]}..${e.range[1]}`.padEnd(10), "hard", `[${e.hard[0]},${e.hard[1]}]`.padEnd(10), "beyond", e.beyond.toFixed(1).padStart(5), "° at", e.at.toFixed(3), "s, total", e.dur.toFixed(3), "s"); }
