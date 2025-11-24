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
 * @component RestaurantDashboard
 * @description Central dashboard for restaurant owners and staff.
 * Features:
 * - Real-time order monitoring
 * - Revenue analytics and trends
 * - Popular items tracking
 * - Staff management
 * - Customer feedback overview
 * - Inventory status
 * - Peak hours analysis
 * - Menu performance metrics
 * 
 * Provides comprehensive restaurant management tools
 * and business intelligence insights.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Bell, ChefHat, DollarSign, Package, TrendingUp, Clock, Users } from 'lucide-react';
import { Order, OrderStatus, User } from '../../api/types';
import { ordersApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface RestaurantDashboardProps {
  user: User;
}

const RestaurantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
  });

  // ✅ Compute dynamic stats
  const computeStats = (orders: Order[]) => {
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter((o) => o.created_at.startsWith(today));
    
    // ✅ Only count revenue from accepted/ready/picked up orders
    const revenueOrders = todayOrders.filter((o) =>
      ["ACCEPTED", "READY", "PICKED_UP"].includes(o.status)
    );
    const todayRevenue = revenueOrders.reduce((sum, o) => sum + o.total_price, 0);
    
    const pendingOrders = orders.filter((o) =>
      ["PENDING", "ACCEPTED", "READY"].includes(o.status)
    ).length;
    
    const avgOrderValue = revenueOrders.length
      ? todayRevenue / revenueOrders.length
      : 0;
  
    setStats({
      todayRevenue,
      todayOrders: todayOrders.length,
      avgOrderValue,
      pendingOrders,
    });
  };

  // ✅ Fetch all orders for cafe
useEffect(() => {
  if (!user?.cafe?.id) return;

  const cafeId = user.cafe.id;

  const loadOrders = async () => {
    try {
      const { data, error } = await ordersApi.getCafeOrders(cafeId);
      console.log("Fetched cafe orders:", data);
      console.log("Fetched cafe orders type:", typeof data);

      // Normalize the data — always use an array
      const orderArray = Array.isArray(data)
        ? data
        : data
        ? [data] // single object → wrap it in an array
        : [];

      setOrders(orderArray);
      computeStats(orderArray);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  };

  loadOrders();
}, [user?.cafe?.id]);


  // ✅ Update order status handler
  const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    const { data, error } = await ordersApi.updateOrderStatus(orderId, newStatus);
    if (data) {
      setOrders((prev) => {
        const updated = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
        computeStats(updated); // Recalculate stats after update
        return updated;
      });
    } else {
      console.error("Failed to update order:", error);
    }
  };

  // ✅ Dynamic recent orders - sorted by most recent, limited to 5
  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Quick actions
  const quickActions = [
    { title: 'Manage Menu', description: 'Add, edit, or remove menu items', icon: ChefHat, href: '/restaurant/menu', color: 'bg-blue-50 text-blue-600' },
    { title: 'View Orders', description: 'Manage incoming orders', icon: Package, href: '/restaurant/orders', color: 'bg-green-50 text-green-600' },
    { title: 'Analytics', description: 'View performance reports', icon: TrendingUp, href: '/restaurant/analytics', color: 'bg-orange-50 text-orange-600' },
    { title: 'Review Insights', description: 'AI-powered feedback analysis', icon: Bell, href: '/restaurant/reviews', color: 'bg-pink-50 text-pink-600' }
  ];

  // ✅ For UI badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-700";
      case "ACCEPTED":
        return "bg-blue-50 text-blue-700";
      case "READY":
        return "bg-green-50 text-green-700";
      case "PICKED_UP":
        return "bg-gray-50 text-gray-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Restaurant Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}! Here's what's happening today.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todayRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingOrders} pending orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders - Now fully dynamic */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest orders requiring your attention</CardDescription>
          </div>
          <Link to="/restaurant/orders">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Order #{order.id}</h4>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${order.total_price.toFixed(2)} • {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <Button 
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'ACCEPTED')}
                      >
                        Accept
                      </Button>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusUpdate(order.id, 'READY')}
                      >
                        Mark Ready
                      </Button>
                    )}
                    {order.status === 'READY' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleStatusUpdate(order.id, 'PICKED_UP')}
                      >
                        Mark Picked
                      </Button>
                    )}
                    <Link to={`/restaurant/orders`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <Card
              key={action.href}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(action.href)}
            >
              <CardHeader className="space-y-4">
                <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Today's Schedule */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader> */}
        {/* <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg"> */}
              {/* <div>
                <p className="font-medium">Restaurant Hours</p>
                <p className="text-sm text-muted-foreground">Open: 11:00 AM - 10:00 PM</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">Open Now</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm">Peak Hours</p>
                <p className="text-xs text-muted-foreground">12:00 PM - 2:00 PM, 6:00 PM - 8:00 PM</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm">Staff on Duty</p>
                <p className="text-xs text-muted-foreground">3 kitchen staff, 2 front desk</p>
              </div>
            </div>
          </div> */}
        {/* </CardContent> */}
      {/* </Card> */}
    </div>
  );
};

export default RestaurantDashboard;

