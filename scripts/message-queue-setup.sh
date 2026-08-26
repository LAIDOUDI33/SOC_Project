#!/bin/bash
# ===========================================
# National SOC Platform - Message Queue Setup
# Algeria 2026-2030 | Production Setup Script
# 
# This script:
# - Verifies RabbitMQ connectivity
# - Tests queue topology
# - Validates event publishing/consuming
# - Monitors queue performance metrics
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  National SOC - Message Queue Setup${NC}"
echo -e "${BLUE}  Algeria 2026-2030 | High-Throughput Ready${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ===========================================
# Configuration
# ===========================================

RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
RABBITMGMT_PORT="${RABBITMGMT_PORT:-15672}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"
RABBITMQ_PASSWORD="${RABBITMQ_PASSWORD:-guest}"
RABBITMQ_VHOST="${RABBITMQ_VHOST:-/}"

APP_URL="${APP_URL:-http://localhost:3000}"

# ===========================================
# Functions
# ===========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_rabbitmq_cli() {
    if command -v rabbitmqctl &> /dev/null; then
        return 0
    else
        # Try docker-based access
        if docker compose ps rabbitmq &>/dev/null 2>&1; then
            RABBITMQ_CMD="docker compose exec -T rabbitmq rabbitmqctl"
            return 0
        fi
        return 1
    fi
}

test_rabbitmq_connection() {
    log_info "Testing RabbitMQ connection..."
    
    # Test AMQP port (5672)
    if nc -z "$RABBITMQ_HOST" "$RABBITMQ_PORT" 2>/dev/null; then
        log_success "AMQP port ($RABBITMQ_PORT) is open"
    else
        log_error "Cannot connect to AMQP port on $RABBITMQ_HOST:$RABBITMQ_PORT"
        return 1
    fi
    
    # Test Management UI port (15672)
    if nc -z "$RABBITMQ_HOST" "$RABBITMGMT_PORT" 2>/dev/null; then
        log_success "Management UI port ($RABBITMGMT_PORT) is open"
    else
        log_warning "Management UI port not accessible (optional)"
    fi
    
    # Test API connection
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
            "http://$RABBITMQ_HOST:$RABBITMGMT/api/overview" \
            2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "RabbitMQ API is responding"
            
            # Get cluster info
            CLUSTER_NAME=$(curl -s \
                -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
                "http://$RABBITMQ_HOST:$RABBITMGMT/api/cluster-name" \
                2>/dev/null || echo "unknown")
            echo -e "  Cluster Name: ${GREEN}$CLUSTER_NAME${NC}"
            
        else
            log_warning "RabbitMQ API returned HTTP $HTTP_CODE"
        fi
    fi
    
    return 0
}

