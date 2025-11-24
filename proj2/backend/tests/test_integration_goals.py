# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Integration tests for calorie goals workflow - testing goal setting,
tracking, intake calculation, and recommendation integration.
"""

from datetime import date, timedelta


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_set_and_retrieve_goal(client):
    """Test setting a calorie goal and retrieving it - core goal management workflow."""
    user_hdr, user = register_and_login(client, "user_goal@example.com", "upw", name="UGoal")
    
    # Set a goal
    today = date.today()
    r_set = client.post("/goals/set", json={
        "period": "daily",
        "target_calories": 2000,
        "start_date": str(today)
    }, headers=user_hdr)
    assert r_set.status_code == 200
    goal = r_set.json()
    assert goal["target_calories"] == 2000
    assert goal["period"] == "daily"
    assert "id" in goal  # GoalOut includes id, but not user_id
    
    # Retrieve current goals
    r_get = client.get("/goals/current", headers=user_hdr)
    assert r_get.status_code == 200
    goals = r_get.json()
    assert isinstance(goals, list)
    assert len(goals) >= 1
    assert any(g["target_calories"] == 2000 for g in goals)


def test_multiple_goals_over_time(client):
    """Test setting multiple goals and retrieving them - validating goal history."""
    user_hdr, user = register_and_login(client, "user_goal2@example.com", "upw", name="UGoal2")
    
    # Set first goal
    today = date.today()
    r1 = client.post("/goals/set", json={
        "period": "daily",
        "target_calories": 1800,
        "start_date": str(today)
    }, headers=user_hdr)
    assert r1.status_code == 200
    
    # Set second goal for future
    future = today + timedelta(days=7)
    r2 = client.post("/goals/set", json={
        "period": "daily",
        "target_calories": 2200,
        "start_date": str(future)
    }, headers=user_hdr)
    assert r2.status_code == 200
    
    # Retrieve all goals
    r_get = client.get("/goals/current", headers=user_hdr)
    assert r_get.status_code == 200
    goals = r_get.json()
    assert len(goals) >= 2
    calories = [g["target_calories"] for g in goals]
    assert 1800 in calories
    assert 2200 in calories


def test_today_intake_calculation_with_orders(client):
    """Test that today's calorie intake is correctly calculated from orders - core tracking feature."""
    # Setup: owner creates cafe and item
    owner_hdr, _ = register_and_login(client, "owner_goal@example.com", "opw", name="OwnGoal", role="OWNER")
    r = client.post("/cafes", json={"name": "GoalCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "GoalItem", "description": "d", "calories": 500, "price": 10.0}, headers=owner_hdr)
    item = r.json()
    
    # User places order
    user_hdr, user = register_and_login(client, "user_goal3@example.com", "upw", name="UGoal3")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 2}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Get today's intake
    r_intake = client.get("/goals/intake/today", headers=user_hdr)
    assert r_intake.status_code == 200
    intake = r_intake.json()
    assert intake["calories"] == 1000  # 500 * 2
    assert intake["date"] == str(date.today())


def test_today_intake_only_counts_assigned_items(client):
    """Test that intake only counts items assigned to the user - validating assignee logic."""
    owner_hdr, _ = register_and_login(client, "owner_goal4@example.com", "opw", name="OwnGoal4", role="OWNER")
    r = client.post("/cafes", json={"name": "GoalCafe4", "address": "A", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    # Create two different items to avoid cart merge issue (same item with different assignees merges)
    r1 = client.post(f"/items/{cafe_id}", json={"name": "GoalItem4A", "description": "d", "calories": 300, "price": 8.0}, headers=owner_hdr)
    item1 = r1.json()
    r2 = client.post(f"/items/{cafe_id}", json={"name": "GoalItem4B", "description": "d", "calories": 300, "price": 8.0}, headers=owner_hdr)
    item2 = r2.json()
    
    # Create two users
    user1_hdr, user1 = register_and_login(client, "user_goal4@example.com", "upw", name="UGoal4")
    user2_hdr, user2 = register_and_login(client, "user_goal5@example.com", "upw", name="UGoal5")
    
    # User1 adds item1 for themselves and item2 for user2
    r = client.post("/cart/add", json={"item_id": item1["id"], "quantity": 1}, headers=user1_hdr)
    r = client.post("/cart/add", json={"item_id": item2["id"], "quantity": 2, "assignee_email": user2["email"]}, headers=user1_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user1_hdr)
    
    # User1's intake should only count items assigned to them from orders they placed
    # The API filters by Order.user_id == current.id AND OrderItem.assignee_user_id == current.id
    r_intake1 = client.get("/goals/intake/today", headers=user1_hdr)
    assert r_intake1.status_code == 200
    # User1 has 1 item assigned to them (300 calories)
    assert r_intake1.json()["calories"] == 300
    
    # User2's intake: since they didn't place any orders, the query filters by Order.user_id == current.id
    # which means they won't see items from orders they didn't place
    r_intake2 = client.get("/goals/intake/today", headers=user2_hdr)
    assert r_intake2.status_code == 200
    # User2 didn't place any orders, so intake is 0 (API filters by Order.user_id == current.id)
    assert r_intake2.json()["calories"] == 0


def test_calorie_recommendation_integration(client):
    """Test calorie recommendation endpoint with different user profiles - validating recommendation logic."""
    # Test male, moderate activity
    r1 = client.post("/goals/recommend", json={
        "height_cm": 175,
        "weight_kg": 70,
        "sex": "M",
        "age_years": 30,
        "activity": "moderate"
    })
    assert r1.status_code == 200
    rec1 = r1.json()
    assert "daily_calorie_goal" in rec1
    assert isinstance(rec1["daily_calorie_goal"], int)
    assert 2200 <= rec1["daily_calorie_goal"] <= 2800
    
    # Test female, sedentary
    r2 = client.post("/goals/recommend", json={
        "height_cm": 160,
        "weight_kg": 60,
        "sex": "F",
        "age_years": 28,
        "activity": "sedentary"
    })
    assert r2.status_code == 200
    rec2 = r2.json()
    assert rec2["daily_calorie_goal"] < rec1["daily_calorie_goal"]  # Sedentary should be less than moderate


def test_goal_with_complete_user_journey(client):
    """Test complete workflow: set goal, track intake, verify against goal - end-to-end validation."""
    owner_hdr, _ = register_and_login(client, "owner_goal5@example.com", "opw", name="OwnGoal5", role="OWNER")
    r = client.post("/cafes", json={"name": "GoalCafe5", "address": "A", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    # Create items with different calorie counts
    r1 = client.post(f"/items/{cafe_id}", json={"name": "LowCal", "description": "d", "calories": 200, "price": 5.0}, headers=owner_hdr)
    item1 = r1.json()
    r2 = client.post(f"/items/{cafe_id}", json={"name": "HighCal", "description": "d", "calories": 800, "price": 15.0}, headers=owner_hdr)
    item2 = r2.json()
    
    user_hdr, _ = register_and_login(client, "user_goal6@example.com", "upw", name="UGoal6")
    
    # Set a goal
    today = date.today()
    r_goal = client.post("/goals/set", json={
        "period": "daily",
        "target_calories": 2000,
        "start_date": str(today)
    }, headers=user_hdr)
    assert r_goal.status_code == 200
    
    # Initially intake should be 0
    r_intake = client.get("/goals/intake/today", headers=user_hdr)
    assert r_intake.json()["calories"] == 0
    
    # Add items and place order
    r = client.post("/cart/add", json={"item_id": item1["id"], "quantity": 2}, headers=user_hdr)
    r = client.post("/cart/add", json={"item_id": item2["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    
    # Intake should now reflect the order (2*200 + 1*800 = 1200)
    r_intake2 = client.get("/goals/intake/today", headers=user_hdr)
    assert r_intake2.json()["calories"] == 1200


def test_goals_endpoint_requires_authentication(client):
    """Test that goals endpoints require authentication - validating security."""
    # Try to access goals without authentication
    r = client.get("/goals/current")
    assert r.status_code == 401
    
    r2 = client.get("/goals/intake/today")
    assert r2.status_code == 401
    
    r3 = client.post("/goals/set", json={"period": "daily", "target_calories": 2000, "start_date": str(date.today())})
    assert r3.status_code == 401

