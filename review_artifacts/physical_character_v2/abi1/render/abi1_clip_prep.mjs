// ABI-1 VISUAL PREPARATION (prereg §10; visualisation only). Reads the ABI-1 run records + evaluation, the frozen CF1 fixture and the frozen IB-1
// record; nothing is re-simulated, interpolated or amplified. Same render rule as PVP-1A-DX (MC-1 §2(4) rotation retarget; positions by the rig's own
// FK from the V2 hip midpoint): runner R0 → frozen vinicius rig, tackler V1-matched → frozen gabriel rig. Lead-in as PVP-1A-DX (runner = frozen LOCO
// presentation rows; tackler = the activation pose carried by the authoritative BODY-primitive displacement, labelled constructed). Per physical frame:
// skins / joints / tips, authoritative lane positions (camera rail), cross contacts, both COMs + velocities, runner foot loads, contact-body colliders,
// and (B / C diagnostic) the controller's own recorded quantities: XcoM ξ, the BoS polygon it used (delayed frame), p*, step target and swing reference.
// usage: LV2_ARCHIVE=<tag archive incl. gabriel> V2_KNEE_MODEL=v2k node abi1_clip_prep.mjs <runs dir> <ABI1_EVAL.json> <out dir> [--prefix DX_]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q, MC, RA } = PL;
const MT = await import(new URL("../scripts/abi1_metrics.mjs", import.meta.url).href);
const [RUNS, EVALF, OUT] = process.argv.slice(2), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, PFX = arg("prefix", ""); fs.mkdirSync(OUT, { recursive: true });
const gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f)))), EV = JSON.parse(fs.readFileSync(EVALF));
const FIX = JSON.parse(fs.readFileSync(path.join(RA, PFX === "DX_" ? "pvp1/fixture/PVP1A_FIXTURE.json" : "pvp1/evidence/diag_cf1/PVP1A_DX_CF1_FIXTURE.json"))), { OFF, LOCO } = PL.records(), sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), mdT = MC.model(sT);
const LV = IL.loadLV2(), X = LV.X, M4 = X.M4, OFFS = [50, 0, -34], toW = (p) => V.add(p, OFFS), r6 = (x) => Math.round(x * 1e6) / 1e6, rv = (v) => v.map(r6), nR = sR.bodies.length;
const rig = (id) => { const SK = Object.assign({}, X.charSkel(id)); delete SK._r1body; return SK; }, SKR = rig("vinicius"), SKT = rig("gabriel");
const INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([body, bone]) => [bone, body]));
const qmat = (q, p) => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, p[0], p[1], p[2], 1]; };
const locoQ = (row) => SKR.bones.map(b => MC.m2q(LOCO.pres[row].world[LOCO.bones.findIndex(x => x.name === b.name)])), qRef = locoQ(50);
function retarget(SK, spec, md, Sloc, q0) {
  const Sw = Sloc.map(s => ({ pos: toW(s.pos), rot: s.rot })), q = [], p = [], bi = md.bi, offHip = V.sc(V.add(SK.byName.thigh_L.off, SK.byName.thigh_R.off), 0.5);
  for (const b of SK.bones) { const i = b.idx, vb = INV[b.name];
    if (!b.parent) { const pel = Sw[0].pos; q[i] = q0 ? q0[i] : [0, 0, 0, 1]; p[i] = [pel[0], 0, pel[2]]; continue; }
    q[i] = vb != null ? Q.norm(Q.mul(Sw[bi(vb)].rot, Q.conj(md.Z0[bi(vb)].rot))) : q0 ? Q.norm(Q.mul(q[b.parent.idx], Q.mul(Q.conj(q0[b.parent.idx]), q0[i]))) : q[b.parent.idx];
    p[i] = b.name === "pelvis" ? V.sub(V.add(Sw[0].pos, Q.rot(Sw[0].rot, V.sub(md.hipMid0, md.B[0].origin))), Q.rot(q[i], offHip)) : V.add(p[b.parent.idx], Q.rot(q[b.parent.idx], b.off)); }
  const world = SK.bones.map(b => qmat(q[b.idx], p[b.idx])), skin = []; SK.bones.forEach((b, i) => skin.push(...Array.from(M4.mul(world[i], SK.invBind[i]))));
  return { skin: skin.map(r6), joint: p.map(rv), tip: SK.bones.map(b => rv(V.add(p[b.idx], Q.rot(q[b.idx], V.sc(b.dir, b.len))))) };
}
function presFrame(row) { const W = LOCO.pres[row].world, skin = [], joint = [], tip = []; SKR.bones.forEach((b, i) => { const m = W[LOCO.bones.findIndex(x => x.name === b.name)]; skin.push(...Array.from(M4.mul(m, SKR.invBind[i])));
  joint.push(rv([m[12], m[13], m[14]])); tip.push(rv(Array.from(M4.transformPoint(m, X.V3.scale(b.dir, b.len))))); }); return { skin: skin.map(r6), joint, tip }; }
