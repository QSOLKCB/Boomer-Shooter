async () => {
  const [{StormScene},{Encounter}]=await Promise.all([import('./src/storm/scene.js'),import('./src/storm/encounter.js')]);
  const game=new Encounter(),canvas=document.createElement('canvas');document.body.append(canvas);
  const scene=new StormScene(canvas),r=scene.r,gl=r.gl;
  const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),
    x=>x.toString(16).padStart(2,'0')).join('');
  const update=r.update.bind(r);let writes=[];
  r.update=(mesh,data)=>{
    const bytes=data instanceof Float32Array?data:new Float32Array(data);
    writes.push(hash(bytes));update(mesh,data);
  };
  const frames=[];
  async function sample(name,alpha) {
    writes=[];scene.draw(game,alpha,.7);
    const pixels=new Uint8Array(canvas.width*canvas.height*4);
    gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    frames.push({name,tick:game.tick,kind:game.plan.kind,phase:game.phase,alpha,
      ids:game.field.live.map(h=>h.id),drawCalls:scene.stats.calls,uploads:await Promise.all(writes),pixels:await hash(pixels)});
  }
  try {
    await sample('entry',1);
    while(!game.result){
      game.step([0,0,0,0,2,-1]);
      if(game.tick%19===0||game.age===1||game.result)await sample('encounter',game.tick%3/2);
    }
    const tape=game.receipt();game.field.live.length=0;
    for(const count of [256,64,0,128]){
      game.field.live.length=0;
      for(let i=0;i<count;i++){
        if(i%48===0)game.field.advance([99,0,0],[99,0,0],[.35,.9,.35]);
        const source=(count+i)%5;
        game.field.emit(source,[i%16-8,.2+Math.floor(i/16)*.08,-3+i%8],[.01,0,.02],[.07+i%3*.06,.12,.14],400);
      }
      await sample('slot reuse '+count,.375);
    }
    return {frames,tape};
  } finally {scene.dispose();canvas.remove();}
}
