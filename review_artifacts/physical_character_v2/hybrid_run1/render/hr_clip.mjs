// HYBRID-RUN-1 VISUAL PREPARATION (presentation only: reads records and the intent, writes clip data; nothing is re-simulated, interpolated or
// amplified). It is pvp1_collision_clip.mjs's drawing: both characters on MC-1P at their actual V2 joints (role "runner" as vinicius, role "tackler"
// as gabriel), the same rigid presentation placement, and the camera target = the smoothed 3-D midpoint of the chosen COMs. It adds the hybrid
// diagnostics, per hybrid runner and per frame:
//   ghostAbs   the RUN-1 pose itself (the animation, at its own world position): where the animation would have put the athlete;
//   ghostJ     RUN-1's joint targets on the PHYSICAL pelvis pose: the per-joint intent this step;
//   regions    per region: tracking error (deg) and authority α (1 = the animation's drive at full strength, floor = physics winning);
//   vel        COM velocity: actual and intended (RUN-1), horizontal;
//   support    each boot's turf load (BW), its support gate, the gait-support force and the balance moments (supported / animation-consistency).
// --mode original  draws RUN-1 ITSELF in the runner's place (the kinematic animation of the same intent), with no physics: "ORIGINAL RUN-1".
// --who runner|both  the camera follows the runner's COM, or the midpoint of both characters.
// usage (worktree root): LV2_ARCHIVE=<tag archive> node .../hr_clip.mjs --run <rec.json.gz> --key <id> --out <dir> [--mode original] [--who both] [--from s --to s]
//        [--focus <rec>] (take the camera path from another record) [--hide2] (do not draw the second character)
//        [--frame tackler] camera azimuths relative to the tackler's travel (+z local, as the PVP-1 collision views), else to the runner's intent
import fs from "fs"; import path from "path"; import zlib from "zlib";
const RA = new URL("../../", import.meta.url).href, T = await import(RA + "trc1/scripts/trc1_retarget.mjs"), { PL, V, Q } = T;
const WIRE = await import(RA + "slide_phys1/render/sp_wire.mjs"), L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), CH = await import(RA + "slide_phys1/scripts/sp_chor.mjs");
const HS = await import(new URL("../scripts/hr_scenes.mjs", import.meta.url).href), REC = await import(RA + "pvp1_running/scripts/pvp1_recipient.mjs"), HI = await import(new URL("../scripts/hr_intent.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, has = (k) => process.argv.includes("--" + k);
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), run = rd(arg("run")), key = arg("key"), OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const yaw = +arg("yaw", "90") * Math.PI / 180, at = arg("at", "44,34").split(",").map(Number), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], offL = PL.pitchToLocal([at[0], at[1], 0]);
const place = (s) => ({ pos: V.add(Q.rot(qy, s.pos), offL), rot: Q.norm(Q.mul(qy, s.rot)) }), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5), r4 = (x) => Math.round(x * 1e4) / 1e4;
const toWp = (p) => T.toW(p).map(r4), Wp = (p) => toWp(V.add(Q.rot(qy, p), offL)), O0 = T.toW(offL), Wv = (v) => { const a = T.toW(V.add(Q.rot(qy, v), offL)); return [a[0] - O0[0], a[1] - O0[1], a[2] - O0[2]].map(r4); };
const sT = PL.SPEC_T(), nT = sT.bodies.length, RT = T.buildPhys(T.rig("gabriel"), sT), RR = T.buildPhys(T.rig("vinicius"), sT), nR = run.nR, h = 1 / 240, BW = L.M * 9.81, B = L.B, bi = L.bi;
const pack = (P) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) });
// the intents (rebuilt from the record's own intent parameters through the scene builders: deterministic)
const run1 = REC.loadRun(HS.RUNIN_R), steps = run.recs.length;
const mkI = (p, heading) => p ? HI.makeIntent(run1, { kRef: p.kRef, k0: p.k0, qR: p.qR, offR: p.offR, nSteps: steps + 10, heading }) : null;
const IR = mkI(run.intentR), sc = run.scene || {}, IT = run.intentT ? (sc.name && sc.name.startsWith("SH_") ? HS.intentsSH(sc.name.slice(3), steps).B : mkI(run.intentT)) : null;
const FREC = arg("focus") ? rd(arg("focus")) : run, who = arg("who", "runner"), mode = arg("mode", "physical"), hide2 = has("hide2") || run.label2 === "parked";
const first = (() => { for (const r of run.recs) { const cs = r.contacts.filter(c => c.kind === "cross" && c.Jn > 0); if (cs.length) return { n: Math.round(r.t / h), pts: cs.flatMap(c => c.points.map(p => Wp(p.p))), pairs: cs.map(c => [c.a[0] + ":" + c.a[1], c.b[0] + ":" + c.b[1]]) }; } return null; })();
const nRef = arg("refStep") ? +arg("refStep") : first ? first.n : 0, n0 = Math.max(1, nRef + Math.round(+arg("from", "0") / h)), n1 = Math.min(steps, nRef + Math.round(+arg("to", "3") / h));
const wireSk = (S) => ({ wire: WIRE.wireOf(S).map(pl => pl.map(toWp)), skel: WIRE.skelOf(S).map(sg => sg.map(toWp)) });
const REGJ = { legL: ["hip_L", "knee_L", "ankle_L"], legR: ["hip_R", "knee_R", "ankle_R"], trunk: ["lumbar", "thoracic", "neck"], armL: ["shoulder_L", "elbow_L"], armR: ["shoulder_R", "elbow_R"] };
const REGB = { legL: ["thigh_L", "shank_L", "foot_L"], legR: ["thigh_R", "shank_R", "foot_R"], trunk: ["pelvis", "abdomen", "thorax", "head"], armL: ["upperArm_L", "forearm_L"], armR: ["upperArm_R", "forearm_R"] };
const SEGB = { pelvisL: "pelvis", pelvisR: "pelvis", pelvisM: "pelvis", lumbar: "abdomen", thoracic: "thorax", neck: "thorax", headTop: "head", shoulder_L: "thorax", shoulder_R: "thorax", elbow_L: "upperArm_L", hand_L: "forearm_L", elbow_R: "upperArm_R", hand_R: "forearm_R", hip_L: "thigh_L", knee_L: "shank_L", ankle_L: "foot_L", toe_L: "foot_L", heel_L: "foot_L", hip_R: "thigh_R", knee_R: "shank_R", ankle_R: "foot_R", toe_R: "foot_R", heel_R: "foot_R" };
const regOfBody = Object.fromEntries(Object.entries(REGB).flatMap(([r, bs]) => bs.map(b => [b, r])));
// skeleton segments with the authority of the region they belong to (the segment's distal point decides)
const skelAuth = (S, alpha) => { const K = L.skel(S); return L.SEGS.filter(([a, c]) => K[a] && K[c]).map(([a, c]) => { const reg = regOfBody[SEGB[c]] || regOfBody[SEGB[a]] || "trunk"; return { p: [toWp(K[a]), toWp(K[c])], a: alpha ? alpha[reg] ?? 1 : 1 }; }); };
const skelPts = (S) => { const K = L.skel(S); return L.SEGS.filter(([a, c]) => K[a] && K[c]).map(([a, c]) => [toWp(K[a]), toWp(K[c])]); };
const hyb = (lg, I, S, role, r) => { if (!lg || !I) return null; const tau = lg.tau ?? lg.n, loads = { L: 0, R: 0 };
  for (const c of r.contacts) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const x = c.a === "turf" ? c.b : c.a; if (x[0] === role && /^foot_/.test(x[1])) loads[x[1].slice(-1)] += c.Jn / h / BW; }
  const SPl = S.map(place), gAbs = I.pose(tau).map(place), anat = I.anat(tau), gJ = L.fk({ pos: S[0].pos, rot: S[0].rot }, anat).map(place);
  const vA = V.sc(r.chars[role].P, 1 / L.M), vD = I.comVel(tau), com = L.comOf(S);
  return { regions: Object.fromEntries(Object.keys(REGJ).map(k => [k, [lg.e[k], lg.a[k]]])), skelA: skelAuth(SPl.map(s => s), lg.a), ghostAbs: skelPts(gAbs), ghostJ: skelPts(gJ), com: Wp(com),
    vel: { a: Wv([vA[0], 0, vA[2]]), d: Wv([vD[0], 0, vD[2]]), aMag: r4(Math.hypot(vA[0], vA[2])), dMag: r4(Math.hypot(vD[0], vD[2])) }, loads: { L: r4(loads.L), R: r4(loads.R) }, sup: lg.sup, F: lg.F, Tsup: lg.Tsup, Tac: lg.Tac }; };
