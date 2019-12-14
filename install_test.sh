#!/bin/sh

set -e

# Lint.
# TODO(ry) shellcheck -s sh ./*.sh

# Test that we can install the latest version at the default location.
rm -f ~/.local/bin/deno
unset DENO_INSTALL
sh ./install.sh
~/.local/bin/deno --version

# Test that we can install a specific version at a custom location.
rm -rf ~/deno-0.13.0
export DENO_INSTALL="$HOME/deno-0.13.0"
./install.sh v0.13.0
~/deno-0.13.0/bin/deno --version | grep 0.13.0
