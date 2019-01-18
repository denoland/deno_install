#!/bin/bash

set -ev

PATH=$HOME/bin/:$PATH

# Install shfmt.
shfmt_version=v2.6.2
case $(uname -s) in
Darwin) shfmt_os="darwin" ;;
*) shfmt_os="linux" ;;
esac
shfmt_url="https://github.com/mvdan/sh/releases/download/${shfmt_version}/shfmt_${shfmt_version}_${shfmt_os}_amd64"
curl -sSL -o "$HOME/bin/shfmt" "$shfmt_url"
chmod +x "$HOME/bin/shfmt"

# Print versions.
$SHELL --version
curl --version
shellcheck --version
shfmt --version

# Check formatting.
shfmt -d .

# Lint code.
shellcheck -s sh ./*.sh
shellcheck -s bash ./*.sh
shellcheck -s dash ./*.sh
shellcheck -s ksh ./*.sh

test_specific_version() {
	rm -rf ~/.deno
	$1 install.sh v0.2.0
	~/.deno/bin/deno -v | grep -e 0.2.0
}

test_latest_version() {
	rm -rf ~/.deno
	$1 install.sh
	~/.deno/bin/deno -v
}

case $(uname -s) in
Darwin) shells=(sh bash ksh zsh) ;;
*) shells=(sh bash dash ksh zsh) ;;
esac

for shell in $"${shells[@]}"; do
	test_specific_version $shell
	test_latest_version $shell
done
