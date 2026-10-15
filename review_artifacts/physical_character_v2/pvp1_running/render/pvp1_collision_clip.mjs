// PVP-1 COLLISION REVIEW: clip data (presentation only: reads the frozen records, writes clip data; nothing is re-simulated, interpolated or amplified).
// pvp1_clip.mjs's drawing (both characters on MC-1P at their actual V2 joints: the tackler as gabriel, the recipient as vinicius; the same rigid
// presentation placement), plus what the collision review needs per frame:
//   cam      camera target = the 3-D midpoint of the two players' COMs (exponentially smoothed, τ 0.06 s; --tgtDy shifts it vertically, default 0) and the tackler's heading frame (fwd = its travel, left = its left) in viewer-world coordinates. The capture places the eye
//            at a fixed azimuth / elevation / distance from that target, so the collision stays large and centred
//   coms     both COMs (from the recorded body states)
//   feet     the recipient's sole centres (struck = RIGHT) and each boot's turf load (BW) this step; tboot = the tackler's tackling (right) sole centre
//   cross    every player–player contact this step: points, the normal (the direction of the normal impulse ON THE RECIPIENT), the impulse on the
//            recipient as a force (N; J / h), the bodies (recipient body × tackler body)
//   first    the FIRST player–player contact (step, points, bodies), carried on every later frame; `isFirst` marks the exact frame
// The TWIN (--focus <the F2 record>) uses the F2 run's camera target path; its parked tackler is not drawn.
// usage (worktree root): LV2_ARCHIVE=<tag archive> node .../pvp1_collision_clip.mjs --run <rec.json.gz> --key <id> --out <dir> [--focus <rec>] [--from -0.3 --to 0.75]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const T = await import(new URL("../../trc1/scripts/trc1_retarget.mjs", import.meta.url).href), { PL, V, Q } = T;
const WIRE = await import(new URL("../../slide_phys1/render/sp_wire.mjs", import.meta.url).href), L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), run = rd(arg("run")), key = arg("key"), OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const yaw = +arg("yaw", "90") * Math.PI / 180, at = arg("at", "44,34").split(",").map(Number), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], offL = PL.pitchToLocal([at[0], at[1], 0]);
const place = (s) => ({ pos: V.add(Q.rot(qy, s.pos), offL), rot: Q.norm(Q.mul(qy, s.rot)) }), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5), r4 = (x) => Math.round(x * 1e4) / 1e4;
const toWp = (p) => T.toW(p).map(r4), Wp = (p) => toWp(V.add(Q.rot(qy, p), offL)), O0 = T.toW(offL), Wv = (v) => { const a = T.toW(V.add(Q.rot(qy, v), offL)); return [a[0] - O0[0], a[1] - O0[1], a[2] - O0[2]].map(r4); };
const sT = PL.SPEC_T(), nT = sT.bodies.length, RT = T.buildPhys(T.rig("gabriel"), sT), RR = T.buildPhys(T.rig("vinicius"), sT), nR = run.nR, h = 1 / 240, BW = L.M * 9.81, B = L.B, bi = L.bi;
const pack = (P) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) });
const firstOf = (o) => { for (const r of o.recs) { const cs = r.contacts.filter(c => c.kind === "cross" && c.Jn > 0); if (cs.length) return { n: Math.round(r.t / h), t: r.t, cs }; } return null; };
const FREC = arg("focus") ? rd(arg("focus")) : run, hide = !!run.twin, FC0 = firstOf(FREC), F1 = hide ? null : firstOf(run), nC = FC0.n, t0 = +arg("from", "-0.3"), t1 = +arg("to", "0.75");
const byN = (arr) => { const m = new Map(); for (const f of arr || []) m.set(Math.round(f.t / h), f); return m; }, nearest = (m, n) => { if (m.has(n)) return m.get(n); let best = null, bd = 1e9; for (const [k, f] of m) { const d = Math.abs(k - n); if (d < bd) { bd = d; best = f; } } return best; };
const statesOf = (o, n) => { const rec = n >= 1 ? o.recs[Math.min(o.recs.length - 1, n - 1)] : null, tk = n < 1, rk = n <= o.recipient.actR || !rec;
  return { rec, tackKin: tk, recKin: rk, ST: tk ? (nearest(byN(o.runInT), n) || { S: o.recs[0].S.slice(nR) }).S : rec.S.slice(nR, nR + nT), SR: rk ? nearest(byN(o.run1R), n).S : rec.S.slice(0, nR) }; };
