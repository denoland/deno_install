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

if ($Env:CI) {
  if ($Env:TRAVIS) {
    Write-Output "TRAVIS_PULL_REQUEST=$($TRAVIS_PULL_REQUEST)"
    Write-Output "TRAVIS_PULL_REQUEST_SLUG=$($TRAVIS_PULL_REQUEST_SLUG)"
    Write-Output "TRAVIS_PULL_REQUEST_BRANCH=$($TRAVIS_PULL_REQUEST_BRANCH)"
    if ($Env:TRAVIS_PULL_REQUEST -ne 'false') {
      iex (iwr "https://raw.githubusercontent.com/$($Env:TRAVIS_PULL_REQUEST_SLUG)/$($Env:TRAVIS_PULL_REQUEST_BRANCH)/install.ps1")
    } else {
      iex (iwr https://deno.land/x/install/install.ps1)
    }
  }
  if ($Env:APPVEYOR) {
    Write-Output "APPVEYOR_PULL_REQUEST_NUMBER=$($APPVEYOR_PULL_REQUEST_NUMBER)"
    Write-Output "APPVEYOR_PULL_REQUEST_HEAD_REPO_NAME=$($APPVEYOR_PULL_REQUEST_HEAD_REPO_NAME)"
    Write-Output "APPVEYOR_PULL_REQUEST_HEAD_REPO_BRANCH=$($APPVEYOR_PULL_REQUEST_HEAD_REPO_BRANCH)"
    if (!$($Env:APPVEYOR_PULL_REQUEST_NUMBER)) {
      iex (iwr "https://raw.githubusercontent.com/$($Env:APPVEYOR_PULL_REQUEST_HEAD_REPO_NAME)/$($Env:APPVEYOR_PULL_REQUEST_HEAD_REPO_BRANCH)/install.ps1")
    } else {
      iex (iwr https://deno.land/x/install/install.ps1)
    }
  }
}
