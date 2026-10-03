#!/bin/sh
# V2-G1 review stills: headless Chrome (software GL) against the running review server. usage: tools/g1_capture.sh [port] [outdir]
PORT=${1:-8172}; ROOT="$(git rev-parse --show-toplevel)"; OUT=${2:-"$ROOT/review_artifacts/physical_character_v2/g1/shots"}; mkdir -p "$OUT"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; PROF="${TMPDIR:-/tmp}/v2g1_chrome_prof"; U="http://127.0.0.1:$PORT/sandbox/visual/physchar2/viewer/g1.html"
shot() { perl -e 'alarm 90; exec @ARGV' "$CH" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --user-data-dir="$PROF" --virtual-time-budget=30000 \
  --window-size=1600,1000 --hide-scrollbars --screenshot="$OUT/$1.png" "$U?$2" >/dev/null 2>&1; echo "$1"; }
shot g1_01_upright_hardstop_collapse "scenario=upright&t=0.467&cam=side&follow=1&dist=2.0&show=limits&joint=ankle_R"
shot g1_02_leanF_boot_edge_sink "scenario=leanF&t=1.679&cam=three&focus=foot_L&dist=1.3&yaw=-70&pitch=12&show=colliders"
shot g1_03_leanF_boot_edge_packageP "scenario=leanF&cfg=P&t=1.679&cam=three&focus=foot_L&dist=1.3&yaw=-70&pitch=12&show=colliders"
shot g1_04_drop1m_touchdown "scenario=drop1m&t=0.463&cam=side&focus=shank_L&dist=1.8&pitch=4&show=limits&joint=ankle_L"
shot g1_05_sideFirst_impact "scenario=sideFirst&t=0.30&cam=three&follow=1&dist=2.4&show=colliders"
shot g1_06_awkward_midfall "scenario=awkward&t=0.40&cam=three&follow=1&dist=2.4&show=vel"
shot g1_07_impact15_first_touch "scenario=impact15&t=0.021&cam=side&follow=1&dist=2.2&pitch=3&show=colliders"
shot g1_08_isoSelfCol_leg_contact "scenario=isoSelfCol&t=0.03&cam=front&focus=shank_R&dist=1.4&pitch=5"
shot g1_09_flatSupine_head_rest "scenario=flatSupine&t=6.5&cam=side&focus=head&dist=0.9&pitch=6&show=colliders"
