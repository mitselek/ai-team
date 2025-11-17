#!/bin/bash
# Batch update test files from blacklist to whitelist pattern

# Replace toolBlacklist with toolWhitelist in test files
find tests -name "*.spec.ts" -exec sed -i 's/toolBlacklist/toolWhitelist/g' {} +

# Replace tools: [...] with toolWhitelist: [...] in test mocks
# This is trickier and needs manual review

echo "Automated replacements complete - manual review required for complex changes"
