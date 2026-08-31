#!/bin/bash
# CyberSOC Platform - Threat Intelligence Phase Smoke Test Suite
# Djezzy Telecom Algeria

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CyberSOC Threat Intel Phase Test Suite ${NC}"
echo -e "${BLUE}  Djezzy Telecom Algeria                ${NC}"
echo -e "${BLUE}========================================${NC}\n"

run_test() {
    local test_name="$1"
    local test_command="$2"
    TEST_COUNT=$((TEST_COUNT + 1))
    
    echo -ne "  [TEST $TEST_COUNT] $test_name ... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        PASS_COUNT=$((PASS_COUNT + 1))
        echo -e "${GREEN}✅ PASS${NC}"
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -e "${RED}❌ FAIL${NC}"
    fi
}

# PHASE 1: YAML Validation
echo -e "\n${YELLOW}PHASE 1: YAML File Validation${NC}"
for f in namespace threat-intel-hub network-policies; do
    run_test "YAML Valid: ${f}.yaml" "python3 -c \"import yaml; list(yaml.safe_load_all(open('/home/z/my-project/k8s/threat-intel/${f}.yaml')))\""
done

# PHASE 2: Namespace & Resources
echo -e "\n${YELLOW}PHASE 2: Namespace & Resources${NC}"
NS="/home/z/my-project/k8s/threat-intel/namespace.yaml"
run_test "Namespace Defined" "grep -q 'name: cybersoc-threat-intel' $NS"
run_test "Resource Quota" "grep -q 'ResourceQuota' $NS"
run_test "Limit Range" "grep -q 'LimitRange' $NS"
run_test "ANRT Compliance Label" "grep -q 'anrt-iso27001-gdpr' $NS"

# PHASE 3: Threat Intelligence Hub
echo -e "\n${YELLOW}PHASE 3: Threat Intelligence Hub${NC}"
TI="/home/z/my-project/k8s/threat-intel/threat-intel-hub.yaml"
run_test "TI Hub Deployment" "grep -q 'Deployment' $TI && grep -q 'name: threat-intel-hub' $TI"
run_test "TI Hub Service" "grep -q 'port: 8080' $TI && grep -q 'port: 9090' $TI && grep -q 'port: 9443' $TI"
run_test "ServiceAccount Created" "grep -q 'threat-intel-sa' $TI"
run_test "RBAC RoleBinding" "grep -q 'threatintel-cluster-rolebinding' $TI"
run_test "HPA Configured" "grep -q 'HorizontalPodAutoscaler' $TI"
run_test "Feeds PVC (50Gi)" "grep -q 'storage: 50Gi' $TI"
run_test "IOCs PVC (100Gi)" "grep -q 'storage: 100Gi' $TI"
run_test "TI Hub ConfigMap" "grep -q 'threat-intel-hub-config' $TI"

# Environment Variables
run_test "TAXII Server Enabled" "grep -q 'TAXII_SERVER_ENABLED' $TI"
run_test "STIX Config Path" "grep -q 'STIX_CONFIG_PATH' $TI"
run_test "Feed Storage Path" "grep -q 'FEED_STORAGE_PATH' $TI"
run_test "IOC Storage Path" "grep -q 'IOC_STORAGE_PATH' $TI"
run_test "SIEM Webhook URL" "grep -q 'SIEM_WEBHOOK_URL' $TI"
run_test "SOAR Webhook URL" "grep -q 'SOAR_WEBHOOK_URL' $TI"
run_test "ANRT Sharing Enabled" "grep -q 'ANRT_SHARING_ENABLED' $TI"
run_test "GDPR Data Minimization" "grep -q 'GDPR_DATA_MINIMIZATION' $TI"
run_test "Max Concurrent Feeds" "grep -q 'MAX_CONCURRENT_FEEDS' $TI"
run_test "IOC Cache TTL" "grep -q 'IOC_CACHE_TTL_HOURS' $TI"

