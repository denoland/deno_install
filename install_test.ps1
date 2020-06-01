#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

# Test that we can install the latest version at the default location.
Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
$v = $null; .\install.ps1
~\.deno\bin\deno.exe --version

# Test that we can install a specific version at a custom location.
Remove-Item "~\deno-1.0.0" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-1.0.0"
$v = "1.0.0"; .\install.ps1
$DenoVersion = ~\deno-1.0.0\bin\deno.exe --version
if (!($DenoVersion -like '*1.0.0*')) {
  throw $DenoVersion
}

# Test that the old temp file installer still works.
Remove-Item "~\deno-1.0.1" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-1.0.1"
$v = $null; .\install.ps1 v1.0.1
$DenoVersion = ~\deno-1.0.1\bin\deno.exe --version
if (!($DenoVersion -like '*1.0.1*')) {
  throw $DenoVersion
}
