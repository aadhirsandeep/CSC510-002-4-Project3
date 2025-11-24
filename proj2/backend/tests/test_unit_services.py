# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import os
from pathlib import Path
from app.services.recommend import daily_calorie_recommendation
from app.services.ocr import parse_menu_pdf

def test_daily_calorie_recommendation_male_moderate():
    cals = daily_calorie_recommendation(height_cm=175, weight_kg=70, sex="M", age_years=30, activity="moderate")
    assert isinstance(cals, int)
    assert 2200 <= cals <= 2800

def test_daily_calorie_recommendation_female_sedentary():
    cals = daily_calorie_recommendation(height_cm=160, weight_kg=60, sex="F", age_years=28, activity="sedentary")
    assert 1400 <= cals <= 2000

# def test_parse_menu_pdf_stub():
#     # Get the path to test_menu.pdf relative to the test file
#     test_dir = Path(__file__).parent
#     backend_dir = test_dir.parent
#     pdf_path = backend_dir / "test_menu.pdf"
    
#     # Read the PDF file as bytes
#     with open(pdf_path, 'rb') as f:
#         pdf_bytes = f.read()
    
#     # Test parsing the PDF
#     items = parse_menu_pdf(pdf_bytes)
#     assert len(items) >= 2
#     names = [i.name for i in items]
#     # Check for items that should be in the test_menu.pdf based on create_test_pdf.py
#     assert "Buffalo Wings" in names or "Grilled Salmon" in names or "Chocolate Lava Cake" in names
