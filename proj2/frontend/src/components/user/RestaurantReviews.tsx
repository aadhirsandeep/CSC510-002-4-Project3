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

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Star, ArrowLeft, TrendingUp, Users, Award } from 'lucide-react';
import { Review, Restaurant } from '../../App';

const RestaurantReviews: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    // Load reviews
    const allReviews: Review[] = JSON.parse(localStorage.getItem('reviews') || '[]');
    const restaurantReviews = allReviews.filter(r => r.restaurantId === restaurantId);
    setReviews(restaurantReviews);

    // Load restaurant info (mock data)
    const mockRestaurant: Restaurant = {
      id: restaurantId,
      name: 'Pizza Palace',
      description: 'Authentic Italian pizzas',
      cuisine: 'Italian',
      rating: 4.8,
      deliveryTime: '25-35 min',
      minimumOrder: 15,
      image: '',
      ownerId: '2'
    };
    setRestaurant(mockRestaurant);
  }, [restaurantId]);

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      dist[r.rating as keyof typeof dist]++;
    });
    return dist;
  };

  const getAverageScore = (field: 'foodQuality' | 'serviceQuality' | 'valueForMoney') => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r[field], 0);
    return (sum / reviews.length).toFixed(1);
  };

  const distribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/menu/${restaurantId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">{restaurant?.name}</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{getAverageRating()}</span>
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              from {reviews.length} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Food Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{getAverageScore('foodQuality')}</span>
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{getAverageScore('serviceQuality')}</span>
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{getAverageScore('valueForMoney')}</span>
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{star}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <Progress
                  value={reviews.length > 0 ? (distribution[star as keyof typeof distribution] / reviews.length) * 100 : 0}
                  className="flex-1 h-2"
                />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {distribution[star as keyof typeof distribution]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium">Customer Reviews</h2>
        
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No reviews yet</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to review this restaurant!
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{review.userName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Detailed Scores */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Food:</span>
                      <span className="font-medium">{review.foodQuality}/5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="font-medium">{review.serviceQuality}/5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Value:</span>
                      <span className="font-medium">{review.valueForMoney}/5</span>
                    </div>
                  </div>

                  {/* Categories */}
                  {review.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {review.categories.map((category) => (
                        <Badge key={category} variant="secondary" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Comment */}
                  <p className="text-sm leading-relaxed">{review.comment}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RestaurantReviews;
