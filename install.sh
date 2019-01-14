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
deno_zip="${deno_dir}/deno.gz"
deno_bin="${deno_dir}/deno"

if [ ! -d "$deno_dir" ]; then
  mkdir -p "$deno_dir"
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
  os="osx"
else
  os="linux"
fi

deno_uri="https://github.com/denoland/deno/releases/download/${version}/deno_${os}_x64.gz"
curl -fL# -o "$deno_zip" "$deno_uri"

gunzip -df "$deno_zip"
chmod +x "$deno_bin"

echo "Deno was installed successfully."
if [[ "$PATH" == *"$deno_dir"* ]]; then
  echo "Run 'deno --help' to get started."
else
  echo "Run '~/.deno/bin/deno --help' to get started."
fi
