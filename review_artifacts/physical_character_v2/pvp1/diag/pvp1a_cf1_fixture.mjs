// POST-HOC DIAGNOSTIC FIXTURE VARIANT "CF1" (NOT PVP-1A, NOT the DX entry): the frozen PVP1A_FIXTURE.json with ONLY the tackler's arms moved out of
// the body — shoulders abducted 50°, elbows flexed 15°, all other arm angles 0 (the frozen design held them at canonical, which put forearm_L 39.5 mm
// inside thigh_L). Trunk / pelvis / legs / velocities / runner / τ_act are unchanged; the fit gates stay FAILED (G-T1, G-T3: the leg fit is unchanged).
// Chosen once from the entry self-overlap cause (not from any outcome); not tuned. usage: node pvp1a_cf1_fixture.mjs <out.json>
import fs from "fs"; import path from "path";
const PL = await import(new URL("../scripts/pvp1a_lib.mjs", import.meta.url).href), { IL, V, Q } = PL;
const FIX = JSON.parse(fs.readFileSync(path.join(PL.RA, "pvp1/fixture/PVP1A_FIXTURE.json"))), sR = PL.SPEC_R(), sT = PL.SPEC_T(), B = sT.bodies;
const S = FIX.write.tackler.poses.map(s => ({ pos: s.pos.slice(), rot: s.rot.slice() })), ang = {};
for (const side of ["L", "R"]) for (const jn of ["shoulder_" + side, "elbow_" + side]) { const j = sT.joints.find(x => x.name === jn), keys = Object.keys(PL.anatomicalAngles(j, [0, 0, 0, 1], [0, 0, 0, 1])), a = {};
  for (const k of keys) a[k] = jn.startsWith("shoulder") && k === "abd" ? 50 : jn.startsWith("elbow") && k === "flex" ? 15 : 0; ang[jn] = a;
  const p = j.parentIndex, c = j.childIndex; S[c] = { pos: V.add(S[p].pos, Q.rot(S[p].rot, V.sub(B[c].origin, B[p].origin))), rot: PL.childRotation(j, S[p].rot, a) }; }
const dis = new Set(sT.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); let pair = null;
for (let i = 0; i < B.length && !pair; i++) for (let j = i + 1; j < B.length; j++) if (!dis.has(i + "-" + j) && IL.bodySepGeneric(sT, S, i, j).d <= 0) { pair = B[i].name + "↔" + B[j].name; break; }
const lo = PL.lowest(sT, S), cl = PL.crossClearance(sR, FIX.write.runner.poses, sT, S);
const out = JSON.parse(JSON.stringify(FIX));
out.fixture = "PVP1A_DX_CF1_FIXTURE (POST-HOC DIAGNOSTIC VARIANT — not PVP-1A, not the DX entry)"; out.status = "CF1_DIAGNOSTIC (" + FIX.status + "; gates unchanged)";
out.cf1 = { change: "tackler arms only", anglesDeg: ang, source: "PVP1A_FIXTURE.json (frozen-objective fit)", selfOverlapAfter: pair, lowestBody: B[lo.body].name, lowestMm: lo.y * 1000, crossClearanceMm: cl.d * 1000 };
out.tackler.self = { overlap: !!pair, pair }; out.tackler.anglesDeg = { ...FIX.tackler.anglesDeg, ...Object.fromEntries(Object.entries(ang)) };
out.write.tackler.poses = S;
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log("CF1 fixture: self-overlap", pair, "| lowest", B[lo.body].name, (lo.y * 1000).toFixed(2), "mm | clearance", (cl.d * 1000).toFixed(2), "mm");
