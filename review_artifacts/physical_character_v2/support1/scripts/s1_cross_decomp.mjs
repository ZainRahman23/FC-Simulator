// SUPPORT-1: decomposition of the tackler's contact force on each recipient leg body (read-only, PVP-0 records): per step and per recipient body, the
// cross impulse ON the recipient split into vertical (y; negative = pressing the body DOWN into the turf) and horizontal, with the tackler bodies that
// deliver it; plus the vertical force balance N_L + N_R + F_cross,y + non-foot turf = M(g + a_y) that shows where the far foot's normal load comes from.
// usage: node .../s1_cross_decomp.mjs --dir <PVP-0 records> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, SR = PL.SPEC_R();
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DIR = arg("dir"), load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, k + ".json.gz"))));
const H = 1 / 240, M = SR.bodies.reduce((s, b) => s + b.mass, 0), BW = M * 9.81, out = {};
for (const cse of ["LIGHT", "NOMINAL", "HEAVY"]) { const o = load(cse), R = o.recs, A = o.setup.activate, rows = [], acc = {};
  for (let q = A + 30; q < Math.min(R.length, A + 480); q++) { const r = R[q], on = {}, by = {};
    for (const c of r.contacts.filter(c => c.kind === "cross")) { const rb = c.a[0] === "runner" ? c.a[1] : c.b[1], tb = c.a[0] === "tackler" ? c.a[1] : c.b[1], J = c.a[0] === "runner" ? V.sc(c.J2, -1) : c.J2;
      on[rb] = V.add(on[rb] || [0, 0, 0], J); const k = rb + "<" + tb; by[k] = V.add(by[k] || [0, 0, 0], J); }
    const feet = r.chars.runner.feet, NL = feet.L / H, NR = feet.R / H, Fy = Object.values(on).reduce((s, J) => s + J[1], 0) / H;
    const row = { t: +((q - A) * H).toFixed(3), NL: +NL.toFixed(0), NR: +NR.toFixed(0), crossY: +Fy.toFixed(0), legs: {} };
    for (const b of ["foot_L", "shank_L", "thigh_L", "foot_R", "shank_R", "thigh_R", "pelvis"]) if (on[b]) row.legs[b] = { y: +(on[b][1] / H).toFixed(0), h: +(Math.hypot(on[b][0], on[b][2]) / H).toFixed(0), hz: +(on[b][2] / H).toFixed(0) };
    row.top = Object.entries(by).map(([k, J]) => [k, +(V.len(J) / H).toFixed(0), +(J[1] / H).toFixed(0)]).sort((a, b) => b[1] - a[1]).slice(0, 3); rows.push(row);
    for (const [k, J] of Object.entries(by)) { acc[k] = acc[k] || { J: [0, 0, 0], down: 0 }; acc[k].J = V.add(acc[k].J, J); if (J[1] < 0) acc[k].down += -J[1]; } }
  // integrated over the window: impulse per (recipient body < tackler body), its downward part
  const tot = Object.entries(acc).map(([k, a]) => ({ pair: k, Jtot: +V.len(a.J).toFixed(1), Jy: +a.J[1].toFixed(1), Jh: +Math.hypot(a.J[0], a.J[2]).toFixed(1), Jz: +a.J[2].toFixed(1), downNs: +a.down.toFixed(1) })).sort((a, b) => b.Jtot - a.Jtot);
  out[cse] = { window: [0.125, 2.0], pairs: tot.slice(0, 14), rows: rows.filter((_, i) => i % 2 === 0) };
  console.log("=====", cse); for (const p of tot.slice(0, 10)) console.log("  ", JSON.stringify(p));
  for (const tt of [0.2, 0.22, 0.25, 0.28, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.8, 1.0, 1.3, 1.6]) { const x = rows.find(y => y.t >= tt - 1e-9); if (x) console.log(`  t ${x.t} NL ${x.NL} NR ${x.NR} (BW ${BW.toFixed(0)}) crossY ${x.crossY} legs ${JSON.stringify(x.legs)} top ${JSON.stringify(x.top)}`); } }
fs.writeFileSync(arg("out"), JSON.stringify(out));
