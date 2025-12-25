#!/bin/bash
# Database Backup Script: Replit <-> AWS RDS
# Run manually or schedule with cron

# Configuration
BACKUP_DIR="/tmp/db_backups"
DATE=$(date +"%Y-%m-%d_%H-%M")
BACKUP_FILE="finatrades_backup_${DATE}.sql"

mkdir -p $BACKUP_DIR

echo "=== Finatrades Database Backup ==="
echo "Date: $(date)"

# ======================================
# OPTION 1: Export from Replit to AWS
# ======================================
export_replit_to_aws() {
    echo "Exporting from Replit database..."
    
    # Export from Replit (using DATABASE_URL)
    pg_dump "$DATABASE_URL" -F c -f "$BACKUP_DIR/$BACKUP_FILE.dump"
    
    if [ $? -eq 0 ]; then
        echo "✓ Export successful: $BACKUP_FILE.dump"
        
        # Import to AWS RDS
        echo "Importing to AWS RDS..."
        pg_restore -h $AWS_RDS_HOST -U $AWS_RDS_USER -d $AWS_RDS_DATABASE \
            --clean --if-exists --no-owner \
            "$BACKUP_DIR/$BACKUP_FILE.dump"
        
        if [ $? -eq 0 ]; then
            echo "✓ Import to AWS successful"
        else
            echo "✗ Import to AWS failed"
        fi
    else
        echo "✗ Export failed"
    fi
}

# ======================================
# OPTION 2: Export from AWS to Replit
# ======================================
export_aws_to_replit() {
    echo "Exporting from AWS RDS..."
    
    # Export from AWS RDS
    PGPASSWORD=$AWS_RDS_PASSWORD pg_dump \
        -h $AWS_RDS_HOST \
        -U $AWS_RDS_USER \
        -d $AWS_RDS_DATABASE \
        -F c -f "$BACKUP_DIR/$BACKUP_FILE.dump"
    
    if [ $? -eq 0 ]; then
        echo "✓ Export from AWS successful"
        
        # Import to Replit
        echo "Importing to Replit database..."
        pg_restore "$DATABASE_URL" \
            --clean --if-exists --no-owner \
            "$BACKUP_DIR/$BACKUP_FILE.dump"
        
        if [ $? -eq 0 ]; then
            echo "✓ Import to Replit successful"
        else
            echo "✗ Import to Replit failed"
        fi
    else
        echo "✗ Export from AWS failed"
    fi
}

# ======================================
# OPTION 3: Create SQL backup file only
# ======================================
create_backup_file() {
    echo "Creating SQL backup file..."
    
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✓ Backup created: $BACKUP_DIR/$BACKUP_FILE"
        echo "Size: $(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)"
    else
        echo "✗ Backup failed"
    fi
}

# Run based on argument
case "$1" in
    "to-aws")
        export_replit_to_aws
        ;;
    "from-aws")
        export_aws_to_replit
        ;;
    "backup")
        create_backup_file
        ;;
    *)
        echo "Usage: $0 {to-aws|from-aws|backup}"
        echo ""
        echo "  to-aws   - Export Replit DB to AWS RDS"
        echo "  from-aws - Export AWS RDS to Replit DB"
        echo "  backup   - Create local SQL backup file"
        ;;
esac

echo ""
echo "=== Backup Complete ==="
