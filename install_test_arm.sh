#!/bin/sh

set -e

# Native Windows ARM64 shell-installer test. Runs on a windows-11-arm runner,
# exercising install.sh's native-architecture detection from Git Bash. Legacy
# v1.x versions are not tested here: they have no ARM64 artifacts.

rm -rf ~/.deno
unset DENO_INSTALL
sh ./install.sh
target="$(~/.deno/bin/deno eval 'console.log(Deno.build.target)')"
if [ "$target" != "aarch64-pc-windows-msvc" ]; then
	echo "expected aarch64-pc-windows-msvc, got '$target'" >&2
	exit 1
fi
echo "OK: install.sh selected $target"
