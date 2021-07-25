#!/bin/sh

set -e

# Test that we can install the latest version at the default location.
rm -f ~/.deno/bin/deno
unset DENO_INSTALL
sh ./install.sh
~/.deno/bin/deno --version

# Test that we can install the latest canary version at the default location.
rm -f ~/.deno/bin/deno
unset DENO_INSTALL
sh ./install_canary.sh
~/.deno/bin/deno --version

# Test that we can install a specific version at a custom location.
rm -rf ~/deno-1.0.0
export DENO_INSTALL="$HOME/deno-1.0.0"
./install.sh v1.0.0
~/deno-1.0.0/bin/deno --version | grep 1.0.0

# Test that we can install a specific canary version at a custom location.
rm -rf ~/deno-74c7559d2029539eb6ab7459c06061c00b3e0c1a
export DENO_INSTALL="$HOME/deno-74c7559d2029539eb6ab7459c06061c00b3e0c1a"
./install.sh 74c7559d2029539eb6ab7459c06061c00b3e0c1a
~/deno-1.0.0/bin/deno --version | grep 1.12.1

# Test that we can install at a relative custom location.
export DENO_INSTALL="."
./install.sh v1.1.0
bin/deno --version | grep 1.1.0

# Test that we can install a canary version at a relative custom location.
export DENO_INSTALL="."
./install.sh 1ad6575028bd5a13eb0633cc5e7649e18deec556
bin/deno --version | grep 1.12.0
