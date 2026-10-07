// ═══ physchar2/tools/td2_eval.mjs — evaluation of the TD2 touchdown-coordinator validation (e2/TD2_PREREG.md §4; written with the freeze, before any battery run). Configurations AB
// (PSTAR5CHAB, nominal) and TD (PSTAR5CHABTD; conditions nominal / early / late / beyond and any amended condition). The AB2 swing-contract items reuse tools/ab2_eval.mjs's run
// metrics verbatim (copied below via tools/fb_eval.mjs); BASE values for the relative items come from the frozen FB battery (evidence_fb/fb_eval.json.gz). Records are processed one
// run at a time; a run group for TD-10 is (body, leg, trajectory, condition) over the three rates.
// usage: node tools/td2_eval.mjs --dir=<runs> --list=<TD2_RUN_LIST.json> --fbjson=<evidence_fb/fb_eval.json.gz> --fblogs=<dir of the FB run logs> [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const DIR = arg("dir", "."), LIST = JSON.parse(fs.readFileSync(arg("list", ""))), JS = arg("json", ""), FBJ = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("fbjson", "")))), FBLOGS = arg("fblogs", "");
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity), mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const med = (a) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b.length % 2 ? b[b.length >> 1] : 0.5 * (b[b.length / 2 - 1] + b[b.length / 2]); };
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length)), BINS = []; for (let i = 0; i < 12; i++) BINS.push([+(0.2 + 0.05 * i).toFixed(2), +(0.25 + 0.05 * i).toFixed(2)]);
const binOf = (phi) => { for (let i = 0; i < BINS.length; i++) if (phi >= BINS[i][0] - 1e-9 && (phi < BINS[i][1] - 1e-9 || (i === BINS.length - 1 && phi <= 0.8 + 1e-9))) return i; return -1; };
const SETS = { "R-F": "R", "R-L": "R", "C-F7": "C", "C-F13": "C", "C-L5": "C", "H-T45": "H", "H-A40": "H", "H-D": "H", "H-F15": "H" }, hyp = (a) => Math.hypot(...a), AB = "PSTAR5CHAB", TD = "PSTAR5CHABTD";
const yawOf = (q) => { const f = [2 * (q[0] * q[2] + q[3] * q[1]), 2 * (q[1] * q[2] - q[3] * q[0]), 1 - 2 * (q[0] * q[0] + q[1] * q[1])]; return Math.atan2(f[0], f[2]) * 180 / Math.PI; }, wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
// ── AB2 run metrics (verbatim from tools/ab2_eval.mjs, via tools/fb_eval.mjs) ──
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
// ── TD2 per-run metrics (prereg §3 definitions; row times recorded to 1e-6 s) ──
function tdMetrics(r, m) { const dt = 1 / r.hz, T = r.tr.T, R = r.rows, ev = r.events, n = r.swing, se = r.series, W = r.W, rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs), tLo = ev.tLo, t1 = r.t1, P = r.td2.params;
  const tS = tLo != null ? tLo + T + (P && P.tauD ? P.tauD : 0) : null, tSup = r.tSup ?? Infinity, pci0 = t1 != null ? Math.min(tS ?? Infinity, t1 - dt) : (tS ?? Infinity); let v = { sw: 0, pci: 0, out: 0, all: 0 }, worst = { pci: 0, all: 0 };
  se.t.forEach((t, i) => { if (t < 0.5 - 1e-9) return; const vA = se.dTau[i] > (m._exc.has(i) ? 25 : 10) * rsA, vC = se.dTau0[i] > 30 * rs, k = t >= pci0 - dt / 2 && t < tSup - dt / 2 ? "pci" : tLo != null && t > tLo + 1e-9 && t < pci0 - dt / 2 ? "sw" : "out";
    const ratio = Math.max(se.dTau0[i] / (30 * rs), se.dTau[i] / ((m._exc.has(i) ? 25 : 10) * rsA)); worst.all = Math.max(worst.all, ratio); if (k === "pci") worst.pci = Math.max(worst.pci, ratio); if (vA || vC) { v[k]++; v.all++; } });
  const i1 = t1 != null ? R.findIndex(x => Math.abs(x.t - t1) < 1e-7) : -1, x0 = i1 > 0 ? R[i1 - 1] : null, win = i1 >= 0 ? R.slice(i1).filter(x => x.t <= t1 + 0.1 + 1e-7) : [];
  const impact = win.length ? mx(win.map(x => x.Fz)) / W : null, imp12 = win.length ? mx(win.filter(x => x.t <= t1 + 0.012 + 1e-7).map(x => x.Fz)) / W : null;
  let w10 = null; if (win.length) { w10 = 0; for (let i = 0; i < win.length; i++) { let s = 0, tt = 0; for (let j = i; j < win.length && tt < 0.010 - 1e-12; j++) { const d = Math.min(dt, 0.010 - tt); s += win[j].Fz * d; tt += d; } w10 = Math.max(w10, s / 0.010 / W); } }
  const impulse = (dur) => (i1 >= 0 ? R.slice(i1).filter(x => x.t < t1 + dur - 1e-7).reduce((a, x) => a + x.Fz * dt, 0) : null), pen = win.length && r.lowRest != null ? mn(win.map(x => x.low)) - r.lowRest : null;
  const tr = r.trans.filter(q => q.n === n && tLo != null && q.t > tLo - 1e-9), tdN = tr.filter(q => q.to === "TOUCHDOWN").length, reb = tr.filter(q => q.from === "TOUCHDOWN" && q.to === "AIRBORNE").length, laN = tr.filter(q => q.to === "LOAD_ACCEPT").length;
  const la = tr.find(q => q.to === "LOAD_ACCEPT"), sup = la ? tr.find(q => q.t > la.t && q.to === "SUPPORT") : null, post = r.post || [], pS = post.find(q => r.tSup != null && q.t >= r.tSup - 1e-7);
  const place = pS && r.goal ? Math.hypot(pS.p[0] - r.goal.pos[0], pS.p[1] - r.goal.pos[2]) * 1000 : null, yawD = pS && pS.yaw != null && r.goal ? wrap(pS.yaw - yawOf(r.goal.rot)) : null;
  const slip = post.length ? mx(post.filter(q => q.t <= tSup + 1e-7).map(q => Math.hypot(q.p[0] - post[0].p[0], q.p[1] - post[0].p[1]) * 1000)) : null;
  const preC = R.filter(x => x.ph === "swing" && (ev.tC == null || x.t < ev.tC - 1e-7) && (r.td2.failedTD == null || x.t < r.td2.failedTD - 1e-7)), refMin = preC.length && r.goal ? mn(preC.map(x => x.ref.p[1] - r.goal.pos[1])) : null;
  const tdBeforeEsc = r.td2.failedTD != null ? tr.filter(q => q.to === "TOUCHDOWN" && q.t < r.td2.failedTD - 1e-9).length : null, seq = tr.map(q => q.to).join(">");
  // the new region's tracking deviation (reported, Decision 4): reference minus actual lowest boot point, approach φ ∈ [0.8, 1.0) and during the search, before the first touching tick
  const dev = (S) => (S.length ? mx(S.map(x => x.lowRef - x.low)) : null), pre1 = R.filter(x => x.u != null && (t1 == null || x.t < t1 - 1e-7)), devA = dev(pre1.filter(x => x.u / T >= 0.8 - 1e-9 && x.u < T - 1e-9)), devS = dev(pre1.filter(x => x.srch));
  return { t1, tS, tC1: t1 != null && tS != null ? t1 - tS : null, v, worst, vN: x0 ? x0.pc.vN : null, vT: x0 ? x0.pc.vT : null, fvN: x0 ? -x0.foot.v[1] : null, fvT: x0 ? Math.hypot(x0.foot.v[0], x0.foot.v[2]) : null, wF: x0 ? hyp(x0.wF) : null,
    impact, imp12, w10, i20: impulse(0.020), i50: impulse(0.050), pen, tdN, reb, laN, laSup: la && sup ? sup.t - la.t : null, tSupAbs: r.tSup, place, yawD, slip, refMin, tdBeforeEsc, esc: r.td2.failedTD, seq, devA, devS, phase: r.td2.tdPhase, params: P }; }
