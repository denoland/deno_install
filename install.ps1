#!/usr/bin/env pwsh
# Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

$ErrorActionPreference = 'Stop'

if ($Args.Length -eq 1) {
  $Version = $Args[0]
} elseif ($v) {
  $Version = "v${v}"
}

$DenoInstall = $env:DENO_INSTALL
$BinDir = if ($DenoInstall) {
  "${DenoInstall}\bin"
} elseif (Test-Path variable:\denoGlobalInstall) {
  "${Env:ProgramFiles}\deno\bin"
} else {
  "${Home}\.deno\bin"
}

$DenoZip = "$BinDir\deno.zip"
$DenoExe = "$BinDir\deno.exe"
$Target = 'x86_64-pc-windows-msvc'

$Version = if (!$Version) {
  curl.exe -s "https://dl.deno.land/release-latest.txt"  
} else {
  $Version
}

$DownloadUrl = "https://dl.deno.land/release/${Version}/deno-${Target}.zip"

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

curl.exe -Lo $DenoZip $DownloadUrl

tar.exe xf $DenoZip -C $BinDir

Remove-Item $DenoZip

$EnvTarget = if (Test-Path variable:\denoGlobalInstall) {
  [System.EnvironmentVariableTarget]::Machine
} else {
  [System.EnvironmentVariableTarget]::User
}

$Path = [System.Environment]::GetEnvironmentVariable('Path', $EnvTarget)
if (!(";${Path};".ToLower() -like "*;${BinDir};*".ToLower())) {
  [System.Environment]::SetEnvironmentVariable('Path', "${Path};${BinDir}", $EnvTarget)
  $Env:Path += ";${BinDir}"
}

Write-Output "Deno was installed successfully to ${DenoExe}"
Write-Output "Run 'deno --help' to get started"
Write-Output "Stuck? Join our Discord https://discord.gg/deno"
