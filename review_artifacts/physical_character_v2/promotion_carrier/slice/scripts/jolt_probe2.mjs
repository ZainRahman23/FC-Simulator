const P2 = process.env.PCV2 + "/sandbox/visual/physchar2/"; const { loadJolt } = await import(P2 + "core/v2_jolt.js"); const J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js");
const step = (n, f) => { try { const r = f(); console.log("ok", n); return r; } catch (e) { console.log("FAIL", n, e.message); process.exit(1); } };
const ms = step("settings", () => { const c = new J.MutableCompoundShapeSettings(); c.AddShape(new J.Vec3(0, 0, 0), new J.Quat(0, 0, 0, 1), new J.CapsuleShapeSettings(0.2, 0.085), 0); for (let i = 0; i < 4; i++) c.AddShape(new J.Vec3(0, 0.3 + 0.1 * i, 0), new J.Quat(0, 0, 0, 1), new J.CapsuleShapeSettings(0.05, 0.07), 0); return c; });
const sh = step("create", () => ms.Create().Get()); const mc = step("cast", () => J.castObject(sh, J.MutableCompoundShape));
const c0 = step("com", () => sh.GetCenterOfMass()); console.log("com0", c0.GetX(), c0.GetY(), c0.GetZ());
step("modify", () => mc.ModifyShape(4, new J.Vec3(0, 0.35, 0), new J.Quat(0, 0, 0, 1)));
const c1 = step("com after modify", () => sh.GetCenterOfMass()); console.log("com1", c1.GetX(), c1.GetY(), c1.GetZ(), "subshapes", mc.GetNumSubShapes ? mc.GetNumSubShapes() : "?");
