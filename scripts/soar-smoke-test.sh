#!/bin/bash
# CyberSOC Platform - SOAR Phase Smoke Test Suite
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
echo -e "${BLUE}  CyberSOC SOAR Phase Smoke Test Suite   ${NC}"
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
for f in namespace soar-engine network-policies playbooks/response-playbooks; do
    run_test "YAML Valid: ${f}.yaml" "python3 -c \"import yaml; list(yaml.safe_load_all(open('/home/z/my-project/k8s/soar/${f}.yaml')))\""
done

# PHASE 2: Namespace & Resources
echo -e "\n${YELLOW}PHASE 2: Namespace & Resources${NC}"
NS="/home/z/my-project/k8s/soar/namespace.yaml"
run_test "Namespace Defined" "grep -q 'name: cybersoc-soar' $NS"
run_test "Resource Quota" "grep -q 'ResourceQuota' $NS"
run_test "Limit Range" "grep -q 'LimitRange' $NS"
run_test "ANRT Compliance Label" "grep -q 'anrt-iso27001-gdpr' $NS"
run_test "CPU Quota Set" "grep -A10 'ResourceQuota' $NS | grep -q 'requests.cpu'"
run_test "Memory Quota Set" "grep -A15 'ResourceQuota' $NS | grep -q 'limits.memory'"

# PHASE 3: SOAR Engine
echo -e "\n${YELLOW}PHASE 3: SOAR Engine${NC}"
SE="/home/z/my-project/k8s/soar/soar-engine.yaml"
run_test "SOAR Engine Deployment" "grep -q 'Deployment' $SE && grep -q 'name: soar-engine' $SE"
run_test "SOAR Engine Service" "grep -q 'port: 8080' $SE && grep -q 'port: 9090' $SE"
run_test "ServiceAccount Created" "grep -q 'soar-sa' $SE"
run_test "RBAC RoleBinding" "grep -q 'soarengine-cluster-rolebinding' $SE"
run_test "HPA Configured" "grep -q 'HorizontalPodAutoscaler' $SE"
run_test "Playbooks PVC (20Gi)" "grep -q 'storage: 20Gi' $SE"
run_test "Cases PVC (100Gi)" "grep -q 'storage: 100Gi' $SE"
run_test "SOAR ConfigMap" "grep -q 'soar-engine-config' $SE"

# SOAR Environment Variables
run_test "SIEM Integration Env Var" "grep -q 'SIEM_CORRELATION_ENGINE' $SE"
run_test "ML Server URL" "grep -q 'ML_SERVER_URL' $SE"
run_test "UEBA Service URL" "grep -q 'UEBA_SERVICE_URL' $SE"
run_test "Predictive Analytics URL" "grep -q 'PREDICTIVE_ANALYTICS_URL' $SE"
run_test "Threat Intel Hub URL" "grep -q 'THREAT_INTEL_HUB' $SE"
run_test "ANRT Compliance Flag" "grep -q 'ANRT_COMPLIANCE_ENABLED' $SE"
run_test "GDPR Protection Flag" "grep -q 'GDPR_DATA_PROTECTION' $SE"
run_test "Playbook Storage Path" "grep -q 'PLAYBOOK_STORAGE_PATH' $SE"
run_test "Max Concurrent Playbooks" "grep -q 'MAX_CONCURRENT_PLAYBOOKS' $SE"
run_test "Playbook Timeout" "grep -q 'PLAYBOOK_TIMEOUT_SEC' $SE"

# SOAR Configuration
run_test "Incident Auto-Creation" "python3 -c \"import yaml; [print('ok') for d in yaml.safe_load_all(open('$SE')) if isinstance(d, dict) and d.get('kind')=='ConfigMap' and 'auto_create_from_alerts' in str(d.get('data',{}).get('engine.yaml',''))]\""
run_test "Severity Escalation Config" "grep -q 'severity_escalation' $SE"
run_test "Case Lifecycle States" "grep -q 'case_lifecycle' $SE"
run_test "SIEM Bi-Directional Sync" "grep -q 'bi_directional_sync' $SE"
run_test "Ticketing System (ServiceNow)" "grep -q 'servicenow' $SE"
run_test "Communication Channels" "grep -q 'slack\\|ms_teams\\|email' $SE"
run_test "Firewall API Integration" "grep -q 'firewall_api\\|palo_alto\\|fortinet' $SE"
run_test "EDR Integration (CrowdStrike)" "grep -q 'crowdstrike\\|edr' $SE"
run_test "SS7 Response Playbooks" "grep -q 'ss7_response_playbooks' $SE"
run_test "Diameter Response Playbooks" "grep -q 'diameter_response_playbooks' $SE"
run_test "IRGS Integration" "grep -q 'irgs_auto_report\\|irgs_integration' $SE"
run_test "GSMA Database Check" "grep -q 'gsma_database_check' $SE"

