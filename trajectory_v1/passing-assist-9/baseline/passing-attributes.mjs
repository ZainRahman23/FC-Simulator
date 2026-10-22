// Attribute composition only. Existing family distributions remain untouched.
export const PASSING_ATTRIBUTES=Object.freeze({version:'PASSING-ATTRIBUTES-5-provisional',SHORT:{primary:'short_passing',primaryWeight:.85,visionWeight:.15,label:'Short Pass'},THROUGH:{primary:'long_passing',primaryWeight:.70,visionWeight:.30,label:'Through Ball'},CROSS:{primary:'crossing',primaryWeight:.85,visionWeight:.15,label:'Cross'}});
export function passingAccuracy(family,attributes){
 const c=PASSING_ATTRIBUTES[family];if(!c)throw Error('Unknown passing family');
 const primary=attributes[c.primary],legacy=attributes.vision===undefined,vision=legacy?primary:attributes.vision;
 if(![primary,vision].every(x=>Number.isFinite(x)&&x>=1&&x<=99))throw Error('Passing and Vision attributes must be 1–99');
 // Algebraically the requested weighted sum. This form also preserves the old
 // rating bit-for-bit when Vision equals the primary rating. No rounding.
 const effective=primary+c.visionWeight*(vision-primary);
 return {version:PASSING_ATTRIBUTES.version,family,primaryAttribute:c.primary,primary,vision,primaryWeight:c.primaryWeight,visionWeight:c.visionWeight,effective,legacyVisionFallback:legacy,formula:`${c.primaryWeight} × ${primary} + ${c.visionWeight} × ${vision} = ${effective}`};
}
export const PLAYER_ARCHETYPES=Object.freeze({balanced:{label:'Balanced passer',short_passing:80,long_passing:80,crossing:80,vision:80,curve:80,shot_power:80},short:{label:'Short-pass specialist',short_passing:95,long_passing:65,crossing:60,vision:80,curve:80,shot_power:80},through:{label:'Through-ball specialist',short_passing:75,long_passing:95,crossing:65,vision:90,curve:80,shot_power:80},cross:{label:'Crossing specialist',short_passing:70,long_passing:70,crossing:95,vision:85,curve:90,shot_power:80},vision:{label:'Vision specialist',short_passing:70,long_passing:70,crossing:70,vision:95,curve:80,shot_power:80}});
