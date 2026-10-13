// SUPPORT-1 deep audit of the PVP-0 recipient's support (read-only, from the PVP-0 run records; nothing is re-simulated).
// Per recipient foot, per step: normal force N, horizontal shear F_h (Jolt's per-piece friction impulses), friction demand F_h/N and available µN,
// per-piece cone saturation (|J_f| ≥ 0.98 µΣλ = that piece slides), contact points, centre of pressure, the foot's velocity at the COP relative to the
// turf, slip distance, roll/pitch/yaw of the boot, torsional (yaw) friction moment about the COP vs the rigid-plate Coulomb capacity µΣλ_i·r_i,
// ankle / knee / hip angles (vs TWIN), joint torques (M1b active readback + passive tissue readback), M1b activations and the controller's own
// intent Δτ, the cross-character impulse on each recipient leg body, support polygon (contact points with λ > 0, both feet), COM and XcoM
// (Hof 2005: x + v/ω0) relative to it, pelvis and thorax linear / angular velocity.
// Jolt 5.6 friction (ContactConstraintManager, current source): ONE linear friction constraint per manifold at the average contact point, circular cone
// |λ_t| ≤ µ·Σλ_n, plus ONE angular friction constraint about the normal, |λ_ang| ≤ µ·Σ(λ_n,i · d_i), d_i = in-plane distance of point i from that
// average point; the two caps are applied independently. Each boot piece (10 per foot, D1a) is its own manifold.
// usage (worktree root): node .../s1_feet_audit.mjs --dir <PVP-0 records> --out <json> [--cases LIGHT,NOMINAL,HEAVY]
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SR = PL.SPEC_R();
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DIR = arg("dir"), load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, k + ".json.gz"))));
const H = 1 / 240, MU = SR.contact.friction["boot|turf"], M = SR.bodies.reduce((s, b) => s + b.mass, 0), BW = M * 9.81, D = 180 / Math.PI;
const bI = (n) => SR.bodies.findIndex(b => b.name === n), jI = (n) => SR.joints.findIndex(j => j.name === n);
const axIdx = (jn, key) => { const j = SR.joints[jI(jn)]; const a = ["x", "y", "z"].find(q => j.def.axes[q] && j.def.axes[q].key === key); return { k: jI(jn), i: ["x", "y", "z"].indexOf(a), s: j.def.axes[a].s ?? 1 }; };
const AX = { ankL_df: axIdx("ankle_L", "df"), ankL_inv: axIdx("ankle_L", "inv"), ankR_df: axIdx("ankle_R", "df"), ankR_inv: axIdx("ankle_R", "inv"), kneeL: axIdx("knee_L", "flex"), kneeR: axIdx("knee_R", "flex"),
  hipL_flex: axIdx("hip_L", "flex"), hipL_abd: axIdx("hip_L", "abd"), hipL_rot: axIdx("hip_L", "rot"), hipR_flex: axIdx("hip_R", "flex"), hipR_abd: axIdx("hip_R", "abd"), hipR_rot: axIdx("hip_R", "rot") };
// 2D helpers (x, z)
const hull2 = (P) => { const Qs = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (Qs.length < 3) return Qs; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], hi = [];
  for (const p of Qs) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); } for (const p of Qs.slice().reverse()) { while (hi.length >= 2 && cr(hi.at(-2), hi.at(-1), p) <= 0) hi.pop(); hi.push(p); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
const segD = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1))); return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]); };
const inPoly = (p, P) => { if (P.length < 3) return false; let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } } return true; };
const sdist = (p, P) => { if (!P.length) return null; if (P.length === 1) return -Math.hypot(p[0] - P[0][0], p[1] - P[0][1]); let d = Infinity; for (let i = 0; i < P.length; i++) d = Math.min(d, segD(p, P[i], P[(i + 1) % P.length])); return inPoly(p, P) ? d : -d; };
// boot orientation relative to its entry orientation: yaw about world y; pitch = toe-up angle of the boot's long axis; roll = lateral-up angle of its x axis
const footAngles = (rot, rot0) => { const fz = Q.rot(rot, [0, 0, 1]), fx = Q.rot(rot, [1, 0, 0]), fz0 = Q.rot(rot0, [0, 0, 1]);
  const yaw = Math.atan2(fz[0], fz[2]) - Math.atan2(fz0[0], fz0[2]), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  return { yaw: wrap(yaw) * D, pitch: Math.asin(Math.max(-1, Math.min(1, fz[1]))) * D, roll: Math.asin(Math.max(-1, Math.min(1, fx[1]))) * D, tilt: Math.acos(Math.max(-1, Math.min(1, Q.rot(rot, [0, 1, 0])[1]))) * D }; };
