// HYBRID-RUN-1 analysis (reads the scene records and the intents; nothing is simulated). Writes one evidence JSON:
//   A  NC: fidelity to RUN-1. The COM error components over time (lateral / vertical / forward, in RUN-1's heading frame), pelvis orientation
//      error, joint RMS per region, physical touchdowns against RUN-1's, planted-foot slip, stance loads, regional authority, balance-moment usage.
//   B  SH: per severity: the first contact, every contact pair, the impulse and peak force on A, A's deviation from NC (displacement, trunk tilt),
//      regional authority minima and recovery for A and B, falls (first non-boot turf contact).
//   C  PVP: per tackler: the first contact, the struck (right) foot against the TWIN, the turf loads (support loss), the COM velocity against the
//      TWIN, the struck leg's authority, falls, and the tackler's speed against its solo run. Compared with PVP-1's handed-off recipient.
// usage (worktree root): node hr_analyze.mjs --runs <dir> --out <json> [--solo2 <SP2F2 5.0 record> --solo3 <SP2F3 5.0 record>]
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, B, bi } = L, HS = await import(new URL("./hr_scenes.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, dir = arg("runs");
const h = 1 / 240, BW = L.M * 9.81, D = 180 / Math.PI, r2 = (x) => x == null ? null : Math.round(x * 100) / 100, r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000;
const rd = (k) => L.readGz(`${dir}/${k}.json.gz`), sole = (S, s) => { const f = S[bi("foot_" + s)]; return V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])); };
const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))) * D, tilt = (q) => Math.acos(Math.max(-1, Math.min(1, Q.rot(q, [0, 1, 0])[1]))) * D;
const loadsOf = (r, role) => { const o = { L: 0, R: 0 }; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && /^foot_/.test(x[1])) o[x[1].slice(-1)] += c.Jn / h / BW; } return o; };
const fallOf = (o, role, t0 = 0) => { for (const r of o.recs) { if (r.t < t0) continue; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && !/^foot_/.test(x[1])) return { t: r3(r.t), body: x[1] }; } } return null; };
const firstCross = (o) => { for (const r of o.recs) { const cs = r.contacts.filter(c => c.kind === "cross" && c.Jn > 0); if (cs.length) return { t: r3(r.t), n: Math.round(r.t / h), pairs: cs.map(c => `${c.a[0]}:${c.a[1]} × ${c.b[0]}:${c.b[1]}`) }; } return null; };
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const out = { note: "HYBRID-RUN-1 analysis", A: {}, B: {}, C: {} };
// ── A ──
{ const o = rd("NC"), I = HS.intentNC(o.recs.length + 10), qR = I.qR, fwd = Q.rot(qR, [0, 0, 1]), lft = Q.rot(qR, [-1, 0, 0]), dec = (v) => [r3(V.dot(v, lft)), r3(v[1]), r3(V.dot(v, fwd))];
  const ser = [], pel = [], regs = {}, tac = [], tsup = []; let amin = 1;
  for (let n = 1; n <= o.recs.length; n++) { const r = o.recs[n - 1], S0 = r.S.slice(0, 14), lg = o.lawR[n] || {}; const ce = V.sub(L.comOf(S0), I.com(n)); if (n % 24 === 0) ser.push([r3(n * h), ...dec(ce)]); pel.push(ang(S0[0].rot, I.pose(n)[0].rot));
    for (const [k, e] of Object.entries(lg.e || {})) (regs[k] = regs[k] || []).push(e); for (const a of Object.values(lg.a || {})) amin = Math.min(amin, a); if (lg.Tac) tac.push(Math.hypot(...lg.Tac)); if (lg.Tsup) tsup.push(Math.hypot(...lg.Tsup)); }
  // touchdowns: physical (load > 200 N rising) vs RUN-1 stance starts
  const tdP = { L: [], R: [] }, prev = { L: false, R: false }; for (let n = 1; n <= o.recs.length; n++) { const lo = loadsOf(o.recs[n - 1], "runner"); for (const s of ["L", "R"]) { const on = lo[s] * BW > 200; if (on && !prev[s]) tdP[s].push(n); prev[s] = on; } }
  const tdI = { L: I.stances.L.map(x => x[0]).filter(x => x > 0 && x < o.recs.length), R: I.stances.R.map(x => x[0]).filter(x => x > 0 && x < o.recs.length) };
  const tdDiff = []; for (const s of ["L", "R"]) for (const a of tdI[s]) { const p = tdP[s].reduce((b, x) => Math.abs(x - a) < Math.abs(b - a) ? x : b, 1e9); if (Math.abs(p - a) < 40) tdDiff.push(p - a); }
  // planted-foot slip: horizontal travel of a boot while it carries > 0.5 BW
  let slipMax = 0; for (const s of ["L", "R"]) { let p0 = null; for (let n = 1; n <= o.recs.length; n++) { const r = o.recs[n - 1], lo = loadsOf(r, "runner")[s], p = sole(r.S.slice(0, 14), s); if (lo > 0.5) { if (!p0) p0 = p; slipMax = Math.max(slipMax, Math.hypot(p[0] - p0[0], p[2] - p0[2])); } else p0 = null; } }
  const last = ser[ser.length - 1];
  out.A = { hash: o.finalHash, steps: o.recs.length, falls: fallOf(o, "runner"), comError_cm_series: ser.map(x => [x[0], r2(x[1] * 100), r2(x[2] * 100), r2(x[3] * 100)]), forwardLag_cm_per_s: r2(-last[3] * 100 / last[0]),
    pelvisErrDeg: { median: r2(pct(pel, 0.5)), p95: r2(pct(pel, 0.95)), max: r2(Math.max(...pel)) }, jointRmsDeg: Object.fromEntries(Object.entries(regs).map(([k, v]) => [k, { median: r2(pct(v, 0.5)), p95: r2(pct(v, 0.95)), max: r2(Math.max(...v)) }])),
    touchdownVsRun1_frames: { values: tdDiff, mean: r2(tdDiff.reduce((a, b) => a + b, 0) / tdDiff.length), min: Math.min(...tdDiff), max: Math.max(...tdDiff) }, plantedFootSlipMaxM: r3(slipMax), minAuthority: r3(amin),
    balanceMoment: { animationNm: { median: r2(pct(tac, 0.5)), p95: r2(pct(tac, 0.95)), max: r2(Math.max(...tac)) }, supportedNm: { median: r2(pct(tsup, 0.5)), p95: r2(pct(tsup, 0.95)), max: r2(Math.max(...tsup)) } } }; }
