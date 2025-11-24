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
 * @component OrderManagement
 * @description Real-time order processing and management system.
 * Features:
 * - Live order queue with status updates
 * - Order acceptance and rejection
 * - Preparation time estimation
 * - Driver assignment
 * - Order history and search
 * - Customer communication
 * - Order filtering and sorting
 * - Priority order handling
 * - Order modification support
 * 
 * Integrates with driver assignment system and
 * provides real-time updates to customers.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Clock, CheckCircle, XCircle, Filter, Search, Calendar, MapPin, RefreshCw, ChevronDown, ChevronUp, Package, DollarSign, Flame  } from 'lucide-react';
// import { User, Order, OrderStatus } from '../../api/types';
import { ordersApi } from '../../api/orders';
import { toast } from 'sonner';
import { User, Order, OrderStatus, OrderSummary, OrderItemSummary } from '../../api/types';

interface OrderManagementProps {
  user: User;
}

const OrderManagement: React.FC<OrderManagementProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [orderSummaries, setOrderSummaries] = useState<Map<number, OrderSummary>>(new Map());
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [loadingSummaries, setLoadingSummaries] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch orders
  const fetchOrders = async () => {
    if (!user?.cafe?.id) return;

    const cafeId = user.cafe.id;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await ordersApi.getCafeOrders(cafeId);

      if (error) {
        setError(error);
        toast.error('Failed to fetch orders');
        setOrders([]);
      } else if (data) {
        const orderArray = Array.isArray(data) ? data : [data];
        setOrders(orderArray);
        console.log('Fetched cafe orders:', orderArray);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
      toast.error('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch order summary details
  // Fetch order summary details
const fetchOrderSummary = async (orderId: number) => {
  if (orderSummaries.has(orderId)) return; // Already fetched

  setLoadingSummaries(prev => new Set(prev).add(orderId));

  try {
    const { data, error } = await ordersApi.getOrderSummary(orderId);  // Changed from getOrder

    if (error) {
      toast.error(`Failed to load details for order #${orderId}`);
    } else if (data) {
      setOrderSummaries(prev => new Map(prev).set(orderId, data));
    }
  } catch (err) {
    console.error('Error fetching order summary:', err);
    toast.error(`Failed to load details for order #${orderId}`);
  } finally {
    setLoadingSummaries(prev => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }
};

  // Toggle order expansion
  const toggleOrderExpansion = (orderId: number) => {
    const isExpanded = expandedOrders.has(orderId);
    
    if (!isExpanded) {
      // Expanding - fetch summary if not already fetched
      fetchOrderSummary(orderId);
      setExpandedOrders(prev => new Set(prev).add(orderId));
    } else {
      // Collapsing
      setExpandedOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.cafe?.id]);

  // Filter logic
  useEffect(() => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    const now = new Date();
    if (timeFilter === 'today') {
      filtered = filtered.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => new Date(o.created_at) >= weekAgo);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toString().includes(query) ||
        o.status.toLowerCase().includes(query) ||
        o.total_price.toString().includes(query)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, statusFilter, timeFilter, searchQuery]);

  // Update order status
  const handleUpdateStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      const { data, error } = await ordersApi.updateOrderStatus(orderId, newStatus);
      if (error) {
        toast.error(error);
      } else if (data) {
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        toast.success(`Order #${orderId} status updated to ${newStatus}`);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Stats
  const getStats = () => {
    const pending = orders.filter(o => o.status === 'PENDING').length;
    const accepted = orders.filter(o => o.status === 'ACCEPTED').length;
    const ready = orders.filter(o => o.status === 'READY').length;
    const completed = orders.filter(o => o.status === 'PICKED_UP').length;
    return { pending, accepted, ready, completed };
  };

  const stats = getStats();

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'READY': return 'bg-green-100 text-green-800 border-green-200';
      case 'PICKED_UP': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNextActions = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return [
          { label: 'Accept', status: 'ACCEPTED' as OrderStatus },
          { label: 'Decline', status: 'DECLINED' as OrderStatus }
        ];
      case 'ACCEPTED':
        return [{ label: 'Mark Ready', status: 'READY' as OrderStatus }];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1">
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Manage incoming orders and track their progress</p>
        </div>
        <Button onClick={fetchOrders} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh Orders
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex justify-between"><CardTitle>Pending</CardTitle><Clock className="h-4 w-4 text-yellow-600"/></CardHeader><CardContent className="text-2xl font-bold text-yellow-600">{stats.pending}</CardContent></Card>
        <Card><CardHeader className="flex justify-between"><CardTitle>Accepted</CardTitle><CheckCircle className="h-4 w-4 text-blue-600"/></CardHeader><CardContent className="text-2xl font-bold text-blue-600">{stats.accepted}</CardContent></Card>
        <Card><CardHeader className="flex justify-between"><CardTitle>Ready</CardTitle><CheckCircle className="h-4 w-4 text-green-600"/></CardHeader><CardContent className="text-2xl font-bold text-green-600">{stats.ready}</CardContent></Card>
        <Card><CardHeader className="flex justify-between"><CardTitle>Completed</CardTitle><CheckCircle className="h-4 w-4 text-gray-600"/></CardHeader><CardContent className="text-2xl font-bold text-gray-600">{stats.completed}</CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex items-center gap-2"><Filter className="h-5 w-5"/>Filters</CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Input placeholder="Search by order or customer ID" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1"/>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="PICKED_UP">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={v => setTimeFilter(v as any)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Time"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Orders list */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No orders match your filters.</p>
        ) : filteredOrders.map(order => {
          const isExpanded = expandedOrders.has(order.id);
          const summary = orderSummaries.get(order.id);
          const isLoadingSummary = loadingSummaries.has(order.id);

          return (
            <Card key={order.id}>
              <CardHeader className="flex flex-row justify-between items-start">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle>Order #{order.id}</CardTitle>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${order.total_price?.toFixed(2) || '0.00'}
                      </span>
                      {order.total_calories && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {order.total_calories} cal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleOrderExpansion(order.id)}
                  className="ml-4"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  
                  {isLoadingSummary ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading order details...
                    </div>
                  ) : summary ? (
                    <div className="space-y-4">
                      {/* Items list */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Order Items
                        </h3>
                        <div className="space-y-2">
                          {summary.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{item.quantity}x</span>
                                <span>{item.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  {item.subtotal_calories} cal
                                </span>
                                <span className="font-semibold">
                                  ${item.subtotal_price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Driver info */}
                      {summary.driver_info && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h3 className="font-semibold mb-1 text-blue-900">Driver Assigned</h3>
                          <p className="text-sm text-blue-700">{summary.driver_info.driver_email}</p>
                        </div>
                      )}

                      {/* Order totals */}
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                          <Separator />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Calories:</span>
                            <span className="font-medium">{summary.total_calories} cal</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span>${summary.total_price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Failed to load order details
                    </div>
                  )}

                  {/* Action buttons */}
                  {getNextActions(order.status).length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex gap-2 flex-wrap">
                        {getNextActions(order.status).map(action => (
                          <Button 
                            key={action.label} 
                            size="sm" 
                            onClick={() => handleUpdateStatus(order.id, action.status)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              )}

              {/* Quick actions (when collapsed) */}
              {!isExpanded && getNextActions(order.status).length > 0 && (
                <CardContent className="pt-0 flex gap-2 flex-wrap">
                  {getNextActions(order.status).map(action => (
                    <Button 
                      key={action.label} 
                      size="sm" 
                      onClick={() => handleUpdateStatus(order.id, action.status)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrderManagement;


// const OrderManagement: React.FC<OrderManagementProps> = ({ user }) => {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
//   const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('today');
//   const [searchQuery, setSearchQuery] = useState('');

//   // Fetch orders
//   // Fetch orders
// const fetchOrders = async () => {
//   if (!user?.cafe?.id) return;

//   const cafeId = user.cafe.id;
//   setLoading(true);
//   setError(null);

//   try {
//     const { data, error } = await ordersApi.getCafeOrders(cafeId);

//     if (error) {
//       setError(error);
//       toast.error('Failed to fetch orders');
//       setOrders([]); // fallback
//     } else if (data) {
//       // ✅ Backend returns an array directly
//       const orderArray = Array.isArray(data) ? data : [data];
//       setOrders(orderArray);
//       console.log('Fetched cafe orders:', orderArray);
//     } else {
//       setOrders([]);
//     }
//   } catch (err) {
//     console.error('Error fetching orders:', err);
//     setError('Failed to fetch orders');
//     toast.error('Failed to fetch orders');
//     setOrders([]);
//   } finally {
//     setLoading(false);
//   }
// };


//   useEffect(() => {
//     fetchOrders();
//   }, [user?.cafe?.id]);

//   // Filter logic
//   useEffect(() => {
//     let filtered = [...orders];

//     // Status filter
//     if (statusFilter !== 'all') {
//       filtered = filtered.filter(o => o.status === statusFilter);
//     }

//     // Time filter
//     const now = new Date();
//     if (timeFilter === 'today') {
//       filtered = filtered.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
//     } else if (timeFilter === 'week') {
//       const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//       filtered = filtered.filter(o => new Date(o.created_at) >= weekAgo);
//     }

//     // Search filter
//     if (searchQuery) {
//       const query = searchQuery.toLowerCase();
//       filtered = filtered.filter(o =>
//         o.id.toString().includes(query) ||
//         o.status.toLowerCase().includes(query) ||
//         o.total_price.toString().includes(query)
//       );
//     }



//     setFilteredOrders(filtered);
//   }, [orders, statusFilter, timeFilter, searchQuery]);

//   // Update order status
//   const handleUpdateStatus = async (orderId: number, newStatus: OrderStatus) => {
//     try {
//       const { data, error } = await ordersApi.updateOrderStatus(orderId, newStatus);
//       if (error) {
//         toast.error(error);
//       } else if (data) {
//         setOrders(prev =>
//           prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
//         );
//         toast.success(`Order #${orderId} status updated to ${newStatus}`);
//       }
//     } catch {
//       toast.error('Failed to update status');
//     }
//   };

//   // Stats
//   const getStats = () => {
//     const pending = orders.filter(o => o.status === 'PENDING').length;
//     const accepted = orders.filter(o => o.status === 'ACCEPTED').length;
//     const ready = orders.filter(o => o.status === 'READY').length;
//     const completed = orders.filter(o => o.status === 'PICKED_UP').length;
//     return { pending, accepted, ready, completed };
//   };

//   const stats = getStats();

//   const getStatusColor = (status: OrderStatus) => {
//     switch (status) {
//       case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
//       case 'ACCEPTED': return 'bg-blue-100 text-blue-800 border-blue-200';
//       case 'READY': return 'bg-green-100 text-green-800 border-green-200';
//       case 'PICKED_UP': return 'bg-gray-100 text-gray-800 border-gray-200';
//       case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
//       default: return 'bg-gray-100 text-gray-800 border-gray-200';
//     }
//   };

//   const getNextActions = (status: OrderStatus) => {
//     switch (status) {
//       case 'PENDING':
//         return [
//           { label: 'Accept', status: 'ACCEPTED' as OrderStatus },
//           { label: 'Decline', status: 'DECLINED' as OrderStatus }
//         ];
//       case 'ACCEPTED':
//         return [{ label: 'Mark Ready', status: 'READY' as OrderStatus }];
//       default:
//         return [];
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <div className="flex flex-col space-y-1">
//           <h1 className="text-3xl font-bold">Order Management</h1>
//           <p className="text-muted-foreground">Manage incoming orders and track their progress</p>
//         </div>
//         <Button onClick={fetchOrders} disabled={loading} variant="outline">
//           <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
//           Refresh Orders
//         </Button>
//       </div>

//       {/* Stats cards */}
//       <div className="grid gap-4 md:grid-cols-4">
//         <Card><CardHeader className="flex justify-between"><CardTitle>Pending</CardTitle><Clock className="h-4 w-4 text-yellow-600"/></CardHeader><CardContent className="text-2xl font-bold text-yellow-600">{stats.pending}</CardContent></Card>
//         <Card><CardHeader className="flex justify-between"><CardTitle>Accepted</CardTitle><CheckCircle className="h-4 w-4 text-blue-600"/></CardHeader><CardContent className="text-2xl font-bold text-blue-600">{stats.accepted}</CardContent></Card>
//         <Card><CardHeader className="flex justify-between"><CardTitle>Ready</CardTitle><CheckCircle className="h-4 w-4 text-green-600"/></CardHeader><CardContent className="text-2xl font-bold text-green-600">{stats.ready}</CardContent></Card>
//         <Card><CardHeader className="flex justify-between"><CardTitle>Completed</CardTitle><CheckCircle className="h-4 w-4 text-gray-600"/></CardHeader><CardContent className="text-2xl font-bold text-gray-600">{stats.completed}</CardContent></Card>
//       </div>

//       {/* Filters */}
//       <Card>
//         <CardHeader className="flex items-center gap-2"><Filter className="h-5 w-5"/>Filters</CardHeader>
//         <CardContent className="flex flex-col md:flex-row gap-4">
//           <Input placeholder="Search by order or customer ID" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1"/>
//           <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
//             <SelectTrigger className="w-40"><SelectValue placeholder="Status"/></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All</SelectItem>
//               <SelectItem value="PENDING">Pending</SelectItem>
//               <SelectItem value="ACCEPTED">Accepted</SelectItem>
//               <SelectItem value="READY">Ready</SelectItem>
//               <SelectItem value="PICKED_UP">Completed</SelectItem>
//               <SelectItem value="CANCELLED">Cancelled</SelectItem>
//             </SelectContent>
//           </Select>
//           <Select value={timeFilter} onValueChange={v => setTimeFilter(v as any)}>
//             <SelectTrigger className="w-32"><SelectValue placeholder="Time"/></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="today">Today</SelectItem>
//               <SelectItem value="week">This Week</SelectItem>
//               <SelectItem value="all">All Time</SelectItem>
//             </SelectContent>
//           </Select>
//         </CardContent>
//       </Card>

//       {/* Orders list */}
//       <div className="space-y-4">
//         {loading ? (
//           <p className="text-center py-12 text-gray-500">Loading orders...</p>
//         ) : filteredOrders.length === 0 ? (
//           <p className="text-center py-12 text-gray-500">No orders match your filters.</p>
//         ) : filteredOrders.map(order => (
//           <Card key={order.id}>
//             <CardHeader className="flex justify-between items-center">
//               <div className="flex items-center gap-2">
//                 <CardTitle>Order #{order.id}</CardTitle>
//                 <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
//               </div>
//               <div>{new Date(order.created_at).toLocaleString()}</div>
//             </CardHeader>
//             <CardContent className="flex gap-2 flex-wrap">
//               {getNextActions(order.status).map(action => (
//                 <Button key={action.label} size="sm" onClick={() => handleUpdateStatus(order.id, action.status)}>
//                   {action.label}
//                 </Button>
//               ))}
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default OrderManagement;
