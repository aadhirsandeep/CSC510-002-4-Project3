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
 * @component LoginPage
 * @description User authentication component for handling login.
 * Features:
 * - Email/password authentication
 * - Role-based login (User/Restaurant/Driver)
 * - Form validation
 * - Error handling and feedback
 * - Remember me functionality
 * - Password reset request
 * - Redirect to appropriate dashboard based on role
 * 
 * Uses AuthContext for authentication state management
 * and JWT token handling.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'USER' | 'OWNER' | 'DRIVER'>('USER');
  const { user, login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Mock review slider state
  const reviews = [
    { name: 'Alex P.', rating: 5, text: 'Ordering is seamless and calorie goals keep me accountable.' },
    { name: 'Jamie L.', rating: 4.8, text: 'Great UI and fast checkout. Love the menu suggestions!' },
    { name: 'Riya K.', rating: 5, text: 'As an owner, managing items and orders is super easy.' },
    { name: 'Chris D.', rating: 4.7, text: 'Driver assignment is quick and reliable for deliveries.' },
  ];
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => (i + 1) % reviews.length);
  const prev = () => setIdx((i) => (i - 1 + reviews.length) % reviews.length);

  const renderStars = (rating: number) => {
    const roundedRating = Math.round(rating);
    const fullStars = '★'.repeat(roundedRating);
    const emptyStars = '☆'.repeat(5 - roundedRating);
    return (
      <span aria-label={`${rating} out of 5 stars`} className="text-amber-500">
        {fullStars}<span className="text-muted-foreground">{emptyStars}</span>
      </span>
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const loggedInUser = await login({ 
      email, 
      password, 
      role: selectedRole 
    });
    
    if (loggedInUser) {
      toast.success('Login successful!');
      // ✅ Redirect after login
      const redirects: Record<string, string> = {
        USER: '/dashboard',
        OWNER: '/restaurant/dashboard',
        DRIVER: '/driver/dashboard',
        // ADMIN: '/admin/dashboard',
      };
      navigate(redirects[loggedInUser.role] || '/dashboard', { replace: true });
      // navigate(redirects[loggedInUser.role]);
    } else {
      toast.error(error || 'Login failed');
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    clearError();
    
    const loggedInUser = await login({ email: demoEmail, password: demoPassword });
    
    if (loggedInUser) {
      toast.success('Demo login successful!');
    } else {
      toast.error('Demo login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Welcome to Calorie Connect</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
        <Tabs defaultValue="customer" className="w-full" onValueChange={(value) => {
            const roleMap = {
              'customer': 'USER' as const,
              'restaurant': 'OWNER' as const,
              'driver': 'DRIVER' as const,
            };
            setSelectedRole(roleMap[value as keyof typeof roleMap]);
          }}>
          <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
          <TabsTrigger value="driver">Driver</TabsTrigger> 
        </TabsList>
            
            <TabsContent value="customer" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-password">Password</Label>
                  <Input
                    id="customer-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              {/* <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleDemoLogin('customer@demo.com', 'demo123')}
                  disabled={isLoading}
                >
                  Try Customer Demo
                </Button>
              </div> */}
            </TabsContent>
            
            <TabsContent value="restaurant" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-email">Email</Label>
                  <Input
                    id="restaurant-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurant-password">Password</Label>
                  <Input
                    id="restaurant-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              {/* <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleDemoLogin('restaurant@demo.com', 'demo123')}
                  disabled={isLoading}
                >
                  Try Restaurant Demo
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleDemoLogin('staff@demo.com', 'demo123')}
                  disabled={isLoading}
                >
                  Try Staff Demo
                </Button>
              </div> */}
            </TabsContent>
            <TabsContent value="driver" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="driver-email">Email</Label>
                  <Input
                    id="driver-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-password">Password</Label>
                  <Input
                    id="driver-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDemoLogin('driver@demo.com', 'demo123')}
                  disabled={isLoading}
                >
                  Try Driver Demo
                </Button>
              </div> */}
          </TabsContent>

            
          </Tabs>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          {/* <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">Demo Credentials:</p>
            <p className="text-xs text-muted-foreground">
              Customer: customer@demo.com<br/>
              Restaurant: restaurant@demo.com<br/>
              Staff: staff@demo.com<br/>
              Password: demo123
            </p>
          </div> */}
        </CardContent>
      </Card>

      {/* Review slider positioned below the sign-in box */}
      <div className="mt-20 w-full p-3 max-w-md px-4">
        <div className="bg-background/80 backdrop-blur border rounded-lg shadow-sm px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Previous review"
          >
            ‹
          </button>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">{reviews[idx].name}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">{reviews[idx].text}</div>
            <div className="text-sm mt-1">{renderStars(reviews[idx].rating)}</div>
          </div>
          <button
            type="button"
            onClick={next}
            className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Next review"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;