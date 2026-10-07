// ═══ physchar2/tools/fb_eval.mjs — evaluation of the 1A / 1B validation (e2/FB1A_TR1B_PREREG.md §4; written with the freeze, before any battery run). Configurations BASE (PSTAR5CH),
// AB (PSTAR5CHAB), F = AB + 1A (PSTAR5CHABF), T = AB + 1B (PSTAR5CHABT), FT (PSTAR5CHABFT). The AB2 contract items reuse tools/ab2_eval.mjs's run metrics and definitions verbatim (copied
// below; AB2-7 is evaluated for the configuration under test — A alone is not part of this battery; C-1 … C-3 need A / B and are not part of 1A-1). Records are processed one run
// group (body, leg, rate, trajectory: 5 configurations) at a time.
// usage: node tools/fb_eval.mjs --dir=<runs> --list=<FB_RUN_LIST.json> --ab2logs=<dir of the AB2 run logs> [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const DIR = arg("dir", "."), LIST = JSON.parse(fs.readFileSync(arg("list", ""))), JS = arg("json", ""), AB2LOGS = arg("ab2logs", "");
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity), mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const med = (a) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b.length % 2 ? b[b.length >> 1] : 0.5 * (b[b.length / 2 - 1] + b[b.length / 2]); };
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length)), BINS = []; for (let i = 0; i < 12; i++) BINS.push([+(0.2 + 0.05 * i).toFixed(2), +(0.25 + 0.05 * i).toFixed(2)]);
const binOf = (phi) => { for (let i = 0; i < BINS.length; i++) if (phi >= BINS[i][0] - 1e-9 && (phi < BINS[i][1] - 1e-9 || (i === BINS.length - 1 && phi <= 0.8 + 1e-9))) return i; return -1; };
const CF = { BASE: "PSTAR5CH", AB: "PSTAR5CHAB", F: "PSTAR5CHABF", T: "PSTAR5CHABT", FT: "PSTAR5CHABFT" }, CN = Object.fromEntries(Object.entries(CF).map(([k, v]) => [v, k]));
const SETS = { "R-F": "R", "R-L": "R", "C-F7": "C", "C-F13": "C", "C-L5": "C", "H-T45": "H", "H-A40": "H", "H-D": "H", "H-F15": "H" }, hyp = (a) => Math.hypot(...a);
// ── AB2 run metrics (verbatim from tools/ab2_eval.mjs) ──
function ab2Metrics(r) { const dt = 1 / r.hz, wn = r.wn, T = r.tr.T, R = r.rows, W = r.W, ev = r.events, n = r.swing;
  const S = R.filter(x => x.ph === "swing" && x.u != null && x.u >= -1e-9 && x.u / T <= 0.8 + 1e-9), nx = (x) => R[R.indexOf(x) + 1];
  const SWc = R.filter(x => x.ph === "swing" && x.u != null && x.u >= -1e-9);   // liftoff → contact
  const reachRT = ev.reachRejected ? "pre-check rejected at runtime" : S.some(x => x.ikErr != null && x.ikErr > 1e-6) ? "IK target unreached in the swing window" : null;
  const e = S.map(x => Math.hypot(...x.foot.p.map((v, i) => v - x.ref.p[i])) * 1000);
  let num = 0, den = 0, ny = 0, dy = 0; for (const x of S) for (let i = 0; i < 3; i++) { const q = x.foot.p[i] - x.ref.p[i], ga = -x.ref.a[i] / (wn * wn); num += q * ga; den += ga * ga; if (i === 1) { ny += q * ga; dy += ga * ga; } }
  const iAir = S.findIndex(x => x.st === "AIRBORNE" && x.a >= 1 - 1e-9), phiAir = iAir >= 0 ? S[iAir].u / T : null; let nyA = 0, dyA = 0, nyL = 0, dyL = 0;
  S.forEach((x, j) => { const ga = -x.ref.a[1] / (wn * wn), q = x.foot.p[1] - x.ref.p[1]; if (iAir >= 0 && j >= iAir) { nyA += q * ga; dyA += ga * ga; } else { nyL += q * ga; dyL += ga * ga; } });
  const dlow = BINS.map(() => ({ ev: Infinity, tm: Infinity })); for (const x of S) { const b = binOf(x.u / T); if (b < 0) continue; dlow[b].ev = Math.min(dlow[b].ev, x.low - x.lowRef); const z = nx(x); if (z && z.lowRef != null) dlow[b].tm = Math.min(dlow[b].tm, x.low - z.lowRef); }
  const satRows = {}, run = {}, longest = {}; for (const x of SWc) { const ss = new Set(x.sat); for (const k of Object.keys(run)) if (!ss.has(+k)) run[k] = 0; for (const k of ss) { run[k] = (run[k] || 0) + 1; satRows[k] = (satRows[k] || 0) + 1; longest[k] = Math.max(longest[k] || 0, run[k]); } }
  const satFracMax = Object.keys(satRows).length ? mx(Object.values(satRows)) / Math.max(1, SWc.length) : 0, satLongestMs = Object.keys(longest).length ? mx(Object.values(longest)) * dt * 1000 : 0;
  const se = r.series, rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs), nw = r.hz === 240 ? 2 : Math.max(2, Math.ceil(2 * r.hz / 240)), exc = new Set(); se.onset.forEach((o, i) => { if (o) for (let j = 0; j < nw; j++) exc.add(i + j); });
  const tLo = ev.tLo, rT = R.find(x => tLo != null && x.t > tLo + 1e-9 && x.touch > 0), tNC = rT ? rT.t - dt : (ev.tC != null ? ev.tC - dt : Infinity), tSupTr = r.trans.find(q => q.n === n && ev.tC != null && q.t >= ev.tC - 1e-9 && q.to === "SUPPORT"), tSup = tSupTr ? tSupTr.t : Infinity;
  const inTr = (t) => t >= tNC - dt / 2 && t < tSup - dt / 2; let badA = 0, badC = 0, badSw = 0, badOut = 0, badTr = 0, dTauMax = 0, dTau0Max = 0, dTauSwMax = 0, trA = 0, trC = 0;
  se.t.forEach((t, i) => { if (t < 0.5 - 1e-9) return; dTauMax = Math.max(dTauMax, se.dTau[i]); dTau0Max = Math.max(dTau0Max, se.dTau0[i]); const vA = se.dTau[i] > (exc.has(i) ? 25 : 10) * rsA, vC = se.dTau0[i] > 30 * rs; if (vA) badA++; if (vC) badC++;
    if (inTr(t)) { trA = Math.max(trA, se.dTau[i]); trC = Math.max(trC, se.dTau0[i]); if (vA || vC) badTr++; } else if (vA || vC) badOut++;
    if (tLo != null && t > tLo + 1e-9 && t < tNC - dt / 2) { dTauSwMax = Math.max(dTauSwMax, se.dTau[i]); if (vA || vC) badSw++; } });
  const closMax = mx(se.closInc), closPos = se.closInc.reduce((s, v) => s + Math.max(0, v), 0);
  const early = ev.early || SWc.some(x => x.touch > 0 && x.u / T < 0.6 - 1e-9), tr = r.trans.filter(q => tLo != null && q.t >= tLo - 1e-9), tdN = tr.filter(q => q.n === n && q.to === "TOUCHDOWN").length, rebound = tr.filter(q => q.n === n && q.from === "TOUCHDOWN" && q.to === "AIRBORNE").length;
  let chatter = 0; for (const k of [0, 1]) { const tt = r.trans.filter(q => q.n === k && ev.tCmd != null && q.t >= ev.tCmd - 1e-9); for (let i = 2; i < tt.length; i++) if (tt[i].to === tt[i - 2].to && tt[i].t - tt[i - 2].t < 0.06) chatter++; }
  const atPh = (ph) => S.find(q => q.u / T >= ph - 1e-9) || null, tw = SWc.filter(q => q.u / T >= 0.6 - 1e-9 && q.u / T <= 0.85 + 1e-9);
  const tiltMean = tw.length ? mean(tw.map(q => q.tiltErr)) : null, tilt80 = atPh(0.8) ? atPh(0.8).tiltErr : null, ey85r = SWc.find(q => q.u / T >= 0.85 - 1e-9), ey85 = ey85r ? 1000 * (ey85r.foot.p[1] - ey85r.ref.p[1]) : null;
  const marg = SWc.filter(q => q.margin), marginMin = marg.length ? mn(marg.map(q => mn(q.margin))) : null, kneeMarginMin = marg.length ? mn(marg.map(q => q.margin[3])) : null, ikErrMaxC = SWc.length ? mx(SWc.map(q => q.ikErr ?? 0)) : null;
  let ledgerMax = 0, bOffAnkle = 0, bWithoutC = 0, bMax = 0; for (const x of R) { if (!x.L) continue; x.L.forEach((ax, j) => { if (!ax) return; ax.forEach(L => { if (!L) return; const sum = L.statics + L.d1 + L.kp + L.vffServo + L.passiveRef; ledgerMax = Math.max(ledgerMax, Math.abs(L.tau0 - sum) / Math.max(1, Math.abs(L.tau0)));
    if (L.passiveRef !== 0) { bMax = Math.max(bMax, Math.abs(L.passiveRef)); if (j !== 2) bOffAnkle++; if (!(L.c > 0)) bWithoutC++; } }); }); }
  let dcMax = 0, dwAbad = 0; const rel = 0.10; for (let i = 1; i < se.c.length; i++) { const dc = Math.abs(se.c[i] - se.c[i - 1]); dcMax = Math.max(dcMax, dc); }
  const aRows = R.filter(x => x.a != null); for (let i = 1; i < aRows.length; i++) { const x = aRows[i], y = aRows[i - 1]; if (Math.abs(x.wA - y.wA) > Math.abs(x.a - y.a) + Math.abs(x.cw - y.cw) + 1e-9) dwAbad++; }
  return { reachRT, n: S.length, rms: rms(e), peak: e.length ? mx(e) : null, num, den, ny, dy, nyA, dyA, nyL, dyL, phiAir, tNCrel: ev.tC != null ? (tNC - ev.tC) / dt : null, badOut, badTr, trA, trC, dlow, satFracMax, satLongestMs, dTauMax, dTau0Max, badA, badC, badSw, dTauSwMax, closMax, closPos, early, tdN, rebound, chatter,
    abort: ev.abortT != null, finalOk: ev.finalStates.every(s2 => s2 === "SUPPORT"), overCap: r.integrity.overCap, authority: r.integrity.authorityWrites, phiC: ev.phiC, noLift: ev.noLift, failedTD: ev.failedTD,
    tiltMean, tilt80, ey85, marginMin, kneeMarginMin, ikErrMaxC, ledgerMax, bOffAnkle, bWithoutC, bMax, dcMax, dcLimit: dt / rel + 2e-6, dwAbad, h7: r.hashes["7"] || null,
    // FB additions (shared windows)
    _tNC: tNC, _tSup: tSup, _exc: exc }; }
