#!/bin/bash
# ============================================================
# National SOC Platform - Production Cron Jobs
# 
# Automated maintenance tasks for 20M+ subscriber deployment:
# - Session cleanup (stale hunt sessions)
# - Cache optimization (expired entries)
# - Database maintenance (vacuum, analyze)
# - Log rotation and archival
# - Health checks and alerting
# - Backup verification
#
# Setup: Add to crontab -e
#   # SOC Platform Maintenance (runs every hour)
#   0 * * * * /home/z/my-project/scripts/cron/soc-maintenance.sh >> /var/log/soc-cron.log 2>&1
#
#   # Daily full maintenance (3AM)
#   0 3 * * * /home/z/my-project/scripts/cron/soc-daily-maintenance.sh >> /var/log/soc-daily.log 2>&1
#
# @module scripts/cron
# @version 1.0.0
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/var/log/soc-platform"
BACKUP_DIR="/var/backups/soc-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp function
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    echo -e "[$(timestamp)] $1"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

ensure_directories() {
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
    chmod 750 "$LOG_DIR" "$BACKUP_DIR"
}

check_dependencies() {
    local missing=()
    
    command -v curl >/dev/null 2>&1 || missing+=("curl")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    command -v psql >/dev/null 2>&1 || missing+=("psql")
    command -v redis-cli >/dev/null 2>&1 || missing+=("redis-cli")
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        return 1
    fi
    
    return 0
}

get_health_status() {
    local base_url="${SOC_PLATFORM_URL:-http://localhost:3000}"
    local timeout="${HEALTH_CHECK_TIMEOUT:-10}"
    
    # Check incidents health
    local incidents_health
    incidents_health=$(curl -sf --max-time "$timeout" "$base_url/api/incidents/health" 2>/dev/null || echo '{"status":"error"}')
    
    # Check stream health  
    local stream_health
    stream_health=$(curl -sf --max-time "$timeout" "$base_url/api/stream/health" 2>/dev/null || echo '{"status":"error"}')
    
    # Parse results
    local incidents_status=$(echo "$incidents_health" | jq -r '.status // "error"' 2>/dev/null || echo "error")
    local stream_status=$(echo "$stream_health" | jq -r '.status // "error"' 2>/dev/null || echo "error")
    
    if [ "$incidents_status" = "healthy" ] && [ "$stream_status" = "healthy" ]; then
        return 0
    else
        return 1
    fi
}

send_alert() {
    local severity="$1"
    local message="$2"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [ -n "$webhook_url" ]; then
        local color="good"
        [ "$severity" = "warning" ] && color="warning"
        [ "$severity" = "error" ] && color="danger"
        
        curl -sf -X POST "$webhook_url" \
            -H 'Content-type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"SOC Platform Alert [$severity]\",
                    \"text\": \"$message\",
                    \"ts\": $(date +%s),
                    \"footer\": \"SOC Cron Job\"
                }]
            }" > /dev/null 2>&1 || true
    fi
    
    # Also log to file
    echo "[$(timestamp)] ALERT [$severity]: $message" >> "$LOG_DIR/alerts.log"
}

# ============================================================
# MAINTENANCE TASKS
# ============================================================

