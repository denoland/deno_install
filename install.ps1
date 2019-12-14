#!/usr/bin/env pwsh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

$ErrorActionPreference = 'Stop'

if ($args.Length -gt 0) {
  $Version = $args.Get(0)
}

if ($PSVersionTable.PSEdition -ne 'Core') {
  $IsWindows = $true
  $IsMacOS = $false
}

$DenoInstall = $env:DENO_INSTALL
$BinDir = if ($DenoInstall) {
  if ($IsWindows) {
    "$DenoInstall\bin"
  } else {
    "$DenoInstall/bin"
  }
} elseif ($IsWindows) {
  "$Home\.deno\bin"
} else {
  "$Home/.local/bin"
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

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$DenoUri = if (!$Version) {
  $Response = Invoke-WebRequest 'https://github.com/denoland/deno/releases' -UseBasicParsing
  if ($PSVersionTable.PSEdition -eq 'Core') {
    $Response.Links |
      Where-Object { $_.href -like "/denoland/deno/releases/download/*/deno_${OS}_x64.$Zip" } |
      ForEach-Object { 'https://github.com' + $_.href } |
      Select-Object -First 1
  } else {
    $HTMLFile = New-Object -Com HTMLFile
    if ($HTMLFile.IHTMLDocument2_write) {
      $HTMLFile.IHTMLDocument2_write($Response.Content)
    } else {
      $ResponseBytes = [Text.Encoding]::Unicode.GetBytes($Response.Content)
      $HTMLFile.write($ResponseBytes)
    }
    $HTMLFile.getElementsByTagName('a') |
      Where-Object { $_.href -like "about:/denoland/deno/releases/download/*/deno_${OS}_x64.$Zip" } |
      ForEach-Object { $_.href -replace 'about:', 'https://github.com' } |
      Select-Object -First 1
  }
} else {
  "https://github.com/denoland/deno/releases/download/$Version/deno_${OS}_x64.$Zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

Invoke-WebRequest $DenoUri -OutFile $DenoZip -UseBasicParsing

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
    Write-Output "Run '$DenoExe --help' to get started"
  }
}