// ── FB per-run metrics (prereg §4 definitions); row times are recorded to 1e-6 s, so tick adjacency is tested to 1e-6 ──
function fbMetrics(r, m) { const dt = 1 / r.hz, T = r.tr.T, R = r.rows, ev = r.events, n = r.swing, se = r.series, rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs), Lc = 30 * rs, tLo = ev.tLo, t1 = r.t1;
  const x1 = t1 != null ? R.find(x => Math.abs(x.t - t1) < 1e-9) : null, tTD = (r.trans.find(q => q.n === n && tLo != null && q.t > tLo && q.to === "TOUCHDOWN") || {}).t ?? null;
  const swR = R.filter(x => tLo != null && x.t > tLo + 1e-9 && x.t < m._tNC - dt / 2), tiltW = R.filter(x => x.ph === "swing" && x.u != null && x.u / T >= 0.2 - 1e-9 && (t1 == null || x.t < t1 - 1e-9));
  let swA = 0, swC = 0, late = { runs: 0, n: 0, cmd: 0, app: 0 }; se.t.forEach((t, i) => { if (tLo == null || t <= tLo + 1e-9 || t >= m._tNC - dt / 2) return; swA = Math.max(swA, se.dTau[i]); swC = Math.max(swC, se.dTau0[i]);
    if (t >= tLo + 0.75 * T - 1e-9) { late.cmd = Math.max(late.cmd, se.dTau0[i]); late.app = Math.max(late.app, se.dTau[i]); if (se.dTau[i] > (m._exc.has(i) ? 25 : 10) * rsA || se.dTau0[i] > Lc) late.n++; } }); late.runs = late.n > 0 ? 1 : 0;
  const pkFrac = swR.length ? mx(swR.map(x => mx(x.legTau.map(q => q[2])))) : null;
  // 1A: α gating, added wrench, α̂ statistics, switch-off step
  let alBad = 0, alOn = 0, alMax = 0, d1fbMax = [0, 0, 0], alOffStep = 0; for (let i = 0; i < R.length; i++) { const x = R[i]; if (x.fb) { if (x.fb.alOn) { alOn++; alMax = Math.max(alMax, hyp(x.fb.al)); if (x.st !== "AIRBORNE" || x.touch > 0) alBad++; }
      const y = R[i - 1]; if (y && y.fb && y.fb.alOn && !x.fb.alOn && x.d1fb && y.d1fb) alOffStep = Math.max(alOffStep, Math.abs(x.d1fb[0] - y.d1fb[0])); }
    if (x.d1fb && x.ph === "swing") x.d1fb.forEach((v, j) => { d1fbMax[j] = Math.max(d1fbMax[j], v ?? 0); }); }
  // 1B construction / certification checks (engaged rows)
  let eng = 0, closMaxT = 0, sharedMax = 0, sigBad = 0, transTermBad = 0, violWithDs = 0, stalls = 0, prevSig = 0, prevRow = null, tSig1 = null, tNom1 = null, tEng = null, dec = [];
  for (let i = 0; i < R.length; i++) { const x = R[i]; if (!(x.tr && x.tr.on && x.L1B)) { prevRow = null; prevSig = 0; continue; } eng++; if (tEng == null) tEng = x.t; const sg = x.tr.sigma, sn = x.tr.sigNom; if (x.tr.stall) stalls++;
    if (tSig1 == null && sg >= 1 - 1e-12) tSig1 = x.t; if (tNom1 == null && sn >= 1 - 1e-12) tNom1 = x.t;
    if (!(sg >= -1e-15 && sg <= 1 + 1e-15 && sg >= Math.min(prevSig, sn) - 1e-12 && sg <= Math.max(prevSig, sn) + 1e-12)) sigBad++;
    const prev = prevRow && Math.abs(prevRow.t + dt - x.t) < 1e-6 ? prevRow : null; let legDmax = 0, worst = null;
    x.L1B.forEach((ax, j) => ax && ax.forEach((l, q) => { if (!l) return; const L = x.L[j] && x.L[j][q]; if (!L) return; const tf = L.statics, exp = tf + (1 - l.sigma) * (l.A.tau0 - tf) + l.sigma * (l.C.tau0 - tf), sc = Math.max(1, Math.abs(L.tau0));
      closMaxT = Math.max(closMaxT, Math.abs(L.tau0 - exp) / sc, Math.abs(L.K - ((1 - l.sigma) * l.A.K + l.sigma * l.C.K)) / Math.max(1, Math.abs(L.K)), Math.abs(L.D - ((1 - l.sigma) * l.A.D + l.sigma * l.C.D)) / Math.max(1, Math.abs(L.D)));
      sharedMax = Math.max(sharedMax, Math.abs(l.A.tau0 - (tf + l.A.d1 + l.A.kp + l.A.wv + l.A.wB)) / sc, Math.abs(l.C.tau0 - (tf + l.C.kp + l.C.wv + l.C.wB)) / sc);
      const pl = prev && prev.L1B && prev.L1B[j] && prev.L1B[j][q], pL = prev && prev.L[j] && prev.L[j][q];
      if (pl && pL) { const ds = l.sigma - pl.sigma, tt = ds * (pl.C.tau0 - pl.A.tau0); if (Math.abs(tt) > Lc + 1e-9) transTermBad++; const d = Math.abs(L.tau0 - pL.tau0); if (d > legDmax) { legDmax = d; worst = { j, q, ds, tt, iA: (1 - l.sigma) * (l.A.tau0 - pl.A.tau0), iC: l.sigma * (l.C.tau0 - pl.C.tau0), d }; } }
      else if (!prev) { const pr = R[i - 1], pL2 = pr && pr.L && pr.L[j] && pr.L[j][q]; if (pL2 && Math.abs(pr.t + dt - x.t) < 1e-6) { const d = Math.abs(L.tau0 - pL2.tau0); if (d > legDmax) { legDmax = d; worst = { j, q, ds: l.sigma, tt: null, d, first: true }; } } } }));
    if (legDmax > Lc + 1e-9) { const ds = worst ? worst.ds : 0; if (Math.abs(ds) > 1e-15 && !worst.first) violWithDs++; if (worst && worst.first && Math.abs(ds) > 1e-15) violWithDs++; dec.push({ t: x.t, ...worst }); }
    prevSig = sg; prevRow = x; }
  // approach-law commanded-rate demand in the possible-contact band (φ ≥ 0.75 → t_nc): max |Δ vff| on swing-leg axes, split G·ΔrP / G·ΔrT / ΔG·ω*
  let dem = { vff: 0, P: 0, T: 0, G: 0 }; for (let i = 1; i < R.length; i++) { const x = R[i], y = R[i - 1]; if (tLo == null || x.t < tLo + 0.75 * T - 1e-9 || x.t >= m._tNC - dt / 2 || !x.wPT || !y.wPT || Math.abs(y.t + dt - x.t) > 1e-6) continue;
    x.L.forEach((ax, j) => ax && ax.forEach((L, q) => { const P = y.L[j] && y.L[j][q]; if (!L || !P || L.K == null || !x.wPT[j][0] || !y.wPT[j][0]) return; const G = L.D + dt * L.K, Gp = P.D + dt * P.K, wP = x.wPT[j][0][q], wT = x.wPT[j][1] ? x.wPT[j][1][q] : 0, wPp = y.wPT[j][0][q], wTp = y.wPT[j][1] ? y.wPT[j][1][q] : 0;
      const dv = Math.abs(L.vffServo - P.vffServo); if (dv > dem.vff) dem = { vff: dv, P: G * (wP - wPp), T: G * (wT - wTp), G: (G - Gp) * (wPp + wTp) }; })); }
  // touchdown / support (1B-5)
  const post = r.post || [], p1 = post.length ? post[0].p : null, slip = p1 ? mx(post.filter(q => r.tSup == null || q.t <= r.tSup + 1e-9).map(q => Math.hypot(q.p[0] - p1[0], q.p[1] - p1[1]) * 1000)) : null;
  const pen = post.length && r.lowRest != null ? r.lowRest - mn(post.filter(q => r.tSup == null || q.t <= r.tSup + 1e-9).map(q => q.low)) : null;
  return { t1, tTD, tSup: r.tSup, supT: r.tSup != null && t1 != null ? r.tSup - t1 : null, wF1: x1 ? hyp(x1.wF) : null, vN1: x1 ? x1.pc.vN * 1000 : null, vT1: x1 ? x1.pc.vT * 1000 : null, tiltPre: tiltW.length ? mean(tiltW.map(x => x.tiltErr)) : null,
    swA, swC, pkFrac, late, alOn, alBad, alMax, d1fbMax, alOffStep, eng, closMaxT, sharedMax, sigBad, transTermBad, violWithDs, stalls, tEng, sig1: tSig1 != null && tEng != null ? tSig1 - tEng : null, nom1: tNom1 != null && tEng != null ? tNom1 - tEng : null,
    dec: dec.slice(0, 12), dem, slip, pen }; }
