// PVP-1 investigation probe (the recipient TWIN alone; used during the recipient design, see PVP1_LOG.md §2). The recipient is handed off at RUN-1
// frame kH in its local frame (placed 10 m clear of the parked tackler), run for N steps with the given recipient options; prints touchdowns and a
// 0.05 s table (COM velocity vs RUN-1 plan, COM height, trunk tilt, feet, other turf contacts). usage (worktree root):
//   node pvp1_twin_probe.mjs <kH> <steps> '<recipient opts json>' [out.json.gz]
const R0 = new URL("../../", import.meta.url).href;
const L = await import(R0 + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, B, bi } = L;
const REC = await import(R0 + "pvp1_running/scripts/pvp1_recipient.mjs"), W = await import(R0 + "pvp1_running/scripts/pvp1_world.mjs");
const S = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/";
const kH = +(process.argv[2] || 722), actR = +(process.env.ACTR || 0), steps = +(process.argv[3] || 840), opts = process.argv[4] ? JSON.parse(process.argv[4]) : {}, out = process.argv[5];
const run = REC.loadRun(S + "pvp1/run1r_4.147.json"), H = REC.handoff(run, kH), qR = [0, 0, 0, 1], CO = REC.continuation(H, steps / 240 + 0.2, 0.06, qR);
console.log("handoff t", H.tH, "airborne", H.airborne, "stance", JSON.stringify(H.stance), "comVel", H.E.comVel.map(x => x.toFixed(2)), "GRF BW", H.initGRF.BW.map(x => x.toFixed(2)), "stances", JSON.stringify(CO.stances.map(s => [s.side, +s.t0.toFixed(3), +s.t1.toFixed(3)])));
const o = await W.runPVP({ kind: "F3", runinT: S + "sp2a/run1g_4.608.json", R: { H, CO, qR, offR: [10, 0, 0], opts, actR }, steps, twin: true });
console.log("hash", o.finalHash, "wall", (o.wallMs / 1000).toFixed(1), "stop", JSON.stringify(o.stop));
const tR = (r) => r.t - actR / 240;
const turf = (r) => r.contacts.filter(c => c.kind.startsWith("turf") && c.Jn > 0 && ((c.a === "turf" ? c.b : c.a)[0] === "runner")).map(c => (c.a === "turf" ? c.b : c.a)[1]);
let prev = { L: false, R: false }; const tds = [];
for (const r of o.recs) { const cs = turf(r); for (const s of ["L", "R"]) { const on = cs.includes("foot_" + s); if (on && !prev[s]) tds.push(s + "@" + r.t.toFixed(3)); prev[s] = on; } }
console.log("touchdowns (phys)", tds.join(" "));
for (const r of o.recs) { if (Math.round(r.t * 240) % 12 || r.t > 1.3) continue; const S2 = r.S.slice(0, 14), com = L.comOf(S2), P = r.chars.runner.P, v = V.sc(P, 1 / L.M), c = CO.at(r.t), th = S2[bi("thorax")], up = Q.rot(th.rot, [0, 1, 0]), fw = Q.rot(S2[0].rot, [0, 0, 1]);
  const cs = turf(r), oth = cs.filter(x => !x.startsWith("foot_"));
  console.log(r.t.toFixed(2), "v", v.map(x => x.toFixed(2)).join(","), "plan v", [c.vx, c.vy, c.vz].map(x => x.toFixed(2)).join(","), "comY", com[1].toFixed(3), "plan", c.y.toFixed(3), "trunk tilt", (Math.acos(up[1]) * 180 / Math.PI).toFixed(1), "pelvis fwd y", fw[1].toFixed(2), "feet", ["L", "R"].filter(s => cs.includes("foot_" + s)).join(""), oth.length ? "OTHER " + oth.join(",") : ""); }
if (out) L.writeGz(out, o);
