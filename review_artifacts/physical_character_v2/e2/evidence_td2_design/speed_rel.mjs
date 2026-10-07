// design input (AB baseline records of the frozen FB battery, PSTAR5CHAB): contact normal speed (potential-contact points, last contact-free tick) vs instantaneous impact load,
// exact-10 ms load, and post-contact torque continuity (first 0.1 s after the first touching tick), per rate
import fs from "fs"; import zlib from "zlib";
const D = process.argv[2], out = [];
for (const f of fs.readdirSync(D).filter(x => x.startsWith("fb_PSTAR5CHAB_") && x.endsWith(".json.gz"))) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(D + "/" + f))), R = r.rows, dt = 1 / r.hz, W = r.W;
  const i1 = R.findIndex(x => x.t === r.t1); if (i1 < 1) continue; const vN = R[i1 - 1].pc.vN, vT = R[i1 - 1].pc.vT, win = R.filter(x => x.t >= r.t1 - 1e-9 && x.t <= r.t1 + 0.1 + 1e-9);
  const peak = Math.max(...win.map(x => x.Fz)) / W; let w10 = 0; for (let i = 0; i < win.length; i++) { let s = 0, tt = 0; for (let j = i; j < win.length && tt < 0.010 - 1e-9; j++) { const d = Math.min(dt, 0.010 - tt); s += win[j].Fz * d; tt += d; } w10 = Math.max(w10, s / 0.010 / W); }
  const se = r.series, rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs); let cmd = 0, app = 0, pre = 0; se.t.forEach((t, i) => { if (t >= r.t1 - 1e-9 && t <= r.t1 + 0.1 + 1e-9) { cmd = Math.max(cmd, se.dTau0[i] / (30 * rs)); app = Math.max(app, se.dTau[i] / (25 * rsA)); } if (t >= r.t1 - 0.05 && t < r.t1 - 1e-9) pre = Math.max(pre, se.dTau0[i] / (30 * rs)); });
  out.push({ f: f.slice(14, -8), hz: r.hz, vN, vT, peak, w10, cmd, app, pre }); }
for (const hz of [180, 240, 480]) { const S = out.filter(o => o.hz === hz), k = (key) => Math.max(...S.map(o => o[key] / o.vN));
  console.log(`${hz} Hz n ${S.length} vN ${Math.min(...S.map(o => o.vN)).toFixed(3)}–${Math.max(...S.map(o => o.vN)).toFixed(3)} m/s | peak %BW max ${(100 * Math.max(...S.map(o => o.peak))).toFixed(1)} (max peak/v ${(100 * k("peak")).toFixed(0)} %BW per m/s) | 10ms max ${(100 * Math.max(...S.map(o => o.w10))).toFixed(1)} (per m/s ${(100 * k("w10")).toFixed(0)}) | post-contact cmd/limit max ${Math.max(...S.map(o => o.cmd)).toFixed(2)} app/limit(25) ${Math.max(...S.map(o => o.app)).toFixed(2)} | pre-contact cmd/limit max ${Math.max(...S.map(o => o.pre)).toFixed(2)}`);
  // least squares peak = a + b v
  const n = S.length, mv = S.reduce((s, o) => s + o.vN, 0) / n; for (const key of ["peak", "w10", "cmd", "app"]) { const my = S.reduce((s, o) => s + o[key], 0) / n, b = S.reduce((s, o) => s + (o.vN - mv) * (o[key] - my), 0) / S.reduce((s, o) => s + (o.vN - mv) ** 2, 0), a = my - b * mv, res = Math.max(...S.map(o => o[key] - (a + b * o.vN)));
    console.log(`   ${key.padEnd(4)} LS a ${a.toFixed(3)} b ${b.toFixed(2)} /(m/s)  max residual +${res.toFixed(3)}  → value at 0.035 m/s: ${(a + b * 0.035 + res).toFixed(3)} (upper)`); } }
fs.writeFileSync(process.argv[3], JSON.stringify(out));