verify_queue_topology() {
    log_info "Verifying queue topology..."
    
    if ! command -v curl &> /dev/null; then
        log_warning "curl not available, skipping topology check"
        return 0
    fi
    
    # Expected queues for SOC platform
    EXPECTED_QUEUES=(
        "soc.alerts.processing"
        "soc.alerts.notification"
        "soc.alerts.escalation"
        "soc.incidents.processing"
        "soc.incidents.workflow"
        "soc.incidents.sla"
        "soc.threats.processing"
        "soc.threats.enrichment"
        "soc.telecom.events"
        "soc.telecom.gtp"
        "soc.telecom.ss7"
        "soc.telecom.diameter"
        "soc.telecom.radius"
        "soc.telecom.sip"
        "soc.notifications"
        "soc.audit.logs"
        "soc.metrics"
        "soc.reports"
        "soc.dlq.alerts"
        "soc.dlq.incidents"
        "soc.dlq.threats"
        "soc.dlq.telecom"
        "soc.dlq.general"
    )
    
    QUEUES_FOUND=0
    QUEUES_MISSING=0
    
    for queue in "${EXPECTED_QUEUES[@]}"; do
        QUEUE_INFO=$(curl -s \
            -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
            "http://$RABBITMQ_HOST:$RABBITMGMT/api/queues/$RABBITMQ_VHOST/${queue//\//%2F}" \
            2>/dev/null)
        
        if [ -n "$QUEUE_INFO" ] && [ "$QUEUE_INFO" != "Not Found" ]; then
            ((QUEUES_FOUND++))
        else
            log_warning "Queue missing: $queue"
            ((QUEUES_MISSING++))
        fi
    done
    
    echo ""
    echo -e "Queues: ${GREEN}$QUEUES_FOUND found${NC}, ${RED}$QUEUES_MISSING missing${NC}"
    
    # Check exchanges
    EXPECTED_EXCHANGES=(
        "soc.events"
        "soc.alerts"
        "soc.incidents"
        "soc.threats"
        "soc.telecom"
        "soc.notifications.direct"
        "soc.commands"
        "soc.broadcast"
        "soc.cache.invalidations"
    )
    
    EXCHANGES_FOUND=0
    
    for exchange in "${EXPECTED_EXCHANGES[@]}"; do
        EXCHANGE_INFO=$(curl -s \
            -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
            "http://$RABBITMQ_HOST:$RABBITMGMT/api/exchanges/$RABBITMQ_VHOST/${exchange//\//%2F}" \
            2>/dev/null)
        
        if [ -n "$EXCHANGE_INFO" ] && [ "$EXCHANGE_INFO" != "Not Found" ]; then
            ((EXCHANGES_FOUND++))
        fi
    done
    
    echo -e "Exchanges: ${GREEN}$EXCHANGES_FOUND found${NC} of ${#EXPECTED_EXCHANGES[@]} expected"
    
    if [ "$QUEUES_MISSING" -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

test_message_publishing() {
    log_info "Testing message publishing..."
    
    # Use management API to publish test message
    TEST_PAYLOAD='{
        "properties": {},
        "routing_key": "alert.test",
        "payload": "{\"test\":true,\"timestamp\":\"'$(date -Iseconds)'\"}",
        "payload_encoding": "string"
    }'
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
        -H "Content-Type: application/json" \
        -d "$TEST_PAYLOAD" \
        "http://$RABBITMQ_HOST:$RABBITMGMT/api/exchanges/$RABBITMQ_VHOST/soc.events/publish" \
        2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        log_success "Message published successfully (HTTP $HTTP_CODE)"
        return 0
    else
        log_error "Failed to publish message (HTTP $HTTP_CODE)"
        return 1
    fi
}

display_queue_stats() {
    log_info "Current queue statistics:"
    
    if ! command -v curl &> /dev/null; then
        return
    fi
    
    echo ""
    echo -e "${YELLOW}=== Queue Statistics ===${NC}"
    
    # Get all queues with messages
    QUEUES_JSON=$(curl -s \
        -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
        "http://$RABBITMQ_HOST:$RABBITMGMT/api/queues/$RABBITMQ_VHOST" \
        2>/dev/null)
    
    if [ -n "$QUEUES_JSON" ] && [ "$QUEUES_JSON" != "[]" ]; then
        # Parse and display using jq if available
        if command -v jq &> /dev/null; then
            echo "$QUEUES_JSON" | jq -r '.[] | "\(.name): \(.messages) messages, \(.consumers) consumers"'
        else
            # Fallback: just show count
            QUEUE_COUNT=$(echo "$QUEUES_JSON" | grep -o '"name"' | wc -l)
            echo "Total queues configured: $QUEUE_COUNT"
        fi
    else
        echo "No queues found or cannot connect to management API"
    fi
    
    echo ""
    echo -e "${YELLOW}=== Node Statistics ===${NC}"
    
    NODES_JSON=$(curl -s \
        -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
        "http://$RABBITMQ_HOST:$RABBITMGMT/api/nodes" \
        2>/dev/null)
    
    if [ -n "$NODES_JSON" ] && [ "$NODES_JSON" != "[]" ]; then
        if command -v jq &> /dev/null; then
            echo "$NODES_JSON" | jq -r '.[] | "Node: \(.name) | Memory: \((.mem_used / 1024 / 1024)|round)MB | FDs: \(.fd_used)/\(.fd_total)"'
        fi
    fi
}

test_api_endpoint() {
    log_info "Testing queue management API..."
    
    if [ "$APP_URL" = "" ]; then
        log_warning "APP_URL not set, skipping API test"
        return
    fi
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "$APP_URL/api/queue?type=status" \
        2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Queue API is responding (HTTP $HTTP_CODE)"
        
        # Show response body
        RESPONSE=$(curl -s "$APP_URL/api/queue?type=status" 2>/dev/null || echo "{}")
        if command -v jq &> /dev/null; then
            echo "$RESPONSE" | jq '{status, connected, consumers}'
        else
            echo "$RESPONSE" | head -c 200
        fi
    else
        log_warning "Queue API returned HTTP $HTTP_CODE (may not be started yet)"
    fi
}

generate_report() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  Message Queue Setup Report${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo "RabbitMQ Host: $RABBITMQ_HOST:$RABBITMQ_PORT"
    echo "Management UI: http://$RABBITMQ_HOST:$RABBITMGMT_PORT"
    echo "App URL: $APP_URL"
    echo "Timestamp: $(date)"
    echo ""
    echo "Components Status:"
    echo "  - AMQP Connection: $(test_rabbitmq_connection >/dev/null 2>&1 && echo '✓ OK' || echo '✗ FAILED')"
    echo "  - Queue Topology: $(verify_queue_topology >/dev/null 2>&1 && echo '✓ OK' || echo '⚠ WARNING')"
    echo "  - Message Publishing: $(test_message_publishing >/dev/null 2>&1 && echo '✓ OK' || echo '✗ FAILED')"
    echo ""
    echo -e "${BLUE}============================================${NC}"
}

# ===========================================
# Main Execution
# ===========================================

main() {
    log_info "Starting Message Queue verification..."
    echo ""
    
    # Run tests
    test_rabbitmq_connection
    echo ""
    
    verify_queue_topology
    echo ""
    
    test_message_publishing
    echo ""
    
    display_queue_stats
    echo ""
    
    # Optional: Test API endpoint
    if [ "${1:-}" = "--verbose" ] || [ "${1:-}" = "-v" ]; then
        test_api_endpoint
        echo ""
    fi
    
    # Generate summary report
    generate_report
    
    log_success "Message Queue verification complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Access Management UI: http://$RABBITMQ_HOST:$RABBITMGMT_PORT"
    echo "  2. Monitor queues: GET /api/queue?type=status"
    echo "  3. View DLQ status: GET /api/queue?type=dlq"
    echo "  4. Publish test message: POST /api/queue {action:'publish-test', type:'alert.test'}"
    echo ""
    echo "Default credentials (change in production!):"
    echo "  Username: $RABBITMQ_USER"
    echo "  Password: $RABBITMQ_PASSWORD"
    echo ""
}

# Run main function with all arguments
main "$@"
