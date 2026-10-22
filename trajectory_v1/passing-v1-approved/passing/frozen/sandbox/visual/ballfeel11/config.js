import {GLOBAL as BALANCED,FAMILIES as PREVIOUS} from '../ballfeel1/config.js';
export {LAWS} from './world.js';
export {BALANCED};
// ONE environment for all new action families. Higher lift cap allows sidespin
// expression; slope/drag/vertical restitution/sliding friction stay unchanged.
export const GLOBAL=Object.freeze({...BALANCED,maxLift:1.2,spinDecel:12});
export const FAMILIES=Object.freeze({
 ...PREVIOUS,
 short:{...PREVIOUS.short,title:'Sharp short pass',arrival:[4.5,7],cap:22},
 ground:{...PREVIOUS.ground,arrival:[6.5,10],cap:32},
 firm:{...PREVIOUS.firm,arrival:[11,16],cap:38},
 driven:{...PREVIOUS.driven,horizontal:[24,36]},
 loft:{...PREVIOUS.loft,horizontal:[16,21]},
 cross:{...PREVIOUS.cross,horizontal:[19,25],sideSpin:30},
 chip:{...PREVIOUS.chip,horizontal:[7.5,11.5],backspin:[22,36]},
 placed:{...PREVIOUS.placed,horizontal:[17,24]},
 shot:{...PREVIOUS.shot,horizontal:[23,31]},
 power:{...PREVIOUS.power,horizontal:[29,40]},
 curve:{...PREVIOUS.curve,horizontal:[19,26],sideSpin:110,curveDefault:1}
});
export const SPEEDS=[{id:'balanced',label:'BALANCED control',speed:9.398938821},{id:'fast',label:'FAST',speed:12.5},{id:'very-fast',label:'VERY RESPONSIVE',speed:15}];
export const CURVES=[{id:'current',label:'CURRENT',spin:39},{id:'strong',label:'STRONG',spin:60},{id:'very-strong',label:'VERY STRONG',spin:80},{id:'spectacular',label:'SPECTACULAR',spin:110},{id:'extreme',label:'EXTREME',spin:135}];
