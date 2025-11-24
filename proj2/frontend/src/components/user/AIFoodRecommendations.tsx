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
 * @component AIFoodRecommendations
 * @description AI-powered food recommendation component that suggests menu items based on:
 * - User's historical orders
 * - Current emotional state
 * - Calorie goals and restrictions
 * - Time of day and seasonal factors
 * - Similar user preferences
 * 
 * The component uses machine learning to analyze patterns and provide personalized 
 * suggestions that align with the user's health goals while considering their 
 * emotional state and past preferences.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Lightbulb, Target } from 'lucide-react';
import FoodSuggestions from './FoodSuggestions';
import { MenuItem, User } from '../../api/types';
import { goalsApi, itemsApi } from '../../api';

interface AIFoodRecommendationsProps {
  user: User;
}

const AIFoodRecommendations: React.FC<AIFoodRecommendationsProps> = ({ user }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [todayCalories, setTodayCalories] = useState(0);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [effectiveUser, setEffectiveUser] = useState<User>(user);
  const [restaurantsById, setRestaurantsById] = useState<Record<string, any>>({});

  // ---------- helpers ----------
  const coerceNumber = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
    return undefined;
  };

  const calcAge = (dob?: string): number | undefined => {
    if (!dob) return undefined;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const normalizeActivity = (raw: any):
    | 'sedentary'
    | 'light'
    | 'moderate'
    | 'active'
    | 'very active' => {
    const s = String(raw ?? '').toLowerCase().trim();
    if (['sedentary', 'none', 'rest', '1'].includes(s)) return 'sedentary';
    if (['light', 'lightly active', 'lightly_active', '2'].includes(s)) return 'light';
    if (['moderate', 'moderately active', 'moderately_active', '3', 'avg', 'medium'].includes(s)) return 'moderate';
    if (['active', '4', 'high'].includes(s)) return 'active';
    if (['very active', 'very_active', 'veryactive', 'extremely active', 'extremely_active', '5', 'extreme'].includes(s))
      return 'very active';
    return 'moderate';
  };

  const activityMultiplier = (level?: string): number => {
    const l = normalizeActivity(level).toLowerCase();
    switch (l) {
      case 'sedentary': return 1.2;
      case 'light': return 1.375;
      case 'moderate': return 1.55;
      case 'active': return 1.725;
      case 'very active': return 1.9;
      default: return 1.55;
    }
  };

  // Final fallback if no daily_calorie_goal exists
  const computeHarrisBenedict = (u: any): number | null => {
    const height_cm = coerceNumber(u?.height_cm ?? u?.height);
    const weight_kg = coerceNumber(u?.weight_kg ?? u?.weight);
    const sex = (u?.sex || u?.gender || '').toString().toUpperCase(); // 'M' or 'F'
    const age_years = calcAge(u?.dob);
    if (!height_cm || !weight_kg || !age_years || (sex !== 'M' && sex !== 'F')) return null;

    let bmr: number;
    if (sex === 'M') {
      bmr = 88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age_years;
    } else {
      bmr = 447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.330 * age_years;
    }
    const mult = activityMultiplier(u?.activityLevel ?? u?.activity_level ?? u?.activity);
    return Math.max(1, Math.round(bmr * mult));
  };

  // ---------- load data ----------
  useEffect(() => {
    const run = async () => {
      setLoading(true);

      // 0) Hydrate user; prefer server-provided prop, use localStorage to fill in missing fields
      try {
        const stored = localStorage.getItem(`user:${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const level = normalizeActivity(parsed?.activityLevel ?? parsed?.activity_level ?? parsed?.activity);
          setEffectiveUser({ ...parsed, ...user, activityLevel: level } as any);
        } else {
          const level = normalizeActivity((user as any)?.activityLevel ?? (user as any)?.activity_level);
          setEffectiveUser({ ...user, activityLevel: level } as any);
        }
      } catch {
        const level = normalizeActivity((user as any)?.activityLevel ?? (user as any)?.activity_level);
        setEffectiveUser({ ...user, activityLevel: level } as any);
      }

      // 1) Today's calories: backend → local fallback
      try {
        const res = await goalsApi.getTodayIntake();
        if (res?.data?.calories !== undefined) {
          setTodayCalories(res.data.calories);
        } else {
          throw new Error('No backend data');
        }
      } catch {
        try {
          const orders = localStorage.getItem('orders');
          if (orders) {
            const parsed = JSON.parse(orders);
            const today = new Date().toDateString();
            const todayOrders = parsed.filter((o: any) => new Date(o.createdAt).toDateString() === today);
            const total = todayOrders.reduce((sum: number, o: any) => sum + (o.totalCalories || 0), 0);
            setTodayCalories(total);
          } else {
            setTodayCalories(0);
          }
        } catch {
          setTodayCalories(0);
        }
      }

      // 2) Menu items — ensure restaurantId is a STRING to match restaurant map
      try {
        const res = await itemsApi.listAll();
        if (res?.data && Array.isArray(res.data)) {
          const transformed = res.data.map((item: any) => ({
            ...item,
            restaurantId: String(item.cafe_id ?? item.cafeId ?? item.restaurantId ?? ''), // 🔑 normalize to string
            isVegetarian: item.is_vegetarian ?? item.isVegetarian ?? false,
            servings: item.servings || 1,
          }));
          setAllMenuItems(transformed);
        } else {
          setAllMenuItems([]);
        }
      } catch {
        setAllMenuItems([]);
      }

      // 3) Restaurants list — fetch from backend with base URL and normalize keys to STRING
      try {
        const base = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const map: Record<string, any> = {};

        try {
          const rres = await fetch(`${base}/cafes`, { credentials: 'include' });
          if (rres.ok) {
            const data = await rres.json();
            if (Array.isArray(data)) {
              for (const r of data) {
                const key = r?.id ?? r?.cafe_id ?? r?.uuid;
                if (key !== undefined && key !== null) map[String(key)] = r; // 🔑 normalize to string
              }
            }
          }
        } catch (e) {
          console.debug('[ai] /cafes fetch failed', e);
        }

        // Fallback: localStorage 'restaurants'
        if (Object.keys(map).length === 0) {
          const stored = localStorage.getItem('restaurants');
          if (stored) {
            try {
              const arr = JSON.parse(stored);
              if (Array.isArray(arr)) {
                for (const r of arr) {
                  const key = r?.id ?? r?.cafe_id ?? r?.uuid;
                  if (key !== undefined && key !== null) map[String(key)] = r;
                }
              }
            } catch {/* ignore */}
          }
        }

        setRestaurantsById(map);
      } catch {
        setRestaurantsById({});
      }

      setLoading(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // ---------- goal + progress ----------
  const resolvedGoal = useMemo(() => {
    const fromDaily = coerceNumber((effectiveUser as any).daily_calorie_goal);
    if (typeof fromDaily === 'number') return fromDaily;

    const direct = coerceNumber((effectiveUser as any).calorieGoal);
    if (typeof direct === 'number') return direct;

    const hb = computeHarrisBenedict(effectiveUser);
    if (typeof hb === 'number' && Number.isFinite(hb) && hb > 0) return hb;

    return 2000;
  }, [effectiveUser]);

  const progress = Math.min((todayCalories / resolvedGoal) * 100, 100);
  const remaining = Math.max(0, resolvedGoal - todayCalories);

  // ---------- enrich items with restaurantName (so children can render name directly) ----------
  const enrichedMenuItems = useMemo(() => {
    if (!Array.isArray(allMenuItems)) return [];
    return allMenuItems.map((it: any) => {
      const rid = String(it.restaurantId ?? '');
      const cafe = restaurantsById[rid];
      return {
        ...it,
        restaurantName: cafe?.name ?? cafe?.title ?? 'Unknown restaurant',
        restaurantAddress: cafe?.address ?? '',
      };
    });
  }, [allMenuItems, restaurantsById]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-4 w-40 rounded bg-muted mb-3" />
        <div className="animate-pulse h-4 w-24 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Food Recommendations
          </CardTitle>
          <CardDescription>Personalized picks based on your profile by us</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              Daily goal:&nbsp;<strong>{resolvedGoal} cal</strong>
            </div>
            <div className="text-sm">
              Today:&nbsp;<strong>{todayCalories} cal</strong>&nbsp;• Remaining:&nbsp;<strong>{remaining} cal</strong>
            </div>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {/* Pass enriched menu and the normalized restaurants map */}
      {remaining <= 0 ? (
        <div className="text-center text-muted-foreground py-10">
          🍽️ No AI recommendations available — you've reached your daily calorie goal.
        </div>
      ) : (
        <FoodSuggestions
          user={effectiveUser}
          menuItems={enrichedMenuItems as any}
          currentCaloriesToday={todayCalories}
          // pass the parent's computed remaining so the child uses the same budget
          remainingCalories={remaining}
          restaurantsById={restaurantsById}
        />
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>
    </div>
  );
};

export default AIFoodRecommendations;
