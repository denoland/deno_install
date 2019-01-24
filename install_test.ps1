#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

Set-PSDebug -Trace 2

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

if ($Env:CI) {
  if ($Env:TRAVIS) {
    if ($Env:TRAVIS_PULL_REQUEST -ne 'false') {
      iex (iwr https://raw.githubusercontent.com/$($Env:TRAVIS_PULL_REQUEST_SLUG)/$($Env:TRAVIS_PULL_REQUEST_BRANCH)/install.ps1)
    } else {
      iex (iwr https://deno.land/x/install/install.ps1)
    }
  }
  if ($Env:APPVEYOR) {
    if (!$Env:APPVEYOR_PULL_REQUEST_NUMBER) {
      iex (iwr https://raw.githubusercontent.com/$($Env:APPVEYOR_PULL_REQUEST_HEAD_REPO_NAME)/$($Env:APPVEYOR_PULL_REQUEST_HEAD_REPO_BRANCH)/install.ps1)
    } else {
      iex (iwr https://deno.land/x/install/install.ps1)
    }
  }
}
