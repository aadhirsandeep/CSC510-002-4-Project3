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

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { Order, OrderRegretData } from '../../App';
import { toast } from 'sonner';

interface PostOrderFeedbackProps {
  order: Order;
  onFeedbackSubmit: (orderId: string, regretData: OrderRegretData) => void;
}

const PostOrderFeedback: React.FC<PostOrderFeedbackProps> = ({
  order,
  onFeedbackSubmit
}) => {
  const [feedback, setFeedback] = useState<'satisfied' | 'regretted' | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (regretted: boolean) => {
    const regretData: OrderRegretData = {
      regretted,
      feedbackTimestamp: new Date()
    };

    onFeedbackSubmit(order.id, regretData);
    setSubmitted(true);
    
    if (regretted) {
      toast.info('Thank you for your feedback. We\'ll use this to provide better suggestions.');
    } else {
      toast.success('Great! We\'ll remember what works for you.');
    }
  };

  if (submitted || order.regretData) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              Thank you for your feedback! This helps us improve your experience.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          How do you feel about this order?
        </CardTitle>
        <CardDescription>
          Your honest feedback helps us provide better recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={feedback === 'satisfied' ? 'default' : 'outline'}
            onClick={() => {
              setFeedback('satisfied');
              handleSubmit(false);
            }}
            className="h-auto py-6 flex flex-col items-center gap-2"
          >
            <ThumbsUp className="h-8 w-8" />
            <div>
              <p className="font-medium">Satisfied</p>
              <p className="text-xs opacity-80">No regrets!</p>
            </div>
          </Button>

          <Button
            variant={feedback === 'regretted' ? 'destructive' : 'outline'}
            onClick={() => {
              setFeedback('regretted');
              setShowNotes(true);
            }}
            className="h-auto py-6 flex flex-col items-center gap-2"
          >
            <ThumbsDown className="h-8 w-8" />
            <div>
              <p className="font-medium">Regretted</p>
              <p className="text-xs opacity-80">Wish I hadn't</p>
            </div>
          </Button>
        </div>

        {showNotes && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                What made you regret this order? (Optional)
              </label>
              <Textarea
                placeholder="e.g., Too much food, unhealthy choice, emotional eating, too expensive..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button 
              onClick={() => handleSubmit(true)}
              className="w-full"
            >
              Submit Feedback
            </Button>
          </div>
        )}

        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Why we ask:</strong> Our AI learns from your feedback to predict when you might make a regrettable order and suggests healthier alternatives in those moments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostOrderFeedback;
