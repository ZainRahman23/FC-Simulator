// PASSING-V1: all values are provisional owner-review candidates.
export const C=Object.freeze({version:'PASSING-V1-provisional',radius:.11,dt:1/60,substeps:4,maxSeconds:12,
 charge:{tapMs:40,fullMs:500}, ground:{shortArrival:[2,8],throughExtra:[.8,3.8],throughHeadstart:[.15,.5],lift:[.35,.60],rollingFraction:.96,iterations:14},
 cross:{arrivalHeight:1.2,apexFloor:2.2,apexIntercept:1.2,apexPerMetre:.09,floatFactor:1.2,firmReduction:.35,backspin:8,iterations:9},
 capability:{reference:90,referenceSpeed:34,SHORT:.85,THROUGH:.90,CROSS:.80},
 precision:{exponent:2.1,SHORT:{yawFloor:.012,yawRange:5,weightFloor:.0006,weightRange:.22,elevationFloor:0,elevationRange:0},THROUGH:{yawFloor:.015,yawRange:5.5,weightFloor:.0007,weightRange:.25,elevationFloor:0,elevationRange:0},CROSS:{yawFloor:.018,yawRange:6,weightFloor:.0008,weightRange:.20,elevationFloor:.012,elevationRange:3.5}},
 difficulty:{floor:.12,distance:.85,speed:.45,redirection:.25,height:.20,motion:.20,distanceScale:30,speedScale:30,heightScale:6,motionScale:8.2},
 ratingAttribute:{SHORT:'short_passing',THROUGH:'long_passing',CROSS:'crossing'},runnerSpeeds:{stationary:0,jog:3,run:5,sprint:8.2}});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
export const magnitude=v=>Math.hypot(...v);
export const charge=ms=>clamp((ms-C.charge.tapMs)/(C.charge.fullMs-C.charge.tapMs),0,1);
export function speedCeiling(rating,family){const cap=r=>.65+.65*(r/99)**2;return C.capability.referenceSpeed*cap(rating)/cap(C.capability.reference)*C.capability[family];}
export function launchVector(s,pitch,yaw){return [s*Math.cos(rad(pitch))*Math.cos(rad(yaw)),s*Math.sin(rad(pitch)),s*Math.cos(rad(pitch))*Math.sin(rad(yaw))];}
export function rotate(v,yaw){const a=rad(yaw);return [v[0]*Math.cos(a)-v[2]*Math.sin(a),v[1],v[0]*Math.sin(a)+v[2]*Math.cos(a)];}
