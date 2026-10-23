// croqxs/tools/croq_integrity.mjs (from croqhs) — LA CROQUETA (X-SWEEP V3, HOP/SWEEP V2, VIDEO-GUIDED V1, ADV-4): the owner's integrity list and the rhythm for the six REF croqueta cases, this
// build against CURRENT ADV-4 (../../feint2ef, run with its own modules, from the identical case and input):
//   integrity  v_extreme's classes — plant slides (SLIDE), foot jumps (JUMP), leg crossings (CROSS), knee pops (KNEE), floats (FLOAT), foot swaps
//              (SWAP), normal-visible / slow-motion — plus the largest per-tick foot step and toe turn (an ankle snap > 900 °/s), the pelvis's
//              and the root's largest per-tick discontinuity, torso / shoulder spikes (> 900 °/s pelvis yaw, shoulder yaw / roll), the least leg
//              clearance; each croqueta contact's surface, the boot face nearest the ball and its gap; missed contacts and possession exits
//   rhythm     from the request: the body's lateral onset (the root's velocity across > 0.3 m/s), the first contact, the fastest lateral body
//              travel, the receiving foot's lift, the second contact, the exit plant, the exit heading reached, control returned (the next action)
//   transfer   at the first contact the pelvis's lead over the ball across and the first foot's distance from the pelvis; the pelvis's and the
//              ball's travel across from the request to the receive and to +0.5 s; at the receive the receiving foot across from the ball
//   node croq_integrity.mjs [--json f] [--only "REF · JOG L → R"]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const BUILDS = [["X-SWEEP V3", "../"], ["HOP/SWEEP V2", "../../croqhs/"], ["VIDEO-GUIDED V1", "../../croqvg/"], ["CURRENT ADV-4", "../../feint2ef/"]];   // (X-SWEEP V3: four builds)
const VAR = ["REF · WALK L → R", "REF · WALK R → L", "REF · JOG L → R", "REF · JOG R → L", "REF · RUN L → R", "REF · RUN R → L"];
const DEG = 180 / Math.PI, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), hyp = Math.hypot;
export async function croqIntegrity(dir) { const base = new URL(dir, import.meta.url);
  const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base));
  const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base)); const { PlayBody } = await import(new URL("u_body.js", base)); const X = await import(new URL("tools/v_extreme.mjs", base));
  const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
  return function run(c) { const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, false), t0 = r.t0, body = new PlayBody(env, sim);
    const m = X.measure(sim, Math.round(Math.max(0, t0 - 0.3) / DT), 0), K = (k) => `${m.kinds[k + "·normal"] || 0}/${m.kinds[k + "·slow"] || 0}`;
    const st0 = sim.stateAt(t0), h0 = st0.s > 0.6 ? st0.h : st0.psi, side = c.ang > 0 ? 1 : -1, rt = [-Math.sin(h0), Math.cos(h0)];
    const lat = (p) => side * ((p[0] - st0.P[0]) * rt[0] + (p[1] - st0.P[1]) * rt[1]);
    const cs = sim.contacts.filter((x) => x.t >= t0 - 1e-9 && x.t < t0 + 2.0), iF = cs.findIndex((x) => /croq|LATERAL|transfer/i.test(x.role || "")), cF = cs[iF], cR = cs[iF + 1];
    const out = { v: c.variant, N: m.N, SLIDE: K("SLIDE"), JUMP: K("JUMP"), CROSS: K("CROSS"), KNEE: K("KNEE"), FLOAT: K("FLOAT"), SWAP: K("SWAP"), missed: cs.filter((x) => x.missed).length };
    const ex = sim.poss && sim.poss.log ? sim.poss.log.filter((e) => e.t >= t0 && e.from === "CONTROLLED" && e.to === "FREE") : []; out.exits = ex.length;
    // (each croqueta contact — the first, the receive and the one after — at its tick: the surface, the nearest boot face and its gap)
    out.contacts = cs.slice(Math.max(0, iF), iF + 3).map((x) => { const p = body.pose(x.t), g = p.gap && p.gap[x.F]; return { t: +(x.t - t0).toFixed(3), F: x.F, surface: x.surface, role: (x.role || "").slice(0, 46), face: g ? g.face : null, gapCm: g ? +(g.gap * 100).toFixed(1) : null, missed: !!x.missed }; });
    // (per tick from 0.3 s before the request to 2 s after: the feet's steps and toe turns, the pelvis's and the root's discontinuities, the
    // torso's / shoulders' rates, the least clearance)
    const steps = []; let tPel = null, prev = null, footStep = 0, tFoot = null, toeRate = 0, tToe = null, pelJump = 0, rootJump = 0, minClr = 9, spikes = [], vLatMax = 0, tLatMax = null, onset = null;
    const sgnF = (X) => (X === "R" ? 1 : -1);
    for (let t = Math.max(0, t0 - 0.3); t <= Math.min(sim.t, t0 + 2.0) + 1e-9; t += DT) { const p = body.pose(t), J = p.J, s = sim.stateAt(t), pel = J.pelvis.j;
      const hipV = [J.thigh_L.j[0] - J.thigh_R.j[0], J.thigh_L.j[1] - J.thigh_R.j[1]], shV = [J.upperArm_L.j[0] - J.upperArm_R.j[0], J.upperArm_L.j[1] - J.upperArm_R.j[1]];
      const hipYaw = Math.atan2(hipV[1], hipV[0]), shYaw = Math.atan2(shV[1], shV[0]), shRoll = Math.atan2(J.upperArm_L.j[2] - J.upperArm_R.j[2], hyp(...shV));
      // (the toe's yaw only while the foot is not pointing steeply down or up: its horizontal length ≥ 10 cm of ≈ 17)
      const toeY = Object.fromEntries(["R", "L"].map((X) => { const dx = J["toe_" + X].j[0] - J["foot_" + X].j[0], dy = J["toe_" + X].j[1] - J["foot_" + X].j[1]; return [X, hyp(dx, dy) >= 0.10 ? Math.atan2(dy, dx) : null]; }));
      minClr = Math.min(minClr, ...Object.values(p.clr));
      if (prev) { for (const X of ["R", "L"]) { const a = J["foot_" + X].j, b = prev.J["foot_" + X].j, d = hyp(a[0] - b[0], a[1] - b[1], a[2] - b[2]); if (d > footStep) { footStep = d; tFoot = `${X} @${(t - t0).toFixed(3)}`; }
          if (d > 0.06) steps.push({ X, cm: +(d * 100).toFixed(1), t: +(t - t0).toFixed(3), was: prev.pl[X], now: p.feet[X].planted, act: sim.planAt(t).action.label || sim.planAt(t).action.kind });
          if (toeY[X] != null && prev.toeY[X] != null) { const w = Math.abs(wrap(toeY[X] - prev.toeY[X])) / DT * DEG; if (w > toeRate) { toeRate = w; tToe = `${X} @${(t - t0).toFixed(3)}`; } } }
        { const pj = hyp(pel[0] - prev.pel[0], pel[1] - prev.pel[1], pel[2] - prev.pel[2]) - s.s * DT; if (pj > pelJump) { pelJump = pj; tPel = +(t - t0).toFixed(3); } }
        rootJump = Math.max(rootJump, hyp(s.P[0] - prev.P[0], s.P[1] - prev.P[1]) - Math.max(s.s, prev.s) * DT);
        for (const [k, w] of [["pelvis yaw", Math.abs(wrap(hipYaw - prev.hipYaw)) / DT * DEG], ["shoulder yaw", Math.abs(wrap(shYaw - prev.shYaw)) / DT * DEG], ["shoulder roll", Math.abs(shRoll - prev.shRoll) / DT * DEG]]) if (w > 900) spikes.push(`${k} ${w.toFixed(0)}°/s @${(t - t0).toFixed(2)}`);
        const vl = (lat(s.P) - lat(prev.P)) / DT; if (t >= t0 && vl > vLatMax) { vLatMax = vl; tLatMax = t - t0; } if (t >= t0 && onset == null && vl > 0.3) onset = t - t0; }
      prev = { J, pel: pel.slice(), P: s.P.slice(), s: s.s, hipYaw, shYaw, shRoll, toeY, pl: { R: p.feet.R.planted, L: p.feet.L.planted } }; }
    Object.assign(out, { footStepCm: +(footStep * 100).toFixed(1), tFoot, toeRate: +toeRate.toFixed(0), tToe, pelJumpCm: +(pelJump * 100).toFixed(2), tPel, rootJumpCm: +(rootJump * 100).toFixed(2), minClr: +minClr.toFixed(3), bigSteps: steps.sort((a, b) => b.cm - a.cm).slice(0, 4), spikes: spikes.length, spk: spikes.slice(0, 3) });
    // (the rhythm)
    const tF = cF ? cF.t : null, tR = cR ? cR.t : null, rel = (x) => (x == null ? null : +(x - t0).toFixed(3));
    let lift = null, exitPlant = null, ctl = null, exitHead = null; const Sx = cR ? cR.F : null;
    if (tR != null) { for (let t = tR; t > tR - 0.4; t -= DT) if (body.pose(t).feet[Sx].planted) { lift = t + DT; break; }
      for (let t = tR + DT; t < tR + 0.6; t += DT) { const p = body.pose(t); if (p.feet.R.planted && !body.pose(t - DT).feet.R.planted || p.feet.L.planted && !body.pose(t - DT).feet.L.planted) { exitPlant = t; break; } }
      const a0 = sim.planAt(tR).action; for (let t = tR; t < t0 + 2.0; t += DT) { const a = sim.planAt(t).action; if (a !== a0 && a.id !== a0.id && /CARRY/i.test(a.label || a.kind || "")) { ctl = t; break; } }
      const sE = sim.stateAt(Math.min(sim.t, tR + 0.6)), hE = sE.h; for (let t = tR; t < tR + 0.6; t += DT) { const s = sim.stateAt(t); if (s.s > 0.6 && Math.abs(wrap(s.h - hE)) < 10 / DEG) { exitHead = t; break; } } }
    out.rhythm = { onset, first: rel(tF), latMax: tLatMax != null ? +tLatMax.toFixed(3) : null, vLatMax: +vLatMax.toFixed(2), lift: rel(lift), receive: rel(tR), exitPlant: rel(exitPlant), exitHeading: rel(exitHead), control: rel(ctl), touchToTouch: tF != null && tR != null ? +(tR - tF).toFixed(3) : null };
    // (the transfer: the body leading the ball)
    if (tF != null) { const pF = body.pose(tF), Fx = cF.F; out.transfer = { pelvisLeadOverBall: +(lat(pF.J.pelvis.j) - lat(pF.ball)).toFixed(2), firstFootFromPelvis: +(lat(pF.J.pelvis.j) - lat(pF.J["foot_" + Fx].j)).toFixed(2), rootAtFirst: +lat(sim.stateAt(tF).P).toFixed(2) };
      if (tR != null) { const pR = body.pose(tR); Object.assign(out.transfer, { pelvisAtReceive: +lat(pR.J.pelvis.j).toFixed(2), ballAtReceive: +lat(pR.ball).toFixed(2), recvFootMinusBall: +(lat(pR.J["foot_" + Sx].j) - lat(pR.ball)).toFixed(2), recvFootFromPelvis: +(lat(pR.J["foot_" + Sx].j) - lat(pR.J.pelvis.j)).toFixed(2) });
        const p5 = body.pose(tF + 0.5); Object.assign(out.transfer, { pelvisAt05: +lat(p5.J.pelvis.j).toFixed(2), ballAt05: +lat(p5.ball).toFixed(2) }); } }
    return out; }; }
