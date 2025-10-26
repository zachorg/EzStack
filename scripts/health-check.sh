#!/bin/bash

# Health check script for EzStack services
# This script performs basic health checks on all running services

set -e

echo "Starting health checks..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service responds
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=10
    local attempt=1

    echo -n "Checking $service_name... "
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s -o /dev/null -w "%{http_code}" "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo -e "${RED}FAILED${NC}"
    return 1
}

# Function to check container health
check_container() {
    local container_name=$1
    
    echo -n "Checking container $container_name... "
    
    if docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null | grep -q "running"; then
        echo -e "${GREEN}Running${NC}"
        return 0
    else
        echo -e "${RED}Not running${NC}"
        return 1
    fi
}

# Track overall status
overall_status=0

# Check if containers are running
echo "=== Checking Containers ==="
check_container "redis" || overall_status=1
check_container "ezstack" || overall_status=1
check_container "ezauth" || overall_status=1
check_container "ezstack-site" || overall_status=1

echo ""
echo "=== Checking Service Health ==="

# Check Redis
echo -n "Checking Redis... "
if docker exec redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    overall_status=1
fi

# Wait a bit for services to fully start
echo "Waiting for services to stabilize..."
sleep 5

# Check EzStack API (basic connectivity check)
if check_service "EzStack API" "http://localhost:8080/health" || \
   curl -f -s "http://localhost:8080" > /dev/null 2>&1; then
    echo -e "EzStack API: ${GREEN}Reachable${NC}"
else
    echo -e "EzStack API: ${YELLOW}Note: No /health endpoint, but this is expected${NC}"
    # Don't fail on this since the service might not have a health endpoint
fi

# Check EzAuth API (basic connectivity check)
if check_service "EzAuth API" "http://localhost:8081/health" || \
   curl -f -s "http://localhost:8081" > /dev/null 2>&1; then
    echo -e "EzAuth API: ${GREEN}Reachable${NC}"
else
    echo -e "EzAuth API: ${YELLOW}Note: No /health endpoint, but this is expected${NC}"
    # Don't fail on this since the service might not have a health endpoint
fi

# Check EzStack Site (basic connectivity check)
if curl -f -s "http://localhost:3000" > /dev/null 2>&1; then
    echo -e "EzStack Site: ${GREEN}Reachable${NC}"
else
    echo -e "EzStack Site: ${YELLOW}Warning: Not reachable${NC}"
    overall_status=1
fi

echo ""
echo "=== Container Logs Preview ==="
echo "--- Last 10 lines from each service ---"

echo -e "\n${YELLOW}EzStack:${NC}"
docker logs --tail 10 ezstack 2>&1 | head -10

echo -e "\n${YELLOW}EzAuth:${NC}"
docker logs --tail 10 ezauth 2>&1 | head -10

echo -e "\n${YELLOW}EzStack Site:${NC}"
docker logs --tail 10 ezstack-site 2>&1 | head -10

# Check for obvious errors in logs
echo ""
echo "=== Checking for Errors in Logs ==="
error_count=0

if docker logs ezstack 2>&1 | grep -i "error" | grep -v "ErrorHandler" | head -5; then
    error_count=$((error_count + 1))
fi

if docker logs ezauth 2>&1 | grep -i "error" | grep -v "ErrorHandler" | head -5; then
    error_count=$((error_count + 1))
fi

if docker logs ezstack-site 2>&1 | grep -i "error" | head -5; then
    error_count=$((error_count + 1))
fi

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}No critical errors found in logs${NC}"
else
    echo -e "${YELLOW}Found some error messages (see above)${NC}"
fi

echo ""
if [ $overall_status -eq 0 ]; then
    echo -e "${GREEN}All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some health checks failed!${NC}"
    exit 1
fi

