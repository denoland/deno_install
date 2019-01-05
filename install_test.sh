#!/usr/bin/env bash

set -eo pipefail

if [[ $TRAVIS_OS_NAME != "linux" ]]; then
  curl -sL https://deno.land/x/install/install.sh | sh -s v0.2.5
else
  echo "testing ./install.py"
  python ./install.py v0.2.5
  python ./install_test.py v0.2.5
fi

echo "testing ./install.ts"
$HOME/.deno/bin/deno --allow-write --allow-net --allow-env --allow-run ./install.ts v0.2.6

echo "testing deno (version)"
$HOME/.deno/bin/deno -v | grep 0.2.6
