#!/bin/bash
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

deno_dir="$HOME/.deno/bin"
deno_zip="${deno_dir}/deno.gz"
deno_bin="${deno_dir}/deno"

red="\033[31m"
green="\033[32m"
yellow="\033[33m"
reset="\033[0m"

if [ $# -eq 0 ]; then
  # TODO: We could check the GitHub API for the latest release here.
  # However, we need to parse the JSON response body. Perhaps
  # this could be done with an existing installation of deno, jq,
  # or node. And otherwise we ned to fall back to asking the user:
  read -p "Which version do you want to install? " version
else
  version=$1
fi

if [ ! -d $deno_dir ]; then
  echo -e "Creating directory ${yellow}${deno_dir}${reset}."
  mkdir -p $deno_dir
fi

function download {
  download_uri="https://github.com/denoland/deno/releases/download/${version}/deno_${1}_x64.gz"
  echo -e "Downloading ${yellow}${download_uri}${reset}."
  curl -fL# -o $deno_zip $download_uri
}

os=$(uname -s)
case $os in
  Linux) download linux;;
  Darwin) download osx;;
  *)
    echo -e "${red}Error:${reset} Installing deno on ${yellow}${os}${reset} is not supported."
    exit 1
esac

echo -e "Unzipping ${yellow}${deno_zip}${reset}."
gunzip -df $deno_zip

echo -e "Making ${yellow}${deno_bin}${reset} executable."
chmod +x $deno_bin

echo ""
echo -e "${green}Deno was installed successfully.${reset}"
if [[ ! $PATH == *$deno_dir* ]]; then
  echo -e "Add ${yellow}${deno_dir}${reset} to the ${yellow}PATH${reset}"
  echo -e "and run ${yellow}deno --help${reset} to get started."
else
  echo -e "Run ${yellow}deno --help${reset} to get started."
fi
echo ""