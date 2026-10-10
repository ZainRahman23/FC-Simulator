// RH1 instantiation WITHOUT stepping (RH1_PREREG.md §6, "Instantiation without collision stepping"; frozen 50eae23a). For every valid instant of the
// four regimes: MC-1's state is written into one Jolt world built from the RH1 spec (plane turf, accepted iterations); NO step is ever taken; the
// world is read back. Gates: read-back = written; Jolt's own constraint anchors coincide (≤ 1 mm) and the constructed anchor velocities agree
// (≤ 1e-9 m/s); no hard-range excursion (anatomical, and Jolt's own constraint-space limits); stance boot −5 … +2 mm and other bodies ≥ −5 mm;
// self-separation ≥ −10 mm (an isolated "overlap, depth 0" flag is checked against the neighbouring instants); no NaN; stance contact
// consistency (F0 boot contact-point speed ≤ 0.18 m/s, from the read-back twists).
// usage (cwd = worktree root): LV2_ARCHIVE=… V13_WT=… node .../rh1_instantiate.mjs [--n 240] [--json out]
import fs from "fs"; import vm from "vm"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const ARCH = process.env.LV2_ARCHIVE, { loadRun1 } = require(path.join(ARCH, "sandbox/visual/run1/tools/run1_load.cjs")), X = loadRun1({ extra: ["run1/lv2_state.js"] }), LV = vm.runInContext("LV2_STATE", X.ctx), E = X.RUN1_V13;
const P2 = path.resolve("sandbox/visual/physchar2") + "/";
const MC = await import(P2 + "map/v2_lv2_map.js"), { pi1RunnerRH1Spec } = await import(P2 + "spec/v2_pi1_runner_rh.js"), { anatomicalAngles, decompose } = await import(P2 + "spec/v2_joints.js");
const { loadJolt, V2JoltWorld } = await import(P2 + "core/v2_jolt.js"), { G1_WORLD } = await import(P2 + "gates/v2_g1.js"), { bodyLowest } = await import(P2 + "sim/v2_geom.js");
const PCG = await import(new URL("../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href), { L, makeMapper } = PCG, { V, Q, bodySep, SELF_PAIRS, supportOf } = L, OLD = L.B;
const J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js"), SPEC = pi1RunnerRH1Spec(), md = MC.model(SPEC), B = md.B, NB = md.NB, bi = md.bi;
const W = new V2JoltWorld(J, SPEC, SPEC.contact, { velSteps: G1_WORLD.velSteps, posSteps: G1_WORLD.posSteps, ccd: G1_WORLD.ccd }); let steps = 0; const step0 = W.step.bind(W); W.step = (...a) => { steps++; return step0(...a); };
const HD = 0.3, N = +arg("n", 240), r6 = (x) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(9)), PR2 = 0.18;
const own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; }, SK = own(), bindW = X.skelFK(SK, {}, X.M4.ident()).world.map(m => Array.from(m)), RIG = { bones: SK.bones.map(b => ({ name: b.name, parent: b.parent ? b.parent.name : null })), bind: bindW };
const frameOf = (q) => ({ world: q.joints.map(MC.jointMatrix), feet: ["L", "R"].map(sd => ({ contact: !!q.legs[sd].stance, mode: q.legs[sd].contact.pivot || "swing" })) }), recOf = (qs) => ({ bones: RIG.bones, bind: bindW, pres: qs.map(frameOf) });
const toOld = (S) => S.map((s, i) => ({ pos: V.add(s.pos, Q.rot(s.rot, V.sub(OLD[i].origin, B[i].origin))), rot: s.rot }));
const qdist = (a, b) => { const d = Q.mul(Q.conj(a), b); return 2 * Math.atan2(Math.hypot(d[0], d[1], d[2]), Math.abs(d[3])); };
const out = { tool: "rh1_instantiate.mjs", spec: SPEC.human.id, world: { velSteps: G1_WORLD.velSteps, posSteps: G1_WORLD.posSteps }, speeds: {} };
for (const v of [3.0, 5.5, 7.8, 9.5]) {
  const P = { vOf: () => v, simAt: (t) => ({ x: 70 + v * t * Math.cos(HD), y: 30 + v * t * Math.sin(HD), heading: HD, v }) }, A = E.r1Make(own()); E.r1Replay(A, P.vOf, null, 1.9)();
  const T = E.r1GaitAt(A.body, A.prm, v).T, Qat = (t) => LV.queryAt(E, A, P.simAt, t, P.vOf, null, { provenance: false }), rows = [];
  for (let k = 0; k < N; k++) {
    const tt = 2.0 + (k + 0.5) / N * T, qs = [Qat(tt - 1e-4), Qat(tt), Qat(tt + 1e-4)], q = qs[1], R3 = recOf(qs), PO = [0, 1, 2].map(i => makeMapper(R3, { knee: "RK", rf1: true }).poseAt(i));
    const rf = ["L", "R"].map(sd => [0, 1, 2].map(i => (PO[i].foot[sd] ? PO[i].foot[sd].pitchDeg : 0))), valid = rf.every(a => (a.every(Number.isFinite) && Math.abs(a[2] - a[0]) < 0.05) || a.every(x => !Number.isFinite(x)));
    if (!valid) { rows.push({ k, valid: false }); continue; }
    const M = MC.mapLV2toV2(SPEC, RIG, { m: qs[0], 0: qs[1], p: qs[2] }), off = [Math.round(M.S[0].pos[0]), 0, Math.round(M.S[0].pos[2])];
    const Sw = M.S.map(s => ({ pos: V.sub(s.pos, off), rot: s.rot })), comW = (S, i) => MC.comW(md, S, i);
    for (let i = 0; i < NB; i++) { W.setPose(i, Sw[i].pos, Sw[i].rot); W.setVel(i, M.vel[i].v, M.vel[i].w); }
    const rd = Array.from({ length: NB }, (_, i) => W.read(i)), row = { k, valid: true, support: q.gait.support };
    let dp = 0, dr = 0, dc = 0, dv = 0, dw = 0, nan = false;
    for (let i = 0; i < NB; i++) { const r = rd[i]; nan = nan || [...r.pos, ...r.rot, ...r.v, ...r.w, ...r.com].some(x => !Number.isFinite(x));
      dp = Math.max(dp, V.dist(r.pos, Sw[i].pos)); dr = Math.max(dr, qdist(r.rot, Sw[i].rot)); dc = Math.max(dc, V.dist(r.com, comW(Sw, i))); dv = Math.max(dv, V.dist(r.v, M.vel[i].v)); dw = Math.max(dw, V.dist(r.w, M.vel[i].w)); }
    row.readback = { posM: r6(dp), rotRad: r6(dr), comM: r6(dc), velMs: r6(dv), angRadS: r6(dw), nan };
    // Jolt's own constraint anchors (constraint space → each body's COM space) and constraint-space limits
    let sep = 0, sepWho = null, limExc = 0, limWho = null;
    SPEC.joints.forEach((j, kk) => { const jb = W.readbackJoint(kk), r1 = rd[j.parentIndex], r2 = rd[j.childIndex], a1 = V.add(r1.com, Q.rot(r1.rot, jb.toBody1.t)), a2 = V.add(r2.com, Q.rot(r2.rot, jb.toBody2.t)), d = V.dist(a1, a2); if (d > sep) { sep = d; sepWho = j.name; }
      const dcs = decompose(jb.qCS), val = [dcs.tw, dcs.sy, dcs.sz]; for (let a = 0; a < 3; a++) { const e = Math.max(0, jb.rotLo[a] - val[a], val[a] - jb.rotHi[a]); if (e > limExc) { limExc = e; limWho = j.name + "[" + a + "]"; } } });
    row.anchors = { sepMm: r6(sep * 1000), who: sepWho, constructedAnchorVelMs: M.vd.anchorVelocityMax }; row.joltLimitExcRad = r6(limExc); row.joltLimitWho = limWho;
    // anatomical hard range on the read-back poses
    const Sr = rd.map(r => ({ pos: r.pos, rot: r.rot })); let mh = Infinity, mhw = null; for (const j of SPEC.joints) { const a = anatomicalAngles(j, Sr[j.parentIndex].rot, Sr[j.childIndex].rot); for (const kk of Object.keys(a)) { const h = j.def.rom[kk] && j.def.rom[kk].hard; if (!h) continue; const m = Math.min(a[kk] - h[0], h[1] - a[kk]); if (m < mh) { mh = m; mhw = j.name + "." + kk; } } }
    row.hardMarginDeg = r6(mh); row.hardWho = mhw;
    // turf: stance boots −5 … +2 mm, every other body ≥ −5 mm; self-separation (frozen colliders via the old frames)
    let other = Infinity, otherWho = null; const boots = {}; for (let i = 0; i < NB; i++) { const lo = bodyLowest(B[i], Sr[i]).y, nm = B[i].name, sd = nm.endsWith("_L") ? "L" : "R"; if (/^foot_/.test(nm) && q.legs[sd].stance) boots[sd] = r6(lo * 1000); else if (lo < other) { other = lo; otherWho = nm; } }
    row.turf = { stanceBootMm: boots, otherMinMm: r6(other * 1000), otherWho }; const So = toOld(Sr); let ss = { d: Infinity }; for (const [i, j] of SELF_PAIRS) { const s = bodySep(i, j, So); if (s.d < ss.d) ss = { d: s.d, pair: OLD[i].name + "↔" + OLD[j].name }; } row.selfMm = r6(ss.d * 1000); row.selfPair = ss.pair;
    // stance contact consistency from the read-back twists
    row.contact = {}; for (const sd of ["L", "R"]) { if (!q.legs[sd].stance) continue; const fi = bi("foot_" + sd); let lp = null; for (const s of OLD[fi].shapes) { const p = supportOf(s, So[fi])([0, -1, 0]); if (!lp || p[1] < lp[1]) lp = p; } const vp = V.add(rd[fi].v, V.cross(rd[fi].w, V.sub(lp, rd[fi].com))); row.contact[sd] = { sub: q.legs[sd].contact.subPhase.split(" (")[0], speedMs: r6(V.len(vp)) }; }
    rows.push(row);
  }
  // isolated self-overlap flags: neighbours' separations
  rows.forEach((r, i) => { if (r.valid && r.selfMm <= 0) { const nb = [rows[i - 1], rows[i + 1]].filter(x => x && x.valid).map(x => x.selfMm); r.selfNeighbourMm = nb; r.selfIsolatedFlag = nb.length > 0 && nb.every(x => x > 20); } });
  const Vd = rows.filter(r => r.valid), mx = (f) => Math.max(...Vd.map(f)), mn = (f) => Math.min(...Vd.map(f)), cs = Vd.flatMap(r => Object.values(r.contact));
  const turfOk = (r) => Object.values(r.turf.stanceBootMm).every(x => x >= -5 && x <= 2) && r.turf.otherMinMm >= -5, selfOk = (r) => r.selfMm >= -10;
  const gates = { readback: Vd.every(r => r.readback.posM <= 1e-6 && r.readback.rotRad <= 1e-6 && r.readback.velMs <= 1e-5 && r.readback.angRadS <= 1e-5 && !r.readback.nan), anchors: Vd.every(r => r.anchors.sepMm <= 1 && r.anchors.constructedAnchorVelMs <= 1e-9),
    hardRange: Vd.every(r => r.hardMarginDeg >= -1e-6), joltLimits: Vd.every(r => r.joltLimitExcRad <= 1e-5), turf: Vd.every(turfOk), self: Vd.every(selfOk), contact: cs.every(c => c.speedMs <= PR2) };
  out.speeds[v] = { valid: Vd.length, instants: rows.length, gates, failing: Object.fromEntries(Object.entries({ turf: Vd.filter(r => !turfOk(r)).length, contact: Vd.filter(r => Object.values(r.contact).some(c => c.speedMs > PR2)).length, self: Vd.filter(r => !selfOk(r)).length })),
    maxima: { readbackPosM: mx(r => r.readback.posM), readbackRotRad: mx(r => r.readback.rotRad), readbackComM: mx(r => r.readback.comM), readbackVelMs: mx(r => r.readback.velMs), readbackAngRadS: mx(r => r.readback.angRadS), anchorSepMm: mx(r => r.anchors.sepMm), constructedAnchorVelMs: mx(r => r.anchors.constructedAnchorVelMs), joltLimitExcRad: mx(r => r.joltLimitExcRad), hardMarginMinDeg: mn(r => r.hardMarginDeg), otherTurfMinMm: mn(r => r.turf.otherMinMm), selfMinMm: mn(r => r.selfMm), selfFlags: Vd.filter(r => r.selfMm <= 0).map(r => ({ k: r.k, pair: r.selfPair, neighbours: r.selfNeighbourMm, isolated: r.selfIsolatedFlag })) },
    contactBySub: cs.reduce((o, c) => { o[c.sub] = o[c.sub] || { n: 0, ok: 0, max: 0 }; o[c.sub].n++; if (c.speedMs <= PR2) o[c.sub].ok++; o[c.sub].max = Math.max(o[c.sub].max, c.speedMs); return o; }, {}), rows };
  console.log(`${v} m/s: ${Vd.length}/${rows.length} valid instants instantiated · gates ${JSON.stringify(gates)} · failing ${JSON.stringify(out.speeds[v].failing)} · maxima ${JSON.stringify(out.speeds[v].maxima, (k2, x) => (typeof x === "number" ? +x.toPrecision(3) : x))} · contact ${JSON.stringify(out.speeds[v].contactBySub)}`);
}
out.joltSteps = steps; console.log("Jolt steps taken:", steps); if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out)); W.destroy();
