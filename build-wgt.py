"""Package Dumi TV as DumiTV.wgt (config.xml + icon.png + app/) for TizenBrew Installer.

    python build-wgt.py

Then attach DumiTV.wgt to a GitHub release; TizenBrew Installer installs the latest release's .wgt
when you give it thedragonsdvl-maker/dumi-tv.
"""
import os
import zipfile

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "DumiTV.wgt")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for name in ("config.xml", "icon.png"):
        z.write(os.path.join(here, name), name)
    for root, _, files in os.walk(os.path.join(here, "app")):
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, here).replace(os.sep, "/"))
print(out, os.path.getsize(out), "bytes")
