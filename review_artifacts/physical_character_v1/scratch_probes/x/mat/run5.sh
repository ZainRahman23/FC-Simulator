#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar"
M=/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/x/mat
for s in R@0.5 L@0.5 L@0.6 R@0.55 R@0.6 L@0.55; do echo "D $s --policy $M/models/D_C_x$s.json"; echo "F $s --terminal $M/models/V_C_x$s.json"; done | while read c s a b; do
  if [ "$c" = "D" ]; then node tools/stepper/oracle_fast.mjs --cfg B --policy $b --starts $s --kmax 21 --par 1 --out $M/D_$s.json > $M/D_$s.log 2>&1 &
  else node tools/stepper/oracle_fast.mjs --cfg B --terminal $b --starts $s --kmax 21 --par 1 --out $M/F_$s.json > $M/F_$s.log 2>&1 & fi
  while [ $(jobs -r | wc -l) -ge ${P:-3} ]; do sleep 5; done
done; wait; echo ALLDONE5
