#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

# Test that we can install the latest version at the default location.
Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
.\install.ps1
~\.deno\bin\deno.exe --version

# Test that we can install a specific version at a custom location.
Remove-Item "~\deno-0.38.0" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-0.38.0"

$v="v0.38.0"; .\install.ps1
~\deno-0.38.0\bin\deno.exe --version
$DenoVersion = ~\deno-0.38.0\bin\deno.exe --version
if (!($DenoVersion -like '*0.38.0*')) {
  throw $DenoVersion
}

Set-PSDebug -Trace 1
Write-Host $LASTEXITCODE
exit 0
