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
 * @component EmotionalInsights
 * @description Analyzes and displays user's emotional eating patterns and provides insights.
 * Features:
 * - Tracks emotional state during ordering
 * - Visualizes correlations between emotions and food choices
 * - Identifies potential emotional eating triggers
 * - Provides mindful eating recommendations
 * - Historical emotional state tracking
 * 
 * Works in conjunction with EmotionalStateDialog and RegretPredictionEngine
 * to provide a comprehensive emotional awareness system for users.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Brain, TrendingDown, TrendingUp, Clock, Calendar, AlertTriangle, Smile, Info } from 'lucide-react';
import { User, Order } from '../../App';
import { RegretPredictionEngine } from './RegretPredictionEngine';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

interface EmotionalInsightsProps {
  user: User;
}

const EmotionalInsights: React.FC<EmotionalInsightsProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [patterns, setPatterns] = useState<any[]>([]);

  useEffect(() => {
    const savedOrders: Order[] = JSON.parse(localStorage.getItem('orders') || '[]');
    const ordersWithData = savedOrders.filter(o => o.emotionalData && o.regretData);
    setOrders(ordersWithData);

    if (ordersWithData.length > 0) {
      const engine = new RegretPredictionEngine(ordersWithData, user);
      setStats(engine.getStatistics());
      setPatterns(engine.getRegretPatterns());
    }
  }, [user]);

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: { [key: string]: string } = {
      happiness: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😰',
      surprise: '😮',
      disgust: '😣'
    };
    return emojiMap[emotion] || '😐';
  };

  const getEmotionColor = (emotion: string) => {
    const colorMap: { [key: string]: string } = {
      happiness: 'text-green-600',
      sadness: 'text-blue-600',
      anger: 'text-red-600',
      fear: 'text-purple-600',
      surprise: 'text-yellow-600',
      disgust: 'text-orange-600'
    };
    return colorMap[emotion] || 'text-gray-600';
  };

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Emotional Insights</h1>
          <p className="text-muted-foreground">Understand your ordering patterns and emotions</p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Start Tracking Your Emotions</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Place orders and provide feedback to see personalized insights about your emotional eating patterns.
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/restaurants">Start Ordering</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Emotional Insights</h1>
        </div>
        <p className="text-muted-foreground">AI-powered analysis of your ordering patterns and emotions</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">with emotional data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regretted Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.regrettedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.overallRegretRate ? `${Math.round(stats.overallRegretRate * 100)}%` : '0%'} regret rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Satisfied Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.satisfiedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">no regrets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{stats?.dataQuality || 'Limited'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.dataQuality === 'good' ? '10+ orders' : stats?.dataQuality === 'fair' ? '5-9 orders' : '< 5 orders'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regret Progress */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>Overall regret rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Regret Rate</span>
                <span className={`text-sm font-medium ${
                  stats.overallRegretRate > 0.5 ? 'text-red-600' : 
                  stats.overallRegretRate > 0.3 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {Math.round(stats.overallRegretRate * 100)}%
                </span>
              </div>
              <Progress 
                value={stats.overallRegretRate * 100} 
                className="h-3"
              />
              <p className="text-xs text-muted-foreground">
                {stats.overallRegretRate < 0.3 ? 
                  '🎉 Great job! You\'re making mindful food choices.' :
                  stats.overallRegretRate < 0.5 ?
                  '👍 You\'re doing okay. Keep paying attention to your emotional state.' :
                  '⚠️ Consider reviewing patterns below to improve decision-making.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Emotional Patterns & Regret Rates
          </CardTitle>
          <CardDescription>
            Which emotions lead to regrettable orders?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patterns.map((pattern, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getEmotionEmoji(pattern.emotionalState)}</span>
                    <div>
                      <p className={`font-medium capitalize ${getEmotionColor(pattern.emotionalState)}`}>
                        {pattern.emotionalState}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pattern.totalOrders} orders • {pattern.regrettedOrders} regretted
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      pattern.regretRate > 0.6 ? 'destructive' :
                      pattern.regretRate > 0.3 ? 'secondary' : 'default'
                    }>
                      {Math.round(pattern.regretRate * 100)}% regret
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={pattern.regretRate * 100} 
                  className="h-2"
                />
                {pattern.regretRate > 0.5 && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5" />
                    <span>High regret rate - consider waiting or choosing healthier options when feeling {pattern.emotionalState}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders with Emotions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Emotional Data
          </CardTitle>
          <CardDescription>Your last 10 orders with emotional tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.slice(0, 10).map((order, index) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getEmotionEmoji(order.emotionalData!.emotion)}</span>
                  <div>
                    <p className="text-sm font-medium">
                      {order.emotionalData?.timeOfDay} • {order.emotionalData?.dayOfWeek}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.totalCalories} cal • ${order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${getEmotionColor(order.emotionalData!.emotion)}`}>
                    {order.emotionalData?.emotion}
                  </Badge>
                  {order.regretData?.regretted ? (
                    <Badge variant="destructive" className="text-xs">
                      Regretted
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      Satisfied
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips Based on Patterns */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-purple-600" />
            Personalized Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.overallRegretRate > 0.4 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm">
                  Your regret rate is above average. Try waiting 10 minutes before ordering when feeling strong emotions.
                </p>
              </div>
            )}
            {patterns.find(p => ['sadness', 'anger', 'disgust'].includes(p.emotionalState) && p.regretRate > 0.5) && (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm">
                  You tend to regret orders when feeling negative emotions. Consider having healthier comfort foods readily available.
                </p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">
                Continue tracking your emotions to get more accurate predictions and better recommendations!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmotionalInsights;
