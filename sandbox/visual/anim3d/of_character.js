// ══ anim3d/of_character.js — Astra's real outfield characters on the existing outfield skeletal runtime ═══════════════════════════
// Presentation only. Loads a DERIVED runtime asset (tools/anim3d/of_char_build.js regenerates it from the canonical shared library plus
// the player's ~2 KB portable record) and adapts that player's own bind to the runtime skeleton object the locomotion, dribbling and
// shooting systems already drive. Nothing here reads or writes simulation state.
//
// The contract this file honours, from Astra's handoff:
//   · 23 joints, parent-first, the exact shared order; metres; character-local Y up, +Z forward, _R on +X, right-handed
//   · the bind is TRANSLATION-ONLY: origin[j] = origin[parent] + offsetLocal[j], inverseBind[j] = T(-origin[j]).
//     The neutral presentation stance is NOT the bind pose and is never used to derive binds.
//   · the template's inherited inverseBind / bindJointsCharacter / definitionTable / bindWidthM / radii / variantDef are never read
//   · ground is the LOWEST STUD TIP (y≈0). The rubber sole bottom is ~12 mm above it, the ankle joint 88 mm, the toe joint 31 mm.
//   · one inverse-bind application only: this runtime skins with world × inverseBind against character-space bind positions, which is
//     algebraically identical to Astra's native (world × bone-local) form and must not be combined with it.
const OF_CHAR = {
  registry: {},                                                                // id → { id, status, rig, mesh, atlas, skel, gl }
  order: ["cucurella", "gabriel", "osimhen", "szoboszlai", "vinicius", "james"],
  base: "../../assets/characters/outfield",
  define(id) { this.registry[id] = { id, status: "idle", rig: null, mesh: null, atlas: null, skel: null, gl: null }; return this.registry[id]; },
  get(id) { return this.registry[id] || null; },
};
for (const id of OF_CHAR.order) OF_CHAR.define(id);

// ── the packed buffer → typed-array views, using the layout the build step recorded (never guessed) ──────────────────────────────
function ofCharViews(buf, layout) {
  const T = { Float32Array, Uint16Array, Uint32Array, Uint8Array }, out = {};
  for (const k in layout) { const L = layout[k]; out[k] = new T[L.elementType](buf, L.byteOffset, L.elementCount); }
  return out;
}
// ── the runtime skeleton for one player, from that player's own bind record ──────────────────────────────────────────────────────
function ofCharSkeleton(entry) {
  if (entry.skel) return entry.skel;
  const rig = entry.rig, bones = [], byName = {};
  for (const r of rig.bones) {
    const b = { name: r.name, idx: r.index, off: r.offsetLocal.slice(), dir: r.bindDirLocal.slice(), len: r.lengthM,
                rad: r.radiusM, part: r.part, parent: null, children: [] };
    bones.push(b); byName[r.name] = b;
  }
  for (const r of rig.bones) if (r.parent) { byName[r.name].parent = byName[r.parent]; byName[r.parent].children.push(byName[r.name]); }
  const skel = {
    H: rig.H, character: rig.playerId, worldScale: 1, bones, byName,
    prop: { legs: 1, arms: 1, torso: 1, width: 1 },
    legLen: rig.legLenM,                                                       // hip→knee→ankle chain, this player's own
    hipY: rig.hipHeightM,
    ankleH: rig.ankleHeightM,                                                  // ankle above the GROUND PLANE (= lowest stud tip)
    ground: rig.ground, feet: rig.feet, identity: rig.identity,
    invBind: rig.bones.map(r => { const o = r.bindOrigin; const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1; m[12] = -o[0]; m[13] = -o[1]; m[14] = -o[2]; return m; }),   // T(-origin), column-major
  };
  // closure check: the summed offsets under an identity pose must reproduce the recorded bind origins and the inverse binds
  const fk = skelFK(skel, {}, M4.ident()); let originErr = 0, invErr = 0;
  for (const b of bones) {
    const o = rig.bones[b.idx].bindOrigin, j = fk.joint[b.idx], ib = skel.invBind[b.idx];
    originErr = Math.max(originErr, Math.abs(j[0] - o[0]), Math.abs(j[1] - o[1]), Math.abs(j[2] - o[2]));
    invErr = Math.max(invErr, Math.abs(ib[12] + o[0]), Math.abs(ib[13] + o[1]), Math.abs(ib[14] + o[2]));
  }
  skel.bindCheck = { summedOriginMaxErrM: originErr, inverseBindMaxErrM: invErr, jointOrder: bones.map(b => b.name),
                     statureM: rig.H, ankleH: skel.ankleH, legLen: skel.legLen };
  if (originErr > 1e-6) console.warn("[of_character] " + rig.playerId + " bind origins differ from summed offsets by", originErr);
  entry.skel = skel; return skel;
}
// ── loading (browser) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ofCharLoad(id) {
  const e = OF_CHAR.get(id); if (!e) return Promise.reject(new Error("unknown character " + id));
  if (e.status === "ready") return Promise.resolve(e);
  if (e.status === "loading") return e.promise;
  e.status = "loading";
  const base = OF_CHAR.base + "/" + id;
  e.promise = Promise.all([
    fetch(base + "/rig.json").then(r => { if (!r.ok) throw new Error("rig " + r.status); return r.json(); }),
    fetch(base + "/mesh.bin").then(r => { if (!r.ok) throw new Error("mesh " + r.status); return r.arrayBuffer(); }),
    ofCharImage(base + "/atlas.png"),
  ]).then(([rig, buf, atlas]) => {
    e.rig = rig; e.atlas = atlas;
    e.mesh = ofCharViews(buf, rig.mesh.layout);
    e.mesh.vertexCount = rig.mesh.vertexCount; e.mesh.triangleCount = rig.mesh.triangleCount;
    ofCharSkeleton(e);
    e.status = "ready"; return e;
  }).catch(err => { e.status = "error"; e.error = String(err); console.error("[of_character] load failed", id, err); throw err; });
  return e.promise;
}
function ofCharImage(url) {
  return fetch(url).then(r => r.blob()).then(b => (typeof createImageBitmap === "function" ? createImageBitmap(b)
    : new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(b); })));
}
if (typeof module !== "undefined" && module.exports) module.exports = { OF_CHAR, ofCharViews, ofCharSkeleton };
