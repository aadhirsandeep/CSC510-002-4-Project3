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
 * @component CartPage
 * @description Shopping cart and checkout management system.
 * Features:
 * - Real-time cart updates
 * - Item quantity adjustment
 * - Split order functionality
 * - Delivery address management
 * - Payment method selection
 * - Order preview
 * - Calorie tracking
 * - Emotional state tracking
 * - Regret prediction
 * - Group ordering support
 * 
 * Integrates with EmotionalStateDialog and RegretPredictionEngine
 * to provide mindful ordering experience.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Plus, Minus, Trash2, Users, CreditCard, Clock, ArrowLeft } from 'lucide-react';
// import { User, CartItem, Restaurant, EmotionalData, Order } from '../../App';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';
import EmotionalStateDialog from './EmotionalStateDialog';
import { RegretPredictionEngine } from './RegretPredictionEngine';
import RegretWarning from './RegretWarning';
import { cartApi } from '../../api/cart';
import { ordersApi } from '../../api/orders';
import { User, Order } from '../../api/types';

interface Restaurant {
  id: string | number;
  name: string;
  description?: string;
  cuisine?: string;
  rating?: number;
  deliveryTime?: string;
  minimumOrder?: number;
  image?: string;
  ownerId?: string;
}

interface EmotionalData {
  emotion: string;
  intensity: number;
}

interface DeliveryAddress {
  street: string;
  apartment?: string;
  state: string;
  zipcode: string;
  country?: string;
}

interface UICartItem {
  id: number | string | null;
  menuItem: any;
  quantity: number;
  assignedTo?: string | null;
}

interface CartPageProps {
  user: User;
}

