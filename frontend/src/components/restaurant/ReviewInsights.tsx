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
 * @component ReviewInsights
 * @description AI-powered review analysis and insights dashboard.
 * Features:
 * - Sentiment analysis of customer reviews
 * - Review trend tracking
 * - Common feedback patterns
 * - Menu item satisfaction scores
 * - Service quality metrics
 * - Customer satisfaction trends
 * - Review response suggestions
 * - Improvement recommendations
 * 
 * Uses natural language processing to provide actionable
 * insights from customer feedback.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Lightbulb, RefreshCw, Star, MessageSquare } from 'lucide-react';
import { reviewsApi } from '../../api/reviews';
import { Review, ReviewSummary } from '../../api/types';
import { useAuth } from '../../contexts/AuthContext'; // ✅ added

interface ReviewInsightsProps {
  cafeId?: number; // ✅ made optional, since we’ll rely on user context when needed
}

const ReviewInsights: React.FC<ReviewInsightsProps> = ({ cafeId }) => {
  const { user, isLoading: authLoading } = useAuth(); // ✅ access auth state
  const effectiveCafeId = cafeId ?? user?.cafe?.id; // ✅ fallback to context cafe id

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // ✅ Memoized fetch functions so useEffect dependencies stay stable
  const fetchReviews = useCallback(async (id: number) => {
    try {
      setLoadingReviews(true);
      console.log('loading reviews', id);
      const res = await reviewsApi.getReviews(id);
      setReviews(res?.data ?? []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  const fetchSummary = useCallback(async (id: number, force = false) => {
    try {
      setLoadingSummary(true);
      const res = await reviewsApi.getReviewSummary(id, force);
      setSummary(res?.data ?? null);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // ✅ Only trigger once AuthContext has loaded and cafeId is known
  useEffect(() => {
    if (!authLoading && effectiveCafeId) {
      fetchReviews(effectiveCafeId);
      fetchSummary(effectiveCafeId);
    }
  }, [authLoading, effectiveCafeId, fetchReviews, fetchSummary]);

  // ✅ Early guards
  if (authLoading) {
    return <p className="text-gray-500 italic">Loading user data...</p>;
  }

  if (!effectiveCafeId) {
    return <p className="text-gray-500 italic">Loading restaurant data...</p>;
  }

  if (loadingReviews && !reviews.length) {
    return <p className="text-gray-500 italic">Loading reviews...</p>;
  }

  // ---- computed stats ----
  const total = reviews.length;
  const avgRating = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const positive = total ? (reviews.filter(r => r.rating >= 4).length / total) * 100 : 0;
  const negative = total ? (reviews.filter(r => r.rating < 3).length / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="insights" className="w-full">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="reviews">All Reviews</TabsTrigger>
        </TabsList>

        {/* -------- AI INSIGHTS TAB -------- */}
        <TabsContent value="insights">
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                <CardTitle>AI Review Summary</CardTitle>
              </div>
              <button
                onClick={() => effectiveCafeId && fetchSummary(effectiveCafeId, true)}
                disabled={loadingSummary}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </CardHeader>

            <CardContent>
              {loadingSummary ? (
                <p className="text-gray-500 italic">Generating AI summary...</p>
              ) : summary ? (
                <>
                  <div className="text-gray-700 leading-relaxed mb-3">
                    {summary.summary.split('\n').map((line, idx) => {
                      // Handle headers
                      if (line.startsWith('### ')) {
                        return <h3 key={idx} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                      }
                      // Handle bullet points
                      if (line.trim().startsWith('- **')) {
                        const content = line.replace(/^- \*\*(.*?)\*\*(.*)/, '$1$2');
                        const [bold, rest] = content.split(/(?<=^[^:]+):/);
                        return (
                          <div key={idx} className="flex gap-2 mb-1">
                            <span>•</span>
                            <span><strong>{bold}:</strong>{rest}</span>
                          </div>
                        );
                      }
                      if (line.trim().startsWith('- ')) {
                        return (
                          <div key={idx} className="flex gap-2 mb-1">
                            <span>•</span>
                            <span>{line.replace('- ', '')}</span>
                          </div>
                        );
                      }
                      // Handle bold text
                      if (line.includes('**')) {
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p key={idx} className="mb-2">
                            {parts.map((part, i) => 
                              part.startsWith('**') ? 
                                <strong key={i}>{part.replace(/\*\*/g, '')}</strong> : 
                                part
                            )}
                          </p>
                        );
                      }
                      // Regular paragraphs
                      return line.trim() ? <p key={idx} className="mb-2">{line}</p> : null;
                    })}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <Badge variant="outline">Reviews: {summary.review_count}</Badge>
                    <Badge variant={summary.cached ? 'outline' : 'default'}>
                      {summary.cached ? 'Cached Result' : 'Freshly Generated'}
                    </Badge>
                    <Badge variant="secondary">Avg Rating: {avgRating.toFixed(1)} ★</Badge>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 italic">No summary available.</p>
              )}
            </CardContent>

            {/* <CardContent>
              {loadingSummary ? (
                <p className="text-gray-500 italic">Generating AI summary...</p>
              ) : summary ? (
                <>
                  <p className="text-gray-700 leading-relaxed mb-3">{summary.summary}</p>
                  <Separator className="my-3" />
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <Badge variant="outline">Reviews: {summary.review_count}</Badge>
                    <Badge variant={summary.cached ? 'outline' : 'default'}>
                      {summary.cached ? 'Cached Result' : 'Freshly Generated'}
                    </Badge>
                    <Badge variant="secondary">Avg Rating: {avgRating.toFixed(1)} ★</Badge>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 italic">No summary available.</p>
              )}
            </CardContent> */}
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Reviews</CardTitle>
                <CardDescription>Across all users</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{total}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Rating</CardTitle>
                <CardDescription>Out of 5</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {avgRating.toFixed(1)} <Star className="inline w-5 h-5 text-yellow-500" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Positive Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={positive} />
                <p className="text-sm mt-1">{positive.toFixed(0)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Negative Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={negative} />
                <p className="text-sm mt-1">{negative.toFixed(0)}%</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------- ALL REVIEWS TAB -------- */}
        <TabsContent value="reviews">
          {loadingReviews ? (
            <p className="text-gray-500 italic">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-gray-500 italic">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <CardTitle className="text-base">
                          {r.rating.toFixed(1)} / 5
                        </CardTitle>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-gray-700 text-sm flex gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <p>{r.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReviewInsights;