// 1B-0 identity before engagement: series and rows of X equal those of the reference for every tick before the swing foot's TOUCHDOWN entry
const ROWF = ["t", "u", "ph", "ref", "foot", "low", "lowRef", "tiltErr", "yawErr", "touch", "Fz", "st", "a", "ikErr", "legTau", "sat", "dTau", "dTau0", "ff", "xs", "margin", "L", "pasAnk", "wA", "cw", "wF", "pelW", "pc", "fb", "d1fb", "wPT"];
function identBefore(rx, rr, tTD) { if (tTD == null) return { ok: false, why: "no TOUCHDOWN" }; const sx = rx.series, sr = rr.series; let bad = 0;
  for (const k of Object.keys(sr)) { const a = sx[k], b = sr[k]; for (let i = 0; i < b.length && sr.t[i] < tTD - 1e-9; i++) if (a[i] !== b[i]) { bad++; break; } }
  const rowsX = rx.rows.filter(x => x.t < tTD - 1e-9), rowsR = rr.rows.filter(x => x.t < tTD - 1e-9); if (rowsX.length !== rowsR.length) return { ok: false, why: `rows ${rowsX.length} vs ${rowsR.length}` };
  const pick = (x) => JSON.stringify(ROWF.map(f => (f === "L" && x.L ? x.L.map(ax => ax && ax.map(l => (l ? { tau0: l.tau0, statics: l.statics, d1: l.d1, kp: l.kp, vffServo: l.vffServo, passiveRef: l.passiveRef } : null))) : x[f])));
  for (let i = 0; i < rowsX.length; i++) if (pick(rowsX[i]) !== pick(rowsR[i])) return { ok: false, why: `row ${i} t ${rowsX[i].t}` };
  return { ok: bad === 0, why: bad ? `series fields differing: ${bad}` : "" }; }
