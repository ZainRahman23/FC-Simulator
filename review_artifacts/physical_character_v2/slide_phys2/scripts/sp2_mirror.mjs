// SLIDE-PHYS-2 Phase 19 — the MIRRORED tackle (fold = right leg, tackling = left): the same candidate reflected through the sagittal plane
// (world x → −x). Anatomical joint angles are side-neutral (flex / abd / rot / df / inv mean the same on both sides), so L ↔ R tracks are swapped;
// trunk lateral bend / axial rotation, pelvis roll / yaw, the lateral support push and every left / right side flag change sign or swap.
// If the body and the architecture are side-neutral the mirrored run reproduces the original with x negated (a check of over-fitting / hidden
// asymmetry). usage (worktree root): node sp2_mirror.mjs --params <phys.json> [--speed 5] [--out rec.json.gz]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), CL = await import(S1 + "sp_climits.mjs"), AU = await import(S1 + "sp_authority.mjs");
const P = await import(new URL("./sp2_param.mjs", import.meta.url).href), RT = await import(new URL("./sp2_ctrl.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const sw = (n) => n.replace(/_L\b/g, "_@").replace(/_R\b/g, "_L").replace(/_@/g, "_R"), NEG = new Set(["lumbar.lat", "lumbar.rot", "thoracic.lat", "thoracic.rot", "neck.lat", "neck.rot"]);
const negPlan = (pl) => pl ? { ...pl, roll: (pl.roll || []).map(([t, x]) => [t, -x]), yaw: (pl.yaw || []).map(([t, x]) => [t, -x]) } : pl;
export function mirror(c) { const m = { ...c, id: (c.id || "") + "-mirror" };
  const tr = {}; for (const [k, v] of Object.entries(c.chor.tracks)) tr[sw(k)] = NEG.has(k) ? v.map(([t, x]) => [t, -x]) : v.map(([t, x]) => [t, x]); m.chor = { ...c.chor, tracks: tr };
  const an = {}; for (const [j, v] of Object.entries(c.entry.anat)) { const o = { ...v }; if (["lumbar", "thoracic", "neck"].includes(j)) { if (o.lat != null) o.lat = -o.lat; if (o.rot != null) o.rot = -o.rot; } an[sw(j)] = o; }
  const ra = {}; for (const [j, v] of Object.entries(c.entry.rate || {})) { const o = { ...v }; if (["lumbar", "thoracic", "neck"].includes(j)) { if (o.lat != null) o.lat = -o.lat; if (o.rot != null) o.rot = -o.rot; } ra[sw(j)] = o; }
  const pw = c.entry.pelvisW || [0, 0, 0];
  m.entry = { ...c.entry, id: c.entry.id + "-mirror", anat: an, rate: ra, pelvis: { ...c.entry.pelvis, rollDeg: -(c.entry.pelvis.rollDeg || 0), yawDeg: -(c.entry.pelvis.yawDeg || 0) }, pelvisW: [pw[0], -pw[1], -pw[2]], vRoot: [-c.entry.vRoot[0], c.entry.vRoot[1], c.entry.vRoot[2]] };
  m.couple = (c.couple || []).map(cp => ({ ...cp, joint: sw(cp.joint), from: [sw(cp.from[0]), cp.from[1]] }));
  m.pelvis = negPlan(c.pelvis); m.vfPlan = { ...c.vfPlan, side: c.vfPlan.side === "L" ? "R" : "L", lateral: -(c.vfPlan.lateral || 0) };
  m.press = { ...c.press, side: c.press.side === "L" ? "R" : "L", pelvis: negPlan(c.press.pelvis) }; if (c.seat) m.seat = { ...c.seat, side: (c.seat.side || "L") === "L" ? "R" : "L", pelvis: negPlan(c.seat.pelvis) };
  m.ff = (c.ff || []).map(f => ({ ...f, chain: f.chain.map(sw) })); const a0 = c.authority; m.authority = a0 ? (t, jn) => a0(t, sw(jn)) : a0;
  return m; }
if (process.argv[1] && process.argv[1].endsWith("sp2_mirror.mjs")) { const phys = JSON.parse(fs.readFileSync(arg("params"))), v = +arg("speed", "5");
  const c0 = P.finalize(P.makeCand(phys, v, "SP2"), "A6"), c1 = mirror(c0); const o0 = await CL.auditRun(c0, { steps: 480 }), o1 = await CL.auditRun(c1, { steps: 480 });
  if (arg("out")) L.writeGz(arg("out"), o1);
  let dmax = 0, dEnd = 0; for (let k = 0; k < Math.min(o0.recs.length, o1.recs.length); k++) { const a = o0.recs[k].chars.tackler.com, b = o1.recs[k].chars.tackler.com, d = Math.hypot(a[0] + b[0], a[1] - b[1], a[2] - b[2]); dmax = Math.max(dmax, d); dEnd = d; }
  const first = (o) => { const f = {}; for (const r of o.recs) for (const c of r.contacts) if (c.kind.startsWith("turf") && c.Jn > 0) { const s = c.a === "turf" ? c.b : c.a; if (f[s[1]] == null) f[s[1]] = +r.t.toFixed(3); } return f; };
  const f0 = first(o0), f1 = first(o1); console.log("original", o0.finalHash, "mirrored", o1.finalHash, "| COM mirror deviation max", (1000 * dmax).toFixed(2), "mm, at end", (1000 * dEnd).toFixed(2), "mm");
  console.log("first contacts original:", JSON.stringify(f0)); console.log("first contacts mirrored (names swapped back):", JSON.stringify(Object.fromEntries(Object.entries(f1).map(([k, t]) => [sw(k), t])))); }