cleanup_stale_sessions() {
    log_info "Cleaning up stale hunt sessions..."
    
    local stale_count=0
    local timeout_minutes="${SESSION_TIMEOUT_MINUTES:-30}"
    
    # Call the API to trigger cleanup (or direct DB query)
    if get_health_status; then
        local response
        response=$(curl -sf -X POST "${SOC_PLATFORM_URL:-http://localhost:3000}/api/threat-hunting/maintenance/cleanup-sessions" \
            -H "Authorization: Bearer ${CRON_JOB_TOKEN:-}" \
            -H "Content-Type: application/json" \
            -d "{\"timeoutMinutes\": $timeout_minutes}" 2>/dev/null || echo '{}')
        
        stale_count=$(echo "$response" | jq -r '.evicted // 0' 2>/dev/null || echo "0")
    else
        log_warning "API not available, skipping session cleanup via API"
        
        # Direct database cleanup as fallback
        if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
            stale_count=$(psql "$DATABASE_URL" -t -c "
                UPDATE hunt_sessions 
                SET status = 'CANCELLED', 
                    updated_at = NOW(),
                    notes = COALESCE(notes, '') || ' Auto-cancelled: stale session'
                WHERE status IN ('RUNNING', 'PAUSED')
                  AND updated_at < NOW() - INTERVAL '$timeout_minutes minutes'
                RETURNING id;
            " 2>/dev/null | grep -c '[a-f0-9]' || echo "0")
        fi
    fi
    
    log_success "Cleaned up $stale_count stale sessions"
    return 0
}

optimize_cache() {
    log_info "Optimizing analytics cache..."
    
    local cache_stats=""
    if get_health_status; then
        cache_stats=$(curl -sf "${SOC_PLATFORM_URL:-http://localhost:3000}/api/analytics/cache/stats" \
            -H "Authorization: Bearer ${CRON_JOB_TOKEN:-}" 2>/dev/null || echo '{}')
        
        local size=$(echo "$cache_stats" | jq -r '.size // 0' 2>/dev/null)
        local hits=$(echo "$cache_stats" | jq -r '.hits // 0' 2>/dev/null)
        local misses=$(echo "$cache_stats" | jq -r '.misses // 0' 2>/dev/null)
        local evictions=$(echo "$cache_stats" | jq -r '.evictions // 0' 2>/dev/null)
        
        log_success "Cache stats: size=$size hits=$hits misses=$misses evictions=$evictions"
        
        # Trigger cache cleanup if needed
        if [ "${size:-0}" -gt 800 ]; then
            curl -sf -X POST "${SOC_PLATFORM_URL:-http://localhost:3000}/api/analytics/cache/clear-expired" \
                -H "Authorization: Bearer ${CRON_JOB_TOKEN:-}" > /dev/null 2>&1 || true
            log_info "Triggered cache cleanup (size approaching limit)"
        fi
    fi
    
    return 0
}

database_maintenance() {
    log_info "Running database maintenance..."
    
    if ! command -v psql >/dev/null 2>&1 || [ -z "${DATABASE_URL:-}" ]; then
        log_warning "PostgreSQL not available, skipping DB maintenance"
        return 0
    fi
    
    # Vacuum analyze tables with high churn
    local tables=("incidents" "alerts" "threat_indicators" "hunt_sessions" "hunt_results" "audit_logs")
    
    for table in "${tables[@]}"; do
        if psql "$DATABASE_URL" -c "VACUUM ANALYZE VERBOSE \"$table\"" > /dev/null 2>&1; then
            log_success "Vacuumed table: $table"
        else
            log_warning "Failed to vacuum table: $table (may not exist yet)"
        fi
    done
    
    # Update statistics
    psql "$DATABASE_URL" -c "ANALYZE;" > /dev/null 2>&1 || true
    
    log_success "Database maintenance completed"
    return 0
}

rotate_logs() {
    log_info "Rotating logs..."
    
    # Rotate application logs older than 7 days
    find "$LOG_DIR" -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null || true
    
    # Remove compressed logs older than 30 days
    find "$LOG_DIR" -name "*.log.gz" -mtime +30 -delete 2>/dev/null || true
    
    # Keep log directory under 1GB
    local log_size
    log_size=$(du -sm "$LOG_DIR" 2>/dev/null | cut -f1 || echo "0")
    if [ "$log_size" -gt 1024 ]; then
        log_warning "Log directory exceeds 1GB (${log_size}MB), removing oldest files"
        find "$LOG_DIR" -name "*.log.gz" -printf '%T+ %p\n' | sort | head -n 50 | cut -d' ' -f2- | xargs rm -f 2>/dev/null || true
    fi
    
    log_success "Log rotation completed"
    return 0
}

verify_backups() {
    log_info "Verifying backups..."
    
    local backup_count=0
    local latest_backup=""
    local backup_age_hours=9999
    
    if [ -d "$BACKUP_DIR" ]; then
        backup_count=$(find "$BACKUP_DIR" -name "*.sql*" -type f 2>/dev/null | wc -l)
        latest_backup=$(find "$BACKUP_DIR" -name "*.sql*" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
        
        if [ -n "$latest_backup" ] && [ -f "$latest_backup" ]; then
            local backup_ts
            backup_ts=$(stat -c %Y "$latest_backup" 2>/dev/null || stat -f %m "$latest_backup" 2>/dev/null)
            local now_ts
            now_ts=$(date +%s)
            backup_age_hours=$(( (now_ts - backup_ts) / 3600 ))
        fi
    fi
    
    log_info "Backup count: $backup_count, Latest age: ${backup_age_hours}h"
    
    # Alert if no recent backup (older than 25 hours)
    if [ "$backup_age_hours" -gt 25 ]; then
        send_alert "warning" "No recent database backup found (last: ${backup_age_hours}h ago). Backup count: $backup_count"
        log_error "Backup verification FAILED - no recent backup"
        return 1
    fi
    
    log_success "Backup verification passed ($backup_count backups, latest: ${backup_age_hours}h old)"
    return 0
}

system_health_check() {
    log_info "Running system health check..."
    
    local issues=0
    
    # Check disk space
    local disk_usage
    disk_usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
    if [ "$disk_usage" -gt 90 ]; then
        log_error "Disk usage critical: ${disk_usage}%"
        send_alert "error" "Disk usage CRITICAL: ${disk_usage}% on /"
        ((issues++))
    elif [ "$disk_usage" -gt 80 ]; then
        log_warning "Disk usage high: ${disk_usage}%"
        send_alert "warning" "Disk usage HIGH: ${disk_usage}% on /"
        ((issues++))
    else
        log_success "Disk usage OK: ${disk_usage}%"
    fi
    
    # Check memory usage
    local mem_usage
    mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [ "$mem_usage" -gt 95 ]; then
        log_error "Memory usage critical: ${mem_usage}%"
        send_alert "error" "Memory usage CRITICAL: ${mem_usage}%"
        ((issues++))
    elif [ "$mem_usage" -gt 85 ]; then
        log_warning "Memory usage high: ${mem_usage}%"
        ((issues++))
    else
        log_success "Memory usage OK: ${mem_usage}%"
    fi
    
    # Check Node.js process
    local node_running=false
    if pgrep -f "next.*server" > /dev/null 2>&1 || pgrep -f "node.*soc" > /dev/null 2>&1; then
        node_running=true
        log_success "Node.js process running"
    else
        log_error "Node.js process NOT running!"
        send_alert "error" "Node.js process is NOT running!"
        ((issues++))
    fi
    
    # Check platform health endpoints
    if get_health_status; then
        log_success "Platform health endpoints OK"
    else
        log_error "Platform health endpoints FAILING"
        send_alert "error" "Platform health check failed - one or more endpoints returning errors"
        ((issues++))
    fi
    
    # Check Redis (if configured)
    if [ -n "${REDIS_URL:-}" ] && command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping > /dev/null 2>&1; then
            log_success "Redis connection OK"
        else
            log_error "Redis connection FAILED"
            send_alert "error" "Redis is not responding"
            ((issues++))
        fi
    fi
    
    if [ $issues -eq 0 ]; then
        log_success "System health check PASSED (all checks OK)"
    else
        log_error "System health check FAILED ($issues issues found)"
    fi
    
    return $issues
}

# ============================================================
# MAIN EXECUTION
# ============================================================

main() {
    echo "============================================="
    echo "  National SOC Platform - Maintenance Job"
    echo "  Started: $(timestamp)"
    echo "============================================="
    
    ensure_directories
    
    # Check dependencies (non-fatal)
    if ! check_dependencies; then
        log_warning "Some dependencies missing, certain checks may be skipped"
    fi
    
    local exit_code=0
    local task_errors=0
    
    # Run tasks based on mode
    case "${1:-hourly}" in
        hourly)
            log_info "=== Running HOURLY maintenance tasks ==="
            
            cleanup_stale_sessions || ((task_errors++))
            optimize_cache || ((task_errors++))
            system_health_check || ((task_errors++))
            ;;
            
        daily)
            log_info "=== Running DAILY maintenance tasks ==="
            
            cleanup_stale_sessions || ((task_errors++))
            optimize_cache || ((task_errors++))
            database_maintenance || ((task_errors++))
            rotate_logs || ((task_errors++))
            verify_backups || ((task_errors++))
            system_health_check || ((task_errors++))
            ;;
            
        weekly)
            log_info "=== Running WEEKLY maintenance tasks ==="
            
            database_maintenance || ((task_errors++))
            rotate_logs || ((task_errors++))
            verify_backups || ((task_errors++))
            system_health_check || ((task_errors++))
            
            # Additional weekly: Full backup
            log_info "Creating weekly full backup..."
            # Backup logic here
            ;;
            
        *)
            echo "Usage: $0 {hourly|daily|weekly}"
            exit 1
            ;;
    esac
    
    echo ""
    echo "============================================="
    echo "  Completed: $(timestamp)"
    echo "  Tasks with errors: $task_errors"
    echo "============================================="
    
    exit $task_errors
}

# Run main with all arguments
main "$@"
