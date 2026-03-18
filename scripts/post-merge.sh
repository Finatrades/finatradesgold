#!/bin/bash
set -e

npm run db:push --force < /dev/null 2>&1 || true
