-- ⚠️ WARNING: This approach is NOT RECOMMENDED
-- Direct database password updates are complex and error-prone
-- Use the Admin API script instead (reset-user-password.js)

-- Supabase stores passwords in auth.users table with encrypted_hash column
-- The password is hashed using bcrypt with specific format
-- Directly updating requires proper bcrypt hashing which is complex

-- If you MUST do it directly (NOT RECOMMENDED):
-- You would need to:
-- 1. Generate a proper bcrypt hash
-- 2. Update the encrypted_hash column
-- 3. This is fragile and can break the authentication system

-- RECOMMENDED APPROACH: Use the Admin API
-- Run: node reset-user-password.js <user-id-or-email> <new-password>

-- However, if you want to try direct SQL update, you need to:
-- 1. Generate bcrypt hash (outside of SQL, using a tool or library)
-- 2. Update the auth.users table

-- Example structure (DO NOT USE THIS DIRECTLY - HASH WILL BE WRONG):
-- UPDATE auth.users 
-- SET encrypted_hash = '<bcrypt_hash_here>',
--     updated_at = now()
-- WHERE id = '<user-id>' OR email = '<user-email>';

-- The encrypted_hash format in Supabase is: $2a$10$<salt><hash>
-- Generating this manually is error-prone and risky

-- ⚠️ USE THE SCRIPT INSTEAD: reset-user-password.js



