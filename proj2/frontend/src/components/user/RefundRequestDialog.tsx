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

import { useState } from 'react';
import { Order, RefundCategory, IssueType } from '@/api/types';
import { refundsApi } from '@/api/refunds';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface RefundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onRefundCreated?: () => void;
}

export function RefundRequestDialog({
  open,
  onOpenChange,
  order,
  onRefundCreated,
}: RefundRequestDialogProps) {
  const [category, setCategory] = useState<RefundCategory>('OTHER');
  const [issueType, setIssueType] = useState<IssueType>('OTHER');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions: { value: RefundCategory; label: string }[] = [
    { value: 'RESTAURANT_ISSUE', label: 'Restaurant Issue' },
    { value: 'DRIVER_ISSUE', label: 'Driver Issue' },
    { value: 'CUSTOMER_ISSUE', label: 'Customer Issue' },
    { value: 'SYSTEM_ERROR', label: 'System Error' },
    { value: 'OTHER', label: 'Other' },
  ];

  const issueTypeOptions: { value: IssueType; label: string }[] = [
    { value: 'QUALITY', label: 'Food Quality Issue' },
    { value: 'DELAY', label: 'Excessive Delay' },
    { value: 'DAMAGE', label: 'Damaged/Spilled Food' },
    { value: 'NO_SHOW', label: 'Driver/Restaurant No-Show' },
    { value: 'OUT_OF_STOCK', label: 'Item Out of Stock' },
    { value: 'CANCELLATION', label: 'Cancellation' },
    { value: 'OTHER', label: 'Other Issue' },
  ];

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please provide a description of the issue.');
      return;
    }

    setIsSubmitting(true);

    try {
      // First report the issue
      const issueResult = await refundsApi.reportOrderIssue({
        order_id: order.id,
        issue_type: issueType,
        description: description,
        request_refund: true, // Automatically request refund
      });

      if (issueResult.error) {
        throw new Error(issueResult.error);
      }

      toast.success('Refund request submitted successfully');

      // Reset form
      setCategory('OTHER');
      setIssueType('OTHER');
      setDescription('');
      onOpenChange(false);

      // Callback to refresh the order list
      if (onRefundCreated) {
        onRefundCreated();
      }
    } catch (error) {
      console.error('Error requesting refund:', error);

      // Check for duplicate refund error
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit refund request';

      if (errorMessage.toLowerCase().includes('already been requested') ||
          errorMessage.toLowerCase().includes('already has a refund')) {
        toast.error('A refund has already been requested for this order. You can only request one refund per order. Please check your refund history for the status of your existing request.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Request a refund for Order #{order.id} (${order.total_price.toFixed(2)})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Issue Category</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as RefundCategory)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="issue-type">Issue Type</Label>
            <Select value={issueType} onValueChange={(value) => setIssueType(value as IssueType)}>
              <SelectTrigger id="issue-type">
                <SelectValue placeholder="Select an issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-medium">Refund Process:</p>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>Your request will be reviewed by our team</li>
              <li>Refunds are typically processed within 3-5 business days</li>
              <li>You'll be notified of the decision via email</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
