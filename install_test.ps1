#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSEdition -ne 'Core') {
  $IsWindows = $true
}

if (!(Get-PSRepository)) {
  Register-PSRepository -Default
}

if (!(Get-Module PSScriptAnalyzer -ListAvailable)) {
  Install-Module PSScriptAnalyzer -Scope CurrentUser -Force
}

# Lint.
Invoke-ScriptAnalyzer *.ps1 -EnableExit -Exclude PSAvoidAssignmentToAutomaticVariable

# Test that we can install the latest version at the default location.
if ($IsWindows) {
  Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
} else {
  Remove-Item "~/.local/bin/deno" -Force -ErrorAction SilentlyContinue
}
$env:DENO_INSTALL = ""
.\install.ps1
if ($IsWindows) {
  ~\.deno\bin\deno.exe --version
} else {
  ~/.local/bin/deno --version
}

# Test that we can install a specific version at a custom location.
if ($IsWindows) {
  Remove-Item "~\deno-0.13.0" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = "$Home\deno-0.13.0"
} else {
  Remove-Item "~/deno-0.13.0" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = "$Home/deno-0.13.0"
}
.\install.ps1 v0.13.0
$DenoVersion = if ($IsWindows) {
  ~\deno-0.13.0\bin\deno.exe --version
} else {
  ~/deno-0.13.0/bin/deno --version
}
if (!($DenoVersion -like '*0.13.0*')) {
  throw $DenoVersion
}
