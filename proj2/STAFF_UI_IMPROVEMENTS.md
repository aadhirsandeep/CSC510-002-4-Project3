# Staff UI Improvements - Implementation Plan

## What's Been Completed ✅

### 1. Staff Registration
- ✅ Added "Staff" tab to registration page ([RegisterPage.tsx](frontend/src/components/auth/RegisterPage.tsx))
- ✅ Simple registration form (name, email, password)
- ✅ Redirects to restaurant dashboard after registration
- ✅ Shows helpful note that they need to be assigned to a cafe by owner

### 2. Staff Login
- ✅ Added "Staff" tab to login page ([LoginPage.tsx](frontend/src/components/auth/LoginPage.tsx))
- ✅ Staff can log in with their credentials
- ✅ Redirects to restaurant dashboard

## What Still Needs to Be Done 🔨

### Issue #1: Restaurant Dashboard Needs Staff Management Tab

**Current State:**
- RestaurantDashboard.tsx exists but no staff management tab
- StaffManagement.tsx exists but isn't linked from dashboard

**What to Add:**
1. Add tabs to Restaurant Dashboard:
   - Overview (current view)
   - Orders
   - **Staff** ← NEW
   - Menu
   - Analytics

2. Link StaffManagement component to dashboard

**Files to Modify:**
- `frontend/src/components/restaurant/RestaurantDashboard.tsx`

---

### Issue #2: Staff Assignment UI Needs Improvement

**Current State:**
- StaffManagement.tsx shows staff list
- But adding new staff requires knowing user_id (not user-friendly)

**What to Improve:**

#### Option A: Search by Email (Recommended)
1. Add input field: "Enter staff member's email"
2. Backend searches for user by email
3. If found, assign them to cafe
4. If not found, show "User not registered"

**New Backend Endpoint Needed:**
```python
# backend/app/routers/staff.py
@router.post("/assign-by-email")
def assign_staff_by_email(cafe_id: int, email: str, role: Role):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, "User not found")
    # ... rest of assignment logic
```

#### Option B: Show All Unassigned Users
1. Backend endpoint to list users with role=USER who aren't assigned
2. Dropdown to select from list
3. Assign selected user

**Files to Modify:**
- `frontend/src/components/restaurant/StaffManagement.tsx`
- `backend/app/routers/staff.py`
- `frontend/src/api/staff.ts`

---

### Issue #3: Staff Dashboard for Order Management

**Current State:**
- Staff logs in → goes to restaurant dashboard
- But restaurant dashboard shows OWNER-specific features
- Staff needs a simpler view focused on orders

**What to Create:**

#### New Component: `StaffOrdersView.tsx`

**Features:**
1. **Incoming Orders Tab**
   - Show pending orders for their assigned cafe
   - "Accept" button → changes status to ACCEPTED
   - "Decline" button → changes status to DECLINED

2. **Active Orders Tab**
   - Show accepted orders
   - "Mark Ready" button → changes status to READY
   - Shows assigned driver (if any)

3. **Completed Orders Tab**
   - Show ready/picked up/delivered orders
   - Read-only view

**UI Design:**
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="pending">
      Incoming Orders {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
    </TabsTrigger>
    <TabsTrigger value="active">Active Orders</TabsTrigger>
    <TabsTrigger value="completed">Completed</TabsTrigger>
  </TabsList>

  <TabsContent value="pending">
    {orders.map(order => (
      <Card key={order.id}>
        <CardHeader>
          <CardTitle>Order #{order.id}</CardTitle>
          <CardDescription>
            Total: ${order.total_price} | {order.total_calories} cal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Order items list */}
        </CardContent>
        <CardFooter>
          <Button onClick={() => acceptOrder(order.id)}>Accept</Button>
          <Button variant="outline" onClick={() => declineOrder(order.id)}>
            Decline
          </Button>
        </CardFooter>
      </Card>
    ))}
  </TabsContent>
</Tabs>
```

**Files to Create:**
- `frontend/src/components/staff/StaffOrdersView.tsx`
- `frontend/src/pages/StaffDashboard.tsx`

**Files to Modify:**
- `frontend/src/App.tsx` - Add route for `/staff/dashboard`

---

### Issue #4: Show Current Staff List on Restaurant Dashboard

**Current State:**
- Owner has to navigate to separate Staff Management page
- No quick view of current staff

**What to Add:**

Add a card to Restaurant Dashboard showing:
- Total staff count
- List of active staff members
- Their current status (idle/busy with order)
- Quick link to full Staff Management page

**UI Design:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Staff Team</CardTitle>
    <CardDescription>{staffCount} members</CardDescription>
  </CardHeader>
  <CardContent>
    {staffMembers.slice(0, 5).map(staff => (
      <div key={staff.id} className="flex items-center justify-between py-2">
        <div>
          <p className="font-medium">{staff.name}</p>
          <p className="text-sm text-muted-foreground">{staff.role}</p>
        </div>
        <Badge variant={staff.isActive ? "default" : "secondary"}>
          {staff.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    ))}
    <Button asChild variant="link" className="w-full mt-2">
      <Link to="/staff-management">View All Staff</Link>
    </Button>
  </CardContent>
</Card>
```

