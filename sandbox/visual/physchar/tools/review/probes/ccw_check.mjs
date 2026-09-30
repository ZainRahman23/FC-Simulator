const PC = process.argv[2]; const { footprint, polyPolyDist } = await import(PC + "/pc_support.js"); const { polyDist } = await import(PC + "/pc_sense.js");
const box = { he: [0.05, 0.03, 0.13], pos: [0, 0, 0.05] }, A = footprint(box, [0, 0], 0), B = footprint(box, [0.05, 0.02], 0.3), C = footprint(box, [0.3, 0], 0);
console.log("inside centre", polyDist(A, [0, 0]).toFixed(3), "outside", polyDist(A, [0.2, 0]).toFixed(3), "overlap", polyPolyDist(A, B), "apart", polyPolyDist(A, C).toFixed(3));
