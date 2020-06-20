#!/usr/bin/env pwsh
param (
    [string]
    $Token
)
$ErrorActionPreference = 'Stop'
$IsWin=switch -Wildcard ($PSVersionTable.PSEdition) {
  "Desktop" { $true }
  "Core" {
    switch -Wildcard ($PSVersionTable.OS) {
      "*Windows*" { $true}
      Default {  $false }
    }
  }
}
if ($IsWin) {
  # Test that we can install the latest version at the default location.
  Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = ""
  .\install.ps1 -Token $Token
  deno --version

  # Test that we can install a specific version at a custom location.
  Remove-Item "~\deno-1.0.0" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = "$Home\deno-1.0.0"
  .\install.ps1 "1.0.0" -Token $Token
  deno --version


  # Test that the old temp file installer still works.
  Remove-Item "~\deno-1.0.1" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = "$Home\deno-1.0.1"
  .\install.ps1 v1.0.1 -Token $Token
  deno --version
}else {
  # Test that we can install the latest version at the default location.
  Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = ""
  sudo pwsh .\install.ps1 -Token $Token
  sudo bash -c "deno --version"

  # Test that we can install a specific version at a custom location.
  Remove-Item "~\deno-1.0.0" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = "$Home/deno-1.0.0"
  sudo pwsh .\install.ps1 "1.0.0" -Token $Token
  sudo bash -c "deno --version"


  # Test that the old temp file installer still works.
  Remove-Item "~\deno-1.0.1" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = "$Home/deno-1.0.1"
  sudo pwsh .\install.ps1 v1.0.1 -Token $Token
  sudo bash -c "deno --version"
}

