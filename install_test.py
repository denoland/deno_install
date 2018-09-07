#!/usr/bin/env python
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
from __future__ import print_function

import sys
import shutil
import os
import subprocess

this_dir = os.path.dirname(os.path.realpath(__file__))


def main():
    os.chdir(this_dir)
    PATTERN = "DENO_EXE: "
    home = os.path.expanduser("~")
    expected_bin_dir = os.path.join(home, ".deno", "bin")
    print("Testing install.py ... Expect deno installed to ", expected_bin_dir)
    if os.path.exists(expected_bin_dir):
        shutil.rmtree(expected_bin_dir)
    expected_fn = os.path.join(expected_bin_dir, "deno")

    cmd = [sys.executable, "install.py"]
    out = subprocess.check_output(cmd, universal_newlines=True)
    actual_fn = None
    for line in out.splitlines():
        print(line)
        if PATTERN in line:
            print("set actual")
            actual_fn = line[len(PATTERN):]
    assert actual_fn == expected_fn, "actual %s != expected %s" % (actual_fn,
                                                                   expected_fn)
    assert os.path.exists(actual_fn)


if __name__ == '__main__':
    main()
