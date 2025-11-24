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
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Star, ThumbsUp, DollarSign, Utensils } from 'lucide-react';
import { Order, Review, User } from '../../App';
import { toast } from 'sonner';

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  user: User;
  onReviewSubmit: (review: Review) => void;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onClose,
  order,
  user,
  onReviewSubmit
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [foodQuality, setFoodQuality] = useState(0);
  const [serviceQuality, setServiceQuality] = useState(0);
  const [valueForMoney, setValueForMoney] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    'Taste',
    'Portion Size',
    'Packaging',
    'Temperature',
    'Freshness',
    'Presentation',
    'Value',
    'Speed'
  ];

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Please write at least 10 characters in your review');
      return;
    }

    const review: Review = {
      id: `review-${Date.now()}`,
      orderId: order.id,
      userId: user.id,
      userName: user.name,
      restaurantId: order.restaurantId,
      rating,
      comment: comment.trim(),
      foodQuality: foodQuality || rating,
      serviceQuality: serviceQuality || rating,
      valueForMoney: valueForMoney || rating,
      categories: selectedCategories,
      createdAt: new Date()
    };

    onReviewSubmit(review);
    toast.success('Thank you for your review!');
    onClose();
  };

  const StarRating = ({ 
    value, 
    onChange, 
    label, 
    icon: Icon 
  }: { 
    value: number; 
    onChange: (val: number) => void; 
    label: string;
    icon?: any;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <Label>{label}</Label>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => label === 'Overall Rating' && setHoverRating(star)}
            onMouseLeave={() => label === 'Overall Rating' && setHoverRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (label === 'Overall Rating' ? (hoverRating || value) : value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {value > 0 ? `${value}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Your Order</DialogTitle>
          <DialogDescription>
            Your feedback helps us and the restaurant improve
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Rating */}
          <StarRating
            value={rating}
            onChange={setRating}
            label="Overall Rating"
          />

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StarRating
              value={foodQuality}
              onChange={setFoodQuality}
              label="Food Quality"
              icon={Utensils}
            />
            <StarRating
              value={serviceQuality}
              onChange={setServiceQuality}
              label="Service"
              icon={ThumbsUp}
            />
            <StarRating
              value={valueForMoney}
              onChange={setValueForMoney}
              label="Value"
              icon={DollarSign}
            />
          </div>

          {/* Category Tags */}
          <div className="space-y-2">
            <Label>What stood out? (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Your Review</Label>
            <Textarea
              placeholder="Share your experience... What did you like or dislike?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/500 characters (min 10)
            </p>
          </div>

          {/* Order Details Reference */}
          <div className="bg-muted rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Order Details</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Order #{order.id}</p>
              <p>{order.items.length} items • ${order.totalAmount.toFixed(2)}</p>
              <p>{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || comment.trim().length < 10}
              className="flex-1"
            >
              Submit Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
