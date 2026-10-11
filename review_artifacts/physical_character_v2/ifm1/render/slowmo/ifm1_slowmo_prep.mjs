// IFM-1 SLOW-MOTION REVIEW — PREPARATION (visualisation only; added after the IFM-1 results, f22a9141). Reads ONLY committed IFM-1 files:
//   evidence/run3/render/clipdata/*.json.gz (the rendered rig poses made by ifm1_clip_prep.mjs from the run-3 records), evidence/run3/records/*.json.gz
//   (raw per-step records), evidence/run3/IFM1_EVAL.json (preregistered statuses) and fixture/IFM1_FIXTURE.json. Nothing is re-simulated, re-mapped,
//   interpolated or changed. Per case (SH, PL, TP, SW) and body (R0, RH1): one synchronized C0 | N frame list = the last 100 ms of the frozen RUN-1
//   lead-in (every 1/240 s; RUN-1 is a continuous function of time, evaluated by the frozen engine — no physical state), then EVERY recorded physical
//   step n = 0 … 36 (n = 0 = the fixture's entry write, n ≥ 1 = the record after step n). Overlay data are read or computed directly from recorded
//   states: rig skeleton (clip data), receiver–impactor contact points / normals / impulses, per-foot turf normal impulse, whole-body COM (V2 masses),
//   pelvis joint, struck-body colliders, N − C0 rendered-joint divergence. Lead-in support flags are RUN-1's own (pose.legs.*.st).
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node ifm1_slowmo_prep.mjs <out dir>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const L = await import(new URL("../../scripts/ifm1_lib.mjs", import.meta.url).href), { V, Q, IFM1, RA } = L;
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const E3 = path.join(RA, "ifm1/evidence/run3"), gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const EVAL = JSON.parse(fs.readFileSync(path.join(E3, "IFM1_EVAL.json"))), FIX = JSON.parse(fs.readFileSync(path.join(RA, "ifm1/fixture/IFM1_FIXTURE.json")));
const SUB = FIX.worldToLocal.subtract, toW = (p) => V.add(p, SUB), r6 = (x) => Math.round(x * 1e6) / 1e6, h = IFM1.h;
const CASES = [
  { id: "SH", title: "SH — left deltoid / shoulder", state: "S-FLAT", invalid: false },
  { id: "PL", title: "PL — planted (left) shank", state: "S-FLAT", invalid: false },
  { id: "TP", title: "TP — toe-pad stance (left shank)", state: "S-TOE", invalid: false },
  { id: "SW", title: "SW — swing (right) shank", state: "S-FLAT", invalid: true, invalidText: "MECHANICALLY INVALID — DIAGNOSTIC ONLY (native-contact integrity check failed at step 1)" }];
