#!/bin/sh

set -e

# Test that we can install the latest version at the default location.
rm -f ~/.deno/bin/deno
unset DENO_INSTALL
sh ./install.sh
~/.deno/bin/deno --version

# Test that we can install a specific version at a custom location.
rm -rf ~/deno-1.15.0
export DENO_INSTALL="$HOME/deno-1.15.0"
./install.sh v1.15.0
~/deno-1.15.0/bin/deno --version | grep 1.15.0

# Test that we can install at a relative custom location.
export DENO_INSTALL="."
./install.sh v1.46.0
bin/deno --version | grep 1.46.0
