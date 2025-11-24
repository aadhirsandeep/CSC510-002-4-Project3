/**
 * Copyright (c) 2025 Group 2
 * All rights reserved.
 * 
 * This project and its source code are the property of Group 2:
 * - Aryan Tapkire
 * - Dilip Irala Narasimhareddy
 * - Sachi Vyas
 * - Supraj Gijre
 *
 * @component FoodSuggestions
 * @description Renders calorie-aware suggested menu items for a user. Prefers
 * items that fit within the user's remaining calories and shows compact cards
 * with item metadata and optional restaurant info. Shows an explicit "no
 * suggestions" state when nothing fits.
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Utensils, MapPin } from 'lucide-react';
import { MenuItem, User } from '../../api/types';
import { cartApi } from '../../api/cart'; // <-- uses your existing cart API
import { toast } from 'sonner';

interface FoodSuggestionsProps {
  user: User;
  menuItems: MenuItem[];
  currentCaloriesToday: number;
  // If provided, use this pre-computed remaining calories (preferred). Falls back to
  // per-user calorieGoal lookup for backward-compatibility.
  remainingCalories?: number;
  // NEW: a map of restaurant/cafe by id: { [id]: { id, name, address, ... } }
  restaurantsById?: Record<string | number, any>;
}

const FoodSuggestions: React.FC<FoodSuggestionsProps> = ({
  user,
  menuItems,
  currentCaloriesToday,
  remainingCalories,
  restaurantsById = {},
}) => {
  const [addingId, setAddingId] = useState<number | string | null>(null);

  const calorieGoal =
    (user as any).daily_calorie_goal || (user as any).calorieGoal || 2000;
  // Prefer a pre-computed remainingCalories prop (provided by the parent) to avoid
  // duplicating the calorie-goal calculation logic. Fall back to computing from
  // the user object for backward-compatibility.
  const remaining =
    typeof remainingCalories === 'number'
      ? remainingCalories
      : Math.max(0, calorieGoal - currentCaloriesToday);

  const sortedItems = useMemo(() => {
    const fit = menuItems.filter(
      (item) => typeof item.calories === 'number' && item.calories <= remaining
    );
    if (fit.length > 0) {
      return fit.sort((a, b) => (a.calories || 0) - (b.calories || 0));
    }
    return menuItems
      .filter((item) => typeof item.calories === 'number')
      .sort((a, b) => (a.calories || 0) - (b.calories || 0))
      .slice(0, 12);
  }, [menuItems, remaining]);

  const handleAddToCart = async (item: any) => {
    try {
      setAddingId(item.id);
      // Prefer cafe_id if present, else restaurantId (AIFoodRecommendations maps this):contentReference[oaicite:1]{index=1}
      const cafeId = item.cafe_id ?? item.restaurantId;
      if (!cafeId) {
        toast.error('Missing cafe/restaurant id for this item.');
        return;
      }
      const payload = {
        cafe_id: Number(cafeId),
        item_id: Number(item.id),
        quantity: 1,
      };
      const res = await cartApi.addToCart(payload);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Added "${item.name}" to your cart`);
      }
    } catch (err: any) {
      toast.error('Failed to add to cart. Please try again.');
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  if (!sortedItems || sortedItems.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        🍽️ No food suggestions available right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Header summary --- */}
      {/* <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Utensils className="h-5 w-5 text-green-600" />
            Suggested Meals For You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              <strong>Daily Goal:</strong> {calorieGoal} cal
            </span>
            <span>
              <strong>Consumed:</strong> {currentCaloriesToday} cal
            </span>
            <span>
              <strong>Remaining:</strong> {remaining} cal
            </span>
          </div>
        </CardContent>
      </Card> */}

      {/* --- Suggestions Grid --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedItems.map((item) => {
          const rid = item.cafe_id ?? item.restaurantId;
          const r = rid != null ? restaurantsById[rid] : undefined;
          const restaurantName = r?.name || r?.title || 'Unknown restaurant';
          // Only show an address if one is available; do not show a fallback string.
          const restaurantAddress = r?.address || r?.location || r?.addr || '';

          return (
            <Card
              key={item.id}
              className="hover:shadow-lg transition-all duration-200 border border-gray-200"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex justify-between items-center">
                  <span>{item.name}</span>
                  {(item as any).isVegetarian && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      Veg
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}

                {/* Calories + Restaurant */}
                <div className="text-sm text-muted-foreground space-y-1">
                  {item.category && <p>Category: {item.category}</p>}
                  {typeof item.calories === 'number' && (
                    <p>Calories: {item.calories} cal</p>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{restaurantName}</p>
                      {restaurantAddress ? (
                        <p className="text-xs">{restaurantAddress}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  disabled={addingId === item.id}
                  onClick={() => handleAddToCart(item)}
                >
                  {addingId === item.id ? 'Adding…' : 'Add to Order'}
                </Button> */}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FoodSuggestions;
