export {GLOBAL,FAMILIES,PROPOSED} from '../ballfeel12/config.js';
const candidate=(id,title,family,lift,fraction,note,extra={})=>Object.freeze({id,title,family,lift,fraction,note,...extra});
export const NORMAL=[
 candidate('normal-control','NEAR ROLL CONTROL','ground',null,null,'Exact approved normal pass.',{control:true}),
 candidate('normal-micro','MICRO-SKIP','ground',1,.94,'Subtle physical launch hop; near rolling at gameplay scale.'),
 candidate('normal-visible','VISIBLE MICRO-SKIP','ground',1.6,.94,'Visible upper normal-pass comparison; horizontal launch unchanged.'),
 candidate('normal-too','TOO BOUNCY','ground',4,.94,'Rejection boundary: shin-height clearance is too much for a normal ground pass.',{reject:true})
];
export const FIRM=[
 candidate('firm-control','FIRM CONTROL','firm',null,null,'Exact approved firm pass.',{control:true}),
 candidate('firm-subtle','FIRM SUBTLE','firm',1.2,.97,'Low end of the firm-pass continuum.'),
 candidate('firm-balanced','FIRM FOOTBALL SKIP','firm',1.8,.95,'Middle ground: stronger contact texture without a loft.'),
 candidate('firm-game','FIRM GAME SKIP','firm',2.4,.95,'Upper firm-pass comparison; more visible first hop.')
];
export const DRIVEN=[
 candidate('driven-control','CONTROL · SHORTER SKID B','driven',null,null,'Exact 1.2 control: 33 m/s, 0.65 m/s lift, 20% forward rolling spin.',{control:true}),
 candidate('driven-subtle','SUBTLE SKIP · RUNOUT OPTION','driven',1,.15,'32 m/s (−3.0%); 15% rolling spin. Tests the shorter-runout tradeoff.',{speedScale:32/33}),
 candidate('driven-medium','MEDIUM SKIP','driven',1.6,.2,'Same 33 m/s and spin as control; only lift changes.'),
 candidate('driven-strong','STRONG FOOTBALL SKIP','driven',2.2,.2,'Pronounced first skip with diminishing physical rebounds.'),
 candidate('driven-exaggerated','EXAGGERATED GAME SKIP','driven',3,.2,'Upper game-style boundary; already borderline for receiving.'),
 candidate('driven-too','TOO BOUNCY','driven',4.7,.2,'Deliberate rejection boundary: starts reading as a low loft.',{reject:true})
];
export const SHOTS=[
 candidate('shot-control','LOW SHOT · NO INITIAL SKIP','power',0,null,'Approved 34.5 m/s shot pace and −12 rad/s topspin; zero lift.'),
 candidate('shot-skim','LOW SHOT · TURF SKIM','power',1.2,null,'Same shot pace/spin, with a small physical vertical launch.'),
 candidate('shot-strong','LOW SHOT · STRONG SKIP','power',2,null,'More aggressive skim; diagnostic receiving planes remain available.')
];
export const SOFT=candidate('soft-near-roll','SOFT · NEAR ROLL','short',.2,1,'Tiny physical departure; visually almost rolling.');
export const CANDIDATES=[...NORMAL,...FIRM,...DRIVEN,...SHOTS,SOFT];
