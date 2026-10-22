// Environment experiments apply to EVERY action, never per player or family.
import {PARAMETERS} from '../ballphys1/ball.js';
export const ENVIRONMENTS=Object.freeze({
 controlled:{...PARAMETERS,rollingDecel:1.2,slideFriction:.36,turfFriction:.36,turfRestitution:.50,airSpinDecay:.16,spinDecel:2,dragCoefficient:.28,liftSlope:.85},
 balanced:{...PARAMETERS,rollingDecel:.9,slideFriction:.30,turfFriction:.30,turfRestitution:.60,airSpinDecay:.12,spinDecel:1.6,dragCoefficient:.25,liftSlope:1},
 lively:{...PARAMETERS,rollingDecel:.65,slideFriction:.24,turfFriction:.24,turfRestitution:.67,airSpinDecay:.08,spinDecel:1.2,dragCoefficient:.22,liftSlope:1.15}
});
export const GLOBAL=Object.freeze(ENVIRONMENTS.balanced);
// Metres/second; power=0..1 interpolates endpoints continuously. Ground
// endpoints describe INTENDED ARRIVAL speed, not a universal launch speed.
export const FAMILIES=Object.freeze({
 short:{title:'Short / soft pass',kind:'ground',arrival:[2.5,5.5],cap:12,technique:'INSIDE',distance:5,seconds:3.5},
 ground:{title:'Ground pass',kind:'ground',arrival:[4.5,9],cap:20,technique:'INSIDE',distance:15,seconds:4},
 firm:{title:'Firm ground pass',kind:'ground',arrival:[7,12],cap:25,technique:'INSIDE',distance:25,seconds:4.5},
 driven:{title:'Driven pass',kind:'air',horizontal:[14,23],vertical:[.35,.95],rollingFraction:.65,sideSpin:0,technique:'LACES',distance:25,seconds:4},
 loft:{title:'Lofted pass',kind:'air',horizontal:[14,19],vertical:[8,11],backspin:[8,16],sideSpin:0,technique:'LACES',distance:25,seconds:4.5},
 cross:{title:'Cross',kind:'air',horizontal:[16,22],vertical:[7.5,9.5],backspin:[4,10],sideSpin:22,curveDefault:.6,technique:'INSIDE',distance:25,seconds:4},
 chip:{title:'Chip',kind:'air',horizontal:[6.5,10.5],vertical:[6.5,8.5],backspin:[24,40],sideSpin:0,technique:'CHIP',distance:12,seconds:4},
 placed:{title:'Placed / weak shot',kind:'air',horizontal:[13,19],vertical:[2.8,4.3],backspin:[0,0],sideSpin:16,curveDefault:.25,technique:'INSIDE_FINISH',distance:16,seconds:2.8,shot:true},
 shot:{title:'Normal shot',kind:'air',horizontal:[18,25],vertical:[5,6.5],backspin:[-8,-14],sideSpin:8,curveDefault:0,technique:'LACES',distance:18,seconds:2.8,shot:true},
 power:{title:'Power shot',kind:'air',horizontal:[24,31],vertical:[5,6.4],backspin:[-8,-16],sideSpin:5,curveDefault:0,technique:'LACES_POWER',distance:20,seconds:2.5,shot:true},
 curve:{title:'Curved shot',kind:'air',horizontal:[19,26],vertical:[6.4,7.4],backspin:[0,0],sideSpin:60,curveDefault:.65,technique:'INSIDE_FINISH',distance:22,seconds:3,shot:true}
});
export const CANDIDATES=[{id:'slow',label:'Slow / controlled',power:.15,color:'#d6b77a'},{id:'balanced',label:'Balanced',power:.5,color:'#79e0bb'},{id:'fast',label:'Fast / responsive',power:.85,color:'#b1acff'}];
