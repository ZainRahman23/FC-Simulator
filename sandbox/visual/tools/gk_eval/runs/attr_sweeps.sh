#!/bin/zsh
# Attribute response sweeps on the K1 (POOR) base, full matched corpus, both families. $1 = output dir label (build tag)
cd "$(dirname "$0")"; TAG=$1; OUTD=attr/$TAG; PAGE=${2:-match.html}; export GK_PAGE=$PAGE
[ -s $OUTD/reflexes.json ] || ./gk_run.sh $OUTD reflexes     --sweep "reflexes=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD diving       --sweep "diving=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD jumping      --sweep "jumping=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD handling     --sweep "handling=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD height       --sweep "height=175,180,185,190,195,200" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD acceleration --sweep "acceleration=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD speed        --sweep "speed=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD strength     --sweep "strength=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD weight       --sweep "weight=70,80,90,100" --base K1 --compact --determinismN 8
./gk_run.sh $OUTD positioning  --sweep "positioning=40,50,60,70,80,90,99" --base K1 --compact --determinismN 8 --holdPositioning false
echo SWEEPS_${TAG}_DONE
