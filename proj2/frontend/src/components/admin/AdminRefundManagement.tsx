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

import { useState, useEffect } from 'react';
import { Refund } from '@/api/types';
import { refundsApi } from '@/api/refunds';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RefundStatusBadge } from '../user/RefundStatusBadge';
import { CheckCircle, XCircle, DollarSign, Clock, AlertCircle } from 'lucide-react';

interface RefundAction {
  refund: Refund;
  action: 'approve' | 'reject';
}

export function AdminRefundManagement() {
  const [allRefunds, setAllRefunds] = useState<Refund[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<RefundAction | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      // Fetch pending refunds
      const pendingResponse = await refundsApi.getPendingRefunds();
      if (pendingResponse.data) {
        setPendingRefunds(pendingResponse.data);
      }

      // Fetch all user's refunds for history
      const allResponse = await refundsApi.getMyRefunds();
      if (allResponse.data) {
        setAllRefunds(allResponse.data);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
      toast.error('Failed to load refund data');
    } finally {
      setLoading(false);
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
      fetchRefunds();
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
      fetchRefunds();
    } catch (error) {
      console.error('Error rejecting refund:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject refund');
    } finally {
      setProcessing(false);
    }
  };

  const renderRefundCard = (refund: Refund, showActions: boolean = false) => (
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

          {refund.processed_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Processed: {new Date(refund.processed_at).toLocaleString()}</span>
            </div>
          )}

          {showActions && refund.status === 'PENDING' && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => openApproveDialog(refund)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openRejectDialog(refund)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Refund Management</h1>
        <p className="text-muted-foreground">Review and process refund requests</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <p className="text-muted-foreground">Loading refunds...</p>
        </div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending
              {pendingRefunds.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingRefunds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Refunds</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRefunds.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="space-y-4">
                    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">No pending refunds</h3>
                      <p className="text-muted-foreground">All refund requests have been processed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRefunds.map((refund) => renderRefundCard(refund, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {allRefunds.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="space-y-4">
                    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                      <DollarSign className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">No refunds found</h3>
                      <p className="text-muted-foreground">No refund requests have been made</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allRefunds.map((refund) => renderRefundCard(refund, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Refunds</CardDescription>
                  <CardTitle className="text-3xl">
                    {allRefunds.filter((r) => r.status === 'PENDING').length}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Approved Refunds</CardDescription>
                  <CardTitle className="text-3xl">
                    {allRefunds.filter((r) => ['APPROVED', 'PROCESSED'].includes(r.status)).length}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Approved or processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Refunded</CardDescription>
                  <CardTitle className="text-3xl">
                    $
                    {allRefunds
                      .filter((r) => ['APPROVED', 'PROCESSED'].includes(r.status))
                      .reduce((sum, r) => sum + r.refund_amount, 0)
                      .toFixed(2)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Total amount refunded
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Action Dialog */}
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
    </div>
  );
}
