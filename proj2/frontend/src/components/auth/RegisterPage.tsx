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
 * @component RegisterPage
 * @description User registration component for new account creation.
 * Features:
 * - Multi-step registration process
 * - Role selection (Customer/Restaurant Owner/Driver)
 * - Form validation with real-time feedback
 * - Restaurant details for owner registration
 * - Driver details and vehicle information
 * - Terms and conditions acceptance
 * - Automatic login after registration
 * - Profile picture upload
 * 
 * Implements role-specific registration flows and validates
 * required information based on selected role.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    // Common fields
    email: '',
    password: '',
    confirmPassword: '',
  
    // USER fields
    name: '',
    height_cm: '',
    weight_kg: '',
    dob: '',
    gender: '',
    activityLevel: '',
  
    // OWNER fields
    restaurantName: '',
    cuisine: '',
    address: '',
    phone: '',
    timings: '',
  
    // DRIVER fields
    driverName: '',
    license: '',
    vehicleType: '',
  });
  
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (
    e: React.FormEvent,
    userType: 'USER' | 'OWNER' | 'DRIVER'
  ) => {
    e.preventDefault();
    clearError();
  
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
  
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
  
    console.log('calling register from tsx:');
    
    const registeredUser = await register({
      email: formData.email,
      name:
        userType === 'USER'
          ? formData.name
          : userType === 'OWNER'
          ? formData.restaurantName
          : userType === 'DRIVER'
          ? formData.driverName
          : '',
  
      password: formData.password,
  
      role:
        userType === 'USER'
          ? 'USER'
          : userType === 'OWNER'
          ? 'OWNER'
          : userType === 'DRIVER'
          ? 'DRIVER'
          : 'USER',
  
      ...(userType === 'USER' && {
        height_cm: Number(formData.height_cm) || null,
        weight_kg: Number(formData.weight_kg) || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        activity_level: formData.activityLevel || null,
      }),
      // include owner-specific cafe fields in registration payload so backend can create cafe with cuisine
      ...(userType === 'OWNER' && {
        cuisine: formData.cuisine || undefined,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        timings: formData.timings || undefined,
      }),
    });
  
    console.log('Registration successful:', !!registeredUser);
    
    if (registeredUser) {
      toast.success('Registration successful!');

      // ✅ NEW: Save the profile bits the dashboard expects to localStorage
      if (registeredUser.role === 'USER') {
        const profileForDashboard = {
          height: formData.height_cm ? Number(formData.height_cm) : undefined,   // dashboard reads 'height'
          weight: formData.weight_kg ? Number(formData.weight_kg) : undefined,   // dashboard reads 'weight'
          dob: formData.dob || undefined,
          gender: (formData.gender || '').toUpperCase(),                         // 'M' or 'F'
          activityLevel: formData.activityLevel || 'moderate',
          // daily_calorie_goal: Number(someValue) || undefined, // optional if you have one
        };
        try {
          localStorage.setItem(
            `user:${registeredUser.id}`,
            JSON.stringify(profileForDashboard)
          );
        } catch {
          // ignore storage errors
        }
      }
      
      // ✅ Role-based redirect after registration (same as login)
      const redirects: Record<string, string> = {
        USER: '/dashboard',
        OWNER: '/restaurant/dashboard',
        DRIVER: '/driver/dashboard',
      };
      
      navigate(redirects[registeredUser.role] || '/dashboard', { replace: true });
    } else {
      toast.error(error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join FoodApp to start ordering or managing your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
              <TabsTrigger value="driver">Driver</TabsTrigger> 
            </TabsList>
            
            <TabsContent value="customer" className="space-y-4">
              <form onSubmit={(e) => handleRegister(e, 'USER')} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="180"
                      value={formData.height_cm}
                      onChange={(e) => handleInputChange('height_cm', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="70"
                      value={formData.weight_kg}
                      onChange={(e) => handleInputChange('weight_kg', e.target.value)}
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
                    <Select onValueChange={(value:string) => handleInputChange('gender', value)} value={formData.gender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                        {/* <SelectItem value="other">Other</SelectItem> */}
                        {/* <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem> */}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity">Activity Level</Label>
                  <Select onValueChange={(value:string) => handleInputChange('activityLevel', value)} value={formData.activityLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">sedentary</SelectItem>
                      <SelectItem value="light">light</SelectItem>
                      <SelectItem value="moderate">moderate</SelectItem>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="very_active">very active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Customer Account'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="restaurant" className="space-y-4">
              <form onSubmit={(e) => handleRegister(e, 'OWNER')} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Restaurant Name</Label>
                  <Input
                    id="restaurantName"
                    placeholder="Enter restaurant name"
                    value={formData.restaurantName}
                    onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine Type</Label>
                  <Select value={formData.cuisine} onValueChange={(value:string) => handleInputChange('cuisine', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cuisine type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="mexican">Mexican</SelectItem>
                      <SelectItem value="american">American</SelectItem>
                      <SelectItem value="thai">Thai</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Restaurant address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Restaurant phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timings">Opening Hours</Label>
                  {/* Use a textarea so the owner can enter multi-line/open-ended hours. */}
                  <Textarea
                    id="timings"
                    placeholder="e.g. Mon-Fri 09:00-17:00\nSat-Sun 10:00-16:00"
                    value={formData.timings}
                    onChange={(e) => handleInputChange('timings', e.target.value)}
                    rows={3}
                  />
                </div>
                {/* <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your restaurant"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div> */}
                <div className="space-y-2">
                  <Label htmlFor="email-restaurant">Email</Label>
                  <Input
                    id="email-restaurant"
                    type="email"
                    placeholder="Restaurant email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-restaurant">Password</Label>
                  <Input
                    id="password-restaurant"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword-restaurant">Confirm Password</Label>
                  <Input
                    id="confirmPassword-restaurant"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Restaurant Account'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="driver" className="space-y-4">
              <form onSubmit={(e) => handleRegister(e, 'DRIVER')} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="driverName">Full Name</Label>
                  <Input
                    id="driverName"
                    placeholder="Enter your full name"
                    value={formData.driverName}
                    onChange={(e) => handleInputChange('driverName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-driver">Email</Label>
                  <Input
                    id="email-driver"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                {/* Optional: license number or vehicle info */}
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <Input
                    id="license"
                    placeholder="Enter your driver license number"
                    value={formData.license}
                    onChange={(e) => handleInputChange('license', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-driver">Password</Label>
                  <Input
                    id="password-driver"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword-driver">Confirm Password</Label>
                  <Input
                    id="confirmPassword-driver"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Driver Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
