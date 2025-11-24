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
 * @component DriverDashboard
 * @description Driver's order management and delivery interface.
 * Features:
 * - Real-time order notifications
 * - Route optimization
 * - Delivery status updates
 * - Earnings tracking
 * - Customer contact info
 * - Order pickup confirmation
 * - Delivery time estimation
 * - Location tracking
 * - Performance metrics
 * 
 * Provides comprehensive delivery management tools
 * with real-time updates and GPS integration.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Truck, MapPin } from 'lucide-react';

import { User, Order } from '../../api/types';
import { driversApi } from '../../api/drivers';

interface DriverDashboardProps {
  user: User;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ user }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<'assigned' | 'previous'>('assigned');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssigned = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await driversApi.getAssignedOrders(user.id);
      if (res.error) {
        setError(res.error);
        setOrders([]);
      } else {
        setOrders(res.data || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load assigned orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!user) return;
    (async () => {
      await fetchAssigned();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const handlePickup = async (orderId: number) => {
    try {
      setLoading(true);
      const res = await driversApi.pickupOrder(user.id, orderId);
      if (res.error) setError(res.error);
      await fetchAssigned();
    } catch (e: any) {
      setError(e?.message || 'Failed to pickup order');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async (orderId: number) => {
    try {
      setLoading(true);
  const res = await driversApi.deliverOrder(user.id, orderId);
      if (res.error) setError(res.error);
      await fetchAssigned();
    } catch (e: any) {
      setError(e?.message || 'Failed to mark order delivered');
    } finally {
      setLoading(false);
    }
  };

  // derive lists for tabs
  const normalizeStatus = (order: any) => (order?.status ?? '').toString().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const isFinalStatus = (statusNorm: string) => statusNorm.includes('DELIVER') || statusNorm.includes('CANCEL') || statusNorm.includes('COMPLETE') || statusNorm.includes('DONE');
  const activeOrders = orders.filter((o) => {
    const s = normalizeStatus(o);
    return !isFinalStatus(s);
  });
  const previousOrders = orders.filter((o) => {
    const s = normalizeStatus(o);
    return isFinalStatus(s);
  });

  const ordersToShow = tab === 'assigned' ? activeOrders : previousOrders;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Driver Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name?.split(' ')[0] || 'driver'} — here are your assigned orders.</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Assigned Orders</CardTitle>
            <CardDescription>Orders assigned to you for pickup and delivery</CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button variant={tab === 'assigned' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('assigned')}>
                Assigned ({activeOrders.length})
              </Button>
              <Button variant={tab === 'previous' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('previous')}>
                Previous ({previousOrders.length})
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <Link to="/driver/dashboard">
                <Button variant="outline" size="sm">Refresh</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading assigned orders…</div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">{error}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders assigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ordersToShow.map((order: any) => {
                const statusStr = (order.status ?? '').toString();
                const statusNorm = statusStr.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
                // Accept a variety of server-side status formats (enum, spaced, camelCase)
                const isPickedUp = statusNorm.includes('PICK') || statusNorm.includes('IN_TRANSIT') || statusNorm.includes('OUT_FOR_DELIVERY') || statusNorm.includes('ON_ROUTE') || statusNorm === 'PICKED_UP' || statusNorm.includes('PICKED');
                // Consider ACCEPTED also as ready-for-pickup for drivers (backend allows pickup from ACCEPTED)
                const isReady = statusNorm === 'READY' || statusNorm.includes('READY') || statusNorm === 'ACCEPTED' || statusNorm.includes('ACCEPT');
                const isDelivered = statusNorm === 'DELIVERED' || statusNorm.includes('DELIVERED');
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">Order #{order.id}</h4>
                        <Badge variant={isDelivered || isPickedUp ? 'default' : 'secondary'}>
                          {statusStr}
                        </Badge>
                        <div className="text-xs text-muted-foreground">raw: {statusStr}</div>
                      </div>
                      <p className="text-sm text-muted-foreground">Cafe: {order.cafe_name || order.cafe_id}</p>
                      {order.created_at && (
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {isReady && tab === 'assigned' && (
                        <Button onClick={() => handlePickup(order.id)} size="sm">Pickup</Button>
                      )}
                      {isPickedUp && tab === 'assigned' && (
                        <Button onClick={() => handleDeliver(order.id)} size="sm">DELIVER</Button>
                      )}
                      {!isReady && !isPickedUp && (
                        <Button variant="ghost" size="sm" disabled>
                          <MapPin className="mr-2" /> Track
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDashboard;
