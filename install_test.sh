#!/bin/sh

set -e

# Lint.
shellcheck -s sh ./*.sh
shfmt -d .

# Test we can install a specific version.
rm -rf ~/.deno
./install.sh v0.2.0
version=$(~/.deno/bin/deno --version)
echo "$version"
test "$(echo "$version" | head -n 1)" = "deno: 0.2.0"

# Test we can install the latest version.
rm -rf ~/.deno
sh ./install.sh
version=$(~/.deno/bin/deno --version)
echo "$version"
echo "$version" | head -n 1 | grep -Eq '^deno: \d+\.\d+\.\d+$'
