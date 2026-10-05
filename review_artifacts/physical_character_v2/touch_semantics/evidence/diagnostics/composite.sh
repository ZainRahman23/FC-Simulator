#!/bin/zsh
S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad; W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"
rm -rf $S/c2lab/comp && mkdir -p $S/c2lab/comp && cp $S/tr/res/*.json $S/c2lab/comp/
node -e '
const fs=require("fs"); const D=process.argv[1], O=process.argv[2]; let n=0, ident=0, pn=0;
for (const f of fs.readdirSync(D)) { const o=JSON.parse(fs.readFileSync(D+"/"+f)); const id=o.id.replace("_C2","_B1TR"); if (o.run.set==="P") { pn++; const c=JSON.parse(fs.readFileSync(O+"/"+id+".json")); if (JSON.stringify(c.hashes)===JSON.stringify(o.hashes)) ident++; continue; } o.id=id; o.run={...o.run,id,arm:"B1TR"}; fs.writeFileSync(O+"/"+id+".json", JSON.stringify(o)); n++; }
console.log(`replaced ${n} B1TR results with C2; P sample: ${ident}/${pn} hash-identical to C`);' $S/c2lab/res $S/c2lab/comp
cd "$W/sandbox/visual/physchar2" && node tools/touchrest_eval.mjs --manifest="$W/review_artifacts/physical_character_v2/touch_semantics/manifest.json" --results=$S/c2lab/comp --uf=$S/uf/res --e1a="$W/review_artifacts/physical_character_v2/e1a/official/runs" --browser=$S/tr/browser_W.json --out=$S/c2lab/comp_eval.json
