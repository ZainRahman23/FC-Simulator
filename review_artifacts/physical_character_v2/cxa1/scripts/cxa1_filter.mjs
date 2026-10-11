// CXA-1 collision-filtering check (read-only): builds the PVP-1A two-character world exactly as the plant does (combined spec in an unmodified V2JoltWorld,
// G1_WORLD settings) and queries Jolt's own filters: the group filter table for every body pair (cross-character and within-character), each body's
// object layer and motion quality, and the contact settings (speculative distance, penetration slop, Baumgarte). The plant's validate callback accepts
// every pair in N2 (it rejects cross pairs only in C0 / X2 and, in ABI-1 EXT, non-leg cross pairs by design) — stated from the code, not re-run here.
// usage: V2_KNEE_MODEL=v2k node cxa1_filter.mjs <out.json>
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V2JoltWorld, loadJolt } = await import(PL.P2 + "core/v2_jolt.js"), { G1_WORLD } = await import(PL.P2 + "gates/v2_g1.js");
const J = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js"), sR = PL.SPEC_R(), sT = PL.SPEC_T(), comb = PL.combine(sR, sT), nR = sR.bodies.length;
const w = new V2JoltWorld(J, comb, { ...comb.contact }, { velSteps: G1_WORLD.velSteps, posSteps: G1_WORLD.posSteps, ccd: G1_WORLD.ccd, gravity: -9.81, recordContacts: true, actuators: true });
const out = { tool: "cxa1_filter.mjs", crossPairs: { enabled: 0, disabled: [] }, withinPairs: { total: 0, disabled: [] }, specDisabledPairs: comb.disabledPairs.length };
for (let i = 0; i < comb.bodies.length; i++) for (let j = i + 1; j < comb.bodies.length; j++) { const cross = (i < nR) !== (j < nR), e = w.gft.IsCollisionEnabled(i, j), nm = `${comb.bodies[i].name}${i < nR ? "(R)" : "(T)"}–${comb.bodies[j].name}${j < nR ? "(R)" : "(T)"}`;
  if (cross) { if (e) out.crossPairs.enabled++; else out.crossPairs.disabled.push(nm); } else { out.withinPairs.total++; if (!e) out.withinPairs.disabled.push(nm); } }
out.objectLayers = [...new Set(w.bodies.map(b => b.GetObjectLayer()))]; out.motionQuality = [...new Set(w.bodies.map(b => b.GetMotionProperties().GetMotionQuality()))].map(q => (q === 0 ? "Discrete" : "LinearCast"));
const p = w.ps.GetPhysicsSettings(); out.settings = { speculativeContactDistance: p.mSpeculativeContactDistance, penetrationSlop: p.mPenetrationSlop, baumgarte: p.mBaumgarte, velocitySteps: p.mNumVelocitySteps, positionSteps: p.mNumPositionSteps, hz: G1_WORLD.hz };
w.destroy(); fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cross: out.crossPairs.enabled + " enabled / " + out.crossPairs.disabled.length + " disabled", within: out.withinPairs.disabled.length + " of " + out.withinPairs.total + " disabled", layers: out.objectLayers, motion: out.motionQuality, settings: out.settings }));
