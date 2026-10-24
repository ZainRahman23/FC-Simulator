// occupy1/tools/two/o_two_hook.mjs — RUN SHARED POSSESSION + REACTION V1's TWO-PLAYER TOOLS WITH PLAYER OCCUPANCY V1 ON (§30 / §32):
// `node --import <this file> ../../../possess1/tools/p_torture.mjs` (or NODE_OPTIONS=--import=<file URL>). Every import of possess1/p_world.js
// made from inside possess1/ resolves to o_two_shim.js, whose SharedWorld IS occupy1's OccupancyWorld (occupancy ON), and their node environment
// (vocab2/tools/u_env.mjs) to o_two_env.mjs (the colliders added: the body posed as the pages pose it). The possession tools,
// their checks and their thresholds are run unchanged; no file of possess1/ is modified.
import { register } from "node:module";
register("./o_two_loader.mjs", import.meta.url);
