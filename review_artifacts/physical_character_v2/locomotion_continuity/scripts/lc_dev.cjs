// LC-1 DEVELOPMENT probe (synthetic straight runs only; never the PI-1 records): fine-rate continuity of pelvis / COM / joints, flight ballistics,
// vertical force, planted-foot slip and engagement travel, and the presented legs vs the simulation's own legs (ptRxBodyChar, 60 Hz).
// usage: node lc_dev.cjs <tree> [speeds] [on|off] [hz]
const H = require("./pres_harness.cjs"), [WT, SP, MODE, HZ] = process.argv.slice(2);
const P = H.loadPres(WT, ["anim3d/of_loco_cont.js"], ["pt_react.js", "pt_charcollide.js"]); if (MODE === "off") P.g("OF_CONT.on = false");
const comOf = P.g("ofContCOM"), speeds = (SP || "3,7.5").split(",").map(Number), hz = +(HZ || 3840), dt = 1 / hz;
const q = (a, p) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))].toFixed(4) : null; };
for (const v of speeds) {
  const R = H.driveSynth(P, () => v, 3.0, dt), O = R.out, sk = R.skel, k0 = Math.round(0.5 / dt);
  const com = O.map(f => comOf(sk, f)), pel = O.map(f => f.joint[sk.byName.pelvis.idx]);
  // per-step velocity change
  const dvMax = (S) => { let m = 0, at = 0; for (let k = k0 + 1; k < S.length - 1; k++) { const d = [0, 1, 2].map(i => (S[k + 1][i] - 2 * S[k][i] + S[k - 1][i]) / dt); const n = Math.hypot(...d); if (n > m) { m = n; at = k; } } return { m: +m.toFixed(4), t: +(at * dt).toFixed(4) }; };
  let jw = { m: 0 }; for (let b = 0; b < sk.bones.length; b++) { if (!sk.bones[b].parent) continue; const r = dvMax(O.map(f => f.joint[b])); if (r.m > jw.m) jw = { ...r, bone: sk.bones[b].name }; }
  // vertical force from the COM height (fine rate)
  const F = []; for (let k = k0 + 1; k < O.length - 1; k++) F.push(1 + (com[k + 1][1] - 2 * com[k][1] + com[k - 1][1]) / (dt * dt) / 9.81);
  // flight intervals (law flag): ballistic residual of the COM height
  let flRes = 0, nFl = 0; for (let k = k0; k < O.length; ) { if (!O[k].flight) { k++; continue; } let e = k; while (e + 1 < O.length && O[e + 1].flight) e++; if (e - k >= 4) { nFl++;
      const ts = [], ys = []; for (let i = k; i <= e; i++) { ts.push((i - k) * dt); ys.push(com[i][1] + 9.81 * ((i - k) * dt) ** 2 / 2); }   // remove gravity, fit a line
      const n = ts.length, mt = ts.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (ts[i] - mt) * (ys[i] - my); sxx += (ts[i] - mt) ** 2; } const b = sxy / sxx, a0 = my - b * mt;
      for (let i = 0; i < n; i++) flRes = Math.max(flRes, Math.abs(ys[i] - (a0 + b * ts[i]))); } k = e + 1; }
  // planted slip / engagement travel per stance (layer diag)
  const slips = [], travel = [], modes = {}; for (const sd of ["R", "L"]) { let cur = null; for (let k = k0; k < O.length; k++) { const f = O[k].diag.feet[sd] || {}; modes[f.mode] = (modes[f.mode] || 0) + 1;
      if (f.mode === "planted") { if (!cur) cur = { max: 0 }; cur.max = Math.max(cur.max, f.slide || 0); } else if (cur) { slips.push(cur.max); cur = null; } } }
  const lift = O.slice(k0).map(f => Math.max((f.diag.feet.R || {}).lift || 0, (f.diag.feet.L || {}).lift || 0));
  const pelAmp = { x: [Math.min(...O.slice(k0).map(f => f.pel ? f.pel[0] : 0)), Math.max(...O.slice(k0).map(f => f.pel ? f.pel[0] : 0))], z: [Math.min(...O.slice(k0).map(f => f.pel ? f.pel[2] : 0)), Math.max(...O.slice(k0).map(f => f.pel ? f.pel[2] : 0))] };
  console.log(`v ${v} (${MODE || "on"}, ${hz} Hz): dv/step pelvis ${dvMax(pel).m} COM ${dvMax(com).m} worst joint ${jw.m} (${jw.bone} @${jw.t}s) | F/BW [${q(F, 0)}, ${q(F, 1)}] p50 ${q(F, 0.5)} | flights ${nFl} ballistic resid max ${(flRes * 1000).toFixed(2)} mm | slip/stance max ${slips.length ? (Math.max(...slips) * 1000).toFixed(2) : "-"} mm (n ${slips.length}) | lift max ${(Math.max(...lift) * 1000).toFixed(1)} mm | pelvis x ${pelAmp.x.map(z => (z * 1000).toFixed(1))} z ${pelAmp.z.map(z => (z * 1000).toFixed(1))} mm | modes ${JSON.stringify(modes)}`);
}
