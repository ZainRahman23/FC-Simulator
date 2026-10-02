#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar"
R=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/x/mat/repro
for s in L@0.6 R@0.5 L@0.5; do echo "$s"; done | xargs -P 3 -L 1 zsh -c 'node tools/stepper/oracle_fast.mjs --cfg legacy2 --round 4 --starts $0 --kmax 29 --par 1 --out '$R'/legacy2r4_$0.json > '$R'/legacy2r4_$0.log 2>&1'
echo ALLDONE4
