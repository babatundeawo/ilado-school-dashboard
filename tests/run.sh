#!/usr/bin/env bash
# Builds the site with dummy Firebase settings and runs the end-to-end tests
# (Firebase is replaced by test doubles in tests/mock, so no network or project is needed).
set -euo pipefail
cd "$(dirname "$0")/.."
FIREBASE_API_KEY=test FIREBASE_AUTH_DOMAIN=test.firebaseapp.com FIREBASE_PROJECT_ID=test FIREBASE_APP_ID=1:1:web:1 node scripts/build.mjs
python3 tests/e2e.py "$@"
