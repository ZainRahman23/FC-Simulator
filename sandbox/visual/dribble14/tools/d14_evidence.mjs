// dribble14/tools/d14_evidence.mjs — review evidence for DRIBBLE-1.2 and, with the same instruments, for its references DRIBBLE-1.1 / DRIBBLE-1 (ver d12 | d11 | d1):
//   reliability "IDs|all" seeds ver arch prof out — per scenario × seed (as DRIBBLE-1's tool): touches, CONTROLLED share, longest LOOSE spell, end
//       state, the TURN taken with the ball (released by a touch + final heading within 20° + controlled at the end), kernel faults; plus, per
//       deliberate touch: executed launch speed, its lateral component (player's heading frame), cut-release / stage / recovery, the follow-through
//       used (yield / arc intensities), the ACTUAL boot / toe clearance of the touching foot measured in the ball kernel (+25 / 50 / 100 / 150 / 200 ms
//       after the launch, and the minimum over 250 ms), ball ↔ touching-foot and ball ↔ COM distance at +50 / 100 / 200 ms, and SECOND CONTACTS:
//       any later contact of the touching foot (boot / toe) within 250 ms, and of the other foot within 250 ms (time, part, impulse)
//   free "IDs|all" seeds ver out — the free-ball audit (as DRIBBLE-1): between launches / body contacts the live ball equals a collider-free re-simulation
//   cpu "IDs|all" seeds ver out — wall clock per component per simulated second; resolver = wall − locomotion − ball; per physics step; planning
//       passes and new locomotion tracks per simulated second; predicted ticks; worst scenario
//   touches "ID:seed[:prof[:arch[:ver]]],…" out — every deliberate touch (pitch frame), as DRIBBLE-1's touch log, with the follow-through fields
import fs from "fs"; import { makeSim, DT, PROFILES } from "./d14_env.mjs"; import { cutQuality } from "./d14_quality.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js"; import { distance } from "../../ballphys1/geometry.js";
const [mode, idsArg, a2, a3, a4, a5, a6] = process.argv.slice(2);
const ids = (s) => (s === "all" ? list().map((x) => x.id) : s.split(","));
const r3 = (x) => (x == null ? null : +(+x).toFixed(3)), m = (a) => { const v = a.filter((x) => x != null && isFinite(x)); return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(3) : null; };
const med = (a) => { const v = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); return v.length ? +v[v.length >> 1].toFixed(3) : null; };
const R = 0.11, TICKS = { 25: 6, 50: 12, 100: 24, 150: 36, 200: 48 };
// the instrument: after every step, the touching foot's boot / toe clearance to the ball as the kernel sees it, for 250 ms after each launch
export function instrument(S) {
  const step0 = S.step.bind(S), pid = S.pid; S.ftProbe = [];
  S.step = function () { step0(); const W = S.W, k = S.k;
    for (const T of S.touches) { if (!T.launched || k - T.k < 1 || k - T.k > 60) continue; const cB = W.colliders.find((c) => c.id === `${pid}:boot_${T.F}`), cT = W.colliders.find((c) => c.id === `${pid}:toe_${T.F}`);
      const g = Math.min(distance(cB, W.ball.p, W.time).d, distance(cT, W.ball.p, W.time).d) - R, fp = cB.p, com = [S.A.P[0], 0, S.A.P[1]];
      (T.clr = T.clr || []).push([k - T.k, g, Math.hypot(W.ball.p[0] - fp[0], W.ball.p[2] - fp[2]), Math.hypot(W.ball.p[0] - com[0], W.ball.p[2] - com[2])]); } };
  return S;
}
export function touchRows(S) {
  return S.touches.filter((t) => t.launched).map((t) => {
    const at = (n) => { const r = (t.clr || []).find((x) => x[0] === n); return r || null; }, clr = {}; for (const [ms, n] of Object.entries(TICKS)) { const r = at(n); clr[ms] = r ? r3(r[1] * 1000) : null; }
    const minClr = (t.clr || []).length ? r3(Math.min(...t.clr.map((x) => x[1])) * 1000) : null, sepF = {}, sepC = {}; for (const ms of [50, 100, 200]) { const r = at(TICKS[ms]); sepF[ms] = r ? r3(r[2]) : null; sepC[ms] = r ? r3(r[3]) : null; }
    const v = t.executed.v, th = Math.atan2(-0, 1), hd = (t.com && S.rec) ? null : null; void th; void hd;
    const psi = (S.rec && S.rec[t.k] ? S.rec[t.k].psi : 0), fwd = [Math.cos(psi), -Math.sin(psi)], vp = [v[0], -v[2]], along = vp[0] * fwd[0] + vp[1] * fwd[1], lat = -vp[0] * fwd[1] + vp[1] * fwd[0];
    const own = S.contacts.filter((c) => c.own && c.k > t.k && c.k - t.k <= 60);
    const same = own.filter((c) => c.part === "boot_" + t.F || c.part === "toe_" + t.F), other = own.filter((c) => !(c.part === "boot_" + t.F || c.part === "toe_" + t.F));
    return { t: r3(t.t), F: t.F, reg: t.reg, role: t.role || null, speed: r3(t.executed.speed), along: r3(along), lateral: r3(lat), cut: !!t.release, stage: t.release === "contact" && S.turnLog.some((e) => e.kind === "stage" && e.by === t.id), recovery: !!t.recovery, floorK: r3(t.floorK),
      ft: t.caft ? { iy: t.caft.iy, ia: t.caft.ia } : null, clearanceMm: clr, minClearanceMm250: minClr, ballToFootM: sepF, ballToComM: sepC,
      secondSame: same.length ? { n: same.length, firstMs: r3((same[0].k - t.k) * DT * 1000), part: same[0].part, impulse: r3(same[0].impulse) } : null, secondOther: other.length ? { n: other.length, firstMs: r3((other[0].k - t.k) * DT * 1000), part: other[0].part, impulse: r3(other[0].impulse) } : null };
  });
}
const out = {};
if (mode === "reliability") {
  const N = +a2, ver = a3 || "d14", arch = a4 || "B", prof = a5 || "HIGH";
  for (const id of ids(idsArg)) { const rows = [];
    for (let seed = 1; seed <= N; seed++) {
      const scn = get(id), S = instrument(makeSim(scn, { ver, seed, arch, player: PROFILES[prof] })); let cut = null;
      while (S.k < Math.round(scn.dur / DT) && !S.fault) S.step();
      const rel = (S.turnLog || []).filter((e) => e.kind === "release"), fin = rel[rel.length - 1], first = (S.turnLog || [])[0];
      if (fin) cut = { at: fin.t, by: /^touch/.test(fin.by) ? "touch" : fin.by, firstTouchAt: first && (first.kind === "stage" || /^touch/.test(first.by || "")) ? first.t : null, stages: S.turnLog.filter((e) => e.kind === "stage").length };
      const T = S.touches.filter((t) => t.launched), k0 = T.length ? T[0].k : 0, rec = S.rec.slice(k0), ctl = rec.filter((r) => r.ctrl === "CONTROLLED").length / Math.max(1, rec.length);
      const want = scn.cmds && scn.cmds.length ? scn.cmds[scn.cmds.length - 1].turn : 0, headErr = Math.abs(((S.A.psi * 180 / Math.PI - want) + 540) % 360 - 180);
      const kRel = cut ? Math.round(cut.at / DT) : null, after = kRel != null ? S.rec.slice(kRel) : [], ctlAfter = after.length ? 100 * after.filter((r) => r.ctrl === "CONTROLLED").length / after.length : null;
      const cmd0 = scn.cmds && scn.cmds.length ? scn.cmds[0].t : null, isCut = Math.abs(want) >= 30;
      const taken = !isCut ? null : !!(cut && cut.by === "touch" && headErr < 20 && S.rec[S.rec.length - 1].ctrl === "CONTROLLED");
      let loose = 0, run = 0; for (const r of rec) { if (r.ctrl === "LOOSE") { run++; loose = Math.max(loose, run); } else run = 0; }
      const tr = touchRows(S);
      rows.push({ seed, touches: T.length, cancelled: S.touches.filter((t) => t.cancelled).length, recovery: T.filter((t) => t.recovery).length, controlledPct: +(ctl * 100).toFixed(1), longestLooseS: +(loose * DT).toFixed(2), end: S.rec[S.rec.length - 1].ctrl,
        doubleImpulses: tr.filter((r) => r.secondSame && r.secondSame.firstMs <= 150).length, secondSame250: tr.filter((r) => r.secondSame).length, secondOther250: tr.filter((r) => r.secondOther).length,
        unplannedOwnContacts: S.contacts.filter((c) => c.own && !c.striking).length, opponentContacts: S.contacts.filter((c) => !c.own).map((c) => ({ t: r3(c.t), part: c.collider, impulse: r3(c.impulse) })),
        lostAtS: (S.ctrl.changes.find((c) => c.to === "LOOSE" && c.k > k0) || {}).t ?? null, kernelFault: S.fault || null, legYields: (S.yields || []).length, yieldDetail: (S.yields || []).slice(0, 4),
        ballFinite: S.rec.every((r) => [...r.ball.p, ...r.ball.v].every(Number.isFinite)), minBallHeight: +Math.min(...S.rec.map((r) => r.ball.p[1])).toFixed(5), cpu: { predTicks: S.cpu.predTicks || null, tracks: S.cpu.tracks || null },
        turn: isCut ? { requested: want, releasedBy: cut ? cut.by : "never", stages: cut ? cut.stages : 0, responseS: cut && cut.firstTouchAt != null && cmd0 != null ? +(cut.firstTouchAt - cmd0).toFixed(2) : null, completedS: cut && cmd0 != null ? +(cut.at - cmd0).toFixed(2) : null, finalHeadingErrDeg: +headErr.toFixed(0), controlledAfterPct: ctlAfter != null ? +ctlAfter.toFixed(0) : null, takenWithBall: taken, quality: cutQuality(S, scn) } : null,
        touchRows: tr });
    }
    const all = rows.flatMap((r) => r.touchRows), cutT = all.filter((t) => t.cut || t.stage);
    out[id] = { ver, arch, profile: PROFILES[prof].name, seeds: N, controlledPct: m(rows.map((r) => r.controlledPct)), touches: m(rows.map((r) => r.touches)), doubleImpulses: rows.reduce((s, r) => s + r.doubleImpulses, 0),
      takenWithBall: rows[0].turn ? rows.filter((r) => r.turn.takenWithBall).length + "/" + N : null,
      // DRIBBLE-1.2: the cut-quality summary (d14_quality.mjs)
      takenCleanly: rows[0].turn ? rows.filter((r) => r.turn.quality && r.turn.quality.takenCleanly).length + "/" + N : null,
      quality: rows[0].turn ? (() => { const Q = rows.map((r) => r.turn.quality).filter(Boolean); return { toSetupS: med(Q.map((q) => q.toSetupS)), toRedirectS: med(Q.map((q) => q.toRedirectS)), toPlantS: med(Q.map((q) => q.toPlantS)), toBall20S: med(Q.map((q) => q.toBall20S)), toBody20S: med(Q.map((q) => q.toBody20S)),
        touchesToBall20: med(Q.map((q) => q.touchesToBall20)), setupUsedPct: +(100 * Q.filter((q) => q.setupUsed).length / Math.max(1, Q.length)).toFixed(0), setupFromExistingTouchPct: +(100 * Q.filter((q) => q.setupFromExistingTouch).length / Math.max(1, Q.length)).toFixed(0),
        decisiveSpeed: m(Q.map((q) => q.decisive && q.decisive.speed)), decisiveRegions: Q.reduce((o, q) => (q.decisive && (o[q.decisive.reg] = (o[q.decisive.reg] || 0) + 1), o), {}), setupErrAtDecisiveM: med(Q.map((q) => q.setupErrAtDecisiveM)), finalBallHeadingErrDeg: med(Q.map((q) => q.finalBallHeadingErrDeg)) }; })() : null, releasedByTouch: rows[0].turn ? rows.filter((r) => r.turn.releasedBy === "touch").length + "/" + N : null, responseS: rows[0].turn ? m(rows.map((r) => r.turn.releasedBy === "touch" ? r.turn.responseS : null)) : null,
      touchSpeedMean: m(all.map((t) => t.speed)), cutTouchSpeedMean: m(cutT.map((t) => t.speed)), cutTouchSpeedMedian: med(cutT.map((t) => t.speed)), cutTouches: cutT.length, cutTouchesOver9: cutT.filter((t) => t.speed >= 9).length,
      secondSame250: rows.reduce((s, r) => s + r.secondSame250, 0), secondOther250: rows.reduce((s, r) => s + r.secondOther250, 0), launched: all.length,
      minClearanceMedianMm: med(all.map((t) => t.minClearanceMm250)), regions: all.reduce((o, t) => (o[t.reg] = (o[t.reg] || 0) + 1, o), {}), preferredFootPct: all.length ? +(100 * all.filter((t) => t.F === (PROFILES[prof].preferred_foot || "R").toUpperCase()[0]).length / all.length).toFixed(0) : null,
      unplannedOwnContacts: rows.reduce((s, r) => s + r.unplannedOwnContacts, 0), kernelFaults: rows.filter((r) => r.kernelFault).length, legYields: rows.reduce((s, r) => s + (r.legYields || 0), 0), nonFinite: rows.filter((r) => !r.ballFinite).length, heldToEnd: rows.filter((r) => r.end === "CONTROLLED").length + "/" + N, rows };
    const o = out[id];
    console.log(id.padEnd(17), ver, arch, prof, `controlled ${o.controlledPct}% · held ${o.heldToEnd}${o.takenWithBall ? ` · TAKEN ${o.takenWithBall} CLEAN ${o.takenCleanly} (redirect ${o.quality.toRedirectS}s ball20 ${o.quality.toBall20S}s)` : ""} · touch ${o.touchSpeedMean} m/s, cut touch ${o.cutTouchSpeedMean} (n ${o.cutTouches}, ≥9 m/s ${o.cutTouchesOver9}) · 2nd same ${o.secondSame250}/${o.launched} other ${o.secondOther250} · minClr ${o.minClearanceMedianMm} mm · faults ${o.kernelFaults} yields ${o.legYields} · ${JSON.stringify(o.regions)} pref ${o.preferredFootPct}% · end ${rows.map((r) => r.kernelFault ? "F" : r.end[0]).join("")}`); }
} else if (mode === "free") {
  const N = +a2, ver = a3 || "d14"; let gTicks = 0, gBad = 0, gPersist = 0, gMax = 0;
  for (const id of ids(idsArg)) for (let seed = 1; seed <= N; seed++) {
    const S = makeSim(get(id), { ver, seed }), n = Math.round(S.cfg.scenario.dur / DT), B = S.ballCfg;
    const Ref = new B.World(Object.assign({}, B.options, { p: [0, 0.11, 0], dt: DT, substeps: 1, parameters: B.parameters, colliders: [] }));
    const sync = () => { const W = S.W; Ref.ball = structuredClone(W.ball); Ref.tick = W.tick; Ref.time = W.time; Ref.restTime = W.restTime; Ref.events = []; Ref.actions = []; Ref.guards = []; Ref.actionIds = new Set(); };
    let ticks = 0, bad = 0, persist = 0, maxDev = 0, maxUnexpl = 0, events = 0, synced = false, lastContact = -9;
    while (S.k < n && !S.fault) {
      const e0 = S.W.events.length; if (synced) Ref.step(); S.step();
      const ev = S.W.events.slice(e0).filter((e) => e.kind === "AUTHORITATIVE_LAUNCH" || (e.kind === "PHYSICAL_CONTACT" && e.collider !== "turf"));
      if (ev.length || !synced) { events += ev.length; if (ev.length) lastContact = S.k - 1; sync(); synced = true; continue; }
      const a = S.W.ball, b = Ref.ball, d = Math.max(Math.abs(a.p[0] - b.p[0]), Math.abs(a.p[1] - b.p[1]), Math.abs(a.p[2] - b.p[2]), Math.abs(a.v[0] - b.v[0]), Math.abs(a.v[1] - b.v[1]), Math.abs(a.v[2] - b.v[2]));
      ticks++; maxDev = Math.max(maxDev, d); if (d > 1e-12) { if (S.k - 1 - lastContact <= 1) persist++; else { bad++; maxUnexpl = Math.max(maxUnexpl, d); } sync(); }
    }
    gTicks += ticks; gBad += bad; gPersist += persist; gMax = Math.max(gMax, maxUnexpl);
    out[id + ":" + seed] = { freeTicks: ticks, unexplainedDeviatingTicks: bad, contactPersistenceTicks: persist, maxDeviation: maxDev, maxUnexplainedDeviation: maxUnexpl, resyncEvents: events, kernelFault: S.fault || null };
    console.log((id + ":" + seed).padEnd(20), `free ticks ${ticks} · unexplained ${bad} · contact persistence ${persist} · max |Δ| ${maxDev.toExponential(2)} · events ${events}`); }
  out.TOTAL = { ver, freeTicks: gTicks, unexplainedDeviatingTicks: gBad, contactPersistenceTicks: gPersist, maxUnexplainedDeviation: gMax }; console.log(`TOTAL free ticks ${gTicks} · unexplained ${gBad} · contact persistence ${gPersist} · max unexplained ${gMax.toExponential(2)}`);
} else if (mode === "cpu") {
  const N = +a2, ver = a3 || "d14", K = ["loco", "ball", "plan", "predict", "solve", "commit"], tot = { wall: 0, sim: 0, steps: 0, plans: 0, tracks: 0, predTicks: 0 }; let worst = null;
  for (const k of K) tot[k] = 0;
  for (const id of ids(idsArg)) { const acc = { wall: 0, sim: 0, steps: 0, plans: 0, tracks: 0, predTicks: 0 }; for (const k of K) acc[k] = 0;
    for (let seed = 1; seed <= N; seed++) { const S = makeSim(get(id), { ver, seed, opts: { record: false } }), w0 = performance.now(); S.run(); acc.wall += performance.now() - w0; acc.sim += S.k * DT; acc.steps += S.k;
      for (const k of K) acc[k] += S.cpu[k]; acc.plans += S.cpu.plans || 0; acc.tracks += S.cpu.tracks || 0; acc.predTicks += S.cpu.predTicks || 0; }
    for (const k in tot) tot[k] += acc[k];
    const per = (x) => +(x / acc.sim).toFixed(1), res = acc.wall - acc.loco - acc.ball;
    out[id] = { simSeconds: +acc.sim.toFixed(1), msPerSimSecond: { total: per(acc.wall), locomotion: per(acc.loco), ball: per(acc.ball), resolverTotal: per(res), resolverPredict: per(acc.predict), resolverSolve: per(acc.solve), commit: per(acc.commit) },
      resolverUsPerStep: +(res * 1000 / acc.steps).toFixed(1), planningPassesPerSimSecond: per(acc.plans), newTracksPerSimSecond: per(acc.tracks), predictedTicksPerSimSecond: per(acc.predTicks), realtimeFactor: +(acc.sim * 1000 / acc.wall).toFixed(2) };
    if (!worst || out[id].msPerSimSecond.resolverTotal > worst.ms) worst = { id, ms: out[id].msPerSimSecond.resolverTotal };
    console.log(id.padEnd(17), JSON.stringify(out[id])); }
  const per = (x) => +(x / tot.sim).toFixed(1), res = tot.wall - tot.loco - tot.ball;
  out.ALL = { ver, simSeconds: +tot.sim.toFixed(1), msPerSimSecond: { total: per(tot.wall), locomotion: per(tot.loco), ball: per(tot.ball), resolverTotal: per(res), resolverPredict: per(tot.predict), resolverSolve: per(tot.solve), commit: per(tot.commit) },
    resolverUsPerStep: +(res * 1000 / tot.steps).toFixed(1), planningPassesPerSimSecond: per(tot.plans), newTracksPerSimSecond: per(tot.tracks), predictedTicksPerSimSecond: per(tot.predTicks), realtimeFactor: +(tot.sim * 1000 / tot.wall).toFixed(2), worstScenario: worst, node: process.version };
  console.log("ALL", JSON.stringify(out.ALL));
} else if (mode === "touches") {
  const csv = ["scenario,seed,profile,arch,ver,touch,tick,t_s,foot,weak,region,hull,swing_w,gap_mm,ball_x,ball_y,ball_z,pre_vx,pre_vy,pre_vz,desired_speed,desired_dir_deg,executed_speed,executed_dir_deg,post_vx,post_vy,post_vz,err_speed_pct,err_dir_deg,recovery,releases_cut,player_speed,ft_yield,ft_arc,floorK,launched,cancelled"];
  const PK = (k) => [r3(k[0]), r3(k[2]), r3(k[1])], PA = (a) => [r3(a[0]), r3(-a[2]), r3(a[1])];
  for (const spec of idsArg.split(",")) { const [id, sd, pf, ar, vr] = spec.split(":"), seed = +(sd || 1), prof = pf || "HIGH", arch = ar || "B", ver = vr || "d14";
    const S = makeSim(get(id), { ver, seed, arch, player: PROFILES[prof] }); S.run(); const rows = [];
    S.touches.forEach((t, i) => { const dir = (v) => r3(Math.atan2(-v[2], v[0]) * 180 / Math.PI);
      const row = { i, tick: t.k, t: r3(t.t), foot: t.F, weak: t.weak, region: t.reg, hull: t.hull, swingW: r3(t.w), gapMm: r3(t.gap * 1000), ball: PK(t.ball), preV: PK(t.pre.v), desired: { speed: r3(t.desired.speed), dirDeg: dir(t.desired.v) }, executed: { speed: r3(t.executed.speed), dirDeg: dir(t.executed.v) },
        post: t.post ? { v: PA(t.post.v) } : null, errSpeedPct: r3(t.error.sigS * t.error.eS * 100), errDirDeg: r3(t.error.sigD * t.error.eD), recovery: t.recovery, releasesCut: !!t.release, playerSpeed: r3(t.speedPlayer), followThrough: t.caft || null, floorK: r3(t.floorK), launched: !!t.launched, cancelled: t.cancelled || null };
      rows.push(row);
      csv.push([id, seed, prof, arch, ver, i, t.k, row.t, t.F, t.weak, t.reg, t.hull, row.swingW, row.gapMm, ...row.ball, ...row.preV, row.desired.speed, row.desired.dirDeg, row.executed.speed, row.executed.dirDeg, ...(row.post ? row.post.v : ["", "", ""]), row.errSpeedPct, row.errDirDeg, row.recovery, row.releasesCut, row.playerSpeed, t.caft ? t.caft.iy : "", t.caft ? t.caft.ia : "", row.floorK, row.launched, JSON.stringify(row.cancelled || "")].join(",")); });
    out[spec] = { scenario: id, seed, profile: PROFILES[prof].name, arch, ver, touches: rows }; console.log(spec.padEnd(28), rows.length, "touches"); }
  fs.writeFileSync(a2.replace(/\.json$/, ".csv"), csv.join("\n") + "\n");
} else if (mode) { console.error("mode: reliability | free | cpu | touches"); process.exit(1); }
const file = { reliability: a6, free: a4, touches: a2, cpu: a4 }[mode]; if (file) fs.writeFileSync(file, JSON.stringify(out, null, 1));
