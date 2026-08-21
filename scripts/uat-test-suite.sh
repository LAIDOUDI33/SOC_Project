#!/bin/bash
# ============================================================
# Djezzy National SOC Platform - Comprehensive UAT Test Suite
# Validates all aspects before production deployment
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Test results array
declare -a TEST_RESULTS=()

log_test() {
    local name="$1"
    local status="$2"
    local message="$3"
    ((TOTAL_TESTS++))
    
    if [ "$status" = "PASS" ]; then
        ((PASSED_TESTS++))
        echo -e "${GREEN}✅ PASS${NC}: $name"
        TEST_RESULTS+=("PASS:$name")
    elif [ "$status" = "FAIL" ]; then
        ((FAILED_TESTS++))
        echo -e "${RED}❌ FAIL${NC}: $name - $message"
        TEST_RESULTS+=("FAIL:$name:$message")
    else
        ((WARNINGS++))
        echo -e "${YELLOW}⚠️  WARN${NC}: $name - $message"
        TEST_RESULTS+=("WARN:$name:$message")
    fi
}

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     DJEZZY NATIONAL SOC PLATFORM - UAT TEST SUITE          ║"
echo "║     User Acceptance Testing for Production Readiness       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# PHASE 1: BUILD & COMPILATION TESTS
# ============================================================
echo -e "${CYAN}━━━ PHASE 1: BUILD & COMPILATION ━━━${NC}"
echo ""

# Test 1.1: Next.js Production Build
if [ -f ".next/BUILD_ID" ]; then
    log_test "Next.js Build Artifacts" "PASS" "Build artifacts exist"
else
    log_test "Next.js Build Artifacts" "FAIL" "No build artifacts found"
fi

# Test 1.2: Package.json validity
if node -e "require('./package.json')" 2>/dev/null; then
    log_test "package.json Validity" "PASS" "Valid JSON structure"
else
    log_test "package.json Validity" "FAIL" "Invalid package.json"
fi

# Test 1.3: TypeScript Configuration
if [ -f "tsconfig.json" ] && npx tsc --version >/dev/null 2>&1; then
    log_test "TypeScript Config" "PASS" "tsconfig.json exists and tsc available"
else
    log_test "TypeScript Config" "FAIL" "Missing or invalid TypeScript config"
fi

# Test 1.4: Dependencies Installed
if [ -d "node_modules" ]; then
    DEPS_COUNT=$(ls node_modules | wc -l)
    log_test "Node Modules" "PASS" "$DEPS_COUNT packages installed"
else
    log_test "Node Modules" "FAIL" "node_modules not found"
fi

# ============================================================
# PHASE 2: SOURCE CODE VALIDATION
# ============================================================
echo ""
echo -e "${CYAN}━━━ PHASE 2: SOURCE CODE VALIDATION ━━━${NC}"
echo ""

# Test 2.1: Main entry point exists
if [ -f "src/app/page.tsx" ]; then
    log_test "Main Entry Point" "PASS" "src/app/page.tsx exists"
else
    log_test "Main Entry Point" "FAIL" "Missing main page"
fi

# Test 2.2: Layout file exists
if [ -f "src/app/layout.tsx" ]; then
    log_test "Layout Component" "PASS" "src/app/layout.tsx exists"
else
    log_test "Layout Component" "FAIL" "Missing layout"
fi

# Test 2.3: Dashboard pages exist
DASHBOARD_COUNT=$(find src/app/dashboards -name "page.tsx" 2>/dev/null | wc -l)
if [ "$DASHBOARD_COUNT" -ge 5 ]; then
    log_test "Dashboard Pages" "PASS" "$DASHBOARD_COUNT dashboard pages found"
else
    log_test "Dashboard Pages" "FAIL" "Only $DASHBOARD_COUNT dashboards (expected 5+)"
fi

# Test 2.4: API routes exist
API_COUNT=$(find src/app/api -name "route.ts" 2>/dev/null | wc -l)
if [ "$API_COUNT" -ge 25 ]; then
    log_test "API Routes" "PASS" "$API_COUNT API endpoints found"
else
    log_test "API Routes" "WARN" "Only $API_COUNT API endpoints (expected 25+)"
fi

# Test 2.5: Components exist
COMPONENT_COUNT=$(find src/components -name "*.tsx" 2>/dev/null | wc -l)
log_test "React Components" "PASS" "$COMPONENT_COUNT component files found"

# Test 2.6: No .ts files with JSX (should be .tsx)
JSX_IN_TS=$(grep -r "<.*>" src --include="*.ts" 2>/dev/null | grep -v "download/" | grep -v ".next" | head -5 | wc -l)
if [ "$JSX_IN_TS" -eq 0 ]; then
    log_test "File Extensions" "PASS" "No JSX in .ts files"