// ── B ──
{ const nc = rd("NC"), I = HS.intentNC(720), lft = Q.rot(I.qR, [-1, 0, 0]), fwd = Q.rot(I.qR, [0, 0, 1]);
  for (const sev of ["BRUSH", "BUMP", "STRONG"]) { const o = rd("SH_" + sev), fc = firstCross(o), pairs = {}; let J = [0, 0, 0], pk = 0;
    for (const r of o.recs) for (const c of r.contacts) { if (c.kind !== "cross" || !(c.Jn > 0)) continue; const key = c.a[1] + "×" + c.b[1]; pairs[key] = pairs[key] || { first: r3(r.t), last: 0, Ns: 0 }; pairs[key].last = r3(r.t); pairs[key].Ns = r2(pairs[key].Ns + c.Jn); const onA = c.a[0] === "runner" ? V.sc(c.J2, -1) : c.J2; J = V.add(J, onA); pk = Math.max(pk, c.Jn / h); }
    const ser = [0.25, 0.5, 1.0, 1.5].map(dt => { const n = fc.n + Math.round(dt / h); if (n > o.recs.length) return null; const r = o.recs[n - 1], rn = nc.recs[n - 1], d = V.sub(L.comOf(r.S.slice(0, 14)), L.comOf(rn.S.slice(0, 14))), vA = V.sc(r.chars.runner.P, 1 / L.M), vN = V.sc(rn.chars.runner.P, 1 / L.M);
      return { dt, A_lateral_cm: r2(V.dot(d, lft) * 100), A_forward_cm: r2(V.dot(d, fwd) * 100), A_lateralV: r2(V.dot(vA, lft)), NC_lateralV: r2(V.dot(vN, lft)), A_trunkTilt: r2(tilt(r.S[bi("thorax")].rot)), NC_trunkTilt: r2(tilt(rn.S[bi("thorax")].rot)) }; }).filter(Boolean);
    const amin = (log) => { const m = {}; for (const x of log || []) for (const [k, a] of Object.entries(x.a || {})) if (a < (m[k]?.a ?? 1)) m[k] = { a: r3(a), t: r3(x.n * h) }; return m; };
    const recover = (log, reg) => { let low = null; for (const x of log || []) { const a = x.a && x.a[reg]; if (a == null) continue; if (a < 0.6 && low == null) low = x.n; if (low != null && a > 0.9) return r3((x.n - low) * h); } return low == null ? "not below 0.6" : "not recovered"; };
    out.B[sev] = { hash: o.finalHash, theta: o.scene.theta, tcPlanned: o.scene.tc, firstContact: fc, pairs, impulseOnA_Ns: { lateralLeft: r2(V.dot(J, lft)), vertical: r2(J[1]), forward: r2(V.dot(J, fwd)) }, peakForceN: Math.round(pk), A_vsNC: ser,
      authorityMin: { A: amin(o.lawR), B: amin(o.lawT) }, armRecoveryS: { A_armR: recover(o.lawR, "armR"), B_armL: recover(o.lawT, "armL") }, falls: { A: fallOf(o, "runner"), B: fallOf(o, "tackler") } }; } }
