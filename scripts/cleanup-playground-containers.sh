#!/bin/bash

###############################################################################
# ServCraft Playground - Container Cleanup Script
#
# This script cleans up expired playground containers and their volumes.
# It should be run periodically via cron to ensure no orphaned containers
# remain on the system, even if the Next.js server crashes or is restarted.
#
# Usage:
#   ./scripts/cleanup-playground-containers.sh
#
# Cron setup (runs every 5 minutes):
#   */5 * * * * /path/to/servcraft_docs/scripts/cleanup-playground-containers.sh >> /var/log/playground-cleanup.log 2>&1
#
# Production cron (runs every 10 minutes):
#   */10 * * * * /path/to/servcraft_docs/scripts/cleanup-playground-containers.sh >> /var/log/playground-cleanup.log 2>&1
###############################################################################

set -e

# Configuration
MAX_AGE_MINUTES=40  # 30 min default + 10 min extension
CONTAINER_PREFIX="servcraft-playground-"
VOLUME_PREFIX="servcraft-vol-"
LOG_FILE="${LOG_FILE:-/var/log/playground-cleanup.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker ps &> /dev/null; then
    error "Docker daemon is not running or not accessible"
    exit 1
fi

log "Starting playground container cleanup..."

# Get all playground containers
CONTAINERS=$(docker ps --filter "name=${CONTAINER_PREFIX}" --format "{{.Names}}\t{{.CreatedAt}}" 2>/dev/null || echo "")

if [ -z "$CONTAINERS" ]; then
    log "No playground containers found. Nothing to clean up."
    exit 0
fi

# Count containers
TOTAL_CONTAINERS=$(echo "$CONTAINERS" | wc -l)
log "Found $TOTAL_CONTAINERS active playground container(s)"

# Current timestamp
NOW=$(date +%s)
MAX_AGE_SECONDS=$((MAX_AGE_MINUTES * 60))

CLEANED_COUNT=0
KEPT_COUNT=0

# Process each container
while IFS=$'\t' read -r CONTAINER_NAME CREATED_AT; do
    if [ -z "$CONTAINER_NAME" ]; then
        continue
    fi

    # Parse creation timestamp (Docker format: "2024-12-30 08:05:42 +0100 CET")
    CREATED_TIMESTAMP=$(date -d "$CREATED_AT" +%s 2>/dev/null || echo "0")

    if [ "$CREATED_TIMESTAMP" -eq 0 ]; then
        warn "Could not parse creation time for $CONTAINER_NAME, skipping"
        continue
    fi

    # Calculate age
    AGE_SECONDS=$((NOW - CREATED_TIMESTAMP))
    AGE_MINUTES=$((AGE_SECONDS / 60))

    if [ $AGE_SECONDS -gt $MAX_AGE_SECONDS ]; then
        warn "Container $CONTAINER_NAME is ${AGE_MINUTES} minutes old (max: $MAX_AGE_MINUTES), removing..."

        # Remove container
        if docker rm -f "$CONTAINER_NAME" &> /dev/null; then
            success "Removed container: $CONTAINER_NAME"

            # Remove associated volume
            VOLUME_NAME="${CONTAINER_NAME/$CONTAINER_PREFIX/$VOLUME_PREFIX}"
            if docker volume rm "$VOLUME_NAME" &> /dev/null 2>&1; then
                success "Removed volume: $VOLUME_NAME"
            fi

            CLEANED_COUNT=$((CLEANED_COUNT + 1))
        else
            error "Failed to remove container: $CONTAINER_NAME"
        fi
    else
        log "Container $CONTAINER_NAME is ${AGE_MINUTES} minutes old, keeping (< $MAX_AGE_MINUTES min)"
        KEPT_COUNT=$((KEPT_COUNT + 1))
    fi
done <<< "$CONTAINERS"

# Summary
log "========================================="
success "Cleanup complete!"
log "  - Containers cleaned: $CLEANED_COUNT"
log "  - Containers kept: $KEPT_COUNT"
log "========================================="

# Optional: Clean up dangling volumes (volumes without containers)
log "Checking for dangling playground volumes..."
DANGLING_VOLUMES=$(docker volume ls -q --filter "name=${VOLUME_PREFIX}" 2>/dev/null || echo "")

if [ -n "$DANGLING_VOLUMES" ]; then
    DANGLING_COUNT=0
    for VOLUME in $DANGLING_VOLUMES; do
        # Check if there's a container using this volume
        if ! docker ps -a --filter "volume=$VOLUME" --format "{{.Names}}" | grep -q .; then
            warn "Removing dangling volume: $VOLUME"
            if docker volume rm "$VOLUME" &> /dev/null; then
                DANGLING_COUNT=$((DANGLING_COUNT + 1))
            fi
        fi
    done

    if [ $DANGLING_COUNT -gt 0 ]; then
        success "Removed $DANGLING_COUNT dangling volume(s)"
    fi
fi

exit 0
