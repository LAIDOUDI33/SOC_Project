#!/usr/bin/env bash
# =============================================================================
# National SOC Platform - Maintenance Cleanup Script
# Module 9: Production Deployment Scripts
#
# This script handles routine maintenance cleanup:
#   - Prune unused Docker images and volumes
#   - Rotate and compress log files
#   - Clean up temporary files
#   - Remove old backups per retention policy
#   - Clear cache directories
#
# Usage:
#   ./cleanup.sh [command] [options]
#
# Commands:
#   all           Run all cleanup tasks
#   docker        Clean Docker resources (images, containers, volumes)
#   logs          Rotate and clean log files
#   backups       Remove old backups per retention policy
#   temp          Clean temporary files and caches
#   disk          Show disk usage analysis
#
# Options:
#   --dry-run     Show what would be deleted without deleting
#   --force       Skip confirmation prompts
#   --verbose     Show detailed output
#   --older-than  Age threshold for deletion (default: 7d)
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.prod.yml"
LOG_DIR="/var/log/soc"
BACKUP_DIR="/var/backups/soc"
TEMP_DIR="/tmp/soc"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default values
COMMAND="${1:-all}"
shift || true
DRY_RUN=false
FORCE=false
VERBOSE=false
OLDER_THAN="7d"

# Cleanup thresholds (configurable)
DOCKER_IMAGE_AGE="24h"      # Prune images older than this
DOCKER_CONTAINER_STATE="exited"  # Remove containers in this state
LOG_RETENTION_DAYS=30       # Keep logs for this many days
BACKUP_RETENTION_DAYS=7     # Keep backups for this many days
TEMP_MAX_AGE="1d"           # Max age for temp files

# Track cleanup statistics
TOTAL_FREED=0

# =============================================================================
# Utility Functions
# =============================================================================

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%H:%M:%S') - $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') - $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') - $*" >&2; }
log_debug() { [[ "${VERBOSE}" == "true" ]] && echo -e "${BLUE}[DEBUG]${NC} $(date '+%H:%M:%S') - $*"; }
log_action() { echo -e "${CYAN}[CLEAN]${NC} $*"; }

show_banner() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     National SOC Platform - Maintenance Cleanup            ║
║     Algeria (2026-2030)                                   ║
║                                                           ║
║     This script performs routine maintenance cleanup.    ║
║     Review actions before proceeding!                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") [command] [options]

Commands:
    all         Run all cleanup tasks
    docker      Clean Docker resources (images, containers, volumes, networks)
    logs        Rotate and clean old log files
    backups     Remove old backups per retention policy
    temp        Clean temporary files and caches
    disk        Show detailed disk usage analysis

Options:
    --dry-run     Show what would be deleted without actually deleting
    --force       Skip confirmation prompts
    --verbose     Show detailed output of all operations
    --older-than  Age threshold for file deletion (default: 7d)
                    Examples: 1h, 7d, 4w, 6m, 1y
    -h, --help    Show this help message

Examples:
    $(basename "$0") all                      # Full cleanup with confirmations
    $(basename "$0") all --force              # Full cleanup without prompting
    $(basename "$0") docker --dry-run          # Preview Docker cleanup
    $(basename "$0") logs --older-than 30d    # Clean logs older than 30 days
    $(basename "$0") disk                     # Show disk usage analysis

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)     DRY_RUN=true; shift ;;
            --force)       FORCE=true; shift ;;
            --verbose)     VERBOSE=true; shift ;;
            --older-than)  OLDER_THAN="$2"; shift 2 ;;
            -h|--help)     show_usage; exit 0 ;;
            *) log_error "Unknown option: $1"; exit 1 ;;
        esac
    done
}

confirm_action() {
    if [[ "${FORCE}" == "true" ]] || [[ "${DRY_RUN}" == "true" ]]; then
        return 0
    fi
    
    read -rp "Continue with cleanup? [y/N] " confirm
    [[ "${confirm}" == "y" || "${confirm}" == "Y" ]]
}

human_size() {
    local bytes=$1
    if [[ ${bytes} -ge 1073741824 ]]; then
        echo "$(echo "scale=1; ${bytes}/1073741824" | bc)GB"
    elif [[ ${bytes} -ge 1048576 ]]; then
        echo "$(echo "scale=1; ${bytes}/1048576" | bc)MB"
    elif [[ ${bytes} -ge 1024 ]]; then
        echo "$(echo "scale=1; ${bytes}/1024" | bc)KB"
    else
        echo "${bytes}B"
    fi
}

