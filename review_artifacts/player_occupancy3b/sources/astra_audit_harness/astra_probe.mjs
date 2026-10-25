// READ-ONLY audit harness: runs Astra Physical Duel V2 (unmodified, imported from its folder) and measures each run two ways —
// Astra's own capsules, and Stage 1's mesh-measured occupancy volumes applied to Astra's posed joints. Writes nothing into either codebase.
//   node astra_probe.mjs [--sweep]
const AST = "file:///Users/zainrahman/Documents/Codex/2026-10-19/files-pasted-by-the-user-touchline/work/physical-duel-v2/";
const S3 = "file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/player-occupancy-v1/sandbox/visual/";
const { env } = await import(AST + "env-node.mjs");
const { DuelSim } = await import(AST + "sim.js");
const { PRESETS } = await import(AST + "presets.js");
const { detect, capsules } = await import(AST + "contact.js");
const { volumesOf, detect: detect3 } = await import(S3 + "occupy1/o_volumes.js");
const DT = 1 / 240, hyp = Math.hypot;
const EQ = [{ height: 176, mass: 73, strength: 70 }, { height: 176, mass: 73, strength: 70 }];
const LEGK = ["LEG", "FOOT"], isLeg3 = (id) => /^(THIGH|SHIN)_/.test(id), isTrunk3 = (id) => /^(PELVIS|WAIST|CHEST)$/.test(id);
export function probe(name, opts = {}, secs = 6) {
  const s = new DuelSim(env, name, Object.assign({ profiles: EQ }, opts)), A = s.actors[0], B = s.actors[1];
  const o = { name, corridorOff: !!opts.disableCorridor, astLeg: 0, astUpper: 0, mesh: { torso: 0, legs: 0, thighThigh: 0, shinShin: 0, thighShin: 0, legTrunk: 0 }, meshLegTicks5: 0,
    falls: 0, fallTicks: 0, blockedTicks: 0, anchorLostTicks: 0, unreachableTicks: 0, physBlocks: 0, kneeAvoidMax: 0, tension: 0, limbReaction: 0, states: {}, maxLateral: [0, 0], maxBehind: [0, 0], maxAhead: [0, 0] };
  for (let k = 0; k < secs / DT; k++) { s.step();
    for (const c of detect(A, B)) { const leg = LEGK.includes(c.ca.kind) || LEGK.includes(c.cb.kind); if (leg) o.astLeg = Math.max(o.astLeg, -c.gap); else o.astUpper = Math.max(o.astUpper, -c.gap); }
    const P = detect3(volumesOf(A.frame.J), volumesOf(B.frame.J), { within: 0 }).filter((x) => x.both); let legT = 0;
    for (const x of P) { const pen = x.pen; if (isTrunk3(x.A) && isTrunk3(x.B)) o.mesh.torso = Math.max(o.mesh.torso, pen); else { o.mesh.legs = Math.max(o.mesh.legs, pen); legT = Math.max(legT, pen);
      const ka = x.A.slice(0, 5), kb = x.B.slice(0, 5); if (ka === "THIGH" && kb === "THIGH") o.mesh.thighThigh = Math.max(o.mesh.thighThigh, pen); else if (ka === "SHIN_" && kb === "SHIN_") o.mesh.shinShin = Math.max(o.mesh.shinShin, pen); else if (isLeg3(x.A) && isLeg3(x.B)) o.mesh.thighShin = Math.max(o.mesh.thighShin, pen); else o.mesh.legTrunk = Math.max(o.mesh.legTrunk, pen); } }
    if (legT > 0.05) o.meshLegTicks5++;
    for (const [i, a] of [A, B].entries()) { const st = a.supportStatus || {}; if (a.fall) o.fallTicks++; if (st.blocked) o.blockedTicks++; if (st.anchorLost) o.anchorLostTicks++; if (st.recoveryReachable === false) o.unreachableTicks++;
      if (Object.values(a.obstructed || {}).some((q) => Math.abs(q.t - s.t) < 1e-8)) o.physBlocks++; o.kneeAvoidMax = Math.max(o.kneeAvoidMax, ...Object.values(a.kneeAvoid || { L: 0 }).map((v) => v * 180 / Math.PI));
      const f = [Math.cos(a.psi), Math.sin(a.psi)], d = [a.P[0] - a.intentPosition[0], a.P[1] - a.intentPosition[1]], fw = d[0] * f[0] + d[1] * f[1], lat = -d[0] * f[1] + d[1] * f[0];
      o.maxLateral[i] = Math.max(o.maxLateral[i], Math.abs(lat)); o.maxBehind[i] = Math.max(o.maxBehind[i], -fw); o.maxAhead[i] = Math.max(o.maxAhead[i], fw); }
    o.tension += s.pair.supportTension || 0; o.limbReaction += s.pair.limbReaction || 0; o.states[s.pair.state] = (o.states[s.pair.state] || 0) + 1; }
  o.falls = s.stats.falls; o.support = s.actors.map((a) => { const E = a.support.events; return { lands: E.filter((e) => e.type === "land").length, loadRecovery: E.filter((e) => e.type === "lift" && e.family === "LOAD_RECOVERY").length, replacement: E.filter((e) => e.type === "lift" && e.family === "REPLACEMENT_STEP").length, blockedPlant: E.filter((e) => e.type === "blocked-plant").length, retime: E.filter((e) => e.type === "retime").length }; });
  o.corridorResponses = s.actors.map((a) => a.corridors ? Object.values(a.corridors).map((c) => c.response).join("/") : "—");
  o.ownCross = 0; o.final = s.actors.map((a) => ({ P: a.P.map((v) => +v.toFixed(3)), V: a.V.map((v) => +v.toFixed(2)) }));
  return o; }
