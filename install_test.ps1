#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

# Test that we can install the latest version at the default location.
Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
$v = $null; .\install.ps1
~\.deno\bin\deno.exe --version

# Test that we can install the latest canary version at the default location.
Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
$h = $null; .\install_canary.ps1
~\.deno\bin\deno.exe --version

# Test that we can install a specific version at a custom location.
Remove-Item "~\deno-1.0.0" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-1.0.0"
$v = "1.0.0"; .\install.ps1
$DenoVersion = ~\deno-1.0.0\bin\deno.exe --version
if (!($DenoVersion -like '*1.0.0*')) {
  throw $DenoVersion
}

# Test that we can install a specific canary version at a custom location.
Remove-Item "~\deno-74c7559d2029539eb6ab7459c06061c00b3e0c1a" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-74c7559d2029539eb6ab7459c06061c00b3e0c1a"
$h = "74c7559d2029539eb6ab7459c06061c00b3e0c1a"; .\install_canary.ps1
$DenoVersion = ~\deno-74c7559d2029539eb6ab7459c06061c00b3e0c1a\bin\deno.exe --version
if (!($DenoVersion -like '*1.12.1*')) {
  throw $DenoVersion
}

# Test that we can install at a relative custom location.
Remove-Item "bin" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "."
$v = "1.1.0"; .\install.ps1
$DenoVersion = bin\deno.exe --version
if (!($DenoVersion -like '*1.1.0*')) {
  throw $DenoVersion
}

# Test that we can install a canary version at a relative custom location.
Remove-Item "bin" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "."
$h = "1ad6575028bd5a13eb0633cc5e7649e18deec556"; .\install_canary.ps1
$DenoVersion = bin\deno.exe --version
if (!($DenoVersion -like '*1.12.0*')) {
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

# Test that the canary old temp file installer still works.
Remove-Item "~\deno-1.10.0" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-1.10.1"
$h = $null; .\install_canary.ps1 57927781ed7eb8bb088d656768dc295716407c7a
$DenoVersion = ~\deno-1.10.1\bin\deno.exe --version
if (!($DenoVersion -like '*1.10.1*')) {
  throw $DenoVersion
}
