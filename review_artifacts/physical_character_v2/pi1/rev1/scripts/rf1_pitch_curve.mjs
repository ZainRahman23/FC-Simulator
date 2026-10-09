process.env.V13_WT = "/Users/zainrahman/Downloads/FC Simulator worktrees/slide-contact-v1.3-charcollide";
const M = await import(process.cwd() + "/review_artifacts/physical_character_v2/pi1/rev1/scripts/pcg_rev1.mjs");
const { loadAir, rawRotations, project, bodyLowest, B, bi, Q, relRot } = M; const [dir, cs, kk, sd] = process.argv.slice(2), R = loadAir(dir, `${cs}_LOCO.json.gz`), k = +kk;
const rr = rawRotations(R.bones, R.bind, R.pres[k].world, { rk: true }), P = project(rr.raw, R.pres[k].world, rr.idx), i = bi("foot_" + sd), axis = Q.rot(relRot(P.S, i), [1, 0, 0]);
const rotAxis = (a, t) => { const s = Math.sin(t / 2); return [a[0] * s, a[1] * s, a[2] * s, Math.cos(t / 2)]; };
const ank = M.L.spec.joints.find(j => j.name === "ankle_" + sd); console.log("ankle hard ROM", JSON.stringify(Object.fromEntries(Object.entries(ank.def.rom).map(([a, r]) => [a, r.hard]))));
for (const deg of [-40, -30, -20, -10, -5, 0, 5, 10, 20, 30, 40]) { const raw = rr.raw.slice(); raw[i] = Q.norm(Q.mul(rotAxis(axis, deg * Math.PI / 180), rr.raw[i])); const Pj = project(raw, R.pres[k].world, rr.idx);
  // unclamped: the foot pose without projection, for comparison
  const Su = Pj.S.slice(); Su[i] = { pos: Pj.S[i].pos, rot: raw[i] };
  console.log(`pitch ${String(deg).padStart(4)}° → lowest projected ${(bodyLowest(B[i], Pj.S[i]).y * 1000).toFixed(1).padStart(6)} mm (ankle clamp ${Pj.clamp["ankle_" + sd].toFixed(2)}°) | unclamped ${(bodyLowest(B[i], Su[i]).y * 1000).toFixed(1).padStart(6)} mm`); }
