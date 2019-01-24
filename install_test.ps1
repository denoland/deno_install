#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if (!(Get-PSRepository)) {
  Register-PSRepository -Default
}

if (!(Get-Module PSScriptAnalyzer -ListAvailable)) {
  Install-Module PSScriptAnalyzer -Scope CurrentUser -Force
}

$Exclude = @(
  'PSAvoidUsingCmdletAliases',
  'PSAvoidAssignmentToAutomaticVariable',
  'PSAvoidUsingInvokeExpression'
)
Invoke-ScriptAnalyzer install_test.ps1 -EnableExit -Exclude $Exclude
Invoke-ScriptAnalyzer install.ps1 -EnableExit -Exclude PSAvoidAssignmentToAutomaticVariable

if ($PSVersionTable.PSVersion.Major -lt 6) {
  $IsWindows = $true
}

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
