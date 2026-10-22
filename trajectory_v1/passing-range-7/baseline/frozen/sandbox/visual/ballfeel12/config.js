import {GLOBAL,FAMILIES} from '../ballfeel11/config.js';import {CONTACT_CONTROL,CURVE_CONTROL} from './world.js';
export {GLOBAL,FAMILIES};
export const GRIP=Object.freeze({...CONTACT_CONTROL,id:'high-speed-grip',boost:3,staticBoost:3});
export const DRIVEN=[
 {id:'control',title:'CONTROL',speed:30,fraction:.65,contact:CONTACT_CONTROL,note:'Approved 1.1 launch and contact response.'},
 {id:'shorter-a',title:'SHORTER SKID A',speed:30,fraction:.65,contact:GRIP,note:'Same launch; high-speed grip isolates the contact cause.'},
 {id:'shorter-b',title:'SHORTER SKID B',speed:33,fraction:.2,contact:GRIP,note:'Early-pace compromise: sharper launch, less stored rotation, shorter skid.'},
 {id:'roll-early',title:'ROLL-EARLY',speed:30,fraction:.8,contact:GRIP,note:'Topspin-only direction: almost immediate rolling, but excessive range.'},
 {id:'aggressive',title:'AGGRESSIVE CONTROL',speed:32,fraction:.2,contact:GRIP,note:'Stronger runout reduction; less speed remains at the receiver.'},
 {id:'overcorrected',title:'OVERCORRECTED',speed:26,fraction:.4,contact:GRIP,note:'Deliberately heavy boundary. Launch/arrival pace is sacrificed.'}
];
const expressive={...CURVE_CONTROL,lowSpeed:17,highSpeed:23,cap:3,quench:12,quenchLow:13,quenchHigh:17,fadeLow:16.5,fadeHigh:20.5,tail:.15,spinCap:80};
export const CURVES=[
 {id:'control',title:'CURRENT SPECTACULAR',spin:110,law:CURVE_CONTROL,note:'Exact 1.1 control: 110 rad/s, approved Magnus response.'},
 {id:'fc-a',title:'FC-LIKE A',spin:80,law:{...expressive,id:'fc-a',gain:4.5,early:1},note:'Stronger middle bend with less spin than the control.'},
 {id:'fc-b',title:'FC-LIKE B',spin:80,law:{...expressive,id:'fc-b',gain:7,early:.2,lowSpeed:16,highSpeed:21.5,fadeLow:15.5,fadeHigh:18.5},note:'Straighter opening; curvature peaks later, around 16.6 m.'},
 {id:'extreme',title:'EXTREME GAME',spin:80,law:{...expressive,id:'extreme',gain:8,early:.2},note:'Delayed, unmistakable hook. An extreme style probe.'},
 {id:'absurd',title:'ABSURD',spin:80,law:{...expressive,id:'absurd',gain:8,early:.6},note:'Deliberately excessive sideways departure; owner rejection boundary.'}
];
export const PROPOSED={contactLaw:GRIP,curveLaw:CURVES[2].law};
