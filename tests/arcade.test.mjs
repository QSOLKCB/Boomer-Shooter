import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Match} from '../src/sim/match.js';
import {readArena,sight,spawnPoint} from '../src/sim/arena.js';
import {FLAG} from '../src/sim/command.js';
import {receipt,verify} from '../src/sim/replay.js';
import {bearing} from '../src/view/feedback.js';

const text=readFileSync(new URL('../content/foundry.json',import.meta.url),'utf8');
const arena=readArena(text);
const command=(flags=0,x=0)=>[x,0,0,0,flags,-1];

test('same strafe, reversal and jump inputs give measurable Arcade and Classic handling',()=>{
  function run(movement) {
    const m=new Match(arena,{movement}), body=m.units[0].body;
    let distance=0, reversal=0, apex=0;
    for(let t=0;t<100;t++) {
      m.step(command(t===0?FLAG.press:t===34?FLAG.jump:0,t<16?1:t<33?-1:0));
      if(t===9) distance=body.position[0];
      if(t>=16 && !reversal && body.velocity[0]<0) reversal=t-15;
      apex=Math.max(apex,body.position[1]);
    }
    assert(m.actor('player').health>0);
    return {distance,reversal,apex};
  }
  const a=run('classic'), b=run('arcade');
  assert(b.distance>a.distance+.2);
  assert(b.reversal>0 && b.reversal<a.reversal);
  assert(b.apex>a.apex+.1 && b.apex<1.6);
});

test('an early jump chains once on landing; cancellation and Classic discard the early edge',()=>{
  function jumps(movement,cancel) {
    const m=new Match(arena,{movement}), body=m.units[0].body;
    let takeoffs=0, queued=false, cancelNext=false;
    for(let t=0;t<108;t++) {
      const vy=body.velocity[1];
      let flags=t===0?FLAG.press|FLAG.jump:0;
      if(cancelNext) { flags=FLAG.cancel; cancelNext=false; }
      else if(!queued && vy<0 && body.position[1]>.09 && body.position[1]<.43) {
        queued=true; flags=FLAG.jump; cancelNext=cancel;
      }
      m.step(command(flags));
      if(vy<=0 && body.velocity[1]>0) takeoffs++;
    }
    assert(queued);return takeoffs;
  }
  assert.equal(jumps('arcade',false),2);
  assert.equal(jumps('arcade',true),1);
  assert.equal(jumps('classic',false),1);
});

test('bot skill changes the first visible reaction and aim error with equal actors, weapons and damage rules',()=>{
  const shots=[], errors=[];
  for(const difficulty of ['easy','normal','hard']) {
    const m=new Match(arena,{difficulty}), u=m.units[1];
    assert.equal(m.actor('player').health,m.actor('kiln').health);
    assert.deepEqual(m.loadout('player').timers,m.loadout('kiln').timers);
    m.step(); const target=m.actor(u.brain.target);
    assert(sight(arena,[...arena.starts[1]].map((v,i)=>v+(i===1?1.62:0)),target.position.map((v,i)=>v+(i===1?1.12:0))));
    errors.push(Math.abs(u.brain.error[1]));
    let shot;
    while(m.tick<=60 && !shot) {
      m.step();shot=m.events.find(e=>e.type==='shot' && e.source===u.id);
    }
    assert(shot);shots.push(shot.tick);
    assert.equal(shot.tick,arena.pack.settings.difficulty[difficulty].reaction);
  }
  assert.deepEqual(shots,[42,23,10]);assert(errors[0]>errors[1] && errors[1]>errors[2]);
});

test('a covered respawn beats a longer exposed lane and occupied starts are never selected',()=>{
  const rivals=[{position:[-9,0,1]},{position:[10,0,8]}];
  const visible=p=>rivals.filter(r=>sight(arena,[p[0],1.3,p[2]],[r.position[0],1.4,r.position[2]])).length;
  const classic=spawnPoint(arena,rivals,1), arcade=spawnPoint(arena,rivals);
  assert.equal(visible(classic),1);assert.equal(visible(arcade),0);
  assert.notDeepEqual(spawnPoint(arena,[...rivals,{position:arcade}]),arcade);
  assert.equal(spawnPoint(arena,arena.starts.map(position=>({position}))),null);
});

