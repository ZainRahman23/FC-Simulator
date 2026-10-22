import {defaultInput} from '../passing/resolver.mjs';import {fixture as spaceFixture,distance,stats,correlations} from '../passing-variation-4/common.mjs';
export {distance,stats,correlations};export const primary={SHORT:'short_passing',THROUGH:'long_passing',CROSS:'crossing'};
export function fixture(family='SHORT',d=15,rating=80,vision=rating,event='attributes5-0'){
 const i=family==='SHORT'?defaultInput():spaceFixture(family,d,rating,'variation',event);i.family=family;i.passId='attributes-5';i.seed='20261019';i.drawEventId=event;i.attributes={short_passing:80,long_passing:80,crossing:80,vision,shot_power:80,curve:80};i.attributes[primary[family]]=rating;i.accuracyModel='variation';i.crossCurveModel='newest';
 if(family==='SHORT'){i.origin=[35,.11,34];i.receiver={id:'A',position:[35+d,.11,34],velocity:[0,0,0]};i.aimPoint=i.receiver.position.slice();i.facingYaw=0;i.holdMs=0;}return i;
}