const runs = {}, missing = []; const fileOf = (q) => path.join(DIR, `td2_${q.cfg}_${q.cond}_${q.body}_${q.side}_${q.hz}_${q.traj}.json.gz`), endHash = {};
for (const q of LIST.runs) { const f = fileOf(q); if (!fs.existsSync(f)) { missing.push(path.basename(f)); continue; } const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), m = ab2Metrics(r), t = tdMetrics(r, m); delete m._exc;
  runs[`${q.cfg}|${q.cond}|${q.body}|${q.side}|${q.hz}|${q.traj}`] = { q, set: SETS[q.traj], m, t }; endHash[`${q.cfg}|${q.cond}|${q.body}|${q.side}|${q.hz}|${q.traj}`] = r.hashes.end; }
const out = { missing, reach: Object.entries(runs).filter(([, R]) => R.m.reachRT).map(([k, R]) => `${k}: ${R.m.reachRT}`), checks: {}, failures: [], reported: {} }, F = (id, why) => out.failures.push(`${id}: ${why}`);
const sel = (cfg, cond, fn = () => true) => Object.entries(runs).filter(([, R]) => R.q.cfg === cfg && R.q.cond === cond && !R.m.reachRT && fn(R)), ids = Object.keys(SETS), RC = (R) => R.set === "R" || R.set === "C";
const baseM = (q) => { const x = FBJ.runs[`PSTAR5CH|${q.body}|${q.side}|${q.hz}|${q.traj}`]; return x ? x.m : null; };
// ── G ──
if (missing.length) F("TD-G3", `missing ${missing.length} runs`);
{ let cmp = 0, bad = 0; if (FBLOGS) for (const [k, R] of sel(AB, "nominal")) { const q = R.q, lf = path.join(FBLOGS, `fb_PSTAR5CHAB_${q.body}_${q.side}_${q.hz}_${q.traj}.log`); if (!fs.existsSync(lf)) { bad++; F("TD-G2", `${k}: FB log missing`); continue; }
    const mm = fs.readFileSync(lf, "utf8").match(/hash ([0-9a-f]{8})\s*$/); cmp++; if (!mm || mm[1] !== endHash[k]) { bad++; F("TD-G2", `${k}: end hash ${endHash[k]} vs FB ${mm ? mm[1] : "—"}`); } } else F("TD-G2", "no FB logs given"); out.checks["TD-G2"] = { compared: cmp, mismatches: bad }; }
{ const ex = (cfg, cond) => new Set(out.reach.filter(x => x.startsWith(`${cfg}|${cond}|`)).map(x => x.split(": ")[0].split("|").slice(2).join("|"))), a = ex(AB, "nominal");
  for (const cond of [...new Set(LIST.runs.filter(q => q.cfg === TD).map(q => q.cond))]) { const b = ex(TD, cond); if ([...b].some(x => !a.has(x)) || (cond !== "beyond" && [...a].some(x => !b.has(x)))) F("TD-G3", `${cond}: runtime reachability exclusions differ from AB's`); } }
