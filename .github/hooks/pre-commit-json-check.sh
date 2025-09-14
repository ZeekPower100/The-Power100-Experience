#!/bin/bash

# Pre-commit hook for JSON error prevention
# Add this to .git/hooks/pre-commit (or use with Husky)

echo "🔍 Checking for unsafe JSON operations..."

# Run the JSON error checker
node tools/json-error-check.js

# Check if there were any issues
if [ $? -ne 0 ]; then
  echo "❌ Unsafe JSON operations detected. Please fix before committing."
  echo "📚 See docs/JSON-ERROR-PREVENTION.md for guidance"
  exit 1
fi

echo "✅ JSON operations look safe!"
exit 0