const r1 = (v) => (100 * v).toFixed(1);
if (process.argv[1] && process.argv[1].endsWith("astra_probe.mjs")) {
  // the radii
  { const s = new DuelSim(env, "EQUAL_PARALLEL_RUN", { profiles: EQ }), C = capsules(s.actors[0]); const seen = {}; for (const c of C) { const k = c.kind + (c.segment ? "/" + c.segment : ""); if (!seen[k]) seen[k] = c.r; }
    console.log("ASTRA CAPSULE RADII (176 cm body), cm:", Object.entries(seen).map(([k, r]) => `${k} ${r1(r)}`).join(" · "));
    const b = s.actors[0].body.b; console.log("  body dims: thigh", b.thigh.toFixed(3), "shank", b.shank.toFixed(3), "shoulderX", b.shoulderX.toFixed(3), "legLen", b.legLen.toFixed(3)); }
  const names = process.argv.includes("--sweep") ? [] : process.argv.includes("--all") ? Object.keys(PRESETS) : ["EQUAL_PARALLEL_JOG", "EQUAL_PARALLEL_RUN", "EQUAL_PARALLEL_SPRINT", "ONE_INWARD", "GLANCING", "ANGLE_5", "ANGLE_15", "ANGLE_30", "ANGLE_45", "ANGLE_60", "CROSSING", "FRONT_COLLISION", "REAR_CROSSING", "BACK_CONTACT", "HIP_BUMP", "STATIONARY_HIT", "STATIONARY_B", "STR99_MOMENTUM", "FRONT_TRANSITION", "OVERTAKE"];
  console.log("\npreset | corridor | ASTRA caps: legs upper (cm) | MESH volumes on Astra's joints: torso legs [thigh-thigh shin-shin thigh-shin leg-trunk] ticks>5cm | phys blocks · tension N·s · limb reaction cm · knee-avoid° | blocked/anchorLost/unreachable ticks · falls | support (lands, load-recovery, replacement, blocked plant) | max lateral / behind (cm) A,B");
  for (const n of names) for (const off of [false, true]) { const o = probe(n, { disableCorridor: off });
    console.log(`${n.padEnd(20)} ${off ? "OFF" : "on "} | ${r1(o.astLeg)} ${r1(o.astUpper)} | ${r1(o.mesh.torso)} ${r1(o.mesh.legs)} [${r1(o.mesh.thighThigh)} ${r1(o.mesh.shinShin)} ${r1(o.mesh.thighShin)} ${r1(o.mesh.legTrunk)}] ${o.meshLegTicks5} | ${o.physBlocks} · ${o.tension.toFixed(2)} · ${r1(o.limbReaction)} · ${o.kneeAvoidMax.toFixed(0)} | ${o.blockedTicks}/${o.anchorLostTicks}/${o.unreachableTicks} · ${o.falls} | ${o.support.map((x) => `${x.lands},${x.loadRecovery},${x.replacement},${x.blockedPlant}`).join(" ")} | ${o.maxLateral.map(r1).join(",")} / ${o.maxBehind.map(r1).join(",")}`); }
  if (process.argv.includes("--sweep")) { // can the fall gate fire at all in the simulation? configs across angles, speeds, inward pressure, corridor on/off
    let runs = 0, fallRuns = 0, maxUnsup = 0; const hits = [];
    for (const angle of [0, 30, 60, 90, 120, 150, 180]) for (const speed of [0, 3, 6, 9]) for (const inward of [0, 0.6, 1.2]) for (const off of [false, true]) {
      PRESETS.__SW = { label: "sweep", speed: Math.max(speed, 0.01), angle: angle || undefined, pressure: inward, spacing: 0.4 };
      const cfg = [{ angle: 0, speed: 6, side: "R", inward }, { angle, speed, side: "L", inward }];
      const s = new DuelSim(env, "__SW", { profiles: EQ, disableCorridor: off, config: cfg }); let fell = 0; for (let k = 0; k < 4 / DT; k++) { s.step(); for (const a of s.actors) { maxUnsup = Math.max(maxUnsup, a.unsupportedTime || 0); if (a.fall) fell++; } }
      runs++; if (fell) { fallRuns++; hits.push(`${angle}° ${speed} m/s inward ${inward} corridor ${off ? "OFF" : "on"}: ${fell} fall ticks`); } }
    console.log(`\nFALL-GATE SWEEP: ${runs} runs (4 s each, 7 angles × 4 speeds × 3 pressures × corridor on/off): ${fallRuns} with any fall tick; longest unsupported time ${(maxUnsup * 1000).toFixed(0)} ms (gate needs > 160 ms)`); for (const h of hits.slice(0, 20)) console.log("  " + h); }
}
