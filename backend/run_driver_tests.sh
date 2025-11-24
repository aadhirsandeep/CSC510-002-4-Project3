#!/bin/bash
# Quick test runner for driver assignment feature
# Usage: ./run_driver_tests.sh

echo "=========================================="
echo "Driver Assignment Feature Test Runner"
echo "=========================================="
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "Running automated Python test suite..."
    python3 test_driver_assignment.py
elif command -v python &> /dev/null; then
    echo "Running automated Python test suite..."
    python test_driver_assignment.py
else
    echo "Python not found. Please run tests manually using the commands in QUICK_TEST_COMMANDS.txt"
fi

echo ""
echo "=========================================="
echo "For manual testing with curl:"
echo "1. Read DRIVER_ASSIGNMENT_README.md"
echo "2. Use commands from QUICK_TEST_COMMANDS.txt"
echo "3. Follow step-by-step guide in DRIVER_ASSIGNMENT_TESTING.md"
echo "=========================================="

