#!/usr/bin/env pwsh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

param(
  [String]$Version = "latest" # This is the default value for the version parameter
)

$ErrorActionPreference = "Stop"

# Support the legacy $v
if($v) {$Version = $v}


$BinDir = if ($env:DENO_INSTALL) {
  "$env:DENO_INSTALL\bin"
} else {
  "$Home\.deno\bin"
}

$DenoZip = "$BinDir\deno.zip"
$DenoExe = "$BinDir\deno.exe"
$Target = "x86_64-pc-windows-msvc"

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Set Version to v\d.\d.\d if a \d.\d.\d value is entered
$Version = if($Version -match "^(\d{1,}\.){2}\d{1,}$") {"v$Version"} else {$Version}

$DenoUri = if ($Version -eq "latest") {
  "https://github.com/denoland/deno/releases/latest/download/deno-${Target}.zip"
} else {
  "https://github.com/denoland/deno/releases/download/${Version}/deno-${Target}.zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

Invoke-WebRequest $DenoUri -OutFile $DenoZip -UseBasicParsing

if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
  Expand-Archive $DenoZip -Destination $BinDir -Force
} else {
  if (Test-Path $DenoExe) {
    Remove-Item $DenoExe
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($DenoZip, $BinDir)
}

Remove-Item $DenoZip

$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable("Path", $User)
if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
  [Environment]::SetEnvironmentVariable("Path", "$Path;$BinDir", $User)
  $Env:Path += ";$BinDir"
}

Write-Host -ForeGroundColor Green "Deno was installed successfully to $DenoExe"
Write-Host "Run 'deno --help' to get started"