// ── load per group ──
const groups = {}; for (const q of LIST.runs) { const g = `${q.body}|${q.side}|${q.hz}|${q.traj}`; (groups[g] = groups[g] || []).push(q); }
const runs = {}, missing = [], ident = {}, endHash = {};
const fileOf = (q) => path.join(DIR, `fb_${q.cfg}_${q.body}_${q.side}_${q.hz}_${q.traj}.json.gz`);
for (const [g, qs] of Object.entries(groups)) { const recs = {};
  for (const q of qs) { const f = fileOf(q); if (!fs.existsSync(f)) { missing.push(path.basename(f)); continue; } const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))); recs[CN[q.cfg]] = r;
    const m = ab2Metrics(r), fm = fbMetrics(r, m); delete m._exc; runs[`${q.cfg}|${g}`] = { q, set: SETS[q.traj], m, fm }; endHash[`${q.cfg}|${g}`] = r.hashes.end; }
  for (const [x, ref] of [["T", "AB"], ["FT", "F"]]) if (recs[x] && recs[ref]) ident[`${CF[x]}|${g}`] = identBefore(recs[x], recs[ref], runs[`${CF[x]}|${g}`].fm.tTD); }
const K = (cfg, q) => `${cfg}|${q.body}|${q.side}|${q.hz}|${q.traj}`, ok = (k) => runs[k] && !runs[k].m.reachRT, sel = (cfg, fn = () => true) => Object.entries(runs).filter(([k, R]) => R.q.cfg === cfg && ok(k) && fn(R));
const out = { missing, reach: Object.entries(runs).filter(([, R]) => R.m.reachRT).map(([k, R]) => `${k}: ${R.m.reachRT}`), checks: {}, perTraj: {}, failures: [], reported: {} }, F = (id, why) => out.failures.push(`${id}: ${why}`);
const KEYN = { "3": ["num", "den"], y: ["ny", "dy"], yA: ["nyA", "dyA"], yL: ["nyL", "dyL"] }, ids = Object.keys(SETS), RC = (R) => R.set === "R" || R.set === "C";
const pool = (cfg, id, key) => { const s = sel(cfg, R => R.q.traj === id), [kn, kd] = KEYN[key]; const nn = s.reduce((a, [, R]) => a + R.m[kn], 0), dd = s.reduce((a, [, R]) => a + R.m[kd], 0); return dd > 0 ? nn / dd : null; };
for (const id of ids) { const P = {}; for (const c of Object.keys(CF)) { const s = sel(CF[c], R => R.q.traj === id); P[c] = { n: s.length, beta: pool(CF[c], id, "3"), betaY: pool(CF[c], id, "y"), betaYair: pool(CF[c], id, "yA"), tiltMean: mean(s.map(([, R]) => R.m.tiltMean).filter(v => v != null)),
  binWorst: s.length ? mn(s.map(([, R]) => Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm))) : null, marginMin: s.length ? mn(s.map(([, R]) => R.m.marginMin)) : null, phiC: mean(s.map(([, R]) => R.m.phiC).filter(v => v != null)) }; } out.perTraj[id] = P; }
