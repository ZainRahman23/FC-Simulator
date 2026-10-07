// TD2B derivation (offline; before any TD2B code or run): (1) the certified possible-contact window and the band / search parameters; (2) the reachability of the beyond-terrain
// escalation under the search invariants; (3) the cross-rate (physics-rate invariance) bounds. Inputs are ONLY pre-existing design-stage evidence: the TD2 turf-off qualification of
// the amended timeline (qualification iii: 432 cases, the trajectory before contact is bit-identical to the turf-on run), the FB battery's AB records (contact-speed / load
// sensitivities), the E2 / E1a tolerances and the timestep. The TD2 battery's results are NOT used.
// usage: node td2b_derivation.mjs <qualification iii runs dir> <FB runs dir>
import fs from "fs"; import zlib from "zlib";
const [QD, FD] = process.argv.slice(2), up = (x, s = 0.05) => Math.ceil(x / s - 1e-9) * s, mj = (u) => u * u * u * (10 - 15 * u + 6 * u * u), L = (a) => Math.hypot(...a);
const ld = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), out = {};
// ── qualification (iii) per run ──
const Q = []; for (const f of fs.readdirSync(QD).filter(x => x.endsWith(".json.gz"))) { const r = ld(QD + "/" + f), R = r.rows, T = r.tr.T, P = r.td2.params, tEsc = r.td2.failedTD ?? Infinity, [, body, side, hz, traj] = f.replace(".json.gz", "").split("_");
  const pre = R.filter(x => x.u != null && x.t < tEsc - 1e-9 && x.ph === "swing"), app = pre.filter(x => x.u / T >= 0.75 - 1e-9 && x.u < T - 1e-9), dw = pre.filter(x => x.u >= T - 1e-9 && x.u < T + P.tauD - 1e-9), sr = pre.filter(x => x.srch);
  const dn = (S) => (S.length ? Math.max(...S.map(x => x.lowRef - x.low)) : null), upd = (S) => (S.length ? Math.max(...S.map(x => x.low - x.lowRef)) : null), dt = 1 / r.hz;
  const lowV = []; for (let i = 1; i < sr.length; i++) if (Math.abs(sr[i].t - sr[i - 1].t - dt) < 1e-6) lowV.push(-(sr[i].low - sr[i - 1].low) / dt);   // mm/s
  Q.push({ body, side, hz: +hz, traj, dApp: dn(app), dDw: dn(dw), dSr: dn(sr), uApp: upd(app), uSr: upd(sr), uDw: upd(dw), lowV: lowV.length ? Math.max(...lowV) : null,
    vT: Math.max(...sr.map(x => x.pc.vT)) * 1000, vF: Math.max(...sr.map(x => Math.hypot(x.foot.v[0], x.foot.v[2]))) * 1000, w: Math.max(...sr.map(x => L(x.wF))), tilt: Math.max(...sr.map(x => x.tiltErr)), vRefPk: 1.875 * P.Dmax / P.tauS * 1000 }); }
const mx = (a) => Math.max(...a.filter(v => v != null)), groups = {}; for (const q of Q) (groups[`${q.body}|${q.side}|${q.traj}`] = groups[`${q.body}|${q.side}|${q.traj}`] || {})[q.hz] = q;
const xr = (k) => mx(Object.values(groups).map(g => { const v = [180, 240, 480].map(h => g[h] && g[h][k]).filter(x => x != null); return v.length > 1 ? Math.max(...v) - Math.min(...v) : null; }));
// ── (1) window and parameters ──
const uDn = mx(Q.map(q => Math.max(q.dApp, q.dDw))), uUp = mx(Q.map(q => Math.max(q.uApp, q.uDw, q.uSr))), dC = 0.5, dT = 0.05;
const hB = up(uDn + dC + dT), lMax = uDn + dC + dT, lMin = dC - dT - uUp, D = up(hB - lMin), late = { aV: 2.6324, vV: 0.2169, jV: 49.46 }, vImp = 0.25 / 10.08, Dm = D / 1000;
const tau = { jerk: Math.cbrt(60 * Dm / late.jV), acc: Math.sqrt(5.7735 * Dm / late.aV), vel: 1.875 * Dm / late.vV, sense: 1.875 * Dm / (dC / 1000 * 180), e25: 1.875 * Dm / (0.15 - 0.0375), impact: 1.875 * Dm / vImp }, tauS = up(Math.max(...Object.values(tau)), 0.005);
let lo = 0, hi = 1; const sStar = (hB - dC) / D; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (mj(m) < sStar) lo = m; else hi = m; } const tauC = (lo + hi) / 2 * tauS, tauD = 0.085, vPk = 1.875 * Dm / tauS;
out.window = { uDn_qualified: uDn, uUp_qualified: uUp, dC, dT, earliestRefLow_mm: lMax, latestRefLow_mm: lMin, hB, Dmax: D, searchEnd_mm: +(hB - D).toFixed(3), tau, tauS, tauC: +tauC.toFixed(4), tauD, vPeak_mm_s: +(vPk * 1000).toFixed(2), plannedTD_afterT: +(tauD + tauC).toFixed(4),
  earlyTerrain_mm: +dT, lateTerrain_mm: -dT };
