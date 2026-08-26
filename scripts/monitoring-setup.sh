#!/bin/bash
# ===========================================
# National SOC Platform - Monitoring Stack Setup & Verification
# Algeria 2026-2030 | Production Deployment
#
# Usage:
#   ./scripts/monitoring-setup.sh          # Setup everything
#   ./scripts/monitoring-setup.sh verify   # Verify all services
#   ./scripts/monitoring-setup.sh status   # Check service health
#   ./scripts/monitoring-setup.sh test     # Test metrics endpoints
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/home/z/my-project"
cd "$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     📊 Algeria National SOC Platform - Monitoring Setup      ║${NC}"
echo -e "${BLUE}║              Prometheus + Grafana + Alertmanager             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "  ${GREEN}✅ $2${NC}"
    else
        echo -e "  ${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "  ${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "  ${BLUE}ℹ️  $1${NC}"
}

# Create required directories
setup_directories() {
    echo -e "${YELLOW}📁 Creating monitoring directories...${NC}"
    
    mkdir -p /var/lib/soc/prometheus-data
    mkdir -p /var/lib/soc/grafana-data
    mkdir -p /var/lib/soc/postgres-data
    
    # Set permissions
    chmod 755 /var/lib/soc/prometheus-data
    chmod 755 /var/lib/soc/grafana-data
    chmod 755 /var/lib/soc/postgres-data
    
    print_status 0 "Directories created"
}

# Verify configuration files
verify_configs() {
    echo ""
    echo -e "${YELLOW}📋 Verifying configuration files...${NC}"
    
    local all_good=0
    
    # Prometheus config
    if [ -f "docker/monitoring/prometheus/prometheus.yml" ]; then
        print_status 0 "prometheus.yml"
    else
        print_status 1 "prometheus.yml MISSING"
        all_good=1
    fi
    
    # Alert rules
    if [ -f "docker/monitoring/prometheus/rules/alerts.yml" ]; then
        print_status 0 "alerts.yml (40+ rules)"
    else
        print_status 1 "alerts.yml MISSING"
        all_good=1
    fi
    
    # Alertmanager config
    if [ -f "docker/monitoring/prometheus/alertmanager.yml" ]; then
        print_status 0 "alertmanager.yml"
    else
        print_status 1 "alertmanager.yml MISSING"
        all_good=1
    fi
    
    # Blackbox config
    if [ -f "docker/monitoring/prometheus/blackbox.yml" ]; then
        print_status 0 "blackbox.yml"
    else
        print_status 1 "blackbox.yml MISSING"
        all_good=1
    fi
    
    # Grafana datasources
    if [ -f "docker/monitoring/grafana/provisioning/datasources/datasource.yml" ]; then
        print_status 0 "Grafana datasource.yml"
    else
        print_status 1 "Grafana datasource.yml MISSING"
        all_good=1
    fi
    
    # Grafana dashboard provisioning
    if [ -f "docker/monitoring/grafana/provisioning/dashboards/dashboard.yml" ]; then
        print_status 0 "Grafana dashboard.yml"
    else
        print_status 1 "Grafana dashboard.yml MISSING"
        all_good=1
    fi
    
    return $all_good
}

# Verify Grafana dashboards
verify_dashboards() {
    echo ""
    echo -e "${YELLOW}📊 Verifying Grafana dashboards...${NC}"
    
    local dashboards=(
        "docker/monitoring/grafana/dashboards/infrastructure/system-overview.json"
        "docker/monitoring/grafana/dashboards/application/performance.json"
        "docker/monitoring/grafana/dashboards/database/postgresql.json"
        "docker/monitoring/grafana/dashboards/cache/redis-dashboard.json"
        "docker/monitoring/grafana/dashboards/security/soc-security-dashboard.json"
        "docker/monitoring/grafana/dashboards/soc-operations-dashboard.json"
        "docker/monitoring/grafana/dashboards/soc-telecom-dashboard.json"
    )
    
    local all_present=0
    for db in "${dashboards[@]}"; do
        if [ -f "$db" ]; then
            print_status 0 "$(basename $db)"
        else
            print_status 1 "$(basename $db) MISSING"
            all_present=1
        fi
    done
    
    return $all_present
}

