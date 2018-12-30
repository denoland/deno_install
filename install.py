#!/usr/bin/env python
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone) Keep this script simple and easily auditable.
from __future__ import print_function

import io
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile
import zlib

try:
    from urllib.request import urlopen
except ImportError:
    from urllib2 import urlopen

DENO_REPO_URL = "https://github.com/denoland/deno"
LATEST_RELEASE_URL = DENO_REPO_URL + "/releases/latest"
TAG_URL = DENO_REPO_URL + "/releases/tag/"
FILENAME_LOOKUP = {
    "darwin": "deno_osx_x64.gz",
    "linux": "deno_linux_x64.gz",  # python3
    "linux2": "deno_linux_x64.gz",  # python2
    "win32": "deno_win_x64.zip",
    "cygwin": "deno_win_x64.zip"
}


def release_url(platform, tag):
    try:
        filename = FILENAME_LOOKUP[platform]
    except KeyError:
        print("Unable to locate appropriate filename for", platform)
        sys.exit(1)

    url = TAG_URL + tag if tag else LATEST_RELEASE_URL

    try:
        html = urlopen(url).read().decode('utf-8')
    except:
        print("Unable to find release page for", tag)
        sys.exit(1)

    urls = re.findall(r'href=[\'"]?([^\'" >]+)', html)
    matching = [u for u in urls if filename in u]

    if len(matching) != 1:
        print("Unable to find download url for", filename)
        sys.exit(1)

    return "https://github.com" + matching[0]


def download_with_progress(url):
    print("Downloading", url)

    remote_file = urlopen(url)
    total_size = int(remote_file.headers['Content-Length'].strip())

    data = []
    bytes_read = 0.0

    while True:
        d = remote_file.read(8192)

        if not d:
            print()
            break

        bytes_read += len(d)
        data.append(d)
        sys.stdout.write('\r%2.2f%% downloaded' % (bytes_read / total_size * 100))
        sys.stdout.flush()

    return b''.join(data)


def main():
    bin_dir = deno_bin_dir()
    exe_fn = os.path.join(bin_dir, "deno.exe" if sys.platform == "win32" else "deno")

    url = release_url(sys.platform, sys.argv[1] if len(sys.argv) > 1 else None)
    compressed = download_with_progress(url)

    if url.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(compressed), 'r') as z:
            with open(exe_fn, 'wb+') as exe:
                exe.write(z.read('deno.exe'))
    else:
        # Note: gzip.decompress is not available in python2.
        content = zlib.decompress(compressed, 15 + 32)
        with open(exe_fn, 'wb+') as exe:
            exe.write(content)
    os.chmod(exe_fn, 0o744)

    print("DENO_EXE: " + exe_fn)
    print("Now manually add %s to your $PATH" % bin_dir)
    print("Example:")
    print()
    print("  echo export PATH=\"%s\":\\$PATH >> $HOME/.bash_profile" % bin_dir)
    print()


def mkdir(d):
    if not os.path.exists(d):
        print("mkdir", d)
        os.mkdir(d)


def deno_bin_dir():
    home = os.path.expanduser("~")
    deno = os.path.join(home, ".deno")
    mkdir(deno)
    deno_bin = os.path.join(deno, "bin")
    mkdir(deno_bin)
    return deno_bin


if __name__ == '__main__':
    main()
