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
 * @component MenuManagement
 * @description Comprehensive menu and item management system.
 * Features:
 * - Menu item CRUD operations
 * - Category management
 * - Price and portion control
 * - Nutritional information tracking
 * - Item availability toggling
 * - Bulk menu updates
 * - Image management
 * - Special offers/deals setup
 * - Menu OCR import support
 * - Menu performance analytics
 * - Seasonal menu planning
 * 
 * Integrates with inventory system and provides
 * OCR capabilities for quick menu digitization.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { itemsApi } from '../../api/items';
import { cafeApi } from '../../api/cafes';
import { MenuItem, ItemCreateRequest } from '../../api/types';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { Loader2, Upload, Plus, Trash2, Check, Edit, ChefHat, Leaf } from 'lucide-react';
import { toast } from 'sonner';

type OCRItem = {
  name: string;
  calories?: number | null;
  price?: number | null;
  ingredients?: string | null;
  quantity?: string | null;
  servings?: number | null;
  veg_flag?: boolean | null;
  kind?: string | null;
  description?: string | null;
};

const MenuManagement: React.FC = () => {
  const { user } = useAuth();
  const cafeId = user?.cafe?.id;

  // Items from cafe
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // OCR review modal & data
  const [reviewOpen, setReviewOpen] = useState(false);
  const [extractedItems, setExtractedItems] = useState<OCRItem[]>([]);
  const [submittingExtracted, setSubmittingExtracted] = useState(false);

  // Add/Edit dialog (single item)
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<ItemCreateRequest>({
    name: '',
    description: '',
    ingredients: '',
    calories: 0,
    price: 0,
    quantity: '',
    servings: 1,
    veg_flag: true,
    kind: '',
  });

  // Local search/filter
  const [searchTerm, setSearchTerm] = useState('');

  // Stats derived
  const stats = useMemo(() => {
    const totalItems = items.length;
    const categories = new Set(items.map(i => i.category || 'Uncategorized'));
    const avgPrice = totalItems ? items.reduce((s, it) => s + (it.price ?? 0), 0) / totalItems : 0;
    const vegCount = items.filter(it => !!it.isVegetarian).length;
    return {
      totalItems,
      categoriesCount: categories.size,
      avgPrice,
      vegCount,
    };
  }, [items]);

  const fetchItems = useCallback(async () => {
    if (!cafeId) return;
    setLoadingItems(true);
    try {
      const { data, error } = await itemsApi.getCafeItems(cafeId);
      if (error) {
        toast.error('Failed to load items');
      } else if (data) {
        setItems(data);
      }
    } catch (err) {
      toast.error('Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  }, [cafeId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ingredients: '',
      calories: 0,
      price: 0,
      quantity: '',
      servings: 1,
      veg_flag: true,
      kind: '',
    });
    setEditingItem(null);
  };

  // Open add dialog
  const handleOpenAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      ingredients: Array.isArray(item.ingredients) ? item.ingredients.join(', ') : (item.ingredients || ''),
      calories: item.calories || 0,
      price: item.price || 0,
      quantity: item.quantity || '',
      servings: item.servings || 1,
      veg_flag: item.isVegetarian || false,
      kind: item.category || '',
    });
    setEditDialogOpen(true);
  };

  // Save item (add or edit)
  const handleSaveItem = async () => {
    if (!cafeId) return toast.error('Cafe ID missing');
    if (!formData.name || !formData.description || formData.price <= 0 || formData.calories <= 0) {
      return toast.error('Please fill in all required fields');
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await itemsApi.updateItem(editingItem.id, formData);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Item updated successfully');
          setEditDialogOpen(false);
          resetForm();
          await fetchItems();
        }
      } else {
        // Add new item
        const { error } = await itemsApi.addMenuItem(cafeId, formData);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Item added successfully');
          setAddDialogOpen(false);
          resetForm();
          await fetchItems();
        }
      }
    } catch (err) {
      toast.error('Failed to save item');
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Delete this item?')) return;
    try {
      const { error } = await itemsApi.deleteItem(itemId);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Item deleted');
        await fetchItems();
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  // Upload PDF handlers
  const handleFileChange = (f?: File) => {
    setSelectedFile(f ?? null);
  };

  const handleUpload = async () => {
    if (!cafeId) return toast.error('Cafe ID missing');
    if (!selectedFile) return toast.error('Please select a PDF or image file first');

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setUploading(false);
      return toast.error('Only PDF or image files are supported');
    }
    

    setUploading(true);
    try {
      const { data, error } = await cafeApi.uploadMenu(cafeId, selectedFile);
      if (error) {
        toast.error(error);
      } else if (data?.items) {
        const parsed: OCRItem[] = (data.items as any[]).map(it => ({
          name: it.name ?? '',
          calories: it.calories ?? null,
          price: it.price ?? null,
          ingredients: it.ingredients ?? null,
          quantity: it.quantity ?? null,
          servings: it.servings ?? null,
          veg_flag: it.veg_flag ?? null,
          kind: it.kind ?? null,
          description: it.description ?? null,
        }));
        setExtractedItems(parsed);
        setUploadOpen(false);
        setReviewOpen(true);
        toast.success(`Extracted ${parsed.length} items. Review before submitting.`);
      } else {
        toast.error('No items returned from OCR');
      }
    } catch (err) {
      toast.error('Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  // Edit handlers inside review modal
  const updateExtractedItem = (idx: number, patch: Partial<OCRItem>) => {
    setExtractedItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const removeExtractedItem = (idx: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit all reviewed items
  const submitAllExtracted = async () => {
    if (!cafeId) return toast.error('Cafe ID missing');
    if (extractedItems.length === 0) return toast.error('No items to submit');
    setSubmittingExtracted(true);
    try {
      const payloads: ItemCreateRequest[] = extractedItems.map(it => ({
        name: (it.name || '').trim(),
        description: it.description || '',
        ingredients: it.ingredients
          ? (Array.isArray(it.ingredients)
              ? it.ingredients.join(', ')
              : String(it.ingredients))
          : undefined,
        calories: it.calories ?? 0,
        price: it.price ?? 0.0,
        quantity: it.quantity ?? undefined,
        servings: it.servings ?? undefined,
        veg_flag: it.veg_flag ?? true,
        kind: it.kind ?? undefined,
      }));

      const { data, error } = await itemsApi.replaceMenu(cafeId, payloads);
      if (error) {
        toast.error(error);
      } else if (data?.success) {
        toast.success(`Successfully replaced menu with ${data.items_created} items`);
        setReviewOpen(false);
        setExtractedItems([]);
        await fetchItems();
      } else {
        toast.error('Failed to replace menu');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to replace menu');
    } finally {
      setSubmittingExtracted(false);
    }
  };

  // Filter visible items
  const visibleItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category ?? '').toLowerCase().includes(q) ||
      (i.description ?? '').toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Manage menu items and upload PDF/Image menus for AI parsing.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Menu File
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Total Items
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgPrice.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Vegetarian
              <Leaf className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vegCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Input 
            placeholder="Search items by name, category, description..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
          <Button variant="ghost" onClick={fetchItems} disabled={loadingItems}>
            {loadingItems ? <Loader2 className="animate-spin h-4 w-4" /> : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      {/* Items grid */}
      <div>
        {loadingItems ? (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto h-8 w-8" />
            <p className="mt-2">Loading items...</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ChefHat className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm text-muted-foreground mt-1">Start by adding menu items or uploading a PDF</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map(it => (
              <Card key={it.id}>
                {it.image && (
                  <div className="aspect-video bg-gray-100 relative">
                    <img src={it.image} alt={it.name} className="object-cover w-full h-full" />
                    {it.isVegetarian && (
                      <Badge variant="outline" className="absolute top-2 right-2 bg-green-50 text-green-700 border-green-200">
                        <Leaf className="h-3 w-3 mr-1" />
                        Veg
                      </Badge>
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{it.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">{it.description}</CardDescription>
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-lg">${it.price.toFixed(2)}</span>
                        <span className="text-muted-foreground ml-3">{it.calories} cal</span>
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary">{it.category || 'Uncategorized'}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleOpenEditDialog(it)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteItem(it.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload PDF Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Menu File</DialogTitle>
            <DialogDescription>
              Upload your menu in PDF or Image format and AI will extract the items automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              type="file"
              accept="application/pdf, image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="w-full"
            />
            {selectedFile && <div className="text-sm">Selected: {selectedFile.name}</div>}

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">What AI will extract:</h4>
              <ul className="space-y-1">
                <li>• Dish names and descriptions</li>
                <li>• Prices and calories</li>
                <li>• Ingredients (when available)</li>
                <li>• Categories and dietary information</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
              Extract Menu Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Extracted Items Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Extracted Items</DialogTitle>
            <DialogDescription>
              Edit any item before submitting. This will replace your current menu.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 p-2">
            {extractedItems.length === 0 ? (
              <div className="text-center p-6">No items extracted.</div>
            ) : extractedItems.map((ei, idx) => (
              <Card key={idx} className="p-3">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Input 
                      value={ei.name} 
                      onChange={e => updateExtractedItem(idx, { name: e.target.value })} 
                      placeholder="Item name" 
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input 
                        type="number"
                        step="0.01"
                        value={String(ei.price ?? '')} 
                        onChange={e => updateExtractedItem(idx, { price: parseFloat(e.target.value) || undefined })} 
                        placeholder="Price (e.g., 9.99)" 
                      />
                      <Input 
                        type="number"
                        value={String(ei.calories ?? '')} 
                        onChange={e => updateExtractedItem(idx, { calories: parseInt(e.target.value) || undefined })} 
                        placeholder="Calories" 
                      />
                    </div>
                    <Textarea 
                      value={ei.description ?? ''} 
                      onChange={e => updateExtractedItem(idx, { description: e.target.value })} 
                      placeholder="Description (optional)" 
                      rows={2}
                    />
                    <Input 
                      value={ei.ingredients ?? ''} 
                      onChange={e => updateExtractedItem(idx, { ingredients: e.target.value })} 
                      placeholder="Ingredients (comma separated)" 
                    />
                    <div className="flex gap-2 items-center">
                      <Select 
                        value={ei.kind ?? ''} 
                        onValueChange={v => updateExtractedItem(idx, { kind: v || undefined })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appetizer">Appetizer</SelectItem>
                          <SelectItem value="main">Main</SelectItem>
                          <SelectItem value="dessert">Dessert</SelectItem>
                          <SelectItem value="beverage">Beverage</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      <label className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={!!ei.veg_flag} 
                          onChange={e => updateExtractedItem(idx, { veg_flag: e.target.checked })} 
                        />
                        <span className="text-sm">Vegetarian</span>
                      </label>
                    </div>
                  </div>

                  <div className="w-32 flex flex-col gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => removeExtractedItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <DialogFooter className="flex justify-between items-center border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => { 
                setReviewOpen(false); 
                setExtractedItems([]); 
              }}
            >
              Cancel
            </Button>

            <Button 
              onClick={submitAllExtracted} 
              disabled={submittingExtracted || extractedItems.length === 0}
            >
              {submittingExtracted ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Replace Menu ({extractedItems.length} items)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Menu Item</DialogTitle>
            <DialogDescription>Add a new item to your menu</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Item Name *</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Margherita Pizza"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-kind">Category *</Label>
                <Select
                  value={formData.kind}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, kind: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appetizer">Appetizer</SelectItem>
                    <SelectItem value="main">Main Course</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-description">Description *</Label>
              <Textarea
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your dish..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-price">Price ($) *</Label>
                <Input
                  id="add-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="16.99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-calories">Calories *</Label>
                <Input
                  id="add-calories"
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                  placeholder="720"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-servings">Servings</Label>
                <Input
                  id="add-servings"
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-ingredients">Ingredients</Label>
              <Input
                id="add-ingredients"
                value={formData.ingredients}
                onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                placeholder="Comma-separated ingredients"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="add-veg"
                checked={formData.veg_flag}
                onChange={(e) => setFormData(prev => ({ ...prev, veg_flag: e.target.checked }))}
              />
              <Label htmlFor="add-veg" className="flex items-center gap-1">
                <Leaf className="h-4 w-4 text-green-600" />
                Vegetarian
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>Update the details of your menu item</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Item Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Margherita Pizza"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kind">Category *</Label>
                <Select
                  value={formData.kind}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, kind: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appetizer">Appetizer</SelectItem>
                    <SelectItem value="main">Main Course</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your dish..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price ($) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="16.99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-calories">Calories *</Label>
                <Input
                  id="edit-calories"
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                  placeholder="720"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-servings">Servings</Label>
                <Input
                  id="edit-servings"
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ingredients">Ingredients</Label>
              <Input
                id="edit-ingredients"
                value={formData.ingredients}
                onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                placeholder="Comma-separated ingredients"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-veg"
                checked={formData.veg_flag}
                onChange={(e) => setFormData(prev => ({ ...prev, veg_flag: e.target.checked }))}
              />
              <Label htmlFor="edit-veg" className="flex items-center gap-1">
                <Leaf className="h-4 w-4 text-green-600" />
                Vegetarian
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              <Check className="h-4 w-4 mr-2" />
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManagement;
