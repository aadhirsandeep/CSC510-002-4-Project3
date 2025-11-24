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

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, AlertCircle, Info, Lightbulb } from 'lucide-react';
import { RegretPrediction } from './RegretPredictionEngine';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

interface RegretWarningProps {
  prediction: RegretPrediction;
}

const RegretWarning: React.FC<RegretWarningProps> = ({ prediction }) => {
  const getRiskConfig = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: '⚠️ High Risk of Regret',
          description: 'Based on your history, you might regret this order'
        };
      case 'medium':
        return {
          icon: AlertCircle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          title: '⚡ Moderate Risk of Regret',
          description: 'Consider these suggestions before ordering'
        };
      case 'low':
        return {
          icon: Info,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: '✓ Low Risk',
          description: 'This order aligns well with your patterns'
        };
    }
  };

  const config = getRiskConfig(prediction.riskLevel);
  const Icon = config.icon;

  // Don't show anything for low risk with low confidence
  if (prediction.riskLevel === 'low' && prediction.confidence < 50) {
    return null;
  }

  return (
    <Card className={`${config.borderColor} ${config.bgColor}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <CardTitle className="text-lg">{config.title}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {prediction.confidence}% confidence
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Regret Risk Score</span>
            <span className={config.color}>{prediction.riskScore}/100</span>
          </div>
          <Progress 
            value={prediction.riskScore} 
            className="h-2"
          />
        </div>

        {/* Reasons */}
        {prediction.reasons.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Why we're flagging this:
            </h4>
            <ul className="space-y-1.5">
              {prediction.reasons.map((reason, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className={`${config.color} mt-0.5`}>•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {prediction.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-1">
              <Lightbulb className="h-4 w-4" />
              Suggestions:
            </h4>
            <ul className="space-y-1.5">
              {prediction.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Additional Info for High Risk */}
        {prediction.riskLevel === 'high' && (
          <Alert className="bg-white border-red-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Take a moment</AlertTitle>
            <AlertDescription className="text-xs">
              Our AI has learned from your past orders. Take a 10-minute break, drink some water, and see if you still want this order. You can always come back!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default RegretWarning;
