import { runB } from "./clB.mjs"; import { printFail } from "./failan.mjs";
printFail(runB({ gains: { f0: [0.1, 0.16], cd: [0, 0.5], cv: [0.15, 0.45] }, n: 14, keep: true }));
