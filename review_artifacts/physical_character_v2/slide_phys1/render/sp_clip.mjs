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
// optional INTENT ghost (--intent <params.json> --speed v): the controller's target pose at each step (choreography tracks + the knee coupling
// evaluated on the recorded hip angle) by V2 forward kinematics on the RECORDED pelvis pose — what was authored / commanded, not simulated
// optional diagnostic HUD (--hud 1): COM horizontal / vertical speed and the turf-contact REGIONS of the tackler this step (SLIDE-PHYS-2 regions)
const HUD = arg("hud") ? await import(new URL("../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href) : null, rule = run.contactRule || run.soleRule || null;
let INT = null; if (arg("intent")) { const SL = new URL("../scripts/", import.meta.url).href, P = await import(SL + "sp_param.mjs"), C = await import(SL + "sp_chor.mjs"), L = await import(SL + "sp_lib.mjs");
  const cand = P.makeCand(P.toPhys(JSON.parse(fs.readFileSync(arg("intent")))), +arg("speed", "5"), "intent"), ch = C.compile(cand.chor), cp = cand.couple && cand.couple[0];
  INT = (S, t) => { const an = ch.anatAt(t); if (cp && t >= cp.window[0] && t <= cp.window[1]) { const x = L.anatOf(S).hip_R.flex, m = cp.map; let y = x <= m[0][0] ? m[0][1] : x >= m[m.length - 1][0] ? m[m.length - 1][1] : null;
      if (y == null) { let i = 0; while (x > m[i + 1][0]) i++; y = m[i][1] + (x - m[i][0]) / (m[i + 1][0] - m[i][0]) * (m[i + 1][1] - m[i][1]); } an.knee_R = { ...(an.knee_R || {}), flex: y }; }
    return L.fk({ pos: S[0].pos, rot: S[0].rot }, an); }; }
// SP2A options (inert when absent): --wire 1 adds the tackler's collision-shape wireframe + joint skeleton (render/sp_wire.mjs); --prefix 1 prepends
// the record's kinematic RUN-1 run-in (run.runIn, negative steps: the animation before the commitment touchdown); --intent2a '<opts json>'
// --runin <file> adds the SP2A AUTHORED intent skeleton (its choreography + knee coupling on the recorded hip angle, V2 FK on the recorded pelvis)
const WIRE = arg("wire") ? await import(new URL("./sp_wire.mjs", import.meta.url).href) : null, r4 = (x) => Math.round(x * 1e4) / 1e4, toWp = (p) => T.toW(p).map(r4);   // states passed in are already placed
const wireF = (S) => WIRE ? { wire: WIRE.wireOf(S).map(pl => pl.map(toWp)), skel: WIRE.skelOf(S).map(sg => sg.map(toWp)) } : {};
let INT2 = null; if (arg("intent2a")) { const AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href), C = await import(new URL("../scripts/sp_chor.mjs", import.meta.url).href), L = await import(new URL("../scripts/sp_lib.mjs", import.meta.url).href);
  const O2 = JSON.parse(arg("intent2a")), FL = O2.mode === "flight" ? await import(new URL("../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href) : null;
  const RI = AA.loadRunIn(arg("runin"), arg("td") ? +arg("td") : null, FL ? 0.9 : 0.66, FL ? 0 : (O2.takeover ?? -0.075)), cand = FL ? FL.tackleCand(+(RI.d.speed * AA.LEGR).toFixed(3), O2) : AA.makeSP2A(RI, O2), ch = C.compile(cand.chor), cps = cand.couple || [];
  // (controller clock = sim time + tOffset)
  INT2 = (S, ts) => { const t = ts + (cand.tOffset || 0), an = ch.anatAt(t + (cand.lead || 0)), act = L.anatOf(S); for (const cp of cps) { if (t < cp.window[0] || t > cp.window[1]) continue; const x = act[cp.from[0]][cp.from[1]], m = cp.map; let y = x <= m[0][0] ? m[0][1] : x >= m[m.length - 1][0] ? m[m.length - 1][1] : null;
      if (y == null) { let i = 0; while (x > m[i + 1][0]) i++; y = m[i][1] + (x - m[i][0]) / (m[i + 1][0] - m[i][0]) * (m[i + 1][1] - m[i][1]); } an[cp.joint] = { ...(an[cp.joint] || {}), [cp.key]: y }; }
    return L.fk({ pos: S[0].pos, rot: S[0].rot }, an); }; }
// SP2A body-friction sweep (opt-in --fsweep 1): per-frame diagnostic data — COM (viewer world), v_h, cumulative horizontal COM path since the first
// non-boot turf contact, the run's non-stud friction multiplier, and every tackler turf contact with its region, normal force, friction force
// (N, from the recorded impulses / step) and, for boots, TCF-1's sole weight k (1 = legitimate stud engagement)
const FSW = arg("fsweep") ? { RG: await import(new URL("../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), FC: await import(new URL("../../sp2a/fsweep/scripts/fs_contact.mjs", import.meta.url).href), L: await import(new URL("../scripts/sp_lib.mjs", import.meta.url).href) } : null;
let fsDist = 0, fsEntered = false, fsPrev = null; const fsM = run.fsweep ? run.fsweep.m : null;
const fsDiag = (n) => { if (!FSW || n < 1) return null; const { RG, FC, L } = FSW, k = n - 1, r = run.recs[k], Spre = (k > 0 ? run.recs[k - 1] : r).S, S = r.S.slice(nR, nR + nT), c = L.comOf(S), P = r.chars.tackler.P, vh = Math.hypot(P[0], P[2]) / L.M, h = 1 / 240;
  const cs = RG.turfContacts(r, Spre, "tackler", nR, null).filter(x => x.Jn > 0 || Math.hypot(x.J[0], x.J[2]) > 1e-6);
  if (!fsEntered && cs.some(x => !x.body.startsWith("foot") && x.Jn > 0)) { fsEntered = true; fsDiag.entry = c; }
  if (fsEntered && fsPrev) fsDist += Math.hypot(c[0] - fsPrev[0], c[2] - fsPrev[2]); fsPrev = c;
  const W = (p) => T.toW(V.add(Q.rot(qy, p), offL)).map(r4), Wv = (v) => Q.rot(qy, v).map(r4);
  return { m: fsM, com: W(c), vh: r4(vh), dist: r4(fsDist), entry: fsDiag.entry ? W([fsDiag.entry[0], 0, fsDiag.entry[2]]) : null, dir: Wv([P[0] / (Math.hypot(P[0], P[2]) || 1), 0, P[2] / (Math.hypot(P[0], P[2]) || 1)]),
    cs: cs.map(x => ({ reg: x.region, p: W(x.p), N: r4(x.Jn / h), F: Wv([x.J[0] / h, 0, x.J[2] / h]), k: x.body.startsWith("foot") ? r4(FC.soleK(Spre[nR + L.bi(x.body)].rot)) : null })) }; };
const [s0, s1] = arg("steps", `0-${run.recs.length}`).split("-").map(Number), frames = [], T0 = +arg("t0", "0");   // t0: clock origin step (Stage 3: the activation step)
if (arg("prefix") && run.runIn) for (const f of run.runIn) { const n = Math.round(f.t * 240), S = f.S.map(place), ST = S.slice(0, nT), pel = T.toW(ST[0].pos);
  frames.push({ n, t: r5(n / 240), obst: null, hud: { kin: true, stance: f.stance, phase: f.phase || "run" }, tackler: pack(T.posePhys(RT, ST)), intent: null, runner: null, pel: rv(pel), pitch: rv([pel[0], -pel[2]]), turf: [], feetT: [rv(T.toW(ST[10].pos)), rv(T.toW(ST[13].pos))], ...wireF(ST) }); }
for (let n = s0; n <= Math.min(s1, run.recs.length); n++) { const r = run.recs[Math.max(0, n - 1)], S = (n === 0 && run.entryS ? run.entryS : r.S).map(place);
  const ST = S.slice(nR, nR + nT), SR = two ? S.slice(0, nR) : null, pel = T.toW(ST[0].pos), pitch = [pel[0], -pel[2]];
  const turf = (n >= 1 ? r.contacts : []).filter(c => c.kind.startsWith("turf")).map(c => { const side = c.a === "turf" ? c.b : c.a; return { who: side[0], body: side[1], pts: c.points.map(p => rv(T.toW(V.add(Q.rot(qy, p.p), offL)))), J: r5(c.Jn) }; });
  const intent = INT ? pack(T.posePhys(RT, INT(r.S.slice(nR, nR + nT), n / 240).map(place))) : null;
  // obstacles (Stage 2 records): the 8 box corners from the recorded obstacle state, same placement
  const obst = run.obstacles && r.obstState ? r.obstState.map((s, k) => { const he = run.obstacles[k].he; if (!he) return null; const c = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const d of [-1, 1]) c.push(rv(T.toW(V.add(Q.rot(qy, V.add(s.com, Q.rot(s.rot, [a * he[0], b * he[1], d * he[2]]))), offL)))); return { c, dyn: run.obstacles[k].mass > 0 }; }).filter(Boolean) : null;
  let hud = null; if (HUD && n >= 1) { const c = r.chars.tackler, M = 78.9, P = c.P, vh = Math.hypot(P[0], P[2]) / M, vy = P[1] / M, cs = HUD.turfContacts(r, (run.recs[Math.max(0, n - 2)] || r).S, "tackler", nR, rule);
    const g = {}; for (const x of cs) if (x.Jn > 0) g[x.region] = (g[x.region] || 0) + x.Jn * 240 / (M * 9.81); hud = { vh: r5(vh), vy: r5(vy), regions: Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +v.toFixed(2)]) }; }
  const int2 = INT2 && n >= 1 ? WIRE.skelOf(INT2(r.S.slice(nR, nR + nT), (n - 1) / 240).map(place)).map(sg => sg.map(toWp)) : null;
  const fsd = fsDiag(n);
  frames.push({ n, t: r5((n - T0) / 240), obst, hud, tackler: pack(T.posePhys(RT, ST)), intent, runner: two ? pack(T.poseMC1(SKR, mdR, SR, qRef)) : null, pel: rv(pel), pitch: rv(pitch), turf, feetT: [rv(T.toW(ST[10].pos)), rv(T.toW(ST[13].pos))], ...wireF(ST), ...(int2 ? { intentSkel: int2 } : {}), ...(fsd ? { fsd } : {}) }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} }; M0.runs[key] = { frames: frames.length, steps: [s0, s1], cand: run.cand, finalHash: run.finalHash, two, yawDeg: yaw * 180 / Math.PI, at };
fs.writeFileSync(mf, JSON.stringify(M0, null, 1)); console.log(key, frames.length, "frames", two ? "(two characters)" : "(tackler)");
