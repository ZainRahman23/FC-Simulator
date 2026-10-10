// RH1 + MC-1 handoff evaluation (RH1_PREREG.md §3–§5, §7; frozen 50eae23a). READ-ONLY with respect to RUN-1 / LV2 / the simulation; nothing stepped.
// Per speed (LOW 3.0, JOG 5.5, FAST RUN 7.8, ALL-OUT 9.5) and per instant (240 half-steps of one stride, the D12n study's instants):
//   MC-1 on RH1 (physchar2/map/v2_lv2_map.js) · the lower body bit for bit against the frozen pcg_rev1 mapper · the reproduction rule against
//   the D12n study (lv2/upper/out/v2_upper_alt_probe.json.gz) · the frozen pose rows P-1…P-13 (P-12 as the hard-range margin of the fitted pose)
//   · corrected P-14c…P-17c and the old-definition values (history) · PR-2 visible pop (rotation retarget, held unmapped locals) · lower body
//   · stance contact consistency (F0 boot contact-point speed ≤ 0.18 m/s) · HG-A v2 |s| (reported only) · MC-1 one-shot cost.
// usage (cwd = worktree root): LV2_ARCHIVE=<archive of 4a226b1f> V13_WT=<archive of 5042230> STUDY=<v2_upper_alt_probe.json[.gz]> node .../rh1_handoff_eval.mjs [--n 240] [--speeds …] [--json out]
import fs from "fs"; import zlib from "zlib"; import vm from "vm"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const ARCH = process.env.LV2_ARCHIVE; if (!ARCH) throw new Error("LV2_ARCHIVE required");
const { loadRun1 } = require(path.join(ARCH, "sandbox/visual/run1/tools/run1_load.cjs")), X = loadRun1({ extra: ["run1/lv2_state.js"] }), LV = vm.runInContext("LV2_STATE", X.ctx), E = X.RUN1_V13;
const P2 = path.resolve("sandbox/visual/physchar2") + "/";
const MC = await import(P2 + "map/v2_lv2_map.js"), { pi1RunnerRH1Spec } = await import(P2 + "spec/v2_pi1_runner_rh.js"), { anatomicalAngles } = await import(P2 + "spec/v2_joints.js");
const PCG = await import(new URL("../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href), { L, TOL, makeMapper, geomRowsRev1, rigGeom, anchorOf } = PCG, { V, Q, bodySep, SELF_PAIRS, supportOf, rawRotations: rawOld, m2p } = L;
const SPEC = pi1RunnerRH1Spec(), md = MC.model(SPEC), B = md.B, NB = md.NB, bi = md.bi, OLD = L.B;   // OLD = the frozen PI-1 runner bodies (compat_lib)
const HD = 0.3, DL = MC.MC1.delta, N = +arg("n", 240), SPEEDS = arg("speeds", "3.0,5.5,7.8,9.5").split(",").map(Number), PR2 = 0.180, r4 = (x) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(6));
const own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; };
const SK = own(), bindW = X.skelFK(SK, {}, X.M4.ident()).world.map(m => Array.from(m)), RIG = { bones: SK.bones.map(b => ({ name: b.name, parent: b.parent ? b.parent.name : null })), bind: bindW };
const prof = (v) => ({ v, vOf: () => v, simAt: (t) => ({ x: 70 + v * t * Math.cos(HD), y: 30 + v * t * Math.sin(HD), heading: HD, v }) });
// RH1 frames → the frozen runner's body frames (identical colliders / masses in the world: rh1_spec_check H4–H6) for the frozen PCG / collider tools
const toOld = (S) => S.map((s, i) => ({ pos: V.add(s.pos, Q.rot(s.rot, V.sub(OLD[i].origin, B[i].origin))), rot: s.rot }));
const comW = (S, i) => MC.comW(md, S, i);
const frameOf = (q) => ({ world: q.joints.map(MC.jointMatrix), feet: ["L", "R"].map(sd => ({ contact: !!q.legs[sd].stance, mode: q.legs[sd].contact.pivot || "swing" })) });
const recOf = (qs) => ({ bones: RIG.bones, bind: bindW, pres: qs.map(frameOf) });
// rig points carried rigidly by their V2 body from the bind (as the D12n study)
const rigBindP = (n) => m2p(bindW[SK.byName[n].idx]);
const PT_CARRIER = { upperArm: "upperArm", foreArm: "forearm", hand: "forearm", clavicle: "thorax", thigh: "thigh", shin: "shank", foot: "foot", toe: "foot", spine: "abdomen", chest: "thorax", neck: "head", head: "head", hair: "head", pelvis: "pelvis" };
const ptDef = (bone, kind) => { const b = SK.byName[bone], base = bone.replace(/_[LR]$/, ""), sd = bone.match(/_([LR])$/), c = PT_CARRIER[base], body = bi(c + (sd && !["thorax", "head", "abdomen", "pelvis"].includes(c) ? "_" + sd[1] : ""));
  const p = kind === "joint" ? rigBindP(bone) : V.add(rigBindP(bone), V.sc(b.dir, b.len)); return { bone, kind, body, l: Q.rot(Q.conj(md.Z0[body].rot), V.sub(p, md.Z0[body].pos)) }; };
