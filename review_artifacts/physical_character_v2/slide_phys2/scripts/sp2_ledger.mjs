// SLIDE-PHYS-2 Phase 1 — horizontal-momentum ledger of a solo tackler record (SP1 or a successor), per turf contact and body REGION.
// Linear momentum of the whole body changes only through EXTERNAL impulses (gravity is vertical; every joint / limit / muscle force is internal and
// cancels in the sum), so the horizontal ledger is: ΔP_h = Σ (turf tangential impulses) + residual, and every N·s of braking is attributed to the
// contact (body, region, material) that delivered it. Internal channels (joint limits, muscles, damping, rotation) are reported where they act:
// in the ENERGY ledger (horizontal COM kinetic energy vs total KE, actuator work, passive dissipation, contact work) and in the angular momentum
// about the COM (the turf torque that converts forward momentum into pitch). Regions are classified from the contact point on the body:
//   foot → heel / sole(studs) / toe / upper-side; shank → knee (proximal 20 %) / shin, with side lateral / anterior / medial / posterior;
//   thigh → knee (distal 20 %) / thigh, with side; pelvis → hip-buttock (side); forearm → hand (distal) / forearm; others by body.
// Per contact manifold: time, point, normal impulse, tangential impulse (on the body, world), slip velocity of the body point, stick / slip
// (tangential impulse at ≥ 97 % of μ·Jn = on the friction cone), μ (spec table; TCF-1 sole rule re-evaluated from the pre-step boot pose).
// usage (worktree root): node sp2_ledger.mjs --rec <rec.json.gz> [--from 0.25 --to 1.2] [--out ledger.json] [--rows rows.tsv] [--bOff 0 --role tackler]
import fs from "fs";
const L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), { V, Q, B, M, G, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const o = L.readGz(arg("rec")), H = 1 / 240, role = arg("role", "tackler"), off = +arg("bOff", "0"), r4 = (x) => Math.round(x * 1e4) / 1e4;
const MU = { boot: 1.2, hand: 0.7, body: 0.5 }, c35 = Math.cos(35 * Math.PI / 180), c55 = Math.cos(55 * Math.PI / 180);
const recs = o.recs, n0 = recs[0].n - 1, tOf = (r) => r.t ?? (r.n - n0) * H;
// travel direction: the COM's horizontal velocity at the start of the window
const t0 = +arg("from", "0.25"), t1 = +arg("to", "1.2"), k0 = recs.findIndex(r => tOf(r) >= t0 - 1e-9), k1 = Math.max(k0, recs.findIndex(r => tOf(r) >= t1 - 1e-9));
const Pof = (r) => r.chars[role].P, P0 = Pof(recs[Math.max(0, k0 - 1)]), dir = V.norm([P0[0], 0, P0[2]]), lat = [dir[2], 0, -dir[0]];
const sideOf = (bodyName, rl) => { const s = bodyName.endsWith("_L") ? -1 : 1, lx = rl[0] * s, az = rl[2], ay = rl[1];   // lateral = local −x (left) / +x (right)
  const a = [["lateral", lx], ["medial", -lx], ["anterior", az], ["posterior", -az]].sort((p, q) => q[1] - p[1]); return a[0][0]; };
function region(S, name, p) { const i = bi(name), b = S[i], rl = Q.rot(Q.conj(b.rot), V.sub(p, b.pos)), K = L.skel(S);
  if (name.startsWith("foot")) { const s = name.slice(-1), sole = -Q.rot(b.rot, [0, -1, 0])[1]; const part = rl[2] < -0.02 ? "heel" : rl[2] > 0.17 ? "toe" : rl[1] < -0.055 ? "sole" : "upper";
    return { region: `boot_${s}:${part}`, soleDownCos: sole }; }
  if (name.startsWith("shank") || name.startsWith("thigh")) { const s = name.slice(-1), a = name.startsWith("shank") ? K["knee_" + s] : K["hip_" + s], c = name.startsWith("shank") ? K["ankle_" + s] : K["knee_" + s];
    const ax = V.sub(c, a), u = Math.max(0, Math.min(1, V.dot(V.sub(p, a), ax) / V.dot(ax, ax))), axisPt = V.add(a, V.sc(ax, u)), rw = V.sub(p, axisPt), rl2 = Q.rot(Q.conj(b.rot), rw);
    const nearKnee = name.startsWith("shank") ? u < 0.2 : u > 0.8, side = sideOf(name, rl2);
    return { region: `${nearKnee ? "knee" : name.startsWith("shank") ? "shin" : "thigh"}_${s}:${side}`, along: u }; }
  if (name === "pelvis") return { region: `hip_pelvis:${rl[2] < -0.05 ? "buttock" : rl[0] < 0 ? "left" : "right"}` };
  if (name.startsWith("forearm")) { const s = name.slice(-1), sg = s === "L" ? -1 : 1; return { region: `${rl[0] * sg > 0.36 ? "hand" : "forearm"}_${s}` }; }
  if (name.startsWith("upperArm")) return { region: "upperArm_" + name.slice(-1) };
  if (name === "abdomen" || name === "thorax") return { region: "torso:" + name };
  return { region: name }; }
const muOf = (name, Spre) => { if (!name.startsWith("foot")) return name.startsWith("forearm") ? null : MU.body; const soleRule = (o.soleRuleByFoot && o.soleRuleByFoot[name]) || o.soleRule || null;
  if (!soleRule) return MU.boot; const f = Spre[bi(name)], c = -Q.rot(f.rot, [0, -1, 0])[1], s = Math.max(0, Math.min(1, (c - c55) / (c35 - c55))), k = s * s * (3 - 2 * s); return (soleRule.upper ?? 0.5) + ((soleRule.studded ?? 1.2) - (soleRule.upper ?? 0.5)) * k; };
const rows = [], agg = {}, aggPhase = {}, first = {}; let Jsum = [0, 0, 0];
for (let k = k0; k <= k1; k++) { const r = recs[k], S = r.S.slice(off, off + B.length), Spre = (recs[k - 1] || r).S.slice(off, off + B.length), t = tOf(r);
  for (const c of r.contacts) { if (!c.kind.startsWith("turf")) continue; const side = c.a === "turf" ? c.b : c.a; if (!Array.isArray(side) || side[0] !== role) continue;
    const name = side[1], sg = c.a === "turf" ? 1 : -1, J = V.sc(c.J2, sg), Jn = c.Jn; if (Jn <= 0 && V.len(J) < 1e-9) continue;
    // contact point: impulse-weighted mean of the manifold points
    const wsum = c.points.reduce((s, q) => s + Math.max(0, q.lam), 0), p = wsum > 0 ? V.sc(c.points.reduce((s, q) => V.add(s, V.sc(q.p, Math.max(0, q.lam))), [0, 0, 0]), 1 / wsum) : c.points[0].p;
    const i = bi(name), vp = L.IL.velAt(S[i], S[i].com, p), slip = Math.hypot(vp[0], vp[2]), Jt = Math.hypot(J[0], J[2]);
    let mu = muOf(name, Spre); const rg = region(S, name, p); if (mu == null) mu = rg.region.startsWith("hand") ? MU.hand : MU.body;
    const onCone = Jn > 1e-6 && Jt >= 0.97 * mu * Jn, brake = -V.dot(J, dir), latJ = V.dot(J, lat);
    const row = { t: r4(t), body: name, region: rg.region, p: p.map(r4), Jn: r4(Jn), Jt: r4(Jt), Jbrake: r4(brake), Jlat: r4(latJ), slip: r4(slip), state: Jn <= 1e-9 ? "none" : onCone ? "slip" : (slip < 0.05 ? "stick" : "partial"), mu: r4(mu), soleDownCos: rg.soleDownCos != null ? r4(rg.soleDownCos) : null };
    rows.push(row); Jsum = V.add(Jsum, J);
    const key = rg.region, a = agg[key] || (agg[key] = { brakeNs: 0, JnNs: 0, JtNs: 0, steps: 0, slipSteps: 0, stickSteps: 0, peakBW: 0, peakT: null, first: null, mu: new Set() });
    a.brakeNs += brake; a.JnNs += Jn; a.JtNs += Jt; a.steps++; if (row.state === "slip") a.slipSteps++; if (row.state === "stick") a.stickSteps++; a.mu.add(r4(mu)); if (a.first == null && Jn > 0) a.first = r4(t);
    const F = Jn / H / (M * G); if (F > a.peakBW) { a.peakBW = F; a.peakT = r4(t); } if (first[name] == null && Jn > 0) first[name] = r4(t); } }
// whole-body horizontal momentum through the window, the residual, COM speed
const Pa = Pof(recs[Math.max(0, k0 - 1)]), Pb = Pof(recs[k1]), dPh = V.dot(V.sub(Pb, Pa), dir), residual = dPh - V.dot(Jsum, dir);
// energy ledger over the window: ½M|v_com|² (horizontal), total KE, actuator work, passive dissipation, and the remainder (= turf contact work)
const ch = (k) => recs[k].chars[role]; let Wact = 0, D = 0, Eres = 0; for (let k = k0; k <= k1; k++) { Wact += ch(k).Wact || 0; D += ch(k).D || 0; Eres += ch(k).energyRes || 0; }
const vh = (k) => V.dot(ch(k).P, dir) / M, Ecom = (k) => 0.5 * M * vh(k) ** 2;
// angular momentum about the COM, pitch component (about the lateral axis): L_O − com × P
const Lcom = (k) => { const c = ch(k); return V.sub(c.L_O, V.cross(c.com, c.P)); }, pitch = (k) => V.dot(Lcom(k), lat);
const phases = [["pre", t0, null], ["impact", null, null], ["glide", null, t1]];
const out = { tool: "sp2_ledger.mjs", rec: arg("rec").split("/").pop(), hash: o.finalHash, window: [r4(tOf(recs[k0])), r4(tOf(recs[k1]))], travelDir: dir.map(r4), firstContact: first,
  momentum: { PhStartNs: r4(V.dot(Pa, dir)), PhEndNs: r4(V.dot(Pb, dir)), dPhNs: r4(dPh), sumTurfBrakeNs: r4(-V.dot(Jsum, dir)), residualNs: r4(residual), vhStart: r4(vh(Math.max(0, k0 - 1))), vhEnd: r4(vh(k1)) },
  byRegion: Object.fromEntries(Object.entries(agg).sort((a, b) => b[1].brakeNs - a[1].brakeNs).map(([k, a]) => [k, { brakeNs: r4(a.brakeNs), shareOfBraking: r4(a.brakeNs / Math.max(1e-9, -V.dot(Jsum, dir))), JnNs: r4(a.JnNs), JtNs: r4(a.JtNs), first: a.first, peakBW: r4(a.peakBW), peakT: a.peakT, slipFrac: r4(a.slipSteps / a.steps), stickFrac: r4(a.stickSteps / a.steps), mu: [...a.mu].slice(0, 4) }])),
  energy: { EcomHStartJ: r4(Ecom(Math.max(0, k0 - 1))), EcomHEndJ: r4(Ecom(k1)), actuatorWorkJ: r4(Wact), passiveDissipationJ: r4(D), turfContactWorkJ: r4(Eres), keStart: r4(ch(Math.max(0, k0 - 1)).E), keEnd: r4(ch(k1).E) },
  pitchMomentum: { startNms: r4(pitch(Math.max(0, k0 - 1))), endNms: r4(pitch(k1)), note: "about the COM, + = about the lateral axis (dir × up)" } };
// per-body summary for the brief's list
const groups = { "tackling boot (heel+sole+toe+upper)": /^boot_R/, "bent-leg boot": /^boot_L/, "shin/calf": /^shin_/, "knee": /^knee_/, "thigh": /^thigh_/, "hip/pelvis": /^hip_pelvis/, "hand": /^hand_/, "forearm": /^forearm_/, "torso": /^torso/, "upper arm / head": /^(upperArm|head)/ };
out.byGroup = Object.fromEntries(Object.entries(groups).map(([g, re]) => { const ks = Object.keys(out.byRegion).filter(k => re.test(k)); const b = ks.reduce((s, k) => s + out.byRegion[k].brakeNs, 0); return [g, { brakeNs: r4(b), share: r4(b / Math.max(1e-9, out.momentum.sumTurfBrakeNs)), regions: ks }]; }));
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
if (arg("rows")) fs.writeFileSync(arg("rows"), ["t\tbody\tregion\tpx\tpy\tpz\tJn\tJt\tJbrake\tJlat\tslip\tstate\tmu\tsoleDownCos", ...rows.map(r => [r.t, r.body, r.region, ...r.p, r.Jn, r.Jt, r.Jbrake, r.Jlat, r.slip, r.state, r.mu, r.soleDownCos ?? ""].join("\t"))].join("\n"));
console.log(JSON.stringify({ momentum: out.momentum, firstContact: out.firstContact, byGroup: out.byGroup, energy: out.energy, pitch: out.pitchMomentum }, null, 1));
console.log("byRegion:"); for (const [k, a] of Object.entries(out.byRegion)) console.log(" ", k.padEnd(24), "brake", a.brakeNs.toFixed(1).padStart(7), "N·s", (100 * a.shareOfBraking).toFixed(1).padStart(5), "%  Jn", a.JnNs.toFixed(0).padStart(5), " first", a.first, " peak", a.peakBW.toFixed(1), "BW @", a.peakT, " slip", a.slipFrac.toFixed(2), " stick", a.stickFrac.toFixed(2), " μ", a.mu.join("/"));
