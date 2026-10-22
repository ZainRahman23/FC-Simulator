import {SETUP,OVERCHARGE,CHARGE} from './config.js';
// Observer only. Never an input to launch, aiming or world integration.
export function physicalOutcome(run){
 if(!run.registered)return 'NO SHOT';
 const p=run.metrics.goalPlane;
 if(!p)return run.metrics.firstLanding?'TURF-FIRST / SHORT':'SHORT';
 if(Math.abs(p.z-SETUP.origin[2])>SETUP.goalWidth/2-.11)return 'WIDE';
 if(p.height-.11>SETUP.goalHeight)return 'OVER';
 if(p.height+.11>SETUP.goalHeight)return 'BAR HEIGHT';
 return p.beforeFirstLanding?'GOAL':'TURF-FIRST / GOAL';
}
export function chargeState(holdMs){return holdMs>OVERCHARGE.startMs?'OVERCHARGED':holdMs<=CHARGE.tapFloorEndMs?'TAP':holdMs<130?'LOW':holdMs<250?'NORMAL':'HARD';}
