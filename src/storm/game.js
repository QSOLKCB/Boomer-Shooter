import {FixedClock} from '../../vendor/vanillajs/modules/time/index.js';
import {controls} from '../input/controls.js';
import {Sound} from '../view/audio.js';
import {Encounter,STEP} from './encounter.js';
import {CHARGE,PATTERNS} from './patterns.js';
import {StormScene} from './scene.js';

const el=id=>document.getElementById(id);
const score={
  driver:[['square',164,0,.045,4600],['noise',220,0,.06,5600]],
  armour:[['saw',77,0,.16,6600]], spark:[['triangle',940,0,.05,6400]],
  pulse:[['triangle',55,0,.18,6300]], fifth:[['triangle',82.4,0,.16,6000]],
  bell:[['triangle',330,0,.15,4700],['triangle',495,.06,.16,2300]]
};
export function startStorm() {
  const canvas=el('arena'), sound=new Sound(score), clock=new FixedClock({step:STEP,maxFrame:.20,maxSteps:5});
  const lifetime=new AbortController(),on=(target,key,fn)=>target.addEventListener(key,fn,{signal:lifetime.signal});
  let scene=new StormScene(canvas),game=new Encounter(),mode='menu',raf=0,last=null,held=false,disposed=false;
  let playback=null,runIndex=0,runTicks=0,hitUntil=0,hurtUntil=0,lastReplay=null,verified=false;
  const input=controls(canvas,()=>mode==='playing'&&!playback,()=>!playback&&(mode==='arming'||mode==='playing'),
    captured,()=>pause('Mouse released.'),()=>{el('gate-note').textContent='Mouse capture unavailable. Retry here or choose drag / keyboard aiming.';});
  function setMode(value) {
    mode=value;document.body.dataset.mode=mode;
    el('panel').hidden=mode==='playing'||mode==='arming';
    el('gate').hidden=mode!=='arming';el('hud').hidden=mode!=='playing';el('injury').hidden=true;
    el('new').hidden=mode!=='paused';el('save').hidden=!['over','paused'].includes(mode);
    el('watch').hidden=mode!=='over'||!lastReplay;el('options').hidden=mode==='error';
    el('action').disabled=mode==='error';
  }
  function freeze() {
    clock.setPaused(true);cancelAnimationFrame(raf);raf=0;last=null;held=false;
    input.clear();sound.stop();
  }
  function pause(reason='Encounter paused.') {
    if(mode!=='playing' && mode!=='arming')return;
    setMode('paused');freeze();el('title').textContent='Paused';el('intro').textContent=reason;
    el('action').textContent='Resume';el('action').focus();
  }
  function hud() {
    el('phase').textContent=(playback?'REPLAY · ':'')+'PHASE 0'+game.phase+' / 03';
    el('core').value=game.boss;el('hp').textContent=game.hp;
    const gun=game.weapon.snapshot();
    el('ammo').textContent=gun.ammo;el('reserve').textContent=gun.reloadRemaining?'RELOADING':' / '+gun.reserve;
    el('pattern').textContent=PATTERNS[game.plan.kind];
    el('charge').textContent=game.age<=CHARGE?'CHARGING':game.plan.kind===4?'JUMP THE LOW WALL':'VOLLEY ACTIVE';
    el('injury').hidden=game.tick>=hurtUntil;el('hit').hidden=game.tick>=hitUntil;
  }
  function finished() {
    const tape=game.receipt();verified=!!playback && tape.digest===playback.digest && tape.ticks===playback.ticks;
    const wasReplay=!!playback;
    if(!wasReplay)lastReplay=tape;
    playback=null;setMode('over');freeze();
    const title={victory:'Core offline',defeat:'Operator down',timeout:'Reactor breach'};
    el('title').textContent=title[game.result];el('intro').textContent=(wasReplay?(verified?'Replay verified. ':'Replay mismatch. '):'')+
      'Core '+game.boss+' HP · Operator '+game.hp+' HP · '+(game.tick/60).toFixed(1)+' seconds.';
    el('action').textContent='Restart encounter';el('action').focus();
  }
  function tick() {
    if(game.result)return;
    let command;
    if(playback) {
      const run=playback.runs[runIndex];command=run[1];
      if(++runTicks===run[0]){runIndex++;runTicks=0;}
    } else command=input.sample(1,false);
    game.step(command);
    for(const event of game.events){
      if(event.type==='shot'){sound.play('driver',.46);if(event.hit){hitUntil=game.tick+5;sound.play('spark',.35);}}
      else {hurtUntil=game.tick+13;sound.play('armour',.65);}
    }
    if(game.tick%24===1)sound.play(game.tick%96===73?'fifth':'pulse',.5);
    if(game.age===1)sound.play('bell',.6);
    if(game.result)clock.setPaused(true);
  }
  function draw(alpha=1){scene.draw(game,alpha,Number(el('scale').value));}
  function frame(now) {
    raf=0;if(mode!=='playing')return;
    const elapsed=last===null?0:(now-last)/1000;last=now;
    const {alpha}=clock.advance(elapsed,tick);
    draw(game.result?1:alpha);hud();
    if(game.result)finished();else raf=requestAnimationFrame(frame);
  }
  function begin() {
    if(mode!=='arming')return;
    cancelAnimationFrame(raf);raf=0;setMode('playing');last=null;clock.setPaused(false);canvas.focus({preventScroll:true});hud();
    raf=requestAnimationFrame(frame);
  }
  function captured() {
    if(mode!=='arming'||held||!input.locked||raf)return;
    raf=requestAnimationFrame(()=>{raf=0;if(input.locked&&!held){input.discardPointerSample();begin();}});
  }
  function prepare(fresh,watch=false) {
    if(disposed||!['menu','over','paused'].includes(mode))return false;
    if(fresh) {
      playback=watch?lastReplay:null;runIndex=0;runTicks=0;verified=false;
      game=new Encounter();hitUntil=0;hurtUntil=0;clock.reset();
    }
    setMode('arming');freeze();input.useDrag(false);draw();
    el('gate-note').textContent='Waiting for mouse capture. The reactor clock is stopped.';
    if(el('sound').checked)sound.enable();
    return true;
  }
  for(const button of [el('action'),el('new')]){
    const fresh=()=>mode!=='paused'||button===el('new');
    on(button,'pointerdown',e=>{
      if(e.button!==0||!prepare(fresh()))return;
      if(e.pointerType==='mouse'&&!playback)held=true;
      else {input.useDrag(true);begin();}
    });
    on(button,'click',e=>{if(e.detail===0&&prepare(fresh())){input.useDrag(true);begin();}});
  }
  on(document,'pointerup',e=>{if(mode==='arming'&&e.button===0){held=false;captured();}});
  on(document,'pointercancel',()=>pause('Pointer gesture cancelled.'));
  on(el('fallback'),'pointerdown',e=>e.stopPropagation());
  on(el('fallback'),'click',()=>{if(mode==='arming'){input.clear();input.useDrag(true);begin();}});
  on(el('watch'),'click',()=>{if(lastReplay&&prepare(true,true))begin();});
  on(el('save'),'click',()=>{
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(game.receipt())],{type:'application/json'}));
    a.href=url;a.download='storm-protocol-'+game.tick+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  on(window,'keydown',e=>{if((e.code==='KeyP'||e.code==='Escape')&&['playing','arming'].includes(mode)){e.preventDefault();pause();}});
  on(window,'blur',()=>pause('Window lost focus.'));
  on(document,'visibilitychange',()=>{if(document.hidden)pause('Tab hidden.');});
  on(el('scale'),'change',()=>draw());on(window,'resize',()=>{if(mode!=='error'&&mode!=='playing')draw();});
  on(canvas,'webglcontextlost',e=>{
    e.preventDefault();setMode('error');freeze();scene.dispose();
    el('title').textContent='Graphics paused';el('intro').textContent='Waiting for the WebGL context to return.';
  });
  on(canvas,'webglcontextrestored',()=>{
    scene=new StormScene(canvas);draw();
    if(game.result){setMode('over');el('title').textContent='Encounter complete';el('action').textContent='Restart encounter';}
    else {setMode('paused');el('title').textContent='Graphics restored';el('action').textContent='Resume';}
    el('intro').textContent='The reactor clock is stopped.';
  });
  on(window,'pagehide',()=>{
    disposed=true;setMode('disposed');freeze();input.dispose();scene.dispose();sound.dispose();lifetime.abort();
    game.field.live.length=0;game.runs.length=0;lastReplay=null;playback=null;
  });
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  window.storm=Object.freeze({
    inspect:()=>({mode,tick:game.tick,hp:game.hp,boss:game.boss,phase:game.phase,pattern:game.plan.kind,
      position:[...game.body.position],yaw:game.body.yaw,pitch:game.body.pitch,live:game.field.live.length,
      checks:game.field.checks,spawned:game.field.spawned,result:game.result,verified,raf:!!raf,
      meshes:scene.r.meshes.size,voices:sound.voices.size,disposed,captured:input.locked,...scene.stats}),
    receipt:()=>game.receipt()
  });
  setMode('menu');el('action').textContent='Enter reactor';draw();
}
