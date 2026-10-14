// PVP-1 analysis (reads records; nothing is simulated). Per condition: the recipient's state at first contact against RUN-1, its response against
// its own TWIN (the identical recipient, no tackle), and each tackler against its own SOLO run (the same candidate on empty turf, same clock).
// Cross-contact impulse convention (pvp1a_sim _record): J2 is the impulse on body b, −J2 on body a.
// usage (worktree root): node pvp1_analyze.mjs --runs <dir> --solo2 <SP2F2 5.0 record> --solo3 <SP2F3 5.0 record> --out <evidence.json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, B, bi, JN } = L;
const WB = await import(RA + "sp2a/scripts/sp2a_wbid.mjs"), REC = await import(new URL("./pvp1_recipient.mjs", import.meta.url).href), SU = await import(new URL("./pvp1_setup.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const h = 1 / 240, BW = L.M * 9.81, D = 180 / Math.PI, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000, r1 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10;
const NB = B.length, SR = (r) => r.S.slice(0, NB), ST = (r) => r.S.slice(NB, 2 * NB), sole = (S, s) => { const f = S[bi("foot_" + s)]; return V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])); };
const ang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)) * D; };
const tilt = (q) => Math.acos(Math.max(-1, Math.min(1, Q.rot(q, [0, 1, 0])[1]))) * D;
const recAt = (o, t) => o.recs[Math.max(0, Math.min(o.recs.length - 1, Math.round(t / h) - 1))];
const turfLoads = (r, role) => { const o = {}; for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const s = c.a === "turf" ? c.b : c.a; if (s[0] !== role) continue; o[s[1]] = (o[s[1]] || 0) + c.Jn / h / BW; } return o; };
const crossOn = (r, role) => r.contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => { const onA = c.a[0] === role, J = onA ? V.sc(c.J2, -1) : c.J2; return { mine: onA ? c.a[1] : c.b[1], other: onA ? c.b[1] : c.a[1], J, Jn: c.Jn }; });
const decomp = (v, fwd, left) => [r3(V.dot(v, fwd)), r3(V.dot(v, left)), r3(v[1])];
// relative rotation of q w.r.t. q0 in a heading frame: [pitch (+ nose down), roll (+ toward the left), yaw (+ to the left)] (deg, small-angle rotation vector)
const relRot = (q, q0, fwd, left) => { const dq0 = Q.mul(q, Q.conj(q0)), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]), a = 2 * Math.atan2(s, dq[3]), rv = s < 1e-12 ? [0, 0, 0] : V.sc([dq[0], dq[1], dq[2]], a / s);
  return [r1(-V.dot(rv, left) * D), r1(V.dot(rv, fwd) * D), r1(rv[1] * D)]; };
