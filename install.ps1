# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.
param 
( 
    [alias("v")]
    [string]$version
)

$ErrorActionPreference = "Stop"

# Enable TLS 1.2 since it is required for connections to GitHub.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Helper functions for pretty terminal output.
function Write-Part ([string] $Text) {
  Write-Host $Text -NoNewline
}
function Write-Emphasized ([string] $Text) {
  Write-Host $Text -NoNewLine -ForegroundColor "Yellow"
}
function Write-Done {
  Write-Host " done" -NoNewline -ForegroundColor "Green";
  Write-Host "."
}

if (-not $version) {
  # Determine latest Deno release via GitHub API.
  $latest_release_uri = "https://api.github.com/repos/denoland/deno/releases/latest"
  Write-Part "Downloading "; Write-Emphasized $latest_release_uri; Write-Part "..."
  $latest_release_json = Invoke-WebRequest -Uri $latest_release_uri
  Write-Done

  Write-Part "Determining latest Deno release: "
  $version = ($latest_release_json | ConvertFrom-Json).tag_name
  Write-Emphasized $version; Write-Part "... "
  Write-Done
}

# Download Deno release.
$zip_file = "${deno_dir}\deno_win_x64.zip"
$download_uri = "https://github.com/denoland/deno/releases/download/" +
                "${version}/deno_win_x64.zip"
Write-Part "Downloading "; Write-Emphasized $download_uri; Write-Part "..."
Invoke-WebRequest -Uri $download_uri -OutFile $zip_file
Write-Done

# Create ~\.deno\bin directory if it doesn't already exist
$deno_dir = "${Home}\.deno\bin"
if (-not (Test-Path $deno_dir)) {
  Write-Part "Creating directory "; Write-Emphasized $deno_dir; Write-Part "..."
  New-Item -Path $deno_dir -ItemType Directory | Out-Null
  Write-Done
}

# Extract deno.exe from .zip file.
Write-Part "Extracting "; Write-Emphasized $zip_file
Write-Part " into "; Write-Emphasized ${deno_dir}; Write-Part "..."
# Using -Force to overwrite deno.exe if it already exists
Expand-Archive -Path $zip_file -DestinationPath $deno_dir -Force
Write-Done

# Remove .zip file.
Write-Part "Removing "; Write-Emphasized $zip_file; Write-Part "..."
Remove-Item -Path $zip_file
Write-Done

# Get Path environment variable for the current user.
$user = [EnvironmentVariableTarget]::User
$path = [Environment]::GetEnvironmentVariable("PATH", $user)

# Check whether Deno is in the Path.
$paths = $path -split ";"
$is_in_path = $paths -contains $deno_dir -or $paths -contains "${deno_dir}\"

# Add Deno to PATH if it hasn't been added already.
if (-not $is_in_path) {
  Write-Part "Adding "; Write-Emphasized $deno_dir; Write-Part " to the "
  Write-Emphasized "PATH"; Write-Part " environment variable..."
  [Environment]::SetEnvironmentVariable("PATH", "${path};${deno_dir}", $user)
  # Add Deno to the PATH variable of the current terminal session
  # so `deno` can be used immediately without restarting the terminal.
  $env:PATH += ";${deno_dir}"
  Write-Done
}

Write-Host ""
Write-Host "Deno was installed successfully." -ForegroundColor "Green"
Write-Part "Run "; Write-Emphasized "deno --help"; Write-Host " to get started."
Write-Host ""
