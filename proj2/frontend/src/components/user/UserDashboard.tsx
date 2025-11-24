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
 * @component UserDashboard
 * @description Main dashboard component for regular users. Displays user's calorie tracking,
 * recent orders, emotional insights, and food recommendations. Acts as the central hub for
 * user interactions with the system.
 *
 * Features:
 * - Calorie goal tracking and progress
 * - Recent order history
 * - Emotional state analysis
 * - AI-powered food recommendations
 * - Quick access to restaurants and menu
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { CalendarDays, Target, TrendingUp, Utensils } from 'lucide-react';

import { User, CartSummary } from '../../api/types';
import FoodSuggestions from './FoodSuggestions';
import { cartApi } from '../../api/cart';
import { goalsApi } from '../../api/goals';
import { getMyOrders } from '../../api/orders';

interface UserDashboardProps {
  user: User;
}

interface CalorieData {
  date: string;
  consumed: number;
  goal: number;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [calorieData, setCalorieData] = useState<CalorieData[]>([]);
  const [todayCalories, setTodayCalories] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [sampleMenuItems, setSampleMenuItems] = useState<any[]>([]); // keep empty until you have a menu items API
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendedCalories, setRecommendedCalories] = useState<number | null>(null);

  // Merge user data with localStorage (CalorieSettings saves to localStorage)
  const mergedUserData = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`user:${user.id}`) || '{}');
      const resolvedSex = (() => {
        const raw = (stored?.gender ?? (user as any)?.gender ?? (user as any)?.sex)?.toString()?.toUpperCase?.();
        return raw === 'M' || raw === 'F' ? raw : undefined;
      })();

      return {
        height_cm: Number(stored?.height) || user?.height_cm,
        weight_kg: Number(stored?.weight) || user?.weight_kg,
        dob: stored?.dob || (user as any)?.dob,
        age:
          typeof (user as any)?.age !== 'undefined'
            ? Number((user as any).age)
            : stored?.dob || (user as any)?.dob
            ? undefined
            : undefined,
        sex: resolvedSex,
        activityLevel: stored?.activityLevel || (user as any)?.activity_level || 'moderate',
        daily_calorie_goal: Number(stored?.daily_calorie_goal) || user?.daily_calorie_goal,
      };
    } catch {
      return {
        height_cm: user?.height_cm,
        weight_kg: user?.weight_kg,
        dob: (user as any)?.dob,
        age: typeof (user as any)?.age !== 'undefined' ? Number((user as any).age) : undefined,
        sex: ((user as any)?.gender ?? (user as any)?.sex)?.toString()?.toUpperCase?.(),
        activityLevel: (user as any)?.activityLevel || 'moderate',
        daily_calorie_goal: user?.daily_calorie_goal,
      };
    }
  }, [user]);

  // Normalize goal & body stats based on your types
  const goal = useMemo(
    () => Number(mergedUserData.daily_calorie_goal ?? 2200),
    [mergedUserData.daily_calorie_goal]
  );
  const heightCm = mergedUserData.height_cm;
  const weightKg = mergedUserData.weight_kg;

  // --- Ask backend for recommended calories (uses your goalsApi) ---
  useEffect(() => {
    // pull normalized values
    const height_cm = heightCm;
    const weight_kg = weightKg;
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
    const age_years = mergedUserData.age ?? calcAge((mergedUserData as any)?.dob);
    const sex = mergedUserData.sex; // 'M' or 'F'
    const activity = mergedUserData.activityLevel; // optional

    if (!height_cm || !weight_kg || !age_years || !sex) {
      setRecommendedCalories(null);
      return;
    }

    let cancelled = false;
    (async () => {
      console.log('[Dash] /goals/recommend request', { height_cm, weight_kg, sex, age_years, activity });
      const res = await goalsApi.getRecommendation({
        height_cm: height_cm!,
        weight_kg: weight_kg!,
        sex: sex!,
        age_years: age_years!,
        activity,
      });
      console.log('UserDashboard user.age =', age_years);
      console.log('UserDashboard user.height =', heightCm);
      console.log('UserDashboard user.weight =', weightKg);
      console.log('UserDashboard user.sex =', sex);
      console.log('UserDashboard user.activityLevel =', mergedUserData.activityLevel);
      if (!cancelled) {
        if (res.data?.daily_calorie_goal) {
          setRecommendedCalories(Math.max(1, res.data.daily_calorie_goal)); // keep exact API value
          console.log('[Dash] Recommended Calories:', res.data.daily_calorie_goal);
        } else {
          setRecommendedCalories(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [heightCm, weightKg, (mergedUserData as any)?.dob, mergedUserData.age, mergedUserData.sex, mergedUserData.activityLevel]);

  // Helpers to mirror AIFoodRecommendations.tsx behavior
  const normalizeActivity = (
    raw: any
  ): 'sedentary' | 'light' | 'moderate' | 'active' | 'very active' => {
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
      case 'sedentary':
        return 1.2;
      case 'light':
        return 1.375;
      case 'moderate':
        return 1.55;
      case 'active':
        return 1.725;
      case 'very active':
        return 1.9; // match AI page
      default:
        return 1.55;
    }
  };

  // Make Dashboard recommended calories match AI page resolution:
  // 1) daily_calorie_goal → 2) calorieGoal → 3) Harris–Benedict (with normalized activity) → 4) 2000
  const getRecommendedCalories = () => {
    // 1) Use stored daily goal if present
    const daily = Number(mergedUserData.daily_calorie_goal);
    if (Number.isFinite(daily) && daily > 0) return daily;

    // 2) Fallback to any direct calorieGoal on the user (if available)
    const direct = Number((user as any)?.calorieGoal);
    if (Number.isFinite(direct) && direct > 0) return direct;

    // 3) Harris–Benedict as last resort
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

    const height_cm = Number(heightCm);
    const weight_kg = Number(weightKg);
    const age = mergedUserData.age ?? calcAge((mergedUserData as any)?.dob);
    const sex = ((mergedUserData as any).sex ?? (mergedUserData as any).gender)?.toString()?.toUpperCase?.();

    if (!height_cm || !weight_kg || !age || (sex !== 'M' && sex !== 'F')) return 2000;

    let bmr: number;
    if (sex === 'M') {
      bmr = 88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age;
    } else {
      bmr = 447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.330 * age;
    }

    const level = (mergedUserData as any)?.activityLevel ?? (mergedUserData as any)?.activity_level ?? 'moderate';
    const multiplier = activityMultiplier(level);
    return Math.max(1, Math.round(bmr * multiplier));
  };

  // Unified, resolved goal used everywhere (Today’s Calories, Trend, Recommended)
  const resolvedGoal = useMemo(() => {
    const daily = Number(mergedUserData.daily_calorie_goal);
    if (Number.isFinite(daily) && daily > 0) return daily;
    if (Number.isFinite(recommendedCalories as any)) return recommendedCalories as number;
    return getRecommendedCalories();
  }, [mergedUserData.daily_calorie_goal, recommendedCalories, heightCm, weightKg, mergedUserData]);

  // --- Fetch live cart summary for today's calories / price ---
  useEffect(() => {
    let mounted = true;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        // Prefer server-provided today's intake (goalsApi). fallback to local orders for instant UX.
        let caloriesForToday = 0;
        try {
          const gres = await goalsApi.getTodayIntake();
          if (gres && gres.data && typeof gres.data.calories !== 'undefined') {
            caloriesForToday = Number(gres.data.calories) || 0;
            console.debug('[Dash] used goalsApi.getTodayIntake() ->', caloriesForToday);
          }
        } catch (e) {
          console.debug('[Dash] goalsApi.getTodayIntake() failed, will fallback to local orders', e);
        }

        // Build 7-day totals from local order history (fallback UX). We prefer the
        // server-provided today intake if available, but use order history to
        // populate the chart for the last 7 days (including today).
        // Try server-side orders first for multi-device consistency. If that fails, fall back to localStorage.
        let ordersArr: any[] = [];
        try {
          const ores = await getMyOrders();
          if (ores && Array.isArray(ores.data)) {
            ordersArr = ores.data as any[];
          } else {
            // fallback to localStorage
            ordersArr = JSON.parse(localStorage.getItem('orders') || '[]') || [];
          }
        } catch (e) {
          try {
            ordersArr = JSON.parse(localStorage.getItem('orders') || '[]') || [];
          } catch {
            ordersArr = [];
          }
        }

        const today = new Date();

        const sevenDays: CalorieData[] = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          const dayStr = d.toDateString();
          const consumed = (ordersArr || [])
            .filter((o: any) => {
              try {
                const createdRaw = o.createdAt ?? o.created_at;
                if (!createdRaw) return false;
                let od = new Date(createdRaw);
                if (isNaN(od.getTime())) {
                  // try numeric timestamp
                  const asNum = Number(createdRaw);
                  if (!Number.isFinite(asNum)) return false;
                  od = new Date(asNum);
                }
                // Compare local year/month/date to avoid timezone string mismatches
                return (
                  od.getFullYear() === d.getFullYear() &&
                  od.getMonth() === d.getMonth() &&
                  od.getDate() === d.getDate()
                );
              } catch {
                return false;
              }
            })
            .reduce((sum: number, o: any) => {
              const caloriesRaw = o.totalCalories ?? o.total_calories ?? 0;
              return sum + (Number(caloriesRaw) || 0);
            }, 0);
          return {
            date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            consumed,
            goal: resolvedGoal || 2200,
          };
        });

        // If server returned today's calories, prefer that for the last day
        if (Number.isFinite(Number(caloriesForToday)) && Number(caloriesForToday) > 0) {
          sevenDays[6].consumed = Number(caloriesForToday);
        }

        if (mounted) {
          setTodayCalories(Number(sevenDays[6].consumed) || 0);
          setCalorieData(sevenDays);

          // recent orders: show the last 5 orders (most recent first)
          try {
            const recentsRaw = (ordersArr || []).slice(-5).reverse();
            const recentsMapped = recentsRaw.map((o: any) => ({
              id: (o.id ?? o.order_id ?? '').toString(),
              restaurantName: o.restaurantName ?? o.cafe_name ?? o.cafe_id ? `Restaurant` : 'Restaurant',
              status: (o.status ?? '').toString(),
              totalCalories: Number(o.totalCalories ?? o.total_calories ?? 0),
              totalAmount: Number(o.totalAmount ?? o.total_price ?? 0),
              createdAt: o.createdAt ? new Date(o.createdAt) : o.created_at ? new Date(o.created_at) : new Date(),
            }));
            setRecentOrders(recentsMapped);
          } catch {
            setRecentOrders([]);
          }

          setSampleMenuItems([]);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSummary();

    return () => {
      mounted = false;
    };
  }, [resolvedGoal]);

  // Use resolvedGoal for the remaining label
  const remainingCalories = () => {
    const remaining = (resolvedGoal || 0) - (todayCalories || 0);
    return remaining >= 0
      ? `${remaining} calories remaining`
      : `${Math.abs(remaining)} calories over goal`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}!` : '!'}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Calorie Overview</CardTitle>
            <CardDescription>Fetching your live data</CardDescription>
          </CardHeader>
          <CardContent>…</CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">We couldn’t load your data.</p>
        </div>
        <Card>
          <CardContent className="text-red-600 py-6">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const trendPercent = resolvedGoal
    ? Math.max(0, Math.min(100, Math.round((todayCalories / resolvedGoal) * 100)))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Hi {user?.name ? user.name.split(' ')[0] : 'there'}!</h1>
        <p className="text-muted-foreground">Welcome back! Here’s a snapshot of your day.</p>
      </div>

      {/* Top widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today’s Calories</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCalories}</div>
            <p className="text-xs text-muted-foreground">{remainingCalories()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trendPercent}%</div>
            <p className="text-xs text-muted-foreground">of daily goal</p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Goal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goal || 'Not set'}</div>
            <p className="text-xs text-muted-foreground capitalize">daily target</p>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommended</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedGoal}</div>
            <p className="text-xs text-muted-foreground">based on your profile</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Food Suggestions (kept hidden until you have real menu items) */}
      {resolvedGoal && sampleMenuItems.length > 0 && (
        <FoodSuggestions user={user as any} menuItems={sampleMenuItems} currentCaloriesToday={todayCalories} />
      )}

      {/* Recent Orders removed from dashboard per user request */}

      {/* Weekly Calorie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Calories</CardTitle>
          <CardDescription>Progress toward your daily goal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {calorieData.map((day, i) => {
              const percentage = day.goal ? Math.round((day.consumed / day.goal) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{day.date}</span>
                    <span>
                      {day.consumed} / {day.goal} cal
                    </span>
                  </div>
                  <Progress value={Math.min(percentage, 100)} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;