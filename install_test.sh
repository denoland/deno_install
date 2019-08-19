#!/bin/sh

set -e

# Lint.
shellcheck -s sh ./*.sh
shfmt -d .

# Test we can install a specific version.
rm -rf ~/.deno
DENO_INSTALL='' ./install.sh v0.3.10
~/.deno/bin/deno version | grep 0.3.10

# Test we can install the latest version.
rm -rf ~/.deno
DENO_INSTALL="$HOME/.deno-test" sh ./install.sh
~/.deno-test/bin/deno version
