#!/bin/zsh
# Analysis pipeline for the attribute-system pass. Run after the sweep batches, phase B/C and the batteries have finished.
cd "$(dirname "$0")"; T="/Users/zainrahman/Downloads/FC Simulator/sandbox/visual/tools/gk_eval"; A="/Users/zainrahman/Downloads/FC Simulator/review_artifacts/gk_v1_attribute_system"
mkdir -p $A/curves $A/sheets $A/data $A/harness $A/tables
# 1 · response curves, both builds
for b in cad400a new; do for f in attr/$b/*.json; do a=$(basename $f .json); case $a in smoke|fixtures|styles|dist*|ang*|HxJ*|HxD*|HxR*|DxA*|RxD*) continue;; esac; python3 $T/gk_attr_curves.py $f --out curves/$b --label $b > /dev/null 2>&1 || echo "curves fail $b $a"; done; done
cp curves/cad400a/*.png $A/curves/ 2>/dev/null; for f in curves/cad400a/*.png; do cp $f $A/curves/OLD_$(basename $f); done; for f in curves/new/*.png; do cp $f $A/curves/NEW_$(basename $f); done; rm -f $A/curves/[a-z]*_curves.png
cp curves/new/*.md $A/tables/ 2>/dev/null; for f in curves/cad400a/*.md; do cp $f $A/tables/OLD_$(basename $f); done
# 2 · fixture ladder + styles + interactions (band tables + gains/losses)
python3 $T/gk_profile_bands.py attr/new/fixtures.json --fam STRAIGHT --ref POOR > $A/tables/fixtures_STRAIGHT.md 2>&1
python3 $T/gk_profile_bands.py attr/new/fixtures.json --fam INSIDE_R --ref POOR > $A/tables/fixtures_INSIDE_R.md 2>&1
python3 $T/gk_profile_bands.py attr/new/styles.json --fam STRAIGHT --ref AVERAGE > $A/tables/styles_STRAIGHT.md 2>&1
python3 $T/gk_profile_bands.py attr/new/styles.json --fam INSIDE_R --ref AVERAGE > $A/tables/styles_INSIDE_R.md 2>&1
for g in HxJ_h183 HxJ_h199 HxD_h183 HxD_h199 HxR_h183 HxR_h199 DxA_a40 DxA_a99 RxD_d30 RxD_d12; do [ -s attr/new/$g.json ] && python3 $T/gk_profile_bands.py attr/new/$g.json --fam STRAIGHT > $A/tables/interaction_$g.md 2>&1; done
# 3 · distance / angle
python3 $T/gk_distance_angle_table.py d30=attr/new/dist30.json d25=attr/new/dist25.json d20=attr/new/fixtures.json d16=attr/new/dist16.json d12=attr/new/dist12.json d8=attr/new/dist8.json --fam STRAIGHT > $A/tables/distance_STRAIGHT.md 2>&1
python3 $T/gk_distance_angle_table.py d30=attr/new/dist30.json d25=attr/new/dist25.json d20=attr/new/fixtures.json d16=attr/new/dist16.json d12=attr/new/dist12.json d8=attr/new/dist8.json --fam INSIDE_R > $A/tables/distance_INSIDE_R.md 2>&1
python3 $T/gk_distance_angle_table.py a0=attr/new/ang0.json a20=attr/new/ang20.json a40=attr/new/ang40.json a60=attr/new/ang60.json --fam STRAIGHT > $A/tables/angle_STRAIGHT.md 2>&1
python3 $T/gk_distance_angle_table.py a0=attr/new/ang0.json a20=attr/new/ang20.json a40=attr/new/ang40.json a60=attr/new/ang60.json --fam INSIDE_R > $A/tables/angle_INSIDE_R.md 2>&1
# 4 · heat maps for the fixtures (existing renderer)
mkdir -p render/fixtures && python3 $T/gk_profile_goalface_render.py attr/new/fixtures.json render/fixtures > render/fixtures/report.txt 2>&1 && cp render/fixtures/maps_STRAIGHT.png $A/sheets/H_fixtures_goalface_STRAIGHT.png && cp render/fixtures/maps_INSIDE_R.png $A/sheets/H_fixtures_goalface_INSIDE_R.png && cp render/fixtures/maps_hard_STRAIGHT.png $A/sheets/H_fixtures_hard_STRAIGHT.png && cp render/fixtures/maps_hard_INSIDE_R.png $A/sheets/H_fixtures_hard_INSIDE_R.png && cp render/fixtures/report.txt $A/tables/fixtures_render_report.txt
mkdir -p render/styles && python3 $T/gk_profile_goalface_render.py attr/new/styles.json render/styles > render/styles/report.txt 2>&1 && cp render/styles/maps_hard_STRAIGHT.png $A/sheets/I_styles_hard_STRAIGHT.png && cp render/styles/maps_STRAIGHT.png $A/sheets/I_styles_goalface_STRAIGHT.png
# 5 · acceptance table + analytic
python3 $T/gk_acceptance_table.py --goalface attr/new/fixtures.json --analytic attr/analytic_new.json --ground gath/ground_fixtures_new.json --chest gath/chest_fixtures_new.json --profiles POOR,AVERAGE,GOOD,ELITE,COURTOIS > $A/tables/acceptance_STRAIGHT.md 2>&1
python3 $T/gk_acceptance_table.py --goalface attr/new/fixtures.json --analytic attr/analytic_new.json --ground gath/ground_fixtures_new.json --chest gath/chest_fixtures_new.json --profiles POOR,AVERAGE,GOOD,ELITE,COURTOIS --fam INSIDE_R > $A/tables/acceptance_INSIDE_R.md 2>&1
python3 $T/gk_acceptance_table.py --goalface attr/new/styles.json --analytic attr/analytic_new.json --ground gath/ground_fixtures_new.json --chest gath/chest_fixtures_new.json --profiles AVERAGE,GOOD,TALL_SLOW,SHORT_EXPLOSIVE,HANDLER,STOPPER > $A/tables/acceptance_styles.md 2>&1
# 4b · angled positioning sweep (positioning acts only off-centre)
[ -s attr/new/posang40.json ] && python3 $T/gk_attr_curves.py attr/new/posang40.json --out curves/new_ang40 --label new-16m-40deg > /dev/null 2>&1 && cp curves/new_ang40/positioning_curves.md $A/tables/positioning_ang40_curves.md && cp curves/new_ang40/positioning_curves.png $A/curves/NEW_positioning_ang40_curves.png
[ -s attr/new/reflexes_AVG.json ] && python3 $T/gk_attr_curves.py attr/new/reflexes_AVG.json --out curves/new_AVG --label new-AVERAGE-base > /dev/null 2>&1 && cp curves/new_AVG/reflexes_curves.md $A/tables/reflexes_AVERAGE_base_curves.md && cp curves/new_AVG/reflexes_curves.png $A/curves/NEW_reflexes_AVERAGE_base_curves.png
# 5b · handling batteries
python3 $T/gk_handling_battery_table.py --ground gath/ground_hsweep_new.json --chest gath/chest_hsweep_new.json > $A/tables/handling_batteries.md 2>&1
# 6 · point-blank audit
python3 $T/gk_pointblank_audit.py --ground gath/ground_fixtures_new.json --goalface attr/new/dist8.json --profiles POOR,AVERAGE,GOOD,ELITE,COURTOIS > $A/tables/pointblank_audit.md 2>&1
# 7 · data + harness copies
cp attr/analytic_new.json attr/constants_cad400a.json $A/data/; for f in attr/new/*.json attr/cad400a/*.json; do gzip -c $f > $A/data/$(basename $(dirname $f))_$(basename $f).gz; done
cp gath/ground_hsweep_new.json gath/chest_hsweep_new.json gath/ground_fixtures_new.json gath/chest_fixtures_new.json $A/data/
cp gk_run.sh run_attr_sweeps.sh run_phase_b.sh run_phase_c.sh analyze_all.sh gk_constants_dump.js gather_lib.js gather_battery.js $A/harness/
echo ANALYZE_ALL_DONE
