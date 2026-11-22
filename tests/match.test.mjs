import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FixedClock} from '../vendor/vanillajs/modules/time/index.js';
import {createCharacter,stepCharacter} from '../vendor/vanillajs/modules/character/index.js';
import {findPath} from '../vendor/vanillajs/modules/navigation/index.js';
import {readArena,spawnPoint,sight} from '../src/sim/arena.js';
import {Match,MatchSlot,matchEnd,STEP} from '../src/sim/match.js';
import {receipt,verify} from '../src/sim/replay.js';
import {ANGLE,FLAG,NEUTRAL} from '../src/sim/command.js';

const text=readFileSync(new URL('../content/foundry.json',import.meta.url),'utf8'), arena=readArena(text);
const game=options=>new Match(arena,options);
const input=(flags=0,slot=-1)=>[0,0,0,0,flags,slot];
function variant(edit) {
  const data=JSON.parse(text), parts=Object.fromEntries(data.pack.entries.map(e=>[e.id,e.data]));
  edit(parts,data); return JSON.stringify(data);
}

for (const jumping of [false,true]) {
  const direction=jumping?'upper':'lower';
  test(`pursuing the nearest rival reaches the ${direction} bot pitch bound and finishes the match`,()=>{
    const m=game({rulesVersion:1}), bound=(jumping?1:-1)*(Math.PI/2-.01);
    let reached=false;
    while (!m.result) {
      const [x,,z]=m.actor('player').position;
      const distance=a=>Math.hypot(a.position[0]-x,a.position[2]-z);
      const rivals=m.state.actors.filter(a=>a.id!=='player' && a.health>0);
      const target=rivals.sort((a,b)=>distance(a)-distance(b))[0];
      let turn=0;
      if (target) {
        const yaw=Math.atan2(x-target.position[0],z-target.position[2]);
        const delta=yaw-m.units[0].body.yaw;
        const shortest=Math.atan2(Math.sin(delta),Math.cos(delta));
        turn=Math.max(-31415,Math.min(31415,Math.round(shortest*ANGLE)));
      }
      const flags=jumping && m.tick%42===0 ? FLAG.jump : 0;
      m.step([0,-1,turn,0,flags,-1]);
      if (m.units.some(u=>u.profile && u.body.pitch===bound)) reached=true;
    }
    assert(reached,`No bot reached the ${direction} bound`);
    assert.equal(m.result.reason,'frag limit');
  });
}

test('human fires a real rivet frag, bots eliminate one another and the operator; default match ends with consistent accounts',()=>{
  const m=game(), deaths=[], pickups=new Set(), respawns=[];
  while(!m.result) {
    m.step(m.tick===0?input(FLAG.press):NEUTRAL);
    for(const e of m.events) {
      if(e.type==='death') deaths.push(e);
      if(e.type==='pickup')pickups.add(e.kind);
      if(e.type==='respawn')respawns.push(e.actor);
    }
  }
  assert(deaths.some(e=>e.source==='player'&&e.target!=='player'));
  assert(deaths.some(e=>e.source!=='player'&&e.target==='player'));
  assert(deaths.some(e=>e.source!=='player'&&e.target!=='player'&&e.target!==e.source));
  assert(respawns.includes('player'));assert(m.work.sight>0&&m.work.paths>0&&m.work.expanded>0&&m.work.coverMoves>0);
  assert.equal(m.state.actors.length,4);assert.equal(m.limit,10);assert.equal(m.duration,18000);
  assert.equal(m.result.reason,'frag limit');assert(m.tick<m.duration);
  assert.deepEqual([...pickups].sort(),['ammo','armour','health']);
  for(const a of m.state.actors){
    assert.equal(a.kills,deaths.filter(e=>e.source===a.id&&e.target!==a.id).length);
    assert.equal(a.deaths,deaths.filter(e=>e.target===a.id).length);
  }
  const end=m.tick;assert.equal(m.step(),false);assert.equal(m.tick,end);
});

