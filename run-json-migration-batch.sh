#!/bin/bash

# JSON Migration Runner - Processes first batch automatically
echo "Starting JSON Safe Migration - First Batch"
echo "=========================================="
echo ""
echo "This will automatically approve the first 10 backend files"
echo "Press Ctrl+C to cancel"
echo ""
sleep 3

# Create input file with responses
cat > migration-responses.txt << EOF
y
y
y
y
y
y
y
y
y
y
n
EOF

# Run migration with responses
node json-safe-migration.js < migration-responses.txt

echo ""
echo "First batch complete! Check json-migration-report.md for details"
echo ""
echo "To continue with next batch, run this script again"