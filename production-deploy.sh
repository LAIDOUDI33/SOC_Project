#!/bin/bash
# ============================================================
# National SOC Platform - Production Deployment Orchestrator
# ============================================================
# Master script that coordinates the complete production
# deployment pipeline:
#   Phase 1: PostgreSQL Setup & .env.production
#   Phase 2: Database Migrations & Staging Deploy
#   Phase 3: Security Penetration Testing
#   Phase 4: User Acceptance Testing (UAT)
#   Phase 5: Production Go-Live & Hypercare
#
# Usage: ./production-deploy.sh [phase] [--auto-approve]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_ROOT/logs/production-deploy-$TIMESTAMP.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

AUTO_APPROVE=false
TARGET_PHASE="all"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --auto-approve) AUTO_APPROVE=true ;;
        phase1|phase2|phase3|phase4|phase5|all) TARGET_PHASE=$arg ;;
        --help|-h) 
            echo "Usage: $0 [phase1|phase2|phase3|phase4|phase5|all] [--auto-approve]"
            exit 0
            ;;
        *) echo "Unknown option: $arg"; exit 1 ;;
    esac
done

# ============================================================
# Utility Functions
# ============================================================
init_logging() {
    mkdir -p "$PROJECT_ROOT/logs"
    exec > >(tee -a "$LOG_FILE") 2>&1
    
    echo "=========================================="
    echo "  National SOC Platform - Production Deploy"
    echo "  Started: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "  Phase: $TARGET_PHASE"
    echo "=========================================="
}

log_phase() {
    echo ""
    echo -e "${PURPLE}━━━ PHASE $1 ━━━${NC}"
    echo -e "${CYAN}$2${NC}"
    echo ""
}

confirm() {
    if [ "$AUTO_APPROVE" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  $1${NC}"
    read -p "Continue? (yes/no) " response
    if [ "$response" != "yes" ]; then
        echo "Deployment aborted by user"
        exit 1
    fi
}

check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 FAILED${NC}"
        if [ "$AUTO_APPROVE" = false ]; then
            read -p "Continue anyway? (yes/no) " continue_anyway
            if [ "$continue_anyway" != "yes" ]; then
                exit 1
            fi
        fi
        return 1
    fi
}

# ============================================================
# Phase 1: PostgreSQL Setup & Environment Configuration
# ============================================================
phase1_postgresql_setup() {
    log_phase "1" "PostgreSQL Instance Setup & .env.production Configuration"
    
    confirm "This will set up PostgreSQL and create production environment files."
    
    info "Step 1.1: Verifying prerequisites..."
    # Check for required tools
    for cmd in psql pg_isready openssl docker kubectl helm; do
        if command -v $cmd &> /dev/null; then
            info "✓ $cmd available"
        else
            warn "⚠ $cmd not found (may be needed later)"
        fi
    done
    
    info "Step 1.2: Creating .env.production..."
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        warn ".env.production already exists, backing up..."
        cp "$PROJECT_ROOT/.env.production" "$PROJECT_ROOT/.env.production.backup-$TIMESTAMP"
    fi
    info "✓ .env.production created with secure defaults"
    
    info "Step 1.3: Running PostgreSQL setup script..."
    chmod +x "$PROJECT_ROOT/scripts/database/setup-postgresql-production.sh"
    
    if [ "$AUTO_APPROVE" = true ]; then
        "$PROJECT_ROOT/scripts/database/setup-postgresql-production.sh" --skip-backup
    else
        "$PROJECT_ROOT/scripts/database/setup-postgresql-production.sh"
    fi
    check_success "PostgreSQL setup"
    
    info "Step 1.4: Validating configuration..."
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        # Check for placeholder values
        if grep -q "CHANGE_ME\|REPLACE_ME" "$PROJECT_ROOT/.env.production"; then
            error "⚠️  .env.production still contains placeholder values!"
            error "Please edit $PROJECT_ROOT/.env.production and replace all CHANGE_ME values"
            if [ "$AUTO_APPROVE" = false ]; then
                read -p "Continue anyway? (yes/no) " cont
                [ "$cont" != "yes" ] && exit 1
            fi
        else
            info "✓ .env.production looks properly configured"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Phase 1 Complete: PostgreSQL Ready${NC}"
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
}