track_freed() {
    local bytes=$1
    TOTAL_FREED=$((TOTAL_FREED + bytes))
}

# =============================================================================
# Docker Cleanup
# =============================================================================

cleanup_docker() {
    log_step "Docker Resource Cleanup"
    
    # Check Docker is available
    if ! docker info &>/dev/null; then
        log_warn "Docker daemon not running, skipping Docker cleanup"
        return
    fi
    
    # Stopped containers
    log_info "Checking for stopped containers..."
    local stopped_containers
    stopped_containers=$(docker ps -a -f "status=${DOCKER_CONTAINER_STATE}" -q 2>/dev/null)
    
    if [[ -n "${stopped_containers}" ]]; then
        local count
        count=$(echo "${stopped_containers}" | wc -l)
        log_action "Found ${count} stopped container(s)"
        
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY-RUN] Would remove: ${stopped_containers}"
        else
            echo "${stopped_containers}" | xargs docker rm 2>/dev/null || true
            log_info "Removed ${count} stopped container(s)"
        fi
    else
        log_info "No stopped containers to remove"
    fi
    
    # Unused images
    log_info "Checking for unused images..."
    local image_output
    image_output=$(docker image prune -af --filter "until=${DOCKER_IMAGE_AGE}" 2>&1) || true
    
    if echo "${image_output}" | grep -q "Total reclaimed space"; then
        local reclaimed
        reclaimed=$(echo "${image_output}" | grep "Total reclaimed space" | grep -oP '[\d.]+[KMG]*B')
        log_action "Reclaimed image space: ${reclaimed}"
    else
        log_info "No unused images to prune"
    fi
    
    # Dangling images specifically
    log_info "Removing dangling images..."
    if [[ "${DRY_RUN}" != "true" ]]; then
        docker image prune -f 2>/dev/null || true
    fi
    
    # Unused volumes (with caution!)
    log_info "Checking for unused volumes..."
    local volume_count
    volume_count=$(docker volume ls -q -f dangling=true 2>/dev/null | wc -l)
    
    if [[ ${volume_count} -gt 0 ]]; then
        log_action "Found ${volume_count} unused volume(s)"
        
        if [[ "${FORCE}" == "true" ]] || [[ "${DRY_RUN}" == "true" ]]; then
            if [[ "${DRY_RUN}" == "true" ]]; then
                log_info "[DRY-RUN] Would prune unused volumes"
            else
                docker volume prune -f 2>/dev/null || true
                log_info "Pruned unused volumes"
            fi
        else
            log_warn "Skipping volume cleanup (use --force to enable)"
            log_warn "WARNING: Volume deletion is irreversible!"
        fi
    fi
    
    # Unused networks
    log_info "Cleaning unused networks..."
    if [[ "${DRY_RUN}" != "true" ]]; then
        docker network prune -f 2>/dev/null || true
    fi
    
    # Build cache
    log_info "Cleaning build cache..."
    if [[ "${DRY_RUN}" != "true" ]]; then
        docker builder prune -f 2>/dev/null || true
    fi
    
    log_info "Docker cleanup completed"
}

# =============================================================================
# Log Cleanup
# =============================================================================

cleanup_logs() {
    log_step "Log File Cleanup"
    
    # Ensure log directory exists
    mkdir -p "${LOG_DIR}"
    
    # Find old log files
    log_info "Finding log files older than ${LOG_RETENTION_DAYS} days..."
    
    local old_logs
    old_logs=$(find "${LOG_DIR}" -type f -name "*.log*" -mtime +${LOG_RETENTION_DAYS} 2>/dev/null)
    
    if [[ -z "${old_logs}" ]]; then
        log_info "No old log files to clean"
        return
    fi
    
    local count size
    count=$(echo "${old_logs}" | wc -l)
    size=$(echo "${old_logs}" | xargs du -cb 2>/dev/null | tail -1 | cut -f1)
    
    log_action "Found ${count} log files ($(human_size ${size})) older than ${LOG_RETENTION_DAYS} days"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "${old_logs}" | while read -r f; do
            log_info "[DRY-RUN] Would delete: ${f}"
        done
        return
    fi
    
    if confirm_action "Delete ${count} old log files?"; then
        echo "${old_logs}" | xargs rm -f 2>/dev/null || true
        track_freed "${size}"
        log_info "Deleted ${count} old log files"
    fi
    
    # Compress large uncompressed logs
    log_info "Compressing large uncompressed logs..."
    find "${LOG_DIR}" -type f -name "*.log" ! -name "*.gz" -size +10M 2>/dev/null | while read -r logfile; do
        log_debug "Compressing: ${logfile}"
        gzip "${logfile}" 2>/dev/null || true
    done
    
    # Docker container logs cleanup
    log_info "Cleaning Docker container logs..."
    if [[ "${DRY_RUN}" != "true" ]]; then
        # Truncate container log files
        find /var/lib/docker/containers -name "*-json.log" -type f 2>/dev/null | while read -r logfile; do
            : > "${logfile}" 2>/dev/null || true
        done
        log_info "Docker container logs truncated"
    fi
    
    log_info "Log cleanup completed"
}

