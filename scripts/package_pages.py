"""Build the static Foundry Pit directory used by Pages and browser tests."""
import argparse
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]


def package(destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    if any(destination.iterdir()):
        raise ValueError("Select an empty output directory")
    for name in ("index.html", "style.css", "LICENSE", "CREDITS.md"):
        shutil.copyfile(ROOT / name, destination / name)
    for name in ("src", "content", "vendor"):
        shutil.copytree(ROOT / name, destination / name)
    (destination / ".nojekyll").touch()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    package(parser.parse_args().destination)
