// LC-1 OFFICIAL 60 Hz criteria on page records (LC1_PREREG §4: LC-1b, LC-3, LC-4a/b/c, LC-5a/b/c + the reported quantities), V2 body mapped by the
// frozen mapping (R-K + RF-1, pcg_rev1 makeMapper) — the body that is promoted. Evaluated frames: speed fixtures [30, 258]; PI-1 records
// [10, first contact − 2] (no contact: closest approach − 1).
// usage (worktree root): V13_WT=<v1.3 tree> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../lc_eval.mjs <out.json> <dir:case,case,...> [<dir:...> ...]
import fs from "fs";
const M = await import(new URL("../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href); const { L, makeMapper, angVel, relRot } = M; const { V, Q, B, NB, loadAir } = L;
const G = 9.81, Mt = B.reduce((s, b) => s + b.mass, 0), LIM_V = 0.18, LIM_POS = 0.003, LIM_SLIP = 0.010;
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt), hl = (v) => Math.hypot(v[0], v[2]);
const sim2r = (p) => [p[0], p[2], -p[1]];
const q = (a, p) => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))].toFixed(4) : null; };
const st = (a) => ({ n: a.length, p50: q(a, 0.5), p90: q(a, 0.9), max: q(a, 1), min: q(a, 0) });
// whole-body inertia about the COM (3×3), I_world·w per body as pres_sources
const Iw = (S, i, w) => { const r = relRot(S, i), I = B[i].inertia, wl = Q.rot(Q.conj(r), w); return Q.rot(r, [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2])); };
function Iwb(S) { const c = comOf(S), cols = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => { let t = [0, 0, 0]; for (let i = 0; i < NB; i++) { const r = V.sub(comW(S, i), c); t = V.add(t, V.add(Iw(S, i, e), V.sc(V.cross(r, V.cross(e, r)), B[i].mass))); } return t; }); return cols; }
function solve3(A, b) { const m = [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]], det = (x) => x[0][0] * (x[1][1] * x[2][2] - x[1][2] * x[2][1]) - x[0][1] * (x[1][0] * x[2][2] - x[1][2] * x[2][0]) + x[0][2] * (x[1][0] * x[2][1] - x[1][1] * x[2][0]), D = det(m);
  return [0, 1, 2].map(c => { const n = m.map((r, i) => r.map((v, j) => (j === c ? b[i] : v))); return det(n) / D; }); }   // columns of A = images of the basis
const velB2 = (P, k, i) => V.sub(V.sc(V.sub(comW(P(k), i), comW(P(k - 1), i)), 90), V.sc(V.sub(comW(P(k - 1), i), comW(P(k - 2), i)), 30));
const velC = (P, k, i) => V.sc(V.sub(comW(P(k + 1), i), comW(P(k - 1), i)), 30);
const wB2 = (P, k, i) => V.sub(V.sc(angVel(P(k - 1)[i].rot, P(k)[i].rot), 1.5), V.sc(angVel(P(k - 2)[i].rot, P(k - 1)[i].rot), 0.5));
const wC = (P, k, i) => V.sc(angVel(P(k - 1)[i].rot, P(k + 1)[i].rot), 0.5);
function Lab(P, k, vf, wf) { const S = P(k), c = comOf(S); let vc = [0, 0, 0]; const v = [], w = []; for (let i = 0; i < NB; i++) { v[i] = vf(P, k, i); w[i] = wf(P, k, i); vc = V.add(vc, V.sc(v[i], B[i].mass / Mt)); }
  let Lt = [0, 0, 0]; for (let i = 0; i < NB; i++) Lt = V.add(Lt, V.add(V.cross(V.sub(comW(S, i), c), V.sc(V.sub(v[i], vc), B[i].mass)), Iw(S, i, w[i]))); return { L: Lt, vc, c }; }