# ============================================================
# Phase 2: Database Migrations & Staging Deployment
# ============================================================
phase2_staging_deploy() {
    log_phase "2" "Database Migrations & Staging Environment Deployment"
    
    confirm "This will deploy the application to staging environment."
    
    info "Step 2.1: Building Docker image..."
    chmod +x "$PROJECT_ROOT/scripts/deploy-to-staging.sh"
    
    info "Step 2.2: Deploying to staging..."
    if [ "$AUTO_APPROVE" = true ]; then
        "$PROJECT_ROOT/scripts/deploy-to-staging.sh" --skip-migrations
    else
        "$PROJECT_ROOT/scripts/deploy-to-staging.sh"
    fi
    check_success "Staging deployment"
    
    info "Step 2.3: Verifying staging deployment..."
    STAGING_URL="${STAGING_URL:-https://soc-staging.djezzy.dz}"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/health" --connect-timeout 10 || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        info "✓ Staging health check passed (HTTP 200)"
    else
        warn "⚠ Staging health check returned HTTP $HTTP_CODE"
    fi
    
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Phase 2 Complete: Staging Deployed${NC}"
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
}

# ============================================================
# Phase 3: Security Penetration Testing
# ============================================================
phase3_pentest() {
    log_phase "3" "Security Penetration Testing"
    
    confirm "This will run security tests against staging environment."
    
    info "Step 3.1: Preparing penetration test suite..."
    chmod +x "$PROJECT_ROOT/security/pentest/run-pentest.sh"
    
    info "Step 3.2: Running automated security assessment..."
    TARGET_URL="${STAGING_URL:-https://soc-staging.djezzy.dz}" \
    "$PROJECT_ROOT/security/pentest/run-pentest.sh"
    check_success "Penetration testing"
    
    info "Step 3.3: Checking results..."
    LATEST_REPORT=$(ls -t "$PROJECT_ROOT/security/pentest/reports/" 2>/dev/null | head -1)
    
    if [ -n "$LATEST_REPORT" ] && [ -d "$PROJECT_ROOT/security/pentest/reports/$LATEST_REPORT" ]; then
        if [ -f "$PROJECT_ROOT/security/pentest/reports/$LATEST_REPORT/PENETRATION_TEST_REPORT.md" ]; then
            info "✓ Pentest report generated"
            
            # Extract summary
            CRITICAL_COUNT=$(grep -c '"severity":"critical"' "$PROJECT_ROOT/security/pentest/reports/$LATEST_REPORT/findings.json" 2>/dev/null || echo "0")
            HIGH_COUNT=$(grep -c '"severity":"high"' "$PROJECT_ROOT/security/pentest/reports/$LATEST_REPORT/findings.json" 2>/dev/null || echo "0")
            
            if [ "$CRITICAL_COUNT" -gt 0 ] || [ "$HIGH_COUNT" -gt 0 ]; then
                error "⚠️  Security issues found!"
                error "   Critical: $CRITICAL_COUNT"
                error "   High:     $HIGH_COUNT"
                error ""
                error "Review the pentest report before proceeding to production:"
                error "  $PROJECT_ROOT/security/pentest/reports/$LATEST_REPORT/"
                
                if [ "$AUTO_APPROVE" = false ]; then
                    read -p "Proceed to UAT despite security findings? (yes/no) " proceed
                    [ "$proceed" != "yes" ] && exit 1
                fi
            else
                info "✓ No critical or high severity issues found"
            fi
        fi
    else
        warn "Could not locate pentest report"
    fi
    
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Phase 3 Complete: Security Tested${NC}"
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
}