// ── TD-1: AB2 contract on TD nominal (I-6 replaced by TD-4) ──
{ const X = sel(TD, "nominal"), pool = (id, kn, kd) => { const s = X.filter(([, R]) => R.q.traj === id), nn = s.reduce((a, [, R]) => a + R.m[kn], 0), dd = s.reduce((a, [, R]) => a + R.m[kd], 0); return dd > 0 ? nn / dd : null; };
  const poolB = (id, kn, kd) => { let nn = 0, dd = 0; for (const [, R] of X.filter(([, R]) => R.q.traj === id)) { const b = baseM(R.q); if (b) { nn += b[kn]; dd += b[kd]; } } return dd > 0 ? nn / dd : null; };
  for (const id of ids) { const b = pool(id, "num", "den"); if (!(b != null && Math.abs(b) <= 0.25)) F("TD-1 AB-1", `${id} pooled β ${f2(b, 3)}`); }
  for (const [k, R] of X) { if (!(R.m.peak <= 10 && R.m.rms <= 5)) F("TD-1 AB-2", `${k} peak ${f2(R.m.peak)} RMS ${f2(R.m.rms)}`);
    if (RC(R) && R.q.hz !== 240) { const k2 = `${TD}|nominal|${R.q.body}|${R.q.side}|240|${R.q.traj}`; if (runs[k2] && !runs[k2].m.reachRT) { const b = runs[k2].m; if (!(Math.abs(R.m.peak - b.peak) <= 2 && Math.abs(R.m.rms - b.rms) <= 1)) F("TD-1 AB-3", k); } }
    if (R.t.v.sw) F("TD-1 AB2-4a", `${k} swing-window E1a-7 violation`); if (R.m.dcMax > R.m.dcLimit) F("TD-1 AB-4c", `${k} |Δc| ${R.m.dcMax}`); if (R.m.dwAbad) F("TD-1 AB-4c", `${k} w_A steps ${R.m.dwAbad}`); }
  for (const set of ["R", "C", "H"]) { const S = X.filter(([, R]) => R.set === set), nb = S.filter(([, R]) => { const b = baseM(R.q); return b && b.badOut > 0; }).length, na = S.filter(([, R]) => R.t.v.out > 0).length; if (na > nb) F("TD-1 AB2-4b", `set ${set}: ${na} > BASE ${nb}`); }
  for (const [k, R] of X.filter(([, R]) => RC(R))) if (R.m.closMax > 0.05 || R.m.closPos > 0.5 || R.m.authority) F("TD-1 AB-5", `${k}`);
  for (const id of ids.filter(i => SETS[i] !== "H")) { const S = X.filter(([, R]) => R.q.traj === id), tm = mean(S.map(([, R]) => R.m.tiltMean)), tb = mean(S.map(([, R]) => (baseM(R.q) || {}).tiltMean).filter(v => v != null)); if (!(tm <= 0.5 * tb)) F("TD-1 AB-6", `${id} tilt ${f2(tm, 3)} > 0.5 × ${f2(tb, 3)}`);
    const by = pool(id, "nyA", "dyA"), bb = poolB(id, "nyA", "dyA"); if (!(by <= 0.5 * bb)) F("TD-1 AB2-7", `${id} β_y(air) ${f2(by, 3)} > 0.5 × ${f2(bb, 3)}`); }
  { const w = mn(X.filter(([, R]) => RC(R)).map(([, R]) => Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm))); if (!(w >= -0.80)) F("TD-1 AB-8", `worst d_low ${f2(w)}`); }
  for (const [k, R] of X.filter(([, R]) => RC(R))) { const b = baseM(R.q); if (R.m.ikErrMaxC > 1e-6 || !(R.m.marginMin > 0)) F("TD-1 AB-9", `${k} IK ${R.m.ikErrMaxC} margin ${f2(R.m.marginMin)}`); else if (b && R.m.marginMin < b.marginMin - 2) F("TD-1 AB-9", `${k} margin < BASE − 2°`);
    if (R.q.hz !== 240) { const k2 = `${TD}|nominal|${R.q.body}|${R.q.side}|240|${R.q.traj}`; if (runs[k2]) { const b2 = runs[k2].m, d1 = Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm), d2 = Math.min(b2.dlow[11].ev, b2.dlow[11].tm); if (!(Math.abs(R.m.tiltMean - b2.tiltMean) <= 0.2 && Math.abs(d1 - d2) <= 0.3)) F("TD-1 AB-10", k); } } }
  for (const [k, R] of X) { const rc = RC(R); if (R.m.overCap) F("TD-1 I-1", k); if (rc && (R.m.satFracMax > 0.05 || R.m.satLongestMs > 50 + 1e-9)) F("TD-1 I-4", `${k} saturation ${f2(100 * R.m.satFracMax, 1)} % / ${f2(R.m.satLongestMs, 0)} ms`);
    if (R.m.early || R.m.noLift || R.m.failedTD) F("TD-1 I-5", `${k} early ${R.m.early} noLift ${R.m.noLift} failedTD ${R.m.failedTD}`); if (rc && (R.m.abort || !R.m.finalOk)) F("TD-1 I-7", k);
    if (R.m.ledgerMax > 1e-9) F("TD-1 L-1", k); if (R.m.bOffAnkle || R.m.bWithoutC) F("TD-1 L-2", k); const b = baseM(R.q); if (b && R.m.h7 !== b.h7) F("TD-1 G-3", `${k} hash at 7 s`); } }
