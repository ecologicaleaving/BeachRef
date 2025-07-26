#!/bin/bash

# GitHub Actions Test Simulation Script
# Replicates the exact sequence GitHub Actions runs for BeachRef/VisConnect

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔵 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "🚀 GitHub Actions Test Simulation"
    echo "   BeachRef/VisConnect Flutter Application"
    echo "=================================================="
    echo -e "${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    if ! command_exists flutter; then
        print_error "Flutter not found. Please install Flutter first."
        exit 1
    fi
    
    if ! command_exists dart; then
        print_error "Dart not found. Please install Dart first."
        exit 1
    fi
    
    # Check Flutter version
    FLUTTER_VERSION=$(flutter --version | head -n 1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
    GITHUB_VERSION="3.24.0"
    
    if [ "$FLUTTER_VERSION" != "$GITHUB_VERSION" ]; then
        print_warning "Flutter version mismatch:"
        print_warning "  Local: $FLUTTER_VERSION"
        print_warning "  GitHub: $GITHUB_VERSION"
        print_warning "This might cause test differences."
    else
        print_success "Flutter version matches GitHub: $FLUTTER_VERSION"
    fi
}

# Step 1: Clean project
clean_project() {
    print_step "Step 1: Cleaning project (like fresh checkout)..."
    flutter clean
    print_success "Project cleaned"
}

# Step 2: Install dependencies
install_dependencies() {
    print_step "Step 2: Installing dependencies..."
    flutter pub get
    print_success "Dependencies installed"
}

# Step 3: Generate mocks
generate_mocks() {
    print_step "Step 3: Generating mocks..."
    flutter packages pub run build_runner build --delete-conflicting-outputs
    print_success "Mocks generated"
}

# Step 4: Run tests
run_tests() {
    print_step "Step 4: Running tests (main GitHub check)..."
    
    # Store start time
    start_time=$(date +%s)
    
    # Run tests and capture output
    if flutter test --reporter=expanded 2>&1 | tee test_output.log; then
        # Count results from the log
        PASSED=$(grep -c "✓" test_output.log || echo "0")
        FAILED=$(grep -c "✗" test_output.log || echo "0")
        
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        
        echo ""
        echo "📊 Test Results:"
        echo "   ✅ Passed: $PASSED"
        echo "   ❌ Failed: $FAILED"
        echo "   ⏱️ Duration: ${duration}s"
        
        if [ "$FAILED" -eq 0 ]; then
            print_success "All tests passed! 🎉"
            return 0
        else
            print_error "$FAILED tests failed"
            echo ""
            echo "📋 Failed Tests Summary:"
            grep "✗" test_output.log | head -10
            if [ $(grep -c "✗" test_output.log) -gt 10 ]; then
                echo "   ... and $((FAILED - 10)) more failures"
            fi
            return 1
        fi
    else
        print_error "Test execution failed"
        return 1
    fi
}

# Step 5: Run static analysis
run_analysis() {
    print_step "Step 5: Running static analysis..."
    if flutter analyze; then
        print_success "Static analysis passed"
        return 0
    else
        print_error "Static analysis failed"
        return 1
    fi
}

# Step 6: Build web (optional, like GitHub)
build_web() {
    print_step "Step 6: Building web application..."
    if flutter build web --release; then
        print_success "Web build completed"
        return 0
    else
        print_error "Web build failed"
        return 1
    fi
}

# Summary function
print_summary() {
    local test_result=$1
    local analysis_result=$2
    local build_result=$3
    
    echo ""
    echo "=================================================="
    echo "🏁 GitHub Actions Simulation Summary"
    echo "=================================================="
    
    if [ $test_result -eq 0 ]; then
        echo "✅ Tests: PASSED"
    else
        echo "❌ Tests: FAILED"
    fi
    
    if [ $analysis_result -eq 0 ]; then
        echo "✅ Analysis: PASSED"
    else
        echo "❌ Analysis: FAILED"
    fi
    
    if [ $build_result -eq 0 ]; then
        echo "✅ Build: PASSED"
    else
        echo "❌ Build: FAILED"
    fi
    
    echo ""
    
    if [ $test_result -eq 0 ] && [ $analysis_result -eq 0 ]; then
        print_success "🎉 All checks passed! Ready to commit."
        echo "   Your code should pass GitHub Actions."
    else
        print_error "💥 Some checks failed!"
        echo "   Please fix issues before committing."
        echo ""
        echo "🔧 Quick fixes:"
        if [ $test_result -ne 0 ]; then
            echo "   - Check test_output.log for failed test details"
            echo "   - Run: flutter test <specific_test_file>"
        fi
        if [ $analysis_result -ne 0 ]; then
            echo "   - Fix static analysis issues"
            echo "   - Run: flutter analyze --verbose"
        fi
    fi
    
    echo ""
}

# Cleanup function
cleanup() {
    print_step "Cleaning up temporary files..."
    rm -f test_output.log
}

# Trap to ensure cleanup happens
trap cleanup EXIT

# Main execution
main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "pubspec.yaml" ]; then
        print_error "Not in a Flutter project directory. Please run from project root."
        exit 1
    fi
    
    # Check if this is the BeachRef project
    if ! grep -q "beachref" pubspec.yaml 2>/dev/null; then
        print_warning "This doesn't appear to be the BeachRef project."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    check_prerequisites
    
    # Execute all steps
    clean_project
    install_dependencies
    generate_mocks
    
    # Critical steps that determine pass/fail
    run_tests
    test_result=$?
    
    run_analysis
    analysis_result=$?
    
    build_web
    build_result=$?
    
    print_summary $test_result $analysis_result $build_result
    
    # Exit with error if tests or analysis failed
    if [ $test_result -ne 0 ] || [ $analysis_result -ne 0 ]; then
        exit 1
    fi
    
    exit 0
}

# Run main function
main "$@"