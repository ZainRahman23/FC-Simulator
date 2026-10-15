// HAC-1 scenes: the HYBRID-RUN-1 fixtures (hybrid_run1/scripts/hr_scenes.mjs, unchanged and imported), plus:
//   SH_<sev>_OPP   the shoulder test MIRRORED: B starts on A's LEFT (1.1 m), heading toward A (+θ), straightening over [t_c − 0.1, t_c + 0.2] s,
//                  t_c solved the same way (intended COMs 0.42 m apart): directional generality (instruction §15 E).
//   PVP_<F2|F3>_<phase>  the frozen PVP-1 canonical tackle with the HAC-1 recipient, at three SUPPORT PHASES of the same struck right foot. The
//                  recipient's RUN-1 right stance is frames 554…606 (52 frames). The struck foot is planted at ONE point for its whole stance, so
//                  shifting only the recipient's RUN-1 start frame k0 (placement qR / offR unchanged: CANON's) makes the same unchanged tackle
//                  meet the same foot at the same place and time at a different phase of its stance:
//                    CANON  k0 462: contact at RUN-1 frame ≈ 582, 54 % of the stance (PVP-1 / HYBRID-RUN-1);
//                    EARLY  k0 444: ≈ 564, 19 % (the foot freshly loaded: its support impulse is still ahead of it);
//                    UNLOAD k0 478: ≈ 598, 85 % (unloading toward toe-off: most of its support already delivered).
//                  Each has its own TWIN (same recipient, tackler parked at its entry pose, never activated).
//   NC_<k0>        the no-contact runner from another start frame (the phase variants' own undisturbed reference, 60 m from the tackler).
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q } = L;
const HS = await import(RA + "hybrid_run1/scripts/hr_scenes.mjs"), HI = await import(RA + "hybrid_run1/scripts/hr_intent.mjs"), REC = await import(RA + "pvp1_running/scripts/pvp1_recipient.mjs");
const HW = await import(new URL("./hac_world.mjs", import.meta.url).href);
import fs from "fs";
const META = JSON.parse(fs.readFileSync(new URL("pvp1_running/evidence/PVP1_conditions_meta.json", RA))).CANON;
export const PHASE_K0 = { CANON: 462, EARLY: 444, UNLOAD: 478 }, R_STANCE = [554, 606];
let RUN = null; const run = () => RUN || (RUN = REC.loadRun(HS.RUNIN_R));
export function intentsSHopp(sev, steps) { const th = HS.SEV[sev], A = HI.makeIntent(run(), { kRef: HS.KREF, k0: HS.K0, nSteps: steps + 10 }), smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const qB = L.yawQ(th), B0 = HI.makeIntent(run(), { kRef: HS.KREF, k0: HS.K0 + HS.PHASE_B, qR: qB, offR: [0, 0, 0], nSteps: steps + 10 });
  const path = (tc, nEnd) => { const hd = (t) => -th * smooth((t - (tc - 0.1)) / 0.3); let p = B0.com(0).slice(); for (let n = 0; n < nEnd; n++) p = V.add(p, V.sc(Q.rot(L.yawQ(hd(n / 240)), B0.comVel(n)), 1 / 240)); return p; };
  const lat0 = path(9, 0)[0] - A.com(0)[0]; let lo = 0.2, hi = 3.0;
  for (let it = 0; it < 30; it++) { const tc = (lo + hi) / 2, nc = Math.round(tc * 240), dl = (A.com(nc)[0] - A.com(0)[0]) - (path(tc, nc)[0] - lat0 - HS.D0); if (dl > HS.D_C) lo = tc; else hi = tc; }
  const tc = Math.round(((lo + hi) / 2) * 240) / 240, nc = Math.round(tc * 240), heading = (t) => -th * smooth((t - (tc - 0.1)) / 0.3);
  const p = path(tc, nc), ac = A.com(nc), target = [ac[0] - HS.D_C, 0, ac[2]], offR = [target[0] - p[0], 0, target[2] - p[2]];
  const B = HI.makeIntent(run(), { kRef: HS.KREF, k0: HS.K0 + HS.PHASE_B, qR: qB, offR, nSteps: steps + 10, heading });
  return { A, B, theta: th, tc, dc: HS.D_C, d0: A.com(0)[0] - B.com(0)[0], offR }; }