// ── TD-2 … TD-9 ──
const conds = [...new Set(LIST.runs.filter(q => q.cfg === TD).map(q => q.cond))], contactConds = conds.filter(c => c !== "beyond");
for (const [k, R] of sel(TD, "nominal")) if (!(R.t.tC1 != null && R.t.tC1 >= -0.5 / R.q.hz)) F("TD-2", `${k}: first touching tick ${f2(R.t.tC1 != null ? R.t.tC1 * 1000 : null, 1)} ms relative to the search start`);
for (const cond of contactConds) for (const [k, R] of sel(TD, cond)) { const t = R.t, P = t.params, vLim = 1.875 * P.Dmax / P.tauS + 0.0375;
  if (cond !== "early" && !(t.vN != null && t.vN <= vLim + 1e-9)) F("TD-3", `${k}: potential-contact downward speed ${f2(t.vN != null ? t.vN * 1000 : null, 1)} mm/s (≤ ${f2(vLim * 1000, 1)})`);
  if (!(t.fvN != null && t.fvN <= 0.15 && t.fvT <= 0.05)) F("TD-3", `${k}: E2-5 foot velocity ${f2(t.fvN, 3)} down / ${f2(t.fvT, 3)} horizontal m/s (≤ 0.15 / 0.05)`);
  if (!(t.tdN === 1 && t.reb === 0 && R.m.chatter === 0 && t.impact != null && t.impact <= 0.25 && t.pen != null && t.pen >= -2)) F("TD-4", `${k}: TOUCHDOWN ${t.tdN}, rebound ${t.reb}, re-entries ${R.m.chatter}, impact ${f2(t.impact != null ? 100 * t.impact : null, 1)} % BW, penetration ${f2(t.pen, 2)} mm`);
  if (!(t.laN === 1 && t.laSup != null && t.laSup <= 0.10 + 0.1 + 1e-9 && !R.m.abort && R.m.finalOk)) F("TD-6", `${k}: LOAD_ACCEPT ${t.laN}, LA→SUPPORT ${f2(t.laSup, 3)} s, abort ${R.m.abort}, final ${R.m.finalOk}`);
  if (!(t.place != null && t.place <= 10 && t.yawD != null && Math.abs(t.yawD) <= 2)) F("TD-7", `${k}: placement ${f2(t.place)} mm, yaw ${f2(t.yawD)}°`); }