const POINTS = { shoulder: ["upperArm_L", "upperArm_R"].map(b => ptDef(b, "joint")), elbowU: ["upperArm_L", "upperArm_R"].map(b => ptDef(b, "tip")), elbowF: ["foreArm_L", "foreArm_R"].map(b => ptDef(b, "joint")),
  wrist: ["hand_L", "hand_R"].map(b => ptDef(b, "joint")).concat(["foreArm_L", "foreArm_R"].map(b => ptDef(b, "tip"))), handTip: ["hand_L", "hand_R"].map(b => ptDef(b, "tip")),
  head: [ptDef("head", "joint"), ptDef("head", "tip")], trunk: [ptDef("spine", "joint"), ptDef("chest", "joint"), ptDef("chest", "tip")], hipKneeAnkle: ["thigh_L", "thigh_R", "shin_L", "shin_R", "foot_L", "foot_R"].map(b => ptDef(b, "joint")) };
const carried = (S, pt) => V.add(S[pt.body].pos, Q.rot(S[pt.body].rot, pt.l));
const lv2Pt = (q, pt) => { const j = q.joints.find(x => x.name === pt.bone); return pt.kind === "joint" ? { p: j.world.position, v: j.world.linearVelocity } : { p: j.world.tip, v: j.world.tipVelocity }; };
const RET_MAP = { pelvis: 0, spine: bi("abdomen"), chest: bi("thorax"), head: bi("head"), ...Object.fromEntries(["L", "R"].flatMap(sd => [["upperArm_" + sd, bi("upperArm_" + sd)], ["foreArm_" + sd, bi("forearm_" + sd)], ["thigh_" + sd, bi("thigh_" + sd)], ["shin_" + sd, bi("shank_" + sd)], ["foot_" + sd, bi("foot_" + sd)]])) };
function retarget(q, S, tw) { const byName = Object.fromEntries(q.joints.map(j => [j.name, j])), wv = {}, vj = {}, pel = byName.pelvis;
  for (const b of SK.bones) { if (b.name === "root") continue; const j = byName[b.name], vb = RET_MAP[b.name];
    if (b.name === "pelvis") { wv[b.name] = tw.w[0]; vj[b.name] = V.add(tw.v[0], V.cross(tw.w[0], V.sub(pel.world.position, comW(S, 0)))); continue; }
    const pn = b.parent.name, pj = byName[pn]; vj[b.name] = V.add(vj[pn], V.cross(wv[pn], V.sub(j.world.position, pj.world.position))); wv[b.name] = vb != null ? tw.w[vb] : wv[pn]; }
  const vAt = (pt) => { const j = byName[pt.bone]; return pt.kind === "joint" ? vj[pt.bone] : V.add(vj[pt.bone], V.cross(wv[pt.bone], V.sub(j.world.tip, j.world.position))); };
  return Object.fromEntries(Object.entries(POINTS).map(([g, pts]) => [g, Math.max(...pts.map(pt => V.dist(vAt(pt), lv2Pt(q, pt).v)))])); }
