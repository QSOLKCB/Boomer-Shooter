import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {FixedClock} from '../vendor/vanillajs/modules/time/index.js';
import {createCharacter,stepCharacter} from '../vendor/vanillajs/modules/character/index.js';
import {HazardField,contactTime,MAX_SPAWNS} from '../src/storm/field.js';
import {Encounter,STEP,MOTOR,WALLS,SEED,replay} from '../src/storm/encounter.js';
import {emitPattern,patternAt} from '../src/storm/patterns.js';

const body=[.35,.9,.35], head=[.125,.125,.125], feet=[0,0,0];
function shot(position,delta){return {position,delta,half:head};}

// Independently evaluate the six face-crossing instants plus both endpoints.
// At first contact all three closed intervals must overlap simultaneously.
function oracle(h,before,after,half) {
  const offset=h.position.map((v,i)=>v-before[i]-(i===1?half[i]:0));
  const speed=h.delta.map((v,i)=>v+before[i]-after[i]);
  const bounds=h.half.map((v,i)=>v+half[i]);
  const candidates=[0,1];
  for(let i=0;i<3;i++)if(speed[i])for(const sign of [-1,1])
    candidates.push((sign*bounds[i]-offset[i])/speed[i]);
  return candidates.filter(t=>t>=0 && t<=1).sort((a,b)=>a-b)
    .find(t=>offset.every((v,i)=>Math.abs(v+t*speed[i])<=bounds[i]+1e-12))??null;
}
test('relative sweep includes tangency, fast crossings and same-tick player motion',()=>{
  const edge=.475;
  assert.equal(contactTime(shot([edge,1,-5],[0,0,10]),feet,feet,body),.4525);
  assert.equal(contactTime(shot([edge+1e-6,1,-5],[0,0,10]),feet,feet,body),null);
  assert.equal(contactTime(shot([0,1,0],[0,0,.01]),[-3,0,-3],[3,0,3],body)!==null,true);
  let seed=933;
  const n=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296-.5)*12;
  let contacts=0;
  for(let i=0;i<4096;i++){
    const vec=()=>[n(),n(),n()], h=shot(vec(),vec()),a=vec(),b=vec();h.half=[.7,.3,1.2];
    const expected=oracle(h,a,b,body),actual=contactTime(h,a,b,body);
    if(expected===null)assert.equal(actual,null);
    else {contacts++;assert(actual!==null && Math.abs(actual-expected)<1e-12);}
  }
  assert(contacts>20);
});
test('emission budget, capacity, geometry and final life tick are enforced',()=>{
  const f=new HazardField(2), emit=(x,delta)=>f.emit(0,[x,1,0],[delta,0,0],head,1);
  assert.throws(()=>emit(-2,0));assert.throws(()=>f.emit(0,feet,[1,0,0],[0,.1,.1],1));
  assert.equal(f.nextId,1);
  assert(emit(-5,8));assert(emit(-2,8));assert.equal(emit(-1,8),false);
  assert.equal(f.advance(feet,feet,body).id,2);assert.equal(f.live.length,0);
  assert(emit(-2,8));assert(emit(-2,8));assert.equal(f.advance(feet,feet,body).id,3);
  const full=new HazardField(512);
  for(let i=0;i<55;i++)full.emit(0,[20,1,0],[0,0,1],head,1);
  assert.equal(full.live.length,MAX_SPAWNS);assert.equal(full.rejected,7);
  full.advance(feet,feet,body);assert.equal(full.live.length,0);
  assert.throws(()=>new HazardField(513));
});
const patternHashes=[
  'c90ba273dbabd101c4f0f15bc1cf11686a107d08fdfcf49fbf0eccf34ed3e2f1',
  '6564fd580932ef141dbef392421f3198662f3fd8c959d823d6b090e4a18998ce',
  '5d9a04900fb3afdcf56c5e5f408e3ff1a829399c397f27678aca12e6e5dc32fb',
  '2a8907eefd20101963d5dac3d1622b22aa312ce988ce739b88412b276fb66dac',
  '0f4ae336246422a694ed98f9a2ce7437c62367d1c545c87f1965d2d6842390da'
];
test('five emitted shape/trajectory signatures include warning and expiry ticks',()=>{
  for(let k=0;k<5;k++){
    const plan=patternAt(k,2,SEED,[0,0,10]), f=new HazardField(),digest=createHash('sha256');
    for(let t=0;t<plan.duration;t++){
      const first=f.nextId;emitPattern(f,plan,t);
      for(const h of f.live)if(h.id>=first)digest.update(JSON.stringify([t,h]));
      if(t<36)assert.equal(f.live.length,0);
      f.advance([400,0,0],[400,0,0],body);
    }
    assert.equal(f.rejected,0);assert.equal(digest.digest('hex'),patternHashes[k]);
  }
});
function dodge(kind,respond) {
  const b=createCharacter({position:[-8,0,7]}), f=new HazardField();
  const plan=patternAt(kind,2,0,b.position);
  const end=[34,28,88,52,0][kind],side=[-1,-1,1,1,0][kind];
  let contacts=0;
  for(let t=0;t<270;t++){
    const before=b.position.slice();
    stepCharacter(b,{move:[respond&&t>=14&&t<end?side:0,0],jump:respond&&kind===4&&t===84},STEP,MOTOR,WALLS);
    if(t<plan.duration)emitPattern(f,plan,t);
    if(f.advance(before,b.position,b.halfExtents))contacts++;
  }
  assert.equal(f.live.length,0);
  return contacts;
}
test('each pattern hits an idle body and admits a delayed real-controller dodge',()=>{
  for(let k=0;k<5;k++){assert(dodge(k,false)>0);assert.equal(dodge(k,true),0);}
});
test('one event per HP change, exact invulnerability and terminal isolation',()=>{
  const g=new Encounter();
  for(let t=1;t<=37;t++){
    g.field.emit(1,[0,1,10],[1,0,0],head,1);g.step();
    assert.equal(g.hp,t<37?80:60);
    assert.equal(g.events.filter(e=>e.type==='damage').length,t===1||t===37?1:0);
  }
  const before=g.receipt();assert.throws(()=>g.step([0,0,0,NaN,0,-1]));assert.deepEqual(g.receipt(),before);
  while(!g.result)g.step();
  assert.equal(g.result,'defeat');const end=g.receipt();g.step();assert.deepEqual(g.receipt(),end);
});
test('live 30/60/120 Hz schedules, independently re-executed receipts and phase ticks',()=>{
  let reference;
  for(const hz of [30,60,120]){
    const g=new Encounter(),clock=new FixedClock({step:STEP,maxSteps:5}),phases=[];
    while(!g.result)clock.advance(1/hz,()=>{
      const p=g.phase,old=g.boss;g.step([0,0,0,0,2,-1]);
      if(g.phase!==p)phases.push([g.tick,g.phase]);
      if(old!==g.boss)assert(g.events.some(e=>e.type==='shot'&&e.hit));
    });
    assert.deepEqual(phases,[[191,2],[433,3]]);
    assert.equal(g.result,'victory');const tape=g.receipt();
    assert.deepEqual(replay(tape),tape);
    if(reference)assert.deepEqual(tape,reference);
    reference=tape;
    assert.throws(()=>replay({...tape,seed:44}));assert.throws(()=>replay({...tape,ticks:tape.ticks+1}));
  }
});
