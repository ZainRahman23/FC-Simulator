// REV1 §5 tests on every pre-contact frame of every distinct V1.3 record: MC-1 … MC-6 for R-K vs PM-2 (each frame as a promotion frame), the F-2 bound
// at IK-switch frames, and RF-1 TR-1 … TR-4 (each frame as a promotion frame, the transition over the next T_b).
// usage (worktree root): V13_WT=<v1.3 worktree> node .../mapping_test.mjs <out.json> <airDir> [<airDir> ...]
import fs from "fs";
const M = await import(new URL("./pcg_rev1.mjs", import.meta.url).href), M0 = await import(new URL("../../trackB/scripts/pcg_f0.mjs", import.meta.url).href);
const { V, Q, B, bi, loadAir, rigGeom, makeMapper, geomRowsRev1, kinRowsRev1, TB_TICKS, L } = M; const D = 180 / Math.PI;
const [OUT, ...DIRS] = process.argv.slice(2), seen = new Set(), rows = [], twice = [];
const cls = (v) => v < 0.18 ? "standing" : v < 4 ? "jog" : v < 6.5 ? "run" : "sprint";
for (const dir of DIRS) { const summ = JSON.parse(fs.readFileSync(dir + "/air_summary.json")).summary;
  for (const cs of Object.keys(summ)) { const h = summ[cs].LOCO && summ[cs].LOCO.gameplayHash; if (!h || seen.has(h)) continue; seen.add(h);
    const R = loadAir(dir, `${cs}_LOCO.json.gz`), G = rigGeom(R), first = R.events.find(e => e.kind === "PLAYER_CONTACT"), last = Math.min(R.pres.length - TB_TICKS - 1, first ? first.tick - 2 : R.pres.length - 1);
    const rkC = [], rkP = (k) => rkC[k] || (rkC[k] = M0.pose(R, k, "F")), pm = makeMapper(R, { knee: "PM2", rf1: false }), pmF = makeMapper(R, { knee: process.env.RF1_KNEE || "PM2", rf1: true });
    if (twice.length < 2) { const pm2b = makeMapper(R, { knee: process.env.RF1_KNEE || "PM2", rf1: true }); twice.push(JSON.stringify([10, 20, 30].map(k => pmF.poseAt(k).S)) === JSON.stringify([10, 20, 30].map(k => pm2b.poseAt(k).S))); }
    for (let k = 2; k <= last; k++) { const row = R.rows[k], v = Math.hypot(row[10], row[11]), ph = row[13];
      const gR = M0.geomRows(R, k, rkP(k), G), kR = M0.kinRows(R, k, rkP), gP = M0.geomRows(R, k, pm.poseAt(k), G), kP = M0.kinRows(R, k, pm.poseAt);
      const mc = (g, kk) => ({ MC1: g.fails.filter(f => /^P4/.test(f)), MC2: g.fails.filter(f => /^P6|^P7/.test(f)), MC3: kk.fails.filter(f => /^P14|^P15/.test(f)), MC4: g.fails.filter(f => /^P12/.test(f)), MC6: kk.fails.filter(f => /^P16|^P17/.test(f)), p15: kk.P15_angVelRadS, p15body: kk.P15_body, p4ankle: g.P4_ankleMm, p4knee: g.P4_kneeMm, twist: g.P7_twistDeg });
      // RF-1 transition with promotion at k: rows over [k, k + T_b]
      const tr = []; for (let j = k; j <= k + TB_TICKS; j++) { const g = geomRowsRev1(R, j, k, pmF, G), kk = kinRowsRev1(R, j, k, pmF); tr.push({ j, fails: [...g.fails.filter(f => /^P9|^P10|^P11|^P1_|^P2_/.test(f)), ...kk.fails.filter(f => /^TR1|^P16|^P17/.test(f))], pitch: g.foot, inc: kk.TR1_footIncDeg, w: kk.TR1_footAngVelRadS }); }
      const info = pm.poseAt(k).info, rkInfo = rkP(k).rk;
      rows.push({ cs, k, cls: cls(v), phase: +ph.toFixed(3), RK: mc(gR, kR), PM2: mc(gP, kP), pm2: { L: info.L, R: info.R }, tr: { failFrames: tr.filter(t => t.fails.length).length, items: [...new Set(tr.flatMap(t => t.fails))], maxInc: Math.max(...tr.map(t => t.inc || 0)), maxW: Math.max(...tr.map(t => t.w || 0)), pitch0: tr[0].pitch } }); } } }
// summaries
const S = { determinism: twice.every(Boolean), byClass: {} };
for (const c of ["jog", "run", "sprint", "standing"]) { const F = rows.filter(r => r.cls === c); if (!F.length) continue; const cnt = (sel) => F.filter(sel).length, mx = (f) => Math.max(...F.map(f));
  S.byClass[c] = { frames: F.length,
    RK: { MC1: cnt(r => r.RK.MC1.length), MC2: cnt(r => r.RK.MC2.length), MC3: cnt(r => r.RK.MC3.length), MC4: cnt(r => r.RK.MC4.length), MC6: cnt(r => r.RK.MC6.length), allMC: cnt(r => !r.RK.MC1.length && !r.RK.MC2.length && !r.RK.MC3.length && !r.RK.MC4.length && !r.RK.MC6.length), maxP15: mx(r => r.RK.p15) },
    PM2: { MC1: cnt(r => r.PM2.MC1.length), MC2: cnt(r => r.PM2.MC2.length), MC3: cnt(r => r.PM2.MC3.length), MC4: cnt(r => r.PM2.MC4.length), MC6: cnt(r => r.PM2.MC6.length), allMC: cnt(r => !r.PM2.MC1.length && !r.PM2.MC2.length && !r.PM2.MC3.length && !r.PM2.MC4.length && !r.PM2.MC6.length), maxP15: mx(r => r.PM2.p15), maxAnkleMm: mx(r => r.PM2.p4ankle), maxTwistDeg: mx(r => r.PM2.twist) },
    RF1: { promotionsWithCleanTransition: cnt(r => r.tr.failFrames === 0), items: Object.fromEntries([...new Set(F.flatMap(r => r.tr.items))].map(i => [i, cnt(r => r.tr.items.includes(i))])), maxFootIncDeg: mx(r => r.tr.maxInc), maxFootAngVel: mx(r => r.tr.maxW) } }; }
fs.writeFileSync(OUT, JSON.stringify({ summary: S, rows }, null, 1)); console.log(JSON.stringify(S, null, 1));
