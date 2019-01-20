#!/bin/sh

set -ev

# Check formatting.
shfmt -d .

# Lint code.
shellcheck -s sh ./*.sh

# Test installing a specific version.
rm -rf ~/.deno
sh install.sh v0.2.0
~/.deno/bin/deno -v | grep -e 0.2.0

# Test installing the latest version.
rm -rf ~/.deno
sh install.sh
~/.deno/bin/deno -v
