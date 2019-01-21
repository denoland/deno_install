#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if (!(Get-PSRepository)) {
  Register-PSRepository -Default
}

if (!(Get-Module PSScriptAnalyzer -ListAvailable)) {
  Install-Module PSScriptAnalyzer -Force
}

Invoke-ScriptAnalyzer *.ps1 -EnableExit

if ($PSVersionTable.PSVersion.Major -lt 6) {
  $IsWin = $true
  $IsMac = $false
} else {
  $IsWin = $IsWindows
  $IsMac = $IsMacOS
}

if (!$IsMac) {
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
}

.\install.ps1 v0.2.0
$DenoVersion = if ($IsWin) {
  deno --version
} else {
  ~/.deno/bin/deno --version
}
if (!($DenoVersion[0] -eq 'deno: 0.2.0')) {
  throw $DenoVersion
}

.\install.ps1
$DenoVersion = if ($IsWin) {
  deno --version
} else {
  ~/.deno/bin/deno --version
}
if (!($DenoVersion[0] -match 'deno: \d+\.\d+\.\d+')) {
  throw $DenoVersion
}
