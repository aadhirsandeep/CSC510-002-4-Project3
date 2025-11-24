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
 * @component OrderHistory
 * @description Lists the user's past and current orders with tabbed views
 * (all/active/completed/cancelled). Fetches orders and normalizes item-level
 * details for display, supports inline review submission, reorder and cancel
 * actions.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Clock, MapPin, Star, RotateCcw, Package } from 'lucide-react';
import { User, Order as ApiOrder } from '../../api/types';
import { toast } from 'sonner';
import { getMyOrders, cancelOrder as cancelOrderApi, getOrder as getOrderApi } from '../../api/orders';
import { getCafe as getCafeApi } from '../../api/cafes';
import { createReview } from '../../api/reviews';

// Local Order interface for the component
interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: any[];
  totalAmount: number;
  totalCalories: number;
  status: string;
  createdAt: Date;
  pickupTime?: Date;
  paymentMethod: string;
  canCancelUntil?: Date;
  restaurantName?: string;
}

interface OrderHistoryProps {
  user: User;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const cafeNameCache = new Map<number, string>();

  useEffect(() => {
    // Fetch orders from API
    const fetchOrders = async () => {
      try {
        const response = await getMyOrders();
        console.debug('[OrderHistory] getMyOrders response:', response);
        if (response.data) {
          // For each API order, try to fetch detailed order (items) and cafe name for display
          const detailed = await Promise.all(
            response.data.map(async (order: ApiOrder) => {
              let items: any[] = [];
              let restaurantName = 'Restaurant';
              console.debug('[OrderHistory] processing order', order.id, order);
              try {
                const od = await getOrderApi(order.id);
                console.debug('[OrderHistory] getOrderApi result for', order.id, od);
                if (od && od.data) {
                  const rawItems = (od.data as any).items ?? (od.data as any).order_items ?? [];
                  // normalize item fields for UI
                  items = rawItems.map((it: any) => ({
                    name: it.name ?? it.item_name ?? it.title ?? 'Item',
                    quantity: it.quantity ?? it.qty ?? 1,
                    calories: it.subtotal_calories ?? it.subtotalCalories ?? it.calories ?? 0,
                    price: it.subtotal_price ?? it.subtotalPrice ?? it.price ?? 0,
                  }));
                }
              } catch (e) {
                console.debug('[OrderHistory] getOrderApi failed for', order.id, e);
                // ignore
              }

              try {
                const cafeId = Number(order.cafe_id);
                if (cafeId && cafeNameCache.has(cafeId)) {
                  restaurantName = cafeNameCache.get(cafeId)!;
                } else if (cafeId) {
                  const cres = await getCafeApi(cafeId);
                  console.debug('[OrderHistory] getCafeApi for', cafeId, cres);
                  if (cres && cres.data) {
                    restaurantName = (cres.data as any).name || restaurantName;
                    cafeNameCache.set(cafeId, restaurantName);
                  }
                }
              } catch (e) {
                console.debug('[OrderHistory] getCafeApi failed for', order.cafe_id, e);
                // ignore
              }

              return {
                raw: order,
                items,
                restaurantName,
              };
            })
          );

          const transformedOrders: Order[] = detailed.map(({ raw, items, restaurantName }: any) => ({
            id: raw.id.toString(),
            userId: user.id.toString(),
            restaurantId: raw.cafe_id.toString(),
            items: items || [],
            totalAmount: raw.total_price,
            totalCalories: raw.total_calories,
            status: raw.status.toLowerCase(),
            createdAt: new Date(raw.created_at),
            paymentMethod: 'credit_card',
            canCancelUntil: new Date(raw.can_cancel_until),
            // include human-readable name for UI convenience
            restaurantName,
          }));

          setOrders(transformedOrders);
          setFilteredOrders(transformedOrders);
        } else if (response.error) {
          toast.error(`Failed to load orders: ${response.error}`);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      }
    };

    fetchOrders();
  }, [user.id]);

  useEffect(() => {
    let filtered = orders;
    
    switch (activeTab) {
      case 'active':
        filtered = orders.filter(order => 
          ['pending', 'accepted', 'ready', 'picked_up'].includes(order.status)
        );
        break;
      case 'completed':
        filtered = orders.filter(order => order.status === 'delivered');
        break;
      case 'cancelled':
        filtered = orders.filter(order => order.status === 'cancelled');
        break;
      default:
        filtered = orders;
    }

    setFilteredOrders(filtered);
  }, [orders, activeTab]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRestaurantName = (restaurantId: string) => {
    // If the order object already contains a restaurantName, prefer that.
    // Otherwise fall back to the static mapping for demo data.
    const staticNames: { [key: string]: string } = {
      'rest1': 'Pizza Palace',
      'rest2': 'Burger Hub',
      'rest3': 'Sushi Zen',
      'rest4': 'Taco Fiesta',
      'rest5': 'Green Garden',
      'rest6': 'Curry House'
    };
    return staticNames[restaurantId] || 'Restaurant';
  };

  const canCancelOrder = (order: Order) => {
    if (!order.canCancelUntil) return false;
    const now = Date.now();
    const cancelUntil = new Date(order.canCancelUntil).getTime();
    return now < cancelUntil && ['pending', 'accepted'].includes(order.status.toLowerCase());
  };

  // Review form state
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const openReviewForm = (orderId: string) => {
    setReviewingOrderId(orderId);
    setReviewText('');
    setReviewRating(5);
  };

  const cancelReview = () => {
    setReviewingOrderId(null);
    setReviewText('');
    setReviewRating(5);
  };

  const submitReview = async (order: Order) => {
    try {
      setSubmittingReview(true);
      const cafeId = parseInt(order.restaurantId);
      const payload = {
        cafe_id: cafeId,
        user_id: user.id,
        rating: reviewRating,
        text: reviewText,
      };
      const res = await createReview(cafeId, payload as any);
      if (res.data) {
        toast.success('Review submitted');
        cancelReview();
      } else {
        toast.error(res.error || 'Failed to submit review');
      }
    } catch (e) {
      console.error('Error submitting review', e);
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const response = await cancelOrderApi(parseInt(orderId));
      if (response.data) {
        // Update the order in the list
        const updatedOrders = orders.map(order => 
          order.id === orderId ? { ...order, status: 'cancelled' } : order
        );
        setOrders(updatedOrders);
        toast.success('Order cancelled successfully');
      } else if (response.error) {
        toast.error(`Failed to cancel order: ${response.error}`);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const reorderItems = (order: Order) => {
    if (order.items.length > 0) {
      localStorage.setItem('cart', JSON.stringify(order.items));
      toast.success('Items added to cart');
    } else {
      toast.error('Cannot reorder - no items found');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Order History</h1>
        <p className="text-muted-foreground">Track your past and current orders</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        {['all', 'active', 'completed', 'cancelled'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filteredOrders.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="space-y-4">
                    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">No orders found</h3>
                      <p className="text-muted-foreground">
                        {tab === 'all' 
                          ? "You haven't placed any orders yet" 
                          : `No ${tab} orders`
                        }
                      </p>
                    </div>
                    {tab === 'all' && (
                      <Link to="/restaurants">
                        <Button>Start Ordering</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="flex items-center gap-2">
                            {order.restaurantName ?? getRestaurantName(order.restaurantId)}
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Order #{order.id} • {new Date(order.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${order.totalAmount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{order.totalCalories} cal</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                          {order.items && order.items.length > 0 && (
                            <div className="space-y-2">
                              {order.items.map((it: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <div>
                                    <div className="font-medium">{it.name || it.title || it.item_name || 'Item'}</div>
                                    <div className="text-xs text-muted-foreground">x{it.quantity ?? it.qty ?? 1}</div>
                                  </div>
                                  <div className="text-right text-sm text-muted-foreground">
                                    {it.calories ? `${it.calories} cal` : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              Ordered {new Date(order.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          {order.pickupTime && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>
                                Picked up {new Date(order.pickupTime).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Link to={`/orders/${order.id}/track`}>
                            <Button variant="outline" size="sm">
                              Track Order
                            </Button>
                          </Link>

                          {order.status === 'delivered' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => reorderItems(order)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reorder
                              </Button>
                              <Link to={`/restaurants/${order.restaurantId}/review`}>
                                <Button variant="outline" size="sm">
                                  <Star className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              </Link>
                            </>
                          )}

                          {/* Always allow leaving a review for any order */}
                          <Button variant="ghost" size="sm" onClick={() => openReviewForm(order.id)}>
                            Leave Review
                          </Button>

                          {canCancelOrder(order) && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => cancelOrder(order.id)}
                            >
                              Cancel Order
                            </Button>
                          )}
                        </div>

                        {/* Inline review form */}
                        {reviewingOrderId === order.id && (
                          <div className="mt-3 space-y-2 border p-3 rounded">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium">Rating:</label>
                              <select
                                value={reviewRating}
                                onChange={(e) => setReviewRating(parseInt(e.target.value))}
                                className="border rounded px-2 py-1"
                              >
                                {[5,4,3,2,1].map((r) => (
                                  <option key={r} value={r}>{r} ★</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Review</label>
                              <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                className="w-full border rounded p-2 mt-1"
                                rows={3}
                                placeholder="Share your experience"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => submitReview(order)} disabled={submittingReview || !reviewText.trim()}>
                                {submittingReview ? 'Submitting...' : 'Submit Review'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelReview}>Cancel</Button>
                            </div>
                          </div>
                        )}

                        {order.status === 'ready' && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 font-medium">
                              🎉 Your order is ready for pickup!
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Please collect your order from {getRestaurantName(order.restaurantId)}
                            </p>
                          </div>
                        )}

                        {/* Backend does not expose PREPARING; omit this block */}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default OrderHistory;