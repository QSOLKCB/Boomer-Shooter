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
import shutil
import subprocess
import tempfile
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

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
        dest = Path(tmp) / "local/pit"
        dest.mkdir(parents=True)
        for name in ("content", "src", "vendor"):
            shutil.copytree(ROOT / name, dest / name)
        for name in ("index.html", "style.css"):
            shutil.copy(ROOT / name, dest)
        srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=tmp))
        thread = Thread(target=srv.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{srv.server_port}/local/pit/"
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
    tracked = ["index.html","style.css","content","src","vendor"]
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


def interactions(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url, 1280, 760)
    meta = environment(page, browser, exe)
    page.reload()
    ready(page)
    assert state(page)["mode"] == "menu"
    capture(page, out, "arena-menu")
    page.locator("#options").click()
    page.locator("#sound").check()
    page.locator("#limit").select_option("1")
    page.locator("#action").click()
    # Aim down the casting aisle. Kiln enters the real crosshair at the opening spawn.
    page.keyboard.press("f")
    wait(page, "foundry.inspect().mode==='over'")
    first = state(page)
    assert first["result"]["winner"] == "player" and actor(first)["kills"] == 1
    assert first["feed"][-1]["source"] == "player"
    capture(page, out, "victory")
    page.locator("#options").click()
    page.locator("#limit").select_option("10")
    page.locator("#action").click()
    wait(page, "foundry.inspect().audio")
    wait(page, "foundry.inspect().tick>=1")
    assert actor(state(page))["kills"] == 0
    page.keyboard.down("w")
    page.keyboard.press("Space")
    wait(page, "foundry.inspect().actors.find(a=>a.id==='player').position[1]>.24")
    page.keyboard.up("w")
    wait(page, "foundry.inspect().actors.find(a=>a.id==='player').position[1]<.05")
    capture(page, out, "arena-gameplay")
    page.keyboard.press("2")
    page.mouse.click(650, 350)
    wait(page, "foundry.inspect().captured")
    page.mouse.down()
    page.mouse.move(690, 355, steps=3)
    wait(page, "foundry.inspect().weapons.find(w=>w.actor==='player').timers[1].ammo<=25")
    page.mouse.up()
    assert any(cmd[2] or cmd[3] for _, cmd in page.evaluate("foundry.replay()")["runs"])
    page.keyboard.press("r")
    wait(page, "foundry.inspect().weapons.find(w=>w.actor==='player').timers[1].reloadRemaining>0")
    page.keyboard.down("Tab")
    assert page.locator("#board").is_visible() and page.locator("#board tbody tr").count() == 4
    page.keyboard.up("Tab")
    page.evaluate("document.exitPointerLock()")
    wait(page, "foundry.inspect().mode==='paused'")
    stopped = state(page)["tick"]
    page.wait_for_timeout(250)
    assert state(page)["tick"] == stopped
    page.locator("#action").click()
    page.keyboard.down("d")
    page.keyboard.down("f")
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
    assert page.evaluate("document.getElementById('focus-probe').contentWindow.releases") == ["KeyD", "KeyF"]
    page.evaluate("document.getElementById('focus-probe').remove()")
    page.locator("#action").click()
    resumed = state(page)["tick"]
    wait(page, "t=>foundry.inspect().tick>t+26", arg=resumed)
    samples = page.evaluate("foundry.replay()")
    assert samples["runs"][-1][1] == [0, 0, 0, 0, 0, -1]
    first_pos = actor(state(page))["position"]
    page.keyboard.down("d")
    wait(page, "p=>{const a=foundry.inspect().actors.find(a=>a.id==='player'); return a.health>0 && Math.hypot(a.position[0]-p[0],a.position[2]-p[2])>.12}", arg=first_pos)
    assert any(cmd[0] == 1 for _, cmd in page.evaluate("foundry.replay()")["runs"][-3:])
    page.keyboard.up("d")
    page.evaluate("""() => { Object.defineProperty(document,'hidden',{configurable:true,value:true});
      document.dispatchEvent(new Event('visibilitychange'));delete document.hidden; }""")
    assert state(page)["mode"] == "paused"
    page.locator("#action").click()
    page.keyboard.press("3")
    wait(page, "foundry.inspect().weapons.find(w=>w.actor==='player').selected==='slag'")
    page.wait_for_timeout(160)
    page.keyboard.press("f")
    wait(page, "foundry.inspect().weapons.find(w=>w.actor==='player').timers[2].ammo<4")
    retained = []
    for _ in range(10):
        page.keyboard.press("p")
        wait(page, "foundry.inspect().mode==='paused'")
        page.locator("#new").click()
        wait(page, "foundry.inspect().tick>0")
        s = state(page)
        retained.append(dict(gpu=page.evaluate("probeGPU"), raf=s["rafPending"], actors=len(s["actors"]),
                             voices=s["voices"], frags=sum(a["kills"] for a in s["actors"])))
    assert all(r["gpu"] == retained[0]["gpu"] and r["actors"] == 4 and r["raf"] and r["frags"] == 0 for r in retained)
    page.evaluate("""() => {window.lossProbe=document.querySelector('canvas').getContext('webgl').getExtension('WEBGL_lose_context');lossProbe.loseContext();}""")
    wait(page, "foundry.inspect().mode==='error'")
    frozen = state(page)["tick"]
    page.wait_for_timeout(200)
    page.evaluate("lossProbe.restoreContext()")
    wait(page, "foundry.inspect().mode==='paused'")
    assert state(page)["tick"] == frozen and page.evaluate("probeGPU") == retained[0]["gpu"]
    page.locator("#action").click()
    wait(page, "t=>foundry.inspect().tick>t", arg=frozen)
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    final = state(page)
    disposed = dict(gpu=page.evaluate("probeGPU"), raf=final["rafPending"], audioVoices=final["voices"])
    assert disposed == {"gpu": {"buffers": 0, "programs": 0}, "raf": False, "audioVoices": 0}
    assert not any(errors.values()), errors
    ctx.close()

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
                tab.locator("#action").click()
                wait(tab, "foundry.inspect().tick>12")
                assert not state(tab)["audio"]
                fallbacks[label] = "Match advanced with device construction rejected"
    dump(out / "browser.json", dict(environment=meta, errors=errors, firstFrag=first["feed"], winner=first["result"],
        controls=["keyboard move and jump", "pointer capture, relative aim, mouse firing, reload, unlock",
                  "scoreboard", "blur with off-window release and fresh keydown", "hidden document", "rematch", "WebGL context loss and restoration"],
        lifecycleInjection=["document hidden", "pagehide"], restarts=retained, disposed=disposed, fallbacks=fallbacks))


def quantiles(rows):
    values = sorted(rows)
    return {key: round(values[math.ceil(len(values)*q)-1], 4) for key, q in (("p50", .5), ("p95", .95), ("p99", .99))}


def reference(browser, url, out, exe):
    ctx, page, errors = page_for(browser, url, 1920, 1080)
    meta = environment(page, browser, exe)
    # Cache the already served arena bytes for the independent replay reader.
    page.evaluate("async()=>window.referenceArena=await (await fetch('./content/foundry.json')).text()")
    ctx.set_offline(True)
    page.locator("#action").click()
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
    page.locator("#action").click()
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
    parser.add_argument("--suite", choices=["all", "interactions", "reference"], default="all")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    with packaged() as url, sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium, args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        if args.suite in ("all", "interactions"):
            interactions(browser, url, args.out, args.chromium)
        if args.suite in ("all", "reference"):
            reference(browser, url, args.out, args.chromium)
        browser.close()


if __name__ == "__main__":
    main()
