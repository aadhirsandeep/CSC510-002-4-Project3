#!/usr/bin/env python3
# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Comprehensive test script for OCR API endpoints
Tests both PDF upload and text parsing endpoints
"""

import os
import sys
import requests
import json
import time
from pathlib import Path

def test_health_endpoint(base_url="http://localhost:8000"):
    """Test the health check endpoint."""
    print("Testing OCR Health Check Endpoint...")
    
    try:
        response = requests.get(f"{base_url}/ocr/health")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Health Check Passed: {data}")
            return True
        else:
            print(f"Health Check Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Health Check Error: {str(e)}")
        return False

def test_text_parsing_endpoint(base_url="http://localhost:8000", auth_token=None):
    """Test the text parsing endpoint."""
    print("\nTesting Text Parsing Endpoint...")
    
    test_menu_text = """
    RESTAURANT MENU
    
    APPETIZERS
    Buffalo Wings - $9.99
    Spicy chicken wings with celery and blue cheese dip
    
    Mozzarella Sticks - $7.99
    Golden fried mozzarella cheese with marinara sauce
    
    MAIN COURSES
    Grilled Salmon - $18.99
    Fresh Atlantic salmon with lemon herb butter
    
    Vegetarian Pasta - $14.99
    Penne pasta with seasonal vegetables in tomato sauce
    
    BEVERAGES
    Fresh Orange Juice - $4.99
    Freshly squeezed orange juice, 12oz
    
    Coffee - $3.99
    Premium blend coffee, 16oz
    """
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    payload = {
        "text_content": test_menu_text
    }
    
    try:
        response = requests.post(
            f"{base_url}/ocr/parse-menu-text",
            headers=headers,
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Text Parsing Success!")
            print(f"Number of items parsed: {len(data.get('items', []))}")
            
            # Display parsed items
            for i, item in enumerate(data.get('items', []), 1):
                print(f"  {i}. {item.get('name')} - ${item.get('price')}")
                print(f"     Calories: {item.get('calories')}, Vegetarian: {item.get('veg_flag')}")
            
            return True
        else:
            print(f"Text Parsing Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Text Parsing Error: {str(e)}")
        return False

def test_pdf_upload_endpoint(base_url="http://localhost:8000", auth_token=None):
    """Test the PDF upload endpoint."""
    print("\nTesting PDF Upload Endpoint...")
    
    pdf_file = "test_menu.pdf"
    
    if not os.path.exists(pdf_file):
        print(f"PDF file not found: {pdf_file}")
        print("Please run 'python create_test_pdf.py' first to create the test PDF")
        return False
    
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        with open(pdf_file, 'rb') as f:
            files = {"file": (pdf_file, f, "application/pdf")}
            
            response = requests.post(
                f"{base_url}/ocr/parse-menu",
                headers=headers,
                files=files
            )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"PDF Upload Success!")
            print(f"Number of items parsed: {len(data.get('items', []))}")
            
            # Display parsed items
            for i, item in enumerate(data.get('items', []), 1):
                print(f"  {i}. {item.get('name')} - ${item.get('price')}")
                print(f"     Calories: {item.get('calories')}, Vegetarian: {item.get('veg_flag')}")
                if item.get('ingredients'):
                    print(f"     Ingredients: {item.get('ingredients')}")
            
            return True
        else:
            print(f"PDF Upload Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"PDF Upload Error: {str(e)}")
        return False

def main():
    """Main test function."""
    print("Starting OCR API Endpoint Tests")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    
    # Test 1: Health Check
    health_ok = test_health_endpoint(base_url)
    
    if not health_ok:
        print("\nHealth check failed. Make sure the server is running:")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return
    
    # Test 2: Text Parsing
    text_ok = test_text_parsing_endpoint(base_url)
    
    # Test 3: PDF Upload
    pdf_ok = test_pdf_upload_endpoint(base_url)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY:")
    print(f"Health Check: {'PASS' if health_ok else 'FAIL'}")
    print(f"Text Parsing: {'PASS' if text_ok else 'FAIL'}")
    print(f"PDF Upload:   {'PASS' if pdf_ok else 'FAIL'}")
    
    if health_ok and text_ok and pdf_ok:
        print("\nALL TESTS PASSED! OCR API is working correctly.")
    else:
        print("\nSome tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
