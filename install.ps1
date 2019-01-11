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
  { "${Home}\.deno\bin" } else
  { "${Home}/.deno/bin" }

$Zip = if ($IsWindows)
  { 'zip' } else
  { 'gz' }

$DenoZip = if ($IsWindows)
  { "${DenoDir}\deno.${Zip}" } else
  { "${DenoDir}/deno.${Zip}" }

$OS = if ($IsWindows)
  { 'win' } else { if ($IsMacOS)
  { 'osx' } else
  { 'linux' } }

$DenoUri = "https://github.com/denoland/deno/releases/download/${Version}/deno_${OS}_x64.${Zip}"

if (!(Test-Path $DenoDir)) {
  New-Item $DenoDir -ItemType Directory | Out-Null
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest $DenoUri -Out $DenoZip

if ($IsWindows) {
  Expand-Archive $DenoZip -Destination $DenoDir -Force
  Remove-Item $DenoZip
} else {
  $InputStream = New-Object IO.FileStream $DenoZip, ([IO.FileMode]::Open), ([IO.FileAccess]::Read), ([IO.FileShare]::Read)
  $OutputStream = New-Object IO.FileStream "${DenoDir}/deno", ([IO.FileMode]::Create), ([IO.FileAccess]::Write), ([IO.FileShare]::None)
  $GzipStream = New-Object IO.Compression.GzipStream $InputStream, ([IO.Compression.CompressionMode]::Decompress)

  $Buffer = New-Object Byte[](1024)
  while ($true) {
    $Read = $GzipStream.Read($Buffer, 0, 1024)
    if ($Read -le 0) { break }
    $OutputStream.Write($Buffer, 0, $Read)
  }

  $GzipStream.Close()
  $OutputStream.Close()
  $InputStream.Close()
  Remove-Item $DenoZip
}

if ($IsWindows) {
  $User = [EnvironmentVariableTarget]::User
  $Path = [Environment]::GetEnvironmentVariable('Path', $User)
  $Paths = $Path -split ';' | ForEach-Object { $_.ToLower() }
  if (!(
    $Paths -contains $DenoDir.ToLower() -or
    $Paths -contains "${DenoDir}\".ToLower()
  )) {
    [Environment]::SetEnvironmentVariable('Path', "${Path};${DenoDir}", $User)
    $Env:Path += ";${DenoDir}"
  }
}

if (!$IsWindows) {
  chmod +x "$DenoDir/deno"
}

Write-Host 'Deno was installed successfully.'
if ($IsWindows) {
  Write-Host "Run 'deno --help' to get started."
} else {
  Write-Host "Run '~/.deno/bin/deno --help' to get started."
}