// ── C ──
{ const tw = rd("PVP_TWIN"), qR = tw.intentR.qR, fwd = Q.rot(qR, [0, 0, 1]), lft = Q.rot(qR, [-1, 0, 0]), dec = (v) => [r2(V.dot(v, fwd)), r2(V.dot(v, lft)), r2(v[1])];
  const solo = { F2: arg("solo2") ? L.readGz(arg("solo2")) : null, F3: arg("solo3") ? L.readGz(arg("solo3")) : null };
  out.C.TWIN = { hash: tw.finalHash, falls: fallOf(tw, "runner") };
  for (const k of ["F2", "F3"]) { const o = rd("PVP_" + k), fc = firstCross(o), S0 = o.recs[fc.n - 1].S.slice(0, 14), T0 = tw.recs[fc.n - 1].S.slice(0, 14), pairs = {};
    for (const r of o.recs) for (const c of r.contacts) { if (c.kind !== "cross" || !(c.Jn > 0)) continue; const rA = c.a[0] === "runner", key = `${rA ? c.b[1] : c.a[1]} → ${rA ? c.a[1] : c.b[1]}`; pairs[key] = pairs[key] || { firstMs: Math.round((r.t - fc.t) * 1000), lastMs: 0, peakN: 0 }; pairs[key].lastMs = Math.round((r.t - fc.t) * 1000); pairs[key].peakN = Math.max(pairs[key].peakN, Math.round(c.Jn / h)); }
    const ser = [0, 25, 50, 100, 150, 200, 300, 500, 750, 1000].map(ms => { const n = fc.n + Math.round(ms / 1000 / h); if (n > o.recs.length) return null; const r = o.recs[n - 1], t = tw.recs[n - 1], Sa = r.S.slice(0, 14), St = t.S.slice(0, 14), la = o.lawR[n] || {}, lr = loadsOf(r, "runner"), lt = loadsOf(t, "runner");
      const soloV = solo[k] ? (() => { const s = solo[k].recs[n - 1].chars.tackler.P; return r2(Math.hypot(s[0], s[2]) / L.M); })() : null;
      return { ms, struckFoot: dec(V.sub(sole(Sa, "R"), sole(S0, "R"))), struckFootTwin: dec(V.sub(sole(St, "R"), sole(T0, "R"))), loadBW: { R: r2(lr.R), L: r2(lr.L) }, loadTwinBW: { R: r2(lt.R), L: r2(lt.L) }, comV: dec(V.sc(r.chars.runner.P, 1 / L.M)), comVTwin: dec(V.sc(t.chars.runner.P, 1 / L.M)),
        pelvisHeight: r2(Sa[0].pos[1]), pelvisHeightTwin: r2(St[0].pos[1]), trunkTilt: r2(tilt(Sa[bi("thorax")].rot)), trunkTiltTwin: r2(tilt(St[bi("thorax")].rot)), authority: la.a, tacklerVh: r2(Math.hypot(r.chars.tackler.P[0], r.chars.tackler.P[2]) / L.M), tacklerVhSolo: soloV }; }).filter(Boolean);
    let noSup = null; for (const r of o.recs) { if (r.t < fc.t) continue; const lo = loadsOf(r, "runner"); if (lo.L + lo.R < 0.05) { noSup = r3(r.t - fc.t); break; } }
    let farDown = null, off = false; for (const r of o.recs) { if (r.t < fc.t) continue; const lo = loadsOf(r, "runner").L; if (lo < 0.02) off = true; else if (off || lo > 0.1) { farDown = r3(r.t - fc.t); break; } }
    let farTw = null; off = false; for (const r of tw.recs) { if (r.t < fc.t) continue; const lo = loadsOf(r, "runner").L; if (lo < 0.02) off = true; else if (off || lo > 0.1) { farTw = r3(r.t - fc.t); break; } }
    const f = fallOf(o, "runner", fc.t); out.C[k] = { hash: o.finalHash, firstContact: fc, pairs, series: ser, noFootSupportAfterS: noSup, farFootDownAfterS: farDown, farFootDownTwinAfterS: farTw, fall: f ? { ...f, afterContactS: r3(f.t - fc.t) } : null }; } }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ A: { lag: out.A.forwardLag_cm_per_s, pelvis: out.A.pelvisErrDeg, td: out.A.touchdownVsRun1_frames, slip: out.A.plantedFootSlipMaxM, amin: out.A.minAuthority, falls: out.A.falls, bm: out.A.balanceMoment },
  B: Object.fromEntries(Object.entries(out.B).map(([k, v]) => [k, { fc: v.firstContact.t, J: v.impulseOnA_Ns, pk: v.peakForceN, falls: v.falls, rec: v.armRecoveryS, A1: v.A_vsNC[2] }])), C: Object.fromEntries(Object.entries(out.C).map(([k, v]) => [k, { fc: v.firstContact && v.firstContact.t, fall: v.fall || v.falls, noSup: v.noFootSupportAfterS, far: v.farFootDownAfterS, farTw: v.farFootDownTwinAfterS }])) }, null, 1));
