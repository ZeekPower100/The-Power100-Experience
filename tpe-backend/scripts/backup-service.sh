#!/bin/bash
# Automatic backup system for service changes

SERVICE_DIR="/home/ubuntu/The-Power100-Experience/tpe-backend/src/services"
BACKUP_DIR="/home/ubuntu/The-Power100-Experience/tpe-backend/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Function to backup a file
backup_file() {
    local filename=$1
    if [ -f "$SERVICE_DIR/$filename" ]; then
        cp "$SERVICE_DIR/$filename" "$BACKUP_DIR/${filename%.js}_${TIMESTAMP}.js"
        echo "✓ Backed up $filename to ${filename%.js}_${TIMESTAMP}.js"
    fi
}

# Function to restore latest working backup
restore_latest() {
    local filename=$1
    local latest=$(ls -t $BACKUP_DIR/${filename%.js}_*.js 2>/dev/null | head -1)
    if [ -f "$latest" ]; then
        cp "$latest" "$SERVICE_DIR/$filename"
        echo "✓ Restored $filename from $(basename $latest)"
    else
        echo "✗ No backup found for $filename"
    fi
}

# Main logic
case "$1" in
    backup)
        backup_file "$2"
        ;;
    restore)
        restore_latest "$2"
        ;;
    list)
        echo "Available backups:"
        ls -la $BACKUP_DIR/*.js 2>/dev/null | tail -10
        ;;
    *)
        echo "Usage: $0 {backup|restore|list} [filename]"
        exit 1
        ;;
esac
