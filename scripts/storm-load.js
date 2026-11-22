// Executed by the packaged Chromium probe. This isolated fixture uses the same
// encounter tick and scene draw as the game, with a field of known occupancy.
async ({count,scale})=>{
  const [{StormScene},{Encounter,STEP,SEED},{HazardField},{FixedClock}]=await Promise.all([
    import('./src/storm/scene.js'),import('./src/storm/encounter.js'),import('./src/storm/field.js'),
    import('./vendor/vanillajs/modules/time/index.js')]);
  const canvas=document.createElement('canvas');document.body.append(canvas);
  const game=new Encounter(SEED),scene=new StormScene(canvas,count),clock=new FixedClock({step:STEP,maxSteps:5,maxFrame:.2});
  const field=new HazardField(count);game.field=field;
  const far=[100,0,0],half=game.body.halfExtents;
  // Fill over legal emission ticks before sampling. All bodies remain in view
  // for the measured interval and go through real narrow-phase collision tests.
  for(let i=0;i<count;i++){
    if(i && i%48===0)field.advance(far,far,half);
    const x=((i%16)-7.5)*.48,y=.4+Math.floor(i/16)%4*.55,z=-4+Math.floor(i/64)*1.4;
    if(!field.emit(i%3,[x,y,z],[.0006,0,.002],[.13,.13,.13],600))throw Error('Load fixture rejected');
  }
  field.advance(far,far,half);
  const ticks=[],frames=[];let previous=null;
  try {
    while(game.tick<180){
      const now=await new Promise(requestAnimationFrame);
      const ms=previous===null?0:now-previous;previous=now;
      const start=performance.now();
      const {steps,alpha,dropped}=clock.advance(ms/1000,()=>{
        const before=performance.now(),checks=field.checks;
        game.step();const cost=performance.now()-before;
        if(field.live.length!==count||field.checks-checks!==count)throw Error('Occupancy mismatch');
        if(game.tick>60)ticks.push([game.tick,cost,field.checks-checks,field.rejected]);
      });
      const draw=performance.now();scene.draw(game,alpha,scale);const end=performance.now();
      if(scene.stats.heads!==count)throw Error('Draw mismatch');
      if(game.tick>60)frames.push([game.tick,ms,end-start,end-draw,steps,dropped,scene.stats.calls,scene.stats.uploadBytes,
        scene.stats.hazardUploadMs,scene.stats.drawSubmitMs]);
    }
    return {count,scale,seed:SEED,ticks,frames,peak:field.peak,spawned:field.spawned,rejected:field.rejected,
      width:canvas.width,height:canvas.height};
  } finally {scene.dispose();canvas.remove();}
}