// ── G ──
{ const gh = []; if (AB2LOGS) for (const c of ["BASE", "AB"]) for (const [k, R] of sel(CF[c])) { const q = R.q, lf = path.join(AB2LOGS, `ab_${q.cfg}_${q.body}_${q.side}_${q.hz}_${q.traj}.log`); if (!fs.existsSync(lf)) { gh.push(`${k}: AB2 log missing`); continue; }
    const mm = fs.readFileSync(lf, "utf8").match(/hash ([0-9a-f]{8})\s*$/); if (!mm || mm[1] !== endHash[k]) gh.push(`${k}: end hash ${endHash[k]} vs AB2 ${mm ? mm[1] : "—"}`); }
  else gh.push("no AB2 logs given"); out.checks["G-2"] = { mismatches: gh.length, compared: AB2LOGS ? sel(CF.BASE).length + sel(CF.AB).length : 0 }; gh.slice(0, 20).forEach(x => F("G-2", x)); }
if (missing.length) F("G-3", `missing ${missing.length} runs`);
{ const exAB = new Set(out.reach.filter(x => x.startsWith(CF.AB + "|")).map(x => x.split(": ")[0].split("|").slice(1).join("|"))); for (const c of ["F", "T", "FT"]) { const exX = new Set(out.reach.filter(x => x.startsWith(CF[c] + "|")).map(x => x.split(": ")[0].split("|").slice(1).join("|")));
    if ([...exX].some(x => !exAB.has(x)) || [...exAB].some(x => !exX.has(x))) F("G-3", `${c}: runtime reachability exclusions differ from AB's`); } }
// ── AB2 contract for a configuration X (1A-1; also for FT) ──
function ab2Contract(c, tag) { const X = CF[c], XS = (fn) => sel(X, fn);
  for (const id of ids) { const b = out.perTraj[id][c].beta; if (!(b != null && Math.abs(b) <= 0.25)) F(`${tag} AB-1`, `${id} pooled β ${f2(b, 3)}`); }
  for (const [k, R] of XS()) { if (!(R.m.peak <= 10 && R.m.rms <= 5)) F(`${tag} AB-2`, `${k} peak ${f2(R.m.peak)} RMS ${f2(R.m.rms)}`);
    if (RC(R) && R.q.hz !== 240) { const k2 = K(X, { ...R.q, hz: 240 }); if (ok(k2)) { const b = runs[k2].m; if (!(Math.abs(R.m.peak - b.peak) <= 2 && Math.abs(R.m.rms - b.rms) <= 1)) F(`${tag} AB-3`, `${k}`); } }
    if (R.m.badSw) F(`${tag} AB2-4a`, `${k} swing E1a-7 violation (applied max ${f2(R.m.dTauSwMax)})`); if (R.m.dcMax > R.m.dcLimit) F(`${tag} AB-4c`, `${k} |Δc| ${R.m.dcMax}`); if (R.m.dwAbad) F(`${tag} AB-4c`, `${k} w_A steps ${R.m.dwAbad}`); }
  for (const set of ["R", "C", "H"]) { const nb = sel(CF.BASE, R => R.set === set).filter(([, R]) => R.m.badOut).length, na = XS(R => R.set === set).filter(([, R]) => R.m.badOut).length; if (na > nb) F(`${tag} AB2-4b`, `set ${set}: ${na} > BASE ${nb}`); }
  for (const [k, R] of XS(RC)) if (R.m.closMax > 0.05 || R.m.closPos > 0.5 || R.m.authority) F(`${tag} AB-5`, `${k} closure ${R.m.closMax.toExponential(2)} Σ+ ${f2(R.m.closPos, 3)}`);
  for (const id of ids.filter(i => SETS[i] !== "H")) { const P = out.perTraj[id]; if (!(P[c].tiltMean <= 0.5 * P.BASE.tiltMean)) F(`${tag} AB-6`, `${id} tilt ${f2(P[c].tiltMean, 3)} > 0.5 × ${f2(P.BASE.tiltMean, 3)}`);
    if (!(P[c].betaYair <= 0.5 * P.BASE.betaYair)) F(`${tag} AB2-7`, `${id} β_y(air) ${f2(P[c].betaYair, 3)} > 0.5 × ${f2(P.BASE.betaYair, 3)}`); }
  { const w = mn(XS(RC).map(([, R]) => Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm))); if (!(w >= -0.80)) F(`${tag} AB-8`, `worst d_low ${f2(w)} mm`); }
  for (const [k, R] of XS(RC)) { const kb = K(CF.BASE, R.q); if (R.m.ikErrMaxC > 1e-6 || !(R.m.marginMin > 0)) F(`${tag} AB-9`, `${k} IK ${R.m.ikErrMaxC} margin ${f2(R.m.marginMin)}`); else if (ok(kb) && R.m.marginMin < runs[kb].m.marginMin - 2) F(`${tag} AB-9`, `${k} margin ${f2(R.m.marginMin)} < BASE − 2°`); }
  for (const [k, R] of XS(RC)) { if (R.q.hz === 240) continue; const k2 = K(X, { ...R.q, hz: 240 }); if (!ok(k2)) continue; const b = runs[k2].m, d1 = Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm), d2 = Math.min(b.dlow[11].ev, b.dlow[11].tm);
    if (!(Math.abs(R.m.tiltMean - b.tiltMean) <= 0.2 && Math.abs(d1 - d2) <= 0.3)) F(`${tag} AB-10`, `${k}`); }
  for (const [k, R] of XS()) { const rc = RC(R); if (R.m.overCap) F(`${tag} I-1`, `${k} over-capacity ${R.m.overCap}`); if (rc && (R.m.satFracMax > 0.05 || R.m.satLongestMs > 50 + 1e-9)) F(`${tag} I-4`, `${k}`);
    if (R.m.early || R.m.noLift || R.m.failedTD) F(`${tag} I-5`, `${k}`); if (rc && !(R.m.tdN === 1 && R.m.rebound === 0 && R.m.chatter === 0)) F(`${tag} I-6`, `${k} TOUCHDOWN ${R.m.tdN} rebound ${R.m.rebound} re-entries ${R.m.chatter}`); if (rc && (R.m.abort || !R.m.finalOk)) F(`${tag} I-7`, `${k}`);
    if (R.m.ledgerMax > 1e-9) F(`${tag} L-1`, `${k} ledger ${R.m.ledgerMax.toExponential(2)}`); if (R.m.bOffAnkle || R.m.bWithoutC) F(`${tag} L-2`, `${k}`); const kb = K(CF.BASE, R.q); if (runs[kb] && R.m.h7 !== runs[kb].m.h7) F(`${tag} G-3`, `${k} hash at 7 s`); } }
