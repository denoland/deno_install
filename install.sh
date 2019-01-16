#!/bin/sh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

if [ $# -eq 0 ]; then
	version="v0.2.7"
else
	version=$1
fi

bin_dir="$HOME/.deno/bin"
exe="$bin_dir/deno"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

case $(uname -s) in
Darwin) os="osx" ;;
*) os="linux" ;;
esac

deno_uri="https://github.com/denoland/deno/releases/download/${version}/deno_${os}_x64.gz"

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