test('isolated playback at 30, 60 and 120 Hz reproduces accepted commands, event and state digests',async()=>{
  const command=t=>t===0?input(FLAG.press):t<38?[1,-1,21,0,t===8?FLAG.jump:0,-1]:t===42?input(0,1):
    t<77?input(FLAG.held):t===82?input(FLAG.reload):NEUTRAL;
  let expected;
  for(const hz of [30,60,120]) {
    const m=game({limit:50,duration:600}), c=new FixedClock({step:STEP,maxSteps:5});
    for(let f=0;f<hz*10;f++)c.advance(1/hz,()=>m.step(command(m.tick)));
    assert.equal(m.tick,600);assert.equal(m.result.reason,'time limit');
    const tape=await receipt(m,text);expected??=tape;assert.deepEqual(tape,expected);
  }
  assert.deepEqual(await verify(JSON.stringify(expected),text),expected);
  const missing=structuredClone(expected);delete missing.seed;
  await assert.rejects(()=>verify(JSON.stringify(missing),text),/field/);
  const corrupt=structuredClone(expected);corrupt.runs[0][1][4]=0;
  await assert.rejects(()=>verify(JSON.stringify(corrupt),text),/differ/);
  await assert.rejects(()=>verify(JSON.stringify({...expected,ticks:599}),text),/commands/);
});

test('content and command rejection preserves the active match byte for byte',()=>{
  const slot=new MatchSlot(text), m=slot.current;m.step(input(FLAG.press));
  const before=JSON.stringify(m.canonical());
  const bad=[text.repeat(20),'{"__proto__":{}}',variant(parts=>parts.arsenal.weapons[0].damage=201),
    variant(parts=>parts.spawns.bots=Array(9).fill([0,0,0])),variant(parts=>parts.geometry.blocks[0].x=9999),
    variant((p,d)=>d.armourPads=['missing']),variant(p=>p.geometry.blocks[0].material='https://example.invalid'),
    variant(parts=>parts.settings.title='https://arena.invalid'),variant(parts=>parts.spawns.player=[-4,0,-4])];
  for(const source of bad){assert.throws(()=>slot.replace(source));assert.equal(slot.current,m);}
  let evaluated=false;
  const accessor={get pack(){evaluated=true;throw Error();}};assert.throws(()=>slot.replace(accessor));assert.equal(evaluated,false);
  for(const cmd of [[1,0,NaN,0,0,0],[0,0,0,0,128,0],[0,0,0,0,0,3],Array(6)])assert.throws(()=>m.step(cmd));
  assert.equal(JSON.stringify(m.canonical()),before);assert.equal(slot.replace(text).tick,0);
});

test('real movement hits the wall, clears a staircase and jumps without tunnelling',()=>{
  const m=game(), body=createCharacter({position:[-15,0,2]}); let peak=0;
  for(let i=0;i<80;i++){
    stepCharacter(body,{move:[0,-1]},STEP,m.motor,arena.boxes);
    peak=Math.max(peak,body.position[1]);assert(body.position[2]>=-17.651);
  }
  assert(peak>=1.49);const p=body.position[1];
  for(let i=0;i<22;i++)stepCharacter(body,{move:[0,0],jump:i===0},STEP,m.motor,arena.boxes);
  assert(body.position[1]>p+.8);
  const wall=createCharacter({position:[16,0,0]});
  for(let i=0;i<90;i++)stepCharacter(wall,{move:[1,0],sprint:true},STEP,m.motor,arena.boxes);
  assert(Math.abs(wall.position[0]-17.65)<.002);
  for(const p of arena.starts) {
    const from=arena.grid.worldToCell([0,14]),to=arena.grid.worldToCell([p[0],p[2]]);
    assert.equal(findPath(arena.grid,from,to).status,'found');
  }
});

test('respawns avoid occupied volumes and choose the best admitted cover/distance score deterministically',()=>{
  assert.equal(spawnPoint(arena,arena.starts.map(position=>({position}))),null);
  const enemies=[{position:[0,0,13.7]},{position:[11,0,8]}];
  const p=spawnPoint(arena,enemies);
  assert(arena.starts.includes(p));assert.notDeepEqual(p,arena.starts[0]);assert.deepEqual(spawnPoint(arena,enemies),p);
  const score=q=>Math.min(...enemies.map(a=>Math.hypot(...q.map((v,i)=>v-a.position[i]))))-7*enemies.filter(
    a=>sight(arena,[q[0],q[1]+1.3,q[2]],[a.position[0],a.position[1]+1.4,a.position[2]])).length;
  assert.equal(score(p),Math.max(...arena.starts.filter(q=>!enemies.some(a=>Math.hypot(...q.map((v,i)=>v-a.position[i]))<.71)).map(score)));
});

