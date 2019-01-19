#!/bin/bash

set -ev

# Check formatting.
shfmt -d .

# Lint code.
shellcheck -s sh ./install.sh
shellcheck -s bash ./install_test.sh

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
Darwin) shells=(bash ksh zsh) ;;
*) shells=(dash ksh zsh) ;;
esac

for shell in $"${shells[@]}"; do
	test_specific_version $shell
	test_latest_version $shell
done
