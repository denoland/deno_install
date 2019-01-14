#!/usr/bin/env pwsh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

param (
  [ValidatePattern('^v(\d+).(\d+).(\d+)$')]
  [String] $Version = 'v0.2.6'
)

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 6) {
  $IsWindows = $true
  $IsMacOS = $false
}

$DenoDir = if ($IsWindows)
  { "$Home\.deno\bin" } else
  { "$Home/.deno/bin" }

$Zip = if ($IsWindows)
  { 'zip' } else
  { 'gz' }

$DenoZip = if ($IsWindows)
  { "$DenoDir\deno.$Zip" } else
  { "$DenoDir/deno.$Zip" }

$OS = if ($IsWindows)
  { 'win' } else { if ($IsMacOS)
  { 'osx' } else
  { 'linux' } }

$DenoUri = "https://github.com/denoland/deno/releases/download/$Version/deno_${OS}_x64.$Zip"

if (!(Test-Path $DenoDir)) {
  New-Item $DenoDir -ItemType Directory | Out-Null
}

Invoke-WebRequest $DenoUri -Out $DenoZip

if ($IsWindows) {
  Expand-Archive $DenoZip -Destination $DenoDir -Force
  Remove-Item $DenoZip
} else {
  gunzip -df $DenoZip
}

if ($IsWindows) {
  $User = [EnvironmentVariableTarget]::User
  $Path = [Environment]::GetEnvironmentVariable('Path', $User)
  if (!(";$Path;".ToLower() -like "*;$DenoDir;*".ToLower())) {
    [Environment]::SetEnvironmentVariable('Path', "$Path;$DenoDir", $User)
    $Env:Path += ";$DenoDir"
  }
  Write-Host 'Deno was installed successfully.'
  Write-Host "Run 'deno --help' to get started."
} else {
  chmod +x "$DenoDir/deno"
  Write-Host 'Deno was installed successfully.'
  if (Get-Command deno -ErrorAction SilentlyContinue) {
    Write-Host "Run 'deno --help' to get started."
  } else {
    Write-Host "Run '~/.deno/bin/deno --help' to get started."
  }
}
