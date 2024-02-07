#!/bin/sh
# Copyright 2019 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

if ! command -v unzip >/dev/null; then
	echo "Error: unzip is required to install Deno (see: https://github.com/denoland/deno_install#unzip-is-required )." 1>&2
	exit 1
fi

function version { echo "$@" | awk -F. '{ printf("%d%03d%03d%03d\n", $1,$2,$3,$4); }'; }

if [ $# -gt 0 ]; then
    deno_version=$1
fi

if [ "$OS" = "Windows_NT" ]; then
	target="x86_64-pc-windows-msvc"
else
	case $(uname -sm) in
	"Darwin x86_64") target="x86_64-apple-darwin" ;;
	"Darwin arm64") target="aarch64-apple-darwin" ;;
	"Linux aarch64")
		if [ -n "$deno_version" ] && [ $(version "${deno_version:1}") -lt $(version "1.40.3") ]; then
			echo "Error: Official Deno builds for Linux aarch64 are available from v1.40.3. (see: https://github.com/denoland/deno/issues/1846 )" 1>&2
			exit 1
		else
			target="aarch64-unknown-linux-gnu"
		fi ;;
	*) target="x86_64-unknown-linux-gnu" ;;
	esac
fi

if [ -z "$deno_version" ]; then
	deno_uri="https://github.com/denoland/deno/releases/latest/download/deno-${target}.zip"
else
	deno_uri="https://github.com/denoland/deno/releases/download/${deno_version}/deno-${target}.zip"
fi

deno_install="${DENO_INSTALL:-$HOME/.deno}"
bin_dir="$deno_install/bin"
exe="$bin_dir/deno"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"
unzip -d "$bin_dir" -o "$exe.zip"
chmod +x "$exe"
rm "$exe.zip"

echo "Deno was installed successfully to $exe"
if command -v deno >/dev/null; then
	echo "Run 'deno --help' to get started"
else
	case $SHELL in
	/bin/zsh) shell_profile=".zshrc" ;;
	*) shell_profile=".bashrc" ;;
	esac
	echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
	echo "  export DENO_INSTALL=\"$deno_install\""
	echo "  export PATH=\"\$DENO_INSTALL/bin:\$PATH\""
	echo "Run '$exe --help' to get started"
fi
echo
echo "Stuck? Join our Discord https://discord.gg/deno"
