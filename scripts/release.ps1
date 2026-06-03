#!/usr/bin/env pwsh
# Publica una versión nueva del desktop.
# Sube la versión en tauri.conf.json, Cargo.toml y package.json, commitea,
# crea el tag vX.Y.Z y lo pushea -> dispara el workflow que compila, firma y
# publica el GitHub Release con el instalador + latest.json.
#
# Uso:  ./scripts/release.ps1 0.1.1

param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = 'Stop'
# Hacer que un git con exit-code != 0 corte el script (PS7).
$PSNativeCommandUseErrorActionPreference = $true

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
  Write-Error "Versión inválida '$Version'. Usá X.Y.Z (ej: 0.1.1)"
  exit 1
}

$root      = Split-Path -Parent $PSScriptRoot
$tauriConf = Join-Path $root 'apps/desktop/src-tauri/tauri.conf.json'
$cargo     = Join-Path $root 'apps/desktop/src-tauri/Cargo.toml'
$pkg       = Join-Path $root 'apps/desktop/package.json'

function Set-JsonVersion($path) {
  $c = Get-Content $path -Raw
  $c = [regex]::Replace($c, '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}", 1)
  [System.IO.File]::WriteAllText($path, $c)
}

Set-JsonVersion $tauriConf
Set-JsonVersion $pkg

# Cargo.toml: primer 'version = "..."' (el del paquete)
$c = Get-Content $cargo -Raw
$c = [regex]::Replace($c, '(?m)^version = "[^"]+"', "version = `"$Version`"", 1)
[System.IO.File]::WriteAllText($cargo, $c)

Write-Host "Versión -> $Version" -ForegroundColor Cyan

git -C $root add $tauriConf $cargo $pkg
# Si la versión no cambió, no hay nada que commitear: solo tageamos.
if (git -C $root diff --cached --quiet; $LASTEXITCODE -ne 0) {
  git -C $root commit -m "release: v$Version"
} else {
  Write-Host "Sin cambios de versión (ya estaba en $Version): solo creo el tag." -ForegroundColor Yellow
}
git -C $root tag "v$Version"
git -C $root push origin HEAD
git -C $root push origin "v$Version"

Write-Host "Listo. El CI esta compilando v$Version. Mira: GitHub -> Actions / Releases." -ForegroundColor Green
