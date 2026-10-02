#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar"
M=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/x/mat
TAG=${TAG:-S}
for cfg in 'h1ctrl {"horizon":1,"center":"ctrl"}' 'h1both {"horizon":1,"center":"both"}' 'h2both {"horizon":2,"beam":3,"center":"both"}'; do name=${cfg%% *}; js=${cfg#* };
  for s in R@0.5 L@0.5 L@0.6 R@0.55 R@0.6 L@0.55; do nice node tools/stepper/stepper_run.mjs --model $M/models/${TAG}_x$s.json --cfg "$js" --starts $s --n 40 --out $M/live/${TAG}_${name}_$s.json 2>&1 | grep -v "^mean" | sed "s/^/$name /"; done; done
echo LIVEDONE
