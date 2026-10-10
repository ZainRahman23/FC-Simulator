const P2 = process.env.PCV2 + "/sandbox/visual/physchar2/"; const { loadJolt } = await import(P2 + "core/v2_jolt.js"); const J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js");
const step = (n, f) => { try { const r = f(); console.log("ok", n); return r; } catch (e) { console.log("FAIL", n, e.message); process.exit(1); } };
const cs = step("compound", () => { const c = new J.StaticCompoundShapeSettings(); c.AddShape(new J.Vec3(0, 0, 0), new J.Quat(0, 0, 0, 1), new J.CapsuleShapeSettings(0.2, 0.07), 0); c.AddShape(new J.Vec3(0, 0.5, 0), new J.Quat(0, 0, 0, 1), new J.CapsuleShapeSettings(0.1, 0.07), 0); return c; });
const inner = step("create", () => cs.Create().Get());
const com = step("com", () => inner.GetCenterOfMass()); console.log(com.GetX(), com.GetY(), com.GetZ());
const os = step("offsetSettings", () => new J.OffsetCenterOfMassShapeSettings(new J.Vec3(0, 0.1, 0), inner));
const osh = step("offsetCreate", () => os.Create().Get());
const c2 = step("offCom", () => osh.GetCenterOfMass()); console.log(c2.GetX(), c2.GetY(), c2.GetZ());