const SEGB = { thigh: "thigh", shin: "shank", foot: "foot" };
const out = { prereg: "LC1_PREREG.md §4 (313280f)", limits: { v: LIM_V, pos: LIM_POS, slip: LIM_SLIP, F: [0, 4] }, records: {} };
const [OUT, ...SPECS] = process.argv.slice(2);
for (const spec of SPECS) { const [dir, list] = spec.split(":");
  for (const cs of list.split(",")) { const R = loadAir(dir, `${cs}_LOCO.json.gz`), mp = makeMapper(R, { knee: "RK", rf1: true }), cache = {}, P = (k) => (cache[k] || (cache[k] = mp.poseAt(k).S));
    const isSpeed = /^lc_v/.test(cs), ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), first = ev[0] || null, kt = R.pred.findIndex(x => x != null && x <= 0.25); let k0, k1;
    if (isSpeed) { k0 = 30; k1 = R.pres.length - 2; } else { k0 = 10; if (first) k1 = first.tick - 2; else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R.dnow.length; k++) if (R.dnow[k] != null && R.dnow[k] < mn) { mn = R.dnow[k]; kc = k; } k1 = (kc != null ? kc : R.pres.length - 2) - 1; } }
    k1 = Math.min(k1, R.pres.length - 2); const speed = Math.hypot(R.rows[k1][10], R.rows[k1][11]), idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i]));
    const legs = (k) => (R.pres[k].dg && R.pres[k].dg.legs) || {}, presContact = (k) => R.pres[k].feet.some(f => f.contact);
    const flight = (k) => { const l = legs(k); return l.R && l.L && !l.R.st && !l.L.st && !presContact(k); };
    // LC-1b: COM velocity estimators
    const e1h = [], e1v = []; for (let k = Math.max(k0, 2); k <= k1; k++) { const a = Lab(P, k, velB2, wB2), b = Lab(P, k, velC, wC); e1h.push(hl(V.sub(a.vc, b.vc))); e1v.push(Math.abs(a.vc[1] - b.vc[1])); }
    // LC-4b: vertical force; LC-4a: flights; LC-4c: per gait cycle
    const Fbw = [], com = {}; for (let k = k0 - 1; k <= k1 + 1; k++) com[k] = comOf(P(k)); for (let k = k0; k <= k1; k++) Fbw.push(1 + (com[k + 1][1] - 2 * com[k][1] + com[k - 1][1]) * 3600 / G);
    const flights = []; for (let k = k0; k <= k1; ) { if (!flight(k)) { k++; continue; } let e = k; while (e + 1 <= k1 && flight(e + 1)) e++; flights.push([k, e]); k = e + 1; }
    const fl4a = [], fl5c = []; let flShort = 0;
    for (const [a, b] of flights) { const n = b - a + 1; if (n < 3) { flShort++; continue; } const ts = [], ys = []; for (let k = a; k <= b; k++) { const t = (k - a) / 60; ts.push(t); ys.push(com[k] ? com[k][1] + G * t * t / 2 : comOf(P(k))[1] + G * t * t / 2); }
      const mt = ts.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, x) => s + x, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (ts[i] - mt) * (ys[i] - my); sxx += (ts[i] - mt) ** 2; } const bb = sxy / sxx, aa = my - bb * mt;
      let res = 0; for (let i = 0; i < n; i++) res = Math.max(res, Math.abs(ys[i] - (aa + bb * ts[i]))); fl4a.push({ k: [a, b], residMm: +(res * 1000).toFixed(2) });
      // LC-5c: angular momentum change over the flight → implied rotation at the farthest joint
      const La = Lab(P, a, velC, wC), Lb = Lab(P, b, velC, wC), S = P(a), c = comOf(S), I = Iwb(S), dL = V.sub(Lb.L, La.L), dW = solve3(I, dL); let rmax = 0; for (let i = 0; i < NB; i++) rmax = Math.max(rmax, V.dist(S[i].pos, c));
      fl5c.push({ k: [a, b], dispMm: +(rmax * V.len(dW) * ((b - a) / 60) / 2 * 1000).toFixed(2), dLNms: +V.len(dL).toFixed(3) }); }
    const cyc = []; { const ph = (k) => (R.pres[k].dg && R.pres[k].dg.loco ? R.pres[k].dg.loco.phase : null); let last = null; for (let k = k0 + 1; k <= k1; k++) { const p0 = ph(k - 1), p1 = ph(k); if (p0 != null && p1 != null && p1 < p0 - 0.5) { if (last != null) cyc.push(Math.abs(com[k][1] - com[last][1]) / ((k - last) / 60)); last = k; } } }
    // LC-5a / LC-5b
    const e5a = [], e5b = []; const facing = (k) => R.rows[k][12], rootYaw = (k) => { const m = R.pres[k].world[idx.root]; return Math.atan2(m[8], m[10]); }, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    for (let k = Math.max(k0, 2); k <= k1; k++) { const S = P(k), a = Lab(P, k, velB2, wB2), b = Lab(P, k, velC, wC), I = Iwb(S), dW = solve3(I, V.sub(a.L, b.L)); let m = 0; for (let i = 0; i < NB; i++) m = Math.max(m, V.len(V.cross(dW, V.sub(S[i].pos, a.c)))); e5a.push(m);
      const wr = wrap(rootYaw(k + 1) - rootYaw(k - 1)) * 30, wa = wrap(facing(k + 1) - facing(k - 1)) * 30, dw = [0, wr - wa, 0]; let m2 = 0; for (let i = 0; i < NB; i++) m2 = Math.max(m2, V.len(V.cross(dw, V.sub(S[i].pos, a.c)))); e5b.push(m2); }
    // LC-3: planted slip per stance (layer); V1.3: locked-foot slide while in contact (reported)
    const slips = [], travel = [], v13slide = [];
    for (const sd of ["L", "R"]) { let cur = null, eng = null; for (let k = k0; k <= k1; k++) { const lf = R.pres[k].lc && R.pres[k].lc.feet ? R.pres[k].lc.feet[sd] : null, df = R.pres[k].dg && R.pres[k].dg.feet ? R.pres[k].dg.feet[sd] : null;
        if (lf && lf.cont) { if (lf.mode === "engage") { if (!eng && lf.gRef) eng = { g0: lf.gRef, P: lf.P }; } if (lf.mode === "planted") { if (eng && lf.P) { travel.push(Math.hypot(lf.P[0] - eng.g0[0], lf.P[2] - eng.g0[2])); eng = null; } cur = Math.max(cur || 0, lf.slide || 0); } else if (cur != null) { slips.push(cur); cur = null; } }
        else if (df && df.contact && df.slide != null) v13slide.push(df.slide); }
      if (cur != null) slips.push(cur); }
    // reported: legs vs the simulation's own legs; contact agreement; pelvis offsets; CPU
    const segD = [], agree = []; for (let k = k0; k <= k1; k++) { const sb = R.simBody[k] && R.simBody[k][3]; if (!sb) continue; const S = P(k); let mx = 0;
      for (const g of sb.segs) { const bn = SEGB[g.seg]; if (!bn || !g.sd || g.name.startsWith("toe")) continue; const i = L.bi(bn + "_" + g.sd), a2 = sim2r(g.a), b2 = sim2r(g.b), p = comW(S, i), ab = V.sub(b2, a2), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a2), ab) / V.dot(ab, ab))), cl = V.add(a2, V.sc(ab, t)); mx = Math.max(mx, hl(V.sub(p, cl))); }
      segD.push(mx * 1000); for (const [n, sd] of [[0, "L"], [1, "R"]]) agree.push(R.pres[k].feet[n].contact === sb.legs[sd].planted ? 1 : 0); }
    const pel = R.pres.slice(k0, k1 + 1).map(f => (f.lc && f.lc.pel) || (f.dg ? [0, f.dg.pelvisOff, 0] : null)).filter(Boolean), cpu = (R.cpu || []).slice(k0, k1 + 1).map(c => c && c[0]).filter(x => x != null);
    const r = { set: R.set || null, cont: R.cont != null ? R.cont : null, speed: +speed.toFixed(2), frames: [k0, k1], gameplayHash: R.gameplayHash,
      LC1b: { h: st(e1h), v: st(e1v), pass: (q(e1h, 1) || 0) <= LIM_V && (q(e1v, 1) || 0) <= LIM_V },
      LC3: { stances: slips.length, maxMm: slips.length ? +(Math.max(...slips) * 1000).toFixed(2) : null, pass: slips.length ? Math.max(...slips) <= LIM_SLIP : null, engageTravelMm: st(travel.map(x => x * 1000)), v13LockedSlideMm: st(v13slide.map(x => x * 1000)) },
      LC4a: { flights: flights.length, evaluated: fl4a.length, shortFlights: flShort, maxResidMm: fl4a.length ? Math.max(...fl4a.map(x => x.residMm)) : null, pass: fl4a.length ? fl4a.every(x => x.residMm <= LIM_POS * 1000) : null },
      LC4b: { F: st(Fbw), pass: Fbw.every(x => x >= 0 && x <= 4) },
      LC4c: { cycles: cyc.length, maxMs: cyc.length ? +Math.max(...cyc).toFixed(4) : null, pass: cyc.length ? cyc.every(x => x <= 0.01) : null },
      LC5a: { e: st(e5a), pass: (q(e5a, 1) || 0) <= LIM_V }, LC5b: { e: st(e5b), pass: (q(e5b, 1) || 0) <= LIM_V },
      LC5c: { flights: fl5c.length, maxDispMm: fl5c.length ? Math.max(...fl5c.map(x => x.dispMm)) : null, pass: fl5c.length ? fl5c.every(x => x.dispMm <= LIM_POS * 1000) : null },
      reported: { legVsSimMm: st(segD), contactAgreement: agree.length ? +(agree.reduce((s, x) => s + x, 0) / agree.length).toFixed(3) : null, peakFbw: q(Fbw, 1), pelvisOffsetMm: pel.length ? { x: [+(Math.min(...pel.map(p => p[0])) * 1000).toFixed(1), +(Math.max(...pel.map(p => p[0])) * 1000).toFixed(1)], y: [+(Math.min(...pel.map(p => p[1])) * 1000).toFixed(1), +(Math.max(...pel.map(p => p[1])) * 1000).toFixed(1)], z: [+(Math.min(...pel.map(p => p[2])) * 1000).toFixed(1), +(Math.max(...pel.map(p => p[2])) * 1000).toFixed(1)] } : null, cpuMs: st(cpu) } };
    out.records[dir.split("/").slice(-2).join("/") + "/" + cs] = r;
    console.log(cs.padEnd(18), "cont", String(r.cont).padEnd(5), "v", r.speed, "| 1b", r.LC1b.pass ? "P" : "F", r.LC1b.h.max, r.LC1b.v.max, "| 3", r.LC3.pass == null ? "-" : r.LC3.pass ? "P" : "F", r.LC3.maxMm, "| 4a", r.LC4a.pass == null ? "-" : r.LC4a.pass ? "P" : "F", r.LC4a.maxResidMm, "(" + r.LC4a.evaluated + "/" + r.LC4a.flights + ")", "| 4b", r.LC4b.pass ? "P" : "F", r.LC4b.F.min, r.LC4b.F.max, "| 4c", r.LC4c.pass == null ? "-" : r.LC4c.pass ? "P" : "F", r.LC4c.maxMs, "| 5a", r.LC5a.pass ? "P" : "F", r.LC5a.e.max, "| 5b", r.LC5b.pass ? "P" : "F", r.LC5b.e.max, "| 5c", r.LC5c.pass == null ? "-" : r.LC5c.pass ? "P" : "F", r.LC5c.maxDispMm, "| legVsSim p50/max", r.reported.legVsSimMm.p50, r.reported.legVsSimMm.max, "agree", r.reported.contactAgreement, "cpu", r.reported.cpuMs.p50);
  } }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
