import fs from "fs"; import path from "path"; const PC = process.argv[2]; const REF = await import(PC + "/pc_ref.js"); REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const P = REF.inPlaceWalkParams(); console.log(JSON.stringify(P));