const LEAD_FRAMES = 24;   // last 100 ms of the committed 240 Hz lead-in (τ = −100 … −4.17 ms)
// RUN-1's own support flags during the lead-in (frozen engine; same evaluation path as the frozen viewer)
const LV = L.loadLV2(), { A } = L.makeActor(LV), E = LV.E;
const run1Legs = (t) => { const restore = E.r1Replay(A, L.vOf, null, t), out = E.r1Evaluate(A, L.simAt(t)), legs = { L: !!out.pose.legs.L.st, R: !!out.pose.legs.R.st }, skin = Array.from(out.skinMats); restore(); return { legs, skin }; };
const verify = { leadSkinMatchesCommitted: [], notes: [] };
for (const C of CASES) for (const body of L.BODIES) {
  const spec = L.SPECS[body](), B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), M = B.reduce((s, b) => s + b.mass, 0);
  const role = L.ROLES.find(r => r.id === C.id), fix = FIX.fixtures[`${C.id}/${body}`], ti = bi(fix.target.body), t0 = FIX.states[C.state].tMid;
  const shapeStart = B.map((_, i) => B.slice(0, i).reduce((s, b) => s + b.shapes.length, 0)), struckShapes = [shapeStart[ti], shapeStart[ti] + B[ti].shapes.length];
  const lead = gz(path.join(E3, "render/clipdata", `LEAD_${C.state}.json.gz`)), D0 = gz(path.join(E3, "render/clipdata", `C0_${body}_${C.state}.json.gz`)), DN = gz(path.join(E3, "render/clipdata", `N_${C.id}_${body}.json.gz`));
  const R0r = gz(path.join(E3, "records", `C0_${body}_${C.state}.json.gz`)), RNr = gz(path.join(E3, "records", `N_${C.id}_${body}.json.gz`)), entry = FIX.entries[`${body}/${C.state}`];
  const cell = EVAL.cells[`${C.id}/${body}`], ctl = EVAL.controls[`${body}/${C.state}`], ownSec = cell.N.mechanics.secondaryFailure;
  const feet = { L: bi("foot_L"), R: bi("foot_R") };
  const physExtra = (rec, Sentry) => { const S = rec ? rec.S : null;
    const com = rec ? V.sc(S.reduce((s, b, i) => V.add(s, V.sc(b.com, B[i].mass)), [0, 0, 0]), 1 / M) : V.sc(Sentry.reduce((s, p, i) => V.add(s, V.sc(V.add(p.pos, Q.rot(p.rot, B[i].comLocal)), B[i].mass)), [0, 0, 0]), 1 / M);
    const load = {}; for (const sd of ["L", "R"]) load[sd] = rec ? rec.contacts.filter(c => c.kind === "ground" && c.b === feet[sd]).reduce((s, c) => s + c.Jn, 0) : null;
    return { com: toW(com).map(r6), footLoadNs: load }; };
  const frames = [];
  // lead-in: identical RUN-1 pose on both sides (one copy, used for both panels)
  for (const f of lead.f240.slice(lead.f240.length - LEAD_FRAMES)) { const t = t0 + f.tauMs / 1000, r = run1Legs(t);
    const maxSkinDiff = Math.max(...r.skin.map((x, i) => Math.abs(x - f.skin[i])));
    verify.leadSkinMatchesCommitted.push(maxSkinDiff);
    frames.push({ phase: "lead", tauMs: f.tauMs, n: null, simX: f.simX, both: { skin: f.skin, joint: f.joint, tip: f.tip }, run1Legs: r.legs }); }
  // physical record: every step
  for (let n = 0; n <= IFM1.stepsTotal; n++) {
    const a = D0.frames[n], b = DN.frames[n], rc = n ? R0r.recs[n - 1] : null, rn = n ? RNr.recs[n - 1] : null;
    if (a.n !== n || b.n !== n || a.simX !== b.simX) throw new Error("frame alignment");
    const div = a.joint.map((p, i) => V.dist(p, b.joint[i]) * 1000);
    const tau = n * h, band = C.invalid && n >= 1 ? "invalid" : n === 0 ? "entry" : b.afterOwnSecondary ? "ownSecondary" : (a.outsideControl || b.outsideControl) ? "outsideControl" : n <= IFM1.stepsPrimary ? "primary" : "secondary";
    frames.push({ phase: "phys", n, tauMs: r6(tau * 1000), simX: a.simX, band,
      C0: { skin: a.skin, joint: a.joint, tip: a.tip, struck: a.colliders.slice(...struckShapes), ...physExtra(rc, entry.write.poses) },
      N: { skin: b.skin, joint: b.joint, tip: b.tip, struck: b.colliders.slice(...struckShapes), imp: b.imp, opp: b.opp.map(c => ({ ...c, n: c.n.map(r6), Jn: r6(c.Jn) })), lm: b.lm[C.id], ...physExtra(rn, entry.write.poses) },
      divergenceMm: div.map(x => r6(x)) }); }
  const contactSteps = frames.filter(f => f.phase === "phys" && f.N.opp.length && f.N.opp.some(c => c.Jn > 0)).map(f => f.n);
  const out = { case: C.id, title: C.title, body, state: C.state, invalid: C.invalid, invalidText: C.invalidText || null, role: role.note, target: fix.target,
    statusN: cell.status, statusC0: [ctl.status, ctl.handoff.label], healthyControlUntilMs: Math.min(ctl.toneTruncation ? ctl.toneTruncation.t : Infinity, ctl.mechanics.secondaryFailure ? ctl.mechanics.secondaryFailure.t : Infinity) * 1000,
    healthyReason: `C0 SnapshotTone reference leaves the anatomical range at ${(ctl.toneTruncation.t * 1000).toFixed(1)} ms (${ctl.toneTruncation.joint})`, ownSecondaryFailure: ownSec,
    contact: { firstStep: contactSteps[0], steps: contactSteps, gapMm: IFM1.impactor.gap * 1000, closingMs: IFM1.impactor.approach, firstStepImpulseNs: cell.N.correspondence.firstStepImpulseNs, postFirstStepImpulseNs: cell.N.contact.postFirstStepImpulseNs },
    bones: lead.f240 ? null : null, feetIdx: feet, sources: { clipdataC0: `render/clipdata/C0_${body}_${C.state}.json.gz`, clipdataN: `render/clipdata/N_${C.id}_${body}.json.gz`, lead: `render/clipdata/LEAD_${C.state}.json.gz`, recordsC0: `records/C0_${body}_${C.state}.json.gz`, recordsN: `records/N_${C.id}_${body}.json.gz` },
    frames };
  fs.writeFileSync(path.join(OUT, `slowmo_${C.id}_${body}.json`), JSON.stringify(out));
  console.log(`${C.id}/${body}: ${frames.length} frames (lead ${LEAD_FRAMES} + phys 37) · contact steps ${contactSteps[0]}…${contactSteps[contactSteps.length - 1]} (${contactSteps.length}) · healthy control to ${out.healthyControlUntilMs.toFixed(1)} ms · N status ${cell.status.join(" · ")}`);
}
verify.leadSkinMaxAbsDiff = Math.max(...verify.leadSkinMatchesCommitted); delete verify.leadSkinMatchesCommitted;
const SK = L.rigOf(LV).SK; fs.writeFileSync(path.join(OUT, "slowmo_meta.json"), JSON.stringify({ bones: SK.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.idx : null })), leadFrames: LEAD_FRAMES, verify }, null, 1));
console.log("RUN-1 lead-in re-evaluated vs committed clip data: max |Δskin| =", verify.leadSkinMaxAbsDiff, "(committed values are rounded to 1e-6)");
