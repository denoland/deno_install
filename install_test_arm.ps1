#!/usr/bin/env pwsh

# Native Windows ARM64 install tests. Runs on a `windows-11-arm` runner.
# Legacy v1.x versions are intentionally NOT tested here: they have no ARM64
# artifacts and are covered by the x64 `install_test.ps1`.

$ErrorActionPreference = 'Stop'

function Assert-NativeTarget([string]$DenoExe) {
  $target = & $DenoExe eval 'console.log(Deno.build.target)'
  if ($target -ne 'aarch64-pc-windows-msvc') {
    throw "expected Deno.build.target 'aarch64-pc-windows-msvc', got '$target'"
  }
  Write-Output "OK: $DenoExe reports $target"
}

# 1. Native ARM64 PowerShell installs native Deno (latest).
Remove-Item "~\.deno" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = ""
$v = $null; .\install.ps1
Assert-NativeTarget "$Home\.deno\bin\deno.exe"

# 2. A specific version that has ARM64 artifacts installs native Deno.
Remove-Item "~\deno-arm64" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-arm64"
$v = "2.6.8"; .\install.ps1
Assert-NativeTarget "$Home\deno-arm64\bin\deno.exe"

# 3. Requesting a version with no ARM64 artifact (< v2.6.8) must fail loudly
#    rather than silently installing the x64 build under emulation.
Remove-Item "~\deno-arm64-old" -Recurse -Force -ErrorAction SilentlyContinue
$env:DENO_INSTALL = "$Home\deno-arm64-old"
$rejected = $false
try {
  $global:LASTEXITCODE = 0
  $v = "2.6.7"; .\install.ps1
  # A terminating error is caught below; a plain non-zero `exit` is caught here.
  if ($LASTEXITCODE -ne 0) {
    $rejected = $true
  }
} catch {
  $rejected = $true
}
if (-not $rejected) {
  throw "expected install of Deno v2.6.7 to fail on ARM64 (no native artifact)"
}
Write-Output "OK: v2.6.7 correctly rejected on ARM64"

# 4. Emulated x86 PowerShell (SysWOW64) must still install native ARM64 Deno.
#    This exercises the IsWow64Process2 native-arch detection path. Skipped if
#    the emulated host isn't present on the runner image.
$Wow64Ps = "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
if (Test-Path $Wow64Ps) {
  Remove-Item "~\deno-emulated" -Recurse -Force -ErrorAction SilentlyContinue
  $env:DENO_INSTALL = "$Home\deno-emulated"
  & $Wow64Ps -NoProfile -ExecutionPolicy Bypass -Command "`$v = `$null; .\install.ps1"
  if ($LASTEXITCODE -ne 0) {
    throw "emulated x86 install.ps1 failed with exit code $LASTEXITCODE"
  }
  Assert-NativeTarget "$Home\deno-emulated\bin\deno.exe"
} else {
  Write-Warning "SysWOW64 PowerShell not found; skipping emulated-process test"
}
