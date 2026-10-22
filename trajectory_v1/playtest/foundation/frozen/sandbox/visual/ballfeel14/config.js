import {GLOBAL,FAMILIES as OLD,PROPOSED as FROZEN} from '../ballfeel12/config.js';
import {LAWS} from '../ballfeel11/world.js';
export {GLOBAL};
// Two global surface calibrations for owner comparison. Neither depends on intent,
// target, elapsed time, distance travelled, attributes or the receiver ghost.
export const TURF=Object.freeze({
 current:LAWS.responsive,
 A:Object.freeze({id:'reference-A',high:3.6,low:8.8,knee:12,terminal:.35}),
 B:Object.freeze({id:'reference-B',high:4.2,low:10,knee:14,terminal:.35})
});
export const PROPOSED=Object.freeze({...FROZEN,rollingLaw:TURF.A});
export const FAMILIES=Object.freeze({...OLD,
 short:{...OLD.short,arrival:[7,11]},
 ground:{...OLD.ground,arrival:[12,16]},
 through:{...OLD.ground,title:'Weighted through ball',distance:25,arrival:[5.5,8.5],cap:32},
 firm:{...OLD.firm,arrival:[14,19]}
});
export const CANDIDATES=['through','ground','short','firm','driven','power'].flatMap(family=>['current','A','B'].map(variant=>({id:`${family}-${variant}`,family,variant,title:`${variant==='current'?'CURRENT 1.3':'CANDIDATE '+variant} · ${family==='ground'?'normal':family}`,distance:family==='ground'?13:family==='short'?5:family==='power'?20:25,power:.5})));
// These speeds are existing Touchline constants, not a new receiving controller.
export const RUNNER=Object.freeze({run:5,sprint:8.2,acceleration:4.8,start:10,reaction:.12,zone:[20,31],source:'sandbox/visual/match.js:2185 RUNV / VMAX / ACC'});
