#!/usr/bin/env pwsh
# Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "v${v}"
}
if ($Args.Length -eq 1) {
  $Version = $Args.Get(0)
}

$DenoInstall = $env:DENO_INSTALL
$BinDir = if ($DenoInstall) {
  "${DenoInstall}\bin"
} else {
  "${Home}\.deno\bin"
}

$DenoZip = "$BinDir\deno.zip"
$DenoExe = "$BinDir\deno.exe"

# Resolve the *native* OS architecture rather than the architecture of the
# running PowerShell process. On Windows ARM64, x64 PowerShell (including
# Windows PowerShell 5.1 on .NET Framework) can run under emulation and would
# otherwise report x64. IsWow64Process2's native-machine result is the robust
# source of truth; RuntimeInformation.OSArchitecture is a guarded fallback for
# hosts where the P/Invoke is unavailable.
function Get-DenoTarget {
  $IMAGE_FILE_MACHINE_ARM64 = 0xAA64
  $IMAGE_FILE_MACHINE_AMD64 = 0x8664

  try {
    if (-not ('DenoInstall.NativeArch' -as [type])) {
      Add-Type -Namespace 'DenoInstall' -Name 'NativeArch' -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError = true)]
public static extern bool IsWow64Process2(System.IntPtr hProcess, out ushort pProcessMachine, out ushort pNativeMachine);
'@
    }
    $processMachine = [uint16]0
    $nativeMachine = [uint16]0
    $handle = [System.Diagnostics.Process]::GetCurrentProcess().Handle
    if ([DenoInstall.NativeArch]::IsWow64Process2($handle, [ref]$processMachine, [ref]$nativeMachine)) {
      if ($nativeMachine -eq $IMAGE_FILE_MACHINE_ARM64) {
        return 'aarch64-pc-windows-msvc'
      }
      if ($nativeMachine -eq $IMAGE_FILE_MACHINE_AMD64) {
        return 'x86_64-pc-windows-msvc'
      }
    }
  } catch {
    # P/Invoke unavailable (e.g. pre-1709 Windows); fall back below.
  }

  try {
    $arm64 = [System.Runtime.InteropServices.Architecture]::Arm64
    if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq $arm64) {
      return 'aarch64-pc-windows-msvc'
    }
  } catch {
    # Ignore and default to x64 below.
  }

  return 'x86_64-pc-windows-msvc'
}

$Target = Get-DenoTarget

$Version = if (!$Version) {
  curl.exe --ssl-revoke-best-effort -s "https://dl.deno.land/release-latest.txt"
} else {
  $Version
}

# Native Windows ARM64 artifacts are published starting with Deno v2.6.8.
# Returns $false only for a parseable release older than that.
function Test-Arm64ArtifactAvailable([string]$version) {
  $v = "$version".TrimStart('v')
  $v = ($v -split '[-+]')[0]
  $parts = $v -split '\.'
  if ($parts.Length -lt 3) {
    return $true # canary hash or unknown format; assume a current build
  }
  try {
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
  } catch {
    return $true
  }
  if ($major -ne 2) {
    return ($major -gt 2)
  }
  if ($minor -ne 6) {
    return ($minor -gt 6)
  }
  return ($patch -ge 8)
}

if (($Target -eq 'aarch64-pc-windows-msvc') -and -not (Test-Arm64ArtifactAvailable $Version)) {
  Write-Error "Native Windows ARM64 artifact unavailable for Deno ${Version}: arm64 builds start at v2.6.8. Refusing to install the x64 build under emulation; request v2.6.8 or newer."
  exit 1
}

# Stable releases come from GitHub, matching `deno upgrade`. The
# dl.deno.land/release/<version>/ path also serves the LTS channel, so
# lts-marked binaries can overwrite it for the current stable version; GitHub is
# the canonical stable source. Prereleases (rc) are only published to
# dl.deno.land, so keep fetching those from there.
$DownloadUrl = if ($Version -like "*-*") {
  "https://dl.deno.land/release/${Version}/deno-${Target}.zip"
} else {
  "https://github.com/denoland/deno/releases/download/${Version}/deno-${Target}.zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

curl.exe --fail --ssl-revoke-best-effort -Lo $DenoZip $DownloadUrl
if ($LASTEXITCODE -ne 0) {
  Remove-Item $DenoZip -Force -ErrorAction SilentlyContinue
  Write-Error "Failed to download Deno from ${DownloadUrl}."
  exit 1
}

# Verify the archive against its published checksum before extracting.
# Checksums are published from Deno v2.6.7 onward; older releases have none, so
# on x64 we verify when a checksum is present and skip otherwise. On ARM64 a
# checksum is always expected (arm64 starts at v2.6.8), so absence is fatal.
$ChecksumUrl = "${DownloadUrl}.sha256sum"
$ChecksumFile = "$DenoZip.sha256sum"
curl.exe --fail --ssl-revoke-best-effort -Lo $ChecksumFile $ChecksumUrl
if ($LASTEXITCODE -eq 0) {
  # Accept both canonical "<hash>  <file>" and legacy PowerShell
  # `Get-FileHash | Format-List` checksum files: the hash is the only
  # 64-character hex token in either layout.
  $Match = Select-String -Path $ChecksumFile -Pattern '[0-9a-fA-F]{64}' | Select-Object -First 1
  Remove-Item $ChecksumFile -Force -ErrorAction SilentlyContinue
  if (!$Match) {
    Remove-Item $DenoZip -Force -ErrorAction SilentlyContinue
    Write-Error "Could not parse checksum from ${ChecksumUrl}."
    exit 1
  }
  $Expected = $Match.Matches[0].Value.ToLower()
  $Actual = (Get-FileHash $DenoZip -Algorithm SHA256).Hash.ToLower()
  if ($Expected -ne $Actual) {
    Remove-Item $DenoZip -Force -ErrorAction SilentlyContinue
    Write-Error "Checksum mismatch for ${DownloadUrl}: expected ${Expected}, got ${Actual}."
    exit 1
  }
} else {
  Remove-Item $ChecksumFile -Force -ErrorAction SilentlyContinue
  if ($Target -eq 'aarch64-pc-windows-msvc') {
    Remove-Item $DenoZip -Force -ErrorAction SilentlyContinue
    Write-Error "Failed to download checksum from ${ChecksumUrl}."
    exit 1
  }
  Write-Warning "No published checksum for ${DownloadUrl}; skipping verification."
}

tar.exe xf $DenoZip -C $BinDir

Remove-Item $DenoZip

$User = [System.EnvironmentVariableTarget]::User
$Path = [System.Environment]::GetEnvironmentVariable('Path', $User)
if (!(";${Path};".ToLower() -like "*;${BinDir};*".ToLower())) {
  [System.Environment]::SetEnvironmentVariable('Path', "${Path};${BinDir}", $User)
  $Env:Path += ";${BinDir}"
}

$versionCheck = "const [major, minor] = Deno.version.deno.split('.').map(Number); if (major < 2 || (major === 2 && minor < 6)) Deno.exit(1);"
& $DenoExe eval $versionCheck
if ($LASTEXITCODE -eq 0) {
  & $DenoExe x --install-alias
  Write-Output 'Installed dx alias, if this conflicts with an existing command, you can remove it with `Remove-Item $(Get-Command dx).Path` and choose a new name with `dx --install-alias <new-name>`'
}

Write-Output "Deno was installed successfully to ${DenoExe}"
Write-Output "Run 'deno --help' to get started"
Write-Output "Stuck? Join our Discord https://discord.gg/deno"
