// PPR-1 VISUAL PREPARATION (presentation only; reads PPR-1 run records, writes clip data; nothing re-simulated, interpolated or amplified).
// Same rendering as TRC-1 (trc1/render/trc1_clip_prep.mjs): runner R0 ← vinicius by MC-1 §2(4) (exact for R0), tackler ← gabriel by MC-1P (on its V2
// joints), the actual V2 collider silhouettes, the Jolt cross contacts solved from each configuration. Added for PPR-1: the overlay data — both
// skeletons (V2 joint centres), the runner's COM, its turf contact points and per-foot ground-reaction force, and the time after first contact.
// Lead-in (optional, as every earlier review): runner = frozen LOCO presentation; tackler = activation pose carried by the authoritative BODY
// displacement (labelled constructed).
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node ppr1_clip_prep.mjs --key <id> --run <ppr1 run.json.gz> --fixture <fix.json> [--steps 0-31] [--lead 1] --out <dir>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const T = await import(new URL("../../trc1/scripts/trc1_retarget.mjs", import.meta.url).href), { PL, MC, V, Q } = T;
const GM = await import(new URL("../../cxa1/scripts/cxa1_geom.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const key = arg("key"), run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), FIX = JSON.parse(fs.readFileSync(arg("fixture"))), [s0, s1] = arg("steps", "0-31").split("-").map(Number);
const withLead = arg("lead", "0") === "1", OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), nR = sR.bodies.length, { OFF, LOCO } = PL.records(), X = T.LV().X, M4 = X.M4, MR = sR.bodies.reduce((s, b) => s + b.mass, 0);
const SKR = T.rig("vinicius"), SKT = T.rig("gabriel"), RT = T.buildPhys(SKT, sT), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5), toW = T.toW;
const qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
const pack = (P) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) });
const authAt = (tau) => { const [r, s] = PL.rowSlot(tau), body = OFF.prims[r][s].find(p => p.prim === "BODY"); return { runner: [OFF.rows[r][8], OFF.rows[r][9]], tackler: [(body.a[0] + body.b[0]) / 2, (body.a[1] + body.b[1]) / 2] }; };
function presFrame(row) { const W = LOCO.pres[row].world, skin = [], joint = [], tip = []; SKR.bones.forEach((b, i) => { const m = W[LOCO.bones.findIndex(x => x.name === b.name)]; skin.push(...Array.from(M4.mul(m, SKR.invBind[i]))); joint.push(rv([m[12], m[13], m[14]])); tip.push(rv(Array.from(M4.transformPoint(m, X.V3.scale(b.dir, b.len))))); }); return { skin: skin.map(r5), joint, tip }; }
function silhouettes(W, camL, who) { return W.map(sh => { const c = sh.bc, vd = V.norm(V.sub(c, camL)), a = Math.abs(vd[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(vd, a)), w = V.cross(vd, u), pts = [];
  for (let k = 0; k < 48; k++) { const t = k * Math.PI / 24; pts.push(rv(toW(sh.sup(V.add(V.sc(u, Math.cos(t)), V.sc(w, Math.sin(t))))))); } return { who, body: sh.name, pts, depth: V.dist(c, camL) }; }); }
// V2 skeleton (joint centres from the parent body) for the overlay
const skel = (spec, S) => spec.joints.map(j => [toW(V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, spec.bodies[j.parentIndex].origin)))), toW(S[j.childIndex].com)].map(rv));
const entryS = () => { const mk = (spec, w) => w.poses.map((p, i) => ({ pos: p.pos, rot: p.rot, com: V.add(p.pos, Q.rot(p.rot, spec.bodies[i].comLocal)), v: w.vel[i].v, w: w.vel[i].w })); return [...mk(sR, FIX.write.runner), ...mk(sT, FIX.write.tackler)]; };
// time origin: the first impulse-carrying cross contact (N2); --t0step forces it (C0: the N2 contact step, so both share one clock); SOLO with an
// impactor: the first step whose record carries an impactor contact
const fcCross = run.recs.find(r => r.contacts.some(c => c.kind === "cross" && V.len(c.J2) >= 1e-3)), fcImp = run.recs.find(r => r.chars.runner.ext && r.chars.runner.ext.imp && r.chars.runner.ext.imp.pts.length);
const t0step = arg("t0step") ? +arg("t0step") : fcCross ? fcCross.n : fcImp ? fcImp.n : null, fc = t0step != null ? { n: t0step } : null, tAfter = (n) => (fc ? (n - (fc.n - 1)) * 1000 / 240 : null);
const frames = [];
if (withLead) { const bodyMid = (tau) => { const g = PL.primsAt(OFF, tau).find(p => p.prim === "BODY"); return V.lerp(g.a, g.b, 0.5); }, mid0 = bodyMid(FIX.tauAct);
  for (let k = 0; k < 60; k++) { const tau = FIX.tauAct - 15 + k / 4, row = Math.floor(tau - 1 + 1e-9), d = V.sub(bodyMid(tau), mid0), ST = FIX.write.tackler.poses.map(s => ({ pos: V.add(s.pos, d), rot: s.rot }));
    frames.push({ k, tau, tauMs: r5((tau - FIX.tauAct) * 1000 / 60), phase: "lead", n: null, auth: authAt(tau), runner: presFrame(Math.min(50, row)), tackler: pack(T.posePhys(RT, ST)) }); } }
