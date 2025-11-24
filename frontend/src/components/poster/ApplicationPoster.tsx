/**
 * Copyright (c) 2025 Group 2
 * All rights reserved.
 * 
 * This project and its source code are the property of Group 2:
 * - Aryan Tapkire
 * - Dilip Irala Narasimhareddy
 * - Sachi Vyas
 * - Supraj Gijre
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { 
  Users, 
  ShoppingCart, 
  Target, 
  Scan, 
  BarChart3, 
  Settings, 
  CreditCard,
  UserCheck,
  MapPin
} from 'lucide-react';

const ApplicationPoster: React.FC = () => {
  const milestones = [
    { title: "Login/Signup Page", icon: UserCheck, completed: true },
    { title: "Order Tracking & Homepages", icon: MapPin, completed: true },
    { title: "Calorie Goals Setup & Tracking", icon: Target, completed: true },
    { title: "OCR/AI Menu Scanning", icon: Scan, completed: false },
    { title: "Github Actions & Testing", icon: Settings, completed: false },
    { title: "Vercel Deployment", icon: Settings, completed: false },
    { title: "Staff Functionality", icon: Users, completed: true },
    { title: "Analytics Dashboard", icon: BarChart3, completed: true },
    { title: "Refund Processing", icon: CreditCard, completed: false }
  ];

  const uiScreenshots = [
    {
      title: "Login & Authentication",
      description: "Secure user authentication with role-based access",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Customer Dashboard",
      description: "Personalized dashboard with calorie tracking and order history",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Restaurant Browse",
      description: "Discover local restaurants with ratings and cuisine filters",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Menu & Calorie Info",
      description: "Detailed menu items with nutritional information",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Multi-User Cart",
      description: "Collaborative cart where users can assign items to friends/family",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Order Tracking",
      description: "Real-time order status updates and delivery tracking",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Calorie Goals",
      description: "BMI calculator and personalized calorie goal setting",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Restaurant Dashboard",
      description: "Restaurant owner dashboard with order management",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Menu Management",
      description: "AI-powered menu digitization and item management",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Staff Management",
      description: "Role-based permissions and staff coordination tools",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Analytics Dashboard",
      description: "Revenue insights and performance metrics",
      mockup: "/api/placeholder/300/200"
    },
    {
      title: "Order Management",
      description: "Process orders, update status, handle refunds",
      mockup: "/api/placeholder/300/200"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xl font-bold">F</span>
            </div>
            <h1 className="text-4xl font-bold text-primary">FoodApp</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Comprehensive Food Ordering Platform
          </h2>
          <p className="text-lg text-gray-600 max-w-4xl mx-auto leading-relaxed">
            A health-aware, transparent, and efficient food ordering ecosystem where customers can track calories, 
            share group orders, and set health goals, while restaurants get tools to digitize menus, manage staff, 
            and monitor revenue analytics.
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="mb-12 bg-gradient-to-r from-primary/5 to-blue-50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center text-primary">Mission Statement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-700 leading-relaxed">
              Healthy eating while managing a busy lifestyle is a growing challenge for students, professionals, and families. 
              People struggle not only with ordering food conveniently but also with keeping track of calories and meeting 
              personal health goals. Our system responds to this challenge by building an integrated cafe/restaurant ordering 
              platform with calorie tracking, personalized goals, and analytics for users, restaurants, and administrators.
            </p>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center">Development Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {milestones.map((milestone, index) => {
                const Icon = milestone.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                      milestone.completed
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{milestone.title}</span>
                    <Badge 
                      variant={milestone.completed ? "default" : "secondary"}
                      className="ml-auto"
                    >
                      {milestone.completed ? "✓" : "○"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Key Features */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center">Key Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Multi-User Cart</h3>
                <p className="text-sm text-gray-600">Assign items to friends/family in group orders</p>
              </div>
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Calorie Tracking</h3>
                <p className="text-sm text-gray-600">BMI calculator and personalized health goals</p>
              </div>
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <Scan className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">AI Menu Scanning</h3>
                <p className="text-sm text-gray-600">OCR-powered menu digitization from PDFs</p>
              </div>
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-gray-600">Revenue insights and performance metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UI Screenshots Grid */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center">Application Interface Showcase</CardTitle>
            <p className="text-center text-gray-600">Complete user experience across all stakeholder roles</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {uiScreenshots.map((screenshot, index) => (
                <div key={index} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div className="aspect-[3/2] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <span className="text-primary text-2xl">📱</span>
                          </div>
                          <p className="text-sm font-medium text-gray-600">{screenshot.title}</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 text-sm">{screenshot.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{screenshot.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Stack */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center">Technology Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Frontend</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <p>React 18 + TypeScript</p>
                  <p>Tailwind CSS v4</p>
                  <p>Shadcn/ui Components</p>
                  <p>React Router</p>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">State & Forms</h4>
                <div className="text-sm text-green-600 space-y-1">
                  <p>React Hook Form</p>
                  <p>Local Storage</p>
                  <p>Context API</p>
                  <p>Sonner Toasts</p>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">UI & UX</h4>
                <div className="text-sm text-purple-600 space-y-1">
                  <p>Lucide Icons</p>
                  <p>Recharts</p>
                  <p>Responsive Design</p>
                  <p>Dark Mode</p>
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">Future</h4>
                <div className="text-sm text-orange-600 space-y-1">
                  <p>Supabase Backend</p>
                  <p>AI/OCR Integration</p>
                  <p>Real-time Updates</p>
                  <p>Payment Processing</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stakeholder Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800 text-center">For Customers</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700 text-sm space-y-2">
              <p>• Track calories and set health goals</p>
              <p>• Share group orders with friends/family</p>
              <p>• Real-time order tracking</p>
              <p>• BMI calculator and goal setting</p>
              <p>• Order history and analytics</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800 text-center">For Restaurants</CardTitle>
            </CardHeader>
            <CardContent className="text-green-700 text-sm space-y-2">
              <p>• AI-powered menu digitization</p>
              <p>• Order processing and management</p>
              <p>• Staff role management</p>
              <p>• Revenue and performance analytics</p>
              <p>• Refund and dispute handling</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800 text-center">For Staff</CardTitle>
            </CardHeader>
            <CardContent className="text-purple-700 text-sm space-y-2">
              <p>• Role-based permissions</p>
              <p>• Order status updates</p>
              <p>• Kitchen coordination tools</p>
              <p>• Performance tracking</p>
              <p>• Shift management</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>FoodApp - Bridging convenience with well-being in food ordering</p>
          <p className="mt-2">Built with React, TypeScript, and Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
};

export default ApplicationPoster;