// ── 1A ──
const paired = (X, REF, fn) => sel(X, fn).map(([k, R]) => [R, runs[K(REF, R.q)]]).filter(([, B]) => B && !B.m.reachRT);
function nonInf(X, REF, tag) { for (const set of ["R", "C", "H"]) { const P = paired(X, REF, R => R.set === set); if (!P.length) continue; const A1 = (f) => P.map(([R]) => f(R)).filter(v => v != null), B1 = (f) => P.map(([, B]) => f(B)).filter(v => v != null);
    const chk = (name, fx, tolAbs, kind = "medmax") => { const a = A1(fx), b = B1(fx); if (!a.length || !b.length) return; if (kind === "medmax") { if (!(med(a) <= med(b) + tolAbs && mx(a) <= mx(b) + tolAbs)) F(tag, `set ${set} ${name}: median ${f2(med(a), 4)} / max ${f2(mx(a), 4)} vs ref ${f2(med(b), 4)} / ${f2(mx(b), 4)} (+${tolAbs})`); }
      else if (kind === "mean") { if (!(mean(a) <= mean(b) + tolAbs)) F(tag, `set ${set} ${name}: mean ${f2(mean(a), 4)} vs ref ${f2(mean(b), 4)} (+${tolAbs})`); }
      else if (kind === "max") { if (!(mx(a) <= mx(b) + tolAbs)) F(tag, `set ${set} ${name}: max ${f2(mx(a), 4)} vs ref ${f2(mx(b), 4)} (+${tolAbs})`); }
      else if (kind === "maxrel") { if (!(mx(a) <= tolAbs * mx(b))) F(tag, `set ${set} ${name}: max ${f2(mx(a), 3)} vs ${tolAbs} × ref ${f2(mx(b), 3)}`); } };
    chk("(a) foot |ω| at t1 (rad/s)", R => R.fm.wF1, 0.01); chk("(b) mean tilt φ [0.2, t1) (°)", R => R.fm.tiltPre, 0.02, "mean"); chk("(c) potential-contact downward speed at t1 (mm/s)", R => R.fm.vN1, 2); chk("(c) potential-contact tangential speed at t1 (mm/s)", R => R.fm.vT1, 2);
    chk("(d) swing max applied Δτ", R => R.fm.swA, 1.10, "maxrel"); chk("(d) swing max commanded Δτ0", R => R.fm.swC, 1.10, "maxrel"); chk("(d) swing peak torque fraction", R => R.fm.pkFrac, 0.05, "max"); chk("(d) swing longest saturation share", R => R.m.satFracMax, 0.02, "max");
    for (let b = 0; b < BINS.length; b++) { const a = mn(P.map(([R]) => Math.min(R.m.dlow[b].ev, R.m.dlow[b].tm))), c = mn(P.map(([, B]) => Math.min(B.m.dlow[b].ev, B.m.dlow[b].tm))); if (!(a >= c - 0.10)) F(tag, `set ${set} (e) bin ${BINS[b][0]} worst d_low ${f2(a)} < ref ${f2(c)} − 0.10 mm`); }
    chk("(f) Σ+ (J)", R => R.m.closPos, 0.05, "max"); }
  for (const id of ids.filter(i => SETS[i] !== "H")) { const x = pool(X, id, "yA"), y = pool(REF, id, "yA"); if (!(x <= y + 0.01)) F(tag, `(e) ${id} airborne β_y ${f2(x, 3)} > ref ${f2(y, 3)} + 0.01`); } }
