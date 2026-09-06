#!/bin/zsh
# end-to-end: author frames → engine manifest → in-engine capture (synthetic north HIGH dive) → GIFs + sheets. Args: <label>
set -e
cd "/Users/zainrahman/Downloads/FC Simulator"
SC=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator/6efc52ee-40f3-49a1-86c1-362b38fe33cc/scratchpad
D="review_artifacts/gk_rig_v1/GK_DIVE_INTERPOLATION_TEST"; L=${1:-routeA}; AUTHOR=${2:-author_dive_frames.py}
python3 sandbox/visual/tools/gk_anim/rig/$AUTHOR $D/frames_$L | grep -E "rel-root"
python3 sandbox/visual/tools/gk_anim/rig/build_engine_manifest.py $D/frames_$L $D/engine_$L '{"liveFrom":0.78,"frames":[{"key":"F0","from":0.0,"to":0.06},{"key":"F1","from":0.06,"to":0.2},{"key":"F2","from":0.2,"to":0.36},{"key":"F3","from":0.36,"to":0.56},{"key":"F4","from":0.56,"to":0.78}]}'
cd $SC && PUPPETEER_NODE_MODULES=$SC/perfbench/node_modules node "/Users/zainrahman/Downloads/FC Simulator/sandbox/visual/tools/gk_anim/rig/capture_proposed.js" $SC/prop_$L "../../review_artifacts/gk_rig_v1/GK_DIVE_INTERPOLATION_TEST/engine_$L/candidate_frames.json" "/Users/zainrahman/Downloads/FC Simulator/$D/engine_$L/schedule.json" synth 2>&1 | grep -E "drawn sequence|committed|console" | cut -c1-200
cd "/Users/zainrahman/Downloads/FC Simulator"
python3 sandbox/visual/tools/gk_anim/rig/make_gifs.py gameplay $SC/dive_trace_synth $SC/prop_$L $D/gifs_$L 2
python3 sandbox/visual/tools/gk_anim/rig/make_gifs.py frames $D/frames_$L $D/gifs_$L
python3 sandbox/visual/tools/gk_anim/rig/compact_sheets.py $SC/dive_trace_synth $SC/prop_$L $SC/sheets_$L 3