# =============================================================================
# Backup Cleanup
# =============================================================================

cleanup_backups() {
    log_step "Backup Cleanup (Retention: ${BACKUP_RETENTION_DAYS} days)"
    
    # Ensure backup directory exists
    mkdir -p "${BACKUP_DIR}"
    
    # Find old pre-deploy backups
    log_info "Finding backups older than ${BACKUP_RETENTION_DAYS} days..."
    
    local old_backups
    old_backups=$(find "${BACKUP_DIR}" -maxdepth 1 -name "pre-deploy-*" -type f -mtime +${BACKUP_RETENTION_DAYS} 2>/dev/null)
    
    if [[ -z "${old_backups}" ]]; then
        log_info "No old backups to clean"
        return
    fi
    
    local count size
    count=$(echo "${old_backups}" | wc -l)
    size=$(echo "${old_backups}" | xargs du -cb 2>/dev/null | tail -1 | cut -f1)
    
    log_action "Found ${count} old backups ($(human_size ${size}))"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "${old_backups}" | while read -r f; do
            log_info "[DRY-RUN] Would delete: $(basename ${f})"
        done
        return
    fi
    
    if confirm_action "Delete ${count} old backup(s)?"; then
        echo "${old_backups}" | xargs rm -f 2>/dev/null || true
        track_freed "${size}"
        log_info "Deleted ${count} old backups"
    fi
    
    # Also clean archive subdirectory
    local old_archives
    old_archives=$(find "${BACKUP_DIR}/archives" -type f -mtime +${BACKUP_RETENTION_DAYS} 2>/dev/null)
    
    if [[ -n "${old_archives}" ]]; then
        local arch_size
        arch_size=$(echo "${old_archives}" | xargs du -cb 2>/dev/null | tail -1 | cut -f1)
        
        if confirm_action "Delete old archives?"; then
            echo "${old_archives}" | xargs rm -f 2>/dev/null || true
            track_freed "${arch_size}"
            log_info "Deleted old archives"
        fi
    fi
    
    log_info "Backup cleanup completed"
}

# =============================================================================
# Temp Files Cleanup
# =============================================================================

cleanup_temp() {
    log_step "Temporary Files Cleanup"
    
    # SOC-specific temp directory
    if [[ -d "${TEMP_DIR}" ]]; then
        log_info "Cleaning SOC temp directory: ${TEMP_DIR}"
        
        local temp_files
        temp_files=$(find "${TEMP_DIR}" -type f -mtime +1 2>/dev/null)
        
        if [[ -n "${temp_files}" ]]; then
            local size
            size=$(echo "${temp_files}" | xargs du -cb 2>/dev/null | tail -1 | cut -f1)
            
            if [[ "${DRY_RUN}" == "true" ]]; then
                log_info "[DRY-RUN] Would clean temp files ($(human_size ${size}))"
            else
                find "${TEMP_DIR}" -type f -mtime +1 -delete 2>/dev/null || true
                track_freed "${size}"
                log_info "Cleaned temp files"
            fi
        else
            log_info "No old temp files"
        fi
    fi
    
    # System tmp files related to SOC
    log_info "Checking for SOC-related system temp files..."
    
    local soc_temp_files
    soc_temp_files=$(find /tmp -name "*soc*" -o -name "*wazuh*" -o -name "*suricata*" 2>/dev/null | head -20)
    
    if [[ -n "${soc_temp_files}" ]]; then
        log_action "Found SOC-related temp files in /tmp"
        
        if [[ "${DRY_RUN}" == "true" ]]; then
            echo "${soc_temp_files}" | while read -r f; do
                log_info "[DRY-RUN] Would delete: ${f}"
            done
        elif confirm_action "Delete SOC-related temp files from /tmp?"; then
            echo "${soc_temp_files}" | xargs rm -rf 2>/dev/null || true
            log_info "Cleaned SOC-related temp files"
        fi
    fi
    
    # Docker build temp
    log_info "Cleaning Docker build context temp..."
    if [[ -d "/var/lib/docker/tmp" ]] && [[ "${DRY_RUN}" != "true" ]]; then
        find /var/lib/docker/tmp -type f -mtime +1 -delete 2>/dev/null || true
    fi
    
    log_info "Temp cleanup completed"
}