const t0 = out.failures.length; let fbCheck = null; try { fbCheck = JSON.parse(fs.readFileSync(path.join(DIR, "..", "fb1a_check.json"))); } catch (e) { }
if (!fbCheck || !fbCheck.pass) F("1A-0", fbCheck ? `check failed: (a) ${fbCheck.a_exact_fail} (b) ${fbCheck.b_fail} (c) ${fbCheck.c_fail}` : "fb1a_check.json missing");
ab2Contract("F", "1A-1"); nonInf(CF.F, CF.AB, "1A-2");
for (const [k, R] of sel(CF.F)) if (R.fm.alBad) F("1A-3", `${k} α̂ used on ${R.fm.alBad} ticks outside the free-swing condition`);
for (const [k, R] of sel(CF.FT)) if (R.fm.alBad) F("FT 1A-3", `${k} α̂ used on ${R.fm.alBad} ticks outside the free-swing condition`);
// ── 1B (T vs AB; FT vs F) ──
function oneB(X, REF, tag) {
  for (const [k, R] of sel(X)) { const g = k.split("|").slice(1).join("|"), id = ident[`${X}|${g}`]; if (!id || !id.ok) F(`${tag}-0`, `${k}: ${id ? id.why : "no pair"}`);
    if (R.fm.closMaxT > 1e-9 || R.fm.sharedMax > 1e-9 || R.fm.sigBad) F(`${tag}-1`, `${k}: closure ${R.fm.closMaxT.toExponential(2)} shared ${R.fm.sharedMax.toExponential(2)} σ-path ${R.fm.sigBad}`);
    if (R.fm.transTermBad || R.fm.violWithDs) F(`${tag}-2`, `${k}: transition term > L ${R.fm.transTermBad} ticks; violations with Δσ ≠ 0 ${R.fm.violWithDs}`);
    if (R.m.closMax > 0.05 || R.m.closPos > 0.5 || R.m.authority) F(`${tag}-6`, `${k}: closure ${R.m.closMax.toExponential(2)} Σ+ ${f2(R.m.closPos, 3)} authority ${R.m.authority}`);
    const B = runs[K(REF, R.q)]; if (B && B.fm.tSup != null && (R.fm.tSup == null)) F(`${tag}-5`, `${k}: no SUPPORT (reference reached it)`); if (R.m.abort) F(`${tag}-5`, `${k}: abort`); }
  for (const set of ["R", "C", "H"]) { const P = paired(X, REF, R => R.set === set); for (const hz of [null, 180, 240, 480]) { const Q = P.filter(([R]) => hz == null || R.q.hz === hz), sfx = hz ? ` ${hz} Hz` : "";
      const tx = Q.filter(([R]) => R.m.badTr).length, tr = Q.filter(([, B]) => B.m.badTr).length, ox = Q.filter(([R]) => R.m.badOut).length, orr = Q.filter(([, B]) => B.m.badOut).length;
      if (hz == null) { if (tx > tr) F(`${tag}-3`, `set ${set}: transition-region violating runs ${tx} > ref ${tr}`); if (ox > orr) F(`${tag}-4`, `set ${set}: outside violating runs ${ox} > ref ${orr}`); }
      else { if (tx > tr) F(`${tag}-7`, `set ${set}${sfx}: transition ${tx} > ${tr}`); if (ox > orr) F(`${tag}-7`, `set ${set}${sfx}: outside ${ox} > ${orr}`); } }
    const A1 = (f) => P.map(([R]) => f(R)).filter(v => v != null), B1 = (f) => P.map(([, B]) => f(B)).filter(v => v != null);
    const lim = [["first contact → SUPPORT (s)", R => R.fm.supT, 0.10], ["landed-foot slip t1 → SUPPORT (mm)", R => R.fm.slip, 1], ["max penetration below rest (mm)", R => R.fm.pen, 0.5]];
    for (const [nm, fx, tol] of lim) { const a = A1(fx), b = B1(fx); if (a.length && b.length && !(mx(a) <= mx(b) + tol)) F(`${tag}-5`, `set ${set} ${nm}: max ${f2(mx(a), 3)} vs ref ${f2(mx(b), 3)} (+${tol})`); }
    const rx = P.filter(([R]) => R.m.rebound > 0).length, rr = P.filter(([, B]) => B.m.rebound > 0).length; if (rx > rr) F(`${tag}-5`, `set ${set}: runs with rebounds ${rx} > ref ${rr}`); } }
oneB(CF.T, CF.AB, "1B"); ab2Contract("FT", "FT 1A-1"); oneB(CF.FT, CF.F, "FT 1B");
// ── reported ──
for (const c of ["AB", "F", "T", "FT"]) for (const set of ["R", "C", "H"]) { const s = sel(CF[c], R => R.set === set); out.reported[`${c} ${set}`] = { n: s.length, lateRuns: s.filter(([, R]) => R.fm.late.n).length, lateCmd: s.length ? mx(s.map(([, R]) => R.fm.late.cmd)) : null, lateApp: s.length ? mx(s.map(([, R]) => R.fm.late.app)) : null,
  trRuns: s.filter(([, R]) => R.m.badTr).length, trCmd: s.length ? mx(s.map(([, R]) => R.m.trC)) : null, trApp: s.length ? mx(s.map(([, R]) => R.m.trA)) : null, stalls: s.reduce((a, [, R]) => a + R.fm.stalls, 0), sig1: mx(s.map(([, R]) => R.fm.sig1 ?? -Infinity)), nom1: mx(s.map(([, R]) => R.fm.nom1 ?? -Infinity)),
  demMax: s.length ? mx(s.map(([, R]) => R.fm.dem.vff)) : null, wF1med: med(s.map(([, R]) => R.fm.wF1).filter(v => v != null)), wF1max: mx(s.map(([, R]) => R.fm.wF1 ?? -Infinity)), vN1max: mx(s.map(([, R]) => R.fm.vN1 ?? -Infinity)), vT1max: mx(s.map(([, R]) => R.fm.vT1 ?? -Infinity)),
  tiltPre: mean(s.map(([, R]) => R.fm.tiltPre).filter(v => v != null)), d1fbMax: [0, 1, 2].map(j => mx(s.map(([, R]) => R.fm.d1fbMax[j]))), alMax: mx(s.map(([, R]) => R.fm.alMax)), alOffStep: mx(s.map(([, R]) => R.fm.alOffStep)) }; }
