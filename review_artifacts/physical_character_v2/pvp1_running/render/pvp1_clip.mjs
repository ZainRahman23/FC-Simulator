// PVP-1 VISUAL PREPARATION (presentation only: reads run records, writes clip data; nothing re-simulated, interpolated or amplified).
// Both characters are V1-matched V2 bodies, so both are drawn on their actual V2 joints by TRC-1's MC-1P (trc1_retarget.posePhys): the tackler
// as gabriel, the recipient as vinicius. A rigid PRESENTATION placement (yaw about the vertical + offset, sp_clip.mjs's) puts the scene on the
// pitch; it is the same rigid transform for every body and every frame.
// Before its takeover the recipient is RUN-1's own animation (run.run1R, world frame of the sim). Before its activation (t < 0) the tackler is its
// RUN-1 run-in (run.runInT). Both are labelled kinematic in the HUD.
// Camera focus (frame.pitch): the midpoint of the two pelvises, exponentially smoothed (τ 0.25 s), so both stay in frame; --focus <record> takes
// the focus path from another record of the same condition (one identical camera path for PVP-F2, PVP-F3 and the TWIN). In the TWIN the parked
// (never activated) tackler is not drawn: it is moved out of view.
// usage (worktree root): LV2_ARCHIVE=<tag archive> node .../pvp1_clip.mjs --run <rec.json.gz> --key <id> --out <dir> [--from -0.5 --to 2.0] (s from the first contact)
import fs from "fs"; import path from "path"; import zlib from "zlib";
const T = await import(new URL("../../trc1/scripts/trc1_retarget.mjs", import.meta.url).href), { PL, V, Q } = T;
const WIRE = await import(new URL("../../slide_phys1/render/sp_wire.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), key = arg("key"), OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const yaw = +arg("yaw", "90") * Math.PI / 180, at = arg("at", "44,34").split(",").map(Number), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], offL = PL.pitchToLocal([at[0], at[1], 0]);
const place = (s) => ({ pos: V.add(Q.rot(qy, s.pos), offL), rot: Q.norm(Q.mul(qy, s.rot)) }), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5), r4 = (x) => Math.round(x * 1e4) / 1e4;
const toWp = (p) => T.toW(p).map(r4), Wp = (p) => toWp(V.add(Q.rot(qy, p), offL)), Wv = (v) => Q.rot(qy, v).map(r4);
const sT = PL.SPEC_T(), nT = sT.bodies.length, RT = T.buildPhys(T.rig("gabriel"), sT), RR = T.buildPhys(T.rig("vinicius"), sT), nR = run.nR, h = 1 / 240, M = 78.9;
const pack = (P) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) });
const meta = run.meta || {}, fc = meta.firstContact ? Math.min(...["F2", "F3"].map(k => meta.firstContact[k] ? meta.firstContact[k].t : 1e9)) : 0.49, tFC = run.twin ? fc : (() => { for (const r of run.recs) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) return r.t; return fc; })();
const fcRef = fc, t0 = fcRef + +arg("from", "-0.5"), t1 = fcRef + +arg("to", "2.0"), actR = run.recipient.actR;
const runIn = run.runInT || [], byN = (arr) => { const m = new Map(); for (const f of arr) m.set(Math.round(f.t / h), f); return m; }, RI_T = byN(runIn), RI_R = byN(run.run1R || []);
const nearest = (m, n) => { if (m.has(n)) return m.get(n); let best = null, bd = 1e9; for (const [k, f] of m) { const d = Math.abs(k - n); if (d < bd) { bd = d; best = f; } } return best; };
const wireSk = (S) => ({ wire: WIRE.wireOf(S).map(pl => pl.map(toWp)), skel: WIRE.skelOf(S).map(sg => sg.map(toWp)) });
const FREC = arg("focus") ? JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("focus")))) : run, hide = !!run.twin;
const frames = []; let foc = null;
for (let n = Math.round(t0 / h); n <= Math.round(t1 / h); n++) { const t = n * h, rec = n >= 1 ? run.recs[Math.min(run.recs.length - 1, n - 1)] : null;
  const tackKin = n < 1, ST0 = tackKin ? (nearest(RI_T, n) || { S: run.recs[0].S.slice(nR) }).S : rec.S.slice(nR, nR + nT), recKin = n <= actR || !rec, SR0 = recKin ? nearest(RI_R, n).S : rec.S.slice(0, nR);
  const ST = ST0.map(place).map(s => hide ? { pos: V.add(s.pos, [0, -50, 0]), rot: s.rot } : s), SR = SR0.map(place), pT = T.toW(ST[0].pos), pR = T.toW(SR[0].pos);
  const fRec = n >= 1 ? FREC.recs[Math.min(FREC.recs.length - 1, n - 1)] : null, fT = (n < 1 ? (nearest(byN(FREC.runInT || []), n) || { S: FREC.recs[0].S.slice(nR) }).S : fRec.S.slice(nR, nR + nT))[0], fR = (n <= FREC.recipient.actR || !fRec ? nearest(byN(FREC.run1R || []), n).S : fRec.S.slice(0, nR))[0];
  const pTf = T.toW(place(fT).pos), pRf = T.toW(place(fR).pos), mid = [(pTf[0] + pRf[0]) / 2, -(pTf[2] + pRf[2]) / 2];
  foc = foc ? [foc[0] + (mid[0] - foc[0]) * (1 - Math.exp(-h / 0.25)), foc[1] + (mid[1] - foc[1]) * (1 - Math.exp(-h / 0.25))] : mid;
  const turf = rec ? rec.contacts.filter(c => c.kind.startsWith("turf")).map(c => { const side = c.a === "turf" ? c.b : c.a; if ((side[0] === "runner" && recKin) || (side[0] === "tackler" && tackKin)) return null; return { who: side[0], body: side[1], pts: c.points.map(p => Wp(p.p)), J: r5(c.Jn) }; }).filter(Boolean) : [];
  const cross = rec ? rec.contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => ({ a: c.a[1], b: c.b[1], pts: c.points.map(p => Wp(p.p)), N: r4(c.Jn / h), n: c.n ? Wv(c.n) : null })) : [];
  const vR = rec && !recKin ? V.sc(rec.chars.runner.P, 1 / M) : null, vT = rec && !tackKin ? V.sc(rec.chars.tackler.P, 1 / M) : null;
  const lines = [`t ${(t - fcRef).toFixed(3)} s from first player contact`, `recipient: ${recKin ? "RUN-1 animation (before takeover)" : "physical" + (vR ? `  v_h ${Math.hypot(vR[0], vR[2]).toFixed(2)} v_y ${vR[1].toFixed(2)} m/s` : "")}`, `${run.label}: ${tackKin ? "RUN-1 run-in" : vT ? `v_h ${Math.hypot(vT[0], vT[2]).toFixed(2)} m/s` : ""}`, cross.length ? `player contact: ${cross.map(c => c.a + "×" + c.b + " " + Math.round(c.N) + " N").slice(0, 3).join(", ")}` : ""].filter(Boolean);
  const wT = wireSk(ST), wR = wireSk(SR);
  frames.push({ n, t: r5(t - fcRef), tackler: pack(T.posePhys(RT, ST)), runner: pack(T.posePhys(RR, SR)), pel: rv(pT), pitch: rv(foc), turf, cross, wire: wT.wire, skel: wT.skel, wireR: wR.wire, skelR: wR.skel, hud: { lines, recKin, tackKin } }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
// viewer headings (rv1CloseCam: forward = (cos hd, 0, −sin hd) in viewer world) of the tackler's travel (+z local) and of the recipient's
const hdOf = (dl) => { const a = T.toW(V.add(Q.rot(qy, dl), offL)), o = T.toW(offL), d = [a[0] - o[0], 0, a[2] - o[2]]; return Math.atan2(-d[2], d[0]) * 180 / Math.PI; };
const headingT = hdOf([0, 0, 1]), headingR = hdOf(Q.rot(run.recipient.qR, [0, 0, 1]));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} }; M0.runs[key] = { frames: frames.length, label: run.label, cond: meta.cond, finalHash: run.finalHash, firstContactT: tFC, refT: fcRef, actR, yawDeg: yaw * 180 / Math.PI, at, headingT, headingR };
fs.writeFileSync(mf, JSON.stringify(M0, null, 1)); console.log(key, frames.length, "frames, first contact", tFC.toFixed(4), "ref", fcRef.toFixed(4), "headings T/R", headingT.toFixed(1), headingR.toFixed(1), "n0", frames[0].n);
