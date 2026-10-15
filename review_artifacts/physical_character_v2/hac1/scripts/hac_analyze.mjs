// HAC-1 analysis (reads the battery's records; nothing is simulated). For every disturbed case, the counterfactual against its no-contact twin
// (identical initial state): what the disturbance actually changed.
//   PUSH / SH:  displacement and lateral velocity against the twin at +0.1 … +2.0 s; viability, commitment, locomotion weight; regional authority
//               minima; the recovery step (largest applied hip abduction / flexion offsets, emergency steps); falls; protect onset.
//   PVP:        per phase and tackler: the struck foot (load, slip, displacement from its landing point, time to unload) against the twin's; the
//               support duration of that stance; the far (free) foot's next touchdown; COM velocity, pelvis height, trunk tilt; viability and
//               commitment; leg authority; falls.
// usage (worktree root): node hac_analyze.mjs --runs <dir> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, bi } = L;
const arg = (k) => process.argv[process.argv.indexOf("--" + k) + 1], dir = arg("runs"), h = 1 / 240, BW = L.M * 9.81, r2 = (x) => x == null ? null : Math.round(x * 100) / 100, r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000;
const rd = (k) => fs.existsSync(`${dir}/${k}.json.gz`) ? L.readGz(`${dir}/${k}.json.gz`) : null;
const sole = (S, s) => { const f = S[bi("foot_" + s)]; return V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])); };
const loads = (r, role = "runner") => { const o = { L: 0, R: 0 }; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && /^foot_/.test(x[1])) o[x[1].slice(-1)] += c.Jn / h / BW; } return o; };
const fallOf = (o, role = "runner") => { for (const r of o.recs) for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && !/^foot_/.test(x[1])) return { n: Math.round(r.t / h), body: x[1] }; } return null; };
const firstN = (o) => { for (const r of o.recs) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) return Math.round(r.t / h); return null; };
const lawStats = (lg, n0, n1) => { const rows = (lg || []).filter(x => x && x.n >= n0 && x.n <= n1); if (!rows.length) return null; const aMin = {}; let vmin = 1, cAt = null, offMax = 0, em = 0, wMin = 1;
  for (const x of rows) { vmin = Math.min(vmin, x.V.f); wMin = Math.min(wMin, x.V.wLoc); if (x.V.C > 0.5 && cAt == null) cAt = x.n; for (const [k, a] of Object.entries(x.a)) aMin[k] = Math.min(aMin[k] ?? 1, a); for (const s of ["L", "R"]) offMax = Math.max(offMax, Math.abs(x.off[s][0]), Math.abs(x.off[s][1])); if (x.cand && x.cand.em) em++; }
  return { vMin: r3(vmin), wLocMin: r3(wMin), commitStep: cAt, authorityMin: Object.fromEntries(Object.entries(aMin).map(([k, v]) => [k, r3(v)])), placementOffsetMaxDeg: r2(offMax), emergencyStepSteps: em }; };
const out = { note: "HAC-1 analysis: disturbed cases against their no-contact twins", push: {}, sh: {}, pvp: {} };
const NC = rd("NC"), qR = [0, 0, 0, 1], lft = [-1, 0, 0], fwd = [0, 0, 1];
// ── PUSH (A alone) and the two-runner SH fixture (A) ──
for (const fam of ["PUSH", "SH"]) for (const sev of ["BRUSH", "BUMP", "STRONG"]) for (const opp of ["", "_OPP"]) { const nm = `${fam}_${sev}${opp}`, o = rd(nm); if (!o) continue;
  const n0 = fam === "PUSH" ? Math.round(o.push.t0 / h) : firstN(o), f = fallOf(o), fB = fam === "SH" ? fallOf(o, "tackler") : null;
  const ser = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0].map(dt => { const n = n0 + Math.round(dt / h); if (n > o.recs.length || n > NC.recs.length) return null; const S = o.recs[n - 1].S.slice(0, 14), T = NC.recs[n - 1].S.slice(0, 14), d = V.sub(L.comOf(S), L.comOf(T)), v = V.sc(o.recs[n - 1].chars.runner.P, 1 / L.M), vt = V.sc(NC.recs[n - 1].chars.runner.P, 1 / L.M);
    return { dt, offLineLeftCm: r2(V.dot(d, lft) * 100), behindCm: r2(-V.dot(d, fwd) * 100), latVelLeft: r2(V.dot(v, lft)), latVelLeftTwin: r2(V.dot(vt, lft)), pelvisHeight: r3(S[0].pos[1]), pelvisHeightTwin: r3(T[0].pos[1]) }; }).filter(Boolean);
  const rec = (() => { if (f) return null; const ser2 = []; for (let n = n0; n < Math.min(o.recs.length, NC.recs.length); n += 6) { const v = V.dot(V.sc(o.recs[n - 1].chars.runner.P, 1 / L.M), lft) - V.dot(V.sc(NC.recs[n - 1].chars.runner.P, 1 / L.M), lft); ser2.push([n, v]); } const pk = Math.max(...ser2.map(x => Math.abs(x[1]))), back = ser2.find(x => x[0] > n0 + 12 && Math.abs(x[1]) < 0.1 * pk + 0.05); return back ? r3((back[0] - n0) * h) : null; })();
  (fam === "PUSH" ? out.push : out.sh)[nm] = { hash: o.finalHash, disturbanceStep: n0, disturbance: fam === "PUSH" ? { impulseNs: Math.abs(o.push.J[0]), body: o.push.body, durS: o.push.dur } : { firstContactS: r3(n0 * h) }, fall: f ? { s: r3(f.n * h), afterS: r3((f.n - n0) * h), body: f.body } : null,
    fallB: fB ? { s: r3(fB.n * h), body: fB.body } : null, lateralVelocityBackToTwinAfterS: rec, series: ser, law: lawStats(o.lawR, n0, n0 + 480) }; }