const authAt = (tau) => { const [r, s] = PL.rowSlot(tau), body = OFF.prims[r][s].find(p => p.prim === "BODY"); return { runner: [OFF.rows[r][8], OFF.rows[r][9]], tackler: [(body.a[0] + body.b[0]) / 2, (body.a[1] + body.b[1]) / 2] }; };
const comV = (spec, S) => { const M = spec.bodies.reduce((a, b) => a + b.mass, 0); return { c: rv(toW(V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.com, spec.bodies[i].mass)), [0, 0, 0]), 1 / M))), v: rv(V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.v, spec.bodies[i].mass)), [0, 0, 0]), 1 / M)) }; };
const CONTACT_BODIES = { runner: ["shank_R", "foot_R"], tackler: ["shank_L", "foot_L"] };
const colliders = (spec, S, names) => names.flatMap(n => { const i = spec.bodies.findIndex(b => b.name === n), st = { pos: toW(S[i].pos), rot: S[i].rot };
  return spec.bodies[i].shapes.map(s => { const X2 = IL.shapeWorld(s, st), P = (l) => rv(V.add(X2.p, Q.rot(X2.q, l)));
    if (s.type === "tapered" || s.type === "capsule") return { t: "c", a: P([0, s.half, 0]), ra: s.type === "capsule" ? s.r : s.rTop, b: P([0, -s.half, 0]), rb: s.type === "capsule" ? s.r : s.rBot };
    if (s.type === "sphere") return { t: "s", c: rv(X2.p), r: s.r }; if (s.type === "hull") return { t: "h", c: s.points.map(P) }; return { t: "b", c: [] }; }); });
const g2w = (q) => rv(toW([q[0], 0.003, q[1]]));   // a turf-plane point (x, z) → world, 3 mm above the turf
// lead-in (240 Hz, τ_act − 15 … − 0.25; no physics)
const bodyMid = (tau) => { const g = PL.primsAt(OFF, tau).find(p => p.prim === "BODY"); return V.lerp(g.a, g.b, 0.5); }, mid0 = bodyMid(FIX.tauAct);
const lead = []; for (let k = 0; k < 60; k++) { const tau = FIX.tauAct - 15 + k / 4, row = Math.floor(tau - 1 + 1e-9), d = V.sub(bodyMid(tau), mid0), ST = FIX.write.tackler.poses.map(s => ({ pos: V.add(s.pos, d), rot: s.rot }));
  lead.push({ k, tau, tauMs: r6((tau - FIX.tauAct) * 1000 / 60), phase: "lead", n: null, auth: authAt(tau), runner: presFrame(Math.min(50, row)), tackler: retarget(SKT, sT, mdT, ST, null) }); }
