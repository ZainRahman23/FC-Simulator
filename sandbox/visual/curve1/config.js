import {createKeeperRuntime} from '../gkshotmap1/frozen/keeper.js';
export const FOUNDATION='c62f85412adcf088f7b5fbb4a8d927ac43b961bd';
export const EXPONENT=2.7;
// Selected before keeper outcomes: 60 produces a reversing 99-Curve long shot.
// 40 retains a good ordinary 75 anchor and expressive, non-reversing 99 flight.
export const SPIN_AT_75=40;
export const RATINGS=Object.freeze([0,25,50,60,70,75,80,85,90,95,99]);
export const PRIMARY=Object.freeze([50,75,90,99]);
const api=createKeeperRuntime();
export const COURTOIS_SOURCE=Object.freeze({...api.constants.GK_CAP.COURTOIS});
// match.js deliberately does not apply profile.positioning when changing the
// keeper profile. Retain its default band value, not the database metadata 94.
export const COURTOIS=Object.freeze({...COURTOIS_SOURCE,name:'COURTOIS',positioning:api.constants.GK_CFG.attrs.gk_positioning});
export const SCENARIOS=Object.freeze([
 {id:'A',name:'Classic far-corner finesse',origin:[84,.11,26],target:[105,1.4,37],depth:21},
 {id:'B',name:'Longer far-corner finesse',origin:[80,.11,25],target:[105,1.4,37],depth:25}
]);
