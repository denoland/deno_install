#!/usr/bin/env pwsh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

$ErrorActionPreference = 'Stop'

if ($args.Length -gt 0) {
  $Version = $args.Get(0)
}

if ($PSVersionTable.PSVersion.Major -lt 6) {
  $IsWindows = $true
  $IsMacOS = $false
}

$BinDir = if ($IsWindows) {
  "$Home\.deno\bin"
} else {
  "$Home/.deno/bin"
}

$Zip = if ($IsWindows) {
  'zip'
} else {
  'gz'
}

$DenoZip = if ($IsWindows) {
  "$BinDir\deno.$Zip"
} else {
  "$BinDir/deno.$Zip"
}

$DenoExe = if ($IsWindows) {
  "$BinDir\deno.exe"
} else {
  "$BinDir/deno"
}

$OS = if ($IsWindows) {
  'win'
} else {
  if ($IsMacOS) {
    'osx'
  } else {
    'linux'
  }
}

if (!$Version) {
  if ($PSVersionTable.PSVersion.Major -lt 6) {
    $Response = Invoke-WebRequest 'https://github.com/denoland/deno/releases'
    $HTMLFile = New-Object -Com HTMLFile
    $HTMLFile.write([System.Text.Encoding]::Unicode.GetBytes($Response.Content))
    $DenoUri = $HTMLFile.getElementsByTagName('a') |
      Where-Object { $_.href -like "about:/denoland/deno/releases/download/*/deno_${OS}_x64.$Zip" } |
      ForEach-Object { $_.href -replace 'about:', 'https://github.com' } |
      Select-Object -First 1
  } else {
    $DenoUri = (Invoke-WebRequest 'https://github.com/denoland/deno/releases').Links |
      Where-Object { $_.href -like "/denoland/deno/releases/download/*/deno_${OS}_x64.$Zip" } |
      ForEach-Object { 'https://github.com' + $_.href } |
      Select-Object -First 1
  }
} else {
  $DenoUri = "https://github.com/denoland/deno/releases/download/$Version/deno_${OS}_x64.$Zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

Invoke-WebRequest $DenoUri -Out $DenoZip

if ($IsWindows) {
  Expand-Archive $DenoZip -Destination $BinDir -Force
  Remove-Item $DenoZip
} else {
  gunzip -df $DenoZip
}

if ($IsWindows) {
  $User = [EnvironmentVariableTarget]::User
  $Path = [Environment]::GetEnvironmentVariable('Path', $User)
  if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
    [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User)
    $Env:Path += ";$BinDir"
  }
  Write-Output "Deno was installed successfully to $DenoExe"
  Write-Output "Run 'deno --help' to get started"
} else {
  chmod +x "$BinDir/deno"
  Write-Output "Deno was installed successfully to $DenoExe"
  if (Get-Command deno -ErrorAction SilentlyContinue) {
    Write-Output "Run 'deno --help' to get started"
  } else {
    Write-Output "Manually add the directory to your `$HOME/.bash_profile (or similar)"
    Write-Output "  export PATH=`"${BinDir}:`$PATH`""
    Write-Output "Run '~/.deno/bin/deno --help' to get started"
  }
}
