// Launch calibration only. The physical environment is imported unchanged.
export {GLOBAL,PROPOSED,TURF} from '../ballfeel14/config.js';
export const PLAYER=Object.freeze({id:'controlled-80',shotPower:80,finishing:50,longShots:50,curve:50,technique:50,weakFoot:50,preferredFoot:'R'});
export const CONTEXT=Object.freeze({selectedFoot:'R',pressure:0,stamina:1,energy:1,bodySetup:1,executionQuality:1,charge:1,startingVelocity:[0,0,0],contactPosition:[0,.11,0],description:'Preferred foot; neutral 50 technique attributes; full intent; clean stationary ball and body setup; no pressure; full stamina/energy.'});
export const FAMILY_ORDER=Object.freeze(['INSIDE','OUTSIDE','LACES','POWER','CHIP']);
export const BRACKETS=Object.freeze(['controlled','fast','very-fast']);
export const FAMILIES=Object.freeze({
 INSIDE:Object.freeze({title:'INSIDE',color:'#6fe6c3',speeds:[26,30,34],angleDeg:10,yawDeg:-4,sideSpin:-35,backSpin:0,prepareSeconds:.24,conversion:30/34,bracketScale:[26/30,1,34/30],commitment:1,note:'Controlled inside-foot conversion; moderate sidespin, neutral forward lift.'}),
 OUTSIDE:Object.freeze({title:'OUTSIDE / TRIVELA',color:'#b5a2ff',speeds:[28,32,36],angleDeg:11,yawDeg:7,sideSpin:60,backSpin:-2,prepareSeconds:.30,conversion:32/34,bracketScale:[28/32,1,36/32],commitment:1,note:'Opposite yaw spin and outward launch geometry; frozen fc-b response.'}),
 LACES:Object.freeze({title:'LACES',color:'#6cb8ff',speeds:[30,34,38],angleDeg:8,yawDeg:0,sideSpin:0,backSpin:-4,prepareSeconds:.28,conversion:1,bracketScale:[30/34,1,38/34],commitment:1,note:'Efficient direct conventional strike; modest topspin and lift.'}),
 POWER:Object.freeze({title:'POWER SHOT',color:'#ffad6b',speeds:[34,39,44],angleDeg:7,yawDeg:0,sideSpin:0,backSpin:-8,prepareSeconds:.65,conversion:1,bracketScale:[34/39,1,44/39],commitment:39/34,note:'Full-body commitment and longer readable wind-up; same Shot Power 80.'}),
 CHIP:Object.freeze({title:'CHIP',color:'#f3dc83',speeds:[15,16,18],angleDeg:36,yawDeg:0,sideSpin:0,backSpin:12,prepareSeconds:.32,conversion:16/34,bracketScale:[15/16,1,18/16],commitment:1,note:'Vertical conversion and backspin; lower scalar/horizontal speed is intentional.'})
});
export const CANDIDATES=Object.freeze(FAMILY_ORDER.flatMap(family=>BRACKETS.map(bracket=>Object.freeze({id:`${family.toLowerCase()}-${bracket}`,family,bracket,title:`${FAMILIES[family].title} · ${bracket.toUpperCase().replace('-',' ')}`,distance:19}))));
export const SELECTED=Object.freeze(CANDIDATES.filter(c=>c.bracket==='fast'));
export const SHOT_POWER_PROJECTIONS=Object.freeze([50,65,80,90,99]);
