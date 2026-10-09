// Diagnostic: per-row authoritative root velocity vs the mapped presentation's whole-body COM velocity (HG-A quantity), 1st/2nd-order, and pelvis velocity.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../hga_presentation_momentum_probe.mjs <airDir> <case> <row0> <row1>
process.env.V13_WT = "/Users/zainrahman/Downloads/FC Simulator worktrees/slide-contact-v1.3-charcollide";
const M = await import(process.cwd() + "/review_artifacts/physical_character_v2/pi1/rev1/scripts/pcg_rev1.mjs"); const { L, makeMapper, angVel } = M; const { V, Q, B, NB, loadAir } = L;
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), Mt = B.reduce((s, b) => s + b.mass, 0), com = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt);
const [dir, cs, r0, r1] = process.argv.slice(2), R = loadAir(dir, `${cs}_LOCO.json.gz`), m = makeMapper(R, { knee: "RK", rf1: true });
// presentation-material COM (rig bones carrying the V2 COM offsets) for comparison: use the unretargeted raw mapping (rf1 off, R-K off is the plain map)
const mPlain = makeMapper(R, { knee: "RK", rf1: false });
for (let k = +r0; k <= +r1; k++) { const c2 = com(m.poseAt(k).S), c1 = com(m.poseAt(k - 1).S), c0 = com(m.poseAt(k - 2).S), v1st = V.sc(V.sub(c2, c1), 60), v2nd = V.sub(V.sc(V.sub(c2, c1), 90), V.sc(V.sub(c1, c0), 30));
  const row = R.rows[k], va = [row[10], 0, -row[11]], pel = m.poseAt(k).S[0].pos, pelPrev = m.poseAt(k - 1).S[0].pos, vp = V.sc(V.sub(pel, pelPrev), 60);
  console.log(`row ${k} auth v ${va[0].toFixed(2)},${va[2].toFixed(2)} | COM v(2nd) ${v2nd[0].toFixed(2)},${v2nd[2].toFixed(2)} → HG-A ${Math.hypot(v2nd[0] - va[0], v2nd[2] - va[2]).toFixed(3)} m/s | COM v(1st) ${v1st[0].toFixed(2)} | pelvis v ${vp[0].toFixed(2)},${vp[2].toFixed(2)} | COM−root offset x ${(c2[0] - row[8]).toFixed(3)} m`); }
