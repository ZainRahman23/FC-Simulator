// Track A (DIAGNOSTIC ONLY; TRACK_A_PREREG.md §3): instrument the D-1F1 one-step energy rise at the accepted configuration.
//   (a) decode Jolt's contact cache after each of steps n−2 … n+1 (solved impulses = next step's warm-start offer);
//   (b) pre-solve manifolds from the contact listener (raw sub-shape IDs, normal, depth, points, Added / Persisted);
//   (c) Jolt's own warm-start match recomputed (cached point within 1 cm in both centre-of-mass local frames);
//   (d) per contact point: solved λ, inherited λ, m_eff, relative normal velocity before / after, work W = λ·(v_n,pre + v_n,post)/2;
//   (e) single-step counterfactuals from the full saved state at n−1 (C0 must reproduce the original step bit-identically).
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/track_a_probe.mjs <scenario> <n_jump> <out.json> [F0|F1]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { G1Sim } from "../gates/v2_g1.js"; import { pi1RunnerSpec, pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js"; import { V } from "../core/v2_math.js";
import { saveState, restoreState, decodeContacts, editContacts, energyOf, effMassAgainstStatic, velAt, toLocal } from "./track_a_lib.mjs";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const key = process.argv[2] || "drop1m", nJump = +(process.argv[3] || 110), outPath = process.argv[4], which = process.argv[5] || "F1";
const spec = which === "F0" ? pi1RunnerSpec() : pi1RunnerF1Spec(), m = new G1Sim(J, spec, key, { passiveOpts: { kneeModel: "v2k" } }), ps = m.w.ps, dt = m.dt, g = m.g;
const name = (i) => (i === -1 ? "turf" : i < -1 ? "obstacle" : spec.bodies[i].name), idOf = spec.bodies.map((_, i) => m.w.bodies[i].GetID().GetIndexAndSequenceNumber()), groundId = m.w.ground.GetID().GetIndexAndSequenceNumber();
const bodyOfId = new Map([[groundId, -1], ...idOf.map((id, i) => [id, i])]);
const gc = m.w.ground.GetCenterOfMassPosition(), gr = m.w.ground.GetRotation(), groundState = { com: [gc.GetX(), gc.GetY(), gc.GetZ()], rot: [gr.GetX(), gr.GetY(), gr.GetZ(), gr.GetW()], v: [0, 0, 0], w: [0, 0, 0] };
// raw manifold capture (wraps the world's listener; the world's own behaviour — friction policy, recording — is unchanged)
const L = m.w.listener, oA = L.OnContactAdded, oP = L.OnContactPersisted; let raw = [];
const cap = (kind) => (b1p, b2p, mp, sp) => { kind === "added" ? oA(b1p, b2p, mp, sp) : oP(b1p, b2p, mp, sp);
  const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), mf = J.wrapPointer(mp, J.ContactManifold), n = mf.mWorldSpaceNormal, np = mf.mRelativeContactPointsOn1.size(), p1 = [], p2 = [];
  for (let k = 0; k < np; k++) { const a = mf.GetWorldSpaceContactPointOn1(k), b = mf.GetWorldSpaceContactPointOn2(k); p1.push([a.GetX(), a.GetY(), a.GetZ()]); p2.push([b.GetX(), b.GetY(), b.GetZ()]); }
  const id1 = b1.GetID().GetIndexAndSequenceNumber(), id2 = b2.GetID().GetIndexAndSequenceNumber();
  raw.push({ kind, id1, id2, i1: bodyOfId.get(id1), i2: bodyOfId.get(id2), sub1: mf.mSubShapeID1.GetValue() >>> 0, sub2: mf.mSubShapeID2.GetValue() >>> 0, normal: [n.GetX(), n.GetY(), n.GetZ()], depth: mf.mPenetrationDepth, p1, p2 }); };
L.OnContactAdded = cap("added"); L.OnContactPersisted = cap("persisted");
const jointIdx = spec.joints.map((j, k) => [j.name, k]).filter(([n]) => /^(mtp|ankle)_/.test(n));
const v3 = (x) => [x.GetX(), x.GetY(), x.GetZ()], jointLambdas = () => Object.fromEntries(jointIdx.map(([n, k]) => { const c = m.w.cons[k].c; return [n, { pos: v3(c.GetTotalLambdaPosition()), rot: v3(c.GetTotalLambdaRotation()), motRot: v3(c.GetTotalLambdaMotorRotation()) }]; }));
const S_CONTACTS = J.EStateRecorderState_Contacts, S_ALL = J.EStateRecorderState_All;
function step() { const pre = m.st, E0 = m.last.E, up = m.up, jl0 = jointLambdas(); raw = []; m.tick();
  return { n: m.n, t: m.n * dt, pre, post: m.st, E0, E1: m.last.E, raw, cache: decodeContacts(saveState(J, ps, S_CONTACTS)), up, jl0, jl1: jointLambdas() }; }
