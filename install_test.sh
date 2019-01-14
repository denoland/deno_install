#!/bin/sh
set -eo pipefail
chmod +x install.sh
rm -rf ~/.deno
./install.sh | grep -e "Run '~/.deno/bin/deno --help' to get started."
PATH=$PATH:~/.deno/bin
rm -rf ~/.deno
./install.sh | grep -e "Run 'deno --help' to get started."
deno --help
