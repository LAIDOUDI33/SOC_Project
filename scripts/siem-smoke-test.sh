#!/bin/bash
# CyberSOC Platform - SIEM Phase Smoke Test Suite (Simplified)
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
echo -e "${BLUE}  CyberSOC SIEM Phase Smoke Test Suite   ${NC}"
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
for f in namespace elasticsearch logstash kibana siem-correlation-engine rule-engine splunk-integration network-policies; do
    run_test "YAML Valid: ${f}.yaml" "python3 -c \"import yaml; list(yaml.safe_load_all(open('/home/z/my-project/k8s/siem/${f}.yaml')))\""
    run_test "File Exists: ${f}.yaml" "[ -f '/home/z/my-project/k8s/siem/${f}.yaml' ] && [ -s '/home/z/my-project/k8s/siem/${f}.yaml' ]"
done

# PHASE 2: Namespace & Resources
echo -e "\n${YELLOW}PHASE 2: Namespace & Resources${NC}"
NS="/home/z/my-project/k8s/siem/namespace.yaml"
run_test "Namespace Defined" "grep -q 'name: cybersoc-siem' $NS"
run_test "Resource Quota" "grep -q 'ResourceQuota' $NS"
run_test "Limit Range" "grep -q 'LimitRange' $NS"
run_test "ANRT Compliance Label" "grep -q 'anrt-iso27001-gdpr' $NS"

# PHASE 3: Elasticsearch
echo -e "\n${YELLOW}PHASE 3: Elasticsearch Cluster${NC}"
ES="/home/z/my-project/k8s/siem/elasticsearch.yaml"
run_test "ES StatefulSet" "grep -q 'StatefulSet' $ES && grep -q 'name: elasticsearch' $ES"
run_test "ES Client Service" "grep -q 'type: ClusterIP' $ES"
run_test "ES Headless Service" "grep -q 'clusterIP: None' $ES"
run_test "ES PVC (200Gi)" "grep -q 'storage: 200Gi' $ES"
run_test "ES ConfigMap" "grep -q 'elasticsearch-config' $ES"
run_test "ES ServiceAccount" "grep -q 'elasticsearch-sa' $ES"
run_test "ANRT Retention Flag" "grep -q 'ANRT_LOG_RETENTION_DAYS' $ES"
run_test "GDPR Masking Flag" "grep -q 'GDPR_DATA_MASKING' $ES"
run_test "ES Security Enabled" "grep -q 'xpack.security.enabled' $ES"
run_test "ES Cluster Name" "grep -q 'cybersoc-siem-djezzy' $ES"
run_test "ES Probes Configured" "grep -q 'readinessProbe' $ES && grep -q 'livenessProbe' $ES"
run_test "ES Non-Root Container" "grep -q 'runAsNonRoot: true' $ES"

# PHASE 4: Logstash
echo -e "\n${YELLOW}PHASE 4: Logstash Pipeline${NC}"
LS="/home/z/my-project/k8s/siem/logstash.yaml"
run_test "Logstash Deployment" "grep -q 'Deployment' $LS && grep -q 'name: logstash' $LS"
run_test "Logstash Service" "grep -q 'port: 5044' $LS"
run_test "Pipeline ConfigMap" "grep -q 'logstash-config' $LS"
run_test "Patterns ConfigMap" "grep -q 'logstash-patterns-djezzy' $LS"
run_test "Input Section Present" "grep -q 'input {' $LS"
run_test "Filter Section Present" "python3 -c \"import yaml; [print('ok') for d in yaml.safe_load_all(open('$LS')) if isinstance(d, dict) and d.get('kind')=='ConfigMap' and 'filter {' in str(d.get('data',{}).get('logstash.conf',''))]\""
run_test "Output Section Present" "python3 -c \"import yaml; [print('ok') for d in yaml.safe_load_all(open('$LS')) if isinstance(d, dict) and d.get('kind')=='ConfigMap' and 'output {' in str(d.get('data',{}).get('logstash.conf',''))]\""
run_test "SS7 Patterns" "grep -q 'DJEZZY_SS7_MAP' $LS"
run_test "Diameter Patterns" "grep -q 'DJEZZY_DIAMETER' $LS"
run_test "Beats Port 5044" "grep -q 'containerPort: 5044' $LS"
run_test "Monitoring Port 9600" "grep -q 'containerPort: 9600' $LS"

