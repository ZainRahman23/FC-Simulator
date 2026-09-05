#!/bin/zsh
# Self-terminating runner for gk_profile_goalface.js: gk_run.sh <outdir> <label> [harness args...]
# Polls for completion (the harness writes the dataset then may hang on browser close) and kills its own Chrome.
cd "$(dirname "$0")"; export GK_EVAL_PROFILE_DIR=$PWD PUPPETEER_NODE_MODULES=$PWD/node_modules
OUTD=$1; L=$2; shift 2; mkdir -p $OUTD; rm -f $OUTD/$L.json
node "$(dirname "$0")/gk_profile_goalface.js" --url http://127.0.0.1:8126/sandbox/visual/${GK_PAGE:-match.html} --out $OUTD/$L.json --udd chrome-run-$(basename $OUTD)-$L "$@" > $OUTD/$L.log 2>&1 &
PID=$!
for i in {1..360}; do sleep 5; if grep -q "elapsed" $OUTD/$L.log 2>/dev/null && [ -s $OUTD/$L.json ]; then sleep 3; break; fi; if ! kill -0 $PID 2>/dev/null; then break; fi; done
kill $PID 2>/dev/null; pkill -f "chrome-run-$(basename $OUTD)-$L-" 2>/dev/null
echo "RUN $L: $(grep -o 'elapsed [0-9.]* s errors [0-9]*' $OUTD/$L.log | tail -1)  json=$(ls -la $OUTD/$L.json 2>/dev/null | awk '{print $5}')"
