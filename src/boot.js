const root=new URL('../',import.meta.url);
const manifestHash='396e969f69f745e9267eb3d3f21d052f57e35971b9b0484c02c3247bfebb71e3';

async function bytes(path) {
  const response=await fetch(new URL(path,root));
  if(!response.ok) throw new Error('Cannot load '+path);
  return response.arrayBuffer();
}
async function digest(data) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
}
async function boot() {
  if(!globalThis.crypto?.subtle) throw new Error('Open the game via http://127.0.0.1 or a secure local origin.');
  const manifest=await bytes('vendor/vanillajs/manifest.json');
  if(await digest(manifest)!==manifestHash) throw new Error('Engine manifest differs from the BS-001 pin.');
  const receipt=JSON.parse(new TextDecoder().decode(manifest));
  const files=Object.entries(receipt.files).map(([path,hash])=>['vendor/vanillajs/'+path,hash]);
  for(const [path,entry] of Object.entries(receipt.derivatives)) files.push([path,entry.sha256]);
  await Promise.all(files.map(async([path,hash])=>{
    if(await digest(await bytes(path))!==hash) throw new Error('Engine file differs from the receipt: '+path);
  }));
  if(document.body.dataset.game==='storm'){
    const packing=await bytes('vendor/render-packing/manifest.json');
    if(await digest(packing)!=='e17239dca10ba3235c901e5461e9543f88963dd3470846388cd9d4b4f172eb5c' ||
       await digest(await bytes('vendor/render-packing/index.js'))!==JSON.parse(new TextDecoder().decode(packing)).sha256)
      throw new Error('Reactor geometry module differs from its source receipt.');
    const {startStorm}=await import('./storm/game.js');
    startStorm();return;
  }
  const arenaText=new TextDecoder().decode(await bytes('content/foundry.json'));
  const {start}=await import('./game.js'); start(arenaText);
}
boot().catch(error=>{
  document.body.dataset.mode='error';
  document.querySelector('#title').textContent='Arena offline';
  document.querySelector('#intro').textContent=error.message;
  for(const id of ['action','options','menu-rules','control-guide']) {const element=document.getElementById(id);if(element)element.hidden=true;}
});
