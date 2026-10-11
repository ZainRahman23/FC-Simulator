// CXA-1: rendered-skeleton vs physical-skeleton offset (read-only). For the runner (vinicius rig on the rig-derived R0 body) and the tackler (gabriel rig on
// the V1-matched body), the rendered bone origins from the render rule MC-1 §2(4) vs the V2 joint centres, plus segment lengths of each rig and body.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node cxa1_render_offset.mjs <record.json.gz>   (run from the worktree root)
import fs from "fs"; import zlib from "zlib";
const PL = await import(process.cwd() + "/review_artifacts/physical_character_v2/pvp1/scripts/pvp1a_lib.mjs"), { IL, MC, V, Q } = PL;
const MT = await import(process.cwd() + "/review_artifacts/physical_character_v2/abi1/scripts/abi1_metrics.mjs");
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[2]))), sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), mdT = MC.model(sT), { LOCO } = PL.records();
const LV = IL.loadLV2(), X = LV.X, OFFS = [50, 0, -34], toW = (p) => V.add(p, OFFS), INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([b, bone]) => [bone, b]));
const rig = (id) => { const SK = Object.assign({}, X.charSkel(id)); delete SK._r1body; return SK; }, SKR = rig("vinicius"), SKT = rig("gabriel");
const qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
function fkPos(SK, md, Sloc, q0) { const Sw = Sloc.map(s => ({ pos: toW(s.pos), rot: s.rot })), q = [], p = [], bi = md.bi, offHip = V.sc(V.add(SK.byName.thigh_L.off, SK.byName.thigh_R.off), 0.5);
  for (const b of SK.bones) { const i = b.idx, vb = INV[b.name]; if (!b.parent) { const pel = Sw[0].pos; q[i] = q0 ? q0[i] : [0, 0, 0, 1]; p[i] = [pel[0], 0, pel[2]]; continue; }
    q[i] = vb != null ? Q.norm(Q.mul(Sw[bi(vb)].rot, Q.conj(md.Z0[bi(vb)].rot))) : q0 ? Q.norm(Q.mul(q[b.parent.idx], Q.mul(Q.conj(q0[b.parent.idx]), q0[i]))) : q[b.parent.idx];
    p[i] = b.name === "pelvis" ? V.sub(V.add(Sw[0].pos, Q.rot(Sw[0].rot, V.sub(md.hipMid0, md.B[0].origin))), Q.rot(q[i], offHip)) : V.add(p[b.parent.idx], Q.rot(q[b.parent.idx], b.off)); } return p.map(x => V.sub(x, OFFS)); }
const jointAt = (spec, S, name) => { const j = spec.joints.find(x => x.name === name); return V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, spec.bodies[j.parentIndex].origin))); };
const PAIRS = [["thigh_R", "hip_R"], ["shin_R", "knee_R"], ["foot_R", "ankle_R"], ["thigh_L", "hip_L"], ["shin_L", "knee_L"], ["foot_L", "ankle_L"], ["upperArm_L", "shoulder_L"], ["foreArm_L", "elbow_L"]];
for (const n of [1, 30]) { const S = run.recs[n - 1].S, SR = S.slice(0, 14), ST = S.slice(14), pR = fkPos(SKR, mdR, SR, qRef), pT = fkPos(SKT, mdT, ST, null);
  console.log(`step ${n} rendered-bone origin vs V2 joint centre (mm): runner ` + PAIRS.map(([bone, jn]) => `${jn} ${(V.dist(pR[SKR.byName[bone].idx], jointAt(sR, SR, jn)) * 1000).toFixed(0)}`).join(" ") + ` | tackler ` + PAIRS.map(([bone, jn]) => `${jn} ${(V.dist(pT[SKT.byName[bone].idx], jointAt(sT, ST, jn)) * 1000).toFixed(0)}`).join(" ")); }
const segLen = (SK, a, b) => V.len(SK.byName[b].off) * 1000; console.log("rig thigh (hip→knee) / shank (knee→ankle) mm: vinicius", segLen(SKR, "thigh_R", "shin_R").toFixed(0), "/", segLen(SKR, "shin_R", "foot_R").toFixed(0), "| gabriel", segLen(SKT, "thigh_R", "shin_R").toFixed(0), segLen(SKT, "shin_R", "foot_R").toFixed(0));
const jl = (spec, a, b) => V.dist(spec.joints.find(j => j.name === a).at, spec.joints.find(j => j.name === b).at) * 1000; console.log("V2 thigh (hip→knee) R0", jl(sR, "hip_R", "knee_R").toFixed(0), "shank", jl(sR, "knee_R", "ankle_R").toFixed(0), "| V1-matched", jl(sT, "hip_R", "knee_R").toFixed(0), jl(sT, "knee_R", "ankle_R").toFixed(0));
