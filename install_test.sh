#!/bin/sh

set -e

# Test that we can install the latest version at the default location.
rm -f ~/.deno/bin/deno
unset DENO_INSTALL_ROOT
sh ./install.sh
~/.deno/bin/deno --version

# Test that we can install a specific version at a custom location.
rm -rf ~/deno-1.0.0
export DENO_INSTALL_ROOT="$HOME/deno-1.0.0"
./install.sh v1.0.0
~/deno-1.0.0/bin/deno --version | grep 1.0.0

# Test that we can install at a relative custom location.
export DENO_INSTALL_ROOT="."
./install.sh v1.1.0
bin/deno --version | grep 1.1.0