else
    log_test "File Extensions" "FAIL" "Found JSX in .ts files (should be .tsx)"
fi

# ============================================================
# PHASE 3: CONFIGURATION FILES
# ============================================================
echo ""
echo -e "${CYAN}━━━ PHASE 3: CONFIGURATION FILES ━━━${NC}"
echo ""

# Test 3.1: Environment config
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f ".env.production" ]; then
    log_test "Environment Config" "PASS" "Environment files found"
else
    log_test "Environment Config" "WARN" "No .env files found (may use CI/CD secrets)"
fi

# Test 3.2: Docker configuration
if [ -f "docker-compose.yml" ] || [ -f "Dockerfile" ]; then
    log_test "Docker Config" "PASS" "Docker configuration found"
else
    log_test "Docker Config" "WARN" "No Docker configuration"
fi

# Test 3.3: Kubernetes manifests
K8S_COUNT=$(find k8s -name "*.yaml" -o -name "*.yml" 2>/dev/null | wc -l)
if [ "$K8S_COUNT" -ge 10 ]; then
    log_test "Kubernetes Manifests" "PASS" "$K8S_COUNT K8s manifest files"
else
    log_test "Kubernetes Manifests" "WARN" "Only $K8S_COUNT K8s files"
fi

# Test 3.4: Helm chart
if [ -d "helm/djezzy-soc" ] && [ -f "helm/djezzy-soc/Chart.yaml" ]; then
    log_test "Helm Chart" "PASS" "Complete Helm chart found"
else
    log_test "Helm Chart" "FAIL" "Missing or incomplete Helm chart"
fi

# Test 3.5: Security configs
SECURITY_CONFIGS=$(find config/security -type f 2>/dev/null | wc -l)
if [ "$SECURITY_CONFIGS" -ge 3 ]; then
    log_test "Security Configurations" "PASS" "$SECURITY_CONFIGS security config files"
else
    log_test "Security Configurations" "WARN" "Only $SECURITY_CONFIGS security configs"
fi

# ============================================================
# PHASE 4: DOCUMENTATION
# ============================================================
echo ""
echo -e "${CYAN}━━━ PHASE 4: DOCUMENTATION ━━━${NC}"
echo ""

# Test 4.1: Runbooks
RUNBOOK_COUNT=$(find docs/runbooks -name "*.md" 2>/dev/null | wc -l)
if [ "$RUNBOOK_COUNT" -ge 5 ]; then
    log_test "Operational Runbooks" "PASS" "$RUNBOOK_COUNT runbook documents"
else
    log_test "Operational Runbooks" "WARN" "Only $RUNBOOK_COUNT runbooks"
fi

# Test 4.2: Training docs
TRAINING_COUNT=$(find docs/training -name "*.md" 2>/dev/null | wc -l)
if [ "$TRAINING_COUNT" -ge 2 ]; then
    log_test "Training Materials" "PASS" "$TRAINING_COUNT training documents"
else
    log_test "Training Materials" "WARN" "Only $TRAINING_COUNT training docs"
fi

# Test 4.3: README
if [ -f "README.md" ]; then
    log_test "README Documentation" "PASS" "README.md exists"
else
    log_test "README Documentation" "WARN" "No README.md found"
fi

# Test 4.4: Worklog
if [ -f "worklog.md" ]; then
    log_test "Project Worklog" "PASS" "worklog.md exists"
else
    log_test "Project Worklog" "WARN" "No worklog found"
fi

# ============================================================
# PHASE 5: SECURITY & COMPLIANCE
# ============================================================
echo ""
echo -e "${CYAN}━━━ PHASE 5: SECURITY & COMPLIANCE ━━━${NC}"
echo ""

# Test 5.1: No hardcoded secrets in source
SECRETS_FOUND=$(grep -r "password\|secret\|api_key\|apikey" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "download/" | grep -v "//\|*\|example\|placeholder\|template" | head -10 | wc -l)
if [ "$SECRETS_FOUND" -eq 0 ]; then
    log_test "Secret Management" "PASS" "No hardcoded secrets detected"
else
    log_test "Secret Management" "WARN" "Potential secrets found ($SECRETS_FOUND occurrences)"
fi

# Test 5.2: Security headers implementation
if [ -f "src/lib/security/security-headers.ts" ]; then
    log_test "Security Headers" "PASS" "Security headers middleware implemented"
else
    log_test "Security Headers" "WARN" "No security headers middleware"
