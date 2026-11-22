"""Reproduce the BS-001 engine receipt from an exact, local git object database."""
import argparse
import hashlib
import json
import posixpath
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor/vanillajs"
PIN = "7a3a5a3ec49aed5b7063a05614951e69bb257da6"
ROOTS = ("audio2d", "character", "input", "mod-fps", "navigation", "render-webgl", "time", "weapon-feel")
IMPORT = re.compile(r"""(?:from\s*|import\s*)['"]([^'"]+)['"]""")
digest = lambda data: hashlib.sha256(data).hexdigest()


def derive(source):
    text = source.decode().replace("from '../", "from '../../vendor/vanillajs/modules/")
    before = "  #emit(e){"
    assert text.count(before) == 1
    method = (ROOT / "integration/armour-method.txt").read_text()
    return text.replace(before, method + before).encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkout", type=Path)
    args = parser.parse_args()

    def blob(path):
        return subprocess.check_output(["git", "-C", args.checkout, "show", f"{PIN}:{path}"])

    metadata = json.loads(blob("MODULES.json"))["modules"]
    pending = ["LICENSE", "NOTICE", *(metadata[name]["entry"] for name in ROOTS)]
    files = {}
    while pending:
        path = pending.pop()
        if path in files:
            continue
        data = blob(path)
        files[path] = digest(data)
        target = VENDOR / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        if path.endswith(".js"):
            for dep in IMPORT.findall(data.decode()):
                if not dep.startswith("."):
                    raise ValueError(f"nonlocal import {dep} in {path}")
                pending.append(posixpath.normpath(posixpath.join(posixpath.dirname(path), dep)))

    derived = "src/engine/combat3d.js"
    adapted = derive(blob("modules/combat3d/index.js"))
    (ROOT / derived).write_bytes(adapted)
    manifest = dict(repository="https://github.com/QSOLKCB/VANILLAJS", tag="v3.2.0",
                    commit=PIN, roots=ROOTS, modules=sorted(p.split("/")[1] for p in files if p.endswith(".js")),
                    files=dict(sorted(files.items())), localChanges=[],
                    derivatives={derived: {"source": "modules/combat3d/index.js", "sha256": digest(adapted),
                                           "extension": "integration/armour-method.txt"}})
    (VENDOR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{len(files)} verified upstream blobs, manifest SHA-256 {digest((VENDOR/'manifest.json').read_bytes())}")


if __name__ == "__main__":
    main()
