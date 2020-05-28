#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if (!(Get-PSRepository)) {
  Register-PSRepository -Default
}

if (!(Get-Module PSScriptAnalyzer -ListAvailable)) {
  Install-Module PSScriptAnalyzer -Scope CurrentUser -Force
}

# Lint.

# "$v -ne $null" is a correct comparison with $null since $v is not an array.
Invoke-ScriptAnalyzer install.ps1 -EnableExit -Exclude PSPossibleIncorrectComparisonWithNull

# The linter doesn't know that $v is used in .\install.ps1 so it wrongly concludes that it is assigned but never used.
Invoke-ScriptAnalyzer install_test.ps1 -EnableExit -Exclude PSUseDeclaredVarsMoreThanAssignment

# Test that we can install the latest version at the default location.
Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
.\install.ps1
~\.deno\bin\deno.exe --version

# Test that we can install a specific version at a custom location.
Remove-Item "~\deno-0.38.0" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-0.38.0"

$v="v0.38.0"; .\install.ps1
Set-PSDebug -Trace 1
~\deno-0.38.0\bin\deno.exe --version
$DenoVersion = ~\deno-0.38.0\bin\deno.exe --version
Write-Host $LASTEXITCODE
Write-Host $DenoVersion
if (!($DenoVersion -like '*0.38.0*')) { throw $DenoVersion }
Write-Host $LASTEXITCODE
