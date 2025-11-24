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
Test script for OCR functionality using Mistral API.
This script tests the OCR service with sample menu text.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.ocr import OCRService

async def test_ocr_service():
    """Test the OCR service with sample menu text."""
    
    # Check if Mistral API key is set
    mistral_key = os.getenv("MISTRAL_API_KEY")
    if not mistral_key:
        print("MISTRAL_API_KEY environment variable not set!")
        print("Please set your Mistral API key:")
        print("export MISTRAL_API_KEY='your-api-key-here'")
        return False
    
    print("Mistral API key found")
    
    # Sample menu text for testing
    sample_menu_text = """
    CAFE MENU
    
    APPETIZERS
    Chicken Wings - $8.99
    Crispy chicken wings with buffalo sauce
    
    Mozzarella Sticks - $6.99
    Golden fried mozzarella with marinara sauce
    
    MAIN COURSES
    Grilled Chicken Sandwich - $12.99
    Grilled chicken breast with lettuce, tomato, and mayo
    
    Veggie Burger - $10.99
    Plant-based patty with avocado and sprouts
    
    Caesar Salad - $9.99
    Fresh romaine lettuce with parmesan and croutons
    
    BEVERAGES
    Fresh Orange Juice - $3.99
    Freshly squeezed orange juice
    
    Coffee - $2.99
    Premium blend coffee
    
    DESSERTS
    Chocolate Cake - $5.99
    Rich chocolate cake with vanilla ice cream
    
    Apple Pie - $4.99
    Homemade apple pie with cinnamon
    """
    
    try:
        print("\nTesting OCR Service...")
        ocr_service = OCRService()
        
        print("Parsing sample menu text...")
        menu_items = ocr_service.parse_menu_with_mistral(sample_menu_text)
        
        print(f"\nSuccessfully parsed {len(menu_items)} menu items!")
        print("\nParsed Menu Items:")
        print("-" * 50)
        
        for i, item in enumerate(menu_items, 1):
            print(f"{i}. {item.name}")
            print(f"   Price: ${item.price}")
            print(f"   Calories: {item.calories}")
            print(f"   Vegetarian: {'Yes' if item.veg_flag else 'No'}")
            if item.kind:
                print(f"   Category: {item.kind}")
            if item.ingredients:
                print(f"   Ingredients: {item.ingredients}")
            print()
        
        return True
        
    except Exception as e:
        print(f"Error testing OCR service: {str(e)}")
        return False

async def test_health_check():
    """Test the health check functionality."""
    try:
        print("\nTesting OCR Health Check...")
        ocr_service = OCRService()
        
        # Test Mistral API connection
        headers = {
            "Authorization": f"Bearer {ocr_service.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "mistral-small-latest",
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 10
        }
        
        import requests
        test_response = requests.post(ocr_service.mistral_url, headers=headers, json=payload)
        test_response.raise_for_status()
        
        print("Mistral API connection successful!")
        return True
        
    except Exception as e:
        print(f"Health check failed: {str(e)}")
        return False

async def main():
    """Main test function."""
    print("Starting OCR Service Tests")
    print("=" * 50)
    
    # Test health check first
    health_ok = await test_health_check()
    
    if health_ok:
        # Test OCR functionality
        ocr_ok = await test_ocr_service()
        
        if ocr_ok:
            print("\nAll tests passed! OCR service is working correctly.")
        else:
            print("\nOCR service tests failed.")
    else:
        print("\nHealth check failed. Please check your Mistral API key.")

if __name__ == "__main__":
    asyncio.run(main())
