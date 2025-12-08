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
 * @component WaitTimeTracker
 * @description Real-time wait time tracking component that displays
 * estimated preparation and delivery times for an order.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Clock, ChefHat, Truck, CheckCircle, MapPin } from 'lucide-react';
import { WaitTimeEstimate, OrderStatus } from '../../api/types';
import { getWaitTime } from '../../api/orders';

interface WaitTimeTrackerProps {
  orderId: number;
  /** Polling interval in milliseconds (default: 10000 = 10 seconds) */
  pollInterval?: number;
  /** Callback when wait time data is updated */
  onUpdate?: (estimate: WaitTimeEstimate) => void;
}

const WaitTimeTracker: React.FC<WaitTimeTrackerProps> = ({
  orderId,
  pollInterval = 10000,
  onUpdate,
}) => {
  const [estimate, setEstimate] = useState<WaitTimeEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWaitTime = useCallback(async () => {
    try {
      const response = await getWaitTime(orderId);
      if (response.data) {
        setEstimate(response.data);
        setError(null);
        onUpdate?.(response.data);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to fetch wait time');
    } finally {
      setLoading(false);
    }
  }, [orderId, onUpdate]);

  useEffect(() => {
    // Initial fetch
    fetchWaitTime();

    // Set up polling
    const intervalId = setInterval(fetchWaitTime, pollInterval);

    return () => clearInterval(intervalId);
  }, [fetchWaitTime, pollInterval]);

  if (loading && !estimate) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Loading wait time...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!estimate) {
    return null;
  }

  // Determine the current phase and progress
  const getPhaseInfo = () => {
    switch (estimate.status) {
      case 'PENDING':
        return {
          phase: 'Waiting for Restaurant',
          icon: <Clock className="h-5 w-5" />,
          color: 'bg-yellow-500',
          progress: 10,
        };
      case 'ACCEPTED':
        return {
          phase: 'Preparing Your Order',
          icon: <ChefHat className="h-5 w-5" />,
          color: 'bg-orange-500',
          progress: 40,
        };
      case 'READY':
        return {
          phase: 'Ready for Pickup',
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'bg-blue-500',
          progress: 60,
        };
      case 'PICKED_UP':
        return {
          phase: 'Out for Delivery',
          icon: <Truck className="h-5 w-5" />,
          color: 'bg-purple-500',
          progress: 80,
        };
      case 'DELIVERED':
        return {
          phase: 'Delivered!',
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'bg-green-500',
          progress: 100,
        };
      default:
        return {
          phase: estimate.status,
          icon: <Clock className="h-5 w-5" />,
          color: 'bg-gray-500',
          progress: 0,
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  // Calculate dynamic progress for prep phase
  const getPrepProgress = () => {
    if (estimate.status !== 'ACCEPTED' || !estimate.estimated_prep_minutes) {
      return null;
    }
    const elapsed = estimate.prep_elapsed_minutes || 0;
    const total = estimate.estimated_prep_minutes;
    return Math.min(100, Math.round((elapsed / total) * 100));
  };

  const prepProgress = getPrepProgress();

  // Format time display
  const formatTime = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return '--';
    if (minutes < 1) return '<1 min';
    if (minutes === 1) return '1 min';
    return `${Math.round(minutes)} mins`;
  };

  // Format ETA
  const formatETA = (isoString: string | null | undefined) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {phaseInfo.icon}
            {phaseInfo.phase}
          </span>
          {estimate.total_estimated_minutes !== null && estimate.total_estimated_minutes !== undefined && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {formatTime(estimate.total_estimated_minutes)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <Progress value={phaseInfo.progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Order Placed</span>
            <span>Preparing</span>
            <span>Ready</span>
            <span>Delivering</span>
            <span>Delivered</span>
          </div>
        </div>

        {/* Detailed Time Breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Prep Time Card */}
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ChefHat className="h-4 w-4" />
              Preparation
            </div>
            {estimate.status === 'ACCEPTED' && prepProgress !== null ? (
              <>
                <Progress value={prepProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(estimate.prep_elapsed_minutes)} elapsed</span>
                  <span>{formatTime(estimate.prep_remaining_minutes)} left</span>
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold">
                {estimate.prep_remaining_minutes === 0 
                  ? <span className="text-green-600">Done ✓</span>
                  : formatTime(estimate.estimated_prep_minutes)}
              </div>
            )}
          </div>

          {/* Delivery Time Card */}
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4" />
              Delivery
            </div>
            <div className="text-2xl font-bold">
              {estimate.delivery_remaining_minutes !== null && estimate.delivery_remaining_minutes !== undefined
                ? formatTime(estimate.delivery_remaining_minutes)
                : formatTime(estimate.estimated_delivery_minutes)}
            </div>
            {estimate.driver_distance_km && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {estimate.driver_distance_km.toFixed(1)} km away
              </div>
            )}
          </div>
        </div>

        {/* ETA */}
        {estimate.estimated_completion_time && estimate.status !== 'DELIVERED' && (
          <div className="text-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">Estimated arrival: </span>
            <span className="text-lg font-semibold">
              {formatETA(estimate.estimated_completion_time)}
            </span>
          </div>
        )}

        {/* Delivered Message */}
        {estimate.status === 'DELIVERED' && (
          <div className="text-center pt-2 border-t">
            <span className="text-lg font-semibold text-green-600">
              🎉 Your order has been delivered!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WaitTimeTracker;
