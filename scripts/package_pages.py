"""Build the static Foundry Pit directory used by Pages and browser tests."""
import argparse
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]


def package(destination, revision=None):
    destination = Path(destination)
    if revision is not None and not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("A full Git source SHA is required")
    destination.mkdir(parents=True, exist_ok=True)
    if any(destination.iterdir()):
        raise ValueError("Select an empty output directory")
    for name in ("index.html", "style.css", "LICENSE", "CREDITS.md"):
        shutil.copyfile(ROOT / name, destination / name)
    for name in ("src", "content", "vendor"):
        shutil.copytree(ROOT / name, destination / name)
    (destination / ".nojekyll").touch()
    if revision:
        (destination / "revision.json").write_text(json.dumps({"source": revision})+"\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--revision", help="Source commit to identify the deployed game")
    args = parser.parse_args()
    package(args.destination, args.revision)
