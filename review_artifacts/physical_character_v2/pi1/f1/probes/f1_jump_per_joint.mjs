const P = process.cwd() + "/";
const { loadJolt } = await import(P + "core/v2_jolt.js"), G1 = await import(P + "gates/v2_g1.js"), R = await import(P + "spec/v2_pi1_runner.js");
const J = await loadJolt(P + "vendor/jolt-physics.wasm-compat.js");
const sp = R.pi1RunnerF1Spec(), key = process.argv[2] || "leanF", T0 = +process.argv[3], T1 = +process.argv[4], D = 180 / Math.PI;
const m = new G1.G1Sim(J, sp, key, { passiveOpts: { kneeModel: "v2k" } });
const uj = () => m.up.ev.per.map((p, k) => p.T.reduce((s, t) => s + (t ? t.U : 0), 0));
const mt = sp.joints.map((j, k) => [j.name, k]).filter(([n]) => /^mtp_|^ankle_/.test(n));
let pu = uj(), pE = m.last.E;
while (m.tick()) { const t = m.n * m.dt, u = uj(), E = m.last.E;
  if (t >= T0 && t <= T1) { const d = u.map((x, k) => [sp.joints[k].name, x - pu[k]]).filter(([, x]) => Math.abs(x) > 0.02).map(([n, x]) => n + " " + x.toFixed(3)).join(", ");
    const toe = mt.map(([n, k]) => n + " " + m.up.ev.per[k].th.map((x, i) => m.up.ev.per[k].T[i] ? (x * D).toFixed(1) : "-").join("/")).join("  ");
    const C = (m.lastContacts || []).filter(c => (c.a === -1 || c.b === -1) && c.depth > -0.0005).map(c => sp.bodies[c.a === -1 ? c.b : c.a].name);
    console.log(t.toFixed(4), "dE", (E - pE).toFixed(3), "U", m.last.U.toFixed(3), "| dU:", d, "|", toe, "| turf:", [...new Set(C)].join(" ")); }
  pu = u; pE = E; }
