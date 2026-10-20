// tc_playtest1/tools/pt_probe.mjs — a scripted run printed: the actions chosen (with the resolver's top candidates), every contact, the speed and the
// ball's separation over time. node pt_probe.mjs <scenario>
import { makeSim, runScript } from "./pt_env.mjs";
const SC = {
  run: [{ t: 0.2, keys: "W" }],
  sprint: [{ t: 0.2, keys: "W", mode: "SPRINT" }],
  sprintA: [{ t: 0.2, keys: "W", mode: "SPRINT" }, { t: 2.6, keys: "A" }],
  sprintS: [{ t: 0.2, keys: "W", mode: "SPRINT" }, { t: 2.6, keys: "S" }],
  runA: [{ t: 0.2, keys: "W" }, { t: 2.2, keys: "A" }],
  runWA: [{ t: 0.2, keys: "W" }, { t: 2.2, keys: "WA" }],
  wd: [{ t: 0.2, keys: "W" }, { t: 1.8, keys: "WD" }, { t: 2.3, keys: "D" }, { t: 2.9, keys: "SD" }, { t: 3.5, keys: "S" }],
  wdwa: [{ t: 0.2, keys: "W" }, { t: 1.8, keys: "D" }, { t: 2.6, keys: "W" }, { t: 3.4, keys: "A" }],
  stop: [{ t: 0.2, keys: "W" }, { t: 2.0, keys: "" }],
  walk: [{ t: 0.2, keys: "W", mode: "WALK" }],
  back: [{ t: 0.2, keys: "S" }],
};
const id = process.argv[2] || "run", dur = +(process.argv[3] || 5), sim = makeSim({}), rows = []; let lastA = null, lastV = 0; const tr = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
const t0 = performance.now();
runScript(sim, SC[id], dur, (s, k) => { const a = s.plan.action; if (tr && s.plan.v !== lastV && s.t >= tr[0] && s.t <= tr[1]) rows.push(`    replan ${s.t.toFixed(3)} (${s.plan.reason}) [${s.plan.prog.kind}${s.plan.prog.hold ? " hold→" + s.plan.prog.hold.until.toFixed(2) : ""}${s.plan.prog.kind === "chase" ? " " + s.plan.prog.speed.toFixed(1) + "→" + s.plan.prog.until.toFixed(2) : ""} v@+.3 ${s.stateAt(s.t + 0.3, s.plan).s.toFixed(2)}] → ${a.label}${a.m ? (a.m > 0 ? " R" : " L") : ""} · ${(s.plan.why || []).map((w) => w.label + " " + w.J + (w.note ? " [" + w.note + "]" : "")).join(" | ")} · contacts ${s.plan.contacts.filter((c) => !c.done).map((c) => `${c.role}@+${(c.t - s.t).toFixed(2)}${c.F}`).join(",")}`); lastV = s.plan.v; if (a.id !== lastA) { lastA = a.id; rows.push(`  ${s.t.toFixed(3)} ACTION ${a.label}${a.m ? (a.m > 0 ? " R" : " L") : ""}${a.tech ? ` tC +${(a.tC - s.t).toFixed(2)} turn ${a.turnDeg.toFixed(0)}° ${a.setTouch ? "set" : "rolling"}` : ""} · why: ${(s.plan.why || []).map((w) => w.label + " " + w.J + (w.note ? " [" + w.note + "]" : "")).join(" | ")}`); }
  if (k % 48 === 0) { const h = s.hud(); rows.push(`  t ${s.t.toFixed(2)} v ${h.speed.toFixed(2)} sep ${h.sep.toFixed(2)} ball ${h.ballSpeed.toFixed(2)} face ${(h.facing * 57.3).toFixed(0)} travel ${(h.travel * 57.3).toFixed(0)} ${h.phase}`); } });
console.log(`${id}: ${((performance.now() - t0)).toFixed(0)} ms for ${dur} s · replans ${sim.log.plans} · replan cpu mean ${(sim.cpu.replan.reduce((a, b) => a + b, 0) / sim.cpu.replan.length).toFixed(2)} ms max ${Math.max(...sim.cpu.replan).toFixed(2)} ms`);
console.log(rows.join("\n"));
for (const c of sim.contacts) console.log(`  contact ${c.n} t ${c.t.toFixed(3)} ${c.F} ${c.surface} ${c.role} [${c.tech}] in ${Math.hypot(...c.vIn).toFixed(2)} out ${Math.hypot(...c.vOut).toFixed(2)} @ ${c.actualH != null ? (c.actualH * 57.3).toFixed(0) : "—"}° ${c.missed ? "MISSED" : ""}`);