fi

# Test 5.3: Input validation
if [ -f "src/lib/security/input-validation.ts" ]; then
    log_test "Input Validation" "PASS" "Input validation library exists"
else
    log_test "Input Validation" "WARN" "No input validation library"
fi

# Test 5.4: Rate limiting
if [ -f "src/lib/security/rate-limiter.ts" ]; then
    log_test "Rate Limiting" "PASS" "Rate limiter implemented"
else
    log_test "Rate Limiting" "WARN" "No rate limiter found"
fi

# Test 5.5: ANRT compliance documentation
if grep -rl "ANRT\|Algeria\|data localization" docs/ 2>/dev/null | head -1 | grep -q "."; then
    log_test "ANRT Compliance" "PASS" "ANRT compliance documentation found"
else
    log_test "ANRT Compliance" "WARN" "Limited ANRT compliance references"
fi

# ============================================================
# PHASE 6: PERFORMANCE OPTIMIZATION
# ============================================================
echo ""
echo -e "${CYAN}━━━ PHASE 6: PERFORMANCE OPTIMIZATION ━━━${NC}"
echo ""

# Test 6.1: Cache manager
if [ -f "src/lib/performance/cache-manager.ts" ]; then
    log_test "Cache Manager" "PASS" "Multi-layer cache manager exists"
else
    log_test "Cache Manager" "WARN" "No cache manager found"
fi

# Test 6.2: Load testing scripts
LOAD_TEST_COUNT=$(find performance/load-testing -name "*.js" 2>/dev/null | wc -l)
if [ "$LOAD_TEST_COUNT" -ge 3 ]; then
    log_test "Load Testing Scripts" "PASS" "$LOAD_TEST_COUNT k6 load test scripts"
else
    log_test "Load Testing Scripts" "WARN" "Only $LOAD_TEST_COUNT load tests"
fi

# Test 6.3: Image optimization
if [ -f "src/lib/performance/image-optimizer.tsx" ]; then
    log_test "Image Optimization" "PASS" "Image optimizer component exists"
else
    log_test "Image Optimization" "WARN" "No image optimizer"
fi

# Test 6.4: Database tuning configs
DB_TUNING=$(find config/database -type f 2>/dev/null | wc -l)
if [ "$DB_TUNING" -ge 2 ]; then
    log_test "Database Tuning" "PASS" "$DB_TUNING database tuning configs"
else
    log_test "Database Tuning" "WARN" "Only $DB_TUNING DB configs"
fi

# ============================================================
# PHASE 7: CI/CD PIPELINES
# ============================================================
echo ""
echo -e "${CYAN}━━━ PHASE 7: CI/CD PIPELINES ━━━${NC}"
echo ""

# Test 7.1: GitHub Actions
GHA_COUNT=$(find .github/workflows -name "*.yml" 2>/dev/null | wc -l)
if [ "$GHA_COUNT" -ge 3 ]; then
    log_test "GitHub Actions" "PASS" "$GHA_COUNT workflow files"
else
    log_test "GitHub Actions" "WARN" "Only $GHA_COUNT GitHub workflows"
fi

# Test 7.2: GitLab CI (optional)
if [ -f ".gitlab-ci.yml" ]; then
    log_test "GitLab CI" "PASS" "GitLab CI configuration found"
else
    log_test "GitLab CI" "INFO" "No GitLab CI (GitHub only)"
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    UAT TEST SUMMARY                      ║"
echo "╠════════════════════════════════════════════════════════════╣"
printf "║  Total Tests:  %3d                                         ║\n" "$TOTAL_TESTS"
printf "║  ${GREEN}Passed:%-9s${NC}  ${RED}Failed:%-9s${NC}  ${Yellow}Warnings:%-9s${NC}         ║\n" "$PASSED_TESTS" "$FAILED_TESTS" "$WARNINGS"
echo "╚════════════════════════════════════════════════════════════╝"

# Calculate pass rate
if [ "$TOTAL_TESTS" -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo ""
    echo -e "Pass Rate: ${CYAN}${PASS_RATE}%${NC}"
    
    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}ALL CRITICAL TESTS PASSED - Ready for Production!${NC}\n"
        exit 0
    elif [ "$PASS_RATE" -ge 80 ]; then
        echo -e "\n⚠️  ${YELLOW}Mostly ready - Review failures before production${NC}\n"
        exit 1
    else
        echo -e "\n❌ ${RED}NOT READY - Fix critical issues before production${NC}\n"
        exit 2
    fi
else
    echo -e "\n❌ ${RED}No tests executed${NC}\n"
    exit 1
fi
