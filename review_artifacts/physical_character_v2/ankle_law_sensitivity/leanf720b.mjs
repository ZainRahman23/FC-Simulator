const P2 = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2";
const { loadJolt } = await import(P2 + "/core/v2_jolt.js"); const { generateSpec } = await import(P2 + "/spec/v2_spec.js"); const H = await import(P2 + "/spec/v2_human.js"); const G1 = await import(P2 + "/gates/v2_g1.js");
const J = await loadJolt(P2 + "/vendor/jolt-physics.wasm-compat.js"), spec = generateSpec(H.V2_REF), key = G1.ensembleKey("leanF", 1e-5); G1.ensureScenario(key);
const s = new G1.G1Sim(J, spec, key, { cfg: { ...G1.G1_WORLD, hz: 720 } }), k = spec.joints.findIndex(j => j.name === "ankle_R"), d = s.P.jd[k], f = (x, n = 2) => (+x).toFixed(n), B = spec.bodies;
const nm = (i) => (i >= 0 && i < B.length ? B[i].name : "turf");
while (s.n * s.dt < 1.8605) { s.tick(); const t = s.n * s.dt; if (t < 1.853) continue; const q = s.up.ev.qs[k], pj = s.up.joints.find(j => j.k === k);
  const cs = (s.w.contacts || []).filter(c => [c.b1, c.b2, c.bodyA, c.bodyB, c.a, c.b].some(x => x != null && (nm(x) === "foot_R" || nm(x) === "shank_R")));
  const desc = cs.slice(0, 4).map(c => { const a = c.b1 ?? c.bodyA ?? c.a, b = c.b2 ?? c.bodyB ?? c.b; return `${nm(a)}-${nm(b)} d${c.depth != null ? f(c.depth * 1000, 1) : "?"}`; }).join(", ");
  console.log(`t ${f(t, 5)} fabd ${f(s.P.anat(d, q, "fabd"))} inv ${f(s.P.anat(d, q, "inv"))} df ${f(s.P.anat(d, q, "df"))} | Texp ${pj ? pj.Texp.map(v => f(v, 1)).join("/") : ""} K ${pj ? pj.K.map(v => f(v, 0)).join("/") : ""} | E ${f(s.last.E, 1)} sep ${f(s.last.sepMax * 1000, 1)} hardExc ${f(s.last.hardExc * 57.3, 1)} | contacts(foot_R/shank_R) ${cs.length}: ${desc}`); }
console.log(JSON.stringify(Object.keys((s.w.contacts || [])[0] || {})));
s.destroy();
