node dist/src/cli.js assess examples/inventory.json --cbom /tmp/cbom.json > /tmp/p.md; diff /tmp/p.md docs/sample-plan.md; diff /tmp/cbom.json docs/sample-cbom.json
test "$(node dist/src/cli.js assess examples/inventory.json --fail-on-high >/dev/null; echo $?)" = "1"