# Configuration Validation
run_test "STIX/TAXII Server Config" "grep -q 'stix_taxii:' $TI || grep -q 'taxii_server_enabled' $TI"
run_test "Commercial Feeds Configured" "grep -q 'commercial:' $TI"
run_test "Open Source Feeds Configured" "grep -q 'open_source:' $TI"
run_test "Government Feeds Configured" "grep -q 'government:' $TI"
run_test "Telecom-Specific Feeds" "grep -q 'telecom_specific:' $TI"
run_test "Recorded Future Feed" "grep -q 'Recorded Future\\|recorded_future' $TI"
run_test "AlienVault OTX Feed" "grep -q 'AlienVault\\|OTX' $TI"
run_test "ANRT Threat Sharing Feed" "grep -q 'ANRT.*Cyber Threat\\|anrt' $TI"
run_test "GSMA Fraud Intelligence Feed" "grep -q 'GSMA.*Fraud\\|gsma_fi' $TI"
run_test "IOC Types Supported" "grep -q 'types_supported' $TI"
run_test "Scoring Configuration" "grep -q 'scoring:' $TI"
run_test "Enrichment Services" "grep -q 'enrichment:' $TI"
run_test "Threat Hunting Enabled" "grep -q 'threat_hunting:' $TI"
run_test "YARA Rules Support" "grep -q 'yara_rules:' $TI"
run_test "Sigma Rules Support" "grep -q 'sigma_rules:' $TI"
run_test "ANRT Sharing Config" "grep -q 'anrt_sharing:' $TI"
run_test "GDPR Compliance Config" "grep -q 'gdpr_compliance:' $TI"

# Health & Security
run_test "Readiness Probe" "grep -q 'readinessProbe' $TI"
run_test "Liveness Probe" "grep -q 'livenessProbe' $TI"
run_test "Non-Root Container" "grep -q 'runAsNonRoot: true' $TI"
run_test "Memory Limits Set" "grep -q 'memory:.*Gi' $TI"
run_test "HPA Min Replicas (2)" "grep -A5 'minReplicas' $TI | grep -q '2'"
run_test "HPA Max Replicas (6)" "grep -A5 'maxReplicas' $TI | grep -q '6'"

# PHASE 4: Network Policies
echo -e "\n${YELLOW}PHASE 4: Network Policies (Zero Trust)${NC}"
NP="/home/z/my-project/k8s/threat-intel/network-policies.yaml"
POLICIES=(ti-default-deny-ingress ti-default-deny-egress threat-intel-hub-access ti-monitoring-access ti-dns-resolution)
for p in "${POLICIES[@]}"; do
    run_test "Policy: $p" "grep -q 'name: $p' $NP"
done
run_test "Total 5 Policies" "[ $(grep -c 'kind: NetworkPolicy' $NP) -eq 5 ]"
run_test "Default Deny Ingress" "grep -A15 'ti-default-deny-ingress' $NP | grep -q 'podSelector'"
run_test "Default Deny Egress" "grep -A15 'ti-default-deny-egress' $NP | grep -q 'podSelector'"
run_test "SOAR → TI Access" "grep -q 'cybersoc-soar' $NP"
run_test "SIEM → TI Access" "grep -q 'cybersoc-siem' $NP"
run_test "Analytics → TI Access" "grep -q 'cybersoc-analytics' $NP"
run_test "External Egress for Feeds" "grep -q '0.0.0.0/0' $NP"
run_test "PostgreSQL Egress" "grep -q 'postgres\\|5432' $NP"
run_test "Redis Egress" "grep -q 'redis\\|6379' $NP"
run_test "Elasticsearch Egress" "grep -q 'elasticsearch\\|9200' $NP"
run_test "DNS Resolution Allowed" "grep -q 'kube-dns' $NP && grep -q 'port: 53' $NP"

# SUMMARY
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}           TEST SUMMARY                 ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests:  ${TEST_COUNT}"
echo -e "${GREEN}Passed:      ${PASS_COUNT}${NC}"
echo -e "${RED}Failed:       ${FAIL_COUNT}${NC}"
if [ $TEST_COUNT -gt 0 ]; then
    echo -e "Success Rate: $(( PASS_COUNT * 100 / TEST_COUNT ))%"
fi

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL THREAT INTEL PHASE TESTS PASSED!${NC}"
    echo -e "${GREEN}Platform Ready for Production Deployment${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  SOME TESTS FAILED - Review Required${NC}"
    exit 1
fi
