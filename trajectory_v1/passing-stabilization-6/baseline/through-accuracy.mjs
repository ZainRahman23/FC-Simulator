import {candidatePrecision} from './space-accuracy.mjs';
export function widerThroughPrecision(rating,baseDifficulty,solved){
 const s=candidatePrecision('THROUGH',rating,baseDifficulty,solved),factor=((99-rating)/89)**1.2,ratio=s.factor?1.25*factor/s.factor:0;
 for(const k of ['direction','weight'])s.spreads[k]*=ratio;
 s.bounds.direction=18;s.bounds.weight=.36;s.factor=factor;s.model='variation';s.sigmaDirection=s.floors.direction+s.spreads.direction;s.sigmaWeight=s.floors.weight+s.spreads.weight;return s;
}
