#!/bin/bash
# Quick restore for report generation service

echo "🔄 Quick Restore System"
echo "======================"
echo ""

# Show last 5 backups
echo "Recent backups:"
ls -t backups/reportGenerationService_*.js 2>/dev/null | head -5 | while read backup; do
    echo "  - $(basename $backup) ($(stat -c%y $backup | cut -d' ' -f2 | cut -d'.' -f1))"
done

echo ""
echo "Commands:"
echo "  1. Restore latest backup:  ./scripts/backup-service.sh restore reportGenerationService.js"
echo "  2. Create new backup:      ./scripts/backup-service.sh backup reportGenerationService.js"
echo "  3. Restart backend:        pm2 restart tpe-backend"
echo ""
echo "Quick fix (restore + restart):"
echo "  ./scripts/backup-service.sh restore reportGenerationService.js && pm2 restart tpe-backend"
