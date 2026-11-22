class Window {
  constructor(capacity){this.data=[];this.next=0;this.capacity=capacity;}
  add(value){if(this.data.length<this.capacity)this.data.push(value);else{this.data[this.next]=value;this.next=(this.next+1)%this.capacity;}}
  rows(){return [...this.data.slice(this.next),...this.data.slice(0,this.next)];}
}
export class Metrics {
  constructor(){this.frames=new Window(4096);this.ticks=new Window(8192);this.dropped=0;this.spikes=0;this.previousWork=[0,0,0,0];}
  frame(tick,interval,callback,steps,dropped,calls,triangles,projectiles,living,work) {
    this.dropped+=dropped;if(interval>33.34)this.spikes++;
    const totals=[work.sight,work.coverRays,work.paths,work.expanded];
    const delta=totals.map((n,i)=>n-this.previousWork[i]);
    this.frames.add([tick,interval,callback,steps,dropped,calls,triangles,projectiles,living,...delta]);
    this.previousWork=totals;
  }
  export(){return {frameColumns:['tick','intervalMs','callbackMs','steps','droppedSeconds','drawCalls','submittedTriangles','projectiles','livingActors','targetSightRays','coverRays','pathQueries','cellsExpanded'],
    tickColumns:['tick','stepMs'],frames:this.frames.rows(),ticks:this.ticks.rows(),droppedSeconds:this.dropped,spikesOver33ms:this.spikes};}
}
