#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== ERP Platform Setup Script ==="

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//')
REQUIRED_MAJOR=20
INSTALLED_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$INSTALLED_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  echo "ERROR: Node.js >= $REQUIRED_MAJOR required. Found $NODE_VERSION"
  exit 1
fi
echo "Node.js version: $NODE_VERSION ✓"

# Check npm version
NPM_VERSION=$(npm -v 2>/dev/null)
echo "npm version: $NPM_VERSION ✓"

# Install dependencies
echo "Installing dependencies..."
cd "$PROJECT_ROOT"
npm install

# Install husky for git hooks
echo "Setting up husky..."
npm run prepare 2>/dev/null || echo "Husky setup skipped"

# Create .env file from example
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "WARNING: .env.example not found"
  fi
fi

# Setup MongoDB
echo "MongoDB setup..."
if command -v mongod &> /dev/null; then
  echo "MongoDB found in system"
else
  echo "NOTE: MongoDB not found locally. Use mongodb-memory-server for tests."
fi

# Install development dependencies
echo "Installing dev dependencies..."
npm install -D typescript tsx vitest mongodb-memory-server @types/uuid @types/node || true

# Create test directories
mkdir -p tests/unit tests/integration tests/contracts tests/e2e tests/security tests/qa

# Create dist directory
mkdir -p dist

echo ""
echo "=== Setup Complete ==="
echo "Run the following commands to get started:"
echo "  npm run dev         - Start development server"
echo "  npm run test:unit   - Run unit tests"
echo "  npm run test:integration - Run integration tests"
echo "  npm run typecheck   - Type check"
echo "  npm run lint        - Lint code"