# Verify docker-compose has monitoring services
verify_docker_compose() {
    echo ""
    echo -e "${YELLOW}🐳 Verifying docker-compose monitoring services...${NC}"
    
    local services=("prometheus" "grafana" "alertmanager" "node-exporter" "postgres-exporter" "redis-exporter" "blackbox-exporter")
    
    for service in "${services[@]}"; do
        if grep -q "^  $service:" docker-compose.yml; then
            print_status 0 "$service service"
        else
            print_status 1 "$service service MISSING"
        fi
    done
}

# Start monitoring services
start_services() {
    echo ""
    echo -e "${YELLOW}🚀 Starting monitoring stack...${NC}"
    
    docker-compose up -d \
        prometheus grafana alertmanager \
        node-exporter postgres-exporter redis-exporter \
        blackbox-exporter nginx-exporter \
        2>&1 | grep -E "(Creating|Starting|Recreating)" || true
    
    echo ""
    sleep 5
}

# Check service health
check_health() {
    echo ""
    echo -e "${YELLOW}🏥 Checking service health...${NC}"
    
    declare -A ports=(
        ["soc-prometheus"]="9090"
        ["soc-grafana"]="3001"
        ["soc-alertmanager"]="9093"
        ["soc-node-exporter"]="9100"
        ["soc-postgres-exporter"]="9187"
        ["soc-redis-exporter"]="9121"
        ["soc-blackbox-exporter"]="9115"
        ["soc-nginx-exporter"]="9113"
    )
    
    for container in "${!ports[@]}"; do
        port=${ports[$container]}
        
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            # Try to curl the endpoint (with retry)
            if curl -s --connect-timeout 3 "http://localhost:$port" > /dev/null 2>&1 || \
               curl -s --connect-timeout 3 "http://localhost:$port/-/healthy" > /dev/null 2>&1 || \
               curl -s --connect-timeout 3 "http://localhost:$port/metrics" > /dev/null 2>&1; then
                print_status 0 "$container (port $port) - HEALTHY"
            else
                print_warning "$container (port $port) - RUNNING but not responding yet"
            fi
        else
            print_status 1 "$container (port $port) - NOT RUNNING"
        fi
    done
}

# Test Prometheus targets
test_prometheus() {
    echo ""
    echo -e "${YELLOW}🔍 Testing Prometheus targets...${NC}"
    
    # Wait for Prometheus to be ready
    sleep 3
    
    # Get target status
    local targets=$(curl -s 'http://localhost:9090/api/v1/targets' 2>/dev/null || echo "{}")
    
    if [ "$targets" != "{}" ]; then
        local active=$(echo "$targets" | jq '.data.activeTargets | length')
        local down=$(echo "$targets" | jq '[.data.activeTargets[] | select(.health=="down")] | length')
        
        print_info "Active targets: $active"
        print_info "Down targets: ${down:-0}"
        
        if [ "${down:-0}" -eq 0 ] && [ "$active" -gt 0 ]; then
            print_status 0 "All Prometheus targets healthy"
        else
            print_warning "Some targets may be down (check above)"
        fi
        
        # List targets
        echo ""
        print_info "Target details:"
        echo "$targets" | jq -r '.data.activeTargets[]? | "  \(.labels.job // "unknown") -> \(.health // "unknown") [\(.scrapeUrl // "N/A")]"' 2>/dev/null || true
    else
        print_warning "Cannot connect to Prometheus API"
    fi
}

