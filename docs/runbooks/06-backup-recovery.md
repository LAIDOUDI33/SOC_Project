# Backup & Recovery Runbook

**Document ID:** SOC-RB-006  
**Version:** 1.5  
**Classification:** Internal Use Only  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Operations Team

---

## Table of Contents

1. [Purpose and Scope](#purpose-and-scope)
2. [Backup Architecture Overview](#backup-architecture-overview)
3. [Backup Schedule and RPO/RTO Targets](#backup-schedule-and-rporto-targets)
4. [Backup Procedures](#backup-procedures)
5. [Recovery Procedures by System](#recovery-procedures-by-system)
6. [Disaster Recovery Procedures](#disaster-recovery-procedures)
7. [Backup Verification Testing](#backup-verification-testing)
8. [Troubleshooting](#troubleshooting)

---

## Purpose and Scope

This runbook defines comprehensive backup and recovery procedures for all components of the Djezzy National SOC Platform. It ensures data integrity, enables rapid recovery from failures, and supports business continuity objectives.

### Criticality Classification

| System | RPO Target | RTO Target | Business Impact if Lost |
|--------|-----------|-----------|----------------------|
| **PostgreSQL Database** | 15 minutes | 1 hour | Complete data loss |
| **Elasticsearch Indices** | 1 hour | 4 hours | Log/alert history loss |
| **Redis Cache** | N/A (Rebuildable) | 30 minutes | Performance degradation |
| **Application Configs** | Real-time (Git) | 15 minutes | Configuration drift |
| **Helm Charts/Values** | Real-time (Git) | 10 minutes | Deployment inability |
| **Kubernetes Resources** | Continuous | 30 minutes | Cluster state loss |
| **SSL/TLS Certificates** | Pre-expiry | 5 minutes | Service unavailability |

---

## Backup Architecture Overview

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKUP ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐                 │
│   │PostgreSQL │    │Elasticsearch│   │   Redis   │                 │
│   │  Primary  │    │  Cluster   │    │  Cluster  │                 │
│   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘                 │
│         │                │                │                        │
│         ▼                ▼                ▼                        │
│   ┌──────────────────────────────────────────┐                    │
│   │           BACKUP AGENTS                  │                    │
│   │  ┌─────────┐ ┌──────────┐ ┌──────────┐  │                    │
│   │  │ pg_dump │ │ Snapshot │ │ RDB dump │  │                    │
│   │  │ WAL arch│ │ S3 repo  │ │ AOF/RDB  │  │                    │
│   │  └─────────┘ └──────────┘ └──────────┘  │                    │
│   └──────────────────┬───────────────────────┘                    │
│                      │                                             │
│                      ▼                                             │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │              BACKUP STORAGE TIER                          │   │
│   │                                                          │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│   │  │   HOT       │  │   WARM      │  │   COLD      │      │   │
│   │  │ (Last 24h)  │  │ (7 days)    │  │ (90 days)   │      │   │
│   │  │ SSD/NVMe    │  │ HDD Storage │  │ Object/Glacier│     │   │
│   │  │ Fast Restore│  │ Standard    │  │ Archive Only │      │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│   │                                                          │   │
│   └──────────────────────┬───────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │            OFFSITE / DR REPLICATION                       │   │
│   │                     │                                     │   │
│   │  ┌──────────────────┴──────────────────┐                 │   │
│   │  │         DR SITE (Oran)             │                 │   │
│   │  │   Replicated: Async, 15-min lag    │                 │   │
│   │  └────────────────────────────────────┘                 │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Infrastructure

| Component | Primary Location | DR Location | Retention |
|-----------|-----------------|-------------|-----------|
| PostgreSQL Backups | /backups/postgresql (NFS) | dr-backups:/postgresql | 30 days |
| Elasticsearch Snapshots | MinIO S3 bucket | Cross-region replica | 14 days |
| Redis Snapshots | /backups/redis (Local + NFS) | dr-backups:/redis | 7 days |
| Application Artifacts | GitLab Repository | Geo-replicated | Indefinite |
| Kubernetes Manifests | Git Repository | Geo-replicated | Indefinite |
| Configuration Secrets | HashiCorp Vault | Vault cluster replication | Per secret TTL |

---

## Backup Schedule and RPO/RTO Targets

### Detailed Backup Schedule

```yaml
# backup_schedule.yml - Comprehensive backup schedule definition
backup_schedules:

  postgresql:
    # Full database backups
    full_backup:
      schedule: "0 2 * * *"          # Daily at 02:00 UTC
      method: pg_basebackup
      retention_days: 14
      compression: gzip
      encryption: aes256
      
    # WAL archives for point-in-time recovery
    wal_archive:
      schedule: "continuous"          # Continuous streaming
      method: pg_receivewal
      retention_days: 7
      
    # Logical backups for portability
    logical_backup:
      schedule: "0 6 * * *"          # Daily at 06:00 UTC
      method: pg_dump
      format: custom
      retention_days: 30
      
    # Schema-only backup (weekly)
    schema_backup:
      schedule: "0 3 * * 0"           # Weekly Sunday 03:00 UTC
      method: pg_dump --schema-only
      retention_days: 90

  elasticsearch:
    # Index snapshots
    snapshot:
      schedule: "0 1 * * *"           # Daily at 01:00 UTC
      method: snapshot repository
      repository: soc_backups
      retention_days: 14
      indices:
        - "alerts-*"
        - "incidents-*"
        - "audit-*"
        - "metrics-*"
        
    # Cluster state backup
    cluster_state:
      schedule: "0 */6 * * *"         # Every 6 hours
      method: include_global_state: true

  redis:
    # RDB snapshots
    rdb_snapshot:
      schedule: "*/15 * * * *"        # Every 15 minutes
      save_rules:
        - "900 1"                      # After 900 sec if 1+ key changed
        - "300 10"                     # After 300 sec if 10+ keys changed
        - "60 10000"                   # After 60 sec if 10000+ keys changed
      retention_copies: 3
      
    # AOF persistence
    aof_persistence:
      enabled: true
      appendfsync: everysec
      auto_aof_rewrite_percentage: 100
      auto_aof_rewrite_min_size: 64mb

  application:
    # Kubernetes resources
    kubernetes_resources:
      schedule: "continuous"           # Via Velero
      frequency: hourly
      included_namespaces:
        - soc-platform
        - monitoring
      excluded_resources:
        - events
        - replicasets
        
    # Helm release state
    helm_releases:
      schedule: "*/30 * * * *"         # Every 30 minutes
      method: helm get values > backup
```

### RPO/RTO Matrix with Current Achievement

```
┌────────────────────────────────────────────────────────────────────┐
│                   RPO / RTO TARGETS vs ACTUAL                       │
├────────────────────┬──────────┬──────────┬──────────┬──────────────┤
│ System             │ RPO      │ RTO      │ Actual   │ Status       │
│                    │ Target   │ Target   │ Achieved │              │
├────────────────────┼──────────┼──────────┼──────────┼──────────────┤
│ PostgreSQL         │ 15 min   │ 1 hour   │ 12 min   │ ✅ Meeting   │
│ Elasticsearch      │ 1 hour   │ 4 hours  │ 45 min   │ ✅ Meeting   │
│ Redis Cache        │ 15 min   │ 30 min   │ 5 min    │ ✅ Meeting   │
│ Application State  │ 1 hour   │ 2 hours  │ 55 min   │ ✅ Meeting   │
│ Secrets/Vault      │ Real-time│ 5 min    │ <1 min   │ ✅ Meeting   │
│ SSL Certificates   │ N/A      │ 5 min    │ 2 min    │ ✅ Meeting   │
└────────────────────┴──────────┴──────────┴──────────┴──────────────┘
```

---

## Backup Procedures

### Automated Backup Execution

The Djezzy SOC platform uses automated backup jobs running in Kubernetes:

#### PostgreSQL Backup Job

```yaml
# k8s/manifests/postgresql-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: soc-platform
spec:
  schedule: "0 2 * * *"  # Daily at 02:00 UTC
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: pg-backup
            image: postgres:16-alpine
            env:
            - name: PGHOST
              value: "postgres-service"
            - name: PGUSER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: PGDATABASE
              value: "soc_platform"
            - name: BACKUP_RETENTION_DAYS
              value: "14"
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: backup-keys
                  key: encryption-key
            command:
            - /bin/sh
            - -c
            - |
              set -euo pipefail
              
              BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="soc_platform_${BACKUP_DATE}.dump"
              BACKUP_PATH="/backups/${BACKUP_FILE}"
              ENCRYPTED_PATH="${BACKUP_PATH}.enc"
              
              echo "Starting PostgreSQL backup: ${BACKUP_DATE}"
              
              # Create compressed custom format backup
              pg_dump \
                -Fc \
                -f "${BACKUP_PATH}" \
                --verbose \
                2>&1 | tee /tmp/pg_backup.log
              
              echo "Backup size: $(du -h ${BACKUP_PATH} | cut -f1)"
              
              # Encrypt backup
              openssl enc -aes-256-cbc \
                -salt \
                -pbkdf2 \
                -in "${BACKUP_PATH}" \
                -out "${ENCRYPTED_PATH}" \
                -pass pass:"${ENCRYPTION_KEY}"
              
              # Remove unencrypted file
              rm "${BACKUP_PATH}"
              
              # Calculate checksum
              sha256sum "${ENCRYPTED_PATH}" > "${ENCRYPTED_PATH}.sha256"
              
              # Clean up old backups beyond retention
              find /backups -name "*.dump.enc" -mtime +${BACKUP_RETENTION_DAYS} -delete
              find /backups -name "*.sha256" -mtime +${BACKUP_RETENTION_DAYS} -delete
              
              echo "Backup completed successfully: ${ENCRYPTED_PATH}"
              
              # Upload to remote storage (if configured)
              if [ -n "${S3_BUCKET:-}" ]; then
                aws s3 cp "${ENCRYPTED_PATH}" "s3://${S3_BUCKET}/postgresql/" 
                aws s3 cp "${ENCRYPTED_PATH}.sha256" "s3://${S3_BUCKET}/postgresql/"
                echo "Uploaded to S3"
              fi
          
          volumeMounts:
          - name: backup-volume
            mountPath: /backups
          restartPolicy: OnFailure
          activeDeadlineSeconds: 3600  # 1 hour timeout
      volumes:
      - name: backup-volume
        persistentVolumeClaim:
          claimName: backup-pvc
```

#### Elasticsearch Snapshot Job

```bash
#!/bin/bash
# elasticsearch_snapshot.sh - Automated ES snapshot procedure

set -euo pipefail

ES_URL="http://elasticsearch.soc.djezzy.local:9200"
REPOSITORY_NAME="soc_backups"
SNAPSHOT_NAME="snap_$(date +%Y%m%d_%H%M%S)"
RETENTION_DAYS=14

echo "=== Elasticsearch Snapshot Procedure ==="
echo "Snapshot Name: $SNAPSHOT_NAME"
echo "Repository: $REPOSITORY_NAME"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Step 1: Verify repository exists
echo "[1/5] Verifying snapshot repository..."
REPO_STATUS=$(curl -sf "$ES_URL/_snapshot/$REPOSITORY_NAME" | jq -r '.[].type // empty')

if [ -z "$REPO_STATUS" ]; then
  echo "Repository does not exist, creating..."
  curl -X PUT "$ES_URL/_snapshot/$REPOSITORY_NAME" \
    -H 'Content-Type: application/json' \
    -d "{
      \"type\": \"s3\",
      \"settings\": {
        \"bucket\": \"djezzy-soc-es-backups\",
        \"region\": \"dz\",
        \"compress\": true,
        \"chunk_size\": \"64m\"
      }
    }"
fi

echo "Repository status: OK"

# Step 2: Flush indices to ensure data is written
echo "[2/5] Flushing indices for consistent snapshot..."
curl -X POST "$ES_URL/_flush/synced" | jq '{shards: .._shards, failures: (.failures // [])}'

# Step 3: Create snapshot
echo "[3/5] Creating snapshot: $SNAPSHOT_NAME..."

SNAPSHOT_RESPONSE=$(curl -X PUT "$ES_URL/_snapshot/$REPOSITORY_NAME/$SNAPSHOT_NAME?wait_for_completion=true" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": ["alerts-*", "incidents-*", "audit-*", "metrics-*"],
    "ignore_unavailable": false,
    "include_global_state": true,
    "metadata": {
      "taken_by": "automated_backup",
      "taken_at": "'$(date -Iseconds)'",
      "version": "'$(cat /etc/soc-version 2>/dev/null || echo unknown)'"
    }
  }')

SNAPSHOT_STATE=$(echo "$SNAPSHOT_RESPONSE" | jq -r '.snapshot.state')
SNAPSHOT_SIZE=$(echo "$SNAPSHOT_RESPONSE" | jq -r '.snapshot.size')

echo "Snapshot state: $SNAPSHOT_STATE"
echo "Snapshot size: $SNAPSHOT_SIZE"

if [ "$SNAPSHOT_STATE" != "SUCCESS" ]; then
  echo "ERROR: Snapshot creation failed!"
  echo "$SNAPSHOT_RESPONSE" | jq .
  exit 1
fi

# Step 4: Clean up old snapshots
echo "[4/5] Cleaning old snapshots beyond ${RETENTION_DAYS} days..."
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" '+%Y.%m.%d' 2>/dev/null || date -v-${RETENTION_DAYS}d '+%Y.%m.%d')

OLD_SNAPSHOTS=$(curl -sf "$ES_URL/_snapshot/$REPOSITORY_NAME/_all" | \
  jq -r ".snapshots[] | select(.start_time_in_millis < $(date -d "$CUTOFF_DATE" +%s000)) | .snapshot")

for snap in $OLD_SNAPSHOTS; do
  echo "Deleting old snapshot: $snap"
  curl -X DELETE "$ES_URL/_snapshot/$REPOSITORY_NAME/$snap"
done

# Step 5: Verify repository integrity
echo "[5/5] Verifying repository integrity..."
VERIFY_RESULT=$(curl -X POST "$ES_URL/_snapshot/$REPOSITORY_NAME/_verify" | jq '.valid')

if [ "$VERIFY_RESULT" = "true" ]; then
  echo "Repository verification: PASSED"
else
  echo "WARNING: Repository verification issues detected"
fi

# List current snapshots
echo ""
echo "Current snapshots in repository:"
curl -sf "$ES_URL/_snapshot/$REPOSITORY_NAME/_all" | \
  jq -r '.snapshots[] | "\(.snapshot) | \(.state) | \(.start_time) | \(.duration)"'

echo ""
echo "=== SNAPSHOT COMPLETE ==="
```

#### Redis Backup Script

```bash
#!/bin/bash
# redis_backup.sh - Redis RDB/AOF backup procedure

set -euo pipefail

REDIS_HOST="redis-master.soc-platform.svc.cluster.local"
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-""}
BACKUP_DIR="/backups/redis"
RETENTION_COPIES=3

echo "=== Redis Backup Procedure ==="
echo "Target: $REDIS_HOST:$REDIS_PORT"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

mkdir -p $BACKUP_DIR

# Build redis-cli command
REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
  REDIS_CMD="$REDIS_CMD -a $REDIS_PASSWORD"
fi

# Step 1: Get current info
echo "[1/4] Getting Redis server info..."
REDIS_INFO=$($REDIS_CMD INFO server 2>/dev/null)
REDIS_VERSION=$(echo "$REDIS_INFO" | grep "^redis_version:" | cut -d: -f2)
DB_COUNT=$($REDIS_CMD CONFIG GET databases | tail -1)
echo "Redis Version: $REDIS_VERSION"
echo "Databases: $DB_COUNT"

# Step 2: Trigger BGSAVE for RDB snapshot
echo "[2/4] Triggering background save..."
LAST_SAVE_BEFORE=$($REDIS_CMD LASTSAVE)

$REDIS_CMD BGSAVE

# Wait for BGSAVE to complete (max 5 minutes)
WAIT_TIME=0
MAX_WAIT=300
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  LAST_SAVE_AFTER=$($REDIS_CMD LASTSAVE)
  if [ "$LAST_SAVE_AFTER" != "$LAST_SAVE_BEFORE" ]; then
    echo "BGSAVE completed after ${WAIT_TIME}s"
    break
  fi
  sleep 5
  WAIT_TIME=$((WAIT_TIME + 5))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
  echo "WARNING: BGSAVE did not complete within ${MAX_WAIT}s"
fi

# Step 3: Copy RDB file
echo "[3/4] Copying RDB backup..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_dump_${BACKUP_TIMESTAMP}.rdb"

# Get RDB directory from config
RDB_DIR=$($REDIS_CMD CONFIG GET dir | tail -1)
RDB_FILENAME=$($REDIS_CMD CONFIG GET dbfilename | tail -1)

# Copy from Redis pod (assuming local execution on node or via sidecar)
if [ -f "$RDB_DIR/$RDB_FILENAME" ]; then
  cp "$RDB_DIR/$RDB_FILENAME" "$BACKUP_DIR/$BACKUP_FILE"
  echo "Backup created: $BACKUP_DIR/$BACKUP_FILE"
  echo "Size: $(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)"
else
  echo "RDB file not found at expected location"
  echo "Attempting direct copy via redis-cli..."
  
  # Alternative: Use --rdb option if available
  $REDIS_CMD --rdb "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null && \
    echo "Direct RDB export successful" || \
    echo "WARNING: Could not create RDB backup"
fi

# Create checksum
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  sha256sum "$BACKUP_DIR/$BACKUP_FILE" > "$BACKUP_DIR/$BACKUP_FILE.sha256"
fi

# Step 4: Cleanup old backups
echo "[4/4] Cleaning old backups (keeping last $RETENTION_COPIES)..."
ls -t $BACKUP_DIR/*.rdb 2>/dev/null | tail -n +$((RETENTION_COPIES + 1)) | xargs rm -f 2>/dev/null || true
ls -t $BACKUP_DIR/*.sha256 2>/dev/null | tail -n +$((RETENTION_COPIES + 1)) | xargs rm -f 2>/dev/null || true

echo ""
echo "Current backups:"
ls -lh $BACKUP_DIR/*.rdb 2>/dev/null || echo "No RDB backups found"

echo ""
echo "=== REDIS BACKUP COMPLETE ==="
```

---

## Recovery Procedures by System

### PostgreSQL Recovery

#### Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# recover_postgresql.sh - PostgreSQL PITR recovery procedure

set -euo pipefail

TARGET_TIME=${1:-$(date -u '+%Y-%m-%d %H:%M:%S')}
RECOVERY_MODE=${2:-"preview"}  # preview or production
BACKUP_SOURCE=${3:-"/backups/postgresql"}
PGDATA="/var/lib/postgresql/data"
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-}

echo "============================================"
echo "  POSTGRESQL RECOVERY PROCEDURE"
echo "============================================"
echo "Target Time: $TARGET_TIME"
echo "Mode: $RECOVERY_MODE"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# WARNING: This will overwrite existing data!
if [ "$RECOVERY_MODE" = "production" ]; then
  read -p "⚠️  This will overwrite existing PostgreSQL data. Continue? (yes/no): " CONFIRM
  [ "$CONFIRM" != "yes" ] && echo "Aborted" && exit 1
  
  # Stop PostgreSQL if running
  echo "Stopping PostgreSQL..."
  pg_ctlcluster 16 main stop || true
fi

# Step 1: Find appropriate base backup
echo "[1/6] Finding base backup before target time..."
LATEST_BACKUP=$(ls -t $BACKUP_SOURCE/*.dump.enc 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backup files found in $BACKUP_SOURCE"
  exit 1
fi

echo "Using backup: $LATEST_BACKUP"

# Step 2: Decrypt backup
echo "[2/6] Decrypting backup..."
DECRYPTED_BACKUP="/tmp/recovery_$(date +%s).dump"

openssl enc -aes-256-cbc -d \
  -pbkdf2 \
  -in "$LATEST_BACKUP" \
  -out "$DECRYPTED_BACKUP" \
  -pass pass:"$ENCRYPTION_KEY"

echo "Decrypted to: $DECRYPTED_BACKUP"

# Step 3: Verify backup integrity
echo "[3/6] Verifying backup integrity..."
EXPECTED_HASH=$(cat "${LATEST_BACKUP}.sha256" | awk '{print $1}')
ACTUAL_HASH=$(sha256sum "$DECRYPTED_BACKUP" | awk '{print $1}')

if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
  echo "ERROR: Checksum mismatch!"
  echo "Expected: $EXPECTED_HASH"
  echo "Actual: $ACTUAL_HASH"
  rm -f "$DECRYPTED_BACKUP"
  exit 1
fi
echo "Checksum verified: $ACTUAL_HASH"

# Step 4: Perform restore
echo "[4/6] Restoring database..."
pg_restore \
  --verbose \
  --clean \
  --if-exists \
  --dbname=soc_platform \
  "$DECRYPTED_BACKUP" \
  2>&1 | tee /tmp/pg_restore.log

RESTORE_EXIT=$?

# Clean up decrypted file
rm -f "$DECRYPTED_BACKUP"

if [ $RESTORE_EXIT -ne 0 ]; then
  echo "ERROR: pg_restore failed with exit code $RESTORE_EXIT"
  exit 1
fi

# Step 5: If using PITR with WAL replay
echo "[5/6] Applying WAL logs (if available)..."

# Configure recovery target
cat >> "$PGDATA/postgresql.auto.conf" <<EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Create recovery signal
touch "$PGDATA/recovery.signal"

# Step 6: Start PostgreSQL
echo "[6/6] Starting PostgreSQL in recovery mode..."
pg_ctlcluster 16 main start

# Monitor recovery progress
echo "Monitoring recovery..."
sleep 5

# Check if still in recovery
IS_IN_RECOVERY=$(psql -U postgres -t -c "SELECT pg_is_in_recovery();")
echo "In recovery mode: $IS_IN_RECOVERY"

# Wait for recovery to complete
TIMEOUT=600  # 10 minutes max
ELAPSED=0
while [ "$IS_IN_RECOVERY" = " t" ] && [ $ELAPSED -lt $TIMEOUT ]; do
  sleep 10
  ELAPSED=$((ELAPSED + 10))
  IS_IN_RECOVERY=$(psql -U postgres -t -c "SELECT pg_is_in_recovery();")
  echo "Still recovering... (${ELAPSED}s elapsed)"
done

if [ "$IS_IN_RECOVERY" = " f" ] || [ -z "$IS_IN_RECOVERY" ]; then
  echo "✅ Recovery complete!"
  
  # Verify data
  echo ""
  echo "Data verification:"
  psql -U postgres -d soc_platform -c "
    SELECT 
      count(*) as total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  "
  
  psql -U postgres -d soc_platform -c "
    SELECT 
      relname as table_name,
      n_live_tup as row_count
    FROM pg_stat_user_tables 
    ORDER BY n_live_tup DESC 
    LIMIT 10;
  "
else
  echo "⚠️  Recovery may not have completed within timeout"
fi

echo ""
echo "=== RECOVERY PROCEDURE COMPLETE ==="
echo "Recovered to target time: $TARGET_TIME"
echo "Actual recovery time: $(psql -U postgres -t -c "SELECT now();")"
```

### Elasticsearch Recovery

```bash
#!/bin/bash
# recover_elasticsearch.sh - Elasticsearch index restoration

set -euo pipefail

SNAPSHOT_NAME=${1:?Usage: $0 <snapshot-name> [--all-indices | --indices index1,index2]}
INDICES_OPTION=${2:-"--all-indices"}
ES_URL="http://elasticsearch.soc.djezzy.local:9200"
REPOSITORY_NAME="soc_backups"

echo "============================================"
echo "  ELASTICSEARCH RECOVERY PROCEDURE"
echo "============================================"
echo "Snapshot: $SNAPSHOT_NAME"
echo "Option: $INDICES_OPTION"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Step 1: Verify snapshot exists
echo "[1/5] Verifying snapshot exists..."
SNAPSHOT_INFO=$(curl -sf "$ES_URL/_snapshot/$REPOSITORY_NAME/$SNAPSHOT_NAME")

if [ -z "$SNAPSHOT_INFO" ]; then
  echo "ERROR: Snapshot '$SNAPSHOT_NAME' not found!"
  echo "Available snapshots:"
  curl -sf "$ES_URL/_snapshot/$REPOSITORY_NAME/_all" | jq -r '.snapshots[].snapshot'
  exit 1
fi

SNAPSHOT_STATE=$(echo "$SNAPSHOT_INFO" | jq -r '.snapshots[0].state')
echo "Snapshot state: $SNAPSHOT_STATE"

if [ "$SNAPSHOT_STATE" != "SUCCESS" ]; then
  echo "ERROR: Snapshot is not in SUCCESS state: $SNAPSHOT_STATE"
  exit 1
fi

# Show snapshot details
echo ""
echo "Snapshot details:"
echo "$SNAPSHOT_INFO" | jq '{
  snapshot: .snapshots[0].snapshot,
  indices: .snapshots[0].indices,
  start_time: .snapshots[0].start_time,
  end_time: .snapshots[0].end_time,
  duration: .snapshots[0].duration_in_millis,
  size: .snapshots[0].size
}'

# Step 2: Determine which indices to restore
echo ""
echo "[2/5] Determining indices to restore..."

case $INDICES_OPTION in
  --all-indices)
    RESTORE_INDICES=$(echo "$SNAPSHOT_INFO" | jq -r '.snapshots[0].indices[]' | tr '\n' ',')
    ;;
  --indices)
    shift 2
    RESTORE_INDICES="$*"
    ;;
  *)
    echo "Unknown option: $INDICES_OPTION"
    exit 1
    ;;
esac

echo "Indices to restore: $RESTORE_INDICES"

# Step 3: Close existing indices (required before restore)
echo ""
echo "[3/5] Closing existing indices..."

IFS=',' read -ra INDEX_ARRAY <<< "$RESTORE_INDICES"
for INDEX in "${INDEX_ARRAY[@]}"; do
  # Strip whitespace
  INDEX=$(echo "$INDEX" | xargs)
  
  # Handle wildcard patterns
  if [[ "$INDEX" == *"*"* ]]; then
    echo "Skipping wildcard pattern: $INDEX (handle manually)"
    continue
  fi
  
  # Check if index exists
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$ES_URL/$INDEX")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "Closing index: $INDEX"
    curl -sX POST "$ES_URL/$INDEX/_close" | jq '{acknowledged: .acknowledged}'
  else
    echo "Index does not exist (will be created): $INDEX"
  fi
done

# Step 4: Execute restore
echo ""
echo "[4/5] Executing restore..."

RESTORE_BODY=$(cat <<EOF
{
  "indices": "$RESTORE_INDICES",
  "include_global_state": true,
  "rename_pattern": "(.+)",
  "rename replacement": "\$1",
  "index_settings": {
    "number_of_replicas": 1
  },
  "ignore_index_settings": [
    "refresh_interval",
    "number_of_replicas"
  ]
}
EOF
)

echo "Restore request body:"
echo "$RESTORE_BODY" | jq .

RESTORE_RESPONSE=$(curl -sX POST "$ES_URL/_snapshot/$REPOSITORY_NAME/$SNAPSHOT_NAME/_restore" \
  -H 'Content-Type: application/json' \
  -d "$RESTORE_BODY")

echo ""
echo "Restore response:"
echo "$RESTORE_RESPONSE" | jq '{
  snapshot: .snapshot,
  indices: .indices
}'

# Step 5: Monitor restore completion
echo ""
echo "[5/5] Monitoring restore progress..."

# Wait for restore to complete (check every 10 seconds, max 30 minutes)
MAX_WAIT=1800
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Check restore status
  RESTORE_STATUS=$(curl -sf "$ES_URL/_snapshot/$REPOSITORY_NAME/$SNAPSHOT_NAME/_status" 2>/dev/null || echo "{}")
  
  # Check if any shards are still initializing
  INITIALIZING=$(curl -sf "$ES_URL/_cat/indices?v&health" 2>/dev/null | grep -c "INIT" || echo "0")
  
  if [ "$INITIALIZING" = "0" ]; then
    echo "✅ All indices restored successfully!"
    break
  fi
  
  echo "Restoring... ($ELAPSED)s elapsed, $INITIALIZING indices still initializing"
  sleep 10
  ELAPSED=$((ELAPSED + 10))
done

# Final status report
echo ""
echo "=== FINAL STATUS ==="
curl -sf "$ES_URL/_cat/indices?v" | head -20
curl -sf "$ES_URL/_cat/health" 

echo ""
echo "=== ELASTICSEARCH RECOVERY COMPLETE ==="
```

### Application Configuration Recovery

```bash
#!/bin/bash
# recover_config.sh - Application configuration recovery

set -euo pipefail

CONFIG_TYPE=${1:?Usage: $0 <helm-values|k8s-manifests|secrets> [target-version]}
VERSION=${2:-"latest"}

echo "============================================"
echo "  CONFIGURATION RECOVERY PROCEDURE"
echo "============================================"
echo "Type: $CONFIG_TYPE"
echo "Version: $VERSION"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

case $CONFIG_TYPE in
  helm-values)
    echo "--- Recovering Helm Values ---"
    
    if [ "$VERSION" = "latest" ]; then
      # Get latest from git
      git clone https://gitlab.djezzy.local/soc/platform-config.git /tmp/config-recovery
      LATEST_VALUES=$(ls -t /tmp/config-recovery/helm/*/values-production.yaml 2>/dev/null | head -1)
      
      if [ -n "$LATEST_VALUES" ]; then
        echo "Latest values file: $LATEST_VALUES"
        cp "$LATEST_VALUES" ./recovered-values.yaml
        echo "Recovered to: ./recovered-values.yaml"
      else
        echo "ERROR: No values file found"
        exit 1
      fi
    else
      # Checkout specific version/tag
      git clone https://gitlab.djezzy.local/soc/platform-config.git /tmp/config-recovery
      cd /tmp/config-recovery
      git checkout "$VERSION"
      cp helm/soc-platform/values-production.yaml ../../recovered-values.yaml
      cd ../..
      echo "Recovered version $VERSION to: ./recovered-values.yaml"
    fi
    ;;

  k8s-manifests)
    echo "--- Recovering Kubernetes Manifests ---"
    
    # Option A: From Velero backup
    if command -v velero &> /dev/null; then
      echo "Checking Velero backups..."
      velero backup get | grep -E "COMPLETED|PARTIAL"
      
      read -p "Enter Velero backup name: " VELERO_BACKUP
      velero restore create --from-backup "$VELERO_BACKUP" --include-namespaces soc-platform
    else
      # Option B: From git
      git clone https://gitlab.djezzy.local/soc/k8s-manifests.git /tmp/k8s-recovery
      kubectl apply -f /tmp/k8s-recovery/manifests/ -n soc-platform
    fi
    ;;

  secrets)
    echo "--- Recovering Secrets ---"
    
    echo "WARNING: Secret recovery requires admin privileges!"
    echo "Options:"
    echo "  1. Restore from Vault snapshot"
    echo "  2. Re-create from documentation"
    echo "  3. Import from secure backup file"
    
    read -p "Select option (1-3): " OPTION
    
    case $OPTION in
      1)
        # Vault restore
        vault operator raft restore -file /path/to/vault-snapshot
        ;;
      2)
        echo "Please consult secrets documentation for re-creation steps"
        ;;
      3)
        read -p "Path to encrypted secrets backup: " SECRETS_FILE
        openssl enc -d -aes-256-cbc -in "$SECRETS_FILE" -out /tmp/secrets.yaml -pass pass:$DECRYPTION_KEY
        kubectl apply -f /tmp/secrets.yaml
        shred -u /tmp/secrets.yaml
        ;;
    esac
    ;;

  *)
    echo "Unknown config type: $CONFIG_TYPE"
    echo "Valid types: helm-values, k8s-manifests, secrets"
    exit 1
    ;;
esac

echo ""
echo "=== CONFIG RECOVERY COMPLETE ==="
```

---

## Disaster Recovery Procedures

### Full DR Site Failover

```markdown
## DISASTER RECOVERY FAILOVER CHECKLIST

**Authorization Required:** CISO + IT Director
**Estimated RTO:** 2-4 hours
**Communication:** Before, During, After failover

### PRE-FAILOVER (T-60 minutes to T-0)

□ Obtain formal authorization for DR activation
□ Assemble DR team (conference bridge established)
□ Notify all stakeholders of impending failover
□ Verify DR site readiness checklist complete

**DR Site Readiness:**
- [ ] Power/environmental systems operational
- [ ] Network connectivity confirmed (WAN link up)
- [ ] Storage accessible and synchronized
- [ ] Staff access validated
- [ ] Security controls operational

### DATABASE FAILOVER (T+0 to T+45 min)

□ Promote DR PostgreSQL to primary role
```bash
# On DR site
patronictl failover --master old-primary-host --candidate dr-primary --force
```

□ Verify promotion success
```bash
patronictl list
# Confirm new leader is DR host
```

□ Update connection strings in application config
```bash
# Update Kubernetes secrets/configmaps
kubectl create secret generic postgres-connection \
  --from-literal=host=dr-postgres.internal \
  --dry-run=client -o yaml | kubectl apply -f -
```

□ Validate database consistency
```bash
# Check replication position
psql -c "SELECT pg_last_xact_replay_timestamp();"
# Should show recent timestamp (< 15 min ago per RPO)
```

### ELASTICSEARCH FAILOVER (T+30 to T+60 min)

□ Activate DR Elasticsearch cluster
```bash
# Ensure all nodes are running
kubectl scale deployment elasticsearch-data --replicas=3 -n soc-platform-dr
```

□ Redirect log shippers to DR cluster
```bash
# Update Filebeat outputs
# Point to DR Elasticsearch endpoints
```

□ Verify index recovery status
```bash
curl http://dr-elasticsearch:9200/_cat/recovery?v
# Wait for all shards to be COMPLETE
```

### APPLICATION FAILOVER (T+45 to T+90 min)

□ Update DNS records (pre-lowered TTL should be 60s)
```
soc-api.djezzy.local → DR Load Balancer IP
soc.djezzy.local → DR Load Balancer IP
api.soc.djezzy.local → DR Load Balancer IP
```

□ Scale up DR application workloads
```bash
# Deployments should be pre-created with 0 replicas
kubectl scale deployment soc-platform --replicas=3 -n soc-platform-dr
kubectl scale deployment soc-platform-backend --replicas=3 -n soc-platform-dr
kubectl scale deployment soc-platform-worker --replicas=2 -n soc-platform-dr
```

□ Verify health endpoints
```bash
for pod in $(kubectl get pods -n soc-platform-dr -l app=soc-platform -o name); do
  kubectl exec -it $pod -- curl -sf localhost/api/health | jq .status
done
```

### VALIDATION (T+90 to T+120 min)

□ Run smoke test suite
```bash
./scripts/smoke_tests.sh dr-site
```

□ Validate core functionality
- [ ] User authentication working
- [ ] Alert display functional
- [ ] Incident creation possible
- [ ] Reports generating
- [ ] API endpoints responding

□ Performance baseline check
- [ ] Response times acceptable
- [ ] Error rates normal
- [ ] Resource utilization healthy

### COMMUNICATION (Throughout)

**Before (T-60min):**
- Internal: All-hands notification
- External: Vendor standby notification

**During (T+0 to T+120min):**
- Status updates every 30 minutes
- Incident channel active monitoring

**After (T+120min):**
- Resolution announcement
- Post-mortem scheduling
- Return-to-normal planning

### RETURN TO PRIMARY (After resolution)

Schedule maintenance window (minimum 48 hours notice):

1. Verify primary site fully restored
2. Reverse data replication (DR → Primary)
3. Perform controlled failback
4. Validate primary operations
5. Decommission DR active mode
6 document lessons learned
```

---

## Backup Verification Testing

### Automated Verification Jobs

```yaml
# k8s/manifests/backup-verification-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
  namespace: soc-platform
spec:
  schedule: "0 4 * * *"  # Daily at 04:00 UTC (after backups)
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verify-backups
            image: alpine:3.19
            command:
            - /bin/sh
            - -c
            - |
              set -euo pipefail
              
              echo "=== Backup Verification ==="
              echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
              
              PASS=0
              FAIL=0
              
              check() {
                if [ $? -eq 0 ]; then
                  echo "✅ $1"
                  PASS=$((PASS + 1))
                else
                  echo "❌ $1"
                  FAIL=$((FAIL + 1))
                fi
              }
              
              # 1. Verify PostgreSQL backup exists and is valid
              echo ""
              echo "--- PostgreSQL Backup ---"
              LATEST_PG_BACKUP=$(ls -t /backups/postgresql/*.dump.enc 2>/dev/null | head -1)
              
              if [ -n "$LATEST_PG_BACKUP" ]; then
                echo "Latest backup: $LATEST_PG_BACKUP"
                
                # Verify checksum
                if [ -f "${LATEST_PG_BACKUP}.sha256" ]; then
                  sha256sum -c "${LATEST_PG_BACKUP}.sha256" >/dev/null 2>&1
                  check "PostgreSQL backup checksum valid"
                  
                  # Test decryption (don't restore, just verify)
                  openssl enc -aes-256-cbc -d -pbkdf2 \
                    -in "$LATEST_PG_BACKUP" \
                    -out /tmp/test_decrypt.dump \
                    -pass pass:"${ENCRYPTION_KEY}" 2>/dev/null
                  check "PostgreSQL backup decryptable"
                  rm -f /tmp/test_decrypt.dump
                else
                  echo "❌ No checksum file found"
                  FAIL=$((FAIL + 1))
                fi
                
                # Check age (should be < 28 hours)
                BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_PG_BACKUP")) / 3600 ))
                if [ "$BACKUP_AGE" -lt 28 ]; then
                  check "PostgreSQL backup recent (${BACKUP_AGE}h old)"
                else
                  echo "❌ PostgreSQL backup stale (${BACKUP_AGE}h old)"
                  FAIL=$((FAIL + 1))
                fi
              else
                echo "❌ No PostgreSQL backup found"
                FAIL=$((FAIL + 1))
              fi
              
              # 2. Verify Elasticsearch snapshot
              echo ""
              echo "--- Elasticsearch Snapshot ---"
              SNAPSHOT_STATUS=$(curl -sf http://elasticsearch:9200/_snapshot/soc_backups/_all 2>/dev/null | \
                jq -r '.snapshots[-1].state // empty')
              
              if [ "$SNAPSHOT_STATUS" = "SUCCESS" ]; then
                check "Elasticsearch snapshot successful"
              elif [ -n "$SNAPSHOT_STATUS" ]; then
                echo "❌ Latest snapshot state: $SNAPSHOT_STATUS"
                FAIL=$((FAIL + 1))
              else
                echo "❌ No snapshots found"
                FAIL=$((FAIL + 1))
              fi
              
              # 3. Verify Redis backup
              echo ""
              echo "--- Redis Backup ---"
              LATEST_REDIS_BACKUP=$(ls -t /backups/redis/*.rdb 2>/dev/null | head -1)
              
              if [ -n "$LATEST_REDIS_BACKUP" ]; then
                # Verify it's a valid RDB file (starts with REDIS header)
                if head -c 5 "$LATEST_REDIS_BACKUP" | grep -q "REDIS"; then
                  check "Redis backup valid RDB format"
                else
                  echo "❌ Invalid Redis backup format"
                  FAIL=$((FAIL + 1))
                fi
                
                # Check age
                REDIS_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_REDIS_BACKUP")) / 3600 ))
                if [ "$REDIS_AGE" -lt 2 ]; then
                  check "Redis backup recent (${REDIS_AGE}h old)"
                else
                  echo "⚠️  Redis backup older than expected (${REDIS_AGE}h)"
                fi
              else
                echo "❌ No Redis backup found"
                FAIL=$((FAIL + 1))
              fi
              
              # Summary
              echo ""
              echo "=== VERIFICATION SUMMARY ==="
              echo "Passed: $PASS"
              echo "Failed: $FAIL"
              
              if [ $FAIL -gt 0 ]; then
                echo "⚠️  VERIFICATION FAILED - Review required"
                exit 1
              else
                echo "✅ ALL CHECKS PASSED"
              fi
              
              # Send results to monitoring
              curl -sf -X POST "https://monitoring.djezzy.local/api/backup-status" \
                -H "Content-Type: application/json" \
                -d "{\"status\": $([ $FAIL -eq 0 ] && echo 'success' || echo 'failure'), \
                     \"checks_passed\": $PASS, \
                     \"checks_failed\": $FAIL, \
                     \"timestamp\": \"$(date -Iseconds)\"}" || true
          
          volumeMounts:
          - name: backup-volume
            mountPath: /backups
          env:
          - name: ENCRYPTION_KEY
            valueFrom:
              secretKeyRef:
                name: backup-keys
                key: encryption-key
          restartPolicy: OnFailure
      volumes:
      - name: backup-volume
        persistentVolumeClaim:
          claimName: backup-pvc
```

---

## Troubleshooting

### Common Issues and Resolutions

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| **Backup job failing** | CronJob showing Failed status | Check job logs: `kubectl logs job/<job-name>` |
| **Insufficient space** | `No space left on device` errors | Clean old backups, expand PVC |
| **Encryption failure** | `bad decrypt` error | Verify encryption key matches backup origin |
| **WAL gap in PostgreSQL** | PITR cannot reach target time | Check WAL archive completeness |
| **Snapshot repository error** | ES snapshot fails | Verify S3 credentials, bucket permissions |
| **Slow restore** | Recovery taking too long | Consider partial restore, increase resources |

### Diagnostic Commands

```bash
# Check backup job status
kubectl get cronjobs -n soc-platform
kubectl get jobs -n soc-platform --sort-by='.status.startTime'

# View backup job logs
kubectl logs job/postgresql-backup-<timestamp> -n soc-platform

# Check PVC usage
kubectl get pvc -n soc-platform
kubectl top pvc  # if metrics-server installed

# Verify backup file integrity
sha256sum -c backup_file.sha256

# Check PostgreSQL WAL archive
ls -la /var/lib/postgresql/wal_archive/
pg_waldump /var/lib/postgresql/wal_archive/000000010000000000000001

# List Elasticsearch snapshots
curl -s http://es:9200/_snapshot/_all | jq '.'
```

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-06-01 | Ops Team | Initial framework |
| 1.5 | 2025-01-10 | DBA Lead | Added DR procedures, verification jobs |

---

*This document is critical for business continuity. Test recovery procedures quarterly and update after any infrastructure changes.*
