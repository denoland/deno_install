
# Enable TLS 1.2 since it is required for connections to GitHub
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Determine latest Deno release via GitHub API
$LatestRelease = Invoke-WebRequest `
  -Uri "https://api.github.com/repos/denoland/deno/releases/latest" `
    | ConvertFrom-Json `
    | Select-Object -ExpandProperty "tag_name"

# Create ~\.deno\bin directory if it doesn't already exist
$DenoBin = "${Home}\.deno\bin"
if (!(Test-Path $DenoBin)) {
  New-Item -Path $DenoBin -ItemType "Directory" > $null
}

# Download latest Deno release .zip file
$DenoZip = "${DenoBin}\deno_win_x64.zip"
Invoke-WebRequest `
  -Uri "https://github.com/denoland/deno/releases/download/${LatestRelease}/deno_win_x64.zip" `
  -OutFile $DenoZip

# Extract .zip file
Expand-Archive `
  -Path $DenoZip `
  -DestinationPath $DenoBin `
  -Force # Using -Force to overwrite deno.exe if it already exists

# Remove .zip file
Remove-Item -Path $DenoZip

# Get Path environment variable for the current user
$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable("Path", $User)

# Add Deno to the Path if it hasn't been added already
if (!$Path.Contains("${DenoBin};") -And !$Path.EndsWith($DenoBin)) {
  [Environment]::SetEnvironmentVariable("Path", "${Path};${DenoBin}", $User)
}
