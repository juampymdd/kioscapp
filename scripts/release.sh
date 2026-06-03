#!/usr/bin/env bash
# Publica una versión nueva del desktop.
# Sube la versión en tauri.conf.json, Cargo.toml y package.json, commitea,
# crea el tag vX.Y.Z y lo pushea -> dispara el workflow que compila, firma y
# publica el GitHub Release con el instalador + latest.json.
#
# Uso:  ./scripts/release.sh 0.1.1
set -euo pipefail

ver="${1:?Uso: ./scripts/release.sh X.Y.Z (ej: 0.1.1)}"
if ! [[ "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Versión inválida '$ver'. Usá X.Y.Z (ej: 0.1.1)" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
tauri_conf="$root/apps/desktop/src-tauri/tauri.conf.json"
cargo="$root/apps/desktop/src-tauri/Cargo.toml"
pkg="$root/apps/desktop/package.json"

# tauri.conf.json y package.json: primer "version": "..."
sed -i.bak -E "s/(\"version\"[[:space:]]*:[[:space:]]*\")[^\"]+(\")/\1$ver\2/" "$tauri_conf" && rm -f "$tauri_conf.bak"
sed -i.bak -E "s/(\"version\"[[:space:]]*:[[:space:]]*\")[^\"]+(\")/\1$ver\2/" "$pkg" && rm -f "$pkg.bak"
# Cargo.toml: primer 'version = "..."' (el del paquete)
sed -i.bak -E "0,/^version = \"[^\"]+\"/s//version = \"$ver\"/" "$cargo" && rm -f "$cargo.bak"

echo "Versión -> $ver"

git -C "$root" add "$tauri_conf" "$cargo" "$pkg"
if git -C "$root" diff --cached --quiet; then
  echo "Sin cambios de versión (ya estaba en $ver): solo creo el tag."
else
  git -C "$root" commit -m "release: v$ver"
fi
git -C "$root" tag "v$ver"
git -C "$root" push origin HEAD
git -C "$root" push origin "v$ver"

echo "Listo. El CI está compilando v$ver. Mirá: GitHub -> Actions / Releases."
