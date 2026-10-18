#!/bin/zsh
# receive11/tools/rx_stills.sh — frame stills of a lab case around its receive (contact / handoff times from the Node run):
#   S=<scratch with node_r + ffmpeg> zsh rx_stills.sh <case> <out dir> [view game|nearC|top|…] [seed] [extra query]
HERE="${0:A:h}"; CASE="$1"; OUT="$2"; VIEW="${3:-nearC}"; SEED="${4:-1}"; XQ="${5:-}"
TIMES=$(node -e '
import("'"$HERE"'/rx_env.mjs").then(async (M) => { const C = await import("'"$HERE"'/../rx_cases.js"); const cs = C.seedCase(C.parseCase(process.argv[1]), +process.argv[2]); const S = M.makeReceive(cs, { seed: +process.argv[2] }); S.run();
  const a = S.rx.act, DT = M.DT; if (!a) { console.log("0.5,1.0,1.5,2.0"); return; } const tc = a.kc * DT, th = a.kh != null ? a.kh * DT : tc + 0.6, t0 = a.k0 * DT;
  console.log([Math.max(0, tc - 0.45), tc - 0.25, tc - 0.1, tc, tc + 0.1, tc + 0.22, (tc + th) / 2, th, th + 0.35].map((x) => x.toFixed(3)).join(",")); }); ' "$CASE" "$SEED")
echo "stills at $TIMES"
PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$S/ffmpeg" TMPDIR="$S/tmp" node "$HERE/../../dribble15/tools/d15_capture.cjs" --page receive11.html --q "case=$CASE&seed=$SEED&diag=1$XQ" --out "$OUT" --stills "$TIMES" --single "$VIEW" --w 1280 --h 720 --profile "$S/tmp/chrome_stills" 2>&1 | tail -3
