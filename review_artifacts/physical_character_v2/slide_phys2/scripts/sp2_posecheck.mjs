// SLIDE-PHYS-2 pose check (kinematic, no simulation): V2 FK of an entry / posture spec placed as buildEntry places it (lowest point 0.5 mm above the
// turf); prints every body's lowest point, the key joint heights, the tackling boot's clearance and sole orientation, and the COM.
// usage (worktree root): node sp2_posecheck.mjs --fx <fixture> [--t <s> : the posture of the fixture's choreography at t, on the entry pelvis]
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), EN = await import(S1 + "sp_entry.mjs"), C = await import(S1 + "sp_chor.mjs");
const FX = await import(new URL("./sp2_fixtures_def.mjs", import.meta.url).href), { V, Q, B, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, fx = FX.FIXTURES[arg("fx")], r3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
let anat = fx.entry.anat; if (arg("t")) anat = C.compile({ name: "x", tracks: fx.tracks }).anatAt(+arg("t"));
const E = EN.buildEntry({ ...fx.entry, anat, rate: {}, vRoot: [0, 0, 0] }), P = E.pose, K = L.skel(P);
console.log("COM", E.com.map(r3).join(","), "lowest body", E.lowestBody, "| pelvis y", r3(P[0].pos[1]));
console.log("bodies lowest y:", B.map((b, i) => `${b.name}:${r3(L.PL.bodyLowest(b, P[i]).y)}`).join(" "));
console.log("joints y:", ["hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R", "shoulder_L", "elbow_L", "hand_L"].map(k => `${k}:${r3(K[k][1])}`).join(" "));
const f = P[bi("foot_R")]; console.log("tackling boot: lowest", r3(L.PL.bodyLowest(B[bi("foot_R")], f).y), "sole-down cos", r3(-Q.rot(f.rot, [0, -1, 0])[1]), "toe z", r3(K.toe_R[2]), "heel y", r3(K.heel_R[1]), "toe y", r3(K.toe_R[1]));
console.log("x/z of: knee_L", K.knee_L.map(r3).join(","), "ankle_L", K.ankle_L.map(r3).join(","), "knee_R", K.knee_R.map(r3).join(","), "ankle_R", K.ankle_R.map(r3).join(","), "hip_L", K.hip_L.map(r3).join(","));