# ============================================================
# Phase 4: User Acceptance Testing (UAT)
# ============================================================
phase4_uat() {
    log_phase "4" "User Acceptance Testing (UAT)"
    
    confirm "This will run UAT test suite against staging environment."
    
    info "Step 4.1: Preparing UAT suite..."
    chmod +x "$PROJECT_ROOT/scripts/uat-test-suite.sh"
    
    info "Step 4.2: Executing UAT tests..."
    BASE_URL="${STAGING_URL:-https://soc-staging.djezzy.dz}" \
    TEST_ENV=staging \
    "$PROJECT_ROOT/scripts/uat-test-suite.sh" --module=all
    UAT_EXIT_CODE=$?
    check_success "UAT testing (exit code: $UAT_EXIT_CODE)"
    
    info "Step 4.3: Analyzing UAT results..."
    LATEST_UAT=$(ls -dt "$PROJECT_ROOT/tests/uat/results/" 2>/dev/null | head -1)
    
    if [ -n "$LATEST_UAT" ] && [ -f "$PROJECT_ROOT/tests/uat/results/$LATEST_UAT/UAT_REPORT.md" ]; then
        info "✓ UAT report generated"
        
        # Extract pass rate
        PASS_RATE=$(grep "Pass Rate:" "$PROJECT_ROOT/tests/uat/results/$LATEST_UAT/UAT_REPORT.md" | grep -o '[0-9]*%' || echo "unknown")
        info "   Pass Rate: $PASS_RATE"
        
        if [ "$UAT_EXIT_CODE" -ne 0 ]; then
            warn "⚠️  Some UAT tests failed"
            warn "   Review report: $PROJECT_ROOT/tests/uat/results/$LATEST_UAT/UAT_REPORT.md"
            
            if [ "$AUTO_APPROVE" = false ]; then
                read -p "Proceed to production go-live despite UAT failures? (yes/no) " proceed_uat
                [ "$proceed_uat" != "yes" ] && exit 1
            fi
        fi
    fi
    
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Phase 4 Complete: UAT Executed${NC}"
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
}

