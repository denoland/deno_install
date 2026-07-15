#!/bin/sh
# Copyright 2019 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

if ! command -v unzip >/dev/null && ! command -v 7z >/dev/null; then
	echo "Error: either unzip or 7z is required to install Deno (see: https://github.com/denoland/deno_install#either-unzip-or-7z-is-required )." 1>&2
	exit 1
fi

if [ "$OS" = "Windows_NT" ]; then
	# Resolve the *native* Windows architecture, not the process architecture.
	# A native ARM64 shell reports ARM64 directly. A 64-bit x64 shell emulated on
	# ARM64 is not a WOW64 process, so PROCESSOR_ARCHITEW6432 is unset and
	# PROCESSOR_ARCHITECTURE reports AMD64 (only a 32-bit x86 shell sets the
	# ARCHITEW6432 variable). When the env vars don't say ARM64, fall back to the
	# physical CPU identifier in the registry, which x64/x86 emulation does not
	# rewrite.
	native_arch="${PROCESSOR_ARCHITEW6432:-$PROCESSOR_ARCHITECTURE}"
	case "$native_arch" in
	ARM64 | arm64) target="aarch64-pc-windows-msvc" ;;
	*)
		cpu_identifier="$(MSYS_NO_PATHCONV=1 reg query 'HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0' /v Identifier 2>/dev/null || true)"
		case "$cpu_identifier" in
		*ARM* | *arm*) target="aarch64-pc-windows-msvc" ;;
		*) target="x86_64-pc-windows-msvc" ;;
		esac
		;;
	esac
else
	case $(uname -sm) in
	"Darwin x86_64") target="x86_64-apple-darwin" ;;
	"Darwin arm64") target="aarch64-apple-darwin" ;;
	"Linux aarch64") target="aarch64-unknown-linux-gnu" ;;
	*) target="x86_64-unknown-linux-gnu" ;;
	esac
fi

print_help_and_exit() {
	echo "Setup script for installing deno

Options:
  -y, --yes
    Skip interactive prompts and accept defaults
  --no-modify-path
    Don't add deno to the PATH environment variable
  -h, --help
    Print help
"
	echo "Note: Deno was not installed"
	exit 0
}

# Initialize variables
should_run_shell_setup=false

# Simple arg parsing - look for help flag, otherwise
# ignore args starting with '-' and take the first
# positional arg as the deno version to install
for arg in "$@"; do
	case "$arg" in
	"-h")
		print_help_and_exit
		;;
	"--help")
		print_help_and_exit
		;;
	"-y")
		should_run_shell_setup=true
		;;
	"--yes")
		should_run_shell_setup=true
		;;
	"-"*) ;;
	*)
		if [ -z "$deno_version" ]; then
			deno_version="$arg"
		fi
		;;
	esac
done
if [ -z "$deno_version" ]; then
	deno_version="$(curl -s https://dl.deno.land/release-latest.txt)"
fi

# Native Windows ARM64 artifacts are published starting with Deno v2.6.8.
# Refuse to silently install the x64 build under emulation for older versions.
if [ "$target" = "aarch64-pc-windows-msvc" ]; then
	v="${deno_version#v}"
	v="${v%%-*}"
	case "$v" in
	# Canary hash or unknown format: assume a current build.
	*[!0-9.]* | "") ;;
	*)
		major="${v%%.*}"
		rest="${v#*.}"
		minor="${rest%%.*}"
		patch="${rest#*.}"
		patch="${patch%%.*}"
		[ "$minor" = "$rest" ] && minor=0
		case "$patch" in *[!0-9]* | "") patch=0 ;; esac
		if [ "$major" -lt 2 ] ||
			{ [ "$major" -eq 2 ] && [ "$minor" -lt 6 ]; } ||
			{ [ "$major" -eq 2 ] && [ "$minor" -eq 6 ] && [ "$patch" -lt 8 ]; }; then
			echo "Error: native Windows ARM64 artifact unavailable for Deno ${deno_version} (arm64 builds start at v2.6.8)." 1>&2
			exit 1
		fi
		;;
	esac
fi

# Stable releases come from GitHub, matching `deno upgrade`. The
# dl.deno.land/release/<version>/ path also serves the LTS channel, so
# lts-marked binaries can overwrite it for the current stable version; GitHub is
# the canonical stable source. Prereleases (rc) are only published to
# dl.deno.land, so keep fetching those from there.
case "$deno_version" in
*-*) deno_uri="https://dl.deno.land/release/${deno_version}/deno-${target}.zip" ;;
*) deno_uri="https://github.com/denoland/deno/releases/download/${deno_version}/deno-${target}.zip" ;;
esac
deno_install="${DENO_INSTALL:-$HOME/.deno}"
bin_dir="$deno_install/bin"
exe="$bin_dir/deno"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"
if command -v unzip >/dev/null; then
	unzip -d "$bin_dir" -o "$exe.zip"
else
	7z x -o"$bin_dir" -y "$exe.zip"
fi
chmod +x "$exe"
rm "$exe.zip"
if $exe eval 'const [major, minor] = Deno.version.deno.split(".").map(Number); if (major < 2 || (major === 2 && minor < 6)) Deno.exit(1)'; then
	"$exe" x --install-alias
	# shellcheck disable=SC2016
	echo 'Installed dx alias, if this conflicts with an existing command, you can remove it with `rm $(which dx)` and choose a new name with `dx --install-alias <new-name>`'
fi
echo "Deno was installed successfully to $exe"

run_shell_setup() {
	$exe run -A --reload jsr:@deno/installer-shell-setup/bundled "$deno_install" "$@"
}

# If stdout is a terminal, see if we can run shell setup script (which includes interactive prompts)
if { [ -z "$CI" ] && [ -t 1 ]; } || $should_run_shell_setup; then
	if $exe eval 'const [major, minor] = Deno.version.deno.split(".").map(Number); if (major < 1 || (major === 1 && minor < 42)) Deno.exit(1)'; then
		if $should_run_shell_setup; then
			run_shell_setup -y "$@" # doublely sure to pass -y to run_shell_setup in this case
		else
			if [ -t 0 ]; then
				run_shell_setup "$@"
			else
				# This script is probably running piped into sh, so we don't have direct access to stdin.
				# Instead, explicitly connect /dev/tty to stdin
				run_shell_setup "$@" </dev/tty
			fi
		fi
	fi
fi
if command -v deno >/dev/null; then
	echo "Run 'deno --help' to get started"
else
	echo "Run '$exe --help' to get started"
fi
echo
echo "Stuck? Join our Discord https://discord.gg/deno"
