#!/bin/bash

# National SOC Platform - Test Runner Script
# 
# Usage: ./tests/run-tests.sh [options]
#   --unit         Run unit tests only
#   --integration  Run integration tests (default)
#   --performance  Run performance benchmarks
#   --all          Run all test suites
#   --verbose      Enable verbose output
#   --coverage     Generate coverage report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  National SOC Platform Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"

# Parse arguments
RUN_UNIT=false
RUN_INTEGRATION=true
RUN_PERFORMANCE=false
VERBOSE=false
COVERAGE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --unit)
      RUN_UNIT=true
      shift
      ;;
    --integration)
      RUN_INTEGRATION=true
      shift
      ;;
    --performance)
      RUN_PERFORMANCE=true
      shift
      ;;
    --all)
      RUN_UNIT=true
      RUN_INTEGRATION=true
      RUN_PERFORMANCE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: Must run from project root${NC}"
  exit 1
fi

# Create test results directory
mkdir -p test-results

# Build Jest arguments
JEST_ARGS="--forceExit --detectOpenHandles"

if [ "$VERBOSE" = true ]; then
  JEST_ARGS="$JEST_ARGS --verbose"
fi

if [ "$COVERAGE" = true ]; then
  JEST_ARGS="$JEST_ARGS --coverage --coverageDirectory=test-results/coverage"
fi

# Track overall success
OVERALL_SUCCESS=0

# ============================================================
# UNIT TESTS
# ============================================================
if [ "$RUN_UNIT" = true ]; then
  echo ""
  echo -e "${YELLOW}Running Unit Tests...${NC}"
  echo -e "${YELLOW}----------------------------------------${NC}"
  
  if npx jest tests/unit/ $JEST_ARGS 2>&1 | tee test-results/unit-test-output.txt; then
    echo -e "${GREEN}✓ Unit tests passed${NC}"
  else
    echo -e "${RED}✗ Unit tests failed${NC}"
    OVERALL_SUCCESS=1
  fi
fi

# ============================================================
# INTEGRATION TESTS
# ============================================================
if [ "$RUN_INTEGRATION" = true ]; then
  echo ""
  echo -e "${YELLOW}Running Integration Tests...${NC}"
  echo -e "${YELLOW}----------------------------------------${NC}"
  
  # Check if server is running
  if curl -s http://localhost:3000/api/incidents/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running at localhost:3000${NC}"
  else
    echo -e "${YELLOW}! Server may not be running. Tests will attempt to connect anyway.${NC}"
  fi
  
  if npx jest tests/integration/ $JEST_ARGS 2>&1 | tee test-results/integration-test-output.txt; then
    echo -e "${GREEN}✓ Integration tests passed${NC}"
  else
    echo -e "${RED}✗ Integration tests failed${NC}"
    OVERALL_SUCCESS=1
  fi
fi

# ============================================================
# PERFORMANCE TESTS
# ============================================================
if [ "$RUN_PERFORMANCE" = true ]; then
  echo ""
  echo -e "${YELLOW}Running Performance Benchmarks...${NC}"
  echo -e "${YELLOW}----------------------------------------${NC}"
  
  if npx jest tests/performance/ $JEST_ARGS 2>&1 | tee test-results/perf-test-output.txt; then
    echo -e "${GREEN}✓ Performance benchmarks passed${NC}"
  else
    echo -e "${RED}✗ Performance benchmarks failed${NC}"
    OVERALL_SUCCESS=1
  fi
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Suite Complete${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$COVERAGE" = true ]; then
  echo ""
  echo -e "${YELLOW}Coverage reports available at:${NC}"
  echo -e "  ${GREEN}test-results/coverage/${NC}"
fi

echo ""

if [ $OVERALL_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}All requested tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. See output above for details.${NC}"
  exit 1
fi
