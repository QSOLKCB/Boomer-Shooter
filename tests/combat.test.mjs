import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Combat3D as Original} from '../vendor/vanillajs/modules/combat3d/index.js';
import {Combat3D} from '../src/engine/combat3d.js';
import {readArena} from '../src/sim/arena.js';
import {Match,matchEnd} from '../src/sim/match.js';
import {FLAG} from '../src/sim/command.js';

const arena=readArena(readFileSync(new URL('../content/foundry.json',import.meta.url),'utf8'));
const weapons=arena.pack.arsenal.weapons;
const actor=(id,z,team)=>({id,team,position:[0,0,z],health:100,armour:25});
const scene=(extra={})=>({actors:[actor('a',0,0),actor('b',-8,1)],weapons,solids:[],...extra});
const fire=(id,z,weapon='rivet',direction=[0,0,-1])=>({actor:id,weapon,origin:[0,1.59,z],direction,fire:true,reload:false});
const wall={id:'screen',box:{min:[-3,0,-4.4],max:[3,3,-4]},material:'stone'};

test('engine limitation and consumer armour parity: a real armour pickup absorbs damage on the same actor',()=>{
  const upstream=new Original(scene()), adapted=new Combat3D(scene());
  assert.throws(()=>upstream.pickup('b','armour',35),/pickup/);
  assert.throws(()=>adapted.pickupArmour('b',Infinity));
  const plain=new Combat3D(scene());const shot=fire('a',0,'arc');
  assert.deepEqual(upstream.step([shot]),plain.step([shot]));assert.deepEqual(upstream.snapshot(),plain.snapshot());
  for(const c of [upstream,adapted])for(let i=0;i<9;i++)c.step();
  adapted.pickupArmour('b',75);
  const base=new Original(scene());const strong={...fire('a',0),origin:[0,1,0]};
  base.step([strong]);adapted.step([strong]);
  assert(adapted.actor('b').health>base.actor('b').health&&adapted.actor('b').armour<100);
});

test('stone stops hitscan and travelling splash; unoccluded projectile travels before damaging a rival',()=>{
  for(const weapon of ['rivet','arc','slag']){
    const m=new Combat3D(scene({solids:[wall]}));let ev=m.step([fire('a',0,weapon)]);
    for(let i=0;i<30;i++)ev.push(...m.step());
    assert(ev.some(e=>e.type==='impact'&&e.part==='wall'));assert.equal(m.actor('b').health,100);
    assert(!ev.some(e=>e.type==='damage'&&e.target==='b'));
  }
  const m=new Combat3D(scene());const first=m.step([fire('a',0,'slag')]);
  assert(first.some(e=>e.type==='shot'));assert.equal(m.snapshot().projectiles.length,1);assert.equal(m.actor('b').health,100);
  const later=[];for(let i=0;i<35;i++)later.push(...m.step());
  assert(later.some(e=>e.type==='damage'&&e.target==='b'&&e.kind==='explosion'));
  const near=new Combat3D(scene({solids:[{...wall,box:{min:[-3,0,-1.4],max:[3,3,-1]}}]}));
  near.step([fire('a',0,'slag')]);for(let i=0;i<8;i++)near.step();
  assert(near.actor('a').health<100);assert.equal(near.actor('b').health,100);
});

test('simultaneous real shots produce both eliminations before the match ranks the tick',()=>{
  const m=new Combat3D(scene());const events=m.step([fire('b',-8,'rivet',[0,0,1]),fire('a',0)]);
  assert.deepEqual(events.filter(e=>e.type==='elimination').map(e=>[e.source,e.target]),[['a','b'],['b','a']]);
  assert.deepEqual(m.snapshot().actors.map(a=>[a.kills,a.deaths,a.health]),[[1,1,0],[1,1,0]]);
  assert.equal(matchEnd(m.snapshot().actors,1,1,600).winner,'a');
  m.respawn('a',[0,0,9]);assert.equal(m.actor('a').kills,1);assert.equal(m.actor('a').armour,25);
});

test('precision needs an edge, repeater sustains, timers survive switching, reload consumes reserve',()=>{
  const m=new Match(arena);m.step([0,0,0,0,FLAG.press|FLAG.held,-1]);
  for(let i=0;i<35;i++)m.step([0,0,0,0,FLAG.held,-1]);
  assert.equal(m.loadout('player').timers[0].ammo,5);
  m.step([0,0,0,0,FLAG.reload,-1]);m.step([0,0,0,0,0,1]);
  for(let i=0;i<70;i++)m.step([0,0,0,0,FLAG.held,-1]);
  const [rivet,arc]=m.loadout('player').timers;
  assert.equal(rivet.ammo,6);assert.equal(rivet.reserve,35);assert(arc.ammo<23 && arc.ammo>=15);
});

test('16 actors and 64 active rounds are hard caps; rejected rounds consume ammo, expiry releases slots',()=>{
  const actors=Array.from({length:16},(_,i)=>({...actor('unit-'+i,0,i),position:[i*3,0,0]}));
  const w={...weapons[2],speed:4,range:12,interval:.05,magazine:100,radius:0};
  const m=new Combat3D(scene({actors,weapons:[w]}));
  assert.throws(()=>m.addActor(actor('extra',0,0)),/capacity/);
  const shots=actors.map(a=>({...fire(a.id,0,'slag',[0,1,0]),origin:[a.position[0],2,0]}));
  let rejected=0;
  for(let t=0;t<25;t++) {
    const e=m.step(t%4===0?shots:[]);rejected+=e.filter(x=>x.type==='projectile-rejected').length;
    assert(m.snapshot().projectiles.length<=64);
  }
  assert(rejected>0);assert.equal(m.snapshot().projectiles.length,64);assert.equal(m.snapshot().weapons[0].timers[0].ammo,93);
  for(let i=0;i<200;i++)m.step();assert.equal(m.snapshot().projectiles.length,0);
  assert.equal(m.step(shots).filter(e=>e.type==='shot').length,16);
});

test('a cardinal quaternion one ULP outside the Combat3D interval is admitted without changing its ray',()=>{
  const m=new Match(arena), feel=m.units[0].feel;
  feel.setAim(1.5707963272948966,0);
  const direction=feel.aim().direction;
  assert(direction[0]<-1);
  const original=new Original(scene());
  assert.throws(()=>original.step([{...fire('a',0),direction,fire:false}]),/bounds/);
  m.step();assert.equal(m.tick,1);
  assert.deepEqual(feel.aim().direction,direction);
});
