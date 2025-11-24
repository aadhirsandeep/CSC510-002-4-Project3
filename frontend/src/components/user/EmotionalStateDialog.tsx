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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Smile, Frown, Angry, AlertCircle, Zap, XCircle } from 'lucide-react';
import { EmotionalState, EmotionalData } from '../../App';

interface EmotionalStateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (emotionalData: EmotionalData) => void;
}

const EmotionalStateDialog: React.FC<EmotionalStateDialogProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState | null>(null);
  const [intensity, setIntensity] = useState<number>(3);

  const emotions: { type: EmotionalState; label: string; icon: any; color: string; bgColor: string }[] = [
    { 
      type: 'happiness', 
      label: 'Happy', 
      icon: Smile, 
      color: 'text-green-600',
      bgColor: 'bg-green-100 hover:bg-green-200 border-green-300'
    },
    { 
      type: 'sadness', 
      label: 'Sad', 
      icon: Frown, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 hover:bg-blue-200 border-blue-300'
    },
    { 
      type: 'anger', 
      label: 'Angry', 
      icon: Angry, 
      color: 'text-red-600',
      bgColor: 'bg-red-100 hover:bg-red-200 border-red-300'
    },
    { 
      type: 'fear', 
      label: 'Anxious', 
      icon: AlertCircle, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 hover:bg-purple-200 border-purple-300'
    },
    { 
      type: 'surprise', 
      label: 'Surprised', 
      icon: Zap, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300'
    },
    { 
      type: 'disgust', 
      label: 'Stressed', 
      icon: XCircle, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 hover:bg-orange-200 border-orange-300'
    }
  ];

  const handleSubmit = () => {
    if (!selectedEmotion) return;

    const now = new Date();
    const emotionalData: EmotionalData = {
      emotion: selectedEmotion,
      intensity,
      timeOfDay: now.toTimeString().slice(0, 5),
      hour: now.getHours(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      timestamp: now
    };

    onSubmit(emotionalData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How are you feeling right now?</DialogTitle>
          <DialogDescription>
            This helps us understand your ordering patterns and provide better recommendations in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Emotion Selection */}
          <div className="space-y-3">
            <Label>Select your current emotion</Label>
            <div className="grid grid-cols-3 gap-3">
              {emotions.map((emotion) => {
                const Icon = emotion.icon;
                const isSelected = selectedEmotion === emotion.type;
                
                return (
                  <button
                    key={emotion.type}
                    onClick={() => setSelectedEmotion(emotion.type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? `${emotion.bgColor} border-current ring-2 ring-offset-2 ring-current` 
                        : 'bg-muted hover:bg-muted/80 border-border'
                    }`}
                  >
                    <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? emotion.color : 'text-muted-foreground'}`} />
                    <p className={`text-xs font-medium ${isSelected ? emotion.color : 'text-muted-foreground'}`}>
                      {emotion.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity Slider */}
          {selectedEmotion && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Intensity</Label>
                <span className="text-sm font-medium">{intensity}/5</span>
              </div>
              <Slider
                value={[intensity]}
                onValueChange={(value) => setIntensity(value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Strong</span>
              </div>
            </div>
          )}

          {/* Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Privacy Note:</strong> This data is stored locally on your device and helps our AI predict when you might regret an order, allowing us to suggest healthier alternatives.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedEmotion}
              className="flex-1"
            >
              Continue to Checkout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmotionalStateDialog;
