#!/bin/bash
# ============================================================
# Djezzy National SOC Platform - GitHub Push Script
# Repository: https://github.com/LAIDOUDI33/SOC_Project
# ============================================================

set -e

echo "🚀 Djezzy National SOC Platform - GitHub Push Utility"
echo "======================================================"
echo ""

REPO_URL="https://github.com/LAIDOUDI33/SOC_Project.git"
REMOTE_NAME="soc"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    error "This script must be run from the project root directory!"
    exit 1
fi

info "Current directory: $(pwd)"
info "Target repository: ${REPO_URL}"
info "Branch: ${BRANCH}"
echo ""

# Check if remote exists, if not add it
if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
    info "Adding remote '${REMOTE_NAME}'..."
    git remote add "$REMOTE_NAME" "$REPO_URL"
    success "Remote added successfully"
else
    info "Remote '${REMOTE_NAME}' already configured"
    git remote set-url "$REMOTE_NAME" "$REPO_URL"
    success "Remote URL updated"
fi

echo ""
info "Preparing to push to GitHub..."
echo ""

# Prompt for token if not provided as argument
TOKEN="${1:-}"

if [ -z "$TOKEN" ]; then
    warn "No token provided as argument."
    echo ""
    echo "Please enter your GitHub Personal Access Token:"
    echo "(Get one at: https://github.com/settings/tokens)"
    echo ""
    read -s -p "Token: " TOKEN
    echo ""
    
    if [ -z "$TOKEN" ]; then
        error "No token provided. Cannot authenticate."
        exit 1
    fi
fi

# Configure the remote URL with authentication
AUTH_URL="https://LAIDOUDI33:${TOKEN}@github.com/LAIDOUDI33/SOC_Project.git"
git remote set-url "$REMOTE_NAME" "$AUTH_URL"

success "Authentication configured"
echo ""

# Show what will be pushed
info "Files that will be pushed:"
echo "----------------------------------------"
git status --short | head -20
if [ $(git status --short | wc -l) -gt 20 ]; then
    echo "... and more files"
fi
echo "----------------------------------------"
echo ""

# Confirm before pushing
read -p "Push to GitHub? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    warn "Push cancelled by user."
    exit 0
fi

echo ""
info "Pushing to ${REPO_URL}..."

# Perform the push
if git push -u "$REMOTE_NAME" "$BRANCH" --force; then
    echo ""
    success "========================================="
    success " PUSH SUCCESSFUL!"
    success "========================================="
    echo ""
    info "Your Djezzy National SOC Platform is now live at:"
    echo "   🔗 ${REPO_URL}"
    echo ""
    info "Repository contents:"
    echo "   📁 k8s/              - Kubernetes manifests & Helm charts"
    echo "   📁 src/              - Next.js application source"
    echo "   📁 config/           - Security, caching, DB configs"
    echo "   📁 docs/             - Runbooks, training, architecture"
    echo "   📁 services/         - SS7/Diameter monitoring services"
    echo "   📁 scripts/          - Deployment & utility scripts"
    echo "   📁 performance/      - Load testing suites"
    echo "   📁 security/         - Pen test prep & security docs"
    echo ""
else
    error "Push failed!"
    error "Please check your token and try again."
    exit 1
fi

# Reset URL to remove token from config (security best practice)
git remote set-url "$REMOTE_NAME" "$REPO_URL"
info "Removed credentials from remote URL (security)"