# =============================================================================
# Disk Usage Analysis
# =============================================================================

show_disk_analysis() {
    log_step "Disk Usage Analysis"
    
    echo ""
    printf "%-40s %-15s %-10s %s\n" "PATH" "SIZE" "USAGE%" "TYPE"
    printf "%-40s %-15s %-10s %s\n" "─────────────────────────────────────" "───────────" "─────────" "─────"
    
    # Main partitions
    df -h | awk 'NR>1 {printf "%-40s %-15s %-10s %s\n", "Mount: "$6, $2, $5, "partition"}'
    
    echo ""
    
    # Docker data
    if command -v docker &>/dev/null && docker info &>/dev/null; then
        local docker_disk
        docker_disk=$(docker system df 2>/dev/null | tail -1)
        echo "--- Docker Disk Usage ---"
        docker system df 2>/dev/null
        echo ""
    fi
    
    # SOC directories
    echo "--- SOC Platform Directories ---"
    
    local dirs=(
        "/var/lib/soc|SOC Data"
        "/var/log/soc|SOC Logs"
        "/var/backups/soc|SOC Backups"
        "/opt/soc-platform|SOC Config"
    )
    
    IFS='|'
    for entry in "${dirs[@]}"; do
        read -r path desc <<< "${entry}"
        if [[ -d "${path}" ]]; then
            local size
            size=$(du -sh "${path}" 2>/dev/null | cut -f1)
            printf "%-40s %-15s\n" "${path} (${desc})" "${size}"
        fi
    done
    
    echo ""
    
    # Large files
    echo "--- Largest Files in SOC Directories ---"
    find /var/lib/soc /var/log/soc /var/backups/soc -type f -size +100M 2>/dev/null | \
        sort -k5 -rn | head -10 | while read -r f; do
        local fsize
        fsize=$(du -sh "${f}" 2>/dev/null | cut -f1)
        printf "  %-50s %s\n" "${f}" "${fsize}"
    done
    
    echo ""
    
    # Recommendations
    echo "--- Cleanup Recommendations ---"
    
    local disk_percent
    disk_percent=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    
    if [[ ${disk_percent} -gt 90 ]]; then
        echo -e "  ${RED}⚠ CRITICAL: Disk usage at ${disk_percent}%${NC}"
        echo "  Recommendation: Run full cleanup immediately"
    elif [[ ${disk_percent} -gt 80 ]]; then
        echo -e "  ${YELLOW}⚠ WARNING: Disk usage at ${disk_percent}%${NC}"
        echo "  Recommendation: Consider running cleanup"
    else
        echo -e "  ${GREEN}✓ OK: Disk usage at ${disk_percent}%${NC}"
    fi
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    parse_arguments "$@"
    show_banner
    
    case "${COMMAND}" in
        all)
            cleanup_docker
            cleanup_logs
            cleanup_backups
            cleanup_temp
            
            echo ""
            echo "═══════════════════════════════════════════════════════════"
            echo ""
            echo -e "  Total Space Freed: ${GREEN}$(human_size ${TOTAL_FREED})${NC}"
            echo ""
            echo "  Run './cleanup.sh disk' for detailed disk analysis"
            echo "═══════════════════════════════════════════════════════════"
            ;;
        docker)
            cleanup_docker
            ;;
        logs)
            cleanup_logs
            ;;
        backups)
            cleanup_backups
            ;;
        temp)
            cleanup_temp
            ;;
        disk)
            show_disk_analysis
            ;;
        *)
            log_error "Unknown command: ${COMMAND}"
            show_usage
            exit 1
            ;;
    esac
}

# Helper function for steps
log_step() {
    echo ""
    echo -e "${BLUE}━━━ $* ━━━${NC}"
    echo ""
}

main "$@"