const TIMES = [0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 1.0];
function recipient(o, tw, meta) { const qR = meta.qR, fwd = Q.rot(qR, [0, 0, 1]), left = Q.rot(qR, [1, 0, 0]), fc = o.twin ? null : firstCross(o), t0 = fc ? fc.t : (meta.firstContact.F2 ? meta.firstContact.F2.t : 0.49), r0 = recAt(o, t0), S0 = SR(r0), M = L.M;
  const run = REC.loadRun(SU.RUNIN_R), Hh = REC.handoff(run, meta.kH), kAt = (t) => meta.kH + Math.round(t / h) - meta.actR, SAw = (k) => SAworld(Hh, meta, k);
  // state at first contact vs RUN-1 (the same instant of the run)
  const k0 = kAt(t0), Sr = SAw(k0), Srm = SAw(k0 - 1), Srp = SAw(k0 + 1), vRun = V.sc(V.sub(L.comOf(Srp), L.comOf(Srm)), 1 / (2 * h)), vPhys = V.sc(r0.chars.runner.P, 1 / M);
  const anP = L.anatOf(S0.map(s => ({ pos: s.pos, rot: s.rot }))), anR = L.anatOf(Sr), dj = []; for (const j of Object.keys(anR)) for (const k of Object.keys(anR[j])) dj.push(anP[j][k] - anR[j][k]);
  const loads0 = turfLoads(r0, "runner"), wb = WB.wholeBodyID(Hh.SA, k0, h, run.F[k0].stance.R ? "foot_R" : run.F[k0].stance.L ? "foot_L" : "none");
  const stateAtContact = { t: r3(t0), run1Frame: k0, phaseOfStance: r3((k0 - meta.kTD) / meta.stanceN), physicalForS: r3(t0 - meta.actR * h), stanceRUN1: run.F[k0].stance,
    loadsBW: Object.fromEntries(Object.entries(loads0).map(([k, v]) => [k, r3(v)])), run1GRF_BW: wb.grf.BW.map(r3), comVel: { physical: decomp(vPhys, fwd, left), run1: decomp(vRun, fwd, left) },
    comHeightDiffMm: r1((L.comOf(S0)[1] - L.comOf(Sr)[1]) * 1000), pelvisDiffDeg: r1(ang(S0[0].rot, Sr[0].rot)), jointRmsDiffDeg: r1(Math.sqrt(dj.reduce((s, x) => s + x * x, 0) / dj.length)), pelvisW: { physical: decomp(S0[0].w, fwd, left), run1: null } };
  // response series vs TWIN
  const ser = TIMES.map(dt => { const t = t0 + dt, a = recAt(o, t), b = recAt(tw, t), Sa = SR(a), Sb = SR(b), la = turfLoads(a, "runner"), lb = turfLoads(b, "runner");
    return { dt, struckFoot: decomp(V.sub(sole(Sa, "R"), sole(S0, "R")), fwd, left), struckFootTwin: decomp(V.sub(sole(Sb, "R"), sole(S0, "R")), fwd, left), farFoot: decomp(V.sub(sole(Sa, "L"), sole(S0, "L")), fwd, left), farFootTwin: decomp(V.sub(sole(Sb, "L"), sole(S0, "L")), fwd, left),
      footLoadBW: { R: r3(la.foot_R || 0), L: r3(la.foot_L || 0) }, footLoadTwinBW: { R: r3(lb.foot_R || 0), L: r3(lb.foot_L || 0) }, comVel: decomp(V.sc(a.chars.runner.P, 1 / M), fwd, left), comVelTwin: decomp(V.sc(b.chars.runner.P, 1 / M), fwd, left),
      pelvisVsTwin: decomp(V.sub(Sa[0].pos, Sb[0].pos), fwd, left), pelvisHeight: r3(Sa[0].pos[1]), pelvisHeightTwin: r3(Sb[0].pos[1]), pelvisRotVsTwin: relRot(Sa[0].rot, Sb[0].rot, fwd, left), pelvisRotFromContact: relRot(Sa[0].rot, S0[0].rot, fwd, left),
      trunkTilt: r1(tilt(Sa[bi("thorax")].rot)), trunkTiltTwin: r1(tilt(Sb[bi("thorax")].rot)) }; });
  // foot unloading / support loss, fall onset, ground-contact sequence
  const unload = (oo, side) => { for (const r of oo.recs) { if (r.t < t0) continue; const l = turfLoads(r, "runner")["foot_" + side] || 0; if (l < 0.02) return r3(r.t - t0); } return null; };
  const touch = (oo, side) => { let off = false; for (const r of oo.recs) { if (r.t < t0) continue; const l = turfLoads(r, "runner")["foot_" + side] || 0; if (l < 0.02) off = true; else if (off) return r3(r.t - t0); } return null; };
  const support = (oo) => { for (const r of oo.recs) { if (r.t < t0) continue; const l = turfLoads(r, "runner"); if ((l.foot_R || 0) + (l.foot_L || 0) < 0.05) return r3(r.t - t0); } return null; };
  const seq = (oo) => { const seen = new Set(), out = []; for (const r of oo.recs) { if (r.t < t0 || r.t > t0 + 2.0) continue; for (const [b2, l] of Object.entries(turfLoads(r, "runner"))) if (l > 0.01 && !seen.has(b2)) { seen.add(b2); out.push([r3(r.t - t0), b2]); } } return out; };
  const fallOnset = (oo) => { for (const r of oo.recs) { if (r.t < t0) continue; const nf = Object.keys(turfLoads(r, "runner")).filter(x => !x.startsWith("foot_")); if (nf.length) return { dt: r3(r.t - t0), body: nf[0] }; } return null; };
  const pelvisBelow = (oo, y) => { for (const r of oo.recs) { if (r.t < t0) continue; if (r.S[0].pos[1] < y) return r3(r.t - t0); } return null; };
  // balance controller: support objectives active (side, |F|) after first contact
  const ctl = (oo) => { const lg = (oo.ctrlLogR || []).map(x => ({ ...x, tw: (x.n + oo.recipient.actR) * h })).filter(x => x.tw >= t0 && x.tw <= t0 + 0.6); const sides = {}; for (const x of lg) if (x.sup) for (const sd of x.sup) { sides[sd] = sides[sd] || { first: r3(x.tw - t0), last: null, Fmax: 0 }; sides[sd].last = r3(x.tw - t0); if (x.vf) sides[sd].Fmax = Math.max(sides[sd].Fmax, Math.round(Math.hypot(...x.vf.F))); } return sides; };
  // the impulse the recipient receives from the tackler over the first 0.3 / 0.6 s (recipient frame), and how much of it is DOWNWARD on its feet / shanks
  const imp = { J03: [0, 0, 0], J06: [0, 0, 0], downFeet: 0, downFeetPeakBW: 0, downFeetS: 0, upperOnTackler: 0, firstUpperT: null, perBody: {} };
  for (const r of o.recs) { if (r.t < t0 || r.t > t0 + 0.6) continue; let dF = 0; for (const c of crossOn(r, "runner")) { if (r.t <= t0 + 0.3) imp.J03 = V.add(imp.J03, c.J); imp.J06 = V.add(imp.J06, c.J); imp.perBody[c.mine] = (imp.perBody[c.mine] || 0) + V.len(c.J);
      if (/^(foot|shank)_/.test(c.mine) && c.J[1] < 0) { imp.downFeet += -c.J[1]; dF += -c.J[1] / h; }
      if (/^(pelvis|abdomen|thorax|head|upperArm|forearm|thigh)/.test(c.mine)) { imp.upperOnTackler += V.len(c.J); if (imp.firstUpperT == null) imp.firstUpperT = r3(r.t - t0); } }
    imp.downFeetPeakBW = Math.max(imp.downFeetPeakBW, dF / BW); if (dF > 0.3 * BW) imp.downFeetS += h; }
  const impulse = { J03: decomp(imp.J03, fwd, left), J06: decomp(imp.J06, fwd, left), downOnFeetNs: r3(imp.downFeet), downOnFeetPeakBW: r3(imp.downFeetPeakBW), downOnFeetOver03BW_s: r3(imp.downFeetS), upperBodyOnTacklerNs: r3(imp.upperOnTackler), firstUpperBodyContact: imp.firstUpperT, perBodyNs: Object.fromEntries(Object.entries(imp.perBody).map(([k, v]) => [k, r3(v)])) };
  return { firstContact: fc, stateAtContact, series: ser, unload: { struckFootOff: unload(o, "R"), struckFootOffTwin: unload(tw, "R"), farFootDown: touch(o, "L"), farFootDownTwin: touch(tw, "L"), noFootSupport: support(o), noFootSupportTwin: support(tw) },
    fall: { onset: fallOnset(o), onsetTwin: fallOnset(tw), pelvisBelow05: pelvisBelow(o, 0.5), pelvisBelow05Twin: pelvisBelow(tw, 0.5) }, groundSeq: seq(o), groundSeqTwin: seq(tw), controller: ctl(o), controllerTwin: ctl(tw), impulse }; }