// SH2 (HAC-1 fixture, added because the HYBRID-RUN-1 fixture leaves B running PRESSED against A: it straightens onto a lane 0.42 m from A, so
// the contact and leg interference never end). Same geometry and severities, but B's intent is a BUMP: heading +θ toward A until t_c − 0.1 s,
// then straightens over [t_c − 0.1, t_c + 0.2] s (as before) and diverges 3° away from A from t_c + 0.3 s, so B leaves A's shoulder. t_c is solved as before (intended COMs 0.42 m apart).
export const DIVERGE_DEG = 3;
export function intentsSH2(sev, steps, side = "right") { const th = HS.SEV[sev], sg = side === "right" ? 1 : -1, A = HI.makeIntent(run(), { kRef: HS.KREF, k0: HS.K0, nSteps: steps + 10 }), smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const qB = L.yawQ(-sg * th), B0 = HI.makeIntent(run(), { kRef: HS.KREF, k0: HS.K0 + HS.PHASE_B, qR: qB, offR: [0, 0, 0], nSteps: steps + 10 });
  // extra yaw on top of qB (−sg·θ): straighten (+θ) over [t_c − 0.1, t_c + 0.2] as the HYBRID-RUN-1 fixture, then diverge gently (DIVERGE_DEG
  // away from A over 0.4 s from t_c + 0.3), so B leaves A's shoulder instead of running pressed against it
  const hdOf = (tc) => (t) => sg * (th * smooth((t - (tc - 0.1)) / 0.3) + DIVERGE_DEG * smooth((t - (tc + 0.3)) / 0.4));
  const path = (tc, nEnd) => { const hd = hdOf(tc); let p = B0.com(0).slice(); for (let n = 0; n < nEnd; n++) p = V.add(p, V.sc(Q.rot(L.yawQ(hd(n / 240)), B0.comVel(n)), 1 / 240)); return p; };
  const lat0 = path(9, 0)[0] - A.com(0)[0]; let lo = 0.2, hi = 3.0;
  for (let it = 0; it < 30; it++) { const tc = (lo + hi) / 2, nc = Math.round(tc * 240), sepNow = sg * ((path(tc, nc)[0] - lat0 + sg * HS.D0) - (A.com(nc)[0] - A.com(0)[0])); if (sepNow > HS.D_C) lo = tc; else hi = tc; }
  const tc = Math.round(((lo + hi) / 2) * 240) / 240, nc = Math.round(tc * 240), p = path(tc, nc), ac = A.com(nc), target = [ac[0] + sg * HS.D_C, 0, ac[2]], offR = [target[0] - p[0], 0, target[2] - p[2]];
  const B = HI.makeIntent(run(), { kRef: HS.KREF, k0: HS.K0 + HS.PHASE_B, qR: qB, offR, nSteps: steps + 10, heading: hdOf(tc) });
  return { A, B, theta: th, tc, dc: HS.D_C, d0: sg * (B.com(0)[0] - A.com(0)[0]), offR, side }; }
export const intentPVPk = (k0, steps) => HI.makeIntent(run(), { kRef: HS.KREF, k0, qR: META.qR, offR: META.offR, nSteps: steps + 10 });
export async function runScene(name, steps = 783, opts = {}) {
  if (name === "NC") return HW.runHac({ intent: HS.intentNC(steps), opts, steps });
  let m = /^NC_(\d+)$/.exec(name); if (m) return HW.runHac({ intent: HI.makeIntent(run(), { kRef: HS.KREF, k0: +m[1], nSteps: steps + 10 }), opts, steps });
  m = /^SH2_(BRUSH|BUMP|STRONG)(_OPP)?$/.exec(name);
  if (m) { const I = intentsSH2(m[1], steps, m[2] ? "left" : "right"), o = await HW.runHac({ intent: I.A, opts, second: { kind: "hac", intent: I.B, opts }, steps }); o.scene = { name, fixture: "SH2", theta: I.theta, tc: I.tc, dc: I.dc, d0: I.d0, offRB: I.offR, side: I.side }; return o; }
  m = /^SH_(BRUSH|BUMP|STRONG)(_OPP)?$/.exec(name);
  if (m) { const I = m[2] ? intentsSHopp(m[1], steps) : HS.intentsSH(m[1], steps), o = await HW.runHac({ intent: I.A, opts, second: { kind: "hac", intent: I.B, opts }, steps }); o.scene = { name, theta: I.theta, tc: I.tc, dc: I.dc, d0: I.d0, offRB: I.offR, side: m[2] ? "left" : "right" }; return o; }
  m = /^PVP_(F2|F3|TWIN)(?:_(CANON|EARLY|UNLOAD))?$/.exec(name);
  if (m) { const ph = m[2] || "CANON", I = intentPVPk(PHASE_K0[ph], steps), o = m[1] === "TWIN" ? await HW.runHac({ intent: I, opts, second: null, parkAt: null, steps }) : await HW.runHac({ intent: I, opts, second: { kind: m[1], runinT: HS.RUNIN_T }, steps });
    o.scene = { name, phase: ph, k0: PHASE_K0[ph], rStance: R_STANCE, pvp1: { qR: META.qR, offR: META.offR, kRef: HS.KREF } }; return o; }
  throw new Error("scene " + name); }
// RUN-1 data limit for an intent starting at k0 (the run-in has 1249 frames; the intent freezes after its last frame)
export const validSteps = (k0) => 1249 - 2 - k0 - 2;
if (process.argv[1] && process.argv[1].endsWith("hac_scenes.mjs")) { const out = process.argv[3]; fs.mkdirSync(out, { recursive: true }); const opts = process.argv[5] ? JSON.parse(process.argv[5]) : {};
  for (const nm of process.argv[2].split(",")) { const o = await runScene(nm, +(process.argv[4] || 783), opts); L.writeGz(`${out}/${nm}.json.gz`, o); console.log(nm, "hash", o.finalHash, "steps", o.recs.length, "stop", JSON.stringify(o.stop), "wall", (o.wallMs / 1000).toFixed(1)); } }
