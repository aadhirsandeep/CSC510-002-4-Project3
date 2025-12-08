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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Clock, CheckCircle, XCircle, Package, TrendingUp, User, DollarSign, AlertCircle } from 'lucide-react';
import { Order, OrderStatus, Refund } from '../../api/types';
import { ordersApi } from '../../api';
import { driversApi, IdleDriverInfo } from '../../api/drivers';
import { refundsApi } from '../../api/refunds';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { RefundStatusBadge } from '../user/RefundStatusBadge';

interface RefundAction {
  refund: Refund;
  action: 'approve' | 'reject';
}

const StaffOrdersView: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  // Refund management state
  const [pendingRefunds, setPendingRefunds] = useState<Refund[]>([]);
  const [actionDialog, setActionDialog] = useState<RefundAction | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<IdleDriverInfo[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assigningDriver, setAssigningDriver] = useState(false);

  useEffect(() => {
    if (user?.cafe?.id) {
      loadOrders();
      loadRefunds();
      // Refresh orders and refunds every 30 seconds
      const interval = setInterval(() => {
        loadOrders();
        loadRefunds();
      }, 30000);
      return () => clearInterval(interval);
    } else if (user && user.role === 'STAFF') {
      // Staff without cafe can still load refunds
      loadRefunds();
      const interval = setInterval(() => {
        loadRefunds();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.cafe?.id, user?.role]);

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
    setSelectedDriverId(''); // Reset driver selection

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
      await loadOrders();
      // Refresh order details if the dialog is open
      if (selectedOrder && selectedOrder.id === orderId) {
        await viewOrderDetails(orderId);
      }
    }
  };

  const assignSpecificDriver = async (orderId: number) => {
    if (!selectedDriverId) {
      toast.error('Please select a driver');
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
      await loadOrders();
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
      await loadOrders();
      // Refresh order details
      if (selectedOrder && selectedOrder.id === orderId) {
        await viewOrderDetails(orderId);
      }
    }

    setAssigningDriver(false);
  };

  // Refund management functions
  const loadRefunds = async () => {
    const { data, error } = await refundsApi.getPendingRefunds();

    if (error) {
      console.error('Failed to load refunds:', error);
      return;
    }

    if (data) {
      setPendingRefunds(data);
    }
  };

  const openApproveDialog = (refund: Refund) => {
    setActionDialog({ refund, action: 'approve' });
    setApprovedAmount(refund.refund_amount.toString());
    setNotes('');
  };

  const openRejectDialog = (refund: Refund) => {
    setActionDialog({ refund, action: 'reject' });
    setRejectionReason('');
  };

  const closeDialog = () => {
    setActionDialog(null);
    setApprovedAmount('');
    setRejectionReason('');
    setNotes('');
  };

  const handleApprove = async () => {
    if (!actionDialog) return;

    const amount = parseFloat(approvedAmount);
    if (isNaN(amount) || amount <= 0 || amount > actionDialog.refund.refund_amount) {
      toast.error(`Amount must be between $0 and $${actionDialog.refund.refund_amount.toFixed(2)}`);
      return;
    }

    setProcessing(true);
    try {
      const response = await refundsApi.approveRefund(actionDialog.refund.id, {
        approved_amount: amount,
        notes: notes.trim() || undefined,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(`Refund of $${amount.toFixed(2)} has been approved`);
      closeDialog();
      loadRefunds();
    } catch (error) {
      console.error('Error approving refund:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve refund');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!actionDialog) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejecting this refund');
      return;
    }

    setProcessing(true);
    try {
      const response = await refundsApi.rejectRefund(actionDialog.refund.id, {
        rejection_reason: rejectionReason,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success('Refund request has been rejected');
      closeDialog();
      loadRefunds();
    } catch (error) {
      console.error('Error rejecting refund:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject refund');
    } finally {
      setProcessing(false);
    }
  };

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
            {order.driver_id && (
              <span className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Driver #{order.driver_id}
              </span>
            )}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewOrderDetails(order.id)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </CardFooter>
      )}
      {showActions && order.status === 'ACCEPTED' && (
        <CardFooter className="gap-2">
          <Button
            onClick={() => markReady(order.id)}
            disabled={processingOrderId === order.id}
            className="flex-1"
          >
            <Package className="h-4 w-4 mr-2" />
            {processingOrderId === order.id ? 'Processing...' : 'Mark as Ready'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewOrderDetails(order.id)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </CardFooter>
      )}
      {showActions && order.status === 'READY' && (
        <CardFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewOrderDetails(order.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </CardFooter>
      )}
      {!showActions && (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewOrderDetails(order.id)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
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
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="refunds">
            Refunds
            {pendingRefunds.length > 0 && (
              <Badge className="ml-2 bg-red-500">{pendingRefunds.length}</Badge>
            )}
          </TabsTrigger>
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

        <TabsContent value="refunds" className="space-y-4 mt-4">
          {pendingRefunds.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Pending Refunds</h3>
                <p className="text-muted-foreground">Refund requests will appear here</p>
              </CardContent>
            </Card>
          ) : (
            pendingRefunds.map(refund => (
              <Card key={refund.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        Order #{refund.order_id}
                        <RefundStatusBadge status={refund.status} />
                      </CardTitle>
                      <CardDescription>
                        Refund #{refund.id} • Requested {new Date(refund.requested_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">${refund.refund_amount.toFixed(2)}</p>
                      {refund.refund_percentage && (
                        <p className="text-sm text-muted-foreground">{refund.refund_percentage}%</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Original Amount</p>
                        <p className="font-medium">${refund.original_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Category</p>
                        <p className="font-medium">{refund.reason_category.replace(/_/g, ' ')}</p>
                      </div>
                    </div>

                    {refund.reason_description && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Reason</p>
                        <p className="text-sm bg-gray-50 p-2 rounded">{refund.reason_description}</p>
                      </div>
                    )}

                    {refund.reason_code && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Reason Code</p>
                        <Badge variant="outline">{refund.reason_code}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openApproveDialog(refund)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openRejectDialog(refund)}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Refund Action Dialog */}
      {actionDialog && (
        <Dialog open={!!actionDialog} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {actionDialog.action === 'approve' ? 'Approve Refund' : 'Reject Refund'}
              </DialogTitle>
              <DialogDescription>
                Order #{actionDialog.refund.order_id} • Refund #{actionDialog.refund.id}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {actionDialog.action === 'approve' ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="approved-amount">Approved Amount</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">$</span>
                      <Input
                        id="approved-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        max={actionDialog.refund.refund_amount}
                        value={approvedAmount}
                        onChange={(e) => setApprovedAmount(e.target.value)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested: ${actionDialog.refund.refund_amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes about this approval..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="rejection-reason">Rejection Reason</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Please provide a reason for rejecting this refund..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              )}

              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="font-medium mb-2">Refund Details:</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>Category: {actionDialog.refund.reason_category.replace(/_/g, ' ')}</p>
                  {actionDialog.refund.reason_description && (
                    <p>Reason: {actionDialog.refund.reason_description}</p>
                  )}
                  <p>Requested: {new Date(actionDialog.refund.requested_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={processing}>
                Cancel
              </Button>
              <Button
                onClick={actionDialog.action === 'approve' ? handleApprove : handleReject}
                disabled={processing}
                variant={actionDialog.action === 'approve' ? 'default' : 'destructive'}
              >
                {processing
                  ? 'Processing...'
                  : actionDialog.action === 'approve'
                  ? 'Approve Refund'
                  : 'Reject Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

export default StaffOrdersView;
