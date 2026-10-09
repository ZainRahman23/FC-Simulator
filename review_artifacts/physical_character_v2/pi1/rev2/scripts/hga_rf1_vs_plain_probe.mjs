// Diagnostic: whole-body COM velocity of the mapped presentation with and without RF-1 foot reconciliation (is the HG-A jitter from the presentation or from RF-1?)
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../hga_rf1_vs_plain_probe.mjs <airDir> <case> <row0> <row1>
process.env.V13_WT = "/Users/zainrahman/Downloads/FC Simulator worktrees/slide-contact-v1.3-charcollide";
const M = await import(process.cwd() + "/review_artifacts/physical_character_v2/pi1/rev1/scripts/pcg_rev1.mjs"); const { L, makeMapper } = M; const { V, Q, B, loadAir } = L;
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), Mt = B.reduce((s, b) => s + b.mass, 0), com = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt);
const [dir, cs, r0, r1] = process.argv.slice(2), R = loadAir(dir, `${cs}_LOCO.json.gz`);
for (const [nm, m] of [["RK+RF1", makeMapper(R, { knee: "RK", rf1: true })], ["RK only", makeMapper(R, { knee: "RK", rf1: false })]]) { const v = [];
  for (let k = +r0; k <= +r1; k++) { const c2 = com(m.poseAt(k).S), c1 = com(m.poseAt(k - 1).S), c0 = com(m.poseAt(k - 2).S); v.push(V.sub(V.sc(V.sub(c2, c1), 90), V.sc(V.sub(c1, c0), 30))[0]); }
  console.log(cs, nm, "COM vx(2nd) range", Math.min(...v).toFixed(2), Math.max(...v).toFixed(2)); }
