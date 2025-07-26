#!/bin/bash

# Quick Test Script - Fast iteration for development
# Use this for rapid testing during development

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}🔵 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🚀 Quick Test - Development Mode"
echo "================================="

# Check if we're in the right directory
if [ ! -f "pubspec.yaml" ]; then
    print_error "Not in a Flutter project directory"
    exit 1
fi

# Quick dependency check
print_step "Getting dependencies..."
flutter pub get

# Generate mocks if needed
if [ ! -d ".dart_tool/build" ] || [ "$1" = "--rebuild-mocks" ]; then
    print_step "Generating mocks..."
    flutter packages pub run build_runner build --delete-conflicting-outputs
fi

# Run tests with compact output for speed
print_step "Running tests..."
start_time=$(date +%s)

if flutter test --reporter=compact; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    print_success "All tests passed in ${duration}s! 🎉"
else
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    print_error "Tests failed after ${duration}s"
    echo ""
    echo "💡 To see detailed output, run:"
    echo "   ./test-github-simulation.sh"
    exit 1
fi

echo ""
echo "✨ Quick test complete! Ready for development."