// worst approach-law demand cases (with split) and T-configuration violating-tick decomposition
out.reported.demandTop = Object.entries(runs).filter(([, R]) => R.q.cfg === CF.AB).sort((a, b) => b[1].fm.dem.vff - a[1].fm.dem.vff).slice(0, 10).map(([k, R]) => ({ k, ...R.fm.dem }));
out.reported.decompT = Object.entries(runs).filter(([, R]) => (R.q.cfg === CF.T || R.q.cfg === CF.FT) && R.fm.dec.length).map(([k, R]) => ({ k, dec: R.fm.dec }));
const GIDS = ["G-2", "G-3"], AIDS = ["1A-0", "1A-1", "1A-2", "1A-3"], BIDS = ["1B-0", "1B-1", "1B-2", "1B-3", "1B-4", "1B-5", "1B-6", "1B-7"], FTIDS = ["FT 1A-1", "FT 1A-3", ...BIDS.map(x => "FT " + x)];
const has = (id) => out.failures.some(x => x.startsWith(id + ":") || x.startsWith(id + " "));
for (const id of [...GIDS, ...AIDS, ...BIDS, ...FTIDS]) out.checks[id] = { ...(out.checks[id] || {}), pass: !has(id), failures: out.failures.filter(x => x.startsWith(id + ":") || x.startsWith(id + " ")).length };
out.G = GIDS.every(id => out.checks[id].pass); out.A = AIDS.every(id => out.checks[id].pass); out.B = BIDS.every(id => out.checks[id].pass); out.FT = FTIDS.every(id => out.checks[id].pass);
console.log(`runs ${Object.keys(runs).length}/${LIST.runs.length}${missing.length ? " MISSING " + missing.length : ""}; runtime reachability exclusions ${out.reach.length}`);
console.log("trajectory | β (T-1) BASE / AB / F / T / FT | airborne β_y BASE / AB / F / T / FT | mean tilt φ .6–.85 (°) BASE / AB / F / T / FT | worst d_low [.75,.80] BASE / AB / F / T / FT");
for (const id of ids) { const P = out.perTraj[id], c5 = (key, d = 3) => ["BASE", "AB", "F", "T", "FT"].map(c => f2(P[c][key], d)).join(" / "); console.log(`  ${id.padEnd(6)} | ${c5("beta")} | ${c5("betaYair")} | ${c5("tiltMean")} | ${c5("binWorst", 2)}`); }
console.log("REPORTED per configuration and set: late approach [φ .75, t_nc) violating runs / max cmd / app | transition [t_nc, SUPPORT) violating runs / max cmd / app | 1B stalls, σ = 1 after (s) vs σ_nom | approach vff-rate demand max (N·m/tick)");
for (const set of ["R", "C", "H"]) for (const c of ["AB", "F", "T", "FT"]) { const x = out.reported[`${c} ${set}`]; console.log(`  ${set} ${c.padEnd(2)} | late ${x.lateRuns}/${x.n} ${f2(x.lateCmd, 1)} ${f2(x.lateApp, 1)} | trans ${x.trRuns}/${x.n} ${f2(x.trCmd, 1)} ${f2(x.trApp, 1)} | stalls ${x.stalls} σ1 ${f2(x.sig1, 3)} nom ${f2(x.nom1, 3)} | demand ${f2(x.demMax, 1)}`); }
console.log("REPORTED contact measures per set (median / max): foot |ω| at t1 (rad/s) | max potential-contact downward / tangential speed at t1 (mm/s) | mean tilt φ [.2, t1) (°) | 1A added wrench max hip / knee / ankle (N·m) | α̂ max (rad/s²) | α switch-off step (N·m)");
for (const set of ["R", "C", "H"]) for (const c of ["AB", "F", "T", "FT"]) { const x = out.reported[`${c} ${set}`]; console.log(`  ${set} ${c.padEnd(2)} | ${f2(x.wF1med, 3)} / ${f2(x.wF1max, 3)} | ${f2(x.vN1max, 1)} / ${f2(x.vT1max, 1)} | ${f2(x.tiltPre, 3)} | ${x.d1fbMax.map(v => f2(v, 2)).join(" / ")} | ${f2(x.alMax, 1)} | ${f2(x.alOffStep, 2)}`); }
for (const [id, c] of Object.entries(out.checks)) if (c.pass !== undefined) console.log(`${c.pass ? "PASS" : "FAIL"} ${id} (${c.failures ?? 0} failing items)`);
for (const id of [...GIDS, ...AIDS, ...BIDS, ...FTIDS]) out.failures.filter(x => x.startsWith(id + ":") || x.startsWith(id + " ")).slice(0, 6).forEach(x => console.log("   " + x));
console.log(`G ${out.G ? "PASS" : "FAIL"} | 1A ${out.A ? "VALIDATES" : "DOES NOT VALIDATE"} | 1B ${out.B ? "VALIDATES" : "DOES NOT VALIDATE"} | FT ${out.FT ? "PASS" : "FAIL"}`);
if (JS) fs.writeFileSync(JS, JSON.stringify({ ...out, runs: Object.fromEntries(Object.entries(runs).map(([k, R]) => [k, { q: R.q, set: R.set, m: { ...R.m, num: undefined, den: undefined, dlow: R.m.dlow }, fm: R.fm }])) }, null, 1));
