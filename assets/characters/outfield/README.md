# Outfield characters — DERIVED runtime assets

Canonical storage is **not** here. It is Astra's shared canonical character library plus one ~2 KB portable
record per player (`players/<id>.json` in TOUCHLINE_OUTFIELD_CHARACTER_INTEGRATION_V1). Everything in this
directory is derived from those two inputs and is regenerable:

    node sandbox/visual/tools/anim3d/of_char_build.js --pkg <extracted package> --ids <ids> --target mixed

Per player:
  rig.json   the fresh per-player bind (parent-local offsets, bind origins, inverse binds = T(-origin)),
             derived bone directions / lengths / radii, the foot contact landmarks (stud tip, rubber sole,
             ankle, toe), stature and segment chains, material and part tables, and the shading contract
  mesh.bin   packed geometry, little-endian, offsets recorded in rig.json.mesh.layout
  atlas.png  the frozen approved atlas, copied byte-for-byte from the package

The inverse binds are rebuilt from this player's own constructed offsets. The neutral presentation stance is
NOT a bind pose (it carries real arm rotations) and is never used to derive binds. The shared H=1.90 template's
inherited inverseBind / bindJointsCharacter / definitionTable / bindWidthM / radii / variantDef are never read.

Ground is the LOWEST STUD TIP (y≈0). The rubber sole bottom sits ~12 mm above it, the ankle joint at 88 mm and
the toe joint at 31 mm; those are three different operations and the contact solver uses the stud-tip plane.