// ── run to the window ──
while (m.n < nJump - 3) m.tick();
const recs = []; let S_all = null, upJump = null, recPrevCache = decodeContacts(saveState(J, ps, S_CONTACTS));
const cacheBefore = {}; // cache in force before each recorded step (= warm-start offer)
for (let n = nJump - 2; n <= nJump + 1; n++) { if (n === nJump) { S_all = saveState(J, ps, S_ALL); upJump = m.up; }
  cacheBefore[n] = recPrevCache; const r = step(); if (r.n !== n) throw new Error("step index"); recs.push(r); recPrevCache = r.cache; }
// ── per-step manifold / point analysis ──
const findM = (cache, k) => { for (const p of cache.pairs) for (const mm of p.manifolds) if (mm.key.body1 === k.id1 && mm.key.sub1 === k.sub1 && mm.key.body2 === k.id2 && mm.key.sub2 === k.sub2) return mm; return null; };
const stOf = (S, i) => (i === -1 ? groundState : S[i]), piece = (i, sub) => (i < 0 ? 0 : m.w._sub(i, sub));
function analyse(r) { const gdt = [0, -g * dt, 0], pre = (i) => (i === -1 ? groundState : { ...r.pre[i], v: V.add(r.pre[i].v, gdt) });
  let Wsum = 0, WwsDiff = 0; const man = r.raw.map(x => { const solved = findM(r.cache, x), old = findM(cacheBefore[r.n], x), sA = stOf(r.pre, x.i1), sB = stOf(r.pre, x.i2);
    const pts = x.p1.map((p1w, k) => { const p2w = x.p2[k], l1 = toLocal(sA, p1w), l2 = toLocal(sB, p2w);
      let inh = 0, best = Infinity; if (old) for (const c of old.points) { const d1 = V.dot(V.sub(c.p1, l1), V.sub(c.p1, l1)), d2 = V.dot(V.sub(c.p2, l2), V.sub(c.p2, l2)), d = Math.max(d1, d2); if (d < best) best = d; }
      if (old) for (const c of old.points) { const d1 = V.dot(V.sub(c.p1, l1), V.sub(c.p1, l1)), d2 = V.dot(V.sub(c.p2, l2), V.sub(c.p2, l2)); if (d1 <= 1e-4 && d2 <= 1e-4) { inh = c.lambda; break; } }
      const lam = solved ? solved.points[k].lambda : null, pm = V.sc(V.add(p1w, p2w), 0.5);
      const vr = (S, f) => V.sub(velAt(f(x.i2), pm), velAt(f(x.i1), pm)), vnPre = V.dot(x.normal, vr(null, pre)), vnPost = V.dot(x.normal, vr(null, (i) => stOf(r.post, i)));
      const dyn = x.i1 === -1 ? x.i2 : x.i2 === -1 ? x.i1 : null, meff = dyn != null ? effMassAgainstStatic(spec, dyn, r.pre[dyn], pm, x.normal) : null, W = lam != null ? lam * (vnPre + vnPost) / 2 : null;
      if (W != null) Wsum += W;
      return { k, sepMm: +(-x.depth * 1000).toFixed(3), lamSolved: lam, lamInherited: inh, matchDistMm: Number.isFinite(best) ? +(Math.sqrt(best) * 1000).toFixed(3) : null, vnPre: +vnPre.toFixed(5), vnPost: +vnPost.toFixed(5), meff: meff && +meff.toFixed(4), W: W != null ? +W.toFixed(5) : null }; });
    return { pair: name(x.i1) + "↔" + name(x.i2), piece1: piece(x.i1, x.sub1), piece2: piece(x.i2, x.sub2), kind: x.kind, normal: x.normal.map(v => +v.toFixed(4)), depthMm: +(x.depth * 1000).toFixed(3), friction: solved ? solved.friction.map(v => +v.toFixed(5)) : null, angFriction: solved ? +solved.angFriction.toFixed(6) : null, frictionInherited: old ? old.friction.map(v => +v.toFixed(5)) : null, points: pts }; });
  const e0 = energyOf(spec, m.P, r.pre, g), e1 = energyOf(spec, m.P, r.post, g), perBody = spec.bodies.map((b, i) => ({ body: b.name, dKE: +(e1.per[i].ke - e0.per[i].ke).toFixed(4), dPE: +(e1.per[i].pe - e0.per[i].pe).toFixed(4) }));
  return { n: r.n, t: +r.t.toFixed(5), dE: +(r.E1 - r.E0).toFixed(5), dKE: +(e1.ke - e0.ke).toFixed(5), dPE: +(e1.pe - e0.pe).toFixed(5), dU: +(e1.U - e0.U).toFixed(5), contactWorkSum: +Wsum.toFixed(5), manifolds: man, perBody, jointLambdasBefore: r.jl0, jointLambdasAfter: r.jl1 }; }
