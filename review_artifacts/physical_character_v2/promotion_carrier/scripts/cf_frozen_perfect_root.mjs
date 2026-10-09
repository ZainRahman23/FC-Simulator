// READ-ONLY counterfactual (carrier investigation): a PERFECT translation carrier with the legs held at the promoted pose.
// The promoted V2 pose at k_p is translated rigidly along the authoritative root; CG-4 (legs vs the simulation's segments, 0.10 m) and the
// planted-foot slide (NM-2, 10 mm) are evaluated per tick. Also reported: the presentation's own legs vs the simulation's legs (legSimPres).
import fs from "fs";
const WT = process.env.PCV2; const M = await import(WT + "/review_artifacts/physical_character_v2/pi1/rev1/scripts/pcg_rev1.mjs"); const { L, makeMapper } = M; const { V, Q, B, bi, loadAir, bodyLowest } = L;
const sim2r = (p) => [p[0], p[2], -p[1]], comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), hl = (v) => Math.hypot(v[0], v[2]);
const SEGB = { thigh: "thigh", shin: "shank", foot: "foot" };
const legVsSim = (S, sb) => { let mx = 0, who = null; for (const g of sb.segs) { const bn = SEGB[g.seg]; if (!bn || !g.sd || g.name.startsWith("toe")) continue; const i = bi(bn + "_" + g.sd), a2 = sim2r(g.a), b2 = sim2r(g.b), p = comW(S, i), ab = V.sub(b2, a2), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a2), ab) / V.dot(ab, ab))), d = hl(V.sub(p, V.add(a2, V.sc(ab, t)))); if (d > mx) { mx = d; who = B[i].name; } } return { d: mx, who }; };
const [DIR, CS, KPS, H = "10"] = process.argv.slice(2), R = loadAir(DIR, `${CS}_LOCO.json.gz`), mp = makeMapper(R, { knee: "RK", rf1: true }), out = [];
for (const kp of KPS.split(",").map(Number)) { const S0 = mp.poseAt(kp).S, r0 = [R.rows[kp][8], 0, -R.rows[kp][9]], planted = ["L", "R"].filter(sd => bodyLowest(B[bi("foot_" + sd)], S0[bi("foot_" + sd)]).y <= 0.005);
  let tCG4 = null, tSlip = null; const ser = [];
  for (let t = 1; t <= +H && kp + t < R.rows.length; t++) { const k = kp + t, d = V.sub([R.rows[k][8], 0, -R.rows[k][9]], r0); d[1] = 0; const St = S0.map(s => ({ pos: V.add(s.pos, d), rot: s.rot })), sb = R.simBody[k] && R.simBody[k][3]; if (!sb) break;
    const lf = legVsSim(St, sb), lp = legVsSim(mp.poseAt(k).S, sb), slide = planted.length ? hl(d) : 0;
    if (tCG4 == null && lf.d > 0.10) tCG4 = t; if (tSlip == null && slide > 0.010) tSlip = t; ser.push({ t, frozenLegSimMm: +(lf.d * 1000).toFixed(0), presLegSimMm: +(lp.d * 1000).toFixed(0), plantedSlideMm: +(slide * 1000).toFixed(0) }); }
  const lp0 = legVsSim(S0, R.simBody[kp][3]);
  out.push({ cs: CS, kp, speed: +Math.hypot(R.rows[kp][10], R.rows[kp][11]).toFixed(2), plantedAtKp: planted, presLegSimAtKpMm: +(lp0.d * 1000).toFixed(0), firstCG4fail: tCG4, firstSlipFail: tSlip, ser }); }
for (const o of out) console.log(o.cs, "kp", o.kp, "v", o.speed, "planted", o.plantedAtKp.join("") || "-", "pres-vs-sim at kp", o.presLegSimAtKpMm, "| perfect root + frozen legs: CG-4 fails t =", o.firstCG4fail, " NM-2 slide fails t =", o.firstSlipFail, "| frozen legSim", o.ser.map(s => s.frozenLegSimMm).join(" "), "| pres legSim", o.ser.map(s => s.presLegSimMm).join(" "));
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
