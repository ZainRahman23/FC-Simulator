// occupy1/tools/o_env.mjs — THE NODE ENVIRONMENT OF EVERY OCCUPANCY TOOL: vocab2's (u_env.mjs) + the colliders the game's pages load
// (dribble1/d1_colliders.json), so PlayBody poses the feet with DRIBBLE-1's boot hull exactly as the Review Lab and the sandboxes do. Occupancy
// reads the posed body, so node and the page must pose the same body (before occupancy no body fed back into the simulation, and the node
// tools did without the colliders: the browser check found the page and node diverging case by case)
import { ENV as BASE } from "../../vocab2/tools/u_env.mjs";
import fs from "node:fs";
export const ENV = Object.assign({}, BASE, { colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url), "utf8")) });
