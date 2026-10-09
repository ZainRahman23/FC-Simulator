// READ-ONLY: the authoritative runner acceleration (60 Hz backward difference of the recorded root velocity) over the promotion windows; and facing rate
const WT = process.env.PCV2; const M = await import(WT + "/review_artifacts/physical_character_v2/pi1/rev1/scripts/pcg_rev1.mjs"); const { loadAir } = M.L;
const [DIR, ...CS] = process.argv.slice(2);
for (const cs of CS) { const R = loadAir(DIR, `${cs}_LOCO.json.gz`), ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), kc = ev.length ? ev[0].tick : null; const a = [], fr = [];
  for (let k = 36; k < Math.min(R.rows.length, (kc || 62) + 1); k++) { const r = R.rows[k], q = R.rows[k - 1]; a.push(+(Math.hypot(r[10] - q[10], r[11] - q[11]) * 60).toFixed(2)); fr.push(+(((r[12] - q[12] + Math.PI) % (2 * Math.PI) - Math.PI) * 60).toFixed(2)); }
  console.log(cs, "contact tick", kc, "| |a_T| m/s² k=36..", a.join(" "), "| facing rate rad/s", fr.join(" "), "| speed", Math.hypot(R.rows[40][10], R.rows[40][11]).toFixed(3), "mass", JSON.stringify(R.mass)); }
