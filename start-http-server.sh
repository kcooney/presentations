#!/usr/bin/env bash

set -euo pipefail
cd -- "$(dirname -- "$0")/decks"

python3 -m http.server
