#!/bin/bash
# multi.sh '<ctrl extra json>' '<walk json>' '<human json>' n  -> runs the 6 starts in parallel, prints per start + mean
B='{"kind":"U","vd":0.5,"from":1,"ramp":{"a":0.3},"place":"maps","uRefSim":false,"lat":{"rho":0.4},"adapt":null,"reachIter":false,"modelsPrefix":"mU1_tau"}'
C=$(python3 -c "import json,sys; b=json.loads(sys.argv[1]); b.update(json.loads(sys.argv[2])); print(json.dumps(b))" "$B" "$1")
W=${2:-'{"swingBase":{"w":"model","learn":{"rate":0.05},"pure":[0]}}'}; H=${3:-'{}'}; N=${4:-40}
for s in R0.5 R0.55 R0.6 L0.5 L0.55 L0.6; do node walk.mjs "$C" "$W" "$H" $s $N > /tmp/_w_$$_$s.txt 2>&1 & done; wait
for s in R0.5 R0.55 R0.6 L0.5 L0.55 L0.6; do head -1 /tmp/_w_$$_$s.txt | cut -c1-60; done
python3 -c "
import re,sys; v=[int(re.search(r'upright (\d+)',open('/tmp/_w_$$_'+s+'.txt').read()).group(1)) for s in 'R0.5 R0.55 R0.6 L0.5 L0.55 L0.6'.split()]; print('MEAN upright', sum(v)/6, v)"
rm -f /tmp/_w_$$_*.txt