test('fresh reserves leave pads live; a real reload grants one shared refill on overlapping pads',()=>{
  const data=JSON.parse(text);
  const pads=data.pack.entries.find(e=>e.id==='spawns').data.pickups;
  for(const pad of pads.filter(p=>p.id.startsWith('rounds-'))) pad.position=[0,0,14];
  const m=new Match(readArena(JSON.stringify(data))), claims=[];
  m.step(command(FLAG.press));
  assert(!m.events.some(e=>e.kind==='ammo' && e.actor==='player'));
  m.step(command(FLAG.reload));
  for(let t=0;t<100;t++) {
    m.step();claims.push(...m.events.filter(e=>e.type==='pickup'&&e.kind==='ammo'&&e.actor==='player'));
  }
  assert.equal(claims.length,1);assert.equal(claims[0].amount,3);
  const used=m.pickups.find(p=>p.id===claims[0].pad);
  assert.equal(used.ready,claims[0].tick+360);
  assert.equal(m.loadout('player').timers[0].reserve,m.weapons[0].reserve);
  assert(m.pickups.some(p=>p.id.startsWith('rounds-') && p.id!==used.id && p.ready===0));
});

test('format 2 binds tuning even at tick zero; the archived format 1 reference still verifies',async()=>{
  const m=new Match(arena,{difficulty:'hard',movement:'classic'}), r=await receipt(m,text);
  assert.equal(r.format,'foundry-pit.replay.2');
  assert.deepEqual(await verify(JSON.stringify(r),text),r);
  await assert.rejects(()=>verify(JSON.stringify({...r,difficulty:'easy'}),text),/differ/);
  await assert.rejects(()=>verify(JSON.stringify({...r,movement:['classic']}),text),/tuning/);
  const old=readFileSync(new URL('../evidence/bs-001/node-reference-replay.json',import.meta.url),'utf8');
  assert.deepEqual(await verify(old,text),JSON.parse(old));
});

test('damage and stereo bearings agree with the right-handed camera',()=>{
  const p=[1,0,1];
  assert.equal(bearing(p,[1,2,-1]),0);
  assert.equal(bearing(p,[4,2,1]),Math.PI/2);
  assert.equal(bearing(p,[-2,2,1])+Math.PI/2,0);
  assert.equal(bearing(p,[1,2,1]),null);
});

test('focus narrows the lens and spread without steering the canonical shot; legacy commands reject the new bit',()=>{
  const m=new Match(arena), player=m.units[0], base=player.feel.aim(), hip=player.feel.presentation();
  for(let t=0;t<12;t++) m.step(command(FLAG.focus));
  const focused=player.feel.presentation();
  assert(focused.ads && focused.fov<hip.fov && focused.sensitivity<hip.sensitivity);
  assert(focused.spread<=hip.spread);
  assert.deepEqual(player.feel.aim(),base);
  m.step(command(FLAG.focus|FLAG.press));
  assert(m.events.some(e=>e.type==='shot' && e.source==='player'));
  m.step(command(FLAG.cancel));
  assert(player.feel.presentation().ads<focused.ads);
  for(let t=0;t<12;t++) m.step();
  assert.equal(player.feel.presentation().ads,0);
  const old=new Match(arena,{rulesVersion:1});
  assert.throws(()=>old.step(command(FLAG.focus)),/bounds/);
  assert.equal(old.tick,0);
});

test('a health pad stays live at full health and starts its nine-second cooldown on real combat damage',()=>{
  const data=JSON.parse(text), pads=data.pack.entries.find(e=>e.id==='spawns').data.pickups;
  pads.find(p=>p.id==='trauma-east').position=[0,0,14];
  const m=new Match(readArena(JSON.stringify(data))), pad=m.pickups.find(p=>p.id==='trauma-east');
  m.step();assert.equal(pad.ready,0);
  let claim;
  while(!claim && m.tick<600) {
    m.step();claim=m.events.find(e=>e.type==='pickup'&&e.pad===pad.id&&e.actor==='player');
  }
  assert(claim && claim.amount>0 && claim.amount<=pad.amount);
  assert(m.events.some(e=>e.type==='damage' && e.target==='player'));
  assert.equal(pad.ready,m.tick+540);
});
