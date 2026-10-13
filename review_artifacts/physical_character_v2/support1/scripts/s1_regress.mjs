// SUPPORT-1 regression gate: the FROZEN BALANCE-2 B2M battery (balance2/scripts/b2_qualify.mjs qualify(), unchanged: 60 s quiet standing, 16 pelvis pushes
// fwd / back / left / right × small / moderate / limit / over, the matched M1′ pushes, no-step thresholds in all four directions, determinism) scored by
// the frozen B2F criteria (balance2/criteria/b2f_eval.mjs) — exactly how C3 scored 16/17 — on a SUPPORT-1 candidate. Controller candidates enter through
// qualify()'s own ctrlModule / ctrlClass parameters. Contact-model candidates enter by a RUNTIME patch of V2JoltWorld (this process only; no file is
// modified): every world built installs the candidate's per-manifold boot–turf friction rule, with each foot's normal load taken from the previous
// step's contact cache. Plus traction / slip checks the battery does not report: peak loaded-foot slip in every recovered push and in quiet standing.
// usage (worktree root): node .../s1_regress.mjs --cand <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, TA = await import(PL.P2 + "tools/track_a_lib.mjs");
const { V2JoltWorld } = await import(PL.P2 + "core/v2_jolt.js"), QF = await import(RA + "balance2/scripts/b2_qualify.mjs"), B2F = await import(RA + "balance2/criteria/b2f_eval.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, cid = arg("cand", "V2");
const C3P = JSON.parse(fs.readFileSync(new URL("balance2/c3/params/C3.json", RA))), BODY = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA)));
const CAND = await import(RA + "support1/lab/s1_candidates.mjs"), cand = CAND.get(cid);
const CTRL = { V2: [RA + "balance2/c3/c3_ctrl.mjs", "C3Controller"], C3SC: [RA + "support1/lab/s1_c3sc.mjs", "C3SCController"], C3UR: [RA + "support1/lab/s1_c3ur.mjs", "C3URController"], LDG: [RA + "balance2/c3/c3_ctrl.mjs", "C3Controller"], LDG_C3UR: [RA + "support1/lab/s1_c3ur.mjs", "C3URController"] }[cid];
if (!CTRL) throw new Error("no regression mapping for " + cid);
// contact-model patch: the frozen listener body (material lookup, restitution) with µ(boot|turf) from the candidate rule at the foot's previous-step load
let slipLog = null;
if (cand.contactRule) { const orig = V2JoltWorld.prototype._listen, origStep = V2JoltWorld.prototype.step;
  V2JoltWorld.prototype._listen = function () { orig.call(this); const w = this, J = this.J, GROUND_UD = 1000, OBST_UD = 2000; w.footN = {};
    const on = (b1p, b2p, mp, sp) => { const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), m = J.wrapPointer(mp, J.ContactManifold), cs = J.wrapPointer(sp, J.ContactSettings);
      const idx = (u) => (u === GROUND_UD ? -1 : u >= OBST_UD ? -(2 + u - OBST_UD) : u - 1), i1 = idx(b1.GetUserData()), i2 = idx(b2.GetUserData());
      const s1 = i1 < 0 ? 0 : w._sub(i1, m.mSubShapeID1.GetValue()), s2 = i2 < 0 ? 0 : w._sub(i2, m.mSubShapeID2.GetValue()), mat = (i, sub) => (i === -1 ? "turf" : i < -1 ? "body" : w.mats[i][sub]), m1 = mat(i1, s1), m2 = mat(i2, s2);
      let mu = w.frictionOf(m1, m2); if ((m1 === "turf" && m2 === "boot") || (m2 === "turf" && m1 === "boot")) { const foot = m1 === "boot" ? i1 : i2, N = w.footN[foot]; const r = cand.contactRule({ plant: { footN: w.footN }, foot }); if (r != null && N != null) mu = r; }
      cs.mCombinedFriction = mu; cs.mCombinedRestitution = w.contactCfg.restitution; };
    w.listener.OnContactAdded = on; w.listener.OnContactPersisted = on; };
  V2JoltWorld.prototype.step = function (dt, cs) { origStep.call(this, dt, cs); const dec = TA.decodeContacts(TA.saveState(this.J, this.ps, this.J.EStateRecorderState_Contacts)), gid = this.ground.GetID().GetIndexAndSequenceNumber();
    if (!this._ids) this._ids = this.bodies.map(b => b.GetID().GetIndexAndSequenceNumber()); const N = {};
    for (const pr of dec.pairs) for (const m of pr.manifolds) { const a = m.key.body1, b = m.key.body2; if (a !== gid && b !== gid) continue; const i = this._ids.indexOf(a === gid ? b : a); if (i < 0) continue; N[i] = (N[i] || 0) + m.points.reduce((s, p) => s + p.lambda, 0) / dt; }
    this.footN = {}; this.bodies.forEach((_, i) => { if (/^foot_/.test(this.spec.bodies[i].name)) this.footN[i] = N[i] || 0; }); }; }
const t0 = Date.now(), Q = await QF.qualify({ body: BODY, ctrl: C3P, ctrlModule: CTRL[0], ctrlClass: CTRL[1] }); Q.label = "SUPPORT-1 " + cid;
Q.params = { body: BODY, ctrl: C3P, ctrlModule: CTRL[0].replace(RA, ""), ctrlClass: CTRL[1] };   // as b2_qualify.mjs's own CLI records them (read by the criteria)
fs.writeFileSync(arg("out").replace(/\.json$/, "_Q.json"), JSON.stringify(Q)); const v = B2F.evaluate(Q);
const out = { candidate: cid, describe: cand.describe, contactPatch: !!cand.contactRule, ctrl: CTRL, wallS: (Date.now() - t0) / 1000, verdict: v, U: { fall: Q.U.fall, sway: Q.U.sway, copLowpassRmsMm: Q.U.copLowpassRmsMm, postureDrift: Q.U.postureDrift, finalHash: Q.U.finalHash },
  pushes: Object.fromEntries(Object.entries(Q.P.runs).map(([k, r]) => [k, { J: r.J, fall: !!(r.recovery && r.recovery.fall), recovery: r.recovery, overshoot: r.overshoot }])), M: Q.M, T: Q.T, D: Q.D };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
console.log(`${cid} [B2F] ${v.pass ? "PASS" : "FAIL"} ${v.nPass}/${v.n} failed: ${v.failed.join(", ")} · thresholds ${JSON.stringify(Object.fromEntries(Object.entries(Q.T).map(([d, t]) => [d, +t.thresholdNs.toFixed(2)])))} · wall ${out.wallS.toFixed(0)} s`);
for (const [k, r] of Object.entries(v.results)) console.log(`  ${r.pass ? "✓" : "✗"} ${k.padEnd(4)} ${JSON.stringify(r.value).slice(0, 200)}`);
