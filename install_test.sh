#!/bin/sh

set -e
chmod +x install.sh

# PATH tests

rm -rf ~/.deno
./install.sh | grep -e "Run '~/.deno/bin/deno --help' to get started."
~/.deno/bin/deno --help

PATH=$PATH:~/.deno/bin
rm -rf ~/.deno
./install.sh | grep -e "Run 'deno --help' to get started."
deno --help

# Version tests

rm -rf ~/.deno
./install.sh v0.2.0
deno -v | grep -e 0.2.0

# End-to-end tests

if [ "$TRAVIS_PULL_REQUEST" = "false" ]; then
  repo=$TRAVIS_REPO_SLUG
  branch=$TRAVIS_BRANCH
else
  repo=$TRAVIS_PULL_REQUEST_SLUG
  branch=$TRAVIS_PULL_REQUEST_BRANCH
fi
e2e_url=https://raw.githubusercontent.com/$repo/$branch/install.sh

rm -rf ~/.deno
curl -sSL "$e2e_url" | $SHELL
deno -v

rm -rf ~/.deno
curl -sSL "$e2e_url" | $SHELL -s v0.2.0
deno -v | grep -e 0.2.0
