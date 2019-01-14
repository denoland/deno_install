#!/bin/sh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

if [ $# -eq 0 ]; then
  version="v0.2.6"
else
  version=$1
fi

deno_dir="$HOME/.deno/bin"

if [ ! -d "$deno_dir" ]; then
  mkdir -p "$deno_dir"
fi

case $(uname -s) in
  Darwin) os="osx" ;;
  *) os="linux" ;;
esac

deno_uri="https://github.com/denoland/deno/releases/download/${version}/deno_${os}_x64.gz"

curl -fL# -o "$deno_dir/deno.gz" "$deno_uri"
gunzip -df "$deno_dir/deno.gz"
chmod +x "$deno_dir/deno"

echo "Deno was installed successfully."
case ":$PATH:" in
  *":$deno_dir:"*) echo "Run 'deno --help' to get started." ;;
  *) echo "Run '~/.deno/bin/deno --help' to get started." ;;
esac
