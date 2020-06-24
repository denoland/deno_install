#!/usr/bin/env pwsh
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.
param(
  [string]$Version,
  [string]$Token
)

if (-not [string]::IsNullOrEmpty($Version)) {
  if ($Version[0] -ne "v") {
    $Version = "v$Version";
  }
}
$ErrorActionPreference = 'Stop';

$DenoInstall = $env:DENO_INSTALL;

$Target = switch -Wildcard ($PSVersionTable.PSEdition) {
  "Desktop" { "x86_64-pc-windows-msvc" }
  "Core" {
    switch -Wildcard ($PSVersionTable.OS) {
      "*Windows*" { "x86_64-pc-windows-msvc" }
      "*Linux*" { "x86_64-unknown-linux-gnu" }
      "*Darwin*" { "x86_64-apple-darwin" }
      Default { throw "The system you are using is currently not supported." }
    }
  }
  Default { throw "The system you are using is currently not supported." }
}
$IsWin = switch -Wildcard ($PSVersionTable.PSEdition) {
  "Desktop" { $true }
  "Core" {
    switch -Wildcard ($PSVersionTable.OS) {
      "*Windows*" { $true }
      Default { $false }
    }
  }
}
$BinDir = if (-not [string]::IsNullOrEmpty($DenoInstall)) {
  [System.IO.Path]::Combine($DenoInstall, "bin")
} 
else {
  [System.IO.Path]::Combine($Home, ".deno", "bin")
}

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;

$DenoUri = if ([string]::IsNullOrEmpty($Version)) {
  $response1 = Invoke-WebRequest 'https://api.github.com/repos/denoland/deno/releases/latest' -UseBasicParsing -Headers @{Authorization ="token $Token"};
  $json = $response1.Content | ConvertFrom-Json;
  $release = $json.assets | Where-Object { $_.name -like "*$Target*" } | Select-Object -First 1;
  $release.browser_download_url
}
else {
  "https://github.com/denoland/deno/releases/download/${Version}/deno-${Target}.zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null;
}

$response2 = Invoke-WebRequest $DenoUri -UseBasicParsing;
$zipFileStream = $response2.RawContentStream;
if ($PSVersionTable.PSEdition -eq "Desktop") {
  Add-Type -AssemblyName "System.IO.Compression";
}
$zip = New-Object System.IO.Compression.ZipArchive $zipFileStream;
$zipEntry = $zip.Entries[0];
$fileName = $zipEntry.Name;
$length = $zipEntry.Length;
$data = [System.Array]::CreateInstance([byte], $length);
$zipEntry.Open().Read($data, 0, $length) | Out-Null;
$zip.Dispose();
$zipFileStream.Dispose();
[System.IO.File]::WriteAllBytes([System.IO.Path]::Combine($BinDir, $fileName), $data);


$Path = [Environment]::GetEnvironmentVariable("Path");
if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
  if ($IsWin) {
    [Environment]::SetEnvironmentVariable("Path", "$Path;$BinDir", [System.EnvironmentVariableTarget]::Machine);
    $Env:Path += ";$BinDir"
    Write-Output "Added $BinDir to Path.";
  }else {
    if ($IsLinux) {
      New-Item -ItemType SymbolicLink -Path "/usr/bin/deno" -Target "$BinDir/deno" -Force|Out-Null;
      sudo chmod 777 /usr/bin/deno;
      Write-Output "Created a SymbolicLink to $BinDir/deno at /usr/bin/deno.";
    }else {
      sudo ln -s -f $BinDir/deno /usr/local/bin/deno;
      sudo chmod 777 /usr/local/bin/deno;
      Write-Output "Created a SymbolicLink to $BinDir/deno at /usr/local/bin/deno.";
    }
  }
}

Write-Output "Deno was installed successfully";
Write-Output "Run 'deno --help' to get started.";
