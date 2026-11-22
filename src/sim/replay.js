import {ENGINE,readArena} from './arena.js';
import {Match} from './match.js';
import {fpsRecord} from '../../vendor/vanillajs/modules/combat3d/index.js';
import {checkCommand} from './command.js';

export async function sha(text) {
  const bytes=typeof text==='string'?new TextEncoder().encode(text):text;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export async function receipt(match,arenaText) {
  // Snapshot synchronously, including the accepted tape, before any async hashing.
  const snapshot=JSON.stringify(match.canonical()), events=match.eventRows.join('\n'), runs=structuredClone(match.tape);
  const result={format:'foundry-pit.replay.1',engine:ENGINE,seed:match.seed,limit:match.limit,duration:match.duration,ticks:match.tick,runs};
  const [arena,state,history]=await Promise.all([sha(arenaText),sha(snapshot),sha(events)]);
  return {...result,arena,state,events:history};
}

export async function verify(text,arenaText) {
  if(typeof text!=='string'||text.length>4000000) throw new RangeError('Replay size');
  const tape=fpsRecord(JSON.parse(text),['format','engine','seed','limit','duration','ticks','runs','arena','state','events']);
  if (![tape.arena,tape.state,tape.events].every(value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value)))
    throw new TypeError('Expected SHA-256 replay digests');
  if(tape.format!=='foundry-pit.replay.1'||tape.engine!==ENGINE||tape.arena!==await sha(arenaText)) throw new Error('Replay source mismatch');
  const m=new Match(readArena(arenaText),tape);
  if(!Number.isInteger(tape.ticks)||tape.ticks<0||tape.ticks>m.duration||!Array.isArray(tape.runs)||tape.runs.length>tape.ticks) throw new RangeError('Replay bounds');
  let count=0;
  for(const entry of tape.runs) {
    if(!Array.isArray(entry)||entry.length!==2||!Number.isInteger(entry[0])||entry[0]<1) throw new RangeError('Invalid run');
    count+=entry[0]; if(count>tape.ticks) throw new RangeError('Extra commands'); checkCommand(entry[1]);
  }
  if(count!==tape.ticks) throw new RangeError('Incomplete tape');
  for(const [repeat,command] of tape.runs) for(let i=0;i<repeat;i++) if(!m.step(command)) throw new Error('Command after match end');
  const actual=await receipt(m,arenaText);
  if(actual.state!==tape.state||actual.events!==tape.events||JSON.stringify(actual.runs)!==JSON.stringify(tape.runs)) throw new Error('Replay diverged');
  return actual;
}
