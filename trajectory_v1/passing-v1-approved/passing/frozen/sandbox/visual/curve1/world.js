import {BallWorld as FrozenWorld} from '../ballfeel14/world.js';
import {CURVE_CONTROL} from '../ballfeel12/world.js';
// Separately authorized CURVE-1 Finesse candidate. This chooses the existing
// ordinary physical Magnus branch: gain 1 at every speed, no speed window,
// no late boost, no quench or spin-dependent response shaping. Drag, gravity,
// angular decay, lift slope/cap, contacts, turf and integrator remain inherited.
// Only this isolated Finesse lab uses this class. The frozen foundation and
// Trivela/other family labs continue to use their original world.
export class BallWorld extends FrozenWorld {
 constructor(options={}){super({...options,curveLaw:CURVE_CONTROL});}
}
