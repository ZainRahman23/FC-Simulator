// PVP-0 retarget vertical audit (read-only): K's own (Gabriel) ankle / toe heights against the retargeted V2 tackler's ankle heights, frame by frame
// from K's start, with the recipient's standing V2 ankle height as the V2 on-turf reference. The retarget (pvp0_k.mjs) anchors V2's hip mid-point at
// Gabriel's thigh-head mid-point; V2's legs are 2 cm shorter and its ankle-to-sole offset differs, so V2's authored feet need not touch where K's do.
// usage (worktree root): node .../pvp0_kfoot.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, KM = await import(new URL("./pvp0_k.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const K = JSON.parse(fs.readFileSync(new URL("../source/slide_a1_K/K.json", import.meta.url))), B = KM.SPEC.bodies, J = KM.SPEC.joints, r3 = (x) => +x.toFixed(3);
const ankW = (pose, spec, j, fi) => V.add(pose[fi].pos, Q.rot(pose[fi].rot, V.sub(j.at, spec.bodies[fi].origin)));
const aL = J.find(j => j.name === "ankle_L"), aR = J.find(j => j.name === "ankle_R"), fL = B.findIndex(b => b.name === "foot_L"), fR = B.findIndex(b => b.name === "foot_R");
const FIX = JSON.parse(fs.readFileSync(new URL("ppr3/fixture/PPR3_STANDING_ENTRY.json", RA))), SRs = PL.SPEC_R(), rp = FIX.write.runner.poses, fLr = SRs.bodies.findIndex(b => b.name === "foot_L");
const len = (a, b) => V.len(V.sub(a, b)), jat = (n) => J.find(j => j.name === n).at, f0 = K.frames[0];
const out = { protocol: "PVP-0 retarget vertical audit", gabrielJointIdx: { hip_R: 15, ankle_R: 17, toe_R: 18, hip_L: 19, knee_L: 20, ankle_L: 21, toe_L: 22 },
  v2StandingAnkleY: r3(ankW(rp, SRs, SRs.joints.find(j => j.name === "ankle_L"), fLr)[1]), v2Thigh: r3(len(jat("hip_L"), jat("knee_L"))), v2Shank: r3(len(jat("knee_L"), jat("ankle_L"))),
  gabrielThigh: r3(len(f0.joints[19], f0.joints[20])), gabrielShin: r3(len(f0.joints[20], f0.joints[21])), frames: [] };
for (let fi = 0; fi < K.frames.length; fi += 6) { const f = K.frames[fi], p = KM.v2Pose(fi);
  out.frames.push({ t: r3(f.t), phase: f.phase, gabAnkle: [r3(f.joints[21][1]), r3(f.joints[17][1])], gabToe: [r3(f.joints[22][1]), r3(f.joints[18][1])], v2Ankle: [r3(ankW(p, KM.SPEC, aL, fL)[1]), r3(ankW(p, KM.SPEC, aR, fR)[1])], hipMidY: r3((f.joints[15][1] + f.joints[19][1]) / 2) }); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); const { frames, ...h } = out; console.log(JSON.stringify(h)); for (const x of frames.filter(x => x.t <= 0.8)) console.log(JSON.stringify(x));
