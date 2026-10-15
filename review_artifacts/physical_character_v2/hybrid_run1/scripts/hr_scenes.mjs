// HYBRID-RUN-1 scenes. Every scene is fixed before it is run: geometry, intents, timing.
//   NC        one hybrid runner, no opponent (a parked, never-activated body 60 m away), RUN-1 at 4.5 m/s from frame 462: the frame at which the PVP-1
//             recipient's RUN-1 clock started, so NC is also the PVP rerun's no-tackle runner at its own placement. Compared with RUN-1 itself.
//   SH_<sev>  two hybrid runners side by side. A runs straight along +z (RUN-1 from frame 462). B starts on A's RIGHT (facing +z, A's left is −x),
//             1.1 m away (COM to COM), half a step out of phase (RUN-1 from frame 543 = 462 + 81), and runs at an intended heading θ toward A. Its
//             intent STRAIGHTENS over [t_c − 0.1, t_c + 0.2] s: a scheduled intent ("veer in, then run on"), independent of any contact. t_c is
//             computed so that B's intended COM is 0.42 m beside A's intended COM at t_c, and level with it. Severity is the closing angle only:
//               BRUSH 6°, BUMP 10°, STRONG 15° (lateral closing speeds ≈ 0.47 / 0.78 / 1.16 m/s at 4.5 m/s).
//             Whether anybody stumbles or falls is not set anywhere.
//   PVP_<F2|F3|TWIN>  the frozen PVP-1 canonical setup (pvp1_running/scripts/pvp1_setup.mjs, CANON):
//             - the tackler is SP2F2 / SP2F3 unchanged, at 5.0 m/s in its own solo frame, activated at step 0;
//             - the recipient is placed by the PVP-1 CANON yaw (−135°) and offset, and its RUN-1 clock is PVP-1's (frame 462 at step 0, kRef 568),
//               so the same RUN-1 phase meets the same tackle at the same time;
//             - ONLY the recipient architecture changes: the hybrid runner from step 0 instead of a handoff to a fully physical body.
//             TWIN: the same recipient, with the tackler parked at its entry pose (never activated), exactly as PVP-1's twin.
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q } = L;
const REC = await import(RA + "pvp1_running/scripts/pvp1_recipient.mjs"), HI = await import(new URL("./hr_intent.mjs", import.meta.url).href), HW = await import(new URL("./hr_world.mjs", import.meta.url).href);
const SCR = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/";
export const RUNIN_R = SCR + "pvp1/run1r_4.147.json", RUNIN_T = SCR + "sp2a/run1g_4.608.json", KREF = 568, K0 = 462;
export const SEV = { BRUSH: 6, BUMP: 10, STRONG: 15 }, D0 = 1.1, D_C = 0.42, PHASE_B = 81;
const PVP1META = JSON.parse(fs.readFileSync(new URL("pvp1_running/evidence/PVP1_conditions_meta.json", RA))).CANON;
let RUN = null; const run = () => RUN || (RUN = REC.loadRun(RUNIN_R));
export function intentNC(steps) { return HI.makeIntent(run(), { kRef: KREF, k0: K0, nSteps: steps + 10 }); }
export function intentsSH(sev, steps) { const th = SEV[sev], A = HI.makeIntent(run(), { kRef: KREF, k0: K0, nSteps: steps + 10 }), smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const qB = L.yawQ(-th), B0 = HI.makeIntent(run(), { kRef: KREF, k0: K0 + PHASE_B, qR: qB, offR: [0, 0, 0], nSteps: steps + 10 });
  // B's intended COM path (its rotated RUN-1 velocity turned by the heading schedule), integrated from step 0; heading(t) = θ·smooth((t − (t_c − 0.1)) / 0.3)
  const path = (tc, nEnd) => { const hd = (t) => th * smooth((t - (tc - 0.1)) / 0.3); let p = B0.com(0).slice(); for (let n = 0; n < nEnd; n++) p = V.add(p, V.sc(Q.rot(L.yawQ(hd(n / 240)), B0.comVel(n)), 1 / 240)); return p; };
  // lateral closing of the intended paths from D0 (at step 0) to D_C (at t_c): solve t_c by bisection (A's intended lateral position is ~constant)
  const lat0 = path(9, 0)[0] - A.com(0)[0]; let lo = 0.2, hi = 3.0;
  for (let it = 0; it < 30; it++) { const tc = (lo + hi) / 2, nc = Math.round(tc * 240), dl = (path(tc, nc)[0] - lat0 + D0) - (A.com(nc)[0] - A.com(0)[0]); if (dl > D_C) lo = tc; else hi = tc; }
  const tc = Math.round(((lo + hi) / 2) * 240) / 240, nc = Math.round(tc * 240), heading = (t) => th * smooth((t - (tc - 0.1)) / 0.3);
  const p = path(tc, nc), ac = A.com(nc), target = [ac[0] + D_C, 0, ac[2]], offR = [target[0] - p[0], 0, target[2] - p[2]];
  const B = HI.makeIntent(run(), { kRef: KREF, k0: K0 + PHASE_B, qR: qB, offR, nSteps: steps + 10, heading });
  return { A, B, theta: th, tc, dc: D_C, d0: B.com(0)[0] - A.com(0)[0], offR }; }
export function intentPVP(steps) { return HI.makeIntent(run(), { kRef: KREF, k0: K0, qR: PVP1META.qR, offR: PVP1META.offR, nSteps: steps + 10 }); }
export async function runScene(name, steps = 720) {
  if (name === "NC") return HW.runHybrid({ intent: intentNC(steps), steps });
  if (name.startsWith("SH_")) { const I = intentsSH(name.slice(3), steps); const o = await HW.runHybrid({ intent: I.A, second: { kind: "hybrid", intent: I.B }, steps }); o.scene = { name, theta: I.theta, tc: I.tc, dc: I.dc, d0: I.d0, offRB: I.offR }; return o; }
  if (name.startsWith("PVP_")) { const k = name.slice(4), I = intentPVP(steps);
    const o = k === "TWIN" ? await HW.runHybrid({ intent: I, second: null, parkAt: null, steps }) : await HW.runHybrid({ intent: I, second: { kind: k, runinT: RUNIN_T }, steps });
    o.scene = { name, pvp1: { qR: PVP1META.qR, offR: PVP1META.offR, k0: K0, kRef: KREF, firstContactPVP1: PVP1META.firstContact } }; return o; }
  throw new Error("scene " + name); }
if (process.argv[1] && process.argv[1].endsWith("hr_scenes.mjs")) { const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  for (const nm of process.argv[2].split(",")) { const o = await runScene(nm, +(process.argv[4] || 720)); L.writeGz(`${out}/${nm}.json.gz`, o); console.log(nm, "hash", o.finalHash, "steps", o.recs.length, "stop", JSON.stringify(o.stop), "wall", (o.wallMs / 1000).toFixed(1)); } }
