#!/bin/sh

set -e

# Lint.
shellcheck -s sh ./*.sh
shfmt -d .

# Test we can install a specific version.
rm -rf ~/.deno
./install.sh v0.3.10
~/.deno/bin/deno version | grep 0.3.10

# Test we can install the latest version.
rm -rf ~/.deno
sh ./install.sh
~/.deno/bin/deno version
