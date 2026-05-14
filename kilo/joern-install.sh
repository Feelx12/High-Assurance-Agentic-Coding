#!/usr/bin/env bash
#
# Joern Installation Script for Unix-like systems (macOS, Linux, WSL)
#
# Usage: ./joern-install.sh
#
# Requirements:
# - Java 11+ installed
# - curl or wget available
#

set -e

INSTALL_DIR="${HOME}/bin/joern"
JOERN_VERSION="2.0.0"

echo "=== Joern Installation Script ==="

# Check Java
if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install Java 11+ and retry."
    exit 1
fi
echo "✓ Java is installed"

# Install location
mkdir -p "${INSTALL_DIR}"

# Download and extract
echo "Downloading Joern ${JOERN_VERSION}..."
curl -L "https://github.com/joernio/joern/releases/download/v${JOERN_VERSION}/joern-${JOERN_VERSION}.zip" -o /tmp/joern.zip

echo "Extracting..."
unzip -o /tmp/joern.zip -d "${INSTALL_DIR}"
rm /tmp/joern.zip

# Create joern-parse symlink if needed
JOERN_CLI="${INSTALL_DIR}/joern-${JOERN_VERSION}/joern-cli"
if [ -d "${JOERN_CLI}" ]; then
    ln -sf "${JOERN_CLI}/bin/joern" "${HOME}/bin/joern" 2>/dev/null || true
    ln -sf "${JOERN_CLI}/bin/joern-parse" "${HOME}/bin/joern-parse" 2>/dev/null || true
    echo "✓ Symlinks created in ~/bin/"
else
    # Handle case where structure is different
    for f in "${INSTALL_DIR}"/joern-*/bin/*; do
        ln -sf "$f" "${HOME}/bin/$(basename $f)" 2>/dev/null || true
    done
fi

# Add to PATH if needed
if [[ ":$PATH:" != *":${HOME}/bin:"* ]]; then
    echo ""
    echo "Add to your ~/.bashrc or ~/.zshrc:"
    echo "  export PATH=\"\$HOME/bin:\$PATH\""
fi

echo ""
echo "=== Installation Complete ==="
echo "Joern installed to: ${INSTALL_DIR}"
echo "Verify with: joern --version"