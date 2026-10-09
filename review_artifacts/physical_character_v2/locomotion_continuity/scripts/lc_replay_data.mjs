// LC-1 §7 replay data: for each sequence, the V1.3 (OF_CONT off) and LC-1 (on) page records, same gameplay, packed for the browser replay —
// rig joints / tips (world, mm), pelvis, the V2-mapped COM and its implied vertical force, planted feet (V1.3: lock contact flags; LC-1: layer
// mode + anchor), and the promotion-valid flags (lc_valid.mjs outputs).
// usage (worktree root): V13_WT=… V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node …/lc_replay_data.mjs <out.json> <name>|<offDir>|<onDir>|<case>|<validOff.json>|<validOn.json>|<k0>|<k1> …
import fs from "fs";
const M = await import(new URL("../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href); const { L, makeMapper } = M; const { V, Q, B, loadAir } = L;
const Mt = B.reduce((s, b) => s + b.mass, 0), comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt);
const mm = (x) => Math.round(x * 1000);
const [OUT, ...SPECS] = process.argv.slice(2), out = { note: "LC-1 replay data (positions in mm, world frame: x forward along the run, y up, z = −pitch y)", sequences: [] };
for (const spec of SPECS) { const [name, offDir, onDir, cs, vOff, vOn, k0s, k1s] = spec.split("|"), k0 = +k0s, k1 = +k1s, seq = { name, case: cs, k0, k1, versions: {} };
  for (const [ver, dir, vf] of [["V1.3", offDir, vOff], ["LC-1", onDir, vOn]]) { const R = loadAir(dir, `${cs}_LOCO.json.gz`), mp = makeMapper(R, { knee: "RK", rf1: true }), idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i]));
    if (!seq.bones) { seq.bones = R.bones.map(b => ({ name: b.name, parent: b.parent })); seq.speed = +Math.hypot(R.rows[k1][10], R.rows[k1][11]).toFixed(2); const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"); seq.contactTick = ev.length ? ev[0].tick : null; seq.gameplayHash = R.gameplayHash; }
    const VJ = vf && fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf))[cs] : null, validSet = new Set(VJ ? VJ.valid.map(x => x.k) : []), fr = [];
    const com = {}; for (let k = k0 - 1; k <= k1 + 1; k++) com[k] = comOf(mp.poseAt(k).S);
    for (let k = k0; k <= k1; k++) { const p = R.pres[k], w = p.world, J = R.bones.map((b, i) => [w[i][12], w[i][13], w[i][14]]), lc = p.lc, dg = p.dg || {};
      const F = 1 + (com[k + 1][1] - 2 * com[k][1] + com[k - 1][1]) * 3600 / 9.81;
      const feet = {}; for (const [n, sd] of [[0, "L"], [1, "R"]]) { const lf = lc && lc.feet ? lc.feet[sd] : null; feet[sd] = lf && lf.cont ? { c: lf.contact ? 1 : 0, m: lf.mode, a: lf.P ? lf.P.map(mm) : null } : { c: p.feet[n].contact ? 1 : 0, m: p.feet[n].mode, a: null }; }
      fr.push({ k, j: J.map(v => v.map(mm)), pel: J[idx.pelvis].map(mm), com: com[k].map(mm), F: +F.toFixed(2), feet, valid: validSet.has(k) ? 1 : 0, root: [mm(R.rows[k][8]), mm(-R.rows[k][9])], flight: dg.flight ? 1 : 0 }); }
    seq.versions[ver] = { frames: fr, validCount: fr.filter(f => f.valid).length }; }
  out.sequences.push(seq); console.log(name, "frames", k1 - k0 + 1, "valid V1.3", seq.versions["V1.3"].validCount, "LC-1", seq.versions["LC-1"].validCount); }
fs.writeFileSync(OUT, JSON.stringify(out));
