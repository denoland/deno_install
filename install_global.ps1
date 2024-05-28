$ErrorActionPreference = "Stop"

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
  "${Env:ProgramFiles}\deno\bin"
}

$DenoZip = "$BinDir\deno.zip"
$DenoExe = "$BinDir\deno.exe"
$Target = "x86_64-pc-windows-msvc"

$DownloadUrl = if (!$Version) {
  "https://github.com/denoland/deno/releases/latest/download/deno-${Target}.zip"
} else {
  "https://github.com/denoland/deno/releases/download/${Version}/deno-${Target}.zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

curl.exe -Lo $DenoZip $DownloadUrl

tar.exe xf $DenoZip -C $BinDir

Remove-Item $DenoZip

$Machine = [System.EnvironmentVariableTarget]::Machine
$Path = [System.Environment]::GetEnvironmentVariable("Path", $Machine)
if (!(";${Path};".ToLower() -like "*;${BinDir};*".ToLower())) {
  [System.Environment]::SetEnvironmentVariable("Path", "${Path};${BinDir}", $Machine)
  $Env:Path += ";${BinDir}"
}

Write-Output "Deno was installed successfully to ${DenoExe}"
Write-Output "Run "deno --help" to get started"
Write-Output "Stuck? Join our Discord https://discord.gg/deno"
