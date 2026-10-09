// HG-A INVESTIGATION (read-only; sources/2026-10-09_user_instruction_hga_momentum_investigation.md).
// Per frame, the mapped presentation body exactly as REV2 constructs it (frozen R-K knee + RF-1, PI-1 §6.2 2nd-order backward-difference
// velocities propagated through the tree), decomposed into authoritative translation + internal (articulated) motion, and three
// promotion initializations compared kinematically:
//   A  = the REV2 velocity construction without the declared shift (REV2 adds a uniform horizontal shift only when it is <= 0.05 m/s)
//   B  = every body at the authoritative velocity, no rotation
//   Ch = A + one uniform HORIZONTAL shift so that the horizontal momentum = M * v_auth (vertical left to the presentation)
//   C3 = A + one uniform 3-D shift so that the momentum = M * v_auth (v_auth has no vertical component)
// Nothing here changes V2 / F0 / V1.3 / Jolt / the animation / any criterion; no physics is run.
// usage (worktree root): V13_WT=<v1.3 wt> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../hga_decompose.mjs <airDir> <out.json> <case>[,<case>...] [rev2 hga_values json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/";
const M = await import(new URL("../../rev1/scripts/pcg_rev1.mjs", import.meta.url).href); const { L, makeMapper, angVel, relRot } = M; const { V, Q, B, NB, bi, loadAir, bodyLowest } = L;
const { bootSole } = await import(P2 + "sim/v2_geom.js");
const [AIRDIR, OUT, CASES, HGV] = process.argv.slice(2), HG = HGV ? JSON.parse(fs.readFileSync(HGV, "utf8")).cases : {};
const G = 9.81, DT = 1 / 60, Mt = B.reduce((s, b) => s + b.mass, 0);
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), h = (v) => [v[0], 0, v[2]], hl = (v) => Math.hypot(v[0], v[2]);
// PI-1 §6.2 initial velocities, identical to pi1/rev2/scripts/scan_rev2.mjs initVel
function initVel(mapper, k) { const S2 = mapper.poseAt(k).S, S1 = mapper.poseAt(k - 1).S, S0 = mapper.poseAt(k - 2).S, w = [], v = [];
  for (let i = 0; i < NB; i++) w[i] = V.sub(V.sc(angVel(S1[i].rot, S2[i].rot), 1.5), V.sc(angVel(S0[i].rot, S1[i].rot), 0.5));
  v[0] = V.sub(V.sc(V.sub(comW(S2, 0), comW(S1, 0)), 1.5 * 60), V.sc(V.sub(comW(S1, 0), comW(S0, 0)), 0.5 * 60));
  for (const j of L.spec.joints) { const p = j.parentIndex, c = j.childIndex, jp = S2[c].pos, vj = V.add(v[p], V.cross(w[p], V.sub(jp, comW(S2, p)))); v[c] = V.add(vj, V.cross(w[c], V.sub(comW(S2, c), jp))); }
  return { v, w, S: S2 }; }
// world inertia product I_w * w with the canonical-frame inertia (as pcg_f0 kinRows / P-17)
const Iw = (S, i, w) => { const r = relRot(S, i), I = B[i].inertia, wl = Q.rot(Q.conj(r), w); return Q.rot(r, [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2])); };
const comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt);
const mom = (vs) => vs.reduce((s, v, i) => V.add(s, V.sc(v, B[i].mass)), [0, 0, 0]);
const Lcom = (S, vs, ws) => { const c = comOf(S), vc = V.sc(mom(vs), 1 / Mt); let Lt = [0, 0, 0]; for (let i = 0; i < NB; i++) Lt = V.add(Lt, V.add(V.cross(V.sub(comW(S, i), c), V.sc(V.sub(vs[i], vc), B[i].mass)), Iw(S, i, ws[i]))); return Lt; };
const KE = (S, vs, ws) => { let e = 0; for (let i = 0; i < NB; i++) e += 0.5 * B[i].mass * V.dot(vs[i], vs[i]) + 0.5 * V.dot(ws[i], Iw(S, i, ws[i])); return e; };
const SOLE = { L: bootSole(B[bi("foot_L")]), R: bootSole(B[bi("foot_R")]) }, soleC = (sd) => V.sc(SOLE[sd].pts.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / SOLE[sd].pts.length);
const pointVel = (S, vs, ws, i, p) => V.add(vs[i], V.cross(ws[i], V.sub(p, comW(S, i))));
// tracked joint points: every joint (child origin) + the pelvis origin
const JOINTS = [{ name: "pelvis", body: 0 }].concat(L.spec.joints.map(j => ({ name: j.name || B[j.childIndex].name, body: j.childIndex })));
const r3 = (v) => v.map(x => +x.toFixed(3)), f = (x, n = 3) => +x.toFixed(n);
function state(R, mapper, k) {
  const iv = initVel(mapper, k), S = iv.S, row = R.rows[k], va = [row[10], 0, -row[11]], c = comOf(S), vc = V.sc(mom(iv.v), 1 / Mt), root = [row[8], 0, -row[9]];
  const Lp = Lcom(S, iv.v, iv.w), ke = KE(S, iv.v, iv.w), keInt = ke - 0.5 * Mt * V.dot(vc, vc), feet = {};
  for (const [n, sd] of [[0, "L"], [1, "R"]]) { const i = bi("foot_" + sd), p = V.add(S[i].pos, Q.rot(S[i].rot, soleC(sd))), vp = pointVel(S, iv.v, iv.w, i, p);
    feet[sd] = { presContact: R.pres[k].feet[n].contact, mode: R.pres[k].feet[n].mode, physLowestMm: f(bodyLowest(B[i], S[i]).y * 1000, 1), soleVel: r3(vp), soleSpeedH: f(hl(vp)), footComVel: r3(iv.v[i]) }; }
  return { k, iv, S, va, c, vc, root, Lp, ke, keInt, feet, out: {
    k, M: f(Mt, 2), comPos: r3(c), comVel: r3(vc), vAuth: r3(va), pelvisVel: r3(iv.v[0]), comMinusRootH: r3(V.sub(h(c), h(root))), pelvisMinusRootH: r3(V.sub(h(S[0].pos), h(root))),
    Pint: r3(V.sc(V.sub(vc, va), Mt)), PintH: f(Mt * hl(V.sub(vc, va)), 2), HGA: f(hl(V.sub(vc, va)), 4), Lcom: r3(Lp), LcomMag: f(V.len(Lp)), KE: f(ke, 1), KEint: f(keInt, 1),
    facing: f(row[12], 4), gaitPhase: f(row[13], 4), feet, support: feet.L.presContact || feet.R.presContact ? "stance" : "flight" } }; }
