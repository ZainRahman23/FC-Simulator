// SLIDE-PHYS-1 VISUAL PREPARATION (presentation only: reads run records, writes clip data; nothing re-simulated, interpolated or amplified).
// Tackler drawn by TRC-1's MC-1P (gabriel on its actual V2 joints, trc1_retarget.posePhys); recipient (Stage 3 records) by MC-1 (vinicius,
// trc1_retarget.poseMC1), exactly as PVP-0. A rigid PRESENTATION placement (yaw about the vertical + offset) puts the local run on the pitch so the
// gameplay camera sees it across the screen; it is the same rigid transform for every body and every frame (no change of shape or timing).
// usage (worktree root): LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node .../sp_clip.mjs --run <rec.json.gz> --key <id> --out <dir> [--yaw 90] [--at 44,34] [--steps a-b]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const T = await import(new URL("../../trc1/scripts/trc1_retarget.mjs", import.meta.url).href), { PL, MC, V, Q } = T;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), key = arg("key"), OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const yaw = +arg("yaw", "90") * Math.PI / 180, at = arg("at", "44,34").split(",").map(Number), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
const offL = PL.pitchToLocal([at[0], at[1], 0]);                                         // placement origin (local frame)
const place = (s) => ({ pos: V.add(Q.rot(qy, s.pos), offL), rot: Q.norm(Q.mul(qy, s.rot)), com: V.add(Q.rot(qy, s.com || s.pos), offL) });
const sT = PL.SPEC_T(), nT = sT.bodies.length, SKT = T.rig("gabriel"), RT = T.buildPhys(SKT, sT), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5);
const two = run.recs[0].S.length > nT, sR = two ? PL.SPEC_R() : null, nR = two ? sR.bodies.length : 0, SKR = two ? T.rig("vinicius") : null, mdR = two ? MC.model(sR) : null;
const LOCO = two ? PL.records().LOCO : null, qRef = two ? SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)])) : null;
const pack = (P) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) });
const [s0, s1] = arg("steps", `0-${run.recs.length}`).split("-").map(Number), frames = [];
for (let n = s0; n <= Math.min(s1, run.recs.length); n++) { const r = run.recs[Math.max(0, n - 1)], S = (n === 0 && run.entryS ? run.entryS : r.S).map(place);
  const ST = S.slice(nR, nR + nT), SR = two ? S.slice(0, nR) : null, pel = T.toW(ST[0].pos), pitch = [pel[0], -pel[2]];
  const turf = (n >= 1 ? r.contacts : []).filter(c => c.kind.startsWith("turf")).map(c => { const side = c.a === "turf" ? c.b : c.a; return { who: side[0], body: side[1], pts: c.points.map(p => rv(T.toW(V.add(Q.rot(qy, p.p), offL)))), J: r5(c.Jn) }; });
  frames.push({ n, t: r5(n / 240), tackler: pack(T.posePhys(RT, ST)), runner: two ? pack(T.poseMC1(SKR, mdR, SR, qRef)) : null, pel: rv(pel), pitch: rv(pitch), turf, feetT: [rv(T.toW(ST[10].pos)), rv(T.toW(ST[13].pos))] }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} }; M0.runs[key] = { frames: frames.length, steps: [s0, s1], cand: run.cand, finalHash: run.finalHash, two, yawDeg: yaw * 180 / Math.PI, at };
fs.writeFileSync(mf, JSON.stringify(M0, null, 1)); console.log(key, frames.length, "frames", two ? "(two characters)" : "(tackler)");