const CartPage: React.FC<CartPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<UICartItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: '',
    apartment: undefined,
    state: '',
    zipcode: '',
    country: 'United States'
  });
  // Use a per-user storage key so different logged-in users don't share the same saved address
  const storageKey = `delivery_address_${user?.email ?? user?.id ?? 'guest'}`;
  const [friends, setFriends] = useState<string[]>(['']);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [showEmotionalDialog, setShowEmotionalDialog] = useState(false);
  const [emotionalData, setEmotionalData] = useState<EmotionalData | null>(null);
  const [regretPrediction, setRegretPrediction] = useState<any>(null);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const res = await cartApi.getCartItems();
        if (res.error) {
          console.warn('Failed to load cart items:', res.error);
          setCart([]);
          return;
        }

        const rows = res.data || [];
        // Normalize items into { id: cartItemId, menuItem: {...}, quantity, assignedTo }
        const normalized = rows.map((r: any) => {
          const cartItemId = r.id ?? r.cart_item_id ?? r.cartId ?? null;
          const quantity = r.quantity ?? r.qty ?? 1;
          const assignedTo = r.assignee_email ?? r.assignee_email_address ?? null;

          // item metadata may be nested under 'item', 'menu_item', or provided flat
          const it = r.item ?? r.menu_item ?? r.menuItem ?? r;
          const menuItem = {
            id: it.id ?? it.item_id ?? it.menu_item_id,
            restaurantId: it.cafe_id ?? it.restaurantId ?? it.cafeId ?? String(it.cafe_id ?? ''),
            name: it.name ?? it.title ?? 'Item',
            description: it.description ?? '',
            price: it.price ?? 0,
            calories: it.calories ?? 0,
            ingredients: it.ingredients ?? [],
            category: it.category ?? 'Misc',
            isVegetarian: it.veg_flag ?? it.isVegetarian ?? false,
            isNonVeg: !!(it.isNonVeg ?? it.non_veg),
            servings: it.servings ?? 1,
            image: it.image ?? ''
          };

          return { id: cartItemId, menuItem, quantity, assignedTo };
        });

        setCart(normalized);

        if (normalized.length > 0) {
          const first = normalized[0].menuItem;
          setRestaurant({
            id: String(first.restaurantId),
            name: `Cafe ${first.restaurantId}`,
            description: '',
            cuisine: first.category || 'Various',
            rating: 4.5,
            deliveryTime: '30-45 min',
            minimumOrder: 10,
            image: first.image || '',
            ownerId: '1'
          });
        }
        // load saved delivery address (if any) for the current user
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            setDeliveryAddress({
              street: parsed.street || '',
              apartment: parsed.apartment || undefined,
              // ensure state is a string and strip digits/non-letter characters
              state: parsed.state ? String(parsed.state).replace(/[^A-Za-z\s-]/g, '') : '',
              // ensure zipcode contains only digits
              zipcode: String(parsed.zipcode || '').replace(/\D/g, ''),
              country: parsed.country || 'United States'
            });
          }
        } catch (e) {
          /* ignore */
        }
      } catch (err) {
        console.error('Error loading cart items', err);
        setCart([]);
      }
    };

    loadCart();
  // re-run when the logged-in user changes so we load their own saved address
  }, [user?.email]);

  const updateQuantity = async (cartItemId: number | string | null, change: number) => {
    try {
      // cartItemId should be the cart-item id provided by backend
      const existing = cart.find((c) => c.id === cartItemId);
      if (!existing) return;
      const newQuantity = Math.max(0, existing.quantity + change);

      if (newQuantity <= 0) {
        // remove
        const res = await cartApi.removeItem(Number(cartItemId));
        if (res.error) {
          toast.error(res.error);
          return;
        }
        setCart((c) => c.filter((it) => it.id !== cartItemId));
        toast.success('Item removed from cart');
        return;
      }

      const res = await cartApi.updateItemQuantity(Number(cartItemId), newQuantity);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      setCart((c) => c.map((it) => it.id === cartItemId ? { ...it, quantity: newQuantity } : it));
    } catch (err) {
      console.error('Failed to update quantity', err);
      toast.error('Failed to update quantity');
    }
  };

  const removeItem = async (cartItemId: number | string | null) => {
    try {
      const res = await cartApi.removeItem(Number(cartItemId));
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setCart((c) => c.filter(it => it.id !== cartItemId));
      toast.success('Item removed from cart');
    } catch (err) {
      console.error('Failed to remove item', err);
      toast.error('Failed to remove item');
    }
  };

  const assignToFriend = (cartItemId: number | string | null, friendEmail: string) => {
    // Local-only assignment for now; backend support can be added later
    setCart((c) => c.map((item) => (item.id === cartItemId ? { ...item, assignedTo: friendEmail || undefined } : item)));
  };

  const addFriendField = () => {
    setFriends([...friends, '']);
  };

  const updateFriend = (index: number, email: string) => {
    const newFriends = [...friends];
    newFriends[index] = email;
    setFriends(newFriends);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  };

  const getTotalCalories = () => {
    return cart.reduce((total, item) => total + (item.menuItem.calories * item.quantity), 0);
  };

  const getCaloriesForUser = (userEmail: string) => {
    return cart
      .filter(item => item.assignedTo === userEmail)
      .reduce((total, item) => total + (item.menuItem.calories * item.quantity), 0);
  };

  const getMyCalories = () => {
    return cart
      .filter(item => !item.assignedTo || item.assignedTo === user.email)
      .reduce((total, item) => total + (item.menuItem.calories * item.quantity), 0);
  };

  const initiateCheckout = () => {
    if (!restaurant) return;

    if (getTotalAmount() < (restaurant.minimumOrder ?? 0)) {
      toast.error(`Minimum order is ${restaurant.minimumOrder ?? 0}`);
      return;
    }

    // Show emotional state dialog before checkout
    setShowEmotionalDialog(true);
  };

  const handleEmotionalDataSubmit = (data: EmotionalData) => {
    setEmotionalData(data);
    setShowEmotionalDialog(false);

    // Run regret prediction
    const orders: Order[] = JSON.parse(localStorage.getItem('orders') || '[]');
    const engine = new RegretPredictionEngine(orders, user);
    const prediction = engine.predictRegret(
      data.emotion,
      data.intensity,
      cart,
      getTotalCalories()
    );
    
    setRegretPrediction(prediction);
  };

  const handleCheckout = async () => {
    if (!restaurant) return;

    try {
      const payload: any = { cafe_id: Number(restaurant.id) };
      // include structured delivery address when present
      if (deliveryAddress && deliveryAddress.street && deliveryAddress.state && deliveryAddress.zipcode) {
        payload.delivery_address = {
          street: deliveryAddress.street.trim(),
          apartment: deliveryAddress.apartment ? String(deliveryAddress.apartment).trim() : null,
          // ensure state is a trimmed string
          state: String(deliveryAddress.state).trim(),
          // ensure zipcode is numeric-only (string of digits)
          zipcode: String(deliveryAddress.zipcode).replace(/\D/g, '').trim(),
          country: deliveryAddress.country || 'United States'
        };
      }
      const res = await ordersApi.placeOrder(payload as any);
      if (res.error) {
        toast.error(res.error || 'Failed to place order');
        return;
      }
      const order = res.data;

      // Clear cart on successful order creation
      try {
        await cartApi.clearCart();
      } catch (e) {
        console.warn('Failed to clear cart on server', e);
      }
      setCart([]);

      // Optionally keep a local copy for demo/history
      try {
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        localStorage.setItem('orders', JSON.stringify([order, ...existingOrders]));
      } catch (e) {
        /* ignore */
      }

      toast.success('Order placed successfully!');
      if (order && order.id) {
        navigate(`/orders/${order.id}/track`);
      }
    } catch (err) {
      console.error('Checkout failed', err);
      toast.error('Failed to place order');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/restaurants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Restaurants
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Your Cart</h1>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <div className="space-y-4">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <CreditCard className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Your cart is empty</h3>
                <p className="text-muted-foreground">Add some delicious items to get started</p>
              </div>
              <Link to="/restaurants">
                <Button>Start Shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/restaurants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Restaurants
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Your Cart</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {restaurant?.name}
                <Badge variant="secondary">{restaurant?.cuisine}</Badge>
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {restaurant?.deliveryTime}
                </span>
                <span>Min order: ${restaurant?.minimumOrder}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery address <span className="text-rose-600">*</span></label>
                <Input
                  placeholder="Street address (required)"
                  value={deliveryAddress.street}
                  onChange={(e) => {
                    const upd = { ...deliveryAddress, street: e.target.value };
                    setDeliveryAddress(upd);
                    try { localStorage.setItem(storageKey, JSON.stringify(upd)); } catch (err) { /* ignore */ }
                  }}
                />
                <Input
                  placeholder="Apt / Suite (optional)"
                  value={deliveryAddress.apartment ?? ''}
                  onChange={(e) => {
                    const upd = { ...deliveryAddress, apartment: e.target.value || undefined };
                    setDeliveryAddress(upd);
                    try { localStorage.setItem(storageKey, JSON.stringify(upd)); } catch (err) { /* ignore */ }
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="State (required)"
                    value={deliveryAddress.state}
                    inputMode="text"
                    pattern="[A-Za-z\s-]*"
                    maxLength={50}
                    onChange={(e) => {
                      // strip any numeric or other unwanted characters; allow letters, spaces and hyphens
                      const raw = String(e.target.value || '');
                      const sanitized = raw.replace(/[^A-Za-z\s-]/g, '');
                      const upd = { ...deliveryAddress, state: sanitized };
                      setDeliveryAddress(upd);
                      try { localStorage.setItem(storageKey, JSON.stringify(upd)); } catch (err) { /* ignore */ }
                    }}
                  />
                  <Input
                    placeholder="Zipcode (required)"
                    value={deliveryAddress.zipcode}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      onChange={(e) => {
                        const raw = String(e.target.value || '');
                        const digits = raw.replace(/\D/g, '');
                        const upd = { ...deliveryAddress, zipcode: digits };
                        setDeliveryAddress(upd);
                        try { localStorage.setItem(storageKey, JSON.stringify(upd)); } catch (err) { /* ignore */ }
                      }}
                  />
                </div>
                <Input
                  placeholder="Country"
                  value={deliveryAddress.country ?? 'United States'}
                  disabled
                />
                {(
                  !deliveryAddress.street.trim() ||
                  !deliveryAddress.state.trim() ||
                  !deliveryAddress.zipcode.trim()
                ) && (
                  <p className="text-sm text-rose-600">Street, state and zipcode are required to place the order.</p>
                )}
              </div>
              {cart.map((item, index) => (
                <div key={`${item.id ?? item.menuItem.id}-${index}`} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0">
                      {/* <ImageWithFallback
                        src={item.menuItem.image}
                        alt={item.menuItem.name}
                        className="w-full h-full object-cover rounded"
                      /> */}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{item.menuItem.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.menuItem.calories} cal • ${item.menuItem.price}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id ?? item.menuItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id ?? item.menuItem.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            onClick={() => updateQuantity(item.id ?? item.menuItem.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="font-medium">
                          ${(item.menuItem.price * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      {/* Assign to Friend */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Select 
                          value={item.assignedTo || 'me'} 
                          onValueChange={(value) => assignToFriend(item.id ?? item.menuItem.id, value === 'me' ? '' : value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="me">For me</SelectItem>
                            {friends.filter(f => f).map((friend, idx) => (
                              <SelectItem key={idx} value={friend}>
                                {friend}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {index < cart.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Friends Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Add Friends & Family
              </CardTitle>
              <CardDescription>
                Add email addresses of friends/family to order for them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {friends.map((friend, index) => (
                <Input
                  key={index}
                  placeholder="Friend's email address"
                  value={friend}
                  onChange={(e) => updateFriend(index, e.target.value)}
                />
              ))}
              <Button variant="outline" onClick={addFriendField} className="w-full">
                Add Another Person
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          {/* Regret Prediction Warning */}
          {regretPrediction && (
            <RegretWarning prediction={regretPrediction} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${getTotalAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>$2.99</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${(getTotalAmount() * 0.08).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>${(getTotalAmount() + 2.99 + (getTotalAmount() * 0.08)).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Calorie Breakdown</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Your calories:</span>
                    <span>{getMyCalories()} cal</span>
                  </div>
                  {friends.filter(f => f).map((friend, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{friend}:</span>
                      <span>{getCaloriesForUser(friend)} cal</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total calories:</span>
                    <span>{getTotalCalories()} cal</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="cash">Cash on Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!emotionalData ? (
                <Button 
                  className="w-full" 
                  onClick={initiateCheckout}
                  disabled={
                    !restaurant ||
                    getTotalAmount() < (restaurant?.minimumOrder ?? 0) ||
                    !(
                      deliveryAddress &&
                      deliveryAddress.street.trim().length > 0 &&
                      deliveryAddress.state.trim().length > 0 &&
                      deliveryAddress.zipcode.trim().length > 0
                    )
                  }
                >
                  {!restaurant || getTotalAmount() < (restaurant?.minimumOrder ?? 0)
                    ? `Add ${(Math.max(0, (restaurant?.minimumOrder ?? 0) - getTotalAmount())).toFixed(2)} more`
                    : ((!deliveryAddress || !deliveryAddress.street.trim() || !deliveryAddress.state.trim() || !deliveryAddress.zipcode.trim()) ? 'Enter delivery address' : 'Continue to Checkout')
                  }
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handleCheckout}
                >
                  Confirm Order
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                You'll need to pick up your order from the restaurant
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Emotional State Dialog */}
      <EmotionalStateDialog
        open={showEmotionalDialog}
        onClose={() => setShowEmotionalDialog(false)}
        onSubmit={handleEmotionalDataSubmit}
      />
    </div>
  );
};

export default CartPage;