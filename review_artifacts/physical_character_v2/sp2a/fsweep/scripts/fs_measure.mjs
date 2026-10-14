// SP2A BODY-FRICTION SWEEP — measures of one run record (reads the record; nothing is simulated).
//   • horizontal COM velocity: at the first non-boot turf contact (ground entry), when the slide is established (first hip/pelvis contact;
//     fallback first thigh contact + 0.1 s), and its time series (60 Hz);
//   • slide: COM horizontal path from ground entry to "stopped" (v_h < 0.10 m/s, held 0.1 s) or the end of the record; stop time; mean and peak
//     (29 ms window) deceleration;
//   • cumulative horizontal and normal ground impulse; normal-impulse ratio Σ Jn / (M g T) over the slide (> 1: the body is pressed into the turf
//     by impacts or by the controller's support / seat objectives, which raises friction for the same μ);
//   • BRAKING LEDGER by region: normal impulse (load) and tangential braking impulse (opposed to the COM's horizontal velocity) + lateral
//     impulse; boots split by TCF-1's sole weight k at that step: STUD-engaged (k ≥ 0.999: the sole within 35° of straight down), PARTIAL
//     (0 < k < 1) and UPPER/SIDE (k = 0). Closure check: Σ ledger horizontal impulse vs M·Δv_COM,h (on flat turf every horizontal external
//     impulse is a contact tangential impulse; a non-zero remainder would be a solver / non-contact source);
//   • stud engagement of each boot (impulse and time) after the plant push-off; region loads (normal impulse, 29 ms peak in BW);
//   • orientation through the slide (pelvis pitch / roll / yaw, trunk-belly direction), final state; joint-limit excursions (constraint audit).
const S1 = new URL("../../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), CL = await import(S1 + "sp_climits.mjs"), { V, Q, B, bi } = L;
const RG = await import(new URL("../../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), M2 = await import(new URL("../../../slide_phys2/scripts/sp2_measures.mjs", import.meta.url).href);
const AA = await import(new URL("../../scripts/sp2a_author.mjs", import.meta.url).href), FC = await import(new URL("./fs_contact.mjs", import.meta.url).href);
const H = 1 / 240, MASS = L.M, BW = MASS * L.G, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
// ledger categories (the brief's list) from a contact's SP2 region group + the boot's TCF-1 weight
export const CATS = ["studs (legitimate, k≥0.999)", "boots (partial / upper / side)", "shin/calf", "knee", "thigh", "hip/pelvis", "torso", "upper arms", "forearms/hands"];
const catOf = (c, k) => { const g = c.group || ""; if (c.body.startsWith("foot")) return k >= 0.999 ? CATS[0] : CATS[1]; if (g.startsWith("shin")) return CATS[2]; if (g.startsWith("knee")) return CATS[3]; if (g.startsWith("thigh")) return CATS[4];
  if (g === "pelvis") return CATS[5]; if (g === "torso" || c.body === "head") return CATS[6]; if (g === "arm") return CATS[7]; if (g === "forearm" || g === "hand") return CATS[8]; return "other"; };
export function measure(o, m) { const recs = o.recs, n = recs.length, tOff = o.tOffset || 0;
  const comVel = (r) => V.sc(r.chars.tackler.P, 1 / MASS), vh = (r) => { const v = comVel(r); return Math.hypot(v[0], v[2]); };
  // per-step attributed contacts
  const steps = recs.map((r, k) => { const Spre = (k > 0 ? recs[k - 1] : r).S.slice(0, B.length), cs = RG.turfContacts(r, k > 0 ? recs[k - 1].S : r.S, "tackler", 0, null);
    const v = comVel(r), vhh = Math.hypot(v[0], v[2]), dir = vhh > 0.05 ? [v[0] / vhh, 0, v[2] / vhh] : [0, 0, 1], lat = [dir[2], 0, -dir[0]];
    for (const c of cs) { c.k = c.body.startsWith("foot") ? FC.soleK(Spre[bi(c.body)].rot) : null; c.cat = catOf(c, c.k ?? 0); c.brake = -V.dot([c.J[0], 0, c.J[2]], dir); c.latJ = V.dot([c.J[0], 0, c.J[2]], lat);
      c.mu = c.body.startsWith("foot") ? m * 0.5 + (1.2 - m * 0.5) * c.k : m * (c.group === "hand" ? 0.7 : 0.5); }
    return { t: r.t, tA: +(r.t + tOff).toFixed(5), cs, vh: vhh, v }; });
  // plant push-off (last plant-boot contact of the first stance) and ground entry (first non-boot contact)
  let kTO = 0; { let seen = false; for (let k = 0; k < n; k++) { const on = steps[k].cs.some(c => c.body === "foot_L" && c.Jn > 0); if (on) seen = true; else if (seen) { kTO = k; break; } } }
  const kE = steps.findIndex(s => s.cs.some(c => !c.body.startsWith("foot") && c.Jn > 0)), kHip = steps.findIndex(s => s.cs.some(c => c.cat === "hip/pelvis" && c.Jn > 0)), kTh = steps.findIndex(s => s.cs.some(c => c.cat === "thigh" && c.Jn > 0));
  const kEst = kHip >= 0 ? kHip : kTh >= 0 ? Math.min(n - 1, kTh + 24) : kE;
  let kStop = -1; for (let k = Math.max(0, kE); k < n - 24; k++) if (steps.slice(k, k + 24).every(s => s.vh < 0.10)) { kStop = k; break; }
  const kEnd = kStop >= 0 ? kStop : n - 1, com = (k) => L.comOf(recs[k].S.slice(0, B.length));
  let path = 0; for (let k = Math.max(1, kE); k <= kEnd; k++) { const a = com(k - 1), b = com(k); path += Math.hypot(b[0] - a[0], b[2] - a[2]); }
  const disp = kE >= 0 ? (() => { const a = com(kE), b = com(kEnd); return Math.hypot(b[0] - a[0], b[2] - a[2]); })() : null;
  // deceleration (29 ms window on v_h)
  let peakDec = 0, peakDecT = null; for (let k = Math.max(7, kE); k <= kEnd; k++) { const d = (steps[k - 7].vh - steps[k].vh) / (7 * H); if (d > peakDec) { peakDec = d; peakDecT = steps[k].tA; } }
  const vE = kE >= 0 ? steps[kE].vh : null, avgDec = kE >= 0 ? (vE - steps[kEnd].vh) / ((kEnd - kE) * H) : null;
  // ledger over the slide [kE, kEnd] and over the whole run; closure
  const ledger = (k0, k1) => { const g = {}; let Jh = [0, 0, 0], Jn = 0; for (let k = k0; k <= k1; k++) for (const c of steps[k].cs) { const e = g[c.cat] = g[c.cat] || { normalNs: 0, brakeNs: 0, latNs: 0, steps: 0 }; e.normalNs += c.Jn; e.brakeNs += c.brake; e.latNs += c.latJ; if (c.Jn > 0) e.steps++; Jh = V.add(Jh, [c.J[0], 0, c.J[2]]); Jn += c.Jn; }
    const tot = Object.values(g).reduce((s, e) => s + e.brakeNs, 0), totN = Object.values(g).reduce((s, e) => s + e.normalNs, 0);
    for (const e of Object.values(g)) { e.brakeShare = tot > 0 ? e.brakeNs / tot : null; e.normalShare = totN > 0 ? e.normalNs / totN : null; for (const key of ["normalNs", "brakeNs", "latNs", "brakeShare", "normalShare"]) e[key] = r3(e[key]); }
    const P0 = recs[Math.max(0, k0 - 1)].chars.tackler.P, P1 = recs[k1].chars.tackler.P, dPh = [P1[0] - P0[0], 0, P1[2] - P0[2]];
    return { byRegion: Object.fromEntries(CATS.filter(c => g[c]).map(c => [c, g[c]]).concat(Object.entries(g).filter(([c]) => !CATS.includes(c)))), totalBrakeNs: r3(tot), totalNormalNs: r3(totN), horizontalImpulse: Jh.map(r3), dMomentumH: dPh.map(r3),
      closureResidualNs: r3(V.len(V.sub(Jh, dPh))), normalRatio: r3(totN / (BW * Math.max(H, (k1 - k0 + 1) * H))) }; };
  // region loads (29 ms peaks in BW) over the whole run
  const peaks = {}; for (const cat of CATS) { let acc = 0, mx = 0; const q = []; for (let k = 0; k < n; k++) { const s = steps[k].cs.filter(c => c.cat === cat).reduce((a, c) => a + c.Jn, 0); q.push(s); acc += s - (k >= 7 ? q[k - 7] : 0); mx = Math.max(mx, acc); } peaks[cat] = r3(mx / (7 * H) / BW); }
  // stud engagement after the plant push-off, per boot
  const studs = {}; for (const b of ["foot_R", "foot_L"]) { let J = 0, Jbr = 0, t0 = null, nS = 0, Jside = 0; for (let k = kTO; k < n; k++) for (const c of steps[k].cs) if (c.body === b && c.Jn > 0) { if (c.k >= 0.999) { J += c.Jn; Jbr += c.brake; nS++; if (t0 == null) t0 = steps[k].tA; } else Jside += c.Jn; }
    studs[b === "foot_R" ? "tacklingBoot" : "foldBoot"] = { studNormalNs: r3(J), studBrakeNs: r3(Jbr), studSteps: nS, firstStudT: t0, nonStudNormalNs: r3(Jside) }; }
  // orientation through the slide, final state
  const orient = []; for (let k = Math.max(0, kE - 24); k < n; k += 12) { const S = recs[k].S.slice(0, B.length), pa = AA.pelvisAngles(S[0].rot), th = S[bi("thorax")], belly = Q.rot(th.rot, [0, 0, 1]);
    orient.push({ t: steps[k].tA, pitch: r3(pa.pitchDeg), roll: r3(pa.rollDeg), yaw: r3(pa.yawDeg), bellyDownY: r3(belly[1]), comY: r3(L.comOf(S)[1]) }); }
  const mm = M2.measure(o), last = orient[orient.length - 1], fin = last.bellyDownY < -0.5 ? "prone (face-down)" : last.bellyDownY > 0.5 ? "supine" : Math.abs(last.roll) > 55 ? "on its side" : "seated / reclined";
  const series = steps.filter((_, k) => k % 4 === 0).map(s => [s.tA, r3(s.vh)]);
  const climits = o.climits ? CL.cTable(o.climits, 0.5).map(e => ({ id: e.id, beyondDeg: e.beyond, durS: e.dur, at: +(e.at + tOff).toFixed(3) })) : null;
  return { m, hash: o.finalHash, steps: n, pushOffT: steps[kTO] ? steps[kTO].tA : null, groundEntry: kE >= 0 ? { t: steps[kE].tA, vh: r3(vE), bodies: [...new Set(steps[kE].cs.filter(c => !c.body.startsWith("foot") && c.Jn > 0).map(c => c.region))] } : null,
    slideEstablished: { t: steps[kEst] ? steps[kEst].tA : null, vh: steps[kEst] ? r3(steps[kEst].vh) : null, by: kHip >= 0 ? "first hip/pelvis contact" : "first thigh contact + 0.1 s" },
    stopped: kStop >= 0 ? { t: steps[kStop].tA, afterEntryS: r3((kStop - kE) * H) } : { t: null, note: `still moving at the end (${r3(steps[n - 1].tA)} s, v_h ${r3(steps[n - 1].vh)} m/s)` },
    slidePathM: r3(path), slideDisplacementM: r3(disp), avgDecel: r3(avgDec), peakDecel: { value: r3(peakDec), t: peakDecT },
    ledgerSlide: kE >= 0 ? ledger(kE, kEnd) : null, ledgerWholeRun: ledger(1, n - 1), regionPeak29msBW: peaks, studs, orientation: orient, finalState: { class: fin, ...last, minBellyY: mm.posture.minBellyY, headTurfT: mm.posture.headTurfT },
    climits, vhSeries: series }; }
