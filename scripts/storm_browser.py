"""Exercise both games via local packaged HTML. Writes raw evidence to --out."""
import argparse
import csv
from pathlib import Path

from browser import (ROOT, capture, dump, environment, packaged, page_for, quantiles,
                     ready, sync_playwright, wait)

FLAGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
INPUT_TRACKER = """(() => {
  const keys=new Set(['keydown','keyup','blur','resize','pointerdown','pointermove','pointerup','pointercancel',
    'mousedown','mouseup','mousemove','pointerlockchange','pointerlockerror','visibilitychange','contextmenu',
    'lostpointercapture','webglcontextlost','webglcontextrestored']);
  const entries=[];
  const p=EventTarget.prototype, add=p.addEventListener, remove=p.removeEventListener;
  p.addEventListener=function(k,fn,o){
    // Attribute registrations to a packaged game/engine callsite. Playwright
    // also installs its own window input interceptors when clicking a locator.
    const stack=new Error().stack;
    if(keys.has(k) && stack.split('\\n').slice(2).some(frame=>
      frame.includes(location.origin+location.pathname.slice(0,location.pathname.lastIndexOf('/')+1)+'src/') ||
      frame.includes(location.origin+location.pathname.slice(0,location.pathname.lastIndexOf('/')+1)+'vendor/')))entries.push({target:this,k,fn,signal:o?.signal});
    return add.call(this,k,fn,o);
  };
  p.removeEventListener=function(k,fn,o){
    const i=entries.findIndex(e=>e.target===this&&e.k===k&&e.fn===fn);
    if(i>=0)entries.splice(i,1);
    return remove.call(this,k,fn,o);
  };
  window.liveInputListeners=()=>entries.filter(e=>!e.signal?.aborted).length;
})();"""


def at(page, expression, timeout=90000):
    page.wait_for_function("() => "+expression, timeout=timeout, polling=25)


def keyboard_start(page, button="#action"):
    page.locator(button).focus()
    page.keyboard.press("Enter")
    at(page, "storm.inspect().mode==='playing'")


