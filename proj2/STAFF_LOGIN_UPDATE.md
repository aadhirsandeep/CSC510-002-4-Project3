# Staff Login Feature - Update

## What Changed

Staff members can now log in directly using their own dedicated "Staff" tab on the login page, instead of being forced to use the "Restaurant" (OWNER) tab.

## Changes Made

### Frontend Updates

#### 1. Login Page - Added Staff Tab
**File:** `frontend/src/components/auth/LoginPage.tsx`

- Added "Staff" as a 4th tab (Customer, Restaurant, Staff, Driver)
- Staff tab has its own dedicated login form
- Staff members are redirected to `/restaurant/dashboard` after login
- Updated grid layout from 3 columns to 4 columns

**Before:**
```
[Customer] [Restaurant] [Driver]
```

**After:**
```
[Customer] [Restaurant] [Staff] [Driver]
```

#### 2. TypeScript Types - Added STAFF Role
**File:** `frontend/src/api/types.ts`

Updated all type definitions to include STAFF role:
- `LoginRequest` - role now includes 'STAFF'
- `TokenPayload` - role now includes 'STAFF'
- `User` - role now includes 'STAFF'
- `RegisterRequest` - role now includes 'STAFF'

### Backend (Already Supported)

The backend already had STAFF support:
- ✅ `Role.STAFF` enum exists in `models.py`
- ✅ Login endpoint accepts "STAFF" role in `auth.py:32`
- ✅ Authorization checks support STAFF role in `deps.py`

## How Staff Login Works Now

### Via Frontend UI:

1. **Navigate to login page** (`/login`)
2. **Click the "Staff" tab** (3rd tab)
3. **Enter credentials:**
   - Email: `staff@cafe.com`
   - Password: `[their password]`
4. **Click "Sign In"**
5. **Redirected to:** `/restaurant/dashboard`

### Staff Can Now:

✅ View cafe orders
✅ Accept/decline orders
✅ Mark orders as READY
✅ Assign drivers
✅ View cafe analytics
❌ Cannot manage menu items (OWNER only)
❌ Cannot manage staff (OWNER only)

## Complete Workflow Example

### 1. Owner Assigns Staff
```bash
# Owner logs in as OWNER
# Goes to Staff Management page
# Assigns user (user_id: 5) to their cafe as STAFF
POST /staff/assign
{
  "user_id": 5,
  "cafe_id": 1,
  "role": "STAFF"
}
```

### 2. Staff Logs In
```
1. Go to login page
2. Click "Staff" tab
3. Enter: staff@cafe.com / password123
4. Automatically redirected to restaurant dashboard
```

### 3. Staff Manages Orders
```
1. See all pending orders for their assigned cafe
2. Click "Accept" on an order → Status: ACCEPTED
3. Kitchen prepares food
4. Click "Mark Ready" → Status: READY
5. Driver is auto-assigned
6. Driver picks up and delivers
```

## Testing

### Test Staff Login:

1. **Start the app:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python -m app

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Run test script:**
   ```bash
   cd backend
   python test_staff_workflow.py
   ```
   This creates a staff user you can log in with.

3. **Manual test:**
   - Register as USER
   - Have owner assign you as STAFF via Staff Management page
   - Log out
   - Click "Staff" tab on login
   - Enter your credentials
   - You'll be redirected to restaurant dashboard

## Files Modified

- ✅ `frontend/src/components/auth/LoginPage.tsx` - Added Staff login tab
- ✅ `frontend/src/api/types.ts` - Added STAFF to all role types

## Summary

Staff members now have:
- ✅ **Dedicated login tab** (no more confusion with Restaurant/Owner)
- ✅ **Proper role assignment** (STAFF vs OWNER)
- ✅ **Correct permissions** (can manage orders but not menu/staff)
- ✅ **Seamless workflow** (login → view orders → process orders)

The staff management feature is now **complete and user-friendly**! 🎉
