#!/bin/zsh
# dribble13/tools/d13_cpu.sh — the resolver CPU benchmark with EACH CORE IN ITS OWN PROCESS, one after another (a game runs one core: several cores in
# one process share TURN-1.2's code, whose call sites then see every core's object shapes and run slower for all of them, and one core's garbage is
# collected inside another's steps), then merged into one cpu.json (the same format as d13_cpu.mjs).
# usage: zsh d13_cpu.sh "IDs|all" seeds out.json [vers d1,d11,d12,d13]           (run on an otherwise idle machine)
HERE="${0:A:h}"; IDS="$1"; N="$2"; OUT="$3"; VERS="${4:-d1,d11,d12,d13}"; T="${TMPDIR:-/tmp}/d13cpu.$$"; mkdir -p "$T"
for v in ${(s:,:)VERS}; do node "$HERE/d13_cpu.mjs" "$IDS" "$N" "$T/$v.json" 1 "$v" | grep -v "^22-player" | sed "s/^/[$v] /"; done
node -e 'const fs=require("fs"), [T, out, vs]=process.argv.slice(1), V=vs.split(","), R=V.map((v)=>JSON.parse(fs.readFileSync(T+"/"+v+".json")));
  const o={ node: R[0].node, seeds: R[0].seeds, repeats: R[0].repeats, versions: V, processes: "one per core", all: {}, projection22: {}, perScenario: {} };
  R.forEach((r, i)=>{ o.all[V[i]]=r.all[V[i]]; o.projection22[V[i]]=r.projection22[V[i]]; for (const [id, x] of Object.entries(r.perScenario)) (o.perScenario[id]=o.perScenario[id]||{})[V[i]]=x[V[i]]; });
  const last=V[V.length-1], w=Object.entries(o.perScenario).sort((a,b)=>b[1][last].resolverMsPerSimS-a[1][last].resolverMsPerSimS)[0]; o.worst={ id: w[0], ...w[1] };
  fs.writeFileSync(out, JSON.stringify(o, null, 1)); for (const v of V) console.log("ALL", v, JSON.stringify(o.all[v]));' "$T" "$OUT" "$VERS"
rm -rf "${T:?}"
