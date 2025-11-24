# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def daily_calorie_recommendation(height_cm: float, weight_kg: float, sex: str, age_years: int, activity: str) -> int:
    """Calculate daily calorie recommendation using revised Harris-Benedict BMR formula with activity multiplier."""
    sex = (sex or "").strip().upper()
    # Harris–Benedict (revised)
    if sex.startswith("M"):
        bmr = 88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age_years
    else:  # Female (default)
        bmr = 447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.330 * age_years

    factors = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }
    mult = factors.get((activity or "").lower(), 1.55)
    return int(round(bmr * mult))
