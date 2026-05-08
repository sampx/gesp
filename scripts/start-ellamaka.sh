#!/bin/bash
# Start ellamaka with GESP project environment variables
set -a
source "$(dirname "$0")/../.env"
set +a
echo "Starting ellamaka with GESP env vars..."
ellamaka serve --wopal-space --port 44096 --mdns --mdns-domain gesp.local "$@"
