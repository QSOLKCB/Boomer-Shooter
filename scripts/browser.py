"""Run actual Chromium input, packaging, lifecycle and P1 probes. No runtime dependencies."""
import argparse
import csv
from collections import Counter
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.metadata import version
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import tempfile
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright
if __package__:
    from .package_pages import package
else:
    from package_pages import package

ROOT = Path(__file__).resolve().parents[1]
GPU_HOOK = """(() => {
  const count={buffers:0,programs:0}; window.probeGPU=count;
  for(const [object,key] of [['Buffer','buffers'],['Program','programs']]) {
    const gl=WebGLRenderingContext.prototype,make=gl['create'+object],drop=gl['delete'+object];
    const live=new WeakSet();
    gl['create'+object]=function(...args){const v=make.apply(this,args);if(v){live.add(v);count[key]++;}return v;};
    gl['delete'+object]=function(v){if(live.delete(v))count[key]--;return drop.call(this,v);};
  }
})();"""


def dump(path, data):
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n")


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextmanager
def packaged():
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / "Boomer-Shooter"
        package(dest)
        srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=tmp))
        thread = Thread(target=srv.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{srv.server_port}/Boomer-Shooter/"
        finally:
            srv.shutdown()
            srv.server_close()
            thread.join()


def environment(page, browser, exe):
    info = page.evaluate("""() => {
      const gl=document.querySelector('canvas').getContext('webgl'), ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
        vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),
        glVersion:gl.getParameter(gl.VERSION),dpr:devicePixelRatio,
        viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};
    }""")
    cpu = next((line.split(":", 1)[1].strip() for line in Path("/proc/cpuinfo").read_text().splitlines()
                if line.startswith("model name")), "undisclosed")
    tracked = ["index.html","storm.html","style.css","content","src","vendor"]
    files = sorted(p for name in tracked for p in ([ROOT/name] if (ROOT/name).is_file() else (ROOT/name).rglob("*")) if p.is_file())
    runtime = hashlib.sha256()
    for path in files:
        runtime.update(path.relative_to(ROOT).as_posix().encode()+b"\0"+hashlib.sha256(path.read_bytes()).digest())
    dirty = subprocess.check_output(["git","status","--porcelain","--",*tracked],cwd=ROOT)
    return dict(runtimeSHA256=runtime.hexdigest(),runtimeMatchesHead=not dirty,source=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                engine="7a3a5a3ec49aed5b7063a05614951e69bb257da6", browser=browser.version,
                binarySHA256=hashlib.file_digest(open(exe, "rb"), "sha256").hexdigest() if exe else None,
                playwright=version("playwright"), os=platform.system(), kernel=platform.release(), cpu=cpu, **info)


def state(page):
    return page.evaluate("foundry.inspect()")


def ready(page):
    page.locator("#action:enabled").wait_for(timeout=20000)


def wait(page, predicate, timeout=12000, arg=None):
    page.wait_for_function(predicate, arg=arg, timeout=timeout, polling=35)


def actor(s, id="player"):
    return next(a for a in s["actors"] if a["id"] == id)


def capture(page, out, name):
    page.screenshot(path=out / (name + ".jpg"), type="jpeg", quality=85)


def page_for(browser, url, width, height):
    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
    events = {"consoleErrors": [], "pageErrors": [], "externalRequests": [], "httpErrors": []}
    origin = urlsplit(url).netloc

    def local(route):
        if urlsplit(route.request.url).netloc != origin:
            events["externalRequests"].append(route.request.url)
            route.abort()
        else:
            route.continue_()

    ctx.route("**/*", local)
    page = ctx.new_page()
    page.add_init_script(GPU_HOOK)
    page.on("pageerror", lambda err: events["pageErrors"].append(str(err)))
    page.on("console", lambda msg: events["consoleErrors"].append(msg.text) if msg.type == "error" else None)
    page.on("response", lambda res: events["httpErrors"].append([res.status, res.url]) if res.status >= 400 else None)
    page.goto(url)
    ready(page)
    return ctx, page, events


def enter(page, button="#action", opening_shot=False, allow_drag=False):
    target=page.locator(button)
    target.scroll_into_view_if_needed()
    rect=target.bounding_box()
    # Keep every mouse event in this gesture on the same physical coordinates.
    # Mixing locator.hover() with page.mouse.up() can move a locked pointer to (0,0).
    page.mouse.move(rect["x"]+rect["width"]/2,rect["y"]+rect["height"]/2)
    if opening_shot:
        # Order the opening keyboard edge before the first game frame even on a
        # heavily scheduled host. Only these scripted scoring fixtures use this
        # barrier. The capture regressions and P1 use ordinary native frames.
        page.evaluate("""() => {
          const native=window.requestAnimationFrame;
          let pressed=false;
          function listen(e){
            if(e.isTrusted && e.code==='KeyF'){pressed=true;window.removeEventListener('keydown',listen);}
          }
          window.addEventListener('keydown',listen);
          window.requestAnimationFrame=function(callback){
            if(document.body.dataset.mode!=='playing')return native.call(window,callback);
            window.requestAnimationFrame=native;
            function opening(now){
              if(pressed || document.body.dataset.mode!=='playing')callback(now);
              else native.call(window,opening);
            }
            return native.call(window,opening);
          };
        }""")
        page.mouse.down()
        page.mouse.up()
        page.wait_for_function("document.body.dataset.mode==='playing' && !!document.pointerLockElement",polling=1)
        page.keyboard.press("f")
    else:
        page.mouse.down()
        page.mouse.up()
        if allow_drag:
            wait(page,"(document.body.dataset.mode==='playing' && !!document.pointerLockElement) || (document.body.dataset.mode==='arming' && document.getElementById('gate-message').textContent.includes('unavailable'))")
            if state(page)["mode"]=="arming":
                page.locator("#free-look").click()
                wait(page,"document.body.dataset.mode==='playing'")
                return "explicit drag"
        wait(page, "document.body.dataset.mode==='playing' && !!document.pointerLockElement")
    return "mouse capture"


def wait_alive(page,deaths,condition):
    result=page.wait_for_function("""deaths=>{
      const s=foundry.inspect(),a=s.actors.find(a=>a.id==='player');
      if(a.deaths!==deaths || !a.health)return 'dead';
      const gun=s.weapons.find(w=>w.actor==='player');
      return ("""+condition+""") && 'ready';
    }""", arg=deaths,timeout=12000,polling=20)
    return result.json_value()=="ready"


def exercise_repeater(page, out):
    # A screenshot or a CDP round trip can span a death on a software renderer.
    # Only an observed elimination retries the sequence; a missing input still fails.
    for _ in range(3):
        wait(page,"foundry.inspect().actors.find(a=>a.id==='player').health>0")
        deaths=actor(state(page))["deaths"]

        page.keyboard.press("2")
        if not wait_alive(page,deaths,"gun.selected==='arc'"):
            continue
        page.mouse.down(button="right")
        try:
            if not wait_alive(page,deaths,"s.aim.ads && s.aim.fov<1.03"):
                continue
            capture(page,out,"focused-arc")
        finally:
            page.mouse.up(button="right")
        if not wait_alive(page,deaths,"!s.aim.ads && s.aim.fov>1.25"):
            continue
        page.mouse.down()
        try:
            page.mouse.move(690,355,steps=3)
            if not wait_alive(page,deaths,"gun.timers[1].ammo<=25"):
                continue
        finally:
            page.mouse.up()
        page.keyboard.press("r")
        if wait_alive(page,deaths,"gun.timers[1].reloadRemaining>0"):
            assert any(cmd[2] or cmd[3] for _,cmd in page.evaluate("foundry.replay()")["runs"])
            return
    raise AssertionError("Three player lives ended during the repeater controls check")


def interactions(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url, 1280, 760)
    meta = environment(page, browser, exe)
    page.reload()
    ready(page)
    assert state(page)["mode"] == "menu"
    capture(page, out, "arena-menu")
    page.locator("#options").click()
    page.locator("#sound").check()
    page.locator("#movement").select_option("classic")
    page.locator("#difficulty").select_option("hard")
    page.locator("#limit").select_option("1")
    # Aim down the casting aisle. Kiln enters the real crosshair at the opening spawn.
    enter(page,opening_shot=True)
    wait(page, "foundry.inspect().mode==='over'")
    first = state(page)
    assert (first["movement"], first["difficulty"]) == ("classic", "hard")
    assert page.locator("#hitmark").get_attribute("data-kind") == "frag"
    assert first["result"]["winner"] == "player" and actor(first)["kills"] == 1
    assert first["feed"][-1]["source"] == "player"
    assert all(cmd[2]==cmd[3]==0 for _,cmd in page.evaluate("foundry.replay()")["runs"])
    capture(page, out, "victory")
    page.locator("#options").click()
    page.locator("#movement").select_option("arcade")
    page.locator("#difficulty").select_option("easy")
    page.locator("#limit").select_option("10")
    enter(page)
    wait(page, "foundry.inspect().audio")
    wait(page, "foundry.inspect().tick>=1")
    assert actor(state(page))["kills"] == 0
    page.keyboard.down("w")
    page.keyboard.press("Space")
    wait(page, "foundry.inspect().actors.find(a=>a.id==='player').position[1]>.24")
    page.keyboard.up("w")
    wait(page, "foundry.inspect().actors.find(a=>a.id==='player').position[1]<.05")
    capture(page, out, "arena-gameplay")
    exercise_repeater(page,out)
    page.keyboard.down("Tab")
    assert page.locator("#board").is_visible() and page.locator("#board tbody tr").count() == 4
    page.keyboard.up("Tab")
    page.evaluate("document.exitPointerLock()")
    wait(page, "foundry.inspect().mode==='paused'")
    stopped = state(page)["tick"]
    page.wait_for_timeout(250)
    assert state(page)["tick"] == stopped
    enter(page)
    page.keyboard.down("d")
    page.keyboard.down("f")
    page.keyboard.down("q")
    start_tick = state(page)["tick"]
    wait(page, "t=>foundry.inspect().tick>t+6", arg=start_tick)
    # Move focus into an unrelated browsing context. Both releases must land
    # there, so the original input adapter never receives their keyup events.
    page.evaluate("""() => {
      const other=document.createElement('iframe');other.id='focus-probe';other.style.cssText='position:fixed;width:2px;height:2px;right:0;bottom:0';
      document.body.append(other);other.contentWindow.releases=[];other.contentWindow.addEventListener('keyup',e=>other.contentWindow.releases.push(e.code));
      other.contentWindow.focus();
    }""")
    wait(page, "foundry.inspect().mode==='paused'")
    page.evaluate("document.getElementById('focus-probe').contentWindow.focus()")
    page.keyboard.up("d")
    page.keyboard.up("f")
    page.keyboard.up("q")
    assert page.evaluate("document.getElementById('focus-probe').contentWindow.releases") == ["KeyD", "KeyF", "KeyQ"]
    page.evaluate("document.getElementById('focus-probe').remove()")
    enter(page)
    resumed = state(page)["tick"]
    wait(page, "t=>foundry.inspect().tick>t+26", arg=resumed)
    samples = page.evaluate("foundry.replay()")
    assert samples["runs"][-1][1] == [0, 0, 0, 0, 0, -1]
    assert not state(page)["aim"]["ads"]
    wait(page, "()=>foundry.inspect().actors.find(a=>a.id==='player').health>0")
    page.keyboard.down("d")
    page.keyboard.down("q")
    wait(page, "async()=>{if(!foundry.inspect().aim.ads)return false; const tape=await foundry.replay(); return tape.runs.at(-1)[1][0]===1}")
    page.keyboard.up("d")
    page.keyboard.up("q")
    page.evaluate("""() => { Object.defineProperty(document,'hidden',{configurable:true,value:true});
      document.dispatchEvent(new Event('visibilitychange'));delete document.hidden; }""")
    assert state(page)["mode"] == "paused"
    enter(page)
    for _ in range(3):
        wait(page,"foundry.inspect().actors.find(a=>a.id==='player').health>0")
        deaths=actor(state(page))["deaths"]
        page.keyboard.press("3")
        if not wait_alive(page,deaths,"gun.selected==='slag' && !s.aim.switchRemaining && !gun.timers[2].cooldown"):
            continue
        page.keyboard.press("f")
        if wait_alive(page,deaths,"gun.timers[2].ammo<4"):
            break
    else:
        raise AssertionError("Three player lives ended during the launcher controls check")
    retained = []
    for _ in range(10):
        page.keyboard.press("p")
        wait(page, "foundry.inspect().mode==='paused'")
        entry=enter(page, "#new", allow_drag=True)
        wait(page, "foundry.inspect().tick>0")
        s = state(page)
        retained.append(dict(entry=entry,gpu=page.evaluate("probeGPU"), raf=s["rafPending"], actors=len(s["actors"]),
                             voices=s["voices"], frags=sum(a["kills"] for a in s["actors"])))
    assert all(r["gpu"] == retained[0]["gpu"] and r["actors"] == 4 and r["raf"] and r["frags"] == 0 for r in retained)
    page.evaluate("""() => {window.lossProbe=document.querySelector('canvas').getContext('webgl').getExtension('WEBGL_lose_context');lossProbe.loseContext();}""")
    wait(page, "foundry.inspect().mode==='error'")
    frozen = state(page)["tick"]
    page.wait_for_timeout(200)
    page.evaluate("lossProbe.restoreContext()")
    wait(page, "foundry.inspect().mode==='paused'")
    assert state(page)["tick"] == frozen and page.evaluate("probeGPU") == retained[0]["gpu"]
    enter(page,allow_drag=True)
    wait(page, "t=>foundry.inspect().tick>t", arg=frozen)
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    final = state(page)
    disposed = dict(gpu=page.evaluate("probeGPU"), raf=final["rafPending"], audioVoices=final["voices"])
    assert disposed == {"gpu": {"buffers": 0, "programs": 0}, "raf": False, "audioVoices": 0}
    assert not any(errors.values()), errors
    ctx.close()

    # Deny the first real capture request after two seconds. A second physical
    # click retries through the native browser API, or explicitly chooses drag.
    gate = []
    for fallback in (False,True):
        with browser.new_context() as gate_ctx:
            tab=gate_ctx.new_page()
            tab.add_init_script("""const original=Element.prototype.requestPointerLock;
              Element.prototype.requestPointerLock=function(){
                Element.prototype.requestPointerLock=original;
                return new Promise((_,reject)=>{window.rejectCapture=()=>reject(new Error('capture denied'));});
              };""")
            tab.goto(url);ready(tab);tab.locator("#action").click()
            wait(tab,"foundry.inspect().mode==='arming' && typeof rejectCapture==='function'")
            tab.wait_for_timeout(2000)
            held=state(tab)
            assert held["tick"]==0 and not held["rafPending"] and not held["captured"]
            assert all(a["health"]==100 and a["kills"]==0 and a["deaths"]==0 for a in held["actors"])
            assert tab.evaluate("foundry.replay()")["runs"]==[]
            tab.evaluate("rejectCapture()")
            wait(tab,"document.getElementById('gate-message').textContent.includes('unavailable')")
            if fallback:
                tab.locator("#free-look").click()
                wait(tab,"foundry.inspect().mode==='playing' && foundry.inspect().tick>1")
                initial_yaw=state(tab)["look"]
                tab.mouse.move(450,280);tab.mouse.down();tab.mouse.move(520,280,steps=3);tab.mouse.up()
                wait(tab,"yaw=>Math.abs(foundry.inspect().look-yaw)>.04",arg=initial_yaw)
                assert not state(tab)["captured"]
            else:
                capture(tab,out,"waiting-for-mouse")
                tab.locator("#gate-message").click()
                wait(tab,"foundry.inspect().captured && foundry.inspect().tick>1")
            gun=next(w for w in state(tab)["weapons"] if w["actor"]=="player")
            assert gun["timers"][0]["ammo"]==6
            gate.append(dict(route="explicit drag" if fallback else "native retry",waitMs=2000,
                             waitingTicks=held["tick"],health=[a["health"] for a in held["actors"]],
                             acceptedCommands=0,shotsOnEntry=0,captured=state(tab)["captured"]))

    with browser.new_context() as keys_ctx:
        tab=keys_ctx.new_page()
        tab.goto(url);ready(tab);tab.locator("#action").focus();tab.keyboard.press("Enter")
        wait(tab,"foundry.inspect().mode==='playing' && foundry.inspect().tick>1")
        assert not state(tab)["captured"]
        before=state(tab)["look"]
        tab.keyboard.down("ArrowRight")
        wait(tab,"yaw=>Math.abs(foundry.inspect().look-yaw)>.03",arg=before);tab.keyboard.up("ArrowRight")
        gate.append(dict(route="keyboard activation",captured=False))

    with browser.new_context() as held_ctx:
        tab=held_ctx.new_page()
        tab.goto(url);ready(tab)
        button=tab.locator("#action").bounding_box()
        tab.mouse.move(button["x"]+button["width"]/2,button["y"]+button["height"]/2)
        tab.mouse.down()
        wait(tab,"!!document.pointerLockElement")
        tab.wait_for_timeout(500)
        held=state(tab)
        assert held["mode"]=="arming" and held["tick"]==0
        tab.mouse.up()
        wait(tab,"foundry.inspect().tick>=3")
        tape=tab.evaluate("foundry.replay()")
        assert all(row[2:4]==[0,0] and not row[4]&6 for _,row in tape["runs"])
        gate.append(dict(route="held join click",capturedBeforeRelease=True,waitingTicks=held["tick"],
                         phantomTurn=False,shotsOnEntry=0))

    fallbacks = {}
    for label, script in {
        "webgl": """const original=HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};""",
        "audio": "window.AudioContext=class {constructor(){throw new Error('device unavailable');}}",
    }.items():
        with browser.new_context() as fail_ctx:
            tab = fail_ctx.new_page()
            tab.add_init_script(script)
            tab.goto(url)
            if label == "webgl":
                wait(tab, "document.body.dataset.mode==='error'")
                assert "WebGL" in tab.locator("#intro").inner_text()
                fallbacks[label] = tab.locator("#intro").inner_text()
            else:
                ready(tab)
                tab.locator("#options").click()
                tab.locator("#sound").check()
                enter(tab)
                wait(tab, "foundry.inspect().tick>12")
                assert not state(tab)["audio"]
                fallbacks[label] = "Match advanced with device construction rejected"
    dump(out / "browser.json", dict(environment=meta, errors=errors, firstFrag=first["feed"], winner=first["result"],
        controls=["movement and skill selection", "keyboard move and jump", "held right mouse and Q sights", "pointer capture, relative aim, mouse firing, reload, unlock",
                  "scoreboard", "blur with off-window release and fresh keydown", "hidden document", "rematch", "WebGL context loss and restoration"],
        lifecycleInjection=["document hidden", "pagehide"], restarts=retained, disposed=disposed, fallbacks=fallbacks,
        captureGate=gate))


def frag_ledger(page, tape, arena_text):
    return page.evaluate("""async ([tape,text])=>{
      const {Match}=await import('./src/sim/match.js'), {readArena}=await import('./src/sim/arena.js');
      const {receipt}=await import('./src/sim/replay.js'), match=new Match(readArena(text),tape), deaths=[];
      for(const [n,command] of tape.runs) for(let i=0;i<n;i++){
        if(!match.step(command))throw Error('Early match end');
        deaths.push(...match.events.filter(e=>e.type==='death'));
      }
      const checked=await receipt(match,text);
      if(checked.events!==tape.events||checked.state!==tape.state)throw Error('Frag ledger replay diverged');
      return {ticks:checked.ticks,state:checked.state,events:checked.events,deaths};
    }""", [tape, arena_text])


def playthrough(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url, 1280, 760)
    meta = environment(page, browser, exe)
    ctx.set_offline(True)
    enter(page,opening_shot=True)
    wait(page, "foundry.inspect().actors.find(a=>a.id==='player').kills===1")
    opening = state(page)["feed"][-1]
    assert opening["source"] == "player" and opening["target"] != "player"
    page.keyboard.down("w")
    page.keyboard.down("Shift")
    page.keyboard.press("Space")
    page.keyboard.press("2")
    page.keyboard.down("f")
    wait(page, "foundry.inspect().weapons.find(a=>a.actor==='player').timers[1].ammo<=25")
    page.keyboard.up("w")
    page.keyboard.up("Shift")
    page.keyboard.up("f")
    page.keyboard.press("r")
    page.keyboard.down("Tab")
    assert page.locator("#board tbody tr").count() == 4
    page.keyboard.up("Tab")
    wait(page, "foundry.inspect().mode==='over'", timeout=420000)
    final = state(page)
    player = actor(final)
    cpu_frags = sum(a["kills"] for a in final["actors"] if a["id"] != "player")
    # Each rival frag can be attributed only once. Subtracting every player
    # death gives a conservative lower bound on eliminations between rivals.
    assert cpu_frags > player["deaths"] and player["kills"] >= 1
    assert max(a["kills"] for a in final["actors"]) >= 10
    tape = page.evaluate("foundry.replay()")
    dump(out / "played-replay.json", tape)
    dump(out / "frag-ledger.json", frag_ledger(page,tape,(ROOT/"content/foundry.json").read_text()))
    page.locator("#options").click()
    page.locator("#replay-file").set_input_files({"name":"played.json","mimeType":"application/json","buffer":json.dumps(tape).encode()})
    wait(page, "t=>document.getElementById('message').textContent.startsWith('Verified '+t+' ticks')",arg=tape["ticks"],timeout=90000)
    enter(page)
    wait(page, "foundry.inspect().tick>=4")
    assert all(a["kills"] == 0 for a in state(page)["actors"])
    assert not any(errors.values()), errors
    dump(out / "played-match.json", dict(environment=meta,openingFrag=opening,result=final["result"],endTick=tape["ticks"],
        rules={"fragLimit":tape["limit"],"durationTicks":tape["duration"]},cpuVersusCpuFragsAtLeast=cpu_frags-player["deaths"],
        scores=[{k:a[k] for k in ("id","kills","deaths")} for a in final["actors"]],
        state=tape["state"],events=tape["events"],browserReplayVerified=True,offlineRematch=True,errors=errors))
    ctx.close()


def tuning(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url, 1280, 760)
    meta = environment(page, browser, exe)
    trials = page.evaluate("""async () => {
      const [{Match},{readArena},{FLAG},{receipt,verify},text]=await Promise.all([
        import('./src/sim/match.js'),import('./src/sim/arena.js'),import('./src/sim/command.js'),
        import('./src/sim/replay.js'),fetch('./content/foundry.json').then(r=>r.text())]);
      const arena=readArena(text), trials=[];
      for(const movement of ['classic','arcade']) {
        const m=new Match(arena,{movement,difficulty:'normal'}), body=m.units[0].body;
        let distance=0, reversal=0, apex=0;
        for(let t=0;t<100;t++) {
          m.step([t<16?1:t<33?-1:0,0,0,0,t===0?FLAG.press:t===34?FLAG.jump:0,-1]);
          if(t===9) distance=body.position[0];
          if(t>=16 && !reversal && body.velocity[0]<0) reversal=t-15;
          apex=Math.max(apex,body.position[1]);
        }
        const tape=await receipt(m,text);
        const check=await verify(JSON.stringify(tape),text);
        trials.push({movement,distanceAtTenTicks:distance,reversalTicks:reversal,jumpApexM:apex,
          replayVerified:check.state===tape.state && check.events===tape.events,tape});
      }
      return trials;
    }""")
    classic, arcade = trials
    assert classic["tape"]["runs"] == arcade["tape"]["runs"]
    assert arcade["distanceAtTenTicks"] > classic["distanceAtTenTicks"]
    assert arcade["jumpApexM"] > classic["jumpApexM"] and arcade["reversalTicks"] < classic["reversalTicks"]
    assert all(t["replayVerified"] for t in trials)
    ctx.set_offline(True)
    page.locator("#options").click()
    page.locator("#replay-file").set_input_files(ROOT / "evidence/bs-001/reference-replay.json")
    wait(page, "()=>document.getElementById('message').textContent.startsWith('Verified 4220 ticks')", timeout=90000)
    enter(page)
    page.keyboard.down("q")
    wait(page,"foundry.inspect().aim.fov<1.03")
    capture(page,out,"rivet-sights")
    page.keyboard.up("q")
    wait(page, "()=>!document.getElementById('incoming').hidden", timeout=35000)
    incoming = page.evaluate("""() => ({
      tick:foundry.inspect().tick, health:foundry.inspect().actors.find(a=>a.id==='player').health,
      bearing:document.getElementById('incoming').style.getPropertyValue('--bearing')})""")
    assert incoming["health"] < 100 and incoming["bearing"].endswith("rad")
    capture(page, out, "under-fire")
    assert not any(errors.values()), errors
    dump(out/"tuning.json", dict(environment=meta, trials=trials, incoming=incoming, legacyReplayTicks=4220, errors=errors))
    ctx.close()


def hosted(browser, url, out):
    ctx, page, errors = page_for(browser, url, 1280, 760)
    revision = page.evaluate("async()=>{const r=await fetch('./revision.json',{cache:'no-store'}); if(!r.ok)throw Error('revision '+r.status); return (await r.json()).source}")
    assert len(revision)==40 and all(c in '0123456789abcdef' for c in revision)
    capture_on_entry=page.locator("#entry-gate").count()>0
    page.locator("#options").click()
    page.locator("#limit").select_option("1")
    ctx.set_offline(True)
    if capture_on_entry:
        enter(page,opening_shot=True)
    else:
        page.locator("#action").click()
        page.keyboard.press("f")
    wait(page, "foundry.inspect().mode==='over'")
    final=state(page)
    assert final["result"]["winner"]=="player" and actor(final)["kills"]==1
    capture(page,out,"pages-victory")
    if capture_on_entry:
        enter(page)
    else:
        page.locator("#action").click()
    wait(page,"foundry.inspect().tick>=2")
    assert all(a["kills"]==0 for a in state(page)["actors"])
    assert not any(errors.values()),errors
    dump(out/"pages.json",dict(url=url,source=revision,browser=browser.version,firstFrag=final["feed"][-1],
        combatants=len(final["actors"]),checkedSingleClickCapture=capture_on_entry,offlineRematch=True,errors=errors))
    ctx.close()


def quantiles(rows):
    values = sorted(rows)
    return {key: round(values[math.ceil(len(values)*q)-1], 4) for key, q in (("p50", .5), ("p95", .95), ("p99", .99))}


def reference(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url, 1920, 1080)
    meta = environment(page, browser, exe)
    # Cache the already served arena bytes for the independent replay reader.
    page.evaluate("async()=>window.referenceArena=await (await fetch('./content/foundry.json')).text()")
    ctx.set_offline(True)
    enter(page)
    wait(page, "foundry.inspect().tick>=740", timeout=120000)
    raw = page.evaluate("foundry.metrics()")
    frames = [r for r in raw["frames"] if 120 < r[0] <= 720 and r[1] > 0]
    ticks = [r for r in raw["ticks"] if 120 < r[0] <= 720]
    assert len(ticks) == 600 and len(frames) > 50
    for name, columns, rows in (("frames",raw["frameColumns"],frames),("ticks",raw["tickColumns"],ticks)):
        with (out / f"p1-{name}.csv").open("w",newline="") as handle:
            writer=csv.writer(handle,lineterminator="\n")
            writer.writerow(columns)
            writer.writerows(rows)
    # Finish the ordinary default match with no more player input or network.
    wait(page, "foundry.inspect().mode==='over'", timeout=420000)
    s = state(page)
    assert s["tick"] <= 18000 and s["result"]["reason"] == "frag limit"
    rivals = [a for a in s["actors"] if a["id"] != "player"]
    bot_kills = sum(a["kills"] for a in rivals)
    assert bot_kills > actor(s)["deaths"] > 0
    tape = page.evaluate("foundry.replay()")
    verification = page.evaluate("""async tape=>(await import('./src/sim/replay.js')).verify(JSON.stringify(tape),window.referenceArena)""", tape)
    assert verification == tape
    dump(out / "reference-replay.json", tape)
    capture(page, out, "match-results")
    page.locator("#options").click()
    page.locator("#replay-file").set_input_files({"name":"match.json","mimeType":"application/json","buffer":json.dumps(tape).encode()})
    wait(page, "t=>document.getElementById('message').textContent.startsWith('Verified '+t+' ticks')",arg=tape["ticks"],timeout=90000)
    enter(page)
    wait(page, "foundry.inspect().tick>=8")
    assert all(a["kills"] == 0 for a in state(page)["actors"])
    assert not any(errors.values()), errors
    ctx.close()
    dump(out / "p1.json", dict(environment=meta, errors=errors, seed=tape["seed"], arena=tape["arena"], state=tape["state"],
        events=tape["events"], interval="tick 121 through 720; first 120 warm-up ticks excluded", frames=len(frames), ticks=len(ticks),
        sampledWallSeconds=sum(r[1] for r in frames)/1000, frameIntervalMs=quantiles(r[1] for r in frames),
        callbackMs=quantiles(r[2] for r in frames), stepMs=quantiles(r[1] for r in ticks),
        maxStepsInFrame=max(r[3] for r in frames), droppedSeconds=sum(r[4] for r in frames),
        spikesOver33ms=sum(r[1]>33.34 for r in frames), drawCalls=dict(Counter(r[5] for r in frames)),
        submittedTriangles=[min(r[6] for r in frames),max(r[6] for r in frames)], peakProjectiles=max(r[7] for r in frames),
        actors=4, livingActors=[min(r[8] for r in frames),max(r[8] for r in frames)],
        sampleWork={raw["frameColumns"][col]:sum(r[col] for r in frames) for col in range(9,13)},
        entireMatchWork=s["work"], result=s["result"], endTick=s["tick"],
        ranking=[{k:a[k] for k in ("id","kills","deaths")} for a in sorted(s["actors"],key=lambda a:(-a["kills"],a["deaths"],a["id"]))],
        browserReplayVerified=True, offlineRematch=True))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium", default=os.environ.get("CHROMIUM"))
    parser.add_argument("--suite", choices=["all", "interactions", "tuning", "reference", "playthrough", "hosted"], default="all")
    parser.add_argument("--url", help="Public game URL for the hosted probe")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    if args.suite=="hosted":
        if not args.url or urlsplit(args.url).scheme!="https":
            parser.error("--suite hosted needs an HTTPS --url")
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=args.chromium,args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
            hosted(browser,args.url,args.out)
            browser.close()
        return
    if args.url:
        parser.error("--url is only used with --suite hosted")
    with packaged() as url, sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium, args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        if args.suite in ("all", "interactions"):
            interactions(browser, url, args.out, args.chromium)
        if args.suite in ("all", "tuning"):
            tuning(browser, url, args.out, args.chromium)
        if args.suite in ("all", "reference"):
            reference(browser, url, args.out, args.chromium)
        if args.suite in ("all", "playthrough"):
            playthrough(browser, url, args.out, args.chromium)
        browser.close()


if __name__ == "__main__":
    main()
