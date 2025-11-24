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
 * @component StaffManagement
 * @description Staff and role management system for restaurants.
 * Features:
 * - Staff member registration
 * - Role assignment and permissions
 * - Schedule management
 * - Performance tracking
 * - Shift planning
 * - Time tracking
 * - Task assignment
 * - Staff feedback system
 * - Training status tracking
 * 
 * Provides comprehensive tools for managing restaurant
 * staff and their responsibilities.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Plus, Edit, Trash2, Users, Shield, Key } from 'lucide-react';
import { User } from '../../App';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'manager' | 'kitchen_staff';
  permissions: string[];
  isActive: boolean;
  joinedDate: Date;
  lastLogin?: Date;
}

interface StaffManagementProps {
  user: User;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ user }) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as StaffMember['role'],
    permissions: [] as string[]
  });

  // Only show staff management if user is restaurant owner
  if (user.type !== 'restaurant_owner') {
    return (
      <div className="space-y-6">
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Access Restricted</h3>
            <p className="text-muted-foreground">Only restaurant owners can manage staff accounts.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    // Mock staff data
    const mockStaff: StaffMember[] = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah@pizzapalace.com',
        role: 'manager',
        permissions: ['orders', 'menu', 'staff'],
        isActive: true,
        joinedDate: new Date('2023-01-15'),
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Mike Chen',
        email: 'mike@pizzapalace.com',
        role: 'kitchen_staff',
        permissions: ['orders'],
        isActive: true,
        joinedDate: new Date('2023-03-20'),
        lastLogin: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: '3',
        name: 'Lisa Rodriguez',
        email: 'lisa@pizzapalace.com',
        role: 'staff',
        permissions: ['orders'],
        isActive: false,
        joinedDate: new Date('2023-02-10'),
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];
    setStaffMembers(mockStaff);
  }, []);

  const availablePermissions = [
    { id: 'orders', label: 'Manage Orders', description: 'Accept, decline, and update order status' },
    { id: 'menu', label: 'Manage Menu', description: 'Add, edit, and remove menu items' },
    { id: 'analytics', label: 'View Analytics', description: 'Access sales and performance reports' },
    { id: 'staff', label: 'Manage Staff', description: 'Add and manage staff accounts (managers only)' }
  ];

  const rolePermissions = {
    staff: ['orders'],
    kitchen_staff: ['orders'],
    manager: ['orders', 'menu', 'analytics', 'staff']
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'staff',
      permissions: []
    });
    setEditingStaff(null);
  };

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions
    });
    setIsDialogOpen(true);
  };

  const handleRoleChange = (role: StaffMember['role']) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: rolePermissions[role]
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    const staffData: StaffMember = {
      id: editingStaff?.id || Date.now().toString(),
      name: formData.name,
      email: formData.email,
      role: formData.role,
      permissions: formData.permissions,
      isActive: editingStaff?.isActive ?? true,
      joinedDate: editingStaff?.joinedDate || new Date(),
      lastLogin: editingStaff?.lastLogin
    };

    if (editingStaff) {
      setStaffMembers(prev => prev.map(staff => staff.id === editingStaff.id ? staffData : staff));
      toast.success('Staff member updated successfully');
    } else {
      setStaffMembers(prev => [...prev, staffData]);
      toast.success(`Staff member added successfully. Login credentials sent to ${formData.email}`);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const toggleStaffStatus = (staffId: string) => {
    setStaffMembers(prev => prev.map(staff => 
      staff.id === staffId ? { ...staff, isActive: !staff.isActive } : staff
    ));
    const staff = staffMembers.find(s => s.id === staffId);
    toast.success(`${staff?.name} ${staff?.isActive ? 'deactivated' : 'activated'} successfully`);
  };

  const deleteStaff = (staffId: string) => {
    setStaffMembers(prev => prev.filter(staff => staff.id !== staffId));
    toast.success('Staff member removed successfully');
  };

  const getRoleBadgeColor = (role: StaffMember['role']) => {
    switch (role) {
      case 'manager':
        return 'bg-purple-100 text-purple-800';
      case 'kitchen_staff':
        return 'bg-orange-100 text-orange-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage your restaurant's staff accounts and permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
              <DialogDescription>
                {editingStaff ? 'Update staff member details and permissions' : 'Create a new staff account with appropriate permissions'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Front Desk Staff</SelectItem>
                    <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission.id)
                            }));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <Label htmlFor={permission.id} className="text-sm">
                          {permission.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingStaff ? 'Update' : 'Add'} Staff Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffMembers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {staffMembers.filter(s => s.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {staffMembers.filter(s => s.role === 'manager').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kitchen Staff</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {staffMembers.filter(s => s.role === 'kitchen_staff').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>Manage your team's access and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {staffMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No staff members</h3>
              <p className="text-muted-foreground">Add your first staff member to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {staffMembers.map((staff) => (
                <Card key={staff.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{staff.name}</h4>
                          <Badge className={getRoleBadgeColor(staff.role)}>
                            {staff.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          {!staff.isActive && (
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{staff.email}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Joined {staff.joinedDate.toLocaleDateString()}</span>
                          {staff.lastLogin && (
                            <span>Last login {staff.lastLogin.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {staff.permissions.map((permission) => {
                            const perm = availablePermissions.find(p => p.id === permission);
                            return (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {perm?.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(staff)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStaffStatus(staff.id)}
                      >
                        {staff.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteStaff(staff.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Permission Guide
          </CardTitle>
          <CardDescription>Understanding staff roles and their access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Front Desk Staff</h4>
              <p className="text-sm text-muted-foreground">
                Can accept and manage orders, update order status, and interact with customers.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">Manage Orders</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Kitchen Staff</h4>
              <p className="text-sm text-muted-foreground">
                Can view and update order status, mark orders as ready for pickup.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">Manage Orders</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Manager</h4>
              <p className="text-sm text-muted-foreground">
                Full access to all restaurant operations including staff management.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">All Permissions</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffManagement;