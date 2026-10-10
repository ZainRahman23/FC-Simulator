// Pipeline validation for lv2_vs_sim_probe.mjs (read-only): on two V1.3 AIR LOCO records (5042230), (1) the simulation body recomputed from the
// record's own row state (SIMV.body, dt 0) must equal the recorded simBody[k][3] segments, and (2) the frozen CG-4 measure on the V1.3 presentation
// must reproduce the moving-handoff investigation's legs-vs-simulation values (pres_sources.json p50: rx_sprint 22.2 mm, rx_miss 91.9 mm over its
// own frame window; this script uses rows 40–99).
// usage (cwd = worktree root): V13_WT=<5042230 archive> node .../legvssim_sanity.mjs <air_v13 records dir>
const M = await import(process.cwd() + "/review_artifacts/physical_character_v2/pi1/rev1/scripts/pcg_rev1.mjs"), M0 = await import(process.cwd() + "/review_artifacts/physical_character_v2/pi1/trackB/scripts/pcg_f0.mjs");
const { L, makeMapper } = M, { SIMV } = M0, { V, Q, B, bi, loadAir } = L;
const sim2r = (p) => [p[0], p[2], -p[1]], hl = (v) => Math.hypot(v[0], v[2]), comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), SEGB = { thigh: "thigh", shin: "shank", foot: "foot" };
const legVsSim = (S, segs) => { let mx = 0; for (const g of segs) { const bn = SEGB[g.seg]; if (!bn || !g.sd || g.name.startsWith("toe")) continue; const i = bi(bn + "_" + g.sd), a2 = sim2r(g.a), b2 = sim2r(g.b), p = comW(S, i), ab = V.sub(b2, a2), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a2), ab) / V.dot(ab, ab))); mx = Math.max(mx, hl(V.sub(p, V.add(a2, V.sc(ab, t))))); } return mx; };
for (const cs of ["rx_sprint", "rx_miss"]) { const R = loadAir(process.argv[2], cs + "_LOCO.json.gz"), mp = makeMapper(R, { knee: "RK", rf1: true }); let segErr = 0; const dRec = [], dMine = [];
  for (let k = 40; k < 100; k++) { const w = R.rows[k], Bd = SIMV.body({ char: "vinicius", p: { x: w[8], y: w[9], vx: w[10], vy: w[11], facing: w[12], gaitPhase: w[13], legLen: R.legLen[0] } }, 0, SIMV.footLenV12), mine = SIMV.segs(Bd), rec = R.simBody[k][3].segs;
    for (const g of mine) { const h = rec.find(x => x.name === g.name); if (h) for (const e of ["a", "b"]) segErr = Math.max(segErr, Math.hypot(...[0, 1, 2].map(i => g[e][i] - h[e][i]))); }
    const S = mp.poseAt(k).S; dRec.push(legVsSim(S, rec)); dMine.push(legVsSim(S, mine)); }
  const p50 = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(cs, "legLen", R.legLen[0], "| my simBody(row, dt 0) vs recorded simBody[k][3] max seg endpoint diff", segErr.toFixed(4), "m | V1.3 presentation legs vs recorded segs p50", (p50(dRec) * 1000).toFixed(1), "mm; vs my recomputed segs p50", (p50(dMine) * 1000).toFixed(1), "mm"); }
