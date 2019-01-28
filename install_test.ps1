#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 6) {
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
Remove-Item $BinDir -Recurse -Force
.\install.ps1 v0.2.0
$DenoVersion = if ($IsWindows) {
  deno --version
} else {
  ~/.deno/bin/deno --version
}
if (!($DenoVersion[0] -eq 'deno: 0.2.0')) {
  throw $DenoVersion
} else {
  Write-Output $DenoVersion
}

# Test we can install the latest version.
Remove-Item $BinDir -Recurse -Force
.\install.ps1
$DenoVersion = if ($IsWindows) {
  deno --version
} else {
  ~/.deno/bin/deno --version
}
if (!($DenoVersion[0] -match 'deno: \d+\.\d+\.\d+')) {
  throw $DenoVersion
} else {
  Write-Output $DenoVersion
}
