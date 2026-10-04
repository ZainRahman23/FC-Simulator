# Outcome attribution (pre-correction code + one correction at a time; tools/b_sym_patch.mjs in the scratch copy of d80f88f)

```
G2 eval: 1 jobs change with at least one correction
  ["eval","V2-REF",{"kind":"push","dir":"R","J":25},"kXi 0.5"]
     none: step required → fell
     region: recovered
     lm: step required → fell
     readnorm: recovered
     region,lm,readnorm: recovered
G3 strategy+T7: 4 jobs change with at least one correction
  ["T7","T7:R:0.75","V2-REF",null,null,null,null]
     none: recovered (aborted) [abort 1.592]
     region: recovered (aborted) [abort 1.596]
     lm: recovered (aborted) [abort 1.592]
     readnorm: recovered (aborted) [abort 1.592]
     region,lm,readnorm: recovered (aborted) [abort 1.596]
  ["strategy","T8:hold:R:R:15","V2-REF","{\"hip\":true}",null,null,null]
     none: step required → fell (aborted) [abort 4.100]
     region: step required → fell (aborted) [abort 4.104]
     lm: step required → fell (aborted) [abort 4.100]
     readnorm: step required → fell (aborted) [abort 4.100]
     region,lm,readnorm: step required → fell (aborted) [abort 4.104]
  ["T7","T7:L:0.75","V2-REF",null,null,null,null]
     none: recovered (aborted) [abort 1.592]
     region: recovered (aborted) [abort 1.596]
     lm: recovered (aborted) [abort 1.592]
     readnorm: recovered (aborted) [abort 1.592]
     region,lm,readnorm: recovered (aborted) [abort 1.596]
  ["strategy","T8:hold:R:R:10","V2-REF","{\"arms\":true}",null,null,null]
     none: step required → fell (aborted) [abort 4.879]
     region: recovered
     lm: step required → fell (aborted) [abort 4.879]
     readnorm: step required → fell (aborted) [abort 4.883]
     region,lm,readnorm: recovered
knee + boundary groups: 6 jobs change
  ["knee","T8:hold:R:R:10","V2-REF",null,null,{"kneeFlexDeg":15},null]
     none: step required → fell (aborted) [abort 4.392]
     region: step required → fell (aborted) [abort 4.442]
     lm: step required → fell (aborted) [abort 4.392]
     readnorm: step required → fell (aborted) [abort 4.392]
     region,lm,readnorm: step required → fell (aborted) [abort 4.442]
  ["knee","T8:hold:R:R:10","V2-REF",null,null,{"kneeFlexDeg":10},null]
     none: step required → fell (aborted) [abort 4.483]
     region: step required → fell (aborted) [abort 4.550]
     lm: step required → fell (aborted) [abort 4.483]
     readnorm: step required → fell (aborted) [abort 4.479]
     region,lm,readnorm: step required → fell (aborted) [abort 4.550]
  ["knee","T8:hold:R:R:10","V2-REF",null,null,{"kneeFlexDeg":20},null]
     none: step required → fell (aborted) [abort 4.392]
     region: step required → fell (aborted) [abort 4.421]
     lm: step required → fell (aborted) [abort 4.392]
     readnorm: step required → fell (aborted) [abort 4.392]
     region,lm,readnorm: step required → fell (aborted) [abort 4.421]
  ["boundary","T8:ramp:R:R:12.5","V2-REF",null,null,null,null]
     none: step required → fell (aborted) [abort 2.517]
     region: step required → fell (aborted) [abort 2.529]
     lm: step required → fell (aborted) [abort 2.517]
     readnorm: step required → fell (aborted) [abort 2.517]
     region,lm,readnorm: step required → fell (aborted) [abort 2.529]
  ["boundary","UP:R:R:10","V2-REF",null,null,null,null]
     none: step required → fell (aborted) [abort 8.129]
     region: step required → fell (aborted) [abort 8.167]
     lm: step required → fell (aborted) [abort 8.129]
     readnorm: step required → fell (aborted) [abort 8.129]
     region,lm,readnorm: step required → fell (aborted) [abort 8.167]
  ["boundary","UP:L:L:10","V2-REF",null,null,null,null]
     none: step required → fell (aborted) [abort 8.129]
     region: step required → fell (aborted) [abort 8.162]
     lm: step required → fell (aborted) [abort 8.129]
     readnorm: step required → fell (aborted) [abort 8.129]
     region,lm,readnorm: step required → fell (aborted) [abort 8.162]
```
