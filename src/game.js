import {FixedClock} from '../vendor/vanillajs/modules/time/index.js';
import {DEFAULT_SEED,LABELS} from './sim/arena.js';
import {MatchSlot,STEP} from './sim/match.js';
import {receipt} from './sim/replay.js';
import {controls} from './input/controls.js';
import {Scene} from './view/scene.js';
import {Sound} from './view/audio.js';
import {el,clockText,scoreTable,updateHUD} from './view/hud.js';
import {Metrics} from './metrics.js';

export function start(arenaText) {
  const slot=new MatchSlot(arenaText), arena=slot.current.arena, canvas=el('arena');
  let scene=new Scene(canvas,arena), match=slot.current, metrics=new Metrics();
  const clock=new FixedClock({step:STEP,maxFrame:.20,maxSteps:5}), sound=new Sound();
  const lifetime=new AbortController(), on=(target,name,fn)=>target.addEventListener(name,fn,{signal:lifetime.signal});
  let mode='menu', previous=null, raf=0, disposed=false;
  const input=controls(canvas,()=>mode==='playing'&&match.actor('player').health>0,()=>pause('Mouse released.'),()=>{el('capture-hint').textContent='Drag to aim · F fires · Esc pauses';});
  function render(alpha=1) {scene.draw(match,alpha,mode,Number(el('scale').value));}
  function setMode(value) {
    mode=value;document.body.dataset.mode=value;
    el('panel').hidden=value==='playing';el('hud').hidden=value!=='playing';el('board').hidden=true;
    el('settings').hidden=true;el('options').setAttribute('aria-expanded','false');document.body.classList.remove('settings-open');
    el('limit').disabled=el('duration').disabled=value==='paused';
    el('results').hidden=value!=='over';el('new').hidden=value!=='paused';
    el('menu-rules').hidden=value!=='menu';el('save').hidden=value!=='over'&&value!=='paused';
    el('damage').style.opacity='0';el('message').textContent='';
  }
  function freeze() {
    clock.setPaused(true);previous=null;cancelAnimationFrame(raf);raf=0;
    input.clear();sound.stop();
  }
  function pause(reason='Match paused.') {
    if(mode!=='playing') return;
    setMode('paused');freeze();
    el('kicker').textContent='MATCH SUSPENDED';el('title').textContent='Paused.';
    el('intro').textContent=reason+' Your position, ammunition and match clock are held.';
    el('action').textContent='Resume';el('action').focus();
  }
  function finish() {
    setMode('over');freeze();
    const won=match.result.winner==='player';
    el('kicker').textContent='MATCH COMPLETE  /  '+match.result.reason.toUpperCase();
    el('title').textContent=won?'Victory.':'Defeat.';
    el('intro').textContent=(LABELS[match.result.winner]??match.result.winner)+' takes the pit. Match time '+clockText(match.tick)+'.';
    scoreTable(el('results'),match.state.actors);el('action').textContent='Rematch';el('action').focus();
  }
  function frame(now) {
    raf=0;if(mode!=='playing')return;
    const began=performance.now(), interval=previous===null?0:Math.max(0,now-previous);previous=now;
    const result=clock.advance(interval/1000,()=>{
      const start=performance.now();scene.before(match);
      const command=input.sample(Number(el('sens').value),el('invert').checked);
      match.step(command);scene.feedback(match);sound.events(match);
      if(match.events.some(e=>e.type==='death'&&e.target==='player'))input.clear(false);
      metrics.ticks.add([match.tick,performance.now()-start]);
      if(match.result)clock.setPaused(true);
    });
    render(result.alpha);updateHUD(match,input.locked);
    metrics.frame(match.tick,interval,performance.now()-began,result.steps,result.dropped,scene.stats.drawCalls,scene.stats.submittedTriangles,
      match.state.projectiles.length,match.state.actors.filter(a=>a.health>0).length,match.work);
    if(match.result)finish();else raf=requestAnimationFrame(frame);
  }
  function play(fresh) {
    if(disposed || mode==='error')return;
    if(fresh) {
      const candidate=slot.replace(arenaText,{limit:Number(el('limit').value),duration:Number(el('duration').value),seed:DEFAULT_SEED});
      match=candidate;metrics=new Metrics();scene.reset();clock.reset();el('notice').textContent='';
    }
    setMode('playing');clock.setPaused(false);previous=null;input.clear();
    if(el('sound').checked) sound.enable().then(ok=>{
      if(!ok&&mode==='playing'&&!sound.enabled){el('capture-hint').textContent='Audio unavailable · click arena for mouse look · F fires';}
    });
    canvas.focus();updateHUD(match,false);raf=requestAnimationFrame(frame);
  }
  on(el('action'),'click',()=>play(mode!=='paused'));
  on(el('new'),'click',()=>play(true));
  on(el('options'),'click',()=>{
    const opening=el('settings').hidden;el('settings').hidden=!opening;el('options').setAttribute('aria-expanded',String(opening));
    document.body.classList.toggle('settings-open',opening);
  });
  on(el('limit'),'change',()=>el('rule-frags').textContent=el('limit').value);
  on(el('duration'),'change',()=>el('rule-time').textContent=clockText(Number(el('duration').value)));
  on(el('scale'),'change',()=>render());
  on(el('save'),'click',async()=>{
    const data=await receipt(match,arenaText), a=document.createElement('a'), url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
    a.href=url;a.download='foundry-pit-'+data.ticks+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  on(window,'keydown',e=>{
    if(mode!=='playing')return;
    if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();pause();}
    if(e.code==='Tab'){e.preventDefault();el('board').hidden=false;scoreTable(el('board'),match.state.actors);}
  });
  on(window,'keyup',e=>{if(e.code==='Tab')el('board').hidden=true;});
  on(window,'blur',()=>pause('Window lost focus.'));
  on(document,'visibilitychange',()=>{if(document.hidden)pause('Tab hidden.');});
  on(window,'resize',()=>{if(mode!=='playing'&&mode!=='error')render();});
  on(canvas,'webglcontextlost',e=>{
    e.preventDefault();setMode('error');freeze();scene.dispose();el('title').textContent='Graphics paused';
    el('intro').textContent='Waiting for WebGL to restore the arena.';el('action').disabled=true;el('options').hidden=true;
  });
  on(canvas,'webglcontextrestored',()=>{
    scene=new Scene(canvas,arena);render();
    setMode('paused');el('title').textContent='Graphics restored';el('intro').textContent='The previous match is ready.';
    el('action').textContent=match.result?'Rematch':'Resume';el('action').disabled=false;el('options').hidden=false;
    if(match.result)finish();
  });
  on(window,'pagehide',()=>{
    disposed=true;freeze();input.dispose();scene.dispose();sound.dispose();lifetime.abort();
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();},{once:false});
  // Inspection returns detached data. Browser evidence uses normal controls for mutations.
  window.foundry=Object.freeze({
    inspect:()=>structuredClone({mode,tick:match.tick,seed:match.seed,result:match.result,actors:match.state.actors,
      weapons:match.state.weapons,look:match.units[0].body.yaw,pitch:match.units[0].body.pitch,projectiles:match.state.projectiles.length,
      feed:match.feed,work:match.work,view:scene.stats,voices:sound.voices.size,audio:sound.enabled,
      captured:input.locked,rafPending:!!raf,disposed,profiles:match.units.slice(1).map(u=>[u.id,u.brain.mode,u.brain.target])}),
    metrics:()=>metrics.export(),replay:()=>receipt(match,arenaText)
  });
  setMode('menu');el('action').textContent='Enter the pit';el('action').disabled=false;render();
}
