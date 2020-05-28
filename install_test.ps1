#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if (!(Get-PSRepository)) {
  Register-PSRepository -Default
}

if (!(Get-Module PSScriptAnalyzer -ListAvailable)) {
  Install-Module PSScriptAnalyzer -Scope CurrentUser -Force
}

# Lint.
Invoke-ScriptAnalyzer *.ps1 -EnableExit

# Test that we can install the latest version at the default location.
Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
.\install.ps1
~\.deno\bin\deno.exe --version

# Test that we can install a specific version at a custom location.
Remove-Item "~\deno-0.38.0" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-0.38.0"
.\install.ps1 v0.38.0
$DenoVersion = ~\deno-0.38.0\bin\deno.exe --version
if (!($DenoVersion -like '*0.38.0*')) {
  throw $DenoVersion
}