for (const cond of conds) for (const [k, R] of sel(TD, cond)) { const t = R.t, P = t.params;
  if (t.v.all) F("TD-5", `${k}: ${t.v.all} E1a-7 violations (swing ${t.v.sw}, PCI ${t.v.pci}, other ${t.v.out}); worst ratio ${f2(t.worst.all, 2)}`);
  if (t.refMin != null && t.refMin < P.hB - P.Dmax - 1e-7 && cond !== "beyond") F("TD-8", `${k}: commanded reference ${f2(t.refMin * 1000, 3)} mm above the foothold before contact (≥ ${f2((P.hB - P.Dmax) * 1000, 2)})`);
  if (cond === "beyond" && !(t.esc != null && t.tdBeforeEsc === 0 && !R.m.abort && R.m.finalOk)) F("TD-8", `${k}: beyond — escalation ${t.esc}, TOUCHDOWN before it ${t.tdBeforeEsc}, abort ${R.m.abort}, final ${R.m.finalOk}`);
  if (R.m.closMax > 0.05 || R.m.closPos > 0.5 || R.m.authority || R.m.overCap) F("TD-9", `${k}: closure ${R.m.closMax.toExponential(2)}, Σ+ ${f2(R.m.closPos, 3)}, authority ${R.m.authority}, over-capacity ${R.m.overCap}`);
  if (RC(R) && (R.m.satFracMax > 0.05 || R.m.satLongestMs > 50 + 1e-9)) F("TD-9", `${k}: saturation ${f2(100 * R.m.satFracMax, 1)} % / ${f2(R.m.satLongestMs, 0)} ms`); }
// ── TD-10 rate stability ──
for (const cond of contactConds) { const G = {}; for (const [, R] of sel(TD, cond)) { const g = `${R.q.body}|${R.q.side}|${R.q.traj}`; (G[g] = G[g] || {})[R.q.hz] = R; }
  for (const [g, H] of Object.entries(G)) { const b = H[240]; if (!b) continue; for (const hz of [180, 480]) { const x = H[hz]; if (!x) continue;
      if (x.t.seq !== b.t.seq) F("TD-10", `${cond} ${g} ${hz} Hz: event sequence ${x.t.seq} vs 240 Hz ${b.t.seq}`);
      if (x.t.t1 != null && b.t.t1 != null && Math.abs((x.t.t1 - x.t.tS) - (b.t.t1 - b.t.tS)) > 0.010 + 1e-9) F("TD-10", `${cond} ${g} ${hz} Hz: touchdown time ${f2((x.t.t1 - x.t.tS) * 1000, 1)} vs ${f2((b.t.t1 - b.t.tS) * 1000, 1)} ms (search-start relative)`);
      if (x.t.place != null && b.t.place != null && Math.abs(x.t.place - b.t.place) > 3) F("TD-10", `${cond} ${g} ${hz} Hz: placement ${f2(x.t.place)} vs ${f2(b.t.place)} mm`); } } }
