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
 * @component CalorieSettings
 * @description Personal calorie tracking and goal management.
 * Features:
 * - Daily calorie goal setting
 * - Progress tracking visualization
 * - Meal-based calorie logging
 * - Nutritional goal customization
 * - Historical trend analysis
 * - BMI and health metrics
 * - Goal adjustment recommendations
 * - Diet preference settings
 * 
 * Integrates with menu recommendations and order history
 * to provide personalized health insights.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Target, TrendingUp, Calculator, Info } from 'lucide-react';
import { User } from '../../api/types';
import { goalsApi } from '../../api/goals';
import { toast } from 'sonner';

interface CalorieSettingsProps {
  user: User;
}

const CalorieSettings: React.FC<CalorieSettingsProps> = ({ user }) => {
  const [formData, setFormData] = useState({
  height: user.height_cm?.toString() || '',
  weight: user.weight_kg?.toString() || '',
  dob: (user as any)?.dob || '',
  gender: 'F', // 'M' or 'F'
  activityLevel: 'moderate',
  customGoal: user.daily_calorie_goal?.toString() || ''
});
  
  const [recommendedCalories, setRecommendedCalories] = useState(0);

  useEffect(() => {
    calculateRecommendedCalories();
  }, [formData.height, formData.weight, formData.dob, formData.gender, formData.activityLevel]);

  const calculateRecommendedCalories = () => {
    const height = parseInt(formData.height);
    const weight = parseInt(formData.weight);
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
    const age = calcAge(formData.dob);

    if (!height || !weight || !age) {
      setRecommendedCalories(0);
      return;
    }
    console.log(
  "%c[DEBUG: HB INPUTS]",
  "background: #007acc; color: white; font-weight: bold; padding: 2px 4px;",
  {
    gender: formData.gender,
    height_cm: height,
    weight_kg: weight,
    age_years: age,
    activityLevel: formData.activityLevel,
  }
);
    // Harris-Benedict Formula
    let bmr;
    if (formData.gender === 'M') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }

    // Activity level multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    const multiplier = activityMultipliers[formData.activityLevel as keyof typeof activityMultipliers];
    const recommended = Math.round(bmr * multiplier);
    setRecommendedCalories(recommended);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const height = parseInt(formData.height);
    const weight = parseInt(formData.weight);
    const goal = parseInt(formData.customGoal) || recommendedCalories;

    if (!height || !weight) {
      toast.error('Please enter your height and weight');
      return;
    }

    // Request backend recommendation (fallback to local calc if needed)
    const sex = formData.gender;
    const calcAgeForSave = (dob?: string): number | undefined => {
      if (!dob) return undefined;
      const birth = new Date(dob);
      if (isNaN(birth.getTime())) return undefined;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    };
    const ageYears = calcAgeForSave(formData.dob);
    const activity = formData.activityLevel;

    let dailyRecommended = recommendedCalories;
    try {
      if (height && weight && sex && ageYears) {
        const res = await goalsApi.getRecommendation({
          height_cm: height,
          weight_kg: weight,
          sex,
          age_years: ageYears,
          activity,
        });
        if (res.data?.daily_calorie_goal) {
          dailyRecommended = Math.round(res.data.daily_calorie_goal);
        }
      }
    } catch {
      // ignore errors, keep local recommendation
    }

    // Update user data (in real app, this would be an API call)
    const updatedUser = {
      ...user,
      height,
      weight,
      daily_calorie_goal: goal || dailyRecommended,
      gender: formData.gender,
      dob: formData.dob,
      activityLevel: formData.activityLevel,
    } as any;

    // localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem(`user:${user.id}`, JSON.stringify(updatedUser));
    toast.success('Settings saved successfully!');
  };

  const getActivityDescription = (level: string) => {
    const descriptions = {
      sedentary: 'Little or no exercise, desk job',
      light: 'Light exercise 1-3 days/week',
      moderate: 'Moderate exercise 3-5 days/week',
      active: 'Hard exercise 6-7 days/week',
      very_active: 'Very hard exercise, physical job'
    };
    return descriptions[level as keyof typeof descriptions] || '';
  };

  const getBMICategory = () => {
    const height = parseInt(formData.height);
    const weight = parseInt(formData.weight);
    
    if (!height || !weight) return null;
    
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal weight', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const bmiInfo = getBMICategory();

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Calorie Settings</h1>
        <p className="text-muted-foreground">Set your daily calorie goals and track your intake</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              This information helps us calculate your recommended daily calorie intake
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="170"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="70"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value:string) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity">Activity Level</Label>
              <Select value={formData.activityLevel} onValueChange={(value:string) => handleInputChange('activityLevel', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="light">Lightly Active</SelectItem>
                  <SelectItem value="moderate">Moderately Active</SelectItem>
                  <SelectItem value="active">Very Active</SelectItem>
                  <SelectItem value="very_active">Extremely Active</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getActivityDescription(formData.activityLevel)}
              </p>
            </div>

            {bmiInfo && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">BMI Category:</span>
                  <Badge variant="outline" className={bmiInfo.color}>
                    {bmiInfo.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  BMI: {(parseInt(formData.weight) / Math.pow(parseInt(formData.height) / 100, 2)).toFixed(1)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calorie Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Calorie Goals
            </CardTitle>
            <CardDescription>
              Set your daily calorie target based on your goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goalType">Goal Period</Label>
              {/* <Select value={formData.goalType} onValueChange={(value) => handleInputChange('goalType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Goal</SelectItem>
                  <SelectItem value="weekly">Weekly Goal</SelectItem>
                  <SelectItem value="monthly">Monthly Goal</SelectItem>
                </SelectContent>
              </Select> */}
            </div>

            {recommendedCalories > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Recommended Daily Intake</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{recommendedCalories} calories</p>
                <p className="text-sm text-green-700 mt-1">
                  Based on your personal information and activity level
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customGoal">Custom Daily Goal (calories)</Label>
              <Input
                id="customGoal"
                type="number"
                placeholder={recommendedCalories.toString()}
                value={formData.customGoal}
                onChange={(e) => handleInputChange('customGoal', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use recommended value
              </p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Goal Guidelines:</p>
                  <ul className="text-xs mt-1 space-y-1">
                    <li>• Weight loss: 500-750 calories below maintenance</li>
                    <li>• Weight maintenance: At maintenance level</li>
                    <li>• Weight gain: 300-500 calories above maintenance</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Current Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Current Goal:</span>
                  <span className="font-medium">
                    {user.daily_calorie_goal || 'Not set'} {user.daily_calorie_goal && 'calories'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Goal Type:</span>
                  {/* <span className="font-medium capitalize">
                    {user.goalType || 'Not set'}
                  </span> */}
                </div>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Calorie Tracking Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Successful Calorie Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">📱 Track Consistently</h4>
              <p className="text-sm text-muted-foreground">
                Log your meals throughout the day for better accuracy and habit formation.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">⚖️ Focus on Balance</h4>
              <p className="text-sm text-muted-foreground">
                Aim for a balanced mix of proteins, carbs, and healthy fats in your meals.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">💧 Don't Forget Hydration</h4>
              <p className="text-sm text-muted-foreground">
                Drink plenty of water throughout the day to support your health goals.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🎯 Be Realistic</h4>
              <p className="text-sm text-muted-foreground">
                Set achievable goals and allow for flexibility in your daily intake.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalorieSettings;