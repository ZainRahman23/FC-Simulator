import * as base from './physics.mjs';
import * as cross from './cross-physics.mjs';
export {advanceFlight,summarize,atTime,blend} from './physics.mjs';
export const createFlight=(a,...args)=>(a.metadata?.physics==='continuous-magnus'?cross:base).createFlight(a,...args);
export const simulate=(a,...args)=>(a.metadata?.physics==='continuous-magnus'?cross:base).simulate(a,...args);
