#!/bin/sh
# V2-G0 review stills: headless Chrome (software GL) against the running review server. usage: tools/g0_capture.sh [port] [outdir]
PORT=${1:-8172}; ROOT="$(git rev-parse --show-toplevel)"; OUT=${2:-"$ROOT/review_artifacts/physical_character_v2/g0/shots"}; mkdir -p "$OUT"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; PROF="${TMPDIR:-/tmp}/v2g0_chrome_prof"; U="http://127.0.0.1:$PORT/sandbox/visual/physchar2/viewer/index.html"
shot() { perl -e 'alarm 100; exec @ARGV' "$CH" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --user-data-dir="$PROF" --virtual-time-budget=40000 \
  --window-size=1600,1000 --hide-scrollbars --screenshot="$OUT/$1.png" "$U?$2" >/dev/null 2>&1; echo "$1"; }
shot 01_three_quarter "cam=three"
shot 02_front_dimensions "cam=front&show=dims"
shot 03_back "cam=back"
shot 04_right_side "cam=right&show=dims"
shot 05_focus_pelvis_hips "focus=hips"
shot 06_focus_knee_axes "focus=knee"
shot 07_focus_foot_ankle_toe "focus=foot"
shot 08_focus_shoulder "focus=shoulder"
shot 09_focus_spine_mapping "focus=spine"
shot 10_neutral_front "pose=neutral&cam=front&show=coms"
shot 11_deep_squat_side "pose=deepSquat&cam=right&show=colliders"
shot 12_top "cam=top&show=dims"
