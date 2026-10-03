#!/bin/sh
# V2-G1 review stills: headless Chrome (software GL) against the running review server. usage: tools/g1_capture.sh [port] [outdir]
# cfg=ref is the gate baseline; cfg=cand the decision candidate (10-piece boot + 150 it, NOT adopted); DX-* diagnostics.
PORT=${1:-8172}; ROOT="$(git rev-parse --show-toplevel)"; OUT=${2:-"$ROOT/review_artifacts/physical_character_v2/g1/shots"}; mkdir -p "$OUT"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; PROF="${TMPDIR:-/tmp}/v2g1_chrome_prof"; U="http://127.0.0.1:$PORT/sandbox/visual/physchar2/viewer/g1.html"
shot() { perl -e 'alarm 240; exec @ARGV' "$CH" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --user-data-dir="$PROF" --virtual-time-budget=120000 \
  --window-size=1600,1000 --hide-scrollbars --screenshot="$OUT/$1.png" "$U?$2" >/dev/null 2>&1; echo "$1"; }
rm -f "$OUT"/g1_*.png
shot g1_01_singleLeg_boot_rest_defect_gate "scenario=singleLeg&t=9.8&cam=three&focus=foot_R&dist=0.9&yaw=-60&pitch=14&show=colliders"
shot g1_02_singleLeg_boot_rest_candidate "scenario=singleLeg&cfg=cand&t=9.8&cam=three&focus=foot_R&dist=0.9&yaw=-60&pitch=14&show=colliders"
shot g1_03_perturb_forearm_into_boot_gate "scenario=perturb&t=1.64&cam=three&focus=foot_R&dist=0.9&yaw=40&pitch=20&show=colliders"
shot g1_04_perturb_forearm_boot_candidate "scenario=perturb&cfg=cand&t=1.64&cam=three&focus=foot_R&dist=0.9&yaw=40&pitch=20&show=colliders"
shot g1_05_dropA_impact_rebound_tick "scenario=dropA&t=0.0875&cam=side&follow=1&dist=2.2&pitch=4&show=vel"
shot g1_06_drop1m_touchdown "scenario=drop1m&t=0.46&cam=side&focus=shank_L&dist=1.8&pitch=4&show=limits&joint=knee_L"
shot g1_07_awkward_midfall "scenario=awkward&t=0.40&cam=three&follow=1&dist=2.4&show=vel"
shot g1_08_impact15_first_touch "scenario=impact15&t=0.021&cam=side&follow=1&dist=2.2&pitch=3&show=colliders"
shot g1_09_hsKickShin_envelope "scenario=hsKickShin&t=0.06&cam=side&focus=foot_R&dist=1.3&pitch=4&show=colliders"
shot g1_10_isoSelfCol_leg_contact "scenario=isoSelfCol&t=0.03&cam=front&focus=shank_R&dist=1.4&pitch=5"
shot g1_11_flatSupine_rest "scenario=flatSupine&t=9.5&cam=side&focus=head&dist=1.2&pitch=6&show=colliders"
