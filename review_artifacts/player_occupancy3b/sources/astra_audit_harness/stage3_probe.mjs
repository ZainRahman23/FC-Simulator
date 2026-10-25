// READ-ONLY audit harness, Stage 3 side: runs Stage 2 (as decided) and Stage 3 on the same encounters (unmodified code, imported from the
// worktree) and measures (1) leg overlap by Stage 1's mesh volumes AND by Astra's thinner capsule radii on the same joints, by pair class,
// (2) the forward lead Stage 3's impact adds over Stage 2 (Astra's forward-correction failure mode), (3) the impact impulses' forward share.
//   node stage3_probe.mjs [id,id,…] [--any]   (--any: also run Stage 3 with penMin 0 — "any touch" activation)
const S3 = "file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/player-occupancy-v1/sandbox/visual/";
const { ENV } = await import(S3 + "occupy1/tools/o_env.mjs");
const { MATRIX, O3CASES } = await import(S3 + "occupy3/o3_cases.js");
const { runO3 } = await import(S3 + "occupy3/o3_run.js");
await import(S3 + "occupy3/o3_world.js");
const { volumesOf, detect } = await import(S3 + "occupy1/o_volumes.js");
const DT = 1 / 240, hyp = Math.hypot;
const AST_R = { THIGH: 0.061, SHIN: 0.048, FOOT: 0.038 };   // Astra's leg capsule radii on a 176 cm body (astra_probe.mjs)
const astraVols = (J) => volumesOf(J).map((v) => { const k = v.id.replace(/_[RL]$/, ""); return AST_R[k] ? Object.assign({}, v, { r: AST_R[k] }) : v; });
const trunk = (id) => /^(PELVIS|WAIST|CHEST)$/.test(id), cls = (a, b) => { const x = a.slice(0, 5), y = b.slice(0, 5); if (trunk(a) && trunk(b)) return "torso"; if (x === "THIGH" && y === "THIGH") return "thighThigh"; if (x === "SHIN_" && y === "SHIN_") return "shinShin"; if (/^(THIGH|SHIN_)$/.test(x) && /^(THIGH|SHIN_)$/.test(y)) return "thighShin"; return "legTrunk"; };
function run(tc, mode, imp) { const R = runO3(ENV, tc, mode, { record: true, imp }), W = R.W, out = { mesh: {}, ast: {}, roots: new Map() };
  for (const [k, F] of W.frames) { if (k * DT < R.clip[0]) continue; out.roots.set(k, [F.a.P, F.d.P]);
    for (const [key, vf] of [["mesh", volumesOf], ["ast", astraVols]]) for (const x of detect(vf(F.a.J), vf(F.d.J), { within: 0 }).filter((q) => q.both)) { const c = cls(x.A, x.B); out[key][c] = Math.max(out[key][c] || 0, x.pen); } }
  out.W = W; out.t0 = R.t0; return out; }
const r1 = (v) => ((v || 0) * 100).toFixed(1), byId = (id) => MATRIX.find((x) => x.id === id && !x.matrixMirror) || O3CASES.find((x) => x.id === id);
const ids = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : ["walk-shoulder", "side", "overtake", "glance", "near-miss", "bf-shoulder", "oblique", "oblique-firm", "static-jog", "headon-jog", "cross", "croq-hip", "croq-leg", "croq-between", "bf-fake", "carry-walk", "in-croq"];
console.log("case | mode | MESH legs: thigh-thigh shin-shin thigh-shin leg-trunk · torso | ASTRA-RADII legs: thigh-thigh shin-shin thigh-shin | episodes · steps · falls | lead added vs S2D (cm, max |Δ| along the carrier's heading) · lateral | impulse ΣJ forward / lateral (N·s)");
for (const id of ids) { const tc = byId(id); if (!tc) { console.log(id, "— not found"); continue; } const base = run(tc, "S2D");
  for (const [mode, imp] of [["S2D", null], ["S3", undefined], ...(process.argv.includes("--any") ? [["S3 any", { penMin: 0 }]] : [])]) { const r = mode === "S2D" ? base : run(tc, "S3", imp), W = r.W;
    let lead = 0, latMax = 0, Jf = 0, Jl = 0, eps = 0, steps = 0, falls = 0; const own = [0, 0], ownMax = [0, 0], uMax = [0, 0], stepF = [0, 0];
    if (mode !== "S2D") { for (const [k, [a, d]] of r.roots) { const b = base.roots.get(k); if (!b) continue; const st = W.att.stateAt(k * DT), h = [Math.cos(st.psi), Math.sin(st.psi)], l = [-h[1], h[0]];
        const da = [a[0] - b[0][0], a[1] - b[0][1]], dd = [d[0] - b[1][0], d[1] - b[1][1]], dl = (da[0] - dd[0]) * h[0] + (da[1] - dd[1]) * h[1], dlat = (da[0] - dd[0]) * l[0] + (da[1] - dd[1]) * l[1];
        if (Math.abs(dl) > Math.abs(lead)) lead = dl; latMax = Math.max(latMax, Math.abs(dlat)); }
      for (const rec of W.imp.log) { const st = W.att.stateAt(rec.t), h = [Math.cos(st.psi), Math.sin(st.psi)];
        if (rec.imp) { const n = rec.imp.n, j = rec.imp.j; Jf += Math.abs(j * (n[0] * h[0] + n[1] * h[1])); Jl += Math.abs(j * (-n[0] * h[1] + n[1] * h[0])); }
        (rec.p || []).forEach((q, i) => { if (!q || !q.root) return; own[i] += q.root[0] * h[0] + q.root[1] * h[1]; ownMax[i] = Math.max(ownMax[i], Math.abs(own[i])); if (q.u) uMax[i] = Math.max(uMax[i], Math.abs(q.u[0] * h[0] + q.u[1] * h[1])); }); }
      for (const ep of W.imp.episodes) for (const [pid, q] of Object.entries(ep.players || {})) { const i = pid === "ATT" ? 0 : 1; for (const x of q.steps || []) stepF[i] = Math.max(stepF[i], x.d); }
      const E = W.imp.episodes; eps = E.length; for (const ep of E) for (const q of Object.values(ep.players || {})) { steps += q.steps.length; if (q.fall) falls++; } }
    console.log(`${id.padEnd(14)} ${mode.padEnd(6)} | ${r1(r.mesh.thighThigh)} ${r1(r.mesh.shinShin)} ${r1(r.mesh.thighShin)} ${r1(r.mesh.legTrunk)} · ${r1(r.mesh.torso)} | ${r1(r.ast.thighThigh)} ${r1(r.ast.shinShin)} ${r1(r.ast.thighShin)} | ${mode === "S2D" ? "—" : `${eps} · ${steps} · ${falls}`} | ${mode === "S2D" ? "—" : `${r1(lead)} · ${r1(latMax)}`} | ${mode === "S2D" ? "—" : `${Jf.toFixed(1)} / ${Jl.toFixed(1)}`} | ${mode === "S2D" ? "" : `IMPACT'S OWN root shift along heading ATT ${r1(own[0])} DEF ${r1(own[1])} (lead ${r1(own[0] - own[1])}, max |·| ${r1(ownMax[0])}/${r1(ownMax[1])}) · peak |u·h| ${uMax.map((v) => v.toFixed(2)).join("/")} m/s`}`); } }
