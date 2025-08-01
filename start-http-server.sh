#!/usr/bin/env bash

set -euo pipefail
cd -- "$(dirname -- "$0")/decks"

npm run bundle
python3 -m http.server
