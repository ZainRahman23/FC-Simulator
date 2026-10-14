// SLIDE-PHYS-1 diagnostic export: record → per-step series for plotting (anatomical joint angles vs targets, pelvis world angles vs plan,
// COM, turf force per body (BW), requested vs delivered actuator torque on chosen axes, support-chain objective terms).
// usage: node sp_diag.mjs --cand G2 --rec rec.json.gz --out diag.json
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, JN, M, G, bi, ji } = L;
const C = await import(new URL("./sp_chor.mjs", import.meta.url).href), CD = await import(new URL("./sp_cand.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const cand = CD.CANDS[arg("cand")], out = L.readGz(arg("rec")), chor = C.compile(cand.chor), pel = cand.vfPlan ? CD.pelvisPlan(cand.pelvis || CD.PEL_G2) : null;
const JK = [["hip_L", "flex"], ["hip_L", "abd"], ["hip_L", "rot"], ["knee_L", "flex"], ["ankle_L", "df"], ["ankle_L", "inv"], ["hip_R", "flex"], ["knee_R", "flex"], ["ankle_R", "df"], ["lumbar", "flex"], ["lumbar", "lat"], ["shoulder_L", "flex"], ["shoulder_R", "flex"]];
const eul = (R) => { const fwd = Q.rot(R, [0, 0, 1]), up = Q.rot(R, [0, 1, 0]); return { pitch: Math.atan2(up[2], up[1]) * 180 / Math.PI, roll: Math.atan2(-up[0], up[1]) * 180 / Math.PI, yaw: Math.atan2(fwd[0], fwd[2]) * 180 / Math.PI }; };
const ser = { t: [], comY: [], vy: [], vz: [], vx: [], pel: [], pelPlan: [], ang: {}, tgt: {}, grf: {}, tau: {}, req: {}, vfF: [], vfT: [], errDeg: [] };
for (const [j, k] of JK) { ser.ang[j + "." + k] = []; ser.tgt[j + "." + k] = []; }
const AX = [["knee_L", "flex"], ["hip_L", "flex"], ["hip_L", "abd"], ["ankle_L", "df"], ["hip_R", "flex"], ["knee_R", "flex"], ["lumbar", "flex"]];
const axIdx = AX.map(([j, key]) => { const k = ji(j), jj = JN[k], i = ["x", "y", "z"].find(a => jj.def.axes[a] && jj.def.axes[a].key === key); return [k, ["x", "y", "z"].indexOf(i), jj.def.axes[i].s]; });
for (const a of AX) { ser.tau[a.join(".")] = []; ser.req[a.join(".")] = []; }
const logBy = {}; for (const r of out.ctrlLog || []) logBy[r.n] = r;
for (const r of out.recs) { const S = r.S.slice(0, B.length), t = r.t, c = r.chars.tackler, v = V.sc(c.P, 1 / M); ser.t.push(t); ser.comY.push(c.com[1]); ser.vy.push(v[1]); ser.vz.push(v[2]); ser.vx.push(v[0]);
  ser.pel.push(eul(S[0].rot)); if (pel) ser.pelPlan.push(eul(pel(t).R));
  const an = L.anatOf(S), tg = chor.anatAt(t); for (const [j, k] of JK) { ser.ang[j + "." + k].push(an[j][k]); ser.tgt[j + "." + k].push(tg[j] ? tg[j][k] ?? 0 : 0); }
  const gf = {}; for (const ct of r.contacts) if (ct.kind.startsWith("turf")) { const side = ct.a === "turf" ? ct.b : ct.a, sg = ct.a === "turf" ? 1 : -1; gf[side[1]] = (gf[side[1]] || 0) + sg * ct.J2[1] * 240 / (M * G); }
  for (const nm of Object.keys(gf)) (ser.grf[nm] = ser.grf[nm] || []); for (const nm of Object.keys(ser.grf)) { while (ser.grf[nm].length < ser.t.length - 1) ser.grf[nm].push(0); ser.grf[nm].push(gf[nm] || 0); }
  const act = r.actT || []; AX.forEach((a, n) => { const [k, i, s] = axIdx[n], row = act.find(x => x[0] === k && x[1] === i); ser.tau[a.join(".")].push(row ? row[2] * s : null); ser.req[a.join(".")].push(row ? row[6] * s : null); });
  const lg = logBy[r.n - 1]; ser.vfF.push(lg && lg.vf ? lg.vf.F : null); ser.vfT.push(lg && lg.vf ? lg.vf.T : null); ser.errDeg.push(lg ? lg.errDeg : null); }
for (const nm of Object.keys(ser.grf)) while (ser.grf[nm].length < ser.t.length) ser.grf[nm].push(0);
fs.writeFileSync(arg("out"), JSON.stringify({ cand: cand.id, ...ser }));
console.log("ok", ser.t.length, Object.keys(ser.grf).join(","));