**Files to Modify:**
- `frontend/src/components/restaurant/RestaurantDashboard.tsx`

---

### Issue #5: Staff Status Tracking

**Current State:**
- No way to see if staff member is currently processing an order

**What to Add:**

**Backend:**
1. Track which staff member last updated an order
2. Count active orders per staff member

**Frontend:**
1. Show staff status: Idle / Processing {X} orders
2. Color-code badges:
   - Green: Idle
   - Yellow: Processing 1-2 orders
   - Orange: Processing 3+ orders

**Files to Modify:**
- `backend/app/models.py` - Add `last_updated_by` to Order model
- `backend/app/routers/orders.py` - Track who updates order
- `frontend/src/components/restaurant/StaffManagement.tsx`

---

## Implementation Priority

### Phase 1: Essential Features (High Priority)
1. ✅ Staff registration tab
2. ✅ Staff login tab
3. 🔨 Staff assignment by email (easier UX)
4. 🔨 Staff orders view component
5. 🔨 Add Staff tab to restaurant dashboard

### Phase 2: Enhanced UX (Medium Priority)
6. 🔨 Current staff list on dashboard
7. 🔨 Improve StaffManagement UI
8. 🔨 Add order notifications/badges

### Phase 3: Advanced Features (Low Priority)
9. 🔨 Staff status tracking
10. 🔨 Performance metrics per staff
11. 🔨 Shift management

---

## Quick Start Guide for Next Developer

### To Add Staff Tab to Restaurant Dashboard:

1. Open `frontend/src/components/restaurant/RestaurantDashboard.tsx`
2. Find the existing structure (likely just showing stats)
3. Wrap content in `<Tabs>` component
4. Add tab for "Staff"
5. Import `StaffManagement` component
6. Render it in the Staff tab content

### To Create Staff Orders View:

1. Create `frontend/src/components/staff/StaffOrdersView.tsx`
2. Use `ordersApi.getCafeOrders(cafeId)` to fetch orders
3. Filter by status: PENDING, ACCEPTED, READY
4. Add buttons to call `ordersApi.updateOrderStatus(orderId, newStatus)`
5. Add route in `App.tsx` for `/staff/dashboard`

### To Add Email-Based Staff Assignment:

1. Backend: Add endpoint in `backend/app/routers/staff.py`:
   ```python
   @router.post("/assign-by-email")
   def assign_by_email(data: StaffAssignByEmail, db: Session, current: User):
       user = db.query(User).filter(User.email == data.email).first()
       if not user:
           raise HTTPException(404, "User not found")
       # ... assign logic
   ```

2. Frontend: Update `StaffManagement.tsx`:
   ```tsx
   const [emailInput, setEmailInput] = useState('');

   const handleAssignByEmail = async () => {
     const { data, error } = await staffApi.assignByEmail(cafe.id, emailInput);
     if (data) {
       toast.success('Staff assigned!');
       loadStaff();
     }
   };
   ```

---

## Files Reference

### Already Modified:
- ✅ `frontend/src/components/auth/LoginPage.tsx`
- ✅ `frontend/src/components/auth/RegisterPage.tsx`
- ✅ `frontend/src/api/types.ts`

### Need to Modify:
- 🔨 `frontend/src/components/restaurant/RestaurantDashboard.tsx`
- 🔨 `frontend/src/components/restaurant/StaffManagement.tsx`
- 🔨 `backend/app/routers/staff.py`
- 🔨 `frontend/src/api/staff.ts`

### Need to Create:
- 🔨 `frontend/src/components/staff/StaffOrdersView.tsx`
- 🔨 `frontend/src/pages/StaffDashboard.tsx`

---

## Summary

**Completed:**
- Staff can register
- Staff can login
- Backend API for staff management exists

**Still Needed:**
- Better UI for assigning staff (search by email)
- Staff-specific dashboard for managing orders
- Staff management tab in restaurant dashboard
- Current staff list widget on dashboard
- Order status management buttons for staff

The backend is solid - most work is **frontend UI/UX improvements** to make the feature user-friendly and visually appealing! 🎨
