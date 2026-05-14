<#
.SYNOPSIS
    Install Joern CLI for High-Assurance Agentic Coding workflow on Windows.
#>
param(
    [string]$InstallDir = "$env:USERPROFILE\bin\joern",
    [string]$JoernVersion = "latest"
)
$ErrorActionPreference = "Stop"
Write-Host "=== Joern Installation Script for Windows ===" -ForegroundColor Cyan
$javaExe = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaExe) { Write-Host "Java not found in PATH. Install Java 11+."; exit 1 }
Write-Host "Java is installed" -ForegroundColor Green
$joernCliDir = Join-Path $InstallDir "joern-cli"
$joernZip = "$env:TEMP\joern.zip"
$joernInstalled = (Test-Path (Join-Path $joernCliDir "joern.bat")) -or (Test-Path (Join-Path $joernCliDir "joern"))
if ($joernInstalled) { Write-Host "Joern already installed at $joernCliDir" -ForegroundColor Green }
else {
    Write-Host "Downloading Joern..." -ForegroundColor Yellow
    $releaseJson = Invoke-WebRequest -Uri "https://api.github.com/repos/joernio/joern/releases/latest" -UseBasicParsing | Select-Object -ExpandProperty Content
    $release = $releaseJson | ConvertFrom-Json
    $url = ($release.assets | Where-Object { $_.name -like "joern-cli.zip" }).browser_download_url
    Write-Host "Downloading from: $url"
    Invoke-WebRequest -Uri $url -OutFile $joernZip -UseBasicParsing
    Write-Host "Extracting Joern..." -ForegroundColor Yellow
    Expand-Archive -Path $joernZip -DestinationPath $InstallDir -Force
    Remove-Item $joernZip -Force
    Write-Host "Extracted to $InstallDir" -ForegroundColor Green
}
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$joernCliDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$joernCliDir", "User")
    Write-Host "Added to PATH: $joernCliDir" -ForegroundColor Green
}
Write-Host "Installation Complete. Restart terminal and run: joern --version"
