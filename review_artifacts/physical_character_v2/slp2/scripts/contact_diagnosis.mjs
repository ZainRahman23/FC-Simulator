// SLP-2 READ-ONLY contact diagnosis (input to the SLP-2C design; nothing in SLP-2 changes). Re-executes one frozen SLP-2 calibration run with a passive per-tick
// reader; reported only if the regenerated end hash equals the evidence's. Measures, per physical touchdown (first tick with ≥ 20 N on a foot after ≥ 50 ms
// without): the foot's horizontal velocity (world = ground-relative; the turf is static) and its forward position relative to the whole-body COM; per stance
// window: the legs' forward and vertical ground impulse vs the scheduled vertical impulse; the stance-leg joint-damping torque the actuators were asked for,
// (D + dt·K)·ω_actual per leg axis (the term the stance velocity feed-forward is absent from); and which leg actuator axes saturate in stance vs swing.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../contact_diagnosis.mjs <speed> <f> <evidence.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { pathToFileURL } from "url";
const P = path.join(process.cwd(), "sandbox/visual/physchar2/");
const { SLPSim } = await import(pathToFileURL(P + "gates/v2_slp.js").href);
const [sp, f, EV] = process.argv.slice(2), ev = JSON.parse(zlib.gunzipSync(fs.readFileSync(EV)).toString());
const tick0 = SLPSim.prototype.tick, out = { touchdowns: [], damp: {}, sat: { stance: {}, swing: {} }, stanceImpulse: [] }; let off = [0, 0], cur = [null, null], tLimit = null;
SLPSim.prototype.tick = function () { const plan = this.aplan; const ok = tick0.call(this); if (!ok || !this.S || !this.probeRows) return ok;
  const S = this.S, t = this.n * this.dt, B = this.spec.bodies, C = this.ctrl; if (tLimit == null) tLimit = S.fallT; if (t < 0.5 || (S.fallT != null && t > S.fallT - 0.3)) return ok;
  const c = S.last.c, legs = S.drv.legs;
  for (const n of [0, 1]) { const fz = this.probeRows[n].JyN, fi = C.feet[n], fb = this.st[fi];
    if (fz >= 20) { if (off[n] >= 0.05) { out.touchdowns.push({ t: +t.toFixed(4), foot: "LR"[n], vFwd: +fb.v[2].toFixed(3), vLat: +fb.v[0].toFixed(3), vDown: +(-fb.v[1]).toFixed(3), footAheadOfComM: +(fb.com[2] - c[2]).toFixed(3), schedPhase: legs[n].phase && legs[n].phase.stance ? "stance" : "swing" }); cur[n] = { t0: t, Jz: 0, Jy: 0, sched: 0 }; } off[n] = 0;
      if (cur[n]) { cur[n].Jz += this.probeRows[n].Jc[2]; cur[n].Jy += this.probeRows[n].Jc[1]; cur[n].sched += S.drv.fySched(t).fy[n] * this.dt; } }
    else { off[n] += this.dt; if (cur[n] && off[n] >= 0.05) { out.stanceImpulse.push({ foot: "LR"[n], t0: +cur[n].t0.toFixed(4), JzNs: +cur[n].Jz.toFixed(2), JyNs: +cur[n].Jy.toFixed(2), schedJyNs: +cur[n].sched.toFixed(2) }); cur[n] = null; } } }
  for (const p of plan.joints) { const side = C.legSide[p.k]; if (side < 0) continue; const ph = legs[side].phase, stance = ph && ph.stance, nm = this.spec.joints[p.k].name.replace(/_[LR]$/, "");
    p.rows.forEach((r, i) => { if (!r || r.off || r.w == null) return; if (stance) { const key = nm + "." + "xyz"[i], d = out.damp[key] || (out.damp[key] = { sumAbsNm: 0, n: 0, maxAbsNm: 0 }), tq = (r.D + this.dt * r.K) * r.w; d.sumAbsNm += Math.abs(tq); d.n++; d.maxAbsNm = Math.max(d.maxAbsNm, Math.abs(tq)); } }); }
  for (const r of this.actRes || []) { if (!r.sat) continue; const side = C.legSide[r.k]; if (side < 0) continue; const ph = legs[side].phase, key = this.spec.joints[r.k].name.replace(/_[LR]$/, "") + "." + "xyz"[r.i], bin = ph && ph.stance ? out.sat.stance : out.sat.swing; bin[key] = (bin[key] || 0) + 1; }
  return ok; };
process.argv = [process.argv[0], P + "tools/slp1_probe.mjs", "--version=2", `--speed=${sp}`, "--case=D0", `--f=${f}`, `--out=/tmp/cdx_${process.pid}.json.gz`];
await import(pathToFileURL(P + "tools/slp1_probe.mjs").href);
const re = JSON.parse(zlib.gunzipSync(fs.readFileSync(`/tmp/cdx_${process.pid}.json.gz`)).toString()); fs.unlinkSync(`/tmp/cdx_${process.pid}.json.gz`);
for (const k in out.damp) { const d = out.damp[k]; out.damp[k] = { meanAbsNm: +(d.sumAbsNm / d.n).toFixed(1), maxAbsNm: +d.maxAbsNm.toFixed(1) }; }
console.log(JSON.stringify({ speed: sp, f: +f, regenerated: re.hashEnd, evidence: ev.hashEnd, identical: re.hashEnd === ev.hashEnd, window: "[0.5 s, FALLEN − 0.3 s]", ...out }, null, 1));