def play(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url, 960, 600)
    page.add_init_script(INPUT_TRACKER)
    page.locator(".storm-entry").click()
    ready(page)
    meta = environment(page, browser, exe)
    capture(page, out, "reactor-menu")
    page.locator("#sound").check()
    # A real denied pointer request and an uncaptured keyboard/drag fallback.
    page.evaluate("""() => {document.querySelector('main').requestPointerLock=()=>Promise.reject(Error('probe'));}""")
    page.locator("#action").click()
    at(page, "document.querySelector('#gate-note').textContent.includes('unavailable')")
    page.wait_for_timeout(150)
    assert page.evaluate("storm.inspect().tick") == 0
    page.locator("#fallback").click()
    page.keyboard.down("d")
    page.keyboard.down("f")
    at(page, "storm.inspect().position[0]>.5 && storm.inspect().boss<240")
    page.mouse.move(440,300)
    page.mouse.down()
    page.mouse.move(510,300,steps=3)
    page.mouse.up()
    at(page, "Math.abs(storm.inspect().yaw)>.04")
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    page.keyboard.up("d")
    page.keyboard.up("f")
    assert page.evaluate("storm.inspect().mode") == "paused"
    page.evaluate("delete document.querySelector('main').requestPointerLock")
    resume_tick = page.evaluate("storm.inspect().tick")
    page.locator("#action").click()
    wait(page, "t=>storm.inspect().captured && storm.inspect().tick>=t+5", arg=resume_tick)
    tape = page.evaluate("storm.receipt()")
    assert not tape["runs"][-1][1][4] & 6 and tape["runs"][-1][1][0] == 0
    before = page.evaluate("storm.inspect().yaw")
    page.keyboard.down("ArrowRight")
    wait(page, "a=>Math.abs(storm.inspect().yaw-a)>.04", arg=before)
    page.keyboard.up("ArrowRight")
    page.evaluate("document.exitPointerLock()")
    at(page, "storm.inspect().mode==='paused'")
    paused = page.evaluate("storm.inspect().tick")
    page.wait_for_timeout(150)
    assert page.evaluate("storm.inspect().tick") == paused
    keyboard_start(page)
    # A visibility event with a controlled hidden flag in headless Chromium.
    page.evaluate("""() => {Object.defineProperty(document,'hidden',{configurable:true,value:true});
        document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;}""")
    assert page.evaluate("storm.inspect().mode") == "paused"
    page.evaluate("""() => {window.loss=document.querySelector('canvas').getContext('webgl').getExtension('WEBGL_lose_context');loss.loseContext();}""")
    at(page, "storm.inspect().mode==='error' && storm.inspect().meshes===0")
    page.wait_for_timeout(250)
    page.evaluate("loss.restoreContext()")
    at(page, "storm.inspect().mode==='paused' && storm.inspect().meshes===5")

    ctx.set_offline(True)
    keyboard_start(page, "#new")
    at(page, "storm.inspect().tick>=14")
    page.keyboard.down("d")
    at(page, "storm.inspect().tick>=112")
    page.keyboard.up("d")
    dodge = page.evaluate("storm.inspect()")
    assert dodge["position"][0] > 8 and dodge["hp"] == 100 and dodge["spawned"] > 0
    page.keyboard.press("p")
    keyboard_start(page, "#new")
    at(page, "storm.inspect().tick>=112")
    stationary = page.evaluate("storm.inspect()")
    assert stationary["hp"] < dodge["hp"]
    at(page, "storm.inspect().live>15")
    capture(page, out, "reactor-volley")
    at(page, "storm.inspect().pattern===2 && storm.inspect().live>=90")
    capture(page, out, "rotating-spiral")
    at(page, "storm.inspect().result==='defeat'")
    capture(page, out, "operator-down")
    defeat = page.evaluate("storm.receipt()")
    dump(out/"defeat-replay.json", defeat)
    keyboard_start(page)
    page.keyboard.down("f")
    at(page, "storm.inspect().phase===3 && storm.inspect().live>20")
    capture(page, out, "core-under-fire")
    at(page, "storm.inspect().result==='victory'")
    page.keyboard.up("f")
    capture(page, out, "core-offline")
    victory = page.evaluate("storm.receipt()")
    dump(out/"victory-replay.json", victory)
    page.locator("#scale").select_option(".7")
    page.locator("#watch").click()
    at(page, "storm.inspect().verified")
    assert page.evaluate("storm.receipt()") == victory
    # Re-execute the independent exported tapes in their producing runtime.
    for tape in (victory, defeat):
        assert page.evaluate("async t=>(await import('./src/storm/encounter.js')).replay(t)", tape) == tape
    ctx.set_offline(False)

    # Register after each app's pagehide cleanup; store its final counters across navigation.
    switches = []
    for i in range(10):
        storm = i % 2 == 0
        if storm:
            keyboard_start(page)
            at(page, "storm.inspect().tick>=4")
            page.keyboard.press("p")
        assert page.evaluate("liveInputListeners()") > 0
        page.evaluate("""s=>addEventListener('pagehide',()=>{
          const state=s?storm.inspect():foundry.inspect();
          sessionStorage.setItem('last-teardown',JSON.stringify({game:s?'storm':'deathmatch',
            gpu:probeGPU,disposed:state.disposed,raf:state.raf??state.rafPending,voices:state.voices,
            listeners:liveInputListeners()}));
        },{once:true})""", storm)
        page.locator(".links a" if storm else ".storm-entry").click()
        ready(page)
        row = page.evaluate("JSON.parse(sessionStorage.getItem('last-teardown'))")
        assert row["disposed"] and not row["raf"] and row["voices"] == row["listeners"] == 0, row
        assert row["gpu"] == {"buffers": 0, "programs": 0}, row
        switches.append(row)
    assert not any(errors.values()), errors
    ctx.close()
    bad = browser.new_page()
    bad.add_init_script("""const get=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(k,...rest){return k==='webgl'?null:get.call(this,k,...rest);};""")
    bad.goto(url+"storm.html")
    at(bad, "document.body.dataset.mode==='error' && document.querySelector('#intro').textContent.includes('WebGL')")
    bad.close()
    dump(out/"browser.json", dict(environment=meta, victory=victory["state"], defeat=defeat["state"],
        unsupportedWebGL=True, dodge=dodge, stationary=stationary, switches=switches, captureRejection=True, blur=True, unlock=True, simulatedHidden=True,
        contextRestoration=True, warmedOffline=True, replayVerifiedAtScale=.7, errors=errors))


def load(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url+"storm.html", 1280, 720)
    meta = environment(page, browser, exe)
    script = (ROOT/"scripts/storm-load.js").read_text()
    results = []
    for count in (64, 128, 256):
        row = page.evaluate(script, dict(count=count, scale=1))
        ticks, frames = row.pop("ticks"), row.pop("frames")
        for key, columns, rows in [
            ("ticks", "tick,simMs,collisionChecks,rejectedTotal", ticks),
            ("frames", "tick,intervalMs,callbackMs,drawMs,steps,droppedSeconds,drawCalls,hazardUploadBytes,hazardUploadMs,drawSubmitMs", frames)
        ]:
            with (out/f"load-{count}-{key}.csv").open("w", newline="") as handle:
                writer = csv.writer(handle, lineterminator="\n")
                writer.writerow(columns.split(","))
                writer.writerows(rows)
        row.update(tickMs=quantiles(r[1] for r in ticks), frameIntervalMs=quantiles(r[1] for r in frames),
                   drawMs=quantiles(r[3] for r in frames), drawCalls=sorted({r[6] for r in frames}),
                   droppedSeconds=sum(r[5] for r in frames), samples=[len(ticks),len(frames)])
        results.append(row)
    assert not any(errors.values()), errors
    dump(out/"load.json", dict(environment=meta, results=results, errors=errors,
         clock="60 Hz; cap 5 steps/callback and 200 ms wall time; discard excess; first 60 ticks warm-up"))
    ctx.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--suite", choices=["play","load","all"], default="all")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    with packaged() as url, sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium, args=FLAGS)
        if args.suite in ("play","all"):
            play(browser,url,args.out,args.chromium)
        if args.suite in ("load","all"):
            load(browser,url,args.out,args.chromium)
        browser.close()


if __name__ == "__main__":
    main()
