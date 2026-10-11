// PPR-3 VISUAL PREPARATION (presentation only; reads PPR-3 run records, writes clip data; nothing re-simulated, interpolated or amplified).
// Same runner rendering as TRC-1 / PPR-1 / PPR-2 (ppr1/render/ppr1_clip_prep.mjs): runner R0 ← vinicius by MC-1 §2(4) (exact for R0), the actual V2
// collider silhouettes, the V2 skeleton, the COM and its ground projection, turf contact points and per-foot ground reaction; added: the support
// polygon (convex hull of the loaded turf contacts) and the controller state labels. Runner alone (SOLO). The camera target is FIXED at the entry
// pelvis (the camera does not follow sway; PVP's authoritative clock is not used).
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node ppr3_clip_prep.mjs --key <id> --run <run.json.gz> --fixture <entry.json> [--steps a-b] [--t0step n] --out <dir>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const T = await import(new URL("../../trc1/scripts/trc1_retarget.mjs", import.meta.url).href), { PL, MC, V, Q } = T;
const GM = await import(new URL("../../cxa1/scripts/cxa1_geom.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const key = arg("key"), run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), FIX = JSON.parse(fs.readFileSync(arg("fixture"))), OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const [s0, s1] = arg("steps", "0-" + run.recs.length).split("-").map(Number), t0step = arg("t0step") != null ? +arg("t0step") : null;
const sR = PL.SPEC_R(), mdR = MC.model(sR), nR = sR.bodies.length, { LOCO } = PL.records(), MR = sR.bodies.reduce((s, b) => s + b.mass, 0);
const SKR = T.rig("vinicius"), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5), toW = T.toW;
const qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
const pack = (P) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) });
const E0 = FIX.write.runner.poses, pw = toW(E0[0].pos), AUTH = { runner: [pw[0], -pw[2]], tackler: [pw[0] + 50, -pw[2]] }, camL = [pw[0] - 50, 30, pw[2] + 34];
function silhouettes(W, cam, who) { return W.map(sh => { const c = sh.bc, vd = V.norm(V.sub(c, cam)), a = Math.abs(vd[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(vd, a)), w = V.cross(vd, u), pts = [];
  for (let k = 0; k < 48; k++) { const t = k * Math.PI / 24; pts.push(rv(toW(sh.sup(V.add(V.sc(u, Math.cos(t)), V.sc(w, Math.sin(t))))))); } return { who, body: sh.name, pts, depth: V.dist(c, cam) }; }); }
const skel = (S) => sR.joints.map(j => [toW(V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, sR.bodies[j.parentIndex].origin)))), toW(S[j.childIndex].com)].map(rv));
const entryS = () => E0.map((p, i) => ({ pos: p.pos, rot: p.rot, com: V.add(p.pos, Q.rot(p.rot, sR.bodies[i].comLocal)) }));
const hull2 = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (pts.length < 3) return pts; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
const frames = [];
for (let n = s0; n <= Math.min(s1, run.recs.length); n++) { const S = n === 0 ? entryS() : run.recs[n - 1].S, SR = S.slice(0, nR), rec = n >= 1 ? run.recs[n - 1] : null;
  const turf = rec ? rec.contacts.filter(c => c.kind === "turf-runner").flatMap(c => c.points.filter(p => p.lam > 0).map(p => ({ p: rv(toW(p.p)), F: r5(p.lam * 240) }))) : [];
  const allPts = rec ? rec.contacts.filter(c => c.kind === "turf-runner").flatMap(c => c.points.filter(p => p.lam > 0 || p.depth >= -0.002).map(p => toW([p.p[0], 0, p.p[2]]))) : [];
  const sup = hull2(allPts.map(p => [p[0], p[2]])).map(q => rv([q[0], 0.003, q[1]]));
  const com = V.sc(SR.reduce((s, b, i) => V.add(s, V.sc(b.com, sR.bodies[i].mass)), [0, 0, 0]), 1 / MR);
  frames.push({ n, tauMs: r5(n * 1000 / 240), tContactMs: t0step != null ? r5((n - t0step) * 1000 / 240) : null, phase: "phys", auth: AUTH, runner: pack(T.poseMC1(SKR, mdR, SR, qRef)), tackler: null,
    shapes: silhouettes(GM.worldShapes(sR, SR), camL, "R").sort((a, b) => b.depth - a.depth), cross: [], turf, support: sup, feetN: rec ? [r5(rec.chars.runner.feet.L * 240), r5(rec.chars.runner.feet.R * 240)] : null,
    skelR: skel(SR), skelT: null, com: rv(toW(com)), feetRT: [rv(toW(SR[13].pos)), rv(toW(SR[10].pos))], imp: null }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} };
M0.runs[key] = { frames: frames.length, firstContact: t0step, finalHash: run.finalHash, law: run.job.law, steps: [s0, s1] }; fs.writeFileSync(mf, JSON.stringify(M0, null, 1));
console.log(key, frames.length, "frames; t0", t0step, "law", run.job.law);