function SAworld(Hh, meta, k) { return Hh.SA(k).map(s => ({ pos: V.add(Q.rot(meta.qR, s.pos), meta.offR), rot: Q.norm(Q.mul(meta.qR, s.rot)) })); }
export const firstCross = (o) => { for (const r of o.recs) { const cs = r.contacts.filter(c => c.kind === "cross" && c.Jn > 0); if (cs.length) return { t: r.t, pairs: cs.map(c => [c.a[1], c.b[1]]) }; } return null; };
// tackler vs its own solo run (same candidate, same clock, no recipient)
function tackler(o, solo, t0) { const fwd = [0, 0, 1], left = [1, 0, 0], M = L.M, Ss = (t) => solo.recs[Math.max(0, Math.min(solo.recs.length - 1, Math.round(t / h) - 1))].S.slice(0, NB), sv = (t) => solo.recs[Math.max(0, Math.min(solo.recs.length - 1, Math.round(t / h) - 1))].chars.tackler.P;
  // pre-contact identity with the solo run
  let pre = 0; for (const r of o.recs) { if (r.t >= t0 - 1e-9) break; const a = ST(r), b = Ss(r.t); for (let i = 0; i < NB; i++) pre = Math.max(pre, V.len(V.sub(a[i].pos, b[i].pos))); }
  const keys = { "knee_L.flex": ["knee_L", "flex"], "hip_L.flex": ["hip_L", "flex"], "hip_L.abd": ["hip_L", "abd"], "hip_L.rot": ["hip_L", "rot"], "knee_R.flex": ["knee_R", "flex"], "hip_R.flex": ["hip_R", "flex"], "shoulder_L.abd": ["shoulder_L", "abd"], "shoulder_L.flex": ["shoulder_L", "flex"], "elbow_L.flex": ["elbow_L", "flex"], "lumbar.lat": ["lumbar", "lat"], "thoracic.lat": ["thoracic", "lat"] };
  const ser = TIMES.map(dt => { const t = t0 + dt, r = recAt(o, t), a = ST(r), b = Ss(t), aa = L.anatOf(a.map(s => ({ pos: s.pos, rot: s.rot }))), ab = L.anatOf(b), dj = []; for (const j of Object.keys(ab)) for (const k of Object.keys(ab[j])) dj.push(aa[j][k] - ab[j][k]);
    const vP = V.sc(r.chars.tackler.P, 1 / M), vS = V.sc(sv(t), 1 / M);
    return { dt, vh: r3(Math.hypot(vP[0], vP[2])), vhSolo: r3(Math.hypot(vS[0], vS[2])), v: decomp(vP, fwd, left), pelvisVsSolo: decomp(V.sub(a[0].pos, b[0].pos), fwd, left), pelvisRotVsSolo: r1(ang(a[0].rot, b[0].rot)), pelvisRollVsSolo: relRot(a[0].rot, b[0].rot, fwd, left),
      trunkTilt: r1(tilt(a[bi("thorax")].rot)), trunkTiltSolo: r1(tilt(b[bi("thorax")].rot)), thoraxVsSolo: r1(ang(a[bi("thorax")].rot, b[bi("thorax")].rot)), jointRmsVsSolo: r1(Math.sqrt(dj.reduce((s, x) => s + x * x, 0) / dj.length)),
      joints: Object.fromEntries(Object.entries(keys).map(([nm, [j, k]]) => [nm, [r1(aa[j][k]), r1(ab[j][k])]])) }; });
  const maxOver = (f, t1 = 1.5) => { let m = 0, at = null; for (const r of o.recs) { if (r.t < t0 || r.t > t0 + t1) continue; const v = f(ST(r), Ss(r.t)); if (v > m) { m = v; at = r.t - t0; } } return { max: r1(m), at: r3(at) }; };
  const jd = (j, k) => (a, b) => Math.abs(L.anatOf(a.map(s => ({ pos: s.pos, rot: s.rot })))[j][k] - L.anatOf(b)[j][k]);
  const disruption = { pelvisDeg: maxOver((a, b) => ang(a[0].rot, b[0].rot)), thoraxDeg: maxOver((a, b) => ang(a[bi("thorax")].rot, b[bi("thorax")].rot)), foldKneeDeg: maxOver(jd("knee_L", "flex")), foldHipAbdDeg: maxOver(jd("hip_L", "abd")), foldHipRotDeg: maxOver(jd("hip_L", "rot")),
    tackKneeDeg: maxOver(jd("knee_R", "flex")), tackHipDeg: maxOver(jd("hip_R", "flex")), postShoulderAbdDeg: maxOver(jd("shoulder_L", "abd")), postElbowDeg: maxOver(jd("elbow_L", "flex")) };
  // posting-arm turf contact: first forearm_L contact and gaps, vs solo
  const armC = (oo, sl) => { let first = null, last = null, gaps = 0, gapS = 0, on = false; for (const r of oo.recs) { if (r.t < 0.2 || r.t > t0 + 1.5) continue; const l = turfLoads(r, sl)["forearm_L"] || 0; if (l > 0.005) { if (first == null) first = r.t; else if (!on && last != null && r.t - last > h * 1.5) { gaps++; gapS += r.t - last; } on = true; last = r.t; } else on = false; } return { first: r3(first), gaps, gapS: r3(gapS) }; };
  // momentum: horizontal impulse from the recipient on the tackler, along its travel (−: braking), and its speed loss vs solo
  let Jt = [0, 0, 0]; for (const r of o.recs) { if (r.t < t0 || r.t > t0 + 0.6) continue; for (const c of crossOn(r, "tackler")) Jt = V.add(Jt, c.J); }
  const v0 = Math.hypot(...[0, 2].map(i => o.recs[Math.round(t0 / h) - 1].chars.tackler.P[i])) / M;
  // stopped dead: v_h < 0.5 m/s within 0.3 s while the solo still slides
  let stopT = null; for (const r of o.recs) { if (r.t < t0 || r.t > t0 + 0.6) continue; const vh = Math.hypot(r.chars.tackler.P[0], r.chars.tackler.P[2]) / M, vs = Math.hypot(sv(r.t)[0], sv(r.t)[2]) / M; if (vh < 0.5 && vs > 1.5) { stopT = r3(r.t - t0); break; } }
  const meta = o.ctrlT || {};
  return { preContactMaxDiffMm: r3(pre * 1000), series: ser, disruption, arm: armC(o, "tackler"), armSolo: armC(solo, "tackler"), momentum: { vhAtContact: r3(v0), impulseFromRecipientNs: decomp(Jt, fwd, left), fractionOfMomentum: r3(V.dot(Jt, fwd) / (M * v0)), stoppedDeadAt: stopT },
    controller: { failures: meta.failures || null, wholeBody: meta.wholeBody ?? null, postFrom: meta.postFrom ?? null } }; }
