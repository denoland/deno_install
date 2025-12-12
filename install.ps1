#!/usr/bin/env pwsh
# Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "v${v}"
}
if ($Args.Length -eq 1) {
  $Version = $Args.Get(0)
}

$DenoInstall = $env:DENO_INSTALL
$BinDir = if ($DenoInstall) {
  "${DenoInstall}\bin"
} else {
  "${Home}\.deno\bin"
}

$DenoZip = "$BinDir\deno.zip"
$DenoExe = "$BinDir\deno.exe"
$Target = 'x86_64-pc-windows-msvc'

$Version = if (!$Version) {
  curl.exe --ssl-revoke-best-effort -s "https://dl.deno.land/release-latest.txt"  
} else {
  $Version
}

$DownloadUrl = "https://dl.deno.land/release/${Version}/deno-${Target}.zip"

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

curl.exe --ssl-revoke-best-effort -Lo $DenoZip $DownloadUrl

tar.exe xf $DenoZip -C $BinDir

Remove-Item $DenoZip

$User = [System.EnvironmentVariableTarget]::User
$Path = [System.Environment]::GetEnvironmentVariable('Path', $User)
if (!(";${Path};".ToLower() -like "*;${BinDir};*".ToLower())) {
  [System.Environment]::SetEnvironmentVariable('Path', "${Path};${BinDir}", $User)
  $Env:Path += ";${BinDir}"
}

$versionCheck = "const [major, minor] = Deno.version.deno.split('.').map(Number); if (major < 2 || (major === 2 && minor < 6)) Deno.exit(1);"
& $DenoExe eval $versionCheck
if ($LASTEXITCODE -eq 0) {
  & $DenoExe x --install-alias
  Write-Output 'Installed dx alias, if this conflicts with an existing command, you can remove it with `Remove-Item $(Get-Command dx).Path` and choose a new name with `dx --install-alias <new-name>`'
}

Write-Output "Deno was installed successfully to ${DenoExe}"
Write-Output "Run 'deno --help' to get started"
Write-Output "Stuck? Join our Discord https://discord.gg/deno"
