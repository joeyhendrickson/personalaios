# Access Codes System Setup

## Issue: "Failed to create access code"

The access code creator was failing because the required database table and function didn't exist. Here's how to fix it:

## Required Setup

### 1. Create Access Codes Table

Run this SQL script in Supabase:

```sql
-- File: create-access-codes-table.sql
-- This creates the access_codes table with proper structure and permissions
```

### 2. Create Database Function

Run this SQL script in Supabase:

```sql
-- File: create-access-codes-function.sql
-- This creates the create_access_code function that generates unique codes
```

### 3. Update API to Use Service Role

✅ **Already fixed** - Updated the access codes API to use service role client for admin operations.

## What Was Fixed

### **Database Issues:**

- ❌ **Missing `access_codes` table** - Created with proper structure
- ❌ **Missing `create_access_code` function** - Created to generate unique codes
- ❌ **Missing RLS policies** - Added admin and public access policies
- ❌ **Missing indexes** - Added for performance

### **API Issues:**

- ❌ **Wrong Supabase client** - Updated to use service role for admin operations
- ❌ **Permission errors** - Service role bypasses RLS for admin functions

## How It Works

### **Access Code Creation:**

1. **Admin clicks "Create Code"** in dashboard
2. **API calls `create_access_code` function** with name, email, expiry
3. **Function generates unique 8-character code** (e.g., "A1B2C3D4")
4. **Code stored in database** with expiration date
5. **Success response** returned to admin dashboard

### **Access Code Structure:**

```sql
access_codes:
- id: UUID (primary key)
- code: TEXT (8-character unique code)
- name: TEXT (admin-given name)
- email: TEXT (optional, for specific user)
- expires_at: TIMESTAMP (when code expires)
- is_active: BOOLEAN (admin can toggle on/off)
- used_at: TIMESTAMP (when code was used)
- used_by_user_id: UUID (which user used it)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### **Security Features:**

- ✅ **Unique code generation** - Prevents duplicates
- ✅ **Expiration dates** - Codes expire automatically
- ✅ **Admin toggle** - Can disable codes without deleting
- ✅ **Usage tracking** - Records when/where codes are used
- ✅ **RLS policies** - Proper database security

## Testing

### **1. Create Access Code:**

1. Go to admin dashboard
2. Click "Access Codes" section
3. Click "Create Code" button
4. Enter name and optional email
5. Should see success message with generated code

### **2. Verify in Database:**

```sql
SELECT * FROM access_codes ORDER BY created_at DESC LIMIT 5;
```

### **3. Test Code Verification:**

```sql
-- Check if code exists and is valid
SELECT * FROM access_codes
WHERE code = 'YOUR_CODE_HERE'
AND is_active = true
AND expires_at > NOW();
```

## Expected Results

After running the SQL scripts:

- ✅ **"Create Code" button works** without errors
- ✅ **Generated codes appear** in the access codes list
- ✅ **Codes are 8 characters** (e.g., "A1B2C3D4")
- ✅ **Expiration dates set** (default 30 days)
- ✅ **Admin can toggle** codes on/off
- ✅ **Codes can be verified** via API

## Troubleshooting

### **Still getting "Failed to create access code"?**

1. **Check if table exists:**

   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name = 'access_codes';
   ```

2. **Check if function exists:**

   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'create_access_code';
   ```

3. **Check API logs** in browser console for specific error messages

4. **Verify service role key** is set in environment variables

The access codes system should now work perfectly! 🎉
