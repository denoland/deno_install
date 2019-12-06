#!/bin/sh
# Copyright 2019 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

case $(uname -s) in
Darwin) os="osx" ;;
*) os="linux" ;;
esac

case $(uname -m) in
x86_64) arch="x86_64" ;;
*) arch="other" ;;
esac

if [ "$arch" = "other" ]; then
	echo "Unsupported architecture $(uname -m). Only x64 binaries are available."
	exit
fi

if [ $# -eq 0 ]; then
	deno_asset_path=$(
		command curl -sSf https://github.com/denoland/deno/releases |
			command grep -o "/denoland/deno/releases/download/.*/deno_${os}_x64\\.gz" |
			command head -n 1
	)
	if [ ! "$deno_asset_path" ]; then exit 1; fi
	deno_uri="https://github.com${deno_asset_path}"
else
	deno_uri="https://github.com/denoland/deno/releases/download/${1}/deno_${os}_x64.gz"
fi

xdg_bin_home=${XDG_BIN_HOME:-$HOME/.local/bin}
deno_install=${DENO_INSTALL:-$xdg_bin_home}
exe="$deno_install/deno"

if [ ! -d "$deno_install" ]; then
	mkdir -p "$deno_install"
fi

curl -fL# -o "$exe.gz" "$deno_uri"
gunzip -df "$exe.gz"
chmod +x "$exe"

echo "Deno was installed successfully to $exe"
if command -v deno >/dev/null; then
	echo "Run 'deno --help' to get started"
else
	echo "Manually add the directory to your \$HOME/.bash_profile (or similar)"
	echo "  export DENO_INSTALL=\"$deno_install\""
	echo "  export PATH=\"\$DENO_INSTALL:\$PATH\""
	echo "Run '$exe --help' to get started"
fi