test('timed pads award a single eligible claimant, cap armour and preserve frags after recasting',()=>{
  const source=variant(p=>{p.spawns.pickups.find(x=>x.id==='plate-press').position=[0,0,14];});
  const m=new Match(readArena(source)), pad=m.pickups.find(p=>p.kind==='armour');
  m.step(input(FLAG.press));assert.equal(m.actor('player').armour,60);assert.equal(m.actor('player').kills,1);
  assert.equal(m.events.filter(e=>e.type==='pickup'&&e.pad===pad.id).length,1);
  const until=pad.ready;m.step();assert.equal(pad.ready,until);assert.equal(m.actor('player').armour,60);
  assert.equal(m.combat.pickupArmour('player',100),40);assert.equal(m.combat.pickupArmour('player',100),0);
  assert.equal(m.combat.pickupArmour('kiln',30),0);
  while(!m.events.some(e=>e.type==='respawn'&&e.actor==='kiln'))m.step();
  assert.equal(m.actor('kiln').deaths,1);assert.equal(m.loadout('kiln').timers[0].ammo,6);
});

test('ties use fewer deaths then code-unit actor ID; a simultaneous limit wins over the time limit',()=>{
  const a={id:'vise',kills:4,deaths:2},b={id:'flux',kills:4,deaths:2};
  assert.equal(matchEnd([a,b],599,10,600),null);
  assert.deepEqual(matchEnd([a,b],600,10,600),{winner:'flux',reason:'time limit'});
  assert.deepEqual(matchEnd([a,{...b,deaths:5}],600,4,600),{winner:'vise',reason:'frag limit'});
});

test('bounded clock drops long gaps and resets debt across pause and resume',()=>{
  const c=new FixedClock({step:STEP,maxFrame:.2,maxSteps:5});let n=0;
  const r=c.advance(2,()=>n++);assert.equal(n,5);assert(r.dropped>1.8);
  c.setPaused(true);c.advance(60,()=>n++);c.setPaused(false);assert.equal(c.accumulator,0);
  c.advance(STEP,()=>n++);assert.equal(n,6);
});

test('simultaneous nearby pad claim goes to the first eligible living actor in engine ID order',()=>{
  const source=variant(p=>{
    p.spawns.bots[0]=[1.5,0,14];
    p.spawns.pickups.find(x=>x.id==='plate-press').position=[.75,0,14];
  });
  const m=new Match(readArena(source));m.step();
  assert.deepEqual(m.events.filter(e=>e.type==='pickup'&&e.kind==='armour').map(e=>e.actor),['kiln']);
  assert.equal(m.actor('player').armour,25);assert.equal(m.actor('kiln').armour,60);
});

test('a full bot leaves the plate available for a player who can use ten points',()=>{
  const source=variant(p=>{
    p.spawns.bots[0]=[0,0,12.5];
    p.spawns.pickups.find(pad=>pad.id==='plate-press').position=[0,0,12.5];
    p.bots.types[0].armour=100;
    p.settings.rules.playerArmour=90;
  });
  const m=new Match(readArena(source)), pad=m.pickups.find(p=>p.id==='plate-press');
  m.step();
  assert.equal(m.actor('kiln').armour,100);
  assert.equal(pad.ready,0);
  assert(!m.events.some(e=>e.type==='pickup' && e.pad===pad.id));
  for (let i=0; i<16 && pad.ready===0; i++) m.step([0,-1,0,0,0,-1]);
  const claims=m.events.filter(e=>e.type==='pickup' && e.pad===pad.id);
  assert.deepEqual(claims.map(e=>[e.actor,e.amount]),[['player',10]]);
  assert.equal(m.actor('player').armour,100);
  assert.equal(pad.ready,m.tick+720);
});
