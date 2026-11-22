import {LABELS} from '../sim/arena.js';
import {rank} from '../sim/match.js';

export const el=id=>document.getElementById(id);
export const clockText=ticks=>{
  const sec=Math.ceil(Math.max(0,ticks)/60);
  return Math.floor(sec/60).toString().padStart(2,'0')+':'+(sec%60).toString().padStart(2,'0');
};
const name=id=>LABELS[id]??id;
function put(id,text){const n=el(id),s=String(text);if(n.textContent!==s)n.textContent=s;}
export function scoreTable(target,actors) {
  const key=JSON.stringify(actors.map(a=>[a.id,a.kills,a.deaths]));
  if(target.dataset.key===key)return;
  target.dataset.key=key;
  const table=document.createElement('table'), header=table.createTHead().insertRow();
  for(const value of ['Combatant','Frags','Deaths']) {const th=document.createElement('th');th.textContent=value;header.append(th);}
  const body=table.createTBody();
  for(const [i,a] of rank(actors).entries()) {
    const tr=body.insertRow();if(a.id==='player')tr.className='me';
    for(const value of [(i+1)+'  '+name(a.id),a.kills,a.deaths]) tr.insertCell().textContent=value;
  }
  target.replaceChildren(table);
}
export function updateHUD(m,locked) {
  const a=m.actor('player'), f=m.units[0].feel.presentation(), timer=m.loadout('player').timers[f.selected];
  put('hp',Math.ceil(a.health));put('ap',Math.ceil(a.armour));put('frags',a.kills);
  put('time',clockText(m.duration-m.tick));put('weapon-name',name(f.id).toUpperCase());put('ammo',String(timer.ammo).padStart(2,'0'));put('reserve',' / '+timer.reserve);
  put('weapon-state',timer.reloadRemaining>0?'RELOADING':timer.ammo===0?'R · RELOAD':'');
  const lead=rank(m.state.actors)[0];put('leader',name(lead.id).toUpperCase()+'  '+lead.kills+' / '+m.limit);
  const feed=m.feed.filter(e=>m.tick-e.tick<360).slice(-3);
  const key=feed.map(e=>[e.tick,e.shot,e.target].join('-')).join('/');
  if(el('feed').dataset.key!==key) {
    el('feed').dataset.key=key;
    el('feed').replaceChildren(...feed.map(e=>{const li=document.createElement('li');li.textContent=name(e.source)+' › '+name(e.target)+'  · '+name(e.weapon);return li;}));
  }
  el('damage').style.opacity=String(Math.min(.52,f.hurt*2));
  el('hitmark').style.opacity=String(f.hit>0?1:0);
  el('reticle').hidden=!a.health;
  el('capture-hint').hidden=locked||m.tick>550;
  if(!a.health)put('notice','Recasting  /  '+Math.max(0,(m.arena.pack.settings.rules.respawnTicks-(m.tick-a.deadAt))/60).toFixed(1)+' s');
  else {
    const pickup=m.lastPlayerPickup;
    put('notice',pickup&&m.tick-pickup.tick<55?'+'+Math.ceil(pickup.amount)+' '+pickup.kind:'');
  }
  if(!el('board').hidden) scoreTable(el('board'),m.state.actors);
}
