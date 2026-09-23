#!/usr/bin/env bash
# Lint Saltbox custom roles with the same two linters as the Sandbox CI.
# Usage: lint-role.sh <repo-dir> [roles/<role> ...]   (default: roles)
# Installs saltbox-lint and ansible-lint on first run (user-level, no sudo).
set -euo pipefail

REPO=$(cd "${1:?usage: lint-role.sh <repo-dir> [roles/<role> ...]}" && pwd)
shift
TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(roles)

BIN="$HOME/.local/bin"
VENV="$HOME/.local/share/saltbox-lint-venv"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/saltbox-lint"
mkdir -p "$BIN" "$CACHE"

if [ ! -x "$BIN/saltbox-lint" ]; then
  tag=$(curl -sf https://api.github.com/repos/saltyorg/saltbox-lint/releases/latest | python3 -c 'import json,sys;print(json.load(sys.stdin)["tag_name"])')
  ver=${tag#v}; arch=$(uname -m); [ "$arch" = "x86_64" ] && arch=amd64; [ "$arch" = "aarch64" ] && arch=arm64
  archive="saltbox-lint_${ver}_linux_${arch}.tar.gz"
  tmp=$(mktemp -d)
  curl -sfL -o "$tmp/$archive" "https://github.com/saltyorg/saltbox-lint/releases/download/$tag/$archive"
  curl -sfL -o "$tmp/checksums.txt" "https://github.com/saltyorg/saltbox-lint/releases/download/$tag/checksums.txt"
  (cd "$tmp" && grep " $archive\$" checksums.txt | sha256sum -c -)
  tar -xzf "$tmp/$archive" -C "$tmp" saltbox-lint && install -m755 "$tmp/saltbox-lint" "$BIN/saltbox-lint"
  rm -rf "$tmp"
fi

if [ ! -x "$VENV/bin/ansible-lint" ]; then
  python3 -m venv "$VENV"
  # Versions pinned in saltyorg/Saltbox requirements/requirements-saltbox.txt (check for updates).
  "$VENV/bin/pip" install -q ansible-core==2.21.2 ansible-lint==26.6.0 yamllint==1.38.0
fi

if [ -d "$CACHE/saltbox/.git" ]; then git -C "$CACHE/saltbox" pull -q --ff-only || true
else git clone -q --depth 1 https://github.com/saltyorg/Saltbox.git "$CACHE/saltbox"; fi
"$VENV/bin/ansible-galaxy" collection install -r "$CACHE/saltbox/requirements.yml" -p "$HOME/.ansible/collections" >/dev/null

echo "== saltbox-lint (Go, read-only) =="
(cd "$REPO" && "$BIN/saltbox-lint" check "${TARGETS[@]}") && echo "saltbox-lint: clean"

echo "== ansible-lint (Sandbox config, isolated workspace) =="
ws=$(mktemp -d); trap 'rm -rf "$ws"' EXIT
for t in "${TARGETS[@]}"; do mkdir -p "$ws/$(dirname "$t")"; cp -r "$REPO/$t" "$ws/$t"; done
curl -sf https://raw.githubusercontent.com/saltyorg/Sandbox/master/.ansible-lint -o "$ws/.ansible-lint"
S="$CACHE/saltbox"
cd "$ws"
ANSIBLE_ROLES_PATH="$ws/roles:$S/roles:$S/resources/roles" ANSIBLE_LOOKUP_PLUGINS="$S/lookup_plugins" \
ANSIBLE_FILTER_PLUGINS="$S/filter_plugins" ANSIBLE_LIBRARY="$S/library" \
  "$VENV/bin/ansible-lint" "${TARGETS[@]}" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -v -E "PATH altered|new release"
