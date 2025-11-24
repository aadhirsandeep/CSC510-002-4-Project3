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
 * @component MenuPage
 * @description Interactive restaurant menu browsing interface.
 * Features:
 * - Menu item search and filtering
 * - Category organization
 * - Calorie-aware suggestions
 * - Item customization options
 * - Dietary preference filters
 * - Nutritional information display
 * - Popular items highlight
 * - AI-powered recommendations
 * - Price and portion details
 * 
 * Integrates with FoodSuggestions for personalized
 * menu recommendations based on user preferences.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Minus, Search, Star, Clock, Leaf, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';
import { Restaurant, MenuItem, CartItem, User } from '../../App';
import { itemsApi } from '../../api/items';
import { getReviews } from '../../api/reviews';
import { getCafe as getCafeApi } from '../../api/cafes';
import { cartApi } from '../../api/cart';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';
import FoodSuggestions from './FoodSuggestions';

const MenuPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [userRatingsCount, setUserRatingsCount] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);

  useEffect(() => {
    // Load cart from server
    (async () => {
      try {
        const cartRes = await cartApi.getCartItems();
        if (!cartRes.error && cartRes.data) {
          const normalized = cartRes.data.map((r: any) => ({
            id: r.id,
            menuItem: r.item || r.menu_item || r.menuItem || r,
            quantity: r.quantity || 1,
            assignedTo: r.assignee_email || r.assignee_email_address || null
          }));
          setCart(normalized);
        }
      } catch (err) {
        console.debug('Failed to load cart from server', err);
      }
    })();

    // Load user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Calculate today's calories from orders
    const orders = localStorage.getItem('orders');
    if (orders) {
      const parsedOrders = JSON.parse(orders);
      const today = new Date().toDateString();
      const todayOrders = parsedOrders.filter((order: any) => 
        new Date(order.createdAt).toDateString() === today
      );
      const totalCalories = todayOrders.reduce((sum: number, order: any) => 
        sum + (order.totalCalories || 0), 0
      );
      setTodayCalories(totalCalories);
    }
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    const load = async () => {
      try {
        // Fetch items for the cafe (public endpoint)
        const res = await itemsApi.getCafeItems(Number(restaurantId));
        const items: MenuItem[] = res.error ? [] : (res.data || []);
        setMenuItems(items as MenuItem[]);

        // derive a fallback cuisine from the first item if available (do not default to 'Various')
        const fallbackCuisine = items && items.length > 0 ? (items[0].category || undefined) : undefined;
        const fallbackRestaurant: Restaurant = {
          id: restaurantId,
          name: `Cafe ${restaurantId}`,
          description: '',
          cuisine: fallbackCuisine as any,
          rating: 4.5,
          deliveryTime: '30-45 min',
          minimumOrder: 10,
          image: items && items.length > 0 ? (items[0].image || '') : '',
          ownerId: '1'
        } as unknown as Restaurant;

        // Try to fetch authoritative cafe metadata from backend; prefer its cuisine
        try {
          // Use the frontend API helper so the request goes to the configured backend base URL
          const cafeRes = await getCafeApi(Number(restaurantId));
          if (!cafeRes.error && cafeRes.data) {
            const cafeJson: any = cafeRes.data;
            const merged: Restaurant = {
              id: String(cafeJson.id),
              name: cafeJson.name || fallbackRestaurant.name,
              description: cafeJson.description || fallbackRestaurant.description,
              cuisine: cafeJson.cuisine ?? fallbackRestaurant.cuisine,
              rating: cafeJson.rating ?? fallbackRestaurant.rating,
              deliveryTime: cafeJson.deliveryTime || fallbackRestaurant.deliveryTime,
              minimumOrder: cafeJson.minimumOrder ?? fallbackRestaurant.minimumOrder,
              //image: cafeJson.image || fallbackRestaurant.image,
              address: cafeJson.address || undefined,
              ownerId: cafeJson.owner_id ?? cafeJson.ownerId ?? fallbackRestaurant.ownerId
            } as unknown as Restaurant;
            setRestaurant(merged);
            // fetch reviews and update rating based on user reviews
            try {
              const revRes = await getReviews(Number(merged.id));
              if (!revRes.error && revRes.data) {
                if (revRes.data.length > 0) {
                  const ratings = revRes.data.map((r: any) => Number(r.rating) || 0);
                  const avg = ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length;
                  setRestaurant((prev: Restaurant | null) => prev ? { ...prev, rating: Number(avg.toFixed(2)) } : prev);
                  setUserRatingsCount(revRes.data.length);
                } else {
                  // reviews fetched but none exist
                  setUserRatingsCount(0);
                }
              }
            } catch (err) {
              // ignore review fetch errors and leave userRatingsCount as null
            }
            return;
          }
        } catch (err) {
          // ignore and fall through to fallback
        }

        // fallback when cafe endpoint not available
        setRestaurant(fallbackRestaurant);
        // try to compute rating from reviews even if cafe metadata endpoint is missing
        try {
          const revRes = await getReviews(Number(restaurantId));
          if (!revRes.error && revRes.data) {
            if (revRes.data.length > 0) {
              const ratings = revRes.data.map((r: any) => Number(r.rating) || 0);
              const avg = ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length;
              setRestaurant((prev: Restaurant | null) => prev ? { ...prev, rating: Number(avg.toFixed(2)) } : prev);
              setUserRatingsCount(revRes.data.length);
            } else {
              setUserRatingsCount(0);
            }
          }
        } catch (err) {
          // ignore
        }
      } catch (err) {
        console.error('Error loading cafe items', err);
        setMenuItems([]);
      }
    };

    load();
  }, [restaurantId]);

  // Debug: log cafe metadata when it's loaded/updated (name, id, cuisine)
  useEffect(() => {
    if (restaurant) {
      console.debug(`[debug] Cafe loaded: ${restaurant.name} (id: ${restaurant.id}) - cuisine: ${restaurant.cuisine}`);
    }
  }, [restaurant]);

  useEffect(() => {
    let filtered = menuItems;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.ingredients?.some((ing: string) => String(ing).toLowerCase().includes(q)) ?? false)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  }, [menuItems, searchQuery, selectedCategory]);

  const categories = ['all', ...Array.from(new Set(menuItems.map(item => item.category)))];

  const getItemQuantityInCart = (itemId: string): number => {
  const cartItem = cart.find(item => String(item.menuItem.id) === String(itemId));
  return cartItem ? cartItem.quantity : 0;
  };

  const addToCart = (menuItem: MenuItem) => {
    (async () => {
      try {
        // Check if cart already contains items from another restaurant
        if (cart.length > 0) {
          const existingRestaurantId = String(cart[0].menuItem.restaurantId ?? cart[0].menuItem.cafe_id ?? cart[0].menuItem.cafeId ?? '');
          const newRestaurantId = String(menuItem.cafe_id ?? menuItem.cafeId ?? menuItem.restaurantId ?? '');
          if (existingRestaurantId && newRestaurantId && existingRestaurantId !== newRestaurantId) {
            toast.error('Your cart contains items from another restaurant. Please clear your cart before adding items from a different restaurant.');
            return;
          }
        }

        console.debug('[ui] addToCart called', menuItem);
        const payload = { item_id: Number(menuItem.id), quantity: 1 };
        const res = await cartApi.addToCart(payload as any);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        // refresh cart items from server and dedupe
        const cartRes = await cartApi.getCartItems();
        if (!cartRes.error && cartRes.data) {
          const normalized = cartRes.data.map((r: any) => ({
            id: r.id,
            menuItem: r.item || r.menu_item || r.menuItem || r,
            quantity: r.quantity || 1,
            assignedTo: r.assignee_email || r.assignee_email_address || null
          }));
          setCart(normalized);
        }
        toast.success(`${menuItem.name} added to cart`);
      } catch (err) {
        console.error('addToCart failed', err);
        toast.error('Failed to add to cart');
      }
    })();
  };

  const removeFromCart = async (itemId: string) => {
    try {
      // find server cart item id for this menu item
      const cartEntry = cart.find((c) => String(c.menuItem.id) === String(itemId));
      if (!cartEntry) return;
      const cartItemId = cartEntry.id;

      if (!cartItemId) {
        // fallback to local removal
        const existingItemIndex = cart.findIndex(item => item.menuItem.id === itemId);
        if (existingItemIndex === -1) return;
        let newCart = [...cart];
        if (newCart[existingItemIndex].quantity > 1) {
          newCart[existingItemIndex].quantity -= 1;
        } else {
          newCart.splice(existingItemIndex, 1);
        }
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        return;
      }

      // decrement via backend
      const newQty = Math.max(0, (cartEntry.quantity || 1) - 1);
      if (newQty <= 0) {
        await cartApi.removeItem(Number(cartItemId));
      } else {
        await cartApi.updateItemQuantity(Number(cartItemId), newQty);
      }

      // refresh cart from server
      const cartRes = await cartApi.getCartItems();
      if (!cartRes.error && cartRes.data) {
        const normalized = cartRes.data.map((r: any) => ({
          id: r.id,
          menuItem: r.item || r.menu_item || r.menuItem || r,
          quantity: r.quantity || 1,
          assignedTo: r.assignee_email || r.assignee_email_address || null
        }));
        setCart(normalized);
      }
    } catch (err) {
      console.error('Failed to remove from cart', err);
      toast.error('Failed to update cart');
    }
  };

  const getTotalCartItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Restaurant Header */}
      <div className="relative">
        <div className="aspect-[3/1] relative rounded-lg overflow-hidden">
          {/* <ImageWithFallback
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          /> */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <p className="text-lg opacity-90">{restaurant.description}</p>
              <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                {userRatingsCount === 0 ? (
                  <span className="text-sm text-muted-foreground">No user reviews available</span>
                ) : (
                  <span>{restaurant.rating}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* <Clock className="h-5 w-5" />
                <span>{restaurant.deliveryTime}</span> */}
              </div>
              {/* <Badge variant="secondary">{restaurant.cuisine}</Badge> */}
              {/* <Link to={`/restaurant/${restaurantId}/reviews`}>
                <Button variant="secondary" size="sm" className="gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Reviews
                </Button>
              </Link> */}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showSuggestions ? "default" : "outline"}
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {showSuggestions ? 'Hide' : 'Show'} Suggestions
        </Button>
        {getTotalCartItems() > 0 && (
          <Link to="/cart">
            <Button className="flex items-center gap-2">
              View Cart ({getTotalCartItems()})
            </Button>
          </Link>
        )}
      </div>

      {/* AI Food Suggestions */}
      {showSuggestions && user && (
        <FoodSuggestions
          user={user}
          menuItems={menuItems}
          currentCaloriesToday={todayCalories}
          restaurantsById={{ [restaurantId || '']: restaurant }}
        />
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {category === 'all' ? 'All' : category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No items found in this category</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredItems.map((item) => {
                  const quantityInCart = getItemQuantityInCart(item.id);
                  
                  return (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="flex">
                        <div className="w-32 h-32 flex-shrink-0">
                          {/* <ImageWithFallback
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          /> */}
                        </div>
                        <div className="flex-1 p-4">
                          <CardHeader className="p-0 space-y-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                              <div className="flex gap-1">
                                {item.isVegetarian && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <Leaf className="h-3 w-3 mr-1" />
                                    Veg
                                  </Badge>
                                )}
                                {item.isNonVeg && (
                                  <Badge variant="outline" className="text-red-600 border-red-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Non-Veg
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CardDescription className="text-sm">
                              {item.description}
                            </CardDescription>
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="font-semibold text-lg">${item.price}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.calories} cal • {item.servings} serving{item.servings > 1 ? 's' : ''}
                                </p>
                              </div>
                              
                              {quantityInCart === 0 ? (
                                <Button
                                  onClick={() => addToCart(item)}
                                  size="sm"
                                  className="ml-2"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">
                                    {quantityInCart}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => addToCart(item)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Minimum Order Warning */}
      {cart.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm">
                Minimum order: ${restaurant.minimumOrder}
                {cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0) < restaurant.minimumOrder && (
                  <span className="text-amber-700 ml-1">
                    - Add ${(restaurant.minimumOrder - cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0)).toFixed(2)} more
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MenuPage;