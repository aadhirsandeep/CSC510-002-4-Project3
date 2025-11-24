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
 * @component Analytics
 * @description Advanced business analytics and reporting dashboard.
 * Features:
 * - Revenue tracking and forecasting
 * - Sales trend analysis
 * - Menu item performance metrics
 * - Customer behavior insights
 * - Peak hour identification
 * - Seasonal trend analysis
 * - Inventory optimization suggestions
 * - Profit margin calculations
 * - Customer retention metrics
 * 
 * Uses Recharts for data visualization and provides
 * actionable business intelligence insights.
 */

import React, { useEffect, useState } from "react";
import { getCafeAnalytics, CafeAnalytics } from "../../api/analytics";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent } from "../../components/ui/card";
import { Loader2, TrendingUp, ShoppingBag, DollarSign, Coffee } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<CafeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.cafe?.id) return;

    setLoading(true);
    getCafeAnalytics(user.cafe.id)
      .then((res) => setData(res.data ?? null))
      .catch((err) => {
        setError("Failed to load analytics");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading analytics...
      </div>
    );

  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!data) return <div className="text-gray-500 text-center">No analytics data available.</div>;

  // === Derived Metrics ===
  const totalRevenue = data.revenue_per_day.reduce((sum, [, rev]) => sum + rev, 0);
  const totalOrders = data.orders_per_day.reduce((sum, [, count]) => sum + count, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Format chart data
  const chartData = data.revenue_per_day.map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue,
  }));

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-500">Insights into your cafe’s performance</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <h2 className="text-2xl font-semibold">${totalRevenue.toFixed(2)}</h2>
            </div>
            <DollarSign className="text-green-500 w-8 h-8" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Accepted Orders</p>
              <h2 className="text-2xl font-semibold">{totalOrders}</h2>
            </div>
            <ShoppingBag className="text-blue-500 w-8 h-8" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Order Value</p>
              <h2 className="text-2xl font-semibold">${avgOrderValue.toFixed(2)}</h2>
            </div>
            <TrendingUp className="text-purple-500 w-8 h-8" />
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">No revenue data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Top Items */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Coffee className="w-5 h-5" /> Top Selling Items
          </h3>
          <ul className="space-y-2">
            {data.top_items.length > 0 ? (
              data.top_items.map(([name, qty], i) => (
                <li
                  key={i}
                  className="flex justify-between items-center border-b pb-2 text-gray-700"
                >
                  <span>
                    {i + 1}. {name}
                  </span>
                  <span className="font-medium">{qty} sold</span>
                </li>
              ))
            ) : (
              <p className="text-gray-500 text-center">No top items data.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;