// technical_control15/tools/tc15_eval.mjs — THE EVIDENCE for the five references: per reference the approach / contact / exit numbers, the ball's
// relation to the support leg and the body, the ball-exposure diagnostic per phase, the posed body's quality (leg clearances, the ball against both
// boots, the joint ranges, the ankle's orientation error, the reach adaptation), and the owner's 8-point RONALDO CHOP ACCEPTANCE TEST.
//   node tc15_eval.mjs <out.json>
import fs from "fs"; import { makeRef, TECH } from "./tc15_env.mjs"; import { DIRS } from "../tc15_ref.js"; import { summarise } from "./tc15_protect.mjs";
const DT = 1 / 240, DEG = Math.PI / 180, hyp = Math.hypot, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000, wrapD = (d) => ((d + 540) % 360) - 180;
const PRESS = { rightAhead: ["front", "right"], left: ["left", "front"], front: ["front"], rightRear: ["right", "rearRight"] };
export function evaluate(id) {
  const r = makeRef(id).run(), T = r.T, tC = T.tC, at = (t) => r.rec[Math.max(0, Math.min(r.rec.length - 1, Math.round(t / DT)))], L = (p) => r.P2L(p);
  const sp = (t) => hyp(...r.vel(t)), trav = (t) => wrapD(Math.atan2(r.vel(t)[1], r.vel(t)[0]) / DEG - r.th0 / DEG), face = (t) => wrapD(r.psi(t) / DEG - r.th0 / DEG);
  const cD = r.contacts.find((c) => Math.abs(c.t - tC) < 0.003), iD = r.contacts.indexOf(cD);
  // approach: the mean speed over the run-up before any braking (0.2 – 0.7 s); the speed at the decisive contact; the minimum after it
  let vApp = 0, n = 0; for (let t = 0.2; t <= 0.7; t += 0.01) { vApp += sp(t); n++; } vApp /= n;
  let vMin = 99, tMin = tC; for (let t = tC - 0.2; t <= tC + 0.6; t += DT) if (sp(t) < vMin) { vMin = sp(t); tMin = t; }
  // the body on the new line: within 15° of the exit heading at ≥ 2.5 m/s (or 60 % of the approach), held 0.2 s
  const want = T.turnDeg, vLine = Math.min(2.5, 0.6 * vApp), ok = (t) => sp(t) >= vLine && Math.abs(wrapD(trav(t) - want)) < 15;
  let tLine = null; for (let t = tC; t < r.dur - 0.2; t += 0.01) if (ok(t)) { let held = true; for (let u = t; u < t + 0.2; u += 0.02) if (!ok(u)) { held = false; break; } if (held) { tLine = t; break; } }
  const acc = (() => { const t0 = tMin, t1 = Math.min(r.dur, tMin + 0.5); return (sp(t1) - sp(t0)) / (t1 - t0); })();
  // the contacts of the action: from the last run-up touch before the action to the exit touch (the first contact on the new line)
  const actC = r.contacts.filter((c) => c.t >= tC - 0.6 && c.t <= (tLine != null ? tLine + 0.35 : tC + 0.7)).map((c) => ({ t: r3(c.t - tC), F: c.F, surface: c.surface, role: c.role, outDeg: r2(c.outDeg), speedOut: r2(c.speedOut) }));
  // the support foot at the decisive contact and the ball relative to it (its own frame: along the foot, + = toward the toe; across, + = its right)
  const sup = r.st[cD.F === "R" ? "L" : "R"].find((s) => s.t0 <= tC + 1e-6 && s.t1 >= tC - 1e-6), supF = sup ? r.stanceFoot(sup, tC) : null;
  const rel = (p, f) => { const d = [p[0] - f.ank[0], p[1] - f.ank[1]], c = Math.cos(f.yaw), s = Math.sin(f.yaw); return [r3(d[0] * c + d[1] * s), r3(-d[0] * s + d[1] * c)]; };
  const heelOf = (f) => [f.ank[0] - Math.cos(f.yaw) * 0.08, f.ank[1] - Math.sin(f.yaw) * 0.08];
  let ballVsSupport = null; if (supF) { const B = cD.ball, H = heelOf(supF), dir = [Math.cos(supF.yaw), Math.sin(supF.yaw)];
    // after the contact: where the ball crosses the support foot's long axis (behind the heel = negative along the foot from the heel)
    let cross = null; let prevSide = null; for (let t = tC; t < tC + 0.5; t += DT) { const q = at(t), b = [q.ball.p[0], q.ball.p[2]], v = [b[0] - H[0], b[1] - H[1]], side = -v[0] * dir[1] + v[1] * dir[0], along = v[0] * dir[0] + v[1] * dir[1];
      if (prevSide != null && Math.sign(side) !== Math.sign(prevSide)) { cross = { t: r3(t - tC), alongFromHeel: r3(along) }; break; } prevSide = side; }
    // (in the RUN's frame, as the owner words it: the ball crosses the support foot's lateral line — from the ball's side to the far side —
    // behind its heel)
    const Hl = r.P2L(H), Al = r.P2L(supF.ank), Bl0 = r.P2L(B), s0 = Math.sign(Bl0[1] - Al[1]); let crossRun = null;
    for (let t = tC; t < tC + 0.5; t += DT) { const q = at(t), bl = r.P2L([q.ball.p[0], q.ball.p[2]]); if (Math.sign(bl[1] - Al[1]) !== s0) { crossRun = { t: r3(t - tC), behindHeel: r3(Hl[0] - bl[0]) }; break; } }
    ballVsSupport = { atContact: rel(B, supF), crossesFootAxis: cross, crossesRunLine: crossRun }; }
  // the ball under / through the body: its closest approach to the pelvis's ground point in the 0.3 s after the contact
  let dPel = 9, tPel = 0; for (let t = tC; t <= tC + 0.3; t += DT) { const q = at(t), d = hyp(q.ball.p[0] - q.Ppel[0], q.ball.p[2] - q.Ppel[1]); if (d < dPel) { dPel = d; tPel = t - tC; } }
  // protection per phase (the obvious pressure side named by the technique)
  const ph = { contact: summarise(r.rec, tC - 0.03, tC + 0.03), protection: summarise(r.rec, tC, tC + 0.25), exit: summarise(r.rec, tC + 0.25, tC + 0.6) }, pr = PRESS[T.pressure.from] || ["front"];
  const pressureBlocked = Object.fromEntries(Object.entries(ph).map(([k, v]) => [k, r2(1 - pr.reduce((a, d) => a + v.exposedShare[d], 0) / pr.length)]));
  // body quality over the whole clip
  let clr = 9, clrT = 0, gap = 9, gapT = 0, rom = 0, romT = 0, romJ = "", err = 0, errT = 0, reach = 0, reachT = 0;
  for (const q of r.rec) { const m = Math.min(q.clr.foot, q.clr.shin, q.clr.thigh, q.clr.footCalf, q.clr.footKnee); if (m < clr) { clr = m; clrT = q.t; }
    if (!r.contacts.some((c) => Math.abs(c.t - q.t) < 0.006)) for (const X of ["R", "L"]) if (q.gap[X].gap < gap) { gap = q.gap[X].gap; gapT = q.t; }
    for (const X of ["R", "L"]) { for (const [j, v] of Object.entries(q.legA[X].over)) if (v > rom) { rom = v; romT = q.t; romJ = X + " " + j; } if (q.legA[X].err > err) { err = q.legA[X].err; errT = q.t; } }
    if (q.reach > reach) { reach = q.reach; reachT = q.t; } }
  const out = { id, label: T.label, family: T.family, turnDeg: T.turnDeg, pressure: T.pressure,
    approach: { speed: r2(vApp), atDecisiveContact: r2(sp(tC)), min: r2(vMin), tMin: r3(tMin - tC) },
    decisive: { t: tC, F: cD.F, surface: cD.surface, role: cD.role, ballIn: r2(hyp(...cD.vIn)), ballOut: r2(cD.speedOut), ballOutDeg: r2(cD.outDeg), ballTurnDeg: r2(Math.abs(cD.outDeg)), impulseDeg: r2(wrapD(Math.atan2(cD.n[1], cD.n[0]) / DEG - r.th0 / DEG)), footYawDeg: cD.pose ? r2(wrapD(cD.pose.yaw / DEG - r.th0 / DEG)) : null, actualFace: at(tC).gap[cD.F].face },
    exit: { bodyHeading05: r2(trav(tC + 0.5)), pelvisHeading035: r2(face(tC + 0.35)), timeToLine: tLine != null ? r3(tLine - tC) : null, accel: r2(acc), speed05: r2(sp(tC + 0.5)), speed10: r2(sp(Math.min(r.dur, tC + 1.0))) },
    contacts: actC, contactsInAction: actC.length, ballVsSupport, ballNearestPelvis: { d: r3(dPel), t: r3(tPel) }, protection: ph, pressureBlocked,
    body: { minLegClearanceCm: r2(clr * 100), atT: r3(clrT), minBallBootGapCm: r2(gap * 100), gapT: r3(gapT), romOverHardDeg: r2(rom), romT: r3(romT), romJoint: romJ, ankleErrMaxDeg: r2(err), ankleErrT: r3(errT), reachAdaptCm: r2(reach * 100), reachT: r3(reachT) } };
  if (id === "CHOP90") out.acceptance = chopTest(r, out, sup, supF, heelOf);
  return out;
}
// THE OWNER'S RONALDO CHOP ACCEPTANCE TEST (8 points; the failure condition: the ball kicked externally around the body)
function chopTest(r, e, sup, supF, heelOf) {
  const tC = r.T.tC, at = (t) => r.rec[Math.round(t / DT)], cD = r.contacts.find((c) => Math.abs(c.t - tC) < 0.003), L = (p) => r.P2L(p), B = L(cD.ball);
  const sL = L(sup.pos), Ht = L(heelOf(supF)), Rc = L(cD.pose.ank);
  // the striking foot's path in the 0.15 s after the contact: its most backward point relative to the support heel (along the run)
  let rBack = 9; for (let t = tC; t <= tC + 0.15; t += DT) { const a = L(r.footAt(cD.F, t).ank); rBack = Math.min(rBack, a[0] - Ht[0]); }
  const P = (t) => at(t).exp;
  const tests = [
    { n: 1, test: "approaching at useful speed (≥ 4.5 m/s)", value: `${e.approach.speed} m/s; ${e.approach.atDecisiveContact} at the chop`, pass: e.approach.speed >= 4.5 },
    { n: 2, test: "the shielding (left) leg moves across / in front of the ball", value: `left foot lands ${(sL[0] - B[0]).toFixed(2)} m ahead of the ball, ${(B[1] - sL[1]).toFixed(2)} m to its left; ${(sup.t0 - tC).toFixed(2)} s before the chop`, pass: sL[0] - B[0] >= 0.10 && sup.t0 < tC },
    { n: 3, test: "the striking foot comes behind / across it", value: `at the chop the right ankle is ${(Ht[0] - Rc[0]).toFixed(2)} m behind the left heel; it sweeps to ${(-rBack).toFixed(2)} m behind it`, pass: Rc[0] < Ht[0] },
    { n: 4, test: "the inside of the striking foot contacts the ball", value: `surface ${cD.surface}; the boot face on the ball (DRIBBLE-1's hull): ${e.decisive.actualFace}`, pass: cD.surface === "INSIDE" && e.decisive.actualFace === "INSIDE" },
    { n: 5, test: "the ball travels behind / across the shielding leg through the stance", value: e.ballVsSupport && e.ballVsSupport.crossesRunLine ? `crosses the left foot's line ${e.ballVsSupport.crossesRunLine.behindHeel.toFixed(2)} m behind its heel at +${e.ballVsSupport.crossesRunLine.t} s; nearest the pelvis ${e.ballNearestPelvis.d} m at +${e.ballNearestPelvis.t} s` : "does not cross the shielding leg's line", pass: !!(e.ballVsSupport && e.ballVsSupport.crossesRunLine && e.ballVsSupport.crossesRunLine.behindHeel > 0 && e.ballNearestPelvis.d <= 0.3) },
    { n: 6, test: "the body blocks the obvious pressure line (a defender level-ahead, committed forward; alongside on the right shown too)", value: `a reach from the FRONT blocked ${r2(1 - e.protection.contact.exposedShare.front)} at the chop, ${r2(1 - e.protection.protection.exposedShare.front)} through the stance · from the RIGHT ${r2(1 - e.protection.contact.exposedShare.right)} / ${r2(1 - e.protection.protection.exposedShare.right)} (the right side opens as the striking leg recovers: a limitation)`, pass: 1 - e.protection.contact.exposedShare.front >= 0.8 && 1 - e.protection.protection.exposedShare.front >= 0.8 },
    { n: 7, test: "the player lands / orients toward the new line", value: `pelvis ${e.exit.pelvisHeading035}° at +0.35 s (exit ${r.T.turnDeg}°); travel ${e.exit.bodyHeading05}° at +0.5 s; on the line at +${e.exit.timeToLine} s`, pass: Math.abs(wrapD(e.exit.pelvisHeading035 - r.T.turnDeg)) <= 20 && e.exit.timeToLine != null },
    { n: 8, test: "immediate acceleration out", value: `${e.approach.min} m/s at +${e.approach.tMin} s → ${e.exit.speed05} m/s at +0.5 s → ${e.exit.speed10} at +1.0 s (${e.exit.accel} m/s² over 0.5 s)`, pass: e.exit.accel >= 1.5 },
  ];
  const external = e.ballNearestPelvis.d > 0.35;
  return { tests, passed: tests.filter((x) => x.pass).length, of: tests.length, failCondition: { test: "the ball kicked externally around the player's body", value: `ball nearest the pelvis ${e.ballNearestPelvis.d} m`, fail: external } };
}
if (process.argv[1] && process.argv[1].endsWith("tc15_eval.mjs")) { const out = Object.keys(TECH).map(evaluate); fs.writeFileSync(process.argv[2] || "tc15_evidence.json", JSON.stringify(out, null, 1));
  for (const e of out) { console.log(`${e.id}: approach ${e.approach.speed} → ${e.approach.atDecisiveContact} at contact, min ${e.approach.min}; ball ${e.decisive.ballOutDeg}° ${e.decisive.ballOut} m/s (${e.decisive.surface}, face ${e.decisive.actualFace}); body ${e.exit.bodyHeading05}° at +0.5; line +${e.exit.timeToLine}; accel ${e.exit.accel}; contacts ${e.contactsInAction}; pelvis-ball ${e.ballNearestPelvis.d}; pressure blocked ${JSON.stringify(e.pressureBlocked)}; clr ${e.body.minLegClearanceCm} gap ${e.body.minBallBootGapCm} rom ${e.body.romOverHardDeg} (${e.body.romJoint}) err ${e.body.ankleErrMaxDeg} reach ${e.body.reachAdaptCm}`);
    if (e.acceptance) { for (const t of e.acceptance.tests) console.log(`   ${t.pass ? "PASS" : "FAIL"} ${t.n}. ${t.test}: ${t.value}`); console.log(`   ${e.acceptance.passed}/${e.acceptance.of}; external-kick fail condition: ${e.acceptance.failCondition.fail ? "FAILED" : "not triggered"} (${e.acceptance.failCondition.value})`); } } }
