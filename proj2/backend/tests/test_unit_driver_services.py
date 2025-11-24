# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import math
from app.services import driver as driver_svc


def test_calculate_distance_basic():
    # Sanity: distance from a point to itself is ~0
    d = driver_svc.calculate_distance(0.0, 0.0, 0.0, 0.0)
    assert abs(d) < 1e-6

    # Known distance: approximate between two nearby points
    d2 = driver_svc.calculate_distance(37.7749, -122.4194, 37.7750, -122.4195)
    # Should be small but > 0
    assert d2 > 0 and d2 < 1

