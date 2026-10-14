const B = "file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v2/review_artifacts/physical_character_v2/slide_phys2/scripts/";
const FX = await import(B + "sp2_fixture.mjs"), D = await import(B + "sp2_fixtures_def.mjs"), M = await import(B + "sp2_measures.mjs");
const hold = (anat) => Object.fromEntries(Object.entries(anat).flatMap(([j, v]) => Object.entries(v).map(([k, x]) => [`${j}.${k}`, [[0, x], [2, x]]])));
const base = D.F3.entry.anat;
for (const pp of [-15, -25, -35]) for (const lf of [-14, -25]) for (const post of [0, 1]) {
  const anat = JSON.parse(JSON.stringify(base)); anat.lumbar.flex = lf; if (post) { anat.shoulder_L = { flex: -60, abd: 45 }; anat.elbow_L = { flex: 5 }; }
  const fx = { ...D.F3, id: `F3_p${pp}_l${lf}_post${post}`, entry: { ...D.F3.entry, pelvis: { ...D.F3.entry.pelvis, pitchDeg: pp }, anat }, tracks: hold(anat) };
  const o = await FX.runFixture(fx, { steps: 300 }); const m = M.measure(o);
  console.log(fx.id.padEnd(22), "belly", m.posture.minBellyY, "head", m.posture.headTurfT, "slide", m.slideDistM, "decel", m.meanDecel, "bootCF", m.tacklingBoot.contactFracDuringGlide, "bootJ", m.tacklingBoot.JnNs, "| seq", m.sequence.slice(0, 5).map(x => x.join("@")).join(" "), "| reclAtStop", m.posture.reclAtStop); }
