// LC-8 (D1 part): the presentation copy of the law's leg / arm channels equals ofLocoCycle exactly, and the C1 channels equal the law outside
// ±h of every breakpoint / crossover; reports the max deviation inside the windows (deg) per speed.
const H = require("./pres_harness.cjs"), WT = process.argv[2], P = H.loadPres(WT, ["anim3d/of_loco_cont.js"]), g = P.g;
const skel = g("ofCharSkeleton")({ rig: JSON.parse(JSON.stringify(P.rig)), skel: null }), cyc = g("ofLocoCycle"), params = g("ofLocoParams");
const legLaw = g("ofContLegLaw"), armLaw = g("ofContArmLaw"), poseC1 = g("ofContPoseC1"), rateOf = g("ofContRate"), OFC = g("OF_CONT");
let worstCopy = 0; const out = {};
for (const v of [0.8, 1.45, 2.2, 3, 4.2, 5.5, 6.5, 7.5, 8.2, 9.5]) for (const rev of [false, true]) { const Pp = params(v), dir = rev ? -1 : 1, rate = rateOf(skel, Pp, v, { gaitPhase: 0 });
  let maxIn = 0, maxOutC1 = 0;
  for (let n = 0; n < 4000; n++) { const u = n / 4000, lp = cyc(skel, Pp, u, { lean: 3, turnRoll: 1, twist: 5, reverse: rev });
    const lR = legLaw(Pp, u, dir), lL = legLaw(Pp, u + 0.5, dir), ar = armLaw(Pp, u, dir);
    const law = [lp.thigh_R[0], lp.shin_R[0], lp.foot_R[0], lp.toe_R[0], lp.thigh_L[0], lp.shin_L[0], lp.foot_L[0], lp.toe_L[0], lp.foreArm_R[0], lp.foreArm_L[0], lp.clavicle_R[2], lp.clavicle_L[2]];
    const cp = lR.concat(lL, ar); for (let i = 0; i < law.length; i++) worstCopy = Math.max(worstCopy, Math.abs(law[i] - cp[i]));
    const c1 = poseC1(skel, Pp, u, { lean: 3, turnRoll: 1, twist: 5, reverse: rev }, rate), cc = [c1.thigh_R[0], c1.shin_R[0], c1.foot_R[0], c1.toe_R[0], c1.thigh_L[0], c1.shin_L[0], c1.foot_L[0], c1.toe_L[0], c1.foreArm_R[0], c1.foreArm_L[0], c1.clavicle_R[2], c1.clavicle_L[2]];
    let dev = 0; for (let i = 0; i < law.length; i++) dev = Math.max(dev, Math.abs(cc[i] - law[i]));
    maxIn = Math.max(maxIn, dev);
    // every other channel identical
    for (const k of Object.keys(lp)) { if (k[0] === "_" || k === "name" || /^(thigh|shin|foot|toe)_|^foreArm_|^clavicle_/.test(k)) continue; for (let i = 0; i < 3; i++) if (lp[k][i] !== c1[k][i]) throw new Error("channel " + k + " differs at u " + u); } }
  out[v + (rev ? "r" : "")] = { maxC1DevDeg: +maxIn.toFixed(3), hPhase: +(OFC.h * rate).toFixed(4) }; }
console.log("law copy vs ofLocoCycle: max |Δ| =", worstCopy, "deg"); console.log(JSON.stringify(out));
