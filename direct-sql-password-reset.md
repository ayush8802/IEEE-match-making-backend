# Direct SQL Password Reset (⚠️ NOT RECOMMENDED)

## Why This Is Problematic

Supabase stores passwords as **bcrypt hashes** in `auth.users.encrypted_hash`. Direct SQL updates require:
1. Generating a proper bcrypt hash (outside SQL)
2. Knowing the exact hash format Supabase uses
3. Risk of breaking authentication if done incorrectly

## ⚠️ WARNING: This May Break Authentication

If you MUST use SQL directly, you need to:

### Step 1: Generate Bcrypt Hash
You need to generate a bcrypt hash using Node.js or another tool:

```javascript
// Generate hash (run in Node.js)
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('YourNewPassword', 10);
console.log(hash); // Copy this value
```

### Step 2: Update Database (DANGEROUS)
```sql
UPDATE auth.users 
SET 
    encrypted_hash = '$2a$10$<your-generated-hash-here>',
    updated_at = now()
WHERE email = 'user@example.com';
```

### Problems:
- ❌ Requires external hash generation
- ❌ Easy to get the hash format wrong
- ❌ May not update related auth metadata
- ❌ Can completely break user authentication
- ❌ No validation or error checking

## ✅ RECOMMENDED: Use Admin API Script

The script (`quick-reset-password.js`) **does update the database directly** - it just does it safely through Supabase's Admin API, which:
- ✅ Generates the hash correctly
- ✅ Updates all necessary fields
- ✅ Maintains authentication integrity
- ✅ Validates the password
- ✅ Handles errors properly

## Recommendation

**Just use the script** - it's doing exactly what you want (direct database update), just in a safe way!

```bash
node quick-reset-password.js user@example.com "NewPassword123!"
```



