#!/usr/bin/env pwsh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "v${v}"
}
if ($args.Length -eq 1) {
  $Version = $args.Get(0)
}

$DenoInstall = $env:DENO_INSTALL
$BinDir = if ($DenoInstall) {
  "$DenoInstall\bin"
} else {
  "$Home\.deno\bin"
}

$DenoZip = "$BinDir\deno.zip"
$DenoExe = "$BinDir\deno.exe"
$Target = 'x86_64-pc-windows-msvc'

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$DenoUri = if (!$Version) {
  "https://github.com/denoland/deno/releases/latest/download/deno-${Target}.zip"
} else {
  "https://github.com/denoland/deno/releases/download/${Version}/deno-${Target}.zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

curl.exe -Lo $DenoZip $DenoUri

tar.exe xf $DenoZip -C $BinDir

Remove-Item $DenoZip

$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)
if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
  [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User)
  $Env:Path += ";$BinDir"
}

Write-Output "Deno was installed successfully to $DenoExe"
Write-Output "Run 'deno --help' to get started"
