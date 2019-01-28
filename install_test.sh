#!/bin/sh

set -ev

# Lint.
shellcheck -s sh ./*.sh
shfmt -d .

# Test we can install a specific version.
rm -rf ~/.deno
./install.sh v0.2.0
~/.deno/bin/deno -v | grep -e 0.2.0

# Test we can install the latest version.
rm -rf ~/.deno
sh ./install.sh
~/.deno/bin/deno -v