function footStep(r, foot, fIdx) {
  const ms = r.contacts.filter(c => c.kind === "turf-runner" && Array.isArray(c.b) && c.b[1] === foot);
  let lam = 0, Jf = [0, 0, 0], Jn = [0, 0, 0], pts = [], cop = [0, 0, 0], ang = 0, sat = 0, active = 0;
  for (const m of ms) { const sl = m.points.reduce((s, p) => s + p.lam, 0); lam += sl; Jn = V.add(Jn, V.sc(m.n, sl)); if (m.friction) Jf = V.add(Jf, m.friction.J);
    for (const p of m.points) if (p.lam > 1e-6) { pts.push([p.p[0], p.p[2]]); cop = V.add(cop, V.sc(p.p, p.lam)); }
    if (sl > 1e-6) { active++; const jf = m.friction ? V.len(m.friction.J) : 0; if (jf >= 0.98 * MU * sl) sat++; } }
  const N = lam / H, Fh = Math.hypot(Jf[0], Jf[2]) / H, S = r.S[fIdx]; let copW = null, vSlip = null, Mz = 0, Mcap = 0;
  if (lam > 1e-6) { copW = V.sc(cop, 1 / lam); const rr = V.sub(copW, S.com), vp = V.add(S.v, V.cross(S.w, rr)); vSlip = Math.hypot(vp[0], vp[2]);
    for (const m of ms) { if (m.friction) { const a = V.sub(m.friction.at, copW); Mz += (a[2] * m.friction.J[0] - a[0] * m.friction.J[2]); } Mz += (m.angFriction || 0) * (m.n ? m.n[1] : 1);
      for (const p of m.points) if (p.lam > 1e-6) Mcap += MU * p.lam * Math.hypot(p.p[0] - copW[0], p.p[2] - copW[2]); } }
  return { N, Fh, Fvec: [Jf[0] / H, Jf[2] / H], ratio: N > 1 ? Fh / N : null, satPieces: sat, activePieces: active, nPts: pts.length, pts, cop: copW ? [copW[0], copW[2]] : null, vSlip, Mz: Mz / H, Mcap: Mcap / H, Mratio: Mcap > 1e-9 ? Math.abs(Mz) / Mcap : null };
}
const cases = (arg("cases", "LIGHT,NOMINAL,HEAVY")).split(","), TW = load("TWIN"), out = { mu: MU, massKg: M, bodyWeightN: BW, frictionModel: "Jolt 5.6 per-manifold linear cone µΣλ at the mean point + independent torsional cap µΣλd (one manifold per boot piece, 10 pieces / foot)", cases: {} };
const fL = bI("foot_L"), fR = bI("foot_R"), pel = bI("pelvis"), tho = bI("thorax");
for (const cse of cases) { const o = load(cse), R = o.recs, A = o.setup.activate, n = Math.min(R.length, TW.recs.length), w0 = A - 24, w1 = Math.min(n - 1, A + 720);
  const rot0 = { L: TW.recs[A].S[fL].rot, R: TW.recs[A].S[fR].rot }, pos0 = { L: TW.recs[A].S[fL].com, R: TW.recs[A].S[fR].com }, zc = TW.recs[A].chars.runner.com[1], w0m = Math.sqrt(9.81 / zc);
  const ser = [], slip = { L: 0, R: 0 }, ev = { L: {}, R: {} }, pk = { L: { ratio: 0, Mratio: 0, vSlip: 0, satFrac: 0, yaw: 0, roll: 0, Fh: 0 }, R: { ratio: 0, Mratio: 0, vSlip: 0, satFrac: 0, yaw: 0, roll: 0, Fh: 0 } };
  let first = null;
  for (let q = w0; q <= w1; q++) { const r = R[q], tw = TW.recs[q], t = (q - A) * H, row = { n: r.n, t: +t.toFixed(4) };
    const cross = r.contacts.filter(c => c.kind === "cross"); if (!first && cross.some(c => c.Jn > 0)) first = r.n;
    const crossOn = {}; for (const c of cross) { const rb = c.a[0] === "runner" ? c.a[1] : c.b[1], sg = c.a[0] === "runner" ? -1 : 1; crossOn[rb] = V.add(crossOn[rb] || [0, 0, 0], V.sc(c.J2, sg)); }
    const allPts = [];
    for (const [side, fi, nm] of [["L", fL, "foot_L"], ["R", fR, "foot_R"]]) { const f = footStep(r, nm, fi), fa = footAngles(r.S[fi].rot, rot0[side]), disp = V.sub(r.S[fi].com, pos0[side]);
      if (f.N > 20 && f.vSlip != null) slip[side] += f.vSlip * H; allPts.push(...f.pts);
      const P = pk[side]; if (f.ratio != null && f.N > 0.05 * BW) P.ratio = Math.max(P.ratio, f.ratio); if (f.Mratio != null && f.N > 0.05 * BW) P.Mratio = Math.max(P.Mratio, f.Mratio); if (f.vSlip != null && f.N > 20) P.vSlip = Math.max(P.vSlip, f.vSlip);
      if (f.activePieces) P.satFrac = Math.max(P.satFrac, f.satPieces / f.activePieces); P.yaw = Math.max(P.yaw, Math.abs(fa.yaw)); P.roll = Math.max(P.roll, Math.abs(fa.roll)); P.Fh = Math.max(P.Fh, f.Fh);
      const E = ev[side]; if (q >= A && E.unload == null && f.N < 0.05 * BW) E.unload = +t.toFixed(3); if (q >= A && E.lift == null && f.N === 0) E.lift = +t.toFixed(3);
      if (q >= A && E.slide == null && f.N > 20 && f.vSlip > 0.05) E.slide = +t.toFixed(3); if (q >= A && E.fullSat == null && f.activePieces >= 2 && f.satPieces === f.activePieces) E.fullSat = +t.toFixed(3);
      const ang = (key) => { const a = AX[key]; return +((r.chars.runner.th[a.k][a.i] - tw.chars.runner.th[a.k][a.i]) * a.s * D).toFixed(2); };
      const tq = (key) => { const a = AX[key], act = (r.act || []).find(x => x[0] === a.k && x[1] === a.i), pas = r.passive ? r.passive[a.k][a.i] : 0; return [+(((act ? act[2] : 0)) * a.s).toFixed(2), +((pas) * a.s).toFixed(2)]; };
      const lw = (key) => { const a = AX[key], x = (r.law || []).find(y => y[0] === a.k && y[1] === a.i); return x ? { ap: x[5], am: x[6], fp: x[7], fm: x[8], intent: x[2], dctrl: x[14] } : null; };
      const pfx = side === "L" ? "ankL" : "ankR", kn = side === "L" ? "kneeL" : "kneeR", hp = side === "L" ? "hipL" : "hipR";
      row[side] = { N: +f.N.toFixed(1), Fh: +f.Fh.toFixed(1), F: f.Fvec.map(v => +v.toFixed(1)), ratio: f.ratio != null ? +f.ratio.toFixed(3) : null, sat: f.satPieces, act: f.activePieces, nPts: f.nPts, cop: f.cop ? f.cop.map(v => +v.toFixed(4)) : null, vSlip: f.vSlip != null ? +f.vSlip.toFixed(3) : null,
        slip: +slip[side].toFixed(4), Mz: +f.Mz.toFixed(2), Mcap: +f.Mcap.toFixed(2), yaw: +fa.yaw.toFixed(2), pitch: +fa.pitch.toFixed(2), roll: +fa.roll.toFixed(2), tilt: +fa.tilt.toFixed(2), disp: [+(disp[0] * 1000).toFixed(1), +(disp[1] * 1000).toFixed(1), +(disp[2] * 1000).toFixed(1)],
        ang: { df: ang(pfx + "_df"), inv: ang(pfx + "_inv"), knee: ang(kn), hipFlex: ang(hp + "_flex"), hipAbd: ang(hp + "_abd"), hipRot: ang(hp + "_rot") },
        tq: { df: tq(pfx + "_df"), inv: tq(pfx + "_inv"), knee: tq(kn), hipFlex: tq(hp + "_flex"), hipAbd: tq(hp + "_abd"), hipRot: tq(hp + "_rot") }, m1b: { inv: lw(pfx + "_inv"), df: lw(pfx + "_df"), hipAbd: lw(hp + "_abd") },
        crossOn: Object.fromEntries(["foot_" + side, "shank_" + side, "thigh_" + side].map(b => [b, crossOn[b] ? +(V.len(crossOn[b]) / H).toFixed(1) : 0])) }; }
    const poly = hull2(allPts), rc = r.chars.runner, v = V.sc(rc.P, 1 / M), com = [rc.com[0], rc.com[2]], xcom = [rc.com[0] + v[0] / w0m, rc.com[2] + v[2] / w0m];
    row.com = { y: +rc.com[1].toFixed(4), h: com.map(x => +x.toFixed(4)), v: [v[0], v[1], v[2]].map(x => +x.toFixed(3)), dTwin: +(V.len(V.sub(rc.com, tw.chars.runner.com)) * 1000).toFixed(1), xcom: xcom.map(x => +x.toFixed(4)), sdCom: poly.length ? +((sdist(com, poly)) * 1000).toFixed(1) : null, sdXcom: poly.length ? +((sdist(xcom, poly)) * 1000).toFixed(1) : null, poly: poly.map(p => p.map(x => +x.toFixed(4))) };
    for (const [nm, bi] of [["pelvis", pel], ["thorax", tho]]) { const s = r.S[bi]; row[nm] = { v: s.v.map(x => +x.toFixed(3)), w: s.w.map(x => +x.toFixed(3)), y: +s.pos[1].toFixed(3) }; }
    ser.push(row); }
  // which way the strike pushes the recipient, in the recipient's own frame (facing from the pelvis, lateral from the feet at entry)
  const pr = TW.recs[A].S[pel].rot, fwd = Q.rot(pr, [0, 0, 1]), lat = V.norm(V.sub(pos0.L, pos0.R)); // lat: from right foot to left foot
  const fc = first != null ? R.find(x => x.n === first) : null, crossJ = fc ? fc.contacts.filter(c => c.kind === "cross").reduce((s, c) => V.add(s, c.a[0] === "runner" ? V.sc(c.J2, -1) : c.J2), [0, 0, 0]) : null;
  const strikeDir = (() => { let Jt = [0, 0, 0]; for (let q = first; q < first + 24 && q < n; q++) { const rr = R.find(x => x.n === q); if (!rr) continue; for (const c of rr.contacts.filter(c => c.kind === "cross")) Jt = V.add(Jt, c.a[0] === "runner" ? V.sc(c.J2, -1) : c.J2); } return Jt; })();
  const sd = V.norm([strikeDir[0], 0, strikeDir[2]]);
  out.cases[cse] = { activate: A, firstContactStep: first, firstContactT: first != null ? +((first - A) * H).toFixed(3) : null, facing: fwd.map(x => +x.toFixed(3)), rightToLeft: lat.map(x => +x.toFixed(3)),
    strikeImpulse100ms: strikeDir.map(x => +x.toFixed(2)), strikeDirInRecipientFrame: { forward: +V.dot(sd, [fwd[0], 0, fwd[2]]).toFixed(3), towardLeft: +V.dot(sd, lat).toFixed(3) },
    slipTotalMm: { L: +(slip.L * 1000).toFixed(1), R: +(slip.R * 1000).toFixed(1) }, events: ev, peaks: pk, series: ser.filter((_, i) => i % 2 === 0) };
  console.log("=====", cse, "first contact", first, "facing", fwd.map(x => x.toFixed(2)).join(","), "R→L", lat.map(x => x.toFixed(2)).join(","), "strike dir fwd/left", out.cases[cse].strikeDirInRecipientFrame);
  console.log(" slip mm", out.cases[cse].slipTotalMm, "events", JSON.stringify(ev)); console.log(" peaks", JSON.stringify(pk));
  for (const tt of [-0.05, 0.19, 0.21, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1.0, 1.2, 1.5, 2.0]) { const row = ser.find(x => x.t >= tt - 1e-9); if (!row) continue; const f = (s) => { const x = row[s]; return `${s}: N ${x.N} Fh ${x.Fh} r ${x.ratio} sat ${x.sat}/${x.act} vs ${x.vSlip} slip ${x.slip} Mz ${x.Mz}/${x.Mcap} yaw ${x.yaw} roll ${x.roll} pitch ${x.pitch} disp ${x.disp} inv ${x.ang.inv} df ${x.ang.df} knee ${x.ang.knee} hipAbd ${x.ang.hipAbd} | tqInv ${x.tq.inv} tqDf ${x.tq.df} | X ${JSON.stringify(x.crossOn)}`; };
    console.log(` t=${row.t} com dTwin ${row.com.dTwin} y ${row.com.y} sdCom ${row.com.sdCom} sdXcom ${row.com.sdXcom} pelvis v ${row.pelvis.v} w ${row.pelvis.w}`); console.log("   " + f("L")); console.log("   " + f("R")); } }
fs.writeFileSync(arg("out"), JSON.stringify(out));
