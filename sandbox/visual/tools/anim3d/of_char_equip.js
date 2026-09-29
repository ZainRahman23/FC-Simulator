// ══ HAIR AND EQUIPMENT ATTACHMENT CHECK ══════════════════════════════════════════════════════════════════════════════════════════
// Neither the hair nor the face protection has physics here: both are SKINNED. So the only honest questions to ask of them are questions
// about skinning, asked against the REAL poses the locomotion library produces rather than against a neutral stance:
//   influences    which joints a part actually reads — a part that only ever reads `head` is rigidly attached, by construction
//   rigidity      how far the part departs from pure head-rigid motion (a head-rigid part must be EXACTLY zero, every tick)
//   travel        the largest per-tick world displacement of any of its vertices — whipping, as a number rather than an opinion
//   scalp         the change in each hair vertex's distance to the head bone origin: growth = lifting off, shrinkage = sinking in
// The approved weights are measured, never modified.
//   node of_char_equip.js [--ids ...] [--out <json>]
const fs = require("fs"), path = require("path"), vm = require("vm");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const IDS = opt("--ids", "cucurella,gabriel,osimhen,szoboszlai,vinicius,james").split(",").filter(Boolean);
const OUT = opt("--out", ""), ROOT = path.resolve(__dirname, "../../anim3d"), ASSETS = path.resolve(__dirname, "../../../../assets/characters/outfield");
const ctx = { console, Math, performance: { now: () => Date.now() }, Float32Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, Map, Set, Object, Array, Number, JSON, isFinite };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["m4.js", "skeleton.js", "skin_mesh.js", "ik.js", "gk_motion_library.js", "of_rig.js", "of_motion.js", "of_loco.js", "of_kick.js", "of_character.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
vm.runInContext(`
  if (typeof clamp01 === "undefined") globalThis.clamp01 = (x) => Math.max(0, Math.min(1, x));
  if (typeof smooth01 === "undefined") globalThis.smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  if (typeof gkRootMatrix === "undefined") globalThis.gkRootMatrix = function (px, py, f, dz) { const m = M4.ident(); m[0] = -Math.sin(f); m[1] = 0; m[2] = -Math.cos(f); m[4] = 0; m[5] = 1; m[6] = 0; m[8] = Math.cos(f); m[9] = 0; m[10] = -Math.sin(f); m[12] = px; m[13] = dz || 0; m[14] = -py; return m; };
`, ctx);

// per character: the rig, the packed vertex streams, and the vertex sets of every hair / face-protection material
const DATA = {};
for (const id of IDS) {
  const rig = JSON.parse(fs.readFileSync(path.join(ASSETS, id, "rig.json"), "utf8"));
  const buf = fs.readFileSync(path.join(ASSETS, id, "mesh.bin"));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout;
  const g = (k, T) => new T(ab, L[k].byteOffset, L[k].elementCount);
  const vmat = g("vertexMaterials", Uint16Array), nameOf = (k) => ((rig.materials[k] || {}).name || "");
  const groups = {};
  for (let v = 0; v < rig.mesh.vertexCount; v++) {
    const nm = nameOf(vmat[v]);
    const cat = /hair/i.test(nm) ? "hair" : /faceProtection|protection/i.test(nm) ? "face-protection" : null;
    if (cat) (groups[cat] || (groups[cat] = [])).push(v);
  }
  DATA[id] = { rig, pos: g("positions", Float32Array), joints: g("joints", Uint16Array), weights: g("weights", Float32Array), groups };
}
const REPORT = vm.runInContext(`(function (DATA, IDS) {
  const PT = { ACC: 4.8, BRAKE: 6.5, VMAX: 8.2, RUNV: 5.0, WALKV: 1.5, JOGV: 3.0, ACC_GAIN: 8.5 / 4.8, BRAKE_PLANT: 12.0, ACC_LAT: 10.0, ACC_START: 9.5 }, DT = 1 / 60;
  function simStep(p, keys) {
    let dx = 0, dy = 0; if (keys.up) dy -= 1; if (keys.down) dy += 1; if (keys.left) dx -= 1; if (keys.right) dx += 1;
    const m = Math.hypot(dx, dy), spd = keys.sprint ? PT.VMAX : keys.walk ? PT.WALKV : keys.jog ? PT.JOGV : PT.RUNV; let dvx = 0, dvy = 0; if (m > 0) { dvx = dx / m * spd; dvy = dy / m * spd; }
    const cur = Math.hypot(p.vx, p.vy), ax = dvx - p.vx, ay = dvy - p.vy;
    if (cur > 0.5) { const uvx = p.vx / cur, uvy = p.vy / cur, aPar = ax * uvx + ay * uvy, aPx = ax - aPar * uvx, aPy = ay - aPar * uvy, aLat = Math.hypot(aPx, aPy);
      const limPar = aPar >= 0 ? PT.ACC * PT.ACC_GAIN : PT.BRAKE_PLANT, fPar = Math.min(1, limPar * DT / Math.max(1e-9, Math.abs(aPar))), fLat = Math.min(1, PT.ACC_LAT * DT / Math.max(1e-9, aLat));
      p.vx += aPar * fPar * uvx + aPx * fLat; p.vy += aPar * fPar * uvy + aPy * fLat; }
    else { const am = Math.hypot(ax, ay), stp = Math.max(PT.ACC_START, PT.ACC * PT.ACC_GAIN) * DT; if (am > stp) { p.vx += ax / am * stp; p.vy += ay / am * stp; } else { p.vx = dvx; p.vy = dvy; } }
    p.x += p.vx * DT; p.y += p.vy * DT;
    const v = Math.hypot(p.vx, p.vy), want = v > 0.7 ? Math.atan2(p.vy, p.vx) : p.facing;
    const df = ((want - p.facing) + Math.PI * 3) % (2 * Math.PI) - Math.PI, rate = Math.max(4.0, Math.min(7.0, 7.0 - v * 0.30)) * DT;
    p.facing += Math.abs(df) <= rate ? df : Math.sign(df) * rate;
  }
  const K = (o) => Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, o);
  const SCEN = {
    sprint:     { secs: 6, keys: (t) => K({ right: true, sprint: true }) },
    run_brake:  { secs: 6, keys: (t) => t < 3 ? K({ right: true }) : K({}) },
    turn_sharp: { secs: 6, keys: (t) => t < 2.5 ? K({ right: true }) : K({ left: true }) },
    walk:       { secs: 5, keys: (t) => K({ right: true, walk: true }) },
  };
  const KICKS = ["INSIDE", "LACES", "LACES_POWER", "OUTSIDE", "CHIP"];
  const out = {};
  for (const id of IDS) {
    const D = DATA[id], rig = D.rig, skel = ofCharSkeleton({ rig });
    const headIdx = rig.bones.findIndex(b => b.name === "head"), hbo = rig.bones[headIdx].bindOrigin;
    const cats = Object.keys(D.groups);
    const info = {};
    for (const c of cats) {
      const bones = new Set();
      for (const v of D.groups[c]) for (let k = 0; k < 4; k++) if (D.weights[v * 4 + k] > 1e-8) bones.add(rig.bones[D.joints[v * 4 + k]].name);
      info[c] = { vertices: D.groups[c].length, influences: [...bones].sort(), headOnly: [...bones].every(b => b === "head"), scen: {} };
    }
    // every 5th vertex: this is a bound on the part, not a render of it
    const sample = {}; for (const c of cats) { sample[c] = []; for (let i = 0; i < D.groups[c].length; i += 5) sample[c].push(D.groups[c][i]); }
    const bindR = {}; for (const c of cats) bindR[c] = sample[c].map(v => Math.hypot(D.pos[v * 3] - hbo[0], D.pos[v * 3 + 1] - hbo[1], D.pos[v * 3 + 2] - hbo[2]));
    const skinPt = (fk, v, o) => { o[0] = o[1] = o[2] = 0;
      for (let k = 0; k < 4; k++) { const w = D.weights[v * 4 + k]; if (w <= 1e-8) continue;
        const bi = D.joints[v * 4 + k], M = fk.world[bi], bo = rig.bones[bi].bindOrigin;
        const x = D.pos[v * 3] - bo[0], y = D.pos[v * 3 + 1] - bo[1], z = D.pos[v * 3 + 2] - bo[2];
        o[0] += w * (M[0] * x + M[4] * y + M[8] * z + M[12]); o[1] += w * (M[1] * x + M[5] * y + M[9] * z + M[13]); o[2] += w * (M[2] * x + M[6] * y + M[10] * z + M[14]); } };
    const runOne = (label, secs, keyFn, kickTech) => {
      const act = ofActorMake(skel, 60, 34, 0); act.motion = "LOCO";
      const p = { x: 60, y: 34, vx: 0, vy: 0, facing: 0 }; let t = 0;
      const kick = kickTech ? ofKickMake() : null; let fired = false;
      const st = {}; for (const c of cats) st[c] = { rigid: 0, travel: 0, grow: 0, shrink: 0 };
      const prev = {}; for (const c of cats) prev[c] = sample[c].map(() => null);
      const o = [0, 0, 0], hr = [0, 0, 0];
      for (let k = 0; k < secs * 60; k++) {
        simStep(p, keyFn(t)); t += DT;
        act.x = p.x; act.y = p.y; act.facing = p.facing; act.speed = Math.hypot(p.vx, p.vy); act.sim = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing };
        if (kickTech && !fired && t > secs * 0.5) { ofKickTick(skel, { tech: kickTech, foot: "R", kickAt: t + 0.30, t0: t }, kick, t); fired = true; }
        if (kick && kick.on) ofKickTick(skel, null, kick, t);
        const sol = ofActorTick(act, DT, t), fk = sol.fk; if (!fk || !fk.world) continue;
        const W = fk.world[headIdx];
        for (const c of cats) {
          const S = sample[c], R0 = bindR[c], P = prev[c], q = st[c];
          for (let i = 0; i < S.length; i++) {
            const v = S[i]; skinPt(fk, v, o);
            const x = D.pos[v * 3] - hbo[0], y = D.pos[v * 3 + 1] - hbo[1], z = D.pos[v * 3 + 2] - hbo[2];
            hr[0] = W[0] * x + W[4] * y + W[8] * z + W[12]; hr[1] = W[1] * x + W[5] * y + W[9] * z + W[13]; hr[2] = W[2] * x + W[6] * y + W[10] * z + W[14];
            const d = Math.hypot(o[0] - hr[0], o[1] - hr[1], o[2] - hr[2]); if (d > q.rigid) q.rigid = d;
            const hx = W[12], hy = W[13], hz = W[14], r = Math.hypot(o[0] - hx, o[1] - hy, o[2] - hz) - R0[i];
            if (r > q.grow) q.grow = r; if (-r > q.shrink) q.shrink = -r;
            const pp = P[i]; if (pp) { const tv = Math.hypot(o[0] - pp[0], o[1] - pp[1], o[2] - pp[2]); if (tv > q.travel) q.travel = tv; }
            P[i] = [o[0], o[1], o[2]];
          }
        }
      }
      for (const c of cats) info[c].scen[label] = { rigidMaxM: +st[c].rigid.toFixed(5), travelPerTickM: +st[c].travel.toFixed(5), scalpGrowM: +st[c].grow.toFixed(5), scalpSinkM: +st[c].shrink.toFixed(5) };
    };
    for (const sn in SCEN) runOne(sn, SCEN[sn].secs, SCEN[sn].keys, null);
    for (const tech of KICKS) runOne("kick:" + tech, 3, (t) => K({ right: true }), tech);
    out[id] = { name: rig.identity.name, H: rig.H, parts: info, hairWarnings: rig.hairWarnings || [] };
  }
  return out;
})`, ctx)(DATA, IDS);

console.log("HAIR AND EQUIPMENT ATTACHMENT CHECK — skinned parts measured against the poses the libraries actually produce\n");
let fail = 0;
for (const id of IDS) {
  const E = REPORT[id];
  console.log(`── ${E.name}  (${id})  ${E.H.toFixed(2)} m`);
  for (const [cat, p] of Object.entries(E.parts)) {
    console.log(`   ${cat.padEnd(16)} ${String(p.vertices).padStart(6)} vertices   influences: ${p.influences.join(" + ")}   ${p.headOnly ? "HEAD-RIGID" : "follows the neck/torso too"}`);
    for (const [sn, v] of Object.entries(p.scen))
      console.log(`      ${sn.padEnd(18)} off-head-rigid ${(v.rigidMaxM * 100).toFixed(2).padStart(6)} cm   peak travel/tick ${(v.travelPerTickM * 100).toFixed(2).padStart(6)} cm   scalp +${(v.scalpGrowM * 100).toFixed(2)} / -${(v.scalpSinkM * 100).toFixed(2)} cm`);
    if (p.headOnly) { const worst = Math.max(...Object.values(p.scen).map(v => v.rigidMaxM));
      if (worst > 1e-6) { console.log(`      FAIL: head-only weights must move exactly with the head (worst ${worst})`); fail++; }
      else console.log(`      head-only weights reproduce head-rigid motion to 0 m in every scenario — attachment is exact`); }
  }
  for (const w of E.hairWarnings) console.log(`   package warning  ${w.code}: ${w.bones.join("+")}`);
  console.log("");
}
console.log(fail ? `CHECK FAIL — ${fail} rigid part(s) did not move with their bone` : "CHECK PASS — every rigid part is exactly rigid; every non-rigid part is quantified above");
if (OUT) fs.writeFileSync(OUT, JSON.stringify(REPORT, null, 1));