// ── PVP ──
for (const ph of ["", "_EARLY", "_UNLOAD"]) { const tw = rd("PVP_TWIN" + ph); if (!tw) continue;
  for (const k of ["F2", "F3"]) { const nm = `PVP_${k}${ph}`, o = rd(nm); if (!o) continue; const n0 = firstN(o), qP = o.intentR.qR, fw = Q.rot(qP, [0, 0, 1]), lf = Q.rot(qP, [-1, 0, 0]), dec = (v) => [r3(V.dot(v, fw)), r3(V.dot(v, lf)), r3(v[1])];
    // the struck (right) foot: landing point = its position at the first loaded step of this stance (search back from contact)
    let nl = n0; while (nl > 1 && loads(o.recs[nl - 2]).R > 0.05) nl--; let nlT = n0; while (nlT > 1 && loads(tw.recs[nlT - 2]).R > 0.05) nlT--;
    const land = sole(o.recs[nl - 1].S.slice(0, 14), "R"), landT = sole(tw.recs[nlT - 1].S.slice(0, 14), "R");
    let unl = null; for (let n = n0; n < o.recs.length; n++) if (loads(o.recs[n - 1]).R < 0.05) { unl = n; break; } let unlT = null; for (let n = n0; n < tw.recs.length; n++) if (loads(tw.recs[n - 1]).R < 0.05) { unlT = n; break; }
    let far = null; for (let n = n0; n < o.recs.length; n++) if (loads(o.recs[n - 1]).L > 0.2) { far = n; break; } let farT = null; for (let n = n0; n < tw.recs.length; n++) if (loads(tw.recs[n - 1]).L > 0.2) { farT = n; break; }
    const ser = [0, 25, 50, 100, 150, 200, 300, 500, 700, 1000].map(ms => { const n = n0 + Math.round(ms / 1000 / h); if (n > o.recs.length) return null; const S = o.recs[n - 1].S.slice(0, 14), T = tw.recs[n - 1].S.slice(0, 14), x = o.lawR[n] || {}, lo = loads(o.recs[n - 1]), lt = loads(tw.recs[n - 1]);
      return { ms, struckFootFromLanding: dec(V.sub(sole(S, "R"), land)), struckFootFromLandingTwin: dec(V.sub(sole(T, "R"), landT)), loadBW: { R: r2(lo.R), L: r2(lo.L) }, loadTwinBW: { R: r2(lt.R), L: r2(lt.L) },
        comV: dec(V.sc(o.recs[n - 1].chars.runner.P, 1 / L.M)), comVTwin: dec(V.sc(tw.recs[n - 1].chars.runner.P, 1 / L.M)), pelvisHeight: r3(S[0].pos[1]), pelvisHeightTwin: r3(T[0].pos[1]),
        V: x.V ? x.V.f : null, C: x.V ? x.V.C : null, wLoc: x.V ? x.V.wLoc : null, legAuth: x.a ? [r2(x.a.legL), r2(x.a.legR)] : null, integR: x.sup ? x.sup.iR : null, lost: null }; }).filter(Boolean);
    const f = fallOf(o), ft = fallOf(tw);
    out.pvp[nm] = { hash: o.finalHash, phase: ph ? ph.slice(1) : "CANON", firstContactStep: n0, struckFoot: { landingStep: nl, unloadAfterS: unl ? r3((unl - n0) * h) : null, unloadTwinAfterS: unlT ? r3((unlT - n0) * h) : null, supportDurationS: unl ? r3((unl - nl) * h) : null, supportDurationTwinS: unlT ? r3((unlT - nlT) * h) : null },
      farFootDownAfterS: far ? r3((far - n0) * h) : null, farFootDownTwinAfterS: farT ? r3((farT - n0) * h) : null, fall: f ? { s: r3(f.n * h), afterS: r3((f.n - n0) * h), body: f.body } : null, twinFall: ft, series: ser, law: lawStats(o.lawR, n0, n0 + 400) }; } }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ push: Object.fromEntries(Object.entries(out.push).map(([k, v]) => [k, { fall: v.fall, rec: v.lateralVelocityBackToTwinAfterS, off1s: v.series.find(x => x.dt === 1)?.offLineLeftCm, plMax: v.law?.placementOffsetMaxDeg }])),
  pvp: Object.fromEntries(Object.entries(out.pvp).map(([k, v]) => [k, { fall: v.fall, unl: v.struckFoot.unloadAfterS, unlT: v.struckFoot.unloadTwinAfterS, far: v.farFootDownAfterS, farT: v.farFootDownTwinAfterS, commit: v.law?.commitStep }])) }, null, 1));
