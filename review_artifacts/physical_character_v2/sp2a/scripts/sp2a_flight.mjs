// SP2A — the AUTHORED final flight (RUN → DIVE transition) and the physical tackle from the plant touchdown.
// Why (sp2a/SP2A_LOG.md): with the physical body taking over earlier, its limbs lag running-speed motion by 50–100 ms (M1 activation / force
// lag; eccentric short-range damping on a fast swing knee), the plant boot meets the turf swinging forward and the stance (whose RUN-1 version
// is not dynamically consistent: implied centre of pressure behind the heel, 2–2.8 BW) pitches the body forward in every variant tried.
// The brief allows the deliberate RUN → DIVE transition to be authored animation; what must stay physical is the incoming momentum, the state
// at the transition, the supported contacts and everything after. So:
//   • t ≤ t_TO (the free foot's last running toe-off): RUN-1 (frozen tag, read-only), geometrically scaled to the tackler (sp2a_author.mjs);
//   • t_TO < t < 0 (the final flight, ≈ 0.1 s): AUTHORED skeletal choreography — every joint a cubic Hermite from the run's own angle and rate
//     at t_TO to the committed plant state's angle and rate at t = 0; the pelvis orientation likewise; the ROOT is placed so that the whole-
//     body COM follows the exact ballistic arc from the run's own COM state at t_TO (gravity only: no airborne root acceleration). The flight's
//     duration is not free: T = (v_y,TO − v_y,plant) / g; the plant state's horizontal COM velocity is the run's;
//   • t ≥ 0: PHYSICS from the plant touchdown, in that committed state (pose = the last authored frame, body velocities = its rates) — SP2's
//     physical tackle (A6 regional yielding) + A7 contact-driven authority, optionally with the 3D tuck (sp2a_tuck.mjs) for the fold leg.
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), EN = await import(S1 + "sp_entry.mjs"), CL = await import(S1 + "sp_climits.mjs");
const AA = await import(new URL("./sp2a_author.mjs", import.meta.url).href), P2 = await import(new URL("../../slide_phys2/scripts/sp2_param.mjs", import.meta.url).href);
const { V, Q, B } = L, G = 9.81, D2R = Math.PI / 180;
const SP2P = JSON.parse(fs.readFileSync(new URL("../../slide_phys2/evidence/sp2/SP2_params.json", import.meta.url)));
const herm = (p0, m0, p1, m1, T, tau) => { const s = tau / T, s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * T * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * T * m1; };
// the physical tackle candidate (SP2 + SP2A options) — its entry is the committed plant state
export function tackleCand(speed, A = {}) { const c = P2.finalize(P2.makeCand(SP2P.phys || SP2P, speed, A.id || "SP2A"), "A6");
  if (A.contactAuth !== null) c.contactAuth = A.contactAuth || AA.CONTACT_AUTH;
  // A.morph (the SP2A refinement): SP2's own early fold is kept; between tA and tB (after the fold side has landed) the fold leg and the
  // seat orientation morph into a 3D tuck (hip flexion / adduction / external rotation, knee, ankle plantarflexion / inversion; pelvis pitch / roll)
  if (A.morph) { const M = A.morph, tr = c.chor.tracks, tA = M.tA, tB = M.tA + M.dT, val = (keys, t) => { let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++; const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : a[1]; };
    const morph = (name, target) => { const k = tr[name] || [[0, 0]]; tr[name] = [...k.filter(([tt]) => tt < tA), [tA, val(k, tA)], [tB, target], [1.7, target]]; };
    morph("hip_L.flex", M.hipFlex); morph("hip_L.abd", M.hipAbd); morph("hip_L.rot", M.hipRot); morph("knee_L.flex", M.knee); morph("ankle_L.df", M.ankDf); morph("ankle_L.inv", M.ankInv);
    if (c.seat) { const sp = c.seat.pelvis, sv = (keys, t) => val(keys, t); c.seat = { ...c.seat, gains: { ko: M.seatKo ?? c.seat.gains.ko, do: (M.seatKo ?? c.seat.gains.ko) * 0.14 },
      pelvis: { pitch: [...sp.pitch.filter(([tt]) => tt < tA), [tA, sv(sp.pitch, tA)], [tB, M.seatPitch], [1.7, M.seatPitch]], roll: [...sp.roll.filter(([tt]) => tt < tA), [tA, sv(sp.roll, tA)], [tB, M.seatRoll], [1.7, M.seatRoll + 2]], yaw: sp.yaw } }; } }
  if (A.tuck3d) { const tk = { ...AA.TUCK, ...(A.tuck || {}) }, tr = c.chor.tracks, s = A.tuckT ?? 0.4;   // the fold leg reaches the geometric 3D tuck by s
    tr["hip_L.abd"] = [[0, tr["hip_L.abd"][0][1]], [0.08, 0], [s, tk.hipAbd], [1.7, tk.hipAbd + 3]]; tr["hip_L.rot"] = [[0, 0], [0.08, -12], [s, tk.hipRot], [1.7, tk.hipRot + 4]];
    tr["hip_L.flex"] = [[0, 30], [0.05, 22], [0.1, 20], [0.15, 40], [s, tk.hipFlex], [1.7, tk.hipFlex - 4]]; tr["knee_L.flex"] = [[0, 22], [0.05, 32], [0.06, 60], [0.1, 90], [s, tk.knee], [1.7, tk.knee - 6]];
    tr["ankle_L.df"] = [[0, -6], [0.04, 8], [0.1, -20], [s, tk.ankDf], [1.7, tk.ankDf]]; tr["ankle_L.inv"] = [[0, 0], [0.11, 4], [s, tk.ankInv], [1.7, tk.ankInv]];
    if (c.seat && A.tuckSeat !== false) c.seat = { ...c.seat, pelvis: { pitch: [[0, 0], [s, tk.pitch], [1.7, tk.pitch]], roll: [[0, 0], [s, tk.roll], [1.7, tk.roll + 2]], yaw: [[0, 0], [1.7, 0]] } }; }
  return c; }
