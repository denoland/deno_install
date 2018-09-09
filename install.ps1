$ErrorActionPreference = Stop

# Enable TLS 1.2 since it is required for connections to GitHub
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Helper functions for pretty terminal output
function Write-Part ([string] $Part) { Write-Host -Object $Part -NoNewline }
function Write-Emphasized ([string] $Emphasis) { Write-Host -Object $Emphasis -NoNewLine -ForegroundColor Yellow }
function Write-Done { Write-Host -Object 'done' -NoNewline -ForegroundColor Green; Write-Host '.' }

# Determine latest Deno release via GitHub API
$LatestReleaseUri = 'https://api.github.com/repos/denoland/deno/releases/latest'
Write-Part 'Downloading '; Write-Emphasized $LatestReleaseUri; Write-Part ' ... '
$LatestReleaseResponse = Invoke-WebRequest -Uri $LatestReleaseUri
Write-Done

Write-Part 'Determining latest Deno version: '
$LatestRelease = ($LatestReleaseResponse | ConvertFrom-Json).tag_name
Write-Emphasized $LatestRelease; Write-Part ' ... '
Write-Done

# Create ~\.deno\bin directory if it doesn't already exist
$DenoBin = "${Home}\.deno\bin"
if (!(Test-Path $DenoBin)) {
	Write-Part 'Creating directory '; Write-Emphasized $DenoBin; Write-Part ' ... '
	New-Item -Path $DenoBin -ItemType Directory | Out-Null
	Write-Done
}

# Download latest Deno release
$DenoZip = "${DenoBin}\deno_win_x64.zip"
$DownloadUri = "https://github.com/denoland/deno/releases/download/${LatestRelease}/deno_win_x64.zip"
Write-Part 'Downloading '; Write-Emphasized $DownloadUri
Write-Part ' into '; Write-Emphasized $DenoZip; Write-Part ' ... '
Invoke-WebRequest -Uri $DownloadUri -OutFile $DenoZip
Write-Done

# Extract deno.exe from .zip file
Write-Part 'Extracting '; Write-Emphasized $DenoZip
Write-Part ' into '; Write-Emphasized "${DenoBin}\deno.exe"; Write-Part ' ... '
Expand-Archive `
	-Path $DenoZip `
	-DestinationPath $DenoBin `
	-Force # Using -Force to overwrite deno.exe if it already exists
Write-Done

# Remove .zip file
Write-Part 'Removing '; Write-Emphasized $DenoZip; Write-Part ' ... '
Remove-Item -Path $DenoZip
Write-Done

# Get Path environment variable for the current user
$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)

# Check whether Deno is in the Path already
$Paths = $Path -split ';'
$IsInPath = `
	$Paths -contains $DenoBin -or `
	$Paths -contains "${DenoBin}\"

# Add Deno to the Path if it hasn't been added already
if (!$IsInPath) {
	Write-Part 'Adding '; Write-Emphasized $DenoBin; Write-Part ' to the '
	Write-Emphasized 'Path'; Write-Part ' environment variable ... '
	[Environment]::SetEnvironmentVariable('Path', "${Path};${DenoBin}", $User)
	# Add Deno to the Path variable of the current terminal session
	# so `deno` can be used immediately without restarting the terminal
	$SessionPath = $Env:Path
	$Env:Path = "${SessionPath};${DenoBin}"
	Write-Done
}