const fwdW = Wv([0, 0, 1]), leftW = Wv([1, 0, 0]);
const wireSk = (S) => ({ wire: WIRE.wireOf(S).map(pl => pl.map(toWp)), skel: WIRE.skelOf(S).map(sg => sg.map(toWp)) });
const sole = (S, s) => { const f = S[bi("foot_" + s)]; return V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])); };
const firstPack = F1 ? { n: F1.n, pts: F1.cs.flatMap(c => c.points.map(p => Wp(p.p))), pairs: F1.cs.map(c => { const rA = c.a[0] === "runner"; return [rA ? c.a[1] : c.b[1], rA ? c.b[1] : c.a[1]]; }) } : null;
const TGT_DY = +arg("tgtDy", "0.0"), frames = []; let tg = null, sep = null;
for (let n = nC + Math.round(t0 / h); n <= nC + Math.round(t1 / h); n++) { const A = statesOf(run, n), Fz = statesOf(FREC, n), rec = A.rec;
  const ST = A.ST.map(place).map(s => hide ? { pos: V.add(s.pos, [0, -50, 0]), rot: s.rot } : s), SR = A.SR.map(place);
  // camera target: the midpoint of the two COMs of the focus record (own record for F2 / F3)
  const cT = L.comOf(Fz.ST), cR = L.comOf(Fz.SR), mid = toWp(place({ pos: V.add(V.sc(V.add(cT, cR), 0.5), [0, TGT_DY, 0]), rot: [0, 0, 0, 1] }).pos);
  tg = tg ? tg.map((x, i) => x + (mid[i] - x) * (1 - Math.exp(-h / 0.06))) : mid;
  const sepNow = Math.hypot(cT[0] - cR[0], cT[2] - cR[2]); sep = sep == null ? sepNow : sep + (sepNow - sep) * (1 - Math.exp(-h / 0.06));
  const comT = hide ? null : Wp(L.comOf(A.ST)), comR = Wp(L.comOf(A.SR));
  const loads = { L: 0, R: 0 }; if (rec && !A.recKin) for (const c of rec.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === "runner" && /^foot_/.test(x[1])) loads[x[1].slice(-1)] += c.Jn / h / BW; }
  const feet = ["R", "L"].map(s => ({ side: s, p: Wp(sole(A.SR, s)), load: r4(loads[s]), kin: A.recKin }));
  const tboot = hide ? null : Wp(sole(A.ST, "R"));
  const cross = rec && !hide ? rec.contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => { const rA = c.a[0] === "runner", nOnR = rA ? V.sc(c.n, -1) : c.n, JonR = rA ? V.sc(c.J2, -1) : c.J2;
    return { r: rA ? c.a[1] : c.b[1], t: rA ? c.b[1] : c.a[1], pts: c.points.map(p => Wp(p.p)), n: Wv(nOnR), F: Wv(V.sc(JonR, 1 / h)), N: Math.round(c.Jn / h) }; }) : [];
  const wT = hide ? { wire: [], skel: [] } : wireSk(ST), wR = wireSk(SR);
  frames.push({ n, t: r5((n - nC) * h), ms: Math.round((n - nC) * h * 1000), tackler: pack(T.posePhys(RT, ST)), runner: pack(T.posePhys(RR, SR)), pel: rv(T.toW(ST[0].pos)), pitch: [tg[0], -tg[2]], cam: { tgt: tg.map(r4), fwd: fwdW, left: leftW, sep: r4(sep) },
    coms: { T: comT, R: comR }, feet, tboot, cross, first: firstPack && n >= firstPack.n ? firstPack : null, isFirst: !!firstPack && n === firstPack.n, wire: wT.wire, skel: wT.skel, wireR: wR.wire, skelR: wR.skel,
    hud: { recKin: A.recKin, tackKin: A.tackKin, label: run.label } }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} };
M0.runs[key] = { frames: frames.length, label: run.label, finalHash: run.finalHash, firstContactStep: F1 ? F1.n : null, focusFirstContactStep: nC, firstPairs: firstPack ? firstPack.pairs : null, n0: frames[0].n, n1: frames[frames.length - 1].n };
fs.writeFileSync(mf, JSON.stringify(M0, null, 1)); console.log(key, frames.length, "frames n", frames[0].n, "…", frames[frames.length - 1].n, "first contact step", F1 && F1.n, JSON.stringify(firstPack && firstPack.pairs));