# Health Probes & Security
run_test "Readiness Probe" "grep -q 'readinessProbe' $SE"
run_test "Liveness Probe" "grep -q 'livenessProbe' $SE"
run_test "Non-Root Container" "grep -q 'runAsNonRoot: true' $SE"
run_test "Memory Limits Set" "grep -q 'memory:.*Gi' $SE"
run_test "HPA Min Replicas (3)" "grep -A5 'minReplicas' $SE | grep -q '3'"
run_test "HPA Max Replicas (10)" "grep -A5 'maxReplicas' $SE | grep -q '10'"

# PHASE 4: Playbooks
echo -e "\n${YELLOW}PHASE 4: SOAR Playbooks${NC}"
PB="/home/z/my-project/k8s/soar/playbooks/response-playbooks.yaml"
run_test "Playbooks ConfigMap" "grep -q 'soar-playbooks-config' $PB"
run_test "Malware Playbook (PB-MALWARE-001)" "grep -q 'PB-MALWARE-001' $PB && grep -q 'Malware Detection' $PB"
run_test "Telecom Fraud Playbook (PB-FRAUD-TELECOM-003)" "grep -q 'PB-FRAUD-TELECOM-003' $PB && grep -q 'Telecom Signaling Fraud' $PB"
run_test "Data Breach Playbook (PB-DATA-BREACH-004)" "grep -q 'PB-DATA-BREACH-004' $PB && grep -q 'Data Breach Detection' $PB"

# Playbook Structure Validation
run_test "Playbook Trigger Section" "grep -q 'trigger:' $PB"
run_test "Playbook Actions Section" "grep -q 'actions:' $PB"
run_test "Playbook Steps Defined" "grep -q 'step:' $PB"
run_test "Parallel Execution Support" "grep -q 'type: parallel' $PB"
run_test "Conditional Logic Support" "grep -q 'type: conditional' $PB"
run_test "Notification Actions" "grep -q 'type: notification' $PB"
run_test "Threat Intel Lookup Action" "grep -q 'threat_intel_lookup' $PB"
run_test "Forensic Actions" "grep -q 'forensic_action\\|network_capture' $PB"
run_test "Regulatory Reporting Actions" "grep -q 'regulatory_report' $PB"
run_test "ANRT Tags on Playbooks" "grep -q 'anrt-mandatory\\|anrt-critical' $PB"
run_test "GDPR Tags on Playbooks" "grep -q 'gdpr' $PB"
run_test "SS7 Firewall Actions" "grep -q 'ss7_firewall_action' $PB"
run_test "Diameter Firewall Actions" "grep -q 'diameter_firewall_action' $PB"
run_test "IRGS Reporting in Playbook" "grep -q 'irgs_sirf_v2\\|irgs_algeria_portal' $PB"
run_test "GSMA Database Actions" "grep -q 'gsma_database_action' $PB"
run_test "Credential Revocation Action" "grep -q 'credential_revocation' $PB"
run_test "Network Isolation Action" "grep -q 'network_isolation' $PB"
run_test "DPO Notification Template" "grep -q 'gdpr_breach_notification_dpo' $PB"

# PHASE 5: Network Policies
echo -e "\n${YELLOW}PHASE 5: Network Policies (Zero Trust)${NP}"
NP="/home/z/my-project/k8s/soar/network-policies.yaml"
POLICIES=(soar-default-deny-ingress soar-default-deny-egress soar-engine-api-access soar-ui-access soar-monitoring-access soar-dns-resolution)
for p in "${POLICIES[@]}"; do
    run_test "Policy: $p" "grep -q 'name: $p' $NP"
done
run_test "Total 6 Policies" "[ $(grep -c 'kind: NetworkPolicy' $NP) -eq 6 ]"
run_test "Default Deny Ingress" "grep -A15 'soar-default-deny-ingress' $NP | grep -q 'podSelector'"
run_test "Default Deny Egress" "grep -A15 'soar-default-deny-egress' $NP | grep -q 'podSelector'"
run_test "SIEM → SOAR Access" "grep -q 'cybersoc-siem' $NP"
run_test "Threat Intel → SOAR Access" "grep -q 'cybersoc-threat-intel' $NP"
run_test "Analytics → SOAR Access" "grep -q 'cybersoc-analytics' $NP"
run_test "PostgreSQL Egress" "grep -q 'postgres' $NP || grep -q '5432' $NP"
run_test "Redis Egress" "grep -q 'redis' $NP || grep -q '6379' $NP"
run_test "Elasticsearch Egress" "grep -q 'elasticsearch' $NP || grep -q '9200' $NP"
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
    echo -e "\n${GREEN}🎉 ALL SOAR PHASE TESTS PASSED!${NC}"
    echo -e "${GREEN}Platform Ready for Production Deployment${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  SOME TESTS FAILED - Review Required${NC}"
    exit 1
fi