const steps = recs.map(analyse);
// ── single-step counterfactuals from n−1 ──
const rJ = recs.find(r => r.n === nJump), cacheJ = cacheBefore[nJump], cacheBytesJ = (() => { restoreState(J, ps, S_all); return saveState(J, ps, S_CONTACTS); })();
const decJ = decodeContacts(cacheBytesJ), toeIds = new Set(spec.bodies.map((b, i) => (/^toe_/.test(b.name) ? idOf[i] : null)).filter(x => x != null)), footIds = new Set(spec.bodies.map((b, i) => (/^foot_/.test(b.name) ? idOf[i] : null)).filter(x => x != null));
const has = (mm, ids) => ids.has(mm.key.body1) || ids.has(mm.key.body2), turf = (mm) => mm.key.body1 === groundId || mm.key.body2 === groundId;
const emptyContacts = new Uint8Array([S_CONTACTS, 0, 0, 0, 0, 0, 0, 0, 0]);
function cf(label, contactBytes) { restoreState(J, ps, S_all); if (contactBytes) restoreState(J, ps, contactBytes); upJump.applied = false; m.P.apply(upJump); raw = []; m.w.step(dt, m.cfg.coll);
  const st = m.read(), e = energyOf(spec, m.P, st, g), e0 = energyOf(spec, m.P, rJ.pre, g); let maxDiff = 0;
  st.forEach((s, i) => { for (const f of ["pos", "rot", "v", "w"]) for (let k = 0; k < s[f].length; k++) maxDiff = Math.max(maxDiff, Math.abs(s[f][k] - rJ.post[i][f][k])); });
  return { label, dE: +(e.E - e0.E).toFixed(5), dKE: +(e.ke - e0.ke).toFixed(5), maxStateDiffFromOriginal: maxDiff, perBody: spec.bodies.map((b, i) => [b.name, +(e.per[i].ke + e.per[i].pe - e0.per[i].ke - e0.per[i].pe).toFixed(4)]).filter(([, d]) => Math.abs(d) > 0.05) }; }
const C = [];
C.push(cf("C0 full restore (must equal the original step)", null));
C.push(cf("C1 contact cache dropped entirely", emptyContacts));
C.push(cf("C2 toe↔turf cached lambdas zeroed (normal + friction)", editContacts(cacheBytesJ, decJ, (p, mm) => (has(mm, toeIds) && turf(mm) ? { normal: true, friction: true } : null)).bytes));
C.push(cf("C2n toe↔turf normal lambdas only zeroed", editContacts(cacheBytesJ, decJ, (p, mm, k) => (has(mm, toeIds) && turf(mm) && k != null ? { normal: true } : null)).bytes));
C.push(cf("C2f toe↔turf friction lambdas only zeroed", editContacts(cacheBytesJ, decJ, (p, mm, k) => (has(mm, toeIds) && turf(mm) && k == null ? { friction: true } : null)).bytes));
C.push(cf("C3 foot↔turf cached lambdas zeroed (normal + friction)", editContacts(cacheBytesJ, decJ, (p, mm) => (has(mm, footIds) && turf(mm) ? { normal: true, friction: true } : null)).bytes));
C.push(cf("C3n foot↔turf normal lambdas only zeroed", editContacts(cacheBytesJ, decJ, (p, mm, k) => (has(mm, footIds) && turf(mm) && k != null ? { normal: true } : null)).bytes));
// per manifold / per point (toe and foot manifolds that carry a non-zero cached λ)
for (const p of decJ.pairs) for (const [mi, mm] of p.manifolds.entries()) { if (!turf(mm) || !(has(mm, toeIds) || has(mm, footIds))) continue; const bi = bodyOfId.get(mm.key.body1 === groundId ? mm.key.body2 : mm.key.body1), pc = piece(bi, mm.key.body1 === groundId ? mm.key.sub2 : mm.key.sub1);
  mm.points.forEach((pt, k) => { if (Math.abs(pt.lambda) < 1e-9) return; C.push(cf(`C4 ${name(bi)} piece ${pc} point ${k} (cached λn ${pt.lambda.toFixed(4)}) zeroed`, editContacts(cacheBytesJ, decJ, (pp, m2, kk) => (m2 === mm && kk === k ? { normal: true } : null)).bytes)); }); }
const res = { key, which, nJump, dt, cacheDecodedBeforeJump: decJ.pairs.length, steps, counterfactuals: C };
if (outPath) fs.writeFileSync(outPath, JSON.stringify(res, null, 1));
for (const s of steps) console.log(`n ${s.n} t ${s.t} dE ${s.dE} dKE ${s.dKE} dPE ${s.dPE} dU ${s.dU} ΣW_contact ${s.contactWorkSum} manifolds ${s.manifolds.length}`);
for (const c of C) console.log(c.label.padEnd(72), "dE", c.dE, "maxΔstate", c.maxStateDiffFromOriginal.toExponential(2), c.perBody.length ? JSON.stringify(c.perBody) : "");
