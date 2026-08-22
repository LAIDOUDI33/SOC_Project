#!/bin/bash
# ============================================================
# Push National SOC Platform to GitHub
# Repository: https://github.com/LAIDOUDI33/SOC_Project.git
# ============================================================

set -e

echo "🚀 National SOC Platform - GitHub Push"
echo "======================================"
echo ""

REMOTE_NAME="soc"
BRANCH="main"
REPO_URL="https://github.com/LAIDOUDI33/SOC_Project.git"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

success() { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

cd /home/z/my-project

info "Current branch: $(git branch --show-current)"
info "Commits ahead of remote: $(git rev-list --count ${BRANCH}..soc/${BRANCH} 2>/dev/null || echo 'N/A')"
echo ""

# Check for token
TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$TOKEN" ]; then
    echo "🔑 GitHub Authentication Required"
    echo "-----------------------------------"
    echo ""
    echo "Please provide your GitHub Personal Access Token:"
    echo "(Generate at: https://github.com/settings/tokens?scopes=repo)"
    echo ""
    echo "Token requirements:"
    echo "  ✓ repo (full control)"
    echo "  ✓ workflow (if using GitHub Actions)"
    echo ""
    read -s -p "Enter token: " TOKEN
    echo ""
    
    if [ -z "$TOKEN" ]; then
        error "No token provided. Exiting."
        exit 1
    fi
fi

# Configure remote with authentication
AUTH_URL="https://LAIDOUDI33:${TOKEN}@github.com/LAIDOUDI33/SOC_Project.git"
git remote set-url "$REMOTE_NAME" "$AUTH_URL" 2>/dev/null || git remote add "$REMOTE_NAME" "$AUTH_URL"

success "Authentication configured"
echo ""

# Show changes to be pushed
info "Changes to push:"
echo "------------------"
git log --oneline soc/${BRANCH}..${BRANCH} 2>/dev/null || git log --oneline -5
echo "------------------"
echo ""

# Confirm push
read -p "Push ${BRANCH} to ${REPO_URL}? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    info "Push cancelled."
    # Reset URL to remove credentials
    git remote set-url "$REMOTE_NAME" "$REPO_URL"
    exit 0
fi

echo ""
info "Pushing to GitHub..."

# Perform push
if git push -u "$REMOTE_NAME" "$BRANCH"; then
    echo ""
    success "========================================="
    success " PUSH SUCCESSFUL!"
    success "========================================="
    echo ""
    info "Repository: 🔗 ${REPO_URL}"
    info "Branch: ${BRANCH}"
    echo ""
    success "Your security improvements are now on GitHub!"
else
    error "Push failed! Check your token and try again."
fi

# Remove credentials from URL (security)
git remote set-url "$REMOTE_NAME" "$REPO_URL"
info "Credentials removed from config (security best practice)"
