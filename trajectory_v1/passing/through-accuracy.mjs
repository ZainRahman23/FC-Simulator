import {throughDemand} from './through-execution.mjs';
import {candidatePrecision} from './space-accuracy.mjs';
export function widerThroughPrecision(rating,baseDifficulty,solved,redirect=0,motion=0){
 const s=candidatePrecision('THROUGH',rating,baseDifficulty,solved),demand=throughDemand(solved,redirect,motion),oldDifficulty=s.ratingDifficulty,factor=((99-rating)/89)**1.2,ratio=s.factor?1.25*factor/s.factor:0;
 for(const k of ['direction','weight'])s.spreads[k]*=ratio*demand.value/oldDifficulty;
 s.extraTerms=demand.terms;s.physicalDemand=demand;s.ratingDifficulty=demand.value;s.baseSpreads={direction:5.5*1.2*1.25*factor,weight:.25*1.35*1.25*factor};s.bounds.direction=18;s.bounds.weight=.36;s.factor=factor;s.model='variation';s.sigmaDirection=s.floors.direction+s.spreads.direction;s.sigmaWeight=s.floors.weight+s.spreads.weight;return s;
}