if (import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) { const all = {}, only = arg("only"), builds = arg("build") ? [[arg("build"), arg("build")]] : BUILDS;
  for (const [name, dir] of builds) { const { CASES } = await import(new URL("v_cases.js", new URL("../", import.meta.url))); const run = await croqIntegrity(dir); all[name] = [];
    for (const v of VAR) { if (only && v !== only) continue; const c = CASES.find((x) => x.tech === "CROQUETA" && x.variant === v); all[name].push(run(c)); } }
  const f = (x, d = 2) => (x == null ? "—" : (+x).toFixed(d));
  for (const [name] of builds) { console.log(`\n■ ${name}`);
    console.log("case               | onset first latMax(v) lift  recv  t→t   plant  head   ctl  | lead  footP | pel@R ball@R recv−ball | pel@.5 ball@.5");
    for (const o of all[name]) { const R = o.rhythm, T = o.transfer || {};
      console.log(`${o.v.padEnd(18)} | ${f(R.onset)}  ${f(R.first)}  ${f(R.latMax)}(${f(R.vLatMax, 1)}) ${f(R.lift)}  ${f(R.receive)}  ${f(R.touchToTouch)}  ${f(R.exitPlant)}  ${f(R.exitHeading)}  ${f(R.control)} | ${f(T.pelvisLeadOverBall)}  ${f(T.firstFootFromPelvis)} | ${f(T.pelvisAtReceive)}  ${f(T.ballAtReceive)}  ${f(T.recvFootMinusBall)} | ${f(T.pelvisAt05)}  ${f(T.ballAt05)}`); }
    console.log("case               | SLIDE JUMP CROSS KNEE FLOAT SWAP | foot step cm · toe °/s | pelvis / root jump cm | min clr | spikes | missed exits | contacts (surface · nearest face · gap cm)");
    for (const o of all[name]) console.log(`${o.v.padEnd(18)} | ${o.SLIDE.padEnd(5)} ${o.JUMP.padEnd(4)} ${o.CROSS.padEnd(5)} ${o.KNEE.padEnd(4)} ${o.FLOAT.padEnd(5)} ${o.SWAP.padEnd(4)} | ${f(o.footStepCm, 1)} (${o.tFoot}) · ${o.toeRate} (${o.tToe}) | ${f(o.pelJumpCm)} / ${f(o.rootJumpCm)} | ${f(o.minClr, 3)} | ${o.spikes}${o.spikes ? " " + o.spk.join("; ") : ""} | ${o.missed} ${o.exits} | ${o.contacts.map((x) => `${x.t} ${x.F} ${x.surface}·${x.face}·${f(x.gapCm, 1)}`).join("  ")}`); }
  const j = process.argv.indexOf("--json"); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(all, null, 1)); }
