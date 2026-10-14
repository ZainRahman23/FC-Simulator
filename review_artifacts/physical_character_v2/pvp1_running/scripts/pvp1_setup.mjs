// PVP-1 frozen setup: geometry, timing, conditions, placement. One rule for every condition.
//
// TACKLERS: SP2F2 / SP2F3 at their canonical speed of 5.0 m/s (RUN-1 run-in 4.608 × LEGR), each in its own solo frame (travel +z), activated at
//   step 0. Neither is moved, rotated, re-timed or re-tuned for any condition.
// RECIPIENT: RUN-1 at 4.147 × LEGR = 4.5 m/s, a normal football running / dribbling speed. Placement yaw ψ = −135°: it runs toward the tackler's
//   slide line, and the tackler approaches from the recipient's FRONT-RIGHT at 135° between the two travel directions. This is REFERENCE3
//   mirrored: there a right-side slider comes in from the front-left, so for our left-side slider it is the front-right. The near foot, and the
//   struck stance foot, is the RIGHT foot (stance from RUN-1 frame 554, t = 2.708 s, of the extracted run-in; stance 0.212 s).
// SPATIAL PLACEMENT: the tackling boot's position at t_b = (its first fold-side turf contact + 0.12 s), the SP2 Stage-3 rule, as the mean of the
//   SP2F2 and SP2F3 solo runs, is the target. The recipient is translated so that the struck boot's sole centre, shifted by λ along its travel
//   direction (+ toward the toes), is at that target, on the turf plane. LIGHT and STRONG differ only in λ.
// TIMING: the recipient's RUN-1 clock is aligned so that its stride phase at the FIRST player–player contact is the condition's phase, as a
//   fraction of the RUN-1 stance. The first contact is measured from the runs, and one alignment iteration uses the mean of F2 and F3.
//   EARLY and LATE differ only in phase.
// HANDOFF: 0.05 s before the predicted first contact, and never earlier than 25 ms after the struck foot's touchdown (SP2A's takeover rule:
//   RUN-1's landing transient is over). It is the RUN-1 state of that frame, so it is identical for F2 and F3. Until then the recipient is
//   RUN-1's own animation (presentation) and is parked, inert.
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L;
const REC = await import(new URL("./pvp1_recipient.mjs", import.meta.url).href), W = await import(new URL("./pvp1_world.mjs", import.meta.url).href);
const SF2 = await import(RA + "sp2f/v2/scripts/sp2f2_cand.mjs"), SF3 = await import(RA + "sp2f/v3/scripts/sp2f3_cand.mjs"), FC = await import(RA + "sp2a/fsweep/scripts/fs_contact.mjs"), RF = await import(RA + "sp2f/scripts/sp2f_run.mjs");
const SCR = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/";
export const RUNIN_T = SCR + "sp2a/run1g_4.608.json", RUNIN_R = SCR + "pvp1/run1r_4.147.json";
export const PSI = -135, QR = L.yawQ(PSI), K_TD = 554, H = 1 / 240, LEAD = 0.05, TAKEOVER_MIN = 6;
export const RECIPIENT_OPTS = { muscle: "M1c", catch: {}, support: { capScale: false } };
export const CONDS = {
  CANON: { phase: 0.5, lam: 0.0, note: "canonical: first contact at mid-stance of the loaded right foot; the boot's line through the foot's sole centre" },
  EARLY: { phase: 0.3, lam: 0.0, note: "TIMING EARLY: first contact at 30 % of the right stance (the foot just loaded)" },
  LATE: { phase: 0.7, lam: 0.0, note: "TIMING LATE: first contact at 70 % of the right stance (heel rising, unloading toward push-off)" },
  LIGHT: { phase: 0.5, lam: 0.16, note: "LIGHT / GLANCING: the boot's line 0.16 m toward the toes (it passes across the toe box and the ball area)" },
  STRONG: { phase: 0.5, lam: -0.07, note: "STRONG: the boot's line 0.07 m behind the sole centre (heel / ankle: a direct sweep of the base of the stance leg)" } };
// the tackler-alone reference (solo plant, the unchanged candidate, F37.5): first fold-side body turf contact, and the tackling boot at +0.12 s
export async function soloRef(kind, steps = 240) { const X = JSON.parse(fs.readFileSync(new URL(W.TACKLERS[kind].opts, RA))), run = kind === "F2" ? SF2.runSP2F2 : SF3.runSP2F3;
  const o = await run(RUNIN_T, X, steps, { setup: FC.sweepSetup(RF.TEMP_M) }); let first = null;
  for (const r of o.recs) { const cs = r.contacts.filter(c => c.kind.startsWith("turf") && c.Jn > 0).map(c => (c.a === "turf" ? c.b : c.a)[1]); if (cs.some(x => !x.startsWith("foot_"))) { first = r.t; break; } }
  const tb = first + 0.12, rr = o.recs.find(r => r.t >= tb - 1e-9); return { kind, firstBodyT: first, tb, boot: rr.S[bi("foot_R")].com, bootTraj: o.recs.map(r => [r.t, r.S[bi("foot_R")].com]) }; }
// the recipient for one condition and one clock alignment: tFC = the (predicted or measured) first-contact time on the world clock
export function recipientFor(cond, target, tFC, run = null) { const C0 = CONDS[cond], R = run || REC.loadRun(RUNIN_R), F = R.F, stanceN = (() => { let k = K_TD; while (F[k].stance.R) k++; return k - K_TD; })();
  const kC = K_TD + Math.round(C0.phase * stanceN), kH = Math.max(K_TD + TAKEOVER_MIN, kC - Math.round(LEAD / H)), Hh = REC.handoff(R, kH);
  // the struck boot's sole centre at the contact frame, in the handoff's local frame (the boot is planted: it is the same point all stance)
  const S = Hh.SA(kC), f = S[bi("foot_R")], sole = V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])), dirL = Q.rot(Hh.SA(kH)[0].rot, [0, 0, 1]), dl = V.norm([dirL[0], 0, dirL[2]]);
  const pL = V.add(sole, V.sc(dl, C0.lam)), pW = Q.rot(QR, pL), offR = [target[0] - pW[0], 0, target[2] - pW[2]];
  const tH = tFC - (kC - kH) * H, actR = Math.round(tH / H), CO = REC.continuation(Hh, 2.6, 0.06, QR);
  return { cond, C: C0, kC, kH, kTD: K_TD, stanceN, H: Hh, CO, qR: QR, offR, actR, tFC, opts: RECIPIENT_OPTS, run: R, target, soleWorld: V.add(Q.rot(QR, sole), offR) }; }
