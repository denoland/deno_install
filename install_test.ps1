#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSEdition -ne 'Core') {
  $IsWindows = $true
}

$BinDir = if ($IsWindows) {
  "$Home\.deno\bin"
} else {
  "$Home/.deno/bin"
}

# Test we can install a specific version.
Remove-Item $BinDir -Recurse -Force -ErrorAction SilentlyContinue
.\install.ps1 v0.3.10
$DenoVersion = if ($IsWindows) {
  deno version
} else {
  ~/.deno/bin/deno version
}
if (!($DenoVersion -like '*0.3.10*')) {
  throw $DenoVersion
}

# Test we can install the latest version.
Remove-Item $BinDir -Recurse -Force -ErrorAction SilentlyContinue
.\install.ps1
if ($IsWindows) {
  deno version
} else {
  ~/.deno/bin/deno version
}
