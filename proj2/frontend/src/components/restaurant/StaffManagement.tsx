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
import { staffApi, StaffMember as ApiStaffMember, StaffRole } from '../../api';

interface StaffMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: StaffRole;
  permissions: string[];
  isActive: boolean;
  joinedDate?: Date;
  lastLogin?: Date;
}

interface StaffManagementProps {
  user: User;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ user }) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF' as StaffRole,
    permissions: [] as string[]
  });

  // Only show staff management if user is restaurant owner
  if (user.role !== 'OWNER') {
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

  // Load staff members from API
  useEffect(() => {
    loadStaff();
  }, [user.cafe?.id]);

  const loadStaff = async () => {
    if (!user.cafe?.id) return;

    setLoading(true);
    const { data, error } = await staffApi.getCafeStaff(user.cafe.id);

    if (error) {
      toast.error(`Failed to load staff: ${error}`);
      setLoading(false);
      return;
    }

    if (data) {
      // Convert API data to component format
      const formattedStaff: StaffMember[] = data.map((member: ApiStaffMember) => ({
        id: member.id,
        user_id: member.user_id,
        name: member.name,
        email: member.email,
        role: member.role,
        permissions: getRolePermissions(member.role),
        isActive: member.is_active,
        joinedDate: undefined,
        lastLogin: undefined
      }));
      setStaffMembers(formattedStaff);
    }

    setLoading(false);
  };

  const getRolePermissions = (role: StaffRole): string[] => {
    const rolePermissionsMap: Record<StaffRole, string[]> = {
      STAFF: ['orders'],
      OWNER: ['orders', 'menu', 'analytics', 'staff'],
      ADMIN: ['orders', 'menu', 'analytics', 'staff'],
      USER: []
    };
    return rolePermissionsMap[role] || [];
  };

  const availablePermissions = [
    { id: 'orders', label: 'Manage Orders', description: 'Accept, decline, and update order status' },
    { id: 'menu', label: 'Manage Menu', description: 'Add, edit, and remove menu items' },
    { id: 'analytics', label: 'View Analytics', description: 'Access sales and performance reports' },
    { id: 'staff', label: 'Manage Staff', description: 'Add and manage staff accounts (managers only)' }
  ];

  const rolePermissionsDisplay: Record<StaffRole, string[]> = {
    STAFF: ['orders'],
    OWNER: ['orders', 'menu', 'analytics', 'staff'],
    ADMIN: ['orders', 'menu', 'analytics', 'staff'],
    USER: []
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'STAFF',
      permissions: []
    });
    setNewUserEmail('');
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

  const handleRoleChange = (role: StaffRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: rolePermissionsDisplay[role]
    }));
  };

  const handleSave = async () => {
    if (!user.cafe?.id) {
      toast.error('No cafe associated with your account');
      return;
    }

    if (editingStaff) {
      // Update existing staff member's role
      const { data, error } = await staffApi.updateStaffRole(editingStaff.id, formData.role);

      if (error) {
        toast.error(`Failed to update staff member: ${error}`);
        return;
      }

      toast.success('Staff member updated successfully');
      setIsDialogOpen(false);
      resetForm();
      loadStaff();
    } else {
      // Add new staff by email
      if (!newUserEmail) {
        toast.error('Please enter an email address');
        return;
      }

      const { data, error } = await staffApi.assignStaffByEmail({
        email: newUserEmail,
        cafe_id: user.cafe.id,
        role: formData.role
      });

      if (error) {
        if (error.includes('not found')) {
          toast.error(`No user registered with email: ${newUserEmail}. They need to register first.`);
        } else if (error.includes('already assigned')) {
          toast.error('This user is already assigned to your cafe');
        } else {
          toast.error(`Failed to add staff: ${error}`);
        }
        return;
      }

      toast.success(`Staff member added successfully!`);
      setIsDialogOpen(false);
      resetForm();
      loadStaff();
    }
  };

  const toggleStaffStatus = async (assignmentId: number) => {
    const { data, error } = await staffApi.toggleStaffActive(assignmentId);

    if (error) {
      toast.error(`Failed to toggle staff status: ${error}`);
      return;
    }

    if (data) {
      toast.success(data.message);
      loadStaff();
    }
  };

  const deleteStaff = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    const { data, error } = await staffApi.removeStaff(assignmentId);

    if (error) {
      toast.error(`Failed to remove staff member: ${error}`);
      return;
    }

    toast.success('Staff member removed successfully');
    loadStaff();
  };

  const getRoleBadgeColor = (role: StaffRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'STAFF':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: StaffRole) => {
    const roleNames: Record<StaffRole, string> = {
      STAFF: 'Staff',
      OWNER: 'Owner',
      ADMIN: 'Admin',
      USER: 'User'
    };
    return roleNames[role] || role;
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
                {editingStaff
                  ? 'Update staff member role and permissions'
                  : 'Enter the email of a registered user to assign them as staff'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {!editingStaff ? (
                // Adding new staff - only show email input
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="staff@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      The user must already be registered. They can register at the login page using the "Staff" tab.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="OWNER">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Permissions (based on role)</Label>
                    <div className="flex flex-wrap gap-1">
                      {rolePermissionsDisplay[formData.role].map((permId) => {
                        const perm = availablePermissions.find(p => p.id === permId);
                        return perm ? (
                          <Badge key={permId} variant="outline" className="text-xs">
                            {perm.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </>
              ) : (
                // Editing existing staff - show all fields
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="OWNER">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Permissions (based on role)</Label>
                    <div className="flex flex-wrap gap-1">
                      {rolePermissionsDisplay[formData.role].map((permId) => {
                        const perm = availablePermissions.find(p => p.id === permId);
                        return perm ? (
                          <Badge key={permId} variant="outline" className="text-xs">
                            {perm.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!editingStaff && !newUserEmail.trim()}
                >
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
            <CardTitle className="text-sm font-medium">Owners</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {staffMembers.filter(s => s.role === 'OWNER').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {staffMembers.filter(s => s.role === 'STAFF').length}
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
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading staff members...</p>
            </div>
          ) : staffMembers.length === 0 ? (
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
                            {getRoleDisplayName(staff.role)}
                          </Badge>
                          {!staff.isActive && (
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{staff.email}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          {staff.joinedDate && <span>Joined {staff.joinedDate.toLocaleDateString()}</span>}
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Staff</h4>
              <p className="text-sm text-muted-foreground">
                Can accept and manage orders, update order status, and interact with customers.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">Manage Orders</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Owner</h4>
              <p className="text-sm text-muted-foreground">
                Full access to all restaurant operations including staff management, menu, and analytics.
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