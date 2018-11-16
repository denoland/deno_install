#!/usr/bin/env python
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
from __future__ import print_function

import sys
import shutil
import os
import subprocess

this_dir = os.path.dirname(os.path.realpath(__file__))


def bin_dir():
    home = os.path.expanduser("~")
    return os.path.join(home, ".deno", "bin")


def test_install():
    os.chdir(this_dir)
    PATTERN = "DENO_EXE: "
    expected_bin_dir = bin_dir()
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


def test_tag_install():
    print(
        "Testing install.py [tag_name] ... Expect specified version of deno installed"
    )
    cmd = [sys.executable, "install.py", "v0.1.11"]
    out = subprocess.check_output(cmd, universal_newlines=True)

    bin_path = os.path.join(bin_dir(), "deno")
    cmd = [bin_path, "-v"]
    out = subprocess.check_output(cmd, universal_newlines=True)

    assert "deno: 0.1.11" in out, "installed deno version is not 0.1.11"
    assert "v8: 7.1.302.4" in out, "v8 version is not 7.1.302.4"
    assert "typescript: 3.1.3" in out, "typescript version is not 3.1.3"


def main():
    test_install()
    test_tag_install()


if __name__ == '__main__':
    main()
