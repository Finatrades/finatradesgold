#!/bin/bash
# Use unbuffer/script to handle interactive prompts

export DATABASE_URL="$AWS_DATABASE_URL"
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Use script command to fake a tty
script -q -c "npx drizzle-kit push" /dev/null << EOFEXPECT
y







y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
EOFEXPECT