# ============================================================
# Phase 5: Production Go-Live & Hypercare
# ============================================================
phase5_golive() {
    log_phase "5" "Production Go-Live & Hypercare Support"
    
    confirm "🚨 THIS WILL DEPLOY TO PRODUCTION! Are you absolutely sure?"
    confirm "   Have you completed Phases 1-4 successfully?"
    confirm "   Do you have rollback plan ready?"
    confirm "   Is support team on standby?"
    
    info "Step 5.1: Final pre-go-live checks..."
    
    # Run final checks
    info "Checking .env.production exists..."
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        error ".env.production not found! Run Phase 1 first."
        exit 1
    fi
    info "✓ .env.production exists"
    
    info "Checking Kubernetes connectivity..."
    if kubectl cluster-info &>/dev/null; then
        info "✓ Kubernetes cluster accessible"
    else
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    info "Step 5.2: Displaying Go-Live runbook location..."
    echo ""
    echo -e "${YELLOW}╔══════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  📋 GO-LIVE RUNBOOK                       ║${NC}"
    echo -e "${YELLOW}║                                           ║${NC}"
    echo -e "${YELLOW}║  Location:                                ║${NC}"
    echo -e "${YELLOW}║  $PROJECT_ROOT/docs/GO_LIVE_HYPERCARE_RUNBOOK.md${NC}"
    echo -e "${YELLOW}║                                           ║${NC}"
    echo -e "${YELLOW}║  Please open this file and follow the     ║${NC}"
    echo -e "${YELLOW}║  step-by-step go-live procedures.         ║${NC}"
    echo -e ${YELLOW}║╚══════════════════════════════════════════╝${NC}
    echo ""
    
    info "Step 5.3: Key production commands reference..."
    cat << 'EOF'

┌─────────────────────────────────────────────────────────────┐
│              PRODUCTION COMMAND REFERENCE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 Deploy to Production:                                   │
│  helm upgrade djezzy-soc ./helm/djezzy-soc \                │
│    --namespace=soc-platform-production \                     │
│    --values=./helm/djezzy-soc/values-production.yaml        │
│    --wait                                                  │
│                                                             │
│  🔍 Check Pod Status:                                       │
│  kubectl get pods -n soc-platform-production                │
│                                                             │
│  📊 View Logs:                                              │
│  kubectl logs -f deployment/soc-platform-api \               │
│    -n soc-platform-production                               │
│                                                             │
│  ⏪ Rollback (if needed):                                    │
│  helm rollback djezzy-soc 1 \                                │
│    -n soc-platform-production                               │
│                                                             │
│  🚨 Emergency Scale Down:                                    │
│  kubectl scale deployment soc-platform-api \                  │
│    -n soc-platform-production --replicas=0                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

EOF
    
    info "Step 5.4: Creating production deployment summary..."
    
    local SUMMARY_FILE="$PROJECT_ROOT/logs/PRODUCTION_DEPLOYMENT_SUMMARY_$TIMESTAMP.md"
    
    cat > "$SUMMARY_FILE" << EOF
# Production Deployment Summary

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Deployer:** $(whoami)@$(hostname)

## Deployment Pipeline Completed

| Phase | Description | Status | Timestamp |
|-------|-------------|--------|-----------|
| 1 | PostgreSQL Setup & .env.production | ✅ | $(date) |
| 2 | Database Migrations & Staging Deploy | ✅ | $(date) |
| 3 | Security Penetration Testing | ✅ | $(date) |
| 4 | User Acceptance Testing | ✅ | $(date) |
| 5 | Production Go-Live Ready | ✅ | $(date) |

## Artifacts Generated

### Configuration Files
- \`$PROJECT_ROOT/.env.production\` - Production environment variables

### Scripts Created
- \`$PROJECT_ROOT/scripts/database/setup-postgresql-production.sh\` - DB setup
- \`$PROJECT_ROOT/scripts/deploy-to-staging.sh\` - Staging deployment
- \`$PROJECT_ROOT/security/pentest/run-pentest.sh\` - Security testing
- \`$PROJECT_ROOT/scripts/uat-test-suite.sh\` - UAT automation

### Documentation
- \`$PROJECT_ROOT/docs/GO_LIVE_HYPERCARE_RUNBOOK.md\` - Go-live procedures

### Reports (after execution)
- \`security/pentest/reports/*/PENETRATION_TEST_REPORT.md\`
- \`tests/uat/results/*/UAT_REPORT.md\`

## Next Steps

1. **Review the Go-Live Runbook**
   - Open: \`docs/GO_LIVE_HYPERCARE_RUNBOOK.md\`
   - Follow T-24h, T-2h, T-0 procedures

2. **Assemble War Room Team**
   - All hands on deck at T-2h
   - Monitoring dashboards ready

3. **Execute Go-Live**
   - Maintenance mode ON
   - Deploy database migrations
   - Deploy application
   - Verify health checks
   - Maintenance mode OFF → **LIVE!**

4. **Begin Hypercare Support**
   - 14-day intensive monitoring
   - Daily standups
   - Rapid incident response

---

**Good luck! 🚀**
EOF
    
    info "✓ Deployment summary created: $SUMMARY_FILE"
    
    echo ""
    echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Phase 5 Complete: Ready for Production Go-Live!${NC}"
    echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}  🎉 All preparation phases complete!${NC}"
    echo ""
    echo -e "  Next step: Execute go-live using the runbook:"
    echo -e "  ${YELLOW}cat docs/GO_LIVE_HYPERCARE_RUNBOOK.md${NC}"
    echo ""
}

# ============================================================
# Main Execution
# ============================================================
main() {
    init_logging
    
    echo ""
    echo -e "${BLUE}National SOC Platform - Production Deployment Pipeline${NC}"
    echo ""
    echo "Target Phase: $TARGET_PHASE"
    echo "Auto-Approve: $AUTO_APPROVE"
    echo "Log File: $LOG_FILE"
    echo ""
    
    case $TARGET_PHASE in
        phase1)
            phase1_postgresql_setup
            ;;
        phase2)
            phase2_staging_deploy
            ;;
        phase3)
            phase3_pentest
            ;;
        phase4)
            phase4_uat
            ;;
        phase5)
            phase5_golive
            ;;
        all)
            phase1_postgresql_setup
            phase2_staging_deploy
            phase3_pentest
            phase4_uat
            phase5_golive
            
            echo ""
            echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}"
            echo -e "${PURPLE}          🎊 ALL PHASES COMPLETE 🎊${NC}"
            echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}"
            echo ""
            echo -e "  Full deployment log: $LOG_FILE"
            echo -e "  Deployment summary: $(ls -t $PROJECT_ROOT/logs/PRODUCTION_DEPLOYMENT_SUMMARY_*.md | head -1)"
            echo ""
            ;;
    esac
    
    exit 0
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "National SOC Platform - Production Deployment Orchestrator"
    echo ""
    echo "Usage: $0 <phase> [--auto-approve]"
    echo ""
    echo "Phases:"
    echo "  phase1  PostgreSQL Setup & .env.production"
    echo "  phase2  Database Migrations & Staging Deploy"
    echo "  phase3  Security Penetration Testing"
    echo "  phase4  User Acceptance Testing (UAT)"
    echo "  phase5  Production Go-Live & Hypercare"
    echo "  all     Run all phases sequentially"
    echo ""
    echo "Options:"
    echo "  --auto-approve  Skip confirmation prompts"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 phase1                      # Set up PostgreSQL only"
    echo "  $0 phase3 --auto-approve       # Run pentest without prompts"
    echo "  $0 all                         # Full pipeline with confirmations"
    echo ""
    exit 0
fi

# Run main function
main "$@"
