#!/usr/bin/env pwsh


$ErrorActionPreference = "Stop"
#Hide the progressbar when testing
$ProgressPreference = "SilentlyContinue"

Write-Host -ForeGroundColor Yellow "---ENV---"
$PSVersionTable
Write-Host -ForeGroundColor Yellow "`n---ENV---`n"

# Test that we can install the latest version at the default location.
# Case 1 : Using no parameter

Write-Host -ForeGroundColor Yellow "Test that we can install the latest version at the default location."
Write-Host -ForeGroundColor Yellow "Case 1 : Using no parameter`n"

Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
.\install.ps1 
~\.deno\bin\deno.exe --version

# Test that we can install the latest version at the default location.
# Case 2 : Using latest as the $Version value

Write-Host -ForeGroundColor Yellow "`nTest that we can install the latest version at the default location."
Write-Host -ForeGroundColor Yellow "Case 2 : Using latest as the `$Version value`n"

Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
.\install.ps1 -Version "latest"
~\.deno\bin\deno.exe --version

# Test that we can install a specific version at a custom location.

Write-Host -ForeGroundColor Yellow "`nTest that we can install a specific version at a custom location.`n"

Remove-Item "$Home\deno-1.0.0" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-1.0.0"
.\install.ps1 -Version "v1.0.0"
$DenoVersion = ~\deno-1.0.0\bin\deno.exe --version
$DenoVersion
if (!($DenoVersion -like "*1.0.0*")) {
  throw $DenoVersion
}

# Test that we can install at a relative custom location.

Write-Host -ForeGroundColor Yellow "`nTest that we can install at a relative custom location.`n"

Remove-Item ".\bin" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "."
.\install.ps1 -Version "v1.1.0"
$DenoVersion = .\bin\deno.exe --version
$DenoVersion
if (!($DenoVersion -like "*1.1.0*")) {
  throw $DenoVersion
}

# Test that the $v method of installing still works

Write-Host -ForeGroundColor Yellow "`nTest that the `$v method of installing still works`n"

Remove-Item ".\bin" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "."
$v = "v1.1.0"; .\install.ps1
$DenoVersion = .\bin\deno.exe --version
$DenoVersion
if (!($DenoVersion -like "*1.1.0*")) {
  throw $DenoVersion
}

# Test that the old temp file installer still works.

Write-Host -ForeGroundColor Yellow "`nTest that the old temp file installer still works.`n"

Remove-Item "~\deno-1.0.1" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-1.0.1"
$v = $null; .\install.ps1 v1.0.1
$DenoVersion = ~\deno-1.0.1\bin\deno.exe --version
$DenoVersion
if (!($DenoVersion -like "*1.0.1*")) {
  throw $DenoVersion
}
