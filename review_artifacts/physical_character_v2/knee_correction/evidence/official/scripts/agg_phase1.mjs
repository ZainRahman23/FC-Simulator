import fs from "fs"; const C = "/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad/kc", rd = (f) => JSON.parse(fs.readFileSync(f));
const out = { kv6c: [], kv10: [], flags: [] };
// KV6c
for (const f of fs.readdirSync(C + "/ctrl").filter(f => f.endsWith(".json")).sort()) { const r = rd(C + "/ctrl/" + f);
  out.kv6c.push({ human: r.human, policy: r.policy, model: r.model, k: r.k, outcome: r.outcome, fell: r.fell, slipMm: +r.slipMm.toFixed(3), pass: r.pass, passFrom1s: r.passFrom1s,
    knees: r.knees.map(k => ({ side: k.side, flex: [+k.flexMin.toFixed(1), +k.flexMax.toFixed(1)], devMax: +(k.devMax || 0).toFixed(2), devFrom1s: +(k.devMaxAfter1s || 0).toFixed(2), boundMargin: Number.isFinite(k.boundMargin) ? +k.boundMargin.toFixed(1) : null, Wact: +k.Wact.toFixed(3), Wpas: +k.Wpas.toFixed(3) })) }); }
const v2 = out.kv6c.filter(r => r.model === "v2k"); console.log(`KV6c: ${v2.filter(r => r.pass).length} / ${v2.length} v2k runs pass (from 1 s: ${v2.filter(r => r.passFrom1s).length}); old comparator outcomes: ${[...new Set(out.kv6c.filter(r => r.model === "old").map(r => r.outcome))].join("/")}`);
for (const r of out.kv6c) console.log(`  ${r.model} ${r.human} ${r.policy} k ${r.k}: ${r.outcome}, slip ${r.slipMm} mm, ` + r.knees.map(k => `${k.side} flex ${k.flex.join("–")} dev ${k.devMax} (1 s: ${k.devFrom1s}) margin ${k.boundMargin} Wact ${k.Wact} Wpas ${k.Wpas}`).join("; ") + (r.model === "v2k" ? ` → ${r.pass ? "PASS" : "FAIL"}` : ""));
// KV10
const Y = fs.readdirSync(C + "/yaw").filter(f => f.endsWith(".json")).map(f => rd(C + "/yaw/" + f)), key = (r) => `${r.scen} ${r.human} ${r.policy} ${r.k}`;
for (const r of Y) for (const [sd, x] of Object.entries(r.sides)) out.kv10.push({ scen: r.scen, human: r.human, policy: r.policy, k: r.k, model: r.model, side: sd, outcome: r.outcome, peak: Object.fromEntries(Object.entries(x.peak).map(([a, b]) => [a, +b.toFixed(2)])), kneeShare: +x.kneeShare.toFixed(3), closure: +x.closureMaxDeg.toFixed(2), slipMm: +x.slipMaxMm.toFixed(2), footYaw: +x.footYawMaxDeg.toFixed(2), outSoft: x.outSoftDeg, outHard: x.outHardDeg });
for (const v of out.kv10.filter(r => r.model === "v2k")) { const o = out.kv10.find(r => r.model === "old" && key(r) === key(v) && r.side === v.side); const fl = [];
  if (v.closure > 0.3) fl.push(`closure ${v.closure}°`); if (v.slipMm > 0.5) fl.push(`slip ${v.slipMm} mm`); if (v.footYaw > 0.5) fl.push(`foot yaw ${v.footYaw}°`);
  for (const n of ["ankle", "knee", "hip"]) { if ((v.outSoft[n] || 0) > 0.05 && (!o || (o.outSoft[n] || 0) <= 0.05)) fl.push(`${n} leaves its soft range (${v.outSoft[n].toFixed(2)}°) where the old knee did not`); if ((v.outHard[n] || 0) > 0.05 && (!o || (o.outHard[n] || 0) <= 0.05)) fl.push(`${n} beyond bound (${v.outHard[n].toFixed(2)}°)`); }
  if (v.kneeShare > 0.30) fl.push(`knee share ${(100 * v.kneeShare).toFixed(0)} %`);
  if (fl.length) out.flags.push({ cfg: key(v) + " " + v.side, flags: fl }); }
const sh = (m, sc) => { const a = out.kv10.filter(r => r.model === m && r.scen === sc), mean = (k) => a.reduce((s, r) => s + Math.abs(r.peak[k]), 0) / Math.max(1, a.length); return `pelvis ${mean("pelvis").toFixed(2)}°: ground ${mean("ground").toFixed(2)}, ankle ${mean("ankle").toFixed(2)}, knee ${mean("knee").toFixed(2)}, hip ${mean("hip").toFixed(2)}, upper ${mean("upper").toFixed(2)} (knee share max ${(100 * Math.max(...a.map(r => r.kneeShare))).toFixed(0)} %)`; };
for (const sc of ["A", "B"]) for (const m of ["old", "v2k"]) console.log(`KV10 ${sc} ${m} mean |contribution| at peak: ${sh(m, sc)}`);
console.log(`KV10 flags (${out.flags.length}):`); for (const f of out.flags) console.log("  " + f.cfg + ": " + f.flags.join("; "));
fs.writeFileSync(C + "/phase1_summary.json", JSON.stringify(out, null, 1));