const solo = run.job.scene === "SOLO", tPose = FIX.write.tackler.poses.map((p, i) => ({ pos: p.pos, rot: p.rot, com: V.add(p.pos, Q.rot(p.rot, sT.bodies[i].comLocal)) }));   // SOLO: no tackler exists (a placeholder pose is packed, never drawn)
for (let n = s0; n <= Math.min(s1, run.recs.length); n++) { const S = n === 0 ? entryS() : run.recs[n - 1].S, SR = S.slice(0, nR), ST = solo ? tPose : S.slice(nR), tau = FIX.tauAct + n / 4, auth = authAt(tau), simX = (auth.runner[0] + auth.tackler[0]) / 2, camL = [simX - 50, 30, -111 + 34];
  const WR = GM.worldShapes(sR, SR), WT = solo ? [] : GM.worldShapes(sT, ST), rec = n >= 1 ? run.recs[n - 1] : null, next = n >= 1 ? run.recs[n] || null : run.recs[0];
  const cross = next ? next.contacts.filter(c => c.kind === "cross" && c.points.length).map(c => ({ pts: c.points.map(p => ({ p: rv(toW(p.p)), lam: r5(p.lam) })), n: rv(c.n), J: r5(V.len(c.J2)) })) : [];
  const turf = rec ? rec.contacts.filter(c => c.kind === "turf-runner").flatMap(c => c.points.filter(p => p.lam > 0).map(p => ({ p: rv(toW(p.p)), F: r5(p.lam * 240) }))) : [];
  const com = V.sc(SR.reduce((s, b, i) => V.add(s, V.sc(b.com, sR.bodies[i].mass)), [0, 0, 0]), 1 / MR);
  frames.push({ n, tau, tauMs: r5(n * 1000 / 240), tContactMs: tAfter(n) != null ? r5(tAfter(n)) : null, phase: "phys", auth, runner: pack(T.poseMC1(SKR, mdR, SR, qRef)), tackler: pack(T.posePhys(RT, ST)),
    shapes: [...silhouettes(WR, camL, "R"), ...silhouettes(WT, camL, "T")].sort((a, b) => b.depth - a.depth), cross, turf, feetN: rec ? [r5(rec.chars.runner.feet.L * 240), r5(rec.chars.runner.feet.R * 240)] : null,
    skelR: skel(sR, SR), skelT: solo ? null : skel(sT, ST), com: rv(toW(com)), feetRT: solo ? [rv(toW(SR[13].pos)), rv(toW(SR[12].com))] : [rv(toW(SR[13].pos)), rv(toW(ST[10].pos))],
    imp: run.job.impactor ? { c: rv(toW(n === 0 ? run.job.impactor.centre : rec.imp ? rec.imp.com : run.job.impactor.centre)), r: run.job.impactor.r } : null }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} };
M0.runs[key] = { frames: frames.length, firstContact: fc ? fc.n : null, finalHash: run.finalHash, law: run.job.law, scene: run.job.scene, lead: withLead, steps: [s0, s1] }; fs.writeFileSync(mf, JSON.stringify(M0, null, 1));
console.log(key, frames.length, "frames; first contact", fc ? fc.n : "none", "law", run.job.law);
