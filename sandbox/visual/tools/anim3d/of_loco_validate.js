// OUTFIELD LOCOMOTION V1 VALIDATION (node, no browser): the plain-script modules in one VM context; the playtest's ported locomotion law
// (match.js ptStep: ACC / BRAKE_PLANT / ACC_LAT / ACC_START, WALKV / JOGV / RUNV / VMAX gears, facing toward the velocity) is re-implemented here verbatim
// as the AUTHORITATIVE mover, driven by scripted key intents; the presentation (of_loco.js + of_motion.js contact solve) follows it.
// Per body and per scenario: foot slide while planted (max / p95 / mean, per gait), sole penetration / hover, joint jumps, knee angles,
// gait transitions seen, cadence / stride, phase continuity (no resets), self-intersection proxies (elbow / knee angles).
//   node of_loco_validate.js --out <json> [--bodies SHORT_LEAN,AVG_ATHLETIC,TALL_LEAN]
const fs = require("fs"), path = require("path"), vm = require("vm");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; }; const OUT = opt("--out", "of_loco_validate.json"), BODIES = opt("--bodies", "SHORT_LEAN,AVG_ATHLETIC,TALL_LEAN").split(",").filter(Boolean);
// real characters validate through the SAME code path: of_character.js turns a rig.json into a runtime skeleton, and ofActorMake takes it
const CHARS = opt("--characters", "").split(",").filter(Boolean);
const CHAR_RIGS = {}; for (const id of CHARS) CHAR_RIGS[id] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../../assets/characters/outfield", id, "rig.json"), "utf8"));
const ROOT = path.resolve(__dirname, "../../anim3d");
const ctx = { console, Math, performance: { now: () => Date.now() }, Float32Array, Int32Array, Uint16Array, Map, Set, Object, Array, Number, JSON };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["m4.js", "skeleton.js", "skin_mesh.js", "ik.js", "gk_motion_library.js", "of_rig.js", "of_motion.js", "of_loco.js", "of_character.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
vm.runInContext(`
  if (typeof clamp01 === "undefined") globalThis.clamp01 = (x) => Math.max(0, Math.min(1, x));
  if (typeof lerp === "undefined") globalThis.lerp = (a, b, t) => a + (b - a) * t;
  if (typeof smooth01 === "undefined") globalThis.smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  if (typeof gkRootMatrix === "undefined") globalThis.gkRootMatrix = function (px, py, f, dz) { const m = M4.ident(); const right = [-Math.sin(f), 0, -Math.cos(f)], up = [0, 1, 0], fwd = [Math.cos(f), 0, -Math.sin(f)]; m[0] = right[0]; m[1] = right[1]; m[2] = right[2]; m[4] = up[0]; m[5] = up[1]; m[6] = up[2]; m[8] = fwd[0]; m[9] = fwd[1]; m[10] = fwd[2]; m[12] = px; m[13] = dz || 0; m[14] = -py; return m; };
`, ctx);
const R = vm.runInContext(`(function (BODIES, CHAR_RIGS) {
  const PT = { ACC: 4.8, BRAKE: 6.5, VMAX: 8.2, RUNV: 5.0, WALKV: 1.5, JOGV: 3.0, ACC_GAIN: 8.5 / 4.8, BRAKE_PLANT: 12.0, ACC_LAT: 10.0, ACC_START: 9.5 }, DT = 1 / 60;
  // the ported world.py locomotion law (match.js ptStep) — authoritative mover for the validation
  function simStep(p, keys) {
    let dx = 0, dy = 0; if (keys.up) dy -= 1; if (keys.down) dy += 1; if (keys.left) dx -= 1; if (keys.right) dx += 1;
    const m = Math.hypot(dx, dy), spd = keys.sprint ? PT.VMAX : keys.walk ? PT.WALKV : keys.jog ? PT.JOGV : PT.RUNV; let dvx = 0, dvy = 0; if (m > 0) { dvx = dx / m * spd; dvy = dy / m * spd; }
    const cur = Math.hypot(p.vx, p.vy), ax = dvx - p.vx, ay = dvy - p.vy;
    if (cur > 0.5) { const uvx = p.vx / cur, uvy = p.vy / cur; const aPar = ax * uvx + ay * uvy; const aPx = ax - aPar * uvx, aPy = ay - aPar * uvy; const aLat = Math.hypot(aPx, aPy);
      const limPar = aPar >= 0 ? PT.ACC * PT.ACC_GAIN : PT.BRAKE_PLANT; const fPar = Math.min(1, limPar * DT / Math.max(1e-9, Math.abs(aPar))); const fLat = Math.min(1, PT.ACC_LAT * DT / Math.max(1e-9, aLat)); p.vx += aPar * fPar * uvx + aPx * fLat; p.vy += aPar * fPar * uvy + aPy * fLat; }
    else { const am = Math.hypot(ax, ay), stp = Math.max(PT.ACC_START, PT.ACC * PT.ACC_GAIN) * DT; if (am > stp) { p.vx += ax / am * stp; p.vy += ay / am * stp; } else { p.vx = dvx; p.vy = dvy; } }
    p.x += p.vx * DT; p.y += p.vy * DT;
    const v = Math.hypot(p.vx, p.vy); const want = v > 0.7 ? Math.atan2(p.vy, p.vx) : (keys.faceTo != null ? keys.faceTo : p.facing);
    const df = ((want - p.facing) + Math.PI * 3) % (2 * Math.PI) - Math.PI; const rate = Math.max(4.0, Math.min(7.0, 7.0 - v * 0.30)) * DT; p.facing += Math.abs(df) <= rate ? df : Math.sign(df) * rate;
  }
  // scripted intents (tick → keys); deterministic
  const K = (o) => Object.assign({ up: false, down: false, left: false, right: false, sprint: false }, o);
  const SCEN = {
    walk_hold:  { secs: 6, keys: (t) => K({ right: true, walk: true }) },                      // walk gear (1.5 m/s): idle → walk, held
    jog_hold:   { secs: 6, keys: (t) => K({ right: true, jog: true }) },                       // jog gear (3.0 m/s): idle → jog, held
    walk_stop:  { secs: 6, keys: (t) => t < 3 ? K({ right: true, walk: true }) : K({}) },      // walk → stop
    jog_stop:   { secs: 6, keys: (t) => t < 3 ? K({ right: true, jog: true }) : K({}) },       // jog → stop
    w2j2r:      { secs: 9, keys: (t) => t < 3 ? K({ right: true, walk: true }) : t < 6 ? K({ right: true, jog: true }) : K({ right: true }) },   // walk → jog → run
    walk_turn:  { secs: 7, keys: (t) => t < 3 ? K({ right: true, walk: true }) : K({ down: true, walk: true }) },                                 // 90° turn at walk
    jog_ramp:   { secs: 6, keys: (t) => K({ right: true }) },                                   // idle → run (5.0) : passes WALK and JOG on the way, then holds RUN
    sprint:     { secs: 7, keys: (t) => K({ right: true, sprint: true }) },                     // idle → sprint (8.2) → run → sprint → stop
    stop:       { secs: 7, keys: (t) => t < 3.0 ? K({ right: true, sprint: true }) : K({}) },   // sprint → stop
    turn_grad:  { secs: 8, keys: (t) => t < 2 ? K({ right: true }) : t < 5 ? K({ right: true, down: true }) : K({ down: true }) },   // gradual 90° turn while running
    turn_sharp: { secs: 7, keys: (t) => t < 2.5 ? K({ right: true }) : K({ left: true }) },     // 180° reversal at run speed
    idle_turn:  { secs: 6, keys: (t) => K({ faceTo: t < 2 ? 0 : t < 4 ? Math.PI / 2 : Math.PI }) },   // standing turns (the facing is turned by the intent; the feet must step)
    walk_slow:  { secs: 6, keys: (t) => K({ right: (Math.floor(t * 60) % 6) < 2 }) },           // a walk-speed profile: the intent pulses so the law's velocity averages ~1.3 m/s (the playtest has no walk speed; the presentation must still read as a walk)
  };
  const report = { bodies: {}, scenarios: Object.keys(SCEN) };
  for (const id of BODIES.concat(Object.keys(CHAR_RIGS))) {
    const isChar = !!CHAR_RIGS[id];
    const skel = isChar ? ofCharSkeleton({ rig: CHAR_RIGS[id] }) : ofBuildSkeleton(OF_BODIES[id]);
    const body = { H: skel.H, legLen: +skel.legLen.toFixed(3), real: isChar, name: isChar ? CHAR_RIGS[id].identity.name : id, scenarios: {} };
    for (const sn of report.scenarios) {
      const sc = SCEN[sn]; const act = ofActorMake(isChar ? skel : id, 60, 34, 0); act.motion = "LOCO"; const p = { x: 60, y: 34, vx: 0, vy: 0, facing: 0 }; let t = 0;
      const perGait = {}; const G = (g) => perGait[g] || (perGait[g] = { n: 0, slide: [], relMax: 0, pen: 0, hover: 0, kneeMin: 999, kneeMax: 0, elbowMin: 999, jumpMax: 0, jumpP95: [], jerkMax: 0, jerkP95: [], toeTicks: 0, stepTicks: 0 });
      const m = { ticks: 0, gaits: [], phaseJumps: 0, vMax: 0, leanMin: 0, leanMax: 0, rootVsPres: 0, nan: false, jumpMax: 0, transitions: [], strides: [] }; let lastGait = null, lastPhase = null, lastPlant = { R: null, L: null };
      for (let k = 0; k < sc.secs * 60; k++) {
        const keys = sc.keys(t); simStep(p, keys); t += DT;
        act.x = p.x; act.y = p.y; act.facing = p.facing; act.speed = Math.hypot(p.vx, p.vy); act.sim = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing };
        const sol = ofActorTick(act, DT, t); const d = sol.diag, L = act.loco.diag; m.ticks++; m.vMax = Math.max(m.vMax, L.v); m.leanMin = Math.min(m.leanMin, L.lean); m.leanMax = Math.max(m.leanMax, L.lean);
        const g = L.wGait < 0.5 ? "IDLE" : L.gait; if (g !== lastGait) { m.transitions.push({ t: +t.toFixed(2), from: lastGait, to: g, v: L.v, phase: L.phase }); lastGait = g; }
        if (lastPhase != null && L.v > 0.3) { const dph = ((L.phase - lastPhase) % 1 + 1) % 1; if (dph > 0.25 && dph < 0.75) m.phaseJumps++; } lastPhase = L.phase;
        const gg = G(g); gg.n++;
        for (const sd of ["R", "L"]) { const f = d.feet[sd]; if (f.contact) { gg.slide.push(f.slide); if (f.mode === "toe") gg.toeTicks++; } else if (f.mode === "release") gg.relMax = Math.max(gg.relMax, f.slide); if (f.mode === "step") gg.stepTicks++; if (f.soleY < -0.005) gg.pen = Math.max(gg.pen, -f.soleY); if (f.locked && f.soleY > 0.02 && f.mode === "ankle") gg.hover = Math.max(gg.hover, f.soleY);
          if (f.contact && f.P && f.mode === "ankle" && (!lastPlant[sd] || Math.hypot(f.P[0] - lastPlant[sd][0], f.P[2] - lastPlant[sd][2]) > 0.05)) { if (lastPlant[sd] && L.v > 0.3) m.strides.push({ g, len: +Math.hypot(f.P[0] - lastPlant[sd][0], f.P[2] - lastPlant[sd][2]).toFixed(3) }); lastPlant[sd] = f.P.slice(); } }
        for (const sd of ["R", "L"]) { gg.kneeMin = Math.min(gg.kneeMin, d.knee[sd]); gg.kneeMax = Math.max(gg.kneeMax, d.knee[sd]); gg.elbowMin = Math.min(gg.elbowMin, d.elbow[sd]); }
        if (k > 0) { gg.jumpMax = Math.max(gg.jumpMax, d.jump); gg.jumpP95.push(d.jump); m.jumpMax = Math.max(m.jumpMax, d.jump); gg.jerkMax = Math.max(gg.jerkMax, d.jerk || 0); gg.jerkP95.push(d.jerk || 0); m.jerkMax = Math.max(m.jerkMax || 0, d.jerk || 0); if ((d.jerk || 0) >= (m.jerkMax || 0)) { m.jerkBone = d.jerkBone; m.jerkT = +t.toFixed(2); } }
        if (sol.fk.joint.some(q => q.some(v => !isFinite(v)))) m.nan = true;
      }
      const stat = (arr) => { if (!arr.length) return null; const s = arr.slice().sort((x, y) => x - y); return { max: +s[s.length - 1].toFixed(4), p95: +s[Math.floor(s.length * 0.95)].toFixed(4), mean: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(4), n: s.length }; };
      for (const g in perGait) { const q = perGait[g]; q.slide = stat(q.slide); q.pen = +q.pen.toFixed(4); q.hover = +q.hover.toFixed(4); q.kneeMin = +q.kneeMin.toFixed(1); q.kneeMax = +q.kneeMax.toFixed(1); q.elbowMin = +q.elbowMin.toFixed(1); q.jumpMax = +q.jumpMax.toFixed(4); q.relMax = +q.relMax.toFixed(4); const js = q.jumpP95.sort((x, y) => x - y); q.jumpP95 = js.length ? +js[Math.floor(js.length * 0.95)].toFixed(4) : 0; const ks = q.jerkP95.sort((x, y) => x - y); q.jerkP95 = ks.length ? +ks[Math.floor(ks.length * 0.95)].toFixed(4) : 0; q.jerkMax = +q.jerkMax.toFixed(4); }
      const sg = {}; for (const s of m.strides) (sg[s.g] || (sg[s.g] = [])).push(s.len); for (const g in sg) sg[g] = stat(sg[g]); m.strideByGait = sg; delete m.strides;
      m.perGait = perGait; body.scenarios[sn] = m;
    }
    report.bodies[id] = body;
  }
  return report;
})(${JSON.stringify(BODIES)}, ${JSON.stringify(CHAR_RIGS)})`, ctx);
fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
for (const id of Object.keys(R.bodies)) { const b = R.bodies[id]; console.log(id, "H", b.H, "leg", b.legLen);
  for (const sn of R.scenarios) { const m = b.scenarios[sn]; const pg = Object.entries(m.perGait).map(([g, q]) => `${g}:${q.n}t contact-slide max ${q.slide ? (q.slide.max * 100).toFixed(1) : "-"} p95 ${q.slide ? (q.slide.p95 * 100).toFixed(1) : "-"} mean ${q.slide ? (q.slide.mean * 100).toFixed(1) : "-"}cm rel ${(q.relMax * 100).toFixed(1)} pen ${(q.pen * 100).toFixed(1)} hover ${(q.hover * 100).toFixed(1)} knee ${q.kneeMin}-${q.kneeMax} pop p95 ${(q.jerkP95 * 100).toFixed(1)} max ${(q.jerkMax * 100).toFixed(1)}`).join(" | ");
    console.log("   ", sn.padEnd(11), "vMax", m.vMax.toFixed(2), "lean", m.leanMin.toFixed(0) + ".." + m.leanMax.toFixed(0), "phaseJumps", m.phaseJumps, "popMax", ((m.jerkMax || 0) * 100).toFixed(1), m.jerkBone || "", "nan", m.nan, "trans", m.transitions.map(x => (x.from || "-") + ">" + x.to + "@" + x.v.toFixed(1)).join(" "), "\n       ", pg, "\n        strides", JSON.stringify(m.strideByGait)); } }
