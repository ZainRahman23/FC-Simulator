// ═══ physchar2/tools/b_ledger_table.mjs — INVESTIGATION B: markdown per-tick energy ledger from a b_capture.mjs JSON (all terms, whole body) ═══
// Columns: ΔE = ΔKE + ΔPE + ΔU; ΔKE split by impulse source (work at the mid-step velocity: gravity, contact (exact per-body residual), joint
// point constraints, engine limit parts (hard stop), passive drive rows (elastic tissue + viscous damping, Jolt motors), explicit passive torque
// pairs, gyroscopic / inertia-frame terms); ΔU and ΔPE split into velocity integration and POSITION-SOLVER correction; warm-start (previous
// accumulated) joint lambdas; speculative manifolds; the largest position-solver move; joint separation; engine-stop activity.
// usage: node tools/b_ledger_table.mjs <ledger.json> [--joint=ankle_L]
import fs from "fs";
const R = JSON.parse(fs.readFileSync(process.argv[2])), jn = (process.argv.find(a => a.startsWith("--joint=")) || "").split("=")[1];
const f = (x, n = 3) => (x == null || !isFinite(x) ? "—" : (Math.abs(x) < 0.5 * 10 ** -n ? (0).toFixed(n) : (+x).toFixed(n)));
console.log(`**${R.human} ${R.key}, ${R.hz} Hz, ${R.vel}/${R.pos} iterations, k = ${R.kNeutral} N·m/°; first bad step ${R.event - 1} → ${R.event} (+${R.rise.toFixed(3)} J).** Work in J per step.\n`);
console.log("| step → | ΔE | ΔKE | W grav | W contact | W joint point | W hard-stop parts | W passive drives | W explicit torques | W gyro + frame | ΔPE integ. / pos-corr | ΔU integ. / pos-corr | largest pos-corr move | sep (mm) | speculative manifolds | warm-start Σ|λ| joints | hard-stop parts active |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const l of R.ledger) {
  const S = (k) => l.bodies.reduce((a, b) => a + b.W[k], 0), dK = l.bodies.reduce((a, b) => a + b.dKt + b.dKr, 0), pl = l.posLedger, top = pl.bodies.slice().sort((a, b) => b.corrMm - a.corrMm)[0];
  const spec = l.contacts.filter(c => c.depth < 0).length, ws = l.joints.reduce((a, j) => a + Math.abs(j.lamPrev.p[0]) + Math.abs(j.lamPrev.p[1]) + Math.abs(j.lamPrev.p[2]) + j.lamPrev.r.reduce((s, x) => s + Math.abs(x), 0) + j.lamPrev.m.reduce((s, x) => s + Math.abs(x), 0), 0);
  const act = l.joints.filter(j => j.limActive.x || j.limActive.y || j.limActive.z).map(j => j.name + ":" + ["x", "y", "z"].filter(a => j.limActive[a]).join("")).join(" ");
  console.log(`| ${l.n1}${l.n1 === R.event ? " **EVENT**" : ""} | ${f(l.dE)} | ${f(dK)} | ${f(S("grav"))} | ${f(S("contact"))} | ${f(S("joint"))} | ${f(S("limit"))} | ${f(S("motor"))} | ${f(S("texp"))} | ${f(S("gyro") + S("frame"))} | ${f(pl.dPE_integration)} / ${f(pl.dPE_positionCorrection)} | ${f(pl.dU_integration)} / ${f(pl.dU_positionCorrection)} | ${top ? `${top.name} ${f(top.corrMm, 2)} mm / ${f(top.corrDeg, 2)}°` : "—"} | ${f(l.sepMm, 2)} | ${spec}/${l.contacts.length} | ${f(ws, 3)} | ${act || "—"} |`);
}
console.log("\nRestitution is 0 by configuration (spec §15.4) on every manifold. Contact work is the exact per-body residual (all contact impulses of the body, normal + friction).");
if (jn) { console.log(`\n**${jn}** per step: passive potential U before / after velocity integration / after the position solver, and the drive rows' work`);
  console.log("| step → | U₀ | U predicted | U₁ | W drive rows (x / y / z) | W hard-stop parts | point-constraint λ (N·s) |"); console.log("|---|---|---|---|---|---|---|");
  for (const l of R.ledger) { const j = l.joints.find(x => x.name === jn), u = l.posLedger.joints.find(x => x.name === jn);
    console.log(`| ${l.n1} | ${u ? f(u.U0) : "≈0"} | ${u ? f(u.Upred) : "≈0"} | ${u ? f(u.U1) : "≈0"} | ${j.Wmot.map(x => f(x)).join(" / ")} | ${f(j.Wlim.reduce((a, b) => a + b, 0))} | ${j.lam.p.map(x => f(x, 3)).join(", ")} |`); } }