# Test custom SOC metrics endpoint
test_soc_metrics() {
    echo ""
    echo -e "${YELLOW📡 Testing SOC application metrics endpoint...${NC}"
    
    # Try localhost first, then container name
    local metrics=""
    
    if curl -s --connect-timeout 5 http://localhost:3000/api/metrics/prometheus > /dev/null 2>&1; then
        metrics=$(curl -s http://localhost:3000/api/metrics/prometheus)
    elif docker exec soc-app curl -s http://localhost:3000/api/metrics/prometheus > /dev/null 2>&1; then
        metrics=$(docker exec soc-app curl -s http://localhost:3000/api/metrics/prometheus)
    fi
    
    if [ -n "$metrics" ]; then
        print_status 0 "Metrics endpoint responding"
        
        # Count metrics
        local alert_count=$(echo "$metrics" | grep -c "^soc_alerts_" || true)
        local incident_count=$(echo "$metrics" | grep -c "^soc_incidents_" || true)
        local telecom_count=$(echo "$metrics" | grep -c "^telecom_" || true)
        
        print_info "Alert metrics: $alert_count"
        print_info "Incident metrics: $incident_count"
        print_info "Telecom metrics: $telecom_count"
        
        # Show sample output
        echo ""
        print_info "Sample metrics output:"
        echo "$metrics" | head -30 | sed 's/^/    /'
    else
        print_warning "SOC app not running or metrics endpoint not accessible"
        print_info "Start with: docker-compose up -d soc-app postgres redis"
    fi
}

# Test Grafana dashboards loading
test_grafana() {
    echo ""
    echo -e "${YELLOW}🎨 Testing Grafana dashboard provisioning...${NC}"
    
    # Wait for Grafana to start
    sleep 5
    
    # Search for dashboards via API
    local response=$(curl -s -u admin:${GRAFANA_ADMIN_PASSWORD:-admin} 'http://localhost:3001/api/search' 2>/dev/null || echo "")
    
    if [ -n "$response" ] && echo "$response" | jq -e '.[]' > /dev/null 2>&1; then
        local count=$(echo "$response" | jq '. | length')
        print_status 0 "Grafana API accessible - $count dashboards found"
        
        echo ""
        print_info "Loaded dashboards:"
        echo "$response" | jq -r '.[].title' | sed 's/^/    • /'
    else
        print_warning "Grafana not ready or no dashboards loaded yet"
        print_info "Check logs: docker logs soc-grafana"
    fi
}

# Show access information
show_access_info() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 Monitoring Stack Setup Complete!${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Access URLs:${NC}"
    echo -e "  📊 Grafana:      ${GREEN}http://localhost:3001${NC} (admin/${GRAFANA_ADMIN_PASSWORD:-admin})"
    echo -e "  🔥 Prometheus:   ${GREEN}http://localhost:9090${NC}"
    echo -e "  🔔 Alertmanager: ${GREEN}http://localhost:9093${NC}"
    echo ""
    echo -e "${YELLOW}Available Dashboards (7 total):${NC}"
    echo -e "  1. 🖥️ System Infrastructure Overview"
    echo -e "  2. 🚀 Application Performance"
    echo -e "  3. 🗄️ PostgreSQL Database"
    echo -e "  4. ⚡ Redis Cache"
    echo -e "  5. 🛡️ Security Operations"
    echo -e "  6. 📡 Telecom Operators"
    echo -e "  7. 🇩🇿 SOC Main Operations"
    echo ""
    echo -e "${YELLOW}Quick Commands:${NC}"
    echo -e "  View logs:       docker logs -f soc-prometheus"
    echo -e "  Reload config:   curl -X POST http://localhost:9090/-/reload"
    echo -e "  Test alerts:     curl http://localhost:9093/-/healthy"
    echo -e "  Full status:     $0 status"
    echo ""
}

# Main command handler
case "${1:-setup}" in
    setup)
        setup_directories
        verify_configs
        verify_dashboards
        verify_docker_compose
        start_services
        sleep 10
        check_health
        show_access_info
        ;;
    verify)
        verify_configs
        verify_dashboards
        verify_docker_compose
        ;;
    status)
        check_health
        test_prometheus
        ;;
    test)
        test_prometheus
        test_soc_metrics
        test_grafana
        ;;
    start)
        start_services
        sleep 8
        check_health
        ;;
    *)
        echo "Usage: $0 {setup|verify|status|test|start}"
        echo ""
        echo "Commands:"
        echo "  setup   - Full setup with directory creation and service start"
        echo "  verify  - Verify all configuration files exist"
        echo "  status  - Check health of all monitoring services"
        echo "  test    - Run full tests on Prometheus, Metrics, Grafana"
        echo "  start   - Start only monitoring services"
        exit 1
        ;;
esac
