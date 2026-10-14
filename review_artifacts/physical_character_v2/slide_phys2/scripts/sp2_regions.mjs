// SLIDE-PHYS-2 shared contact attribution: classify a turf contact point on a V2 body into an anatomical REGION, read every turf manifold of a
// record step as { body, region, J (on the body), Jn, point, slip, μ }, and the friction μ actually in force (spec table; TCF-1 re-evaluated from
// the pre-step boot pose; an optional per-region material table, SP2's RMAT, when the record carries one).
const L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), { V, Q, B, bi } = L;
export { L };
export const MU = { boot: 1.2, hand: 0.7, body: 0.5 };
const c35 = Math.cos(35 * Math.PI / 180), c55 = Math.cos(55 * Math.PI / 180);
const sideOf = (bodyName, rl) => { const s = bodyName.endsWith("_L") ? -1 : 1, lx = rl[0] * s, az = rl[2];   // lateral = local −x (left) / +x (right); anterior = +z
  return [["lateral", lx], ["medial", -lx], ["anterior", az], ["posterior", -az]].sort((p, q) => q[1] - p[1])[0][0]; };
export function region(S, name, p, K = null) { const i = bi(name), b = S[i], rl = Q.rot(Q.conj(b.rot), V.sub(p, b.pos));
  if (name.startsWith("foot")) { const s = name.slice(-1), part = rl[2] < -0.02 ? "heel" : rl[2] > 0.17 ? "toe" : rl[1] < -0.055 ? "sole" : "upper"; return { region: `boot_${s}:${part}`, group: s === "R" ? "tackBoot" : "foldBoot" }; }
  if (name.startsWith("shank") || name.startsWith("thigh")) { K = K || L.skel(S); const s = name.slice(-1), sh = name.startsWith("shank"), a = sh ? K["knee_" + s] : K["hip_" + s], c = sh ? K["ankle_" + s] : K["knee_" + s];
    const ax = V.sub(c, a), u = Math.max(0, Math.min(1, V.dot(V.sub(p, a), ax) / V.dot(ax, ax))), rl2 = Q.rot(Q.conj(b.rot), V.sub(p, V.add(a, V.sc(ax, u))));
    const knee = sh ? u < 0.2 : u > 0.8, side = sideOf(name, rl2), part = knee ? "knee" : sh ? "shin" : "thigh"; return { region: `${part}_${s}:${side}`, group: part + "_" + s, along: u, side }; }
  if (name === "pelvis") return { region: `hip_pelvis:${rl[2] < -0.05 ? "buttock" : rl[0] < 0 ? "left" : "right"}`, group: "pelvis" };
  if (name.startsWith("forearm")) { const s = name.slice(-1), sg = s === "L" ? -1 : 1; const h = rl[0] * sg > 0.36; return { region: `${h ? "hand" : "forearm"}_${s}`, group: h ? "hand" : "forearm" }; }
  if (name.startsWith("upperArm")) return { region: "upperArm_" + name.slice(-1), group: "arm" };
  if (name === "abdomen" || name === "thorax") return { region: "torso:" + name, group: "torso" };
  return { region: name, group: name }; }
// μ in force for a contact: rmat (per region group → μ) overrides the spec table for non-boot regions; boots follow their sole rule
export function muOf(name, regionInfo, Spre, rule) { if (name.startsWith("foot")) { const r = rule && (rule[name] || (rule.studded != null ? rule : null)); if (!r) return MU.boot;
    const f = Spre[bi(name)], c = -Q.rot(f.rot, [0, -1, 0])[1], s = Math.max(0, Math.min(1, (c - c55) / (c35 - c55))), k = s * s * (3 - 2 * s); return (r.upper ?? 0.5) + ((r.studded ?? 1.2) - (r.upper ?? 0.5)) * k; }
  if (rule && rule.rmat && rule.rmat[regionInfo.group] != null) return rule.rmat[regionInfo.group];
  return regionInfo.group === "hand" ? MU.hand : MU.body; }
// every turf contact of a step (role's bodies at offset off), attributed
export function turfContacts(r, Spre, role = "tackler", off = 0, rule = null) { const S = r.S.slice(off, off + B.length), K = L.skel(S), out = [];
  for (const c of r.contacts) { if (!c.kind.startsWith("turf")) continue; const side = c.a === "turf" ? c.b : c.a; if (!Array.isArray(side) || side[0] !== role) continue;
    const name = side[1], sg = c.a === "turf" ? 1 : -1, J = V.sc(c.J2, sg), Jn = c.Jn; if (Jn <= 0 && V.len(J) < 1e-9) continue;
    const wsum = c.points.reduce((s, q) => s + Math.max(0, q.lam), 0), p = wsum > 0 ? V.sc(c.points.reduce((s, q) => V.add(s, V.sc(q.p, Math.max(0, q.lam))), [0, 0, 0]), 1 / wsum) : c.points[0].p;
    const i = bi(name), vp = L.IL.velAt(S[i], S[i].com, p), rg = region(S, name, p, K), mu = muOf(name, rg, Spre.slice(off, off + B.length), rule), Jt = Math.hypot(J[0], J[2]);
    out.push({ body: name, ...rg, J, Jn, Jt, p, slip: Math.hypot(vp[0], vp[2]), mu, state: Jn <= 1e-9 ? "none" : Jt >= 0.97 * mu * Jn ? "slip" : "stick", depth: Math.max(...c.points.map(q => q.depth)) }); }
  return out; }