// ── reported ──
for (const cfg of [AB, TD]) for (const cond of cfg === AB ? ["nominal"] : conds) for (const set of ["R", "C", "H"]) { const S = sel(cfg, cond, R => R.set === set).map(([, R]) => R.t); if (!S.length) continue; const g = (k, sc = 1) => S.map(t => t[k]).filter(v => v != null).map(v => v * sc);
  out.reported[`${cfg === AB ? "AB" : "TD"} ${cond} ${set}`] = { n: S.length, viol: S.filter(t => t.v.all).length, pciViol: S.filter(t => t.v.pci).length, worstPci: mx(S.map(t => t.worst.pci)), tC1med: med(g("tC1", 1000)), tC1min: mn(g("tC1", 1000)), tC1max: mx(g("tC1", 1000)),
    vNmed: med(g("vN", 1000)), vNmax: mx(g("vN", 1000)), vTmax: mx(g("vT", 1000)), fvTmax: mx(g("fvT", 1000)), impMed: med(g("impact", 100)), impMax: mx(g("impact", 100)), w10max: mx(g("w10", 100)), imp12max: mx(g("imp12", 100)), i50max: mx(g("i50")), penMin: mn(g("pen")),
    reb: S.filter(t => t.reb).length, slipMax: mx(g("slip")), placeMax: mx(g("place")), devAmax: mx(g("devA")), devSmax: mx(g("devS")), phases: [...new Set(S.map(t => t.phase))].join("/") }; }
const IDS = ["TD-G2", "TD-G3", "TD-1", "TD-2", "TD-3", "TD-4", "TD-5", "TD-6", "TD-7", "TD-8", "TD-9", "TD-10"], has = (id) => out.failures.filter(x => x.startsWith(id + ":") || x.startsWith(id + " "));
for (const id of IDS) out.checks[id] = { ...(out.checks[id] || {}), pass: has(id).length === 0, failures: has(id).length };
out.validates = IDS.every(id => out.checks[id].pass);
console.log(`runs ${Object.keys(runs).length}/${LIST.runs.length}${missing.length ? " MISSING " + missing.length : ""}; runtime reachability exclusions ${out.reach.length}`);
console.log("REPORTED per configuration / condition / set: runs with any E1a-7 violation (PCI) worst PCI ratio | first touch relative to search start (ms) med [min, max] | contact downward speed med/max, tangential max (pc), foot horizontal max (mm/s) | impact %BW med/max, 10 ms max, first 12 ms max | 50 ms impulse max (N·s) | penetration min (mm) | rebounds | slip max / placement max (mm) | new-region deviation max approach φ .8–1 / search (mm) | contact phases");
for (const [k, x] of Object.entries(out.reported)) console.log(`  ${k.padEnd(18)} n ${String(x.n).padStart(3)} | viol ${x.viol} (PCI ${x.pciViol}) ${f2(x.worstPci)} | tC ${f2(x.tC1med, 0)} [${f2(x.tC1min, 0)}, ${f2(x.tC1max, 0)}] | vN ${f2(x.vNmed, 1)}/${f2(x.vNmax, 1)} vT ${f2(x.vTmax, 1)} fvT ${f2(x.fvTmax, 1)} | impact ${f2(x.impMed, 1)}/${f2(x.impMax, 1)} w10 ${f2(x.w10max, 1)} first12 ${f2(x.imp12max, 1)} | I50 ${f2(x.i50max, 2)} | pen ${f2(x.penMin)} | reb ${x.reb} | slip ${f2(x.slipMax)} place ${f2(x.placeMax)} | dev ${f2(x.devAmax)} / ${f2(x.devSmax)} | ${x.phases}`);
for (const id of IDS) console.log(`${out.checks[id].pass ? "PASS" : "FAIL"} ${id} (${out.checks[id].failures} failing items)`);
for (const id of IDS) has(id).slice(0, 6).forEach(x => console.log("   " + x));
console.log(out.validates ? "TD2: TOUCHDOWN COORDINATOR VALIDATES" : "TD2: TOUCHDOWN COORDINATOR DOES NOT VALIDATE");
if (JS) fs.writeFileSync(JS, JSON.stringify({ ...out, runs: Object.fromEntries(Object.entries(runs).map(([k, R]) => [k, { q: R.q, set: R.set, m: { ...R.m, dlow: R.m.dlow }, t: R.t }])) }, null, 1));
