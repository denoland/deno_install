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

$BinDir = if ($IsWindows) {
  "$Home\.deno\bin"
} else {
  "$Home/.deno/bin"
}

# Test we can install a specific version.
Remove-Item $BinDir -Recurse -Force -ErrorAction SilentlyContinue
.\install.ps1 v0.2.0
$DenoVersion = if ($IsWindows) {
  deno --version
} else {
  ~/.deno/bin/deno --version
}
if (!($DenoVersion -like '*0.2.0*')) {
  throw $DenoVersion
}

# Test we can install the latest version.
Remove-Item $BinDir -Recurse -Force -ErrorAction SilentlyContinue
.\install.ps1
if ($IsWindows) {
  deno --version
} else {
  ~/.deno/bin/deno --version
}
