#!/bin/sh
# SLP-1 §4.3 CPU, SEQUENTIAL (no parallel load): autonomous CF-6 walk baseline (3 trials) and SLP-1 undisturbed runs (3 trials each), µs per 240 Hz step from the
# simulators' own counters; plus the lean variant (ankle probes off). usage (worktree root): sh review_artifacts/physical_character_v2/slp1/scripts/run_cpu.sh <tmpdir>
set -e; TMP=${1:-/tmp/slp1_cpu}; mkdir -p "$TMP"; export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; P=sandbox/visual/physchar2/tools/slp1_probe.mjs
echo "# SLP-1 CPU (§4.3), sequential, $(sysctl -n machdep.cpu.brand_string 2>/dev/null), node $(node -v), $(date '+%F %T')"
for i in 1 2 3; do node review_artifacts/physical_character_v2/slp1/baseline/cpu_profile.mjs --human=V2-REF --first=L --cf=6 --Tst=1.0 --Tds6=0.4104 --Tss6=0.5396 --steps=20 --S=0.095 --vw=0.1 --level=B0.1 --out="$TMP/prof.json.gz" 2>/dev/null | tail -1 | sed "s#$TMP/prof.json.gz#<tmp>#; s#^#AUTONOMOUS_CF6_B0.1 trial $i #"; done
for i in 1 2 3; do
  for cfg in walk:1 walk:2 walk:4 jog:2 run:2; do sp=${cfg%%:*}; f=${cfg##*:}; node $P --speed=$sp --case=D0 --f=$f --out="$TMP/c.json.gz" >/dev/null 2>&1
    python3 -c "import json,gzip,sys;d=json.load(gzip.open('$TMP/c.json.gz'));print('SLP1 $sp f$f trial $i', json.dumps(d['cpu']), 'fallT', d['architecture']['A4_fallT'])"; done
  node $P --speed=walk --case=D0 --f=2 --lean --out="$TMP/c.json.gz" >/dev/null 2>&1; python3 -c "import json,gzip;d=json.load(gzip.open('$TMP/c.json.gz'));print('SLP1_LEAN walk f2 trial $i', json.dumps(d['cpu']))"
done
