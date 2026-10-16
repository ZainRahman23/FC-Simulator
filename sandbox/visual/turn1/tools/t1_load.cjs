// turn1/tools/t1_load.cjs — RUN-1 (frozen v13 included) + TURN-1 in one node vm context (the same globals as the page)
const path = require("path"), vm = require("vm");
const R1 = require(path.resolve(__dirname, "../../run1/tools/run1_load.cjs"));
function loadTurn1() {
  const X = R1.loadRun1({ extra: ["turn1/turn1_loco.js", "turn1/turn11_body.js"] });   // TURN-1.1's body layer is loaded too; it acts only on actors it is attached to
  X.TURN1 = vm.runInContext("TURN1", X.ctx); X.TURN11 = vm.runInContext("TURN11", X.ctx);
  X.skel = X.charSkel("vinicius");
  return X;
}
module.exports = { loadTurn1 };
