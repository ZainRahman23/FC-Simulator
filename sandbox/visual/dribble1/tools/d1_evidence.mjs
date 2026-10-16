// dribble1/tools/d1_evidence.mjs — review evidence for DRIBBLE-1, one mode per call (JSON to the out file):
//   reliability "IDs|all" seeds [arch] [prof] out — per scenario × seed: deliberate touches, CONTROLLED share after the first touch, longest LOOSE
//       spell, end state, unplanned own-body contacts, and DOUBLE IMPULSES (any further contact of the touching boot / toe within 0.15 s of the launch)
//   free "IDs|all" seeds out — FREE-BALL AUDIT: the live ball is re-simulated in a fresh BallWorld with no colliders from its own state after every
//       launch / body contact; between those events the two must agree tick for tick (no hidden correction, attraction or tether can exist)
//   touches "ID:seed[:prof[:arch]],…" out — every deliberate touch: tick, foot, boot region, hull, swing phase, contact gap, ball position, pre-touch
//       velocity / spin, desired launch, executed launch (with the keyed execution error), the kernel's post-contact velocity / spin; pitch frame
//       [x, y, z up] (m, m/s, rad/s). Also writes a .csv beside the .json.
//   cpu "IDs|all" seeds out — wall-clock per component (locomotion = TURN-1.2 step + pose + swing adjustment, ball = BallWorld, plan / predict /
//       solve / commit = the dribble resolver) per simulated second, single process.
import fs from "fs"; import { makeSim, DT, PROFILES } from "./d1_env.mjs"; import { get, list } from "../d1_scenarios.js";
const [mode, idsArg, a2, a3, a4, a5] = process.argv.slice(2);
const ids = (s) => (s === "all" ? list().map((x) => x.id) : s.split(","));
const r3 = (x) => (x == null ? null : +(+x).toFixed(3)), m = (a) => { const v = a.filter((x) => x != null && isFinite(x)); return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : null; };
// frames: kernel [x, h, y] → pitch [x, y, h]; anim3d [x, h, −y] → pitch [x, −z, h] (a proper rotation: axial vectors map the same way)
const PK = (k) => [r3(k[0]), r3(k[2]), r3(k[1])], PA = (a) => [r3(a[0]), r3(-a[2]), r3(a[1])], PKW = (w) => PA([-w[0], -w[1], w[2]]);
const doubles = (S) => S.touches.filter((t) => t.launched).map((t) => S.contacts.filter((c) => c.own && c.k > t.k && c.k - t.k <= Math.round(0.15 / DT) && (c.part === "boot_" + t.F || c.part === "toe_" + t.F)).length);
const out = {};
if (mode === "reliability") {
  const N = +a2, arch = a3 || "B", prof = a4 || "HIGH";
  for (const id of ids(idsArg)) { const rows = [];
    for (let seed = 1; seed <= N; seed++) {
      const scn = get(id), S = makeSim(scn, { seed, arch, player: PROFILES[prof] }); let cut = null;
      // a direction change: when (and how) it was released — by a touch taking the ball into it, or by the hold running out — and the final heading
      while (S.k < Math.round(scn.dur / DT) && !S.fault) S.step();
      const rel = (S.turnLog || []).filter((e) => e.kind === "release"), fin = rel[rel.length - 1], first = (S.turnLog || [])[0];
      if (fin) cut = { at: fin.t, by: /^touch/.test(fin.by) ? "touch" : fin.by, firstTouchAt: first && (first.kind === "stage" || /^touch/.test(first.by || "")) ? first.t : null, stages: S.turnLog.filter((e) => e.kind === "stage").length };
      const T = S.touches.filter((t) => t.launched), k0 = T.length ? T[0].k : 0, rec = S.rec.slice(k0), ctl = rec.filter((r) => r.ctrl === "CONTROLLED").length / Math.max(1, rec.length);
      const want = scn.cmds && scn.cmds.length ? scn.cmds[scn.cmds.length - 1].turn : 0, headErr = Math.abs(((S.A.psi * 180 / Math.PI - want) + 540) % 360 - 180);
      const kRel = cut ? Math.round(cut.at / DT) : null, after = kRel != null ? S.rec.slice(kRel) : [], ctlAfter = after.length ? 100 * after.filter((r) => r.ctrl === "CONTROLLED").length / after.length : null;
      const cmd0 = scn.cmds && scn.cmds.length ? scn.cmds[0].t : null, isCut = Math.abs(want) >= 30;
      const taken = !isCut ? null : !!(cut && cut.by === "touch" && headErr < 20 && S.rec[S.rec.length - 1].ctrl === "CONTROLLED");
      let loose = 0, run = 0; for (const r of rec) { if (r.ctrl === "LOOSE") { run++; loose = Math.max(loose, run); } else run = 0; }
      const dbl = doubles(S), struck = new Set(T.map((t) => t.k));
      rows.push({ seed, touches: T.length, cancelled: S.touches.filter((t) => t.cancelled).length, recovery: T.filter((t) => t.recovery).length, controlledPct: +(ctl * 100).toFixed(1), longestLooseS: +(loose * DT).toFixed(2), end: S.rec[S.rec.length - 1].ctrl,
        doubleImpulses: dbl.reduce((s, x) => s + x, 0), unplannedOwnContacts: S.contacts.filter((c) => c.own && !c.striking).length, opponentContacts: S.contacts.filter((c) => !c.own).map((c) => ({ t: r3(c.t), part: c.collider, impulse: r3(c.impulse) })),
        lostAtS: (S.ctrl.changes.find((c) => c.to === "LOOSE" && c.k > k0) || {}).t ?? null, kernelFault: S.fault || null,
        turn: isCut ? { requested: want, releasedBy: cut ? cut.by : "never", stages: cut ? cut.stages : 0, responseS: cut && cut.firstTouchAt != null && cmd0 != null ? +(cut.firstTouchAt - cmd0).toFixed(2) : null, completedS: cut && cmd0 != null ? +(cut.at - cmd0).toFixed(2) : null, finalHeadingErrDeg: +headErr.toFixed(0), controlledAfterPct: ctlAfter != null ? +ctlAfter.toFixed(0) : null, takenWithBall: taken } : null });
      void struck; }
    out[id] = { arch, profile: PROFILES[prof].name, seeds: N, controlledPct: m(rows.map((r) => r.controlledPct)), touches: m(rows.map((r) => r.touches)), doubleImpulses: rows.reduce((s, r) => s + r.doubleImpulses, 0),
      takenWithBall: rows[0].turn ? rows.filter((r) => r.turn.takenWithBall).length + "/" + N : null, releasedByTouch: rows[0].turn ? rows.filter((r) => r.turn.releasedBy === "touch").length + "/" + N : null, responseS: rows[0].turn ? m(rows.map((r) => r.turn.releasedBy === "touch" ? r.turn.responseS : null)) : null,
      unplannedOwnContacts: rows.reduce((s, r) => s + r.unplannedOwnContacts, 0), kernelFaults: rows.filter((r) => r.kernelFault).length, heldToEnd: rows.filter((r) => r.end === "CONTROLLED").length + "/" + N, rows };
    console.log(id.padEnd(17), arch, prof, `controlled ${out[id].controlledPct}% · touches ${out[id].touches} · double impulses ${out[id].doubleImpulses} · unplanned own ${out[id].unplannedOwnContacts} · kernel faults ${out[id].kernelFaults}${out[id].takenWithBall ? ` · TURN taken with ball ${out[id].takenWithBall} (released by touch ${out[id].releasedByTouch}, response ${out[id].responseS} s)` : ""} · end ${rows.map((r) => r.kernelFault ? "F" : r.end[0]).join("")}`); }
} else if (mode === "free") {
  const N = +a2; let gTicks = 0, gBad = 0, gPersist = 0, gMax = 0;
  for (const id of ids(idsArg)) for (let seed = 1; seed <= N; seed++) {
    const S = makeSim(get(id), { seed }), n = Math.round(S.cfg.scenario.dur / DT), B = S.ballCfg;
    const Ref = new B.World(Object.assign({}, B.options, { p: [0, 0.11, 0], dt: DT, substeps: 1, parameters: B.parameters, colliders: [] }));
    const sync = () => { const W = S.W; Ref.ball = structuredClone(W.ball); Ref.tick = W.tick; Ref.time = W.time; Ref.restTime = W.restTime; Ref.events = []; Ref.actions = []; Ref.guards = []; Ref.actionIds = new Set(); };
    // a deviation on the tick right after a body contact is CONTACT PERSISTENCE (the ball still resting on that boot / leg surface for one more
    // tick, resolved by the kernel without an impulse event) — physics, reported separately; anything else would be an unexplained influence
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
  out.TOTAL = { freeTicks: gTicks, unexplainedDeviatingTicks: gBad, contactPersistenceTicks: gPersist, maxUnexplainedDeviation: gMax }; console.log(`TOTAL free ticks ${gTicks} · unexplained ${gBad} · contact persistence ${gPersist} · max unexplained ${gMax.toExponential(2)}`);
} else if (mode === "touches") {
  const csv = ["scenario,seed,profile,arch,touch,tick,t_s,foot,weak,region,hull,swing_w,gap_mm,ball_x,ball_y,ball_z,pre_vx,pre_vy,pre_vz,desired_speed,desired_dir_deg,executed_speed,executed_dir_deg,post_vx,post_vy,post_vz,post_wx,post_wy,post_wz,err_speed_pct,err_dir_deg,recovery,releases_cut,player_speed,launched,cancelled"];
  for (const spec of idsArg.split(",")) { const [id, sd, pf, ar] = spec.split(":"), seed = +(sd || 1), prof = pf || "HIGH", arch = ar || "B";
    const S = makeSim(get(id), { seed, arch, player: PROFILES[prof] }); S.run(); const rows = [];
    S.touches.forEach((t, i) => { const dir = (v) => r3(Math.atan2(-v[2], v[0]) * 180 / Math.PI);
      const row = { i, tick: t.k, t: r3(t.t), foot: t.F, weak: t.weak, region: t.reg, hull: t.hull, swingW: r3(t.w), gapMm: r3(t.gap * 1000), ball: PK(t.ball), preV: PK(t.pre.v), preW: PKW(t.pre.w),
        desired: { speed: r3(t.desired.speed), dirDeg: dir(t.desired.v), v: PA(t.desired.v) }, executed: { speed: r3(t.executed.speed), dirDeg: dir(t.executed.v), v: PA(t.executed.v) },
        post: t.post ? { v: PA(t.post.v), w: PA(t.post.w) } : null, errSpeedPct: r3(t.error.sigS * t.error.eS * 100), errDirDeg: r3(t.error.sigD * t.error.eD), errKey: t.error.keyId, recovery: t.recovery, releasesCut: !!t.release, playerSpeed: r3(t.speedPlayer), launched: !!t.launched, cancelled: t.cancelled || null };
      rows.push(row);
      csv.push([id, seed, prof, arch, i, t.k, row.t, t.F, t.weak, t.reg, t.hull, row.swingW, row.gapMm, ...row.ball, ...row.preV, row.desired.speed, row.desired.dirDeg, row.executed.speed, row.executed.dirDeg, ...(row.post ? row.post.v : ["", "", ""]), ...(row.post ? row.post.w : ["", "", ""]), row.errSpeedPct, row.errDirDeg, row.recovery, row.releasesCut, row.playerSpeed, row.launched, JSON.stringify(row.cancelled || "")].join(",")); });
    out[spec] = { scenario: id, seed, profile: PROFILES[prof].name, arch, touches: rows }; console.log(spec.padEnd(24), rows.length, "touches"); }
  fs.writeFileSync(a2.replace(/\.json$/, ".csv"), csv.join("\n") + "\n");
} else if (mode === "cpu") {
  const N = +a2, tot = { loco: 0, ball: 0, plan: 0, predict: 0, solve: 0, commit: 0, wall: 0, sim: 0 };
  for (const id of ids(idsArg)) { const acc = { loco: 0, ball: 0, plan: 0, predict: 0, solve: 0, commit: 0, wall: 0, sim: 0 };
    for (let seed = 1; seed <= N; seed++) { const S = makeSim(get(id), { seed, opts: { record: false } }), w0 = performance.now(); S.run(); acc.wall += performance.now() - w0; acc.sim += S.k * DT;
      for (const k of ["loco", "ball", "plan", "predict", "solve", "commit"]) acc[k] += S.cpu[k]; }
    for (const k in tot) tot[k] += acc[k];
    // the resolver = everything that is neither locomotion (intent, TURN-1.2 step, pose, swing adjustment, colliders) nor the ball kernel; its
    // predictions (TURN-1.2 clones for the locomotion lookahead and the post-cut motions, collider-free ball paths) and launch solve are measured inside it
    const per = (x) => +(x / acc.sim).toFixed(1); out[id] = { simSeconds: +acc.sim.toFixed(1), msPerSimSecond: { total: per(acc.wall), locomotion: per(acc.loco), ball: per(acc.ball), resolverTotal: per(acc.wall - acc.loco - acc.ball), resolverPredict: per(acc.predict), resolverSolve: per(acc.solve), commit: per(acc.commit) }, realtimeFactor: +(acc.sim * 1000 / acc.wall).toFixed(2) };
    console.log(id.padEnd(17), JSON.stringify(out[id])); }
  const per = (x) => +(x / tot.sim).toFixed(1); out.ALL = { simSeconds: +tot.sim.toFixed(1), msPerSimSecond: { total: per(tot.wall), locomotion: per(tot.loco), ball: per(tot.ball), resolverTotal: per(tot.wall - tot.loco - tot.ball), resolverPredict: per(tot.predict), resolverSolve: per(tot.solve), commit: per(tot.commit) }, realtimeFactor: +(tot.sim * 1000 / tot.wall).toFixed(2), node: process.version };
  console.log("ALL", JSON.stringify(out.ALL));
} else { console.error("mode: reliability | free | touches | cpu"); process.exit(1); }
const file = { reliability: a5, free: a3, touches: a2, cpu: a3 }[mode]; if (file) fs.writeFileSync(file, JSON.stringify(out, null, 1));
