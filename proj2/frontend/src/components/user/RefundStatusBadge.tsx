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

import { RefundStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';

interface RefundStatusBadgeProps {
  status: RefundStatus;
  className?: string;
}

export function RefundStatusBadge({ status, className }: RefundStatusBadgeProps) {
  const getStatusConfig = (status: RefundStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Pending Review',
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        };
      case 'APPROVED':
        return {
          label: 'Approved',
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        };
      case 'PROCESSED':
        return {
          label: 'Refunded',
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
        };
      case 'FAILED':
        return {
          label: 'Failed',
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge className={`${config.className} ${className || ''}`}>
      {config.label}
    </Badge>
  );
}
