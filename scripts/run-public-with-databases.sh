#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="esa-public-test-$(date +%s)-$$"
compose=(docker compose --project-name "$project" --file "$root/scripts/public-test-services.yml")

cleanup() {
  "${compose[@]}" down --volumes
}
trap cleanup EXIT

"${compose[@]}" up --detach --wait
postgres="$("${compose[@]}" port postgres 5432)"
mongo="$("${compose[@]}" port mongo 27017)"
export ESA_TEST_POSTGRES_URL="postgresql://esa_test:esa_test_local@${postgres}/esa_realworld?schema=public"
export ESA_TEST_MONGODB_URL="mongodb://${mongo}/esa_hagop"

if [[ "$#" -eq 0 ]]; then
  set -- realworld-express hagop-express
fi
node "$root/scripts/run-public-local.mjs" "$@"
