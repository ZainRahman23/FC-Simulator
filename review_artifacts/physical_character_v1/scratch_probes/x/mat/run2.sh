#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar"
M=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/x/mat
for c in Gu Gw Bu Ew; do for s in R@0.5 L@0.5 L@0.6 R@0.55 R@0.6 L@0.55; do echo "$c $s"; done; done | xargs -P ${P:-4} -L 1 zsh -c 'node tools/stepper/oracle_fast.mjs --cfg $0 --starts $1 --kmax 21 --par 1 --out '$M'/$0_$1.json > '$M'/$0_$1.log 2>&1'
echo ALLDONE2