// the D12n study's per-instant values (reproduction rule)
const STUDY = (() => { const f = process.env.STUDY; if (!f) return null; const buf = fs.readFileSync(f), txt = f.endsWith(".gz") ? zlib.gunzipSync(buf).toString() : buf.toString(); return JSON.parse(txt); })();
const out = { tool: "rh1_handoff_eval.mjs", spec: { id: SPEC.human.id }, prereg: "record_hinged/RH1_PREREG.md (50eae23a)", speeds: {} };
for (const v of SPEEDS) {
  const P = prof(v), A = E.r1Make(own()); E.r1Replay(A, P.vOf, null, 1.9)();
  const T = E.r1GaitAt(A.body, A.prm, v).T, Qat = (t) => LV.queryAt(E, A, P.simAt, t, P.vOf, null, { provenance: false }), rows = [], studyRows = STUDY ? STUDY.speeds[String(v === 3 ? 3 : v)] && STUDY.speeds[String(v === 3 ? 3 : v)].rows : null;
  for (let k = 0; k < N; k++) {
    const tt = 2.0 + (k + 0.5) / N * T, qs = [Qat(tt - DL), Qat(tt), Qat(tt + DL)], q = qs[1], R3 = recOf(qs), row = { k, u: r4(q.gait.phase), support: q.gait.support, legs: { L: q.legs.L.contact.subPhase, R: q.legs.R.contact.subPhase } };
    // frozen mapper (old spec) — lower-body identity + the instant's validity (RF-1 consistent across ±δ)
    const mOld = makeMapper(R3, { knee: "RK", rf1: true }), PO = [0, 1, 2].map(i => mOld.poseAt(i));
    const rf = ["L", "R"].map(sd => [0, 1, 2].map(i => (PO[i].foot[sd] ? PO[i].foot[sd].pitchDeg : 0)));
    row.valid = rf.every(a => (a.every(Number.isFinite) && Math.abs(a[2] - a[0]) < 0.05) || a.every(x => !Number.isFinite(x)));
    row.rf1Defined = rf.every(a => a.every(Number.isFinite));
    const t0 = process.hrtime.bigint(), M = MC.mapLV2toV2(SPEC, RIG, { m: qs[0], 0: qs[1], p: qs[2] }), cpuMs = Number(process.hrtime.bigint() - t0) / 1e6; row.cpuMs = r4(cpuMs);
    const lowIds = md.LOWER; let lowBits = true; for (let i3 = 0; i3 < 3; i3++) for (const i of lowIds) { const a = M.lower.poses[i3].S[i], b = PO[i3].S[i]; lowBits = lowBits && a.pos.every((x, c) => Object.is(x, b.pos[c])) && a.rot.every((x, c) => Object.is(x, b.rot[c])); }
    row.lowerBitIdentical = lowBits;
    const S = M.S, tw = { v: M.vel.map(x => x.v), w: M.vel.map(x => x.w) }, So = toOld(S), ref = M.ref;
    row.fit = { f: r4(M.fit.f), it: M.fit.it }; row.vd = { residual: M.vd.constraintResidual, anchorVel: M.vd.anchorVelocityMax };
    // pose: carried rig points, body COM / rotation vs the material, hard-range margins
    row.posMm = Object.fromEntries(Object.entries(POINTS).map(([g, pts]) => [g, r4(Math.max(...pts.map(pt => V.dist(carried(S, pt), lv2Pt(q, pt).p))) * 1000)]));
    row.bodyComMm = r4(Math.max(...md.UPPER.map(i => V.dist(comW(S, i), ref.c[i]))) * 1000); row.bodyRotDeg = r4(Math.max(...md.UPPER.map(i => V.len(MC.rotvec(Q.norm(Q.mul(S[i].rot, Q.conj(ref.R[i]))))))) * 180 / Math.PI);
    let minHard = Infinity, who = null, allMin = {}; for (const j of SPEC.joints) { const a = anatomicalAngles(j, S[j.parentIndex].rot, S[j.childIndex].rot); for (const kk of Object.keys(a)) { const h = j.def.rom[kk] && j.def.rom[kk].hard; if (!h) continue; const m = Math.min(a[kk] - h[0], h[1] - a[kk]); allMin[j.name] = Math.min(allMin[j.name] ?? Infinity, m); if (m < minHard) { minHard = m; who = j.name + "." + kk; } } }
    const upperMin = Math.min(...SPEC.joints.filter(j => md.UPPER.includes(j.childIndex)).map(j => allMin[j.name]));   // the study's definition (upper-body joints only)
    row.rom = { minHardDeg: r4(minHard), who, upperMinDeg: r4(upperMin), perJoint: Object.fromEntries(Object.entries(allMin).map(([n2, x]) => [n2, r4(x)])) };
    // frozen geometric rows on the RH1 body (old frames; P-12 replaced by the margin above — the fitted pose needs no clamp)
    const pz = { ...PO[1], S: So }, geo = geomRowsRev1(R3, 1, 1, { poseAt: () => pz }, rigGeom(R3)); row.geomFails = geo.fails.filter(f => !/^P12/.test(f)).concat(minHard < -1e-6 ? ["P12_hardRange"] : []);
    row.geom = { P1: geo.P1_pelvisMm, P2: geo.P2_pelvisDeg, P3: geo.P3_trunkDeg, P4: [geo.P4_hipMm, geo.P4_kneeMm, geo.P4_ankleMm], P6: geo.P6_limbSwingDeg, P7: geo.P7_twistDeg, P8: geo.P8_armMm, P10: geo.P10_nonContactLowestMm, P11: geo.P11_renderedBootPenMm, P13: geo.P13_minSelfSepMm, foot: geo.foot };
    // corrected P-14c … P-17c (material reference, analytic) and the old definitions (rig-joint anchor + raw rotation · comLocal; analytic) for history
    const mo = MC.momenta(md, S, tw), mr = MC.momentaRef(md, ref); let p14 = 0, p15 = 0, p14f = 0, p15f = 0, who14 = null;
    for (let i = 0; i < NB; i++) { const d = V.dist(tw.v[i], ref.v[i]), dw = V.dist(tw.w[i], ref.w[i]); if (/^foot_/.test(B[i].name)) { p14f = Math.max(p14f, d); p15f = Math.max(p15f, dw); } else { if (d > p14) { p14 = d; who14 = B[i].name; } p15 = Math.max(p15, dw); } }
    const p16 = V.dist(mo.P, mr.P) / md.Mt, dL = V.dist(mo.L, mr.L), lim = TOL.Lrel * Math.max(V.len(mr.L), TOL.Lfloor);
    row.kinC = { P14c: r4(p14), P14body: who14, P15c: r4(p15), P16c: r4(p16), P17c: r4(dL), P17lim: r4(lim), P17frac: r4(dL / Math.max(V.len(mr.L), TOL.Lfloor)), feet: { P14: r4(p14f), P15: r4(p15f) }, dP: r4(V.dist(mo.P, mr.P)),
      fails: [p14 > TOL.bodyVel && "P14c", p15 > TOL.angVel && "P15c", p16 > TOL.comVel && "P16c", dL > lim && "P17c"].filter(Boolean) };
    { const rr = rawOld(R3.bones, R3.bind, R3.pres[1].world, {}), byName = Object.fromEntries(q.joints.map(j => [j.name, j])); let o14 = 0, o15 = 0; const refO = { v: [], w: [], c: [], R: [] };
      for (let i = 0; i < NB; i++) { const rb = anchorOf[B[i].name], jj = rb ? byName[rb] : null, org = rb ? jj.world.position : S[0].pos, d = Q.rot(rr.raw[i], B[i].comLocal), vo = rb ? V.add(jj.world.linearVelocity, V.cross(jj.world.angularVelocity, d)) : V.add(tw.v[0], V.cross(tw.w[0], V.sub(V.add(org, d), comW(S, 0)))), wo = rb ? jj.world.angularVelocity : tw.w[0];
        refO.v.push(vo); refO.w.push(wo); refO.c.push(V.add(org, d)); refO.R.push(rr.raw[i]); if (!/^foot_/.test(B[i].name)) { o14 = Math.max(o14, V.dist(tw.v[i], vo)); o15 = Math.max(o15, V.dist(tw.w[i], wo)); } }
      const cc = V.sc(refO.c.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / md.Mt); let Lr = [0, 0, 0]; for (let i = 0; i < NB; i++) { const rel = Q.norm(Q.mul(refO.R[i], Q.conj(md.Z0[i].rot))), wl = Q.rot(Q.conj(rel), refO.w[i]), I = B[i].inertia; Lr = V.add(Lr, V.add(V.cross(V.sub(refO.c[i], cc), V.sc(refO.v[i], B[i].mass)), Q.rot(rel, [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2])))); }
      let Lv = [0, 0, 0]; const cv = mo.com; for (let i = 0; i < NB; i++) { const rel = Q.norm(Q.mul(S[i].rot, Q.conj(md.Z0[i].rot))), wl = Q.rot(Q.conj(rel), tw.w[i]), I = B[i].inertia; Lv = V.add(Lv, V.add(V.cross(V.sub(comW(S, i), cv), V.sc(tw.v[i], B[i].mass)), Q.rot(rel, [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2])))); }
      const vc = (f) => V.sc(f.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / md.Mt);
      row.kinOld = { P14: r4(o14), P15: r4(o15), P16: r4(V.dist(vc(refO.v), vc(tw.v))), P17frac: r4(V.dist(Lr, Lv) / Math.max(V.len(Lr), TOL.Lfloor)), note: "old quantities (rig-joint anchor, raw rotations, bind-relative inertia frame) with analytic velocities" }; }
    // visible pop (rotation retarget, held unmapped locals) and carried-point velocity; lower body
    row.ret = Object.fromEntries(Object.entries(retarget(q, S, tw)).map(([g, x]) => [g, r4(x)])); row.retOver = Math.max(row.ret.shoulder, row.ret.elbowU, row.ret.elbowF, row.ret.wrist, row.ret.handTip, row.ret.head) > PR2;
    row.lowerVel = r4(Math.max(...POINTS.hipKneeAnkle.map(pt => { const p = carried(S, pt), vv = V.add(tw.v[pt.body], V.cross(tw.w[pt.body], V.sub(p, comW(S, pt.body)))); return V.dist(vv, lv2Pt(q, pt).v); })));
    row.dLrel = r4(dL / Math.max(1, V.len(mr.L))); row.keResidualJ = r4(B.reduce((s, b, i) => { const dv = V.sub(tw.v[i], ref.v[i]), dw = V.sub(tw.w[i], ref.w[i]); return s + 0.5 * b.mass * V.dot(dv, dv) + 0.5 * V.dot(dw, MC.Iworld(S[i].rot, b.inertia).map(r => r.reduce((a, x, c2) => a + x * dw[c2], 0))); }, 0));
    // stance contact consistency: the F0 boot's lowest point (its contact) and its velocity under MC-1
    row.contact = {}; for (const sd of ["L", "R"]) { if (!q.legs[sd].stance) continue; const fi = bi("foot_" + sd); let lp = null; for (const s of OLD[fi].shapes) { const p = supportOf(s, So[fi])([0, -1, 0]); if (!lp || p[1] < lp[1]) lp = p; }
      const vp = V.add(tw.v[fi], V.cross(tw.w[fi], V.sub(lp, comW(S, fi)))); row.contact[sd] = { sub: q.legs[sd].contact.subPhase, lowestMm: r4(lp[1] * 1000), speedMs: r4(V.len(vp)), ok: V.len(vp) <= PR2 && lp[1] >= -0.005 && lp[1] <= 0.002 }; }
    row.contactOk = Object.values(row.contact).every(c => c.ok);
    // HG-A v2 (reported only; v_auth open, R2 Q2)
    { const va = q.root.linearVelocity, vcm = V.sc(mo.P, 1 / md.Mt); row.hgaS = r4(Math.hypot(va[0] - vcm[0], va[2] - vcm[2])); }
    // self-separation (frozen colliders, old frames)
    let sep = { d: Infinity }; for (const [i, j] of SELF_PAIRS) { const s = bodySep(i, j, So); if (s.d < sep.d) sep = { d: s.d, pair: OLD[i].name + "↔" + OLD[j].name }; } row.selfMm = r4(sep.d * 1000); row.selfPair = sep.pair;
    // reproduction rule vs the D12n study (same instants)
    if (studyRows && studyRows[k] && studyRows[k].alts && studyRows[k].alts.D12n) { const s = studyRows[k].alts.D12n, x = s.vel.k, cmp = [];
      for (const g of Object.keys(POINTS)) cmp.push(["pos." + g, row.posMm[g], s.posMm[g]]);
      cmp.push(["bodyV", p14 > 0 ? Math.max(...md.UPPER.map(i => V.dist(tw.v[i], ref.v[i]))) : 0, x.bodyV], ["bodyW", Math.max(...md.UPPER.map(i => V.dist(tw.w[i], ref.w[i]))), x.bodyW], ["dP", V.dist(mo.P, mr.P), x.dP], ["dL", dL, x.dL], ["KE", row.keResidualJ, x.keResidualJ], ["romMin", upperMin, s.rom.minHardDeg]);
      for (const g of Object.keys(POINTS)) cmp.push(["ret." + g, row.ret[g], x.ret[g]]);
      const worst = cmp.map(([n2, a, b]) => [n2, Math.abs(a - b) / Math.max(1, Math.abs(b)), Math.abs(a - b)]).sort((a, b) => b[1] - a[1])[0]; row.repro = { worstRel: worst[1], worstAbs: worst[2], who: worst[0], ok: worst[1] <= 1e-6 }; }   // the rule exactly as preregistered (§5); see the STOP-investigation erratum
    rows.push(row);
  }
  out.speeds[v] = { strideTime: T, rows }; process.stderr.write(`speed ${v}: done\n`);
}
// ── aggregate ──
const q_ = (a, p) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : null; }, st = (a) => ({ p50: r4(q_(a, 0.5)), p90: r4(q_(a, 0.9)), max: r4(q_(a, 1)), min: r4(q_(a, 0)) });
const lines = [];
for (const [v, S] of Object.entries(out.speeds)) { const R = S.rows, Vd = R.filter(r => r.valid), agg = {};
  agg.instants = R.length; agg.valid = Vd.length; agg.lowerBitIdentical = R.every(r => r.lowerBitIdentical); agg.repro = R.filter(r => r.repro).length ? { n: R.filter(r => r.repro).length, ok: R.filter(r => r.repro).every(r => r.repro.ok), worst: Math.max(...R.filter(r => r.repro).map(r => r.repro.worstRel)) } : null;
  agg.pos = Object.fromEntries(Object.keys(R[0].posMm).map(g => [g, st(Vd.map(r => r.posMm[g]))])); agg.bodyComMm = st(Vd.map(r => r.bodyComMm)); agg.bodyRotDeg = st(Vd.map(r => r.bodyRotDeg));
  agg.kinC = { P14c: st(Vd.map(r => r.kinC.P14c)), P15c: st(Vd.map(r => r.kinC.P15c)), P16c: st(Vd.map(r => r.kinC.P16c)), P17frac: st(Vd.map(r => r.kinC.P17frac)), dP: st(Vd.map(r => r.kinC.dP)), failCounts: Vd.reduce((o, r) => (r.kinC.fails.forEach(f => (o[f] = (o[f] || 0) + 1)), o), {}) };
  agg.kinOld = { P14: st(Vd.map(r => r.kinOld.P14)), P15: st(Vd.map(r => r.kinOld.P15)), P16: st(Vd.map(r => r.kinOld.P16)), P17frac: st(Vd.map(r => r.kinOld.P17frac)) };
  agg.ret = Object.fromEntries(Object.keys(R[0].ret).map(g => [g, st(Vd.map(r => r.ret[g]))])); agg.retOver = Vd.filter(r => r.retOver).length;
  agg.lower = { posMm: st(Vd.map(r => r.posMm.hipKneeAnkle)), vel: st(Vd.map(r => r.lowerVel)) }; agg.dLrel = st(Vd.map(r => r.dLrel)); agg.keResidualJ = st(Vd.map(r => r.keResidualJ));
  agg.geomFailCounts = Vd.reduce((o, r) => (r.geomFails.forEach(f => (o[f] = (o[f] || 0) + 1)), o), {}); agg.rom = st(Vd.map(r => r.rom.minHardDeg)); agg.romWho = (Vd.slice().sort((a, b) => a.rom.minHardDeg - b.rom.minHardDeg)[0] || {}).rom?.who;
  agg.romPerJoint = Object.fromEntries(Object.keys(R[0].rom.perJoint).map(n => [n, r4(Math.min(...Vd.map(r => r.rom.perJoint[n])))]));
  agg.self = st(Vd.map(r => r.selfMm)); agg.cpuMs = st(R.map(r => r.cpuMs)); agg.hgaS = st(Vd.map(r => r.hgaS)); agg.hgaPass = Vd.filter(r => r.hgaS <= 0.18).length;
  const cs = Vd.flatMap(r => Object.values(r.contact)); agg.contact = { stanceLegs: cs.length, ok: cs.filter(c => c.ok).length, bySub: cs.reduce((o, c) => { const k2 = c.sub.split(" (")[0]; o[k2] = o[k2] || { n: 0, ok: 0, maxSpeed: 0 }; o[k2].n++; if (c.ok) o[k2].ok++; o[k2].maxSpeed = Math.max(o[k2].maxSpeed, c.speedMs); return o; }, {}) };
  agg.instantPass = Vd.filter(r => !r.geomFails.length && !r.kinC.fails.length && !r.retOver && r.posMm.hipKneeAnkle <= 0.001 && r.lowerVel <= 0.001).length;
  agg.instantPassWithContact = Vd.filter(r => !r.geomFails.length && !r.kinC.fails.length && !r.retOver && r.posMm.hipKneeAnkle <= 0.001 && r.lowerVel <= 0.001 && r.contactOk).length;
  agg.flight = { n: Vd.filter(r => r.support === "flight").length, pass: Vd.filter(r => r.support === "flight" && !r.geomFails.length && !r.kinC.fails.length && !r.retOver).length };
  S.aggregate = agg;
  lines.push(`${v} m/s: ${agg.valid}/${agg.instants} valid · lower bit-identical ${agg.lowerBitIdentical} · repro ${agg.repro ? `${agg.repro.ok} (worst ${agg.repro.worst.toExponential(2)})` : "—"} · pose sh/elbF/wr max ${agg.pos.shoulder.max}/${agg.pos.elbowF.max}/${agg.pos.wrist.max} mm · P-14c/15c/16c/17c max ${agg.kinC.P14c.max}/${agg.kinC.P15c.max}/${agg.kinC.P16c.max}/${agg.kinC.P17frac.max} fails ${JSON.stringify(agg.kinC.failCounts)} · old P-14 max ${agg.kinOld.P14.max} · visible sh/elb/wr max ${agg.ret.shoulder.max}/${agg.ret.elbowF.max}/${agg.ret.wrist.max} (> 0.18: ${agg.retOver}) · lower ${agg.lower.posMm.max} mm ${agg.lower.vel.max} m/s · geom fails ${JSON.stringify(agg.geomFailCounts)} · ROM min ${agg.rom.min}° (${agg.romWho}) · self min ${agg.self.min} mm · contact ok ${agg.contact.ok}/${agg.contact.stanceLegs} ${JSON.stringify(agg.contact.bySub)} · instants passing (no contact row) ${agg.instantPass}/${agg.valid}, with contact ${agg.instantPassWithContact}/${agg.valid} · HG-A pass ${agg.hgaPass}/${agg.valid} · cpu p50 ${agg.cpuMs.p50} ms`); }
console.log(lines.join("\n")); if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out));
