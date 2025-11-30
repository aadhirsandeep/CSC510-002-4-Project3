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
 * @component StaffOrdersView
 * @description Staff dashboard for viewing and managing orders.
 * Features:
 * - View incoming (PENDING) orders
 * - Accept or decline orders
 * - Mark accepted orders as READY
 * - View completed orders
 * - Real-time order counts and notifications
 *
 * Staff can only see orders for their assigned cafe.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Clock, CheckCircle, XCircle, Package, TrendingUp, User } from 'lucide-react';
import { Order, OrderStatus } from '../../api/types';
import { ordersApi } from '../../api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const StaffOrdersView: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.cafe?.id) {
      loadOrders();
      // Refresh orders every 30 seconds
      const interval = setInterval(loadOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.cafe?.id]);

  const loadOrders = async () => {
    if (!user?.cafe?.id) return;

    const { data, error } = await ordersApi.getCafeOrders(user.cafe.id);

    if (error) {
      toast.error(`Failed to load orders: ${error}`);
      setLoading(false);
      return;
    }

    if (data) {
      const orderArray = Array.isArray(data) ? data : data ? [data] : [];
      setOrders(orderArray);
    }

    setLoading(false);
  };

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    setProcessingOrderId(orderId);

    const { data, error } = await ordersApi.updateOrderStatus(orderId, newStatus);

    if (error) {
      toast.error(`Failed to update order: ${error}`);
      setProcessingOrderId(null);
      return;
    }

    if (data) {
      toast.success(`Order #${orderId} ${newStatus.toLowerCase()}`);
      await loadOrders();
    }

    setProcessingOrderId(null);
  };

  const acceptOrder = (orderId: number) => updateOrderStatus(orderId, 'ACCEPTED');
  const declineOrder = (orderId: number) => updateOrderStatus(orderId, 'DECLINED');
  const markReady = (orderId: number) => updateOrderStatus(orderId, 'READY');

  // Filter orders by status
  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const activeOrders = orders.filter(o => ['ACCEPTED', 'READY'].includes(o.status));
  const completedOrders = orders.filter(o => ['PICKED_UP', 'DELIVERED'].includes(o.status));

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

  const OrderCard: React.FC<{ order: Order; showActions?: boolean }> = ({ order, showActions = false }) => (
    <Card key={order.id} className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order #{order.id}</CardTitle>
          {getStatusBadge(order.status)}
        </div>
        <CardDescription>
          <div className="flex items-center gap-4 text-sm mt-2">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              ${order.total_price.toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              {order.total_calories} cal
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(order.created_at).toLocaleTimeString()}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      {showActions && order.status === 'PENDING' && (
        <CardFooter className="gap-2">
          <Button
            onClick={() => acceptOrder(order.id)}
            disabled={processingOrderId === order.id}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {processingOrderId === order.id ? 'Processing...' : 'Accept Order'}
          </Button>
          <Button
            variant="outline"
            onClick={() => declineOrder(order.id)}
            disabled={processingOrderId === order.id}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Decline
          </Button>
        </CardFooter>
      )}
      {showActions && order.status === 'ACCEPTED' && (
        <CardFooter>
          <Button
            onClick={() => markReady(order.id)}
            disabled={processingOrderId === order.id}
            className="w-full"
          >
            <Package className="h-4 w-4 mr-2" />
            {processingOrderId === order.id ? 'Processing...' : 'Mark as Ready'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  if (!user?.cafe?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Cafe Assigned</CardTitle>
            <CardDescription>
              You are not currently assigned to any cafe. Please contact your manager to be assigned to a cafe.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-muted-foreground">Manage incoming and active orders for {user.cafe.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Being prepared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">Delivered orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Incoming
            {pendingOrders.length > 0 && (
              <Badge className="ml-2 bg-yellow-500">{pendingOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            {activeOrders.length > 0 && (
              <Badge className="ml-2">{activeOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Pending Orders</h3>
                <p className="text-muted-foreground">New orders will appear here</p>
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map(order => <OrderCard key={order.id} order={order} showActions />)
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Active Orders</h3>
                <p className="text-muted-foreground">Accepted orders will appear here</p>
              </CardContent>
            </Card>
          ) : (
            activeOrders.map(order => <OrderCard key={order.id} order={order} showActions />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-between py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Completed Orders</h3>
                <p className="text-muted-foreground">Completed orders will appear here</p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffOrdersView;
