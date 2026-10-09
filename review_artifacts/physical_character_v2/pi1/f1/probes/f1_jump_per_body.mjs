const P = process.cwd() + "/";
const { loadJolt } = await import(P + "core/v2_jolt.js"), G1 = await import(P + "gates/v2_g1.js"), R = await import(P + "spec/v2_pi1_runner.js"), { V, Q } = await import(P + "core/v2_math.js").catch(() => ({}));
const J = await loadJolt(P + "vendor/jolt-physics.wasm-compat.js");
const sp = R.pi1RunnerF1Spec(), key = process.argv[2] || "drop1m";
const m = new G1.G1Sim(J, sp, key, { passiveOpts: { kneeModel: "v2k" }, series: true });
const ke = (b, s) => { const r = s.rot, c = [-r[0], -r[1], -r[2], r[3]]; const qv = (q, v) => { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2]; return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
  const wl = qv(c, s.w), I = b.inertia, Iw = [0, 1, 2].map(i => I[i][0] * wl[0] + I[i][1] * wl[1] + I[i][2] * wl[2]); return 0.5 * b.mass * (s.v[0] ** 2 + s.v[1] ** 2 + s.v[2] ** 2) + 0.5 * (wl[0] * Iw[0] + wl[1] * Iw[1] + wl[2] * Iw[2]); };
let prev = null, prevE = null, prevU = null, rows = [];
while (m.tick()) { const S = m.st, E = m.last.E, perB = sp.bodies.map((b, i) => ke(b, S[i]) + b.mass * m.g * S[i].com[1]);
  if (prev) { const dE = E - prevE; if (dE > 0.05) { const d = perB.map((x, i) => [sp.bodies[i].name, x - prev[i]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
      const C = m.lastContacts.filter(c => c.a === -1 || c.b === -1).map(c => sp.bodies[c.a === -1 ? c.b : c.a].name + ":" + (c.depth * 1000).toFixed(1));
      rows.push({ t: +(m.n * m.dt).toFixed(4), dE: +dE.toFixed(4), dU: +(m.last.U - prevU).toFixed(4), top: d.map(([n, x]) => n + " " + x.toFixed(3)).join(", "), turf: [...new Set(C)].join(" "), pc: m.A.inv.pcMaxMm.toFixed(2) + "mm@" + m.A.inv.pcBody }); } }
  prev = perB; prevE = E; prevU = m.last.U; }
console.log(JSON.stringify(rows, null, 1));