if (process.argv[1] && process.argv[1].endsWith("pvp1_analyze.mjs")) { const dir = arg("runs"), solo = { F2: L.readGz(arg("solo2")), F3: L.readGz(arg("solo3")) }, out = { conds: {}, checks: {} };
  for (const cond of (arg("conds", "CANON,EARLY,LATE,LIGHT,STRONG")).split(",")) { const tw = L.readGz(`${dir}/${cond}_TWIN.json.gz`), meta = tw.meta, res = { meta: { kH: meta.kH, kC: meta.kC, kTD: meta.kTD, stanceN: meta.stanceN, actR: meta.actR, offR: meta.offR, note: meta.C.note, phase: meta.C.phase, lam: meta.C.lam, hashes: meta.hashes } };
    const recs = {}; for (const k of ["F2", "F3"]) { const o = L.readGz(`${dir}/${cond}_${k}.json.gz`); recs[k] = o; const R = recipient(o, tw, meta), t0 = R.firstContact.t; res[k] = { recipient: R, tackler: tackler(o, solo[k], t0) }; console.log(cond, k, "first contact", t0.toFixed(4), JSON.stringify(R.firstContact.pairs), "phase", R.stateAtContact.phaseOfStance); }
    // checks: the recipient is identical in F2, F3 and the TWIN until the first contact; no cross contact while it is parked
    const tmin = Math.min(res.F2.recipient.firstContact.t, res.F3.recipient.firstContact.t); let dRec = 0, dTw = 0, parked = 0;
    for (let i = 0; i < recs.F2.recs.length; i++) { const a = recs.F2.recs[i], b = recs.F3.recs[i], c = tw.recs[i]; if (a.t >= tmin - 1e-9) break; for (let j = 0; j < NB; j++) { dRec = Math.max(dRec, V.len(V.sub(a.S[j].pos, b.S[j].pos))); dTw = Math.max(dTw, V.len(V.sub(a.S[j].pos, c.S[j].pos))); } }
    for (const o of [recs.F2, recs.F3]) for (const r of o.recs) if (!r.recipientActive && r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) parked++;
    res.checks = { recipientF2vsF3BeforeContactMm: r3(dRec * 1000), recipientF2vsTwinBeforeContactMm: r3(dTw * 1000), crossContactsWhileParked: parked };
    console.log(cond, "checks", JSON.stringify(res.checks), "tackler pre-contact vs solo (mm)", res.F2.tackler.preContactMaxDiffMm, res.F3.tackler.preContactMaxDiffMm); out.conds[cond] = res; }
  fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); }