// the authored run-in + final flight ending exactly in the candidate's committed plant state
export function flightPlan(RI, cand) { const F = RI.F, kTD = RI.kTD, h = F[1].t - F[0].t; let kTO = kTD - 1; while (kTO > 1 && !(F[kTO].stance.R && !F[kTO + 1].stance.R)) kTO--;
  const SA0 = AA.statesAtFrame({ ...RI, k0: kTO }, [0, 0, 0]), com = (k) => L.comOf(SA0(k)), v0 = V.sc(V.sub(com(kTO + 1), com(kTO - 1)), 1 / (2 * h));
  // committed plant state: the candidate's entry, its root velocity adjusted so its COM velocity is the ballistic arrival velocity
  let E = EN.buildEntry(cand.entry); const nF = Math.max(4, Math.round(((v0[1] - E.comVel[1]) / G) / h)), T = nF * h, vT = [v0[0], v0[1] - G * T, v0[2]];
  const entry = { ...cand.entry, vRoot: V.add(cand.entry.vRoot, V.sub(vT, E.comVel)), note: (cand.entry.note || "") + " | SP2A: root velocity set to the ballistic arrival from the run's last toe-off" }; E = EN.buildEntry(entry);
  const c1 = E.com, c0 = V.add(V.sub(c1, V.sc(v0, T)), [0, 0.5 * G * T * T, 0]);   // c(T) = c0 + v0·T − ½ g T² ŷ = c1
  const off0 = V.sub(c0, com(kTO)), out = [];
  for (let k = RI.kS; k <= kTO; k++) { const S = SA0(k).map(s => ({ ...s, pos: V.add(s.pos, off0) })); out.push({ t: +((k - kTO) * h - T).toFixed(5), S, stance: F[k].stance, phase: "run" }); }
  // Hermite joint / pelvis-angle tracks from (angle, rate) at t_TO to the entry's (angle, rate)
  const a0 = F[kTO].anat, am = F[kTO - 1].anat, ap = F[kTO + 1].anat, keys = new Set(); for (const [j, v] of Object.entries(a0)) for (const k of Object.keys(v)) keys.add(j + "." + k);
  const pA = (k) => AA.pelvisAngles(AA.mapQ(F[k].pelvis.rot)), p0 = pA(kTO), pm = pA(kTO - 1), pp = pA(kTO + 1), p1 = cand.entry.pelvis, unwrap = (x) => ((x + 540) % 360) - 180;
  const flightAnat = (tau) => { const an = {}; for (const jk of keys) { const [j, k] = jk.split("."), th0 = a0[j][k], w0 = (ap[j][k] - am[j][k]) / (2 * h), th1 = (entry.anat[j] && entry.anat[j][k] != null) ? entry.anat[j][k] : 0, w1 = (entry.rate && entry.rate[j] && entry.rate[j][k] != null) ? entry.rate[j][k] : 0;
      (an[j] = an[j] || {})[k] = herm(th0, w0, th1, w1, T, tau); } return an; };
  const flightPelvis = (tau) => { const o = {}; for (const k of ["pitchDeg", "rollDeg", "yawDeg"]) { const w0 = unwrap(pp[k] - pm[k]) / (2 * h); o[k] = herm(p0[k], w0, p1[k] || 0, 0, T, tau); } return o; };
  for (let f = 1; f < nF; f++) { const tau = f * h, an = flightAnat(tau), R0 = EN.pelvisRot(flightPelvis(tau)), S0 = L.fk({ pos: [0, 0, 0], rot: R0 }, an), c = V.add(V.add(c0, V.sc(v0, tau)), [0, -0.5 * G * tau * tau, 0]), off = V.sub(c, L.comOf(S0));
    out.push({ t: +(tau - T).toFixed(5), S: S0.map(s => ({ ...s, pos: V.add(s.pos, off) })), stance: { L: false, R: false }, phase: "flight" }); }
  return { frames: out, entry, T, nF, kTO, v0, vT, c0, c1, flightAnat, flightPelvis }; }
export async function runFlight(runinFile, A = {}, steps = 480) { const RI = AA.loadRunIn(runinFile, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3), cand = tackleCand(speed, A), plan = flightPlan(RI, cand);
  const c2 = { ...cand, entry: plan.entry, id: A.id || "SP2A" }, o = await CL.auditRun(c2, { steps }); o.contactRule = c2.soleRule; o.candId = c2.id;
  o.runIn = plan.frames; o.entrySpec = plan.entry; o.flight = { T: plan.T, nF: plan.nF, v0: plan.v0, vT: plan.vT, kTO: plan.kTO }; o.tOffset = 0; o.speedTackler = speed; o.sp2aOpts = A; return o; }
if (process.argv[1] && process.argv[1].endsWith("sp2a_flight.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const o = await runFlight(arg("runin"), JSON.parse(arg("opts", "{}")), +arg("steps", "480")), m = P2.M.measure(o); if (arg("out")) L.writeGz(arg("out"), o);
  console.log(o.candId, o.finalHash, "flight T", o.flight.T.toFixed(4), "v0", o.flight.v0.map(x => x.toFixed(2)).join(","), "vT", o.flight.vT.map(x => x.toFixed(2)).join(","), "\n  ", P2.M.brief(m)); }
