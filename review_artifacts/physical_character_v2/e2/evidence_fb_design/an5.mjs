import fs from "fs"; import zlib from "zlib";
const f = process.argv[2], j = +(process.argv[3] ?? 0), q = +(process.argv[4] ?? 1), o = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), dt = 1 / o.hz, X = o.fbx, rows = o.rows;
const t1 = rows.find(r => r.touch > 0 && r.ph !== "lift")?.t; console.log(f, "joint", j, "axis", q, "limit cmd", (30 * 240 / o.hz).toFixed(1));
const xr = (t) => X.find(x => Math.abs(x.t - t) < 1e-6), rr = (t) => rows.find(r => Math.abs(r.t - t) < 1e-6);
for (let k = -14; k <= 10; k++) { const t = t1 + k * dt, a = rr(t), b = rr(t - dt), xa = xr(t), xb = xr(t - dt); if (!a || !b || !xa || !xb) continue;
  const La = a.L[j][q], Lb = b.L[j][q]; if (!La || !Lb) continue; const wa = xa.J[j], wb = xb.J[j]; if (!wa.ws || !wb.ws) continue;
  const Ga = La.vffServo / wa.ws[q], Gb = Lb.vffServo / wb.ws[q];
  const dG = (Ga - Gb) * wb.ws[q], dP = Ga * ((wa.wP ? wa.wP[q] : 0) - (wb.wP ? wb.wP[q] : 0)), dTt = Ga * ((wa.wT ? wa.wT[q] : 0) - (wb.wT ? wb.wT[q] : 0));
  console.log(String(k).padStart(3), a.st.padEnd(10), "a", a.a.toFixed(2), "dtau0", (La.tau0 - Lb.tau0).toFixed(1).padStart(6), "dvff", (La.vffServo - Lb.vffServo).toFixed(1).padStart(6), "= dG·ω*", dG.toFixed(1).padStart(6), "+ G·drP", dP.toFixed(1).padStart(6), "+ G·drT", dTt.toFixed(1).padStart(6), " G", Ga.toFixed(0), "ω*", wa.ws[q].toFixed(3), "rP", wa.wP ? wa.wP[q].toFixed(3) : "—", "rT", wa.wT ? wa.wT[q].toFixed(3) : "—", "wact", wa.wa ? wa.wa[q].toFixed(3) : "", " dd1", (La.d1 - Lb.d1).toFixed(1), "dkp", (La.kp - Lb.kp).toFixed(1)); }
