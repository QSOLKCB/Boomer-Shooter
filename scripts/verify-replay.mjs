import {readFile} from 'node:fs/promises';
import {verify} from '../src/sim/replay.js';
const [tape,arena]=await Promise.all([readFile(process.argv[2],'utf8'),readFile(new URL('../content/foundry.json',import.meta.url),'utf8')]);
const result=await verify(tape,arena);
console.log(JSON.stringify({ticks:result.ticks,state:result.state,events:result.events},null,2));