function inits(st) { const { iv, va, vc } = st, sH = [va[0] - vc[0], 0, va[2] - vc[2]], s3 = V.sub(va, vc), zero = [0, 0, 0];
  return { A: { v: iv.v, w: iv.w, shift: zero }, B: { v: iv.v.map(() => va.slice()), w: iv.w.map(() => zero), shift: null }, Ch: { v: iv.v.map(v => V.add(v, sH)), w: iv.w, shift: sH }, C3: { v: iv.v.map(v => V.add(v, s3)), w: iv.w, shift: s3 } }; }
function compare(R, mapper, st) { const { S, va, k } = st, Sm = mapper.poseAt(k - 1).S, Sp = mapper.poseAt(k + 1).S, X = inits(st), res = {}, A = X.A;
  const LA = Lcom(S, A.v, A.w), keA = KE(S, A.v, A.w);
  for (const [nm, x] of Object.entries(X)) { const P = mom(x.v), Lx = Lcom(S, x.v, x.w), kex = KE(S, x.v, x.w);
    let segV = { d: 0 }, segW = 0; for (let i = 0; i < NB; i++) { const d = V.dist(x.v[i], A.v[i]); if (d > segV.d) segV = { d, body: B[i].name }; segW = Math.max(segW, V.dist(x.w[i], A.w[i])); }
    const feet = {}; for (const sd of ["L", "R"]) { const i = bi("foot_" + sd), p = V.add(S[i].pos, Q.rot(S[i].rot, soleC(sd))), vx = pointVel(S, x.v, x.w, i, p), vA = pointVel(S, A.v, A.w, i, p);
      feet[sd] = { presContact: st.out.feet[sd].presContact, soleSpeedH: f(hl(vx)), dSoleVel: f(V.dist(vx, vA)) }; }
    let eLast = { d: 0 }, eNext = { d: 0 }, presOwn = 0;
    for (const jn of JOINTS) { const i = jn.body, p = S[i].pos, vj = pointVel(S, x.v, x.w, i, p), pred = V.sc(vj, DT), dL = V.sub(p, Sm[i].pos), dN = V.sub(Sp[i].pos, p);
      const a = V.dist(pred, dL), b = V.dist(pred, dN); if (a > eLast.d) eLast = { d: a, joint: jn.name }; if (b > eNext.d) eNext = { d: b, joint: jn.name }; presOwn = Math.max(presOwn, V.dist(dN, dL)); }
    res[nm] = { shift: x.shift ? r3(x.shift) : null, shiftH: x.shift ? f(hl(x.shift), 4) : null, comPosDiscMm: 0,
      dPh_vsAuth: f(hl(V.sub(P, V.sc(va, Mt))), 2), Py: f(P[1], 2), dPy_vsPres: f(P[1] - mom(A.v)[1], 2), dL: f(V.dist(Lx, LA)), dLrel: f(V.dist(Lx, LA) / Math.max(V.len(LA), 1), 3),
      segVmax: f(segV.d), segVbody: segV.body, segWmax: f(segW), pelvisVel: r3(x.v[0]), pelvisVsAuthH: f(hl(V.sub(x.v[0], va))), feet,
      visLastMm: f(eLast.d * 1000, 1), visLastJoint: eLast.joint, visNextMm: f(eNext.d * 1000, 1), visNextJoint: eNext.joint, presOwnMm: f(presOwn * 1000, 1),
      KE: f(kex, 1), dKE_vsPres: f(kex - keA, 1), dKE_vsAuthRef: f(kex - (0.5 * Mt * V.dot(h(va), h(va)) + 0.5 * Mt * st.vc[1] * st.vc[1] + st.keInt), 1) }; }
  return res; }
const RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 }, out = { note: "read-only HG-A investigation; kinematic only", Mtot: Mt, cases: {} };
for (const cs of CASES.split(",")) { const R = loadAir(AIRDIR, `${cs}_LOCO.json.gz`), mapper = makeMapper(R, { knee: "RK", rf1: true }), mapper2 = makeMapper(R, { knee: "RK", rf1: true });
  const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), first = ev[0] || null, kt = R.pred.findIndex(x => x != null && x <= 0.25); let kend = null;
  if (first) kend = first.tick - 2; else if (kt >= 0) { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R.dnow.length; k++) if (R.dnow[k] != null && R.dnow[k] < mn) { mn = R.dnow[k]; kc = k; } kend = kc - 1; }
  const kLast = kend != null ? kend + 1 : Math.min(R.rows.length - 2, 120), k0 = Math.max(3, (kt >= 0 ? kt : kLast) - 45), hg = HG[cs] ? HG[cs].hg : [];
  const speed = Math.hypot(R.rows[Math.max(3, kt >= 0 ? kt : k0)][10], R.rows[Math.max(3, kt >= 0 ? kt : k0)][11]);
  const frames = []; const sts = {}; for (let k = k0; k <= kLast + 1 && k < R.rows.length - 1; k++) sts[k] = state(R, mapper, k);
  for (let k = k0; k <= kLast; k++) { const st = sts[k], hk = hg.find(x => x.k === k), fr = { ...st.out, inWindow: kt >= 0 && k >= kt && k <= kend, rev2Fails: hk ? hk.fails : null, hgaOnly: !!hk && hk.fails.length === 1 && hk.fails[0] === "HGA_comVsAuth" };
    // presentation COM acceleration (central 2nd difference; evaluation only) and the implied external force
    if (sts[k - 1] && sts[k + 1]) { const a = V.sc(V.add(V.sub(sts[k + 1].c, V.sc(st.c, 2)), sts[k - 1].c), 3600); fr.comAcc = r3(a); fr.FhBW = f(hl(a) / G); fr.FyBW = f((a[1] + G) / G);
      fr.flight3 = [k - 1, k, k + 1].every(j => !R.pres[j].feet[0].contact && !R.pres[j].feet[1].contact); fr.comVel1st = r3(V.sc(V.sub(st.c, sts[k - 1].c), 60)); fr.comVelCentral = r3(V.sc(V.sub(sts[k + 1].c, sts[k - 1].c), 30)); }
    if (fr.inWindow || fr.hgaOnly) fr.inits = compare(R, mapper, st);
    frames.push(fr); }
  // gait-cycle means: complete cycles between gaitPhase wraps (presentation COM displacement over the cycle vs the authoritative displacement)
  const cyc = []; let w0 = null; for (let k = k0 + 1; k <= kLast; k++) { if (R.rows[k][13] < R.rows[k - 1][13] - 0.5) { if (w0 != null) { const a = sts[w0], b = sts[k], T = (k - w0) / 60, rootD = V.sub(h(b.root), h(a.root));
        cyc.push({ from: w0, to: k, T: f(T, 4), comMeanVelH: r3(V.sc(V.sub(h(b.c), h(a.c)), 1 / T)), authMeanVelH: r3(V.sc(rootD, 1 / T)), diffMs: f(hl(V.sub(V.sc(V.sub(h(b.c), h(a.c)), 1 / T), V.sc(rootD, 1 / T))), 4) }); } w0 = k; } }
  // HG-D: independent reconstruction
  const det = frames.filter(x => x.inits).every(x => JSON.stringify(compare(R, mapper2, state(R, mapper2, x.k))) === JSON.stringify(x.inits));
  out.cases[cs] = { speed: f(speed, 2), moving: speed > 0.5, trigger: kt, windowEnd: kend, range: [k0, kLast], deterministic: det, cycles: cyc, frames };
  const wf = frames.filter(x => x.inWindow); console.log(cs.padEnd(19), "speed", speed.toFixed(2), "frames", frames.length, "window", wf.length, "hgaOnly", frames.filter(x => x.hgaOnly).length, "cycles", cyc.map(c => c.diffMs).join("/"), "det", det); }
fs.writeFileSync(OUT, JSON.stringify(out));