fs.writeFileSync(path.join(OUT, "LEAD.json"), JSON.stringify({ frames: lead }));
// physical frames per condition × contact set
const meta = { tool: "abi1_clip_prep.mjs", protocol: "ABI-1 (active balance investigation; diagnostic)", renderRule: "MC-1 §2(4)", tauAct: FIX.tauAct, prefix: PFX, runs: {}, markers: {} };
for (const cs of ["ALL", "LEGS"]) for (const cond of ["A", "B", "C"]) { const key = `${cond}_N2_${cs}`, f = `${PFX}${key}.json.gz`; if (!fs.existsSync(path.join(RUNS, f))) continue;
  const run = gz(f), rows = MT.analyze(run), w = EV.windows[key], frames = [];
  for (let n = 0; n <= PV.steps; n++) { const rec = n ? run.recs[n - 1] : null, S = n ? rec.S : [...FIX.write.runner.poses.map((p, i) => ({ ...p, v: FIX.write.runner.vel[i].v, w: [0, 0, 0], com: V.add(p.pos, Q.rot(p.rot, sR.bodies[i].comLocal)) })), ...FIX.write.tackler.poses.map((p, i) => ({ ...p, v: FIX.write.tackler.vel[i].v, w: [0, 0, 0], com: V.add(p.pos, Q.rot(p.rot, sT.bodies[i].comLocal)) }))];
    const SRn = S.slice(0, nR), STn = S.slice(nR), tau = FIX.tauAct + n / 4, ro = n ? rows[n - 1] : null, ctl = rec && rec.ctl ? rec.ctl : null;
    const cross = rec ? rec.contacts.filter(c => c.kind === "cross" && Math.hypot(...c.J2) >= PV.contactNs).map(c => { const tFirst = c.a[0] === "tackler", nTR = tFirst ? c.n : V.sc(c.n, -1), Jr = tFirst ? c.J2 : V.sc(c.J2, -1);
      return { pair: [tFirst ? c.b[1] : c.a[1], tFirst ? c.a[1] : c.b[1]], points: c.points.map(p => rv(toW(p.p))), nTR: rv(nTR), Jr: rv(Jr), J: r6(Math.hypot(...c.J2)) }; }) : [];
    const tBad = rec ? rec.chars.tackler.integrity.sepMaxMm > 1 || rec.chars.tackler.integrity.selfPenMm > 10 : false;
    frames.push({ n, tau, tauMs: r6(n * 1000 / 240), phase: "phys", window: n === 0 ? "entry" : n <= w.end ? (cs === "LEGS" ? "ext" : "w1") : "beyond", auth: authAt(tau), runner: retarget(SKR, sR, mdR, SRn, qRef), tackler: retarget(SKT, sT, mdT, STn, null),
      comR: comV(sR, SRn), comT: comV(sT, STn), feetR: rec ? rec.chars.runner.feet : { L: null, R: null }, cross, crossJ: r6(cross.reduce((a, c) => a + c.J, 0)), nonFoot: rec ? rec.chars.runner.nonFootTurf : [],
      colR: colliders(sR, SRn, CONTACT_BODIES.runner), colT: colliders(sT, STn, CONTACT_BODIES.tackler), tacklerBad: tBad,
      xiNow: ro ? g2w(ro.xi) : null, bosNow: ro && ro.bos ? ro.bos.map(g2w) : null,   // offline metrics of the CURRENT state (every condition)
      ctl: ctl ? { xi: ctl.xi ? g2w(ctl.xi) : null, bos: ctl.bos ? ctl.bos.map(g2w) : null, p: ctl.p ? g2w(ctl.p) : null, sup: ctl.sup, step: ctl.step ? { phase: ctl.step.phase, leg: ctl.step.leg, foothold: ctl.step.foothold ? g2w(ctl.step.foothold) : null, ref: ctl.step.ref ? rv(toW(ctl.step.ref)) : null } : null, dtauMax: ctl.dtauMax ?? null } : null }); }
  fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames })); meta.runs[key] = { frames: frames.length, finalHash: run.finalHash, windowEnd: w.end, windowReason: w.reason };
  console.log(key, frames.length, "frames; window", w.end); }
// markers (from the evaluation)
meta.markers = { firstContact: EV.contact.A_N2_ALL ? EV.contact.A_N2_ALL.firstContactStep : null, firstResponse: { B: EV.validity.V3.B ? EV.validity.V3.B.firstResponseCommandStep : null, C: EV.validity.V3.C ? EV.validity.V3.C.firstResponseCommandStep : null },
  support: Object.fromEntries(Object.entries(EV.timeline).map(([k, t]) => [k, t.support])), steps: Object.fromEntries(Object.entries(EV.timeline).map(([k, t]) => [k, t.stepEvents])), w1End: 60 };
meta.bonesR = SKR.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.idx : null })); meta.bonesT = SKT.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.idx : null }));
fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 1)); console.log("markers", JSON.stringify(meta.markers.firstResponse));
