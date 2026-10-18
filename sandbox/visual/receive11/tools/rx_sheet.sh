#!/bin/zsh
# receive11/tools/rx_sheet.sh — a contact sheet (2 × 3 stills around the receive) of a lab case: S=<scratch> zsh rx_sheet.sh <case> <out.jpg> [view] [seed] [query]
HERE="${0:A:h}"; CASE="$1"; OUTJ="$2"; VIEW="${3:-game}"; SEED="${4:-1}"; XQ="${5:-&zoom=2.6}"; D="$S/tmp/sheet_$$"; mkdir -p "$D"
TIMES=$(node -e '
import("'"$HERE"'/rx_env.mjs").then(async (M) => { const C = await import("'"$HERE"'/../rx_cases.js"); const cs = C.seedCase(C.parseCase(process.argv[1]), +process.argv[2]); const S = M.makeReceive(cs, { seed: +process.argv[2] }); S.run();
  const a = S.rx.act, DT = M.DT; if (!a) { console.log("0.6,1.0,1.4,1.8,2.2,2.6"); return; } const tc = a.kc * DT, th = a.kh != null ? a.kh * DT : tc + 0.7;
  console.log([Math.max(0, tc - 0.32), tc - 0.12, tc, tc + 0.15, (tc + th) / 2 + 0.05, th + 0.25].map((x) => x.toFixed(3)).join(",")); }); ' "$CASE" "$SEED")
PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$S/ffmpeg" TMPDIR="$S/tmp" node "$HERE/../../dribble15/tools/d15_capture.cjs" --page receive11.html --q "case=$CASE&seed=$SEED&diag=1$XQ" --out "$D" --stills "$TIMES" --single "$VIEW" --w 1280 --h 720 --profile "$S/tmp/chrome_sheet_$$" 2>&1 | tail -1
F=($D/*.jpg); "$S/ffmpeg" -loglevel error -y -i ${F[1]} -i ${F[2]} -i ${F[3]} -i ${F[4]} -i ${F[5]} -i ${F[6]} -filter_complex "[0:v]scale=640:360[a];[1:v]scale=640:360[b];[2:v]scale=640:360[c];[3:v]scale=640:360[d];[4:v]scale=640:360[e];[5:v]scale=640:360[f];[a][b][c]hstack=3[t];[d][e][f]hstack=3[u];[t][u]vstack=2" "$OUTJ" && echo "sheet $OUTJ ($TIMES)"
rm -rf "$D" "$S/tmp/chrome_sheet_$$"
