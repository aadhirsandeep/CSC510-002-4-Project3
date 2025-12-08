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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Bell, ChefHat, DollarSign, Package, TrendingUp, Clock, Users, Eye, Truck, RefreshCw, Shuffle } from 'lucide-react';
import { Order, OrderStatus, User, OrderSummary } from '../../api/types';
import { ordersApi, driversApi } from '../../api';
import { IdleDriverInfo } from '../../api/drivers';
import { useAuth } from '../../contexts/AuthContext';
import StaffManagement from './StaffManagement';
import StaffOrdersView from '../staff/StaffOrdersView';
import { toast } from 'sonner';

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
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<IdleDriverInfo[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

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

  const loadAvailableDrivers = async () => {
    const { data, error } = await driversApi.getAvailableDrivers();
    if (data) {
      setAvailableDrivers(data);
    } else if (error) {
      console.error('Failed to load available drivers:', error);
    }
  };

  const viewOrderDetails = async (orderId: number) => {
    setLoadingOrderDetails(true);
    const { data, error } = await ordersApi.getOrderSummary(orderId);

    if (error) {
      toast.error(`Failed to load order details: ${error}`);
      setLoadingOrderDetails(false);
      return;
    }

    if (data) {
      setSelectedOrder(data);
      setIsOrderDialogOpen(true);
      // Load available drivers when opening dialog
      await loadAvailableDrivers();
    }

    setLoadingOrderDetails(false);
  };

  const reassignDriver = async (orderId: number) => {
    const { data, error } = await ordersApi.retryDriverAssignment(orderId);

    if (error) {
      toast.error(`Failed to reassign driver: ${error}`);
      return;
    }

    if (data) {
      toast.success(data.message || 'Driver reassigned successfully');
      // Reload orders to get updated data
      if (user?.cafe?.id) {
        const { data: updatedOrders } = await ordersApi.getCafeOrders(user.cafe.id);
        if (updatedOrders) {
          const orderArray = Array.isArray(updatedOrders) ? updatedOrders : updatedOrders ? [updatedOrders] : [];
          setOrders(orderArray);
          computeStats(orderArray);
        }
      }
      // Refresh order details if the dialog is open
      if (selectedOrder && selectedOrder.id === orderId) {
        await viewOrderDetails(orderId);
      }
    }
  };

  const assignSpecificDriver = async (orderId: number) => {
    if (!selectedDriverId) {
      toast.error('Please select a driver first');
      return;
    }

    setAssigningDriver(true);
    const { data, error } = await ordersApi.assignSpecificDriver(orderId, parseInt(selectedDriverId));

    if (error) {
      toast.error(`Failed to assign driver: ${error}`);
      setAssigningDriver(false);
      return;
    }

    if (data) {
      toast.success('Driver assigned successfully');
      setSelectedDriverId('');
      // Reload orders
      if (user?.cafe?.id) {
        const { data: updatedOrders } = await ordersApi.getCafeOrders(user.cafe.id);
        if (updatedOrders) {
          const orderArray = Array.isArray(updatedOrders) ? updatedOrders : updatedOrders ? [updatedOrders] : [];
          setOrders(orderArray);
          computeStats(orderArray);
        }
      }
      // Refresh order details
      if (selectedOrder && selectedOrder.id === orderId) {
        await viewOrderDetails(orderId);
      }
    }
    setAssigningDriver(false);
  };

  const autoAssignDriver = async (orderId: number) => {
    setAssigningDriver(true);
    const { data, error } = await ordersApi.autoAssignDriver(orderId);

    if (error) {
      toast.error(`Failed to auto-assign driver: ${error}`);
      setAssigningDriver(false);
      return;
    }

    if (data) {
      toast.success('Driver auto-assigned successfully');
      setSelectedDriverId('');
      // Reload orders
      if (user?.cafe?.id) {
        const { data: updatedOrders } = await ordersApi.getCafeOrders(user.cafe.id);
        if (updatedOrders) {
          const orderArray = Array.isArray(updatedOrders) ? updatedOrders : updatedOrders ? [updatedOrders] : [];
          setOrders(orderArray);
          computeStats(orderArray);
        }
      }
      // Refresh order details
      if (selectedOrder && selectedOrder.id === orderId) {
        await viewOrderDetails(orderId);
      }
    }
    setAssigningDriver(false);
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
      PENDING: { variant: 'outline', color: 'text-yellow-600' },
      ACCEPTED: { variant: 'default', color: 'text-blue-600' },
      DECLINED: { variant: 'destructive', color: 'text-red-600' },
      READY: { variant: 'default', color: 'text-green-600' },
      PICKED_UP: { variant: 'secondary', color: 'text-purple-600' },
      CANCELLED: { variant: 'destructive', color: 'text-red-600' },
      REFUNDED: { variant: 'destructive', color: 'text-red-600' },
      DELIVERED: { variant: 'secondary', color: 'text-green-600' },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant} className={config.color}>{status}</Badge>;
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

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full ${user?.role === 'OWNER' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          {user?.role === 'OWNER' && (
            <TabsTrigger value="staff">
              <Users className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
          )}
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Existing Dashboard Content */}
        <TabsContent value="overview" className="space-y-6">

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
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${order.total_price.toFixed(2)} • {new Date(order.created_at).toLocaleTimeString()}
                      {order.driver_id && ` • Driver #${order.driver_id}`}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewOrderDetails(order.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
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
        </TabsContent>

        {/* Orders Tab - Use StaffOrdersView */}
        <TabsContent value="orders">
          <StaffOrdersView />
        </TabsContent>

        {/* Staff Tab - Show StaffManagement */}
        <TabsContent value="staff">
          <StaffManagement user={user as any} />
        </TabsContent>

        {/* Menu Tab - Placeholder */}
        <TabsContent value="menu">
          <Card>
            <CardHeader>
              <CardTitle>Menu Management</CardTitle>
              <CardDescription>Add, edit, or remove menu items</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/restaurant/menu">Go to Menu Management</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab - Placeholder */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>View your restaurant performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/restaurant/analytics">View Full Analytics</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id} Details</DialogTitle>
            <DialogDescription>
              {selectedOrder && getStatusBadge(selectedOrder.status)}
            </DialogDescription>
          </DialogHeader>

          {loadingOrderDetails ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          ) : selectedOrder ? (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Order Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-medium">#{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="font-medium">${selectedOrder.total_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Calories</p>
                    <p className="font-medium">{selectedOrder.total_calories} cal</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Driver Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Driver Information
                </h3>
                {selectedOrder.driver_info ? (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Driver ID</p>
                        <p className="font-medium">#{selectedOrder.driver_info.driver_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Driver Email</p>
                        <p className="font-medium">{selectedOrder.driver_info.driver_email}</p>
                      </div>
                    </div>
                    {['ACCEPTED', 'READY'].includes(selectedOrder.status) && (
                      <div className="space-y-3 mt-2">
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a different driver..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDrivers.map(driver => (
                              <SelectItem key={driver.driver_id} value={driver.driver_id.toString()}>
                                {driver.driver_name} ({driver.driver_email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => assignSpecificDriver(selectedOrder.id)}
                            disabled={!selectedDriverId || assigningDriver}
                            className="flex-1"
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Assign Selected
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => autoAssignDriver(selectedOrder.id)}
                            disabled={assigningDriver}
                            className="flex-1"
                          >
                            <Shuffle className="h-4 w-4 mr-2" />
                            Auto-Assign
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">No driver assigned yet</p>
                    {['ACCEPTED', 'READY'].includes(selectedOrder.status) && (
                      <div className="space-y-3 mt-2">
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a driver..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDrivers.map(driver => (
                              <SelectItem key={driver.driver_id} value={driver.driver_id.toString()}>
                                {driver.driver_name} ({driver.driver_email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => assignSpecificDriver(selectedOrder.id)}
                            disabled={!selectedDriverId || assigningDriver}
                            className="flex-1"
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Assign Selected
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => autoAssignDriver(selectedOrder.id)}
                            disabled={assigningDriver}
                            className="flex-1"
                          >
                            <Shuffle className="h-4 w-4 mr-2" />
                            Auto-Assign
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} • {item.subtotal_calories} cal
                          </p>
                        </div>
                        <p className="font-semibold">${item.subtotal_price.toFixed(2)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No items found</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantDashboard;

