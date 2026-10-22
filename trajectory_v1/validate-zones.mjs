import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {classifyZone,ellipseApex,lockedFinishingRadius,ELLIPSE_ROUNDOFF} from './zones.mjs';
import {createField,dispersion} from './model.mjs';
const D=JSON.parse(readFileSync('data.js','utf8').replace(/^window\.ACCURACY_VISUAL\s*=\s*/,'').replace(/;\s*$/,''));
const g=D.geometry,boxHalf=g.penaltyWidth/2,toWorld=(d,l)=>({x:g.goalX-d,z:g.goalCentreZ+l});
let checks=0;
function eq(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
function zone(d,l,a=lockedFinishingRadius(g),f=90,ls=60){return classifyZone(g,toWorld(d,l),a,f,ls);}
const examples=[{name:'Central',...zone(10,0)},{name:'Wide box',...zone(8,boxHalf-2)},{name:'Top of D',...zone(g.penaltySpotDistance+g.arcRadius,0)}];
eq(examples.map(r=>[r.zone,r.effectiveAccuracy]),[[1,90],[3,75],[2,60]],'Three requested examples');
eq(zone(8,18,12,91,60).effectiveAccuracy,75.5,'Mixed values retain half points');
eq(zone(22,0,12,1,99).effectiveAccuracy,99,'Outside box has zero Finishing contribution');
eq(zone(10,0,12,99,1).effectiveAccuracy,99,'Finishing zone has zero Long Shots contribution');
const widths=[.5,4,8,12,16,boxHalf];
for(const a of widths){
 eq(ellipseApex(g),{x:88.5,z:34},'Apex is exact at every width');
 eq(zone(g.penaltyDepth,0,a).zone,1,'Apex on box and ellipse is Finishing');
 eq(zone(g.penaltyDepth+1e-6,0,a).zone,2,'Immediately beyond front line is Long Shots');
 eq(zone(0,0,a).zone,1,'Goal line centre is inside');
 eq(zone(-1e-6,0,a).zone,2,'Behind goal is outside');
 for(const sign of [-1,1]){
  eq(zone(0,sign*a,a).zone,1,'Ellipse endpoints are inside');
  eq(zone(8,sign*(boxHalf-2),a).zone,3,'Wide preset always mixed');
  eq(zone(8,sign*boxHalf,a).zone,3,'Box side line is inside mixed region');
  eq(zone(8,sign*(boxHalf+1e-6),a).zone,2,'Beyond box side line is outside');
  eq(zone(g.penaltyDepth,sign*boxHalf,a).zone,3,'Front corners are inside mixed region');
 }
 for(let j=1;j<20;j++){
  const t=j*Math.PI/40,l=a*Math.cos(t),d=g.penaltyDepth*Math.sin(t);
  for(const sign of [-1,1]){
   eq(zone(d,sign*l,a).zone,1,'Mathematical curve is inclusive');
   eq(zone(d,sign*l*(1-1e-6),a).zone,1,'Immediately within ellipse is Finishing');
   eq(zone(d,sign*l*(1+1e-6),a).zone,3,'Immediately beyond ellipse is mixed');
  }
 }
 for(let d=0;d<=26;d+=2)for(let l=0;l<=24;l+=2){
  const r=zone(d,l,a);
  eq(r.zone,zone(d,-l,a).zone,'Symmetric about goal centreline');
  eq(r,zone(d,l,a),'Deterministic repeated classification');
  eq(r.finishingWeight+r.longShotsWeight,1,'Weights always total one');
 }
}
const hash=s=>createHash('sha256').update(s).digest('hex'),preserved={};
for(const file of ['model.mjs','data.js']){
 const before=hash(readFileSync('baseline-v2/'+file)),after=hash(readFileSync(file));
 eq(after,before,file+' is byte-identical to approved baseline');preserved[file]={before,after,unchanged:true};
}
for(const accuracy of [1,40,60,70,75,75.5,80,90,95,99]){
 const v=dispersion(accuracy,D.ideal.relativeSpeed),x=99-accuracy;
 eq(v.sigmaBaseH,.02+4*x*x/(x*x+45*45),'Locked curve coefficients');
 eq(v.sigmaBaseV,.6*v.sigmaBaseH,'Locked elevation ratio');
 eq(v.difficulty,1+.1*D.ideal.relativeSpeed**4,'Locked power difficulty');
 const field=createField(D,accuracy);assert(Number.isFinite(field.peak)&&field.peak>0);checks++;
}
const repo='../../work/touchline-ball-phys1',source=JSON.parse(readFileSync('preservation.json','utf8'));
for(const [file,expected] of Object.entries(source.hashes))eq(hash(readFileSync(repo+'/'+file)),expected,'Protected gameplay: '+file);
const gitStatus=execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'});eq(gitStatus,'','Gameplay repository clean');
const report={version:'SHOT-ACCURACY-1.0 · three-zone geometry calibration',scope:'Local visualizer only; no authoritative integration',lockedRadius:lockedFinishingRadius(g),lockedFullWidth:2*lockedFinishingRadius(g),widthApproved:true,radiusControl:{enabled:false},approval:'Owner selected maximum width on 2026-10-18',geometry:g,coordinates:{forward:'105 - world x',lateral:'world z - 34'},equation:'(lateral / radius)^2 + (forward / 16.5)^2 <= 1; forward half only; box classification has priority',apex:ellipseApex(g),boundaries:{box:'Inclusive world-coordinate comparisons',ellipse:'Inclusive, with dimensionless roundoff guard',ellipseRoundoff:ELLIPSE_ROUNDOFF},classification:['Outside box: Long Shots','Inside box + ellipse: Finishing','Remaining inside box: 0.50 Finishing + 0.50 Long Shots'],examples,projection:'Selected effective accuracy feeds the unchanged fixed top-of-D reference projection. The map probe does not change shot origin, speed, hold, target or physics.',checks,validation:'PASS',lockedModelAndProjection:preserved,protectedGameplayFiles:Object.keys(source.hashes).length,gameplayUnchanged:true,gitStatus};
writeFileSync('zone-calibration.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks,result:'PASS',examples:examples.map(({name,zone,effectiveAccuracy})=>({name,zone,effectiveAccuracy})),protectedGameplayFiles:report.protectedGameplayFiles,modelAndProjectionUnchanged:true},null,2));
