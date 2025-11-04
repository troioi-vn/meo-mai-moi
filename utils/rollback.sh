#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ROLLBACK_DIR="$PROJECT_ROOT/.rollback"

print_help() {
    cat <<'EOF'
Usage: ./utils/rollback.sh [SNAPSHOT]

Rollback deployment to a previous snapshot.

Arguments:
    SNAPSHOT    The rollback snapshot identifier (e.g., rollback-1234567890)
                If not provided, lists available snapshots.

Examples:
    ./utils/rollback.sh                     # List available snapshots
    ./utils/rollback.sh rollback-1234567890 # Rollback to specific snapshot

The rollback will:
    1. Reset git repository to the snapshot commit
    2. Rebuild and restart containers
    3. Run migrations (preserving data)

IMPORTANT: This does NOT restore database data. Use backup restoration for that.
EOF
}

list_snapshots() {
    if [ ! -d "$ROLLBACK_DIR" ] || [ -z "$(ls -A "$ROLLBACK_DIR" 2>/dev/null)" ]; then
        echo "No rollback snapshots available"
        echo "Snapshots are created automatically during deployment"
        return
    fi
    
    echo "Available rollback snapshots:"
    echo ""
    
    local snapshot_files
    snapshot_files=$(find "$ROLLBACK_DIR" -name "*.commit" -type f 2>/dev/null | sort -r)
    
    if [ -z "$snapshot_files" ]; then
        echo "No snapshots found"
        return
    fi
    
    while IFS= read -r commit_file; do
        local snapshot_name
        snapshot_name=$(basename "$commit_file" .commit)
        local commit_hash
        commit_hash=$(cat "$commit_file" 2>/dev/null || echo "unknown")
        local snapshot_date
        
        # Extract timestamp from snapshot name (rollback-TIMESTAMP)
        local timestamp="${snapshot_name#rollback-}"
        if [[ "$timestamp" =~ ^[0-9]+$ ]]; then
            snapshot_date=$(date -d "@$timestamp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "unknown date")
        else
            snapshot_date="unknown date"
        fi
        
        echo "  $snapshot_name"
        echo "    Date:   $snapshot_date"
        echo "    Commit: ${commit_hash:0:12}"
        echo ""
    done <<< "$snapshot_files"
}

rollback_to_snapshot() {
    local snapshot="$1"
    local commit_file="$ROLLBACK_DIR/$snapshot.commit"
    
    if [ ! -f "$commit_file" ]; then
        echo "✗ Snapshot not found: $snapshot" >&2
        echo "  Available snapshots can be listed with: $0" >&2
        exit 1
    fi
    
    local target_commit
    target_commit=$(cat "$commit_file")
    
    echo "=========================================="
    echo "Rollback to Snapshot: $snapshot"
    echo "=========================================="
    echo ""
    echo "Target commit: $target_commit"
    echo ""
    
    # Confirm rollback
    read -r -p "Proceed with rollback? (yes/no): " confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "❌ Rollback cancelled"
        exit 1
    fi
    
    echo ""
    echo "Starting rollback..."
    echo ""
    
    # Reset to snapshot commit
    echo "1. Resetting git repository to commit $target_commit..."
    if ! git -C "$PROJECT_ROOT" reset --hard "$target_commit"; then
        echo "✗ Failed to reset git repository" >&2
        exit 1
    fi
    echo "✓ Git repository reset"
    echo ""
    
    # Run deployment
    echo "2. Running deployment to apply rollback..."
    echo ""
    
    if [ -f "$SCRIPT_DIR/deploy.sh" ]; then
        "$SCRIPT_DIR/deploy.sh" --no-interactive
    else
        echo "✗ Deploy script not found at $SCRIPT_DIR/deploy.sh" >&2
        exit 1
    fi
    
    echo ""
    echo "=========================================="
    echo "✓ Rollback completed successfully"
    echo "=========================================="
    echo ""
    echo "Repository is now at commit: $(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
}

# --- Main Script ---

SNAPSHOT="${1:-}"

case "$SNAPSHOT" in
    -h|--help)
        print_help
        exit 0
        ;;
    "")
        list_snapshots
        exit 0
        ;;
    *)
        rollback_to_snapshot "$SNAPSHOT"
        ;;
esac

