// trace: V1-matched singleLeg at 240 Hz, k from env, ankle_L around the event
const P2 = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2";
const { loadJolt } = await import(P2 + "/core/v2_jolt.js"); const { generateSpec } = await import(P2 + "/spec/v2_spec.js"); const H = await import(P2 + "/spec/v2_human.js"); const G1 = await import(P2 + "/gates/v2_g1.js"); const JS = await import(P2 + "/spec/v2_joints.js");
const J = await loadJolt(P2 + "/vendor/jolt-physics.wasm-compat.js"), spec = generateSpec(H.VARIATION_SET.find(h => h.id === "V1-matched")), opts = JSON.parse(process.argv[2] || "{}");
const s = new G1.G1Sim(J, spec, "singleLeg", { cfg: { ...G1.G1_WORLD }, passive: opts.passive }), k = spec.joints.findIndex(j => j.name === "ankle_L"), d = s.P.jd[k], f = (x, n = 2) => (+x).toFixed(n), B = spec.bodies, nm = (i) => (i >= 0 && i < B.length ? B[i].name : "turf");
console.log("k", JS.ankleNeutralKPerDeg(), JSON.stringify(opts)); let maxRise = 0, Eprev = null;
while (s.n * s.dt < 4.2) { s.tick(); const t = s.n * s.dt; if (Eprev != null) maxRise = Math.max(maxRise, s.last.E - Eprev); Eprev = s.last.E; if (t < 3.80 || t > 3.87) continue; const q = s.up.ev.qs[k], pj = s.up.joints.find(j => j.k === k);
  const cs = (s.lastContacts || []).filter(c => [nm(c.a), nm(c.b)].some(x => /foot_L|shank_L/.test(x))).map(c => `${nm(c.a)}-${nm(c.b)} ${c.depth != null ? f(c.depth * 1000, 1) : ""}`);
  console.log(`t ${f(t, 4)} fabd ${f(s.P.anat(d, q, "fabd"))} inv ${f(s.P.anat(d, q, "inv"))} df ${f(s.P.anat(d, q, "df"))} | tau ${pj ? pj.tau.map(v => f(v, 2)).join("/") : ""} Texp ${pj ? pj.Texp.map(v => f(v, 1)).join("/") : ""} K ${pj ? pj.K.map(v => f(v, 0)).join("/") : ""} δ ${pj ? pj.delta.map(v => f(v * 57.3, 2)).join("/") : ""} | E ${f(s.last.E, 1)} sep ${f(s.last.sepMax * 1000, 1)} | ${cs.slice(0, 5).join(", ")}`); }
console.log("max one-step energy rise", maxRise.toFixed(2), "J"); s.destroy();
