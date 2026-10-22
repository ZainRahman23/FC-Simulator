// Reference-guided launch choices only; the approved physical world is unchanged.
export {PLAYER,CONTEXT,BRACKETS,FAMILY_ORDER,SHOT_POWER_PROJECTIONS,GLOBAL,PROPOSED,TURF} from '../ballshot1/config.js';
import {FAMILIES as PREVIOUS,FAMILY_ORDER,BRACKETS} from '../ballshot1/config.js';
export const FAMILIES=Object.freeze({
 INSIDE:Object.freeze({...PREVIOUS.INSIDE,title:'FINESSE / INSIDE',angleDeg:11.5,note:'Slightly more rising placement flight; retain meaningful 30 m/s pace and frozen sidespin.'}),
 OUTSIDE:Object.freeze({...PREVIOUS.OUTSIDE,title:'TRIVELA / OUTSIDE',note:'Keep existing outside spin and pace; supplied end-state clip cannot establish a new flight envelope.'}),
 LACES:Object.freeze({...PREVIOUS.LACES,title:'NORMAL / LACES',note:'Preserved 34 m/s conventional hard strike; second only to Power at equal rating, bracket, intent and context.'}),
 POWER:Object.freeze({...PREVIOUS.POWER,angleDeg:10,note:'Preserve strongest 39 m/s strike and 0.65 s preparation; stronger rising drive toward upper goal.'}),
 CHIP:Object.freeze({...PREVIOUS.CHIP,speeds:[15.5,17,18.5],angleDeg:30,conversion:17/34,bracketScale:[15.5/17,1,18.5/17],note:'Quicker loft with less hang time; retain +12 rad/s backspin and true physical landing.'})
});
export const CANDIDATES=Object.freeze(FAMILY_ORDER.flatMap(family=>BRACKETS.map(bracket=>Object.freeze({id:`${family.toLowerCase()}-${bracket}`,family,bracket,title:`${FAMILIES[family].title} · ${bracket.toUpperCase().replace('-',' ')}`,distance:19}))));
export const SELECTED=Object.freeze(CANDIDATES.filter(c=>c.bracket==='fast'));
