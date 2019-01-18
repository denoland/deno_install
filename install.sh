#!/bin/sh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

case $(uname -s) in
Darwin) os="osx" ;;
*) os="linux" ;;
esac

if [ $# -eq 0 ]; then
	deno_uri=$(curl -sS https://api.github.com/repos/denoland/deno/releases?per_page=2 |
		grep -o "https://github.com/denoland/deno/releases/download/.*/deno_${os}_x64\.gz" |
		head -n 1)
else
	deno_uri="https://github.com/denoland/deno/releases/download/${1}/deno_${os}_x64.gz"
fi

bin_dir="$HOME/.deno/bin"
exe="$bin_dir/deno"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl -fL# -o "$exe.gz" "$deno_uri"
gunzip -df "$exe.gz"
chmod +x "$exe"

echo "Deno was installed successfully to $exe"
if command -v deno >/dev/null; then
	echo "Run 'deno --help' to get started."
else
	echo "Manually add the directory to your \$HOME/.bash_profile (or similar)"
	echo "  export PATH=\"$bin_dir:\$PATH\""
	echo "Run '$exe --help' to get started."
fi
