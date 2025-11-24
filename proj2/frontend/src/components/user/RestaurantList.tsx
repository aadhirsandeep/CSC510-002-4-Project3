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
 * @component RestaurantList
 * @description Client-side list of nearby restaurants with search, filter and
 * sorting facilities. Fetches cafes from the backend and renders compact cards
 * showing name, cuisine, address, phone (tel: link) and opening hours. Each
 * card links to the restaurant's menu for ordering.
 *
 * Features:
 * - Server-backed search (via `cafeApi.getCafes`) and client-side filtering by cuisine
 * - Displays address, contact phone (if provided by backend), and timings
 * - Clean card UI with quick "View Menu" action
 * - Graceful loading/error states and filter reset
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Filter, Phone as PhoneIcon, MapPin } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Cafe } from '../../api/types';
import { cafeApi } from '../../api/cafes';
const RestaurantList: React.FC = () => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [filteredCafes, setFilteredCafes] = useState<Cafe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Filter by cuisine (default: show all)
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Fetch from backend (server supports optional search term)
  useEffect(() => {
    let cancelled = false;
    const fetchCafes = async () => {
      setLoading(true);
      setError(null);
      const res = await cafeApi.getCafes(searchQuery ? searchQuery : undefined);
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
        setCafes([]);
        setFilteredCafes([]);
      } else {
        setCafes(res.data ?? []);
        setFilteredCafes(res.data ?? []);
      }
      setLoading(false);
    };
    fetchCafes();
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);
  // Local filter/sort
  useEffect(() => {
    let filtered = cafes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.address?.toLowerCase().includes(q) ?? false)
      );
    }
    if (selectedCuisine && selectedCuisine !== 'all') {
      // cafe.cuisine may not be present in the current TS type; guard via any cast
      filtered = filtered.filter(c => ((c as any).cuisine ?? '').toLowerCase() === selectedCuisine.toLowerCase());
    }
    switch (sortBy) {
      case 'active':
        filtered = [...filtered].sort((a, b) => Number(b.active) - Number(a.active));
        break;
      case 'name':
      default:
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    setFilteredCafes(filtered);
  }, [cafes, searchQuery, selectedCuisine, sortBy]);
  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading restaurants…</div>;
  }
  if (error) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-red-600">Failed to load restaurants: {error}</p>
        <Button variant="outline" onClick={() => setSearchQuery(q => q)}>
          Retry
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Restaurants Near You</h1>
        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search restaurants or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Select value={selectedCuisine} onValueChange={(v: any) => setSelectedCuisine(v)}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Cuisine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cuisines</SelectItem>
                <SelectItem value="Italian">Italian</SelectItem>
                <SelectItem value="Chinese">Chinese</SelectItem>
                <SelectItem value="Indian">Indian</SelectItem>
                <SelectItem value="Mexican">Mexican</SelectItem>
                <SelectItem value="American">American</SelectItem>
                <SelectItem value="Thai">Thai</SelectItem>
                <SelectItem value="Japanese">Japanese</SelectItem>
                <SelectItem value="Mediterranean">Mediterranean</SelectItem>
              </SelectContent>
            </Select>
            {/* <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Closed</SelectItem>
                <SelectItem value="active">Open First</SelectItem>
              </SelectContent>
            </Select> */}
          </div>
        </div>
      </div>
      {/* Restaurant Grid */}
      {filteredCafes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No restaurants found matching your criteria</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setSelectedCuisine('all');
              setSortBy('name');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCafes.map((cafe) => (
            <Card key={cafe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Smaller image/hero area to reduce card height */}
                <div className="relative h-36 md:h-44 overflow-hidden rounded-t">
                  {/* Replace with ImageWithFallback when images are available. Fixed height keeps cards compact. */}
                  {/* <ImageWithFallback
                    src={undefined}
                    alt={cafe.name}
                    className="w-full h-full object-cover"
                  /> */}
                  {/* Optional status badge */}
                  {/* <Badge className="absolute top-2 right-2 bg-background/90 text-foreground" variant={cafe.active ? 'default' : 'secondary'}>
                    {cafe.active ? 'Open' : 'Closed'}
                  </Badge> */}
                </div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg flex items-center gap-3">
                      {cafe.name}
                      <Badge variant="secondary" className="text-sm">{((cafe as any).cuisine) ?? '—'}</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {cafe.address || 'Address not available'}
                    </p>
                    {cafe.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4" />
                        <a href={`tel:${cafe.phone}`} className="underline">
                          {cafe.phone}
                        </a>
                      </p>
                    )}
                    {((cafe as any).timings) && (
                      <p className="text-sm text-muted-foreground">
                        Hours: {((cafe as any).timings)}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <Link to={`/menu/${cafe.id}`}>
                  <Button className="w-full">View Menu</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default RestaurantList;
