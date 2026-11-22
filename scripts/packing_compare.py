"""Compare actual WebGL uploads, pixels, replay and workload distributions with merged BH-001B."""
import argparse
import gzip
import io
import json
import subprocess
import tarfile
import tempfile
from contextlib import contextmanager
from functools import partial
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer

from browser import ROOT, Quiet, dump, page_for, quantiles, sync_playwright
from package_pages import package
from storm_browser import FLAGS

BASE = "79217d37fdf4f45d607907e7a946a96eb886dd1d"


@contextmanager
def sites():
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        previous = root/"before"
        data = subprocess.check_output(["git","archive",BASE,"index.html","storm.html","style.css",
                                        "src","content","vendor"], cwd=ROOT)
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            archive.extractall(previous, filter="data")
        package(root/"after")
        server = ThreadingHTTPServer(("127.0.0.1",0),partial(Quiet,directory=root))
        thread = Thread(target=server.serve_forever,daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}"
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


def compare(exe, out):
    head = subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
    dirty = subprocess.check_output(["git","status","--porcelain","--","src","vendor","content",
                                    "storm.html","index.html","style.css"],cwd=ROOT,text=True)
    parity = (ROOT/"scripts/packing-parity.js").read_text()
    load = (ROOT/"scripts/storm-load.js").read_text()
    raw, summary, proof = [], [], {}
    with sites() as url,sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=exe,args=FLAGS)
        for version in ("before","after"):
            ctx,page,errors=page_for(browser,f"{url}/{version}/storm.html",800,450)
            proof[version]=page.evaluate(parity)
            assert not any(errors.values()),errors
            ctx.close()
        a,b=proof["before"],proof["after"]
        assert a["tape"]==b["tape"]
        assert len(a["frames"])==len(b["frames"])
        for left,right in zip(a["frames"],b["frames"]):
            assert left==right,(left["name"],left["tick"],right["tick"])
        assert {row["kind"] for row in a["frames"]}==set(range(5))
        dump(out/"parity.json",a)
        for version in ("before","after","after","before"):
            ctx,page,errors=page_for(browser,f"{url}/{version}/storm.html",1280,720)
            for count in (64,128,256):
                trial=page.evaluate(load,dict(count=count,scale=1))
                assert trial["peak"]==count
                ticks,frames=trial["ticks"],trial["frames"]
                assert all(row[2]==count for row in ticks)
                assert all(row[6]==5 for row in frames)
                raw.append(dict(version=version,**trial))
                summary.append(dict(version=version,count=count,drawMs=quantiles(f[3] for f in frames),
                                    intervalMs=quantiles(f[1] for f in frames),tickMs=quantiles(t[1] for t in ticks),
                                    droppedSeconds=sum(f[5] for f in frames),frames=len(frames),ticks=len(ticks)))
            assert not any(errors.values()),errors
            ctx.close()
        dump(out/"paired.json",dict(baseline=BASE,candidate=head,runtimeMatchesHead=not dirty,
            browser=browser.version,backend="ANGLE Vulkan SwiftShader",viewport=[1280,720],
            seed=1398034258,parityFrames=len(a["frames"]),results=summary))
        browser.close()
    (out/"paired-raw.json.gz").write_bytes(gzip.compress(json.dumps(raw,separators=(",",":")).encode(),mtime=0))


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium",required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    compare(args.chromium,args.out)
