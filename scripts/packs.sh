#!/usr/bin/env bash
# Compile packs/_source/<dir> to the LevelDB packs in packs/, and back.
#
# Source directory names are deliberately shorter than the compendium ids they
# build into: the ids are baked into every rolltable's documentUuid and into
# existing worlds, so they cannot be renamed.
set -euo pipefail

SYSTEM_ID="mothershiprpg"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if command -v fvtt >/dev/null 2>&1; then
  FVTT=(fvtt)
else
  FVTT=(npx --yes @foundryvtt/foundryvtt-cli@3)
fi

PACKS=(
  "conditions:conditions_1e"
  "hotbar:macros_hotbar_1e"
  "triggered:macros_triggered_1e"
  "rolltables:rolltables_1e"
)

# Deliberately blanket: it only matters when this repo is linked into Foundry's
# Data dir (npm run setup does exactly that), but checking is fragile.
if [[ -z "${ALLOW_FOUNDRY_RUNNING:-}" ]] && pgrep -f "Foundry Virtual Tabletop" >/dev/null 2>&1; then
  echo "error: Foundry is running and may hold the LevelDB lock. Close it, or" >&2
  echo "       re-run with ALLOW_FOUNDRY_RUNNING=1 if this repo is not linked" >&2
  echo "       into Foundry's Data dir." >&2
  exit 1
fi

# fvtt writes <Name>_<id>.json; we track a readable <Name>.json derived from the
# document name. Filenames are for review only -- `fvtt package pack` keys off each
# document's _id in the JSON body, so renaming is safe.
#
# The sign matters and must survive: macros come in +/- pairs ("+1 Stress" vs
# "-1 Stress", "Panic Check [+]" vs "Panic Check [-]"). Dropping punctuation the way a
# naive slug does collapses each pair onto one filename and loses which is which.
# A mid-word hyphen is not a sign, so "Well-Rested" stays "Well_Rested".
#
# Uniqueness is checked rather than assumed, so a future collision fails loudly
# instead of one document silently overwriting another.
name_files() {
  python3 - "$1" <<'PY'
import json, os, re, sys, collections

d = sys.argv[1]

def slug(name):
    s = name.strip()
    s = re.sub(r'^\[?\+\]?', 'plus ', s)
    s = re.sub(r'^\[?-\]?', 'minus ', s)
    s = re.sub(r'\[?\+\]?\s*$', ' plus', s)
    s = re.sub(r'\[?-\]?\s*$', ' minus', s)
    s = re.sub(r'[^A-Za-z0-9]+', '_', s).strip('_')
    return s or 'unnamed'

renames, seen = {}, collections.Counter()
for f in sorted(os.listdir(d)):
    if not f.endswith(".json"): continue
    new = slug(json.load(open(os.path.join(d, f)))["name"]) + ".json"
    renames[f] = new
    seen[new] += 1

dupes = sorted(k for k, v in seen.items() if v > 1)
if dupes:
    sys.exit(f"error: {d} has documents whose names collide once slugged: {dupes}")

for old, new in renames.items():
    if old != new: os.rename(os.path.join(d, old), os.path.join(d, new))
PY
}

action="${1:-}"
only="${2:-}"
[[ "$action" == "pack" || "$action" == "unpack" ]] || { echo "usage: $0 {pack|unpack} [source-dir]" >&2; exit 1; }

for entry in "${PACKS[@]}"; do
  src="${entry%%:*}"; name="${entry##*:}"
  [[ -n "$only" && "$only" != "$src" ]] && continue
  if [[ "$action" == "pack" ]]; then
    "${FVTT[@]}" package pack "$name" --id "$SYSTEM_ID" --type System \
      --in "packs/_source/$src" --out packs >/dev/null
  else
    # Wipe first so documents deleted in Foundry don't linger as stale sources.
    rm -rf "packs/_source/$src"; mkdir -p "packs/_source/$src"
    "${FVTT[@]}" package unpack "$name" --id "$SYSTEM_ID" --type System \
      --in packs --out "packs/_source/$src" >/dev/null
    name_files "packs/_source/$src"
  fi
  printf '  %-12s %s %s\n' "$src" "$([[ $action == pack ]] && echo '->' || echo '<-')" "$name"
done
