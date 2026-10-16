/** SI units. Fixed simulation tick. Render time is never an authority input. */
export type V3 = [number, number, number];
export type Q4 = [number, number, number, number];
export interface ResolvedFootballAction {
  id: string; tick: number; preparedAt?: number;
  /** Expected BALL CENTRE at contact. An eligibility check, never a teleport. */
  position: V3; maxContactError?: number;
  velocity: V3; spin: V3; colliderId?: string;
  metadata?: { family?: string; technique?: string; selectedFoot?: 'L'|'R';
    preferredFoot?: 'L'|'R'; seed?: number; executionQuality?: number;
    pressure?: number; fatigue?: number; charge?: number; [key:string]:unknown };
}
export interface Turn1Frame {
  /** Stable player:body id. The caller owns body motion and support decisions. */
  id:string; time:number; position:V3; rotation:Q4;
  linearVelocity:V3; angularVelocity:V3; shapes:unknown[];
  material:'boot'|'body'; supportState?:'support'|'swing'|'flight';
  locomotionState?:string; deliberateWindow?:{actionId:string;contactTick:number};
}
export interface BallContact {
  kind:'PHYSICAL_CONTACT'; time:number; tick:number; collider:string;
  point:V3; normal:V3; impulse:V3; oppositeImpulse:V3;
  velocity:V3; spin:V3;
}
/** Physical touch (A): supply only trajectories.
 * Resolved touch (B): schedule a resolved action; local no-double-contact guard.
 * Hybrid (C): future bounded assistance must be applied at a single verified
 * contact, explicitly logged. No continuous target force exists in this API.
 * All three remain experiments. BALL-PHYS-1 does not schedule dribble touches.
 */