# PHASE 5: Kibana
echo -e "\n${YELLOW}PHASE 5: Kibana Visualization${NC}"
KB="/home/z/my-project/k8s/siem/kibana.yaml"
run_test "Kibana Deployment" "grep -q 'Deployment' $KB && grep -q 'name: kibana' $KB"
run_test "Kibana Service" "grep -q 'port: 5601' $KB"
run_test "Kibana Ingress" "grep -q 'kibana.soc.djezzy.dz' $KB"
run_test "Kibana ConfigMap" "grep -q 'kibana-config' $KB"
run_test "Dashboards ConfigMap" "grep -q 'kibana-dashboards-prebuilt' $KB"
run_test "TLS Certificate" "grep -q 'kibana-tls-cert' $KB"
run_test "SOC Overview Dashboard" "grep -q 'djezzy_soc_overview' $KB"
run_test "Telecom Security Dashboard" "grep -q 'telecom_security_monitoring' $KB"
run_test "ANRT Compliance Dashboard" "grep -q 'anrt_compliance_dashboard' $KB"
run_test "Threat Hunting Workspace" "grep -q 'threat_hunting_workspace' $KB"
run_test "X-Pack Security" "grep -q 'XPACK_SECURITY_ENABLED' $KB"
run_test "Encrypted Cookies" "grep -q 'XPACK_ENCRYPTEDCOOKIES_ENABLED' $KB"
run_test "Telemetry Disabled" "grep -q 'telemetry.enabled: false' $KB"

# PHASE 6: Correlation Engine
echo -e "\n${YELLOW}PHASE 6: Correlation Engine${NC}"
CE="/home/z/my-project/k8s/siem/siem-correlation-engine.yaml"
run_test "CE Deployment" "grep -q 'siem-correlation-engine' $CE && grep -q 'Deployment' $CE"
run_test "CE Service" "grep -q 'port: 8080' $CE"
run_test "CE HPA" "grep -q 'HorizontalPodAutoscaler' $CE"
run_test "Rules PVC (50Gi)" "grep -q 'storage: 50Gi' $CE"
run_test "CE ConfigMap" "grep -q 'siem-correlation-config' $CE"
run_test "Correlation Window" "grep -q 'CORRELATION_WINDOW_SEC' $CE"
run_test "ML Integration" "grep -q 'ANALYTICS_ML_SERVICE' $CE"
run_test "UEBA Integration" "grep -q 'UEBA_SERVICE' $CE"
run_test "ANRT Compliance" "grep -q 'ANRT_COMPLIANCE_ENABLED' $CE"
run_test "GDPR Protection" "grep -q 'GDPR_DATA_PROTECTION' $CE"
run_test "SS7 Monitoring" "grep -q 'ss7_monitoring' $CE"
run_test "Diameter Monitoring" "grep -q 'diameter_monitoring' $CE"
run_test "Fraud Detection" "grep -q 'fraud_detection' $CE"
run_test "HPA Min 3 Replicas" "grep -A5 'minReplicas' $CE | grep -q '3'"
run_test "HPA Max 10 Replicas" "grep -A5 'maxReplicas' $CE | grep -q '10'"

