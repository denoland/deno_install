#!/bin/sh

set -e

# Lint.
shellcheck -s sh ./*.sh

# Test that we can install the latest version at the default location.
rm -f ~/.deno/bin/deno
unset DENO_INSTALL
sh ./install.sh
~/.deno/bin/deno --version

# Test that we can install a specific version at a custom location.
rm -rf ~/deno-1.0.0
export DENO_INSTALL="$HOME/deno-1.0.0"
./install.sh v1.0.0
~/deno-1.0.0/bin/deno --version | grep 1.0.0

# Test that we can install at a relative custom location.
export DENO_INSTALL="."
./install.sh v1.1.0
bin/deno --version | grep 1.1.0
