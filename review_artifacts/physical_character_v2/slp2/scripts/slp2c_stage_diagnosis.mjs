// SLP-2C stage READ-ONLY diagnosis (reporting only; nothing in SLP-2C changes). Re-executes one frozen run (driver version "2" or "2c") with a passive per-tick
// reader; reported only if the regenerated end hash equals the evidence's. Measures, from t_g to FALLEN: (1) planted-foot slip of every scheduled stance (sole
// centroid horizontal drift over the flat part 0.2 ≤ u ≤ 0.6, the harness's P4 definition, and over the whole contact-loaded stance); (2) per scheduled swing:
// the commanded (IK target) and actual toe / heel heights above the turf, the forward position error of the foot vs its target, the ticks with ≥ 20 N on the
// swing foot and their forward ground impulse; (3) the first instant each swing foot's actual toe rises 10 mm above the turf.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../slp2c_stage_diagnosis.mjs <version> <speed> <f> <evidence.json.gz>
import fs from "fs"; import os from "os"; import path from "path"; import zlib from "zlib"; import { pathToFileURL } from "url";
const P = path.join(process.cwd(), "sandbox/visual/physchar2/");
const { SLPSim } = await import(pathToFileURL(P + "gates/v2_slp.js").href); const { V, Q } = await import(pathToFileURL(P + "core/v2_math.js").href);
const [ver, sp, f, EV] = process.argv.slice(2), ev = JSON.parse(zlib.gunzipSync(fs.readFileSync(EV)).toString());
const tick0 = SLPSim.prototype.tick, stances = [], swings = [], cur = [null, null], sw = [null, null];
const wp = (b, loc) => V.add(b.pos, Q.rot(Q.norm(b.rot), loc)), tp = (pose, loc) => V.add(pose.pos, Q.rot(Q.norm(pose.rot), loc));
SLPSim.prototype.tick = function () { const ok = tick0.call(this); if (!ok || !this.S || !this.probeRows) return ok;
  const S = this.S, t = this.n * this.dt, dt = this.dt, C = this.ctrl, drv = S.drv; if (t < 0.5 || (S.fallT != null && t > S.fallT)) return ok;
  for (const n of [0, 1]) { const L = drv.legs[n], p = L.phase, fb = this.st[C.feet[n]], so = drv.sole[n], pr = this.probeRows[n], tg = drv.target[n];
    if (p && p.stance && isFinite(p.tTD)) { if (sw[n]) { swings.push(sw[n]); sw[n] = null; }
      const u = (t - p.tTD) / drv.cfg.sched.tc, c = wp(fb, so.c);
      if (!cur[n] || cur[n].tTD !== +p.tTD.toFixed(4)) { if (cur[n]) stances.push(cur[n]); cur[n] = { foot: "LR"[n], tTD: +p.tTD.toFixed(4), flat0: null, flatMaxMm: 0, load0: null, loadMaxMm: 0, loadedTicks: 0, ticks: 0 }; }
      const s = cur[n]; s.ticks++;
      if (u >= 0.2 && u <= 0.6) { if (!s.flat0) s.flat0 = c; s.flatMaxMm = Math.max(s.flatMaxMm, 1000 * Math.hypot(c[0] - s.flat0[0], c[2] - s.flat0[2])); }
      if (pr.JyN >= 20) { s.loadedTicks++; if (!s.load0) s.load0 = c; s.loadMaxMm = Math.max(s.loadMaxMm, 1000 * Math.hypot(c[0] - s.load0[0], c[2] - s.load0[2])); } }
    else if (p && !p.stance) { if (cur[n]) { stances.push(cur[n]); cur[n] = null; }
      if (!sw[n] || sw[n].tLO !== +p.tLO.toFixed(4)) { if (sw[n]) swings.push(sw[n]); sw[n] = { foot: "LR"[n], tLO: +p.tLO.toFixed(4), tTD: +p.tTD.toFixed(4), ticks: 0, contactTicks: 0, contactFwdNs: 0, toeClear10mmT: null, rows: [] }; }
      const s = sw[n], toeA = wp(fb, so.toe)[1], heelA = wp(fb, so.heel)[1], toeT = tg ? tp(tg, so.toe)[1] : null, heelT = tg ? tp(tg, so.heel)[1] : null, zErr = tg ? fb.pos[2] - tg.pos[2] : null;
      s.ticks++; if (pr.JyN >= 20) { s.contactTicks++; s.contactFwdNs += pr.Jc[2]; } if (s.toeClear10mmT == null && toeA > 0.010) s.toeClear10mmT = +(t - s.tLO).toFixed(4);
      if (this.n % 4 === 0) s.rows.push([+(t - s.tLO).toFixed(4), +(1000 * toeT).toFixed(1), +(1000 * toeA).toFixed(1), +(1000 * heelT).toFixed(1), +(1000 * heelA).toFixed(1), +(1000 * zErr).toFixed(1), +fb.v[2].toFixed(3), +pr.JyN.toFixed(1), +(pr.Jc[2] / dt).toFixed(1)]); } }
  return ok; };
const tmp = path.join(os.tmpdir(), `sd_${process.pid}.json.gz`);
process.argv = [process.argv[0], P + "tools/slp1_probe.mjs", `--version=${ver}`, `--speed=${sp}`, "--case=D0", `--f=${f}`, `--out=${tmp}`];
await import(pathToFileURL(P + "tools/slp1_probe.mjs").href);
const re = JSON.parse(zlib.gunzipSync(fs.readFileSync(tmp)).toString()); fs.unlinkSync(tmp); for (const n of [0, 1]) { if (cur[n]) stances.push(cur[n]); if (sw[n]) swings.push(sw[n]); }
for (const s of stances) { delete s.flat0; delete s.load0; s.flatMaxMm = +s.flatMaxMm.toFixed(1); s.loadMaxMm = +s.loadMaxMm.toFixed(1); }
for (const s of swings) s.contactFwdNs = +s.contactFwdNs.toFixed(2);
console.log(JSON.stringify({ version: ver, speed: sp, f: +f, regenerated: re.hashEnd, evidence: ev.hashEnd, identical: re.hashEnd === ev.hashEnd, fallT: re.architecture.A4_fallT, window: "[0.5 s, FALLEN]",
  swingRowCols: ["tSinceLO", "toeTargetMm", "toeActualMm", "heelTargetMm", "heelActualMm", "footFwdErrVsTargetMm", "footVfwd", "footFyN", "footFzN"], stances, swings }, null, 1));