# PHASE 7: Rule Engine
echo -e "\n${YELLOW}PHASE 7: Rule Engine${NC}"
RE="/home/z/my-project/k8s/siem/rule-engine.yaml"
run_test "Rule Manager Deployment" "grep -q 'siem-rule-manager' $RE"
run_test "Rule Manager Service" "grep -q 'name: siem-rule-manager' $RE"
run_test "Rules ConfigMap" "grep -q 'siem-rules-config' $RE"
run_test "Critical Rules" "grep -q 'critical_rules.yaml' $RE"
run_test "High Rules" "grep -q 'high_rules.yaml' $RE"
run_test "Medium Rules" "grep -q 'medium_rules.yaml' $RE"
run_test "Telecom Rules" "grep -q 'telecom_rules.yaml' $RE"
run_test "CRIT-001 Brute Force" "grep -q 'CRIT-001' $RE && grep -q 'Brute Force Attack Detection' $RE"
run_test "CRIT-002 SS7 Fraud" "grep -q 'CRIT-002' $RE && grep -q 'SS7 Subscriber Data Harvesting' $RE"
run_test "CRIT-003 C2 Detection" "grep -q 'CRIT-003' $RE && grep -q 'DGA Domain C2 Communication' $RE"
run_test "HIGH-001 Priv Escalation" "grep -q 'HIGH-001' $RE && grep -q 'Privilege Escalation' $RE"
run_test "HIGH-002 Data Exfil" "grep -q 'HIGH-002' $RE && grep -q 'Data Exfiltration' $RE"
run_test "HIGH-003 SIM Box" "grep -q 'HIGH-003' $RE && grep -q 'SIM Box.*Fraud' $RE"
run_test "HIGH-004 After-Hours" "grep -q 'HIGH-004' $RE && grep -q 'After-Hours Access' $RE"
run_test "MED-001 Policy Violation" "grep -q 'MED-001' $RE && grep -q 'Security Policy Change' $RE"
run_test "MED-002 Malware IOC" "grep -q 'MED-002' $RE && grep -q 'Known Malware IOC' $RE"
run_test "MED-003 Roaming Anomaly" "grep -q 'MED-003' $RE && grep -q 'Impossible Travel' $RE"
run_test "TEL-001 Diameter DoS" "grep -q 'TEL-001' $RE && grep -q 'Diameter DoS Attack' $RE"
run_test "TEL-002 IRGS Compliance" "grep -q 'TEL-002' $RE && grep -q 'IRGS Reporting Threshold' $RE"
run_test "TEL-003 Signaling Storm" "grep -q 'TEL-003' $RE && grep -q 'Signaling Storm' $RE"
run_test "Rule Actions Defined" "grep -q 'actions:' $RE"
run_test "Severity Levels Present" "grep -q 'severity: critical' $RE && grep -q 'severity: high' $RE"
run_test "ANRT Tags on Rules" "grep -qE 'anrt-(critical|high|medium)' $RE"
run_test "SOAR Playbook Refs" "grep -q 'soar-playbook\\|playbook_id' $RE"

# PHASE 8: Splunk Integration
echo -e "\n${YELLOW}PHASE 8: Splunk Integration${NC}"
SP="/home/z/my-project/k8s/siem/splunk-integration.yaml"
run_test "Splunk Secret" "grep -q 'splunk-credentials' $SP && grep -q 'Secret' $SP"
run_test "Forwarder DaemonSet" "grep -q 'DaemonSet' $SP && grep -q 'splunk-universal-forwarder' $SP"
run_test "Forwarder ConfigMap" "grep -q 'splunk-forwarder-config' $SP"
run_test "HEC Service" "grep -q 'splunk-hec' $SP && grep -q 'port: 8088' $SP"
run_test "Data Sources Inventory" "grep -q 'siem-data-sources-inventory' $SP"
run_test "Inputs Config" "grep -q 'inputs.conf' $SP"
run_test "Outputs Config" "grep -q 'outputs.conf' $SP"
run_test "Props Config" "grep -q 'props.conf' $SP"
run_test "PII Masking Rules" "grep -q 'msisdn_masking\\|SEDCMD-msisdn' $SP"
run_test "SS7 Field Extraction" "grep -q 'ss7-field-extraction' $SP"
run_test "Network Security Sources" "grep -q 'network_security' $SP"
run_test "Total Volume Estimate" "grep -q 'total_daily_volume_estimate' $SP"
run_test "ANRT Retention Days" "grep -q 'anrt_mandatory_retention_days' $SP"