// ── (2) beyond-terrain escalation reachability (E2 S-LATE: commanded foothold 10 mm above the planner's turf) ──
{ const dz = 10.0, De = dz + (hB - D) - (hB - D), tauE = up(1.875 * De / 1000 / vPk, 0.005), aE = 5.7735 * De / 1000 / tauE ** 2, jE = 60 * De / 1000 / tauE ** 3;
  out.escalation = { rule: "first search exhausted → E2 late hold (planned TD + 0.3 s) → failed touchdown → the bounded search CONTINUES from the first search end (at rest) down to the planner's turf window's late edge (planner's foothold + (h_B − D_max)), a rest-to-rest quintic with the normal search's peak speed → no contact by its end + 0.3 s → explicit touchdown failure (hold; no further descent)",
    S_LATE_depth_mm: De, tauE, vPeak_mm_s: +(1.875 * De / tauE).toFixed(2), aPeak: +aE.toFixed(4), jPeak: +jE.toFixed(4), withinLateEnvelope: aE <= late.aV && jE <= late.jV && 1.875 * De / 1000 / tauE <= late.vV,
    deepestPose: "the planner's own certified foothold + (h_B − D_max) (reach certified by landingValid / ikFeasible at dz 0)", failureTimeAfterT_s: +(tauD + tauC + 0.3 + tauE + 0.3).toFixed(3) }; }
// ── (3) cross-rate bounds ──
const dtMax = 1 / 180, aPk = 5.7735 * Dm / tauS ** 2, dDev = xr("dDw"), dLowExcess = mx(Object.values(groups).map(g => { const v = [180, 240, 480].map(h => g[h] && g[h].lowV != null ? g[h].lowV - g[h].vRefPk : null).filter(x => x != null); return v.length > 1 ? Math.max(...v) - Math.min(...v) : null; }));
// reference speed difference along the search for a contact-height shift Δh anywhere in the window
const vAt = (s) => { let a = 0, b = 1; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (mj(m) < s) a = m; else b = m; } const u = (a + b) / 2; return 30 * u * u * (1 - u) ** 2 * D / tauS; };   // mm/s at depth fraction s
let dvRef = 0; for (let k = 0; k <= 400; k++) { const h1 = lMin + (lMax - lMin) * k / 400, s1 = Math.min(1, Math.max(0, (hB - h1) / D)); for (const sg of [-1, 1]) { const h2 = h1 + sg * dDev, s2 = Math.min(1, Math.max(0, (hB - h2) / D)); dvRef = Math.max(dvRef, Math.abs(vAt(s1) - vAt(s2))); } }
const dvN = dvRef + dLowExcess + aPk * 1000 * dtMax;
// AB-derived contact-speed → load / impulse sensitivities (pre-existing FB AB records)
let k10 = 0, kI = 0; for (const f of fs.readdirSync(FD).filter(x => x.startsWith("fb_PSTAR5CHAB_") && x.endsWith(".json.gz"))) { const r = ld(FD + "/" + f), R = r.rows, dt = 1 / r.hz, i1 = R.findIndex(x => x.t === r.t1); if (i1 < 1) continue; const v = R[i1 - 1].pc.vN, W = r.W, win = R.slice(i1).filter(x => x.t <= r.t1 + 0.1 + 1e-9);
  let w10 = 0; for (let i = 0; i < win.length; i++) { let s = 0, tt = 0; for (let j = i; j < win.length && tt < 0.010 - 1e-12; j++) { const d = Math.min(dt, 0.010 - tt); s += win[j].Fz * d; tt += d; } w10 = Math.max(w10, s / 0.010 / W); }
  const I50 = R.slice(i1).filter(x => x.t < r.t1 + 0.05 - 1e-9).reduce((a, x) => a + x.Fz * dt, 0); k10 = Math.max(k10, w10 / v); kI = Math.max(kI, I50 / v); }
const contract = 0.25, accept = 0.10;
out.crossRate = { inputs: { dtMax, qualifiedCrossRateDeviationRange_mm: dDev, searchPeakAccel: aPk, actualMinusReferenceDescentSpeedCrossRateRange_mm_s: dLowExcess, k10_BW_per_m_s: k10, kI_Ns_per_m_s: kI },
  bounds: {
    contactNormalSpeed_mm_s: +dvN.toFixed(2),                                                     // reference-speed shift over the qualified contact-height shift + tracking-speed difference + one tick of search acceleration
    tangentialSpeed_mm_s: +mx(Q.map(q => Math.max(q.vT, q.vF))).toFixed(2),                       // both magnitudes lie in [0, qualified search-phase envelope]
    placement_mm: 3.0,                                                                             // E2-15 physical-convergence tolerance (provisional, frozen in the E2 preregistration)
    tilt_deg: +mx(Q.map(q => q.tilt)).toFixed(3), angularSpeed_rad_s: +mx(Q.map(q => q.w)).toFixed(4), yawAtSupport_deg: 2.0,   // qualified search-phase envelopes; E2-4 yaw tolerance
    load10ms_BW: +(k10 * dvN / 1000 + contract * dtMax / 0.010).toFixed(4),                       // AB sensitivity × the contact-speed bound + one-tick impulse allocation of a contract-bounded peak
    impulse50_Ns_perBW: null, impulse50_Ns: +(kI * dvN / 1000).toFixed(4), impulse50_tickQuantum: "plus one tick of the contract-bounded peak load: 0.25·BW·dt_max (per run, N·s)",
    penetration_mm: 2.0, rebound: "equal (none at any rate)", slip_mm: 3.0, torqueRate: "E1a-7 at every rate (rate-scaled), whole run", contactToSupport_s: +(tauS - accept + 3 * dtMax).toFixed(4) } };
console.log(JSON.stringify(out, null, 1));
