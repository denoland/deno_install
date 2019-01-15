#!/bin/sh
set -e
chmod +x install.sh
rm -rf ~/.deno
./install.sh | grep -e "Run '~/.deno/bin/deno --help' to get started."
rm -rf ~/.deno
PATH=$PATH:~/.deno/bin
./install.sh | grep -e "Run 'deno --help' to get started."
deno --help
rm -rf ~/.deno
./install.sh v0.2.0
deno -v | grep -e 0.2.0