const frames = []; let tg = null;
for (let n = n0; n <= n1; n++) { const rec = run.recs[n - 1], frec = FREC.recs[Math.min(FREC.recs.length - 1, n - 1)];
  let SR = rec.S.slice(0, nR), ST = rec.S.slice(nR, nR + nT); if (mode === "original") SR = IR.pose(n);
  const fR = (mode === "original" ? IR.pose(n) : frec.S.slice(0, nR)), fT = frec.S.slice(nR, nR + nT), cR = L.comOf(fR), cT = L.comOf(fT), mid = who === "both" ? V.sc(V.add(cR, cT), 0.5) : cR;
  const tgt = toWp(place({ pos: mid, rot: [0, 0, 0, 1] }).pos); tg = tg ? tg.map((x, i) => x + (tgt[i] - x) * (1 - Math.exp(-h / 0.06))) : tgt;
  const sep = who === "both" ? Math.hypot(cR[0] - cT[0], cR[2] - cT[2]) : 0;
  const SRp = SR.map(place), STp = ST.map(place).map(s => hide2 ? { pos: V.add(s.pos, [0, -50, 0]), rot: s.rot } : s);
  const cross = !hide2 ? rec.contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => { const rA = c.a[0] === "runner", nOnR = rA ? V.sc(c.n, -1) : c.n, JonR = rA ? V.sc(c.J2, -1) : c.J2;
    return { r: rA ? c.a[1] : c.b[1], t: rA ? c.b[1] : c.a[1], pts: c.points.map(p => Wp(p.p)), n: Wv(nOnR), F: Wv(V.sc(JonR, 1 / h)), N: Math.round(c.Jn / h) }; }) : [];
  const wR = wireSk(SRp), wT = hide2 ? { wire: [], skel: [] } : wireSk(STp);
  const hR = mode === "original" ? null : hyb(run.lawR && run.lawR[n], IR, SR, "runner", rec), hT = mode === "original" || hide2 ? null : hyb(run.lawT && run.lawT[n], IT, ST, "tackler", rec);
  frames.push({ n, t: r5((n - nRef) * h), ms: Math.round((n - nRef) * h * 1000), runner: pack(T.posePhys(RR, SRp)), tackler: pack(T.posePhys(RT, STp)), pel: rv(T.toW(SRp[0].pos)), pitch: [tg[0], -tg[2]],
    cam: { tgt: tg.map(r4), fwd: arg("frame") === "tackler" ? Wv([0, 0, 1]) : Wv(Q.rot(run.intentR.qR, [0, 0, 1])), left: arg("frame") === "tackler" ? Wv([1, 0, 0]) : Wv(Q.rot(run.intentR.qR, [-1, 0, 0])), sep: r4(sep) }, cross, first: first && n >= first.n ? first : null, isFirst: !!first && n === first.n,
    wire: wT.wire, skel: wT.skel, wireR: wR.wire, skelR: wR.skel, hybR: hR, hybT: hT, mode }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} };
M0.runs[key] = { frames: frames.length, mode, who, label2: run.label2, finalHash: run.finalHash, refStep: nRef, firstContact: first ? { n: first.n, pairs: first.pairs } : null, n0, n1 };
fs.writeFileSync(mf, JSON.stringify(M0, null, 1)); console.log(key, frames.length, "frames", n0, "…", n1, "ref", nRef, first ? "first contact " + first.n + " " + JSON.stringify(first.pairs) : "no contact");