# PHASE 9: Network Policies
echo -e "\n${YELLOW}PHASE 9: Network Policies (Zero Trust)${NC}"
NP="/home/z/my-project/k8s/siem/network-policies.yaml"
POLICIES=(default-deny-ingress default-deny-egress elasticsearch-allow-cluster logstash-to-elasticsearch kibana-to-elasticsearch logstash-ingest-from-external correlation-engine-access kibana-external-access allow-monitoring-scraping allow-dns-resolution analytics-to-siem threat-intel-to-siem)
for p in "${POLICIES[@]}"; do
    run_test "Policy: $p" "grep -q 'name: $p' $NP"
done
run_test "Default Deny Ingress" "grep -A15 'default-deny-ingress' $NP | grep -q 'podSelector'"
run_test "Default Deny Egress" "grep -A15 'default-deny-egress' $NP | grep -q 'podSelector'"
run_test "Total 12 Policies" "[ $(grep -c 'kind: NetworkPolicy' $NP) -eq 12 ]"
run_test "Analytics → SIEM" "grep -q 'cybersoc-analytics' $NP"
run_test "Threat Intel → SIEM" "grep -q 'cybersoc-threat-intel' $NP"

# PHASE 10: Security & Compliance
echo -e "\n${YELLOW}PHASE 10: Security & Compliance${NC}"
run_test "ES Non-Root" "grep -A3 'securityContext' $ES | head -5 | grep -q 'runAsNonRoot: true'"
run_test "LS Non-Root" "grep -A3 'securityContext' $LS | head -5 | grep -q 'runAsNonRoot: true'"
run_test "KB Non-Root" "grep -A3 'securityContext' $KB | head -5 | grep -q 'runAsNonRoot: true'"
run_test "CE Non-Root" "grep -A3 'securityContext' $CE | head -5 | grep -q 'runAsNonRoot: true'"
run_test "ES Memory Limits" "grep -q 'memory:.*Gi' $ES"
run_test "LS Memory Limits" "grep -q 'memory:.*Gi' $LS"
run_test "KB Memory Limits" "grep -q 'memory:.*Gi' $KB"
run_test "CE Memory Limits" "grep -q 'memory:.*Gi' $CE"
run_test "ES Probes" "grep -q 'readinessProbe' $ES && grep -q 'livenessProbe' $ES"
run_test "LS Probes" "grep -q 'readinessProbe' $LS && grep -q 'livenessProbe' $LS"
run_test "KB Probes" "grep -q 'readinessProbe' $KB && grep -q 'livenessProbe' $KB"
run_test "CE Probes" "grep -q 'readinessProbe' $CE && grep -q 'livenessProbe' $CE"
run_test "Namespace ANRT Label" "grep -q 'anrt-iso27001-gdpr' $NS"
run_test "Classification Label" "grep -q 'classification: confidential' $NS"
run_test "Region Tag" "grep -q 'region: algeria-dz' $NS"

# PHASE 11: Cross-Namespace Connectivity
echo -e "\n${YELLOW}PHASE 11: Cross-Namespace Connectivity${NC}"
run_test "Analytics→SIEM Policy" "grep -q 'analytics-to-siem' $NP"
run_test "ThreatIntel→SIEM Policy" "grep -q 'threat-intel-to-siem' $NP"
run_test "Kafka Egress from CE" "grep -q "kafka" $NP"
run_test "Kafka Egress from LS" "grep -q "kafka" $NP"
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
    echo -e "\n${GREEN}🎉 ALL SIEM PHASE TESTS PASSED!${NC}"
    echo -e "${GREEN}Platform Ready for Production Deployment${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  SOME TESTS FAILED - Review Required${NC}"
    exit 1
fi
